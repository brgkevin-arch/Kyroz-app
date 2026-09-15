import { recipeAllowed } from './planEngine';
import type { Recipe, UserProfile } from './types';

/**
 * LE CATALOGUE : CE QU'ON MANGE D'ABORD, LE RESTE DERRIÈRE UN BOUTON (décisions fondateur du 2026-09-15).
 *
 * D38 : « le catalogue devrait montrer en priorité les recettes avec les aliments qu'on mange et
 * pas ceux qu'on refuse de voir, sans pour autant les rendre invisibles ». Le même jour, le filtre
 * avait été écarté : « si la personne veut voir une recette au tofu, elle fait ce qu'elle veut ».
 * D39, le même jour encore : ranger ne suffisait pas — dès qu'une recherche trouve peu de
 * recettes compatibles, les autres arrivaient juste derrière, sans rien qui le dise. La liste
 * s'arrête donc au bout des compatibles, et un bouton « Voir les N recettes hors de tes
 * préférences » ouvre le reste. Rien n'est supprimé : tout s'ouvre d'un tap, sur demande.
 *
 * « Ce qu'on mange » = ce que le plan a le droit de servir, `recipeAllowed` : le régime coché,
 * les aliments à éviter, et le tofu retiré à l'omnivore (D35). Un seul prédicat pour le plan,
 * la liste « Réalisable » et le Catalogue : deux définitions finiraient par se contredire.
 *
 * ⚠️ Le partage est STABLE : dans chaque groupe, les recettes gardent l'ordre du catalogue.
 * ⚠️ Sans profil, tout est compatible : on ne cache rien sur une information absente.
 */
export function partagerCatalogue(
  recipes: readonly Recipe[],
  profile: UserProfile | null | undefined,
): { servables: Recipe[]; autres: Recipe[] } {
  if (!profile) return { servables: [...recipes], autres: [] };
  const servables: Recipe[] = [];
  const autres: Recipe[] = [];
  for (const r of recipes) (recipeAllowed(r, profile) ? servables : autres).push(r);
  return { servables, autres };
}

/** Le bouton de fin de liste. Vide quand il n'y a rien derrière : pas de bouton qui n'ouvre rien. */
export function libelleAutres(n: number): string {
  if (n <= 0) return '';
  return n === 1 ? 'Voir la recette hors de tes préférences' : `Voir les ${n} recettes hors de tes préférences`;
}
