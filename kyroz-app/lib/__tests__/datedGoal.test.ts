import { describe, it, expect } from 'vitest';
import {
  datedGoalStatus, datedGoalKcalDelta, addDaysStamp, daysBetween,
  idealWeightAt, trackStatus, TRACK_TOLERANCE_KG,
  KCAL_PER_KG_FAT, KCAL_PER_KG_GAIN, MAX_GAIN_RATE_PCT, maxWeeklyLossPct,
} from '../datedGoal';
import { calculateMacros, computePlan, recalcProfile, MIN_KCAL } from '../tdee';
import { makeProfile } from './helpers';
import { GoalTarget, UserProfile } from '../types';

// Corps de référence pour la trajectoire. `recomp` est volontairement NEUTRE :
// aucun sens d'objectif n'est imposé, donc aucun GOAL_DIRECTION_MISMATCH ne vient
// parasiter les tests de rythme (cf. P0.3).
const BODY80 = makeProfile({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, goal: 'recomp' });
const BODY70 = makeProfile({ sex: 'male', age: 30, weight_kg: 70, height_cm: 180, goal: 'recomp' });
const TDEE = 2914; // assez haut pour que le plafond des 25 % ne morde pas ici

const TODAY = '2026-07-21';
const inWeeks = (n: number) => addDaysStamp(TODAY, n * 7);

const target = (weight: number, weeks: number, start = 80): GoalTarget => ({
  target_weight_kg: weight,
  target_date: inWeeks(weeks),
  start_weight_kg: start,
  start_date: TODAY,
});

describe('helpers de date', () => {
  it('addDaysStamp / daysBetween sont cohérents', () => {
    expect(daysBetween(TODAY, addDaysStamp(TODAY, 84))).toBe(84);
    expect(daysBetween(TODAY, inWeeks(12))).toBe(84);
  });
});

describe('datedGoalStatus — trajectoire', () => {
  it('renvoie null sans objectif', () => {
    expect(datedGoalStatus(undefined, BODY80, TODAY, TDEE, null)).toBeNull();
    expect(datedGoalKcalDelta(undefined, BODY80, TODAY, TDEE)).toBeNull();
  });

  it('sèche douce : rythme non bridé, déficit modéré', () => {
    const s = datedGoalStatus(target(76, 12), BODY80, TODAY, TDEE, null)!;
    expect(s.active).toBe(true);
    expect(s.direction).toBe('lose');
    expect(s.clamped).toBe(false);
    expect(s.deficitCapped).toBe(false);
    // -4 kg sur 12 sem = -0,333 kg/sem → -0,333*7700/7 ≈ -367 kcal/j
    expect(s.dailyKcalDelta).toBe(Math.round((-4 / 12) * KCAL_PER_KG_FAT / 7));
    expect(s.dailyKcalDelta).toBeLessThan(0);
    expect(s.reachableByDate).toBe(true);
  });

  it('sèche trop rapide : rythme bridé au plafond sûr (modulé par l adiposité)', () => {
    const s = datedGoalStatus(target(70, 4), BODY80, TODAY, TDEE, null)!;
    expect(s.clamped).toBe(true);
    // %MG estimé ~20 % → ni sec ni très gras → plafond 0,75 %/sem = -0,6 kg/sem
    expect(maxWeeklyLossPct(BODY80)).toBe(0.75);
    const cap = -(maxWeeklyLossPct(BODY80) / 100) * 80;
    expect(s.safeWeeklyKg).toBeCloseTo(cap, 1);
    expect(s.dailyKcalDelta).toBe(Math.round(cap * KCAL_PER_KG_FAT / 7)); // -660
    // au rythme sûr, l'atteinte tombe APRÈS la date visée
    expect(s.reachableByDate).toBe(false);
    expect(daysBetween(TODAY, s.projectedDate)).toBeGreaterThan(daysBetween(TODAY, s.targetDate));
  });

  it('prise trop rapide : bridée au plafond sûr (0,5 %/sem)', () => {
    const s = datedGoalStatus(target(78, 8, 70), BODY70, TODAY, 2700, null)!;
    expect(s.direction).toBe('gain');
    expect(s.clamped).toBe(true);
    // plafond = +0,5 % de 70 = +0,35 kg/sem. Le kg PRIS coûte 5000 kcal (tissu mixte,
    // muscle très hydraté) et non 7700 : appliquer 7700 sur-prescrirait le surplus.
    const cap = (MAX_GAIN_RATE_PCT / 100) * 70;
    expect(s.dailyKcalDelta).toBe(Math.round(cap * KCAL_PER_KG_GAIN / 7)); // +250
    expect(s.dailyKcalDelta).toBeGreaterThan(0);
  });

  it('poids déjà atteint : maintien, delta 0, actif', () => {
    const s = datedGoalStatus(target(80.1, 8), BODY80, TODAY, TDEE, null)!;
    expect(s.direction).toBe('maintain');
    expect(s.dailyKcalDelta).toBe(0);
    expect(s.active).toBe(true);
  });

  it('échéance passée : inactif, aucun pilotage', () => {
    const past: GoalTarget = { target_weight_kg: 74, target_date: addDaysStamp(TODAY, -7), start_weight_kg: 80, start_date: addDaysStamp(TODAY, -90) };
    const s = datedGoalStatus(past, BODY80, TODAY, TDEE, null)!;
    expect(s.active).toBe(false);
    expect(datedGoalKcalDelta(past, BODY80, TODAY, TDEE)).toBeNull();
  });
});

describe('trajectoire idéale & verdict de pente (module Transformation)', () => {
  // 80 → 76 kg entre le 21/07 et le 15/09 (56 jours).
  const gt: GoalTarget = { target_weight_kg: 76, target_date: '2026-09-15', start_weight_kg: 80, start_date: '2026-07-21' };

  it('interpole linéairement entre départ et cible', () => {
    expect(idealWeightAt(gt, '2026-07-21')).toBe(80);
    expect(idealWeightAt(gt, '2026-09-15')).toBe(76);
    expect(idealWeightAt(gt, '2026-08-18')).toBeCloseTo(78, 1); // mi-parcours
  });

  it('borne aux extrémités (avant le départ / après l échéance)', () => {
    expect(idealWeightAt(gt, '2026-07-01')).toBe(80);
    expect(idealWeightAt(gt, '2027-01-01')).toBe(76);
  });

  it('en sèche : nettement au-dessus de l idéal = en retard, en dessous = en avance', () => {
    expect(trackStatus(gt, 79.5, '2026-08-18')!.state).toBe('behind'); // idéal 78, +1,5 kg
    expect(trackStatus(gt, 76.5, '2026-08-18')!.state).toBe('ahead');
    expect(trackStatus(gt, 78.0, '2026-08-18')!.state).toBe('on_track');
  });

  it('zone LARGE (±1 kg) : le bruit de balance reste « dans la zone » (anti-charge mentale)', () => {
    const s = trackStatus(gt, 78.9, '2026-08-18')!; // 0,9 kg au-dessus de l idéal → rassurant
    expect(s.state).toBe('on_track');
    expect(Math.abs(s.deltaKg)).toBeLessThanOrEqual(TRACK_TOLERANCE_KG);
    expect(TRACK_TOLERANCE_KG).toBe(1.0);
  });

  it('en PRISE de masse, le sens du retard s inverse', () => {
    const bulk: GoalTarget = { target_weight_kg: 84, target_date: '2026-09-15', start_weight_kg: 80, start_date: '2026-07-21' };
    expect(trackStatus(bulk, 80.5, '2026-08-18')!.state).toBe('behind'); // idéal 82 → trop léger
    expect(trackStatus(bulk, 83.5, '2026-08-18')!.state).toBe('ahead');
  });

  it('renvoie null sans objectif', () => {
    expect(trackStatus(undefined, 80, TODAY)).toBeNull();
  });
});

describe('intégration cerveau macro (recalcProfile / calculateMacros)', () => {
  const base: UserProfile = makeProfile({
    sex: 'male', age: 30, weight_kg: 80, height_cm: 180, training_days_per_week: 4,
    goal: 'maintain', tdee_kcal: 0, target_kcal: 0,
  });

  it('sans objectif daté : comportement historique inchangé (goal maintain → cible = TDEE)', () => {
    const p = recalcProfile(base, TODAY);
    expect(p.target_kcal).toBe(p.tdee_kcal); // maintain = delta 0
  });

  it('objectif daté en sèche : la cible calorique baisse sous le TDEE', () => {
    const p = recalcProfile({ ...base, goal_target: target(74, 12) }, TODAY);
    const expectedDelta = datedGoalKcalDelta(target(74, 12), base, TODAY, p.tdee_kcal)!;
    const { floor_kcal } = computePlan({ ...base, goal_target: target(74, 12) }, TODAY);
    expect(expectedDelta).toBeLessThan(0);
    expect(p.target_kcal).toBe(Math.max(p.tdee_kcal + expectedDelta, floor_kcal));
    expect(p.target_kcal).toBeLessThan(p.tdee_kcal);
  });

  it('le plancher de sécurité prime sur un override extrême (§6 + P0.1)', () => {
    // override -5000 → la cible est ramenée AU PLANCHER, jamais en dessous, et le
    // plancher réel (énergie disponible) est au-dessus du filet absolu 1500.
    const m = calculateMacros(2000, 'cut', base, { kcalDeltaOverride: -5000 });
    expect(m.target_kcal).toBe(m.floor_kcal);
    expect(m.target_kcal).toBeGreaterThan(MIN_KCAL.male);
    expect(m.flags).toContain('FLOOR_APPLIED');
  });

  it('un objectif extrême est bridé par le rythme ET par le plafond des 25 % du TDEE', () => {
    const p = recalcProfile({ ...base, goal_target: target(60, 4) }, TODAY);
    expect(p.target_kcal).toBeGreaterThan(MIN_KCAL.male);
    expect(p.tdee_kcal - p.target_kcal).toBeLessThanOrEqual(Math.round(0.25 * p.tdee_kcal));
  });
});
