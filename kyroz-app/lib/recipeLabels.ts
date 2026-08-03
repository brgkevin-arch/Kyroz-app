import { RecipeObjective } from './types';

// Libellé FR du tag « objectif » — partagé par la fiche repas et la liste des
// recettes (DRY). Il est MÉCANIQUE : déduit des kcal de base de la recette et
// vérifié sur les 512 par `lib/__tests__/tags.test.ts`. Ce qui est affiché ici
// est donc vrai par construction.
export const OBJ_LABEL: Record<RecipeObjective, string> = {
  cut: 'Perte de gras', maintain: 'Maintien', bulk: 'Prise de masse',
};

// ⚠️ `SPORT_LABEL` (côté RECETTE) a été SUPPRIMÉ le 2026-08-03. `Recipe.sports` existe
// toujours et sert de DIVERSIFIEUR au départage (`needMatch`, lib/adaptRecipe.ts) — mais
// il n'est plus MONTRÉ, parce qu'il n'était pas vrai : 105 recettes affichaient
// « Endurance » sans remplir la règle des 55 % de glucides du §5 du brief. Le rendre
// exact était mesurable et coûtait cher — poser « muscu » partout rend le départage
// constant donc inerte, et faisait passer les drapeaux bloquants de 0 à 5 (fiche D22).
// ➡️ Décision du fondateur : on retire l'affichage, on garde le mécanisme. Un tag qu'on
// ne montre pas n'a pas à être une promesse. Verrouillé par `tags.test.ts`.
// (`SPORT_LABEL` de `lib/sport.ts` est un AUTRE libellé — les sports du PROFIL — et reste.)
