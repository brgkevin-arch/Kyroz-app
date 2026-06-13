# CLAUDE.md — Kyroz · Spec technique stable (Claude Code)

> Lu automatiquement à chaque session. Contexte = spec STABLE du projet.
> L'état d'avancement (ce qui est fait / reste) vit dans **AGENTS.md**, pas ici.
> Ne pas dupliquer l'avancement ici. Amender, ne pas supprimer de section.

---

## Rappel projet (1 ligne)

App mobile React Native (Expo Router, SDK 56) de plans repas macro-précis pour hommes 18–35 pratiquant de sport. **Phase 2 — core loop en place + déployé en web (GitHub Pages), itérations UX/qualité en cours.**

---

## 1. Modèle économique

**Freemium large.** Le core loop (génération de plan, plan, courses, recettes) est gratuit et fonctionne sans aucune clé API. La monétisation viendra de features avancées (à définir), pas du blocage du cœur.

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
| Analytics | PostHog (cloud EU) | Plus tard |

> Avant SDK : lire https://docs.expo.dev/versions/v56.0.0/ — Expo a changé.

---

## 3. Architecture données

\`\`\`
users
  └── id, email, created_at

user_profiles
  └── user_id, sex, age, weight_kg, height_cm, body_fat_pct,
      activity_level, training_days_per_week, goal,
      macro_mode (auto|percent), carb_ratio, protein_per_kg,
      dietary_restrictions[], disliked_foods[], preferred_proteins[],
      max_prep_time_min, weigh_in_frequency, tdee_kcal,
      macros (target_kcal/protein/carbs/fat)

meal_plans
  └── id, user_id, week_start_date, generated_at, status

meals
  └── id, plan_id, day (1–7), meal_type, recipe_id, portions

recipes (base propriétaire Kyroz)
  └── id, name_fr, prep_time_min, macros_per_portion (kcal/protein/carbs/fat),
      ingredients[], steps[], tags[], validated_by_dietitian (bool)
  └── fibres : ESTIMÉES à la volée depuis les ingrédients (lib/fiber.ts), pas
      stockées — en attendant une vraie base (Ciqual/OFF).

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
- Plans < 1500 kcal/jour (homme) / < 1200 kcal/jour (femme)
- Pathologies (diabète, IRC, cardio)
- Femmes enceintes / allaitantes
- Utilisateurs < 16 ans (bloquer à l'onboarding)

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
