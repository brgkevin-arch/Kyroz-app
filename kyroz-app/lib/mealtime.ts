import { Meal, MealSlot, MealType, BuiltinMealType } from './types';
import { BUILTIN_SLOTS, slotHour, slotLabel } from './mealSlots';

// ── Conscience de l'heure : quels repas sont encore devant ? ─────────────────
//
// On associe une heure « par défaut » à chaque repas (sans l'imposer à l'user) :
// ça sert uniquement à déduire, selon l'heure actuelle, les repas encore à venir
// → ce sont eux qu'on peut proposer d'adapter après un écart hors plan.
//
// ⚠️ Depuis les créneaux libres (2026-08-07), l'heure et le libellé d'un repas ne
// sont plus DANS ce module : ils appartiennent au créneau (`lib/mealSlots.ts`),
// parce que l'utilisateur peut en créer avec l'heure qu'il veut. Les deux tables
// ci-dessous ne décrivent plus que les 4 créneaux INTÉGRÉS, et les fonctions
// prennent la liste des créneaux du profil en argument. Sans elle, elles
// retombent sur les intégrés — exactement l'ancien comportement.

export const MEAL_HOUR: Record<BuiltinMealType, number> = {
  breakfast: 8,
  lunch: 13,
  snack: 16,
  dinner: 20,
};

export const MEAL_LABEL: Record<BuiltinMealType, string> = {
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
export function isMealUpcoming(
  meal: Pick<Meal, 'meal_type' | 'status'>,
  nowHour: number,
  slots: readonly MealSlot[] = BUILTIN_SLOTS,
): boolean {
  if (meal.status === 'eaten' || meal.status === 'skipped') return false;
  return nowHour < slotHour(slots, meal.meal_type) + GRACE_HOURS;
}

/** Repas du jour encore à venir, dans l'ordre CHRONOLOGIQUE (par heure). */
export function remainingMeals(
  meals: Meal[],
  nowHour: number,
  slots: readonly MealSlot[] = BUILTIN_SLOTS,
): Meal[] {
  return meals
    .filter((m) => isMealUpcoming(m, nowHour, slots))
    .sort((a, b) => slotHour(slots, a.meal_type) - slotHour(slots, b.meal_type));
}

/** Libellés FR des repas restants (« collation, dîner ») — pour l'UI. */
export function remainingMealLabels(
  meals: Meal[],
  nowHour: number,
  slots: readonly MealSlot[] = BUILTIN_SLOTS,
): string[] {
  return remainingMeals(meals, nowHour, slots).map((m) => mealLabelFor(slots, m.meal_type));
}

/**
 * Libellé « en cours de phrase » d'un créneau (minuscule) : « collation », « dîner »,
 * « shaker post-training ». Les intégrés gardent leur libellé d'origine, plus naturel
 * dans une énumération que le libellé d'écran (« Petit-déj » → « petit-déj »).
 */
export function mealLabelFor(slots: readonly MealSlot[], id: MealType): string {
  return MEAL_LABEL[id as BuiltinMealType] ?? slotLabel(slots, id).toLocaleLowerCase('fr-FR');
}
