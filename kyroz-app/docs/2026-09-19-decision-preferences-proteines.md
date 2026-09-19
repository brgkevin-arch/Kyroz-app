# Préférences de protéines par régime — décisions du fondateur (2026-09-19)

> Statut : **DÉCIDÉ, PAS CODÉ.** Rien n'est implémenté. Avant de coder : mesurer chaque part
> sur les 12 profils de référence (calibrage, repas mal calibrés, vivier par créneau), et
> écrire les recettes de porc (§4). Un chiffre intenable se remonte au fondateur, il ne se
> corrige pas en silence.

## 1. Le parcours d'inscription

1. La page « préférences » ne montre d'abord **que les régimes**.
2. Selon le régime choisi, **seules les protéines compatibles apparaissent** :

| Régime | Protéines proposées à cocher |
|---|---|
| Omnivore | Poulet · Bœuf · Poisson · **Porc** (nouvelle case) |
| Halal | Poulet · Bœuf · Poisson (pas de porc) |
| Pescétarien | Poisson · Végétal |
| Végétarien | Tofu · Tempeh · Seitan · Légumineuses · Pièces végétales · **Œufs** |
| Vegan | Tofu · Tempeh · Seitan · Légumineuses · Pièces végétales |

- ✅ **Confirmé le 2026-09-19** : « Protéine végé » = les **pièces végétales** (steak, nuggets,
  saucisses, haché, poulet et jambon végétaux), pas la poudre.
- Seitan masqué pour « sans gluten » (c'est du blé).
- **Whey retirée de la liste des protéines préférées.** Les recettes à la whey et à la
  protéine végétale en poudre **restent au catalogue, inchangées**.
- **L'omnivore n'a plus de case « Végétal »** : jamais de déjeuner ni de dîner 100 % végétal
  (la case D36 disparaît). Les plats mixtes (chili bœuf-haricots) restent permis.
- **Œufs et laitages = accompagnements**, pas des protéines à cocher (sauf les œufs chez le
  végétarien, où ils sont une sorte cochable).
- **Comptes existants** : on leur redemande leurs préférences alimentaires.

## 2. Les parts — déjeuners et dîners seulement (14 repas/semaine, 7 % ≈ 1 repas)

Le petit-déjeuner et la collation gardent leurs propres règles.

**Ce que l'utilisateur coche = une part GARANTIE, pas une exclusion** : ce qu'il ne coche pas
reste possible (s'il ne coche pas poulet, il aura quand même du poulet).

**Omnivore et halal :**

| Il coche | Part des protéines cochées (à parts égales) | Le reste |
|---|---|---|
| 1 | **60 %** | réparti selon « rien coché » |
| 2 | **80 %** | idem |
| 3 ou plus | **95 %** | idem |

**Végétarien et vegan** (révisé par le fondateur le même jour, après la mesure du §4 bis) :

| Il coche | Part des sortes cochées (à parts égales) |
|---|---|
| 1 : **pièces végétales** | **70 %** — une quinzaine de produits différents, elles portent une grande part sans répéter |
| 1 : une autre sorte (tofu, tempeh, seitan, légumineuses, œufs) | **40 %** |
| 2 | **60 %** |
| 3 ou plus | **80 %** |

**Si le catalogue manque** de recettes d'une sorte pour un profil : **autant que possible** —
le moteur en sert le maximum faisable sans répéter ni mal calibrer, puis complète avec les
autres sortes (décision fondateur, même jour). Vaut pour tous les régimes.

**Rien coché :**

| Régime | Répartition |
|---|---|
| Omnivore | Poulet **40 %** · Bœuf **30 %** · Poisson **20 %** · Porc **10 %** (aujourd'hui : poisson 35 %, jugé trop) |
| Halal | Poulet **45 %** · Bœuf **35 %** · Poisson **20 %** |
| Pescétarien | Poisson **50 %** · Végétal **50 %** |
| Végétarien / vegan | libre (le moteur répartit) |

**Pescétarien qui coche une des deux** : **70 %** pour celle cochée (70/30 ou 30/70).

**Poisson minimum** : un omnivore qui n'a pas coché poisson en reçoit **au moins 1 repas par
semaine**.

## 3. Mesuré avant la décision (2026-09-19, omnivore, 12 profils × 4 tirages)

| Coche | Poisson | Bœuf | Poulet | Œufs | Autre |
|---|---|---|---|---|---|
| rien | 35 % | 23 % | 16 % | 16 % | 10 % |
| poulet + bœuf | 11 % | 48 % | 33 % | 5 % | 3 % |
| poisson | 84 % | 7 % | 2 % | 4 % | 3 % |

Aujourd'hui cocher une protéine ne fait que la FAVORISER (départage), sans part garantie.

## 4. Prérequis catalogue

- ✅ **Porc — 10 plats écrits le 2026-09-19 (vague B13, `rep293` → `rep302`)** : un féculent
  différent par plat (dix familles neuves, R6 à 0), garnitures choisies contre R1/R2, 8 à 12
  profils servis sur 12 (`check:enveloppe`). Effet immédiat, sans quota : un omnivore « rien
  coché » reçoit **12 %** de porc (6 % avant), le poisson passe de 35 à 32 %.
- Vérifier le vivier de chaque sorte végétale par créneau et par gabarit avant de garantir
  60 % d'une seule (ex. tempeh seul pour une femme de 55 kg en sèche).

## 4 bis. Les parts sont-elles tenables ? — mesuré le 2026-09-19 (`scripts/mesure-parts.ts`)

Recettes servables midi ET soir au profil le plus contraint, contre le nombre de repas exigé.

| Régime | Tenable | Limite |
|---|---|---|
| Omnivore | poulet, bœuf, poisson : toutes les parts ✅ ; porc « rien coché » (10 %) ✅ | **porc coché seul (60 % = 8 repas)** : 5 recettes servables chez H 110 masse → une recette servie deux fois |
| Halal | toutes les parts ✅ (8 recettes minimum pour poulet et bœuf, juste assez) | — |
| Pescétarien | toutes les parts ✅ (poisson 15 recettes min, végétal 43) | — |
| Végétarien | légumineuses, œufs (40 %) ✅, pièces végétales (70 %) ✅ | tofu, seitan → répétition ; **tempeh** (0 chez F 55 sèche) ❌ |
| Vegan | tofu, légumineuses (40 %) ✅ | pièces végétales (70 %) → répétition ; **tempeh** et **seitan** (2 chez H 110 masse) ❌ |
| Vegan sans gluten | légumineuses (40 %) ✅ | tofu → répétition ; **tempeh** (1) et **pièces végétales** (2 chez H 110 masse) ❌ |

(Chiffres végé/vegan remesurés avec les parts RÉVISÉES : 70 % pièces végétales, 40 % toute
autre sorte. Avec les parts d'avant — 60 % pour tout — tempeh et seitan étaient intenables
partout et tofu / œufs répétaient.)

➡️ **Les parts de l'omnivore, du halal et du pescétarien sont tenables telles quelles.** Le
plafond D30 (5 repas par ingrédient) ne gêne pas : poulet et bœuf ont deux ingrédients chacun
(filet + dinde, haché + bavette), soit 10 repas possibles.
➡️ **Végé / vegan, après révision : tenable pour la plupart des profils.** Les trous restants
sont aux gabarits extrêmes (F 55 sèche, H 110 masse) et tombent sous la règle « autant que
possible » : le tempeh surtout, puis le seitan vegan et les pièces végétales vegan sans gluten.
Écrire des recettes tempeh pour ces gabarits reste une option pour plus tard.
⚠️ Mesure STATIQUE : le coût d'un quota sur le calibrage ne se verra qu'une fois codé.

## 5. Ordre proposé

1. ✅ « Protéine végé » confirmé (pièces végétales).
2. ✅ Faisabilité mesurée (§4 bis).
3. ✅ 10 plats de porc écrits (B13).
4. Moteur : parts garanties par régime ; retrait de la case Végétal omnivore.
5. Écran d'inscription et Profil : régime d'abord, protéines dépendantes, whey retirée.
6. Comptes existants : redemander les préférences.
