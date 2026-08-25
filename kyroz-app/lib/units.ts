// ── Affichage des quantités en unités lisibles ───────────────────────────────
// Convertit des grammes en PIÈCES (œufs, bananes, tortillas…) ou en kg/L quand
// c'est plus naturel pour faire ses courses. Partagé par les courses, le frigo
// et les fiches recette pour un affichage cohérent partout.

/**
 * Nombre à une décimale, séparateur FRANÇAIS. Exporté depuis le 2026-08-10 : la carte
 * d'objectif affichait « 113.5 kg » et « 0.7 kg/sem » avec un point, dans une app
 * entièrement en français. Vu à l'écran, pas à la relecture.
 * ⚠️ Un dixième de formateur de plus dans un composant ferait un neuvième endroit où
 * la règle peut diverger — celui-ci existait déjà, il était seulement privé.
 */
export function frnum(x: number): string {
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
  if (n.includes('banane')) return 120;
  if (n.includes('tortilla')) return 60;
  if (n.includes('avocat')) return 150;
  return undefined;
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

  // Aliments naturellement comptés à l'unité (poids de la pièce : `poidsUnitaire`).
  const pu = poidsUnitaire(name);
  const egg = estOeuf(n);
  if (pu && egg && n.includes('blanc')) return countStr(quantity / pu, "blanc d'œuf", "blancs d'œuf");
  if (pu && egg) return countStr(quantity / pu, 'œuf', 'œufs');
  if (pu && n.includes('banane')) return countStr(quantity / pu, 'banane', 'bananes');
  if (pu && n.includes('tortilla')) return countStr(quantity / pu, 'tortilla', 'tortillas');
  if (pu && n.includes('avocat')) return halfStr(quantity / pu, 'avocat', 'avocats');

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
