import { EngineNotice, Goal, NeatLevel, PlanFlag, Sex, SportSession, UserProfile } from './types';
import { exerciseKcalPerDay, totalSessionsPerWeek } from './sport';
import { datedGoalStatus, goalDirectionMismatch, MAX_DEFICIT_TDEE_RATIO } from './datedGoal';
import { todayStamp } from './weight';
import {
  BodyInput, MIN_AGE, MIN_KCAL, EA_OPTIMAL, LOW_EA_BUDGET_WEEKS, countsAsLowEaWeek,
  bodyFatBounds, clamp, collapseLowEaRegistry, deficitBlocked, energyAvailability,
  fatFreeMassKg, isFemaleAtRisk, lowEaWeeksBefore, markLowEaWeek, safetyFloorKcal,
  settleLowEaExposure, lowEaEscalation, LowEaEscalation, readLowEaRegistry,
} from './safety';

// ── Calculs nutritionnels ────────────────────────────────────────────────────
//
// Les GARDE-FOUS (plancher d'énergie, bornes, éligibilité) vivent dans lib/safety.ts :
// ici on calcule, là-bas on borne. Aucune cible calorique ne sort de ce fichier
// sans être passée par `safetyFloorKcal` — mode `manual` compris.

// Ré-exports de compatibilité : ces garde-fous ont déménagé dans safety.ts, mais
// le reste de l'app (planEngine, écrans, tests) les importe historiquement d'ici.
export { MIN_KCAL, MIN_AGE };

/** Masse maigre (kg) à partir du poids et du % de masse grasse, borné PAR SEXE. */
export function leanBodyMass(sex: Sex, weight_kg: number, bodyFatPct: number): number {
  const [lo, hi] = bodyFatBounds(sex);
  return weight_kg * (1 - clamp(bodyFatPct, lo, hi) / 100);
}

// BMR — Katch-McArdle si le % de masse grasse est connu (basé sur la masse maigre,
// donc bien plus précis quand deux personnes de même poids ont des compositions
// différentes), sinon Mifflin-St Jeor (différenciée par sexe).
export function calculateBMR(
  sex: Sex,
  weight_kg: number,
  height_cm: number,
  age: number,
  bodyFatPct?: number
): number {
  if (typeof bodyFatPct === 'number' && bodyFatPct > 0) {
    return Math.round(370 + 21.6 * leanBodyMass(sex, weight_kg, bodyFatPct));
  }
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

// ── NEAT : la vie quotidienne HORS sport ─────────────────────────────────────
//
// Facteur appliqué au BMR pour couvrir tout ce qui n'est pas une séance. Le sport
// est chiffré à part par les MET nets (cf. lib/sport.ts), donc la table s'arrête à
// 1,45 : les 1,50 / 1,65 des tables classiques sont des niveaux « exercice inclus »
// et recouvriraient une dépense déjà comptée.
export const NEAT_PAL: Record<NeatLevel, number> = {
  desk: 1.20,
  light: 1.28,
  active: 1.36,
  physical: 1.45,
};

/**
 * Défaut quand la question n'a pas été posée — et c'est le cas de la grande
 * majorité des profils, la question vivant dans le profil et pas à l'onboarding.
 * Ce défaut EST donc la valeur servie en pratique : ce n'est pas un détail.
 *
 * 1,20 et pas 1,30/1,35, parce que l'erreur n'est pas symétrique :
 *  • sur-estimer le NEAT → la personne mange à sa maintenance en croyant sécher.
 *    Échec SILENCIEUX, indétectable autrement qu'en ne perdant rien pendant des
 *    semaines. Mesuré : 1,35 efface 61 à 87 % du déficit d'un profil sédentaire
 *    (H 30 ans, 85 kg : −216 → −28 kcal/j) et transforme la sèche d'une femme de
 *    95 kg à 45 %MG en prise (+12 kcal/j).
 *  • sous-estimer → la personne perd un peu plus vite que prévu. VISIBLE sur la
 *    balance, rattrapé par le suivi de trajectoire, et borné par le plancher de
 *    sécurité qui, lui, ne bouge pas.
 *
 * C'est aussi la continuité stricte avec le jugement déjà encodé par l'ancien
 * multiplicateur legacy à 0 séance (1,2).
 */
export const DEFAULT_NEAT_LEVEL: NeatLevel = 'desk';

/** Facteur NEAT d'un profil. Tolérant : une valeur inconnue retombe sur le défaut. */
export function neatPal(level?: NeatLevel | null): number {
  return (level && NEAT_PAL[level]) || NEAT_PAL[DEFAULT_NEAT_LEVEL];
}

// Libellés affichés (FR) — SOURCE UNIQUE, comme SPORT_LABEL pour les sports.
// Formulés sur la JOURNÉE et jamais sur le sport : « souvent debout » n'a rien à
// voir avec « je m'entraîne souvent », et confondre les deux ferait compter
// l'entraînement une seconde fois.
export const NEAT_ORDER: NeatLevel[] = ['desk', 'light', 'active', 'physical'];

/**
 * ⚠️ CE N'EST PAS DE LA COSMÉTIQUE — c'est le réglage le plus lourd de l'app.
 *
 * Mesuré sur 800 profils (2 sexes × 5 âges × 5 %MG × 4 profils sportifs × 4
 * objectifs), un SEUL cran ajoute 126 à 165 kcal/j de maintenance (médiane 142) ;
 * `desk` → `physical` vaut +405 kcal/j sur la cible servie. Et surtout, en sèche :
 *
 *   niveau     déficit réel servi     plancher de sécurité actif
 *   desk       −180 kcal/j            200/200  (100 %)
 *   light      −300 kcal/j              0/200
 *   active     −300 kcal/j              0/200
 *   physical   −300 kcal/j              0/200
 *
 * Autrement dit : le plancher de sécurité n'est CONTRAIGNANT qu'au cran `desk`.
 * Monter d'un seul cran le fait disparaître pour la totalité des profils mesurés
 * et rend l'intégralité du déficit demandé. Ce clic-là n'est pas un détail de
 * formulaire, c'est le garde-fou.
 *
 * Nuance qui compte pour lire les chiffres : sur un profil DÉJÀ retenu par le
 * plancher, passer `desk` → `light` ne déplace la cible que de ~15 kcal (mesuré
 * 14 sur H 30 ans / 85 kg / 4× muscu). Ce n'est pas rassurant, c'est l'inverse :
 * la cible bouge peu parce que le plancher la tenait, et ce qui double vraiment
 * c'est le DÉFICIT réel — de −167 à −300 kcal/j sur ce même profil.
 *
 * D'où la règle de rédaction : ANCRAGE VÉRIFIABLE, JAMAIS D'ADJECTIF FLATTEUR.
 * Chaque niveau se reconnaît à un fait (le métier, la posture de la journée) que
 * la personne n'a pas à s'auto-évaluer. Les versions précédentes échouaient sur
 * les deux tableaux :
 *  • « Assis, mais je bouge régulièrement » est la réponse modeste et raisonnable
 *    que presque personne ne refuse — alors que « Assis presque toute la journée »
 *    se lit comme un reproche.
 *  • pire, l'indication de ce niveau était « Bureau avec déplacements, courses,
 *    ménage » : les courses et le ménage, c'est TOUT LE MONDE. Le texte invitait
 *    littéralement un employé de bureau à monter d'un cran, soit +130 kcal/j et la
 *    fin du plancher. La mention est donc désormais rattachée EXPLICITEMENT au
 *    niveau 1, où elle coupe l'inflation au lieu de la nourrir.
 *
 * L'ancrage retenu est le métier / la posture, et pas le nombre de pas : un
 * compteur de pas inclut les séances de course (~6 000 pas pour une seule), soit
 * exactement le double-comptage sport/NEAT que toute cette table existe pour
 * éviter.
 *
 * Ce qu'on NE fait PAS : afficher les kcal de chaque niveau sous l'option. Ça
 * transformerait une question factuelle (« c'est quoi tes journées ? ») en choix
 * de résultat (« je prends lequel pour manger plus ? »).
 */
export const NEAT_LABEL: Record<NeatLevel, string> = {
  desk: 'Assis la majeure partie de la journée',
  light: 'Assis, mais souvent en déplacement',
  active: 'Debout ou en marche la majeure partie de la journée',
  physical: 'Travail physique : porter, pousser, monter',
};

export const NEAT_HINT: Record<NeatLevel, string> = {
  desk: 'Bureau, télétravail, conduite, études. Les courses et le ménage ne changent rien : c\'est ici.',
  light: 'Tu changes de lieu plusieurs fois par jour : visites, chantiers, réunions, rendez-vous.',
  active: 'Commerce, soins, enseignement, restauration.',
  physical: 'BTP, manutention, agriculture, déménagement.',
};

/**
 * Forme courte pour les résumés d'une ligne (ligne « Sport & activité » du profil),
 * où le libellé complet — qui est une OPTION de question, pas une étiquette — passe
 * à la ligne ou se fait tronquer. Même contenu, jamais un autre sens.
 *
 * La ligne est en `numberOfLines={1}` et le résumé est PRÉFIXÉ par le nombre de
 * sports : le budget réel est donc `NEAT_SHORT` + « Aucun sport · », soit ~36
 * caractères à l'écran (mesuré à 375 pt). Une première version à 32 caractères
 * (« journées assises, en déplacement ») s'affichait « …en dépl… » : d'où la borne
 * du test, qui garde une marge pour le préfixe le plus long.
 */
export const NEAT_SHORT: Record<NeatLevel, string> = {
  desk: 'journées assises',
  light: 'assis, en déplacement',
  active: 'journées debout',
  physical: 'travail physique',
};

/** Entrées du TDEE. `UserProfile` le satisfait — d'où l'appel `calculateTDEE(profile)`. */
export type TdeeBody = {
  sex: Sex;
  weight_kg: number;
  height_cm: number;
  age: number;
  body_fat_pct?: number;
  sports?: SportSession[];
  neat_level?: NeatLevel;
};

/**
 * TDEE (maintenance) — CHEMIN UNIQUE : `BMR × NEAT + dépense sportive/jour`.
 *
 * Il y avait auparavant DEUX méthodes, choisies selon que `sports` était rempli ou
 * non : MET si oui, multiplicateur par nombre de séances si non. Le basculement
 * créait une marche d'escalier absurde — mesuré sur 360 profils, déclarer UNE
 * séance de 15 minutes de marche rapide (le minimum saisissable) faisait bondir le
 * TDEE de +116 à +245 kcal/jour, +181 en médiane, POSITIF dans 100 % des cas. La
 * méthode legacy avait en outre ses propres marches (+311 kcal entre 2 et 3
 * séances). Ce n'était pas un problème de comptes anciens : c'était une
 * discontinuité vivante, sur tous les comptes.
 *
 * Le chemin unique est continu par construction : une séance de plus ajoute
 * exactement ce qu'elle coûte, et `training_days_per_week` ne pilote plus rien ici
 * (il reste utile aux jours de repos et à la génération du plan).
 *
 * BMR : Katch-McArdle si `body_fat_pct` est fourni, sinon Mifflin-St Jeor.
 *
 * Cette fonction est l'UNIQUE source de calcul du TDEE, et `recalcProfile` en est
 * l'UNIQUE producteur de la valeur stockée `tdee_kcal`. Tout écran lit la valeur
 * stockée — aucun ne recalcule par un chemin parallèle.
 */
export function calculateTDEE(b: TdeeBody): number {
  const bmr = calculateBMR(b.sex, b.weight_kg, b.height_cm, b.age, b.body_fat_pct);
  return Math.round(bmr * neatPal(b.neat_level) + exerciseKcalPerDay(b.sports, b.weight_kg));
}

// Ajustement calorique + protéines selon l'objectif.
const GOAL_CONFIG: Record<Goal, { kcalDelta: number; proteinPerKg: number; label: string }> = {
  // `cut_aggressive` : LEGACY, plus proposé par l'UI (cf. syncGuard::normalizeGoal).
  // Conservé ici parce que des profils l'ont encore en base au moment où ils sont
  // lus — la normalisation les referme sur `cut`, mais le calcul doit rester
  // possible pour ne jamais crasher sur une ligne cloud non encore normalisée.
  cut_aggressive: { kcalDelta: -500, proteinPerKg: 2.4, label: 'Sèche rapide' },
  // « Sèche progressive » → « Sèche » : il n'y en a plus qu'une, et l'adjectif
  // n'oppose plus rien. Le rythme se règle par l'objectif daté.
  cut:            { kcalDelta: -300, proteinPerKg: 2.2, label: 'Sèche' },
  recomp:         { kcalDelta: -150, proteinPerKg: 2.2, label: 'Recomposition' },
  maintain:       { kcalDelta: 0,    proteinPerKg: 1.8, label: 'Maintien' },
  lean_bulk:      { kcalDelta: 200,  proteinPerKg: 2.0, label: 'Prise de masse propre' },
  bulk:           { kcalDelta: 400,  proteinPerKg: 1.8, label: 'Prise de masse' },
};

export function goalLabel(goal: Goal): string {
  return GOAL_CONFIG[goal].label;
}

// Protéines conseillées (g/kg) pour l'objectif — sert de valeur par défaut ET de
// repère affiché à l'utilisateur en mode « Perso % ».
export function recommendedProteinPerKg(goal: Goal): number {
  return GOAL_CONFIG[goal].proteinPerKg;
}

// Bornes de la cible protéique, en g/kg de MASSE MAIGRE. Encadrent la littérature
// (ISSN 2017 ; Helms 2014 : 2,3–3,1 g/kg de masse maigre en sèche chez le sujet sec).
export const PROTEIN_MIN_PER_KG_FFM = 1.6;
export const PROTEIN_MAX_PER_KG_FFM = 2.6;

/** Corps requis pour le calcul des macros — `UserProfile` le satisfait. */
export type MacroBody = BodyInput & { sports?: SportSession[] };

/**
 * Cible protéique (g) — base POIDS AJUSTÉ, plafonnée en g/kg de masse maigre.
 *
 * L'ancien calcul prenait `max(masse_maigre × coef, poids × plancher)` en croyant
 * corriger un sous-dosage à masse grasse élevée. Il produisait l'inverse : une
 * femme de 90 kg à 45 % de masse grasse recevait 180 g, soit 3,6 g/kg de masse
 * maigre — au-dessus de toute recommandation, et 720 kcal ponctionnées sur un
 * budget déjà au plancher (les glucides tombaient à ~37 g, en silence).
 *
 * Le poids ajusté (`masse maigre + 25 % de la masse grasse`) est la base usuelle
 * en clinique : le tissu adipeux a un coût protéique réel mais très inférieur à
 * celui du tissu maigre. Le clamp final garantit qu'on reste dans la fourchette
 * défendable quelle que soit la composition.
 */
export function proteinTarget(body: BodyInput, goal: Goal): number {
  const ffm = fatFreeMassKg(body);
  const adjustedWeight = ffm + 0.25 * (body.weight_kg - ffm);
  const raw = adjustedWeight * GOAL_CONFIG[goal].proteinPerKg;
  return Math.round(clamp(raw, ffm * PROTEIN_MIN_PER_KG_FFM, ffm * PROTEIN_MAX_PER_KG_FFM));
}

// Glucides minimum un jour de séance (g/kg de poids) — sous ce seuil, la qualité
// de séance et la récupération décrochent. Signalé, pas corrigé (le rééquilibrage
// entre jours relève du cyclage, hors périmètre de cette PR).
export const CARB_TRAINING_FLOOR_PER_KG = 3;

// ── Plancher lipidique (P1.4) ────────────────────────────────────────────────
//
// Indexé sur la MASSE MAIGRE, pas sur le poids de corps. La spec proposait
// 0,5 g/kg de poids ; ç'aurait été refaire à l'identique l'erreur que P0.2 vient de
// corriger sur les protéines — chez une femme de 125 kg à 52 % de masse grasse, ça
// donne 1,42 g/kg de masse maigre et jusqu'à 42,6 % des calories en lipides, prélevés
// sur les glucides. Le tissu adipeux n'a pas de besoin lipidique ; la masse maigre si.
//
// 0,8 g/kg de masse maigre ne mord AUCUN profil sain en mode auto (les 25 % de kcal y
// suffisent déjà) : le trou réel est le mode « Perso % », où l'utilisateur peut pousser
// les glucides jusqu'à ne laisser que 0,22 g/kg — 6,6 % des calories, sous le seuil de
// carence (hormones stéroïdiennes, vitamines liposolubles).
export const FAT_MIN_PER_KG_FFM = 0.8;

/**
 * Cible lipidique (g) : la part calorique habituelle, relevée au plancher
 * physiologique, et BORNÉE PAR LE BUDGET.
 *
 * Le bornage n'est pas décoratif : sur les gabarits où le plancher de sécurité est
 * plafonné à la maintenance, `FAT_MIN_PER_KG_FFM × masse maigre` peut dépasser la
 * cible entière — on servirait alors un budget négatif en glucides ET en protéines.
 * Un plancher qui rend le plan infaisable n'est plus un plancher.
 */
export function fatTargetG(targetKcal: number, body: BodyInput, share: number = 0.25): number {
  const fromShare = (targetKcal * share) / 9;
  const floor = FAT_MIN_PER_KG_FFM * fatFreeMassKg(body);
  return Math.round(Math.min(Math.max(fromShare, floor), targetKcal / 9));
}

/** Glucides sous le plancher « jour de séance » ? Partagé par les trois modes. */
function isTrainingCarbShort(carbs_g: number, weight_kg: number): boolean {
  return carbs_g < CARB_TRAINING_FLOOR_PER_KG * weight_kg;
}

export interface MacroPlan {
  target_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  floor_kcal: number;   // plancher de sécurité appliqué (cf. safetyFloorKcal)
  flags: PlanFlag[];
}

export interface MacroOptions {
  /** Delta calorique signé qui REMPLACE celui de l'objectif (point d'entrée de l'objectif daté). */
  kcalDeltaOverride?: number;
  /** Dépense d'exercice moyenne (kcal/j). Défaut : dérivée des sports du profil. */
  sportKcalPerDay?: number;
  /** Semaines déjà passées en zone d'énergie disponible basse (fenêtre 12 mois). */
  lowEaWeeks?: number;
  /**
   * Jour de séance ? Pilote le seuil d'alerte glucides (3 g/kg).
   *
   * Défaut : DÉRIVÉ des séances déclarées, et non `true`. Le défaut à `true` levait
   * `CARBS_BELOW_TRAINING_FLOOR` sur des profils à ZÉRO séance (mesuré : H 70 kg
   * sédentaire, 189 g de glucides pour un seuil « jour de séance » à 210 g) — un
   * avertissement de qualité d'entraînement servi à quelqu'un qui ne s'entraîne pas.
   * Inoffensif tant que le drapeau n'est affiché nulle part ; à corriger AVANT de
   * le câbler, sinon c'est l'alarme absurde qui part en production.
   */
  isTrainingDay?: boolean;
}

/** Un profil sans aucune séance déclarée n'a pas de « jour de séance ». */
function defaultIsTrainingDay(body: MacroBody): boolean {
  return totalSessionsPerWeek(body.sports) > 0;
}

/**
 * Plancher + drapeaux communs à TOUS les modes de calcul — `manual` compris, qui
 * construisait auparavant ses drapeaux à la main et n'émettait donc jamais
 * LOW_EA_BUDGET_EXCEEDED ni CARBS_BELOW_TRAINING_FLOOR.
 *
 * `requestedKcal` = la cible AVANT plancher : `tdee + delta` en auto/percent,
 * l'énergie des grammes saisis en manual.
 */
function floorAndFlags(body: MacroBody, tdee: number, requestedKcal: number, opts: MacroOptions) {
  const sportKcalPerDay = opts.sportKcalPerDay ?? exerciseKcalPerDay(body.sports, body.weight_kg);
  const lowEaWeeks = opts.lowEaWeeks ?? 0;
  const bmr = calculateBMR(body.sex, body.weight_kg, body.height_cm, body.age, body.body_fat_pct);
  // `tdee` plafonne la composante EA : le plancher ne doit jamais imposer un surplus.
  const baseFloor = safetyFloorKcal(body, bmr, sportKcalPerDay, lowEaWeeks, tdee);

  // ── Dérive sous l'insuffisance pondérale ──────────────────────────────────
  // L'éligibilité garde les portes d'entrée, elle ne voit pas le temps passer :
  // qui commence à IMC 19 et descend à 17,8 continuait de recevoir un déficit.
  // Sous IMC 18,5, le plancher monte donc à la MAINTENANCE — le plan cesse de
  // creuser, sans jamais basculer en surplus (ce serait prescrire une prise de
  // poids à quelqu'un qui a demandé une sèche : c'est son objectif à changer,
  // pas au moteur de le faire à sa place).
  //
  // Conditionné à un déficit RÉELLEMENT demandé : sinon un objectif « maintien »
  // à IMC 18 verrait son plancher rejoindre sa cible, et le drapeau FLOOR_APPLIED
  // se lèverait pour un plan que rien ne contraint.
  const maintenance = Number.isFinite(tdee) && tdee > 0 ? Math.round(tdee) : 0;
  const deficitRequested = maintenance > 0 && requestedKcal < maintenance;
  const underweightCapped = deficitRequested && deficitBlocked(body);

  // ── Plafond de déficit à 25 % du TDEE, sur TOUS les chemins ────────────────
  // CLAUDE.md §6 le range parmi les hard blocks, mais il n'était appliqué que sur
  // le chemin « objectif daté » (datedGoal.MAX_DEFICIT_TDEE_RATIO). Les deltas figés
  // de GOAL_CONFIG n'étaient plafonnés par rien : mesuré, une femme de 55 ans, 60 kg,
  // 4 séances, en « sèche rapide » recevait 28 % de déficit sans le moindre drapeau.
  // Un plafond de déficit EST un plancher calorique — il rejoint donc naturellement
  // les autres, et ne peut par construction pas créer de surplus (75 % < 100 %).
  const deficitCapFloor = maintenance > 0 ? Math.round(maintenance * (1 - MAX_DEFICIT_TDEE_RATIO)) : 0;

  const floor_kcal = Math.max(
    baseFloor,
    deficitCapFloor,
    underweightCapped ? maintenance : 0,
  );

  const target_kcal = Math.max(requestedKcal, floor_kcal);

  const flags: PlanFlag[] = [];
  // Le plancher est CONTRAIGNANT (et pas seulement « a mordu au premier calcul ») :
  // en mode manual la correction est persistée, donc `target > requested` devient
  // faux au recalcul suivant et l'avertissement disparaissait — alors que le plan
  // sert toujours exactement le plancher. On teste l'état, pas la transition.
  if (target_kcal <= floor_kcal) flags.push('FLOOR_APPLIED');
  if (underweightCapped) flags.push('UNDERWEIGHT_NO_DEFICIT');
  const ea = energyAvailability(body, target_kcal, sportKcalPerDay);
  if (ea < EA_OPTIMAL) flags.push('LOW_EA_WARNING');
  if (isFemaleAtRisk(body) && lowEaWeeks > LOW_EA_BUDGET_WEEKS) flags.push('LOW_EA_BUDGET_EXCEEDED');

  return { target_kcal, floor_kcal, flags, sportKcalPerDay };
}

/**
 * Plancher de sécurité PERSONNALISÉ, calculé pour le MOTEUR — déterministe, sans date.
 *
 * `buildLocalPlan(profile, seed)` ne reçoit pas de date et doit rester déterministe
 * (même profil → même plan). Or l'escalade « zone basse » dépend du temps qui passe.
 * On prend donc `weeks.length` du registre brut plutôt que le décompte fenêtré de
 * `lowEaWeeksBefore` : c'est un **majorant** du nombre de semaines exposées, donc un
 * plancher **≥** au vrai. L'écart va toujours vers PLUS de protection, jamais moins.
 *
 * ⚠️ Pourquoi ce n'est pas `MIN_KCAL` : le filet absolu (1500 ♂ / 1200 ♀) n'est plus
 * le plancher principal depuis le 2026-07-28 — il autorisait 1200 kcal à une femme de
 * 65 kg s'entraînant 5×/semaine, dont le minimum physiologique est ~1863 (CLAUDE.md §6).
 * Tout mécanisme qui pousse un jour VERS LE BAS (aujourd'hui : la banque de calories)
 * doit se borner ici, pas sur le filet.
 *
 * ⚠️ Volontairement NON stocké au profil : une valeur dérivée recopiée en base finit
 * par diverger de sa source — c'est exactement le bug P3.3 (`sports` vs
 * `training_days_per_week`). On la recalcule, c'est pur et instantané.
 */
export function engineFloorKcal(p: UserProfile): number {
  const bmr = calculateBMR(p.sex, p.weight_kg, p.height_cm, p.age, p.body_fat_pct);
  const sportKcalPerDay = exerciseKcalPerDay(p.sports, p.weight_kg);
  const weeksInLowEa = readLowEaRegistry(p.low_ea_weeks).weeks.length;
  const tdee = Number.isFinite(p.tdee_kcal) && p.tdee_kcal > 0 ? p.tdee_kcal : bmr;
  return safetyFloorKcal(p, bmr, sportKcalPerDay, weeksInLowEa, tdee);
}

/** Glucides = reliquat. Ne les écrase JAMAIS à zéro en silence : on signale. */
function carbsFromRemaining(
  remainingKcal: number, body: MacroBody, opts: MacroOptions, flags: PlanFlag[],
): number {
  const carbs = Math.round(remainingKcal / 4);
  if (carbs < 0) flags.push('MACRO_BUDGET_OVERFLOW');
  const isTrainingDay = opts.isTrainingDay ?? defaultIsTrainingDay(body);
  if (isTrainingDay && isTrainingCarbShort(carbs, body.weight_kg)) {
    flags.push('CARBS_BELOW_TRAINING_FLOOR');
  }
  return Math.max(0, carbs);
}

export function calculateMacros(
  tdee: number,
  goal: Goal,
  body: MacroBody,
  opts: MacroOptions = {},
): MacroPlan {
  const kcalDelta = opts.kcalDeltaOverride ?? GOAL_CONFIG[goal].kcalDelta;
  const { target_kcal, floor_kcal, flags } = floorAndFlags(body, tdee, tdee + kcalDelta, opts);

  const protein_g = proteinTarget(body, goal);
  const fat_g = fatTargetG(target_kcal, body);
  const carbs_g = carbsFromRemaining(target_kcal - protein_g * 4 - fat_g * 9, body, opts, flags);

  return { target_kcal, protein_g, carbs_g, fat_g, floor_kcal, flags };
}

// Recalcule les kcal à partir de macros saisies manuellement
export function kcalFromMacros(protein_g: number, carbs_g: number, fat_g: number): number {
  return Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9);
}

// Mode « Perso % » (option B). kcal cible + plancher = identiques au mode auto,
// mais protéines et répartition glucides/lipides sont pilotées par l'utilisateur
// (bornes de saisie côté UI). Le plancher de sécurité s'applique de la même façon.
export const DEFAULT_CARB_RATIO = 55; // % glucides des calories non-protéiques

// Bornes du curseur « Perso % » — SOURCE UNIQUE, lue par l'écran ET par le moteur.
//
// Le maximum descend de 90 à 75 (P1.4). À 90, le plan servait 19 g de lipides, soit
// 7,3 % des calories ; à 100 (valeur que la base acceptait et que le moteur clampait
// à 100, pas à la borne de l'écran), il servait ZÉRO gramme de lipides sans lever le
// moindre drapeau. 75 laisse 18,5 % des calories en lipides — au-dessus du seuil de
// carence, et toujours largement « low carb » pour qui le veut.
export const CARB_RATIO_MIN = 10;
export const CARB_RATIO_MAX = 75;

/**
 * `carb_ratio` ramené dans les bornes, À LA LECTURE.
 *
 * Une constante d'écran ne migre aucun compte : `carb_ratio` est PERSISTÉ (et
 * synchronisé), donc quelqu'un qui a enregistré 90 avant ce correctif garderait
 * 19 g de lipides pour toujours si on se contentait d'abaisser le maximum du
 * curseur. C'est le même raisonnement que pour le plancher rétroactif du P0.
 */
export function clampCarbRatio(v: number | undefined | null): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_CARB_RATIO;
  return clamp(Math.round(v), CARB_RATIO_MIN, CARB_RATIO_MAX);
}

export function macrosPercent(
  tdee: number,
  goal: Goal,
  body: MacroBody,
  carbRatio: number,
  opts: MacroOptions & { proteinPerKg?: number } = {},
): MacroPlan {
  const cfg = GOAL_CONFIG[goal];
  const kcalDelta = opts.kcalDeltaOverride ?? cfg.kcalDelta;
  const { target_kcal, floor_kcal, flags } = floorAndFlags(body, tdee, tdee + kcalDelta, opts);

  // Protéines. SANS réglage explicite → exactement la cible du mode auto.
  //
  // AVEC un g/kg saisi, la base est TOUJOURS la MASSE MAIGRE — estimée par
  // Deurenberg quand le %MG n'est pas déclaré, jamais le poids de corps brut.
  // Prendre le poids brut annulait purement et simplement le correctif P0.2 :
  // l'UI pré-remplit toujours `protein_per_kg`, donc ce chemin est celui de TOUS
  // les utilisateurs en « Perso % », et une femme de 90 kg sans %MG déclaré
  // passait de 135 g (auto) à 198 g, soit 3,81 g/kg de masse maigre — exactement
  // le sur-dosage que P0.2 corrigeait. Au maximum du stepper (3,0 g/kg), la base
  // masse maigre garde le résultat dans la fourchette haute défendable
  // (Helms 2014 : 2,3–3,1 g/kg de masse maigre en sèche).
  const protein_g = (typeof opts.proteinPerKg === 'number' && opts.proteinPerKg > 0)
    ? Math.round(fatFreeMassKg(body) * opts.proteinPerKg)
    : proteinTarget(body, goal);

  const remaining = target_kcal - protein_g * 4;
  if (remaining < 0) flags.push('MACRO_BUDGET_OVERFLOW');
  const usable = Math.max(0, remaining);
  const ratio = clampCarbRatio(carbRatio) / 100;

  // Les lipides d'abord, plancher physiologique compris (P1.4) : c'est ICI que le
  // trou était, pas en mode auto. Le curseur pouvait laisser 12 à 20 g de lipides
  // (6,6 % des calories) sur des profils parfaitement ordinaires, et `carb_ratio`
  // étant PERSISTÉ, abaisser la borne de l'écran n'aurait rien changé aux comptes
  // qui stockent déjà 90 — d'où le clamp à la lecture (cf. syncGuard).
  //
  // Les glucides sont ensuite le RELIQUAT et non une part indépendante : relever les
  // lipides sans les recalculer faisait dépasser le budget de +13,5 %. En mode auto
  // les glucides jouaient déjà ce rôle, ce chemin-ci ne le faisait pas.
  const fat_g = fatTargetG(usable, body, 1 - ratio);
  const carbs_g = Math.max(0, Math.round((usable - fat_g * 9) / 4));

  const isTrainingDay = opts.isTrainingDay ?? defaultIsTrainingDay(body);
  if (isTrainingDay && isTrainingCarbShort(carbs_g, body.weight_kg)) {
    flags.push('CARBS_BELOW_TRAINING_FLOOR');
  }

  return { target_kcal, protein_g, carbs_g, fat_g, floor_kcal, flags };
}

// ── Révision du moteur et avertissement one-shot ─────────────────────────────
//
// Une correction du moteur déplace la cible de gens qui n'ont rien demandé. C'est
// légitime (une cible fausse reste fausse), mais un budget qui bouge de plusieurs
// centaines de kcal sans un mot, c'est la confiance dans le produit qui part.
//
// On horodate donc la révision qui a produit les cibles stockées, et au premier
// recalcul sous une nouvelle révision on compare l'ancienne cible SERVIE à la
// nouvelle. Au-delà du seuil, on dépose un avertissement à afficher une fois.

/** Révision des profils calculés AVANT l'existence du champ (MET brut + multiplicateur legacy). */
export const ENGINE_REV_LEGACY = 1;

/** Révision courante — à INCRÉMENTER à chaque correction qui déplace les cibles. */
export const ENGINE_REV = 2;

/**
 * Seuil d'affichage (kcal/j, en valeur absolue). En dessous, l'écart tient dans le
 * bruit d'une pesée ou d'un arrondi et une notification ferait plus de mal que de
 * bien — on ne va pas alarmer quelqu'un pour 40 kcal.
 */
export const ENGINE_NOTICE_MIN_DELTA = 100;

/**
 * Avertissement à déposer, ou `undefined` s'il n'y a rien à dire.
 *
 * `prevTarget` vaut 0 sur un profil neuf (onboarding : les cibles n'existent pas
 * encore) → aucun avertissement, on ne va pas expliquer un changement à quelqu'un
 * qui n'a jamais vu l'ancienne valeur.
 */
function engineNoticeFor(prevRev: number | undefined, prevTarget: number, nextTarget: number): EngineNotice | undefined {
  if ((prevRev ?? ENGINE_REV_LEGACY) === ENGINE_REV) return undefined;
  if (!(prevTarget > 0) || !(nextTarget > 0)) return undefined;
  if (Math.abs(nextTarget - prevTarget) < ENGINE_NOTICE_MIN_DELTA) return undefined;
  return { rev: ENGINE_REV, from: prevTarget, to: nextTarget };
}

// ── Producteur unique du profil calculé ──────────────────────────────────────

export interface ComputedPlan {
  profile: UserProfile;
  flags: PlanFlag[];
  floor_kcal: number;
  /**
   * De quoi EXPLIQUER une cible qui remonte toute seule, ou `undefined` s'il n'y a
   * rien à dire. Exposé ici et pas recalculé par l'écran : le nombre de semaines en
   * zone basse dépend du solde de l'exposition (`settleLowEaExposure`) et de la
   * fenêtre antérieure (`lowEaWeeksBefore`), deux étapes que l'UI referait
   * forcément de travers. Producteur unique, comme pour les drapeaux.
   */
  low_ea_escalation?: LowEaEscalation;
}

/**
 * Recalcule un profil complet : TDEE (toujours) + macros + plancher de sécurité.
 * Source unique utilisée par l'onboarding, le profil ET le check-in poids.
 *
 * Déterministe : la date du jour est un PARAMÈTRE, jamais une horloge implicite.
 */
export function computePlan(p: UserProfile, today: string = todayStamp()): ComputedPlan {
  const tdee = calculateTDEE(p);
  const sportKcalPerDay = exerciseKcalPerDay(p.sports, p.weight_kg);
  const bmr = calculateBMR(p.sex, p.weight_kg, p.height_cm, p.age, p.body_fat_pct);

  // ── Registre d'exposition en zone d'énergie disponible basse ───────────────
  // 1. On SOLDE d'abord les semaines écoulées depuis le début de l'exposition en
  //    cours : le plan servi restait en vigueur entre deux ouvertures de l'app,
  //    donc ces semaines ont bien été vécues (cf. settleLowEaExposure). Sans ça,
  //    le compteur mesurait la fréquence des recalculs, pas la durée du régime.
  // 2. Le plancher du jour se calcule ensuite sur les semaines ANTÉRIEURES
  //    uniquement (cf. lowEaWeeksBefore) : la semaine courante ne peut pas
  //    influencer le plancher qui sert à décider si elle compte. C'est ce qui rend
  //    le calcul idempotent ET permet au registre de se vider.
  const settled = settleLowEaExposure(p.low_ea_weeks, today);
  const lowEaWeeks = lowEaWeeksBefore(settled, today);

  // Plancher de BASE — calculé ICI, avant la trajectoire datée (P1.6).
  // Il ne dépend que du corps, du BMR, de la dépense sportive et du TDEE : jamais de
  // la cible. Aucune circularité, donc, à le connaître avant de projeter une date.
  // (`floorAndFlags` le recalcule à l'identique — fonction pure, mêmes entrées : on
  // préfère cette redondance à un paramètre de plus sur l'API publique des macros.)
  const baseFloor = safetyFloorKcal(p, bmr, sportKcalPerDay, lowEaWeeks, tdee);

  // Objectif daté (premium) : le delta calorique suit la trajectoire vers le poids
  // cible plutôt que le delta figé de l'objectif. `undefined` → comportement normal.
  // On garde le STATUT et pas seulement le delta : c'est lui qui sait POURQUOI le
  // pilotage s'est arrêté, information que le delta (0) a déjà perdue.
  //
  // `null` en mode `manual` : la cible y vient des grammes saisis, pas de
  // `tdee + delta` — la correction de plancher y donnerait le signe inverse.
  const datedStatus = datedGoalStatus(
    p.goal_target, p, today, tdee, p.macro_mode === 'manual' ? null : baseFloor,
  );
  const datedDelta = datedStatus?.active ? datedStatus.dailyKcalDelta : undefined;
  const kcalDelta = datedDelta ?? GOAL_CONFIG[p.goal].kcalDelta;

  const opts: MacroOptions = { kcalDeltaOverride: kcalDelta, sportKcalPerDay, lowEaWeeks };

  let m: MacroPlan;
  if (p.macro_mode === 'auto') {
    m = calculateMacros(tdee, p.goal, p, opts);
  } else if (p.macro_mode === 'percent') {
    // `clampCarbRatio` et pas `?? DEFAULT` : une valeur PERSISTÉE hors bornes (90,
    // ou 100 que la base accepte) doit être ramenée, pas servie telle quelle.
    m = macrosPercent(tdee, p.goal, p, clampCarbRatio(p.carb_ratio), {
      ...opts, proteinPerKg: p.protein_per_kg,
    });
  } else {
    // legacy 'manual' : grammes figés — MAIS le plancher de sécurité s'applique
    // quand même (aucun chemin de code excepté), et par le MÊME chemin que les
    // autres modes, donc avec le même jeu de drapeaux.
    //
    // La demande se dérive des GRAMMES, jamais de `p.target_kcal` : celui-ci a pu
    // être relevé au plancher lors d'un calcul précédent, et repartir de lui
    // faisait un cliquet (la cible ne redescendait plus quand le plancher baissait,
    // par exemple après une perte de poids).
    //
    // ⚠️ LIMITE CONNUE, assumée : la recharge en glucides est PERSISTÉE dans les
    // grammes, et rien ne distingue ensuite les grammes de l'utilisateur des
    // nôtres. Si le plancher baisse plus tard (perte de poids, volume sportif
    // réduit, registre d'énergie basse qui se vide), la cible reste au niveau
    // atteint. L'écart va toujours dans le sens de MANGER PLUS, jamais moins, et
    // `macro_mode: 'manual'` n'est plus proposé par l'UI (onboarding force 'auto',
    // l'éditeur n'offre que 'auto'|'percent') : seuls des comptes historiques sont
    // concernés. Le corriger proprement demanderait de stocker les grammes
    // d'origine à part — à faire si ce mode redevient accessible.
    const manualKcal = kcalFromMacros(p.target_protein_g, p.target_carbs_g, p.target_fat_g);
    const r = floorAndFlags(p, tdee, manualKcal, opts);
    const carbs_g = p.target_carbs_g + Math.max(0, Math.round((r.target_kcal - manualKcal) / 4));
    // La cible SERVIE est l'énergie des grammes servis, pas une valeur parallèle :
    // la recharge en glucides est arrondie au gramme, donc les deux divergeaient
    // d'un kcal et le calcul n'était plus idempotent d'un passage à l'autre.
    const served = Math.max(r.floor_kcal, kcalFromMacros(p.target_protein_g, carbs_g, p.target_fat_g));
    // « Au plancher » à un gramme de glucides près (4 kcal) : la recharge est
    // quantifiée au gramme, donc l'égalité stricte serait instable d'un calcul à
    // l'autre — et le drapeau clignoterait.
    const flags: PlanFlag[] = r.flags.filter((f) => f !== 'FLOOR_APPLIED');
    if (served - r.floor_kcal < 4) flags.push('FLOOR_APPLIED');
    if ((opts.isTrainingDay ?? defaultIsTrainingDay(p)) && isTrainingCarbShort(carbs_g, p.weight_kg)) {
      flags.push('CARBS_BELOW_TRAINING_FLOOR');
    }
    m = { target_kcal: served, floor_kcal: r.floor_kcal, flags, protein_g: p.target_protein_g, carbs_g, fat_g: p.target_fat_g };
  }

  // ── Clôture du registre ───────────────────────────────────────────────────
  // Jugé sur la cible RÉELLEMENT SERVIE (`m.target_kcal`), et non sur une cible
  // virtuelle : une utilisatrice que l'escalade a ramenée à sa maintenance ne
  // subit plus AUCUNE restriction, donc sa semaine ne doit plus compter — et
  // `since` retombe à null, ce qui arrête le décompte du temps écoulé. Sinon le
  // compteur saturait et la verrouillait à « déficit zéro » à vie : la sortie de
  // déficit comptait elle-même comme du déficit.
  // On n'historise que pour les femmes : seule population dont le plancher remonte
  // (cf. safety.effectiveEaPerKgFfm). Toutes les femmes, ménopausées comprises —
  // sinon basculer le champ ferait perdre l'historique.
  const low_ea_weeks = p.sex === 'female'
    ? collapseLowEaRegistry(
        markLowEaWeek(settled, today, countsAsLowEaWeek(p, m.target_kcal, tdee, sportKcalPerDay)),
      )
    : p.low_ea_weeks;

  const flags = [...m.flags];
  // Poids cible incohérent avec la famille d'objectif : le pilotage daté renvoie
  // alors 0 (pas de pilotage). On requalifie ici pour que l'UI puisse le DIRE, plutôt
  // que d'afficher un « maintien » que l'utilisateur n'a pas demandé.
  if (p.goal_target && goalDirectionMismatch(p.goal, p.goal_target.target_weight_kg - p.weight_kg)) {
    flags.push('GOAL_DIRECTION_MISMATCH');
  }
  // Même raisonnement pour l'insuffisance pondérale : un objectif daté ramène la
  // demande à 0 AVANT le plancher, qui n'a donc plus rien à refuser et ne lève pas
  // le drapeau. Le déficit a pourtant bien été demandé, puis refusé — simplement
  // un cran plus haut. Sans cette ligne, poser un objectif daté faisait DISPARAÎTRE
  // l'avertissement du profil : l'écran devenait muet précisément pour la personne
  // qui poursuit activement une perte de poids en insuffisance pondérale.
  if (datedStatus?.underweightBlocked && !flags.includes('UNDERWEIGHT_NO_DEFICIT')) {
    flags.push('UNDERWEIGHT_NO_DEFICIT');
  }

  // ── Révision du moteur ────────────────────────────────────────────────────
  // Comparé à la cible STOCKÉE, donc à ce que la personne avait réellement sous les
  // yeux. Un avertissement déjà déposé n'est pas écrasé tant qu'il n'a pas été lu
  // (`dismissEngineNotice`) : le profil est recalculé à chaque ouverture d'app, et
  // dès le deuxième passage `p.target_kcal` vaut déjà la NOUVELLE valeur — l'écart
  // serait alors nul et le message s'effacerait avant d'avoir été vu.
  const engine_notice = p.engine_notice
    ?? engineNoticeFor(p.engine_rev, p.target_kcal, m.target_kcal);

  const escalation = lowEaEscalation(p, lowEaWeeks) ?? undefined;

  return {
    profile: {
      ...p,
      low_ea_weeks,
      tdee_kcal: tdee,
      target_kcal: m.target_kcal,
      target_protein_g: m.protein_g,
      target_carbs_g: m.carbs_g,
      target_fat_g: m.fat_g,
      engine_rev: ENGINE_REV,
      ...(engine_notice ? { engine_notice } : {}),
    },
    flags,
    floor_kcal: m.floor_kcal,
    // `lowEaWeeks` et pas le registre brut : c'est le décompte ANTÉRIEUR, celui qui
    // a réellement servi à calculer le plancher du jour. Expliquer une remontée avec
    // un autre nombre que celui qui l'a produite serait une seconde source de vérité.
    ...(escalation ? { low_ea_escalation: escalation } : {}),
  };
}

/**
 * Marque l'avertissement de révision comme lu. Rendu explicite (et pas un simple
 * `{...p, engine_notice: undefined}` inline) parce que la clé doit être RETIRÉE et
 * pas seulement mise à `undefined` : `JSON.stringify` élide les `undefined`, donc
 * la comparaison anti-réécriture de `useProfile` ne verrait aucun changement et
 * l'avertissement reviendrait à la prochaine ouverture.
 */
export function dismissEngineNotice(p: UserProfile): UserProfile {
  const { engine_notice, ...rest } = p;
  return { ...rest, engine_rev: ENGINE_REV } as UserProfile;
}

/** Profil recalculé (API historique). */
export function recalcProfile(p: UserProfile, today: string = todayStamp()): UserProfile {
  return computePlan(p, today).profile;
}

/** Drapeaux de sécurité du plan courant — à afficher, jamais à persister. */
export function planFlags(p: UserProfile, today: string = todayStamp()): PlanFlag[] {
  return computePlan(p, today).flags;
}

/**
 * Plancher de sécurité du plan courant, par le PRODUCTEUR UNIQUE.
 *
 * Existe pour que les écrans puissent alimenter `datedGoalStatus` (P1.6) sans
 * reconstruire le plancher par un chemin parallèle — recalculer BMR + dépense
 * sportive + registre à la main dans un composant est exactement le genre de
 * duplication qui finit par diverger en silence.
 */
export function planFloorKcal(p: UserProfile, today: string = todayStamp()): number {
  return computePlan(p, today).floor_kcal;
}

// Validation garde-fous
export function validateProfile(sex: Sex, age: number, target_kcal: number): string | null {
  if (age < MIN_AGE) return `Kyroz est réservé aux ${MIN_AGE} ans et plus.`;
  if (target_kcal < MIN_KCAL[sex]) {
    return `Le plan minimum est de ${MIN_KCAL[sex]} kcal/jour.`;
  }
  return null;
}
