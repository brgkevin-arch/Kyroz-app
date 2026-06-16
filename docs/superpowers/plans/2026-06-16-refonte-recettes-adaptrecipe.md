# Refonte recettes (100) + adaptRecipe (scaling par ingrédient) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les 50 recettes placeholder par les 100 recettes du fondateur (format `recettes-kyroz-100.json`), et faire passer le moteur d'un scaling de portion global à un **scaling par ingrédient** (`adaptRecipe`) qui vise les cibles macro du profil sans toucher aux légumes/aromates.

**Architecture :** Le JSON est committé comme asset brut. Un loader le mappe vers les types internes (`Recipe`/`Ingredient` étendus). `adaptRecipe` (algo du fondateur) ajuste les quantités scalables par axe macro vers une cible repas calculée depuis les cibles EXISTANTES du profil (un seul cerveau macro). Le moteur sélectionne la recette via les `flags` d'`adaptRecipe` + un soft-matching objectif/sport. Le `Meal` porte les quantités adaptées, lues par l'affichage, les courses et le garde-manger.

**Tech Stack :** TypeScript strict, React Native (Expo Router SDK 56), Vitest (`npm test` dans `kyroz-app/`). Import JSON via Metro/Vitest.

**Spec de référence :** `docs/superpowers/specs/2026-06-16-refonte-recettes-soft-matching-design.md`

**Conventions :**
- Toutes les commandes se lancent depuis `kyroz-app/` (`cd kyroz-app`).
- Tests : `npx vitest run <chemin>` pour un fichier, `npm test` pour tout.
- Macros internes = `Macros { kcal, protein_g, carbs_g, fat_g }`. Le JSON utilise `{ kcal, protein, carbs, fat }` → le loader convertit.
- Commits fréquents, un par tâche.

---

## File Structure

**Créés :**
- `lib/data/recettes-kyroz-100.json` — asset brut (bytes du fondateur + 2 corrections de données).
- `lib/recipeData.ts` — charge le JSON : `RECIPE_INGREDIENTS`, `RECIPE_CONFIG`, `RAW_RECIPES`, `macrosForRefIngredients()`.
- `lib/recipeDiet.ts` — classification diététique par `ref` → dérive `restrictions_ok`.
- `lib/recipeMap.ts` — mappe `RAW_RECIPES` (JSON FR) → `Recipe[]` internes.
- `lib/adaptRecipe.ts` — l'algorithme de scaling par ingrédient + `goalToObjectives`/`sportsToBuckets`/`needMatch`.
- `lib/__tests__/recipeData.test.ts`, `adaptRecipe.test.ts`, `recipeMap.test.ts` — nouveaux tests.

**Modifiés :**
- `lib/types.ts` — `MacroRole`, `RecipeObjective`, `RecipeSport`, `AdaptFlag` ; champs sur `Ingredient`/`Recipe`/`Meal`.
- `lib/recipes.ts` — `RECIPES` (depuis `recipeMap`) remplace `RECIPES_PLACEHOLDER` ; registre d'overrides conservé.
- `lib/planEngine.ts` — sélection par `adaptRecipe`+flags, `computeMealTarget` bridge, refactor `buildLocalPlan`/`swapMeal`/`rebalanceCore`/`resetTracking`.
- `lib/shoppingList.ts`, `lib/pantry.ts`, `lib/fiber.ts` — lecture des quantités adaptées.
- `components/RecipeDetail.tsx`, `components/MealCard.tsx`, `app/(tabs)/plan.tsx` — affichage adapté + badges/Pourquoi/avertissements.
- `lib/__tests__/recipes.test.ts`, `planEngine.test.ts`, `shoppingList.test.ts` — mises à jour.
- `AGENTS.md` — nouvel état.

---

## Phase 0 — Données : asset + table d'ingrédients + config

### Task 0.1 : Committer l'asset JSON (avec les 2 corrections)

**Files:**
- Create: `kyroz-app/lib/data/recettes-kyroz-100.json`

- [ ] **Step 1 : Créer le fichier** avec le contenu EXACT du JSON `recettes-kyroz-100.json` fourni par le fondateur (les blocs `_meta`, `enums`, `ingredients_reference`, `recipes` [100], `config`), **avec ces 2 corrections appliquées** :
  1. **rep57** (`Chili dinde – haricots – riz`) : ajouter dans `ingredients` l'entrée
     `{ "ref": "huile_olive", "qty": 8, "macro_role": "fat", "scalable": true }`,
     puis recalculer `macros_per_serving` (huile 8 g = +72 kcal, +8 g fat → `{ kcal: 637, protein: 58, carbs: 70, fat: 12 }`).
  2. **recomp_flag** : ajouter `"recomp_flag": "low_protein_density"` aux recettes
     **rep10, rep14, rep29, rep54** (comme rep03).

- [ ] **Step 2 : Vérifier que le JSON parse**

Run: `cd kyroz-app && node -e "const d=require('./lib/data/recettes-kyroz-100.json'); console.log(d.recipes.length, Object.keys(d.ingredients_reference).length, !!d.config)"`
Expected: `100 <N> true` (N = nombre d'ingrédients de référence)

- [ ] **Step 3 : Commit**

```bash
cd kyroz-app && git add lib/data/recettes-kyroz-100.json && git commit -m "feat(recettes): asset JSON 100 recettes + config (rep57 +gras, recomp_flag)"
```

---

### Task 0.2 : Loader `recipeData.ts` (ingredients_reference, config, macros depuis ref)

**Files:**
- Create: `kyroz-app/lib/recipeData.ts`
- Test: `kyroz-app/lib/__tests__/recipeData.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// lib/__tests__/recipeData.test.ts
import { describe, it, expect } from 'vitest';
import { RECIPE_INGREDIENTS, RECIPE_CONFIG, RAW_RECIPES, macrosForRefIngredients } from '../recipeData';

describe('recipeData', () => {
  it('charge 100 recettes brutes', () => {
    expect(RAW_RECIPES).toHaveLength(100);
  });
  it('chaque ingrédient de chaque recette a un ref existant dans la table', () => {
    for (const r of RAW_RECIPES)
      for (const ing of r.ingredients)
        expect(RECIPE_INGREDIENTS[ing.ref], `${r.id}:${ing.ref}`).toBeDefined();
  });
  it('config expose les champs utilisés par adaptRecipe', () => {
    expect(RECIPE_CONFIG.rounding_step_g).toBeGreaterThan(0);
    expect(RECIPE_CONFIG.protein_floor_tolerance).toBeGreaterThan(0);
    expect(RECIPE_CONFIG.scaling_factors_by_role.protein).toBeDefined();
  });
  it('macrosForRefIngredients calcule depuis per100g', () => {
    // 100 g de poulet_filet = ses macros /100 g
    const ref = Object.keys(RECIPE_INGREDIENTS).find((k) => k === 'poulet_filet')!;
    const m = macrosForRefIngredients([{ ref, qty: 100 }]);
    expect(m.kcal).toBe(RECIPE_INGREDIENTS[ref].per100g.kcal);
    expect(m.protein_g).toBe(RECIPE_INGREDIENTS[ref].per100g.protein_g);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `cd kyroz-app && npx vitest run lib/__tests__/recipeData.test.ts`
Expected: FAIL (`Cannot find module '../recipeData'`)

- [ ] **Step 3 : Implémenter `recipeData.ts`**

```ts
// lib/recipeData.ts
import { Macros, MacroRole } from './types';
import raw from './data/recettes-kyroz-100.json';

// ── Table d'ingrédients (rôle = type Food, valeurs /100 g) ────────────────────
// Source : recettes-kyroz-100.json (estimations CIQUAL — à remplacer par le CSV
// officiel avant prod). Le JSON utilise {kcal,protein,carbs,fat} ; on convertit
// vers Macros interne {kcal,protein_g,carbs_g,fat_g}.
export interface RecipeIngredientRef {
  name: string;
  unit: 'g' | 'ml';
  basis?: 'dry' | 'raw';
  per100g: Macros;
  abs_max_qty?: number;
}

type Per100 = { kcal: number; protein: number; carbs: number; fat: number };
const toMacros = (p: Per100): Macros => ({ kcal: p.kcal, protein_g: p.protein, carbs_g: p.carbs, fat_g: p.fat });

export const RECIPE_INGREDIENTS: Record<string, RecipeIngredientRef> = Object.fromEntries(
  Object.entries(raw.ingredients_reference as Record<string, any>).map(([k, v]) => [
    k,
    { name: v.name, unit: v.unit, basis: v.basis, per100g: toMacros(v.per_100), abs_max_qty: v.abs_max_qty },
  ]),
);

// ── Config d'adaptation ──────────────────────────────────────────────────────
export type ObjectiveFr = 'perte_de_gras' | 'maintien' | 'prise_de_masse';
export interface ObjectiveProfile {
  protein_g_per_kg: number;
  carb_fat_split: { carb: number; fat: number };
  calorie_modifier: number;
}
export interface RecipeConfig {
  objective_profiles: Record<ObjectiveFr, ObjectiveProfile>;
  meal_weights: Record<string, number>;
  scaling_factors_by_role: Partial<Record<MacroRole, [number, number]>>;
  rounding_step_g: number;
  protein_floor_tolerance: number;
  no_fat_increase_in_deficit?: boolean;
}
export const RECIPE_CONFIG: RecipeConfig = raw.config as RecipeConfig;

// ── Recettes brutes (forme JSON, non mappée) ─────────────────────────────────
export interface RawIngredient { ref: string; qty: number; macro_role: MacroRole; scalable: boolean }
export interface RawRecipe {
  id: string; name: string; category: 'petit_dej' | 'collation' | 'repas_complet';
  base_servings: number;
  tags: { objectif: ObjectiveFr[]; recup_jour_repos: boolean; sport: ('muscu'|'endurance'|'combats')[]; temps_min: number };
  ingredients: RawIngredient[]; instructions: string[]; why: string;
  macros_per_serving: Per100; recomp_flag?: string;
}
export const RAW_RECIPES: RawRecipe[] = raw.recipes as RawRecipe[];

/** Macros (Macros interne) d'une liste {ref, qty} via RECIPE_INGREDIENTS. Non arrondi. */
export function macrosForRefIngredients(items: { ref: string; qty: number }[]): Macros {
  const sum: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const { ref, qty } of items) {
    const r = RECIPE_INGREDIENTS[ref];
    if (!r) continue;
    const k = Math.max(0, qty) / 100;
    sum.kcal += r.per100g.kcal * k;
    sum.protein_g += r.per100g.protein_g * k;
    sum.carbs_g += r.per100g.carbs_g * k;
    sum.fat_g += r.per100g.fat_g * k;
  }
  return sum;
}
```

- [ ] **Step 4 : Activer l'import JSON (si nécessaire)** — vérifier que `tsconfig.json` a `"resolveJsonModule": true`. S'il manque, l'ajouter sous `compilerOptions`.

Run: `cd kyroz-app && node -e "const t=require('./tsconfig.json'); console.log(t.compilerOptions && t.compilerOptions.resolveJsonModule)"`
Si `undefined`/`false` → ajouter `"resolveJsonModule": true` dans `compilerOptions` de `tsconfig.json`.

- [ ] **Step 5 : Lancer le test, vérifier le succès**

Run: `cd kyroz-app && npx vitest run lib/__tests__/recipeData.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6 : Commit**

```bash
cd kyroz-app && git add lib/recipeData.ts lib/__tests__/recipeData.test.ts tsconfig.json && git commit -m "feat(recettes): loader recipeData (ingrédients, config, macros depuis ref)"
```

---

## Phase 1 — Types

### Task 1.1 : Étendre les types

**Files:**
- Modify: `kyroz-app/lib/types.ts`

- [ ] **Step 1 : Ajouter les types macro/recette** après la définition de `Macros` (vers la ligne 67) :

```ts
// Rôle macro d'un ingrédient (pilote le scaling par ingrédient — cf. adaptRecipe).
export type MacroRole = 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable' | 'fruit' | 'flavor';

// Tags « besoin » des recettes (soft-matching).
export type RecipeObjective = 'cut' | 'maintain' | 'bulk';
export type RecipeSport = 'muscu' | 'endurance' | 'combats';

// Faisabilité d'une recette adaptée à une cible repas (cf. adaptRecipe).
export type AdaptFlag = 'protein_below_target' | 'over_target_kcal' | 'under_target_kcal' | 'no_protein_anchor';
```

- [ ] **Step 2 : Étendre `Ingredient`** (ajouter les 3 champs optionnels) :

```ts
export interface Ingredient {
  name: string;
  quantity_g: number;
  unit?: string;
  food_id?: string;
  ref?: string;            // → RECIPE_INGREDIENTS (clé d'ingrédient des recettes Kyroz)
  macro_role?: MacroRole;  // rôle pour le scaling par ingrédient
  scalable?: boolean;      // false = quantité fixe (légumes, aromates)
}
```

- [ ] **Step 3 : Étendre `Recipe`** (ajouter après `validated_by_dietitian`) :

```ts
  objectives?: RecipeObjective[];   // tag « Objectif »
  sports?: RecipeSport[];           // tag « Sport »
  rest_day_ok?: boolean;            // tag « récup jour off » (stocké, non utilisé)
  why_fr?: string;                  // « Pourquoi », affiché
  recomp_flag?: string;             // ex. 'low_protein_density'
```

- [ ] **Step 4 : Étendre `Meal`** (ajouter après `locked_macros`) :

```ts
  adapted_ingredients?: Ingredient[]; // quantités ajustées (source de vérité affichage/courses)
  adapt_flags?: AdaptFlag[];          // faisabilité de l'adaptation
  restriction_relaxed?: boolean;      // repli régime : recette servie hors restriction
```

- [ ] **Step 5 : Vérifier la compilation des types**

Run: `cd kyroz-app && npx tsc --noEmit`
Expected: PASS (aucune erreur introduite par ces ajouts — champs optionnels).

- [ ] **Step 6 : Commit**

```bash
cd kyroz-app && git add lib/types.ts && git commit -m "feat(types): MacroRole/RecipeObjective/RecipeSport/AdaptFlag + champs recette/repas"
```

---

## Phase 2 — adaptRecipe (l'algorithme) + mappings besoin

### Task 2.1 : `adaptRecipe` + helpers de mapping (TDD)

**Files:**
- Create: `kyroz-app/lib/adaptRecipe.ts`
- Test: `kyroz-app/lib/__tests__/adaptRecipe.test.ts`

**Note d'intégration (bridge acté dans la spec) :** l'algorithme du fondateur est repris **tel quel** (buckets ancres/fills/fixes, plancher protéique `kp≥1`, scaleBucket carb/fat, récupération protéique, arrondi, flags). Seule différence : `split` (carb/fat) et `deficit` sont **calculés par l'appelant** (depuis les cibles du profil) et passés en paramètres, au lieu d'être lus dans `config.objective_profiles` — c'est le « un seul cerveau macro » décidé en spec. Les autres réglages (`scaling_factors_by_role`, `rounding_step_g`, `protein_floor_tolerance`, `no_fat_increase_in_deficit`, `abs_max_qty`) viennent de `RECIPE_CONFIG`/`RECIPE_INGREDIENTS`.

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// lib/__tests__/adaptRecipe.test.ts
import { describe, it, expect } from 'vitest';
import { adaptRecipe, goalToObjectives, sportsToBuckets, needMatch } from '../adaptRecipe';
import { Recipe } from '../types';

// Recette de test minimale (refs réels de la table).
const poulet: Recipe = {
  id: 't_poulet', name_fr: 'Poulet riz brocoli', prep_time_min: 25, portions: 1,
  macros_per_portion: { kcal: 655, protein_g: 53, carbs_g: 70, fat_g: 16 },
  ingredients: [
    { name: 'Filet de poulet', quantity_g: 180, ref: 'poulet_filet', macro_role: 'protein', scalable: true },
    { name: 'Riz basmati', quantity_g: 80, ref: 'riz_basmati', macro_role: 'carb', scalable: true },
    { name: 'Brocoli', quantity_g: 200, ref: 'brocoli', macro_role: 'vegetable', scalable: false },
    { name: "Huile d'olive", quantity_g: 10, ref: 'huile_olive', macro_role: 'fat', scalable: true },
  ],
  steps: ['...'], tags: ['lunch', 'dinner'], validated_by_dietitian: false,
};
const target = { kcalMeal: 600, proteinMeal: 50, split: { carb: 0.6, fat: 0.4 }, deficit: false };

describe('adaptRecipe', () => {
  it('garde les ingrédients non-scalables (légumes) fixes', () => {
    const res = adaptRecipe(poulet, target);
    const broc = res.ingredients.find((i) => i.ref === 'brocoli')!;
    expect(broc.quantity_g).toBe(200);
  });
  it('atteint ~la cible protéines (≥ tolérance)', () => {
    const res = adaptRecipe(poulet, target);
    expect(res.macros.protein_g).toBeGreaterThanOrEqual(50 * 0.95 - 1);
  });
  it('recalcule des macros cohérentes depuis les grammes', () => {
    const res = adaptRecipe(poulet, target);
    const calc = res.macros.protein_g * 4 + res.macros.carbs_g * 4 + res.macros.fat_g * 9;
    expect(Math.abs(calc - res.macros.kcal) / res.macros.kcal).toBeLessThan(0.12);
  });
  it('ne réduit jamais la protéine sous la recette de base (plancher recomp)', () => {
    // cible protéines basse → l'ancre poulet reste ≥ sa qty de base
    const res = adaptRecipe(poulet, { ...target, proteinMeal: 10 });
    const p = res.ingredients.find((i) => i.ref === 'poulet_filet')!;
    expect(p.quantity_g).toBeGreaterThanOrEqual(180);
  });
  it('flag under_target_kcal quand la recette ne peut pas atteindre une grosse cible', () => {
    const res = adaptRecipe(poulet, { ...target, kcalMeal: 1400, proteinMeal: 60 });
    expect(res.flags).toContain('under_target_kcal');
  });
});

describe('mappings besoin', () => {
  it('goalToObjectives mappe les 6 objectifs vers 3 buckets', () => {
    expect(goalToObjectives('cut')).toEqual(['cut']);
    expect(goalToObjectives('recomp')).toEqual(['cut', 'maintain']);
    expect(goalToObjectives('bulk')).toEqual(['bulk']);
  });
  it('sportsToBuckets mappe les SportType', () => {
    expect(sportsToBuckets([{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }])).toContain('muscu');
    expect(sportsToBuckets([{ type: 'sports_combat', sessions_per_week: 2, minutes_per_session: 60 }])).toContain('combats');
  });
  it('needMatch compte objectif + sport', () => {
    const r: Recipe = { ...poulet, objectives: ['bulk'], sports: ['muscu'] };
    const n = needMatch(r, ['bulk'], ['muscu']);
    expect(n).toBe(2);
    expect(needMatch({ ...poulet }, ['bulk'], ['muscu'])).toBe(0); // pas de tags → neutre
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `cd kyroz-app && npx vitest run lib/__tests__/adaptRecipe.test.ts`
Expected: FAIL (`Cannot find module '../adaptRecipe'`)

- [ ] **Step 3 : Implémenter `adaptRecipe.ts`**

```ts
// lib/adaptRecipe.ts
import { AdaptFlag, Goal, Ingredient, Macros, Recipe, SportSession, RecipeObjective, RecipeSport } from './types';
import { RECIPE_CONFIG, RECIPE_INGREDIENTS, macrosForRefIngredients } from './recipeData';

export interface AdaptTarget {
  kcalMeal: number;
  proteinMeal: number;
  split: { carb: number; fat: number };
  deficit: boolean;
}
export interface AdaptResult {
  ingredients: Ingredient[]; // copie de recipe.ingredients avec quantity_g ajusté
  macros: Macros;
  flags: AdaptFlag[];
}

const per100 = (ref: string) => RECIPE_INGREDIENTS[ref]?.per100g ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
const proteinPer100 = (ref: string) => per100(ref).protein_g;
const kcalPer100 = (ref: string) => per100(ref).kcal;
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
 * Algorithme du fondateur (scaling ciblé macro, plancher protéique). `split` et
 * `deficit` sont fournis par l'appelant (bridge vers les cibles du profil) ;
 * le reste des réglages vient de RECIPE_CONFIG.
 */
export function adaptRecipe(recipe: Recipe, target: AdaptTarget): AdaptResult {
  const cfg = RECIPE_CONFIG;
  const flags: AdaptFlag[] = [];
  const items = recipe.ingredients.map((i) => ({ ...i })); // copie mutable
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
  const anchorM = macrosOf(anchors);

  // 3. kcal restantes
  const remaining = target.kcalMeal - fixedM.kcal - anchorM.kcal;

  // 4. Répartition carb/fat selon le split
  const carbBucket = fills.filter((i) => ['carb', 'fruit', 'dairy'].includes(i.macro_role as string));
  const fatBucket = fills.filter((i) => i.macro_role === 'fat');
  const scaleBucket = (bucket: Ingredient[], kcalTarget: number, maxFactor: number | null) => {
    const baseK = bucket.reduce((s, i) => s + (kcalPer100(i.ref!) * i.quantity_g) / 100, 0);
    if (baseK <= 0) return;
    let factor = kcalTarget / baseK;
    if (maxFactor != null) factor = Math.min(factor, maxFactor);
    for (const i of bucket) {
      const b = bounds(i);
      out.set(i, Math.min(Math.max(i.quantity_g * factor, b.min), b.max));
    }
  };
  let carbShare = remaining * target.split.carb;
  let fatShare = remaining * target.split.fat;
  if (carbBucket.length === 0) { fatShare += carbShare; carbShare = 0; }
  if (fatBucket.length === 0) { carbShare += fatShare; fatShare = 0; }
  scaleBucket(carbBucket, Math.max(0, carbShare), null);
  const fatCap = target.deficit && cfg.no_fat_increase_in_deficit !== false ? 1.0 : null;
  scaleBucket(fatBucket, Math.max(0, fatShare), fatCap);

  // 4.5 Récupération protéique (remonte les ancres dans leurs bornes si sous le plancher)
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
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `cd kyroz-app && npx vitest run lib/__tests__/adaptRecipe.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5 : Commit**

```bash
cd kyroz-app && git add lib/adaptRecipe.ts lib/__tests__/adaptRecipe.test.ts && git commit -m "feat(moteur): adaptRecipe (scaling par ingrédient) + mappings besoin"
```

---

## Phase 3 — Mapping JSON → Recipe[] + régimes

### Task 3.1 : Classification diététique par ingrédient

**Files:**
- Create: `kyroz-app/lib/recipeDiet.ts`

- [ ] **Step 1 : Implémenter `recipeDiet.ts`** — une table `ref → restrictions VIOLÉES`, et `restrictionsOkFor(refs)` qui renvoie les régimes compatibles. (Pas de test isolé : validé par `recipeMap.test.ts` en Task 3.2.)

```ts
// lib/recipeDiet.ts
import { DietaryRestriction } from './types';

const ALL: DietaryRestriction[] = ['vegetarian', 'pescatarian', 'no_pork', 'lactose_free', 'gluten_free'];

// Pour chaque ref, la liste des restrictions qu'il EMPÊCHE (incompatibilités).
// Tout ref absent d'ici = compatible avec tout (légumes, fruits, huile…).
const VIOLATIONS: Record<string, DietaryRestriction[]> = {
  // viandes terrestres → pas végé, pas pesc
  poulet_filet: ['vegetarian', 'pescatarian'], dinde_escalope: ['vegetarian', 'pescatarian'],
  boeuf_5: ['vegetarian', 'pescatarian'], boeuf_bavette: ['vegetarian', 'pescatarian'],
  porc_filet: ['vegetarian', 'pescatarian', 'no_pork'], jambon_blanc: ['vegetarian', 'pescatarian', 'no_pork'],
  // poissons / fruits de mer → pas végé (pesc OK)
  saumon: ['vegetarian'], saumon_fume: ['vegetarian'], cabillaud: ['vegetarian'], thon_frais: ['vegetarian'],
  thon_naturel: ['vegetarian'], maquereau: ['vegetarian'], sardines: ['vegetarian'], crevettes: ['vegetarian'],
  // laitiers → pas sans lactose
  skyr: ['lactose_free'], fromage_blanc_0: ['lactose_free'], yaourt_grec: ['lactose_free'],
  cottage_cheese: ['lactose_free'], whey: ['lactose_free'], lait_demi_ecreme: ['lactose_free'],
  mozzarella: ['lactose_free'], feta: ['lactose_free'], parmesan: ['lactose_free'],
  // gluten → pas sans gluten (avoine = non certifiée ; sauce soja = blé)
  flocons_avoine: ['gluten_free'], pain_complet: ['gluten_free'], pain_seigle: ['gluten_free'],
  pates_completes: ['gluten_free'], pates_semoule: ['gluten_free'], nouilles_completes: ['gluten_free'],
  boulgour: ['gluten_free'], semoule_couscous: ['gluten_free'], tortilla_complete: ['gluten_free'],
  pain_pita_complet: ['gluten_free'], seitan: ['gluten_free', 'vegetarian'].filter((x) => x !== 'vegetarian') as DietaryRestriction[],
  sauce_soja: ['gluten_free'],
  // note : tofu/tempeh/quinoa/riz/maïs/polenta/nouilles_riz/galette_riz = sans gluten ;
  // lait_amande/lait_coco/creme_soja = NON laitiers (compatibles lactose_free).
};
// seitan = blé (gluten) mais végétal → seulement gluten_free :
VIOLATIONS.seitan = ['gluten_free'];

/** Régimes compatibles avec un ensemble de refs (= aucun ref ne les viole). */
export function restrictionsOkFor(refs: string[]): DietaryRestriction[] {
  const violated = new Set<DietaryRestriction>();
  for (const ref of refs) for (const v of VIOLATIONS[ref] ?? []) violated.add(v);
  return ALL.filter((r) => !violated.has(r));
}
```

- [ ] **Step 2 : Compilation**

Run: `cd kyroz-app && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3 : Commit**

```bash
cd kyroz-app && git add lib/recipeDiet.ts && git commit -m "feat(recettes): classification diététique par ingrédient (restrictions_ok exact)"
```

---

### Task 3.2 : Mapper RAW_RECIPES → Recipe[]

**Files:**
- Create: `kyroz-app/lib/recipeMap.ts`
- Test: `kyroz-app/lib/__tests__/recipeMap.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// lib/__tests__/recipeMap.test.ts
import { describe, it, expect } from 'vitest';
import { RECIPES } from '../recipeMap';

describe('recipeMap (JSON → Recipe)', () => {
  it('mappe les 100 recettes', () => expect(RECIPES).toHaveLength(100));

  it('ids uniques', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('category → tags repas', () => {
    const pd = RECIPES.find((r) => r.id === 'pd01')!;
    expect(pd.tags).toContain('breakfast');
    const rep = RECIPES.find((r) => r.id === 'rep01')!;
    expect(rep.tags).toEqual(expect.arrayContaining(['lunch', 'dinner']));
    const col = RECIPES.find((r) => r.id === 'col01')!;
    expect(col.tags).toContain('snack');
  });

  it('objectif FR → RecipeObjective', () => {
    const r = RECIPES.find((r) => r.id === 'pd04')!; // perte_de_gras, maintien
    expect(r.objectives).toEqual(expect.arrayContaining(['cut', 'maintain']));
  });

  it('ingrédients : ref/macro_role/scalable + nom depuis la table', () => {
    const r = RECIPES.find((r) => r.id === 'rep01')!;
    const poulet = r.ingredients.find((i) => i.ref === 'poulet_filet')!;
    expect(poulet.macro_role).toBe('protein');
    expect(poulet.scalable).toBe(true);
    expect(poulet.name).toBe('Filet de poulet');
    expect(poulet.quantity_g).toBe(180);
  });

  it('macros cohérentes avec les ingrédients (±2%) sur les 100', () => {
    const { macrosForRefIngredients } = require('../recipeData');
    for (const r of RECIPES) {
      const m = macrosForRefIngredients(r.ingredients.map((i: any) => ({ ref: i.ref, qty: i.quantity_g })));
      const e = Math.abs(m.kcal - r.macros_per_portion.kcal) / r.macros_per_portion.kcal;
      expect(e, r.id).toBeLessThan(0.02);
    }
  });

  it('chaque repas_complet a un ingrédient fat (axe lipides présent)', () => {
    const reps = RECIPES.filter((r) => r.tags.includes('lunch'));
    for (const r of reps)
      expect(r.ingredients.some((i) => i.macro_role === 'fat'), r.id).toBe(true);
  });

  it('restrictions_ok dérivées : smoothie végétal sans lactose, dahl sans gluten', () => {
    const dahl = RECIPES.find((r) => r.id === 'rep03')!;
    expect(dahl.restrictions_ok).toEqual(expect.arrayContaining(['vegetarian', 'gluten_free', 'lactose_free']));
  });

  it('couverture petit-déj sans lactose ≥ 3 (trou des 10 comblé)', () => {
    const pdLacto = RECIPES.filter((r) => r.tags.includes('breakfast') && r.restrictions_ok?.includes('lactose_free'));
    expect(pdLacto.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `cd kyroz-app && npx vitest run lib/__tests__/recipeMap.test.ts`
Expected: FAIL (`Cannot find module '../recipeMap'`)

- [ ] **Step 3 : Implémenter `recipeMap.ts`**

```ts
// lib/recipeMap.ts
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
    restrictions_ok: restrictionsOkFor(ingredients.map((i) => i.ref!)),
    objectives: raw.tags.objectif.map((o) => OBJ_FR_TO_INTERNAL[o]),
    sports: raw.tags.sport,
    rest_day_ok: raw.tags.recup_jour_repos,
    why_fr: raw.why,
    recomp_flag: raw.recomp_flag,
    validated_by_dietitian: false,
  };
});
```

- [ ] **Step 4 : Lancer, vérifier le succès** (le test « macros ±2% » valide aussi la transcription du JSON)

Run: `cd kyroz-app && npx vitest run lib/__tests__/recipeMap.test.ts`
Expected: PASS (9 tests). **Si « macros ±2% » échoue sur un id**, comparer cet id au JSON du message du fondateur (erreur de transcription dans l'asset) et corriger `lib/data/recettes-kyroz-100.json`.

- [ ] **Step 5 : Commit**

```bash
cd kyroz-app && git add lib/recipeMap.ts lib/__tests__/recipeMap.test.ts && git commit -m "feat(recettes): mapping JSON → Recipe[] + restrictions_ok dérivées"
```

---

### Task 3.3 : Brancher `RECIPES` dans `recipes.ts` (remplacer les 50 placeholders)

**Files:**
- Modify: `kyroz-app/lib/recipes.ts`
- Modify: `kyroz-app/lib/__tests__/recipes.test.ts`

- [ ] **Step 1 : Mettre à jour le test d'intégrité** — remplacer le bloc `describe('intégrité de la base de recettes', …)` et les imports pour cibler `RECIPES` (100), et ajouter les invariants tags/rôles :

```ts
// en tête : remplacer RECIPES_PLACEHOLDER par RECIPES dans l'import
import {
  RECIPES, setRecipeOverrides, getEffectiveRecipes, getRecipeById,
  getBaseRecipe, isOverridden,
} from '../recipes';
// … (dans les describe existants, remplacer RECIPES_PLACEHOLDER par RECIPES) …

describe('intégrité de la base de recettes', () => {
  it('100 recettes, ids uniques', () => {
    expect(RECIPES).toHaveLength(100);
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('macros énergétiquement cohérentes (4/4/9 à ±12%)', () => {
    for (const r of RECIPES) {
      const m = r.macros_per_portion;
      const calc = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
      expect(Math.abs(calc - m.kcal) / m.kcal, `${r.id} ${r.name_fr}`).toBeLessThan(0.12);
    }
  });
  it('chaque recette a tags repas, objectives, sports, ingrédients (ref+rôle) et étapes', () => {
    for (const r of RECIPES) {
      expect(r.tags.length, r.id).toBeGreaterThan(0);
      expect((r.objectives ?? []).length, r.id).toBeGreaterThan(0);
      expect((r.sports ?? []).length, r.id).toBeGreaterThan(0);
      expect(r.ingredients.length, r.id).toBeGreaterThan(0);
      for (const ing of r.ingredients) {
        expect(ing.ref, `${r.id} ingrédient sans ref`).toBeTruthy();
        expect(ing.macro_role, `${r.id} ${ing.ref} sans rôle`).toBeTruthy();
      }
      expect(r.steps.length, r.id).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2 : Mettre à jour `recipes.ts`** — remplacer le tableau `RECIPES_PLACEHOLDER` (lignes 6–1044) par un ré-export de `RECIPES`, et ré-écrire les accesseurs en fonction de `RECIPES`. Garder le registre d'overrides inchangé.

```ts
// lib/recipes.ts (nouveau contenu complet)
import { Recipe } from './types';
import { RECIPES } from './recipeMap';

// Base de recettes Kyroz (100), mappée depuis lib/data/recettes-kyroz-100.json.
// validated_by_dietitian: false — à valider avant prod.
export { RECIPES };

// Compat : certains modules historiques importaient RECIPES_PLACEHOLDER.
export const RECIPES_PLACEHOLDER = RECIPES;

let recipeOverrides: Record<string, Recipe> = {};

export function setRecipeOverrides(map: Record<string, Recipe> | null | undefined): void {
  recipeOverrides = map ?? {};
}
export function getEffectiveRecipes(): Recipe[] {
  return RECIPES.map((r) => recipeOverrides[r.id] ?? r);
}
export function getRecipeById(id: string): Recipe | undefined {
  return recipeOverrides[id] ?? RECIPES.find((r) => r.id === id);
}
export function getBaseRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
export function isOverridden(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(recipeOverrides, id);
}
```

- [ ] **Step 3 : Lancer les tests recipes**

Run: `cd kyroz-app && npx vitest run lib/__tests__/recipes.test.ts`
Expected: PASS

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && git add lib/recipes.ts lib/__tests__/recipes.test.ts && git commit -m "feat(recettes): RECIPES (100) remplace les 50 placeholders"
```

---

## Phase 4 — Intégration moteur (sélection par adaptRecipe + bridge cibles)

### Task 4.1 : Cible repas (bridge) + sélection par adaptRecipe dans `buildLocalPlan`

**Files:**
- Modify: `kyroz-app/lib/planEngine.ts`
- Test: `kyroz-app/lib/__tests__/planEngine.test.ts`

**Contexte :** on remplace `bestPortionFor`/`deviationScore` (grille de portion) par : pour chaque recette candidate, `adaptRecipe(recipe, mealTarget)` → on score par les `flags` + l'écart kcal résiduel, puis on départage par `needMatch` → variété → fibres → seed. La cible repas vient des cibles du profil avec report de budget.

- [ ] **Step 1 : Écrire les tests qui échouent** (ajouter au fichier existant `planEngine.test.ts`)

```ts
// lib/__tests__/planEngine.test.ts — ajouts
import { describe, it, expect } from 'vitest';
import { buildLocalPlan } from '../planEngine';
import { UserProfile } from '../types';

function baseProfile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1', sex: 'male', age: 28, weight_kg: 80, height_cm: 180,
    activity_level: 'moderate', training_days_per_week: 4, goal: 'maintain',
    macro_mode: 'auto', tdee_kcal: 2600,
    target_kcal: 2600, target_protein_g: 160, target_carbs_g: 280, target_fat_g: 80,
    plan_days: 1, plan_weekdays: [1], meals: ['breakfast', 'lunch', 'dinner', 'snack'],
    meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [], max_prep_time_min: 60,
    ...over,
  };
}

describe('buildLocalPlan + adaptRecipe', () => {
  it('produit un plan complet avec quantités adaptées', () => {
    const plan = buildLocalPlan(baseProfile());
    expect(plan.meals).toHaveLength(4); // 1 jour × 4 repas
    for (const m of plan.meals) {
      expect(m.adapted_ingredients, m.id).toBeTruthy();
      expect(m.adapted_ingredients!.length).toBeGreaterThan(0);
      expect(m.macros.kcal).toBeGreaterThan(0);
    }
  });

  it('total du jour proche de la cible kcal (±12%)', () => {
    const p = baseProfile();
    const plan = buildLocalPlan(p);
    const dayKcal = plan.total_macros_per_day[0].kcal;
    expect(Math.abs(dayKcal - p.target_kcal) / p.target_kcal).toBeLessThan(0.12);
  });

  it('respecte les restrictions (végétarien : aucune viande/poisson)', () => {
    const plan = buildLocalPlan(baseProfile({ dietary_restrictions: ['vegetarian'] }));
    for (const m of plan.meals)
      expect(m.restriction_relaxed || m.recipe.restrictions_ok?.includes('vegetarian'), m.recipe.id).toBeTruthy();
  });

  it('soft-matching : à profil combats, privilégie une recette taguée combats quand dispo', () => {
    // déterministe (seed 0) ; on vérifie au moins qu'aucune erreur et plan complet
    const plan = buildLocalPlan(baseProfile({
      goal: 'cut', sports: [{ type: 'sports_combat', sessions_per_week: 3, minutes_per_session: 90 }],
      target_kcal: 2000, target_protein_g: 170, target_carbs_g: 180, target_fat_g: 60,
    }));
    expect(plan.meals.length).toBe(4);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `cd kyroz-app && npx vitest run lib/__tests__/planEngine.test.ts`
Expected: FAIL (les meals n'ont pas `adapted_ingredients`)

- [ ] **Step 3 : Refactorer `planEngine.ts`** — ajouter les imports, les helpers de cible/split/fit, et réécrire `selectMeal` + `buildLocalPlan`.

3a. Imports (en tête) :
```ts
import { adaptRecipe, AdaptTarget, goalToObjectives, sportsToBuckets, needMatch } from './adaptRecipe';
import { RECIPE_CONFIG } from './recipeData';
import { AdaptFlag, Ingredient } from './types';
```

3b. Split + deficit depuis le profil (ajouter après les constantes) :
```ts
// Split carb/fat visé par adaptRecipe = déduit des cibles du profil (respecte le
// mode percent) ; repli config si le profil n'a pas de ratios.
function profileSplit(profile: UserProfile): { carb: number; fat: number } {
  const carbK = 4 * (profile.target_carbs_g || 0);
  const fatK = 9 * (profile.target_fat_g || 0);
  if (carbK + fatK > 0) return { carb: carbK / (carbK + fatK), fat: fatK / (carbK + fatK) };
  const fr: Record<string, 'perte_de_gras' | 'maintien' | 'prise_de_masse'> = {
    cut_aggressive: 'perte_de_gras', cut: 'perte_de_gras', recomp: 'perte_de_gras',
    maintain: 'maintien', lean_bulk: 'prise_de_masse', bulk: 'prise_de_masse',
  };
  return RECIPE_CONFIG.objective_profiles[fr[profile.goal]].carb_fat_split;
}
const inDeficit = (p: UserProfile) => (p.target_kcal || 0) < (p.tdee_kcal || 0);

// Score de fit d'une recette adaptée vs la cible repas (plus petit = meilleur).
function fitScore(macros: Macros, target: AdaptTarget, flags: AdaptFlag[]): number {
  const kcalDev = Math.abs(macros.kcal - target.kcalMeal) / Math.max(target.kcalMeal, 1);
  let s = kcalDev;
  if (flags.includes('under_target_kcal')) s += 1;
  if (flags.includes('over_target_kcal')) s += 1;
  if (flags.includes('protein_below_target')) s += 1.2;
  if (flags.includes('no_protein_anchor')) s += 0.5;
  return s;
}
```

3c. Remplacer `selectMeal` par une version basée adaptRecipe (garde la logique variété/seed/fibres existante mais score = fit) :
```ts
interface AdaptedChoice {
  recipe: Recipe;
  ingredients: Ingredient[];
  macros: Macros;
  flags: AdaptFlag[];
  score: number;
  fiber: number;
  need: number;
}

function selectMealAdapted(
  pool: Recipe[],
  target: AdaptTarget,
  usage: Record<string, number>,
  variety: VarietyPreference,
  objectives: RecipeObjective[],
  sportBuckets: RecipeSport[],
  seed: number,
  fiberStrong: boolean,
): AdaptedChoice {
  const candidates: AdaptedChoice[] = pool.map((r) => {
    const a = adaptRecipe(r, target);
    return {
      recipe: r, ingredients: a.ingredients, macros: a.macros, flags: a.flags,
      score: fitScore(a.macros, target, a.flags),
      fiber: recipeFiberPerPortion(r), // fibres approximatives (départage)
      need: needMatch(r, objectives, sportBuckets),
    };
  }).sort((a, b) => a.score - b.score || a.recipe.id.localeCompare(b.recipe.id));

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
    if (a.need !== b.need) return b.need - a.need;             // 1) besoin (objectif+sport)
    if (fiberStrong) { const f = fiberCmp(a, b); if (f !== 0) return f; }
    if (variety !== 'repetitive') {
      const ua = usage[a.recipe.id] ?? 0, ub = usage[b.recipe.id] ?? 0;
      if (ua !== ub) return ua - ub;                            // 2) variété
    }
    if (!fiberStrong) { const f = fiberCmp(a, b); if (f !== 0) return f; }
    if (seed !== 0) {
      const ra = seededRank(seed, a.recipe.id), rb = seededRank(seed, b.recipe.id);
      if (ra !== rb) return ra - rb;
    }
    return a.score - b.score || a.recipe.id.localeCompare(b.recipe.id);
  });
  return pickable[0];
}
```

3d. Réécrire la boucle de `buildLocalPlan` (remplacer le corps de la boucle `mealTypes.forEach`) pour utiliser `selectMealAdapted` + écrire `adapted_ingredients`/`adapt_flags` sur le `Meal`. Le report de budget reste identique (remaining kcal/protein), et la cible passe en `AdaptTarget` :

```ts
  const objectives = goalToObjectives(profile.goal);
  const sportBuckets = sportsToBuckets(profile.sports);
  const split = profileSplit(profile);
  const deficit = inDeficit(profile);
  // … (avant la boucle des jours, garder pools/usage/distribution/totalWeight) …

  // dans la boucle des jours, remplacer la cible + le choix :
    mealTypes.forEach((mealType) => {
      const weight = distribution[mealType];
      const target: AdaptTarget = {
        kcalMeal: (Math.max(remainingKcal, 0) * weight) / remainingWeight,
        proteinMeal: (Math.max(remainingProtein, 0) * weight) / remainingWeight,
        split, deficit,
      };
      const choice = selectMealAdapted(pools[mealType], target, usage, variety, objectives, sportBuckets, seed, fiberStrong);
      usage[choice.recipe.id] = (usage[choice.recipe.id] ?? 0) + 1;
      remainingKcal -= choice.macros.kcal;
      remainingProtein -= choice.macros.protein_g;
      remainingWeight -= weight;
      meals.push({
        id: `${d}-${mealType}`, day: d, meal_type: mealType,
        recipe: choice.recipe, portions: 1,
        macros: choice.macros,
        adapted_ingredients: choice.ingredients,
        adapt_flags: choice.flags.length ? choice.flags : undefined,
      });
    });
```

(Supprimer la variable `remainingFat` / la cible `fat` de l'ancienne `MealTarget` dans `buildLocalPlan` ; le fat est désormais géré par le split dans `adaptRecipe`. Conserver `MealTarget`/`bestPortionFor`/`deviationScore` UNIQUEMENT s'ils servent encore à `rebalanceCore`/`swapMeal` — sinon ils seront remplacés en Phase 5.)

- [ ] **Step 4 : Marquer le repli régime honnête dans `poolFor`** — quand le pool filtré est vide et qu'on retombe sur le pool complet, le signaler. Modifier `poolFor` pour renvoyer aussi un drapeau, OU plus simple : exposer `poolRelaxed(mealType, profile): boolean` et, dans `buildLocalPlan`, poser `restriction_relaxed: true` sur les meals de ce type. Implémentation minimale :

```ts
function poolForWithFlag(mealType: MealType, profile: UserProfile): { pool: Recipe[]; relaxed: boolean } {
  const recipes = getEffectiveRecipes();
  const all = recipes.filter((r) => r.tags.includes(mealType));
  const filtered = all.filter((r) => recipeAllowed(r, profile));
  if (filtered.length > 0) return { pool: filtered, relaxed: false };
  if (all.length > 0) return { pool: all, relaxed: true };
  return { pool: recipes, relaxed: true };
}
```
Utiliser `poolForWithFlag` dans `buildLocalPlan` (stocker `relaxed` par type, le reporter sur le `Meal`).

- [ ] **Step 5 : Mettre à jour `recipeAllowed`** pour lire `restrictions_ok` quand présent (autoritaire), sinon repli mots-clés. Remplacer la boucle régimes :

```ts
  // Régimes : restrictions_ok autoritaire si présent, sinon repli mots-clés.
  for (const r of profile.dietary_restrictions ?? []) {
    if (recipe.restrictions_ok) {
      if (!recipe.restrictions_ok.includes(r)) return false;
    } else if (RESTRICTION_BLOCKLIST[r].some((kw) => text.includes(kw))) {
      return false;
    }
  }
```

- [ ] **Step 6 : Bump `ENGINE_VERSION`** (3 → 4) pour régénérer les plans en cache.

- [ ] **Step 7 : Lancer les tests**

Run: `cd kyroz-app && npx vitest run lib/__tests__/planEngine.test.ts`
Expected: PASS (anciens + nouveaux). Corriger les imports/inutilisés signalés par `npx tsc --noEmit`.

- [ ] **Step 8 : Commit**

```bash
cd kyroz-app && git add lib/planEngine.ts lib/__tests__/planEngine.test.ts && git commit -m "feat(moteur): sélection par adaptRecipe + flags + soft-matching + bridge cibles profil"
```

---

## Phase 5 — Recalage / swap / reset via adaptRecipe

### Task 5.1 : `swapMeal` et `rebalanceCore` re-scalent par ingrédient

**Files:**
- Modify: `kyroz-app/lib/planEngine.ts`
- Test: `kyroz-app/lib/__tests__/planEngine.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent** (ajouts) :

```ts
import { swapMeal, rebalanceDay } from '../planEngine';

describe('swap / rebalance via adaptRecipe', () => {
  it('rebalanceDay garde adapted_ingredients sur les repas ajustés', () => {
    const p = baseProfile();
    const plan = buildLocalPlan(p);
    const out = rebalanceDay(p, plan, 1);
    for (const m of out.meals) expect(m.adapted_ingredients).toBeTruthy();
  });
  it('swapMeal change de recette et fournit des quantités adaptées', () => {
    const p = baseProfile();
    const plan = buildLocalPlan(p);
    const target = plan.meals[1];
    const out = swapMeal(p, plan, target);
    const newMeal = out.meals.find((m) => m.id === target.id)!;
    expect(newMeal.adapted_ingredients).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `cd kyroz-app && npx vitest run lib/__tests__/planEngine.test.ts -t "swap / rebalance"`
Expected: FAIL

- [ ] **Step 3 : Refactorer `rebalanceCore`** — remplacer `bestPortionFor` par `adaptRecipe`. Pour chaque repas ajustable, construire l'`AdaptTarget` (avec `split`/`deficit` du profil + report de budget existant) et écrire `adapted_ingredients`/`macros`/`adapt_flags` :

```ts
    const target: AdaptTarget = {
      kcalMeal: (remKcal * weight) / remWeight,
      proteinMeal: (remProt * weight) / remWeight,
      split: profileSplit(profile), deficit: inDeficit(profile),
    };
    const a = adaptRecipe(meal.recipe, target);
    updates.set(meal.id, {
      ...meal, portions: 1, macros: a.macros,
      adapted_ingredients: a.ingredients, adapt_flags: a.flags.length ? a.flags : undefined,
    });
    remKcal -= a.macros.kcal;
    remProt -= a.macros.protein_g;
    remWeight -= weight;
```
(Supprimer `remFat`/la cible fat de `rebalanceCore`.)

- [ ] **Step 4 : Refactorer `swapMeal`** — choisir une alternative via `adaptRecipe` calée sur la même cible que le repas courant :

```ts
export function swapMeal(profile: UserProfile, plan: MealPlan, meal: Meal): MealPlan {
  const pool = poolForWithFlag(meal.meal_type, profile).pool.filter((r) => r.id !== meal.recipe.id);
  if (pool.length === 0) return plan;
  const target: AdaptTarget = {
    kcalMeal: meal.macros.kcal, proteinMeal: meal.macros.protein_g,
    split: profileSplit(profile), deficit: inDeficit(profile),
  };
  const ranked = pool
    .map((r) => { const a = adaptRecipe(r, target); return { r, a, score: fitScore(a.macros, target, a.flags) }; })
    .sort((x, y) => x.score - y.score);
  const top = ranked.slice(0, Math.min(VARIANT_MIN, ranked.length));
  const pick = top[Math.floor(Math.random() * top.length)];
  const newMeal: Meal = {
    ...meal, recipe: pick.r, portions: 1, macros: pick.a.macros,
    adapted_ingredients: pick.a.ingredients, adapt_flags: pick.a.flags.length ? pick.a.flags : undefined,
  };
  const meals = plan.meals.map((m) => (m.id === meal.id ? newMeal : m));
  return { ...plan, meals, total_macros_per_day: computeDailyTotals(meals, plan.days, plan.day_extras) };
}
```

- [ ] **Step 5 : Nettoyer le code mort** — supprimer `MealTarget`/`bestPortionFor`/`deviationScore`/`scaleMacros`/`selectMeal`/`MealChoice` s'ils ne sont plus référencés (vérifier avec `npx tsc --noEmit`). `resetTracking` appelle déjà `rebalanceDay` → marche sans changement.

- [ ] **Step 6 : Lancer toute la suite moteur**

Run: `cd kyroz-app && npx vitest run lib/__tests__/planEngine.test.ts`
Expected: PASS

- [ ] **Step 7 : Commit**

```bash
cd kyroz-app && git add lib/planEngine.ts lib/__tests__/planEngine.test.ts && git commit -m "feat(moteur): swap/rebalance/reset via adaptRecipe (quantités par ingrédient)"
```

---

## Phase 6 — Consommateurs (courses, frigo, fibres, UI)

### Task 6.1 : Helper d'accès aux ingrédients effectifs d'un repas

**Files:**
- Modify: `kyroz-app/lib/planEngine.ts` (ou nouveau `lib/mealIngredients.ts`)
- Test: `kyroz-app/lib/__tests__/planEngine.test.ts`

- [ ] **Step 1 : Test** :

```ts
import { mealIngredients } from '../planEngine';
it('mealIngredients renvoie les quantités adaptées si présentes, sinon recipe×portions', () => {
  const p = baseProfile(); const plan = buildLocalPlan(p);
  const m = plan.meals[0];
  const ings = mealIngredients(m);
  expect(ings.length).toBe(m.recipe.ingredients.length);
  expect(ings[0]).toHaveProperty('quantity_g');
  expect(ings[0]).toHaveProperty('name');
});
```

- [ ] **Step 2 : Implémenter `mealIngredients`** (exporté depuis `planEngine.ts`) :

```ts
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
```

- [ ] **Step 3 : Lancer le test**

Run: `cd kyroz-app && npx vitest run lib/__tests__/planEngine.test.ts -t "mealIngredients"`
Expected: PASS

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && git add lib/planEngine.ts lib/__tests__/planEngine.test.ts && git commit -m "feat(moteur): mealIngredients (quantités effectives d'un repas)"
```

---

### Task 6.2 : Liste de courses depuis les quantités adaptées

**Files:**
- Modify: `kyroz-app/lib/shoppingList.ts`
- Test: `kyroz-app/lib/__tests__/shoppingList.test.ts`

- [ ] **Step 1 : Mettre à jour le test existant** pour vérifier l'agrégation depuis les quantités adaptées (ajouter un cas : un meal avec `adapted_ingredients` doit utiliser CES quantités, pas `recipe.ingredients × portions`).

```ts
it('agrège depuis adapted_ingredients quand présent', () => {
  const meal: any = {
    id: 'm', day: 1, meal_type: 'lunch', portions: 1,
    recipe: { id: 'r', name_fr: 'X', prep_time_min: 10, portions: 1,
      macros_per_portion: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ingredients: [{ name: 'Riz basmati', quantity_g: 80, ref: 'riz_basmati' }],
      steps: [], tags: ['lunch'], validated_by_dietitian: false },
    macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    adapted_ingredients: [{ name: 'Riz basmati', quantity_g: 140, ref: 'riz_basmati' }],
  };
  const plan: any = { id: 'p', user_id: 'u', week_start_date: '', generated_at: '', days: 1, meals: [meal], total_macros_per_day: [] };
  const sl = buildShoppingList(plan, []);
  const riz = sl.items.find((i) => i.name.toLowerCase().includes('riz'))!;
  expect(riz.quantity).toBe(140);
});
```

- [ ] **Step 2 : Modifier `buildShoppingList`** — remplacer la boucle d'agrégation par `mealIngredients(meal)` :

```ts
import { mealIngredients } from './planEngine';
// …
  for (const meal of plan.meals) {
    for (const ingredient of mealIngredients(meal)) {
      if (isStaple(ingredient.name)) continue;
      const key = ingredient.name.toLowerCase();
      const existing = aggregated.get(key);
      const qty = ingredient.quantity_g;
      if (existing) existing.quantity += qty;
      else aggregated.set(key, { name: key, quantity: qty, unit: ingredient.unit ?? 'g' });
    }
  }
```

- [ ] **Step 3 : Lancer les tests courses**

Run: `cd kyroz-app && npx vitest run lib/__tests__/shoppingList.test.ts`
Expected: PASS

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && git add lib/shoppingList.ts lib/__tests__/shoppingList.test.ts && git commit -m "feat(courses): agrégation depuis les quantités adaptées du repas"
```

---

### Task 6.3 : Garde-manger (déduction) depuis les quantités adaptées

**Files:**
- Modify: `kyroz-app/lib/pantry.ts:132-136`
- Modify: `kyroz-app/app/(tabs)/plan.tsx:245`

- [ ] **Step 1 : Inspecter `deductRecipe`** (`lib/pantry.ts`) — il prend `(items, recipe, portions)` et fait `ing.quantity_g * portions`. Ajouter une surcharge/fonction qui accepte des ingrédients déjà calculés :

```ts
// lib/pantry.ts — nouvelle fonction à côté de deductRecipe
export function deductIngredients(items: PantryItem[], used: { name: string; quantity_g: number; unit?: string }[]): PantryItem[] {
  // même logique de soustraction que deductRecipe mais sur une liste déjà mise à l'échelle
  // (réutiliser le corps existant de deductRecipe en remplaçant `ing.quantity_g * portions` par `u.quantity_g`)
  // … copier la logique de matching/soustraction de deductRecipe …
}
```
(Implémenter en copiant la logique de soustraction existante de `deductRecipe`, en itérant sur `used` au lieu de `recipe.ingredients × portions`.)

- [ ] **Step 2 : Mettre à jour l'appel** dans `app/(tabs)/plan.tsx:245` :

```ts
import { mealIngredients } from '../../lib/planEngine';
// remplacer :
const next = deductRecipe(items, meal.recipe, meal.portions);
// par :
const next = deductIngredients(items, mealIngredients(meal));
```

- [ ] **Step 3 : Vérifier la compilation + tests pantry**

Run: `cd kyroz-app && npx tsc --noEmit && npx vitest run lib/__tests__/pantry.test.ts`
Expected: PASS

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && git add lib/pantry.ts "app/(tabs)/plan.tsx" && git commit -m "feat(frigo): déduction depuis les quantités adaptées"
```

---

### Task 6.4 : Affichage repas (RecipeDetail) — quantités adaptées + macros + Pourquoi/badges

**Files:**
- Modify: `kyroz-app/components/RecipeDetail.tsx`
- Modify: `kyroz-app/app/(tabs)/plan.tsx:516`

- [ ] **Step 1 : Ajouter des props optionnelles à `RecipeDetail`** pour rendre des ingrédients/macros adaptés et les méta « besoin » :

```ts
interface Props {
  recipe: Recipe;
  portions?: number;
  adaptedIngredients?: { name: string; quantity_g: number; unit?: string }[]; // si fourni → affiché tel quel
  adaptedMacros?: Macros;        // si fourni → remplace recipe.macros_per_portion × portions
  adaptFlags?: AdaptFlag[];      // avertissements (sous/au-dessus cible)
  restrictionRelaxed?: boolean;  // bandeau « régime non garanti »
  // … props existantes …
}
```

- [ ] **Step 2 : Utiliser les valeurs adaptées si présentes** — remplacer le calcul `macros` (l.32-37) et le rendu des ingrédients (l.81-86) :

```ts
const macros = adaptedMacros ?? {
  kcal: Math.round(recipe.macros_per_portion.kcal * f),
  protein_g: Math.round(recipe.macros_per_portion.protein_g * f),
  carbs_g: Math.round(recipe.macros_per_portion.carbs_g * f),
  fat_g: Math.round(recipe.macros_per_portion.fat_g * f),
};
const ings = adaptedIngredients ?? recipe.ingredients.map((i) => ({ name: i.name, quantity_g: i.quantity_g * f, unit: i.unit }));
// … rendu :
{ings.map((ing, i) => (
  <View key={i} style={s.ing}>
    <Text style={s.ingName}>{ing.name}</Text>
    <Text style={s.ingQty}>{formatQuantity(ing.name, ing.quantity_g, ing.unit ?? 'g')}</Text>
  </View>
))}
```

- [ ] **Step 3 : Ajouter badges Objectif/Sport + Pourquoi + avertissements** sous l'en-tête (après le bloc `meta`) :

```tsx
{(recipe.objectives?.length || recipe.sports?.length) && (
  <View style={s.tagRow}>
    {recipe.objectives?.map((o) => <Text key={o} style={s.tag}>{OBJ_LABEL[o]}</Text>)}
    {recipe.sports?.map((sp) => <Text key={sp} style={s.tag}>{SPORT_LABEL[sp]}</Text>)}
  </View>
)}
{restrictionRelaxed && (
  <Text style={s.warn}>⚠️ Aucune recette adaptée à ton régime pour ce repas — option standard.</Text>
)}
{adaptFlags?.includes('under_target_kcal') && <Text style={s.warn}>ℹ️ Repas un peu en dessous de ta cible.</Text>}
{adaptFlags?.includes('over_target_kcal') && <Text style={s.warn}>ℹ️ Repas un peu au-dessus de ta cible.</Text>}
{recipe.why_fr && <Text style={s.why}>{recipe.why_fr}</Text>}
```
Avec les libellés (en haut du fichier) :
```ts
const OBJ_LABEL: Record<string, string> = { cut: 'Perte de gras', maintain: 'Maintien', bulk: 'Prise de masse' };
const SPORT_LABEL: Record<string, string> = { muscu: 'Muscu', endurance: 'Endurance', combats: 'Combats' };
```
Et les styles (dans `makeStyles`) : `tagRow` (flexDirection row, gap 8, flexWrap), `tag` (fill, pill, fontSize 11), `warn` (t.warning, fontSize 13), `why` (t.textSecondary, fontSize 14, italique). Aucune couleur en dur → via `t`.

- [ ] **Step 4 : Passer les valeurs adaptées depuis `plan.tsx`** (l.~516, là où `<RecipeDetail … portions={selectedMeal.portions} />`) :

```tsx
<RecipeDetail
  recipe={selectedMeal.recipe}
  portions={selectedMeal.portions}
  adaptedIngredients={selectedMeal.adapted_ingredients}
  adaptedMacros={selectedMeal.macros}
  adaptFlags={selectedMeal.adapt_flags}
  restrictionRelaxed={selectedMeal.restriction_relaxed}
  /* … props existantes … */
/>
```

- [ ] **Step 5 : Corriger l'effet d'override `plan.tsx:303`** — au swap local, recopier les ingrédients/flags adaptés du nouveau meal (le swap passe déjà par `swapMeal` côté moteur ; s'assurer que l'état `selectedMeal` reçoit `adapted_ingredients`/`adapt_flags`/`macros`). Vérifier que `plan.tsx:162` (re-hydratation des macros via `scaleMacros(eff.macros_per_portion, m.portions)`) n'écrase PAS les macros adaptées : remplacer par un repli qui conserve `m.macros` si `m.adapted_ingredients` existe.

```ts
// plan.tsx:~162 — préserver les macros adaptées
return m.adapted_ingredients
  ? { ...m, recipe: eff }                       // garder macros + adapted_ingredients
  : { ...m, recipe: eff, macros: scaleMacros(eff.macros_per_portion, m.portions) };
```

- [ ] **Step 6 : Vérifier la compilation**

Run: `cd kyroz-app && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7 : Vérification visuelle** (preview) — démarrer le serveur, ouvrir le Plan, ouvrir une fiche repas : vérifier quantités adaptées, badges objectif/sport, « Pourquoi », et un avertissement si présent. Capturer une preuve.

- [ ] **Step 8 : Commit**

```bash
cd kyroz-app && git add components/RecipeDetail.tsx "app/(tabs)/plan.tsx" && git commit -m "feat(ui): fiche repas — quantités adaptées, badges objectif/sport, Pourquoi, avertissements"
```

---

### Task 6.5 : Fibres depuis les quantités adaptées (cohérence courses/affichage)

**Files:**
- Modify: `kyroz-app/lib/fiber.ts`
- Modify: `kyroz-app/app/(tabs)/plan.tsx:309`

- [ ] **Step 1 : Ajouter `mealFiberFromIngredients`** dans `fiber.ts` qui estime les fibres à partir d'une liste `{name, quantity_g}` (réutiliser le barème mot-clé existant, sans diviser par `recipe.portions`).

- [ ] **Step 2 : Mettre à jour `plan.tsx:309`** pour calculer les fibres du jour via `mealIngredients(m)` → `mealFiberFromIngredients(...)` (repli sur `mealFiberG(m.recipe, m.portions)` si pas d'adapted).

- [ ] **Step 3 : Compilation + tests fibres**

Run: `cd kyroz-app && npx tsc --noEmit && npx vitest run lib/__tests__/fiber.test.ts`
Expected: PASS

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && git add lib/fiber.ts "app/(tabs)/plan.tsx" && git commit -m "feat(fibres): estimation depuis les quantités adaptées"
```

---

## Phase 7 — Finitions : recettes (liste), suite de tests, doc

### Task 7.1 : Écran Recettes — badges objectif/sport (liste)

**Files:**
- Modify: `kyroz-app/app/(tabs)/recettes.tsx`

- [ ] **Step 1 : Ajouter une ligne de badges** (objectif/sport) sous le nom dans la carte recette, en réutilisant `OBJ_LABEL`/`SPORT_LABEL` (les extraire dans un petit module partagé `lib/recipeLabels.ts` pour DRY, importé par `RecipeDetail` et `recettes.tsx`).

- [ ] **Step 2 : Créer `lib/recipeLabels.ts`** :

```ts
import { RecipeObjective, RecipeSport } from './types';
export const OBJ_LABEL: Record<RecipeObjective, string> = { cut: 'Perte de gras', maintain: 'Maintien', bulk: 'Prise de masse' };
export const SPORT_LABEL: Record<RecipeSport, string> = { muscu: 'Muscu', endurance: 'Endurance', combats: 'Combats' };
```
Et remplacer les définitions inline de Task 6.4 par cet import.

- [ ] **Step 3 : Compilation + vérification visuelle** (liste recettes affiche les badges).

Run: `cd kyroz-app && npx tsc --noEmit`

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && git add lib/recipeLabels.ts "app/(tabs)/recettes.tsx" components/RecipeDetail.tsx && git commit -m "feat(ui): badges objectif/sport sur la liste des recettes (libellés DRY)"
```

---

### Task 7.2 : Suite complète + nettoyage + AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1 : Lancer toute la suite**

Run: `cd kyroz-app && npm test`
Expected: PASS (tous les fichiers). Corriger toute régression (souvent : imports `RECIPES_PLACEHOLDER` résiduels, ou tests référant `m.portions`).

- [ ] **Step 2 : Vérification typage global**

Run: `cd kyroz-app && npx tsc --noEmit`
Expected: PASS (aucun code mort/symbole manquant).

- [ ] **Step 3 : Mettre à jour `AGENTS.md`** — section recettes/moteur : 100 recettes (`recettes-kyroz-100.json` + `recipeData`/`recipeMap`), `adaptRecipe` (scaling par ingrédient, plancher protéique, flags), bridge sur les cibles du profil, soft-matching objectif/sport, `restrictions_ok` autoritaire + repli honnête, `Meal.adapted_ingredients`. Mentionner les trous connus (sans-gluten petit-déj mince) et le hors-scope (CIQUAL officiel, jour de repos).

- [ ] **Step 4 : Commit**

```bash
cd kyroz-app && cd .. && git add AGENTS.md && git commit -m "docs: AGENTS.md — refonte recettes (100) + adaptRecipe + soft-matching"
```

---

## Self-Review (rempli)

**1. Couverture de la spec :**
- §1 modèle de données → Task 0.2, 1.1, 3.2 ✓
- §2 recettes (100, ids, tags, restrictions) → Task 0.1, 3.2, 3.3 ✓
- §3 adaptRecipe + bridge cibles + sélection par flags → Task 2.1, 4.1, 5.1 ✓
- §4 macros depuis ingrédients → Task 0.2 (`macrosForRefIngredients`) ✓
- §5 régimes (restrictions_ok autoritaire + repli honnête) → Task 3.1, 4.1 (steps 4–5) ✓
- §6 UI (badges, Pourquoi, quantités adaptées, avertissements) → Task 6.4, 7.1 ✓
- §7 tests & doc → Task 3.2, 4.1, 5.1, 7.2 ✓
- Corrections données (rep57 gras, recomp_flag, invariant fat) → Task 0.1, 3.2 (test) ✓

**2. Placeholders :** Task 6.3 step 1 et 6.5 step 1 décrivent une copie de logique existante plutôt que d'inliner le corps complet — acceptable car ils réutilisent explicitement une fonction présente dans le repo (`deductRecipe`, barème `fiber`), mais l'exécutant doit copier la logique, pas inventer.

**3. Cohérence des types :** `AdaptTarget`/`AdaptResult`/`AdaptedChoice`, `mealIngredients`, `profileSplit`/`inDeficit`/`fitScore`, `goalToObjectives`/`sportsToBuckets`/`needMatch`, `RECIPES`, `RECIPE_INGREDIENTS`/`RECIPE_CONFIG`/`macrosForRefIngredients` — noms cohérents d'une tâche à l'autre.

**Risque principal :** Phase 4/5 touchent un moteur dense (report de budget, variété, seed). Exécuter tâche par tâche en gardant `npm test` vert entre chaque ; le test « total du jour ±12% » est le garde-fou de non-régression.
