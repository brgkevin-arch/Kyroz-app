import { Recipe } from './types';
import { RECIPES } from './recipeMap';

// Base de recettes Kyroz (100), mappée depuis lib/data/recettes-kyroz-100.json
// (cf. lib/recipeData.ts + lib/recipeMap.ts). validated_by_dietitian: false —
// à valider avant prod.
export { RECIPES };

// ── Overrides perso (recettes éditées par l'utilisateur) ─────────────────────
// Registre module-level : la base reste figée (RECIPES), l'utilisateur peut
// remplacer une recette par SA version. Le moteur, le garde-manger et les écrans
// lisent les recettes EFFECTIVES (base ⊕ overrides) via ces accesseurs. Le
// registre est hydraté au démarrage depuis AsyncStorage (cf. useRecipeOverrides)
// pour que la génération (fonction pure, hors React) voie les overrides.

let recipeOverrides: Record<string, Recipe> = {};

export function setRecipeOverrides(map: Record<string, Recipe> | null | undefined): void {
  recipeOverrides = map ?? {};
}

/** Liste effective : chaque recette de base remplacée par sa version perso si elle existe. */
export function getEffectiveRecipes(): Recipe[] {
  return RECIPES.map((r) => recipeOverrides[r.id] ?? r);
}

/** Recette effective par id (override prioritaire). */
export function getRecipeById(id: string): Recipe | undefined {
  return recipeOverrides[id] ?? RECIPES.find((r) => r.id === id);
}

/** Recette de base d'origine (pour le « réinitialiser »). */
export function getBaseRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function isOverridden(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(recipeOverrides, id);
}
