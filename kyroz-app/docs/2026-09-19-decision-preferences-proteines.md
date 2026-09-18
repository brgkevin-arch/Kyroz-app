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
| Végétarien | Tofu · Tempeh · Seitan · Légumineuses · Protéine végé ❓ · **Œufs** |
| Vegan | Tofu · Tempeh · Seitan · Légumineuses · Protéine végé ❓ |

- ❓ **À confirmer** : « Protéine végé » = les **pièces végétales** (steak, nuggets, saucisses,
  haché, poulet et jambon végétaux) — hypothèse retenue — ou la protéine végétale en poudre.
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

| Il coche | Part des protéines cochées (à parts égales) | Le reste |
|---|---|---|
| 1 | **60 %** | réparti selon « rien coché » |
| 2 | **80 %** | idem |
| 3 ou plus | **95 %** | idem |

Vaut pour l'omnivore, le halal, le végétarien et le vegan.

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

- **Porc** : 0 recette de filet de porc, 9 plats complets au jambon. **~10 plats de porc à
  écrire AVANT d'ouvrir la case** (filet mignon, côtes, sauté, rôti…), sous les règles R6
  (famille neuve) et anti-remplissage.
- Vérifier le vivier de chaque sorte végétale par créneau et par gabarit avant de garantir
  60 % d'une seule (ex. tempeh seul pour une femme de 55 kg en sèche).

## 5. Ordre proposé

1. Confirmer « Protéine végé » (❓ §1).
2. Mesurer la faisabilité de chaque part (moteur + catalogue) — sans rien livrer.
3. Écrire les ~10 plats de porc.
4. Moteur : parts garanties par régime ; retrait de la case Végétal omnivore.
5. Écran d'inscription et Profil : régime d'abord, protéines dépendantes, whey retirée.
6. Comptes existants : redemander les préférences.
