# Restes de paquets : le plan suivant les cuisine (« niveau 2 ») — mesure

> Demandé par le fondateur le 2026-10-23 (« go 3 ») : le chantier moteur décidé le 2026-10-21
> pour APRÈS la 62ᵉ OTA. **Statut : mesuré, prototype sur la branche `claude/restes-niveau-2`,
> en attente d'arbitrage. Rien n'est fusionné.**

## La question

Une fois les courses terminées, la semaine suivante est tirée sans regarder la réserve
(`lib/semaineSuivante.ts::preparer`). Sa liste déduit les restes, mais seulement quand le hasard
a mis le bon aliment au menu. Le plan suivant devrait-il **choisir** ses recettes avec ce qui
reste des paquets (les 120 g de poulet en trop) ?

## Comment c'est mesuré

`npx tsx scripts/mesure-restes.ts` (`--balayage` pour les réglages). 4 gabarits × 5 régimes ×
3 formes de plan × 2 tirages, 5 semaines d'affilée, comme dans l'app : liste = besoin − réserve
(seuil par aliment), achat au format vendu, tous les repas cuisinés. Soit 480 semaines.

- **Périssable** = rangé au frais, hors surgelés (edamame, fruits rouges, mélange wok, petits
  pois) et hors pièces.
- **Jeté** = un reste que la semaine suivante ne reprend pas **avant qu'il ait tourné**.
  ⚠️ HYPOTHÈSE de mesure, prudente, pas une règle d'hygiène : le reste a été acheté au début de la
  semaine qui s'achève, donc il tient 1 jour de plus pour la viande et le poisson (similis
  compris), 3 pour le tofu, le tempeh et le seitan, 4 pour les fruits et légumes, 7 pour les
  laitages et les œufs.
- Qualité : comptée comme dans `scripts/mesure-variete.ts`. Ce sont les drapeaux (repas mal
  calibrés), l'écart au jour et les quasi-doublons (deux recettes de la même famille dans la semaine).

## Résultats

| Réglage | Jeté / semaine | Drapeaux / 9 600 repas | Écart au jour | Semaines avec quasi-doublon |
|---|---|---|---|---|
| **Aujourd'hui** (la semaine suivante ignore les restes) | **1 232 g** (30 % du périssable acheté) | 11 | 0,57 % | 3 % |
| Niveau 2 tel que décidé : les 2 premiers jours visent les restes | 1 106 g (−10 %) | 13 | 0,55 % | 7 % |
| Toute la semaine vise les restes | 976 g (−21 %) | 2 | 0,52 % | 11 % |
| + la semaine finit aussi les paquets qu'elle ouvre | 890 g (−28 %) | 1 | 0,47 % | 15 % |
| **Retenu au prototype** : toute la semaine, **chaque reste tant qu'il tient**, **famille neuve seulement** | **924 g (−25 %)** | **4** | **0,55 %** | **4 %** |
| Idem + finir les paquets ouverts (durée de vie comprise) | 929 g | 4 | 0,51 % | 4 % |

Ce que ça dit :

1. **Le besoin est réel** : environ 1,9 kg de périssable reste en fin de semaine, et environ
   1,2 kg finit jeté. C'est 30 % du frais acheté sur la liste de Kyroz.
2. **Le niveau 2 « deux premiers jours » ne fait que −10 %.** Les gros restes (chou-fleur
   entier, botte d'asperges, barquette de raisin, sachet de haricots verts) dépassent ce que
   deux jours absorbent.
3. **La viande ne se sauve presque pas** (302 → 266 g). En fin de semaine, son reste a déjà une
   semaine. Viser la viande restante après le premier jour fabriquait même un danger :
   au prototype, de la bavette revenait samedi et dimanche, et la liste de courses aurait
   compté sur ce vieux reste. D'où la durée de vie DANS le moteur.
4. **Finir les paquets dans la semaine n'apporte rien** une fois la durée de vie respectée
   (929 contre 924 g). Cela changerait en plus tous les plans, y compris en cours. Écarté.
5. **« Famille neuve seulement »** (la règle des parts de protéines) ramène les quasi-doublons
   au niveau d'aujourd'hui. Sans elle, ils montaient à 11-19 % des semaines.

## Ce que le prototype fait (branche `claude/restes-niveau-2`)

`lib/planEngine.ts` :
- `buildLocalPlan(…, restes)` reçoit les restes (grammes par aliment).
- Pour chaque repas, la sélection garde de préférence un plat qui en reprend un. Il doit rester
  PROPRE, s'ajuster presque aussi bien que le meilleur (même tolérance que les parts de
  protéines), être d'une famille pas encore servie et passer après toutes les règles de l'assiette.
- S'il n'y en a aucun, rien ne change.
- Chaque plat servi puise dans les restes.

Sans restes, le moteur est **identique** à `main` : 48 plans sur 48 comparés au bit près, et la
suite est verte. Donc **pas de hausse d'`ENGINE_VERSION`** : aucun plan en cours ne se re-tire.
Seules les semaines préparées après la livraison changent.

⚠️ Le prototype porte encore la piste écartée (paquets ouverts, `paquet`, `ouvertJours`) et des
réglages en objet mutable (`RESTES`) pour le balayage. À retirer et figer à la reprise.

## À trancher par le fondateur

1. **Retenir le réglage du prototype** : toute la semaine suivante, chaque reste tant qu'il
   tient, famille neuve seulement. Effet : −25 % de frais jeté, sans perte de précision ni de
   variété. Rien n'est affiché : l'app tourne en silence.
2. **La durée de vie** : la garder par famille (viande et poisson 1 j, tofu 3, fruits et
   légumes 4, laitages et œufs 7) ou la sourcer aliment par aliment, comme le rangement de la
   réserve.

## Reste à faire si c'est retenu

- Brancher : à « Courses terminées », restes = réserve − repas qu'il reste à cuisiner cette
  semaine (le calcul que fait déjà l'écran Courses), périssable seulement. Ils passent à
  `preparer`, et à `aligner` quand il re-tire.
- Retirer la piste écartée, figer les réglages, tests vérifiés par mutation.
- Lire de vraies semaines à l'écran, puis livrer dans une OTA.

## Vu en passant, hors de ce chantier (constats, pas des demandes)

- **La réserve ne connaît pas la péremption.** Un reste de viande vieux de dix jours y figure
  toujours, et la liste de courses le déduit du besoin. Le glissement pour retirer (point 7)
  laisse la personne le jeter à la main.
- **Le reste du gâchis est surtout du format** : chou-fleur entier (600 g), asperges en botte,
  raisin en barquette, haricots verts en sachet de 500 g. Mesuré : si le chou-fleur et les
  haricots verts s'achetaient surgelés, le jeté baisserait encore d'environ 200 g par semaine.
