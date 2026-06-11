import { UserProfile } from '../types';

/** Profil de référence pour les tests (homme 90 kg, sèche, 4 séances). */
export function makeProfile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-user',
    sex: 'male',
    age: 30,
    weight_kg: 90,
    height_cm: 180,
    activity_level: 'moderate',
    training_days_per_week: 4,
    goal: 'cut',
    macro_mode: 'auto',
    tdee_kcal: 2914,
    target_kcal: 2614,
    target_protein_g: 198,
    target_carbs_g: 291,
    target_fat_g: 73,
    plan_days: 5,
    plan_weekdays: [1, 2, 3, 4, 5],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'],
    meal_emphasis: 'even',
    variety: 'balanced',
    dietary_restrictions: [],
    disliked_foods: [],
    preferred_proteins: [],
    max_prep_time_min: 30,
    ...over,
  };
}
