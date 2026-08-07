# CLAUDE.md — Kyroz · Spec technique stable (Claude Code)

> Lu automatiquement à chaque session. Contexte = spec STABLE du projet.
> L'état d'avancement (ce qui est fait / reste) vit dans **AGENTS.md**, pas ici.
> Ne pas dupliquer l'avancement ici. Amender, ne pas supprimer de section.

---

## Rappel projet (1 ligne)

App mobile React Native (Expo Router, SDK 56) de plans repas macro-précis pour **hommes ET femmes de 18 à 50 ans** pratiquant du sport. *(Élargi le 2026-07-30 — la cible déclarée était « hommes 18–35 », ce qui ne correspondait plus au produit : les garde-fous féminins — plancher d'énergie disponible, escalade de zone basse — et la borne protéine 0,5 existent précisément pour servir les gabarits légers.)* **Phase 2 — core loop en place + déployé en web (GitHub Pages), itérations UX/qualité en cours.**

---

## 1. Modèle économique

**Freemium large.** Le core loop (génération de plan, plan, courses, recettes) est gratuit et fonctionne sans aucune clé API. La monétisation vient de features avancées, pas du blocage du cœur. **Valeur premium (Kyroz+) tranchée + construite (2026-07-27)** : *« piloter son objectif dans le temps »* — objectif daté (trajectoire calorique vers un poids à une date), suivi de transformation (zone/photos), et à venir la banque de calories. **Paiement = achat in-app Apple/Google via RevenueCat (pas Stripe seul, refusé par les stores). Le SDK est CÂBLÉ depuis le 2026-08-02 et DORMANT** : sans clé RevenueCat rien n'encaisse, et sans date dans `PAYWALL_LAUNCH` rien n'est verrouillé — les features restent gratuites pour tout le monde. Reste les comptes stores, un build natif et une revue (AGENTS.md B2). Détail : `MONETISATION.md` + AGENTS.md.

> **Un seul rythme de sèche, et c'est structurant** (arbitré le 2026-07-31). Il n'y a
> qu'un objectif « Sèche ». `cut_aggressive` est legacy, retiré des écrans et refermé
> sur `cut` à la lecture (`syncGuard::normalizeGoal`). **La vitesse se pilote par
> l'objectif DATÉ, pas par un cran d'objectif** — c'est le seul mécanisme qui sache
> dire si un rythme est tenable, et c'est le cœur de la valeur premium.
> La justification d'origine (« les deux servaient le même plan ») est tombée avec le
> relèvement NEAT du 2026-07-31 : l'écart médian est désormais de 134 kcal/j. La
> décision tient quand même, pour une raison mesurée — **l'objectif daté sert déjà
> exactement le même déficit qu'aurait servi un « rapide », au kcal près** (−351 /
> −384 / −343 sur trois gabarits, identiques), parce que les deux butent sur le même
> plancher. Rouvrir un cran « rapide » n'ouvrirait aucune porte, promettrait 200 kcal
> pour en servir 134, et donnerait une version gratuite dégradée de Kyroz+.
> ⚠️ Ne pas re-proposer sans mesure nouvelle. Détail et chiffres : AGENTS.md.

---

## 2. Stack technique

| Couche | Choix | État |
|---|---|---|
| Mobile | **React Native (Expo Router, SDK 56)**, TypeScript strict | En place |
| Génération repas | **Moteur LOCAL** (`lib/planEngine.ts`) — macro-précis, 0 clé API, **seul chemin** | Moteur unique |
| Persistance locale | AsyncStorage (clés `@kyroz:*`) | En place |
| Backend / Auth | **Supabase** (région EU) — création de compte email + suppression de compte (RGPD) | Auth OK |
| Base nutritionnelle | **Ciqual (ANSES) + table maison** — voir la note ci-dessous | En place |
| Analytics | PostHog (cloud EU) | **Câblé (dormant)** — `lib/analytics.ts`, consent-gated RGPD ; s'active en posant `EXPO_PUBLIC_POSTHOG_KEY` |
| Achats in-app | **RevenueCat** (`react-native-purchases`) | **Câblé (dormant)** — `lib/purchases.ts` ; s'active en posant `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`. Le verrou, lui, dépend de `PAYWALL_LAUNCH` : deux interrupteurs séparés |
| Mises à jour OTA | **`expo-updates`** — correctifs JS sans repasser par la revue des stores | **Actif** (2026-08-01) — voir la note ci-dessous |

> **Mises à jour OTA — installées le 2026-08-01 (C4).** `eas.json` déclarait trois
> canaux depuis des semaines alors que le paquet n'était pas installé : ils étaient
> **inertes**. Trois choses manquaient, pas une : le paquet, le bloc `updates`, et
> `runtimeVersion`.
>
> **Config retenue, et pourquoi** : `runtimeVersion.policy = "appVersion"` (le bundle JS
> est lié à `expo.version`) · `checkAutomatically: "ON_LOAD"` · **`fallbackToCacheTimeout: 0`**.
> Ce dernier n'est pas un détail : il garantit que l'app **ne bloque JAMAIS au démarrage**
> pour attendre une mise à jour. Elle part sur le bundle en cache, télécharge en fond, et
> applique au lancement suivant. Sans ça, la contrainte §4 « latence < 1 seconde » sautait
> à la première connexion lente. Vérifié dans le manifeste généré :
> `EXPO_UPDATES_LAUNCH_WAIT_MS = 0`.
>
> **Publier un correctif** : `npx eas-cli update --branch production --message "…"`.
>
> ⚠️ **Ce que l'OTA ne peut PAS faire** : livrer du natif. Ajouter ou changer une
> dépendance native impose un nouveau build ET une nouvelle revue. `runtimeVersion` est
> le garde-fou : lié à `expo.version`, **monter la version coupe volontairement la ligne
> OTA** vers les anciens binaires, pour qu'un bundle JS ne se retrouve jamais sur un
> natif incompatible.
>
> ⚠️ **Le risque, à connaître avant de s'en servir** : une mise à jour OTA atteint TOUT
> LE MONDE en quelques minutes, **sans revue de store pour l'arrêter**. C'est le filet
> qui disparaît. Ne jamais publier sans `npm test` + `tsc` verts. En cas de casse :
> republier l'update précédent (`eas update:rollback`).
>
> 🔴 **`eas.json` → bloc `env` : lu par `eas build`, PAS par `eas update`.** Découvert et
> **CORRIGÉ le 2026-08-03.** Les clés Supabase ne vivaient que dans `build.<profil>.env`
> d'`eas.json` : un `eas update` lancé depuis un clone frais, un CI, ou toute machine sans
> `.env.local` aurait publié un bundle **sans URL Supabase** — et l'app ne démarre pas
> sans. Le tout distribué à tout le monde en quelques minutes, sans revue pour l'arrêter.
> **Mesuré avant correctif** (export iOS, `.env.local` écarté) : `rgdjsdnqlmfkourrhijv`
> **0**, `sb_publishable_` **0**, clé RevenueCat **1** — celle-ci était déjà une variable
> EAS, et c'est ce contraste qui a désigné le coupable.
> ✅ **État actuel** : les deux clés Supabase sont des variables d'environnement EAS
> (`production`, `preview`, `development`), `eas.json` ne porte plus **aucune** clé, et
> chaque profil **DÉCLARE** son environnement. Garde-fou : `lib/__tests__/easEnv.test.ts`.
>
> ⚠️ **Trois pièges à connaître, chacun payé par une mesure :**
>
> 1. **Le cache de Metro ne s'invalide PAS quand la valeur d'une `EXPO_PUBLIC_*` change.**
>    Le plus vicieux des trois. Après avoir posé les variables, un ré-export a **encore**
>    rendu 0 occurrence : le bundler resservait une transformation figée. Seul `--clear`
>    a produit le bon bundle (0/0 → 1/1). ➡️ **`eas update --clear-cache`**, et vider le
>    cache avant TOUTE mesure — sinon c'est la mesure elle-même qui ment, et elle ment
>    dans le sens rassurant comme dans l'autre.
> 2. **Quand une clé est dans les deux endroits, `eas.json` GAGNE** (eas-cli,
>    `evaluateConfigWithEnvVarsAsync` : `{ ...serverEnvVars, ...buildProfile.env }`).
>    Faire tourner une clé côté serveur seulement laisserait donc les builds servir
>    l'ancienne valeur — le même brique, réintroduit par la porte d'à côté. EAS l'écrit
>    noir sur blanc dans sa sortie (« The values from the build profile configuration
>    will be used ») ; encore faut-il la lire.
> 3. **Sans champ `environment`, eas-cli le DÉDUIT** de `distribution` / `developmentClient`
>    (`store` → production, `developmentClient` → development, sinon preview). Passer un
>    profil en `distribution: internal` le ferait glisser de « production » à « preview »,
>    donc changer les clés servies, **sans qu'aucune ligne du diff ne parle
>    d'environnement**. D'où la déclaration explicite.
>
> ➡️ **Vérifier plutôt que supposer, et c'est GRATUIT** :
> `npx eas-cli config --profile production --platform ios` imprime l'environnement résolu,
> les variables serveur chargées, celles d'`eas.json`, et l'avertissement de doublon —
> **sans lancer de build**. Pour aller jusqu'à l'artefact :
> `npx eas-cli env:exec production 'npx expo export --platform ios --clear --output-dir /tmp/x'`
> puis `strings -a` sur le `.hbc` produit (c'est du bytecode Hermes : `grep` seul rend 0).
> Rien n'est publié — c'est la simulation exacte de ce que l'update enverrait. Même méthode
> que pour le bundle web (§11, « un `require` paresseux ne retire rien du bundle ») :
> **on mesure l'artefact, pas la configuration.**
> ⚠️ Et la table de chaînes de Hermes est **concaténée** : `strings` rend de longues lignes
> qui collent plusieurs chaînes bout à bout. Chercher par sous-chaîne (`grep -c`), jamais
> par égalité de ligne — un `comm` entre deux bundles ne compare que du bruit.
> ℹ️ Aucune permission Android ajoutée — vérifié sur le manifeste généré, et le
> correctif A2 (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW` en `tools:node="remove"`) survit.

> **Le chemin de génération par IA a été SUPPRIMÉ le 2026-07-31.** `lib/generatePlan.ts`
> proposait un appel à l'API Claude « si `EXPO_PUBLIC_ANTHROPIC_API_KEY` est définie ».
> Cette clé n'a jamais été posée : le code n'a donc **jamais tourné en production**, mais
> le SDK Anthropic, lui, était bel et bien **embarqué dans le bundle web public** —
> mesuré sur le bundle déployé : 35 occurrences, le prompt système et la chaîne
> `sk-ant-` servis à chaque visiteur. Suppression = **−224 Ko (−6,6 %)** sur le bundle
> et un piège de sécurité en moins (une clé posée là aurait été inlinée EN CLAIR).
> **Si la génération IA revient un jour : Edge Function Supabase, clé côté SERVEUR,
> jamais côté client** (modèle : `supabase/functions/delete-account`).

> Avant SDK : lire https://docs.expo.dev/versions/v56.0.0/ — Expo a changé.

> **Base nutritionnelle — corrigé le 2026-07-30, chiffres RE-MESURÉS le 2026-08-05.**
> Cette ligne annonçait « Ciqual primaire + **Open Food Facts** secondaire », en statut
> « Cible ». Open Food Facts **n'a jamais été branché** : zéro ligne de code, zéro appel.
> La réalité, mesurée : la table `Recette/recettes-kyroz.json > ingredients_reference`
> porte **125 refs**, dont **117 réellement utilisées** par une recette. **108/125 sont
> sourcées Ciqual** (`lib/recipeFoodMap.ts::REF_FOOD_ID` → base ANSES convertie dans
> `lib/foods.generated.ts`), soit **102/117** en ne comptant que les utilisées, et
> **15 sont saisies à la main** — celles que Ciqual ne couvre pas proprement : `whey`,
> `skyr`, `yaourt_grec`, `cottage_cheese`, `proteine_vegetale`, `soja_texture`,
> `yaourt_soja_proteine`, `levure_maltee`, `edamame`, `haricots_noirs_conserve`,
> `millet`, `wrap_sans_gluten`, et trois mélanges (`legumes_wok`, `ratatouille`,
> `fruits_rouges`).
> ⚠️ **Ces chiffres bougent à chaque vague de catalogue** — la version précédente
> (« 123 / 107 / 16 ») était périmée, et AGENTS.md en citait trois autres qui se
> contredisaient. Les recompter fait partie d'une vague, sinon ils vieillissent seuls.
>
> **Décision fondateur (2026-07-30) : les ajouts futurs se font À LA MAIN.** Pas de source
> tierce automatique. Open Food Facts reste envisageable un jour pour les produits de
> marque, mais **ce n'est pas la voie retenue** — ses données sont des contributions libres,
> de qualité inégale, et le catalogue est un produit, pas un annuaire. Concrètement : un
> aliment qui manque s'ajoute à `ingredients_reference` avec ses macros /100 g, et il est
> mappé Ciqual si un équivalent propre existe.

---

## 3. Architecture données

> ⚠️ **Corrigé le 2026-07-30.** Cette section décrivait six tables qui n'existent pas
> (`users`, `user_profiles`, `meal_plans`, `meals`, `recipes`, `shopping_lists`) —
> `meal_plans` a été supprimée par migration le 2026-06-14, les autres n'ont jamais
> été créées. Vérifié contre `supabase/migrations/*.sql` **et** contre les `from('…')`
> du code. Ce qui suit distingue désormais ce qui est **en base** de ce qui ne l'est pas.

### Tables Supabase — les 6 qui existent réellement

```
profiles                        ← s'appelle « profiles », PAS « user_profiles »
  └── id (= auth.users.id) + 38 colonnes synchronisées.
      ⚠️ NE PAS recopier la liste ici : elle a divergé deux fois.
      Source unique = `PROFILE_COLS` (lib/sync.ts), VERROUILLÉE contre le SQL
      par `lib/__tests__/profileCols.test.ts` — une colonne ajoutée en migration
      sans être ajoutée au code fait rougir un test.
      Les groupes : corps (sex, birth_date, age, weight_kg, height_cm, body_fat_pct,
      activity_level, training_days_per_week, neat_level, low_ea_weeks, sports) ·
      objectif (goal, goal_target, engine_rev, engine_notice) ·
      macros (macro_mode, carb_ratio, protein_per_kg, tdee_kcal, target_*) ·
      plan (plan_days, plan_weekdays, rest_weekdays, meals, meal_emphasis,
      variety, fixed_meals, max_prep_time_min, weigh_in_frequency) ·
      goûts (dietary_restrictions, disliked_foods, preferred_proteins,
      hidden_recipes — « j'aime pas » 👎, masquées, SOUPLE/réversible).
      LOCAL-ONLY volontaire : `is_post_menopausal` (l'onboarding ne pose pas
      la question → inerte tant qu'elle n'est pas posée).
      ⚠️ `age` est DÉRIVÉ de `birth_date` par `computePlan` dès qu'elle existe — il ne
      peut donc plus vieillir de travers. Il reste la valeur SAISIE pour les comptes
      antérieurs au 2026-08-02, dont on ne peut pas deviner la date (un âge ne donne
      qu'une fourchette d'un an). Cf. `lib/birthday.ts`.

streaks
  └── user_id, current_streak_days, longest_streak_days, last_active_date

favorites
  └── user_id, recipe_id

pantry (garde-manger)
  └── user_id, items[] (jsonb)

weight_logs (suivi du poids)
  └── user_id, entries[] (jsonb : date, weight_kg, note?)

recipe_overrides (recettes personnalisées par l'utilisateur)
  └── user_id, overrides (jsonb : recipe_id → Recipe)
```

### Ce qui n'est PAS en base — et pourquoi

| Donnée | Où elle vit | Pourquoi pas en base |
|---|---|---|
| **Le compte** (id, e-mail) | `auth.users`, schéma géré par Supabase | on ne double pas la table d'auth ; `profiles.id` la référence |
| **Le plan de la semaine** | AsyncStorage `@kyroz:plan` | **déterministe** : re-dérivable du profil + du catalogue. `meal_plans` a été supprimée le 2026-06-14 pour cette raison |
| **Les repas du plan** | dans l'objet plan ci-dessus | idem — jamais eu de table `meals` |
| **La liste de courses** | recalculée à la volée depuis le plan moins le garde-manger | idem — jamais eu de table `shopping_lists` |
| **Le catalogue de recettes** | `Recette/recettes-kyroz.json` → `lib/recipeMap.ts`, embarqué dans le bundle | il est le même pour tout le monde ; le servir depuis le réseau ajouterait une latence pour zéro bénéfice. Les fibres sont calculées à la volée (`lib/fiber.ts`), sourcées Ciqual par `ref`/`food_id`, jamais stockées |
| **Les photos de progression** | AsyncStorage, l'appareil uniquement | donnée de santé sensible (RGPD) — décision explicite, cf. §7 |
| **Le journal des repas hors plan** | AsyncStorage `@kyroz:offPlan`, l'appareil uniquement | donnée de **comportement alimentaire** (même traitement que les photos) ; et lui donner une table rouvrirait la porte fermée en supprimant `meal_plans`. Décision fondateur du 2026-08-05, cf. AGENTS.md E6 |

> **Persistance** : AsyncStorage local (source de travail, offline-first) **+ miroir
> Supabase câblé** (sync best-effort par utilisateur, RLS stricte — voir `lib/sync.ts`).
> Exceptions volontaires : le **plan** n'est pas synchronisé (déterministe depuis le
> profil) ; les **photos de progression** et le **journal des repas hors plan** restent
> LOCAL-ONLY (RGPD — données sensibles).
>
> ⚠️ **« Local-only » n'est pas l'autre branche d'un choix — c'est la première moitié
> des deux.** Toute donnée synchronisée de Kyroz a **déjà** une clé locale comme source
> de travail : `lib/sync.ts` fait correspondre 6 clés AsyncStorage à 6 tables. La table
> n'est pas une alternative à la clé, c'est un **miroir posé dessus**. Donc choisir
> local-only ne ferme aucune porte (le miroir s'ajoute plus tard sans rien réécrire),
> alors que l'inverse est cher : une table où des utilisateurs ont des données ne se
> supprime pas à la légère. ➡️ **Devant ce choix, commencer local et mesurer le besoin
> de synchro** — et compter les SIX surfaces qu'une table coûte vraiment (schéma,
> migration à jouer à la main, `sync.ts`, la liste de tables de `delete-account`, la
> politique de confidentialité, le registre RGPD), pas les deux qu'on imagine.

---

## 4. Core Loop (le cœur — priorité absolue)

```
INPUT          → Profil (sexe, âge, poids, taille, objectif, contraintes, repas)
TRANSFORMATION → Génération auto plan repas 7 jours macro-précis (moteur local)
OUTPUT         → Plan + liste de courses + recettes
```

**Contraintes non négociables :**
- Latence < 1 seconde sur l'affichage du plan
- Friction décroissante à chaque répétition (J1 plus dur que J7)
- Output crédible dès J1 (crédibilité > gadget)
- Fallback toujours : jamais d'erreur vide, toujours un plan affiché

---

## 5. Règles de développement

### Priorité
1. Core loop fiable > toute autre feature
2. Fiabilité perçue > richesse fonctionnelle
3. Performance (< 1s) > esthétique avancée
4. La solution la plus simple qui marche > la plus élégante (anti-over-engineering)

> **Un GESTE ne se vérifie pas en web.** Règle tirée d'une mesure du 2026-08-05 :
> le glissement pour fermer les feuilles était mort en natif **depuis le commit
> initial**, et le web l'a caché tout ce temps — `react-native-web` fait passer le
> glissement par des événements SOURIS que le système de responder voit toujours,
> là où iOS, lui, ne propose plus les phases « mouvement » à une vue qui n'a pas
> réclamé le geste au contact. Le web ne pouvait donc dire que « ça marche ».
> ➡️ Tout ce qui est glissement / pincement / balayage se valide **au simulateur**
> (`npx expo run:ios`), jamais sur le panneau navigateur. Détail, mesures et piège
> du `useRef` non recréé par Fast Refresh : **AGENTS.md E12**.

### Features autorisées
- [x] Onboarding (profil + TDEE)
- [x] Génération plan repas 7 jours (moteur local)
- [x] Affichage recettes + macros
- [x] Liste de courses
- [x] Frigo / garde-manger
- [x] Favoris recettes
- [x] Streak tracker (7 jours consécutifs)
- [x] Sync cloud Supabase
- [x] Recaler ma journée (re-plan instantané)
- [x] Banque de calories (« resto samedi » compensé sur la semaine — `lib/calorieBank.ts`)
- [ ] Monétisation features avancées (freemium)

### Features INTERDITES (scope creep)
- ❌ Social / partage
- ❌ Gamification **de compétition** : badges, points, classements, leaderboard
- ❌ Scan code-barres
- ❌ Intégration wearables
- ❌ Coach IA conversationnel
- ❌ Contenu éducatif / articles
- ❌ Notifications push avancées (sauf rappel quotidien simple)

> **Nuance sur la gamification — assouplie le 2026-07-30 (décision fondateur).**
> La règle disait « gamification avancée » sans dire où passait la frontière, et
> elle a servi à refuser d'office des mécaniques de rétention parfaitement saines.
> Ce qui est interdit, c'est la **compétition et la collection** : badges, points,
> classements, comparaison aux autres. Ce qui est **autorisé** : les mécaniques
> sobres qui servent directement le North Star (7 jours consécutifs) et qui
> **rassurent au lieu de mettre la pression** — la série elle-même, et son gel
> d'un jour manqué (`advanceStreak`), en font partie et sont **déjà livrés**.
>
> Test à appliquer en cas de doute : *est-ce que ça compare l'utilisateur à
> quelqu'un d'autre, ou est-ce que ça l'aide à ne pas décrocher ?* Le second
> passe. Ne pas refuser sans avoir posé la question.

---

## 6. Garde-fous IA et nutrition (OBLIGATOIRES — hard block dans le code)

### Autorisé
- Plans repas pour adultes en bonne santé
- Calcul TDEE, macros, portions
- Adaptation recettes selon préférences

### Calcul du TDEE — une seule formule (`lib/tdee.ts::calculateTDEE`)

`TDEE = BMR × NEAT + dépense sportive/jour`, **pour tous les profils sans exception**.

- **BMR** : Katch-McArdle si le %MG est **MESURÉ**, sinon Mifflin-St Jeor.
  ⚠️ **C'est la PROVENANCE qui décide, pas la présence du chiffre** (2026-08-06,
  `ENGINE_REV` 5 → 6, `body_fat_source`). Avant, tout %MG renseigné basculait le
  moteur sur Katch — y compris celui posé en tapant sur une **silhouette**, dont
  l'incertitude est de ±5 points. Katch-McArdle est la formule la plus PRÉCISE
  quand la masse maigre est connue, et la plus FRAGILE quand elle est devinée :
  elle ne lit que ça, là où Mifflin lit quatre entrées certaines (poids, taille,
  âge, sexe). Mesuré : un point de %MG vaut **±13 kcal/jour** de BMR, donc les
  ±5 points de la silhouette valaient **jusqu'à 126 kcal/jour** servis à l'assiette,
  sans que rien à l'écran ne dise que le chiffre était une estimation. Le %MG
  estimé reste **stocké et affiché** (suivi de progression) — il ne pilote plus
  que ce qu'il peut porter.
  ➡️ Prédicat unique : **`tdee.ts::katchEligible`**, et `calculateBMR` prend le
  CORPS entier (pas un `%MG` positionnel) pour qu'aucun appelant ne puisse passer
  le chiffre en oubliant sa provenance. Garde-fou : `bodyFatSource.test.ts`.
  ⚠️ **La masse maigre, elle, continue de lire le %MG DÉCLARÉ quelle que soit sa
  provenance** — c'est une décision, pas un oubli. Le plancher d'énergie disponible,
  la base protéique et le rythme de perte maximal ne bougent donc pas d'un kcal.
  L'alternative (retomber sur Deurenberg quand c'est estimé) a été mesurée et
  ÉCARTÉE : Deurenberg ne lit que l'IMC, l'âge et le sexe, il ne distingue pas un
  muscle d'un kilo de gras, et sur les corps entraînés que Kyroz sert il est **pire
  qu'une silhouette** (+12 points sur une femme de 65 kg à 18 %, +8 sur un homme de
  72 kg à 10 %). Remplacer une information par une régression de population qui
  ignore ce qui distingue cette population n'est pas un garde-fou.
  ⚠️ **`undefined` (tous les comptes d'avant la migration) calcule comme ESTIMÉ**,
  et la colonne n'est **PAS backfillée** : « jamais demandé » doit rester
  distinguable de « répondu au jugé », sinon la question ne peut plus être posée.
  Écart mesuré sur les 12 silhouettes du sélecteur : TDEE **−217 à +363 kcal/j**,
  cible servie **−80 à +363** (le plancher amortit toujours les baisses). Croissant
  avec le %MG déclaré : négatif sur les silhouettes sèches, positif sur les grasses.
- **NEAT** (`neat_level`) : la vie quotidienne **hors sport** — `desk` 1,30 / `light` 1,35 /
  `active` 1,40 / `physical` 1,45. La table s'arrête à 1,45 : au-delà, les niveaux
  classiques (1,50, 1,65) sont « exercice inclus » et recouvriraient les MET.
  Le défaut est **`desk` = 1,30** et ce n'est pas un réglage cosmétique — la question
  vivant dans le profil et non à l'onboarding, ce défaut EST la valeur servie à la
  plupart des gens.
  ⚠️ **Relevé de 1,20 à 1,30 le 2026-07-31 (décision fondateur), `ENGINE_REV` 2 → 3.**
  Le motif d'origine du 1,20 — sur-estimer le NEAT fait manger à sa maintenance en
  croyant sécher, échec silencieux — reste vrai, mais il répondait à une autre
  question. **Mesuré : à 1,20, le déficit demandé n'était servi à AUCUNE masse
  maigre** (de 30 à 80 kg) ; le plancher d'énergie disponible le rattrapait toujours.
  Point de bascule `FFM ≤ 35,3 kg` : au-delà c'est le plancher EA, en deçà `MIN_KCAL`.
  « Sèche = −300 kcal/j » était donc une promesse tenue pour personne — c'est le
  chiffre qu'il fallait corriger, pas l'habillage. Sur 27 648 profils : cible servie
  médiane **+77 kcal/j** (max +239, aucune baisse), plancher contraignant **16 % → 9 %**,
  déficit plein réellement servi en sèche **59 % → 81 %**.
  **Risque assumé** : sur un objectif de MAINTIEN la hausse est répercutée en entier
  (médiane +84 kcal/j) — si l'estimation est trop haute, ces personnes mangent
  au-dessus de leur dépense, et c'est silencieux. Contrepoids : 1,20 est sous le
  plancher physiologique d'un adulte libre de ses mouvements (la FAO ne descend pas
  sous 1,40 pour un mode de vie sédentaire), et Kyroz comptant le sport à part, il
  n'y a aucun risque de double-comptage à 1,30.
  La table est **resserrée** (pas de 0,05 au lieu de 0,08) pour rester monotone sous
  le plafond de 1,45 : un cran vaut désormais ~90 kcal/j au lieu de ~140, donc se
  tromper d'un cran coûte deux fois moins cher.
- **Sport** : méthode MET **NETTE** — `(MET − 1) × 3,5 × poids / 200 × minutes`. Le
  `− 1` retire le métabolisme de repos déjà compté par `BMR × NEAT` pendant l'heure
  de séance. C'est aussi la définition de l'EEE utilisée par le calcul d'énergie
  disponible RED-S.

Il n'y a plus de multiplicateur par nombre de séances : `training_days_per_week` ne
pilote plus le TDEE (il reste utilisé pour les jours de repos et la génération du
plan). Le double chemin produisait une discontinuité — déclarer une séance de
15 minutes de marche faisait bondir le TDEE de +181 kcal/jour en médiane.

### Répartition entre repas — plancher protéique (`lib/planEngine.ts`)

La cible d'un repas est une part du budget **restant** du jour : le report de repas en
repas est ce qui garde le total quotidien serré (0,05 % d'écart mesuré). Mais il a un
effet de bord — chaque repas qui dépasse sa part rogne celle des suivants, et le
**dernier servi** (la collation, dernière de `MEAL_ORDER`) encaisse toute la dérive.

Depuis le 2026-08-02, la cible protéique d'un repas ne peut plus descendre sous
**0,7 × sa part équitable** du budget du jour (`PROT_SHARE_FLOOR`), bornée par les
calories du repas. Sans ce plancher, mesuré sur un gabarit en prise de masse : part
équitable 12,7 g, cible réellement demandée à la collation **5,4 g** — soit 1,7 g de
protéines pour 100 kcal, une densité qu'aucune recette ne peut viser. Le moteur en
déduisait un besoin de 47 g de glucides, la recette débordait en calories pour
l'atteindre, et 35 collations sur 79 étaient jugées « trop grosses ».

⚠️ **La valeur 0,7 est un point mesuré, pas un réglage esthétique** : au-delà, le vivier
total continue de monter mais le créneau le plus rare du catalogue (les repas complets
des gros gabarits) se dégrade. Le raisonnement complet et les chiffres sont en
`AGENTS.md` D16, le garde-fou en `lib/__tests__/mealProteinFloor.test.ts`.

⚠️ **Ce plancher doit être passé à TOUS les chemins qui calculent une cible de repas, pas
seulement à la sélection.** Corrigé le 2026-08-03 : `mealTarget` accepte le plancher en
paramètre **optionnel**, et la passe de resserrage `tightenDay` l'omettait — il retombait
donc à 0 en silence. Le garde-fou disparaissait exactement dans le cas qu'il existe pour
couvrir (un jour dont le total dérive, c'est-à-dire un jour où les premiers repas ont mangé
le budget des suivants). Mesuré sur 1 680 jours : pire cible protéique de la collation
**32 % → 67 %** de sa part équitable, précision calorique du jour inchangée (0,382 →
0,380 %), `carbs_below_target` 16 → 13. ➡️ **Un paramètre de sécurité ne doit pas avoir de
valeur par défaut permissive** : ici, `= 0` a rendu l'oubli invisible pendant un jour
entier de production. Le défaut était dormant depuis D16 et n'est apparu qu'en changeant
le catalogue.

Toute correction qui déplace les cibles doit incrémenter `ENGINE_REV` : un
avertissement one-shot (`engine_notice`) explique alors le changement à
l'utilisateur au-delà de 100 kcal/jour d'écart.

### Variété — la rotation se fait par FAMILLE, pas seulement par recette

`usage` fait tourner les **ids** : il empêche la même recette de revenir, pas deux
recettes **quasi identiques**. Mesuré le 2026-08-02 sur 240 semaines simulées :
**56,3 % des semaines servaient deux recettes du même couple (protéine × féculent)** —
« poulet-riz-brocoli » et « wok poulet-riz-légumes » la même semaine. Depuis,
`familyKey` groupe les recettes par ce couple et la famille la moins servie passe devant.
**État courant : 10,0 %** (`--variete=max`, défaut). *(27,9 % à la livraison de D18, quand
la famille n'était QU'une clé de départage ; puis 20,8 % après A21 et A25, qui l'ont fait
entrer dans le score.)*

⚠️ **Les trois derniers gains ne viennent PAS du moteur mais du CATALOGUE** (vagues B7, B8
puis B9, 2026-08-03) : 20,8 → 12,5 → 11,7 → **10,0 %** sans toucher une ligne de sélection.
Le détail par régime dit pourquoi — vegan **41,7 % → 8,3 %**, vegan + sans gluten
**50 % → 35,4 % → 22,9 % → 16,7 %**. Là où le vivier de familles est mince, aucun réglage ne fait tourner ce qui
n'existe pas : A25 l'avait mesuré et nommé « limite de catalogue ». ➡️ Devant un plafond de
variété, se demander d'abord s'il reste des familles à distribuer (`npm run mesure:vivier`,
et `mesure:variete -- --regime=…` pour isoler le régime fautif), avant de toucher aux poids.

⚠️ **`familyKey` dégénère sur les recettes SANS féculent, et il ne faut PAS le « corriger »
à la légère.** Toutes les collations d'une même ancre sans féculent tombent dans une seule
famille — mesuré, 8 yaourts de soja + fruit en formaient une, à l'origine de 9 des 18
collisions vegan+SG. Faire du FRUIT le second axe quand le féculent manque ferait tomber ce
régime de 33,3 à 16,7 % **sans qu'un seul repas servi ne change** : ce serait corriger
l'affichage, pas le produit — exactement ce que la règle « pas de mensonge » interdit. La
question légitime est de PRODUIT (« deux yaourts de soja à des fruits différents, est-ce
une répétition ? ») et se tranche avec le fondateur, pas dans un correctif de métrique.

⚠️ **Trois propriétés de ce mécanisme, chacune payée par une mesure.** Deux d'entre elles
ont CHANGÉ depuis D18 — elles étaient écrites « non négociables » et décrivaient un moteur
qui n'existe plus ; se fier à l'ancienne version conduit à refuser un mécanisme déjà en
place (corrigé le 2026-08-02 par un audit des .md contre le code) :
1. **La clé de départage réordonne sans exclure — mais la pénalité de SCORE, elle, sort
   du panier une famille déjà servie.** C'est son objet : `FAMILY_SELECT_W_*` (0,03 au
   canonique, 0,04 sur un reroll) dépasse la bande de départage (`TIE_BAND_BALANCED`
   0,01, +0,014 en sèche), donc la recette d'une famille déjà servie quitte `pickable`.
   ⚠️ Ça reste borné par le régime : sur le pool le plus mince (F 55 sèche, vegan + sans
   gluten), les 28 repas restent servis — un test l'exige.
2. **Il passe APRÈS `preferred_proteins`.** Une variante qui coupait la bande plus haut
   descendait les quasi-doublons à 9,6 % — mais les repas servis à qui déclare préférer
   le poulet tombaient de 27,2 % à 18,3 %. Un nudge de variété ne passe pas devant le
   signal explicite de l'utilisateur. **(Inchangée — la seule des trois.)**
3. **Il pèse en points de score ET en clé de départage bornée en grammes de fibres**
   (`FAMILY_SELECT_W_*` dans `effOf`, puis `FAMILY_FIBER_TOL` au départage). La crainte
   d'origine était réelle — dans le score, la famille se disputait la bande avec le biais
   fibres de sèche et le faisait tomber sous son seuil. Ce qui l'a levée n'est pas de le
   sortir du score, c'est de le **compenser** (`FIBER_SELECT_W_VARIANT`) : fibres en sèche
   20,42 vs maintien 14,49 g/1 000 kcal, la sèche reste devant.

➡️ Le contrôle est `npm run mesure:variete`, le garde-fou
`lib/__tests__/varieteFamille.test.ts`, le raisonnement complet `AGENTS.md` D18.

⚠️ **Le réglage `variety` pilote AUSSI l'ampleur du reroll depuis le 2026-08-02**
(`REROLL_PAR_VARIETE`). Il ne le pilotait pas : « Variété max » et « Équilibré »
rendaient un « Régénérer mon plan » identique au bit près, donc deux des trois cartes
de l'écran mentaient. Un réglage doit agir sur TOUS les chemins qui produisent un plan,
pas seulement sur le canonique. Contrôle par réglage : `npm run mesure:reroll` et
`npm run mesure:variete -- --variete=repetitive|balanced|max` (cf. AGENTS.md A21/A23).

⚠️ **La règle anti-doublons R4 du catalogue ne mesure PAS ce défaut** : elle ne s'alarme
qu'au-delà de 2 recettes par couple, or le pire contrevenant était un groupe de DEUX.

⚠️ **Le PREMIER plan servi doit être aussi bon que les suivants** (2026-08-02,
`FAMILY_SELECT_W_CANON`). La pénalité de famille ne s'appliquait qu'aux plans régénérés :
le plan canonique — celui qu'un nouvel inscrit reçoit — servait deux assiettes jumelles
dans **45 %** de ses semaines contre 20 % pour un plan régénéré. Appuyer sur « Régénérer »
réparait la première impression. ➡️ **Tout nudge de qualité doit s'appliquer au canonique
aussi**, quitte à être plus doux (0.03 au lieu de 0.04 : au-delà, un repas hors cible
apparaît, et le canonique doit rester à zéro). Contrôle : `npm run mesure:variete -- --seeds=0`.

⚠️ **CE QUI A ÉTÉ MANGÉ NE SE RE-PLANIFIE PAS** (2026-08-02, `carryTracking`). Générer
un plan remplaçait l'ancien sans le regarder — donc l'auto-refresh effaçait, en pleine
journée, les repas marqués « mangé », les portions consommées et les écarts hors plan.
Mesuré : **1 448 kcal déjà avalées oubliées en moyenne**, après quoi l'app replanifiait
une journée pleine par-dessus. ➡️ **Un statut de suivi est un FAIT, pas une préférence :
aucune génération n'a le droit de l'effacer.** Le report est asymétrique — un repas
*mangé* est conservé ENTIER (recette + macros), un repas *sauté* ne garde que son statut.
La péremption reste au changement de JOUR (`resetTracking`), nulle part ailleurs — y
compris quand l'utilisateur demande LUI-MÊME un nouveau plan (arbitré par le fondateur le
2026-08-02 : « Régénérer » renouvelle les repas à venir, il n'efface pas la journée).
⚠️ Corollaire pour les livraisons : **un bump d'`ENGINE_VERSION` déclenche l'auto-refresh
chez tout le monde**. Ce n'est pas une opération neutre côté utilisateur.

⚠️ **Le plan que l'utilisateur s'est CHOISI ne se jette pas** (2026-08-02, `nextPlanSeed`).
L'écran Plan remettait le tirage à zéro à chaque génération non-reroll — donc à chaque
changement de réglage, via l'auto-refresh. L'utilisateur perdait la semaine qu'il avait
obtenue en régénérant (92 % détruits **en plus** de ce que le réglage changeait), et
retombait parfois sur le plan exact qu'il venait de rejeter. ➡️ **Une préférence exprimée
par un geste — régénérer jusqu'à être satisfait — est une préférence : elle survit aux
réglages suivants.** La règle est une fonction pure testée, pas trois lignes dans un
composant. Audit complet des réglages : `npm run mesure:reglages`.

### Bloqué (hard block)
- **Plans sous le plancher d'énergie disponible** — `lib/safety.ts::safetyFloorKcal`.
  Plancher = `max(BMR, min(30 kcal/kg de masse maigre + dépense sportive, TDEE), 1500 H / 1200 F)`.
  ⚠️ La composante énergie disponible est **plafonnée à la maintenance** : un plancher
  de sécurité empêche un déficit excessif, il n'impose **jamais** un surplus. Sans ce
  plafond, l'escalade prescrivait +282 kcal/jour à une femme de 125 kg. Le BMR et le
  filet absolu, eux, restent des minima durs (si le TDEE tombe sous eux, c'est
  l'estimation de dépense qui est fausse, pas le besoin physiologique).
  Le 1500/1200 reste comme **filet absolu**, il n'est plus le plancher principal :
  il autorisait 1200 kcal à une femme de 65 kg s'entraînant 5×/semaine, dont le
  minimum physiologique est ~1863. Aucun chemin de code ne le contourne, mode
  `manual` compris. Au-delà de 12 semaines cumulées en zone basse (30–35 kcal/kg
  de masse maigre), le plancher remonte progressivement vers 35 chez la femme non
  ménopausée — le produit ne bloque pas, il force une sortie de déficit.
  Le compteur mesure des semaines **VÉCUES** et non des recalculs (`since` +
  `settleLowEaExposure`) : la protection ne peut pas dépendre de la fréquence à
  laquelle l'utilisatrice ouvre l'app.
- **Tout déficit sous IMC 18,5** — `lib/safety.ts::deficitBlocked`, appliqué à
  CHAQUE calcul dans `tdee.ts::floorAndFlags` : le plancher monte à la maintenance
  (jamais au-dessus — on ne prescrit pas une prise de poids à qui a demandé une
  sèche). L'éligibilité ne garde que les portes d'ENTRÉE ; sans ce contrôle,
  quelqu'un qui commence à IMC 19 et descend à 17,8 continuait de recevoir un
  déficit indéfiniment. Même seuil et même prédicat que `checkEligibility`.
- Déficit **> 25 % du TDEE** (`lib/datedGoal.ts::MAX_DEFICIT_TDEE_RATIO`) — appliqué
  sur **TOUS** les chemins depuis le 2026-07-28, y compris les deltas figés de
  `GOAL_CONFIG` : il ne concernait auparavant que l'objectif daté, et « sèche rapide »
  servait 28 % de déficit à une femme de 60 kg sans le moindre drapeau. C'est un
  plancher calorique de plus (75 % du TDEE), il ne peut donc pas créer de surplus.
> **Objectif daté — quand la date ne tient pas, Kyroz sert le rythme sûr MAXIMAL**
> (2026-08-03, A15, `ENGINE_REV` 4 → 5). La règle : servir juste ce qu'il faut TANT QUE
> ça suffit ; dès que la simulation dit que la date ne sera pas tenue, servir le maximum
> **sûr** et dater la trajectoire là-dessus.
>
> **Le défaut que ça corrige** : le rythme requis se calculait en LIGNE DROITE
> (`écart ÷ semaines`) alors que l'arrivée est SIMULÉE. Repousser sa date réduisait donc
> le déficit demandé, le plancher cessait de mordre, le rythme SERVI tombait — et
> l'arrivée reculait. **La date affichée n'était vraie que tant qu'on ne s'en servait
> pas** : mesuré, elle glissait de +96 jours dès qu'on l'adoptait, sur 3 corps de
> référence sur 8. Depuis, le rythme ne dépend plus de l'échéance, donc **la date
> projetée est un point fixe**.
>
> ⚠️ **Aucun garde-fou n'est franchi** : rythme sûr modulé par l'adiposité, plafond des
> 25 % du TDEE, plancher d'énergie disponible — on ne va pas plus vite que ce que la
> sécurité autorisait déjà à quelqu'un ayant choisi une date proche. Balayé par
> `datedGoal.test.ts` → « A15 — creuser plus ne franchit AUCUN garde-fou ».
>
> ⚠️ **`computePlan` passe désormais un PROJECTEUR** (`lib/tdee.ts`). Ce n'était pas le
> cas, au motif que « computePlan n'a besoin que du delta » — vrai tant que le delta ne
> dépendait pas de la projection. Sans lui, les écrans afficheraient la trajectoire
> corrigée pendant que l'assiette servirait l'ancienne. Coût mesuré : 0,026 → 0,11 ms
> (0,47 au pire). Aucune récursion : l'appel intérieur du projecteur reste `project: null`.
>
> ➡️ Contrôle : `npm run mesure:objectif`. Raisonnement complet et chiffres : AGENTS.md A15.

> **Les échéances proposées sont DÉRIVÉES DU CORPS, jamais figées** (2026-08-03, A27,
> `lib/goalLadder.ts`). La rangée offrait cinq durées en dur — 4 / 8 / 12 / 16 / 24
> semaines — et **9 puces sur 40 seulement étaient tenables** : sur 4 corps de référence
> sur 8, AUCUNE ne l'était. La première échéance atteignable se situait entre 18 et
> 82 semaines, hors de la rangée.
>
> **Deux invariants, et il faut les deux.** Une rangée dont chaque puce tient serait
> encore mensongère si deux puces servaient la même assiette :
>  1. **tenable** — la puce ne promet pas une date que le moteur ne tiendra pas ;
>  2. **distincte** — sous une certaine durée, le plancher d'énergie disponible borne le
>     déficit, donc allonger l'échéance ne change RIEN au plan. Mesuré avant correctif :
>     **14 puces sur 40** servaient un plan distinct, et sur 5 corps sur 8 les CINQ
>     boutons servaient la même assiette. C'est le défaut A23 (« un réglage qui ne pilote
>     rien »), resté invisible parce qu'on ne mesurait que la tenabilité.
> ➡️ **Quand on remplace un composant, mesurer aussi ce qu'on ne l'accusait PAS de faire.**
> Après : **40 / 40** sur les deux critères.
>
> ⚠️ **L'échelle interroge le moteur, elle ne rejoue pas ses formules** : `deadlineLadder`
> reçoit une SONDE, exactement comme `datedGoalStatus` reçoit un projecteur. Le prix est
> réel — ~17 sondes simulant chacune jusqu'à 260 semaines, soit 3 à 45 ms sur les
> gabarits courants et 283 ms sur un écart de 30 kg. **Donc mémoïsé sur le poids cible**,
> sinon la saisie devient saccadée.
>
> ⚠️ **La recherche par dichotomie repose sur une propriété MESURÉE, pas garantie par le
> code** : une fois qu'une durée tient, toutes les plus longues tiennent. Un test balaye
> l'horizon et exige l'absence de trou — sans lui, la première puce deviendrait fausse en
> silence le jour où la propriété tombe.
>
> ⚠️ **En PRISE de masse, les calories servies BAISSENT quand la date s'éloigne.** Tout
> prédicat écrit en pensant à la sèche (`>`, « plus de calories ») y est faux : le test de
> décollage du plancher est `!==`. Une version orientée perte marchait sur la prise **par
> accident**. Vaut au-delà de ce module.

- **Lipides sous le seuil de carence** — `lib/tdee.ts::fatTargetG`, plancher à
  0,8 g/kg de **poids de corps** (`FAT_MIN_PER_KG_BW`). Borné par le budget du
  jour, donc un plan reste toujours faisable.
  ⚠️ **La cible VISE 15 % au-dessus du plancher (`FAT_FLOOR_AIM_MARGIN`),
  corrigé le 2026-08-01, `ENGINE_REV` 3 → 4.** Ce n'est pas un second plancher :
  le seuil de carence reste 0,8 g/kg. C'est l'écart nécessaire pour que
  **l'assiette** le franchisse, et pas seulement la cible.
  **Le défaut, mesuré** : en sèche comme en maintien, la cible valait EXACTEMENT
  le plancher — marge nulle — et le plan, qui approxime la cible avec de vraies
  recettes, retombait dessous **86 % des jours** (560 jours mesurés ; pire cas
  H 100 kg à 2 repas, **0,50 g/kg servi pour 0,80 visé**). §6 annonçait un hard
  block que l'assiette ne respectait pas. Après : **1 %**, pire écart −8 g.
  ⚠️ **Piste écartée, mesurée** : relever le plafond de rôle `fat` du catalogue
  (×1,5, le plus bas de tous les rôles) ne corrige rien — 86 % → 83 % à 1,7
  comme à 2,0. Le manque ne vient pas de recettes incapables de porter du gras :
  le moteur vise les kcal et la protéine, les lipides encaissent le résidu.
  ⚠️ **Ce que ça coûte, assumé** : sur 576 profils, `CARBS_BELOW_TRAINING_FLOOR`
  passe de 30 % à 39 %, la part lipidique de 27,8 % à 30,7 % (dans la fourchette
  usuelle 20–35 %), les glucides moyens de 306 à 289 g. **Et en mode « Perso % »
  l'écart entre le curseur et ce qui est servi se creuse** : un curseur à 55 % de
  glucides en sert 50. Le plancher passait déjà avant le réglage de l'utilisateur
  (cf. la note sur le changement de base ci-dessous) ; il passe désormais de plus
  loin. **Aucun avertissement one-shot n'est servi** : les calories ne bougent pas
  (seule la répartition change), donc l'écart est sous le seuil des 100 kcal.
  ⚠️ **Base changée le 2026-07-31 (décision fondateur).** Elle était la **masse
  maigre**, au motif que le tissu adipeux n'a pas de besoin lipidique — même
  raisonnement que les protéines, qui elles gardent la base masse maigre. Ce qui
  change, mesuré en sèche : le plancher devient **contraignant sur tous les profils
  testés** (il ne borne plus la part calorique, il la fixe — donc en « Perso % » le
  curseur glucides de l'utilisateur est écrasé), et `CARBS_BELOW_TRAINING_FLOOR`
  passe de 3 profils sur 6 à 6 sur 6. Cas le plus exposé, F 125 kg à 52 % de MG :
  48 → 100 g de lipides, soit **25 % → 43 % des calories**, prélevés sur les
  glucides (239 → 144 g). Le bornage au budget est désormais la seule protection
  contre un plan infaisable. Le mode « Perso % » descendait à 6,6 %
  des calories en lipides ; son curseur est plafonné à 75 % de glucides et
  `carb_ratio` est **clampé à la lecture** (une borne d'écran ne migre aucun compte
  déjà enregistré).
- Pathologies (diabète, IRC, cardio)
- Femmes enceintes / allaitantes
- **Utilisateurs < 18 ans** (bloquer à l'onboarding) — relevé de 16 à 18 le
  2026-07-28 : Mifflin-St Jeor n'est pas validée sous 19 ans, et servir un moteur
  de déficit calorique à un mineur est un risque de conformité App Store autant
  que de sécurité. Source unique : `lib/safety.ts::MIN_AGE`.
- IMC de départ < 18,5 avec un objectif de sèche ; poids cible hors plage saine ;
  volume d'entraînement > 20 h/semaine (`lib/safety.ts::checkEligibility`)

### Allergènes — le produit n'en promet AUCUN, et c'est une décision

**Il n'y a pas d'axe allergène dans le modèle, volontairement** (tranché le 2026-08-02).
Le champ « aliments à éviter » (`disliked_foods`) est un filtre **dur** mais c'est une
**préférence**, pas une garantie : un catalogue générique ignore les traces, la
contamination croisée et la composition réelle des produits industriels qu'il emploie
(falafel prêt à consommer, pesto, chapelure). Afficher « sans arachide » serait une
promesse de sécurité que Kyroz ne peut pas tenir, et le produit n'est pas un dispositif
médical. ➡️ **Aucun écran ne doit employer le vocabulaire de la garantie allergène.**

Ce qui a été corrigé à la place : le filtre échouait **en silence**. Mesuré sur les
123 refs, écrire `poisson` n'écartait **aucun** des 7 poissons, `arachide` aucun des
29 plats à la cacahuète, `fruits à coque` aucun des 96 — alors que le champ proposait
lui-même « arachide, crustacés… » en exemple. Et il attrapait trop dans l'autre sens :
`bœuf` contient `œuf`, donc éviter les œufs retirait 23 des 24 plats de bœuf.
`lib/avoidance.ts` normalise (ligatures, accents), résout les **familles** (mot → refs)
et ancre la correspondance en début de mot. L'écran affiche désormais ce que le mot
écarte, ou dit qu'il n'écarte rien.

### Disclaimer obligatoire (UI)
> *"Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste."*

Afficher : onboarding J1, paramètres, chaque plan généré.

### Validation contenu

🚫 **La validation par une diététicienne est ÉCARTÉE (décision fondateur, 2026-07-29).**
Ce n'est pas un retard à rattraper, c'est un choix. **Ne plus la remonter** comme
prérequis, ni dans un bilan, ni dans une recommandation de chantier.

Ce que la décision ne fait PAS disparaître, et qui reste vrai :
- `validated_by_dietitian` reste `false` en dur (`lib/recipeMap.ts`) → **aucun écran
  ne doit prétendre le contraire**, et la revue App Store est sévère sur les
  allégations santé. Le disclaimer ci-dessus est donc d'autant plus obligatoire.
- Les coefficients protéiques de `GOAL_CONFIG` se déclarent « PROVISOIRES » dans le
  code en attendant un tiers qui ne viendra pas → soit retirer la mention, soit
  l'assumer explicitement, mais ne pas laisser le code annoncer une attente vide.

Historique : ces deux lignes exigeaient « prompts revus par diététicienne diplômée
avant prod » et « `validated_by_dietitian` à passer à `true` après validation ».

---

## 7. RGPD — données de santé

Profil (poids, objectif, régime) = **données de santé** au sens RGPD.

- [x] Création de compte par email (Supabase)
- [x] Droit à l'effacement (suppression de compte par l'utilisateur)
- Stockage EU uniquement (Supabase région EU)
- Consentement explicite à la collecte (onboarding)
- Pas de revente, pas de pub, pas de tracking tiers sans consentement
- Contact RGPD/DPO dans les CGU

---

## 8. Thème UI et mise en page

### Thème

- `constants/theme.ts` : adaptatif clair/sombre (suit le système)
- Accent **monochrome PAR DÉFAUT** (blanc en sombre / encre en clair), noir pur `#000000` en sombre
- Tout passe par `useTheme()` + `makeStyles(t)` — **aucune couleur en dur**

> **L'accent est PERSONNALISABLE depuis le 2026-08-03 (décision fondateur)** —
> `lib/accentColor.ts`, réglage « Couleur d'accent » dans Profil → Préférences.
> Six choix : monochrome (défaut), bleu, vert, orange, rouge, violet. Le monochrome
> reste la DA de Kyroz : **le fond ne bouge jamais** (noir pur / `#F2F2F7`), seul
> l'accent change — boutons, jour actif, pilule sélectionnée, onglet actif,
> **et la barre de macros** (2026-08-06).
>
> **LOCAL-ONLY**, comme la préférence de thème : aucune colonne, **aucune migration
> Supabase**. C'est un réglage d'APPAREIL, pas une donnée de profil — le même compte
> peut vouloir du bleu sur son téléphone et du monochrome sur son iPad.
>
> ⚠️ **`onAccent` se CALCULE, il ne se choisit pas** (`readableOn`) : la couleur du
> libellé est toujours celle — noir ou blanc — qui contraste le plus avec le fond du
> bouton. Une table écrite à la main est une promesse qu'on oublie de tenir : il
> suffit d'ajouter un orange clair en gardant « texte blanc » pour livrer un bouton
> illisible, et ça ne se voit pas en relisant un diff.
>
> ⚠️ **Le garde-fou est « l'accent se détache du FOND DE PAGE » (3:1), PAS « le texte
> est lisible ».** Le second serait décoratif : avec la règle du meilleur-des-deux, le
> pire fond concevable atteint encore **4,61:1** — un seuil AA ne pourrait jamais
> rougir, quelle que soit la couleur ajoutée. Le risque réel est le bouton NOYÉ dans
> la page (un bleu sombre sur fond noir : 1,43:1, mesuré). `lib/__tests__/accentColor.test.ts`
> lit les fonds directement dans `theme.ts` et vérifie les 6 × 2 combinaisons.
>
> ⚠️ **Chaque accent porte DEUX valeurs, une par thème** : une couleur assez sombre
> pour se lire sur blanc devient un trou noir sur fond noir. Et l'orange clair a été
> choisi **par balayage** (`#CC6600`) — assombri jusqu'au seuil il virait au marron,
> la tentation était de baisser le seuil, la bonne réponse était de mesurer les
> valeurs intermédiaires.
>
> ⚠️ **La palette calculée est MISE EN CACHE** (`paletteFor`, 12 entrées max). Chaque
> écran fait `useMemo(() => makeStyles(t), [t])` : renvoyer un objet neuf à chaque
> rendu invaliderait ce memo partout et reconstruirait toutes les feuilles de style à
> chaque frappe.

### La barre de macros suit l'accent, en TROIS NUANCES (2026-08-06)

Décision fondateur. Le principe de la refonte ne change pas d'un iota — **trois
nuances d'UNE couleur, jamais trois teintes** ; ce qui change, c'est que cette
couleur n'est plus forcément le gris. `lib/accentColor.ts::macroShades` dérive
`protein` / `carbs` / `fat` de l'accent choisi, et `paletteFor` les substitue.

**En monochrome — le défaut, donc la DA que voit la majorité — les gris système
restent EN DUR.** Les dériver du blanc ou de l'encre donnerait des gris différents
en clair et en sombre, et ferait bouger la DA par défaut pour un changement qui ne
concerne que ceux qui choisissent une couleur.

🔴 **Une nuance ne se choisit pas « un peu plus claire », elle se MESURE contre le
fond.** C'est le défaut déjà payé une fois : le 3ᵉ gris de la maquette (`#DDDDDF`)
tombait à **1,21:1** contre le fond de page, le segment lipides était invisible et
la barre semblait s'arrêter aux deux tiers. `macroShades` recule donc vers l'accent
tant que la nuance ne tient pas **1,5:1** (`MACRO_SHADE_MIN_CONTRAST`).

⚠️ **Mesuré sur les 6 accents × 2 thèmes : le plancher ne mord JAMAIS.** Le cas le
plus serré est **orange en clair, à 1,53:1** — 0,03 de marge. Le mécanisme de recul
n'est donc traversé par **aucun accent livré**, et un garde-fou que le chemin réel
ne traverse jamais ne garde rien : `accentColor.test.ts` le traverse volontairement
avec une couleur hostile, et fige la marge du pire cas pour que sa dégradation se
remarque. Vérifié par mutation.

### Aucun émoji dans l'interface — règle posée, passe INCOMPLÈTE (2026-08-06)

La règle est tranchée : **pas d'émoji dans l'interface**. L'état du code, lui, ne
la respecte pas encore — et ce paragraphe a annoncé le contraire.

**Ce que la passe a fait**, sur `app/` et `components/` (les 55 émojis comptés là) :

- **39 tenaient la place d'une ICÔNE** — avertissement, cadenas, chrono, type de
  repas. Ils sont devenus **17 tracés** (`components/Icons.tsx`), dessinés par
  Claude Design dans le gabarit des cinq icônes d'onglets, qui restent la référence
  de la famille : viewBox 27, trait 1,7 (2,2 actif), bouts arrondis, `fill=none`,
  **couleur passée de l'extérieur**. C'est précisément ce qu'un émoji ne sait pas
  faire : il porte sa propre couleur, donc il ne peut ni suivre le thème ni prendre
  l'accent choisi.
- **16 n'étaient qu'un TON DE VOIX** (« Journée réadaptée 👊 », « + 450 kcal
  assumées 😎 »). Ceux-là ont été **SUPPRIMÉS, pas remplacés** : aucun pictogramme
  ne remplace une ponctuation, et la phrase doit tenir sans elle.

🔴 **Ce qu'elle n'a PAS fait — re-mesuré le 2026-08-07 : 13 émojis sont encore
AFFICHÉS**, dans trois modules que la passe n'a jamais ouverts.

| Où | Combien | Ce qui l'affiche |
|---|---|---|
| `lib/streak.ts` (paliers) | 6 — 🔥 🎉 💪 🏆 ⭐ 👑 | `StreakCelebration.tsx` en **fontSize 56**, monté sur l'écran Plan |
| `lib/streak.ts` (`streakMessage`) | 2 — 🎯 🎉 | `StreakProgress.tsx` |
| `lib/notifications.ts` | 4 — 💪 🍽️ 🔥 ⚖️ | les notifications natives |
| `constants/legal.ts` | 1 — ⚠️ | l'écran `/legal` (CGU) |

⚠️ **Le compte de 55 n'était pas faux, il portait sur le mauvais périmètre.** Ces
chaînes vivent dans `lib/` et `constants/` — des fichiers qui n'ont pas l'air
d'interface — et remontent à l'écran via un composant qui, lui, n'en contient
aucune. ➡️ **Un inventaire d'interface se compte sur ce qui est AFFICHÉ, pas sur
les fichiers qui ressemblent à de l'interface.**

⚠️ **Et « plus un seul émoji » a été écrit à trois endroits — le commit, `Icons.tsx`
et ici — sans qu'aucun compteur ne l'exige.** Une passe qui n'a pas de test se
déclare terminée toute seule, et les trois copies se confirment l'une l'autre.

⚠️ **Un émoji vivant dans une CHAÎNE ne peut pas devenir une icône** — un toast est
une string, pas du JSX. Ceux-là se retirent et la phrase se reformule (« Noté 👎 »
→ « C'est noté »). Les autres deviennent une rangée icône + texte, plus verbeuse
qu'un caractère collé devant une phrase : c'est le prix de la couleur héritée.

➡️ **Règle : ne pas réintroduire d'émoji dans l'interface**, et **finir les 13
restants** — chantier ouvert, pas un oubli à corriger en passant : la célébration
de palier est un objet VISUEL de 56 px, la remplacer (icône `ReussiteIcon` ? rien
du tout ?) est une décision de DA, pas une substitution mécanique. Le compte se
refait en écartant les commentaires du code (les ⚠️ et 🔴 qui y vivent ne sont
affichés nulle part) **et sans se limiter à `app/` + `components/`** — c'est
exactement l'erreur ci-dessus.

### La FORME et la GRAISSE passent par un token, comme la couleur (2026-08-03)

La règle « aucune couleur en dur » existait depuis toujours ; elle ne disait rien du
**rayon** ni de la **graisse**. Ces deux-là ont donc dérivé librement, et la refonte
des 5 onglets n'y a rien changé — un composant qui n'a fait qu'hériter des tokens de
couleur garde sa forme d'avant.

**Mesuré le 2026-08-03, en UNE capture de l'écran Plan** : bandeau de série 22 · bouton
« hors plan » 14 · carte Hydratation **16** · bouton « + un verre » **999**. Quatre
objets qui se touchent, trois grammaires. Rien de tout ça ne se voit en relisant un
diff — **un rayon ne se lit pas, il se regarde.**

| Rôle | Token | Objets |
|---|---|---|
| puce, jauge, badge | `Radius.pill` | filtres, tags — **jamais** un bouton pleine largeur |
| sous-bloc, ligne de liste, vignette | `Radius.sm` (12) | suggestions, miniatures |
| bouton **et champ de saisie** | `Radius.button` (14) | tout ce qui se presse ou se remplit |
| bloc de contenu | `Radius.card` (22) | **le rayon dominant de la DA** |
| grande surface flottante | `Radius.xl` (24) | feuille modale, dialogue, célébration |

⚠️ **`md` (16) et `lg` (20) ont été SUPPRIMÉS du token, et c'est ça le correctif.**
Tant qu'ils existaient, rien n'empêchait d'écrire `Radius.md` sur une carte — et c'est
exactement ce qui est arrivé, huit fois. Les rendre inexistants fait échouer `tsc`.
*Un token sans rôle n'est pas neutre : c'est une porte ouverte que personne ne surveille.*

⚠️ **Le rayon seul ne suffit pas — la HAUTEUR fait la forme.** « + un verre » passé de
999 à 14 ressemblait encore à une lozange : à 34 pt de haut, 14 de rayon *est* presque
un demi-cercle. C'est la hauteur qui était fausse (34 → 44 pt, aussi le minimum d'une
cible tactile Apple, que `hitSlop` rattrapait au doigt sans jamais le rattraper à l'œil).

**Échelle typographique** — la hiérarchie se fait par la **TAILLE**, pas par la graisse :
tout titre pèse **700**. `Type.h1` valait 800, soit plus lourd que le `display` au-dessus
de lui : la hiérarchie s'inversait dès qu'on employait les deux. Personne ne s'en servait,
donc l'incohérence dormait **dans le fichier qui sert de référence à toute l'app**.
`hero` (40) chiffre héros · `display` (34) titre d'écran · `h1` (30) titre d'étape ·
`h2` (22) titre de feuille · `h3` (17) titre de bloc · `overline` (11) sur-titre.

➡️ **Garde-fou : `lib/__tests__/rayonsDA.test.ts`.** Un `borderRadius` en chiffre n'est
légitime que si l'objet a une **taille fixe** et que le rayon en est au plus la moitié
(disque, pastille, barre). Dès qu'un objet se dimensionne par son contenu, sa forme est
une décision de DA. **Vérifié par mutation** : remettre la carte Hydratation à 16, ou le
`PrimaryButton` à 999, fait rougir le test.
⚠️ Ce qu'il ne sait PAS faire : dire qu'on a choisi le bon token — `Radius.pill` sur une
carte passerait. Il ferme la porte au chiffre en dur, qui est le chemin par lequel la
dérive est réellement arrivée.

### Le grand titre se replie (2026-08-04)

Comportement des grands titres iOS, et ce que fait la maquette **sur ses cinq écrans à
l'identique** : un gros titre (34) dans le contenu qui s'en va vers le haut, un titre
compact (17) dans une barre collée en haut qui, elle, ne bouge jamais.

**Ce que ça corrige, et le défaut était pire que « ça manque »** : les cinq onglets ne
faisaient PAS la même chose. Plan et Profil avaient leur en-tête DANS la zone défilante —
le titre partait et rien ne le remplaçait. Recettes, Courses et Frigo l'avaient en dehors —
le titre de 34 restait planté en haut à perpétuité. **Deux comportements opposés pour le
même objet**, sur cinq écrans d'une même barre d'onglets.

Mécanique unique : `components/CollapsingTitle.tsx` (`useCollapsingTitle` + `CompactTitleBar`),
posée sur les cinq. Les écrans à liste (`FlatList`, `SectionList`) passent leur en-tête en
`ListHeaderComponent` — c'est la seule façon qu'il défile.

⚠️ **Passer un ÉLÉMENT à `ListHeaderComponent`, jamais une fonction composant.** Une
nouvelle fonction à chaque rendu remonte l'en-tête, et **le champ de recherche des Recettes
perdrait le focus à chaque frappe**. Vérifié : 6 caractères saisis d'affilée, focus conservé.

⚠️ **Pas de flou**, contrairement à la maquette (`blur(22px)`) : il faudrait `expo-blur`,
donc une dépendance NATIVE — nouveau build, nouvelle revue, et voie OTA fermée pour les
anciens binaires (§2). Pour une barre de 52 pt, le prix n'en vaut pas la peine. Le fond
opaque `t.bg` rend le même service. Le filet sous la barre est le seul trait gardé dans
cette DA et il porte du sens : sans lui, le contenu semble s'évaporer au lieu de passer
sous quelque chose.

⚠️ **Le seuil ne peut pas être négatif** (`lib/collapsingTitle.ts::seuilRepli`, plancher à
24) : sur un écran dont l'en-tête est plus COURT que la barre — le Frigo quand le stock est
vide — le calcul donnerait un seuil négatif, donc un titre compact affiché en permanence,
**posé par-dessus le grand titre**.

🔴 **Le MOUVEMENT est invérifiable dans le panneau navigateur** : `requestAnimationFrame`
n'y tourne pas (**0 frame en 7,2 s**, mesuré). Une animation y démarre, rend une frame,
puis se fige à une valeur intermédiaire **parfaitement plausible** — j'ai « corrigé » un
`useNativeDriver` qui n'avait rien de fautif avant de penser à mesurer l'instrument.
➡️ La décision vit donc dans une fonction PURE, testée (`lib/__tests__/repliTitre.test.ts`),
et l'écran ne sert qu'à juger le rendu (opacité forcée à 1). Procédure :
`docs/comparer-maquette.md`.

### Le design system est POUSSÉ vers Claude Design, et il se REGÉNÈRE (2026-08-06)

Projet « Kyroz — design system » sur le compte du fondateur : 6 pages — principes ·
couleurs · accents · rayons · typographie · espacements. Claude Design les consulte
au lieu de deviner.

**Motif mesuré, pas théorique** : sur la maquette du 3 août, 4 valeurs divergeaient
du thème et **une était un vrai bug** (le 3ᵉ gris à 1,21:1), plus un `blur(22px)`
irréalisable sans dépendance native. Un design system n'embellit pas les maquettes —
**il les empêche d'inventer des valeurs que personne ne vérifie.**

⚠️ **LE MIROIR EST GÉNÉRÉ, JAMAIS ÉCRIT À LA MAIN** — `npm run design:build`
(`scripts/design-system.mjs` lit `theme.ts` et `accentColor.ts`). Une copie écrite à
la main serait exactement « une copie stockée que personne ne relit » (§10) : le jour
où `theme.ts` change sans le miroir, Claude Design dessine contre une DA qui n'existe
plus et rend des maquettes parfaitement plausibles. **Après tout changement de token :
regénérer et repousser.**

⚠️ **L'extraction lit `theme.ts` COMME DU TEXTE** (il tire react-native, donc pas
importable sous node — même procédé que `accentColor.test.ts`). Elle s'est cassée
DEUX fois pendant son écriture, et **aucune des deux ne lève d'erreur** : les
sous-objets écrits sur une ligne ne rendaient qu'une clé sur trois ; et `ACCENTS`
porte une annotation de type contenant des accolades, donc l'extracteur capturait le
TYPE et rendait **zéro accent**. Garde-fou : `lib/__tests__/designSystem.test.ts`,
vérifié par mutation.

➡️ **La moitié d'une DA n'est pas une valeur, c'est une règle** : `principes.html`
porte les 8 qui ne se déduisent d'aucune palette. Une règle absente du miroir sera
enfreinte par la prochaine maquette.

### Largeurs — téléphone ET tablette (depuis le 2026-08-01)

L'app est livrée pour iPad (`ios.supportsTablet: true`). **Tout écran passe par
`useLayout()`** (`constants/layout.ts`, seuils dans `lib/layout.ts`) — de la même
manière que toute couleur passe par `useTheme()`. Sans lui, un écran repart en pleine
largeur, et à 1024 pt c'est illisible.

| | largeur max | usage |
|---|---|---|
| `layout.content` | 620 | corps d'écran (`contentContainerStyle`) |
| `layout.header` | 620 | en-têtes et pieds FIXES, hors ScrollView |
| `layout.sheet` | 820 | feuilles modales (déjà posé dans `Sheet` / `ActionSheet`) |
| `layout.grid` | 980 | grille de recettes (`layout.columns`) |

Seuil unique **`TABLET_MIN_WIDTH = 700`** : au-dessus du plus large iPhone (440 pt) et
au-dessus d'un Split View à 50 % sur iPad 11" (507 pt), qui doit rester en mise en page
téléphone.

- **Sur téléphone, c'est un no-op STRICT** : `centered()` renvoie un objet vide sous le
  seuil, et un test l'exige. Un style « inoffensif » suffirait à faire diverger
  l'existant.
- **Une seule mise en page dérogatoire** : l'écran recette met ingrédients et préparation
  côte à côte sur tablette. C'est le cas d'usage qui a motivé le support tablette
  (cuisiner avec la recette sous les yeux). Tout le reste est une colonne centrée — pas
  de split view, pas de navigation à deux panneaux : ça se décide, ça ne se déduit pas
  d'un breakpoint.
- **Règle de non-régression** : aucune colonne ne doit être plus étroite que la zone
  utile d'un iPhone (345 pt). Verrouillée par `lib/__tests__/layout.test.ts`.
- ⚠️ **LE PAYSAGE EST OUVERT SUR IPAD, quoi qu'en dise `app.json`.** `orientation: portrait`
  ne s'applique qu'à l'iPhone : dès `supportsTablet: true`, Expo écrit les **quatre**
  orientations dans `UISupportedInterfaceOrientations~ipad` du manifeste généré, parce que
  le multitâche iPadOS (`UIRequiresFullScreen: false`) l'exige. Vérifié sur le manifeste,
  pas sur la config — même piège qu'en §11 pour les permissions Android.
  **Conséquence : Apple teste l'app en paysage sur iPad, et tout écran doit y tenir.**
  Vérifié à 1366×1024 : la colonne reste centrée, la grille garde ses 2 colonnes, rien ne
  déborde. Ce n'est donc pas une décision à prendre — c'est un fait à respecter.

---

## 9. Nommage et conventions

| Type | Convention |
|---|---|
| Composants React Native | PascalCase (`MealCard.tsx`) |
| Fonctions utilitaires | camelCase (`calculateTDEE.ts`) |
| Constantes | SCREAMING_SNAKE (`MAX_KCAL_PER_DAY`) |
| Tables Supabase | snake_case (`weight_logs`) |
| Branches Git | `feature/nom-court`, `fix/nom-court` |
| Commits | `feat:`, `fix:`, `chore:`, `refactor:` |

---

## 10. Style de travail attendu

> Les règles ci-dessous étaient **orales** jusqu'au 2026-07-30. Elles ne survivaient que
> dans la mémoire d'une seule session — une autre session, ou un autre outil, les ignorait
> et refaisait les mêmes erreurs. Elles sont écrites ici pour cette raison.

### Fond

- **Décisions tranchées** : pas de « ça dépend » sans proposition concrète.
- **North Star en tête** : % d'utilisateurs avec 7 jours consécutifs d'usage dans les
  14 premiers. Si une implémentation ne le sert pas, le dire.
- **Le fondateur est solo et non-développeur.** Répondre en français, clair, avec des
  analogies ou des schémas quand ça aide. Ne pas noyer une décision sous du jargon.
- **Ne pas le rassurer — le rendre capable de comprendre vite.** Dit par lui le
  2026-07-30 : *« je n'ai pas besoin d'être rassuré, juste de comprendre facilement »*.
  Donc : pas de « ne t'inquiète pas », pas de « tu peux passer à autre chose », pas de
  préambule qui amortit une mauvaise nouvelle. Un problème s'annonce à la première ligne,
  avec son ampleur et ce qu'on fait. Le confort ne l'intéresse pas, la clarté oui.
  ⚠️ **À ne pas confondre avec la règle produit ci-dessous**, qui concerne l'utilisateur
  final dans l'app, pas la conversation avec le fondateur.
- **RÈGLE PRODUIT — tout suivi affiché à l'UTILISATEUR doit rassurer, jamais mettre la
  pression.** Objectif, progression, adhérence : une **zone**, pas une ligne au pixel
  près ; aucun signal alarmant ; le pire cas reste neutre. Le message de fond est « le
  moteur porte la charge », pas « tu es en retard ». C'est un choix produit — une app de
  nutrition anxiogène perd l'utilisateur, donc le North Star.
  ⚠️ **Sa conséquence technique, et elle a été violée deux fois** : un suivi se dessine
  sur ce que le moteur SERT, jamais sur ce que l'utilisateur a SAISI. Le couloir de
  progression était tracé en ligne droite vers la date saisie — donc il annonçait « en
  retard » à quelqu'un qui suivait le plan À LA LETTRE, mesuré dès **le 7ᵉ jour**, avec
  jusqu'à **10,4 kg** d'écart (11 cas sur 16 avant correctif, 3 après). Le principe était
  pourtant déjà écrit dans `trackStatus`, pour un autre cas : *« reprocher un retard qu'on
  a soi-même imposé »*. ➡️ Point d'entrée unique : **`tdee.ts::trackingTarget`** — tout
  écran qui affiche une progression passe par lui. Contrôle : `npm run mesure:objectif`.
  ➡️ Et quand on écrit un principe en corrigeant UN cas, chercher tout de suite ses voisins.
- **Mesurer sur le moteur, jamais sur une réplique de ses formules.** Cette erreur a
  produit **trois** conclusions fausses (partage glucides/lipides figé à 55/45 ; « le
  catalogue est trop maigre » ; « 21 à 30 recettes distinctes » alors qu'un utilisateur
  n'en voit que 11 à 13). Un script d'audit doit appeler `buildLocalPlan` / `adaptRecipe`,
  pas recopier leurs calculs. Corollaire : **ne jamais agréger ce qu'un utilisateur voit
  séparément**, et vérifier qu'un panel de contrôle n'est pas tout masculin.
- **Un tag posé à la main n'arbitre pas mieux qu'un moteur qui mesure.** Devant le choix,
  garder le mécanisme qui calcule, jeter l'étiquette.
- **Une copie STOCKÉE que personne ne lit est une seconde source de vérité qui attend
  son bug.** `UserProfile.clamp` a vécu quatre jours sans un seul lecteur : une version
  appauvrie et figée de `plan.clamp`, recalculable en 0,11 ms (A8, retiré). Devant le
  choix entre stocker et recalculer, recalculer — sauf coût mesuré.
  ⚠️ **Et retirer un champ ne suffit pas à l'effacer** : les profils déjà enregistrés en
  portent une copie. La ligne qui la NETTOIE doit survivre au champ, sinon la valeur
  périmée reste dans AsyncStorage pour toujours, prête à être relue comme si elle était
  fraîche. Mettre la clé à `undefined` ne suffit pas — `JSON.stringify` l'élide, donc la
  comparaison anti-réécriture de `useProfile` ne voit rien à persister.

### Exécution

- **« go », « fais », « merge » = exécuter sans revenir demander.** Le fondateur tranche,
  puis attend le résultat, pas une confirmation de plus.
- **Flux git** : branche → merge dans `main` → push. Ne jamais committer sur `main`
  directement, ne jamais forcer l'historique.
- **Ne committer QUE son propre travail.** Un fichier que je n'ai pas produit ne se
  versionne pas : je le signale au fondateur, il décide. (Un `git add <dossier>` aveugle
  a déjà emporté des fichiers qui n'étaient pas les miens.)
- **Plusieurs sessions en parallèle → worktree.** Deux sessions dans le même dépôt se
  marchent dessus ; s'isoler dans un worktree, et le nettoyer en fin de chantier.
- **Rappeler la migration Supabase** quand un changement en demande une : le schéma n'est
  pas auto-appliqué, et une migration non jouée tue la synchro **en silence** (§3).
  ⚠️ **Mais MESURER avant d'annoncer un blocage — `npm run check:migrations`.** Le dépôt
  ne sait rien de la prod : un fichier dans `supabase/migrations/` prouve que quelqu'un a
  écrit du SQL, pas qu'il a été exécuté. Deux entrées d'AGENTS.md sont restées à
  « MIGRATION À JOUER » pendant des jours alors que les colonnes étaient en base, et une
  session l'a répété au fondateur comme un blocage réel. La commande prend deux secondes.
- **Mettre à jour `AGENTS.md`** en fin de session, dans la liste unique. Ne jamais laisser
  le doc diverger du code, et ne jamais créer une deuxième liste de tâches.

---

## 11. Pièges connus (redécouverts au moins une fois chacun)

- **`Alert.alert` est une FONCTION VIDE sur react-native-web** — `class Alert { static
  alert() {} }`. Aucune erreur, aucune trace : l'appel ne fait RIEN. Découvert le
  2026-08-02, il tuait **dix** interactions, dont « Régénérer mon plan » et le REFUS
  d'un profil inéligible à l'onboarding (bouton final inerte, sans message : le
  garde-fou §6 devenait invisible). ➡️ Utiliser **`useDialog()`** (`components/Dialog.tsx`,
  `confirm` / `notify` / `choose`) — un seul chemin web ET natif. Interdiction
  verrouillée par `lib/__tests__/noAlert.test.ts`.
- 🔴 **Une `Modal` de react-native-web crée son conteneur DOM à son MONTAGE, pas quand
  elle devient visible** — et à `z-index` égal, c'est l'ORDRE DU DOM qui décide qui
  passe devant. Conséquence mesurée le 2026-08-05 : `DialogProvider` vivant à la racine,
  son conteneur naissait au démarrage de l'app, donc **avant** celui de toute feuille
  ouverte ensuite → **tout `confirm` / `notify` / `choose` appelé depuis une `Sheet`
  était invisible**. Le code s'exécutait, la promesse attendait, l'utilisateur ne voyait
  rien : la famille exacte du piège `Alert.alert` ci-dessous, dans le module écrit pour
  le remplacer. Deux chemins touchés, dont un livré depuis longtemps (« Supprimer cette
  pesée ? »).
  ➡️ **Règle : une surcouche globale qui doit passer AU-DESSUS se monte à la demande,
  pas au démarrage.** `Dialog.tsx` ne monte son `ActionSheet` que lorsqu'une demande
  existe (+ 260 ms pour l'animation de sortie). Garde-fou : `noAlert.test.ts`.
  ⚠️ Invisible sous vitest (pas de DOM) et à la relecture — seule une CAPTURE le montre.
  Et l'instrument ment ici aussi : `getBoundingClientRect` rend une hauteur 0 pour TOUS
  les conteneurs de modale, y compris celle qui est bien à l'écran.
  ℹ️ Mesuré sur le web ; sur natif, `Modal` est une modale de plateforme et l'ordre de
  présentation n'obéit pas au DOM.
- **`onEndEditing` est un no-op sur react-native-web.** Pour normaliser ou borner une
  saisie en fin de frappe, utiliser **`onBlur`**. Le bug « %MG saisi 23 → enregistré 33 »
  venait de là.
  ⚠️ **LE VRAI PIÈGE, redécouvert DEUX fois le 2026-08-02** : le clamp n'était que le
  déclencheur. Le mécanisme, c'est la **synchro `valeur du parent → texte local`**, qui
  réécrit ce que l'utilisateur est en train de taper dès que la valeur remonte modifiée
  — clampée (`BodyFatPicker`) ou remise à `undefined` parce que la saisie est encore
  invalide (`BirthDateField` : taper « 31/02 » vidait les trois champs).
  ➡️ **Règle** : un champ contrôlé par un état parent ne se resynchronise QUE sur un
  changement venu de l'EXTÉRIEUR. Deux gardes selon le cas : `focused` (on ne réécrit
  pas tant que le champ a le focus) ou `emitted` (on ignore ce qui nous revient de
  notre propre émission).
- **Le portail de dépistage santé et la visite guidée interceptent les clics.** Tout script
  qui pilote l'app doit les neutraliser d'abord, sinon il conclut que les écrans sont
  « introuvables » alors qu'il n'a jamais pu quitter le Plan (cf. `test/README.md`).
  ⚠️ **« Écran introuvable » est presque toujours un FAUX diagnostic** : l'écran existe,
  c'est le parcours qui ne l'atteint plus. Les scripts de `test/` ont pourri deux fois
  ainsi (juin-juillet 2026, puis le 2026-08-05 : attestation de dépistage déplacée, champ
  d'âge devenu date de naissance) et la panne a dormi des JOURS, parce qu'elle ne se voyait
  qu'en lançant un navigateur. Depuis : les libellés dont les scripts dépendent sont
  verrouillés contre les écrans par **`lib/__tests__/harnaisEcrans.test.ts`** (donc un
  renommage rougit dans `npm test` le jour même), et toute étape qui n'aboutit pas nomme la
  marche cassée avec une capture. ➡️ **Un harnais qui échoue doit dire OÙ il s'est arrêté ;
  un `false` muet est ce qui laisse la panne dormir.**
- **Supabase plafonne la création de comptes invités** (429 `over_request_rate_limit`, par
  heure et par IP). Enchaîner les passes de test fait échouer des parcours **sans que l'app
  ait quoi que ce soit à se reprocher**.
- 🔴 **UN RÉGLAGE LU PAR UN AUTRE ÉCRAN QUE CELUI QUI LE POSE NE SE RELIT PAS
  « AU FOCUS » — IL SE DIFFUSE.** Deux cas trouvés le même jour (2026-08-06), et les
  deux étaient **dormants** : (1) le suivi d'hydratation se relisait via
  `useFocusEffect`, et cette relecture n'atteignait jamais l'écran Plan — basculer
  sur « Masqué » laissait la carte en place **jusqu'au redémarrage** ; (2) le
  **prénom** ne s'écrivait qu'à la dernière étape de l'onboarding, aucun écran ne
  permettait de le poser ou de le corriger, et le Plan le lisait une fois au montage
  — un compte antérieur restait sur « Ton plan » **à perpétuité, sans recours**.
  ⚠️ **Le défaut dort tant que la valeur par défaut le masque** : l'hydratation
  valait « affiché », donc un réglage qui ne se propage pas ne se voyait pas — la
  carte était là pour la seule raison qu'elle l'était au montage. Inverser le défaut
  l'a révélé d'un coup.
  ➡️ Patron obligatoire pour toute valeur d'APPAREIL : store externe hors React +
  `useSyncExternalStore`, **chargé une fois dans le layout racine**. Kyroz le faisait
  déjà pour le thème et l'accent ; l'hydratation et le prénom l'ont rejoint. ⚠️ Une
  valeur oubliée dans ce chargement repart sur son défaut à chaque démarrage, et ça
  ne se voit nulle part.
  ⚠️ Se vérifie par le VRAI geste (basculer à l'écran, revenir sur l'autre écran),
  jamais en écrivant dans le stockage. Et prouver d'abord que la sonde sait dire
  OUI : `getByText('Hydratation', { exact: true })` ne trouve jamais `💧 Hydratation`
  — j'ai annoncé un faux diagnostic sur cette base (cf. §11 « mesurer l'instrument »).
- **Les sous-écrans du Profil sont des `Sheet`, pas des routes** : `goBack()` ne les ferme
  pas, il faut cliquer le fond.
- **Un `require` PARESSEUX ne retire RIEN du bundle.** Metro analyse les `require`
  statiquement : un SDK chargé « seulement si on en a besoin » est quand même embarqué.
  Mesuré deux fois — `lib/generatePlan.ts` servait le SDK Anthropic à chaque visiteur
  web (−224 Ko à sa suppression), et `react-native-purchases` a ajouté **+900 Ko** au
  bundle web alors qu'il n'y est jamais exécuté. ➡️ Pour qu'un module natif SORTE
  vraiment du bundle web, il faut une **séparation de plateforme** (`fichier.web.ts`,
  que Metro résout avant `fichier.ts`), pas une garde à l'exécution. Vérifier sur
  l'export, pas sur l'intention : `npx expo export -p web` puis `grep` dans le bundle.
- **Un SDK tiers configuré sans identifiant travaille sur l'APPAREIL, pas sur la
  personne.** RevenueCat l'a fait le 2026-08-02 : `configure({ apiKey })` sans
  `appUserID` crée un utilisateur anonyme lié au téléphone — la personne suivante sur
  un appareil partagé héritait de l'abonnement, et l'abonné payant restait verrouillé
  sur son second appareil. Les deux échouent en SILENCE.
  ➡️ **Un DROIT s'ancre au compte** (`identifyUser`, UUID Supabase — jamais l'e-mail,
  il part chez le tiers). Une MESURE, elle, reste volontairement anonyme : `lib/analytics.ts`
  envoie un UUID local à PostHog, et c'est le bon choix côté RGPD. Ne pas confondre
  les deux : ce qui ouvre une porte se rattache au compte, ce qui compte des visites non.
- 🔴 **LE SITE WEB EST PRÉ-RENDU DEPUIS LE 2026-08-04, et c'est un piège ARMÉ.**
  `app.json > expo.web.output: "static"` pré-rend chaque route en HTML au moment du
  build, pour que GitHub Pages réponde 200 sur un lien direct au lieu de 404 (E7).
  Ce rendu s'exécute dans **Node** : ni `window`, ni `localStorage`, ni `document`.
  ➡️ **Tout module qui touche le stockage ou le DOM AU CHARGEMENT fait échouer le
  déploiement**, pas seulement le sien — le workflow entier devient rouge, sur une
  `ReferenceError: window is not defined` dont la pile ne nomme aucun fichier à nous
  (elle pointe le bundle de rendu d'Expo). Le premier cas était le client Supabase,
  qui démarre sa session dès sa CONSTRUCTION.
  ➡️ Le contournement est un stockage/valeur muet pendant le pré-rendu seulement :
  `lib/prerender.ts::isPrerender(Platform.OS, typeof window !== 'undefined')`.
  ⚠️ **Le garde-fou doit exclure le natif PAR CONSTRUCTION, pas par `window`.** React
  Native définit `window` (alias de `global`), donc un test sur lui seul marche —
  aujourd'hui. Si ce détail de runtime changeait, iOS et Android basculeraient sur le
  chemin muet et **perdraient leur session à chaque démarrage, en silence**. D'où le
  `Platform.OS === 'web'` en tête du prédicat.
  ⚠️ **Et ce cas n'est visible NULLE PART** : ni dans un navigateur (où `window`
  existe), ni sous vitest. Aucun test d'intégration ne le verrait. C'est pourquoi le
  prédicat est une fonction PURE, dans un fichier sans aucun import — `lib/supabase.ts`
  tire `react-native-url-polyfill`, qui explose sous vitest. **Un garde-fou qu'on ne
  peut pas tester n'est pas un garde-fou.**
  ➡️ Vérifier un changement web sur l'ARTEFACT : `npm run build:web`, puis servir
  l'export derrière un serveur qui IMITE la résolution d'URL de Pages (`/foo` →
  `foo.html`). `python3 -m http.server` ne la fait pas et rend une mesure muette.
- ⚠️ **`npm run deploy` NE DÉPLOIE RIEN — et c'est volontaire.** Le site part par
  GitHub Actions à chaque push sur `main`. La commande a été gardée pour le DIRE
  (`scripts/deploy-info.mjs`) et **sort en code 1** : le piège d'origine était un
  script qui réussissait sans rien faire, et il a produit un diagnostic entièrement
  faux (AGENTS.md A12). L'export local s'appelle désormais **`npm run build:web`**.
- **Build natif iOS** : `npx expo run:ios` (CocoaPods via brew).
- **`Dimensions.get('window')` ment sur iPad.** La fenêtre change de taille **sans
  relancer l'app** (rotation, Split View, Slide Over) : une valeur lue au chargement du
  module reste fausse jusqu'au prochain démarrage. Utiliser `useWindowDimensions()`.
  Trois occurrences traînaient dans le code (`Sheet`, `GuidedTour`, `WeightCheckin`) ;
  `WeightCheckin` calculait la largeur de sa courbe sur l'ÉCRAN alors qu'elle vit dans
  une feuille bornée — la courbe débordait de son cadre.
- **Une marge s'ajoute à l'EXTÉRIEUR d'un `maxWidth`.** Poser la colonne centrée
  (`layout.header`) directement sur un élément aligné par `marginHorizontal` le fait
  dépasser de deux fois la marge — la barre de progression de l'écran Courses sortait
  des cartes de 40 pt. Dans ce cas, poser la colonne sur un CONTENEUR. Avec `padding`,
  pas de problème.
- **`FlatList` n'accepte pas un changement de `numColumns` à chaud.** Sur iPad, une
  rotation en change la valeur : il faut une `key` qui dépend du nombre de colonnes pour
  forcer le remontage, sinon React Native jette une erreur.

---

*Spec stable. Mettre à jour uniquement quand une décision de fond change.*
