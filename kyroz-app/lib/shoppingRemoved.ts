import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from './types';

// ── Articles ÉCARTÉS de la liste de courses ─────────────────────────────────
//
// « Je ne veux pas acheter ça cette fois. » L'article disparaît de la liste sans
// partir au frigo (il n'a pas été acheté) et sans toucher au plan (les repas ne
// changent pas).
//
// 🔴 POURQUOI UN STOCKAGE À PART, ET PAS UN CHAMP DANS LA LISTE. La liste est
// mise en cache sous `@kyroz:shopping`, mais **`plan.tsx` efface cette clé à
// CHAQUE `persistPlan`** — c'est-à-dire dès qu'on marque un repas cuisiné, qu'on
// déclare un écart, qu'on change une recette. Une suppression rangée dans le
// cache serait donc effacée quelques minutes après le geste, et l'article
// reviendrait **sans qu'aucune action de l'utilisateur ne l'explique**. Le pire
// des défauts : la fonctionnalité a l'air de marcher, puis se défait toute
// seule. D'où une clé qui lui est propre, que rien d'autre ne touche.
//
// LOCAL-ONLY, aucune table, aucune migration — même raisonnement que le journal
// hors plan et l'historique de courses (CLAUDE.md §3 : commencer local, le
// miroir s'ajoute plus tard sans rien réécrire).
//
// ⚠️ L'écart est VOLONTAIREMENT éphémère : il vaut pour la sortie en cours, pas
// pour toujours. Un « je n'en veux plus jamais » se dit dans les préférences
// alimentaires (`disliked_foods`), qui agit sur le MOTEUR ; ici on ne fait que
// rayer une ligne d'une liste de courses. Trois choses le remettent à zéro :
// tirer pour rafraîchir, terminer ses courses, et « Rétablir ».

const KEY = '@kyroz:shopping:ecartes';

/** Les noms d'articles écartés. Le nom est la clé : `keyExtractor` de l'écran
 *  l'utilise déjà, donc il est unique dans une liste donnée. */
export async function loadEcartes(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveEcartes(noms: string[]): Promise<void> {
  try {
    if (noms.length === 0) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, JSON.stringify(noms));
  } catch {}
}

/** Tout remettre : « Rétablir », un rafraîchissement, une sortie terminée. */
export async function viderEcartes(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}

// ── Fonctions pures (testables sans stockage) ───────────────────────────────

/** Ajoute un nom, sans doublon. */
export function ecarter(ecartes: string[], nom: string): string[] {
  return ecartes.includes(nom) ? ecartes : [...ecartes, nom];
}

/** Retire un nom (rétablir un seul article). */
export function retablir(ecartes: string[], nom: string): string[] {
  return ecartes.filter((n) => n !== nom);
}

/** Ce que l'écran affiche : la liste moins les écartés. */
export function appliquerEcartes(items: ShoppingItem[], ecartes: string[]): ShoppingItem[] {
  if (ecartes.length === 0) return items;
  const hors = new Set(ecartes);
  return items.filter((i) => !hors.has(i.name));
}

/**
 * Ne garde que les écartés que la liste propose ENCORE.
 *
 * ⚠️ Sans ce nettoyage, la clé grossit indéfiniment : un article écarté une fois
 * resterait dans la liste des exclusions même après que le plan a cessé de le
 * demander — et il serait ré-écarté en silence le jour où une nouvelle recette
 * le ramène, des semaines plus tard. Un filtre qu'on n'a pas posé et qui mord
 * quand même, c'est le défaut « paramètre dormant » (CLAUDE.md §11).
 */
export function nettoyerEcartes(ecartes: string[], items: ShoppingItem[]): string[] {
  if (ecartes.length === 0) return ecartes;
  const proposes = new Set(items.map((i) => i.name));
  const gardes = ecartes.filter((n) => proposes.has(n));
  // Même contenu → même référence, pour ne pas déclencher d'écriture inutile.
  return gardes.length === ecartes.length ? ecartes : gardes;
}

/** Libellé du bandeau « X article(s) retiré(s) ». */
export function resumeEcartes(n: number): string {
  return n === 1 ? '1 article retiré de ta liste' : `${n} articles retirés de ta liste`;
}

/** Ce que l'utilisateur choisit pour ses articles non cochés en fin de courses. */
export type SortDesRestants = 'garder' | 'retirer';

/**
 * Ce que deviennent les écartés quand une sortie est CLÔTURÉE.
 *
 * 🔴 La règle est contre-intuitive, et c'est pour ça qu'elle vit ici plutôt que
 * dans le composant. Terminer ses courses **vide le cache de la liste**, donc la
 * liste est recalculée depuis le plan : les articles cochés sont déjà au frigo et
 * disparaissent d'eux-mêmes, mais les non-cochés **REVIENNENT**. « Les retirer »
 * ne peut donc pas se contenter de les effacer d'un tableau — il faut les
 * ÉCARTER, sinon le recalcul les ramène et le choix de l'utilisateur n'a servi à
 * rien. C'est exactement le défaut « un réglage qui ne pilote rien ».
 *
 * ⚠️ Et « garder » repart de ZÉRO, il ne conserve pas les écartés de la sortie
 * précédente : une nouvelle sortie est un nouveau cycle. Sans ça, un article
 * retiré une fois resterait invisible de semaine en semaine sans que rien ne le
 * dise — la fonctionnalité deviendrait un bannissement silencieux, alors qu'elle
 * ne prétend rayer qu'une ligne d'une liste.
 */
export function ecartesApresCloture(sort: SortDesRestants, nonCoches: ShoppingItem[]): string[] {
  return sort === 'retirer' ? nonCoches.map((i) => i.name) : [];
}
