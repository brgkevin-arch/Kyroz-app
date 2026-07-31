# CLAUDE.md — Kyroz · Spec technique stable (Claude Code)

> Lu automatiquement à chaque session. Contexte = spec STABLE du projet.
> L'état d'avancement (ce qui est fait / reste) vit dans **AGENTS.md**, pas ici.
> Ne pas dupliquer l'avancement ici. Amender, ne pas supprimer de section.

---

## Rappel projet (1 ligne)

App mobile React Native (Expo Router, SDK 56) de plans repas macro-précis pour **hommes ET femmes de 18 à 50 ans** pratiquant du sport. *(Élargi le 2026-07-30 — la cible déclarée était « hommes 18–35 », ce qui ne correspondait plus au produit : les garde-fous féminins — plancher d'énergie disponible, escalade de zone basse — et la borne protéine 0,5 existent précisément pour servir les gabarits légers.)* **Phase 2 — core loop en place + déployé en web (GitHub Pages), itérations UX/qualité en cours.**

---

## 1. Modèle économique

**Freemium large.** Le core loop (génération de plan, plan, courses, recettes) est gratuit et fonctionne sans aucune clé API. La monétisation vient de features avancées, pas du blocage du cœur. **Valeur premium (Kyroz+) tranchée + construite (2026-07-27)** : *« piloter son objectif dans le temps »* — objectif daté (trajectoire calorique vers un poids à une date), suivi de transformation (zone/photos), et à venir la banque de calories. **Paiement = achat in-app Apple/Google via RevenueCat (pas Stripe seul, refusé par les stores) + gating `is_premium` = à câbler** (features gratuites tant que ce n'est pas fait). Détail : `MONETISATION.md` + AGENTS.md.

---

## 2. Stack technique

| Couche | Choix | État |
|---|---|---|
| Mobile | **React Native (Expo Router, SDK 56)**, TypeScript strict | En place |
| Génération repas | **Moteur LOCAL** (\`lib/planEngine.ts\`) — macro-précis, 0 clé API, **seul chemin** | Moteur unique |
| Persistance locale | AsyncStorage (clés \`@kyroz:*\`) | En place |
| Backend / Auth | **Supabase** (région EU) — création de compte email + suppression de compte (RGPD) | Auth OK |
| Base nutritionnelle | **Ciqual (ANSES) + table maison** — voir la note ci-dessous | En place |
| Analytics | PostHog (cloud EU) | **Câblé (dormant)** — `lib/analytics.ts`, consent-gated RGPD ; s'active en posant `EXPO_PUBLIC_POSTHOG_KEY` |

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

> **Base nutritionnelle — corrigé le 2026-07-30.** Cette ligne annonçait « Ciqual primaire
> + **Open Food Facts** secondaire », en statut « Cible ». Open Food Facts **n'a jamais été
> branché** : zéro ligne de code, zéro appel. La réalité, mesurée : sur **123 ingrédients**
> de recette, **107 sont sourcés Ciqual** (`lib/recipeFoodMap.ts::REF_FOOD_ID` → base ANSES
> convertie dans `lib/foods.generated.ts`) et **16 sont saisis à la main** dans
> `Recette/recettes-kyroz.json > ingredients_reference` — ceux que Ciqual ne couvre pas
> proprement : `whey`, `skyr`, `yaourt_grec`, `cottage_cheese`, `proteine_vegetale`,
> `soja_texture`, `yaourt_soja`, `yaourt_soja_proteine`, `levure_maltee`, `edamame`,
> `haricots_noirs`, `millet`, `wrap_sans_gluten`, et trois mélanges (`legumes_wok`,
> `ratatouille`, `fruits_rouges`).
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

\`\`\`
profiles                        ← s'appelle « profiles », PAS « user_profiles »
  └── id (= auth.users.id) + 35 colonnes synchronisées.
      ⚠️ NE PAS recopier la liste ici : elle a divergé deux fois.
      Source unique = `PROFILE_COLS` (lib/sync.ts), VERROUILLÉE contre le SQL
      par `lib/__tests__/profileCols.test.ts` — une colonne ajoutée en migration
      sans être ajoutée au code fait rougir un test.
      Les groupes : corps (sex, age, weight_kg, height_cm, body_fat_pct,
      activity_level, training_days_per_week, neat_level, low_ea_weeks, sports) ·
      objectif (goal, goal_target, engine_rev, engine_notice) ·
      macros (macro_mode, carb_ratio, protein_per_kg, tdee_kcal, target_*) ·
      plan (plan_days, plan_weekdays, rest_weekdays, meals, meal_emphasis,
      variety, fixed_meals, max_prep_time_min, weigh_in_frequency) ·
      goûts (dietary_restrictions, disliked_foods, preferred_proteins,
      hidden_recipes — « j'aime pas » 👎, masquées, SOUPLE/réversible).
      LOCAL-ONLY volontaire : `is_post_menopausal` (l'onboarding ne pose pas
      la question → inerte tant qu'elle n'est pas posée).

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
\`\`\`

### Ce qui n'est PAS en base — et pourquoi

| Donnée | Où elle vit | Pourquoi pas en base |
|---|---|---|
| **Le compte** (id, e-mail) | `auth.users`, schéma géré par Supabase | on ne double pas la table d'auth ; `profiles.id` la référence |
| **Le plan de la semaine** | AsyncStorage `@kyroz:plan` | **déterministe** : re-dérivable du profil + du catalogue. `meal_plans` a été supprimée le 2026-06-14 pour cette raison |
| **Les repas du plan** | dans l'objet plan ci-dessus | idem — jamais eu de table `meals` |
| **La liste de courses** | recalculée à la volée depuis le plan moins le garde-manger | idem — jamais eu de table `shopping_lists` |
| **Le catalogue de recettes** | `Recette/recettes-kyroz.json` → `lib/recipeMap.ts`, embarqué dans le bundle | il est le même pour tout le monde ; le servir depuis le réseau ajouterait une latence pour zéro bénéfice. Les fibres sont calculées à la volée (`lib/fiber.ts`), sourcées Ciqual par `ref`/`food_id`, jamais stockées |
| **Les photos de progression** | AsyncStorage, l'appareil uniquement | donnée de santé sensible (RGPD) — décision explicite, cf. §7 |

> **Persistance** : AsyncStorage local (source de travail, offline-first) **+ miroir
> Supabase câblé** (sync best-effort par utilisateur, RLS stricte — voir `lib/sync.ts`).
> Exceptions volontaires : le **plan** n'est pas synchronisé (déterministe depuis le
> profil) ; les **photos de progression** restent LOCAL-ONLY (RGPD — donnée sensible).

---

## 4. Core Loop (le cœur — priorité absolue)

\`\`\`
INPUT          → Profil (sexe, âge, poids, taille, objectif, contraintes, repas)
TRANSFORMATION → Génération auto plan repas 7 jours macro-précis (moteur local)
OUTPUT         → Plan + liste de courses + recettes
\`\`\`

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

- **BMR** : Katch-McArdle si le %MG est connu, sinon Mifflin-St Jeor.
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

Toute correction qui déplace les cibles doit incrémenter `ENGINE_REV` : un
avertissement one-shot (`engine_notice`) explique alors le changement à
l'utilisateur au-delà de 100 kcal/jour d'écart.

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
- **Lipides sous le seuil de carence** — `lib/tdee.ts::fatTargetG`, plancher à
  0,8 g/kg de **poids de corps** (`FAT_MIN_PER_KG_BW`). Borné par le budget du
  jour, donc un plan reste toujours faisable.
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

### Disclaimer obligatoire (UI)
> *"Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent pas l'avis d'un médecin ou diététicien-nutritionniste."*

Afficher : onboarding J1, paramètres, chaque plan généré.

### Validation contenu

🚫 **La validation par une diététicienne est ÉCARTÉE (décision fondateur, 2026-07-29).**
Ce n'est pas un retard à rattraper, c'est un choix. **Ne plus la remonter** comme
prérequis, ni dans un bilan, ni dans une recommandation de chantier.

Ce que la décision ne fait PAS disparaître, et qui reste vrai :
- \`validated_by_dietitian\` reste \`false\` en dur (\`lib/recipeMap.ts\`) → **aucun écran
  ne doit prétendre le contraire**, et la revue App Store est sévère sur les
  allégations santé. Le disclaimer ci-dessus est donc d'autant plus obligatoire.
- Les coefficients protéiques de \`GOAL_CONFIG\` se déclarent « PROVISOIRES » dans le
  code en attendant un tiers qui ne viendra pas → soit retirer la mention, soit
  l'assumer explicitement, mais ne pas laisser le code annoncer une attente vide.

Historique : ces deux lignes exigeaient « prompts revus par diététicienne diplômée
avant prod » et « \`validated_by_dietitian\` à passer à \`true\` après validation ».

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

## 8. Thème UI

- \`constants/theme.ts\` : adaptatif clair/sombre (suit le système)
- Accent **monochrome** (blanc en sombre / encre en clair), noir pur \`#000000\` en sombre
- Tout passe par \`useTheme()\` + \`makeStyles(t)\` — **aucune couleur en dur**

---

## 9. Nommage et conventions

| Type | Convention |
|---|---|
| Composants React Native | PascalCase (\`MealCard.tsx\`) |
| Fonctions utilitaires | camelCase (\`calculateTDEE.ts\`) |
| Constantes | SCREAMING_SNAKE (\`MAX_KCAL_PER_DAY\`) |
| Tables Supabase | snake_case (\`weight_logs\`) |
| Branches Git | \`feature/nom-court\`, \`fix/nom-court\` |
| Commits | \`feat:\`, \`fix:\`, \`chore:\`, \`refactor:\` |

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
- **Mesurer sur le moteur, jamais sur une réplique de ses formules.** Cette erreur a
  produit **trois** conclusions fausses (partage glucides/lipides figé à 55/45 ; « le
  catalogue est trop maigre » ; « 21 à 30 recettes distinctes » alors qu'un utilisateur
  n'en voit que 11 à 13). Un script d'audit doit appeler `buildLocalPlan` / `adaptRecipe`,
  pas recopier leurs calculs. Corollaire : **ne jamais agréger ce qu'un utilisateur voit
  séparément**, et vérifier qu'un panel de contrôle n'est pas tout masculin.
- **Un tag posé à la main n'arbitre pas mieux qu'un moteur qui mesure.** Devant le choix,
  garder le mécanisme qui calcule, jeter l'étiquette.

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
- **Mettre à jour `AGENTS.md`** en fin de session, dans la liste unique. Ne jamais laisser
  le doc diverger du code, et ne jamais créer une deuxième liste de tâches.

---

## 11. Pièges connus (redécouverts au moins une fois chacun)

- **`onEndEditing` est un no-op sur react-native-web.** Pour normaliser ou borner une
  saisie en fin de frappe, utiliser **`onBlur`**. Le bug « %MG saisi 23 → enregistré 33 »
  venait de là.
- **Le portail de dépistage santé et la visite guidée interceptent les clics.** Tout script
  qui pilote l'app doit les neutraliser d'abord, sinon il conclut que les écrans sont
  « introuvables » alors qu'il n'a jamais pu quitter le Plan (cf. `test/README.md`).
- **Supabase plafonne la création de comptes invités** (429 `over_request_rate_limit`, par
  heure et par IP). Enchaîner les passes de test fait échouer des parcours **sans que l'app
  ait quoi que ce soit à se reprocher**.
- **Les sous-écrans du Profil sont des `Sheet`, pas des routes** : `goBack()` ne les ferme
  pas, il faut cliquer le fond.
- **Build natif iOS** : `npx expo run:ios` (CocoaPods via brew).

---

*Spec stable. Mettre à jour uniquement quand une décision de fond change.*
