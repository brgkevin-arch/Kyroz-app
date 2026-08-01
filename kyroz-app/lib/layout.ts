// ── Règles de largeur d'écran — LOGIQUE PURE, testée ─────────────────────────
//
// Le hook qui les consomme vit dans `constants/layout.ts` (il a besoin du
// runtime React Native). Ici, uniquement des nombres et une fonction pure, pour
// que les seuils soient VERROUILLÉS par un test — cf. lib/__tests__/layout.test.ts.
//
// Le problème résolu, mesuré sur le rendu web à 1024 pt (iPad 13" portrait) le
// 2026-08-01, avant que ce module n'existe : aucun écran n'avait la moindre
// contrainte de largeur (une seule occurrence de `maxWidth` dans tout le code,
// sur une modale). Sur l'écran recette, la ligne « Œuf entier … 3 œufs »
// séparait le nom de sa quantité de plus de 900 pt : sur un iPad posé sur le
// plan de travail, l'œil ne peut plus apparier les deux.

/**
 * Largeur (en points) à partir de laquelle on bascule en mise en page tablette.
 *
 * 700 et pas 768 : aucun iPhone ne l'atteint (le plus large, 16 Pro Max, fait
 * 440 pt en portrait, et l'app est portrait-only), tandis que le plus petit iPad
 * en portrait (mini, 744 pt) passe. Choisi AU-DESSUS de 507 pt volontairement :
 * c'est la largeur d'un Split View à 50 % sur iPad 11", qui doit continuer à
 * recevoir la mise en page téléphone.
 */
export const TABLET_MIN_WIDTH = 700;

/**
 * Largeur maximale d'une colonne de contenu.
 *
 * 620 est un point mesuré, pas un chiffre rond : avec les 20–24 pt de marge des
 * écrans et les 18 pt de padding des cartes, le texte courant (15 pt) tient sur
 * ~70 caractères — le haut de la fourchette lisible (45–75). À 680 on passait à
 * 79, au-delà de la fourchette ; à pleine largeur (1024) on était à 130.
 */
export const CONTENT_MAX_WIDTH = 620;

/**
 * Feuilles modales (`components/Sheet.tsx`, `components/ActionSheet.tsx`).
 *
 * ⚠️ 820 est dicté par une contrainte mesurée, pas par l'esthétique : c'est là
 * que vit l'écran recette, et son mode deux colonnes ne doit RENDRE AUCUNE
 * LIGNE PLUS À L'ÉTROIT QUE SUR TÉLÉPHONE. La référence est la largeur utile
 * d'un iPhone 15 (393 − 2 × 24 = 345 pt) ; l'ingrédient le plus long du
 * catalogue fait 37 caractères (« Lentilles cuites (conserve ou sachet) »),
 * soit ~278 px à 15 pt, plus sa quantité. À 760 pt de feuille, la colonne
 * ingrédients tombait à 316 pt — plus serrée que le téléphone, donc une
 * régression déguisée en amélioration. À 820, chaque colonne vaut 370 pt.
 */
export const SHEET_MAX_WIDTH = 820;

/**
 * Grille de recettes : deux colonnes de ~460 pt utiles, soit à peu près la
 * largeur d'une carte sur téléphone. Les cartes ne sont pas redessinées, elles
 * sont juste posées côte à côte.
 */
export const GRID_MAX_WIDTH = 980;

/** Nombre de colonnes de la grille de recettes pour une largeur donnée. */
export function gridColumns(width: number): number {
  return width >= TABLET_MIN_WIDTH ? 2 : 1;
}

export interface CenteredStyle {
  width?: '100%';
  maxWidth?: number;
  alignSelf?: 'center';
}

/**
 * Colonne centrée bornée à `max`.
 *
 * ⚠️ Renvoie un objet VIDE sous le seuil, et c'est le point important : sur
 * téléphone le style composé doit être un no-op strict, pour qu'aucun écran ne
 * bouge d'un pixel. Une contrainte « inoffensive » du genre `maxWidth: 620` sur
 * un iPhone en paysage suffirait à faire diverger le rendu.
 *
 * ⚠️ À poser sur un CONTENEUR quand l'élément s'aligne par `marginHorizontal` :
 * une marge s'ajoute à l'EXTÉRIEUR du `maxWidth`, et la barre de progression de
 * l'écran Courses dépassait alors des cartes de 40 pt.
 */
export function centered(width: number, max: number): CenteredStyle {
  if (width < TABLET_MIN_WIDTH) return {};
  return { width: '100%', maxWidth: max, alignSelf: 'center' };
}
