# Notes de merge — push catalogue Kyroz (+164 recettes)

## Ce que contient le livrable
- **`recettes-kyroz-nouvelles.json`** : un *fragment* à fusionner, avec deux clés :
  - `ingredients_reference` → **11 nouveaux ingrédients** à ajouter à la table existante.
  - `recipes` → **164 nouvelles recettes** à concaténer au tableau `recipes` existant.
  - ⚠️ C'est un **fragment**, pas un remplacement. Fusionner dans le `recettes-kyroz-100.json`
    existant (ajouter les clés d'ingrédients, concaténer le tableau de recettes). Garder `enums`/`config`.
- **`diff_types.ts.txt`**, **`diff_recipeDiet.ts.txt`**, **`diff_recipeFoodMap.ts.txt`** : les 3 modifs de code pour `vegan`.
- **`recap.md`** : couverture par régime vs planchers §6 + sous-exigences.

## À appliquer côté code (Claude Code)
1. **`lib/types.ts`** : ajouter `'vegan'` à `DietaryRestriction` (cf. diff).
2. **`lib/recipeDiet.ts`** :
   - ajouter `'vegan'` au tableau `ALL` ;
   - ajouter `'vegan'` aux violations de **tous** les ingrédients animaux (liste dans le diff).
   - Les 11 nouveaux ingrédients ne contraignent **aucun** régime → rien à ajouter pour eux.
3. **`lib/recipeFoodMap.ts`** : mappings Ciqual **proposés** pour 8 des nouveaux ingrédients,
   tous marqués `À VÉRIFIER À LA MAIN`. Tant que l'`alim_code` n'est pas validé, l'ingrédient
   reste sur sa valeur manuelle `per_100` (déjà dans le JSON) — donc **rien ne casse** si on ne mappe pas.
4. **UI (optionnel)** : ajouter le toggle « Vegan » dans `onboarding.tsx` + `profil.tsx`.
5. **Compteur de test** : passer `expect(RECIPES).toHaveLength(100)` → **`264`**.
   Si un `enums`/`config` du JSON liste les restrictions, y ajouter `'vegan'`.
6. `npm test`.

## Points de design (rappels)
- `restrictions_ok` et les macros finales ne sont **pas** écrits dans les recettes : le code les **dérive**.
  `macros_per_serving` est fourni comme **garde-fou** (calculé depuis la table, doit rester à ±30 %).
- **Cohérence cru/sec** respectée : viandes/poissons en `raw`, féculents/légumineuses en `dry`.
- `validated_by_dietitian` reste `false` (dérivé) — aucune allégation santé dans `name`/`why`.

## Hypothèse à connaître sur les macros
Je n'avais pas les `per_100` exacts de tes 102 ingrédients existants : je les ai **estimés** (ANSES/Ciqual)
uniquement pour **calculer** `macros_per_serving`. En prod, `recipeData.ts` recalcule tout depuis **ta** table
(Ciqual pour les mappés). Donc :
- pour les **nouveaux** ingrédients, les `per_100` du JSON font foi (valeurs fournies) ;
- pour les **recettes**, `macros_per_serving` n'est qu'un repère ±30 %. Si un ingrédient existant a chez toi
  une valeur très différente de mon estimation, le test ±30 % le signalera (correctif = 1 ligne sur la recette concernée).
