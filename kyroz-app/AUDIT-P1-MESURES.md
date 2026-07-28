# Audit P1 — mesures (2026-07-28)

> Synthèse de la validation multi-agents de la spec P1 **contre le code réel**, avant
> implémentation. Tous les chiffres ont été obtenus en EXÉCUTANT le moteur, pas en le
> relisant. Conservée pour l'**étape 3** (P1.2 MET−1, puis P1.1 chemin TDEE unique +
> NEAT) : les tableaux de NEAT et le panel d'impact sur 12 profils y sont chiffrés.
>
> Les décisions déjà prises sont dans AGENTS.md ; ce document est la MESURE, pas la décision.
>
> ✅ **L'étape 3 a été livrée le 2026-07-28** (P1.2 MET nets + P1.1 chemin unique + NEAT
> paramétrable + `engine_rev`). Ce document reste la trace des mesures qui l'ont
> arbitrée — en particulier le tableau NEAT, qui est la raison pour laquelle
> `desk = 1,20` est le défaut. Ne pas le relire comme un reste-à-faire.

---

# PLAN D'EXÉCUTION P1 — synthèse et arbitrages

**Base de vérification** : commit `4c38fc4`, arbre propre, **482 tests / 27 fichiers verts** (et non 484/28 — ce chiffre avait été mesuré avec un fichier scratch non suivi laissé par un agent précédent). Tous les chiffres ci-dessous ont été **recalculés par exécution du code réel**, pas relus. Aucun fichier du dépôt n'a été modifié.

> ⚠️ **Outillage** — `graphify-out/graph.json` date du **13/06/2026** et n'indexe **aucun** fichier du moteur : `lib/safety.ts`, `lib/datedGoal.ts`, `lib/sport.ts` n'existaient pas encore. Il place `calculateTDEE()` en L45 alors qu'elle est en L74. Le graphe est inutilisable pour auditer le moteur — **à régénérer avant la prochaine session**.

---

## 1. VERDICTS FINAUX

| Item | Verdict final | Motif |
|---|---|---|
| **P1.1** — TDEE unique + NEAT + décroissance | **(a) VALIDE / (b) VALIDE avec table corrigée / (c) HORS PÉRIMÈTRE** | La réfutation gagne : le problème est vivant, pas legacy |
| **P1.2** — MET net (MET−1) | **VALIDE**, seul, sans muscu 4,0, sans 60+ | Correction de méthode démontrable |
| **P1.3** — retrait Katch-McArdle | **REPORTÉ HORS P1** | Casse un garde-fou P0.5/P0.6 **et un test existant** |
| **P1.4** — plancher lipidique | **VALIDE**, indexé masse maigre, pas poids de corps | Réfutation confirme le verdict |
| **P1.5** — trajectoire exponentielle | **REJETÉ** (zone proportionnelle : **VALIDE seule**) | La formule fait l'inverse de ce qu'elle prétend |
| **P1.6** — projection après plancher | **VALIDE — à livrer EN PREMIER** | Défaut de masse, pas de niche |

---

### P1.1 — la réfutation gagne, et le fait qui justifie l'item n'est ni celui de la spec ni celui du validateur

Le validateur a classé « faux » l'affirmation « deux utilisateurs identiques obtiennent des budgets différents ». **C'est lui qui a tort.** Mesuré sur le code :

- H 80 kg / 180 / 30 ans qui déclare « aucun sport » → TDEE **2136**. Il coche une puce et règle **1 séance de 15 min de marche rapide** (le minimum autorisé, `MIN_SESSION_MIN=15`, stepper `min={1}`) → TDEE **2327**. **Saut = +191 kcal/jour pour 15 minutes de marche par semaine.**
- Balayage 360 profils (2 sexes × 50-120 kg × 4 tailles × 3 âges) : saut **min +116, médiane +181, max +245 — positif dans 100 % des cas**.
- La méthode legacy a aussi des marches d'escalier : `2136 / 2448 / 2448 / 2759 / 2759 / 3071 / 3071 / 3382` → **+311 kcal** entre 2 et 3 séances, idem 4→5 et 6→7. La méthode MET est continue.

Ce n'est pas un sujet de migration de comptes legacy (population née dans une fenêtre de 3 jours, juin 2026, probablement vide) : **c'est une discontinuité en production qui touche 100 % des comptes vivants, aujourd'hui.** La stratégie « geler le TDEE legacy, migrer au prochain passage » recommandée par le validateur est de l'over-engineering sur une population fantôme.

**Le vrai danger de P1.1 n'est ni (a) ni la migration : c'est le NEAT par défaut.** Mesuré, à physiologie constante (l'ancien TDEE comme mètre-étalon — le corps ne change pas parce qu'on change la formule) :

| Profil sédentaire | déficit auj. (NEAT 1,20) | NEAT 1,30 | **NEAT 1,35 (spec)** |
|---|---|---|---|
| A — H 30, 85 kg, 178, sèche | −216 kcal/j | −119 | **−28** (87 % effacé) |
| D — F 35, 62 kg, 165, sèche | −263 | −168 | **−103** (61 % effacé) |
| F — F 45, 95 kg, 160, 45 %MG, sèche | −231 | −150 | **−75** (67 % effacé) |
| H — F 24, 50 kg, 170, IMC 17,3, **maintien** | 0 | +129 | **+193 de surplus, aucun drapeau** |

Et si P1.3 est empilé sur F : MSJ (BMR 1499→1564) × 1,35 → cible **1811** contre TDEE actuel 1799 = **+12 kcal/j. La sèche devient une prise.**

**Point que personne n'a relevé : même 1,30 (le `NEAT_BASE_PAL` actuel) est un défaut dangereux** pour les profils à 0 séance — il efface déjà 45 à 64 % du déficit. Le code encode déjà le bon jugement (`activityMultiplier(0) = 1.2`, `lib/tdee.ts:49`). Le défaut du sédentaire déclaré doit rester **1,20**.

**(c) décroissance des séances : HORS PÉRIMÈTRE.** Aucun journal d'entraînement n'existe (aucune clé AsyncStorage, `SportSession` sans date). C'est une feature complète, pas une correction. Elle ajouterait de la friction quotidienne contre la North Star et prescrirait −248 kcal/j à quelqu'un qui s'entraîne mais ne logge pas.

---

### P1.2 — valide, mais beaucoup plus petit que ce qui a été annoncé des deux côtés

Le double comptage est réel : `lib/sport.ts:55` applique le MET **brut** pendant que `lib/tdee.ts:85` fait déjà `BMR × 1,3` sur 24 h. Δ = 0,0025 × poids × minutes hebdo.

**MET−1 SEUL** (sans muscu 5,0→4,0), mesuré :

| Profil | Δ TDEE | Δ plancher | **Δ cible servie** |
|---|---|---|---|
| H 28, 80 kg, 15 %MG, muscu 4×60 | −48 | −48 | **−48** |
| F 29, 58 kg, 24 %MG, 5 séances, **registre saturé 20 sem** | −38 | −38 | **−38** |
| H 33, 92 kg, 22 %MG, HIIT+muscu 5 séances | −58 | −58 | **−58** |

Le chiffre « −62 à −169 » des deux rapports incluait la musculation à 4,0. **MET−1 seul coûte 38 à 58 kcal/j**, pas 170.

**Collision P0.1 confirmée, mais plus petite qu'annoncé** : le plancher étant `30 × MM + sportCrédité`, il baisse exactement du même Δ. La marge d'EA implicite (mesurée contre la dépense **nette** réelle) tombe de 30,7–30,8 à exactement **30,00** — soit **0,7 à 0,8 kcal/kg de masse maigre perdus**, pas 1,3–2,5. Sur la femme au registre saturé (E), le plancher RED-S escaladé passe de 1743 à 1705.

À NE PAS livrer : musculation 5,0→4,0 (valeur d'aucune ligne du Compendium, se cumule à MET−1 qui traite déjà une partie du même phénomène) ; correction 60+ à 0,85 (2,7/3,5 = **0,771**, l'arithmétique contredit sa propre justification, falaise à 60 ans, population hors cible) ; `clamp(minutes, 5, 240)` du snippet (la spec elle-même prescrit de garder 15–180).

---

### P1.3 — À SORTIR DE P1 : il casse un garde-fou P0 **et son test**

Amplitude réelle mesurée (H 95/185/25 a, silhouettes du picker) : **−358 / −198 / −40 / +119 / +279 / +437 kcal/j**. Le validateur annonçait −11 et +82 sur les deux derniers points : faux, non-monotone, contredit son propre point de bascule. **Amplitude = −358 à +437**, pas −358 à +243.

**Régression de sécurité, mesurée et reproduite :** F 135 kg / 168 / 35 a / 45 %MG, muscu 3×60, 40 semaines au registre lowEA.

- **Aujourd'hui (Katch-McArdle)** : BMR 1974 → TDEE 2870, plancher 2870 → **cible = TDEE, déficit 0**. L'escalade RED-S a fait son travail : elle est sortie du déficit.
- **En Mifflin (P1.3)** : BMR 2064 → TDEE 2987, plancher 2903 → **déficit de −84 kcal/j rouvert** à une femme que le garde-fou avait délibérément ramenée à la maintenance.

Ce cas **est** le test `lib/__tests__/safety.test.ts` — *« RÉGRESSION : le registre se VIDE une fois ramenée à la maintenance »*, qui assert `expect(prof.target_kcal).toBe(prof.tdee_kcal)`. **Ce test devient rouge.** C'est la clôture documentée d'un défaut trouvé à l'audit adverse n° 2 : le rouvrir en P1 serait un recul net.

Le risque de P1.3 est **bidirectionnel** : en bas du point de bascule (~21 % chez H, ~33 % chez F) il écrase le déficit contre le plancher P0.1 ; en haut il desserre l'escalade P0.5/P0.6. Ni la spec ni le validateur ne voient le second sens. **Décision : hors P1**, à rouvrir avec un design propre de l'interaction plancher/BMR.

---

### P1.4 — valide, avec la bonne base d'indexation

Les deux tours convergent. Le plancher `0,5 g/kg de POIDS DE CORPS` reproduit en miroir l'erreur que P0.2 vient de corriger sur les protéines (jusqu'à 1,42 g/kg de masse maigre et **42,6 % des kcal** en lipides chez les profils à masse grasse élevée, au prix de 95 g de glucides). **Indexer sur la MASSE MAIGRE**, `fatFreeMassKg` est déjà importé dans `lib/tdee.ts:8`.

Deux corrections de la réfutation à retenir :
- Un seuil à 0,8 g/kg de MM **ne mord aucun profil physiologiquement plausible**, mais il mord sur les gabarits absurdes (branche où le plancher est plafonné à la maintenance) → **borner le plancher par la cible** (`fat ≤ target/9`).
- **Piège d'implémentation** : en mode auto les glucides sont le reliquat (auto-correcteur) ; en mode `percent` glucides et lipides sont **indépendants** — relever `fat_g` sans recalculer `carbs_g` fait dépasser le budget de +13,5 %.
- **Le mode legacy `manual` (`lib/tdee.ts:337-380`) est le 3ᵉ producteur de `target_fat_g`** et n'est couvert par aucun des deux points d'édition proposés (8,9 % des kcal en lipides mesurés). Le couvrir ou décider explicitement de ne pas le couvrir.

Les prévalences citées (0,89 % vs 4,14 % selon la grille) **ne sont pas des chiffres de décision** — c'est une propriété de la grille, pas de la population. Seule la condition analytique est robuste : le plancher mord ssi `cible < 18 × poids`, donc **uniquement à %MG > ~40 %**.

---

### P1.5 — la formule fait l'inverse de ce qu'elle prétend

`g(u) = (1−e^(−2,5u))/(1−e^(−2,5))` est **concave**, donc **toujours au-dessous de la linéaire en sèche, donc toujours PLUS exigeante**. Mesuré (90→80 kg / 140 j) :

`j14 −1,41 kg · j28 −2,29 · j56 −2,89 (max) · j70 −2,77 · j105 −1,72 · j140 0,00`

**Rythme initial = 1,362 kg/sem = 1,51 %/sem = 1498 kcal/j de déficit**, contre `maxWeeklyLossPct` **0,75 %/sem** et `MAX_DEFICIT_TDEE_RATIO` **0,25**. L'app afficherait un « idéal » qu'elle **s'interdit de prescrire**, sur 31 à 48 % du programme, et pousserait mécaniquement à manger sous la cible pour rattraper la courbe — exactement ce que tout le P0 existe pour empêcher.

**La zone proportionnelle `max(1,0 ; 0,015 × poids)` est le seul élément récupérable** : elle élargit uniquement (inchangée ≤ 66,7 kg ; +20 % à 80 kg ; +35 % à 90 kg), ne rétrécit jamais, **et ne casse aucun test** (deltas des fixtures 0,9/1,5 vs zones 1,15-1,25). `TRACK_TOLERANCE_KG = 1` aujourd'hui.

**Bug vivant trouvé au passage, plus coûteux que tout ce débat** — `app/(tabs)/profil.tsx:567` :
```
{ ..., start_weight_kg: profile.weight_kg, start_date: existing?.start_date ?? today }
```
Ancre asymétrique : le **poids** de départ est réinitialisé au poids du jour, la **date** de départ est conservée. Rouvrir l'éditeur d'objectif daté et ré-enregistrer **sans rien changer** fait passer un utilisateur pile sur sa ligne de `on_track` à `behind` (Δ 0 → 2,5 kg), fait **disparaître** « Depuis le départ : −5 kg 💪 » et retomber la barre de progression de 50 % à 0 %. Correctif : `start_weight_kg: existing?.start_weight_kg ?? profile.weight_kg`. **À corriger tout de suite, indépendamment de P1.**

---

### P1.6 — défaut de masse, à livrer en premier

Balayage de **1 344 objectifs datés actifs** (−7 % en 12 semaines, 2 sexes × 55-120 kg × 4 tailles × 4 âges × 0/3/5 séances) :

- **le plancher mord dans 1 059 cas (78,8 %)** ;
- écart date annoncée → date réelle : **médiane 32 jours, p90 89 jours, max 724 jours** ;
- **655 cas annoncent `reachableByDate = true`** alors que c'est faux.

Cas type, cœur de cible : **H 35 ans, 90 kg, 180 cm, sédentaire**, −7 % en 12 semaines.
- TDEE 2226, plancher 2020, **cible réellement servie 2020** (delta servi −206).
- La carte annonce `dailyKcalDelta −557`, `safeWeeklyKg −0,5 kg/sem`, date projetée **2026-10-23**.
- Réel : **0,187 kg/sem → 33,6 semaines**, soit **2,67× trop rapide** et une date en mars 2027.

Ce n'est pas une niche féminine sportive : **les plus touchés sont les hommes sédentaires**, le cœur de cible déclaré. Et P1.6 est **display-only** : il ne change aucune cible servie. Il rend visible ce que tous les autres items vont déplacer.

---

## 2. COLLISIONS AVEC LES GARDE-FOUS P0

| Item | Garde-fou touché | Effet mesuré | Verdict |
|---|---|---|---|
| **P1.3** | **P0.5 / P0.6** (escalade RED-S) | Déficit −84 kcal/j **rouvert** à la femme ramenée à la maintenance ; `safety.test.ts` devient rouge | **Bloquant → hors P1** |
| **P1.1** (NEAT 1,35) | Aucun techniquement — mais **détruit la promesse produit** | 61 à 87 % du déficit effacé sur 4 profils sédentaires ; +193 kcal/j en silence à une IMC 17,3 | **Bloquant sans le défaut 1,20** |
| **P1.1** (séances synthétiques) | **P0.1** (plancher EA) | Plancher legacy 1461 → 1716 (**+255**) ; cible 2217 → 1852 (**−365**) ; `LOW_EA_WARNING` **apparaît** | Majeur, assumable avec message |
| **P1.2** | **P0.1 / P0.5** | Plancher escaladé 1743 → 1705 ; marge d'EA implicite 30,7 → **30,00 pile** | Mineur, à **tracer** dans `lib/safety.ts:86-107` |
| **P1.4** | Aucune | Agit en aval de `floorAndFlags`, à budget calorique constant | Sain |
| **P1.5** (zone) / **P1.6** | Aucune | Affichage seul | Sain |

---

## 3. ORDRE D'IMPLÉMENTATION

**Principe de l'ordre** : les items d'affichage d'abord (ils ne déplacent aucune calorie et rendent visibles les effets des suivants), puis les items à budget constant, puis les items qui déplacent le TDEE — du plus petit au plus grand. **Livrer P1.2 avant P1.1 est le pire ordre possible** (MET−1 seul retire 38-58 kcal/j à tous les comptes sportifs pour aucun bénéfice visible ; ensemble avec le NEAT l'effet net est proche de zéro).

**Chaîne de dépendance à connaître** :
`dépense sportive → plancher EA (terme ADDITIF, lib/safety.ts:165) → cible servie → registre lowEA → escalade RED-S`
et en parallèle
`TDEE → MAX_DEFICIT_TDEE_RATIO (lib/datedGoal.ts:204) → plafond de pilotage daté → date projetée`.
**Tout changement de dépense sportive ou de BMR traverse ces deux chaînes.**

### Étape 0 — prérequis (hors P1, bloquants)
| # | Action | Pourquoi |
|---|---|---|
| 0.1 | **`engine_rev` persisté dans `UserProfile`** | Sans lui : impossible de savoir si un compte a été converti, donc pas de message one-shot, pas de bascule progressive, pas de mesure a posteriori. `ENGINE_VERSION` (`planEngine.ts:495`) ne versionne que le **cache de plans** — les plans se régénèrent seuls, `profileSignature` contient déjà `target_kcal`. |
| 0.2 | **`supabase/schema.sql` : ajouter `low_ea_weeks jsonb` et `hidden_recipes text[]`** | Vérifié : **0 occurrence des deux** dans schema.sql, alors que `PROFILE_COLS` les synchronise. Recréer la base depuis schema.sql = le PGRST204 silencieux déjà rencontré 3×. `AGENTS.md:106` affirme le contraire pour `hidden_recipes` : c'est faux. |
| 0.3 | **Corriger `profil.tsx:567`** (`start_weight_kg`) | Bug vivant, produit plus de faux « behind » que tout P1.5. |
| 0.4 | **Régénérer `graphify-out/`** | Le graphe ne connaît pas le moteur. |

### Étape 1 — affichage seul, zéro kcal déplacé
| # | Item | Effort | Note |
|---|---|---|---|
| 1 | **P1.6** — projection recalculée après plancher | M | Paramètre `floorKcal` **OBLIGATOIRE** (optionnel = `DatedGoalCard` compile et reste mensongère). Réutiliser le `kcalPerKg` de `lib/datedGoal.ts:192`, jamais 7700 en dur. **Trois gardes** : signe, non-finitude, **et horizon borné** (un `weeksNeeded` de 1137 → date en 2048, positif et fini, passe tous les gardes prescrits). Forcer `floorCapped = false` en mode `manual` (grammes figés → la formule y donne le **signe inverse**). Garder `tdeeUsable` (sinon `safety.test.ts:686`, robustesse `tdee ∈ {0, NaN, −100}`, casse). |
| 2 | **P1.5 — zone proportionnelle SEULE** | S | `max(1,0 ; 0,015 × poids)`. Couloir effilé dans `WeightChart.tsx` : ±0,015 × `start_weight_kg` au départ, ±0,015 × `target_weight_kg` à l'arrivée. **Zéro test cassé.** |
| 3 | **Neutraliser `trackStatus` quand `underweightBlocked` ou `directionMismatch`** | S | Trou trouvé : quand P0.6 force la maintenance, le poids ne PEUT plus descendre mais `idealWeightAt` continue de descendre → « en retard » (+5,0 kg à j140) affiché à une personne en insuffisance pondérale à qui l'app vient d'interdire tout déficit. |

### Étape 2 — budget calorique constant
| # | Item | Effort |
|---|---|---|
| 4 | **P1.4** — plancher lipidique indexé **masse maigre** (0,8 g/kg de MM), borné par `target/9`, glucides recalculés en reliquat en mode `percent`, mode `manual` tranché | M |
| 5 | **Câbler les drapeaux muets** | S |

> `CARBS_BELOW_TRAINING_FLOOR` est levé sur **100 %** des profils que P1.4 vise et n'est affiché nulle part. **5 des 7 `PlanFlag` sont muets** (seuls `FLOOR_APPLIED` et `UNDERWEIGHT_NO_DEFICIT` sont lus). Afficher le diagnostic coûte moins cher que d'ajouter un garde-fou de plus.

### Étape 3 — déplacement du TDEE (du plus petit au plus grand)
| # | Item | Effort | Amplitude |
|---|---|---|---|
| 6 | **P1.2 — MET−1 SEUL** (pas la muscu à 4,0, pas le 60+, bornes 15-180 conservées) | M | −38 à −58 kcal/j |
| 7 | **P1.1** — chemin TDEE unique + NEAT paramétrable, **défaut `desk` 1,20 à 0 séance** | L | −365 (legacy) à +191 (saut de méthode supprimé) |

### Sorti de P1
| Item | Destination |
|---|---|
| **P1.3** — retrait de Katch-McArdle | **P2**, avec design de l'interaction plancher/escalade |
| **P1.1(c)** — décroissance des séances | **Feature** (journal d'entraînement) — voir §6 |
| **Champ de provenance %MG** `declared\|bia\|dxa` | **Feature** — voir §6 |

---

## 4. IMPLÉMENTABLE TOUT DE SUITE, SANS TOI

1. **P1.6** en entier (paramètre obligatoire, 3 gardes, `manual` neutralisé). Seule question ouverte : le **libellé** de l'état « non atteignable », pas le calcul.
2. **P1.5 zone proportionnelle** + neutralisation de `trackStatus` sous P0.6.
3. **P1.2 MET−1 seul.** 1 seul test casse sur 482 (`lib/__tests__/sport.test.ts`, le `it` L9-14 : 430,5 → 344,4). Les autres fichiers cités par le validateur (`safety.test.ts:41/:105`, `tdee.test.ts:44/:60/:255`) sont des **faux positifs** : ils appellent `exerciseKcalPerDay` à l'exécution.
4. **P1.4**, une fois la base d'indexation tranchée (voir §5, question 3).
5. **Correctifs hors P1** : `profil.tsx:567`, `schema.sql`, `engine_rev`, câblage des drapeaux.
6. **Cohérence documentaire** : les 8 divergences majeures — dont **l'âge minimum resté à 16 ans dans 4 documents** alors que `MIN_AGE = 18` : `AGENTS.md:111` et `:154`, **`STORE-RELEASE.md:150` et `:160`** (réponses préparées aux formulaires Apple/Google — elles seraient **soumises fausses**), **`RGPD-REGISTRE.md:27`** (document réglementaire). Et le snippet `safetyFloorKcal` de `KYROZ_MOTEUR_V2_CORRECTIONS.md:242-248` est la version **d'avant** le correctif (4 paramètres, sans le `Math.min(eaFloor, maintenanceKcal)`) — le réimplémenter depuis la doc réintroduirait le surplus forcé.

---

## 5. DÉCISIONS PRODUIT — chiffrées, avec ma recommandation tranchée

### Q1 — Le NEAT par défaut d'un utilisateur qui déclare « aucun sport » : 1,20 ou 1,35 ?
**Enjeu, mesuré** : à 1,35, le déficit d'un homme de 85 kg passe de −216 à **−28 kcal/j** (0,196 → 0,025 kg/sem) ; d'une femme de 62 kg, de −263 à −103 ; d'une femme de 95 kg à 45 %MG, de −231 à −75 — et à **+12 (surplus)** si P1.3 est empilé. Une femme à IMC 17,3 en « maintien » reçoit **+193 kcal/j** sans qu'aucun garde-fou ne le voie (`deficitBlocked` ne se déclenche que si un déficit est demandé).
**Recommandation : `desk` = 1,20 pour tout profil à 0 séance.** Non négociable. Sans ça, P1.1 fait cesser de maigrir la population qui a téléchargé l'app pour maigrir. Le code encode déjà ce jugement (`activityMultiplier(0) = 1.2`) ; le remplacer par 1,35 est une régression déguisée en refactor.

### Q2 — Amplitude de la table NEAT : 1,20–1,65 (spec) ou 1,20–1,45 ?
**Enjeu** : 1,50 et 1,65 sont des niveaux **exercice-inclus** ; additionnés à `exerciseKcalPerDay` ils recouvrent une dépense déjà comptée (le commentaire `lib/tdee.ts:56-58` pose explicitement 1,3 « pas de double comptage »). +553 kcal/j mesurés sur un profil en sèche. La spec justifie elle-même ~500 kcal d'écart, ce qui donne un span de 0,28, pas 0,45.
**Recommandation : `1,20 / 1,28 / 1,36 / 1,45`.** Écart total 450 kcal sur un BMR de 1800, conforme à la justification citée, sans recouvrir les MET.

### Q3 — Plancher lipidique : indexé sur le poids de corps (spec) ou sur la masse maigre ?
**Enjeu** : F 125 kg / 160 / 52 %MG, cible 1800 kcal. Base **poids** → lipides 63 g (1,05 g/kg de MM, 31,5 % des kcal), glucides 182 → **152 g**. Base **masse maigre à 0,8** → lipides 50 g (**inchangé**), glucides 182 g **intacts**. Base poids, pire cas : **42,6 % des kcal en lipides** et 1,42 g/kg de MM ; le plan servi sur-sert déjà les lipides de ~20 % au-dessus de la cible → **41,3 % des kcal servis un jour donné**, l'invariant `< 0,40` de `planEngine.test.ts:51` est rompu.
**Recommandation : masse maigre, 0,8 g/kg, borné par `target/9`.** C'est le raisonnement déjà tranché pour les protéines en P0.2. Il corrige le vrai trou (mode « Perso % », 0,22-0,24 g/kg) sans toucher un seul profil sain.

### Q4 — Mode « Perso % » : borner l'entrée, écrire un plancher moteur, ou les deux ?
**Enjeu** : `carb_ratio` est **persisté** (`sync.ts:32`), la base accepte **0-100** (`schema.sql:37`, alors que l'UI borne à 10-90) et le moteur clampe **0-100** (`tdee.ts:284`). Abaisser `CARB_MAX` de 90 à 80 ne change **rien** pour un compte qui stocke déjà 90 : il garde 19 g de lipides (7,3 % des kcal) pour toujours. Et à 80 on est encore à 14,7 % des kcal — sous le seuil de carence. `carb_ratio = 100` produit aujourd'hui un plan à **0 gramme de lipides, sans le moindre drapeau**.
**Recommandation : les deux, et clamper À LA LECTURE.** `CARB_MAX` à 75 (18,5 % des kcal), + plancher moteur sur masse maigre, + clamp de `carb_ratio` dans `syncGuard` pour rattraper les valeurs stockées. Une constante d'écran ne migre aucun compte.

### Q5 — La question NEAT va-t-elle dans l'onboarding ?
**Enjeu** : +1 écran sur le parcours dont dépend la North Star (7 jours consécutifs sous 14 jours), pour un champ que l'utilisateur ne sait objectivement pas remplir. Gain : jusqu'à ±270 kcal/j de précision.
**Recommandation : non, pas dans l'onboarding.** Dans le profil, défaut 1,20 à 0 séance / 1,30 sinon tant que ce n'est pas renseigné. Zéro friction à J1, précision disponible pour qui la veut.

### Q6 — Migration : les comptes qui perdent > 150 kcal/j
**Enjeu** : profil legacy F 27 / 68 kg / 5 séances déclarées sans détail → cible **2217 → 1852 kcal/j (−365)**, plancher +255, et `LOW_EA_WARNING` **apparaît** sur un plan qui n'en portait aucun. Son déficit réel passe de −300 à **−665 kcal/j** (0,27 → 0,60 kg/sem). Elle n'a jamais renseigné ses séances : lui appliquer des séances synthétiques génériques de 60 min à MET 6 est une **devinette**, et la devinette lui coûte 365 kcal/j.
**Recommandation : ne pas deviner. Écran de reprise de saisie.** Au premier lancement post-mise à jour, proposer de détailler ses sports (l'éditeur existe déjà), avec l'écart avant/après affiché. Demander vaut mieux qu'inventer.

### Q7 — Message utilisateur : à partir de quel seuil ?
**Enjeu** : 7 profils sur 12 du panel dépassent 100 kcal/j d'écart ; jusqu'à −463 en stress. `hooks/useProfile.ts:37-56` applique `recalcProfile` **au chargement**, réécrit AsyncStorage, marque dirty et **pousse au cloud** — le changement est rétroactif, silencieux, immédiat et répliqué sur tous les appareils. Et **4 profils sur 12 verront `FLOOR_APPLIED` disparaître** (l'explication « ton plan est au minimum de sécurité » s'évapore sans raison visible) tandis qu'un verra `LOW_EA_WARNING` surgir.
**Recommandation : carte one-shot obligatoire dès |Δcible| ≥ 100 kcal/j**, armée dans `useProfile.ts` sur comparaison ancien/nouveau `target_kcal`, drapeau persisté via `engine_rev`. Cadrage **affinage, pas correction d'erreur** : « on estime maintenant ta dépense à partir de tes séances réelles ; ton budget passe de X à Y ». Rassurer, expliquer, ne pas alarmer.

### Q8 — Le plafond des 25 % du TDEE : chemin daté seulement, ou partout ?
**Enjeu, vérifié en exécutant `computePlan`** : F 55 ans / 60 kg / 158 / 4 séances, `cut_aggressive` → TDEE 1786, cible 1286 = **28,0 % de déficit, aucun drapeau**. `MAX_DEFICIT_TDEE_RATIO` n'est appliqué que dans `datedGoalStatus` (`lib/datedGoal.ts:204`) ; les deltas figés de `GOAL_CONFIG` (`cut_aggressive = −500`) ne sont plafonnés par rien. `CLAUDE.md:163` le range pourtant parmi les hard blocks.
**Recommandation : étendre le plafond aux deltas fixes de `GOAL_CONFIG`.** C'est un changement de moteur (petit : un `Math.max(kcalDelta, -0.25 * tdee)` dans `floorAndFlags`), mais laisser la doc mentir sur un hard block est pire. À faire dans le même lot que P1.6, qui rend l'effet visible.

### Q9 — Que dit-on quand la date n'est plus atteignable ?
**Enjeu** : après P1.6, **655 comptes sur 1 344** de ma grille passent de « atteignable » à « pas à cette date ». Écarts médians 32 jours, p90 89 jours.
**Recommandation : afficher la date projetée ET proposer la correction en un geste** (« ton objectif tient si tu vises le 28 déc., ou 62 kg au 29 sept. »). Texte **distinct** de « objectif ambitieux » quand c'est le plancher qui mord : le plancher n'est pas une ambition mal calibrée, c'est une contrainte physiologique. Et supprimer « un peu » de « un peu après ta date » — à 89 jours c'est faux.

---

## 6. FEATURES DÉGUISÉES EN CORRECTION — à sortir du périmètre P1

| Élément | Pourquoi ce n'est pas une correction | Reco |
|---|---|---|
| **P1.1(c) — décroissance des séances** | Suppose un journal d'entraînement qui **n'existe pas** : aucune clé AsyncStorage, `SportSession` (`lib/types.ts:29-33`) est une **déclaration de fréquence sans date**. `lib/streak.ts` = série d'usage de l'app. Livrer la décroissance = construire le log (saisie quotidienne + persistance + sync), plus un drapeau `TRAINING_STALE` qui met la pression sur l'utilisateur. Et sans log, elle retire jusqu'à −248 kcal/j à quelqu'un qui s'entraîne vraiment. | **Hors P1.** Le besoin réel (« ce que tu as déclaré ne correspond plus à ce que tu fais ») est **déjà servi** par `usePlanCheckin` (relance à 14 j) : y ajouter « tes séances sont-elles toujours à jour ? » qui renvoie vers l'éditeur Sports. Zéro nouvelle donnée, zéro faux positif. |
| **Champ de provenance %MG** `declared\|bia\|dxa` | **Aucune règle de modulation n'est spécifiée** : ni sur quoi elle agit, ni de combien. Coût réel : champ `types.ts` + colonne `PROFILE_COLS` + migration Supabase + UI onboarding et profil. Bénéfice nul tant que « moduler la confiance » n'est pas défini. | **Hors P1.** Si ça revient, avec une règle **chiffrée** (ex. « un %MG `declared` est corrigé de +4 points avant de calculer la masse maigre du plancher »), pas un champ de métadonnée inerte. |
| **État `ahead_too_fast`** (P1.5) | Le besoin est réel (le P0 borne le plan **prescrit**, jamais le **vécu** ; la balance est le seul capteur). Mais le déclencheur proposé est faux : seuil **0,80 kg/14 j** pour un homme lean de 80 kg contre **1-2 kg de bruit hydrique/jour documenté dans le code lui-même** (`datedGoal.ts:267-270`). Et la fenêtre de 14 j est la pire possible — c'est celle du décrochage glycogène/eau **et** celle de la North Star. Enfin `trackStatus(target, currentWeightKg, today)` ne reçoit **ni l'historique ni un `BodyInput`** : changement de signature obligatoire. | **Hors P1**, à reprendre plus tard. Si retenu : nom `ahead_fast` (jamais `too_fast` — le jugement est dans l'identifiant), 3 conditions cumulatives (≥3 pesées sur ≥14 j, pente par régression, marge **1,3×**), et message = **action du moteur**, pas performance de l'utilisateur : « Ça descend vite — Kyroz remonte un peu tes calories cette semaine 👌 ». `AGENTS.md:75` : « le pire cas est NEUTRE, pas de ⚠️/ambre ». |
| **Trajectoire exponentielle** (P1.5) | Ce n'est ni une correction ni une feature : c'est **une erreur**. La formule fait l'inverse de ce que la spec dit qu'elle fait. | **Abandonner.** Si le but réel était de créditer le décrochage hydrique de la première semaine (1-2 kg), l'outil juste est un offset one-shot de ~1 kg sur 10 jours — ou rien, la zone de ±1 kg l'absorbant déjà. |

---

## 7. CE QUE J'AI CORRIGÉ DANS LES DEUX RAPPORTS (à ne pas citer tel quel)

| Affirmation | Statut |
|---|---|
| « A sous-estime B de 200–260 kcal **systématiquement** » (spec) | **Faux.** Le signe s'inverse selon MET × durée. Mais la **conclusion** (garder une seule méthode) tient — pour une autre raison : le saut de méthode de **+116 à +245 kcal/j** sur 100 % des comptes vivants. |
| « Migration legacy » = risque n°1 de P1.1 (validateur) | **Faux périmètre.** `sports` vide + `training_days > 0` n'est plus productible depuis `onboarding.tsx:140/204` ; la population est née dans une fenêtre de 3 jours (11→14 juin 2026). Le risque n°1 est le **NEAT par défaut**. |
| « NEAT `desk` 1,20 = maintien déguisé, même mode que le 35 kcal/kg » (validateur) | **Faux en signe.** 1,20 fait **baisser** le TDEE et pousse la cible vers le **bas** (jusqu'à −252 kcal/j servis). Le risque de `desk` est la **sous-alimentation**, pas le maintien déguisé. |
| « 1,50 / 1,65 sont les multiplicateurs de `activityMultiplier` » (validateur) | **Faux.** `lib/tdee.ts:51-52` contient **1,55 et 1,725**. La conclusion (un NEAT pur ne doit pas recouvrir les MET) tient, l'argument non. |
| « Le plancher ne mord dans aucun cas » (validateur, P1.1) | **Faux.** Testé à 13 semaines lowEA = 1 semaine de dépassement × 0,5 = l'escalade la plus faible possible, puis conclu « jamais ». |
| « MET−1 coûte −62 à −169 kcal/j » | **Sur-évalué.** Chiffre incluant muscu 4,0. **MET−1 seul : −38 à −58.** |
| « La marge d'EA tombe de 31,3-32,4 à 30,0 » | **Sur-évalué.** Mesuré : **30,7-30,8 → 30,00**, soit 0,7-0,8 kcal/kg de MM perdus. |
| Amplitude P1.3 « −358 à +243 » | **Faux.** Mesuré : **−358 à +437** (les points 30 % et 35 % étaient faux et non-monotones). |
| « −66 kcal/j, plancher au-dessus de la maintenance » (P1.3) | **Impossible.** Le cap `Math.min(eaFloor, maintenanceKcal)` (`safety.ts:166`) l'interdit structurellement. La marge réelle est **0**, plancher **égal** à la maintenance. Le failure mode est réel, sa magnitude non. |
| « Écart max exp−lin à j70 = 2,77 » (P1.5) | **Faux.** Maximum **2,89 kg à j56**. |
| « 484 tests / 28 fichiers » (audit doc) | **Faux.** Arbre propre : **482 / 27**. Le 483ᵉ venait d'un `zz_audit_scratch.test.ts` non suivi. |
| Prévalences P1.4 (0,89 % / 3,85 % / 25,3 %) | **Non reproductibles** (propriété de la grille). Seule la condition analytique `cible < 18 × poids` est robuste. |

---

## 8. LES TROIS CHOSES À RETENIR

1. **P1.6 d'abord.** C'est display-only, ça ne déplace pas un kcal, ça touche 33 à 79 % des objectifs datés selon la grille, et **655 comptes sur 1 344 croient leur date atteignable alors qu'elle est fausse de 32 à 724 jours**. Livré en premier, il rend visible tout ce que les items suivants vont déplacer. Livré en dernier, il corrige un mensonge qu'on aura entre-temps aggravé.

2. **Le vrai risque de P1 n'est pas dans la spec.** Ce n'est ni Katch-McArdle ni le MET brut : c'est le **NEAT par défaut à 1,35**, qui efface 61 à 87 % du déficit de tes utilisateurs sédentaires et transforme une sèche en prise pour une femme de 95 kg à 45 % de masse grasse. Un seul chiffre — `desk = 1,20` à 0 séance — neutralise entièrement ce risque sans rien retirer au reste de P1.

3. **P1.3 casse un garde-fou P0 et son test.** Passer tout le monde en Mifflin rouvre un déficit de 84 kcal/j à la femme que l'escalade RED-S avait délibérément ramenée à la maintenance, et rend rouge `safety.test.ts` — la clôture documentée d'un défaut trouvé à l'audit adverse n° 2. À sortir de P1.