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

## Journal du chantier

- 2026-10-19 — découpage posé, segment 1 audité. En attente des arbitrages du fondateur.
