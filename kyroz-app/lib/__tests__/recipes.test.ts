import { describe, it, expect, afterEach } from 'vitest';
import {
  RECIPES_PLACEHOLDER, setRecipeOverrides, getEffectiveRecipes, getRecipeById,
  getBaseRecipe, isOverridden,
} from '../recipes';

afterEach(() => setRecipeOverrides({})); // registre module-level → reset entre tests

describe('registre d’overrides (recettes personnalisées)', () => {
  const base = RECIPES_PLACEHOLDER[0];
  const custom = { ...base, name_fr: 'Ma version', macros_per_portion: { ...base.macros_per_portion, kcal: 999 } };

  it('sans override : base intacte', () => {
    expect(getRecipeById(base.id)?.macros_per_portion.kcal).toBe(base.macros_per_portion.kcal);
    expect(isOverridden(base.id)).toBe(false);
    expect(getEffectiveRecipes()).toHaveLength(RECIPES_PLACEHOLDER.length);
  });

  it('override : prioritaire partout, base préservée', () => {
    setRecipeOverrides({ [base.id]: custom });
    expect(getRecipeById(base.id)?.macros_per_portion.kcal).toBe(999);
    expect(getBaseRecipe(base.id)?.macros_per_portion.kcal).toBe(base.macros_per_portion.kcal);
    expect(isOverridden(base.id)).toBe(true);
    const eff = getEffectiveRecipes();
    expect(eff).toHaveLength(RECIPES_PLACEHOLDER.length); // remplace, n'ajoute pas
    expect(eff.find((r) => r.id === base.id)?.name_fr).toBe('Ma version');
    // les autres recettes ne bougent pas
    expect(eff.find((r) => r.id === RECIPES_PLACEHOLDER[1].id)?.name_fr).toBe(RECIPES_PLACEHOLDER[1].name_fr);
  });

  it('reset : retour à la base', () => {
    setRecipeOverrides({ [base.id]: custom });
    setRecipeOverrides({});
    expect(getRecipeById(base.id)?.macros_per_portion.kcal).toBe(base.macros_per_portion.kcal);
    expect(isOverridden(base.id)).toBe(false);
  });
});

describe('intégrité de la base de recettes', () => {
  it('ids uniques', () => {
    const ids = RECIPES_PLACEHOLDER.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('macros énergétiquement cohérentes (4/4/9 à ±12%)', () => {
    for (const r of RECIPES_PLACEHOLDER) {
      const m = r.macros_per_portion;
      const calc = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
      expect(Math.abs(calc - m.kcal) / m.kcal, `${r.id} ${r.name_fr}`).toBeLessThan(0.12);
    }
  });
  it('chaque recette a au moins un tag repas, des ingrédients et des étapes', () => {
    for (const r of RECIPES_PLACEHOLDER) {
      expect(r.tags.length, r.id).toBeGreaterThan(0);
      expect(r.ingredients.length, r.id).toBeGreaterThan(0);
      expect(r.steps.length, r.id).toBeGreaterThan(0);
    }
  });
});
