import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Préférence de thème ──────────────────────────────────────────────────────
// Choix manuel clair/sombre, ou « système » (suit le réglage de l'OS, défaut).
// Stocké hors React (petit store externe) pour que `useTheme()` y accède sans
// provider et sans créer de cycle d'import (theme.ts → ce fichier, jamais l'inverse).

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = '@kyroz:theme';

let current: ThemeMode = 'system';
const listeners = new Set<() => void>();

export function getThemeMode(): ThemeMode {
  return current;
}

export function setThemeMode(next: ThemeMode) {
  if (next === current) return;
  current = next;
  AsyncStorage.setItem(KEY, next).catch(() => {});
  listeners.forEach((l) => l());
}

export function subscribeThemeMode(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Charge la préférence persistée au démarrage (appelé une fois dans le layout racine).
export async function loadThemeMode() {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    current = raw;
    listeners.forEach((l) => l());
  }
}

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre',
};

/** Lit la préférence courante côté React (re-render au changement). */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeThemeMode, getThemeMode, getThemeMode);
}
