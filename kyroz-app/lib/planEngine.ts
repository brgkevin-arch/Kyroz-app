import { DietaryRestriction, Macros, Meal, MEAL_ORDER, MealEmphasis, MealPlan, MealType, Recipe, UserProfile, VarietyPreference } from './types';
import { getEffectiveRecipes } from './recipes';
import { recipeFiberPerPortion, isFiberFocusGoal } from './fiber';

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

const MIN_PORTION = 0.5;
const MAX_PORTION = 3;
const PORTION_STEP = 0.25;

// Grille de portions admissibles : [0.5, 0.75, …, 3]
const PORTION_STEPS: number[] = (() => {
  const steps: number[] = [];
  for (let p = MIN_PORTION; p <= MAX_PORTION + 1e-9; p += PORTION_STEP) {
    steps.push(Math.round(p * 100) / 100);
  }
  return steps;
})();

// Score d'écart : pénalité kcal asymétrique (« deadband ») + pénalité protéines.
//
// Les calories sont le contrat quotidien : tant que l'écart kcal du repas reste
// dans la bande KCAL_DEADBAND, il coûte peu (pente W_KCAL_IN) → ce sont les
// protéines qui pilotent le choix de recette (vers la plus pauvre en protéines
// quand il faut en limiter). Au-delà, un mur raide (W_KCAL_OUT) ramène les kcal
// dans la cible, même quand la cible protéines est hors d'atteinte avec le pool
// (mieux vaut alors un excès de protéines, sans danger, qu'un écart calorique
// qui casse l'objectif de poids).
const KCAL_DEADBAND = 0.06; // ±6 % de la part kcal du repas : zone « gratuite »
const SCORE_W_KCAL_IN = 1; // pente douce dans la bande (laisse parler les prot.)
const SCORE_W_KCAL_OUT = 30; // mur raide hors bande (protège les calories)
const SCORE_W_PROTEIN = 1.2; // protéines : priorité (muscle)
// Lipides : on les pilote AUSSI, sinon le moteur tape kcal+prot avec des recettes
// très grasses (3 plats d'œufs → 179 g de lipides…). En contraignant kcal + prot +
// lipides, les glucides (= reste) sont mécaniquement cadrés eux aussi. Poids un peu
// plus doux que les protéines : on corrige les excès sans rigidifier le choix.
const SCORE_W_FAT = 0.9;

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

  // Régimes
  for (const r of profile.dietary_restrictions ?? []) {
    if (RESTRICTION_BLOCKLIST[r].some((kw) => text.includes(kw))) return false;
  }

  // Aliments évités
  for (const disliked of profile.disliked_foods ?? []) {
    const kw = disliked.trim().toLowerCase();
    if (kw && text.includes(kw)) return false;
  }

  return true;
}

function poolFor(mealType: MealType, profile: UserProfile): Recipe[] {
  const recipes = getEffectiveRecipes();
  const all = recipes.filter((r) => r.tags.includes(mealType));
  const filtered = all.filter((r) => recipeAllowed(r, profile));
  // Fallback : ne jamais renvoyer un pool vide (sinon plan incomplet)
  if (filtered.length > 0) return filtered;
  if (all.length > 0) return all;
  return recipes;
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

interface MealChoice {
  recipe: Recipe;
  portion: number;
  macros: Macros;
  score: number;
  fiber: number; // fibres estimées (g) du repas — sert de départage souple
}

interface MealTarget {
  kcal: number;
  protein: number;
  fat: number;
  kcalScale: number;
  proteinScale: number;
  fatScale: number;
}

/**
 * Écart relatif pondéré (kcal + protéines + lipides) entre des macros et une cible
 * repas. Normalisé par une échelle stable (part fixe de la cible du jour) pour
 * rester comparable même quand le budget restant tombe à zéro.
 */
function deviationScore(macros: Macros, target: MealTarget): number {
  const kcalDev = (macros.kcal - target.kcal) / target.kcalScale;
  const protDev = (macros.protein_g - target.protein) / target.proteinScale;
  const fatDev = (macros.fat_g - target.fat) / target.fatScale;
  const kcalOver = Math.max(0, Math.abs(kcalDev) - KCAL_DEADBAND);
  const kcalPenalty =
    SCORE_W_KCAL_IN * kcalDev * kcalDev + SCORE_W_KCAL_OUT * kcalOver * kcalOver;
  return kcalPenalty + SCORE_W_PROTEIN * protDev * protDev + SCORE_W_FAT * fatDev * fatDev;
}

/** Meilleure portion (grille 0.25) d'une recette pour une cible repas donnée. */
function bestPortionFor(recipe: Recipe, target: MealTarget): MealChoice {
  let best: MealChoice | null = null;
  const fiberPerPortion = recipeFiberPerPortion(recipe);
  for (const portion of PORTION_STEPS) {
    const macros = scaleMacros(recipe.macros_per_portion, portion);
    const score = deviationScore(macros, target);
    if (best === null || score < best.score) {
      best = { recipe, portion, macros, score, fiber: fiberPerPortion * portion };
    }
  }
  // PORTION_STEPS n'est jamais vide → best est toujours défini.
  return best as MealChoice;
}

/**
 * Choisit (recette, portion) pour un repas : meilleur ajustement macro d'abord,
 * puis la préférence de variété départage les quasi-ex æquo.
 *  - repetitive : pas d'étalement → même séquence chaque jour.
 *  - balanced / max : recette la moins utilisée de la semaine (bande plus large
 *    en « max » pour accepter un léger surcoût macro en échange de diversité).
 */
function selectMeal(
  pool: Recipe[],
  target: MealTarget,
  usage: Record<string, number>,
  variety: VarietyPreference,
  preferredIds: Set<string>,
  seed: number,
  fiberStrong: boolean
): MealChoice {
  const candidates = pool
    .map((r) => bestPortionFor(r, target))
    .sort((a, b) => a.score - b.score || a.recipe.id.localeCompare(b.recipe.id));

  // Plan canonique répétitif (seed 0) : meilleur score strict, jours identiques.
  if (variety === 'repetitive' && seed === 0) return candidates[0];

  const minScore = candidates[0].score;
  // En sèche, on élargit un peu la bande de départage : plus de candidats quasi-
  // équivalents → les fibres ont davantage de marge pour orienter le choix.
  const band = (variety === 'max' ? TIE_BAND_MAX : TIE_BAND_BALANCED) + (fiberStrong ? FIBER_BAND_BONUS : 0);

  // Pool de choix : bande macro étroite par défaut (précision). En reroll, on
  // élargit (borné) pour avoir de quoi varier → un nouveau plan à chaque clic.
  let pickable = candidates.filter((c) => c.score <= minScore + band);
  if (seed !== 0) {
    let wide = candidates.filter((c) => c.score <= minScore + VARIANT_BAND);
    if (wide.length < VARIANT_MIN) wide = candidates.slice(0, VARIANT_MIN);
    pickable = wide.slice(0, VARIANT_POOL);
  }

  // Bonus fibres : à macros quasi-équivalentes, on penche vers le repas le plus
  // riche en fibres. Seuil de 1 g pour ne départager que sur un écart réel.
  const fiberCmp = (a: MealChoice, b: MealChoice) => (b.fiber - a.fiber > 1 ? 1 : a.fiber - b.fiber > 1 ? -1 : 0);

  pickable.sort((a, b) => {
    // 1) Protéines préférées d'abord.
    const pa = preferredIds.has(a.recipe.id) ? 0 : 1;
    const pb = preferredIds.has(b.recipe.id) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    // 1bis) En sèche, les fibres priment sur la variété (satiété).
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

function scaleMacros(base: Macros, factor: number): Macros {
  return {
    kcal: Math.round(base.kcal * factor),
    protein_g: Math.round(base.protein_g * factor),
    carbs_g: Math.round(base.carbs_g * factor),
    fat_g: Math.round(base.fat_g * factor),
  };
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
const ENGINE_VERSION = 3; // v3 = départage fibres

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

  const pools: Record<string, Recipe[]> = {};
  for (const mt of mealTypes) pools[mt] = poolFor(mt, profile);

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
    let remainingFat = profile.target_fat_g;
    let remainingWeight = totalWeight;

    mealTypes.forEach((mealType) => {
      const weight = distribution[mealType];

      // Cible du repas = part du budget restant au prorata du poids du repas.
      const target: MealTarget = {
        kcal: (Math.max(remainingKcal, 0) * weight) / remainingWeight,
        protein: (Math.max(remainingProtein, 0) * weight) / remainingWeight,
        fat: (Math.max(remainingFat, 0) * weight) / remainingWeight,
        // Normalisateurs stables (part fixe de la cible du jour, pas du reliquat).
        kcalScale: Math.max(profile.target_kcal * weight, 1),
        proteinScale: Math.max(profile.target_protein_g * weight, 1),
        fatScale: Math.max(profile.target_fat_g * weight, 1),
      };

      const choice = selectMeal(pools[mealType], target, usage, variety, preferredIds, seed, fiberStrong);

      usage[choice.recipe.id] = (usage[choice.recipe.id] ?? 0) + 1;
      remainingKcal -= choice.macros.kcal;
      remainingProtein -= choice.macros.protein_g;
      remainingFat -= choice.macros.fat_g;
      remainingWeight -= weight;

      meals.push({
        id: `${d}-${mealType}`,
        day: d,
        meal_type: mealType,
        recipe: choice.recipe,
        portions: choice.portion,
        macros: choice.macros,
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

  const target: MealTarget = {
    kcal: meal.macros.kcal,
    protein: meal.macros.protein_g,
    fat: meal.macros.fat_g,
    kcalScale: Math.max(meal.macros.kcal, 1),
    proteinScale: Math.max(meal.macros.protein_g, 1),
    fatScale: Math.max(meal.macros.fat_g, 1),
  };

  const ranked = pool
    .map((r) => bestPortionFor(r, target))
    .sort((a, b) => a.score - b.score);

  const top = ranked.slice(0, Math.min(VARIANT_MIN, ranked.length));
  const choice = top[Math.floor(Math.random() * top.length)];

  const newMeal: Meal = {
    ...meal,
    recipe: choice.recipe,
    portions: choice.portion,
    macros: choice.macros,
  };
  const meals = plan.meals.map((m) => (m.id === meal.id ? newMeal : m));
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
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
export function rebalanceDay(profile: UserProfile, plan: MealPlan, day: number): MealPlan {
  const dayMeals = plan.meals.filter((m) => m.day === day);
  if (dayMeals.length === 0) return plan;

  // Répartition du jour sur les repas réellement présents, avec l'emphase profil.
  const types = MEAL_ORDER.filter((mt) => dayMeals.some((m) => m.meal_type === mt));
  const rawEmphasis = profile.meal_emphasis ?? 'even';
  const emphasis = rawEmphasis !== 'even' && !types.includes(rawEmphasis as MealType) ? 'even' : rawEmphasis;
  const dist = computeDistribution(types, emphasis);

  // Consommé verrouillé : repas mangés + extras hors plan du jour.
  const consumed = { kcal: 0, protein: 0, fat: 0 };
  for (const m of dayMeals) {
    if (m.status === 'eaten') {
      const em = m.locked_macros ?? m.macros;
      consumed.kcal += em.kcal; consumed.protein += em.protein_g; consumed.fat += em.fat_g;
    }
  }
  const extra = plan.day_extras?.[day];
  if (extra) { consumed.kcal += extra.kcal; consumed.protein += extra.protein_g; consumed.fat += extra.fat_g; }

  // Budget restant pour les repas encore planifiés (jamais négatif).
  let remKcal = Math.max(profile.target_kcal - consumed.kcal, 0);
  let remProt = Math.max(profile.target_protein_g - consumed.protein, 0);
  let remFat = Math.max(profile.target_fat_g - consumed.fat, 0);

  // Poids cumulé des repas à recaler (pour le prorata + report).
  const plannedTypes = dayMeals
    .filter((m) => (m.status ?? 'planned') === 'planned')
    .map((m) => m.meal_type);
  let remWeight = plannedTypes.reduce((s, mt) => s + dist[mt], 0) || 1;

  const updates = new Map<string, Meal>();
  // On parcourt dans l'ordre canonique pour un report stable.
  for (const mt of MEAL_ORDER) {
    const meal = dayMeals.find((m) => m.meal_type === mt && (m.status ?? 'planned') === 'planned');
    if (!meal) continue;
    const weight = dist[mt];
    const target: MealTarget = {
      kcal: (remKcal * weight) / remWeight,
      protein: (remProt * weight) / remWeight,
      fat: (remFat * weight) / remWeight,
      kcalScale: Math.max(profile.target_kcal * weight, 1),
      proteinScale: Math.max(profile.target_protein_g * weight, 1),
      fatScale: Math.max(profile.target_fat_g * weight, 1),
    };
    const choice = bestPortionFor(meal.recipe, target);
    updates.set(meal.id, { ...meal, portions: choice.portion, macros: choice.macros });
    remKcal -= choice.macros.kcal;
    remProt -= choice.macros.protein_g;
    remFat -= choice.macros.fat_g;
    remWeight -= weight;
  }

  const meals = plan.meals.map((m) => updates.get(m.id) ?? m);
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
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
