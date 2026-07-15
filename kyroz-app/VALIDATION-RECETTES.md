# Kyroz — Dossier de validation diététicienne

> ⚠️ **Fichier GÉNÉRÉ** — ne pas éditer à la main. Régénérer : `npm run gen:validation`.
> Source de vérité = `lib/data/recettes-kyroz-100.json` → `lib/recipeMap.ts`.
>
> **But** : faire valider les recettes par une diététicienne-nutritionniste diplômée avant
> mise en production (CLAUDE.md §6). Tant que la validation n'est pas faite, le champ
> `validated_by_dietitian` reste à `false`.
>
> **Comment l’utiliser** : cocher chaque recette (colonne *OK ?*), noter les remarques, puis
> basculer `validated_by_dietitian` à `true` recette par recette.

**Nombre de recettes : 264**

## À lire avant de juger les quantités

- **Les portions affichées sont une BASE, pas une portion figée.** Le moteur ajuste ensuite
  chaque ingrédient à la cible calorique de l'utilisateur, dans ces bornes : protéines ×1,0→1,7
  (jamais en dessous de la base), glucides ×0,5→1,8, lipides ×0,5→1,5, laitiers ×0,6→1,6,
  fruits ×0,5→1,6. Légumes et aromates ne sont jamais ajustés.
- **Les féculents et légumineuses sont pesés SECS/CRUS** (comme le riz ou les pâtes) : 70 g de
  riz sec ≈ 200 g cuit. Les viandes et poissons sont pesés **CRUS**. C’est indiqué par recette.
- **Les macros viennent de la table Ciqual (ANSES)**, pas d’estimations maison.
- **Public visé** : adultes en bonne santé, 18–35 ans, sportifs. Pas de pathologie, pas de
  grossesse/allaitement, pas de mineurs (bloqué à l’inscription). Plancher : 1500 kcal/j
  (homme) / 1200 kcal/j (femme).

## Contrôle automatique de cohérence énergétique

kcal (Ciqual) vs recalcul Atwater (protéines ×4 + glucides ×4 + lipides ×9).
Un écart **positif** est normal sur les recettes riches en fibres (Ciqual compte l’énergie des
fibres, pas le recalcul). On ne signale que les écarts > 10 %.

1 recette(s) avec un écart > 10 % — à confirmer par la diététicienne :

| ID | Recette | kcal (Ciqual) | kcal (Atwater) | Écart | Cause probable |
|---|---|---|---|---|---|
| rep112 | Soupe pois cassés – croûtons – graines | 592 | 532 | 10 % | fibres (légumineuses / céréales complètes) |

## Couverture par régime

| Régime | Petit-déj | Collations | Repas |
|---|---|---|---|
| *(sans restriction)* | 58 | 54 | 152 |
| végétarien | 54 | 53 | 68 |
| pescétarien | 56 | 53 | 105 |
| sans porc | 57 | 54 | 150 |
| sans lactose | 33 | 32 | 132 |
| sans gluten | 22 | 34 | 101 |
| végétalien | 26 | 29 | 52 |
| halal | 57 | 54 | 150 |

## Tableau de synthèse

| ID | Recette | Type | Prép. | kcal | P (g) | G (g) | L (g) | Objectif | OK ? | Remarques |
|---|---|---|---|---|---|---|---|---|---|---|
| pd01 | Porridge avoine – whey – banane – myrtilles | Petit-déj | 8’ | 614 | 42 | 81 | 12 | prise de masse, maintien | ☐ | |
| pd02 | Overnight oats chia – skyr – framboises | Petit-déj | 5’ | 476 | 28 | 47 | 15 | maintien, perte de gras | ☐ | |
| pd03 | Pancakes protéinés banane – flocons – œuf | Petit-déj | 15’ | 501 | 37 | 60 | 11 | prise de masse, maintien | ☐ | |
| pd04 | Omelette 3 œufs jambon – champignons | Petit-déj | 12’ | 319 | 29 | 2 | 21 | perte de gras, maintien | ☐ | |
| pd05 | Œufs brouillés – avocat – pain complet | Petit-déj | 10’ | 465 | 26 | 26 | 26 | maintien | ☐ | |
| pd06 | Skyr bowl granola – fruits rouges – amandes | Petit-déj | 4’ | 404 | 29 | 42 | 11 | perte de gras, maintien | ☐ | |
| pd07 | Smoothie bowl mangue – épinards – protéine | Petit-déj | 6’ | 389 | 24 | 49 | 9 | maintien | ☐ | |
| pd08 | Tartines seigle – cottage cheese – tomate | Petit-déj | 6’ | 359 | 19 | 42 | 11 | perte de gras, maintien | ☐ | |
| pd09 | Porridge chocolat – cacao – beurre de cacahuète | Petit-déj | 8’ | 697 | 47 | 75 | 21 | prise de masse | ☐ | |
| pd10 | Yaourt grec – noix – miel – pomme | Petit-déj | 4’ | 484 | 10 | 42 | 28 | maintien | ☐ | |
| pd11 | Omelette blancs – épinards – feta | Petit-déj | 12’ | 303 | 32 | 4 | 17 | perte de gras | ☐ | |
| pd12 | Pain perdu protéiné | Petit-déj | 15’ | 489 | 36 | 51 | 14 | prise de masse, maintien | ☐ | |
| pd13 | Wrap petit-déj œuf – dinde – poivron | Petit-déj | 12’ | 411 | 32 | 34 | 15 | maintien | ☐ | |
| pd14 | Smoothie avoine – banane – beurre d'amande – whey | Petit-déj | 5’ | 613 | 43 | 63 | 20 | prise de masse | ☐ | |
| pd15 | Fromage blanc – muesli – kiwi – graines de courge | Petit-déj | 4’ | 397 | 24 | 43 | 11 | perte de gras, maintien | ☐ | |
| pd16 | Tofu brouillé curcuma – épinards – pain | Petit-déj | 12’ | 402 | 26 | 27 | 19 | perte de gras, maintien | ☐ | |
| pd17 | Porridge quinoa – pomme – cannelle | Petit-déj | 12’ | 472 | 28 | 47 | 18 | maintien | ☐ | |
| pd18 | Pita complet – saumon fumé – fromage frais | Petit-déj | 6’ | 352 | 26 | 37 | 10 | maintien | ☐ | |
| pd19 | Shake gainer maison | Petit-déj | 4’ | 819 | 55 | 95 | 22 | prise de masse | ☐ | |
| pd20 | Shakshuka light œufs – pois chiches | Petit-déj | 18’ | 533 | 31 | 39 | 26 | maintien, perte de gras | ☐ | |
| col01 | Bowl skyr – flocons – amandes – miel | Collation | 3’ | 333 | 23 | 33 | 11 | maintien | ☐ | |
| col02 | Shake whey – banane – lait | Collation | 3’ | 363 | 36 | 41 | 7 | prise de masse, maintien | ☐ | |
| col03 | Cottage cheese – ananas – noix | Collation | 3’ | 354 | 24 | 19 | 19 | perte de gras, maintien | ☐ | |
| col04 | Energy balls dattes – avoine – cacahuète | Collation | 15’ | 665 | 30 | 76 | 23 | prise de masse | ☐ | |
| col05 | Tartine pain complet – cacahuète – banane | Collation | 4’ | 389 | 12 | 49 | 14 | prise de masse | ☐ | |
| col06 | Smoothie protéiné végétal cacahuète – datte | Collation | 5’ | 599 | 33 | 63 | 23 | prise de masse | ☐ | |
| col07 | Yaourt grec – myrtilles – chia | Collation | 3’ | 306 | 8 | 20 | 19 | perte de gras, maintien | ☐ | |
| col08 | Mousse fromage blanc – cacao – whey | Collation | 4’ | 243 | 36 | 17 | 3 | perte de gras | ☐ | |
| col09 | Galettes de riz – fromage frais – dinde | Collation | 4’ | 245 | 24 | 26 | 4 | perte de gras, maintien | ☐ | |
| col10 | Amandes – chocolat noir – pomme | Collation | 1’ | 311 | 7 | 20 | 20 | maintien | ☐ | |
| col11 | Shake récup riz – whey – miel | Collation | 3’ | 487 | 32 | 57 | 14 | maintien | ☐ | |
| col12 | Houmous – bâtonnets de carotte – pita | Collation | 5’ | 360 | 12 | 44 | 13 | perte de gras, maintien | ☐ | |
| col13 | Skyr – granola – mangue | Collation | 3’ | 370 | 29 | 40 | 8 | maintien | ☐ | |
| col14 | Œufs durs – avocat – tomate | Collation | 10’ | 256 | 14 | 3 | 21 | perte de gras | ☐ | |
| col15 | Barre avoine – whey – miel maison | Collation | 20’ | 549 | 36 | 59 | 17 | prise de masse | ☐ | |
| col16 | Edamame vapeur – sauce soja | Collation | 6’ | 192 | 17 | 14 | 8 | perte de gras, maintien | ☐ | |
| col17 | Yaourt grec – raisins – noisettes | Collation | 3’ | 403 | 11 | 27 | 27 | maintien | ☐ | |
| col18 | Smoothie vert kiwi – épinards – protéine | Collation | 5’ | 327 | 24 | 32 | 11 | perte de gras | ☐ | |
| col19 | Cottage cheese – pain de seigle – concombre | Collation | 4’ | 314 | 21 | 32 | 10 | perte de gras, maintien | ☐ | |
| col20 | Pudding chia – fruits rouges | Collation | 5’ | 339 | 19 | 21 | 17 | maintien | ☐ | |
| rep01 | Poulet – riz basmati – brocoli | Repas | 25’ | 633 | 54 | 67 | 14 | prise de masse, maintien | ☐ | |
| rep02 | Saumon – patate douce – épinards | Repas | 30’ | 586 | 39 | 47 | 24 | maintien | ☐ | |
| rep03 | Dahl de lentilles corail – riz | Repas | 30’ | 675 | 33 | 86 | 18 | perte de gras | ☐ | |
| rep04 | Bœuf 5% – wok – nouilles complètes | Repas | 20’ | 598 | 45 | 58 | 19 | prise de masse | ☐ | |
| rep05 | Tofu – quinoa – légumes | Repas | 25’ | 520 | 30 | 45 | 22 | perte de gras | ☐ | |
| rep06 | Cabillaud – boulgour – pois chiches – courgettes | Repas | 25’ | 584 | 50 | 61 | 13 | perte de gras, maintien | ☐ | |
| rep07 | Poulet – patates douces rôties – haricots verts | Repas | 30’ | 538 | 49 | 49 | 13 | prise de masse, maintien | ☐ | |
| rep08 | Pâtes complètes bolognaise bœuf 5% | Repas | 25’ | 639 | 46 | 70 | 18 | prise de masse, maintien | ☐ | |
| rep09 | Burrito bowl poulet – riz complet – avocat – maïs | Repas | 25’ | 660 | 47 | 75 | 17 | prise de masse | ☐ | |
| rep10 | Curry pois chiches – épinards – riz | Repas | 25’ | 636 | 25 | 88 | 18 | perte de gras, maintien | ☐ | |
| rep11 | Bavette de bœuf – pommes de terre – salade | Repas | 25’ | 498 | 36 | 41 | 19 | prise de masse, maintien | ☐ | |
| rep12 | Saumon – quinoa – asperges | Repas | 25’ | 623 | 44 | 44 | 28 | maintien | ☐ | |
| rep13 | Wrap poulet – crudités – fromage frais | Repas | 12’ | 443 | 45 | 41 | 10 | perte de gras, maintien | ☐ | |
| rep14 | Chili sin carne haricots rouges – maïs | Repas | 30’ | 573 | 25 | 91 | 8 | perte de gras, maintien | ☐ | |
| rep15 | Dinde sautée – nouilles de riz – légumes wok | Repas | 20’ | 588 | 52 | 67 | 12 | perte de gras, maintien | ☐ | |
| rep16 | Cabillaud – pommes de terre – ratatouille | Repas | 30’ | 481 | 40 | 51 | 11 | perte de gras, maintien | ☐ | |
| rep17 | Buddha bowl tofu – quinoa – betterave – houmous | Repas | 25’ | 640 | 35 | 58 | 27 | maintien | ☐ | |
| rep18 | Omelette géante poulet – mozzarella – épinards | Repas | 15’ | 501 | 51 | 2 | 31 | perte de gras | ☐ | |
| rep19 | Pâtes thon – tomate – olives | Repas | 20’ | 605 | 45 | 66 | 16 | maintien | ☐ | |
| rep20 | Poke bowl saumon – riz – edamame | Repas | 20’ | 768 | 47 | 72 | 31 | prise de masse, maintien | ☐ | |
| rep21 | Poulet tikka – riz basmati – yaourt | Repas | 30’ | 636 | 51 | 69 | 17 | prise de masse, maintien | ☐ | |
| rep22 | Soupe de lentilles – légumes – pain complet | Repas | 30’ | 497 | 29 | 68 | 8 | perte de gras, maintien | ☐ | |
| rep23 | Steak haché 5% – purée patate douce – brocoli | Repas | 25’ | 517 | 41 | 46 | 16 | prise de masse, maintien | ☐ | |
| rep24 | Crevettes sautées – nouilles – légumes (pad thaï light) | Repas | 20’ | 546 | 43 | 68 | 10 | perte de gras, maintien | ☐ | |
| rep25 | Tempeh grillé – riz complet – chou-fleur rôti | Repas | 30’ | 620 | 33 | 66 | 20 | maintien | ☐ | |
| rep26 | Maquereau – pommes de terre – salade | Repas | 20’ | 550 | 33 | 43 | 26 | maintien | ☐ | |
| rep27 | Wok poulet – riz – légumes – amandes | Repas | 25’ | 660 | 54 | 75 | 14 | prise de masse | ☐ | |
| rep28 | Galette de polenta – ratatouille – œuf | Repas | 25’ | 554 | 25 | 55 | 26 | maintien, perte de gras | ☐ | |
| rep29 | Pois chiches rôtis – boulgour – feta | Repas | 30’ | 673 | 30 | 82 | 21 | perte de gras, maintien | ☐ | |
| rep30 | Dinde – patate douce – épinards | Repas | 25’ | 502 | 49 | 46 | 11 | maintien, perte de gras | ☐ | |
| rep31 | Pâtes – poulet – pesto – tomates | Repas | 20’ | 596 | 50 | 70 | 11 | prise de masse | ☐ | |
| rep32 | Cabillaud pané maison – purée – petits pois | Repas | 30’ | 545 | 46 | 54 | 13 | maintien | ☐ | |
| rep33 | Bœuf – haricots rouges – riz (cajun) | Repas | 25’ | 688 | 50 | 81 | 16 | prise de masse | ☐ | |
| rep34 | Saumon – lentilles vertes – épinards | Repas | 25’ | 590 | 50 | 34 | 25 | maintien | ☐ | |
| rep35 | Tofu mariné – nouilles soba – brocoli | Repas | 20’ | 624 | 37 | 56 | 24 | perte de gras, maintien | ☐ | |
| rep36 | Tortilla pommes de terre – jambon | Repas | 25’ | 546 | 39 | 27 | 30 | maintien | ☐ | |
| rep37 | Tajine poulet – semoule – légumes | Repas | 30’ | 667 | 56 | 74 | 14 | maintien, prise de masse | ☐ | |
| rep38 | Thon frais grillé – riz – haricots verts | Repas | 20’ | 645 | 51 | 66 | 18 | perte de gras, maintien | ☐ | |
| rep39 | Curry poulet – lait de coco – riz | Repas | 30’ | 661 | 48 | 71 | 19 | prise de masse | ☐ | |
| rep40 | Salade composée poulet – quinoa – avocat – feta | Repas | 15’ | 586 | 49 | 39 | 23 | maintien | ☐ | |
| rep41 | Seitan – patate douce – brocoli | Repas | 25’ | 541 | 39 | 56 | 15 | prise de masse, maintien | ☐ | |
| rep42 | Bowl mexicain bœuf – haricots – maïs – riz | Repas | 25’ | 711 | 49 | 83 | 18 | prise de masse | ☐ | |
| rep43 | Cabillaud – quinoa – courgettes – citron | Repas | 25’ | 459 | 43 | 38 | 13 | perte de gras | ☐ | |
| rep44 | Pâtes complètes saumon – épinards – crème de soja | Repas | 20’ | 656 | 41 | 64 | 24 | prise de masse, maintien | ☐ | |
| rep45 | Boulettes de dinde – courgettes – feta | Repas | 25’ | 556 | 56 | 37 | 19 | perte de gras, maintien | ☐ | |
| rep46 | Riz sauté œufs – petits pois – jambon | Repas | 15’ | 695 | 39 | 74 | 26 | maintien | ☐ | |
| rep47 | Soupe miso – tofu – nouilles – edamame | Repas | 20’ | 451 | 23 | 66 | 9 | perte de gras, maintien | ☐ | |
| rep48 | Poulet rôti – polenta crémeuse – champignons | Repas | 30’ | 608 | 55 | 55 | 17 | prise de masse, maintien | ☐ | |
| rep49 | Sardines – pain complet – salade de tomate | Repas | 10’ | 534 | 41 | 29 | 27 | maintien | ☐ | |
| rep50 | Bowl tempeh teriyaki – riz – brocoli | Repas | 25’ | 674 | 38 | 80 | 17 | maintien, prise de masse | ☐ | |
| rep51 | Cabillaud – lentilles vertes – tomate | Repas | 25’ | 462 | 51 | 35 | 11 | perte de gras, maintien | ☐ | |
| rep52 | Wrap thon – crudités – fromage frais | Repas | 10’ | 432 | 39 | 41 | 12 | perte de gras, maintien | ☐ | |
| rep53 | Bœuf bourguignon light – pommes vapeur | Repas | 40’ | 532 | 40 | 47 | 18 | prise de masse, maintien | ☐ | |
| rep54 | Poêlée patate douce – pois chiches – œuf | Repas | 20’ | 609 | 29 | 68 | 21 | maintien, perte de gras | ☐ | |
| rep55 | Saumon – riz complet – brocoli – sésame | Repas | 25’ | 740 | 45 | 62 | 32 | prise de masse, maintien | ☐ | |
| rep56 | One pot poulet – pâtes – courgettes – parmesan | Repas | 25’ | 684 | 58 | 64 | 19 | prise de masse | ☐ | |
| rep57 | Chili dinde – haricots – riz | Repas | 30’ | 620 | 58 | 66 | 12 | perte de gras, maintien | ☐ | |
| rep58 | Tofu général tao light – riz – haricots verts | Repas | 25’ | 640 | 30 | 74 | 22 | maintien | ☐ | |
| rep59 | Cabillaud vapeur – écrasé patate douce – asperges | Repas | 25’ | 424 | 40 | 46 | 7 | perte de gras, maintien | ☐ | |
| rep60 | Gros bowl gainer bœuf – riz – avocat – œuf | Repas | 30’ | 923 | 60 | 93 | 32 | prise de masse | ☐ | |
| pd21 | Porridge avoine – whey vanille – banane | Petit-déj | 8’ | 634 | 43 | 71 | 18 | maintien, prise de masse | ☐ | |
| pd22 | Porridge avoine – fromage blanc – fruits rouges | Petit-déj | 8’ | 391 | 20 | 44 | 12 | perte de gras, maintien | ☐ | |
| pd23 | Porridge sarrasin – yaourt soja – myrtilles | Petit-déj | 10’ | 379 | 23 | 49 | 8 | perte de gras, maintien | ☐ | |
| pd24 | Porridge millet – lait coco – mangue | Petit-déj | 12’ | 488 | 26 | 60 | 16 | maintien, prise de masse | ☐ | |
| pd25 | Porridge avoine protéiné – cacao – noisettes | Petit-déj | 8’ | 601 | 43 | 55 | 21 | maintien, prise de masse | ☐ | |
| pd26 | Skyr – granola maison – framboises | Petit-déj | 5’ | 351 | 29 | 31 | 10 | perte de gras, maintien | ☐ | |
| pd27 | Bowl skyr – beurre d'amande – banane | Petit-déj | 5’ | 479 | 32 | 51 | 14 | maintien, prise de masse | ☐ | |
| pd28 | Fromage blanc – muesli – pomme râpée | Petit-déj | 6’ | 383 | 21 | 44 | 12 | perte de gras, maintien | ☐ | |
| pd29 | Cottage cheese – ananas – graines de courge | Petit-déj | 5’ | 451 | 30 | 36 | 19 | perte de gras, maintien | ☐ | |
| pd30 | Yaourt grec – miel – noix | Petit-déj | 5’ | 510 | 12 | 44 | 30 | maintien, prise de masse | ☐ | |
| pd31 | Overnight oats soja – chia – fruits rouges | Petit-déj | 5’ | 413 | 23 | 49 | 11 | perte de gras, maintien | ☐ | |
| pd32 | Bowl yaourt soja – granola – banane | Petit-déj | 5’ | 453 | 27 | 51 | 14 | maintien, prise de masse | ☐ | |
| pd33 | Smoothie bowl protéine pois – mangue – coco | Petit-déj | 6’ | 428 | 30 | 40 | 15 | maintien | ☐ | |
| pd34 | Pudding chia – cacao – beurre cacahuète | Petit-déj | 5’ | 398 | 28 | 23 | 19 | maintien, prise de masse | ☐ | |
| pd35 | Tofu brouillé – épinards – pain complet | Petit-déj | 12’ | 513 | 36 | 35 | 23 | perte de gras, maintien | ☐ | |
| pd36 | Pancakes avoine – banane – oeuf | Petit-déj | 12’ | 514 | 29 | 62 | 15 | maintien, prise de masse | ☐ | |
| pd37 | Omelette blanc d'oeuf – tomate – pain seigle | Petit-déj | 10’ | 301 | 31 | 30 | 6 | perte de gras | ☐ | |
| pd38 | Oeufs brouillés – avocat – pain complet | Petit-déj | 10’ | 504 | 27 | 30 | 28 | maintien, prise de masse | ☐ | |
| pd39 | Pancakes protéinés – myrtilles | Petit-déj | 12’ | 402 | 43 | 40 | 6 | maintien, prise de masse | ☐ | |
| pd40 | Tartines pain complet – cottage – saumon fumé | Petit-déj | 6’ | 400 | 33 | 34 | 13 | perte de gras, maintien | ☐ | |
| pd41 | Tartines beurre cacahuète – banane – chia | Petit-déj | 5’ | 505 | 24 | 60 | 16 | maintien, prise de masse | ☐ | |
| pd42 | Pita complet – houmous express – œuf | Petit-déj | 10’ | 510 | 27 | 55 | 19 | perte de gras, maintien | ☐ | |
| pd43 | Bowl quinoa – yaourt soja – kiwi | Petit-déj | 6’ | 390 | 24 | 42 | 12 | perte de gras, maintien | ☐ | |
| pd44 | Porridge millet – pomme – cannelle | Petit-déj | 12’ | 359 | 20 | 51 | 7 | perte de gras | ☐ | |
| col21 | Shake whey – banane – beurre cacahuète | Collation | 3’ | 409 | 37 | 35 | 14 | maintien, prise de masse | ☐ | |
| col22 | Shake whey – cacao – avoine | Collation | 3’ | 412 | 39 | 39 | 10 | maintien, prise de masse | ☐ | |
| col23 | Shake protéine pois – fruits rouges – amande | Collation | 3’ | 300 | 27 | 15 | 14 | perte de gras, maintien | ☐ | |
| col24 | Shake soja – mangue – coco | Collation | 3’ | 352 | 26 | 23 | 17 | maintien, prise de masse | ☐ | |
| col25 | Smoothie skyr – épinards – ananas | Collation | 4’ | 196 | 19 | 20 | 3 | perte de gras | ☐ | |
| col26 | Shake yaourt soja – banane – cacao | Collation | 3’ | 340 | 23 | 29 | 14 | maintien, prise de masse | ☐ | |
| col27 | Skyr – myrtilles – amandes | Collation | 3’ | 236 | 23 | 17 | 7 | perte de gras | ☐ | |
| col28 | Fromage blanc – fruits rouges – noix | Collation | 3’ | 221 | 17 | 16 | 9 | perte de gras | ☐ | |
| col29 | Cottage cheese – concombre – pain complet | Collation | 4’ | 251 | 20 | 23 | 7 | perte de gras, maintien | ☐ | |
| col30 | Yaourt grec – miel – noisettes | Collation | 3’ | 341 | 8 | 18 | 25 | maintien, prise de masse | ☐ | |
| col31 | Energy balls dattes – cacahuète – avoine | Collation | 10’ | 496 | 24 | 61 | 15 | maintien, prise de masse | ☐ | |
| col32 | Barre avoine – chocolat noir – amandes | Collation | 10’ | 550 | 29 | 56 | 21 | maintien, prise de masse | ☐ | |
| col33 | Boules cacao – chia – coco | Collation | 10’ | 457 | 27 | 54 | 11 | maintien | ☐ | |
| col34 | Barre protéinée whey – avoine – cacahuète | Collation | 10’ | 429 | 29 | 41 | 15 | maintien, prise de masse | ☐ | |
| col35 | Galettes de riz – beurre amande – banane | Collation | 3’ | 389 | 18 | 46 | 14 | maintien | ☐ | |
| col36 | Galettes de riz – cottage – tomate | Collation | 4’ | 253 | 17 | 29 | 7 | perte de gras | ☐ | |
| col37 | Tartine pain seigle – houmous – crudités | Collation | 5’ | 368 | 15 | 53 | 9 | perte de gras | ☐ | |
| col38 | Tartine avocat – œuf dur – pain complet | Collation | 6’ | 384 | 19 | 21 | 23 | perte de gras, maintien | ☐ | |
| col39 | Pudding chia – framboises | Collation | 5’ | 217 | 19 | 13 | 8 | perte de gras | ☐ | |
| col40 | Edamame vapeur – sel | Collation | 6’ | 223 | 17 | 14 | 11 | perte de gras | ☐ | |
| col41 | Pois chiches rôtis épicés | Collation | 10’ | 264 | 12 | 29 | 10 | perte de gras, maintien | ☐ | |
| col42 | Yaourt grec – granola – framboises | Collation | 4’ | 393 | 12 | 29 | 23 | perte de gras, maintien | ☐ | |
| col43 | Banane – beurre cacahuète – chocolat noir | Collation | 3’ | 374 | 18 | 33 | 18 | maintien, prise de masse | ☐ | |
| col44 | Cottage – ananas – graines de courge | Collation | 3’ | 297 | 24 | 17 | 14 | perte de gras | ☐ | |
| rep61 | Pâtes complètes – poulet – pesto – roquette | Repas | 20’ | 597 | 50 | 63 | 14 | maintien, prise de masse | ☐ | |
| rep62 | Pâtes – steak haché 5% – sauce tomate | Repas | 22’ | 638 | 46 | 73 | 17 | maintien, prise de masse | ☐ | |
| rep63 | Pâtes – thon – citron – câpres | Repas | 15’ | 558 | 43 | 60 | 15 | perte de gras, maintien | ☐ | |
| rep64 | Pâtes – saumon – épinards – crème soja | Repas | 20’ | 706 | 43 | 65 | 28 | maintien, prise de masse | ☐ | |
| rep65 | Pâtes – tofu – curry – lait coco | Repas | 22’ | 778 | 43 | 75 | 31 | maintien, prise de masse | ☐ | |
| rep66 | Pâtes – lentilles – tomate – basilic | Repas | 22’ | 681 | 41 | 95 | 11 | maintien, prise de masse | ☐ | |
| rep67 | Nouilles de riz – poulet – légumes wok | Repas | 18’ | 601 | 44 | 78 | 11 | perte de gras, maintien | ☐ | |
| rep68 | Nouilles de riz – tofu – sésame – brocoli | Repas | 20’ | 754 | 37 | 83 | 28 | maintien, prise de masse | ☐ | |
| rep69 | Pâtes – crevettes – ail – courgette | Repas | 18’ | 525 | 42 | 60 | 11 | perte de gras, maintien | ☐ | |
| rep70 | Pâtes – seitan – tomate – olives | Repas | 20’ | 600 | 40 | 81 | 11 | maintien, prise de masse | ☐ | |
| rep71 | Nouilles de riz – bœuf – sauce coco-curry | Repas | 22’ | 653 | 37 | 78 | 21 | maintien, prise de masse | ☐ | |
| rep72 | Pâtes – ricotta de tofu – épinards | Repas | 20’ | 608 | 33 | 65 | 21 | perte de gras, maintien | ☐ | |
| rep73 | Riz complet – poulet teriyaki – brocoli | Repas | 22’ | 568 | 49 | 60 | 12 | maintien, prise de masse | ☐ | |
| rep74 | Bowl riz – saumon – avocat – edamame | Repas | 18’ | 756 | 41 | 74 | 32 | maintien, prise de masse | ☐ | |
| rep75 | Riz – cabillaud – citron – haricots verts | Repas | 20’ | 477 | 40 | 60 | 8 | perte de gras | ☐ | |
| rep76 | Riz complet – tofu – chili sin carne | Repas | 25’ | 765 | 39 | 91 | 24 | maintien, prise de masse | ☐ | |
| rep77 | Bowl riz – PST bolognaise – maïs | Repas | 22’ | 615 | 35 | 87 | 12 | maintien, prise de masse | ☐ | |
| rep78 | Riz basmati – dinde – curry – petits pois | Repas | 22’ | 644 | 49 | 80 | 13 | maintien, prise de masse | ☐ | |
| rep79 | Riz – thon – poivron – sauce tomate | Repas | 18’ | 561 | 42 | 64 | 14 | perte de gras, maintien | ☐ | |
| rep80 | Bowl riz – tempeh laqué – chou-fleur | Repas | 22’ | 608 | 32 | 71 | 17 | maintien, prise de masse | ☐ | |
| rep81 | Riz – œufs – légumes wok (cantonais) | Repas | 18’ | 607 | 27 | 73 | 23 | perte de gras, maintien | ☐ | |
| rep82 | Riz – haricots noirs – maïs – avocat | Repas | 18’ | 773 | 36 | 105 | 17 | maintien, prise de masse | ☐ | |
| rep83 | Riz – poulet – ananas – cajou | Repas | 20’ | 597 | 44 | 79 | 11 | maintien, prise de masse | ☐ | |
| rep84 | Riz – sardines – tomate – oignon | Repas | 15’ | 601 | 34 | 60 | 24 | perte de gras, maintien | ☐ | |
| rep85 | Bowl riz – feta – pois chiches – concombre | Repas | 18’ | 677 | 25 | 94 | 20 | perte de gras, maintien | ☐ | |
| rep86 | Riz – crevettes – curry vert | Repas | 20’ | 584 | 39 | 75 | 13 | maintien, prise de masse | ☐ | |
| rep87 | Quinoa – poulet – courgette – pesto | Repas | 22’ | 553 | 50 | 50 | 15 | maintien, prise de masse | ☐ | |
| rep88 | Buddha bowl quinoa – pois chiches – avocat | Repas | 20’ | 738 | 38 | 87 | 22 | maintien, prise de masse | ☐ | |
| rep89 | Sarrasin – tempeh – champignons | Repas | 22’ | 618 | 37 | 68 | 18 | maintien, prise de masse | ☐ | |
| rep90 | Sarrasin – saumon – asperges | Repas | 22’ | 639 | 42 | 56 | 26 | maintien, prise de masse | ☐ | |
| rep91 | Millet – curry de pois chiches – épinards | Repas | 25’ | 727 | 40 | 101 | 17 | maintien, prise de masse | ☐ | |
| rep92 | Quinoa – cabillaud – ratatouille | Repas | 22’ | 487 | 44 | 48 | 12 | perte de gras | ☐ | |
| rep93 | Millet – dinde – petits pois – carotte | Repas | 22’ | 606 | 51 | 71 | 13 | maintien, prise de masse | ☐ | |
| rep94 | Quinoa – haricots blancs – tomate – romarin | Repas | 22’ | 682 | 41 | 88 | 14 | maintien, prise de masse | ☐ | |
| rep95 | Patate douce rôtie – poulet – brocoli | Repas | 30’ | 516 | 48 | 49 | 11 | maintien, prise de masse | ☐ | |
| rep96 | Pomme de terre – steak haché – haricots verts | Repas | 28’ | 537 | 41 | 52 | 15 | maintien, prise de masse | ☐ | |
| rep97 | Patate douce – tofu – épinards – coco | Repas | 28’ | 597 | 34 | 45 | 28 | maintien, prise de masse | ☐ | |
| rep98 | Pomme de terre – cabillaud – haricots verts | Repas | 28’ | 376 | 38 | 37 | 6 | perte de gras | ☐ | |
| rep99 | Patate douce – PST chili – maïs | Repas | 28’ | 590 | 41 | 80 | 8 | maintien, prise de masse | ☐ | |
| rep100 | Pomme de terre – saumon – asperges – yaourt | Repas | 28’ | 562 | 37 | 37 | 28 | maintien, prise de masse | ☐ | |
| rep101 | Dahl lentilles corail – riz – épinards | Repas | 25’ | 736 | 44 | 105 | 11 | maintien, prise de masse | ☐ | |
| rep102 | Dahl lentilles – PST – riz complet | Repas | 25’ | 681 | 42 | 96 | 11 | maintien, prise de masse | ☐ | |
| rep103 | Chili sin carne – haricots rouges – riz | Repas | 28’ | 720 | 42 | 106 | 11 | maintien, prise de masse | ☐ | |
| rep104 | Curry pois chiches – patate – riz | Repas | 28’ | 603 | 39 | 72 | 15 | maintien, prise de masse | ☐ | |
| rep105 | Soupe haricots blancs – légumes – pain | Repas | 30’ | 563 | 38 | 70 | 11 | perte de gras, maintien | ☐ | |
| rep106 | Feijoada express – haricots noirs – riz | Repas | 28’ | 700 | 39 | 99 | 11 | maintien, prise de masse | ☐ | |
| rep107 | Buddha bowl pois cassés – boulgour – carotte | Repas | 30’ | 676 | 39 | 92 | 11 | maintien, prise de masse | ☐ | |
| rep108 | Dahl fèves – riz – coriandre | Repas | 28’ | 645 | 38 | 91 | 10 | maintien, prise de masse | ☐ | |
| rep109 | Salade lentilles – feta – tomate | Repas | 20’ | 471 | 27 | 41 | 19 | perte de gras, maintien | ☐ | |
| rep110 | Chili poulet – haricots rouges – riz | Repas | 28’ | 650 | 50 | 80 | 11 | maintien, prise de masse | ☐ | |
| rep111 | Houmous bowl – pois chiches – boulgour | Repas | 20’ | 682 | 36 | 93 | 14 | maintien, prise de masse | ☐ | |
| rep112 | Soupe pois cassés – croûtons – graines | Repas | 30’ | 592 | 30 | 67 | 16 | perte de gras, maintien | ☐ | |
| rep113 | Wrap poulet – avocat – crudités | Repas | 15’ | 526 | 41 | 45 | 19 | perte de gras, maintien | ☐ | |
| rep114 | Tacos PST – haricots noirs – maïs | Repas | 18’ | 785 | 46 | 95 | 19 | maintien, prise de masse | ☐ | |
| rep115 | Wrap thon – crudités – fromage blanc | Repas | 12’ | 471 | 44 | 47 | 11 | perte de gras, maintien | ☐ | |
| rep116 | Galettes sarrasin – œuf – champignons | Repas | 18’ | 547 | 31 | 49 | 24 | perte de gras, maintien | ☐ | |
| rep117 | Pita poulet – tzatziki – salade | Repas | 15’ | 481 | 43 | 43 | 13 | perte de gras, maintien | ☐ | |
| rep118 | Wrap falafel – houmous – crudités | Repas | 22’ | 767 | 41 | 98 | 20 | maintien, prise de masse | ☐ | |
| rep119 | Tacos poisson – chou – citron vert | Repas | 18’ | 493 | 36 | 44 | 18 | perte de gras, maintien | ☐ | |
| rep120 | Pita PST shawarma – sauce soja – légumes | Repas | 18’ | 538 | 40 | 71 | 9 | maintien, prise de masse | ☐ | |
| rep121 | Taboulé protéiné – pois chiches – menthe | Repas | 18’ | 680 | 35 | 98 | 14 | perte de gras, maintien | ☐ | |
| rep122 | Couscous poulet – légumes – pois chiches | Repas | 30’ | 703 | 55 | 84 | 13 | maintien, prise de masse | ☐ | |
| rep123 | Boulgour – bœuf – ratatouille – yaourt | Repas | 25’ | 607 | 43 | 61 | 19 | maintien, prise de masse | ☐ | |
| rep124 | Semoule – tofu façon merguez – légumes | Repas | 25’ | 719 | 45 | 73 | 25 | maintien, prise de masse | ☐ | |
| rep125 | Boulgour – saumon – courgette – citron | Repas | 22’ | 619 | 39 | 54 | 25 | maintien, prise de masse | ☐ | |
| rep126 | Couscous végétal – pois chiches – PST | Repas | 28’ | 738 | 42 | 104 | 14 | maintien, prise de masse | ☐ | |
| rep127 | Polenta crémeuse – poulet – champignons | Repas | 25’ | 514 | 45 | 54 | 12 | maintien, prise de masse | ☐ | |
| rep128 | Polenta – ratatouille – tofu grillé | Repas | 25’ | 669 | 35 | 65 | 28 | maintien, prise de masse | ☐ | |
| rep129 | Nouilles de riz sautées – tofu – cacahuète | Repas | 20’ | 745 | 37 | 87 | 26 | maintien, prise de masse | ☐ | |
| rep130 | Nouilles de riz – bœuf – brocoli – sésame | Repas | 20’ | 619 | 38 | 75 | 17 | maintien, prise de masse | ☐ | |
| rep131 | Polenta – PST bolognaise – parmesan | Repas | 25’ | 564 | 37 | 70 | 15 | maintien, prise de masse | ☐ | |
| rep132 | Nouilles de riz – crevettes – légumes – coco | Repas | 20’ | 601 | 40 | 81 | 12 | perte de gras, maintien | ☐ | |
| rep133 | Omelette – pommes de terre – épinards | Repas | 18’ | 461 | 28 | 27 | 25 | perte de gras, maintien | ☐ | |
| rep134 | Shakshuka – œufs – pois chiches – pain | Repas | 22’ | 618 | 36 | 53 | 27 | perte de gras, maintien | ☐ | |
| rep135 | Frittata – courgette – feta – quinoa | Repas | 22’ | 569 | 33 | 31 | 33 | perte de gras, maintien | ☐ | |
| rep136 | Œufs cocotte – épinards – patate douce | Repas | 22’ | 419 | 25 | 29 | 21 | perte de gras, maintien | ☐ | |
| rep137 | Omelette protéinée – champignons – riz | Repas | 18’ | 434 | 35 | 50 | 10 | perte de gras | ☐ | |
| rep138 | Œufs brouillés – avocat – patate – maïs | Repas | 18’ | 506 | 24 | 35 | 28 | maintien | ☐ | |
| rep139 | Salade César allégée – poulet – quinoa | Repas | 18’ | 524 | 51 | 36 | 18 | perte de gras, maintien | ☐ | |
| rep140 | Salade riz – thon – maïs – œuf | Repas | 18’ | 655 | 46 | 66 | 22 | perte de gras, maintien | ☐ | |
| rep141 | Salade quinoa – tofu fumé – avocat – edamame | Repas | 18’ | 679 | 38 | 51 | 33 | maintien, prise de masse | ☐ | |
| rep142 | Salade pois chiches – feta – concombre – boulgour | Repas | 18’ | 648 | 28 | 76 | 22 | perte de gras, maintien | ☐ | |
| rep143 | Salade lentilles – saumon fumé – betterave | Repas | 15’ | 498 | 38 | 42 | 16 | perte de gras, maintien | ☐ | |
| rep144 | Salade haricots blancs – thon – tomate | Repas | 12’ | 490 | 46 | 40 | 13 | perte de gras, maintien | ☐ | |
| rep145 | Salade quinoa – haricots noirs – maïs – avocat | Repas | 18’ | 743 | 37 | 91 | 19 | maintien, prise de masse | ☐ | |
| rep146 | Salade poulet – patate douce – épinards | Repas | 25’ | 445 | 45 | 28 | 15 | perte de gras, maintien | ☐ | |
| pd45 | Porridge sarrasin – beurre cacahuète – banane | Petit-déj | 12’ | 480 | 30 | 61 | 12 | maintien, prise de masse | ☐ | |
| pd46 | Porridge millet – cacao – dattes | Petit-déj | 12’ | 501 | 29 | 68 | 12 | maintien, prise de masse | ☐ | |
| pd47 | Pudding chia – mangue – coco | Petit-déj | 5’ | 299 | 19 | 22 | 13 | perte de gras, maintien | ☐ | |
| pd48 | Bowl yaourt soja – amandes – fruits rouges | Petit-déj | 4’ | 326 | 23 | 30 | 12 | perte de gras | ☐ | |
| pd49 | Smoothie bowl protéine pois – framboises – chia | Petit-déj | 6’ | 289 | 27 | 11 | 13 | perte de gras, maintien | ☐ | |
| pd50 | Porridge quinoa – pomme – amandes | Petit-déj | 15’ | 442 | 24 | 54 | 12 | perte de gras, maintien | ☐ | |
| pd51 | Riz au lait d'amande – dattes – cannelle | Petit-déj | 20’ | 582 | 29 | 79 | 16 | maintien, prise de masse | ☐ | |
| pd52 | Tofu brouillé – patate douce – épinards | Petit-déj | 18’ | 470 | 32 | 31 | 22 | perte de gras, maintien | ☐ | |
| pd53 | Bowl yaourt soja protéiné – kiwi – graines courge | Petit-déj | 4’ | 265 | 22 | 20 | 9 | perte de gras | ☐ | |
| pd54 | Pudding chia – cacao – beurre amande – banane | Petit-déj | 5’ | 460 | 30 | 24 | 24 | maintien, prise de masse | ☐ | |
| pd55 | Smoothie soja – mangue – avocat – chia | Petit-déj | 6’ | 335 | 19 | 22 | 17 | perte de gras, maintien | ☐ | |
| pd56 | Galettes de riz – cacahuète – banane – yaourt soja | Petit-déj | 5’ | 445 | 20 | 58 | 14 | maintien, prise de masse | ☐ | |
| pd57 | Porridge millet – framboises – noisettes | Petit-déj | 12’ | 428 | 23 | 55 | 12 | perte de gras, maintien | ☐ | |
| pd58 | Bowl quinoa – fruits rouges – amandes – coco | Petit-déj | 15’ | 468 | 25 | 50 | 16 | perte de gras, maintien | ☐ | |
| col45 | Pudding chia – mangue – coco | Collation | 5’ | 236 | 17 | 19 | 8 | perte de gras | ☐ | |
| col46 | Shake protéine pois – banane – cacao | Collation | 3’ | 324 | 28 | 25 | 12 | maintien, prise de masse | ☐ | |
| col47 | Yaourt soja protéiné – myrtilles – amandes | Collation | 3’ | 239 | 19 | 17 | 9 | perte de gras | ☐ | |
| col48 | Energy balls dattes – cacahuète – sarrasin | Collation | 10’ | 457 | 24 | 58 | 13 | maintien, prise de masse | ☐ | |
| col49 | Galettes de riz – beurre amande – chocolat noir | Collation | 3’ | 377 | 18 | 33 | 18 | maintien | ☐ | |
| col50 | Edamame grillés – sésame – piment | Collation | 8’ | 232 | 17 | 14 | 12 | perte de gras | ☐ | |
| col51 | Smoothie soja – ananas – chia | Collation | 3’ | 195 | 15 | 18 | 6 | perte de gras | ☐ | |
| col52 | Mousse tofu soyeux – cacao – sirop érable | Collation | 8’ | 229 | 24 | 13 | 8 | perte de gras, maintien | ☐ | |
| col53 | Banane – beurre cacahuète – graines courge | Collation | 3’ | 378 | 20 | 31 | 19 | maintien, prise de masse | ☐ | |
| col54 | Compote pomme – chia – noix | Collation | 4’ | 275 | 15 | 21 | 13 | perte de gras | ☐ | |
| rep147 | Riz – soja_texture teriyaki – edamame – brocoli | Repas | 22’ | 622 | 41 | 80 | 13 | maintien, prise de masse | ☐ | |
| rep148 | Quinoa – tofu – curry cacahuète – épinards | Repas | 22’ | 723 | 44 | 58 | 31 | maintien, prise de masse | ☐ | |
| rep149 | Patate douce – haricots noirs – PST – avocat | Repas | 28’ | 645 | 36 | 79 | 15 | maintien, prise de masse | ☐ | |
| rep150 | Riz – tempeh – légumes wok – coco | Repas | 22’ | 667 | 34 | 78 | 20 | maintien, prise de masse | ☐ | |
| rep151 | Polenta – ragoût haricots blancs – PST | Repas | 30’ | 658 | 39 | 95 | 11 | maintien, prise de masse | ☐ | |
| rep152 | Sarrasin – tofu grillé – champignons – levure | Repas | 22’ | 705 | 44 | 64 | 29 | maintien, prise de masse | ☐ | |

## Détail des recettes

### pd01 — Porridge avoine – whey – banane – myrtilles

- **Type** : Petit-déj · **Préparation** : 8 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu, endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 614 kcal · 42 g protéines · 81 g glucides · 12 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 30 g
  - Lait demi-écrémé — 250 ml
  - Flocons d'avoine — 70 g *(pesé sec)*
  - Banane — 100 g
  - Myrtilles — 60 g
- **Préparation** :
  1. Chauffe avoine + lait 4-5 min en remuant.
  2. Hors du feu, incorpore la whey.
  3. Ajoute banane et myrtilles.
- **Pourquoi** : Muscu/endurance prise de masse : glucides complexes + protéines complètes, idéal post-training.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd02 — Overnight oats chia – skyr – framboises

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, perte de gras · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 476 kcal · 28 g protéines · 47 g glucides · 15 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 60 g *(pesé sec)*
  - Skyr nature — 150 g
  - Graines de chia — 15 g
  - Framboises — 80 g
  - Lait d'amande — 150 ml
- **Préparation** :
  1. Mélange avoine, chia, skyr et lait.
  2. Laisse une nuit au frigo.
  3. Ajoute les framboises au matin.
- **Pourquoi** : Muscu maintien/perte de gras : préparé la veille, riche en protéines et fibres rassasiantes.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd03 — Pancakes protéinés banane – flocons – œuf

- **Type** : Petit-déj · **Préparation** : 15 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 501 kcal · 37 g protéines · 60 g glucides · 11 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 60 g *(pesé sec)*
  - Banane — 120 g
  - Œuf entier — 50 g
  - Blanc d'œuf — 60 g
  - Whey (neutre/vanille) — 20 g
- **Préparation** :
  1. Mixe tous les ingrédients.
  2. Cuis de petites galettes 2 min par face.
  3. Sers nature ou avec un fruit.
- **Pourquoi** : Muscu prise de masse : alternative gourmande haute en protéines pour un petit-déj costaud.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd04 — Omelette 3 œufs jambon – champignons

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans lactose, sans gluten
- **Macros / portion (base)** : 319 kcal · 29 g protéines · 2 g glucides · 21 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Jambon blanc — 40 g
  - Champignons — 80 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Saisis les champignons 3 min.
  2. Verse les œufs battus + jambon.
  3. Cuis 4 min, plie.
- **Pourquoi** : Muscu/combats perte de gras : très protéiné, pauvre en glucides pour démarrer léger.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd05 — Œufs brouillés – avocat – pain complet

- **Type** : Petit-déj · **Préparation** : 10 min
- **Objectif** : maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 465 kcal · 26 g protéines · 26 g glucides · 26 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Avocat — 50 g
  - Pain complet — 60 g
  - Épinards frais — 40 g — quantité fixe
- **Préparation** :
  1. Brouille les œufs à feu doux.
  2. Toaste le pain, écrase l'avocat dessus.
  3. Sers avec les épinards.
- **Pourquoi** : Muscu maintien : bons lipides de l'avocat + protéines, équilibré pour un jour off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd06 — Skyr bowl granola – fruits rouges – amandes

- **Type** : Petit-déj · **Préparation** : 4 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu, endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 404 kcal · 29 g protéines · 42 g glucides · 11 g lipides
- **Ingrédients** :
  - Skyr nature — 200 g
  - Flocons d'avoine — 30 g *(pesé sec)*
  - Amandes — 15 g
  - Fruits rouges (mélange) — 80 g
  - Miel — 10 g — quantité fixe
- **Préparation** :
  1. Verse le skyr.
  2. Ajoute flocons, amandes, fruits rouges.
  3. Filet de miel.
- **Pourquoi** : Muscu/endurance perte de gras : très protéiné, sucres maîtrisés, rapide.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd07 — Smoothie bowl mangue – épinards – protéine

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 389 kcal · 24 g protéines · 49 g glucides · 9 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 25 g
  - Mangue — 120 g
  - Banane — 80 g
  - Épinards frais — 30 g — quantité fixe
  - Lait d'amande — 150 ml
  - Flocons d'avoine — 20 g *(pesé sec)*
- **Préparation** :
  1. Mixe le tout en texture épaisse.
  2. Verse dans un bol.
  3. Ajoute des toppings au choix.
- **Pourquoi** : Endurance maintien : glucides accessibles + micronutriments, léger sur l'estomac.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd08 — Tartines seigle – cottage cheese – tomate

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 359 kcal · 19 g protéines · 42 g glucides · 11 g lipides
- **Ingrédients** :
  - Pain de seigle — 70 g
  - Cottage cheese — 120 g
  - Tomate — 80 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Toaste le pain de seigle.
  2. Étale le cottage cheese.
  3. Dépose tomates + filet d'huile.
- **Pourquoi** : Muscu perte de gras : protéines lentes du cottage cheese, satiété longue.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd09 — Porridge chocolat – cacao – beurre de cacahuète

- **Type** : Petit-déj · **Préparation** : 8 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 697 kcal · 47 g protéines · 75 g glucides · 21 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 70 g *(pesé sec)*
  - Lait demi-écrémé — 250 ml
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Beurre de cacahuète — 15 g
  - Whey (neutre/vanille) — 30 g
  - Banane — 80 g
- **Préparation** :
  1. Cuis avoine + lait + cacao 5 min.
  2. Incorpore whey et beurre de cacahuète.
  3. Garnis de banane.
- **Pourquoi** : Muscu prise de masse : calorique et protéiné, parfait surplus propre.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd10 — Yaourt grec – noix – miel – pomme

- **Type** : Petit-déj · **Préparation** : 4 min
- **Objectif** : maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 484 kcal · 10 g protéines · 42 g glucides · 28 g lipides
- **Ingrédients** :
  - Yaourt grec — 200 g
  - Noix — 15 g
  - Miel — 10 g — quantité fixe
  - Pomme — 120 g
  - Flocons d'avoine — 20 g *(pesé sec)*
- **Préparation** :
  1. Verse le yaourt.
  2. Ajoute pomme en dés, noix, flocons.
  3. Filet de miel.
- **Pourquoi** : Muscu maintien : équilibre protéines/lipides oméga-3 des noix, jour off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd11 — Omelette blancs – épinards – feta

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : perte de gras · **Sport** : muscu, combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 303 kcal · 32 g protéines · 4 g glucides · 17 g lipides
- **Ingrédients** :
  - Blanc d'œuf — 180 g
  - Œuf entier — 50 g
  - Épinards frais — 60 g — quantité fixe
  - Feta — 30 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Fais tomber les épinards.
  2. Verse blancs + 1 œuf.
  3. Émiette la feta, plie.
- **Pourquoi** : Muscu/combats perte de gras : protéines maximales, calories basses pour le poids de catégorie.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd12 — Pain perdu protéiné

- **Type** : Petit-déj · **Préparation** : 15 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 489 kcal · 36 g protéines · 51 g glucides · 14 g lipides
- **Ingrédients** :
  - Pain complet — 80 g
  - Œuf entier — 100 g
  - Lait demi-écrémé — 100 ml
  - Whey (neutre/vanille) — 15 g
  - Fruits rouges (mélange) — 60 g
  - Sirop d'érable — 10 g — quantité fixe
- **Préparation** :
  1. Trempe le pain dans œuf + lait + whey.
  2. Dore 2 min par face.
  3. Garnis de fruits et sirop.
- **Pourquoi** : Muscu prise de masse : version protéinée du classique, glucides + protéines élevés.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd13 — Wrap petit-déj œuf – dinde – poivron

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 411 kcal · 32 g protéines · 34 g glucides · 15 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 60 g
  - Œuf entier — 100 g
  - Escalope de dinde — 60 g *(pesé cru)*
  - Poivron — 60 g — quantité fixe
- **Préparation** :
  1. Cuis l'œuf brouillé et la dinde émincée.
  2. Réchauffe la tortilla.
  3. Garnis et roule.
- **Pourquoi** : Muscu/combats maintien : transportable, double source de protéines maigres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd14 — Smoothie avoine – banane – beurre d'amande – whey

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : prise de masse · **Sport** : muscu, endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 613 kcal · 43 g protéines · 63 g glucides · 20 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 30 g
  - Banane — 120 g
  - Beurre d'amande — 20 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Lait demi-écrémé — 250 ml
- **Préparation** :
  1. Mixe tous les ingrédients.
  2. Ajuste l'épaisseur avec un peu d'eau.
- **Pourquoi** : Muscu/endurance prise de masse : liquide, calorique, idéal si peu d'appétit au réveil.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd15 — Fromage blanc – muesli – kiwi – graines de courge

- **Type** : Petit-déj · **Préparation** : 4 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 397 kcal · 24 g protéines · 43 g glucides · 11 g lipides
- **Ingrédients** :
  - Fromage blanc 0% — 200 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Kiwi — 100 g
  - Graines de courge — 15 g
- **Préparation** :
  1. Verse le fromage blanc.
  2. Ajoute flocons, kiwi, graines.
- **Pourquoi** : Endurance perte de gras : léger, riche en protéines et en magnésium des graines.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd16 — Tofu brouillé curcuma – épinards – pain

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 402 kcal · 26 g protéines · 27 g glucides · 19 g lipides
- **Ingrédients** :
  - Tofu ferme — 150 g
  - Épinards frais — 60 g — quantité fixe
  - Pain complet — 50 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Émiette le tofu, poêle avec curcuma 5 min.
  2. Ajoute les épinards.
  3. Sers avec le pain grillé.
- **Pourquoi** : Muscu perte de gras 100% végétal : alternative protéinée sans œuf.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd17 — Porridge quinoa – pomme – cannelle

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 472 kcal · 28 g protéines · 47 g glucides · 18 g lipides
- **Ingrédients** :
  - Quinoa — 50 g *(pesé sec)*
  - Lait d'amande — 250 ml
  - Pomme — 120 g
  - Amandes — 10 g
  - Whey (neutre/vanille) — 20 g
- **Préparation** :
  1. Cuis le quinoa dans le lait 12 min.
  2. Ajoute pomme + cannelle.
  3. Incorpore la whey hors du feu.
- **Pourquoi** : Endurance maintien : quinoa = glucides + protéine complète, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd18 — Pita complet – saumon fumé – fromage frais

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, halal
- **Macros / portion (base)** : 352 kcal · 26 g protéines · 37 g glucides · 10 g lipides
- **Ingrédients** :
  - Pain pita complet — 70 g
  - Saumon fumé — 60 g
  - Cottage cheese — 60 g
  - Concombre — 50 g — quantité fixe
- **Préparation** :
  1. Toaste le pita.
  2. Étale le fromage, dépose saumon et concombre.
- **Pourquoi** : Muscu maintien : oméga-3 du saumon + protéines, petit-déj salé rapide.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd19 — Shake gainer maison

- **Type** : Petit-déj · **Préparation** : 4 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 819 kcal · 55 g protéines · 95 g glucides · 22 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 40 g
  - Flocons d'avoine — 60 g *(pesé sec)*
  - Lait demi-écrémé — 300 ml
  - Dattes dénoyautées — 30 g
  - Beurre de cacahuète — 20 g
  - Banane — 100 g
- **Préparation** :
  1. Mixe tout au blender 45 s.
  2. Bois immédiatement.
- **Pourquoi** : Muscu prise de masse : bombe calorique propre pour prendre de la masse facilement.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd20 — Shakshuka light œufs – pois chiches

- **Type** : Petit-déj · **Préparation** : 18 min
- **Objectif** : maintien, perte de gras · **Sport** : muscu, combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 533 kcal · 31 g protéines · 39 g glucides · 26 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Tomate concassée — 150 g — quantité fixe
  - Poivron — 80 g — quantité fixe
  - Pois chiches — 30 g *(pesé sec)*
  - Huile d'olive — 8 g
  - Pain complet — 40 g
- **Préparation** :
  1. Mijote tomate + poivron + pois chiches 8 min.
  2. Casse les œufs dedans, couvre 5 min.
  3. Sers avec le pain.
- **Pourquoi** : Muscu/combats maintien : plat complet protéiné, double protéine animale + végétale.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col01 — Bowl skyr – flocons – amandes – miel

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien · **Sport** : muscu, combats · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 333 kcal · 23 g protéines · 33 g glucides · 11 g lipides
- **Ingrédients** :
  - Skyr nature — 150 g
  - Flocons d'avoine — 30 g *(pesé sec)*
  - Amandes — 15 g
  - Miel — 10 g — quantité fixe
- **Préparation** :
  1. Verse le skyr.
  2. Ajoute flocons, amandes, miel.
- **Pourquoi** : Muscu/combats maintien : caséine lente, parfaite entre deux repas ou avant le coucher.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col02 — Shake whey – banane – lait

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 363 kcal · 36 g protéines · 41 g glucides · 7 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 30 g
  - Banane — 120 g
  - Lait demi-écrémé — 300 ml
- **Préparation** :
  1. Mixe et bois.
- **Pourquoi** : Muscu prise de masse : shake post-training simple pour relancer la synthèse protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col03 — Cottage cheese – ananas – noix

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 354 kcal · 24 g protéines · 19 g glucides · 19 g lipides
- **Ingrédients** :
  - Cottage cheese — 200 g
  - Ananas — 100 g
  - Noix — 15 g
- **Préparation** :
  1. Mélange cottage cheese et ananas.
  2. Parsème de noix.
- **Pourquoi** : Muscu perte de gras : très protéiné, peu calorique, satiété élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col04 — Energy balls dattes – avoine – cacahuète

- **Type** : Collation · **Préparation** : 15 min
- **Objectif** : prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 665 kcal · 30 g protéines · 76 g glucides · 23 g lipides
- **Ingrédients** :
  - Dattes dénoyautées — 60 g
  - Flocons d'avoine — 50 g *(pesé sec)*
  - Beurre de cacahuète — 30 g
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Protéine végétale (pois/soja) — 20 g
- **Préparation** :
  1. Mixe dattes + avoine + beurre.
  2. Forme des boules.
  3. Réfrigère 30 min.
- **Pourquoi** : Endurance prise de masse : énergie dense et transportable pour les sorties longues.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col05 — Tartine pain complet – cacahuète – banane

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : prise de masse · **Sport** : endurance, muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 389 kcal · 12 g protéines · 49 g glucides · 14 g lipides
- **Ingrédients** :
  - Pain complet — 60 g
  - Beurre de cacahuète — 25 g
  - Banane — 100 g
- **Préparation** :
  1. Toaste le pain.
  2. Étale le beurre, dépose la banane.
- **Pourquoi** : Endurance/muscu prise de masse : glucides + lipides, collation pré-entraînement.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col06 — Smoothie protéiné végétal cacahuète – datte

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 599 kcal · 33 g protéines · 63 g glucides · 23 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 30 g
  - Banane — 120 g
  - Beurre de cacahuète — 20 g
  - Lait d'amande — 250 ml
  - Dattes dénoyautées — 30 g
  - Flocons d'avoine — 20 g *(pesé sec)*
- **Préparation** :
  1. Mixe tout 45 s.
- **Pourquoi** : Endurance prise de masse 100% végétal : carburant liquide post-sortie longue.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col07 — Yaourt grec – myrtilles – chia

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 306 kcal · 8 g protéines · 20 g glucides · 19 g lipides
- **Ingrédients** :
  - Yaourt grec — 170 g
  - Myrtilles — 80 g
  - Graines de chia — 15 g
  - Miel — 5 g — quantité fixe
- **Préparation** :
  1. Mélange yaourt et chia.
  2. Ajoute myrtilles et miel.
- **Pourquoi** : Muscu perte de gras : protéines + oméga-3 du chia, antioxydants des myrtilles.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col08 — Mousse fromage blanc – cacao – whey

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 243 kcal · 36 g protéines · 17 g glucides · 3 g lipides
- **Ingrédients** :
  - Fromage blanc 0% — 250 g
  - Whey (neutre/vanille) — 20 g
  - Cacao maigre en poudre — 8 g — quantité fixe
  - Miel — 5 g — quantité fixe
- **Préparation** :
  1. Fouette fromage blanc + whey + cacao.
  2. Réfrigère 10 min.
- **Pourquoi** : Muscu perte de gras : dessert protéiné ultra rassasiant, calories basses.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col09 — Galettes de riz – fromage frais – dinde

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans gluten, halal
- **Macros / portion (base)** : 245 kcal · 24 g protéines · 26 g glucides · 4 g lipides
- **Ingrédients** :
  - Galette de riz soufflé — 30 g
  - Cottage cheese — 60 g
  - Escalope de dinde — 60 g *(pesé cru)*
  - Concombre — 40 g — quantité fixe
- **Préparation** :
  1. Tartine les galettes.
  2. Dépose dinde et concombre.
- **Pourquoi** : Muscu/combats perte de gras : protéines maigres, croquant, faible en gras.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col10 — Amandes – chocolat noir – pomme

- **Type** : Collation · **Préparation** : 1 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 311 kcal · 7 g protéines · 20 g glucides · 20 g lipides
- **Ingrédients** :
  - Amandes — 25 g
  - Chocolat noir 70% — 15 g
  - Pomme — 120 g
- **Préparation** :
  1. Assemble et déguste.
- **Pourquoi** : Endurance maintien : énergie rapide + bons lipides, zéro préparation.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col11 — Shake récup riz – whey – miel

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 487 kcal · 32 g protéines · 57 g glucides · 14 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 30 g
  - Banane — 120 g
  - Miel — 15 g — quantité fixe
  - Lait d'amande — 300 ml
  - Flocons d'avoine — 30 g *(pesé sec)*
- **Préparation** :
  1. Mixe tout.
- **Pourquoi** : Endurance maintien : ratio glucides/protéines pensé pour la récup post-effort.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col12 — Houmous – bâtonnets de carotte – pita

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 360 kcal · 12 g protéines · 44 g glucides · 13 g lipides
- **Ingrédients** :
  - Pois chiches — 40 g *(pesé sec)*
  - Huile d'olive — 10 g
  - Carotte — 100 g — quantité fixe
  - Pain pita complet — 40 g
- **Préparation** :
  1. Mixe pois chiches + huile en houmous.
  2. Sers avec carottes et pita.
- **Pourquoi** : Endurance perte de gras : protéines végétales + fibres, rassasiant et léger.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col13 — Skyr – granola – mangue

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 370 kcal · 29 g protéines · 40 g glucides · 8 g lipides
- **Ingrédients** :
  - Skyr nature — 200 g
  - Flocons d'avoine — 30 g *(pesé sec)*
  - Mangue — 100 g
  - Graines de courge — 10 g
- **Préparation** :
  1. Verse le skyr.
  2. Ajoute granola, mangue, graines.
- **Pourquoi** : Muscu maintien : protéines élevées, sucres des fruits, simple.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col14 — Œufs durs – avocat – tomate

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : perte de gras · **Sport** : muscu, combats · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 256 kcal · 14 g protéines · 3 g glucides · 21 g lipides
- **Ingrédients** :
  - Œuf entier — 100 g
  - Avocat — 50 g
  - Tomate — 80 g — quantité fixe
- **Préparation** :
  1. Cuis les œufs durs 9 min.
  2. Sers avec avocat et tomate.
- **Pourquoi** : Muscu/combats perte de gras : protéines + bons lipides, sans glucides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col15 — Barre avoine – whey – miel maison

- **Type** : Collation · **Préparation** : 20 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 549 kcal · 36 g protéines · 59 g glucides · 17 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 60 g *(pesé sec)*
  - Whey (neutre/vanille) — 30 g
  - Miel — 20 g — quantité fixe
  - Beurre de cacahuète — 20 g
  - Lait demi-écrémé — 40 ml
- **Préparation** :
  1. Mélange tout en pâte.
  2. Tasse dans un moule, réfrigère 1 h.
  3. Coupe en barres.
- **Pourquoi** : Muscu prise de masse : snack solide protéiné, alternative aux barres du commerce.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col16 — Edamame vapeur – sauce soja

- **Type** : Collation · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 192 kcal · 17 g protéines · 14 g glucides · 8 g lipides
- **Ingrédients** :
  - Edamame — 150 g
  - Sauce soja — 10 ml — quantité fixe
- **Préparation** :
  1. Cuis les edamame 5 min vapeur.
  2. Sale légèrement, sauce soja.
- **Pourquoi** : Combats perte de gras : protéines végétales, très peu calorique, coupe-faim.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col17 — Yaourt grec – raisins – noisettes

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 403 kcal · 11 g protéines · 27 g glucides · 27 g lipides
- **Ingrédients** :
  - Yaourt grec — 200 g
  - Raisins — 40 g
  - Noisettes — 15 g
  - Flocons d'avoine — 20 g *(pesé sec)*
- **Préparation** :
  1. Mélange tout.
- **Pourquoi** : Endurance maintien : énergie + protéines, lipides des noisettes.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col18 — Smoothie vert kiwi – épinards – protéine

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : perte de gras · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 327 kcal · 24 g protéines · 32 g glucides · 11 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 25 g
  - Kiwi — 100 g
  - Épinards frais — 30 g — quantité fixe
  - Lait d'amande — 250 ml
  - Banane — 80 g
- **Préparation** :
  1. Mixe en smoothie.
- **Pourquoi** : Endurance perte de gras : léger, vitaminé, protéines végétales.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col19 — Cottage cheese – pain de seigle – concombre

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 314 kcal · 21 g protéines · 32 g glucides · 10 g lipides
- **Ingrédients** :
  - Cottage cheese — 150 g
  - Pain de seigle — 50 g
  - Concombre — 60 g — quantité fixe
  - Huile d'olive — 3 g
- **Préparation** :
  1. Tartine le cottage cheese.
  2. Dépose le concombre.
- **Pourquoi** : Muscu perte de gras : salé, protéiné, faible densité calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col20 — Pudding chia – fruits rouges

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 339 kcal · 19 g protéines · 21 g glucides · 17 g lipides
- **Ingrédients** :
  - Graines de chia — 30 g
  - Lait d'amande — 200 ml
  - Fruits rouges (mélange) — 80 g
  - Miel — 10 g — quantité fixe
  - Protéine végétale (pois/soja) — 15 g
- **Préparation** :
  1. Mélange chia + lait + protéine.
  2. Repos 1 nuit.
  3. Ajoute fruits et miel.
- **Pourquoi** : Endurance maintien : oméga-3, fibres, préparé à l'avance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep01 — Poulet – riz basmati – brocoli

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 633 kcal · 54 g protéines · 67 g glucides · 14 g lipides
- **Ingrédients** :
  - Filet de poulet — 180 g *(pesé cru)*
  - Riz basmati — 80 g *(pesé sec)*
  - Brocoli — 200 g — quantité fixe
  - Huile d'olive — 10 g
- **Préparation** :
  1. Cuis le riz ; brocoli vapeur.
  2. Saisis le poulet 6-7 min.
  3. Assemble.
- **Pourquoi** : Muscu prise de masse : le classique protéine maigre + glucides pour le glycogène.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep02 — Saumon – patate douce – épinards

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien · **Sport** : endurance, muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 586 kcal · 39 g protéines · 47 g glucides · 24 g lipides
- **Ingrédients** :
  - Pavé de saumon — 150 g *(pesé cru)*
  - Patate douce — 250 g *(pesé cru)*
  - Épinards frais — 150 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Patate douce au four 25 min.
  2. Poêle le saumon.
  3. Épinards tombés.
- **Pourquoi** : Endurance/muscu maintien : oméga-3 anti-inflammatoires, repas récup jour off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep03 — Dahl de lentilles corail – riz

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras · **Sport** : endurance, combats · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 675 kcal · 33 g protéines · 86 g glucides · 18 g lipides
- **Ingrédients** :
  - Lentilles corail — 100 g *(pesé sec)*
  - Lait de coco — 60 ml
  - Riz basmati — 40 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Oignon — 50 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Revenir oignon + épices.
  2. Lentilles + tomate + coco + eau, 18 min.
  3. Sers sur le riz.
- **Pourquoi** : Endurance/combats perte de gras : fibres et fer végétal — densité protéique à surveiller.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep04 — Bœuf 5% – wok – nouilles complètes

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : prise de masse · **Sport** : combats, muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 598 kcal · 45 g protéines · 58 g glucides · 19 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Nouilles complètes — 70 g *(pesé sec)*
  - Mélange wok (poivron/brocoli/carotte) — 200 g — quantité fixe
  - Huile d'olive — 10 g
  - Sauce soja — 15 ml — quantité fixe
- **Préparation** :
  1. Cuis les nouilles.
  2. Saisis le bœuf, réserve.
  3. Sauté légumes + nouilles + bœuf.
- **Pourquoi** : Combats/muscu prise de masse : fer héminique et créatine du bœuf maigre.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep05 — Tofu – quinoa – légumes

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras · **Sport** : combats, endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 520 kcal · 30 g protéines · 45 g glucides · 22 g lipides
- **Ingrédients** :
  - Tofu ferme — 150 g
  - Quinoa — 60 g *(pesé sec)*
  - Courgette — 100 g — quantité fixe
  - Poivron — 100 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuis le quinoa.
  2. Dore le tofu en dés.
  3. Ajoute légumes + sauce soja.
- **Pourquoi** : Combats/endurance perte de gras : végétal complet, léger pour le séchage.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep06 — Cabillaud – boulgour – pois chiches – courgettes

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance, combats · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 584 kcal · 50 g protéines · 61 g glucides · 13 g lipides
- **Ingrédients** :
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Boulgour — 60 g *(pesé sec)*
  - Pois chiches — 40 g *(pesé sec)*
  - Courgette — 150 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis le boulgour.
  2. Poêle courgettes + pois chiches.
  3. Cuis le cabillaud, citron.
- **Pourquoi** : Endurance/combats perte de gras : meilleur profil recomp, poisson maigre + légumineuse.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep07 — Poulet – patates douces rôties – haricots verts

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 538 kcal · 49 g protéines · 49 g glucides · 13 g lipides
- **Ingrédients** :
  - Filet de poulet — 180 g *(pesé cru)*
  - Patate douce — 250 g *(pesé cru)*
  - Haricots verts — 150 g — quantité fixe
  - Huile d'olive — 10 g
- **Préparation** :
  1. Patate douce en cubes au four 25 min.
  2. Rôtis le poulet 20 min.
  3. Haricots verts vapeur.
- **Pourquoi** : Muscu prise de masse : glucides à index modéré, repas batch-cooking idéal.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep08 — Pâtes complètes bolognaise bœuf 5%

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 639 kcal · 46 g protéines · 70 g glucides · 18 g lipides
- **Ingrédients** :
  - Pâtes complètes — 90 g *(pesé sec)*
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Tomate concassée — 150 g — quantité fixe
  - Oignon — 50 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Revenir oignon + bœuf.
  2. Ajoute tomate, mijote 15 min.
  3. Sers sur les pâtes.
- **Pourquoi** : Muscu/combats prise de masse : confort food protéinée, glucides complets.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep09 — Burrito bowl poulet – riz complet – avocat – maïs

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 660 kcal · 47 g protéines · 75 g glucides · 17 g lipides
- **Ingrédients** :
  - Filet de poulet — 160 g *(pesé cru)*
  - Riz complet — 80 g *(pesé sec)*
  - Avocat — 50 g
  - Maïs — 80 g
  - Poivron — 80 g — quantité fixe
- **Préparation** :
  1. Cuis le riz complet.
  2. Saisis le poulet épicé.
  3. Dresse en bowl avec avocat et maïs.
- **Pourquoi** : Muscu prise de masse : dense, savoureux, bons lipides de l'avocat.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep10 — Curry pois chiches – épinards – riz

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 636 kcal · 25 g protéines · 88 g glucides · 18 g lipides
- **Ingrédients** :
  - Pois chiches — 80 g *(pesé sec)*
  - Épinards frais — 80 g — quantité fixe
  - Tomate concassée — 150 g — quantité fixe
  - Lait de coco — 60 ml
  - Riz basmati — 50 g *(pesé sec)*
- **Préparation** :
  1. Mijote pois chiches + tomate + coco 12 min.
  2. Ajoute les épinards.
  3. Sers sur le riz.
- **Pourquoi** : Endurance perte de gras : végétal riche en fibres, réconfortant et économique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep11 — Bavette de bœuf – pommes de terre – salade

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 498 kcal · 36 g protéines · 41 g glucides · 19 g lipides
- **Ingrédients** :
  - Bavette de bœuf — 150 g *(pesé cru)*
  - Pomme de terre — 250 g *(pesé cru)*
  - Salade verte — 60 g — quantité fixe
  - Huile d'olive — 10 g
- **Préparation** :
  1. Pommes de terre rôties 25 min.
  2. Saisis la bavette 3 min par face.
  3. Sers avec la salade.
- **Pourquoi** : Muscu/combats prise de masse : viande rouge riche en fer, repas de force.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep12 — Saumon – quinoa – asperges

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien · **Sport** : endurance, muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 623 kcal · 44 g protéines · 44 g glucides · 28 g lipides
- **Ingrédients** :
  - Pavé de saumon — 150 g *(pesé cru)*
  - Quinoa — 70 g *(pesé sec)*
  - Asperges — 150 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuis le quinoa.
  2. Poêle le saumon.
  3. Asperges rôties 12 min.
- **Pourquoi** : Endurance/muscu maintien : oméga-3 + protéine complète, repas récup.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep13 — Wrap poulet – crudités – fromage frais

- **Type** : Repas · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, halal
- **Macros / portion (base)** : 443 kcal · 45 g protéines · 41 g glucides · 10 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 70 g
  - Filet de poulet — 140 g *(pesé cru)*
  - Salade verte — 40 g — quantité fixe
  - Tomate — 60 g — quantité fixe
  - Cottage cheese — 50 g
- **Préparation** :
  1. Cuis le poulet émincé.
  2. Garnis la tortilla.
  3. Roule serré.
- **Pourquoi** : Muscu perte de gras : repas rapide protéiné, transportable.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep14 — Chili sin carne haricots rouges – maïs

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 573 kcal · 25 g protéines · 91 g glucides · 8 g lipides
- **Ingrédients** :
  - Haricots rouges — 80 g *(pesé sec)*
  - Maïs — 80 g
  - Tomate concassée — 150 g — quantité fixe
  - Poivron — 80 g — quantité fixe
  - Riz basmati — 40 g *(pesé sec)*
  - Huile d'olive — 5 g
- **Préparation** :
  1. Revenir poivron + épices.
  2. Haricots + maïs + tomate, mijote 20 min.
  3. Sers avec le riz.
- **Pourquoi** : Endurance perte de gras : végétal très rassasiant, riche en fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep15 — Dinde sautée – nouilles de riz – légumes wok

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : combats, muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 588 kcal · 52 g protéines · 67 g glucides · 12 g lipides
- **Ingrédients** :
  - Escalope de dinde — 180 g *(pesé cru)*
  - Nouilles de riz — 70 g *(pesé sec)*
  - Mélange wok (poivron/brocoli/carotte) — 200 g — quantité fixe
  - Sauce soja — 15 ml — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis les nouilles.
  2. Saisis la dinde.
  3. Sauté légumes + nouilles + sauce.
- **Pourquoi** : Combats/muscu perte de gras : protéine très maigre, repas léger et rapide.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep16 — Cabillaud – pommes de terre – ratatouille

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 481 kcal · 40 g protéines · 51 g glucides · 11 g lipides
- **Ingrédients** :
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Pomme de terre — 250 g *(pesé cru)*
  - Ratatouille de légumes — 200 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis les pommes de terre.
  2. Mijote la ratatouille.
  3. Cuis le cabillaud vapeur.
- **Pourquoi** : Endurance perte de gras : poisson maigre + légumes, parfait jour off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep17 — Buddha bowl tofu – quinoa – betterave – houmous

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 640 kcal · 35 g protéines · 58 g glucides · 27 g lipides
- **Ingrédients** :
  - Tofu ferme — 150 g
  - Quinoa — 60 g *(pesé sec)*
  - Betterave cuite — 80 g — quantité fixe
  - Pois chiches — 25 g *(pesé sec)*
  - Huile d'olive — 8 g
  - Roquette — 40 g — quantité fixe
- **Préparation** :
  1. Cuis le quinoa.
  2. Dore le tofu.
  3. Dresse avec betterave, houmous, roquette.
- **Pourquoi** : Endurance maintien : bowl végétal complet, double protéine végétale.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep18 — Omelette géante poulet – mozzarella – épinards

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans gluten, halal
- **Macros / portion (base)** : 501 kcal · 51 g protéines · 2 g glucides · 31 g lipides
- **Ingrédients** :
  - Œuf entier — 200 g
  - Filet de poulet — 80 g *(pesé cru)*
  - Épinards frais — 60 g — quantité fixe
  - Mozzarella light — 30 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Saisis poulet + épinards.
  2. Verse les œufs.
  3. Ajoute mozzarella, plie.
- **Pourquoi** : Muscu perte de gras : très haute protéine, glucides quasi nuls.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep19 — Pâtes thon – tomate – olives

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien · **Sport** : endurance, muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 605 kcal · 45 g protéines · 66 g glucides · 16 g lipides
- **Ingrédients** :
  - Pâtes complètes — 90 g *(pesé sec)*
  - Thon au naturel (conserve) — 120 g
  - Tomate concassée — 150 g — quantité fixe
  - Olives — 20 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuis les pâtes.
  2. Chauffe tomate + thon + olives.
  3. Mélange.
- **Pourquoi** : Endurance/muscu maintien : rapide, protéines + glucides, placard-friendly.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep20 — Poke bowl saumon – riz – edamame

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu, endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 768 kcal · 47 g protéines · 72 g glucides · 31 g lipides
- **Ingrédients** :
  - Pavé de saumon — 150 g *(pesé cru)*
  - Riz basmati — 80 g *(pesé sec)*
  - Edamame — 80 g
  - Concombre — 60 g — quantité fixe
  - Sauce soja — 15 ml — quantité fixe
  - Avocat — 40 g
- **Préparation** :
  1. Cuis le riz, laisse tiédir.
  2. Coupe le saumon cru en dés.
  3. Dresse avec edamame, concombre, avocat.
- **Pourquoi** : Muscu/endurance prise de masse : oméga-3, double protéine, frais.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep21 — Poulet tikka – riz basmati – yaourt

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans gluten, halal
- **Macros / portion (base)** : 636 kcal · 51 g protéines · 69 g glucides · 17 g lipides
- **Ingrédients** :
  - Filet de poulet — 180 g *(pesé cru)*
  - Riz basmati — 80 g *(pesé sec)*
  - Yaourt grec — 60 g
  - Tomate concassée — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Marine le poulet dans yaourt + épices.
  2. Saisis 8 min.
  3. Sers avec sauce tomate et riz.
- **Pourquoi** : Muscu prise de masse : épicé, protéiné, glucides pour la performance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep22 — Soupe de lentilles – légumes – pain complet

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 497 kcal · 29 g protéines · 68 g glucides · 8 g lipides
- **Ingrédients** :
  - Lentilles corail — 80 g *(pesé sec)*
  - Carotte — 100 g — quantité fixe
  - Oignon — 50 g — quantité fixe
  - Tomate concassée — 100 g — quantité fixe
  - Pain complet — 50 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Revenir oignon + carotte.
  2. Lentilles + tomate + eau, 20 min.
  3. Mixe, sers avec le pain.
- **Pourquoi** : Endurance perte de gras : chaude, rassasiante, riche en fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep23 — Steak haché 5% – purée patate douce – brocoli

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 517 kcal · 41 g protéines · 46 g glucides · 16 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Patate douce — 250 g *(pesé cru)*
  - Brocoli — 150 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis et écrase la patate douce.
  2. Brocoli vapeur.
  3. Saisis le steak.
- **Pourquoi** : Muscu prise de masse : protéine + fer, glucides récup.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep24 — Crevettes sautées – nouilles – légumes (pad thaï light)

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : combats, endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 546 kcal · 43 g protéines · 68 g glucides · 10 g lipides
- **Ingrédients** :
  - Crevettes cuites — 150 g
  - Nouilles de riz — 70 g *(pesé sec)*
  - Mélange wok (poivron/brocoli/carotte) — 180 g — quantité fixe
  - Beurre de cacahuète — 15 g
  - Sauce soja — 10 ml — quantité fixe
- **Préparation** :
  1. Cuis les nouilles.
  2. Saisis les crevettes.
  3. Sauté avec légumes + sauce cacahuète.
- **Pourquoi** : Combats/endurance perte de gras : protéine ultra maigre, saveurs asiatiques légères.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep25 — Tempeh grillé – riz complet – chou-fleur rôti

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 620 kcal · 33 g protéines · 66 g glucides · 20 g lipides
- **Ingrédients** :
  - Tempeh — 150 g
  - Riz complet — 70 g *(pesé sec)*
  - Chou-fleur — 200 g — quantité fixe
  - Huile d'olive — 10 g
- **Préparation** :
  1. Riz complet à cuire.
  2. Grille le tempeh mariné.
  3. Chou-fleur rôti 25 min.
- **Pourquoi** : Muscu maintien : protéine végétale fermentée complète, jour off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep26 — Maquereau – pommes de terre – salade

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 550 kcal · 33 g protéines · 43 g glucides · 26 g lipides
- **Ingrédients** :
  - Maquereau — 150 g *(pesé cru)*
  - Pomme de terre — 250 g *(pesé cru)*
  - Salade verte — 60 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuis les pommes de terre.
  2. Grille le maquereau 8 min.
  3. Sers avec la salade.
- **Pourquoi** : Endurance maintien : oméga-3 abondants, récup post-sortie longue.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep27 — Wok poulet – riz – légumes – amandes

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 660 kcal · 54 g protéines · 75 g glucides · 14 g lipides
- **Ingrédients** :
  - Filet de poulet — 170 g *(pesé cru)*
  - Riz basmati — 80 g *(pesé sec)*
  - Mélange wok (poivron/brocoli/carotte) — 200 g — quantité fixe
  - Amandes — 20 g
  - Sauce soja — 15 ml — quantité fixe
- **Préparation** :
  1. Cuis le riz.
  2. Saisis le poulet.
  3. Sauté légumes + amandes + sauce.
- **Pourquoi** : Muscu prise de masse : croquant, protéiné, lipides des amandes.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep28 — Galette de polenta – ratatouille – œuf

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, perte de gras · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 554 kcal · 25 g protéines · 55 g glucides · 26 g lipides
- **Ingrédients** :
  - Polenta — 60 g *(pesé sec)*
  - Ratatouille de légumes — 200 g — quantité fixe
  - Œuf entier — 100 g
  - Parmesan — 15 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis et dore la polenta.
  2. Réchauffe la ratatouille.
  3. Œuf poché dessus + parmesan.
- **Pourquoi** : Endurance maintien : sans gluten, légumes + protéine, réconfortant.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep29 — Pois chiches rôtis – boulgour – feta

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 673 kcal · 30 g protéines · 82 g glucides · 21 g lipides
- **Ingrédients** :
  - Pois chiches — 80 g *(pesé sec)*
  - Boulgour — 60 g *(pesé sec)*
  - Courgette — 100 g — quantité fixe
  - Tomate — 80 g — quantité fixe
  - Feta — 30 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Rôtis les pois chiches épicés 20 min.
  2. Cuis le boulgour.
  3. Mélange avec légumes et feta.
- **Pourquoi** : Endurance perte de gras : protéines végétales, méditerranéen, fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep30 — Dinde – patate douce – épinards

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, perte de gras · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 502 kcal · 49 g protéines · 46 g glucides · 11 g lipides
- **Ingrédients** :
  - Escalope de dinde — 180 g *(pesé cru)*
  - Patate douce — 250 g *(pesé cru)*
  - Épinards frais — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Patate douce rôtie.
  2. Saisis la dinde.
  3. Épinards tombés.
- **Pourquoi** : Muscu maintien : protéine très maigre, glucides à index modéré.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep31 — Pâtes – poulet – pesto – tomates

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 596 kcal · 50 g protéines · 70 g glucides · 11 g lipides
- **Ingrédients** :
  - Pâtes (semoule) — 90 g *(pesé sec)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Pesto — 20 g
  - Tomate — 100 g — quantité fixe
- **Préparation** :
  1. Cuis les pâtes.
  2. Saisis le poulet.
  3. Mélange pesto + tomates.
- **Pourquoi** : Muscu prise de masse : rapide, calorique, savoureux.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep32 — Cabillaud pané maison – purée – petits pois

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 545 kcal · 46 g protéines · 54 g glucides · 13 g lipides
- **Ingrédients** :
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Pomme de terre — 250 g *(pesé cru)*
  - Petits pois — 100 g — quantité fixe
  - Œuf entier — 30 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Pane le cabillaud (œuf + chapelure).
  2. Cuis 12 min au four.
  3. Sers avec purée et petits pois.
- **Pourquoi** : Muscu maintien : version saine du fish and chips, protéine maigre.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep33 — Bœuf – haricots rouges – riz (cajun)

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse · **Sport** : combats, muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 688 kcal · 50 g protéines · 81 g glucides · 16 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Haricots rouges — 50 g *(pesé sec)*
  - Riz basmati — 70 g *(pesé sec)*
  - Poivron — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Saisis le bœuf épicé.
  2. Ajoute haricots + poivron.
  3. Sers sur le riz.
- **Pourquoi** : Combats/muscu prise de masse : double protéine, fer élevé, dense.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep34 — Saumon – lentilles vertes – épinards

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien · **Sport** : endurance, muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 590 kcal · 50 g protéines · 34 g glucides · 25 g lipides
- **Ingrédients** :
  - Pavé de saumon — 150 g *(pesé cru)*
  - Lentilles vertes — 70 g *(pesé sec)*
  - Épinards frais — 80 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Réchauffe les lentilles.
  2. Poêle le saumon.
  3. Épinards tombés.
- **Pourquoi** : Endurance/muscu maintien : oméga-3 + fer végétal, récup complète.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep35 — Tofu mariné – nouilles soba – brocoli

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance, combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 624 kcal · 37 g protéines · 56 g glucides · 24 g lipides
- **Ingrédients** :
  - Tofu ferme — 160 g
  - Nouilles complètes — 70 g *(pesé sec)*
  - Brocoli — 200 g — quantité fixe
  - Sauce soja — 15 ml — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis les nouilles.
  2. Dore le tofu mariné.
  3. Sauté avec brocoli + sauce.
- **Pourquoi** : Endurance/combats perte de gras : végétal, léger, asiatique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep36 — Tortilla pommes de terre – jambon

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien · **Sport** : muscu
- **Régimes compatibles** : sans lactose, sans gluten
- **Macros / portion (base)** : 546 kcal · 39 g protéines · 27 g glucides · 30 g lipides
- **Ingrédients** :
  - Œuf entier — 200 g
  - Pomme de terre — 150 g *(pesé cru)*
  - Jambon blanc — 50 g
  - Oignon — 40 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis pommes de terre + oignon.
  2. Verse les œufs + jambon.
  3. Cuis la tortilla 10 min.
- **Pourquoi** : Muscu maintien : protéines + glucides, se mange chaud ou froid.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep37 — Tajine poulet – semoule – légumes

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance, muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 667 kcal · 56 g protéines · 74 g glucides · 14 g lipides
- **Ingrédients** :
  - Filet de poulet — 170 g *(pesé cru)*
  - Semoule de couscous — 80 g *(pesé sec)*
  - Courgette — 100 g — quantité fixe
  - Carotte — 80 g — quantité fixe
  - Pois chiches — 25 g *(pesé sec)*
  - Huile d'olive — 8 g
- **Préparation** :
  1. Mijote poulet + légumes + épices 20 min.
  2. Prépare la semoule.
  3. Assemble.
- **Pourquoi** : Endurance/muscu maintien : complet, parfumé, double protéine.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep38 — Thon frais grillé – riz – haricots verts

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : combats
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 645 kcal · 51 g protéines · 66 g glucides · 18 g lipides
- **Ingrédients** :
  - Thon frais — 180 g *(pesé cru)*
  - Riz basmati — 70 g *(pesé sec)*
  - Haricots verts — 150 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis le riz.
  2. Grille le thon 2 min par face.
  3. Haricots verts vapeur.
- **Pourquoi** : Combats perte de gras : protéine maigre, glucides maîtrisés pour le poids.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep39 — Curry poulet – lait de coco – riz

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 661 kcal · 48 g protéines · 71 g glucides · 19 g lipides
- **Ingrédients** :
  - Filet de poulet — 170 g *(pesé cru)*
  - Lait de coco — 80 ml
  - Riz basmati — 80 g *(pesé sec)*
  - Poivron — 80 g — quantité fixe
  - Oignon — 40 g — quantité fixe
- **Préparation** :
  1. Revenir oignon + curry.
  2. Poulet + coco + poivron, 15 min.
  3. Sers sur le riz.
- **Pourquoi** : Muscu prise de masse : crémeux, calorique, protéiné.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep40 — Salade composée poulet – quinoa – avocat – feta

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : sans porc, sans gluten, halal
- **Macros / portion (base)** : 586 kcal · 49 g protéines · 39 g glucides · 23 g lipides
- **Ingrédients** :
  - Filet de poulet — 150 g *(pesé cru)*
  - Quinoa — 60 g *(pesé sec)*
  - Avocat — 50 g
  - Feta — 30 g
  - Salade verte — 60 g — quantité fixe
  - Tomate — 80 g — quantité fixe
- **Préparation** :
  1. Cuis le quinoa, laisse refroidir.
  2. Émince le poulet cuit.
  3. Mélange tout.
- **Pourquoi** : Muscu maintien : fraîche, complète, bons lipides, repas d'été.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep41 — Seitan – patate douce – brocoli

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 541 kcal · 39 g protéines · 56 g glucides · 15 g lipides
- **Ingrédients** :
  - Seitan — 150 g
  - Patate douce — 250 g *(pesé cru)*
  - Brocoli — 150 g — quantité fixe
  - Huile d'olive — 10 g
- **Préparation** :
  1. Patate douce rôtie.
  2. Saisis le seitan.
  3. Brocoli vapeur.
- **Pourquoi** : Muscu prise de masse végétal : seitan très protéiné, glucides récup.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep42 — Bowl mexicain bœuf – haricots – maïs – riz

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 711 kcal · 49 g protéines · 83 g glucides · 18 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Haricots rouges — 40 g *(pesé sec)*
  - Maïs — 80 g
  - Riz basmati — 60 g *(pesé sec)*
  - Tomate — 80 g — quantité fixe
  - Avocat — 40 g
- **Préparation** :
  1. Saisis le bœuf épicé.
  2. Cuis le riz.
  3. Dresse en bowl avec haricots, maïs, avocat.
- **Pourquoi** : Muscu/combats prise de masse : dense, double protéine, fer élevé.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep43 — Cabillaud – quinoa – courgettes – citron

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras · **Sport** : endurance, combats · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 459 kcal · 43 g protéines · 38 g glucides · 13 g lipides
- **Ingrédients** :
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Quinoa — 60 g *(pesé sec)*
  - Courgette — 200 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis le quinoa.
  2. Poêle les courgettes.
  3. Cuis le cabillaud, citron.
- **Pourquoi** : Endurance/combats perte de gras : très protéiné/léger, idéal séchage.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep44 — Pâtes complètes saumon – épinards – crème de soja

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : prise de masse, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 656 kcal · 41 g protéines · 64 g glucides · 24 g lipides
- **Ingrédients** :
  - Pâtes complètes — 90 g *(pesé sec)*
  - Pavé de saumon — 130 g *(pesé cru)*
  - Épinards frais — 80 g — quantité fixe
  - Crème de soja — 40 ml
- **Préparation** :
  1. Cuis les pâtes.
  2. Émiette le saumon poêlé.
  3. Mélange avec épinards + crème.
- **Pourquoi** : Endurance prise de masse : crémeux, oméga-3, glucides complets.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep45 — Boulettes de dinde – courgettes – feta

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, halal
- **Macros / portion (base)** : 556 kcal · 56 g protéines · 37 g glucides · 19 g lipides
- **Ingrédients** :
  - Escalope de dinde — 180 g *(pesé cru)*
  - Courgette — 200 g — quantité fixe
  - Feta — 30 g
  - Boulgour — 50 g *(pesé sec)*
  - Huile d'olive — 8 g
- **Préparation** :
  1. Forme des boulettes de dinde hachée.
  2. Cuis 10 min.
  3. Sers avec boulgour, courgettes, feta.
- **Pourquoi** : Muscu/combats perte de gras : protéine maigre, glucides limités.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep46 — Riz sauté œufs – petits pois – jambon

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : maintien · **Sport** : muscu
- **Régimes compatibles** : sans lactose, sans gluten
- **Macros / portion (base)** : 695 kcal · 39 g protéines · 74 g glucides · 26 g lipides
- **Ingrédients** :
  - Riz basmati — 80 g *(pesé sec)*
  - Œuf entier — 150 g
  - Petits pois — 80 g — quantité fixe
  - Jambon blanc — 50 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis le riz à l'avance.
  2. Saisis œufs + jambon + petits pois.
  3. Ajoute le riz, sauce soja.
- **Pourquoi** : Muscu maintien : anti-gaspi du riz de la veille, protéiné, rapide.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep47 — Soupe miso – tofu – nouilles – edamame

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance, combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 451 kcal · 23 g protéines · 66 g glucides · 9 g lipides
- **Ingrédients** :
  - Tofu soyeux — 150 g
  - Nouilles de riz — 60 g *(pesé sec)*
  - Edamame — 80 g
  - Mélange wok (poivron/brocoli/carotte) — 150 g — quantité fixe
  - Sauce soja — 15 ml — quantité fixe
- **Préparation** :
  1. Chauffe un bouillon miso.
  2. Ajoute nouilles + légumes.
  3. Tofu et edamame en fin.
- **Pourquoi** : Endurance/combats perte de gras : léger, chaud, double protéine végétale.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep48 — Poulet rôti – polenta crémeuse – champignons

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans gluten, halal
- **Macros / portion (base)** : 608 kcal · 55 g protéines · 55 g glucides · 17 g lipides
- **Ingrédients** :
  - Filet de poulet — 180 g *(pesé cru)*
  - Polenta — 70 g *(pesé sec)*
  - Champignons — 150 g — quantité fixe
  - Parmesan — 15 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Rôtis le poulet.
  2. Cuis la polenta crémeuse + parmesan.
  3. Poêle les champignons.
- **Pourquoi** : Muscu prise de masse : réconfortant, protéiné, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep49 — Sardines – pain complet – salade de tomate

- **Type** : Repas · **Préparation** : 10 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 534 kcal · 41 g protéines · 29 g glucides · 27 g lipides
- **Ingrédients** :
  - Sardines (conserve égouttées) — 150 g
  - Pain complet — 60 g
  - Tomate — 100 g — quantité fixe
  - Salade verte — 40 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Toaste le pain.
  2. Dépose les sardines.
  3. Sers avec la salade de tomate.
- **Pourquoi** : Endurance maintien : oméga-3 + calcium, ultra rapide, récup.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep50 — Bowl tempeh teriyaki – riz – brocoli

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu, endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 674 kcal · 38 g protéines · 80 g glucides · 17 g lipides
- **Ingrédients** :
  - Tempeh — 160 g
  - Riz basmati — 80 g *(pesé sec)*
  - Brocoli — 200 g — quantité fixe
  - Sauce soja — 15 ml — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis le riz.
  2. Glace le tempeh à la sauce teriyaki.
  3. Brocoli vapeur, assemble.
- **Pourquoi** : Muscu/endurance prise de masse végétal : protéine complète, glucides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep51 — Cabillaud – lentilles vertes – tomate

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 462 kcal · 51 g protéines · 35 g glucides · 11 g lipides
- **Ingrédients** :
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Lentilles vertes — 70 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Réchauffe les lentilles + tomate.
  2. Cuis le cabillaud.
  3. Dresse ensemble.
- **Pourquoi** : Endurance perte de gras : poisson maigre + fer végétal, jour off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep52 — Wrap thon – crudités – fromage frais

- **Type** : Repas · **Préparation** : 10 min
- **Objectif** : perte de gras, maintien · **Sport** : combats, muscu
- **Régimes compatibles** : pescétarien, sans porc, halal
- **Macros / portion (base)** : 432 kcal · 39 g protéines · 41 g glucides · 12 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 70 g
  - Thon au naturel (conserve) — 100 g
  - Salade verte — 40 g — quantité fixe
  - Tomate — 60 g — quantité fixe
  - Cottage cheese — 50 g
- **Préparation** :
  1. Mélange thon + fromage frais.
  2. Garnis la tortilla.
  3. Roule.
- **Pourquoi** : Combats/muscu perte de gras : rapide, protéiné, faible en gras.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep53 — Bœuf bourguignon light – pommes vapeur

- **Type** : Repas · **Préparation** : 40 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 532 kcal · 40 g protéines · 47 g glucides · 18 g lipides
- **Ingrédients** :
  - Bavette de bœuf — 160 g *(pesé cru)*
  - Pomme de terre — 250 g *(pesé cru)*
  - Carotte — 100 g — quantité fixe
  - Champignons — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Saisis le bœuf.
  2. Mijote avec carottes + champignons 30 min.
  3. Sers avec pommes vapeur.
- **Pourquoi** : Muscu prise de masse : plat mijoté riche en fer, batch-cooking.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep54 — Poêlée patate douce – pois chiches – œuf

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, perte de gras · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 609 kcal · 29 g protéines · 68 g glucides · 21 g lipides
- **Ingrédients** :
  - Patate douce — 250 g *(pesé cru)*
  - Pois chiches — 50 g *(pesé sec)*
  - Œuf entier — 100 g
  - Épinards frais — 60 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Poêle la patate douce en dés.
  2. Ajoute pois chiches + épinards.
  3. Casse les œufs dessus.
- **Pourquoi** : Endurance maintien : végétarien complet, double protéine, fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep55 — Saumon – riz complet – brocoli – sésame

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse, maintien · **Sport** : muscu, endurance · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 740 kcal · 45 g protéines · 62 g glucides · 32 g lipides
- **Ingrédients** :
  - Pavé de saumon — 150 g *(pesé cru)*
  - Riz complet — 80 g *(pesé sec)*
  - Brocoli — 200 g — quantité fixe
  - Huile d'olive — 5 g
  - Graines de courge — 10 g
- **Préparation** :
  1. Cuis le riz complet.
  2. Poêle le saumon.
  3. Brocoli vapeur, parsème de graines.
- **Pourquoi** : Muscu/endurance prise de masse : oméga-3, glucides complets, récup.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep56 — One pot poulet – pâtes – courgettes – parmesan

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, halal
- **Macros / portion (base)** : 684 kcal · 58 g protéines · 64 g glucides · 19 g lipides
- **Ingrédients** :
  - Filet de poulet — 170 g *(pesé cru)*
  - Pâtes complètes — 90 g *(pesé sec)*
  - Courgette — 150 g — quantité fixe
  - Parmesan — 20 g
  - Huile d'olive — 8 g
- **Préparation** :
  1. Saisis le poulet.
  2. Ajoute pâtes + eau + courgettes, cuis 12 min.
  3. Parmesan en fin.
- **Pourquoi** : Muscu prise de masse : un seul plat, protéiné et calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep57 — Chili dinde – haricots – riz

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 620 kcal · 58 g protéines · 66 g glucides · 12 g lipides
- **Ingrédients** :
  - Escalope de dinde — 180 g *(pesé cru)*
  - Haricots rouges — 40 g *(pesé sec)*
  - Riz basmati — 50 g *(pesé sec)*
  - Tomate concassée — 150 g — quantité fixe
  - Poivron — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Saisis la dinde hachée.
  2. Ajoute haricots + tomate + poivron, 20 min.
  3. Sers avec le riz, filet d'huile d'olive.
- **Pourquoi** : Muscu/combats perte de gras : double protéine maigre, fibres, rassasiant.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep58 — Tofu général tao light – riz – haricots verts

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 640 kcal · 30 g protéines · 74 g glucides · 22 g lipides
- **Ingrédients** :
  - Tofu ferme — 160 g
  - Riz basmati — 70 g *(pesé sec)*
  - Haricots verts — 150 g — quantité fixe
  - Sauce soja — 15 ml — quantité fixe
  - Miel — 10 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Dore le tofu.
  2. Glace avec sauce soja + miel.
  3. Sers avec riz et haricots.
- **Pourquoi** : Combats maintien : végétal, saveurs sucrées-salées, léger.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep59 — Cabillaud vapeur – écrasé patate douce – asperges

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 424 kcal · 40 g protéines · 46 g glucides · 7 g lipides
- **Ingrédients** :
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Patate douce — 250 g *(pesé cru)*
  - Asperges — 150 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Écrase la patate douce cuite.
  2. Cuis le cabillaud vapeur.
  3. Asperges rôties.
- **Pourquoi** : Endurance perte de gras : digeste, protéine maigre, repas récup off.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep60 — Gros bowl gainer bœuf – riz – avocat – œuf

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : prise de masse · **Sport** : muscu, combats
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 923 kcal · 60 g protéines · 93 g glucides · 32 g lipides
- **Ingrédients** :
  - Bœuf haché 5% MG — 180 g *(pesé cru)*
  - Riz basmati — 100 g *(pesé sec)*
  - Avocat — 50 g
  - Œuf entier — 50 g
  - Haricots rouges — 30 g *(pesé sec)*
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuis le riz.
  2. Saisis le bœuf + œuf au plat.
  3. Dresse avec avocat et haricots.
- **Pourquoi** : Muscu/combats prise de masse : bowl très calorique, triple protéine pour le bulk.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd21 — Porridge avoine – whey vanille – banane

- **Type** : Petit-déj · **Préparation** : 8 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 634 kcal · 43 g protéines · 71 g glucides · 18 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 70 g *(pesé sec)*
  - Whey (neutre/vanille) — 30 g
  - Lait demi-écrémé — 200 ml
  - Banane — 80 g
  - Beurre de cacahuète — 15 g
- **Préparation** :
  1. Cuire les flocons dans le lait 4 min.
  2. Hors du feu, incorporer la whey, garnir de banane et beurre de cacahuète.
- **Pourquoi** : Muscu/prise de masse : glucides lents + shot protéique au réveil.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd22 — Porridge avoine – fromage blanc – fruits rouges

- **Type** : Petit-déj · **Préparation** : 8 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 391 kcal · 20 g protéines · 44 g glucides · 12 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 50 g *(pesé sec)*
  - Fromage blanc 0% — 150 g
  - Fruits rouges (mélange) — 80 g
  - Amandes — 15 g
- **Préparation** :
  1. Cuire les flocons à l'eau 4 min, laisser tiédir.
  2. Mélanger au fromage blanc, ajouter fruits rouges et amandes concassées.
- **Pourquoi** : Léger et protéiné : densité protéique haute pour peu de calories.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd23 — Porridge sarrasin – yaourt soja – myrtilles

- **Type** : Petit-déj · **Préparation** : 10 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 379 kcal · 23 g protéines · 49 g glucides · 8 g lipides
- **Ingrédients** :
  - Sarrasin — 50 g *(pesé sec)*
  - Yaourt de soja protéiné — 150 g
  - Myrtilles — 80 g
  - Graines de chia — 12 g
- **Préparation** :
  1. Cuire le sarrasin 12 min, égoutter.
  2. Servir tiède avec yaourt de soja, myrtilles et chia.
- **Pourquoi** : Vegan & sans gluten : porridge complet pour endurance, IG modéré.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd24 — Porridge millet – lait coco – mangue

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 488 kcal · 26 g protéines · 60 g glucides · 16 g lipides
- **Ingrédients** :
  - Millet — 60 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 25 g
  - Lait de coco — 60 ml
  - Mangue — 80 g
- **Préparation** :
  1. Cuire le millet dans 250 ml d'eau 12 min.
  2. Incorporer protéine et lait de coco, garnir de mangue.
- **Pourquoi** : Vegan jour repos : millet + coco, glucides lents et lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd25 — Porridge avoine protéiné – cacao – noisettes

- **Type** : Petit-déj · **Préparation** : 8 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 601 kcal · 43 g protéines · 55 g glucides · 21 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 70 g *(pesé sec)*
  - Whey (neutre/vanille) — 30 g
  - Lait demi-écrémé — 200 ml
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Noisettes — 15 g
- **Préparation** :
  1. Cuire flocons + cacao dans le lait 4 min.
  2. Hors du feu ajouter la whey, parsemer de noisettes.
- **Pourquoi** : Version gourmande muscu : cacao non sucré, capacité protéique élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd26 — Skyr – granola maison – framboises

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 351 kcal · 29 g protéines · 31 g glucides · 10 g lipides
- **Ingrédients** :
  - Skyr nature — 200 g
  - Flocons d'avoine — 30 g *(pesé sec)*
  - Framboises — 80 g
  - Amandes — 12 g
- **Préparation** :
  1. Verser le skyr, ajouter flocons et amandes.
  2. Garnir de framboises.
- **Pourquoi** : Très protéiné et frais : parfait pour la sèche, satiété longue.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd27 — Bowl skyr – beurre d'amande – banane

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 479 kcal · 32 g protéines · 51 g glucides · 14 g lipides
- **Ingrédients** :
  - Skyr nature — 200 g
  - Beurre d'amande — 20 g
  - Banane — 90 g
  - Flocons d'avoine — 40 g *(pesé sec)*
- **Préparation** :
  1. Mélanger skyr et flocons.
  2. Napper de beurre d'amande, ajouter la banane en rondelles.
- **Pourquoi** : Prise de masse rapide : protéines, glucides et bons lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd28 — Fromage blanc – muesli – pomme râpée

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 383 kcal · 21 g protéines · 44 g glucides · 12 g lipides
- **Ingrédients** :
  - Fromage blanc 0% — 200 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Pomme — 100 g
  - Noix — 12 g
- **Préparation** :
  1. Mélanger fromage blanc et flocons.
  2. Ajouter la pomme râpée et les noix.
- **Pourquoi** : Équilibré pour endurance matinale, fibres et protéines.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd29 — Cottage cheese – ananas – graines de courge

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 451 kcal · 30 g protéines · 36 g glucides · 19 g lipides
- **Ingrédients** :
  - Cottage cheese — 200 g
  - Ananas — 100 g
  - Graines de courge — 15 g
  - Flocons d'avoine — 30 g *(pesé sec)*
- **Préparation** :
  1. Disposer le cottage cheese.
  2. Ajouter ananas en dés, flocons et graines de courge.
- **Pourquoi** : Salé-sucré protéiné, faible en gras pour la sèche.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd30 — Yaourt grec – miel – noix

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 510 kcal · 12 g protéines · 44 g glucides · 30 g lipides
- **Ingrédients** :
  - Yaourt grec — 200 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Miel — 15 g
  - Noix — 15 g
- **Préparation** :
  1. Mélanger yaourt grec et flocons.
  2. Napper de miel, ajouter les noix.
- **Pourquoi** : Jour repos : yaourt grec plus riche, lipides et glucides lents.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd31 — Overnight oats soja – chia – fruits rouges

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 413 kcal · 23 g protéines · 49 g glucides · 11 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 60 g *(pesé sec)*
  - Yaourt de soja protéiné — 150 g
  - Graines de chia — 12 g
  - Fruits rouges (mélange) — 80 g
- **Préparation** :
  1. La veille, mélanger flocons, yaourt de soja et chia.
  2. Au matin, garnir de fruits rouges.
- **Pourquoi** : Vegan, prêt le matin : glucides lents pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd32 — Bowl yaourt soja – granola – banane

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 453 kcal · 27 g protéines · 51 g glucides · 14 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 200 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Banane — 90 g
  - Beurre de cacahuète — 15 g
- **Préparation** :
  1. Verser le yaourt de soja, ajouter flocons.
  2. Garnir de banane et beurre de cacahuète.
- **Pourquoi** : Vegan prise de masse : double densité, protéines végétales.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd33 — Smoothie bowl protéine pois – mangue – coco

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 428 kcal · 30 g protéines · 40 g glucides · 15 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 30 g
  - Mangue — 120 g
  - Lait d'amande — 200 ml
  - Flocons d'avoine — 30 g *(pesé sec)*
  - Graines de chia — 10 g
- **Préparation** :
  1. Mixer protéine, mangue et lait d'amande.
  2. Verser, garnir de flocons et chia.
- **Pourquoi** : Vegan, frais et digeste avant un effort d'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd34 — Pudding chia – cacao – beurre cacahuète

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 398 kcal · 28 g protéines · 23 g glucides · 19 g lipides
- **Ingrédients** :
  - Graines de chia — 25 g
  - Protéine végétale (pois/soja) — 25 g
  - Lait d'amande — 220 ml
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Banane — 80 g
- **Préparation** :
  1. Mélanger chia, protéine, cacao et lait d'amande, reposer 4 h.
  2. Garnir de banane.
- **Pourquoi** : Vegan jour repos : oméga-3 du chia + ancre protéique, satiété élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd35 — Tofu brouillé – épinards – pain complet

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 513 kcal · 36 g protéines · 35 g glucides · 23 g lipides
- **Ingrédients** :
  - Tofu ferme — 180 g
  - Épinards frais — 80 g — quantité fixe
  - Pain complet — 60 g
  - Huile d'olive — 6 g
  - Levure maltée — 8 g — quantité fixe
- **Préparation** :
  1. Émietter le tofu, poêler avec épinards et levure maltée.
  2. Servir sur pain complet grillé.
- **Pourquoi** : Vegan salé et protéiné : alternative aux œufs brouillés.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd36 — Pancakes avoine – banane – oeuf

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 514 kcal · 29 g protéines · 62 g glucides · 15 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 60 g *(pesé sec)*
  - Œuf entier — 100 g
  - Banane — 80 g
  - Skyr nature — 80 g
  - Sirop d'érable — 12 g
- **Préparation** :
  1. Mixer flocons, œufs, banane et skyr.
  2. Cuire en petits pancakes, napper de sirop d'érable.
- **Pourquoi** : Végétarien prise de masse : protéines complètes + glucides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd37 — Omelette blanc d'oeuf – tomate – pain seigle

- **Type** : Petit-déj · **Préparation** : 10 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 301 kcal · 31 g protéines · 30 g glucides · 6 g lipides
- **Ingrédients** :
  - Blanc d'œuf — 180 g
  - Œuf entier — 50 g
  - Tomate — 80 g — quantité fixe
  - Pain de seigle — 50 g
- **Préparation** :
  1. Battre blancs + œuf, cuire en omelette avec la tomate.
  2. Servir avec pain de seigle.
- **Pourquoi** : Sèche : très haute protéine, lipides minimaux.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd38 — Oeufs brouillés – avocat – pain complet

- **Type** : Petit-déj · **Préparation** : 10 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 504 kcal · 27 g protéines · 30 g glucides · 28 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Avocat — 60 g
  - Pain complet — 70 g
  - Roquette — 30 g — quantité fixe
- **Préparation** :
  1. Brouiller les œufs doucement.
  2. Servir sur pain complet avec avocat écrasé et roquette.
- **Pourquoi** : Jour repos : lipides de qualité (œuf + avocat), satiété durable.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd39 — Pancakes protéinés – myrtilles

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 402 kcal · 43 g protéines · 40 g glucides · 6 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 50 g *(pesé sec)*
  - Whey (neutre/vanille) — 30 g
  - Blanc d'œuf — 120 g
  - Myrtilles — 80 g
- **Préparation** :
  1. Mixer flocons, whey et blancs.
  2. Cuire en pancakes, garnir de myrtilles.
- **Pourquoi** : Capacité protéique élevée pour le muscle, peu de lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd40 — Tartines pain complet – cottage – saumon fumé

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, halal
- **Macros / portion (base)** : 400 kcal · 33 g protéines · 34 g glucides · 13 g lipides
- **Ingrédients** :
  - Pain complet — 70 g
  - Cottage cheese — 120 g
  - Saumon fumé — 60 g
  - Concombre — 50 g — quantité fixe
- **Préparation** :
  1. Tartiner le cottage cheese sur le pain.
  2. Déposer saumon fumé et concombre.
- **Pourquoi** : Pescatarien protéiné, oméga-3, faible en gras saturés.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd41 — Tartines beurre cacahuète – banane – chia

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 505 kcal · 24 g protéines · 60 g glucides · 16 g lipides
- **Ingrédients** :
  - Pain complet — 80 g
  - Beurre de cacahuète — 25 g
  - Banane — 90 g
  - Yaourt de soja protéiné — 120 g
- **Préparation** :
  1. Tartiner le beurre de cacahuète, ajouter banane.
  2. Accompagner du yaourt de soja.
- **Pourquoi** : Vegan endurance : dense en énergie avant un long effort.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd42 — Pita complet – houmous express – œuf

- **Type** : Petit-déj · **Préparation** : 10 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 510 kcal · 27 g protéines · 55 g glucides · 19 g lipides
- **Ingrédients** :
  - Pain pita complet — 70 g
  - Pois chiches — 40 g *(pesé sec)*
  - Œuf entier — 100 g
  - Tomate — 60 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Écraser pois chiches cuits avec un filet d'huile.
  2. Garnir le pita d'œuf dur, houmous et tomate.
- **Pourquoi** : Végétarien complet : double source protéique pour le muscle.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd43 — Bowl quinoa – yaourt soja – kiwi

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 390 kcal · 24 g protéines · 42 g glucides · 12 g lipides
- **Ingrédients** :
  - Quinoa — 45 g *(pesé sec)*
  - Yaourt de soja protéiné — 160 g
  - Kiwi — 80 g
  - Amandes — 12 g
- **Préparation** :
  1. Cuire le quinoa 12 min, laisser refroidir.
  2. Mélanger au yaourt de soja, garnir kiwi et amandes.
- **Pourquoi** : Vegan & sans gluten : quinoa = protéines complètes, bon pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd44 — Porridge millet – pomme – cannelle

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : perte de gras · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 359 kcal · 20 g protéines · 51 g glucides · 7 g lipides
- **Ingrédients** :
  - Millet — 45 g *(pesé sec)*
  - Yaourt de soja protéiné — 150 g
  - Pomme — 100 g
  - Graines de chia — 10 g
- **Préparation** :
  1. Cuire le millet 12 min.
  2. Mélanger yaourt de soja, pomme râpée et chia.
- **Pourquoi** : Vegan léger sans gluten : faible densité calorique, fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col21 — Shake whey – banane – beurre cacahuète

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 409 kcal · 37 g protéines · 35 g glucides · 14 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 30 g
  - Banane — 90 g
  - Lait demi-écrémé — 250 ml
  - Beurre de cacahuète — 15 g
- **Préparation** :
  1. Mixer tous les ingrédients.
  2. Servir frais.
- **Pourquoi** : Shake prise de masse classique : protéines rapides + glucides + lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col22 — Shake whey – cacao – avoine

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 412 kcal · 39 g protéines · 39 g glucides · 10 g lipides
- **Ingrédients** :
  - Whey (neutre/vanille) — 30 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Lait demi-écrémé — 250 ml
  - Cacao maigre en poudre — 8 g — quantité fixe
- **Préparation** :
  1. Mixer whey, flocons, lait et cacao.
  2. Servir.
- **Pourquoi** : Collation muscle solide : glucides lents de l'avoine + whey.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col23 — Shake protéine pois – fruits rouges – amande

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 300 kcal · 27 g protéines · 15 g glucides · 14 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 30 g
  - Fruits rouges (mélange) — 100 g
  - Lait d'amande — 250 ml
  - Graines de chia — 10 g
- **Préparation** :
  1. Mixer protéine, fruits rouges et lait d'amande.
  2. Ajouter le chia, servir.
- **Pourquoi** : Vegan léger : protéines végétales, peu calorique pour la sèche.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col24 — Shake soja – mangue – coco

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 352 kcal · 26 g protéines · 23 g glucides · 17 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 30 g
  - Mangue — 120 g
  - Lait d'amande — 200 ml
  - Lait de coco — 40 ml
- **Préparation** :
  1. Mixer protéine, mangue, lait d'amande et coco.
  2. Servir frais.
- **Pourquoi** : Vegan endurance : glucides des fruits + énergie de la coco.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col25 — Smoothie skyr – épinards – ananas

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 196 kcal · 19 g protéines · 20 g glucides · 3 g lipides
- **Ingrédients** :
  - Skyr nature — 150 g
  - Ananas — 100 g
  - Épinards frais — 40 g — quantité fixe
  - Graines de chia — 8 g
- **Préparation** :
  1. Mixer skyr, ananas, épinards et chia.
  2. Servir.
- **Pourquoi** : Sèche : très protéiné, micronutriments, peu calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col26 — Shake yaourt soja – banane – cacao

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 340 kcal · 23 g protéines · 29 g glucides · 14 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 200 g
  - Banane — 90 g
  - Lait d'amande — 150 ml
  - Beurre de cacahuète — 12 g
- **Préparation** :
  1. Mixer le yaourt de soja, banane et lait d'amande.
  2. Ajouter le beurre de cacahuète.
- **Pourquoi** : Vegan prise de masse : ancre protéique soja + énergie.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col27 — Skyr – myrtilles – amandes

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 236 kcal · 23 g protéines · 17 g glucides · 7 g lipides
- **Ingrédients** :
  - Skyr nature — 180 g
  - Myrtilles — 80 g
  - Amandes — 12 g
- **Préparation** :
  1. Mélanger skyr et myrtilles.
  2. Parsemer d'amandes.
- **Pourquoi** : Sèche express : densité protéique max, faible en gras.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col28 — Fromage blanc – fruits rouges – noix

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 221 kcal · 17 g protéines · 16 g glucides · 9 g lipides
- **Ingrédients** :
  - Fromage blanc 0% — 200 g
  - Fruits rouges (mélange) — 80 g
  - Noix — 12 g
- **Préparation** :
  1. Mélanger fromage blanc et fruits rouges.
  2. Ajouter les noix.
- **Pourquoi** : Combats / gestion du poids : protéines rassasiantes, peu calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col29 — Cottage cheese – concombre – pain complet

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 251 kcal · 20 g protéines · 23 g glucides · 7 g lipides
- **Ingrédients** :
  - Cottage cheese — 150 g
  - Concombre — 60 g — quantité fixe
  - Pain complet — 40 g
- **Préparation** :
  1. Tartiner le cottage sur le pain.
  2. Ajouter concombre et poivre.
- **Pourquoi** : Salé protéiné, faible en gras pour contrôler les calories.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col30 — Yaourt grec – miel – noisettes

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 341 kcal · 8 g protéines · 18 g glucides · 25 g lipides
- **Ingrédients** :
  - Yaourt grec — 200 g
  - Miel — 12 g
  - Noisettes — 15 g
- **Préparation** :
  1. Mélanger yaourt grec et miel.
  2. Ajouter les noisettes.
- **Pourquoi** : Jour repos : plus de lipides, satiété longue.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col31 — Energy balls dattes – cacahuète – avoine

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 496 kcal · 24 g protéines · 61 g glucides · 15 g lipides
- **Ingrédients** :
  - Dattes dénoyautées — 50 g
  - Beurre de cacahuète — 20 g
  - Flocons d'avoine — 40 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 20 g
- **Préparation** :
  1. Mixer dattes, beurre de cacahuète et flocons.
  2. Incorporer la protéine, former des boules, réfrigérer.
- **Pourquoi** : Vegan endurance : énergie dense et transportable, ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col32 — Barre avoine – chocolat noir – amandes

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 550 kcal · 29 g protéines · 56 g glucides · 21 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 50 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 25 g
  - Chocolat noir 70% — 15 g
  - Amandes — 15 g
  - Dattes dénoyautées — 30 g
- **Préparation** :
  1. Mixer flocons, protéine, dattes.
  2. Ajouter chocolat et amandes, presser en barres, réfrigérer.
- **Pourquoi** : Vegan : barre maison équilibrée pour soutenir un effort long.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col33 — Boules cacao – chia – coco

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 457 kcal · 27 g protéines · 54 g glucides · 11 g lipides
- **Ingrédients** :
  - Graines de chia — 15 g
  - Dattes dénoyautées — 50 g
  - Protéine végétale (pois/soja) — 25 g
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Flocons d'avoine — 30 g *(pesé sec)*
- **Préparation** :
  1. Mixer dattes, flocons, cacao et protéine.
  2. Ajouter chia, former des boules.
- **Pourquoi** : Vegan : en-cas chocolaté riche en fibres et oméga-3.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col34 — Barre protéinée whey – avoine – cacahuète

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 429 kcal · 29 g protéines · 41 g glucides · 15 g lipides
- **Ingrédients** :
  - Flocons d'avoine — 45 g *(pesé sec)*
  - Whey (neutre/vanille) — 25 g
  - Beurre de cacahuète — 20 g
  - Miel — 12 g
- **Préparation** :
  1. Mélanger flocons, whey et miel.
  2. Lier avec le beurre de cacahuète, presser, réfrigérer.
- **Pourquoi** : Barre muscle : protéines + glucides, idéale post-training.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col35 — Galettes de riz – beurre amande – banane

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 389 kcal · 18 g protéines · 46 g glucides · 14 g lipides
- **Ingrédients** :
  - Galette de riz soufflé — 30 g
  - Beurre d'amande — 20 g
  - Banane — 80 g
  - Yaourt de soja protéiné — 120 g
- **Préparation** :
  1. Tartiner le beurre d'amande sur les galettes.
  2. Ajouter banane, accompagner du yaourt de soja.
- **Pourquoi** : Vegan & sans gluten : glucides rapides + protéines, autour du cardio.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col36 — Galettes de riz – cottage – tomate

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 253 kcal · 17 g protéines · 29 g glucides · 7 g lipides
- **Ingrédients** :
  - Galette de riz soufflé — 30 g
  - Cottage cheese — 130 g
  - Tomate — 60 g — quantité fixe
- **Préparation** :
  1. Tartiner le cottage sur les galettes.
  2. Déposer tomate et poivre.
- **Pourquoi** : Sans gluten, léger et protéiné pour la sèche.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col37 — Tartine pain seigle – houmous – crudités

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : perte de gras · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 368 kcal · 15 g protéines · 53 g glucides · 9 g lipides
- **Ingrédients** :
  - Pain de seigle — 50 g
  - Pois chiches — 50 g *(pesé sec)*
  - Carotte — 60 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Écraser les pois chiches avec l'huile.
  2. Tartiner sur le seigle, ajouter carotte râpée.
- **Pourquoi** : Vegan combats : satiété élevée, peu calorique, fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col38 — Tartine avocat – œuf dur – pain complet

- **Type** : Collation · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 384 kcal · 19 g protéines · 21 g glucides · 23 g lipides
- **Ingrédients** :
  - Pain complet — 50 g
  - Avocat — 60 g
  - Œuf entier — 100 g
  - Roquette — 20 g — quantité fixe
- **Préparation** :
  1. Écraser l'avocat sur le pain.
  2. Ajouter l'œuf dur en rondelles et la roquette.
- **Pourquoi** : Végétarien jour repos : lipides de qualité + protéines complètes.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col39 — Pudding chia – framboises

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : perte de gras · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 217 kcal · 19 g protéines · 13 g glucides · 8 g lipides
- **Ingrédients** :
  - Graines de chia — 15 g
  - Yaourt de soja protéiné — 170 g
  - Framboises — 80 g
- **Préparation** :
  1. Mélanger chia et yaourt de soja, reposer 3 h.
  2. Garnir de framboises.
- **Pourquoi** : Vegan : oméga-3 et protéines, faible en calories.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col40 — Edamame vapeur – sel

- **Type** : Collation · **Préparation** : 6 min
- **Objectif** : perte de gras · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 223 kcal · 17 g protéines · 14 g glucides · 11 g lipides
- **Ingrédients** :
  - Edamame — 150 g
  - Huile d'olive — 4 g
- **Préparation** :
  1. Cuire les edamame à la vapeur 5 min.
  2. Saler légèrement, filet d'huile.
- **Pourquoi** : Vegan combats : protéines pures, volume, très peu calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col41 — Pois chiches rôtis épicés

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : perte de gras, maintien · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 264 kcal · 12 g protéines · 29 g glucides · 10 g lipides
- **Ingrédients** :
  - Pois chiches — 60 g *(pesé sec)*
  - Huile d'olive — 6 g
- **Préparation** :
  1. Sécher les pois chiches cuits, enrober d'huile et d'épices.
  2. Rôtir 20 min à 200°C.
- **Pourquoi** : Vegan : en-cas croustillant riche en protéines et fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col42 — Yaourt grec – granola – framboises

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 393 kcal · 12 g protéines · 29 g glucides · 23 g lipides
- **Ingrédients** :
  - Yaourt grec — 180 g
  - Flocons d'avoine — 30 g *(pesé sec)*
  - Framboises — 70 g
  - Amandes — 10 g
- **Préparation** :
  1. Mélanger yaourt et flocons.
  2. Garnir framboises et amandes.
- **Pourquoi** : Équilibré, protéines lentes pour les inter-repas.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col43 — Banane – beurre cacahuète – chocolat noir

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 374 kcal · 18 g protéines · 33 g glucides · 18 g lipides
- **Ingrédients** :
  - Banane — 110 g
  - Beurre de cacahuète — 20 g
  - Chocolat noir 70% — 12 g
  - Yaourt de soja protéiné — 120 g
- **Préparation** :
  1. Couper la banane, napper de beurre de cacahuète.
  2. Râper le chocolat, servir avec le yaourt de soja.
- **Pourquoi** : Vegan endurance : recharge glucidique gourmande + ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col44 — Cottage – ananas – graines de courge

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 297 kcal · 24 g protéines · 17 g glucides · 14 g lipides
- **Ingrédients** :
  - Cottage cheese — 180 g
  - Ananas — 90 g
  - Graines de courge — 12 g
- **Préparation** :
  1. Mélanger cottage et ananas.
  2. Parsemer de graines de courge.
- **Pourquoi** : Sèche : protéines maigres, frais et rassasiant.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep61 — Pâtes complètes – poulet – pesto – roquette

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 597 kcal · 50 g protéines · 63 g glucides · 14 g lipides
- **Ingrédients** :
  - Pâtes complètes — 90 g *(pesé sec)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Pesto — 25 g
  - Roquette — 40 g — quantité fixe
- **Préparation** :
  1. Cuire les pâtes al dente.
  2. Poêler le poulet, mélanger avec pesto, pâtes et roquette.
- **Pourquoi** : Muscu/prise de masse : protéines maigres + glucides, capacité haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep62 — Pâtes – steak haché 5% – sauce tomate

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 638 kcal · 46 g protéines · 73 g glucides · 17 g lipides
- **Ingrédients** :
  - Pâtes (semoule) — 90 g *(pesé sec)*
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Tomate concassée — 120 g — quantité fixe
  - Oignon — 40 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Faire revenir oignon et bœuf.
  2. Ajouter la tomate, mijoter, servir sur les pâtes.
- **Pourquoi** : Bolognaise protéinée : grosse capacité énergétique pour la masse.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep63 — Pâtes – thon – citron – câpres

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 558 kcal · 43 g protéines · 60 g glucides · 15 g lipides
- **Ingrédients** :
  - Pâtes complètes — 85 g *(pesé sec)*
  - Thon au naturel (conserve) — 120 g
  - Tomate — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire les pâtes.
  2. Mélanger thon égoutté, tomate, huile et zeste de citron.
- **Pourquoi** : Pescatarien rapide, protéiné, glucides pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep64 — Pâtes – saumon – épinards – crème soja

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 706 kcal · 43 g protéines · 65 g glucides · 28 g lipides
- **Ingrédients** :
  - Pâtes complètes — 90 g *(pesé sec)*
  - Pavé de saumon — 140 g *(pesé cru)*
  - Épinards frais — 80 g — quantité fixe
  - Crème de soja — 60 ml
- **Préparation** :
  1. Cuire les pâtes.
  2. Saisir le saumon, ajouter épinards et crème de soja, mélanger.
- **Pourquoi** : Pescatarien jour repos : oméga-3, crémeux, capacité élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep65 — Pâtes – tofu – curry – lait coco

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 778 kcal · 43 g protéines · 75 g glucides · 31 g lipides
- **Ingrédients** :
  - Pâtes complètes — 90 g *(pesé sec)*
  - Tofu ferme — 200 g
  - Lait de coco — 60 ml
  - Poivron — 80 g — quantité fixe
  - Levure maltée — 8 g — quantité fixe
- **Préparation** :
  1. Cuire les pâtes.
  2. Poêler tofu et poivron au curry, ajouter coco et levure maltée.
- **Pourquoi** : Vegan prise de masse : ancre tofu généreuse + lait de coco.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep66 — Pâtes – lentilles – tomate – basilic

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 681 kcal · 41 g protéines · 95 g glucides · 11 g lipides
- **Ingrédients** :
  - Pâtes complètes — 80 g *(pesé sec)*
  - Lentilles corail — 60 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Tomate concassée — 120 g — quantité fixe
  - Oignon — 40 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire lentilles et pâtes.
  2. Mijoter la tomate avec oignon, mélanger le tout.
- **Pourquoi** : Vegan : bolognaise de lentilles, glucides + protéines pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep67 — Nouilles de riz – poulet – légumes wok

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 601 kcal · 44 g protéines · 78 g glucides · 11 g lipides
- **Ingrédients** :
  - Nouilles de riz — 90 g *(pesé sec)*
  - Filet de poulet — 150 g *(pesé cru)*
  - Mélange wok (poivron/brocoli/carotte) — 120 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire les nouilles de riz.
  2. Sauter poulet et légumes, mélanger aux nouilles.
- **Pourquoi** : Sans gluten, sauté équilibré, recharge glucidique pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep68 — Nouilles de riz – tofu – sésame – brocoli

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 754 kcal · 37 g protéines · 83 g glucides · 28 g lipides
- **Ingrédients** :
  - Nouilles de riz — 90 g *(pesé sec)*
  - Tofu ferme — 200 g
  - Brocoli — 100 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Cuire les nouilles.
  2. Sauter tofu et brocoli, lier au lait de coco.
- **Pourquoi** : Vegan & sans gluten : sauté complet, forte capacité protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep69 — Pâtes – crevettes – ail – courgette

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 525 kcal · 42 g protéines · 60 g glucides · 11 g lipides
- **Ingrédients** :
  - Pâtes complètes — 85 g *(pesé sec)*
  - Crevettes cuites — 150 g
  - Courgette — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire les pâtes.
  2. Sauter crevettes, ail et courgette à l'huile, mélanger.
- **Pourquoi** : Pescatarien léger et protéiné, lipides maîtrisés.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep70 — Pâtes – seitan – tomate – olives

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 600 kcal · 40 g protéines · 81 g glucides · 11 g lipides
- **Ingrédients** :
  - Pâtes (semoule) — 90 g *(pesé sec)*
  - Seitan — 130 g
  - Tomate concassée — 120 g — quantité fixe
  - Olives — 30 g
  - Oignon — 40 g — quantité fixe
- **Préparation** :
  1. Cuire les pâtes.
  2. Saisir le seitan, ajouter tomate, oignon et olives, mijoter.
- **Pourquoi** : Vegan combats : seitan très protéiné, plat complet pas trop lourd.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep71 — Nouilles de riz – bœuf – sauce coco-curry

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 653 kcal · 37 g protéines · 78 g glucides · 21 g lipides
- **Ingrédients** :
  - Nouilles de riz — 90 g *(pesé sec)*
  - Bavette de bœuf — 140 g *(pesé cru)*
  - Poivron — 80 g — quantité fixe
  - Lait de coco — 60 ml
- **Préparation** :
  1. Cuire les nouilles.
  2. Saisir le bœuf émincé, ajouter poivron, curry et coco.
- **Pourquoi** : Sans gluten, prise de masse : capacité élevée, riche en fer.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep72 — Pâtes – ricotta de tofu – épinards

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 608 kcal · 33 g protéines · 65 g glucides · 21 g lipides
- **Ingrédients** :
  - Pâtes complètes — 85 g *(pesé sec)*
  - Tofu soyeux — 150 g
  - Tofu ferme — 100 g
  - Épinards frais — 80 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire les pâtes.
  2. Mixer tofu soyeux + ferme en crème, mélanger aux épinards et pâtes.
- **Pourquoi** : Vegan : sauce crémeuse double-tofu, protéiné et léger.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep73 — Riz complet – poulet teriyaki – brocoli

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 568 kcal · 49 g protéines · 60 g glucides · 12 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Filet de poulet — 170 g *(pesé cru)*
  - Brocoli — 120 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le riz.
  2. Glacer le poulet à la sauce teriyaki, servir avec brocoli vapeur.
- **Pourquoi** : Muscu : sans gluten, protéines maigres, capacité solide.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep74 — Bowl riz – saumon – avocat – edamame

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 756 kcal · 41 g protéines · 74 g glucides · 32 g lipides
- **Ingrédients** :
  - Riz basmati — 85 g *(pesé sec)*
  - Pavé de saumon — 130 g *(pesé cru)*
  - Avocat — 60 g
  - Edamame — 60 g
  - Concombre — 60 g — quantité fixe
- **Préparation** :
  1. Cuire le riz, laisser tiédir.
  2. Dresser en bowl avec saumon, avocat, edamame et concombre.
- **Pourquoi** : Poke pescatarien : oméga-3 + double protéine, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep75 — Riz – cabillaud – citron – haricots verts

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 477 kcal · 40 g protéines · 60 g glucides · 8 g lipides
- **Ingrédients** :
  - Riz basmati — 70 g *(pesé sec)*
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Haricots verts — 120 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire le riz et les haricots.
  2. Poêler le cabillaud au citron, dresser.
- **Pourquoi** : Sèche pescatarienne : poisson maigre, très protéiné, faible en gras.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep76 — Riz complet – tofu – chili sin carne

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 765 kcal · 39 g protéines · 91 g glucides · 24 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Tofu ferme — 150 g
  - Haricots rouges — 50 g *(pesé sec)*
  - Tomate concassée — 120 g — quantité fixe
  - Lait de coco — 40 ml
- **Préparation** :
  1. Cuire le riz.
  2. Mijoter tofu émietté, haricots, tomate et épices chili, finir au lait de coco.
- **Pourquoi** : Vegan combats : plat complet équilibré, double protéine végétale.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep77 — Bowl riz – PST bolognaise – maïs

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 615 kcal · 35 g protéines · 87 g glucides · 12 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 50 g *(pesé sec)*
  - Tomate concassée — 120 g — quantité fixe
  - Maïs — 60 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Réhydrater la PST, mijoter avec la tomate.
  2. Servir sur riz avec maïs.
- **Pourquoi** : Vegan prise de masse : la PST monte très haut en protéines, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep78 — Riz basmati – dinde – curry – petits pois

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 644 kcal · 49 g protéines · 80 g glucides · 13 g lipides
- **Ingrédients** :
  - Riz basmati — 85 g *(pesé sec)*
  - Escalope de dinde — 160 g *(pesé cru)*
  - Petits pois — 80 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Cuire le riz.
  2. Poêler la dinde au curry, ajouter petits pois et lait de coco.
- **Pourquoi** : Endurance : recharge glucidique + protéine maigre.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep79 — Riz – thon – poivron – sauce tomate

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 561 kcal · 42 g protéines · 64 g glucides · 14 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Thon au naturel (conserve) — 130 g
  - Poivron — 100 g — quantité fixe
  - Tomate concassée — 80 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire le riz.
  2. Mijoter thon, poivron et tomate, servir sur le riz.
- **Pourquoi** : Pescatarien sans gluten, protéiné, glucides pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep80 — Bowl riz – tempeh laqué – chou-fleur

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 608 kcal · 32 g protéines · 71 g glucides · 17 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Tempeh — 150 g
  - Chou-fleur — 120 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le riz, rôtir le chou-fleur.
  2. Laquer le tempeh à la sauce soja-érable, dresser.
- **Pourquoi** : Vegan & sans gluten : tempeh fermenté très protéiné.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep81 — Riz – œufs – légumes wok (cantonais)

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 607 kcal · 27 g protéines · 73 g glucides · 23 g lipides
- **Ingrédients** :
  - Riz basmati — 85 g *(pesé sec)*
  - Œuf entier — 150 g
  - Mélange wok (poivron/brocoli/carotte) — 120 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le riz.
  2. Brouiller les œufs, sauter avec riz et légumes.
- **Pourquoi** : Végétarien : riz sauté complet, protéines des œufs.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep82 — Riz – haricots noirs – maïs – avocat

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 773 kcal · 36 g protéines · 105 g glucides · 17 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Haricots noirs — 60 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 30 g *(pesé sec)*
  - Maïs — 60 g — quantité fixe
  - Avocat — 60 g
- **Préparation** :
  1. Cuire riz et haricots.
  2. Réhydrater la PST, assembler en bowl tex-mex avec maïs et avocat.
- **Pourquoi** : Vegan combats : protéines complètes (haricots + PST), sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep83 — Riz – poulet – ananas – cajou

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 597 kcal · 44 g protéines · 79 g glucides · 11 g lipides
- **Ingrédients** :
  - Riz basmati — 85 g *(pesé sec)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Ananas — 80 g
  - Poivron — 80 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le riz.
  2. Sauter poulet, poivron et ananas, servir sur le riz.
- **Pourquoi** : Endurance : sucré-salé, recharge rapide + protéines.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep84 — Riz – sardines – tomate – oignon

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 601 kcal · 34 g protéines · 60 g glucides · 24 g lipides
- **Ingrédients** :
  - Riz complet — 75 g *(pesé sec)*
  - Sardines (conserve égouttées) — 120 g
  - Tomate — 100 g — quantité fixe
  - Oignon — 40 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuire le riz.
  2. Servir avec sardines, tomate et oignon émincé.
- **Pourquoi** : Pescatarien économique, oméga-3 et calcium, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep85 — Bowl riz – feta – pois chiches – concombre

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 677 kcal · 25 g protéines · 94 g glucides · 20 g lipides
- **Ingrédients** :
  - Riz basmati — 80 g *(pesé sec)*
  - Pois chiches — 60 g *(pesé sec)*
  - Feta — 40 g
  - Concombre — 80 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire riz et pois chiches.
  2. Assembler en bowl grec avec feta émiettée et concombre.
- **Pourquoi** : Végétarien méditerranéen : protéines végétales + feta, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep86 — Riz – crevettes – curry vert

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 584 kcal · 39 g protéines · 75 g glucides · 13 g lipides
- **Ingrédients** :
  - Riz basmati — 85 g *(pesé sec)*
  - Crevettes cuites — 150 g
  - Mélange wok (poivron/brocoli/carotte) — 100 g — quantité fixe
  - Lait de coco — 60 ml
- **Préparation** :
  1. Cuire le riz.
  2. Mijoter crevettes et légumes au curry vert et lait de coco.
- **Pourquoi** : Pescatarien : curry crémeux, sans gluten, glucides pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep87 — Quinoa – poulet – courgette – pesto

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 553 kcal · 50 g protéines · 50 g glucides · 15 g lipides
- **Ingrédients** :
  - Quinoa — 80 g *(pesé sec)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Courgette — 100 g — quantité fixe
  - Pesto — 20 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Poêler poulet et courgette, lier au pesto.
- **Pourquoi** : Muscu sans gluten : quinoa = protéines complètes + poulet.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep88 — Buddha bowl quinoa – pois chiches – avocat

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 738 kcal · 38 g protéines · 87 g glucides · 22 g lipides
- **Ingrédients** :
  - Quinoa — 80 g *(pesé sec)*
  - Pois chiches — 60 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Avocat — 60 g
  - Betterave cuite — 60 g — quantité fixe
  - Roquette — 30 g — quantité fixe
- **Préparation** :
  1. Cuire quinoa et pois chiches.
  2. Réhydrater la PST, dresser avec avocat, betterave et roquette.
- **Pourquoi** : Vegan & sans gluten : triple protéine végétale, riche en fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep89 — Sarrasin – tempeh – champignons

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 618 kcal · 37 g protéines · 68 g glucides · 18 g lipides
- **Ingrédients** :
  - Sarrasin — 80 g *(pesé sec)*
  - Tempeh — 150 g
  - Champignons — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire le sarrasin.
  2. Poêler tempeh et champignons, mélanger au sarrasin.
- **Pourquoi** : Vegan jour repos sans gluten : sarrasin rustique + tempeh.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep90 — Sarrasin – saumon – asperges

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 639 kcal · 42 g protéines · 56 g glucides · 26 g lipides
- **Ingrédients** :
  - Sarrasin — 80 g *(pesé sec)*
  - Pavé de saumon — 140 g *(pesé cru)*
  - Asperges — 100 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire le sarrasin.
  2. Rôtir saumon et asperges, dresser.
- **Pourquoi** : Pescatarien sans gluten : oméga-3 + glucides lents du sarrasin.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep91 — Millet – curry de pois chiches – épinards

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 727 kcal · 40 g protéines · 101 g glucides · 17 g lipides
- **Ingrédients** :
  - Millet — 80 g *(pesé sec)*
  - Pois chiches — 60 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 30 g *(pesé sec)*
  - Épinards frais — 80 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Cuire le millet.
  2. Mijoter pois chiches + PST au curry et lait de coco, ajouter épinards.
- **Pourquoi** : Vegan endurance sans gluten : capacité protéique haute, crémeux.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep92 — Quinoa – cabillaud – ratatouille

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : perte de gras · **Sport** : combats
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 487 kcal · 44 g protéines · 48 g glucides · 12 g lipides
- **Ingrédients** :
  - Quinoa — 70 g *(pesé sec)*
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Ratatouille de légumes — 150 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Poêler le cabillaud, servir avec ratatouille.
- **Pourquoi** : Sèche pescatarienne / combats : poisson maigre, légumes, sans gluten.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep93 — Millet – dinde – petits pois – carotte

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 606 kcal · 51 g protéines · 71 g glucides · 13 g lipides
- **Ingrédients** :
  - Millet — 80 g *(pesé sec)*
  - Escalope de dinde — 160 g *(pesé cru)*
  - Petits pois — 70 g — quantité fixe
  - Carotte — 60 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le millet.
  2. Poêler la dinde, ajouter petits pois et carotte.
- **Pourquoi** : Endurance sans gluten : protéine maigre + glucides du millet.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep94 — Quinoa – haricots blancs – tomate – romarin

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 682 kcal · 41 g protéines · 88 g glucides · 14 g lipides
- **Ingrédients** :
  - Quinoa — 80 g *(pesé sec)*
  - Haricots blancs — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Mijoter haricots blancs + PST avec tomate et romarin.
- **Pourquoi** : Vegan combats sans gluten : haricots blancs = capacité protéique élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep95 — Patate douce rôtie – poulet – brocoli

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 516 kcal · 48 g protéines · 49 g glucides · 11 g lipides
- **Ingrédients** :
  - Patate douce — 270 g *(pesé cru)*
  - Filet de poulet — 170 g *(pesé cru)*
  - Brocoli — 120 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Rôtir la patate douce 25 min.
  2. Poêler le poulet, servir avec brocoli.
- **Pourquoi** : Muscu sans gluten : glucides à IG modéré, capacité solide.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep96 — Pomme de terre – steak haché – haricots verts

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 537 kcal · 41 g protéines · 52 g glucides · 15 g lipides
- **Ingrédients** :
  - Pomme de terre — 290 g *(pesé cru)*
  - Bœuf haché 5% MG — 150 g *(pesé cru)*
  - Haricots verts — 120 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire les pommes de terre.
  2. Poêler le steak, servir avec haricots verts.
- **Pourquoi** : Prise de masse classique sans gluten : fer + glucides + protéines.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep97 — Patate douce – tofu – épinards – coco

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 597 kcal · 34 g protéines · 45 g glucides · 28 g lipides
- **Ingrédients** :
  - Patate douce — 200 g *(pesé cru)*
  - Tofu ferme — 210 g
  - Épinards frais — 80 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Rôtir la patate douce.
  2. Poêler le tofu, ajouter épinards et lait de coco.
- **Pourquoi** : Vegan endurance sans gluten : énergie durable, ancre protéique haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep98 — Pomme de terre – cabillaud – haricots verts

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 376 kcal · 38 g protéines · 37 g glucides · 6 g lipides
- **Ingrédients** :
  - Pomme de terre — 200 g *(pesé cru)*
  - Dos de cabillaud — 180 g *(pesé cru)*
  - Haricots verts — 100 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Cuire les pommes de terre vapeur.
  2. Cuire le cabillaud au four, servir.
- **Pourquoi** : Sèche pescatarienne : poisson maigre + féculent, faible en gras.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep99 — Patate douce – PST chili – maïs

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 590 kcal · 41 g protéines · 80 g glucides · 8 g lipides
- **Ingrédients** :
  - Patate douce — 200 g *(pesé cru)*
  - Protéine de soja texturée (PST) — 50 g *(pesé sec)*
  - Haricots rouges — 40 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Maïs — 50 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Rôtir la patate douce.
  2. Mijoter PST + haricots en chili, dresser avec maïs.
- **Pourquoi** : Vegan combats sans gluten : très haute capacité protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep100 — Pomme de terre – saumon – asperges – yaourt

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 562 kcal · 37 g protéines · 37 g glucides · 28 g lipides
- **Ingrédients** :
  - Pomme de terre — 200 g *(pesé cru)*
  - Pavé de saumon — 140 g *(pesé cru)*
  - Asperges — 100 g — quantité fixe
  - Huile d'olive — 5 g
  - Yaourt grec — 60 g
- **Préparation** :
  1. Cuire pommes de terre et asperges.
  2. Rôtir le saumon, servir avec sauce yaourt-aneth.
- **Pourquoi** : Pescatarien jour repos : oméga-3, sauce protéinée légère.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep101 — Dahl lentilles corail – riz – épinards

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 736 kcal · 44 g protéines · 105 g glucides · 11 g lipides
- **Ingrédients** :
  - Lentilles corail — 80 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Riz basmati — 70 g *(pesé sec)*
  - Épinards frais — 80 g — quantité fixe
  - Lait de coco — 50 ml
  - Oignon — 40 g — quantité fixe
- **Préparation** :
  1. Mijoter lentilles + oignon + épices 20 min.
  2. Finir au lait de coco et épinards, servir avec le riz.
- **Pourquoi** : Vegan endurance sans gluten : dahl complet, glucides + protéines.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep102 — Dahl lentilles – PST – riz complet

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 681 kcal · 42 g protéines · 96 g glucides · 11 g lipides
- **Ingrédients** :
  - Lentilles corail — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 30 g *(pesé sec)*
  - Riz complet — 70 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Lait de coco — 40 ml
- **Préparation** :
  1. Mijoter lentilles + PST + tomate.
  2. Lier au lait de coco, servir avec le riz.
- **Pourquoi** : Vegan muscu : double protéine (lentilles + PST), forte capacité.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep103 — Chili sin carne – haricots rouges – riz

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 720 kcal · 42 g protéines · 106 g glucides · 11 g lipides
- **Ingrédients** :
  - Haricots rouges — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 35 g *(pesé sec)*
  - Riz complet — 70 g *(pesé sec)*
  - Tomate concassée — 120 g — quantité fixe
  - Maïs — 50 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Mijoter haricots + PST + tomate + épices.
  2. Ajouter le maïs, servir sur riz.
- **Pourquoi** : Vegan combats sans gluten : protéines complètes, plat réconfortant.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep104 — Curry pois chiches – patate – riz

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 603 kcal · 39 g protéines · 72 g glucides · 15 g lipides
- **Ingrédients** :
  - Pois chiches — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 40 g *(pesé sec)*
  - Patate douce — 120 g *(pesé cru)*
  - Tomate concassée — 100 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Mijoter pois chiches + PST + patate en curry.
  2. Finir au lait de coco.
- **Pourquoi** : Vegan endurance sans gluten : glucides patate + capacité protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep105 — Soupe haricots blancs – légumes – pain

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : combats · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 563 kcal · 38 g protéines · 70 g glucides · 11 g lipides
- **Ingrédients** :
  - Haricots blancs — 80 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Carotte — 80 g — quantité fixe
  - Tomate concassée — 80 g — quantité fixe
  - Huile d'olive — 8 g
  - Pain complet — 50 g
- **Préparation** :
  1. Mijoter haricots blancs + PST + légumes 25 min.
  2. Servir avec le pain.
- **Pourquoi** : Vegan combats : soupe-repas rassasiante, protéines végétales.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep106 — Feijoada express – haricots noirs – riz

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 700 kcal · 39 g protéines · 99 g glucides · 11 g lipides
- **Ingrédients** :
  - Haricots noirs — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 35 g *(pesé sec)*
  - Riz complet — 75 g *(pesé sec)*
  - Oignon — 40 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Mijoter haricots noirs + PST + oignon + épices.
  2. Servir sur riz.
- **Pourquoi** : Vegan muscu sans gluten : haricots noirs riches en protéines et fer.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep107 — Buddha bowl pois cassés – boulgour – carotte

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 676 kcal · 39 g protéines · 92 g glucides · 11 g lipides
- **Ingrédients** :
  - Pois cassés — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Boulgour — 70 g *(pesé sec)*
  - Carotte — 80 g — quantité fixe
  - Roquette — 30 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire pois cassés et boulgour.
  2. Assembler en bowl avec carotte râpée et roquette.
- **Pourquoi** : Vegan endurance : pois cassés protéinés + glucides du boulgour.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep108 — Dahl fèves – riz – coriandre

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 645 kcal · 38 g protéines · 91 g glucides · 10 g lipides
- **Ingrédients** :
  - Fèves — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 25 g *(pesé sec)*
  - Riz basmati — 70 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Lait de coco — 40 ml
- **Préparation** :
  1. Mijoter fèves + PST + tomate.
  2. Finir au lait de coco, servir avec le riz.
- **Pourquoi** : Vegan muscu sans gluten : fèves = excellente densité protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep109 — Salade lentilles – feta – tomate

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 471 kcal · 27 g protéines · 41 g glucides · 19 g lipides
- **Ingrédients** :
  - Lentilles vertes — 80 g *(pesé sec)*
  - Feta — 40 g
  - Tomate — 100 g — quantité fixe
  - Concombre — 60 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire les lentilles, refroidir.
  2. Mélanger avec feta, tomate, concombre et vinaigrette.
- **Pourquoi** : Végétarien sans gluten : froid, protéiné, fibres et fraîcheur.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep110 — Chili poulet – haricots rouges – riz

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 650 kcal · 50 g protéines · 80 g glucides · 11 g lipides
- **Ingrédients** :
  - Riz complet — 75 g *(pesé sec)*
  - Filet de poulet — 140 g *(pesé cru)*
  - Haricots rouges — 50 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Mijoter poulet émincé + haricots + tomate + épices.
  2. Servir sur riz.
- **Pourquoi** : Muscu sans gluten : double protéine animale + végétale, capacité haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep111 — Houmous bowl – pois chiches – boulgour

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 682 kcal · 36 g protéines · 93 g glucides · 14 g lipides
- **Ingrédients** :
  - Pois chiches — 80 g *(pesé sec)*
  - Boulgour — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 20 g *(pesé sec)*
  - Poivron — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire boulgour et pois chiches.
  2. Assembler avec houmous, PST et poivron grillé.
- **Pourquoi** : Vegan endurance : levantin protéiné, glucides du boulgour.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep112 — Soupe pois cassés – croûtons – graines

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : perte de gras, maintien · **Sport** : combats · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 592 kcal · 30 g protéines · 67 g glucides · 16 g lipides
- **Ingrédients** :
  - Pois cassés — 90 g *(pesé sec)*
  - Carotte — 80 g — quantité fixe
  - Oignon — 40 g — quantité fixe
  - Huile d'olive — 8 g
  - Pain complet — 40 g
  - Graines de courge — 12 g
- **Préparation** :
  1. Mijoter pois cassés + légumes 25 min, mixer.
  2. Servir avec croûtons et graines de courge.
- **Pourquoi** : Vegan combats : velouté-repas dense en protéines, peu de lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep113 — Wrap poulet – avocat – crudités

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 526 kcal · 41 g protéines · 45 g glucides · 19 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 80 g
  - Filet de poulet — 140 g *(pesé cru)*
  - Avocat — 50 g
  - Salade verte — 40 g — quantité fixe
  - Tomate — 50 g — quantité fixe
- **Préparation** :
  1. Poêler le poulet émincé.
  2. Garnir la tortilla de poulet, avocat et crudités, rouler.
- **Pourquoi** : Muscu nomade : protéiné, bons lipides, à emporter.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep114 — Tacos PST – haricots noirs – maïs

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 785 kcal · 46 g protéines · 95 g glucides · 19 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 90 g
  - Protéine de soja texturée (PST) — 50 g *(pesé sec)*
  - Haricots noirs — 50 g *(pesé sec)*
  - Maïs — 50 g — quantité fixe
  - Avocat — 50 g
- **Préparation** :
  1. Réhydrater la PST, mijoter façon chili.
  2. Garnir les tortillas avec haricots, maïs et avocat.
- **Pourquoi** : Vegan combats : tacos très protéinés, capacité élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep115 — Wrap thon – crudités – fromage blanc

- **Type** : Repas · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, halal
- **Macros / portion (base)** : 471 kcal · 44 g protéines · 47 g glucides · 11 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 80 g
  - Thon au naturel (conserve) — 120 g
  - Fromage blanc 0% — 60 g
  - Salade verte — 40 g — quantité fixe
  - Concombre — 50 g — quantité fixe
- **Préparation** :
  1. Mélanger thon et fromage blanc.
  2. Garnir la tortilla, ajouter crudités, rouler.
- **Pourquoi** : Pescatarien léger : protéiné, sauce sans gras, à emporter.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep116 — Galettes sarrasin – œuf – champignons

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 547 kcal · 31 g protéines · 49 g glucides · 24 g lipides
- **Ingrédients** :
  - Sarrasin — 70 g *(pesé sec)*
  - Œuf entier — 150 g
  - Champignons — 100 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Préparer une pâte à galette de sarrasin, cuire.
  2. Garnir d'œuf et champignons poêlés.
- **Pourquoi** : Végétarien sans gluten : galette bretonne protéinée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep117 — Pita poulet – tzatziki – salade

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, halal
- **Macros / portion (base)** : 481 kcal · 43 g protéines · 43 g glucides · 13 g lipides
- **Ingrédients** :
  - Pain pita complet — 80 g
  - Filet de poulet — 150 g *(pesé cru)*
  - Yaourt grec — 60 g
  - Concombre — 60 g — quantité fixe
  - Huile d'olive — 5 g
- **Préparation** :
  1. Griller le poulet, préparer le tzatziki au yaourt.
  2. Garnir le pita de poulet, sauce et crudités.
- **Pourquoi** : Muscu : kebab maison sain, protéiné, sauce légère.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep118 — Wrap falafel – houmous – crudités

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 767 kcal · 41 g protéines · 98 g glucides · 20 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 90 g
  - Pois chiches — 85 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 30 g *(pesé sec)*
  - Salade verte — 40 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Mixer pois chiches + PST en falafels, cuire au four.
  2. Garnir la tortilla de falafels, houmous et salade.
- **Pourquoi** : Vegan endurance : falafels protéinés, glucides du wrap.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep119 — Tacos poisson – chou – citron vert

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 493 kcal · 36 g protéines · 44 g glucides · 18 g lipides
- **Ingrédients** :
  - Tortilla blé complet — 80 g
  - Dos de cabillaud — 150 g *(pesé cru)*
  - Chou-fleur — 80 g — quantité fixe
  - Avocat — 50 g
- **Préparation** :
  1. Poêler le cabillaud épicé.
  2. Garnir les tortillas de poisson, chou émincé et avocat.
- **Pourquoi** : Pescatarien : fish tacos, poisson maigre + bons lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep120 — Pita PST shawarma – sauce soja – légumes

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 538 kcal · 40 g protéines · 71 g glucides · 9 g lipides
- **Ingrédients** :
  - Pain pita complet — 105 g
  - Protéine de soja texturée (PST) — 50 g *(pesé sec)*
  - Yaourt de soja protéiné — 60 g
  - Tomate — 60 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Réhydrater et poêler la PST façon shawarma.
  2. Garnir le pita avec sauce yaourt de soja et légumes.
- **Pourquoi** : Vegan combats : shawarma végétal très protéiné, pas trop lourd.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep121 — Taboulé protéiné – pois chiches – menthe

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 680 kcal · 35 g protéines · 98 g glucides · 14 g lipides
- **Ingrédients** :
  - Semoule de couscous — 80 g *(pesé sec)*
  - Pois chiches — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 20 g *(pesé sec)*
  - Tomate — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Hydrater la semoule.
  2. Mélanger pois chiches, PST réhydratée, tomate, menthe et citron.
- **Pourquoi** : Vegan endurance : taboulé enrichi en protéines, froid.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep122 — Couscous poulet – légumes – pois chiches

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, halal
- **Macros / portion (base)** : 703 kcal · 55 g protéines · 84 g glucides · 13 g lipides
- **Ingrédients** :
  - Semoule de couscous — 85 g *(pesé sec)*
  - Filet de poulet — 150 g *(pesé cru)*
  - Pois chiches — 40 g *(pesé sec)*
  - Carotte — 80 g — quantité fixe
  - Courgette — 80 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire la semoule.
  2. Mijoter poulet, légumes et pois chiches en bouillon épicé.
- **Pourquoi** : Muscu : couscous complet, double protéine, capacité haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep123 — Boulgour – bœuf – ratatouille – yaourt

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : sans porc, halal
- **Macros / portion (base)** : 607 kcal · 43 g protéines · 61 g glucides · 19 g lipides
- **Ingrédients** :
  - Boulgour — 80 g *(pesé sec)*
  - Bœuf haché 5% MG — 140 g *(pesé cru)*
  - Ratatouille de légumes — 120 g — quantité fixe
  - Huile d'olive — 6 g
  - Yaourt grec — 50 g
- **Préparation** :
  1. Cuire le boulgour.
  2. Poêler le bœuf, servir avec ratatouille et yaourt.
- **Pourquoi** : Combats : plat oriental protéiné, sauce yaourt fraîche.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep124 — Semoule – tofu façon merguez – légumes

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 719 kcal · 45 g protéines · 73 g glucides · 25 g lipides
- **Ingrédients** :
  - Semoule de couscous — 80 g *(pesé sec)*
  - Tofu ferme — 180 g
  - Protéine de soja texturée (PST) — 20 g *(pesé sec)*
  - Ratatouille de légumes — 120 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire la semoule.
  2. Poêler tofu + PST épicés façon merguez, servir avec ratatouille.
- **Pourquoi** : Vegan combats : couscous végétal très protéiné, pas trop lourd.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep125 — Boulgour – saumon – courgette – citron

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 619 kcal · 39 g protéines · 54 g glucides · 25 g lipides
- **Ingrédients** :
  - Boulgour — 80 g *(pesé sec)*
  - Pavé de saumon — 140 g *(pesé cru)*
  - Courgette — 100 g — quantité fixe
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire le boulgour.
  2. Rôtir saumon et courgette, dresser au citron.
- **Pourquoi** : Pescatarien jour repos : oméga-3 + glucides complets.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep126 — Couscous végétal – pois chiches – PST

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, végétalien, halal
- **Macros / portion (base)** : 738 kcal · 42 g protéines · 104 g glucides · 14 g lipides
- **Ingrédients** :
  - Semoule de couscous — 85 g *(pesé sec)*
  - Pois chiches — 60 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 35 g *(pesé sec)*
  - Carotte — 80 g — quantité fixe
  - Courgette — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire la semoule.
  2. Mijoter pois chiches + PST + légumes en bouillon.
- **Pourquoi** : Vegan endurance : couscous complet, capacité protéique élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep127 — Polenta crémeuse – poulet – champignons

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 514 kcal · 45 g protéines · 54 g glucides · 12 g lipides
- **Ingrédients** :
  - Polenta — 70 g *(pesé sec)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Champignons — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire la polenta crémeuse.
  2. Poêler poulet et champignons, dresser sur la polenta.
- **Pourquoi** : Muscu sans gluten : polenta réconfortante + protéines maigres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep128 — Polenta – ratatouille – tofu grillé

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 669 kcal · 35 g protéines · 65 g glucides · 28 g lipides
- **Ingrédients** :
  - Polenta — 70 g *(pesé sec)*
  - Tofu ferme — 210 g
  - Ratatouille de légumes — 150 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire la polenta.
  2. Griller le tofu, servir sur polenta avec ratatouille.
- **Pourquoi** : Vegan endurance sans gluten : méditerranéen, ancre protéique haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep129 — Nouilles de riz sautées – tofu – cacahuète

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 745 kcal · 37 g protéines · 87 g glucides · 26 g lipides
- **Ingrédients** :
  - Nouilles de riz — 90 g *(pesé sec)*
  - Tofu ferme — 180 g
  - Mélange wok (poivron/brocoli/carotte) — 120 g — quantité fixe
  - Beurre de cacahuète — 18 g
- **Préparation** :
  1. Cuire les nouilles.
  2. Sauter tofu et légumes, lier à la sauce cacahuète.
- **Pourquoi** : Vegan & sans gluten : pad thaï végétal, énergie pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep130 — Nouilles de riz – bœuf – brocoli – sésame

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 619 kcal · 38 g protéines · 75 g glucides · 17 g lipides
- **Ingrédients** :
  - Nouilles de riz — 90 g *(pesé sec)*
  - Bavette de bœuf — 140 g *(pesé cru)*
  - Brocoli — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire les nouilles.
  2. Saisir le bœuf, sauter avec brocoli et sésame, mélanger.
- **Pourquoi** : Muscu sans gluten : sauté riche en fer, capacité élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep131 — Polenta – PST bolognaise – parmesan

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 564 kcal · 37 g protéines · 70 g glucides · 15 g lipides
- **Ingrédients** :
  - Polenta — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 45 g *(pesé sec)*
  - Tomate concassée — 120 g — quantité fixe
  - Parmesan — 20 g
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire la polenta.
  2. Mijoter PST + tomate, dresser sur polenta, râper le parmesan.
- **Pourquoi** : Végétarien sans gluten : bolognaise végétale + parmesan, haute protéine.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep132 — Nouilles de riz – crevettes – légumes – coco

- **Type** : Repas · **Préparation** : 20 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 601 kcal · 40 g protéines · 81 g glucides · 12 g lipides
- **Ingrédients** :
  - Nouilles de riz — 90 g *(pesé sec)*
  - Crevettes cuites — 150 g
  - Mélange wok (poivron/brocoli/carotte) — 120 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Cuire les nouilles.
  2. Sauter crevettes et légumes, lier au lait de coco.
- **Pourquoi** : Pescatarien sans gluten : laksa léger, glucides pour l'endurance.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep133 — Omelette – pommes de terre – épinards

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 461 kcal · 28 g protéines · 27 g glucides · 25 g lipides
- **Ingrédients** :
  - Œuf entier — 180 g
  - Pomme de terre — 150 g *(pesé cru)*
  - Épinards frais — 80 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire les pommes de terre en dés.
  2. Verser les œufs battus avec épinards, cuire l'omelette.
- **Pourquoi** : Végétarien : tortilla espagnole protéinée, complète.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep134 — Shakshuka – œufs – pois chiches – pain

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, halal
- **Macros / portion (base)** : 618 kcal · 36 g protéines · 53 g glucides · 27 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Pois chiches — 50 g *(pesé sec)*
  - Tomate concassée — 150 g — quantité fixe
  - Poivron — 80 g — quantité fixe
  - Pain complet — 50 g
  - Huile d'olive — 7 g
- **Préparation** :
  1. Mijoter tomate, poivron et pois chiches.
  2. Casser les œufs dessus, cuire couvert, servir avec pain.
- **Pourquoi** : Végétarien : plat mijoté riche en protéines, glucides du pain.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep135 — Frittata – courgette – feta – quinoa

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans gluten, halal
- **Macros / portion (base)** : 569 kcal · 33 g protéines · 31 g glucides · 33 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Feta — 40 g
  - Courgette — 100 g — quantité fixe
  - Quinoa — 50 g *(pesé sec)*
  - Huile d'olive — 6 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Mélanger œufs, feta, courgette et quinoa, cuire en frittata.
- **Pourquoi** : Végétarien sans gluten : frittata protéinée + quinoa.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep136 — Œufs cocotte – épinards – patate douce

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 419 kcal · 25 g protéines · 29 g glucides · 21 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Patate douce — 150 g *(pesé cru)*
  - Épinards frais — 80 g — quantité fixe
  - Crème de soja — 40 ml
- **Préparation** :
  1. Rôtir la patate douce.
  2. Cuire les œufs cocotte sur lit d'épinards et crème de soja.
- **Pourquoi** : Végétarien jour repos sans gluten : onctueux et protéiné.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep137 — Omelette protéinée – champignons – riz

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 434 kcal · 35 g protéines · 50 g glucides · 10 g lipides
- **Ingrédients** :
  - Blanc d'œuf — 200 g
  - Œuf entier — 50 g
  - Champignons — 100 g — quantité fixe
  - Riz basmati — 60 g *(pesé sec)*
  - Huile d'olive — 4 g
- **Préparation** :
  1. Cuire le riz.
  2. Cuire l'omelette blancs + œuf avec champignons, servir avec le riz.
- **Pourquoi** : Sèche végétarienne sans gluten : très haute protéine, peu de gras.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep138 — Œufs brouillés – avocat – patate – maïs

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 506 kcal · 24 g protéines · 35 g glucides · 28 g lipides
- **Ingrédients** :
  - Œuf entier — 150 g
  - Patate douce — 150 g *(pesé cru)*
  - Avocat — 60 g
  - Maïs — 50 g — quantité fixe
- **Préparation** :
  1. Rôtir la patate douce.
  2. Brouiller les œufs, dresser avec avocat et maïs.
- **Pourquoi** : Végétarien sans gluten : brunch complet, bons lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep139 — Salade César allégée – poulet – quinoa

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans gluten, halal
- **Macros / portion (base)** : 524 kcal · 51 g protéines · 36 g glucides · 18 g lipides
- **Ingrédients** :
  - Quinoa — 60 g *(pesé sec)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Salade verte — 60 g — quantité fixe
  - Parmesan — 15 g
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Mélanger salade, poulet grillé, quinoa, parmesan et sauce yaourt-citron.
- **Pourquoi** : Muscu sans gluten : César revisitée, protéinée et fraîche.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep140 — Salade riz – thon – maïs – œuf

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 655 kcal · 46 g protéines · 66 g glucides · 22 g lipides
- **Ingrédients** :
  - Riz basmati — 70 g *(pesé sec)*
  - Thon au naturel (conserve) — 100 g
  - Œuf entier — 100 g
  - Maïs — 60 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le riz, refroidir.
  2. Mélanger thon, œuf dur, maïs et vinaigrette légère.
- **Pourquoi** : Pescatarien sans gluten : salade complète à emporter, double protéine.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep141 — Salade quinoa – tofu fumé – avocat – edamame

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 679 kcal · 38 g protéines · 51 g glucides · 33 g lipides
- **Ingrédients** :
  - Quinoa — 70 g *(pesé sec)*
  - Tofu ferme — 150 g
  - Edamame — 60 g
  - Avocat — 60 g
  - Roquette — 40 g — quantité fixe
- **Préparation** :
  1. Cuire le quinoa.
  2. Poêler le tofu fumé, assembler avec edamame, avocat et roquette.
- **Pourquoi** : Vegan & sans gluten : salade protéinée complète, bons lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep142 — Salade pois chiches – feta – concombre – boulgour

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, halal
- **Macros / portion (base)** : 648 kcal · 28 g protéines · 76 g glucides · 22 g lipides
- **Ingrédients** :
  - Boulgour — 60 g *(pesé sec)*
  - Pois chiches — 70 g *(pesé sec)*
  - Feta — 40 g
  - Concombre — 80 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire le boulgour.
  2. Mélanger pois chiches, feta, concombre et menthe.
- **Pourquoi** : Végétarien combats : salade levantine fraîche et protéinée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep143 — Salade lentilles – saumon fumé – betterave

- **Type** : Repas · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 498 kcal · 38 g protéines · 42 g glucides · 16 g lipides
- **Ingrédients** :
  - Lentilles vertes — 80 g *(pesé sec)*
  - Saumon fumé — 70 g
  - Betterave cuite — 80 g — quantité fixe
  - Roquette — 40 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire les lentilles, refroidir.
  2. Assembler avec saumon fumé, betterave et roquette.
- **Pourquoi** : Pescatarien sans gluten : protéiné, oméga-3, sans cuisson de poisson.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep144 — Salade haricots blancs – thon – tomate

- **Type** : Repas · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : pescétarien, sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 490 kcal · 46 g protéines · 40 g glucides · 13 g lipides
- **Ingrédients** :
  - Haricots blancs — 80 g *(pesé sec)*
  - Thon au naturel (conserve) — 100 g
  - Tomate — 100 g — quantité fixe
  - Oignon — 30 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Rincer les haricots blancs cuits.
  2. Mélanger avec thon, tomate et oignon rouge.
- **Pourquoi** : Pescatarien sans gluten : salade express, double protéine rassasiante.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep145 — Salade quinoa – haricots noirs – maïs – avocat

- **Type** : Repas · **Préparation** : 18 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 743 kcal · 37 g protéines · 91 g glucides · 19 g lipides
- **Ingrédients** :
  - Quinoa — 70 g *(pesé sec)*
  - Haricots noirs — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 20 g *(pesé sec)*
  - Maïs — 60 g — quantité fixe
  - Avocat — 60 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Mélanger haricots noirs, PST, maïs et avocat, assaisonner au citron vert.
- **Pourquoi** : Vegan combats sans gluten : salade tex-mex, protéines complètes.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep146 — Salade poulet – patate douce – épinards

- **Type** : Repas · **Préparation** : 25 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : sans porc, sans lactose, sans gluten, halal
- **Macros / portion (base)** : 445 kcal · 45 g protéines · 28 g glucides · 15 g lipides
- **Ingrédients** :
  - Patate douce — 150 g *(pesé cru)*
  - Filet de poulet — 160 g *(pesé cru)*
  - Épinards frais — 60 g — quantité fixe
  - Graines de courge — 12 g
  - Huile d'olive — 6 g
- **Préparation** :
  1. Rôtir la patate douce en dés.
  2. Assembler avec poulet grillé, épinards et graines de courge.
- **Pourquoi** : Muscu sans gluten : salade tiède complète, protéinée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd45 — Porridge sarrasin – beurre cacahuète – banane

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 480 kcal · 30 g protéines · 61 g glucides · 12 g lipides
- **Ingrédients** :
  - Sarrasin — 60 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 25 g
  - Beurre de cacahuète — 15 g
  - Banane — 80 g
- **Préparation** :
  1. Cuire le sarrasin 12 min.
  2. Incorporer la protéine, garnir de banane et beurre de cacahuète.
- **Pourquoi** : Vegan & sans gluten : porridge énergétique, ancre protéique végétale.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd46 — Porridge millet – cacao – dattes

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 501 kcal · 29 g protéines · 68 g glucides · 12 g lipides
- **Ingrédients** :
  - Millet — 60 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 25 g
  - Lait d'amande — 200 ml
  - Cacao maigre en poudre — 8 g — quantité fixe
  - Dattes dénoyautées — 30 g
- **Préparation** :
  1. Cuire le millet dans le lait d'amande 12 min.
  2. Incorporer protéine et cacao, garnir de dattes.
- **Pourquoi** : Vegan & sans gluten : version chocolatée, jour repos.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd47 — Pudding chia – mangue – coco

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 299 kcal · 19 g protéines · 22 g glucides · 13 g lipides
- **Ingrédients** :
  - Graines de chia — 20 g
  - Yaourt de soja protéiné — 160 g
  - Mangue — 90 g
  - Lait de coco — 20 ml
- **Préparation** :
  1. Mélanger chia et yaourt de soja, reposer 4 h.
  2. Garnir de mangue et lait de coco.
- **Pourquoi** : Vegan & sans gluten : oméga-3 du chia + ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd48 — Bowl yaourt soja – amandes – fruits rouges

- **Type** : Petit-déj · **Préparation** : 4 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 326 kcal · 23 g protéines · 30 g glucides · 12 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 200 g
  - Fruits rouges (mélange) — 80 g
  - Amandes — 15 g
  - Banane — 70 g
- **Préparation** :
  1. Verser le yaourt de soja.
  2. Garnir de fruits rouges, banane et amandes.
- **Pourquoi** : Vegan & sans gluten : protéiné et frais, peu calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd49 — Smoothie bowl protéine pois – framboises – chia

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 289 kcal · 27 g protéines · 11 g glucides · 13 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 30 g
  - Framboises — 100 g
  - Lait d'amande — 200 ml
  - Graines de chia — 12 g
- **Préparation** :
  1. Mixer protéine, framboises et lait d'amande.
  2. Verser, garnir de chia.
- **Pourquoi** : Vegan & sans gluten : digeste avant un effort, protéines végétales.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd50 — Porridge quinoa – pomme – amandes

- **Type** : Petit-déj · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 442 kcal · 24 g protéines · 54 g glucides · 12 g lipides
- **Ingrédients** :
  - Quinoa — 60 g *(pesé sec)*
  - Yaourt de soja protéiné — 150 g
  - Pomme — 100 g
  - Amandes — 12 g
- **Préparation** :
  1. Cuire le quinoa 12 min.
  2. Mélanger au yaourt de soja, ajouter pomme râpée et amandes.
- **Pourquoi** : Vegan & sans gluten : quinoa = protéines complètes, fibres.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd51 — Riz au lait d'amande – dattes – cannelle

- **Type** : Petit-déj · **Préparation** : 20 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 582 kcal · 29 g protéines · 79 g glucides · 16 g lipides
- **Ingrédients** :
  - Riz basmati — 70 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 25 g
  - Lait d'amande — 220 ml
  - Dattes dénoyautées — 30 g
  - Amandes — 12 g
- **Préparation** :
  1. Cuire le riz dans le lait d'amande 18 min.
  2. Incorporer la protéine, ajouter dattes, cannelle et amandes.
- **Pourquoi** : Vegan & sans gluten : riz au lait revisité, énergie durable.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd52 — Tofu brouillé – patate douce – épinards

- **Type** : Petit-déj · **Préparation** : 18 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 470 kcal · 32 g protéines · 31 g glucides · 22 g lipides
- **Ingrédients** :
  - Tofu ferme — 180 g
  - Patate douce — 120 g *(pesé cru)*
  - Épinards frais — 80 g — quantité fixe
  - Huile d'olive — 6 g
  - Levure maltée — 8 g — quantité fixe
- **Préparation** :
  1. Rôtir la patate douce en dés.
  2. Émietter le tofu, poêler avec épinards et levure maltée.
- **Pourquoi** : Vegan & sans gluten salé : brunch protéiné, sans œuf ni pain.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd53 — Bowl yaourt soja protéiné – kiwi – graines courge

- **Type** : Petit-déj · **Préparation** : 4 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 265 kcal · 22 g protéines · 20 g glucides · 9 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 200 g
  - Kiwi — 100 g
  - Graines de courge — 12 g
- **Préparation** :
  1. Verser le yaourt de soja.
  2. Garnir de kiwi et graines de courge.
- **Pourquoi** : Vegan & sans gluten : sèche, densité protéique haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd54 — Pudding chia – cacao – beurre amande – banane

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 460 kcal · 30 g protéines · 24 g glucides · 24 g lipides
- **Ingrédients** :
  - Graines de chia — 22 g
  - Protéine végétale (pois/soja) — 25 g
  - Lait d'amande — 220 ml
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Banane — 80 g
  - Beurre d'amande — 12 g
- **Préparation** :
  1. Mélanger chia, protéine, cacao et lait d'amande, reposer 4 h.
  2. Garnir de banane et beurre d'amande.
- **Pourquoi** : Vegan & sans gluten : gourmand, riche en oméga-3 et lipides.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd55 — Smoothie soja – mangue – avocat – chia

- **Type** : Petit-déj · **Préparation** : 6 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 335 kcal · 19 g protéines · 22 g glucides · 17 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 180 g
  - Mangue — 100 g
  - Avocat — 50 g
  - Graines de chia — 10 g
- **Préparation** :
  1. Mixer yaourt de soja, mangue et avocat.
  2. Ajouter le chia, servir épais.
- **Pourquoi** : Vegan & sans gluten : crémeux, lipides de qualité de l'avocat.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd56 — Galettes de riz – cacahuète – banane – yaourt soja

- **Type** : Petit-déj · **Préparation** : 5 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 445 kcal · 20 g protéines · 58 g glucides · 14 g lipides
- **Ingrédients** :
  - Galette de riz soufflé — 40 g
  - Beurre de cacahuète — 20 g
  - Banane — 90 g
  - Yaourt de soja protéiné — 130 g
- **Préparation** :
  1. Tartiner le beurre de cacahuète sur les galettes.
  2. Ajouter banane, accompagner du yaourt de soja.
- **Pourquoi** : Vegan & sans gluten : glucides rapides + protéines avant le cardio.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd57 — Porridge millet – framboises – noisettes

- **Type** : Petit-déj · **Préparation** : 12 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 428 kcal · 23 g protéines · 55 g glucides · 12 g lipides
- **Ingrédients** :
  - Millet — 60 g *(pesé sec)*
  - Yaourt de soja protéiné — 150 g
  - Framboises — 80 g
  - Noisettes — 12 g
- **Préparation** :
  1. Cuire le millet 12 min.
  2. Mélanger au yaourt de soja, garnir framboises et noisettes.
- **Pourquoi** : Vegan & sans gluten : porridge fruité, ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### pd58 — Bowl quinoa – fruits rouges – amandes – coco

- **Type** : Petit-déj · **Préparation** : 15 min
- **Objectif** : perte de gras, maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 468 kcal · 25 g protéines · 50 g glucides · 16 g lipides
- **Ingrédients** :
  - Quinoa — 60 g *(pesé sec)*
  - Yaourt de soja protéiné — 150 g
  - Fruits rouges (mélange) — 80 g
  - Amandes — 12 g
  - Lait de coco — 20 ml
- **Préparation** :
  1. Cuire le quinoa, laisser tiédir.
  2. Mélanger au yaourt de soja, garnir fruits rouges, amandes et coco.
- **Pourquoi** : Vegan & sans gluten : bowl complet, protéines complètes du quinoa.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col45 — Pudding chia – mangue – coco

- **Type** : Collation · **Préparation** : 5 min
- **Objectif** : perte de gras · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 236 kcal · 17 g protéines · 19 g glucides · 8 g lipides
- **Ingrédients** :
  - Graines de chia — 18 g
  - Yaourt de soja protéiné — 150 g
  - Mangue — 80 g
- **Préparation** :
  1. Mélanger chia et yaourt de soja, reposer 3 h.
  2. Garnir de mangue.
- **Pourquoi** : Vegan & sans gluten : oméga-3 et protéines, peu calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col46 — Shake protéine pois – banane – cacao

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 324 kcal · 28 g protéines · 25 g glucides · 12 g lipides
- **Ingrédients** :
  - Protéine végétale (pois/soja) — 30 g
  - Banane — 100 g
  - Lait d'amande — 250 ml
  - Cacao maigre en poudre — 8 g — quantité fixe
- **Préparation** :
  1. Mixer protéine, banane, lait d'amande et cacao.
  2. Servir frais.
- **Pourquoi** : Vegan & sans gluten : shake post-training, protéines végétales.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col47 — Yaourt soja protéiné – myrtilles – amandes

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 239 kcal · 19 g protéines · 17 g glucides · 9 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 180 g
  - Myrtilles — 80 g
  - Amandes — 12 g
- **Préparation** :
  1. Mélanger yaourt de soja et myrtilles.
  2. Parsemer d'amandes.
- **Pourquoi** : Vegan & sans gluten : sèche, densité protéique élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col48 — Energy balls dattes – cacahuète – sarrasin

- **Type** : Collation · **Préparation** : 10 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 457 kcal · 24 g protéines · 58 g glucides · 13 g lipides
- **Ingrédients** :
  - Dattes dénoyautées — 50 g
  - Beurre de cacahuète — 20 g
  - Sarrasin — 30 g *(pesé sec)*
  - Protéine végétale (pois/soja) — 20 g
- **Préparation** :
  1. Toaster puis mixer le sarrasin avec dattes et beurre de cacahuète.
  2. Incorporer la protéine, former des boules, réfrigérer.
- **Pourquoi** : Vegan & sans gluten : énergie dense transportable, ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col49 — Galettes de riz – beurre amande – chocolat noir

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 377 kcal · 18 g protéines · 33 g glucides · 18 g lipides
- **Ingrédients** :
  - Galette de riz soufflé — 30 g
  - Beurre d'amande — 18 g
  - Chocolat noir 70% — 12 g
  - Yaourt de soja protéiné — 120 g
- **Préparation** :
  1. Tartiner le beurre d'amande sur les galettes.
  2. Râper le chocolat, servir avec le yaourt de soja.
- **Pourquoi** : Vegan & sans gluten : en-cas gourmand + ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col50 — Edamame grillés – sésame – piment

- **Type** : Collation · **Préparation** : 8 min
- **Objectif** : perte de gras · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 232 kcal · 17 g protéines · 14 g glucides · 12 g lipides
- **Ingrédients** :
  - Edamame — 150 g
  - Huile d'olive — 5 g
- **Préparation** :
  1. Griller les edamame avec un filet d'huile.
  2. Saupoudrer sésame et piment.
- **Pourquoi** : Vegan & sans gluten : protéines pures, volume, très peu calorique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col51 — Smoothie soja – ananas – chia

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : perte de gras · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 195 kcal · 15 g protéines · 18 g glucides · 6 g lipides
- **Ingrédients** :
  - Yaourt de soja protéiné — 150 g
  - Ananas — 100 g
  - Graines de chia — 10 g
- **Préparation** :
  1. Mixer yaourt de soja et ananas.
  2. Ajouter le chia, servir.
- **Pourquoi** : Vegan & sans gluten : frais et protéiné, faible en calories.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col52 — Mousse tofu soyeux – cacao – sirop érable

- **Type** : Collation · **Préparation** : 8 min
- **Objectif** : perte de gras, maintien · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 229 kcal · 24 g protéines · 13 g glucides · 8 g lipides
- **Ingrédients** :
  - Tofu soyeux — 150 g
  - Protéine végétale (pois/soja) — 20 g
  - Cacao maigre en poudre — 10 g — quantité fixe
  - Sirop d'érable — 12 g
- **Préparation** :
  1. Mixer tofu soyeux, protéine, cacao et sirop d'érable.
  2. Réfrigérer 1 h avant de servir.
- **Pourquoi** : Vegan & sans gluten : mousse chocolat protéinée, onctueuse.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col53 — Banane – beurre cacahuète – graines courge

- **Type** : Collation · **Préparation** : 3 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 378 kcal · 20 g protéines · 31 g glucides · 19 g lipides
- **Ingrédients** :
  - Banane — 110 g
  - Beurre de cacahuète — 20 g
  - Graines de courge — 12 g
  - Yaourt de soja protéiné — 120 g
- **Préparation** :
  1. Couper la banane, napper de beurre de cacahuète.
  2. Parsemer de graines de courge, servir avec le yaourt de soja.
- **Pourquoi** : Vegan & sans gluten : recharge glucidique + ancre protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### col54 — Compote pomme – chia – noix

- **Type** : Collation · **Préparation** : 4 min
- **Objectif** : perte de gras · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 275 kcal · 15 g protéines · 21 g glucides · 13 g lipides
- **Ingrédients** :
  - Pomme — 120 g
  - Graines de chia — 12 g
  - Noix — 10 g
  - Yaourt de soja protéiné — 130 g
- **Préparation** :
  1. Mélanger compote de pomme et chia.
  2. Ajouter les noix concassées, servir avec le yaourt de soja.
- **Pourquoi** : Vegan & sans gluten : léger, fibres et oméga-3.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep147 — Riz – soja_texture teriyaki – edamame – brocoli

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 622 kcal · 41 g protéines · 80 g glucides · 13 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 50 g *(pesé sec)*
  - Edamame — 60 g
  - Brocoli — 100 g — quantité fixe
  - Huile d'olive — 7 g
- **Préparation** :
  1. Cuire le riz, réhydrater la PST.
  2. Laquer la PST teriyaki, sauter avec edamame et brocoli.
- **Pourquoi** : Vegan & sans gluten : double ancre (PST + edamame), forte capacité protéique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep148 — Quinoa – tofu – curry cacahuète – épinards

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 723 kcal · 44 g protéines · 58 g glucides · 31 g lipides
- **Ingrédients** :
  - Quinoa — 80 g *(pesé sec)*
  - Tofu ferme — 200 g
  - Épinards frais — 80 g — quantité fixe
  - Beurre de cacahuète — 18 g
- **Préparation** :
  1. Cuire le quinoa.
  2. Poêler le tofu, lier à la sauce curry-cacahuète, ajouter épinards.
- **Pourquoi** : Vegan & sans gluten : ancre tofu généreuse, sauce satay énergétique.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep149 — Patate douce – haricots noirs – PST – avocat

- **Type** : Repas · **Préparation** : 28 min
- **Objectif** : maintien, prise de masse · **Sport** : combats
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 645 kcal · 36 g protéines · 79 g glucides · 15 g lipides
- **Ingrédients** :
  - Patate douce — 180 g *(pesé cru)*
  - Haricots noirs — 60 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 35 g *(pesé sec)*
  - Maïs — 50 g — quantité fixe
  - Avocat — 60 g
- **Préparation** :
  1. Rôtir la patate douce.
  2. Mijoter haricots noirs + PST façon chili, dresser avec maïs et avocat.
- **Pourquoi** : Vegan combats & sans gluten : protéines complètes, très haute capacité.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep150 — Riz – tempeh – légumes wok – coco

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : endurance
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 667 kcal · 34 g protéines · 78 g glucides · 20 g lipides
- **Ingrédients** :
  - Riz complet — 80 g *(pesé sec)*
  - Tempeh — 160 g
  - Mélange wok (poivron/brocoli/carotte) — 120 g — quantité fixe
  - Lait de coco — 50 ml
- **Préparation** :
  1. Cuire le riz.
  2. Sauter le tempeh et les légumes, lier au lait de coco.
- **Pourquoi** : Vegan & sans gluten : tempeh fermenté très protéiné, sauté complet.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep151 — Polenta – ragoût haricots blancs – PST

- **Type** : Repas · **Préparation** : 30 min
- **Objectif** : maintien, prise de masse · **Sport** : combats · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 658 kcal · 39 g protéines · 95 g glucides · 11 g lipides
- **Ingrédients** :
  - Polenta — 70 g *(pesé sec)*
  - Haricots blancs — 70 g *(pesé sec)*
  - Protéine de soja texturée (PST) — 30 g *(pesé sec)*
  - Tomate concassée — 100 g — quantité fixe
  - Huile d'olive — 8 g
- **Préparation** :
  1. Cuire la polenta crémeuse.
  2. Mijoter haricots blancs + PST avec tomate et romarin, dresser sur la polenta.
- **Pourquoi** : Vegan combats & sans gluten : ragoût rustique, capacité protéique élevée.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

### rep152 — Sarrasin – tofu grillé – champignons – levure

- **Type** : Repas · **Préparation** : 22 min
- **Objectif** : maintien, prise de masse · **Sport** : muscu · adaptée jour de repos
- **Régimes compatibles** : végétarien, pescétarien, sans porc, sans lactose, sans gluten, végétalien, halal
- **Macros / portion (base)** : 705 kcal · 44 g protéines · 64 g glucides · 29 g lipides
- **Ingrédients** :
  - Sarrasin — 80 g *(pesé sec)*
  - Tofu ferme — 200 g
  - Champignons — 100 g — quantité fixe
  - Huile d'olive — 8 g
  - Levure maltée — 8 g — quantité fixe
- **Préparation** :
  1. Cuire le sarrasin.
  2. Griller le tofu, poêler les champignons, parsemer de levure maltée.
- **Pourquoi** : Vegan & sans gluten : umami du tofu + champignons, ancre protéique haute.
- **Validée** : ☐ Oui  ☐ Non  ·  **Remarques** : _________________________________

