// ── Types Kyroz ──────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female';

// Objectifs étendus (du déficit agressif au surplus)
export type Goal =
  // ⚠️ LEGACY, plus proposé par l'UI depuis le 2026-07-29 — voir `normalizeGoal`.
  // Mesuré sur 2268 profils : il servait EXACTEMENT les mêmes calories que `cut`
  // (0 % d'écart dès que le %MG est déclaré ; 1 à 16 kcal/j quand il est estimé).
  // Le plancher de sécurité absorbe la différence entre −300 et −500 kcal/j, donc
  // le choix était un choix fantôme : l'utilisateur cochait « rapide », y
  // réfléchissait, et recevait le plan de « sèche ». La vitesse se pilote
  // désormais par l'objectif DATÉ, seul mécanisme qui sache dire honnêtement si
  // le rythme demandé est tenable (cf. lib/datedGoal.ts, P1.6).
  // Conservé dans le type et dans GOAL_CONFIG : des profils l'ont en base.
  | 'cut_aggressive'   // sèche rapide (legacy)
  | 'cut'              // sèche
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
  rev: number;   // révision du moteur qui produit la NOUVELLE cible
  from: number;  // cible servie AVANT (kcal/j)
  to: number;    // cible servie APRÈS (kcal/j)
  /**
   * Révision D'OÙ VIENT le profil. Sans elle, l'écran ne peut pas savoir ce qu'il
   * doit expliquer : un compte dormant depuis la rev 1 traverse PLUSIEURS
   * corrections d'un coup, et sa cible baisse (séances comptées en double) là où
   * un compte rev 2 la voit monter (NEAT relevé). Leur servir le même texte fait
   * dire « Kyroz sous-estimait ta dépense » à quelqu'un qui vient de perdre
   * 470 kcal — mesuré sur le profil de référence du dépôt.
   * `undefined` = notice déposée avant l'existence du champ (lire ENGINE_REV_LEGACY).
   */
  fromRev?: number;
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
//
// ⚠️ TOUS LES DRAPEAUX N'ONT PAS VOCATION À ÊTRE AFFICHÉS — décision du 2026-07-29,
// prise sur mesure (10 080 profils) et non par principe. Un drapeau qui se lève sur
// un quart de la population sans que la personne ait le moindre levier n'est pas de
// l'information, c'est de l'inquiétude. Avant d'en câbler un, MESURER sa fréquence.
//
//   drapeau                      tir      affiché ?
//   FLOOR_APPLIED                 5,0 %   oui (objectif daté, aperçu, macros)
//   UNDERWEIGHT_NO_DEFICIT        rare    oui (carte Profil)
//   GOAL_DIRECTION_MISMATCH       rare    oui (check-in poids)
//   LOW_EA_BUDGET_EXCEEDED        →100 %  oui (carte Profil, depuis 2026-07-29)
//   LOW_EA_WARNING               33,9 %   NON, volontairement
//   CARBS_BELOW_TRAINING_FLOOR   10,2 %   NON, volontairement
//   MACRO_BUDGET_OVERFLOW         0,0 %   NON, volontairement
//
// • `LOW_EA_WARNING` — 80,4 % des sèches, 85,7 % des hommes sportifs en sèche. Mais
//   mesuré sur les 10 080 profils, l'énergie disponible servie n'est JAMAIS sous 30 :
//   le plancher garantit le seuil dur de l'IOC. Le drapeau ne signale donc que « tu
//   es dans la zone 30–35 », où le moteur protège déjà et où l'utilisateur n'a rien
//   à faire. Le câbler = alarme permanente sans levier. Reste utile EN INTERNE : il
//   alimente le registre d'exposition (`countsAsLowEaWeek`), qui lui a des effets.
// • `CARBS_BELOW_TRAINING_FLOOR` — 27,4 % des sèches, manque médian 30 g. En déficit,
//   le budget est le budget : aucun levier en mode auto. Décision fondateur : muet.
// • `MACRO_BUDGET_OVERFLOW` — 0 sur 10 080. C'est un canari d'ingénierie (il signale
//   un état qui ne devrait pas exister), pas un message. S'il se lève un jour, c'est
//   un bug à corriger, pas une information à servir.
export type PlanFlag =
  | 'FLOOR_APPLIED'              // le plancher de sécurité mord → l'objectif daté devient inatteignable
  | 'LOW_EA_WARNING'             // énergie disponible sous l'optimum (zone 30–35 kcal/kg de masse maigre)
  | 'LOW_EA_BUDGET_EXCEEDED'     // > 12 semaines cumulées en zone basse → le plancher remonte
  | 'UNDERWEIGHT_NO_DEFICIT'     // IMC < 18,5 → déficit annulé, plan ramené à la maintenance
  | 'MACRO_BUDGET_OVERFLOW'      // protéines + lipides dépassent le budget du jour
  | 'CARBS_BELOW_TRAINING_FLOOR' // glucides < 3 g/kg un jour de séance
  | 'GOAL_DIRECTION_MISMATCH';   // le poids cible contredit la famille de l'objectif

/**
 * Qui a fixé le plancher calorique. Vit ICI et non dans `tdee.ts` parce que
 * `UserProfile` le porte : le mettre dans le moteur créerait un cycle d'imports.
 *
 * Les trois premiers sont les minima physiologiques (`safety.safetyFloorBreakdown`),
 * les deux derniers sont des plafonds propres au moteur.
 */
export type FloorSource =
  | 'bmr'                      // métabolisme de base — minimum dur
  | 'energy_availability'      // 30 kcal/kg de masse maigre + dépense sportive
  | 'min_kcal'                 // filet absolu 1500 H / 1200 F
  | 'deficit_cap'              // plafond de déficit à 25 % du TDEE
  | 'underweight_maintenance'; // IMC < 18,5 → plan ramené à la maintenance

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
  /**
   * Âge en années révolues. **DÉRIVÉ de `birth_date` dès que celle-ci existe** —
   * `computePlan` le recalcule à chaque passage, donc il ne peut plus vieillir de
   * travers. Reste la valeur SAISIE pour les comptes créés avant le 2026-08-02,
   * qui n'ont pas de date de naissance (on ne l'invente pas : un âge ne donne
   * qu'une fourchette d'un an).
   * ⚠️ Ne jamais écrire `age` à la main quand `birth_date` est connue : le
   * prochain recalcul l'écrasera.
   */
  age: number;
  /**
   * Date de naissance 'YYYY-MM-DD'. Source de vérité de l'âge (cf. lib/birthday.ts).
   * Optionnelle : absente sur les comptes antérieurs au 2026-08-02.
   * Synchronisée — migration 2026-08-02_profiles_birth_date.sql.
   */
  birth_date?: string;
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
  // Vie quotidienne hors sport. `undefined` → traité comme 'desk' (1,30 depuis le
  // 2026-07-31, 1,20 avant) : c'est le
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
  /**
   * BANQUE DE CALORIES (Kyroz+) — écart calorique déclaré sur un jour de semaine
   * (format getDay() : « 6 » = samedi), compensé sur les AUTRES jours du plan.
   * Ex. `{ "6": 600 }` = « resto samedi soir ». Valeur négative = mettre de côté.
   *
   * Les protéines ne bougent JAMAIS (plancher quotidien, §6), et aucun jour ne
   * descend sous le plancher personnalisé — cf. `lib/calorieBank.ts`.
   * Clé en STRING : c'est du jsonb côté Supabase, `JSON.parse` rend des clés string.
   */
  calorie_bank?: Record<string, number>;
  /**
   * Date de création du compte, posée par le SERVEUR (profiles.created_at).
   * LECTURE SEULE — volontairement ABSENTE de PROFILE_COLS : elle appartient à
   * Postgres, la pousser permettrait de la réécrire. Elle sert d'ancre au
   * grand-père du paywall (cf. lib/premium.ts), donc elle doit être infalsifiable.
   */
  created_at?: string;
  meals: MealType[];            // repas choisis (petit-déj/midi/dîner/collation)
  meal_emphasis: MealEmphasis;  // repas mis en avant (portion plus grosse)
  variety: VarietyPreference;
  fixed_meals?: FixedMeals;     // repas que l'user gère lui-même → soustraits du budget (cf. FixedMeal)

  // Préférences alimentaires
  dietary_restrictions: DietaryRestriction[];
  disliked_foods: string[];     // mots-clés d'ingrédients à éviter (filtre DUR)
  preferred_proteins: string[]; // sources de protéines préférées
  // Temps de prépa max par repas. ⚠️ INERTE depuis le 2026-07-29 : plus aucune UI ne le
  // règle, il ne filtre plus les recettes et il est sorti de `profileSignature`. Conservé
  // dans le type et dans PROFILE_COLS pour ne PAS effacer la valeur des comptes déjà
  // enregistrés — même parti pris que `activity_level`. Le curseur sera peut-être remis
  // quand le catalogue sera assez fourni, mais en préférence pondérée, jamais en filtre
  // dur (cf. le commentaire de `recipeAllowed` dans lib/planEngine.ts).
  max_prep_time_min?: number;
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

  // ⚠️ **`clamp` a été RETIRÉ du profil le 2026-08-04 (A8) — ne pas le remettre.**
  // Le champ portait la trace du plancher (lequel a mordu, de combien). Il a vécu
  // du 2026-07-31 au 2026-08-04 **sans jamais trouver un seul lecteur** : l'écran
  // qui affiche cette information (`profil.tsx`) lit `plan.clamp`, produit par
  // `computePlan`, et `ClampRecord` est un SUR-ensemble de ce qui était stocké.
  // Le motif du retrait n'est pas l'encombrement, c'est la DIVERGENCE : une copie
  // figée au dernier `recalcProfile` à côté d'une valeur recalculée est une seconde
  // source de vérité qui attend son bug — et recalculer coûte 0,11 ms.
  // ➡️ Si un écran a un jour besoin de cette trace SANS calculer de plan, appeler
  // `computePlan` et lire `plan.clamp`. Cf. AGENTS.md A8.
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
  // (`rest_day_ok` SUPPRIMÉ le 2026-08-03. Il a survécu deux fois à sa propre mort : le
  //  commentaire disait « non utilisé » alors qu'il pilotait un départage, puis il est
  //  resté « conservé en données, la fiche pourra l'afficher un jour » — un an de tag
  //  que RIEN ne lisait et que personne ne pouvait vérifier, faux sur 152 recettes sur
  //  512. ➡️ Un champ gardé « au cas où » ne se corrige jamais. Sa réapparition est
  //  bloquée par `lib/__tests__/tags.test.ts`.)
  why_fr?: string;                  // « Pourquoi », affiché
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
