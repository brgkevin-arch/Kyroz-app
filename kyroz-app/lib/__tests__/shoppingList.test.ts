import { describe, it, expect } from 'vitest';
import { buildShoppingList } from '../shoppingList';
import { Ingredient, Macros, Meal, MealPlan, Recipe } from '../types';
import { PantryItem } from '../pantry';

const ZERO: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

function recipe(ingredients: Ingredient[]): Recipe {
  return {
    id: 'r1', name_fr: 'Test', prep_time_min: 10, macros_per_portion: ZERO,
    portions: 1, ingredients, steps: [], tags: [], validated_by_dietitian: false,
  };
}

function plan(ingredients: Ingredient[], portions = 1): MealPlan {
  const meal: Meal = { id: 'm1', day: 1, meal_type: 'lunch', recipe: recipe(ingredients), portions, macros: ZERO };
  return {
    id: 'p1', user_id: 'u1', week_start_date: '2026-06-15', generated_at: '2026-06-15',
    days: 1, meals: [meal], total_macros_per_day: [ZERO],
  };
}

const pantry = (items: Partial<PantryItem>[]): PantryItem[] =>
  items.map((i) => ({ name: i.name!, quantity: i.quantity!, unit: i.unit ?? 'g', category: i.category ?? 'autres' }));

const find = (l: ReturnType<typeof buildShoppingList>, name: string) =>
  l.items.find((i) => i.name.toLowerCase() === name.toLowerCase());

describe('buildShoppingList — sans garde-manger', () => {
  it('agrège les quantités × portions et exclut les condiments', () => {
    const l = buildShoppingList(plan([
      { name: 'Poulet', quantity_g: 200 },
      { name: 'Sel', quantity_g: 2 },
    ], 2));
    expect(find(l, 'Poulet')?.quantity).toBe(400); // 200 × 2 portions
    expect(find(l, 'Sel')).toBeUndefined();        // staple exclu
  });
});

describe('buildShoppingList — soustraction du garde-manger', () => {
  it('ne demande que le manque en cas de couverture partielle', () => {
    const l = buildShoppingList(
      plan([{ name: 'Poulet', quantity_g: 500 }]),
      pantry([{ name: 'Poulet', quantity: 200 }]),
    );
    expect(find(l, 'Poulet')?.quantity).toBe(300); // 500 − 200
  });

  it('masque complètement un article entièrement couvert', () => {
    const l = buildShoppingList(
      plan([{ name: 'Poulet', quantity_g: 500 }]),
      pantry([{ name: 'Poulet', quantity: 600 }]),
    );
    expect(find(l, 'Poulet')).toBeUndefined();
  });

  it('tolère accents / ligatures / pluriels (œufs ↔ oeuf)', () => {
    const l = buildShoppingList(
      plan([{ name: 'Œufs', quantity_g: 6, unit: 'pièce' }]),
      pantry([{ name: 'oeuf', quantity: 4, unit: 'pièce' }]),
    );
    expect(find(l, 'Œufs')?.quantity).toBe(2);
  });

  it('ne soustrait pas entre unités différentes (g vs pièce)', () => {
    const l = buildShoppingList(
      plan([{ name: 'Tomate', quantity_g: 300, unit: 'g' }]),
      pantry([{ name: 'Tomate', quantity: 3, unit: 'pièce' }]),
    );
    expect(find(l, 'Tomate')?.quantity).toBe(300); // unités incompatibles → pas de déduction
  });

  it('ne déduit pas deux fois le même stock sur deux ingrédients distincts', () => {
    // Un seul stock de 250 g de "poulet" face à deux lignes l'évoquant.
    const l = buildShoppingList(
      plan([
        { name: 'Poulet rôti', quantity_g: 200 },
        { name: 'Poulet pané', quantity_g: 200 },
      ]),
      pantry([{ name: 'poulet', quantity: 250 }]),
    );
    const total = (find(l, 'Poulet rôti')?.quantity ?? 0) + (find(l, 'Poulet pané')?.quantity ?? 0);
    // 400 requis − 250 dispo = 150 à acheter au total (pas 400 − 250×2).
    expect(total).toBe(150);
  });

  it('ne déduit pas les condiments du garde-manger', () => {
    const l = buildShoppingList(
      plan([{ name: 'Poulet', quantity_g: 300 }]),
      pantry([{ name: 'huile', quantity: 1000 }, { name: 'Poulet', quantity: 100 }]),
    );
    expect(find(l, 'Poulet')?.quantity).toBe(200);
  });
});
