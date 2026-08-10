import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// ── « Réduire les animations », enfin lu ─────────────────────────────────────
//
// Réglage d'accessibilité d'iOS (Réglages → Accessibilité → Mouvement) et
// d'Android. Mesuré le 2026-08-10 : `AccessibilityInfo` n'apparaissait dans
// **aucun** fichier de l'app — le réglage était donc entièrement ignoré, sur
// toutes les animations, y compris la fête d'anniversaire de 2 200 ms. Apple
// teste ce réglage en revue.
//
// 🔴 POURQUOI UN STORE ET PAS UN `useEffect` DANS CHAQUE COMPOSANT.
// C'est le patron OBLIGATOIRE de toute valeur d'APPAREIL dans ce dépôt
// (CLAUDE.md §11), et il a été payé deux fois : le suivi d'hydratation se
// relisait « au focus » et n'atteignait jamais l'écran Plan — basculer le
// réglage laissait la carte en place **jusqu'au redémarrage** ; le prénom, lui,
// n'était lu qu'au montage et restait faux **à perpétuité**. Une valeur lue par
// un autre écran que celui qui la pose ne se relit pas, elle se DIFFUSE.
//
// ⚠️ ET CELLE-CI CHANGE PENDANT QUE L'APP TOURNE, ce qui la distingue des
// autres : l'utilisateur bascule le réglage dans les Réglages système, revient
// dans Kyroz, et l'app est restée ouverte. D'où l'abonnement à l'événement
// `reduceMotionChanged` en plus de la lecture initiale — sans lui, le réglage
// ne prendrait qu'au prochain démarrage, ce qui est exactement le défaut qu'on
// vient de décrire, rejoué.
//
// ℹ️ La DÉCISION (quelle durée, quel ressort servir quand c'est actif) ne vit
// PAS ici : elle est dans `lib/motion.ts`, pur et testé. Ce fichier ne fait que
// le câblage — il importe react-native, donc rien de ce qu'il contient n'est
// vérifiable sous vitest.

let actif = false;
const listeners = new Set<() => void>();

function diffuser(v: boolean) {
  if (v === actif) return;
  actif = v;
  listeners.forEach((l) => l());
}

/** L'état courant, hors React (utilisable dans un `PanResponder`, un timer…). */
export function reduceMotionActif(): boolean {
  return actif;
}

export function subscribeReduceMotion(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Lit le réglage et s'abonne à ses changements. Appelé UNE fois dans le layout
 * racine, avec les autres valeurs d'appareil.
 * ⚠️ Une valeur oubliée dans ce chargement repart sur son défaut à chaque
 * démarrage, et ça ne se voit nulle part — d'où le regroupement au même endroit.
 */
export async function loadReduceMotion() {
  try {
    diffuser(await AccessibilityInfo.isReduceMotionEnabled());
  } catch {
    // Sur web, l'API peut ne pas répondre : on reste sur « pas de réduction »,
    // qui est le comportement d'avant ce chantier. Un échec de lecture ne doit
    // pas priver quelqu'un de mouvement, ni en imposer à qui n'en veut pas.
  }
  try {
    AccessibilityInfo.addEventListener('reduceMotionChanged', diffuser);
  } catch {
    /* idem — l'abonnement est un bonus, pas une condition */
  }
}

/** Lit le réglage côté React (re-render quand il bascule). */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribeReduceMotion, reduceMotionActif, reduceMotionActif);
}
