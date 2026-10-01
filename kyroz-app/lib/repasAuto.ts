import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meal, MealSlot, MealType } from './types';
import { GRACE_HOURS } from './mealtime';

// ── Les repas se cochent tout seuls quand leur heure est passée ──────────────
//
// Décision fondateur du 2026-08-24, et elle vient d'un constat simple : personne
// n'ouvre l'app à chaque bouchée. Un plan dont les repas restent « planifiés »
// toute la journée ne recale rien, ne déduit rien de la réserve, et finit par
// mentir à l'écran (« il te reste 2 400 kcal » à 22 h).
//
// ➡️ LA RÈGLE, en une phrase : **un repas se coche une heure après le début du repas
// SUIVANT ; le dernier de la journée se coche à la fin de la journée.** C'est ce
// qu'énonçait le fondateur (« le petit-déj à midi, le midi à 19 h, le soir à
// minuit ») — mais lu sur les créneaux RÉELS du profil, pas sur des heures écrites
// en dur. Celui qui dîne à 22 h ou qui a créé un « shaker post-training » à 17 h
// obtient le même comportement sans qu'on ait à prévoir son cas.
//
// ⚠️ L'heure de marge n'est pas un ornement : sans elle, une journée à 4 repas
// fermait le déjeuner à 16 h (une collation passait derrière) là où une journée à
// 2 repas lui laissait sept heures — le même réglage devenait deux comportements
// selon le nombre de repas. Détail et mesure : `heuresLimites`.
//
// ⚠️ MINUIT EST INTERDIT, et ce n'est pas un détail d'implémentation. À minuit,
// `plan.tsx` efface le suivi de la journée (`resetTracking`) : un dîner coché
// « à 00 h 00 » serait effacé dans la même seconde. Le dernier repas se coche donc
// à **23 h 59**, et la journée manquée se solde au premier lancement du lendemain
// (`repasEchusVeille`), AVANT l'effacement.
//
// ⚠️ Un repas FIXE (géré par l'utilisateur) n'est jamais coché : l'app ne le suit
// pas, il n'a même pas de bouton « J'ai cuisiné ». Un repas déjà mangé ou sauté non
// plus — l'utilisateur a tranché, on ne repasse pas derrière lui.

const REPAS_AUTO_KEY = '@kyroz:repasAuto';

/** Dernière journée soldée (stamp local `YYYY-MM-DD`) — anti double-déduction. */
const CLOTURE_KEY = '@kyroz:repasAutoCloture';

/** 23 h 59 en minutes. Le dernier repas du jour se coche là, jamais à minuit. */
export const FIN_DE_JOURNEE = 23 * 60 + 59;

// ── Le réglage : ALLUMÉ par défaut ──────────────────────────────────────────
//
// ⚠️ Contrairement à feu « Tenir compte du frigo », le défaut est ici à `true`
// (décision fondateur). Le critère était « on choisit la panne qui se VOIT » : un
// repas coché à tort s'affiche sur le plan, là où une réserve périmée faisait
// DISPARAÎTRE un article de la liste de courses, en silence, sur l'écran qu'on
// emmène en magasin.
//
// 🔴 **MAIS LA MOITIÉ DE CETTE JUSTIFICATION EST TOMBÉE LE 2026-08-25.** Elle disait
// aussi « … et se décoche d'une touche ». Ce n'est plus vrai : le bouton « Annuler »
// du bandeau « Marqué comme mangé » a été retiré (décision fondateur), et il était le
// SEUL chemin de « mangé » vers « planifié ». Un repas coché par l'automatisme est
// donc désormais DÉFINITIF pour la journée.
// ➡️ Le défaut `true` n'est pas remis en cause ici — c'est une décision produit, et le
// réglage reste à un tap. Mais l'argument qui le portait est amputé : celui qui le
// rouvrira doit repartir de « visible mais irréversible », pas de la phrase d'avant.
// ⚠️ Et le retour arrière était DÉJÀ partiel : annuler ne rendait pas les ingrédients
// à la réserve (`setMealStatus` ne touche pas au stock). On a retiré un bouton qui ne
// défaisait que la moitié de ce qu'il avait l'air de défaire.
//
// ⚠️ Réglage d'APPAREIL (pas de colonne Supabase, donc pas de migration), et il se
// DIFFUSE : le Plan l'applique, le Profil l'affiche. Un `useState` local aurait
// laissé l'un des deux sur sa valeur de montage — CLAUDE.md §11.

let repasAuto = true;
const listeners = new Set<() => void>();

export function getRepasAuto(): boolean {
  return repasAuto;
}

export function setRepasAuto(next: boolean) {
  if (next === repasAuto) return;
  repasAuto = next;
  AsyncStorage.setItem(REPAS_AUTO_KEY, next ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}

export function subscribeRepasAuto(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Charge la préférence persistée au démarrage (une fois, dans le layout racine). */
export async function loadRepasAuto() {
  const raw = await AsyncStorage.getItem(REPAS_AUTO_KEY);
  const next = raw === null ? true : raw === '1';   // jamais réglé = allumé
  if (next !== repasAuto) {
    repasAuto = next;
    listeners.forEach((l) => l());
  }
}

export function useRepasAuto(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(subscribeRepasAuto, getRepasAuto, getRepasAuto);
  return [on, setRepasAuto];
}

// ── Quand un repas est-il échu ? ────────────────────────────────────────────

function minutesDuCreneau(s: MealSlot): number {
  return s.hour * 60 + (s.minute ?? 0);
}

/** Minutes écoulées depuis minuit, heure LOCALE. */
export function minutesDepuisMinuit(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Heure limite de chaque créneau = **début du suivant + une heure de marge**, et fin
 * de journée pour le dernier.
 *
 * 🔴 LA MARGE A ÉTÉ AJOUTÉE LE 2026-08-24, ET C'EST LE NOMBRE DE REPAS QUI L'EXIGE
 * (demande du fondateur : « adapte ça à ceux qui ne prennent que 2 ou 3 repas »).
 * Sans elle, la règle se resserre à mesure que les créneaux se rapprochent : sur une
 * journée à 4 repas (8 · 13 · 16 · 20), le déjeuner se fermait à **16 h**, soit trois
 * heures après son début, parce qu'une collation passait derrière lui. À 2 repas, le
 * même calcul laissait sept heures. **Le même réglage devenait deux comportements
 * différents selon un choix qui n'a rien à voir avec l'heure des repas.**
 *
 * ⚠️ La marge est `GRACE_HOURS` (`lib/mealtime.ts`), et c'est volontairement LA MÊME
 * constante que celle qui décide qu'un repas est « passé » pour l'adaptation d'un
 * écart hors plan. Deux valeurs auraient donné deux définitions de « ce repas a eu
 * lieu » dans la même app, et rien n'aurait dit laquelle fait foi.
 *
 * ⚠️ Bornée à la fin de journée : deux créneaux tardifs (20 h et 23 h) donneraient
 * sinon une limite après minuit, donc un repas qui ne se coche JAMAIS — l'effacement
 * du suivi passerait avant.
 *
 * ⚠️ Calculée sur les créneaux TRIÉS par heure, pas sur l'ordre de la liste : un
 * créneau créé après coup (« shaker de 17 h » ajouté en dernier) se range à sa place
 * réelle, sinon il hériterait de l'heure limite du petit-déjeuner.
 */
export function heuresLimites(slots: readonly MealSlot[]): Map<MealType, number> {
  const tries = [...slots].sort((a, b) => minutesDuCreneau(a) - minutesDuCreneau(b));
  const out = new Map<MealType, number>();
  tries.forEach((s, i) => {
    const suivant = tries[i + 1];
    out.set(s.id, suivant
      ? Math.min(minutesDuCreneau(suivant) + GRACE_HOURS * 60, FIN_DE_JOURNEE)
      : FIN_DE_JOURNEE);
  });
  return out;
}

/** Un repas est-il candidat à l'auto-coche ? (ni tranché par l'utilisateur, ni fixe) */
function cochable(m: Meal): boolean {
  return !m.status && !m.fixed;
}

// ── 🔴 RIEN N'EST ÉCHU AVANT LE PREMIER PLAN (2026-10-01) ────────────────────
//
// Relevé en relisant la visite de l'app « d'un œil d'utilisateur » (2026-09-30) :
// qui s'inscrit à 21 h 45 découvrait son plan avec le petit-déjeuner, le déjeuner et
// la collation déjà « MANGÉ », 1 545 kcal comptées et leurs ingrédients retirés de la
// réserve — des repas que Kyroz ne lui avait jamais proposés. Et la première ligne de
// la visite (« Si tu oublies, Kyroz coche pour toi ») tombait pile sur ce constat.
// L'auto-coche ne regardait que l'HEURE, jamais le moment où le plan est arrivé.
//
// ➡️ Un repas dont l'heure limite était DÉJÀ passée quand le tout premier plan a été
// généré n'est jamais repris : ni le jour même (`repasEchus`), ni au solde du
// lendemain matin (`repasEchusVeille`), qui l'aurait retiré de la réserve à son tour.
// Il reste « planifié », et « J'ai cuisiné » reste à un tap.
// ⚠️ Le TOUT PREMIER plan seulement : une régénération en cours de journée garde la
// règle ordinaire — la personne avait un plan ce matin-là.
// ⚠️ Paramètre OBLIGATOIRE dans les deux fonctions (`null` = aucune restriction) : un
// garde-fou optionnel disparaît chez l'appelant qui l'oublie.

/** Le moment où ce compte a reçu son tout premier plan, sur CET appareil. */
export interface DebutDuSuivi {
  /** Jour local (`YYYY-MM-DD`). */
  jour: string;
  /** Minutes depuis minuit, heure locale. */
  minutes: number;
}

const DEBUT_SUIVI_KEY = '@kyroz:debutSuivi';

/** La borne du jour `stamp` : les minutes du premier plan si c'est CE jour-là, sinon `null`. */
export function bornePremierJour(debut: DebutDuSuivi | null, stamp: string): number | null {
  return debut && debut.jour === stamp ? debut.minutes : null;
}

export async function lireDebutSuivi(): Promise<DebutDuSuivi | null> {
  try {
    const raw = await AsyncStorage.getItem(DEBUT_SUIVI_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return typeof d?.jour === 'string' && typeof d?.minutes === 'number' ? d : null;
  } catch {
    return null;
  }
}

/** Note le moment du premier plan — une seule fois : la première écriture fait foi. */
export async function noterDebutSuivi(jour: string, minutes: number): Promise<void> {
  try {
    if (await AsyncStorage.getItem(DEBUT_SUIVI_KEY)) return;
    await AsyncStorage.setItem(DEBUT_SUIVI_KEY, JSON.stringify({ jour, minutes }));
  } catch {}
}

/** L'heure limite d'un repas était-elle déjà passée quand le premier plan est arrivé ? */
function avantLePlan(limite: number, borne: number | null): boolean {
  return borne !== null && limite <= borne;
}

/**
 * Les repas d'une journée dont l'heure limite est passée et que personne n'a
 * tranchés. `minutes` = minutes depuis minuit (heure locale). `borne` : cf. plus haut
 * (`bornePremierJour`), `null` hors du jour du premier plan.
 */
export function repasEchus(
  meals: Meal[], slots: readonly MealSlot[], minutes: number, borne: number | null,
): Meal[] {
  const limites = heuresLimites(slots);
  return meals.filter((m) => {
    if (!cochable(m)) return false;
    const limite = limites.get(m.meal_type) ?? FIN_DE_JOURNEE;
    return !avantLePlan(limite, borne) && limite <= minutes;
  });
}

/**
 * Les repas d'une journée RÉVOLUE à encaisser avant l'effacement du suivi.
 * Tous les créneaux non tranchés, quelle que soit leur heure : la journée est finie —
 * sauf ceux dont l'heure était passée avant le premier plan (`borne`).
 */
export function repasEchusVeille(meals: Meal[], slots: readonly MealSlot[], borne: number | null): Meal[] {
  const limites = heuresLimites(slots);
  return meals.filter((m) => cochable(m) && !avantLePlan(limites.get(m.meal_type) ?? FIN_DE_JOURNEE, borne));
}

// ── Solde de la veille : anti double-déduction ──────────────────────────────

export async function dejaSolde(stamp: string): Promise<boolean> {
  return (await AsyncStorage.getItem(CLOTURE_KEY)) === stamp;
}

export async function marquerSolde(stamp: string): Promise<void> {
  await AsyncStorage.setItem(CLOTURE_KEY, stamp);
}
