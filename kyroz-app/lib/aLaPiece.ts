// ── Les aliments qui se vendent À LA PIÈCE (2026-10-23) ───────────────────────
//
// Demande du fondateur (tour de l'app avant la 62ᵉ OTA) : *« corrige les unités »*.
// La liste de courses disait « 1 ananas », la Réserve rangeait ensuite « 500 g », et la
// fiche d'une recette demandait « Tomate 80 g » à qui achète ses tomates à l'unité. Trois
// écrans, trois manières de compter le même aliment.
//
// ➡️ SOURCE UNIQUE : la liste de courses (`formatsVendus.ts`, ce qu'on prend en rayon),
// l'affichage (`units.ts::formatQuantity`, partout ailleurs) et la conversion pièces ↔
// grammes de la Réserve (`units.ts::poidsUnitaire`) lisent CETTE table. Deux tables
// auraient divergé : une tomate de 120 g sur la liste, de 100 g dans la Réserve.
//
// ⚠️ Le poids est celui de la PARTIE UTILISÉE d'une pièce moyenne de grande surface
// (un ananas sans écorce ni cœur, un avocat sans noyau) : c'est ce que pèsent les
// quantités des recettes. Pur, sans import : `units.ts` le lit sans tirer le catalogue.

export interface ALaPiece {
  /** Poids moyen d'une pièce, en grammes. */
  poids: number;
  nom: string;
  pluriel: string;
}

/** `ref` du catalogue → la pièce. */
export const A_LA_PIECE: Record<string, ALaPiece> = {
  banane: { poids: 120, nom: 'banane', pluriel: 'bananes' },
  avocat: { poids: 150, nom: 'avocat', pluriel: 'avocats' },
  pomme: { poids: 150, nom: 'pomme', pluriel: 'pommes' },
  kiwi: { poids: 75, nom: 'kiwi', pluriel: 'kiwis' },
  mangue: { poids: 250, nom: 'mangue', pluriel: 'mangues' },
  ananas: { poids: 500, nom: 'ananas', pluriel: 'ananas' },
  courgette: { poids: 200, nom: 'courgette', pluriel: 'courgettes' },
  poivron: { poids: 150, nom: 'poivron', pluriel: 'poivrons' },
  tomate: { poids: 120, nom: 'tomate', pluriel: 'tomates' },
  oignon: { poids: 100, nom: 'oignon', pluriel: 'oignons' },
  carotte: { poids: 100, nom: 'carotte', pluriel: 'carottes' },
  concombre: { poids: 350, nom: 'concombre', pluriel: 'concombres' },
  brocoli: { poids: 350, nom: 'brocoli', pluriel: 'brocolis' },
  chou_fleur: { poids: 600, nom: 'chou-fleur', pluriel: 'choux-fleurs' },
  salade_verte: { poids: 250, nom: 'salade', pluriel: 'salades' },
  patate_douce: { poids: 300, nom: 'patate douce', pluriel: 'patates douces' },
};

/** Sous un cinquième de pièce, on ne coupe plus : les grammes disent mieux (40 g de salade). */
export const FRACTION_MIN = 0.2;

const FRACTIONS: [number, string][] = [[1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '1']];

/**
 * Un nombre de pièces, lisible : « ⅔ tomate », « 1 ananas », « 1,5 courgette », « 2 tomates ».
 * `null` sous `FRACTION_MIN` : l'appelant affiche alors des grammes.
 *
 * Sous une pièce : la fraction de cuisine la plus proche (¼ ⅓ ½ ⅔ ¾). Au-delà : à la
 * demi-pièce. Le pluriel commence à DEUX (« 1,5 tomate »), comme le veut le français.
 */
export function piecesLisibles(x: number, nom: string, pluriel: string): string | null {
  if (!(x >= FRACTION_MIN)) return null;
  if (x < 1) {
    let [valeur, texte] = FRACTIONS[0];
    for (const [v, t] of FRACTIONS) if (Math.abs(x - v) < Math.abs(x - valeur)) [valeur, texte] = [v, t];
    return `${texte} ${nom}`;
  }
  const c = Math.round(x * 2) / 2;
  return `${String(c).replace('.', ',')} ${c >= 2 ? pluriel : nom}`;
}
