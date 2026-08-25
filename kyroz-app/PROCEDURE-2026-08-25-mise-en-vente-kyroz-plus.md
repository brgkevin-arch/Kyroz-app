# Mettre Kyroz+ en vente — procédure fondateur

> **Une étape à la fois.** Chaque étape se termine par *« ce que tu dois voir »* : tant
> que tu ne le vois pas, on ne passe pas à la suivante. Reviens me dire ce que tu as vu,
> même quand c'est différent de ce qui est écrit ici — surtout quand c'est différent.
>
> 🔴 **NE PAS COMMENCER PAR L'ÉTAPE 10.** La date de lancement se pose en dernier, après
> le bac à sable ET après que la revue App Store est acquise. La raison est à l'étape 10,
> et elle vaut un refus Apple provoqué par nous.
>
> ⚠️ **Ce document n'est pas une source, c'est une carte.** Tout ce qui dépend d'Apple ou
> de RevenueCat se RELIT dans leur interface — ce dépôt a déjà annoncé un blocage
> inexistant pendant douze jours parce qu'un état de tiers avait été recopié au lieu
> d'être re-mesuré.

---

## ✅ Étape 0 — FAITE le 2026-08-25, par mesure

`npm run check:abonnements` interroge l'App Store Connect API en **lecture seule** et
confronte ce qu'Apple porte à ce que le code demande. Ce qu'il a trouvé :

| | `kyroz_plus_monthly` | `kyroz_plus_yearly` |
|---|---|---|
| Prix FR | 4,99 € payé d'avance | 39,99 € payé d'avance **+ 3,99 €/mois engagé** |
| Net qui reste | 2,91 € *(taux réduit : 3,53 €)* | 23,33 € *(taux réduit : 28,33 €)* |
| Libellé fr-FR | ✅ présent | ✅ présent |
| Capture de review | 🔴 absente | 🔴 absente |
| État | Métadonnées manquantes | Métadonnées manquantes |
| Niveau de groupe | **1** | **2** |
| Partage familial | inactif | inactif |

Les deux identifiants que le code demande existent bien chez Apple, au caractère près.

**Trois choses que ce relevé change**, et qui étaient fausses dans la première version de
ce document :

1. 🔴 **Les libellés FR sont DÉJÀ écrits.** Ce n'est donc pas eux qui retiennent
   « Métadonnées manquantes » — c'est la **capture de review**, absente sur les deux.
   Elle montre le paywall, donc elle demande un binaire. **Le bac à sable ne peut pas
   passer avant le build** : ce document promettait le contraire.
2. 🔴 **La description du mensuel vend une fonctionnalité qui n'existe plus** :
   *« Objectif daté, transformation, banque »*. La banque de calories est sortie de
   Kyroz+ le 2026-08-18 et éteinte le même jour. C'est un texte lu au moment d'acheter.
   → nouvelle **étape 3-bis**, et elle n'attend rien.
3. ✅ **Le 3,99 € est confirmé, pas supposé** : Apple le porte comme `planType: MONTHLY`
   sur l'annuel. La collision décrite à l'étape 1 est réelle.

⚠️ **Ce tableau périme.** Il se relit avec `npm run check:abonnements`, il ne se recopie pas.

---

## La grille tarifaire décidée (2026-08-25)

|  | Early bird | Standard |
|---|---|---|
| Mensuel | **3,99 €** | 4,99 € |
| Annuel | **29,99 €** | 39,99 € |

Ce que ça donne à l'écran, calculé et non estimé :

| Formule | Équivalent mensuel | Économie vs son mensuel |
|---|---|---|
| Annuel early bird | 2,50 €/mois | −37 % |
| Annuel standard | 3,33 €/mois | −33 % |

Les deux passent le plancher de −33 % qu'on s'est fixé (en dessous, les abonnés acquis
par forte remise résilient davantage au renouvellement, et l'app s'ancre à un prix bas
dont on ne remonte plus). L'avantage early bird lui-même est de **−25 % sur l'annuel**
et **−20 % sur le mensuel**.

**Les deux produits existants (4,99 € / 39,99 €) deviennent le tarif STANDARD.** On ne
touche pas à leur prix : on crée deux produits early bird à côté. C'est la règle qui
tient la promesse écrite dans les CGU §3 — *un identifiant produit par palier tarifaire*.
Changer le prix d'un produit qui a déjà des abonnés rendrait cette phrase fausse.

---

## L'ordre, et ce qui dépend de quoi

| # | Étape | Ne peut pas commencer avant |
|---|---|---|
| 0 | ✅ Relever l'état réel | *fait* |
| 1 | Trancher l'annuel payé au mois | 0 |
| 2 | Créer les deux produits early bird | 1 |
| 3 | Libellés FR sur les deux NOUVEAUX produits | 2 |
| 3-bis | ✅ Corriger la description du mensuel | *fait* |
| 3-ter | Vérifier le sens des changements de formule | — *(constat)* |
| 4 | RevenueCat : rattacher les nouveaux produits | 2 |
| 5 | Le code recopie les identifiants *(moi)* | 2 |
| 6 | Build natif + capture de review | 5 |
| 7 | Bac à sable | 4, **6** — la capture bloque « Prêt à soumettre » |
| 8 | Apple Small Business Program | — *(en parallèle)* |
| 9 | Médiateur → les trois surfaces légales | — *(en parallèle)* |
| 10 | Poser la date de lancement | 7, 9, **et revue App Store acquise** |

Les étapes 8 et 9 ne bloquent rien d'autre que la vente elle-même : lance-les quand tu
veux, en parallèle du reste.

---

## Étape 0 — Relever l'état réel ✅

**Rien à faire à la main** : `npm run check:abonnements` le fait, en lecture seule, et le
résultat est en tête de ce document. À relancer après chaque étape qui touche Apple.

⚠️ **Le script n'écrit jamais rien**, et c'est délibéré : la clé porte le rôle App Manager,
donc elle *pourrait* créer des produits et soumettre l'app. Un identifiant produit ne se
supprime jamais chez Apple — une erreur d'écriture se garderait à vie. Les créations se
font dans l'interface, qui montre les paliers de prix imposés et les marchés indisponibles.

⚠️ **`kyroz_plus_yearly`, pas `_annual`.** Ce dépôt a payé quatre identifiants faux, et
chacun a échoué de la même façon : en **silence**. Le produit n'est pas trouvé, l'achat
répond « indisponible », le prix affiché reste le tarif de repli — et rien ne rougit
nulle part. Recopie ce que tu lis, ne retape pas de mémoire.

---

## Étape 1 — Trancher l'annuel payé au mois

**Confirmé par l'étape 0** : Apple porte bien deux prix sur `kyroz_plus_yearly`, l'un
`UPFRONT` (39,99 €), l'autre `MONTHLY` (3,99 €).

**Le contexte** : quand l'annuel a été créé le 2026-07-30, Apple a demandé **deux prix** —
un « payé d'avance » (39,99 €) et un « payé au mois avec engagement 12 mois » (3,99 €/mois,
soit 47,88 € sur l'année). L'app **n'a jamais affiché** cette seconde formule : l'écran
Kyroz+ en présente deux, pas trois. Personne ne l'a donc jamais vue.

**La décision** : la retirer.

Deux raisons, et la première est nouvelle. Avec l'early bird mensuel à **3,99 €**, on
aurait deux offres au même prix mensuel : l'une sans engagement, l'autre qui enferme
douze mois. La seconde devient strictement absurde — et c'est exactement le genre de
détail qui produit des remboursements et des avis « publicité trompeuse ». La seconde
raison : trois formules divisent l'attention au moment où l'on veut mettre l'annuel en
avant.

**Quoi** : sur la fiche de `kyroz_plus_yearly`, retirer le prix mensuel avec engagement,
en ne gardant que le paiement d'avance.

🔴 **À FAIRE DANS L'INTERFACE, PAS PAR L'API — et c'est une mesure, pas une préférence.**
Relevé le 2026-08-25 : ce mode de paiement existe sur **173 territoires** (contre 175 pour
le paiement d'avance — Singapour et les États-Unis ne le proposent pas). Par l'API, c'est
**173 opérations** une par une, chacune pouvant échouer à mi-parcours et laisser le
produit dans un état mixte. L'interface le traite comme UN réglage du produit.
➡️ C'est le cas type où le dashboard bat l'automatisation : quand une seule case couvre
ce qui demande cent appels, l'automatisation n'ajoute que du risque.

**Ce que tu dois voir** : `npm run check:abonnements` n'affiche plus qu'une ligne de prix
sur l'annuel, « 39,99 € — payé d'avance ».

⚠️ **Si Apple ne permet pas de le retirer**, ne force pas et dis-le moi. Le repli est
simple et sans risque : cette formule n'étant affichée nulle part dans l'app, elle reste
invisible. On tranchera alors entre « la laisser dormir » et « décaler l'early bird
mensuel à un autre prix ».

---

## Étape 2 — Créer les deux produits early bird

**Où** : même groupe d'abonnement `Kyroz+`. **Surtout pas un autre groupe** — deux
abonnements d'un même groupe s'excluent, ce qui est le comportement voulu (on ne peut pas
être abonné deux fois), et le passage de l'un à l'autre est géré par Apple.

**Quoi** : créer deux abonnements auto-renouvelables.

| Product ID | Nom de référence | Durée | Prix |
|---|---|---|---|
| `kyroz_plus_monthly_early` | Kyroz+ mensuel — lancement | 1 mois | 3,99 € |
| `kyroz_plus_yearly_early` | Kyroz+ annuel — lancement | 1 an | 29,99 € |

**Sur le nommage** : les deux produits existants restent **sans suffixe** et deviennent le
standard. C'est asymétrique, et c'est assumé — un identifiant de produit ne se renomme
pas chez Apple, donc on ne touche pas à ce qui existe. Le palier suivant, le jour venu,
s'appellera `..._v3`.

**Ce que tu dois voir** : quatre abonnements dans le groupe `Kyroz+`.

⚠️ Si Apple redemande un prix mensuel avec engagement pour l'annuel early bird, applique
la même décision qu'à l'étape 1.

---

## Étape 3 — Libellés FR sur les deux NOUVEAUX produits seulement

🔴 **Corrigé après mesure.** Ce document disait « sur les quatre produits ». Les deux
existants ont **déjà** leur nom et leur description en fr-FR : il n'y a rien à y faire.

**Quoi** : sur les deux produits early bird créés à l'étape 2, renseigner le nom
d'affichage et la description, en français.

⚠️ **Reprends la formulation de l'annuel existant** — *« Pilote ton objectif dans le
temps »* — et surtout **pas** celle du mensuel, qui est fausse (voir l'étape 3-bis).

**Ce que tu dois voir** : `npm run check:abonnements` affiche un libellé fr-FR sur les
quatre. L'état restera « Métadonnées manquantes » sur les quatre tant que la capture de
review manque — c'est normal, et c'est l'étape 6.

---

## Étape 3-bis — Corriger la description du mensuel ✅ FAITE le 2026-08-25

🔴 **La fiche produit vendait une fonctionnalité qui n'existe plus.** La description de
`kyroz_plus_monthly` disait :

> Objectif daté, transformation, banque

La **banque de calories** est sortie de Kyroz+ le 2026-08-18 et éteinte le même jour
(`featureFlags.ts`). C'était un texte lu **au moment d'acheter**, sur la boutique — pas
un commentaire interne. La règle « aucune promesse qui ne soit servie » ne s'arrête pas
à la frontière de l'app.

✅ **Corrigée par l'API** (`PATCH /v1/subscriptionLocalizations/…`, HTTP 200), et
vérifiée par `npm run check:abonnements` : les deux produits portent désormais
**« Pilote ton objectif dans le temps »**. Ce texte n'est pas inventé — c'est celui que
le fondateur avait écrit pour l'annuel, repris mot pour mot : les deux formules donnent
accès exactement à la même chose, elles doivent le dire pareil.

---

## Étape 3-ter — Vérifier le sens des changements de formule

**Ce que l'étape 0 a relevé** : le mensuel est au **niveau 1** du groupe, l'annuel au
**niveau 2**. Chez Apple, le niveau 1 est le **plus haut** — et le sens compte :

| Changement | Effet |
|---|---|
| vers un niveau **plus haut** | montée en gamme, **immédiate**, au prorata |
| vers un niveau **plus bas** | descente, appliquée **à la fin de la période en cours** |

Avec cet ordre, quelqu'un qui passe du mensuel à l'annuel — exactement ce qu'on veut
encourager — **attendrait la fin de son mois** au lieu de basculer tout de suite.

⚠️ **À CONSTATER avant de toucher quoi que ce soit.** Je donne ici la règle telle que je
la comprends, pas un fait mesuré : l'interface d'App Store Connect nomme et ordonne ces
niveaux à sa façon. Ouvre le groupe `Kyroz+`, regarde comment il présente l'ordre des
formules, et dis-moi ce que tu vois. Si l'ordre est bien inversé, il se corrige — c'est
un réglage de groupe, pas un produit à recréer.

---

## Étape 4 — RevenueCat : rattacher les deux nouveaux produits

**Où** : dashboard RevenueCat → projet *Kyroz* → app App Store (`app.kyroz.mobile`).

**Quoi** : déclarer les deux nouveaux identifiants produits, puis les attacher à
l'entitlement **`premium`** — celui qui porte déjà les deux existants.

**Ce que tu dois voir** : l'entitlement `premium` contient **quatre** produits.

⚠️ **`premium`, en minuscules, sans espace.** L'onboarding RevenueCat l'avait nommé
« Kyroz Premium » et rempli de faux produits de test — corrigé le 2026-08-02. Un
identifiant qui voyage dans une URL n'a pas d'espace, et le nom commercial se règle
ailleurs.

⚠️ **C'est l'entitlement qui décide, pas le produit.** Le code demande « cette personne
a-t-elle `premium` ? » — il ne demande jamais « laquelle des quatre formules ? ». C'est
ce qui fait qu'un early bird et un abonné standard ont exactement le même accès, et c'est
voulu.

---

## Étape 5 — Le code recopie les identifiants *(c'est moi)*

**Rien à faire de ton côté.** Je mets à jour `lib/premium.ts` avec les deux identifiants
early bird — **recopiés depuis le dashboard**, jamais inventés ici. C'est la règle qui a
manqué quatre fois.

Ce que ça change : l'écran affichera le palier en vente, avec son équivalent mensuel et
son économie recalculée (2,50 €/mois, −37 %).

ℹ️ **Ce changement part en OTA**, sans nouvelle revue Apple : ce sont des chaînes de
caractères en JavaScript. C'est aussi ce qui permettra de basculer du palier early bird
au palier standard le jour du retrait, sans build ni revue. Le SDK d'achat, lui, est
natif et il est déjà dans le binaire.

---

## Étape 6 — Build natif et capture de review

**Pourquoi il en faut un** : la capture de review qu'Apple exige pour chaque abonnement,
c'est **l'écran de paywall** — donc il doit exister dans un binaire, avec les bons prix.

⚠️ **Un build est une PHOTO de `main`, pas un « gros » ou un « petit » build.** Avant de
le lancer : arbre propre, `HEAD` égal à `origin/main`, aucune PR ouverte. Et après : le
commit du build doit encore valoir `origin/main`. Ce dépôt a vu un binaire périmé **six
minutes** après son lancement.

**Ce que tu dois voir** : les quatre produits passent en « Prêt à soumettre ».

---

## Étape 7 — Bac à sable

**Jamais fait à ce jour.** C'est le vrai reste du chantier — pas le code.

**Où** : App Store Connect → *Utilisateurs et accès → Sandbox*, puis l'app installée
depuis le build de l'étape 6.

**Trois choses à prouver, et elles ne se prouvent QUE là** :

1. **L'achat aboutit et débloque** — l'objectif daté et les photos s'ouvrent.
2. **« Restaurer mes achats » fonctionne.** Sans cette preuve, c'est un rejet au titre de
   la Guideline 3.1.1.
3. **L'abonnement suit le COMPTE, pas le téléphone.** Se déconnecter doit retirer le
   droit ; se reconnecter sur un autre appareil doit le rendre sans repasser à la caisse.
   C'était le défaut corrigé le 2026-08-02 : sur un téléphone partagé, la personne
   suivante héritait de l'abonnement de la précédente.

**Ce que tu dois voir** : les trois, dans cet ordre. Si le premier échoue avec
« indisponible », **relis l'étape 3 avant de suspecter le code**.

---

## Étape 8 — Apple Small Business Program *(en parallèle)*

**Pourquoi, en chiffres relevés chez Apple** (étape 0) — ce n'est plus un ordre de
grandeur, c'est ce qu'Apple renvoie pour ces produits :

| Formule | Net aujourd'hui | Net au taux réduit | Écart |
|---|---|---|---|
| Mensuel 4,99 € | 2,91 € | 3,53 € | **+21 %** |
| Annuel 39,99 € | 23,33 € | 28,33 € | **+21 %** |

Sans le programme, ce taux réduit ne s'applique qu'**après un an** d'abonnement continu.
Avec, il s'applique **dès le premier jour**. C'est purement déclaratif.

**Où** : App Store Connect → *Business* → App Store Small Business Program.

**Ce que tu dois voir** : l'inscription acceptée. L'équivalent Google Play se fait le
jour où le compte Play existe.

⚠️ **À faire avant la première vente.** Le taux s'applique à partir de l'acceptation, il
ne se rattrape pas sur les mois précédents.

---

## Étape 9 — Médiateur de la consommation, puis les trois surfaces légales *(en parallèle)*

**Pourquoi** : obligatoire (art. L.612-1) **avant la première vente**, pour tout
professionnel qui vend à des consommateurs. Compter 50 à 200 €/an.

⚠️ **Ce n'est PAS une ligne à créer, c'est une ligne à COMPLÉTER.** Les CGU §10 citent
déjà « un médiateur de la consommation » de façon générique — or la loi demande de
**nommer** celui auquel on a adhéré, avec ses coordonnées.

**Une fois l'adhésion faite**, le texte se corrige à **un seul endroit**,
`constants/legal.ts`, puis se régénère. Trois surfaces en dépendent :

| Surface | Comment elle se met à jour |
|---|---|
| L'app | `constants/legal.ts` |
| `public/legal.html` | `npm run gen:legal` |
| **`kyroz.app/legal.html`** | `KYROZ_SITE=~/kyroz-site npm run gen:legal` — **dépôt séparé** |

🔴 **La troisième est déjà en retard.** La clause de tarif bloqué ajoutée le 2026-08-25
n'est pas encore sur `kyroz.app` : la régénération a été lancée sans `KYROZ_SITE`. Deux
textes de CGU différents en ligne, ça ne peut pas rester ainsi avant la vente.

---

## Étape 10 — Poser la date de lancement

**C'est la dernière, et elle ne se recule jamais.**

**Ce qui se passe le jour où on la pose** (`PAYWALL_LAUNCH`, `lib/premium.ts`) :

| Compte | Ce qu'il voit |
|---|---|
| Créé **avant** la date | tout, gratuitement, **à vie** — promesse contractuelle, CGU §3 |
| Créé **après**, abonné | tout |
| Créé **après**, non abonné | le gratuit, plus l'écran Kyroz+ |

🔴 **LE PIÈGE, ET IL VAUT UN REFUS APPLE.** Le relecteur App Review se connecte avec le
compte sentinelle `review@kyroz.app` — un compte créé **au moment où il teste**, donc
postérieur à la date, donc non grand-péré. Il tombera sur le paywall. Si les produits ne
sont pas « Prêt à soumettre » (étape 3) et le bac à sable pas passé (étape 7), son bouton
d'achat répondra **« indisponible »**. Motif de refus, et provoqué par nous.

➡️ **Attendre que la revue App Store soit acquise.** (La revue *bêta* TestFlight, elle,
l'est depuis le 2026-08-03 : builds et testeurs suivants n'y repassent pas. Ce sont deux
circuits différents, ne pas confondre les deux.)

⚠️ **Ne jamais reculer cette date une fois posée** : ça déverrouillerait des comptes qui
paient, et verrouillerait des comptes à qui on a promis la gratuité.

ℹ️ **La clé et la date sont deux interrupteurs séparés, et c'est délibéré.** La clé
RevenueCat est **déjà posée** dans les variables EAS de production : l'app *peut*
encaisser. La date, elle, est encore `null` : rien n'est verrouillé pour personne. Poser
la date est le seul geste qui ouvre la vente.

---

## Ce qui doit rester vrai, quoi qu'il arrive

- **Le calcul, les planchers et les avertissements restent gratuits.** Sans pesée
  gratuite, le TDEE ne se corrige jamais et la perte trop rapide n'a plus de signal.
- **Ce qui est sorti gratuit reste gratuit.** La répartition macro entraînement/repos,
  la régénération d'un repas, la liste de courses, l'historique : livrés gratuits, ils
  le restent. C'est la régression que les avis sanctionnent le plus durement.
- **Aucun compte à rebours, aucune fausse rareté, aucune perte de série comme levier.**
  L'écran Kyroz+ n'en a pas aujourd'hui ; il ne doit pas en gagner.
- **Le taux de conversion sera bas, et ce n'est pas un signal d'échec.** Le gratuit de
  Kyroz est plus généreux que celui de la plupart des concurrents : c'est un pari
  d'acquisition assumé. Ne pas corriger en verrouillant rétroactivement au deuxième mois.
