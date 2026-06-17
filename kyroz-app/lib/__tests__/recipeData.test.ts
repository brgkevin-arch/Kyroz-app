import { describe, it, expect } from 'vitest';
import { RECIPE_INGREDIENTS, RECIPE_CONFIG, RAW_RECIPES, macrosForRefIngredients } from '../recipeData';

describe('recipeData', () => {
  it('charge 100 recettes brutes', () => {
    expect(RAW_RECIPES).toHaveLength(100);
  });
  it('chaque ingrédient de chaque recette a un ref existant dans la table', () => {
    for (const r of RAW_RECIPES)
      for (const ing of r.ingredients)
        expect(RECIPE_INGREDIENTS[ing.ref], `${r.id}:${ing.ref}`).toBeDefined();
  });
  it('config expose les champs utilisés par adaptRecipe', () => {
    expect(RECIPE_CONFIG.rounding_step_g).toBeGreaterThan(0);
    expect(RECIPE_CONFIG.protein_floor_tolerance).toBeGreaterThan(0);
    expect(RECIPE_CONFIG.scaling_factors_by_role.protein).toBeDefined();
  });
  it('macrosForRefIngredients calcule depuis per100g', () => {
    // 100 g de poulet_filet = ses macros /100 g
    const ref = Object.keys(RECIPE_INGREDIENTS).find((k) => k === 'poulet_filet')!;
    const m = macrosForRefIngredients([{ ref, qty: 100 }]);
    expect(m.kcal).toBe(RECIPE_INGREDIENTS[ref].per100g.kcal);
    expect(m.protein_g).toBe(RECIPE_INGREDIENTS[ref].per100g.protein_g);
  });
});
