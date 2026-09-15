import { recipeAllowed } from './planEngine';
import type { Recipe, UserProfile } from './types';

/**
 * L'ORDRE DU CATALOGUE : CE QU'ON MANGE D'ABORD, LE RESTE ENSUITE (décision fondateur du 2026-09-15).
 *
 * « Le catalogue devrait montrer en priorité les recettes avec les aliments qu'on mange et pas
 * ceux qu'on refuse de voir, sans pour autant les rendre invisibles. » Le même jour, le filtre
 * avait été écarté : « si la personne veut voir une recette au tofu, elle fait ce qu'elle veut ».
 * Les deux tiennent ensemble — rien ne disparaît, tout se RANGE.
 *
 * « Ce qu'on mange » = ce que le plan a le droit de servir, `recipeAllowed` : le régime coché,
 * les aliments à éviter, et le tofu retiré à l'omnivore (D35). Un seul prédicat pour le plan,
 * la liste « Réalisable » et cet ordre : deux définitions finiraient par se contredire.
 *
 * ⚠️ Le tri est STABLE : dans chaque groupe, les recettes gardent l'ordre du catalogue.
 * ⚠️ Rien n'est retiré — le compteur de l'écran annonce toujours tout ce qui existe.
 */
export function ordreCatalogue(recipes: readonly Recipe[], profile: UserProfile | null | undefined): Recipe[] {
  if (!profile) return [...recipes];
  const servables: Recipe[] = [];
  const autres: Recipe[] = [];
  for (const r of recipes) (recipeAllowed(r, profile) ? servables : autres).push(r);
  return [...servables, ...autres];
}
