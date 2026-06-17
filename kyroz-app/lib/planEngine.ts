import { AdaptFlag, DietaryRestriction, Ingredient, Macros, Meal, MEAL_ORDER, MealEmphasis, MealPlan, MealStatus, MealType, Recipe, RecipeObjective, RecipeSport, UserProfile, VarietyPreference } from './types';
import { getEffectiveRecipes } from './recipes';
import { recipeFiberPerPortion, isFiberFocusGoal } from './fiber';
import { remainingMeals, MEAL_LABEL } from './mealtime';
import { adaptRecipe, AdaptTarget, goalToObjectives, sportsToBuckets, needMatch } from './adaptRecipe';

// ── Moteur de génération de plan local ──────────────────────────────────────
// Respecte : nombre de jours, repas/jour, variété, préférences alimentaires.
// Instantané (< 1s), déterministe. Générateur principal en mode gratuit.
//
// Précision macro : on vise SIMULTANÉMENT la cible kcal ET la cible protéines
// du profil. Mettre seulement les portions à l'échelle des kcal fait déborder
// les protéines (recettes fitness denses en protéines). On choisit donc, pour
// chaque repas, le couple (recette, portion) qui minimise un écart relatif
// pondéré aux deux cibles, avec un budget kcal/protéines reporté de repas en
// repas (auto-correction du total du jour).

// MEAL_ORDER (ordre canonique des repas) est importé depuis ./types.

// Poids relatifs de base (avant normalisation) : la collation reste légère,
// les repas principaux plus consistants. Approche les anciennes distributions.
const BASE_WEIGHT: Record<MealType, number> = {
  breakfast: 0.9, lunch: 1.1, dinner: 1.0, snack: 0.45,
};
// Multiplicateur appliqué au repas mis en avant (« gros midi/soir/matin »).
const EMPHASIS_BOOST = 1.7;

/**
 * Répartition normalisée (somme = 1) des calories/protéines par repas, calculée
 * dynamiquement à partir des repas choisis et de l'emphase. Remplace les
 * distributions fixes 3/4 repas : gère n'importe quel sous-ensemble de repas.
 */
export function computeDistribution(meals: MealType[], emphasis: MealEmphasis): Record<MealType, number> {
  const dist: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  const active = MEAL_ORDER.filter((m) => meals.includes(m));
  // L'appelant garantit meals non vide (buildLocalPlan a un repli) ; si vide, on
  // renvoie une distribution nulle plutôt que de diviser par zéro.
  if (active.length === 0) return dist;

  const raw: Record<string, number> = {};
  let total = 0;
  for (const m of active) {
    let w = BASE_WEIGHT[m];
    if (emphasis !== 'even' && emphasis === m) w *= EMPHASIS_BOOST;
    raw[m] = w;
    total += w;
  }
  for (const m of active) dist[m] = raw[m] / total;
  return dist;
}

// Variété : parmi les recettes quasi-équivalentes côté macros (score à « bande »
// du meilleur), on privilégie la moins utilisée de la semaine. La bande reste
// étroite pour ne jamais sacrifier la précision ; « max » l'élargit un peu.
const TIE_BAND_BALANCED = 0.01;
const TIE_BAND_MAX = 0.022;
// En sèche, marge supplémentaire de la bande pour laisser les fibres choisir.
const FIBER_BAND_BONUS = 0.014;

// Reroll (« Nouveau plan ») : pour produire un plan DIFFÉRENT à chaque clic, on
// élargit le pool de choix (borné) et on décale la sélection avec un `seed`. Le
// report de budget kcal/protéines garde le total du jour en cible malgré la
// variation par repas. seed = 0 → plan canonique (déterministe, macro-serré).
const VARIANT_BAND = 0.15;
const VARIANT_MIN = 4;
const VARIANT_POOL = 8;

// Rang pseudo-aléatoire stable d'une recette pour un seed donné (FNV-like).
function seededRank(seed: number, id: string): number {
  let h = (seed * 2654435761) >>> 0;
  for (let i = 0; i < id.length; i++) h = ((h ^ id.charCodeAt(i)) * 16777619) >>> 0;
  return h >>> 0;
}

// ── Cible repas (le moteur = seul cerveau macro) ─────────────────────────────
// Ratio carb:fat (en fraction des kcal NON protéiques) déduit des cibles du profil
// (respecte le mode percent). Sert UNIQUEMENT à convertir un budget kcal en grammes
// de glucides/lipides — il vit dans le moteur, pas dans adaptRecipe.
function carbFatRatio(profile: UserProfile): { carb: number; fat: number } {
  const carbK = 4 * (profile.target_carbs_g || 0);
  const fatK = 9 * (profile.target_fat_g || 0);
  if (carbK + fatK > 0) return { carb: carbK / (carbK + fatK), fat: fatK / (carbK + fatK) };
  return { carb: 0.55, fat: 0.45 }; // repli neutre (profil sans ratio)
}

/**
 * Cible repas EN GRAMMES à partir d'un budget restant (kcal + protéines), du poids
 * du repas et du ratio carb:fat du profil. Les protéines sont prioritaires (pleines) ;
 * les glucides/lipides sont déduits des kcal NON protéiques → un écart hors-plan
 * exprimé en kcal est absorbé (les repas restants rétrécissent pour tenir la cible).
 */
function mealTarget(
  remKcal: number, remProt: number, weight: number, remWeight: number,
  ratio: { carb: number; fat: number },
): AdaptTarget {
  const share = remWeight > 0 ? weight / remWeight : 0;
  const kcalMeal = Math.max(remKcal, 0) * share;
  const proteinMeal = Math.max(remProt, 0) * share;
  const nonProtKcal = Math.max(kcalMeal - 4 * proteinMeal, 0);
  return {
    kcalMeal,
    proteinMeal,
    carbMeal: (nonProtKcal * ratio.carb) / 4,
    fatMeal: (nonProtKcal * ratio.fat) / 9,
  };
}

// Score de fit d'une recette adaptée vs la cible repas (plus petit = meilleur).
// La cible (kcal/protéines/glucides/lipides en grammes) vient du moteur ; le score
// privilégie les recettes qui atteignent kcal + protéines, puis les bons axes
// glucides/lipides (une recette sans axe gras est pénalisée pour une cible grasse).
function fitScore(macros: Macros, target: AdaptTarget, flags: AdaptFlag[]): number {
  const kcalDev = Math.abs(macros.kcal - target.kcalMeal) / Math.max(target.kcalMeal, 1);
  let s = kcalDev;
  if (flags.includes('under_target_kcal')) s += 1;
  if (flags.includes('over_target_kcal')) s += 1;
  if (flags.includes('protein_below_target')) s += 1.2;
  if (flags.includes('fat_below_target')) s += 0.4;
  if (flags.includes('carbs_below_target')) s += 0.4;
  if (flags.includes('no_protein_anchor')) s += 0.5;
  return s;
}

// Mots-clés exclus par régime
const RESTRICTION_BLOCKLIST: Record<DietaryRestriction, string[]> = {
  vegetarian: ['poulet', 'boeuf', 'bœuf', 'steak', 'saumon', 'thon', 'jambon', 'porc', 'dinde', 'poisson', 'cabillaud', 'crevette'],
  pescatarian: ['poulet', 'boeuf', 'bœuf', 'steak', 'jambon', 'porc', 'dinde'],
  no_pork: ['porc', 'jambon', 'lardon', 'bacon'],
  lactose_free: ['lait', 'fromage', 'yaourt'],
  gluten_free: ['pâtes', 'pain', 'blé', 'semoule', 'avoine'],
};

function ingredientText(recipe: Recipe): string {
  return recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
}

/** Une recette est-elle compatible avec le profil ? */
function recipeAllowed(recipe: Recipe, profile: UserProfile): boolean {
  const text = ingredientText(recipe);

  // Temps de prépa (repli pour profils legacy sans le champ)
  if (recipe.prep_time_min > (profile.max_prep_time_min ?? 60)) return false;

  // Régimes : restrictions_ok autoritaire si présent (recettes Kyroz), sinon repli
  // mots-clés (recettes legacy/overrides sans classification diététique).
  for (const r of profile.dietary_restrictions ?? []) {
    if (recipe.restrictions_ok) {
      if (!recipe.restrictions_ok.includes(r)) return false;
    } else if (RESTRICTION_BLOCKLIST[r].some((kw) => text.includes(kw))) {
      return false;
    }
  }

  // Aliments évités
  for (const disliked of profile.disliked_foods ?? []) {
    const kw = disliked.trim().toLowerCase();
    if (kw && text.includes(kw)) return false;
  }

  return true;
}

function poolFor(mealType: MealType, profile: UserProfile): Recipe[] {
  return poolForWithFlag(mealType, profile).pool;
}

/**
 * Pool pour un repas + drapeau `relaxed` : true quand aucune recette ne respecte
 * le régime/les préférences et qu'on a dû retomber sur le pool complet (repli
 * honnête, signalé à l'UI plutôt que de servir un régime non garanti en silence).
 */
function poolForWithFlag(mealType: MealType, profile: UserProfile): { pool: Recipe[]; relaxed: boolean } {
  const recipes = getEffectiveRecipes();
  const all = recipes.filter((r) => r.tags.includes(mealType));
  const filtered = all.filter((r) => recipeAllowed(r, profile));
  if (filtered.length > 0) return { pool: filtered, relaxed: false };
  if (all.length > 0) return { pool: all, relaxed: true };
  return { pool: recipes, relaxed: true };
}

// Mots-clés par source de protéine préférée. Sert UNIQUEMENT de départage à
// macro équivalente (jamais au détriment de la précision) : parmi les recettes
// quasi-ex æquo, on penche vers celles qui collent aux préférences déclarées.
const PROTEIN_KEYWORDS: Record<string, string[]> = {
  poulet: ['poulet'],
  'bœuf': ['bœuf', 'boeuf', 'steak'],
  poisson: ['saumon', 'thon', 'cabillaud', 'crevette', 'poisson'],
  'œufs': ['œuf', 'oeuf'],
  whey: ['whey'],
  'végétal': ['tofu', 'lentille', 'pois chiche', 'haricot', 'dahl'],
};

/** Ids des recettes dont les ingrédients matchent ≥1 protéine préférée. */
function preferredRecipeIds(profile: UserProfile): Set<string> {
  const prefs = profile.preferred_proteins ?? [];
  const kws = prefs.flatMap((p) => PROTEIN_KEYWORDS[p] ?? []);
  if (kws.length === 0) return new Set();
  const ids = new Set<string>();
  for (const r of getEffectiveRecipes()) {
    const text = ingredientText(r);
    if (kws.some((kw) => text.includes(kw))) ids.add(r.id);
  }
  return ids;
}

interface AdaptedChoice {
  recipe: Recipe;
  ingredients: Ingredient[];
  macros: Macros;
  gap: Macros;     // atteint − cible (signé)
  flags: AdaptFlag[];
  score: number;   // fit macro (plus petit = meilleur)
  fiber: number;   // fibres approximatives (départage)
  preferred: boolean; // matche une protéine préférée
  need: number;    // soft-match objectif + sport (0–2)
}

/**
 * Choisit une recette pour un repas en l'ADAPTANT par ingrédient (adaptRecipe) à
 * la cible macro du repas, puis départage les quasi-ex æquo. Remplace l'ancienne
 * grille de portions : chaque recette est scalée vers la cible, on score par les
 * flags + l'écart kcal résiduel, et on départage par préférence > besoin (objectif
 * /sport) > fibres/variété > seed.
 *  - repetitive (seed 0) : meilleur fit strict → même séquence chaque jour.
 *  - balanced / max : recette la moins utilisée (bande plus large en « max »).
 */
function selectMealAdapted(
  pool: Recipe[],
  target: AdaptTarget,
  usage: Record<string, number>,
  variety: VarietyPreference,
  preferredIds: Set<string>,
  objectives: RecipeObjective[],
  sportBuckets: RecipeSport[],
  seed: number,
  fiberStrong: boolean
): AdaptedChoice {
  const candidates: AdaptedChoice[] = pool
    .map((r) => {
      const a = adaptRecipe(r, target);
      return {
        recipe: r, ingredients: a.ingredients, macros: a.macros, gap: a.gap, flags: a.flags,
        score: fitScore(a.macros, target, a.flags),
        fiber: recipeFiberPerPortion(r),
        preferred: preferredIds.has(r.id),
        need: needMatch(r, objectives, sportBuckets),
      };
    })
    .sort((a, b) => a.score - b.score || a.recipe.id.localeCompare(b.recipe.id));

  // Plan canonique répétitif (seed 0) : meilleur score strict, jours identiques.
  if (variety === 'repetitive' && seed === 0) return candidates[0];

  const minScore = candidates[0].score;
  const band = (variety === 'max' ? TIE_BAND_MAX : TIE_BAND_BALANCED) + (fiberStrong ? FIBER_BAND_BONUS : 0);

  let pickable = candidates.filter((c) => c.score <= minScore + band);
  if (seed !== 0) {
    let wide = candidates.filter((c) => c.score <= minScore + VARIANT_BAND);
    if (wide.length < VARIANT_MIN) wide = candidates.slice(0, VARIANT_MIN);
    pickable = wide.slice(0, VARIANT_POOL);
  }

  const fiberCmp = (a: AdaptedChoice, b: AdaptedChoice) => (b.fiber - a.fiber > 1 ? 1 : a.fiber - b.fiber > 1 ? -1 : 0);

  pickable.sort((a, b) => {
    // 1) Protéines préférées d'abord (signal explicite de l'utilisateur).
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    // 1bis) Besoin : recette taguée pour l'objectif/sport (soft-matching).
    if (a.need !== b.need) return b.need - a.need;
    // 1ter) En sèche, les fibres priment sur la variété (satiété).
    if (fiberStrong) { const f = fiberCmp(a, b); if (f !== 0) return f; }
    // 2) Variété intra-semaine : la recette la moins utilisée (sauf en répétitif).
    if (variety !== 'repetitive') {
      const ua = usage[a.recipe.id] ?? 0;
      const ub = usage[b.recipe.id] ?? 0;
      if (ua !== ub) return ua - ub;
    }
    // 2bis) Hors sèche : départage fibres après la variété (nudge plus doux).
    if (!fiberStrong) { const f = fiberCmp(a, b); if (f !== 0) return f; }
    // 3) Décalage par seed : départage variable d'un reroll à l'autre.
    if (seed !== 0) {
      const ra = seededRank(seed, a.recipe.id);
      const rb = seededRank(seed, b.recipe.id);
      if (ra !== rb) return ra - rb;
    }
    // 4) Sinon le meilleur score, puis déterminisme total.
    return a.score - b.score || a.recipe.id.localeCompare(b.recipe.id);
  });

  return pickable[0];
}

/**
 * Macros qui comptent VRAIMENT pour un repas dans le total du jour :
 *  - skipped → rien (0)
 *  - eaten   → ce qui a été mangé (locked_macros si fourni, sinon les macros prévues)
 *  - planned → les macros prévues
 */
export function effectiveMacros(meal: Meal): Macros {
  if (meal.status === 'skipped') return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  if (meal.status === 'eaten') return meal.locked_macros ?? meal.macros;
  return meal.macros;
}

/** Ingrédients EFFECTIFS d'un repas (noms + quantités) : adaptés si présents,
 *  sinon repli sur la recette × portions (plans en cache d'avant la refonte). */
export function mealIngredients(meal: Meal): { name: string; quantity_g: number; unit: string; ref?: string }[] {
  if (meal.adapted_ingredients?.length) {
    return meal.adapted_ingredients.map((i) => ({
      name: i.name, quantity_g: i.quantity_g, unit: i.unit ?? 'g', ref: i.ref,
    }));
  }
  const f = meal.portions ?? 1;
  return meal.recipe.ingredients.map((i) => ({
    name: i.name, quantity_g: i.quantity_g * f, unit: i.unit ?? 'g', ref: i.ref,
  }));
}

export function computeDailyTotals(
  meals: Meal[],
  days: number,
  extras?: Record<number, Macros>
): Macros[] {
  const totals: Macros[] = Array.from({ length: days }, () => ({
    kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
  }));
  for (const meal of meals) {
    const t = totals[meal.day - 1];
    if (!t) continue;
    const m = effectiveMacros(meal);
    t.kcal += m.kcal;
    t.protein_g += m.protein_g;
    t.carbs_g += m.carbs_g;
    t.fat_g += m.fat_g;
  }
  if (extras) {
    for (const [day, m] of Object.entries(extras)) {
      const t = totals[Number(day) - 1];
      if (!t) continue;
      t.kcal += m.kcal; t.protein_g += m.protein_g; t.carbs_g += m.carbs_g; t.fat_g += m.fat_g;
    }
  }
  return totals;
}

/**
 * Empreinte des réglages qui INFLUENCENT le plan. Si elle change, le plan est
 * périmé et doit être régénéré (cf. auto-refresh dans l'écran Plan).
 */
// Version du moteur de génération : à incrémenter quand le scoring/sélection
// change, pour que les plans EN CACHE se régénèrent automatiquement (la signature
// change → l'auto-refresh de l'écran Plan rejoue la génération). v2 = lipides cadrés.
const ENGINE_VERSION = 4; // v4 = adaptRecipe (scaling par ingrédient) + soft-matching

export function profileSignature(p: UserProfile): string {
  return JSON.stringify({
    ev: ENGINE_VERSION,
    k: p.target_kcal, pr: p.target_protein_g, c: p.target_carbs_g, f: p.target_fat_g,
    d: p.plan_days, m: p.meals, e: p.meal_emphasis, v: p.variety,
    r: p.dietary_restrictions, dl: p.disliked_foods, pp: p.preferred_proteins,
    tp: p.max_prep_time_min,
  });
}

export function buildLocalPlan(profile: UserProfile, seed: number = 0): MealPlan {
  const days = Math.min(Math.max(profile.plan_days, 1), 7);

  // Repas choisis par l'utilisateur (réordonnés), avec repli sur 4 repas pour
  // les profils créés avant cette option.
  const selected = Array.isArray(profile.meals) && profile.meals.length > 0
    ? profile.meals
    : (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]);
  const mealTypes = MEAL_ORDER.filter((m) => selected.includes(m));

  // Garde : l'emphase doit porter sur un repas réellement sélectionné, sinon
  // elle serait silencieusement sans effet → on retombe sur « équilibré ».
  const rawEmphasis = profile.meal_emphasis ?? 'even';
  const emphasis = rawEmphasis !== 'even' && !mealTypes.includes(rawEmphasis as MealType) ? 'even' : rawEmphasis;
  const distribution = computeDistribution(mealTypes, emphasis);

  const variety = profile.variety ?? 'balanced';
  const fiberStrong = isFiberFocusGoal(profile.goal); // sèche → fibres prioritaires

  // Soft-matching objectif/sport + ratio carb:fat du profil (le moteur = seul cerveau).
  const objectives = goalToObjectives(profile.goal);
  const sportBuckets = sportsToBuckets(profile.sports);
  const ratio = carbFatRatio(profile);

  const pools: Record<string, Recipe[]> = {};
  const relaxed: Record<string, boolean> = {};
  for (const mt of mealTypes) {
    const pf = poolForWithFlag(mt, profile);
    pools[mt] = pf.pool;
    relaxed[mt] = pf.relaxed;
  }

  // Recettes correspondant aux protéines préférées (départage à macro égale).
  const preferredIds = preferredRecipeIds(profile);

  // Somme des poids des repas actifs (= 1 sur les distributions, mais robuste).
  const totalWeight = mealTypes.reduce((s, mt) => s + distribution[mt], 0) || 1;

  const meals: Meal[] = [];
  // Compteur d'utilisation sur la semaine pour étaler les recettes (variété).
  const usage: Record<string, number> = {};

  for (let d = 1; d <= days; d++) {
    // Budgets kcal/protéines du jour : reportés de repas en repas → auto-
    // correction du total (compense l'arrondi de la grille de portions ; le
    // dernier repas absorbe le reliquat et resserre le total du jour). Grâce au
    // « deadband » kcal, un budget protéines vidé par des recettes trop riches
    // ne peut jamais affamer les kcal des repas suivants.
    let remainingKcal = profile.target_kcal;
    let remainingProtein = profile.target_protein_g;
    let remainingWeight = totalWeight;

    mealTypes.forEach((mealType) => {
      const weight = distribution[mealType];

      // Cible du repas (EN GRAMMES) = part du budget restant (kcal + protéines) au
      // prorata du poids ; glucides/lipides déduits via le ratio du profil. Report
      // de budget → le total du jour reste serré malgré les arrondis/bornes.
      const target = mealTarget(remainingKcal, remainingProtein, weight, remainingWeight, ratio);

      const choice = selectMealAdapted(
        pools[mealType], target, usage, variety, preferredIds, objectives, sportBuckets, seed, fiberStrong,
      );

      usage[choice.recipe.id] = (usage[choice.recipe.id] ?? 0) + 1;
      remainingKcal -= choice.macros.kcal;
      remainingProtein -= choice.macros.protein_g;
      remainingWeight -= weight;

      meals.push({
        id: `${d}-${mealType}`,
        day: d,
        meal_type: mealType,
        recipe: choice.recipe,
        portions: 1,
        macros: choice.macros,
        adapted_ingredients: choice.ingredients,
        adapt_flags: choice.flags.length ? choice.flags : undefined,
        adapt_gap: choice.gap,
        restriction_relaxed: relaxed[mealType] || undefined,
      });
    });
  }

  return {
    id: `plan-${Date.now()}`,
    user_id: profile.id,
    week_start_date: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    days,
    meals,
    total_macros_per_day: computeDailyTotals(meals, days),
    profile_sig: profileSignature(profile),
  };
}

/**
 * Remplace UN seul repas du plan par une alternative du même type, calée sur les
 * mêmes macros (kcal/protéines) que le repas actuel, sans toucher au reste du
 * plan. On choisit au hasard parmi les meilleures alternatives → effet « autre
 * chose » à chaque appui, sans dégrader l'équilibre du jour.
 */
export function swapMeal(profile: UserProfile, plan: MealPlan, meal: Meal): MealPlan {
  const pool = poolFor(meal.meal_type, profile).filter((r) => r.id !== meal.recipe.id);
  if (pool.length === 0) return plan; // aucune alternative possible

  // Cible = les macros actuelles du repas (en grammes) → l'alternative est adaptée
  // pour rester dans le même budget kcal/protéines/glucides/lipides.
  const target: AdaptTarget = {
    kcalMeal: meal.macros.kcal,
    proteinMeal: meal.macros.protein_g,
    carbMeal: meal.macros.carbs_g,
    fatMeal: meal.macros.fat_g,
  };

  const ranked = pool
    .map((r) => { const a = adaptRecipe(r, target); return { r, a, score: fitScore(a.macros, target, a.flags) }; })
    .sort((x, y) => x.score - y.score);

  const top = ranked.slice(0, Math.min(VARIANT_MIN, ranked.length));
  const pick = top[Math.floor(Math.random() * top.length)];

  const newMeal: Meal = {
    ...meal,
    recipe: pick.r,
    portions: 1,
    macros: pick.a.macros,
    adapted_ingredients: pick.a.ingredients,
    adapt_flags: pick.a.flags.length ? pick.a.flags : undefined,
    adapt_gap: pick.a.gap,
  };
  const meals = plan.meals.map((m) => (m.id === meal.id ? newMeal : m));
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
}

/**
 * Ré-applique une recette (override perso) à UN repas en CONSERVANT son budget
 * macro. Repas adapté (scaling par ingrédient) → on ré-adapte la nouvelle recette
 * à ses macros courantes (comme swapMeal) : ingrédients + macros redeviennent
 * cohérents avec la recette affichée immédiatement, sans attendre le recalage
 * (sinon courses/frigo/fibres, qui lisent `adapted_ingredients`, garderaient les
 * quantités de l'ANCIENNE recette). Repli legacy (plan en cache d'avant la refonte,
 * sans ingrédients adaptés) → on scale les macros de base × portions.
 */
export function reAdaptMealRecipe(meal: Meal, recipe: Recipe): Meal {
  if (meal.adapted_ingredients) {
    const target: AdaptTarget = {
      kcalMeal: meal.macros.kcal,
      proteinMeal: meal.macros.protein_g,
      carbMeal: meal.macros.carbs_g,
      fatMeal: meal.macros.fat_g,
    };
    const a = adaptRecipe(recipe, target);
    return {
      ...meal,
      recipe,
      portions: 1,
      macros: a.macros,
      adapted_ingredients: a.ingredients,
      adapt_flags: a.flags.length ? a.flags : undefined,
      adapt_gap: a.gap,
    };
  }
  const f = meal.portions ?? 1;
  return {
    ...meal,
    recipe,
    macros: {
      kcal: Math.round(recipe.macros_per_portion.kcal * f),
      protein_g: Math.round(recipe.macros_per_portion.protein_g * f),
      carbs_g: Math.round(recipe.macros_per_portion.carbs_g * f),
      fat_g: Math.round(recipe.macros_per_portion.fat_g * f),
    },
  };
}

/**
 * « Recaler ma journée » — le cœur du re-plan instantané.
 *
 * Quand un repas est sauté, mangé, ou qu'un écart hors plan est déclaré, on
 * recalcule les PORTIONS des repas encore « planned » de ce jour pour que le
 * total du jour retombe sur la cible (kcal + protéines + lipides), en tenant
 * compte de ce qui a déjà été consommé (repas verrouillés + extras hors plan).
 *
 * On garde la MÊME recette pour chaque repas restant (on ne fait que réajuster
 * la portion) : le recalage doit être prévisible — « ton dîner grossit/réduit »,
 * pas « ton dîner a changé de plat ». Pour changer de plat, l'utilisateur a déjà
 * « Remplacer ce repas » (swapMeal).
 *
 * Budget reporté de repas en repas (comme buildLocalPlan) → total serré malgré
 * l'arrondi de la grille de portions. Si on a déjà dépassé la cible (gros écart),
 * les repas restants tombent à la portion minimale (la fonction de score choisit
 * naturellement la plus petite portion quand la cible restante est ~0).
 */
/**
 * Cœur paramétrable du recalage. Ajuste les PORTIONS des repas dont l'id est dans
 * `adjustIds` pour faire retomber le total du jour sur la cible, en tenant compte :
 *  - du consommé verrouillé (repas mangés + extras hors plan) ;
 *  - des repas planifiés MAIS NON ajustables (ex. « on ne touche qu'au dîner ») →
 *    comptés au consommé à leurs macros actuelles (ils ne bougent pas) ;
 *  - des repas de `skipIds` → passés en `skipped` (ne comptent pas, budget reporté).
 * La cible protéines reste pleine : les repas ajustés se densifient en protéines.
 */
function rebalanceCore(
  profile: UserProfile, plan: MealPlan, day: number,
  adjustIds: Set<string>, skipIds: Set<string>,
): MealPlan {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  if (dayMeals.length === 0) return plan;

  const types = MEAL_ORDER.filter((mt) => dayMeals.some((m) => m.meal_type === mt));
  const rawEmphasis = profile.meal_emphasis ?? 'even';
  const emphasis = rawEmphasis !== 'even' && !types.includes(rawEmphasis as MealType) ? 'even' : rawEmphasis;
  const dist = computeDistribution(types, emphasis);

  const isAdjustable = (m: Meal) => adjustIds.has(m.id) && (m.status ?? 'planned') === 'planned' && !skipIds.has(m.id);

  // Consommé = mangés + extras + planifiés-mais-figés (non ajustables, non sautés).
  // On suit kcal + protéines : les glucides/lipides restants sont DÉDUITS du budget
  // kcal restant (via le ratio), ce qui absorbe un écart hors-plan exprimé en kcal.
  const consumed = { kcal: 0, protein: 0 };
  for (const m of dayMeals) {
    if (isAdjustable(m) || skipIds.has(m.id) || m.status === 'skipped') continue;
    const em = m.status === 'eaten' ? (m.locked_macros ?? m.macros) : m.macros;
    consumed.kcal += em.kcal; consumed.protein += em.protein_g;
  }
  const extra = plan.day_extras?.[day];
  if (extra) { consumed.kcal += extra.kcal; consumed.protein += extra.protein_g; }

  let remKcal = Math.max(profile.target_kcal - consumed.kcal, 0);
  let remProt = Math.max(profile.target_protein_g - consumed.protein, 0);

  const ratio = carbFatRatio(profile);
  const adjustMeals = dayMeals.filter(isAdjustable);
  let remWeight = adjustMeals.reduce((s, m) => s + dist[m.meal_type], 0) || 1;

  const updates = new Map<string, Meal>();
  for (const mt of MEAL_ORDER) {
    const meal = adjustMeals.find((m) => m.meal_type === mt);
    if (!meal) continue;
    const weight = dist[mt];
    // Même cible/scaling que buildLocalPlan → recalage = re-adaptation de la MÊME
    // recette vers la cible restante (kcal/prot pleins, gluc/lip via ratio).
    const target = mealTarget(remKcal, remProt, weight, remWeight, ratio);
    const a = adaptRecipe(meal.recipe, target);
    updates.set(meal.id, {
      ...meal, portions: 1, macros: a.macros,
      adapted_ingredients: a.ingredients, adapt_flags: a.flags.length ? a.flags : undefined, adapt_gap: a.gap,
    });
    remKcal -= a.macros.kcal;
    remProt -= a.macros.protein_g;
    remWeight -= weight;
  }

  const meals = plan.meals.map((m) => {
    if (updates.has(m.id)) return updates.get(m.id)!;
    if (skipIds.has(m.id)) return { ...m, status: 'skipped' as MealStatus };
    return m;
  });
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
}

export function rebalanceDay(profile: UserProfile, plan: MealPlan, day: number): MealPlan {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  // Comportement historique : ajuste TOUS les repas encore planifiés du jour.
  const adjustIds = new Set(dayMeals.filter((m) => (m.status ?? 'planned') === 'planned').map((m) => m.id));
  return rebalanceCore(profile, plan, day, adjustIds, new Set());
}

// ── Adaptation à OPTIONS après un écart hors plan (morceau 4) ────────────────
export type AdaptOption = {
  key: 'spread' | 'skip_snack' | 'focus_dinner';
  label: string;
  detail: string;
  plan: MealPlan;
  dayKcal: number;   // total du jour résultant (preview)
};

/**
 * Propose plusieurs façons d'absorber un écart, selon les repas ENCORE À VENIR
 * (heure + statut, cf. mealtime). Chaque option renvoie un plan prêt à appliquer.
 * Vide si plus aucun repas à venir (rien à adapter).
 */
export function adaptDayOptions(
  profile: UserProfile, plan: MealPlan, day: number, nowHour: number,
): AdaptOption[] {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  const upcoming = remainingMeals(dayMeals, nowHour);
  if (upcoming.length === 0) return [];

  const allIds = new Set(upcoming.map((m) => m.id));
  const dayKcalOf = (p: MealPlan) => Math.round(p.total_macros_per_day[day - 1]?.kcal ?? 0);
  const options: AdaptOption[] = [];

  // 1. Répartir sur tous les repas restants.
  const spread = rebalanceCore(profile, plan, day, allIds, new Set());
  options.push({
    key: 'spread',
    label: 'Répartir sur mes repas restants',
    detail: upcoming.map((m) => MEAL_LABEL[m.meal_type]).join(' + ') + ' ajustés',
    plan: spread, dayKcal: dayKcalOf(spread),
  });

  // 2. Sauter la collation → les autres restants prennent le relais (protéines pleines).
  const snack = upcoming.find((m) => m.meal_type === 'snack');
  if (snack && upcoming.length >= 2) {
    const rest = new Set(upcoming.filter((m) => m.id !== snack.id).map((m) => m.id));
    const skipped = rebalanceCore(profile, plan, day, rest, new Set([snack.id]));
    options.push({
      key: 'skip_snack',
      label: 'Sauter la collation',
      detail: 'le reste se densifie en protéines',
      plan: skipped, dayKcal: dayKcalOf(skipped),
    });
  }

  // 3. Ajuster surtout le dîner → les autres repas restants ne bougent pas.
  const dinner = upcoming.find((m) => m.meal_type === 'dinner');
  if (dinner && upcoming.length >= 2) {
    const focused = rebalanceCore(profile, plan, day, new Set([dinner.id]), new Set());
    options.push({
      key: 'focus_dinner',
      label: 'Ajuster surtout le dîner',
      detail: 'tes autres repas ne bougent pas',
      plan: focused, dayKcal: dayKcalOf(focused),
    });
  }

  return options;
}

/**
 * Remet le suivi du plan à zéro (nouvelle journée) : efface les statuts
 * mangé/sauté et les écarts hors plan, puis restaure les portions CANONIQUES en
 * recalant chaque jour sur la cible pleine. Les recettes (y compris les
 * remplacements faits par l'utilisateur) sont conservées — on ne touche qu'aux
 * portions. Idempotent : sur un plan déjà « propre », c'est un no-op.
 */
export function resetTracking(profile: UserProfile, plan: MealPlan): MealPlan {
  const meals = plan.meals.map((m) =>
    m.status || m.locked_macros ? { ...m, status: undefined, locked_macros: undefined } : m
  );
  let next: MealPlan = { ...plan, meals, day_extras: undefined, tracking_date: undefined };
  for (let d = 1; d <= plan.days; d++) next = rebalanceDay(profile, next, d);
  return next;
}
