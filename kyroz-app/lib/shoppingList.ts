import { MealPlan, ShoppingItem, ShoppingList } from './types';
import { isStaple, categorize } from './pantry';

// Construit la liste de courses agrégée d'un plan.
// - Les condiments universels (sel, huile, citron, épices…) sont exclus :
//   tout le monde en a, et ils polluaient la liste (« Sel, poivre » 2 g).
// - La catégorisation est partagée avec le garde-manger (source unique).
export function buildShoppingList(plan: MealPlan): ShoppingList {
  const aggregated: Map<string, { quantity: number; unit: string }> = new Map();

  for (const meal of plan.meals) {
    for (const ingredient of meal.recipe.ingredients) {
      if (isStaple(ingredient.name)) continue;
      const key = ingredient.name.toLowerCase();
      const existing = aggregated.get(key);
      const qty = ingredient.quantity_g * meal.portions;
      if (existing) existing.quantity += qty;
      else aggregated.set(key, { quantity: qty, unit: ingredient.unit ?? 'g' });
    }
  }

  const items: ShoppingItem[] = Array.from(aggregated.entries())
    .map(([name, { quantity, unit }]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: Math.round(quantity),
      unit,
      category: categorize(name),
      checked: false,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return { id: `sl-${plan.id}`, plan_id: plan.id, items };
}
