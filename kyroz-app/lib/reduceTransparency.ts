import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// ── « Réduire la transparence », lu dès le premier verre posé ────────────────
//
// Miroir exact de `lib/reduceMotion.ts`, pour le réglage voisin : Réglages →
// Accessibilité → Affichage et taille du texte → Réduire la transparence. Apple
// le teste en revue au même titre que « Réduire les animations ».
//
// ⚠️ POURQUOI UN FICHIER À PART ET PAS UNE SECONDE VALEUR DANS `reduceMotion`.
// Chaque fichier porte le nom de SON réglage. Un `reduceMotion.ts` qui
// exposerait aussi la transparence deviendrait un fichier dont le nom ment —
// et c'est exactement ce qui rend un garde-fou aveugle : on cherche la
// transparence là où son nom dit qu'elle est, on ne la trouve pas, on conclut
// qu'elle n'est pas gérée.
//
// 🔴 Même patron obligatoire de valeur d'APPAREIL (CLAUDE.md §11) : store
// externe + `useSyncExternalStore`, chargé UNE fois au layout racine. Et comme
// son voisin, ce réglage CHANGE pendant que l'app tourne — l'utilisateur le
// bascule dans les Réglages système et revient dans Kyroz sans l'avoir fermée —
// d'où l'abonnement à `reduceTransparencyChanged` en plus de la lecture initiale.
//
// ℹ️ La DÉCISION (verre ou peinture) ne vit pas ici : elle est dans
// `lib/materiau.ts`, pur et testé. Ce fichier n'est que le câblage.

let actif = false;
const listeners = new Set<() => void>();

function diffuser(v: boolean) {
  if (v === actif) return;
  actif = v;
  listeners.forEach((l) => l());
}

/** L'état courant, hors React. */
export function reduceTransparencyActif(): boolean {
  return actif;
}

export function subscribeReduceTransparency(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Lit le réglage et s'abonne à ses changements. Appelé UNE fois dans le layout
 * racine, avec les autres valeurs d'appareil.
 * ⚠️ Une valeur oubliée dans ce chargement repart sur son défaut à chaque
 * démarrage, et ça ne se voit nulle part — d'où le regroupement au même endroit.
 */
export async function loadReduceTransparency() {
  try {
    diffuser(await AccessibilityInfo.isReduceTransparencyEnabled());
  } catch {
    // Sur web et Android l'API peut ne pas répondre : on reste sur « pas de
    // réduction ». Ce n'est pas un risque ici — sans verre disponible, la
    // valeur ne change rien à ce qui s'affiche.
  }
  try {
    AccessibilityInfo.addEventListener('reduceTransparencyChanged', diffuser);
  } catch {
    /* idem — l'abonnement est un bonus, pas une condition */
  }
}

/** Lit le réglage côté React (re-render quand il bascule). */
export function useReduceTransparency(): boolean {
  return useSyncExternalStore(
    subscribeReduceTransparency,
    reduceTransparencyActif,
    reduceTransparencyActif
  );
}
