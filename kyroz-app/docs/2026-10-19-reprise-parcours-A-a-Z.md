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

## Segment 2 — Questionnaire « toi » (prénom, genre, naissance, poids, taille, silhouette)

*Regardé le 2026-10-26 au simulateur iPhone 17 Pro, en sombre, comme un nouvel inscrit
(session factice, aucune donnée locale), sur `main` à `ebf7c5d` (après la 65ᵉ OTA). Trois
pages : `prenom`, `infos`, `masseGrasse` de `app/(auth)/onboarding.tsx`. Comparé au Profil
refait au segment 12 (« Genre », roulettes, carte au rond coché, crans par rôle).*

### Constats

**A. Page 1 — le prénom**

1. **À l'arrivée, le titre « Bienvenue sur Kyroz » n'est pas à l'écran.** Le clavier s'ouvre
   tout seul (`autoFocus`) et la page défile pour garder le champ visible : le titre passe
   sous la barre du haut, on ne voit qu'une phrase grise. Il revient quand le clavier se
   ferme. C'est la toute première page après l'inscription. *(Cause probable : le
   défilement « saisie au-dessus du clavier » de #407, déjà en ligne ; à confirmer.)*
2. **« Ton prénom » deux fois, et la consigne en gras.** Le libellé au-dessus du champ et le
   texte du champ vide disent la même chose ; ce texte est en gras (17), il se lit comme
   une réponse déjà donnée. Même chose pour « À renseigner » (page 2) et « ex. 18 » (page 3).
3. **Deux compteurs qui ne disent pas la même chose.** La barre compte la page du prénom
   (2ᵉ page = 2/9), l'étiquette non (« ÉTAPE 1 / 8 »).

**B. Page 2 — genre, naissance, poids, taille**

4. **Le genre n'a pas de nom.** Deux cartes « Homme / Femme » sans intitulé, alors que les
   trois champs suivants en ont un. Le Profil l'appelle « Genre » ; le message de blocage dit
   « Indique si tu es un homme ou une femme ».
5. **Les roulettes s'ouvrent dans une feuille pleine hauteur, vide aux deux tiers** (date,
   poids, taille). Au Profil, la même roulette vit DANS la feuille « Toi ». La règle de
   §8 met le contenu court dans une feuille à sa hauteur (`ActionSheet`).
6. **La roulette part d'une valeur moyenne** (1ᵉʳ janvier 1996, 75 kg, 176 cm pour un
   homme), et un « Valider » sans rien toucher l'enregistre. C'est l'usage d'iOS et le choix
   des roulettes (2026-09-22) ; je le note sans proposer de le changer.
7. **La date a « JOUR · MOIS · ANNÉE » sous ses colonnes, le poids et la taille rien.**
   Détail.

**C. Page 3 — la masse grasse**

8. **La silhouette choisie devient une carte pleine (blanche)**, la grille de cases pleines
   retirée partout ailleurs le 2026-10-25. C'est la seule sélection hors de la carte au rond
   coché, et elle n'est pas dans les exceptions de §8. La silhouette claire sur fond blanc se
   lit mal.
9. **🔴 Le champ et la silhouette se contredisent, et le champ gagne en silence.** Si l'on
   tape un % puis qu'on touche une silhouette sans fermer le clavier : la silhouette s'allume,
   le champ garde l'ancien chiffre (il ne se met pas à jour tant qu'il a le focus) ; en
   quittant le champ, c'est le chiffre tapé qui est enregistré et la silhouette s'éteint. Vu
   au simulateur (sélection effacée au départ du champ) et lu dans
   `BodyFatPicker.tsx` (`onBlur` réécrit `pctText`). Juste après, « Continuer » restait
   blanc sans aucune sélection ; il est redevenu gris au tap, avec le message.
10. **Le % exact se tape au clavier**, alors que la date, le poids et la taille sont à la
    roulette (le Profil a la même chose : même composant).
11. **Les silhouettes sont petites** (~70 pt de haut, deux par ligne) : ~10 et ~15 % se
    distinguent mal.

*Pas vu* : le mode clair (le simulateur n'a pas basculé), la question « mesuré ou
estimé ? » (au-delà de 35 % H / 43 % F, la saisie au clavier AZERTY du simulateur l'a
empêchée), une inscription par Apple (prénom pré-rempli).

### Ce que je propose (à trancher)

| # | Proposition | Coût |
|---|---|---|
| P1 | Page 1 : le titre reste à l'écran à l'arrivée (ne pas faire défiler quand le champ est déjà visible au-dessus du clavier) | petit (à vérifier au simulateur) |
| P2 | Plus de consigne en gras dans un champ vide : texte normal, gris ; « Ton prénom » une seule fois | petit |
| P3 | Un seul compteur : l'étiquette compte aussi la page du prénom (« ÉTAPE 2 / 9 »), ou la barre ne la compte plus | petit |
| P4 | Intitulé « Genre » au-dessus des deux cartes, et message « Indique ton genre pour continuer » | petit |
| P5 | Roulettes dans une feuille à la hauteur de leur contenu | moyen (gestes à vérifier au simulateur) |
| P6 | Silhouettes : même DA que partout — contour et rond coché, fond inchangé | petit |
| P7 | Toucher une silhouette remplace le chiffre du champ et ferme le clavier ; un test le compte | petit |
| P8 | Silhouettes plus grandes (une par ligne, ou image agrandie) | moyen (dépend de la résolution des images) |
| P9 | % exact à la roulette (une ligne « Je connais mon % » qui l'ouvre), ici et au Profil | moyen |

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

## Segment 8 — constat 4 (macros Plan ≠ Profil)

*Mesuré le 2026-10-26 sur le moteur (`buildLocalPlan`), 4 gabarits (F 55, F 70, H 78, H 95)
× 3 objectifs × 4 régimes × 3 volumes de sport × 3 tirages, soit 3 024 jours. Script :
`npx tsx scripts/mesure-macros-plan-profil.ts`. La référence (les cibles du Profil) sort de
`recalcProfile`, qui ne lit jamais le plan : elle est figée avant toute génération.*

**Le constat.** Le Plan montre ce qui est servi ce jour-là, le Profil la cible. Relevé :
162 / 215 / 65 g contre 164 / 213 / 75 g. **Reproduit à l'identique** avec le persona des
scripts (Marc, H 82 kg, sèche, sans sport, NEAT assis) : cible 2 183 kcal, 164 / 213 / 75 g ;
ses jours servent **66 à 73 g** de lipides (3 tirages × 7 jours).

**Ce n'est pas un affichage qui lit une autre source.** Le Plan lit
`plan.total_macros_per_day` (les assiettes), le Profil `profile.target_*_g` (la cible) :
chacun dit vrai sur ce qu'il montre. Ce ne sont pas non plus les repas mangés : un plan
neuf, sans aucun repas coché, a le même écart.

**Les causes, mesurées, de la plus fréquente à la plus forte :**

1. **Les fibres (cause systématique, tous les jours, tout le monde).** Les kcal d'un repas
   viennent de Ciqual, qui compte l'énergie des fibres (~2 kcal/g). La cible du Profil, elle,
   répartit ses kcal en 4 P + 4 G + 9 L, sans fibres. Le moteur sert les bonnes kcal — donc
   il reste **75 kcal/jour en moyenne** (p10 42, p90 115) que P/G/L ne portent pas : ce sont
   les **39 g de fibres** servies par jour (× 2 = 79 kcal). Ces kcal manquent aux glucides et
   aux lipides. Sans sport : **lipides −4 g, glucides −8 g** en moyenne de semaine, tous
   régimes (pire semaine −7 g de lipides).
2. **Les vraies recettes (bruit, ±quelques grammes).** Un plat ne tombe pas au gramme : écart
   moyen de 4 g de lipides par jour (p90 7, pire −12 / +14). L'exemple relevé (−10 g) est un
   jour de cette queue, posé sur les −4 des fibres.
3. **Le sport (seulement pour qui en déclare — le plus gros écart, et il est voulu).** Le
   volume concentré (`lib/dailyBudget.ts`) donne plus aux jours d'entraînement et moins aux
   jours de repos, puis le décalage glucides → lipides des jours de repos s'y ajoute :
   | | kcal du jour − cible | glucides | lipides |
   |---|---|---|---|
   | muscu 3×60, jour d'entraînement | +179 | **+15 g** | +3 g |
   | muscu 3×60, jour de repos | −134 | **−56 g** | +3 g |
   | course 4×45, jour d'entraînement | +221 | +17 g | +5 g |
   | course 4×45, jour de repos | −295 | **−87 g** (pire −134) | −1 g |
   Les lipides restent stables (c'est le critère de `REST_DAY_CARB_TO_FAT_SHIFT`), les
   protéines aussi (+1 à +5 g). Avec les fibres, la moyenne de la semaine finit à **−24 à
   −31 g de glucides** sous la cible du Profil.

**Garde-fou §6 vérifié au passage** : jours servis sous le plancher de carence lipidique
(0,8 g/kg) : **0,1 %** (0,3 % sans sport, 0 % avec). Marc est un des profils dont la cible
lipidique **est** la visée du plancher (0,8 × 1,15 × 82 = 75 g) ; ses 65 g relevés sont un
de ces rares jours, sous les 65,6 g du seuil. La marge de visée fait son travail, ce n'est
pas un nouveau défaut.

**À l'écran, combien de jours montrent un écart ?** ≥ 5 g : protéines 22 % · glucides 86 %
· lipides 37 %. ≥ 10 g : 4 % · 70 % · 3 %. Les glucides s'écartent presque tous les jours
dès qu'il y a du sport ; sans sport, c'est surtout les lipides, de quelques grammes.

### Ce que je propose (à trancher)

| # | Proposition | Avant → après pour l'utilisateur | Coût |
|---|---|---|---|
| **A** | **Une ligne sous les trois cases de la feuille Objectifs** : « Ta cible moyenne. Chaque jour du plan s'en écarte un peu : de vraies recettes, et (si tu fais du sport) plus de glucides les jours d'entraînement. » | Il voit 75 g ici, 68 g sur le Plan, et lit pourquoi — sans rien qui bouge. | **petit** — un texte, OTA, aucun chiffre ne change |
| B | **Le moteur compte les fibres dans le partage** : les cibles glucides/lipides se calculent sur les kcal moins l'énergie des fibres attendues | La cible du Profil baisse de quelques grammes et dit ce que l'assiette porte en moyenne ; il ne reste que le bruit des recettes (±4 g) et l'effet du sport. ⚠️ Chez Marc la cible lipidique EST la visée du plancher (75 g) : soit elle reste à 75 et ce sont les glucides de la cible qui baissent (~−19 g), soit le plancher se vise aussi sans les fibres — à mesurer avant de choisir. | **moyen** — règle de calcul changée : `ENGINE_REV`, `lib/methodologie.ts`, tests, re-mesure. Aucune kcal ne bouge, donc aucun avertissement. Ne règle pas les jours de sport |
| C | Le Profil affiche la **moyenne servie de la semaine** au lieu de la cible | Les deux écrans se rapprochent en moyenne, mais le Profil change à chaque nouveau plan, et un jour de repos reste à −56 g de glucides | moyen — et la cible disparaît de l'écran |
| D | Le Plan montre **aussi la cible** (« 68 / 75 g ») | L'écart s'affiche tous les jours, 86 % des jours en glucides | petit, mais **déconseillé** : contraire à la règle « un suivi rassure, jamais de pression » |

**Ma reco : A**, et **B** si tu veux que le chiffre du Profil soit celui qu'on sert en
moyenne. A + B se cumulent ; sans sport, B seul suffirait presque.

## Journal du chantier

- 2026-10-19 — découpage posé, segment 1 audité. En attente des arbitrages du fondateur.
- 2026-10-24 — segment 12 (Profil) ouvert à la demande du fondateur : 8 constats. Un premier
  jet codé trop tôt, puis la version discutée : quatre encadrés légers, une feuille-liste par
  encadré (façon A). Codée sur `claude/beautiful-mayer-8eldew`, vue sur le web ; reste à la
  voir sur iPhone.
- 2026-10-25/26 — segment 12 vu au simulateur iPhone, retouché (cf. « Retouches sur iPhone
  et clôture »), fusionné (#406) et publié en 63ᵉ OTA. **Segment 12 CLOS.**
- 2026-10-26 — segment 2 (questionnaire « toi ») audité au simulateur iPhone : 11 constats,
  P1 à P9. En attente des arbitrages du fondateur ; rien codé.
- 2026-10-26 — segment 8, constat 4 (macros Plan ≠ Profil) mesuré sur le moteur : surtout les
  fibres (~75 kcal/j que P/G/L ne portent pas → lipides −4 g, glucides −8 g sans sport), le bruit
  des recettes (±4 g), et le sport (glucides +15 / −56 à −87 g selon le jour, voulu). Pas de défaut
  d'affichage. Quatre options posées, en attente du fondateur.
