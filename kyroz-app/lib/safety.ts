import { Goal, GoalTarget, Sex, SportSession } from './types';
import { totalWeeklyTrainingMinutes } from './sport';

// Écart en jours entre deux stamps 'YYYY-MM-DD'. Dupliqué (petitement) depuis
// datedGoal.ts À DESSEIN : `datedGoal` dépend de `safety` (bornes de rythme), donc
// l'import inverse créerait un cycle. Trois lignes valent mieux qu'un cycle.
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000);
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
 * Plancher calorique RÉEL de la journée. Aucun chemin de code ne doit produire une
 * cible sans passer par ici — mode `manual` compris.
 *
 * `sportKcalPerDay` est la dépense d'exercice moyenne : l'EA la soustrait de
 * l'apport, donc le plancher MONTE avec le volume d'entraînement. C'est
 * physiologiquement juste et parfaitement contre-intuitif côté utilisateur
 * (« je m'entraîne plus, l'app me fait manger plus alors que je veux maigrir ») :
 * l'UI doit l'expliquer au moment exact où le budget remonte.
 */
export function safetyFloorKcal(
  b: BodyInput,
  bmr: number,
  sportKcalPerDay: number,
  weeksInLowEa: number,
): number {
  const eaFloor = effectiveEaPerKgFfm(b, weeksInLowEa) * fatFreeMassKg(b) + sportKcalPerDay;
  return Math.round(Math.max(bmr, eaFloor, MIN_KCAL[b.sex]));
}

/** Énergie disponible (kcal/kg de masse maigre) d'un plan donné. */
export function energyAvailability(b: BodyInput, targetKcal: number, sportKcalPerDay: number): number {
  const ffm = fatFreeMassKg(b);
  return ffm > 0 ? (targetKcal - sportKcalPerDay) / ffm : 0;
}

// ── Compteur d'exposition en zone basse (fenêtre glissante 12 mois) ──────────
//
// Stocké comme une LISTE de semaines (lundi de la semaine, 'YYYY-MM-DD') et non
// comme un entier : le compteur est CUMULÉ sur 12 mois glissants, pas consécutif
// — sinon une pause d'une semaine remettrait tout à zéro et le garde-fou ne
// servirait à rien. La liste est purgée au-delà de la fenêtre, donc bornée
// (52 entrées max).

/** Lundi de la semaine contenant `stamp` ('YYYY-MM-DD', heure locale). */
export function weekStartStamp(stamp: string): string {
  const d = new Date(Date.parse(stamp + 'T00:00:00'));
  const dow = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - dow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Semaines passées en zone basse sur les 12 derniers mois. */
export function lowEaWeeksInWindow(history: string[] | undefined, today: string): number {
  if (!history?.length) return 0;
  const seen = new Set<string>();
  for (const w of history) {
    const age = dayDiff(w, today);
    if (age >= 0 && age <= LOW_EA_WINDOW_DAYS) seen.add(w);
  }
  return seen.size;
}

/**
 * Enregistre la semaine courante comme « passée en zone basse ». Idempotent (une
 * semaine ne compte qu'une fois, quel que soit le nombre de recalculs) et purgeant
 * (les semaines sorties de la fenêtre disparaissent). Renvoie la même référence si
 * rien ne change → recalculer sans nouvelle donnée ne modifie pas le profil.
 */
export function recordLowEaWeek(history: string[] | undefined, today: string): string[] {
  const week = weekStartStamp(today);
  const kept = (history ?? []).filter((w) => {
    const age = dayDiff(w, today);
    return age >= 0 && age <= LOW_EA_WINDOW_DAYS;
  });
  if (kept.includes(week)) {
    return kept.length === (history?.length ?? 0) ? (history as string[]) : kept;
  }
  return [...kept, week].sort();
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

// Plage d'IMC cible acceptable pour un objectif daté.
export const TARGET_BMI_MIN = 18.5;
export const TARGET_BMI_MAX = 30;

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

  const isCut = p.goal === 'cut' || p.goal === 'cut_aggressive';
  if (isCut && bmiOf(p) < TARGET_BMI_MIN) blocks.push('UNDERWEIGHT_CUT_BLOCKED');

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
