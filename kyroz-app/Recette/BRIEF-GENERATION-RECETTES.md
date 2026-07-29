# Brief de génération de recettes — Kyroz

Document auto-portant. Le rédacteur n'a pas besoin de connaître Kyroz ni d'accéder au dépôt.
Tout ce qui est nécessaire (schéma, ingrédients autorisés, invariants, volumes) est ici.

Date : 2026-07-29 · Catalogue de référence : 314 recettes · Vague demandée : **80 recettes**.

---

## 1. Contexte

Kyroz est une application mobile de plans repas à macros précises. L'utilisateur renseigne son
gabarit, son sport et son objectif ; l'app calcule une dépense énergétique puis des cibles
quotidiennes (kcal, protéines, glucides, lipides), et compose une semaine de 4 repas par jour.

Le point capital : **l'application ne sert jamais une recette telle qu'elle est écrite**. Un moteur
d'adaptation redimensionne chaque ingrédient marqué `scalable` dans des bornes fixes, repas par
repas, pour tomber sur la cible du créneau. Une recette n'est donc pas un plat, c'est une
**enveloppe** : elle doit pouvoir couvrir un gabarit de 65 kg en sèche comme un 100 kg en prise de
masse. Si son enveloppe est trop étroite, le moteur la marque « hors cible » et la déclasse — elle
existe dans le catalogue sans jamais être servie. C'est aujourd'hui le cas de 46 % du catalogue.

Public : hommes 18–35 pratiquant du sport, cuisine du quotidien, pas de gastronomie. Ton produit
sobre, jamais moralisateur, aucune promesse de santé. Contrainte forte : le temps de préparation
est un filtre dur, et l'utilisateur peut le régler à 10, 15, 20 ou 30 minutes.

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
  "instructions": ["...", "..."],   // 4 à 7 étapes DÉTAILLÉES et exécutables — cf. §4.6bis
  "why": "...",                     // 1 phrase sobre, aucune allégation santé, aucun régime revendiqué
  "macros_per_serving": { "kcal": 495, "protein": 40.6, "carbs": 43.6, "fat": 16.1 }
}
```

Champs à **ne pas** produire : `restrictions_ok` (dérivé par le code depuis les `ref`),
`recomp_flag` (champ supprimé le 2026-07-29), `validated_by_dietitian`,
`temps_actif_min`, `repos_prealable_min` (pas encore au schéma).

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
attendu pour les 80 recettes.

### Plages d'ids à utiliser

Le catalogue s'arrête à `pd78`, `col66`, `rep170`. La numérotation reprend en continu, sans trou
et sans doublon.

| Bloc | Catégorie | ids à produire | Volume |
|---|---|---|---|
| B1 | repas_complet | `rep171` → `rep184` | 14 |
| B2 | repas_complet | `rep185` → `rep202` | 18 |
| B3 | repas_complet | `rep203` → `rep214` | 12 |
| B4 | repas_complet | `rep215` → `rep228` | 14 |
| B5 | repas_complet | `rep229` → `rep240` | 12 |
| B6 | petit_dej | `pd79` → `pd88` | 10 |
| B7 | collation | aucun | 0 |

Format des ids : `pd` + 2 chiffres, `col` + 2 chiffres, `rep` + 3 chiffres. Pas de zéro de tête
supplémentaire (`rep171`, pas `rep0171`).

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
| `yaourt_grec` | Yaourt grec | g | — | — | 115 | 9 | 4 | 7 | 10 | lactose, vegan |
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
| `yaourt_grec` | Mal mappé : la base ANSES retenue donne 3 g de protéines/100 g contre 9 déclarés | Macros servies fausses de −50 % en protéines |

`sauce_soja`, `pesto` et `levure_maltee` restent autorisés, mais **jamais dans un sous-lot qui doit
sortir sans gluten** (`sauce_soja`, `levure_maltee`) **ni sans lactose** (`pesto`). Leurs entrées de
la table des régimes ont été corrigées le 2026-07-29 : elles disent maintenant la vérité, donc une
recette qui les emploie sortira légitimement du pool concerné. `sauce_soja` doit en outre toujours
être **déclaré dans `ingredients[]`** : trois recettes le citaient en instruction sans le déclarer,
ce qui leur faisait revendiquer le sans gluten à tort — c'est corrigé, ne pas reproduire.

`yaourt_soja` (50 kcal, P4) existe mais n'est utilisé nulle part : préférer `yaourt_soja_proteine`
(65 kcal, P9) dès qu'il s'agit d'une ancre protéique.

### 3.2 Les 9 refs créés le 2026-07-29 — déjà en place, à utiliser

Ces neuf refs bloquaient une partie de la vague. **Ils sont créés, mappés sur Ciqual et intégrés à
la table des régimes** : ils figurent dans les tables du §3 et s'emploient comme n'importe quel
autre `ref`. Aucune action n'est requise du rédacteur.

| `ref` | Source ANSES retenue | Débloque |
|---|---|---|
| `pois_chiches_conserve` | ciqual-20532 « Pois chiche, appertisé, égoutté » | B1, B2 |
| `lentilles_cuites` | ciqual-20360 « Lentille, bouillie/cuite à l'eau » — Ciqual n'a pas d'entrée appertisée, d'où le nom « cuites » (conserve ou sachet) | B1, B2 |
| `haricots_rouges_conserve` | ciqual-20524 « Haricot rouge, appertisé, égoutté » | B1, B2 |
| `tofu_fume` | ciqual-20912 « Tofu fumé, préemballé » | B1, B2 |
| `falafel` | ciqual-25590 « Falafel ou boulette de pois-chiche et/ou fève, préemballé » — classé **gluten-violant** (liant blé sur la plupart des références industrielles) | B1 |
| `tahini` | ciqual-15203 « Tahin ou purée de sésame » | B2, B4, B5 |
| `boisson_soja` | ciqual-18900 « Boisson au soja, nature, non enrichie » | B6 |
| `pain_sans_gluten` | ciqual-7130 « Pain sans gluten, préemballé » | B2, B3, B4 |
| `wrap_sans_gluten` | valeur manuelle calquée sur ciqual-7813 (tortilla de maïs) — Ciqual n'a aucune entrée « tortilla sans gluten » certifiée | B2, B3, B4 |

Ce qu'ils débloquent, et qu'il faut donc réellement exploiter :

- **Les 8 légumineuses historiques sont toutes `basis: dry`.** Une recette de 10 à 15 minutes à
  base de pois chiches affichait le poids **sec** en liste de courses — non achetable pour un plat
  sans trempage ni cuisson. Toute recette rapide à base de légumineuse passe désormais par
  `pois_chiches_conserve`, `lentilles_cuites` ou `haricots_rouges_conserve`, **jamais** par la
  version sèche.
- **Il n'existait aucun pain sans gluten au catalogue.** C'était la cause directe du chiffre
  suivant : au réglage 15 minutes, un utilisateur sans gluten n'avait que 6 repas complets
  compatibles sur 170, parce que tous les formats rapides passent par du pain, une tortilla ou un
  pita. `pain_sans_gluten` et `wrap_sans_gluten` ouvrent ces formats.
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
  trois objectifs. Le manque de lipides est le premier motif de rejet du catalogue (133 des 170
  repas complets sur la cible prise de masse).
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
- **Aucun repos, marinade ou réfrigération supérieur au plafond du bloc.** Onze recettes actuelles
  déclarent 5 à 10 minutes alors qu'elles exigent 3 heures à une nuit au frais : elles franchissent
  le filtre le plus strict et sont servies le jour même. Le schéma n'a **pas** de champ pour le
  repos long : donc pas de recette à repos long dans cette vague.

### 4.6 Instructions fermées sur la liste d'ingrédients

**Une instruction ne peut jamais introduire un ingrédient absent de `ingredients[]`.** Interdits
tant qu'ils n'ont pas de `ref` : bouillon, vin, crème, beurre, miso, sirop, vinaigre, yaourt,
fromage, épices composées, sauces préparées. Les régimes et la liste de courses sont dérivés des
seuls `ref` : un ingrédient cité hors liste est invisible au filtre et fait mentir la recette.
Défauts confirmés : 8 recettes citent un « bouillon » inexistant dont 3 revendiquent le vegan,
3 citent une sauce soja non déclarée dont une revendique le sans gluten.

Le sel, le poivre et les herbes non listés sont tolérés dans les instructions (ils ne sont pas des
`ref` et n'ont aucun impact macro ni régime).

### 4.6bis Niveau de détail des instructions — exigence renforcée

Les recettes du catalogue actuel sont **trop laconiques** : beaucoup tiennent en trois lignes du
type « Chauffe avoine + lait 4-5 min en remuant. » Quelqu'un qui ne cuisine pas ne sait pas quoi
faire avec ça. **Écris des instructions plus détaillées que celles du catalogue existant : 4 à 7
étapes, chacune une action complète avec sa durée, son feu et son indice de réussite visuel**
(« jusqu'à ce que les bords soient dorés », « quand le liquide est absorbé »), et non un simple
nom d'action. Une personne qui n'a jamais fait le plat doit pouvoir le réussir sans rien chercher
ailleurs.

Concrètement, dans chaque recette :

- **Découpe et préparation dites explicitement** : « émince l'oignon en fines lamelles », pas
  « ajoute l'oignon ». Si un ingrédient doit être égoutté, rincé, pressé, épongé, écrasé ou coupé
  d'une certaine façon, l'étape le dit.
- **Toujours** : la taille de contenant (poêle, casserole, saladier), le niveau de feu (vif /
  moyen / doux), la durée en minutes, et ce qu'on doit voir ou sentir à la fin de l'étape.
- **L'ordre de mise en œuvre est explicite** : ce qui cuit le plus longtemps démarre en premier.
- **Assaisonnement et dressage** font partie des étapes, pas d'un sous-entendu.
- La somme des durées écrites doit rester **cohérente avec `temps_min`** (cf. §4.5).

Ce que ça ne veut pas dire : pas de bavardage, pas de conseils nutritionnels, pas de storytelling.
Chaque étape reste une phrase à l'impératif, dense, utile.

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

Combinaisons interdites : `["perte_de_gras","prise_de_masse"]` et les trois à la fois. Aux
enveloppes imposées par les blocs, la quasi-totalité de la vague tombera sur
`["maintien","prise_de_masse"]` — c'est attendu.

### 4.11 Cibles de référence

Cibles réellement calculées par l'application pour un homme de 80 kg, 180 cm, 30 ans, 4 séances de
musculation par semaine. Elles servent à vérifier qu'une enveloppe couvre bien son créneau.

| Objectif | kcal/jour | P/jour | Repas complet | Petit-déj | Collation |
|---|---|---|---|---|---|
| Sèche | 2104 | 149 g | 671 kcal / 48 g P | 549 / 39 | 274 / 19 |
| Maintien | 2328 | 122 g | 742 / 39 | 607 / 32 | 304 / 16 |
| Prise de masse | 2728 | 122 g | 870 / 39 | 712 / 32 | 356 / 16 |

Bornes hautes à couvrir pour un gabarit de 100 kg en prise de masse : **repas complet 962 kcal,
petit-déjeuner 787 kcal**. Bornes basses à couvrir pour un 65 kg au maintien : **33 g de protéines
sur un repas complet, 27 g sur un petit-déjeuner** — d'où les planchers protéiques imposés par bloc.

---

## 5. Les blocs à produire

Vue d'ensemble. Les enveloppes sont **impératives** : c'est ce qui distingue cette vague des
précédentes, dont 46 % des recettes ne sont jamais servies proprement.

| Bloc | Vol. | ids | Catégorie | `temps_min` | Contrainte ingrédient | kcal base | P base | C base | F base |
|---|---|---|---|---|---|---|---|---|---|
| B1 | 14 | rep171–184 | repas_complet | ≤ 10, zéro cuisson | 7 végétal + 7 animal | 680–740 | 32–34 | 90–105 | 18–22 |
| B2 | 18 | rep185–202 | repas_complet | 11–15 | vegan, ≥12 sans gluten | 680–740 | 32–34 | 90–105 | 18–22 |
| B3 | 12 | rep203–214 | repas_complet | 11–15 | animal, ≥8 GF, ≥8 sans lactose | 680–740 | 32–34 | 90–105 | 18–22 |
| B4 | 14 | rep215–228 | repas_complet | 16–20 | vegan, ≥10 sans gluten | 680–740 | 32–34 | 90–105 | 18–22 |
| B5 | 12 | rep229–240 | repas_complet | ≤ 30 | vegan capacité haute, ≥6 GF | 720–780 | 32–34 | 100–115 | 22–26 |
| B6 | 10 | pd79–88 | petit_dej | ≤ 15 | vegan, ≥6 sans gluten | 540–580 | 26–27 | 70–80 | 16–18 |
| B7 | 0 | — | collation | — | **bloc délibérément vide** | — | — | — | — |

Les protéines de base sont des **planchers** (facteur minimum 1,0). Au-dessus de la fourchette, la
recette exclut les gabarits légers ; en dessous, le facteur maximum 1,7 n'atteint pas la cible d'un
100 kg en sèche.

**Pourquoi on ne découpe pas par régime.** Les régimes sont emboîtés :
`vegan ⊂ végétarien ⊂ pescatarien ⊂ no_pork = halal`. Une recette vegan remplit donc 6 des
7 régimes d'un coup, et vegan + sans gluten les remplit tous les 7. Écrire un « bloc halal » ne
rapporterait rien (309 des 314 recettes sont déjà compatibles halal) et un « bloc pescatarien »
serait un clone du bloc omnivore. Le vrai axe manquant est le **temps croisé à la catégorie**.

---

### B1 — Repas complets ≤ 10 min, zéro cuisson (assemblage pur)

**Volume 14** · ids `rep171` → `rep184` · lunch + dinner · 7 végétal (vegan) + 7 animal.

**Pourquoi.** Le cran 10 minutes du curseur est un désert pour tout le monde : 2 repas complets sur
170, et 0 pour végétarien, vegan, sans gluten et végétarien + sans gluten. Le pool réellement
utilisable (recettes qui atteignent la cible sans aucun défaut) y vaut 4 / 3 / 1 recettes en
sèche / maintien / prise de masse, pour un plancher nécessaire de 14. Ce cran n'est pas théorique :
un bouton « Recettes plus rapides » du bilan hebdomadaire y descend en un clic, sans garde-fou, et
trois régimes sur neuf tombent alors à un pool de zéro.

**Contraintes**

- `temps_min` ≤ 10, temps total. **Aucune cuisson**, aucun repos ou réfrigération de plus de
  10 minutes. Assemblage, conserve, cru, produits prêts à consommer.
- Ancre protéine `macro_role: "protein"` + `scalable: true`, 32–34 g de protéines de base.
- Ancre grasse `macro_role: "fat"` + `scalable: true`, ≥ 12 g de lipides.
- **Sous-lot végétal (7)** : vegan strict, dont **≥ 5 aussi sans gluten** (donc sans
  `pain_complet`, `pain_pita_complet`, `tortilla_complete`, `pates_*`, `nouilles_completes`,
  `boulgour`, `semoule_couscous`, `seitan`, `chapelure`, `flocons_avoine`, `sauce_soja`).
- **Sous-lot animal (7)** : ≥ 4 sans gluten et ≥ 4 sans lactose.
- Les refs « conserve » de §3.2 sont **obligatoires** pour toute légumineuse de ce bloc : les
  8 légumineuses existantes sont `basis: dry` et ne sont pas achetables pour un plat de 10 minutes.
- **Ne pas repartir sur le format wrap / pita / tartine** : 7 des 13 repas complets ≤ 15 min
  existants sont déjà un wrap, un pita ou une tartine.

**Ne pas refaire** : rep49, rep52, rep13, rep115, rep144, rep143, rep84, rep63, rep46, rep40,
rep18, rep113, rep117, rep05, col12, col37, col41, col64.

---

### B2 — Repas complets 11–15 min, végétal (vegan)

**Volume 18** · ids `rep185` → `rep202` · vegan strict, dont **≥ 12 aussi sans gluten**.

**Pourquoi.** C'est le trou bloquant du catalogue. Au **réglage par défaut de l'application
(15 minutes)**, un végétarien comme un vegan a **zéro** repas complet compatible sur 170, contre 13
sans restriction. Le filtre cède alors et sert des plats hors régime : mesuré, 12 à 14 des 28 repas
de la semaine contiennent viande ou poisson chez un végétarien, et dépassent le temps demandé de
+9 à +30 minutes. Pool réellement utilisable à ce cran : 0 / 0 / 0 pour végétarien, vegan et
vegan + sans gluten, pour un plancher de 14.

**Contraintes**

- `temps_min` ≤ 15, temps total. Aucune cuisson non surveillée de plus de 10 minutes, aucun repos
  au froid.
- Ancre protéine végétale `scalable`. Densités disponibles (g de protéines pour 100 kcal) :
  `seitan` 17,9 (mais gluten) · `soja_texture` 15,1 (plafond 70 g) · `tofu_ferme` 12,3 ·
  `tempeh` 10,0 · `yaourt_soja_proteine` 13,8 · `proteine_vegetale` 19,1 · `edamame` 8,8 ·
  `lentilles_vertes` 7,7 · `pois_chiches` 5,9 · `haricots_blancs` 6,3.
- Ancre grasse végétale `scalable` ≥ 12 g : `huile_olive`, `avocat`, `beurre_cacahuete`,
  `beurre_amande`, `amandes`, `noix`, `noisettes`, `graines_courge`, `graines_chia`, `lait_coco`,
  `creme_soja`, `olives` et `tahini`.
- Sous-lot sans gluten (≥ 12) : exclut `flocons_avoine`, `pain_complet`, `pain_seigle`,
  `pates_completes`, `pates_semoule`, `nouilles_completes`, `boulgour`, `semoule_couscous`,
  `tortilla_complete`, `pain_pita_complet`, `seitan`, `sauce_soja`, `chapelure`, `levure_maltee`.
  `pain_sans_gluten` / `wrap_sans_gluten` débloquent les formats rapides.
- Formats à privilégier : bowls froids, salades de légumineuses en conserve, wraps sans cuisson,
  nouilles de riz (5 min), poêlées de tofu fumé, assiettes tofu / edamame.
- **Couples interdits** (déjà saturés) : `tofu_ferme` + `riz_basmati`, `tempeh` + `riz_complet`.

**Ne pas refaire** : rep05, rep25, rep80, rep124, rep50, rep104, rep147, rep41, rep114, rep65,
rep140, rep60, rep92, rep07, rep79, rep126, rep152, rep155, rep131, rep77, rep103, rep58, rep72,
rep97, rep128.

---

### B3 — Repas complets 11–15 min, animal (volaille / poisson / œuf)

**Volume 12** · ids `rep203` → `rep214` · **≥ 8 sans gluten** et **≥ 8 sans lactose**.

**Pourquoi.** Les 13 repas complets ≤ 15 min existants ne tiennent pas la cible : pool réellement
utilisable de 4 / 3 / 1 seulement, et 2 / 2 / 1 en sans gluten. Ils sont en plus très concentrés :
7 des 13 sont un wrap, un pita ou une tartine, et 4 reposent sur du thon. Conséquence mesurée :
4 à 5 plats principaux distincts sur 14 créneaux hebdomadaires, et dans le cas sans lactose à
10 minutes, **le même plat servi 14 fois dans la semaine, midi et soir**.

**Contraintes**

- `temps_min` ≤ 15. Formats à cuisson courte : poêle 5–8 min, plancha, conserve, cru.
- Densités des ancres animales (g de protéines pour 100 kcal) : `blanc_oeuf` 22,7 ·
  `cabillaud` 22,5 · `thon_naturel` 22,4 · `dinde_escalope` 21,8 · `crevettes` 21,2 ·
  `poulet_filet` 19,0 · `thon_frais` 16,0 · `boeuf_5` 15,3 · `boeuf_bavette` 15,3 ·
  `saumon_fume` 13,9 · `sardines` 13,9 · `saumon` 9,6 · `maquereau` 9,3 · `oeuf_entier` 8,8.
- **Diversifier les ancres sous-exploitées** : `maquereau` (1 recette), `thon_frais` (1),
  `sardines` (2), `mozzarella` (2), `crevettes` (6), `dinde_escalope` (9). **Ne pas renforcer**
  `poulet_filet` (29) ni `oeuf_entier` (35).
- **Aucune ref protéine ne peut porter plus de 3 des 12 recettes du bloc.**
- Sous-lot sans lactose (≥ 8) : pas de `skyr`, `fromage_blanc_0`, `cottage_cheese`, `whey`,
  `lait_demi_ecreme`, `mozzarella`, `feta`, `parmesan`.
- Interdits : `porc_filet` et `jambon_blanc` (seuls refs cassant halal et no_pork).
- **Pas de wrap, pita ni tartine** (format déjà saturé, cf. B1).

**Ne pas refaire** : rep13, rep18, rep40, rep46, rep49, rep52, rep63, rep84, rep113, rep115,
rep117, rep143, rep144, rep119, rep123, rep23, rep92, rep167, rep116.

---

### B4 — Repas complets 16–20 min, végétal + sans gluten

**Volume 14** · ids `rep215` → `rep228` · vegan strict, dont **≥ 10 aussi sans gluten** ·
priorité sèche et maintien.

**Pourquoi.** Le cran 20 minutes est le premier cran vivable, et il reste sous le plancher pour
tout ce qui est végétal. Pool réellement utilisable à 20 minutes (sèche / maintien / prise de
masse) : vegan 5 / 6 / 2, végétarien 5 / 10 / 5, vegan + sans gluten 2 / 4 / 2, sans gluten
8 / 12 / 6 — pour un plancher de 14.

**Contraintes**

- `temps_min` entre 16 et 20, cuisson comprise. Une cuisson non surveillée est autorisée si sa
  durée rentre dans `temps_min`.
- Sous-lot sans gluten (≥ 10) : féculents autorisés `riz_basmati`, `riz_complet`, `nouilles_riz`,
  `quinoa`, `polenta`, `sarrasin`, `millet`, `patate_douce`, `pomme_de_terre`, `chataigne`,
  `mais`, `galette_riz`.
- **Diversifier les ancres protéiques sous-utilisées** : `tofu_soyeux` (4 recettes),
  `lentilles_vertes` (4), `pois_casses` (2), `feves` (1), `haricots_noirs` (5),
  `haricots_blancs` (5), `lentilles_corail` (5). **Ne pas renforcer** `soja_texture` (30),
  `yaourt_soja_proteine` (29), `proteine_vegetale` (28), `pois_chiches` (24).
- **Diversifier les féculents** : `millet` (8), `sarrasin` (12), `chataigne` (6), `polenta` (14)
  sont sous-exploités face à `riz_basmati` (34) et `flocons_avoine` (36).
- Viser **≥ 8 g de fibres par portion** : en sèche le moteur applique un biais favorable aux
  recettes fibreuses, c'est un levier de sélection gratuit.

**Ne pas refaire** : rep25, rep80, rep50, rep104, rep124, rep147, rep41, rep114, rep65, rep140,
rep60, rep92, rep07, rep79, rep152, rep155, rep131, rep126, rep77, rep103, rep87, rep61, rep31.

---

### B5 — Repas complets « prise de masse » ≤ 30 min, végétal

**Volume 12** · ids `rep229` → `rep240` · vegan strict, dont **≥ 6 aussi sans gluten** ·
capacité 870 à 962 kcal par portion adaptée.

**Pourquoi.** La prise de masse est l'objectif le plus mal servi du catalogue, et le végétal y est
le pire : pool utilisable de 7 recettes en vegan et 6 en vegan + sans gluten, pour un plancher de
14. Les motifs de rejet dominants à cette cible sont « lipides sous la cible » (133 des 170 repas
complets) et « calories sous la cible » (74 sur 170) : le catalogue est structurellement trop
maigre et trop petit pour nourrir un surplus. À pool identique, la sèche donne 49 recettes propres
contre 18 en prise de masse — un facteur 2,7.

**Contraintes**

- **Capacité haute obligatoire** : l'enveloppe maximale (tous les ingrédients `scalable` à leur
  facteur maximum, plafonds absolus inclus) doit atteindre **≥ 962 kcal**. À vérifier recette par
  recette, par le calcul, pas à l'estime.
- Le plafond vient des **glucides** (facteur max 1,8, aucun plafond absolu sur les féculents).
  Glucides de base 100–115 g, kcal de base 720–780 — plus haut que les autres blocs pour que 1,8×
  atteigne 962 sans forcer.
- Lipides de base 22–26 g dont **≥ 14 g sur l'ancre grasse scalable**. Rappel : l'ancre grasse ne
  peut pas porter le plafond (plafonds absolus de §4.2).
- Protéines de base 32–34 g — ne pas monter plus haut, sinon la recette exclut les gabarits légers.
- Repos long interdit ; `temps_min` ≤ 30, temps total.
- **Aucune recette du bloc ne partage plus de 3 `ref` avec une autre recette du bloc.**

**Ne pas refaire** : rep124, rep126, rep152, rep155, rep50, rep104, rep147, rep41, rep114, rep65,
rep140, rep60, rep92, rep07, rep79, rep77, rep103, rep131, rep25, rep80, rep58, rep97.

---

### B6 — Petits-déjeuners « prise de masse », végétal

**Volume 10** · ids `pd79` → `pd88` · vegan strict (couvre automatiquement sans lactose,
végétarien, pescatarien, no_pork, halal), dont **≥ 6 aussi sans gluten**.

**Pourquoi.** Le petit-déjeuner est le seul autre créneau qui justifie un bloc, et uniquement en
prise de masse. Pool utilisable à la cible petit-déj prise de masse : vegan 3, vegan + sans gluten
2, sans gluten 4, sans lactose 5, pour un plancher de 7. L'omnivore y est à 11 : **aucun
petit-déjeuner omnivore n'est nécessaire**. À l'inverse, écrire des petits-déjeuners « pour la
variété » ne sert à rien — la diversité perçue au petit-déjeuner est plafonnée par le moteur, pas
par le catalogue (7 à 11 recettes distinctes sur 4 régénérations, que le pool fasse 26 ou 78).

**Contraintes**

- **Capacité haute obligatoire** : enveloppe maximale **≥ 787 kcal**. Deux petits-déjeuners taggés
  prise de masse plafonnent aujourd'hui à 600 kcal et ne peuvent physiquement pas honorer le
  créneau.
- Protéines de base 26–27 g (plancher), kcal de base 540–580, glucides 70–80 g, lipides 16–18 g
  dont ≥ 12 g sur une ancre grasse scalable.
- Ancre protéine végétale en `macro_role: "protein"` — **jamais `"dairy"`**.
- `boisson_soja` remplace `lait_amande` dès qu'il faut une base liquide protéinée.
- Sous-lot sans gluten (≥ 6) : `flocons_avoine` interdit — c'est le socle de 36 recettes.
  Autorisés : `sarrasin`, `millet`, `quinoa`, `polenta`, `galette_riz`, `chataigne`,
  `patate_douce`.
- `temps_min` ≤ 15, **aucun repos** : les overnight oats et puddings de chia existants déclarent
  5 minutes pour 4 heures à une nuit de repos. Interdits ici.
- **Ne pas repartir sur le format porridge / pudding / overnight** : 6 recettes partagent déjà le
  triplet (petit-déj, whey, flocons d'avoine) et 6 autres le triplet (petit-déj,
  yaourt de soja protéiné, aucun féculent). Privilégier le salé (tofu brouillé, galette,
  tartinable), les pancakes, les bowls chauds hors avoine.

**Ne pas refaire** : pd34, pd75, pd54, pd39, pd19, pd21, pd09, pd45, pd67, pd16, pd35, pd52, pd77,
pd02, pd31, pd47, pd72, pd53, pd68, pd66, pd43, pd23, pd10, pd30.

---

### B7 — Collations : bloc vide, décision explicite

**Volume 0.** Ne produire **aucune** collation dans cette vague.

**Pourquoi.** Déficit nul mesuré dans les 48 cas testés (8 régimes × 3 objectifs × 2 crans de
temps) : 8 à 13 collations utilisables par cas, pour un plancher de 7, y compris dans les
situations les plus contraintes (vegan 9 / 9 / 11, vegan + sans gluten 9 / 8 / 9). Le temps n'est
pas un frein non plus : 63 des 66 collations sont à ≤ 10 minutes. Et la diversité perçue y est
plafonnée par le moteur comme au petit-déjeuner. Ajouter des collations serait du poids mort
mesurable : 34 des 66 existantes (52 %) ne sont déjà servies proprement dans aucun cas réaliste.

Le vrai chantier collations est un chantier de **correction de tags**, pas d'écriture, et il ne
fait pas partie de cette commande.

---

## 6. Règle anti-doublons — opérationnelle

Le catalogue actuel contient 8 groupes de doublons stricts, produits par des vagues successives qui
ne se voyaient pas les unes les autres. Les règles suivantes s'appliquent **avant** livraison.

| # | Règle | Seuil | Étalonnage sur les 314 recettes existantes |
|---|---|---|---|
| R1 | **Jaccard sur le set de `ref`** : rejeter toute recette N s'il existe une recette E de même `category` avec `J = ∩/∪ ≥ 0,60` | 0,60 | J ≥ 1,00 → 10 paires · ≥ 0,80 → 29 · ≥ 0,70 → 43 · ≥ 0,60 → 137. Le seuil 0,60 est le premier qui sépare les clones du bruit |
| R2 | **Refs communs en absolu** : ≤ 3 `ref` en commun avec toute recette existante de même catégorie | 3 | Les recettes font 4 à 6 refs → 4 communs = quasi-clone. 78 paires existantes partagent ≥ 4 refs |
| R3 | **Contrôle intra-vague** : appliquer R1 et R2 **aussi entre les 80 nouvelles recettes** | — | C'est l'absence de ce contrôle croisé qui a produit les 8 groupes de doublons actuels |
| R4 | **Triplet structurel** : (category, set des refs `protein`, set des refs `carb`) — 2 recettes maximum par triplet dans le catalogue final | 2 | 223 triplets pour 314 recettes, 54 en collision ; pires cas ×8 et ×6 |
| R5 | **Noms** : aucun nom exact dupliqué ; deux recettes de même catégorie ne peuvent pas partager leurs 3 premiers mots significatifs (articles retirés, accents et ligatures normalisés) | — | pd47 et col45 portent aujourd'hui le même nom |
| R6 | **Plafond par ancre** : dans chaque bloc, aucune ref protéine ne porte plus de 25 % des recettes ; ≥ 6 refs protéine distinctes et ≥ 4 refs grasse distinctes par bloc | 25 % | Concentration actuelle : huile d'olive 137, œuf 35, riz basmati 34, PST 30, poulet 29 |
| R7 | **Cohérence des tags** : deux recettes de même catégorie au même set de refs doivent porter les mêmes `tags.objectif` | — | rep25 (620 kcal) et rep80 (608 kcal) se contredisent, et c'est la moins calorique qui porte prise_de_masse |
| R8 | **Contrôle d'enveloppe** : rejeter toute recette qui rate sa cible sur plus de 5 des 9 profils réalistes (65 / 80 / 100 kg × 3 objectifs) | 5/9 | 145 des 314 recettes ratent les 9 sur 9 : jamais servies proprement. C'est le vrai doublon |
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
— R1 92, R2 78, R4 17, R5 22, R7 0 — sont des **plafonds**. Ils peuvent descendre après un
nettoyage ; toute vague qui les fait monter casse `npm test`.

R3, R6, R8 et R9 restent des règles de rédaction, non automatisées : R8 demande de faire tourner
`adaptRecipe` sur 9 profils, R6 et R9 supposent de connaître le découpage en blocs. Elles se
vérifient à la relecture du lot, bloc par bloc.

---

## 7. Protocole de livraison

### 7.1 Arborescence

Un dossier daté par bloc, dans `kyroz-app/Recette/drops/`. **Ces fichiers ne sont jamais importés
par le code** : ce sont des archives de matière première, on en extrait, on ne les branche pas.

```
kyroz-app/Recette/drops/
├── 2026-07-29-b1-repas-10min-zero-cuisson/
│   ├── recettes.json              ← { "recipes": [ ... ] }, 14 objets
│   ├── nouveaux-ingredients.json  ← { "ingredients_reference": { ... } }, refs proposés
│   └── controle-doublons.md       ← sortie du script R1→R9, vide si conforme
├── 2026-07-29-b2-repas-15min-vegetal/
├── 2026-07-29-b3-repas-15min-animal/
├── 2026-07-29-b4-repas-20min-vegetal-sans-gluten/
├── 2026-07-29-b5-repas-30min-prise-de-masse-vegetal/
└── 2026-07-29-b6-petit-dej-prise-de-masse-vegetal/
```

`recettes.json` contient uniquement la clé `recipes`, un tableau d'objets au format §2. Pas de
`_meta`, pas de `config`, pas d'`enums` — ils vivent dans le catalogue live.

### 7.2 Checklist de merge dans le catalogue live

Reprise fidèle de `kyroz-app/Recette/README.md`. À exécuter dans cet ordre, bloc par bloc.

| # | Action | Fichier |
|---|---|---|
| 1 | Concaténer les recettes dans `recipes[]`, ids en suite continue | `Recette/recettes-kyroz.json` |
| 2 | Mettre `_meta.count` à jour (314 → 394 après les 6 blocs) | `Recette/recettes-kyroz.json` |
| 3 | Ajouter chaque ingrédient inconnu à `ingredients_reference` (`name`, `unit`, `per_100`, `basis`, `abs_max_qty`) | `Recette/recettes-kyroz.json` |
| 4 | Mapper chaque nouveau ref sur Ciqual, **vérifié à la main** — on ne mappe que si l'entrée ANSES est sans ambiguïté le même aliment, sinon on garde la valeur manuelle, assumée | `lib/recipeFoodMap.ts` |
| 5 | Déclarer chaque nouveau ref dans `VIOLATIONS` s'il interdit un régime (gluten, vegan, porc, lactose). `restrictions_ok` est **dérivé**, jamais écrit dans la recette | `lib/recipeDiet.ts` |
| 6 | Mettre à jour les compteurs `toHaveLength(N)` | `lib/__tests__/recipeMap.test.ts`, `recipes.test.ts`, `recipeData.test.ts` |
| 7 | Incrémenter `ENGINE_VERSION` (+1), sinon les plans en cache ignorent les nouvelles recettes | `lib/planEngine.ts` |
| 8 | `npm test` | — |
| 9 | `npx tsc --noEmit` | — |
| 10 | `npx tsx scripts/gen-validation-recettes.ts` → régénère le dossier diététicienne | `VALIDATION-RECETTES.md` |

Comptes attendus après merge complet : **394 recettes** — 88 petits-déjeuners, 66 collations,
240 repas complets.

### 7.3 Ordre de livraison recommandé

**B1 et B3 en premier** (19 recettes animales rapides), puis B2, B4, B6, B5. Raison : 54 des
80 recettes de la vague sont végétales alors que la cible est « hommes 18–35 pratiquant du sport ».
C'est ce que la mesure impose — les trous sont là — mais le catalogue ne doit pas être **perçu**
comme vegan. Contre-mesures : formats carnés-compatibles (bowls, wraps, poêlées, salades
composées), noms sans marqueur identitaire, `why` sobre sans revendication de régime, et livraison
des blocs animaux en tête.

---

## 8. À trancher avant de lancer la génération

Quatre décisions bloquent ou modifient la commande. Aucune ne peut être prise par le rédacteur.

1. **Ordre correctif / vague.** Un correctif propose de passer le réglage de temps par défaut de
   15 à 20 minutes. S'il est appliqué en parallèle de cette vague, B2 et B3 (30 recettes) gardent
   leur valeur — les crans 10 et 15 restent atteignables en un clic — mais perdent leur urgence.
   Trancher l'ordre avant de lancer, pas les deux à l'aveugle.

2. ~~**Les 9 refs à créer.**~~ **Tranché le 2026-07-29 : ils sont créés** (§3.2), mappés sur
   Ciqual et intégrés à la table des régimes. Les trois légumineuses prêtes à consommer,
   `pain_sans_gluten` et `boisson_soja` sont disponibles ; B1, B2 et B6 ne sont plus bloqués.
   Point reporté et non tranché : `tahini` introduit le **sésame**, allergène qu'aucun champ du
   schéma ne porte — l'ajout d'un axe allergène reste un chantier ouvert.

3. ~~**Corriger les tags jour-repos avant la relecture diététicienne.**~~ **Tranché le
   2026-07-29 : non.** Le fondateur a arbitré que le jour de repos est l'affaire du moteur, qui
   module déjà les macros ce jour-là (glucides ↓ / lipides ↑) : le tag ne porte pas de décision
   de contenu. Pour le rédacteur, `recup_jour_repos` se remplit donc par la règle mécanique du
   §4.8 et rien d'autre — ne pas y consacrer de réflexion éditoriale.

4. **Champ `wave` / `batch`.** Ajouter un champ de traçabilité de vague sur chaque recette (et le
   renseigner rétroactivement pour le lot fondateur de 100 et le lot des 214 suivantes) demande une
   modification du schéma et du code de chargement. Sans lui, la vague suivante ne saura pas contre
   quoi se comparer. À décider maintenant : le brief l'exclut pour l'instant du format de sortie.
