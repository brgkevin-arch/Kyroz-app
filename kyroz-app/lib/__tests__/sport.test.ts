import { describe, it, expect } from 'vitest';
import {
  SPORT_MET, sessionKcal, exerciseKcalPerWeek, exerciseKcalPerDay, totalSessionsPerWeek,
  MIN_SESSION_MIN, MAX_SESSION_MIN, MAX_SESSIONS_PER_WEEK,
} from '../sport';
import { SportSession } from '../types';

describe('sessionKcal (formule MET)', () => {
  it('kcal/min = MET × 3.5 × poids / 200, multiplié par la durée', () => {
    // musculation MET 5.0, 82 kg, 60 min → 5×3.5×82/200 × 60 = 430.5
    expect(sessionKcal('musculation', 82, 60)).toBeCloseTo(430.5, 1);
    // course MET 9.8, 70 kg, 30 min → 9.8×3.5×70/200 × 30 = 360.15
    expect(sessionKcal('course', 70, 30)).toBeCloseTo(360.15, 1);
  });

  it('clampe la durée aux bornes [15, 180] min', () => {
    expect(sessionKcal('musculation', 82, 5)).toBe(sessionKcal('musculation', 82, MIN_SESSION_MIN));
    expect(sessionKcal('musculation', 82, 999)).toBe(sessionKcal('musculation', 82, MAX_SESSION_MIN));
  });
});

describe('exerciseKcalPerWeek', () => {
  it('somme les sports (additif)', () => {
    const sports: SportSession[] = [
      { type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }, // 430.5 × 4 = 1722
      { type: 'course', sessions_per_week: 2, minutes_per_session: 30 },      // 360.15(@70) — ici poids 82
    ];
    const expected =
      sessionKcal('musculation', 82, 60) * 4 + sessionKcal('course', 82, 30) * 2;
    expect(exerciseKcalPerWeek(sports, 82)).toBe(Math.round(expected));
  });

  it('renvoie 0 si vide, undefined, ou poids invalide', () => {
    expect(exerciseKcalPerWeek(undefined, 82)).toBe(0);
    expect(exerciseKcalPerWeek([], 82)).toBe(0);
    expect(exerciseKcalPerWeek([{ type: 'course', sessions_per_week: 3, minutes_per_session: 45 }], 0)).toBe(0);
  });

  it('ignore les séances à 0 et clampe la fréquence', () => {
    const zero: SportSession[] = [{ type: 'velo', sessions_per_week: 0, minutes_per_session: 60 }];
    expect(exerciseKcalPerWeek(zero, 82)).toBe(0);
    const tooMany: SportSession[] = [{ type: 'velo', sessions_per_week: 99, minutes_per_session: 60 }];
    const capped: SportSession[] = [{ type: 'velo', sessions_per_week: MAX_SESSIONS_PER_WEEK, minutes_per_session: 60 }];
    expect(exerciseKcalPerWeek(tooMany, 82)).toBe(exerciseKcalPerWeek(capped, 82));
  });

  it('exerciseKcalPerDay = semaine / 7', () => {
    const sports: SportSession[] = [{ type: 'musculation', sessions_per_week: 7, minutes_per_session: 60 }];
    expect(exerciseKcalPerDay(sports, 82)).toBe(Math.round(exerciseKcalPerWeek(sports, 82) / 7));
  });
});

describe('totalSessionsPerWeek', () => {
  it('cumule les fréquences (repli training_days)', () => {
    const sports: SportSession[] = [
      { type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 },
      { type: 'course', sessions_per_week: 2, minutes_per_session: 30 },
    ];
    expect(totalSessionsPerWeek(sports)).toBe(6);
    expect(totalSessionsPerWeek(undefined)).toBe(0);
  });
});

describe('table MET', () => {
  it('couvre les 10 sports avec des valeurs plausibles (3–12)', () => {
    const vals = Object.values(SPORT_MET);
    expect(vals).toHaveLength(10);
    for (const m of vals) expect(m).toBeGreaterThanOrEqual(3);
    for (const m of vals) expect(m).toBeLessThanOrEqual(12);
  });
});
