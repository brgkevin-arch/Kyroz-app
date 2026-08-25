import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ingredient, Recipe, ShoppingItem, UserProfile } from './types';
import { getEffectiveRecipes } from './recipes';
import { RECIPE_INGREDIENTS } from './recipeData';
import { poidsUnitaire } from './units';
import { recipeAllowed } from './planEngine';

// ── La RÉSERVE ───────────────────────────────────────────────────────────────
// Module isolé : inventaire de ce qu'il reste en cuisine, alimenté à la clôture
// des courses, déduit automatiquement après chaque repas mangé, et qui dit quelles
// recettes sont réalisables avec ce qu'il reste.
//
// ⚠️ Le mot « frigo » a été retiré de l'interface le 2026-08-24 (décision fondateur) :
// la réserve porte AUSSI le placard, et un frigo ne peut pas contenir du riz sec.
// Le nom du module et la clé de stockage, eux, ne bougent pas — renommer la clé
// aurait demandé une migration, donc perdu la réserve de tous ceux qui en ont une.

export type PantryCategory = ShoppingItem['category'];

/** Où l'aliment se garde. Deux rangements physiques, deux listes à l'écran. */
export type Conservation = 'frais' | 'sec';

export interface PantryItem {
  name: string;
  quantity: number;
  unit: string;            // 'g' | 'ml' | 'pièce'
  category: PantryCategory;
  /** Absent = déduit de la catégorie (`conservationDe`). N'est écrit que si
   *  l'utilisateur a CORRIGÉ le classement automatique. */
  conservation?: Conservation;
}

// ── Frais ou sec : déduit de la catégorie, corrigeable en une touche ─────────
//
// Le classement automatique porte les articles qui arrivent des courses — personne
// ne va trier 69 lignes à la main. Il se trompe forcément quelque part (le tofu est
// dans « autres », donc annoncé sec ; le riz CUIT d'hier est un féculent, donc
// annoncé sec alors qu'il est au frigo), d'où la correction manuelle.
//
// ⚠️ Le champ est OPTIONNEL et n'est écrit qu'à la correction : c'est ce qui rend le
// classement rétroactif. Les réserves déjà enregistrées n'ont pas ce champ et se
// rangent quand même dès la première ouverture — même raison que la `ref` déduite du
// nom plus bas : une valeur stockée aurait demandé une migration, et les stocks
// existants seraient restés non classés jusqu'à ce qu'on les retouche un par un.
const CONSERVATION_PAR_CATEGORIE: Record<PantryCategory, Conservation> = {
  viandes: 'frais',
  légumes: 'frais',
  laitiers: 'frais',
  féculents: 'sec',
  autres: 'sec',
};

export function conservationDe(item: PantryItem): Conservation {
  return item.conservation ?? CONSERVATION_PAR_CATEGORIE[item.category] ?? 'sec';
}

/** Le stock d'un seul rangement, dans l'ordre où il a été saisi. */
export function parConservation(items: PantryItem[], c: Conservation): PantryItem[] {
  return items.filter((i) => conservationDe(i) === c);
}

export const PANTRY_KEY = '@kyroz:pantry';

// Condiments toujours supposés disponibles : on les ignore pour la couverture,
// on ne les déduit pas, et la liste de courses ne les propose pas (sel, huile…).
//
// 🔴 « VANILLE » A ÉTÉ RETIRÉ LE 2026-08-24, ET IL RENDAIT LA WHEY INVISIBLE.
// Trouvé à l'écran, pas dans le code : la liste « Ma réserve » annonçait « tu as
// tout ce qu'il faut » sur une barre protéinée alors que la réserve n'avait pas un
// gramme de whey. Cause — l'ingrédient du catalogue s'appelle **« Whey
// (neutre/vanille) »**, donc `isStaple` mordait sur son PARFUM.
//
// ⚠️ La conséquence dépassait cet écran, et c'était un manque SILENCIEUX sur les
// trois surfaces à la fois : `buildShoppingList` ne proposait jamais d'acheter de
// whey, la réserve ne la déduisait jamais, et la couverture la comptait pour
// acquise. **23 recettes** du catalogue en contiennent, à 25–30 g la portion : ce
// n'est pas une épice, c'est la source de protéines du repas.
//
// ⚠️ Balayage des 125 ingrédients du catalogue : ce mot ne servait QU'À ce faux
// positif — aucun autre ingrédient ne contient « vanille ». Une règle qui ne se
// déclenche que sur son erreur ne protège rien. Restent `huile_olive` (168
// recettes) et `miel` (14), deux vrais fonds de placard.
// ➡️ Compté par `reserveCouverture.test.ts` (« la whey n'est pas un condiment »).
const STAPLES = ['sel', 'poivre', 'épice', 'epice', 'huile', 'citron', 'moutarde', 'miel', 'vinaigre', 'cannelle', 'aneth'];

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

/** Corrige le rangement d'un aliment. Écrit le champ, donc fige le classement :
 *  un aliment corrigé ne repasse plus jamais par la déduction automatique. */
export function setConservation(
  items: PantryItem[], name: string, unit: string, conservation: Conservation,
): PantryItem[] {
  return items.map((i) =>
    norm(i.name) === norm(name) && i.unit === unit ? { ...i, conservation } : i,
  );
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
  have: number;           // nb couverts par la réserve, EN QUANTITÉ
  missing: Ingredient[];  // ce qui manque — `quantity_g` = le MANQUE, pas le besoin
  ratio: number;          // have / total
}

// ── « RÉALISABLE » COMPTE LES GRAMMES DEPUIS LE 2026-08-24 ───────────────────
//
// 🔴 LE DÉFAUT, signalé par le fondateur : `recipeCoverage` faisait un `some()` sur
// les noms. **10 g de riz oubliés au fond d'un paquet déclaraient réalisable une
// recette qui en demande 200.** L'écran annonçait donc un plat qu'on ne peut pas
// faire — et il l'annonçait au moment exact où l'on cherche quoi manger ce soir.
// C'est le mensonge que §10 interdit, et il était structurel : la présence ne dit
// rien de la quantité.
//
// ⚠️ La liste de courses, elle, comptait DÉJÀ les grammes (`buildShoppingList`
// soustrait quantité par quantité). Les deux écrans lisaient la même réserve et en
// tiraient deux vérités différentes : l'un achetait 190 g de riz pendant que
// l'autre disait « tu peux la faire ».
//
// ⚠️ TOLÉRANCE : une cuisine n'est pas un laboratoire. On considère couvert dès
// **95 %** du besoin — sinon 495 g de riz sur 500 g feraient échouer une recette
// que n'importe qui réussirait. Au-delà, ce qui manque est annoncé en clair.
const TOLERANCE_COUVERTURE = 0.95;

/**
 * Le stock disponible pour un ingrédient, converti dans SON unité.
 * `undefined` = un stock existe mais n'est pas comparable (pièces d'un aliment dont
 * on ne connaît pas le poids) — dans ce cas on retient la présence, comme avant, et
 * on n'invente ni un manque ni une couverture.
 */
function stockPour(items: PantryItem[], ing: Ingredient): number | undefined {
  const besoinUnit = ing.unit ?? 'g';
  let total = 0;
  let incomparable = false;

  for (const it of items) {
    if (!memeAliment(it.name, ing.name)) continue;
    if (it.unit === besoinUnit) { total += it.quantity; continue; }
    // Pièces ↔ grammes : convertible pour les aliments qui se comptent (œufs,
    // bananes…), via la MÊME table que l'affichage (`lib/units.ts`).
    const pu = poidsUnitaire(ing.name);
    if (pu && it.unit === 'pièce' && besoinUnit === 'g') { total += it.quantity * pu; continue; }
    if (pu && it.unit === 'g' && besoinUnit === 'pièce') { total += it.quantity / pu; continue; }
    incomparable = true;
  }

  if (total > 0) return total;
  return incomparable ? undefined : 0;
}

export function recipeCoverage(recipe: Recipe, items: PantryItem[], portions = 1): Coverage {
  let have = 0;
  let total = 0;
  const missing: Ingredient[] = [];

  for (const ing of recipe.ingredients) {
    if (isStaple(ing.name)) continue;
    total++;
    const besoin = ing.quantity_g * portions;
    const stock = stockPour(items, ing);

    if (stock === undefined) { have++; continue; }          // présent mais incomparable
    if (stock >= besoin * TOLERANCE_COUVERTURE) { have++; continue; }

    // Le manque, pas le besoin : « il te manque 120 g de riz », pas « 200 g ».
    missing.push({ ...ing, quantity_g: Math.max(1, Math.round(besoin - stock)) });
  }

  return { recipe, total, have, missing, ratio: total > 0 ? have / total : 0 };
}

/**
 * Recettes ordonnées par couverture décroissante (réalisables d'abord).
 * On exclut celles dont rien n'est disponible.
 *
 * ⚠️ `profile` FILTRE LE RÉGIME ET LES ALIMENTS ÉVITÉS depuis le 2026-08-24, avec le
 * prédicat du moteur de plan (`recipeAllowed`) et non une copie. Sans lui, la réserve
 * proposait du poulet à un végétarien : le moteur tenait sa promesse dans le plan et
 * l'écran d'à côté la reniait. Un profil absent (chargement) ne filtre rien — c'est le
 * comportement d'avant, jamais une autorisation implicite.
 */
export function cookableRecipes(items: PantryItem[], profile?: UserProfile | null): Coverage[] {
  if (items.length === 0) return [];
  return getEffectiveRecipes()
    .filter((r) => !profile || recipeAllowed(r, profile))
    .map((r) => recipeCoverage(r, items))
    .filter((c) => c.total > 0 && c.have > 0)
    .sort((a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length || a.recipe.name_fr.localeCompare(b.recipe.name_fr));
}
