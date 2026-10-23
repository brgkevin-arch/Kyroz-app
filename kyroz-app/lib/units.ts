// ── Affichage des quantités en unités lisibles ───────────────────────────────
// Convertit des grammes en PIÈCES (œufs, tomates, ananas…) ou en kg/L quand
// c'est plus naturel pour faire ses courses. Partagé par les courses, la réserve
// et les fiches recette pour un affichage cohérent partout.

import { A_LA_PIECE, FRACTION_MIN, piecesLisibles } from './aLaPiece';
import { refDuNom } from './nomsAliments';

/**
 * Nombre à une décimale, séparateur FRANÇAIS. Exporté depuis le 2026-08-10 : la carte
 * d'objectif affichait « 113.5 kg » et « 0.7 kg/sem » avec un point, dans une app
 * entièrement en français. Vu à l'écran, pas à la relecture.
 * ⚠️ Un dixième de formateur de plus dans un composant ferait un neuvième endroit où
 * la règle peut diverger — celui-ci existait déjà, il était seulement privé.
 */
export function frnum(x: number): string {
  const r = Math.round(x * 10) / 10;
  // Le VRAI signe moins (U+2212), pas le tiret court : aussi large que le « + », il aligne
  // les écarts en colonne (typographie, 2026-10-23). Aucun appelant ne relit ce texte.
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',').replace('-', '\u2212');
}

/** Un écart, signé dans les deux sens : « +0,3 », « −0,3 », « 0 ». Le « + » ne se recolle plus à la main. */
export function frsigne(x: number): string {
  return x > 0 ? `+${frnum(x)}` : frnum(x);
}

function countStr(x: number, one: string, many: string): string {
  const c = Math.max(1, Math.round(x));
  return `${c} ${c > 1 ? many : one}`;
}

/** Un nom désigne-t-il un œuf ? ⚠️ « bœuf » contient « œuf » → exclusion explicite,
 *  sinon le steak haché se retrouve compté en œufs dans les courses. */
function estOeuf(n: string): boolean {
  return (n.includes('œuf') || n.includes('oeuf')) && !n.includes('bœuf') && !n.includes('boeuf');
}

/**
 * Poids moyen d'UNE pièce, pour les aliments qu'on compte à l'unité.
 * `undefined` = aliment qui ne se compte pas (riz, huile…).
 *
 * ⚠️ SOURCE UNIQUE, et elle a désormais DEUX lecteurs qui ne font pas la même chose :
 * `formatQuantity` s'en sert pour AFFICHER (« 3 œufs »), et `lib/pantry.ts` pour
 * COMPARER un stock saisi en pièces au besoin d'une recette exprimé en grammes.
 * Deux tables auraient divergé sans que rien ne le dise — et la seconde aurait
 * déclaré « réalisable » une recette qu'on ne peut pas faire.
 */
export function poidsUnitaire(name: string): number | undefined {
  const n = (name || '').toLowerCase();
  if (estOeuf(n)) return n.includes('blanc') ? 33 : 55;
  const piece = pieceDe(name);
  if (piece) return piece.poids;
  if (n.includes('tortilla')) return 60;
  return undefined;
}

/**
 * La pièce d'un aliment vendu à la pièce (`lib/aLaPiece.ts`), d'après son nom.
 * Le nom du catalogue d'abord (« Patate douce ») ; puis, pour un nom saisi à la main
 * (« bananes »), les deux mots que l'app reconnaissait déjà avant le 2026-10-23.
 */
function pieceDe(name: string) {
  const ref = refDuNom(name || '');
  if (ref && A_LA_PIECE[ref]) return A_LA_PIECE[ref];
  const n = (name || '').toLowerCase();
  if (n.includes('banane')) return A_LA_PIECE.banane;
  if (n.includes('avocat')) return A_LA_PIECE.avocat;
  return undefined;
}

/**
 * Quantité lisible pour un aliment.
 *  - ml → ml / L ; 'pièce' → « 2 courgettes » si l'aliment se vend à la pièce, sinon « pc »
 *  - œufs, tortillas → comptés à l'unité
 *  - ce qui s'achète à la pièce (`lib/aLaPiece.ts`) → « ⅔ tomate », « 1 ananas »
 *  - sinon : g, ou kg au-delà de 1000 g
 *
 * 🔴 « Tomate 80 g » sur la fiche, « 500 g » d'ananas dans la Réserve quand la liste
 * avait dit « 1 ananas » : corrigé le 2026-10-23 (fondateur, « corrige les unités »).
 * Ce qu'on achète à la pièce se compte en pièces, sur tous les écrans.
 */
export function formatQuantity(name: string, quantity: number, unit: string = 'g'): string {
  const n = (name || '').toLowerCase();
  const piece = pieceDe(name);

  if (unit === 'ml') return quantity >= 1000 ? `${frnum(quantity / 1000)} L` : `${Math.round(quantity)} ml`;
  if (unit === 'pièce' || unit === 'pc') {
    return (piece && piecesLisibles(quantity, piece.nom, piece.pluriel)) || `${frnum(quantity)} pc`;
  }

  // Aliments naturellement comptés à l'unité (poids de la pièce : `poidsUnitaire`).
  const pu = poidsUnitaire(name);
  const egg = estOeuf(n);
  if (pu && egg && n.includes('blanc')) return countStr(quantity / pu, "blanc d'œuf", "blancs d'œuf");
  if (pu && egg) return countStr(quantity / pu, 'œuf', 'œufs');
  if (piece) {
    const pieces = piecesLisibles(quantity / piece.poids, piece.nom, piece.pluriel);
    if (pieces) return pieces;
  } else if (pu && n.includes('tortilla')) return countStr(quantity / pu, 'tortilla', 'tortillas');

  // Poids
  if (quantity >= 1000) return `${frnum(quantity / 1000)} kg`;
  return `${Math.round(quantity)} g`;
}

// Convertit une saisie (avec unité de saisie kg/L) vers l'unité de base stockée.
export function toBaseUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  if (unit === 'kg') return { quantity: Math.round(quantity * 1000), unit: 'g' };
  if (unit === 'L' || unit === 'l') return { quantity: Math.round(quantity * 1000), unit: 'ml' };
  return { quantity, unit };
}

/**
 * La quantité à proposer dans un champ de saisie, dans l'unité que la ligne AFFICHE :
 * une ligne qui dit « ⅔ tomate » s'ouvre sur « 0.67 pièce », pas sur « 80 g »
 * (2026-10-23). Sous un cinquième de pièce, la ligne dit des grammes : le champ aussi.
 */
export function quantiteDeSaisie(name: string, quantity: number, unit: string): { quantity: number; unit: string } {
  const pu = unit === 'g' ? poidsUnitaire(name) : undefined;
  if (!pu || quantity / pu < FRACTION_MIN) return { quantity, unit };
  return { quantity: Math.round((quantity / pu) * 100) / 100, unit: 'pièce' };
}

/**
 * Ce qui se range en réserve pour une saisie : des pièces d'un aliment dont on connaît le
 * poids partent en GRAMMES, l'unité dans laquelle la liste de courses le range. Sinon le
 * même aliment vivrait sur deux lignes, « 2 tomates » et « 2 tomates », que rien ne fusionne.
 */
export function versStockage(name: string, quantity: number, unit: string): { quantity: number; unit: string } {
  const base = toBaseUnit(quantity, unit);
  const pu = base.unit === 'pièce' ? poidsUnitaire(name) : undefined;
  return pu ? { quantity: Math.round(base.quantity * pu), unit: 'g' } : base;
}
