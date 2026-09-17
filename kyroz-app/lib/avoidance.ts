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
  // « soja » attrape déjà par le nom les refs qui le portent ; ceux-ci ne le portent pas.
  // Les pièces et aliments végétaux y sont par PRUDENCE : un seul produit relevé au soja
  // suffit (cf. lib/etiquettesVegetales.ts, et Ciqual pour nuggets, saucisses, boulettes).
  soja: ['tofu_ferme', 'tofu_soyeux', 'tofu_fume', 'tempeh', 'edamame', 'nuggets_vegetal', 'saucisse_vegetale', 'boulette_vegetale', 'filets_poulet_vegetal', 'aiguillettes_poulet_vegetal', 'lardons_vegetaux', 'merguez_vegetale', 'chorizo_vegetal', 'jambon_vegetal', 'escalope_vegetale'],
  lactose: ['skyr', 'fromage_blanc_0', 'yaourt_grec', 'cottage_cheese', 'whey', 'lait_demi_ecreme', 'mozzarella', 'feta', 'parmesan', 'pesto'],
  laitier: ['skyr', 'fromage_blanc_0', 'yaourt_grec', 'cottage_cheese', 'whey', 'lait_demi_ecreme', 'mozzarella', 'feta', 'parmesan', 'pesto'],
  fromage: ['mozzarella', 'feta', 'parmesan', 'cottage_cheese', 'fromage_blanc_0', 'pesto'],
  // Le gluten a son propre régime (`gluten_free`), plus complet et plus sûr que ce
  // chemin ; on le résout quand même, parce qu'un utilisateur peut l'écrire ici sans
  // avoir coché le régime.
  gluten: ['flocons_avoine', 'pain_complet', 'pain_seigle', 'pates_completes', 'pates_semoule', 'nouilles_completes', 'boulgour', 'semoule_couscous', 'tortilla_complete', 'pain_pita_complet', 'seitan', 'sauce_soja', 'chapelure', 'levure_maltee', 'falafel', 'emince_vegetal', 'galette_vegetale', 'nuggets_vegetal', 'boulette_vegetale', 'lardons_vegetaux', 'aiguillettes_poulet_vegetal', 'merguez_vegetale', 'chorizo_vegetal', 'escalope_vegetale'],
  ble: ['pain_complet', 'pates_completes', 'pates_semoule', 'nouilles_completes', 'boulgour', 'semoule_couscous', 'tortilla_complete', 'pain_pita_complet', 'seitan', 'chapelure', 'falafel', 'emince_vegetal', 'galette_vegetale', 'nuggets_vegetal', 'boulette_vegetale', 'merguez_vegetale', 'chorizo_vegetal', 'escalope_vegetale'],
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
 * Le mot apparaît-il comme un MOT ENTIER ? (début ET fin)
 *
 * Sert au seul repli du pluriel ci-dessous. L'ancrage au début suffit pour ce que
 * l'utilisateur écrit lui-même (« lentille » doit attraper « lentilles corail »),
 * mais il est trop large pour une forme que le programme DEVINE.
 */
function matchesWholeWord(text: string, kw: string): boolean {
  const echappe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${echappe}(?![a-z0-9])`).test(text);
}

/** Articles qu'on écrit sans y penser devant un aliment. */
const ARTICLES = ['le ', 'la ', 'les ', "l'", 'du ', 'de la ', "de l'", 'des ', 'de ', "d'", 'un ', 'une ', 'au ', 'aux '];

/** « le tofu » → « tofu ». Rend le mot inchangé s'il ne commence pas par un article. */
export function sansArticle(kw: string): string {
  for (const a of ARTICLES) if (kw.startsWith(a)) return kw.slice(a.length).trim();
  return kw;
}

/**
 * « tofus » → « tofu ». `null` quand il n'y a pas de pluriel plausible à retirer.
 *
 * ⚠️ Le dernier mot doit faire au moins 4 lettres : « ris » ou « jus » ne sont pas des
 * pluriels, et les amputer fabriquerait des mots qui n'existent pas.
 */
export function singulier(kw: string): string | null {
  const dernier = kw.split(' ').pop() ?? '';
  return /^[a-z]{4,}[sx]$/.test(dernier) ? kw.slice(0, -1) : null;
}

/** Le chemin d'origine : le nom (début de mot), puis la FAMILLE (par `ref`). */
function correspond(recipe: Recipe, kw: string): boolean {
  if (matchesAtWordStart(recipeSearchText(recipe), kw)) return true;
  const refs = FOOD_FAMILIES[kw];
  return refs !== undefined && recipe.ingredients.some((i) => i.ref !== undefined && refs.includes(i.ref));
}

/**
 * La recette contient-elle l'aliment évité ?
 *
 * Trois essais, du plus littéral au plus deviné : le mot tel qu'il est écrit, puis
 * sans son article, puis au singulier.
 *
 * 🔴 **LE PLURIEL ET L'ARTICLE NE FILTRAIENT RIEN (corrigé le 2026-09-17).** Mesuré le
 * 2026-09-15 sur le retour d'une personne au régime sans gluten : « tofu » écartait
 * 39 recettes, « tofus » et « le tofu » en écartaient **zéro**. Le champ le disait
 * (« aucun ingrédient ne correspond »), donc personne n'était trompé en silence — mais
 * il fallait comprendre pourquoi et réessayer, sur le seul écran qui protège un dégoût
 * ou une allergie.
 *
 * ⚠️ **Le singulier deviné exige un MOT ENTIER, et c'est tout le correctif.** Avec
 * l'ancrage au seul début de mot, « pois » (dont le singulier deviné est « poi »)
 * attraperait « poivron », et « ananas » → « anana » n'importe quoi qui commence
 * pareil. La forme devinée doit donc correspondre à un mot COMPLET du nom : c'est le
 * même garde-fou que `bœuf` ⊃ `œuf`, appliqué à l'autre bout du mot.
 */
export function recipeContainsFood(recipe: Recipe, keyword: string): boolean {
  const kw = normalizeFood(keyword);
  if (!kw) return false;
  if (correspond(recipe, kw)) return true;
  const nu = sansArticle(kw);
  if (nu !== kw && correspond(recipe, nu)) return true;
  const sing = singulier(nu);
  if (sing === null) return false;
  if (matchesWholeWord(recipeSearchText(recipe), sing)) return true;
  const refs = FOOD_FAMILIES[sing];
  return refs !== undefined && recipe.ingredients.some((i) => i.ref !== undefined && refs.includes(i.ref));
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

/** En deçà, une frappe propose presque tout le catalogue : ce n'est plus une suggestion. */
export const SUGGESTION_MIN_LETTRES = 2;

/**
 * Les noms d'ingrédients du catalogue qu'une frappe peut désigner (demande fondateur du
 * 2026-09-15 : « s'il y a écrit tofu, il doit être proposé tous les mots commençant par
 * TOFU qui sont répertoriés »).
 *
 * Même règle que le filtre du moteur, `matchesAtWordStart` : « tofu » propose Tofu ferme,
 * Tofu fumé et Tofu soyeux, « œuf » ne propose pas le bœuf. Une suggestion ne peut donc
 * jamais être un mot sans effet — elle sort d'une recette, elle en écarte au moins une.
 *
 * ⚠️ Les noms viennent des RECETTES, pas de la table de référence : un ingrédient que
 * plus aucune recette n'emploie proposerait un mot qui n'écarte rien.
 * ⚠️ Ce qu'un mot déjà enregistré couvre n'est plus proposé : « tofu » enregistré écarte
 * déjà les trois sortes, « Tofu fumé » en plus ne ferait qu'une bulle redondante.
 * ⚠️ Le mot tapé reste enregistrable tel quel (Entrée) : choisir UNE sorte laisse passer
 * les autres, et c'est le mot entier qui les écarte toutes.
 */
export function suggestionsAliments(recipes: Recipe[], frappe: string, deja: readonly string[] = []): string[] {
  const kw = normalizeFood(frappe);
  if (kw.length < SUGGESTION_MIN_LETTRES) return [];
  const couverts = deja.map(normalizeFood).filter(Boolean);
  const noms = new Map<string, string>();
  for (const r of recipes) {
    for (const i of r.ingredients) {
      const cle = normalizeFood(i.name);
      if (noms.has(cle) || !matchesAtWordStart(cle, kw)) continue;
      if (couverts.some((c) => matchesAtWordStart(cle, c))) continue;
      noms.set(cle, i.name.trim());
    }
  }
  return [...noms.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}
