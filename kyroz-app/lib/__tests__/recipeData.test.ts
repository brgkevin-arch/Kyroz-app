import { describe, it, expect } from 'vitest';
import { RECIPE_INGREDIENTS, RECIPE_CONFIG, RAW_RECIPES, macrosForRefIngredients } from '../recipeData';

describe('recipeData', () => {
  it('charge 367 recettes brutes', () => {
    expect(RAW_RECIPES).toHaveLength(367);
  });
  it('chaque recette déclare sa vague de livraison', () => {
    // Sans `wave`, une vague ne sait pas contre quoi se comparer : impossible d'expliquer
    // qu'un tag soit à 43 % sur un lot et à 12 % sur le suivant. Partition figée le
    // 2026-07-29, dérivée des dossiers de Recette/drops/ (voir _meta.waves du JSON).
    const sans = RAW_RECIPES.filter((r) => !r.wave).map((r) => r.id);
    expect(sans, `recettes sans \`wave\` : ${sans.join(', ')}`).toEqual([]);
    const parVague: Record<string, number> = {};
    for (const r of RAW_RECIPES) parVague[r.wave] = (parVague[r.wave] ?? 0) + 1;
    expect(parVague).toEqual({
      fondation: 100, '2026-06-19-vegan': 164, '2026-07-22-sans-gluten': 50,
      '2026-08-01-b2-collations': 13, '2026-08-01-b1-lot1-repas': 20,
      '2026-08-01-b1-lot2-repas': 20,
    });
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
