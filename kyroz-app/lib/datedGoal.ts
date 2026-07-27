import { localStamp } from './weight';
import { GoalTarget } from './types';

// ── Objectif daté (feature premium « Kyroz+ ») ───────────────────────────────
// « Les clés ET le coffre » : le core gratuit donne un bon plan ; l'objectif daté
// pilote la CIBLE CALORIQUE dans le temps pour amener l'utilisateur à un poids
// précis à une date précise — au rythme le plus rapide MAIS SÛR.
//
// Principe : ce module ne fait QUE de la trajectoire (math pure, testable). Il
// produit un `dailyKcalDelta` (signé) qui remplace le delta figé de l'objectif
// (`GOAL_CONFIG[goal].kcalDelta`) dans `recalcProfile` → un seul cerveau macro,
// et le plancher de sécurité (MIN_KCAL, §6) reste appliqué en aval.

// kcal ≈ pour 1 kg de masse corporelle (référence usuelle « 7700 kcal / kg »).
export const KCAL_PER_KG = 7700;

// Rythmes SÛRS (garde-fou santé), en % du poids de corps par semaine.
// Sèche : jamais plus de 1 %/sem (au-delà = fonte musculaire). Prise : 0,5 %/sem
// (au-delà = gras). Ces bornes plafonnent un objectif trop ambitieux plutôt que
// de proposer un rythme dangereux — la sécurité est un argument de vente.
export const MAX_LOSS_RATE_PCT = 1.0;
export const MAX_GAIN_RATE_PCT = 0.5;

// En-deçà de cet écart au poids cible, on considère l'objectif « atteint » → maintien.
export const MAINTAIN_EPS_KG = 0.3;

export interface DatedGoalStatus {
  active: boolean;            // false = pas d'objectif OU échéance passée (plus de pilotage)
  direction: 'lose' | 'gain' | 'maintain';
  currentWeightKg: number;
  targetWeightKg: number;
  targetDate: string;        // 'YYYY-MM-DD'
  weeksRemaining: number;    // arrondi 0,1
  requiredWeeklyKg: number;  // signé (négatif = perdre) — pour tenir la DATE
  safeWeeklyKg: number;      // signé, plafonné au rythme sûr
  clamped: boolean;          // true = objectif trop rapide pour la date (rythme bridé)
  projectedDate: string;     // date réelle d'atteinte AU RYTHME SÛR
  reachableByDate: boolean;  // false = tu y arrives après ta date
  dailyKcalDelta: number;    // signé, alimente le cerveau macro (recalcProfile)
}

// Différence en jours entre deux stamps 'YYYY-MM-DD' (heure LOCALE, cf. weight.ts).
export function daysBetween(a: string, b: string): number {
  const da = Date.parse(a + 'T00:00:00');
  const db = Date.parse(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}
export function addDaysStamp(stamp: string, days: number): string {
  const d = new Date(Date.parse(stamp + 'T00:00:00'));
  d.setDate(d.getDate() + Math.round(days));
  return localStamp(d);
}
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Trajectoire d'un objectif daté à partir du poids ACTUEL et de la date du jour.
 * Renvoie null s'il n'y a pas d'objectif. `active=false` si l'échéance est passée
 * (on ne pilote plus les calories : retour au delta d'objectif normal en aval).
 */
export function datedGoalStatus(
  target: GoalTarget | undefined | null,
  currentWeightKg: number,
  today: string,
): DatedGoalStatus | null {
  if (!target) return null;

  const daysLeft = daysBetween(today, target.target_date);
  const weeksRemaining = daysLeft / 7;
  const diff = target.target_weight_kg - currentWeightKg; // signé (négatif = perdre)
  const direction: DatedGoalStatus['direction'] =
    Math.abs(diff) < MAINTAIN_EPS_KG ? 'maintain' : diff < 0 ? 'lose' : 'gain';

  const base = {
    currentWeightKg,
    targetWeightKg: target.target_weight_kg,
    targetDate: target.target_date,
    weeksRemaining: round1(Math.max(weeksRemaining, 0)),
    direction,
  };

  // Échéance passée/nulle → inactif. Objectif déjà atteint → maintien (delta 0, actif).
  if (daysLeft <= 0 || direction === 'maintain') {
    return {
      ...base,
      active: direction === 'maintain' && daysLeft > 0,
      requiredWeeklyKg: 0,
      safeWeeklyKg: 0,
      clamped: false,
      projectedDate: target.target_date,
      reachableByDate: true,
      dailyKcalDelta: 0,
    };
  }

  const requiredWeeklyKg = diff / weeksRemaining; // signé
  const maxLoss = -(MAX_LOSS_RATE_PCT / 100) * currentWeightKg;
  const maxGain = (MAX_GAIN_RATE_PCT / 100) * currentWeightKg;
  const safeWeeklyKg = Math.min(Math.max(requiredWeeklyKg, maxLoss), maxGain);
  const clamped = Math.abs(safeWeeklyKg - requiredWeeklyKg) > 1e-6;

  // Date réelle d'atteinte au rythme sûr (si bridé, plus tard que la date visée).
  const weeksNeeded = safeWeeklyKg !== 0 ? diff / safeWeeklyKg : weeksRemaining;
  const projectedDate = addDaysStamp(today, weeksNeeded * 7);
  const reachableByDate = weeksNeeded <= weeksRemaining + 1e-6;

  const dailyKcalDelta = Math.round((safeWeeklyKg * KCAL_PER_KG) / 7);

  return {
    ...base,
    active: true,
    requiredWeeklyKg: round1(requiredWeeklyKg),
    safeWeeklyKg: round1(safeWeeklyKg),
    clamped,
    projectedDate,
    reachableByDate,
    dailyKcalDelta,
  };
}

// ── « Suis-je sur la bonne pente ? » (module Transformation) ─────────────────

/**
 * Poids « idéal » à une date donnée, sur la trajectoire LINÉAIRE départ → cible.
 * Borné aux deux extrémités (avant le départ = poids de départ ; après l'échéance
 * = poids cible). Sert de référence à la courbe et au verdict d'avancement.
 */
export function idealWeightAt(target: GoalTarget, stamp: string): number {
  const total = daysBetween(target.start_date, target.target_date);
  if (total <= 0) return target.target_weight_kg;
  const elapsed = Math.min(Math.max(daysBetween(target.start_date, stamp), 0), total);
  return target.start_weight_kg + (target.target_weight_kg - target.start_weight_kg) * (elapsed / total);
}

export type TrackState = 'ahead' | 'on_track' | 'behind';

export interface TrackStatus {
  idealNowKg: number;  // où tu devrais être aujourd'hui
  deltaKg: number;     // actuel − idéal (signé)
  state: TrackState;
}

// Demi-largeur de la ZONE « sur la pente ». Volontairement LARGE (±1 kg) : le poids
// fluctue de 1-2 kg/jour (eau, sel, glycogène) — une tolérance étroite transformerait
// du bruit de balance en « échec » et créerait de la charge mentale (anti-North Star).
// On préfère rassurer : tant qu'on est dans le couloir, c'est bon.
export const TRACK_TOLERANCE_KG = 1.0;

/**
 * Verdict d'avancement vs la trajectoire idéale. `behind` dépend du SENS de
 * l'objectif : en sèche, être au-dessus de l'idéal = en retard ; en prise, c'est
 * l'inverse. Renvoie null sans objectif.
 */
export function trackStatus(
  target: GoalTarget | undefined | null,
  currentWeightKg: number,
  today: string,
): TrackStatus | null {
  if (!target) return null;
  const idealNow = idealWeightAt(target, today);
  const delta = currentWeightKg - idealNow;
  const losing = target.target_weight_kg < target.start_weight_kg;
  let state: TrackState = 'on_track';
  if (Math.abs(delta) > TRACK_TOLERANCE_KG) {
    state = (losing ? delta > 0 : delta < 0) ? 'behind' : 'ahead';
  }
  return { idealNowKg: round1(idealNow), deltaKg: round1(delta), state };
}

/**
 * Delta calorique quotidien (signé) à injecter dans le cerveau macro, ou null si
 * pas d'objectif daté actif (→ le calcul retombe sur le delta d'objectif normal).
 */
export function datedGoalKcalDelta(
  target: GoalTarget | undefined | null,
  currentWeightKg: number,
  today: string,
): number | null {
  const s = datedGoalStatus(target, currentWeightKg, today);
  return s && s.active ? s.dailyKcalDelta : null;
}
