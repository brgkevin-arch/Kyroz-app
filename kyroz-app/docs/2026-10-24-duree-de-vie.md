# La durée de vie de chaque aliment, sourcée (2026-10-24)

> Demande du fondateur : *« je veux que l'user ne jette rien »*, avec *« une table sourcée et plus
> précise pour les DLC »*, et sa part : *« il congèle ce qu'il peut, on ne pourra pas tout sauver »*.
> ⚠️ **Généré depuis le code** par `npx tsx scripts/gen-duree-de-vie.ts` (`lib/dureeDeVie.ts`).
> Ne pas éditer à la main. **En attente de validation par le fondateur.**

## Les règles

- 🔴 **La DLC imprimée fait toujours foi.** Elle est fixée par le fabricant : par exemple 10 jours de
  vie au total pour un filet de poulet sous atmosphère [12]. Mais l'app ne sait pas ce qu'il en
  reste le jour de l'achat : elle ne lit pas l'étiquette.
- L'app retient donc la **borne basse** des guides de conservation. Elle compte en jours depuis
  les courses, emballage fermé, et depuis le premier repas qui entame l'aliment. Elle ne doit jamais
  compter sur un aliment qui a pu tourner.
- Quand aucune source publique ne donne la durée d'un emballage fermé (similis, tempeh, seitan,
  betterave sous vide, falafels), c'est l'étiquette qui le dit. L'app applique alors **7 jours**, une
  prudence **non sourcée**, signalée « défaut » dans le tableau.
- La congélation : ce que les sources disent possible à la maison, et pour combien de mois de qualité
  (à −18 °C, la sécurité ne s'arrête pas [2]). « Non documenté » = aucune source trouvée : l'app ne
  le compte pas comme congelable.
- Vendus **surgelés**, donc jamais un reste à sauver : Edamame, Fruits rouges (mélange), Mélange wok (poivron/brocoli/carotte), Petits pois.

## Viandes, poissons et similis (19)

| Aliment | Au frigo, fermé | Entamé | Kyroz retient | Congélation | Sources | Note |
|---|---|---|---|---|---|---|
| Aiguillettes de poulet végétal | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Bavette de bœuf | 3 à 5 jours | 2 jours | **3 j après les courses ; entamé, 2 j** | oui, 4 à 12 mois | [1][2][3] |  |
| Bœuf haché 5% MG | 1 à 2 jours | le jour même à 1 jour | **1 j après les courses ; entamé, le jour même** | oui, 3 à 4 mois | [1][2][3] | haché : 24 h une fois ouvert [3], « le jour de l'ouverture » sur les barquettes |
| Chorizo végétal | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Crevettes cuites | 1 à 3 jours | 1 jour | **1 j après les courses, entamé ou non** | non | [1][3][13] | souvent vendues décongelées : ne pas recongeler [13] |
| Dos de cabillaud | 1 à 2 jours | 1 jour | **1 j après les courses, entamé ou non** | oui, 6 à 8 mois | [1][2][3] |  |
| Escalope de dinde | 1 à 2 jours | 2 jours | **1 j après les courses, entamé ou non** | oui, 9 mois | [1][2][3] |  |
| Filet de poulet | 1 à 2 jours | 2 jours | **1 j après les courses, entamé ou non** | oui, 9 mois | [1][2][3] |  |
| Filet mignon de porc | 3 à 5 jours | 2 jours | **3 j après les courses ; entamé, 2 j** | oui, 4 à 12 mois | [1][2][3] |  |
| Filets de poulet végétal | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Jambon blanc | 14 jours | 1 à 4 jours | **14 j après les courses ; entamé, 1 j** | oui, 1 à 2 mois | [1][3][4][8] | entamé : 24 h à 2 jours selon les marques [8], 3 à 4 jours [3] ; FoodKeeper donne 1 à 2 mois au congélateur, mais le déconseille pour la texture |
| Jambon végétal | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Maquereau | 1 à 2 jours | 1 jour | **1 j après les courses, entamé ou non** | oui, 2 à 3 mois | [1][2][3] | frais ; fumé, il tiendrait comme le saumon fumé |
| Pavé de saumon | 1 à 2 jours | 1 jour | **1 j après les courses, entamé ou non** | oui, 2 à 3 mois | [1][2][3] | poisson cru : 18 à 24 h [3] |
| Saumon fumé | 21 à 30 jours | 1 à 6 jours | **21 j après les courses ; entamé, 1 j** | oui, 9 à 12 mois | [1][5] | entamé : 24 h (Delpeyrat), 48 h (Pomona), 6 jours (Côte Sauvage) [5] |
| Steak haché végétal (soja) | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Steak végétal (soja) | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Thon frais | 1 à 2 jours | 1 jour | **1 j après les courses, entamé ou non** | oui, 2 à 3 mois | [1][2][3] |  |
| Émincés de poulet végétal (soja et blé) | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |

## Œufs et produits laitiers (10)

| Aliment | Au frigo, fermé | Entamé | Kyroz retient | Congélation | Sources | Note |
|---|---|---|---|---|---|---|
| Blanc d'œuf | 7 jours | 2 à 4 jours | **7 j après les courses ; entamé, 2 j** | oui, 12 mois | [1][3] | blanc cru : 1 semaine, à cuire [3] |
| Cottage cheese | 14 jours | 7 jours | **14 j après les courses ; entamé, 7 j** | non documenté | [1] |  |
| Feta | 7 à 14 jours | 4 à 7 jours | **7 j après les courses ; entamé, 4 j** | non documenté | [1][7] | gardée dans sa saumure [7] |
| Fromage blanc 0% | 7 à 10 jours | — | **7 j après les courses** | oui, 1 à 2 mois | [1][11] | FoodKeeper « quark » ; environ 7 jours [11] ; congelé, la texture change |
| Mozzarella light | 7 à 14 jours | 5 à 7 jours | **7 j après les courses ; entamé, 5 j** | non documenté | [1][6][11] | dans son liquide, en boîte fermée [6] |
| Parmesan | 180 jours | 21 à 28 jours | **180 j après les courses ; entamé, 21 j** | oui, 6 mois | [1] |  |
| Skyr nature | 7 à 14 jours | — | **7 j après les courses** | oui, 1 à 2 mois | [1][3][4] | yaourt : consommable une à deux semaines après la DLC [4] ; congelé, la texture change |
| Yaourt de soja protéiné | 7 à 14 jours | 5 jours | **7 j après les courses ; entamé, 5 j** | non documenté | [1][9] | Alpro : 5 jours après ouverture (dessert et boisson soja) [9] |
| Yaourt grec égoutté (type Fage) | 7 à 14 jours | — | **7 j après les courses** | oui, 1 à 2 mois | [1][4] |  |
| Œuf entier | 21 à 35 jours | — | **21 j après les courses** | non | [1][2][3][4] | pas en coquille ; battus, 12 mois [2] |

## Tofu, tempeh, seitan et traiteur (11)

| Aliment | Au frigo, fermé | Entamé | Kyroz retient | Congélation | Sources | Note |
|---|---|---|---|---|---|---|
| Boulettes végétales | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Burger végétal (blé et soja) | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Falafels prêts à consommer | l'étiquette | 1 à 2 jours | **7 j après les courses (défaut non sourcé) ; entamé, 1 j** | non documenté | [10] | les marques disent « rapidement après ouverture », sans durée [10] |
| Lardons végétaux | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Merguez végétales | l'étiquette | 3 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 1 à 2 mois | [1][8] |  |
| Nuggets végétaux panés | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1][8] |  |
| Saucisses végétales (tofu) | l'étiquette | 3 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 1 à 2 mois | [1][8] | saucisses végétales Herta : 3 jours après ouverture [8] |
| Seitan | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 12 à 18 mois | [1] | FoodKeeper « substituts de viande au soja » |
| Tempeh | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 6 mois | [1] |  |
| Tofu ferme | 7 jours | 3 à 4 jours | **7 j après les courses ; entamé, 3 j** | oui, 5 mois | [1][11] | dans l'eau, changée chaque jour ; congelé, il devient spongieux |
| Tofu fumé | 7 jours | 3 à 4 jours | **7 j après les courses ; entamé, 3 j** | oui, 5 mois | [1][11] |  |

## Fruits et légumes (17)

| Aliment | Au frigo, fermé | Entamé | Kyroz retient | Congélation | Sources | Note |
|---|---|---|---|---|---|---|
| Asperges | 3 à 4 jours | — | **3 j après les courses** | oui, 5 mois | [1] |  |
| Betterave cuite | l'étiquette | 3 à 4 jours | **7 j après les courses (défaut non sourcé) ; entamé, 3 j** | oui, 6 à 8 mois | [1] | cuite sous vide : l'étiquette ; ouverte, comme un légume cuit |
| Brocoli | 3 à 5 jours | — | **3 j après les courses** | oui, 10 à 12 mois | [1] |  |
| Carotte | 14 à 21 jours | — | **14 j après les courses** | oui, 10 à 12 mois | [1] |  |
| Champignons | 3 à 7 jours | — | **3 j après les courses** | oui, 10 à 12 mois | [1] |  |
| Chou-fleur | 3 à 5 jours | — | **3 j après les courses** | oui, 10 à 12 mois | [1] |  |
| Concombre | 4 à 6 jours | — | **4 j après les courses** | non | [1] |  |
| Courgette | 4 à 7 jours | — | **4 j après les courses** | oui, 10 à 12 mois | [1] |  |
| Framboises | 2 à 3 jours | — | **2 j après les courses** | oui, 8 à 12 mois | [1] |  |
| Haricots verts | 3 à 5 jours | — | **3 j après les courses** | oui, 8 mois | [1] |  |
| Kiwi | 3 à 6 jours | — | **3 j après les courses** | non documenté | [1] | mûr |
| Myrtilles | 7 à 14 jours | — | **7 j après les courses** | oui, 8 à 12 mois | [1] |  |
| Poivron | 4 à 14 jours | — | **4 j après les courses** | oui, 6 à 8 mois | [1] |  |
| Raisins | 7 jours | — | **7 j après les courses** | oui, 1 mois | [1] | grains entiers |
| Roquette | 3 à 7 jours | 2 jours | **3 j après les courses ; entamé, 2 j** | non | [1] |  |
| Salade verte | 3 à 7 jours | — | **3 j après les courses** | non | [1] |  |
| Épinards frais | 3 à 5 jours | 2 jours | **3 j après les courses ; entamé, 2 j** | oui, 10 à 12 mois | [1] | en sachet : 2 jours une fois ouvert |

## Sources

- [1] USDA FSIS, FoodKeeper, base de données ouverte (CC0), fiches produit : réfrigérateur après achat, après ouverture, congélateur. https://catalog.data.gov/dataset/fsis-foodkeeper-data, consultée le 2026-10-24.
- [2] FoodSafety.gov (USDA, FDA, CDC), « Cold Food Storage Chart », revu le 19 septembre 2023. https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts
- [3] Que Choisir, « La durée de conservation des aliments dans le réfrigérateur », 5 mai 2021 : viande crue entamée 48 h, viande hachée 24 h, poissons crus 18 à 24 h, charcuterie entamée 3 à 4 jours, œufs 3 semaines à 1 mois, blanc d'œuf cru 1 semaine. https://www.quechoisir.org/conseils-refrigerateur-duree-de-conservation-des-aliments-dans-le-refrigerateur-n8507/
- [4] INC (Institut national de la consommation), « Tableaux de conservation des denrées alimentaires, Ne jetez pas systématiquement vos denrées ! », 27 novembre 2015 : viande et poisson à la découpe 48 h, jambon emballé DLC à respecter, yaourt consommable après la DLC, œufs à DDM. https://www.inc-conso.fr/sites/default/files/pdf/tableau_DLC.pdf
- [5] Fiches produit de saumon fumé : Delpeyrat (Auchan) 24 h après ouverture, Pomona 48 h, Côte Sauvage (Supermarchés Match) 6 jours.
- [6] Test-Achats (réponse d'expert, mozzarella) : restes dans leur liquide, en boîte hermétique, jusqu'à 5 jours.
- [7] Croq-Kilos, « Comment bien conserver la feta » : 4 à 7 jours une fois ouverte, dans sa saumure. Source grand public, à défaut d'une source officielle.
- [8] Fiches produit Herta : saucisses végétales Knacki, 3 jours après ouverture ; jambon et lardons, 24 h à 2 jours après ouverture.
- [9] Fiches produit Alpro (Auchan) : dessert végétal soja et boisson soja protéinée, 5 jours après ouverture.
- [10] Fiches produit de falafels frais (Frais & Malin, Florentin, Greenweez) : « consommer rapidement après ouverture », sans durée.
- [11] Liebherr FreshMag (fabricant de réfrigérateurs) : tofu entamé environ 4 jours ; fromage blanc environ 7 jours ; mozzarella ouverte jusqu'à une semaine.
- [12] Fiches techniques Pomona : filet de poulet sous atmosphère, durée de vie totale 10 jours ; steak haché frais, 12 jours à 0–2 °C. La DLC est fixée par le fabricant.
- [13] Test-Achats, « Les ficelles de la congélation » : un aliment décongelé s'utilise dans les 24 h et ne se recongèle pas.
