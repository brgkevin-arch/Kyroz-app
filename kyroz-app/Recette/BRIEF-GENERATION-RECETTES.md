# Brief de génération de recettes — Kyroz

Document auto-portant. Le rédacteur n'a pas besoin de connaître Kyroz ni d'accéder au dépôt.
Tout ce qui est nécessaire (schéma, ingrédients autorisés, invariants, volumes) est ici.

Date : 2026-07-29 · Catalogue de référence : 314 recettes · Vague demandée : **113 recettes**.

---

## 1. Contexte

Kyroz est une application mobile de plans repas à macros précises. L'utilisateur renseigne son
gabarit, son sport et son objectif ; l'app calcule une dépense énergétique puis des cibles
quotidiennes (kcal, protéines, glucides, lipides), et compose une semaine de 4 repas par jour.

Le point capital : **l'application ne sert jamais une recette telle qu'elle est écrite**. Un moteur
d'adaptation redimensionne chaque ingrédient marqué `scalable` dans des bornes fixes, repas par
repas, pour tomber sur la cible du créneau. Une recette n'est donc pas un plat, c'est une
**enveloppe** : elle doit couvrir une femme de 55 kg en sèche (repas complet : 421 kcal, 31 g de
protéines) comme un homme de 110 kg en prise de masse (1005 kcal, 46 g). Si son enveloppe est trop
étroite, le moteur la marque « hors cible » et la déclasse — elle existe dans le catalogue sans
jamais être servie.

**C'est aujourd'hui le cas de la grande majorité du catalogue, et l'écart entre les sexes est
brutal.** Mesuré sur les 12 profils de référence du §4.11 : seuls 45 des 170 repas complets et
32 des 78 petits-déjeuners atteignent leur cible sur au moins 8 profils sur 12 — et **aucune des
66 collations**. 24 repas complets et **48 collations sur 66 ne servent aucun profil féminin.**
La cause est mécanique, pas éditoriale : l'ancre protéine ne redescend jamais sous la quantité
écrite (facteur minimum 1,00), donc un catalogue écrit sur un gabarit d'homme pose un plancher
au-dessus de la moitié basse de la population.

Public : adultes pratiquant du sport, **femmes et hommes**, cuisine du quotidien, pas de
gastronomie. Ton produit sobre, jamais moralisateur, aucune promesse de santé. Le temps de
préparation est **affiché** sur chaque fiche mais ne filtre plus rien depuis le 2026-07-29 : écris
des recettes réalistes, sans chercher à tenir sous un seuil.

---

## 2. Format de sortie exact

Une recette = un objet JSON. **Aucun champ en plus, aucun champ en moins.**

```jsonc
{
  "id": "rep171",                   // string, voir plage d'ids ci-dessous
  "name": "...",                    // string, tirets longs " – " comme séparateur
  "category": "repas_complet",      // ENUM STRICT : "petit_dej" | "collation" | "repas_complet"
  "tags": {
    "objectif": ["maintien"],       // ENUM : "perte_de_gras" | "maintien" | "prise_de_masse" (1 à 2 valeurs)
    "recup_jour_repos": false,      // booléen, règle de calcul en §4.8
    "sport": ["muscu"],             // ENUM : "muscu" | "endurance" ("combats" INTERDIT, cf. §4.9)
    "temps_min": 15                 // entier, temps TOTAL de cuisine, cuisson comprise
  },
  "base_servings": 1,               // TOUJOURS 1, sans exception
  "ingredients": [
    { "ref": "poulet_filet", "qty": 140, "macro_role": "protein", "scalable": true }
    // ref : clé de la table §3 UNIQUEMENT ; qty : grammes (ou ml) entiers
    // macro_role ENUM : "protein" | "carb" | "fat" | "dairy" | "vegetable" | "fruit" | "flavor"
  ],
  "instructions": ["...", "..."],   // 4 à 7 étapes pour un plat/petit-déj, 2 à 3 pour une collation — §4.6bis
  "why": "...",                     // 1 phrase sobre, aucune allégation santé, aucun régime revendiqué
  "macros_per_serving": { "kcal": 495, "protein": 40.6, "carbs": 43.6, "fat": 16.1 },
  "wave": "2026-08-01-b1-assemblage"  // nom du DOSSIER de livraison, cf. §7.1
}
```

Champs à **ne pas** produire : `restrictions_ok` (dérivé par le code depuis les `ref`),
`recomp_flag` (champ supprimé le 2026-07-29), `validated_by_dietitian`,
`temps_actif_min`, `repos_prealable_min` (pas encore au schéma).

**`wave` est obligatoire** depuis le 2026-07-29 : c'est la vague de livraison d'origine de la
recette, et sa valeur est **exactement le nom du dossier** dans lequel le lot est livré. Les
314 recettes existantes portent `fondation` (100), `2026-06-19-vegan` (164) et
`2026-07-22-sans-gluten` (50). Sans ce champ, on ne peut pas comparer un lot au précédent : c'est
ce qui a empêché d'expliquer pourquoi `recup_jour_repos` était posé sur 43 % du premier lot et
12 % du second. Un test échoue si une recette n'en porte pas.

### Deux exemples réels, copiés du catalogue live

Ce sont des exemples de **format**, pas de contenu à imiter.

```json
{
  "id": "pd01",
  "name": "Porridge avoine – whey – banane – myrtilles",
  "category": "petit_dej",
  "tags": { "objectif": ["prise_de_masse", "maintien"], "recup_jour_repos": true, "sport": ["muscu", "endurance"], "temps_min": 8 },
  "base_servings": 1,
  "ingredients": [
    { "ref": "whey", "qty": 30, "macro_role": "protein", "scalable": true },
    { "ref": "lait_demi_ecreme", "qty": 250, "macro_role": "dairy", "scalable": true },
    { "ref": "flocons_avoine", "qty": 70, "macro_role": "carb", "scalable": true },
    { "ref": "banane", "qty": 100, "macro_role": "fruit", "scalable": true },
    { "ref": "myrtilles", "qty": 60, "macro_role": "fruit", "scalable": true }
  ],
  "instructions": [
    "Chauffe avoine + lait 4-5 min en remuant.",
    "Hors du feu, incorpore la whey.",
    "Ajoute banane et myrtilles."
  ],
  "why": "Muscu/endurance prise de masse : glucides complexes + protéines complètes, idéal post-training.",
  "macros_per_serving": { "kcal": 610, "protein": 43, "carbs": 83, "fat": 11 }
}
```

```json
{
  "id": "rep113",
  "name": "Wrap poulet – avocat – crudités",
  "category": "repas_complet",
  "tags": { "objectif": ["perte_de_gras", "maintien"], "recup_jour_repos": false, "sport": ["muscu"], "temps_min": 15 },
  "base_servings": 1,
  "ingredients": [
    { "ref": "tortilla_complete", "qty": 80, "macro_role": "carb", "scalable": true },
    { "ref": "poulet_filet", "qty": 140, "macro_role": "protein", "scalable": true },
    { "ref": "avocat", "qty": 50, "macro_role": "fat", "scalable": true },
    { "ref": "salade_verte", "qty": 40, "macro_role": "vegetable", "scalable": false },
    { "ref": "tomate", "qty": 50, "macro_role": "vegetable", "scalable": false }
  ],
  "instructions": [
    "Poêler le poulet émincé.",
    "Garnir la tortilla de poulet, avocat et crudités, rouler."
  ],
  "why": "Muscu nomade : protéiné, bons lipides, à emporter.",
  "macros_per_serving": { "kcal": 495, "protein": 40.6, "carbs": 43.6, "fat": 16.1 }
}
```

Trois défauts à ne pas copier depuis ces exemples : `pd01` porte `recup_jour_repos: true` alors
qu'elle est à 52,8 % de ses kcal en glucides (contre-directionnel, cf. §4.8) ; `rep113` n'a que
deux légumes non scalables et une enveloppe grasse portée par un seul avocat ; et **surtout, leurs
`instructions` sont beaucoup trop courtes** — c'est le défaut principal du catalogue actuel et il
ne doit pas être reproduit (cf. §4.6bis).

Voici `rep113` réécrite au niveau de détail attendu. Mêmes ingrédients, même `temps_min` — seul le
champ `instructions` change :

```json
  "instructions": [
    "Émince le filet de poulet en lanières d'environ 1 cm, sale et poivre.",
    "Fais chauffer une poêle à feu vif sans matière grasse ajoutée, puis saisis les lanières 3 à 4 minutes en les retournant à mi-cuisson : elles doivent être dorées et ne plus être roses au centre. Réserve.",
    "Pendant ce temps, coupe la tomate en rondelles fines et lave la salade.",
    "Écrase l'avocat à la fourchette dans un bol avec une pincée de sel, jusqu'à obtenir une texture grossière.",
    "Passe la tortilla 20 secondes à la poêle chaude pour l'assouplir : elle roulera sans casser.",
    "Étale l'avocat écrasé sur la tortilla en laissant 2 cm de bord libre, répartis le poulet, la salade et la tomate au centre.",
    "Rabats les deux côtés vers l'intérieur, puis roule fermement en partant du bord le plus proche. Coupe en deux en biais."
  ]
```

Chaque étape porte une action, une durée ou un repère visuel, et un geste précis. C'est le standard
attendu pour les 113 recettes.

### Plages d'ids à utiliser

Le catalogue s'arrête à `pd78`, `col66`, `rep170`. La numérotation reprend en continu, sans trou
et sans doublon.

| Bloc | Catégorie | ids à produire | Volume |
|---|---|---|---|
| B1 | repas_complet | `rep171` → `rep250` | 80 |
| B2 | collation | `col67` → `col79` | 13 |
| B3 | petit_dej | `pd79` → `pd98` | 20 |

Format des ids : préfixe + numéro **sans zéro de tête supplémentaire**. La largeur suit le nombre,
elle n'est pas fixe : le catalogue contient déjà `rep01` … `rep99` puis `rep100` … `rep170`.

Aucun bloc de cette vague ne franchit la centaine : `col` s'arrête à `col79`, `pd` à `pd98`.
Seul `rep` est déjà à trois chiffres, et il y reste.

---

## 3. Les 123 `ref` autorisés

**Règle absolue : on n'utilise QUE les clés de ces tables.** Un ingrédient qui n'y figure pas
n'existe pas pour l'application — il ne sera ni compté dans les macros, ni acheté dans la liste de
courses, ni vu par le filtre des régimes. Un « bouillon », une « crème », un « miso », un
« vinaigre balsamique » cités dans les instructions sans `ref` correspondant sont des ingrédients
fantômes : c'est un défaut confirmé sur 8 recettes actuelles, et sur 3 d'entre elles il fait
revendiquer « vegan » ou « sans gluten » à tort.

Tout ingrédient nouveau doit être **proposé à part**, dans le fichier `nouveaux-ingredients.json`
de la livraison (§7), jamais utilisé sans être proposé — chaque nouveau `ref` demande un mappage
manuel sur la base ANSES/Ciqual et une entrée dans la table des régimes.

Colonnes : `kcal / P / C / F` = valeurs **pour 100 g** (ou 100 ml). `basis` = état de pesée :
`dry` = pesé sec (riz, pâtes, légumineuses), `raw` = pesé cru (viandes, poissons, tubercules),
vide = tel qu'acheté. `abs_max_qty` = quantité maximale absolue en grammes, que le moteur ne
dépassera jamais quelle que soit la cible. « usages » = nombre de recettes actuelles qui
l'utilisent, c'est l'indicateur de saturation à surveiller.

#### Viandes & volailles

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `poulet_filet` | Filet de poulet | g | raw | — | 121 | 23 | 0 | 2.5 | 29 | végé, pesco, vegan |
| `dinde_escalope` | Escalope de dinde | g | raw | — | 110 | 24 | 0 | 1.5 | 9 | végé, pesco, vegan |
| `boeuf_5` | Bœuf haché 5% MG | g | raw | — | 137 | 21 | 0 | 5 | 10 | végé, pesco, vegan |
| `boeuf_bavette` | Bavette de bœuf | g | raw | — | 170 | 26 | 0 | 7 | 5 | végé, pesco, vegan |
| `porc_filet` | Filet mignon de porc | g | raw | — | 140 | 21 | 0 | 6 | 0 | végé, pesco, no_pork, vegan, halal |
| `jambon_blanc` | Jambon blanc | g | — | — | 110 | 20 | 1 | 3 | 5 | végé, pesco, no_pork, vegan, halal |

#### Poissons & fruits de mer

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `saumon` | Pavé de saumon | g | raw | — | 208 | 20 | 0 | 13 | 13 | végé, vegan |
| `saumon_fume` | Saumon fumé | g | — | — | 180 | 25 | 0 | 9 | 3 | végé, vegan |
| `cabillaud` | Dos de cabillaud | g | raw | — | 80 | 18 | 0 | 0.7 | 11 | végé, vegan |
| `thon_frais` | Thon frais | g | raw | — | 144 | 23 | 0 | 5 | 1 | végé, vegan |
| `thon_naturel` | Thon au naturel (conserve) | g | — | — | 116 | 26 | 0 | 1 | 8 | végé, vegan |
| `maquereau` | Maquereau | g | raw | — | 205 | 19 | 0 | 14 | 1 | végé, vegan |
| `sardines` | Sardines (conserve égouttées) | g | — | — | 180 | 25 | 0 | 9 | 2 | végé, vegan |
| `crevettes` | Crevettes cuites | g | — | — | 99 | 21 | 0 | 1.5 | 6 | végé, vegan |

#### Œufs

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `oeuf_entier` | Œuf entier | g | — | — | 145 | 12.7 | 0.7 | 9.8 | 35 | vegan |
| `blanc_oeuf` | Blanc d'œuf | g | — | — | 48 | 10.9 | 0.7 | 0.2 | 5 | vegan |

#### Laitiers & poudres protéinées

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `skyr` | Skyr nature | g | — | — | 63 | 11 | 4 | 0.2 | 17 | lactose, vegan |
| `fromage_blanc_0` | Fromage blanc 0% | g | — | — | 47 | 8 | 4 | 0.2 | 9 | lactose, vegan |
| `yaourt_grec` | Yaourt grec égoutté (type Fage) | g | — | — | 115 | 9 | 4 | 7 | 10 | lactose, vegan |
| `cottage_cheese` | Cottage cheese | g | — | — | 98 | 11 | 3 | 4.3 | 14 | lactose, vegan |
| `whey` | Whey (neutre/vanille) | g | — | 60 | 377 | 80 | 7 | 5 | 21 | lactose, vegan |
| `lait_demi_ecreme` | Lait demi-écrémé | ml | — | — | 46 | 3.3 | 4.8 | 1.6 | 15 | lactose, vegan |
| `mozzarella` | Mozzarella light | g | — | 60 | 170 | 20 | 1 | 9 | 2 | lactose, vegan |
| `feta` | Feta | g | — | 60 | 264 | 14 | 1 | 21 | 9 | lactose, vegan |
| `parmesan` | Parmesan | g | — | 40 | 400 | 36 | 0 | 28 | 7 | lactose, vegan |

#### Protéines végétales

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `tofu_ferme` | Tofu ferme | g | — | — | 130 | 16 | 2 | 8 | 19 | — |
| `tofu_soyeux` | Tofu soyeux | g | — | — | 55 | 5 | 2 | 3 | 4 | — |
| `tempeh` | Tempeh | g | — | — | 190 | 19 | 9 | 11 | 7 | — |
| `seitan` | Seitan | g | — | — | 140 | 25 | 4 | 2 | 2 | gluten |
| `soja_texture` | Protéine de soja texturée (PST) | g | dry | 70 | 345 | 52 | 30 | 1 | 30 | — |
| `proteine_vegetale` | Protéine végétale (pois/soja) | g | — | — | 383 | 73 | 10 | 7 | 28 | — |
| `edamame` | Edamame | g | — | — | 125 | 11 | 9 | 5 | 9 | — |
| `lentilles_corail` | Lentilles corail | g | dry | — | 350 | 24 | 50 | 1.5 | 5 | — |
| `lentilles_vertes` | Lentilles vertes | g | dry | — | 327 | 25.1 | 44.5 | 1.8 | 4 | — |
| `pois_chiches` | Pois chiches | g | dry | — | 350 | 20.5 | 47.5 | 6.0 | 24 | — |
| `haricots_rouges` | Haricots rouges | g | dry | — | 314 | 22.5 | 46.1 | 1.1 | 9 | — |
| `haricots_blancs` | Haricots blancs | g | dry | — | 333 | 21 | 46 | 1.5 | 5 | — |
| `haricots_noirs` | Haricots noirs | g | dry | — | 341 | 21 | 47 | 1.5 | 5 | — |
| `feves` | Fèves | g | dry | — | 341 | 26 | 50 | 2 | 1 | — |
| `pois_casses` | Pois cassés | g | dry | — | 341 | 23 | 50 | 1.5 | 2 | — |
| `yaourt_soja` | Yaourt de soja nature | g | — | — | 50 | 4 | 5 | 2 | 0 | — |
| `yaourt_soja_proteine` | Yaourt de soja protéiné | g | — | — | 65 | 9 | 4 | 1.5 | 29 | — |
| `tofu_fume` | Tofu fumé | g | — | — | 164 | 14.9 | 2.9 | 9.5 | 0 | — |
| `falafel` | Falafel prêt à consommer | g | — | 200 | 211 | 7.4 | 17.7 | 10.8 | 0 | gluten |
| `pois_chiches_conserve` | Pois chiches (conserve, égouttés) | g | — | — | 122 | 6.7 | 15 | 2.7 | 0 | — |
| `lentilles_cuites` | Lentilles cuites (conserve ou sachet) | g | — | — | 125 | 10.1 | 16.2 | 0.6 | 0 | — |
| `haricots_rouges_conserve` | Haricots rouges (conserve, égouttés) | g | — | — | 108 | 8.3 | 13 | 1 | 0 | — |

> Les cinq dernières lignes sont **prêtes à consommer** : le poids écrit est le poids acheté et
> servi. À l'inverse des légumineuses `basis: dry` juste au-dessus, dont le poids est le poids
> SEC — inutilisables dans une recette rapide, puisque la liste de courses afficherait le sec.
> C'est la raison d'être de ces refs : toute recette de moins de 15 minutes à base de légumineuse
> **doit** passer par la version conserve.

#### Matières grasses (ancres grasses)

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `beurre_cacahuete` | Beurre de cacahuète | g | — | 40 | 600 | 25 | 12 | 50 | 24 | — |
| `beurre_amande` | Beurre d'amande | g | — | 40 | 630 | 21 | 8 | 55 | 7 | — |
| `amandes` | Amandes | g | — | 40 | 630 | 21 | 7 | 53 | 20 | — |
| `noix` | Noix | g | — | 35 | 690 | 15 | 11 | 65 | 8 | — |
| `noisettes` | Noisettes | g | — | 35 | 660 | 15 | 8 | 61 | 8 | — |
| `graines_chia` | Graines de chia | g | — | 35 | 490 | 17 | 8 | 31 | 22 | — |
| `graines_courge` | Graines de courge | g | — | 30 | 560 | 30 | 11 | 49 | 12 | — |
| `avocat` | Avocat | g | — | 100 | 160 | 2 | 2 | 15 | 20 | — |
| `huile_olive` | Huile d'olive | g | — | 25 | 900 | 0 | 0 | 100 | 137 | — |
| `olives` | Olives | g | — | 40 | 150 | 1 | 1 | 15 | 3 | — |
| `lait_coco` | Lait de coco | ml | — | 120 | 200 | 2 | 3 | 21 | 24 | — |
| `chocolat_noir` | Chocolat noir 70% | g | — | 30 | 550 | 8 | 33 | 40 | 5 | — |
| `pesto` | Pesto | g | — | 30 | 450 | 4 | 6 | 45 | 3 | **lactose, vegan** |
| `creme_soja` | Crème de soja | ml | — | 80 | 180 | 3 | 3 | 17 | 5 | — |
| `tahini` | Purée de sésame (tahini) | g | — | 40 | 631 | 17.7 | 13.8 | 53.4 | 0 | — |

> `tahini` est la seule ancre grasse végétale crédible en dehors du beurre de cacahuète, déjà
> présent dans 24 recettes. **Il introduit le sésame**, allergène majeur qu'aucun champ du schéma
> ne porte aujourd'hui : ne pas en faire l'ancre par défaut, l'employer là où il apporte vraiment
> quelque chose (houmous, sauces, bowls levantins).

#### Féculents

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `flocons_avoine` | Flocons d'avoine | g | dry | — | 370 | 13 | 60 | 7 | 36 | gluten |
| `riz_basmati` | Riz basmati | g | dry | — | 350 | 7.5 | 78 | 0.9 | 34 | — |
| `riz_complet` | Riz complet | g | dry | — | 350 | 7 | 77 | 2.8 | 16 | — |
| `pain_complet` | Pain complet | g | — | — | 250 | 9 | 47 | 1.7 | 16 | gluten |
| `pain_seigle` | Pain de seigle | g | — | — | 230 | 6 | 44 | 1.5 | 4 | gluten |
| `patate_douce` | Patate douce | g | raw | — | 86 | 1.6 | 20 | 0.1 | 18 | — |
| `pomme_de_terre` | Pomme de terre | g | raw | — | 80 | 2 | 17 | 0.1 | 15 | — |
| `pates_completes` | Pâtes complètes | g | dry | — | 350 | 13 | 62 | 2.5 | 11 | gluten |
| `pates_semoule` | Pâtes (semoule) | g | dry | — | 360 | 12 | 72 | 1.5 | 3 | gluten |
| `nouilles_completes` | Nouilles complètes | g | dry | — | 350 | 13 | 65 | 2.5 | 2 | gluten |
| `nouilles_riz` | Nouilles de riz | g | dry | — | 360 | 3 | 84 | 0.5 | 12 | — |
| `boulgour` | Boulgour | g | dry | — | 350 | 12 | 70 | 1.5 | 8 | gluten |
| `quinoa` | Quinoa | g | dry | — | 368 | 14 | 58 | 6 | 20 | — |
| `semoule_couscous` | Semoule de couscous | g | dry | — | 360 | 12 | 72 | 1.5 | 5 | gluten |
| `polenta` | Polenta | g | dry | — | 360 | 8 | 73 | 1.5 | 14 | — |
| `galette_riz` | Galette de riz soufflé | g | — | — | 380 | 8 | 82 | 3 | 10 | — |
| `tortilla_complete` | Tortilla blé complet | g | — | — | 300 | 9 | 49 | 7 | 8 | gluten |
| `pain_pita_complet` | Pain pita complet | g | — | — | 270 | 9 | 50 | 2.5 | 5 | gluten |
| `sarrasin` | Sarrasin | g | dry | — | 350 | 13 | 70 | 3 | 12 | — |
| `millet` | Millet | g | dry | — | 360 | 11 | 73 | 4 | 8 | — |
| `chataigne` | Châtaigne | g | — | — | 180 | 3 | 36 | 2 | 6 | — |
| `chapelure` | Chapelure | g | — | 40 | 365 | 9.4 | 74.3 | 1.6 | 1 | gluten |
| `pain_sans_gluten` | Pain sans gluten | g | — | — | 249 | 4.6 | 37.1 | 6.6 | 0 | — |
| `wrap_sans_gluten` | Wrap / tortilla sans gluten | g | — | — | 316 | 6.1 | 58 | 5.6 | 0 | — |

> Ces deux refs débloquent les sous-lots sans gluten. Avant leur création, **aucun pain sans
> gluten n'existait au catalogue** : c'est la cause directe du pool sans-gluten à 6 repas complets
> sur 170 au réglage 15 minutes, tous les formats rapides passant par du pain, une tortilla ou un
> pita. Dans une recette sans gluten, ils remplacent `pain_complet`, `pain_pita_complet` et
> `tortilla_complete` — jamais l'inverse.

#### Fruits

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `banane` | Banane | g | — | — | 90 | 1.1 | 20 | 0.3 | 33 | — |
| `myrtilles` | Myrtilles | g | — | — | 57 | 0.7 | 12 | 0.3 | 9 | — |
| `framboises` | Framboises | g | — | — | 52 | 1.2 | 5 | 0.6 | 9 | — |
| `fruits_rouges` | Fruits rouges (mélange) | g | — | — | 50 | 1 | 9 | 0.4 | 11 | — |
| `pomme` | Pomme | g | — | — | 54 | 0.3 | 12 | 0.2 | 10 | — |
| `mangue` | Mangue | g | — | — | 60 | 0.8 | 14 | 0.4 | 10 | — |
| `ananas` | Ananas | g | — | — | 50 | 0.5 | 12 | 0.1 | 6 | — |
| `kiwi` | Kiwi | g | — | — | 58 | 1.1 | 11 | 0.5 | 5 | — |
| `raisins` | Raisins | g | — | — | 70 | 0.6 | 16 | 0.2 | 2 | — |
| `dattes` | Dattes dénoyautées | g | — | 60 | 282 | 2 | 68 | 0.4 | 10 | — |

#### Légumes

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `brocoli` | Brocoli | g | — | — | 34 | 2.8 | 4 | 0.4 | 12 | — |
| `epinards` | Épinards frais | g | — | — | 23 | 2.9 | 1.4 | 0.4 | 28 | — |
| `courgette` | Courgette | g | — | — | 17 | 1.2 | 2 | 0.2 | 14 | — |
| `poivron` | Poivron | g | — | — | 26 | 1 | 4.6 | 0.3 | 15 | — |
| `tomate` | Tomate | g | — | — | 18 | 0.9 | 3 | 0.2 | 20 | — |
| `tomate_concassee` | Tomate concassée | g | — | — | 30 | 1.3 | 5 | 0.3 | 29 | — |
| `oignon` | Oignon | g | — | — | 40 | 1.1 | 8 | 0.1 | 13 | — |
| `champignons` | Champignons | g | — | — | 22 | 3 | 1 | 0.3 | 11 | — |
| `haricots_verts` | Haricots verts | g | — | — | 30 | 1.8 | 4 | 0.2 | 7 | — |
| `carotte` | Carotte | g | — | — | 36 | 0.8 | 7 | 0.2 | 12 | — |
| `chou_fleur` | Chou-fleur | g | — | — | 28 | 2 | 3 | 0.4 | 3 | — |
| `asperges` | Asperges | g | — | — | 22 | 2.5 | 2 | 0.2 | 4 | — |
| `salade_verte` | Salade verte | g | — | — | 15 | 1.4 | 1.5 | 0.2 | 11 | — |
| `concombre` | Concombre | g | — | — | 12 | 0.6 | 2 | 0.1 | 13 | — |
| `petits_pois` | Petits pois | g | — | — | 80 | 5 | 11 | 0.5 | 6 | — |
| `legumes_wok` | Mélange wok (poivron/brocoli/carotte) | g | — | — | 30 | 1.5 | 5 | 0.25 | 13 | — |
| `ratatouille` | Ratatouille de légumes | g | — | — | 35 | 1.2 | 5 | 1 | 7 | — |
| `roquette` | Roquette | g | — | — | 25 | 2.6 | 2 | 0.7 | 9 | — |
| `mais` | Maïs | g | — | — | 96 | 3 | 17 | 1.2 | 12 | — |
| `betterave` | Betterave cuite | g | — | — | 43 | 1.6 | 8 | 0.2 | 3 | — |

#### Boissons végétales, condiments, divers

| `ref` | Nom affiché | unit | basis | abs_max_qty | kcal | P | C | F | usages | Régimes interdits |
|---|---|---|---|---|---|---|---|---|---|---|
| `lait_amande` | Lait d'amande | ml | — | — | 24 | 0.5 | 3 | 1.1 | 22 | — |
| `boisson_soja` | Boisson au soja nature | ml | — | — | 42 | 3.2 | 1.9 | 2.1 | 0 | — |
| `miel` | Miel | g | — | — | 320 | 0.3 | 80 | 0 | 13 | vegan |
| `sirop_erable` | Sirop d'érable | g | — | — | 260 | 0 | 67 | 0 | 5 | — |
| `cacao_poudre` | Cacao maigre en poudre | g | — | — | 350 | 20 | 15 | 21 | 13 | — |
| `sauce_soja` | Sauce soja | ml | — | — | 60 | 6 | 6 | 0 | 13 | gluten |
| `levure_maltee` | Levure maltée | g | — | 20 | 350 | 50 | 35 | 5 | 6 | **gluten** |

### 3.1 Refs interdits dans toute la vague

| `ref` | Motif | Conséquence si utilisé |
|---|---|---|
| `porc_filet` | Seul ref à casser `halal` ET `no_pork`, 0 usage actuel | Dégrade 309/314 recettes compatibles halal |
| `jambon_blanc` | Idem (porc) | Idem |

`sauce_soja`, `pesto` et `levure_maltee` restent autorisés, mais **jamais dans un sous-lot qui doit
sortir sans gluten** (`sauce_soja`, `levure_maltee`) **ni sans lactose** (`pesto`). Leurs entrées de
la table des régimes ont été corrigées le 2026-07-29 : elles disent maintenant la vérité, donc une
recette qui les emploie sortira légitimement du pool concerné. `sauce_soja` doit en outre toujours
être **déclaré dans `ingredients[]`** : trois recettes le citaient en instruction sans le déclarer,
ce qui leur faisait revendiquer le sans gluten à tort — c'est corrigé, ne pas reproduire.

`yaourt_grec` est de nouveau utilisable : il pointait sur « Yaourt à la grecque nature » (le DESSERT
français, 3 g de protéines pour 8 g de lipides), il porte maintenant sa valeur assumée de yaourt
ÉGOUTTÉ (9 g de protéines). Le nom affiché le dit — la recette doit faire acheter le bon pot.

`yaourt_soja` (50 kcal, P4) existe mais n'est utilisé nulle part : préférer `yaourt_soja_proteine`
(65 kcal, P9) dès qu'il s'agit d'une ancre protéique.

### 3.2 Les 9 refs créés le 2026-07-29 — déjà en place, à utiliser

Ces neuf refs bloquaient une partie de la vague. **Ils sont créés, mappés sur Ciqual et intégrés à
la table des régimes** : ils figurent dans les tables du §3 et s'emploient comme n'importe quel
autre `ref`. Aucune action n'est requise du rédacteur.

Colonne « Utile à » : les blocs du **découpage courant** (B1 repas complets · B2 collations ·
B3 petits-déjeuners). Les versions antérieures de ce tableau renvoyaient à
un découpage abandonné — s'y fier ferait employer ces refs au mauvais endroit.

| `ref` | Source ANSES retenue | Utile à |
|---|---|---|
| `pois_chiches_conserve` | ciqual-20532 « Pois chiche, appertisé, égoutté » | B1 |
| `lentilles_cuites` | ciqual-20360 « Lentille, bouillie/cuite à l'eau » — Ciqual n'a pas d'entrée appertisée, d'où le nom « cuites » (conserve ou sachet) | B1 |
| `haricots_rouges_conserve` | ciqual-20524 « Haricot rouge, appertisé, égoutté » | B1 |
| `tofu_fume` | ciqual-20912 « Tofu fumé, préemballé » | B1, B3 |
| `falafel` | ciqual-25590 « Falafel ou boulette de pois-chiche et/ou fève, préemballé » — classé **gluten-violant** (liant blé sur la plupart des références industrielles) | B1 |
| `tahini` | ciqual-15203 « Tahin ou purée de sésame » | B1, B2, B3 |
| `boisson_soja` | ciqual-18900 « Boisson au soja, nature, non enrichie » | B3 |
| `pain_sans_gluten` | ciqual-7130 « Pain sans gluten, préemballé » | B1, B2, B3 |
| `wrap_sans_gluten` | valeur manuelle calquée sur ciqual-7813 (tortilla de maïs) — Ciqual n'a aucune entrée « tortilla sans gluten » certifiée | B1 |

Ce qu'ils débloquent, et qu'il faut donc réellement exploiter :

- **Les 8 légumineuses historiques sont toutes `basis: dry`.** Une recette de 10 à 15 minutes à
  base de pois chiches affichait le poids **sec** en liste de courses — non achetable pour un plat
  sans trempage ni cuisson. Toute recette rapide à base de légumineuse passe désormais par
  `pois_chiches_conserve`, `lentilles_cuites` ou `haricots_rouges_conserve`, **jamais** par la
  version sèche.
- **Il n'existait aucun pain sans gluten au catalogue**, alors que tous les formats de type
  sandwich, wrap ou tartine passent par du pain, une tortilla ou un pita. `pain_sans_gluten` et
  `wrap_sans_gluten` ouvrent ces formats au sous-lot sans gluten — ce sont aussi les plus simples
  à tenir dans une enveloppe basse.
- **`lait_amande` plafonne à 0,5 g de protéines/100 ml**, ce qui bridait toute base liquide
  végétale protéinée et expliquait le pool végétal de 3 recettes seulement au petit-déjeuner en
  prise de masse. `boisson_soja` monte à 3,2 g.
- `tahini` est la seule alternative crédible au beurre de cacahuète comme ancre grasse végétale
  (présent dans 24 recettes). Il introduit le **sésame**, allergène qu'aucun champ ne porte
  aujourd'hui : à employer où il apporte quelque chose, pas par défaut.

---

## 4. Règles dures — invariants vérifiables

Chaque règle est testable mécaniquement. Une recette qui en viole une est **réécrite, pas
corrigée après coup** (une correction locale produit presque toujours un clone d'une autre recette).

### 4.1 Structure

| # | Invariant |
|---|---|
| 4.1.1 | `base_servings === 1`, sans exception |
| 4.1.2 | **4 à 6 `ref`** par recette (286 des 314 recettes actuelles sont dans cette plage) |
| 4.1.3 | Tout `ref` existe dans la table §3, ou figure dans `nouveaux-ingredients.json` |
| 4.1.4 | `qty` de base **≤ `abs_max_qty`** quand la colonne est renseignée |
| 4.1.5 | `qty` entier, en grammes (ou ml pour les refs `unit: ml`) |

### 4.2 Ancres — la règle la plus importante du brief

Le moteur multiplie les quantités `scalable` par un facteur borné, **dépendant du `macro_role`** :

| `macro_role` | Facteur min | Facteur max | Commentaire |
|---|---|---|---|
| `protein` | 1,00 | 1,70 | Ne descend jamais sous la quantité écrite : la base est un **plancher** |
| `carb` | 0,50 | 1,80 | Le plus large : c'est lui qui porte le plafond calorique |
| `fat` | 0,50 | 1,50 | Plafonné en plus par `abs_max_qty`, très bas sur les graisses |
| `dairy` | 0,60 | 1,60 | **Peut descendre sous la base** → ne tient pas un plancher protéique |
| `fruit` | 0,50 | 1,60 | |
| `vegetable`, `flavor` | fixe | fixe | Jamais redimensionnés |

Il en découle :

- **Ancre protéine obligatoire** : au moins un ingrédient en `macro_role: "protein"` **et**
  `scalable: true`. Jamais `"dairy"` pour porter la protéine — le rôle `dairy` peut être réduit à
  0,6× et fait perdre le plancher protéique.
- **Ancre grasse obligatoire** : au moins un ingrédient en `macro_role: "fat"` **et**
  `scalable: true`, portant **au moins 12 g de lipides** à la quantité de base. Mesure : 34 des 314
  recettes n'ont aucune ancre grasse, et **aucune** d'entre elles n'est servie proprement sur les
  trois objectifs.
  ⚠️ **Le plancher de 12 g ne s'applique PAS au bloc de collations (B2).** Il y est
  arithmétiquement impossible : 12 g de lipides valent 108 kcal, soit 70 % d'une collation de
  150 kcal. Le plancher y est de **4 à 6 g** (B2-a) et de **8 à 11 g** (B2-b). L'ancre grasse reste
  obligatoire — elle est simplement petite.
  ⚠️ Ne pas sur-corriger pour autant. Sur les 10 752 repas servis aux 12 profils de référence, le
  manque de gras est **le dernier** des motifs de rejet : `fat_below_target` 6,7 % chez les femmes
  et 3,0 % chez les hommes. Ce qui domine, c'est le **manque de glucides** chez les hommes
  (`carbs_below_target` 8,8 %) et le **débordement calorique** chez les femmes
  (`over_target_kcal` **17,0 %**, contre 1,0 % chez les hommes — l'asymétrie est de 17×).
  Autrement dit : écris **plus de glucides et des bases plus petites**, pas plus de gras.
  L'inverse avait été écrit ici : il venait d'un script d'audit qui
  figeait le partage glucides:lipides de la cible à 55/45, alors que le moteur le dérive du profil
  et qu'il vaut 65/35 en sèche, 68/32 au maintien, 69/31 en prise de masse. L'ancre grasse est un
  plancher de faisabilité, pas une cible à viser haut.
- **`macro_role` `flavor` ou `vegetable` ⇒ `scalable: false`**, systématiquement.
- **Le plafond calorique doit venir des glucides**, jamais du gras : les ancres grasses sont
  bloquées bas par `abs_max_qty` (huile d'olive 25 g, beurres et amandes 40 g, graines de chia 35 g,
  graines de courge 30 g, avocat 100 g, lait de coco 120 ml, crème de soja 80 ml), alors qu'aucun
  féculent n'a de plafond absolu.

### 4.3 Poids et cohérence physique

- **Poids SEC** pour féculents et légumineuses (`basis: dry`), **poids CRU** pour viandes,
  poissons et tubercules (`basis: raw`). La quantité écrite est la quantité pesée à l'achat.
- **Jamais de mention « cuit », « égoutté » ou « cuisiné » dans le `name` d'une recette dont un
  ingrédient est `basis: dry`.** C'est un invariant testé par la CI.
- Les instructions doivent être cohérentes avec le `basis` : on n'écrit pas « ajouter les lentilles
  égouttées » si le ref est `lentilles_vertes` (`dry`).

### 4.4 `macros_per_serving`

Calculé, pas estimé : pour chaque ingrédient, `per_100 × qty / 100`, puis somme. Tolérance
**±10 %** sur les quatre valeurs. (Le garde-fou de la CI est à ±30 %, mais il a déjà laissé passer
un ingrédient mal mappé : on serre à 10 % à l'écriture.) Ce champ n'est **pas** la source de vérité
— les macros réellement servies sont recalculées depuis les ingrédients — c'est un repère de
régression.

### 4.5 `temps_min`

- `temps_min` = **temps total de cuisine**, cuisson et four inclus. C'est la lecture appliquée par
  54 des 64 recettes actuelles qui chiffrent une durée.
- **Aucune durée écrite dans `instructions` ne peut dépasser `temps_min`.** Trois recettes se
  contredisent aujourd'hui (« Rôtir 20 min » pour un `temps_min` de 10).
- **Aucun repos, marinade ou réfrigération de plus de 10 minutes.** Onze recettes actuelles
  déclarent 5 à 10 minutes alors qu'elles exigent 3 heures à une nuit au frais. Le schéma n'a
  **pas** de champ pour le repos long, donc pas de recette à repos long dans cette vague : un plan
  affiché le matin doit pouvoir être cuisiné le jour même.
- `temps_min` **ne filtre plus rien** depuis le 2026-07-29 (le curseur a été retiré du produit) : il
  est affiché sur la fiche et la carte du repas, c'est tout. Conséquence pour toi : n'ajuste pas un
  temps pour « passer sous un seuil ». Écris la durée vraie. Le catalogue actuel plafonne à 30
  minutes pour 311 recettes sur 314, précisément parce qu'il a été écrit pour tenir sous le curseur
  — une recette de 35 ou 40 minutes est désormais parfaitement acceptable si elle en vaut la peine.

### 4.6 Instructions fermées sur la liste d'ingrédients

**Une instruction ne peut jamais introduire un ingrédient absent de `ingredients[]`.** Interdits
tant qu'ils n'ont pas de `ref` : bouillon, vin, crème, beurre, miso, sirop, vinaigre, yaourt,
fromage, épices composées, sauces préparées. Les régimes et la liste de courses sont dérivés des
seuls `ref` : un ingrédient cité hors liste est invisible au filtre et fait mentir la recette.
Défauts confirmés : 8 recettes citent un « bouillon » inexistant dont 3 revendiquent le vegan,
3 citent une sauce soja non déclarée dont une revendique le sans gluten.

Le sel, le poivre et les herbes non listés sont tolérés dans les instructions (ils ne sont pas des
`ref` et n'ont aucun impact macro ni régime).

### 4.6bis Niveau de détail des instructions — modulé par créneau

Les recettes du catalogue actuel sont **trop laconiques** : la médiane est à **2 étapes**, et une
recette dit littéralement « Mixe tout. » pour cinq ingrédients. Quelqu'un qui ne cuisine pas ne sait
pas quoi faire avec ça.

Mais l'exigence de détail ne peut pas être la même partout, et la version précédente de cette règle
se trompait en l'imposant uniformément : sur une collation de 150 g de yaourt et cinq amandes, il n'y
a rien à cuisiner, et exiger 4 à 7 étapes ne produit que du remplissage.

**Plats et petits-déjeuners (B1, B3) — 4 à 7 étapes.** Chacune porte une action complète, avec **sa
durée, son feu et son indice de réussite visuel**. C'est là qu'il y a de la cuisson, donc là que
quelqu'un se plante.

> ✅ « Chauffe 1 cuillère d'huile à feu moyen-vif. Saisis le filet 3 à 4 min sans y toucher :
>    il doit se décoller seul et la face dorée être franchement colorée. Retourne, baisse à
>    moyen, 3 min de plus. »
> ❌ « Cuis le poulet. »

**Collations (B2) — 2 à 3 étapes, nettes.** Pas de remplissage, pas de fausse cuisine. Ce qu'on
attend à la place du geste évident, c'est ce qui **rate** quand on ne le dit pas :
- l'ordre qui évite que ça détrempe (les oléagineux et le croustillant en dernier, au moment de
  servir) ;
- l'égouttage ou l'essorage quand il change la texture ;
- la température de service, quand elle compte ;
- la découpe, quand elle change la bouchée.

> ✅ « Verse le skyr dans un bol. Coupe la banane en rondelles épaisses par-dessus. Concasse
>    grossièrement les amandes et parsème **juste avant de manger** — ajoutées à l'avance elles
>    ramollissent. »
> ❌ trois étapes creuses pour meubler.

**Dans tous les cas** : à l'impératif, tutoiement, jamais d'infinitif. Aucune étape n'introduit un
ingrédient absent de `ingredients[]` (§4.6). Aucune durée ne dépasse `temps_min` (§4.5).

### 4.7 `name` et `why`

- Aucune allégation santé, aucune promesse (pas de « brûle-graisses », « détox », « booste »,
  « idéal pour maigrir »).
- Aucune revendication de régime écrite en dur : ne jamais écrire « vegan », « sans gluten »,
  « sans lactose » dans le `why`. Ces étiquettes sont **dérivées automatiquement** des `ref` ;
  quatre recettes revendiquent aujourd'hui le sans gluten à tort.
- `why` = une phrase, sobre, factuelle, orientée usage (« Repas froid à emporter, ancre protéique
  haute »).
- Le `name` doit décrire ce qui est réellement dans `ingredients[]`. Une recette actuelle s'appelle
  « Pudding chia – cacao – beurre cacahuète » sans contenir de beurre de cacahuète.

### 4.8 `tags.recup_jour_repos`

Les jours de repos, le moteur déplace 12 points de la fraction non protéique des glucides vers les
lipides, à calories et protéines constantes. Le tag doit donc marquer les recettes **peu
glucidiques et plus grasses**. Règle de calcul, appliquée sur les macros dérivées :

```
recup_jour_repos = true  SI  (%kcal glucides ≤ 36,6 %)  ET  (%kcal lipides ≥ 31,5 %)
                   false sinon
```

Ce tag est **lu par le moteur** et déplace 30 à 36 % des repas des jours de repos. Un tiers du
catalogue actuel le porte à contre-sens (8 recettes taguées « jour de repos » dépassent 50 % de
kcal glucidiques). Dans le doute, mettre `false`.

### 4.9 `tags.sport`

Dérivé du ratio glucides/protéines des macros calculées :

| Ratio C/P | `sport` |
|---|---|
| < 1,5 | `["muscu"]` |
| 1,5 à 1,8 | `["muscu", "endurance"]` |
| > 1,8 | `["endurance"]` |

**`"combats"` est interdit dans cette vague.** Mesuré : sur les 170 repas complets classés par
densité protéique, le rang médian des recettes « combats » est 85 pour un rang médian attendu au
hasard de 85,5 — le tag ne porte aucun signal nutritionnel et suit en réalité un style de cuisine.

### 4.10 `tags.objectif`

Le tag ne filtre jamais le pool de recettes : il ne sert qu'à un départage et à un badge affiché.
Il encode de fait une **taille de portion**. Le renseigner mécaniquement depuis les kcal de base,
sans se poser de question :

| Catégorie | `perte_de_gras` seul | `perte_de_gras` + `maintien` | `maintien` + `prise_de_masse` |
|---|---|---|---|
| repas_complet | < 560 kcal | 560 – 660 kcal | > 660 kcal |
| petit_dej | < 450 kcal | 450 – 540 kcal | > 540 kcal |
| collation | < 220 kcal | 220 – 280 kcal | > 280 kcal |

La ligne `collation` manquait — elle est calibrée sur les enveloppes de B2 et B3, et non sur la
distribution actuelle du catalogue, qui est trop haute d'un bout à l'autre (médiane 330 kcal pour
une cible de 115 à 404).

Combinaisons interdites : `["perte_de_gras","prise_de_masse"]` et les trois à la fois.

⚠️ **Attends-toi à ce que cette vague tombe massivement sur `perte_de_gras` et
`perte_de_gras`+`maintien`** — l'inverse de la vague précédente. C'est la conséquence directe des
enveloppes basses, et c'est **normal** : le tag lit la **base écrite**, pas la portion servie. Une
recette de B1 à 540 kcal de base sera taguée `perte_de_gras` et servira quand même un homme de
110 kg en prise de masse à 1005 kcal, parce que le moteur monte le féculent. Ne corrige pas le tag
pour « faire joli » sur la répartition : il est mécanique, applique la table et passe à la suite.

### 4.11 Cibles de référence — les 12 profils

**Le catalogue actuel a été écrit pour un homme, et ça se mesure.** Les versions précédentes de
cette section ne donnaient qu'un gabarit masculin de 80 kg. Or l'application sert aussi des femmes,
et l'écart n'est pas un simple facteur d'échelle : la formule de Mifflin-St Jeor retire **161 kcal**
à gabarit strictement égal.

Voici les **12 profils de référence** de la vague. Ce sont les cibles moyennes réellement calculées
par l'application, relevées sur 4 semaines de plans (4 séances de musculation, NEAT bureau).

| Profil | kcal/j | Petit-déj | Repas complet | Collation |
|---|---|---|---|---|
| F 55 kg sèche | 1342 | 332 · 24 P | **421 · 31 P** | **115 · 4 P** |
| F 60 kg maintien | 1728 | 449 · 22 P | 540 · 26 P | 190 · 1 P |
| F 65 kg sèche | 1531 | 390 · 29 P | 477 · 35 P | 162 · 11 P |
| F 65 kg maintien | 1816 | 470 · 24 P | 568 · 28 P | 203 · 1 P |
| F 70 kg masse | 2295 | 597 · 25 P | 720 · 28 P | 240 · 1 P |
| F 80 kg sèche | 1731 | 450 · 34 P | 549 · 41 P | 213 · 15 P |
| H 65 kg sèche | 1779 | 463 · 33 P | 563 · 40 P | 212 · 15 P |
| H 70 kg maintien | 2147 | 558 · 28 P | 677 · 33 P | 227 · 4 P |
| H 80 kg sèche | 2104 | 548 · 39 P | 671 · 48 P | 263 · 18 P |
| H 80 kg maintien | 2328 | 605 · 32 P | 738 · 38 P | 276 · 8 P |
| H 95 kg masse | 2967 | 771 · 36 P | 928 · 41 P | 358 · 5 P |
| H 110 kg masse | 3206 | 834 · 41 P | **1005 · 46 P** | 381 · 5 P |

Ces chiffres sont la sortie de `npx tsx scripts/mesure-couverture.ts`, moyennés sur 4 semaines de
plans. Ils se régénèrent — ne pas les recopier à la main depuis une version antérieure du brief.

Trois lectures à retenir avant d'écrire une seule ligne.

**1. L'amplitude dépasse ce que le moteur sait rattraper.** Un repas complet doit couvrir de 421 à
1010 kcal, soit **2,4×**. Or les facteurs de scaling donnent au mieux 1,7× sur la protéine et 1,8×
sur les glucides. Aucune recette ne peut couvrir la population toute seule *par sa taille* — elle ne
peut y arriver que par sa **composition**, en laissant beaucoup de marge au féculent (cf. §4.2).

**2. La protéine de base est un plancher, donc elle se cale sur le BAS de la colonne, pas sur le
milieu.** Le facteur de l'ancre `protein` est [1,00 ; 1,70] : la quantité écrite ne descend jamais.
Une base à 44 g de protéines sur un repas complet est donc un plancher posé **au-dessus** de la
cible réelle de sept profils sur douze. C'est exactement l'erreur du catalogue actuel, dont la
médiane des repas complets est à 41 g : mesuré, **23 des 170 repas complets sont servables** par
une femme de 55 kg en sèche, contre 1 sur 170 pour un homme de 80 kg au maintien.

**3. La collation n'est pas un shaker de protéines, c'est le RESTE du budget.** Elle est servie en
dernier : les trois repas principaux ont déjà couvert le plancher protéique de la journée, et il ne
reste presque rien. Cible protéique mesurée : **1 à 18 g**, et souvent 1 ou 2. Le catalogue, lui,
propose une médiane à 21,6 g de protéines pour 330 kcal — **3 collations sur 66 sont sous 200 kcal,
et aucune n'est à la fois sous 200 kcal et sous 12 g de protéines**. D'où le résultat le plus dur de
la mesure : pour une femme de 55 kg en sèche, **0 collation sur 66 est servable**.

---

## 5. Les blocs à produire

**113 recettes**, en 3 blocs. Les enveloppes et le découpage viennent d'une mesure refaite le
2026-07-29 sur **12 profils** (6 femmes, 6 hommes), et non plus sur 3 gabarits masculins.

### Ce qui a changé, et pourquoi il faut le savoir avant d'écrire

**1. Le curseur « temps de prépa » n'existe plus.** Il filtrait durement les recettes et vidait le
pool : au réglage par défaut, un végétarien n'avait aucun repas complet compatible. Il a été retiré
du produit. Le temps n'est donc plus un axe de découpage — il reste une information affichée, et
une recette rapide garde sa valeur d'usage, mais elle ne débloque plus rien.

**2. Le catalogue n'est pas « structurellement trop maigre ».** Ce diagnostic venait d'un script
d'audit qui figeait le partage glucides/lipides de la cible à 55/45. Le moteur, lui, le dérive des
cibles du profil : il vaut en réalité **65/35 en sèche, 68/32 au maintien, 69/31 en prise de
masse**. Avec 10 à 14 points de lipides en trop dans la cible de contrôle, toutes les recettes
paraissaient manquer de gras. Sur les repas réellement servis, le flag dominant est
`carbs_below_target` et non `fat_below_target`. **Écris des recettes plus riches en glucides, pas
plus grasses.**

**3. Le comptage « 21 à 30 recettes distinctes par créneau » était FAUX.** Il était *poolé sur trois
gabarits* : il décrivait le catalogue, pas ce qu'une personne voit. Un utilisateur a **un seul**
gabarit. Refait profil par profil, le chiffre réel est **11 à 13 recettes distinctes par créneau sur
4 semaines** — et il plafonne à 13 même après 8 semaines. Ce n'est pas la rotation qui est mauvaise,
c'est le pool servable qui est petit.

Ce troisième point vaut pour **tout le monde, y compris sans aucune restriction alimentaire**. Il
annule la conclusion précédente selon laquelle « le profil sans restriction est bien servi » et
selon laquelle il ne fallait écrire que du vegan sans gluten.

### Le trou réel, mesuré sur ce que le moteur sert

Méthode : `buildLocalPlan` sur les 12 profils du §4.11, puis `adaptRecipe` de **chaque** recette du
catalogue sur la cible moyenne réellement servie à ce profil. Une recette est comptée **servable**
si elle ne lève aucun des drapeaux `over_target_kcal`, `under_target_kcal`, `protein_below_target`.

| Profil | Petit-déj | Repas complet | Collation |
|---|---|---|---|
| F 55 kg sèche | 38 / 78 | **23 / 170** | **0 / 66** |
| F 60 kg maintien | 42 / 78 | 41 / 170 | 2 / 66 |
| F 65 kg sèche | 41 / 78 | 48 / 170 | 1 / 66 |
| F 65 kg maintien | 40 / 78 | 50 / 170 | 2 / 66 |
| H 80 kg maintien | 57 / 78 | 141 / 170 | 15 / 66 |
| H 95 kg masse | 37 / 78 | 105 / 170 | 18 / 66 |
| H 110 kg masse | 35 / 78 | 85 / 170 | 15 / 66 |

Trois trous, par ordre de gravité :

1. **La collation est cassée pour tout le monde.** 0 recette servable sur 66 pour une femme de
   55 kg en sèche, et **15 sur 66 pour l'homme médian** — c'est le créneau le plus mal servi du
   catalogue, tous profils confondus. Cause : les 66 collations sont des collations *protéinées*
   (médiane 21,6 g de protéines, 330 kcal), alors que la cible est le reste du budget de la
   journée (115 à 381 kcal, **1 à 18 g de protéines**).
2. **Les repas complets sont trop gros pour la moitié basse de la population.** 32 sur 170 pour
   une femme de 55 kg en sèche. Cause : la médiane du catalogue est à 41 g de protéines de base, et
   la protéine ne redescend jamais sous la base.
3. **La variété plafonne à 11–13 recettes par créneau pour chacun**, quel que soit le régime.

**Ce que ça coûte, mesuré.** Le débordement ne reste pas théorique : il se voit sur le plan servi.
Une femme de 55 kg en sèche, vegan et sans gluten, reçoit **+128 kcal/jour** au-dessus de sa cible —
**44 % de son déficit effacé**, en silence. Sans restriction elle est à +35 kcal/j (88 % du déficit
préservé). Côté hommes : 96 à 100 % du déficit passe, à tous les gabarits. Le préjudice est donc
**concentré sur les petits gabarits**, pas général — mais il est réel, et invisible pour la personne
qui le subit.

### L'enveloppe se cale par le BAS, et ça se démontre

L'enveloppe n'est pas une moyenne à viser. C'est une **composition** qui doit rester atteignable des
deux côtés. Test conduit en construisant des recettes et en les passant à `adaptRecipe` sur les
12 profils :

| Recette testée | Base | Profils servis |
|---|---|---|
| poulet 100 g + riz 90 g + huile 10 g + brocoli 120 g | 554 kcal · 33 P | **12 / 12** |
| poulet 160 g + riz 40 g + huile 10 g + brocoli 120 g | 613 kcal · 40 P | 6 / 12 |
| skyr 150 g + avoine 55 g + b. cacahuète 14 g + banane 80 g | 458 kcal · 26 P | **12 / 12** |
| skyr 90 g + avoine 55 g + b. cacahuète 14 g + banane 80 g | 351 kcal · 17 P | 6 / 12 |

Le balayage complet de la grille (protéine × féculent) donne toujours le même gradient :
**protéine basse, féculent haut**. Monter la protéine de 100 à 160 g de poulet fait perdre la
moitié de la population ; monter le riz de 40 à 90 g la fait gagner. La raison est mécanique :

- la protéine ne descend jamais (facteur min **1,00**) → une base haute exclut les petites cibles ;
- le féculent monte jusqu'à **1,80×** et n'a aucun plafond absolu → c'est lui qui va chercher les
  grosses cibles.

**La collation est le seul créneau où aucune recette ne couvre tout le monde.** Le meilleur format
testé plafonne à **7/12** : la cible va de 115 à 381 kcal (**3,3×**) quand le scaling ne donne que
1,8×. D'où **deux formats de collations** dans un même bloc, et non par confort de rédaction — et d'où le
seuil R8 abaissé à 3/12 sur ce créneau, avec la vraie garantie portée par l'**union des deux sous-formats de B2**.

Il y a une conséquence contre-intuitive à assumer : **la recette la plus utile de la vague sera
celle qui score le plus mal.** La seule composition capable de nourrir une femme de 55 kg en sèche
(cible 115 kcal) ne sert qu'elle — 1/12. Sans dérogation explicite, la règle d'enveloppe la
rejetterait, et la case resterait à zéro pour toujours. D'où la dérogation « profil affamé » de R8.

Vérifié en construisant les deux familles et en les passant à `adaptRecipe` :

| Famille | Exemple | Base | Sert |
|---|---|---|---|
| petit format | skyr 70 g + banane 80 g + amandes 6 g | 152 kcal · 10 P | 7/12 |
| petit format | skyr 50 g + framboises 70 g + amandes 4 g | 90 kcal · 7 P | 1/12 — mais c'est la **seule** qui serve F 55 sèche |
| format standard | fromage blanc 0 % 200 g + fruits rouges 80 g + noix 12 g | 221 kcal · 17 P | 7/12 |
| format standard | œuf 100 g + avocat 50 g + tomate 80 g | 256 kcal · 14 P | 6/12 |

⚠️ **Ces compositions démontrent que l'enveloppe est atteignable — elles ne sont PAS à recopier.**
Trois des quatre tombent sur un couple protéine × féculent déjà saturé (`skyr × sans féculent` et
`fromage_blanc_0 × sans féculent` portent chacun 2 recettes) et seraient rejetées par R4. **Tous** les
laitages maigres du catalogue sont saturés sur ce créneau — `cottage_cheese` et `yaourt_grec`
compris ; seuls `yaourt_nature` et `petit_suisse` sont libres. Et **aucune des 66 collations n'est
carnée**. Les couples réellement disponibles sont **calculés** dans chaque fichier de
`Recette/lots/`, jamais listés à la main ici : c'est précisément la liste écrite à la main qui avait
produit l'erreur.

**Union des deux familles : 12/12.** C'est le seul assemblage qui y arrive, et il exige des
recettes très petites que le catalogue ne contient pas du tout aujourd'hui.

### Vue d'ensemble

| Bloc | Vol. | ids | Catégorie | Base kcal | Base P | Base C | Base F |
|---|---|---|---|---|---|---|---|
| **B1** | 80 | `rep171`→`rep250` | repas_complet | 520–580 | **30–34** | 58–70 | 14–18 |
| **B2** | 13 | `col67`→`col79` | collation | *deux formats imposés, voir ci-dessous* | | | |
| **B3** | 20 | `pd79`→`pd98` | petit_dej | 430–480 | **24–28** | 52–62 | 12–16 |

B2 porte **deux sous-formats obligatoires**, et ce n'est pas un détail de rédaction : aucune
collation ne peut couvrir les 12 profils, seule l'union des deux y arrive (cf. plus bas).

| Sous-format B2 | Vol. | ids | Base kcal | Base P | Base C | Base F |
|---|---|---|---|---|---|---|
| petit format | 9 | `col67`→`col75` | 120–185 | **8–12** | 14–24 | 4–6 |
| format standard | 4 | `col76`→`col79` | 200–290 | **14–20** | 22–34 | 7–11 |

Les colonnes P/C/F sont des **bases**, pas des cibles servies : le moteur monte et descend depuis
là. Le point de contrôle est le §4.11 — une recette est bonne si elle atteint la cible d'au moins
**8 des 12 profils**.

### Répartition par régime — la vague est d'abord « tout le monde »

C'est l'inflexion majeure par rapport au découpage précédent, qui ne commandait que du vegan sans
gluten. Ce choix était fondé sur un comptage faux (cf. point 3 ci-dessus) : le profil sans
restriction n'est **pas** bien servi, il voit 11 à 13 recettes distinctes par créneau comme les
autres.

| Bloc | Sans restriction | Végétarien | Vegan | dont sans gluten |
|---|---|---|---|---|
| B1 — 80 repas complets | 44 | 18 | 18 | ≥ 36 |
| B2 — 13 collations | 7 | 3 | 3 | ≥ 6 |
| B3 — 20 petits-déjeuners | 11 | 4 | 5 | ≥ 9 |
| **Total** | **62** | **25** | **26** | **≥ 51** |

**« Sans restriction » veut dire : viande, volaille, poisson, œufs, produits laitiers.** Des plats
que n'importe qui reconnaît et cuisine — poulet-riz-légumes, poisson blanc-patate douce, bœuf-pâtes,
omelette. C'est le cœur de la commande, pas son supplément.

Cette orientation est aussi la plus efficace pour boucher le trou mesuré : une protéine animale
maigre (`poulet_filet` 121 kcal/23 P, `dinde_escalope` 110/24, `cabillaud` 80/18, `thon_naturel`
116/26, `crevettes` 99/21) atteint 30 g de protéines pour très peu de calories. C'est exactement ce
que demande une enveloppe basse — et c'est beaucoup plus difficile à obtenir en végétal, où il faut
du volume pour la même protéine.

**Le végétal reste commandé et assumé** : 26 recettes vegan, dont une bonne part sans gluten. Les
régimes sont emboîtés — `vegan ⊂ végétarien ⊂ pescatarien ⊂ no_pork = halal` — donc une recette
vegan remplit 6 des 7 régimes, et vegan + sans gluten les remplit **tous les 7**. Elles restent
le meilleur rendement par recette écrite. Il n'y a simplement plus de raison de leur consacrer
*toute* la vague.

**Pas de bloc halal ni pescatarien** : 309 et 256 recettes sur 314 le sont déjà. Ce serait du
doublon pur. Le sans-gluten reste une **contrainte transverse** (≥ 45 recettes sur 100), jamais un
bloc à part.

---

### B1 — 80 repas complets, enveloppe basse

**`rep171` → `rep250`, catégorie `repas_complet`.** 44 sans restriction · 18 végétariens ·
18 vegan · ≥ 36 sans gluten au total.

Le bloc le plus important de la vague, et de loin le plus gros : il fait 71 % du volume. Il corrige
les deux défauts à la fois — le pool servable (23/170 pour une femme de 55 kg en sèche) et la
variété (11 à 13 recettes distinctes par créneau).

⚠️ **À livrer en 4 sous-lots de 20**, une conversation chacun : `rep171`–`rep190`, `rep191`–`rep210`,
`rep211`–`rep230`, `rep231`–`rep250`. Quatre-vingts recettes d'affilée, c'est précisément la
situation où la table des 123 refs sort de l'attention et où les `ref` inventés commencent. Chaque
sous-lot passe les contrôles du §6 **contre le catalogue ET contre les sous-lots déjà livrés**.

- **Base 520–580 kcal, 30–34 g de protéines.** Ne dépasse pas 34 g : chaque gramme au-dessus est un
  plancher que sept profils sur douze ne peuvent plus descendre.
- **Féculent généreux, 80–100 g pesés secs.** C'est lui qui portera les gros gabarits (×1,8 et
  aucun plafond absolu). Un repas à 30 g de protéines et 90 g de riz couvre les 12 profils ; le
  même à 40 g de protéines et 40 g de riz en couvre 6.
- Ancre protéine `macro_role: 'protein'` + `scalable: true` — **jamais `dairy`** (facteur 0,6 : il
  perd le plancher protéique). Ancre grasse `fat` + `scalable`, 12 à 18 g de lipides.
- **Diversifier les ancres.** Concentration actuelle à ne pas renforcer : huile d'olive 137
  recettes, œuf 35, riz basmati 34, protéine de soja texturée 30, poulet 29. Côté végétal, éviter
  `soja_texture` (30), `yaourt_soja_proteine` (29), `proteine_vegetale` (28), `pois_chiches` (24) ;
  privilégier `tofu_soyeux` (4), `lentilles_vertes` (4), `pois_casses` (2), `feves` (1),
  `haricots_noirs` (5), `haricots_blancs` (5), `lentilles_corail` (5), `tofu_fume` (0),
  `falafel` (0).
- **Légumineuses : version prête à consommer** (`pois_chiches_conserve`, `lentilles_cuites`,
  `haricots_rouges_conserve`) — le poids écrit est le poids acheté. Les versions `basis: dry`
  feraient afficher un poids SEC en liste de courses.
- Couples déjà saturés, interdits : `tofu_ferme` + `riz_basmati`, `tempeh` + `riz_complet`,
  `thon_naturel` + `pates_completes`, `poulet_filet` + `riz_basmati` au-delà de 2 recettes.
- Sous-lot sans gluten : interdits `pates`, `boulgour`, `semoule`, `seitan`, `sauce_soja`,
  `chapelure`, `levure_maltee`, pain et tortilla de blé, `pita`.

---

### B2 — 13 collations, deux formats

**`col67` → `col79`, catégorie `collation`.** 7 sans restriction · 3 végétariennes · 3 vegan ·
≥ 6 sans gluten.

**Le trou le plus grave du catalogue**, et le bloc a été volontairement réduit : 0 recette servable
sur 66 pour une femme de 55 kg en sèche ; 2 sur 66 pour une femme de 65 kg au maintien ; 15 sur 66
pour l'homme médian. Treize recettes n'y suffiront pas — c'est un arbitrage assumé du fondateur, le
volume allant aux repas complets. Raison de plus pour que **chacune des treize porte**.

**Deux formats obligatoires, pas un.** Aucune collation ne couvre les 12 profils (maximum atteint :
7/12), seule l'union des deux formats y arrive.

#### B2-a — petit format · 9 recettes, `col67` → `col75`

- **Base 120–185 kcal, 8 à 12 g de protéines.** Oui, c'est *peu* de protéines, et c'est
  volontaire. La collation est servie en dernier, une fois le plancher protéique de la journée déjà
  couvert par les trois repas : la cible résiduelle mesurée est de **1 à 18 g**. Une collation à
  20 g de protéines ne peut plus redescendre et sort du plan.
- **La règle des 12 g de lipides du §4.2 NE S'APPLIQUE PAS à ce bloc.** Elle est arithmétiquement
  impossible ici : 12 g de lipides font 108 kcal, soit 70 % d'une collation de 150 kcal. Ancre
  grasse **4 à 6 g** de lipides, et c'est tout — une poignée d'amandes, quelques graines, une
  cuillère de purée d'oléagineux.
- **La densité protéique ≥ 6 g/100 kcal est ABANDONNÉE pour ce bloc.** C'est cette règle qui a
  produit les 66 collations invendables. Vise 5 à 7 g/100 kcal, sans t'y contraindre.
- Ancre protéine `protein` + `scalable` quand même obligatoire : sans elle, `adaptRecipe` lève
  `no_protein_anchor` et la recette n'est jamais ajustée. Elle est simplement **petite**.
- **Le volume vient du fruit ou d'un féculent léger**, pas de la protéine.
- **Formats déjà saturés, interdits** : edamame nature (3 recettes au même set d'ingrédients), pois
  chiches rôtis (2), energy balls dattes-avoine-cacahuète (2), barres avoine-protéine (2), pudding
  de chia. Huit collations partagent déjà le triplet (collation, yaourt de soja protéiné, sans
  féculent).
- Formats à viser : fruit + laitage maigre, fruit + oléagineux, tartine simple, compote-fromage
  blanc, crudités + tartinable, petite salade de fruits protéinée.
- **Au moins 2 des 9 doivent servir F 55 sèche** (cible 115 kcal · 4 P), le profil aujourd'hui à
  zéro. Ces recettes-là scoreront 1/12 et c'est normal — elles passent par la dérogation « profil
  affamé » de R8. Ce sont les plus utiles du lot.

#### B2-b — format standard · 4 recettes, `col76` → `col79`

Le pendant haut. Il existe parce que la cible collation va de 115 à 381 kcal — **3,3×** — quand le
scaling n'offre que 1,8×. Aucune recette ne tient les deux bouts.

- **Base 200–290 kcal, 14 à 20 g de protéines.** Sert les cibles moyennes et hautes (213 à
  381 kcal). Vérifié : `fromage_blanc_0` 200 g + fruits rouges 80 g + noix 12 g (221 kcal · 17 P)
  sert 7 profils sur 12, le maximum atteignable sur ce créneau.
- Ancre grasse 8 à 11 g de lipides. La règle des 12 g du §4.2 reste hors sujet ici aussi.
- Mêmes formats saturés interdits qu'en B2-a.
- **Ne pas produire 4 variantes de B2-a en plus gros.** R1, R2 et R4 s'appliquent **entre les deux
  sous-formats** : c'est la même `category`.

---

### B3 — 20 petits-déjeuners

**`pd79` → `pd98`, catégorie `petit_dej`.** 11 sans restriction · 4 végétariens · 5 vegan ·
≥ 9 sans gluten.

Le créneau le moins abîmé (29 à 53 recettes servables sur 78 selon le profil), mais il souffre de
la même pauvreté de variété que les autres, et il se dégrade aux deux bouts : 29/78 pour une femme
de 55 kg en sèche, 35/78 pour un homme de 110 kg en prise de masse.

- **Base 430–480 kcal, 24 à 28 g de protéines.** C'est la bande la mieux couvrante, mesurée : les
  recettes de 420 à 500 kcal servent en moyenne 8 profils sur 12, contre 2,8 pour celles de 250 à
  340 kcal et 4,5 pour celles de 620 à 760. **N'écris pas des petits-déjeuners minuscules** — une
  base trop basse plafonne trop tôt pour les gros gabarits.
- Féculent 50 à 65 g pesés secs, pour la même raison qu'en B1 : c'est la marge de manœuvre du haut.
- Ancre protéine `protein` + `scalable`, jamais `dairy`. Ancre grasse 12 à 16 g.
- **Formats saturés, interdits** : 6 recettes partagent déjà le triplet (petit_dej, whey, flocons
  d'avoine) et 6 autres (petit_dej, yaourt de soja protéiné, sans féculent). Le cliquet
  anti-doublons refusera un porridge ou un pudding de plus. Vise le **salé** (œufs brouillés, tofu
  brouillé, tartine complète, galette), les pancakes, les bowls chauds sans avoine.
- Sous-lot sans gluten : `flocons_avoine` **interdit** — socle de 36 recettes existantes. Autorisés :
  `sarrasin`, `millet`, `quinoa`, `polenta`, `galette_riz`, `chataigne`, `patate_douce`,
  `pain_sans_gluten`. `levure_maltee` est classée gluten-violante : hors de ce sous-lot.
- Aucun repos au froid supérieur à 10 minutes : six recettes déclarent 5 minutes pour 4 heures à
  une nuit de repos (pd02, pd31, pd34, pd47, pd54, pd72). Ne pas reproduire.

---

### Ce qu'on n'écrit PAS

| | Pourquoi |
|---|---|
| Recettes rapides (≤ 10 ou ≤ 15 min) | Le curseur temps a été retiré du produit : le temps ne débloque plus aucun pool. Une recette rapide reste bienvenue, ce n'est plus une commande. |
| Bloc halal, bloc pescatarien | 309 et 256 recettes sur 314 sont déjà compatibles. Ce serait du doublon pur. |
| Repas complets « prise de masse » à 800 kcal et plus | Inutile : une base à 554 kcal bien composée couvre déjà les 12 profils, gros gabarits compris, en montant le féculent. Une base haute, elle, exclut définitivement les petits. |
| Collations protéinées à 20 g et plus | C'est précisément ce qui a rendu 51 des 66 collations existantes invendables à l'homme médian, et 48 sur 66 invendables à TOUTE femme. |
| Recettes à repos long (marinade, nuit au frais) | Le schéma n'a aucun champ pour le porter, et un plan affiché le matin doit être cuisinable le jour même. |

---

## 6. Règle anti-doublons — opérationnelle

Le catalogue actuel contient 8 groupes de doublons stricts, produits par des vagues successives qui
ne se voyaient pas les unes les autres. Les règles suivantes s'appliquent **avant** livraison.

| # | Règle | Seuil | Étalonnage sur les 314 recettes existantes |
|---|---|---|---|
| R1 | **Jaccard sur le set de `ref`** : rejeter toute recette N s'il existe une recette E de même `category` avec `J = ∩/∪ ≥ 0,60` | 0,60 | J ≥ 1,00 → 10 paires · ≥ 0,80 → 29 · ≥ 0,70 → 43 · ≥ 0,60 → 137. Le seuil 0,60 est le premier qui sépare les clones du bruit |
| R2 | **Refs communs en absolu** : ≤ 3 `ref` en commun avec toute recette existante de même catégorie | 3 | Les recettes font 4 à 6 refs → 4 communs = quasi-clone. 78 paires existantes partagent ≥ 4 refs |
| R3 | **Contrôle intra-vague** : appliquer R1 et R2 **aussi entre les 113 nouvelles recettes**, et **entre les sous-lots** — les 80 recettes de B1 seront livrées en 4 fois, et les deux sous-formats de B2 partagent la même `category` | — | C'est l'absence de ce contrôle croisé qui a produit les 8 groupes de doublons actuels |
| R4 | **Triplet structurel** : (category, set des refs `protein`, set des refs `carb`) — 2 recettes maximum par triplet dans le catalogue final | 2 | 223 triplets pour 314 recettes, 54 en collision ; pires cas ×8 et ×6 |
| R5 | **Noms** : aucun nom exact dupliqué ; deux recettes de même catégorie ne peuvent pas partager leurs 3 premiers mots significatifs (articles retirés, accents et ligatures normalisés) | — | pd47 et col45 portent aujourd'hui le même nom |
| R6 | **Plafond par ancre** : dans chaque bloc, aucune ref protéine ne porte plus de 25 % des recettes ; au moins `min(6, volume/2)` refs protéine distinctes et `min(4, volume/3)` refs grasse distinctes. Sur B1 (80 recettes) cela veut dire **6 ancres protéiques minimum et au plus 20 recettes par ancre** — c'est la règle la plus exigeante du bloc | 25 % | Concentration actuelle : huile d'olive 137, œuf 35, riz basmati 34, PST 30, poulet 29 |
| R7 | **Cohérence des tags** : deux recettes de même catégorie au même set de refs doivent porter les mêmes `tags.objectif` | — | rep25 (620 kcal) et rep80 (608 kcal) se contredisent, et c'est la moins calorique qui porte prise_de_masse |
| R8 | **Contrôle d'enveloppe** sur les **12 profils du §4.11** (6 femmes, 6 hommes) : ≥ **8/12** pour un repas complet ou un petit-déjeuner, ≥ **3/12** pour une collation. **Dérogation** : une recette qui sert un profil *affamé* (moins de 3 recettes servables au catalogue — aujourd'hui F 55 sèche, F 60 et F 65 maintien, F 65 sèche sur les collations) passe quel que soit son score. Et surtout : l'**union des deux sous-formats de B2 doit couvrir les 12** | 8/12 · 3/12 · union | La grille des « 9 profils » qui servait ici était l'erreur de fond : elle ne contenait aucune femme. Mesuré sur les 12 : **48 des 66 collations ne servent aucun profil féminin**, et **0 sur 66 n'atteint 8/12** — la meilleure collation possible plafonne à 7/12, d'où le seuil abaissé. Aujourd'hui seuls 32/78 des petits-déj et 45/170 des repas passent la barre : elle est haute, c'est voulu |
| R9 | **Diversité de format** : ≤ 3 recettes par bloc partageant le même format de service (wrap/pita/tartine, bowl, poêlée, salade, porridge/pudding, galette/pancake, soupe) | 3 | 7 des 13 repas complets ≤ 15 min sont un wrap, un pita ou une tartine |

**Ordre d'exécution imposé** : R1 → R7 s'appliquent sur les compositions **avant** le calcul des
macros et avant toute relecture. Une recette rejetée est **réécrite**, jamais corrigée à la marge —
une correction locale déplace le clone au lieu de le supprimer.

**Le contrôle est un script, pas une relecture — et il existe.** Une règle qui n'est pas exécutée
est oubliée à la vague suivante : c'est exactement ce qui s'est passé. R1, R2, R4, R5 et R7 sont
donc implémentées dans `kyroz-app/scripts/check-doublons.ts`.

```bash
npx tsx scripts/check-doublons.ts Recette/drops/2026-XX-XX-bloc/recettes.json
```

Le script confronte le lot au catalogue live **et les recettes du lot entre elles**, sort la liste
des paires en violation (avec le Jaccard, les refs communs et le triplet), et **retourne 1** si le
lot en contient une. Sans argument, il audite le catalogue existant sans échouer.

Un test verrouille l'ensemble (`lib/__tests__/doublons.test.ts`) : les compteurs actuels
— **R1 85, R2 75, R4 16, R5 18, R7 0** — sont des **plafonds**. Ils peuvent descendre après un
nettoyage ; toute vague qui les fait monter casse `npm test`.

**R8 est automatisé lui aussi** — c'est la règle qui a le plus manqué, et la seule qui aurait
attrapé les 49 collations invendables aux femmes :

```bash
npx tsx scripts/mesure-couverture.ts            # état du catalogue, 12 profils × 8 régimes
npx tsx scripts/mesure-couverture.ts --enveloppe Recette/drops/2026-XX-XX-bloc/recettes.json
```

R3, R6 et R9 restent des règles de rédaction : elles supposent de connaître le découpage en blocs
et se vérifient à la relecture du lot, bloc par bloc.

---

## 7. Protocole de livraison

### 7.1 Arborescence

Un dossier daté par bloc, dans `kyroz-app/Recette/drops/`. **Ces fichiers ne sont jamais importés
par le code** : ce sont des archives de matière première, on en extrait, on ne les branche pas.

```
kyroz-app/Recette/drops/
├── 2026-XX-XX-b1-repas-complets-lot1/
│   ├── recettes.json              ← { "recipes": [ ... ] }, 20 objets (rep171–rep190)
│   ├── nouveaux-ingredients.json  ← { "ingredients_reference": { ... } }, refs proposés
│   ├── controle-doublons.md       ← sortie de check-doublons, vide si conforme
│   └── controle-enveloppe.md      ← sortie de mesure-couverture --enveloppe (règle R8)
├── 2026-XX-XX-b1-repas-complets-lot2/         ← 20 objets (rep191–rep210)
├── 2026-XX-XX-b1-repas-complets-lot3/         ← 20 objets (rep211–rep230)
├── 2026-XX-XX-b1-repas-complets-lot4/         ← 20 objets (rep231–rep250)
├── 2026-XX-XX-b2-collations/                  ← 13 objets (col67–col79)
└── 2026-XX-XX-b3-petits-dejeuners/            ← 20 objets (pd79–pd98)
```

`recettes.json` contient uniquement la clé `recipes`, un tableau d'objets au format §2. Pas de
`_meta`, pas de `config`, pas d'`enums` — ils vivent dans le catalogue live.

### 7.2 Checklist de merge dans le catalogue live

Reprise fidèle de `kyroz-app/Recette/README.md`. À exécuter dans cet ordre, bloc par bloc.

| # | Action | Fichier |
|---|---|---|
| 1 | Concaténer les recettes dans `recipes[]`, ids en suite continue | `Recette/recettes-kyroz.json` |
| 2 | Mettre `_meta.count` à jour (314 → 427 après les 3 blocs) | `Recette/recettes-kyroz.json` |
| 3 | Ajouter chaque ingrédient inconnu à `ingredients_reference` (`name`, `unit`, `per_100`, `basis`, `abs_max_qty`) | `Recette/recettes-kyroz.json` |
| 4 | Mapper chaque nouveau ref sur Ciqual, **vérifié à la main** — on ne mappe que si l'entrée ANSES est sans ambiguïté le même aliment, sinon on garde la valeur manuelle, assumée | `lib/recipeFoodMap.ts` |
| 5 | Déclarer chaque nouveau ref dans `VIOLATIONS` s'il interdit un régime (gluten, vegan, porc, lactose). `restrictions_ok` est **dérivé**, jamais écrit dans la recette | `lib/recipeDiet.ts` |
| 6 | Mettre à jour les compteurs `toHaveLength(N)` | `lib/__tests__/recipeMap.test.ts`, `recipes.test.ts`, `recipeData.test.ts` |
| 7 | Incrémenter `ENGINE_VERSION` (+1), sinon les plans en cache ignorent les nouvelles recettes | `lib/planEngine.ts` |
| 8 | `npm test` | — |
| 9 | `npx tsc --noEmit` | — |
| 10 | `npx tsx scripts/gen-validation-recettes.ts` → régénère le dossier diététicienne | `VALIDATION-RECETTES.md` |

Comptes attendus après merge complet : **427 recettes** — 98 petits-déjeuners, 79 collations,
250 repas complets.

### 7.3 Ordre de livraison recommandé

**Six conversations, dans cet ordre :**

| # | Lot | Vol. | ids |
|---|---|---|---|
| 1 | **B2** collations, les deux formats ensemble | 13 | `col67`–`col79` |
| 2 | **B1** repas complets, lot 1 | 20 | `rep171`–`rep190` |
| 3 | **B1** repas complets, lot 2 | 20 | `rep191`–`rep210` |
| 4 | **B1** repas complets, lot 3 | 20 | `rep211`–`rep230` |
| 5 | **B1** repas complets, lot 4 | 20 | `rep231`–`rep250` |
| 6 | **B3** petits-déjeuners | 20 | `pd79`–`pd98` |

B2 passe en premier même s'il est le plus petit : il attaque le seul créneau où le catalogue est à
**zéro** recette servable pour un profil réel, et où même l'homme médian n'en a que 15 sur 66. Ses
deux sous-formats se livrent **dans la même conversation** — l'union des deux est ce qui doit
couvrir les 12 profils, la séparer ferait perdre le contrôle. B3 finit, parce que le petit-déjeuner
est le créneau le moins abîmé.

**Une conversation par lot, 20 recettes maximum, jamais les 113 d'un coup.** Sur une session
longue, la table des 123 refs sort de l'attention du rédacteur et les `ref` inventés commencent. Ne
fournir que le sous-ensemble de refs utile au lot, et prévoir qu'une part du premier jet soit
recalée sur l'enveloppe : **ce qui échoue repart en réécriture, pas en retouche** — une correction
locale déplace le clone au lieu de le supprimer.

⚠️ **Chaque lot de B1 doit être confronté aux lots précédents**, pas seulement au catalogue live.
C'est exactement l'absence de ce contrôle croisé qui a produit les 8 groupes de doublons actuels, et
le risque est maximal ici : 80 repas complets à la même enveloppe, écrits en quatre fois.

**Sur l'orientation « tout le monde ».** La majorité de la vague (62 sur 113) est sans restriction :
viande, volaille, poisson, œufs, produits laitiers. C'est un changement de cap assumé par rapport
aux deux vagues précédentes, entièrement végétales — non pas contre le végétal, mais parce que le
comptage qui justifiait de tout y consacrer était faux (§5). Les 26 recettes vegan restent
commandées : elles remplissent 6 des 7 régimes d'un coup, et 7 sur 7 quand elles sont aussi sans
gluten. Le catalogue ne doit pour autant être perçu ni comme vegan ni comme carné — d'où les
contre-mesures de forme, qui restent obligatoires dans les deux sens : formats familiers (bowls,
wraps, poêlées, salades composées), noms sans marqueur identitaire, `why` sobre sans revendication
de régime écrite en dur.

---

## 8. Journal des décisions

Toutes les décisions ouvertes sont tranchées. Cette section dit **pourquoi la commande a la forme
qu'elle a** — et surtout ce qui a été corrigé en cours de route, pour que l'erreur ne revienne pas.

0. **Le volume passe de 30 à 113 recettes, et la vague cesse d'être uniquement végétale.**
   Tranché le 2026-07-29, sur mesure. Deux erreurs de méthode ont été trouvées dans le découpage
   précédent :
   - Le comptage « 21 à 30 recettes distinctes par créneau » était **poolé sur trois gabarits**.
     Il décrivait le catalogue, pas ce qu'une personne voit. Refait profil par profil, le chiffre
     est **11 à 13**, pour tout le monde, y compris sans restriction. La conclusion « seul
     vegan + sans gluten manque » tombe avec lui.
   - Les 9 profils de contrôle étaient **tous masculins**. Or l'ancre protéine ne descend jamais
     sous sa base (facteur min 1,00), donc un catalogue écrit sur un homme de 80 kg pose un
     plancher au-dessus de la moitié basse de la population. Mesuré : **0 collation sur 66** est
     servable à une femme de 55 kg en sèche, et **48 sur 66 ne servent aucun profil féminin**.

   La règle de méthode qui en découle, et qui vaut au-delà des recettes : **ne jamais mesurer sur
   une réplique des formules du moteur, et ne jamais agréger ce qu'un utilisateur voit
   séparément.** Les deux erreurs sont de cette famille — comme l'était le partage 55/45 figé du
   §4.2. La mesure appelle `buildLocalPlan` et `adaptRecipe`, profil par profil, ou elle ne vaut
   rien.

1. ~~**Ordre correctif du curseur temps / vague.**~~ **Tranché le 2026-07-29 : le curseur est
   supprimé**, pas relevé. Il filtrait durement les recettes et vidait le pool — au réglage par
   défaut, un végétarien n'avait aucun repas complet compatible et recevait de la viande, le test
   du temps vivant dans le même prédicat que celui du régime. Le temps n'est plus un axe de
   découpage. Il sera peut-être réintroduit quand le catalogue sera plus fourni, en préférence
   pondérée, jamais en filtre dur.

2. ~~**Les 9 refs à créer.**~~ **Tranché le 2026-07-29 : ils sont créés** (§3.2), mappés sur
   Ciqual et intégrés à la table des régimes. Les trois légumineuses prêtes à consommer,
   `pain_sans_gluten` et `boisson_soja` sont disponibles ; aucun bloc n'est bloqué.
   Point reporté et non tranché : `tahini` introduit le **sésame**, allergène qu'aucun champ du
   schéma ne porte — l'ajout d'un axe allergène reste un chantier ouvert.

3. ~~**Corriger les tags jour-repos avant la relecture diététicienne.**~~ **Tranché le
   2026-07-29 : non.** Le fondateur a arbitré que le jour de repos est l'affaire du moteur, qui
   module déjà les macros ce jour-là (glucides ↓ / lipides ↑) : le tag ne porte pas de décision
   de contenu. Pour le rédacteur, `recup_jour_repos` se remplit donc par la règle mécanique du
   §4.8 et rien d'autre — ne pas y consacrer de réflexion éditoriale.

4. ~~**Champ `wave` / `batch`.**~~ **Tranché le 2026-07-29 : ajouté.** Le champ `wave` est
   obligatoire au format de sortie (§2) et les 314 recettes existantes ont été rétro-remplies
   depuis les dossiers de `Recette/drops/` — `fondation` 100, `2026-06-19-vegan` 164,
   `2026-07-22-sans-gluten` 50. Un test vérifie que chaque recette en porte un.
