# Brief — Profil & Paramètres de Kyroz

> **À quoi sert ce document.** Il est écrit pour être collé tel quel dans une
> conversation avec un modèle qui n'a **aucun accès au code**. Tout ce qu'il contient a
> été relevé dans l'app le **2026-08-10**, écran par écran et fichier par fichier — pas
> de mémoire, pas d'approximation. Quand une chose n'est pas mesurée, c'est écrit noir
> sur blanc.
>
> **La question à trancher est en §7.** Les six sections d'avant sont là pour qu'on
> puisse y répondre sans deviner.

---

## 1. Kyroz en cinq lignes

App mobile (iOS/Android, React Native) de **plans repas macro-précis**, pour des adultes
sportifs de 18 à 50 ans. Tu renseignes ton corps, ton sport, ton objectif — l'app calcule
ta dépense, en déduit des cibles caloriques et de macros, et génère une semaine de repas
avec la liste de courses. Le moteur est **local** : pas d'IA, pas d'appel réseau, un plan
en moins d'une seconde. Cinq onglets : **Plan · Courses · Frigo · Recettes · Profil**.
Freemium : le cœur est gratuit, deux fonctions avancées sont vendues sous « Kyroz+ ».

L'app part en revue App Store dans les prochains jours. Toute réorganisation d'écran est
un changement JS, livrable sans repasser par la revue — **le coût d'un changement ici est
faible**. Ce n'est donc pas le risque technique qui doit arbitrer, c'est la clarté.

---

## 2. L'histoire, en deux temps

**Avant le 2026-08-09**, l'onglet Profil empilait tout, à la suite, dans un seul
défilement : le poids, la série, les cartes de sécurité, les cibles, le TDEE, **11 lignes
de menu**, **6 interrupteurs système**, 5 lignes de bas de page, la déconnexion et la
suppression de compte. « Couleur d'accent » se trouvait à trois doigts de « Supprimer mon
compte ».

**Le 2026-08-09**, décision du fondateur : *« le profil n'est plus une section
fourre-tout. J'aimerais que le profil soit qu'avec les préférences et données de l'user,
suivi du poids etc, et avec une petite roue dentée on met le reste. »*

**Le 2026-08-10**, la coupe est livrée. Une **roue dentée** en haut à droite ouvre une
feuille « Réglages ». La règle de rangement retenue tient en une question :

> ### 🔑 « Ce réglage change-t-il ce que Kyroz me SERT ? »
> **Oui** → ça reste sur le Profil.
> **Non** → ça part derrière la roue.

Le même jour, une seconde passe a corrigé quatre défauts que la coupe avait laissés
(le mot « Réglages » désignait deux endroits, deux lignes menaient au même écran, le TDEE
était à 900 px des cibles qu'il explique, le surtitre répétait deux lignes du dessous).
**C'est l'état décrit ci-dessous.**

---

## 3. Inventaire exact — l'onglet Profil, de haut en bas

### 3.1 Ce qui s'affiche (lecture)

| # | Bloc | Ce qu'il montre | Toujours là ? |
|---|---|---|---|
| 1 | **En-tête** | le prénom en surtitre, « Profil » en grand, un « ? » (revoir la visite guidée), la **roue dentée** | oui (surtitre : seulement si un prénom est connu) |
| 2 | **Suivi du poids** | poids actuel, écart depuis la pesée précédente, courbe des pesées, bouton « Ajouter » / « Me peser » | oui |
| 3 | **Série** | « 4 jours d'affilée · record 11 j » + 7 chaînons | oui |
| 4 | **Révision du moteur** | « ta cible a bougé, voici pourquoi » + un bouton pour affiner | seulement après un changement de moteur |
| 5 | **Objectif daté** | trajectoire vers le poids visé, date réellement tenable | seulement si un objectif daté est posé |
| 6 | **Poids sous la plage** | « ton plan est ramené à ta maintenance » | seulement en insuffisance pondérale |
| 7 | **Sortie de déficit** | « ta cible remonte de ~23 kcal/semaine, et voilà la fin » | seulement après un long séjour en énergie basse |
| 8 | **Tes cibles** | 4 boîtes : kcal · protéines · glucides · lipides | oui |
| 9 | **Note de modulation** | « ton plan module : 2 144 à 2 353 kcal selon tes journées » | seulement si l'amplitude ≥ 40 kcal |
| 10 | **Note de plancher** | « ces X kcal sont ton plancher de sécurité, pas ton déficit » | seulement si un plancher mord |
| 11 | **Dépense estimée (TDEE)** | « 2 593 kcal » — le nombre d'où tout descend | oui |

### 3.2 Ce qui se règle — bloc **TOI** (4 lignes)

| Ligne | Valeur affichée | Ce qu'on trouve derrière |
|---|---|---|
| **Informations** | `Homme · 30 ans · 83 kg · 18 % MG` | prénom · sexe · date de naissance · poids · taille · **masse grasse** (sélecteur de silhouettes ou saisie du %) |
| **Sport & activité** | `1 sport · assis, en déplacement` | **le niveau de vie quotidienne hors sport (NEAT)** · les séances (sport, nombre, durée) · les jours de repos |
| **Objectif** | `Sèche` | 5 objectifs : Sèche · Recomp · Maintien · Prise légère · Prise |
| **Objectif daté** 💎 | `Aucun` ou `78 kg · 12 déc.` | poids visé + échéance → l'app annonce la date qu'elle tiendra **vraiment** |

### 3.3 Ce qui se règle — bloc **TON PLAN** (7 lignes)

| Ligne | Valeur affichée | Ce qu'on trouve derrière |
|---|---|---|
| **Calories & macros** | `Calculées` / `Perso %` | laisser l'app calculer, ou fixer soi-même le ratio glucides et les protéines/kg |
| **Préférences alimentaires** | `Aucune` / `Personnalisées` | régime (7 cases) · protéines préférées · ingrédients détestés · recettes masquées 👎 |
| **Paramètres des repas** | `7 j · 4 repas · Équilibré` | jours du plan · jours de repos · **repas de la journée (créables, jusqu'à 8)** · repas « je gère moi-même » · emphase (plus le matin/midi/soir) · variété |
| **Banque de calories** 💎 | `Aucun écart prévu` | « resto samedi +600 » compensé sur le reste de la semaine |
| **Repas hors plan** | `Aucun pour l'instant` | **historique en lecture seule** des écarts (ils se déclarent depuis l'onglet Plan) |
| **Kyroz+** | `Tout est déjà ouvert` | la page qui vend l'abonnement |
| **Régénérer mon plan** | `Repartir de zéro` | **une action**, pas un réglage : reconstruit la semaine |

💎 = réservé à Kyroz+ le jour où le paiement s'allumera. Aujourd'hui tout est ouvert.

> ⚠️ **Deux des sept lignes ne sont pas des réglages** : « Repas hors plan » est une
> consultation, « Régénérer » est un bouton d'action. Elles sont rangées avec les
> réglages parce qu'il n'existe pas d'autre endroit où les mettre.

---

## 4. Inventaire exact — derrière la roue dentée

Cinq groupes, **13 contrôles**. Rien ici ne touche au plan.

| Groupe | Contrôles |
|---|---|
| **Notifications** | Rappel quotidien (Aucun / Activé + l'heure) · Propositions d'ajustement (Activées / Désactivées) |
| **Affichage** | Apparence (Système / Clair / Sombre) · Couleur d'accent (6 pastilles) · Barre d'hydratation (Affichée / Masquée) |
| **Aide et retours** | Donner mon avis · Revoir les tutos |
| **Confidentialité** | Statistiques d'usage (Partagées / Non) · Exporter mes données (RGPD) · Confidentialité & CGU |
| **Compte** | Version · **Se déconnecter** · **Supprimer mon compte** |
| *(bas de feuille)* | le disclaimer médical + l'attribution de la base nutritionnelle Ciqual |

---

## 5. Ce qui est demandé AILLEURS, et ce qui ne l'est nulle part ailleurs

L'inscription (**onboarding**) pose 7 étapes :

1. Prénom
2. Sexe · date de naissance · poids · taille
3. Masse grasse
4. Sports
5. Objectif
6. Régime · protéines préférées · variété
7. Jours du plan · repas

**Toutes ces questions se retrouvent ensuite dans le Profil** — c'est là qu'on les
corrige. Sauf **deux**, qui n'existent QUE dans le Profil :

- 🔴 **Le NEAT** (« tes journées, hors sport ») — dans *Sport & activité*. Il multiplie le
  métabolisme de base : **1,30** (bureau) · 1,35 · 1,40 · **1,45** (travail physique).
  Comme la question n'est jamais posée à l'inscription, **le défaut « journées assises »
  est la valeur réellement servie à la plupart des gens**.
  ✅ **Chiffres RE-MESURÉS le 2026-08-10** (800 gabarits, 2 400 écarts) — la première
  version de ce brief disait « environ 90 kcal/jour le cran », c'était une estimation
  reprise d'un commentaire, pas une mesure : un cran vaut **57 à 102 kcal/j de dépense,
  médiane 80**, et bureau → travail physique vaut **272 kcal/j** sur un homme de 83 kg.
  ⚠️ Sur la **cible servie**, le plancher de sécurité amortit 274 crans sur 2 400 et en
  **efface 140 entièrement** : pour ces profils-là, changer de niveau NEAT ne déplace pas
  une calorie dans l'assiette. Citer 80, jamais 90, et toujours en disant « dépense ».
- **Les jours de repos** — pré-cochés par déduction, corrigeables dans deux éditeurs.

➡️ **Conséquence directe pour la question posée** : le réglage le plus lourd de toute
l'app, celui que personne ne vient chercher, vit déjà **à deux touchers de profondeur**
dans un écran que l'utilisateur ne visite pas tous les jours. L'enterrer d'un cran de plus
n'est pas neutre.

---

## 6. Contraintes — ce qu'un rangement n'a PAS le droit de casser

1. **Le disclaimer médical doit être visible « à l'onboarding, aux paramètres, et sur
   chaque plan généré ».** C'est une exigence de conformité (allégations santé, revue App
   Store). Aujourd'hui il est en bas de la feuille Réglages, et c'est cette feuille qui
   tient le rôle « paramètres ». **Si les paramètres se déplacent, le disclaimer suit.**
2. **Exporter ses données** et **Supprimer son compte** sont des droits RGPD : ils doivent
   rester atteignables, et pas au fond d'un labyrinthe.
3. **Kyroz+ reste sur le Profil.** Il débloque l'objectif daté et la banque de calories,
   qui sont juste au-dessus de lui. Derrière une roue, il devient invisible le jour où il
   doit se vendre.
4. **Le poids reste en haut du Profil.** Chaque pesée recalcule la dépense, les macros et
   le plan : c'est l'entrée la plus fréquente de l'app, et la seule à revenir chaque
   semaine.
5. **La visite guidée du Profil compte 6 bulles** qui désignent des éléments précis
   (poids · dépense · sport · objectif daté · régénérer · la roue) et **font défiler
   l'écran jusqu'à eux, de haut en bas**. Déplacer un bloc oblige à relire cet ordre —
   sinon la visite remonte et redescend, ce qui se lit comme un bug.
6. **Un réglage déplacé dans une feuille n'est pas un déménagement neutre** : une bulle de
   visite guidée dont la cible n'est pas affichée est écartée **en silence**, et le tour se
   joue plus court en ayant l'air complet. C'est arrivé une fois, en vrai.

---

## 7. 🎯 La question à trancher

> **« Faut-il déplacer les infos perso (Informations : sexe, date de naissance, poids,
> taille, masse grasse) derrière la roue, avec les paramètres ? »**
>
> Et derrière elle, la vraie : **« quel principe rend cette section intuitive ? »** —
> parce que la règle actuelle, « ce réglage change-t-il ce que Kyroz me sert ? », est
> juste pour un ingénieur et **muette pour un utilisateur**, qui ne sait pas ce que le
> moteur lit.

### Les faits qui pèsent, mesurés

**Contre le déplacement :**
- Ces cinq champs sont les entrées **les plus lourdes** du calcul. Le métabolisme de base
  se calcule à partir du sexe, de l'âge, du poids et de la taille. **Un seul point de
  masse grasse vaut ±13 kcal/jour**, et le sélecteur de silhouettes a une incertitude de
  ±5 points — soit jusqu'à 126 kcal/jour dans l'assiette.
- « Informations » est déjà **la première ligne** du premier bloc. C'est la place la plus
  visible de la moitié basse de l'écran.
- La règle actuelle est **cohérente** : la déplacer y ouvre une exception, et une règle à
  exceptions ne se transmet plus.

**Pour le déplacement :**
- Dans la plupart des apps, « mes informations » se trouve dans les réglages ou sous un
  avatar. **C'est là que les gens vont chercher.** Un rangement juste mais inhabituel
  coûte quand même une recherche.
- Le Profil ferait alors une promesse plus nette : *ici, tu regardes où tu en es* (poids,
  série, cibles, dépense, trajectoire), *derrière la roue, tu changes des choses*.
- Le mot « Profil » désigne aujourd'hui **deux choses à la fois** : un tableau de bord
  (poids, série, cibles) et un panneau de réglages (11 lignes). C'est peut-être **ça**, la
  vraie source de confusion — pas l'emplacement d'une ligne.

### Trois formulations possibles du principe, à départager

| | Le principe | Ce qui reste sur le Profil | Ce qui part derrière la roue |
|---|---|---|---|
| **A. Aujourd'hui** | « ça change ce que Kyroz me sert ? » | le suivi **+ les 11 lignes de réglage** | l'app elle-même (notifs, thème, compte) |
| **B. Tableau de bord** | « est-ce que je REGARDE, ou est-ce que je CHANGE ? » | poids, série, cibles, dépense, trajectoire — **rien à régler** | **tous** les réglages, moteur compris, en deux chapitres |
| **C. Fréquence** | « est-ce que j'y reviens, ou est-ce que je le pose une fois ? » | poids, série, cibles + ce qui bouge souvent (objectif, préférences, repas) | ce qui se pose une fois (taille, sexe, date de naissance) + l'app |

> **Le fondateur n'a pas tranché.** C'est exactement là qu'il en est : il hésite, et il
> cherche le principe avant l'implémentation.

---

## 8. Ce qu'on ne sait PAS, et qu'il ne faut pas inventer

- 🔴 **Aucune donnée d'usage.** L'outil d'analytics est câblé mais **éteint** (aucune clé
  posée, choix assumé). On ne sait donc **pas** quelles lignes sont ouvertes, ni à quelle
  fréquence, ni où les gens se perdent. Toute réponse qui s'appuie sur « les utilisateurs
  vont surtout dans X » est une supposition — qu'elle le dise.
- **Aucun test utilisateur** n'a été mené sur cet écran. L'app n'est pas encore publiée.
- La seule personne à l'avoir parcouru en entier est le fondateur lui-même.

---

## 9. Ce qu'une bonne réponse doit produire

1. **Un principe de rangement énonçable en une phrase**, du point de vue de l'utilisateur
   — pas du moteur. Il doit répondre sans hésiter à ces cinq cas limites :
   - *Informations* (le corps : lourd pour le calcul, rarement modifié)
   - *Sport & activité* (contient le NEAT, jamais demandé ailleurs, défaut lourd)
   - *Repas hors plan* (une consultation rangée avec des réglages)
   - *Régénérer mon plan* (une action rangée avec des réglages)
   - *Kyroz+* (une offre commerciale rangée avec des réglages)
2. **Le nom des chapitres.** « TOI » et « TON PLAN » sont les noms actuels. Sont-ils les
   bons ? Faut-il plus de deux chapitres, ou moins ?
3. **Ce que devient le mot « Profil »** dans la barre d'onglets si les réglages en
   partent. « Profil » pour un tableau de bord de progression, est-ce encore juste ?
4. **Le coût, dit franchement.** Chaque déplacement rallonge un chemin. Dire lequel.
5. **Ne pas casser les six contraintes du §6.**

---

## 10. Vocabulaire, pour éviter les malentendus

| Terme | Ce qu'il désigne ici |
|---|---|
| **TDEE / dépense estimée** | ce que le corps brûle par jour, tout compris : métabolisme × vie quotidienne + sport |
| **NEAT** | la dépense de la vie quotidienne **hors sport** (boulot, trajets, courses) |
| **Cible** | ce que l'app te dit de manger : dépense + ou − l'écart de ton objectif |
| **Plancher de sécurité** | la limite sous laquelle l'app refuse de descendre, quel que soit l'objectif |
| **Objectif daté** | poids visé + date ; l'app annonce la date qu'elle tiendra vraiment, pas celle qu'on a tapée |
| **Banque de calories** | prévoir un écart (« resto samedi ») et le compenser sur la semaine |
| **Série** | jours consécutifs d'utilisation ; un jour manqué est « gelé », pas perdu |
| **Feuille** | un panneau qui glisse par-dessus l'écran (une modale), pas une nouvelle page |
