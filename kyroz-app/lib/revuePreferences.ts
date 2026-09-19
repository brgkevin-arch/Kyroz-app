import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// ── REVOIR SES PRÉFÉRENCES DE PROTÉINES (décision fondateur du 2026-09-19) ──────────────
//
// Les protéines proposées dépendent désormais du régime, et ce qui est coché devient une part
// garantie des déjeuners et dîners (`lib/partsProteines.ts`). Un compte créé avant n'a jamais
// vu cette question : « on leur demande de revoir leurs préférences alimentaires ». Le Plan
// porte une carte tant que ce n'est pas fait ; elle part dès que les préférences sont
// enregistrées (Profil) — et un nouvel inscrit ne la voit jamais, il vient d'y répondre.
//
// ⚠️ Réglage d'APPAREIL (pas de colonne Supabase, donc pas de migration) : sur un nouveau
// téléphone la carte revient UNE fois. Accepté — une question de trop vaut mieux qu'une
// colonne de plus (CLAUDE.md §3, « commencer local »).
// ⚠️ Il se DIFFUSE (CLAUDE.md §11) : le Profil l'écrit, le Plan le lit. Un `useState` local
// laisserait la carte en place jusqu'au redémarrage.

const CLE = '@kyroz:preferencesProteinesRevues';
/** La version de la question : changer la date redemanderait à tout le monde. */
export const VERSION_QUESTION = '2026-09-19';

// Avant le chargement, on suppose « revu » : la carte ne doit jamais clignoter au démarrage.
let revu = true;
const listeners = new Set<() => void>();

export function getPreferencesRevues(): boolean {
  return revu;
}

export function subscribePreferencesRevues(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publier(next: boolean) {
  if (next === revu) return;
  revu = next;
  listeners.forEach((l) => l());
}

/** L'utilisateur a répondu à la question (inscription ou Profil → Préférences). */
export function marquerPreferencesRevues() {
  publier(true);
  AsyncStorage.setItem(CLE, VERSION_QUESTION).catch(() => {});
}

/** Charge l'état persisté au démarrage (une fois, dans le layout racine). */
export async function loadPreferencesRevues() {
  const raw = await AsyncStorage.getItem(CLE).catch(() => null);
  publier(raw === VERSION_QUESTION);
}

export function usePreferencesRevues(): boolean {
  return useSyncExternalStore(subscribePreferencesRevues, getPreferencesRevues, getPreferencesRevues);
}
