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
  // « patate » est le mot courant pour la POMME DE TERRE (décision fondateur, 2026-09-18).
  // Il attrape déjà la patate douce par le nom ; la pomme de terre, elle, ne porte pas le
  // mot — sans cette ligne, quelqu'un qui écrit « patates » en recevait 23 assiettes.
  patate: ['pomme_de_terre'],
};

/**
 * CE QUI PORTE LE MOT SANS ÊTRE L'ALIMENT (décision fondateur, 2026-09-18).
 *
 * « pomme » retirait les 23 recettes à la POMME DE TERRE en plus des 20 à la pomme. Le
 * mot est bien là, au début d'un nom composé — mais ce n'est pas le même aliment.
 *
 * 🔴 **AUCUNE RÈGLE D'ÉCRITURE NE PEUT TRANCHER ÇA, et c'est pour ça que la table est
 * écrite à la main.** Le catalogue n'a QUE deux noms d'un seul mot qui commencent un nom
 * composé : « pomme » → « pomme de terre », et « tomate » → « tomate concassée ». Les deux
 * se ressemblent et s'opposent : une tomate concassée EST une tomate (qui écrit « tomate »
 * veut l'écarter), une pomme de terre n'est PAS une pomme. Une règle syntaxique ferait donc
 * forcément une erreur sur l'un des deux ; seul le SENS décide.
 *
 * ⚠️ La clé est le `ref`, jamais le nom affiché — un nom peut être réécrit demain.
 */
const PAS_LE_MEME_ALIMENT: Record<string, string[]> = {
  pomme_de_terre: ['pomme'],
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
 * Le mot écrit correspond-il à un MOT de ce texte — son pluriel toléré ?
 *
 * ⚠️ **Le DÉBUT est ancré depuis le 2026-08-02**, et c'est un vrai bug corrigé : `bœuf`
 * CONTIENT `œuf`, donc écrire « œuf » retirait **23 plats de bœuf** sur 24, en silence —
 * la normalisation des ligatures rendant le piège vrai pour les deux orthographes.
 *
 * 🔴 **ET LA FIN L'EST DEPUIS LE 2026-09-18** (décision fondateur : *« corrige pour que ça
 * ne retire plus les recettes à la courgette »*). Le même défaut vivait à l'autre bout du
 * mot : « courge » emportait les **32 plats à la COURGETTE**, deux légumes que personne ne
 * confond. Mesuré le jour même : « courge » écartait 63 recettes, dont 32 de courgette.
 *
 * ⚠️ **Le `s`/`x` final reste toléré, et c'est tout l'équilibre de cette fonction** : il ne
 * change pas l'aliment. Sans lui, « lentille » cesserait d'attraper « lentilles corail » et
 * « pate » « pâtes complètes » — on aurait corrigé un faux positif en créant des faux
 * négatifs, c'est-à-dire un filtre qui laisse passer ce qu'on lui demande d'écarter.
 */
function correspondAuMot(text: string, kw: string): boolean {
  const echappe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${echappe}(?:s|x)?(?![a-z0-9])`).test(text);
}

/**
 * Le texte contient-il un mot qui COMMENCE par cette frappe ?
 *
 * 🔴 **Ce n'est pas la même question que `correspondAuMot`, et les confondre a cassé les
 * suggestions** (attrapé par la suite le 2026-09-18) : quand la fin du mot a été ancrée
 * pour que « courge » n'emporte plus la courgette, taper « tof » a cessé de proposer
 * « Tofu ferme » — une frappe EN COURS est un préfixe, jamais un mot fini.
 * ➡️ Le FILTRE ancre les deux bouts ; la SUGGESTION n'ancre que le début.
 */
function debutDeMot(text: string, frappe: string): boolean {
  const echappe = frappe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${echappe}`).test(text);
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
  // ⚠️ CHAQUE mot, pas seulement le dernier (2026-09-18) : « pommes de terre » — la façon
  // la plus naturelle de l'écrire — n'écartait RIEN, parce que le catalogue dit « Pomme de
  // terre » et que le pluriel était sur le PREMIER mot.
  let change = false;
  const out = kw.split(' ').map((m) => {
    if (!/^[a-z]{4,}[sx]$/.test(m)) return m;
    change = true;
    return m.slice(0, -1);
  });
  return change ? out.join(' ') : null;
}

/**
 * Le chemin d'origine : le nom (mot entier, pluriel toléré), puis la FAMILLE (par `ref`).
 *
 * ⚠️ Ingrédient par ingrédient, et non sur le texte concaténé de la recette : c'est la
 * seule façon d'écarter un ingrédient NOMMÉMENT (`PAS_LE_MEME_ALIMENT`). Sur un texte
 * collé, « pomme » ne peut pas savoir quel ingrédient il vient d'attraper.
 */
function correspond(recipe: Recipe, kw: string): boolean {
  const parLeNom = recipe.ingredients.some((i) =>
    !(i.ref !== undefined && (PAS_LE_MEME_ALIMENT[i.ref] ?? []).includes(kw))
    && correspondAuMot(normalizeFood(i.name), kw));
  if (parLeNom) return true;
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
  // Le singulier deviné repasse par le MÊME chemin : sinon « pommes » rattraperait la
  // pomme de terre que « pomme » vient d'épargner.
  return sing !== null && correspond(recipe, sing);
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
 * Règle VOISINE de celle du filtre, mais pas la même (cf. `debutDeMot`) : « tofu » propose Tofu ferme,
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
      if (noms.has(cle) || !debutDeMot(cle, kw)) continue;
      if (couverts.some((c) => correspondAuMot(cle, c))) continue;
      noms.set(cle, i.name.trim());
    }
  }
  return [...noms.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}
