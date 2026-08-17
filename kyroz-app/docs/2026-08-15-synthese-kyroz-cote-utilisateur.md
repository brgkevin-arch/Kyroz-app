# Kyroz, vu par la personne qui l'utilise

> Synthèse écrite le 2026-08-15 pour accompagner un brainstorm. Décrit le produit **tel qu'il est
> livré aujourd'hui**, du point de vue de l'usage — pas de l'architecture. Document autonome :
> il se lit sans rien connaître de Kyroz.

---

## En une phrase

**Kyroz calcule ce que tu dois manger et te sert des assiettes.** Tu ne comptes rien, tu ne
scannes rien, tu ne saisis aucun aliment. Tu dis qui tu es et ce que tu veux ; l'app fait
l'arithmétique.

C'est la différence avec les carnets alimentaires classiques : ceux-là te demandent d'**enregistrer
ce que tu as mangé**. Kyroz te dit **quoi manger**.

---

## 1. L'inscription — sept étapes, une seule fois

| Étape | Ce qu'on demande |
|---|---|
| — | Consentement aux statistiques d'usage (facultatif, refusable) |
| 1 | Le prénom |
| 2 | Sexe, date de naissance, poids, taille |
| 3 | Morphologie — on choisit sa silhouette dans une planche, pas un chiffre à deviner |
| 4 | Sports pratiqués (durée, fréquence) + niveau d'activité quotidienne hors sport |
| 5 | Objectif : **Sèche · Recomposition · Maintien · Prise de masse** |
| 6 | Régime (végétarien, vegan, sans gluten…), protéines préférées, niveau de variété |
| 7 | Quels jours, combien de repas et à quelles heures |

Deux choses sont dites, discrètement, sous le bouton de la première étape : Kyroz s'adresse à des
adultes en bonne santé, et ça ne remplace pas un médecin.

Certaines personnes sont **refusées**, et c'est délibéré : moins de 18 ans, IMC de départ trop
bas avec un objectif de perte, poids cible hors plage saine, plus de 20 h d'entraînement par
semaine. L'app le dit et n'insiste pas.

**Au bout des sept étapes : un plan de 7 jours, en moins d'une seconde.** Pas de file d'attente,
pas de « votre plan sera prêt dans 24 h », pas de compte à créer avant de voir quelque chose.

---

## 2. Ce que l'app a calculé pendant ce temps

- **La dépense énergétique** : métabolisme de base × vie quotidienne + dépense sportive réelle.
- **La cible calorique** : la dépense, plus ou moins l'écart de l'objectif.
- **Les macros** : protéines (calculées sur la masse maigre), lipides (jamais sous le seuil de
  carence), glucides (le reste).
- **La répartition entre les jours** : un jour d'entraînement vise plus haut, un jour de repos
  plus bas. La semaine garde son total.
- **Des garde-fous que rien ne contourne** : aucun plan ne descend sous le plancher physiologique,
  aucun déficit ne dépasse 25 % de la dépense, et après 8 semaines de déficit d'affilée la 9ᵉ est
  servie à la maintenance — sans rien demander à personne.

Ces chiffres sont visibles dans le Profil, et une page « Méthodologie & sources » explique d'où ils
viennent.

---

## 3. Les cinq écrans

### Plan — celui qu'on ouvre tous les jours

La journée, repas par repas, avec ses macros. Une rangée de jours en haut. Sur chaque repas :

- **« J'ai cuisiné »** — le repas est validé, la série avance, les ingrédients sortent du frigo.
- **« Remplacer »** — une autre recette équivalente, choisie parmi celles qu'on a aimées.
- **La fiche** — ingrédients pesés, préparation, temps.

Et en dehors des repas : **« J'ai mangé hors plan »**. On déclare un écart (« Pizza · 300 g »),
l'app l'enregistre **sans rien toucher**, puis **demande** : veux-tu réadapter tes repas
restants ? Trois façons sont proposées, chacune chiffrée. Ou « Non, je garde mon plan ».

Plus : la pesée (à la fréquence choisie), le suivi d'hydratation, et la série de jours consécutifs
sous forme d'une petite pastille.

### Courses

La liste se calcule toute seule : **ce que le plan demande, moins ce qu'il y a déjà dans le
frigo**. On coche en magasin, on clôture, et la liste part dans un historique.

### Frigo

L'inventaire de ce qu'on a. Il alimente la liste de courses, et il propose ce qu'on peut cuisiner
**maintenant** avec ce qu'il reste — et ce qui manque d'un ou deux ingrédients.

### Recettes

Le catalogue complet (plus de 500 recettes), filtrable. On met en favori 👍, on masque ce qu'on
n'aime pas 👎 — et le moteur en tient compte pour les plans suivants. On peut aussi modifier une
recette pour soi.

### Profil

Ce qui te concerne toi et ton plan : le poids et sa courbe, les cibles, l'objectif, le sport,
les préférences, les repas. Une règle de rangement simple : **si un réglage change ce que Kyroz te
sert, il est ici**. Sinon (notifications, thème, confidentialité, compte) il est derrière la roue
dentée.

---

## 4. La boucle quotidienne, en trois gestes

```
J'ouvre l'app  →  je vois mes repas du jour
               →  je cuisine, je tape « J'ai cuisiné »
               →  si j'ai mangé autre chose, je le dis, l'app propose de rattraper
               →  je me pèse quand c'est le jour
```

C'est tout. **Le premier jour est le plus dur, le septième est le plus facile** : c'est un
principe de conception explicite — la friction doit décroître à chaque répétition.

---

## 5. Le ton — ce qui rend l'app différente à l'usage

**Le suivi rassure, il ne met jamais la pression.** Ce n'est pas une intention, c'est une règle
appliquée partout dans le code :

- La progression s'affiche en **zone**, jamais en ligne au pixel près.
- Aucun signal d'alarme, aucune couleur d'urgence, aucun « tu es en retard ».
- L'historique des écarts ne compte pas les dérapages — il dit **ce que le moteur en a fait**.
  Le message est « ça a été encaissé », pas « tu as fauté ».
- Quand l'app ne peut pas rattraper quelque chose, elle le dit sans dramatiser : *« le reste ne se
  rattrape pas, et une journée ne fait pas ta semaine. »*
- Aucun émoji dans l'interface. Aucun badge, aucun point, aucun classement.

**Et l'app ne ment pas.** Un chiffre affiché est celui qui sera servi. Si le moteur n'arrive pas à
tenir une date, il l'écrit. Si un plancher de sécurité bloque un objectif, il l'explique.

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
| Validation par une diététicienne | Décision assumée. L'app affiche donc son avertissement partout |

---

## 7. Ce qui est gratuit, ce qui est payant

**Tout le cœur est gratuit** : le plan, les recettes, les courses, le frigo, la pesée, les écarts
hors plan. Aucune limite de génération, aucun compte à rebours.

**Kyroz+** (abonnement) ajoute trois choses qui servent à **piloter son objectif dans le temps** :
l'objectif daté (viser un poids à une date, avec une trajectoire tenable), le suivi de
transformation (photos et zone de progression), et la banque de calories.

⚠️ **Le paiement n'est pas lancé.** Aujourd'hui, tout est ouvert à tout le monde, gratuitement.

---

## 8. Ce qui est stocké, et où

L'app fonctionne **hors ligne** — le moteur tourne sur le téléphone. Un compte (e-mail) permet de
retrouver son profil sur un autre appareil.

Trois choses ne quittent **jamais** l'appareil, par décision : les **photos de progression**, le
**journal des repas hors plan**, et le **plan lui-même** (il se recalcule, donc le stocker
n'apporterait rien). Le reste est hébergé en Europe, et le compte se supprime depuis l'app.

---

## 9. La mesure de succès

Une seule : **le pourcentage de gens qui utilisent l'app 7 jours d'affilée dans leurs 14 premiers
jours.** Pas le nombre d'inscrits, pas le temps passé dans l'app. Si une fonctionnalité ne sert
pas ça, elle est discutable.
