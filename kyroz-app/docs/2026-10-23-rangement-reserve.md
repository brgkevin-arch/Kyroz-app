# Le rangement de la Réserve, aliment par aliment (point 5, 2026-10-23)

> Demande du fondateur (point 5 avant la 62ᵉ OTA) : *« vérifier aliment par aliment le
> rangement frais / sec »*. ⚠️ **Généré depuis le code** par `npx tsx scripts/gen-rangement-reserve.ts` :
> le rayon et le rangement sont ceux que l'app donne VRAIMENT à un aliment qui arrive des
> courses (`pantry.ts::categorize`, `conservationDe`). Ne pas l'éditer à la main.
>
>
> ✅ **Validé par le fondateur le 2026-10-23** (« je valide et oui fermés tous au sec ») :
> 24 corrections (12 au frais, 12 au sec) et 2 rayons, appliquées dans
> `pantry.ts::RANGEMENT_PAR_ALIMENT` et `categorize` (un mot-clé ne compte plus qu'en début
> de mot). Garde-fou : `lib/__tests__/rangementReserve.test.ts`.
> **129 aliments** (servis par au moins une recette, hors fonds de placard) ·
> **0 décision non appliquée** par le code.

## La règle (fondateur, 2026-10-23)

- **Au frais = au frigo.** *« Tu ne mets pas une banane au frigo. Rares sont les fruits qui y
  vont. »* Chaque aliment est rangé là où les sources ci-dessous le mettent.
- **Au sec = tout le reste** : placard, corbeille à fruits, endroit sombre et aéré.
- Les **surgelés** (edamame, fruits rouges, mélange wok, petits pois, vendus en sachet
  surgelé) restent au frais : le congélateur n'a pas de case à lui, le froid va avec le froid.
- Dans le doute (une marque le vend au frais, une autre non), le frigo : un produit du rayon
  frais oublié au placard est un risque, l'inverse non.
- Toujours corrigeable d'une touche dans la Réserve, et la correction l'emporte.

### Tranché : les briques UHT et les pots fermés vont au sec

Lait demi-écrémé, crème de soja, lait d'amande, lait de coco, tofu soyeux en brique [5],
pesto, sirop d'érable : **placard tant que c'est fermé, frigo une fois ouvert**. La Réserve
reçoit des paquets fermés à « Courses terminées » : **au sec pour tous** (décision du
2026-10-23 ; le lait et la crème de soja étaient au frais, les cinq autres au sec).

### Au frais aujourd'hui (61)

| Aliment | Rayon | Décidé le 2026-10-23 |
|---|---|---|
| Boulettes végétales | Autres | rayon frais, comme les autres similis déjà au frais |
| Burger végétal (blé et soja) | Autres | rayon frais, comme les autres similis déjà au frais |
| Falafels prêts à consommer | Autres | prêts à consommer : rayon traiteur frais |
| Lardons végétaux | Autres | rayon frais, comme les autres similis déjà au frais |
| Merguez végétales | Autres | rayon frais, comme les autres similis déjà au frais |
| Nuggets végétaux panés | Autres | rayon frais, comme les autres similis déjà au frais |
| Saucisses végétales (tofu) | Autres | rayon frais, comme les autres similis déjà au frais |
| Seitan | Autres | frigo (même remarque que le tempeh) [4] |
| Tempeh | Autres | frigo (certaines marques bio le vendent pasteurisé, au frigo une fois ouvert) [4] |
| Tofu ferme | Autres | rayon frais [4] |
| Tofu fumé | Autres | rayon frais [4] |
| Asperges | Légumes & fruits |  |
| Betterave cuite | Légumes & fruits |  |
| Brocoli | Légumes & fruits |  |
| Carotte | Légumes & fruits |  |
| Champignons | Légumes & fruits |  |
| Chou-fleur | Légumes & fruits |  |
| Concombre | Légumes & fruits |  |
| Courgette | Légumes & fruits |  |
| Edamame | Légumes & fruits |  |
| Épinards frais | Légumes & fruits |  |
| Framboises | Légumes & fruits |  |
| Fruits rouges (mélange) | Légumes & fruits |  |
| Haricots verts | Légumes & fruits |  |
| Kiwi | Légumes & fruits |  |
| Mélange wok (poivron/brocoli/carotte) | Légumes & fruits |  |
| Myrtilles | Légumes & fruits |  |
| Petits pois | Légumes & fruits |  |
| Poivron | Légumes & fruits |  |
| Raisins | Légumes & fruits |  |
| Roquette | Légumes & fruits |  |
| Salade verte | Légumes & fruits |  |
| Blanc d'œuf | Produits laitiers & œufs |  |
| Cottage cheese | Produits laitiers & œufs |  |
| Feta | Produits laitiers & œufs |  |
| Fromage blanc 0% | Produits laitiers & œufs |  |
| Mozzarella light | Produits laitiers & œufs |  |
| Œuf entier | Produits laitiers & œufs |  |
| Parmesan | Produits laitiers & œufs |  |
| Skyr nature | Produits laitiers & œufs |  |
| Yaourt de soja protéiné | Produits laitiers & œufs |  |
| Yaourt grec égoutté (type Fage) | Produits laitiers & œufs |  |
| Aiguillettes de poulet végétal | Viandes & poissons |  |
| Bavette de bœuf | Viandes & poissons |  |
| Bœuf haché 5% MG | Viandes & poissons |  |
| Chorizo végétal | Viandes & poissons | rayon frais ; et « chorizo » contient « riz », d'où le rayon Féculents |
| Crevettes cuites | Viandes & poissons |  |
| Dos de cabillaud | Viandes & poissons |  |
| Émincés de poulet végétal (soja et blé) | Viandes & poissons |  |
| Escalope de dinde | Viandes & poissons |  |
| Filet de poulet | Viandes & poissons |  |
| Filet mignon de porc | Viandes & poissons |  |
| Filets de poulet végétal | Viandes & poissons |  |
| Jambon blanc | Viandes & poissons |  |
| Jambon végétal | Viandes & poissons |  |
| Maquereau | Viandes & poissons |  |
| Pavé de saumon | Viandes & poissons |  |
| Saumon fumé | Viandes & poissons |  |
| Steak haché végétal (soja) | Viandes & poissons |  |
| Steak végétal (soja) | Viandes & poissons |  |
| Thon frais | Viandes & poissons |  |

### Au sec aujourd'hui (68)

| Aliment | Rayon | Décidé le 2026-10-23 |
|---|---|---|
| Amandes | Autres |  |
| Beurre d'amande | Autres |  |
| Beurre de cacahuète | Autres |  |
| Cacao maigre en poudre | Autres |  |
| Châtaigne | Autres |  |
| Chocolat noir 70% | Autres |  |
| Dattes dénoyautées | Autres |  |
| Graines de chia | Autres |  |
| Graines de courge | Autres |  |
| Lait d'amande | Autres |  |
| Lait de coco | Autres |  |
| Levure maltée | Autres |  |
| Noisettes | Autres |  |
| Noix | Autres |  |
| Olives | Autres |  |
| Pesto | Autres |  |
| Protéine de soja texturée (PST) | Autres |  |
| Protéine végétale (pois/soja) | Autres |  |
| Purée de sésame (tahini) | Autres |  |
| Sauce soja | Autres |  |
| Sirop d'érable | Autres |  |
| Tofu soyeux | Autres |  |
| Whey (neutre/vanille) | Autres |  |
| Boulgour | Féculents |  |
| Chapelure | Féculents |  |
| Fèves sèches décortiquées | Féculents |  |
| Flocons d'avoine | Féculents |  |
| Galette de riz soufflé | Féculents |  |
| Haricots blancs (conserve, égouttés) | Féculents |  |
| Haricots noirs (conserve, égouttés) | Féculents |  |
| Haricots rouges (conserve, égouttés) | Féculents |  |
| Lentilles corail | Féculents | lentilles sèches ; et « corail » contient « ail », d'où le rayon Légumes |
| Lentilles cuites (conserve ou sachet) | Féculents |  |
| Millet | Féculents |  |
| Nouilles complètes | Féculents |  |
| Nouilles de riz | Féculents |  |
| Pain complet | Féculents |  |
| Pain de seigle | Féculents |  |
| Pain pita complet | Féculents |  |
| Pain sans gluten | Féculents |  |
| Pâtes (semoule) | Féculents |  |
| Pâtes complètes | Féculents |  |
| Pois cassés | Féculents |  |
| Pois chiches (conserve, égouttés) | Féculents |  |
| Polenta | Féculents |  |
| Quinoa | Féculents |  |
| Riz basmati | Féculents |  |
| Riz complet | Féculents |  |
| Sarrasin | Féculents |  |
| Semoule de couscous | Féculents |  |
| Tortilla blé complet | Féculents |  |
| Wrap / tortilla sans gluten | Féculents |  |
| Ananas | Légumes & fruits | air ambiant, il craint le froid (< 7 °C) [1] |
| Avocat | Légumes & fruits | température ambiante tant qu'il est entier [1] |
| Banane | Légumes & fruits | corbeille : au frigo elle noircit et perd son goût [1] |
| Maïs | Légumes & fruits |  |
| Mangue | Légumes & fruits | mûrit à l'air libre, en corbeille [1] |
| Oignon | Légumes & fruits | endroit sombre et aéré [1] |
| Patate douce | Légumes & fruits | au sec, comme la pomme de terre [1] |
| Pomme | Légumes & fruits | corbeille, 7 à 8 jours à l'air ambiant [1] |
| Pomme de terre | Légumes & fruits | endroit frais et sec, à l'abri de la lumière [1] |
| Ratatouille de légumes | Légumes & fruits |  |
| Tomate | Légumes & fruits | température ambiante : le froid la rend farineuse [1][2] |
| Tomate concassée | Légumes & fruits |  |
| Crème de soja | Produits laitiers & œufs | brique UHT fermée : placard (frigo une fois ouverte) — comme le lait d'amande et le lait de coco |
| Lait demi-écrémé | Produits laitiers & œufs | brique UHT fermée : placard (frigo une fois ouverte) — comme le lait d'amande et le lait de coco |
| Sardines (conserve égouttées) | Viandes & poissons |  |
| Thon au naturel (conserve) | Viandes & poissons |  |

### Jamais en Réserve

Fonds de placard, supposés toujours là (`isStaple`) : Huile d'olive, Miel.

## Sources

- [1] Interfel, lesfruitsetlegumesfrais.com — fiches « choisir et conserver » (banane, avocat, ananas, mangue, pomme, kiwi, raisin, framboise, myrtille, concombre, poivron, carotte, brocoli, chou-fleur, épinard, asperge, champignon, pomme de terre, patate douce, oignon, betterave).
- [2] Ministère de l'Agriculture, « Comment bien conserver ses légumes ? » (agriculture.gouv.fr) — la tomate garde mieux son goût à l'air libre ; la plupart des légumes au bac à légumes.
- [3] ANSES (rapporté par Allodocteurs) — des œufs vendus à température ambiante n'ont pas besoin du frigo ; choisir l'un ou l'autre et s'y tenir.
- [4] Fiches produit Celnat (Greenweez) — tempeh et seitan : « une fois ouvert, à conserver au réfrigérateur entre 0 °C et 4 °C ».
- [5] Mori-Nu — tofu soyeux en brique aseptique : pas de frigo avant ouverture.

Œufs : laissés au frais. Vendus à température ambiante en France, ils n'ont pas besoin du
frigo, mais ils peuvent y aller tant qu'on ne les en sort pas [3] — c'est l'usage le plus
courant. Kiwi et raisin restent au frais : au bac à légumes selon Interfel [1] (le kiwi mûrit
en corbeille, il se garde ensuite au frigo). Courgette : les fiches d'Interfel divergent
(« endroit frais et sec », « moins d'une semaine au frais ») ; laissée au frais, comme le
concombre et le poivron (bac à légumes) [1].
