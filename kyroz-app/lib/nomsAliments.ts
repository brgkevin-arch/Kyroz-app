// ── Le nom d'un aliment → sa `ref` du catalogue ──────────────────────────────
//
// Sorti de `lib/pantry.ts` le 2026-10-23, sans rien y changer : `lib/units.ts` en a
// besoin pour compter à la pièce ce qui s'achète à la pièce (`lib/aLaPiece.ts`), et
// `pantry.ts` importe déjà `units.ts` — le laisser là faisait un cycle. `pantry.ts`
// les ré-exporte : aucun appelant ne change.

import { RECIPE_INGREDIENTS } from './recipeData';

/**
 * Comparaison de noms d'aliments : sans casse, sans accents, sans ligatures.
 *
 * ⚠️ Exporté le 2026-08-26 — il était seulement PRIVÉ. Les ajouts manuels à la
 * liste de courses (`lib/shoppingAjouts.ts`) comparent des noms saisis au clavier
 * à ceux du plan ; une seconde normalisation aurait fait diverger deux moitiés de
 * la même liste (« Poêlée » ≠ « poelee » d'un côté, égal de l'autre).
 */
export function norm(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents (é→e…)
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')   // ligatures œ/æ → lettres simples
    .replace(/['‘’]/g, '');      // apostrophes (droites/courbes)
}

/** Nom normalisé → `ref` du catalogue. Une seule construction, au chargement. */
const REF_PAR_NOM: Map<string, string> = new Map(
  Object.entries(RECIPE_INGREDIENTS).map(([ref, def]) => [norm(def.name), ref] as const),
);

/** La `ref` catalogue d'un nom, s'il en désigne une EXACTEMENT (sinon `undefined`). */
export function refDuNom(name: string): string | undefined {
  return REF_PAR_NOM.get(norm(name));
}

/** L'unité dans laquelle le catalogue range cet aliment (`g`, `ml`, `pièce`), s'il le connaît. */
export function uniteDuCatalogue(name: string): string | undefined {
  const ref = refDuNom(name);
  return ref ? (RECIPE_INGREDIENTS[ref] as { unit?: string } | undefined)?.unit : undefined;
}
