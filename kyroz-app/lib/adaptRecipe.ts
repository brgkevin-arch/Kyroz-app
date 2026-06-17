import { AdaptFlag, Goal, Ingredient, Macros, Recipe, SportSession, RecipeObjective, RecipeSport } from './types';
import { RECIPE_CONFIG, RECIPE_INGREDIENTS, macrosForRefIngredients } from './recipeData';

/**
 * Cible d'UN repas, en GRAMMES — fournie par le moteur de l'app (un seul cerveau
 * macro : `buildLocalPlan`/`rebalanceCore` répartissent les cibles du profil sur
 * les repas). adaptRecipe NE CALCULE AUCUNE CIBLE : il ajuste les quantités pour
 * atteindre ces grammes sans casser le plancher protéique.
 */
export interface AdaptTarget {
  kcalMeal: number;
  proteinMeal: number;
  carbMeal: number;
  fatMeal: number;
}
export interface AdaptResult {
  ingredients: Ingredient[]; // copie de recipe.ingredients avec quantity_g ajusté
  macros: Macros;
  flags: AdaptFlag[];
}

const per100 = (ref: string) => RECIPE_INGREDIENTS[ref]?.per100g ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
const proteinPer100 = (ref: string) => per100(ref).protein_g;
const roundStep = (q: number, step: number) => Math.max(0, Math.round(q / step) * step);

/** Bornes [min,max] d'un ingrédient = facteurs de rôle × qty de base, plafonné par abs_max_qty. */
function bounds(ing: Ingredient) {
  const fr = ing.macro_role ? RECIPE_CONFIG.scaling_factors_by_role[ing.macro_role] : undefined;
  if (!fr) return { min: ing.quantity_g, max: ing.quantity_g };
  let min = ing.quantity_g * fr[0];
  let max = ing.quantity_g * fr[1];
  const cap = ing.ref ? RECIPE_INGREDIENTS[ing.ref]?.abs_max_qty : undefined;
  if (cap != null) max = Math.min(max, cap);
  min = Math.max(5, min);
  return { min, max: Math.max(min, max) };
}

/**
 * Scaling par ingrédient vers une cible repas EN GRAMMES (kcal/protéines/glucides
 * /lipides), fournie par le moteur de l'app. Plancher protéique (`kp≥1`), légumes
 * /aromates fixes, glucides et lipides visés en grammes (pas de split/déficit :
 * les cibles viennent déjà du profil). Le reste des réglages vient de RECIPE_CONFIG.
 */
export function adaptRecipe(recipe: Recipe, target: AdaptTarget): AdaptResult {
  const cfg = RECIPE_CONFIG;
  const flags: AdaptFlag[] = [];
  const items = recipe.ingredients.map((i) => ({ ...i })); // copie mutable

  // Scaling par ingrédient possible UNIQUEMENT si TOUS les ingrédients sont liés à
  // la table (ref résoluble). Sinon — override perso (food_id sans ref), legacy, ou
  // recette MIXTE (un ingrédient custom sans ref) — `macrosForRefIngredients`
  // ignorerait l'ingrédient sans ref → macros sous-comptées. On rend alors la recette
  // telle quelle (macros de base, portions gérées par l'appelant via portions=1).
  if (!items.every((i) => i.ref && RECIPE_INGREDIENTS[i.ref])) {
    return { ingredients: items, macros: { ...recipe.macros_per_portion }, flags };
  }

  const out = new Map<Ingredient, number>(items.map((i) => [i, i.quantity_g]));

  // Buckets
  let anchors: Ingredient[] = [];
  let fills: Ingredient[] = [];
  const fixed: Ingredient[] = [];
  for (const ing of items) {
    const role = ing.macro_role;
    if (ing.scalable === false || role === 'vegetable' || role === 'flavor') fixed.push(ing);
    else if (role === 'protein') anchors.push(ing);
    else fills.push(ing); // carb, fat, fruit, dairy
  }
  if (anchors.length === 0) {
    const dairy = fills
      .filter((i) => i.macro_role === 'dairy')
      .sort((a, b) => proteinPer100(b.ref!) - proteinPer100(a.ref!))[0];
    if (dairy) { anchors.push(dairy); fills = fills.filter((i) => i !== dairy); }
    else flags.push('no_protein_anchor');
  }

  const macrosOf = (list: Ingredient[]) => macrosForRefIngredients(list.map((i) => ({ ref: i.ref!, qty: out.get(i)! })));

  // 1. Base fixe
  const fixedM = macrosForRefIngredients(fixed.map((i) => ({ ref: i.ref!, qty: i.quantity_g })));

  // 2. Ancrage protéique (plancher : kp ≥ 1 → on ne réduit jamais la protéine)
  const baseFillProtein = fills.reduce((s, i) => s + (proteinPer100(i.ref!) * i.quantity_g) / 100, 0);
  const baseAnchorProtein = anchors.reduce((s, i) => s + (proteinPer100(i.ref!) * i.quantity_g) / 100, 0);
  const targetAnchorProtein = target.proteinMeal - fixedM.protein_g - baseFillProtein;
  let kp = baseAnchorProtein > 0 ? targetAnchorProtein / baseAnchorProtein : 1;
  kp = Math.max(1.0, kp);
  for (const i of anchors) {
    const b = bounds(i);
    out.set(i, Math.min(Math.max(i.quantity_g * kp, b.min), b.max));
  }

  // 3. Viser carbMeal et fatMeal en GRAMMES (cibles fournies par le moteur). Chaque
  //    bucket est scalé pour combler le manque vs ce qu'apportent déjà les autres
  //    ingrédients (fixes + ancre + autre bucket) → glucides/lipides montent OU
  //    descendent vers la cible, sans heuristique de déficit (la cible la porte déjà).
  const carbBucket = fills.filter((i) => ['carb', 'fruit', 'dairy'].includes(i.macro_role as string));
  const fatBucket = fills.filter((i) => i.macro_role === 'fat');
  const scaleToMacro = (bucket: Ingredient[], key: 'carbs_g' | 'fat_g', targetTotal: number) => {
    const baseBucket = bucket.reduce((s, i) => s + (per100(i.ref!)[key] * i.quantity_g) / 100, 0);
    if (baseBucket <= 0) return;
    const bucketNow = bucket.reduce((s, i) => s + (per100(i.ref!)[key] * out.get(i)!) / 100, 0);
    const otherNow = macrosOf(items)[key] - bucketNow; // tout sauf ce bucket, au qty courant
    const need = Math.max(0, targetTotal - otherNow);
    const factor = need / baseBucket;
    for (const i of bucket) {
      const b = bounds(i);
      out.set(i, Math.min(Math.max(i.quantity_g * factor, b.min), b.max));
    }
  };
  scaleToMacro(carbBucket, 'carbs_g', target.carbMeal);
  scaleToMacro(fatBucket, 'fat_g', target.fatMeal);

  // 3.5 Récupération protéique (remonte les ancres dans leurs bornes si sous le plancher)
  const totalProtein = () => items.reduce((s, i) => s + (proteinPer100(i.ref!) * out.get(i)!) / 100, 0);
  if (anchors.length) {
    let need = target.proteinMeal - totalProtein();
    for (const i of anchors) {
      if (need <= 0) break;
      const b = bounds(i);
      const cur = out.get(i)!;
      const ppg = proteinPer100(i.ref!) / 100;
      if (ppg <= 0) continue;
      const addG = Math.min(b.max - cur, need / ppg);
      if (addG > 0) { out.set(i, cur + addG); need -= addG * ppg; }
    }
  }

  // 5. Arrondi + macros depuis les grammes (source de vérité)
  for (const i of items) i.quantity_g = roundStep(out.get(i)!, cfg.rounding_step_g);
  const m = macrosForRefIngredients(items.map((i) => ({ ref: i.ref!, qty: i.quantity_g })));
  const macros: Macros = {
    kcal: Math.round(m.kcal / 5) * 5,
    protein_g: Math.round(m.protein_g),
    carbs_g: Math.round(m.carbs_g),
    fat_g: Math.round(m.fat_g),
  };

  if (macros.protein_g < target.proteinMeal * cfg.protein_floor_tolerance) flags.push('protein_below_target');
  if (macros.kcal > target.kcalMeal * 1.12) flags.push('over_target_kcal');
  if (macros.kcal < target.kcalMeal * 0.88) flags.push('under_target_kcal');
  if (target.fatMeal > 0 && macros.fat_g < target.fatMeal * 0.85) flags.push('fat_below_target');
  if (target.carbMeal > 0 && macros.carbs_g < target.carbMeal * 0.85) flags.push('carbs_below_target');

  return { ingredients: items, macros, flags };
}

// ── Mappings « besoin » (soft-matching) ──────────────────────────────────────
export function goalToObjectives(goal: Goal): RecipeObjective[] {
  switch (goal) {
    case 'cut_aggressive': case 'cut': return ['cut'];
    case 'recomp': return ['cut', 'maintain'];
    case 'maintain': return ['maintain'];
    case 'lean_bulk': case 'bulk': return ['bulk'];
  }
}

export function sportsToBuckets(sports: SportSession[] | undefined): RecipeSport[] {
  const set = new Set<RecipeSport>();
  for (const s of sports ?? []) {
    switch (s.type) {
      case 'musculation': set.add('muscu'); break;
      case 'sports_combat': set.add('combats'); break;
      case 'hiit_crossfit': set.add('muscu'); set.add('endurance'); break;
      default: set.add('endurance'); // course, velo, natation, marche, foot, basket, tennis
    }
  }
  return [...set];
}

/** Score de correspondance besoin : +1 objectif, +1 sport. 0 si pas de tags (neutre). */
export function needMatch(recipe: Recipe, objectives: RecipeObjective[], sportBuckets: RecipeSport[]): number {
  let n = 0;
  if (recipe.objectives?.some((o) => objectives.includes(o))) n += 1;
  if (recipe.sports?.some((s) => sportBuckets.includes(s))) n += 1;
  return n;
}
