// ── Visite guidée : la VISÉE, séparée du moteur ──────────────────────────────
//
// Où l'anneau se pose, et quand la mesure a le droit d'être crue. Deux
// décisions, deux défauts payés le 2026-08-15 sur les captures du fondateur —
// et aucun des deux ne se voyait en relisant `GuidedTour.tsx`.
//
// Ce fichier n'importe RIEN, comme `lib/tours.ts` (le contenu des bulles),
// `lib/collapsingTitle.ts` (le repli du titre) et `lib/revelation.ts` (les
// paliers) : `components/GuidedTour.tsx` tire react-native, donc rien de ce
// qu'il décide ne se vérifie sous vitest. La décision vit ici, l'écran la rend.

/** Un rectangle mesuré en coordonnées ÉCRAN (`measureInWindow`). */
export interface Cadre {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * De quoi dégager les deux barres qui flottent au-dessus du contenu — la barre
 * de titre compacte en haut (52 pt) et la barre d'onglets en bas (~83 pt). Une
 * cible techniquement « à l'écran » mais glissée dessous est invisible, et
 * l'anneau y aurait l'air de ne désigner personne.
 */
export const MARGE_VISIBLE = 88;

/** Deux lectures à moins d'un demi-point l'une de l'autre sont la même. */
export const TOLERANCE_CADRE = 0.5;

/** Le pas entre deux lectures, et combien on en tente avant de renoncer. */
export const PAS_MESURE_MS = 70;
export const ESSAIS_MESURE = 20;

/**
 * Faut-il DÉPLACER l'écran pour montrer cette cible ?
 *
 * 🔴 **POURQUOI CETTE QUESTION EXISTE.** Le moteur appelait `scrollTo` à chaque
 * étape, y compris quand la cible était déjà sous les yeux — donc chaque bulle
 * payait 260 ms d'attente pour un déplacement de zéro pixel. Ce n'est pas un
 * coût de performance : pendant ces 260 ms, l'anneau de l'étape PRÉCÉDENTE reste
 * affiché sous le texte de la nouvelle. La fenêtre était courte, donc elle
 * passait pour une transition ; elle devenait un défaut franc dès qu'une mesure
 * échouait ensuite.
 *
 * ⚠️ Une cible PLUS HAUTE que la zone dégagée ne peut pas y tenir : la faire
 * défiler ne la rendrait pas plus visible, ça ne ferait que bouger l'écran sous
 * quelqu'un qui lit. On la déclare visible.
 */
export function dejaVisible(cadre: Cadre, hauteurEcran: number, marge = MARGE_VISIBLE): boolean {
  const zone = hauteurEcran - marge * 2;
  if (zone <= 0) return true;              // écran plus petit que ses propres barres
  if (cadre.height >= zone) return true;   // rien à gagner à défiler
  return cadre.y >= marge && cadre.y + cadre.height <= hauteurEcran - marge;
}

/**
 * Deux lectures décrivent-elles le même rectangle ?
 *
 * 🔴 **CE QUE ÇA REMPLACE : UN DÉLAI DEVINÉ.** Le moteur lançait un `scrollTo`
 * ANIMÉ puis mesurait 260 ms plus tard, en supposant que c'était fini. Ça ne
 * l'est pas toujours — et la lecture tombe alors EN PLEIN VOL, donc l'anneau se
 * pose à l'endroit qu'occupait la cible au milieu du défilement. Sur la capture
 * du fondateur : le bon élément, à la bonne taille, 72 points trop bas.
 * ➡️ On n'invente plus de durée, on attend que deux lectures coïncident. Le
 * défilement peut alors durer ce qu'il veut, y compris sur un appareil lent —
 * c'est exactement ce qu'un délai en dur ne sait pas faire.
 */
export function memeCadre(a: Cadre, b: Cadre, tolerance = TOLERANCE_CADRE): boolean {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}

/**
 * Combien de temps le moteur cherche sa cible avant de renoncer.
 * Doit couvrir un défilement animé (~500 ms) plus la mise en page qui se pose
 * derrière — sinon on renonce sur une cible parfaitement saine, simplement lente.
 */
export function budgetMesureMs(essais = ESSAIS_MESURE, pas = PAS_MESURE_MS): number {
  return essais * pas;
}
