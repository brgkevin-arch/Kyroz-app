# Reprise de l'app de A à Z — le parcours d'un nouvel utilisateur

> Ouvert le 2026-10-19, à la demande du fondateur : *« je ne suis pas satisfait de la
> direction prise depuis septembre ; on reprend l'app de A à Z, en suivant le chemin
> qu'un utilisateur fait naturellement, sans énorme chantier d'un coup. »*
>
> **Règle du chantier** : un segment à la fois. Pour chacun : je regarde l'écran comme
> un nouvel utilisateur, je liste ce qui cloche, le fondateur tranche, je code, on
> vérifie, puis on passe au suivant. Rien ne part en ligne sans son accord.

## Le découpage — 12 segments, dans l'ordre du parcours

| # | Segment | Ce que l'utilisateur y fait |
|---|---|---|
| **1** | **Accueil + création du compte** | carrousel, inscription / connexion, code reçu par e-mail, Apple, mot de passe oublié |
| 2 | Questionnaire — toi | prénom, sexe, naissance, poids, taille, silhouette (étapes 1 à 3) |
| 3 | Questionnaire — ton activité | journées hors sport, jours de repos, séances (étapes 4 et 5) |
| 4 | Questionnaire — ton objectif | sèche / recomposition / maintien / prise de masse (étape 6) |
| 5 | Questionnaire — tes goûts | régime, protéines, sucré-salé, aliments évités (étape 7) |
| 6 | Questionnaire — ton organisation | jours suivis, variété, repas et horaires (étapes 8 et 9) |
| 7 | Le premier plan | révélation, visite guidée, proposition de rappel |
| 8 | Plan — l'écran de tous les jours | la journée, les repas, « J'ai cuisiné », remplacer, hors plan |
| 9 | Fiche recette | ingrédients, préparation, portions |
| 10 | Courses + Réserve | la liste, « Courses terminées », l'inventaire |
| 11 | Recettes | catalogue, réalisable, favoris |
| 12 | Profil + Réglages + Kyroz+ | poids, cibles, éditeurs, réglages, abonnement, pages annexes |

## Segment 1 — Accueil + création du compte

*Regardé le 2026-10-19 sur le web, au format iPhone (375 pt). Pas encore vu sur iPhone
réel : le bouton Apple n'existe qu'en natif.*

Ce que vit un nouvel utilisateur aujourd'hui : **carrousel de 4 images → formulaire
« Inscription » (e-mail, mot de passe, case de consentement) → écran « Confirme ton
adresse » (code à 6 chiffres) → questionnaire.** Trois écrans avant la première question.

### Constats

**A. Le carrousel d'accueil**

1. **Aucune porte « J'ai déjà un compte ».** Le seul bouton est « Commencer », qui ouvre
   l'inscription. Qui réinstalle l'app ou change de téléphone doit deviner le petit lien
   tout en bas du formulaire. C'est l'origine même du signalement du 2026-10-09 (« ça me
   recrée un compte »).
2. **Les captures mentent.** Elles datent du 2026-09-19 :
   - Courses montre des grammes (« Bavette de bœuf 425 g ») — depuis le 2026-10-02, la
     liste montre le paquet vendu ;
   - Recettes montre l'étiquette « Perte de gras » — renommée « Sèche » le 2026-09-30 ;
   - Plan montre un bandeau « Mangé, journée recalée » posé PAR-DESSUS les boutons de la
     carte du déjeuner : capture prise au mauvais moment.
3. **Les captures sont illisibles au téléphone** : un écran entier réduit dans un écran,
   le texte y fait 5 à 6 pt. On voit « une app », pas ce qu'elle fait.
4. **L'ordre** : plan → poids → courses → recettes. Le poids passe en 2ᵉ alors que ce
   n'est pas la boucle quotidienne (plan → courses → cuisiner).

**B. Le formulaire**

5. **La case de consentement domine l'écran** (5 lignes, plus que les deux champs). Elle
   est obligatoire (données de santé, RGPD) — mais sa forme peut être plus courte.
6. **Le bouton grisé ne dit pas pourquoi.** Tant que la case n'est pas cochée, « Créer
   mon compte » est inactif, sans message.
7. **Les CGU sont tout en bas, détachées du bouton.** L'usage est une ligne sous le
   bouton : « En créant ton compte, tu acceptes les CGU et la politique de
   confidentialité ». *(Exigence juridique exacte : à vérifier, pas affirmée ici.)*
8. **En connexion, le champ mot de passe dit « 6 caractères minimum »** — consigne de
   création, sans objet pour qui se connecte.
9. **« Email » dans le champ, « e-mail » partout ailleurs.**
10. **Sur iPhone, Apple vient après le formulaire e-mail, sous un « ou ».** C'est le
    chemin le plus court (pas de mot de passe, pas de code e-mail) et il est relégué en
    second. *(Non vu à l'écran : natif seulement.)*

**C. Le code e-mail**

11. **Une étape de plus avant la première question.** L'écran est clair (renvoi, aide,
    indésirables), mais c'est un aller-retour vers la boîte mail au moment où la
    motivation est la plus haute. Le supprimer, c'est l'option B déjà écartée (E77) :
    je ne la relance pas, je la note.

### Ce que je propose (à trancher)

| # | Proposition | Coût |
|---|---|---|
| P1 | Sous « Commencer », un lien « J'ai déjà un compte » qui ouvre la connexion | petit |
| P2 | Refaire les 4 captures (script existant `npm run captures:intro`) | petit |
| P3 | Recadrer les captures sur l'essentiel (le haut du plan, quelques lignes de liste) pour qu'elles se lisent | moyen |
| P4 | Ordre : plan → courses → recettes → poids | petit |
| P5 | Consentement en 2 lignes + « En savoir plus » ; la phrase CGU sous le bouton | petit |
| P6 | Bouton jamais grisé : appuyé sans la case, il dit « Coche la case pour continuer » | petit |
| P7 | Connexion : « Ton mot de passe » ; « E-mail » partout | petit |
| P8 | Sur iPhone : Apple EN HAUT, l'e-mail en dessous | petit (à vérifier au simulateur) |

## Segment 12 — Profil (contenu et visuel)

*Ouvert le 2026-10-24 à la demande du fondateur (« on va retravailler le contenu et le
visuel du profil »), avant les segments 2 à 11. Regardé sur le web au format iPhone
(393 pt), clair et sombre, avec le persona des scripts (Marc, sèche, sans Kyroz+). Le
Profil n'est plus un onglet depuis le 2026-10-21 (E81) : on l'ouvre par la bulle en haut
à droite du Plan, et le poids est parti dans l'onglet Poids.*

### Constats

**A. Ce que l'écran dit de toi**

1. **Rien ne dit « toi ».** On entre par une bulle de profil et l'écran s'ouvre sur quatre
   chiffres. Le prénom est lu par l'écran (`useFirstName`) et n'est affiché nulle part.

**B. Les cibles**

2. **La cible et la dépense sont dans deux cartes, sans le lien.** « 2 183 kcal » en haut,
   « 2 483 kcal » dans la carte suivante : les 300 kcal de déficit sont à soustraire de
   tête, alors que c'est ce qui explique la cible.
3. **Deux grammaires pour la même chose.** Ici une grille 2 × 2 de chiffres ; sur le Plan,
   un gros chiffre, une barre en trois nuances et une ligne de macros.
4. **Le Plan et le Profil n'affichent pas les mêmes macros.** Le Plan montre ce qui est
   servi ce jour-là (162 / 215 / 65 g), le Profil la cible (164 / 213 / 75 g) : 10 g de
   lipides d'écart, sans un mot. La cause est sur le Plan (segment 8) ; c'est ici qu'on la voit.

**C. Les réglages**

5. **Les valeurs ne disent pas ce qui est réglé.** « Personnalisées » s'affiche dès qu'un
   régime est enregistré, « omnivore » compris, donc pour presque tout le monde ;
   « Calculées » ; « 5 j » ; et « Équilibré » veut dire ici « aucun repas plus copieux »,
   alors que c'est aussi le nom d'un niveau de variété.
6. **Les titres se répètent** : « Infos › Informations », « Objectif › Objectif ». Les titres
   de chapitre sont une décision du 2026-09-21 (`profilSection.test.ts`) : pas touchés.

**D. Kyroz+ et l'action**

7. **Kyroz+ est une ligne « En savoir plus » qui ne dit pas ce qu'elle apporte.** Le code
   prévoyait d'en faire une carte « le jour où le paywall s'allumera » ; il est allumé depuis
   le 2026-08-27, et la carte n'est jamais venue.
8. **« Régénérer mon plan »**, qui remplace toute la semaine, est posé entre les réglages et
   Kyroz+.

### Ce que le fondateur a tranché (2026-10-24)

Mon premier jet (P1 à P5 : prénom en tête, carte des cibles, valeurs lisibles, carte Kyroz+,
« Régénérer » en dernier) a été codé **sans qu'il l'ait demandé** — il voulait d'abord en
parler. Remplacé par ce qui suit, discuté puis validé (« go a ») :

- **Quatre encadrés, dans cet ordre : Toi · Kyroz+ · Objectifs · Repas**, inspirés d'une
  référence d'une autre app qu'il a montrée (avatar, prénom, une ligne de résumé).
- **« Plus léger »** : l'écran ne porte qu'une ligne de résumé par encadré. **En touchant
  un encadré, on a toutes les infos qu'on peut modifier.**
- **Façon A** (choisie contre B, « tout modifiable directement ») : la feuille LISTE chaque
  réglage avec sa valeur ; une ligne ouvre son réglage dans la même feuille, avec une
  flèche retour. « Enregistrer » ramène à la liste.

Ce qui en découle, et que j'ai choisi sans qu'on en parle (à revoir s'il le faut) :
- avatar = l'initiale du prénom (l'icône de la bulle du Plan sans prénom) — pas de photo ;
- « Au quotidien » et « Sport » vivent dans Toi ; le régime dans Repas ;
- les cibles (kcal, macros, écart à la dépense) sont en tête de la feuille Objectifs, avec
  la barre en trois nuances du Plan ; l'encadré n'en garde que les kcal ;
- pour un abonné, l'encadré Kyroz+ dit « Abonnement actif » (pas de badge) ; pas d'icônes
  dans les encadrés ; petit titre « Profil » inchangé ; « Régénérer mon plan » en bas ;
- la ligne « Poids » ouvre directement la pesée (sa seule porte d'entrée).

Le constat 4 (macros du Plan ≠ cibles du Profil) reste pour le segment 8.

### Retouches sur iPhone et clôture (2026-10-25 → 26) — ✅ CLOS, publié en 63ᵉ OTA

Vu au simulateur iPhone, puis retouché à la demande du fondateur, dans #406 :
- les liens directs (« Ma répartition (%) », carte des protéines du Plan, objectif daté de
  l'onglet Poids) ramènent à l'écran d'origine en fermant ; « Régénérer » revient au Plan ;
- « Sexe » devient **« Genre »**, en choix comme le reste ; le **poids** a sa roulette et
  l'enregistrer ajoute une pesée du jour, sans le dire ; le sport avance par **5 min** ;
- **feuille Objectifs** : l'objectif en gros, puis kcal, écart à la dépense et trois cases
  de macros, sans la barre ; la carte ouvre le choix de l'objectif ; plus de ligne
  « Calories & macros » ;
- **feuille Repas** : « Ta journée » (chaque repas et son heure, étiquettes Copieux / Géré
  par toi), « Ta semaine » (les jours se touchent, enregistrement immédiat, jamais zéro jour),
  « Tes goûts » (régime, protéines et aliments évités en pastilles) ;
- **une seule DA de sélection** pour toute l'app : la carte au rond coché (CLAUDE.md §8).
Les choix « non validés » de la liste ci-dessus sont restés tels quels : le fondateur ne les
a pas remis en cause. Suites dans d'autres sessions : polices (#412, #415), fondu (#411).

## Journal du chantier

- 2026-10-19 — découpage posé, segment 1 audité. En attente des arbitrages du fondateur.
- 2026-10-24 — segment 12 (Profil) ouvert à la demande du fondateur : 8 constats. Un premier
  jet codé trop tôt, puis la version discutée : quatre encadrés légers, une feuille-liste par
  encadré (façon A). Codée sur `claude/beautiful-mayer-8eldew`, vue sur le web ; reste à la
  voir sur iPhone.
- 2026-10-25/26 — segment 12 vu au simulateur iPhone, retouché (cf. « Retouches sur iPhone
  et clôture »), fusionné (#406) et publié en 63ᵉ OTA. **Segment 12 CLOS.**
