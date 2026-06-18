/**
 * Kyroz — Adaptation de recettes (option 2 : scaling ciblé macro)  v2 — découplé
 * ---------------------------------------------------------------------------
 * adaptRecipe NE CALCULE AUCUNE CIBLE. Il consomme une cible repas déjà produite
 * par TON moteur macro (Katch-McArdle %MG, TDEE par sport, 6 objectifs, mode percent)
 * et répond à une seule question : « avec les ingrédients de CETTE recette, quelles
 * quantités pour atteindre ces macros sans casser le plancher protéique ? »
 *
 * Un seul cerveau macro = ton moteur. Ici, zéro objective_profiles, zéro calcul de
 * TDEE, zéro split par objectif : on reçoit kcal/protein/carbs/fat en grammes.
 *
 * Données : recettes-kyroz-100.json
 *   ref = db.ingredients_reference   |   cfg = db.config (utilise scaling_factors_by_role,
 *   rounding_step_g, protein_floor_tolerance ; ignore objective_profiles/meal_weights)
 */

// ----------------------------------------------------------------- Types
export type MacroRole = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit' | 'flavor';
export interface Macros { kcal: number; protein: number; carbs: number; fat: number; }

export interface IngredientRef { name: string; unit: 'g' | 'ml'; basis?: 'dry' | 'raw'; per_100: Macros; abs_max_qty?: number; }
export type IngredientsRef = Record<string, IngredientRef>;

export interface RecipeIngredient { ref: string; qty: number; macro_role: MacroRole; scalable: boolean; }
export interface Recipe { id: string; name: string; category: string; base_servings: number; ingredients: RecipeIngredient[]; macros_per_serving: Macros; }

export interface Config {
  scaling_factors_by_role: Record<string, [number, number]>;
  rounding_step_g: number;
  protein_floor_tolerance: number;
  // objective_profiles / meal_weights : présents dans le JSON mais NON lus ici (fallback app).
}

/** Cible d'UN repas, en grammes — fournie par le moteur de l'app. */
export interface MealTarget { kcalMeal: number; proteinMeal: number; carbMeal: number; fatMeal: number; }

export type AdaptFlag =
  | 'protein_below_target'   // ↑ ajouter un side protéiné ou changer de recette
  | 'over_target_kcal'       // ↓ portion plus petite / autre recette
  | 'under_target_kcal'      // ↑ side / recette plus dense
  | 'fat_below_target'       // recette trop pauvre en gras pour cette cible (→ sélection)
  | 'carbs_below_target'     // recette trop pauvre en glucides pour cette cible (→ sélection)
  | 'no_protein_anchor';     // aucune ancre protéique trouvée

/**
 * Public de chaque flag — évite d'afficher des flags techniques à l'utilisateur.
 *  'user'      → afficher sur la fiche (actionnable par la personne)
 *  'selection' → signal pour le pré-filtre macroFit ; ne pas alarmer l'user
 *  'dev'       → bug de données ; logguer, ne doit jamais atteindre la prod
 */
export const FLAG_AUDIENCE: Record<AdaptFlag, 'user' | 'selection' | 'dev'> = {
  protein_below_target: 'user',
  under_target_kcal: 'user',
  over_target_kcal: 'user',
  fat_below_target: 'selection',
  carbs_below_target: 'selection',
  no_protein_anchor: 'dev',
};

export interface AdaptResult {
  id: string;
  ingredients: { ref: string; qty: number }[];
  macros: Macros;
  target: { kcal: number; protein: number; carbs: number; fat: number };
  /** atteint − cible (signé). Négatif = il manque ce nombre. Ex. gap.protein = -8 → 8 g sous la cible. */
  gap: { kcal: number; protein: number; carbs: number; fat: number };
  flags: AdaptFlag[];
}

// --------------------------------------------------------------- Helpers
function macrosFor(items: { ref: string; qty: number }[], ref: IngredientsRef): Macros {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const { ref: r, qty } of items) {
    const m = ref[r].per_100;
    kcal += (m.kcal * qty) / 100; protein += (m.protein * qty) / 100;
    carbs += (m.carbs * qty) / 100; fat += (m.fat * qty) / 100;
  }
  return { kcal, protein, carbs, fat };
}
const roundStep = (q: number, s: number) => Math.max(0, Math.round(q / s) * s);

function bounds(ing: RecipeIngredient, ref: IngredientsRef, cfg: Config) {
  const fr = cfg.scaling_factors_by_role[ing.macro_role];
  if (!fr) return { min: ing.qty, max: ing.qty };
  let min = Math.max(5, ing.qty * fr[0]);
  let max = ing.qty * fr[1];
  const cap = ref[ing.ref].abs_max_qty;
  if (cap != null) max = Math.min(max, cap);
  return { min, max: Math.max(min, max) };
}

// --------------------------------------------------------- Cœur : adaptRecipe
export function adaptRecipe(recipe: Recipe, target: MealTarget, ref: IngredientsRef, cfg: Config): AdaptResult {
  const flags: AdaptFlag[] = [];
  const per100 = (r: string) => ref[r].per_100;
  const out = new Map<RecipeIngredient, number>(recipe.ingredients.map((i) => [i, i.qty]));
  const allItems = () => recipe.ingredients.map((i) => ({ ref: i.ref, qty: out.get(i)! }));

  // -- classification --
  let anchors: RecipeIngredient[] = [];
  let fills: RecipeIngredient[] = [];
  const fixed: RecipeIngredient[] = [];
  for (const ing of recipe.ingredients) {
    const role = ing.macro_role;
    if (ing.scalable === false || role === 'vegetable' || role === 'flavor') fixed.push(ing);
    else if (role === 'protein') anchors.push(ing);
    else fills.push(ing); // carb, fat, fruit, dairy
  }
  if (anchors.length === 0) {
    const d = fills.filter((i) => i.macro_role === 'dairy').sort((a, b) => per100(b.ref).protein - per100(a.ref).protein)[0];
    if (d) { anchors.push(d); fills = fills.filter((i) => i !== d); } else flags.push('no_protein_anchor');
  }

  // step1 : macros fixes (légumes, aromates)
  const fixedM = macrosFor(fixed.map((i) => ({ ref: i.ref, qty: i.qty })), ref);

  // step2 : plancher protéique (facteur >= 1.0, on ne réduit jamais la protéine)
  const baseFillP = fills.reduce((s, i) => s + (per100(i.ref).protein * i.qty) / 100, 0);
  const baseAnchP = anchors.reduce((s, i) => s + (per100(i.ref).protein * i.qty) / 100, 0);
  let kp = baseAnchP > 0 ? (target.proteinMeal - fixedM.protein - baseFillP) / baseAnchP : 1;
  kp = Math.max(1.0, kp);
  for (const i of anchors) { const b = bounds(i, ref, cfg); out.set(i, Math.min(Math.max(i.qty * kp, b.min), b.max)); }

  // step4 : viser carbMeal et fatMeal en GRAMMES (pas de split objectif, pas d'heuristique déficit)
  const carbBucket = fills.filter((i) => ['carb', 'fruit', 'dairy'].includes(i.macro_role));
  const fatBucket = fills.filter((i) => i.macro_role === 'fat');
  const scaleToMacro = (bucket: RecipeIngredient[], key: keyof Macros, targetTotal: number) => {
    const baseBucket = bucket.reduce((s, i) => s + (per100(i.ref)[key] * i.qty) / 100, 0);
    if (baseBucket <= 0) return;
    const otherNow = macrosFor(allItems(), ref)[key] - baseBucket; // tout sauf ce bucket, au qty courant
    const need = Math.max(0, targetTotal - otherNow);
    const factor = need / baseBucket;
    for (const i of bucket) { const b = bounds(i, ref, cfg); out.set(i, Math.min(Math.max(i.qty * factor, b.min), b.max)); }
  };
  scaleToMacro(carbBucket, 'carbs', target.carbMeal);
  scaleToMacro(fatBucket, 'fat', target.fatMeal);

  // step4.5 : récupération protéique (le scaling des fills a pu faire dériver la protéine)
  const totalP = () => recipe.ingredients.reduce((s, i) => s + (per100(i.ref).protein * out.get(i)!) / 100, 0);
  if (anchors.length) {
    let need = target.proteinMeal - totalP();
    for (const i of anchors) {
      if (need <= 0) break;
      const b = bounds(i, ref, cfg); const cur = out.get(i)!; const ppg = per100(i.ref).protein / 100;
      if (ppg <= 0) continue;
      const add = Math.min(b.max - cur, need / ppg);
      if (add > 0) { out.set(i, cur + add); need -= add * ppg; }
    }
  }

  // step5 : arrondi + recalcul depuis les grammes (source de vérité)
  const finalItems = recipe.ingredients.map((i) => ({ ref: i.ref, qty: roundStep(out.get(i)!, cfg.rounding_step_g) }));
  const m = macrosFor(finalItems, ref);
  const macros: Macros = { kcal: Math.round(m.kcal / 5) * 5, protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat) };

  if (macros.protein < target.proteinMeal * cfg.protein_floor_tolerance) flags.push('protein_below_target');
  if (macros.kcal > target.kcalMeal * 1.12) flags.push('over_target_kcal');
  if (macros.kcal < target.kcalMeal * 0.88) flags.push('under_target_kcal');
  if (macros.fat < target.fatMeal * 0.85) flags.push('fat_below_target');
  if (macros.carbs < target.carbMeal * 0.85) flags.push('carbs_below_target');

  const tgt = { kcal: Math.round(target.kcalMeal), protein: Math.round(target.proteinMeal), carbs: Math.round(target.carbMeal), fat: Math.round(target.fatMeal) };
  return {
    id: recipe.id,
    ingredients: finalItems,
    macros,
    target: tgt,
    gap: { kcal: macros.kcal - tgt.kcal, protein: macros.protein - tgt.protein, carbs: macros.carbs - tgt.carbs, fat: macros.fat - tgt.fat },
    flags,
  };
}

// --------------------------------------------------- planDay : report de budget
/**
 * Répartit une cible JOUR (fournie par le moteur app) sur les repas réellement choisis,
 * en reportant le budget restant de repas en repas → le TOTAL du jour reste serré même
 * quand une recette tape une borne. `weight` vient de ton computeDistribution (normalisé).
 */
export interface DayTarget extends Macros {}
export interface MealPlanItem { recipe: Recipe; weight: number; }

export function planDay(dayTarget: DayTarget, chosen: MealPlanItem[], ref: IngredientsRef, cfg: Config): AdaptResult[] {
  const rem: Macros = { ...dayTarget };
  let wLeft = chosen.reduce((s, c) => s + c.weight, 0);
  const results: AdaptResult[] = [];
  for (const { recipe, weight } of chosen) {
    const share = wLeft > 0 ? weight / wLeft : 0;
    const mt: MealTarget = { kcalMeal: rem.kcal * share, proteinMeal: rem.protein * share, carbMeal: rem.carbs * share, fatMeal: rem.fat * share };
    const res = adaptRecipe(recipe, mt, ref, cfg);
    results.push(res);
    rem.kcal -= res.macros.kcal; rem.protein -= res.macros.protein; rem.carbs -= res.macros.carbs; rem.fat -= res.macros.fat;
    wLeft -= weight;
  }
  return results;
}
