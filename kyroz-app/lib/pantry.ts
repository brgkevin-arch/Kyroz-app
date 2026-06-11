import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Recipe, ShoppingItem } from './types';
import { getEffectiveRecipes } from './recipes';

// ── Garde-manger ─────────────────────────────────────────────────────────────
// Module isolé : inventaire de ce qu'il reste en cuisine, déduit automatiquement
// après chaque repas cuisiné, et propose les recettes réalisables avec les restes.

export type PantryCategory = ShoppingItem['category'];

export interface PantryItem {
  name: string;
  quantity: number;
  unit: string;            // 'g' | 'ml' | 'pièce'
  category: PantryCategory;
}

export const PANTRY_KEY = '@kyroz:pantry';
const SHOPPING_KEY = '@kyroz:shopping';

// Condiments toujours supposés disponibles : on les ignore pour la couverture
// et on ne les déduit pas (sel, huile, épices…).
const STAPLES = ['sel', 'poivre', 'épice', 'epice', 'huile', 'citron', 'moutarde', 'miel', 'vinaigre', 'cannelle', 'aneth', 'vanille'];

export function isStaple(name: string): boolean {
  const n = name.toLowerCase();
  return STAPLES.some((s) => n.includes(s));
}

function norm(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents (é→e…)
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')   // ligatures œ/æ → lettres simples
    .replace(/['‘’]/g, '');      // apostrophes (droites/courbes)
}

// Un article du garde-manger correspond-il à un ingrédient de recette ?
// Tolère ligatures (œ↔oe), accents, singulier/pluriel et libellés partiels —
// ex. « oeufs » saisi à la main ↔ « Œufs entiers » d'une recette.
function matches(pantryName: string, ingredientName: string): boolean {
  const a = norm(pantryName);
  const b = norm(ingredientName);
  return a === b || a.includes(b) || b.includes(a);
}

// Auto-catégorisation (ajout manuel + liste de courses). Couvre les ingrédients
// des 30 recettes. ORDRE IMPORTANT : règles spécifiques avant les génériques,
// car le 1er match gagne (ex. « lait de coco » avant « lait », « poisson » avant
// « pois », « beurre de cacahuète » avant « beurre »).
const CAT_MAP: [string, PantryCategory][] = [
  // Collisions de sous-chaîne — à matcher en premier
  ['lait de coco', 'autres'],
  ['beurre de cacahuète', 'autres'], ["beurre d'amande", 'autres'],
  ['cacahuète', 'autres'], ['amande', 'autres'],
  ['sauce', 'autres'], ['pesto', 'autres'], ['curry', 'autres'], ['pignon', 'autres'],
  ['bouillon', 'autres'], ['whey', 'autres'], ['tofu', 'autres'],
  ['sucre', 'autres'], ['vanille', 'autres'], ['granola', 'féculents'],
  ['haricots verts', 'légumes'],

  // Viandes & poissons
  ['poulet', 'viandes'], ['bœuf', 'viandes'], ['boeuf', 'viandes'], ['steak', 'viandes'],
  ['dinde', 'viandes'], ['jambon', 'viandes'], ['saumon', 'viandes'], ['thon', 'viandes'],
  ['cabillaud', 'viandes'], ['crevette', 'viandes'], ['poisson', 'viandes'],

  // Légumes & fruits
  ['brocoli', 'légumes'], ['épinard', 'légumes'], ['epinard', 'légumes'], ['tomate', 'légumes'],
  ['oignon', 'légumes'], ['salade', 'légumes'], ['banane', 'légumes'], ['patate douce', 'légumes'],
  ['avocat', 'légumes'], ['courgette', 'légumes'], ['poivron', 'légumes'], ['champignon', 'légumes'],
  ['concombre', 'légumes'], ['persil', 'légumes'], ['ciboulette', 'légumes'], ['ail', 'légumes'],
  ['myrtille', 'légumes'], ['fruits rouges', 'légumes'], ['framboise', 'légumes'],
  ['ananas', 'légumes'], ['maïs', 'légumes'], ['mais', 'légumes'], ['edamame', 'légumes'],
  ['ratatouille', 'légumes'], ['petits pois', 'légumes'], ['pomme de terre', 'légumes'],
  ['fruit', 'légumes'], ['légume', 'légumes'],

  // Féculents, céréales & légumineuses
  ['riz', 'féculents'], ['quinoa', 'féculents'], ['pâte', 'féculents'], ['pates', 'féculents'],
  ['nouille', 'féculents'], ['avoine', 'féculents'], ['flocons', 'féculents'], ['pain', 'féculents'],
  ['semoule', 'féculents'], ['tortilla', 'féculents'], ['farine', 'féculents'],
  ['boulgour', 'féculents'], ['galette de riz', 'féculents'],
  ['lentille', 'féculents'], ['pois chiche', 'féculents'], ['haricot', 'féculents'],

  // Produits laitiers & œufs
  ['fromage', 'laitiers'], ['lait', 'laitiers'], ['yaourt', 'laitiers'], ['œuf', 'laitiers'],
  ['oeuf', 'laitiers'], ['skyr', 'laitiers'], ['feta', 'laitiers'], ['parmesan', 'laitiers'],
  ['emmental', 'laitiers'], ['crème', 'laitiers'], ['creme', 'laitiers'], ['cottage', 'laitiers'],
  ['beurre', 'laitiers'],
];

export function categorize(name: string): PantryCategory {
  const n = norm(name);
  // norm(kw) pour comparer sans accents/ligatures des deux côtés.
  for (const [kw, cat] of CAT_MAP) if (n.includes(norm(kw))) return cat;
  return 'autres';
}

// ── Persistance ──────────────────────────────────────────────────────────────

export async function loadPantry(): Promise<PantryItem[]> {
  const raw = await AsyncStorage.getItem(PANTRY_KEY);
  return raw ? (JSON.parse(raw) as PantryItem[]) : [];
}

export async function savePantry(items: PantryItem[]): Promise<void> {
  await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(items));
}

// ── Mutations (pures : renvoient une nouvelle liste) ─────────────────────────

export function addOrMerge(items: PantryItem[], add: PantryItem): PantryItem[] {
  const idx = items.findIndex((i) => norm(i.name) === norm(add.name) && i.unit === add.unit);
  if (idx >= 0) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + add.quantity };
    return copy;
  }
  return [...items, { ...add, name: add.name.trim() }];
}

export function removeItem(items: PantryItem[], name: string, unit: string): PantryItem[] {
  return items.filter((i) => !(norm(i.name) === norm(name) && i.unit === unit));
}

/** Ajoute les articles d'une liste de courses au garde-manger (hors condiments). */
export function seedFromShopping(items: PantryItem[], shopping: ShoppingItem[]): PantryItem[] {
  let res = items;
  for (const s of shopping) {
    if (isStaple(s.name)) continue; // sel, huile, épices… : tout le monde en a
    res = addOrMerge(res, { name: s.name, quantity: s.quantity, unit: s.unit, category: s.category });
  }
  return res;
}

/** Garde-manger visible : on masque les condiments universels. */
export function visiblePantry(items: PantryItem[]): PantryItem[] {
  return items.filter((i) => !isStaple(i.name));
}

export async function loadShoppingItems(): Promise<ShoppingItem[] | null> {
  const raw = await AsyncStorage.getItem(SHOPPING_KEY);
  if (!raw) return null;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list.items) ? (list.items as ShoppingItem[]) : null;
  } catch {
    return null;
  }
}

/** Déduit du garde-manger les ingrédients d'une recette cuisinée (× portions). */
export function deductRecipe(items: PantryItem[], recipe: Recipe, portions: number): PantryItem[] {
  let res = [...items];
  for (const ing of recipe.ingredients) {
    if (isStaple(ing.name)) continue;
    const idx = res.findIndex((i) => matches(i.name, ing.name));
    if (idx < 0) continue;
    const used = ing.quantity_g * portions;
    const remaining = res[idx].quantity - used;
    if (remaining > 1) {
      res[idx] = { ...res[idx], quantity: Math.round(remaining) };
    } else {
      res = res.filter((_, i) => i !== idx);
    }
  }
  return res;
}

// ── Couverture / recettes réalisables ────────────────────────────────────────

export interface Coverage {
  recipe: Recipe;
  total: number;          // nb d'ingrédients non-staples
  have: number;           // nb présents dans le garde-manger
  missing: Ingredient[];  // ingrédients manquants
  ratio: number;          // have / total
}

export function recipeCoverage(recipe: Recipe, items: PantryItem[]): Coverage {
  let have = 0;
  let total = 0;
  const missing: Ingredient[] = [];

  for (const ing of recipe.ingredients) {
    if (isStaple(ing.name)) continue;
    total++;
    const present = items.some((i) => matches(i.name, ing.name));
    if (present) have++;
    else missing.push(ing);
  }

  return { recipe, total, have, missing, ratio: total > 0 ? have / total : 0 };
}

/**
 * Recettes ordonnées par couverture décroissante (réalisables d'abord).
 * On exclut celles dont rien n'est disponible.
 */
export function cookableRecipes(items: PantryItem[]): Coverage[] {
  if (items.length === 0) return [];
  return getEffectiveRecipes()
    .map((r) => recipeCoverage(r, items))
    .filter((c) => c.total > 0 && c.have > 0)
    .sort((a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length || a.recipe.name_fr.localeCompare(b.recipe.name_fr));
}
