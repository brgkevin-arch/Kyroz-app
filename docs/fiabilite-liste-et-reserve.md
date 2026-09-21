# Liste de courses et réserve : comment aller « au gramme près »

Analyse du 21 septembre 2026. Rien n'est décidé ici.

## Le constat de départ

La réserve d'aujourd'hui n'est pas un inventaire : c'est une **prévision déguisée
en inventaire**. Elle ne contient jamais ce que l'utilisateur a acheté, seulement
ce que le plan avait calculé qu'il lui fallait.

Un seul chiffre circule d'un bout à l'autre — **le besoin** :

```
plan → besoin (320 g de riz) → liste de courses (320 g)
     → clôture des courses → réserve (320 g)   ← l'achat réel n'entre jamais
     → repas mangé → réserve (320 − 320 = 0)
```

L'utilisateur, lui, a acheté un **paquet de 1 kg**. Il lui reste 680 g de riz que
Kyroz ne voit pas, et qu'il va racheter la semaine suivante.

Tant que le nombre qui entre dans la réserve est le besoin et non l'achat,
aucune précision au gramme n'est possible : on compte juste, sur le mauvais chiffre.

**Ce n'est pas une découverte : le code le dit déjà.** `lib/shoppingHistory.ts:23`
porte l'avertissement en rouge — « ce qui est archivé est ce que la liste
demandait, pas ce qui est passé en caisse » — et l'écran d'historique l'affiche en
toutes lettres à l'utilisateur (`components/ShoppingHistory.tsx:119`). Le trou est
connu, documenté, assumé. Ce document dit comment le fermer.

---

## Les huit fuites, de la plus grosse à la plus fine

| # | La fuite | Où | Ce que l'utilisateur voit |
| --- | --- | --- | --- |
| F1 | La clôture des courses verse dans la réserve **la quantité de la liste**, pas celle du paquet | `app/(tabs)/courses.tsx:308` | Sa réserve annonce 320 g, son placard en contient 1 kg |
| F2 | Le **conditionnement n'existe pas** dans le modèle : ni format vendu, ni reste | `lib/types.ts` | La liste demande « 320 g de riz », le magasin vend 500 g et 1 kg |
| F3 | Le **poids d'une pièce** n'est connu que pour 4 aliments (œuf, banane, tortilla, avocat) | `lib/units.ts:46` | Un stock en pièces hors de ces 4 est jugé « incomparable » — et compté comme **couvert** (`have++`) : une recette est annoncée réalisable sans qu'on sache si elle l'est |
| F4 | La déduction après repas **ignore l'unité** : `unit` est reçu en paramètre et jamais lu | `lib/pantry.ts:281` | 3 bananes en stock, un repas en consomme 120 g → 3 − 120 = −117 → **les 3 bananes disparaissent** |
| F5 | Un **déficit est effacé** au lieu d'être noté : reste ≤ 1 → la ligne est supprimée | `lib/pantry.ts:290` | Il avait 200 g pour un besoin de 500 g ; après le repas la réserve dit « rien », jamais « il t'en manquait 300 » |
| F6 | Les **condiments sont hors du système** (sel, huile, citron, épices, miel, vinaigre…) | `lib/pantry.ts:84` | Choix assumé, mais « au gramme près » ne les concernera jamais |
| F7 | **Rien ne sort sans un repas** : pas de geste « j'ai jeté », « j'ai mangé dehors », « c'était périmé » | — | La réserve dérive silencieusement vers le trop-plein |
| F8 | **Cru ou cuit** n'est pas un état : 100 g de riz sec pèsent ~250 g une fois cuits | — | Le riz d'hier au frigo et le paquet sec sont le même aliment pour Kyroz |

À quoi s'ajoute une tolérance assumée : une recette est déclarée réalisable dès
**95 %** du besoin (`TOLERANCE_COUVERTURE`, `lib/pantry.ts:335`) — soit 25 g d'écart
admis sur 500 g.

**F4 est un défaut pur** : il se corrige seul, sans rien décider du reste.
**F5 est aussi un défaut** — l'information du manque est perdue — mais le corriger
oblige à décider comment une ligne à 0 s'affiche : il se traite avec M3.

---

## Les six mécanismes qui ferment les fuites

Rangés par rapport résultat / effort.

### M1. Tout compter en grammes ; la pièce n'est qu'un affichage — *ferme F3, F4*

Une seule unité en mémoire (g / ml). « 3 œufs » devient un habillage à l'écran,
plus une unité de stockage. Cela suppose d'étendre le poids unitaire aux
ingrédients du catalogue qui se vendent à la pièce.

C'est une **colonne de données**, pas un moteur : un champ `poids_piece` à côté
du nom. Mesurable (combien d'ingrédients du catalogue en ont un), testable,
et livrable en OTA.

### M2. Enregistrer l'achat, pas le besoin — *ferme F1, F2*

Deux chiffres au lieu d'un : **ce qu'il faut** (le plan) et **ce qui rentre**
(le paquet). À la clôture des courses, Kyroz propose le format vendu le plus
proche au-dessus du besoin, l'utilisateur confirme ou corrige, et c'est **ce
chiffre-là** qui entre en réserve.

C'est le geste qui change tout : dès la 2ᵉ semaine, le reste du paquet est
soustrait de la liste suivante. Le « 0 gaspillage » commence ici, pas au scan.

**Le rangement existe déjà.** `ShoppingTripItem` (`lib/shoppingHistory.ts`) archive
chaque sortie de courses avec, par article, ce qui a été coché. Il lui manque un
seul champ — la quantité **réellement prise** — et c'est exactement la case que le
ticket de caisse remplirait plus tard tout seul. Stockage local, donc pas de
migration Supabase à jouer.

### M3. Un déficit se note, il ne s'efface pas — *ferme F5*

La ligne descend à 0 et **reste**, avec ce qui a manqué. Un manque répété est le
signal le plus utile du système : c'est lui qui dit que le plan et la vie réelle
ont divergé, et il nourrit directement le « tu suis bien le plan ? » du brouillon.

### M4. Trois gestes de sortie — *ferme F7*

« J'ai jeté », « je n'ai pas mangé ce repas », « c'était périmé ». Trois boutons,
pas un formulaire. Sans eux, la réserve ne peut que surestimer, et un inventaire
qui surestime toujours finit par être ignoré.

### M5. Une réconciliation, une question par semaine — *ferme la dérive résiduelle*

Aucun inventaire domestique ne reste juste tout seul ; les vrais stocks se
recalent par un comptage périodique. Ici : **une** question par semaine, sur
l'aliment le plus incertain — « il te reste du riz ? ». Une touche, et le compteur
redevient vrai.

C'est le mécanisme qui rend tout le reste tolérant à l'erreur : même mal parti,
le système revient à la vérité en une semaine.

### M6. Le ticket de caisse — *automatise M2, ne le remplace pas*

Le scan remplit tout seul ce que M2 demande de confirmer à la main. C'est un
accélérateur, pas une fondation : sans M2, le ticket n'a **aucune case où
déverser ses quantités**. À faire après, pas avant.

---

## La limite à dire honnêtement

« Au gramme près » est atteignable sur **ce qui entre** : le paquet acheté, le
reste du paquet, ce qui a été utilisé selon la recette.

Ça ne l'est pas sur **ce qui est mangé** : épluchures, perte à la cuisson, ce qui
reste au fond de la casserole, la cuillère d'huile jamais pesée. L'écart réel se
compte en dizaines de grammes par repas, et aucun logiciel ne le récupère sans
balance connectée.

Donc la promesse tenable est : **le placard au gramme près, l'assiette à la
poignée près.** C'est déjà ce qui manque aujourd'hui, et c'est ce qui supprime le
rachat inutile.

---

## Ordre suggéré

1. **F4** — défaut pur, correction isolée, aucun arbitrage. (F5 part avec M3.)
2. **M1** — les grammes partout (données + affichage).
3. **M2** — le conditionnement à la clôture des courses. *Le cœur du sujet.*
4. **M3**, puis **M4**.
5. **M5** la réconciliation, **M6** le ticket de caisse.
