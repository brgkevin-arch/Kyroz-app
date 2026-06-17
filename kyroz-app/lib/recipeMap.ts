import { Recipe, RecipeObjective, MealType } from './types';
import { RAW_RECIPES, RECIPE_INGREDIENTS, ObjectiveFr } from './recipeData';
import { restrictionsOkFor } from './recipeDiet';

const OBJ_FR_TO_INTERNAL: Record<ObjectiveFr, RecipeObjective> = {
  perte_de_gras: 'cut', maintien: 'maintain', prise_de_masse: 'bulk',
};
const CATEGORY_TO_TAGS: Record<string, MealType[]> = {
  petit_dej: ['breakfast'], collation: ['snack'], repas_complet: ['lunch', 'dinner'],
};

export const RECIPES: Recipe[] = RAW_RECIPES.map((raw) => {
  const ingredients = raw.ingredients.map((i) => ({
    name: RECIPE_INGREDIENTS[i.ref]?.name ?? i.ref,
    quantity_g: i.qty,
    unit: RECIPE_INGREDIENTS[i.ref]?.unit ?? 'g',
    ref: i.ref,
    macro_role: i.macro_role,
    scalable: i.scalable,
  }));
  return {
    id: raw.id,
    name_fr: raw.name,
    prep_time_min: raw.tags.temps_min,
    portions: raw.base_servings,
    macros_per_portion: {
      kcal: raw.macros_per_serving.kcal,
      protein_g: raw.macros_per_serving.protein,
      carbs_g: raw.macros_per_serving.carbs,
      fat_g: raw.macros_per_serving.fat,
    },
    ingredients,
    steps: raw.instructions,
    tags: CATEGORY_TO_TAGS[raw.category] ?? [],
    restrictions_ok: restrictionsOkFor(ingredients.map((i) => i.ref)),
    objectives: raw.tags.objectif.map((o) => OBJ_FR_TO_INTERNAL[o]),
    sports: raw.tags.sport,
    rest_day_ok: raw.tags.recup_jour_repos,
    why_fr: raw.why,
    recomp_flag: raw.recomp_flag,
    validated_by_dietitian: false,
  };
});
