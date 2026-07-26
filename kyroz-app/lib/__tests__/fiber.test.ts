import { describe, it, expect } from 'vitest';
import { recipeFiberPerPortion, mealFiberG, mealFiberFromIngredients, dailyFiberTarget, isFiberFocusGoal } from '../fiber';
import { RECIPES } from '../recipes';
import { makeProfile } from './helpers';
import { Recipe, Ingredient } from '../types';

const recipe = (ingredients: Ingredient[], portions = 1): Recipe => ({
  id: 'x', name_fr: 'x', prep_time_min: 5, portions,
  macros_per_portion: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  ingredients, steps: [], tags: ['lunch'], validated_by_dietitian: false,
});

describe('estimation fibres', () => {
  it('somme par ingrédient (avoine 10 g/100 g)', () => {
    expect(recipeFiberPerPortion(recipe([{ name: "Flocons d'avoine", quantity_g: 80 }]))).toBeCloseTo(8, 5);
  });

  it('correspondance la plus spécifique (riz complet ≠ riz)', () => {
    expect(recipeFiberPerPortion(recipe([{ name: 'Riz complet cru', quantity_g: 100 }]))).toBeCloseTo(3.5, 5);
    expect(recipeFiberPerPortion(recipe([{ name: 'Riz basmati cru', quantity_g: 100 }]))).toBeCloseTo(1.3, 5);
    expect(recipeFiberPerPortion(recipe([{ name: 'Pâtes complètes crues', quantity_g: 100 }]))).toBeCloseTo(8, 5);
  });

  it('zéro pour viande / œuf / huile / laitier', () => {
    const r = recipe([
      { name: 'Blanc de poulet', quantity_g: 200 },
      { name: "Huile d'olive", quantity_g: 10 },
      { name: 'Œufs entiers', quantity_g: 100 },
    ]);
    expect(recipeFiberPerPortion(r)).toBe(0);
  });

  it('divise par le nombre de portions', () => {
    const r = recipe([{ name: 'Brocolis', quantity_g: 200 }], 2); // 200/100*3 = 6 → /2 = 3
    expect(recipeFiberPerPortion(r)).toBeCloseTo(3, 5);
  });

  it('mealFiberG : scale par portions + arrondi', () => {
    const r = recipe([{ name: 'Pois chiches cuits', quantity_g: 150 }]); // 1.5*7 = 10.5
    expect(mealFiberG(r, 1)).toBe(11);
    expect(mealFiberG(r, 2)).toBe(21);
  });

  it('mealFiberFromIngredients : depuis des quantités déjà mises à l\'échelle', () => {
    // 200 g de pois chiches (7 g/100) = 14 g ; quantités effectives, pas de /portions.
    expect(mealFiberFromIngredients([{ name: 'Pois chiches cuits', quantity_g: 200 }])).toBe(14);
    expect(mealFiberFromIngredients([{ name: 'Filet de poulet', quantity_g: 180 }])).toBe(0);
  });
});

describe('source Ciqual par ref / food_id (fix P3.1 2026-07-23)', () => {
  // AVANT : « chia » n'était PAS dans FIBER_TABLE → compté 0 g. Le ref résout
  // maintenant la vraie valeur Ciqual (graines_chia → ciqual-15047 = 34,4 g/100 g).
  it('ref mappé Ciqual : le chia n\'est plus à 0 g', () => {
    const viaName = recipeFiberPerPortion(recipe([{ name: 'Graines de chia', quantity_g: 20 }]));
    const viaRef = recipeFiberPerPortion(recipe([{ name: 'Graines de chia', quantity_g: 20, ref: 'graines_chia' }]));
    expect(viaName).toBe(0);                 // repli mot-clé : chia absent → 0 (l'ancien bug)
    expect(viaRef).toBeCloseTo(6.88, 2);     // 20 g × 34,4/100 = 6,88 g (Ciqual)
  });

  it('ref prime sur le nom ; framboises comptées', () => {
    // framboises → ciqual-13015 = 4,3 g/100 g.
    expect(recipeFiberPerPortion(recipe([{ name: 'Framboises', quantity_g: 100, ref: 'framboises' }]))).toBeCloseTo(4.3, 2);
  });

  it('ref non mappé : valeur manuelle REF_FIBER_MANUAL (PST sèche)', () => {
    // soja_texture n'a pas de food_id → REF_FIBER_MANUAL = 15 g/100 g.
    expect(recipeFiberPerPortion(recipe([{ name: 'PST', quantity_g: 50, ref: 'soja_texture' }]))).toBeCloseTo(7.5, 2);
  });

  it('food_id direct (recette perso liée à Ciqual)', () => {
    expect(mealFiberFromIngredients([{ name: 'x', quantity_g: 100, food_id: 'ciqual-15047' }])).toBe(34);
  });

  it('catalogue : plus AUCUNE recette à ~0 g de fibres', () => {
    const zero = RECIPES.filter((r) => recipeFiberPerPortion(r) < 0.05);
    expect(zero.map((r) => r.id)).toEqual([]);
  });
});

describe('cible journalière', () => {
  it('renforcée en sèche (16 vs 14 g / 1000 kcal)', () => {
    expect(dailyFiberTarget(makeProfile({ goal: 'cut', target_kcal: 2500 }))).toBe(40);
    expect(dailyFiberTarget(makeProfile({ goal: 'maintain', target_kcal: 2500 }))).toBe(35);
  });
  it('bornée [25, 50]', () => {
    expect(dailyFiberTarget(makeProfile({ goal: 'maintain', target_kcal: 1500 }))).toBe(25); // plancher
    expect(dailyFiberTarget(makeProfile({ goal: 'cut', target_kcal: 4000 }))).toBe(50); // plafond
  });
  it('isFiberFocusGoal : déficits uniquement', () => {
    expect(isFiberFocusGoal('cut')).toBe(true);
    expect(isFiberFocusGoal('cut_aggressive')).toBe(true);
    expect(isFiberFocusGoal('maintain')).toBe(false);
    expect(isFiberFocusGoal('bulk')).toBe(false);
  });
});

describe('intégration base de recettes', () => {
  it('chaque recette a une estimation finie ≥ 0', () => {
    for (const r of RECIPES) {
      const f = recipeFiberPerPortion(r);
      expect(Number.isFinite(f), r.id).toBe(true);
      expect(f, r.id).toBeGreaterThanOrEqual(0);
    }
  });
  it('les recettes à légumes/féculents complets ont des fibres > 0', () => {
    const withVeg = RECIPES.filter((r) =>
      r.ingredients.some((i) => /brocoli|épinard|salade|pois chiche|haricot|avoine|complet|patate douce|quinoa/i.test(i.name))
    );
    expect(withVeg.length).toBeGreaterThan(5);
    for (const r of withVeg) expect(recipeFiberPerPortion(r), r.name_fr).toBeGreaterThan(0);
  });
});
