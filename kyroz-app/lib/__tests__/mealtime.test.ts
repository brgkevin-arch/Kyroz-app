import { describe, it, expect } from 'vitest';
import { isMealUpcoming, remainingMeals, remainingMealLabels, MEAL_HOUR, GRACE_HOURS } from '../mealtime';
import { Meal, MealType } from '../types';

const meal = (meal_type: MealType, status?: Meal['status']): Meal => ({
  id: meal_type, day: 1, meal_type, portions: 1,
  recipe: { id: 'r', name_fr: 'x', prep_time_min: 0, macros_per_portion: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, portions: 1, ingredients: [], steps: [], tags: [], validated_by_dietitian: false },
  macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  status,
});

describe('isMealUpcoming (heure + statut)', () => {
  it('avant son heure → à venir', () => {
    expect(isMealUpcoming(meal('dinner'), 14)).toBe(true);   // dîner 20h
    expect(isMealUpcoming(meal('snack'), 14)).toBe(true);    // collation 16h
  });

  it('après son heure + marge → passé', () => {
    expect(isMealUpcoming(meal('lunch'), 13)).toBe(true);                 // 13h + 1 = 14h → encore ok à 13h
    expect(isMealUpcoming(meal('lunch'), MEAL_HOUR.lunch + GRACE_HOURS)).toBe(false); // 14h → passé
    expect(isMealUpcoming(meal('breakfast'), 14)).toBe(false);           // petit-déj 8h → passé
  });

  it('mangé ou sauté → toujours passé, même tôt', () => {
    expect(isMealUpcoming(meal('dinner', 'eaten'), 6)).toBe(false);
    expect(isMealUpcoming(meal('dinner', 'skipped'), 6)).toBe(false);
  });
});

describe('remainingMeals / labels', () => {
  const meals = [meal('breakfast'), meal('lunch'), meal('snack'), meal('dinner')];

  it('à 14h : collation + dîner restent', () => {
    expect(remainingMealLabels(meals, 14)).toEqual(['collation', 'dîner']);
  });

  it('respecte l\'ordre canonique de la journée', () => {
    expect(remainingMealLabels(meals, 6)).toEqual(['petit-déj', 'déjeuner', 'collation', 'dîner']);
  });

  it('le soir tard : plus rien', () => {
    expect(remainingMeals(meals, 23)).toHaveLength(0);
  });

  it('un repas mangé est retiré des restants', () => {
    const m = [meal('snack', 'eaten'), meal('dinner')];
    expect(remainingMealLabels(m, 14)).toEqual(['dîner']);
  });
});
