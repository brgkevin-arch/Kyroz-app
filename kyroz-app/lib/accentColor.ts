import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Couleur d'accent ─────────────────────────────────────────────────────────
// L'accent est ce qui se touche : bouton principal, jour actif, pilule
// sélectionnée, coche. Il est MONOCHROME par défaut (encre sur fond clair, blanc
// sur fond sombre) — c'est la DA de Kyroz, et elle ne bouge pas. Le choix d'une
// couleur est une PERSONNALISATION, jamais un habillage imposé.
//
// Même store externe que `themeMode.ts` : hors React, donc lisible par
// `useTheme()` sans provider et sans cycle d'import (theme.ts → ce fichier,
// jamais l'inverse).
//
// ⚠️ LOCAL-ONLY, comme la préférence de thème : rien en base, donc AUCUNE
// migration Supabase. C'est un réglage d'appareil, pas une donnée de profil —
// et le même compte peut légitimement vouloir du bleu sur son téléphone et du
// monochrome sur son iPad.

export type AccentId = 'mono' | 'blue' | 'green' | 'orange' | 'red' | 'purple';

/**
 * Chaque accent porte DEUX valeurs, une par thème — et ce n'est pas du confort :
 * une même couleur ne peut pas tenir sur fond blanc ET sur fond noir. Un bleu
 * assez sombre pour se lire sur blanc devient un trou noir sur fond noir.
 * Les valeurs claires sont assombries, les sombres éclaircies.
 */
export const ACCENTS: Record<AccentId, { label: string; light: string; dark: string }> = {
  mono:   { label: 'Monochrome', light: '#1C1C1E', dark: '#FFFFFF' },
  blue:   { label: 'Bleu',       light: '#0A66D0', dark: '#4C9AFF' },
  green:  { label: 'Vert',       light: '#1B7A47', dark: '#4ED186' },
  // ⚠️ L'orange clair a été choisi PAR MESURE, pas à l'œil. Assombri jusqu'à passer
  // le seuil, il virait au marron (#9A4C06, 5,52:1 — un orange qui ne ressemble plus
  // à de l'orange). #CC6600 tient les deux : 3,44:1 contre le fond de page, et ça
  // reste un orange. La tentation était de baisser le seuil ; la bonne réponse était
  // de balayer les valeurs intermédiaires.
  orange: { label: 'Orange',     light: '#CC6600', dark: '#FF9F45' },
  red:    { label: 'Rouge',      light: '#B3271C', dark: '#FF6B60' },
  purple: { label: 'Violet',     light: '#6B3FBF', dark: '#B388FF' },
};

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

const KEY = '@kyroz:accent';
const DEFAULT: AccentId = 'mono';

let current: AccentId = DEFAULT;
const listeners = new Set<() => void>();

export function getAccentId(): AccentId {
  return current;
}

export function setAccentId(next: AccentId) {
  if (next === current || !ACCENTS[next]) return;
  current = next;
  AsyncStorage.setItem(KEY, next).catch(() => {});
  listeners.forEach((l) => l());
}

export function subscribeAccentId(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Charge la préférence persistée au démarrage (appelé une fois dans le layout racine). */
export async function loadAccentId() {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw && (ACCENT_IDS as string[]).includes(raw)) {
    current = raw as AccentId;
    listeners.forEach((l) => l());
  }
}

/** Lit la préférence courante côté React (re-render au changement). */
export function useAccentId(): AccentId {
  return useSyncExternalStore(subscribeAccentId, getAccentId, getAccentId);
}

// ── Lisibilité du texte POSÉ SUR l'accent ────────────────────────────────────
// ⚠️ `onAccent` se CALCULE, il ne se choisit pas à la main. Une table écrite à la
// main est une promesse qu'on oublie de tenir : il suffit d'ajouter un orange
// clair en gardant « texte blanc » pour livrer un bouton illisible, et personne
// ne le voit en relisant le diff. Ici, la couleur du libellé est toujours celle
// des deux (noir ou blanc) qui contraste le plus avec le fond du bouton.
// Le garde-fou correspondant vit dans `lib/__tests__/accentColor.test.ts` : il
// exige 4,5:1 sur CHAQUE accent × CHAQUE thème.

/** Canal sRGB 0–255 → linéaire (formule WCAG 2.x). */
function linear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminance relative d'un `#RRGGBB` (WCAG 2.x). */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Rapport de contraste WCAG entre deux `#RRGGBB` (1 = identique, 21 = max). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Noir ou blanc — celui qui se lit le mieux sur `bg`. */
export function readableOn(bg: string): '#000000' | '#FFFFFF' {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#000000') ? '#FFFFFF' : '#000000';
}
