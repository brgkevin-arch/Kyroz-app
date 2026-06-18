import { describe, it, expect } from 'vitest';
import { buildLocalPlan } from '../planEngine';
import { makeProfile } from './helpers';
import { UserProfile } from '../types';

// Garde-fou de l'écart calorique (cf. tightenDay + lissage hebdo). Le plan
// canonique (seed 0) était déjà serré ; le reroll faisait déborder le total
// certains jours sur pool contraint. On vérifie : chaque jour proche de la cible,
// ET la SEMAINE qui converge vers days×cible (lissage hebdo borné ±50/jour).
describe('resserrage du total du jour', () => {
  it('profil normal : chaque jour à ≤8% de la cible, sur 6 seeds (canonique + rerolls)', () => {
    const p = makeProfile({ goal: 'cut', plan_days: 7 });
    for (const seed of [0, 1, 2, 3, 4, 5]) {
      const totals = buildLocalPlan(p, seed).total_macros_per_day.map((m) => m.kcal);
      for (const k of totals) {
        expect(Math.abs(k - p.target_kcal) / p.target_kcal, `seed ${seed}, jour ${k}`).toBeLessThan(0.08);
      }
    }
  });

  it('écart jour-à-jour resserré : spread max ≤7% sur tous les objectifs (reroll inclus)', () => {
    for (const goal of ['cut', 'maintain', 'bulk'] as const) {
      const p = makeProfile({ goal, plan_days: 7 });
      for (const seed of [0, 3]) {
        const t = buildLocalPlan(p, seed).total_macros_per_day.map((m) => Math.round(m.kcal));
        const spread = Math.max(...t) - Math.min(...t);
        expect(spread / p.target_kcal, `${goal} seed ${seed}`).toBeLessThan(0.07);
      }
    }
  });
});

describe('lissage hebdomadaire des calories', () => {
  it('la semaine converge vers days×cible (≤3%) sur profils raisonnables, reroll inclus', () => {
    const cases: Partial<UserProfile>[] = [
      {},
      { meal_emphasis: 'dinner', max_prep_time_min: 15 },
      { dietary_restrictions: ['vegetarian'] },
      { goal: 'bulk' },
    ];
    for (const over of cases) {
      const p = makeProfile({ plan_days: 7, ...over });
      for (const seed of [0, 3]) {
        const week = buildLocalPlan(p, seed).total_macros_per_day.reduce((s, m) => s + m.kcal, 0);
        const weekTarget = 7 * p.target_kcal;
        expect(Math.abs(week - weekTarget) / weekTarget, `${JSON.stringify(over)} seed ${seed}`).toBeLessThan(0.03);
      }
    }
  });

  it('lissage borné : aucun jour ne dépasse la cible de plus de ~80 kcal (cap +50 + tolérance)', () => {
    const p = makeProfile({ goal: 'cut', plan_days: 7, max_prep_time_min: 15, meal_emphasis: 'dinner' });
    for (const seed of [0, 1, 2, 3]) {
      const totals = buildLocalPlan(p, seed).total_macros_per_day.map((m) => m.kcal);
      for (const k of totals) expect(k - p.target_kcal, `seed ${seed}, jour ${k}`).toBeLessThan(80);
    }
  });
});
