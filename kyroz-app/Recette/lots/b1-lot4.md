# B1 — repas complets, lot 4 sur 4

**Lot autonome.** Tout ce qu'il faut est dans ce fichier : le format de sortie, les ingrédients
autorisés avec leurs macros, les règles, et ce qui est déjà pris dans le catalogue. Tu n'as besoin
d'aucun autre document et d'aucun accès au code.

Généré depuis le catalogue live (347 recettes) — les valeurs ci-dessous sont exactes.

---

## 1. La commande

**20 recettes de catégorie `repas_complet` (repas complet).**

ids à produire, dans cet ordre, sans trou et sans doublon :
`rep231`, `rep232`, `rep233`, `rep234`, `rep235`, `rep236`, `rep237`, `rep238`, `rep239`, `rep240`, `rep241`, `rep242`, `rep243`, `rep244`, `rep245`, `rep246`, `rep247`, `rep248`, `rep249`, `rep250`

Répartition par régime, à respecter exactement. **Les trois lignes sont exclusives** : une
recette tombe dans une seule, et c'est l'ingrédient le plus restrictif qui décide.

| | Nombre |
|---|---|
| **Carnées ou marines** — contiennent viande, volaille ou poisson | **11** |
| **Végétariennes** — œufs et/ou laitages, **aucune** chair animale | **4** |
| **Vegan** — aucun produit animal (ni œuf, ni laitage, ni miel) | **5** |
| **dont sans gluten, toutes lignes confondues** | **≥ 9** |

Les seules ancres carnées que le §4 t'autorise sur ce créneau : `boeuf_5` · `boeuf_bavette` · `cabillaud` · `crevettes` · `dinde_escalope` · `jambon_blanc` · `maquereau` · `poulet_filet` · `sardines` · `saumon` · `saumon_fume` · `thon_frais` · `thon_naturel`. Aucune ne peut porter plus de 5 recettes (§7).

Le sans-gluten est **transverse** : une recette vegan peut compter dans les deux colonnes. N'écris
jamais le régime dans la recette — il est **déduit** des `ref` employés.

---

## 2. Comment l'application utilise ta recette (à lire, ça change tout)

**L'application ne sert jamais la recette telle que tu l'écris.** Un moteur redimensionne chaque
ingrédient marqué `scalable` pour tomber sur la cible calorique de la personne, repas par repas.
Ta recette n'est pas un plat, c'est une **enveloppe**.

Les facteurs de redimensionnement, par `macro_role` :

| `macro_role` | Min | Max | Ce que ça implique |
|---|---|---|---|
| `protein` | **1,00** | 1,70 | **Ne descend JAMAIS sous ta quantité.** Ce que tu écris est un **plancher définitif**. |
| `carb` | 0,50 | 1,80 | Le plus élastique, et aucun plafond absolu : c'est lui qui va chercher les grosses cibles. |
| `fat` | 0,50 | 1,50 | Plafonné en plus par la colonne « Max abs. » du §4. |
| `dairy` | 0,60 | 1,60 | **Peut descendre sous ta base** → ne tient aucun plancher protéique. |
| `fruit` | 0,50 | 1,60 | |
| `vegetable`, `flavor` | fixe | fixe | Jamais redimensionnés → **toujours `"scalable": false`**. |

**La conséquence est contre-intuitive et c'est le cœur du travail : écris des quantités de base
PETITES.** Une base petite peut monter ; une base grosse ne peut pas descendre.

Vérifié en passant ces deux plats au moteur sur 12 profils réels :

| Recette | Base | Profils servis |
|---|---|---|
| poulet 100 g + riz 90 g + brocoli 120 g + huile 10 g | 554 kcal · 33 g P | **12 / 12** |
| poulet 160 g + riz 40 g + brocoli 120 g + huile 10 g | 613 kcal · 40 g P | 6 / 12 |

Même plat, mêmes ingrédients. Le premier nourrit deux fois plus de monde — **gros gabarits
compris**, parce que le riz monte jusqu'à ×1,8.

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
| Calories | **520 – 580 kcal** |
| Protéines | **30 – 34 g** |
| Glucides | 58 – 70 g |
| Lipides | 14 – 18 g |

- **Base 520–580 kcal, 30 à 34 g de protéines. Ne dépasse jamais 34 g.** Chaque gramme au-dessus est un plancher que sept profils sur douze ne pourront plus redescendre.
- **Féculent généreux : 80 à 100 g pesés SECS.** C'est lui qui portera les gros gabarits — il monte jusqu'à ×1,8 et n'a aucun plafond absolu. Mesuré : un plat à 30 g de protéines et 90 g de riz sert les 12 profils ; le même à 40 g de protéines et 40 g de riz n'en sert que 6.
- Ancre grasse `fat` + `scalable`, **12 à 18 g** de lipides.
- Couples déjà saturés, **interdits** : `tofu_ferme` + `riz_basmati`, `tempeh` + `riz_complet`, `thon_naturel` + `pates_completes`. Pas plus de 2 recettes en `poulet_filet` + `riz_basmati` sur l'ensemble du lot.
- **Légumineuses : version prête à consommer** (`pois_chiches_conserve`, `lentilles_cuites`, `haricots_rouges_conserve`). Le poids écrit est le poids ACHETÉ. Les versions sèches feraient afficher un poids sec en liste de courses, non achetable.
- ⚠️ **Ce lot est le n° 4 sur 4, tous à la même enveloppe.** C'est le risque de doublon le plus élevé de la vague. Les lots 1 à 3 sont déjà écrits et intégrés au catalogue ci-dessous — tu es donc confronté à eux automatiquement.

---

## 4. Les 96 `ref` autorisés

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
| `amandes` | Amandes | g | 631 | 21.4 | 8.8 | 52.5 | — | ≤ 40 | 4 |
| `ananas` | Ananas | g | 52 | 0.2 | 11.7 | 0.5 | — | — | 1 |
| `asperges` | Asperges | g | 25 | 2.5 | 2 | 0.3 | — | — | 5 |
| `avocat` | Avocat | g | 203 | 1.6 | 0 | 20.6 | — | ≤ 100 | 16 |
| `betterave` | Betterave cuite | g | 42 | 1.4 | 7.1 | 0.4 | — | — | 3 |
| `beurre_cacahuete` | Beurre de cacahuète | g | 643 | 22.2 | 17.3 | 51.4 | — | ≤ 40 | 4 |
| `blanc_oeuf` | Blanc d'œuf | g | 48 | 10.9 | 0.7 | 0.2 | — | — | 4 |
| `boeuf_5` | Bœuf haché 5% MG | g | 130 | 21.9 | 0.3 | 4.6 | cru | — | 10 |
| `boeuf_bavette` | Bavette de bœuf | g | 133 | 20.4 | 0 | 5.7 | cru | — | 6 |
| `boisson_soja` | Boisson au soja nature | ml | 42 | 3.2 | 1.9 | 2.1 | — | — | 0 |
| `boulgour` ⛔SG | Boulgour | g | 347 | 11.7 | 65.8 | 1.4 | SEC | — | 12 |
| `brocoli` | Brocoli | g | 32 | 2.9 | 2.1 | 0.4 | — | — | 13 |
| `cabillaud` | Dos de cabillaud | g | 77 | 18.1 | 0 | 0.6 | cru | — | 11 |
| `carotte` | Carotte | g | 30 | 0.8 | 5.2 | 0.5 | — | — | 11 |
| `champignons` | Champignons | g | 21 | 2.1 | 1.8 | 0.4 | — | — | 10 |
| `chapelure` ⛔SG | Chapelure | g | 365 | 9.4 | 74.3 | 1.6 | — | ≤ 40 | 1 |
| `chou_fleur` | Chou-fleur | g | 25 | 1.8 | 2.1 | 0.7 | — | — | 4 |
| `concombre` | Concombre | g | 17 | 0.7 | 2.9 | 0.1 | — | — | 7 |
| `cottage_cheese` | Cottage cheese | g | 98 | 11 | 3 | 4.3 | — | — | 4 |
| `courgette` | Courgette | g | 17 | 1.2 | 1.8 | 0.3 | — | — | 17 |
| `creme_soja` | Crème de soja | ml | 152 | 3.2 | 2 | 14.7 | — | ≤ 80 | 7 |
| `crevettes` | Crevettes cuites | g | 91 | 20.5 | 0.2 | 0.8 | — | — | 7 |
| `dinde_escalope` | Escalope de dinde | g | 108 | 23.7 | 0 | 1.5 | cru | — | 8 |
| `edamame` | Edamame | g | 125 | 11 | 9 | 5 | — | — | 5 |
| `epinards` | Épinards frais | g | 33 | 2.7 | 3.1 | 0.4 | — | — | 22 |
| `falafel` ⛔SG | Falafel prêt à consommer | g | 211 | 7.4 | 17.7 | 10.8 | — | ≤ 200 | 0 |
| `feta` | Feta | g | 273 | 15.4 | 1.2 | 22.6 | — | ≤ 60 | 8 |
| `feves` | Fèves | g | 301 | 26.1 | 33.3 | 1.5 | SEC | — | 1 |
| `fromage_blanc_0` | Fromage blanc 0% | g | 48 | 7.3 | 4.2 | 0.1 | — | — | 2 |
| `graines_courge` | Graines de courge | g | 618 | 29.5 | 5.4 | 49.1 | — | ≤ 30 | 6 |
| `haricots_blancs` | Haricots blancs | g | 307 | 23.4 | 43.9 | 0.8 | SEC | — | 5 |
| `haricots_noirs` | Haricots noirs | g | 341 | 21 | 47 | 1.5 | SEC | — | 5 |
| `haricots_rouges` | Haricots rouges | g | 314 | 22.5 | 46.1 | 1.1 | SEC | — | 9 |
| `haricots_rouges_conserve` | Haricots rouges (conserve, égouttés) | g | 108 | 8.3 | 13 | 1 | — | — | 0 |
| `haricots_verts` | Haricots verts | g | 32 | 1.8 | 4.1 | 0.2 | — | — | 8 |
| `huile_olive` | Huile d'olive | g | 899 | 0.2 | 0 | 99.9 | — | ≤ 25 | 122 |
| `jambon_blanc` | Jambon blanc | g | 117 | 20.5 | 0.8 | 3.5 | — | — | 6 |
| `lait_coco` | Lait de coco | ml | 199 | 1.9 | 4.3 | 19.2 | — | ≤ 120 | 20 |
| `legumes_wok` | Mélange wok (poivron/brocoli/carotte) | g | 30 | 1.5 | 5 | 0.3 | — | — | 12 |
| `lentilles_corail` | Lentilles corail | g | 328 | 27.7 | 44.9 | 0.8 | SEC | — | 5 |
| `lentilles_cuites` | Lentilles cuites (conserve ou sachet) | g | 125 | 10.1 | 16.2 | 0.6 | — | — | 0 |
| `lentilles_vertes` | Lentilles vertes | g | 327 | 25.1 | 44.5 | 1.8 | SEC | — | 4 |
| `levure_maltee` ⛔SG | Levure maltée | g | 350 | 50 | 35 | 5 | — | ≤ 20 | 3 |
| `mais` | Maïs | g | 105 | 2.7 | 18.3 | 1.7 | — | — | 12 |
| `maquereau` | Maquereau | g | 198 | 18.1 | 0.9 | 13.5 | cru | — | 1 |
| `miel` | Miel | g | 331 | 0.7 | 82.1 | 0 | — | — | 1 |
| `millet` | Millet | g | 360 | 11 | 73 | 4 | SEC | — | 5 |
| `mozzarella` | Mozzarella light | g | 227 | 16.5 | 0.7 | 17.7 | — | ≤ 60 | 3 |
| `nouilles_completes` ⛔SG | Nouilles complètes | g | 353 | 11.8 | 67.6 | 2.2 | SEC | — | 2 |
| `nouilles_riz` | Nouilles de riz | g | 365 | 7.4 | 80.5 | 1 | SEC | — | 12 |
| `oeuf_entier` | Œuf entier | g | 140 | 12.8 | 0.1 | 9.8 | — | — | 18 |
| `oignon` | Oignon | g | 39 | 1.1 | 6.2 | 0.6 | — | — | 16 |
| `olives` | Olives | g | 182 | 1.4 | 0.3 | 18 | — | ≤ 40 | 6 |
| `pain_complet` ⛔SG | Pain complet | g | 234 | 8.7 | 41.2 | 1.7 | — | — | 5 |
| `pain_pita_complet` ⛔SG | Pain pita complet | g | 249 | 7.5 | 48.8 | 1.5 | — | — | 2 |
| `pain_sans_gluten` | Pain sans gluten | g | 249 | 4.6 | 37.1 | 6.6 | — | — | 1 |
| `parmesan` | Parmesan | g | 411 | 31.1 | 1.1 | 31 | — | ≤ 40 | 7 |
| `patate_douce` | Patate douce | g | 81 | 1.6 | 17.1 | 0.1 | cru | — | 18 |
| `pates_completes` ⛔SG | Pâtes complètes | g | 353 | 11.8 | 67.6 | 2.2 | SEC | — | 11 |
| `pates_semoule` ⛔SG | Pâtes (semoule) | g | 364 | 12 | 72.7 | 1.6 | SEC | — | 4 |
| `pesto` | Pesto | g | 370 | 3.9 | 6.6 | 35.4 | — | ≤ 30 | 4 |
| `petits_pois` | Petits pois | g | 92 | 4.9 | 13.7 | 0.8 | — | — | 7 |
| `pois_casses` | Pois cassés | g | 347 | 23.8 | 47.5 | 1.2 | SEC | — | 2 |
| `pois_chiches` | Pois chiches | g | 350 | 20.5 | 47.5 | 6 | SEC | — | 17 |
| `pois_chiches_conserve` | Pois chiches (conserve, égouttés) | g | 122 | 6.7 | 15 | 2.7 | — | — | 0 |
| `poivron` | Poivron | g | 23 | 0.8 | 3.5 | 0.3 | — | — | 17 |
| `polenta` | Polenta | g | 350 | 7.9 | 74 | 1.8 | SEC | — | 11 |
| `pomme_de_terre` | Pomme de terre | g | 80 | 2 | 16.2 | 0.1 | cru | — | 15 |
| `poulet_filet` | Filet de poulet | g | 110 | 23.4 | 0 | 1.5 | cru | — | 29 |
| `quinoa` | Quinoa | g | 358 | 13.2 | 58.1 | 6.1 | SEC | — | 16 |
| `ratatouille` | Ratatouille de légumes | g | 35 | 1.2 | 5 | 1 | — | — | 8 |
| `riz_basmati` | Riz basmati | g | 351 | 7.1 | 78.4 | 0.6 | SEC | — | 31 |
| `riz_complet` | Riz complet | g | 350 | 7 | 71.4 | 2.8 | SEC | — | 17 |
| `roquette` | Roquette | g | 28 | 2.6 | 2.1 | 0.7 | — | — | 10 |
| `salade_verte` | Salade verte | g | 14 | 1 | 1.5 | 0.1 | — | — | 11 |
| `sardines` | Sardines (conserve égouttées) | g | 217 | 23.3 | 0.3 | 13.7 | — | — | 4 |
| `sarrasin` | Sarrasin | g | 362 | 13.3 | 67.5 | 3.4 | SEC | — | 8 |
| `sauce_soja` ⛔SG | Sauce soja | ml | 40 | 7.2 | 1.7 | 0.5 | — | — | 12 |
| `saumon` | Pavé de saumon | g | 193 | 20.5 | 0 | 12.4 | cru | — | 12 |
| `saumon_fume` | Saumon fumé | g | 184 | 22.2 | 0.1 | 10.5 | — | — | 2 |
| `seitan` ⛔SG | Seitan | g | 134 | 20.6 | 6.7 | 2.5 | — | — | 4 |
| `semoule_couscous` ⛔SG | Semoule de couscous | g | 350 | 11.8 | 69.8 | 1.3 | SEC | — | 7 |
| `soja_texture` | Protéine de soja texturée (PST) | g | 345 | 52 | 30 | 1 | SEC | ≤ 70 | 31 |
| `tahini` | Purée de sésame (tahini) | g | 631 | 17.7 | 13.8 | 53.4 | — | ≤ 40 | 3 |
| `tempeh` | Tempeh | g | 157 | 16.1 | 7.9 | 4.7 | — | — | 7 |
| `thon_frais` | Thon frais | g | 155 | 24 | 2.7 | 5.4 | cru | — | 3 |
| `thon_naturel` | Thon au naturel (conserve) | g | 143 | 26.8 | 0 | 3.9 | — | — | 10 |
| `tofu_ferme` | Tofu ferme | g | 147 | 13.4 | 2.9 | 8.5 | — | — | 16 |
| `tofu_fume` | Tofu fumé | g | 164 | 14.9 | 2.9 | 9.5 | — | — | 0 |
| `tofu_soyeux` | Tofu soyeux | g | 54 | 4.6 | 1.5 | 2.9 | — | — | 2 |
| `tomate` | Tomate | g | 18 | 0.5 | 3.4 | 0.5 | — | — | 17 |
| `tomate_concassee` | Tomate concassée | g | 23 | 1.2 | 3.6 | 0.5 | — | — | 32 |
| `tortilla_complete` ⛔SG | Tortilla blé complet | g | 320 | 8 | 53 | 7.5 | — | — | 7 |
| `wrap_sans_gluten` | Wrap / tortilla sans gluten | g | 316 | 6.1 | 58 | 5.6 | — | — | 1 |
| `yaourt_grec` | Yaourt grec égoutté (type Fage) | g | 115 | 9 | 4 | 7 | — | — | 4 |
| `yaourt_soja_proteine` | Yaourt de soja protéiné | g | 65 | 9 | 4 | 1.5 | — | — | 1 |

**83 de ces 96 refs sont compatibles sans gluten** (ceux sans ⛔SG).

---

## 5. Format de sortie exact

Un seul objet JSON, une seule clé `recipes`, 20 objets. Pas de `_meta`, pas de
`config`, pas de commentaire dans le JSON.

```json
{ "recipes": [ /* les 20 recettes */ ] }
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
  "wave": "2026-08-01-b1-lot4-repas"
}
```

### Champ par champ

| Champ | Règle |
|---|---|
| `id` | exactement ceux listés au §1, dans l'ordre |
| `name` | français, descriptif, sans marqueur de régime (« vegan », « healthy », « fit ») et sans superlatif. Deux recettes ne peuvent pas partager leurs 3 premiers mots significatifs. |
| `category` | `"repas_complet"` pour les 20 |
| `base_servings` | `1`, sans exception |
| `tags.objectif` | mécanique, depuis les kcal de base — voir §6 |
| `tags.recup_jour_repos` | `true` si les glucides font moins de 45 % des calories, sinon `false`. Rien d'éditorial. |
| `tags.sport` | `["muscu"]` par défaut ; ajoute `"endurance"` si les glucides dépassent 55 % des calories. **`"combats"` est interdit.** |
| `tags.temps_min` | temps TOTAL de cuisine, cuisson comprise. Aucune durée des `instructions` ne peut le dépasser. |
| `ingredients` | **4 à 6 entrées.** Chacune : `ref` (§4), `qty` entier, `macro_role`, `scalable`. |
| `instructions` | **4 à 7 étapes** — voir §6 |
| `why` | une phrase sobre sur l'intérêt nutritionnel. Aucune promesse de santé, aucune revendication de régime. |
| `macros_per_serving` | **calculé**, pas estimé : pour chaque ingrédient `per_100 × qty / 100`, puis somme. Tolérance ±10 %. |
| `wave` | `"2026-08-01-b1-lot4-repas"` pour les 20 — c'est le nom du dossier de drop qui portera cette livraison, la convention du catalogue (`_meta.waves`). Recopie-le tel quel. |

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

Ces contrôles s'appliquent aussi **entre les 20 recettes de ce lot**.

### Couples protéine × féculent déjà saturés en `repas_complet` — INTERDITS

Ces 22 couples portent déjà 2 recettes ou plus. Le seuil est atteint : n'en produis aucune de plus.

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
| poulet_filet × quinoa | 2 | rep40, rep87 |
| cabillaud × quinoa | 2 | rep43, rep92 |
| poulet_filet × polenta | 2 | rep48, rep127 |
| thon_naturel × tortilla_complete | 2 | rep52, rep115 |
| poulet_filet × pates_completes | 2 | rep56, rep61 |
| poulet_filet × nouilles_riz | 2 | rep67, rep165 |
| tofu_ferme × nouilles_riz | 2 | rep68, rep129 |
| haricots_noirs+soja_texture × riz_complet | 2 | rep82, rep106 |
| crevettes × riz_basmati | 2 | rep86, rep154 |
| pois_chiches+soja_texture × semoule_couscous | 2 | rep121, rep126 |
| oeuf_entier × patate_douce | 2 | rep136, rep138 |

### Plafond par ancre sur ce lot

Aucun `ref` protéique ne peut porter plus de **25 % des 20 recettes**, soit
**5 au maximum**. Il te faut au moins
**6 ancres protéiques distinctes** et
**4 ancres grasses distinctes**.

Refs les plus employés dans cette catégorie — à ne PAS renforcer :

- `huile_olive` (fat) — déjà dans 122 recettes
- `riz_basmati` (carb) — déjà dans 31 recettes
- `soja_texture` (protein) — déjà dans 31 recettes
- `poulet_filet` (protein) — déjà dans 29 recettes
- `lait_coco` (fat) — déjà dans 20 recettes
- `oeuf_entier` (protein) — déjà dans 18 recettes
- `patate_douce` (carb) — déjà dans 18 recettes
- `pois_chiches` (protein) — déjà dans 17 recettes
- `riz_complet` (carb) — déjà dans 17 recettes
- `avocat` (fat) — déjà dans 16 recettes
- `quinoa` (carb) — déjà dans 16 recettes
- `tofu_ferme` (protein) — déjà dans 16 recettes
- `pomme_de_terre` (carb) — déjà dans 15 recettes
- `boulgour` (carb) — déjà dans 12 recettes
- `nouilles_riz` (carb) — déjà dans 12 recettes

### Ancres encore OUVERTES — c'est là qu'il faut aller

Dire ce qui est interdit sans dire ce qui reste libre envoie dans un mur. Voici les ancres
protéiques par ordre de **disponibilité** — **toutes prises dans les 96 refs du §4**,
donc toutes réellement employables. « Couples saturés » = combinaisons déjà fermées pour cette
ancre, « places libres » = combinaisons (ancre × féculent autorisé) encore utilisables.

| Ancre protéine | Déjà employée ici | Couples saturés | Places libres |
|---|---|---|---|
| `haricots_rouges_conserve` | — | — | 20 |
| `lentilles_cuites` | — | — | 20 |
| `tofu_fume` | — | — | 20 |
| `feves` | 1 | — | 20 |
| `maquereau` | 1 | — | 20 |
| `yaourt_soja_proteine` | 1 | — | 20 |
| `fromage_blanc_0` | 2 | — | 20 |
| `pois_casses` | 2 | — | 20 |
| `saumon_fume` | 2 | — | 20 |
| `mozzarella` | 3 | — | 20 |
| `thon_frais` | 3 | — | 20 |
| `blanc_oeuf` | 4 | — | 20 |
| `cottage_cheese` | 4 | — | 20 |
| `lentilles_vertes` | 4 | — | 20 |
| `sardines` | 4 | — | 20 |
| `seitan` | 4 | — | 20 |
| `yaourt_grec` | 4 | — | 20 |
| `edamame` | 5 | — | 20 |

**Refs du §4 JAMAIS employés en `repas_complet`** — terrain entièrement vierge, aucun risque de
doublon :

`boisson_soja` · `falafel` · `haricots_rouges_conserve` · `lentilles_cuites` · `pois_chiches_conserve` · `tofu_fume`

### Diversité de format

Au plus **3 recettes** de ce lot peuvent partager le même format de service : wrap/pita/tartine,
bowl, poêlée, salade, porridge/pudding, galette/pancake, soupe.

---

## 8. Annexe — les 190 recettes `repas_complet` déjà au catalogue

**Tu as besoin de cette table pour respecter R1 et R2**, qui portent sur l'ensemble ENTIER des refs
et pas seulement sur le couple protéine × féculent. Vérifie chacune de tes recettes contre elle.

Refs les plus fréquents sur ce créneau (à éviter de renforcer) : `huile_olive` 122 · `tomate_concassee` 32 · `riz_basmati` 31 · `soja_texture` 31 · `poulet_filet` 29 · `epinards` 22 · `lait_coco` 20 · `patate_douce` 18 · `oeuf_entier` 18 · `courgette` 17 · `poivron` 17 · `pois_chiches` 17 · `riz_complet` 17 · `tomate` 17 · `oignon` 16 · `tofu_ferme` 16 · `quinoa` 16 · `avocat` 16 · `pomme_de_terre` 15 · `brocoli` 13 · `saumon` 12 · `legumes_wok` 12 · `sauce_soja` 12 · `boulgour` 12 · `mais` 12 · `nouilles_riz` 12 · `cabillaud` 11 · `pates_completes` 11 · `salade_verte` 11 · `carotte` 11 · `polenta` 11 · `boeuf_5` 10 · `roquette` 10 · `thon_naturel` 10 · `champignons` 10 · `haricots_rouges` 9 · `haricots_verts` 8 · `dinde_escalope` 8 · `ratatouille` 8 · `feta` 8 · `sarrasin` 8 · `tortilla_complete` 7 · `concombre` 7 · `crevettes` 7 · `tempeh` 7 · `parmesan` 7 · `petits_pois` 7 · `semoule_couscous` 7 · `creme_soja` 7 · `boeuf_bavette` 6 · `olives` 6 · `jambon_blanc` 6 · `graines_courge` 6 · `lentilles_corail` 5 · `asperges` 5 · `edamame` 5 · `pain_complet` 5 · `haricots_noirs` 5 · `millet` 5 · `haricots_blancs` 5

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
- [ ] `wave` = `"2026-08-01-b1-lot4-repas"` sur les 20.

Réponds avec **le JSON seul**. Si un ingrédient t'a manqué, ou si une recette t'a semblé
impossible à tenir dans l'enveloppe, dis-le **après** le JSON, en clair.
