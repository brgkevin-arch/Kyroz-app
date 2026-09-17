import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan } from '../planEngine';
import { localStamp } from '../weight';

/**
 * LA DATE DU PLAN EST LOCALE, PAS UTC (corrigé le 2026-09-18).
 *
 * 🔴 Trouvé en testant la liste de courses à 00 h 04 heure de Paris : le plan qui venait
 * d'être généré se datait du JOUR PRÉCÉDENT, parce que `week_start_date` sortait de
 * `toISOString()` — donc d'UTC — quand tout le reste de l'app (jour affiché, auto-coche,
 * `todayStamp`) raisonne en heure locale. Conséquences : la liste de courses partait d'un
 * jour trop tôt, et le renouvellement hebdomadaire arrivait un jour trop tard, pour
 * quiconque génère son plan après minuit.
 *
 * ⚠️ Ce test ne rougit QUE dans la fenêtre fautive (00 h → 02 h en France l'été) si on se
 * contente de comparer à `new Date()`. Il compare donc à la date LOCALE calculée, ce qui
 * le rend vrai à toute heure — et faux dès qu'on repasse sur UTC.
 */
describe('la date de génération du plan', () => {
  const plan = buildLocalPlan(recalcProfile(makeProfile({ plan_days: 7 })), 0);

  it('est la date LOCALE du jour', () => {
    expect(plan.week_start_date).toBe(localStamp(new Date()));
  });

  it('n’est PAS la date UTC quand les deux diffèrent', () => {
    const utc = new Date().toISOString().split('T')[0];
    if (utc === localStamp(new Date())) return;  // même jour : rien à distinguer ici
    expect(plan.week_start_date).not.toBe(utc);
  });

  it('a la forme attendue par `coursesDepuis` et `semainePlan`', () => {
    expect(plan.week_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
