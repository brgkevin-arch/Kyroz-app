import { Goal, GoalTarget, LowEaRegistry, LowEaRegistryStored, Sex, SportSession } from './types';
import { totalWeeklyTrainingMinutes } from './sport';

// Arithmétique de dates 'YYYY-MM-DD'. Dupliquée (petitement) depuis datedGoal.ts
// À DESSEIN : `datedGoal` dépend de `safety` (bornes de rythme), donc l'import
// inverse créerait un cycle. Quelques lignes valent mieux qu'un cycle.
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000);
}
function stampOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function addDays(stamp: string, days: number): string {
  const d = new Date(Date.parse(stamp + 'T00:00:00'));
  d.setDate(d.getDate() + days);
  return stampOf(d);
}

// ── Garde-fous de sécurité du moteur (PR 1 / P0) ─────────────────────────────
//
// Ce module concentre TOUT ce qui borne le moteur : plancher d'énergie, bornes
// physiologiques, éligibilité. Il est pur (aucune horloge implicite : la date du
// jour est TOUJOURS un paramètre) et sans dépendance réseau — mêmes entrées,
// mêmes sorties.
//
// Il vit à part de `tdee.ts` volontairement : `tdee.ts` calcule, `safety.ts`
// borne. Aucun chemin de calcul ne doit produire une cible calorique sans être
// passé par `safetyFloorKcal`.

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

// ── Composition corporelle ───────────────────────────────────────────────────

/**
 * Bornes physiologiques du % de masse grasse, PAR SEXE. L'ancienne borne unique
 * 3–60 % était fausse pour les femmes : 3 % est sous le gras essentiel masculin
 * et physiologiquement impossible chez une femme (gras essentiel ~10–13 %).
 */
export function bodyFatBounds(sex: Sex): [number, number] {
  return sex === 'male' ? [5, 60] : [12, 65];
}

/**
 * Sous ce % de masse grasse, la valeur SAISIE À LA MAIN est atypique au point de
 * mériter un repère à l'écran — pas un blocage, la valeur reste physiologiquement
 * possible (athlètes, compétition).
 *
 * ⚠️ POURQUOI ÇA COMPTE : le %MG est le second réglage le plus lourd de l'app après
 * le NEAT, et c'est un chiffre que presque personne ne connaît vraiment. Katch-McArdle
 * ne lit QUE la masse maigre — mesuré sur une femme de 80 kg / 1 m 70 / 35 ans,
 * saisir 20 % au lieu des 36 % estimés fait passer la cible de 1731 à 2112 kcal :
 * **+381 kcal/jour, le déficit disparaît en entier**. Elle mange à sa maintenance en
 * croyant sécher et ne le découvre qu'après des semaines sur la balance — exactement
 * le mode d'échec silencieux que le défaut NEAT `desk` existe pour éviter.
 * Le sens de l'erreur n'est pas symétrique : SOUS-estimer son %MG gonfle la masse
 * maigre donc la dépense (échec muet) ; la SUR-estimer creuse le déficit, ce qui se
 * voit sur la balance et reste tenu par le plancher de sécurité. D'où un repère sur
 * la borne BASSE seulement.
 *
 * Les seuils sont ceux de la silhouette la plus MAIGRE du sélecteur (18 % chez la
 * femme, 10 % chez l'homme) : ainsi le repère ne peut JAMAIS se déclencher sur un
 * simple tap d'illustration — uniquement sur un chiffre tapé sous toute la charte.
 * Les tenir alignés est verrouillé par un test.
 */
export const ATYPICAL_BF_BELOW: Record<Sex, number> = { female: 18, male: 10 };

/** Un %MG saisi à la main sous la charte des silhouettes ? (repère, pas blocage) */
export function isAtypicalBodyFat(sex: Sex, pct: number | undefined | null): boolean {
  return typeof pct === 'number' && Number.isFinite(pct) && pct < ATYPICAL_BF_BELOW[sex];
}

/**
 * Plafond d'indice de masse maigre (FFMI = masse maigre / taille²) au-delà duquel
 * la MASSE MAIGRE qu'implique le %MG saisi sort du plausible pour le sexe.
 *
 * ⚠️ POURQUOI CE SECOND REPÈRE EXISTE — c'est le trou par lequel un %MG faux passait.
 * `ATYPICAL_BF_BELOW` est un seuil PLAT : il ne regarde que le pourcentage, jamais
 * les kilos qu'il produit. Mesuré sur le cas qui l'a révélé — 80 kg, 1 m 70, 20 % de
 * MG — le seuil plat ne dit rien (20 > 18) alors que le chiffre implique **64 kg de
 * masse maigre, FFMI 22,1**. Chez l'homme c'est un gabarit entraîné banal ; chez la
 * femme c'est au-dessus du plafond naturel. Le seuil plat était donc muet
 * précisément là où le %MG saisi était le plus improbable.
 *
 * Les valeurs (21 chez la femme, 25 chez l'homme) sont les plafonds naturels
 * usuellement cités : au-delà, on est hors de la population que Kyroz sert.
 *
 * Ce repère ne bloque rien et ne déplace AUCUNE cible : il ne change pas une
 * formule, donc pas de `ENGINE_REV`. Il informe avant que le chiffre ne serve.
 */
export const FFMI_ATYPICAL_ABOVE: Record<Sex, number> = { female: 21, male: 25 };

/** Indice de masse maigre — même lecture que l'IMC, mais sur la seule masse maigre. */
export function leanMassIndex(b: BodyInput): number {
  const m = b.height_cm / 100;
  return m > 0 ? fatFreeMassKg(b) / (m * m) : 0;
}

/**
 * Ce que l'écran doit signaler sur un %MG saisi — `null` = rien à dire.
 *
 * SOURCE UNIQUE des deux repères : ils attrapent deux improbabilités différentes et
 * aucun ne remplace l'autre. `lean_mass` demande le corps (poids + taille) et n'est
 * donc évaluable qu'une fois ces champs saisis ; il PRIME quand il est calculable,
 * parce qu'il porte un chiffre concret (des kilos) là où l'autre n'a qu'un rang.
 */
export type BodyFatConcern = 'below_chart' | 'lean_mass';

export function bodyFatConcern(
  sex: Sex,
  pct: number | undefined | null,
  body?: Pick<BodyInput, 'age' | 'weight_kg' | 'height_cm'>,
): BodyFatConcern | null {
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0) return null;
  if (body && body.weight_kg > 0 && body.height_cm > 0) {
    const lmi = leanMassIndex({ ...body, sex, body_fat_pct: pct });
    if (lmi > FFMI_ATYPICAL_ABOVE[sex]) return 'lean_mass';
  }
  return isAtypicalBodyFat(sex, pct) ? 'below_chart' : null;
}

/** Entrées corporelles minimales — `UserProfile` les satisfait structurellement. */
export interface BodyInput {
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  body_fat_pct?: number;
  /** Femme ménopausée → plus de risque de perturbation ovulatoire (cf. plancher EA). */
  is_post_menopausal?: boolean;
}

export function bmiOf(b: Pick<BodyInput, 'weight_kg' | 'height_cm'>): number {
  const m = b.height_cm / 100;
  return m > 0 ? b.weight_kg / (m * m) : 0;
}

/**
 * % de masse grasse EFFECTIF. Si l'utilisateur ne l'a pas renseigné, on l'estime
 * (Deurenberg 1991) plutôt que de laisser la masse maigre indéfinie : le plancher
 * de sécurité et la base protéique en dépendent, ils ne peuvent pas être optionnels.
 *
 * C'est une estimation de POPULATION (±5 points d'écart-type individuel) : elle
 * sert à borner, jamais à afficher un % de masse grasse à l'utilisateur.
 */
export function resolvedBodyFatPct(b: BodyInput): number {
  const [lo, hi] = bodyFatBounds(b.sex);
  if (typeof b.body_fat_pct === 'number' && b.body_fat_pct > 0) {
    return clamp(b.body_fat_pct, lo, hi);
  }
  const bmi = bmiOf(b);
  const male = b.sex === 'male' ? 1 : 0;
  const est = 1.2 * bmi + 0.23 * b.age - 10.8 * male - 5.4;
  return clamp(est, lo, hi);
}

/** Masse maigre (kg), toujours définie (cf. `resolvedBodyFatPct`). */
export function fatFreeMassKg(b: BodyInput): number {
  return b.weight_kg * (1 - resolvedBodyFatPct(b) / 100);
}

// ── Plancher d'énergie disponible (EA) ───────────────────────────────────────
//
// EA = (apport − dépense d'exercice) / masse maigre. Le plancher historique
// (1500 kcal homme / 1200 femme) est ABSOLU : pour une femme de 65 kg à 25 % de
// masse grasse avec 400 kcal/jour de sport, il autorisait 1200 kcal là où le
// minimum physiologique est ~1862. C'est ce trou-là qu'on ferme.
//
// DEUX SEUILS, DE NATURE DIFFÉRENTE — c'est le point que la v1 de la spec avait
// confondu :
//   • 30 kcal/kg de masse maigre = seuil de RISQUE CLINIQUE (consensus IOC RED-S).
//     En dessous : perturbations endocriniennes, osseuses, immunitaires. C'est un
//     plancher de sécurité au sens propre → plancher DUR, les deux sexes.
//   • 35 = seuil de FONCTION OPTIMALE, issu des études sur la fonction ovulatoire.
//     En faire un plancher dur reviendrait à interdire toute énergie disponible
//     sous l'optimum — donc, dans une app de perte de poids, à interdire la perte
//     de poids (une femme de 65 kg n'aurait plus que 144 kcal/j de déficit, soit
//     0,13 kg/semaine : du maintien déguisé).
//
// Le risque RED-S n'est pas d'être à 32 pendant trois semaines, c'est d'y rester
// six mois. La zone 30–35 est donc AUTORISÉE mais BUDGÉTÉE dans le temps : au-delà
// de 12 semaines cumulées, le plancher remonte progressivement vers 35. Le produit
// ne bloque pas, il force une sortie de déficit — ce que ferait un coach compétent.

export const EA_HARD_FLOOR = 30;   // kcal/kg de masse maigre — plancher dur, les deux sexes
export const EA_OPTIMAL = 35;      // cible de fonction optimale — plafond de la remontée
export const LOW_EA_BUDGET_WEEKS = 12;      // semaines cumulées tolérées en zone basse
export const LOW_EA_WINDOW_DAYS = 365;      // fenêtre glissante du compteur (12 mois)
export const LOW_EA_STEP_PER_WEEK = 0.5;    // remontée du plancher par semaine de dépassement

/** Filet absolu conservé (CLAUDE.md §6) : attrape les gabarits extrêmes et les saisies aberrantes. */
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/**
 * Femme exposée au risque de perturbation ovulatoire → c'est la seule population
 * pour qui le plancher remonte au-delà du budget de 12 semaines. `undefined`
 * (champ non renseigné) est traité comme « à risque » : le défaut va vers la
 * protection, jamais vers la permissivité.
 */
export function isFemaleAtRisk(b: BodyInput): boolean {
  return b.sex === 'female' && !b.is_post_menopausal;
}

/**
 * Seuil d'énergie disponible EFFECTIF (kcal/kg de masse maigre), compte tenu du
 * temps déjà passé en zone basse. Reste à 30 tant que le budget n'est pas dépassé,
 * puis remonte de 0,5/semaine jusqu'à 35 — plafonné là.
 */
export function effectiveEaPerKgFfm(b: BodyInput, weeksInLowEa: number): number {
  if (!isFemaleAtRisk(b)) return EA_HARD_FLOOR;
  const overrun = Math.max(0, weeksInLowEa - LOW_EA_BUDGET_WEEKS);
  return Math.min(EA_OPTIMAL, EA_HARD_FLOOR + overrun * LOW_EA_STEP_PER_WEEK);
}

/**
 * Ce que la remontée du plancher fait VIVRE à la personne, en langage d'écran.
 *
 * ⚠️ Sans ça, la sortie de déficit est SILENCIEUSE — et c'est le défaut le plus
 * grave qu'il restait au moteur. Mesuré sur une femme de 62 kg, 26 %MG, 4 séances,
 * en sèche : à partir de la **semaine 14**, sa cible monte de **23 kcal/jour chaque
 * semaine, dix semaines de suite, +230 kcal/j au total**, sans qu'aucun écran ne
 * dise un mot. Elle est en sèche et ses calories augmentent toutes les semaines :
 * de son point de vue, l'app dérive. C'est exactement le bug P3.3 (« le TDEE saute
 * tout seul »), qui était classé 🔴 — sauf que celui-ci n'est pas un accident de
 * synchronisation, il est GARANTI par construction pour toute femme qui reste en
 * zone basse plus de 12 semaines. L'homme équivalent, lui, ne bouge pas d'un kcal
 * (seul le plancher féminin remonte, cf. `isFemaleAtRisk`).
 *
 * Renvoie `null` quand il n'y a rien à raconter : homme, ménopause déclarée, ou
 * budget non dépassé. La remontée est BORNÉE — dix crans de 0,5 kcal/kg pour aller
 * de 30 à 35 — d'où `weeksToPlateau`, qui permet à l'écran de promettre une fin.
 */
export type LowEaEscalation = {
  /** Semaines de dépassement du budget — chacune vaut un cran de plancher. */
  weeksOverBudget: number;
  /** Ce que la remontée ajoute à la cible CHAQUE semaine, en kcal/jour, pour CE corps. */
  weeklyKcal: number;
  /** Semaines restantes avant le plafond. 0 = la remontée est terminée. */
  weeksToPlateau: number;
  /** Seuil d'énergie disponible effectif du moment (kcal/kg de masse maigre). */
  eaPerKgFfm: number;
};

export function lowEaEscalation(b: BodyInput, weeksInLowEa: number): LowEaEscalation | null {
  if (!isFemaleAtRisk(b)) return null;
  const weeksOverBudget = Math.max(0, weeksInLowEa - LOW_EA_BUDGET_WEEKS);
  if (weeksOverBudget === 0) return null;
  const eaPerKgFfm = effectiveEaPerKgFfm(b, weeksInLowEa);
  return {
    weeksOverBudget,
    // Calculé sur SA masse maigre, jamais une constante d'écran : le pas est de
    // 0,5 kcal/kg, donc 23 kcal/j pour 46 kg de masse maigre et 33 pour 66 kg.
    // Annoncer un chiffre rond identique pour tout le monde serait un mensonge.
    weeklyKcal: Math.round(LOW_EA_STEP_PER_WEEK * fatFreeMassKg(b)),
    weeksToPlateau: Math.ceil((EA_OPTIMAL - eaPerKgFfm) / LOW_EA_STEP_PER_WEEK),
    eaPerKgFfm,
  };
}

/**
 * Plancher calorique du plan. Aucun chemin de code ne doit produire une cible sans
 * passer par ici — mode `manual` compris.
 *
 * ⚠️ L'ÉNERGIE DISPONIBLE EST UNE MOYENNE HEBDOMADAIRE, PAS UNE CONTRAINTE
 * QUOTIDIENNE (décision fondateur, 2026-07-29). Ce commentaire disait auparavant
 * « plancher RÉEL de la journée », ce qui était faux : `sportKcalPerDay` est la
 * dépense LISSÉE (semaine / 7), donc le jour de séance l'EA réellement servie est
 * plus basse que le seuil. Mesuré sur 378 profils par volume : 94 à 98 % des
 * profils sportifs sont sous 30 le jour de leur séance (moyenne 24,8–28,7,
 * minimum 23,4), et AUCUN sous 20. Le risque RED-S est chronique, pas journalier :
 * la moyenne est le bon cadre, et l'écart quotidien à volume normal est modéré et
 * systématique, pas un pic dangereux.
 *
 * ⚠️ CE QUI N'EST PAS COUVERT PAR CE CHOIX : le volume CONCENTRÉ (une très grosse
 * séance par semaine). Mesuré : `course 1×120` → 100 % des profils sous EA 20 le
 * jour de la séance, moyenne 8,1, minimum 2,3 — et l'EA devient négative à 1×180.
 * Ce n'est pas au plancher de rattraper ça (il ne sait pas quel jour porte quelle
 * séance) : c'est une saisie que le moteur ne sait pas honorer, à traiter par un
 * contrôle de plausibilité à la saisie. Non fait à ce jour.
 *
 * `sportKcalPerDay` est la dépense d'exercice moyenne : l'EA la soustrait de
 * l'apport, donc le plancher MONTE avec le volume d'entraînement. C'est
 * physiologiquement juste et parfaitement contre-intuitif côté utilisateur
 * (« je m'entraîne plus, l'app me fait manger plus alors que je veux maigrir ») :
 * l'UI doit l'expliquer au moment exact où le budget remonte.
 *
 * `maintenanceKcal` (TDEE) PLAFONNE la composante énergie disponible. INVARIANT
 * STRUCTUREL : un plancher de sécurité sert à empêcher un déficit excessif, JAMAIS
 * à imposer un surplus. Sans ce plafond, une femme dont l'EA de maintenance est
 * naturellement sous 35 (cas courant : 125 kg, 36 % de MG, sédentaire → EA 31,5)
 * voyait le plancher escaladé dépasser son TDEE de +282 kcal/jour, soit ~1,3 kg
 * de prise par mois prescrits par le garde-fou lui-même. Le BMR et le filet
 * absolu, eux, restent des minima DURS : si le TDEE tombe sous eux, c'est
 * l'estimation de dépense qui est fausse, pas le besoin physiologique.
 */
export function safetyFloorKcal(
  b: BodyInput,
  bmr: number,
  sportKcalPerDay: number,
  weeksInLowEa: number,
  maintenanceKcal: number,
): number {
  return safetyFloorBreakdown(b, bmr, sportKcalPerDay, weeksInLowEa, maintenanceKcal).floorKcal;
}

/** Quel des trois minima physiologiques a fixé le plancher. */
export type SafetyFloorSource = 'bmr' | 'energy_availability' | 'min_kcal';

export interface SafetyFloorBreakdown {
  /** Les trois candidats, arrondis, tels qu'ils entrent dans le `max`. */
  candidates: Record<SafetyFloorSource, number>;
  /** Celui qui a gagné. En cas d'égalité : bmr > energy_availability > min_kcal. */
  source: SafetyFloorSource;
  floorKcal: number;
}

/**
 * Le plancher, mais en montrant son travail.
 *
 * ⚠️ `safetyFloorKcal` en DÉRIVE (elle ne recalcule rien) : le nombre servi et le
 * nombre expliqué ne peuvent donc pas diverger. C'était le mode d'échec à éviter —
 * une explication qui se recalcule à côté finit toujours par mentir d'un kcal, et
 * un kcal d'écart suffit à faire dire à l'écran l'inverse de ce que le plan sert.
 */
export function safetyFloorBreakdown(
  b: BodyInput,
  bmr: number,
  sportKcalPerDay: number,
  weeksInLowEa: number,
  maintenanceKcal: number,
): SafetyFloorBreakdown {
  const eaFloor = effectiveEaPerKgFfm(b, weeksInLowEa) * fatFreeMassKg(b) + sportKcalPerDay;
  // Le plafond à la maintenance fait partie du candidat, pas d'un post-traitement :
  // sinon `candidates.energy_availability` annoncerait une valeur qui n'a jamais
  // concouru (cf. l'invariant « jamais de surplus » ci-dessus).
  const candidates: Record<SafetyFloorSource, number> = {
    bmr: Math.round(bmr),
    energy_availability: Math.round(Math.min(eaFloor, maintenanceKcal)),
    min_kcal: MIN_KCAL[b.sex],
  };
  const floorKcal = Math.max(candidates.bmr, candidates.energy_availability, candidates.min_kcal);
  // Ordre de départage FIXE — un `max` ne dit pas qui a gagné quand deux valeurs
  // sont égales, et l'écran a besoin d'une réponse stable d'un recalcul à l'autre.
  const source: SafetyFloorSource =
    candidates.bmr === floorKcal ? 'bmr'
      : candidates.energy_availability === floorKcal ? 'energy_availability'
        : 'min_kcal';
  return { candidates, source, floorKcal };
}

/**
 * Marge sous l'optimum en deçà de laquelle une semaine ne compte PLUS comme
 * restriction. Un demi-cran d'escalade (0,5 kcal/kg de masse maigre par semaine).
 *
 * ⚠️ SANS ELLE, LA PROTECTION NE SE RELÂCHE JAMAIS — et c'est structurel, pas un
 * cas limite. Le plancher escaladé vaut `seuil effectif × masse maigre + sport` :
 * quand l'escalade atteint son plafond, l'énergie disponible servie vaut donc
 * EXACTEMENT `EA_OPTIMAL`. Un test `< 35` sur cette valeur-là ne décide plus rien
 * de physiologique, il décide de l'arrondi au kcal du plancher.
 *
 * Mesuré sur 130 semaines (F 80 kg, sèche, suivi parfait) : l'EA servie oscillait
 * entre 34,99 et 35,01, le compteur saturait à ~46 semaines et n'en redescendait
 * plus, le déficit restait bloqué à 34 kcal/jour — 8 kg en deux ans et demi. La
 * documentation de `lowEaWeeksBefore` promet pourtant l'inverse : *« sans cela elle
 * restait verrouillée à déficit zéro à vie »*. Le registre pouvait se vider en
 * théorie ; en pratique la vanne ne s'ouvrait pas.
 *
 * Ce que la marge NE fait PAS : desserrer la zone à risque. Elle ne retire du
 * décompte que la bande 34,75–35, c'est-à-dire l'optimum lui-même — à comparer aux
 * 30 kcal/kg du seuil de risque clinique, cinq crans plus bas.
 */
export const EA_COUNT_TOLERANCE = LOW_EA_STEP_PER_WEEK / 2;

/**
 * Cette semaine compte-t-elle dans le budget d'exposition à l'énergie disponible
 * basse ? Deux conditions CUMULATIVES.
 *
 * Le déficit est la condition la moins évidente et la plus importante : le budget
 * RED-S modélise une RESTRICTION prolongée, pas une énergie disponible basse en
 * soi. Beaucoup de gens sont naturellement sous 35 kcal/kg de masse maigre à leur
 * maintenance — les compter revenait à sanctionner quelqu'un qui ne fait aucun
 * régime, et à faire monter son plancher jusqu'au surplus.
 *
 * Le seuil est `EA_OPTIMAL` MOINS une marge : un plan servi À l'optimum n'est pas
 * « sous l'optimum », et c'est précisément là que l'escalade dépose les gens
 * qu'elle a fait sortir du déficit (cf. `EA_COUNT_TOLERANCE`).
 */
export function countsAsLowEaWeek(
  b: BodyInput, targetKcal: number, maintenanceKcal: number, sportKcalPerDay: number,
): boolean {
  const inDeficit = targetKcal < maintenanceKcal - 1e-6;
  return inDeficit
    && energyAvailability(b, targetKcal, sportKcalPerDay) < EA_OPTIMAL - EA_COUNT_TOLERANCE;
}

/** Énergie disponible (kcal/kg de masse maigre) d'un plan donné. */
export function energyAvailability(b: BodyInput, targetKcal: number, sportKcalPerDay: number): number {
  const ffm = fatFreeMassKg(b);
  return ffm > 0 ? (targetKcal - sportKcalPerDay) / ffm : 0;
}

// ── Registre d'exposition en zone basse (fenêtre glissante 12 mois) ──────────
//
// Le registre répond à UNE question : combien de semaines cette personne a-t-elle
// PASSÉES en restriction sous l'énergie disponible optimale, sur les 12 derniers
// mois ? Cumulé et non consécutif — sinon une pause d'une semaine remettrait tout
// à zéro et le garde-fou ne servirait à rien.
//
// ⚠️ LA V1 RÉPONDAIT FAUX. Elle estampillait la semaine du RECALCUL : elle comptait
// donc des enregistrements, pas des semaines vécues. Deux femmes au comportement
// identique — six mois de sèche à EA 32 — obtenaient 26 semaines si elles se
// pesaient chaque semaine et 7 si elles se pesaient chaque mois. Soit ~221 kcal/jour
// de protection en moins pour la seconde, uniquement parce qu'elle ouvrait l'app
// moins souvent. Un garde-fou qui récompense la négligence n'est pas un garde-fou.
//
// D'où `since` : le plan servi reste EN VIGUEUR entre deux ouvertures. Tant qu'il
// est restrictif, chaque semaine ÉCOULÉE compte, recalcul ou pas — c'est ce que
// fait `settleLowEaExposure`, appelé AVANT le plancher. `since` retombe à null dès
// qu'un plan non restrictif est servi, donc une vraie pause n'est jamais facturée.

/** Lundi de la semaine contenant `stamp` ('YYYY-MM-DD', heure locale). */
export function weekStartStamp(stamp: string): string {
  const d = new Date(Date.parse(stamp + 'T00:00:00'));
  const dow = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - dow);
  return stampOf(d);
}

/** Registre vide — aucune exposition, aucune en cours. */
export const EMPTY_LOW_EA_REGISTRY: LowEaRegistry = { weeks: [], since: null };

/**
 * Lit la forme STOCKÉE, quelle que soit sa génération.
 *
 * Le tableau nu est la forme legacy (P0.1, livrée le 2026-07-28) : elle ne porte
 * pas de `since`, donc on la relit comme « aucune exposition en cours ». La chaîne
 * se ré-ouvre au premier recalcul suivant ; au pire on sous-compte l'écart depuis
 * le dernier recalcul en v1, soit quelques jours pour les seuls comptes créés dans
 * cette fenêtre-là. Sous-compter à la migration est le sens acceptable de l'erreur.
 */
export function readLowEaRegistry(stored: LowEaRegistryStored | undefined | null): LowEaRegistry {
  if (Array.isArray(stored)) return { weeks: [...stored], since: null };
  if (stored && Array.isArray(stored.weeks)) {
    return { weeks: [...stored.weeks], since: typeof stored.since === 'string' ? stored.since : null };
  }
  return { weeks: [], since: null };
}

// Purge des semaines sorties de la fenêtre → le registre reste borné (~52 entrées).
// `age < 0` (semaine dans le FUTUR) est CONSERVÉ, pas purgé : l'horloge peut reculer
// légitimement (vol vers l'ouest un lundi, fuseau +13 → -11, réglage manuel de la
// date). Purger détruirait définitivement une exposition réelle, et le profil purgé
// repart au cloud. Le comptage, lui, ignore déjà les stamps futurs.
function pruneWeeks(weeks: string[], today: string): string[] {
  return weeks.filter((w) => {
    const age = dayDiff(w, today);
    return Number.isFinite(age) && age <= LOW_EA_WINDOW_DAYS;
  });
}

// Garde-fou de boucle : la fenêtre fait 52 semaines, on ne remonte jamais plus loin.
// Protège d'un `since` corrompu (date 1970) qui ferait tourner le rattrapage 2 700 fois.
const MAX_BACKFILL_WEEKS = 60;

/**
 * Solde l'exposition ÉCOULÉE depuis `since`, avant tout calcul de plancher.
 *
 * C'est l'inversion de la v1 : au lieu d'estampiller l'instant du recalcul, on
 * inscrit toutes les semaines pendant lesquelles un plan restrictif était en
 * vigueur. Le résultat ne dépend plus de la fréquence d'ouverture de l'app.
 *
 * Appelée AVANT le plancher, jamais après : les semaines soldées sont de
 * l'HISTOIRE (elles ont eu lieu, quel que soit le plan qu'on s'apprête à servir),
 * et `lowEaWeeksBefore` exclut de toute façon la semaine courante — donc le calcul
 * du jour reste idempotent.
 */
export function settleLowEaExposure(
  stored: LowEaRegistryStored | undefined | null, today: string,
): LowEaRegistry {
  const reg = readLowEaRegistry(stored);
  const weeks = new Set(pruneWeeks(reg.weeks, today));
  if (reg.since) {
    const current = weekStartStamp(today);
    // On ne rattrape que dans la fenêtre : au-delà, les semaines sortiraient
    // aussitôt du comptage. Sans ce recalage, un `since` vieux de trois ans
    // épuisait le garde-fou de boucle AVANT d'atteindre les semaines qui comptent.
    const windowStart = weekStartStamp(addDays(today, -LOW_EA_WINDOW_DAYS));
    let w = weekStartStamp(reg.since);
    if (dayDiff(w, windowStart) > 0) w = windowStart;
    for (let i = 0; i <= MAX_BACKFILL_WEEKS && dayDiff(w, current) >= 0; i++) {
      if (dayDiff(w, today) <= LOW_EA_WINDOW_DAYS) weeks.add(w);
      w = addDays(w, 7);
    }
  }
  return { weeks: [...weeks].sort(), since: reg.since };
}

/**
 * Clôt le recalcul : ouvre l'exposition si le plan SERVI est restrictif, la ferme
 * sinon. `since` n'est jamais réinitialisé tant que la chaîne tient — c'est lui
 * qui permettra au prochain rattrapage de couvrir tout l'intervalle.
 *
 * Renvoie la même référence si rien ne change → recalculer sans nouvelle donnée ne
 * modifie pas le profil (et ne le marque donc pas « à pousser »).
 */
export function markLowEaWeek(reg: LowEaRegistry, today: string, isLowEa: boolean): LowEaRegistry {
  if (!isLowEa) return reg.since === null ? reg : { ...reg, since: null };
  const week = weekStartStamp(today);
  const weeks = reg.weeks.includes(week) ? reg.weeks : [...reg.weeks, week].sort();
  const since = reg.since ?? today;
  return weeks === reg.weeks && since === reg.since ? reg : { weeks, since };
}

/** Registre sans aucune information → `undefined`, pour ne rien persister d'inutile. */
export function collapseLowEaRegistry(reg: LowEaRegistry): LowEaRegistry | undefined {
  return reg.weeks.length || reg.since ? reg : undefined;
}

/** Semaines passées en zone basse sur les 12 derniers mois. */
export function lowEaWeeksInWindow(
  stored: LowEaRegistryStored | undefined | null, today: string,
): number {
  const { weeks } = readLowEaRegistry(stored);
  if (!weeks.length) return 0;
  const seen = new Set<string>();
  for (const w of weeks) {
    const age = dayDiff(w, today);
    if (age >= 0 && age <= LOW_EA_WINDOW_DAYS) seen.add(w);
  }
  return seen.size;
}

/**
 * Semaines en zone basse AVANT la semaine courante.
 *
 * C'est CE compteur qui pilote le plancher du jour, jamais `lowEaWeeksInWindow` :
 * la semaine en cours ne doit pas influencer le plancher qui sert à décider si
 * elle compte. Deux bénéfices, tous deux verrouillés par des tests :
 *  1. Idempotence — recalculer deux fois le même jour donne le même plancher,
 *     que la semaine ait été enregistrée (ou soldée) entre-temps ou non.
 *  2. Le registre peut se VIDER. En jugeant la restriction sur la cible
 *     réellement servie, une utilisatrice ramenée à sa maintenance par l'escalade
 *     cesse d'accumuler des semaines, et les anciennes sortent de la fenêtre.
 *     Sans cela elle restait verrouillée à « déficit zéro » à vie.
 *
 * ⚠️ CE QUE LE POINT 2 NE PROMET PAS — mesuré le 2026-07-31, parce qu'il a été lu
 * comme une promesse qu'il ne tient pas. Le registre ne se vide QUE si la
 * restriction cesse pour de bon. Or l'escalade ne ramène pas à la maintenance :
 * elle dépose la personne À l'optimum, où subsiste un déficit résiduel (34 à
 * 59 kcal/jour, mesuré sur une femme de 80 kg suivie 130 semaines). Ces semaines-là
 * comptent encore, le décompte se stabilise autour de 21–23, et le plancher reste à
 * son plafond. Autrement dit : après un long séjour en zone basse, la personne est
 * tenue à l'énergie disponible optimale, durablement et PAR CONSTRUCTION. Elle
 * continue de perdre, lentement (80 → 71 kg en 130 semaines) — elle n'est pas
 * arrêtée, elle est bridée.
 *
 * Ne pas « corriger » ça sans mesurer. Exiger un déficit MINIMAL pour qu'une
 * semaine compte (essayé : 5 % de la maintenance) vide bien le registre, mais
 * supprime le point fixe : la cible se met à osciller et l'écran d'escalade ne peut
 * plus promettre de fin à la remontée. Quatre tests de `sortie-deficit-ea.test.ts`
 * tombent — et ces tests-là défendent une phrase affichée à l'utilisatrice.
 */
export function lowEaWeeksBefore(
  stored: LowEaRegistryStored | undefined | null, today: string,
): number {
  const { weeks } = readLowEaRegistry(stored);
  if (!weeks.length) return 0;
  const current = weekStartStamp(today);
  return lowEaWeeksInWindow(weeks.filter((w) => w !== current), today);
}

/**
 * Compteur qui pilote le plancher : exposition soldée, PUIS semaines antérieures.
 * Point d'entrée unique — tout écran qui prévisualise un plan doit passer par ici,
 * sinon son aperçu diverge de ce que `computePlan` enregistrera.
 */
export function lowEaWeeksForFloor(
  stored: LowEaRegistryStored | undefined | null, today: string,
): number {
  return lowEaWeeksBefore(settleLowEaExposure(stored, today), today);
}

// ── Éligibilité ──────────────────────────────────────────────────────────────

export type EligibilityBlock =
  | 'MINOR'                        // < 18 ans — bloque la génération de plan
  | 'PREGNANCY_OR_NURSING'         // grossesse/allaitement — bloque (cf. lib/healthScreening.ts)
  | 'UNDERWEIGHT_CUT_BLOCKED'      // IMC de départ < 18,5 avec un objectif de sèche
  | 'TARGET_BMI_OUT_OF_RANGE'      // poids cible hors plage saine
  | 'TRAINING_VOLUME_IMPLAUSIBLE'; // > 20 h/semaine déclarées

/**
 * Âge minimum. Relevé de 16 à 18 ans (PR 1 / P0.4) pour DEUX raisons cumulées :
 * Mifflin-St Jeor n'est pas validée sous 19 ans (le moteur donnerait un chiffre
 * qu'on ne peut pas défendre), et servir un moteur de déficit calorique à un
 * adolescent est un risque de conformité App Store autant que de sécurité.
 */
export const MIN_AGE = 18;

// Bornes de saisie (à appliquer au niveau des champs, en plus des blocages ci-dessus).
export const AGE_BOUNDS: [number, number] = [MIN_AGE, 100];
export const WEIGHT_BOUNDS: [number, number] = [30, 300];
export const HEIGHT_BOUNDS: [number, number] = [120, 230];
export const MAX_WEEKLY_TRAINING_MIN = 20 * 60;

/**
 * Seuil d'insuffisance pondérale (OMS, adulte). Sert DEUX fois, à deux moments
 * différents de la vie d'un compte — c'est tout l'objet du correctif :
 *  • à l'ENTRÉE, `checkEligibility` refuse d'ouvrir une sèche en dessous ;
 *  • pendant la SÈCHE, `deficitBlocked` annule le déficit dès qu'on y descend.
 */
export const UNDERWEIGHT_BMI = 18.5;

// Plage d'IMC cible acceptable pour un objectif daté.
export const TARGET_BMI_MIN = UNDERWEIGHT_BMI;
export const TARGET_BMI_MAX = 30;

/**
 * Le corps est-il, AUJOURD'HUI, hors d'état de supporter un déficit ?
 *
 * L'éligibilité garde les portes d'ENTRÉE ; elle ne voit pas le temps passer.
 * Quelqu'un qui commence sa sèche à IMC 19 et descend à 17,8 en dix semaines
 * franchissait le seuil sans que rien ne bouge : le moteur continuait de servir
 * un déficit, et le seul garde-fou restant (le plancher d'énergie) autorise
 * précisément un déficit tant qu'on reste au-dessus de 30 kcal/kg de masse maigre.
 * Il n'existait donc AUCUN mécanisme pour arrêter une sèche qui va trop loin —
 * la faille la plus dangereuse du moteur, parce qu'elle ne se déclenche que chez
 * les personnes qui suivent le plan le plus assidûment.
 *
 * Vérifié à CHAQUE calcul, dans `floorAndFlags` : le plancher monte alors à la
 * maintenance. Pas de blocage de l'app, pas de surplus imposé — le plan cesse
 * simplement de creuser, et l'UI dit pourquoi.
 */
export function deficitBlocked(b: Pick<BodyInput, 'weight_kg' | 'height_cm'>): boolean {
  const bmi = bmiOf(b);
  return bmi > 0 && bmi < UNDERWEIGHT_BMI;
}

export interface EligibilityInput extends BodyInput {
  goal: Goal;
  sports?: SportSession[];
  /** Déclaré au portail de dépistage santé (cf. lib/healthScreening.ts). */
  pregnant_or_breastfeeding?: boolean;
}

/**
 * Situations où le moteur ne doit pas produire de plan (ou pas CET objectif).
 * `MINOR` et `PREGNANCY_OR_NURSING` bloquent la génération ; les autres bloquent
 * l'objectif concerné, pas l'app entière.
 */
export function checkEligibility(p: EligibilityInput, dated?: GoalTarget): EligibilityBlock[] {
  const blocks: EligibilityBlock[] = [];
  if (p.age < MIN_AGE) blocks.push('MINOR');
  if (p.pregnant_or_breastfeeding) blocks.push('PREGNANCY_OR_NURSING');

  // Même prédicat que le moteur (`deficitBlocked`) : le refus à l'entrée et
  // l'annulation du déficit en cours de route ne peuvent pas diverger.
  const isCut = p.goal === 'cut' || p.goal === 'cut_aggressive';
  if (isCut && deficitBlocked(p)) blocks.push('UNDERWEIGHT_CUT_BLOCKED');

  if (dated) {
    const m = p.height_cm / 100;
    const targetBmi = m > 0 ? dated.target_weight_kg / (m * m) : 0;
    // Borne BASSE : toujours bloquante (viser la dénutrition n'est jamais valide).
    // Borne HAUTE : bloquante seulement si la cible fait MONTER le poids au-dessus
    // d'IMC 30. Sinon on bloquerait la personne à IMC 40 qui vise IMC 32 — c'est-à-
    // dire exactement l'utilisatrice qu'on veut aider (correctif vs la spec v1).
    if (targetBmi < TARGET_BMI_MIN) blocks.push('TARGET_BMI_OUT_OF_RANGE');
    else if (targetBmi > TARGET_BMI_MAX && dated.target_weight_kg > p.weight_kg) {
      blocks.push('TARGET_BMI_OUT_OF_RANGE');
    }
  }

  if (totalWeeklyTrainingMinutes(p.sports) > MAX_WEEKLY_TRAINING_MIN) {
    blocks.push('TRAINING_VOLUME_IMPLAUSIBLE');
  }
  return blocks;
}

/** Ces blocages empêchent la génération d'un plan, ils ne se contentent pas d'avertir. */
export function blocksPlanGeneration(blocks: EligibilityBlock[]): boolean {
  return blocks.includes('MINOR') || blocks.includes('PREGNANCY_OR_NURSING');
}

/** Message utilisateur (FR) du blocage le plus prioritaire, ou null si éligible. */
export function eligibilityMessage(blocks: EligibilityBlock[]): string | null {
  if (blocks.includes('MINOR')) {
    return `Kyroz est réservé aux ${MIN_AGE} ans et plus.`;
  }
  if (blocks.includes('PREGNANCY_OR_NURSING')) {
    return 'Kyroz ne convient pas pendant la grossesse ou l\'allaitement. Parles-en à un professionnel de santé.';
  }
  if (blocks.includes('UNDERWEIGHT_CUT_BLOCKED')) {
    return 'Ton poids est déjà sous la plage de référence : Kyroz ne propose pas de sèche dans cette situation.';
  }
  if (blocks.includes('TARGET_BMI_OUT_OF_RANGE')) {
    return 'Ce poids cible sort de la plage saine pour ta taille. Choisis une cible intermédiaire.';
  }
  if (blocks.includes('TRAINING_VOLUME_IMPLAUSIBLE')) {
    return 'Le volume d\'entraînement déclaré dépasse 20 h/semaine. Vérifie tes séances.';
  }
  return null;
}
