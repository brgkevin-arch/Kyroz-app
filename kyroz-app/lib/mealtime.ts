import { Meal, MealType } from './types';

// ── Conscience de l'heure : quels repas sont encore devant ? ─────────────────
//
// On associe une heure « par défaut » à chaque repas (sans l'imposer à l'user) :
// ça sert uniquement à déduire, selon l'heure actuelle, les repas encore à venir
// → ce sont eux qu'on peut proposer d'adapter après un écart hors plan.

export const MEAL_HOUR: Record<MealType, number> = {
  breakfast: 8,
  lunch: 13,
  snack: 16,
  dinner: 20,
};

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'petit-déj',
  lunch: 'déjeuner',
  snack: 'collation',
  dinner: 'dîner',
};

// Marge avant qu'un repas NON marqué bascule en « passé ». 1h : le déjeuner (13h)
// reste adaptable jusqu'à 14h, puis on considère qu'il a eu lieu (ex. écart à 14h
// → il reste collation + dîner). Le statut « mangé » prime de toute façon.
export const GRACE_HOURS = 1;

/**
 * Un repas est-il ENCORE À VENIR (donc adaptable) ? Combine heure + statut :
 * - mangé / sauté → passé (l'utilisateur a tranché, on respecte) ;
 * - sinon → à venir tant que son heure + marge n'est pas dépassée.
 */
export function isMealUpcoming(meal: Pick<Meal, 'meal_type' | 'status'>, nowHour: number): boolean {
  if (meal.status === 'eaten' || meal.status === 'skipped') return false;
  return nowHour < (MEAL_HOUR[meal.meal_type] ?? 24) + GRACE_HOURS;
}

/** Repas du jour encore à venir, dans l'ordre CHRONOLOGIQUE (par heure). */
export function remainingMeals(meals: Meal[], nowHour: number): Meal[] {
  return meals
    .filter((m) => isMealUpcoming(m, nowHour))
    .sort((a, b) => (MEAL_HOUR[a.meal_type] ?? 24) - (MEAL_HOUR[b.meal_type] ?? 24));
}

/** Libellés FR des repas restants (« collation, dîner ») — pour l'UI. */
export function remainingMealLabels(meals: Meal[], nowHour: number): string[] {
  return remainingMeals(meals, nowHour).map((m) => MEAL_LABEL[m.meal_type] ?? m.meal_type);
}
