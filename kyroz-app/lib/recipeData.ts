import { Macros, MacroRole } from './types';
import raw from './data/recettes-kyroz-100.json';
import { findFood } from './foods';
import { REF_FOOD_ID } from './recipeFoodMap';

// ── Table d'ingrédients (rôle = type Food, valeurs /100 g) ────────────────────
// Macros : SOURCÉES CIQUAL quand l'ingrédient est mappé (lib/recipeFoodMap.ts) →
// source de vérité unique partagée avec la recherche d'aliments. Repli sur la
// valeur manuelle du JSON pour les `ref` non mappés (composites/suppléments).
// Le JSON utilise {kcal,protein,carbs,fat} ; on convertit vers Macros interne.
export interface RecipeIngredientRef {
  name: string;
  unit: 'g' | 'ml';
  basis?: 'dry' | 'raw';
  per100g: Macros;
  abs_max_qty?: number;
  food_id?: string; // → aliment Ciqual quand les macros viennent de la base (cf. recipeFoodMap)
}

type Per100 = { kcal: number; protein: number; carbs: number; fat: number };
const toMacros = (p: Per100): Macros => ({ kcal: p.kcal, protein_g: p.protein, carbs_g: p.carbs, fat_g: p.fat });

export const RECIPE_INGREDIENTS: Record<string, RecipeIngredientRef> = Object.fromEntries(
  Object.entries(raw.ingredients_reference as Record<string, any>).map(([k, v]) => {
    // Mappé sur Ciqual → on prend les macros officielles ; sinon valeur manuelle.
    const food = REF_FOOD_ID[k] ? findFood(REF_FOOD_ID[k]) : undefined;
    return [
      k,
      {
        name: v.name,
        unit: v.unit,
        basis: v.basis,
        per100g: food ? food.per100g : toMacros(v.per_100),
        abs_max_qty: v.abs_max_qty,
        food_id: food ? REF_FOOD_ID[k] : undefined,
      },
    ];
  }),
);

// ── Config d'adaptation ──────────────────────────────────────────────────────
export type ObjectiveFr = 'perte_de_gras' | 'maintien' | 'prise_de_masse';
export interface RecipeConfig {
  scaling_factors_by_role: Partial<Record<MacroRole, [number, number]>>;
  rounding_step_g: number;
  protein_floor_tolerance: number;
}
// JSON infère les bornes [min,max] en number[] ; on passe par unknown pour le tuple.
export const RECIPE_CONFIG: RecipeConfig = raw.config as unknown as RecipeConfig;

// ── Recettes brutes (forme JSON, non mappée) ─────────────────────────────────
export interface RawIngredient { ref: string; qty: number; macro_role: MacroRole; scalable: boolean }
export interface RawRecipe {
  id: string; name: string; category: 'petit_dej' | 'collation' | 'repas_complet';
  base_servings: number;
  tags: { objectif: ObjectiveFr[]; recup_jour_repos: boolean; sport: ('muscu'|'endurance'|'combats')[]; temps_min: number };
  ingredients: RawIngredient[]; instructions: string[]; why: string;
  macros_per_serving: Per100; recomp_flag?: string;
}
export const RAW_RECIPES: RawRecipe[] = raw.recipes as RawRecipe[];

/** Macros (Macros interne) d'une liste {ref, qty} via RECIPE_INGREDIENTS. Non arrondi. */
export function macrosForRefIngredients(items: { ref: string; qty: number }[]): Macros {
  const sum: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const { ref, qty } of items) {
    const r = RECIPE_INGREDIENTS[ref];
    if (!r) continue;
    const k = Math.max(0, qty) / 100;
    sum.kcal += r.per100g.kcal * k;
    sum.protein_g += r.per100g.protein_g * k;
    sum.carbs_g += r.per100g.carbs_g * k;
    sum.fat_g += r.per100g.fat_g * k;
  }
  return sum;
}
