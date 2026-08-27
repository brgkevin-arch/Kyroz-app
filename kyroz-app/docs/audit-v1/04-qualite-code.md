# Audit V1 — Étape 4 : Qualité code, dépendances, tests
Date : 2026-08-26 · Commit audité : `abf39cf` · Gestionnaire : **npm** (`package-lock.json`, seul lockfile) · Node : **v24.16.0** · npm : 11.13.0 · **292 fichiers `.ts`/`.tsx`** suivis

> Audit, pas fix. Aucun fichier de code, de config ou de dépendance modifié, **aucune installation dans le dépôt** — les outils manquants ont été exécutés depuis le bac à sable `npx`, ce qui laisse `package.json` intact (`git status` propre hors `docs/audit-v1`, vérifié). Rapports écrits hors du dépôt.
> Issu de `docs/audit-v1/briefs/04-qualite-code.md`.

## Reste à couvrir

- [x] A. typage (`tsc`, `tsconfig`, `any` dans le moteur)
- [x] B. lint
- [x] C. santé Expo (`expo-doctor`)
- [x] D. vulnérabilités (`npm audit`)
- [x] E. obsolescence (`npm outdated`)
- [x] F. code mort et dépendances inutiles (`depcheck`)
- [x] G. licences (`license-checker`)
- [x] H. tests et couverture
- [x] I. structure et hotspots
- [x] J. hygiène git
- [x] K. taille du bundle JS

## Tableau de bord

| Mesure | Valeur | Seuil | Statut |
|---|---|---|---|
| Erreurs `tsc` (prod / tests) | **0 / 0** | 0 | ✅ |
| `any` / `@ts-ignore` dans les **5 fichiers moteur** | **0** | 0 | ✅ (104 dans le reste du dépôt) |
| ESLint errors / warnings | **non mesurable** — aucune configuration | 0 / — | 🔴 **04-02** |
| `expo-doctor` checks KO | **2 / 22** | 0 | 🔴 **04-01**, **04-05** |
| `npm audit` prod critical / high | **0 / 10** | 0 / 0 | ⚠️ **04-07** — les 10 sont dans la chaîne de build |
| Majeures de retard (expo, RN, supabase-js, RevenueCat) | **expo 1 majeure** (56→57), RN 0.85→0.87 ; supabase-js et RevenueCat : **0 majeure** | 0 | ⚠️ **04-01** |
| Dépendances de prod inutilisées | **0 réelle** (1 faux positif) | 0 | ✅ |
| Licences hors liste blanche | **3** — toutes permissives, aucune obligation copyleft | 0 | ⚠️ **04-09** |
| **Couverture moteur (lignes)** | **96,35 % → 100 %** sur les 5 fichiers | ≥ 80 % | ✅ |
| Tests KO / skippés | **0 / 0** | 0 / 0 | ✅ (1 835 tests, 117 fichiers) |
| Fichiers > 500 lignes | **15** (dont 3 fichiers moteur > 800) | — | ⚠️ **04-06** |
| TODO / FIXME (dont moteur) | **14 / 1** | — / 0 | ⚠️ **04-08** |
| Bundle JS | **iOS 5,95 Mo · Android 6,92 Mo** | < 5 Mo | ⚠️ **04-04** |

**Couverture des fichiers moteur, dans le détail** (`vitest run --coverage`, provider v8) :

| Fichier | Lignes | Branches | Fonctions |
|---|---|---|---|
| `lib/calorieBank.ts` | **100 %** | 96,15 % | 100 % |
| `lib/datedGoal.ts` | **100 %** | 97,03 % | 100 % |
| `lib/planEngine.ts` | 97,43 % | 84,93 % | 96,92 % |
| `lib/safety.ts` | 96,49 % | 92,99 % | 97,77 % |
| `lib/tdee.ts` | 96,35 % | 90,10 % | 94,87 % |
| *global (292 fichiers)* | *89,77 %* | *83,11 %* | *89,48 %* |

## Constats

### 04-01 Le moteur JavaScript embarqué porte une régression mémoire connue
> ✅ **CORRIGÉ le 2026-08-27** — fiche : `AGENTS.md` **A44**. Montée en **SDK 57**
> (`expo ^57.0.9`, `react-native 0.86.3`, qui embarque le Hermes corrigé). `expo-doctor`
> passe de **2 checks en échec à 21/21**, « No issues detected! ».
- **Sévérité : P1**
- **Preuve** — `npx expo-doctor`, texte intégral du check en échec :
  ```
  ✖ Check for Expo SDK versions affected by Hermes V1 regressions
  This project uses Hermes V1 with expo@56.0.12, which is affected by a known memory regression.
  Detected Hermes V1 250829098.0.10 from React Native. Hermes V1 250829098.0.15 and earlier
  are affected by this regression; 250829098.0.16 is the first version that contains the fix.
  ```
- **Risque** : une régression mémoire dans le moteur JS touche **tous** les écrans, et se manifeste d'abord sur les appareils modestes — exactement le parc qu'une V1 ne peut pas se permettre de perdre. Elle est invisible en développement.
- **Ce qui rend la décision difficile, et pourquoi ce n'est pas une simple reco** : le correctif n'est pas un patch, c'est **Expo SDK 57** (`expo@^57.0.9`) ou React Native ≥ 0.86.2. Donc une montée majeure — nouveaux natifs, nouveau binaire, re-test complet — juste avant une soumission. Et cette montée **coupe la ligne OTA** vers les binaires existants, ce qui croise directement **03-03** (`runtimeVersion: appVersion` sur une version figée).
- **Reco** : trancher explicitement entre (a) monter en SDK 57 maintenant, en groupant avec le passage à `runtimeVersion: fingerprint` et un nouveau binaire, ou (b) soumettre en SDK 56 en connaissance de cause et planifier la montée juste après. **Ce qu'il ne faut pas, c'est ne pas décider** : le check restera rouge à chaque exécution et deviendra du bruit.
- **Effort : L**

### 04-02 Le dépôt n'a aucune configuration de lint
- **Sévérité : P2**
- **Preuve** : ni `.eslintrc*`, ni `eslint.config.*`, ni champ `eslintConfig` dans `package.json`. Aucun script `lint`.
- ⚠️ **Je n'ai pas lancé `npx expo lint`** : la commande **écrit** une configuration et installe des paquets, ce que la règle 1 de ce brief interdit. La mesure est donc « absente », pas « zéro erreur ».
- **Risque** : `tsc` est vert, ce qui couvre le typage — mais rien ne couvre les règles de hooks. `react-hooks/exhaustive-deps` en particulier n'attrape aujourd'hui **aucune** dépendance manquante, et c'est la source classique des états qui ne se rafraîchissent pas (famille du « réglage qui n'agit qu'au redémarrage »).
- **Reco** : poser `eslint-config-expo` et un script `lint`, puis traiter le premier passage comme un lot séparé — pas pendant l'audit.
- **Effort : M**

### 04-03 `expo-glass-effect` est importé directement mais n'est pas déclaré comme dépendance
- **Sévérité : P2**
- **Preuve** : `components/Materiau.tsx:3` — `import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';`. `node_modules/expo-glass-effect` **existe**, mais `package.json` ne le déclare **pas** (`dependencies['expo-glass-effect']` → absent). `depcheck` le classe en « paquet manquant ».
- **Il n'est là que par transitivité** — et le dépôt le sait : `components/CollapsingTitle.tsx:32` écrit « `expo-router` tire `expo-glass-effect` sans le… ».
- **Risque** : un import direct qui repose sur la dépendance d'un tiers. Le jour où `expo-router` cesse de le tirer, le renomme, ou change de mode de hoisting, l'import casse — au build si on a de la chance, à l'exécution sinon. Rien ne le signalerait avant.
- **Reco** : le déclarer explicitement dans `dependencies`. Ce qui est importé se déclare, même si ça marche déjà.
- **Effort : S**

### 04-04 Le bundle JS dépasse le seuil sur les deux plateformes
- **Sévérité : P2**
- **Preuve** — mesuré sur l'artefact **réellement publié** (24ᵉ OTA, commit `786c281` ; les commits suivants sont documentaires, le bundle est identique) :
  ```
  iOS      entry-….hbc   5,95 Mo
  Android  entry-….hbc   6,92 Mo
  assets                 11 Mo
  ```
- **Une cause identifiée, mesurée** : `Recette/recettes-kyroz.json` (**824 Ko**) est importé statiquement par `lib/recipeData.ts:2`, donc intégralement embarqué. `lib/foods.generated.ts` (3 348 lignes) l'est aussi.
- **Ce qui n'y est PAS, contrairement à ce que le poids du dépôt suggère** : les images `assets/bodyfat/_source/` (1,5 Mo + 1,2 Mo + …) ne sont **référencées par aucun code** — elles pèsent sur le dépôt, pas sur le binaire. Vérifié.
- **Risque** : temps de démarrage à froid, et poids de chaque OTA. L'impact réel se mesure à l'étape 5.
- **Reco** : ne rien couper à l'aveugle. Mesurer d'abord le démarrage à froid (étape 5) ; si le budget est tenu, le poids seul n'est pas un défaut.
- **Effort : M**

### 04-05 Dix paquets Expo dérivent du SDK 56 installé
> ✅ **CORRIGÉ le 2026-08-27, dans le même lot que `04-01`** — `expo install --fix` a réaligné
> l'arbre : **15 dépendances déplacées**, aucune ajoutée, aucune retirée. Le chiffrage en
> annonçait 13 ; `expo-file-system` et `expo-glass-effect` sont entrés dans le dépôt après sa
> mesure. Second check `expo-doctor` vert.
- **Sévérité : P2**
- **Preuve** : deuxième check `expo-doctor` en échec — « Check that packages match versions required by installed Expo SDK », **10 paquets** hors des versions attendues (`expo` 56.0.12 vs ~56.0.20, `expo-router` 56.2.11 vs ~56.2.19, `expo-updates` 56.0.23 vs ~56.0.25, etc.). **Aucune montée majeure** : c'est de la dérive de patch à l'intérieur du SDK 56.
- ⚠️ **Deux outils, deux questions — ne pas les additionner** : `npm outdated` ne signale presque rien sur ces paquets, parce qu'il compare aux **plages de `package.json`** ; `expo-doctor` compare à **ce que le SDK 56 exige**. Seule la seconde question concerne un binaire à soumettre.
- **Risque** : faible pris isolément, mais chaque écart est un correctif de compatibilité native non appliqué.
- **Reco** : `npx expo install --check` dans le même lot que la décision **04-01** — inutile d'aligner le SDK 56 si l'on monte en 57.
- **Effort : S**

### 04-06 Trois fichiers moteur dépassent 800 lignes
- **Sévérité : P2** (le brief : « un fichier moteur > 800 lignes = P2 testabilité »)
- **Preuve** : `lib/planEngine.ts` **1 873**, `lib/tdee.ts` **1 518**, `lib/safety.ts` **1 125**. Hors moteur : `lib/foods.generated.ts` 3 348 (généré, sans objet), `app/(tabs)/profil.tsx` **2 066**, `app/(tabs)/plan.tsx` 1 384. **15 fichiers** dépassent 500 lignes.
- **À nuancer honnêtement** : la couverture de ces trois fichiers est de **96 % à 97 % de lignes**. L'argument « testabilité » du brief ne se vérifie donc **pas** ici — ils sont gros ET testés. Le coût réel est la lecture et la revue, pas le test.
- **Reco** : ne pas découper pour le principe. `app/(tabs)/profil.tsx` (2 066 lignes, un écran) est le meilleur candidat, et il relève de l'ergonomie de code, pas du moteur.
- **Effort : L**

### 04-07 Dix advisories « high » — toutes dans la chaîne de build, aucune dans le binaire
- **Sévérité : P3** (le brief demande de le **dire** plutôt que d'aligner des chiffres)
- **Preuve** : `npm audit --omit=dev` → `{"moderate":11,"high":10,"critical":0,"total":21}`. Les dix « high » sont : `metro`, `@expo/metro`, `metro-config`, `metro-transform-worker`, `image-size` (tiré par `metro`), `js-yaml`, `postcss`, `shell-quote`, `nanoid`, `brace-expansion`.
- **Pourquoi ce n'est pas 10 failles dans l'app** : ce sont les composants du **bundler**. Ils tournent sur la machine de build, pas sur le téléphone — rien de tout cela n'entre dans le `.hbc` livré. Les advisories sont d'ailleurs des dénis de service par complexité (`brace-expansion`, `shell-quote`, `js-yaml`), qui supposent une **entrée hostile** que seule une chaîne de build compromise fournirait.
- ⚠️ `--omit=dev` rend **le même compte** que l'audit complet : Metro est une dépendance de production *de l'arbre* (tirée par `expo`), tout en étant un outil de build *à l'usage*. Le chiffre brut de `npm audit` ne sait pas faire cette distinction ; il ne faut pas le lire comme s'il la faisait.
- **Reco** : suivre ces advisories via la montée de SDK (04-01), pas par des `npm audit fix` ponctuels qui désaligneraient l'arbre Expo.
- **Effort : S**

### 04-08 Un TODO dans le moteur, et `noUncheckedIndexedAccess` absent
- **Sévérité : P3**
- **Preuve** : 14 marqueurs `TODO|FIXME|HACK|XXX` dans le dépôt (hors `.md`), dont **1 dans `lib/calorieBank.ts`** — le seul des cinq fichiers moteur à en porter un. `tsconfig.json` étend `expo/tsconfig.base` et n'ajoute que `strict: true` ; `noUncheckedIndexedAccess` n'est pas posé.
- **Risque** : `noUncheckedIndexedAccess` est précisément le drapeau qui aurait typé `targets[day - 1]` (`planEngine.ts:1252`) comme possiblement `undefined`. Le code s'en protège déjà (`?? profile.target_kcal`), mais par vigilance, pas par le compilateur.
- **Reco** : l'activer et traiter la vague d'erreurs comme un lot dédié — jamais pendant un audit.
- **Effort : M**

### 04-09 Trois licences hors liste blanche — aucune n'est copyleft
- **Sévérité : P3** (le brief prescrit P1 pour « tout ce qui sort » ; je descends et je dis pourquoi — règle 6)
- **Preuve** : `license-checker --production --onlyAllow …` sort en code 1. Les trois paquets :
  | Paquet | Licence | Lecture |
  |---|---|---|
  | `argparse@2.0.1` | **Python-2.0** | permissive, compatible, **pas de copyleft**. Outil de build (tiré par `js-yaml`) |
  | `caniuse-lite@1.0.30001799` | **CC-BY-4.0** | licence de **données**, exige une attribution. Build seulement (`browserslist`), jamais embarquée |
  | `node-forge@1.4.0` | **(BSD-3-Clause OR GPL-2.0)** | **double licence** : retenir BSD-3-Clause est un droit, pas une tolérance. Aucune obligation GPL |
- **Pourquoi P3 et non P1** : la règle du brief vise le risque copyleft sur une app fermée. Aucune des trois ne le porte — la seule qui cite GPL le fait comme **option**, et l'autre branche est permissive. Le vrai reste à faire est documentaire : **écrire** que BSD-3-Clause est retenue pour `node-forge`, et porter l'attribution `caniuse-lite` si un écran de mentions existe un jour.
- **Répartition complète** : MIT 520 · ISC 25 · Apache-2.0 13 · BSD-2 12 · BSD-3 9 · BlueOak 6 · Unlicense 2 · 0BSD 2 · MPL-2.0 2. **Aucune AGPL, aucune SSPL, aucune LGPL, aucune licence inconnue.**
- **Effort : S**

### 04-10 `.gitignore` ne couvre pas `coverage/`
- **Sévérité : P3**
- **Preuve** : `.gitignore` couvre `.env*`, `node_modules`, `.expo`, `dist`, et **`/ios` + `/android` en entier** (`:47-48`) — donc `ios/build` et `android/build` sont bien couverts, contrairement à ce qu'une recherche du chemin exact laisserait croire. Mais `coverage` n'apparaît nulle part.
- **Risque** : le jour où la couverture sera lancée avec les réglages par défaut, un dossier `coverage/` non suivi salira l'arbre — et **un arbre sale casse la publication d'une OTA** (astérisque EAS, cf. `check:ota`). Le même piège que la copie de preuve de la 24ᵉ.
- **Reco** : une ligne dans `.gitignore`.
- **Effort : S**

### 04-11 `playwright` est importé nu alors que seul `@playwright/test` est déclaré
- **Sévérité : P3**
- **Preuve** : `test/walkthrough.mjs:4`, `test/qa-full.mjs:19`, `test/qa-settings.mjs:8` — `import { chromium } from 'playwright';`. `package.json` ne déclare que `@playwright/test`.
- **Risque** : même forme que **04-03**, mais côté outillage : ça marche par transitivité et ça cassera silencieusement le jour où elle change. Aucun impact produit.
- **Reco** : importer depuis `@playwright/test`, ou déclarer `playwright`.
- **Effort : S**

## Checklist humaine

Aucune : l'étape est entièrement outillée, et toutes les commandes ont abouti.

Une seule décision, non technique, remonte de **04-01** : monter en SDK 57 avant la soumission, ou soumettre en 56 en connaissance de cause. Elle se prend avec **03-03** (politique `runtimeVersion`) et **03-05** (crash reporting), parce que les trois se paient dans le même binaire.

## Hors périmètre / non couvert

**Commandes qui n'ont pas abouti telles que prescrites, avec leur sortie exacte :**

- `npx vitest run --coverage` (première tentative) →
  ```
  MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
  ```
  Installer le paquet aurait modifié `package.json`, ce que la règle 1 interdit. **Contourné sans rien installer dans le dépôt** : `npx --yes -p @vitest/coverage-v8@4 -p vitest@4 vitest run --coverage …`, exécuté depuis le bac à sable npx → code de sortie 0, 1 835 tests, couverture obtenue. `git status` est resté propre.
- `npx expo lint` : **volontairement non lancé** — la commande écrit une configuration ESLint et installe des paquets. Absence de mesure, pas mesure à zéro (**04-02**).
- `npx knip` : non lancé, `depcheck` ayant répondu à la question de la section F.

**Deux mesures qui mentaient, corrigées avant d'être écrites** — elles valent d'être notées, parce que l'une comme l'autre aurait produit un constat faux :

1. **« 5 tests skippés »** était un artefact de la regex du brief. `xit\(` matche `xit(` **à l'intérieur de** `process.exit(3)` : les cinq « skips » étaient cinq `process.exit()` dans `test/*.mjs`. Le vrai compte est **0**.
2. **`depcheck` signale `expo-splash-screen` comme dépendance de prod inutilisée** — c'est **faux** : elle est déclarée comme plugin dans `app.json:49`, ce que `depcheck` ne sait pas lire. Idem pour `typescript` et `@playwright/test` en devDependencies, utilisées en ligne de commande. Seuls les **paquets manquants** de son rapport se sont révélés vrais (04-03, 04-11).

**Non couvert :**
- **Alignement 16 Ko des bibliothèques natives** : `expo-doctor` ne le signale pas, et le seul SDK natif tiers est `react-native-purchases`. Non vérifiable sans build — laissé à l'étape 3, qui l'a mis en checklist humaine.
- **Le contenu des 104 `any` / `@ts-ignore`** hors moteur n'a pas été instruit un par un : le seuil du brief porte sur les fichiers moteur, où le compte est **0**.
- **La stratégie de chargement** des gros fichiers embarqués (`recettes-kyroz.json`, `foods.generated.ts`) : étape 5.
