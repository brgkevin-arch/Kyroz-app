import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meal, MealSlot, MealType } from './types';

// ── Les repas se cochent tout seuls quand leur heure est passée ──────────────
//
// Décision fondateur du 2026-08-24, et elle vient d'un constat simple : personne
// n'ouvre l'app à chaque bouchée. Un plan dont les repas restent « planifiés »
// toute la journée ne recale rien, ne déduit rien de la réserve, et finit par
// mentir à l'écran (« il te reste 2 400 kcal » à 22 h).
//
// ➡️ LA RÈGLE, en une phrase : **un repas se coche quand le repas SUIVANT commence ;
// le dernier de la journée se coche à la fin de la journée.** C'est exactement ce
// qu'énonçait le fondateur (« le petit-déj à midi, le midi à 19 h, le soir à
// minuit ») — mais lu sur les créneaux RÉELS du profil, pas sur des heures écrites
// en dur. Celui qui dîne à 22 h ou qui a créé un « shaker post-training » à 17 h
// obtient le même comportement sans qu'on ait à prévoir son cas.
//
// ⚠️ MINUIT EST INTERDIT, et ce n'est pas un détail d'implémentation. À minuit,
// `plan.tsx` efface le suivi de la journée (`resetTracking`) : un dîner coché
// « à 00 h 00 » serait effacé dans la même seconde. Le dernier repas se coche donc
// à **23 h 59**, et la journée manquée se solde au premier lancement du lendemain
// (`repasAEncaisserVeille`), AVANT l'effacement.
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
// (décision fondateur). L'erreur n'a pas la même forme : un repas coché à tort se
// VOIT sur le plan et se décoche d'une touche, là où une réserve périmée faisait
// DISPARAÎTRE un article de la liste de courses, en silence, sur l'écran qu'on
// emmène en magasin. On choisit la panne qui se voit — c'est le même critère qui
// avait donné `false` à l'autre réglage, appliqué à un risque différent.
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
 * Heure limite de chaque créneau = début du suivant, fin de journée pour le dernier.
 * ⚠️ Calculée sur les créneaux TRIÉS par heure, pas sur l'ordre de la liste : un
 * créneau créé après coup (« shaker de 17 h » ajouté en dernier) se range à sa place
 * réelle, sinon il hériterait de l'heure limite du petit-déjeuner.
 */
export function heuresLimites(slots: readonly MealSlot[]): Map<MealType, number> {
  const tries = [...slots].sort((a, b) => minutesDuCreneau(a) - minutesDuCreneau(b));
  const out = new Map<MealType, number>();
  tries.forEach((s, i) => {
    const suivant = tries[i + 1];
    out.set(s.id, suivant ? minutesDuCreneau(suivant) : FIN_DE_JOURNEE);
  });
  return out;
}

/** Un repas est-il candidat à l'auto-coche ? (ni tranché par l'utilisateur, ni fixe) */
function cochable(m: Meal): boolean {
  return !m.status && !m.fixed;
}

/**
 * Les repas d'une journée dont l'heure limite est passée et que personne n'a
 * tranchés. `minutes` = minutes depuis minuit (heure locale).
 */
export function repasEchus(
  meals: Meal[], slots: readonly MealSlot[], minutes: number,
): Meal[] {
  const limites = heuresLimites(slots);
  return meals.filter((m) => cochable(m) && (limites.get(m.meal_type) ?? FIN_DE_JOURNEE) <= minutes);
}

/**
 * Les repas d'une journée RÉVOLUE à encaisser avant l'effacement du suivi.
 * Tous les créneaux non tranchés, quelle que soit leur heure : la journée est finie.
 */
export function repasEchusVeille(meals: Meal[]): Meal[] {
  return meals.filter(cochable);
}

// ── Solde de la veille : anti double-déduction ──────────────────────────────

export async function dejaSolde(stamp: string): Promise<boolean> {
  return (await AsyncStorage.getItem(CLOTURE_KEY)) === stamp;
}

export async function marquerSolde(stamp: string): Promise<void> {
  await AsyncStorage.setItem(CLOTURE_KEY, stamp);
}
