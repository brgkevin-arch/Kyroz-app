// ── Affichage des quantités en unités lisibles ───────────────────────────────
// Convertit des grammes en PIÈCES (œufs, bananes, tortillas…) ou en kg/L quand
// c'est plus naturel pour faire ses courses. Partagé par les courses, le frigo
// et les fiches recette pour un affichage cohérent partout.

function frnum(x: number): string {
  const r = Math.round(x * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',');
}

function countStr(x: number, one: string, many: string): string {
  const c = Math.max(1, Math.round(x));
  return `${c} ${c > 1 ? many : one}`;
}

// Arrondi à la demi-unité (avocat : on coupe souvent en deux).
function halfStr(x: number, one: string, many: string): string {
  const c = Math.max(0.5, Math.round(x * 2) / 2);
  const label = c > 1 ? many : one;
  return `${c === 0.5 ? '½' : frnum(c)} ${label}`;
}

/**
 * Quantité lisible pour un aliment.
 *  - ml → ml / L ; 'pièce' → « pc »
 *  - œufs, bananes, tortillas, avocats → comptés à l'unité
 *  - sinon : g, ou kg au-delà de 1000 g
 */
export function formatQuantity(name: string, quantity: number, unit: string = 'g'): string {
  const n = (name || '').toLowerCase();

  if (unit === 'ml') return quantity >= 1000 ? `${frnum(quantity / 1000)} L` : `${Math.round(quantity)} ml`;
  if (unit === 'pièce' || unit === 'pc') return `${frnum(quantity)} pc`;

  // Aliments naturellement comptés à l'unité.
  // ⚠️ « bœuf » contient « œuf » → on exclut explicitement, sinon le steak haché
  // se retrouve compté en œufs dans les courses.
  const egg = (n.includes('œuf') || n.includes('oeuf')) && !n.includes('bœuf') && !n.includes('boeuf');
  if (egg && n.includes('blanc')) return countStr(quantity / 33, "blanc d'œuf", "blancs d'œuf");
  if (egg) return countStr(quantity / 55, 'œuf', 'œufs');
  if (n.includes('banane')) return countStr(quantity / 120, 'banane', 'bananes');
  if (n.includes('tortilla')) return countStr(quantity / 60, 'tortilla', 'tortillas');
  if (n.includes('avocat')) return halfStr(quantity / 150, 'avocat', 'avocats');

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
