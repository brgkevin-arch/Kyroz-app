# AGENTS.md — Kyroz · État du build (handoff inter-sessions)

> Spec stable → `CLAUDE.md`. Ici = état d'avancement + pièges. Tenir à jour en fin de session.

## Setup & déploiement
- Expo Router (file-based), SDK 56, TS strict. Lancer : `npm run web` (8081) / `npm run ios`. Tests : `npm test` (vitest). Preview agent : port **8090** (pas 8081, occupé par le fondateur).
- **En ligne** : web sur GitHub Pages → https://brgkevin-arch.github.io/Kyroz-app/ (repo public `brgkevin-arch/Kyroz-app`, auto-deploy `deploy.yml` à chaque push `main`). Le fondateur publie via **GitHub Desktop** (Commit→Push), pas le terminal.
- ⚠️ **Pièges déploiement** : `baseUrl` DOIT rester dans `app.json > expo.experiments.baseUrl="/Kyroz-app"` (sinon page blanche). Jamais « Re-run all jobs » sur un vieux run (redeploie une version périmée) → forcer via Actions → Run workflow. La page est forcée en `lang="fr"` + `notranslate` par un `sed` dans `deploy.yml` (sinon les navigateurs traduisent les faux-amis : « pain »→« douleur »).

## Décisions verrouillées (cf. CLAUDE.md)
- Freemium large : core loop 100 % gratuit, sans clé API.
- Génération **LOCALE** (`lib/planEngine.ts`) principale ; API Claude (`lib/generatePlan.ts`) seulement si `EXPO_PUBLIC_ANTHROPIC_API_KEY`, sinon fallback local auto.
- Supabase = auth + sync best-effort (offline-first, RLS stricte). Plan non synchronisé (déterministe) ; photos LOCAL-ONLY (RGPD).

## Core loop & moteur
- **Onboarding** (`app/(auth)/onboarding.tsx`, 8 étapes) : prénom (1er, requis, local-only `lib/profileName.ts`) → infos de base + **%MG requis** (`BodyFatPicker`, 6 rendus 3D `assets/bodyfat/{male,female}-N.png`, sources dans `_source/`) → activité → objectif → macros → préférences → jours+repas → récap. ⚠️ Jours du plan ET séances d'activité **décochés par défaut** (l'user choisit ; noir = off, blanc = on). Auto-génère le plan à l'arrivée.
- **TDEE/macros** (`lib/tdee.ts`) : Katch-McArdle si %MG connu, sinon Mifflin. Modes `auto` / `percent` (protéines g/kg réglables + `carb_ratio`) ; `manual` legacy. UI `MacroSplit`. `recalcProfile` → un nouveau poids met à jour profil+macros+plan.
- **Moteur** (`lib/planEngine.ts`) : macro-précis kcal + **protéines + lipides** (deadband kcal, budget reporté ; corrige les « bombes de gras »). Fibres en départage (renforcé en sèche). `ENGINE_VERSION` dans `profileSignature` → régénère les plans en cache si le moteur change. Profils legacy gérés par replis `??`.
- **Recaler ma journée** (différenciateur North Star, anti-abandon) : `rebalanceDay` recalcule les **portions** des repas restants pour rester dans la cible (même recette ; pour changer de plat = `swapMeal`). `Meal.status` planned/eaten/skipped + `locked_macros` ; `MealPlan.day_extras` (kcal hors plan) ; `effectiveMacros` + `computeDailyTotals`. **Auto-reset quotidien** : `resetTracking` quand `plan.tracking_date` ≠ aujourd'hui (« nouvelle journée = page blanche »).

## Écrans
- **Plan** : jours pleine largeur, salutation « Salut {prénom} », tap repas → fiche, bouton « J'ai cuisiné » sur chaque carte (verrouille + déduit frigo + recale + série), « Je l'ai sauté », « J'ai mangé hors plan » (`OffPlanSheet`). **Synchro frigo non-bloquante** : si le frigo est suivi, la carte montre « ✓ tout dans ton frigo » / « 🛒 il te manque : X » + bouton en contour. ⚠️ JAMAIS désactivé (sinon casse le North Star pour qui ne suit pas son frigo).
- **Courses** (« Liste de courses ») : liste cochable ; **cocher → l'article va direct au frigo, décocher → le retire** ; bouton « Tout cocher ». Plus d'étape d'import.
- **Frigo / garde-manger** (`lib/pantry.ts`) : alimenté par les courses cochées, déduction après cuisson, recettes réalisables (`recipeCoverage`).
- **Recettes** : recherche par nom (insensible accents/casse) + filtres + favoris (`useFavorites`). Édition perso (overrides) → `lib/recipes.ts` (`getEffectiveRecipes`…), `RecipeEditor`, sync table `recipe_overrides`.
- **Profil** : édition par catégorie (feuilles) + bouton « Se déconnecter » (`signOut` de `useAuth`).
- **Suivi poids** (`lib/weight.ts`, `WeightCheckin`/`WeightChart`) : 1 pt/jour, cadence configurable, courbe SVG, photos local-only, check-in « ton plan te convient ? » (`usePlanCheckin`). ⚠️ **Dates en heure LOCALE** (`localStamp`, jamais `toISOString`/UTC → décalage d'un jour).
- **Streak** (`lib/streak.ts`, `useStreak`) : paliers 3/7/14…, `StreakProgress`/`StreakCelebration`, écritures sérialisées (verrou anti double-comptage J1).
- **Rappel quotidien** (`lib/notifications.ts`, `useReminder`) : 1 notif locale/jour, no-op web.

## Data / thème / qualité
- **Fibres** (`lib/fiber.ts`) : estimées par mot-clé → g/100 g. ⚠️ Pool pauvre en fibres → vrai levier = ajouter des recettes (légumineuses/légumes/complets).
- **Sync** (`lib/sync.ts`) : profil **colonne par colonne** (`PROFILE_COLS` + migrations idempotentes `supabase/schema.sql`) → ajouter un champ profil synchronisé = nouvelle colonne + migration. Tables profiles/streaks/favorites/pantry/weight_logs/recipe_overrides. Edge Function `delete-account`.
- **Thème** (`constants/theme.ts`) : adaptatif clair/sombre, accent monochrome, pas de couleur en dur (`useTheme()` + `makeStyles(t)`).
- **Recettes** : 50 (`lib/recipes.ts`), `validated_by_dietitian: false`. Fix `formatQuantity` : « bœuf » contenait « œuf » → était compté en œufs (corrigé + test).
- **Tests** : **88 / 8 fichiers** (`npm test`) — garde-fous §6, masse maigre, mode percent, fuseau, déterminisme, recalage du jour, fibres, courses→frigo, units (régression bœuf), intégrité 50 recettes. **Error Boundary** global (`app/_layout.tsx`).

## RESTE (Phase 2)
- **Validation diététicienne** : dossier `kyroz-app/VALIDATION-RECETTES.md` prêt → faire valider, puis `validated_by_dietitian` à `true` recette par recette.
- **Recettes riches en fibres** à ajouter (cf. ci-dessus).
- **Photos cloud / premium** : MVP local existe ; reste Supabase Storage + consentement RGPD + gating premium.
- **Monétisation** : `kyroz-app/MONETISATION.md` (en attente : prix + périmètre gratuit/payant).
- Optionnel : table `meal_plans` au schéma mais jamais écrite (plan déterministe) — documenter ou retirer.

## Garde-fous PARTOUT (CLAUDE.md §6)
Min 1500 kcal/j ♂ / 1200 ♀ ; pas < 16 ans ; disclaimer affiché ; fallback plan (jamais d'erreur vide).
