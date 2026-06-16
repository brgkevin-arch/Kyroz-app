# Refonte des recettes (10) + soft-matching besoin — Design

> Date : 2026-06-16 · Statut : validé (en attente relecture spec)
> Contexte : remplacement des 50 recettes placeholder par les 10 recettes
> « spécial recomposition » fournies par le fondateur, et adaptation du moteur
> pour que le choix de recette tienne compte du besoin (objectif + sport), les
> quantités continuant de s'adapter automatiquement.

## Décisions cadrées (brainstorming)

1. **Pool** : remplacement TOTAL par ces 10 recettes. Le fondateur prépare
   d'autres recettes ; le compromis variété/précision est assumé pour l'instant.
2. **Matching** : **soft-matching** — les tags Objectif/Sport orientent le choix
   UNIQUEMENT à macros équivalentes (jamais en filtre dur, sinon le pool de 10
   s'effondre). Les quantités s'adaptent déjà via le scaling de portion.
3. **Dahl (#7)** : gardé tel quel (déséquilibre protéique connu, 4,3 g/100 kcal),
   suppression possible à terme. Pas de réécriture silencieuse.

## Problèmes connus signalés au fondateur (à combler avec les futures recettes)

- **Variété faible** : 2 petits-déj, 2 collations, 6 repas → répétition sur 7 j.
- **Précision réduite hors recomp** : pool quasi tout dense en protéines
  (6–9 g/100 kcal), donc surdosage protéique probable sur maintien / prise de
  masse (où la cible est ~5 g/100 kcal).
- **Couverture régimes petit-déj/collation** :
  - sans lactose → **0 petit-déj** (porridge + omelette = laitiers)
  - sans gluten → **0 petit-déj ET 0 collation** (avoine/pain partout)
  - Le moteur ne doit plus servir une recette interdite en silence (cf. §4).

---

## 1. Modèle de données — `Recipe` étendu (rétro-compatible)

Champs **optionnels** ajoutés dans `lib/types.ts` (n'impactent ni `recipe_overrides`
ni `RecipeEditor`, qui ignorent les champs inconnus) :

```ts
export type RecipeObjective = 'cut' | 'maintain' | 'bulk';
export type RecipeSport = 'muscu' | 'endurance' | 'combats';

export interface Recipe {
  // … champs existants …
  objectives?: RecipeObjective[];  // tag « Objectif » (perte de gras / maintien / masse)
  sports?: RecipeSport[];          // tag « Sport »
  rest_day_ok?: boolean;           // tag « récup jour off » — STOCKÉ, non utilisé (reporté)
  why_fr?: string;                 // texte « Pourquoi » affiché à l'utilisateur
  // restrictions_ok?: déjà présent — RENSEIGNÉ à la main pour les 10 (cf. §4)
}
```

`rest_day_ok` est stocké dès maintenant (donnée gratuite venant du document) mais
n'est **pas** lu par le moteur : il n'existe aucune notion de « jour de repos »
dans le profil aujourd'hui. Réservé à une itération ultérieure.

## 2. Les 10 recettes (`lib/recipes.ts`)

- Transcrites **à l'identique** : ingrédients, quantités, étapes et macros tels
  que fournis. `validated_by_dietitian: false` (validation diététicienne à part).
- **Nouveaux IDs** `k01`…`k10` (et NON réutilisation de `r001`…) : évite qu'un
  favori/override existant pointant sur un ancien id s'applique par erreur à une
  recette sans rapport. Conséquence assumée : favoris/overrides des comptes de
  test sur les anciennes recettes deviennent **inertes** (sans danger —
  `getEffectiveRecipes` mappe sur la base ; un override orphelin ne s'applique
  jamais ; un favori orphelin disparaît simplement). App en phase test → coût
  négligeable.

### Mapping repas / tags / régimes

| # | id | tags repas | objectives | sports | rest_day_ok | restrictions_ok |
|---|----|-----------|-----------|--------|:-:|-----------|
| 1 Porridge avoine-whey-banane-myrtilles | k01 | breakfast | bulk | muscu, endurance | oui | vegetarian, pescatarian, no_pork |
| 2 Omelette blancs+œufs, fromage blanc | k02 | breakfast | cut, maintain | muscu, combats | non | vegetarian, pescatarian, no_pork |
| 3 Bowl skyr-flocons-amandes-miel | k03 | snack | maintain | muscu, combats | oui | vegetarian, pescatarian, no_pork |
| 4 Smoothie protéiné végétal | k04 | snack | bulk | endurance | non | vegetarian, pescatarian, no_pork, lactose_free |
| 5 Poulet-riz basmati-brocoli | k05 | lunch, dinner | bulk, maintain | muscu | non | no_pork, lactose_free |
| 6 Saumon-patate douce-épinards | k06 | lunch, dinner | maintain | endurance, muscu | oui | pescatarian, no_pork, lactose_free, gluten_free |
| 7 Dahl lentilles corail-riz | k07 | lunch, dinner | cut | endurance, combats | oui | vegetarian, pescatarian, no_pork, lactose_free, gluten_free |
| 8 Bœuf 5%-wok-nouilles complètes | k08 | lunch, dinner | bulk | combats, muscu | non | no_pork, lactose_free |
| 9 Tofu sauté-quinoa-légumes | k09 | lunch, dinner | cut | combats, endurance | non | vegetarian, pescatarian, no_pork, lactose_free |
| 10 Cabillaud-boulgour-pois chiches | k10 | lunch, dinner | cut, maintain | endurance, combats | oui | pescatarian, no_pork, lactose_free |

Macros par portion (fournies, base portion = 1) :

| id | kcal | prot | gluc | lip |
|----|-----:|----:|----:|---:|
| k01 | 610 | 43 | 83 | 11 |
| k02 | 420 | 38 | 30 | 17 |
| k03 | 335 | 24 | 33 | 10 |
| k04 | 560 | 33 | 69 | 17 |
| k05 | 655 | 53 | 70 | 16 |
| k06 | 605 | 38 | 52 | 25 |
| k07 | 705 | 30 | 93 | 20 |
| k08 | 600 | 44 | 56 | 20 |
| k09 | 510 | 35 | 45 | 21 |
| k10 | 590 | 49 | 63 | 13 |

## 3. Moteur — soft-matching (`lib/planEngine.ts`)

### Quantités : inchangé
Le couple (recette, portion) sur grille 0,5×→3× visant kcal + protéines +
lipides reste le cœur. C'est lui qui réalise « un besoin = les bonnes quantités ».
Les quantités d'ingrédients affichées (`RecipeDetail`, `shoppingList`) sont déjà
mises à l'échelle de `portions`.

### Nouveau départage `needMatch`
Parmi les candidats **déjà équivalents en macros** (la bande de précision
actuelle, `TIE_BAND_*`), on préfère celui dont les tags collent au profil. C'est
un **tie-break**, jamais un élargissement de bande → **zéro sacrifice de
précision**.

Ordre de départage révisé dans `selectMeal` :
1. protéines préférées (existant)
2. **needMatch (objectif + sport)** ← nouveau
3. fibres (si sèche — existant)
4. variété intra-semaine (existant)
5. fibres (hors sèche — existant)
6. seed (reroll — existant)
7. score puis id (existant)

`needMatch(recipe, profile)` = somme de 2 booléens :
- objectif : `recipe.objectives` ∩ `goalToObjectives(profile.goal)` ≠ ∅
- sport : `recipe.sports` ∩ `sportsToBuckets(profile.sports)` ≠ ∅

Score plus haut = meilleur (on trie décroissant). Une recette sans tags
(`objectives`/`sports` absents) a un needMatch de 0 → neutre, jamais pénalisée
(important pour les recettes legacy/perso).

### Mappings (helpers purs)
```
goalToObjectives:
  cut_aggressive, cut → ['cut']
  recomp             → ['cut', 'maintain']
  maintain           → ['maintain']
  lean_bulk, bulk    → ['bulk']

sportsToBuckets (union sur tous les sports du profil):
  musculation                       → muscu
  sports_combat                     → combats
  course, velo, natation, marche_rapide, football, basket, tennis_padel → endurance
  hiit_crossfit                     → muscu, endurance
  (profil sans sport → ensemble vide → pas de bonus sport, neutre)
```

### Effet attendu
L'objectif influence déjà fortement le choix via les cibles macro ; le levier
réellement neuf est le **sport** : à macros égales, un combattant penche vers
Dahl/Tofu/Cabillaud, un pratiquant de muscu vers Poulet/Bœuf. Nudge doux,
visible surtout via l'UI (§6).

### Régénération
Incrémenter `ENGINE_VERSION` (3 → 4) dans `profileSignature` → les plans en cache
se régénèrent automatiquement (auto-refresh de l'écran Plan).

## 4. Régimes — filtrage fiable (`lib/planEngine.ts`)

- `recipeAllowed` lit **`restrictions_ok` quand il est présent** (autoritaire :
  recette autorisée pour la restriction `R` ssi `R ∈ restrictions_ok`). Sinon
  **repli** sur le filtrage par mots-clés actuel (`RESTRICTION_BLOCKLIST`) pour
  les recettes legacy/perso sans le champ. → corrige les faux positifs (lait
  d'amande/coco bloqués à tort, ex. k04) et faux négatifs (skyr, boulgour,
  nouilles non détectés).
- **Honnêteté « repas introuvable »** : aujourd'hui `poolFor` retombe
  silencieusement sur le pool complet (ignorant la restriction) quand le filtrage
  vide le pool. On conserve ce repli (jamais de plan vide) MAIS on **marque** le
  repas comme servi hors-restriction afin que l'UI prévienne l'utilisateur
  (« aucune recette sans lactose pour le petit-déj — voici une option
  standard »). Mécanisme minimal : `poolFor` peut signaler le repli ; le `Meal`
  porte un drapeau optionnel (ex. `restriction_relaxed?: true`) lu par
  `MealCard`/`RecipeDetail`. (Détail d'implémentation à figer dans le plan.)

## 5. UI (`components/RecipeDetail.tsx`, `components/MealCard.tsx`)

- `RecipeDetail` : badges **Objectif** + **Sport** + bloc **« Pourquoi »**
  (`why_fr`). C'est la partie visible du « l'algorithme pense à ton besoin ».
- `MealCard` : badge léger optionnel (objectif/sport) — discret pour ne pas
  charger la liste.
- Avertissement régime relâché (cf. §4) affiché sur le repas concerné.
- Tout via `useTheme()` + `makeStyles(t)`, aucune couleur en dur (CLAUDE.md §8).

## 6. Tests & documentation

- `lib/__tests__/recipes.test.ts` : remplacer « intégrité 50 recettes » par 10 +
  invariants : `kcal ≈ 4P+4C+9F` (±10 %), `tags` non vide, `objectives`/`sports`
  renseignés, `restrictions_ok` valides, pool non vide par type de repas.
- `lib/__tests__/planEngine.test.ts` : soft-matching (le sport oriente bien à
  macros égales), needMatch neutre si pas de tags, filtrage régime exact
  (k04 lactose_free autorisé, etc.), repli « repas introuvable » signalé.
- `AGENTS.md` : 10 recettes, soft-matching, mappings, trous connus
  (lactose/gluten petit-déj/collation, variété, précision hors recomp).

## 7. Hors-scope (acté pour plus tard)

- Liaison macros ↔ Ciqual via `food_id` (recalcul + marge d'incertitude).
- Notion « jour de repos » dans le profil → activation de `rest_day_ok`.
- Les ~24 recettes restantes (fournies par le fondateur) pour combler variété,
  précision hors recomp et couverture régimes petit-déj/collation.

## Ordre d'implémentation (séquencé, vérifiable)

1. Types (`Recipe` étendu + `RecipeObjective`/`RecipeSport`).
2. Données (`recipes.ts` : 10 recettes + mappings tags/régimes).
3. Moteur : helpers de mapping + `needMatch` + lecture `restrictions_ok` + bump
   `ENGINE_VERSION`.
4. Repli régime honnête (drapeau + UI d'avertissement).
5. UI badges + « Pourquoi ».
6. Tests (mise à jour + nouveaux) → `npm test` vert.
7. `AGENTS.md`.
