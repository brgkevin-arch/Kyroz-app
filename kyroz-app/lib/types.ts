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

/**
 * Activité de la vie quotidienne HORS sport (NEAT — Non-Exercise Activity
 * Thermogenesis) : boulot, déplacements, courses, ménage, enfants.
 *
 * C'est la seule entrée d'activité du TDEE avec les séances : le sport est chiffré
 * à part par les MET (cf. lib/sport.ts), donc ce niveau ne doit JAMAIS englober
 * l'entraînement — sans quoi il serait compté deux fois. C'est pourquoi la table
 * s'arrête à 1,45 (métier physique) : les 1,50/1,65 des tables classiques sont des
 * niveaux « exercice inclus », inutilisables ici.
 */
export type NeatLevel =
  | 'desk'      // assis toute la journée (bureau, télétravail, conduite)
  | 'light'     // assis mais debout/en déplacement par intermittence
  | 'active'    // souvent debout, marche beaucoup (commerce, soins, enseignement)
  | 'physical'; // métier physique (BTP, manutention, restauration)

/**
 * Avertissement UNIQUE émis quand une révision du moteur déplace la cible
 * calorique de l'utilisateur. Persisté (donc synchronisé) plutôt que local : un
 * budget qui bouge de plusieurs centaines de kcal sans explication, c'est la
 * confiance dans le produit qui part — et il ne doit être expliqué qu'UNE fois,
 * pas une fois par appareil.
 */
export interface EngineNotice {
  rev: number;   // révision du moteur à l'origine du changement
  from: number;  // cible servie AVANT (kcal/j)
  to: number;    // cible servie APRÈS (kcal/j)
}

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

// Objectif DATÉ (feature premium « Kyroz+ ») : atteindre un poids à une date.
// Pilote la cible calorique dans le temps (cf. lib/datedGoal.ts) au rythme le plus
// rapide MAIS sûr. `start_*` fige le point de départ → trajectoire idéale + « suis-je
// sur la bonne pente ». Dates au format 'YYYY-MM-DD' (heure LOCALE, cf. localStamp).
export interface GoalTarget {
  target_weight_kg: number;
  target_date: string;
  start_weight_kg: number;
  start_date: string;
}

// Restrictions alimentaires (régime / interdits)
export type DietaryRestriction =
  | 'vegetarian'
  | 'pescatarian'
  | 'no_pork'
  | 'lactose_free'
  | 'gluten_free'
  | 'vegan'
  | 'halal';

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

// Signaux de sécurité levés par le moteur (cf. lib/safety.ts + lib/tdee.ts).
// Calculés à la volée, JAMAIS persistés : ce sont des verdicts sur le plan courant.
export type PlanFlag =
  | 'FLOOR_APPLIED'              // le plancher de sécurité mord → l'objectif daté devient inatteignable
  | 'LOW_EA_WARNING'             // énergie disponible sous l'optimum (zone 30–35 kcal/kg de masse maigre)
  | 'LOW_EA_BUDGET_EXCEEDED'     // > 12 semaines cumulées en zone basse → le plancher remonte
  | 'UNDERWEIGHT_NO_DEFICIT'     // IMC < 18,5 → déficit annulé, plan ramené à la maintenance
  | 'MACRO_BUDGET_OVERFLOW'      // protéines + lipides dépassent le budget du jour
  | 'CARBS_BELOW_TRAINING_FLOOR' // glucides < 3 g/kg un jour de séance
  | 'GOAL_DIRECTION_MISMATCH';   // le poids cible contredit la famille de l'objectif

/**
 * Registre d'exposition à l'énergie disponible basse (cf. lib/safety.ts).
 *
 * `since` est ce qui rend le compteur honnête : le plan servi reste EN VIGUEUR
 * entre deux ouvertures de l'app, donc les semaines écoulées comptent même sans
 * recalcul. Sans lui, le registre comptait des ENREGISTREMENTS et non des
 * semaines vécues — une pesée mensuelle « payait » 7 semaines là où une pesée
 * hebdomadaire en payait 26, pour exactement le même comportement.
 */
export interface LowEaRegistry {
  /** Lundis 'YYYY-MM-DD' des semaines comptées, purgés au-delà de 12 mois. */
  weeks: string[];
  /** Début de l'exposition EN COURS ('YYYY-MM-DD'), ou null si le plan servi n'est plus restrictif. */
  since: string | null;
}

/**
 * Forme STOCKÉE du registre. Le tableau nu est la forme legacy livrée le
 * 2026-07-28 (P0.1) : elle est encore LUE, plus jamais écrite. La colonne
 * Supabase étant `jsonb`, faire évoluer la charge utile n'a demandé AUCUNE
 * migration — donc aucun risque de désynchronisation app/schéma (PGRST204).
 */
export type LowEaRegistryStored = string[] | LowEaRegistry;

export interface UserProfile {
  id: string;

  // Données de base
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  body_fat_pct?: number;        // % de masse grasse (optionnel) → BMR Katch-McArdle
  // Femme ménopausée : lève la remontée progressive du plancher d'énergie disponible
  // (le risque de perturbation ovulatoire ne s'applique plus). `undefined` = traité
  // comme NON ménopausée → le défaut protège (cf. lib/safety.ts).
  // ⚠️ INERTE et LOCAL-ONLY (décision 2026-07-28 : « on laisse de côté la ménopause »).
  // Aucune UI ne le renseigne, il est HORS PROFILE_COLS → aucune colonne Supabase,
  // aucune migration (même parti pris que Streak.freeze_available). Le moteur le lit
  // déjà : quand la question sera rédigée, il suffira d'ajouter la colonne + la ligne
  // dans PROFILE_COLS, sans toucher au calcul.
  is_post_menopausal?: boolean;
  // Registre d'exposition à l'énergie disponible basse (30–35 kcal/kg de masse
  // maigre), sur une fenêtre glissante de 12 mois. CUMULÉ, pas consécutif : une
  // pause d'une semaine ne remet pas le compteur à zéro. Le nom reste `low_ea_weeks`
  // (colonne Supabase `jsonb` inchangée) alors que la charge utile a évolué vers
  // `LowEaRegistry` — cf. lib/safety.ts.
  low_ea_weeks?: LowEaRegistryStored;

  // Activité
  // ⚠️ `activity_level` et `training_days_per_week` ne servent PLUS au TDEE depuis
  // l'étape 3 (chemin unique `BMR × NEAT + MET`, cf. lib/tdee.ts) : le compteur de
  // séances reste utilisé pour les jours de repos / la génération du plan, et
  // `activity_level` n'est plus qu'un libellé historique conservé en base.
  activity_level: ActivityLevel;
  training_days_per_week: number;
  sports?: SportSession[];      // séances déclarées → dépense sportive chiffrée par MET (lib/sport.ts)
  // Vie quotidienne hors sport. `undefined` → traité comme 'desk' (1,20) : c'est le
  // défaut qui ne peut pas inventer un déficit qui n'existe pas. Sur-estimer le NEAT
  // efface la sèche EN SILENCE (mesuré : 61 à 87 % du déficit à 1,35) ; sous-estimer
  // se voit sur la balance et se corrige. Question posée dans le profil (éditeur
  // « Sports & activité »), volontairement PAS à l'onboarding — friction.
  neat_level?: NeatLevel;

  // Objectif
  goal: Goal;
  // Objectif daté (premium) : cible poids + date. Absent = aucun objectif daté →
  // la cible calorique suit le delta figé de `goal` (comportement historique).
  goal_target?: GoalTarget;

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
  // Jours de REPOS choisis explicitement (format getDay() : 0=Dim … 6=Sam).
  //  - undefined → déduits auto du nb de jours d'entraînement (restDaySet, legacy).
  //  - [] → l'user a choisi AUCUN jour de repos (tous actifs).
  //  - [n,…] → ces jours de semaine sont des jours de repos (carb-cycling).
  rest_weekdays?: number[];
  meals: MealType[];            // repas choisis (petit-déj/midi/dîner/collation)
  meal_emphasis: MealEmphasis;  // repas mis en avant (portion plus grosse)
  variety: VarietyPreference;
  fixed_meals?: FixedMeals;     // repas que l'user gère lui-même → soustraits du budget (cf. FixedMeal)

  // Préférences alimentaires
  dietary_restrictions: DietaryRestriction[];
  disliked_foods: string[];     // mots-clés d'ingrédients à éviter (filtre DUR)
  preferred_proteins: string[]; // sources de protéines préférées
  max_prep_time_min: number;    // temps de prépa max par repas
  // Recettes « j'aime pas » (👎) : masquées des plans et des swaps, mais filtre SOUPLE
  //   — jamais un bannissement définitif (cf. lib/dislike.ts + élicitation d'ingrédient).
  //   - undefined → aucune recette masquée (profils créés avant la feature).
  //   - [id,…]    → ces recettes ne sont plus proposées (réversible dans Profil).
  // Volontairement HORS profileSignature : un 👎 change UN repas (swap), il ne
  // régénère pas toute la semaine (cf. planEngine.profileSignature).
  hidden_recipes?: string[];

  // Suivi du poids
  weigh_in_frequency?: WeighInFrequency; // cadence de pesée (défaut: weekly)

  // ── Révision du moteur ────────────────────────────────────────────────────
  // Révision qui a produit les cibles stockées. `undefined` = profil calculé avant
  // que le champ existe (cf. ENGINE_REV_LEGACY dans lib/tdee.ts).
  engine_rev?: number;
  // Avertissement one-shot en attente d'affichage. Effacé quand l'utilisateur
  // l'a lu — synchronisé, donc lu une seule fois tous appareils confondus.
  engine_notice?: EngineNotice;
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

// Repas que l'utilisateur GÈRE lui-même (petit-déj/collation récurrents) : déclaré
// UNE fois, ses macros sont soustraites du budget du jour, et Kyroz cale les repas
// restants autour. Jamais re-saisi (≠ hors-plan). Cf. planEngine (soustraction) +
// écran Plan (carte verrouillée comptée dans le total).
export interface FixedMeal {
  label: string;               // nom donné par l'utilisateur (« Mon shaker + flocons »)
  macros: Macros;              // macros déclarées (comptées dans le total du jour)
  source: 'food' | 'recipe' | 'estimate' | 'custom';
  ingredients?: Ingredient[];  // optionnel : si défini via recherche d'aliments / recette
}
// Repas fixes par type de repas (un seul par créneau, même chaque jour en v1).
export type FixedMeals = Partial<Record<MealType, FixedMeal>>;

// Aliment de la base nutritionnelle (valeurs pour 100 g — approche « moyenne »,
// alignées Ciqual/ANSES). `food_id` d'un Ingredient pointe ici.
export interface Food {
  id: string;             // 'ciqual-XXXXX' (ANSES) | 'kyroz-XXX' (ajout Kyroz)
  name_fr: string;
  category: string;       // groupe alimentaire Ciqual (libre)
  per100g: Macros;        // kcal / protéines / glucides / lipides pour 100 g
  // Fibres alimentaires (g / 100 g), colonne Ciqual dédiée. Hors `per100g` car les
  // fibres ne sont PAS une macro énergétique du contrat Macros (kcal/P/G/L partout).
  // `undefined` = non déterminé par Ciqual (~1 % des aliments, composites) → traité 0.
  fiber_g?: number;
  // Incertitude relative (%) de l'énergie selon les sources — sert à afficher une
  // marge honnête sur le total du jour (Phase 3b). Défaut appliqué si absent.
  uncertainty_pct?: number;
  // Provenance de la valeur. Absent/'ciqual' = donnée officielle ANSES (intacte) ;
  // 'kyroz' = ajout ou correction Kyroz (cf. lib/foods.curation.ts) — pour rester
  // honnête sur la source (Licence Ouverte 2.0 : pas de dénaturation des données ANSES).
  source?: 'ciqual' | 'kyroz';
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
  rest_day?: boolean;                 // jour de repos (carb-cycling : glucides ↓ / lipides ↑)
  fixed?: boolean;                    // repas géré par l'user (FixedMeal) : verrouillé, non planifié/swappé/recalé
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
  // « Bouclier de série » : pardonne UN jour manqué (gel), se recharge tous les
  // 7 jours. LOCAL-ONLY (pas synchronisé, pas de colonne Supabase). undefined =
  // dispo (rétro-compat : les profils existants démarrent protégés).
  freeze_available?: boolean;
}
