// ── « J'aime pas » (👎) → préférence d'ingrédient ───────────────────────────
// Le 👎 masque une recette (hidden_recipes) sans rien bannir définitivement.
// Quand l'utilisateur en masque trop et que son pool de recettes (pour un repas,
// régime respecté) descend sous le seuil, l'UI lui demande QUEL ingrédient le
// gêne vraiment : on l'ajoute à `disliked_foods` (filtre dur, déjà en place) et
// on ré-affiche les plats masqués qui ne le contiennent pas (« il peut les aimer »).
//
// Le déclenchement (mealPoolSize < seuil) vit dans planEngine ; ici on gère la
// PROPOSITION d'ingrédients (extraite des recettes masquées) et le test de présence.

import { Recipe, UserProfile } from './types';
import { getRecipeById } from './recipes';

// Sous ce nb de recettes proposables pour un repas, on demande l'ingrédient.
export const DISLIKE_THRESHOLD = 3;

// Mots-clés candidats à proposer (protéines, féculents, légumes fréquents).
// `kw` est écrit tel quel dans disliked_foods (filtre par sous-chaîne, cf.
// planEngine.recipeAllowed) ; `label` est l'affichage. Minuscule + sans piège
// d'accent : on cible la racine (« lentille » matche « lentilles corail »).
export const DISLIKE_KEYWORDS: { label: string; kw: string }[] = [
  { label: 'Tofu', kw: 'tofu' },
  { label: 'Saumon', kw: 'saumon' },
  { label: 'Thon', kw: 'thon' },
  { label: 'Œufs', kw: 'œuf' },
  { label: 'Poulet', kw: 'poulet' },
  { label: 'Bœuf', kw: 'bœuf' },
  { label: 'Lentilles', kw: 'lentille' },
  { label: 'Pois chiches', kw: 'pois chiche' },
  { label: 'Haricots', kw: 'haricot' },
  { label: 'Brocolis', kw: 'brocolis' },
  { label: 'Champignons', kw: 'champignon' },
  { label: 'Avocat', kw: 'avocat' },
  { label: 'Quinoa', kw: 'quinoa' },
  { label: 'Patate douce', kw: 'patate douce' },
  { label: 'Courgette', kw: 'courgette' },
  { label: 'Épinards', kw: 'épinard' },
  { label: 'Fromage blanc', kw: 'fromage blanc' },
  { label: 'Skyr', kw: 'skyr' },
  { label: "Flocons d'avoine", kw: 'avoine' },
  { label: 'Riz', kw: 'riz' },
];

function recipeText(r: Recipe): string {
  return r.ingredients.map((i) => i.name.toLowerCase()).join(' ');
}

/** Une recette contient-elle ce mot-clé d'ingrédient ? */
export function recipeHasKeyword(r: Recipe, kw: string): boolean {
  return recipeText(r).includes(kw.toLowerCase());
}

/**
 * Ingrédients à proposer quand on demande « c'est quoi qui te gêne ? » : les
 * mots-clés présents dans les recettes MASQUÉES de l'utilisateur, triés par
 * fréquence (le plus récurrent d'abord), en excluant ceux déjà évités. Top `limit`.
 * Vide → on n'a rien de pertinent à proposer (on laisse le moteur ré-afficher).
 */
export function dislikeCandidates(profile: UserProfile, limit = 4): { label: string; kw: string; count: number }[] {
  const hidden = profile.hidden_recipes ?? [];
  if (hidden.length === 0) return [];
  const already = new Set((profile.disliked_foods ?? []).map((d) => d.toLowerCase()));
  const recipes = hidden
    .map((id) => getRecipeById(id))
    .filter((r): r is Recipe => !!r);
  return DISLIKE_KEYWORDS
    .filter((k) => !already.has(k.kw))
    .map((k) => ({ ...k, count: recipes.filter((r) => recipeHasKeyword(r, k.kw)).length }))
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Applique « je n'aime pas l'ingrédient `kw` » : l'ajoute aux aliments évités, et
 * ré-affiche (retire de hidden_recipes) les plats masqués qui NE le contiennent PAS
 * — ceux-là, l'user peut les aimer. Les plats masqués qui le contiennent restent
 * masqués (de toute façon désormais filtrés par disliked_foods). Renvoie le profil
 * mis à jour (à passer à saveProfile → régénère le plan via la signature).
 */
export function applyDislikedIngredient(profile: UserProfile, kw: string): UserProfile {
  const key = kw.trim().toLowerCase();
  const disliked_foods = profile.disliked_foods.some((d) => d.toLowerCase() === key)
    ? profile.disliked_foods
    : [...profile.disliked_foods, key];
  const hidden_recipes = (profile.hidden_recipes ?? []).filter((id) => {
    const r = getRecipeById(id);
    return r ? recipeHasKeyword(r, key) : false; // contient l'ingrédient → reste masqué ; sinon → revient
  });
  return { ...profile, disliked_foods, hidden_recipes };
}
