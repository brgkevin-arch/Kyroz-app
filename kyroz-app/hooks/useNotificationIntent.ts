import { useSyncExternalStore } from 'react';
import { NotificationIntent } from '../lib/reminder';

// ── Ce que le tap sur une notification demande d'ouvrir ──────────────────────
//
// Le tap est reçu par le LAYOUT RACINE (c'est le seul endroit qui existe au
// démarrage à froid, quand c'est la notification elle-même qui a lancé l'app) ;
// l'écran qui sait ouvrir la feuille de pesée, lui, est l'onglet Plan. Il faut
// donc porter l'intention de l'un à l'autre.
//
// ➡️ Patron obligatoire de CLAUDE.md §11 pour ce qui ne vit pas dans un écran :
// store externe hors React + `useSyncExternalStore`. Le passer en propriété
// depuis le layout supposerait que l'écran destinataire soit déjà monté au
// moment du tap — il ne l'est pas, c'est tout le problème du démarrage à froid.
//
// ⚠️ **Une intention se CONSOMME.** Sans ça, revenir sur l'onglet Plan
// rouvrirait la feuille de pesée indéfiniment, sans qu'aucun geste ne l'explique.
// (La même question se pose un cran plus bas, côté système, et y reçoit sa propre
// réponse : cf. `notifications.ts::subscribeNotificationTaps`.)

let current: NotificationIntent | null = null;
const listeners = new Set<() => void>();
const prevenir = () => listeners.forEach((l) => l());

export function getNotificationIntent(): NotificationIntent | null {
  return current;
}

export function subscribeNotificationIntent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Dépose l'intention du dernier tap (appelé par le layout racine). */
export function poserNotificationIntent(intent: NotificationIntent) {
  if (current === intent) {
    // Deux taps de suite sur la MÊME destination ne préviendraient personne :
    // la valeur ne change pas, donc `useSyncExternalStore` ne re-rend pas, donc
    // l'écran ne rouvrirait rien. On repasse par `null` pour que le changement
    // existe.
    current = null;
    prevenir();
  }
  current = intent;
  prevenir();
}

/** Marque l'intention comme servie. À appeler par l'écran qui l'a honorée. */
export function consommerNotificationIntent() {
  if (current === null) return;
  current = null;
  prevenir();
}

/** Lit l'intention côté React. `null` = rien à ouvrir. */
export function useNotificationIntent(): NotificationIntent | null {
  return useSyncExternalStore(subscribeNotificationIntent, getNotificationIntent, getNotificationIntent);
}
