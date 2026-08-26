# 02-01 · Katch à adiposité élevée — **ce n'est pas un correctif, c'est un invariant à renégocier**
Date : 2026-08-26 · Écrit après avoir **implémenté, testé et annulé** le correctif.

> **Ce que je devais faire** : corriger 02-01 — « une ligne dans `katchEligible`, un test qui la voit rougir ».
> **Ce que j'ai trouvé en le faisant** : le correctif ne tient dans aucune de ses deux formes, et la seconde
> viole un garde-fou que quelqu'un a écrit **exprès pour l'empêcher**. Le code est restauré, les 1 835 tests
> sont verts. Ce document est ce que le travail a produit à la place.

## Ce qui a été fait, dans l'ordre

| # | Tentative | Résultat |
|---|---|---|
| 1 | Mesurer l'impact en simulant « après » sans `body_fat_pct` | 🔴 **mesure contaminée** — retirer le %MG déplace aussi les planchers, les protéines et la masse maigre. Le delta mesurait deux choses. Jetée |
| 2 | Correctif **borné à `highAdiposity`** (le constat à la lettre) | 🔴 **un test l'a fait rougir** : saut de **189 kcal** au seuil |
| 3 | Correctif au **croisement des deux courbes** (`Math.max`) | ✅ continu, testé — 🔴 mais il viole un invariant gardé |
| 4 | Revert | ✅ arbre propre, 1 835 tests verts |

## Pourquoi la version « seuil d'adiposité » ne s'implémente pas

Le constat proposait de garder Mifflin **au-dessus de `highAdiposity`** (30 % chez l'homme, 40 % chez la femme). Mesuré, le croisement des deux formules **suit le gabarit, pas un seuil** :

| Corps | Croisement Mifflin/Katch | Seuil `highAdiposity` |
|---|---|---|
| Homme 55 kg | **9,2 %** de MG | 30 % |
| Homme 70 kg | **18,8 %** | 30 % |
| Homme 90 kg | **26,6 %** | 30 % |
| Homme 120 kg | **33,4 %** | 30 % |
| Femme 55 kg | **28,5 %** | 40 % |
| Femme 120 kg | **42,2 %** | 40 % |

Un seuil fixe **rate** l'homme de 70 kg (Katch est sous Mifflin depuis 18,8 %) et se déclenche **trop tard** partout ailleurs. Et surtout : brancher à 30 % un corps dont le croisement est à 18,8 % produit **un saut de 189 kcal** — exactement la discontinuité que R6 lissée avait été construite pour supprimer. C'est un test écrit pour l'occasion qui l'a montré, pas un raisonnement.

➡️ **Le croisement EST la frontière.** `Math.max(mifflin, katch)` la place là, pour chaque corps, sans saut par construction.

## Pourquoi la version correcte n'est pas livrable telle quelle

### Elle est grosse

Mesuré sur **30 222 cibles rejouées** — grille de corps jugés plausibles par `bodyFatConcern`, %MG **mesuré**, trois objectifs, avant/après avec le moteur réel :

| Objectif | Cibles | Touchées | Δ médian | Δ max | **Baisses** |
|---|---|---|---|---|---|
| Sèche | 10 074 | 8 073 (80 %) | **+307** | +1 163 | **0** |
| Maintien | 10 074 | 8 355 (83 %) | **+365** | +1 163 | **0** |
| Prise | 10 074 | 8 379 (83 %) | **+400** | +1 163 | **0** |
| **Total** | **30 222** | **24 807 (82 %)** | **+356 kcal/j** | **+1 163** | **0** |

⚠️ **Le « 82 % » ne dit rien du parc.** La grille balaie le %MG uniformément de 5 à 60 %, donc elle sur-représente l'adiposité haute. **Seule la magnitude se lit.**

### Et elle casse un garde-fou écrit exprès

Neuf tests existants tombent, sur quatre fichiers. Deux d'entre eux ne sont pas des assertions incidentes :

```
r6Lissee.test.ts › 2 — les 11 vecteurs du handoff §5
   « H 110 · 178 · 45 a · 38 % MESURÉ — non-régression `measured` »

r6Lissee.test.ts › 3 — invariants §4, balayés sur 1 344 corps
   « non-régression `measured` : Katch exactement, sur toute la grille »
```

**Quelqu'un a écrit un test sur 1 344 corps dont le seul objet est de garantir que la branche « mesurée » sert Katch exactement.** Il a été posé au moment de R6 lissée, en même temps que la décision de ne toucher qu'à la branche estimée. Ce n'est pas un oubli qu'on corrige : c'est un **invariant délibéré**, et il vient de faire son travail — sur moi.

*(Les sept autres échecs sont mécaniques : `bodyFatSource.test.ts` ×3, `fusion-seches.test.ts` ×2, `datedGoal.test.ts` ×1, plus un `ENGINE_REV` 8 vs 9.)*

## La décision, et elle n'est pas de moi

Le constat d'audit reste **exact** : à 45 % de MG mesurée, le BMR servi est **322 kcal sous Mifflin**, et le code écrit lui-même que « côté gras, Mifflin est la plus précise des deux (mesuré sur n=3001 et n=731) ». Cette phrase est appliquée à la branche estimée et pas à la mesurée.

Mais réparer cela **déplace de +356 kcal/j médians** la cible de la plupart des gens qui ont pris la peine de mesurer leur composition corporelle, et **abandonne Katch pour la majorité d'entre eux** — ce qui vide de son sens le fait de le demander.

| Option | Ce que ça coûte | Ce que ça donne |
|---|---|---|
| **A · Ne rien changer** | le constat reste ouvert ; les profils à MG mesurée élevée continuent d'être sous-servis | zéro risque, zéro travail |
| **B · Livrer `max(mifflin, katch)`** | `ENGINE_REV` 8 → 9, avertissement one-shot, **9 tests à réécrire dont l'invariant des 1 344 corps**, et une re-mesure du parc réel | la règle du code appliquée à ses deux branches, sans discontinuité, **aucune baisse** |
| **C · Rouvrir la calibration** | une session dédiée, avec des données de composition corporelle réelles | la vraie réponse — celle que `KATCH_INTERCEPT`/`KATCH_SLOPE` attendent déjà (« à revisiter avec les données de calibration P2 ») |

**Ma recommandation : C, et A en attendant.** L'option B est techniquement propre — le correctif tient en une ligne, il est continu, et je l'ai testé — mais livrer une recalibration de ±356 kcal sur la foi d'un audit, contre un invariant que quelqu'un a explicitement gardé, serait exactement le geste que la règle « pas de mensonge dans Kyroz » cherche à empêcher : un chiffre servi que personne n'a arbitré.

## Le correctif, prêt à appliquer si tu tranches B

Une ligne dans `lib/tdee.ts::calculateBMR` :

```ts
// avant
if (katchEligible(b)) return Math.round(katchRaw(b));
// après
if (katchEligible(b)) return Math.round(Math.max(mifflinRaw(b), katchRaw(b)));
```

Plus : `ENGINE_REV` 8 → 9 avec son entrée d'historique, un fichier de test `katchAdiposite.test.ts` (7 cas, dont le balayage de continuité au pas de 0,1 point qui a tué la version « seuil »), et la reprise des 9 tests. **Compter une demi-journée**, pas dix minutes.
