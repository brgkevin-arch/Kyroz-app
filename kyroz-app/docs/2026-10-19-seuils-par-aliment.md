# Seuil par aliment — proposition à relire

> Demandé par le fondateur le 2026-10-19 (E75) : *« 5 g est négligeable, aucun intérêt de faire acheter un pot ; il faut estimer la proportion pour chaque aliment »*, puis *« 15 g de crème n'a pas autant d'impact que 15 g de poulet »*, puis *« s'il manque 5/10 g de poulet, on ne va pas faire acheter un paquet entier »*. Décision prise : **sous le seuil, la ligne disparaît de la liste de courses, comme le sel** (choix A).
>
> **Rien n'est codé.** Version 2 (même jour) : avocat compté à la pièce, dattes à seuil bas, et un seuil aussi pour ce qui fait le plat.

## La règle

Le seuil dépend de **ce que l'aliment fait dans le plat**, mesuré sur le catalogue (chaque ingrédient de chaque recette porte un rôle, `macro_role` ; on retient celui qu'il tient le plus souvent) :

1. **Il accompagne le plat** (garniture, matière grasse d'assaisonnement, arôme) → caché tant que la semaine n'en demande **pas plus d'une portion habituelle** (ce qu'il pèse dans une recette normale, arrondi aux 5 g). C'est la crème.
2. **Il fait le plat et s'achète à la pièce** (fruits, légumes, avocat) → caché sous **un dixième de pièce**. 10 g de tomate ne font pas acheter une tomate.
3. **Il fait le plat et s'achète en paquet** (viande, poisson, féculents, laitages…) → caché sous **un dixième d'une portion habituelle** (5 g au minimum). C'est le poulet : 5 à 10 g qui manquent ne font pas acheter une barquette.
4. **Fond de placard** (huile, miel, sel, épices…) → déjà jamais sur la liste.

⚠️ Le seuil porte sur **ce qui reste à acheter**, réserve déduite : c'est là qu'apparaissent les petits restes de poulet ou de lait. Un article ajouté à la main n'est jamais caché.

**Effet mesuré** (6 profils : omnivore 5 et 7 jours, femme 58 kg, végétarien, vegan, pescétarien) :
- **première liste** (réserve vide), 36 semaines : **118 lignes cachées sur 2030** (6 %) — toutes des garnitures ;
- **semaines suivantes** (la réserve garde les restes des paquets), 30 semaines : **56 sur 994** (6 %) — dont les petits restes de plat : 5 g de cabillaud, 5 g d'œuf, 10 g d'oignon, 15 g d'avocat, 25 ml de lait.

Colonne *Cachées* : « première liste · semaines suivantes », en nombre de semaines où la ligne aurait disparu sur celles où l'aliment apparaît.

## 1. Ce qui accompagne le plat — 22 aliments

| Aliment | Rôle | Portion habituelle | Besoin d'une semaine (min – médiane – max) | Paquet vendu | **Seuil** | Cachées | Remarque |
|---|---|---|---|---|---|---|---|
| Cacao maigre en poudre | arôme | 8 g | 10 – 15 – 20 g | 250 g | **10 g** | 2 / 5 · 1 / 2 |  |
| Dattes dénoyautées | fruit | 35 g | 15 – 30 – 125 g | 250 g | **10 g** | 0 / 25 · 0 / 3 | seuil bas, demandé par le fondateur |
| Graines de courge | matière grasse | 10 g | 5 – 15 – 45 g | 150 g | **10 g** | 11 / 24 · 1 / 4 |  |
| Levure maltée | arôme | 8 g | 40 – 40 – 40 g | 150 g | **10 g** | 0 / 4 · 1 / 2 |  |
| Amandes | matière grasse | 12 g | 5 – 60 – 155 g | 200 g / 500 g | **15 g** | 6 / 35 · 2 / 9 |  |
| Beurre d'amande | matière grasse | 15 g | 10 – 25 – 85 g | 250 g | **15 g** | 6 / 18 · 1 / 4 |  |
| Beurre de cacahuète | matière grasse | 15 g | 10 – 35 – 80 g | 350 g | **15 g** | 5 / 35 · 1 / 1 |  |
| Chocolat noir 70% | matière grasse | 12 g | 5 – 5 – 5 g | 100 g | **15 g** | 5 / 5 · 2 / 2 |  |
| Graines de chia | matière grasse | 12 g | 10 – 10 – 40 g | 200 g | **15 g** | 13 / 19 · 2 / 2 |  |
| Noisettes | matière grasse | 12 g | 5 – 10 – 40 g | 125 g | **15 g** | 22 / 28 · 2 / 3 |  |
| Noix | matière grasse | 12 g | 5 – 10 – 20 g | 100 g / 200 g | **15 g** | 20 / 21 · 3 / 3 |  |
| Parmesan | matière grasse | 15 g | 10 – 25 – 60 g | 70 g | **15 g** | 4 / 18 · 3 / 7 |  |
| Purée de sésame (tahini) | matière grasse | 15 g | 10 – 30 – 60 g | 300 g | **15 g** | 3 / 19 · 1 / 1 |  |
| Sauce soja | arôme | 15 ml | 10 – 15 – 35 ml | 150 ml | **15 ml** | 4 / 6 · 1 / 1 |  |
| Sirop d'érable | fruit | 12 g | 10 – 12 – 15 g | 250 ml | **15 g** | 4 / 4 · 3 / 3 | sucrant |
| Chapelure | féculent | 25 g | 25 – 25 – 25 g | 250 g | **25 g** | 1 / 1 · 0 / 0 | enrobage |
| Mozzarella light | protéine | 25 g | — | 125 g | **25 g** | 0 / 0 · 0 / 0 | fromage de garniture |
| Olives | matière grasse | 25 g | 25 – 40 – 185 g | 150 g | **25 g** | 2 / 12 · 3 / 4 |  |
| Pesto | matière grasse | 27 g | 30 – 30 – 30 g | 190 g | **30 g** | 3 / 3 · 0 / 0 | une recette entière en demande 30 g : la ligne disparaît chaque fois |
| Feta | matière grasse | 40 g | 15 – 20 – 60 g | 200 g | **40 g** | 4 / 7 · 2 / 4 |  |
| Crème de soja | matière grasse | 45 ml | 55 – 80 – 280 ml | 20 cl | **45 ml** | 0 / 7 · 2 / 6 |  |
| Lait de coco | matière grasse | 50 ml | 30 – 120 – 325 ml | 200 ml / 400 ml | **50 ml** | 3 / 26 · 5 / 13 | la base d'un curry, mais 30–40 ml n'en est qu'une touche |

## 2. Ce qui fait le plat et s'achète à la pièce — 16 aliments

| Aliment | Une pièce | **Seuil (un dixième)** | Cachées |
|---|---|---|---|
| Ananas | ~500 g | **50 g** | 0 / 8 · 0 / 2 |
| Avocat | ~150 g | **15 g** | 0 / 34 · 1 / 20 |
| Banane | ~120 g | **10 g** | 0 / 34 · 0 / 28 |
| Brocoli | ~350 g | **35 g** | 0 / 30 · 0 / 19 |
| Carotte | ~100 g | **10 g** | 0 / 27 · 0 / 22 |
| Chou-fleur | ~600 g | **60 g** | 0 / 21 · 0 / 3 |
| Concombre | ~350 g | **35 g** | 0 / 23 · 2 / 7 |
| Courgette | ~200 g | **20 g** | 0 / 13 · 0 / 10 |
| Kiwi | ~75 g | **5 g** | 0 / 18 · 0 / 14 |
| Mangue | ~250 g | **25 g** | 0 / 20 · 1 / 14 |
| Oignon | ~100 g | **10 g** | 0 / 32 · 3 / 25 |
| Patate douce | ~300 g | **30 g** | 0 / 27 · 0 / 22 |
| Poivron | ~150 g | **15 g** | 0 / 28 · 1 / 20 |
| Pomme | ~150 g | **15 g** | 0 / 31 · 0 / 25 |
| Salade verte | ~250 g | **25 g** | 0 / 15 · 0 / 5 |
| Tomate | ~120 g | **10 g** | 0 / 26 · 1 / 19 |

## 3. Ce qui fait le plat et s'achète en paquet — 91 aliments

Seuil = un dixième de la portion habituelle, 5 g au minimum. Groupés par seuil :

- **5 g** — Betterave cuite, Boulettes végétales, Boulgour, Champignons, Chorizo végétal, Châtaigne (1 fois), Escalope de dinde, Falafels prêts à consommer, Flocons d'avoine (1 fois), Framboises, Fruits rouges (mélange), Fèves sèches décortiquées, Galette de riz soufflé (1 fois), Jambon blanc, Jambon végétal, Lardons végétaux, Lentilles corail, Maïs, Merguez végétales, Millet (1 fois), Myrtilles, Nouilles complètes, Nouilles de riz, Nuggets végétaux panés, Pain complet, Pain de seigle, Pain pita complet, Pain sans gluten, Petits pois, Pois cassés, Polenta, Protéine de soja texturée (PST), Protéine végétale (pois/soja), Pâtes (semoule), Pâtes complètes, Quinoa, Raisins, Riz basmati, Riz complet, Roquette, Sardines (conserve égouttées), Sarrasin, Saucisses végétales (tofu), Saumon fumé, Seitan, Semoule de couscous, Steak végétal (soja), Thon frais, Tortilla blé complet (2 fois), Whey (neutre/vanille), Wrap / tortilla sans gluten, Yaourt grec égoutté (type Fage), Épinards frais.
- **10 g** — Aiguillettes de poulet végétal, Asperges, Bavette de bœuf, Blanc d'œuf, Burger végétal (blé et soja), Cottage cheese, Crevettes cuites, Edamame, Filet mignon de porc, Filets de poulet végétal, Haricots rouges (conserve, égouttés), Haricots verts, Mélange wok (poivron/brocoli/carotte), Pavé de saumon, Pois chiches (conserve, égouttés), Ratatouille de légumes, Steak haché végétal (soja), Tempeh, Thon au naturel (conserve), Tofu fumé, Tomate concassée, Émincés de poulet végétal (soja et blé), Œuf entier (1 fois).
- **15 g** — Bœuf haché 5% MG, Dos de cabillaud (1 fois), Filet de poulet, Fromage blanc 0%, Haricots blancs (conserve, égouttés) (1 fois), Haricots noirs (conserve, égouttés), Lentilles cuites (conserve ou sachet), Maquereau, Skyr nature, Tofu ferme, Tofu soyeux, Yaourt de soja protéiné.
- **20 ml** — Lait d'amande.
- **25 g / ml** — Lait demi-écrémé (1 fois), Pomme de terre (1 fois).

*Entre parenthèses : combien de fois la ligne aurait disparu dans les semaines suivantes.*

⚠️ Cas limites, à regarder : **lait** (seuil 25 ml) · **flocons d'avoine** (une semaine en demande parfois 10 g, quand il sert à épaissir) · **merguez végétales** (classées « matière grasse » par le catalogue, traitées comme une pièce de protéine) · **blanc d'œuf** (aucun format vendu, jamais caché en pratique).

## 4. Fonds de placard

Huile d'olive, Miel — et le sel, le poivre, les épices, le citron, la moutarde, le vinaigre (`lib/pantry.ts::STAPLES`).

## Ensuite

Codé dans `lib/formatsVendus.ts` (une table `SEUIL` à côté des formats), appliqué à la liste générée seulement, livré avec #376 dans la 61ᵉ OTA.