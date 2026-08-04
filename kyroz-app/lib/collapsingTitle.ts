// ── Repli du grand titre : la DÉCISION, sans React ni react-native ──────────
//
// Le composant vit dans `components/CollapsingTitle.tsx`. Ce qui est ici, c'est
// uniquement l'arithmétique du seuil — et elle est séparée pour une raison
// précise : le MOUVEMENT est invérifiable dans le panneau navigateur, où
// `requestAnimationFrame` ne tourne pas (0 frame en 7,2 s, mesuré le 2026-08-04,
// cf. docs/comparer-maquette.md). Une animation y démarre, rend une frame, puis
// se fige à une valeur intermédiaire parfaitement plausible. On ne peut donc pas
// conclure « le repli marche » depuis une capture — mais on peut tester la
// décision, à condition qu'elle ne dépende d'aucun module natif.

/** Hauteur de la barre compacte, en points. */
export const COMPACT_BAR_H = 52;

/** Repli prudent tant que l'en-tête n'a pas été mesuré. */
export const SEUIL_PAR_DEFAUT = 140;

/**
 * À quel défilement le titre compact doit-il prendre le relais ?
 *
 * `y` et `hauteur` sont ceux de la vue d'en-tête dans le contenu défilant. Le
 * gros titre a disparu quand le bas de l'en-tête est passé sous la barre — d'où
 * la soustraction de sa hauteur.
 *
 * ⚠️ Le plancher à 24 n'est pas décoratif : sur un écran dont l'en-tête est plus
 * COURT que la barre (52), le calcul donnerait un seuil négatif, donc un titre
 * compact affiché en permanence — posé PAR-DESSUS le grand titre. C'est le cas
 * de l'écran Frigo quand le stock est vide et que l'en-tête se réduit à une ligne.
 */
export function seuilRepli(y: number, hauteur: number): number {
  return Math.max(24, y + hauteur - COMPACT_BAR_H);
}
