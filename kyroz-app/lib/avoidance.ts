// ── Aliments évités — normalisation et FAMILLES ─────────────────────────────
//
// `disliked_foods` est un filtre DUR (cf. `planEngine.recipeAllowed`) : un mot écrit par
// l'utilisateur retire toute recette dont un ingrédient le contient. Jusqu'au 2026-08-02,
// la comparaison était une sous-chaîne brute sur le NOM AFFICHÉ de l'ingrédient — ni
// normalisation, ni synonyme. Mesuré sur les 123 refs du catalogue, le champ échouait
// **en silence** sur les mots les plus spontanés :
//
//   mot écrit             refs porteurs   attrapés   recettes qui restaient servies
//   « poisson »                 7             0                  66
//   « arachide »                1             0                  29
//   « oeuf » (sans ligature)    2             0                  53
//   « fruits à coque »          5             0                  96
//   « lactose »                10             0                 130
//   « soja »                   12             7      tofu, tempeh et edamame passaient
//   « noix »                    5             1      amandes, noisettes, purée d'amande
//
// L'utilisateur croyait avoir exclu le poisson et le moteur lui en servait. C'est
// exactement ce que `CLAUDE.md` §10 interdit : ce qui est annoncé doit être ce qui est
// servi. (Le cas qui avait ouvert la tâche D3 — le sésame du `tahini` — est d'ailleurs
// le SEUL qui fonctionnait : l'ingrédient s'appelle « Purée de sésame (tahini) ».)
//
// ⚠️ CE N'EST PAS UN FILTRE ALLERGÈNE, et l'UI ne doit jamais le présenter comme tel.
// Un catalogue générique ne connaît ni les traces, ni la contamination croisée, ni la
// composition exacte des produits industriels qu'il emploie (falafel prêt à consommer,
// pesto, chapelure). Promettre « sans arachide » serait une promesse de sécurité que
// Kyroz ne peut pas tenir, et le produit n'est pas un dispositif médical (`CLAUDE.md` §6).
// Ce module fait UNE chose : quand l'utilisateur écrit un mot de famille, on retire les
// aliments de cette famille au lieu de n'en retirer aucun.

import type { Recipe } from './types';

/** Minuscules + ligatures aplaties (œ→oe, æ→ae) + accents retirés. */
export function normalizeFood(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Mots de FAMILLE → `ref` couverts.
 *
 * Ne contient QUE ce qu'une sous-chaîne sur le nom ne trouve pas seule : inutile d'y
 * lister « saumon », le nom de l'ingrédient le porte déjà. Les clés sont écrites
 * normalisées (sans accent) parce que la recherche normalise les deux côtés. La source
 * de vérité est le `ref` : un nom affiché peut changer, un ref non.
 */
export const FOOD_FAMILIES: Record<string, string[]> = {
  poisson: ['saumon', 'saumon_fume', 'cabillaud', 'thon_frais', 'thon_naturel', 'maquereau', 'sardines'],
  crustace: ['crevettes'],
  'fruit de mer': ['crevettes'],
  arachide: ['beurre_cacahuete'],
  'fruits a coque': ['amandes', 'beurre_amande', 'noix', 'noisettes', 'lait_amande'],
  'fruit a coque': ['amandes', 'beurre_amande', 'noix', 'noisettes', 'lait_amande'],
  oleagineux: ['amandes', 'beurre_amande', 'noix', 'noisettes', 'lait_amande', 'beurre_cacahuete'],
  // « soja » attrape déjà 7 refs par le nom ; ces cinq-là ne le portent pas.
  soja: ['tofu_ferme', 'tofu_soyeux', 'tofu_fume', 'tempeh', 'edamame'],
  lactose: ['skyr', 'fromage_blanc_0', 'yaourt_grec', 'cottage_cheese', 'whey', 'lait_demi_ecreme', 'mozzarella', 'feta', 'parmesan', 'pesto'],
  laitier: ['skyr', 'fromage_blanc_0', 'yaourt_grec', 'cottage_cheese', 'whey', 'lait_demi_ecreme', 'mozzarella', 'feta', 'parmesan', 'pesto'],
  fromage: ['mozzarella', 'feta', 'parmesan', 'cottage_cheese', 'fromage_blanc_0', 'pesto'],
  // Le gluten a son propre régime (`gluten_free`), plus complet et plus sûr que ce
  // chemin ; on le résout quand même, parce qu'un utilisateur peut l'écrire ici sans
  // avoir coché le régime.
  gluten: ['flocons_avoine', 'pain_complet', 'pain_seigle', 'pates_completes', 'pates_semoule', 'nouilles_completes', 'boulgour', 'semoule_couscous', 'tortilla_complete', 'pain_pita_complet', 'seitan', 'sauce_soja', 'chapelure', 'levure_maltee', 'falafel'],
  ble: ['pain_complet', 'pates_completes', 'pates_semoule', 'nouilles_completes', 'boulgour', 'semoule_couscous', 'tortilla_complete', 'pain_pita_complet', 'seitan', 'chapelure', 'falafel'],
  viande: ['poulet_filet', 'dinde_escalope', 'boeuf_5', 'boeuf_bavette', 'porc_filet', 'jambon_blanc'],
  volaille: ['poulet_filet', 'dinde_escalope'],
  porc: ['porc_filet', 'jambon_blanc'],
};

/** Refs couverts par un mot, s'il désigne une famille (déjà normalisé ou non). */
export function familyRefs(keyword: string): string[] {
  return FOOD_FAMILIES[normalizeFood(keyword)] ?? [];
}

/** Texte de recherche d'une recette : ses noms d'ingrédients, normalisés. */
export function recipeSearchText(recipe: Recipe): string {
  return recipe.ingredients.map((i) => normalizeFood(i.name)).join(' ');
}

/**
 * Le mot apparaît-il en DÉBUT DE MOT dans ce texte ?
 *
 * ⚠️ Pas une sous-chaîne libre, et c'est un vrai bug corrigé — pas un raffinement.
 * `bœuf` CONTIENT `œuf` : avant le 2026-08-02, un utilisateur qui écrivait « œuf » pour
 * éviter les œufs perdait aussi **23 plats de bœuf** sur les 24 du catalogue, en silence.
 * La normalisation des ligatures aggravait le piège en le rendant vrai pour les deux
 * orthographes. L'ancrage se fait au DÉBUT seulement, jamais à la fin : « lentille » doit
 * continuer d'attraper « lentilles corail », et « pate » « pâtes complètes ».
 */
function matchesAtWordStart(text: string, kw: string): boolean {
  const echappe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${echappe}`).test(text);
}

/**
 * La recette contient-elle l'aliment évité ?
 *
 * Deux chemins, dans cet ordre : le nom (début de mot, normalisé), puis la FAMILLE
 * (par `ref`, cf. `FOOD_FAMILIES`).
 */
export function recipeContainsFood(recipe: Recipe, keyword: string): boolean {
  const kw = normalizeFood(keyword);
  if (!kw) return false;
  if (matchesAtWordStart(recipeSearchText(recipe), kw)) return true;
  const refs = FOOD_FAMILIES[kw];
  if (!refs) return false;
  return recipe.ingredients.some((i) => i.ref !== undefined && refs.includes(i.ref));
}

/**
 * Le mot écrit désigne-t-il quelque chose que le catalogue connaît ?
 *
 * Sert à ne PAS laisser un mot sans effet passer pour un filtre actif — c'était le
 * défaut principal : rien ne disait à l'utilisateur que « poisson » n'attrapait rien.
 */
export function foodKeywordMatches(recipes: Recipe[], keyword: string): number {
  const kw = normalizeFood(keyword);
  if (!kw) return 0;
  return recipes.filter((r) => recipeContainsFood(r, kw)).length;
}
