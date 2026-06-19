import { describe, it, expect, afterEach } from 'vitest';
import { buildLocalPlan, swapMeal, mealPoolSize } from '../planEngine';
import { RECIPES, setRecipeOverrides } from '../recipes';
import { recipeHasKeyword, dislikeCandidates, applyDislikedIngredient } from '../dislike';
import { makeProfile } from './helpers';

afterEach(() => setRecipeOverrides({}));

// Recettes « midi » faisables avec le profil de test (prépa ≤ 30 min, sans régime).
const lunchIds = () => RECIPES.filter((r) => r.tags.includes('lunch') && r.prep_time_min <= 30).map((r) => r.id);

describe('hidden_recipes (👎) — masquage souple', () => {
  it('un plan ne propose jamais une recette masquée', () => {
    const base = buildLocalPlan(makeProfile(), 0);
    const hiddenId = base.meals[0].recipe.id;
    const plan = buildLocalPlan(makeProfile({ hidden_recipes: [hiddenId] }), 0);
    expect(plan.meals.every((m) => m.recipe.id !== hiddenId)).toBe(true);
    // le plan reste complet (le repas est remplacé, pas vidé)
    expect(plan.meals).toHaveLength(base.meals.length);
  });

  it('mealPoolSize retire exactement les recettes masquées de ce repas', () => {
    const before = mealPoolSize(makeProfile(), 'lunch');
    const oneId = lunchIds()[0];
    const after = mealPoolSize(makeProfile({ hidden_recipes: [oneId] }), 'lunch');
    expect(after).toBe(before - 1);
  });

  it('swapMeal ne tombe jamais sur une recette masquée', () => {
    const plan = buildLocalPlan(makeProfile(), 0);
    const meal = plan.meals.find((m) => m.meal_type === 'lunch')!;
    const ids = lunchIds();
    // on ne laisse qu'UNE alternative possible (≠ courante) → le swap DOIT tomber dessus
    const keep = ids.find((id) => id !== meal.recipe.id)!;
    const hidden = ids.filter((id) => id !== keep && id !== meal.recipe.id);
    const next = swapMeal(makeProfile({ hidden_recipes: hidden }), plan, meal);
    expect(next.meals.find((m) => m.id === meal.id)!.recipe.id).toBe(keep);
  });
});

describe('biais favoris (👍) au swap', () => {
  it('un favori présent dans le top est privilégié', () => {
    const plan = buildLocalPlan(makeProfile(), 0);
    const meal = plan.meals.find((m) => m.meal_type === 'lunch')!;
    const ids = lunchIds().filter((id) => id !== meal.recipe.id);
    const [a, b] = ids; // exactement 2 alternatives → toutes deux dans le top (VARIANT_MIN=4)
    const hidden = ids.filter((id) => id !== a && id !== b);
    const next = swapMeal(makeProfile({ hidden_recipes: hidden }), plan, meal, [a]);
    expect(next.meals.find((m) => m.id === meal.id)!.recipe.id).toBe(a);
  });
});

describe('régime = mur dur (jamais relâché par les 👎)', () => {
  it('un végétarien ne voit jamais de viande/poisson, même en masquant des recettes', () => {
    const p0 = makeProfile({ dietary_restrictions: ['vegetarian'] });
    const hidden = buildLocalPlan(p0, 0).meals.slice(0, 4).map((m) => m.recipe.id);
    const plan = buildLocalPlan(makeProfile({ dietary_restrictions: ['vegetarian'], hidden_recipes: hidden }), 0);
    const banned = ['poulet', 'bœuf', 'boeuf', 'steak', 'saumon', 'thon', 'cabillaud', 'crevette', 'jambon', 'dinde', 'porc'];
    for (const m of plan.meals) {
      const text = m.recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
      for (const b of banned) expect(text.includes(b), `${m.recipe.name_fr} contient ${b}`).toBe(false);
    }
  });
});

describe('élicitation d’ingrédient (lib/dislike)', () => {
  it('recipeHasKeyword détecte la présence d’un ingrédient', () => {
    const chicken = RECIPES.find((r) => recipeHasKeyword(r, 'poulet'));
    expect(chicken).toBeDefined();
    expect(recipeHasKeyword(chicken!, 'ingredient-qui-nexiste-pas')).toBe(false);
  });

  it('dislikeCandidates remonte les ingrédients récurrents des recettes masquées', () => {
    const chickenIds = RECIPES.filter((r) => recipeHasKeyword(r, 'poulet')).slice(0, 3).map((r) => r.id);
    expect(chickenIds.length).toBeGreaterThan(0);
    const cands = dislikeCandidates(makeProfile({ hidden_recipes: chickenIds }));
    expect(cands.some((c) => c.kw === 'poulet')).toBe(true);
    // un ingrédient déjà évité n'est plus proposé
    const cands2 = dislikeCandidates(makeProfile({ hidden_recipes: chickenIds, disliked_foods: ['poulet'] }));
    expect(cands2.some((c) => c.kw === 'poulet')).toBe(false);
  });

  it('applyDislikedIngredient évite l’ingrédient ET ré-affiche les plats sans lui', () => {
    const withKw = RECIPES.find((r) => recipeHasKeyword(r, 'poulet'))!;
    const without = RECIPES.find((r) => !recipeHasKeyword(r, 'poulet'))!;
    const p = makeProfile({ hidden_recipes: [withKw.id, without.id] });
    const next = applyDislikedIngredient(p, 'poulet');
    expect(next.disliked_foods).toContain('poulet');
    expect(next.hidden_recipes).toContain(withKw.id);      // contient l'ingrédient → reste masqué
    expect(next.hidden_recipes).not.toContain(without.id);  // ne le contient pas → revient
  });

  it('n’ajoute pas deux fois le même ingrédient évité', () => {
    const p = makeProfile({ disliked_foods: ['poulet'], hidden_recipes: [] });
    expect(applyDislikedIngredient(p, 'Poulet').disliked_foods.filter((d) => d === 'poulet')).toHaveLength(1);
  });
});
