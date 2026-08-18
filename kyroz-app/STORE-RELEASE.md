# Kyroz — Dossier de sortie stores (App Store + Google Play)

> Playbook de première soumission. **Ce qui est codable est fait** (config, icônes,
> splash, `eas.json`, URL de confidentialité). Il te reste des actions qui demandent
> ton **identité, ton argent, ou un device** (comptes, screenshots, build). Tout est
> ci-dessous, dans l'ordre.

---

## 0-ter. ▶️ REPRISE — état au 2026-08-11, 21 h

> Écrit à la demande du fondateur, qui termine **dans une autre session**. Objectif de
> ce bloc : qu'on puisse reprendre sans relire toute la journée, et surtout **sans
> refaire les erreurs qu'elle a coûtées**.

**Ce qui est acquis, et qu'il ne faut pas re-vérifier :**

| | |
|---|---|
| `main` | `1047b9f` — **1 444 tests verts / 87 fichiers**, `tsc` propre, **0 PR ouverte** |
| Build **(6)** | `ceec1b17`, commit `1047b9f`, `finished`, **téléversé à App Store Connect** |
| Build **(5)** | aussi chez Apple — **à TESTER**, jamais à envoyer en revue (notes du relecteur incohérentes) |
| **DSA** | ✅ **validée depuis le 30 juillet** (27 pays, « Active »). Elle a été présentée à tort comme bloquante pendant douze jours |
| Contrats, banque, fiscal | tous **actifs** → **plus aucun verrou administratif** |
| OTA | **10ᵉ publiée** le 2026-08-11 (verre, groupe `7ac2496a`) |

**Ce qui reste, dans cet ordre — et l'ordre n'est pas négociable :**

1. 🧑 **Retouches front** annoncées le 11 au soir. **Rien ne se builde avant.**
2. 🤖 **UN build (7)**, une fois le code figé. Pas deux.
3. 🤖 **Regénérer les captures** — les actuelles datent du 10 août 19 h 41, donc d'avant
   le verre : elles montrent une barre d'onglets opaque. À faire **après** le (7), pour
   qu'elles ne périment pas une seconde fois.
4. 🧑 Juger les captures · remplir les formulaires ASC (tout est rédigé §3–6, §11) ·
   **sélectionner le (7)** · « Submit for review ».

🔴 **LES TROIS PIÈGES QUE CETTE JOURNÉE A PAYÉS — les relire avant d'agir :**

1. **Un binaire se périme PENDANT qu'il compile.** Trois builds lancés le 11 ; les deux
   premiers étaient morts à la naissance, dépassés par des merges d'autres sessions en
   **six minutes**. ➡️ Avant un build : `git status` vide **et** `HEAD == origin/main`
   **et** `gh pr list --state open` à **0** (+ `git worktree list`). Après : le commit du
   build doit encore valoir `origin/main`. **Un build est une PHOTO de `main`** — on n'en
   regroupe pas plusieurs, on en fait un seul quand plus rien ne bouge.
2. **Un état qui dépend d'un TIERS ne se recopie pas, il se relit.** La DSA, la revue
   bêta externe, un statut TestFlight : ces fiches ont menti trois fois dans la journée,
   toujours dans le sens qui fait renoncer ou qui rassure. Le mot « était » dans une
   phrase signale qu'elle a cessé d'être une mesure.
3. **Une sortie vide n'est pas une panne.** `eas-cli` bufferise hors terminal : un
   `eas submit` en arrière-plan n'a rien écrit pendant des heures et avait pourtant
   réussi. Vérifier que le processus VIT avant de conclure qu'il est bloqué.

⚠️ **Point ouvert, non tranché** : le (6) est visible en **interne** mais pas pour les
**testeurs externes**. Trois causes possibles, indiscernables sans l'écran d'ASC — voir
la note dans `AGENTS.md` (revue bêta). **Ne pas conclure sans relever le statut affiché.**
Ça ne bloque ni la revue App Store, ni la sortie.

---

## 0-bis. ▶️ LA SÉQUENCE DE DEMAIN — 2026-08-10

> Écrite le 2026-08-09 à minuit, à la demande du fondateur. Objectif : **soumis à
> l'App Store**, pas *publié* — la revue Apple prend de 24 h à 7 jours et ça ne
> dépend pas de nous.
>
> 🧑 = toi seul · 🤖 = moi en session. **Une étape à la fois** : ne pas enchaîner
> deux étapes 🧑 sans que la précédente soit constatée faite.

**Ce qui contraint l'ordre, et c'est une seule chose.** Le relecteur Apple voit le JS
**embarqué** dans le binaire (il ouvre l'app une fois ; une OTA ne s'applique qu'au
lancement suivant). Donc **tout le code doit être sur `main` avant le build**, et les
captures doivent montrer ce même code.

⚠️ **Les captures, elles, ne bloquent QUE le remplissage de la fiche** — remarque du
fondateur, 2026-08-10, et elle corrige une première rédaction qui les plaçait avant le
build sans raison. Le build n'en a pas besoin. Comme il passe ~1 h en file d'attente,
elles se génèrent **pendant** qu'il tourne : une heure gagnée, gratuitement.

| # | Qui | Étape | Pourquoi ça ne peut pas passer avant |
|---|---|---|---|
| 1 | ~~🧑~~ | ~~**Trancher la célébration de série**~~ ✅ **DÉJÀ TRANCHÉ le 2026-08-09** — c'est le **nombre de jours** en `Type.hero` (`StreakCelebration.tsx`), et le motif n'était pas esthétique : six emblèmes, un par palier, sont une échelle de badges, donc de la *collection*, que CLAUDE.md §5 interdit. ⚠️ Cette ligne a survécu **un jour** à sa propre décision et annonçait « la seule décision qui bloque la journée » alors qu'elle ne bloquait plus rien | — |
| 2 | 🧑 | `git checkout main && git pull` **dans le dépôt principal** | il a plusieurs merges de retard, et c'est depuis CET arbre que se prennent les captures **et** le build |
| 3 | 🤖 | ✅ **(6) FAIT, À JOUR ET TÉLÉVERSÉ le 2026-08-11** (`ceec1b17`, commit `1047b9f`, `finished` à 20 h 37, envoyé à App Store Connect). C'est **le seul des trois** qui contienne E39 (retrait du portail) et E40 (page méthodologie) — donc le seul cohérent avec les notes du relecteur (§11). 🔴 **MAIS IL PÉRIMERA DÈS QUE LE FRONT BOUGERA** : le fondateur a annoncé le 2026-08-11 au soir vouloir retoucher l'interface avant les captures. ➡️ **Un build (7) sera nécessaire APRÈS ces changements, et un seul.** 🔴 **ET C'EST LA LEÇON DE LA JOURNÉE : un binaire se périme PENDANT qu'il compile.** Trois builds ont été lancés le 2026-08-11 ; les deux premiers étaient morts à la naissance — le (4) (`10d6096`, 13 h 18) a été dépassé par #92 **six minutes** après son lancement puis par #94 ; le (5) (`770187d`, 13 h 41) par #96 et #97. La cause n'est pas le système, c'est le contrôle : on vérifiait « l'arbre est propre » sans vérifier « rien n'est en vol ». Les sessions parallèles mergent pendant les ~6 minutes de compilation. ➡️ **DEUX mesures avant tout build, jamais une** : `git status` vide **et** `HEAD == origin/main` **et** `gh pr list --state open` à **0** — plus `git worktree list` pour savoir qui travaille. ➡️ **Et une APRÈS le build** : `git rev-parse origin/main` doit encore valoir le commit du build. C'est ce contrôle qui a validé le (6). ⚠️ **Un build n'est ni gros ni petit** — c'est une PHOTO de `main` à un instant. On n'en « regroupe » pas plusieurs : le bon geste est d'en faire **un seul, quand le code est figé**. ⚠️ Un build se constate avec `npx eas-cli build:list --platform ios` **depuis `kyroz-app/`**, et **on lit son COMMIT, pas sa date** — cette case a annoncé « à faire » alors qu'il était fait, puis « fait » sans voir qu'il était périmé. | premier binaire à porter la clé RevenueCat. **Ne PAS monter `expo.version`** : ça couperait la ligne OTA vers le build 3 des testeurs |
| 4 | 🤖 | ✅ **Gabarit iPhone corrigé et captures REFAITES le 2026-08-10** (`430×932` → sortie mesurée **1290×2796**, feature graphic 1024×500). ✅ **Et l'iPad AUSSI : 5 PNG en 2048×2732, mesurés au `sips` le 2026-08-10.** ⚠️ Cette ligne disait « le dossier iPad est toujours vide » — c'était vrai à l'écriture, faux depuis, et c'est le TROISIÈME état successif de cette même case (« générés » → « vide, jamais rien contenu » → « générés, mesurés »). Le disque tranche, pas la fiche | les 5 captures dataient du **30 juillet**, donc d'avant six passes de design **et** d'avant la refonte du Profil ; elles sont désormais prises sur `main` du 10 août. Le dossier iPad est **toujours vide** |
| 5 | 🧑 | Regarder les 10 captures et dire si elles vendent l'app | le seul jugement que je ne peux pas rendre à ta place |
| 6 | 🧑 | Formulaires App Store Connect : confidentialité (§4), classification **17+** (§6), fiche FR (§3), note relecteur (§11), et **les captures** | tout est déjà rédigé ci-dessous — c'est du copier-coller, pas de la rédaction |
| 7 | 🧑 | « Submit for review » | — |

**Compter ~1 h entre « build lancé » et « build sélectionnable dans la fiche »** (file
EAS + traitement App Store Connect). C'est le seul aléa qui ne dépend ni de toi ni de
moi ; s'il coince, c'est un jour de retard, pas une semaine. C'est aussi la fenêtre
dans laquelle l'étape 4 se glisse.

**Deux gestes indépendants, à faire quand tu veux :**
- 🧑 coller `supabase/emails/reinitialisation.html` dans le dashboard Supabase (A30,
  5 min) — sans lui l'e-mail part quand même, mais avec l'habillage Supabase par défaut ;
- 🤖 passer le nouvel écran `/avis` au **simulateur** avant le build (accepté par le
  fondateur le 2026-08-10, ~10 min). Motif : son champ multiligne et son
  `KeyboardAvoidingView` n'ont été vus que dans le panneau navigateur, et le projet a
  déjà payé une fois pour avoir cru le web sur un comportement natif (CLAUDE.md §5). Les
  mécaniques de la feuille Réglages, elles, sont celles de `Sheet`, déjà éprouvé.

🚫 **CE QU'ON NE TOUCHE PAS, ET CE N'EST PAS UN OUBLI :**
- **`PAYWALL_LAUNCH` reste `null`.** Poser une date pendant la revue ferait tomber le
  relecteur sur un paywall : il crée son compte au moment du test, donc APRÈS la date,
  donc non grand-péré.
- **L'auth anonyme reste active.** C'est la porte de l'accès relecteur, décrite dans les
  notes de soumission (§11). Son remplacement est daté « le lendemain de la revue passée ».
- **La vague catalogue vegan / vegan+SG part en OTA**, pas dans ce binaire — décision
  fondateur du 2026-08-09, motif et bornes du raisonnement dans `AGENTS.md` **D23**.
- ~~**La refonte du Profil** passe APRÈS la soumission.~~ ❌ **PLUS VRAI — elle est
  LIVRÉE** (PR #69, mergée le 2026-08-10 : roue dentée, feuille Réglages, écran
  « Donner mon avis »). Décision du fondateur dans la nuit : *« vasy on code ça ce
  soir »*. ➡️ **Conséquence sur cette séquence : les captures doivent l'inclure**, donc
  l'étape 2 (`git pull`) n'est plus une hygiène, c'est un prérequis dur — sans elle,
  les captures montreraient un Profil qui n'existe plus et un écran qui n'existe pas
  encore. Détail : `AGENTS.md` **E25**.

---

## 0. État — prêt vs à toi

| Élément | État |
|---|---|
| Identité app (`bundleIdentifier`/`package` = `app.kyroz.mobile`, version 1.0.0) | ✅ code |
| Icône (1024², sans alpha), icône adaptative Android, splash sombre | ✅ code |
| `eas.json` (profils dev/preview/production + submit) | ✅ code |
| Permission micro parasite retirée ; photos = local-only | ✅ code |
| URL politique de confidentialité (HTTP 200) | ✅ en ligne |
| Textes de fiche (FR), réponses confidentialité, classification | ✅ ci-dessous (§3–6) |
| **Comptes développeur Apple + Google** | ⛔ **toi** (§1) |
| Screenshots (iPhone + iPad 13") + feature graphic | 🔴 **À REFAIRE : ELLES DATENT D'AVANT LE VERRE.** Les 6 PNG iPhone sont horodatés **2026-08-10 19 h 41**, donc antérieurs à E36 (2026-08-11) — la barre d'onglets y est **opaque**, alors que l'app en installe une **translucide** sur iOS 26+. Ce n'est pas trompeur au sens d'Apple, mais c'est le seul changement du 11 qui SE VOIE sur une capture. ➡️ Les regénérer **après** les retouches front annoncées le 11 au soir, jamais avant : sinon elles périment une seconde fois. *(État antérieur, toujours vrai sur le reste :)* 🟡 **iPhone REFAIT le 2026-08-10, iPad toujours à faire.** `test/store/` : 5 PNG + le feature graphic, regénérés sur `main` du 10 août — sortie **mesurée** à `1290×2796` (et 1024×500 pour le feature graphic), après correction de `PHONE` à `430×932`. *(Ils dataient du 30 juillet 21:59, d'avant six passes de design et d'avant la refonte du Profil.)* ✅ `test/store-ipad/` : **5 PNG en 2048×2732**, générés et **mesurés** le 2026-08-10. *(Cette case a annoncé « générés » pendant huit jours alors que le dossier était vide, puis « vide » après qu'il a été rempli : la seule source qui vaille est `sips` sur les fichiers.)* |
| Accès reviewer (code) | ✅ code — toi : poser le secret au build (§9) |
| **Lancer le build EAS** | ✅ **(6) fait, à jour et TÉLÉVERSÉ** (`ceec1b17`, commit `1047b9f`, 2026-08-11 20 h 37) — le seul des trois à porter E39 et E40. Le (5) est aussi chez Apple, mais **ne doit PAS partir en revue** (notes du relecteur incohérentes). ⚠️ **Un (7) sera requis après les retouches front annoncées le 11 au soir** — et un seul (§0-bis, étape 3) |

---

## 1. Comptes développeur (bloquant — argent + identité, prévoir des délais)

- ✅ **Apple Developer Program — FAIT (2026-07-30).** Compte ouvert et payé.
  > ⚠️ **Payer les 99 € n'autorise PAS encore à vendre.** Ce sont deux choses
  > distinctes, et c'est le piège classique :
  > - les **99 €/an** = l'adhésion, qui permet de *publier* une app ;
  > - le **Paid Applications Agreement** (App Store Connect → *Business* →
  >   *Agreements*) = le contrat de vente, qui permet d'*encaisser*. Il réclame
  >   tes coordonnées **bancaires** et **fiscales**, et tant qu'il est en
  >   « Pending », **aucun abonnement ne peut être créé ni vendu** — même app
  >   publiée. C'est LUI qui bloque Kyroz+, pas l'adhésion.
- ✅ **Google Play Console — FAIT (2026-07-30).** Compte payé, téléphone vérifié,
  site `kyroz.app` validé via Google Search Console (propriété **Domaine**, même
  compte Google que la console — sinon la demande de validation part vers un autre
  propriétaire et on tourne en rond).
  > ### 🚫 COMPTE **PERSONNEL** ASSUMÉ — décision fondateur 2026-07-30, ne pas rouvrir
  > Le passage en compte **organisation** a été étudié puis **abandonné**, et la raison
  > n'est pas la paresse : elle est dans le registre. Fiche INPI de l'entreprise —
  > **forme juridique « Entrepreneur individuel »**, **dénomination « Kévin BERGER »**,
  > adresse `2 RUE du Moulin 64570 Arette`, nom **commercial** « Kyroz ».
  >
  > Les deux bénéfices attendus s'effondrent sur cette fiche :
  > - ❌ « l'adresse perso ne sera plus publiée » — l'adresse de l'entreprise **EST** le
  >   domicile. Perso ou organisation, c'est la même qui s'affiche.
  > - ❌ « le nom affiché sera celui de la structure » — la dénomination légale **EST**
  >   le nom du fondateur. « Kyroz » n'est qu'un nom commercial.
  >
  > Ne restait que l'exemption des 12 testeurs, pour 1 à 2 semaines de D-U-N-S et un
  > risque de refus réel : **Apple exclut explicitement l'entreprise individuelle** de
  > ses comptes organisation (« must be recognized as a legal entity… DBAs, fictitious
  > businesses, trade names are not accepted »), et rien ne garantit que Google soit
  > plus souple. Le test fermé, lui, est **certain** et démarre tout de suite.
  >
  > 💡 **Si l'adresse publiée devient un problème**, le levier n'est ni Apple ni Google :
  > c'est une **domiciliation** d'entreprise (quelques €/mois), qui change ce qui est
  > publié PARTOUT — INPI, stores, mentions légales. Décision d'entreprise, pas d'app.
  - ⚠️ **Piège délai** : depuis nov. 2023, un **compte personnel** neuf doit faire
    tester l'app par **au moins 12–20 testeurs pendant 14 jours** avant de pouvoir
    passer en production. **À anticiper** (recrute tes testeurs tôt). Un compte
    **organisation** (entreprise) n'a pas cette contrainte.

Sans ces deux comptes, rien ne peut être soumis. Le reste (§2–7) peut se préparer en parallèle.

### 1-bis. Créer les abonnements Kyroz+ (ordre IMPOSÉ)

> ## ✅ CÔTÉ APPLE : TERMINÉ (2026-07-30)
> Bundle ID enregistré · fiche d'app créée · Paid Applications Agreement **Actif**
> (compte bancaire + W-8BEN actifs) · groupe `Kyroz+` et les deux abonnements créés
> et tarifés. Reste la **capture de review**, impossible avant que le paywall existe —
> les produits restent en « Métadonnées manquantes ».
>
> ⚠️ **Cette phrase disait « ce qui n'empêche NI RevenueCat NI les tests sandbox ».
> La moitié est établie, l'autre ne l'est pas** (corrigé le 2026-08-02).
> **RevenueCat : confirmé** — le dashboard résout les deux identifiants et affiche
> l'état Apple lui-même (`MISSING_METADATA`), donc la liaison fonctionne.
> **Le bac à sable : JAMAIS VÉRIFIÉ.** Apple ne sert normalement un produit à StoreKit
> qu'à partir de l'état « Prêt à soumettre ». Si c'est le cas, `getProducts()` rendrait
> une liste vide en bac à sable et l'achat afficherait « indisponible » — un échec qu'on
> imputerait à tort au code. ➡️ **Compléter les métadonnées AVANT le test sandbox**
> (nom d'affichage + description localisés FR sur chaque abonnement), pour que la
> question ne se pose pas. Seule la capture de review dépend vraiment du build.
>
> ✅ **Conformité DSA : VALIDÉE** — *App Store Connect → Business → Conformité :*
> « La législation sur les services numériques · **27 pays ou régions** · Active »,
> mise à jour le **30 juillet 2026**. Vérifié sur capture le 2026-08-11.
>
> 🔴 **CETTE LIGNE A ANNONCÉ UN BLOCAGE INEXISTANT PENDANT DOUZE JOURS.** Elle disait
> « était En cours de vérification · tant qu'elle n'est pas validée, aucune
> distribution dans l'UE, donc pas en France ». C'était vrai le jour où ça a été
> écrit ; ça a cessé de l'être le 30 juillet, et **personne n'est allé regarder**.
> Le coût n'est pas nul : ce point a été présenté au fondateur comme *le* chemin
> critique — au-dessus du build — alors qu'il était réglé. Une fiche qui annonce un
> obstacle fait renoncer aussi sûrement qu'un obstacle réel. ➡️ **Un état qui dépend
> d'un TIERS (Apple, une banque, un registre) ne se recopie pas : il se relit.** Et
> le « était » d'une phrase est le signe qu'elle a déjà cessé d'être une mesure.
> Même famille que [prémisse jamais re-mesurée] : la question n'est pas « qu'est-ce
> qui bloque ? » mais « est-ce que ça bloque **encore** ? ».
>
> ✅ **Et les autres prérequis administratifs sont réunis** (même capture) :
> contrat applications **gratuites** Actif · contrat applications **payantes** Actif
> (30 juil. 2026 → 29 juil. 2027) · compte bancaire Actif · formulaires fiscaux
> (W-8BEN + Certificate of Foreign Status) Actifs · 175 pays ou régions.
> ➡️ **Plus aucun verrou administratif** entre le binaire et la soumission.
>
> ⚠️ **Ce que la DSA implique et qui n'est pas réversible** : les coordonnées
> déclarées au titre du statut « trader » sont **publiées sur la fiche App Store**.
> C'est le but du texte — que l'acheteur sache à qui il achète. Pour un fondateur
> solo qui déclare une adresse personnelle, c'est une donnée publique de plus ; une
> adresse de domiciliation est le contournement habituel, et il se décide **avant**
> de remplir le formulaire, pas après.
>
> ℹ️ Redevances en **USD** sur un compte bancaire en **EUR** (Revolut Bank UAB) :
> chaque versement subira une conversion. Changer la devise exige un autre compte →
> **laissé tel quel volontairement**, à rouvrir quand il y aura du revenu réel.

Les produits d'abonnement ne peuvent pas être créés dans le vide : il faut d'abord
un identifiant enregistré, puis une fiche d'app. Dans cet ordre, sinon le menu
« Abonnements » n'apparaît tout simplement pas.

1. **Enregistrer le Bundle ID** — developer.apple.com → *Certificates, IDs & Profiles*
   → *Identifiers* → **+** → *App IDs* → *App*. Bundle ID = **`app.kyroz.mobile`**
   (exactement celui d'`app.json` — une faute de frappe ici se paie par un rejet à
   la soumission). Cocher **In-App Purchase** et **Sign in with Apple** (cf. §2 :
   la seconde est anticipée, elle n'ajoute rien au binaire aujourd'hui). **Ne PAS**
   cocher Push Notifications — les rappels sont locaux.
2. **Créer la fiche d'app** — App Store Connect → *Apps* → **+** → *New App*.
   Plateforme iOS · Nom **Kyroz** · Langue principale Français · Bundle ID celui du
   dessus · SKU libre (ex. `kyroz-ios-001`).
3. **Signer le Paid Applications Agreement** s'il ne l'est pas (cf. encadré ci-dessus).
   **Tant qu'il est « Pending », l'étape 4 est impossible.**
4. **Groupe d'abonnement puis produits** — fiche de l'app → *Monetization* →
   *Subscriptions* → créer un groupe nommé **Kyroz+**, puis dedans :

   | Product ID | Nom de référence | Durée | Prix |
   |---|---|---|---|
   | `kyroz_plus_monthly` | Kyroz+ mensuel | 1 mois | 4,99 € |
   | `kyroz_plus_yearly` | Kyroz+ annuel | 1 an | 39,99 € d'avance **ou 3,99 €/mois** |

   ⚠️ **L'annuel a DEUX modes de paiement** (créés le 2026-07-30) : Apple demande un
   « prix avec facturation à l'avance » ET un « prix mensuel » avec engagement 12 mois.
   Le paywall devra donc présenter **trois** formules, pas deux :

   | Formule | Sur un an | vs mensuel | Engagement |
   |---|---|---|---|
   | Mensuel | 59,88 € | — | aucun |
   | Annuel payé au mois (3,99 €) | 47,88 € | −20 % | 12 mois |
   | Annuel payé d'avance | 39,99 € | −33 % | 12 mois |

   Le piège évité : Apple proposait **4,99 €/mois** par défaut, soit 59,88 € sur
   l'année — exactement le prix du mensuel sans engagement, mais en enfermant le
   client 12 mois. Strictement défavorable, et le genre de détail qui produit des
   remboursements. La contrainte d'Apple est : total ∈ [prix d'avance ; 1,5 × prix
   d'avance], donc ici entre 39,99 € et 59,98 €.
   ℹ️ La facturation mensuelle avec engagement n'est **pas disponible** à Singapour
   ni aux États-Unis — ces marchés ne verront que le paiement d'avance.

   ⚠️ **Les `Product ID` doivent être identiques au caractère près côté Google et
   dans RevenueCat.** C'est la source d'erreur n°1 : un `_yearly` écrit `_annual`
   d'un côté et l'achat échoue en silence à l'exécution.
   Chaque produit réclame en plus un **nom affiché** + une **description** localisés
   FR, et une **capture d'écran de review** (l'écran de paywall — donc à produire
   après le câblage, ou une maquette provisoire).
5. **Google Play Console** → *Monétisation* → *Abonnements* : créer **un** abonnement
   `kyroz_plus` avec **deux base plans** (mensuel / annuel), mêmes prix.
6. **RevenueCat** → nouveau projet → rattacher l'app iOS **et** l'app Android →
   mapper les produits store → **1 entitlement nommé exactement `premium`** +
   **1 offering** contenant les deux packages. Récupérer les 2 clés SDK publiques
   (`appl_…` et `goog_…`) — publiques par conception, transmissibles sans risque.

7. **Poser les deux clés publiques dans EAS.** Elles ne vivent pas dans le dépôt : le
   build les lit depuis les variables d'environnement du projet EAS.
   ```
   npx eas-cli env:create production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY \
     --value appl_xxxxxxxx --visibility plaintext --type string
   npx eas-cli env:create production --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY \
     --value goog_xxxxxxxx --visibility plaintext --type string
   ```
   Répéter avec `preview` pour tester en TestFlight avant la production.
   ⚠️ **`plaintext` est le bon choix, et ce n'est pas de la négligence** : le préfixe
   `EXPO_PUBLIC_` fait inliner la valeur EN CLAIR dans le binaire, que la variable soit
   marquée secrète ou non. N'importe qui peut l'extraire de l'app — c'est prévu, ce sont
   les clés PUBLIQUES du SDK. La marquer « secrète » ne protégerait rien et laisserait
   croire le contraire. ⚠️ **La clé SECRÈTE du dashboard, elle, ne doit JAMAIS approcher
   un build client** ; elle ne sert que côté serveur (webhooks, effacement RGPD).
   ⚠️ **Rien à poser sur le build web** : il n'encaisse pas (`lib/purchases.web.ts`).
8. **Vérifier que le build a bien vu les clés — SUR L'ARTEFACT, pas dans l'app.**
   ```
   npx eas-cli config --profile production --platform ios     # gratuit, sans build
   npx eas-cli env:exec production 'npx expo export --platform ios --clear --output-dir /tmp/x'
   strings -a /tmp/x/_expo/static/js/ios/*.hbc | grep -c 'appl_'
   ```
   La première commande dit quel environnement le profil résout et quelles variables
   sont chargées. La seconde produit le bundle exact qu'un `eas update` enverrait, sans
   rien publier. `strings -a` est obligatoire : c'est du **bytecode Hermes**, un `grep`
   seul rend 0 même quand la clé est là.
   ⚠️ **`--clear` n'est pas décoratif** : le cache de Metro ne s'invalide pas quand la
   valeur d'une `EXPO_PUBLIC_*` change. Sans lui, on mesure le bundle d'avant. Corollaire
   pour publier : **`eas update --clear-cache`**.
   ⚠️ **Ne PAS chercher le nom de la variable** (`EXPO_PUBLIC_…`) : Babel le retire du
   bundle qu'elle soit posée ou non. On cherche la VALEUR.
   🔴 **Et surtout : la version précédente de cette étape était FAUSSE.** Elle disait
   « un bouton *S'abonner* actif = clé lue ». Impossible : tout le bloc d'achat de
   `app/kyroz-plus.tsx` n'est rendu que si `reason === 'locked'`, ce qui exige une date
   dans `PAYWALL_LAUNCH`. Sans date, le bouton n'existe pas — clé ou pas clé. On aurait
   conclu à une clé manquante en regardant un écran qui ne pouvait rien montrer.

✅ **Le code n'attend plus rien — mis à jour le 2026-08-02.** Cette ligne disait qu'il
restait `useEntitlement()` à écrire : c'est fait, ainsi que l'achat, la restauration, les
prix localisés et le **rattachement de l'abonnement au compte** (`lib/purchases.ts`,
`hooks/usePremium.ts`, `app/kyroz-plus.tsx`).
À la fin de l'étape 6, il reste donc à **poser les clés publiques** (étape 7), faire un
**build natif** (module natif → ni Expo Go ni OTA) et **tester en bac à sable**.

🧪 **Ce que le bac à sable doit prouver, et qui ne se prouve QUE là** — trois choses, pas
une. (1) L'achat aboutit et débloque. (2) **« Restaurer mes achats » fonctionne** : sans
ça, rejet Apple au titre de la Guideline 3.1.1. (3) **L'abonnement suit le compte Kyroz,
pas le téléphone** : se déconnecter doit RETIRER le droit, et se reconnecter sur un autre
appareil doit le rendre sans repasser à la caisse (`identifyUser`, corrigé le 2026-08-02).

⚠️ **Deux identifiants doivent correspondre au CARACTÈRE PRÈS entre ce document, le
dashboard et le code** — c'est la source d'erreur n°1 rappelée plus haut, et elle s'est
réalisée : le code portait `kyroz_plus_annual` et `kyroz_plus` là où Apple porte
`kyroz_plus_yearly` et où l'étape 6 prescrit l'entitlement `premium`. Corrigé, et
verrouillé par deux tests (`lib/__tests__/premium.test.ts`, `purchases.test.ts`).
**Ces chaînes se recopient depuis le dashboard, elles ne se choisissent pas dans le code.**

⚠️ **L'écart qui reste, et c'est une décision produit** : l'étape 4 dit que le paywall
« devra présenter trois formules, pas deux ». Il en présente deux — l'annuel payé au mois
(3,99 €/mois, engagement 12 mois) n'est pas affiché. À trancher avant la mise en vente.

---

## 2. Identité technique (déjà dans le code — pour référence)

| Champ | Valeur |
|---|---|
| Nom | Kyroz |
| Bundle iOS / package Android | `app.kyroz.mobile` — ✅ **confirmé le 2026-07-30, ne pas rouvrir** |
| Version | 1.0.0 |
| EAS projectId | `28dc4c7e-cace-4fa2-80ba-7b503804d18e` (owner `kevinberger`) |
| Thème | Sombre (splash + UI) |
| Orientation | Portrait |
| Chiffrement (Apple) | `ITSAppUsesNonExemptEncryption: false` — voir la note ci-dessous |

> **Déclaration de chiffrement — committée le 2026-08-06, après avoir vécu 4 jours
> hors du dépôt.** Sans elle, App Store Connect repose le questionnaire « votre app
> utilise-t-elle du chiffrement ? » **à chaque envoi de build**, et le build reste en
> attente tant qu'on n'y a pas répondu. `false` est la réponse juste ici : Kyroz
> n'embarque aucun chiffrement propriétaire, seulement HTTPS — exempté.
> ⚠️ **Elle avait été posée le 2026-08-02 à 23:02, une heure et demie avant le build
> TestFlight n°3, et jamais committée** : elle n'existait que sur la machine du
> fondateur. Un `git checkout`, un clone frais ou un build en CI l'aurait perdue, et
> le questionnaire serait revenu sans que personne ne comprenne pourquoi. C'est le
> même motif que les clés d'`eas.json` (CLAUDE.md §2) : **ce qui n'est pas versionné
> n'existe que sur une machine.**

> **Pourquoi `app.kyroz.mobile`, et pourquoi c'est figé.** `app.kyroz` = le domaine
> `kyroz.app` écrit à l'envers (seule chose que tu possèdes de façon unique au monde) ;
> `mobile` = quelle app, par opposition au site. Alternatives descriptives envisagées
> puis ÉCARTÉES (`plan`, `macros`, `nutrition`) : l'identifiant est **irréversible dès
> la première publication**, et un segment descriptif peut devenir faux si le produit
> s'élargit — `mobile`, lui, ne peut pas. Il n'est de toute façon **jamais visible par
> l'utilisateur** (les deep links passent par le scheme `kyroz://`, réglage séparé).
>
> **Capabilities de l'App ID** : `In-App Purchase` (Kyroz+) et `Sign in with Apple`.
> ⚠️ Cette dernière est cochée **par anticipation** : la capability du portail
> n'ajoute RIEN au binaire, l'entitlement vient d'`app.json > ios.usesAppleSignIn`,
> aujourd'hui absent. Elle deviendra **obligatoire** le jour où la connexion Google
> arrive (guideline 4.8 : proposer un login tiers impose une option équivalente).
> **Push Notifications : NON** — le rappel quotidien est une notification LOCALE
> (`scheduleNotificationAsync`), aucun serveur n'envoie rien.

> **Décision iPad — RÉVISÉE 2026-07-27, CHANTIER FAIT le 2026-08-01.**
> Usage produit concret : cuisiner avec la recette sous les yeux sur sa tablette
> (aligné North Star, moins de friction au moment de cuisiner).
> **`app.json > ios.supportsTablet` est passé à `true`**, et les trois étapes ont été
> faites dans l'ordre imposé : layout d'abord, captures ensuite, bascule en dernier.
> - **Layout** : colonne centrée sur tous les écrans, source unique `lib/layout.ts`
>   (seuil 700 pt) + le hook `useLayout()`. L'écran recette est le seul à avoir une mise
>   en page à lui : ingrédients | préparation côte à côte, exactement le cas d'usage
>   ci-dessus. Le rendu téléphone est inchangé, un test l'exige.
> - **Captures iPad 13"** : `npm run store:assets:ipad` → `test/store-ipad/`, **2048×2732**.

> 🔴 **LES CAPTURES SUR DISQUE SONT PÉRIMÉES — re-mesuré le 2026-08-06.** `test/store/`
> contient **6 PNG datés du 30 juillet 21:59**, et l'interface a changé **six fois**
> depuis : refonte des 5 écrans + icônes d'onglets (2026-08-03), rayons sur tout le reste
> (2026-08-03), repli du grand titre (2026-08-04), échelle typographique posée et migrée
> sur 333 sites (2026-08-05), espacement + cibles tactiles 44 pt sur 537 sites
> (2026-08-06), finitions trait/icône/toucher (2026-08-06). Les uploader publierait une
> interface qui n'existe plus — c'est exactement le genre d'écart qu'une fiche de store
> fige pour des semaines.
>
> 🔴 **ET JUSQU'AU 2026-08-05, LA COMMANDE CI-DESSOUS NE POUVAIT PLUS LES REGÉNÉRER.**
> `test/_harness.mjs` était périmé sur deux points — l'attestation de dépistage
> n'apparaît qu'**après** avoir répondu aux deux questions (elle était cherchée
> d'emblée), et l'âge ne se saisit plus (c'est une date de naissance en trois champs).
> `bootToPlan` échouait donc en silence, et le script **annonçait** « ⚠️ plan non généré
> — captures probablement vides », **puis écrasait quand même les PNG**. Lancer la
> commande sans lire sa sortie produisait cinq captures de l'écran de dépistage.
> ⚠️ **La leçon vaut au-delà des captures** : un script qui signale sa propre panne PUIS
> continue est plus dangereux qu'un script qui plante. Réparé le 2026-08-05 ; les cinq
> écrans se regénèrent (vérifié). Mais **lire la sortie reste la seule preuve** : elle
> doit dire `session prête`, pas `plan non généré`.
> ⚠️ **Le compte de passes se périme lui aussi** : ne pas relire cette ligne comme une
> vérité, relancer la mesure. `ls -lt kyroz-app/test/store/*.png | head -1` donne la date
> réelle, et `git log --oneline --since=<cette date> -- kyroz-app/app kyroz-app/components`
> dit ce qui a bougé depuis.
> Vérifié aussi : **`test/store-ipad/` ne contient AUCUN png** aujourd'hui (juste son
> `README.txt`). Les deux dossiers étant gitignorés (`test/store*/**.png`), leur absence
> ne prouve pas qu'ils n'ont jamais existé — mais elle prouve qu'il n'y a rien à
> uploader en l'état.
> ➡️ **Avant toute soumission** : `npm run store:assets` **et** `npm run store:assets:ipad`
> (serveur web allumé), puis regarder les PNG produits. Le tableau du haut ne repassera
> au vert que là.
> ⚠️ **Conséquences review, toujours vraies** : avec `supportsTablet:true`, Apple **EXIGE
> les screenshots iPad** ET **teste réellement la mise en page tablette** (plus le simple
> mode compatibilité). Les deux sont désormais couverts.
> ⚠️ **C'est de la config NATIVE : l'OTA ne peut pas la livrer.** Il faut un nouveau build
> iOS pour que le support iPad prenne effet sur un binaire déjà en ligne.
> 🔴 **LE PAYSAGE EST OUVERT SUR IPAD — corrigé le 2026-08-02, cette ligne disait le
> contraire.** `orientation: portrait` dans `app.json` ne vaut que pour l'iPhone. Lu sur le
> **manifeste réellement généré** (`ios/Kyroz/Info.plist` après prebuild) :
> `UISupportedInterfaceOrientations~ipad` contient les **quatre** orientations, paysage
> compris, et `UIRequiresFullScreen` vaut `false`. Expo le fait exprès : le multitâche
> iPadOS (Split View, Slide Over) l'impose, et Apple a retiré l'échappatoire
> `UIRequiresFullScreen` des iPadOS récents. **Ce n'est donc pas refermable.**
> ➡️ **Apple testera l'app en paysage.** Vérifié à 1366×1024 : colonne centrée, grille à
> 2 colonnes, rien ne déborde. C'est le même piège qu'A2 (`android.permissions: []` ne
> prouvait rien) — lire le manifeste généré, jamais la config source.

---

## 3. Fiche store — textes FR (à copier-coller)

**Nom** (30 car. max) : `Kyroz`

**Sous-titre Apple / titre court** (30 car. max) :
`Repas calés sur tes macros`

**Texte promotionnel Apple** (170 car., modifiable sans review) :
`Ton plan de repas hebdo, précis au gramme, adapté à ton objectif et ton sport. Gratuit, sans compte requis pour démarrer.`

**Description** (App Store + Google Play) :
```
Kyroz calcule ton plan de repas de la semaine, précis à la macro près, à partir
de ton profil : objectif (sèche, maintien, prise de masse), sport, préférences et
régime. Pas de blabla : un plan crédible dès le premier jour.

• Plan 7 jours généré automatiquement, ajusté à tes calories et tes protéines
• 512 recettes, adaptées à ton régime (végétarien, vegan, sans gluten, sans
  lactose, sans porc, halal, pescétarien)
• Quantités ajustées automatiquement pour tomber sur tes macros
• Liste de courses (qui déduit ce que tu as déjà) + frigo
• « Recale ma journée » : un imprévu, un repas sauté ? Le plan se réajuste
• Suivi de série pour tenir le rythme
• 100 % gratuit sur le cœur, fonctionne hors-ligne

Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent
pas l'avis d'un médecin ou d'un diététicien-nutritionniste.
```

⚠️ **Le nombre de recettes est écrit À LA MAIN ici** — c'est du texte que tu colles dans
la fiche, rien ne peut le calculer. **Il a déjà dérivé DEUX fois** : annoncé **314** pour
un catalogue de **466** (corrigé le 2026-08-01), puis **466** pour un catalogue de **512**
(corrigé le 2026-08-03, après les vagues B7→B9). L'avertissement « à revérifier après
CHAQUE vague » était déjà écrit ici la première fois — et il n'a pas suffi.
➡️ **Le mesurer, pas le relire** : `npm run mesure:couverture`, ou
`node -e "console.log(require('./Recette/recettes-kyroz.json').recipes.length)"`.
Un chiffre faux dans une fiche de store est une allégation fausse, pas une coquille.

**Mots-clés Apple** (100 car., séparés par des virgules, sans espaces) :
`macros,nutrition,repas,fitness,muscu,prise de masse,seche,calories,proteine,meal prep,regime,sport`

**Catégorie** : Santé et forme (Health & Fitness). Secondaire (Google) : Nutrition.

**URL politique de confidentialité** (obligatoire, déjà en ligne, HTTP 200) :
`https://kyroz.app/legal.html`

> Changée le 2026-08-18. L'ancienne (`https://brgkevin-arch.github.io/Kyroz-app/legal.html`)
> reste servie et valide, mais elle expose un **pseudo personnel** dans un champ public de
> fiche produit. La nouvelle est sur le domaine de la marque et sert le **même fichier
> généré** depuis `constants/legal.ts`. ⚠️ Ne PAS déplacer le site Pages de l'app derrière un
> domaine personnalisé pour arriver au même résultat : ce Pages sert aussi `confirme.html`,
> l'URL de retour de confirmation d'e-mail, codée en dur (`lib/emailConfirmation.ts`) donc
> gravée dans les binaires déjà distribués, et inscrite en liste blanche Supabase.

**Support / contact** : `contact@kyroz.app`

---

## 4. Confidentialité — réponses aux formulaires (fondées sur le vrai flux de données)

> Base factuelle : compte Supabase (UE), profil = données de santé, photos
> **local-only jamais envoyées**, **mesure d'audience consentie** (PostHog Cloud EU,
> stockage à Francfort — traitement n°2 du registre), pas de pub, pas de tracking
> inter-applications. Suppression du compte + données possible **dans l'app**
> (Profil → supprimer le compte).
>
> ⚠️ **Ces deux formulaires se remplissent ENSEMBLE.** Ils décrivent le même flux de
> données dans deux vocabulaires ; n'en mettre qu'un à jour crée une contradiction que
> personne ne relit — et ce sont deux déclarations publiques, pas deux brouillons.

### Apple — « App Privacy »
| Donnée | Collectée ? | Usage | Liée à l'identité ? | Tracking ? |
|---|---|---|---|---|
| Adresse e-mail | Oui | Fonctionnement de l'app (compte) | Oui | Non |
| Santé & forme (poids, objectif, régime) | Oui | Fonctionnement de l'app | Oui | Non |
| Identifiant utilisateur (ID compte) | Oui | Fonctionnement de l'app | Oui | Non |
| Photos (progression) | **Non collectée** | — | — | — (restent sur l'appareil) |
| Données d'usage / analytics | **Oui** — *Product Interaction*, **uniquement si consenti** | **Analytics** | **Non** — identifiant pseudonyme d'appareil, jamais le compte ni l'e-mail | **Non** |
| **Suivi (tracking)** | **NON** — pas d'ATT, pas de pub, pas de partage tiers | | | |

### Google Play — « Sécurité des données »
- **Collectées** : e-mail ; infos de santé (poids, objectif, régime) ; ID compte ;
  **actions dans l'app** (« App interactions »), **uniquement si l'utilisateur les accepte**.
- **Facultatives** : les actions dans l'app le sont — à la question « la collecte de ces
  données est-elle obligatoire ? », répondre **non** : l'app fonctionne à l'identique en cas
  de refus.
- **Chiffrées en transit** : oui. **Stockage** : Supabase à Francfort (UE) ; les statistiques
  d'usage sont stockées par PostHog à Francfort également.
- **Partagées avec des tiers** : **NON**.
- **L'utilisateur peut demander la suppression** : **OUI, dans l'app** (Profil →
  supprimer le compte → cascade + purge locale). Indiquer aussi `contact@kyroz.app`.
- **Photos** : non collectées (restent sur l'appareil).

> ✅ **Fait le 2026-08-18** — les deux formulaires déclarent la mesure d'audience.
> Elle est déclarée **avant** la pose de la clé, et c'est délibéré : l'app demande déjà
> le consentement en production, et un formulaire de store se met à jour avant la
> première collecte, pas après. Sur-déclarer va dans le sens sûr pour l'utilisateur.
>
> 🧑 **Ces deux formulaires se remplissent à la main dans les consoles** : rien ici ne
> les met à jour. Voir « À faire hors dépôt par le fondateur » dans `RGPD-REGISTRE.md`,
> qui les liste avec l'URL de politique à changer.

---

## 5. Santé — conformité (éviter le rejet « app médicale »)

- Le **disclaimer** est déjà affiché in-app (onboarding, réglages, chaque plan) :
  *« Kyroz est conçu pour des adultes en bonne santé… ne remplace pas l'avis d'un
  médecin ou diététicien-nutritionniste. »* — garde-le visible.
- **Ne revendique AUCUN bénéfice médical/thérapeutique** dans la fiche (pas de
  « soigne », « guérit », « perte de poids garantie ») → sinon catégorie médicale
  + exigences de preuves.
- Recettes : `validated_by_dietitian = false` aujourd'hui. On ne prétend donc
  **pas** de validation par un professionnel — cohérent, ne l'écris pas dans la fiche.
- **Hard-blocks déjà en place** : c'est ce qui te protège en review. Chacun est dans le
  code, appliqué à CHAQUE calcul (mode `manual` compris) — pas seulement dans la doc :
  - **Âge minimum 18 ans**, bloqué à l'inscription (`lib/safety.ts::MIN_AGE`). Relevé
    de 16 à 18 le 2026-07-28 : Mifflin-St Jeor n'est pas validée sous 19 ans, et servir
    un moteur de déficit calorique à un mineur est un risque de conformité autant que
    de sécurité.
  - **Renvoi vers un professionnel de santé** (`constants/legal.ts::AVERTISSEMENT_MEDICAL`,
    servi sous le bouton de l'étape 1 de l'onboarding) : « Enceinte, allaitante, ou suivie
    pour une pathologie chronique ? Parles-en à un médecin avant de suivre un plan. »
    🔴 **CETTE LIGNE DÉCRIVAIT UN PORTAIL BLOQUANT — il n'existe plus.** Il posait deux
    questions et menait à un cul-de-sac ; retiré le 2026-08-11 sur avis juridique
    (subordonner l'accès à la grossesse ou à l'état de santé est un refus de service
    fondé sur un critère de discrimination, et la réponse était elle-même une donnée de
    santé art. 9 collectée sans obligation). L'écran qui restait a été supprimé le
    2026-08-12. ➡️ **Ne pas le décrire à Apple comme un garde-fou : ce qui protège, ce
    sont les blocages qui MESURENT** — âge, IMC de départ, volume d'entraînement,
    planchers caloriques, tous listés ici.
  - **Plancher d'énergie disponible** (`lib/safety.ts::safetyFloorKcal`) :
    `max(BMR, 30 kcal/kg de masse maigre + dépense sportive, 1500 H / 1200 F)`. Le
    1500/1200 n'est plus que le **filet absolu** — il autorisait 1200 kcal à une femme
    de 65 kg s'entraînant 5×/semaine, dont le minimum physiologique est ~1863. Au-delà
    de 12 semaines cumulées en zone basse, le plancher remonte vers 35 kcal/kg chez la
    femme non ménopausée : l'app ne bloque pas, elle force une sortie de déficit.
  - **Tout déficit annulé sous IMC 18,5** (`lib/safety.ts::deficitBlocked`) : le plancher
    monte à la maintenance. Le contrôle est *pendant* la sèche, pas seulement à l'entrée
    — quelqu'un qui commence à IMC 19 et descend à 17,8 cesse de recevoir un déficit.
  - **Déficit plafonné à 25 % du TDEE** (`lib/datedGoal.ts::MAX_DEFICIT_TDEE_RATIO`), et
    éligibilité refusée pour une sèche démarrée sous IMC 18,5, un poids cible hors plage
    saine, ou plus de 20 h d'entraînement hebdomadaires déclarées
    (`lib/safety.ts::checkEligibility`).

---

## 6. Classification d'âge

- Réponds au questionnaire **honnêtement** : pas de violence, pas de contenu sexuel,
  pas de jeu d'argent. Thème = **gestion du poids / régime**.
- L'app **bloque déjà les <18 ans** à l'inscription (`lib/safety.ts::MIN_AGE`).

> ### ✅ TRANCHÉ le 2026-07-30 (décision fondateur) — **adultes uniquement**
> **À viser : Apple 17+ · Google « Adultes uniquement ».** La fiche dit désormais la
> même chose que le produit.
>
> **Pourquoi.** L'âge minimum est passé de 16 à 18 ans le 2026-07-28. Une fiche classée
> 12+ aurait été proposée à des 12–17 ans que l'app refuse ensuite à l'inscription :
> décalage fiche ↔ produit, mauvaise première expérience, et angle d'attaque en review.
> L'option écartée (garder 12+ et compter sur le blocage in-app) gagnait un peu de
> visibilité au prix de cette incohérence.
>
> **Ce que ça implique concrètement :**
> - Répondre au questionnaire de façon à **atteindre** ce classement — ne pas se
>   contenter de ce qu'il produit spontanément (le thème « gestion du poids » seul
>   donne 12+ chez Apple). Chercher les items qui portent le classement adulte.
> - **Coût assumé : moins de visibilité.** Un classement adulte réduit l'exposition
>   dans certains classements et rayons, et sur les comptes avec contrôle parental.
>   C'est le prix de la cohérence, et il a été accepté en connaissance de cause.
> - Mentionner quand même l'âge minimum 18 ans dans la note au reviewer (§11) :
>   ça n'est plus une rustine, mais ça reste ce qui explique le classement.

---

## 6-bis. L'icône grise d'App Store Connect — diagnostic mesuré (2026-08-06)

> Le fondateur a signalé une **vignette grise en filigrane** à côté de « Kyroz » dans
> l'en-tête d'App Store Connect (onglet TestFlight). Voici ce qui a été **mesuré**, et
> ce qui reste à faire — dans cet ordre, une étape à la fois.

### Ce qui est déjà vérifié — il n'y a RIEN à corriger dans le code

| vérification | résultat |
|---|---|
| `assets/icon.png` | 1024×1024 · **sans alpha** · PNG — le K de Kyroz |
| catalogue iOS généré (`AppIcon.appiconset`) | même image, `platform: ios`, `size: 1024x1024` |
| commit d'origine de l'icône | `d02c0b8`, 2026-08-02 · **présent dans `main`** |
| build TestFlight actuel | **v1.0.0 build 3**, produit du commit `cd4e2d3` |
| ce commit contient-il l'icône ? | **oui**, et l'empreinte du fichier est identique à celle d'aujourd'hui |

➡️ **Le binaire déposé chez Apple porte l'icône.** Le défaut classique — une icône
avec canal alpha, qu'Apple refuse — est écarté : `hasAlpha: no` aux deux endroits.

ℹ️ **À savoir, et ça change la manip** : depuis iOS 11, l'icône 1024² de la fiche
**n'existe plus comme champ à téléverser** dans App Store Connect. Elle est LUE dans le
build. Il n'y a donc rien à déposer — il y a un build à rattacher.

### La procédure — une étape à la fois

**Étape 1 — établir s'il y a seulement un problème.** ✅ **FAITE le 2026-08-06** :
le fondateur confirme que **l'icône Kyroz s'affiche correctement sur l'iPhone**. Le
binaire est donc bon, et la vignette grise ne concerne QUE la fiche App Store.

**Étape 2 — rattacher le build à une version App Store.** C'est ce qui remplit
l'en-tête, et rien d'autre ne le fait : l'icône de la fiche est LUE dans le build
sélectionné pour une **version**, pas dans les builds TestFlight.
1. App Store Connect → onglet **Distribution** (pas TestFlight).
2. S'il n'y a aucune version iOS : bouton **+** en haut de la colonne de gauche →
   **iOS App** → numéro de version **1.0**.
3. Dans la page de la version, descendre à la section **Build** → **+** → choisir
   **build 3 (1.0.0)**.
4. **Enregistrer.** L'icône de l'en-tête se remplit à partir de ce build.

🟢 **Rattacher un build NE SOUMET RIEN.** La version reste « Prête à être soumise »
tant qu'on ne clique pas sur « Ajouter pour examen » / « Submit for review ». C'est
une manip sans conséquence, réversible.

✅ **RÉSOLU le 2026-08-06.** Cause réelle : **le bouton « Enregistrer » n'avait pas
été cliqué.** App Store Connect garde le build sélectionné à l'écran sans le
persister — au rechargement, il a disparu. Le signal était là et il est discret :
**« Enregistrer » reste GRISÉ tant qu'aucune modification n'est enregistrable, et
devient actif dès qu'il y en a une.** S'il est grisé après un ajout de build, rien
n'est parti.

⚠️ **DEUX FAUSSES PISTES, notées pour que personne ne les retente :**
1. *« Le build n'a pas la déclaration de chiffrement, donc il est bloqué. »* La
   prémisse est vraie — le build 3 (2 août) est antérieur à `42bc57b` (6 août) qui
   ajoute `ITSAppUsesNonExemptEncryption` — mais la conclusion est FAUSSE : TestFlight
   affiche le build « Terminé / En cours de test », **sans le moindre avertissement de
   conformité**. Un fait exact peut désigner le mauvais coupable.
2. *« Le binaire ne porte pas l'icône. »* Réfuté par la capture : le build 1.0.0 (3)
   **affiche le K de Kyroz** dans les deux tableaux de TestFlight. Apple l'avait depuis
   le début — seule la vignette d'en-tête, qui dépend de la VERSION, restait vide.

➡️ **Ce que ça enseigne** : sur une interface tierce, la capture d'écran tranche là où
le raisonnement dérape. Les deux hypothèses étaient plausibles et documentées ; c'est
l'image du build portant déjà l'icône qui a désigné le vrai coupable — un bouton.

**Étape 3 — changer d'icône, si c'est ça qu'on veut.** Remplacer `assets/icon.png`
(1024², sans alpha) et les trois variantes Android (`android-icon-foreground`,
`-background`, `-monochrome`), puis **produire un NOUVEAU BUILD**.
🔴 **Une icône ne passe JAMAIS par une mise à jour OTA** : elle vit dans le binaire.
`eas update` ne peut rien y faire, il faut `eas build` + une nouvelle soumission.

---

## 7. Visuels à produire (à toi — impossible sans device/design)

- **Screenshots iPhone 6.7"** (1290×2796) : **min 1, jusqu'à 10**. Montre les écrans
  forts : (1) plan du jour, (2) une recette + macros, (3) liste de courses,
  (4) onboarding/objectif, (5) série.
  ✅ **CORRIGÉ le 2026-08-10, et la SORTIE est mesurée** : `PHONE` passe à `430×932`, les
  5 PNG sur disque font **1290×2796**. *(Le générateur déclarait `390×844` en `×3`, soit
  **1170×2532** — un 6.1", pas le 6.7" que cette ligne annonçait depuis toujours.)*
  ⚠️ C'était le **troisième** défaut de dimension de ce script — cf. le feature graphic
  sorti à 3072×1500 plus bas, dont le contexte en ×1 a d'ailleurs tenu bon ici (vérifié :
  1024×500 après le changement, il ne suit pas le gabarit téléphone).
  ➡️ **Vérifier la sortie, jamais la config** : c'est la règle qui a produit ce correctif
  et c'est elle qui l'a validé. Une constante juste ne prouve rien — `sips -g pixelWidth
  -g pixelHeight` sur les PNG, si.
- **Screenshots iPad 13"** (2048×2732) : **requis**, `supportsTablet` étant à `true`
  (cf. §2). ✅ **GÉNÉRÉS ET MESURÉS le 2026-08-10** — 5 PNG à 2048×2732, vérifiés au
  `sips`. ⚠️ **Cette case a porté trois états successifs, et deux étaient faux** :
  « ✅ générés » pendant huit jours alors que le dossier ne contenait que son
  `README.txt`, puis « VIDE, jamais rien contenu » — resté après qu'ils ont été produits.
  ➡️ Ce n'est pas la fiche qui dit si un fichier existe, c'est le disque. La commande existe et elle est juste
  (`npm run store:assets:ipad` → 1024×1366 en `×2`) ; personne ne l'avait lancée.
  ➡️ Elles montreront l'écran recette en deux colonnes, c'est-à-dire l'argument tablette.
  ⚠️ **Le motif compte plus que le fait** : une case cochée dans un playbook n'est pas une
  mesure. Celle-ci disait « généré » parce que la COMMANDE avait été écrite — et la fiche
  mémoire de la tablette, elle, disait correctement le contraire depuis le 4 août. Deux
  documents en désaccord, et c'est le disque qui tranche.
  ℹ️ Ce sont des captures **portrait** — c'est le gabarit 2048×2732 qu'Apple demande, même
  si l'app tourne aussi en paysage.
- **Google Play** : min **2 screenshots** téléphone + un **feature graphic 1024×500**
  + l'icône 512×512 (déjà en asset). ✅ **Générés** : `npm run store:assets` →
  `test/store` (captures **1290×2796** depuis le 2026-08-10, feature graphic **1024×500**).
  ⚠️ **CORRIGÉ le 2026-08-01, et c'était un rejet assuré** : le feature graphic sortait à
  **3072×1500**, parce que sa page était créée dans le contexte des captures et héritait
  de son `deviceScaleFactor: 3`. Google exige EXACTEMENT 1024×500. Il a désormais son
  propre contexte en ×1. Le nombre de recettes affiché dessus était par ailleurs figé à
  « 314 » ; il est maintenant lu dans `recettes-kyroz.json`.
- **Comment capturer** : les deux commandes ci-dessus, serveur web allumé. Pas de device
  ni d'outil de design nécessaire.

---

> ## ⚠️ CE PLAYBOOK PLAÇAIT LE BUILD TROP TARD — corrigé le 2026-07-30
> Le build figurait en étape 8 sur 11, **après** les comptes développeur. C'est faux
> pour Android : **un build Android n'a JAMAIS eu besoin du compte Google Play.** EAS
> génère la clé de signature ; le compte ne sert qu'à *déposer*, pas à *fabriquer*.
> Il aurait pu tourner dès le 2026-07-15, jour de création d'`eas.json`.
>
> **Ce que ce report a coûté, mesuré :** `eas.json` était invalide depuis sa création
> (pseudo-commentaires `//`) et bloquait TOUT build — quinze jours sans que rien ne le
> signale, parce que ni les tests, ni `tsc`, ni le déploiement web ne touchent cette
> couche. Et `RECORD_AUDIO` + `SYSTEM_ALERT_WINDOW` dormaient dans le manifeste,
> indétectables depuis `app.json` : seul un `prebuild` les montre. Le backlog les
> soupçonnait depuis le 2026-07-03 sans pouvoir trancher.
>
> **Règle : un build est un TEST, pas une étape finale.** Il contrôle la validité de la
> config EAS, la fusion du manifeste et la compatibilité des modules natifs — une couche
> que rien d'autre ne vérifie. Le lancer tôt, même sans intention de publier.
> *(iOS, lui, a une vraie dépendance : les certificats de distribution exigent le compte
> Apple payant.)*

## 8. Build & soumission (commandes)

> ### ⚠️ `eas.json` n'accepte PAS de commentaires — appris à la dure le 2026-07-30
> Le fichier portait des clés `"//"` en guise de commentaires dans la section `submit`.
> Le JSON ne supporte pas les commentaires, et le schéma d'EAS les **rejette** :
> `« submit.production.android.// is not allowed »` → le build s'arrête avant même de
> démarrer. Elles ont été retirées ; leur contenu est repris ici, à sa place.
>
> **À remplir dans `eas.json > submit.production` au moment de la première soumission :**
> - **iOS** — `appleId`, `ascAppId`, `appleTeamId` (Team ID = `8F2ZSM5NSY`).
> - **Android** — `serviceAccountKeyPath`, la clé de service Google Play.
>
> 🔒 **Ni la clé App Store Connect ni la clé de service Google ne doivent être
> commitées.** Ce sont des secrets : les stocker dans les **secrets EAS** et les
> référencer par variable d'environnement. Une clé dans le dépôt est une clé publiée.

```bash
# 1. Outil EAS (une fois)
npm i -g eas-cli        # ou préfixer les commandes par: npx eas-cli@latest

# 2. Connexion (compte Expo "kevinberger")
eas login

# 3. Build de production (eas.json est déjà configuré)
eas build --platform ios     --profile production
eas build --platform android --profile production

# 4. Soumission
eas submit --platform ios     --latest    # nécessite le compte Apple + App créée dans App Store Connect
eas submit --platform android --latest    # 1re fois : créer l'app dans Play Console, puis uploader le .aab
```

- **iOS** : laisse EAS gérer certificats + provisioning (le plus simple).
- **Android** : à la **1re** soumission, crée d'abord l'app dans la Play Console et
  uploade le `.aab` à la main (ou configure un *service account* Google pour
  automatiser `eas submit` ensuite). La clé de signature : laisse **Google Play App
  Signing** la gérer.
- `eas.json` production a `autoIncrement: true` + `appVersionSource: "remote"` → les
  numéros de build s'incrémentent tout seuls, tu n'y touches pas.

---

## 9. Checklist finale avant « Submit for review »

- [x] **Migrations Supabase appliquées + vérifiées (2026-07-23)** : 30/30 colonnes
      profil présentes, RLS forcé sur les 6 tables (`migrations/2026-07-21_pending_all.sql`).
- [x] **Suppression de compte testée de bout en bout (2026-07-23)** : `delete-account`
      déployée (200 `{"success":true}`), ligne `auth.users` + toutes les données
      effacées (cascade). RGPD droit à l'effacement prouvé. Cf. `supabase/RUNBOOK-PROD.md` §3.
- [x] ⚠️ **Accès reviewer — RÉGLÉ EN CODE (2026-07-17).** Un accès invité est
      déverrouillé par un **code secret posé au build** (`EXPO_PUBLIC_REVIEW_CODE`),
      inerte partout ailleurs (le web public ne le pose pas → reste fermé). Le
      reviewer se connecte « normalement ». **À faire par toi avant le build natif :**
      1. **Vérifie l'auth anonyme Supabase** activée (Authentication → Providers →
         Anonymous) — déjà le cas (Playwright s'en sert).
      2. **Pose le code au build**, hors repo (secret EAS) :
         ```bash
         eas env:create --name EXPO_PUBLIC_REVIEW_CODE --value "<un-code-long-aléatoire>" \
           --environment production --visibility sensitive
         ```
         *(ou variable d'env du profil `production` au moment du build).*
      3. **Dans les notes de review** (Apple : App Review Information → Sign-In
         required ; Google : instructions de test), indique :
         > Mode **Connexion** · e-mail : `review@kyroz.app` · mot de passe : `<le code posé>`
      Le reviewer entre ces identifiants et « Se connecter » → session invité, sans
      confirmation e-mail. **Ne mets JAMAIS ce code dans le repo** ni dans
      `deploy.yml` (sinon le web rouvrirait l'accès anonyme). Implémentation :
      `lib/reviewAccess.ts` (+ test `reviewAccess.test.ts` : « fermé si pas de code »).
- [ ] Disclaimer santé visible (déjà le cas).
- [ ] URL de confidentialité renvoie 200 (déjà le cas).
- [ ] Screenshots aux bonnes dimensions uploadés (§7).
- [ ] Formulaires confidentialité remplis (§4).
- [x] **Support tablette** (décidé 2026-07-27, fait 2026-08-01, §2) : `supportsTablet:true`
      + layout tablette + screenshots iPad 13". ⚠️ Config NATIVE → exige un nouveau build
      iOS pour prendre effet.
- [ ] Pas d'allégation médicale dans la fiche (§5).
- [ ] (Android) Testeurs recrutés pour la période de 14 jours si compte perso (§1).

---

## 10. Ce que je peux encore faire pour toi (dis-moi)

- Repasser `supportsTablet` à `false` si tu veux soumettre iPhone-only (retire
  l'exigence iPad). ⚠️ Le layout tablette, lui, reste : il ne gêne rien, et sur iPhone
  il est un no-op strict.
- Regénérer les visuels de fiche : `npm run store:assets` (téléphone + feature graphic)
  et `npm run store:assets:ipad` (iPad 13").

---

## 11. Note pour le reviewer (à coller dans App Store Connect + Play Console)

> Rédigée en anglais (les reviewers ne lisent pas forcément le français) avec les
> libellés FR des boutons entre guillemets. **Remplace `<CODE_EAS>` par le code que
> tu as posé dans `EXPO_PUBLIC_REVIEW_CODE`** (⚠️ ne PAS committer le vrai code ici —
> ce fichier est dans le repo public). Colle-la dans :
> - **Apple** : App Store Connect → ta version → *App Review Information* → *Notes* +
>   coche *Sign-In required* et mets l'e-mail/mot de passe dans les champs dédiés.
> - **Google** : Play Console → *App content* → *App access* → *All functionality
>   requires access* → fournis les identifiants + colle les instructions.

```
DEMO ACCESS
The app opens on a sign-in screen. Use the demo access below to review the full app.

On the login screen:
1. Tap the "Connexion" tab (right tab = "Sign in").
2. Email:    review@kyroz.app
3. Password: <CODE_EAS>
4. Tap "Se connecter" ("Sign in").
→ This opens a guest session and goes straight to onboarding.

WALKTHROUGH (~2 min)
- Onboarding: first name → basic info + body-fat picker → sports → goal →
  preferences (diet) → plan days + meals. Tap "Générer mon plan" ("Generate my plan").
- Meal plan ("Plan" tab): each day's meals with precise macros.
- Tap any meal to open the recipe, adjusted quantities and macros.
- Other tabs: "Courses" (shopping list), "Recettes" (recipes), "Profil" (settings +
  account deletion).

NOTES
- App language is French; theme is dark.
- No payment, no ads. Works offline.
- Health disclaimer shown in-app: Kyroz is for healthy adults and does not replace
  medical or dietitian advice. Users under 18 are blocked during onboarding.
- Data (email, profile) is stored in the EU (Supabase). Users can delete their
  account and data in-app (Profil → delete account). Progress photos never leave
  the device.

METHODOLOGY AND SOURCES (guideline 1.4.1)
A dedicated in-app screen discloses every formula, threshold and reference behind the
numbers we display: Profil → gear icon → "Aide et retours" → "Méthodologie & sources".
Summary of what it documents:
- Resting metabolic rate: Mifflin-St Jeor (Am J Clin Nutr, 1990;51(2):241-247).
  Katch-McArdle is used only when the user states their body-fat percentage was
  MEASURED, never when it was estimated from a silhouette.
- Activity factor excludes exercise and is capped at 1.45; training expenditure is
  computed separately with net MET values (Ainsworth et al., Compendium of Physical
  Activities, MSSE 2011;43(8):1575-1581).
- Food composition: Ciqual 2025 table (ANSES, French food safety agency), reused
  under Open Licence 2.0 (Etalab).
- Hard safety limits enforced on every calculation, whatever the user asks for:
  energy availability never below 30 kcal/kg fat-free mass (IOC RED-S consensus,
  BJSM 2018;52(11):687-697), absolute floor of 1500 kcal (men) / 1200 kcal (women),
  deficit capped at 25% of estimated expenditure, dietary fat never below 0.8 g/kg
  body weight, and a maintenance week enforced after 8 consecutive deficit weeks.
- Protein targets are bounded to 1.6-2.6 g/kg fat-free mass (ISSN position stand,
  JISSN 2017;14:20).
- The screen states explicitly which values come from the literature and which are
  Kyroz's own conservative choices, and that recipes are NOT dietitian-validated.

Kyroz is a wellness app. It is not a medical device: it does not diagnose, treat,
cure or prevent any condition, and makes no such claim anywhere in the app.
```

⚠️ **Les chiffres ci-dessus sont RECOPIÉS d'un écran qui, lui, les lit dans le moteur**
(`lib/methodologie.ts`). C'est le seul endroit du dépôt où ils sont écrits à la main, et
c'est assumé : une note de soumission est un texte figé, collé une fois dans un
formulaire. ➡️ **Les relire avant de coller**, et se fier à l'écran en cas d'écart —
lui ne peut pas mentir, il est verrouillé par `lib/__tests__/methodologie.test.ts`.

*Playbook préparé le 2026-07-17. Config technique prête ; le chemin critique = comptes
développeur (§1) + compte de test reviewer (§9).*
