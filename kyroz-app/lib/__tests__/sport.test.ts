import { describe, it, expect } from 'vitest';
import {
  SPORT_MET, sessionKcal, exerciseKcalPerWeek, exerciseKcalPerDay, totalSessionsPerWeek,
  MIN_SESSION_MIN, MAX_SESSION_MIN, MAX_SESSIONS_PER_WEEK,
} from '../sport';
import { SportSession } from '../types';

describe('sessionKcal (formule MET)', () => {
  it('P1.2 — kcal/min = (MET − 1) × 3.5 × poids / 200 : on crédite le MET NET', () => {
    // Le TDEE vaut `BMR × NEAT + sport` : le premier terme couvre déjà les 24 h de
    // la journée, séance comprise. Créditer le MET BRUT facturait donc deux fois
    // l'heure d'entraînement — une fois au repos, une fois à l'effort.
    // musculation MET 5.0 → net 4.0, 82 kg, 60 min → 4×3.5×82/200 × 60 = 344.4
    expect(sessionKcal('musculation', 82, 60)).toBeCloseTo(344.4, 1);
    // course MET 9.8 → net 8.8, 70 kg, 30 min → 8.8×3.5×70/200 × 30 = 323.4
    expect(sessionKcal('course', 70, 30)).toBeCloseTo(323.4, 1);
  });

  it('P1.2 — le double comptage retiré vaut 0,0025 × poids × minutes HEBDO par jour', () => {
    // Par séance : 1 MET × 3.5 × poids / 200 par minute = 0,0175 × poids × minutes.
    const brut = (met: number, kg: number, min: number) => (met * 3.5 * kg / 200) * min;
    expect(brut(5.0, 82, 60) - sessionKcal('musculation', 82, 60)).toBeCloseTo(0.0175 * 82 * 60, 6);
    expect(brut(9.8, 70, 30) - sessionKcal('course', 70, 30)).toBeCloseTo(0.0175 * 70 * 30, 6);
    // Ramené au JOUR (semaine / 7), c'est la formule de l'audit : 0,0025 × poids ×
    // minutes hebdo — soit 38 à 58 kcal/j sur les profils mesurés.
    const minutesHebdo = 4 * 60;
    const sports = [{ type: 'musculation' as const, sessions_per_week: 4, minutes_per_session: 60 }];
    const brutParJour = Math.round(brut(5.0, 82, 60) * 4) / 7;
    expect(brutParJour - exerciseKcalPerDay(sports, 82)).toBeCloseTo(0.0025 * 82 * minutesHebdo, 0);
  });

  it('P1.2 — reste positif, y compris pour le sport le moins intense de la table', () => {
    const minMet = Math.min(...Object.values(SPORT_MET));
    expect(minMet).toBeGreaterThan(1); // sinon le MET net serait nul ou négatif
    for (const type of Object.keys(SPORT_MET) as (keyof typeof SPORT_MET)[]) {
      expect(sessionKcal(type, 60, 60), type).toBeGreaterThan(0);
    }
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
