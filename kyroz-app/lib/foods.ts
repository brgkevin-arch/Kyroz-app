import { Food, Ingredient, Macros } from './types';
import { CIQUAL_FOODS } from './foods.generated';

// ── Base d'aliments (approche A : valeur moyenne par aliment, /100 g) ─────────
//
// Source : Table Ciqual 2025 (ANSES), réutilisée sous Licence Ouverte 2.0
// (Etalab) — cf. CIQUAL_ATTRIBUTION. Le dataset est GÉNÉRÉ depuis le fichier
// officiel par scripts/convert-ciqual.py → lib/foods.generated.ts (ne pas éditer
// à la main). ~3300 aliments courants en France.

// Incertitude relative par défaut (%) de l'énergie selon les sources — pour la
// marge honnête du total du jour (Phase 3b).
const DEFAULT_UNCERTAINTY_PCT = 10;

// Mention légale obligatoire (Licence Ouverte 2.0 : attribution de la source,
// sans dénaturation ni suggestion d'endossement). À afficher dans l'app.
export const CIQUAL_ATTRIBUTION =
  'Données nutritionnelles calculées à partir de la Table Ciqual® 2025 (ANSES), ' +
  'réutilisée sous Licence Ouverte 2.0 (Etalab). L’ANSES n’endosse pas Kyroz.';

export const FOODS: Food[] = CIQUAL_FOODS;

// Index par id pour les recherches O(1).
const BY_ID: Map<string, Food> = new Map(FOODS.map((f) => [f.id, f]));

export function findFood(id: string | undefined): Food | undefined {
  return id ? BY_ID.get(id) : undefined;
}

// Normalisation pour la recherche : minuscules, sans accents, sans ligatures.
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/['‘’]/g, '');
}

const NORM_CACHE: Map<string, string> = new Map(FOODS.map((f) => [f.id, normalize(f.name_fr)]));

/**
 * Recherche libre dans la base, insensible aux accents/casse. Classement :
 * préfixe exact > début de mot > sous-chaîne. Renvoie au plus `limit` résultats.
 */
export function searchFoods(query: string, limit = 20): Food[] {
  const q = normalize(query);
  if (!q) return FOODS.slice(0, limit);
  const scored: { food: Food; score: number }[] = [];
  for (const food of FOODS) {
    const name = NORM_CACHE.get(food.id)!;
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (new RegExp(`\\b${escapeRegExp(q)}`).test(name)) score = 1;
    else if (name.includes(q)) score = 2;
    if (score >= 0) scored.push({ food, score });
  }
  scored.sort((a, b) => a.score - b.score || a.food.name_fr.length - b.food.name_fr.length);
  return scored.slice(0, limit).map((x) => x.food);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Macros d'une quantité (g) d'un aliment. */
export function macrosForQuantity(food: Food, quantity_g: number): Macros {
  const k = Math.max(0, quantity_g) / 100;
  return {
    kcal: food.per100g.kcal * k,
    protein_g: food.per100g.protein_g * k,
    carbs_g: food.per100g.carbs_g * k,
    fat_g: food.per100g.fat_g * k,
  };
}

/**
 * Calcule les macros d'une recette À PARTIR de ses ingrédients liés à la base
 * (`food_id`). `matchedRatio` = part de la masse couverte par des aliments connus
 * — < 1 signifie que des ingrédients n'ont pas de food_id (macros incomplètes).
 * Renvoie null si AUCUN ingrédient n'est lié (→ garder les macros manuelles).
 */
export function macrosFromIngredients(
  ingredients: Ingredient[],
): { macros: Macros; matchedRatio: number } | null {
  let matchedG = 0, totalG = 0;
  const sum: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  let any = false;
  for (const ing of ingredients) {
    const g = Math.max(0, ing.quantity_g || 0);
    totalG += g;
    const food = findFood(ing.food_id);
    if (!food) continue;
    any = true;
    matchedG += g;
    const m = macrosForQuantity(food, g);
    sum.kcal += m.kcal; sum.protein_g += m.protein_g; sum.carbs_g += m.carbs_g; sum.fat_g += m.fat_g;
  }
  if (!any) return null;
  return {
    macros: roundMacros(sum),
    matchedRatio: totalG > 0 ? matchedG / totalG : 0,
  };
}

/** Macros PAR PORTION recalculées depuis les ingrédients (÷ portions). */
export function recipeMacrosPerPortion(
  ingredients: Ingredient[],
  portions: number,
): { macros: Macros; matchedRatio: number } | null {
  const res = macrosFromIngredients(ingredients);
  if (!res) return null;
  const p = Math.max(1, portions || 1);
  return {
    macros: roundMacros({
      kcal: res.macros.kcal / p,
      protein_g: res.macros.protein_g / p,
      carbs_g: res.macros.carbs_g / p,
      fat_g: res.macros.fat_g / p,
    }),
    matchedRatio: res.matchedRatio,
  };
}

function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g),
    carbs_g: Math.round(m.carbs_g),
    fat_g: Math.round(m.fat_g),
  };
}

export { DEFAULT_UNCERTAINTY_PCT };
