import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Recipe, ShoppingItem } from './types';
import { getEffectiveRecipes } from './recipes';
import { RECIPE_INGREDIENTS } from './recipeData';

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
//
// ⚠️ CE PRÉDICAT EST DÉLIBÉRÉMENT LARGE, ET C'EST SA LIMITE : l'inclusion joue
// dans LES DEUX SENS, donc un nom composé avale le nom simple qu'il contient.
// Ne plus l'employer seul sur deux ingrédients du CATALOGUE — voir `memeAliment`.
export function matches(pantryName: string, ingredientName: string): boolean {
  const a = norm(pantryName);
  const b = norm(ingredientName);
  return a === b || a.includes(b) || b.includes(a);
}

// ── Deux noms désignent-ils le MÊME aliment ? ────────────────────────────────
//
// 🔴 LE DÉFAUT MESURÉ, le 2026-08-14 (signalé par le fondateur : « la carotte ne
// se range pas dans l'historique une fois les courses terminées »).
// `matches('Carotte', 'Mélange wok (poivron/brocoli/carotte)')` rend **true** :
// le nom du mélange CONTIENT le mot carotte. La soustraction du garde-manger
// parcourt les ingrédients dans l'ordre du plan ; le mélange passait avant, il
// mangeait les 120 g de carotte du frigo, et la carotte revenait sur la liste à
// chaque recalcul. Chaque « Courses terminées » archivait donc UN article, en
// boucle, sans que rien ne paraisse cassé.
//
// Balayage des 125 ingrédients du catalogue (`npm run mesure:collisions`) :
// **9 couples se confondent**, dont quatre franchement faux —
//   Pomme ⟷ Pomme de terre · Carotte, Brocoli, Poivron ⟷ Mélange wok.
// Les cinq autres sont des variantes du même aliment (Pois chiches ⟷ Pois
// chiches en conserve, Tomate ⟷ Tomate concassée) : elles se confondaient
// « utilement », mais leurs poids n'ont rien à voir — 100 g de pois chiches secs
// ne remplacent pas 100 g de pois chiches égouttés. Les séparer est un correctif
// aussi, pas une régression.
//
// ➡️ LA RÈGLE : quand les deux noms désignent des ingrédients du catalogue, c'est
// leur `ref` qui tranche — deux refs différentes sont deux aliments différents,
// quoi que disent leurs libellés. Le nom ne sert que pour ce que le catalogue ne
// connaît pas : les articles SAISIS À LA MAIN dans le frigo, où « oeufs » doit
// continuer de retrouver « Œufs entiers ».
//
// ⚠️ La `ref` se DÉDUIT du nom, elle n'est pas stockée dans `PantryItem` — et
// c'est ce qui rend le correctif rétroactif. La stocker aurait demandé une
// migration : les frigos existants n'en auraient pas eu, donc la carotte déjà
// rangée serait restée fautive jusqu'à ce qu'on la recoche. Personne n'aurait
// compris pourquoi le bug survivait au correctif.

/** Nom normalisé → `ref` du catalogue. Une seule construction, au chargement. */
const REF_PAR_NOM: Map<string, string> = new Map(
  Object.entries(RECIPE_INGREDIENTS).map(([ref, def]) => [norm(def.name), ref] as const),
);

/** La `ref` catalogue d'un nom, s'il en désigne une EXACTEMENT (sinon `undefined`). */
export function refDuNom(name: string): string | undefined {
  return REF_PAR_NOM.get(norm(name));
}

/** Le prédicat à employer partout où l'on apparie un stock et un ingrédient. */
export function memeAliment(a: string, b: string): boolean {
  const ra = refDuNom(a);
  const rb = refDuNom(b);
  if (ra && rb) return ra === rb;
  return matches(a, b);
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

/** Inverse de addOrMerge : retire `qty` du stock d'un article sans passer sous 0,
 *  et ne supprime l'entrée que si elle atteint 0. Décocher un article de courses
 *  ne doit effacer que ce que le cochage avait ajouté, pas le stock déjà saisi à
 *  la main. */
export function subtractQuantity(items: PantryItem[], name: string, unit: string, qty: number): PantryItem[] {
  const idx = items.findIndex((i) => norm(i.name) === norm(name) && i.unit === unit);
  if (idx < 0) return items;
  const remaining = items[idx].quantity - qty;
  if (remaining > 0) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], quantity: remaining };
    return copy;
  }
  return items.filter((_, i) => i !== idx);
}

/** Garde-manger visible : on masque les condiments universels. */
export function visiblePantry(items: PantryItem[]): PantryItem[] {
  return items.filter((i) => !isStaple(i.name));
}

/** Déduit du garde-manger une liste d'ingrédients DÉJÀ mis à l'échelle (quantités
 *  effectives d'un repas — adaptées par ingrédient ou recette×portions). */
export function deductIngredients(
  items: PantryItem[],
  used: { name: string; quantity_g: number; unit?: string }[],
): PantryItem[] {
  let res = [...items];
  for (const u of used) {
    if (isStaple(u.name)) continue;
    const idx = res.findIndex((i) => memeAliment(i.name, u.name));
    if (idx < 0) continue;
    const remaining = res[idx].quantity - u.quantity_g;
    if (remaining > 1) {
      res[idx] = { ...res[idx], quantity: Math.round(remaining) };
    } else {
      res = res.filter((_, i) => i !== idx);
    }
  }
  return res;
}

/** Déduit du garde-manger les ingrédients d'une recette cuisinée (× portions). */
export function deductRecipe(items: PantryItem[], recipe: Recipe, portions: number): PantryItem[] {
  return deductIngredients(
    items,
    recipe.ingredients.map((i) => ({ name: i.name, quantity_g: i.quantity_g * portions, unit: i.unit })),
  );
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
    const present = items.some((i) => memeAliment(i.name, ing.name));
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

// ── L'ORDRE NE BOUGE PLUS PENDANT QU'ON CUISINE ─────────────────────────────
//
// 🔴 LE DÉFAUT MESURÉ, le 2026-08-14 (signalé par le fondateur, capture vidéo à
// l'appui). « Cuisiné » déduit les ingrédients, donc la recette quitte la liste
// des réalisables — et TOUTES celles du dessous remontent d'un cran. Le bouton
// suivant arrive exactement là où le doigt vient de se poser.
// **Mesuré au simulateur : quatre appuis au MÊME pixel ont cuisiné QUATRE
// recettes différentes**, frigo 35 → 28 aliments, prêtes 19 → 15. Aucune n'était
// choisie, et la déduction est irréversible (ni confirmation, ni annulation).
// ⚠️ Et l'effet dépasse la recette cuisinée : le premier appui a fait tomber la
// liste de 19 à 17, parce qu'une AUTRE recette a perdu un ingrédient au passage.
// Retirer seulement la carte touchée n'aurait donc pas suffi à figer la mise en
// page — c'est l'ORDRE entier qu'il faut tenir.
//
// ➡️ On gèle l'ORDRE, jamais le CONTENU. Chaque carte garde sa place, mais son
// état est relu à chaque rendu : une recette devenue infaisable reste où elle est
// et le dit. Geler le contenu aurait affiché « réalisable maintenant » sur une
// recette dont on vient de manger le riz — le mensonge que §10 interdit.
//
// ⚠️ Les recettes CUISINÉES ne sortent plus de `cookableRecipes` par hasard : si
// la déduction vide leur dernier ingrédient, leur `Coverage` disparaît. D'où
// l'instantané `figes` — sans lui, la carte qu'on vient de toucher s'évaporerait,
// et le trou refermerait la liste sous le doigt.
export function listeStable(
  ordre: string[] | null,
  courant: Coverage[],
  figes: Record<string, Coverage>,
): Coverage[] {
  if (!ordre) return courant;
  const parId = new Map(courant.map((c) => [c.recipe.id, c]));
  const out: Coverage[] = [];
  for (const id of ordre) {
    const c = parId.get(id) ?? figes[id];
    if (c) out.push(c);
  }
  return out;
}
