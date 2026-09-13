import type { Recipe, UserProfile } from './types';
import { goutRecette } from './gout';

// ── CE QU'UN HUMAIN VOIT DANS SON PLAN, ET QUE LES MACROS NE VOIENT PAS (D30) ──
//
// 🔴 LU DANS LE CARNET DES MENUS le 2026-09-13, sur un moteur dont tous les indicateurs
// étaient au vert (calories au kcal près, zéro repas mal calibré) :
//   · des petits-déjeuners qui sont des plats du midi (poêlée de thon aux pommes de
//     terre, bol de millet, nouilles sautées au tofu) ;
//   · le millet dans 7 repas par semaine, un ingrédient que peu de gens connaissent ;
//   · le même féculent deux fois dans la journée (semoule le matin, semoule à 16 h) ;
//   · des collations de 15 minutes, à la poêle, quand on les mange au bureau.
// Arbitrages du fondateur du 2026-09-14. Ce fichier ne porte que les RÈGLES, pures et
// sans import du moteur : `planEngine.ts` les applique en couches d'exclusion.
//
// ⚠️ Toutes se CALCULENT sur la recette (féculent, goût, étapes), aucune ne se tague à la
// main : une vague de catalogue les reçoit sans que personne n'ait à y penser.

/**
 * Féculents d'un plat chaud, du midi ou du soir. Un petit-déjeuner SALÉ qui en porte un
 * est un plat du midi servi à 8 h. Le pain, les wraps et les galettes de riz n'y sont pas :
 * la tartine salée est le petit-déjeuner salé ordinaire.
 */
export const FECULENTS_DE_PLAT = [
  'millet', 'polenta', 'sarrasin', 'quinoa', 'boulgour', 'chataigne',
  'riz_basmati', 'riz_complet', 'nouilles_riz', 'nouilles_completes', 'pates_completes', 'pates_semoule',
  'pomme_de_terre', 'patate_douce', 'semoule_couscous',
];

const feculentsDe = (r: Recipe): string[] =>
  [...new Set(r.ingredients.filter((i) => i.macro_role === 'carb' && i.ref).map((i) => i.ref!))];

/** Un petit-déjeuner qui est en réalité un plat du midi : salé, et bâti sur un féculent de plat. */
export function platDuMidi(r: Recipe): boolean {
  if (goutRecette(r) !== 'sale') return false;
  return feculentsDe(r).some((f) => FECULENTS_DE_PLAT.includes(f));
}

/** Temps maximal d'une collation « sur le pouce ». */
export const COLLATION_MINUTES_MAX = 10;

// ⚠️ Lu sur les ÉTAPES, avec des frontières de mot Unicode : `\b` de JavaScript ne
// connaît que l'ASCII, donc « sauté » suivi d'une espace n'aurait jamais été vu.
// « sans cuisson » est retiré avant la recherche : la crème de soja à l'avoine (col52)
// l'écrit en toutes lettres et passait pour une recette cuite.
// Mesuré le 2026-09-14 en relisant les 120 collations une par une : griller le pain,
// griller des graines à sec, réhydrater du soja texturé à l'eau bouillante et cuire un
// œuf dur COMPTENT comme cuisson — c'est l'option « sans cuisson » retenue, par
// opposition à « cuisson admise » (qui citait justement l'œuf dur et les graines).
const CUISSON = /(?<!\p{L})(cuire|cuis|cuit\p{L}*|cuisson|poêl\p{L}*|four|bouill\p{L}*|mijot\p{L}*|saisi\p{L}*|grill\p{L}*|dor[eé]\p{L}*|vapeur|réchauff\p{L}*|micro-ondes|revenir|toast\p{L}*|chau[dfs]\p{L}*|saut[eé]\p{L}*|frém\p{L}*)(?!\p{L})/iu;
const SANS_CUISSON = /sans (cuisson|cuire)/giu;

/** Les étapes demandent-elles une cuisson (poêle, eau bouillante, grille-pain, four…) ? */
export function demandeCuisson(r: Recipe): boolean {
  return CUISSON.test(r.steps.join(' ').replace(SANS_CUISSON, ''));
}

/** Une collation qu'on prépare en 10 minutes au plus, sans rien faire cuire. */
export function surLePouce(r: Recipe): boolean {
  return r.prep_time_min <= COLLATION_MINUTES_MAX && !demandeCuisson(r);
}

/** Ingrédient de base COURANT (riz, pâtes, pain, œufs, poulet…) : au plus 5 repas par semaine. */
export const INGREDIENT_COURANT_MAX_SEMAINE = 5;
/** Ingrédient de base RARE : au plus 2 repas par semaine. */
export const INGREDIENT_RARE_MAX_SEMAINE = 2;

/** Féculents peu courants en France, rares pour tout le monde. */
export const FECULENTS_RARES = ['millet', 'polenta', 'sarrasin', 'quinoa', 'chataigne'];
/** Protéines en poudre, rares pour tout le monde. */
export const POUDRES = ['whey', 'proteine_vegetale'];
/**
 * Protéines végétales travaillées : rares chez qui mange de la viande ou du poisson.
 * ⚠️ PAS chez un végétarien ou un vegan : pour lui, c'est la base de l'assiette, et les
 * plafonner à 2 le laisserait sans protéine à servir.
 */
export const PROTEINES_VEGETALES_RARES = [
  'edamame', 'seitan', 'tempeh', 'tofu_ferme', 'tofu_fume', 'tofu_soyeux', 'soja_texture',
  'yaourt_soja_proteine', 'levure_maltee', 'falafel',
  'steak_soja', 'emince_vegetal', 'hache_vegetal', 'galette_vegetale', 'boulette_vegetale', 'nuggets_vegetal', 'saucisse_vegetale',
];

/** Refs des ingrédients de BASE d'une recette : ses protéines et ses féculents, sans doublon. */
export function ingredientsDeBase(r: Recipe): string[] {
  return [...new Set(r.ingredients.filter((i) => (i.macro_role === 'carb' || i.macro_role === 'protein') && i.ref).map((i) => i.ref!))];
}

export { feculentsDe };

/**
 * Nombre maximal de repas de la semaine où cet ingrédient de base peut apparaître
 * (`Infinity` = aucun plafond).
 *
 * 🔴 DEUX EXCEPTIONS À « COURANT 5, RARE 2 », NÉES DE LA MESURE (2026-09-14, 3 corps ×
 * 3 objectifs × 3 variétés × 4 tirages, 10 profils) — la règle appliquée telle quelle
 * faisait passer les repas mal calibrés de **83 à 202** :
 *  1. **les poudres ne sont pas plafonnées.** Elles portent la protéine du jour chez qui
 *     n'a ni laitage ni viande à portée : à 2 par semaine, « sans lactose » passait de 1 à
 *     **65** repas mal calibrés et « vegan » de 2 à **18**. Sans ce plafond : 2 et 4 ;
 *  2. **chez un végétarien ou un vegan, seuls les féculents rares le sont.** Tofu, soja
 *     texturé et yaourt de soja sont la base de chaque repas ; même plafonnés à 5, ils
 *     laissaient le vegan sans protéine à servir (plafond dépassé 88 semaines sur 108).
 * Avec les deux : **94** repas mal calibrés (83 sur `main`). Le reste tombe sur le
 * végétarien sans gluten (10 → 17) et le pescétarien (5 → 9), et retirer « sur le pouce »
 * ou « même féculent le même jour » ne le réduit pas (107 dans les deux cas).
 * ⚠️ Plafonner les seuls FÉCULENTS rendait 93 : l'écart est nul, et la règle retenue garde
 * le « courant 5 » sur les protéines (œufs, poulet) que le fondateur avait choisi.
 */
export function plafondIngredient(ref: string, profile: UserProfile): number {
  if (FECULENTS_RARES.includes(ref)) return INGREDIENT_RARE_MAX_SEMAINE;
  const regimes = profile.dietary_restrictions ?? [];
  if (regimes.includes('vegan') || regimes.includes('vegetarian')) return Infinity;
  if (POUDRES.includes(ref)) return Infinity;
  if (PROTEINES_VEGETALES_RARES.includes(ref)) return INGREDIENT_RARE_MAX_SEMAINE;
  return INGREDIENT_COURANT_MAX_SEMAINE;
}
