import { describe, it, expect } from 'vitest';
import { adaptRecipe, goalToObjectives, sportsToBuckets, needMatch } from '../adaptRecipe';
import { Recipe } from '../types';

// Recette de test minimale (refs réels de la table).
const poulet: Recipe = {
  id: 't_poulet', name_fr: 'Poulet riz brocoli', prep_time_min: 25, portions: 1,
  macros_per_portion: { kcal: 655, protein_g: 53, carbs_g: 70, fat_g: 16 },
  ingredients: [
    { name: 'Filet de poulet', quantity_g: 180, ref: 'poulet_filet', macro_role: 'protein', scalable: true },
    { name: 'Riz basmati', quantity_g: 80, ref: 'riz_basmati', macro_role: 'carb', scalable: true },
    { name: 'Brocoli', quantity_g: 200, ref: 'brocoli', macro_role: 'vegetable', scalable: false },
    { name: "Huile d'olive", quantity_g: 10, ref: 'huile_olive', macro_role: 'fat', scalable: true },
  ],
  steps: ['...'], tags: ['lunch', 'dinner'], validated_by_dietitian: false,
};
const target = { kcalMeal: 600, proteinMeal: 50, split: { carb: 0.6, fat: 0.4 }, deficit: false };

describe('adaptRecipe', () => {
  it('garde les ingrédients non-scalables (légumes) fixes', () => {
    const res = adaptRecipe(poulet, target);
    const broc = res.ingredients.find((i) => i.ref === 'brocoli')!;
    expect(broc.quantity_g).toBe(200);
  });
  it('atteint ~la cible protéines (≥ tolérance)', () => {
    const res = adaptRecipe(poulet, target);
    expect(res.macros.protein_g).toBeGreaterThanOrEqual(50 * 0.95 - 1);
  });
  it('recalcule des macros cohérentes depuis les grammes', () => {
    const res = adaptRecipe(poulet, target);
    const calc = res.macros.protein_g * 4 + res.macros.carbs_g * 4 + res.macros.fat_g * 9;
    expect(Math.abs(calc - res.macros.kcal) / res.macros.kcal).toBeLessThan(0.12);
  });
  it('ne réduit jamais la protéine sous la recette de base (plancher recomp)', () => {
    // cible protéines basse → l'ancre poulet reste ≥ sa qty de base
    const res = adaptRecipe(poulet, { ...target, proteinMeal: 10 });
    const p = res.ingredients.find((i) => i.ref === 'poulet_filet')!;
    expect(p.quantity_g).toBeGreaterThanOrEqual(180);
  });
  it('flag under_target_kcal quand la recette ne peut pas atteindre une grosse cible', () => {
    const res = adaptRecipe(poulet, { ...target, kcalMeal: 1400, proteinMeal: 60 });
    expect(res.flags).toContain('under_target_kcal');
  });
});

describe('mappings besoin', () => {
  it('goalToObjectives mappe les 6 objectifs vers 3 buckets', () => {
    expect(goalToObjectives('cut')).toEqual(['cut']);
    expect(goalToObjectives('recomp')).toEqual(['cut', 'maintain']);
    expect(goalToObjectives('bulk')).toEqual(['bulk']);
  });
  it('sportsToBuckets mappe les SportType', () => {
    expect(sportsToBuckets([{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }])).toContain('muscu');
    expect(sportsToBuckets([{ type: 'sports_combat', sessions_per_week: 2, minutes_per_session: 60 }])).toContain('combats');
  });
  it('needMatch compte objectif + sport', () => {
    const r: Recipe = { ...poulet, objectives: ['bulk'], sports: ['muscu'] };
    const n = needMatch(r, ['bulk'], ['muscu']);
    expect(n).toBe(2);
    expect(needMatch({ ...poulet }, ['bulk'], ['muscu'])).toBe(0); // pas de tags → neutre
  });
});
