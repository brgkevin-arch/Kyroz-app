# Audit V1 — Étape 2 : Moteur
Date : 2026-08-26 · Commit audité : `39385dd` · Périmètre : `lib/tdee.ts`, `lib/planEngine.ts`, `lib/safety.ts`, `lib/calorieBank.ts`, **`lib/datedGoal.ts`** (5 439 lignes), leurs 7 fichiers de tests (3 473 lignes), les documents de règles, et les consommateurs pour la seule section K

> Audit, pas fix. Aucun fichier de code modifié. Les cas limites de la section H sont
> **exécutés** contre le moteur réel (`npx tsx -e`), sans créer de fichier dans le dépôt.
> Issu de `docs/audit-v1/briefs/02-moteur.md`.

## Reste à couvrir

### Documents de règles
- [x] où vivent réellement les règles validées — **pas de brief consolidé** ; la référence vivante est la ligne `ENGINE_REV` d'`AGENTS.md` (`:145`), le reste est archivé
- [x] **`lib/datedGoal.ts` (723 lignes) — MANQUÉ par le cadrage du brief**, alors qu'il porte trois des dix règles

### A. Matrice règle → code (10 règles)
- [x] R1 BMR Mifflin / Katch · R2 Katch interdit à adiposité élevée
- [x] R3 planchers caloriques et plafond de déficit
- [x] R4 plafonds de rythme par tier de MG
- [x] R5 floors FFM conditionnels
- [x] R6 protéines en g/kg de FFM
- [x] R7 plafond Alpert consultatif
- [x] R8 paliers obligatoires (> 15 kg ou > 6 mois)
- [x] R9 calorie bank
- [x] R10 NEAT

### B. R6 et continuité
- [x] condition de bascule, seuil, pondération
- [x] lissage et quantification du saut
- [x] Katch atteignable à MG élevée ?

### C. Ordre d'application
- [x] chaîne TDEE → déficit → plafonds → floors → arrondi

### D. Paliers
- [x] déclenchement, bornes, découpage, ce que voit l'utilisateur

### E. Protéines et FFM inconnue
- [x] FFM estimée, fallback protéines, floors désactivés

### F. Calorie bank vs cycling
- [x] `lib/calorieBank.ts` et le calcul de `dayTargetKcal` — double comptage ?

### G. NEAT
- [x] multiplicateurs, valeurs, source, contradiction doc ↔ code

### H. Cas limites — EXÉCUTÉS
- [x] les 11 cas du brief

### I. Déterminisme
- [x] `Date.now()`, fuseau, deux appels identiques

### J. Tests existants
- [x] matrice règle × test

### K. Cohérence affichage
- [x] écrans : valeurs du moteur ou recalcul local, arrondis, somme des macros

## A. Règle → code

| # | Règle (formulation du brief) | Fonction (`fichier:ligne`) | Statut | Écart |
|---|---|---|---|---|
| 1 | BMR Mifflin par défaut, Katch si R6 ; **lissage à la bascule** | `calculateBMR` `tdee.ts:159`, `melangeVersKatch` `:123` | ✅ **implémentée** | Le lissage recommandé **existe** (« R6 lissée », `ENGINE_REV` 8) : fenêtre 0,5 → 1,5 bande d'incertitude, `BLEND_START`/`BLEND_WIDTH` `:84-86` |
| 2 | Katch **jamais** retenu à adiposité élevée | `katchEligible` `tdee.ts:65` | 🔴 **divergente** | Le chemin `%MG mesuré` va **droit à Katch, sans aucune garde d'adiposité**. Constat **02-01** |
| 3 | Planchers caloriques et plafond de déficit | `MIN_KCAL` `safety.ts:374` (H 1500 / F 1200), `EA_HARD_FLOOR = 30` `:367`, `safetyFloorKcal` `:546`, `MAX_DEFICIT_TDEE_RATIO = 0.25` `datedGoal.ts:51` | ✅ implémentée | Valeurs reportées ci-contre |
| 4 | Plafonds de rythme par tier de MG | `maxWeeklyLossPct` `datedGoal.ts:35` | ✅ implémentée | 0,5 %/sem si mince (H < 12 %, F < 20 %) · **1,25 %** si adiposité haute · 0,75 % sinon. Le seuil haut est **partagé** avec `highAdiposity`, explicitement, pour que les deux bandes ne divergent pas |
| 5 | Floors FFM désactivés au-dessus de **20 % MG homme** | `highAdiposity` `safety.ts:281`, `HIGH_ADIPOSITY_PCT` `:274` | ⚠️ **c'est le BRIEF qui diverge** | Le code retire les planchers dérivés de la masse maigre à **30 % (H) / 40 % (F)**, pas 20 %. `AGENTS.md:145` documente ce seuil comme `ENGINE_REV` 7 (E30). **Le code et la référence vivante s'accordent ; c'est la règle 5 du brief d'audit qui est périmée.** Cf. « Hors périmètre » |
| 6 | Protéines en g/kg de **FFM** | `proteinTarget` `tdee.ts:443`, `PROTEIN_MIN/MAX_PER_KG_FFM` `:423-424` (1,6 → 2,6) | ✅ implémentée | — |
| 7 | Plafond Alpert **consultatif** | `safety.ts:297` (commentaire seul) | ⚠️ **absente en tant que contrainte** | Alpert n'apparaît que comme justification écrite du plancher d'énergie disponible (~31 kcal/kg de MG/j, « valeur exacte incertaine »). Il n'existe **aucun calcul ni signal Alpert** — ce qui est **conforme** à « signal consultatif, pas une contrainte dure », mais il n'y a alors aucun signal du tout |
| 8 | Paliers obligatoires si > 15 kg ou > 6 mois | `dietBreakDue` `safety.ts:913`, `DIET_BREAK_AFTER_WEEKS = 8` `:855`, `MAX_PROJECTION_WEEKS = 260` `datedGoal.ts:102` | ⚠️ **implémentée AUTREMENT** | Pas de découpage par kg ni par durée. À la place : **une semaine servie à la maintenance après 8 semaines de déficit CONSÉCUTIVES**, qui se répète. Déclenche plus tôt, plus souvent, et couvre aussi les objectifs sous 15 kg. Les profils que la pause ne couvre pas (`isFemaleAtRisk` hors adiposité haute) reçoivent l'escalade de zone basse — `dietBreakApplies` `:908` documente ce partage et **interdit d'empiler les deux** |
| 9 | Calorie bank hors gate premium, rythme hebdo | `bankedDailyTargets` `calorieBank.ts:142`, `bankOf` `planEngine.ts:1182` | ⛔ **ÉTEINTE** | `bankOf` renvoie `undefined` tant que `RYTHME_HEBDOMADAIRE_ACTIF` est `false`. L'UI est gardée par **le même** drapeau (`profil.tsx:670`, `:766`) : rien n'est promis qui ne marche pas. Cf. section F |
| 10 | NEAT — incohérence connue doc ↔ note dev | `NEAT_PAL` `tdee.ts:172` | ⚠️ **localisée** | Code : **1,30 / 1,35 / 1,40 / 1,45**. Deux documents portent encore **1,20 / 1,28 / 1,36 / 1,45** sans marqueur de correction. Constat **02-06** |

## Chaîne d'application (section C)

```
birth_date → age (dérivé, computePlan tdee.ts:1212)
  → BMR         calculateBMR tdee.ts:159      Katch si mesuré · mélange si estimé · Mifflin sinon
  → × NEAT      neatPal tdee.ts:231           1,30 → 1,45
  → + sport/j   dayExpenditures planEngine.ts:1230   MET nets, répartis sur les jours d'ENTRAÎNEMENT
  = TDEE        calculateTDEE tdee.ts:366
  → déficit demandé selon l'objectif
  → PLAFOND de déficit   MAX_DEFICIT_TDEE_RATIO = 0,25 · datedGoal.ts:51   (en AMONT, pas en aval)
  → PLAFOND de rythme    maxWeeklyLossPct datedGoal.ts:35
  → PLANCHERS            safetyFloorKcal safety.ts:546 — le MAX de plusieurs candidats
  → arrondi              Math.round, une seule fois, sur la valeur servie
```

**Qui gagne quand un plancher contredit un plafond ?** Le plancher — et il gagne **en dernier**, ce qui est le bon ordre. `safetyFloorKcal` renvoie le **maximum** des candidats (`min_kcal`, `energy_availability`, `underweight_maintenance`, `deficit_cap`), et `ComputedPlan.clamp.source` **nomme celui qui a mordu**. Les 11 cas de la section H confirment : `clamp` est toujours renseigné et cohérent avec la valeur servie. **Aucun plancher contournable trouvé** — un plancher appliqué n'est jamais ré-écrasé en aval, l'arrondi étant le seul maillon après lui.

> 🔴 **PÉRIMÈTRE, ajouté le 2026-08-27 (contre-audit `CA-2-02`).** Cette phrase est vraie
> **à l'intérieur de `computePlan`**, et elle a été re-vérifiée : sur 274 428 profils, la
> cible n'est jamais sous son plancher, écart max 0 kcal. Elle **ne vaut pas** du nombre
> que l'écran affiche. Deux maillons suivent : `planEngine.baseDayTargets` et
> `bankedTargets` re-plafonnent avec `bankFloorKcal` = `max(BMR, filet absolu)`,
> strictement plus bas que le plancher de sécurité, et c'est `dayTargetKcal` que lit
> `plan.tsx`. **Mesuré sur 75 264 profils : 44,2 % ont au moins un jour sous le plancher
> de sécurité, jusqu'à 1 103 kcal/j.**
> ⚠️ **Ce n'est pas un défaut, et il ne faut PAS le « corriger ».** L'énergie disponible
> est une moyenne soutenue — le produit la compte en semaines. La répartition par volume
> conserve le total hebdomadaire, donc l'exposition est inchangée : re-mesuré, **0
> violation** sur la conservation ET sur la moyenne hebdomadaire face au plancher.
> Borner la cible du jour au plancher de sécurité, c'est appliquer jour par jour un seuil
> qui ne l'est pas — le calcul exact qui a fait rejeter la spec P2.1 le 2026-07-29.
> ➡️ La propriété est désormais **comptée** : `lib/__tests__/plancherServi.test.ts`.
> Tout futur constat de sécurité calorique se mesure sur `dayTargetKcal`, jamais sur
> `computePlan`.

⚠️ Un point d'architecture qui mérite d'être noté comme une **qualité** : `ClampRecord` est produit **une seule fois**, par le moteur, et l'écran ne redéduit rien (`tdee.ts:1191-1196` le dit explicitement). C'est ce qui rend la section K propre.

## F. Réponse à la question calorie bank vs cycling

**Réponse : OUI, le cyclage couvre déjà le même chemin — et la banque est aujourd'hui ÉTEINTE, donc aucun double comptage n'est possible.**

Preuve, mesurée sur le moteur (homme 90 kg, sèche, 5 séances, repos samedi + dimanche) :

```
TDEE maintien 2714 · cible plate 2430
jour   1     2     3     4     5     6     7      somme
base 2160  2538  2538  2538  2538  2538  2160    17010  = 7 × 2430
```

Le cyclage seul (`baseDayTargets`) écarte déjà les jours de **378 kcal**, en conservant le total hebdomadaire à l'unité près. Une banque de +600 posée sur un jour du plan **n'a strictement aucun effet** : `bankOf` (`planEngine.ts:1182-1184`) renvoie `undefined` tant que `RYTHME_HEBDOMADAIRE_ACTIF` est `false`, mesuré → cibles après banque **identiques** aux cibles de base, `uncompensatedKcal = 0`.

**Si le drapeau était rallumé**, les deux mécanismes **s'additionnent bien sur la même journée** — mesuré en court-circuitant le drapeau :

```
jour   1     2     3     4     5     6     7      somme
base 2160  2538  2538  2538  2538  2538  2160    17010
+600 2060  2438  3138  2438  2438  2438  2060    17010   ← jour 3 : 3138 > TDEE 2714
```

Le total de la semaine est préservé (la compensation fonctionne), mais **un jour d'entraînement crédité passe 424 kcal au-dessus de la maintenance sur un profil en sèche**. Ce n'est pas une fuite de déficit ; c'est un jour au-dessus de la dépense, ce que la question du brief visait. Constat **02-05**, conditionné au rallumage.

## H. Cas limites exécutés

Exécutés contre le moteur réel (`npx tsx -e`, aucun fichier créé dans le dépôt), `today = 2026-08-26`.

| Cas | Entrées | Sortie obtenue | Attendu | OK ? |
|---|---|---|---|---|
| H1 | F 45 kg / 160 cm / MG 18 % mesurée / cut | TDEE 1517 · **cible 1517** · plancher 1517 · clamp `underweight_maintenance` · drapeaux `FLOOR_APPLIED`, `UNDERWEIGHT_NO_DEFICIT` | plancher atteint, aucun déficit | ✅ |
| H2 | H 140 kg / 178 cm / MG 45 % **mesurée** / cut | Mifflin 2318 · Katch 2033 · **BMR servi 2033** · cible 2343 · clamp `deficit_cap` · `highAdiposity: true` | **Mifflin, jamais Katch** | 🔴 **NON — 02-01** |
| H3a | MG saisie **3 %** | bornée à **5 %** (`bodyFatBounds` = [5, 60]) · cible 2582 | bornée | ✅ |
| H3b | MG saisie **70 %** | bornée à **60 %** · cible 1500 · clamp `min_kcal` | bornée | ✅ |
| H4a | âge **16** | `checkEligibility` → **`MINOR`** · le moteur calcule quand même (2235) | comportement défini | ✅ (le blocage est en amont, `blocksPlanGeneration`) |
| H4b | âge **85** | aucun bloc · cible 1787 · clamp `deficit_cap` | comportement défini | ✅ |
| H5 | objectif daté = poids actuel | cible = TDEE 2314 · aucun drapeau · **aucune division par la durée** | déficit 0 | ✅ |
| H6 | prise de masse (`lean_bulk`) | TDEE 2444 → **cible 2644** (+200) | surplus plafonné | ✅ (`MAX_GAIN_RATE_PCT = 0,5 %/sem`) |
| H7 | profil **sans MG** | `katchEligible: false` · MG estimée 24,0 % · FFM 68,4 kg · Mifflin · cible 2144 | Mifflin, floors désactivés, protéines fallback | ✅ |
| H8 | balayage MG 10 → 30 % par 0,5 pt (estimée) | **saut maximal 28 kcal/j**, au voisinage de 15,5 % | continuité, < 100 kcal/j | ✅ **le lissage R6 fait son travail** |

> 🔴 **CETTE FENÊTRE S'ARRÊTE SUR LE POINT DE RUPTURE — contre-audit `CA-2-01`,
> 2026-08-27.** 30 %, c'est exactement `HIGH_ADIPOSITY_PCT.male`. Le balayage se fermait
> donc au seuil au lieu de le franchir. Mesuré au-delà : **115 kcal/j**, au-dessus du
> critère « < 100 » que cette ligne se donne elle-même — et le saut ne rétrécissait PAS
> quand le pas rétrécissait (137 · 115 · 112 aux pas 0,5 · 0,05 · 0,005 pt), donc c'était
> une discontinuité et non une pente. **Corrigé** : retrait progressif sur 5 points
> (`ADIPOSITY_BLEND_PTS`, `ENGINE_REV` 8 → 9). Après : 137 · 34 · 4.
> ➡️ Une fenêtre de continuité doit FRANCHIR les seuils du moteur, jamais s'y arrêter.
> La propriété est désormais comptée : `lib/__tests__/continuiteSeuilAdiposite.test.ts`.
| H9a | date objectif **passée** (2020) | cible 2144, identique au profil sans objectif daté · **aucun drapeau, aucun message** | erreur propre | ⚠️ pas de NaN, mais **silencieux** — 02-04 |
| H9b | date objectif = **aujourd'hui** (durée 0) | idem, pas de NaN ni division par zéro | erreur propre | ✅ |
| H10 | chaque champ à `undefined`, un à la fois | `sex`, `age`, `weight_kg`, `height_cm` → 🔴 **NaN** sur TDEE, cible, plancher et les 3 macros · `goal` → 🔴 **THROW** · `activity_level`, `training_days_per_week`, `plan_days`, `meals` → sains | erreur propre, pas NaN | 🔴 **NON — 02-02, 02-03** |
| H11 | unités impériales | **non supporté** — aucune conversion dans le moteur, la saisie est métrique | — | s. o. |

## J. Règle × test

| Règle | Test(s) | Couvre les bornes ? |
|---|---|---|
| 1 · lissage R6 | `r6Lissee.test.ts` (242 l.), `bodyFatSource.test.ts` | ✅ dédié |
| 2 · Katch / adiposité | `bodyFatSource.test.ts` | ⚠️ teste la **provenance**, jamais l'adiposité au moment de servir Katch — c'est pourquoi 02-01 survit |
| 3 · planchers | 8 fichiers dont `safety.test.ts` (1 206 l.) | ✅ |
| 4 · rythme | 6 fichiers dont `datedGoal.test.ts` | ✅ |
| 5 · floors FFM | `bodyFatSource.test.ts` | ✅ |
| 6 · protéines FFM | `tdee.test.ts`, `safety.test.ts`, `methodologie.test.ts` | ✅ |
| 7 · Alpert | — | rien à tester : aucun calcul |
| 8 · pause | `pauseMaintenance.test.ts`, `methodologie.test.ts` | ✅ |
| 9 · banque | `calorieBank.test.ts`, `volumeConcentre.test.ts` | ✅ la mécanique ; ⚠️ **rien ne teste la composition banque × cyclage** |
| 10 · NEAT | 7 fichiers | ✅ les valeurs ; ⚠️ **aucun test ne confronte la table du code aux tables écrites dans la doc** |
| — · **profil incomplet** | **aucun** | 🔴 c'est le trou qui laisse passer 02-02 |

## K. Affichage

**Aucune seconde implémentation trouvée.** Les écrans lisent `ComputedPlan` ; `clamp.source` est produit par le moteur et l'écran ne le redéduit pas (`tdee.ts:1191-1196`). `dayTargetKcal` (`planEngine.ts:1251`) est la source unique du budget du jour, appelée aussi bien par le moteur (`:1636`, `:1755`) que par l'écran Plan (`plan.tsx:778`).

**La somme des macros affichées recolle-t-elle aux kcal affichées ?** Mesuré sur **96 profils** (2 sexes × 4 poids × 4 %MG × 3 objectifs) : écart **maximal 0,13 %** — 2 kcal sur 1 514 (femme 70 kg, MG 30 %, cut). C'est l'arrondi entier des grammes, rien d'autre, et c'est très en deçà de `SPLIT_DIVERGENCE_TOLERANCE_PCT = 2` (`tdee.ts:563`). **Aucun écart visible, aucun mensonge d'affichage.**

## Constats

### 02-01 Katch-McArdle est servi à adiposité élevée dès que le %MG est *mesuré*
> ✅ **CORRIGÉ le 2026-08-27** — fiche : `AGENTS.md` **A43**, `tdee.ts::katchRetenu`,
> `ENGINE_REV` 9 → 10, garde-fou `katchAdiposite.test.ts` (7 mutations, 7 rouges).
> Le mécanisme tient exactement comme décrit — et **la reco demandait deux règles
> différentes sans le voir** :
> · sa 1ʳᵉ phrase (« la même asymétrie que le chemin estimé ») est ce qui a été appliqué ;
> · sa 2ᵉ (« au-dessus du seuil d'adiposité, servir Mifflin ») est une AUTRE règle, et
>   elle est **fausse**. Mesuré sur 40 320 corps : le croisement Katch = Mifflin court de
>   **6 à 52 %** de MG selon le gabarit — un seuil fixe coupe au mauvais endroit dans les
>   deux sens — et couper au seuil introduit une marche de **571 kcal/j VERS LE BAS**
>   chez les gabarits lourds. Elle aurait fait manger moins aux corps que ce constat
>   voulait protéger, et rouvert la discontinuité fermée par `CA-2-01`.
> ⚠️ Coût mesuré sur **645 120 profils** du chemin concerné : 344 406 bougent, **tous vers
> le haut**, moyenne +409 kcal/j. Ventilation par %MG et détail : A43.
- **Sévérité : P0** — la section B du brief est explicite : « Le sélecteur peut-il retenir Katch pour un profil à MG élevée ? Oui = P0 ».
- **Preuve** : `calculateBMR` (`lib/tdee.ts:159`) commence par `if (katchEligible(b)) return Math.round(katchRaw(b));`. `katchEligible` (`:65`) ne teste que `body_fat_source === 'measured'` et `body_fat_pct > 0` — **aucune garde d'adiposité**, alors que le prédicat `highAdiposity` existe et est utilisé ailleurs (`safety.ts:281`).
- **Mesuré sur le moteur** (homme 120 kg, 178 cm, 40 ans, `body_fat_source: 'measured'`, cut) :

  | %MG mesuré | Mifflin | Katch | **BMR servi** | servi − Mifflin | cible servie | `highAdiposity` |
  |---|---|---|---|---|---|---|
  | 25 % | 2118 | 2314 | 2314 | +196 | 2708 | false |
  | 30 % | 2118 | 2184 | 2184 | +66 | 2539 | false |
  | **35 %** | 2118 | 2055 | **2055** | **−63** | 2372 | **true** |
  | **45 %** | 2118 | 1796 | **1796** | **−322** | 2035 | **true** |
  | **50 %** | 2118 | 1666 | **1666** | **−452** | 1866 | **true** |

  Le croisement se situe vers **32 % de MG** : au-delà, Katch sert systématiquement **moins** que Mifflin, et l'écart croît sans borne.
- **Ce qui rend le constat solide plutôt qu'une querelle de formule** : **le code lui-même écrit l'argument contraire**. Le docstring de `melangeVersKatch` (`tdee.ts:113-121`) dit noir sur blanc — « Katch compte le tissu adipeux à ZÉRO kcal, donc son erreur CROÎT avec la masse grasse — côté gras, Mifflin est la plus précise des deux (mesuré sur n=3001 et n=731) » — et la branche « estimé » applique cette conclusion (mélange = 0 sur tout le côté gras). **Seule la branche « mesuré » ne l'applique pas.** Ce n'est pas une science à rouvrir, c'est une règle appliquée à un chemin sur deux.
- **Risque** : santé utilisateur. Une personne à 45 % de MG qui renseigne un %MG mesuré (balance connectée, DEXA) reçoit une cible **~300 kcal/j sous** ce que la formule de référence donnerait, en plus du déficit demandé. Les planchers rattrapent le pire, pas l'écart.
- **Reco** : soumettre le chemin « mesuré » à la même asymétrie que le chemin « estimé » — au-dessus du seuil d'adiposité, servir Mifflin. Une ligne dans `katchEligible`, un test qui la voit rougir.
- **Effort : S** (le correctif) · **M** (avec la mesure d'impact sur le parc, qui est le vrai coût — cf. A38 : « un tableau d'impact se re-mesure, il ne se recopie pas »)

### 02-02 Une ligne cloud partielle produit un plan entièrement NaN
> ✅ **CORRIGÉ le 2026-08-27** — fiche : `AGENTS.md` **A43**, `lib/profilComplet.ts`,
> drapeau `PROFIL_INCOMPLET`, garde-fou `profilIncomplet.test.ts` (8 mutations, 8 rouges).
> 🔴 **La reco n'aurait fermé qu'un cinquième du trou**, et une garde « pas de NaN »
> n'aurait attrapé qu'UN champ sur cinq. Balayage des 41 colonnes sur le moteur réel
> (`npm run mesure:incomplet`) : seul `sex` rend du `NaN` · `weight_kg` et `height_cm`
> rendent un nombre **fini et absurde** (1500 kcal, 0 g de protéines) · **`macro_mode`,
> absent de la liste des quatre**, sert 0 g de protéines ou fait GELER les cibles ·
> et `age` rend un nombre **plausible** et faux de 260 kcal, ce qui est pire.
> ➡️ La ligne de partage n'est pas « casse ou pas », c'est **« MESURE ou INTENTION »** —
> `goal` et `macro_mode` se replient, le CORPS se refuse.
> ⚠️ Trois étages, trois pannes : le moteur REFUSE · `bootProfile` ne sert pas un profil
> sans corps · `hasCloud` teste le corps entier. Et refuser n'est pas effacer.
- **Sévérité : P0** — « `NaN`, `Infinity` ou `undefined` en sortie sur un cas = P0 ».
- **Preuve, exécutée** : une ligne `profiles` où seul `sex` est posé (`age`, `weight_kg`, `height_cm` à NULL) passe la garde d'hydratation — `hasCloud: !!(row && row.sex)`, `lib/sync.ts:382` — puis :

  ```
  tdee_kcal   : NaN     target_kcal : NaN     floor_kcal : NaN
  protéines / glucides / lipides : NaN NaN NaN
  drapeaux    : ["LOW_EA_WARNING"]      ← il PRÉTEND avoir conclu
  ```
- **Cette ligne est atteignable, et le code sait déjà qu'elle existe** : aucune colonne de `profiles` n'est `NOT NULL` hors `id` et les défauts (`supabase/schema.sql:26-146`), `handle_new_user` (`:271`) n'insère que `(id, email)`, et `pushProfile` journalise explicitement un cas de **profil poussé PARTIELLEMENT** avec des colonnes non écrites (`lib/sync.ts:274`). Côté lecture, `hooks/useProfile.ts:60` appelle `recalcProfile(stored)` sur ce qui est stocké, **sans contrôle d'exhaustivité**.
- **Le plus gênant n'est pas le NaN, c'est le drapeau** : `LOW_EA_WARNING` est émis alors qu'aucune valeur n'a pu être calculée. Un état d'échec total ressort habillé en diagnostic.
- **Risque** : plan vide ou aberrant, macros `NaN` affichées, et un avertissement de sécurité qui ne mesure rien.
- **Reco** : une garde d'exhaustivité en entrée de `computePlan` — les quatre champs qui font le BMR (`sex`, `age`, `weight_kg`, `height_cm`) sont requis ou le plan n'est pas calculé, avec un état « profil incomplet » explicite. Et `hasCloud` doit tester ces quatre champs, pas le seul `sex`.
- **Effort : M**

### 02-03 `goal` absent fait lever une exception non rattrapée
> ✅ **CORRIGÉ le 2026-08-27** — fiche complète : `AGENTS.md` **A40**. Le constat tient,
> et il était trop étroit de trois façons : ce n'était pas un crash mais un **gel
> définitif** de l'app (pas de `.catch()` au démarrage, valeur relue à chaque lancement) ·
> ce n'était pas `undefined` seul mais aussi `null`, `''` et toute valeur saisie en base ·
> ce n'était pas `computePlan` seul mais aussi `goalLabel` / `goalSubtitle` /
> `recommendedProteinPerKg`, dont deux sont appelés EN RENDU. Repli sur `maintain`
> (`GOAL_FALLBACK`), donnée refermée par `normalizeGoal`, et le MÉCANISME rattrapé pour
> tous les champs (`lib/profileBoot.ts`). Aucun `ENGINE_REV` — prémisse comptée.
- **Sévérité : P1**
- **Preuve, exécutée** : `computePlan(makeProfile({ goal: undefined }))` → `TypeError: Cannot read properties of undefined (reading 'kcalDelta')`.
- **Risque** : `goal` est `text` sans contrainte NOT NULL en base ; une ligne sans objectif fait planter le calcul au lieu de dégrader. Contrairement à 02-02, c'est visible — mais c'est un crash.
- **Reco** : repli sur `maintain`, ou refus explicite. Même garde que 02-02.
- **Effort : S**

### 02-04 Un objectif daté PASSÉ est ignoré en silence
- **Sévérité : P2**
- **Preuve, exécutée** : `goal_target.target_date = '2020-01-01'` → sortie **strictement identique** au même profil sans objectif daté (cible 2144, plancher 2051), **aucun drapeau**, aucun message. Idem pour une durée de zéro jour.
- **Risque** : pas de NaN, pas de division par zéro — le moteur se comporte bien. Mais quelqu'un dont la date est dépassée continue de voir un plan sans jamais apprendre que son objectif daté ne pilote plus rien. C'est la règle « zéro malhonnêteté » par omission.
- **Reco** : un drapeau `DATED_GOAL_EXPIRED` et une phrase, à traiter avec les textes (étape 6b).
- **Effort : S**

### 02-05 Banque + cyclage s'additionnent — inoffensif aujourd'hui, à re-mesurer avant tout rallumage
- **Sévérité : P2** (conditionnelle : **aucun effet tant que `RYTHME_HEBDOMADAIRE_ACTIF` est `false`**)
- **Preuve, exécutée** : drapeau court-circuité, +600 kcal posés sur un jour d'entraînement, profil en sèche → ce jour passe à **3 138 kcal contre un TDEE de maintien de 2 714**, soit **+424 au-dessus de la dépense**. Le total hebdomadaire reste exact (17 010 = 7 × 2 430) : la compensation fait son travail, le cumul journalier n'est pas borné par la maintenance.
- **Ce qui est correct aujourd'hui** : `bankOf` (`planEngine.ts:1182`) coupe la banque, **et l'UI est gardée par le même drapeau** (`profil.tsx:670`, `:766`). Rien n'est promis qui ne fonctionne pas.
- **Risque** : nul en l'état ; réel au rallumage, et **aucun test ne couvre la composition des deux mécanismes** (cf. tableau J).
- **Reco** : avant tout rallumage, borner la cible du jour à la dépense du jour, et un test qui compose banque × cyclage.
- **Effort : S**

### 02-06 La table NEAT est écrite trois fois, et deux copies sont périmées
- **Sévérité : P3**
- **Preuve** : le code sert **1,30 / 1,35 / 1,40 / 1,45** (`lib/tdee.ts:172`, relevé le 2026-07-31). Portent encore l'ancienne table **1,20 / 1,28 / 1,36 / 1,45** :
  - `supabase/schema.sql:58` — commentaire du **schéma courant**, sans marqueur ;
  - `AGENTS.md:8558` — phrase de référence, **sans marqueur de correction**, alors que `AGENTS.md:8541` en porte un (« ⚠️ relevé à 1,30 / 1,35 / 1,40 / 1,45 le 2026-07-31 »). Deux lignes du même fichier se contredisent.
  - *(`supabase/migrations/2026-07-28_…sql:11` porte aussi l'ancienne table — **légitime** : une migration est datée, son commentaire décrit son époque.)*
- **Ce qui n'est PAS touché, et qui est le point important** : `lib/methodologie.ts` — la page méthodologie vue par l'utilisateur — **ne publie aucun de ces nombres**. Rien de faux n'est montré à personne. C'est ce qui maintient ce constat en P3.
- **Reco** : une seule source. Un test qui compare la table citée dans la doc à `NEAT_PAL` (le dépôt en a déjà de cette forme : `neat-libelles.test.ts`).
- **Effort : S**

### 02-07 Les bornes de %MG de la base et celles du moteur divergent
- **Sévérité : P3**
- **Preuve** : `supabase/schema.sql:36` contraint `body_fat_pct` à **[3 ; 65]** ; `bodyFatBounds('male')` (`lib/safety.ts:42`) rend **[5 ; 60]**, et le moteur clampe à la lecture (mesuré : 3 % → 5 %, 70 % → 60 %).
- **Risque** : nul pour le calcul — le clamp protège. Mais la base accepte des valeurs que le moteur n'honore jamais, donc la valeur STOCKÉE peut différer de la valeur SERVIE sans que rien ne le dise.
- **Reco** : aligner la contrainte SQL sur les bornes du moteur, ou documenter que la base est plus large à dessein.
- **Effort : S**

### 02-08 Il n'existe pas de brief consolidé des règles moteur — mais la traçabilité, elle, existe
- **Sévérité : P3** (le brief prescrit P2 ; je descends d'un cran et je dis pourquoi — règle 6)
- **Preuve** : `git ls-files | xargs grep -IlE 'Alpert|Katch|R6'` ne rend, hors code et tests, que des documents **archivés** (`docs/archive/2026-07-29-moteur-v2-corrections.md`, `…2026-06-18-brief-macros-calories.md`, `…2026-07-28-audit-p1-mesures.md`) et un **brainstorm** explicitement non-spec (`../archive/2026-08-15-brief-banque-de-calories.md`).
- **Pourquoi P3 et non P2** : la traçabilité n'est pas absente, elle a une autre forme — la ligne `ENGINE_REV` d'`AGENTS.md:145` tient l'historique daté et motivé des révisions 5 → 8, chacune reliée à sa mesure. C'est ce qui a permis de trancher les règles 5 et 8 de ce brief. Le manque réel est qu'elle est **répartie**, pas qu'elle n'existe pas.
- **Reco** : si un document consolidé est voulu, le **dériver** de la ligne `ENGINE_REV` plutôt que de le réécrire — sinon il y aura deux vérités.
- **Effort : M**

## Checklist humaine

- [ ] Trois profils (cas H1, H2, H7) recalculés à la main dans un tableur et comparés aux sorties du moteur.
- [ ] Décision produit NEAT tranchée (doc ou code : lequel fait foi).
- [ ] Décision lissage R6 (implémenter, ou accepter le saut et le documenter).

## Hors périmètre / non couvert

🔴 **DEUX RÈGLES DU BRIEF D'AUDIT SONT ELLES-MÊMES FAUSSES OU PÉRIMÉES.** Elles sont signalées ici plutôt que comptées en constats, parce que le défaut est dans la spec, pas dans le produit :

- **Règle 5** — « floors FFM désactivés au-dessus de **20 % MG chez l'homme** ». Le code retire les planchers dérivés de la masse maigre à **30 % (H) / 40 % (F)** (`HIGH_ADIPOSITY_PCT`, `safety.ts:274`), et `AGENTS.md:145` documente ce seuil comme la révision `ENGINE_REV` 7 (E30), motivée et datée. **Le code et la référence vivante s'accordent ; c'est le brief qui est périmé.** Même famille que l'audit P1, dont la mémoire retient qu'il « avait trouvé la spec fausse trois fois ».
- **Règle 8** — « paliers obligatoires si objectif > 15 kg ou > 6 mois ». Aucun découpage par kg ni par durée n'existe, et **c'est un choix, pas un oubli** : la pause à la maintenance après 8 semaines de déficit consécutives (`dietBreakDue`, `safety.ts:913`) déclenche plus tôt, se répète, et couvre aussi les objectifs sous 15 kg. `dietBreakApplies` (`:908`) documente en outre pourquoi on n'empile pas cette pause avec l'escalade de zone basse — « un garde-fou qui désarme l'autre est pire que pas de second garde-fou ». Statuer « absente = P0 » aurait été juste sur la lettre et faux sur le fond.

⚠️ **Le cadrage du brief manque un fichier du moteur.** Son motif de recherche (`planEngine|calorieBank|recalcProfile|engine|bmr|tdee|macro`) ne trouve pas **`lib/datedGoal.ts`** (723 lignes), qui porte pourtant `maxWeeklyLossPct` (règle 4), `MAX_DEFICIT_TDEE_RATIO` (règle 3) et `MAX_GAIN_RATE_PCT`. Il a été ajouté au périmètre. Un inventaire par motif de NOM manque ce qui est bien nommé autrement.

**Non couvert, à assumer :**
- **`lib/planEngine.ts` n'a été lu que sur ses chemins de calcul** (`dayTargetKcal`, `bankedTargets`, `dayExpenditures`, `baseDayTargets`). La génération de repas elle-même — choix des recettes, adaptation, rééquilibrage — n'est pas dans le périmètre de cette étape.
- **Les 3 473 lignes de tests n'ont pas été relues** ; le tableau J est établi par la présence des symboles, pas par la lecture de chaque assertion. Un test présent n'est pas un test qui a rougi (cf. `garde-fou-verifie-par-mutation`).
- **Unités impériales** : le moteur est métrique de bout en bout. Rien à convertir, donc rien à auditer — c'est un « non applicable », pas un « non vérifié ».
- **Le plafond Alpert** n'existant sous aucune forme calculée, il n'y a pas de comportement à mesurer. Savoir s'il en faut un est une décision produit, pas un constat d'audit.
- **Étape 6b (textes)** : le silence sur un objectif daté expiré (02-04) et l'absence de message quand un plancher mord y trouveront leur formulation.
- **Étape 4** : la dette de test révélée par le tableau J (profil incomplet, composition banque × cyclage, doc ↔ `NEAT_PAL`).
