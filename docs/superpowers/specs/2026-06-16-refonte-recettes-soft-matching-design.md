# Refonte des recettes + scaling par ingrédient + soft-matching — Design

> Date : 2026-06-16 · Statut : validé (en attente du gros lot de recettes pour `writing-plans`)
> Contexte : remplacement des 50 recettes placeholder par les recettes « spécial
> recomposition » fournies par le fondateur, dans un nouveau format JSON
> structuré (table d'ingrédients + rôle macro + scalabilité). Le moteur passe
> d'un scaling global de portion à un **scaling par ingrédient** pour que les
> quantités collent au besoin sans toucher aux légumes/aromates.

## Décisions cadrées (brainstorming)

1. **Pool** : remplacement TOTAL par les 10 recettes du JSON. Le fondateur
   prépare un **gros lot** supplémentaire (même schéma) → c'est à sa réception
   qu'on lancera `writing-plans` et l'implémentation.
2. **Matching besoin** : **soft-matching** — les tags Objectif/Sport orientent le
   choix de recette UNIQUEMENT à macros équivalentes (jamais en filtre dur).
3. **Scaling** : **par ingrédient** — l'algo ajuste séparément protéines /
   glucides / lipides via `macro_role`/`scalable`, garde les ingrédients
   `scalable:false` (légumes, aromates) FIXES.
4. **Dahl** : gardé tel quel (densité protéique 4,3 g/100 kcal, `recomp_flag`),
   suppression possible à terme. Pas de réécriture silencieuse.

## Format de données (validé) & cohérence

Le JSON fourni définit :
- `ingredients_reference` : table d'ingrédients avec macros/100 g + `basis`
  (`dry` = cru/sec pour riz/lentilles/quinoa/boulgour/nouilles/avoine, `raw` =
  poids cru pour viandes/poissons). **= le type `Food` existant** (`lib/foods.ts`).
- chaque ingrédient de recette : `ref` (→ `ingredients_reference`), `qty`,
  `macro_role` (protein|carb|fat|dairy|vegetable|fruit|flavor), `scalable`.
- recette : `category`, `tags` (objectif[], recup_jour_repos, sport[], temps_min),
  `base_servings`, `instructions`, `why`, `macros_per_serving`, `recomp_flag?`.

**Cohérence vérifiée** : recalcul des macros depuis `ingredients_reference` × `qty`
→ identique à `macros_per_serving` à **±1 %** sur les 10 recettes (pires écarts =
arrondis : omelette lipides 16 vs 17, tofu 504 vs 510 kcal). Les macros sont donc
**dérivées des ingrédients**, plus tapées à la main. ⚠️ Les valeurs restent des
estimations « ±5-10 % » à remplacer par le CSV CIQUAL officiel avant prod
(cf. `_meta` du JSON).

## Problèmes connus signalés au fondateur (à combler avec le gros lot)

- **Variété faible** : 2 petits-déj, 2 collations, 6 repas → répétition sur 7 j.
- **Couverture régimes petit-déj/collation** :
  - sans lactose → 0 petit-déj (porridge + omelette = laitiers)
  - sans gluten → 0 petit-déj ET 0 collation (avoine/pain partout)
  - Le moteur ne doit plus servir une recette interdite en silence (cf. §5).
- **Précision hors recomp** : pool dense en protéines. Le scaling par ingrédient
  (§3) **atténue** ce point (on peut ajuster les axes séparément), mais reste
  borné par la composition d'une recette (une omelette ne devient pas un plat
  riche en glucides). Vrai correctif = nouvelles recettes basse densité.

---

## 1. Modèle de données

### 1a. Table d'ingrédients (`lib/recipeIngredients.ts`, nouveau)
On stocke `ingredients_reference` comme une table type `Food` (macros/100 g +
`basis`), **curée pour les recettes** (certaines entrées sont des composites —
`legumes_aromates`, `legumes_wok` — qui n'existent pas tels quels dans Ciqual).
Le `ref` slug joue le rôle de clé. Remplacement par les valeurs CIQUAL officielles
plus tard (swap de valeurs, schéma inchangé).

```ts
export type MacroRole = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit' | 'flavor';
// per_100 = Macros ; basis: 'dry' | 'raw' | undefined (tel quel)
export interface RecipeIngredientRef { name: string; unit: string; basis?: 'dry'|'raw'; per100g: Macros; }
export const RECIPE_INGREDIENTS: Record<string, RecipeIngredientRef> = { … };
```

### 1b. `Recipe` étendu (`lib/types.ts`, rétro-compatible)
```ts
export type RecipeObjective = 'cut' | 'maintain' | 'bulk';
export type RecipeSport = 'muscu' | 'endurance' | 'combats';

export interface Ingredient {
  // … existant (name, quantity_g, unit, food_id?) …
  ref?: string;          // → RECIPE_INGREDIENTS (équiv. food_id pour ces recettes)
  macro_role?: MacroRole;
  scalable?: boolean;    // défaut: true si macro_role ∈ {protein,carb,fat,dairy,fruit,flavor}, false si vegetable
}

export interface Recipe {
  // … existant …
  objectives?: RecipeObjective[];  // tag « Objectif »
  sports?: RecipeSport[];          // tag « Sport »
  rest_day_ok?: boolean;           // tag « récup jour off » — STOCKÉ, non utilisé (reporté : pas de notion jour de repos dans le profil)
  why_fr?: string;                 // « Pourquoi », affiché
  // restrictions_ok? : renseigné à la main pour les 10 (cf. §5)
}
```

Mapping à l'ingestion : `objectif` FR → `RecipeObjective` (perte_de_gras→cut,
maintien→maintain, prise_de_masse→bulk) ; `category` → tags repas
(petit_dej→breakfast, collation→snack, repas_complet→[lunch,dinner]) ;
`temps_min`→`prep_time_min` ; `recup_jour_repos`→`rest_day_ok`.

### 1c. `Meal` — porte les quantités ADAPTÉES (changement structurant)
Le scaling par ingrédient remplace le scalaire `portions`. Le `Meal` stocke la
liste d'ingrédients **avec quantités adaptées** + les macros résultantes :
```ts
export interface Meal {
  // … existant (id, day, meal_type, recipe, macros, status…) …
  adapted_ingredients?: Ingredient[]; // quantités ajustées par l'algo (source de vérité d'affichage/courses)
  portions?: number;                  // LEGACY : conservé pour les plans en cache ; déprécié
}
```
- Consommateurs (`RecipeDetail`, `MealCard`, `lib/shoppingList.ts`) lisent
  `adapted_ingredients` si présent, sinon repli `recipe.ingredients × portions`
  (rétro-compat plans en cache).
- `recipe` reste le **template canonique** (non muté) ; `adapted_ingredients` est
  l'instance pour ce repas.

## 2. Les 10 recettes (`lib/recipes.ts`)
- Transcrites à l'identique (ingrédients/qty/`macro_role`/`scalable`, étapes,
  `why`, macros). `validated_by_dietitian: false`.
- **IDs descriptifs du JSON** (`porridge_avoine_whey`, …) — pas de réutilisation
  des anciens `r0xx`. Conséquence assumée : favoris/overrides des comptes de test
  sur les anciennes recettes deviennent inertes (sans danger ; app en phase test).

| recette | id | repas | objectives | sports | rest_day | régimes OK |
|---|---|---|---|---|:-:|---|
| Porridge | porridge_avoine_whey | breakfast | bulk | muscu, endurance | ✓ | vegetarian, pescatarian, no_pork |
| Omelette | omelette_blancs_oeufs | breakfast | cut, maintain | muscu, combats | ✗ | vegetarian, pescatarian, no_pork |
| Skyr | bowl_skyr | snack | maintain | muscu, combats | ✓ | vegetarian, pescatarian, no_pork |
| Smoothie | smoothie_vegetal | snack | bulk | endurance | ✗ | vegetarian, pescatarian, no_pork, lactose_free |
| Poulet riz | poulet_riz_brocoli | lunch, dinner | bulk, maintain | muscu | ✗ | no_pork, lactose_free |
| Saumon | saumon_patate_douce | lunch, dinner | maintain | endurance, muscu | ✓ | pescatarian, no_pork, lactose_free, gluten_free |
| Dahl | dahl_lentilles | lunch, dinner | cut | endurance, combats | ✓ | vegetarian, pescatarian, no_pork, lactose_free, gluten_free |
| Bœuf wok | boeuf_wok_nouilles | lunch, dinner | bulk | combats, muscu | ✗ | no_pork, lactose_free |
| Tofu quinoa | tofu_quinoa | lunch, dinner | cut | combats, endurance | ✗ | vegetarian, pescatarian, no_pork, lactose_free |
| Cabillaud | cabillaud_boulgour | lunch, dinner | cut, maintain | endurance, combats | ✓ | pescatarian, no_pork, lactose_free |

## 3. Moteur — scaling par ingrédient (`lib/planEngine.ts`)

### Principe
Pour un repas et une cible (kcal, P, C, F) :
1. **Base fixe** = somme des macros des ingrédients `scalable:false` (légumes,
   aromates) — ne bougent jamais.
2. **Axes ajustables** = ingrédients `scalable:true` groupés par axe macro :
   - axe Protéines : `macro_role` protein (+ dairy)
   - axe Glucides : carb (+ fruit + flavor)
   - axe Lipides : fat
3. **Résolution** déterministe et bornée (coordonnée par coordonnée, priorité
   **Protéines → Lipides → Glucides** ; les protéines priment = muscle, les
   glucides absorbent le reliquat) : pour chaque axe, calculer le facteur qui
   referme l'écart de SA macro compte tenu des autres apports (fixes + autres
   axes), borné `[FACTOR_MIN, FACTOR_MAX]` (≈ 0,4–2,5), puis 1–2 passes de
   raffinement (les termes croisés sont faibles → convergence rapide).
4. **Réalisme** : arrondis propres par axe (protéines/glucides ~5 g, lipides ~1 g,
   liquides ~10 ml). Bornes par défaut au niveau `macro_role`.
   → *Option future* : champs `min`/`max`/`step` par ingrédient dans le schéma
   (utile pour le gros lot) ; pour l'instant, défauts par rôle.
5. **Sortie** : `adapted_ingredients` (quantités) + `macros` (recalculées depuis
   `RECIPE_INGREDIENTS`).

> Contrainte CLAUDE.md : déterministe, < 1 s, fallback toujours (jamais de plan
> vide ; si bornes empêchent d'atteindre la cible, on rend le meilleur effort).

### Sélection de recette ↔ scaling
Avec le scaling par ingrédient, presque toutes les recettes peuvent approcher la
cible → le **résidu d'erreur macro** (après scaling borné) sert de score de fit ;
la sélection est alors pilotée par :
1. protéines préférées (existant)
2. **needMatch (objectif + sport)** ← nouveau soft-matching
3. fibres (si sèche), variété, seed (existant)
4. résidu de fit macro + id (déterminisme)

`needMatch(recipe, profile)` = (objectives ∩ goalToObjectives(goal) ≠ ∅) +
(sports ∩ sportsToBuckets(profile.sports) ≠ ∅). Recette sans tags → 0, neutre.

Mappings : `goalToObjectives` (cut_aggressive/cut→[cut], recomp→[cut,maintain],
maintain→[maintain], lean_bulk/bulk→[bulk]) ; `sportsToBuckets`
(musculation→muscu, sports_combat→combats, course/velo/natation/marche/foot/
basket/tennis→endurance, hiit_crossfit→[muscu,endurance], sans sport→∅).

### Impact transversal (refactor)
Le passage `portions` → `adapted_ingredients` touche : `buildLocalPlan`,
`swapMeal`, `rebalanceCore`/`rebalanceDay`, `adaptDayOptions`, `resetTracking`
(toutes re-scalent désormais par ingrédient au lieu de re-choisir une portion),
`computeDailyTotals`/`effectiveMacros` (inchangés, lisent `meal.macros`).
Incrémenter `ENGINE_VERSION` → régénération auto des plans en cache.

## 4. Macros calculées depuis les ingrédients
Réutiliser/adapter `macrosFromIngredients`/`recipeMacrosPerPortion` pour lire
`RECIPE_INGREDIENTS` via `ref`. Source unique : changer une `qty` recalcule les
macros. (À terme, swap des valeurs vers CIQUAL officiel.)

## 5. Régimes — filtrage fiable
- `recipeAllowed` lit **`restrictions_ok` si présent (autoritaire)**, sinon repli
  mots-clés (`RESTRICTION_BLOCKLIST`) pour recettes legacy/perso. → corrige faux
  positifs (lait d'amande/coco) et faux négatifs (skyr, boulgour, nouilles).
- **Honnêteté « repas introuvable »** : si le filtrage vide le pool d'un type de
  repas, on garde le repli (jamais de plan vide) mais on **marque** le repas
  (`Meal.restriction_relaxed?: true`) → l'UI prévient (« aucune recette sans
  lactose pour le petit-déj, voici une option standard »).

## 6. UI (`components/RecipeDetail.tsx`, `components/MealCard.tsx`)
- `RecipeDetail` : badges **Objectif** + **Sport**, bloc **« Pourquoi »** (`why_fr`),
  ingrédients aux **quantités adaptées** (lecture `adapted_ingredients`).
- `MealCard` : badge léger optionnel + avertissement régime relâché.
- `useTheme()` + `makeStyles(t)`, aucune couleur en dur (CLAUDE.md §8).

## 7. Tests & doc
- `recipes.test.ts` : 10 recettes ; invariants : cohérence
  macros↔ingrédients (±2 %), `objectives`/`sports`/`macro_role`/`scalable`
  présents, `restrictions_ok` valides, pool non vide par type de repas, chaque
  `ref` existe dans `RECIPE_INGREDIENTS`.
- `planEngine.test.ts` : scaling par ingrédient (légumes fixes, axes bornés,
  cible approchée, déterminisme, < garde-fous), soft-matching (le sport oriente),
  filtrage régime exact (smoothie OK sans lactose), repli « repas introuvable »
  signalé, recalage/swap re-scalent par ingrédient.
- `shoppingList.test.ts` : agrégation depuis `adapted_ingredients` (cru/sec).
- `AGENTS.md` : nouveau modèle (table d'ingrédients, scaling par ingrédient,
  soft-matching), trous connus.

## 8. Hors-scope (acté pour plus tard)
- Valeurs **CIQUAL officielles** (swap des `per100g`).
- Notion « jour de repos » dans le profil → activation de `rest_day_ok`.
- Champs `min`/`max`/`step` par ingrédient (réalisme fin) si besoin avec le lot.
- Le **gros lot** de recettes (fourni par le fondateur) → variété, couverture
  régimes, précision basse densité.

## Ordre d'implémentation (à la réception du gros lot → `writing-plans`)
1. Table `RECIPE_INGREDIENTS` + types (`MacroRole`, `Recipe`/`Ingredient`/`Meal` étendus).
2. Ingestion des recettes (10 + lot) → `recipes.ts`.
3. Calcul macros depuis ingrédients.
4. Moteur : scaler par ingrédient (axes, bornes, arrondis) + needMatch + lecture `restrictions_ok` + bump `ENGINE_VERSION`.
5. Refactor consommateurs `portions` → `adapted_ingredients` (display, courses, recalage, swap, adapt, reset).
6. Repli régime honnête + UI badges/Pourquoi/avertissement.
7. Tests (maj + nouveaux) → `npm test` vert.
8. `AGENTS.md`.
