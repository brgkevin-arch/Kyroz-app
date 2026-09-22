// ── Poids et taille à la ROULETTE (onboarding, page 2) ───────────────────────
//
// Décision fondateur du 2026-09-22 : « revoir la saisie du poids et de la taille,
// avec un carrousel ». Même geste que la date de naissance juste au-dessus : une
// ligne qui ouvre une roulette, et « Valider » qui décide.
//
// Ce fichier ne porte que des DÉCISIONS pures (bornes, découpage, libellés) : il se
// teste sous vitest, là où la roulette elle-même tire react-native.
//
// ⚠️ LES BORNES SONT CELLES DU GARDE-FOU, PAS UNE COPIE : `WEIGHT_BOUNDS` et
// `HEIGHT_BOUNDS` (lib/safety.ts) décident déjà si l'étape se passe. Une roulette plus
// large proposerait des valeurs refusées ; plus étroite, elle refuserait en silence
// des corps que le produit accepte.
//
// ⚠️ LA VALEUR RESTE UNE CHAÎNE (« 75.5 »), comme quand elle se tapait : l'écran, le
// brouillon d'inscription et `parseFloat` la lisent tels quels. Aucune migration.

import { WEIGHT_BOUNDS, HEIGHT_BOUNDS } from './safety';
import type { Sex } from './types';

const plage = (de: number, a: number) => Array.from({ length: a - de + 1 }, (_, i) => de + i);

/** Kilos entiers proposés — les bornes du garde-fou, incluses. */
export const KILOS = plage(WEIGHT_BOUNDS[0], WEIGHT_BOUNDS[1]);
/** La décimale du poids : ,0 à ,9 (un pèse-personne ne donne pas mieux). */
export const DIXIEMES = plage(0, 9);
/** Centimètres proposés — les bornes du garde-fou, incluses. */
export const CENTIMETRES = plage(HEIGHT_BOUNDS[0], HEIGHT_BOUNDS[1]);

/**
 * Où la roulette S'OUVRE quand rien n'est encore choisi. Ce n'est PAS une valeur
 * enregistrée — la ligne dit « À renseigner » tant que « Valider » n'a pas été tapé —
 * juste un point de départ proche de la plupart des gens, pour ne pas faire défiler
 * depuis 30 kg. Ordres de grandeur des adultes en France, par sexe.
 */
export function departPoids(sex: Sex | null): number {
  return sex === 'female' ? 62 : 75;
}
export function departTaille(sex: Sex | null): number {
  return sex === 'female' ? 163 : 176;
}

/** « 75.5 » → { kilos: 75, dixieme: 5 } ; `null` si vide ou hors des bornes. */
export function decouperPoids(saisie: string): { kilos: number; dixieme: number } | null {
  const v = parseFloat(saisie.replace(',', '.'));
  if (!Number.isFinite(v) || v < WEIGHT_BOUNDS[0] || v > WEIGHT_BOUNDS[1]) return null;
  const dixiemes = Math.round(v * 10);
  return { kilos: Math.floor(dixiemes / 10), dixieme: dixiemes % 10 };
}

/** { 75, 5 } → « 75.5 » ; { 75, 0 } → « 75 » (la forme que `parseFloat` relit). */
export function assemblerPoids(kilos: number, dixieme: number): string {
  return dixieme === 0 ? String(kilos) : `${kilos}.${dixieme}`;
}

/** « 180 » → 180 ; `null` si vide ou hors des bornes. */
export function lireTaille(saisie: string): number | null {
  const v = Math.round(parseFloat(saisie));
  return Number.isFinite(v) && v >= HEIGHT_BOUNDS[0] && v <= HEIGHT_BOUNDS[1] ? v : null;
}

/** Ce que la ligne affiche : « 75,5 kg » (virgule française), « 180 cm », ou rien. */
export function libellePoids(saisie: string): string | null {
  const p = decouperPoids(saisie);
  return p ? `${p.kilos}${p.dixieme ? `,${p.dixieme}` : ''} kg` : null;
}
export function libelleTaille(saisie: string): string | null {
  const v = lireTaille(saisie);
  return v === null ? null : `${v} cm`;
}
