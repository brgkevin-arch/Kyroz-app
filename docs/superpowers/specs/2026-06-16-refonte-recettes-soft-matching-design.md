# Refonte recettes + adaptRecipe (scaling par ingrédient) + soft-matching — Design

> Date : 2026-06-16 · Statut : **validé, données reçues — prêt pour `writing-plans`**
> Contexte : remplacement des 50 recettes placeholder par les **100 recettes**
> « spécial recomposition » du fondateur (`recettes-kyroz-100.json` : 20 petit-déj
> + 20 collations + 60 repas + `ingredients_reference` + `config`). Le scaling de
> portion global est remplacé par l'algorithme **`adaptRecipe`** (fourni par le
> fondateur) : scaling ciblé par macro, plancher protéique, bornes par rôle.
> Branché SUR le moteur de macros existant de l'app (un seul cerveau macro).

## Validation du lot de 100 (faite avant implémentation)

- **Cohérence macros↔ingrédients** : échantillon (12, extrêmes inclus) → kcal &
  protéines à **<1 %**. Seuls écarts >2 % = arrondi sur glucides quasi-nuls
  (plats d'œufs). → test automatique `±2 %` sur les 100 à l'implémentation.
- **Couverture régimes** (trous des 10 comblés) : sans-lactose petit-déj 6+,
  sans-gluten petit-déj 3 (point le plus mince), collations bien couvertes.
- **`adaptRecipe` + config réel** : chaque recette a une taille mini/maxi
  (plancher protéique `min=1.0` + bornes + `abs_max_qty`). Petits profils →
  grosses recettes débordent (`over_target_kcal`) ; gros profils → petites
  recettes n'atteignent pas (`under_target_kcal`) ; basse densité → `prot<`.
  **Tous correctement flagués** → confirme que la SÉLECTION doit s'appuyer sur
  les flags (taille recette ↔ besoin). Pool de 100 = toujours de quoi servir.

## Corrections de données validées (à appliquer à l'ingestion)

- **rep57 (Chili dinde)** : n'a aucune source de gras (4 g lipides → glucides qui
  explosent après adaptation). → **ajouter `huile_olive` 8 g** (`macro_role: fat`,
  `scalable: true`) et recalculer ses macros.
- **`recomp_flag: 'low_protein_density'`** ajouté à **rep10, rep14, rep29, rep54**
  (densité protéique ~3,9–4,6 g/100 kcal, comme le Dahl rep03 déjà flagué).
- **Invariant testé** : chaque `repas_complet` doit avoir ≥1 ingrédient
  `macro_role: 'fat'` (sinon l'algo n'a pas d'axe lipides → glucides qui débordent).

## Décisions cadrées (brainstorming)

1. **Pool** : remplacement TOTAL par les 100 recettes (`recettes-kyroz-100.json`,
   reçu & validé). Source = ce JSON (bytes exacts à committer comme asset ; ma
   transcription sera validée par le test de cohérence `±2 %`).
2. **Matching besoin** : **soft-matching** — tags Objectif/Sport orientent le
   choix de recette à macros équivalentes (jamais filtre dur).
3. **Scaling** : **`adaptRecipe`** du fondateur, tel quel (par ingrédient).
4. **Cibles macro** : **moteur de l'app conservé** (source de vérité = profil
   `target_kcal/protein_g/carbs_g/fat_g`, calculés via %MG/Katch-McArdle, TDEE
   par sport MET, 6 objectifs, mode percent). `adaptRecipe` scale VERS ces cibles.
   Le `config` du JSON ne sert qu'en **repli** (cf. §4).
5. **Dahl** : gardé tel quel (densité 4,3 g/100 kcal, `recomp_flag`), suppression
   possible à terme.

## Format de données (validé)

Le JSON définit :
- `ingredients_reference` : table type `Food` — macros/100 g + `basis`
  (`dry`=cru/sec, `raw`=cru) + `abs_max_qty?` (plafond réaliste par ingrédient).
- ingrédient de recette : `ref`, `qty`, `macro_role`
  (protein|carb|fat|dairy|vegetable|fruit|flavor), `scalable`.
- recette : `id`, `name`, `category` (petit_dej|collation|repas_complet),
  `base_servings`, `tags` (objectif[], recup_jour_repos, sport[], temps_min),
  `ingredients`, `instructions`, `why`, `macros_per_serving`, `recomp_flag?`.
- `config` : `objective_profiles` (par objectif : protein_g_per_kg,
  carb_fat_split{carb,fat}, calorie_modifier), `meal_weights`,
  `scaling_factors_by_role` ([min,max] par rôle), `rounding_step_g`,
  `protein_floor_tolerance`, `no_fat_increase_in_deficit?`.

Cohérence des 10 premières recettes vérifiée : macros recalculées depuis
`ingredients_reference` × `qty` = `macros_per_serving` à **±1 %**. ⚠️ Valeurs à
remplacer par le **CSV CIQUAL officiel** avant prod (cf. `_meta`).

## Problèmes connus (signalés — à combler avec le lot de 100)

- **Variété / couverture régimes** (sur le set de 10 seulement) : sans lactose →
  0 petit-déj ; sans gluten → 0 petit-déj/collation. Le lot de 100 doit combler.
  En attendant, repli régime **honnête** (cf. §6).
- **Faisabilité recette×profil** : une recette trop petite/légère ne peut pas
  nourrir un gros gabarit (`under_target_kcal`) et inversement (`over_target_kcal`).
  → la **sélection** doit utiliser les `flags` d'`adaptRecipe` (cf. §5).
- **Total du jour** : `adaptRecipe` cible chaque repas indépendamment. Pour ne pas
  laisser dériver le total quotidien, on conserve le **report de budget** de
  l'app (cf. §3) plutôt que `dayKcal × meal_weights[category]` brut.

---

## 1. Modèle de données

### 1a. Table d'ingrédients (`lib/recipeIngredients.ts`, nouveau)
`ingredients_reference` → `RECIPE_INGREDIENTS: Record<string, IngredientRef>`
(`per100g: Macros`, `unit`, `basis?`, `abs_max_qty?`). Composites tolérés
(`legumes_aromates`, `legumes_wok`). Swap vers CIQUAL officiel plus tard.

### 1b. Config (`lib/recipeConfig.ts`, nouveau)
Le bloc `config` typé. **Champs réellement utilisés** par l'intégration :
`scaling_factors_by_role`, `rounding_step_g`, `protein_floor_tolerance`,
`no_fat_increase_in_deficit`, `abs_max_qty` (sur les ingrédients).
**Champs en REPLI seulement** (le moteur app prime) : `objective_profiles`
.protein_g_per_kg & .calorie_modifier (fallback si le profil n'a pas de cible),
`carb_fat_split` (fallback split si pas de target_carbs/fat), `meal_weights`
(fallback de distribution si besoin — sinon `computeDistribution` de l'app).

### 1c. `Recipe`/`Ingredient` étendus (`lib/types.ts`, rétro-compatible)
```ts
export type MacroRole = 'protein'|'carb'|'fat'|'dairy'|'vegetable'|'fruit'|'flavor';
export type RecipeObjective = 'cut'|'maintain'|'bulk';
export type RecipeSport = 'muscu'|'endurance'|'combats';

interface Ingredient { /* existant */ ref?: string; macro_role?: MacroRole; scalable?: boolean; }
interface Recipe {
  /* existant */
  objectives?: RecipeObjective[]; sports?: RecipeSport[];
  rest_day_ok?: boolean;   // STOCKÉ, non utilisé (pas de notion jour de repos)
  why_fr?: string;
  // restrictions_ok? : renseigné à la main (cf. §6)
}
```
Mapping ingestion : objectif FR→RecipeObjective (perte_de_gras→cut, maintien→
maintain, prise_de_masse→bulk) ; category→tags repas (petit_dej→breakfast,
collation→snack, repas_complet→[lunch,dinner]) ; temps_min→prep_time_min ;
recup_jour_repos→rest_day_ok.

### 1d. `Meal` — quantités adaptées (changement structurant)
```ts
interface Meal {
  /* existant (recipe, macros, status…) */
  adapted_ingredients?: { ref: string; qty: number }[]; // sortie adaptRecipe = vérité affichage/courses
  adapt_flags?: AdaptFlag[];                             // protein_below_target | over/under_target_kcal | no_protein_anchor
  restriction_relaxed?: boolean;                         // repli régime honnête (§6)
  portions?: number;                                     // LEGACY (plans en cache)
}
```
Consommateurs (`RecipeDetail`, `MealCard`, `shoppingList`) lisent
`adapted_ingredients` si présent, sinon repli `recipe.ingredients × portions`.
`recipe` reste le template canonique (non muté).

## 2. Les recettes (`lib/recipes.ts`)
- Transcrites à l'identique (ingrédients/qty/`macro_role`/`scalable`, étapes,
  `why`, macros). `validated_by_dietitian:false`. **IDs descriptifs du JSON**
  (`porridge_avoine_whey`…). Favoris/overrides legacy sur anciens `r0xx`
  deviennent inertes (sans danger, phase test).
- Tags des 10 (le lot de 100 suivra le même schéma) :

| recette | id | repas | objectives | sports | régimes OK |
|---|---|---|---|---|---|
| Porridge | porridge_avoine_whey | breakfast | bulk | muscu, endurance | vegetarian, pescatarian, no_pork |
| Omelette | omelette_blancs_oeufs | breakfast | cut, maintain | muscu, combats | vegetarian, pescatarian, no_pork |
| Skyr | bowl_skyr | snack | maintain | muscu, combats | vegetarian, pescatarian, no_pork |
| Smoothie | smoothie_vegetal | snack | bulk | endurance | vegetarian, pescatarian, no_pork, lactose_free |
| Poulet riz | poulet_riz_brocoli | lunch, dinner | bulk, maintain | muscu | no_pork, lactose_free |
| Saumon | saumon_patate_douce | lunch, dinner | maintain | endurance, muscu | pescatarian, no_pork, lactose_free, gluten_free |
| Dahl | dahl_lentilles | lunch, dinner | cut | endurance, combats | vegetarian, pescatarian, no_pork, lactose_free, gluten_free |
| Bœuf wok | boeuf_wok_nouilles | lunch, dinner | bulk | combats, muscu | no_pork, lactose_free |
| Tofu quinoa | tofu_quinoa | lunch, dinner | cut | combats, endurance | vegetarian, pescatarian, no_pork, lactose_free |
| Cabillaud | cabillaud_boulgour | lunch, dinner | cut, maintain | endurance, combats | pescatarian, no_pork, lactose_free |

## 3. `adaptRecipe` + branchement sur le moteur app (`lib/planEngine.ts`)

### `adaptRecipe(recipe, target, ref, cfg)` — fourni, intégré tel quel
Buckets : `fixed` (scalable:false | vegetable | flavor), `anchors` (protein, +
promotion dairy si aucune protéine), `fills` (carb/fat/fruit/dairy). Étapes :
ancrage protéique (kp≥1.0), kcal restantes réparties carb/fat selon le split,
récupération protéique (remonte les ancres si sous le plancher), arrondi
`rounding_step_g`, recalcul macros depuis les grammes (source de vérité), `flags`.

### Cible du repas — bridge vers les cibles de l'app
`computeMealTarget` est **adapté** : au lieu de `weightKg×protein_g_per_kg` /
`tdee×calorie_modifier`, il lit les cibles du profil avec **report de budget**
(comme `buildLocalPlan` aujourd'hui) :
- `kcalMeal = remainingKcal × weight / remainingWeight`
- `proteinMeal = remainingProtein × weight / remainingWeight`
- `weight` = `computeDistribution(meals, emphasis)` (repas choisis + emphase).
- `remaining*` reportés de repas en repas → total du JOUR serré.
- **Split carb/fat** passé à `adaptRecipe` = déduit du profil
  (`carb_fat_split = 4·target_carbs_g vs 9·target_fat_g`, normalisé) → respecte
  le mode percent ; **repli** `config.objective_profiles[obj].carb_fat_split` si
  le profil n'a pas de ratios. (mapping 6 goals → 3 objectifs pour ce repli.)

### Sélection de recette (le moteur app CHOISIT, adaptRecipe ADAPTE)
Pour chaque candidate du pool (type repas + régime + temps), `adaptRecipe` →
score de fit = pénalité sur `flags` (`under/over_target_kcal`,
`protein_below_target`) + résidu kcal. Départage ensuite, à fit équivalent :
1. protéines préférées → 2. **needMatch (objectif+sport)** → 3. fibres (sèche) →
4. variété → 5. seed → 6. fit/id. `needMatch` = (objectives∩goalToObjectives) +
(sports∩sportsToBuckets) ; recette sans tags → 0 (neutre).

### Impact transversal
`buildLocalPlan`, `swapMeal`, `rebalanceCore/Day`, `adaptDayOptions`,
`resetTracking` appellent désormais `adaptRecipe` (sortie `adapted_ingredients` +
`macros` + `flags`) au lieu de re-choisir une portion. `computeDailyTotals`/
`effectiveMacros` inchangés (lisent `meal.macros`). Bump `ENGINE_VERSION` →
régénération auto des plans en cache.

## 4. Macros depuis les ingrédients
`macrosFromIngredients` lit `RECIPE_INGREDIENTS` via `ref`. Une `qty` qui change
recalcule les macros. (Swap CIQUAL officiel plus tard.)

## 5. Régimes — filtrage fiable
- `recipeAllowed` lit **`restrictions_ok` si présent** (autoritaire), sinon repli
  mots-clés (legacy/perso). Corrige faux positifs (lait d'amande/coco) et faux
  négatifs (skyr, boulgour, nouilles).
- **Repli « repas introuvable » honnête** : si le filtrage vide un type de repas,
  on garde le repli (jamais de plan vide) mais on marque `Meal.restriction_relaxed`
  → l'UI prévient.

## 6. UI (`RecipeDetail`, `MealCard`)
Badges **Objectif** + **Sport**, bloc **« Pourquoi »**, ingrédients aux
**quantités adaptées**, avertissements (`restriction_relaxed`, et flags
`under/over_target_kcal` → note honnête « repas un peu sous/au-dessus de ta
cible »). `useTheme()`+`makeStyles(t)`, aucune couleur en dur.

## 7. Tests & doc
- `recipes.test.ts` : cohérence macros↔ingrédients (±2 %), tags & rôles présents,
  `restrictions_ok` valides, chaque `ref` ∈ `RECIPE_INGREDIENTS`, pool non vide.
- `adaptRecipe.test.ts` (nouveau) : légumes fixes, ancrage & plancher protéique,
  bornes/`abs_max_qty`, split carb/fat depuis profil, flags corrects, déterminisme.
- `planEngine.test.ts` : bridge cible (report de budget, total jour serré),
  sélection par flags, soft-matching, repli régime signalé, recalage/swap via
  adaptRecipe, garde-fous §6 CLAUDE.md.
- `shoppingList.test.ts` : agrégation depuis `adapted_ingredients` (cru/sec).
- `AGENTS.md` : nouveau modèle.

## 8. Hors-scope (plus tard)
- Valeurs **CIQUAL officielles** (swap `per100g`).
- Notion « jour de repos » → activation `rest_day_ok`.
- `config.objective_profiles.protein_g_per_kg`/`calorie_modifier` & `meal_weights`
  restent en repli (le moteur app prime).

## Ordre d'implémentation (à réception de `recettes-kyroz-100.json` → `writing-plans`)
1. `RECIPE_INGREDIENTS` + `recipeConfig` + types étendus.
2. Ingestion recettes (mapping FR→types) → `recipes.ts`.
3. `macrosFromIngredients` sur `ref`.
4. `adaptRecipe` intégré + `computeMealTarget` bridge (report budget + split profil).
5. Sélection par flags + needMatch ; bump `ENGINE_VERSION`.
6. Refactor consommateurs `portions`→`adapted_ingredients` (display, courses,
   recalage, swap, adapt, reset).
7. Repli régime honnête + UI badges/Pourquoi/avertissements.
8. Tests + `AGENTS.md`.
