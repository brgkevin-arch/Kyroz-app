# CLAUDE.md — Kyroz · Spec technique stable (Claude Code)

> Lu automatiquement à chaque session. Contexte = spec STABLE du projet.
> L'état d'avancement (ce qui est fait / reste) vit dans **AGENTS.md**, pas ici.
> Ne pas dupliquer l'avancement ici. Amender, ne pas supprimer de section.

---

## Rappel projet (1 ligne)

App mobile React Native (Expo Router, SDK 56) de plans repas macro-précis pour **hommes ET femmes de 18 à 50 ans** pratiquant du sport. *(Élargi le 2026-07-30 — la cible déclarée était « hommes 18–35 », ce qui ne correspondait plus au produit : les garde-fous féminins — plancher d'énergie disponible, escalade de zone basse — et la borne protéine 0,5 existent précisément pour servir les gabarits légers.)* **Phase 2 — core loop en place + déployé en web (GitHub Pages), itérations UX/qualité en cours.**

---

## 1. Modèle économique

**Freemium large.** Le core loop (génération de plan, plan, courses, recettes) est gratuit et fonctionne sans aucune clé API. La monétisation vient de features avancées, pas du blocage du cœur. **Valeur premium (Kyroz+) tranchée + construite (2026-07-27)** : *« piloter son objectif dans le temps »* — objectif daté (trajectoire calorique vers un poids à une date) et suivi de transformation (zone/photos). ⚠️ **Ils étaient TROIS jusqu'au 2026-08-18** : la banque de calories a été retirée de Kyroz+ (décision fondateur). Son moteur (`lib/calorieBank.ts`) est INTACT et branché, renommé « **Jours plus copieux** » — mais **ÉTEINT depuis le 2026-08-18** (décision fondateur), via `lib/featureFlags.ts::RYTHME_HEBDOMADAIRE_ACTIF = false`. L'écran ne le propose plus ET le moteur cesse de LIRE `calorie_bank` (`planEngine::bankOf`) : un compte qui portait déjà un réglage reçoit désormais la même semaine que s'il n'en avait jamais posé — sinon il resterait avec une valeur qu'aucun écran ne montre et que personne ne peut annuler. Le remettre derrière le paywall exige de repasser sur les CGU, qui énumèrent le contenu de Kyroz+. **Paiement = achat in-app Apple/Google via RevenueCat (pas Stripe seul, refusé par les stores). Le SDK est CÂBLÉ depuis le 2026-08-02 et DORMANT** : sans clé RevenueCat rien n'encaisse, et sans date dans `PAYWALL_LAUNCH` rien n'est verrouillé — les features restent gratuites pour tout le monde. Reste les comptes stores, un build natif et une revue (AGENTS.md B2). Détail : `MONETISATION.md` + AGENTS.md.

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

> **Et un seul rythme de PRISE de masse, depuis le 2026-08-10** (décision fondateur).
> `bulk` est legacy à son tour, retiré des deux écrans (onboarding **et** Profil) et
> refermé sur `lean_bulk` à la lecture. Il en reste **QUATRE** : Sèche · Recomposition ·
> Maintien · Prise de masse.
> **Le test appliqué**, et c'est celui à réappliquer : *ce choix change-t-il le plan
> autrement qu'en VITESSE ?* `bulk` ne différait de `lean_bulk` que par +200 kcal/j —
> donc par la vitesse, qui est le métier de l'objectif daté. Et sa seule autre
> différence allait à l'envers : les protéines BAISSAIENT (2,0 → 1,8 g/kg) précisément
> là où il en faut le plus pour que la prise soit du muscle. Cette case ne proposait pas
> un plan différent, elle proposait un plan **moins bon**.
> ⚠️ **`recomp` reste, et ce n'est pas une inconséquence** : c'est le seul objectif où
> la personne ne veut PAS que son poids bouge, donc le seul sans poids cible — donc le
> seul que le mécanisme « la date règle la vitesse » n'atteint pas. Le replier sous
> Maintien forcerait un choix de protéines (1,8 vs 2,2) qui sur-sert l'un ou sous-sert
> l'autre. La voie propre pour passer à trois cases serait de DÉDUIRE la recomposition
> des séances déclarées (elle n'existe pas sans musculation), pas de la supprimer.
> 🔴 Contrairement à la fusion des sèches, **des calories bougent** : un surplus n'est
> borné par aucun plancher, donc les −200 kcal/j sont servis en entier. D'où
> `ENGINE_REV` 6 → 7 et l'avertissement one-shot. Ne touche que les comptes en `bulk`
> **sans** objectif daté — avec une date, le delta vient de la trajectoire.
> ⚠️ **Les deux listes d'écrans doivent rester d'accord** (`onboarding.tsx::GOALS` et
> `profil.tsx::GOALS`) : un objectif proposé ici et pas là serait refermé par
> `normalizeGoal` au rechargement — un choix qui ne tient pas sous les doigts.

---

## 2. Stack technique

| Couche | Choix | État |
|---|---|---|
| Mobile | **React Native (Expo Router, SDK 56)**, TypeScript strict | En place |
| Génération repas | **Moteur LOCAL** (`lib/planEngine.ts`) — macro-précis, 0 clé API, **seul chemin** | Moteur unique |
| Persistance locale | AsyncStorage (clés `@kyroz:*`) | En place |
| Backend / Auth | **Supabase** (région EU) — création de compte email + suppression de compte (RGPD) | Auth OK |
| Base nutritionnelle | **Ciqual (ANSES) + table maison** — voir la note ci-dessous | En place |
| Analytics | PostHog (cloud EU) | **Actif depuis le 2026-08-18** — `lib/analytics.ts`, consent-gated RGPD ; clé posée (secret GitHub + variable EAS), rien ne part sans consentement |
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
> 🔴 **ET `strings` NE REND QUE LES CHAÎNES ASCII PURES** — mesuré le 2026-08-06, en
> cherchant à vérifier un texte d'interface avant publication. Toute chaîne contenant
> un seul caractère non-ASCII est **invisible** : « J'ai cuisiné » (é), « Jour de
> repos · … » (·), « Ton plan nutrition, sans réfléchir » (é) rendent **0**, alors
> qu'elles sont bel et bien dans le bundle. Ce qui sort : les identifiants
> (`body_fat_source`, `baseDayTargets`, `rest_weekdays`) et les littéraux sans accent
> (« Ton plan » → 3, « kcal en moyenne » → 1, « Continuer » → 1).
> ➡️ Dans une app FRANÇAISE, cela exclut la quasi-totalité de l'interface. Le témoin
> de chantier doit donc être **ASCII pur** — un identifiant, de préférence. Un zéro
> sur une phrase accentuée ne veut RIEN dire, et se lit comme un défaut : c'est
> exactement le piège de « mesurer l'instrument » (§11), rejoué sur cet outil-ci.
> ⚠️ Corollaire : cette vérification prouve que les CLÉS sont inlinées et qu'aucune
> clé d'IA n'a fuité — c'est son objet. Elle ne prouve pas qu'un écran contient le
> bon texte. Pour ça, la garantie est ailleurs : le bundle est exporté depuis l'arbre
> de travail, donc il suffit qu'il soit à `origin/main` et que la suite soit verte.

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
| **L'historique des courses** | AsyncStorage `@kyroz:shoppingHistory`, l'appareil uniquement | ce qui est éphémère par nature (la liste est un CALCUL, son cache est effacé à chaque changement de plan) a besoin d'une trace, pas d'une table. Décision du 2026-08-07, même raisonnement que le journal hors plan : commencer local ne ferme aucune porte, le miroir se pose par-dessus la clé le jour où le besoin est mesuré. Borné à 30 sorties / 180 jours |
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
- [x] Clôture des courses (« Courses terminées ») + historique des listes — LOCAL-ONLY
- [x] Frigo / garde-manger — ⚠️ **il n'alimente la liste de courses que si l'option
      « Tenir compte du frigo » est activée, ÉTEINTE par défaut depuis le 2026-08-21**
      (`lib/fridgeTracking.ts`, E58). Son autre métier — « qu'est-ce que je peux cuisiner
      maintenant » — est inchangé.
- [x] Favoris recettes
- [x] Streak tracker (7 jours consécutifs)
- [x] Sync cloud Supabase
- [x] Recaler ma journée (re-plan instantané)
- [x] ~~Banque de calories~~ — moteur intact (`lib/calorieBank.ts`) mais **ÉTEINTE depuis
      le 2026-08-18** (`featureFlags.ts`), et sortie de Kyroz+ : cf. §1. La case reste
      cochée parce que le travail EST livré ; elle n'est plus atteignable.
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
> sobres qui servent directement le North Star (`METRICS.md` §1) et qui
> **rassurent au lieu de mettre la pression** — la série elle-même, et son gel
> d'un jour manqué (`advanceStreak`), en font partie et sont **déjà livrés**.
> ⚠️ **La série N'EST PAS la north star** (séparées le 2026-08-20, décision
> fondateur) : elle compte les jours où le plan est OUVERT, la north star compte
> les jours où un repas a été CUISINÉ. Les deux servent la rétention, l'une à
> l'écran sans pression, l'autre dans PostHog pour décider. Détail : `METRICS.md` §2.
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
  ⚠️ **La question n'est posée qu'au-delà du PLAFOND du sélecteur** — 35 % (H) / 43 % (F),
  décision du fondateur du 2026-08-07, prise après mesure. Sous ce seuil elle n'apparaît
  jamais, donc `body_fat_source` reste `undefined` et **tout le monde calcule en Mifflin**,
  y compris qui sort d'un DEXA : mesuré, un H de 75 kg à 12 % perd **94 kcal/j**, un H de
  82 kg à 15 % **99**, une F de 58 kg à 20 % **81**. L'arbitrage assume de réserver Katch
  aux fortes adiposités, là où l'écart est le plus gros (**+227 kcal/j** sur un H de 110 kg
  à 38 %) et où la silhouette ment le plus. ➡️ **Ce n'est pas un oubli : ne pas le
  « corriger » sans le fondateur.** Règle pure et testée : `safety.ts::provenanceDemandee`.
  ⚠️ Corollaire non négociable : une réponse « mesuré » **ne survit pas** à un %MG
  redescendu sous le seuil (`safety.ts::provenanceRetenue`). Sinon Katch continuerait de
  s'appliquer via un réglage que la personne ne peut plus ni voir ni changer — un réglage
  inatteignable ne décide pas d'une formule. `'estimated'`, lui, survit : il calcule comme
  `undefined`, donc il ne déplace aucune cible, et c'est une information vraie.
  🟡 **Ce nettoyage est CÔTÉ ÉCRAN, pas côté moteur** — il ne s'applique qu'au moment où
  quelqu'un touche le champ. Un profil déjà enregistré avec `'measured'` sous le seuil
  garde donc Katch jusqu'à sa prochaine visite sur l'écran : c'est le choix conservateur
  (aucune cible ne bouge en silence, pas de bump d'`ENGINE_REV`), mais **la règle n'est
  pas uniformément appliquée sur le parc**. La rendre uniforme demanderait `ENGINE_REV` 7
  et un avertissement one-shot. Écrit ici pour que la prochaine session n'en déduise pas
  que le seuil est vrai partout.
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
  Le défaut est **`desk` = 1,30**, et ce n'est pas un réglage cosmétique : **un cran vaut
  79 kcal/j de dépense** (médiane sur 108 crans, re-mesurée le 2026-08-19), `desk` →
  `physical` 238.
  ⚠️ **LA QUESTION EST POSÉE À L'INSCRIPTION DEPUIS LE 2026-08-19** (étape 4,
  `components/NeatPicker.tsx`, réponse **exigée**, rien de pré-coché) — jusque-là elle
  ne vivait que dans le Profil, et ce défaut était donc la valeur servie à la plupart
  des gens. Il ne couvre plus que les comptes créés AVANT cette date : ils ne sont
  **pas backfillés**, « jamais demandé » devant rester distinguable d'une réponse.
  Le même composant sert les deux écrans — les libellés sont un garde-fou
  anti-inflation (ancrés sur le métier et la posture, jamais sur le sport), et un
  garde-fou qui ne couvre qu'un écran sur deux ne couvre rien.
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
  le plafond de 1,45 : se tromper d'un cran coûte donc deux fois moins cher qu'avant.
  ⚠️ **« ~90 kcal/j le cran » était une estimation, RE-MESURÉE le 2026-08-10** sur
  800 gabarits (2 sexes × 4 âges × 5 poids × 4 tailles × 5 objectifs, 2 400 écarts) :
  un cran vaut **57 à 102 kcal/j de dépense, médiane 80**, et `desk → physical`
  vaut **272 kcal/j** sur un H de 83 kg. Sur la cible SERVIE, la médiane tombe à
  **79** : le plancher de sécurité amortit **274 crans sur 2 400** de plus de 5 kcal,
  et en **efface 140 entièrement** — pour ceux-là, changer de niveau NEAT ne déplace
  pas une seule calorie dans l'assiette. ➡️ Le chiffre à citer est **80**, pas 90, et
  jamais sans dire qu'il s'agit de la DÉPENSE : la cible, elle, peut ne pas bouger.
- **Sport** : méthode MET **NETTE** — `(MET − 1) × 3,5 × poids / 200 × minutes`. Le
  `− 1` retire le métabolisme de repos déjà compté par `BMR × NEAT` pendant l'heure
  de séance. C'est aussi la définition de l'EEE utilisée par le calcul d'énergie
  disponible RED-S.

Il n'y a plus de multiplicateur par nombre de séances : `training_days_per_week` ne
pilote plus le TDEE (il reste utilisé pour les jours de repos et la génération du
plan). Le double chemin produisait une discontinuité — déclarer une séance de
15 minutes de marche faisait bondir le TDEE de +181 kcal/jour en médiane.

### Répartition du budget entre les JOURS — le volume concentré (`lib/dailyBudget.ts`)

**Le plan n'est plus isocalorique depuis le 2026-08-06** (`ENGINE_VERSION` 45 → 46).
La cible d'un jour vaut `dépense de CE jour + le même écart qu'avant` ; la **semaine
garde son total au kcal près**, donc le déficit, la trajectoire datée et
`profile.target_kcal` sont **inchangés**. Ce module déplace des calories, il n'en
crée ni n'en retire.

**Le défaut corrigé** : deux lissages se superposaient — `exerciseKcalPerDay` étalait
la dépense sur 7 jours, et tous les jours recevaient la même cible. Trois sorties de
45 min et une sortie de 3 h étaient donc indiscernables. Mesuré (F 60 kg, 25 %MG,
sèche, relevé du 2026-08-07) : l'énergie disponible **annoncée** vaut 31,5 quel que
soit le volume — le plancher l'y ramène toujours — quand celle du jour **vécu** tombe
à 18,3 (2×90), 10,3 (1×120) et **−0,2** (1×180). L'app conseillait 1654 kcal le jour
d'un trois heures. Après : l'EA vécue **égale** l'EA annoncée, tous les jours.
⚠️ Ces cinq nombres ont **changé sans que ce module bouge** : la première rédaction
disait 32,1 / 18,9 / 11,0 / 0,4 / 1683, mesurée avant qu'E16 ne rende Katch-McArdle
conditionnel à la provenance du %MG — ces gabarits déclarent un %MG estimé, donc leur
BMR a changé de formule, donc leur dépense et leur cible. Le fait démontré est le même
(l'EA vécue rejoint l'EA annoncée) ; les chiffres qui l'illustrent se re-lisent dans
`npm run mesure:volume`, jamais ici.

⚠️ **Ce n'est PAS une urgence RED-S** (l'énergie disponible est hebdomadaire,
décision du 2026-07-29) : c'est de la **qualité de plan**. Ne pas le remonter comme
un danger.

⚠️ **Le plancher du jour est `max(BMR, filet absolu)`, PAS celui d'énergie
disponible.** C'est ce point qui avait fait rejeter la spec P2.1 (« le ratio des
planchers seuls vaut déjà 2,30 »), en appliquant jour par jour un seuil qui ne l'est
pas. Le raisonnement était déjà écrit pour la banque de calories
(`tdee.ts::bankFloorKcal`) : **un mécanisme qui conserve le total de la semaine
laisse l'exposition hebdomadaire inchangée.** Le plafond arbitraire rejeté avec P2.1
(`MAX_DAY_RATIO = 1,35`) ne revient pas — le rapport entre les jours n'est pas un
réglage, c'est celui des dépenses réelles.

⚠️ **Le moteur sait COMBIEN de jours portent un entraînement, pas LEQUEL porte la
sortie longue** : les séances sont déclarées à la semaine. La dépense hebdomadaire
est donc répartie à parts égales sur les jours d'entraînement — exact à une séance
par semaine, approché au-delà. C'est le maximum que la saisie autorise ; ne pas
prétendre mieux à l'écran.

⚠️ **Sans sport déclaré, aucune répartition n'est inventée** (repli sur la cible
plate). `training_days_per_week` est une déclaration, pas une mesure.

⚠️ **« Pas répondu » et « aucun jour de repos » sont DEUX choses, et les confondre
rendait tout ceci inerte** (corrigé le 2026-08-06). L'onboarding démarrait à zéro jour
coché et enregistrait ce vide comme `rest_weekdays = []` — donc « je m'entraîne 7 j/7 »,
donc dépense relissée, donc **plan plat** pour tout nouvel inscrit. Le Profil, lui,
pré-cochait déjà la déduction : deux écrans, deux sens. Depuis :
`deducedRestWeekdays` est la **source unique** des deux écrans, la déduction est
**pré-cochée** (l'hypothèse s'affiche donc, et devient corrigeable), et une puce
**« Aucun »** rend le « je n'en ai pas » explicite — car c'est une réponse légitime
qu'on n'a pas le droit de forcer. Les trois états vivaient déjà dans la donnée
(`undefined` / `[]` / liste) ; seule l'UI les écrasait.
➡️ **Ce réglage a changé de nature** : il ne déplaçait que des glucides, il déplace
maintenant jusqu'à **330 kcal**. Un réglage devenu porteur doit être re-regardé côté
saisie, pas seulement côté moteur.

**Deux constantes ont dû être re-mesurées, parce que leur PRÉMISSE avait changé** —
toutes deux avaient été calibrées quand les jours étaient identiques :
- `REST_DAY_CARB_TO_FAT_SHIFT` **0,12 → 0,08**. Critère : « les glucides absorbent la
  variation, les lipides gardent leur plancher », donc les lipides du jour de repos
  doivent rester constants EN GRAMMES. À 0,12 ils MONTAIENT (+2/+6 g) sur un jour à
  −330 kcal ; à 0 la baisse sortait pour moitié des lipides (−14/−10 g).
- `FAMILY_SELECT_W_CANON` **0,03 → 0,04**. Le 0,03 protégeait un « zéro repas hors
  cible » sur le plan canonique — ce zéro n'est plus atteignable à AUCUN poids, pour
  une raison de catalogue (voir plus bas). Il ne protégeait donc plus rien.

🔴 **Un garde-fou de §6 avait DISPARU en silence, et c'est le vrai enseignement.**
`fatTargetG` relève les lipides au seuil de carence une fois, sur la cible PLATE ; le
plan, lui, dérive les grammes d'un RATIO. Tant que tous les jours se valaient, les
deux coïncidaient. Dès qu'un jour est descendu, **4,2 % des jours de repos sont
passés sous 0,8 g/kg** (0 % avant), pire cas 64 g pour un plancher à 70.
➡️ `dayRatioWithFatFloor` applique le plancher à la cible DU JOUR, sur **les deux**
chemins (génération ET recalage) — 0,3 % après. Et il est **borné à `target_fat_g`** :
un plancher empêche de descendre, il ne relève jamais la cible.

**Ce que ça coûte, mesuré et assumé.** Relevé du 2026-08-07, les DEUX colonnes prises
sur le **même arbre** — « avant » obtenu en forçant `baseDayTargets` à rendre la cible
plate, puis restauré (240 semaines ; le canonique sur 60) :

| | plat (avant) | par volume (servi) |
|---|---|---|
| semaines avec quasi-doublon | 4,6 % | **8,8 %** |
| dont plan **canonique** | 11,7 % | **16,7 %** |
| écart calorique moyen du jour | 0,32 % | **0,35 %** |
| recettes distinctes sur 4 sem. (min) | 39 | **48** ✓ |
| **drapeaux bloquants sur les repas servis** | 0 | **25** (dont 6 au canonique) |

Les 25 drapeaux sont **tous** sur deux gabarits (F 55 et F 65 en sèche), **tous** en
vegan ou vegan+sans gluten, et **tous les JOURS DE REPOS** — 1 328 / 1 498 kcal, où le
catalogue n'a ni dîner ni collation assez petits (19 `over_target_kcal`, 6
`protein_below_target`). Aucun en omnivore, végétarien ou sans gluten seul. C'est la
limite de vivier déjà consignée, pas un défaut de sélection : jusqu'ici aucun jour ne
descendait assez bas pour la toucher.
⚠️ **La première rédaction annonçait « 9,0 → 9,6 % »** — pair mesuré sur la branche
avant qu'elle ne fusionne `main`, donc juste ce jour-là et faux dès le lendemain. Le
coût réel est un **doublement** (4,6 → 8,8 %), pas +0,6 point. ➡️ **Un avant/après ne
vaut que si les deux moitiés sortent du même arbre** ; sinon on compare deux mondes et
on publie l'écart comme s'il n'y en avait qu'un.
➡️ **Prochaine vague de catalogue : des petits formats vegan / vegan+SG** (dîners et
collations pour petits gabarits en sèche). C'est le seul levier qui reste.

🔴 **CE QUE L'ÉCRAN EN DIT DOIT ÊTRE CONDITIONNÉ, ET ÇA NE L'ÉTAIT PAS** (corrigé le
2026-08-08). L'écran Plan affichait « Jour de repos · un peu moins de calories et de
glucides, tes protéines inchangées » dès que le jour affiché était un jour de repos —
**jamais selon qu'un écart existe**. Or ce module ne module rien sans sport déclaré (voir
ci-dessus, « aucune répartition n'est inventée »). Mesuré sur le moteur, H 30 ans, 83 kg,
18 % MG, sèche, NEAT desk : **sans sport, 2042 kcal les sept jours, amplitude 0** ; avec
3 séances de 60 min, 2042/2303 alternés, **amplitude 261**. Le nombre affiché deux lignes
plus bas démentait donc la phrase, sur l'écran le plus regardé de l'app.
➡️ La phrase passe désormais par le même prédicat que la bulle de visite guidée qui parle
de la même chose (§8, `moduleParVolume` : amplitude ≥ 40 kcal, seuil et calcul partagés
avec `FirstPlanReveal`). ⚠️ **Un jour de repos reste un jour de repos** — la lune de la
rangée de jours ne bouge pas : c'est une déclaration de l'utilisateur, elle est vraie. Ce
qui était faux, c'est la promesse CALORIQUE accrochée derrière.
➡️ Et c'est la **capture des deux textes côte à côte** qui l'a montré, pas la relecture :
la bulle se conditionnait déjà, l'écran non.

➡️ Contrôle : `npm run mesure:volume`. Garde-fou : `lib/__tests__/volumeConcentre.test.ts`.

### Les repas de la journée sont LIBRES (`lib/mealSlots.ts`, 2026-08-07)

Un créneau de repas est une **donnée** (`MealSlot` : id, libellé, heure, vivier), plus une
valeur de type. L'utilisateur en crée autant qu'il veut — « Shaker post-training », 18h30,
vivier collation — à l'onboarding **et** dans Profil → Paramètres des repas, par le même
composant (`components/MealSlotsPicker.tsx`).

**Ce que ça corrige** : `MealType` était une union FERMÉE de quatre valeurs. Le plafond
n'était écrit dans aucune spec — **il était dans le TYPE**. Quelqu'un qui mange six fois
par jour ne pouvait pas le déclarer, et le moteur répartissait son budget sur quatre
assiettes qu'il ne mangeait pas : un plan faux, sans le moindre message.

⚠️ **Les 4 créneaux intégrés gardent leurs ids** (`breakfast`, `lunch`, `dinner`,
`snack`), et c'est ce qui rend le changement non destructeur : `profiles.meals` (text[],
aucune contrainte d'énumération), les plans en cache, les repas « je gère » et les tags
de recettes désignent tous les mêmes créneaux. Ils restent **en dur côté app** — les
stocker par utilisateur figerait une copie qu'une correction future n'atteindrait plus
(CLAUDE.md §10, « la copie stockée que personne ne relit »). Seuls les créneaux **créés**
vivent en base (`profiles.meal_slots` jsonb — migration 2026-08-07).

🔴 **`MEAL_ORDER` est devenu CHRONOLOGIQUE** (la collation de 16 h passe avant le dîner ;
elle était servie en dernier). Obligatoire : un ordre qui n'est pas celui de la journée
rangeait une collation de 10 h après le dîner. Conséquence — le report de budget de repas
en repas ne se fait plus dans le même ordre, donc **`ENGINE_VERSION` 46 → 47 et le plan de
tout le monde se régénère une fois**. Aucune calorie ne bouge.

⚠️ **`MEAL_DEFAULT_PRIORITY` existe à côté, et il ne doit PAS suivre.** Il ne sert qu'à
répondre à « je veux N repas » sans savoir lesquels (`syncGuard::normalizeMeals`, une
donnée réelle : `meals: 4`, un nombre). Sur l'ordre chronologique, N = 3 aurait rendu
« petit-déj + déjeuner + collation » — donc **supprimé le dîner** de quelqu'un qui n'a
rien demandé.

⚠️ **Le plafond est de 8 repas/jour, et il vient du CATALOGUE, pas du type.** Mesuré
(`npm run mesure:creneaux`, 5 gabarits × 5 tirages × 7 jours) : écart calorique du jour
0,66 % à 4 repas · **0,92 % à 8** · 1,19 % à 9 · 4,94 % à 12 ; drapeaux vus par
l'utilisateur 4 → **81** → 174 → 712. 8 est le dernier palier sous 1 % et le dernier avant
que les drapeaux ne DOUBLENT. La dégradation est **graduelle et concentrée** : jusqu'à 8,
74 des 81 drapeaux tombent sur F 55 kg en sèche **vegan** — la limite de vivier « petits
formats vegan » déjà consignée plus haut. C'est à 9 que ça déborde sur les petits gabarits
omnivores (6 → 30). *La mesure a aussi trouvé un défaut hors périmètre : à **3** repas, un
H 95 en prise de masse est à 6,11 % d'écart — le catalogue n'a pas de plat à 1 060 kcal.
Antérieur aux créneaux libres, noté, pas corrigé.*

⚠️ Deux propriétés que le code garde et qu'il ne faut pas « simplifier » :
- **Un créneau supprimé reste servable** (`slotOrFallback`, poids de collation). Un plan
  en cache peut le contenir ; sans repli il recevrait un poids nul, donc une cible de
  0 kcal, donc une assiette vide — un correctif pire que la donnée périmée.
- **Le LIBELLÉ n'entre pas dans `profileSignature`**, l'heure et le vivier si. Renommer un
  créneau ne doit pas régénérer la semaine pour une faute de frappe corrigée.

➡️ Contrôle : `npm run mesure:creneaux`. Garde-fou : `lib/__tests__/mealSlots.test.ts`,
**vérifié par 6 mutations** — et la 6ᵉ a montré qu'un premier test ne prouvait rien :
neutraliser tout le filtre de vivier le laissait vert, parce que sur une cible de
collation le moteur choisit une collation même quand le catalogue entier lui est ouvert.
Il mesure désormais le VIVIER, pas la sortie.

### Répartition entre repas — plancher protéique (`lib/planEngine.ts`)

La cible d'un repas est une part du budget **restant** du jour : le report de repas en
repas est ce qui garde le total quotidien serré (0,05 % d'écart mesuré). Mais il a un
effet de bord — chaque repas qui dépasse sa part rogne celle des suivants, et le
**dernier servi de la journée** encaisse toute la dérive.

> ℹ️ Cette phrase disait « la collation, **dernière de `MEAL_ORDER`** ». C'était vrai
> quand la mesure a été faite, et ça ne l'est plus depuis que l'ordre est chronologique
> (2026-08-07) : le dernier servi est maintenant le **dîner**, ou le dernier créneau créé
> de la soirée. Le mécanisme, lui, est inchangé — et le plancher ne dépend d'aucun
> créneau en particulier, c'est justement ce qui fait qu'il tient encore.

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
**État courant : 8,8 %** (`--variete=max`, défaut ; re-mesuré le 2026-08-07). *(27,9 % à
la livraison de D18, quand la famille n'était QU'une clé de départage ; puis 20,8 % après
A21 et A25, qui l'ont fait entrer dans le score ; 10,0 % après B9 ; 7,9 % après D22 — et
remonté à 8,8 % avec la répartition par volume, qui écarte les cibles des jours.)*

⚠️ **Les trois derniers gains ne viennent PAS du moteur mais du CATALOGUE** (vagues B7, B8
puis B9, 2026-08-03) : 20,8 → 12,5 → 11,7 → **10,0 %** sans toucher une ligne de sélection.
Le détail par régime dit pourquoi — vegan **41,7 % → 8,3 %** (10,4 % aujourd'hui), vegan +
sans gluten **50 % → 35,4 % → 22,9 % → 16,7 %** (**20,8 %** aujourd'hui). Les deux valeurs
« aujourd'hui » sont du 2026-08-07 et REMONTENT : c'est la répartition par volume, seule
étape de cette trajectoire à coûter de la variété au lieu d'en rendre. Là où le vivier de
familles est mince, aucun réglage ne fait tourner ce qui
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
  🔴 **SAUF AU-DELÀ DE 30 % DE MG CHEZ L'HOMME / 40 % CHEZ LA FEMME** — les deux
  planchers dérivés de la masse maigre (BMR **et** énergie disponible) se retirent
  alors, et le cap à 25 % du TDEE prend le relais (`safety.ts::highAdiposity`,
  `HIGH_ADIPOSITY_PCT`). Décision fondateur du 2026-08-10, `ENGINE_REV` 6 → 7.
  **Le défaut, mesuré** (`npm run mesure:plancher`) : le plancher d'énergie disponible
  gagnait sur les deux autres contraintes **15 fois sur 15**, de 15 à 45 % de MG, chez
  les deux sexes. Tout le monde était plafonné à **0,30–0,34 kg/semaine** — un homme de
  123 kg mettait ~2,5 ans à descendre à 85 kg. Le plafond de rythme gradué par
  l'adiposité et le cap à 25 % étaient **entièrement décoratifs** : ils ne mordaient
  jamais. Après : inchangé sous le seuil (0,29 → 0,32), **0,30 → 0,62 kg/sem** pour le
  H 123 kg, 0,35 → 0,44 pour une F 95 kg à 45 %.
  ⚠️ **L'hypothèse de départ était FAUSSE et la mesure l'a dit** : on cherchait une
  inversion (« plus on est gras, moins le moteur autorise »). Il n'y en a pas — le
  déficit permis monte même légèrement avec l'adiposité (318 → 375 kcal/j). Le défaut
  était **uniforme**, donc bien plus gros que celui qu'on croyait corriger.
  ⚠️ **Justification physiologique** : 30 kcal/kg de masse maigre est un seuil conçu
  pour des athlètes maigres, chez qui l'énergie DOIT venir de l'assiette faute de
  réserve. Chez quelqu'un qui porte 43 kg de graisse, la réserve EST la source d'énergie
  prévue — le plancher interdisait d'utiliser ce pour quoi elle existe.
  🔴 **CE QUE ÇA RETIRE, ET QU'IL FAUT ASSUMER** : au-dessus du seuil, l'escalade
  RED-S ne force plus la sortie de déficit au bout de 12 semaines (le budget de zone
  basse **ne se consomme plus** — `countsAsLowEaWeek`, sinon il reviendrait déjà épuisé
  le jour où la personne repasse sous le seuil, et la sortirait du déficit au moment où
  sa sèche redevient ordinaire).
  ✅ **La relève est livrée le même jour — voir « Pause à la maintenance » ci-dessous.**
  ⚠️ **Et s'entraîner ne rapportait RIEN** : la dépense sportive s'ajoutait des deux
  côtés (TDEE **et** plancher EA) et s'annulait exactement — 0 et 4 séances donnaient
  327 kcal/j de déficit au kcal près. Corrigé de fait au-dessus du seuil (0,62 → 0,69
  kg/sem) ; **sous le seuil, c'est toujours vrai**, et aucun écran ne le dit.
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
> `lib/goalLadder.ts`).
>
> 🔴 **CE QUI SUIT DÉCRIT UNE RANGÉE QUI N'EST PLUS AFFICHÉE** — retirée le 2026-08-07
> (décision fondateur, note « l'échéance est une DATE » plus bas). Le mécanisme, lui,
> tourne toujours : il produit la date **pré-remplie**. Tout ce qui est dit ici des
> invariants (tenable, distincte), du coût des sondes et de la mémoïsation reste donc
> VRAI et applicable ; seul « la personne choisit dans la rangée » ne l'est plus.
>
> La rangée offrait cinq durées en dur — 4 / 8 / 12 / 16 / 24
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

> 🔴 **L'ÉCHÉANCE EST UNE DATE, ET LA RANGÉE DE PUCES EST RETIRÉE** (2026-08-07,
> décision fondateur — `goalLadder.ts::checkEcheance`, `components/DateInput.tsx`).
> On ne demande plus « dans combien de semaines », on demande la date : c'est ce que la
> personne a en tête, et **un événement réel ne tombe jamais sur un multiple de
> semaines**. Trois champs jour/mois/année, qui sont aussi l'AFFICHAGE de la date visée.
> Aucune calorie ne change de règle, donc **pas d'`ENGINE_REV`** — `datedGoalStatus`
> reçoit un stamp et se moque de sa provenance.
>
> ⚠️ **L'échelle dérivée du corps (A27) N'EST PAS MORTE — elle n'est plus affichée.**
> `deadlineLadder` est toujours appelé, pour une seule chose : la date **pré-remplie**,
> prise sur sa 2ᵉ marche. C'est désormais la seule échéance que l'app propose, donc
> c'est elle qui doit tenir — et la 1ʳᵉ marche est écartée à dessein (c'est le rythme
> sûr MAXIMAL ; un défaut ne pousse pas d'office quelqu'un au plafond de la sécurité,
> §10). Vérifié à l'écran : un objectif neuf s'ouvre sur « Rythme sûr, dans les clous
> de ta date ». ➡️ Supprimer `goalLadder.ts` en croyant nettoyer du code mort ferait
> retomber le défaut d'origine — une date par défaut que la moitié des gabarits ne
> peuvent pas tenir.
>
> **L'ÉCRAN DONNE UNE ESTIMATION, ET C'EST ELLE QUI EXPOSE LE PLAFOND** (2026-08-07,
> décision fondateur : *« on devrait peut-être donner une estimation, et l'user ajuste en
> fonction de ce qu'il veut et des plafonds »*). Sous le poids cible :
> *« À 79 kg, la première date que Kyroz peut tenir en sécurité : le 6 nov. 2026 »*, plus
> un **« Viser cette date »** en un tap. Le plafond est dit en DATE plutôt qu'en règle —
> la personne ajuste en le connaissant, au lieu de le découvrir en se faisant refuser.
> Elle est attachée au POIDS, parce que c'est lui qui la détermine.
> ➡️ Elle remplace le raccourci d'A14 perdu avec la rangée, et **sur une base plus
> solide** : cette date est tenable PAR CONSTRUCTION (la sonde teste `reachableByDate`),
> là où adopter la date projetée avait été mesuré comme glissant de 98 jours.
>
> 🔴 **CE N'EST PAS `status.projectedDate`, et confondre les deux remettrait deux dates
> contradictoires à l'écran.** Mesuré le 2026-08-07 sur 8 corps : l'écart va de **12 à
> 100 jours**, toujours dans le même sens.
>
> | | où j'arrive en GARDANT une date trop proche | première date TENABLE |
> |---|---|---|
> | `F 78 → 65` | 1ᵉʳ août 2027 | **28 mai 2027** |
> | `H 95 → 82` | 27 juin 2027 | **19 mars 2027** |
>
> `projectedDate` simule qu'on garde l'échéance trop proche — donc qu'elle **expire**,
> après quoi le plan retombe au déficit ordinaire de l'objectif. C'est vrai, et
> inutilisable : ça dit que **viser trop tôt fait arriver plus tard**. La marche 1 de
> l'échelle répond à la question réellement posée (« quand puis-je y être ? »). Les trois
> surfaces de l'éditeur — ligne sous le champ, carte « objectif ambitieux », carte
> « plancher » — servent donc **le même** chiffre.
>
> ⚠️ **Un cas mesuré au passage : « ambitieux » et « dans les clous » pouvaient
> s'afficher ENSEMBLE.** La carte « au rythme le plus sûr tu atteins X kg …, après ta
> date » se déclenchait sur `clamped` sans vérifier `reachableByDate`. Balayage de 1 600
> échéances (8 corps × 200 semaines) : **1 cas** — `H 68 → 74`, **prise de masse**,
> 17 semaines. Rare, mais deux phrases opposées dans le même écran. La carte est
> désormais gardée par `!reachableByDate`. ➡️ Encore un prédicat écrit en pensant à la
> sèche qui se trompe en PRISE : le réflexe de §6 vaut aussi pour les messages.
>
> ⚠️ **Pas de sélecteur de date, et c'est un choix** : dépendance NATIVE (donc build +
> revue, §2) pour un service que trois nombres rendent partout. Même raison qu'à
> l'origine pour la date de naissance ; la mécanique des deux vit désormais dans
> `components/DateInput.tsx`, **son garde anti-réécriture compris** (§11, le champ qui
> se vide sous les doigts — trois occurrences, dont deux dans ce garde-là).
>
> 🔴 **Deux dates sont REFUSÉES, et chacune couvre un mensonge — pas une maladresse :**
>  1. **échéance passée ou du jour** → `datedGoalStatus` rend `active: false` : l'objectif
>     serait enregistré et **ne piloterait rien, en silence**. Ce cas n'est pas une faute
>     de frappe, c'est l'objectif qu'on ré-ouvre après sa date. Le contrôle s'applique
>     donc à la date **enregistrée** aussi, pas seulement à la saisie.
>  2. **au-delà de l'horizon de projection** (`MAX_PROJECTION_WEEKS`, 5 ans) → le moteur
>     fait alors **l'INVERSE** de ce qu'on lui demande. Mesuré le 2026-08-07 : `F 78 → 65`
>     sert **−55 kcal/j** à 5 ans et **−418 kcal/j** à 267 semaines ; `H 80 → 74`, −25 puis
>     **−298**. Ce n'est pas un bug : passé 260 semaines la simulation ne peut plus
>     atteindre la cible dans son horizon, `reachableByDate` tombe, et **A15 conclut « la
>     date ne tient pas » et sert le rythme sûr MAXIMAL**. La bascule tombe quelques
>     semaines APRÈS l'horizon et sa position dépend du corps (267 sem / 274 sem) : on
>     coupe à l'horizon, seul point défendable. ℹ️ Aucune régression existante — la rangée
>     de puces ne dépasse jamais l'horizon. **C'est une porte que la saisie libre ouvrait.**
>
> ⚠️ **Rien ne refuse une date très PROCHE, et c'est délibéré.** Sous une semaine,
> `datedGoalStatus` raisonne sur une semaine pleine (garde-fou de division) : mesuré,
> 1 / 3 / 7 jours servent le même plan et la même arrivée. La phrase sous le champ
> annonce l'arrivée réelle, donc la question reçoit une réponse vraie. Refuser serait
> interdire sur le ton du reproche (§10).
>
> ℹ️ **`closestHorizon` est parti avec la rangée.** Il allumait la puce la plus PROCHE de
> l'échéance enregistrée : une cible au 14 novembre affichait « 16 sem » en surbrillance
> au-dessus d'une ligne annonçant une autre date — **deux échéances à l'écran pour un
> seul objectif**. Le défaut est antérieur à ce chantier ; c'est la saisie libre qui l'a
> rendu regardable, et le retrait de la rangée qui l'a clos.
>
> ⚠️ **La ligne « Cible le … » est désormais le SEUL endroit qui dise si la date tient.**
> Elle porte donc toute la charge d'honnêteté de l'écran (A14/A15) : ne jamais la
> raccourcir, la déplacer sous le pli, ou la remplacer par un simple rappel de la date.

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
> **Les gros objectifs se découpent en PALIERS — et c'est une VUE** (2026-08-10,
> `lib/goalMilestones.ts`). Au-delà de 15 kg d'écart **ou** de 6 mois de trajectoire,
> la carte d'objectif met en avant l'étape suivante (~9 kg) au lieu de la cible
> lointaine : un objectif à douze mois ne renforce rien pendant douze mois.
>
> 🔴 **`goal_target` N'EST JAMAIS REMPLACÉ PAR LE PALIER, et c'est mesuré** — c'est la
> décision de tout le chantier. Faire du palier la vraie cible est le geste évident, et
> `npm run mesure:paliers` dit que c'est un piège, visible seulement sur les GROS écarts
> (donc précisément la population visée) :
>
> | corps | écart | objectif final | palier | delta |
> |---|---|---|---|---|
> | H 105 → 85 | 20 kg | 2006 kcal | 2006 | **0** |
> | H 123 → 85 | 38 kg | 2045 kcal | 2291 | **+246** |
> | F 120 → 80 | 40 kg | 1751 kcal | 1968 | **+217** |
>
> Sur 38 kg, le palier ferait tomber le rythme servi de **0,60 à 0,40 kg/semaine** : une
> date proche redevient « tenable » AU CALCUL EN LIGNE DROITE (`diff / weeksRemaining`),
> donc A15 cesse de servir le rythme sûr maximal et retombe sur le rythme « juste
> requis » — qui sous-estime, puisque l'arrivée est SIMULÉE. **Le défaut A15 réintroduit
> par la porte de derrière**, sur ceux qui ont le plus à perdre.
>
> ⚠️ **Les dates de palier sont lues sur la trajectoire simulée**, jamais interpolées :
> une ligne droite est exactement ce que §10 interdit (elle annonce « en retard » à qui
> suit le plan à la lettre). Les intervalles s'allongent donc naturellement — la dépense
> baisse avec le poids, et une pause tombe toutes les 9 semaines. Vérifié par mutation.
>
> ⚠️ **Le palier courant se LIT du poids actuel, il ne se stocke pas** : un palier
> franchi puis reperdu redevient le palier courant. Une copie stockée serait la « seconde
> source de vérité » de §10, désynchronisée au premier écart de balance.
>
> ⚠️ **La cible finale reste affichée** sous le palier. La masquer (comme le proposait le
> brief) reviendrait à décider à la place de la personne ce qu'elle a le droit de savoir
> sur son propre objectif.
>
> ➡️ Contrôle : `npm run mesure:paliers`. Garde-fou : `lib/__tests__/goalMilestones.test.ts`.

- **Sèche prolongée sans pause** — `lib/safety.ts::dietBreakDue`, registre
  `profiles.deficit_weeks` (**migration 2026-08-10_profiles_deficit_weeks.sql**).
  Après **8 semaines de déficit d'affilée, la 9ᵉ est servie à la MAINTENANCE.**
  ⚠️ **C'est la relève de l'escalade RED-S, pas un ajout de confort** : `ENGINE_REV` 7
  a retiré les planchers dérivés de la masse maigre au-dessus du seuil d'adiposité, et
  avec eux la seule chose qui forçait une sortie de déficit.
  ⚠️ **Et elle comble un trou bien plus ancien** : `effectiveEaPerKgFfm` n'escalade que
  pour `isFemaleAtRisk`. **Un HOMME n'a jamais eu, à aucune adiposité, aucun mécanisme
  le sortant d'une sèche** — il pouvait creuser trois ans. Le défaut ne se voyait pas
  parce que le plancher le plafonnait à 0,3 kg/semaine.
  🔴 **UNE SEULE PROTECTION PAR PERSONNE — `dietBreakApplies`.** Les empiler les fait se
  battre : pendant une pause le plan n'est plus restrictif, donc `since` retombe à null
  et l'escalade **n'arrive jamais à son terme**. Mesuré en livrant sans ce prédicat —
  trois tests rouges d'un coup, dont « la remontée annoncée vaut exactement la hausse
  réelle » : la carte qui promet « ta cible montera de X par semaine jusqu'à la semaine
  N » devenait fausse. La pause va donc là où l'escalade ne peut rien (tout homme, et
  quiconque au-dessus du seuil d'adiposité), jamais par-dessus elle.
  ➡️ **Question ouverte** : l'escalade est décrite en AGENTS.md comme une expérience
  déroutante (« ses calories augmentent toutes les semaines : l'app dérive »), au point
  d'avoir exigé une carte dédiée. La pause est probablement meilleure pour tout le
  monde. La substituer est une décision de sécurité à part, avec sa propre mesure.
  ⚠️ **Elle se réinitialise toute seule, sans second champ** : pendant la pause le plan
  n'est pas un déficit, donc la semaine n'entre pas au registre, donc la série repart de
  zéro. L'état est entièrement porté par le registre — il ne peut pas désynchroniser.
  🔴 **LA PAUSE A DURÉ DEUX SEMAINES PENDANT TOUTE LA PREMIÈRE VERSION**, et ça ne se
  voyait ni à la relecture ni dans la suite de tests. `settleLowEaExposure` solde le
  temps écoulé depuis `since`, **semaine courante comprise** — juste pour la zone basse
  (le plan restrictif était bien en vigueur avant le recalcul), faux ici : elle
  réinscrivait la semaine de pause AVANT que le plan de pause soit calculé, la série
  valait 9 la semaine suivante, et la pause repartait pour un tour. Seule une trace
  semaine par semaine l'a montré. ➡️ `forgetCurrentWeek`, appliqué au SEUL registre de
  déficit. *Encore un cas de « vérifier le résultat, pas la mécanique ».*
  ⚠️ **La projection SIMULE les pauses** (`WeeklyProjector.dietBreak`), sinon la date
  annoncée décrit une sèche sans pause quand le moteur en sert une toutes les 9 semaines
  — **~11 % d'écart**, le défaut A15/P1.6 rejoué, que §10 interdit nommément.
  ⚠️ **Une pause n'est pas un ARRÊT** : à la maintenance le rythme vaut ~0, et le test
  « à l'arrêt » du simulateur renvoyait `Infinity` — donc « aucune date » — pour une
  semaine PRÉVUE sur une sèche saine. Le simulateur avance à poids constant.
  ➡️ Garde-fou : `lib/__tests__/pauseMaintenance.test.ts`, **vérifié par 2 mutations**.
> 🔴 **DEUX LIGNES DE CE BLOC ONT ÉTÉ RETIRÉES LE 2026-08-11** — « Pathologies
> (diabète, IRC, cardio) » et « Femmes enceintes / allaitantes ». Décision fondateur
> sur avis juridique, détail en AGENTS.md **E39**. Elles sont conservées ici, barrées,
> parce qu'un hard block supprimé se relit comme un oubli : sans cette trace, la
> prochaine session le « rétablit ».
>
> ~~Pathologies (diabète, IRC, cardio)~~ · ~~Femmes enceintes / allaitantes~~
>
> **Le motif, et il tient en deux points.** (1) Subordonner l'accès au service à la
> grossesse ou à l'état de santé est un refus de service fondé sur deux critères de
> discrimination du code pénal (art. 225-1 / 225-2). (2) La réponse recueillie était
> elle-même une **donnée de santé** (RGPD art. 9), traitée sans qu'aucun texte — ni
> Apple, ni Google, ni le règlement dispositifs médicaux — ne l'exige.
>
> ⚠️ **CE QUI REMPLACE N'EST PAS RIEN, ET C'EST LE POINT** : l'avertissement. Il est
> désormais **DIT** au lieu d'être **VÉRIFIÉ** (`constants/legal.ts::AVERTISSEMENT_MEDICAL` :
> « Enceinte, allaitante, ou suivie pour une pathologie chronique ? Parles-en à un
> médecin avant de suivre un plan »). C'est aussi ce qu'exigent Apple 1.4.1 et Google.
>
> 🔴 **ET IL N'A PLUS D'ÉCRAN À LUI — supprimé le 2026-08-12, décision fondateur.**
> `components/HealthScreening.tsx` et `lib/healthScreening.ts` n'existent plus. Une fois
> les questions retirées, il ne restait qu'un titre, deux phrases et un bouton « J'ai
> compris » : **un tap de plus pour du texte**, sur le parcours d'entrée. Les deux
> phrases (celle-ci + `DISCLAIMER`) sont servies **sous le bouton de l'étape 1** de
> l'onboarding, en `Type.micro` gris.
> ⚠️ **« Discret » veut dire petit et gris, JAMAIS derrière un lien ou un dépliant** :
> Apple 1.4.1 veut le renvoi visible SUR le parcours, pas dans une page de CGU.
> ⚠️ Étape 1 seulement — le répéter sur les sept étapes en ferait du décor.
> ➡️ Garde-fou : `lib/__tests__/avertissementMedical.test.ts` (vérifié par 3 mutations).
> Sans lui, un nettoyage d'écran emporterait la phrase sans qu'aucun test ne rougisse,
> et personne ne s'en apercevrait avant une revue de store.
> ➡️ Une déclaration cochée n'a jamais rien prouvé de personne — ce qui protège
> réellement, ce sont les blocages qui **MESURENT** : l'âge (`MIN_AGE`), l'IMC de
> départ, le volume d'entraînement, les planchers caloriques. Eux ne demandent rien.
>
> ⚠️ **Aucune donnée n'était persistée** — mesuré avant de toucher au code :
> `lib/healthScreening.ts` n'écrivait qu'un `{passedAt, version}` local, et seulement
> pour qui PASSAIT. Les réponses ne quittaient jamais l'état de l'écran. Il n'y a donc
> rien à effacer chez les comptes existants, et rien à supprimer côté Supabase.

- **Utilisateurs < 18 ans** (bloquer à l'onboarding) — relevé de 16 à 18 le
  2026-07-28 : Mifflin-St Jeor n'est pas validée sous 19 ans, et servir un moteur
  de déficit calorique à un mineur est un risque de conformité App Store autant
  que de sécurité. Source unique : `lib/safety.ts::MIN_AGE`.
- IMC de départ < 18,5 avec un objectif de sèche ; poids cible hors plage saine ;
  volume d'entraînement > 20 h/semaine (`lib/safety.ts::checkEligibility`)
  ⚠️ **CES TROIS-LÀ BLOQUENT L'OBJECTIF, PAS L'APP** — `checkEligibility` le dit depuis
  toujours ; l'inscription, elle, ne le faisait pas. Corrigé le 2026-08-20 (E54) : sous
  IMC 18,5 la sèche est refusée **à l'étape 5**, au moment du choix, avec la porte
  ouverte NOMMÉE dans le message (Maintien, plan complet sans déficit — c'est déjà ce que
  le moteur sert via `deficitBlocked` → `UNDERWEIGHT_NO_DEFICIT`) et une sortie en un tap.
  Le renvoi vers un médecin ou un diététicien-nutritionniste vient en dernier, conditionné
  à la durée. **Seul `MINOR` bloque la génération entière**, et c'est le seul qui n'a pas
  de porte à nommer.

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

> **Un sous-traitant se déclare le jour où il TRAITE** (2026-08-11). Resend, expéditeur
> des e-mails de service, est en production depuis le 2026-08-09 : il reçoit l'adresse
> e-mail de chaque inscription. Il ne figurait ni au §5 de la politique
> (`constants/legal.ts`, `public/legal.html`), ni au registre — deux jours de retard.
> ⚠️ **Le motif de l'omission vaut plus que l'omission** : la checklist qui l'a trouvé le
> rangeait avec PostHog, donc **au futur** (« avant d'activer PostHog / Resend »), alors
> que l'un était branché et l'autre dormant. Et la phrase « aucun outil d'analyse tiers »
> restait vraie, ce qui rendait la page rassurante à la relecture.
> ➡️ Devant une liste de sous-traitants, la question n'est pas « qu'a-t-on prévu ? » mais
> **« qu'est-ce qui tourne aujourd'hui ? »**. La source est `constants/legal.ts` ;
> `public/legal.html` et `docs/politique-confidentialite-kyroz.md` s'en GÉNÈRENT
> (`npm run gen:legal`, depuis le 2026-08-18) — ne les édite jamais à la main.
> `RGPD-REGISTRE.md` reste tenu à part : c'est un document interne, pas une copie.
> ⚠️ **Ce qu'on ne sait pas ne s'écrit pas** : le cadre du transfert hors UE de Resend
> (clauses contractuelles types / DPF, art. 13-1-f) ne peut se lire que dans son DPA. La
> ligne reste explicitement EN SUSPENS au registre plutôt que remplie au jugé — même
> règle que le prestataire d'abonnement, jamais nommé tant qu'aucun contrat n'existait.

### Statistiques d'usage — le consentement se demande AVANT l'assistant (2026-08-10)

Deux consentements distincts, à ne pas confondre : celui aux **données de santé** (case
cochée à l'inscription, base légale du produit) et celui aux **statistiques d'usage**
(`lib/analytics.ts`, facultatif). Ce paragraphe ne parle que du second.

Il vivait sur une carte en tête de l'écran Plan. Il vit désormais dans
`components/AnalyticsConsentStep.tsx`, écran plein posé **après le dépistage santé et
avant l'étape 1** de l'onboarding. Décision fondateur : *« ça gâche la page principale de
l'app »*.

🔴 **LE PLACER PLUS TARD SUPPRIME UNE MESURE, ÇA NE LA DÉGRADE PAS.** `capture()` ne garde
RIEN tant que la réponse n'est pas donnée, et le tampon local a été explicitement écarté
(écrire des events sur l'appareil pour une finalité non essentielle relève probablement de
l'art. 82). Tout ce qui précède la réponse est donc perdu **pour tout le monde,
définitivement** — dont le tunnel d'entrée en entier. Or un décrochage d'onboarding est le
seul signal lisible à 40 utilisateurs ; la rétention, elle, demande des mois.

⚠️ **« PSEUDONYME », JAMAIS « ANONYME »** — dans le code, dans l'UI et dans les textes
légaux. L'identifiant est stable, donc les events d'un même appareil se regroupent, et
c'est précisément ce qui rend possible la suppression sur retrait promise à l'écran. Une
donnée supprimable par individu n'est pas anonyme : promettre les deux, c'est se
contredire. Corollaire : les métriques se lisent en **appareils**, jamais en personnes, et
on ne fait **jamais** d'`identify`/`alias` vers l'id Supabase.

⚠️ **Le §6 de `docs/2026-08-10-synthese-analytics-arbitrage.md` est un interdit ABSOLU** :
aucune donnée de santé dans une propriété d'event (y compris un motif de blocage lié à
l'une d'elles), aucun texte libre, aucune photo, ni e-mail ni prénom ni id de compte.
Ce n'est pas théorique — `onboarding_completed` a envoyé `goal` et `restrictions` depuis
son premier commit, **défaut dormant** faute de clé PostHog. Garde-fou :
`lib/__tests__/analyticsPerimetre.test.ts`, vérifié par 4 mutations.

✅ **LE LOT EST CLOS DEPUIS LE 2026-08-18 — textes, trois verrous, et la clé elle-même.**
La règle disait « la clé PostHog et les textes partent ensemble », dans cet ordre précis :
les textes ont été corrigés **avant** la clé, délibérément, parce que l'app DEMANDAIT déjà
le consentement en production pour un outil que les textes déclaraient inexistant — deux
surfaces se contredisaient, on corrigeait un énoncé faux, pas une anticipation. Puis les
trois verrous (IP écartée par défaut, DPA signé et lu, rétention réécrite pour dire le
vrai — « au moins un an, sans limite haute fixe », PostHog n'offrant aucune purge
automatique) ont été levés.
Puis `EXPO_PUBLIC_POSTHOG_KEY` a été posée : secret GitHub Actions (`deploy.yml`) et
variable EAS sur les trois environnements.
➡️ **L'analytics est ACTIF, pas dormant** — `capture()` envoie désormais, pour qui a
consenti (l'écran de consentement reste avant l'assistant, refusable sans conséquence,
retirable à tout moment). Détail complet et dates : `RGPD-REGISTRE.md`.
✅ **ET L'OTA EST PUBLIÉ DEPUIS LE 2026-08-18** (groupe `f01b56ba`, runtime 1.0.0,
iOS + Android, commit `1078c94`) : les binaires en circulation reçoivent donc la clé ET les
nouveaux textes — *ensemble*, comme la règle l'exige. Vérifié sur l'ARTEFACT, les trois
témoins ASCII présents dans les deux bundles Hermes.
⚠️ **Publier l'OTA n'allume pas la mesure pour le parc existant** : l'écran de
consentement ne vit que dans l'onboarding, donc un compte déjà créé garde un consentement
`null` et `capture()` y reste no-op. La mesure démarre avec les **nouvelles
installations**, pas d'un coup. Et il faut **deux lancements** pour voir l'update
appliqué (`fallbackToCacheTimeout: 0`, §2).
⚠️ Ne pas conclure de « c'est mergé » que c'est chez les utilisateurs : les trois surfaces
(site / OTA / binaire) se déploient séparément. Le jour de l'OTA,
**`--clear-cache` est obligatoire** (§2 : le cache Metro ne s'invalide pas sur un
changement de valeur `EXPO_PUBLIC_*`, donc l'update partirait sans la clé, en silence).
Tableau des trois surfaces : `PROCEDURE-2026-08-18-activation-posthog.md` §6.
⚠️ **Le décompte « trois textes » était faux** : le recensement du 2026-08-18 en a trouvé
**six**, dont deux qui mentaient déjà en production. Les surfaces se recensent par leur
RÔLE, pas en cherchant la phrase à corriger — c'est un manque, et un manque ne se grep pas.
Deux d'entre elles se **génèrent** désormais (`npm run gen:legal`) ; les autres sont listées
en AGENTS.md E26.

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

### Aucun émoji dans l'interface — règle posée (2026-08-06), passe CLOSE (2026-08-09)

La règle est tranchée : **pas d'émoji dans l'interface**. Elle est désormais tenue
par un COMPTEUR, `lib/__tests__/emojiInterface.test.ts`, et c'est lui la source —
pas ce paragraphe, qui a annoncé la fin de la passe une fois avant qu'elle le soit.

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

🔴 **Ce qu'elle n'a PAS fait — re-mesuré le 2026-08-07 : 13 émojis étaient encore
AFFICHÉS**, dans trois modules que la passe n'a jamais ouverts. ✅ **Les 13 sont
partis, le dernier le 2026-08-09** (E22).

| Où | Combien | Ce qui l'affichait | Sort |
|---|---|---|---|
| ~~`lib/streak.ts` (paliers)~~ | ~~6 — 🔥 🎉 💪 🏆 ⭐ 👑~~ → **0** | `StreakCelebration.tsx` en **fontSize 56**, écran Plan | remplacés par le **nombre de jours** en `Type.hero` (2026-08-09) |
| ~~`lib/streak.ts` (`streakMessage`)~~ | ~~2 — 🎯 🎉~~ → **0** | `StreakProgress.tsx` *(supprimé le 2026-08-14)* | retirés, phrases reformulées (2026-08-09) |
| ~~`lib/notifications.ts`~~ | ~~4 — 💪 🍽️ 🔥 ⚖️~~ → **0** | — | les textes ont déménagé dans `lib/reminder.ts` (2026-08-07) |
| ~~`constants/legal.ts`~~ | ~~1 — ⚠️~~ → **0** | l'écran `/legal` (CGU) | retiré, + le miroir `public/legal.html` (2026-08-09) |

🔴 **LE CHOIX DE DA SUR LES PALIERS EST TRANCHÉ, ET PAS SUR UN ARGUMENT
D'ÉMOJI** (fondateur, 2026-08-09). Les trois options étaient `ReussiteIcon`, le
seul chiffre, ou rien. C'est **le chiffre**, parce que six emblèmes différents —
un par palier — sont une **échelle de badges**, donc de la *collection* : la
moitié exacte de ce que §5 interdit. Les remplacer par six TRACÉS aurait gardé
le défaut en le rhabillant aux couleurs de la DA. ➡️ **Le nombre dit le fait, et
il n'y a plus rien à collectionner.** Il prend l'accent, et sa taille vient de
`Type.hero` (40) : un chiffre est de la typographie, là où un émoji dimensionné
est une image — ce qui explique que `typoDA` ait laissé passer un `fontSize: 56`
pendant des semaines (le style s'appelait `emoji`, sa clause d'exemption) et le
refuse maintenant.

✅ **Les quatre des notifications sont tombés en passant, et c'est instructif :
ils ne coûtaient rien à retirer** parce qu'on RÉÉCRIVAIT les phrases de toute
façon (heure libre → un jeu de messages par créneau de journée). Aucun d'eux ne
tenait la place d'une icône — ils étaient du ton de voix, exactement le cas que
la passe dit de SUPPRIMER sans remplacer. Ce qui les protégeait n'était donc pas
leur rôle, c'était que personne n'ouvrait ce fichier.

➡️ Et cette fois **un test les compte** (`lib/__tests__/reminder.test.ts` →
« aucun émoji »), avec le même motif que `typoDA`. C'est la réponse directe au
reproche du paragraphe suivant : une règle qu'aucun compteur n'exige se déclare
tenue toute seule.

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

➡️ **Règle : ne pas réintroduire d'émoji dans l'interface.** Ce n'est plus un
chantier (AGENTS.md **E22**, clos le 2026-08-09), c'est un invariant.

⚠️ **Le compte a valu 55, puis 13, puis 9, puis 0 — et chacun était juste à sa
date.** Le motif compte plus que les chiffres : ils baissaient **tout seuls**, au
gré des chantiers qui passaient par ces fichiers pour d'autres raisons (les 4 des
notifications sont tombés le 2026-08-07, agrafés à la réécriture du rappel). D'où
la règle qui a servi tout du long : **ce chiffre se RE-COMPTE avant d'être cité**,
jamais recopié.

✅ **LE COMPTEUR EST POSÉ — `lib/__tests__/emojiInterface.test.ts`**, et c'est lui
la source, pas ce paragraphe. Il balaye **cinq** dossiers (`app`, `components`,
`lib`, `constants`, `hooks`) et non deux : se limiter à ce qui *ressemble* à de
l'interface est l'erreur exacte qui a produit les 13 oubliés. Trois détails, chacun
payé par une mesure en l'écrivant :

- il **écarte les commentaires**, y compris ceux de FIN DE LIGNE. La méthode d'avant
  ne filtrait que les lignes *commençant* par `//`, `*` ou `/*` : elle rend **58**
  occurrences sur ce dépôt contre **11** — l'écart est fait des ⚠️ et 🔴 posés après
  du code. Un compteur qui crie au loup 47 fois ne sera pas lu ;
- il **autorise `®`, `©`, `™`**. Unicode les classe `Extended_Pictographic`, mais ce
  sont des signes typographiques : ils suivent la fonte, donc le thème — le critère
  même qui condamne les émojis. `lib/foods.ts` en porte un légitime (« Table
  Ciqual® 2025 »), qu'on n'a pas le droit de réécrire ;
- il **vérifie qu'il sait dire OUI** avant de dire non. Un compteur qu'on n'a jamais
  vu rougir ne prouve rien, et celui-ci a eu deux versions fausses — l'une aveugle
  aux commentaires de fin de ligne, l'autre condamnant le `®` de Ciqual. **Vérifié
  par 3 mutations**, dont celle qui remet un `fontSize: 56` sur la célébration.

⚠️ Corollaire, appris ici : **un `console.warn` n'est pas de l'interface, mais lui
laisser un émoji obligeait le test à s'écrire une exception par fichier** — et une
liste d'exceptions est une invitation à en ajouter une. Le ⚠️ de `sync.ts::RGPD_WARN`
est donc parti aussi, pour que la réponse attendue soit **zéro, partout, sans
dérogation**.

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

➡️ **Garde-fou : `lib/__tests__/rayonsDA.test.ts`.** Un `borderRadius` en chiffre n'est
légitime que si l'objet a une **taille fixe** et que le rayon en est au plus la moitié
(disque, pastille, barre). Dès qu'un objet se dimensionne par son contenu, sa forme est
une décision de DA. **Vérifié par mutation** : remettre la carte Hydratation à 16, ou le
`PrimaryButton` à 999, fait rougir le test.
⚠️ Ce qu'il ne sait PAS faire : dire qu'on a choisi le bon token — `Radius.pill` sur une
carte passerait. Il ferme la porte au chiffre en dur, qui est le chemin par lequel la
dérive est réellement arrivée.

### L'échelle typographique a été POSÉE, pas inventée (2026-08-05)

La règle ci-dessus disait déjà « la hiérarchie se fait par la **TAILLE**, pas par la
graisse ». Elle était vraie, écrite, et **contredite par le code depuis toujours** —
parce qu'aucun test ne la mesurait. Comptage du 2026-08-05 :

| Ce que disait `Type` | Ce que faisait l'app |
|---|---|
| 8 tailles | **18** |
| 2 graisses (500, 700) | **6** (400, 500, 600, 700, 800, 900) |
| — | `fontSize: 11.5` et `12.5` — des **demi-pixels**, 3 fois |

**Les deux tailles les plus employées de toute l'app n'existaient dans aucun token** :
14 (76 fois) et 12 (48 fois). Et 12, 13, 14, 15 cohabitaient — quatre « petits textes »
à un pixel d'écart. Ça ne fait pas quatre niveaux de lecture, ça fait **un flou** : le
lecteur ne perçoit aucun cran, juste un alignement imprécis.

**La graisse 600 a été bannie** (72 emplois). Mesurée, elle se répartissait au hasard
sur les six tailles — elle ne marquait donc *rien*. C'était la trace de « je veux que
ça ressorte un peu », pas une décision. Elle est devenue 700.

L'échelle finale a **16 crans, tous mesurés** : aucun n'a été créé sans au moins quatre
usages réels dans le code. `micro` (11) et `bodySmall` (14) sont nés de ce comptage,
pas d'une intuition.

🔴 **`Type.input` ne descend JAMAIS sous 16.** Ce n'est pas de l'esthétique : **Safari
iOS zoome de force** sur un champ dont le texte fait moins de 16 px, et les testeurs
ouvrent Kyroz dans le navigateur de leur téléphone (c'est le lien du README). Les sept
champs respectaient ce plancher **par accident** — sauf un, `RecipeEditor.input`, qui
était à 15 sur trois lignes et que le premier comptage avait raté.

⚠️ **Un style recopié partout est un rôle qui n'a pas de nom.** Le `disclaimer` (11 px,
interligne 16, centré) était dupliqué **à l'identique dans sept fichiers** — sept
occasions qu'une seule dérive, sur la phrase la plus sensible de l'app. Il est devenu
`Disclaimer` dans `theme.ts`. Même histoire pour le sur-titre en capitales : le
composant `SectionLabel` existait et servait 45 fois, pendant que cinq fichiers le
refaisaient à la main avec des interlettrages différents (0,4 · 0,5 · 0,6 · 1).

➡️ **Garde-fou : `lib/__tests__/typoDA.test.ts`.** Un `fontSize` en chiffre n'est
légitime que sur un **pictogramme** (un emoji dimensionné n'est pas de la typographie).
**Vérifié par mutation** — cinq fautes réintroduites une par une, cinq rougissements :
taille en dur, graisse 600, token hors échelle, `input` sous 16, cran sans token.
⚠️ Même angle mort que son frère : il ne dit pas qu'on a choisi le **bon** cran.

### L'espacement — le blanc DIT ce qui va ensemble (2026-08-06)

Troisième axe de la DA à recevoir un rôle et un garde-fou, après la forme et le
texte. Et le plus dérivé des trois : **520 espacements écrits à la main pour 49
usages de `Spacing`** — dix marges en dur pour une seule qui passait par le token.
**231 valeurs hors grille**, la plus courue étant `10` (70 fois), devant `14` (53),
`6` (39), `2` (39).

⚠️ **Ce n'est pas une question de joliesse.** Le blanc est le seul outil qui dit au
lecteur ce qui va ensemble : deux éléments proches sont lus comme un groupe, et
l'œil fait ce regroupement **avant** de lire. Exemple mesuré — les cinq écarts
verticaux empilés dans `MealCard` valaient **7, 6, 10, 6, 14**. Quatre informations
y flottaient à des distances presque identiques : rien ne disait où finissait le
bloc. Le coût n'est pas « moins joli », c'est **plus lent à comprendre**.

| Rôle | Token |
|---|---|
| écart serré DANS un groupe (un libellé et sa valeur) | `Spacing.xs` (4) |
| entre deux éléments d'un même groupe | `Spacing.sm` (8) |
| entre deux groupes d'un même bloc | `Spacing.md` (12) |
| marge intérieure d'une carte | `Spacing.lg` (16) |
| marge latérale d'un écran | `Spacing.xl` (20) |
| marge intérieure d'une feuille modale | `Spacing.xxl` (24) |
| séparation de deux sections | `Spacing.xxxl` (32) |

🔴 **LA DERNIÈRE LIGNE EST DÉSORMAIS COMPTÉE — `lib/__tests__/margeFeuilles.test.ts`**
(2026-08-14). `Sheet` ne pose **aucun** padding horizontal : chacun de ses enfants
apporte le sien, ce qui permet un en-tête FIXE margé et un `ScrollView` margé
séparément. Aucun mécanisme ne l'exigeait — donc `BirthDatePicker` a été écrit sans,
et son titre collait au bord de l'écran. Sur les **18** composants rendus directement
dans un `<Sheet>`, **17** portaient `Spacing.xxl` chacun de leur côté ; le
dix-huitième était unique **par accident**. ⚠️ Le corriger dans `Sheet` aurait doublé
la marge des dix-sept autres. ➡️ Vu au simulateur, invisible au navigateur.

⚠️ **Les valeurs hors grille ont été ABSORBÉES, pas adoptées — et c'est la
différence avec la typographie.** Là-bas, 14 avait un rôle propre (le texte
secondaire) et a mérité son token. Ici, 10 n'est pas « un cran entre 8 et 12 » :
c'est « un peu plus que 8 ». Deux points d'écart passent sous le seuil de
perception, donc un tel cran ne crée aucun niveau de lecture — il **dilue** ceux
qui existent. Règle appliquée : le cran le plus proche, on monte à égalité
(2→4, 6→8, 10→12, 14→16, 18→20). L'app s'aère de 1 à 2 points, jamais plus.

⚠️ **Tout ce qui s'écrit en points n'est pas un espacement**, et les confondre est
ce qui a produit les défauts les plus concrets :
- les **dégagements de bas** (120 sous une liste d'onglet, 60 en bas d'écran plein,
  40 pour le menton d'une feuille) compensent quelque chose de **physique** — ils
  vivent dans `Fond`, nommés d'après ce qu'ils dégagent, pas dans la grille ;
- le `paddingVertical` d'un bouton ne règle pas un écart, il fabrique une
  **HAUTEUR**. C'est de là que venaient les 17 éléments pressables sous les 44 pt
  d'Apple — dont un bouton « Annuler » à **29 pt**. Le correctif n'est pas de
  gonfler le padding mais d'ajouter `minHeight: CIBLE_TACTILE_MIN` : le padding
  règle l'air autour du libellé, la hauteur minimale garantit la cible.
  ⚠️ `hitSlop` élargit la zone **au doigt, jamais à l'œil** — un bouton qui a l'air
  petit reste difficile à viser, donc il ne compte pas comme un correctif.
- les **rattrapages négatifs** (`marginTop: -8`, 22 sites) sont tous des textes
  d'aide qui annulent le `gap` de leur conteneur pour se recoller à leur champ.
  Ils sont désormais alignés sur la grille (`-Spacing.sm`), mais ils **restent le
  symptôme** d'un espacement uniforme là où il faudrait des groupes : la vraie
  correction serait structurelle, pas un token.

➡️ **Garde-fou : `lib/__tests__/espacementDA.test.ts`.** Aucun espacement en
chiffre (sauf `0`, qui n'est pas un espacement mais son absence — il annule le
padding natif d'un champ) ; la grille reste un multiple de 4, croissante et sans
doublon ; aucun pressable sous 44 pt. **Vérifié par 5 mutations**, toutes
rougissent.

### Les trois finitions : trait, icône, retour au toucher (2026-08-06)

Même diagnostic que les trois passes précédentes, en plus petit — le token existe
ou n'existe pas, mais rien n'oblige à s'en servir :

| Ce qui dérivait | Mesuré | Devenu |
|---|---|---|
| `activeOpacity` | **4 valeurs** (0,85 ×31 · 0,7 ×23 · 0,8 ×14 · 0,6 ×1) | `OPACITE_PRESSION` = 0,7 |
| `borderWidth` | 1 (×40) · 2 (×5) · **1,5 (×4)** | `Trait.fin` / `Trait.controle` |
| taille d'icône | **12 valeurs** de 14 à 30 | `Icone.petite/standard/action/nav/vide` |

⚠️ **Un seul geste mérite une seule valeur.** Les quatre `activeOpacity` ne
correspondaient à aucun type d'élément : c'était l'humeur de qui écrivait la
ligne. 0,7 plutôt que 0,85 parce qu'à 15 % d'écart sur fond sombre le retour est
presque invisible — or c'est le **seul** signe que l'appui a été pris en compte.

⚠️ **Une icône n'a pas de taille « à elle »** — elle en a une par rapport à ce
qu'elle accompagne. D'où des crans nommés `petite` (dans une case, une puce),
`standard` (chevron de ligne, croix d'un champ), `action` (bouton rond), `nav`
(chevron retour), `vide` (illustration d'état vide). Des noms `sm/md/lg`
n'auraient rien dit de plus que le chiffre qu'ils remplacent.

Le `1,5` du trait est parti : le `2` marquait **toujours** un contrôle qu'on
sélectionne (case, pastille de couleur, option retenue), le `1,5` n'était
qu'« un peu plus épais qu'un séparateur ».

➡️ **Garde-fou : `lib/__tests__/finitionsDA.test.ts`**, vérifié par 6 mutations.

⚠️ **Ce qui n'a PAS été fait, et pourquoi** : les 110 `lineHeight` en dur. Le bon
geste serait de les porter dans les tokens `Type` — mais un `lineHeight` posé sur
`Type.body` s'applique aussi aux textes d'UNE ligne, dont il change la hauteur de
boîte, donc l'alignement. Le risque ne se voit pas sur les 5 onglets : il se voit
sur les ~25 feuilles modales, qu'aucune capture ne couvre encore. C'est un
chantier à part, avec sa vérification à lui.

### Le MOUVEMENT — cinquième axe, et le dernier (2026-08-10)

Forme, texte, blanc et finitions ont chacun reçu un rôle, un token et un test. Le
mouvement n'avait **rien** — ni token de durée, ni courbe, ni garde-fou — et il avait
donc dérivé pour exactement la raison des quatre autres avant leur passe : rien ne
l'obligeait. Mesuré : 7 fichiers animent, 16 `Animated.timing` dont **12 sans aucune
courbe**, 7 durées écrites à la main, zéro entrée dans `theme.ts`.

**Le modèle est celui d'Apple, deux paramètres au lieu du triplet physique** —
`lib/motion.ts` :

| Rôle | Ressort | Amortissement · réponse |
|---|---|---|
| déplacement, retour à sa place | `RESSORT.pose` | 1 · 0,4 s — **aucun dépassement** |
| feuille et tiroir | `RESSORT.feuille` | 0,8 · 0,3 s |
| l'appui d'un doigt | `RESSORT.appui` | 1 · 0,16 s |
| le relâchement | `RESSORT.relache` | 0,72 · 0,32 s |
| le « pop » des célébrations | `RESSORT.fete` | 0,55 · 0,45 s |

⚠️ **LE REBOND SE MÉRITE.** Il n'est légitime que si le geste PORTAIT un élan — une
feuille qu'on jette, un doigt qui part. Sur une surface qui apparaît sans qu'on l'ait
poussée, un dépassement se lit comme un défaut. D'où `pose` à 1, qui est le défaut.
La seule exception sans geste est `fete` : un moment rare a droit à son budget de
plaisir, et c'est une décision, pas une dérive.

⚠️ **Une DURÉE ne convient que si personne ne peut attraper l'objet pendant qu'elle
tourne** (`DUREE.instant` 160 · `court` 200 · `moyen` 260 · `entree` 550 · `fete` 2200).
Dès qu'un doigt peut s'en saisir, c'est un ressort — sinon l'animation ignore le geste
jusqu'à son terme, puis saute.

🔴 **CE FICHIER N'IMPORTE RIEN, ET C'EST LA CONDITION DE SON EXISTENCE.** `theme.ts`
tire react-native, donc ce qui y vit ne se vérifie qu'en le lisant COMME DU TEXTE. Or le
mouvement ne se résume pas à des constantes : il porte des DÉCISIONS — où atterrit un
geste, quelle résistance à un bord — et une décision se teste en l'appelant. Même procédé
que `collapsingTitle.ts`, `accentColor.ts` et `tours.ts`.

**Les quatre règles que le code applique désormais :**
1. **La vitesse du doigt n'est jamais jetée.** `decisionFeuille` PROJETTE où le geste
   atterrirait s'il décélérait seul (la fonction d'Apple, pas la formule scolaire), choisit
   la destination la plus proche de ce point, puis passe la vitesse au ressort. Avant :
   `vy > 0.4` tranchait, et la sortie durait 240 ms fixes — effleurée ou balancée, pareil.
2. **Toute `Animated.timing` déclare sa courbe.** Sans `easing`, RN applique `easeInOut`,
   donc un démarrage LENT. `Easing.out` partout — sauf une chute libre, qui ne ralentit pas.
3. **Un ressort part de la valeur COURANTE.** Poser la valeur de départ avant de lancer
   l'animation rend l'ouverture non interruptible : rattraper une feuille la fait sauter.
4. **Les bords résistent** (`caoutchouc`) au lieu de ne rien faire.

🔴 **`vy` DE `PanResponder` EST EN PIXELS PAR MILLISECONDE**, un ressort intègre en
SECONDES : `vitesseDepuisPan` fait le ×1000. L'oublier est un facteur mille — donc un
correctif qui a l'air de n'avoir rien fait. ℹ️ Le piège disparaît avec
`gesture-handler`, dont `velocityY` est déjà en px/s.

🔴 **« RÉDUIRE LES ANIMATIONS » ÉTAIT IGNORÉ PAR TOUTE L'APP** — `AccessibilityInfo` :
0 fichier. Réglage d'accessibilité qu'Apple teste en revue. `lib/reduceMotion.ts` suit le
patron obligatoire des valeurs d'appareil (store externe + `useSyncExternalStore`, chargé
une fois au layout racine), **plus un abonnement à `reduceMotionChanged`** : celle-ci
change PENDANT que l'app tourne, ce qui la distingue des cinq autres.
⚠️ **Réduire n'est pas supprimer.** On garde ce qui INFORME (opacité, apparition), on
retire ce qui DÉPLACE (glissement, rebond). Retirer tout retour laisserait la personne
sans le moindre signe que son geste a été pris — un second défaut, pas un correctif.

**L'appui : un bouton s'ENFONCE, il ne pâlit pas** (`components/Presse.tsx`, échelle
0,97). 129 pressables migrés d'un coup, `TouchableOpacity` → `Pressable` — c'est ce
dernier qui expose l'état pressé, donc le seul qui puisse piloter autre chose que
l'opacité.
🔴 **ET LE `Pressable` LUI-MÊME EST ANIMÉ, PAS UNE VUE POSÉE DEDANS.** Une première
version enveloppait les enfants dans une `Animated.View` : le `style` d'un pressable
porte presque toujours un `flexDirection` ou un `gap`, qui s'appliquent à ses ENFANTS
DIRECTS. Une vue intermédiaire les aurait tous regroupés en UN enfant — chaque rangée
icône + texte serait devenue une colonne, **partout**, sans qu'aucun test ne le voie.

⚠️ **Deux valeurs ne doivent JAMAIS être capturées dans le `PanResponder`** (créé une
seule fois, donc figé au premier rendu) : la hauteur d'écran (rotation, Split View) et
le réglage d'accessibilité. Les lire depuis une ref et depuis le store.

🚫 **Ce que la passe n'a PAS fait, et c'était délibéré** : les 48 fichiers muets
restaient muets. Animer parce que ça n'anime pas est le contraire du geste — la
retenue fait partie de la DA d'Apple autant que les ressorts.

### Les TRANSITIONS, sixième passe de mouvement (2026-08-15)

Le fondateur : *« fais un check de toutes les animations, ou là il faudrait des
petites animations — ça va fluidifier les transitions de l'app. »* La retenue
ci-dessus n'est pas annulée : elle est **précisée**. Ce qui manquait n'était pas
du mouvement en général, c'était une classe précise — les moments où la mise en
page **change d'un bloc** sans que rien ne relie l'avant et l'après.

**Six sites retenus, sur un balayage de toute l'app.** Le critère appliqué est
celui d'Emil Kowalski, dans cet ordre : *fréquence* (au-delà de quelques dizaines
de fois par jour, on n'anime pas), *rôle nommé* (retour, cohérence spatiale,
lisibilité d'un changement d'état, ou éviter une téléportation — « c'est joli »
n'est pas un rôle), *budget* (< 300 ms), *fonction* (ce qu'on LIT ne bouge pas).

| Où | Ce qui téléportait | Rôle |
|---|---|---|
| `Segmented` — **17 sélecteurs** | le fond en accent sautait d'une case à l'autre | cohérence spatiale |
| `MealCard` via `cookMeal` | la carte rétrécit, les suivantes remontaient d'un coup | changement d'état |
| Frigo — repli d'un rayon | l'accordéon claquait | éviter une téléportation |
| Les 3 listes à paliers | 8 ou 10 cartes surgissaient sous le doigt | éviter une téléportation |
| Jauge des Courses | « Tout cocher » : 0 → 100 % en une image | changement d'état |
| Anneau de la visite guidée | il sautait d'un bout de l'écran à l'autre | **explication** |

🔴 **`components/Mouvement.tsx::animerMiseEnPage()` — à appeler AVANT le `setState`
qui déplace l'écran.** Ce qui saute dans ces cas n'est pas une propriété, c'est une
MISE EN PAGE de hauteur variable : `LayoutAnimation` la calcule exactement, là où
un `Animated.Value` par élément demanderait un `onLayout` et un état de plus.
⚠️ C'est **global au prochain rendu** : réservé à un geste précis, jamais à un
rafraîchissement de fond. Et le réglage d'accessibilité se relit **à chaque appel**.

🔴 **LA COULEUR D'UN LIBELLÉ VOYAGE AVEC LE CURSEUR QUI PASSE DESSOUS.** Le piège de
cette passe, invisible avant de construire : garder la bascule instantanée
(`on ? onAccent : textSecondary`) sur un curseur qui glisse donne, pendant tout le
trajet, un libellé en couleur-sur-accent posé sur le rail sombre — **illisible
pendant 300 ms**, sur l'élément qu'on vient justement de choisir. Une seule valeur
animée pilote donc la position ET les N teintes, chacune interpolée sur sa distance
au curseur.

🔴 **ET UNE DÉCISION DE GOÛT A ÉTÉ RENVERSÉE PAR LA MESURE.** La bulle de la visite
guidée avait été laissée immobile, sur un raisonnement juste : l'anneau est le même
objet qui voyage, la bulle est un contenu qui change — la faire glisser dirait
qu'elle est la même. Relevé à **30 images/seconde sur une vidéo du simulateur** :
l'anneau rendait une fenêtre de mouvement de 200 ms, et la bulle un **saut d'une
seule image, pic 25,5** — donc la transition claquait quand même, parce que la
bulle est le plus gros objet de l'écran. Elle se POSE désormais en fondu (elle ne
se déplace toujours pas) : pic **25,5 → 12**, et le changement se répartit sur
plusieurs images. ➡️ *Le raisonnement disait « pas de déplacement » et il avait
raison ; il ne disait rien de « pas de transition », et c'est la mesure qui l'a dit.*

➡️ **Comment on mesure une animation ici.** Ni à l'œil, ni au navigateur
(`requestAnimationFrame` n'y tourne pas) : `xcrun simctl io recordVideo`, puis
`ffmpeg -vf fps=30`, puis la **différence moyenne entre images consécutives**. Un
glissement laisse une TRAÎNÉE de plusieurs images, un saut laisse un PIC isolé —
et ça se lit sans hypothèse sur ce qu'on cherche. Pour une position précise
(le curseur d'un `Segmented`), on relève le centre de la zone claire image par
image : trois positions de repos et des positions INTERMÉDIAIRES prouvent le
glissement.

🚫 **Écartés, et il faut savoir pourquoi** : le grand chiffre kcal qui compterait
(c'est de la donnée qu'on LIT — un compteur qui roule empêche de la lire) · le
fondu au changement de jour du Plan (même raison : il retarderait la lecture de ce
qu'on vient de demander) · la transition entre onglets (navigation cœur, plusieurs
dizaines de fois par jour — iOS ne l'anime pas non plus) · la case à cocher des
Courses (trente fois d'affilée en magasin ; le retour haptique `choix` fait déjà
le travail, et `Presse` enfonce déjà).

➡️ **Garde-fou : `lib/__tests__/mouvementDA.test.ts`** (14 cas, vérifié par 3 mutations) —
aucune durée en dur, aucune `timing` sans courbe, aucun `bounciness`/`speed`/`tension`/
`friction`, plus les propriétés des décisions du geste.
⚠️ **Et il a fallu rebrancher `espacementDA`** : il cherchait les pressables par
`TouchableOpacity|Pressable|TouchableHighlight` et ne reconnaissait plus **aucun** bouton
de l'app après la migration — **vert, et aveugle**. *Un garde-fou nommé d'après une
implémentation meurt le jour où on en change, en silence et dans le sens rassurant.*
⚠️ Et la première version du nouveau test **mentait dans le sens alarmant** : sa regex
s'arrêtait au premier `)`, donc elle accusait 10 fichiers de n'avoir aucune courbe alors
qu'ils en ont une. Faire dire OUI à une sonde autant que NON.

🔴 **Rien de tout ceci ne se vérifie dans le panneau navigateur** : `requestAnimationFrame`
n'y tourne pas, et un GESTE ne se vérifie pas en web (§5). Ce qui est testé ci-dessus l'est
parce que c'est PUR ; le ressenti se juge au simulateur.

### Le MATÉRIAU — sixième axe (2026-08-11)

Kyroz ne connaissait qu'un matériau : **la peinture opaque**. Une barre d'onglets peinte
cache ce qu'il y a dessous ; celle d'iOS 26 le laisse deviner, et c'est ce flou qui dit à
l'œil « il y a encore du contenu par là ».

**LA RÈGLE : le verre est réservé à ce qui FLOTTE au-dessus du contenu.** Une barre
d'onglets, oui. Une feuille modale pleine posée sur un fond assombri, non — elle ne
recouvre rien d'intéressant, et son texte y perdrait en lisibilité. Apple lui-même n'en
met pas là.

| | Où | État |
|---|---|---|
| Barre d'onglets | `app/(tabs)/_layout.tsx` | **en verre** — le contenu défile au travers |
| Barre de titre compacte | `CollapsingTitle.tsx` | **peinte** — rien ne passe derrière (mesuré) |
| Feuilles modales | `Sheet` / `ActionSheet` | **peintes** — fond assombri à 55 %, rien à voir |

**Le module natif était DÉJÀ dans le binaire.** `expo-router` tire `expo-glass-effect`
(et `expo-symbols`) sans les déclarer dans `package.json`, comme il tire reanimated. Le
pod est compilé dans le build 1.0.0 (3) — donc ce chantier est parti **en OTA**. ➡️ « Pas
dans `package.json` » ne veut jamais dire « pas dans le binaire » : la preuve est
`ios/Podfile.lock`. Voir aussi §2.

🔴 **TROIS conditions avant de servir du verre, et la première évite un CRASH** —
`lib/materiau.ts::doitServirDuVerre` : l'API native répond (`requireNativeModule` lève sur
un binaire d'avant, et une OTA peut y atterrir), le design Liquid Glass est actif (faux
sous iOS 26), « Réduire la transparence » est éteint (Apple le teste en revue, comme
« Réduire les animations »). **Le repli rend l'app d'avant au pixel près** — c'est ce qui
autorise l'OTA sans risquer un écran illisible.

⚠️ **Une barre en verre FLOTTE, donc le contenu passe dessous.** Sans dégagement de bas,
la dernière ligne d'une liste finit cachée — un défaut qui ne se voit qu'en fin de
défilement, jamais sur une capture. Les cinq onglets portent `paddingBottom:
Fond.barreOnglets`, et `materiauxDA` les **compte**.

⚠️ **Ne poser du verre que là où quelque chose passe derrière — et le VÉRIFIER.** La barre
de titre compacte devait en recevoir : mesuré en la teignant en rouge translucide, rien ne
défile derrière elle (`SafeAreaView edges={['top']}` fait commencer le contenu en dessous).
Le verre y rendait le même noir, en supprimant le filet. Chantier annulé sur ce fichier.
Deux hypothèses plausibles donnaient la même capture noire ; **seule la sonde colorée a
tranché**.

➡️ **Garde-fou : `lib/__tests__/materiauxDA.test.ts`**, vérifié par 8 mutations. Il écarte
les commentaires avant toute recherche de chaîne — les notes de `Materiau.tsx` citent
`expo-glass-effect`, la chaîne même qu'il interdit ailleurs.

### Le RETOUR AU TOUCHER — septième axe, et le seul qu'on ne voit pas (2026-08-11)

Kyroz ne rendait **rien** à la main : ni sur le geste central (cocher un repas), ni
sur le plus répété (cocher un article de courses), ni quand une action est refusée.

🔴 **LA RÈGLE PREMIÈRE EST UNE RÈGLE DE RARETÉ.** Apple écrit « use haptics
sparingly », et la raison n'est pas le confort : un retour que l'on sent partout ne
signale plus rien, il devient le bruit de fond de l'app. `Presse` porte donc une
prop `retour` **sans valeur par défaut** — brancher une vibration par défaut aurait
mis les 129 boutons à vibrer en une ligne, sans qu'aucun test ne le voie. Chaque
site qui en veut un le NOMME, et `haptiqueDA` les compte.

| Rôle | Le moment | Où, aujourd'hui |
|---|---|---|
| `choix` | on choisit parmi plusieurs | cocher un article de courses (30 d'affilée) |
| `validation` | une action ABOUTIT | « J'ai cuisiné » — le geste central |
| `refus` | une action est refusée | échec de connexion / de confirmation |
| `declic` | un SEUIL de geste est franchi | la feuille décide qu'elle part |

⚠️ **Deux rôles ne peuvent pas partager une sensation** — ce serait deux noms pour
un seul cran, la faute que l'échelle d'espacement interdit depuis le 2026-08-06.
Et **un rôle jamais employé est un token sans rôle** : compté aussi.

⚠️ **Pas de store d'accessibilité ici**, contrairement au verre et au mouvement :
`UIFeedbackGenerator` respecte tout seul « Retour haptique du système ». Dupliquer
une décision déjà prise par le système, c'est créer un endroit où elle diverge.

⚠️ **Le web est coupé, et ce n'est pas un oubli.** `expo-haptics` n'y est pas
neutre : il appelle `navigator.vibrate`, et sur iOS Safari il injecte un faux
interrupteur caché pour arracher une vibration au système. Un SITE qui fait vibrer
un téléphone est une surprise, pas une affordance. À relire si Kyroz devient une PWA.

🔴 **ET « UNE DÉPENDANCE NATIVE FERME LA VOIE OTA » EST FAUX ICI — mesuré.** C'était
l'argument qui plaçait ce lot après le build. Sur le simulateur, dont le dev client
ne contient PAS `ExpoHaptics` (0 occurrence dans `ios/Podfile.lock`), cocher un
repas marche et l'app tient debout. **Deux** mécanismes, qu'il fallait distinguer :
le paquet utilise `requireOptionalNativeModule` (rend `null`, donc **l'import ne
crashe pas** — c'est le gros du risque), mais l'appel, lui, **rejette** — et seul le
`.catch` de `lib/retourHaptique.ts` évite un `unhandledrejection` à chaque appui.
➡️ Le lot est publiable en OTA ; il ne vibrera pas sur les binaires d'avant et
s'activera au build 1.0.0 (4). ➡️ **Généralisation** : la question n'est jamais
« ce module est-il dans le binaire ? » mais « que fait le paquet quand il n'y est
pas ? » — `requireNativeModule` lève, `requireOptionalNativeModule` non, et les deux
se lisent en trois lignes de source.

➡️ **Garde-fou : `lib/__tests__/haptiqueDA.test.ts`**, vérifié par 9 mutations.

### Les longues listes se dévoilent par PALIERS (2026-08-14)

Décision fondateur, sur captures : *« dans les recettes que l'on peut faire, en
mettre 8 puis passer aux presque. Et si on veut plus, "voir + de recettes". Pareil
pour les 512 recettes : 10, puis voir +, puis 10, puis voir +, et après voir tout. »*

**`lib/revelation.ts`** — pur, sans aucun import, donc testé. Trois listes s'en
servent : les recettes prêtes du Frigo (pas de 8), les presque-prêtes (8), et le
catalogue (10). Le bouton commun est `ui.tsx::BoutonRevelation`.

⚠️ **CE N'EST PAS UNE PAGINATION.** Rien n'est chargé à la demande — le catalogue
est embarqué dans le bundle (§3). On ne réduit pas un coût réseau, on réduit ce
qu'on demande à l'œil : 512 cartes d'un coup, ce n'est pas une liste, c'est un mur,
et le filtre juste au-dessus devient décoratif puisque personne ne descend au bout.

⚠️ **`PALIERS_AVANT_TOUT = 2` est le chiffre du fondateur, pas un réglage.** Il est
EXPORTÉ plutôt qu'enterré dans un `n >= 2` : sans nom, il se ferait « simplifier »
à la première relecture. Au-delà, atteindre la fin d'un catalogue de 512 demanderait
cinquante appuis — le palier « tout » n'est pas un confort, c'est ce qui empêche la
liste d'être un cul-de-sac.

🔴 **LE LIBELLÉ DIT LE RESTE, ET LE COMPTEUR DIT LE TOTAL.** Deux règles §10 :
· « Voir + de recettes » ne s'affiche pas quand le tap révélerait déjà tout le
  reste — il devient « Voir les N restantes ». Un bouton dit ce qu'il fait ;
· le compteur de l'en-tête Recettes affiche le total FILTRÉ, jamais la tranche
  visible : sinon un filtre qui trouve 512 recettes en annonce 10, et le chiffre
  change à chaque « Voir + » sans qu'aucun filtre n'ait bougé.

🔴 **LES PALIERS SE REMETTENT À ZÉRO QUAND LA LISTE CHANGE** (filtre, recherche).
Sans ça, le bouton annonce un reste calculé sur l'ancien filtre.

⚠️ **Un plafond MUET a été retiré au passage** : les presque-prêtes du Frigo étaient
tronquées à 5 par un `.slice(0, 5)` que rien n'annonçait — 194 recettes n'existaient
nulle part à l'écran. C'est le « no silent caps » du dépôt : si une liste est bornée,
elle doit le DIRE.

**Et le stock du Frigo se replie par rayon** (`garde-manger.tsx`). **Ouvert par
défaut**, sur demande du fondateur — un inventaire qui s'ouvre fermé cache ce qu'on
vient vérifier. On mémorise les rayons FERMÉS, pas les ouverts : un ensemble vide
porte le défaut sans qu'aucune ligne ne l'initialise, et un rayon qui apparaît est
ouvert d'office. ⚠️ **Volontairement NON persisté** : c'est un pli de lecture, pas un
réglage — le stocker imposerait le patron des valeurs d'appareil (§11) pour un état
qui ne survit à rien d'important. ⚠️ L'en-tête est devenu un BOUTON, donc il porte
`minHeight: CIBLE_TACTILE_MIN` : en petites capitales il faisait 15 pt de haut.

➡️ Garde-fou : `lib/__tests__/revelation.test.ts` (13 cas), qui fige la séquence
dictée — elle n'est pas un détail d'implémentation.

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

### La visite guidée dit ce que le code FAIT (2026-08-08)

Un tour par onglet, déclenché **à la première visite de CET onglet** — jamais tous au
démarrage. 19 bulles au total (plan 5 · profil 6 · recettes 3 · courses 3 · frigo 2),
mais une personne n'en voit que 6 le jour où elle ouvre le Plan. Servies d'un bloc, ce
seraient 20 **interruptions modales** dans la même session : chaque bulle est une
`Modal` dont les panneaux avalent les taps, pas une infobulle qu'on ignore.
⚠️ **CE DÉCOMPTE EST VERROUILLÉ CONTRE LE CODE** (`visiteGuidee.test.ts`) et il ne se
recopie pas : il a valu 21 jusqu'au 2026-08-14, où la 3ᵉ bulle du Frigo a été retirée.
Un inventaire écrit à trois endroits finit par se confirmer tout seul (CLAUDE.md §8,
le compteur d'émojis) — celui-ci rougit le jour où une bulle part ou arrive.

**Le contenu vit dans `lib/tours.ts`, pas dans les écrans.** Fichier sans aucun import,
donc testable, là où `components/GuidedTour.tsx` tire react-native et ne l'est pas.
Même procédé que `lib/collapsingTitle.ts` et `lib/accentColor.ts` : la décision est une
fonction pure, l'écran ne fait que la rendre.

🔴 **UNE BULLE EST UNE AFFIRMATION SUR LE CODE, et elle survit à ce qu'elle décrit.**
Sur les cinq bulles d'origine, **trois étaient fausses** au moment de l'audit — chacune
avait été vraie le jour où elle a été écrite :

| Ce qu'elle promettait | Ce que faisait le code |
|---|---|
| « Kyroz recale **automatiquement** les repas restants » | `logOffPlan` enregistre sans toucher au plan, puis **demande** (`setAdaptPrompt`) ; refuser ne recale rien |
| « la **barre** se remplit » | `MacroBar` est un ruban de PROPORTIONS toujours plein — c'est le chiffre héros qui se remplit |
| « le bouton **Échanger** ce repas », « ses **badges** d'adaptation » | le libellé est « Remplacer » ; ces badges n'existent pas comme tels |

➡️ **Chaque étape porte en commentaire le chemin de code qui la prouve.** Ne pas en
ajouter une sans faire de même — c'est la seule chose qui rende l'affirmation
re-vérifiable, et aucun test ne peut juger qu'une phrase est vraie.

⚠️ **Une bulle dont l'énoncé n'est vrai que pour certains profils se CONDITIONNE.**
Le précédent était déjà dans l'app (`planTour` est une fonction et non une constante,
parce qu'elle annonçait « 7 jours » en dur). Rejoué ici pour la modulation par volume :
sans sport déclaré, `dayExpenditures` retombe sur une cible plate, donc parler de
« jours d'entraînement » mentirait. `moduleParVolume` (même seuil de 40 kcal et même
calcul que `FirstPlanReveal`, pour que deux écrans ne se contredisent pas sur la même
question).

⚠️ **Et le même prédicat manquait à l'ÉCRAN**, corrigé dans la foulée : « Jour de repos ·
un peu moins de calories et de glucides » n'était conditionnée qu'à `isRestDay`. Mesuré
sur le moteur (H 30 ans, 83 kg, 18 % MG, sèche, NEAT desk) : **sans sport, 2042 kcal les
sept jours, amplitude 0** ; avec 3 séances de 60 min, 2042/2303 alternés, amplitude 261.
Le nombre affiché douze pixels plus bas démentait la phrase. ➡️ **C'est la CAPTURE des
deux textes côte à côte qui l'a montré**, pas la relecture — la bulle, elle, se
conditionnait déjà.

⚠️ **Un tour AMPUTÉ est le défaut silencieux du moteur** : `startTour` écarte les étapes
dont la cible n'est pas montée. Certaines absences sont légitimes (le bloc frigo n'existe
pas quand le frigo est vide), mais un id mal orthographié, ou une ref perdue en
refactorant un écran, fait disparaître une bulle **sans rien casser** — le tour se joue
plus court en ayant l'air complet. D'où un avertissement en développement, et surtout le
garde-fou ci-dessous.

🔴 **L'ANNEAU ÉPOUSE LA FORME DE SA CIBLE, ET LE TROU AUSSI** (2026-08-14). Deux
défauts qui se cachaient l'un l'autre. (a) L'assombrissement se faisait par QUATRE
panneaux rectangulaires : le vide qu'ils laissaient ne pouvait pas être arrondi,
donc aux quatre coins une pointe d'écran restait **en pleine lumière** hors de
l'anneau — une équerre claire qui dépasse d'un bouton en pilule, sur fond sombre.
(b) `TourStep.rayon` n'était renseigné par **aucune** des 21 étapes : toutes
retombaient sur le rayon de carte, donc l'anneau dessinait une carte autour d'un
bouton et une lozange autour d'un cœur.
➡️ Un SEUL panneau, dont la **bordure** fait l'ombre : le vide intérieur d'une
bordure épaisse est arrondi du rayon extérieur moins l'épaisseur, donc du même
rayon que l'anneau **par construction** et non par recopie.
➡️ `forme: 'carte' | 'bouton' | 'pastille'`, **obligatoire**, chaque étape portant
en commentaire la ligne de style qui la prouve. Un NOM et pas un nombre : ce
fichier doit rester pur, donc il ne peut pas importer `Radius` — y écrire 22 aurait
recopié un token de la DA dans un fichier qui ne le voit pas, et les deux auraient
divergé à la première refonte. Le contenu déclare, le moteur traduit.
⚠️ *Un réglage optionnel que personne ne renseigne ne pilote rien*, et il se
re-oublie tant qu'il reste optionnel. C'est pour ça que `forme` est exigée, et
comptée : `visiteGuidee.test.ts` (4 cas, 4 mutations).
🔴 Rien de tout ceci ne se juge au navigateur : c'est de la géométrie sur fond
sombre. Vérifié au simulateur.

🔴 **L'ANNEAU NE DÉSIGNE JAMAIS L'OBJET D'UNE AUTRE BULLE** (2026-08-15, AGENTS.md
E50, signalé sur captures). Trois invariants, chacun payé par un défaut :
1. **« Enregistrée » n'est pas « montée ».** `useTourTarget` appelle `register`
   depuis le CORPS du composant : l'id est dans la table dès que le composant vit,
   même si l'élément visé n'est pas rendu. `refs.current.has(id)` laissait donc
   entrer `plan-cook` alors que le bouton « J'ai cuisiné » n'existait pas — repas
   déjà mangé. **La seule preuve qu'une cible est là, c'est `.current`.**
   ⚠️ Corollaire côté écran : une cible posée sur le « premier élément d'une
   liste » doit suivre le premier élément qui la PORTE, pas l'indice 0. Trois
   familles sont dans ce cas (`plan-cook`/`plan-actions`, `courses-article`,
   `recettes-carte`/`recettes-favori`).
2. **Aucune durée devinée ne décide qu'un défilement est fini.** `scrollTo` est
   animé ; mesurer 260 ms plus tard fait tomber la lecture EN PLEIN VOL, et
   l'anneau se pose à côté. On attend que **deux lectures coïncident**
   (`lib/visee.ts::memeCadre`), et on ne défile pas du tout quand la cible est
   déjà visible (`dejaVisible`) — un défilement inutile coûtait 260 ms pendant
   lesquelles l'anneau de l'étape d'avant restait affiché.
3. 🔴 **UN TUTO SE QUITTE TOUJOURS.** Le voile sombre s'affichait dès l'ouverture,
   la bulle seulement une fois la cible mesurée : une cible introuvable donnait un
   écran assombri **sans bulle et sans « Passer »**, et le panneau avale les taps,
   barre d'onglets comprise. Aucune sortie — il fallait tuer l'app. Et comme
   `startTour` marque le tour vu à l'ouverture, **ça n'arrive qu'une fois**, donc
   c'est irreproductible par construction. ➡️ Trois états et non deux : on cherche
   (sombre), on a trouvé (spotlight), **on renonce (la bulle sans anneau)**. Ne
   jamais rendre un état de ce moteur qui n'offre pas de sortie.
➡️ Les décisions vivent dans **`lib/visee.ts`** (pur, testé) ; le moteur ne fait
que les appeler. Garde-fous : `visee.test.ts` + `visiteGuidee.test.ts`.

⚠️ **Tout écran qui reçoit un tour reçoit sa porte de sortie.** « Passer » marque le tour
vu **définitivement** ; le « ? » de rejeu n'existait que sur le Plan, donc passer le tour
d'un autre onglet le perdait à vie. Composant `TourButton` sur les cinq en-têtes, plus
« Revoir les tutos » dans le Profil (`resetAllTours`).

➡️ **Garde-fou : `lib/__tests__/visiteGuidee.test.ts`**, vérifié par 5 mutations. Il
vérifie surtout qu'**aucune étape ne vise une cible absente du code** — c'est le chemin
par lequel la dérive arrive vraiment. Plus : tours non vides, ids uniques, bornes de
rédaction, aucun émoji, aucun ton de reproche (§10), et la table `TOURS` d'accord avec
les écrans **dans les deux sens** (un tour déclaré mais jamais lancé, ou lancé sans être
déclaré, sont deux défauts distincts).
⚠️ Ce qu'il ne sait PAS faire, et c'est écrit dans le fichier : juger qu'une phrase est
VRAIE. Il ferme la porte au chemin mécanique, pas au mensonge.

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

### Le Profil ne porte que TOI et TON PLAN (2026-08-10)

Décision fondateur. L'écran empilait poids, série, cartes de sécurité, cibles, TDEE,
**11 lignes de menu**, **6 interrupteurs système**, **5 lignes de bas de page**,
déconnexion et suppression de compte — « Couleur d'accent » à trois doigts de
« Supprimer mon compte ».

**La règle de rangement, et elle se pose en une question** : *ce réglage change-t-il
ce que Kyroz me SERT ?* Si oui il reste sur le Profil (corps, sport, objectif, macros,
préférences, repas, banque, variété). Si non, il vit derrière la **roue dentée** —
`components/ReglagesSheet.tsx`, cinq groupes : Notifications · Affichage · Aide et
retours · Confidentialité · Compte.

⚠️ **CETTE RÈGLE A RESSERVI LE 2026-08-14, sur un réglage qu'on n'avait pas vu.**
« Rappel de pesée » (Jour / Sem. / 2 sem. / Mois) vivait DANS la feuille du suivi du
poids, entre une courbe et un historique. Il change quand Kyroz **PARLE**, pas ce
qu'il **SERT** : sa place est avec le rappel quotidien, sous Notifications.
🔴 **Le fondateur ne savait pas qu'il existait.** Un réglage rangé au mauvais endroit
n'est pas seulement mal rangé — il est **introuvable**, et on le recrée ailleurs ou on
s'en plaint sans savoir qu'on l'a déjà. ➡️ Devant un réglage, poser la question même
quand il n'est pas dans une liste de réglages.

🔴 **CE QUE PORTE L'ÉCRAN, DEPUIS LE 2026-08-14** (décisions fondateur, cf. AGENTS.md
E48) — l'ordre compte, il dit ce qui est important :
· la **série** est une pastille discrète dans l'EN-TÊTE, identique à celle du Plan
  (« 1 j / de série ») ; le « ? » du tuto lui a cédé sa place, et la porte de sortie
  du tutoriel vit désormais dans « Revoir les tutos », derrière la roue ;
· la **carte du poids** est le sujet de l'écran : chiffre en `Type.hero`, écart,
  courbe MESURÉE (jamais une largeur en dur — cf. §11, `useWindowDimensions`), et un
  bouton pleine largeur à l'accent ;
· entre les macros et le TDEE, **plus de paragraphe explicatif**. ⚠️ Ce qui a été
  troqué : l'explication du plancher de sécurité répondait à « pourquoi ma cible ne
  bouge plus quand je change mes réglages ? », et sans elle une cible bornée se lit
  comme un moteur en panne — c'est le motif de §6 le jour où elle a été écrite. Elle
  survit en entier dans **Méthodologie & sources**. Ne pas la remettre ici sans
  nouvelle décision : c'est cet écran-là que le fondateur voulait alléger.
🔴 **ET LE CHAÎNON DE 7 JOURS N'EXISTE PLUS NULLE PART** : retiré du Plan le
2026-08-05, du Profil le 2026-08-14. `components/StreakProgress.tsx` est supprimé —
toute mention ailleurs dans ces fichiers est **historique**. Le North Star reste
mesuré et le compteur reste affiché ; c'est sa visualisation qui part.
➡️ `chainProgress` et `streakMessage` survivent dans `lib/streak.ts`, testés : le jour
où le chaînon revient, il n'y a rien à réécrire.

- ℹ️ **Kyroz+ reste sur le Profil** : il débloque l'objectif daté et la banque de
  calories, tous deux juste au-dessus. Derrière une roue, il devient invisible le jour
  où il doit se vendre.
- ⚠️ **Le disclaimer §6 suit dans la feuille.** §6 impose « onboarding, **paramètres**,
  chaque plan » : la feuille EST les paramètres, donc la règle est tenue là — pas
  contournée en le retirant du Profil.

🔴 **DÉPLACER UN BLOC DANS UNE FEUILLE N'EST PAS UN DÉMÉNAGEMENT NEUTRE**, et les trois
pièges valent au-delà de cet écran :
1. **Une étape de visite guidée dont la cible n'est pas MONTÉE est écartée en silence.**
   Le tour se joue plus court en ayant l'air complet. Invariant désormais compté
   (`visiteGuidee.test.ts`) : *une cible vit dans l'écran qui LANCE son tour.*
2. **Une ROUTE poussée depuis une modale ouverte naît SOUS elle.** Fermer la feuille
   avant de naviguer (`versRoute`). Même famille que l'empilement de deux feuilles.
3. **Un hook déplacé dans un composant monté à la demande perd l'effet de bord attaché
   à son montage** — c'est E24 exactement. Se demander « qu'est-ce qui se PRODUISAIT au
   montage, et qui le déclenche maintenant ? », jamais « est-ce que ça s'affiche ? ».

**Le canal de retour** (`app/avis.tsx`, `lib/feedback.ts`) part par **e-mail pré-rempli**,
pas en base : une table aurait coûté les six surfaces de §3, dont deux relues par Apple.
⚠️ Ce qui est joint au message (version + plateforme) est **affiché mot pour mot** à
l'écran, **depuis la même fonction que ce qui part** — deux listes divergeraient, et la
première à mentir serait celle qu'on montre. Rien du corps ni des données de santé n'y
entre, et c'est une décision, pas un oubli.

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
| Commits | `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` + scope — **message en français** (§10) |

---

## 10. Style de travail attendu

> Les règles ci-dessous étaient **orales** jusqu'au 2026-07-30. Elles ne survivaient que
> dans la mémoire d'une seule session — une autre session, ou un autre outil, les ignorait
> et refaisait les mêmes erreurs. Elles sont écrites ici pour cette raison.

### Fond

- **Décisions tranchées** : pas de « ça dépend » sans proposition concrète.
- **North Star en tête** : % d'appareils atteignant **7 jours actifs dans leurs 14
  premiers**, un jour actif étant un jour où **au moins un repas a été cuisiné**.
  Si une implémentation ne le sert pas, le dire.
  ⚠️ **Définition changée le 2026-08-20** — elle disait « 7 jours consécutifs d'usage »,
  ce qui comptait de simples ouvertures et ne se calculait pas. La définition qui fait
  foi, sa recette de calcul et son seuil (non posé) vivent dans **`METRICS.md`**.
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
  jusqu'à **10,8 kg** d'écart (10 cas sur 16 avant correctif, 3 après — relevé du
  2026-08-07 ; la ligne annonçait 10,4 kg et 11 cas). Le principe était
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
  puis attend le résultat, pas une confirmation de plus. *(Le flux git lui-même est
  décrit dans la sous-section « Git » ci-dessous.)*
- **Rappeler la migration Supabase** quand un changement en demande une : le schéma n'est
  pas auto-appliqué, et une migration non jouée tue la synchro **en silence** (§3).
  ⚠️ **Mais MESURER avant d'annoncer un blocage — `npm run check:migrations`.** Le dépôt
  ne sait rien de la prod : un fichier dans `supabase/migrations/` prouve que quelqu'un a
  écrit du SQL, pas qu'il a été exécuté. Deux entrées d'AGENTS.md sont restées à
  « MIGRATION À JOUER » pendant des jours alors que les colonnes étaient en base, et une
  session l'a répété au fondateur comme un blocage réel. La commande prend deux secondes.
- **Mettre à jour `AGENTS.md`** en fin de session, dans la liste unique. Ne jamais laisser
  le doc diverger du code, et ne jamais créer une deuxième liste de tâches.

### Git — le flux attendu (2026-08-07)

> **Le fondateur n'est pas à l'aise avec git.** Donc : quand je lance une commande git
> non triviale, je dis **en une phrase** ce qu'elle fait et pourquoi, avant de la lancer.
> Pas de suite de commandes muettes qu'il devrait décoder après coup.

- **Le merge dans `main` passe par une pull request, jamais en local.**
  ⚠️ *Changement du 2026-08-07* — la règle écrite ici disait « branche → merge dans
  `main` → push ». Ce n'est plus le flux. Ce qui ne change pas : ne jamais committer sur
  `main` directement, ne jamais réécrire l'historique, et c'est toujours **l'arrivée sur
  `main` qui déploie** via GitHub Actions (§11) — la PR déplace la porte, pas la
  publication.
- **Avant de pousser** : `git fetch origin` puis `git merge origin/main`. Une branche qui
  n'a pas vu `main` depuis deux jours ouvre une PR pleine de conflits qui ne sont pas les
  siens.
- **Commits petits et cohérents**, message en **français**, format conventionnel
  (`feat:` / `fix:` / `docs:` / `chore:` + scope) — cf. §9. Un commit = une intention,
  pas un fourre-tout de fin de session.
- **Jamais sans demander** : `push --force`, `reset --hard`, suppression de branche. Ces
  trois-là détruisent du travail qui ne se récupère pas en cliquant.
- **Conflit = arrêt.** Je m'arrête, je montre le conflit, j'attends la réponse. Je ne
  choisis pas un côté à sa place.
- **Ne committer QUE son propre travail.** Un fichier que je n'ai pas produit ne se
  versionne pas : je le signale au fondateur, il décide. (Un `git add <dossier>` aveugle
  a déjà emporté des fichiers qui n'étaient pas les miens.)
- 🔴 **« RESTE-T-IL DES COMMITS EN RETARD ? » NE SE RÉPOND PAS EN COMPTANT DES
  COMMITS** (2026-08-15). `git rev-list origin/main..<branche>` a rendu une trentaine
  de branches « non fusionnées », et elles l'ont été montrées comme telles avant
  vérification. C'était faux : le dépôt fusionne en **squash**, donc les commits
  d'origine ne deviennent JAMAIS ancêtres de `main` — **toute branche déjà livrée
  paraît en retard, à vie**. Et le `git diff origin/main <branche>` qui l'accompagne
  mélange deux choses opposées : ce que la branche a en PLUS, et ce qui lui MANQUE.
  Des branches simplement périmées sortaient donc avec 17 000 lignes de différence,
  parfaitement alarmantes et vides de sens.
  ➡️ **La réponse est dans les PR** : `gh pr list --state all`. Si `OPEN = 0` et que
  chaque branche en avance correspond à une PR `MERGED`, rien n'est en retard. Il ne
  reste à examiner une par une que **les PR fermées SANS merge** et **les branches
  sans aucune PR** — et là seulement, `git diff` depuis leur `merge-base`.
  ⚠️ Avant de supprimer des branches : protéger `main` **et toute branche verrouillée
  par un worktree** (`git worktree list --porcelain | grep '^branch'`), écrire un filet
  `sha nom` **hors du dépôt** (un fichier non versionné qui y reste est le pire des
  trois états, §10), et vérifier la config Pages avant de toucher à `gh-pages`
  (`gh api repos/:owner/:repo/pages`).
  ℹ️ `%(refname:short)` rend `refs/remotes/origin/HEAD` sous la forme **`origin`** :
  ça ressemble à une branche fantôme, ce n'est que le pointeur. Ne pas le supprimer.
- **Plusieurs sessions en parallèle → worktree.** Deux sessions dans le même dépôt se
  marchent dessus ; s'isoler dans un worktree, et le nettoyer en fin de chantier.
  **Quand la session tourne dans un worktree isolé, le dossier principal et `main` sont
  hors de portée — c'est voulu, ne pas chercher à contourner.** (Et attention au piège du
  preview qui sert l'app du dépôt PRINCIPAL, §11.)

---

## 11. Pièges connus (redécouverts au moins une fois chacun)

- 🔴 **Depuis un worktree, le serveur de preview sert l'app du dépôt PRINCIPAL.**
  `node_modules` y est un lien symbolique vers le dépôt principal ; expo-router résout
  la racine de l'app à travers lui. Mesuré le 2026-08-05 : après avoir migré 333 styles,
  le navigateur affichait encore, **au pixel près, la version d'avant** — logo en 900,
  tailles en 12. ⚠️ **Le piège n'est pas l'écran cassé, c'est l'écran PLAUSIBLE** :
  rien ne signale l'erreur, et la conclusion naturelle est « ma migration n'a pas pris »,
  donc on part corriger du code sain. Deux indices : `--clear` ne change rien (ce n'est
  pas le cache), et le rendu correspond **exactement** à `git show HEAD:<fichier>`.
  ➡️ Lancer avec `EXPO_ROUTER_APP_ROOT=$PWD/app` depuis `kyroz-app`.
  *Même famille que « mesurer l'instrument » : la mesure était juste, sur le mauvais code.*
  🔴 **ET AVANT MÊME CE PIÈGE-LÀ, LE PREVIEW NE DÉMARRE PAS : UN WORKTREE N'A PAS DE
  `.env.local`** (2026-08-10). Le fichier est gitignoré, donc il ne suit pas l'arbre —
  et `lib/supabase.ts` construit son client **au chargement du module**, ce qui jette
  sans URL. Symptôme : **écran noir**, un 500 au rendu serveur, et dans les logs
  `Metro error: supabaseUrl is required`. Rien n'accuse le fichier manquant, et l'écran
  noir se lit comme « mon code est cassé » — on part corriger du code sain, exactement
  comme pour le piège du dépôt principal juste au-dessus.
  ➡️ **Poser un `.env.local` dans le worktree.** Des valeurs FACTICES suffisent dès que
  ce qu'on vérifie est calculé en local (le moteur l'est entièrement) : il n'y a besoin
  d'aucune vraie clé pour regarder une carte d'objectif. L'auth ne marchera pas contre
  une URL factice — c'est le prix, et il faut le savoir avant de conclure que
  l'inscription est cassée.
  ⚠️ **Et la session n'est PAS déverrouillée par `@kyroz:profile`** : `app/index.tsx` et
  `app/(tabs)/_layout.tsx` gardent sur la **session Supabase**, pas sur le profil. Il
  faut donc aussi poser `sb-<ref>-auth-token` (le `<ref>` vient du nom d'hôte de l'URL
  factice, cf. `AUTH_STORAGE_KEY`) ; `readPersistedSession` n'exige que `access_token`
  et `user`, donc un objet minimal passe sans réseau.
  ⚠️ **Vérifier QUEL code est servi avant de juger l'écran**, et le faire sur l'artefact :
  `curl` le bundle et compter un témoin **ASCII pur** de la branche (un identifiant, pas
  une phrase accentuée — cf. §11 « `strings` ne rend que l'ASCII »). Mesuré le
  2026-08-10 : `deficit_weeks` **8**, `highAdiposity` **9**, et **0** occurrence d'un
  libellé que la branche RETIRE. C'est ce contraste — un témoin présent ET un témoin
  absent — qui prouve la branche ; un seul des deux ne prouve rien.
  🔴 **ET CE QUE LIT `preview_start` DÉPEND DE COMMENT ON EST ENTRÉ DANS LE WORKTREE**
  — tranché le 2026-08-08 après avoir vécu les deux cas dans la même session, ce qui
  explique deux notes du dépôt qui se contredisaient :
  | entrée dans le worktree | `launch.json` lu | écrire dans celui du principal |
  |---|---|---|
  | la session **démarre dedans** (répertoire de travail donné au lancement) | celui **du worktree** | — |
  | **entrée en cours de session** (isolation stricte) | celui du **PRINCIPAL**, où il résout aussi le `cwd` | **refusé par l'outillage** |
  ➡️ Dans le second cas la vérification à l'écran est **impossible depuis le worktree** :
  le serveur sert le code du principal (donc la branche d'une autre session), et
  l'isolation interdit d'ajouter une entrée là-bas — à raison, c'est sa copie de travail.
  Trois issues : le **site déployé** une fois la PR mergée · le lancement à la main
  ci-dessus · **sortir la décision en fonction PURE et la tester**, ce qui vaut mieux que
  rien mais ne remplace pas de voir le câblage.
  ⚠️ Et **le DIRE** — dans la PR et dans la fiche : « non vérifié à l'écran, voici
  pourquoi, voici le contournement ». Une vérification manquante ANNONCÉE vaut mille
  fois une vérification supposée.
- 🔴 **APRÈS UN MERGE, VÉRIFIER OÙ EST L'ARBRE AVANT DE MONTRER QUOI QUE CE SOIT**
  (2026-08-14). Après avoir mergé deux PR, ce worktree s'est retrouvé sur une
  **vieille branche** — 6 commits de retard — au moment précis où le fondateur allait
  relire les modifications. Rien n'était perdu (aucun travail non commité, tout le
  contenu bien sur `main`), mais l'arbre **affichait du code périmé**, et il l'aurait
  relu en croyant regarder ce qui venait d'être livré.
  ⚠️ **`git status` NE LE DIT PAS** : l'arbre était parfaitement propre. C'est la
  même famille que le preview qui sert l'app du dépôt principal — *le piège n'est pas
  l'écran cassé, c'est l'écran PLAUSIBLE*.
  ⚠️ La cause n'est pas établie : `gh pr merge --squash` a été employé **sans**
  `--delete-branch` (la variante déjà consignée). Ne pas conclure à la même cause.
  ➡️ Deux secondes, deux commandes : `git log --oneline -1` et
  `git diff --stat origin/main HEAD` (vide = on regarde bien ce qui est livré).
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
- 🔴 **ET SUR IOS, UNE MODALE NE S'OUVRE PAS PAR-DESSUS SA VOISINE.** C'est
  la moitié NATIVE du piège ci-dessus, et elle est pire — corrigée le 2026-08-14
  après un build simulateur. Une seconde `Modal` demandée pendant qu'une autre est
  présentée n'apparaît pas : rien à l'écran, aucune erreur, aucune trace. Le code
  s'exécute, la promesse attend un arbitrage que personne ne peut rendre.
  **SEPT gestes en sont morts**, dont **« Supprimer mon compte »** — obligation RGPD
  et point de revue App Store — plus le crayon de la fiche recette, deux
  suppressions de ligne, le choix d'une photo de progression, et **« Me peser »**
  depuis l'éditeur Informations (trouvé le même jour, en allant vérifier les six
  autres au simulateur).
  🔴 **LE CRITÈRE EST *OÙ LA `Modal` EST DÉCLARÉE*, PAS « UNE MODALE EST-ELLE
  OUVERTE » — et la première rédaction de cette règle était trop large** (amendée le
  2026-08-14, mesuré) :
  · déclarée **À CÔTÉ** de la première — deux `<Sheet>` frères au niveau de l'écran,
    ou la `Modal` d'un fournisseur monté à la racine — les deux demandent à être
    présentées par le **même** contrôleur, la seconde est refusée → **geste mort** ;
  · déclarée **À L'INTÉRIEUR** de la première — le `<Sheet>` de la roulette de date
    vit dans les enfants de la feuille d'édition — elle est présentée par le
    contrôleur de cette feuille-là, **en chaîne** → **ça marche**, vérifié sur
    capture (elle s'ouvre, puis rend la main à l'éditeur).
  ⚠️ L'ancienne formulation ne casse rien (elle interdit plus que nécessaire), mais
  elle ferait « corriger » du code sain et rendrait `ConfirmationEnLigne` obligatoire
  là où il ne l'est pas. *Une prémisse écrite en corrigeant cinq cas n'a été mesurée
  que sur ces cinq-là.*
  🔴 **ÉCRIRE LES SETTERS DANS LE BON ORDRE NE FERME PAS CETTE PORTE.** C'est
  l'illusion qui a produit le septième geste : `setEditor(null); setWeighIn(true);`
  était commenté « on ferme l'éditeur AVANT d'ouvrir la pesée », et c'était sincère —
  mais les deux setters partent dans le **même lot d'état**, et la feuille garde sa
  `Modal` montée le temps de sa sortie. Seul le démontage RÉEL ferme la porte
  (`Sheet.onClosed`). ➡️ Compté par `feuillesEmpilees.test.ts` : fermer un état de
  feuille puis en OUVRIR un autre dans le même corps de fonction est interdit — les
  fermetures en série, elles, restent légitimes.
  ⚠️ **LE WEB NE MONTRE RIEN DE CE DÉFAUT** : `react-native-web` rend une `Modal` en
  `<div>` et empile sans se plaindre. Mesuré sur le code d'avant correctif, le
  crayon ouvrait parfaitement l'éditeur dans le panneau navigateur. **C'est ce
  contraste — sain sur le web, mort en natif — qui a désigné la cause** ; sans lui,
  le diagnostic évident était « le composant est cassé ».
  ⚠️ **Fermer la première d'abord NE SUFFIT PAS** : `Sheet` et `ActionSheet` gardent
  leur `Modal` MONTÉE le temps de leur animation de sortie. Enchaîner les deux dans
  le même lot d'état donne exactement la même panne. D'où **`Sheet.onClosed`**,
  appelé quand la feuille est réellement démontée — jamais un délai deviné.
  ➡️ **Les deux issues, et le choix se fait sur le SENS :**
  · la seconde surface REMPLACE la première → même feuille, contenu qui change
    (fiche recette ⇄ son éditeur) ;
  · la question porte sur UNE ligne de la feuille → elle se pose SUR cette ligne,
    `components/ConfirmationEnLigne.tsx`, deux boutons et pas de modale.
  · la feuille n'a rien à DEMANDER, seulement à annoncer → `components/MessageEnLigne.tsx`,
    posé sous le réglage qui vient d'échouer. ⚠️ **Il se ferme** : un `notify` a son
    « OK » ; en ligne, un message qui ne part jamais devient un morceau d'écran, et
    le réglage d'à côté se lit comme s'il était en panne.
  ⚠️ `useDialog()` reste le bon outil **depuis un écran plein** : la boîte se pose
  au-dessus de tout et se rate difficilement, ce qu'on veut pour un geste
  irréversible. L'interdit ne vaut que DEPUIS une feuille.
  ➡️ Garde-fou : `lib/__tests__/feuillesEmpilees.test.ts` — il compte les
  composants qui vivent dans une feuille ET ouvrent un dialogue, et sa liste ne
  peut que rétrécir. Il a lui-même désigné un sixième cas que personne n'avait
  signalé (le choix appareil/galerie) : **un compteur trouve ce qu'une revue ne
  voit pas.**
  🔴 **CE DÉFAUT A VÉCU NEUF JOURS AVEC SON ANGLE MORT ÉCRIT NOIR SUR BLANC** —
  AGENTS.md E11 finissait par « Non re-testé sur iOS ». La note était juste, elle
  était lisible, et personne n'est allé voir. *Une inconnue consignée n'est pas une
  inconnue traitée* : ce qui n'a pas été mesuré doit être porté au chantier, pas
  seulement au commentaire.
- 🔴 **UNE DONNÉE D'UTILISATEUR NE SE RANGE PAS DANS UN CACHE QUE QUELQU'UN D'AUTRE
  EFFACE.** Trouvé le 2026-08-08 en rendant les articles de la liste de courses
  supprimables. Le réflexe était de marquer l'article dans `@kyroz:shopping` — sauf
  que **`plan.tsx` efface cette clé à CHAQUE `persistPlan`** : marquer un repas
  cuisiné, déclarer un écart, changer une recette. La suppression aurait donc tenu
  quelques minutes, puis l'article serait revenu **sans qu'aucune action de
  l'utilisateur ne l'explique**.
  ⚠️ **Le pire des défauts, parce qu'il passe la recette** : ça marche au moment du
  geste, ça marche en test, et ça se défait plus tard chez l'utilisateur. Un bug qui
  ne se reproduit jamais chez soi.
  ➡️ **Avant de persister quoi que ce soit, chercher QUI EFFACE la clé visée**
  (`grep -rn "removeItem(.*CLE" app/ lib/`). Un cache est la propriété de qui
  l'invalide, pas de qui l'écrit. Une intention d'utilisateur va dans une clé qui lui
  est propre — `lib/shoppingRemoved.ts` en est l'exemple.
  ⚠️ Corollaire : **une liste DÉRIVÉE ne se corrige pas dans son rendu.** La liste de
  courses vaut « plan moins garde-manger » ; en retirer une ligne ne veut rien dire
  tant que le calcul, lui, la reproduit. Il faut soit changer l'entrée, soit poser un
  filtre PERSISTANT au-dessus — et alors ce filtre doit se nettoyer, sinon il mord un
  jour sur une donnée que personne ne lui a désignée.
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
  déjà pour le thème et l'accent ; l'hydratation, le prénom et l'heure du rappel l'ont
  rejoint. ⚠️ Une valeur oubliée dans ce chargement repart sur son défaut à chaque
  démarrage, et ça ne se voit nulle part.
  🔴 **ET LA RÈGLE NE S'EST PAS APPLIQUÉE TOUTE SEULE À SES VOISINS — quatrième
  cas, le 2026-08-14.** `useWeightLog` gardait ses pesées dans un `useState` de hook,
  avec TROIS instances (Profil, Plan, `WeightCheckin`). Enregistrer une pesée dans la
  feuille affichait la courbe DEDANS pendant que la carte du Profil, derrière,
  continuait d'annoncer « encore une pesée et ta courbe apparaît ici ».
  ⚠️ **Il ne se voyait que sur un BACKFILL** : une pesée du JOUR modifie
  `profile.weight_kg`, donc l'effet du hook se redéclenchait par la bande et tout
  paraissait sain. Une pesée d'un jour passé ne touche pas le profil, à dessein —
  et là plus rien ne rafraîchissait rien. Encore un défaut dormant que le chemin
  courant masquait. ➡️ Compté depuis par `lib/__tests__/diffusion.test.ts`.

  🔴 **ET CE N'EST PAS QUE LA VALEUR — UN EFFET DE BORD ACCROCHÉ À UN ÉCRAN TOMBE
  PAREIL, EN PIRE** (2026-08-09, E24, signalé par le fondateur : « la notification de
  ce midi n'était pas celle qu'on avait changée »). Le contenu d'une notification
  `DAILY` est figé à la PROGRAMMATION ; le seul chemin qui le renouvelle est le
  ré-armement, et il ne vivait que dans l'effet de montage de `useReminder` — hook
  monté par le SEUL onglet Profil. Qui ouvre l'app sur le Plan recevait donc pendant
  des mois le texte programmé la dernière fois qu'il était entré dans ses réglages,
  **y compris après une mise à jour OTA parfaitement installée**.
  ⚠️ La différence de gravité tient à ceci : une valeur non diffusée **se voit à
  l'écran** dès qu'on regarde le bon écran ; un ré-armement qui n'a pas lieu ne se voit
  **nulle part** — ni en preview (les notifs locales n'existent pas sur le web), ni
  dans une capture, ni dans un diff. Le fichier affirmait même le contraire en
  commentaire (« `useReminder` ré-arme à chaque démarrage ») ; un `grep` sur les
  appelants le démentait.
  ➡️ **Devant tout effet de bord qui doit se produire « au démarrage », vérifier QUI le
  déclenche — pas ce que dit le commentaire.** Le contre-exemple vivait à côté :
  `applyWeighInReminder` part de `useWeightLog`, monté par l'écran Plan, donc il n'a
  jamais eu le défaut.
  🔴 **ET LE CONTRE-EXEMPLE EN ÉTAIT UN AUTRE, PIRE — corrigé le 2026-08-11 (E38).**
  `applyWeighInReminder` partait bien à chaque démarrage, mais c'est justement de là
  que venait son défaut : son déclencheur était une notification `DATE`, **qui ne se
  rejoue pas**. Le seul chemin qui programmait la suivante était donc « ouvrir l'app ».
  Qui décroche recevait UNE notification de pesée, puis plus jamais — le rappel
  s'éteignait exactement au moment où il sert. ➡️ Déclencheurs répétitifs (`DAILY`,
  `WEEKLY`) ou série datée d'avance, décidés par `weight.ts::weighInSchedule`, qui est
  PUR donc testé. ⚠️ Le raisonnement était écrit **douze lignes plus haut dans le même
  fichier**, pour le rappel quotidien (« un rappel qui lâche vaut moins qu'un message
  qui se répète ») : *un principe écrit en corrigeant UN cas ne s'applique pas tout seul
  à son voisin, même quand le voisin est dans le même écran de code.*
- 🔴 **`getLastNotificationResponseAsync` REND LA DERNIÈRE RÉPONSE, PAS UNE RÉPONSE
  NOUVELLE — et elle survit au redémarrage** (2026-08-11, E38). Il faut les deux chemins
  pour lire un tap sur notification : l'écouteur
  (`addNotificationResponseReceivedListener`) rate celui qui a **lancé** l'app, puisqu'il
  n'existait pas encore. Mais brancher le second sans mémoire fait rouvrir l'écran visé
  **à chaque lancement suivant, pour toujours** — un écran qui s'ouvre sans qu'aucun
  geste ne l'explique, c'est-à-dire un défaut qui passe la recette et se manifeste des
  jours plus tard. ➡️ Retenir la réponse déjà servie (`@kyroz:lastNotifTap`). ⚠️ Et
  l'identifiant NE SUFFIT PAS comme marque : il est fixe par construction
  (`kyroz-daily-reminder`), donc le tap de demain porterait la même — c'est le couple
  **identifiant + heure de LIVRAISON** qui distingue deux taps.
  ⚠️ **Une notification transporte sa charge utile dans le temps** : celle programmée
  hier sera lue par le code d'aujourd'hui. Tout marqueur qu'on y met doit donc avoir un
  REPLI explicite pour les notifications d'avant, sinon on livre la panne qu'on corrige
  à tout le parc existant.
  ℹ️ Deux inquiétudes voisines ont été MESURÉES et sont sans objet : sans champ `sound`,
  iOS pose `.default` (donc les rappels ne sont pas muets), et le canal Android de repli
  d'expo est déjà `IMPORTANCE_HIGH` avec vibration. Des canaux nommés seraient un confort
  (couper la pesée sans couper le rappel), pas un correctif.
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
- 🔴 **UN TEST VERT EN LOCAL NE DIT RIEN DE SA MARGE — le runner CI est ~3× plus lent.**
  Mesuré le 2026-08-06 sur `varieteFamille` → « le PREMIER plan servi n'est pas le moins
  varié » : **2 021 ms en local, 6 561 ms en CI**. Sur un Mac il consommait 40 % du délai
  de 5 s et paraissait sain ; sur le runner il était à **131 %**, et `main` est resté
  **rouge sur quatre commits d'affilée**. ➡️ Tout test au-delà de ~1,5 s en local est
  déjà à risque, et aucun `npm test` ne le dira. Le délai est désormais un choix explicite
  (`vitest.config.ts`, `testTimeout: 30_000`), plus la valeur par défaut de l'outil que
  personne n'avait retenue pour une suite qui simule des centaines de semaines de plans.
  ⚠️ **Et avant de relever un délai, MESURER LE PRODUIT, pas le test** : la durée du test
  avait triplé, j'en ai conclu que le moteur avait ralenti — c'était FAUX. Coût d'un plan
  réellement servi : **14,7 → 14,6 ms** (6 gabarits × 5 tirages), la contrainte « < 1 s »
  du §4 garde trois ordres de grandeur. Relever un plafond est exactement le geste qui
  masquerait une vraie régression ; c'est aussi celui qui fait accuser à tort le travail
  d'une autre session.
- ⚠️ **Un `git push` ne crée pas TOUJOURS un run** — et l'absence de run ressemble à un
  déploiement qui n'a jamais fini. Pendant l'incident Actions du 2026-08-06 (8 h),
  GitHub a bridé les webhooks à **15 %** : plusieurs pushes sur `main` n'ont déclenché
  **aucun** workflow, sans le moindre message. Le déclenchement manuel, lui, passe par
  l'API et pas par un webhook : **`gh workflow run deploy.yml --ref main`** — il a rendu
  un run vert dans la minute là où trois pushes n'avaient rien produit. ➡️ Avant de
  chercher une cause dans le dépôt, vérifier qu'un run EXISTE
  (`gh api "…/actions/runs?head_sha=<sha>" --jq .total_count`) et lire
  **githubstatus.com**. Corollaire : republier pour « réveiller » le déploiement ne sert
  à rien et empile des runs qui échoueront ensemble.
- 🔴 **UN BANDEAU DE 2,4 s NE SE CAPTURE PAS À LA MAIN** (2026-08-14). Le temps de
  lancer la prise, le toast est déjà parti, et l'écran rendu est parfaitement
  plausible. J'en ai conclu qu'il ne s'affichait pas du tout, et j'ai failli l'écrire.
  ⚠️ **LA CAUSE ÉCRITE ICI ÉTAIT FAUSSE, RE-MESURÉE LE 2026-08-15** : elle accusait
  la lenteur de `xcrun simctl io screenshot`. **Cet outil est rapide** — 14 captures
  d'affilée ont tenu dans **~3 secondes** sur la même machine, soit ~0,2 s pièce
  (constaté en capturant un tutoriel qui changeait d'étape toutes les 6 s : les 14
  captures sont tombées dans la MÊME étape, ce qui a d'abord fait croire à un tour
  bloqué). Le délai est ailleurs — l'aller-retour de la session, pas la commande.
  ➡️ Le conseil ci-dessous ne change pas d'un mot ; **l'outil, lui, est disculpé.**
  Une note d'instrument nomme souvent le mauvais coupable : ce qui compte, c'est
  qu'on ne peut pas viser un événement plus court que sa propre boucle de décision.
  ➡️ **L'absence sur une capture ne prouve rien quand ce qu'on cherche dure moins
  longtemps que la capture.** Sonder d'abord que le code s'exécute (`console.log`),
  puis ALLONGER la durée le temps de la mesure — c'est seulement là qu'un avant/après
  devient possible. Même famille que `requestAnimationFrame` qui ne tourne pas dans
  le panneau navigateur (plus bas) : la mesure était juste, l'instrument non.
- 🔴 **CE QUI FLOTTE EN BAS D'UN ÉCRAN D'ONGLET DOIT DÉGAGER `Fond.barreOnglets`.**
  La barre d'onglets flotte au-dessus du contenu depuis la passe matériaux (§8) : un
  `position: absolute` à `bottom: 28` est dessiné DERRIÈRE elle, lisible seulement
  comme une tache floue à travers le verre. Les deux bandeaux « cuisiné » (Frigo et
  Plan) étaient dans ce cas — même style recopié, même faute, jamais vue. ➡️ Compté
  par `lib/__tests__/cuisinerDepuisLeFrigo.test.ts`.
- **Build natif iOS** : `npx expo run:ios` (CocoaPods via brew).
  🔴 **AVEC `LANG=en_US.UTF-8`, SINON `pod install` PLANTE — et l'erreur accuse le
  mauvais fichier** (2026-08-14). Le shell des sessions tourne avec `LANG=""` et
  `LC_CTYPE="C"` ; CocoaPods appelle `unicode_normalize` sur son chemin
  d'installation et lève `Encoding::CompatibilityError: Unicode Normalization not
  appropriate for ASCII-8BIT`. Le build s'arrête ensuite sur **« The sandbox is not
  in sync with the Podfile.lock »**, qui envoie chercher un problème de
  dépendances alors que la vraie cause est vingt lignes plus haut, dans une trace
  Ruby que personne ne lit. ➡️ `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`,
  puis relancer.
  ⚠️ **`expo run:ios` NE REND JAMAIS LA MAIN** : après avoir installé et lancé
  l'app, il reste vivant comme serveur Metro. Une commande lancée en tâche de fond
  et lue par son code de sortie a donc l'air de « prendre très longtemps » alors
  que le build est fini depuis quarante minutes. ➡️ Vérifier l'ARTEFACT
  (`xcrun simctl listapps <udid> | grep <bundleId>`), pas la fin du processus.
  ⚠️ Le clavier du simulateur est en **AZERTY** : ce qu'on « tape » par
  automatisation arrive permuté (« Marc » → « ?qrc »). Sans conséquence sur un
  champ cosmétique, faux dès qu'on vérifie une saisie.
- 🔴 **UN DÉPLOIEMENT VERT NE DIT RIEN DE CE QUE VOIT UN NAVIGATEUR** (2026-08-18).
  `deploy.yml` construit et téléverse un ARTEFACT ; il ne **visite** pas la page. Le
  jour où un domaine personnalisé a été posé sur le Pages de l'app, la racine servie
  est passée de `/Kyroz-app/` à `/` pendant que `app.json` déclarait toujours
  `baseUrl: "/Kyroz-app"` : **404 sur le bundle, splash et spinner à l'infini**,
  pendant des heures, avec bon commit, run vert et bonne surface.
  ➡️ **Le dernier contrôle est une REQUÊTE, pas un run** : `curl -sSI <url>` (une 301
  inattendue trahit un domaine posé ailleurs) puis la console du navigateur — une 404
  sur `_expo/static/…` est le symptôme exact.
  ⚠️ **`baseUrl` et l'hébergement sont INSÉPARABLES**, et la faute s'inverse selon le
  côté : servi sous `…github.io/Kyroz-app/` il vaut `/Kyroz-app`, servi à la racine
  d'un domaine il doit être **vide**. Les deux moitiés bougent dans le même commit ;
  le couplage est compté par `lib/__tests__/deploiementWeb.test.ts` (`PREFIXE_SERVI`).
  ⚠️ **Un domaine personnalisé s'applique à un SITE, jamais à un fichier** : il
  emporte `confirme.html`, dont l'URL est codée en dur (`lib/emailConfirmation.ts`),
  gravée dans les binaires distribués et en liste blanche Supabase.
  ⚠️ **Et changer d'origine déconnecte tous les utilisateurs web** — `localStorage`
  est cloisonné par origine, mesuré à **0 clé** sur la nouvelle. Les comptes vivent
  chez Supabase, mais le symptôme ressemble à « il a perdu mon compte ».
  ➡️ Et la leçon qui dépasse le web : **« option écartée » décrit une INTENTION**, le
  dépôt documentait la décision de NE PAS poser ce domaine, écrite sans vérifier
  qu'il l'était déjà.
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
