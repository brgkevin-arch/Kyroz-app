# Drive et livraison (Leclerc, Carrefour…) : par où ça passe

Recherche du 21 septembre 2026. Rien n'est décidé ici.

## Ce que fait Jow, et pourquoi ce n'est pas une question technique

Jow remplit le panier Carrefour de l'utilisateur, dans **plus de 1 900 magasins**,
en drive comme en livraison. Ce n'est pas une API publique qu'ils ont trouvée :
c'est un **accord commercial signé**, au point que Carrefour lui consacre une page
sur son propre site (`carrefour.fr/services/jow`).

Le chiffre qui explique l'accord : à la création automatique du panier,
**près de 90 % des produits sont conservés** par le client. C'est ce que
l'enseigne achète — un panier pré-qualifié, pas une intégration.

Côté Leclerc, il n'existe **aucune API développeur publique**. L'accès se négocie
ou n'existe pas.

**Conséquence : la question n'est pas « comment m'y brancher », c'est « qu'est-ce
que j'apporte à l'enseigne, et quand ».**

---

## Les cinq marches, de demain à « il faut du volume »

### Marche 0 — La liste part avec l'utilisateur *(aucun partenaire, OTA)*

Kyroz produit la liste, l'utilisateur l'emporte où il veut : partage, Notes,
presse-papier. C'est déjà la case « partager sa liste » du brouillon.

Zéro dépendance, zéro négociation, zéro risque. C'est le socle : **tout le reste
est une accélération de ce geste, jamais son remplacement.**

### Marche 1 — Le lien profond vers le drive *(aucun partenaire, OTA)*

Kyroz ouvre le drive de l'enseigne choisie, liste en main, prête à coller dans
leur saisie rapide. L'appariement est fait par **leur** moteur, pas le nôtre.

À vérifier enseigne par enseigne : toutes n'ont pas de saisie rapide, et le
format accepté (noms ? codes EAN ?) change de l'une à l'autre.

### Marche 2 — Acheter les données catalogue à un tiers *(payant, risqué)*

Des revendeurs de données (ex. Pepesto) fournissent nom, prix, promo, prix au
kilo et images pour certaines enseignes — **Carrefour France en service, Leclerc
seulement « à l'étude »**. Cela permettrait d'afficher le coût réel d'une semaine
de plan.

🔴 **Deux réserves lourdes.** Ce sont des données **catalogue seulement** : aucun
ajout au panier, donc ça ne fait pas le drive. Et elles sont récoltées sur les
sites publics des enseignes, sans accord de leur part — bâtir une promesse
produit là-dessus, c'est dépendre d'un flux qui peut s'arrêter du jour au
lendemain, et se présenter en mauvaise posture le jour où on va négocier
la marche 4.

### Marche 3 — Passer par un intermédiaire « recette → panier » *(contrat B2B)*

Des sociétés comme **Northfork** font exactement ce métier : transformer une
recette en panier chez un distributeur, avec leurs propres accords enseignes
(Walmart, Coles…). Kyroz s'y brancherait comme « éditeur de recettes ».

C'est la voie honnête et rapide — **à une condition : que l'enseigne visée soit
déjà leur cliente en France.** C'est la première question à leur poser, avant
même les tarifs. Contrat B2B, donc engagement et coût fixe.

#### À quoi ça ressemblerait dans Kyroz

1. Le plan de la semaine est prêt → bouton **« Commander au drive »**.
2. Kyroz envoie la liste (ingrédients + quantités) et le magasin choisi.
3. Northfork **apparie chaque ingrédient à un produit réel de ce magasin** et
   renvoie un panier : formats vendus, prix, et ce qu'il n'a pas su apparier.
4. Kyroz affiche le panier pour relecture — prix de la semaine, substitutions,
   manquants.
5. Une touche : le panier s'ouvre **déjà rempli** chez l'enseigne, le paiement se
   fait chez eux.

Ils annoncent une « précision d'appariement de 99 % » (chiffre de vendeur, à
éprouver) et citent l'app **Tasty** (BuzzFeed) — donc une application mobile,
pas seulement un site web. Les briques s'appellent *Recipe Shopping Foundation*,
*Smart Cart*, *Shoppable Links*. Aucun tarif public : « book a demo ».

#### Le gain caché : la réserve se remplit juste, toute seule

Le panier qui revient dit **ce qui est réellement acheté, dans son format** —
le paquet de 1 kg, pas les 320 g du besoin. C'est exactement le chiffre qui
manque à la réserve (`M2`), servi gratuitement par le parcours de commande.

Autrement dit : pour qui commande au drive, **le scan du ticket de caisse
devient inutile.** Il ne sert plus qu'à ceux qui vont en magasin.

#### Les trois réserves

- **La France.** Inconnue, et c'est tout le sujet. Aucun de leurs cas publiés
  n'est français.
- **La dépendance.** Le panier meurt avec le contrat, et la qualité de
  l'appariement n'est pas entre nos mains — alors que la promesse de justesse,
  elle, est la nôtre. D'où la relecture avant envoi, jamais un panier envoyé à
  l'aveugle.
- **⚠️ Ils vendent aussi un *Meal Planner*.** Le partenaire est, en amont, un
  concurrent possible. On leur prend le panier, pas le cerveau.

### Marche 4 — L'accord direct avec l'enseigne *(ce que Jow a fait)*

L'enseigne ouvre son panier à qui lui amène des paniers. C'est un problème de
poule et d'œuf : **il faut le volume avant d'avoir l'accès**, pas l'inverse.

L'argument de Kyroz le jour venu n'est pas « j'ai une app » mais : *un plan de
repas, c'est une semaine complète de courses, panier haut, récurrent, et
l'utilisateur ne retire presque rien.* C'est un argument qui se fait avec des
chiffres, pas avec une démo.

---

## Le mur qu'aucune marche ne contourne

La liste de Kyroz dit **« 320 g de riz »**. Un drive vend **« Riz basmati 1 kg,
référence 12345 »**.

Tant qu'il n'existe pas, dans Kyroz, une table qui dit *cet ingrédient = ce
produit vendu, dans ce format*, aucun panier ne peut se remplir — que le pont
soit un lien, un intermédiaire ou un accord signé.

Et c'est exactement le même chaînon manquant que :

- le **conditionnement** (`M2` de `fiabilite-liste-et-reserve.md`) : acheter un
  paquet de 1 kg pour 320 g de besoin ;
- le **ticket de caisse** : traduire « PDT CHARL 1KG » en ingrédient du catalogue.

**Trois chantiers, une seule brique.** Elle est interne, sans partenaire, sans
dépendance, et elle rend les trois moins chers. C'est par là qu'on commence,
quelle que soit la marche visée ensuite.

---

## Les autres acteurs, et l'état de la case « France »

*Recherche du 21 septembre 2026.*

### Catégorie A — « recette → panier », le métier de Northfork

Huit fournisseurs existent sur ce marché : **Adimo, Chicory, Samsung Food
(ex-Whisk), Pear Commerce, Northfork, SmartCommerce (Click2Cart), Destini,
SideChef**.

| Acteur | Couverture revendiquée |
| --- | --- |
| Northfork | Walmart, Sainsbury's (RU), Coop (Suède), Coles (Australie) |
| Samsung Food (ex-Whisk) | 32 enseignes — États-Unis, Royaume-Uni, Allemagne |
| Chicory | 60 à 70 enseignes, **États-Unis uniquement** |
| Pear Commerce, SmartCommerce | États-Unis |
| Destini | États-Unis, Canada, Royaume-Uni |
| SideChef | États-Unis, Allemagne, Royaume-Uni |
| Adimo | « 70 pays », Europe incluse — la seule revendication large |

🔴 **Aucun ne revendique explicitement la France.** La case est vide.

C'est l'explication la plus probable du chemin de Jow : il n'a pas choisi de
négocier en direct, **il n'avait personne à qui s'adresser.**

⚠️ Ce tableau vient d'un comparatif publié par **SideChef, qui est lui-même un
concurrent** : ses affirmations sur les autres sont indicatives, pas des preuves.
Le seul contrôle qui vaut est de poser la question à chacun. Northfork reste le
mieux placé pour la poser en premier : c'est le seul avec deux enseignes
européennes au compteur.

### Catégorie B — « où acheter », vendu aux marques

Une autre famille touche **déjà les drives français aujourd'hui** : les widgets
« ajouter au panier » que les marques agroalimentaires posent sur leurs pubs.

**MikMak** annonce plus de 1 500 enseignes intégrées, Carrefour compris — et ses
propres chiffres France montrent la répartition des clics : **Carrefour 19,6 %,
Intermarché 17,7 %, E. Leclerc Drive 9,4 %**. Le tuyau vers le drive français
existe donc, et il fonctionne.

Mais leur client est **la marque**, pas l'application ; leur unité est **un
produit** mis en avant, pas une liste de trente lignes ; et leur revenu est un
budget publicitaire.

🔴 **Verdict : ce n'est pas un fournisseur pour Kyroz, et l'e-mail ne vaut pas la
peine.** La raison n'est pas le modèle économique, c'est le **catalogue** : MikMak
ne porte que des produits **de marque**, ceux de ses clients. Or une liste Kyroz
est faite de brocolis, de blancs de poulet, de riz en vrac — du générique et du
frais, exactement ce qu'aucune marque ne paie pour pousser. Les deux tiers de la
liste n'auraient aucun bouton.

**Ce que MikMak apporte quand même, c'est du renseignement, pas de la plomberie :**

1. **La preuve que le tuyau existe.** Ajouter au panier d'un drive français
   depuis une application tierce se fait déjà, tous les jours. Demander cet accès
   n'est donc pas demander l'impossible — c'est une question de conditions.
2. **Où frapper en premier.** Leclerc domine le marché français, mais ne prend
   que 9,4 % de ces clics, contre 19,6 % à Carrefour. Hypothèse à vérifier, mais
   elle suggère que le drive le plus ouvert au panier venu de l'extérieur est
   **Carrefour** — celui-là même qui a signé avec Jow.

### Catégorie C — les données seules

Rien à voir avec le panier, mais utile à la brique interne : **Open Food Facts**
est une base française, ouverte et gratuite, qui relie un **code-barres** à un
produit, sa marque et son **poids d'emballage**.

C'est précisément la matière du chaînon manquant — *cet ingrédient = ce produit
vendu, dans ce format* — sans partenaire, sans contrat et sans données grattées.
À évaluer sérieusement avant de payer qui que ce soit.

### Ce que ça change

La marche 3 est **plus étroite** que je l'ai écrite plus haut : ce n'est pas
« choisir un intermédiaire », c'est « vérifier s'il en existe un seul qui couvre
la France ». Tant que la réponse n'est pas venue, le seul travail qui avance
vraiment reste le même : les marches 0 et 1, et la brique
*ingrédient ↔ produit vendu*.

---

## Deux points à savoir avant d'y aller

**App Store : c'est autorisé.** Des courses livrées sont un bien physique
consommé hors de l'app — l'achat intégré Apple **n'est pas exigé** et ne
s'applique pas. Le drive n'est donc pas une menace sur la fiche.

**Le modèle : la commission.** L'affiliation Carrefour est passée en exclusivité
chez **Kwanko** (juin 2025). ⚠️ À vérifier avant de compter dessus : les
programmes d'affiliation des enseignes portent souvent sur le **non-alimentaire**,
pas sur les courses du quotidien.

---

## Le faire soi-même : un « Northfork français »

### Ce que ça coûte n'est pas un montant, c'est un métier

| Le morceau | Ce qu'il exige | Ça s'arrête quand ? |
| --- | --- | --- |
| Le catalogue | Pas *un* catalogue : **un par magasin**. Leclerc est une coopérative — chaque drive a ses références et ses prix ; Carrefour compte ~1 900 points | Jamais : promos, ruptures, références qui changent chaque semaine |
| L'accès aux données | Aucune API publique. Donc gratter les sites (CGU, risque juridique) ou acheter à un revendeur (Carrefour seulement, Leclerc « à l'étude ») | Jamais |
| Le moteur d'appariement | Aller de 70 % à 95 % de justesse **est** le travail ; ça se mesure avec un jeu de test étiqueté à la main | Une fois, puis dérive avec le catalogue |
| Le dépôt du panier | **Rien.** Sans accord, on ne dépose pas un panier chez eux | — |

🔴 **La dernière ligne annule les trois autres.** Northfork ne vend pas un moteur,
il vend un **accès signé**. Le moteur est la moitié qu'on peut construire ;
l'accès est celle qu'on ne peut pas. Un catalogue parfait mène exactement au mur
de départ — sauf qu'entre-temps on a gratté les sites de ceux avec qui on voulait
négocier.

Et l'économie ne tient pas : Northfork amortit ce coût sur plusieurs éditeurs et
plusieurs enseignes. Kyroz l'amortirait sur une app. Même tapis roulant, divisé
par un.

### Le Northfork dont Kyroz a réellement besoin : 139 lignes

Le catalogue de Kyroz compte **139 ingrédients de référence** pour **559 recettes**
(`Recette/recettes-kyroz.json`). C'est ça, la vraie taille du problème.

Il n'y a pas besoin de la référence interne d'un magasin pour aider quelqu'un à
faire ses courses. Il faut **le format vendu** : *le riz se vend en 500 g et en
1 kg ; les œufs par 6 ou 12 ; le poulet en barquette de ~400 g.* C'est générique,
ça ne dépend d'aucune enseigne, et **ça bouge tous les trois ans, pas toutes les
semaines.**

139 lignes écrites une fois. Ce que ça débloque :

- le **conditionnement** (`M2`) → la réserve devient juste ;
- le **dictionnaire du ticket de caisse** ;
- une liste lisible en magasin : « 1 paquet de 1 kg » au lieu de « 320 g » ;
- le socle de la négociation future : le jour où un accès s'ouvre, tout est prêt.

**Ce que ces 139 lignes ne donnent pas**, et qu'il faut dire : ni les prix, ni la
référence interne d'un magasin, ni le panier déposé. Elles ne remplacent pas
Northfork — elles rendent Kyroz juste, et prêt.

---

## Ce que je recommanderais

1. **Marche 0 maintenant** — la liste partageable, c'est de l'OTA et ça sert tout le monde.
2. **La brique ingrédient ↔ produit vendu** — le seul travail qui compte, et il est interne.
3. **Un appel à Northfork** (et à lui seul — voir le verdict MikMak) — une question, pas un projet : « Carrefour ou Leclerc sont-ils vos clients en France ? » La réponse ouvre ou ferme la marche 3 pour le prix d'un e-mail.
4. **Ne pas bâtir sur des données grattées** tant que l'accord n'est pas là.
5. **La marche 4 ne se prépare pas, elle se mérite** : elle arrive avec les chiffres d'usage.

## Sources

- [Jow x Carrefour — page officielle Carrefour](https://www.carrefour.fr/services/jow)
- [Northfork — solutions éditeurs de recettes](https://northfork.ai/solutions/publishers)
- [Pepesto — couverture Leclerc / France](https://www.pepesto.com/supermarkets/leclerc/)
- [Kwanko — programme d'affiliation Carrefour en exclusivité](https://www.kwanko.com/fr/academy/affiliation/le-programme-daffiliation-carrefour-en-exclusivite-chez-kwanko/)
- [SideChef — comparatif des 8 fournisseurs « shoppable recipe »](https://www.sidechef.com/business/recipe-platform/shoppable-recipe-button-comparison) *(source concurrente)*
- [Samsung Food (ex-Whisk) — enseignes intégrées](https://support.samsungfood.com/hc/en-us/articles/360042706091-Integrated-Stores)
- [MikMak — réseau de 1 500+ enseignes](https://www.retailitinsights.com/doc/mikmak-launches-retail-network-unified-consumer-shopping-journey-retailers-0001)
- [MikMak — repères France (Carrefour, Intermarché, Leclerc Drive)](https://www.mikmak.com/commerce-marketing-benchmarks/food-beverage)
