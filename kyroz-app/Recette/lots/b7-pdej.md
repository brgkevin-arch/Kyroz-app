# B7 — 12 petits-déjeuners végétaux, ancres neuves

**Lot autonome.** Tout ce qu'il faut est dans ce fichier : le format de sortie, les ingrédients
autorisés avec leurs macros, les règles, et ce qui est déjà pris dans le catalogue. Tu n'as besoin
d'aucun autre document et d'aucun accès au code.

Généré depuis le catalogue live (466 recettes) — les valeurs ci-dessous sont exactes.

---

## 1. La commande

**12 recettes de catégorie `petit_dej` (petit-déjeuner).**

ids à produire, dans cet ordre, sans trou et sans doublon :
`pd111`, `pd112`, `pd113`, `pd114`, `pd115`, `pd116`, `pd117`, `pd118`, `pd119`, `pd120`, `pd121`, `pd122`

Répartition par régime, à respecter exactement. **Les trois lignes sont exclusives** : une
recette tombe dans une seule, et c'est l'ingrédient le plus restrictif qui décide.

| | Nombre |
|---|---|
| **Carnées ou marines** — contiennent viande, volaille ou poisson | **0** |
| **Végétariennes** — œufs et/ou laitages, **aucune** chair animale | **0** |
| **Vegan** — aucun produit animal (ni œuf, ni laitage, ni miel) | **12** |
| **dont sans gluten, toutes lignes confondues** | **≥ 9** |

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
| 413 kcal · 24 g P | 8 / 12 |
| 470 kcal · 28 g P | 12 / 12 |
| 502 kcal · 30 g P | 12 / 12 |
| 523 kcal · 31 g P | 12 / 12 | ← l'enveloppe de CE lot
| 575 kcal · 35 g P | 12 / 12 |
| 638 kcal · 39 g P | 12 / 12 |
| 721 kcal · 44 g P | 9 / 12 |

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
compte pour toi est **petit-déjeuner**.

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
| Calories | **510 – 570 kcal** |
| Protéines | **30 – 36 g** |
| Glucides | 56 – 70 g |
| Lipides | 14 – 19 g |

> **Densité protéique imposée : 5.3 à 7.1 g de protéines pour 100 kcal.**
> C'est la conséquence arithmétique des fourchettes ci-dessus, et c'est **la contrainte qui
> décide** de la couverture — plus que les calories. Vérifie-la sur chaque recette :
> `protéines × 100 ÷ kcal`.

- **Base 510–570 kcal ET 30 à 36 g de protéines. Les deux bornes ensemble, jamais l'une sans l'autre.** Monter les calories sans monter la protéine dégrade la couverture — c'est mesuré sur le moteur, pas supposé.
- 🎯 **TOUTES les recettes de ce lot sont végétaliennes.** Ce n'est pas une orientation éditoriale, c'est de l'arithmétique : une recette végétalienne entre AUSSI dans les pools halal, pescatarien, sans lactose, végétarien et sans porc (mesuré : 166 recettes vegan du catalogue, 166 fois sur 166). Aucun autre type de recette ne sert autant de monde à volume égal.
- 🎯 **VARIE LES ANCRES — c'est la raison d'être du lot.** Les deux ancres végétales du créneau sont saturées : `yaourt_soja_proteine` et `proteine_vegetale` portent à elles seules 15 des 44 petits-déjeuners vegan existants. **Au plus 2 recettes du lot peuvent les employer comme ancre principale.** Les 10 autres se répartissent sur : `tofu_ferme`, `tofu_fume`, `tempeh`, `edamame`, `soja_texture`, `seitan`. Ces six-là rendent 12 profils sur 12 à cette enveloppe — c'est mesuré, elles ne sont pas un pis-aller.
- ⚠️ **Les légumineuses SÈCHES ne tiennent pas ce créneau, ne les prends pas comme ancre principale.** Mesuré à 540 kcal / 33 g P : les lentilles corail rendent 7 profils sur 12, les lentilles vertes et les haricots blancs 6, `pois_chiches` 1. Il faut 95 à 160 g de légumineuse sèche pour 33 g de protéines, et il ne reste alors plus assez de calories pour un vrai féculent. En appoint (20–30 g), aucun problème — `pois_chiches_conserve` et `lentilles_cuites` sont là pour ça.
- ⚠️ **Un vrai féculent `carb` et `scalable` dans CHAQUE recette, 45 à 80 g pesés secs.** C'est la cause première du chantier : les 13 petits-déjeuners du catalogue sans féculent servent **2,7 profils sur 12** en moyenne, contre **9,0** pour les 97 qui en portent un. Sans féculent, le moteur n'a rien à étirer pour nourrir un gros gabarit.
- ⚠️ **Féculents DENSES.** `patate_douce` et `pomme_de_terre` ne dépassent pas 6 profils sur 12 même au centre de l'enveloppe : à 20 g de glucides aux 100 g, le facteur de montée ne suffit pas. Emploie `flocons_avoine`, `sarrasin`, `millet`, `quinoa`, `polenta`, `pain_complet`, `pain_seigle`, `chataigne`, `riz_complet`.
- Sous-lot sans gluten (9 des 12) : `flocons_avoine`, `pain_complet`, `pain_seigle` **interdits**. Autorisés : `sarrasin`, `millet`, `quinoa`, `polenta`, `galette_riz`, `chataigne`, `riz_complet`, `nouilles_riz`, `mais`, `pain_sans_gluten`. ⚠️ `seitan` contient du gluten : il ne peut porter aucune des 9.
- Ancre grasse `fat` + `scalable`, **14 à 19 g** de lipides.
- **Vise le SALÉ.** Le porridge et le pudding sont saturés, le contrôle anti-doublons les refusera. Tofu brouillé, galette de sarrasin garnie, bowl chaud salé, tartine complète, pancakes salés, edamame sur riz complet : c'est là qu'est la place libre.
- **Aucun repos au froid de plus de 10 minutes.** Un plan affiché le matin doit être cuisinable le jour même.

---

## 4. Les 78 `ref` autorisés

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
| `avocat` | Avocat | g | 203 | 1.6 | 0 | 20.6 | — | ≤ 100 | 8 |
| `banane` | Banane | g | 88 | 1.1 | 19.7 | 0.5 | — | — | 21 |
| `beurre_amande` | Beurre d'amande | g | 631 | 21.4 | 8.8 | 52.5 | — | ≤ 40 | 6 |
| `beurre_cacahuete` | Beurre de cacahuète | g | 643 | 22.2 | 17.3 | 51.4 | — | ≤ 40 | 9 |
| `blanc_oeuf` | Blanc d'œuf | g | 48 | 10.9 | 0.7 | 0.2 | — | — | 8 |
| `boisson_soja` | Boisson au soja nature | ml | 42 | 3.2 | 1.9 | 2.1 | — | — | 0 |
| `cacao_poudre` | Cacao maigre en poudre | g | 387 | 22.4 | 11.6 | 20.6 | — | — | 10 |
| `champignons` | Champignons | g | 21 | 2.1 | 1.8 | 0.4 | — | — | 7 |
| `chataigne` | Châtaigne | g | 189 | 2 | 36.8 | 1.8 | — | — | 5 |
| `chocolat_noir` | Chocolat noir 70% | g | 591 | 10.4 | 26.9 | 46.3 | — | ≤ 30 | 1 |
| `concombre` | Concombre | g | 17 | 0.7 | 2.9 | 0.1 | — | — | 6 |
| `cottage_cheese` | Cottage cheese | g | 98 | 11 | 3 | 4.3 | — | — | 8 |
| `dattes` | Dattes dénoyautées | g | 287 | 1.8 | 64.7 | 0.2 | — | ≤ 60 | 3 |
| `dinde_escalope` | Escalope de dinde | g | 108 | 23.7 | 0 | 1.5 | cru | — | 4 |
| `edamame` | Edamame | g | 125 | 11 | 9 | 5 | — | — | 0 |
| `epinards` | Épinards frais | g | 33 | 2.7 | 3.1 | 0.4 | — | — | 16 |
| `falafel` ⛔SG | Falafel prêt à consommer | g | 211 | 7.4 | 17.7 | 10.8 | — | ≤ 200 | 0 |
| `feta` | Feta | g | 273 | 15.4 | 1.2 | 22.6 | — | ≤ 60 | 2 |
| `flocons_avoine` ⛔SG | Flocons d'avoine | g | 369 | 10.6 | 57.7 | 7.8 | SEC | — | 23 |
| `framboises` | Framboises | g | 48 | 1.2 | 5.8 | 0.8 | — | — | 10 |
| `fromage_blanc_0` | Fromage blanc 0% | g | 48 | 7.3 | 4.2 | 0.1 | — | — | 6 |
| `fruits_rouges` | Fruits rouges (mélange) | g | 50 | 1 | 9 | 0.4 | — | — | 8 |
| `galette_riz` | Galette de riz soufflé | g | 381 | 8.4 | 77.9 | 3 | — | — | 3 |
| `graines_chia` | Graines de chia | g | 454 | 16.5 | 7.7 | 30.7 | — | ≤ 35 | 13 |
| `graines_courge` | Graines de courge | g | 618 | 29.5 | 5.4 | 49.1 | — | ≤ 30 | 12 |
| `haricots_rouges_conserve` | Haricots rouges (conserve, égouttés) | g | 108 | 8.3 | 13 | 1 | — | — | 0 |
| `huile_olive` | Huile d'olive | g | 899 | 0.2 | 0 | 99.9 | — | ≤ 25 | 16 |
| `jambon_blanc` | Jambon blanc | g | 117 | 20.5 | 0.8 | 3.5 | — | — | 4 |
| `kiwi` | Kiwi | g | 61 | 0.9 | 11 | 0.6 | — | — | 4 |
| `lait_amande` | Lait d'amande | ml | 36 | 1.1 | 0.7 | 3.2 | — | — | 16 |
| `lait_coco` | Lait de coco | ml | 199 | 1.9 | 4.3 | 19.2 | — | ≤ 120 | 4 |
| `lait_demi_ecreme` | Lait demi-écrémé | ml | 48 | 3.5 | 5 | 1.6 | — | — | 11 |
| `lentilles_cuites` | Lentilles cuites (conserve ou sachet) | g | 125 | 10.1 | 16.2 | 0.6 | — | — | 1 |
| `levure_maltee` ⛔SG | Levure maltée | g | 350 | 50 | 35 | 5 | — | ≤ 20 | 5 |
| `mais` | Maïs | g | 105 | 2.7 | 18.3 | 1.7 | — | — | 0 |
| `mangue` | Mangue | g | 71 | 0.6 | 14.3 | 0.5 | — | — | 8 |
| `miel` | Miel | g | 331 | 0.7 | 82.1 | 0 | — | — | 5 |
| `millet` | Millet | g | 360 | 11 | 73 | 4 | SEC | — | 8 |
| `myrtilles` | Myrtilles | g | 58 | 0.9 | 10.6 | 0.3 | — | — | 8 |
| `noisettes` | Noisettes | g | 632 | 14.4 | 7.2 | 56.9 | — | ≤ 35 | 10 |
| `noix` | Noix | g | 709 | 13.3 | 6.9 | 67.3 | — | ≤ 35 | 8 |
| `nouilles_riz` | Nouilles de riz | g | 365 | 7.4 | 80.5 | 1 | SEC | — | 0 |
| `oeuf_entier` | Œuf entier | g | 140 | 12.8 | 0.1 | 9.8 | — | — | 16 |
| `pain_complet` ⛔SG | Pain complet | g | 234 | 8.7 | 41.2 | 1.7 | — | — | 8 |
| `pain_pita_complet` ⛔SG | Pain pita complet | g | 249 | 7.5 | 48.8 | 1.5 | — | — | 2 |
| `pain_sans_gluten` | Pain sans gluten | g | 249 | 4.6 | 37.1 | 6.6 | — | — | 1 |
| `pain_seigle` ⛔SG | Pain de seigle | g | 260 | 8.3 | 51.5 | 1 | — | — | 7 |
| `patate_douce` | Patate douce | g | 81 | 1.6 | 17.1 | 0.1 | cru | — | 5 |
| `pois_chiches` | Pois chiches | g | 350 | 20.5 | 47.5 | 6 | SEC | — | 2 |
| `pois_chiches_conserve` | Pois chiches (conserve, égouttés) | g | 122 | 6.7 | 15 | 2.7 | — | — | 0 |
| `poivron` | Poivron | g | 23 | 0.8 | 3.5 | 0.3 | — | — | 6 |
| `polenta` | Polenta | g | 350 | 7.9 | 74 | 1.8 | SEC | — | 10 |
| `pomme` | Pomme | g | 54 | 0.2 | 11.6 | 0.2 | — | — | 12 |
| `pomme_de_terre` | Pomme de terre | g | 80 | 2 | 16.2 | 0.1 | cru | — | 2 |
| `proteine_vegetale` | Protéine végétale (pois/soja) | g | 383 | 73 | 10 | 7 | — | — | 17 |
| `quinoa` | Quinoa | g | 358 | 13.2 | 58.1 | 6.1 | SEC | — | 7 |
| `raisins` | Raisins | g | 71 | 0.7 | 16.3 | 0.2 | — | — | 2 |
| `riz_basmati` | Riz basmati | g | 351 | 7.1 | 78.4 | 0.6 | SEC | — | 4 |
| `riz_complet` | Riz complet | g | 350 | 7 | 71.4 | 2.8 | SEC | — | 0 |
| `sarrasin` | Sarrasin | g | 362 | 13.3 | 67.5 | 3.4 | SEC | — | 10 |
| `saumon_fume` | Saumon fumé | g | 184 | 22.2 | 0.1 | 10.5 | — | — | 5 |
| `seitan` ⛔SG | Seitan | g | 134 | 20.6 | 6.7 | 2.5 | — | — | 0 |
| `sirop_erable` | Sirop d'érable | g | 269 | 0 | 67.2 | 0.1 | — | — | 4 |
| `skyr` | Skyr nature | g | 63 | 11 | 4 | 0.2 | — | — | 13 |
| `soja_texture` | Protéine de soja texturée (PST) | g | 345 | 52 | 30 | 1 | SEC | ≤ 70 | 0 |
| `tahini` | Purée de sésame (tahini) | g | 631 | 17.7 | 13.8 | 53.4 | — | ≤ 40 | 2 |
| `tempeh` | Tempeh | g | 157 | 16.1 | 7.9 | 4.7 | — | — | 0 |
| `tofu_ferme` | Tofu ferme | g | 147 | 13.4 | 2.9 | 8.5 | — | — | 4 |
| `tofu_fume` | Tofu fumé | g | 164 | 14.9 | 2.9 | 9.5 | — | — | 2 |
| `tomate` | Tomate | g | 18 | 0.5 | 3.4 | 0.5 | — | — | 15 |
| `tomate_concassee` | Tomate concassée | g | 23 | 1.2 | 3.6 | 0.5 | — | — | 4 |
| `tortilla_complete` ⛔SG | Tortilla blé complet | g | 320 | 8 | 53 | 7.5 | — | — | 1 |
| `whey` | Whey (neutre/vanille) | g | 377 | 80 | 7 | 5 | — | ≤ 60 | 15 |
| `wrap_sans_gluten` | Wrap / tortilla sans gluten | g | 316 | 6.1 | 58 | 5.6 | — | — | 1 |
| `yaourt_grec` | Yaourt grec égoutté (type Fage) | g | 115 | 9 | 4 | 7 | — | — | 2 |
| `yaourt_soja_proteine` | Yaourt de soja protéiné | g | 65 | 9 | 4 | 1.5 | — | — | 20 |

**70 de ces 78 refs sont compatibles sans gluten** (ceux sans ⛔SG).

---

## 5. Format de sortie exact

Un seul objet JSON, une seule clé `recipes`, 12 objets. Pas de `_meta`, pas de
`config`, pas de commentaire dans le JSON.

```json
{ "recipes": [ /* les 12 recettes */ ] }
```

Voici une recette **réelle** du catalogue, dans la bonne catégorie. C'est le gabarit exact à
imiter — structure, nommage, niveau de détail :

```json
{
  "id": "pd38",
  "name": "Tartine de seigle – œufs brouillés – tomate",
  "category": "petit_dej",
  "tags": {
    "objectif": [
      "maintien",
      "prise_de_masse"
    ],
    "recup_jour_repos": true,
    "sport": [
      "muscu"
    ],
    "temps_min": 10
  },
  "base_servings": 1,
  "ingredients": [
    {
      "ref": "oeuf_entier",
      "qty": 150,
      "macro_role": "protein",
      "scalable": true
    },
    {
      "ref": "avocat",
      "qty": 60,
      "macro_role": "fat",
      "scalable": true
    },
    {
      "ref": "pain_seigle",
      "qty": 70,
      "macro_role": "carb",
      "scalable": true
    },
    {
      "ref": "tomate",
      "qty": 80,
      "macro_role": "vegetable",
      "scalable": false
    }
  ],
  "instructions": [
    "Casse les œufs dans un bol, sale, poivre et bats-les à la fourchette juste assez pour mélanger les jaunes et les blancs.",
    "Fais griller les tranches de pain de seigle jusqu'à ce qu'elles soient fermes sous le doigt.",
    "Écrase l'avocat à la fourchette avec une pincée de sel, en gardant des morceaux.",
    "Verse les œufs dans une poêle froide, mets sur feu DOUX et remue sans arrêt à la spatule 3 à 4 minutes : retire du feu quand ils sont encore brillants et crémeux, ils finissent de cuire hors du feu.",
    "Coupe la tomate en rondelles fines et sale-les légèrement.",
    "Tartine le pain d'avocat, dépose les œufs brouillés dessus, couronne de rondelles de tomate et donne un tour de moulin."
  ],
  "why": "Jour repos : lipides de qualité, satiété durable.",
  "macros_per_serving": {
    "kcal": 528.2,
    "protein": 26.4,
    "carbs": 38.9,
    "fat": 28.2
  },
  "wave": "2026-08-02-b7-pdej-vegan"
}
```

### Champ par champ

| Champ | Règle |
|---|---|
| `id` | exactement ceux listés au §1, dans l'ordre |
| `name` | français, descriptif, sans marqueur de régime (« vegan », « healthy », « fit ») et sans superlatif. Deux recettes ne peuvent pas partager leurs 3 premiers mots significatifs. |
| `category` | `"petit_dej"` pour les 12 |
| `base_servings` | `1`, sans exception |
| `tags.objectif` | mécanique, depuis les kcal de base — voir §6 |
| `tags.recup_jour_repos` | `true` si les glucides font moins de 45 % des calories, sinon `false`. Rien d'éditorial. |
| `tags.sport` | `["muscu"]` par défaut ; ajoute `"endurance"` si les glucides dépassent 55 % des calories. **`"combats"` est interdit.** |
| `tags.temps_min` | temps TOTAL de cuisine, cuisson comprise. Aucune durée des `instructions` ne peut le dépasser. |
| `ingredients` | **4 à 6 entrées.** Chacune : `ref` (§4), `qty` entier, `macro_role`, `scalable`. |
| `instructions` | **4 à 7 étapes** — voir §6 |
| `why` | une phrase sobre sur l'intérêt nutritionnel. Aucune promesse de santé, aucune revendication de régime. |
| `macros_per_serving` | **calculé**, pas estimé : pour chaque ingrédient `per_100 × qty / 100`, puis somme. Tolérance ±10 %. |
| `wave` | `"2026-08-02-b7-pdej-vegan"` pour les 12 — c'est le nom du dossier de drop qui portera cette livraison, la convention du catalogue (`_meta.waves`). Recopie-le tel quel. |

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

Ces contrôles s'appliquent aussi **entre les 12 recettes de ce lot**.

### Couples protéine × féculent déjà saturés en `petit_dej` — INTERDITS

Ces 19 couples portent déjà 2 recettes ou plus. Le seuil est atteint : n'en produis aucune de plus.

| Protéines × féculents | Déjà | Recettes |
|---|---|---|
| whey × flocons_avoine | 6 | pd01, pd09, pd14, pd19, pd21, pd25 |
| yaourt_soja_proteine × sans féculent | 6 | pd47, pd48, pd53, pd55, pd72, pd75 |
| skyr × flocons_avoine | 4 | pd02, pd06, pd26, pd27 |
| fromage_blanc_0 × flocons_avoine | 3 | pd15, pd22, pd28 |
| proteine_vegetale × sans féculent | 3 | pd34, pd49, pd54 |
| yaourt_soja_proteine × quinoa | 3 | pd43, pd50, pd58 |
| proteine_vegetale × flocons_avoine | 2 | pd07, pd33 |
| cottage_cheese × pain_seigle | 2 | pd08, pd85 |
| yaourt_grec × flocons_avoine | 2 | pd10, pd30 |
| tofu_ferme × pain_complet | 2 | pd16, pd35 |
| yaourt_soja_proteine × sarrasin | 2 | pd23, pd96 |
| proteine_vegetale × millet | 2 | pd24, pd46 |
| yaourt_soja_proteine × flocons_avoine | 2 | pd31, pd32 |
| yaourt_soja_proteine × millet | 2 | pd44, pd57 |
| proteine_vegetale × sarrasin | 2 | pd45, pd67 |
| proteine_vegetale × riz_basmati | 2 | pd51, pd65 |
| skyr × chataigne | 2 | pd63, pd73 |
| skyr × quinoa | 2 | pd69, pd102 |
| fromage_blanc_0 × millet | 2 | pd90, pd105 |

### Plafond par ancre sur ce lot

Aucun `ref` protéique ne peut porter plus de **25 % des 12 recettes**, soit
**3 au maximum**. Il te faut au moins
**6 ancres protéiques distinctes** et
**4 ancres grasses distinctes**.

Refs les plus employés dans cette catégorie — à ne PAS renforcer :

- `flocons_avoine` (carb) — déjà dans 23 recettes
- `yaourt_soja_proteine` (protein) — déjà dans 20 recettes
- `proteine_vegetale` (protein) — déjà dans 17 recettes
- `huile_olive` (fat) — déjà dans 16 recettes
- `oeuf_entier` (protein) — déjà dans 16 recettes
- `whey` (protein) — déjà dans 15 recettes
- `graines_chia` (fat) — déjà dans 13 recettes
- `skyr` (protein) — déjà dans 13 recettes
- `amandes` (fat) — déjà dans 12 recettes
- `graines_courge` (fat) — déjà dans 12 recettes
- `noisettes` (fat) — déjà dans 10 recettes
- `polenta` (carb) — déjà dans 10 recettes
- `sarrasin` (carb) — déjà dans 10 recettes
- `beurre_cacahuete` (fat) — déjà dans 9 recettes
- `avocat` (fat) — déjà dans 8 recettes

### Ancres encore OUVERTES — c'est là qu'il faut aller

Dire ce qui est interdit sans dire ce qui reste libre envoie dans un mur. Voici les ancres
protéiques par ordre de **disponibilité** — **toutes prises dans les 78 refs du §4**,
donc toutes réellement employables. « Couples saturés » = combinaisons déjà fermées pour cette
ancre, « places libres » = combinaisons (ancre × féculent autorisé) encore utilisables.

| Ancre protéine | Déjà employée ici | Couples saturés | Places libres |
|---|---|---|---|
| `edamame` | — | — | 21 |
| `haricots_rouges_conserve` | — | — | 21 |
| `seitan` | — | — | 21 |
| `soja_texture` | — | — | 21 |
| `tempeh` | — | — | 21 |
| `lentilles_cuites` | 1 | — | 21 |
| `tofu_fume` | 2 | — | 21 |
| `tofu_ferme` | 4 | 1 | 20 |
| `proteine_vegetale` | 17 | 5 | 16 |
| `yaourt_soja_proteine` | 20 | 5 | 16 |

**Refs du §4 JAMAIS employés en `petit_dej`** — terrain entièrement vierge, aucun risque de
doublon :

`boisson_soja` · `edamame` · `falafel` · `haricots_rouges_conserve` · `mais` · `nouilles_riz` · `pois_chiches_conserve` · `riz_complet` · `seitan` · `soja_texture` · `tempeh`

### Diversité de format

Au plus **3 recettes** de ce lot peuvent partager le même format de service : wrap/pita/tartine,
bowl, poêlée, salade, porridge/pudding, galette/pancake, soupe.

---

## 8. Annexe — les 110 recettes `petit_dej` déjà au catalogue

**Tu as besoin de cette table pour respecter R1 et R2**, qui portent sur l'ensemble ENTIER des refs
et pas seulement sur le couple protéine × féculent. Vérifie chacune de tes recettes contre elle.

Refs les plus fréquents sur ce créneau (à éviter de renforcer) : `flocons_avoine` 23 · `banane` 21 · `yaourt_soja_proteine` 20 · `proteine_vegetale` 17 · `lait_amande` 16 · `oeuf_entier` 16 · `huile_olive` 16 · `epinards` 16 · `whey` 15 · `tomate` 15 · `skyr` 13 · `graines_chia` 13 · `amandes` 12 · `pomme` 12 · `graines_courge` 12 · `lait_demi_ecreme` 11 · `framboises` 10 · `cacao_poudre` 10 · `sarrasin` 10 · `noisettes` 10 · `polenta` 10 · `beurre_cacahuete` 9 · `myrtilles` 8 · `blanc_oeuf` 8 · `avocat` 8 · `pain_complet` 8 · `fruits_rouges` 8 · `mangue` 8 · `cottage_cheese` 8 · `noix` 8 · `millet` 8 · `champignons` 7 · `pain_seigle` 7 · `quinoa` 7 · `poivron` 6 · `beurre_amande` 6 · `fromage_blanc_0` 6 · `concombre` 6 · `miel` 5 · `saumon_fume` 5 · `levure_maltee` 5 · `patate_douce` 5 · `chataigne` 5

| id | ensemble de refs |
|---|---|
| pd01 | `whey` · `lait_demi_ecreme` · `flocons_avoine` · `banane` · `myrtilles` |
| pd02 | `flocons_avoine` · `skyr` · `graines_chia` · `framboises` · `lait_amande` |
| pd03 | `flocons_avoine` · `banane` · `oeuf_entier` · `blanc_oeuf` · `whey` |
| pd04 | `oeuf_entier` · `jambon_blanc` · `champignons` · `huile_olive` |
| pd05 | `oeuf_entier` · `avocat` · `pain_complet` · `epinards` |
| pd06 | `skyr` · `flocons_avoine` · `amandes` · `fruits_rouges` · `miel` |
| pd07 | `proteine_vegetale` · `mangue` · `banane` · `epinards` · `lait_amande` · `flocons_avoine` |
| pd08 | `pain_seigle` · `cottage_cheese` · `tomate` · `huile_olive` |
| pd09 | `flocons_avoine` · `lait_demi_ecreme` · `cacao_poudre` · `beurre_cacahuete` · `whey` · `banane` |
| pd10 | `yaourt_grec` · `noix` · `miel` · `pomme` · `flocons_avoine` |
| pd11 | `blanc_oeuf` · `oeuf_entier` · `epinards` · `feta` · `huile_olive` |
| pd12 | `pain_complet` · `oeuf_entier` · `lait_demi_ecreme` · `whey` · `fruits_rouges` · `sirop_erable` |
| pd13 | `tortilla_complete` · `oeuf_entier` · `dinde_escalope` · `poivron` |
| pd14 | `whey` · `banane` · `beurre_amande` · `flocons_avoine` · `lait_demi_ecreme` |
| pd15 | `fromage_blanc_0` · `flocons_avoine` · `kiwi` · `graines_courge` |
| pd16 | `tofu_ferme` · `epinards` · `pain_complet` · `huile_olive` |
| pd17 | `quinoa` · `lait_amande` · `pomme` · `amandes` · `whey` |
| pd18 | `pain_pita_complet` · `saumon_fume` · `cottage_cheese` · `concombre` |
| pd19 | `whey` · `flocons_avoine` · `lait_demi_ecreme` · `dattes` · `beurre_cacahuete` · `banane` |
| pd20 | `oeuf_entier` · `tomate_concassee` · `poivron` · `pois_chiches` · `huile_olive` · `pain_complet` |
| pd21 | `flocons_avoine` · `whey` · `lait_demi_ecreme` · `banane` · `beurre_cacahuete` |
| pd22 | `flocons_avoine` · `fromage_blanc_0` · `fruits_rouges` · `amandes` |
| pd23 | `sarrasin` · `yaourt_soja_proteine` · `myrtilles` · `graines_chia` |
| pd24 | `millet` · `proteine_vegetale` · `lait_coco` · `mangue` |
| pd25 | `flocons_avoine` · `whey` · `lait_demi_ecreme` · `cacao_poudre` · `noisettes` |
| pd26 | `skyr` · `flocons_avoine` · `framboises` · `amandes` |
| pd27 | `skyr` · `beurre_amande` · `banane` · `flocons_avoine` |
| pd28 | `fromage_blanc_0` · `flocons_avoine` · `pomme` · `noix` |
| pd29 | `cottage_cheese` · `ananas` · `graines_courge` · `flocons_avoine` |
| pd30 | `yaourt_grec` · `flocons_avoine` · `miel` · `noix` |
| pd31 | `flocons_avoine` · `yaourt_soja_proteine` · `graines_chia` · `fruits_rouges` |
| pd32 | `yaourt_soja_proteine` · `flocons_avoine` · `banane` · `beurre_cacahuete` |
| pd33 | `proteine_vegetale` · `mangue` · `lait_amande` · `flocons_avoine` · `graines_chia` |
| pd34 | `graines_chia` · `proteine_vegetale` · `lait_amande` · `cacao_poudre` · `banane` |
| pd35 | `tofu_ferme` · `epinards` · `pain_complet` · `huile_olive` · `levure_maltee` |
| pd36 | `flocons_avoine` · `oeuf_entier` · `banane` · `skyr` · `sirop_erable` |
| pd37 | `blanc_oeuf` · `oeuf_entier` · `tomate` · `pain_seigle` |
| pd38 | `oeuf_entier` · `avocat` · `pain_seigle` · `tomate` |
| pd39 | `flocons_avoine` · `whey` · `blanc_oeuf` · `myrtilles` |
| pd40 | `pain_complet` · `cottage_cheese` · `saumon_fume` · `concombre` |
| pd41 | `pain_complet` · `beurre_cacahuete` · `banane` · `yaourt_soja_proteine` |
| pd42 | `pain_pita_complet` · `pois_chiches` · `oeuf_entier` · `tomate` · `huile_olive` |
| pd43 | `quinoa` · `yaourt_soja_proteine` · `kiwi` · `amandes` |
| pd44 | `millet` · `yaourt_soja_proteine` · `pomme` · `graines_chia` |
| pd45 | `sarrasin` · `proteine_vegetale` · `beurre_cacahuete` · `banane` |
| pd46 | `millet` · `proteine_vegetale` · `lait_amande` · `cacao_poudre` · `dattes` |
| pd47 | `graines_chia` · `yaourt_soja_proteine` · `mangue` · `lait_coco` |
| pd48 | `yaourt_soja_proteine` · `fruits_rouges` · `amandes` · `banane` |
| pd49 | `proteine_vegetale` · `framboises` · `lait_amande` · `graines_chia` |
| pd50 | `quinoa` · `yaourt_soja_proteine` · `pomme` · `amandes` |
| pd51 | `riz_basmati` · `proteine_vegetale` · `lait_amande` · `dattes` · `amandes` |
| pd52 | `tofu_ferme` · `patate_douce` · `epinards` · `huile_olive` · `levure_maltee` |
| pd53 | `yaourt_soja_proteine` · `kiwi` · `graines_courge` |
| pd54 | `graines_chia` · `proteine_vegetale` · `lait_amande` · `cacao_poudre` · `banane` · `beurre_amande` |
| pd55 | `yaourt_soja_proteine` · `mangue` · `avocat` · `graines_chia` |
| pd56 | `galette_riz` · `beurre_cacahuete` · `banane` · `yaourt_soja_proteine` |
| pd57 | `millet` · `yaourt_soja_proteine` · `framboises` · `noisettes` |
| pd58 | `quinoa` · `yaourt_soja_proteine` · `fruits_rouges` · `amandes` · `lait_coco` |
| pd59 | `polenta` · `lait_demi_ecreme` · `whey` · `miel` · `noisettes` |
| pd60 | `polenta` · `lait_amande` · `proteine_vegetale` · `cacao_poudre` · `banane` |
| pd61 | `polenta` · `fromage_blanc_0` · `fruits_rouges` · `amandes` |
| pd62 | `chataigne` · `proteine_vegetale` · `lait_amande` · `pomme` · `noisettes` |
| pd63 | `chataigne` · `skyr` · `chocolat_noir` · `banane` |
| pd64 | `riz_basmati` · `lait_demi_ecreme` · `whey` · `framboises` |
| pd65 | `riz_basmati` · `lait_amande` · `proteine_vegetale` · `lait_coco` · `mangue` · `graines_chia` |
| pd66 | `sarrasin` · `oeuf_entier` · `skyr` · `myrtilles` · `sirop_erable` |
| pd67 | `sarrasin` · `proteine_vegetale` · `lait_amande` · `banane` · `beurre_cacahuete` |
| pd68 | `oeuf_entier` · `banane` · `skyr` · `framboises` |
| pd69 | `quinoa` · `skyr` · `myrtilles` · `amandes` |
| pd70 | `millet` · `lait_demi_ecreme` · `whey` · `pomme` · `noix` |
| pd71 | `sarrasin` · `cottage_cheese` · `pomme` · `graines_courge` |
| pd72 | `graines_chia` · `yaourt_soja_proteine` · `kiwi` |
| pd73 | `skyr` · `chataigne` · `raisins` · `noisettes` |
| pd74 | `skyr` · `fruits_rouges` · `lait_amande` · `graines_courge` |
| pd75 | `yaourt_soja_proteine` · `banane` · `beurre_amande` · `graines_chia` |
| pd76 | `oeuf_entier` · `polenta` · `tomate` · `huile_olive` |
| pd77 | `tofu_ferme` · `pomme_de_terre` · `champignons` · `huile_olive` · `levure_maltee` |
| pd78 | `oeuf_entier` · `patate_douce` · `epinards` · `feta` · `huile_olive` |
| pd79 | `dinde_escalope` · `polenta` · `graines_courge` · `champignons` · `epinards` |
| pd80 | `dinde_escalope` · `sarrasin` · `huile_olive` · `poivron` · `tomate` |
| pd81 | `jambon_blanc` · `pain_seigle` · `avocat` · `concombre` · `tomate` |
| pd82 | `jambon_blanc` · `patate_douce` · `noix` · `epinards` · `tomate` |
| pd83 | `saumon_fume` · `pain_seigle` · `graines_courge` · `concombre` · `epinards` |
| pd84 | `saumon_fume` · `galette_riz` · `huile_olive` · `tomate` · `poivron` |
| pd85 | `cottage_cheese` · `pain_seigle` · `noisettes` · `framboises` |
| pd86 | `cottage_cheese` · `polenta` · `huile_olive` · `tomate_concassee` · `levure_maltee` |
| pd87 | `blanc_oeuf` · `pain_complet` · `avocat` · `champignons` · `epinards` |
| pd88 | `blanc_oeuf` · `patate_douce` · `noix` · `poivron` · `tomate` |
| pd89 | `skyr` · `sarrasin` · `amandes` · `myrtilles` · `pomme` |
| pd90 | `fromage_blanc_0` · `millet` · `noix` · `pomme` · `miel` |
| pd91 | `blanc_oeuf` · `pomme_de_terre` · `huile_olive` · `champignons` · `tomate_concassee` |
| pd92 | `proteine_vegetale` · `wrap_sans_gluten` · `avocat` · `tomate` · `epinards` |
| pd93 | `tofu_fume` · `levure_maltee` · `polenta` · `graines_courge` · `epinards` |
| pd94 | `proteine_vegetale` · `quinoa` · `beurre_amande` · `mangue` |
| pd95 | `yaourt_soja_proteine` · `chataigne` · `noisettes` · `framboises` · `cacao_poudre` |
| pd96 | `yaourt_soja_proteine` · `sarrasin` · `tahini` · `myrtilles` · `sirop_erable` |
| pd97 | `proteine_vegetale` · `pain_sans_gluten` · `huile_olive` · `tomate` · `concombre` |
| pd98 | `yaourt_soja_proteine` · `patate_douce` · `noisettes` · `pomme` · `cacao_poudre` |
| pd99 | `dinde_escalope` · `millet` · `graines_courge` · `tomate` · `poivron` |
| pd100 | `jambon_blanc` · `polenta` · `avocat` · `tomate_concassee` · `champignons` |
| pd101 | `saumon_fume` · `sarrasin` · `tahini` · `concombre` · `epinards` |
| pd102 | `skyr` · `quinoa` · `noisettes` · `framboises` · `cacao_poudre` |
| pd103 | `cottage_cheese` · `whey` · `chataigne` · `beurre_amande` · `pomme` |
| pd104 | `oeuf_entier` · `blanc_oeuf` · `polenta` · `graines_courge` · `epinards` |
| pd105 | `fromage_blanc_0` · `millet` · `noix` · `raisins` · `cacao_poudre` |
| pd106 | `whey` · `sarrasin` · `noisettes` · `lait_demi_ecreme` · `myrtilles` |
| pd107 | `tofu_fume` · `pain_seigle` · `avocat` · `tomate` · `epinards` |
| pd108 | `lentilles_cuites` · `riz_basmati` · `graines_courge` · `champignons` · `tomate` |
| pd109 | `proteine_vegetale` · `galette_riz` · `beurre_cacahuete` · `lait_amande` · `framboises` |
| pd110 | `yaourt_soja_proteine` · `polenta` · `graines_courge` · `lait_amande` · `mangue` |

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
- [ ] `wave` = `"2026-08-02-b7-pdej-vegan"` sur les 12.

Réponds avec **le JSON seul**. Si un ingrédient t'a manqué, ou si une recette t'a semblé
impossible à tenir dans l'enveloppe, dis-le **après** le JSON, en clair.
