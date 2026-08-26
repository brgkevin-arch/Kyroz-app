import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from './types';
import { categorize, norm } from './pantry';

// ── Articles AJOUTÉS À LA MAIN à la liste de courses ─────────────────────────
//
// « Il me faut aussi du café. » La liste de courses est DÉRIVÉE (plan − réserve,
// `lib/shoppingList.ts`) : tout ce qu'elle propose sort d'une recette. Elle ne
// savait donc rien porter de ce qui s'achète sans se cuisiner — le café, le
// papier absorbant, le pain, les couches — et il fallait une seconde liste,
// ailleurs, pour les tenir. Une liste de courses qu'on double d'un pense-bête
// n'est plus une liste de courses : c'est celle qu'on oublie de sortir du sac.
//
// 🔴 POURQUOI UNE CLÉ À PART, ET SURTOUT PAS UN ARTICLE DE PLUS DANS LA LISTE.
// Le cache `@kyroz:shopping` est effacé par **`plan.tsx` à CHAQUE
// `persistPlan`** — donc dès qu'un repas est marqué cuisiné, qu'un écart est
// déclaré, qu'une recette change — puis par « tirer pour rafraîchir » et par
// « Courses terminées ». Un article saisi à la main et rangé là-dedans
// disparaîtrait quelques minutes après la frappe, **sans qu'aucun geste de
// l'utilisateur ne l'explique**. C'est le même piège que les écartés
// (`shoppingRemoved.ts`), avec un enjeu plus lourd : un écarté perdu, la liste
// le reconstruit depuis le plan ; un ajout perdu, personne ne peut le deviner —
// c'est de la donnée que l'utilisateur seul détenait.
//
// ⚠️ ET C'EST POURQUOI ILS SURVIVENT AU RAFRAÎCHISSEMENT, contrairement aux
// écartés. Tirer vers le bas veut dire « refais ma liste à partir de mon plan » :
// ce qui vient du plan se refait, ce qui vient de MOI ne se refait pas. Un geste
// de rafraîchissement qui effacerait une saisie serait une suppression déguisée
// en actualisation. Seul « Courses terminées » les solde, et seulement une fois
// achetés (ou explicitement retirés).
//
// LOCAL-ONLY, aucune table, aucune migration — même raisonnement que l'historique
// de courses et le journal hors plan (CLAUDE.md §3 : commencer local, le miroir
// s'ajoute plus tard sans rien réécrire).

const KEY = '@kyroz:shopping:ajouts';

/** Unités proposées à la saisie. `kg` et `L` sont ramenées à `g`/`ml` par
 *  `toBaseUnit` avant stockage — la liste ne connaît que deux unités de poids. */
export const UNITES_AJOUT = ['g', 'kg', 'ml', 'pièce'];

/**
 * Quantité d'un article dont l'utilisateur n'a PAS donné la quantité.
 *
 * 🔴 Zéro veut dire « non précisée », il ne veut pas dire « zéro gramme ». C'est
 * le cas le PLUS courant d'un ajout manuel : on note « café », pas « café 250 g ».
 * Deux conséquences, tenues par les tests :
 *   · l'écran n'affiche rien dans la colonne de droite — `formatQuantity` rendrait
 *     « 0 g », un chiffre faux affiché à la place d'un blanc honnête ;
 *   · l'article n'entre PAS en réserve à la clôture : on ne sait pas combien a été
 *     acheté, et une réserve inventée fait disparaître des articles de la liste
 *     suivante (c'est exactement la dérive corrigée le 2026-08-24).
 */
export const SANS_QUANTITE = 0;

// ── Persistance ─────────────────────────────────────────────────────────────

/** Tolérante : une entrée corrompue est ignorée plutôt que de vider la liste. */
export async function loadAjouts(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(estArticle).map((a) => ({ ...a, manuel: true as const }));
  } catch {
    return [];
  }
}

export async function saveAjouts(items: ShoppingItem[]): Promise<void> {
  try {
    if (items.length === 0) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

function estArticle(a: unknown): a is ShoppingItem {
  if (!a || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return typeof o.name === 'string' && o.name.trim().length > 0
    && typeof o.quantity === 'number' && Number.isFinite(o.quantity)
    && typeof o.unit === 'string';
}

// ── Fonctions pures (testables sans stockage) ───────────────────────────────

/**
 * Le nom tel qu'il sera STOCKÉ et AFFICHÉ.
 *
 * ⚠️ La casse de l'utilisateur est conservée (« PQ » reste « PQ ») : seule la
 * première lettre est forcée en majuscule, comme le fait `buildShoppingList`
 * pour les articles du plan — sinon deux moitiés de la même liste s'écriraient
 * différemment. Les comparaisons, elles, passent toutes par `memeNom` : elles
 * ignorent casse ET accents, donc rien ne dépend de ce choix d'affichage.
 */
export function normaliserNom(brut: string): string {
  const n = brut.trim().replace(/\s+/g, ' ');
  return n.length === 0 ? '' : n.charAt(0).toUpperCase() + n.slice(1);
}

/** Deux libellés désignent-ils le même article ? Casse et accents ignorés. */
export function memeNom(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

/** L'article de la liste qui porte ce nom, s'il existe. */
export function trouverArticle(items: ShoppingItem[], nom: string): ShoppingItem | undefined {
  return items.find((i) => memeNom(i.name, nom));
}

/**
 * Fabrique l'article. Le rayon est déduit du nom par `categorize` — LA MÊME
 * fonction que la liste dérivée et que la réserve : un ajout manuel se range
 * donc au même rayon que le même aliment venu d'une recette. Une table à part
 * aurait mis « Poulet » dans deux sections différentes selon son origine.
 */
export function creerAjout(nom: string, quantity = SANS_QUANTITE, unit = 'g'): ShoppingItem {
  return {
    name: normaliserNom(nom),
    quantity: quantity > 0 ? quantity : SANS_QUANTITE,
    unit,
    category: categorize(nom),
    checked: false,
    manuel: true,
  };
}

/** Ajoute, sans jamais créer deux lignes du même nom (le nom est la clé de l'écran). */
export function ajouterAjout(ajouts: ShoppingItem[], article: ShoppingItem): ShoppingItem[] {
  return trouverArticle(ajouts, article.name) ? ajouts : [...ajouts, article];
}

/** Retire — définitivement. Un ajout manuel ne s'ÉCARTE pas : voir `nettoyerAjouts`. */
export function retirerAjout(ajouts: ShoppingItem[], nom: string): ShoppingItem[] {
  return ajouts.filter((a) => !memeNom(a.name, nom));
}

export function basculerAjout(ajouts: ShoppingItem[], nom: string, coche: boolean): ShoppingItem[] {
  return ajouts.map((a) => (memeNom(a.name, nom) ? { ...a, checked: coche } : a));
}

/** Toutes les cases à un même état — « Tout cocher », « Réinitialiser », rafraîchir.
 *  Même contenu → même référence : « Réinitialiser » sur une liste déjà décochée
 *  n'a rien à réécrire, et le rafraîchissement passe par ici à chaque geste. */
export function cocherTousAjouts(ajouts: ShoppingItem[], coche: boolean): ShoppingItem[] {
  if (ajouts.every((a) => a.checked === coche)) return ajouts;
  return ajouts.map((a) => (a.checked === coche ? a : { ...a, checked: coche }));
}

/**
 * Ce que l'écran affiche : les articles du plan, puis les ajouts.
 *
 * 🔴 UN NOM = UNE LIGNE, et ce n'est pas cosmétique. L'écran des courses prend le
 * nom pour clé (`keyExtractor`), pour cible de cochage (`i.name === item.name`) et
 * pour identité d'un écarté. Deux lignes homonymes, et cocher l'une coche l'autre
 * — sur une liste où l'on coche trente fois d'affilée sans regarder.
 *
 * ⚠️ En cas de collision, c'est l'article du PLAN qui gagne : lui porte une
 * quantité calculée pour des repas réels, là où l'ajout manuel n'en a souvent
 * aucune. L'ajout n'est pas perdu pour autant — `nettoyerAjouts` le solde au
 * chargement suivant, une fois qu'on sait que le plan le propose vraiment.
 */
export function fusionner(derives: ShoppingItem[], ajouts: ShoppingItem[]): ShoppingItem[] {
  if (ajouts.length === 0) return derives;
  const pris = new Set(derives.map((i) => norm(i.name)));
  return [...derives, ...ajouts.filter((a) => !pris.has(norm(a.name)))];
}

/**
 * Solde les ajouts que le plan propose désormais LUI-MÊME.
 *
 * ⚠️ Sans ce nettoyage, un « Riz » tapé à la main resterait stocké à vie derrière
 * le « Riz » de la liste dérivée, invisible (cf. `fusionner`) — et ressurgirait
 * des semaines plus tard, non coché, le jour où le plan cesse d'en demander. Un
 * état qu'on ne voit pas mais qui mord plus tard, c'est le défaut « paramètre
 * dormant » (CLAUDE.md §11), le même que celui que `nettoyerEcartes` ferme.
 *
 * Rien ne disparaît de l'écran au passage : l'article reste affiché, c'est sa
 * ligne du plan qui le porte.
 */
export function nettoyerAjouts(ajouts: ShoppingItem[], derives: ShoppingItem[]): ShoppingItem[] {
  if (ajouts.length === 0) return ajouts;
  const proposes = new Set(derives.map((i) => norm(i.name)));
  const gardes = ajouts.filter((a) => !proposes.has(norm(a.name)));
  // Même contenu → même référence : pas d'écriture inutile au chargement.
  return gardes.length === ajouts.length ? ajouts : gardes;
}

/**
 * Ce que deviennent les ajouts quand une sortie est CLÔTURÉE.
 *
 * 🔴 La règle diffère de celle des articles du plan, et il fallait qu'elle diffère.
 * Un article du plan coché « disparaît » parce que la liste se RECALCULE et que la
 * réserve le déduit ; un ajout manuel, lui, ne se recalcule pas : rien ne le
 * ferait partir. C'est donc ici qu'il se solde — ce qui est coché a été acheté,
 * donc il quitte la liste (et rejoint la réserve s'il portait une quantité).
 *
 * ⚠️ Les NON cochés suivent le choix que l'écran vient de poser pour tous les
 * restants — « les garder » / « les retirer » — sinon un article ajouté à la main
 * et non acheté serait le seul de la liste à ignorer la réponse de l'utilisateur.
 * Gardés, ils repartent DÉCOCHÉS : une nouvelle sortie commence à zéro.
 */
export function ajoutsApresCloture(ajouts: ShoppingItem[], sort: 'garder' | 'retirer'): ShoppingItem[] {
  if (sort === 'retirer') return [];
  return ajouts.filter((a) => !a.checked).map((a) => ({ ...a, checked: false }));
}
