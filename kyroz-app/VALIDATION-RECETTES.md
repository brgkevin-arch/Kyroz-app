# Kyroz — Dossier de validation diététicienne

> **But** : faire valider les recettes par une diététicienne-nutritionniste diplômée
> avant mise en production (CLAUDE.md §6). Tant que la validation n’est pas faite,
> le champ `validated_by_dietitian` reste à `false` dans `lib/recipes.ts`.
>
> **Comment l’utiliser** : la diététicienne coche chaque recette (colonne *OK ?*),
> note ses remarques, puis on bascule `validated_by_dietitian` à `true` recette par recette.

**Nombre de recettes : 50**  ·  Généré automatiquement depuis `lib/recipes.ts`.

## ⚠️ Contrôle automatique de cohérence des macros

kcal annoncées vs kcal recalculées (protéines ×4 + glucides ×4 + lipides ×9). Écart > 10 % à revoir :

✅ Aucune incohérence > 10 %. Toutes les recettes sont cohérentes sur le plan énergétique.

## Tableau de synthèse

| ID | Recette | Type | Portions | Prép. | kcal | P (g) | G (g) | L (g) | OK ? | Remarques |
|---|---|---|---|---|---|---|---|---|---|---|
| r001 | Omelette blanche au fromage blanc | Petit-déj | 1 | 8’ | 320 | 38 | 6 | 16 | ☐ | |
| r002 | Flocons d'avoine protéinés | Petit-déj | 1 | 5’ | 380 | 28 | 52 | 6 | ☐ | |
| r003 | Poulet grillé riz basmati brocolis | Déjeuner, Dîner | 1 | 15’ | 520 | 48 | 58 | 8 | ☐ | |
| r004 | Saumon riz patate douce | Déjeuner, Dîner | 1 | 15’ | 560 | 42 | 54 | 18 | ☐ | |
| r005 | Bowl thon avocat quinoa | Déjeuner | 1 | 10’ | 490 | 38 | 40 | 18 | ☐ | |
| r006 | Steak haché patate douce salade | Déjeuner, Dîner | 1 | 12’ | 510 | 44 | 38 | 20 | ☐ | |
| r007 | Fromage blanc protéines amandes | Collation | 1 | 3’ | 250 | 22 | 14 | 10 | ☐ | |
| r008 | Shake whey banane | Collation | 1 | 2’ | 290 | 30 | 34 | 3 | ☐ | |
| r009 | Pâtes complètes sauce bolognaise maison | Dîner | 1 | 15’ | 590 | 46 | 68 | 12 | ☐ | |
| r010 | Oeufs brouillés épinards | Petit-déj, Dîner | 1 | 8’ | 340 | 28 | 6 | 22 | ☐ | |
| r011 | Porridge beurre de cacahuète & banane | Petit-déj | 1 | 7’ | 660 | 24 | 88 | 24 | ☐ | |
| r012 | Tartine avocat & œuf poché | Petit-déj | 1 | 10’ | 450 | 17 | 50 | 20 | ☐ | |
| r013 | Pâtes pesto & parmesan | Déjeuner, Dîner | 1 | 12’ | 660 | 21 | 75 | 31 | ☐ | |
| r014 | Risotto aux champignons | Déjeuner, Dîner | 1 | 20’ | 540 | 16 | 78 | 18 | ☐ | |
| r015 | Curry de pois chiches & riz basmati | Déjeuner, Dîner | 1 | 18’ | 630 | 19 | 95 | 19 | ☐ | |
| r016 | Smoothie avoine, fruits rouges & beurre d'amande | Petit-déj, Collation | 1 | 3’ | 520 | 19 | 72 | 17 | ☐ | |
| r017 | Tartine beurre de cacahuète & banane | Collation | 1 | 4’ | 375 | 12 | 50 | 14 | ☐ | |
| r018 | Riz au lait vanille | Collation | 1 | 25’ | 395 | 11 | 67 | 9 | ☐ | |
| r019 | Chili con carne haricots rouges & riz | Déjeuner, Dîner | 1 | 20’ | 560 | 30 | 86 | 11 | ☐ | |
| r020 | Gratin de pâtes au jambon | Déjeuner, Dîner | 1 | 22’ | 550 | 28 | 68 | 18 | ☐ | |
| r021 | Dahl de lentilles corail | Déjeuner, Dîner | 1 | 15’ | 540 | 24 | 82 | 12 | ☐ | |
| r022 | Tofu sauté légumes & nouilles | Déjeuner, Dîner | 1 | 12’ | 520 | 26 | 58 | 18 | ☐ | |
| r023 | Cabillaud, pommes de terre & haricots verts | Déjeuner, Dîner | 1 | 15’ | 470 | 40 | 48 | 10 | ☐ | |
| r024 | Crevettes ail & riz | Déjeuner, Dîner | 1 | 12’ | 460 | 34 | 62 | 7 | ☐ | |
| r025 | Œufs cocotte épinards & feta | Petit-déj, Dîner | 1 | 12’ | 380 | 26 | 8 | 27 | ☐ | |
| r026 | Salade lentilles, feta & tomates | Déjeuner | 1 | 8’ | 430 | 22 | 46 | 16 | ☐ | |
| r027 | Skyr, granola & myrtilles | Petit-déj, Collation | 1 | 3’ | 330 | 24 | 45 | 6 | ☐ | |
| r028 | Wrap poulet & crudités | Déjeuner | 1 | 10’ | 480 | 38 | 46 | 14 | ☐ | |
| r029 | Pancakes flocons & banane | Petit-déj, Collation | 1 | 12’ | 360 | 15 | 56 | 8 | ☐ | |
| r030 | Cottage cheese, concombre & pain complet | Collation, Petit-déj | 1 | 5’ | 280 | 26 | 30 | 6 | ☐ | |
| r031 | Pain perdu protéiné | Petit-déj | 1 | 10’ | 390 | 30 | 45 | 10 | ☐ | |
| r032 | Bowl skyr, flocons & framboises | Petit-déj, Collation | 1 | 4’ | 335 | 28 | 40 | 7 | ☐ | |
| r033 | Œufs brouillés, avocat & pain complet | Petit-déj | 1 | 9’ | 378 | 24 | 30 | 18 | ☐ | |
| r034 | Cottage cheese, ananas & amandes | Petit-déj, Collation | 1 | 3’ | 290 | 26 | 24 | 10 | ☐ | |
| r035 | Galettes de riz, fromage frais & dinde | Collation | 1 | 5’ | 270 | 24 | 30 | 6 | ☐ | |
| r036 | Wrap thon & crudités | Déjeuner | 1 | 8’ | 412 | 34 | 42 | 12 | ☐ | |
| r037 | Poke bowl saumon & edamame | Déjeuner, Dîner | 1 | 12’ | 496 | 36 | 52 | 16 | ☐ | |
| r038 | Poulet teriyaki & riz | Déjeuner, Dîner | 1 | 15’ | 501 | 45 | 60 | 9 | ☐ | |
| r039 | Boulettes de bœuf, semoule & courgettes | Déjeuner, Dîner | 1 | 18’ | 512 | 42 | 50 | 16 | ☐ | |
| r040 | Cabillaud, boulgour & ratatouille | Déjeuner, Dîner | 1 | 18’ | 442 | 40 | 48 | 10 | ☐ | |
| r041 | Omelette jambon-fromage & salade | Déjeuner, Dîner | 1 | 10’ | 376 | 34 | 6 | 24 | ☐ | |
| r042 | Buddha bowl pois chiches & feta | Déjeuner, Dîner | 1 | 12’ | 530 | 22 | 70 | 18 | ☐ | |
| r043 | Pâtes thon & tomate | Déjeuner, Dîner | 1 | 14’ | 548 | 38 | 72 | 12 | ☐ | |
| r044 | Curry de poulet coco & riz | Déjeuner, Dîner | 1 | 18’ | 559 | 44 | 62 | 15 | ☐ | |
| r045 | Thon snacké, patate douce & haricots verts | Déjeuner, Dîner | 1 | 16’ | 470 | 42 | 44 | 14 | ☐ | |
| r046 | Chili végétarien & riz | Déjeuner, Dîner | 1 | 20’ | 506 | 22 | 82 | 10 | ☐ | |
| r047 | Tartines saumon fumé & fromage frais | Petit-déj, Déjeuner | 1 | 6’ | 416 | 28 | 40 | 16 | ☐ | |
| r048 | Shake protéiné choco-banane | Collation | 1 | 2’ | 326 | 32 | 36 | 6 | ☐ | |
| r049 | Yaourt grec, granola & fruits rouges | Petit-déj, Collation | 1 | 3’ | 304 | 20 | 38 | 8 | ☐ | |
| r050 | Riz cantonais au poulet | Déjeuner, Dîner | 1 | 16’ | 508 | 34 | 66 | 12 | ☐ | |

## Détail par recette

### r001 — Omelette blanche au fromage blanc

- **Type** : Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 8 min
- **Macros / portion** : 320 kcal · 38 g protéines · 6 g glucides · 16 g lipides
- **Ingrédients** :
  - Blancs d'œuf — 200 g
  - Fromage blanc 0% — 100 g
  - Sel, poivre — 2 g
- **Préparation** :
  1. Battre les blancs d'œuf avec sel et poivre.
  2. Cuire dans une poêle antiadhésive 3 min.
  3. Ajouter le fromage blanc au centre, plier et servir.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r002 — Flocons d'avoine protéinés

- **Type** : Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 5 min
- **Macros / portion** : 380 kcal · 28 g protéines · 52 g glucides · 6 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 80 g
  - Lait demi-écrémé — 200 ml
  - Whey protéine vanille — 30 g
  - Banane — 60 g
- **Préparation** :
  1. Verser les flocons et le lait dans un bol.
  2. Micro-ondes 2 min, mélanger.
  3. Incorporer la whey et garnir de banane.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r003 — Poulet grillé riz basmati brocolis

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 15 min
- **Macros / portion** : 520 kcal · 48 g protéines · 58 g glucides · 8 g lipides
- **Ingrédients** :
  - Blanc de poulet — 200 g
  - Riz basmati cru — 100 g
  - Brocolis — 150 g
  - Huile d'olive — 8 g
  - Épices au choix — 3 g
- **Préparation** :
  1. Cuire le riz basmati à l'eau 12 min.
  2. Poêler le poulet 6 min de chaque côté avec épices.
  3. Faire revenir les brocolis 4 min.
  4. Assembler dans un bol.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r004 — Saumon riz patate douce

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 15 min
- **Macros / portion** : 560 kcal · 42 g protéines · 54 g glucides · 18 g lipides
- **Ingrédients** :
  - Pavé de saumon — 180 g
  - Riz complet cru — 80 g
  - Patate douce — 120 g
  - Citron — 20 g
- **Préparation** :
  1. Cuire le riz 12 min à l'eau.
  2. Enfourner la patate douce 10 min au micro-ondes.
  3. Poêler le saumon 4 min par face avec le citron.
  4. Dresser dans une assiette.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r005 — Bowl thon avocat quinoa

- **Type** : Déjeuner  ·  **Portions** : 1  ·  **Préparation** : 10 min
- **Macros / portion** : 490 kcal · 38 g protéines · 40 g glucides · 18 g lipides
- **Ingrédients** :
  - Thon en boîte au naturel — 150 g
  - Quinoa cuit — 120 g
  - Avocat — 80 g
  - Tomates cerises — 80 g
  - Citron, sel — 10 g
- **Préparation** :
  1. Réchauffer le quinoa 1 min.
  2. Trancher l'avocat, couper les tomates.
  3. Égoutter le thon.
  4. Assembler le bowl, assaisonner au citron.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r006 — Steak haché patate douce salade

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 510 kcal · 44 g protéines · 38 g glucides · 20 g lipides
- **Ingrédients** :
  - Steak haché 5% MG — 200 g
  - Patate douce — 150 g
  - Salade verte — 50 g
  - Moutarde — 10 g
- **Préparation** :
  1. Cuire la patate douce au micro-ondes 8 min.
  2. Poêler le steak 3 min par face.
  3. Dresser avec la salade et la moutarde.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r007 — Fromage blanc protéines amandes

- **Type** : Collation  ·  **Portions** : 1  ·  **Préparation** : 3 min
- **Macros / portion** : 250 kcal · 22 g protéines · 14 g glucides · 10 g lipides
- **Ingrédients** :
  - Fromage blanc 0% — 200 g
  - Amandes effilées — 20 g
  - Miel — 10 g
- **Préparation** :
  1. Verser le fromage blanc dans un bol.
  2. Ajouter les amandes et le miel.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r008 — Shake whey banane

- **Type** : Collation  ·  **Portions** : 1  ·  **Préparation** : 2 min
- **Macros / portion** : 290 kcal · 30 g protéines · 34 g glucides · 3 g lipides
- **Ingrédients** :
  - Whey protéine — 30 g
  - Banane — 100 g
  - Lait demi-écrémé — 200 ml
- **Préparation** :
  1. Mixer tous les ingrédients 30 secondes.
  2. Servir immédiatement.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r009 — Pâtes complètes sauce bolognaise maison

- **Type** : Dîner  ·  **Portions** : 1  ·  **Préparation** : 15 min
- **Macros / portion** : 590 kcal · 46 g protéines · 68 g glucides · 12 g lipides
- **Ingrédients** :
  - Pâtes complètes crues — 120 g
  - Bœuf haché 5% MG — 150 g
  - Sauce tomate — 100 g
  - Oignon — 50 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Faire revenir l'oignon dans l'huile 2 min.
  2. Ajouter le bœuf, cuire 5 min.
  3. Incorporer la sauce tomate, mijoter 5 min.
  4. Cuire les pâtes al dente 8 min, égoutter, mélanger.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r010 — Oeufs brouillés épinards

- **Type** : Petit-déj, Dîner  ·  **Portions** : 1  ·  **Préparation** : 8 min
- **Macros / portion** : 340 kcal · 28 g protéines · 6 g glucides · 22 g lipides
- **Ingrédients** :
  - Œufs entiers — 180 g
  - Épinards frais — 80 g
  - Huile d'olive — 8 g
  - Sel, poivre — 2 g
- **Préparation** :
  1. Battre les œufs avec sel et poivre.
  2. Faire revenir les épinards 2 min.
  3. Ajouter les œufs, remuer à feu doux jusqu'à prise.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r011 — Porridge beurre de cacahuète & banane

- **Type** : Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 7 min
- **Macros / portion** : 660 kcal · 24 g protéines · 88 g glucides · 24 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 80 g
  - Beurre de cacahuète — 30 g
  - Banane — 100 g
  - Lait demi-écrémé — 200 ml
- **Préparation** :
  1. Verser les flocons et le lait dans une casserole.
  2. Cuire à feu doux 4 min en remuant jusqu'à épaississement.
  3. Hors du feu, incorporer le beurre de cacahuète.
  4. Garnir de rondelles de banane et servir.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r012 — Tartine avocat & œuf poché

- **Type** : Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 10 min
- **Macros / portion** : 450 kcal · 17 g protéines · 50 g glucides · 20 g lipides
- **Ingrédients** :
  - Pain complet — 100 g
  - Avocat — 80 g
  - Œuf — 50 g
  - Huile d'olive — 5 g
  - Citron, sel, poivre — 5 g
- **Préparation** :
  1. Toaster les tranches de pain complet.
  2. Écraser l'avocat avec le citron, sel et poivre, étaler sur le pain.
  3. Pocher l'œuf 3 min dans l'eau frémissante.
  4. Déposer l'œuf sur la tartine, filet d'huile d'olive.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r013 — Pâtes pesto & parmesan

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 660 kcal · 21 g protéines · 75 g glucides · 31 g lipides
- **Ingrédients** :
  - Pâtes crues — 100 g
  - Pesto — 40 g
  - Parmesan — 15 g
  - Pignons de pin — 10 g
- **Préparation** :
  1. Cuire les pâtes al dente 9 min, réserver un peu d'eau de cuisson.
  2. Égoutter et mélanger au pesto, détendre avec l'eau de cuisson.
  3. Parsemer de parmesan râpé et de pignons torréfiés.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r014 — Risotto aux champignons

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 20 min
- **Macros / portion** : 540 kcal · 16 g protéines · 78 g glucides · 18 g lipides
- **Ingrédients** :
  - Riz arborio cru — 90 g
  - Champignons de Paris — 150 g
  - Oignon — 40 g
  - Parmesan — 20 g
  - Beurre — 15 g
  - Bouillon de légumes — 300 ml
- **Préparation** :
  1. Faire revenir l'oignon et les champignons.
  2. Ajouter le riz, nacrer 1 min.
  3. Mouiller au bouillon louche par louche en remuant 16 min.
  4. Hors du feu, incorporer beurre et parmesan, servir crémeux.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r015 — Curry de pois chiches & riz basmati

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 18 min
- **Macros / portion** : 630 kcal · 19 g protéines · 95 g glucides · 19 g lipides
- **Ingrédients** :
  - Pois chiches cuits — 150 g
  - Riz basmati cru — 70 g
  - Lait de coco — 80 ml
  - Épinards frais — 50 g
  - Pâte de curry & épices — 25 g
- **Préparation** :
  1. Cuire le riz basmati 11 min à l'eau.
  2. Faire revenir la pâte de curry, ajouter pois chiches et lait de coco.
  3. Mijoter 8 min, incorporer les épinards en fin de cuisson.
  4. Servir le curry sur le riz.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r016 — Smoothie avoine, fruits rouges & beurre d'amande

- **Type** : Petit-déj, Collation  ·  **Portions** : 1  ·  **Préparation** : 3 min
- **Macros / portion** : 520 kcal · 19 g protéines · 72 g glucides · 17 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 40 g
  - Beurre d'amande — 20 g
  - Banane — 100 g
  - Fruits rouges — 80 g
  - Lait demi-écrémé — 200 ml
- **Préparation** :
  1. Verser tous les ingrédients dans un blender.
  2. Mixer 45 secondes jusqu'à obtenir une texture lisse.
  3. Servir bien frais.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r017 — Tartine beurre de cacahuète & banane

- **Type** : Collation  ·  **Portions** : 1  ·  **Préparation** : 4 min
- **Macros / portion** : 375 kcal · 12 g protéines · 50 g glucides · 14 g lipides
- **Ingrédients** :
  - Pain complet — 60 g
  - Beurre de cacahuète — 25 g
  - Banane — 80 g
- **Préparation** :
  1. Toaster le pain complet.
  2. Étaler le beurre de cacahuète.
  3. Disposer les rondelles de banane par-dessus.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r018 — Riz au lait vanille

- **Type** : Collation  ·  **Portions** : 1  ·  **Préparation** : 25 min
- **Macros / portion** : 395 kcal · 11 g protéines · 67 g glucides · 9 g lipides
- **Ingrédients** :
  - Riz rond — 50 g
  - Lait entier — 250 ml
  - Sucre — 15 g
  - Vanille — 2 g
- **Préparation** :
  1. Porter le lait et la vanille à frémissement.
  2. Ajouter le riz, cuire à feu doux 20 min en remuant.
  3. Incorporer le sucre, laisser tiédir et servir.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r019 — Chili con carne haricots rouges & riz

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 20 min
- **Macros / portion** : 560 kcal · 30 g protéines · 86 g glucides · 11 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 70 g
  - Haricots rouges cuits — 150 g
  - Riz basmati cru — 60 g
  - Sauce tomate — 80 g
  - Oignon — 40 g
  - Épices chili — 4 g
- **Préparation** :
  1. Cuire le riz basmati 11 min à l'eau.
  2. Faire revenir l'oignon, ajouter le bœuf et les épices, cuire 5 min.
  3. Incorporer haricots rouges et sauce tomate, mijoter 8 min.
  4. Servir le chili sur le riz.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r020 — Gratin de pâtes au jambon

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 22 min
- **Macros / portion** : 550 kcal · 28 g protéines · 68 g glucides · 18 g lipides
- **Ingrédients** :
  - Pâtes crues — 90 g
  - Jambon — 50 g
  - Lait demi-écrémé — 150 ml
  - Emmental râpé — 30 g
  - Farine — 10 g
  - Beurre — 10 g
- **Préparation** :
  1. Cuire les pâtes al dente 9 min, égoutter.
  2. Préparer une béchamel avec beurre, farine et lait.
  3. Mélanger pâtes, dés de jambon et béchamel dans un plat.
  4. Couvrir d'emmental, gratiner 10 min au four.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r021 — Dahl de lentilles corail

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 15 min
- **Macros / portion** : 540 kcal · 24 g protéines · 82 g glucides · 12 g lipides
- **Ingrédients** :
  - Lentilles corail crues — 90 g
  - Riz basmati cru — 50 g
  - Lait de coco — 60 ml
  - Oignon — 40 g
  - Épices curry — 4 g
- **Préparation** :
  1. Faire revenir l'oignon avec les épices 2 min.
  2. Ajouter les lentilles, le lait de coco et 200 ml d'eau, mijoter 12 min.
  3. Cuire le riz à l'eau 10 min en parallèle.
  4. Servir le dahl sur le riz.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r022 — Tofu sauté légumes & nouilles

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 520 kcal · 26 g protéines · 58 g glucides · 18 g lipides
- **Ingrédients** :
  - Tofu ferme — 150 g
  - Nouilles — 70 g
  - Poivrons — 80 g
  - Sauce soja — 15 g
  - Huile de sésame — 8 g
- **Préparation** :
  1. Cuire les nouilles selon le paquet.
  2. Saisir le tofu en dés dans l'huile 4 min.
  3. Ajouter les poivrons, sauter 3 min, verser la sauce soja.
  4. Incorporer les nouilles, mélanger.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r023 — Cabillaud, pommes de terre & haricots verts

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 15 min
- **Macros / portion** : 470 kcal · 40 g protéines · 48 g glucides · 10 g lipides
- **Ingrédients** :
  - Filet de cabillaud — 180 g
  - Pommes de terre — 200 g
  - Haricots verts — 120 g
  - Huile d'olive — 8 g
  - Citron — 15 g
- **Préparation** :
  1. Cuire les pommes de terre et haricots verts à la vapeur 12 min.
  2. Poêler le cabillaud 3 min par face avec le citron.
  3. Assaisonner d'huile d'olive et servir.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r024 — Crevettes ail & riz

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 460 kcal · 34 g protéines · 62 g glucides · 7 g lipides
- **Ingrédients** :
  - Crevettes décortiquées — 150 g
  - Riz basmati cru — 80 g
  - Ail — 6 g
  - Persil — 5 g
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire le riz à l'eau 10 min.
  2. Saisir les crevettes avec l'ail 4 min.
  3. Parsemer de persil, servir avec le riz.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r025 — Œufs cocotte épinards & feta

- **Type** : Petit-déj, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 380 kcal · 26 g protéines · 8 g glucides · 27 g lipides
- **Ingrédients** :
  - Œufs entiers — 150 g
  - Épinards frais — 100 g
  - Feta — 40 g
  - Crème légère — 30 g
- **Préparation** :
  1. Faire tomber les épinards à la poêle 2 min.
  2. Répartir dans un ramequin avec la crème et la feta.
  3. Casser les œufs dessus, enfourner 8 min à 180°C.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r026 — Salade lentilles, feta & tomates

- **Type** : Déjeuner  ·  **Portions** : 1  ·  **Préparation** : 8 min
- **Macros / portion** : 430 kcal · 22 g protéines · 46 g glucides · 16 g lipides
- **Ingrédients** :
  - Lentilles cuites — 200 g
  - Feta — 40 g
  - Tomates — 100 g
  - Oignon rouge — 30 g
  - Huile d'olive — 10 g
- **Préparation** :
  1. Égoutter les lentilles, couper tomates et oignon.
  2. Mélanger avec la feta émiettée.
  3. Assaisonner d'huile d'olive.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r027 — Skyr, granola & myrtilles

- **Type** : Petit-déj, Collation  ·  **Portions** : 1  ·  **Préparation** : 3 min
- **Macros / portion** : 330 kcal · 24 g protéines · 45 g glucides · 6 g lipides
- **Ingrédients** :
  - Skyr — 200 g
  - Granola — 40 g
  - Myrtilles — 60 g
  - Miel — 8 g
- **Préparation** :
  1. Verser le skyr dans un bol.
  2. Ajouter granola, myrtilles et un filet de miel.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r028 — Wrap poulet & crudités

- **Type** : Déjeuner  ·  **Portions** : 1  ·  **Préparation** : 10 min
- **Macros / portion** : 480 kcal · 38 g protéines · 46 g glucides · 14 g lipides
- **Ingrédients** :
  - Tortilla de blé — 60 g
  - Blanc de poulet — 130 g
  - Salade verte — 30 g
  - Tomate — 50 g
  - Yaourt nature — 30 g
- **Préparation** :
  1. Poêler le poulet émincé 6 min.
  2. Garnir la tortilla de salade, tomate, poulet et yaourt.
  3. Rouler et servir.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r029 — Pancakes flocons & banane

- **Type** : Petit-déj, Collation  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 360 kcal · 15 g protéines · 56 g glucides · 8 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 60 g
  - Banane — 100 g
  - Œuf — 50 g
  - Lait demi-écrémé — 60 ml
- **Préparation** :
  1. Mixer tous les ingrédients en pâte.
  2. Cuire de petites galettes 2 min par face.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r030 — Cottage cheese, concombre & pain complet

- **Type** : Collation, Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 5 min
- **Macros / portion** : 280 kcal · 26 g protéines · 30 g glucides · 6 g lipides
- **Ingrédients** :
  - Cottage cheese — 200 g
  - Concombre — 80 g
  - Pain complet — 50 g
  - Ciboulette — 3 g
- **Préparation** :
  1. Mélanger le cottage cheese avec la ciboulette.
  2. Servir avec le concombre et le pain complet.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r031 — Pain perdu protéiné

- **Type** : Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 10 min
- **Macros / portion** : 390 kcal · 30 g protéines · 45 g glucides · 10 g lipides
- **Ingrédients** :
  - Pain complet — 80 g
  - Œufs entiers — 100 g
  - Lait demi-écrémé — 100 ml
  - Whey protéine vanille — 15 g
  - Cannelle — 2 g
- **Préparation** :
  1. Battre les œufs avec le lait, la whey et la cannelle.
  2. Tremper les tranches de pain dans le mélange.
  3. Dorer 2 min par face à la poêle antiadhésive.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r032 — Bowl skyr, flocons & framboises

- **Type** : Petit-déj, Collation  ·  **Portions** : 1  ·  **Préparation** : 4 min
- **Macros / portion** : 335 kcal · 28 g protéines · 40 g glucides · 7 g lipides
- **Ingrédients** :
  - Skyr — 200 g
  - Flocons d'avoine — 40 g
  - Framboises — 60 g
  - Miel — 10 g
- **Préparation** :
  1. Verser le skyr dans un bol.
  2. Ajouter les flocons, les framboises et un filet de miel.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r033 — Œufs brouillés, avocat & pain complet

- **Type** : Petit-déj  ·  **Portions** : 1  ·  **Préparation** : 9 min
- **Macros / portion** : 378 kcal · 24 g protéines · 30 g glucides · 18 g lipides
- **Ingrédients** :
  - Œufs entiers — 150 g
  - Avocat — 50 g
  - Pain complet — 60 g
  - Huile d'olive — 4 g
- **Préparation** :
  1. Brouiller les œufs à feu doux dans l'huile.
  2. Toaster le pain, écraser l'avocat dessus.
  3. Servir les œufs sur la tartine.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r034 — Cottage cheese, ananas & amandes

- **Type** : Petit-déj, Collation  ·  **Portions** : 1  ·  **Préparation** : 3 min
- **Macros / portion** : 290 kcal · 26 g protéines · 24 g glucides · 10 g lipides
- **Ingrédients** :
  - Cottage cheese — 200 g
  - Ananas — 80 g
  - Amandes — 15 g
- **Préparation** :
  1. Verser le cottage cheese dans un bol.
  2. Ajouter les dés d'ananas et les amandes concassées.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r035 — Galettes de riz, fromage frais & dinde

- **Type** : Collation  ·  **Portions** : 1  ·  **Préparation** : 5 min
- **Macros / portion** : 270 kcal · 24 g protéines · 30 g glucides · 6 g lipides
- **Ingrédients** :
  - Galettes de riz — 40 g
  - Fromage frais 0% — 60 g
  - Blanc de dinde — 60 g
- **Préparation** :
  1. Tartiner les galettes de fromage frais.
  2. Déposer les tranches de dinde dessus.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r036 — Wrap thon & crudités

- **Type** : Déjeuner  ·  **Portions** : 1  ·  **Préparation** : 8 min
- **Macros / portion** : 412 kcal · 34 g protéines · 42 g glucides · 12 g lipides
- **Ingrédients** :
  - Tortilla de blé — 60 g
  - Thon au naturel — 120 g
  - Maïs — 40 g
  - Salade verte — 30 g
  - Fromage frais 0% — 30 g
- **Préparation** :
  1. Étaler le fromage frais sur la tortilla.
  2. Garnir de thon égoutté, maïs et salade.
  3. Rouler le wrap et couper en deux.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r037 — Poke bowl saumon & edamame

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 496 kcal · 36 g protéines · 52 g glucides · 16 g lipides
- **Ingrédients** :
  - Saumon — 150 g
  - Riz basmati cru — 80 g
  - Edamame — 60 g
  - Avocat — 40 g
  - Sauce soja — 10 g
- **Préparation** :
  1. Cuire le riz et le laisser tiédir.
  2. Détailler le saumon cru en cubes.
  3. Dresser le bol avec edamame, avocat et sauce soja.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r038 — Poulet teriyaki & riz

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 15 min
- **Macros / portion** : 501 kcal · 45 g protéines · 60 g glucides · 9 g lipides
- **Ingrédients** :
  - Blanc de poulet — 180 g
  - Riz basmati cru — 90 g
  - Sauce teriyaki — 25 g
  - Brocolis — 100 g
- **Préparation** :
  1. Cuire le riz à l'eau.
  2. Saisir le poulet, glacer à la sauce teriyaki.
  3. Cuire les brocolis vapeur, assembler.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r039 — Boulettes de bœuf, semoule & courgettes

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 18 min
- **Macros / portion** : 512 kcal · 42 g protéines · 50 g glucides · 16 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 170 g
  - Semoule — 70 g
  - Courgette — 120 g
  - Sauce tomate — 60 g
- **Préparation** :
  1. Former des boulettes et les saisir 6 min.
  2. Hydrater la semoule à l'eau bouillante.
  3. Poêler les courgettes, mijoter avec la sauce tomate.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r040 — Cabillaud, boulgour & ratatouille

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 18 min
- **Macros / portion** : 442 kcal · 40 g protéines · 48 g glucides · 10 g lipides
- **Ingrédients** :
  - Cabillaud — 180 g
  - Boulgour — 60 g
  - Ratatouille — 150 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire le boulgour à l'eau 10 min.
  2. Poêler le cabillaud 3 min par face.
  3. Réchauffer la ratatouille, dresser.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r041 — Omelette jambon-fromage & salade

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 10 min
- **Macros / portion** : 376 kcal · 34 g protéines · 6 g glucides · 24 g lipides
- **Ingrédients** :
  - Œufs entiers — 180 g
  - Jambon — 50 g
  - Emmental râpé — 30 g
  - Salade verte — 40 g
- **Préparation** :
  1. Battre les œufs, verser dans la poêle.
  2. Ajouter dés de jambon et emmental, plier.
  3. Servir avec la salade.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r042 — Buddha bowl pois chiches & feta

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 12 min
- **Macros / portion** : 530 kcal · 22 g protéines · 70 g glucides · 18 g lipides
- **Ingrédients** :
  - Pois chiches cuits — 150 g
  - Quinoa cuit — 150 g
  - Feta — 40 g
  - Concombre — 60 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Réchauffer le quinoa et les pois chiches.
  2. Couper le concombre et émietter la feta.
  3. Assembler le bowl, filet d'huile d'olive.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r043 — Pâtes thon & tomate

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 14 min
- **Macros / portion** : 548 kcal · 38 g protéines · 72 g glucides · 12 g lipides
- **Ingrédients** :
  - Pâtes crues — 110 g
  - Thon au naturel — 120 g
  - Sauce tomate — 100 g
  - Parmesan — 15 g
- **Préparation** :
  1. Cuire les pâtes al dente.
  2. Chauffer la sauce tomate avec le thon.
  3. Mélanger, parsemer de parmesan.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r044 — Curry de poulet coco & riz

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 18 min
- **Macros / portion** : 559 kcal · 44 g protéines · 62 g glucides · 15 g lipides
- **Ingrédients** :
  - Blanc de poulet — 170 g
  - Riz basmati cru — 90 g
  - Lait de coco — 60 ml
  - Pâte de curry — 20 g
  - Poivrons — 80 g
- **Préparation** :
  1. Cuire le riz à l'eau.
  2. Saisir le poulet avec la pâte de curry.
  3. Ajouter lait de coco et poivrons, mijoter 8 min.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r045 — Thon snacké, patate douce & haricots verts

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 16 min
- **Macros / portion** : 470 kcal · 42 g protéines · 44 g glucides · 14 g lipides
- **Ingrédients** :
  - Thon frais — 170 g
  - Patate douce — 150 g
  - Haricots verts — 120 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire la patate douce et les haricots verts vapeur.
  2. Snacker le thon 1 min par face (cœur rosé).
  3. Dresser avec un filet d'huile d'olive.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r046 — Chili végétarien & riz

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 20 min
- **Macros / portion** : 506 kcal · 22 g protéines · 82 g glucides · 10 g lipides
- **Ingrédients** :
  - Haricots rouges cuits — 150 g
  - Riz basmati cru — 70 g
  - Maïs — 50 g
  - Sauce tomate — 80 g
  - Oignon — 40 g
- **Préparation** :
  1. Faire revenir l'oignon, ajouter haricots et maïs.
  2. Incorporer la sauce tomate et les épices, mijoter 10 min.
  3. Servir sur le riz cuit.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r047 — Tartines saumon fumé & fromage frais

- **Type** : Petit-déj, Déjeuner  ·  **Portions** : 1  ·  **Préparation** : 6 min
- **Macros / portion** : 416 kcal · 28 g protéines · 40 g glucides · 16 g lipides
- **Ingrédients** :
  - Pain complet — 80 g
  - Saumon fumé — 80 g
  - Fromage frais 0% — 40 g
  - Aneth — 3 g
- **Préparation** :
  1. Toaster le pain complet.
  2. Étaler le fromage frais, déposer le saumon fumé.
  3. Parsemer d'aneth.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r048 — Shake protéiné choco-banane

- **Type** : Collation  ·  **Portions** : 1  ·  **Préparation** : 2 min
- **Macros / portion** : 326 kcal · 32 g protéines · 36 g glucides · 6 g lipides
- **Ingrédients** :
  - Whey protéine chocolat — 30 g
  - Banane — 100 g
  - Lait demi-écrémé — 250 ml
- **Préparation** :
  1. Mixer tous les ingrédients 30 secondes.
  2. Servir bien frais.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r049 — Yaourt grec, granola & fruits rouges

- **Type** : Petit-déj, Collation  ·  **Portions** : 1  ·  **Préparation** : 3 min
- **Macros / portion** : 304 kcal · 20 g protéines · 38 g glucides · 8 g lipides
- **Ingrédients** :
  - Yaourt grec — 200 g
  - Granola — 40 g
  - Fruits rouges — 60 g
  - Miel — 8 g
- **Préparation** :
  1. Verser le yaourt grec dans un bol.
  2. Ajouter granola, fruits rouges et miel.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________

### r050 — Riz cantonais au poulet

- **Type** : Déjeuner, Dîner  ·  **Portions** : 1  ·  **Préparation** : 16 min
- **Macros / portion** : 508 kcal · 34 g protéines · 66 g glucides · 12 g lipides
- **Ingrédients** :
  - Riz basmati cru — 100 g
  - Blanc de poulet — 120 g
  - Œuf — 50 g
  - Petits pois — 50 g
  - Sauce soja — 12 g
- **Préparation** :
  1. Cuire le riz et le laisser refroidir.
  2. Saisir le poulet émincé, ajouter l'œuf brouillé.
  3. Faire sauter avec riz, petits pois et sauce soja.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques diététicienne** : _________________________________
