import { describe, it, expect } from 'vitest';
import { buildLocalPlan } from '../planEngine';
import { makeProfile } from './helpers';

// Garde-fou de l'écart jour-à-jour (cf. tightenDay) : pour un profil normal, le
// total de CHAQUE jour doit rester proche de la cible — y compris sur un reroll
// (« Nouveau plan », seed ≠ 0), qui historiquement faisait déborder le total.
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

  it('écart jour-à-jour resserré : spread max ≤6% sur tous les objectifs (reroll inclus)', () => {
    for (const goal of ['cut', 'maintain', 'bulk'] as const) {
      const p = makeProfile({ goal, plan_days: 7 });
      for (const seed of [0, 3]) {
        const t = buildLocalPlan(p, seed).total_macros_per_day.map((m) => Math.round(m.kcal));
        const spread = Math.max(...t) - Math.min(...t);
        expect(spread / p.target_kcal, `${goal} seed ${seed}`).toBeLessThan(0.06);
      }
    }
  });
});
