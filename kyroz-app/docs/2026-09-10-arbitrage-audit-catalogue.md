# Arbitrage — audit du catalogue de recettes (plan-correction-kyroz.md)

Date : 2026-09-10 · Source arbitrée : `plan-correction-kyroz.md` (daté 2026-09-09).
Mesures refaites sur `Recette/recettes-kyroz.json` — **512 recettes / 125 refs au commit
`9315df9`** pour la rédaction d'origine ; les mesures ajoutées le 2026-09-11 portent sur
**516 recettes / 132 refs** (après les PR #248, #255 et la vague B11), et le disent.

> Ce document **arbitre** l'audit, il ne l'applique pas. Trois de ses sept points sont
> déjà réglés ou reposent sur une mesure fausse ; deux sont réels et petits ; deux sont
> réels et gros. Ce qui suit dit lesquels, avec le chiffre qui le prouve.
>
> 🔴 **RELU ET CORRIGÉ LE 2026-09-11, sur trois points, tous à mon désavantage** — les
> corrections sont dans le corps du texte, datées, l'erreur d'origine conservée à côté :
> · **§2.1** était déjà livré la veille par la PR #248, en **17** recettes et non 11, et
>   par l'option que je n'avais PAS recommandée — la meilleure des deux ;
> · **§2.4** refusait les simili-carnés au motif qu'aucune valeur vérifiable n'existait.
>   **Ciqual les porte**, et ses entrées « préemballé » sont l'aliment moyen du marché
>   français. Le fondateur a tranché l'inverse de ma reco, et il avait raison ;
> · **§2.4** encore : le levier « détendre la cible protéique » est désormais CHIFFRÉ,
>   après deux mesures fausses. C'est la seule décision qui reste ouverte.

---

## 1. Verdict point par point

| # | Point de l'audit | Verdict mesuré | Suite |
|---|---|---|---|
| 1 | Deux tables nutritionnelles désynchronisées — « bloquant » | ❌ **Faux problème** : c'est l'architecture, connue et documentée | Rien à corriger. Un nettoyage cosmétique possible (§3.1) |
| 2 | 11 recettes citent un ingrédient inexistant | ✅ Confirmé — **et réglé le 2026-09-09** (PR #248), en **17** recettes et non 11 | Rien (§2.1) |
| 3 | 7 noms qui promettent un aliment absent | ✅ **Déjà fait** — PR #247, le 2026-09-09 | Rien |
| 4 | ~200 assemblages « bout à bout » | ✅ **Confirmé : 197 recettes ≤ 2 étapes** | Le vrai chantier (§2.2) |
| 5 | ~25 recettes « étranges » | ⚠️ **Partiellement faux** : maladie A quasi inexistante, B et C réelles mais mal diagnostiquées | Réduit (§2.3) |
| 6 | Vegan porté par 3 béquilles | ✅ **Confirmé : 121 ancres sur 512** | Structurel (§2.4) |
| 7 | Aucun simili-carné | ✅ Confirmé (0 ref) | Arbitrage produit (§2.4) |

---

## 2. Ce qui est réel

### 2.1 — Les 11 recettes qui citent un ingrédient absent · ✅ **RÉGLÉ le 2026-09-09**

> 🔴 **Ce paragraphe a été écrit alors que le travail était déjà fait, et il l'ignorait.**
> La PR #248 a livré le correctif le 2026-09-09 — le même jour que l'audit, avant que cet
> arbitrage ne soit rédigé. Ce qui suit est donc conservé pour deux raisons : mon compte
> était **incomplet**, et l'arbitrage que je recommandais a été **tranché dans l'autre
> sens**. Les deux méritent d'être lus.
>
> **Le compte réel est 17, pas 11.** Mon balayage testait 18 mots choisis à la main ; il a
> trouvé bouillon, miso, vinaigre. Il a raté **sauce teriyaki** (rep50, rep73, rep147),
> **yaourt** (rep139), **granola** (col13), **croûtons** (rep112), **compote** (col54) —
> six denrées qui n'étaient dans aucune de mes listes. ➡️ *Une liste de mots écrite à la
> main mesure ce à quoi on a pensé, pas ce qui existe.* Le test livré (`ingredientsCites`)
> part de la **liste d'ingrédients** et cherche ce que les instructions citent en plus :
> il n'a pas de liste à oublier.
>
> **Et c'est l'option B qui a été retenue, pas mon option A.** Je recommandais de créer
> `bouillon_legumes`, `miso`, `vinaigre` (« retirer le bouillon casse le risotto »). La
> PR a réécrit les 17 recettes **sans toucher aux ingrédients**, en remplaçant la denrée
> manquante par ce que la recette sert vraiment. C'est plus honnête que ma proposition :
> ajouter un ref pour justifier une instruction, c'est faire entrer un aliment dans la
> liste de courses de quelqu'un pour couvrir une phrase — l'inverse du sens de lecture.
> Trois noms ont suivi (rep47 « Soupe miso » → « Soupe japonaise »), ce que mon option A
> n'aurait pas fait, et qui était nécessaire.
>
> ⚠️ Le vinaigre, lui, est traité comme un **assaisonnement libre** — même périmètre que
> `nomsHonnetes`. Mon option A voulait lui donner un ref : c'était sur-appliquer la règle.

*Ce qui suit est le constat d'origine, conservé daté.*

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

**Arbitrage d'origine (2026-09-10) : détendre la cible, ne PAS ajouter de simili-carnés.**
🔴 **Le fondateur a tranché l'inverse le même jour, et il avait raison sur le fait qui
comptait.** Les deux moitiés ont été rejugées depuis ; le paragraphe barré ci-dessous est
conservé parce que son erreur est instructive.

> ~~`steak_soja`, `emince_vegetal`, `poulet_vegetal` sont des **produits de marque** :
> leurs macros varient de 30 % d'un fabricant à l'autre… un ref dont la valeur dépend de
> la marque achetée est un **mensonge structurel** qu'aucun test ne peut attraper — il n'a
> pas d'entrée Ciqual, donc il rejoindrait les valeurs manuelles.~~
>
> **FAUX, et vérifiable en dix secondes.** Ciqual porte ces produits, sous des entrées
> « préemballé » qui SONT l'aliment moyen du marché français, agrégé par l'ANSES sur les
> références du commerce — exactement la moyenne qu'on aurait voulu calculer, en mieux :
> mesurée. Mon « il n'existe aucune valeur vérifiable » était un « il n'existe aucun… »
> que je n'avais jamais mesuré. Les 7 refs sont entrés le 2026-09-10, tous mappés Ciqual
> (PR #255).

### Ce que chaque levier rapporte VRAIMENT — mesuré le 2026-09-11

**Levier A — les pièces (fait).** Vague B11, 4 repas complets bâtis sur les pièces plutôt
que sur un yaourt ou une poudre. Le vivier `vegan` des petits gabarits monte (F 55 sèche
27 → 29 repas complets, F 65 sèche 38 → 42, H 80 sèche 51 → 54). Le vivier **vegan + sans
gluten ne bouge pas** : sur les 7 pièces, 4 sont au blé, et des 3 restantes deux
(`steak_soja`, `saucisse_vegetale`) sont trop grasses pour passer R8 à n'importe quelle
quantité. Il ne reste que `hache_vegetal`.

**Levier B — détendre la cible protéique du repas.** C'est LE levier, et voici son prix
exact. Vivier vegan + sans gluten du midi (50 repas complets), recettes réellement
servables selon le relâchement appliqué à la cible protéique :

| profil | cible actuelle | −0 % | −10 % | −20 % | −30 % |
|---|---|---|---|---|---|
| F 55 sèche | 458 kcal / 31 g P | **20** | **39** | 42 | 47 |
| F 65 sèche | 518 kcal / 35 g P | **32** | **43** | 46 | 44 |
| H 65 sèche | 603 kcal / 40 g P | **37** | **47** | 47 | 44 |
| H 80 sèche | 694 kcal / 47 g P | **35** | **45** | 41 | 39 |
| F 80 sèche | 587 kcal / 41 g P | **36** | **41** | 41 | 38 |

➡️ **−10 % suffit, et c'est le meilleur rapport partout.** Pour une femme de 55 kg en
sèche, le vivier vegan+SG **double** (20 → 39) pour 3 g de protéines en moins sur le repas
(31 → 28). Au-delà, ça ne rapporte plus grand-chose et ça se dégrade même sur trois profils
sur cinq — les recettes deviennent trop petites au lieu d'être trop grosses.

> **La décision produit, une fois posée sur ses vrais chiffres** : accepter **−3 g de
> protéines par repas sur les créneaux vegan** (soit ~10 %) pour doubler le choix des
> petits gabarits, ou garder la cible au gramme près et laisser ces personnes devant
> 20 recettes sur 50. C'est ta décision, et c'est la seule qui reste sur ce sujet.

⚠️ **CETTE MESURE A DEMANDÉ TROIS INSTRUMENTS, ET LES DEUX PREMIERS MENTAIENT — dans des
sens opposés.** C'est la partie à retenir, plus que le chiffre.

1. **L'audit affirmait** que la cible protéique était le goulot. Prémisse reprise sans
   mesure, des deux côtés.
2. **Premier test (faux) : « et si on ignorait le drapeau `protein_below_target` ? »**
   Réponse : +0 recette pour F 55 sèche. J'en ai conclu que la protéine n'était pas le
   problème, et que les plats étaient simplement trop gros. **L'erreur** : retirer le
   DRAPEAU ne change pas le comportement du moteur. `adaptRecipe` continue de viser la
   pleine cible protéique, donc il garde les quantités hautes, donc la recette reste trop
   grosse — et sort par `over_target_kcal`. Je mesurais le symptôme en laissant la cause
   en place.
3. **Deuxième test (faux dans l'autre sens) : le plancher de rétrécissement.** Les facteurs
   d'échelle vont jusqu'à 0,5× : les 50 repas vegan+SG peuvent TOUS descendre sous 458 kcal
   (plancher médian 337). Donc « trop gros » ne pouvait pas être une fatalité de format. Ce
   test-là est juste, mais il ne prouve rien tout seul : il dit que la place existe, pas que
   le moteur a le droit d'y aller.
4. **Troisième test (le bon) : baisser la CIBLE elle-même**, et laisser le moteur
   réoptimiser. C'est le seul qui reproduit la décision qu'on veut prendre.

➡️ **Les deux contraintes sont COUPLÉES** : le moteur ne choisit pas entre « assez petit »
et « assez protéiné », il cherche les deux à la fois. Mesurer l'une en neutralisant son
drapeau laisse l'autre tirer les quantités — et rend un résultat propre, cohérent, et faux.
**Pour mesurer un réglage, il faut bouger le réglage, pas masquer son alarme.**

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
| ~~1~~ | ~~3 refs condiment + 11 recettes + test ciblé~~ | ✅ **fait** — PR #248, autrement et mieux (§2.1) | — |
| 2 | Réaffecter/réécrire les ~6 plats salés servis en pdj/collation | 6 recettes | ~1 session |
| ~~2b~~ | ~~Ajouter les simili-carnés~~ | ✅ **fait** — 7 pièces, PR #255, toutes sourcées Ciqual (§2.4) | — |
| 3 | **Décision produit** : −10 % sur la cible protéique des créneaux vegan ? Chiffré en §2.4 : le vivier vegan+SG des petits gabarits **double** (20 → 39) pour 3 g de protéines en moins par repas | — | **ta décision, la seule qui reste** |
| 4 | Réécrire sans-gluten (40), avec le cliquet en place d'abord | 40 recettes | 1 vague |
| 5 | Réécrire vegan (144) en 3 vagues, ancres refondues dans le même passage | 144 recettes | 3 vagues |
| 6 | Réécrire fondation (13) | 13 recettes | ~1 session |

Le chantier 3 **bloque** le 5 : réécrire 144 recettes vegan avant d'avoir tranché la cible,
c'est les réécrire deux fois.

⚠️ **`mesure:vivier` avant de commander chaque vague**, et `check:doublons` + `check:enveloppe`
avant de concaténer. La chaîne est déjà écrite dans `Recette/README.md` — elle n'a pas besoin
d'être réinventée, seulement suivie.
