import { useEffect } from 'react';

// ── LES MODALES PRÉSENTÉES, RECENSÉES (2026-09-19) ────────────────────────────────────
//
// 🔴 SIGNALÉ PAR LE FONDATEUR le jour de la 47ᵉ OTA : « une fois que j'ai validé, l'écran
// s'est figé sur le profil. Impossible d'interagir. » Reproduit au simulateur, et le
// mécanisme est celui que CLAUDE.md décrit déjà : iOS ne présente PAS une `Modal`
// par-dessus une `Modal` déjà en place.
//   · La carte « Revois tes protéines préférées » ouvre le Profil ET son éditeur.
//   · À la première visite du Profil, sa visite guidée se lance d'elle-même 650 ms plus
//     tard (`useScreenTour`) — donc PAR-DESSUS l'éditeur. iOS la refuse, sans erreur.
//   · React la croit ouverte. L'éditeur refermé, elle reste là, invisible, et avale
//     TOUS les taps — défilement et barre d'onglets compris. Il fallait tuer l'app.
// ⚠️ Même panne, déjà en place et jamais vue : « Revoir les tutos » lance la visite
// depuis la feuille Réglages, qui reste ouverte. Rien ne s'affichait, puis l'app se
// figeait à la fermeture de la feuille.
// ⚠️ Le simulateur ne l'a montré qu'avec la visite du Profil JAMAIS VUE : le premier
// essai, sur un appareil où elle l'était, passait sans accroc. Une panne qui dépend
// d'un « déjà vu » ne frappe qu'une fois par appareil, donc ne se reproduit pas chez soi.
//
// ➡️ Les surfaces qui s'imposent d'elles-mêmes (la visite guidée) ATTENDENT qu'aucune
// modale ne soit plus présentée. Chaque enveloppe de `Modal` se recense ici tant qu'elle
// est à l'écran ; `lib/__tests__/modalesPresentees.test.ts` compte qu'aucune n'y échappe.
// ⚠️ La libération part au NETTOYAGE de l'effet, donc dans le rendu qui a retiré la
// modale : ce qui attendait est présenté au rendu SUIVANT, pas dans le même lot — c'est
// ce qui évite de rejouer la course au lieu de la fermer. Aucun délai n'est deviné.

let ouvertes = 0;
const enAttente = new Set<() => void>();

/** Une modale vient d'être présentée. Rend sa libération (idempotente). */
export function recenserModale(): () => void {
  ouvertes += 1;
  let libre = false;
  return () => {
    if (libre) return;
    libre = true;
    ouvertes -= 1;
    if (ouvertes === 0) [...enAttente].forEach((f) => f());
  };
}

/** Une modale est-elle présentée en ce moment ? */
export function modaleOuverte(): boolean {
  return ouvertes > 0;
}

/**
 * Appelle `f` UNE fois, dès qu'aucune modale n'est plus présentée — tout de suite si c'est
 * déjà le cas. Rend l'annulation.
 */
export function quandAucuneModale(f: () => void): () => void {
  if (ouvertes === 0) { f(); return () => {}; }
  const une = () => { enAttente.delete(une); f(); };
  enAttente.add(une);
  return () => { enAttente.delete(une); };
}

/** À poser dans CHAQUE enveloppe de `Modal`, au-dessus de tout `return null`. */
export function useModaleRecensee(presentee: boolean) {
  useEffect(() => {
    if (!presentee) return;
    return recenserModale();
  }, [presentee]);
}
