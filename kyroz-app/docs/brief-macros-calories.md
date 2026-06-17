# Brief — Calories & macros incohérentes (Kyroz)

> Document autonome pour discussion. Décrit le fonctionnement actuel, les bugs
> constatés, et des pistes de correction. Aucune connaissance du code requise.
> Chiffres ci-dessous = sortie réelle des fonctions de l'app (homme 85 kg, 178 cm,
> 30 ans, 3 séances/sem, sans sport détaillé).

---

## 0. TL;DR

Trois symptômes, trois causes distinctes :

1. **« 3 calories différentes » (≈2200 / ≈2500 / ≈2774)** → ce ne sont PAS trois calculs contradictoires, mais **trois métriques différentes** affichées sans distinction claire : la **cible**, le **réalisé du plan**, et le **TDEE**. Le calcul de base est cohérent. Problème = clarté d'affichage **+** le plan « réalisé » qui déborde la cible (et n'est pas régénéré quand la cible change).
2. **Protéines trop basses en sèche (1,8 g/kg de poids de corps)** → les protéines sont calculées sur la **masse maigre**, donc plus le %MG est élevé, moins on a de protéines par kg de corps. Vrai bug nutritionnel pour une sèche.
3. **(Secondaire) La synchro cloud écrase le profil local** → peut faire diverger les valeurs entre l'onboarding (fraîchement calculé) et les écrans suivants si le cloud est partiel/périmé.

---

## 1. Comment ça marche aujourd'hui

### 1.1 La chaîne de calcul (fichier `lib/tdee.ts`)

```
Profil (sexe, âge, poids, taille, %MG, activité, objectif)
   │
   ├─► BMR  (métabolisme de base)
   │     • si %MG connu → Katch-McArdle : 370 + 21.6 × masse_maigre
   │     • sinon        → Mifflin-St Jeor (différencié par sexe)
   │
   ├─► TDEE = BMR × activité
   │     • si "sports" détaillés renseignés → BMR × 1.3 (NEAT) + dépense sport (MET)
   │     • sinon → BMR × multiplicateur selon nb de séances/sem
   │              (0:1.2, 1-2:1.375, 3-4:1.55, 5-6:1.725, 7+:1.9)
   │
   ├─► CIBLE kcal = TDEE + ajustement objectif (plancher 1500 H / 1200 F)
   │
   └─► MACROS
         • protéines = base_kg × (g/kg de l'objectif)
                base_kg = masse_maigre si %MG connu, sinon poids total
         • lipides   = 25 % de la cible kcal
         • glucides  = le reste
```

### 1.2 La table par objectif (`GOAL_CONFIG`)

| Objectif | Ajustement kcal | Protéines (g/kg de **masse maigre**) |
|---|---|---|
| Sèche rapide (`cut_aggressive`) | −500 | 2.4 |
| Sèche progressive (`cut`) | −300 | 2.2 |
| Recomposition (`recomp`) | −150 | 2.2 |
| Maintien (`maintain`) | 0 | 1.8 |
| Prise de masse propre (`lean_bulk`) | +200 | 2.0 |
| Prise de masse (`bulk`) | +400 | 1.8 |

### 1.3 Ce que chaque écran affiche réellement

| Écran | Chiffre principal montré | Ce que c'est |
|---|---|---|
| **Onboarding (récap)** | `target_kcal` | la **CIBLE** (TDEE + ajustement) |
| **Plan** (gros chiffre) | somme des repas générés | le **RÉALISÉ** du jour (≠ cible) |
| **Plan** (ligne « Objectif ») | `target_kcal` | la cible |
| **Réglages** (gros encart) | `target_kcal` | la cible |
| **Réglages** (ligne « TDEE ») | `tdee_kcal` | la **maintenance** (sans déficit) |

> Le profil est stocké en local (AsyncStorage) **et** miroir Supabase. Tout
> recalcul passe par une fonction unique (`recalcProfile`) → le calcul lui-même
> est cohérent entre écrans. La divergence vient de **quel** chiffre est affiché.

---

## 2. Les problèmes constatés (avec chiffres réels)

### Repère — sortie réelle pour 85 kg / 178 / 30 ans / 3 séances :

```
%MG 12% | TDEE 3078 | masse maigre 74.8 kg
  Sèche rapide   cible 2578   P 180g  (2.12 g/kg corps | 2.41 g/kg maigre)
  Sèche prog.    cible 2778   P 165g  (1.94 g/kg corps | 2.21 g/kg maigre)
  Maintien       cible 3078   P 135g  (1.59 g/kg corps | 1.80 g/kg maigre)

%MG 18% | TDEE 2908 | masse maigre 69.7 kg
  Sèche rapide   cible 2408   P 167g  (1.96 g/kg corps | 2.40 g/kg maigre)
  Sèche prog.    cible 2608   P 153g  (1.80 g/kg corps | 2.20 g/kg maigre)
  Maintien       cible 2908   P 125g  (1.47 g/kg corps | 1.79 g/kg maigre)

%MG 25% | TDEE 2708 | masse maigre 63.8 kg
  Sèche rapide   cible 2208   P 153g  (1.80 g/kg corps | 2.40 g/kg maigre)   ← ton cas
  Sèche prog.    cible 2408   P 140g  (1.65 g/kg corps | 2.20 g/kg maigre)
  Maintien       cible 2708   P 115g  (1.35 g/kg corps | 1.80 g/kg maigre)
```

### Problème A — « 3 valeurs de calories »

Ce que tu as vu en sèche rapide ≈ **2200 / 2500 / 2774**, décrypté :

- **~2200** = la **cible** (ex. 2208) → récap onboarding + gros encart réglages.
- **~2774** = le **TDEE** (ex. 2708, maintenance) → ligne « TDEE » des réglages.
- **~2500** = le **réalisé du plan** (somme des repas générés) → gros chiffre du Plan.

→ Trois métriques légitimement différentes, mais **présentées comme si c'étaient
toutes "tes calories"**. D'où la confusion.

**Sous-problème A2 (vrai bug fonctionnel)** : le **réalisé déborde la cible**.
Constaté en live : cible protéines = 118 g mais le plan affiche 138 g ; cible
kcal 2770 mais plan ≈ 2800. Le dépassement est petit en maintien, mais **en sèche
il mange le déficit** (un réalisé à 2500 pour une cible à 2208 = +13 % → la sèche
ne sèche plus).

**Sous-problème A3** : le plan **n'est pas régénéré** quand la cible change
(il l'est seulement si le nombre de jours change, ou via « Nouveau plan »). Donc
on peut rester avec un plan calculé pour un ancien objectif/poids.

### Problème B — Protéines trop basses en sèche (le plus important nutritionnellement)

Les protéines sont calées sur la **masse maigre** :
`protéines = masse_maigre × g/kg_objectif`.

Conséquence : `g/kg de poids de corps = g/kg_maigre × (1 − %MG)`. Plus le %MG est
élevé, plus le ratio par kg de corps chute :

| %MG | Sèche rapide (2.4 g/kg maigre) → g/kg **corps** |
|---|---|
| 12 % | 2.12 |
| 18 % | 1.96 |
| 25 % | **1.80**  ← ton cas |
| 30 % | ~1.68 |

Or en **sèche** (déficit calorique), le besoin en protéines est *plus* élevé pour
préserver le muscle. Repères usuels (à faire valider par la diététicienne, cf.
règle de validation contenu) : ~**1.6–2.2 g/kg de poids de corps** en entretien,
et jusqu'à **2.3–3.1 g/kg de masse maigre** (≈ 2.0–2.4 g/kg de corps) en déficit.
1,8 g/kg de corps en sèche agressive est donc **bas**, surtout pour un %MG élevé.

> Nuance : choisir la masse maigre comme base est défendable en soi (on ne
> « nourrit » pas le gras). Le souci est le **niveau absolu par kg de corps** quand
> le %MG monte, pas la logique masse-maigre en elle-même.

### Problème C — La synchro cloud écrase le local (secondaire mais réel)

Au chargement, si une ligne profil existe dans Supabase, elle **remplace** le
profil local (cloud gagne, sans comparaison de fraîcheur). Si le cloud est
partiel ou périmé — ce qui est arrivé récemment quand des colonnes manquaient en
base — les écrans qui chargent après la synchro peuvent afficher des valeurs
différentes de ce que l'onboarding venait de calculer. Risque concret : un %MG
non resynchronisé ferait basculer le calcul de BMR (Katch-McArdle → Mifflin) et de
protéines (masse maigre → poids total) → cible **et** protéines différentes.

---

## 3. Pistes de correction (mes recommandations)

### Pour B — protéines (3 options, non exclusives)

1. **★ Recommandé : base = poids de corps en sèche.** En `cut`/`cut_aggressive`,
   caler les protéines sur le **poids de corps** (ex. 2.0 / 2.2 g/kg) au lieu de la
   masse maigre. Maintien/prise de masse peuvent rester sur la masse maigre.
   - Ex. 85 kg, sèche rapide à 2.2 g/kg corps = **187 g** (vs 153 g aujourd'hui à 25 % MG).
2. **Plancher en g/kg de corps.** Garder le calcul masse maigre mais imposer un
   minimum par kg de corps (`max(g/kg_maigre, g/kg_corps_min)`). Corrige surtout
   les %MG élevés avec un changement minimal.
3. **Monter le coefficient masse maigre** (ex. sèche rapide 2.4 → 2.8). Simple,
   mais un %MG très élevé reste un peu sous-dosé par kg de corps.

→ À trancher avec la diététicienne (les recettes/plans ont une exigence de
validation nutritionnelle dans le projet).

### Pour A — affichage des calories

1. **★ Un seul chiffre « héros » = la CIBLE, partout.** Onboarding, Plan, Réglages
   affichent la même cible comme chiffre principal. Le **TDEE** et le **réalisé du
   jour** restent visibles mais **explicitement étiquetés** (sous-titres : « ta
   dépense estimée », « consommé aujourd'hui ») pour qu'aucun ne soit pris pour
   « tes calories ».
2. **Resserrer le moteur de plan sur la cible** (A2) : viser le réalisé ≈ cible
   avec une marge faible, en priorité en sèche où le dépassement annule le déficit.
3. **Régénérer le plan quand la cible change** (A3) : déclencher une régénération
   (ou afficher un bandeau « plan désynchronisé ») dès que `target_kcal` bouge,
   pas seulement sur le nombre de jours.

### Pour C — synchro

- Remplacer le « cloud gagne toujours » par une **résolution par fraîcheur**
  (`updated_at` / horodatage) ou une **fusion**, pour ne jamais écraser un profil
  local plus récent.
- **Garantir le push** du profil complet en fin d'onboarding (et vérifier qu'il
  n'échoue pas silencieusement).
- Vérifier le **round-trip de `body_fat_pct`** (et des autres colonnes) : une perte
  de ce champ change tout le calcul en aval.

### Bonus — cohérence du TDEE

Deux méthodes de TDEE coexistent (sports détaillés MET **vs** multiplicateur par
nb de séances). S'assurer qu'on n'en bascule pas d'une à l'autre entre l'onboarding
et un recalcul (sinon le TDEE saute), et documenter laquelle fait foi.

---

## 4. Questions ouvertes pour la discussion

1. **Protéines** : base poids de corps en sèche, plancher, ou coefficient relevé ?
   Quelles valeurs g/kg cibles par objectif (à valider diététicienne) ?
2. **Calories affichées** : on impose « cible » comme chiffre héros partout ? Quels
   libellés pour TDEE et réalisé ?
3. **Plan vs cible** : on resserre le moteur pour coller à la cible (surtout en
   sèche), et avec quelle marge tolérée ?
4. **Synchro** : on passe à une résolution par fraîcheur, ou on simplifie (local
   source de vérité, cloud = backup) ?

---

### Annexe — fichiers concernés (pour l'implémentation)

- Calculs : `lib/tdee.ts` (BMR, TDEE, `GOAL_CONFIG`, `calculateMacros`, `recalcProfile`).
- Onboarding : `app/(auth)/onboarding.tsx` (récap + sauvegarde du profil).
- Plan : `app/(tabs)/plan.tsx` (gros chiffre = réalisé, « Objectif » = cible).
- Réglages : `app/(tabs)/profil.tsx` (encart cible + ligne TDEE).
- Synchro : `lib/sync.ts` (`hydrateFromCloud` = cloud écrase local).
