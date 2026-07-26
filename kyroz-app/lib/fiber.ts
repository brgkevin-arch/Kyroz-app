import { Recipe, UserProfile, Goal } from './types';
import { RECIPE_INGREDIENTS } from './recipeData';
import { findFood } from './foods';

// ── Fibres des recettes ──────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ = la base Ciqual (colonne « Fibres alimentaires », Food.fiber_g),
// comme les autres macros. Résolution par ingrédient, dans l'ordre :
//   1. `ref` → RECIPE_INGREDIENTS[ref].fiber_per100g (Ciqual si mappé, sinon manuel
//      REF_FIBER_MANUAL) — le cas des 314 recettes de base ;
//   2. `food_id` → findFood(food_id).fiber_g — recettes perso (RecipeEditor lie à Ciqual) ;
//   3. repli mot-clé sur le NOM (`FIBER_TABLE`) — seulement pour un ingrédient custom
//      saisi au nom seul, sans ref ni food_id (legacy / cas résiduel).
// Calculé à la volée, jamais stocké → reste juste même si l'utilisateur personnalise.
// (Avant 2026-07-23 : tout passait par le mot-clé — 34 entrées → chia, framboises,
//  noix, légumineuses… comptés à 0 g. Bug de MESURE corrigé, cf. P3.1.)

// Repli mot-clé (nom → g/100 g), trié par longueur décroissante → correspondance la
// PLUS SPÉCIFIQUE. Ne sert plus que d'ultime repli (ingrédient au nom seul).
const FIBER_TABLE: { kw: string; g: number }[] = [
  { kw: "flocons d'avoine", g: 10 },
  { kw: 'beurre de cacahuète', g: 6 },
  { kw: 'pâtes complètes', g: 8 },
  { kw: 'haricots rouges', g: 7 },
  { kw: 'haricots verts', g: 3 },
  { kw: 'pois chiches', g: 7 },
  { kw: 'sauce tomate', g: 1.5 },
  { kw: 'fruits rouges', g: 4 },
  { kw: 'patate douce', g: 3 },
  { kw: 'riz complet', g: 3.5 },
  { kw: 'cacahuète', g: 6 },
  { kw: 'concombre', g: 0.7 },
  { kw: 'brocolis', g: 3 },
  { kw: 'épinards', g: 2.5 },
  { kw: 'lentille', g: 5 },
  { kw: 'poivron', g: 2 },
  { kw: 'tortilla', g: 3 },
  { kw: 'semoule', g: 3 },
  { kw: 'ratatouille', g: 2 },
  { kw: 'granola', g: 7 },
  { kw: 'avoine', g: 10 },
  { kw: 'quinoa', g: 2.8 },
  { kw: 'amande', g: 12 },
  { kw: 'avocat', g: 6.7 },
  { kw: 'banane', g: 2.6 },
  { kw: 'oignon', g: 1.7 },
  { kw: 'tomate', g: 1.2 },
  { kw: 'salade', g: 1.5 },
  { kw: 'brocoli', g: 3 },
  { kw: 'maïs', g: 3 },
  { kw: 'tofu', g: 1 },
  { kw: 'pâtes', g: 3 },
  { kw: 'pain', g: 7 }, // « pain complet » dans nos recettes
  { kw: 'riz', g: 1.3 },
].sort((a, b) => b.kw.length - a.kw.length);

function fiberForIngredientName(name: string): number {
  const n = name.toLowerCase();
  for (const { kw, g } of FIBER_TABLE) if (n.includes(kw)) return g;
  return 0;
}

/** Fibres (g/100 g) d'un ingrédient : ref (Ciqual/manuel) → food_id (Ciqual) → nom. */
function fiberPer100(ing: { ref?: string; food_id?: string; name: string }): number {
  if (ing.ref) {
    const r = RECIPE_INGREDIENTS[ing.ref];
    if (r) return r.fiber_per100g;
  }
  if (ing.food_id) {
    const f = findFood(ing.food_id);
    if (f) return f.fiber_g ?? 0;
  }
  return fiberForIngredientName(ing.name);
}

// Cache par référence de recette (un override = nouvel objet → recalcul propre).
const cache = new WeakMap<Recipe, number>();

/** Fibres (g) pour UNE portion de la recette — sourcées Ciqual par ingrédient. */
export function recipeFiberPerPortion(recipe: Recipe): number {
  const hit = cache.get(recipe);
  if (hit !== undefined) return hit;
  const total = recipe.ingredients.reduce(
    (s, i) => s + (i.quantity_g / 100) * fiberPer100(i),
    0
  );
  const perPortion = total / Math.max(recipe.portions, 1);
  cache.set(recipe, perPortion);
  return perPortion;
}

/** Fibres (g, arrondi) d'un repas = portions × fibres/portion. */
export function mealFiberG(recipe: Recipe, portions: number): number {
  return Math.round(recipeFiberPerPortion(recipe) * portions);
}

/** Fibres estimées (g, arrondi) d'une liste d'ingrédients DÉJÀ mis à l'échelle
 *  (quantités effectives d'un repas — adaptées par ingrédient). Pas de division
 *  par portions : les quantités sont déjà celles réellement servies. */
export function mealFiberFromIngredients(
  ingredients: { name: string; quantity_g: number; ref?: string; food_id?: string }[],
): number {
  const total = ingredients.reduce(
    (s, i) => s + (i.quantity_g / 100) * fiberPer100(i),
    0,
  );
  return Math.round(total);
}

// ── Cible journalière ────────────────────────────────────────────────────────
// Standard : 14 g / 1000 kcal. En sèche, la satiété prime → on renforce à 16.
// Borné [25, 50] g (plancher santé / plafond confort digestif).
const FIBER_PER_1000_KCAL = 14;
const FIBER_PER_1000_KCAL_CUT = 16;

/** Les objectifs en déficit où la satiété (donc les fibres) compte le plus. */
export function isFiberFocusGoal(goal: Goal): boolean {
  return goal === 'cut' || goal === 'cut_aggressive';
}

export function dailyFiberTarget(profile: UserProfile): number {
  const perK = isFiberFocusGoal(profile.goal) ? FIBER_PER_1000_KCAL_CUT : FIBER_PER_1000_KCAL;
  const raw = (profile.target_kcal / 1000) * perK;
  return Math.round(Math.min(Math.max(raw, 25), 50));
}
