import { describe, it, expect } from 'vitest';
import { RECIPES } from '../recipeMap';
import { macrosForRefIngredients } from '../recipeData';

describe('recipeMap (JSON → Recipe)', () => {
  it('mappe les 100 recettes', () => expect(RECIPES).toHaveLength(100));

  it('ids uniques', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('category → tags repas', () => {
    const pd = RECIPES.find((r) => r.id === 'pd01')!;
    expect(pd.tags).toContain('breakfast');
    const rep = RECIPES.find((r) => r.id === 'rep01')!;
    expect(rep.tags).toEqual(expect.arrayContaining(['lunch', 'dinner']));
    const col = RECIPES.find((r) => r.id === 'col01')!;
    expect(col.tags).toContain('snack');
  });

  it('objectif FR → RecipeObjective', () => {
    const r = RECIPES.find((r) => r.id === 'pd04')!; // perte_de_gras, maintien
    expect(r.objectives).toEqual(expect.arrayContaining(['cut', 'maintain']));
  });

  it('ingrédients : ref/macro_role/scalable + nom depuis la table', () => {
    const r = RECIPES.find((r) => r.id === 'rep01')!;
    const poulet = r.ingredients.find((i) => i.ref === 'poulet_filet')!;
    expect(poulet.macro_role).toBe('protein');
    expect(poulet.scalable).toBe(true);
    expect(poulet.name).toBe('Filet de poulet');
    expect(poulet.quantity_g).toBe(180);
  });

  it('macros cohérentes avec les ingrédients (±2%) sur les 100', () => {
    for (const r of RECIPES) {
      const m = macrosForRefIngredients(r.ingredients.map((i) => ({ ref: i.ref!, qty: i.quantity_g })));
      const e = Math.abs(m.kcal - r.macros_per_portion.kcal) / r.macros_per_portion.kcal;
      expect(e, r.id).toBeLessThan(0.02);
    }
  });

  it('chaque repas_complet a un axe lipides (ingrédient fat), sauf recettes délibérément maigres (≤12 g fat/portion)', () => {
    const reps = RECIPES.filter((r) => r.tags.includes('lunch'));
    for (const r of reps) {
      const hasFat = r.ingredients.some((i) => i.macro_role === 'fat');
      const lean = r.macros_per_portion.fat_g <= 12;
      expect(hasFat || lean, `${r.id} (${r.macros_per_portion.fat_g}g fat)`).toBe(true);
    }
  });

  it('restrictions_ok dérivées : dahl végétal sans gluten ni lactose', () => {
    const dahl = RECIPES.find((r) => r.id === 'rep03')!;
    expect(dahl.restrictions_ok).toEqual(expect.arrayContaining(['vegetarian', 'gluten_free', 'lactose_free']));
  });

  it('couverture petit-déj sans lactose ≥ 3 (trou des 10 comblé)', () => {
    const pdLacto = RECIPES.filter((r) => r.tags.includes('breakfast') && r.restrictions_ok?.includes('lactose_free'));
    expect(pdLacto.length).toBeGreaterThanOrEqual(3);
  });
});
