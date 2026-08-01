import { describe, it, expect } from 'vitest';
import { buildLocalPlan, computeDistribution } from '../planEngine';
import { recalcProfile } from '../tdee';
import { MEAL_ORDER, UserProfile } from '../types';

/**
 * Plancher protéique par repas (`PROT_SHARE_FLOOR`, 2026-08-02).
 *
 * La cible protéique d'un repas se calcule sur le budget RESTANT : chaque repas qui
 * dépasse sa part rogne celle des suivants, et le DERNIER servi (la collation, dernière
 * de `MEAL_ORDER`) encaisse toute la dérive. Mesuré avant correctif sur un gabarit en
 * prise de masse : part équitable 12,7 g, cible réellement servie **5,4 g** — une densité
 * de 1,7 g de protéines pour 100 kcal qu'aucune collation ne peut viser. Le moteur
 * réclamait alors 47 g de glucides pour 311 kcal, la recette débordait en calories, et
 * 35 collations sur 79 étaient jugées « trop grosses » pour ce profil.
 *
 * Ce test échoue si le plancher disparaît : il vise le cas le plus exposé — beaucoup de
 * calories, peu de protéines par calorie (prise de masse).
 */
const gabarit = (over: Partial<UserProfile> = {}): UserProfile => recalcProfile({
  id: 'test', sex: 'female', age: 30, weight_kg: 70, height_cm: 168,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'bulk', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  ...over,
} as unknown as UserProfile);

describe('plancher protéique par repas', () => {
  it('le dernier repas servi n’est pas affamé par la dérive des précédents', () => {
    const p = gabarit();
    const dist = computeDistribution([...MEAL_ORDER], 'even');
    // Part ÉQUITABLE de la collation : sa fraction du budget protéique du jour.
    const equitable = p.target_protein_g * dist.snack;
    let n = 0;
    let pire = Infinity;
    for (const seed of [0, 1, 2, 3]) {
      for (const m of buildLocalPlan(p, seed).meals) {
        if (m.meal_type !== 'snack') continue;
        // La cible visée par le moteur, reconstruite : servi − écart résiduel.
        const cible = m.macros.protein_g - (m.adapt_gap?.protein_g ?? 0);
        pire = Math.min(pire, cible);
        n++;
      }
    }
    expect(n, 'collations mesurées').toBeGreaterThan(20);
    // Le plancher vaut 0,7 × part équitable ; on contrôle à 0,6 pour laisser
    // respirer les arrondis de la grille de portions sans rien concéder au fond.
    expect(pire, `cible protéique min de la collation (équitable ${equitable.toFixed(1)} g)`)
      .toBeGreaterThan(equitable * 0.6);
  });

  it('le plancher ne fait pas exploser les protéines du jour', () => {
    // ⚠️ Mesuré des DEUX côtés avant d'écrire ce test : sur 42 jours de ce gabarit,
    // le pire jour vaut ×1,135 de la cible protéique **avec ET sans** plancher
    // (moyenne 1,074 contre 1,070). Le dépassement quotidien ne vient donc PAS du
    // plancher — il vient de recettes plus protéinées que la cible, et il préexistait.
    // Ce test est un garde-fou : si le plancher se met un jour à dériver, il casse.
    const p = gabarit();
    for (const seed of [0, 1, 2]) {
      const jours = buildLocalPlan(p, seed).total_macros_per_day.map((m) => m.protein_g);
      for (const g of jours) {
        expect(g / p.target_protein_g, `seed ${seed}`).toBeLessThan(1.16);
      }
    }
  });
});
