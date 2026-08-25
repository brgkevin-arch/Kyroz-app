import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem, ShoppingList } from './types';
import { todayStamp } from './weight';

// ── Historique des listes de courses ─────────────────────────────────────────
//
// POURQUOI CE MODULE. La liste de courses n'est pas une donnée, c'est un CALCUL
// (plan − réserve, `lib/shoppingList.ts`), et son cache `@kyroz:shopping`
// est effacé à chaque changement de plan (`plan.tsx::persistPlan`). Une liste
// terminée ne laissait donc aucune trace : une fois les articles cochés et partis
// au frigo, plus rien ne répondait à « qu'est-ce que j'ai acheté samedi ? ».
// Le même raisonnement que le journal hors plan : ce qui est éphémère par nature
// a besoin d'un stockage qui ne dépend pas de lui.
//
// LOCAL-ONLY, et c'est une décision, pas un raccourci. Dans Kyroz, toute donnée
// synchronisée a DÉJÀ une clé locale comme source de travail — `lib/sync.ts` fait
// correspondre 6 clés AsyncStorage à 6 tables, la table étant un miroir posé
// par-dessus. Commencer local ne ferme donc aucune porte, alors que l'inverse
// coûte six surfaces (schéma, migration à jouer à la main, `sync.ts`, la liste de
// `delete-account`, la politique de confidentialité, le registre RGPD) pour une
// donnée dont personne n'a encore mesuré le besoin de synchro (CLAUDE.md §3).
//
// 🔴 CE QUI EST ARCHIVÉ EST CE QUE LA LISTE DEMANDAIT, PAS CE QUI EST PASSÉ EN
// CAISSE. Kyroz ne sait pas qu'on a pris un paquet de 1 kg pour 700 g demandés :
// il sait qu'on a coché la ligne. L'écran le DIT en toutes lettres — un chiffre
// affiché est celui qu'on peut tenir, ici comme ailleurs.

export interface ShoppingTripItem {
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingItem['category'];
  /** Coché au moment de clôturer = pris (il était déjà parti au frigo à ce
   *  moment-là). Faux = laissé sur la liste, il revient dans la suivante. */
  bought: boolean;
}

export interface ShoppingTrip {
  /** Horodatage ISO de la clôture. C'est l'IDENTITÉ de la sortie : deux courses
   *  le même jour calendaire restent deux lignes distinctes. */
  at: string;
  /** 'YYYY-MM-DD' LOCAL — ce qui s'affiche, et ce qui décide de la péremption. */
  date: string;
  /** Plan qui a produit la liste. Jamais affiché : il sert au diagnostic. */
  plan_id: string;
  items: ShoppingTripItem[];
}

export const SHOPPING_HISTORY_KEY = '@kyroz:shoppingHistory';

/**
 * Bornes de l'historique. Elles ne protègent pas d'un débordement de stockage
 * (une sortie de 25 articles pèse ~2 Ko) — elles répondent à « une liste d'il y a
 * huit mois, ça sert à quoi ? ». Six mois couvre largement la saisonnalité des
 * courses, et c'est de la minimisation RGPD gratuite. Mêmes valeurs que le
 * journal hors plan, pour que les deux historiques s'oublient au même rythme.
 */
export const MAX_AGE_DAYS = 180;
export const MAX_TRIPS = 30;

/** Jours calendaires entre deux 'YYYY-MM-DD' (b − a). Négatif si b précède a. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86_400_000);
}

/** Trie du plus ancien au plus récent, coupe ce qui est trop vieux, puis ce qui dépasse en nombre. */
export function pruneHistory(list: ShoppingTrip[], today: string = todayStamp()): ShoppingTrip[] {
  const trie = [...list]
    .filter((tr) => daysBetween(tr.date, today) <= MAX_AGE_DAYS)
    .sort((a, b) => a.at.localeCompare(b.at));
  return trie.length > MAX_TRIPS ? trie.slice(trie.length - MAX_TRIPS) : trie;
}

/**
 * Fige une liste en cours en une sortie d'historique.
 *
 * ⚠️ Copie les quantités TELLES QUELLES : ni arrondi, ni conversion, ni
 * regroupement. Ce qui est relu six mois plus tard doit être ce qui était affiché
 * le jour des courses, sinon l'historique raconte une autre liste que celle qu'on
 * a eue sous les yeux.
 */
export function tripFromList(list: ShoppingList, at: string, date: string = todayStamp()): ShoppingTrip {
  return {
    at,
    date,
    plan_id: list.plan_id,
    items: list.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
      bought: !!i.checked,
    })),
  };
}

export function addTrip(list: ShoppingTrip[], trip: ShoppingTrip, today: string = todayStamp()): ShoppingTrip[] {
  return pruneHistory([...list, trip], today);
}

/** Retire une sortie par son horodatage — jamais par son rang : la liste
 *  affichée est inversée, et un index se décale dès qu'une ligne s'efface. */
export function removeTrip(list: ShoppingTrip[], at: string): ShoppingTrip[] {
  return list.filter((tr) => tr.at !== at);
}

/** La plus récente d'abord — l'ordre de lecture d'un historique. */
export function newestFirst(list: ShoppingTrip[]): ShoppingTrip[] {
  return [...list].sort((a, b) => b.at.localeCompare(a.at));
}

export function boughtItems(trip: ShoppingTrip): ShoppingTripItem[] {
  return trip.items.filter((i) => i.bought);
}

export function skippedItems(trip: ShoppingTrip): ShoppingTripItem[] {
  return trip.items.filter((i) => !i.bought);
}

/**
 * Ce que la sortie a rapporté, en trois mots.
 *
 * ⚠️ Il compte les articles PRIS, pas les lignes de la liste : dire « 14 articles »
 * quand deux n'ont pas été trouvés serait un chiffre qu'aucune course ne confirme.
 */
export function tripHeadline(trip: ShoppingTrip): string {
  const n = boughtItems(trip).length;
  return `${n} article${n > 1 ? 's' : ''}`;
}

/**
 * Le sort des articles non cochés, ou `null` s'il n'y en a pas.
 *
 * ⚠️ La phrase dit ce que le PRODUIT en a fait (« resté dans ta liste »), pas ce
 * que la personne a raté. Un historique de courses n'a aucune raison d'être un
 * relevé de manquements (CLAUDE.md §10, règle produit).
 */
export function skippedNote(trip: ShoppingTrip): string | null {
  const n = skippedItems(trip).length;
  if (n === 0) return null;
  return `${n} non pris — resté${n > 1 ? 's' : ''} dans ta liste`;
}

/**
 * Résumé du bouton qui ouvre l'historique.
 *
 * ⚠️ Il ne compte RIEN, volontairement — même règle que `journalSummary`. « 14
 * sorties ce trimestre » est un score que personne n'a demandé à voir, et il met
 * la pression sans qu'on ouvre quoi que ce soit. La date de la dernière sortie,
 * elle, dit ce qu'il y a dedans sans porter de jugement.
 */
export function historySummary(list: ShoppingTrip[], today: string = todayStamp()): string {
  if (list.length === 0) return "Aucune pour l'instant";
  const derniere = newestFirst(list)[0];
  const jours = daysBetween(derniere.date, today);
  if (jours <= 0) return "Dernières courses aujourd'hui";
  if (jours === 1) return 'Dernières courses hier';
  return `Dernières courses il y a ${jours} jours`;
}

// ── Persistance ──────────────────────────────────────────────────────────────

export async function loadHistory(): Promise<ShoppingTrip[]> {
  const raw = await AsyncStorage.getItem(SHOPPING_HISTORY_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? pruneHistory(list) : [];
  } catch {
    return []; // historique illisible : on repart à vide plutôt que de casser l'écran
  }
}

export async function saveHistory(list: ShoppingTrip[]): Promise<void> {
  await AsyncStorage.setItem(SHOPPING_HISTORY_KEY, JSON.stringify(list));
}

/**
 * Clôture une liste : l'inscrit à l'historique et rend la sortie créée.
 *
 * 🔴 Rend `null` — et n'écrit RIEN — quand aucun article n'a été coché. Une
 * sortie vide n'est pas une course, et un historique qui en garderait la trace
 * afficherait des lignes « 0 article » que rien ne justifie. La règle vit ICI et
 * pas dans la condition d'affichage du bouton : un garde-fou qui ne tient que
 * chez son appelant disparaît au premier appelant qui l'oublie (CLAUDE.md §6).
 */
export async function recordTrip(
  list: ShoppingList,
  at: string = new Date().toISOString(),
  today: string = todayStamp(),
): Promise<ShoppingTrip | null> {
  if (!list.items.some((i) => i.checked)) return null;
  const trip = tripFromList(list, at, today);
  await saveHistory(addTrip(await loadHistory(), trip, today));
  return trip;
}
