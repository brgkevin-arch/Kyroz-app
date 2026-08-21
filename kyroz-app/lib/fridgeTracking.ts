import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── « Ma liste de courses tient compte de mon frigo » — ÉTEINT PAR DÉFAUT ─────
//
// 🔴 LE DÉFAUT QUE CE RÉGLAGE REND ÉVITABLE, et il est STRUCTUREL — pas une
// hypothèse sur les usages (mesuré dans le code le 2026-08-21) :
//
//   · `buildShoppingList` SOUSTRAIT le garde-manger, et **masque entièrement** un
//     article que le frigo dit couvert (`filter(quantity > 0)`) ;
//   · le frigo se CRÉDITE tout seul, par un geste qu'on fait toujours — cocher ses
//     articles en magasin (`courses.tsx::toggle`, `checkAll`, la clôture) ;
//   · il se DÉBITE par un geste qu'on peut sauter — taper « J'ai cuisiné », ou
//     cuisiner depuis le Frigo.
//
// ➡️ L'inventaire ne peut donc dériver que **dans un seul sens : la sur-estimation**.
// Et sa conséquence n'est pas un chiffre un peu faux, c'est un article qui
// **DISPARAÎT** de la liste : on ne l'achète pas, et on le découvre au moment de
// cuisiner. Un manque silencieux, sur l'écran qu'on emmène en magasin.
//
// ⚠️ L'ERREUR N'EST PAS SYMÉTRIQUE, et c'est tout l'argument du défaut à `false` —
// même raisonnement que le cran NEAT le plus prudent (`DEFAULT_NEAT_LEVEL`) :
//   · suivi ACTIF + frigo périmé → il manque un ingrédient. Silencieux, découvert trop tard.
//   · suivi ÉTEINT → on rachète peut-être ce qu'on a déjà. Visible, décochable, sans gravité.
// On choisit la panne qui se voit.
//
// ⚠️ CE RÉGLAGE NE FERME PAS L'ONGLET FRIGO. Le garde-manger garde son autre métier —
// « qu'est-ce que je peux cuisiner maintenant avec ce qu'il me reste » — qui, lui, ne
// fait disparaître aucune ligne nulle part. Ce qui est optionnel, c'est la
// SOUSTRACTION, pas l'inventaire. D'où le nom du réglage, qui parle de la liste.
//
// ⚠️ Et il se DIFFUSE : l'écran Courses le lit, le Frigo le lit pour dire ce qu'il
// change. Un `useState` local aurait laissé l'un des deux sur sa valeur de montage
// (CLAUDE.md §11, quatre cas déjà payés). D'où le patron obligatoire : store hors
// React + `useSyncExternalStore`, chargé UNE fois au layout racine.

const ENABLED_KEY = '@kyroz:fridgeTracking';

let fridgeTracking = false;
const listeners = new Set<() => void>();

export function getFridgeTracking(): boolean {
  return fridgeTracking;
}

export function setFridgeTracking(next: boolean) {
  if (next === fridgeTracking) return;
  fridgeTracking = next;
  AsyncStorage.setItem(ENABLED_KEY, next ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}

export function subscribeFridgeTracking(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Charge la préférence persistée au démarrage (appelé une fois dans le layout racine). */
export async function loadFridgeTracking() {
  const raw = await AsyncStorage.getItem(ENABLED_KEY);
  const next = raw === '1';
  if (next !== fridgeTracking) {
    fridgeTracking = next;
    listeners.forEach((l) => l());
  }
}

export function useFridgeTracking(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(subscribeFridgeTracking, getFridgeTracking, getFridgeTracking);
  return [on, setFridgeTracking];
}
