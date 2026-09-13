import { describe, it, expect } from 'vitest';
import { buildLocalPlan, registreKey } from '../planEngine';
import { recalcProfile } from '../tdee';
import { MEAL_ORDER, UserProfile } from '../types';
import { getEffectiveRecipes } from '../recipes';

/**
 * ROTATION PAR REGISTRE (D25) — ce que la personne VOIT au réveil.
 *
 * Le défaut mesuré le 2026-09-07 : un homme de 80 kg au maintien recevait sept
 * petits-déjeuners d'affilée en porridge, poudres et soja, et **la vague B10 — 25 recettes
 * du registre français, toutes conformes — n'y avait rien changé** (10 servies sur 336).
 * La cause n'était pas le catalogue : les 137 petits-déjeuners tiennent dans 5 % d'écart au
 * score, le panier n'en retient que 8 à 29, et le format « pain » y est structurellement
 * 1 % plus loin. Trois correctifs par le score ont été mesurés inefficaces avant celui-ci.
 *
 * ⚠️ Ce test ne mesure PAS la constante, il mesure le RÉSULTAT — c'est tout l'objet de la
 * fiche : une vague peut être verte partout et ne rien changer à l'assiette.
 */
const gabarit = (over: Partial<UserProfile> = {}): UserProfile => recalcProfile({
  id: 'test', sex: 'male', age: 30, weight_kg: 80, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'maintain', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  ...over,
} as unknown as UserProfile);

describe('rotation par registre', () => {
  it('une semaine de petits-déjeuners ne tient pas dans un seul registre', () => {
    const p = gabarit();
    for (const seed of [0, 1, 2, 3]) {
      const plan = buildLocalPlan(p, seed);
      const registres = plan.meals
        .filter((m) => m.meal_type === 'breakfast')
        .map((m) => registreKey(m.recipe));
      const distincts = new Set(registres).size;
      // Avant ce correctif, la semaine du H 80 maintien tenait dans 3 registres, dont
      // 5 repas sur 7 en « porridge » et « vegetal ».
      expect(distincts, `seed ${seed} : ${registres.join(', ')}`).toBeGreaterThanOrEqual(4);
      const parRegistre: Record<string, number> = {};
      for (const r of registres) parRegistre[r] = (parRegistre[r] ?? 0) + 1;
      expect(Math.max(...Object.values(parRegistre)), `seed ${seed} : ${JSON.stringify(parRegistre)}`).toBeLessThanOrEqual(3);
    }
  });

  it('le registre classe bien ce que le catalogue contient', () => {
    // Un garde-fou de données : si une vague introduit un féculent inconnu de `registreKey`,
    // ses recettes tombent toutes dans « autre » et cessent d'être mises en rotation — le
    // défaut redeviendrait invisible, exactement comme il l'était avant D25.
    const pdj = getEffectiveRecipes().filter((r) => r.tags.includes('breakfast'));
    const autres = pdj.filter((r) => registreKey(r) === 'autre');
    expect(autres.length / pdj.length, `« autre » : ${autres.map((r) => r.id).join(', ')}`).toBeLessThan(0.25);
  });
});
