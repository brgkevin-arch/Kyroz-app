# Recettes Kyroz — dossier unique

```
Recette/
├── recettes-kyroz.json          ← LE CATALOGUE LIVE (importé par lib/recipeData.ts) — 314 recettes
├── README.md                    ← ce fichier
├── BRIEF-GENERATION-RECETTES.md ← la SPEC : mesures, enveloppes, raisonnement. Ne pas transmettre tel quel.
├── lots/                        ← la COMMANDE, générée (npm run gen:lots). Un fichier = une conversation.
│   ├── b2.md                    (13 collations, col67–col79)
│   ├── b1-lot1.md … b1-lot4.md  (80 repas complets, rep171–rep250)
│   ├── b3.md                    (20 petits-déjeuners, pd79–pd98)
│   └── annexe-collations-existantes.md
└── drops/                       ← livraisons brutes REÇUES (archives, JAMAIS importées par le code)
    ├── 2026-06-16-refonte-adaptrecipe/
    ├── 2026-06-19-vegan/            (+164 recettes, mergé)
    └── 2026-07-22-sans-gluten/      (+50 recettes GF, mergé)
```

⚠️ `recettes-kyroz.json` est **importé par le code** (`lib/recipeData.ts`, `lib/__tests__/recipeFoodMap.test.ts`).
Les fichiers de `drops/` sont de la matière première : on en extrait, on ne les branche jamais.

⚠️ **`lots/` est GÉNÉRÉ — ne jamais l'éditer à la main.** Toute correction va dans
`scripts/gen-brief-lot.ts`, puis on régénère. C'est ce qui garantit que les refs, les macros et les
formats saturés collent au catalogue : la première version de ces fichiers listait des « formats à
viser » écrits à la main qui pointaient tous sur des couples déjà saturés.

## Commander des recettes — les fichiers à transmettre

Les briefs par lot vivent dans `Recette/lots/` et sont **générés**, pas écrits à la main :

```bash
npm run gen:lots            # les 6 lots
npm run gen:lots -- b2      # un seul
```

Chaque fichier est autonome : format de sortie, refs autorisés avec leurs macros, règles, formats
déjà saturés, auto-contrôle. On en donne **un par conversation**, dans l'ordre `b2`, `b1-lot1` à
`b1-lot4`, `b3`. **Après le merge d'un lot, régénérer les suivants** — ils verront ce que le lot
précédent a consommé, et c'est ce contrôle croisé qui manquait aux vagues d'avant.

La spécification complète et son raisonnement restent dans `BRIEF-GENERATION-RECETTES.md` ; les
fichiers de `lots/` en sont la projection opérationnelle.

## Ajouter des recettes — la chaîne complète

0. **Deux contrôles AVANT de concaténer quoi que ce soit.** Les deux sortent en code 1 si le lot est
   mauvais. Une recette rejetée est **réécrite**, pas retouchée : une correction locale déplace le
   problème au lieu de le supprimer.
   - `npm run check:doublons -- <drop.json>` → confronte le lot au catalogue live **et** les
     recettes du lot entre elles (Jaccard, refs communs, triplet structurel, noms).
   - `npm run check:enveloppe -- <drop.json>` → règle R8 : chaque recette est adaptée **par le
     moteur** sur les 12 profils de référence, **6 femmes et 6 hommes**. C'est le contrôle qui
     manquait le plus longtemps, et son absence coûte cher : mesuré le 2026-07-29, **48 des 66
     collations du catalogue ne servent aucun profil féminin**, et **aucune** n'est servable à une
     femme de 55 kg en sèche. Un catalogue peut être valide, cohérent, sans un seul doublon — et
     invendable à la moitié de ses utilisateurs.
   - `npm run mesure:couverture` (sans argument) → état du catalogue live, à relancer après merge.

   ⚠️ **Ces scripts appellent `buildLocalPlan` et `adaptRecipe`, ils ne recopient aucune formule.**
   Deux audits successifs se sont trompés pour l'avoir oublié : l'un figeait le partage
   glucides/lipides à 55/45 (le simple repli de `carbFatRatio`), l'autre agrégeait la variété sur
   trois gabarits alors qu'un utilisateur n'en a qu'un. Ne jamais réimplémenter le moteur pour le
   mesurer.
1. **`recettes-kyroz.json`** → concaténer dans `recipes[]` (ids : `pdNN` / `colNN` / `repNNN`, suite continue),
   mettre `_meta.count` à jour, et **renseigner `wave`** sur chaque recette avec le nom du dossier
   du drop (cf. `_meta.waves`) — un test échoue si une recette n'en porte pas.
2. **Ingrédient inconnu** → l'ajouter à `ingredients_reference` (`name`, `unit`, `per_100`, `basis`, `abs_max_qty`), puis :
   - `lib/recipeFoodMap.ts` → mapping Ciqual **vérifié à la main** (règle : on ne mappe que si l'entrée
     ANSES est SANS AMBIGUÏTÉ le même aliment ; sinon on garde la valeur manuelle, assumée) ;
   - `lib/recipeDiet.ts` → `VIOLATIONS` si l'ingrédient interdit un régime (gluten, vegan, porc…).
     `restrictions_ok` est **dérivé**, jamais écrit dans la recette.
3. **Compteurs de test** : `recipeMap.test.ts`, `recipes.test.ts`, `recipeData.test.ts` (`toHaveLength(N)`).
4. **`ENGINE_VERSION`** (`lib/planEngine.ts`) → +1, sinon les plans en cache ignorent les nouvelles recettes.
5. `npm test` puis `npx tsc --noEmit`.
6. `npm run mesure:couverture` → vérité terrain sur 12 profils (règle R8), et
   `npm run check:doublons`. **Ce sont les deux seuls contrôles de catalogue.**
   *(L'ancienne étape « `npm run gen:validation` → dossier diététicienne » a disparu le
   2026-07-30 : la validation diététicienne est écartée (`CLAUDE.md` §6), le script est
   supprimé et le dossier figé dans `docs/archive/2026-07-29-validation-recettes.md`.)*

## Invariants vérifiés par les tests

- `base_servings === 1` ; tout `ref` existe dans `ingredients_reference` ; tout `food_id` mappé résout.
- `qty` de base ≤ `abs_max_qty` (sinon la fiche affiche autre chose que ce qui est servi).
- `macro_role` `flavor`/`vegetable` → `scalable: false` (le moteur les fige de toute façon).
- Pas de nom « cuit/égoutté » sur un ingrédient `basis: dry` — **on pèse SEC** (convention riz/pâtes).
- `macros_per_serving` = **garde-fou de régression ±30 %** (repère indépendant), pas une source :
  les vraies macros sont **dérivées des ingrédients** par `recipeMap`. Ne pas le re-baseliner sans raison.
- **Similarité** (`doublons.test.ts`) : cliquet sur les paires trop proches — Jaccard des `ref`,
  refs communs, triplet (catégorie, protéine, féculent), noms. Les compteurs actuels sont des
  plafonds : une vague qui les fait monter casse `npm test`. Les baisser après nettoyage est attendu.

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
