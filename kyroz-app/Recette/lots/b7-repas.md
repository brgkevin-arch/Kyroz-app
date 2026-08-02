# B7 — 10 repas complets végétaux, pour les cellules affamées

**Lot autonome.** Tout ce qu'il faut est dans ce fichier : le format de sortie, les ingrédients
autorisés avec leurs macros, les règles, et ce qui est déjà pris dans le catalogue. Tu n'as besoin
d'aucun autre document et d'aucun accès au code.

Généré depuis le catalogue live (466 recettes) — les valeurs ci-dessous sont exactes.

---

## 1. La commande

**10 recettes de catégorie `repas_complet` (repas complet).**

ids à produire, dans cet ordre, sans trou et sans doublon :
`rep271`, `rep272`, `rep273`, `rep274`, `rep275`, `rep276`, `rep277`, `rep278`, `rep279`, `rep280`

Répartition par régime, à respecter exactement. **Les trois lignes sont exclusives** : une
recette tombe dans une seule, et c'est l'ingrédient le plus restrictif qui décide.

| | Nombre |
|---|---|
| **Carnées ou marines** — contiennent viande, volaille ou poisson | **0** |
| **Végétariennes** — œufs et/ou laitages, **aucune** chair animale | **0** |
| **Vegan** — aucun produit animal (ni œuf, ni laitage, ni miel) | **10** |
| **dont sans gluten, toutes lignes confondues** | **≥ 7** |

Le sans-gluten est **transverse** : une recette vegan peut compter dans les deux colonnes. N'écris
jamais le régime dans la recette — il est **déduit** des `ref` employés.

---

## 2. Comment l'application utilise ta recette (à lire, ça change tout)

**L'application ne sert jamais la recette telle que tu l'écris.** Un moteur redimensionne chaque
ingrédient marqué `scalable` pour tomber sur la cible calorique de la personne, repas par repas.
Ta recette n'est pas un plat, c'est une **enveloppe**.

Les facteurs de redimensionnement, par `macro_role` — **lus dans la config du moteur au moment
de générer ce fichier**, donc jamais périmés :

| `macro_role` | Min | Max | Ce que ça implique |
|---|---|---|---|
| `protein` | 0,50 | 1,70 | Porte la protéine du plat. Sa borne basse est le levier qui permet de servir les petits gabarits. |
| `carb` | 0,50 | 1,80 | Le plus élastique, et aucun plafond absolu : c'est lui qui va chercher les grosses cibles. |
| `fat` | 0,50 | 1,50 | Plafonné en plus par la colonne « Max abs. » du §4. |
| `dairy` | 0,60 | 1,60 | **Ne tient aucun plancher protéique** — un laitage qui porte la protéine se déclare `protein`. |
| `fruit` | 0,50 | 1,60 |  |
| `vegetable`, `flavor` | fixe | fixe | Jamais redimensionnés → **toujours `"scalable": false`**. |

**Ce qui compte n'est PAS d'écrire une base petite, c'est d'écrire une base ÉQUILIBRÉE.** Tous
les rôles redimensionnables descendent à la moitié de ta quantité et montent au moins de moitié :
une base bien répartie s'étire dans les deux sens. Ce qui coince, c'est un ingrédient qui pèse
trop lourd par rapport aux autres — il tape sa borne avant que la cible soit atteinte.

Mesuré en passant la même composition au moteur à différentes tailles de base, sur les 12 profils :

| Base écrite | Profils servis | |
|---|---|---|
| 521 kcal · 32 g P | 10 / 12 |
| 575 kcal · 36 g P | 11 / 12 |
| 638 kcal · 39 g P | 12 / 12 | ← l'enveloppe de CE lot
| 647 kcal · 40 g P | 12 / 12 | ← l'enveloppe de CE lot
| 710 kcal · 44 g P | 12 / 12 |
| 811 kcal · 50 g P | 12 / 12 |
| 908 kcal · 56 g P | 10 / 12 |

Retiens-en la ligne de crête : trop bas, la recette ne monte pas jusqu'aux gros gabarits ; trop
haut, elle sur-sert les petits. L'enveloppe du §3 est le point mesuré le plus couvrant — **tiens-la
sans chercher à la déborder dans un sens ou dans l'autre**.

⚠️ **Ne vise pas le 12/12.** Le tableau ci-dessus montre UNE composition, et une composition
peut atteindre 12. Une ENVELOPPE, non : balayée sur les 250 recettes du catalogue, la moyenne
la plus haute jamais atteinte est **10,2 profils sur 12**, quelle que soit l'enveloppe. Ce que
l'enveloppe du §3 délivre en moyenne, mesuré : **9,6/12 en repas complet, 9,9/12 en petit-déj**.
Une recette parfaitement conforme peut tomber à 5/12 — c'est la composition qui décide, et c'est
pour ça que `check:enveloppe` note recette par recette.

### Les 12 profils que ta recette doit couvrir

Cibles réelles calculées par l'application, moyennées sur 4 semaines de plans. La colonne qui
compte pour toi est **repas complet**.

| Profil | kcal/jour | Petit-déj | Repas complet | Collation |
|---|---|---|---|---|
| Femme 55 kg, sèche | 1342 | 332 · 24 P | 421 · 31 P | 115 · 4 P |
| Femme 60 kg, maintien | 1728 | 449 · 22 P | 540 · 26 P | 190 · 1 P |
| Femme 65 kg, sèche | 1531 | 390 · 29 P | 477 · 35 P | 162 · 11 P |
| Femme 65 kg, maintien | 1816 | 470 · 24 P | 568 · 28 P | 203 · 1 P |
| Femme 70 kg, prise de masse | 2295 | 597 · 25 P | 720 · 28 P | 240 · 1 P |
| Femme 80 kg, sèche | 1731 | 450 · 34 P | 549 · 41 P | 213 · 15 P |
| Homme 65 kg, sèche | 1779 | 463 · 33 P | 563 · 40 P | 212 · 15 P |
| Homme 70 kg, maintien | 2147 | 558 · 28 P | 677 · 33 P | 227 · 4 P |
| Homme 80 kg, sèche | 2104 | 548 · 39 P | 671 · 48 P | 263 · 18 P |
| Homme 80 kg, maintien | 2328 | 605 · 32 P | 738 · 38 P | 276 · 8 P |
| Homme 95 kg, prise de masse | 2967 | 771 · 36 P | 928 · 41 P | 358 · 5 P |
| Homme 110 kg, prise de masse | 3206 | 834 · 41 P | 1005 · 46 P | 381 · 7 P |

Rien n'est genré dans une recette. Ce qui change entre un homme et une femme, c'est **la cible** :
à poids et taille égaux la formule de dépense énergétique retire 161 kcal, et la moitié basse de
la population est très majoritairement féminine. Un homme léger en sèche a exactement le même
besoin qu'une femme au maintien.

---

## 3. Enveloppe imposée pour CE lot

| | Base à écrire |
|---|---|
| Calories | **600 – 660 kcal** |
| Protéines | **35 – 40 g** |
| Glucides | 64 – 78 g |
| Lipides | 18 – 23 g |

> **Densité protéique imposée : 5.3 à 6.7 g de protéines pour 100 kcal.**
> C'est la conséquence arithmétique des fourchettes ci-dessus, et c'est **la contrainte qui
> décide** de la couverture — plus que les calories. Vérifie-la sur chaque recette :
> `protéines × 100 ÷ kcal`.

- **Base 600–660 kcal ET 35 à 40 g de protéines. Les deux bornes ensemble.** Mesuré sur le moteur : monter les calories sans monter la protéine rend MOINS de profils servis, pas plus.
- 🎯 **TOUTES les recettes de ce lot sont végétaliennes**, et pour une raison arithmétique : une recette végétalienne entre aussi dans les pools halal, pescatarien, sans lactose, végétarien et sans porc (166 fois sur 166 au catalogue). Le créneau visé est la cellule la plus affamée du catalogue après les collations — **une femme de 55 kg en sèche, vegan et sans gluten, dispose de 4 repas complets sur 270**.
- 🎯 **Les ancres qui TIENNENT cette enveloppe, mesurées une par une** (profils servis sur 12) : `edamame` 12, `seitan` 12, `yaourt_soja_proteine` 12, `proteine_vegetale` 11-12, `soja_texture` 10-11, `feves` 8. **Privilégie `edamame` et `feves`** : elles sont quasi inemployées en repas complet alors qu'elles sont parfaitement calibrées. `soja_texture` et `proteine_vegetale` portent déjà 38 et 34 recettes — **au plus 2 recettes du lot chacune**.
- ⚠️ **Ce qui NE tient PAS cette enveloppe, et ce n'est pas une question de goût** : `tofu_ferme` 4 profils sur 12, `tofu_fume` 4, `tofu_soyeux` 3, `pois_chiches` secs 2, `haricots_noirs` 4, `lentilles_vertes` 5, `haricots_blancs` 5, `lentilles_corail` 7, `tempeh` 7. Toutes coûtent trop de calories par gramme de protéine : à 37 g de protéines elles remplissent l'assiette avant le féculent, et le moteur n'a plus rien à étirer. Elles restent excellentes **en appoint** (30–60 g), jamais comme ancre principale.
- 🎯 **L'appoint n'est pas un détail : il crée une FAMILLE À PART ENTIÈRE.** L'application regroupe les recettes par l'ENSEMBLE de leurs ingrédients protéiques × leur féculent. `edamame` + `quinoa` et `edamame` + `haricots_rouges` + `quinoa` sont donc deux familles distinctes, et c'est la variété perçue qui en profite — deux plats de la même famille dans une semaine, l'utilisateur les voit comme une répétition. ➡️ **Associe une ancre dense à une légumineuse en appoint** : tu doubles les combinaisons sans sortir de l'enveloppe. ⚠️ Le plafond de 2 recettes par `ref` protéique compte AUSSI les appoints — ne pose pas la même légumineuse partout.
- ⚠️ **Le plafond est serré, compte avant d'écrire** : 6 ancres principales employables × 2 = 12 places pour 10 recettes, et `seitan` est réservé aux 3 recettes avec gluten. Il te faut au moins 5 ancres distinctes, et tu ne peux en poser aucune trois fois.
- ⚠️ **Un vrai féculent `carb` et `scalable`, 95 à 125 g pesés SECS, dans CHAQUE recette.** C'est lui qui va chercher les gros gabarits — il monte sans plafond absolu. Les 6 repas complets du catalogue sans féculent servent **1,5 profil sur 12** en moyenne, contre 8,7 pour les 264 autres.
- Ancre grasse `fat` + `scalable`, **18 à 23 g** de lipides.
- Sous-lot sans gluten (7 des 10) : `seitan` en est exclu (il est fait de gluten), ainsi que `pates_completes`, `pates_semoule`, `boulgour`, `semoule_couscous`, `nouilles_completes`, `tortilla_complete`, `pain_complet`, `pain_pita_complet`. Autorisés : `quinoa`, `sarrasin`, `millet`, `polenta`, `riz_basmati`, `riz_complet`, `nouilles_riz`, `patate_douce`, `pomme_de_terre`, `mais`, `wrap_sans_gluten`, `pain_sans_gluten`.
- ⚠️ **Ce lot est jugé sur le MIDI ET LE SOIR** — un repas complet est servi aux deux créneaux, et la cible du soir est plus basse. `check:enveloppe` retient le PIRE des deux.
- **Légumineuses : version prête à consommer** (`pois_chiches_conserve`, `lentilles_cuites`, `haricots_rouges_conserve`) quand tu en emploies en appoint. Le poids écrit est le poids ACHETÉ ; la version sèche ferait afficher un poids sec en liste de courses.

---

## 4. Les 97 `ref` autorisés

**Règle absolue : tu n'emploies QUE ces clés.** Un ingrédient absent de cette table n'existe pas
pour l'application — il serait invisible au calcul des macros, au filtre des régimes et à la liste
de courses. Si un ingrédient te manque vraiment, ne l'invente pas : signale-le à la fin de ta
réponse, hors du JSON.

Les valeurs /100 g ci-dessous sont **celles que l'application sert réellement** — c'est avec
elles qu'elle calcule les macros de l'assiette et qu'elle juge si ta recette est servable.
Calcule ton `macros_per_serving` avec elles et rien d'autre.

Colonnes : **Pesée** = « SEC » signifie que la quantité écrite est le poids sec avant cuisson (riz,
pâtes, légumes secs), « cru » le poids cru (viandes, poissons, tubercules). **Max abs.** = plafond
absolu que la quantité de base ne peut pas dépasser. **Déjà utilisé** = nombre de recettes de cette
catégorie qui emploient déjà ce `ref` (un chiffre élevé = format saturé, cherche ailleurs).
**⛔SG** = contient du gluten, donc exclu des recettes sans gluten.

| `ref` | Nom affiché | Unité | kcal/100 | P/100 | C/100 | L/100 | Pesée | Max abs. | Déjà utilisé |
|---|---|---|---|---|---|---|---|---|---|
| `amandes` | Amandes | g | 631 | 21.4 | 8.8 | 52.5 | — | ≤ 40 | 12 |
| `ananas` | Ananas | g | 52 | 0.2 | 11.7 | 0.5 | — | — | 1 |
| `asperges` | Asperges | g | 25 | 2.5 | 2 | 0.3 | — | — | 11 |
| `avocat` | Avocat | g | 203 | 1.6 | 0 | 20.6 | — | ≤ 100 | 24 |
| `betterave` | Betterave cuite | g | 42 | 1.4 | 7.1 | 0.4 | — | — | 6 |
| `beurre_cacahuete` | Beurre de cacahuète | g | 643 | 22.2 | 17.3 | 51.4 | — | ≤ 40 | 9 |
| `blanc_oeuf` | Blanc d'œuf | g | 48 | 10.9 | 0.7 | 0.2 | — | — | 12 |
| `boeuf_5` | Bœuf haché 5% MG | g | 130 | 21.9 | 0.3 | 4.6 | cru | — | 15 |
| `boeuf_bavette` | Bavette de bœuf | g | 133 | 20.4 | 0 | 5.7 | cru | — | 9 |
| `boisson_soja` | Boisson au soja nature | ml | 42 | 3.2 | 1.9 | 2.1 | — | — | 0 |
| `boulgour` ⛔SG | Boulgour | g | 347 | 11.7 | 65.8 | 1.4 | SEC | — | 19 |
| `brocoli` | Brocoli | g | 32 | 2.9 | 2.1 | 0.4 | — | — | 22 |
| `cabillaud` | Dos de cabillaud | g | 77 | 18.1 | 0 | 0.6 | cru | — | 17 |
| `carotte` | Carotte | g | 30 | 0.8 | 5.2 | 0.5 | — | — | 19 |
| `champignons` | Champignons | g | 21 | 2.1 | 1.8 | 0.4 | — | — | 20 |
| `chapelure` ⛔SG | Chapelure | g | 365 | 9.4 | 74.3 | 1.6 | — | ≤ 40 | 1 |
| `chou_fleur` | Chou-fleur | g | 25 | 1.8 | 2.1 | 0.7 | — | — | 10 |
| `concombre` | Concombre | g | 17 | 0.7 | 2.9 | 0.1 | — | — | 13 |
| `cottage_cheese` | Cottage cheese | g | 98 | 11 | 3 | 4.3 | — | — | 8 |
| `courgette` | Courgette | g | 17 | 1.2 | 1.8 | 0.3 | — | — | 29 |
| `creme_soja` | Crème de soja | ml | 152 | 3.2 | 2 | 14.7 | — | ≤ 80 | 13 |
| `crevettes` | Crevettes cuites | g | 91 | 20.5 | 0.2 | 0.8 | — | — | 12 |
| `dinde_escalope` | Escalope de dinde | g | 108 | 23.7 | 0 | 1.5 | cru | — | 12 |
| `edamame` | Edamame | g | 125 | 11 | 9 | 5 | — | — | 5 |
| `epinards` | Épinards frais | g | 33 | 2.7 | 3.1 | 0.4 | — | — | 34 |
| `falafel` ⛔SG | Falafel prêt à consommer | g | 211 | 7.4 | 17.7 | 10.8 | — | ≤ 200 | 0 |
| `feta` | Feta | g | 273 | 15.4 | 1.2 | 22.6 | — | ≤ 60 | 12 |
| `feves` | Fèves | g | 301 | 26.1 | 33.3 | 1.5 | SEC | — | 1 |
| `fromage_blanc_0` | Fromage blanc 0% | g | 48 | 7.3 | 4.2 | 0.1 | — | — | 6 |
| `graines_courge` | Graines de courge | g | 618 | 29.5 | 5.4 | 49.1 | — | ≤ 30 | 20 |
| `haricots_blancs` | Haricots blancs | g | 307 | 23.4 | 43.9 | 0.8 | SEC | — | 5 |
| `haricots_noirs` | Haricots noirs | g | 341 | 21 | 47 | 1.5 | SEC | — | 5 |
| `haricots_rouges` | Haricots rouges | g | 314 | 22.5 | 46.1 | 1.1 | SEC | — | 9 |
| `haricots_rouges_conserve` | Haricots rouges (conserve, égouttés) | g | 108 | 8.3 | 13 | 1 | — | — | 0 |
| `haricots_verts` | Haricots verts | g | 32 | 1.8 | 4.1 | 0.2 | — | — | 12 |
| `huile_olive` | Huile d'olive | g | 899 | 0.2 | 0 | 99.9 | — | ≤ 25 | 136 |
| `jambon_blanc` | Jambon blanc | g | 117 | 20.5 | 0.8 | 3.5 | — | — | 9 |
| `lait_coco` | Lait de coco | ml | 199 | 1.9 | 4.3 | 19.2 | — | ≤ 120 | 27 |
| `legumes_wok` | Mélange wok (poivron/brocoli/carotte) | g | 30 | 1.5 | 5 | 0.3 | — | — | 16 |
| `lentilles_corail` | Lentilles corail | g | 328 | 27.7 | 44.9 | 0.8 | SEC | — | 5 |
| `lentilles_cuites` | Lentilles cuites (conserve ou sachet) | g | 125 | 10.1 | 16.2 | 0.6 | — | — | 1 |
| `lentilles_vertes` | Lentilles vertes | g | 327 | 25.1 | 44.5 | 1.8 | SEC | — | 4 |
| `levure_maltee` ⛔SG | Levure maltée | g | 350 | 50 | 35 | 5 | — | ≤ 20 | 3 |
| `mais` | Maïs | g | 105 | 2.7 | 18.3 | 1.7 | — | — | 12 |
| `maquereau` | Maquereau | g | 198 | 18.1 | 0.9 | 13.5 | cru | — | 1 |
| `miel` | Miel | g | 331 | 0.7 | 82.1 | 0 | — | — | 1 |
| `millet` | Millet | g | 360 | 11 | 73 | 4 | SEC | — | 14 |
| `mozzarella` | Mozzarella light | g | 227 | 16.5 | 0.7 | 17.7 | — | ≤ 60 | 3 |
| `nouilles_completes` ⛔SG | Nouilles complètes | g | 353 | 11.8 | 67.6 | 2.2 | SEC | — | 5 |
| `nouilles_riz` | Nouilles de riz | g | 365 | 7.4 | 80.5 | 1 | SEC | — | 14 |
| `oeuf_entier` | Œuf entier | g | 140 | 12.8 | 0.1 | 9.8 | — | — | 21 |
| `oignon` | Oignon | g | 39 | 1.1 | 6.2 | 0.6 | — | — | 30 |
| `olives` | Olives | g | 182 | 1.4 | 0.3 | 18 | — | ≤ 40 | 10 |
| `pain_complet` ⛔SG | Pain complet | g | 234 | 8.7 | 41.2 | 1.7 | — | — | 8 |
| `pain_pita_complet` ⛔SG | Pain pita complet | g | 249 | 7.5 | 48.8 | 1.5 | — | — | 3 |
| `pain_sans_gluten` | Pain sans gluten | g | 249 | 4.6 | 37.1 | 6.6 | — | — | 1 |
| `parmesan` | Parmesan | g | 411 | 31.1 | 1.1 | 31 | — | ≤ 40 | 9 |
| `patate_douce` | Patate douce | g | 81 | 1.6 | 17.1 | 0.1 | cru | — | 21 |
| `pates_completes` ⛔SG | Pâtes complètes | g | 353 | 11.8 | 67.6 | 2.2 | SEC | — | 18 |
| `pates_semoule` ⛔SG | Pâtes (semoule) | g | 364 | 12 | 72.7 | 1.6 | SEC | — | 9 |
| `pesto` | Pesto | g | 370 | 3.9 | 6.6 | 35.4 | — | ≤ 30 | 6 |
| `petits_pois` | Petits pois | g | 92 | 4.9 | 13.7 | 0.8 | — | — | 11 |
| `pois_casses` | Pois cassés | g | 347 | 23.8 | 47.5 | 1.2 | SEC | — | 2 |
| `pois_chiches` | Pois chiches | g | 350 | 20.5 | 47.5 | 6 | SEC | — | 17 |
| `pois_chiches_conserve` | Pois chiches (conserve, égouttés) | g | 122 | 6.7 | 15 | 2.7 | — | — | 0 |
| `poivron` | Poivron | g | 23 | 0.8 | 3.5 | 0.3 | — | — | 30 |
| `polenta` | Polenta | g | 350 | 7.9 | 74 | 1.8 | SEC | — | 19 |
| `pomme_de_terre` | Pomme de terre | g | 80 | 2 | 16.2 | 0.1 | cru | — | 18 |
| `poulet_filet` | Filet de poulet | g | 110 | 23.4 | 0 | 1.5 | cru | — | 36 |
| `proteine_vegetale` | Protéine végétale (pois/soja) | g | 383 | 73 | 10 | 7 | — | — | 2 |
| `quinoa` | Quinoa | g | 358 | 13.2 | 58.1 | 6.1 | SEC | — | 24 |
| `ratatouille` | Ratatouille de légumes | g | 35 | 1.2 | 5 | 1 | — | — | 13 |
| `riz_basmati` | Riz basmati | g | 351 | 7.1 | 78.4 | 0.6 | SEC | — | 31 |
| `riz_complet` | Riz complet | g | 350 | 7 | 71.4 | 2.8 | SEC | — | 22 |
| `roquette` | Roquette | g | 28 | 2.6 | 2.1 | 0.7 | — | — | 21 |
| `salade_verte` | Salade verte | g | 14 | 1 | 1.5 | 0.1 | — | — | 14 |
| `sardines` | Sardines (conserve égouttées) | g | 217 | 23.3 | 0.3 | 13.7 | — | — | 6 |
| `sarrasin` | Sarrasin | g | 362 | 13.3 | 67.5 | 3.4 | SEC | — | 17 |
| `sauce_soja` ⛔SG | Sauce soja | ml | 40 | 7.2 | 1.7 | 0.5 | — | — | 13 |
| `saumon` | Pavé de saumon | g | 193 | 20.5 | 0 | 12.4 | cru | — | 14 |
| `saumon_fume` | Saumon fumé | g | 184 | 22.2 | 0.1 | 10.5 | — | — | 3 |
| `seitan` ⛔SG | Seitan | g | 134 | 20.6 | 6.7 | 2.5 | — | — | 12 |
| `semoule_couscous` ⛔SG | Semoule de couscous | g | 350 | 11.8 | 69.8 | 1.3 | SEC | — | 13 |
| `soja_texture` | Protéine de soja texturée (PST) | g | 345 | 52 | 30 | 1 | SEC | ≤ 70 | 37 |
| `tahini` | Purée de sésame (tahini) | g | 631 | 17.7 | 13.8 | 53.4 | — | ≤ 40 | 10 |
| `tempeh` | Tempeh | g | 157 | 16.1 | 7.9 | 4.7 | — | — | 7 |
| `thon_frais` | Thon frais | g | 155 | 24 | 2.7 | 5.4 | cru | — | 6 |
| `thon_naturel` | Thon au naturel (conserve) | g | 143 | 26.8 | 0 | 3.9 | — | — | 14 |
| `tofu_ferme` | Tofu ferme | g | 147 | 13.4 | 2.9 | 8.5 | — | — | 17 |
| `tofu_fume` | Tofu fumé | g | 164 | 14.9 | 2.9 | 9.5 | — | — | 1 |
| `tofu_soyeux` | Tofu soyeux | g | 54 | 4.6 | 1.5 | 2.9 | — | — | 2 |
| `tomate` | Tomate | g | 18 | 0.5 | 3.4 | 0.5 | — | — | 31 |
| `tomate_concassee` | Tomate concassée | g | 23 | 1.2 | 3.6 | 0.5 | — | — | 39 |
| `tortilla_complete` ⛔SG | Tortilla blé complet | g | 320 | 8 | 53 | 7.5 | — | — | 7 |
| `wrap_sans_gluten` | Wrap / tortilla sans gluten | g | 316 | 6.1 | 58 | 5.6 | — | — | 2 |
| `yaourt_grec` | Yaourt grec égoutté (type Fage) | g | 115 | 9 | 4 | 7 | — | — | 4 |
| `yaourt_soja_proteine` | Yaourt de soja protéiné | g | 65 | 9 | 4 | 1.5 | — | — | 1 |

**84 de ces 97 refs sont compatibles sans gluten** (ceux sans ⛔SG).

---

## 5. Format de sortie exact

Un seul objet JSON, une seule clé `recipes`, 10 objets. Pas de `_meta`, pas de
`config`, pas de commentaire dans le JSON.

```json
{ "recipes": [ /* les 10 recettes */ ] }
```

Voici une recette **réelle** du catalogue, dans la bonne catégorie. C'est le gabarit exact à
imiter — structure, nommage, niveau de détail :

```json
{
  "id": "rep37",
  "name": "Tajine de poulet – olives – semoule",
  "category": "repas_complet",
  "tags": {
    "objectif": [
      "maintien",
      "prise_de_masse"
    ],
    "recup_jour_repos": false,
    "sport": [
      "endurance",
      "muscu"
    ],
    "temps_min": 30
  },
  "base_servings": 1,
  "ingredients": [
    {
      "ref": "poulet_filet",
      "qty": 170,
      "macro_role": "protein",
      "scalable": true
    },
    {
      "ref": "semoule_couscous",
      "qty": 80,
      "macro_role": "carb",
      "scalable": true
    },
    {
      "ref": "courgette",
      "qty": 110,
      "macro_role": "vegetable",
      "scalable": false
    },
    {
      "ref": "tomate_concassee",
      "qty": 90,
      "macro_role": "vegetable",
      "scalable": false
    },
    {
      "ref": "olives",
      "qty": 25,
      "macro_role": "flavor",
      "scalable": false
    },
    {
      "ref": "huile_olive",
      "qty": 8,
      "macro_role": "fat",
      "scalable": true
    }
  ],
  "instructions": [
    "Coupe le blanc de poulet en gros cubes de 3 cm, sale et poivre.",
    "Fais chauffer l'huile dans une cocotte à feu moyen-vif, puis saisis les cubes 4 minutes en les retournant : ils doivent être colorés sur toutes les faces.",
    "Ajoute la courgette en demi-rondelles épaisses et laisse-la revenir 3 minutes.",
    "Verse la tomate concassée, ajoute tes épices (cumin, coriandre, gingembre, une pincée de cannelle), couvre et laisse mijoter 15 minutes à feu doux : la sauce doit épaissir et napper le poulet.",
    "Pendant ce temps, verse la semoule dans un saladier, couvre-la d'un volume égal d'eau bouillante salée, filme et laisse gonfler 5 minutes, puis égraine à la fourchette.",
    "Ajoute les olives au tajine sur les 2 dernières minutes pour qu'elles ne rendent pas leur amertume.",
    "Dresse la semoule en dôme et verse le tajine dessus avec sa sauce."
  ],
  "why": "Muscu/endurance maintien : mijoté parfumé, protéines maigres et glucides lents.",
  "macros_per_serving": {
    "kcal": 623.8,
    "protein": 52,
    "carbs": 61.1,
    "fat": 16.9
  },
  "wave": "2026-08-02-b7-repas-vegan"
}
```

### Champ par champ

| Champ | Règle |
|---|---|
| `id` | exactement ceux listés au §1, dans l'ordre |
| `name` | français, descriptif, sans marqueur de régime (« vegan », « healthy », « fit ») et sans superlatif. Deux recettes ne peuvent pas partager leurs 3 premiers mots significatifs. |
| `category` | `"repas_complet"` pour les 10 |
| `base_servings` | `1`, sans exception |
| `tags.objectif` | mécanique, depuis les kcal de base — voir §6 |
| `tags.recup_jour_repos` | `true` si les glucides font moins de 45 % des calories, sinon `false`. Rien d'éditorial. |
| `tags.sport` | `["muscu"]` par défaut ; ajoute `"endurance"` si les glucides dépassent 55 % des calories. **`"combats"` est interdit.** |
| `tags.temps_min` | temps TOTAL de cuisine, cuisson comprise. Aucune durée des `instructions` ne peut le dépasser. |
| `ingredients` | **4 à 6 entrées.** Chacune : `ref` (§4), `qty` entier, `macro_role`, `scalable`. |
| `instructions` | **4 à 7 étapes** — voir §6 |
| `why` | une phrase sobre sur l'intérêt nutritionnel. Aucune promesse de santé, aucune revendication de régime. |
| `macros_per_serving` | **calculé**, pas estimé : pour chaque ingrédient `per_100 × qty / 100`, puis somme. Tolérance ±10 %. |
| `wave` | `"2026-08-02-b7-repas-vegan"` pour les 10 — c'est le nom du dossier de drop qui portera cette livraison, la convention du catalogue (`_meta.waves`). Recopie-le tel quel. |

---

## 6. Règles dures

### 6.1 Ancres — la règle la plus importante

- **Ancre protéine obligatoire** : au moins un ingrédient en `"macro_role": "protein"` **et**
  `"scalable": true`. **Jamais `"dairy"` pour porter la protéine** — le rôle `dairy` descend à
  0,6× et fait perdre le plancher protéique. Un skyr ou un fromage blanc qui porte la protéine du
  plat se déclare `"protein"`, pas `"dairy"`.
- **Ancre grasse obligatoire** : au moins un ingrédient en `"macro_role": "fat"` **et**
  `"scalable": true`, dans la fourchette de lipides du §3.
- `vegetable` et `flavor` ⇒ **toujours** `"scalable": false`.
- **Le plafond calorique vient des glucides, jamais du gras** : les matières grasses sont bloquées
  bas par leur « Max abs. », aucun féculent n'a de plafond.

### 6.2 Instructions — 4 à 7 étapes

Le catalogue actuel est trop laconique : médiane de 2 étapes, et une recette dit littéralement
« Mixe tout. » pour cinq ingrédients. Quelqu'un qui ne cuisine pas ne sait pas quoi faire avec ça.
Ici il y a de la cuisson, donc il y a matière à se planter : chaque étape porte une action complète
avec **sa durée, son feu et son indice de réussite visuel**.

> ✅ « Chauffe 1 cuillère d'huile à feu moyen-vif. Saisis le filet 3 à 4 min sans y toucher : il
>    doit se décoller seul et la face dorée être franchement colorée. Retourne, baisse à moyen,
>    3 min de plus. »
> ❌ « Cuis le poulet. »

Dans tous les cas : **impératif, tutoiement, jamais d'infinitif.**

### 6.3 Une instruction n'introduit jamais un ingrédient absent de `ingredients`

Interdits tant qu'ils n'ont pas de `ref` dans la table du §4 : bouillon, vin, crème, beurre, miso,
sirop, vinaigre, yaourt, fromage, épices composées, sauces préparées. Les régimes et la liste de
courses sont déduits des seuls `ref` : un ingrédient cité hors liste fait mentir la recette. Huit
recettes du catalogue citent un « bouillon » inexistant, dont trois se revendiquent vegan.

Le sel, le poivre et les herbes non listés sont tolérés dans les instructions.

### 6.4 Poids et cohérence physique

Respecte la colonne « Pesée » du §4. On n'écrit jamais « égoutté », « cuit » ou « cuisiné » dans le
`name` d'une recette dont un ingrédient est pesé SEC, et les instructions doivent être cohérentes
avec cette pesée.

### 6.5 `tags.objectif` — mécanique, depuis les kcal de base

| Catégorie | `["perte_de_gras"]` | `["perte_de_gras","maintien"]` | `["maintien","prise_de_masse"]` |
|---|---|---|---|
| repas_complet | < 560 kcal | 560 – 660 | > 660 |
| petit_dej | < 450 kcal | 450 – 540 | > 540 |
| collation | < 220 kcal | 220 – 280 | > 280 |

Interdits : `["perte_de_gras","prise_de_masse"]` et les trois ensemble. **Aux enveloppes basses de
cette vague, la majorité tombera sur `perte_de_gras` — c'est normal**, le tag lit la base écrite,
pas la portion servie. N'ajuste pas les calories pour « équilibrer » la répartition des tags.

### 6.6 Aucun repos long

Pas de marinade, de réfrigération ou de repos de plus de 10 minutes : le schéma n'a aucun champ
pour le porter, et un plan affiché le matin doit être cuisinable le jour même.

---

## 7. Anti-doublons — ce qui est DÉJÀ pris

Le catalogue contient 8 groupes de quasi-doublons, produits par des vagues successives qui ne se
voyaient pas. Ton lot sera passé au crible par un script avant intégration : ce qui est refusé est
**réécrit, pas retouché** — une correction locale déplace le clone au lieu de le supprimer.

Les trois règles qui refusent une recette :

1. **Similarité de composition** : rejet si une recette existante de même catégorie partage
   ≥ 60 % de son ensemble de `ref` (indice de Jaccard).
2. **Refs communs** : au plus **3** `ref` en commun avec toute recette existante de même
   catégorie. Les recettes font 4 à 6 refs, donc 4 en commun = quasi-clone.
3. **Triplet structurel** : au plus **2** recettes par couple (ensemble des protéines × ensemble
   des féculents).

Ces contrôles s'appliquent aussi **entre les 10 recettes de ce lot**.

### Couples protéine × féculent déjà saturés en `repas_complet` — INTERDITS

Ces 36 couples portent déjà 2 recettes ou plus. Le seuil est atteint : n'en produis aucune de plus.

| Protéines × féculents | Déjà | Recettes |
|---|---|---|
| poulet_filet × riz_basmati | 5 | rep01, rep21, rep27, rep39, rep83 |
| poulet_filet × patate_douce | 3 | rep07, rep95, rep146 |
| tempeh × riz_complet | 3 | rep25, rep80, rep150 |
| boeuf_bavette × nouilles_riz | 3 | rep71, rep130, rep164 |
| tofu_ferme × quinoa | 2 | rep05, rep148 |
| boeuf_bavette × pomme_de_terre | 2 | rep11, rep53 |
| poulet_filet × tortilla_complete | 2 | rep13, rep113 |
| cabillaud × pomme_de_terre | 2 | rep16, rep98 |
| thon_naturel × pates_completes | 2 | rep19, rep63 |
| edamame+saumon × riz_basmati | 2 | rep20, rep74 |
| crevettes × nouilles_riz | 2 | rep24, rep132 |
| poulet_filet × semoule_couscous | 2 | rep37, rep232 |
| poulet_filet × quinoa | 2 | rep40, rep87 |
| seitan × patate_douce | 2 | rep41, rep209 |
| cabillaud × quinoa | 2 | rep43, rep92 |
| poulet_filet × polenta | 2 | rep48, rep127 |
| thon_naturel × tortilla_complete | 2 | rep52, rep115 |
| poulet_filet × pates_completes | 2 | rep56, rep61 |
| poulet_filet × nouilles_riz | 2 | rep67, rep165 |
| tofu_ferme × nouilles_riz | 2 | rep68, rep129 |
| seitan × pates_semoule | 2 | rep70, rep250 |
| thon_naturel × riz_complet | 2 | rep79, rep199 |
| haricots_noirs+soja_texture × riz_complet | 2 | rep82, rep106 |
| crevettes × riz_basmati | 2 | rep86, rep154 |
| dinde_escalope × millet | 2 | rep93, rep251 |
| poulet_filet × pain_pita_complet | 2 | rep117, rep231 |
| pois_chiches+soja_texture × semoule_couscous | 2 | rep121, rep126 |
| oeuf_entier × patate_douce | 2 | rep136, rep138 |
| cabillaud × polenta | 2 | rep163, rep215 |
| seitan × semoule_couscous | 2 | rep188, rep247 |

_(+ 6 autres couples à 2 occurrences ; la règle générale « au plus 2 » suffit à les couvrir.)_

### Plafond par ancre sur ce lot

Aucun `ref` protéique ne peut porter plus de **25 % des 10 recettes**, soit
**2 au maximum**. Il te faut au moins
**5 ancres protéiques distinctes** et
**3 ancres grasses distinctes**.

Refs les plus employés dans cette catégorie — à ne PAS renforcer :

- `huile_olive` (fat) — déjà dans 136 recettes
- `soja_texture` (protein) — déjà dans 37 recettes
- `poulet_filet` (protein) — déjà dans 36 recettes
- `riz_basmati` (carb) — déjà dans 31 recettes
- `lait_coco` (fat) — déjà dans 27 recettes
- `avocat` (fat) — déjà dans 24 recettes
- `quinoa` (carb) — déjà dans 24 recettes
- `riz_complet` (carb) — déjà dans 22 recettes
- `oeuf_entier` (protein) — déjà dans 21 recettes
- `patate_douce` (carb) — déjà dans 21 recettes
- `graines_courge` (fat) — déjà dans 20 recettes
- `boulgour` (carb) — déjà dans 19 recettes
- `polenta` (carb) — déjà dans 19 recettes
- `pates_completes` (carb) — déjà dans 18 recettes
- `pomme_de_terre` (carb) — déjà dans 18 recettes

### Ancres encore OUVERTES — c'est là qu'il faut aller

Dire ce qui est interdit sans dire ce qui reste libre envoie dans un mur. Voici les ancres
protéiques par ordre de **disponibilité** — **toutes prises dans les 97 refs du §4**,
donc toutes réellement employables. « Couples saturés » = combinaisons déjà fermées pour cette
ancre, « places libres » = combinaisons (ancre × féculent autorisé) encore utilisables.

| Ancre protéine | Déjà employée ici | Couples saturés | Places libres |
|---|---|---|---|
| `haricots_rouges_conserve` | — | — | 20 |
| `feves` | 1 | — | 20 |
| `lentilles_cuites` | 1 | — | 20 |
| `tofu_fume` | 1 | — | 20 |
| `yaourt_soja_proteine` | 1 | — | 20 |
| `pois_casses` | 2 | — | 20 |
| `proteine_vegetale` | 2 | — | 20 |
| `lentilles_vertes` | 4 | — | 20 |
| `edamame` | 5 | — | 20 |
| `haricots_blancs` | 5 | — | 20 |
| `lentilles_corail` | 5 | — | 20 |
| `haricots_rouges` | 9 | — | 20 |
| `soja_texture` | 37 | — | 20 |
| `tempeh` | 7 | 1 | 19 |
| `tofu_ferme` | 17 | 2 | 18 |
| `seitan` | 12 | 4 | 17 |

**Refs du §4 JAMAIS employés en `repas_complet`** — terrain entièrement vierge, aucun risque de
doublon :

`boisson_soja` · `falafel` · `haricots_rouges_conserve` · `pois_chiches_conserve`

### Diversité de format

Au plus **3 recettes** de ce lot peuvent partager le même format de service : wrap/pita/tartine,
bowl, poêlée, salade, porridge/pudding, galette/pancake, soupe.

---

## 8. Annexe — les 270 recettes `repas_complet` déjà au catalogue

**Tu as besoin de cette table pour respecter R1 et R2**, qui portent sur l'ensemble ENTIER des refs
et pas seulement sur le couple protéine × féculent. Vérifie chacune de tes recettes contre elle.

Refs les plus fréquents sur ce créneau (à éviter de renforcer) : `huile_olive` 136 · `tomate_concassee` 39 · `soja_texture` 37 · `poulet_filet` 36 · `epinards` 34 · `riz_basmati` 31 · `tomate` 31 · `oignon` 30 · `poivron` 30 · `courgette` 29 · `lait_coco` 27 · `quinoa` 24 · `avocat` 24 · `brocoli` 22 · `riz_complet` 22 · `patate_douce` 21 · `roquette` 21 · `oeuf_entier` 21 · `champignons` 20 · `graines_courge` 20 · `boulgour` 19 · `carotte` 19 · `polenta` 19 · `pates_completes` 18 · `pomme_de_terre` 18 · `tofu_ferme` 17 · `cabillaud` 17 · `pois_chiches` 17 · `sarrasin` 17 · `legumes_wok` 16 · `boeuf_5` 15 · `saumon` 14 · `salade_verte` 14 · `nouilles_riz` 14 · `thon_naturel` 14 · `millet` 14 · `sauce_soja` 13 · `ratatouille` 13 · `concombre` 13 · `semoule_couscous` 13 · `creme_soja` 13 · `haricots_verts` 12 · `mais` 12 · `dinde_escalope` 12 · `crevettes` 12 · `amandes` 12 · `feta` 12 · `seitan` 12 · `blanc_oeuf` 12 · `asperges` 11 · `petits_pois` 11 · `olives` 10 · `chou_fleur` 10 · `tahini` 10 · `boeuf_bavette` 9 · `haricots_rouges` 9 · `beurre_cacahuete` 9 · `parmesan` 9 · `pates_semoule` 9 · `jambon_blanc` 9 · `cottage_cheese` 8 · `pain_complet` 8 · `tortilla_complete` 7 · `tempeh` 7 · `betterave` 6 · `pesto` 6 · `thon_frais` 6 · `sardines` 6 · `fromage_blanc_0` 6 · `lentilles_corail` 5 · `nouilles_completes` 5 · `edamame` 5 · `haricots_noirs` 5 · `haricots_blancs` 5

| id | ensemble de refs |
|---|---|
| rep01 | `poulet_filet` · `riz_basmati` · `brocoli` · `huile_olive` |
| rep02 | `saumon` · `patate_douce` · `epinards` · `huile_olive` |
| rep03 | `lentilles_corail` · `lait_coco` · `riz_basmati` · `tomate_concassee` · `oignon` · `huile_olive` |
| rep04 | `boeuf_5` · `nouilles_completes` · `legumes_wok` · `huile_olive` · `sauce_soja` |
| rep05 | `tofu_ferme` · `quinoa` · `courgette` · `poivron` · `huile_olive` · `sauce_soja` |
| rep06 | `cabillaud` · `boulgour` · `pois_chiches` · `courgette` · `huile_olive` |
| rep07 | `poulet_filet` · `patate_douce` · `haricots_verts` · `huile_olive` |
| rep08 | `pates_completes` · `boeuf_5` · `tomate_concassee` · `oignon` · `huile_olive` |
| rep09 | `poulet_filet` · `riz_complet` · `avocat` · `mais` · `poivron` |
| rep10 | `pois_chiches` · `epinards` · `tomate_concassee` · `lait_coco` · `riz_basmati` |
| rep11 | `boeuf_bavette` · `pomme_de_terre` · `salade_verte` · `huile_olive` |
| rep12 | `saumon` · `quinoa` · `asperges` · `huile_olive` |
| rep13 | `tortilla_complete` · `poulet_filet` · `salade_verte` · `tomate` · `cottage_cheese` |
| rep14 | `haricots_rouges` · `mais` · `tomate_concassee` · `poivron` · `riz_basmati` · `huile_olive` |
| rep15 | `dinde_escalope` · `nouilles_riz` · `legumes_wok` · `sauce_soja` · `huile_olive` |
| rep16 | `cabillaud` · `pomme_de_terre` · `ratatouille` · `huile_olive` |
| rep17 | `tofu_ferme` · `quinoa` · `betterave` · `pois_chiches` · `huile_olive` · `roquette` |
| rep18 | `oeuf_entier` · `poulet_filet` · `epinards` · `mozzarella` · `huile_olive` |
| rep19 | `pates_completes` · `thon_naturel` · `tomate_concassee` · `olives` · `huile_olive` |
| rep20 | `saumon` · `riz_basmati` · `edamame` · `concombre` · `sauce_soja` · `avocat` |
| rep21 | `poulet_filet` · `riz_basmati` · `yaourt_grec` · `tomate_concassee` · `huile_olive` |
| rep22 | `lentilles_corail` · `carotte` · `oignon` · `tomate_concassee` · `pain_complet` · `huile_olive` |
| rep23 | `boeuf_5` · `patate_douce` · `brocoli` · `huile_olive` |
| rep24 | `crevettes` · `nouilles_riz` · `legumes_wok` · `beurre_cacahuete` · `sauce_soja` |
| rep25 | `tempeh` · `riz_complet` · `chou_fleur` · `huile_olive` |
| rep26 | `maquereau` · `pomme_de_terre` · `salade_verte` · `huile_olive` |
| rep27 | `poulet_filet` · `riz_basmati` · `legumes_wok` · `amandes` · `sauce_soja` |
| rep28 | `polenta` · `ratatouille` · `oeuf_entier` · `parmesan` · `huile_olive` |
| rep29 | `pois_chiches` · `boulgour` · `courgette` · `tomate` · `feta` · `huile_olive` |
| rep30 | `dinde_escalope` · `patate_douce` · `epinards` · `huile_olive` |
| rep31 | `pates_semoule` · `poulet_filet` · `pesto` · `tomate` |
| rep32 | `cabillaud` · `pomme_de_terre` · `petits_pois` · `oeuf_entier` · `huile_olive` · `chapelure` |
| rep33 | `boeuf_5` · `haricots_rouges` · `riz_basmati` · `poivron` · `huile_olive` |
| rep34 | `saumon` · `lentilles_vertes` · `epinards` · `huile_olive` |
| rep35 | `tofu_ferme` · `nouilles_completes` · `brocoli` · `sauce_soja` · `huile_olive` |
| rep36 | `oeuf_entier` · `pomme_de_terre` · `jambon_blanc` · `oignon` · `huile_olive` |
| rep37 | `poulet_filet` · `semoule_couscous` · `courgette` · `tomate_concassee` · `olives` · `huile_olive` |
| rep38 | `thon_frais` · `riz_basmati` · `haricots_verts` · `huile_olive` |
| rep39 | `poulet_filet` · `lait_coco` · `riz_basmati` · `poivron` · `oignon` |
| rep40 | `poulet_filet` · `quinoa` · `avocat` · `feta` · `salade_verte` · `tomate` |
| rep41 | `seitan` · `patate_douce` · `brocoli` · `huile_olive` |
| rep42 | `boeuf_5` · `haricots_rouges` · `mais` · `riz_basmati` · `tomate` · `avocat` |
| rep43 | `cabillaud` · `quinoa` · `courgette` · `huile_olive` |
| rep44 | `pates_completes` · `saumon` · `epinards` · `creme_soja` |
| rep45 | `dinde_escalope` · `courgette` · `feta` · `boulgour` · `huile_olive` |
| rep46 | `riz_basmati` · `oeuf_entier` · `petits_pois` · `jambon_blanc` · `huile_olive` · `sauce_soja` |
| rep47 | `tofu_soyeux` · `nouilles_riz` · `edamame` · `legumes_wok` · `sauce_soja` |
| rep48 | `poulet_filet` · `polenta` · `champignons` · `parmesan` · `huile_olive` |
| rep49 | `sardines` · `pain_complet` · `tomate` · `salade_verte` · `huile_olive` |
| rep50 | `tempeh` · `riz_basmati` · `brocoli` · `sauce_soja` · `huile_olive` |
| rep51 | `cabillaud` · `lentilles_vertes` · `tomate_concassee` · `huile_olive` |
| rep52 | `tortilla_complete` · `thon_naturel` · `salade_verte` · `tomate` · `cottage_cheese` |
| rep53 | `boeuf_bavette` · `pomme_de_terre` · `carotte` · `champignons` · `huile_olive` |
| rep54 | `patate_douce` · `pois_chiches` · `oeuf_entier` · `epinards` · `huile_olive` |
| rep55 | `saumon` · `riz_complet` · `brocoli` · `huile_olive` · `graines_courge` |
| rep56 | `poulet_filet` · `pates_completes` · `courgette` · `parmesan` · `huile_olive` |
| rep57 | `dinde_escalope` · `haricots_rouges` · `riz_basmati` · `tomate_concassee` · `poivron` · `huile_olive` |
| rep58 | `tofu_ferme` · `riz_basmati` · `haricots_verts` · `sauce_soja` · `miel` · `huile_olive` |
| rep59 | `cabillaud` · `patate_douce` · `asperges` · `huile_olive` |
| rep60 | `boeuf_5` · `riz_basmati` · `avocat` · `oeuf_entier` · `haricots_rouges` · `huile_olive` |
| rep61 | `pates_completes` · `poulet_filet` · `pesto` · `roquette` |
| rep62 | `pates_semoule` · `boeuf_5` · `tomate_concassee` · `oignon` · `huile_olive` |
| rep63 | `pates_completes` · `thon_naturel` · `tomate` · `huile_olive` |
| rep64 | `boulgour` · `thon_naturel` · `tomate_concassee` · `roquette` · `huile_olive` |
| rep65 | `pates_completes` · `tofu_ferme` · `lait_coco` · `poivron` · `levure_maltee` |
| rep66 | `pates_completes` · `lentilles_corail` · `soja_texture` · `tomate_concassee` · `oignon` · `huile_olive` |
| rep67 | `nouilles_riz` · `poulet_filet` · `legumes_wok` · `huile_olive` |
| rep68 | `nouilles_riz` · `tofu_ferme` · `brocoli` · `lait_coco` |
| rep69 | `pates_completes` · `crevettes` · `courgette` · `huile_olive` |
| rep70 | `pates_semoule` · `seitan` · `tomate_concassee` · `olives` · `oignon` |
| rep71 | `nouilles_riz` · `boeuf_bavette` · `poivron` · `lait_coco` |
| rep72 | `pates_completes` · `tofu_soyeux` · `tofu_ferme` · `epinards` · `huile_olive` |
| rep73 | `riz_complet` · `poulet_filet` · `brocoli` · `huile_olive` |
| rep74 | `riz_basmati` · `saumon` · `avocat` · `edamame` · `concombre` |
| rep75 | `riz_basmati` · `cabillaud` · `haricots_verts` · `huile_olive` |
| rep76 | `riz_complet` · `tofu_ferme` · `haricots_rouges` · `tomate_concassee` · `lait_coco` |
| rep77 | `riz_complet` · `soja_texture` · `tomate_concassee` · `mais` · `huile_olive` |
| rep78 | `riz_basmati` · `dinde_escalope` · `petits_pois` · `lait_coco` |
| rep79 | `riz_complet` · `thon_naturel` · `poivron` · `tomate_concassee` · `huile_olive` |
| rep80 | `riz_complet` · `tempeh` · `chou_fleur` · `huile_olive` · `sauce_soja` |
| rep81 | `riz_basmati` · `oeuf_entier` · `legumes_wok` · `huile_olive` |
| rep82 | `riz_complet` · `haricots_noirs` · `soja_texture` · `mais` · `avocat` |
| rep83 | `riz_basmati` · `poulet_filet` · `ananas` · `poivron` · `huile_olive` |
| rep84 | `riz_complet` · `sardines` · `tomate` · `oignon` · `huile_olive` |
| rep85 | `riz_basmati` · `pois_chiches` · `feta` · `concombre` · `huile_olive` |
| rep86 | `riz_basmati` · `crevettes` · `legumes_wok` · `lait_coco` |
| rep87 | `quinoa` · `poulet_filet` · `courgette` · `pesto` |
| rep88 | `quinoa` · `pois_chiches` · `soja_texture` · `avocat` · `betterave` · `roquette` |
| rep89 | `sarrasin` · `tempeh` · `champignons` · `huile_olive` |
| rep90 | `sarrasin` · `saumon` · `asperges` · `huile_olive` |
| rep91 | `millet` · `pois_chiches` · `soja_texture` · `epinards` · `lait_coco` |
| rep92 | `quinoa` · `cabillaud` · `ratatouille` · `huile_olive` |
| rep93 | `millet` · `dinde_escalope` · `petits_pois` · `carotte` · `huile_olive` |
| rep94 | `quinoa` · `haricots_blancs` · `soja_texture` · `tomate_concassee` · `huile_olive` |
| rep95 | `patate_douce` · `poulet_filet` · `brocoli` · `huile_olive` |
| rep96 | `pomme_de_terre` · `boeuf_5` · `haricots_verts` · `huile_olive` |
| rep97 | `patate_douce` · `tofu_ferme` · `epinards` · `lait_coco` |
| rep98 | `pomme_de_terre` · `cabillaud` · `haricots_verts` · `huile_olive` |
| rep99 | `patate_douce` · `soja_texture` · `haricots_rouges` · `tomate_concassee` · `mais` · `huile_olive` |
| rep100 | `pomme_de_terre` · `saumon` · `asperges` · `huile_olive` · `yaourt_grec` |
| rep101 | `lentilles_corail` · `soja_texture` · `riz_basmati` · `epinards` · `lait_coco` · `oignon` |
| rep102 | `lentilles_corail` · `soja_texture` · `riz_complet` · `tomate_concassee` · `lait_coco` |
| rep103 | `haricots_rouges` · `soja_texture` · `riz_complet` · `tomate_concassee` · `mais` · `huile_olive` |
| rep104 | `pois_chiches` · `soja_texture` · `patate_douce` · `tomate_concassee` · `lait_coco` |
| rep105 | `haricots_blancs` · `soja_texture` · `carotte` · `tomate_concassee` · `huile_olive` · `pain_complet` |
| rep106 | `haricots_noirs` · `soja_texture` · `riz_complet` · `oignon` · `huile_olive` |
| rep107 | `pois_casses` · `soja_texture` · `boulgour` · `carotte` · `roquette` · `huile_olive` |
| rep108 | `feves` · `soja_texture` · `riz_basmati` · `tomate_concassee` · `lait_coco` |
| rep109 | `lentilles_vertes` · `feta` · `tomate` · `concombre` · `huile_olive` |
| rep110 | `riz_complet` · `poulet_filet` · `haricots_rouges` · `tomate_concassee` · `huile_olive` |
| rep111 | `pois_chiches` · `boulgour` · `soja_texture` · `poivron` · `huile_olive` |
| rep112 | `pois_casses` · `carotte` · `oignon` · `huile_olive` · `pain_complet` · `graines_courge` |
| rep113 | `tortilla_complete` · `poulet_filet` · `avocat` · `salade_verte` · `tomate` |
| rep114 | `tortilla_complete` · `soja_texture` · `haricots_noirs` · `mais` · `avocat` |
| rep115 | `tortilla_complete` · `thon_naturel` · `fromage_blanc_0` · `salade_verte` · `concombre` |
| rep116 | `sarrasin` · `oeuf_entier` · `champignons` · `huile_olive` |
| rep117 | `pain_pita_complet` · `poulet_filet` · `yaourt_grec` · `concombre` · `huile_olive` |
| rep118 | `tortilla_complete` · `pois_chiches` · `soja_texture` · `salade_verte` · `huile_olive` |
| rep119 | `tortilla_complete` · `cabillaud` · `chou_fleur` · `avocat` |
| rep120 | `pain_pita_complet` · `soja_texture` · `yaourt_soja_proteine` · `tomate` · `huile_olive` |
| rep121 | `semoule_couscous` · `pois_chiches` · `soja_texture` · `tomate` · `huile_olive` |
| rep122 | `semoule_couscous` · `poulet_filet` · `pois_chiches` · `carotte` · `courgette` · `huile_olive` |
| rep123 | `boulgour` · `boeuf_5` · `ratatouille` · `huile_olive` · `yaourt_grec` |
| rep124 | `semoule_couscous` · `tofu_ferme` · `soja_texture` · `ratatouille` · `huile_olive` |
| rep125 | `boulgour` · `saumon` · `courgette` · `huile_olive` |
| rep126 | `semoule_couscous` · `pois_chiches` · `soja_texture` · `carotte` · `courgette` · `huile_olive` |
| rep127 | `polenta` · `poulet_filet` · `champignons` · `huile_olive` |
| rep128 | `polenta` · `tofu_ferme` · `ratatouille` · `huile_olive` |
| rep129 | `nouilles_riz` · `tofu_ferme` · `legumes_wok` · `beurre_cacahuete` |
| rep130 | `nouilles_riz` · `boeuf_bavette` · `brocoli` · `huile_olive` |
| rep131 | `polenta` · `soja_texture` · `tomate_concassee` · `parmesan` · `huile_olive` |
| rep132 | `nouilles_riz` · `crevettes` · `legumes_wok` · `lait_coco` |
| rep133 | `oeuf_entier` · `pomme_de_terre` · `epinards` · `huile_olive` |
| rep134 | `oeuf_entier` · `pois_chiches` · `tomate_concassee` · `poivron` · `pain_complet` · `huile_olive` |
| rep135 | `oeuf_entier` · `feta` · `courgette` · `quinoa` · `huile_olive` |
| rep136 | `oeuf_entier` · `patate_douce` · `epinards` · `creme_soja` |
| rep137 | `blanc_oeuf` · `oeuf_entier` · `champignons` · `riz_basmati` · `huile_olive` |
| rep138 | `oeuf_entier` · `patate_douce` · `avocat` · `mais` |
| rep139 | `quinoa` · `poulet_filet` · `salade_verte` · `parmesan` · `huile_olive` |
| rep140 | `riz_basmati` · `thon_naturel` · `oeuf_entier` · `mais` · `huile_olive` |
| rep141 | `quinoa` · `tofu_ferme` · `edamame` · `avocat` · `roquette` |
| rep142 | `boulgour` · `pois_chiches` · `feta` · `concombre` · `huile_olive` |
| rep143 | `lentilles_vertes` · `saumon_fume` · `betterave` · `roquette` · `huile_olive` |
| rep144 | `haricots_blancs` · `thon_naturel` · `tomate` · `oignon` · `huile_olive` |
| rep145 | `quinoa` · `haricots_noirs` · `soja_texture` · `mais` · `avocat` |
| rep146 | `patate_douce` · `poulet_filet` · `epinards` · `graines_courge` · `huile_olive` |
| rep147 | `riz_complet` · `soja_texture` · `edamame` · `brocoli` · `huile_olive` |
| rep148 | `quinoa` · `tofu_ferme` · `epinards` · `beurre_cacahuete` |
| rep149 | `patate_douce` · `haricots_noirs` · `soja_texture` · `mais` · `avocat` |
| rep150 | `riz_complet` · `tempeh` · `legumes_wok` · `lait_coco` |
| rep151 | `polenta` · `haricots_blancs` · `soja_texture` · `tomate_concassee` · `huile_olive` |
| rep152 | `sarrasin` · `tofu_ferme` · `champignons` · `huile_olive` · `levure_maltee` |
| rep153 | `riz_basmati` · `poulet_filet` · `champignons` · `parmesan` · `huile_olive` |
| rep154 | `riz_basmati` · `crevettes` · `courgette` · `huile_olive` |
| rep155 | `riz_basmati` · `soja_texture` · `petits_pois` · `creme_soja` · `levure_maltee` |
| rep156 | `riz_basmati` · `poulet_filet` · `crevettes` · `poivron` · `petits_pois` · `huile_olive` |
| rep157 | `pomme_de_terre` · `jambon_blanc` · `mozzarella` · `creme_soja` |
| rep158 | `pomme_de_terre` · `saumon` · `fromage_blanc_0` · `huile_olive` · `roquette` |
| rep159 | `pomme_de_terre` · `pois_chiches` · `soja_texture` · `epinards` · `lait_coco` |
| rep160 | `pomme_de_terre` · `thon_naturel` · `haricots_verts` · `oeuf_entier` · `huile_olive` |
| rep161 | `polenta` · `boeuf_5` · `tomate_concassee` · `parmesan` · `huile_olive` |
| rep162 | `polenta` · `tempeh` · `ratatouille` · `huile_olive` |
| rep163 | `polenta` · `cabillaud` · `epinards` · `huile_olive` |
| rep164 | `nouilles_riz` · `boeuf_bavette` · `carotte` · `salade_verte` · `beurre_cacahuete` |
| rep165 | `poulet_filet` · `nouilles_riz` · `oignon` · `carotte` · `epinards` · `huile_olive` |
| rep166 | `nouilles_riz` · `tempeh` · `legumes_wok` · `lait_coco` |
| rep167 | `sarrasin` · `jambon_blanc` · `oeuf_entier` · `champignons` · `huile_olive` |
| rep168 | `millet` · `saumon` · `brocoli` · `huile_olive` |
| rep169 | `quinoa` · `dinde_escalope` · `patate_douce` · `epinards` · `amandes` |
| rep170 | `sarrasin` · `haricots_blancs` · `soja_texture` · `tomate_concassee` · `olives` |
| rep171 | `dinde_escalope` · `polenta` · `graines_courge` · `poivron` · `oignon` |
| rep172 | `thon_naturel` · `millet` · `creme_soja` · `epinards` |
| rep173 | `thon_frais` · `semoule_couscous` · `amandes` · `courgette` · `tomate` |
| rep174 | `thon_frais` · `pates_semoule` · `pesto` · `brocoli` |
| rep175 | `sardines` · `boulgour` · `tahini` · `chou_fleur` |
| rep176 | `sardines` · `patate_douce` · `graines_courge` · `roquette` |
| rep177 | `saumon_fume` · `sarrasin` · `creme_soja` · `asperges` |
| rep178 | `jambon_blanc` · `quinoa` · `olives` · `petits_pois` · `tomate` |
| rep179 | `jambon_blanc` · `pates_completes` · `creme_soja` · `champignons` |
| rep180 | `boeuf_bavette` · `riz_complet` · `avocat` · `poivron` |
| rep181 | `crevettes` · `millet` · `lait_coco` · `epinards` · `tomate` |
| rep182 | `cottage_cheese` · `sarrasin` · `amandes` · `courgette` |
| rep183 | `blanc_oeuf` · `patate_douce` · `tahini` · `haricots_verts` |
| rep184 | `cottage_cheese` · `polenta` · `huile_olive` · `tomate_concassee` · `roquette` |
| rep185 | `blanc_oeuf` · `boulgour` · `feta` · `poivron` |
| rep186 | `blanc_oeuf` · `mozzarella` · `wrap_sans_gluten` · `olives` · `ratatouille` |
| rep187 | `tofu_ferme` · `boulgour` · `graines_courge` · `epinards` |
| rep188 | `seitan` · `semoule_couscous` · `tahini` · `courgette` |
| rep189 | `soja_texture` · `pain_sans_gluten` · `huile_olive` · `carotte` · `oignon` |
| rep190 | `seitan` · `pomme_de_terre` · `huile_olive` · `poivron` · `tomate_concassee` |
| rep191 | `poulet_filet` · `pomme_de_terre` · `amandes` · `haricots_verts` · `oignon` |
| rep192 | `poulet_filet` · `millet` · `graines_courge` · `betterave` · `roquette` |
| rep193 | `boeuf_5` · `polenta` · `olives` · `tomate_concassee` · `courgette` |
| rep194 | `boeuf_5` · `semoule_couscous` · `huile_olive` · `carotte` · `petits_pois` |
| rep195 | `cabillaud` · `pates_completes` · `pesto` · `courgette` · `tomate` |
| rep196 | `cabillaud` · `millet` · `lait_coco` · `legumes_wok` |
| rep197 | `saumon` · `pates_semoule` · `huile_olive` · `asperges` · `tomate` |
| rep198 | `thon_naturel` · `sarrasin` · `tahini` · `concombre` · `salade_verte` |
| rep199 | `thon_naturel` · `riz_complet` · `avocat` · `poivron` · `roquette` |
| rep200 | `crevettes` · `boulgour` · `feta` · `courgette` |
| rep201 | `dinde_escalope` · `riz_complet` · `beurre_cacahuete` · `brocoli` · `sauce_soja` |
| rep202 | `fromage_blanc_0` · `boulgour` · `graines_courge` · `betterave` · `roquette` |
| rep203 | `fromage_blanc_0` · `sarrasin` · `huile_olive` · `champignons` · `oignon` |
| rep204 | `blanc_oeuf` · `semoule_couscous` · `feta` · `concombre` · `tomate` |
| rep205 | `cottage_cheese` · `pates_completes` · `amandes` · `courgette` · `epinards` |
| rep206 | `blanc_oeuf` · `polenta` · `huile_olive` · `poivron` · `tomate` |
| rep207 | `soja_texture` · `pomme_de_terre` · `huile_olive` · `ratatouille` · `oignon` |
| rep208 | `soja_texture` · `wrap_sans_gluten` · `avocat` · `poivron` · `salade_verte` |
| rep209 | `seitan` · `patate_douce` · `tahini` · `chou_fleur` · `roquette` |
| rep210 | `tofu_ferme` · `pain_complet` · `graines_courge` · `champignons` · `epinards` |
| rep211 | `poulet_filet` · `boulgour` · `pesto` · `ratatouille` · `oignon` |
| rep212 | `poulet_filet` · `sarrasin` · `creme_soja` · `asperges` · `champignons` |
| rep213 | `boeuf_5` · `riz_complet` · `tahini` · `haricots_verts` · `oignon` |
| rep214 | `boeuf_bavette` · `quinoa` · `huile_olive` · `poivron` · `roquette` |
| rep215 | `cabillaud` · `polenta` · `graines_courge` · `courgette` · `tomate` |
| rep216 | `cabillaud` · `boulgour` · `amandes` · `chou_fleur` · `carotte` |
| rep217 | `saumon` · `semoule_couscous` · `olives` · `courgette` · `concombre` |
| rep218 | `dinde_escalope` · `pates_completes` · `creme_soja` · `champignons` · `epinards` |
| rep219 | `jambon_blanc` · `millet` · `huile_olive` · `courgette` · `carotte` |
| rep220 | `thon_frais` · `pain_complet` · `avocat` · `concombre` · `salade_verte` |
| rep221 | `crevettes` · `nouilles_completes` · `beurre_cacahuete` · `brocoli` · `poivron` |
| rep222 | `cottage_cheese` · `millet` · `graines_courge` · `poivron` · `tomate` |
| rep223 | `fromage_blanc_0` · `quinoa` · `amandes` · `brocoli` · `roquette` |
| rep224 | `blanc_oeuf` · `pates_completes` · `feta` · `ratatouille` |
| rep225 | `blanc_oeuf` · `oeuf_entier` · `polenta` · `tomate_concassee` · `huile_olive` |
| rep226 | `soja_texture` · `patate_douce` · `beurre_cacahuete` · `brocoli` · `oignon` |
| rep227 | `seitan` · `boulgour` · `graines_courge` · `poivron` · `tomate` |
| rep228 | `seitan` · `millet` · `lait_coco` · `champignons` · `epinards` |
| rep229 | `soja_texture` · `pain_complet` · `tahini` · `epinards` · `oignon` |
| rep230 | `seitan` · `nouilles_completes` · `lait_coco` · `chou_fleur` |
| rep231 | `poulet_filet` · `pain_pita_complet` · `avocat` · `concombre` · `roquette` |
| rep232 | `poulet_filet` · `semoule_couscous` · `amandes` · `courgette` · `poivron` |
| rep233 | `boeuf_5` · `sarrasin` · `huile_olive` · `poivron` · `tomate_concassee` |
| rep234 | `boeuf_bavette` · `boulgour` · `olives` · `poivron` · `tomate_concassee` |
| rep235 | `cabillaud` · `sarrasin` · `creme_soja` · `asperges` · `tomate` |
| rep236 | `thon_frais` · `riz_complet` · `huile_olive` · `brocoli` · `carotte` |
| rep237 | `thon_naturel` · `quinoa` · `avocat` · `concombre` · `roquette` |
| rep238 | `dinde_escalope` · `quinoa` · `graines_courge` · `haricots_verts` · `carotte` |
| rep239 | `jambon_blanc` · `polenta` · `creme_soja` · `courgette` · `champignons` |
| rep240 | `crevettes` · `patate_douce` · `lait_coco` · `brocoli` · `poivron` |
| rep241 | `sardines` · `pates_completes` · `tahini` · `courgette` · `tomate` |
| rep242 | `cottage_cheese` · `millet` · `graines_courge` · `haricots_verts` · `roquette` |
| rep243 | `blanc_oeuf` · `pomme_de_terre` · `amandes` · `brocoli` · `tomate` |
| rep244 | `blanc_oeuf` · `quinoa` · `feta` · `epinards` · `tomate` |
| rep245 | `oeuf_entier` · `pates_semoule` · `parmesan` · `epinards` · `champignons` |
| rep246 | `seitan` · `sarrasin` · `tahini` · `chou_fleur` · `carotte` |
| rep247 | `seitan` · `semoule_couscous` · `huile_olive` · `ratatouille` · `oignon` |
| rep248 | `soja_texture` · `quinoa` · `lait_coco` · `legumes_wok` |
| rep249 | `soja_texture` · `pates_completes` · `graines_courge` · `epinards` · `tomate_concassee` |
| rep250 | `seitan` · `pates_semoule` · `beurre_cacahuete` · `brocoli` · `champignons` |
| rep251 | `dinde_escalope` · `millet` · `tahini` · `chou_fleur` · `carotte` |
| rep252 | `jambon_blanc` · `pates_semoule` · `creme_soja` · `parmesan` · `petits_pois` · `champignons` |
| rep253 | `thon_frais` · `polenta` · `avocat` · `asperges` · `tomate` |
| rep254 | `sardines` · `sarrasin` · `olives` · `courgette` · `oignon` |
| rep255 | `crevettes` · `pates_semoule` · `huile_olive` · `tomate` · `roquette` |
| rep256 | `boeuf_bavette` · `semoule_couscous` · `graines_courge` · `ratatouille` · `oignon` |
| rep257 | `cabillaud` · `riz_complet` · `avocat` · `petits_pois` · `oignon` |
| rep258 | `saumon_fume` · `quinoa` · `creme_soja` · `asperges` · `epinards` |
| rep259 | `thon_naturel` · `nouilles_completes` · `graines_courge` · `brocoli` · `poivron` |
| rep260 | `poulet_filet` · `millet` · `huile_olive` · `epinards` · `champignons` |
| rep261 | `boeuf_5` · `nouilles_riz` · `beurre_cacahuete` · `legumes_wok` · `oignon` |
| rep262 | `crevettes` · `quinoa` · `lait_coco` · `chou_fleur` · `petits_pois` |
| rep263 | `cottage_cheese` · `boulgour` · `graines_courge` · `courgette` · `tomate` |
| rep264 | `blanc_oeuf` · `pates_completes` · `amandes` · `epinards` · `tomate_concassee` |
| rep265 | `oeuf_entier` · `blanc_oeuf` · `polenta` · `graines_courge` · `asperges` |
| rep266 | `fromage_blanc_0` · `sarrasin` · `amandes` · `betterave` · `roquette` |
| rep267 | `proteine_vegetale` · `nouilles_riz` · `lait_coco` · `legumes_wok` · `oignon` |
| rep268 | `tofu_fume` · `sarrasin` · `graines_courge` · `epinards` · `tomate_concassee` |
| rep269 | `seitan` · `millet` · `avocat` · `poivron` · `oignon` |
| rep270 | `lentilles_cuites` · `proteine_vegetale` · `polenta` · `huile_olive` · `carotte` |

---

## 9. Avant de répondre — auto-contrôle

Passe cette liste sur **chaque** recette. Ce sont les erreurs réellement constatées sur les vagues
précédentes.

- [ ] Tous les `ref` existent dans la table du §4, à l'orthographe exacte.
- [ ] 4 à 6 ingrédients. `base_servings: 1`. `qty` entiers.
- [ ] Une ancre `protein` + `scalable: true` (**pas** `dairy`), une ancre `fat` + `scalable: true`.
- [ ] `vegetable` et `flavor` en `scalable: false`.
- [ ] `qty` de base ≤ « Max abs. » quand la colonne est renseignée.
- [ ] `macros_per_serving` recalculé ingrédient par ingrédient, dans l'enveloppe du §3.
- [ ] **Protéines de base dans la fourchette du §3, sans dépassement.** C'est l'erreur la plus
      coûteuse : elle est irréversible côté moteur.
- [ ] Aucune instruction n'introduit un ingrédient hors liste.
- [ ] Aucune durée d'instruction ne dépasse `tags.temps_min`. Aucun repos > 10 min.
- [ ] 4 à 7 étapes, à l'impératif.
- [ ] Aucun couple protéine × féculent de la liste des saturés.
- [ ] Au plus 3 `ref` en commun avec une recette existante, et entre les recettes du lot.
- [ ] Deux recettes du lot ne partagent pas leurs 3 premiers mots significatifs.
- [ ] Répartition par régime du §1 respectée, **les trois lignes étant exclusives**, sans écrire
      le régime dans la recette.
- [ ] `wave` = `"2026-08-02-b7-repas-vegan"` sur les 10.

Réponds avec **le JSON seul**. Si un ingrédient t'a manqué, ou si une recette t'a semblé
impossible à tenir dans l'enveloppe, dis-le **après** le JSON, en clair.
