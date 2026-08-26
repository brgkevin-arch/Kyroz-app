# PRODUIT.md — Kyroz, vu par la personne qui l'utilise

> **Ce document est VIVANT.** Il décrit le produit tel qu'il est livré, du point de vue de
> l'usage — pas de l'architecture. Il se lit sans rien connaître de Kyroz, et il est fait
> pour être **collé tel quel** dans une conversation avec un modèle qui n'a pas accès au
> code (brief, fiche store, brainstorm).
>
> 🔴 **DONC IL DOIT ÊTRE VRAI, ET C'EST SA SEULE EXIGENCE.** Un doc qui ment sur le produit
> est pire que pas de doc : chaque brief qui en découle hérite de son erreur. Il remplace
> `docs/2026-08-15-synthese-kyroz-cote-utilisateur.md`, archivé — celui-là était devenu
> faux sur **six** de ses neuf sections en cinq jours, sans que rien ne le signale.
>
> ⚠️ **Le nom de fichier n'a plus de date, à dessein.** Une date invite à le lire comme une
> photo (« c'était vrai le 15 »), alors qu'il sert de référence courante. Les documents
> datés de ce dépôt sont des traces et vivent dans `docs/` ; celui-ci est une référence et
> vit avec `CLAUDE.md` et `METRICS.md`.
>
> **Dernière vérification contre le code : 2026-08-21.** Toute fonction retirée, éteinte ou
> renommée doit passer ici le jour même.

---

## En une phrase

**Kyroz calcule ce que tu dois manger et te sert des assiettes.** Tu ne comptes rien, tu ne
scannes rien, tu ne saisis aucun aliment. Tu dis qui tu es et ce que tu veux ; l'app fait
l'arithmétique.

C'est la différence avec les carnets alimentaires classiques : ceux-là te demandent
d'**enregistrer ce que tu as mangé**. Kyroz te dit **quoi manger**.

---

## 1. L'inscription — sept étapes, une seule fois

| Étape | Ce qu'on demande |
|---|---|
| 1 | Le prénom |
| 2 | Sexe, date de naissance, poids, taille |
| 3 | Morphologie — on choisit sa silhouette dans une planche, pas un chiffre à deviner |
| 4 | **Deux choses, comptées séparément** : à quoi ressemblent tes journées **hors sport**, et tes séances (sport, fréquence, durée) |
| 5 | Objectif : **Sèche · Recomposition · Maintien · Prise de masse propre** |
| 6 | Régime (végétarien, vegan, sans gluten…), protéines préférées, aliments évités, niveau de variété |
| 7 | Quels jours, combien de repas, et à quelles heures |

⚠️ **L'étape 4 exige une réponse sur les journées hors sport, et c'est récent (2026-08-19).**
Avant, la question ne vivait que dans le Profil : le cran le plus prudent (« journées
assises ») était donc servi à presque tout le monde sans avoir été choisi. C'est le réglage
le plus lourd de l'app — **un cran vaut ~79 kcal/jour de dépense**, et du bureau au travail
physique il y a 238 kcal d'écart.

Deux phrases sont dites, discrètement, sous le bouton de la première étape : Kyroz s'adresse
à des adultes en bonne santé, et ça ne remplace pas un médecin.

**Qui est refusé, et comment.** Les moins de 18 ans, complètement — c'est le seul refus sans
issue. Les autres blocages ne ferment **pas l'app, seulement le réglage concerné** : un poids
cible hors de la plage saine, ou plus de 20 h d'entraînement par semaine, demandent une
correction. Et si le poids de départ est sous la plage de référence, la sèche n'est pas
proposée — mais l'app le dit **au moment du choix**, nomme ce qui reste ouvert (« Maintien te
donne un plan complet, sans déficit »), offre le basculement **en un tap**, et renvoie vers
un médecin ou un diététicien-nutritionniste si la situation dure.

**Au bout des sept étapes : un plan de 7 jours, en moins d'une seconde.** Pas de file
d'attente, pas de « votre plan sera prêt dans 24 h ».

---

## 2. Ce que l'app a calculé pendant ce temps

- **La dépense énergétique** : métabolisme de base × vie quotidienne hors sport + dépense
  sportive réelle, séance par séance.
- **La cible calorique** : la dépense, plus ou moins l'écart de l'objectif.
- **Les macros** : protéines (calculées sur la masse maigre), lipides (jamais sous le seuil
  de carence), glucides (le reste).
- **La répartition entre les jours** : un jour d'entraînement vise plus haut, un jour de repos
  plus bas. La semaine garde son total au kcal près.
- **Des garde-fous que rien ne contourne** : aucun plan ne descend sous le plancher
  physiologique, aucun déficit ne dépasse 25 % de la dépense, et après 8 semaines de déficit
  d'affilée la 9ᵉ est servie à la maintenance — sans rien demander à personne.

Ces chiffres sont visibles dans le Profil, et une page « Méthodologie & sources » explique
d'où ils viennent, en lisant les vraies constantes du moteur.

---

## 3. Les cinq écrans

### Plan — celui qu'on ouvre tous les jours

La journée, repas par repas, avec ses macros. Une rangée de jours en haut. Sur chaque repas :

- **« J'ai cuisiné »** — le repas est validé, les ingrédients sortent de la réserve, les
  repas restants se recalent pour tenir la cible du jour.
  ⚠️ **Un repas se coche aussi TOUT SEUL quand son heure est passée** (depuis le
  2026-08-24) : **une heure après le début du repas suivant**, et en fin de journée
  (23 h 59) pour le dernier. Sur les créneaux par défaut, ça donne 14 h · 17 h · 21 h ·
  23 h 59 à quatre repas, et 14 h · 21 h · 23 h 59 à trois. C'est exactement le même
  geste qu'un tap — déduction, macros, recalage — le tutoriel du Plan l'annonce, et il se
  coupe dans Profil → Paramètres des repas. Un repas coché à tort se décoche d'une touche.
- **« Je l'ai sauté »** — le repas ne compte pas, son budget bascule sur les suivants.
  ⚠️ **C'est un fait, pas une faute** : la carte l'écrit sans signe de jugement, le nom du
  plat n'est pas barré, et la série n'est pas cassée. On peut annuler.
- **Changer de recette** — une alternative équivalente en macros, qui **privilégie** les
  recettes qu'on a aimées (👍) sans s'y limiter. Le remplacement vaut pour ce plan-là ;
  pour écarter un plat définitivement, c'est 👎.
- **La fiche** — ingrédients pesés, préparation, temps, et pourquoi ce plat est là.

Plus : la pesée (à la fréquence choisie), la série de jours sous forme d'une petite pastille,
et un suivi d'hydratation **optionnel** (activable dans les réglages).

### Courses

La liste se calcule toute seule : **ce que le plan demande, moins ce que la réserve
contient**, condiments mis à part. On coche en magasin, on clôture, et la sortie part dans
un historique local.

**Et ce que le plan ne sait pas demander s'ajoute à la main** (2026-08-26) : un « + » dans
l'en-tête, au même endroit et de la même forme que celui de la Réserve, pour le café, le
pain, le papier absorbant. La quantité est **facultative** — sans elle la ligne n'affiche
aucun chiffre plutôt qu'un « 0 g », et l'article n'entre pas en réserve une fois acheté :
on ne sait pas combien a été pris. Ces articles-là **survivent au rafraîchissement** (ce
qui vient du plan se refait, ce qui vient de toi ne se refait pas) et ne partent qu'à la
clôture. Un appui long les supprime — et le message le dit, parce qu'eux ne reviennent
pas tout seuls.

⚠️ **Cocher ne range rien — c'est « Courses terminées » qui remplit la réserve** (depuis le
2026-08-24). L'interrupteur « Tenir compte du frigo » a disparu avec ce changement : ce qui
rendait la soustraction risquée n'était pas la soustraction, c'était une réserve créditée à
chaque case cochée dans les rayons et débitée seulement à la cuisine. Elle ne pouvait que
sur-estimer — et un article sur-estimé **disparaît** de la liste sans qu'on le voie.

### Réserve

L'inventaire de ce qu'on a, **séparé en deux : le frais et le sec**. Le rangement est deviné
d'après l'aliment et se corrige d'une touche. Il se remplit à la clôture des courses, se
vide quand un repas est marqué mangé, et la liste de courses le déduit toujours.

⚠️ **« Qu'est-ce que je peux cuisiner maintenant » a déménagé dans Recettes** (2026-08-24),
sous la liste « Réalisable » : c'est une question de recettes, pas d'inventaire.

### Recettes

**Deux listes, choisies par un sélecteur en haut de l'écran** (2026-08-25) :
· **Catalogue** — les **512 recettes** (compté le 2026-08-21), filtrables par créneau ou
  par favori, dévoilées par paliers plutôt qu'en un mur ;
· **Réalisable** — seulement ce qui est faisable avec ce qu'on a : d'abord les recettes
  réalisables maintenant, puis celles où il manque un ou deux ingrédients (annoncés avec
  leur quantité). Elle compte les **quantités**, pas seulement la présence — 10 g de riz
  ne rendent pas un plat réalisable — et respecte le régime comme le fait le plan.
  ⚠️ Le mot dit ce que la liste RÉPOND, pas d'où elle tire sa réponse : « Ma réserve »
  nommait la source, et la source a déjà son onglet deux crans plus à gauche.
⚠️ Deux listes et non deux filtres : les puces (« Favoris », « Dîner ») répondent à
« quel genre de plat ? », la réserve à « qu'est-ce que je peux faire ce soir ? ». Rangées
ensemble, la seconde disparaissait dans la rangée. On met en favori 👍, on masque ce qu'on n'aime pas 👎, et le
moteur en tient compte pour les plans suivants. On peut aussi modifier une recette pour soi.

### Profil

Ce qui te concerne toi et ton plan : le poids et sa courbe, les cibles, l'objectif, le sport
et les journées, les préférences, les repas. Une règle de rangement simple : **si un réglage
change ce que Kyroz te sert, il est ici**. Sinon (notifications, thème, confidentialité,
compte) il est derrière la roue dentée.

---

## 4. La boucle quotidienne, en trois gestes

```
J'ouvre l'app  →  je vois mes repas du jour
               →  je cuisine, je tape « J'ai cuisiné »
               →  si je n'ai pas cuisiné un repas, je le dis en un geste — la journée se recale
               →  je me pèse quand c'est le jour
```

C'est tout. **Le premier jour est le plus dur, le septième est le plus facile** : c'est un
principe de conception explicite — la friction doit décroître à chaque répétition.

---

## 5. Le ton — ce qui rend l'app différente à l'usage

**Le suivi rassure, il ne met jamais la pression.** Ce n'est pas une intention, c'est une
règle appliquée dans le code, et plusieurs tests la comptent :

- La progression s'affiche en **zone**, jamais en ligne au pixel près, et elle se dessine sur
  ce que le moteur SERT — jamais sur ce que l'utilisateur a saisi. Sinon l'app annoncerait
  « en retard » à quelqu'un qui suit le plan à la lettre.
- Aucun signal d'alarme, aucune couleur d'urgence, aucun « tu es en retard ».
- **Les deux états d'un repas se ressemblent.** « Mangé » et « sauté » sont écrits de la même
  façon, sans médaille d'un côté ni panneau d'interdiction de l'autre.
- **Un refus nomme toujours la porte ouverte** quand il y en a une, et propose le geste qui
  l'emprunte.
- Une journée qui s'arrête sous la cible le dit sans dramatiser : *« Une journée sous la
  cible ne compromet rien. »*
- Aucun émoji dans l'interface. Aucun badge, aucun point, aucun classement.

**Et l'app ne ment pas.** Un chiffre affiché est celui qui sera servi. Si le moteur n'arrive
pas à tenir une date, il l'écrit. Si un plancher de sécurité borne un objectif, il l'explique.

---

## 6. Ce que Kyroz ne fait pas, volontairement

| Absent | Pourquoi |
|---|---|
| Scan de code-barres, saisie d'aliments | Le principe est de **ne pas compter** |
| Coach IA conversationnel | Le moteur est déterministe et local, pas génératif |
| Social, partage, classements | Hors périmètre, et anxiogène |
| Badges, points, collection | La seule mécanique de rétention autorisée est la série de jours, sobre |
| Montres et bracelets connectés | Hors périmètre |
| Promesse « sans allergène » | Un catalogue générique ne peut pas garantir les traces. On filtre ce qu'on ne veut pas manger, on ne promet aucune sécurité |
| Validation par une diététicienne | Décision assumée. L'app affiche donc son avertissement |

### Deux fonctions ÉTEINTES le 2026-08-18 — décision du fondateur

Elles existent dans le code, à l'arrêt derrière un interrupteur. **Personne ne peut les
atteindre**, et c'est ce qui avait rendu la version précédente de ce document fausse.

- **« J'ai mangé hors plan »** — on déclarait un écart, l'app proposait de réadapter les repas
  restants. Le bouton, la feuille de saisie, la proposition de recalage **et** l'historique
  « Écarts passés » du Profil sont tous injoignables.
- **La banque de calories** (« Jours plus copieux ») — compenser un repas de fête sur la
  semaine. Éteinte, et le moteur ne LIT même plus le réglage : un compte qui en avait posé un
  reçoit la même semaine que s'il n'en avait jamais eu.

⚠️ **Ne pas les décrire comme livrées, ni comme à venir.** Elles sont en suspens.

---

## 7. Ce qui est gratuit, ce qui est payant

**Tout le cœur est gratuit** : le plan, les recettes, les courses, la réserve, la pesée. Aucune
limite de génération, aucun compte à rebours.

**Kyroz+** (abonnement) ajoute **deux** choses, qui servent toutes deux à *piloter son objectif
dans le temps* :

1. **L'objectif daté** — viser un poids à une date, avec une trajectoire que le moteur tient
   vraiment ; il dit franchement quand la date n'est pas tenable, et propose la première qui
   l'est.
2. **Le suivi de transformation** — photos et zone de progression.

⚠️ **Il y en avait TROIS jusqu'au 2026-08-18** : la banque de calories est sortie de l'offre
(cf. §6). Ne pas la citer.
⚠️ **Le paiement n'est pas lancé, et ce sont DEUX interrupteurs séparés** : la clé du
prestataire d'achat, et la date d'entrée en vigueur du verrou. 🔴 **Cette ligne disait
« les deux sont éteints » — c'est faux depuis le 2026-08-03** : la clé est posée, l'app
*peut* encaisser. **Seule la date manque**, donc aujourd'hui tout reste ouvert à tout le
monde, gratuitement — mais un seul geste sépare désormais de la vente.

**Tarifs tranchés le 2026-08-25** : un palier de **lancement** (3,99 €/mois ·
29,99 €/an), retiré à date annoncée, puis le **standard** (4,99 € · 39,99 €). Chaque
palier a ses propres produits : un abonné garde son prix tant qu'il reste abonné, ce que
les CGU §3 promettent noir sur blanc.

---

## 8. Ce qui est stocké, et où

L'app fonctionne **hors ligne** — le moteur tourne sur le téléphone. Un compte permet de
retrouver son profil sur un autre appareil ; on peut aussi entrer **en invité**, sans e-mail.

Trois choses ne quittent **jamais** l'appareil, par décision : les **photos de progression**,
le **journal des repas hors plan**, et le **plan lui-même** (il se recalcule à partir du
profil, donc le stocker n'apporterait rien). Le reste est hébergé en Europe, et le compte se
supprime depuis l'app.

🔴 **Aucune statistique d'usage n'est mesurée** (éteint le 2026-08-26, décision fondateur).
L'app ne demande plus rien à l'inscription et n'envoie plus rien : le moteur de mesure reste
en place, coupé par une constante (`lib/featureFlags.ts`). Ce qui a pu partir entre le
2026-08-18 et cette date est chez PostHog, et « Supprimer mes statistiques » reste
accessible dans les Réglages pour qui a un identifiant sur son téléphone.

---

## 9. La mesure de succès

Une seule : **le pourcentage d'appareils qui atteignent 7 jours ACTIFS dans leurs 14 premiers
jours** — un jour actif étant un jour où **au moins un repas a été marqué « J'ai cuisiné »**.

Pas le nombre d'inscrits, pas le temps passé dans l'app. Si une fonctionnalité ne sert pas ça,
elle est discutable.

⚠️ **Deux pièges de vocabulaire, tranchés le 2026-08-20 :**
- ce n'est **pas** « 7 jours d'affilée » : les 7 jours n'ont pas à se suivre, une absence de
  deux jours n'est pas un abandon ;
- ce n'est **pas** la série affichée dans l'app. Celle-là compte les jours où le plan est
  **ouvert**, cuisiné ou pas — elle le dit elle-même à l'utilisateur, et elle sert la
  rétention, pas la décision.

La définition exacte, sa méthode de calcul et son seuil (pas encore posé) vivent dans
`METRICS.md`.
