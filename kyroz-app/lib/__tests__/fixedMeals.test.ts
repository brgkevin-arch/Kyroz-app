import { describe, it, expect } from 'vitest';
import { buildLocalPlan, swapMeal, rebalanceDay, profileSignature } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { makeProfile } from './helpers';
import { FixedMeal } from '../types';

const breakfastFix: FixedMeal = {
  label: 'Mon shaker + flocons',
  source: 'estimate',
  macros: { kcal: 450, protein_g: 35, carbs_g: 50, fat_g: 10 },
};
const snackFix: FixedMeal = {
  label: 'Skyr + amandes',
  source: 'estimate',
  macros: { kcal: 250, protein_g: 20, carbs_g: 15, fat_g: 12 },
};

describe('repas fixes (gérés par l’utilisateur)', () => {
  it('injecte le repas fixe verrouillé, avec ses macros et son nom', () => {
    const p = makeProfile({ fixed_meals: { breakfast: breakfastFix } });
    const bk = buildLocalPlan(p).meals.find((m) => m.day === 1 && m.meal_type === 'breakfast')!;
    expect(bk.fixed).toBe(true);
    expect(bk.macros).toEqual(breakfastFix.macros);
    expect(bk.recipe.name_fr).toBe('Mon shaker + flocons');
  });

  it('soustrait le budget : les repas planifiés visent (cible − fixe)', () => {
    const p = makeProfile({ fixed_meals: { breakfast: breakfastFix } });
    const day1 = buildLocalPlan(p).meals.filter((m) => m.day === 1);
    const plannedKcal = day1.filter((m) => !m.fixed).reduce((s, m) => s + m.macros.kcal, 0);
    const targetForPlanned = p.target_kcal - breakfastFix.macros.kcal;
    expect(plannedKcal).toBeLessThan(p.target_kcal); // la soustraction a bien eu lieu
    expect(Math.abs(plannedKcal - targetForPlanned) / targetForPlanned).toBeLessThan(0.15);
  });

  it('le total du jour (fixe inclus) reste proche de la cible, protéines ≥ plancher', () => {
    const p = makeProfile({ fixed_meals: { breakfast: breakfastFix, snack: snackFix } });
    const total = buildLocalPlan(p).total_macros_per_day[0];
    expect(Math.abs(total.kcal - p.target_kcal) / p.target_kcal).toBeLessThan(0.15);
    expect(total.protein_g).toBeGreaterThanOrEqual(p.target_protein_g * 0.9);
  });

  it('la liste de courses ignore les ingrédients des repas fixes', () => {
    const p = makeProfile({
      fixed_meals: {
        breakfast: { ...breakfastFix, source: 'food', ingredients: [{ name: 'ZzzIngredientFixeUnique', quantity_g: 80 }] },
      },
    });
    const list = buildShoppingList(buildLocalPlan(p), []);
    expect(list.items.some((i) => /ZzzIngredientFixeUnique/i.test(i.name))).toBe(false);
  });

  it('rebalanceDay ne touche pas le repas fixe', () => {
    const p = makeProfile({ fixed_meals: { breakfast: breakfastFix } });
    const plan = buildLocalPlan(p);
    const before = plan.meals.find((m) => m.day === 1 && m.fixed)!.macros;
    const after = rebalanceDay(p, plan, 1).meals.find((m) => m.day === 1 && m.fixed)!.macros;
    expect(after).toEqual(before);
  });

  it('swapMeal sur un repas fixe est un no-op', () => {
    const p = makeProfile({ fixed_meals: { breakfast: breakfastFix } });
    const plan = buildLocalPlan(p);
    expect(swapMeal(p, plan, plan.meals.find((m) => m.fixed)!)).toBe(plan);
  });

  it('profileSignature change quand les repas fixes changent', () => {
    expect(profileSignature(makeProfile()))
      .not.toBe(profileSignature(makeProfile({ fixed_meals: { breakfast: breakfastFix } })));
  });

  it('tous les repas fixés → le plan ne contient que les fixes', () => {
    const p = makeProfile({ meals: ['breakfast', 'snack'], fixed_meals: { breakfast: breakfastFix, snack: snackFix } });
    const plan = buildLocalPlan(p);
    expect(plan.meals.filter((m) => m.day === 1)).toHaveLength(2);
    expect(plan.meals.every((m) => m.fixed)).toBe(true);
  });

  it('non-régression : sans repas fixe, plan normal (aucun meal.fixed)', () => {
    const plan = buildLocalPlan(makeProfile());
    expect(plan.meals.some((m) => m.fixed)).toBe(false);
    expect(plan.meals.filter((m) => m.day === 1)).toHaveLength(4);
  });
});
