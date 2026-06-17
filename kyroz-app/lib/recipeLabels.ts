import { RecipeObjective, RecipeSport } from './types';

// Libellés FR des tags « besoin » (objectif/sport) — partagés par la fiche repas
// et la liste des recettes (DRY).
export const OBJ_LABEL: Record<RecipeObjective, string> = {
  cut: 'Perte de gras', maintain: 'Maintien', bulk: 'Prise de masse',
};
export const SPORT_LABEL: Record<RecipeSport, string> = {
  muscu: 'Muscu', endurance: 'Endurance', combats: 'Combats',
};
