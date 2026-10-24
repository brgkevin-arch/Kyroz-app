# Restes de paquets : zéro gâchis ? — mesure (« niveau 2 » et au-delà)

> Demandé par le fondateur le 2026-10-23 (« go 3 ») : le chantier moteur décidé le 2026-10-21
> pour APRÈS la 62ᵉ OTA. Repris le 2026-10-24 : *« je veux que l'user ne jette rien, pas de
> gâchis »*, avec *« une table sourcée et plus précise pour les DLC »*, et *« il congèle ce qu'il
> peut, on ne pourra pas tout sauver »*.
> **Statut : mesuré avec la table sourcée (`docs/2026-10-24-duree-de-vie.md`), branche
> `claude/restes-niveau-2`, en attente d'arbitrage. Rien n'est fusionné ni branché dans l'app.**

## ⚠️ Ce qui a changé depuis la version du 2026-10-23

La veille, la fiche annonçait **−25 % de gâchis** pour « le plan suivant reprend les restes tant
qu'ils tiennent ». Ce chiffre reposait sur des durées de vie **que j'avais posées sans source**
(viande 1 j, légumes 4 j, laitages 7 j), comptées depuis la **fin** de la semaine. Avec la table
sourcée (borne basse des guides), comptée depuis le **jour des courses**, le même réglage fait
**−10 %**. Les chiffres ci-dessous remplacent ceux de la veille.

## Comment c'est mesuré

`npx tsx scripts/mesure-restes.ts`. 4 gabarits × 5 régimes × 3 formes de plan × 2 tirages ;
5 semaines d'affilée, mesurées sur les 4 dernières : 480 semaines. Le circuit est celui de l'app,
daté jour par jour :
- courses la veille du premier jour : liste = besoin − réserve, seuil par aliment, format vendu ;
- tous les repas cuisinés ;
- chaque reste repris seulement les jours où il tient encore (`lib/dureeDeVie.ts`) ;
- le reste part au congélateur s'il se congèle, sinon à la poubelle.

Le périssable compté est ce que la table connaît : hors surgelés et hors pièces.

## Résultats (par semaine)

| | Restes de la semaine d'avant | Repris à temps | À congeler | **Jeté** | Cuisiné après sa durée de vie |
|---|---|---|---|---|---|
| **Aujourd'hui** | 1 736 g | 6 % | 1 274 g | **365 g** (8 % du frais acheté) | 758 g |
| Niveau 2 : la semaine suivante reprend les restes tant qu'ils tiennent | 1 731 g | 10 % | 1 228 g | **329 g** (−10 %) | 741 g |
| Prototype : la semaine finit aussi les paquets qu'elle entame | 1 553 g | 6 % | 1 134 g | 330 g | 692 g |
| Les deux | 1 570 g | 8 % | 1 128 g | 316 g (−13 %) | 701 g |
| Si brocoli, chou-fleur, haricots verts et épinards s'achetaient surgelés (moteur actuel) | 1 394 g | 7 % | **932 g** (−27 %) | 365 g | 599 g |

Qualité du plan : aucune perte. Drapeaux 11 → 3 à 6 sur 9 600 repas, écart au jour 0,55 à 0,58 %,
semaines avec un quasi-doublon 3 → 3 à 4 %.

## Ce que ça dit

1. **Les restes d'une semaine n'ont plus l'âge d'être repris la suivante.** Le jour 1 du plan
   suivant, ils ont 8 jours. Or le poulet, le poisson et le haché tiennent 1 jour, le brocoli et
   le chou-fleur 3, le skyr 7. Seuls 6 % sont encore bons. Le niveau 2 ne sauve presque rien :
   −36 g jetés par semaine.
2. **Finir les paquets dans la semaine n'aide pas davantage.** Les gros restes viennent de ce
   qu'on ACHÈTE : un chou-fleur entier de 600 g, une barquette de raisin de 500 g, une botte
   d'asperges, un concombre et une salade entiers, un pot de yaourt soja de 400 g. Peu de
   recettes de la semaine les absorbent. Le prototype est retiré du moteur.
3. **Le gâchis réel se répartit ainsi :**
   - ~1,2 kg par semaine **à congeler** (chou-fleur, raisins, asperges, haricots verts, skyr,
     fromage blanc, porc…). C'est la part de l'utilisateur, mais l'app n'en dit rien aujourd'hui.
   - ~365 g **jetés** parce qu'ils ne se congèlent pas : concombre, salade, roquette, yaourt soja.
4. **~750 g par semaine sont prévus au menu APRÈS leur durée de vie.** C'est le poulet, le
   haché, le brocoli, les épinards du vendredi, achetés le dimanche. 84 % se congèlent : c'est à
   congeler **dès les courses**. L'app ne le dit pas non plus.
5. **Le levier le plus fort mesuré est l'ACHAT.** Les quatre légumes courants en surgelé
   retirent 27 % de ce qu'il faut congeler, et 21 % de ce qui serait cuisiné trop tard.

## À trancher par le fondateur

1. **Valider la table des durées de vie** (`docs/2026-10-24-duree-de-vie.md`), en particulier le
   défaut non sourcé de 7 jours pour les similis fermés.
2. **Le niveau 2** : le brancher pour −10 % (gain faible, sans coût mesuré), ou le laisser.
3. **Le prochain levier**, parmi ceux mesurés ou repérés :
   - l'achat : surgelé quand ça existe, ou des formats plus petits ;
   - ce qui ne se congèle pas : des recettes qui finissent le concombre, la salade, le pot ;
   - **dire quoi congeler, et quand**, à « Courses terminées » : à rebours de « l'app tourne en
     silence », donc à sa décision.

## Ce qui est sur la branche

- `lib/dureeDeVie.ts` : la table, 57 aliments, 13 sources. Garde-fou `dureeDeVie.test.ts`,
  vérifié par 3 mutations (3 rouges).
- `lib/planEngine.ts` : `buildLocalPlan(…, restes)`. Sans restes, le moteur est **identique** à
  `main` : aucun plan en cours ne se re-tirerait.
- `lib/restesSemaine.ts` : ce que la semaine suivante doit reprendre, et jusqu'à quel jour.
  **Non branché** dans l'app (`planSuivant.ts`).
- `scripts/mesure-restes.ts` (la mesure) et `scripts/gen-duree-de-vie.ts` (la fiche).

## Vu en passant (constats, pas des demandes)

- **La réserve ne connaît pas la péremption.** Un reste de viande de dix jours y figure toujours,
  et la liste de courses le déduit du besoin. Avec la table, l'app pourrait savoir qu'il a tourné.
