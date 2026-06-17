// ── Types Kyroz ──────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female';

// Objectifs étendus (du déficit agressif au surplus)
export type Goal =
  | 'cut_aggressive'   // sèche rapide
  | 'cut'              // sèche progressive
  | 'recomp'           // recomposition
  | 'maintain'         // maintien
  | 'lean_bulk'        // prise de masse propre
  | 'bulk';            // prise de masse

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

// Sports suivis pour estimer la dépense énergétique (méthode MET, cf. lib/sport.ts).
export type SportType =
  | 'musculation'
  | 'course'
  | 'velo'
  | 'natation'
  | 'football'
  | 'hiit_crossfit'
  | 'sports_combat'
  | 'tennis_padel'
  | 'basket'
  | 'marche_rapide';

export interface SportSession {
  type: SportType;
  sessions_per_week: number;    // nb de séances/semaine
  minutes_per_session: number;  // durée moyenne d'une séance (min)
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Ordre canonique des repas dans la journée — source unique de vérité
// (importée par le moteur, l'onboarding et le profil).
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Sur quel repas mettre l'accent (portion plus grosse). 'even' = équilibré.
export type MealEmphasis = 'even' | 'breakfast' | 'lunch' | 'dinner';

// 'auto' = tout calculé · 'percent' = kcal+protéines calculés, glucides/lipides
// répartis selon un % choisi · 'manual' = legacy (grammes fixes, plus proposé en UI).
export type MacroMode = 'auto' | 'percent' | 'manual';

// Préférence de variété sur la semaine
export type VarietyPreference = 'repetitive' | 'balanced' | 'max';

// Cadence de pesée choisie par l'utilisateur (pilote le rappel de check-in).
export type WeighInFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

// Restrictions alimentaires (régime / interdits)
export type DietaryRestriction =
  | 'vegetarian'
  | 'pescatarian'
  | 'no_pork'
  | 'lactose_free'
  | 'gluten_free';

export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Rôle macro d'un ingrédient (pilote le scaling par ingrédient — cf. adaptRecipe).
export type MacroRole = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit' | 'flavor';

// Tags « besoin » des recettes (soft-matching).
export type RecipeObjective = 'cut' | 'maintain' | 'bulk';
export type RecipeSport = 'muscu' | 'endurance' | 'combats';

// Faisabilité d'une recette adaptée à une cible repas (cf. adaptRecipe).
export type AdaptFlag =
  | 'protein_below_target'
  | 'over_target_kcal'
  | 'under_target_kcal'
  | 'fat_below_target'
  | 'carbs_below_target'
  | 'no_protein_anchor';

export interface UserProfile {
  id: string;

  // Données de base
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  body_fat_pct?: number;        // % de masse grasse (optionnel) → BMR Katch-McArdle

  // Activité
  activity_level: ActivityLevel;
  training_days_per_week: number;
  sports?: SportSession[];      // sports renseignés → TDEE précis (MET). Vide = calcul legacy (multiplicateur).

  // Objectif
  goal: Goal;

  // Macros (auto = calculées, percent = ratio choisi, manual = legacy)
  macro_mode: MacroMode;
  carb_ratio?: number;          // mode percent : % des calories NON-protéiques en glucides (reste = lipides)
  protein_per_kg?: number;      // mode percent : protéines en g par kg (masse maigre si %MG connu, sinon poids)
  tdee_kcal: number;
  target_kcal: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;

  // Préférences plan
  plan_days: number;            // 1–7 (= plan_weekdays.length)
  plan_weekdays: number[];      // jours choisis, format getDay() : 0=Dim … 6=Sam
  meals: MealType[];            // repas choisis (petit-déj/midi/dîner/collation)
  meal_emphasis: MealEmphasis;  // repas mis en avant (portion plus grosse)
  variety: VarietyPreference;

  // Préférences alimentaires
  dietary_restrictions: DietaryRestriction[];
  disliked_foods: string[];     // mots-clés d'ingrédients à éviter
  preferred_proteins: string[]; // sources de protéines préférées
  max_prep_time_min: number;    // temps de prépa max par repas

  // Suivi du poids
  weigh_in_frequency?: WeighInFrequency; // cadence de pesée (défaut: weekly)
}

export interface Ingredient {
  name: string;
  quantity_g: number;
  unit?: string;
  food_id?: string;   // → Food de la base (lib/foods.ts) ; permet de recalculer les macros depuis les ingrédients
  ref?: string;            // → RECIPE_INGREDIENTS (clé d'ingrédient des recettes Kyroz)
  macro_role?: MacroRole;  // rôle pour le scaling par ingrédient
  scalable?: boolean;      // false = quantité fixe (légumes, aromates)
}

// Aliment de la base nutritionnelle (valeurs pour 100 g — approche « moyenne »,
// alignées Ciqual/ANSES). `food_id` d'un Ingredient pointe ici.
export interface Food {
  id: string;             // 'ciqual-XXXXX'
  name_fr: string;
  category: string;       // groupe alimentaire Ciqual (libre)
  per100g: Macros;        // kcal / protéines / glucides / lipides pour 100 g
  // Incertitude relative (%) de l'énergie selon les sources — sert à afficher une
  // marge honnête sur le total du jour (Phase 3b). Défaut appliqué si absent.
  uncertainty_pct?: number;
}

export interface Recipe {
  id: string;
  name_fr: string;
  prep_time_min: number;
  macros_per_portion: Macros;
  portions: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];                       // meal types
  restrictions_ok?: DietaryRestriction[]; // régimes compatibles
  validated_by_dietitian: boolean;
  objectives?: RecipeObjective[];   // tag « Objectif »
  sports?: RecipeSport[];           // tag « Sport »
  rest_day_ok?: boolean;            // tag « récup jour off » (stocké, non utilisé)
  why_fr?: string;                  // « Pourquoi », affiché
  recomp_flag?: string;             // ex. 'low_protein_density'
}

// Suivi d'adhésion au plan (feature « recaler ma journée ») :
//  - planned : repas à venir, re-optimisable (les portions peuvent être recalées)
//  - eaten   : mangé/cuisiné, verrouillé (compte dans le consommé du jour)
//  - skipped : sauté, ne compte pas (son budget bascule sur les repas restants)
export type MealStatus = 'planned' | 'eaten' | 'skipped';

export interface Meal {
  id: string;
  day: number;        // 1–7
  meal_type: MealType;
  recipe: Recipe;
  portions: number;
  macros: Macros;
  status?: MealStatus;       // absent = planned
  locked_macros?: Macros;    // macros RÉELLEMENT consommées si ≠ macros (mangé hors plan / portion modifiée)
  adapted_ingredients?: Ingredient[]; // quantités ajustées (source de vérité affichage/courses)
  adapt_flags?: AdaptFlag[];          // faisabilité de l'adaptation
  adapt_gap?: Macros;                 // atteint − cible (signé) ; alimente l'affichage « +Xg »
  restriction_relaxed?: boolean;      // repli régime : recette servie hors restriction
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  generated_at: string;
  days: number;
  meals: Meal[];
  total_macros_per_day: Macros[];
  profile_sig?: string; // empreinte des réglages ayant produit ce plan (auto-refresh)
  // Calories mangées hors plan, par jour (1–7) — comptées dans le consommé et
  // absorbées par le recalage des repas restants. Clé = numéro de jour.
  day_extras?: Record<number, Macros>;
  // Date locale (YYYY-MM-DD) du dernier suivi posé (mangé/sauté/hors plan). Sert
  // à remettre la journée à zéro quand on change de jour calendaire.
  tracking_date?: string;
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  category: 'viandes' | 'légumes' | 'féculents' | 'laitiers' | 'autres';
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  plan_id: string;
  items: ShoppingItem[];
}

export interface Streak {
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string;
}
