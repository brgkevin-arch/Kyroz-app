import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Prénom de l'utilisateur ──────────────────────────────────────────────────
// Purement cosmétique (salutation sur l'écran Plan). Stocké en LOCAL uniquement
// (comme les photos), hors profil synchronisé : pas besoin de colonne Supabase ni
// de migration pour une donnée d'affichage.
//
// 🔴 IL NE S'ÉCRIVAIT QU'À UN SEUL ENDROIT DE TOUTE L'APP — la dernière étape de
// l'onboarding — et aucun écran ne permettait de le poser ni de le corriger
// ensuite. Un compte créé avant l'existence de cette étape affichait donc « Ton
// plan » à perpétuité, sans le moindre recours (signalé par le fondateur le
// 2026-08-06). Le champ vit désormais aussi dans Profil → Informations.
//
// ⚠️ Et le champ seul n'aurait pas suffi : l'écran Plan lisait le prénom UNE FOIS
// au montage (`useEffect(…, [])`). Le poser depuis le Profil n'aurait donc rien
// changé au titre avant un redémarrage — exactement le défaut trouvé le même jour
// sur le réglage d'hydratation. C'est la MÊME famille : un réglage lu par un autre
// écran que celui qui le pose ne se relit pas, il se DIFFUSE.
// ➡️ Petit store externe, comme `themeMode.ts`, `accentColor.ts` et le suivi
// d'hydratation. Chargé une fois au démarrage dans le layout racine.

const KEY = '@kyroz:firstName';

let current = '';
const listeners = new Set<() => void>();

export function getFirstName(): string {
  return current;
}

/** Pose le prénom (onboarding, ou Profil → Informations). */
export async function saveFirstName(name: string): Promise<void> {
  const next = name.trim();
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
  await AsyncStorage.setItem(KEY, next);
}

export function subscribeFirstName(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Charge la valeur persistée au démarrage (appelé une fois dans le layout racine). */
export async function loadFirstName(): Promise<void> {
  const raw = (await AsyncStorage.getItem(KEY)) ?? '';
  if (raw !== current) {
    current = raw;
    listeners.forEach((l) => l());
  }
}

/** Lit le prénom côté React (re-render à chaque changement). */
export function useFirstName(): string {
  return useSyncExternalStore(subscribeFirstName, getFirstName, getFirstName);
}
