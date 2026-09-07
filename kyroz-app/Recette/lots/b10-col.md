# B10 — 10 collations salees du quotidien, dont les premieres carnees

**Lot autonome.** Tout ce qu'il faut est dans ce fichier : le format de sortie, les ingrédients
autorisés avec leurs macros, les règles, et ce qui est déjà pris dans le catalogue. Tu n'as besoin
d'aucun autre document et d'aucun accès au code.

Généré depuis le catalogue live (512 recettes) — les valeurs ci-dessous sont exactes.

---

## 1. La commande

**10 recettes de catégorie `collation` (collation).**

ids à produire, dans cet ordre, sans trou et sans doublon :
`col111`, `col112`, `col113`, `col114`, `col115`, `col116`, `col117`, `col118`, `col119`, `col120`

Répartition par régime, à respecter exactement. **Les trois lignes sont exclusives** : une
recette tombe dans une seule, et c'est l'ingrédient le plus restrictif qui décide.

| | Nombre |
|---|---|
| **Carnées ou marines** — contiennent viande, volaille ou poisson | **4** |
| **Végétariennes** — œufs et/ou laitages, **aucune** chair animale | **6** |
| **Vegan** — aucun produit animal (ni œuf, ni laitage, ni miel) | **0** |
| **dont sans gluten, toutes lignes confondues** | **≥ 2** |

Les seules ancres carnées que le §4 t'autorise sur ce créneau : `dinde_escalope` · `jambon_blanc` · `thon_naturel`. Aucune ne peut porter plus de 2 recettes (§7).

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
| 147 kcal · 9 g P | 5 / 12 |
| 193 kcal · 13 g P | 8 / 12 |
| 239 kcal · 16 g P | 7 / 12 | ← l'enveloppe de CE lot
| 258 kcal · 17 g P | 9 / 12 | ← l'enveloppe de CE lot
| 284 kcal · 19 g P | 8 / 12 | ← l'enveloppe de CE lot
| 330 kcal · 23 g P | 9 / 12 |

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
compte pour toi est **collation**.

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
| Calories | **200 – 300 kcal** |
| Protéines | **14 – 22 g** |
| Glucides | 18 – 34 g |
| Lipides | 7 – 12 g |

> **Densité protéique imposée : 4.7 à 11.0 g de protéines pour 100 kcal.**
> C'est la conséquence arithmétique des fourchettes ci-dessus, et c'est **la contrainte qui
> décide** de la couverture — plus que les calories. Vérifie-la sur chaque recette :
> `protéines × 100 ÷ kcal`.

- 🔴 **AUCUNE des 110 collations du catalogue n est carnée** — mesuré le 2026-09-07, et déjà signalé lors de la vague B2 sans être corrigé. Les deux options carnées de l écran d inscription (`Poulet`, `Bœuf`) trouvent donc **0 collation**, et « Œufs » n en trouve que 3 sur 110.
- **Le format est SALÉ et tenable à la main** : une tartine garnie, un œuf dur avec du pain, du thon sur du pain de seigle, du cottage cheese avec des crudités. C est le format ouvert que la vague B2 avait identifié et pas écrit.
- ⚠️ **N essaie PAS d atteindre 6 g de protéines pour 100 kcal.** C est la règle qui a rendu inutilisables les collations d avant B2 : la collation est servie en dernier, le plancher protéique du jour est déjà couvert. Vise 5 à 7,5 g/100 kcal sans t y contraindre.
- **4 carnées** (`jambon_blanc`, `thon_naturel` — plafond 2 par ancre), **6 végétariennes** (`oeuf_entier`, `cottage_cheese`, `fromage_blanc_0`).

---

## 4. Les 74 `ref` autorisés

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
| `amandes` | Amandes | g | 631 | 21.4 | 8.8 | 52.5 | — | ≤ 40 | 11 |
| `ananas` | Ananas | g | 52 | 0.2 | 11.7 | 0.5 | — | — | 8 |
| `avocat` | Avocat | g | 203 | 1.6 | 0 | 20.6 | — | ≤ 100 | 8 |
| `banane` | Banane | g | 88 | 1.1 | 19.7 | 0.5 | — | — | 16 |
| `beurre_amande` | Beurre d'amande | g | 631 | 21.4 | 8.8 | 52.5 | — | ≤ 40 | 5 |
| `beurre_cacahuete` | Beurre de cacahuète | g | 643 | 22.2 | 17.3 | 51.4 | — | ≤ 40 | 12 |
| `boisson_soja` | Boisson au soja nature | ml | 42 | 3.2 | 1.9 | 2.1 | — | — | 0 |
| `cacao_poudre` | Cacao maigre en poudre | g | 387 | 22.4 | 11.6 | 20.6 | — | — | 3 |
| `carotte` | Carotte | g | 30 | 0.8 | 5.2 | 0.5 | — | — | 5 |
| `champignons` | Champignons | g | 21 | 2.1 | 1.8 | 0.4 | — | — | 2 |
| `chataigne` | Châtaigne | g | 189 | 2 | 36.8 | 1.8 | — | — | 13 |
| `chocolat_noir` | Chocolat noir 70% | g | 591 | 10.4 | 26.9 | 46.3 | — | ≤ 30 | 4 |
| `concombre` | Concombre | g | 17 | 0.7 | 2.9 | 0.1 | — | — | 10 |
| `cottage_cheese` | Cottage cheese | g | 98 | 11 | 3 | 4.3 | — | — | 10 |
| `creme_soja` | Crème de soja | ml | 152 | 3.2 | 2 | 14.7 | — | ≤ 80 | 12 |
| `dattes` | Dattes dénoyautées | g | 287 | 1.8 | 64.7 | 0.2 | — | ≤ 60 | 4 |
| `dinde_escalope` | Escalope de dinde | g | 108 | 23.7 | 0 | 1.5 | cru | — | 3 |
| `edamame` | Edamame | g | 125 | 11 | 9 | 5 | — | — | 8 |
| `epinards` | Épinards frais | g | 33 | 2.7 | 3.1 | 0.4 | — | — | 2 |
| `falafel` ⛔SG | Falafel prêt à consommer | g | 211 | 7.4 | 17.7 | 10.8 | — | ≤ 200 | 1 |
| `flocons_avoine` ⛔SG | Flocons d'avoine | g | 369 | 10.6 | 57.7 | 7.8 | SEC | — | 10 |
| `framboises` | Framboises | g | 48 | 1.2 | 5.8 | 0.8 | — | — | 5 |
| `fromage_blanc_0` | Fromage blanc 0% | g | 48 | 7.3 | 4.2 | 0.1 | — | — | 10 |
| `fruits_rouges` | Fruits rouges (mélange) | g | 50 | 1 | 9 | 0.4 | — | — | 4 |
| `galette_riz` | Galette de riz soufflé | g | 381 | 8.4 | 77.9 | 3 | — | — | 16 |
| `graines_chia` | Graines de chia | g | 454 | 16.5 | 7.7 | 30.7 | — | ≤ 35 | 8 |
| `graines_courge` | Graines de courge | g | 618 | 29.5 | 5.4 | 49.1 | — | ≤ 30 | 15 |
| `haricots_rouges_conserve` | Haricots rouges (conserve, égouttés) | g | 108 | 8.3 | 13 | 1 | — | — | 0 |
| `haricots_verts` | Haricots verts | g | 32 | 1.8 | 4.1 | 0.2 | — | — | 1 |
| `huile_olive` | Huile d'olive | g | 899 | 0.2 | 0 | 99.9 | — | ≤ 25 | 7 |
| `jambon_blanc` | Jambon blanc | g | 117 | 20.5 | 0.8 | 3.5 | — | — | 0 |
| `kiwi` | Kiwi | g | 61 | 0.9 | 11 | 0.6 | — | — | 6 |
| `lait_amande` | Lait d'amande | ml | 36 | 1.1 | 0.7 | 3.2 | — | — | 8 |
| `lait_coco` | Lait de coco | ml | 199 | 1.9 | 4.3 | 19.2 | — | ≤ 120 | 8 |
| `lait_demi_ecreme` | Lait demi-écrémé | ml | 48 | 3.5 | 5 | 1.6 | — | — | 4 |
| `legumes_wok` | Mélange wok (poivron/brocoli/carotte) | g | 30 | 1.5 | 5 | 0.3 | — | — | 1 |
| `lentilles_cuites` | Lentilles cuites (conserve ou sachet) | g | 125 | 10.1 | 16.2 | 0.6 | — | — | 1 |
| `mais` | Maïs | g | 105 | 2.7 | 18.3 | 1.7 | — | — | 11 |
| `mangue` | Mangue | g | 71 | 0.6 | 14.3 | 0.5 | — | — | 3 |
| `miel` | Miel | g | 331 | 0.7 | 82.1 | 0 | — | — | 8 |
| `myrtilles` | Myrtilles | g | 58 | 0.9 | 10.6 | 0.3 | — | — | 6 |
| `noisettes` | Noisettes | g | 632 | 14.4 | 7.2 | 56.9 | — | ≤ 35 | 7 |
| `noix` | Noix | g | 709 | 13.3 | 6.9 | 67.3 | — | ≤ 35 | 6 |
| `nouilles_riz` | Nouilles de riz | g | 365 | 7.4 | 80.5 | 1 | SEC | — | 3 |
| `oeuf_entier` | Œuf entier | g | 140 | 12.8 | 0.1 | 9.8 | — | — | 3 |
| `pain_complet` ⛔SG | Pain complet | g | 234 | 8.7 | 41.2 | 1.7 | — | — | 6 |
| `pain_pita_complet` ⛔SG | Pain pita complet | g | 249 | 7.5 | 48.8 | 1.5 | — | — | 1 |
| `pain_sans_gluten` | Pain sans gluten | g | 249 | 4.6 | 37.1 | 6.6 | — | — | 3 |
| `pain_seigle` ⛔SG | Pain de seigle | g | 260 | 8.3 | 51.5 | 1 | — | — | 6 |
| `pois_chiches_conserve` | Pois chiches (conserve, égouttés) | g | 122 | 6.7 | 15 | 2.7 | — | — | 3 |
| `poivron` | Poivron | g | 23 | 0.8 | 3.5 | 0.3 | — | — | 2 |
| `polenta` | Polenta | g | 350 | 7.9 | 74 | 1.8 | SEC | — | 10 |
| `pomme` | Pomme | g | 54 | 0.2 | 11.6 | 0.2 | — | — | 7 |
| `proteine_vegetale` | Protéine végétale (pois/soja) | g | 383 | 73 | 10 | 7 | — | — | 20 |
| `quinoa` | Quinoa | g | 358 | 13.2 | 58.1 | 6.1 | SEC | — | 1 |
| `raisins` | Raisins | g | 71 | 0.7 | 16.3 | 0.2 | — | — | 4 |
| `roquette` | Roquette | g | 28 | 2.6 | 2.1 | 0.7 | — | — | 6 |
| `salade_verte` | Salade verte | g | 14 | 1 | 1.5 | 0.1 | — | — | 1 |
| `sarrasin` | Sarrasin | g | 362 | 13.3 | 67.5 | 3.4 | SEC | — | 5 |
| `seitan` ⛔SG | Seitan | g | 134 | 20.6 | 6.7 | 2.5 | — | — | 2 |
| `sirop_erable` | Sirop d'érable | g | 269 | 0 | 67.2 | 0.1 | — | — | 1 |
| `skyr` | Skyr nature | g | 63 | 11 | 4 | 0.2 | — | — | 9 |
| `soja_texture` | Protéine de soja texturée (PST) | g | 345 | 52 | 30 | 1 | SEC | ≤ 70 | 6 |
| `tahini` | Purée de sésame (tahini) | g | 631 | 17.7 | 13.8 | 53.4 | — | ≤ 40 | 4 |
| `tempeh` | Tempeh | g | 157 | 16.1 | 7.9 | 4.7 | — | — | 4 |
| `thon_naturel` | Thon au naturel (conserve) | g | 143 | 26.8 | 0 | 3.9 | — | — | 0 |
| `tofu_ferme` | Tofu ferme | g | 147 | 13.4 | 2.9 | 8.5 | — | — | 1 |
| `tofu_fume` | Tofu fumé | g | 164 | 14.9 | 2.9 | 9.5 | — | — | 1 |
| `tofu_soyeux` | Tofu soyeux | g | 54 | 4.6 | 1.5 | 2.9 | — | — | 1 |
| `tomate` | Tomate | g | 18 | 0.5 | 3.4 | 0.5 | — | — | 7 |
| `whey` | Whey (neutre/vanille) | g | 377 | 80 | 7 | 5 | — | ≤ 60 | 8 |
| `wrap_sans_gluten` | Wrap / tortilla sans gluten | g | 316 | 6.1 | 58 | 5.6 | — | — | 2 |
| `yaourt_grec` | Yaourt grec égoutté (type Fage) | g | 115 | 9 | 4 | 7 | — | — | 1 |
| `yaourt_soja_proteine` | Yaourt de soja protéiné | g | 65 | 9 | 4 | 1.5 | — | — | 21 |

**68 de ces 74 refs sont compatibles sans gluten** (ceux sans ⛔SG).

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
  "id": "col45",
  "name": "Pudding chia – banane – amande",
  "category": "collation",
  "tags": {
    "objectif": [
      "maintien",
      "prise_de_masse"
    ],
    "sport": [
      "endurance"
    ],
    "temps_min": 5
  },
  "base_servings": 1,
  "ingredients": [
    {
      "ref": "graines_chia",
      "qty": 18,
      "macro_role": "fat",
      "scalable": true
    },
    {
      "ref": "yaourt_soja_proteine",
      "qty": 150,
      "macro_role": "protein",
      "scalable": true
    },
    {
      "ref": "banane",
      "qty": 100,
      "macro_role": "fruit",
      "scalable": true
    },
    {
      "ref": "lait_amande",
      "qty": 70,
      "macro_role": "fat",
      "scalable": true
    }
  ],
  "instructions": [
    "Verse le yaourt de soja et le lait d'amande dans un bocal, mélange bien au fouet pour qu'il ne reste aucun grumeau.",
    "Ajoute les graines de chia et remue 30 secondes, puis attends 5 minutes et remue une seconde fois : c'est ce deuxième mélange qui empêche les graines de s'agglomérer au fond.",
    "Ferme le bocal et laisse prendre au moins 3 heures au réfrigérateur — la texture doit être celle d'un flan souple.",
    "Au moment de servir, écrase la moitié de la banane à la fourchette et incorpore-la au pudding.",
    "Coupe le reste en rondelles et dispose-les sur le dessus."
  ],
  "why": "Vegan & sans gluten : oméga-3, protéines et glucides doux.",
  "macros_per_serving": {
    "kcal": 292.4,
    "protein": 18.3,
    "carbs": 27.6,
    "fat": 10.5
  },
  "wave": "2026-09-07-b10-registre-francais"
}
```

### Champ par champ

| Champ | Règle |
|---|---|
| `id` | exactement ceux listés au §1, dans l'ordre |
| `name` | français, descriptif, sans marqueur de régime (« vegan », « healthy », « fit ») et sans superlatif. Deux recettes ne peuvent pas partager leurs 3 premiers mots significatifs. |
| `category` | `"collation"` pour les 10 |
| `base_servings` | `1`, sans exception |
| `tags.objectif` | mécanique, depuis les kcal de base — voir §6 |
| `tags.sport` | `["muscu"]` par défaut ; ajoute `"endurance"` si les glucides dépassent 55 % des calories. **`"combats"` est interdit.** ⚠️ Cette règle vaut pour TON lot, mais elle n'a **pas** été appliquée rétroactivement au catalogue : la poser sur les 512 met `muscu` partout, ce qui rend le départage `needMatch` constant donc inerte — mesuré, les quasi-doublons passent de 9,2 à 13,3 %. Cf. fiche D22 d'AGENTS.md. |
| `tags.objectif` | ⚠️ **Purement mécanique, aucune marge d'appréciation** — il se déduit des kcal de base (§6.5) et un test le vérifie sur les 512 (`lib/__tests__/tags.test.ts`). 192 recettes le contredisaient avant le 2026-08-03. |
| `tags.temps_min` | temps TOTAL de cuisine, cuisson comprise. Aucune durée des `instructions` ne peut le dépasser. |
| `ingredients` | **4 à 6 entrées.** Chacune : `ref` (§4), `qty` entier, `macro_role`, `scalable`. |
| `instructions` | **1 à 3 étapes** — voir §6 |
| `why` | une phrase sobre sur l'intérêt nutritionnel. Aucune promesse de santé, aucune revendication de régime. |
| `macros_per_serving` | **calculé**, pas estimé : pour chaque ingrédient `per_100 × qty / 100`, puis somme. Tolérance ±10 %. |
| `wave` | `"2026-09-07-b10-registre-francais"` pour les 10 — c'est le nom du dossier de drop qui portera cette livraison, la convention du catalogue (`_meta.waves`). Recopie-le tel quel. |

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

### 6.2 Instructions — 1 à 3 étapes

Le catalogue actuel est trop laconique (médiane : 2 étapes, une recette dit « Mixe tout. » pour
cinq ingrédients). Mais sur une collation il n'y a **rien à cuisiner**, et exiger 6 étapes ne
produit que du remplissage. Donc : **2 à 3 étapes nettes**, et ce qu'on attend à la place du geste
évident, c'est ce qui **rate** quand on ne le dit pas — l'ordre qui évite que ça détrempe,
l'égouttage qui change la texture, la température de service, la découpe.

> ✅ « Verse le skyr dans un bol. Coupe la banane en rondelles épaisses par-dessus. Concasse
>    grossièrement les amandes et parsème **juste avant de manger** — ajoutées à l'avance, elles
>    ramollissent. »
> ❌ trois étapes creuses pour meubler.

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

**Les légumineuses, en particulier.** Cette règle était déjà écrite ici et **47 recettes la
violaient quand même** — 9 % du catalogue, découvert le 2026-08-03. Elles pesaient des pois chiches
SECS (350 kcal/100 g) en les cuisinant en 18 minutes : impossible sans trempage, donc l'utilisateur
ouvre une conserve (122 kcal/100 g) et mange **130 kcal de moins que ce que la fiche annonce, jusqu'à
209**. Le contrôle qui manquait existe maintenant (`lib/__tests__/legumineuses.test.ts`) — un lot qui
refait la faute ne passe plus.

| Ce que tu écris | Le `ref` à employer |
|---|---|
| une salade, un houmous, un chili, un curry — bref **moins de 40 minutes** | `pois_chiches_conserve`, `haricots_rouges_conserve`, `haricots_blancs_conserve`, `haricots_noirs_conserve`, `lentilles_cuites` |
| un plat **dont la cuisson longue EST le plat** (soupe de pois cassés, dahl de fèves) | le `ref` SEC, avec un `temps_min` qui inclut vraiment la cuisson (45 à 50 min) |

⚠️ **Pois chiches, haricots rouges, blancs et noirs SECS sont interdits**, quel que soit le
`temps_min` : ils exigent un trempage de plusieurs heures, or le §6.6 interdit tout repos de plus de
10 minutes. Seuls les pois cassés, les fèves décortiquées et les lentilles cuisent sans trempage.

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

### Couples protéine × féculent déjà saturés en `collation` — INTERDITS

Ces 23 couples portent déjà 2 recettes ou plus. Le seuil est atteint : n'en produis aucune de plus.

| Protéines × féculents | Déjà | Recettes |
|---|---|---|
| yaourt_soja_proteine × sans féculent | 8 | col26, col39, col43, col45, col47, col51, col53, col54 |
| proteine_vegetale × sans féculent | 5 | col18, col20, col23, col24, col46 |
| whey × sans féculent | 3 | col02, col08, col21 |
| whey × flocons_avoine | 3 | col11, col22, col34 |
| skyr × flocons_avoine | 2 | col01, col13 |
| whey × galette_riz | 2 | col04, col61 |
| proteine_vegetale × flocons_avoine | 2 | col06, col31 |
| dinde_escalope × galette_riz | 2 | col09, col41 |
| fromage_blanc_0 × flocons_avoine | 2 | col15, col42 |
| cottage_cheese × pain_seigle | 2 | col16, col19 |
| fromage_blanc_0 × sans féculent | 2 | col28, col63 |
| proteine_vegetale × sarrasin | 2 | col32, col48 |
| proteine_vegetale × chataigne | 2 | col33, col85 |
| yaourt_soja_proteine × galette_riz | 2 | col35, col49 |
| cottage_cheese × galette_riz | 2 | col36, col57 |
| edamame × sans féculent | 2 | col40, col65 |
| edamame × mais | 2 | col50, col78 |
| proteine_vegetale × galette_riz | 2 | col59, col98 |
| skyr × chataigne | 2 | col60, col71 |
| yaourt_soja_proteine × polenta | 2 | col62, col96 |
| yaourt_soja_proteine × chataigne | 2 | col66, col79 |
| proteine_vegetale × polenta | 2 | col81, col89 |
| soja_texture × chataigne | 2 | col92, col100 |

### Plafond par ancre sur ce lot

Aucun `ref` protéique ne peut porter plus de **25 % des 10 recettes**, soit
**2 au maximum**. Il te faut au moins
**5 ancres protéiques distinctes** et
**3 ancres grasses distinctes**.

Refs les plus employés dans cette catégorie — à ne PAS renforcer :

- `yaourt_soja_proteine` (protein) — déjà dans 21 recettes
- `proteine_vegetale` (protein) — déjà dans 20 recettes
- `galette_riz` (carb) — déjà dans 16 recettes
- `graines_courge` (fat) — déjà dans 15 recettes
- `chataigne` (carb) — déjà dans 13 recettes
- `beurre_cacahuete` (fat) — déjà dans 12 recettes
- `creme_soja` (fat) — déjà dans 12 recettes
- `amandes` (fat) — déjà dans 11 recettes
- `mais` (carb) — déjà dans 11 recettes
- `cottage_cheese` (protein) — déjà dans 10 recettes
- `flocons_avoine` (carb) — déjà dans 10 recettes
- `fromage_blanc_0` (protein) — déjà dans 10 recettes
- `polenta` (carb) — déjà dans 10 recettes
- `skyr` (protein) — déjà dans 9 recettes
- `avocat` (fat) — déjà dans 8 recettes

### Ancres encore OUVERTES — c'est là qu'il faut aller

Dire ce qui est interdit sans dire ce qui reste libre envoie dans un mur. Voici les ancres
protéiques par ordre de **disponibilité** — **toutes prises dans les 74 refs du §4**,
donc toutes réellement employables. « Couples saturés » = combinaisons déjà fermées pour cette
ancre, « places libres » = combinaisons (ancre × féculent autorisé) encore utilisables.

| Ancre protéine | Déjà employée ici | Couples saturés | Places libres |
|---|---|---|---|
| `haricots_rouges_conserve` | — | — | 17 |
| `jambon_blanc` | — | — | 17 |
| `thon_naturel` | — | — | 17 |
| `lentilles_cuites` | 1 | — | 17 |
| `tofu_ferme` | 1 | — | 17 |
| `tofu_fume` | 1 | — | 17 |
| `yaourt_grec` | 1 | — | 17 |
| `seitan` | 2 | — | 17 |
| `oeuf_entier` | 3 | — | 17 |
| `tempeh` | 4 | — | 17 |
| `dinde_escalope` | 3 | 1 | 16 |
| `soja_texture` | 6 | 1 | 16 |
| `edamame` | 8 | 2 | 16 |
| `skyr` | 9 | 2 | 15 |
| `cottage_cheese` | 10 | 2 | 15 |
| `fromage_blanc_0` | 10 | 2 | 15 |
| `whey` | 8 | 3 | 14 |
| `yaourt_soja_proteine` | 21 | 4 | 13 |

**Refs du §4 JAMAIS employés en `collation`** — terrain entièrement vierge, aucun risque de
doublon :

`boisson_soja` · `haricots_rouges_conserve` · `jambon_blanc` · `thon_naturel`

### Diversité de format

Au plus **3 recettes** de ce lot peuvent partager le même format de service : wrap/pita/tartine,
bowl, poêlée, salade, porridge/pudding, galette/pancake, soupe.

---

## 8. Annexe — les 110 recettes `collation` déjà au catalogue

**Tu as besoin de cette table pour respecter R1 et R2**, qui portent sur l'ensemble ENTIER des refs
et pas seulement sur le couple protéine × féculent. Vérifie chacune de tes recettes contre elle.

Refs les plus fréquents sur ce créneau (à éviter de renforcer) : `yaourt_soja_proteine` 21 · `proteine_vegetale` 20 · `banane` 16 · `galette_riz` 16 · `graines_courge` 15 · `chataigne` 13 · `beurre_cacahuete` 12 · `creme_soja` 12 · `amandes` 11 · `mais` 11 · `flocons_avoine` 10 · `cottage_cheese` 10 · `fromage_blanc_0` 10 · `concombre` 10 · `polenta` 10 · `skyr` 9 · `miel` 8 · `whey` 8 · `ananas` 8 · `graines_chia` 8 · `avocat` 8 · `lait_amande` 8 · `lait_coco` 8 · `edamame` 8 · `pomme` 7 · `huile_olive` 7 · `tomate` 7 · `noisettes` 7 · `noix` 6 · `pain_complet` 6 · `myrtilles` 6 · `pain_seigle` 6 · `kiwi` 6 · `roquette` 6 · `soja_texture` 6 · `carotte` 5 · `sarrasin` 5 · `beurre_amande` 5 · `framboises` 5

| id | ensemble de refs |
|---|---|
| col01 | `skyr` · `flocons_avoine` · `amandes` · `miel` |
| col02 | `whey` · `banane` · `lait_demi_ecreme` |
| col03 | `cottage_cheese` · `mais` · `noix` · `ananas` |
| col04 | `whey` · `galette_riz` · `beurre_cacahuete` · `pomme` |
| col05 | `fromage_blanc_0` · `pain_complet` · `beurre_cacahuete` · `banane` |
| col06 | `proteine_vegetale` · `flocons_avoine` · `noix` · `banane` |
| col07 | `yaourt_grec` · `myrtilles` · `graines_chia` · `miel` |
| col08 | `fromage_blanc_0` · `whey` · `cacao_poudre` · `miel` |
| col09 | `galette_riz` · `cottage_cheese` · `dinde_escalope` · `concombre` · `avocat` |
| col10 | `skyr` · `miel` · `graines_courge` · `pomme` |
| col11 | `whey` · `banane` · `miel` · `lait_amande` · `flocons_avoine` |
| col12 | `pois_chiches_conserve` · `huile_olive` · `carotte` · `pain_pita_complet` |
| col13 | `skyr` · `flocons_avoine` · `mangue` · `graines_courge` |
| col14 | `oeuf_entier` · `avocat` · `tomate` |
| col15 | `fromage_blanc_0` · `flocons_avoine` · `noisettes` · `raisins` |
| col16 | `cottage_cheese` · `pain_seigle` · `noisettes` · `ananas` |
| col17 | `skyr` · `polenta` · `noisettes` · `raisins` |
| col18 | `proteine_vegetale` · `kiwi` · `epinards` · `lait_amande` · `banane` |
| col19 | `cottage_cheese` · `pain_seigle` · `concombre` · `huile_olive` |
| col20 | `graines_chia` · `lait_amande` · `fruits_rouges` · `miel` · `proteine_vegetale` |
| col21 | `whey` · `banane` · `lait_demi_ecreme` · `beurre_cacahuete` |
| col22 | `whey` · `flocons_avoine` · `lait_demi_ecreme` · `cacao_poudre` |
| col23 | `proteine_vegetale` · `fruits_rouges` · `lait_amande` · `graines_chia` |
| col24 | `proteine_vegetale` · `mangue` · `lait_amande` · `lait_coco` |
| col25 | `skyr` · `sarrasin` · `graines_chia` · `ananas` |
| col26 | `yaourt_soja_proteine` · `banane` · `lait_amande` · `beurre_cacahuete` |
| col27 | `skyr` · `myrtilles` · `amandes` |
| col28 | `fromage_blanc_0` · `fruits_rouges` · `noix` |
| col29 | `cottage_cheese` · `concombre` · `pain_complet` |
| col30 | `fromage_blanc_0` · `miel` · `noisettes` · `myrtilles` |
| col31 | `dattes` · `beurre_cacahuete` · `flocons_avoine` · `proteine_vegetale` |
| col32 | `proteine_vegetale` · `sarrasin` · `chocolat_noir` · `pomme` |
| col33 | `proteine_vegetale` · `chataigne` · `beurre_amande` · `dattes` |
| col34 | `flocons_avoine` · `whey` · `beurre_cacahuete` · `miel` |
| col35 | `galette_riz` · `beurre_amande` · `banane` · `yaourt_soja_proteine` |
| col36 | `galette_riz` · `cottage_cheese` · `tomate` · `avocat` |
| col37 | `pain_seigle` · `pois_chiches_conserve` · `carotte` · `huile_olive` |
| col38 | `pain_complet` · `avocat` · `oeuf_entier` · `roquette` |
| col39 | `graines_chia` · `yaourt_soja_proteine` · `framboises` |
| col40 | `edamame` · `huile_olive` |
| col41 | `dinde_escalope` · `galette_riz` · `avocat` · `kiwi` |
| col42 | `fromage_blanc_0` · `flocons_avoine` · `amandes` · `framboises` |
| col43 | `banane` · `beurre_cacahuete` · `chocolat_noir` · `yaourt_soja_proteine` |
| col44 | `cottage_cheese` · `ananas` · `graines_courge` |
| col45 | `graines_chia` · `yaourt_soja_proteine` · `banane` · `lait_amande` |
| col46 | `proteine_vegetale` · `banane` · `lait_amande` · `cacao_poudre` · `beurre_cacahuete` |
| col47 | `yaourt_soja_proteine` · `myrtilles` · `amandes` |
| col48 | `dattes` · `beurre_cacahuete` · `sarrasin` · `proteine_vegetale` |
| col49 | `galette_riz` · `beurre_amande` · `chocolat_noir` · `yaourt_soja_proteine` |
| col50 | `edamame` · `mais` · `graines_courge` · `ananas` |
| col51 | `yaourt_soja_proteine` · `ananas` · `graines_chia` |
| col52 | `yaourt_soja_proteine` · `flocons_avoine` · `amandes` · `banane` |
| col53 | `banane` · `beurre_cacahuete` · `graines_courge` · `yaourt_soja_proteine` |
| col54 | `pomme` · `graines_chia` · `noix` · `yaourt_soja_proteine` |
| col55 | `skyr` · `galette_riz` · `graines_courge` · `myrtilles` |
| col56 | `galette_riz` · `chataigne` · `yaourt_soja_proteine` · `noisettes` |
| col57 | `galette_riz` · `cottage_cheese` · `concombre` · `huile_olive` |
| col58 | `cottage_cheese` · `chataigne` · `beurre_amande` · `pomme` |
| col59 | `galette_riz` · `dattes` · `beurre_cacahuete` · `proteine_vegetale` |
| col60 | `skyr` · `chataigne` · `amandes` |
| col61 | `whey` · `banane` · `lait_demi_ecreme` · `galette_riz` |
| col62 | `yaourt_soja_proteine` · `polenta` · `sirop_erable` · `noix` |
| col63 | `fromage_blanc_0` · `mangue` · `graines_courge` |
| col64 | `edamame` · `pain_complet` · `tahini` · `mais` |
| col65 | `edamame` · `concombre` · `tomate` · `huile_olive` |
| col66 | `yaourt_soja_proteine` · `chataigne` · `amandes` · `kiwi` |
| col67 | `dinde_escalope` · `pain_sans_gluten` · `concombre` · `graines_courge` |
| col68 | `proteine_vegetale` · `pain_seigle` · `tahini` · `raisins` |
| col69 | `edamame` · `wrap_sans_gluten` · `roquette` · `graines_courge` |
| col70 | `oeuf_entier` · `pain_seigle` · `tomate` · `amandes` |
| col71 | `skyr` · `chataigne` · `framboises` · `noisettes` |
| col72 | `edamame` · `polenta` · `noix` · `mais` |
| col73 | `cottage_cheese` · `polenta` · `roquette` · `amandes` |
| col74 | `fromage_blanc_0` · `pain_seigle` · `avocat` · `kiwi` |
| col75 | `fromage_blanc_0` · `chataigne` · `kiwi` · `graines_courge` |
| col76 | `falafel` · `fromage_blanc_0` · `mais` · `concombre` · `tahini` |
| col77 | `pois_chiches_conserve` · `sarrasin` · `carotte` · `graines_courge` |
| col78 | `edamame` · `mais` · `roquette` · `avocat` |
| col79 | `yaourt_soja_proteine` · `chataigne` · `framboises` · `chocolat_noir` |
| col80 | `yaourt_soja_proteine` · `sarrasin` · `raisins` · `noisettes` |
| col81 | `proteine_vegetale` · `polenta` · `pomme` · `beurre_amande` |
| col82 | `soja_texture` · `wrap_sans_gluten` · `avocat` |
| col83 | `seitan` · `mais` · `huile_olive` |
| col84 | `yaourt_soja_proteine` · `pain_complet` · `beurre_cacahuete` · `pomme` |
| col85 | `proteine_vegetale` · `chataigne` · `banane` · `graines_courge` |
| col86 | `proteine_vegetale` · `quinoa` · `ananas` · `amandes` |
| col87 | `yaourt_soja_proteine` · `pain_sans_gluten` · `creme_soja` · `framboises` |
| col88 | `yaourt_soja_proteine` · `mais` · `creme_soja` · `poivron` |
| col89 | `proteine_vegetale` · `polenta` · `creme_soja` · `kiwi` |
| col90 | `proteine_vegetale` · `nouilles_riz` · `creme_soja` · `concombre` |
| col91 | `soja_texture` · `galette_riz` · `lait_coco` · `tomate` |
| col92 | `soja_texture` · `chataigne` · `lait_coco` · `champignons` |
| col93 | `tempeh` · `galette_riz` · `lait_coco` · `roquette` |
| col94 | `seitan` · `pain_complet` · `creme_soja` · `concombre` |
| col95 | `yaourt_soja_proteine` · `nouilles_riz` · `amandes` · `tomate` |
| col96 | `yaourt_soja_proteine` · `polenta` · `graines_courge` · `ananas` |
| col97 | `proteine_vegetale` · `pain_sans_gluten` · `lait_coco` · `banane` |
| col98 | `proteine_vegetale` · `galette_riz` · `lait_coco` · `fruits_rouges` |
| col99 | `soja_texture` · `polenta` · `creme_soja` · `poivron` |
| col100 | `soja_texture` · `chataigne` · `creme_soja` · `carotte` |
| col101 | `tempeh` · `mais` · `creme_soja` · `salade_verte` |
| col102 | `tempeh` · `polenta` · `creme_soja` · `epinards` |
| col103 | `tempeh` · `chataigne` · `creme_soja` · `roquette` |
| col104 | `edamame` · `nouilles_riz` · `lait_coco` · `carotte` |
| col105 | `tofu_ferme` · `galette_riz` · `creme_soja` · `tomate` |
| col106 | `tofu_fume` · `polenta` · `graines_courge` · `champignons` |
| col107 | `soja_texture` · `mais` · `lait_coco` · `haricots_verts` |
| col108 | `proteine_vegetale` · `mais` · `tahini` · `legumes_wok` |
| col109 | `tofu_soyeux` · `chataigne` · `creme_soja` · `myrtilles` |
| col110 | `lentilles_cuites` · `galette_riz` · `graines_courge` · `concombre` |

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
- [ ] 1 à 3 étapes, à l'impératif.
- [ ] Aucun couple protéine × féculent de la liste des saturés.
- [ ] Au plus 3 `ref` en commun avec une recette existante, et entre les recettes du lot.
- [ ] Deux recettes du lot ne partagent pas leurs 3 premiers mots significatifs.
- [ ] Répartition par régime du §1 respectée, **les trois lignes étant exclusives**, sans écrire
      le régime dans la recette.
- [ ] `wave` = `"2026-09-07-b10-registre-francais"` sur les 10.

Réponds avec **le JSON seul**. Si un ingrédient t'a manqué, ou si une recette t'a semblé
impossible à tenir dans l'enveloppe, dis-le **après** le JSON, en clair.
