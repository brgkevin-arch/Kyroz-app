import { describe, it, expect } from 'vitest';
import { RECIPE_INGREDIENTS, RECIPE_CONFIG, RAW_RECIPES, macrosForRefIngredients } from '../recipeData';

describe('recipeData', () => {
  it('charge 264 recettes brutes', () => {
    expect(RAW_RECIPES).toHaveLength(264);
  });
  it('chaque ingrédient de chaque recette a un ref existant dans la table', () => {
    for (const r of RAW_RECIPES)
      for (const ing of r.ingredients)
        expect(RECIPE_INGREDIENTS[ing.ref], `${r.id}:${ing.ref}`).toBeDefined();
  });
  it('garde-fou : base_servings === 1 sur toutes les recettes', () => {
    // adaptRecipe + le mapping des macros supposent 1 portion par recette.
    for (const r of RAW_RECIPES) expect(r.base_servings, r.id).toBe(1);
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
