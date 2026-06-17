import { describe, it, expect } from 'vitest';
import { adaptRecipe, goalToObjectives, sportsToBuckets, needMatch, FLAG_AUDIENCE } from '../adaptRecipe';
import { macrosForRefIngredients } from '../recipeData';
import { AdaptFlag, Recipe } from '../types';

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
const target = { kcalMeal: 600, proteinMeal: 50, carbMeal: 65, fatMeal: 18 };

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
  it('gap = atteint − cible (signé), cohérent avec macros et target', () => {
    const res = adaptRecipe(poulet, target);
    expect(res.gap.protein_g).toBe(res.macros.protein_g - Math.round(target.proteinMeal));
    expect(res.gap.carbs_g).toBe(res.macros.carbs_g - Math.round(target.carbMeal));
  });
  it('ne réduit jamais la protéine sous la recette de base (plancher recomp)', () => {
    // cible protéines basse → l'ancre poulet reste ≥ sa qty de base
    const res = adaptRecipe(poulet, { ...target, proteinMeal: 10 });
    const p = res.ingredients.find((i) => i.ref === 'poulet_filet')!;
    expect(p.quantity_g).toBeGreaterThanOrEqual(180);
  });
  it('plancher protéique TOTAL : recette multi-source (whey+lait+avoine) ne tombe pas sous la base', () => {
    // La protéine de ce porridge vient de l'ANCRE (whey) ET des fills (lait, avoine).
    // Cible volontairement basse en protéines ET en glucides : sans plancher sur la
    // protéine TOTALE, scaleToMacro réduirait lait+avoine pour viser les glucides et
    // la protéine du repas tomberait sous la recette de base. On exige ≥ base.
    const porridge: Recipe = {
      id: 't_porridge', name_fr: 'Porridge protéiné', prep_time_min: 10, portions: 1,
      macros_per_portion: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, // recompute depuis refs
      ingredients: [
        { name: 'Whey', quantity_g: 30, ref: 'whey', macro_role: 'protein', scalable: true },
        { name: 'Lait demi-écrémé', quantity_g: 250, ref: 'lait_demi_ecreme', macro_role: 'dairy', scalable: true },
        { name: "Flocons d'avoine", quantity_g: 70, ref: 'flocons_avoine', macro_role: 'carb', scalable: true },
      ],
      steps: ['...'], tags: ['breakfast'], validated_by_dietitian: false,
    };
    const base = macrosForRefIngredients([
      { ref: 'whey', qty: 30 }, { ref: 'lait_demi_ecreme', qty: 250 }, { ref: 'flocons_avoine', qty: 70 },
    ]);
    const res = adaptRecipe(porridge, { kcalMeal: 320, proteinMeal: 18, carbMeal: 22, fatMeal: 6 });
    expect(res.macros.protein_g).toBeGreaterThanOrEqual(Math.round(base.protein_g) - 1);
  });
  it('flag under_target_kcal quand la recette ne peut pas atteindre une grosse cible', () => {
    const res = adaptRecipe(poulet, { kcalMeal: 1400, proteinMeal: 90, carbMeal: 175, fatMeal: 47 });
    expect(res.flags).toContain('under_target_kcal');
  });
  it('recette sans ref (override perso / legacy) : rend les macros de base inchangées', () => {
    const legacy: Recipe = {
      ...poulet, id: 't_legacy',
      macros_per_portion: { kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 12 },
      ingredients: [{ name: 'Truc maison', quantity_g: 200, food_id: 'ciqual-1' }],
    };
    const res = adaptRecipe(legacy, target);
    expect(res.macros).toEqual(legacy.macros_per_portion);
    expect(res.ingredients[0].quantity_g).toBe(200);
  });
  it('recette MIXTE (un ingrédient sans ref) : repli macros de base, pas de sous-comptage', () => {
    // Override perso : un ingrédient Kyroz (ref) + un ajout custom (food_id sans ref).
    // Sans le repli, l'ingrédient custom serait ignoré au recompte → macros fausses.
    const mixte: Recipe = {
      ...poulet, id: 't_mixte',
      macros_per_portion: { kcal: 800, protein_g: 60, carbs_g: 90, fat_g: 20 },
      ingredients: [
        { name: 'Filet de poulet', quantity_g: 180, ref: 'poulet_filet', macro_role: 'protein', scalable: true },
        { name: 'Pâte maison', quantity_g: 200, food_id: 'ciqual-x', macro_role: 'carb', scalable: true },
      ],
    };
    const res = adaptRecipe(mixte, target);
    expect(res.macros).toEqual(mixte.macros_per_portion); // base, pas de scaling partiel
    expect(res.ingredients.map((i) => i.quantity_g)).toEqual([180, 200]); // quantités inchangées
  });
});

describe('FLAG_AUDIENCE', () => {
  it('classe protein/kcal en user, fat/carbs en selection, no_protein_anchor en dev', () => {
    const all: AdaptFlag[] = ['protein_below_target', 'over_target_kcal', 'under_target_kcal', 'fat_below_target', 'carbs_below_target', 'no_protein_anchor'];
    for (const f of all) expect(FLAG_AUDIENCE[f], f).toBeDefined();
    expect(FLAG_AUDIENCE.protein_below_target).toBe('user');
    expect(FLAG_AUDIENCE.fat_below_target).toBe('selection');
    expect(FLAG_AUDIENCE.no_protein_anchor).toBe('dev');
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
