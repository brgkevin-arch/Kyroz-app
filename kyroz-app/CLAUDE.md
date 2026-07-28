# CLAUDE.md — Kyroz · Spec technique stable (Claude Code)

> Lu automatiquement à chaque session. Contexte = spec STABLE du projet.
> L'état d'avancement (ce qui est fait / reste) vit dans **AGENTS.md**, pas ici.
> Ne pas dupliquer l'avancement ici. Amender, ne pas supprimer de section.

---

## Rappel projet (1 ligne)

App mobile React Native (Expo Router, SDK 56) de plans repas macro-précis pour hommes 18–35 pratiquant de sport. **Phase 2 — core loop en place + déployé en web (GitHub Pages), itérations UX/qualité en cours.**

---

## 1. Modèle économique

**Freemium large.** Le core loop (génération de plan, plan, courses, recettes) est gratuit et fonctionne sans aucune clé API. La monétisation vient de features avancées, pas du blocage du cœur. **Valeur premium (Kyroz+) tranchée + construite (2026-07-27)** : *« piloter son objectif dans le temps »* — objectif daté (trajectoire calorique vers un poids à une date), suivi de transformation (zone/photos), et à venir la banque de calories. **Paiement = achat in-app Apple/Google via RevenueCat (pas Stripe seul, refusé par les stores) + gating `is_premium` = à câbler** (features gratuites tant que ce n'est pas fait). Détail : `MONETISATION.md` + AGENTS.md.

---

## 2. Stack technique

| Couche | Choix | État |
|---|---|---|
| Mobile | **React Native (Expo Router, SDK 56)**, TypeScript strict | En place |
| Génération repas | **Moteur LOCAL** (\`lib/planEngine.ts\`) — macro-précis, 0 clé API | Moteur principal |
| Génération repas (option) | API Claude (\`lib/generatePlan.ts\`) — uniquement si \`EXPO_PUBLIC_ANTHROPIC_API_KEY\` définie, sinon fallback local auto | Optionnel |
| Persistance locale | AsyncStorage (clés \`@kyroz:*\`) | En place |
| Backend / Auth | **Supabase** (région EU) — création de compte email + suppression de compte (RGPD) | Auth OK |
| Base nutritionnelle | Ciqual (ANSES) primaire + Open Food Facts secondaire | Cible |
| Analytics | PostHog (cloud EU) | **Câblé (dormant)** — `lib/analytics.ts`, consent-gated RGPD ; s'active en posant `EXPO_PUBLIC_POSTHOG_KEY` |

> Avant SDK : lire https://docs.expo.dev/versions/v56.0.0/ — Expo a changé.

---

## 3. Architecture données

\`\`\`
users
  └── id, email, created_at

user_profiles
  └── user_id, sex, age, weight_kg, height_cm, body_fat_pct,
      activity_level, training_days_per_week, goal,
      goal_target (premium : objectif daté {target_weight_kg,target_date,start_weight_kg,start_date} — pilote la cible calorique dans le temps, cf. lib/datedGoal.ts),
      macro_mode (auto|percent), carb_ratio, protein_per_kg,
      dietary_restrictions[], disliked_foods[], preferred_proteins[],
      hidden_recipes[] (recettes « j'aime pas » 👎 — masquées, SOUPLE/réversible),
      max_prep_time_min, weigh_in_frequency, tdee_kcal,
      macros (target_kcal/protein/carbs/fat)

meal_plans
  └── id, user_id, week_start_date, generated_at, status

meals
  └── id, plan_id, day (1–7), meal_type, recipe_id, portions

recipes (base propriétaire Kyroz)
  └── id, name_fr, prep_time_min, macros_per_portion (kcal/protein/carbs/fat),
      ingredients[], steps[], tags[], validated_by_dietitian (bool)
  └── fibres : calculées à la volée depuis les ingrédients (lib/fiber.ts),
      SOURCÉES Ciqual (Food.fiber_g) par ref/food_id, pas stockées.

shopping_lists
  └── id, plan_id, user_id, items[]

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
- [ ] Monétisation features avancées (freemium)

### Features INTERDITES (scope creep)
- ❌ Social / partage
- ❌ Gamification avancée (badges, leaderboard)
- ❌ Scan code-barres
- ❌ Intégration wearables
- ❌ Coach IA conversationnel
- ❌ Contenu éducatif / articles
- ❌ Notifications push avancées (sauf rappel quotidien simple)

---

## 6. Garde-fous IA et nutrition (OBLIGATOIRES — hard block dans le code)

### Autorisé
- Plans repas pour adultes en bonne santé
- Calcul TDEE, macros, portions
- Adaptation recettes selon préférences

### Bloqué (hard block)
- **Plans sous le plancher d'énergie disponible** — `lib/safety.ts::safetyFloorKcal`.
  Plancher = `max(BMR, 30 kcal/kg de masse maigre + dépense sportive, 1500 H / 1200 F)`.
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
- Déficit **> 25 % du TDEE** (`lib/datedGoal.ts::MAX_DEFICIT_TDEE_RATIO`)
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
- Prompts de génération IA (si API utilisée) revus par diététicienne diplômée avant prod
- Recettes : \`validated_by_dietitian\` à passer à \`true\` après validation (actuellement \`false\`)

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
| Tables Supabase | snake_case (\`meal_plans\`) |
| Branches Git | \`feature/nom-court\`, \`fix/nom-court\` |
| Commits | \`feat:\`, \`fix:\`, \`chore:\`, \`refactor:\` |

---

## 10. Style de travail attendu

- **Décisions tranchées** : pas de "ça dépend" sans proposition concrète
- **North Star en tête** : % utilisateurs avec 7 jours consécutifs d'usage dans les 14 premiers jours. Si une implémentation ne le sert pas, le dire.
- **Mettre à jour AGENTS.md** en fin de session (état du build), jamais laisser diverger de la réalité du code.

---

*Spec stable. Mettre à jour uniquement quand une décision de fond change.*
