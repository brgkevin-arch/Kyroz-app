# Seuil par aliment — en vigueur (code : `lib/seuilAchat.ts`)

> Demande du fondateur (E75) : *« 5 g est négligeable, aucun intérêt de faire acheter un pot »*, *« 15 g de crème n'a pas autant d'impact que 15 g de poulet »*, *« personne n'est à 10 g près »*, *« 30 g de pesto, c'est un repas »*. Décisions du 2026-10-19 et du 2026-10-20 : **sous le seuil, la ligne disparaît de la liste, comme le sel** ; **seuil = 20 % d'une portion habituelle, jamais moins de 10 g** ; **au plus 15 g pour ce qui porte la protéine du plat**. La recette n'est **pas** adaptée au manque (au pire ~3 g de protéines sur un repas, sous la tolérance de 100 kcal/jour du moteur).
>
> ✅ **Codé le 2026-10-20 dans #376** (non publié, part avec la 61ᵉ OTA). ⚠️ Ce tableau est **généré depuis le code** : les seuils se calculent sur le catalogue (portion = médiane de l'aliment dans les recettes, rôle = `macro_role` le plus fréquent), donc ils suivront une refonte des recettes. Ne pas le corriger à la main : corriger la règle, puis le régénérer.

## La règle

- Une ligne de la liste de courses **disparaît** quand il reste à acheter **au plus son seuil**.
- Seuil = **20 % d'une portion habituelle**, arrondi aux 5 g, **jamais moins de 10 g** ; **au plus 15 g** pour un aliment dont le rôle dominant est la protéine.
- Le seuil porte sur **ce qui reste à acheter**, réserve déduite. **Jamais caché** : un article ajouté à la main, un aliment hors catalogue. Les fonds de placard restent hors de la liste comme aujourd'hui.
- Vérifié à l'écran le 2026-10-20 : 215 g de poulet dans le plan, 205 g en réserve → la ligne disparaît ; 185 g en réserve → « il t'en faut 30 g », elle reste.

## Effet mesuré

6 profils (omnivore 5 et 7 jours, femme 58 kg, végétarien, vegan, pescétarien) : **première liste** 36 semaines, **85 lignes cachées sur 2030** (4 %) · **semaines suivantes** (restes de paquets en réserve), 30 semaines, **55 sur 994** (6 %).

*Cachées* : « première liste · semaines suivantes », en semaines où la ligne aurait disparu sur celles où l'aliment apparaît.

## Les seuils, aliment par aliment

### Protéine (52) — au plus 15 g

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Aiguillettes de poulet végétal | 110 g | **15 g** | 0 / 17 · 0 / 14 |
| Bavette de bœuf | 140 g | **15 g** | 0 / 16 · 0 / 13 |
| Blanc d'œuf | 120 g | **15 g** | 0 / 28 · 0 / 23 |
| Boulettes végétales | 85 g | **15 g** | 0 / 0 · 0 / 0 |
| Burger végétal (blé et soja) | 120 g | **15 g** | 0 / 4 · 0 / 4 |
| Bœuf haché 5% MG | 150 g | **15 g** | 0 / 17 · 0 / 14 |
| Chorizo végétal | 70 g | **15 g** | 0 / 1 · 0 / 1 |
| Cottage cheese | 132.5 g | **15 g** | 0 / 25 · 0 / 20 |
| Crevettes cuites | 125 g | **15 g** | 0 / 17 · 0 / 16 |
| Dos de cabillaud | 180 g | **15 g** | 0 / 16 · 1 / 11 |
| Edamame | 130 g | **15 g** | 0 / 11 · 0 / 9 |
| Escalope de dinde | 85 g | **15 g** | 0 / 16 · 2 / 10 |
| Falafels prêts à consommer | 65 g | **15 g** | 0 / 0 · 0 / 0 |
| Filet de poulet | 160 g | **15 g** | 0 / 18 · 0 / 14 |
| Filet mignon de porc | 120 g | **15 g** | 0 / 10 · 0 / 2 |
| Filets de poulet végétal | 100 g | **15 g** | 0 / 13 · 0 / 11 |
| Fromage blanc 0% | 190 g | **15 g** | 0 / 25 · 0 / 18 |
| Haricots blancs (conserve, égouttés) | 195 g | **15 g** | 0 / 11 · 1 / 8 |
| Haricots noirs (conserve, égouttés) | 150 g | **15 g** | 0 / 13 · 0 / 11 |
| Haricots rouges (conserve, égouttés) | 105 g | **15 g** | 0 / 7 · 0 / 4 |
| Jambon blanc | 80 g | **15 g** | 0 / 14 · 0 / 13 |
| Jambon végétal | 90 g | **15 g** | 0 / 12 · 0 / 8 |
| Lentilles corail | 75 g | **15 g** | 0 / 7 · 0 / 1 |
| Lentilles cuites (conserve ou sachet) | 175 g | **15 g** | 0 / 9 · 0 / 7 |
| Maquereau | 150 g | **15 g** | 0 / 0 · 0 / 0 |
| Merguez végétales | 90 g | **15 g** | 0 / 0 · 0 / 0 |
| Pavé de saumon | 140 g | **15 g** | 0 / 0 · 0 / 0 |
| Pois cassés | 80 g | **15 g** | 0 / 1 · 0 / 1 |
| Pois chiches (conserve, égouttés) | 145 g | **15 g** | 0 / 7 · 0 / 7 |
| Sardines (conserve égouttées) | 92.5 g | **15 g** | 0 / 0 · 0 / 0 |
| Saumon fumé | 70 g | **15 g** | 0 / 11 · 0 / 8 |
| Seitan | 93 g | **15 g** | 0 / 19 · 0 / 16 |
| Skyr nature | 155 g | **15 g** | 0 / 30 · 0 / 21 |
| Steak haché végétal (soja) | 110 g | **15 g** | 0 / 1 · 0 / 1 |
| Steak végétal (soja) | 70 g | **15 g** | 0 / 0 · 0 / 0 |
| Tempeh | 135.5 g | **15 g** | 0 / 1 · 0 / 1 |
| Thon au naturel (conserve) | 100 g | **15 g** | 0 / 21 · 0 / 17 |
| Thon frais | 85 g | **15 g** | 0 / 11 · 0 / 8 |
| Tofu ferme | 150 g | **15 g** | 0 / 7 · 0 / 7 |
| Tofu fumé | 115 g | **15 g** | 0 / 0 · 0 / 0 |
| Tofu soyeux | 150 g | **15 g** | 0 / 0 · 0 / 0 |
| Yaourt de soja protéiné | 150 g | **15 g** | 0 / 33 · 0 / 22 |
| Émincés de poulet végétal (soja et blé) | 105 g | **15 g** | 0 / 6 · 0 / 4 |
| Œuf entier | 100 g | **15 g** | 1 / 26 · 1 / 16 |
| Fèves sèches décortiquées | 60 g | **10 g** | 0 / 11 · 0 / 3 |
| Lardons végétaux | 35 g | **10 g** | 0 / 0 · 0 / 0 |
| Mozzarella light | 25 g | **10 g** | 0 / 0 · 0 / 0 |
| Nuggets végétaux panés | 55 g | **10 g** | 0 / 0 · 0 / 0 |
| Protéine de soja texturée (PST) | 25 g | **10 g** | 0 / 2 · 0 / 1 |
| Protéine végétale (pois/soja) | 25 g | **10 g** | 0 / 36 · 0 / 2 |
| Saucisses végétales (tofu) | 50 g | **10 g** | 0 / 0 · 0 / 0 |
| Whey (neutre/vanille) | 27.5 g | **10 g** | 0 / 30 · 1 / 4 |

### Féculent (25)

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Patate douce | 250 g | **50 g** | 0 / 27 · 0 / 22 |
| Pomme de terre | 250 g | **50 g** | 0 / 12 · 1 / 3 |
| Boulgour | 80 g | **15 g** | 0 / 14 · 0 / 3 |
| Châtaigne | 69 g | **15 g** | 0 / 27 · 3 / 22 |
| Millet | 80 g | **15 g** | 0 / 34 · 1 / 6 |
| Nouilles complètes | 80.5 g | **15 g** | 0 / 4 · 0 / 1 |
| Nouilles de riz | 77.5 g | **15 g** | 0 / 15 · 0 / 11 |
| Pain pita complet | 80 g | **15 g** | 0 / 11 · 0 / 6 |
| Polenta | 64.5 g | **15 g** | 0 / 20 · 0 / 6 |
| Pâtes (semoule) | 80 g | **15 g** | 0 / 14 · 0 / 5 |
| Pâtes complètes | 85 g | **15 g** | 0 / 15 · 1 / 4 |
| Quinoa | 64 g | **15 g** | 0 / 22 · 0 / 3 |
| Riz basmati | 77.5 g | **15 g** | 0 / 30 · 1 / 8 |
| Riz complet | 80 g | **15 g** | 0 / 24 · 0 / 5 |
| Sarrasin | 75 g | **15 g** | 0 / 18 · 1 / 4 |
| Semoule de couscous | 80 g | **15 g** | 0 / 6 · 0 / 4 |
| Tortilla blé complet | 70 g | **15 g** | 0 / 23 · 2 / 13 |
| Wrap / tortilla sans gluten | 75 g | **15 g** | 0 / 10 · 0 / 3 |
| Chapelure | 25 g | **10 g** | 0 / 1 · 0 / 0 |
| Flocons d'avoine | 40 g | **10 g** | 1 / 36 · 1 / 9 |
| Galette de riz soufflé | 30 g | **10 g** | 0 / 34 · 3 / 14 |
| Maïs | 60 g | **10 g** | 0 / 26 · 0 / 20 |
| Pain complet | 60 g | **10 g** | 0 / 32 · 0 / 8 |
| Pain de seigle | 60 g | **10 g** | 0 / 17 · 0 / 4 |
| Pain sans gluten | 35 g | **10 g** | 0 / 0 · 0 / 0 |

### Légume (19)

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Ratatouille de légumes | 140 g | **30 g** | 0 / 7 · 1 / 2 |
| Mélange wok (poivron/brocoli/carotte) | 120 g | **25 g** | 0 / 13 · 0 / 2 |
| Asperges | 100 g | **20 g** | 0 / 17 · 0 / 4 |
| Brocoli | 105 g | **20 g** | 0 / 30 · 0 / 19 |
| Champignons | 90 g | **20 g** | 0 / 27 · 4 / 14 |
| Chou-fleur | 95 g | **20 g** | 0 / 21 · 0 / 3 |
| Courgette | 100 g | **20 g** | 0 / 13 · 0 / 10 |
| Haricots verts | 100 g | **20 g** | 0 / 5 · 0 / 1 |
| Tomate concassée | 110 g | **20 g** | 0 / 32 · 0 / 17 |
| Betterave cuite | 80 g | **15 g** | 0 / 4 · 0 / 2 |
| Carotte | 80 g | **15 g** | 0 / 27 · 0 / 22 |
| Concombre | 70 g | **15 g** | 0 / 23 · 0 / 7 |
| Petits pois | 80 g | **15 g** | 0 / 17 · 0 / 1 |
| Poivron | 80 g | **15 g** | 0 / 28 · 1 / 20 |
| Tomate | 80 g | **15 g** | 0 / 26 · 1 / 19 |
| Épinards frais | 75 g | **15 g** | 0 / 27 · 0 / 17 |
| Oignon | 40 g | **10 g** | 0 / 32 · 3 / 25 |
| Roquette | 40 g | **10 g** | 0 / 22 · 0 / 7 |
| Salade verte | 40 g | **10 g** | 0 / 15 · 0 / 5 |

### Fruit (11)

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Ananas | 90 g | **20 g** | 0 / 8 · 0 / 2 |
| Banane | 90 g | **20 g** | 0 / 34 · 0 / 28 |
| Kiwi | 100 g | **20 g** | 0 / 18 · 0 / 14 |
| Mangue | 100 g | **20 g** | 0 / 20 · 0 / 14 |
| Pomme | 100 g | **20 g** | 0 / 31 · 0 / 25 |
| Framboises | 80 g | **15 g** | 0 / 22 · 2 / 16 |
| Fruits rouges (mélange) | 80 g | **15 g** | 0 / 31 · 1 / 10 |
| Myrtilles | 80 g | **15 g** | 0 / 23 · 1 / 14 |
| Raisins | 65 g | **15 g** | 0 / 2 · 0 / 2 |
| Dattes dénoyautées | 35 g | **10 g** | 0 / 25 · 0 / 3 |
| Sirop d'érable | 12 g | **10 g** | 2 / 4 · 1 / 3 |

### Laitage (3)

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Lait demi-écrémé | 250 ml | **50 ml** | 0 / 30 · 1 / 11 |
| Lait d'amande | 200 ml | **40 ml** | 0 / 29 · 1 / 7 |
| Yaourt grec égoutté (type Fage) | 60 g | **10 g** | 0 / 9 · 0 / 5 |

### Matière grasse (16)

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Amandes | 12 g | **10 g** | 5 / 35 · 0 / 9 |
| Avocat | 50 g | **10 g** | 0 / 34 · 0 / 20 |
| Beurre d'amande | 15 g | **10 g** | 4 / 18 · 0 / 4 |
| Beurre de cacahuète | 15 g | **10 g** | 1 / 35 · 1 / 1 |
| Chocolat noir 70% | 12 g | **10 g** | 5 / 5 · 2 / 2 |
| Crème de soja | 45 ml | **10 ml** | 0 / 7 · 0 / 6 |
| Feta | 40 g | **10 g** | 0 / 7 · 0 / 4 |
| Graines de chia | 12 g | **10 g** | 12 / 19 · 2 / 2 |
| Graines de courge | 10 g | **10 g** | 11 / 24 · 1 / 4 |
| Lait de coco | 50 ml | **10 ml** | 0 / 26 · 0 / 13 |
| Noisettes | 12 g | **10 g** | 20 / 28 · 2 / 3 |
| Noix | 12 g | **10 g** | 17 / 21 · 3 / 3 |
| Olives | 25 g | **10 g** | 0 / 12 · 2 / 4 |
| Parmesan | 15 g | **10 g** | 1 / 18 · 3 / 7 |
| Pesto | 27 g | **10 g** | 0 / 3 · 0 / 0 |
| Purée de sésame (tahini) | 15 g | **10 g** | 1 / 19 · 0 / 1 |

### Arôme (3)

| Aliment | Portion habituelle | **Seuil** | Cachées |
|---|---|---|---|
| Cacao maigre en poudre | 8 g | **10 g** | 2 / 5 · 1 / 2 |
| Levure maltée | 8 g | **10 g** | 0 / 4 · 1 / 2 |
| Sauce soja | 15 ml | **10 ml** | 2 / 6 · 0 / 1 |

## Fonds de placard (jamais sur la liste)

Huile d'olive, Miel — et le sel, le poivre, les épices, le citron, la moutarde, le vinaigre (`lib/pantry.ts::STAPLES`).

⚠️ Rôle corrigé dans le code (`PROTEINE_FORCEE`) : **merguez végétales**, classées « matière grasse » par le catalogue, traitées comme une pièce de protéine.