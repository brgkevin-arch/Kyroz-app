import { MealPlan, ShoppingItem, ShoppingList } from './types';
import { isStaple, categorize, matches, PantryItem } from './pantry';

// Construit la liste de courses agrégée d'un plan.
// - Les condiments universels (sel, huile, citron, épices…) sont exclus :
//   tout le monde en a, et ils polluaient la liste (« Sel, poivre » 2 g).
// - La catégorisation est partagée avec le garde-manger (source unique).
// - Le garde-manger est SOUSTRAIT : on ne propose que ce qui MANQUE pour le plan.
//   Couverture partielle → on n'achète que le reste (ex. 200 g au frigo sur
//   500 g requis → 300 g) ; entièrement couvert → l'article est masqué.
export function buildShoppingList(plan: MealPlan, pantry: PantryItem[] = []): ShoppingList {
  // name conserve la casse d'origine du 1er ingrédient agrégé (pour l'affichage).
  const aggregated: Map<string, { name: string; quantity: number; unit: string }> = new Map();

  for (const meal of plan.meals) {
    for (const ingredient of meal.recipe.ingredients) {
      if (isStaple(ingredient.name)) continue;
      const key = ingredient.name.toLowerCase();
      const existing = aggregated.get(key);
      const qty = ingredient.quantity_g * meal.portions;
      if (existing) existing.quantity += qty;
      else aggregated.set(key, { name: key, quantity: qty, unit: ingredient.unit ?? 'g' });
    }
  }

  // Soustraction du garde-manger. `avail` est une copie mutable : on décrémente
  // chaque stock au fur et à mesure pour ne jamais le déduire deux fois. On ne
  // soustrait qu'à unité identique (g↔g) — pas de mélange g/pièce hasardeux.
  const avail = pantry.filter((p) => !isStaple(p.name)).map((p) => ({ ...p }));
  for (const entry of aggregated.values()) {
    for (const p of avail) {
      if (p.quantity <= 0 || p.unit !== entry.unit || !matches(p.name, entry.name)) continue;
      const used = Math.min(p.quantity, entry.quantity);
      entry.quantity -= used;
      p.quantity -= used;
      if (entry.quantity <= 0) break;
    }
  }

  const items: ShoppingItem[] = Array.from(aggregated.values())
    .filter((e) => Math.round(e.quantity) > 0) // entièrement couvert par le frigo → masqué
    .map(({ name, quantity, unit }) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: Math.round(quantity),
      unit,
      category: categorize(name),
      checked: false,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return { id: `sl-${plan.id}`, plan_id: plan.id, items };
}
