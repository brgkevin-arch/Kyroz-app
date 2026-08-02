import { AdaptFlag, DietaryRestriction, FixedMeal, Ingredient, Macros, Meal, MEAL_ORDER, MealEmphasis, MealPlan, MealStatus, MealType, Recipe, RecipeObjective, RecipeSport, UserProfile, VarietyPreference } from './types';
import { getEffectiveRecipes } from './recipes';
import { recipeFiberPerPortion, isFiberFocusGoal } from './fiber';
import { remainingMeals, MEAL_LABEL } from './mealtime';
import { adaptRecipe, AdaptTarget, goalToObjectives, sportsToBuckets, needMatch, FLAG_AUDIENCE } from './adaptRecipe';
import { MIN_KCAL, bankFloorKcal } from './tdee';
import { bankedDailyTargets, offsetsForPlan, BankResult } from './calorieBank';
import { recipeContainsFood } from './avoidance';

// ── Moteur de génération de plan local ──────────────────────────────────────
// Respecte : nombre de jours, repas/jour, variété, préférences alimentaires.
// Instantané (< 1s), déterministe. Générateur principal en mode gratuit.
//
// Précision macro : on vise SIMULTANÉMENT la cible kcal ET la cible protéines
// du profil. Mettre seulement les portions à l'échelle des kcal fait déborder
// les protéines (recettes fitness denses en protéines). On choisit donc, pour
// chaque repas, le couple (recette, portion) qui minimise un écart relatif
// pondéré aux deux cibles, avec un budget kcal/protéines reporté de repas en
// repas (auto-correction du total du jour).

// MEAL_ORDER (ordre canonique des repas) est importé depuis ./types.

// Poids relatifs de base (avant normalisation) : la collation reste légère,
// les repas principaux plus consistants. Approche les anciennes distributions.
const BASE_WEIGHT: Record<MealType, number> = {
  breakfast: 0.9, lunch: 1.1, dinner: 1.0, snack: 0.45,
};
// Multiplicateur appliqué au repas mis en avant (« gros midi/soir/matin »).
const EMPHASIS_BOOST = 1.7;

/**
 * Répartition normalisée (somme = 1) des calories/protéines par repas, calculée
 * dynamiquement à partir des repas choisis et de l'emphase. Remplace les
 * distributions fixes 3/4 repas : gère n'importe quel sous-ensemble de repas.
 */
export function computeDistribution(meals: MealType[], emphasis: MealEmphasis): Record<MealType, number> {
  const dist: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  const active = MEAL_ORDER.filter((m) => meals.includes(m));
  // L'appelant garantit meals non vide (buildLocalPlan a un repli) ; si vide, on
  // renvoie une distribution nulle plutôt que de diviser par zéro.
  if (active.length === 0) return dist;

  const raw: Record<string, number> = {};
  let total = 0;
  for (const m of active) {
    let w = BASE_WEIGHT[m];
    if (emphasis !== 'even' && emphasis === m) w *= EMPHASIS_BOOST;
    raw[m] = w;
    total += w;
  }
  for (const m of active) dist[m] = raw[m] / total;
  return dist;
}

// Variété : parmi les recettes quasi-équivalentes côté macros (score à « bande »
// du meilleur), on privilégie la moins utilisée de la semaine. La bande reste
// étroite pour ne jamais sacrifier la précision ; « max » l'élargit un peu.
const TIE_BAND_BALANCED = 0.01;
const TIE_BAND_MAX = 0.022;
// En sèche, marge supplémentaire de la bande pour laisser les fibres choisir.
const FIBER_BAND_BONUS = 0.014;
// Poids du biais fibres dans le score effectif EN SÈCHE (cf. selectMealAdapted).
// Chaque g de fibre/portion retranche FIBER_SELECT_W au score → recette plus fibreuse
// préférée. 0.005 lève la sèche de ~32 à ~40 g/j (à la cible) sans coût de précision.
const FIBER_SELECT_W = 0.005;
// Idem, mais SUR UN REROLL. Plus fort, et c'est une COMPENSATION, pas un durcissement :
// sur un reroll le seed choisit dans le haut du panier, donc la recette la plus fibreuse
// n'est plus assurée de gagner le départage. Mesuré à 0.005 : la densité en fibres de la
// sèche tombait de 20,59 à 17,74 g/1 000 kcal. En repliant le biais dans le SCORE — qui
// décide QUI entre dans le panier — elle remonte à 21,24, soit au-dessus d'avant, sans
// re-figer le tirage. Balayage : 0.010 → 19,96 · 0.014 → 21,24 · 0.024 → 23,31 (surdose,
// et le renouvellement retombe à 73 %).
const FIBER_SELECT_W_VARIANT = 0.014;
// Pénalité de score par utilisation d'une FAMILLE dans la semaine, sur un reroll
// uniquement. Même logique que `VARIETY_STEP` pour les recettes, transposée au couple
// protéine × féculent — et même raison que `FIBER_SELECT_W_VARIANT` : la clé de
// départage « famille la moins servie » ne suffit plus quand le seed tire dans le haut
// du panier. Mesuré à 0 : les quasi-doublons passaient de 27,9 % à 31,7 % des semaines.
// Balayage : 0.01 → 28,3 % · 0.02 → 26,7 % · 0.04 → 23,8 % · 0.07 → 24,2 % (plateau).
const FAMILY_SELECT_W_VARIANT = 0.04;
// La MÊME pénalité, appliquée au PLAN CANONIQUE (seed 0) — plus douce.
//
// Pourquoi elle existe (2026-08-02) : la famille ne pesait sur le score QUE lors d'un
// reroll. Conséquence mesurée, et elle est à l'envers — le premier plan qu'un nouvel
// utilisateur reçoit était le PIRE des trois sur la variété : 45,0 % de ses semaines
// contenaient au moins deux assiettes jumelles (même couple protéine × féculent),
// contre 20,0 % pour un plan régénéré. Autrement dit, appuyer sur « Régénérer »
// réparait un défaut de la première impression. Les familles en cause sont
// massivement végétales (yaourt de soja, tofu, seitan, tempeh) — même trou de
// catalogue que celui déjà consigné en D19/B7.
//
// Pourquoi 0.03 et pas 0.04 comme sur le reroll. Balayage au seed 0, panel de
// référence (12 profils × 5 régimes) :
//   0 (avant) → 45,0 % · 0.01 → 31,7 % · 0.02 → 23,3 % · 0.03 → 23,3 % · 0.04 → 16,7 %
// 0.04 descend plus bas, mais fait apparaître 1 repas à drapeau sur 1 680 — une
// collation vegan+SG en sèche, hors cible calorique, SANS alternative propre dans la
// bande (limite du catalogue, vérifiée). Le canonique est à ZÉRO drapeau aujourd'hui ;
// c'est le tout premier plan servi, et on ne l'ouvre pas à un repas hors cible pour
// 6,6 points de variété. 0.03 prend l'essentiel du gain sans rien dégrader :
// écart calorique 0,25 → 0,27 % du jour (tolérance 5 %), fibres en sèche inchangées
// (20,42 g/1 000 kcal), aucun créneau monopolisé. Vérifiable : `npm run mesure:reglages`.
const FAMILY_SELECT_W_CANON = 0.03;
// Pénalité de score par utilisation d'une recette dans la semaine (rotation). Choisi
// nettement > à la bande la plus large (0.036) pour qu'UNE utilisation suffise à sortir
// une recette de la bande → rotation dès le lendemain. Ne dégrade PAS la précision :
// le total du jour est recollé par tightenDay + lissage hebdo (écart kcal/jour mesuré
// ~1 % à travers le balayage 0→0.09). Les recettes à flag (≥ 0.4) restent hors bande.
// Cf. selectMealAdapted. Balayage 2026-07-23 : variété semaine ~×2 vs 0, précision plate.
const VARIETY_STEP = 0.06;
// Rotation au niveau FAMILLE (cf. `familyKey`). La rotation par `usage` ne connaît que
// l'id : elle empêche la même recette de revenir, pas deux recettes QUASI identiques.
// Mesuré avant ce correctif, sur 240 semaines simulées (12 profils × 5 régimes ×
// 4 tirages) : **56,3 % des semaines servaient au moins deux recettes du MÊME couple
// (protéine × féculent)** — « poulet-riz-brocoli » et « wok poulet-riz-légumes » la même
// semaine. Le pire contrevenant, `edamame × maïs` en collation (48 semaines), est un
// groupe de DEUX recettes : parfaitement légal au regard de la règle anti-doublons R4 du
// catalogue, qui ne s'alarme qu'au-delà de 2. ➡️ Le compteur R4 n'est pas l'instrument du
// défaut ; le moteur, lui, le mesure. Détail et balayage : `AGENTS.md` D18.
//
// ⚠️ LA FAMILLE NE VIT PAS DANS LE SCORE EFFECTIF, et c'est tout le réglage.
// Première version essayée : `+ 0.03 × familyUsage` dans `effOf`. Elle descendait les
// quasi-doublons à 41,3 %, mais 0,03 dépasse la bande de départage de `balanced`
// (0,01 + 0,014 = 0,024) : elle ÉJECTAIT DE LA BANDE les recettes fibreuses que le nudge
// fibres venait d'y faire entrer. Les deux nudges se disputaient la même bande, et le
// biais fibres de sèche (P3.2) tombait à ×0,96 pour un seuil de ×1,02. La famille est
// donc sortie du score : elle est une CLÉ DE DÉPARTAGE dans `pickable.sort`, placée
// APRÈS `preferred` et `need` — elle réordonne, elle n'exclut JAMAIS.
//
// ⚠️ Le placement après `preferred` n'est pas cosmétique, il est MESURÉ. Une variante
// concurrente coupait la bande sur les fibres avant le tri : quasi-doublons 9,6 %, le
// meilleur chiffre obtenu — mais les repas servis à qui déclare préférer le poulet
// tombaient de 27,2 % à 18,3 %, et les drapeaux bloquants doublaient (17 → 35). Un
// nudge de variété ne passe pas devant le signal explicite de l'utilisateur.
//
// FAMILY_FIBER_TOL est en GRAMMES DE FIBRES PAR PORTION, pas en points de score :
// « la rotation des familles a le droit de coûter jusqu'à N g de fibres sur une
// assiette ; au-delà, les fibres reprennent la main ». Les deux nudges ne se disputent
// plus la même bande — ils sont ORDONNÉS.
//
// BALAYAGE COMPLET, mesuré sur le moteur (`npm run mesure:variete` + le pool le plus
// mince du catalogue, F 55 sèche en vegan + sans gluten) :
//
//   TOL | quasi-doublons | drapeaux | fibres sèche | pool mince : distinctes / drapeaux
//   ----|----------------|----------|--------------|-----------------------------------
//   OFF |     56,3 %     |    18    |    20,62     |        27 / 8
//    6  |     28,7 %     |    18    |    20,59     |        28 / 10  ← dégrade le mince
//  **7**|   **27,9 %**   |  **14**  |  **20,59**   |      **28 / 5**
//    8  |     25,0 %     |    14    |    20,59     |        28 / 5
//   8,5 |     26,7 %     |    20    |    20,11     |        28 / 11  ← la falaise
//    9  |     26,7 %     |    20    |    20,11     |        26 / 11
//
// ⚠️ POURQUOI 7. Ce n'est ni le minimum de la courbe (8) ni la valeur la plus prudente
// (6) : 6 est le SEUL réglage qui dégrade le pool le plus mince du catalogue (10 drapeaux
// contre 8 sans rotation famille) — « prendre de la marge » y coûtait précisément aux
// profils les moins bien servis. 7 prend exactement les mêmes gains que 8 sur tous les
// contrôles (drapeaux 18 → 14, pool mince 8 → 5) pour 2,9 points de quasi-doublons en
// plus, et il s'assied **1,5 g sous la falaise** au lieu de 0,5. Entre 8 et 8,5 les trois
// contrôles basculent ENSEMBLE (fibres de sèche 20,59 → 20,11, drapeaux 14 → 20, pool
// mince 5 → 11) : 8 n'a aucune marge, et un lot de recettes qui déplace le tirage peut
// le faire basculer — c'est EXACTEMENT ce qui est arrivé au test P3.2 avec le lot B4.
// Le catalogue bouge encore. Si ce réglage doit être recalibré, le refaire PAR BALAYAGE.
//
// ⚠️ Ce que la tolérance refuse de faire, assumé : un terme dans le score savait déloger
// les familles TRÈS fibreuses, la clé bornée non. `repas_complet | tempeh × riz_complet`
// reste à 11 semaines en quasi-doublon (4 avec le terme dans le score). Le bilan global va
// de 56,3 % à 27,9 %, mais le
// classement des pires contrevenants change — ce n'est pas une régression cachée.
const FAMILY_FIBER_TOL = 7;

// Reroll (« Nouveau plan ») : pour produire un plan DIFFÉRENT à chaque clic, on
// élargit le pool de choix (borné) et on décale la sélection avec un `seed`. Le
// report de budget kcal/protéines garde le total du jour en cible malgré la
// variation par repas. seed = 0 → plan canonique (déterministe, macro-serré).
const VARIANT_MIN = 4;

// ⚠️ LE RÉGLAGE DE VARIÉTÉ PILOTE LE REROLL — depuis le 2026-08-02 seulement.
//
// Avant, ces trois nombres étaient des CONSTANTES : le tirage de « Régénérer mon
// plan » construisait son panier sur sa propre bande et ignorait complètement
// `variety`. Mesuré : `balanced` et `max` rendaient un reroll IDENTIQUE AU BIT PRÈS
// (le plan canonique, lui, différait bien). Les trois cartes de l'écran promettaient
// donc trois comportements dont un seul existait — « Le plus de diversité » ne
// donnait pas plus de diversité que « Routine et variété » dès qu'on régénérait.
//
// `max` garde EXACTEMENT les valeurs calibrées pour A21 (bande 0.15 · pool 8 · top 7) :
// c'est sur des profils `max` que tournent `mesure-variete` et `mesure-couverture`,
// donc tous les chiffres de contrôle publiés décrivent cette ligne. Ne pas y toucher
// sans rejouer les deux scripts. Les deux autres se resserrent SOUS elle — personne
// ne perd ce qui vient d'être livré, et le réglage se met à dire la vérité.
//
//   · `pool`  : combien de candidats macro-comparables entrent dans le panier
//   · `top`   : parmi eux, combien le seed a le droit de départager
//   · `choix` : en dessous de combien un nudge se tait (cf. `affine`)
//
// `repetitive` reste volontairement au-dessus de 1 : « souvent les mêmes plats »
// décrit la SEMAINE (déjà obtenu par `step = 0` et `famActive = false`), pas le
// bouton. Quelqu'un qui demande explicitement un nouveau plan doit en recevoir un.
interface ReglageReroll { band: number; pool: number; top: number; choix: number }
const REROLL_PAR_VARIETE: Record<VarietyPreference, ReglageReroll> = {
  repetitive: { band: 0.10, pool: 4,  top: 3,  choix: 2 },
  balanced:   { band: 0.15, pool: 8,  top: 7,  choix: 4 },
  max:        { band: 0.15, pool: 10, top: 9,  choix: 5 },
};
// Repli sur `balanced` : une préférence hors barème est normalisée au chargement
// (`syncGuard::normalizeVariety`), mais le moteur ne doit pas en dépendre — il est
// appelé aussi par des scripts de mesure et des tests qui construisent leurs profils.
const reglageReroll = (v: VarietyPreference): ReglageReroll =>
  REROLL_PAR_VARIETE[v] ?? REROLL_PAR_VARIETE.balanced;

// ── CE QUI FAIT MARCHER « Régénérer mon plan » ──────────────────────────────
//
// Le seed départage le haut d'un pool CLASSÉ par qualité (préférence > besoin >
// famille > fibres > fit). Avant le
// 2026-08-02, le seed n'était qu'une clé de départage placée SOUS les nudges
// (besoin, famille, fibres). Ces clés sont ABSOLUES : à pool identique elles
// désignent toujours le même gagnant. Mesuré : le pool de variantes contenait
// 7,83 recettes, mais le groupe que le seed pouvait réellement arbitrer n'en
// contenait que 1,30 — et dans 77,8 % des sélections, une seule. Le seed ne
// décidait rien. Conséquence pour l'utilisateur : il confirmait « Régénérer »,
// atterrissait sur l'écran Plan… et retrouvait le MÊME petit-déjeuner 86 % du
// temps. Le bouton n'était pas cassé — il était inaudible.
//
// Le correctif inverse les rôles : les nudges CLASSENT, le seed CHOISIT parmi
// les `top` premiers. C'est exactement le motif de `swapMeal`
// (« Échanger ce repas ») — qui, lui, a toujours fonctionné. La qualité reste
// garantie : la recette servie est toujours dans le haut du classement.
//
// Calibré au balayage (`npm run mesure:reroll` + `npm run mesure:variete --variete=…`),
// 48 profils × 8 rerolls et 240 semaines simulées par réglage. La colonne « avant » est
// l'état d'avant A21, commun aux trois — le tirage ignorait alors `variety` :
//
//                                          avant │ repetitive  balanced     max
//   1er repas affiché qui change          13,7 % │   51,2 %     78,0 %    82,7 %
//   semaine renouvelée                    43,4 % │   74,0 %     90,3 %    92,4 %
//   positions figées sur 8 rerolls        31,5 % │    0,4 %      0,0 %     0,0 %
//   recettes distinctes / 4 sem (médiane)     41 │      30         62        64
//   quasi-doublons de famille             27,9 % │   22,5 %     27,5 %    26,3 %
//   repas à drapeau bloquant / 6 720          14 │       5          5         6
//   fibres en sèche, g/1 000 kcal          20,59 │   20,28      21,22     20,63
//   écart calorique moyen du jour          0,36 % │   0,25 %     0,37 %    0,40 %
//
// Aucun des trois réglages n'est en dessous de l'état d'avant sur un seul contrôle, et
// le renouvellement suit enfin l'ordre que les cartes de l'écran promettent. Le prix de
// `max` est lisible et assumé : un peu de densité en fibres et de rotation par famille
// échangées contre de la diversité — c'est exactement ce que le réglage veut dire.
// `repetitive` sert moins de recettes distinctes (30 contre 62) : c'est le but.
//
// Tous les contrôles de qualité vont donc dans le BON sens, sauf l'écart calorique qui
// perd 0,02 point (bruit : il reste sous 0,4 %). Ce n'est PAS gratuit : sans les deux
// compensations (`FIBER_SELECT_W_VARIANT`, `FAMILY_SELECT_W_VARIANT`) et le plancher de
// drapeaux, ouvrir le tirage les dégradait TOUS — mesuré à la première tentative :
// quasi-doublons 41,7 %, fibres 18,72, drapeaux 22. Ne pas toucher à
// `REROLL_PAR_VARIETE.max` sans rejouer les deux scripts.
//
// ⚠️ Le plan CANONIQUE (seed 0) est inchangé — vérifié sur 144 combinaisons profil ×
// régime × variété, plans identiques au champ près. C'est pourquoi ENGINE_VERSION n'a
// PAS été bumpé : aucun plan en cache n'est périmé, et bumper aurait ramené de force au
// plan canonique les gens qui avaient justement demandé un reroll.

// Rang pseudo-aléatoire stable d'une recette pour un seed donné (FNV-like).
function seededRank(seed: number, id: string): number {
  let h = (seed * 2654435761) >>> 0;
  for (let i = 0; i < id.length; i++) h = ((h ^ id.charCodeAt(i)) * 16777619) >>> 0;
  return h >>> 0;
}

// ── Cible repas (le moteur = seul cerveau macro) ─────────────────────────────
// Ratio carb:fat (en fraction des kcal NON protéiques) déduit des cibles du profil
// (respecte le mode percent). Sert UNIQUEMENT à convertir un budget kcal en grammes
// de glucides/lipides — il vit dans le moteur, pas dans adaptRecipe.
function carbFatRatio(profile: UserProfile): { carb: number; fat: number } {
  const carbK = 4 * (profile.target_carbs_g || 0);
  const fatK = 9 * (profile.target_fat_g || 0);
  if (carbK + fatK > 0) return { carb: carbK / (carbK + fatK), fat: fatK / (carbK + fatK) };
  return { carb: 0.55, fat: 0.45 }; // repli neutre (profil sans ratio)
}

/**
 * Cible repas EN GRAMMES à partir d'un budget restant (kcal + protéines), du poids
 * du repas et du ratio carb:fat du profil. Les protéines sont prioritaires (pleines) ;
 * les glucides/lipides sont déduits des kcal NON protéiques → un écart hors-plan
 * exprimé en kcal est absorbé (les repas restants rétrécissent pour tenir la cible).
 */
function mealTarget(
  remKcal: number, remProt: number, weight: number, remWeight: number,
  ratio: { carb: number; fat: number }, protFloor = 0,
): AdaptTarget {
  const share = remWeight > 0 ? weight / remWeight : 0;
  const kcalMeal = Math.max(remKcal, 0) * share;
  const proteinMeal = Math.max(Math.max(remProt, 0) * share, Math.min(protFloor, kcalMeal / 4));
  const nonProtKcal = Math.max(kcalMeal - 4 * proteinMeal, 0);
  return {
    kcalMeal,
    proteinMeal,
    carbMeal: (nonProtKcal * ratio.carb) / 4,
    fatMeal: (nonProtKcal * ratio.fat) / 9,
  };
}

// ── Cyclage glucidique : jours actifs vs jours de repos ──────────────────────
// Les jours SANS entraînement, on garde les MÊMES kcal et les MÊMES protéines
// (plancher protéique quotidien), mais on décale une part des kcal NON protéiques
// des glucides vers les lipides : moins de glucides quand on ne s'entraîne pas,
// énergie préservée (carb-cycling isocalorique léger). Les jours d'entraînement
// gardent le ratio du profil. Décalage exprimé en points de la fraction non-prot.
const REST_DAY_CARB_TO_FAT_SHIFT = 0.12;

function restDayRatio(ratio: { carb: number; fat: number }): { carb: number; fat: number } {
  const shift = Math.min(REST_DAY_CARB_TO_FAT_SHIFT, ratio.carb);
  return { carb: ratio.carb - shift, fat: ratio.fat + shift };
}

/**
 * Jours de REPOS du plan (numéros 1-based), déduits du nombre de jours
 * d'entraînement/semaine du profil. Les jours de repos sont répartis le plus
 * uniformément possible (on ne « colle » pas les jours off). Déterministe.
 *  - entraînement ≥ nb de jours → aucun repos ; entraînement ≤ 0 → tous repos.
 */
export function restDaySet(days: number, trainingDaysPerWeek: number): Set<number> {
  const set = new Set<number>();
  const train = Math.max(0, Math.round(trainingDaysPerWeek || 0));
  const rest = Math.max(0, Math.min(days, days - train));
  if (rest <= 0) return set;
  if (rest >= days) { for (let d = 1; d <= days; d++) set.add(d); return set; }
  for (let i = 0; i < rest; i++) {
    let d = Math.min(days, Math.max(1, Math.round((days * (i + 0.5)) / rest)));
    while (set.has(d) && d < days) d++;       // collisions d'arrondi → glisse vers le haut
    while (set.has(d) && d > 1) d--;           // puis vers le bas si besoin
    set.add(d);
  }
  return set;
}

/**
 * Jours de REPOS effectifs d'un plan (numéros 1-based), pour un profil donné.
 *  - `rest_weekdays` défini (même []) → l'user a CHOISI ses jours : on mappe ces
 *    jours de semaine (getDay) sur les index du plan via `plan_weekdays`.
 *  - `rest_weekdays` absent → repli historique : déduction auto depuis le nb de
 *    jours d'entraînement (répartis uniformément). Déterministe dans les deux cas.
 */
export function restDaysForProfile(profile: UserProfile, days: number): Set<number> {
  if (Array.isArray(profile.rest_weekdays)) {
    const wd = profile.plan_weekdays ?? [];
    const chosen = profile.rest_weekdays;
    const set = new Set<number>();
    for (let i = 0; i < days; i++) if (chosen.includes(wd[i])) set.add(i + 1);
    return set;
  }
  return restDaySet(days, profile.training_days_per_week);
}

/**
 * Sens de l'objectif pour l'asymétrie de fit (A2), déduit de l'écart TDEE − cible :
 *   +1 = DÉFICIT (sèche/recomp) → le DÉBORDEMENT kcal érode le déficit (danger).
 *   -1 = SURPLUS (prise de masse) → le MANQUE kcal érode le surplus (danger).
 *    0 = MAINTIEN → symétrique (comportement historique).
 * Deadband ±40 kcal : anti-flapping autour du maintien.
 */
export function goalDirection(profile: UserProfile): number {
  const delta = (profile.tdee_kcal || 0) - (profile.target_kcal || 0);
  if (delta > 40) return 1;
  if (delta < -40) return -1;
  return 0;
}

// Score de fit d'une recette adaptée vs la cible repas (plus petit = meilleur).
// La cible (kcal/protéines/glucides/lipides en grammes) vient du moteur ; le score
// privilégie les recettes qui atteignent kcal + protéines, puis les bons axes
// glucides/lipides (une recette sans axe gras est pénalisée pour une cible grasse).
//
// ASYMÉTRIE A2 : l'écart kcal du CÔTÉ DANGEREUX (débordement en sèche, manque en
// prise de masse) est compté ~2× et son flag pénalisé plus lourd. La sélection
// penche donc vers le côté sûr ET le côté dangereux sort plus vite de la bande de
// variété (« coller à la cible prime sur la variété » côté risque). Maintien
// (goalDir 0) → strictement le comportement symétrique d'avant.
function fitScore(macros: Macros, target: AdaptTarget, flags: AdaptFlag[], goalDir: number): number {
  const dev = (macros.kcal - target.kcalMeal) / Math.max(target.kcalMeal, 1); // signé
  const dangerous = goalDir > 0 ? Math.max(dev, 0) : goalDir < 0 ? Math.max(-dev, 0) : 0;
  let s = Math.abs(dev) + dangerous; // côté dangereux ~2×
  if (flags.includes('under_target_kcal')) s += goalDir < 0 ? 1.6 : 1;
  if (flags.includes('over_target_kcal')) s += goalDir > 0 ? 1.6 : 1;
  if (flags.includes('protein_below_target')) s += 1.2;
  if (flags.includes('fat_below_target')) s += 0.4;
  if (flags.includes('carbs_below_target')) s += 0.4;
  if (flags.includes('no_protein_anchor')) s += 0.5;
  return s;
}

// Mots-clés exclus par régime
const RESTRICTION_BLOCKLIST: Record<DietaryRestriction, string[]> = {
  vegetarian: ['poulet', 'boeuf', 'bœuf', 'steak', 'saumon', 'thon', 'jambon', 'porc', 'dinde', 'poisson', 'cabillaud', 'crevette'],
  // vegan = végétarien + œufs + laitiers + miel. Mots-clés laitiers ciblés pour ne
  // PAS bloquer les alternatives végétales (lait d'amande/coco, yaourt de soja, beurre de cacahuète).
  vegan: [
    'poulet', 'boeuf', 'bœuf', 'steak', 'jambon', 'porc', 'dinde', 'lardon', 'bacon', 'viande',
    'saumon', 'thon', 'poisson', 'cabillaud', 'crevette', 'maquereau', 'sardine',
    'œuf', 'oeuf', 'miel',
    'skyr', 'whey', 'fromage', 'mozzarella', 'feta', 'parmesan', 'cottage', 'yaourt grec',
    'lait demi', 'lait entier', 'lait écrémé',
  ],
  pescatarian: ['poulet', 'boeuf', 'bœuf', 'steak', 'jambon', 'porc', 'dinde'],
  no_pork: ['porc', 'jambon', 'lardon', 'bacon'],
  lactose_free: ['lait', 'fromage', 'yaourt'],
  gluten_free: ['pâtes', 'pain', 'blé', 'semoule', 'avoine'],
  // halal : porc + charcuterie + gélatine (souvent porcine). On évite « vin » (→ faux
  // positif « vinaigre ») et l'alcool, absents du catalogue ; ce repli ne sert que pour
  // les recettes custom sans classification. La viande non-porc est supposée halal.
  halal: ['porc', 'jambon', 'lardon', 'bacon', 'saucisson', 'chorizo', 'gélatine', 'gelatine'],
};

function ingredientText(recipe: Recipe): string {
  return recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
}

/**
 * Une recette est-elle compatible avec le profil ?
 *
 * ⚠️ Le TEMPS DE PRÉPARATION ne filtre plus rien depuis le 2026-07-29. Il vivait ici,
 * dans le même prédicat que le régime, donc quand le curseur vidait le pool le repli
 * lâchait les deux d'un coup : un végétarien recevait de la viande parce qu'il avait
 * demandé 15 minutes. Et il les vidait vraiment — au réglage par défaut (15 min), un
 * végétarien avait ZÉRO repas complet compatible sur 170, et un profil sans
 * restriction en avait 13. Comme 311 des 314 recettes tiennent déjà sous 30 minutes,
 * le pire cas sans filtre est un plat de 30 minutes : on échangeait un inconfort borné
 * contre une trahison qui ne l'était pas. `temps_min` reste AFFICHÉ sur chaque fiche.
 * Le curseur sera peut-être réintroduit — en préférence pondérée, jamais en filtre dur.
 */
function recipeAllowed(recipe: Recipe, profile: UserProfile): boolean {
  const text = ingredientText(recipe);

  // Régimes : restrictions_ok autoritaire si présent (recettes Kyroz), sinon repli
  // mots-clés (recettes legacy/overrides sans classification diététique).
  for (const r of profile.dietary_restrictions ?? []) {
    if (recipe.restrictions_ok) {
      if (!recipe.restrictions_ok.includes(r)) return false;
    } else if (RESTRICTION_BLOCKLIST[r].some((kw) => text.includes(kw))) {
      return false;
    }
  }

  // Aliments évités. ⚠️ Passe par `recipeContainsFood` et NON par une sous-chaîne sur
  // `text` : la comparaison brute échouait EN SILENCE sur les mots de famille et sur les
  // ligatures — « poisson » n'attrapait 0 ref sur 7, « oeuf » sans ligature 0 sur 2,
  // « fruits à coque » 0 sur 5. L'utilisateur croyait avoir exclu le poisson et le
  // moteur lui en servait. Détail et mesure : `lib/avoidance.ts` + `AGENTS.md` D3.
  for (const disliked of profile.disliked_foods ?? []) {
    if (recipeContainsFood(recipe, disliked)) return false;
  }

  return true;
}

function poolFor(mealType: MealType, profile: UserProfile): Recipe[] {
  return poolForWithFlag(mealType, profile).pool;
}

/**
 * Pool pour un repas + drapeau `relaxed`. Deux soustractions EMPILÉES, dans cet
 * ordre de dureté :
 *   ① Régime + aliments évités (recipeAllowed) = MUR DUR. Jamais relâché tant
 *      qu'il reste ≥1 recette compatible : un végétarien ne voit QUE du végé.
 *   ② Recettes « j'aime pas » (hidden_recipes) = SOUPLE. Retirées du pool, mais
 *      si elles le VIDENT, on les ré-affiche (rien n'est banni définitivement) —
 *      le régime, lui, tient toujours. C'est l'élicitation d'ingrédient (UI) qui
 *      doit intervenir AVANT ce repli pour transformer les 👎 en vraie préférence.
 * `relaxed` = true UNIQUEMENT quand le RÉGIME a dû céder (cas légitime : aucune
 * recette compatible au catalogue) — pas quand on ré-affiche des 👎.
 */
function poolForWithFlag(mealType: MealType, profile: UserProfile): { pool: Recipe[]; relaxed: boolean } {
  const recipes = getEffectiveRecipes();
  const all = recipes.filter((r) => r.tags.includes(mealType));
  const dietOk = all.filter((r) => recipeAllowed(r, profile)); // ① mur dur
  const hidden = new Set(profile.hidden_recipes ?? []);
  const visible = dietOk.filter((r) => !hidden.has(r.id));      // ② moins les 👎
  if (visible.length > 0) return { pool: visible, relaxed: false };
  if (dietOk.length > 0) return { pool: dietOk, relaxed: false };  // ② trop de 👎 → on les ré-affiche (régime intact)
  if (all.length > 0) return { pool: all, relaxed: true };          // ① dernier recours : régime non garanti
  return { pool: recipes, relaxed: true };
}

/**
 * Nb de recettes RÉELLEMENT proposables pour un repas (régime OK + non masquées).
 * Sert au déclenchement de l'élicitation d'ingrédient (seuil bas, cf. lib/dislike.ts) :
 * quand un 👎 fait passer ce compte sous le seuil, l'UI demande quel ingrédient gêne.
 */
export function mealPoolSize(profile: UserProfile, mealType: MealType): number {
  const hidden = new Set(profile.hidden_recipes ?? []);
  return getEffectiveRecipes().filter(
    (r) => r.tags.includes(mealType) && recipeAllowed(r, profile) && !hidden.has(r.id)
  ).length;
}

// Mots-clés par source de protéine préférée. Sert UNIQUEMENT de départage à
// macro équivalente (jamais au détriment de la précision) : parmi les recettes
// quasi-ex æquo, on penche vers celles qui collent aux préférences déclarées.
const PROTEIN_KEYWORDS: Record<string, string[]> = {
  poulet: ['poulet'],
  'bœuf': ['bœuf', 'boeuf', 'steak'],
  poisson: ['saumon', 'thon', 'cabillaud', 'crevette', 'poisson'],
  'œufs': ['œuf', 'oeuf'],
  whey: ['whey'],
  'végétal': ['tofu', 'lentille', 'pois chiche', 'haricot', 'dahl'],
};

/** Ids des recettes dont les ingrédients matchent ≥1 protéine préférée. */
function preferredRecipeIds(profile: UserProfile): Set<string> {
  const prefs = profile.preferred_proteins ?? [];
  const kws = prefs.flatMap((p) => PROTEIN_KEYWORDS[p] ?? []);
  if (kws.length === 0) return new Set();
  const ids = new Set<string>();
  for (const r of getEffectiveRecipes()) {
    const text = ingredientText(r);
    if (kws.some((kw) => text.includes(kw))) ids.add(r.id);
  }
  return ids;
}

interface AdaptedChoice {
  recipe: Recipe;
  ingredients: Ingredient[];
  macros: Macros;
  gap: Macros;     // atteint − cible (signé)
  flags: AdaptFlag[];
  score: number;   // fit macro (plus petit = meilleur)
  fiber: number;   // fibres approximatives (départage)
  preferred: boolean; // matche une protéine préférée
  need: number;    // soft-match objectif + sport (0–2)
}

/**
 * Choisit une recette pour un repas en l'ADAPTANT par ingrédient (adaptRecipe) à
 * la cible macro du repas, puis départage les quasi-ex æquo. Remplace l'ancienne
 * grille de portions : chaque recette est scalée vers la cible, on score par les
 * flags + l'écart kcal résiduel, et on départage par préférence > besoin (objectif
 * /sport) > fibres/variété > seed.
 *  - repetitive (seed 0) : meilleur fit strict → même séquence chaque jour.
 *  - balanced / max : recette la moins utilisée (bande plus large en « max »).
 *
 * ⚠️ Le jour de repos ne joue PLUS ici (décision 2026-07-29). Il agit en AMONT, sur
 * la CIBLE : `restDayRatio` déplace 12 points de la fraction non protéique des
 * glucides vers les lipides, à calories et protéines constantes, et `adaptRecipe`
 * ajuste ensuite les quantités de chaque recette vers cette cible. Le tag
 * `rest_day_ok` faisait doublon avec ce mécanisme tout en déplaçant 30 à 36 % des
 * repas des jours de repos — alors qu'un tiers du catalogue le portait à
 * contre-sens (8 recettes taguées « jour off » dépassent 50 % de kcal glucidiques).
 * Un tag de contenu ne peut pas arbitrer mieux que le moteur qui, lui, mesure.
 */
/**
 * Clé de FAMILLE d'une recette : `refs protéine × refs glucide`.
 *
 * C'est le même triplet que la règle anti-doublons R4 du catalogue, moins la catégorie
 * (les pools sont déjà séparés par créneau). Deux recettes qui partagent cette clé sont
 * « la même assiette autrement racontée » : poulet-riz-brocoli et wok poulet-riz-légumes.
 * L'utilisateur les vit comme une répétition ; `usage`, qui ne compte que les ids, ne
 * les distingue pas.
 */
export function familyKey(r: Recipe): string {
  const refs = (role: string) =>
    r.ingredients.filter((i) => i.macro_role === role).map((i) => i.ref ?? i.name).sort().join('+') || '∅';
  return `${refs('protein')}×${refs('carb')}`;
}

function selectMealAdapted(
  pool: Recipe[],
  target: AdaptTarget,
  usage: Record<string, number>,
  familyUsage: Record<string, number>,
  families: Map<string, string>,
  variety: VarietyPreference,
  preferredIds: Set<string>,
  objectives: RecipeObjective[],
  sportBuckets: RecipeSport[],
  seed: number,
  fiberStrong: boolean,
  goalDir: number
): AdaptedChoice {
  const candidates: AdaptedChoice[] = pool
    .map((r) => {
      const a = adaptRecipe(r, target);
      return {
        recipe: r, ingredients: a.ingredients, macros: a.macros, gap: a.gap, flags: a.flags,
        score: fitScore(a.macros, target, a.flags, goalDir),
        fiber: recipeFiberPerPortion(r),
        preferred: preferredIds.has(r.id),
        need: needMatch(r, objectives, sportBuckets),
      };
    })
    .sort((a, b) => a.score - b.score || a.recipe.id.localeCompare(b.recipe.id));

  // Plan canonique répétitif (seed 0) : meilleur score strict, jours identiques.
  if (variety === 'repetitive' && seed === 0) return candidates[0];

  // Rotation intra-semaine par SCORE EFFECTIF : une recette déjà servie voit son
  // score monter de `VARIETY_STEP` par utilisation (son fit réel est inchangé) → elle
  // sort de la bande et cède la place à une recette fraîche de qualité comparable.
  // Fix variété 2026-07-23 : avant, `usage` n'était qu'un départage ENFOUI sous les
  // fibres (en sèche) et le besoin objectif/sport — clés ABSOLUES → la même recette
  // « la meilleure sur cet axe » revenait 7 j/7 (petit-déj 2/7 avec 78 recettes). En
  // repliant `usage` dans le score, les nudges fibres/objectif restent mais ne peuvent
  // plus monopoliser : ils choisissent la qualité au 1er passage, la rotation reprend
  // ensuite. `repetitive` (plan canonique voulu statique) : pas de pénalité.
  // Biais fibres EN SÈCHE (`fiberStrong` = cut/cut_aggressive) : la fibre par portion
  // baisse le score effectif → les recettes plus fibreuses entrent dans la bande et
  // sont préférées. Corrige le trou mesuré (P3.2/2026-07-23 : sèche ~32 g/j vs cible
  // ~42) qui n'était PAS un manque de catalogue (plafond du pool GF ~81 g/j) mais un
  // défaut de SÉLECTION — le moteur choisissait autour de la médiane. `FIBER_SELECT_W`
  // calibré au balayage : à 0.005 la sèche passe à ~40 g (précision jour intacte <1 %,
  // variété quasi inchangée) ; au-delà de ~0.015 → surdose (>55 g) + variété qui chute.
  // Hors sèche : 0 (le maintien/la prise de masse ne sont pas touchés).
  const step = variety === 'repetitive' ? 0 : VARIETY_STEP;
  // La FAMILLE reste HORS du score effectif : la bande, `minEff` et `pickable` sont
  // exactement ceux d'avant ce correctif, donc aucune recette fibreuse n'est éjectée de
  // la bande par un couple déjà servi. Elle est consommée plus bas, en clé de départage
  // bornée (cf. FAMILY_FIBER_TOL). Le plan canonique (`repetitive`) n'en veut pas : il
  // est volontairement statique.
  const famActive = variety !== 'repetitive';
  const famUse = (c: AdaptedChoice) =>
    famActive ? (familyUsage[families.get(c.recipe.id) ?? ''] ?? 0) : 0;
  const fiberW = fiberStrong ? (seed !== 0 ? FIBER_SELECT_W_VARIANT : FIBER_SELECT_W) : 0;
  // La FAMILLE entre dans le SCORE — même raison que les fibres : la clé de départage
  // « famille la moins servie » (plus bas) ne suffit pas à empêcher deux assiettes
  // jumelles dans la même semaine. En pénalisant le score, la famille déjà servie sort
  // du panier au lieu de perdre un départage. À 0 le reroll rendait 3,8 points de
  // quasi-doublons ; ici il n'en rend rien.
  // Le poids est PLUS DOUX au plan canonique (cf. FAMILY_SELECT_W_CANON) : le seed y
  // tire moins large, et le canonique doit rester à zéro repas hors cible.
  // ⚠️ Avant le 2026-08-02, le canonique ne recevait AUCUNE pénalité de famille — le
  // premier plan servi était donc le moins varié des trois. C'était l'inverse de ce
  // qu'on veut d'une première impression.
  const famW = famActive ? (seed !== 0 ? FAMILY_SELECT_W_VARIANT : FAMILY_SELECT_W_CANON) : 0;
  const effOf = (c: AdaptedChoice) =>
    c.score - fiberW * c.fiber + step * (usage[c.recipe.id] ?? 0) + famW * famUse(c);
  candidates.sort((a, b) => effOf(a) - effOf(b) || a.recipe.id.localeCompare(b.recipe.id));

  const minEff = effOf(candidates[0]);
  const band = (variety === 'max' ? TIE_BAND_MAX : TIE_BAND_BALANCED) + (fiberStrong ? FIBER_BAND_BONUS : 0);

  // Le reroll ouvre le panier — et son ampleur SUIT LE RÉGLAGE DE VARIÉTÉ depuis le
  // 2026-08-02 (cf. REROLL_PAR_VARIETE). Avant, elle était la même pour les trois.
  const rr = reglageReroll(variety);
  let pickable = candidates.filter((c) => effOf(c) <= minEff + band);
  if (seed !== 0) {
    let wide = candidates.filter((c) => effOf(c) <= minEff + rr.band);
    if (wide.length < VARIANT_MIN) wide = candidates.slice(0, VARIANT_MIN);
    pickable = wide.slice(0, rr.pool);
  }

  const fiberCmp = (a: AdaptedChoice, b: AdaptedChoice) => (b.fiber - a.fiber > 1 ? 1 : a.fiber - b.fiber > 1 ? -1 : 0);

  pickable.sort((a, b) => {
    // 1) Protéines préférées d'abord (signal explicite de l'utilisateur).
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    // 1bis) Besoin : recette taguée pour l'objectif/sport (soft-matching).
    if (a.need !== b.need) return b.need - a.need;
    // (plus de départage `rest_day_ok` ici — cf. le commentaire de selectMealAdapted.)
    // 1quater) FAMILLE (protéine × féculent) : à préférence et besoin égaux, la famille
    // la moins servie de la semaine passe devant — MAIS seulement si elle ne coûte pas
    // plus de FAMILY_FIBER_TOL g de fibres/portion. Au-delà, les fibres reprennent la
    // main. Placée ICI et pas plus haut : `preferred` (signal explicite de
    // l'utilisateur) et `need` restent prioritaires sur un nudge de variété.
    {
      const d = famUse(a) - famUse(b);
      if (d !== 0) {
        const frais = d < 0 ? a : b;
        const servi = d < 0 ? b : a;
        if (servi.fiber - frais.fiber <= FAMILY_FIBER_TOL) return d;
      }
    }
    // 1ter) Fibres : nudge satiété (en sèche surtout). La rotation ne dépend plus de
    // cette clé — elle vit dans le score effectif → plus de monopole d'une recette.
    { const f = fiberCmp(a, b); if (f !== 0) return f; }
    // 2) Sinon le meilleur score EFFECTIF (moins utilisé d'abord), puis déterminisme.
    // ⚠️ Le seed N'EST PLUS une clé de départage ici : il ne se déclenchait qu'en cas
    // d'ex æquo parfait sur tout ce qui précède, ce qui n'arrivait presque jamais
    // (cf. REROLL_PAR_VARIETE). Il agit APRÈS le tri, sur le haut du classement.
    return effOf(a) - effOf(b) || a.recipe.id.localeCompare(b.recipe.id);
  });

  // « Régénérer mon plan » : les nudges ont CLASSÉ, le seed CHOISIT parmi le haut du
  // panier. Même motif que `swapMeal` (« Échanger ce repas ») : la recette servie est
  // toujours dans les meilleures, mais ce n'est plus fatalement la même.
  if (seed !== 0 && pickable.length > 1) {
    let choix = pickable.slice(0, Math.min(rr.top, pickable.length));

    // PLANCHER DE QUALITÉ, avant tout le reste : un repas qui rate sa cible macro
    // (kcal hors ±12 %, protéines sous 95 %) ne se sert pas s'il existe une alternative
    // propre dans le haut du panier. Ce n'est pas un nudge — c'est la limite de ce qu'on
    // a le droit de proposer. Sans lui, ouvrir le tirage faisait remonter 25 repas à
    // drapeau sur 6 720 ; avec, 5 (contre 14 AVANT le correctif : on fait mieux qu'avant).
    //
    // ⚠️ L'EXCEPTION `monopole` n'est pas un raffinement, c'est la réparation d'une
    // régression que j'ai introduite et que les moyennes ne voyaient pas. Quand un
    // créneau ne compte qu'UNE recette sans drapeau — cas réel du petit-déjeuner vegan
    // à forte cible protéique, où AUCUNE recette n'atteint la cible — le plancher la
    // désignait à chaque fois, et le créneau servait 7 jours d'affilée le même plat.
    // La rotation (`VARIETY_STEP`) ne pouvait rien : elle agit sur le CLASSEMENT, et un
    // filtre qui ne laisse qu'un candidat court-circuite tout classement. On ne se tait
    // donc que dans ce cas précis — candidat propre UNIQUE ET DÉJÀ SERVI cette semaine —
    // ce qui coûte 4 repas à drapeau au lieu de 10 si on se taisait dès 2 candidats.
    //
    // 🔎 Ce défaut n'était visible d'AUCUNE des mesures de renouvellement : un moteur
    // qui sert la même recette 7 jours sur 7, mais une AUTRE à chaque reroll, les passe
    // toutes. C'est le contrôle « créneaux MONOPOLISÉS » de `scripts/mesure-reroll.ts`
    // qui l'a levé, et il a été ajouté APRÈS coup. Ne pas le retirer.
    // ⚠️ …SAUF en `repetitive`. Ce réglage DEMANDE « souvent les mêmes plats » : y casser
    // un monopole, c'est défaire ce que l'utilisateur a choisi — et le payer en repas
    // hors cible. Mesuré : l'exception coûtait 22 repas à drapeau sur 6 720 en
    // `repetitive` contre 5 ailleurs. Sans elle sur ce réglage : 5 aussi.
    const antiMonopole = variety !== 'repetitive';
    const propres = choix.filter((c) => !c.flags.some((f) => FLAG_AUDIENCE[f] === 'user'));
    const monopole = antiMonopole && propres.length === 1 && (usage[propres[0].recipe.id] ?? 0) > 0;
    if (propres.length > 0 && !monopole) choix = propres;

    // Les protéines PRÉFÉRÉES gardent la priorité ABSOLUE : c'est un signal explicite
    // de l'utilisateur, pas un nudge (même garde-fou que le biais favoris de `swapMeal`).
    if (choix.some((c) => c.preferred)) choix = choix.filter((c) => c.preferred);

    // Les nudges gardent la main — À CONDITION DE LAISSER LE CHOIX. Un nudge peut
    // réduire le haut du panier tant qu'il y reste `rr.choix` candidats ; au-delà il
    // se tait. C'est ce garde-fou qui manquait : appliqués sans borne, les trois
    // nudges ramenaient le panier à UNE recette dans 77,8 % des cas, et le reroll
    // n'avait plus rien à tirer. Même esprit que `FAMILY_FIBER_TOL` : un nudge borné.
    const affine = (garde: (c: AdaptedChoice) => boolean) => {
      const f = choix.filter(garde);
      if (f.length >= rr.choix) choix = f;
    };
    // Même ordre que le comparateur ci-dessus, pour qu'il n'y ait qu'une hiérarchie à
    // retenir. L'ordre a été mesuré : le mettre à l'envers (fibres d'abord) ne déplace
    // rien — 76,8 % vs 78,0 % de renouvellement, contrôles identiques au dixième près.
    // Ce n'est donc PAS un réglage sensible : les fibres et la famille sont désormais
    // portées par le score, pas par ce départage.
    const besoinMax = Math.max(...choix.map((c) => c.need));
    affine((c) => c.need === besoinMax);
    const famMin = Math.min(...choix.map(famUse));
    affine((c) => famUse(c) === famMin);
    const fibreMax = Math.max(...choix.map((c) => c.fiber));
    affine((c) => fibreMax - c.fiber <= 1);

    return choix.reduce((best, c) =>
      seededRank(seed, c.recipe.id) < seededRank(seed, best.recipe.id) ? c : best);
  }

  // Pas de plancher de qualité ici, contrairement au reroll — et c'est MESURÉ, pas
  // une omission. Essayé le 2026-08-02 : au poids canonique retenu il ne change
  // strictement rien (23,3 % de quasi-doublons, 0 drapeau, mêmes fibres, avec ou
  // sans). Il ne rattrapait pas non plus le drapeau apparu à `FAMILY_SELECT_W_VARIANT`
  // au canonique : ce repas-là (collation vegan+SG en sèche) n'a AUCUNE alternative
  // propre dans la bande — c'est une limite du catalogue, pas un défaut de sélection.
  // Un garde-fou qui ne garde rien est du bruit : il a donc été retiré.
  return pickable[0];
}

/**
 * Macros qui comptent VRAIMENT pour un repas dans le total du jour :
 *  - skipped → rien (0)
 *  - eaten   → ce qui a été mangé (locked_macros si fourni, sinon les macros prévues)
 *  - planned → les macros prévues
 */
export function effectiveMacros(meal: Meal): Macros {
  if (meal.status === 'skipped') return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  if (meal.status === 'eaten') return meal.locked_macros ?? meal.macros;
  return meal.macros;
}

/** Ingrédients EFFECTIFS d'un repas (noms + quantités) : adaptés si présents,
 *  sinon repli sur la recette × portions (plans en cache d'avant la refonte). */
export function mealIngredients(meal: Meal): { name: string; quantity_g: number; unit: string; ref?: string; food_id?: string }[] {
  if (meal.adapted_ingredients?.length) {
    return meal.adapted_ingredients.map((i) => ({
      name: i.name, quantity_g: i.quantity_g, unit: i.unit ?? 'g', ref: i.ref, food_id: i.food_id,
    }));
  }
  const f = meal.portions ?? 1;
  return meal.recipe.ingredients.map((i) => ({
    name: i.name, quantity_g: i.quantity_g * f, unit: i.unit ?? 'g', ref: i.ref, food_id: i.food_id,
  }));
}

export function computeDailyTotals(
  meals: Meal[],
  days: number,
  extras?: Record<number, Macros>
): Macros[] {
  const totals: Macros[] = Array.from({ length: days }, () => ({
    kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
  }));
  for (const meal of meals) {
    const t = totals[meal.day - 1];
    if (!t) continue;
    const m = effectiveMacros(meal);
    t.kcal += m.kcal;
    t.protein_g += m.protein_g;
    t.carbs_g += m.carbs_g;
    t.fat_g += m.fat_g;
  }
  if (extras) {
    for (const [day, m] of Object.entries(extras)) {
      const t = totals[Number(day) - 1];
      if (!t) continue;
      t.kcal += m.kcal; t.protein_g += m.protein_g; t.carbs_g += m.carbs_g; t.fat_g += m.fat_g;
    }
  }
  return totals;
}

/**
 * Quel tirage servir à la prochaine génération.
 *
 * `stored` = le seed enregistré (AsyncStorage `@kyroz:planSeed`), `reroll` = l'appui
 * sur « Régénérer mon plan ». Une seule règle : **le tirage courant se garde**, et
 * seul un reroll l'avance.
 *
 * ⚠️ Extrait de `app/(tabs)/plan.tsx` le 2026-08-02 parce que la règle y était FAUSSE
 * et invisible. Toute génération non-reroll y remettait le seed à 0 — or l'auto-refresh
 * de l'écran Plan en déclenche une dès qu'un réglage change. L'utilisateur qui avait
 * régénéré jusqu'à obtenir une semaine qui lui plaisait la perdait au réglage suivant :
 * 92 % de la semaine détruite EN PLUS de ce que le réglage changeait légitimement, et
 * dans les cas où le réglage ne touchait rien (un aliment évité absent de son plan), il
 * retombait sur le plan canonique EXACT qu'il venait de rejeter. Mesuré par
 * `npm run mesure:reglages`.
 *
 * Une fonction pure plutôt que trois lignes dans le composant : c'est la seule façon
 * d'en faire une règle qu'un test tient fermée.
 */
export function nextPlanSeed(stored: string | null, reroll: boolean): number {
  const n = stored === null ? 0 : parseInt(stored, 10);
  const courant = Number.isFinite(n) && n >= 0 ? n : 0;
  return courant + (reroll ? 1 : 0);
}

/**
 * Empreinte des réglages qui INFLUENCENT le plan. Si elle change, le plan est
 * périmé et doit être régénéré (cf. auto-refresh dans l'écran Plan).
 */
// Version du moteur de génération : à incrémenter quand le scoring/sélection
// change, pour que les plans EN CACHE se régénèrent automatiquement (la signature
// change → l'auto-refresh de l'écran Plan rejoue la génération). v2 = lipides cadrés.
const ENGINE_VERSION = 41; // v41 = vague B8 : 8 collations vegan + sans gluten (col95–col102), familles neuves — les plans en cache ne les verraient pas ; v40 = vague B7 : 30 recettes végétales ajoutées — 12 petits-déjeuners (pd111–pd122), 10 repas complets (rep271–rep280), 8 collations (col87–col94) ; les plans en cache ne les verraient pas ; v39 = la pénalité de FAMILLE s'applique aussi au plan canonique (`FAMILY_SELECT_W_CANON`) — le 1er plan servi passe de 45,0 à 23,3 % de semaines avec quasi-doublon ; un plan en cache servirait encore l'ancienne composition ; v38 = rotation par FAMILLE (`FAMILY_FIBER_TOL`) — la composition de la semaine change, un plan en cache servirait l'ancienne rotation ; v37 = lot B6, 7 collations vegan ajoutées (col80–col86) — les plans en cache ne les verraient pas ; v36 = plancher protéique par repas (`PROT_SHARE_FLOOR`) — la répartition intra-journée change, les plans en cache serviraient l’ancienne ; v35 = lot B5, 20 collations réécrites (composition changée sous le même id → les plans en cache serviraient l’ancienne recette) ; v34 = lot B4, 32 recettes à l’enveloppe corrigée (rep251–rep270, pd99–pd110) — les plans en cache ne les verraient pas ; v33 = lot B3, 20 petits-déjeuners (pd79–pd98) — tous les lots commandés sont livrés ; v32 = lot B1-lot4, 20 repas complets — la vague B1 est complète (rep171–rep250) ; v31 = lot B1-lot3, 20 repas complets ; v30 = lot B1-lot2, 20 repas complets ; v29 = lot B1-lot1, 20 repas complets (les plans en cache ne les verraient pas) ; v28 = cible lipidique visée 15 % au-dessus du plancher (A9) — les plans en cache serviraient l'ancienne répartition ; v27 = lot B2, 13 collations légères (les plans en cache ne les verraient pas) ; v26 = banque de calories (les plans en cache ignoraient les écarts déclarés) ; v25 = borne basse de l'ancre protéine 1,0 → 0,5 (les plans en cache servaient l'ancien plancher) ; v24 = 9 recettes différenciées (nettoyage des doublons : composition modifiée) ; v23 = ancre protéine rendue à 8 recettes ; v22 = le temps de prépa ne filtre plus ; v21 = yaourt_grec démappé

export function profileSignature(p: UserProfile): string {
  // NB : `hidden_recipes` (👎) est VOLONTAIREMENT absent. Un 👎 remplace UN repas
  // (swap ciblé), il ne doit pas périmer tout le plan → on ne le met pas dans la
  // signature. Les futures générations l'excluent quand même (cf. poolForWithFlag).
  // `disliked_foods`, lui, EST inclus : un ingrédient évité est une vraie préférence
  // → le plan se régénère (et ré-affiche les plats sans cet ingrédient).
  return JSON.stringify({
    ev: ENGINE_VERSION,
    k: p.target_kcal, pr: p.target_protein_g, c: p.target_carbs_g, f: p.target_fat_g,
    d: p.plan_days, m: p.meals, e: p.meal_emphasis, v: p.variety,
    rw: p.rest_weekdays ?? null, td: p.training_days_per_week, pw: p.plan_weekdays,
    r: p.dietary_restrictions, dl: p.disliked_foods, pp: p.preferred_proteins,
    // `max_prep_time_min` retiré de la signature le 2026-07-29 : il ne filtre plus rien,
    // le garder ferait régénérer un plan identique à chaque changement de la valeur.
    fm: p.fixed_meals ?? null,
    // Banque de calories : elle déplace des kcal entre les jours → le plan en cache
    // ne correspond plus dès qu'elle change. Sans ça, déclarer « resto samedi »
    // n'aurait aucun effet visible tant que rien d'autre ne périme le plan.
    cb: p.calorie_bank ?? null,
  });
}

// Resserre le TOTAL du jour sur le budget : ré-adapte les MÊMES recettes déjà
// choisies (variété préservée — on ne change pas de plat), en redistribuant le
// reliquat des repas SATURÉS vers ceux qui ont encore de la marge. Water-filling
// par itérations pondérées aux kcal COURANTES : un repas qui ne bouge plus (capé)
// pèse moins au tour suivant → son reliquat coule vers les autres. No-op si déjà
// dans la cible (cas du plan canonique seed 0). Borné à 4 itérations.
// Plancher protéique d'un repas, en fraction de sa part ÉQUITABLE du jour.
// Sans lui, la cible protéique se calcule sur le RESTANT : chaque repas qui dépasse
// sa part rogne celle des suivants, et le dernier servi (la collation) encaisse toute
// la dérive. Mesuré avant correctif sur `F 70 masse` : part équitable 12,7 g, cible
// réellement servie à la collation **5,4 g** — une densité de 1,7 g pour 100 kcal
// qu'aucune collation du catalogue ne peut viser. Le moteur demandait alors 47 g de
// glucides pour 311 kcal, la recette débordait, et `over_target_kcal` se levait :
// 35 collations sur 79 étaient jugées « trop grosses » pour une cible de 311 kcal.
// APRÈS : cible 308 kcal · 9 g P, 23 « trop grosses », vivier 25 → 36 sur 79.
// Le plancher est borné par les kcal du repas (jamais plus de 100 % de protéines).
//
// ⚠️ **0,7 est un point MESURÉ, pas un réglage esthétique.** Balayé de 0 à 1 sur les
// 12 profils : le vivier total monte encore à 0,85 (3 925 contre 3 889), mais au prix
// du créneau le plus rare du catalogue — les repas complets de `H 110 masse` tombent
// de 74 à 65. Au-delà, la cible ignore le budget restant : à 1,0 les protéines servies
// dépassent la cible de 6,2 % (contre 2,6 % ici) sans rien gagner d'utile.
// Effet mesuré à 0,7 : `carbs_below_target` **15 → 0** sur 1 344 repas servis,
// précision calorique du jour 0,07 % → 0,05 %, protéines +2,35 % → +2,56 %.
const PROT_SHARE_FLOOR = 0.7;
const TIGHTEN_TOL_KCAL = 25;
// Lissage hebdo : déviation kcal max autorisée pour UN jour autour de la cible
// quotidienne (le reliquat est rattrapé sur les jours suivants → cible hebdo tenue).
const DAILY_SMOOTH_CAP = 50;
/**
 * ⚠️ `protFloors` n'est PAS optionnel, et son absence était un trou dans D16.
 *
 * Le plancher protéique par repas (`PROT_SHARE_FLOOR`) est appliqué à la SÉLECTION,
 * puis cette passe de resserrage ré-adaptait chaque repas en rappelant `mealTarget`
 * **sans le plancher** — le paramètre étant optionnel, il retombait silencieusement à 0.
 * Le garde-fou disparaissait donc exactement dans le cas qu'il existe pour couvrir :
 * un jour dont le total dérive, c'est-à-dire un jour où les premiers repas ont mangé
 * le budget des suivants. Mesuré le 2026-08-03 sur `F 70 masse` : cible protéique
 * demandée à la collation **5,0 g** pour une part équitable de 12,5 g — la valeur
 * d'AVANT le correctif D16, réapparue par la petite porte.
 * Découvert parce que la vague B7 a changé les recettes servies et fait déborder un
 * jour qui ne débordait pas : le défaut était là depuis D16, dormant.
 */
function tightenDay(dayMeals: Meal[], budgetKcal: number, budgetProtein: number, ratio: { carb: number; fat: number }, protFloors: Partial<Record<MealType, number>>): void {
  if (dayMeals.length === 0) return;
  const distBefore = Math.abs(budgetKcal - dayMeals.reduce((s, m) => s + m.macros.kcal, 0));
  if (distBefore <= TIGHTEN_TOL_KCAL) return; // déjà dans la cible (plan canonique)

  // Sauvegarde pour pouvoir ANNULER : le scaling par ingrédient est discret
  // (arrondis), donc une ré-adaptation peut, sur certains repas, dégrader le total.
  const snap = dayMeals.map((m) => ({ macros: m.macros, ai: m.adapted_ingredients, fl: m.adapt_flags, gap: m.adapt_gap }));

  for (let iter = 0; iter < 4; iter++) {
    const sumK = dayMeals.reduce((s, m) => s + m.macros.kcal, 0);
    if (Math.abs(budgetKcal - sumK) <= TIGHTEN_TOL_KCAL) break;
    let remK = budgetKcal, remP = budgetProtein, remW = sumK || 1;
    let moved = false;
    for (const m of dayMeals) {
      const w = m.macros.kcal; // poids = kcal courantes ; un repas saturé pèse moins au tour suivant
      const target = mealTarget(remK, remP, w, remW, ratio, protFloors[m.meal_type] ?? 0);
      const a = adaptRecipe(m.recipe, target);
      if (Math.abs(a.macros.kcal - m.macros.kcal) > 2) moved = true;
      m.macros = a.macros;
      m.adapted_ingredients = a.ingredients;
      m.adapt_flags = a.flags.length ? a.flags : undefined;
      m.adapt_gap = a.gap;
      remK -= a.macros.kcal; remP -= a.macros.protein_g; remW -= w;
    }
    if (!moved) break; // tout est capé → on ne peut pas faire mieux
  }

  // Garde-fou « jamais pire » : si le resserrage n'a pas rapproché le total, on annule.
  const distAfter = Math.abs(budgetKcal - dayMeals.reduce((s, m) => s + m.macros.kcal, 0));
  if (distAfter >= distBefore) {
    dayMeals.forEach((m, i) => { m.macros = snap[i].macros; m.adapted_ingredients = snap[i].ai; m.adapt_flags = snap[i].fl; m.adapt_gap = snap[i].gap; });
  }
}

/**
 * Cibles caloriques du plan APRÈS banque de calories — SOURCE UNIQUE.
 *
 * ⚠️ Existe parce que la banque était calculée UNIQUEMENT dans `buildLocalPlan`.
 * Tout le reste du produit lisait `profile.target_kcal`, la cible PLATE, et
 * effaçait donc la banque sans le dire. Mesuré (H 80 kg, « samedi +600 ») :
 *   plan généré      2005 2010 2015 1995 2010 [2690] 2005  → semaine 14 730 (juste)
 *   après recalage   2105 2105 2110 2100 2140 [2210] 2090  → semaine 14 860
 * Le samedi ne portait plus que +106 au lieu de +600, et les six jours de
 * compensation étaient remontés à la cible pleine. Deux chemins déclenchaient ça
 * en permanence, sans action volontaire de l'utilisateur : `resetTracking` (au
 * premier lancement d'un nouveau jour) et `rebalanceDay` (à chaque « j'ai mangé »
 * ou « sauté »). La feature ne fonctionnait donc qu'à l'instant de la génération.
 *
 * `days` vient du PLAN et non du profil quand un plan existe : les écarts sont
 * indexés sur les jours du plan (cf. `offsetsForPlan`), pas sur un réglage qui a
 * pu changer depuis.
 */
export function bankedTargets(profile: UserProfile, days: number): BankResult {
  return bankedDailyTargets({
    days,
    baseTargetKcal: profile.target_kcal,
    offsets: offsetsForPlan(profile.calorie_bank, profile.plan_weekdays, days),
    // Même bornage qu'à la génération : la banque ne contraint que la
    // COMPENSATION (vers le bas), elle ne relève jamais la cible.
    floorKcal: Math.min(bankFloorKcal(profile), profile.target_kcal),
  });
}

/** Cible calorique d'UN jour du plan (1-based), banque comprise. */
export function dayTargetKcal(profile: UserProfile, days: number, day: number): number {
  return bankedTargets(profile, days).targets[day - 1] ?? profile.target_kcal;
}

/** Construit le Meal VERROUILLÉ d'un repas fixe (géré par l'user) pour un jour donné. */
function fixedMealToMeal(fm: FixedMeal, day: number, mealType: MealType, isRest: boolean): Meal {
  const recipe: Recipe = {
    id: `fixed-${mealType}`,
    name_fr: fm.label,
    prep_time_min: 0,
    portions: 1,
    macros_per_portion: fm.macros,
    ingredients: fm.ingredients ?? [],
    steps: [],
    tags: [mealType],
    validated_by_dietitian: false,
  };
  return {
    id: `${day}-${mealType}`,
    day,
    meal_type: mealType,
    recipe,
    portions: 1,
    macros: fm.macros,
    adapted_ingredients: fm.ingredients?.length ? fm.ingredients : undefined,
    rest_day: isRest || undefined,
    fixed: true,
  };
}

export function buildLocalPlan(profile: UserProfile, seed: number = 0): MealPlan {
  const days = Math.min(Math.max(profile.plan_days, 1), 7);

  // Repas choisis par l'utilisateur (réordonnés), avec repli sur 4 repas pour
  // les profils créés avant cette option.
  const selected = Array.isArray(profile.meals) && profile.meals.length > 0
    ? profile.meals
    : (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]);
  const allMealTypes = MEAL_ORDER.filter((m) => selected.includes(m));

  // Repas fixes (gérés par l'user) vs repas planifiés par Kyroz : les fixes sont
  // injectés tels quels et leur budget soustrait ; seuls les `plannedTypes` sont générés.
  const fixedMeals = profile.fixed_meals ?? {};
  const fixedTypes = allMealTypes.filter((mt) => fixedMeals[mt]);
  const plannedTypes = allMealTypes.filter((mt) => !fixedMeals[mt]);

  // Garde : l'emphase doit porter sur un repas réellement PLANIFIÉ (un repas fixe
  // n'est pas mis à l'échelle), sinon elle serait sans effet → repli « équilibré ».
  const rawEmphasis = profile.meal_emphasis ?? 'even';
  const emphasis = rawEmphasis !== 'even' && !plannedTypes.includes(rawEmphasis as MealType) ? 'even' : rawEmphasis;
  const distribution = computeDistribution(plannedTypes, emphasis);

  const variety = profile.variety ?? 'balanced';
  const fiberStrong = isFiberFocusGoal(profile.goal); // sèche → fibres prioritaires

  // Soft-matching objectif/sport + ratio carb:fat du profil (le moteur = seul cerveau).
  const objectives = goalToObjectives(profile.goal);
  const sportBuckets = sportsToBuckets(profile.sports);
  const ratio = carbFatRatio(profile);
  // Sens de l'objectif → asymétrie de fit (A2) : éviter le débordement en sèche,
  // le manque en prise de masse. Calculé une fois pour tout le plan.
  const goalDir = goalDirection(profile);
  // Jours de repos → carb-cycling + recettes « jour off ». Choisis par l'user
  // (rest_weekdays) sinon déduits auto du nb de jours d'entraînement.
  const restDays = restDaysForProfile(profile, days);

  // BANQUE DE CALORIES (Kyroz+) : un écart déclaré sur un jour (« resto samedi »)
  // est repris sur les AUTRES jours du plan → la SEMAINE garde son total.
  // Sans banque, `targets` vaut la cible normale partout : comportement inchangé.
  // Le plancher de compensation est le plancher PERSONNALISÉ, pas le filet absolu
  // MIN_KCAL — c'est le seul mécanisme qui pousse un jour vers le bas (cf. §6).
  // ⚠️ Le plancher passé à la banque est borné à la cible du profil, et ce n'est
  // pas une précaution cosmétique (cf. `bankedTargets`) : `profile.target_kcal` est
  // DÉJÀ passé par `floorAndFlags`. Le repasser sans borne fait REMONTER la cible de
  // tous les jours dès que le plancher recalculé dépasse la cible enregistrée —
  // mesuré à +305 kcal/jour sur un profil en sèche SANS banque, ce qui cassait
  // l'asymétrie A2.
  const bank = bankedTargets(profile, days);

  const pools: Record<string, Recipe[]> = {};
  const relaxed: Record<string, boolean> = {};
  for (const mt of plannedTypes) {
    const pf = poolForWithFlag(mt, profile);
    pools[mt] = pf.pool;
    relaxed[mt] = pf.relaxed;
  }

  // Recettes correspondant aux protéines préférées (départage à macro égale).
  const preferredIds = preferredRecipeIds(profile);

  // Somme des poids des repas planifiés (= 1 sur les distributions, mais robuste).
  const totalWeight = plannedTypes.reduce((s, mt) => s + distribution[mt], 0) || 1;
  // Budget consommé par les repas fixes (identiques chaque jour) → retiré de la cible.
  const fixedDailyKcal = fixedTypes.reduce((s, mt) => s + fixedMeals[mt]!.macros.kcal, 0);
  const fixedDailyProtein = fixedTypes.reduce((s, mt) => s + fixedMeals[mt]!.macros.protein_g, 0);

  const meals: Meal[] = [];
  // Compteur d'utilisation sur la semaine pour étaler les recettes (variété).
  const usage: Record<string, number> = {};
  // Idem au niveau FAMILLE (couple protéine × féculent) : empêche deux quasi-doublons
  // dans la même semaine, ce que `usage` — qui ne connaît que les ids — laisse passer.
  // La table est construite UNE fois par plan (et non par repas) : le calcul de clé est
  // du tri de chaînes sur 466 recettes, il n'a rien à faire dans la boucle des 28 repas.
  const familyUsage: Record<string, number> = {};
  const families = new Map<string, string>();
  for (const mt of allMealTypes) for (const r of pools[mt] ?? []) if (!families.has(r.id)) families.set(r.id, familyKey(r));
  // Reliquat calorique reporté de jour en jour → la semaine converge vers days×cible.
  let weekDeficitKcal = 0;

  for (let d = 1; d <= days; d++) {
    // Budgets kcal/protéines du jour : reportés de repas en repas → auto-
    // correction du total (compense l'arrondi de la grille de portions ; le
    // dernier repas absorbe le reliquat et resserre le total du jour). Grâce au
    // « deadband » kcal, un budget protéines vidé par des recettes trop riches
    // ne peut jamais affamer les kcal des repas suivants.
    // Lissage hebdo des CALORIES : cible du jour = cible quotidienne + une part du
    // reliquat accumulé (jours précédents sous/au-dessus), bornée à ±DAILY_SMOOTH_CAP
    // → un jour bridé est rattrapé par les suivants, la SEMAINE tombe sur days×cible.
    // Les PROTÉINES ne se lissent PAS (plancher quotidien). Garde-fou §6 : jamais < MIN.
    // `cibleDuJour` = la cible du jour APRÈS banque de calories (= target_kcal
    // partout s'il n'y a pas de banque). Le lissage ci-dessous corrige la dérive
    // d'ARRONDI autour d'elle ; il ne doit pas la combattre — d'où le fait que le
    // reliquat se mesure contre elle, et non contre la cible plate (plus bas).
    const cibleDuJour = bank.targets[d - 1] ?? profile.target_kcal;
    const remainingDays = days - d + 1;
    const smooth = Math.max(-DAILY_SMOOTH_CAP, Math.min(DAILY_SMOOTH_CAP, weekDeficitKcal / remainingDays));
    const dayCibleKcal = Math.max(cibleDuJour + smooth, MIN_KCAL[profile.sex]);

    // Budget du jour APRÈS retrait des repas fixes (gérés par l'user).
    let remainingKcal = Math.max(dayCibleKcal - fixedDailyKcal, 0);
    let remainingProtein = Math.max(profile.target_protein_g - fixedDailyProtein, 0);
    let remainingWeight = totalWeight;
    // Jour de repos → glucides ↓ / lipides ↑ (mêmes kcal + protéines).
    const isRest = restDays.has(d);
    const dayRatio = isRest ? restDayRatio(ratio) : ratio;

    // Parcours dans l'ordre canonique : les repas fixes sont injectés verrouillés,
    // les autres planifiés sur le budget restant (report de budget de repas en repas).
    const dayMeals: Meal[] = [];
    for (const mealType of allMealTypes) {
      const fm = fixedMeals[mealType];
      if (fm) {
        dayMeals.push(fixedMealToMeal(fm, d, mealType, isRest));
        continue;
      }
      const weight = distribution[mealType];

      // Cible du repas (EN GRAMMES) = part du budget restant (kcal + protéines) au
      // prorata du poids ; glucides/lipides déduits via le ratio du jour. Report
      // de budget → le total du jour reste serré malgré les arrondis/bornes.
      const target = mealTarget(
        remainingKcal, remainingProtein, weight, remainingWeight, dayRatio,
        PROT_SHARE_FLOOR * profile.target_protein_g * (weight / totalWeight),
      );

      const choice = selectMealAdapted(
        pools[mealType], target, usage, familyUsage, families, variety, preferredIds, objectives, sportBuckets,
        seed, fiberStrong, goalDir,
      );

      usage[choice.recipe.id] = (usage[choice.recipe.id] ?? 0) + 1;
      const fam = families.get(choice.recipe.id);
      if (fam) familyUsage[fam] = (familyUsage[fam] ?? 0) + 1;
      remainingKcal -= choice.macros.kcal;
      remainingProtein -= choice.macros.protein_g;
      remainingWeight -= weight;

      dayMeals.push({
        id: `${d}-${mealType}`,
        day: d,
        meal_type: mealType,
        recipe: choice.recipe,
        portions: 1,
        macros: choice.macros,
        adapted_ingredients: choice.ingredients,
        adapt_flags: choice.flags.length ? choice.flags : undefined,
        adapt_gap: choice.gap,
        restriction_relaxed: relaxed[mealType] || undefined,
        rest_day: isRest || undefined,
      });
    }

    // Resserrage final du total du jour (water-filling sur les repas PLANIFIÉS, pas
    // les fixes) : surtout utile en reroll / pool contraint où la variété fait
    // déborder/manquer le total. No-op si déjà dans la cible.
    tightenDay(
      dayMeals.filter((m) => !m.fixed),
      Math.max(dayCibleKcal - fixedDailyKcal, 0),
      Math.max(profile.target_protein_g - fixedDailyProtein, 0),
      dayRatio,
      // Le MÊME plancher qu'à la sélection, par créneau — sinon le resserrage le perd.
      Object.fromEntries(allMealTypes.map((t) => [
        t, PROT_SHARE_FLOOR * profile.target_protein_g * (distribution[t] / totalWeight),
      ])) as Partial<Record<MealType, number>>,
    );
    meals.push(...dayMeals);

    // Reliquat reporté sur la semaine : (cible DU JOUR − total réel du jour).
    // Jour qui manque (pool bridé) → déficit positif → jours suivants visent un peu
    // plus haut (borné ±DAILY_SMOOTH_CAP) ; s'auto-annule dès qu'un jour rattrape.
    // ⚠️ Mesuré contre `cibleDuJour` et NON contre `profile.target_kcal` : sinon un
    // jour de banque à +600 se lirait comme « 600 kcal de trop » et le lissage
    // passerait la semaine à les reprendre — en doublon de la compensation déjà
    // faite par la banque, qui les a reprises une première fois.
    const dayActualKcal = dayMeals.reduce((s, m) => s + m.macros.kcal, 0);
    weekDeficitKcal += cibleDuJour - dayActualKcal;
  }

  return {
    id: `plan-${Date.now()}`,
    user_id: profile.id,
    week_start_date: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    days,
    meals,
    total_macros_per_day: computeDailyTotals(meals, days),
    profile_sig: profileSignature(profile),
  };
}

/**
 * Remplace UN seul repas du plan par une alternative du même type, calée sur les
 * mêmes macros (kcal/protéines) que le repas actuel, sans toucher au reste du
 * plan. On choisit au hasard parmi les meilleures alternatives → effet « autre
 * chose » à chaque appui, sans dégrader l'équilibre du jour.
 *
 * Le pool exclut déjà les recettes masquées (👎, via poolFor) ; `favoriteIds`
 * permet en plus de PRIVILÉGIER les recettes aimées (👍) à fit comparable —
 * c'est le « changer de recette → l'algo propose en fonction de tes goûts ».
 */
export function swapMeal(profile: UserProfile, plan: MealPlan, meal: Meal, favoriteIds?: Iterable<string>): MealPlan {
  if (meal.fixed) return plan; // un repas géré par l'user ne se swappe pas
  const pool = poolFor(meal.meal_type, profile).filter((r) => r.id !== meal.recipe.id);
  if (pool.length === 0) return plan; // aucune alternative possible

  // Cible = les macros actuelles du repas (en grammes) → l'alternative est adaptée
  // pour rester dans le même budget kcal/protéines/glucides/lipides.
  const target: AdaptTarget = {
    kcalMeal: meal.macros.kcal,
    proteinMeal: meal.macros.protein_g,
    carbMeal: meal.macros.carbs_g,
    fatMeal: meal.macros.fat_g,
  };

  const goalDir = goalDirection(profile);
  const ranked = pool
    .map((r) => { const a = adaptRecipe(r, target); return { r, a, score: fitScore(a.macros, target, a.flags, goalDir) }; })
    .sort((x, y) => x.score - y.score);

  const top = ranked.slice(0, Math.min(VARIANT_MIN, ranked.length));
  // Biais favoris : si certaines des meilleures alternatives sont des 👍, on tire
  // parmi celles-là — le fit macro reste garanti (elles SONT dans le top), on ne
  // fait que pencher vers ce que l'user aime. Sinon, tirage normal dans le top.
  const favs = favoriteIds ? new Set(favoriteIds) : null;
  const likedTop = favs ? top.filter((c) => favs.has(c.r.id)) : [];
  const choices = likedTop.length > 0 ? likedTop : top;
  const pick = choices[Math.floor(Math.random() * choices.length)];

  const newMeal: Meal = {
    ...meal,
    recipe: pick.r,
    portions: 1,
    macros: pick.a.macros,
    adapted_ingredients: pick.a.ingredients,
    adapt_flags: pick.a.flags.length ? pick.a.flags : undefined,
    adapt_gap: pick.a.gap,
  };
  const meals = plan.meals.map((m) => (m.id === meal.id ? newMeal : m));
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
}

/**
 * Ré-applique une recette (override perso) à UN repas en CONSERVANT son budget
 * macro. Repas adapté (scaling par ingrédient) → on ré-adapte la nouvelle recette
 * à ses macros courantes (comme swapMeal) : ingrédients + macros redeviennent
 * cohérents avec la recette affichée immédiatement, sans attendre le recalage
 * (sinon courses/frigo/fibres, qui lisent `adapted_ingredients`, garderaient les
 * quantités de l'ANCIENNE recette). Repli legacy (plan en cache d'avant la refonte,
 * sans ingrédients adaptés) → on scale les macros de base × portions.
 */
export function reAdaptMealRecipe(meal: Meal, recipe: Recipe): Meal {
  if (meal.adapted_ingredients) {
    const target: AdaptTarget = {
      kcalMeal: meal.macros.kcal,
      proteinMeal: meal.macros.protein_g,
      carbMeal: meal.macros.carbs_g,
      fatMeal: meal.macros.fat_g,
    };
    const a = adaptRecipe(recipe, target);
    return {
      ...meal,
      recipe,
      portions: 1,
      macros: a.macros,
      adapted_ingredients: a.ingredients,
      adapt_flags: a.flags.length ? a.flags : undefined,
      adapt_gap: a.gap,
    };
  }
  const f = meal.portions ?? 1;
  return {
    ...meal,
    recipe,
    macros: {
      kcal: Math.round(recipe.macros_per_portion.kcal * f),
      protein_g: Math.round(recipe.macros_per_portion.protein_g * f),
      carbs_g: Math.round(recipe.macros_per_portion.carbs_g * f),
      fat_g: Math.round(recipe.macros_per_portion.fat_g * f),
    },
  };
}

/**
 * « Recaler ma journée » — le cœur du re-plan instantané.
 *
 * Quand un repas est sauté, mangé, ou qu'un écart hors plan est déclaré, on
 * recalcule les PORTIONS des repas encore « planned » de ce jour pour que le
 * total du jour retombe sur la cible (kcal + protéines + lipides), en tenant
 * compte de ce qui a déjà été consommé (repas verrouillés + extras hors plan).
 *
 * On garde la MÊME recette pour chaque repas restant (on ne fait que réajuster
 * la portion) : le recalage doit être prévisible — « ton dîner grossit/réduit »,
 * pas « ton dîner a changé de plat ». Pour changer de plat, l'utilisateur a déjà
 * « Remplacer ce repas » (swapMeal).
 *
 * Budget reporté de repas en repas (comme buildLocalPlan) → total serré malgré
 * l'arrondi de la grille de portions. Si on a déjà dépassé la cible (gros écart),
 * les repas restants tombent à la portion minimale (la fonction de score choisit
 * naturellement la plus petite portion quand la cible restante est ~0).
 */
/**
 * Cœur paramétrable du recalage. Ajuste les PORTIONS des repas dont l'id est dans
 * `adjustIds` pour faire retomber le total du jour sur la cible, en tenant compte :
 *  - du consommé verrouillé (repas mangés + extras hors plan) ;
 *  - des repas planifiés MAIS NON ajustables (ex. « on ne touche qu'au dîner ») →
 *    comptés au consommé à leurs macros actuelles (ils ne bougent pas) ;
 *  - des repas de `skipIds` → passés en `skipped` (ne comptent pas, budget reporté).
 * La cible protéines reste pleine : les repas ajustés se densifient en protéines.
 */
function rebalanceCore(
  profile: UserProfile, plan: MealPlan, day: number,
  adjustIds: Set<string>, skipIds: Set<string>,
): MealPlan {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  if (dayMeals.length === 0) return plan;

  const types = MEAL_ORDER.filter((mt) => dayMeals.some((m) => m.meal_type === mt));
  const rawEmphasis = profile.meal_emphasis ?? 'even';
  const emphasis = rawEmphasis !== 'even' && !types.includes(rawEmphasis as MealType) ? 'even' : rawEmphasis;
  const dist = computeDistribution(types, emphasis);

  const isAdjustable = (m: Meal) => adjustIds.has(m.id) && (m.status ?? 'planned') === 'planned' && !skipIds.has(m.id);

  // Consommé = mangés + extras + planifiés-mais-figés (non ajustables, non sautés).
  // On suit kcal + protéines : les glucides/lipides restants sont DÉDUITS du budget
  // kcal restant (via le ratio), ce qui absorbe un écart hors-plan exprimé en kcal.
  const consumed = { kcal: 0, protein: 0 };
  for (const m of dayMeals) {
    if (isAdjustable(m) || skipIds.has(m.id) || m.status === 'skipped') continue;
    const em = m.status === 'eaten' ? (m.locked_macros ?? m.macros) : m.macros;
    consumed.kcal += em.kcal; consumed.protein += em.protein_g;
  }
  const extra = plan.day_extras?.[day];
  if (extra) { consumed.kcal += extra.kcal; consumed.protein += extra.protein_g; }

  // Cible du jour = celle de la BANQUE (= `profile.target_kcal` s'il n'y a pas de
  // banque). Lire la cible plate ici effaçait l'écart déclaré à chaque recalage —
  // c'est-à-dire à chaque « j'ai mangé » et à chaque nouveau jour (cf. bankedTargets).
  // Les PROTÉINES, elles, gardent leur cible pleine : la banque ne les touche jamais.
  const dayKcalTarget = dayTargetKcal(profile, plan.days, day);
  let remKcal = Math.max(dayKcalTarget - consumed.kcal, 0);
  let remProt = Math.max(profile.target_protein_g - consumed.protein, 0);

  // Cohérence carb-cycling : si le jour est marqué « repos », on recale avec le
  // même ratio glucides/lipides décalé qu'à la génération.
  const isRestDay = dayMeals.some((m) => m.rest_day === true);
  const ratio = isRestDay ? restDayRatio(carbFatRatio(profile)) : carbFatRatio(profile);
  const adjustMeals = dayMeals.filter(isAdjustable);
  let remWeight = adjustMeals.reduce((s, m) => s + dist[m.meal_type], 0) || 1;

  const updates = new Map<string, Meal>();
  for (const mt of MEAL_ORDER) {
    const meal = adjustMeals.find((m) => m.meal_type === mt);
    if (!meal) continue;
    const weight = dist[mt];
    // Même cible/scaling que buildLocalPlan → recalage = re-adaptation de la MÊME
    // recette vers la cible restante (kcal/prot pleins, gluc/lip via ratio).
    const target = mealTarget(remKcal, remProt, weight, remWeight, ratio);
    const a = adaptRecipe(meal.recipe, target);
    updates.set(meal.id, {
      ...meal, portions: 1, macros: a.macros,
      adapted_ingredients: a.ingredients, adapt_flags: a.flags.length ? a.flags : undefined, adapt_gap: a.gap,
    });
    remKcal -= a.macros.kcal;
    remProt -= a.macros.protein_g;
    remWeight -= weight;
  }

  const meals = plan.meals.map((m) => {
    if (updates.has(m.id)) return updates.get(m.id)!;
    if (skipIds.has(m.id)) return { ...m, status: 'skipped' as MealStatus };
    return m;
  });
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
}

export function rebalanceDay(profile: UserProfile, plan: MealPlan, day: number): MealPlan {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  // Comportement historique : ajuste TOUS les repas encore planifiés du jour.
  // Les repas fixes (gérés par l'user) ne sont JAMAIS recalés → exclus.
  const adjustIds = new Set(dayMeals.filter((m) => !m.fixed && (m.status ?? 'planned') === 'planned').map((m) => m.id));
  return rebalanceCore(profile, plan, day, adjustIds, new Set());
}

// ── Adaptation à OPTIONS après un écart hors plan (morceau 4) ────────────────
/**
 * « Dans la cible » — tolérance d'AFFICHAGE, en kcal, SOURCE UNIQUE.
 *
 * Vaut pour la barre du jour (`MacroBar`) comme pour les options d'adaptation :
 * les deux se suivent à l'écran, et un seuil différent de chaque côté ferait dire
 * à l'un « on n'y arrive pas » pendant que l'autre affiche « ✓ dans la cible ».
 * 100 kcal, c'est l'ordre de grandeur de l'imprécision des tables alimentaires —
 * annoncer un reliquat de 6 kcal comme un échec serait une alarme pour du bruit,
 * et la règle produit est claire : le pire cas reste neutre, jamais anxiogène.
 */
export const ON_TARGET_TOLERANCE_KCAL = 100;

export type AdaptOption = {
  key: 'spread' | 'skip_snack' | 'focus_dinner';
  label: string;
  detail: string;
  plan: MealPlan;
  dayKcal: number;   // total du jour résultant (preview)
  /**
   * Ce que cette option REPREND réellement (kcal), vs ne rien adapter du tout.
   * Positif = le plan a rétréci d'autant.
   */
  absorbedKcal: number;
  /**
   * Ce qui RESTE au-dessus de la cible du jour après adaptation. 0 = rentré dans
   * la cible.
   *
   * ⚠️ Existe parce que l'écran promettait « rentrer dans ta cible » sans jamais
   * vérifier qu'il y arrivait. Mesuré le 2026-07-31, écart déclaré le matin, à la
   * meilleure option : `F 55 kg (cible 1342) : +200→+18 · +300→+63 · +600→+318 ·
   * +800→+518` contre `H 80 kg (cible 2104) : +200→+6 · +300→+21 · +600→+41`.
   * Chez l'homme le recalage absorbe vraiment ; chez un petit gabarit il sature
   * vite — physiquement normal, on ne peut pas dé-manger. Ce qui n'allait pas,
   * c'est que l'écran n'en disait rien.
   */
  overTargetKcal: number;
};

/**
 * Propose plusieurs façons d'absorber un écart, selon les repas ENCORE À VENIR
 * (heure + statut, cf. mealtime). Chaque option renvoie un plan prêt à appliquer.
 * Vide si plus aucun repas à venir (rien à adapter).
 */
export function adaptDayOptions(
  profile: UserProfile, plan: MealPlan, day: number, nowHour: number,
): AdaptOption[] {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  // Repas fixes exclus : ils ne se recalent pas (l'user les gère).
  const upcoming = remainingMeals(dayMeals, nowHour).filter((m) => !m.fixed);
  if (upcoming.length === 0) return [];

  const allIds = new Set(upcoming.map((m) => m.id));
  // Recalculé depuis les repas + les écarts, PAS lu dans `total_macros_per_day` :
  // ce tableau est un cache, et un appelant qui oublie de le rafraîchir après avoir
  // posé un écart faisait lire une journée d'avant l'écart — donc « reprend 0 kcal »
  // sur toutes les options. Le contrat implicite est remplacé par un calcul.
  const dayKcalOf = (p: MealPlan) =>
    Math.round(computeDailyTotals(p.meals, p.days, p.day_extras)[day - 1]?.kcal ?? 0);
  // Référence : ce que ferait la journée si on n'adaptait RIEN. C'est par rapport à
  // elle qu'une option « reprend » des calories — et par rapport à la cible du jour
  // (banque comprise) qu'il en reste, ou non, au-dessus.
  const sansRienFaire = dayKcalOf(plan);
  const cibleDuJour = dayTargetKcal(profile, plan.days, day);
  const chiffrer = (p: MealPlan): Pick<AdaptOption, 'dayKcal' | 'absorbedKcal' | 'overTargetKcal'> => {
    const dayKcal = dayKcalOf(p);
    return {
      dayKcal,
      absorbedKcal: Math.max(0, sansRienFaire - dayKcal),
      overTargetKcal: Math.max(0, dayKcal - cibleDuJour),
    };
  };
  const options: AdaptOption[] = [];

  // 1. Répartir sur tous les repas restants.
  const spread = rebalanceCore(profile, plan, day, allIds, new Set());
  options.push({
    key: 'spread',
    label: 'Répartir sur mes repas restants',
    detail: upcoming.map((m) => MEAL_LABEL[m.meal_type]).join(' + ') + ' ajustés',
    plan: spread, ...chiffrer(spread),
  });

  // 2. Sauter la collation → les autres restants prennent le relais (protéines pleines).
  const snack = upcoming.find((m) => m.meal_type === 'snack');
  if (snack && upcoming.length >= 2) {
    const rest = new Set(upcoming.filter((m) => m.id !== snack.id).map((m) => m.id));
    const skipped = rebalanceCore(profile, plan, day, rest, new Set([snack.id]));
    options.push({
      key: 'skip_snack',
      label: 'Sauter la collation',
      detail: 'le reste se densifie en protéines',
      plan: skipped, ...chiffrer(skipped),
    });
  }

  // 3. Ajuster surtout le dîner → les autres repas restants ne bougent pas.
  const dinner = upcoming.find((m) => m.meal_type === 'dinner');
  if (dinner && upcoming.length >= 2) {
    const focused = rebalanceCore(profile, plan, day, new Set([dinner.id]), new Set());
    options.push({
      key: 'focus_dinner',
      label: 'Ajuster surtout le dîner',
      detail: 'tes autres repas ne bougent pas',
      plan: focused, ...chiffrer(focused),
    });
  }

  return options;
}

/**
 * Remet le suivi du plan à zéro (nouvelle journée) : efface les statuts
 * mangé/sauté et les écarts hors plan, puis restaure les portions CANONIQUES en
 * recalant chaque jour sur la cible pleine. Les recettes (y compris les
 * remplacements faits par l'utilisateur) sont conservées — on ne touche qu'aux
 * portions. Idempotent : sur un plan déjà « propre », c'est un no-op.
 */
export function resetTracking(profile: UserProfile, plan: MealPlan): MealPlan {
  const meals = plan.meals.map((m) =>
    m.status || m.locked_macros ? { ...m, status: undefined, locked_macros: undefined } : m
  );
  let next: MealPlan = { ...plan, meals, day_extras: undefined, tracking_date: undefined };
  for (let d = 1; d <= plan.days; d++) next = rebalanceDay(profile, next, d);
  return next;
}

/**
 * Reporte le SUIVI d'un plan sur le plan qui le remplace.
 *
 * ⚠️ Corrige un défaut mesuré le 2026-08-02, et c'en est un de JUSTESSE, pas de
 * confort. `generate()` remplaçait le plan par un `buildLocalPlan` neuf — sans jamais
 * regarder l'ancien. Or l'auto-refresh de l'écran Plan le déclenche dès qu'un réglage
 * change, à n'importe quelle heure de la journée. Tout ce que l'utilisateur avait posé
 * disparaissait : repas marqués « mangé », portions réellement consommées
 * (`locked_macros`), écarts hors plan (`day_extras`), date de suivi. Mesuré sur le
 * panel de référence : **1 448 kcal déjà mangées oubliées en moyenne** (2 130 au pire),
 * après quoi l'app replanifiait une journée PLEINE par-dessus. Pour une app de sèche,
 * ce n'est pas une gêne — c'est un conseil faux.
 *
 * Ce qui est reporté, et pourquoi c'est asymétrique :
 *  - **mangé** → on garde le repas ENTIER de l'ancien plan. Ce qu'il a avalé est un
 *    FAIT : la recette, les portions et les macros consommées ne se re-planifient pas.
 *  - **sauté** → seul le statut est reporté. Le créneau est décidé, mais la recette
 *    qu'il n'aura pas mangée peut parfaitement changer avec ses nouveaux réglages.
 *  - `day_extras` et `tracking_date` suivent tels quels.
 *
 * Les jours touchés sont recalés (`rebalanceDay`) pour que les repas RESTANTS absorbent
 * le bon budget — sinon la journée compterait deux fois ce qui a déjà été mangé.
 *
 * Composé avec `resetTracking` : reporter une `tracking_date` de la veille est sans
 * danger, l'écran remet la journée à zéro au changement de date. Ici on ne décide pas
 * de la péremption, on évite juste la perte.
 */
export function carryTracking(profile: UserProfile, ancien: MealPlan | null | undefined, nouveau: MealPlan): MealPlan {
  if (!ancien?.tracking_date) return nouveau;
  // Les ids de repas sont `${jour}-${créneau}` : stables d'une génération à l'autre.
  const parId = new Map(ancien.meals.map((m) => [m.id, m]));
  const joursTouches = new Set<number>();
  const meals = nouveau.meals.map((m) => {
    const av = parId.get(m.id);
    if (!av?.status) return m;
    joursTouches.add(m.day);
    return av.status === 'eaten' ? av : { ...m, status: av.status };
  });
  for (const d of Object.keys(ancien.day_extras ?? {})) joursTouches.add(Number(d));
  if (joursTouches.size === 0) return nouveau;
  let next: MealPlan = {
    ...nouveau, meals,
    day_extras: ancien.day_extras,
    tracking_date: ancien.tracking_date,
  };
  for (const d of joursTouches) if (d >= 1 && d <= next.days) next = rebalanceDay(profile, next, d);
  return next;
}
