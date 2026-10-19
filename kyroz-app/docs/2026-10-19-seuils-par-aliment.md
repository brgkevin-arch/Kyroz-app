# Seuil par aliment — proposition à relire

> Demandé par le fondateur le 2026-10-19 (E75) : *« 5 g est négligeable, aucun intérêt de faire acheter un pot ; il faut estimer la proportion pour chaque aliment »*, puis *« 15 g de crème n'a pas autant d'impact que 15 g de poulet »*. Décision déjà prise : **sous le seuil, la ligne disparaît de la liste de courses, comme le sel** (choix A).
>
> **Rien n'est codé.** Ce fichier sert à relire et corriger les valeurs ; le code suivra avec les valeurs validées.

## La règle proposée

Le seuil dépend de **ce que l'aliment fait dans le plat** — mesuré, pas deviné : chaque ingrédient de chaque recette porte un rôle (`macro_role` dans `Recette/recettes-kyroz.json`), et on retient le rôle qu'il tient le plus souvent.

1. **Il fait le plat** (protéine, féculent, légume, fruit, laitage) → **jamais caché**, même pour 10 g. Sans lui la recette n'existe plus : c'est le poulet.
2. **Il accompagne le plat** (matière grasse d'assaisonnement, garniture, arôme) → **caché quand la semaine n'en demande pas plus d'une portion habituelle**, c'est-à-dire la quantité qu'il pèse dans une recette normale du catalogue (médiane, arrondie aux 5 g supérieurs). En dessous, c'est une pincée sur une seule assiette : c'est la crème.
3. **Fond de placard** (huile, miel, sel, épices…) → déjà jamais sur la liste, inchangé.

**Effet mesuré** sur 36 semaines simulées (6 profils : omnivore 5 et 7 jours, femme 58 kg, végétarien, vegan, pescétarien ; 6 plans chacun) : **141 lignes cachées sur 2030** (7 %, environ 4 par semaine). Toutes sont des garnitures ; aucune protéine, aucun féculent.

## 1. Les 23 aliments qui reçoivent un seuil — à relire ligne par ligne

Lecture : *besoin d'une semaine* = minimum – médiane – maximum observé quand l'aliment est sur la liste. *Cachées* = combien de fois la ligne aurait disparu sur les semaines où il apparaît.

| Aliment | Rôle | Portion habituelle | Besoin d'une semaine | Paquet vendu | **Seuil proposé** | Cachées | Remarque |
|---|---|---|---|---|---|---|---|
| Cacao maigre en poudre | arôme | 8 g | 10 – 15 – 20 g | 250 g | **10 g** | 2 / 5 |  |
| Graines de courge | matière grasse | 10 g | 5 – 15 – 45 g | 150 g | **10 g** | 11 / 24 |  |
| Levure maltée | arôme | 8 g | 40 – 40 – 40 g | 150 g | **10 g** | 0 / 4 |  |
| Amandes | matière grasse | 12 g | 5 – 60 – 155 g | 200 g / 500 g | **15 g** | 6 / 35 |  |
| Beurre d'amande | matière grasse | 15 g | 10 – 25 – 85 g | 250 g | **15 g** | 6 / 18 |  |
| Beurre de cacahuète | matière grasse | 15 g | 10 – 35 – 80 g | 350 g | **15 g** | 5 / 35 |  |
| Chocolat noir 70% | matière grasse | 12 g | 5 – 5 – 5 g | 100 g | **15 g** | 5 / 5 |  |
| Graines de chia | matière grasse | 12 g | 10 – 10 – 40 g | 200 g | **15 g** | 13 / 19 |  |
| Noisettes | matière grasse | 12 g | 5 – 10 – 40 g | 125 g | **15 g** | 22 / 28 |  |
| Noix | matière grasse | 12 g | 5 – 10 – 20 g | 100 g / 200 g | **15 g** | 20 / 21 |  |
| Parmesan | matière grasse | 15 g | 10 – 25 – 60 g | 70 g | **15 g** | 4 / 18 |  |
| Purée de sésame (tahini) | matière grasse | 15 g | 10 – 30 – 60 g | 300 g | **15 g** | 3 / 19 |  |
| Sauce soja | arôme | 15 ml | 10 – 15 – 35 ml | 150 ml | **15 ml** | 4 / 6 |  |
| Sirop d'érable | fruit | 12 g | 10 – 12 – 15 g | 250 ml | **15 g** | 4 / 4 | sucrant |
| Chapelure | féculent | 25 g | 25 – 25 – 25 g | 250 g | **25 g** | 1 / 1 | enrobage |
| Mozzarella light | protéine | 25 g | —  | 125 g | **25 g** | 0 / 0 | fromage de garniture |
| Olives | matière grasse | 25 g | 25 – 40 – 185 g | 150 g | **25 g** | 2 / 12 |  |
| Pesto | matière grasse | 27 g | 30 – 30 – 30 g | 190 g | **30 g** | 3 / 3 | une recette entière en demande 30 g : la ligne disparaît chaque fois |
| Dattes dénoyautées | fruit | 35 g | 15 – 30 – 125 g | 250 g | **35 g** | 13 / 25 | sucrant / garniture; ⚠️ à trancher : sucrant d'appoint, mais le cœur d'une boule d'énergie |
| Feta | matière grasse | 40 g | 15 – 20 – 60 g | 200 g | **40 g** | 4 / 7 |  |
| Crème de soja | matière grasse | 45 ml | 55 – 80 – 280 ml | 20 cl | **45 ml** | 0 / 7 |  |
| Avocat | matière grasse | 50 g | 20 – 135 – 445 g | pièce (~150 g) | **50 g** | 10 / 34 | ⚠️ à trancher : souvent l'élément du plat (tartine). 50 g cache jusqu'à 45 g, soit un tiers d'avocat — 30 g serait plus prudent |
| Lait de coco | matière grasse | 50 ml | 30 – 120 – 325 ml | 200 ml / 400 ml | **50 ml** | 3 / 26 | la base d'un curry, mais 30–40 g n'en est qu'une touche |

## 2. Les 106 aliments jamais cachés

Ils font le plat. À relire seulement si l'un d'eux te semble être une garniture.

**Protéine (50)** — Aiguillettes de poulet végétal (110 g), Bavette de bœuf (140 g), Blanc d'œuf (120 g), Boulettes végétales (85 g), Burger végétal (blé et soja) (120 g), Bœuf haché 5% MG (150 g), Chorizo végétal (70 g), Cottage cheese (132.5 g), Crevettes cuites (125 g), Dos de cabillaud (180 g), Edamame (130 g), Escalope de dinde (85 g), Falafels prêts à consommer (65 g), Filet de poulet (160 g), Filet mignon de porc (120 g), Filets de poulet végétal (100 g), Fromage blanc 0% (190 g), Fèves sèches décortiquées (60 g), Haricots blancs (conserve, égouttés) (195 g), Haricots noirs (conserve, égouttés) (150 g), Haricots rouges (conserve, égouttés) (105 g), Jambon blanc (80 g), Jambon végétal (90 g), Lardons végétaux (35 g), Lentilles corail (75 g), Lentilles cuites (conserve ou sachet) (175 g), Maquereau (150 g), Nuggets végétaux panés (55 g), Pavé de saumon (140 g), Pois cassés (80 g), Pois chiches (conserve, égouttés) (145 g), Protéine de soja texturée (PST) (25 g), Protéine végétale (pois/soja) (25 g), Sardines (conserve égouttées) (92.5 g), Saucisses végétales (tofu) (50 g), Saumon fumé (70 g), Seitan (93 g), Skyr nature (155 g), Steak haché végétal (soja) (110 g), Steak végétal (soja) (70 g), Tempeh (135.5 g), Thon au naturel (conserve) (100 g), Thon frais (85 g), Tofu ferme (150 g), Tofu fumé (115 g), Tofu soyeux (150 g), Whey (neutre/vanille) (27.5 g), Yaourt de soja protéiné (150 g), Émincés de poulet végétal (soja et blé) (105 g), Œuf entier (100 g).

**Féculent (24)** — Boulgour (80 g), Châtaigne (69 g), Flocons d'avoine (40 g), Galette de riz soufflé (30 g), Maïs (60 g), Millet (80 g), Nouilles complètes (80.5 g), Nouilles de riz (77.5 g), Pain complet (60 g), Pain de seigle (60 g), Pain pita complet (80 g), Pain sans gluten (35 g), Patate douce (250 g), Polenta (64.5 g), Pomme de terre (250 g), Pâtes (semoule) (80 g), Pâtes complètes (85 g), Quinoa (64 g), Riz basmati (77.5 g), Riz complet (80 g), Sarrasin (75 g), Semoule de couscous (80 g), Tortilla blé complet (70 g), Wrap / tortilla sans gluten (75 g).

**Légume (19)** — Asperges (100 g), Betterave cuite (80 g), Brocoli (105 g), Carotte (80 g), Champignons (90 g), Chou-fleur (95 g), Concombre (70 g), Courgette (100 g), Haricots verts (100 g), Mélange wok (poivron/brocoli/carotte) (120 g), Oignon (40 g), Petits pois (80 g), Poivron (80 g), Ratatouille de légumes (140 g), Roquette (40 g), Salade verte (40 g), Tomate (80 g), Tomate concassée (110 g), Épinards frais (75 g).

**Fruit (9)** — Ananas (90 g), Banane (90 g), Framboises (80 g), Fruits rouges (mélange) (80 g), Kiwi (100 g), Mangue (100 g), Myrtilles (80 g), Pomme (100 g), Raisins (65 g).

**Laitage (3)** — Lait d'amande (200 ml), Lait demi-écrémé (250 ml), Yaourt grec égoutté (type Fage) (60 g).

**Matière grasse (1)** — Merguez végétales (90 g).

*Entre parenthèses : la portion habituelle dans une recette.*

⚠️ Cas limites relevés dans les données, laissés « jamais cachés » faute d'avis contraire : **flocons d'avoine** (une semaine en demande parfois 10 g, quand il sert à épaissir) · **lait** (parfois 70 ml pour une brique d'1 L) · **galette de riz soufflé** (c'est la collation elle-même) · **merguez végétales** (classées « matière grasse » par le catalogue, ce sont des pièces de protéine).

## 3. Fonds de placard, déjà jamais sur la liste

Huile d'olive, Miel (et le sel, le poivre, les épices, le citron, la moutarde, le vinaigre — `lib/pantry.ts::STAPLES`).

## Ce qui reste à décider

1. Les valeurs du tableau 1, en particulier **avocat** et **dattes**.
2. Un aliment des listes 2 ou 3 à déplacer ?

Ensuite : codé dans `lib/formatsVendus.ts` (une table `SEUIL`, à côté des formats), appliqué à la liste générée seulement — jamais à un article ajouté à la main — et livré avec #376 dans la 61ᵉ OTA.
