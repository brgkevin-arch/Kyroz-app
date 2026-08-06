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

// ── Les trois nuances de la barre de macros ──────────────────────────────────
// Décision fondateur du 2026-08-05 : la barre prend la couleur choisie, en TROIS
// NUANCES — exactement ce que font les variantes colorées de la maquette. Le
// principe posé en tête de `constants/theme.ts` ne change pas d'un iota : trois
// nuances d'UNE couleur, jamais trois teintes différentes. Ce qui change, c'est
// que cette couleur n'est plus forcément le gris.
//
// 🔴 LE PIÈGE, ET IL A DÉJÀ COÛTÉ UNE LIVRAISON : la 3ᵉ nuance de la maquette
// (`#DDDDDF`) tombait à **1,21:1** contre le fond de page. Le segment « lipides »
// était invisible et la barre semblait s'arrêter aux deux tiers — juste dans un
// cadre de 402 px, illisible sur le vrai fond. Une nuance ne se choisit donc pas
// « à l'œil, un peu plus claire » : elle se MESURE contre le fond.
//
// D'où le plancher ci-dessous, repris de la valeur qui avait servi à réparer ce
// défaut (les gris système successifs remontaient le plus pâle à 1,50:1).

/** Plancher de contraste d'une nuance contre le FOND DE PAGE. */
export const MACRO_SHADE_MIN_CONTRAST = 1.5;

/** Mélange linéaire de deux `#RRGGBB`. `ratio` 0 → `a`, 1 → `b`. */
export function mixHex(a: string, b: string, ratio: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const k = Math.max(0, Math.min(1, ratio));
  const c = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`.toUpperCase();
}

/**
 * Rapproche `accent` du fond de `ratio`, mais **jamais au point de disparaître** :
 * si la nuance obtenue passe sous le plancher, on recule vers l'accent par pas de
 * 0,05 jusqu'à repasser. L'accent lui-même est garanti ≥ 3:1 contre le fond
 * (test `accentColor.test.ts`), donc la boucle termine toujours.
 */
function shadeVersBg(accent: string, bg: string, ratio: number): string {
  for (let k = ratio; k > 0; k -= 0.05) {
    const nuance = mixHex(accent, bg, k);
    if (contrastRatio(nuance, bg) >= MACRO_SHADE_MIN_CONTRAST) return nuance;
  }
  return accent;
}

/**
 * Les trois nuances de la barre, de la plus franche à la plus discrète :
 * protéines = l'accent, glucides et lipides s'en éloignent vers le fond.
 */
export function macroShades(accent: string, bg: string): [string, string, string] {
  return [accent, shadeVersBg(accent, bg, 0.38), shadeVersBg(accent, bg, 0.64)];
}
