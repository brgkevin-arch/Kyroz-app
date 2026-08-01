import { useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import {
  TABLET_MIN_WIDTH, CONTENT_MAX_WIDTH, SHEET_MAX_WIDTH, GRID_MAX_WIDTH,
  centered, gridColumns,
} from '../lib/layout';

// ── Mise en page tablette — le hook, côté React Native ───────────────────────
//
// Les SEUILS et leur justification vivent dans `lib/layout.ts` (logique pure,
// verrouillée par `lib/__tests__/layout.test.ts`). Ici, uniquement le câblage.
//
// Ce module ne fait volontairement qu'une chose : une colonne centrée. Pas de
// split view, pas de navigation à deux panneaux — ces chantiers-là se décident,
// ils ne se déduisent pas d'un breakpoint (CLAUDE.md §5 : la solution la plus
// simple qui marche).

export {
  TABLET_MIN_WIDTH, CONTENT_MAX_WIDTH, SHEET_MAX_WIDTH, GRID_MAX_WIDTH, centered,
};

export interface LayoutInfo {
  width: number;
  height: number;
  /** `true` dès `TABLET_MIN_WIDTH`. À utiliser pour TOUT choix de mise en page. */
  isTablet: boolean;
  /** Colonne de contenu centrée — à composer dans un `contentContainerStyle`. */
  content: ViewStyle;
  /** Même colonne, pour les en-têtes et pieds FIXES (hors ScrollView) : sans
   *  elle, le titre reste collé à gauche pendant que le contenu se centre. */
  header: ViewStyle;
  /** Colonne large des feuilles modales. */
  sheet: ViewStyle;
  /** Grille de recettes. */
  grid: ViewStyle;
  /** Nombre de colonnes de la grille de recettes (1 sur téléphone). */
  columns: number;
}

/**
 * Hook de mise en page.
 *
 * ⚠️ Il lit `useWindowDimensions()` et NON `Dimensions.get()` : sur iPad la
 * fenêtre change de taille sans relancer l'app (rotation, Split View, Slide
 * Over), et une valeur lue une fois au chargement du module reste fausse
 * jusqu'au prochain démarrage. Trois lectures de `Dimensions.get` traînaient
 * dans le code (Sheet, GuidedTour, WeightCheckin) — toutes converties.
 */
export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= TABLET_MIN_WIDTH,
    content: centered(width, CONTENT_MAX_WIDTH),
    header: centered(width, CONTENT_MAX_WIDTH),
    sheet: centered(width, SHEET_MAX_WIDTH),
    grid: centered(width, GRID_MAX_WIDTH),
    columns: gridColumns(width),
  };
}
