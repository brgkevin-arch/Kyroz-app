import { describe, it, expect } from 'vitest';
import {
  datedGoalStatus, datedGoalKcalDelta, addDaysStamp, daysBetween,
  idealWeightAt, trackStatus, TRACK_TOLERANCE_KG,
  KCAL_PER_KG, MAX_LOSS_RATE_PCT, MAX_GAIN_RATE_PCT,
} from '../datedGoal';
import { calculateMacros, calculateTDEE, recalcProfile, MIN_KCAL } from '../tdee';
import { GoalTarget, UserProfile } from '../types';

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
    expect(datedGoalStatus(undefined, 80, TODAY)).toBeNull();
    expect(datedGoalKcalDelta(undefined, 80, TODAY)).toBeNull();
  });

  it('sèche douce : rythme non bridé, déficit modéré', () => {
    const s = datedGoalStatus(target(76, 12), 80, TODAY)!;
    expect(s.active).toBe(true);
    expect(s.direction).toBe('lose');
    expect(s.clamped).toBe(false);
    // -4 kg sur 12 sem = -0,333 kg/sem → -0,333*7700/7 ≈ -367 kcal/j
    expect(s.dailyKcalDelta).toBe(Math.round((-4 / 12) * KCAL_PER_KG / 7));
    expect(s.dailyKcalDelta).toBeLessThan(0);
    expect(s.reachableByDate).toBe(true);
  });

  it('sèche trop rapide : rythme bridé au plafond sûr (1 %/sem)', () => {
    const s = datedGoalStatus(target(70, 4), 80, TODAY)!;
    expect(s.clamped).toBe(true);
    // plafond = -1 % de 80 = -0,8 kg/sem
    const cap = -(MAX_LOSS_RATE_PCT / 100) * 80;
    expect(s.safeWeeklyKg).toBeCloseTo(cap, 5);
    expect(s.dailyKcalDelta).toBe(Math.round(cap * KCAL_PER_KG / 7)); // -880
    // au rythme sûr, l'atteinte tombe APRÈS la date visée
    expect(s.reachableByDate).toBe(false);
    expect(daysBetween(TODAY, s.projectedDate)).toBeGreaterThan(daysBetween(TODAY, s.targetDate));
  });

  it('prise trop rapide : bridée au plafond sûr (0,5 %/sem)', () => {
    const s = datedGoalStatus(target(78, 8, 70), 70, TODAY)!;
    expect(s.direction).toBe('gain');
    expect(s.clamped).toBe(true);
    // plafond = +0,5 % de 70 = +0,35 kg/sem → le delta calorique suit la valeur PRÉCISE
    // (safeWeeklyKg affiché est arrondi à 0,1, donc on teste le delta, pas l'arrondi).
    const cap = (MAX_GAIN_RATE_PCT / 100) * 70;
    expect(s.dailyKcalDelta).toBe(Math.round(cap * KCAL_PER_KG / 7)); // +385
    expect(s.dailyKcalDelta).toBeGreaterThan(0);
  });

  it('poids déjà atteint : maintien, delta 0, actif', () => {
    const s = datedGoalStatus(target(80.1, 8), 80, TODAY)!;
    expect(s.direction).toBe('maintain');
    expect(s.dailyKcalDelta).toBe(0);
    expect(s.active).toBe(true);
  });

  it('échéance passée : inactif, aucun pilotage', () => {
    const past: GoalTarget = { target_weight_kg: 74, target_date: addDaysStamp(TODAY, -7), start_weight_kg: 80, start_date: addDaysStamp(TODAY, -90) };
    const s = datedGoalStatus(past, 80, TODAY)!;
    expect(s.active).toBe(false);
    expect(datedGoalKcalDelta(past, 80, TODAY)).toBeNull();
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
  const base: UserProfile = {
    id: 'u', sex: 'male', age: 30, weight_kg: 80, height_cm: 180,
    activity_level: 'moderate', training_days_per_week: 4, goal: 'maintain',
    macro_mode: 'auto', tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: ['breakfast', 'lunch', 'dinner', 'snack'],
    meal_emphasis: 'even', variety: 'balanced', dietary_restrictions: [], disliked_foods: [], preferred_proteins: [], max_prep_time_min: 30,
  };

  it('sans objectif daté : comportement historique inchangé (goal maintain → cible = TDEE)', () => {
    const p = recalcProfile(base, TODAY);
    expect(p.target_kcal).toBe(p.tdee_kcal); // maintain = delta 0
  });

  it('objectif daté en sèche : la cible calorique baisse sous le TDEE', () => {
    const p = recalcProfile({ ...base, goal_target: target(74, 12) }, TODAY);
    const expectedDelta = datedGoalKcalDelta(target(74, 12), 80, TODAY)!;
    expect(expectedDelta).toBeLessThan(0);
    expect(p.target_kcal).toBe(Math.max(p.tdee_kcal + expectedDelta, MIN_KCAL.male));
    expect(p.target_kcal).toBeLessThan(p.tdee_kcal);
  });

  it('le plancher de sécurité MIN_KCAL prime sur un override extrême', () => {
    // override -5000 → target clampé au plancher, jamais en-dessous (§6)
    const m = calculateMacros(2000, 'cut', 80, 'male', undefined, -5000);
    expect(m.target_kcal).toBe(MIN_KCAL.male);
  });

  it('un rythme sûr ne peut pas descendre la cible sous le plancher pour un TDEE normal', () => {
    const tdee = calculateTDEE('male', 80, 180, 30, 4);
    const delta = datedGoalKcalDelta(target(60, 4), 80, TODAY)!; // objectif extrême → bridé -880
    expect(Math.max(tdee + delta, MIN_KCAL.male)).toBeGreaterThan(MIN_KCAL.male);
  });
});
