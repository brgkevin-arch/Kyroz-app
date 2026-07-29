# Recettes Kyroz — dossier unique

```
Recette/
├── recettes-kyroz.json   ← LE CATALOGUE LIVE (importé par lib/recipeData.ts) — 314 recettes
├── README.md             ← ce fichier
└── drops/                ← livraisons brutes reçues (archives, JAMAIS importées par le code)
    ├── 2026-06-16-refonte-adaptrecipe/
    ├── 2026-06-19-vegan/            (+164 recettes, mergé)
    └── 2026-07-22-sans-gluten/      (+50 recettes GF, mergé)
```

⚠️ `recettes-kyroz.json` est **importé par le code** (`lib/recipeData.ts`, `lib/__tests__/recipeFoodMap.test.ts`).
Les fichiers de `drops/` sont de la matière première : on en extrait, on ne les branche jamais.

## Ajouter des recettes — la chaîne complète

1. **`recettes-kyroz.json`** → concaténer dans `recipes[]` (ids : `pdNN` / `colNN` / `repNNN`, suite continue),
   mettre `_meta.count` à jour.
2. **Ingrédient inconnu** → l'ajouter à `ingredients_reference` (`name`, `unit`, `per_100`, `basis`, `abs_max_qty`), puis :
   - `lib/recipeFoodMap.ts` → mapping Ciqual **vérifié à la main** (règle : on ne mappe que si l'entrée
     ANSES est SANS AMBIGUÏTÉ le même aliment ; sinon on garde la valeur manuelle, assumée) ;
   - `lib/recipeDiet.ts` → `VIOLATIONS` si l'ingrédient interdit un régime (gluten, vegan, porc…).
     `restrictions_ok` est **dérivé**, jamais écrit dans la recette.
3. **Compteurs de test** : `recipeMap.test.ts`, `recipes.test.ts`, `recipeData.test.ts` (`toHaveLength(N)`).
4. **`ENGINE_VERSION`** (`lib/planEngine.ts`) → +1, sinon les plans en cache ignorent les nouvelles recettes.
5. `npm test` puis `npx tsc --noEmit`.
6. `npx tsx scripts/gen-validation-recettes.ts` → régénère `VALIDATION-RECETTES.md` (dossier diététicienne).

## Invariants vérifiés par les tests

- `base_servings === 1` ; tout `ref` existe dans `ingredients_reference` ; tout `food_id` mappé résout.
- `qty` de base ≤ `abs_max_qty` (sinon la fiche affiche autre chose que ce qui est servi).
- `macro_role` `flavor`/`vegetable` → `scalable: false` (le moteur les fige de toute façon).
- Pas de nom « cuit/égoutté » sur un ingrédient `basis: dry` — **on pèse SEC** (convention riz/pâtes).
- `macros_per_serving` = **garde-fou de régression ±30 %** (repère indépendant), pas une source :
  les vraies macros sont **dérivées des ingrédients** par `recipeMap`. Ne pas le re-baseliner sans raison.

## Conventions de contenu

- Poids **SEC** pour féculents et légumineuses, **CRU** pour viandes/poissons (`basis`).
  Exception assumée : les refs `*_conserve` / `lentilles_cuites` sont **prêts à consommer**
  (`basis` absent) — une recette de moins de 15 min à base de légumineuse DOIT les utiliser,
  sinon la liste de courses affiche un poids sec pour un plat sans trempage.
- Un ingrédient cité dans `instructions` mais absent de `ingredients[]` est **invisible du
  dérivé régime et de la liste de courses**. Trois recettes citaient une sauce soja non
  déclarée et revendiquaient le sans gluten (corrigé le 2026-07-29). Sel/poivre/herbes exceptés.
- Aucune allégation santé dans `name` / `why` ; `validated_by_dietitian` reste `false` tant que
  la validation diététicienne n'est pas faite (CLAUDE.md §6).
- Une recette a besoin d'une **ancre protéine `scalable`** pour que le moteur puisse l'adapter.
  Sans ingrédient **gras `scalable`**, elle ne pourra pas monter en lipides → avertissement
  « sous la cible » possible (acceptable sur un petit-déj/collation volontairement maigre).
