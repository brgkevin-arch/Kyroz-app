# Inventaire du code Kyroz — photo du 2026-07-30

> **C'est une PHOTO, pas une spec.** Elle décrit l'état du code au 2026-07-30
> (`main` = `f03f738`). Elle vieillira : ne pas la lire comme une vérité courante
> passé quelques semaines, et ne jamais l'amender — en refaire une.
>
> **Méthode.** Tout ce qui est chiffré ici a été obtenu en exécutant des mesures sur
> l'arbre de travail (grep sur les appels réels, `wc`, `npm test`), pas en relisant
> du texte. Le code est la source de vérité sur le **quoi**.
>
> **Les docs ne sont pas ignorées, elles sont traitées comme des revendications à
> vérifier** sur le *pourquoi* — un fichier `.ts` ne dit jamais pourquoi une décision
> a été prise. Quand une doc (ou un commentaire) et le code divergent, la divergence
> est listée en §6 au lieu de choisir un camp en silence.
>
> **Aucun refactor n'est proposé.** §7 est le seul jugement, et il est demandé.
>
> ⚠️ **Note ajoutée après coup.** Le rangement du dépôt a eu lieu **le même jour, après**
> ces mesures. Les chemins cités en §6 (`KYROZ_MOTEUR_V2_CORRECTIONS.md`,
> `VALIDATION-RECETTES.md`, `docs/superpowers/…`) sont donc les chemins **d'avant le
> rangement** ; ces fichiers vivent maintenant dans `docs/archive/`. Les constats, eux,
> restent exacts — et trois d'entre eux sont précisément ce qui a motivé l'archivage.
> Les chemins de **code** (`lib/`, `app/`, `components/`) n'ont pas bougé.

---

## 0. Cadrage chiffré

| Mesure | Valeur |
|---|---|
| Fichiers suivis par git | 244 (dont 223 dans `kyroz-app/`) |
| Routes Expo Router | 11 |
| Modules `lib/` | 36 (dont 1 généré) |
| Composants | 28 |
| Hooks | 9 |
| Scripts outillage | 5 |
| Migrations Supabase | 15 + `schema.sql` + 1 edge function |
| Fichiers de test unitaires | 33 |
| **Tests** | **563 · 33/33 fichiers verts · 1,68 s** (`npm test`, 2026-07-30) |
| Recettes dans le catalogue live | 314 |
| Ingrédients de référence | 123 |
| Aliments Ciqual générés | 3 341 |
| Plus gros fichier de code non généré | `app/(tabs)/profil.tsx` — 1 042 lignes |

---

## 1. Arborescence commentée

### `app/` — routes (Expo Router, routage par fichiers)

| Fichier | Rôle réel |
|---|---|
| `_layout.tsx` | Racine : providers (auth, thème, overrides recettes, tour guidé), `ErrorBoundary` |
| `index.tsx` | Aiguillage d'entrée : session + profil hydratés → onglets, sinon `Splash` |
| `legal.tsx` | Mentions légales / disclaimer (texte depuis `constants/legal.ts`) |
| `(auth)/login.tsx` | Connexion, inscription, invité, accès revue App Store |
| `(auth)/onboarding.tsx` | Saisie profil → `recalcProfile(draft)` → premier plan (450 l) |
| `(tabs)/_layout.tsx` | Barre d'onglets + garde d'hydratation |
| `(tabs)/plan.tsx` | Plan 7 jours, génération, swap, hors-plan, check-in (918 l) |
| `(tabs)/recettes.tsx` | Catalogue, favoris, édition perso |
| `(tabs)/courses.tsx` | Liste de courses, coche, transfert vers le garde-manger |
| `(tabs)/garde-manger.tsx` | Stock, catégories, recettes cuisinables (348 l) |
| `(tabs)/profil.tsx` | Profil + tous les éditeurs (sports, macros, objectif daté, RGPD) — **1 042 l** |

### `lib/` — logique métier

**Moteur nutrition (le cœur)**

| Module | Ce qu'il fait |
|---|---|
| `tdee.ts` (757 l) | BMR (Katch-McArdle / Mifflin), NEAT, TDEE, macros en 3 modes, plancher+drapeaux, `computePlan` = **producteur unique** du profil calculé |
| `safety.ts` (539 l) | Plancher d'énergie disponible, registre des semaines en zone basse, escalade, éligibilité, âge minimum |
| `datedGoal.ts` (403 l) | Objectif daté premium : trajectoire poids→date, delta kcal/jour, zone de tolérance, statut de piste |
| `sport.ts` | MET par sport, kcal nettes par séance / semaine / jour |
| `planEngine.ts` (1 017 l) | **Le moteur de plan** : distribution par repas, jours de repos, cyclage glucidique, sélection + adaptation, swap, rééquilibrage, totaux du jour |
| `adaptRecipe.ts` | Scaling **par ingrédient** d'une recette vers une cible macro repas → ingrédients ajustés + drapeaux + écart |
| `generatePlan.ts` | Générateur via API Claude — **optionnel**, actif seulement si `EXPO_PUBLIC_ANTHROPIC_API_KEY` est posée |

**Catalogue de recettes (chaîne linéaire, pas un doublon)**

`Recette/recettes-kyroz.json` → `recipeData.ts` (RAW, 314 + 123 refs) → `recipeMap.ts` (`Recipe[]` avec macros/portion, tags, régimes) → `recipes.ts` (couche d'override utilisateur) → écrans.
`recipeFoodMap.ts` (ref → `food_id` Ciqual + fibres manuelles) et `recipeDiet.ts` (déduction des 7 régimes) alimentent la chaîne ; `recipeLabels.ts` ne porte que des libellés.

**Base nutritionnelle**

`foods.generated.ts` (3 341 aliments Ciqual, **généré** par `scripts/convert-ciqual.py`) → `foods.curation.ts` (surcharges/exclusions) → `foods.ts` (`FOODS`, recherche, macros par quantité).

**Données utilisateur & persistance**

`sync.ts` (miroir cloud : push par domaine, hydratation, suppression de compte) · `syncGuard.ts` (arbitrage local/cloud + normalisations anti-divergence) · `supabase.ts` (client) · `weight.ts` (journal de poids, fréquence de pesée, stamps locaux) · `pantry.ts` (garde-manger : stock, correspondance de noms, déduction, couverture) · `shoppingList.ts` · `streak.ts` (série, jalons, gel) · `photos.ts` (progression, **local-only**) · `profileName.ts` · `exportData.ts` (export RGPD) · `healthScreening.ts` (contre-indications, versionné).

**Périphérie**

`fiber.ts` (fibres calculées à la volée depuis les ingrédients) · `dislike.ts` (« j'aime pas ») · `mealtime.ts` (heures de repas, repas restants) · `notifications.ts` (rappels, natif seulement) · `analytics.ts` (PostHog consent-gated, **dormant** sans clé) · `themeMode.ts` · `units.ts` · `reviewAccess.ts` · `types.ts` (425 l de types, **aucune logique**).

### `components/` — 28 composants

Feuilles UI : `ui.tsx` (primitives), `Sheet.tsx` / `ActionSheet.tsx` (modales), `Splash.tsx`, `ErrorBoundary.tsx`, `GuidedTour.tsx` (+ `useTour`).
Affichage moteur : `MacroBar.tsx`, `MacroSplit.tsx`, `MealCard.tsx`, `RecipeDetail.tsx`, `RecipeEditor.tsx`, `FixedMealSheet.tsx`, `OffPlanSheet.tsx`, `DislikeSheet.tsx`, `DislikedFoodsField.tsx`, `SportsEditor.tsx`, `BodyFatPicker.tsx`, `HealthScreening.tsx`.
Suivi & premium : `DatedGoalCard.tsx`, `Transformation.tsx` (`TrackVerdict`), `WeightChart.tsx`, `WeightCheckin.tsx`, `PlanCheckin.tsx`, `StreakProgress.tsx`, `StreakCelebration.tsx`, `FirstPlanReveal.tsx`, `HydrationBar.tsx`, `AnalyticsConsentBanner.tsx`.

### `hooks/` — 9

`useAuth.tsx` (session + inscription + hydratation cloud) · `useProfile.ts` (lecture/écriture du profil, `recalcProfile` au chargement) · `useWeightLog.ts` · `useStreak.ts` · `useFavorites.ts` · `useRecipeOverrides.tsx` · `usePlanCheckin.ts` · `useReminder.ts` · `useAnalyticsConsent.ts`.

### Reste

`constants/theme.ts` (thème adaptatif, source unique des couleurs) · `constants/legal.ts` (texte légal, source unique).
`scripts/` : `convert-ciqual.py` (Ciqual → `foods.generated.ts`), `gen-brief-lot.ts`, `check-doublons.ts`, `mesure-couverture.ts`. *(`gen-validation-recettes.ts` existait au moment de la mesure ; supprimé le même jour avec la validation diététicienne — il reste 4 scripts.)*
`supabase/` : `schema.sql`, 15 migrations, edge function `delete-account`, `RUNBOOK-PROD.md`.
`test/` : mock AsyncStorage + parcours end-to-end Playwright (`*.mjs`).

---

## 2. Duplications de logique — la section importante

**Constat de cadrage, à lire avant la liste :** la duplication redoutée n'est pas là.
`calculateTDEE` (`lib/tdee.ts:200`) est le **seul** calcul de TDEE du dépôt ; `computePlan`
(`lib/tdee.ts:566`) est le **seul** producteur des valeurs stockées (`tdee_kcal`,
`target_kcal`, macros, `floor_kcal`, drapeaux) ; `floorAndFlags` (`lib/tdee.ts:341`) est
partagé par les **trois** modes de macros, mode `manual` compris. `planFlags`,
`planFloorKcal` et `recalcProfile` ne sont que des façades minces sur `computePlan`.

Ce qui suit sont donc des duplications **réelles mais latentes** : elles produisent
aujourd'hui le même résultat, et ne divergeraient qu'à la prochaine modification d'un
seul des deux côtés.

### D1 — `sports[]` et `training_days_per_week` encodent la même information

| Où | Quoi |
|---|---|
| `lib/types.ts:197`+ | Les deux champs coexistent dans `UserProfile` |
| `lib/syncGuard.ts:83` (`normalizeProfileActivity`) | Force la cohérence : `sports` fait foi, le compteur en est **dérivé** — appliqué à **chaque** chargement de profil |
| `lib/tdee.ts:200` | `calculateTDEE` n'utilise **que** `sports` |
| `lib/planEngine.ts:161` (`restDaysForProfile`) | Utilise **que** `training_days_per_week` |

**Quand ça s'exécute :** à chaque lecture locale du profil (`hooks/useProfile.ts:46`) et à
chaque hydratation cloud (`lib/sync.ts:161`).
**État :** le normalisateur empêche la divergence. Sa justification écrite en
commentaire (`lib/syncGuard.ts:64-70` : « `calculateTDEE` choisit sa méthode selon
`sports` : rempli → MET, vide → legacy ») décrit un comportement que le code **n'a
plus** depuis le chemin TDEE unique. Le garde-fou survit à la panne qu'il corrigeait.

### D2 — deux façons d'obtenir le TDEE qui alimente l'objectif daté

| Où | Comment le TDEE est obtenu |
|---|---|
| `components/DatedGoalCard.tsx:32` | **Lit** `profile.tdee_kcal` (valeur stockée) — commentaire explicite l.26 : « on ne recalcule pas » |
| `app/(tabs)/profil.tsx:687` | **Recalcule** `calculateTDEE(profile)` → passé à `datedGoalStatus` |
| `app/(tabs)/profil.tsx:824` | **Recalcule** `calculateTDEE(profile)` → passé à `datedGoalKcalDelta` et à `MacroSplit` |

**Quand ça s'exécute :** l.687 à chaque ouverture de l'éditeur d'objectif daté ; l.824 à
chaque ouverture de l'éditeur de macros ; `DatedGoalCard` à chaque rendu du profil.
**État :** les deux valeurs coïncident tant que `tdee_kcal` a été produit par le moteur
courant — ce que `recalcProfile` garantit au chargement. Elles divergeraient sur un
profil dont la valeur stockée vient d'un moteur antérieur ou d'un round-trip cloud non
recalculé. À noter : `lib/tdee.ts:196-198` affirme « aucun écran ne recalcule par un
chemin parallèle », et ces deux lignes en sont un.

### D3 — le compteur de semaines en zone d'énergie basse, écrit deux fois

| Où | Écriture |
|---|---|
| `lib/safety.ts:413` (`lowEaWeeksForFloor`) | `lowEaWeeksBefore(settleLowEaExposure(stored, today), today)` — doc : « **point d'entrée unique**, tout écran qui prévisualise doit passer par ici » |
| `lib/tdee.ts:580-581` | `settleLowEaExposure` puis `lowEaWeeksBefore`, **en ligne** — le producteur unique n'utilise pas le point d'entrée unique |
| `app/(tabs)/profil.tsx:827` | Appelle bien `lowEaWeeksForFloor` |

**Quand ça s'exécute :** `computePlan` à chaque recalcul de profil ; l'écran à chaque
ouverture de l'éditeur de macros.
**État :** strictement équivalent aujourd'hui (même composition de fonctions pures).

### D4 — la cible « macros du repas courant » construite deux fois, mot pour mot

`lib/planEngine.ts:768-773` (`swapMeal`) et `lib/planEngine.ts:813-818`
(`reAdaptMealRecipe`) construisent le même littéral `AdaptTarget` à partir de
`meal.macros`. Quatre lignes identiques.
**À ne pas confondre** avec `mealTarget` (`lib/planEngine.ts:104`), qui répond à une
autre question (répartir un budget restant sur les repas restants) — ce n'en est pas un
doublon.
**Quand ça s'exécute :** à chaque « changer de recette » et à chaque application d'une
recette personnalisée.

### D5 — deux chemins pour « macros d'une recette = somme de ses ingrédients »

| Chemin | Clé de recherche | Utilisé par |
|---|---|---|
| `lib/recipeData.ts:73` `macrosForRefIngredients` | par `ref` dans `RECIPE_INGREDIENTS` | `recipeMap.ts:25` (construction du catalogue), `adaptRecipe.ts:103,106,165`, `scripts/mesure-couverture.ts:138` |
| `lib/foods.ts:116` `recipeMacrosPerPortion` → `:92` `macrosFromIngredients` → `:76` `macrosForQuantity` | par `food_id` / nom dans `FOODS` (Ciqual) | `components/RecipeEditor.tsx:50` **uniquement** |

**Quand ça s'exécute :** chemin A au chargement du module et à chaque adaptation de
repas ; chemin B seulement quand l'utilisateur édite une recette.
**État :** les deux ne s'accordent que si `REF_FOOD_ID` (`lib/recipeFoodMap.ts:33`) mappe
chaque `ref` sur le bon aliment Ciqual. Rien dans le code ne compare les deux sorties.

### D6 — coefficients 4/4/9 recopiés hors de `kcalFromMacros`

`components/MacroBar.tsx:20-23` calcule `protein_g * 4 + carbs_g * 4 + fat_g * 9` en
ligne, alors que `lib/tdee.ts:424` `kcalFromMacros` existe et est utilisé ailleurs
(`components/FixedMealSheet.tsx:50`, `lib/tdee.ts:633,639`).
**Quand ça s'exécute :** à chaque rendu d'une barre de macros.
**Portée :** proportions d'affichage seulement — aucune valeur persistée.

### Ce que j'ai cherché et NON trouvé

- Aucun second calcul de BMR, de plancher de sécurité, de cible protéique ou lipidique
  hors `lib/tdee.ts` / `lib/safety.ts`.
- Aucun écran ne calcule de poids cible : tout passe par `lib/datedGoal.ts`.
- Aucune couleur en dur hors `constants/theme.ts` ; aucun texte légal dupliqué hors
  `constants/legal.ts`.
- `lib/planEngine.ts` et `lib/generatePlan.ts` produisent tous deux un `MealPlan` mais
  ne sont **pas** un doublon : le second n'existe que si une clé API est posée
  (revendication `CLAUDE.md` §2, vérifiée dans le code).

---

## 3. Fichiers non référencés

**Mesure :** pour chacun des 75 fichiers de `lib/`, `components/`, `hooks/`,
`constants/`, recherche d'un `import … from '…/<nom>'` réel ailleurs dans
`app/ components/ hooks/ lib/ scripts/ test/`.

### Résultat : zéro orphelin

**Aucun** module de `lib/`, `components/`, `hooks/` ou `constants/` n'est dépourvu
d'import. Il n'y a pas de code mort détectable par ce critère.

### Non-importés mais actifs — par conception

| Famille | Fichiers | Pourquoi c'est normal |
|---|---|---|
| **Routes Expo Router** | les 11 de `app/` | Routage par fichiers : le framework les monte par leur chemin, jamais par un `import` |
| **Tests Vitest** | les 33 de `lib/__tests__/` | Découverts par `vitest.config.ts`, importent mais ne sont pas importés |
| **Scripts npm** | les 5 de `scripts/` | Lancés par `npx tsx` / `python` depuis `package.json`, hors graphe de l'app |
| **Parcours E2E** | `test/*.mjs` | Lancés par Playwright hors du bundle |

### Réellement suspects : aucun — avec deux nuances mesurées

- `lib/foods.generated.ts` est bien importé (`lib/foods.ts:30`), mais c'est un **fichier
  généré** : sa source (`Data/Ciqual/`) est hors git, et `convert-ciqual.py` n'a pas
  d'entrée dans `package.json` — la régénération est manuelle et non documentée par un
  script npm.
- `lib/types.ts:84` déclare le mode `'manual'`, que l'UI ne propose plus
  (`app/(tabs)/profil.tsx:818` le ramène sur `'percent'`) ; son chemin de calcul
  (`lib/tdee.ts:614-649`) reste vivant pour les comptes historiques. Code atteignable
  par les données, jamais par l'interface.

---

## 4. Points d'écriture

### 4.1 Stockage local (AsyncStorage) — 49 écritures

Toutes les clés sont préfixées `@kyroz:`.

| Domaine | Propriétaire de l'écriture |
|---|---|
| Profil | `hooks/useProfile.ts:54,65` (+ suppression `:72`) |
| Plan | `app/(tabs)/plan.tsx:239,283,318` · seed `:278,280` |
| Liste de courses | `app/(tabs)/courses.tsx:61,68` (invalidée par `plan.tsx:284,319`) |
| Garde-manger | `lib/pantry.ts:105` |
| Poids | `lib/weight.ts:87` · photos `hooks/useWeightLog.ts:52` |
| Série | `hooks/useStreak.ts:39` |
| Favoris | `hooks/useFavorites.ts:21` |
| Recettes perso | `hooks/useRecipeOverrides.tsx:46` |
| Check-in plan | `hooks/usePlanCheckin.ts:35,43` |
| Rappels | `hooks/useReminder.ts:34` |
| Hydratation | `components/HydrationBar.tsx:51,81,83,84` |
| Thème | `lib/themeMode.ts:22` |
| Prénom | `lib/profileName.ts:9` |
| Questionnaire santé | `lib/healthScreening.ts:50` |
| Consentement analytics | `lib/analytics.ts:36,44` |
| Tour guidé | `components/GuidedTour.tsx:50` |
| Drapeau « profil sale » | `lib/sync.ts:70,73` |
| **Effacement total** | `app/(tabs)/profil.tsx:186` (`AsyncStorage.clear()`) et `:175` (`multiRemove`) |

Deux clés servent de **canal inter-écrans** plutôt que de données :
`@kyroz:openEditor` (`plan.tsx:626,655` → `profil.tsx:144`) et `@kyroz:planReroll`
(`profil.tsx:159` → `plan.tsx:304`).

### 4.2 Supabase — 7 tables, écritures concentrées

**`lib/sync.ts` détient toutes les écritures de données**, une fonction par domaine :
`pushProfile:88,95` · `pushStreak:105` · `pushFavorites:117,119` (delete-puis-insert) ·
`pushPantry:126` · `pushWeights:131` · `pushRecipeOverrides:136` ·
`deleteCloudData:252-257` (les 7 tables).

**Une seule écriture Supabase vit hors de `sync.ts` :** `hooks/useAuth.tsx:58` écrit
`profiles` à l'inscription pour y déposer le consentement RGPD (`consent_health_data`,
`consent_at`). **Vérifié :** ces deux colonnes sont **absentes** de `PROFILE_COLS`
(`lib/sync.ts:49`+), donc `profileToRow` ne les touche pas et ne peut pas les écraser.
Rien dans le code ne garantit cette absence.

Autres points serveur : `supabase.auth.*` (`hooks/useAuth.tsx:29,33,47,52,71,75`,
`lib/sync.ts:61`) et l'edge function `delete-account` (`lib/sync.ts:239`).

### 4.3 Sens de la synchro, point par point

**Écriture locale → cloud (push, best-effort, « fire and forget ») :** l'écran ou le hook
écrit d'abord en local, puis pousse sans attendre. `hooks/useProfile.ts:67`,
`useStreak.ts:40`, `useFavorites.ts:22`, `useWeightLog.ts:29,61,76`,
`useRecipeOverrides.tsx:47`, `app/(tabs)/garde-manger.tsx:55`,
`app/(tabs)/courses.tsx:84,98,114`.

**Cloud → local (pull), une seule fois par session :** `hydrateFromCloud`, appelé
uniquement depuis `hooks/useAuth.tsx:43` à la connexion.

**L'arbitre du conflit :** `lib/syncGuard.ts:25` `decideProfileHydration`.

| Local | Cloud | Décision |
|---|---|---|
| présent **et sale** | — | `keep_local` — puis re-push (`lib/sync.ts:163`) |
| — | présent | `pull_cloud` (`lib/sync.ts:161`) |
| présent | absent | `push_local` |
| absent | absent | `noop` |

« Sale » = écriture locale non encore confirmée poussée (`markProfileDirty` en
`hooks/useProfile.ts:55,66`, levé seulement par un push réussi). **Le profil est le seul
domaine protégé par ce drapeau** : les six autres sont écrasés par le cloud à
l'hydratation s'il a une ligne (`lib/sync.ts:169-227`).

**Jamais synchronisé, par décision :** le plan (déterministe depuis le profil), les
photos de progression (local-only, RGPD), `is_post_menopausal` et
`Streak.freeze_available` (volontairement hors `PROFILE_COLS`, cf. `lib/sync.ts:52-54`).

**Normalisations appliquées à l'entrée cloud** (`lib/syncGuard.ts`) :
`normalizeProfileActivity` (sports ↔ compteur), `normalizeGoal` (objectif legacy),
`reconcileCloudSports`, `reconcileCloudNeat`, `reconcileCloudLowEaWeeks`.

---

## 5. Couverture de tests (ajout hors brief)

563 tests, 33 fichiers, **tous verts** au 2026-07-30.

**Testé, et sérieusement :** `tdee`, `safety`, `datedGoal`, `planEngine`, `adaptRecipe`,
`sport`, `streak`, `weight`, `pantry`, `shoppingList`, `fiber`, `syncGuard`, `dislike`,
`mealtime`, `units`, `healthScreening`, `reviewAccess`, toute la chaîne recettes, plus
des tests transverses (`multiProfile`, `p1`, `p1-etape3`, `sortie-deficit-ea`,
`doublons`, `variety`, `dayTotalTightness`).

**Sans test dédié :** `sync.ts` (259 l, tout le miroir cloud), `generatePlan.ts`,
`notifications.ts`, `analytics.ts`, `exportData.ts`, `photos.ts`, `themeMode.ts`,
`profileName.ts`, `foods.curation.ts`, `recipeLabels.ts`.
`types.ts` et `foods.generated.ts` n'en ont pas besoin (types purs / données générées).

Aucun test unitaire sur les composants ni les écrans ; les parcours d'interface sont
couverts par les scripts Playwright de `test/`.

---

## 6. Divergences doc ↔ code, mesurées

Faits, pas jugements. C'est la partie qu'une lecture du code seul ne peut pas produire.

| Revendication | Où elle est écrite | Ce que le code fait |
|---|---|---|
| « Le moteur reste 100 % déterministe. Mêmes entrées = mêmes sorties. » | `KYROZ_MOTEUR_V2_CORRECTIONS.md` (en-tête) ; `lib/planEngine.ts:10` | Vrai pour `buildLocalPlan` (variation pilotée par `seed`). **Faux pour `swapMeal`** : `lib/planEngine.ts:787` tire avec `Math.random()`. Et `lib/planEngine.ts:740-743` lit l'horloge (`Date.now()`, `new Date()`) pour l'`id`, `week_start_date`, `generated_at`. |
| « Aucun écran ne recalcule le TDEE par un chemin parallèle » | `lib/tdee.ts:196-198` | `app/(tabs)/profil.tsx:687` et `:824` appellent `calculateTDEE(profile)` (cf. D2) |
| `lowEaWeeksForFloor` = « point d'entrée unique » | `lib/safety.ts:409-412` | `computePlan` ne l'utilise pas et recompose en ligne (cf. D3) |
| « `calculateTDEE` choisit sa méthode selon `sports` : rempli → MET, vide → legacy » | `lib/syncGuard.ts:64-70` (justification du normalisateur) | **Plus vrai** : `lib/tdee.ts:200` n'a qu'un chemin. Le commentaire décrit l'état d'avant P1.1. |
| « Faire valider les recettes par une diététicienne avant mise en production » | `VALIDATION-RECETTES.md` (en-tête, 304 Ko généré) | **Contredit par `CLAUDE.md` §6** : validation diététicienne écartée (décision fondateur 2026-07-29). `validated_by_dietitian` reste `false` en dur (`lib/recipeMap.ts`). |
| 79 tâches `- [ ]` à faire | `docs/superpowers/plans/2026-06-16-refonte-recettes-adaptrecipe.md` | **0 case cochée sur 79**, alors que le travail est livré : `adaptRecipe.ts` existe, 314 recettes en catalogue, `adaptRecipe.test.ts` vert |
| « Source brute Ciqual … pas commitée (lourde) » | `kyroz-app/.gitignore` | Respecté dans `kyroz-app/Data/Ciqual/`, mais **une copie de 78 Mo est committée** dans `docs/dataverse_files/` à la racine (le PDF y est en 3 exemplaires) |

---

## 7. Les 5 zones les plus risquées

1. **`app/(tabs)/profil.tsx` (1 042 lignes)** — le plus gros fichier non généré du dépôt
   concentre tous les éditeurs (sports, macros, objectif daté, RGPD, effacement total),
   et c'est le seul endroit où un écran recalcule le TDEE (D2) et déclenche
   `AsyncStorage.clear()`.

2. **`lib/sync.ts` (259 lignes, 0 test)** — c'est le seul module capable de faire perdre
   des données à un utilisateur, six de ses sept domaines n'ont aucune protection
   anti-écrasement, et il est le seul module métier de cette taille sans test unitaire.

3. **Le mode `manual` (`lib/tdee.ts:614-649`)** — chemin de calcul vivant, atteignable
   uniquement par des données historiques et par aucun élément d'interface, dont le code
   documente lui-même un cliquet assumé : la cible ne redescend plus quand le plancher
   baisse.

4. **`PROFILE_COLS` face aux migrations Supabase (`lib/sync.ts:49`+)** — le commentaire
   du code indique que le mode de panne « migration non jouée → tout le profil cesse de
   se synchroniser en silence » s'est déjà produit **trois fois** ; le filet
   `PROFILE_COLS_LAST_MIGRATION` réduit la casse sans supprimer la cause.

5. **`REF_FOOD_ID` (`lib/recipeFoodMap.ts:33`) comme pivot silencieux** — cette table de
   correspondance conditionne à la fois les fibres, les macros de l'éditeur de recettes
   (chemin D5) et la cohérence entre catalogue et base Ciqual, sans qu'aucun test ne
   compare les deux chemins de calcul qu'elle relie.
