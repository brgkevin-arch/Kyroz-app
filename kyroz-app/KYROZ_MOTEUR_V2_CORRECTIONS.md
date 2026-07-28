# Kyroz — Corrections du moteur de calcul (v2)

> Document de spec des corrections du moteur nutrition/sport.
>
> **Contrainte non négociable :** le moteur reste 100 % déterministe. Aucune IA,
> aucun appel réseau, aucune horloge implicite autre que la date passée en paramètre.
> Mêmes entrées = mêmes sorties.
>
> **Méthode :** trois PR successives, dans l'ordre P0 → P1 → P2. Ne pas fusionner.
> Chaque PR doit passer sa propre section de tests avant la suivante.

## État

| PR | Contenu | État |
|---|---|---|
| **PR 1** | P0.1 → P0.4 — sécurité | ✅ **Livré + audité** (branche `fix/moteur-p0-securite`, 2026-07-28) |
| PR 2 | P1.1 → P1.6 — cohérence et justesse | À faire |
| PR 3 | P2.1 → P2.2 — fonctionnalités manquantes | À faire |

### Audit adverse du P0 (2026-07-28)

Cinq angles indépendants sur le code livré : plancher & registre, synchro &
persistance, mathématiques de l'objectif daté, protéines & macros, appelants & UI.
**11 défauts trouvés et corrigés**, dont plusieurs sur les correctifs P0 eux-mêmes
(le garde-fou qui prescrivait un surplus, le registre qui ne se vidait jamais, le
mode « Perso % » qui annulait le correctif protéique, le plancher non rétroactif).
Détail dans les sections concernées ci-dessous, et dans `AGENTS.md`.

**Vérifié SAIN par l'audit — ne pas ré-auditer.** `weekStartStamp` est cohérent
avec `localStamp` (heure locale, jamais `toISOString`) et correct aux deux bascules
d'heure d'été 2026 · idempotence des modes `auto` et `percent` vérifiée sur 3 456
profils (sexe × mode × objectif × poids × %MG × semaines) · croissance du registre
bornée à 53 entrées après 400 jours de recalcul quotidien · doublons neutralisés
par le `Set` de `lowEaWeeksInWindow` · stamps invalides exclus proprement (NaN) ·
poids nul → pas de division par zéro · monotonie du plancher vs semaines ·
cohérence `4P+4G+9L` vs `target_kcal` ≤ 2 kcal en auto, ≤ 4 en percent · grammes
négatifs impossibles · `MacroSplit` reçoit bien la même dépense sportive que le
producteur · `withRecalc` dans MacroEditor n'écrase aucun réglage · l'aperçu de
l'éditeur d'objectif daté est exactement ce que `submit` enregistre ·
`pregnant_or_breastfeeding` non renseigné n'est pas un trou (le portail
`healthScreening` bloque en amont).

---

## P0.5 et P0.6 — les deux points laissés ouverts (livrés le 2026-07-28)

### P0.5 — le registre comptait des enregistrements, pas des semaines vécues

`recalcProfile` n'est appelé qu'au chargement de l'app, à l'édition du profil et à
la pesée : le registre estampillait donc l'instant du recalcul. Deux femmes au
comportement identique sur 26 semaines de sèche obtenaient 26 semaines comptées si
elles se pesaient chaque semaine, 7 si elles se pesaient chaque mois — soit
~221 kcal/j de protection RED-S en moins pour la seconde. **Un garde-fou qui
récompense la négligence n'est pas un garde-fou.**

La solution ne demande de supposer *rien* de ce qui s'est passé entre deux
ouvertures : le plan servi **reste en vigueur**. S'il était restrictif, les semaines
écoulées ont bien été vécues en restriction. On stocke donc le début de l'exposition
en cours (`since`) et on **solde** l'intervalle avant tout calcul de plancher.

```
low_ea_weeks : string[]  →  { weeks: string[]; since: string | null }
```

Ordre imposé dans `computePlan`, et il n'est pas négociable :
**solder → plancher → servir → clore**. Solder AVANT le plancher parce que les
semaines soldées sont de l'histoire (elles ont eu lieu quel que soit le plan qu'on
s'apprête à servir) ; `lowEaWeeksBefore` continue d'exclure la semaine courante,
donc l'idempotence tient. `markLowEaWeek` remet `since` à `null` dès qu'un plan non
restrictif est servi → **une vraie pause n'est jamais facturée**, et le registre
peut toujours se vider.

**Aucune migration.** La colonne est `jsonb` : on a fait évoluer la charge utile, pas
le schéma. Zéro couplage app/base, donc zéro fenêtre PGRST204 à la mise en ligne —
le mode de panne qui avait déjà mordu sur le P0. La forme legacy (tableau nu) reste
lue par `readLowEaRegistry`, plus jamais écrite ; elle se relit sans `since`, donc
au pire on sous-compte les quelques jours écoulés depuis le dernier recalcul en v1.
Sous-compter à la migration est le sens acceptable de l'erreur.

Garde-fous : rattrapage borné à la fenêtre de 12 mois (un `since` corrompu ne fait
pas tourner la boucle 2 700 fois), purge au-delà de 12 mois, semaines « futures »
conservées (l'horloge peut reculer). `lowEaWeeksForFloor` est le **point d'entrée
unique** de tout aperçu d'écran : sans lui, un aperçu afficherait un plan que
`computePlan` n'enregistrera pas.

### P0.6 — l'éligibilité garde les portes d'entrée, pas le temps qui passe

Quelqu'un qui commence sa sèche à IMC 19 et descend à 17,8 en dix semaines
franchissait le seuil sans que rien ne bouge. `checkEligibility` n'est interrogée
qu'à la saisie ; et le seul garde-fou restant — le plancher d'énergie — **autorise**
précisément un déficit tant qu'on reste au-dessus de 30 kcal/kg de masse maigre. Il
n'existait donc aucun mécanisme pour arrêter une sèche qui va trop loin.

C'est la faille la plus dangereuse du moteur, pour une raison précise : elle ne se
déclenche que chez les personnes qui **suivent le plan le plus assidûment**.

`deficitBlocked(body)` — même seuil et même prédicat que `checkEligibility`, source
unique — est évalué à chaque calcul dans `floorAndFlags`. Sous IMC 18,5 le plancher
monte à la **maintenance**. Jamais au-dessus : imposer un surplus reviendrait à
prescrire une prise de poids à quelqu'un qui a demandé une sèche, ce qui est son
objectif à changer, pas au moteur de le faire à sa place. Le plan cesse simplement
de creuser, et l'UI dit pourquoi (`UNDERWEIGHT_NO_DEFICIT`).

Conditionné à un déficit **réellement demandé** : sinon un objectif « maintien » à
IMC 18 verrait son plancher rejoindre sa cible et lèverait `FLOOR_APPLIED` pour un
plan que rien ne contraint.

Côté objectif daté, `DatedGoalStatus.underweightBlocked` arrête le pilotage de la
perte (la **prise** reste pilotée — c'est le sens qu'on veut). ⚠️ **Piège
d'interaction, verrouillé par test** : l'objectif daté ramène la demande à 0 *avant*
le plancher, qui n'a alors plus rien à refuser et ne lève pas le drapeau. Sans
requalification dans `computePlan`, poser un objectif daté faisait **disparaître**
l'avertissement — précisément pour la personne qui poursuit activement une perte de
poids en insuffisance pondérale.

Surfaces : carte en tête du profil (tapable → éditeur d'Objectif) et `DatedGoalCard`
sur Plan + Profil. Pas de branche dans l'éditeur d'objectif daté : `goalBlockMsg` y
refuse déjà toute cible en perte quand on est sous 18,5 (une cible plus basse que
son poids ne peut pas être au-dessus du seuil) — la branche serait morte, vérifié.

---

## Résumé

| Priorité | Objet | Nature |
|---|---|---|
| **P0.1** | Plancher d'énergie disponible (EA) | Sécurité — bloquant |
| **P0.2** | Logique protéines (poids ajusté) | Bug logique — bloquant |
| **P0.3** | Déficit plafonné en % du TDEE | Sécurité — bloquant |
| **P0.4** | Éligibilité et bornes d'entrée | Sécurité + conformité — bloquant |
| **P0.5** | Registre en semaines vécues (`since`) | Sécurité — livré |
| **P0.6** | Dérive sous IMC 18,5 en cours de sèche | Sécurité — livré |
| **P1.1** | Chemin de calcul TDEE unique | Cohérence |
| **P1.2** | MET net (`MET − 1`) + table révisée | Justesse |
| **P1.3** | Retrait de Katch-McArdle | Justesse |
| **P1.4** | Plancher lipidique en g/kg | Justesse |
| **P1.5** | Trajectoire non linéaire + zone proportionnelle | Expérience |
| **P1.6** | Projection recalculée après clamp | Cohérence d'affichage |
| **P2.1** | Cyclage jours repos / jours sport | Fonctionnalité |
| **P2.2** | Calibration empirique (facteur `k`) | Fonctionnalité |

---

## Utilitaires partagés — `lib/safety.ts`

```ts
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Masse maigre. Si le % de masse grasse est absent, on l'estime via Deurenberg (1991)
 * plutôt que de laisser la FFM indéfinie — le plancher de sécurité en dépend.
 */
export function fatFreeMassKg(b: BodyInput): number {
  return b.weight_kg * (1 - resolvedBodyFatPct(b) / 100);
}

export function resolvedBodyFatPct(b: BodyInput): number {
  const [lo, hi] = bodyFatBounds(b.sex);
  if (b.body_fat_pct != null && b.body_fat_pct > 0) return clamp(b.body_fat_pct, lo, hi);
  const bmi = b.weight_kg / (b.height_cm / 100) ** 2;
  const male = b.sex === 'male' ? 1 : 0;
  return clamp(1.20 * bmi + 0.23 * b.age - 10.8 * male - 5.4, lo, hi);
}

/** Bornes physiologiques par sexe. 3 % est sous le gras essentiel masculin
 *  et impossible chez une femme — l'ancienne borne 3–60 globale était fausse. */
export function bodyFatBounds(sex: Sex): [number, number] {
  return sex === 'male' ? [5, 60] : [12, 65];
}
```

---

# PR 1 — P0 : sécurité — ✅ LIVRÉ

## P0.1 — Plancher d'énergie disponible

> ⚠️ **Cette section a été CORRIGÉE le 2026-07-28.** La v1 de la spec imposait un
> plancher dur à 35 kcal/kg de masse maigre pour les femmes non ménopausées. C'était
> une erreur de nature, pas de degré. Ce qui suit est la version qui fait foi.

**Problème.** Le plancher historique (1500 kcal homme / 1200 femme) est ABSOLU.
Pour une femme de 65 kg à 25 % de masse grasse avec 400 kcal/jour de sport, le
minimum physiologique est ~1863 kcal. Le moteur pouvait légalement prescrire 1200.

**Deux seuils, de nature différente — c'est le point que la v1 confondait.**

- **30 kcal/kg de masse maigre = seuil de RISQUE CLINIQUE** (consensus IOC RED-S).
  En dessous : perturbations endocriniennes, osseuses, immunitaires. C'est un
  plancher de sécurité au sens propre → **plancher DUR, les deux sexes**.
- **35–36 = seuil de FONCTION OPTIMALE**, issu des études sur la fonction ovulatoire.
  En faire un plancher dur revient à interdire toute énergie disponible sous
  l'optimum, ce que la littérature ne dit pas — et dans un produit de perte de
  poids, ça revient à interdire la perte de poids.

Vérification chiffrée (femme 65 kg, 25 % de MG, 400 kcal/j de sport, TDEE ~2250) :

| Plancher | Cible | Déficit restant | Rythme |
|---|---|---|---|
| 35 (v1) | 2106 | 144 kcal/j | 0,13 kg/sem — **du maintien déguisé** |
| **30 (retenu)** | **1863** | **388 kcal/j** | **0,54 %/sem — dans la fourchette recommandée** |

**Le filet absolu 1500/1200 est CONSERVÉ dans le `max()`.** Chez une femme légère
avec peu de masse maigre, `30 × FFM` peut descendre sous 1000 kcal. Le BMR fait
déjà plancher, donc le cas est rare, mais ce filet ne mord jamais chez un sportif
normal : il ne coûte rien et il attrape les gabarits extrêmes et les saisies
aberrantes. On ne retire pas une protection au motif qu'elle est redondante dans
95 % des cas.

**Budget d'exposition temporelle.** Le risque RED-S n'est pas d'être à 32 kcal/kg
FFM pendant trois semaines, c'est d'y rester six mois. Un flag passif informe mais
ne protège pas, et un warning affiché à chaque ouverture pendant vingt semaines
devient invisible en dix jours. La zone 30–35 est donc **autorisée mais limitée
dans le temps** : au-delà de 12 semaines cumulées, le plancher remonte
progressivement vers 35. Le produit ne bloque pas, il force une sortie de déficit —
c'est ce que ferait un coach compétent.

Le compteur se calcule **en cumulé sur 12 mois glissants, pas en consécutif** :
sinon une pause d'une semaine remet tout à zéro et le garde-fou ne sert à rien.

```ts
const EA_HARD_FLOOR = 30;
const EA_OPTIMAL = 35;
const LOW_EA_BUDGET_WEEKS = 12;
const LOW_EA_STEP_PER_WEEK = 0.5;
const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

function isFemaleAtRisk(b: BodyInput): boolean {
  return b.sex === 'female' && !b.is_post_menopausal;
}

/**
 * Plancher EA effectif. Déterministe : `weeksInLowEa` est un état persisté,
 * calculé depuis l'historique et la date passée en paramètre, jamais depuis
 * une horloge implicite.
 */
function effectiveEaPerKgFfm(b: BodyInput, weeksInLowEa: number): number {
  if (!isFemaleAtRisk(b)) return EA_HARD_FLOOR;
  const overrun = Math.max(0, weeksInLowEa - LOW_EA_BUDGET_WEEKS);
  return Math.min(EA_OPTIMAL, EA_HARD_FLOOR + overrun * LOW_EA_STEP_PER_WEEK);
}

export function safetyFloorKcal(
  b: BodyInput,
  bmr: number,
  sportKcalPerDay: number,
  weeksInLowEa: number,
  maintenanceKcal: number,
): number {
  const eaFloor = effectiveEaPerKgFfm(b, weeksInLowEa) * fatFreeMassKg(b) + sportKcalPerDay;
  const cappedEaFloor = Math.min(eaFloor, maintenanceKcal);
  return Math.round(Math.max(bmr, cappedEaFloor, MIN_KCAL[b.sex]));
}
```

⚠️ **Le 5ᵉ paramètre `maintenanceKcal` n'est pas décoratif — c'est lui qui empêche le
plancher de prescrire un SURPLUS.** Sans le `Math.min(eaFloor, maintenanceKcal)`, une
femme dont l'EA de maintenance est naturellement sous 35 (cas courant, pas cas limite :
125 kg, 36 % de MG, sédentaire → EA 31,5) voyait le plancher escaladé dépasser son TDEE
de **+282 kcal/jour**, soit ~1,3 kg de prise par mois prescrits par le garde-fou
lui-même — le défaut trouvé à l'audit adverse. Le BMR et le filet absolu (1500/1200),
eux, ne sont **pas** plafonnés : ils restent des minima durs, car si le TDEE tombe sous
eux, c'est l'estimation de dépense qui est fausse, pas le besoin physiologique.
Ré-implémenter depuis cette spec sans ce `Math.min` réintroduit le défaut à l'identique.
Source de vérité : `lib/safety.ts::safetyFloorKcal`.

**Intégration.** Ce plancher est appliqué **en aval de tout** — y compris de la
calibration P2.2 et du cyclage P2.1. Aucun chemin de code ne peut le contourner,
mode `manual` inclus (le manque y est comblé en glucides, protéines et lipides
choisis intacts).

**Persistance.** `low_ea_weeks` est stocké comme une LISTE de lundis
(`'YYYY-MM-DD'`) et non comme un entier — c'est ce qui rend la fenêtre glissante
et l'idempotence possibles. Purgée au-delà de 12 mois, donc bornée à 52 entrées.
Une seule colonne Supabase à ajouter (`low_ea_weeks jsonb`).
⚠️ **Amendé par P0.5** : la charge utile est devenue
`{ weeks: string[]; since: string | null }` — le tableau nu ci-dessus reste lu mais
n'est plus écrit, et le `since` est ce qui fait compter des semaines VÉCUES plutôt
que des recalculs. Colonne `jsonb` inchangée, donc pas de seconde migration.

**Ménopause laissée de côté (décision fondateur 2026-07-28).**
`is_post_menopausal` existe côté TypeScript et le moteur le lit, mais il est
**inerte et LOCAL-ONLY** : aucune UI ne le pose, il est hors `PROFILE_COLS`, donc
aucune colonne Supabase et aucune migration (même parti pris que
`Streak.freeze_available`). Conséquence assumée : **toutes les femmes sont
traitées comme non ménopausées**, c'est-à-dire le défaut protecteur — la remontée
du plancher après 12 semaines s'applique à toutes. Pour l'activer plus tard :
rédiger la question d'onboarding, ajouter la colonne + la ligne dans
`PROFILE_COLS` ; le calcul n'a pas à bouger.

**Piège d'implémentation nº 1 (verrouillé par un test).** L'appartenance à la zone
basse doit se décider sur le plan **non escaladé** (plancher EA 30). Sinon le
plancher dépend du compteur qui dépend du plancher : recalculer deux fois de suite
change le résultat, et l'idempotence saute.

**Piège d'implémentation nº 2 — le garde-fou qui se retourne (trouvé à l'audit
adverse du 2026-07-28, corrigé).** La première implémentation comptait une semaine
dès que l'énergie disponible passait sous 35, **sans vérifier qu'il y avait un
déficit**. Or beaucoup de gens sont naturellement sous 35 kcal/kg de masse maigre à
leur *maintenance* : une femme de 125 kg à 36 % de MG, sédentaire, a une EA de
maintenance de 31,5. Elle accumulait donc des semaines **sans faire le moindre
régime**, et après 16 semaines le plancher escaladé dépassait son TDEE :

```
  s 0  seuil=30  plancher=2400  cible=2518  (TDEE 2518) →   maintien
  s16  seuil=32,5 plancher=2600 cible=2600  (TDEE 2518) →  +82 kcal
  s24  seuil=35   plancher=2800 cible=2800  (TDEE 2518) → +282 kcal  ⚠️ SURPLUS FORCÉ
```

Soit ~1,3 kg de prise de poids par mois **prescrits par le mécanisme de sécurité
lui-même**, sur une utilisatrice qui n'avait rien demandé. Et le compteur ne se
libérait jamais, la zone étant jugée sur un plan structurellement sous 35.

Deux garde-fous, tous deux nécessaires :

1. **Une semaine ne compte que s'il y a DÉFICIT** (`countsAsLowEaWeek`). Le budget
   RED-S modélise une restriction prolongée, pas une énergie disponible basse en
   soi. Sans déficit, il n'y a rien à budgéter.
2. **Le plancher ne peut jamais dépasser la maintenance** (`safetyFloorKcal` prend
   désormais le TDEE et plafonne la composante EA avec). Invariant structurel : un
   plancher de sécurité empêche un déficit excessif, il n'impose **jamais** un
   surplus. Le BMR et le filet absolu restent, eux, des minima durs.

Après correctif, l'escalade fait exactement ce qui était spécifié — elle **converge
vers la maintenance et s'y arrête** : c'est une sortie de déficit forcée, pas une
prise de poids forcée.

**Drapeaux.** `FLOOR_APPLIED` quand le plancher mord (l'objectif daté devient
mécaniquement inatteignable — l'UI doit le dire, cf. P1.6). `LOW_EA_WARNING` à
l'entrée dans la zone. `LOW_EA_BUDGET_EXCEEDED` quand le plancher commence à remonter.

**Texte UX (livré dans l'éditeur d'objectif daté et `MacroSplit`).** L'EA soustrait
la dépense sportive, donc plus une utilisatrice s'entraîne, plus son plancher monte.
Elle passe de 3 à 6 séances/semaine, son plancher grimpe d'environ 200 kcal, et
l'app lui fait manger PLUS alors qu'elle veut maigrir. C'est physiologiquement juste
et totalement contre-intuitif : le message l'explique au moment exact où le budget
remonte.

---

## P0.2 — Logique protéines

**Problème.** `max(LBM × coef, poids × plancher)` était commenté « anti sous-dosage
à masse grasse élevée » et produisait l'inverse. Femme 90 kg / 45 % de MG :
`max(49,5 × 2,4 ; 90 × 2,0) = 180 g`, soit **3,6 g/kg de masse maigre** — au-dessus
de toute recommandation, et 720 kcal ponctionnées sur un budget déjà planché. Les
glucides tombaient à ~37 g sans alerte, parce que `max(0, restant/4)` avalait le
dépassement en silence.

**Correction.** Poids ajusté (`FFM + 0,25 × masse grasse`), puis clamp sur la FFM.

```ts
export function proteinTarget(body: BodyInput, goal: Goal): number {
  const ffm = fatFreeMassKg(body);
  const adjustedWeight = ffm + 0.25 * (body.weight_kg - ffm);
  const raw = adjustedWeight * PROTEIN_COEF[goal];
  return Math.round(clamp(raw, ffm * 1.6, ffm * 2.6));
}
```

| Profil | Avant | Après | g/kg FFM |
|---|---|---|---|
| F 90 kg, 45 % MG, cut_aggressive | 180 g | **129 g** | 2,6 |
| H 80 kg, 12 % MG, cut_aggressive | 169 g | **175 g** | 2,5 |

> Rectificatif : la v1 annonçait « 169 → 176 » pour le second profil. Le calcul réel
> de l'ancien code donnait `max(70,4 × 2,4 ; 80 × 2,0) = 169`.

**Bénéfice de bord non anticipé :** le clamp à 2,6 g/kg FFM garantit
*mathématiquement* que les glucides ne peuvent plus tomber à zéro. Au plancher
(≥ 30 × FFM), protéines (≤ 10,4 × FFM kcal) + lipides (7,5 × FFM kcal) laissent
toujours ≥ 12,1 × FFM kcal de glucides. Ce n'est plus une question de chance.

**Ne jamais écraser les glucides à zéro en silence.**

```ts
const carbsG = Math.round(remaining / 4);
if (carbsG < 0) flags.push('MACRO_BUDGET_OVERFLOW');
if (isTrainingDay && carbsG < 3 * p.weight_kg) flags.push('CARBS_BELOW_TRAINING_FLOOR');
return Math.max(0, carbsG);
```

**Mode « Perso % ».** Sans réglage explicite, il retombe désormais sur exactement la
cible du mode auto : les deux modes ne doivent pas diverger sur leur valeur par
défaut. Avec un g/kg saisi, c'est un choix explicite de l'utilisateur (borné par le
stepper de l'UI) et il est respecté.

---

## P0.3 — Déficit plafonné en pourcentage du TDEE

**Problème.** Le seul plafond était en kg/semaine. Homme 120 kg, TDEE 2800 :
1 %/sem = 1,2 kg = **1320 kcal/jour de déficit, soit 47 % du TDEE**. Le plancher
rattrapait en aval, mais la contrainte doit exister en amont — sinon la trajectoire
annoncée est une fiction.

**Correction.** Deux plafonds cumulés : rythme modulé par l'adiposité, puis cap à
25 % du TDEE.

```ts
export function maxWeeklyLossPct(b: BodyInput): number {
  const bf = resolvedBodyFatPct(b);
  const isLean = b.sex === 'male' ? bf < 12 : bf < 20;
  const isHigh = b.sex === 'male' ? bf > 30 : bf > 40;
  if (isLean) return 0.5;
  if (isHigh) return 1.25;
  return 0.75;
}
export const MAX_GAIN_RATE_PCT = 0.5;
export const MAX_DEFICIT_TDEE_RATIO = 0.25;
```

**Garde-fou de division.** `diff / weeksRemaining` explose sous une semaine restante :
un écart de 0,5 kg à deux jours de l'échéance déclenchait un déficit au plafond. On
raisonne alors sur une semaine pleine (`Math.max(1, weeksRemaining)`).

**Constante énergétique asymétrique.** 7700 kcal/kg vaut pour le tissu adipeux, donc
pour la perte. En prise, le tissu gagné est mixte et le muscle très hydraté :
appliquer 7700 symétriquement sur-prescrit le surplus et rend les projections de
prise faussement pessimistes.

```ts
export const KCAL_PER_KG_FAT  = 7700;
export const KCAL_PER_KG_GAIN = 5000; // tissu mixte, quand safeRate > 0
```

**Cohérence signe/objectif.** Si le signe du delta contredit la famille de l'objectif
(un `bulk` dont le poids cible est sous le poids actuel), on ne bascule pas
silencieusement en déficit : `GOAL_DIRECTION_MISMATCH` et `delta = 0`.

**Projection.** `projectedDate` est calculée sur le rythme **réellement appliqué**
après les deux plafonds, sinon l'UI affiche deux chiffres qui se contredisent.
(La version complète de P1.6 — projection recalculée depuis `targetKcal` final,
donc plancher EA compris — reste à faire en PR 2.)

---

## P0.4 — Éligibilité et bornes d'entrée

**Problème.** Aucune borne d'âge adulte, aucun blocage sur IMC de départ bas, aucune
validation de l'IMC cible, bornes de masse grasse non sexuées, volume d'entraînement
non plafonné (14 séances × 180 min passait, et produisait un budget `bulk` à 7250 kcal).

Le cas mineur est **bloquant sur deux plans** : Mifflin-St Jeor n'est pas validée
sous 19 ans, et servir un moteur de déficit calorique à un adolescent pose un problème
de conformité App Store autant que de sécurité. **L'âge minimum passe de 16 à 18 ans**
(décision du 2026-07-28, CLAUDE.md §6 mis à jour en conséquence).

```ts
export type EligibilityBlock =
  | 'MINOR' | 'PREGNANCY_OR_NURSING' | 'UNDERWEIGHT_CUT_BLOCKED'
  | 'TARGET_BMI_OUT_OF_RANGE' | 'TRAINING_VOLUME_IMPLAUSIBLE';
```

`MINOR` et `PREGNANCY_OR_NURSING` bloquent la génération de plan. Les autres bloquent
l'objectif concerné, pas l'app entière.

**Écart assumé vs la v1 — borne haute d'IMC cible.** La v1 bloquait tout IMC cible
> 30. Tel quel, une personne à IMC 40 visant IMC 32 était **bloquée** — c'est-à-dire
exactement l'utilisatrice qu'on veut aider. La borne haute ne bloque donc que si la
cible fait **monter** le poids au-dessus d'IMC 30. La borne basse (18,5) reste
inconditionnelle : viser la dénutrition n'est jamais valide.

**Écart assumé vs la v1 — grossesse/allaitement.** Déjà implémenté avant cette PR,
par un portail de dépistage santé bloquant à l'onboarding (`lib/healthScreening.ts`
+ `components/HealthScreening.tsx`). On ne duplique pas le champ dans le profil :
`checkEligibility` accepte le drapeau en entrée, le blocage reste en amont.

**Défaut trouvé à l'audit adverse (corrigé).** `checkEligibility` n'était appelée
qu'à la fin de l'onboarding. L'**éditeur d'objectif daté du profil** ne l'interrogeait
pas : un homme de 85 kg / 1 m 80 pouvait viser **40 kg (IMC 12,3)** et le plan était
produit sans broncher — la seule barrière était la borne de saisie `40 ≤ poids ≤ 250`,
qui est syntaxique, pas physiologique. L'éditeur appelle désormais `checkEligibility`
avec la cible provisoire, affiche le motif et désactive l'enregistrement.

**Bornes de saisie** appliquées à l'onboarding : âge 18–100, poids 30–300 kg,
taille 120–230 cm, masse grasse selon `bodyFatBounds(sex)`, total d'entraînement
≤ 20 h/semaine. Les bornes de séance (15–180 min) restent celles de `lib/sport.ts`,
strictement incluses dans la plage 5–240 de la spec — leur élargissement change le
calcul kcal et relève de P1.2.

---

## Tests P0 — `lib/__tests__/safety.test.ts` (42 tests, tous verts)

Couverture : plancher = 30 × FFM + sport · filet 1500/1200 sur gabarit léger ·
plancher jamais sous le BMR · seuil 30 pour tous sous 12 semaines · remontée à 34
après 20 semaines cumulées (femme non ménopausée) · pas de remontée chez l'homme ni
la femme ménopausée · compteur cumulé non réinitialisé par une pause · enregistrement
idempotent et purgé à 12 mois · aucun contournement du plancher (mode `manual`
compris) · protéines ≤ 2,6 g/kg FFM sur profils extrêmes · glucides jamais écrasés à
zéro en silence · déficit ≤ 25 % du TDEE · rythme modulé par l'adiposité · coût du kg
asymétrique · aucune division par zéro sur deadline immédiate · incohérence
signe/objectif signalée · éligibilité (mineur, IMC, volume) · bornes de masse grasse
sexuées · estimation Deurenberg · **invariants permanents** : aucun profil sous son
plancher, aucun `NaN`/`Infinity`, `4P+4G+9L ≈ budget` à moins de 1 %, idempotence
(y compris registre d'énergie basse déjà chargé).

---

# PR 2 — P1 : cohérence et justesse

## P1.1 — Chemin de calcul TDEE unique

**Problème.** Les méthodes A (MET) et B (multiplicateur) ne sont pas commensurables.
A sous-estime B de 200–260 kcal systématiquement. Deux utilisateurs identiques
obtiennent des budgets différents selon leur parcours d'onboarding.

| Profil | A | B | Écart |
|---|---|---|---|
| H 80 kg, 4× muscu 60 min | 2554 | 2759 | −205 |
| H 70 kg, 6× course 45 min | 2673 | 2933 | −260 |
| H 90 kg, 2× marche 20 min | 2509 | 2613 | −104 |

**Correction.** Supprimer B comme chemin de calcul. Quand seul
`training_days_per_week` existe, générer des séances synthétiques et passer par A.

```ts
const SYNTHETIC_MET = 6.0;      // séance générique, intensité modérée
const SYNTHETIC_MINUTES = 60;
export function normalizeSports(p: Profile): SportEntry[] {
  if (p.sports?.length) return p.sports;
  const days = clamp(p.trainingDaysPerWeek ?? 0, 0, 14);
  return days === 0 ? [] : [{ type: 'generic', minutes: SYNTHETIC_MINUTES, sessionsPerWeek: days }];
}
```

**NEAT paramétrable.** Le `× 1,3` fixe est la plus grosse source d'erreur non
modélisée du moteur — plus grosse que le choix d'équation BMR. Un développeur et un
maçon ne partagent pas le même coefficient (écart réel ~500 kcal sur un BMR de 1800).

```ts
export const NEAT_FACTOR: Record<NeatLevel, number> = {
  desk: 1.20, light: 1.35, active: 1.50, manual: 1.65,
};
```

Défaut `light` (1,35) si non renseigné, à demander à l'onboarding.

**Décroissance temporelle.** Les séances déclarées sont créditées à vie. Si aucune
séance n'est loggée depuis 14 jours, décroître linéairement la charge créditée sur
14 jours supplémentaires jusqu'à zéro, et émettre `TRAINING_STALE`.

> ⚠️ Interaction avec P0.1 : le plancher EA soustrait `sportKcalPerDay`. Passer les
> profils legacy en séances synthétiques leur donnera un plancher plus haut. À
> vérifier sur les 20 profils du stress-test avant merge.

## P1.2 — MET net

**Problème.** `MET × 3,5 × poids / 200` donne la dépense **brute**, métabolisme de
repos inclus. Or `BMR × NEAT` couvre déjà les 24 h. On recompte le repos pendant la
séance : ~46 kcal/jour pour 4 h/semaine à 80 kg, jusqu'à 115 sur gros volume.

```ts
export function sessionKcal(met: number, weightKg: number, minutes: number): number {
  return (Math.max(0, met - 1) * 3.5 * weightKg / 200) * clamp(minutes, 5, 240);
}
```

**Table MET révisée.** La musculation à 5,0 est trop haute : 50 à 70 % d'une séance
est du repos inter-séries, et c'est l'activité où le MET est le moins fiable.

```ts
export const MET = {
  musculation: 4.0, /* était 5.0 */ course: 9.8, velo: 8.0, natation: 7.0,
  football: 7.0, hiit: 8.0, combat: 9.0, tennis: 7.0, basket: 6.5,
  marche: 4.3, generic: 6.0,
};
```

**Adultes 60+.** Le Compendium publie des valeurs calées sur 2,7 ml/kg/min au lieu de
3,5 pour cette tranche : appliquer `p.age >= 60 ? 0.85 : 1.0`.

## P1.3 — Retrait de Katch-McArdle

**Problème.** Le %BF est déclaré par l'utilisateur. Les méthodes instrumentées grand
public sous-estiment déjà d'environ 4–5 points face au DXA, avec un biais
proportionnel qui s'aggrave chez les plus gras ; une auto-estimation est pire.
Katch-McArdle **ignore aussi l'âge et la taille**. La bascule automatique crée une
discontinuité visible :

| Profil | MSJ | KM | Saut |
|---|---|---|---|
| H 25 ans, 95 kg, 185 cm, 10 % | 1986 | 2217 | +231 |
| F 30 ans, 70 kg, 160 cm, 40 % | 1389 | 1277 | −112 |

**Correction.** Mifflin-St Jeor pour tout le monde. Le %BF reste utilisé pour trois
choses : la FFM du plancher EA, la base protéique, le choix du rythme de perte.
Ajouter un champ de provenance (`declared | bia | dxa`) pour moduler la confiance.

## P1.4 — Plancher lipidique

25 % des kcal peut passer sous le seuil physiologique sur un budget bas. Homme 90 kg
au plancher : 42 g = 0,46 g/kg, sous le minimum de 0,5 g/kg.

```ts
export function fatTargetG(targetKcal: number, weightKg: number): number {
  return Math.round(Math.max((targetKcal * 0.25) / 9, weightKg * 0.5));
}
```

## P1.5 — Trajectoire non linéaire et zone proportionnelle

**Problème.** L'interpolation linéaire garantit que l'utilisateur sera « en retard »
sur toute la seconde moitié du programme alors qu'il fait tout correctement : la
perte décélère mécaniquement, et 7700 kcal/kg est un modèle statique qui ignore
l'adaptation métabolique. C'est exactement l'effet décourageant que la philosophie
« zone, pas ligne » cherche à éviter — encodé dans la trajectoire elle-même.

```ts
export function idealWeightAtDay(day, startKg, targetKg, totalDays): number {
  const d = clamp(day, 0, totalDays);
  const tau = totalDays / 2.5;
  return startKg + (targetKg - startKg) *
    ((1 - Math.exp(-d / tau)) / (1 - Math.exp(-totalDays / tau)));
}
/** ±1 kg vaut 2 % du poids à 50 kg et 0,8 % à 120 kg. */
export function zoneHalfWidthKg(weightKg: number): number {
  return Math.max(1.0, 0.015 * weightKg);
}
```

**Nouvel état de progression.** « En avance » n'est pas toujours une bonne nouvelle :
perdre nettement plus vite que le rythme sûr mérite une vérification, pas un
renforcement positif.

```ts
export type ProgressState = 'in_zone' | 'behind' | 'ahead' | 'ahead_too_fast';
```

`ahead_too_fast` se déclenche quand le rythme observé sur 14 jours dépasse
`maxWeeklyLossPct(p)`.

## P1.6 — Projection recalculée après clamp

**Problème.** Quand le plancher mord, le budget réel n'est plus celui qui a servi à
calculer la date projetée.

```ts
const effectiveDailyDelta = plan.targetKcal - plan.tdee;
const effectiveWeeklyKg = (effectiveDailyDelta * 7) / KCAL_PER_KG_FAT;
const projectedDate = projectDate(p.weight_kg, dated.target_weight_kg, effectiveWeeklyKg);
```

Si `FLOOR_APPLIED` est levé, l'UI doit dire que la date demandée n'est pas atteignable
en sécurité et proposer la date projetée réelle. *(P0.3 a déjà rendu la projection
cohérente avec les plafonds de rythme et de déficit ; il reste à la rendre cohérente
avec le plancher EA.)*

---

# PR 3 — P2 : fonctionnalités manquantes

## P2.1 — Cyclage jours repos / jours sport

`kcal_sport_par_jour = kcal_semaine / 7` lisse tout : le moteur ne différencie pas
les jours. Le déficit se raisonne en **budget hebdomadaire**, réparti proportionnellement
à la dépense, avec amortissement. Et surtout : **on cycle les glucides, pas les trois
macros.** Les protéines restent identiques les 7 jours (le turnover protéique ne prend
pas de jour de repos), les lipides gardent leur plancher, les glucides absorbent la
variation.

```ts
const ALPHA = 0.7;              // amortissement : 1 = brutal, 0 = pas de cyclage
const MAX_DAY_RATIO = 1.35;     // jour le plus haut / jour le plus bas

export function distributeWeek(weeklyBudget, dailyTdee: number[], floors: number[]): number[] {
  const mean = dailyTdee.reduce((a, b) => a + b, 0) / 7;
  const weights = dailyTdee.map(t => mean + ALPHA * (t - mean));
  const sumW = weights.reduce((a, b) => a + b, 0);
  let budgets = weights.map(w => (weeklyBudget * w) / sumW);
  budgets = applyRatioCap(budgets, MAX_DAY_RATIO);
  return redistributeAfterClamp(budgets, floors, weeklyBudget);
}
```

`redistributeAfterClamp` est le point délicat : après avoir relevé les jours sous
leur plancher, le surplus doit être repris sur les jours non clampés. Itérer jusqu'à
convergence ou 10 passes.

Le `MAX_DAY_RATIO` n'est pas cosmétique : sur un public sportif, où les conduites
alimentaires restrictives sont fréquentes, un cyclage agressif transforme le jour de
repos en jour de punition.

**Macros par jour, dans cet ordre, toujours :** protéines (identiques les 7 jours) →
lipides (plancher 0,5 g/kg) → glucides (reliquat). Si `carbsG < 3 × poids` un jour de
séance, ne pas casser le déficit : reprendre du budget sur les jours de repos et
lever `CARBS_BELOW_TRAINING_FLOOR`.

## P2.2 — Calibration empirique (facteur `k`)

Le moteur ne mesure jamais son propre écart à la réalité. Stocker un **coefficient
adimensionnel**, jamais un TDEE absolu : `k` capture l'écart individuel et reste
stable, `tdeePredicted` suit automatiquement le poids et la charge du moment.

```ts
const K_BOUNDS: [number, number] = [0.80, 1.20];
const K_MIN_DRIFT = 0.85;      // dérive max cumulée vers le bas
const BETA_UP = 0.5;           // correction vers le haut : réactive
const BETA_DOWN = 0.25;        // correction vers le bas : prudente
```

**Estimation de la pente.** Les pesées sont événementielles et irrégulières : une
moyenne mobile 7 jours est mal définie. Régression linéaire pondérée sur les couples
(date, poids). Recalibrer seulement si ≥ 8 pesées sur ≥ 14 jours dans une fenêtre de 21.

**Pourquoi l'asymétrie `BETA_UP` / `BETA_DOWN`.** L'estimation d'apport est le plan
prescrit, pas l'apport réel. Si l'utilisateur sous-mange systématiquement,
l'algorithme lit « perte trop rapide » → conclut « TDEE plus bas » → baisse le budget
→ l'utilisateur sous-mange du nouveau budget → spirale. L'erreur inverse produit un
algorithme inefficace, pas dangereux.

**Refus de la troisième baisse consécutive.** Un moteur qui répond à « je ne perds
pas » en coupant toujours plus est mal conçu → `CALIBRATION_NEEDS_REVIEW`.

**Hystérésis d'affichage.** Ne republier un plan que si `|Δbudget| > 3 %` **et**
`≥ 7 jours` depuis le dernier changement.

---

# Invariants permanents

À garder en tests de non-régression, quelle que soit l'évolution future :

1. `Σ budgets journaliers == budget hebdomadaire` (±1 kcal) après clamping et redistribution
2. `4×P + 4×G + 9×L == budget du jour` (écart < 1 %) — ✅ testé
3. Protéines identiques sur les 7 jours (PR 3)
4. Aucun jour sous son plancher EA, **aucun chemin de code excepté** — ✅ testé
5. Une seule fonction produit BMR et TDEE, appelée partout — ✅ testé
6. Monotonie : ↑ durée de séance ⇒ budget du jour jamais ↓ (PR 3)
7. Idempotence : recalcul sans nouvelle donnée ⇒ plan identique — ✅ testé
8. Déplacer une séance d'un jour à l'autre ⇒ budget hebdomadaire inchangé (PR 3)
9. Aucun `NaN` ni `Infinity` en sortie, quelles que soient les entrées bornées — ✅ testé

---

# Hors scope de cette passe

- Séparation de l'erreur de modèle et de l'écart d'adhérence. Tant qu'aucun signal
  sur l'apport réel n'existe, `k` mélange les deux. Les garde-fous de P2.2 contiennent
  le risque, ils ne le résolvent pas.
- Diet breaks et refeeds structurés (pertinents au-delà de 12 semaines de déficit).
- Définition de « jour actif » pour la série d'adhérence. Si c'est « avoir atteint ses
  macros », le mécanisme pousse à la rigidité alimentaire sur un public déjà exposé ;
  si c'est « avoir loggé », il est bénin. Le choix est comportemental, pas technique,
  et il doit être tranché avant le lancement.
- Champ `is_post_menopausal` : **laissé de côté** (décision fondateur 2026-07-28).
  Inerte, local-only, aucune colonne Supabase. Toutes les femmes sont traitées
  comme non ménopausées — le défaut protecteur. À poser dans le profil quand la
  question sera rédigée.

---

## Références

- Mifflin-St Jeor — validation Bland-Altman, *British Journal of Nutrition*
- Deurenberg, Weststrate & Seidell — *British Journal of Nutrition* 1991 (estimation %MG)
- ISSN Position Stand: protein and exercise — Jäger et al., *JISSN* 2017
- Evidence-based recommendations for natural bodybuilding contest preparation —
  Helms, Aragon & Fitschen, *JISSN* 2014
- Nutrition Recommendations for Bodybuilders in the Off-Season — Iraki et al., *Sports* 2019
- Fuel for the Work Required — Impey, Morton et al., *Sports Medicine* 2018
- 2024 Adult Compendium of Physical Activities — pacompendium.com
- IOC consensus statement on RED-S — seuil d'énergie disponible (30 kcal/kg FFM)
- Loucks & Thuma — *J Clin Endocrinol Metab* 2003 (pulsatilité LH et énergie disponible)
