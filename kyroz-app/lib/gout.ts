// ── SUCRÉ OU SALÉ : le GOÛT d'une recette, et ce que l'utilisateur en préfère ──
//
// Demande fondateur (2026-09-12) : « qui mange un bol d'edamame avec du millet et du
// poivron à 8 h du matin ? On devrait demander à l'user si le matin et/ou pour ses
// collations il est plutôt sucré, salé, peu importe. » Arbitrages du 2026-09-13 :
// deux réponses séparées (petit-déjeuner, collation) · « majorité garantie » · posée à
// l'inscription ET dans Profil · « peu importe » pour les comptes existants.
//
// ⚠️ LE GOÛT SE CALCULE DEPUIS LES INGRÉDIENTS, IL NE SE POSE PAS À LA MAIN. Un tag
// écrit recette par recette se périme à chaque vague de catalogue, et un tag manuel
// n'arbitre pas mieux qu'un calcul (CLAUDE.md §10). La lecture se fait sur les `ref`,
// jamais sur les noms : « pomme » est un marqueur sucré, « pomme de terre » n'en est pas
// un, et un nom de recette ne dit pas toujours ce qu'il y a dans l'assiette.
//
// ⚠️ Ce fichier n'importe RIEN du moteur (seulement des types) : il se teste en
// l'appelant, comme `lib/revelation.ts` ou `lib/visee.ts`.

import type { Recipe } from './types';

/** Ce que la personne a répondu. `undefined`, `null` et toute valeur inconnue = « peu importe ». */
export type GoutPreference = 'sucre' | 'sale';

/**
 * La réponse À L'ÉCRAN, « peu importe » compris. `egal` s'enregistre `null` (cf.
 * `goutEnregistre`). Il existe pour que l'inscription distingue « pas encore répondu »
 * (`null` dans l'état de l'écran) de « répondu : peu importe ».
 */
export type GoutChoix = GoutPreference | 'egal';

export const GOUT_CHOIX: readonly { value: GoutChoix; label: string }[] = [
  { value: 'sucre', label: 'Sucré' },
  { value: 'sale', label: 'Salé' },
  { value: 'egal', label: 'Peu importe' },
];

/**
 * Ce qui s'enregistre pour une réponse d'écran.
 * 🔴 « Peu importe » s'écrit `null`, JAMAIS `undefined`. `JSON.stringify` et l'upsert
 * Supabase OMETTENT une clé `undefined` : passer de « Salé » à « Peu importe » laisserait
 * donc « sale » en base, et la synchronisation suivante le ramènerait. `null` efface.
 * (L'absence de clé reste réservée aux comptes d'avant la question.)
 */
export const goutEnregistre = (c: GoutChoix | null): GoutPreference | null =>
  c === 'sucre' || c === 'sale' ? c : null;

/** Le goût d'une recette. `neutre` et `mixte` ne comptent ni pour le sucré ni pour le salé. */
export type GoutRecette = 'sucre' | 'sale' | 'mixte' | 'neutre';

/**
 * Marqueurs FORTS du sucré : fruits, sucres ajoutés, cacao. Un seul suffit à rendre une
 * assiette sucrée, sauf si elle porte aussi un marqueur fort du salé (alors « mixte »).
 * ⚠️ Toute ref de petit-déjeuner ou de collation doit être rangée dans l'une des cinq
 * listes — `gout.test.ts` le compte. Une ref oubliée passerait pour neutre en silence.
 */
export const REFS_SUCREES: readonly string[] = [
  'banane', 'pomme', 'poire', 'framboises', 'myrtilles', 'fraises', 'fruits_rouges', 'kiwi',
  'mangue', 'ananas', 'raisins', 'dattes', 'abricot', 'orange', 'compote',
  'miel', 'sirop_erable', 'confiture', 'cacao_poudre', 'chocolat_noir',
];

/**
 * Marqueurs FAIBLES du sucré : ils vont surtout dans du sucré (riz au lait, pain perdu,
 * crème de marrons) mais un marqueur fort du salé l'emporte (« châtaigne fondante au
 * soja texturé » est un plat salé).
 */
export const REFS_SUCREES_FAIBLES: readonly string[] = ['chataigne', 'lait_demi_ecreme'];

/** Marqueurs FORTS du salé : légumes de plat, viande, poisson, légumineuses, assaisonnement. */
export const REFS_SALEES: readonly string[] = [
  'huile_olive', 'tomate', 'tomate_concassee', 'concombre', 'champignons', 'poivron',
  'carotte', 'roquette', 'salade_verte', 'courgette', 'brocoli', 'asperges', 'oignon',
  'haricots_verts', 'legumes_wok', 'pomme_de_terre',
  'jambon_blanc', 'dinde_escalope', 'poulet_filet', 'saumon_fume', 'saumon', 'thon_naturel',
  'edamame', 'tofu_ferme', 'tofu_fume', 'tempeh', 'seitan', 'soja_texture',
  'pois_chiches_conserve', 'lentilles_cuites', 'haricots_rouges_conserve', 'falafel',
  'feta', 'parmesan', 'olives', 'levure_maltee',
  'filets_poulet_vegetal', 'aiguillettes_poulet_vegetal', 'lardons_vegetaux', 'merguez_vegetale',
  'chorizo_vegetal', 'jambon_vegetal', 'escalope_vegetale',
];

/**
 * Marqueurs FAIBLES du salé : ils vont aussi dans des smoothies et des tartines sucrées.
 * Mesuré le 2026-09-13 : en marqueurs forts, « Smoothie bowl mangue – épinards »,
 * « Smoothie soja – mangue – avocat » et « Sarrasin, yaourt de soja, myrtilles, érable »
 * (tahini) sortaient « mixtes » — trois assiettes que personne ne prend pour du salé.
 */
export const REFS_SALEES_FAIBLES: readonly string[] = ['epinards', 'avocat', 'tahini'];

/**
 * Ingrédients qui ne font pencher d'aucun côté : ils vont dans un porridge comme dans
 * une tartine. L'ŒUF en fait partie à dessein — il est dans l'omelette ET dans les
 * pancakes ; ce sont les légumes ou les fruits qui l'accompagnent qui décident.
 */
export const REFS_NEUTRES: readonly string[] = [
  'flocons_avoine', 'amandes', 'graines_courge', 'graines_chia', 'noisettes', 'noix',
  'beurre_cacahuete', 'beurre_amande', 'skyr', 'yaourt_grec', 'fromage_blanc_0', 'cottage_cheese',
  'lait_amande', 'lait_coco', 'creme_soja', 'yaourt_soja_proteine',
  'whey', 'proteine_vegetale', 'oeuf_entier', 'blanc_oeuf', 'tofu_soyeux',
  'galette_riz', 'pain_complet', 'pain_seigle', 'pain_pita_complet', 'pain_sans_gluten',
  'wrap_sans_gluten', 'tortilla_complete', 'polenta', 'sarrasin', 'millet',
  'quinoa', 'mais', 'riz_basmati', 'riz_complet', 'semoule_couscous', 'patate_douce', 'nouilles_riz',
];

const SUCRE_FORT = new Set(REFS_SUCREES);
const SUCRE_FAIBLE = new Set(REFS_SUCREES_FAIBLES);
const SALE_FORT = new Set(REFS_SALEES);
const SALE_FAIBLE = new Set(REFS_SALEES_FAIBLES);

/**
 * Le goût d'une recette, lu sur ses ingrédients. Un marqueur FORT l'emporte toujours sur
 * un faible ; deux forts opposés donnent « mixte » (dinde et kiwi) ; deux faibles opposés
 * aussi ; aucun marqueur donne « neutre ».
 */
export function goutRecette(r: Pick<Recipe, 'ingredients'>): GoutRecette {
  let sucreFort = false, saleFort = false, sucreFaible = false, saleFaible = false;
  for (const i of r.ingredients) {
    if (!i.ref) continue;
    if (SUCRE_FORT.has(i.ref)) sucreFort = true;
    if (SALE_FORT.has(i.ref)) saleFort = true;
    if (SUCRE_FAIBLE.has(i.ref)) sucreFaible = true;
    if (SALE_FAIBLE.has(i.ref)) saleFaible = true;
  }
  if (sucreFort && saleFort) return 'mixte';
  if (saleFort) return 'sale';
  if (sucreFort) return 'sucre';
  if (sucreFaible && saleFaible) return 'mixte';
  if (saleFaible) return 'sale';
  if (sucreFaible) return 'sucre';
  return 'neutre';
}

/** Une réponse enregistrée, refermée sur ce qui existe. Tout le reste vaut « peu importe ». */
export function goutLu(v: unknown): GoutPreference | undefined {
  return v === 'sucre' || v === 'sale' ? v : undefined;
}

/**
 * La part garantie : au moins 70 % des services du créneau dans le goût choisi, soit
 * 5 petits-déjeuners sur 7. Arrondie AU-DESSUS, pour que la promesse tienne sur les
 * semaines courtes (3 jours → 3, 5 jours → 4).
 */
export const GOUT_MAJORITE = 0.7;

export function quotaGout(services: number): number {
  return services <= 0 ? 0 : Math.ceil(GOUT_MAJORITE * services);
}

/**
 * La part est-elle GARANTIE pour ce régime ? Non pour un profil vegan : il garde la
 * préférence (pénalité de score), donc une majorité quand son vivier le permet, mais
 * sans forçage.
 *
 * 🔴 MESURÉ le 2026-09-13 (12 gabarits × 5 régimes × 4 tirages, réponse « salé » au
 * matin et à la collation). Avec forçage pour tous : 35 repas mal calibrés, contre 17
 * sans réponse — 32 des 35 chez les véganes, et PAS au petit-déjeuner : au dîner et à la
 * collation qui suivent. Un petit-déjeuner salé vegan (tofu, tempeh, edamame) consomme
 * la protéine et le budget du jour, et le vivier vegan n'a plus de quoi remplir le soir.
 * Sans forçage : 18 repas mal calibrés, mais 24 semaines sous les 70 % au matin.
 * ⚠️ Le contrôle « il reste une recette propre du bon goût » ne pouvait pas le voir : il
 * regarde le créneau servi, pas le ricochet sur les suivants. C'est l'option arbitrée par
 * le fondateur qui tranche : « si le choix manque (régimes stricts), le reste complète
 * sans jamais servir un repas mal calibré ».
 */
export function goutGarantiPour(regimes: readonly string[] | undefined): boolean {
  return !(regimes ?? []).includes('vegan');
}

/**
 * Faut-il IMPOSER le goût à ce service-ci ? Oui dès que les services qui restent (celui-ci
 * compris) ne suffiraient plus à atteindre le quota s'il en manquait un de plus.
 * Avant ce point, le goût n'est qu'une pénalité de score : le moteur garde la main pour
 * choisir un repas juste, et ne force que lorsque la promesse est en jeu.
 */
export function goutAImposer(quota: number, dejaServis: number, restants: number): boolean {
  return quota - dejaServis >= restants && quota - dejaServis > 0;
}
