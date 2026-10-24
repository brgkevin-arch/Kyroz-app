# Restes de paquets : zéro gâchis ? — mesure (« niveau 2 » et au-delà)

> Demandé par le fondateur le 2026-10-23 (« go 3 ») : le chantier moteur décidé le 2026-10-21
> pour APRÈS la 62ᵉ OTA. Repris le 2026-10-24 : *« je veux que l'user ne jette rien, pas de
> gâchis »*, avec *« une table sourcée et plus précise pour les DLC »*, et *« il congèle ce qu'il
> peut, on ne pourra pas tout sauver »*.
> **Statut (2026-10-24, après-midi) : codé et branché sur la branche `claude/restes-niveau-2`,
> suite verte (2 937 / 206). Pas fusionné, pas publié. La table des durées de vie est à valider.**

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

## 2026-10-24, après-midi : ce que le fondateur a tranché, et ce qui est codé

> *« Tant que le moteur fait partir en priorité ce qu'il reste du plan de la veille, c'est déjà très
> bien. Il faudrait que le moteur soit diversifié oui, mais optimisé pour finir la semaine avec le
> moins de restes possible, et se rattraper sur la semaine d'après pour le peu qui va rester. Pas
> refaire les mêmes plats, mais la base doit être avec les choses qui vont être hors DLC en prio.
> On ne dit pas quoi congeler. »*

Codé sur la branche (`lib/planEngine.ts`, `lib/restesSemaine.ts`, `lib/planSuivant.ts`) :
1. **Le moteur suit ce qu'il y a à finir.** Ce sont les restes de la semaine d'avant, et le reste
   de chaque paquet que la semaine entame, chacun jusqu'au jour où il tient. À chaque repas, un
   **bonus** va aux plats qui finissent le plus de ce qui tourne le plus tôt.
2. **La semaine tirée, le surplus de chaque paquet de légume** va dans les plats qui s'en servent
   déjà, tant qu'il tient. Il y a deux garde-fous : jamais un paquet de plus, et le plat garde ses
   calories à 15 kcal près. Mesuré : 14 % des repas ont un peu plus de légume (+60 g en médiane,
   +145 g au plus : carottes 80 → 140 g, brocoli 80 → 160 g).
3. **À « Courses terminées », la semaine suivante est tirée avec les restes** de la semaine en
   cours : réserve moins repas restants, chaque aliment jusqu'au jour où il tient.
4. **Rien n'est affiché.** L'app ne dit pas quoi congeler.

| Par semaine (480 semaines) | Avant | Après |
|---|---|---|
| Jeté | 365 g | **327 g (−10 %)** |
| À congeler | 1 274 g | **1 144 g (−10 %)** |
| Drapeaux / 9 600 repas | 11 | 8 |
| Écart au jour | 0,57 % | 0,73 % |
| Semaines avec un quasi-doublon | 3 % | 3 % |
| Frais acheté | 4 322 g | 4 524 g (+5 % : plus de légumes mangés) |

🔴 **Un filtre faisait −26 % de jeté, et il est écarté.** Appliqué en dur, il cassait 7 décisions
déjà prises :
- la part de poulet promise (46 % au lieu de 48) ;
- la part végétale du végétarien ;
- la rotation des petits-déjeuners ;
- les fibres en sèche (25 g au lieu de 32) ;
- un « Régénérer » qui se voit ;
- le réglage « répétitif » ;
- le plancher protéique.

En bonus, le poids retenu (0,0003) est le plus haut où toute la suite reste verte. À 0,0005, le
plancher protéique et les fibres en sèche rougissent.

**Ce que le moteur ne peut pas faire seul** : il n'a pas le choix. Sur 541 recettes, 10 portent du
chou-fleur, 8 du raisin, 12 des asperges. Le gros des restes reste un chou-fleur entier, une
barquette de raisin, une botte d'asperges. Les leviers suivants sont l'achat (surgelé, formats
plus petits) et le catalogue (des recettes qui finissent l'unité).

**Garde-fous** :
- `finirLesPaquets.test.ts` : jamais un paquet de plus, le surplus baisse, un reste fait servir
  l'aliment, et une carte vide ne change rien ;
- `restesSemaine.test.ts` : ce qui tient, la déduction, la borne la plus courte ;
- `dureeDeVie.test.ts`.

Vérifiés par 7 mutations au total, 7 rouges.

**Pas de hausse d'`ENGINE_VERSION`** : aucun plan en cours ne se re-tire, donc ce qui a été acheté
reste ce qu'on cuisine. La logique arrive avec chaque nouveau plan (renouvellement, inscription).

## Vu en passant (constats, pas des demandes)

- **La réserve ne connaît pas la péremption.** Un reste de viande de dix jours y figure toujours,
  et la liste de courses le déduit du besoin. Avec la table, l'app pourrait savoir qu'il a tourné.
