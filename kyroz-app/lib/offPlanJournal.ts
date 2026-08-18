import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayStamp } from './weight';

// ── Journal des repas hors plan (E6, point 2) ────────────────────────────────
//
// POURQUOI UN JOURNAL À PART. L'écart vit dans `plan.day_extras`, et le plan est
// volontairement ÉPHÉMÈRE : `resetTracking` l'efface au changement de jour
// calendaire, donc un écart — libellé compris — vit moins de 24 h. Garder une
// trace demande un stockage qui ne dépend pas du plan.
//
// LOCAL-ONLY, et c'est une décision (fondateur, 2026-08-05), pas un raccourci :
//  · le plan n'est pas synchronisé (`meal_plans` a été SUPPRIMÉE le 2026-06-14
//    parce qu'il est déterministe) — lui adjoindre une table rouvrirait cette porte ;
//  · un relevé daté de ce qu'on a mangé hors plan est une donnée de comportement
//    alimentaire. Même traitement que les photos de progression (CLAUDE.md §3/§7) ;
//  · aucune migration Supabase à jouer, donc aucun mode de panne silencieux ;
//  · et ce n'est PAS l'autre branche d'un choix : dans Kyroz, toute donnée
//    synchronisée a déjà une clé locale comme source de travail (`lib/sync.ts`).
//    Si l'historique doit un jour suivre le compte, le miroir se pose PAR-DESSUS
//    cette clé — rien de ce fichier n'est à jeter.
//
// CE QUE LE JOURNAL RACONTE — et c'est le cœur de la décision produit : il ne
// compte pas les écarts, il dit CE QUE LE MOTEUR EN A FAIT (`absorbed`). Une
// liste de dérapages serait un carnet de fautes, exactement la charge mentale que
// le produit refuse (CLAUDE.md §10, règle produit). Le message est « le moteur a
// encaissé », pas « tu as dérapé ».

// ── 🔴 PARCOURS MIS DE CÔTÉ LE 2026-08-18 (décision fondateur) ───────────────
//
// Le parcours « J'ai mangé hors plan » n'est plus OUVRABLE : le bouton de l'écran
// Plan et la ligne « Écarts passés » du Profil sont retirés. RIEN N'EST SUPPRIMÉ —
// ce module, `plan.tsx::logOffPlan`, `planEngine::adaptDayOptions`, la feuille de
// recalage et leurs tests restent en place et verts. C'est une mise de côté, pas
// une dépose.
//
// POUR LE REMETTRE : repasser cette constante à `true`, PUIS remettre les deux
// choses qui ne sont pas gardées par elle (elles sont marquées du même mot-clé,
// `PARCOURS_HORS_PLAN_ACTIF`, donc elles se retrouvent en une recherche) :
//  · `lib/tours.ts` — l'étape `plan-offplan` de la visite guidée ;
//  · `app/(tabs)/plan.tsx` — le `useTourTarget('plan-offplan')` qui l'ancre.
//
// ⚠️ POURQUOI L'ÉTAPE DE VISITE DOIT PARTIR AVEC LE BOUTON, et pas seulement se
// cacher : une étape dont la cible n'existe pas assombrissait l'écran SANS bulle
// ni « Passer » — donc sans aucune sortie (défaut mesuré, AGENTS.md E50). Laisser
// l'étape en place aurait transformé une mise de côté en écran bloquant.
//
// ⚠️ Les écarts DÉJÀ posés continuent de s'afficher sur le Plan (le bloc
// « + N kcal assumées » et son « Retirer ») : on ne fait pas disparaître une
// donnée que quelqu'un a saisie. Simplement, on ne peut plus en créer.
export const PARCOURS_HORS_PLAN_ACTIF = false;

export interface OffPlanEntry {
  /** 'YYYY-MM-DD' LOCAL, jour où l'écart a été posé. */
  date: string;
  /**
   * Jour du plan (1–7) auquel l'écart a été imputé. Il n'est jamais AFFICHÉ — il
   * sert de clé avec la date. `day_extras` est indexé par jour de semaine, donc
   * poser un écart sur deux onglets différents le même jour calendaire donne bien
   * DEUX écarts ; sans ce champ, le journal en écraserait un et sous-déclarerait.
   */
  day: number;
  kcal: number;
  /** « Pizza · 300 g ». Absent quand l'écart a été estimé au clavier : il n'y a rien à nommer. */
  label?: string;
  /**
   * Calories REPRISES par le recalage des repas restants (`AdaptOption.absorbedKcal`).
   * `0` = la journée a été gardée telle quelle. **Absent = on ne sait pas** — l'app
   * a été quittée avant la décision. On ne comble pas ce trou par un `0` : ce serait
   * affirmer « journée gardée » sans l'avoir vu.
   */
  absorbed?: number;
}

export const OFF_PLAN_KEY = '@kyroz:offPlan';

/**
 * Bornes du journal. Elles ne protègent pas d'un débordement de stockage (une
 * entrée pèse ~60 octets) — elles répondent à la question posée en ouvrant le
 * chantier : « un écart d'il y a trois mois, ça sert à quoi ? ». Six mois est
 * généreux pour expliquer un palier, et c'est de la minimisation RGPD gratuite.
 */
export const MAX_AGE_DAYS = 180;
export const MAX_ENTRIES = 200;

/** Jours calendaires entre deux 'YYYY-MM-DD' (b − a). Négatif si b précède a. */
function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00');
  return Math.round(ms / 86_400_000);
}

/** Trie par date croissante, coupe ce qui est trop vieux puis ce qui dépasse en nombre. */
export function pruneJournal(list: OffPlanEntry[], today: string = todayStamp()): OffPlanEntry[] {
  const trie = [...list]
    .filter((e) => daysBetween(e.date, today) <= MAX_AGE_DAYS)
    .sort((a, b) => (a.date === b.date ? a.day - b.day : a.date.localeCompare(b.date)));
  return trie.length > MAX_ENTRIES ? trie.slice(trie.length - MAX_ENTRIES) : trie;
}

/**
 * Pose (ou REMPLACE) l'écart d'un couple date+jour.
 *
 * ⚠️ Remplace, il n'ajoute pas : `plan.day_extras[jour]` est un slot UNIQUE, donc
 * un second écart posé sur le même jour écrase le premier dans le plan. Un journal
 * qui empilerait afficherait « +600 puis +300 » là où le moteur n'a compté que 300 —
 * un chiffre affiché doit être celui qui est servi.
 */
export function upsertEntry(
  list: OffPlanEntry[], entry: OffPlanEntry, today: string = todayStamp(),
): OffPlanEntry[] {
  const autres = list.filter((e) => !(e.date === entry.date && e.day === entry.day));
  return pruneJournal([...autres, entry], today);
}

/**
 * Inscrit ce que le recalage a repris sur l'écart d'un couple date+jour.
 * Sans écart correspondant, ne fait rien (on n'invente pas d'entrée).
 */
export function resolveEntry(
  list: OffPlanEntry[], date: string, day: number, absorbed: number,
): OffPlanEntry[] {
  return list.map((e) =>
    e.date === date && e.day === day ? { ...e, absorbed: Math.max(0, Math.round(absorbed)) } : e,
  );
}

/** Retire l'écart d'un couple date+jour (l'utilisateur l'a annulé sur l'écran Plan). */
export function removeEntry(list: OffPlanEntry[], date: string, day: number): OffPlanEntry[] {
  return list.filter((e) => !(e.date === date && e.day === day));
}

/** Retire une entrée par son rang dans la liste AFFICHÉE (la plus récente d'abord). */
export function removeAt(list: OffPlanEntry[], index: number): OffPlanEntry[] {
  return list.filter((_, i) => i !== index);
}

/** La plus récente d'abord — l'ordre de lecture d'un historique. */
export function newestFirst(list: OffPlanEntry[]): OffPlanEntry[] {
  return [...list].reverse();
}

/**
 * Ce que le moteur a fait de l'écart, en une phrase. `null` quand la décision est
 * inconnue : l'écran n'affiche alors RIEN plutôt qu'une supposition.
 *
 * ⚠️ Le sujet de la phrase est le PLAN, jamais l'utilisateur. « Tes repas suivants
 * en ont repris 450 kcal » rassure ; « il te restait 450 kcal à rattraper » est la
 * même information transformée en dette.
 */
export function describeOutcome(entry: OffPlanEntry): string | null {
  if (entry.absorbed == null) return null;
  if (entry.absorbed <= 0) return 'Journée gardée telle quelle.';
  return `Tes repas suivants en ont repris ${entry.absorbed.toLocaleString('fr-FR')} kcal.`;
}

/**
 * Résumé de la LIGNE de menu qui ouvre l'historique.
 *
 * ⚠️ Il ne compte RIEN, volontairement. « 7 écarts ce mois-ci » posé sur l'écran
 * Profil est un score que personne n'a demandé à voir : il met la pression sans
 * qu'on ouvre quoi que ce soit. La période couverte dit ce qu'il y a dedans sans
 * porter de jugement — un test exige que le résumé soit IDENTIQUE pour une entrée
 * et pour douze sur la même période.
 */
export function journalSummary(list: OffPlanEntry[]): string {
  if (list.length === 0) return "Aucun pour l'instant";
  const depuis = list.reduce((min, e) => (e.date < min ? e.date : min), list[0].date);
  const jour = new Date(depuis + 'T00:00:00');
  return `Depuis le ${jour.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

// ── Persistance ──────────────────────────────────────────────────────────────

export async function loadJournal(): Promise<OffPlanEntry[]> {
  const raw = await AsyncStorage.getItem(OFF_PLAN_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? pruneJournal(list) : [];
  } catch {
    return []; // journal illisible : on repart à vide plutôt que de casser l'écran
  }
}

export async function saveJournal(list: OffPlanEntry[]): Promise<void> {
  await AsyncStorage.setItem(OFF_PLAN_KEY, JSON.stringify(list));
}

// ── Raccourcis appelés depuis l'écran Plan (charge → transforme → écrit) ──────
//
// Volontairement sans état React : l'écran Plan n'AFFICHE pas le journal, il
// l'alimente. Le lecteur (Profil) le charge de son côté.

/** L'utilisateur vient de déclarer un écart. */
export async function recordOffPlan(day: number, kcal: number, label?: string): Promise<void> {
  const today = todayStamp();
  const entry: OffPlanEntry = { date: today, day, kcal, ...(label ? { label } : {}) };
  await saveJournal(upsertEntry(await loadJournal(), entry, today));
}

/** La décision d'adaptation est prise : 0 = journée gardée telle quelle. */
export async function resolveOffPlan(day: number, absorbed: number): Promise<void> {
  await saveJournal(resolveEntry(await loadJournal(), todayStamp(), day, absorbed));
}

/** L'utilisateur a retiré son écart : le journal ne doit pas en garder la trace. */
export async function forgetOffPlan(day: number): Promise<void> {
  await saveJournal(removeEntry(await loadJournal(), todayStamp(), day));
}
