# Arbitrage — audit du catalogue de recettes (plan-correction-kyroz.md)

Date : 2026-09-10 · Source arbitrée : `plan-correction-kyroz.md` (daté 2026-09-09).
Mesures refaites ici sur `Recette/recettes-kyroz.json` (512 recettes, 125 refs), commit `9315df9`.

> Ce document **arbitre** l'audit, il ne l'applique pas. Trois de ses sept points sont
> déjà réglés ou reposent sur une mesure fausse ; deux sont réels et petits ; deux sont
> réels et gros. Ce qui suit dit lesquels, avec le chiffre qui le prouve.

---

## 1. Verdict point par point

| # | Point de l'audit | Verdict mesuré | Suite |
|---|---|---|---|
| 1 | Deux tables nutritionnelles désynchronisées — « bloquant » | ❌ **Faux problème** : c'est l'architecture, connue et documentée | Rien à corriger. Un nettoyage cosmétique possible (§3.1) |
| 2 | 11 recettes citent un ingrédient inexistant | ✅ **Confirmé, ouvert** | À faire (§2.1) |
| 3 | 7 noms qui promettent un aliment absent | ✅ **Déjà fait** — PR #247, le 2026-09-09 | Rien |
| 4 | ~200 assemblages « bout à bout » | ✅ **Confirmé : 197 recettes ≤ 2 étapes** | Le vrai chantier (§2.2) |
| 5 | ~25 recettes « étranges » | ⚠️ **Partiellement faux** : maladie A quasi inexistante, B et C réelles mais mal diagnostiquées | Réduit (§2.3) |
| 6 | Vegan porté par 3 béquilles | ✅ **Confirmé : 121 ancres sur 512** | Structurel (§2.4) |
| 7 | Aucun simili-carné | ✅ Confirmé (0 ref) | Arbitrage produit (§2.4) |

---

## 2. Ce qui est réel

### 2.1 — Les 11 recettes qui citent un ingrédient absent · **P0, petit, à faire**

Confirmé au mot près. Le balayage refait (18 mots-condiments testés) ne trouve **rien de plus** :

| mot cité | recettes | ids |
|---|---|---|
| bouillon | 8 | rep47, rep122, rep126, rep153, rep154, rep155, rep156, rep165 |
| vinaigre / vinaigrette | 3 | rep109, rep140, rep160 |
| miso | 1 | rep47 (déjà compté) |

**Total : 11 recettes distinctes.** Les autres alertes du balayage (« crème » 26, « fromage » 5,
« citron » 16) sont des faux positifs vérifiés à la lecture : « crème » décrit une texture
(« jusqu'à obtenir une crème lisse »), « fromage » désigne le `cottage_cheese` déjà listé,
« citron » est un assaisonnement libre — exactement le périmètre que `nomsHonnetes.test.ts`
a déjà arbitré et écrit noir sur blanc le 2026-09-09.

**Arbitrage : option A de l'audit, et le précédent existe déjà.** `sauce_soja` a été ajoutée
le 2026-07-29 pour cette raison exacte (« citée en instruction, invisible du dérivé régime »).
Trois refs à créer : `bouillon_legumes`, `miso`, `vinaigre`. Le miso porte du **gluten** sauf
mention contraire → `recipeDiet.VIOLATIONS` doit le déclarer, ce qui retirera « sans gluten »
de rep47. C'est le seul effet de bord, et c'est une correction, pas une régression.

> **Avant / après pour l'utilisateur** : aujourd'hui il lit « fais revenir dans le bouillon »,
> ouvre sa liste de courses, et le bouillon n'y est pas. Après : il y est, et son régime est
> calculé sur ce qu'il mange vraiment.

**Garde-fou** : un test `ingredientsCites.test.ts` sur les 11 mots matériels seulement. Ne
**pas** élargir le filet — mesuré : à 18 mots il rend 61 signalements dont 11 justes.

### 2.2 — Les 197 recettes ≤ 2 étapes · **P1, le vrai chantier**

Mesuré, vague par vague :

| vague | recettes | moy. étapes | ≤ 2 étapes |
|---|---|---|---|
| 2026-06-19-vegan | 156 | 2,1 | **144 (92 %)** |
| 2026-07-22-sans-gluten | 46 | 2,3 | **40 (87 %)** |
| fondation | 92 | 3,0 | 13 (14 %) |
| vagues 2026-08-* (14 lots) | 218 | 3,0 à 6,0 | **0** |

**Total : 197.** Le diagnostic de l'audit est bon et sa cause est claire : les vagues de juin
et juillet ont été écrites **avant** que la norme d'instructions du brief existe. Les 14 lots
d'août, écrits après, sont à zéro. Ce n'est pas une dérive qui s'aggrave, c'est une dette
datée qui ne bouge plus.

**Arbitrage : réécrire, ne pas supprimer.** Supprimer 197 recettes sur 512 ferait s'effondrer
le vivier (`mesure:vivier` dit déjà qu'une femme de 55 kg en sèche, vegan et sans gluten
dispose de 3 collations sur 86). Ces recettes sont des enveloppes nutritionnelles valides
avec un texte pauvre — c'est le texte qu'on refait, pas l'assiette.

**Séquence recommandée** — l'inverse de celle de l'audit :
1. **sans-gluten (40)** d'abord — le plus petit lot, et celui qui sert le vivier le plus tendu.
2. **vegan (144)** ensuite, en 3 vagues de ~50, avec la refonte des ancres (§2.4) dans le même
   passage : réécrire deux fois les mêmes recettes serait absurde.
3. **fondation (13)** en dernier — 13 recettes, une soirée.

**Garde-fou avant de commander quoi que ce soit** : un test `vraieRecette.test.ts` avec un
cliquet (le nombre de recettes ≤ 2 étapes ne peut que baisser), pas un seuil absolu — sinon la
suite est verte le jour où on l'écrit et le reste jusqu'à la fin.

⚠️ **Le critère « étape de liaison » de l'audit n'est pas codable.** « Une étape de liaison
(sauce, mijotage, marinade, enrobage) » ne se mesure pas sans lire. Ce qui se mesure :
≥ 3 étapes, et chaque étape porte une **durée** ou un **feu** (les deux se grep). Écrire une
règle qu'aucun test ne compte, c'est écrire une décoration.

### 2.3 — Les recettes « étranges » · **réduit de ~25 à ~6**

**Maladie A (laitage froid sur féculent chaud) — écartée.** L'audit l'a diagnostiquée sur
l'appariement des ingrédients, sans lire les instructions. Vérification sur ses propres pires
cas :

- `rep203` (« le pire ») : *« Mélange le sarrasin à la poêlée et **laisse tiédir hors du feu 2 minutes** »*
- `rep202` : *« Égrène le boulgour et **laisse-le tiédir, sinon il liquéfie le fromage blanc** »*
- `col17` : *« Coupe le feu et **laisse tiédir 5 minutes — versée brûlante sur le skyr, elle le ferait trancher** »*
- `rep205` : *« mélange-les aux légumes **hors du feu**, ajoute le cottage cheese par cuillerées »*
- `rep222` : *« **laisse-le tiédir : trop chaud, il liquéfie le fromage** »*

La règle que l'audit demande d'écrire est **déjà écrite — dans les recettes elles-mêmes**.
Reste `rep184` seul (cottage cheese sur polenta chaude), et c'est un dressage assumé, pas
une erreur. Aucun test à créer : sur ce corpus il rendrait 41 signalements pour 1 juste.

**Maladie B (châtaigne) — réelle, mais le diagnostic est à côté.** 19 recettes contiennent
`chataigne`, et **aucune n'est un `repas_complet`** : la règle « jamais en accompagnement d'un
plat salé » est déjà tenue. Le vrai défaut est ailleurs et il est plus simple à nommer : des
plats **salés servis en petit-déjeuner ou en collation**. `pd118` « Châtaigne fondante au soja
texturé » — châtaigne, lait de coco, **haricots verts**, PST doré — au petit-déjeuner. `col92`
« Champignons poêlés à la châtaigne » en collation. **~6 recettes**, à réaffecter de créneau ou
à réécrire. `col85` (« Crème de châtaigne à la protéine de pois et banane ») est saine : la
poudre y est attendue.

**Maladie C (poudre déguisée en plat) — réelle, mais c'est le §2.4, pas un lot de correctifs.**
Elle ne se traite pas recette par recette : elle disparaît quand les ancres basculent.

### 2.4 — Les ancres vegan · **P2, structurel, le seul vrai arbitrage produit**

Recompté sur les 512 (ancre = l'ingrédient `protein` qui porte le plus de protéines) :

| ancre | recettes | nature |
|---|---|---|
| `yaourt_soja_proteine` | 43 | un yaourt |
| `proteine_vegetale` | 41 | de la poudre |
| `soja_texture` | 37 | hachée à réhydrater |
| **sous-total béquilles** | **121** | |
| tofu ferme 25 · seitan 18 · tempeh 14 · edamame 13 | **70** | les vraies pièces |

Le constat de l'audit tient. Son analyse de la cause aussi : la cible protéique est
intenable en vegan sans poudre ni yaourt, et le seitan est du gluten.

**Arbitrage : détendre la cible, ne PAS ajouter de simili-carnés.**

L'audit recommande les deux. Je n'en recommande qu'un, et voici pourquoi le second est un
piège. `steak_soja`, `emince_vegetal`, `poulet_vegetal` sont des **produits de marque** :
leurs macros varient de 30 % d'un fabricant à l'autre, et l'audit lui-même écrit « valeurs
indicatives, à valider ». Kyroz sert des chiffres qui doivent être ceux de l'assiette
(`CLAUDE.md`, et c'est la règle qui a coûté le plus cher à tenir). Un ref dont la valeur
dépend de la marque achetée est un **mensonge structurel** qu'aucun test ne peut attraper —
il n'a pas d'entrée Ciqual, donc il rejoindrait les 15 valeurs manuelles, celles qu'on ne
peut vérifier contre rien.

Détendre la cible sur les créneaux vegan est en revanche **mesurable** : `mesure:vivier` et
`mesure:seuils` disent exactement ce que ça ouvre, avant d'écrire une recette. C'est le
levier qui se prouve.

> À trancher par toi, c'est une décision produit, pas technique : **accepter 25-30 g de
> protéines sur un repas vegan au lieu de 40**, ou garder la cible et vivre avec les
> béquilles. Il n'y a pas de troisième porte honnête.

---

## 3. Ce qui est déjà réglé, ou faux

### 3.1 — « Deux tables désynchronisées, tout contrôle est faussé » — non

C'est le point que l'audit classe **bloquant**, et c'est celui où il se trompe le plus.
Il a lu `ingredients_reference.per_100` comme si c'était la valeur servie. Ce n'est pas le cas
depuis le 2026-08-01 :

- `lib/recipeData.ts:25` — pour les 108 refs mappés, la valeur servie vient de **Ciqual**
  (`foods.generated.ts` via `recipeFoodMap.ts`). Le `per_100` du JSON n'est qu'un **repli**
  pour les 17 refs sans entrée ANSES.
- `lib/recipeMap.ts:22` — la fiche affiche `macros_per_portion`, **dérivé des ingrédients
  résolus**. `macros_per_serving` n'est lu par **aucun écran** (vérifié : 0 occurrence hors
  scripts et tests).
- `scripts/gen-brief-lot.ts:41` — le brief §4 publie déjà les valeurs du **moteur**, pas le
  repère manuel. Ce défaut-là a existé, il a été corrigé le 2026-08-01, et le commentaire
  qui l'explique est encore en place.

Donc : **la divergence est le fonctionnement normal, et rien de faux n'est affiché.** Les
« 6 recettes à écart visible > 10 % » n'existent pas — j'ai remesuré : les 8 recettes qui
divergent de la table manuelle (`pd81`, `col93`, `col101`, `col102`, `col103`, `pd83`,
`pd122`, `col74`) sont celles écrites **contre Ciqual**, c'est-à-dire les justes. L'audit a
lu l'écart à l'envers.

Le garde-fou existe et il est vert : `recipeMap.test.ts` recalcule les 512 recettes
(cohérence exacte < 2 %) et vérifie que Ciqual ne s'éloigne pas de plus de 30 % du repère
manuel — c'est le filet anti-mauvais-mapping. Les trois tests recettes passent (24/24).

**Seul reste vrai** : `ingredients_reference.per_100` est un champ que **plus personne ne
sert** pour 108 refs sur 125, et qui a l'air d'une autorité. Deux options, aucune urgente —
soit le regénérer depuis `foods.generated.ts`, soit écrire dans le JSON qu'il est un repli.
La seconde coûte trois lignes.

### 3.2 — Les noms menteurs : fait le 2026-09-09

PR #247. Neuf titres corrigés (l'audit en annonçait sept), verrouillés par
`nomsHonnetes.test.ts`, qui documente au passage les **deux faux positifs de l'audit** :
`col76` et `rep213` citaient « sésame » et contiennent du `tahini`, dont le libellé servi
est « Purée de sésame (tahini) ». Rien à refaire.

---

## 4. Ordre de bataille arbitré

| | Chantier | Volume réel | Effort |
|---|---|---|---|
| 1 | 3 refs condiment + 11 recettes + test ciblé | 11 recettes | ~1 session |
| 2 | Réaffecter/réécrire les ~6 plats salés servis en pdj/collation | 6 recettes | ~1 session |
| 3 | **Décision produit** : détendre la cible protéique vegan ? | — | ta décision |
| 4 | Réécrire sans-gluten (40), avec le cliquet en place d'abord | 40 recettes | 1 vague |
| 5 | Réécrire vegan (144) en 3 vagues, ancres refondues dans le même passage | 144 recettes | 3 vagues |
| 6 | Réécrire fondation (13) | 13 recettes | ~1 session |

Le chantier 3 **bloque** le 5 : réécrire 144 recettes vegan avant d'avoir tranché la cible,
c'est les réécrire deux fois.

⚠️ **`mesure:vivier` avant de commander chaque vague**, et `check:doublons` + `check:enveloppe`
avant de concaténer. La chaîne est déjà écrite dans `Recette/README.md` — elle n'a pas besoin
d'être réinventée, seulement suivie.
