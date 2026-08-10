// ── PALIERS D'UN GROS OBJECTIF (2026-08-10) ─────────────────────────────────
//
// Un objectif à douze mois ne produit aucun renforcement pendant douze mois. On
// découpe donc les gros objectifs en étapes de ~9 kg, et on met en avant la
// PROCHAINE plutôt que la lointaine.
//
// 🔴 C'EST UNE VUE, PAS UN OBJECTIF — et cette phrase est la décision du chantier.
//
// La tentation évidente est de faire du palier le vrai `goal_target` : le moteur
// piloterait vers lui, la date serait proche, tout serait cohérent. **Mesuré
// (`npm run mesure:paliers`), c'est un piège**, et il ne se voit que sur les gros
// écarts — donc précisément sur la population que les paliers visent :
//
//   | corps          | écart | objectif final | palier      | delta      |
//   |----------------|-------|----------------|-------------|------------|
//   | H 105 → 85 kg  | 20 kg | 2006 kcal      | 2006 kcal   | **0**      |
//   | F  95 → 78 kg  | 17 kg | 1607 kcal      | 1607 kcal   | **0**      |
//   | H 123 → 85 kg  | 38 kg | 2045 kcal      | 2291 kcal   | **+246**   |
//   | F 120 → 80 kg  | 40 kg | 1751 kcal      | 1968 kcal   | **+217**   |
//
// Sur 38 kg d'écart, le palier fait passer le rythme servi de 0,60 à 0,40 kg/semaine.
// La cause : une date proche redevient « tenable » AU CALCUL EN LIGNE DROITE
// (`diff / weeksRemaining`), donc A15 cesse de servir le rythme sûr maximal et retombe
// sur le rythme « juste requis » — qui sous-estime, puisque l'arrivée, elle, est
// SIMULÉE (dépense qui baisse, pause toutes les 9 semaines). C'est le défaut A15
// réintroduit par la porte de derrière, sur les gens qui ont le plus à perdre.
//
// ➡️ Donc : `goal_target` ne bouge pas, aucune calorie ne bouge, et ce module ne fait
// que LIRE la trajectoire que le moteur servira de toute façon.

import { GoalTarget } from './types';
import { daysBetween } from './datedGoal';

/**
 * Taille visée d'un palier (kg). Le brief disait « 8 à 10 » ; on prend le milieu et on
 * l'ajuste pour que les paliers soient ÉGAUX (cf. `milestoneCount`) — trois étapes de
 * 9,3 kg valent mieux que trois de 10 et un reliquat de 8, qui se lirait comme un
 * quatrième palier bâclé.
 */
export const MILESTONE_TARGET_KG = 9;

/** En deçà, on ne découpe pas : l'objectif est déjà à taille humaine. */
export const MILESTONE_MIN_TOTAL_KG = 15;

/** … ou si la trajectoire dépasse cette durée, même pour un écart plus petit. */
export const MILESTONE_MIN_DAYS = 183; // ~6 mois

export interface Milestone {
  /** 1-indexé — c'est un numéro d'étape affiché, pas un index de tableau. */
  index: number;
  total: number;
  weightKg: number;
  /**
   * Date à laquelle le moteur atteint CE poids, lue sur la trajectoire simulée.
   * `null` quand la simulation ne va pas jusque-là (horizon, rythme nul) : on préfère
   * une étape sans date à une date inventée.
   */
  stamp: string | null;
}

/**
 * Faut-il découper cet objectif ?
 *
 * ⚠️ Les DEUX critères comptent, et pas seulement le poids : 12 kg à perdre sur
 * 14 mois (gabarit léger, rythme sûr bas) souffre exactement du même défaut de
 * renforcement qu'un gros écart. Le brief ne parlait que du poids ; la durée est ce
 * qui l'attrape.
 */
export function needsMilestones(totalKg: number, projectedDays: number | null): boolean {
  if (Math.abs(totalKg) >= MILESTONE_MIN_TOTAL_KG) return true;
  return projectedDays != null && projectedDays >= MILESTONE_MIN_DAYS;
}

/** Nombre de paliers — au moins 2 dès qu'on découpe, sinon le découpage n'en est pas un. */
export function milestoneCount(totalKg: number): number {
  return Math.max(2, Math.round(Math.abs(totalKg) / MILESTONE_TARGET_KG));
}

/**
 * Les paliers d'un objectif, datés SUR LA TRAJECTOIRE SIMULÉE.
 *
 * ⚠️ Les dates ne sont pas interpolées linéairement entre aujourd'hui et l'échéance :
 * ce serait la ligne droite que §10 interdit — celle qui annonce « en retard » à
 * quelqu'un qui suit le plan à la lettre. On lit le journal semaine par semaine que le
 * moteur produit déjà (`simulatedTrajectory`), donc chaque date de palier est celle où
 * il atteindra vraiment ce poids, pauses comprises.
 *
 * `journal` vide → les paliers sortent quand même, sans date : leur POIDS est une
 * information juste même quand l'arrivée ne l'est pas.
 */
export function milestonesFor(
  target: GoalTarget,
  currentWeightKg: number,
  journal: { stamp: string; weightKg: number }[],
): Milestone[] {
  const total = target.start_weight_kg - target.target_weight_kg;
  if (Math.abs(total) < 1e-9) return [];
  const n = milestoneCount(total);
  const perdre = total > 0;

  const out: Milestone[] = [];
  for (let i = 1; i <= n; i++) {
    // Le DERNIER palier vaut exactement la cible : un arrondi qui laisserait 200 g
    // d'écart afficherait une étape finale que la personne ne peut pas cocher.
    const weightKg = i === n
      ? target.target_weight_kg
      : Math.round((target.start_weight_kg - (total * i) / n) * 10) / 10;
    const atteint = journal.find((j) => (perdre ? j.weightKg <= weightKg : j.weightKg >= weightKg));
    out.push({ index: i, total: n, weightKg, stamp: atteint?.stamp ?? null });
  }
  return out;
}

/**
 * Le palier COURANT — le premier que la personne n'a pas encore franchi.
 *
 * ⚠️ Se lit sur le poids ACTUEL, jamais sur une progression stockée : un palier franchi
 * puis reperdu (le poids remonte de 500 g) doit redevenir le palier courant. Une copie
 * stockée du « palier atteint » serait une seconde source de vérité qui se désynchronise
 * au premier écart de balance — CLAUDE.md §10.
 *
 * `null` = tous franchis (l'objectif est atteint, il n'y a plus d'étape à montrer).
 */
export function currentMilestone(
  milestones: Milestone[], currentWeightKg: number, target: GoalTarget,
): Milestone | null {
  const perdre = target.start_weight_kg > target.target_weight_kg;
  return milestones.find((m) => (perdre ? currentWeightKg > m.weightKg : currentWeightKg < m.weightKg)) ?? null;
}

/**
 * Progression DANS le palier courant (0 → 1), pour la jauge.
 *
 * ⚠️ Bornée à [0, 1] : au-dessus du poids de départ du palier (la personne a repris),
 * une valeur négative retournerait la jauge. On affiche 0 — « tu n'as pas encore
 * entamé cette étape », jamais « tu es en négatif ».
 */
export function milestoneProgress(
  m: Milestone, milestones: Milestone[], currentWeightKg: number, target: GoalTarget,
): number {
  const depart = m.index === 1 ? target.start_weight_kg : milestones[m.index - 2].weightKg;
  const denom = depart - m.weightKg;
  if (Math.abs(denom) < 1e-9) return 1;
  return Math.min(Math.max((depart - currentWeightKg) / denom, 0), 1);
}

/** Jours restants avant la date d'un palier, ou `null` si elle n'est pas connue. */
export function daysToMilestone(m: Milestone, today: string): number | null {
  return m.stamp ? Math.max(0, daysBetween(today, m.stamp)) : null;
}
