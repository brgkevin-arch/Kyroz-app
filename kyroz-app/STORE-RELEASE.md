# Kyroz — Dossier de sortie stores (App Store + Google Play)

> 🔴 **LA V1 EST iOS SEULE — décision fondateur du 2026-08-27.** *« Dans tous les cas l'app
> ne sort pas sur le Google store pour l'instant, ça sera le taff de la semaine pro. »*
> Tout ce que ce document dit de **Google Play** décrit donc un chantier de la semaine du
> 2026-08-31, **pas** le chemin critique du build (7). Ce qui reste vrai côté Android : le
> compte Play Console est payé et vérifié depuis le 2026-07-30, et deux builds existent —
> du 2026-07-30, donc antérieurs à tout le chantier paywall.

> Playbook de première soumission. **Ce qui est codable est fait** (config, icônes,
> splash, `eas.json`, URL de confidentialité). Il te reste des actions qui demandent
> ton **identité, ton argent, ou un device** (comptes, screenshots, build). Tout est
> ci-dessous, dans l'ordre.

---

## 0-ter. ▶️ REPRISE — état au 2026-08-27

> 🔴 **ÉTAT AU 2026-09-05, 19 h 30** — **tout est prêt sauf la vidéo.**
>
> Trois rejets : `2.1` (01/09, question sur les paliers), `2.1(b)` (03/09, produits absents
> du binaire), `2.1(b)` (04/09, **le premier vrai défaut de code** — un achat qui ne répond
> pas bloquait l'écran pour toujours).
>
> ✅ **Le binaire à soumettre est le (16)** — sur TestFlight, `VALID`, commit `4de16d7`. Il
> porte le **timeout d'achat de 30 s** (le correctif du rejet) et **Sign in with Apple**,
> essayé sur appareil et fonctionnel. Tout est vérifié dans l'artefact, pas supposé.
>
> 🔴 **CE QUI BLOQUE : la vidéo qu'Apple exige**, et pas pour une raison de code — le bac
> à sable du fondateur porte un abonnement de test qui **redonne Kyroz+ à tout compte
> neuf**, donc il n'y avait rien à acheter, donc rien à filmer.
> ✅ **LEVÉ le 2026-09-06** : l'app désinstallée a emporté le reçu, la période s'est
> achevée, et RevenueCat est mesuré à **0 client**. L'environnement est propre.
> 🔴 **Et la chasse au compte sandbox était un détour** : `GET /v2/sandboxTesters` rend
> **0** testeur avec une clé `ACCOUNT_HOLDER`, alors que l'abonnement était bien en
> `environment: sandbox` — un build TestFlight passe ses achats en bac à sable avec le
> compte Apple ORDINAIRE, sans testeur. Le formulaire d'App Store Connect qui refuse
> depuis deux jours n'est pas sur le chemin critique.
> ➡️ Séquence jusqu'à la vidéo :
> `docs/procedures/PROCEDURE-2026-09-05-video-achat-sandbox.md`, bloc de tête §0.
>
> ⚠️ Deux défauts d'affichage relevés en répétant le parcours, **volontairement non
> corrigés** pour ne pas rebâtir le binaire : `E67` et `E68` (défilement de l'assistant
> d'inscription). Ils partiront en **OTA** après l'approbation.

> Bloc réécrit **entièrement** ce jour. Le précédent datait du 2026-08-11 et il a été
> faux sur ses trois points pendant douze jours : il annonçait le build (6) « à jour »,
> les captures à refaire « après les retouches front du 11 », et A32 comme le chantier
> ouvert. ➡️ **Un bloc de REPRISE est le seul du dossier qui n'a pas le droit de
> vieillir** — c'est celui qu'on lit en premier, donc celui dont l'erreur oriente tout
> le reste. Les leçons du 11 août, elles, sont conservées plus bas : elles ne périment
> pas.

**Ce qui est acquis, relu ce jour et non recopié :**

| | |
|---|---|
| `main` | `7b0818b` — **1 645 tests verts / 106 fichiers**, `tsc` propre, **0 PR ouverte** |
| Administratif | comptes, contrats (gratuit + payant), banque, fiscal, **DSA** (27 pays) : **plus aucun verrou** |
| App Store Connect | fiche créée, URL de politique posée, abonnements Kyroz+ créés, **App Privacy REPUBLIÉ le 2026-08-28** : *Données d'utilisation* retirée, **Achats** ajoutée (la vente commence avec cette soumission), **Forme physique** ajoutée (elle manquait depuis le 18/08) — 5 types, tous liés à l'identité, tracking non (§4) |
| Secrets EAS `production` | `EXPO_PUBLIC_REVIEW_CODE`, RevenueCat iOS, Supabase — **posés**. ⚠️ **PostHog RETIRÉ le 2026-08-26** des trois environnements |
| Revue bêta TestFlight | **approuvée le 2026-08-03** — les builds suivants passent sans y repasser |
| Accès relecteur | code posé au build, auth anonyme active, notes rédigées (§11), **posées dans ASC le 2026-08-28** — reste le mot de passe de démo, à coller à la main |
| **Fiche App Store** | ✅ **REMPLIE PAR L'API le 2026-08-28** — voir §3-bis |
| **Binaire** | ✅ **le (9)**, attaché à la version 1.0 — voir §0-quater |
| **Bac à sable** | ✅ **CLOS le 2026-08-28** : achat, désinstallation, compte neuf verrouillé, bouton Restaurer — les quatre sur le (9) |
| Migrations Supabase | **rien en attente** — la dernière date du 2026-08-10 et elle est en prod |

**✅ LES TROIS CHANTIERS SONT PARTIS EN OTA le 2026-08-23** (groupe `a3a119de`, commit
`5dbef80`). Ils restent **absents du BINAIRE** — le relecteur, lui, ouvre l'app une fois
et voit le JS embarqué, donc seul le (7) les lui montrera :

| Livré sur `main` | Ce que c'est |
|---|---|
| **E45** | la cause du gel de l'écran « Rien à acheter » — une feuille qui perdait son instance |
| **Textes légaux** | le transfert Resend vers les USA, nommé dans la politique |
| **A32** | les 12 silhouettes du sélecteur de %MG, refaites |

➡️ **Publiés en OTA le 2026-08-23**, sur décision du fondateur — le parc installé les a.
⚠️ **Ça ne dispense pas du (7)** : une OTA ne s'applique qu'au lancement SUIVANT, et le
relecteur n'en ouvre qu'un. ⚠️ Et elle n'atteint que les appareils DÉJÀ installés : une
installation neuve part du binaire, donc du (6).

**L'état des deux surfaces qui comptent, RELU chez le prestataire :**

- ✅ **LE BUILD (8) REMPLACE LE (7) — le 2026-08-27 à 22 h 20, en 6 min 39 s.**
  `70b2e757`, commit **`12215a7`**, **1.0.0 (8)**, SDK **57.0.0**, runtime
  **`16dc5ce92f7677b6b3568210670792fb26417d7b`**, machine `BuildMachineOSBuild 25F84`
  (stable), empreinte embarquée = runtime EAS. **C'est LUI qui part en revue.**
  🔴 **POURQUOI IL A FALLU UN (8) — un défaut vu à l'écran, pas dans le code.** Un compte
  créé onze minutes plus tôt affichait « Kyroz+ · Inclus à vie » et ne se verrouillait
  qu'au lancement SUIVANT : `usePremium` lisait `profile.created_at`, colonne écrite
  uniquement à la LECTURE du miroir Supabase, donc absente d'un compte neuf. Le repli
  « date absente → on donne » couvrait alors TOUS les nouveaux inscrits.
  ⚠️ **Ce n'était pas un manque à gagner, c'était un motif de rejet** : le relecteur crée
  un compte neuf et ouvre l'app UNE fois — il n'atteignait donc jamais l'écran d'achat.
  Une OTA n'y pouvait rien (elle ne s'applique qu'au lancement suivant), d'où le binaire.
  Correctif : `premium.ts::dateCreationCompte`, la session avant le profil ; garde-fou
  `dateCreationCompte.test.ts`, 10 cas, **3 mutations, 3 rouges**.
  ✅ **L'archive envoyée est passée de 478 Mo à 14,5 Mo** (`.easignore`, PR #193) — 2 s
  d'envoi au lieu de 27. ⚠️ Et l'erreur `Failed to upload metadata` (400) du (7) **n'est
  pas réapparue** : j'avais soupçonné nos longs messages de commit, c'était le poids.
  ⚠️ **L'EMPREINTE A CHANGÉ entre le (7) et le (8)** — `3a24b593…` → `16dc5ce9…` — sans
  qu'aucune dépendance native ne bouge : l'ajout d'un **script npm** suffit
  (`packageJson:scripts`). Cf. CLAUDE.md §2. Sans conséquence ici (le (7) n'a jamais
  dépassé les testeurs internes), mais une OTA ne vise désormais que `16dc5ce9…`.
  *(Le précédent :)* ✅ **LE BUILD (7) — le 2026-08-27 à 20 h 09, en 6 min 16 s.** `6a5cd6b0`,
  commit **`0639ecc`**, **1.0.0 (7)**, SDK **57.0.0**, runtime
  **`3a24b5937215c054871565f558325db56289469b`**, profil et canal `production`.
  ✅ **ET IL EST CHEZ APPLE DEPUIS LE MÊME SOIR** — téléversé à **20 h 49**, `VALID` à
  **20 h 53** (traitement : 3 min 30), non expiré, expire le 2026-11-25. Soit **50 minutes de
  bout en bout**, du lancement du build au binaire valide chez Apple.
  ⚠️ **`eas build` ne téléverse pas** : c'est `eas submit` qui l'a fait, et il a pris **24 min
  en n'écrivant pas un octet**. Le piège n° 3 du dossier s'est rejoué exactement — une sortie
  vide n'est pas une panne, et la source de vérité est l'API d'App Store Connect, pas le CLI.
  ⚠️ **Et un testeur ne reçoit rien avant la DISTRIBUTION**, pas à la fin de la compilation.
  ✅ **La ligne OTA rouvre pour de bon**, et ça se mesure : les trois empreintes coïncident —
  celle embarquée dans le binaire (`Payload/Kyroz.app/EXUpdates.bundle/fingerprint`), celle
  qu'EAS déclare, et celle que rend `npx expo-updates fingerprint:generate --platform ios`.
  ⚠️ **Deux pièges dans cette vérification, tous deux payés le jour même** : la configuration
  OTA n'est **pas** dans l'`Info.plist` mais dans `Expo.plist` (`EXUpdatesEnabled`, canal
  `production`, `EXUpdatesRuntimeVersion: file:fingerprint`) ; et l'empreinte se calcule **par
  plateforme** — `npx @expo/fingerprint .` rend l'empreinte toutes plateformes (113 sources) et
  ne vaut rien ici, c'est `--platform ios` (85 sources) qui donne le runtime réel. Une empreinte
  juste sur le mauvais périmètre se lit comme une divergence, avec l'autorité d'un chiffre.
  *(Rédaction précédente, et elle reste vraie sur la cause :)* 🔴 **LE BUILD (7) ÉTAIT DEVENU
  BLOQUANT LE 2026-08-27** — `main` est monté en **SDK 57**
  et la politique de runtime est passée en **`fingerprint`** (A44). **La ligne OTA était donc
  coupée** : le parc était figé sur la 25ᵉ et ne recevait plus rien avant qu'un binaire
  de la nouvelle surface native soit distribué. Ce n'est pas un incident, c'est la coupure
  voulue — sans elle, un bundle SDK 57 atterrirait sur un binaire SDK 56, qui ne
  démarrerait plus (`lib/__tests__/ligneOta.test.ts`).
  ⚠️ **Conséquence directe sur ce playbook** : les trois P0 (`ENGINE_REV` 10) et la phrase
  iCloud n'atteindront les testeurs **que par ce build**. Ce qui était « publier une OTA »
  est devenu « compiler, distribuer, attendre l'installation ».
- **Binaire** : le dernier build iOS est le **(7)** — `6a5cd6b0`, commit `0639ecc`, terminé
  le 2026-08-27 à 20 h 09, **à jour de `main`** (contrôle de sortie : `origin/main` valait
  encore `0639ecc` après la compilation, 0 PR ouverte — le piège du 11 août ne s'est pas
  rejoué). *(Le précédent :)* le **(6)** — `ceec1b17`, commit
  `1047b9f`, terminé le 2026-08-11 à 20 h 37. Il a **62 commits de retard** sur `main` — chiffre RE-MESURÉ le 2026-08-26 (il en annonçait 40, mesurés le 2026-08-23), qui **grandit à chaque merge** : le relire avec `git rev-list --count 1047b9f..origin/main` plutôt que de le recopier (même défaut que le décompte d'OTA tenu à la main).
- **OTA** : la dernière est la **25ᵉ** (groupe `bf9894b4`, 2026-08-27, iOS + Android,
  runtime 1.0.0), publiée sur le commit `777d9167` — `main`, arbre propre, aucun astérisque
  EAS (`git diff --stat origin/main HEAD` vide). Contrôlée sur l'artefact avant d'être
  annoncée, sur les DEUX bundles Hermes : `GOAL_FALLBACK`, `DATED_GOAL_EXPIRED`,
  `bootProfile`, `preuveExigee` à 1 partout, et le témoin de contrôle `Publilius` à **0** —
  la citation mal attribuée est bien partie du publié (détail : ligne « OTA publiées »
  d'AGENTS.md). Elle porte les **6 commits** de #170 à #175, c'est-à-dire **l'audit V1 et son
  contre-audit jusqu'aux 17 orphelins clos** : 🔴 un `goal` hors barème **figeait l'app au
  démarrage, définitivement** (02-03) ; le compte supprimé laissait des notifications armées,
  des photos de corps dans le cache et un abonné RevenueCat ; l'écran Plan restait sur hier
  jusqu'à ~14 h ; la preuve avant suppression ; l'indicateur « À synchroniser » ; et `Presse`
  qui rendait actifs à l'œil **tous les boutons désactivés de l'app**.
  🔴 **DES CALORIES BOUGENT — `ENGINE_REV` 8 → 9**, contrairement à la 24ᵉ. Le retrait des
  planchers dérivés de la masse maigre au-dessus du seuil d'adiposité était une FALAISE (le
  saut ne rétrécissait pas quand le pas rétrécissait) ; il glisse désormais sur 5 points de
  %MG. Mesuré sur 225 600 profils : **28 cibles bougent (0,01 %), maximum 53 kcal/j, aucune
  n'atteint les 100 kcal/j** du seuil — personne ne reçoit d'avertissement one-shot, et
  `ENGINE_VERSION` ne bouge pas, donc aucun plan en cache n'est invalidé.
  ⚠️ **Elle emporte les textes légaux du 27**, dont deux affirmations qui étaient FAUSSES en
  production (« aucune donnée de santé ne quitte l'UE », « aucun compte ne peut être créé en
  deçà de cet âge »). `kyroz.app/legal.html` a été publiée le même jour (kyroz-site#8) : les
  deux surfaces disent enfin la même chose, et la date du 27 devient vraie à CETTE
  publication, pas au merge.
  ✅ **CE QU'ELLE NE PORTAIT PAS EST CLOS LE MÊME JOUR — et l'OTA n'y était pour rien.** La
  suppression de l'abonné chez RevenueCat vit dans l'Edge Function `delete-account`, qui se
  déploie **séparément** : secret posé, fonction déployée en **version 8**, vérifiée sur un
  vrai compte jetable (journal muet, abonné absent de la liste *Customers*), et les trois
  abonnés orphelins retirés à la main. ➡️ **Étant côté serveur, elle couvre TOUTES les
  versions de l'app** — y compris le binaire (6) de TestFlight, qui date du 11 août.
  Procédure et preuves : `docs/archive/2026-08-27-procedure-suppression-revenuecat.md` (close).
  🔴 **CE QUI RESTE HORS DE L'OTA, EN REVANCHE, C'EST CE QUI A ÉTÉ MERGÉ APRÈS ELLE** — sept
  commits (#176 → #182), dont **deux touchent le bundle** : #178 (les trois P0 du lot 1′,
  `ENGINE_REV` 9 → 10 — 344 406 profils déplacés vers le haut, 300 397 au-delà du seuil
  d'avertissement) et #182 (la phrase de la politique sur les sauvegardes du téléphone).
  ⚠️ **Donc l'app sert aujourd'hui un texte légal daté du 27 août qui n'est plus celui de
  `kyroz.app`** : la page publique a reçu la correction le jour même (kyroz-site#9). Aucun
  FAIT ne diffère — l'exclusion de sauvegarde est une propriété du binaire — mais
  l'ancienne rédaction demande à l'utilisateur un geste inutile (couper iCloud). ➡️ **C'est
  la première raison de publier la 26ᵉ**, avant même les calories.

**Ce qui reste, dans cet ordre :**

1. ✅ **Code figé et build (7) fait** — le 2026-08-27, sur décision du fondateur. Un seul
   build, comme prévu. *(Les deux étapes précédentes de cette liste sont closes.)*
2. 🤖 **Téléverser le (7) chez Apple** — `eas submit --platform ios --profile production`.
   `eas build` ne le fait PAS. 🔴 **Et c'est à CETTE étape qu'on surveille la boîte mail de
   l'Apple ID, pas App Store Connect** : un refus `ITMS-90111` n'apparaît ni dans l'interface
   ni dans son API, et un binaire peut être `VALID` / `APP_STORE_ELIGIBLE` au téléversement
   puis basculer en `INVALID_BINARY` à la soumission (leçon importée du projet Kadenz, §
   « La machine de compilation » ci-dessous).
3. 🤖 **Regénérer les 10 captures** — elles datent du 2026-08-10 (iPhone 19 h 41, iPad
   11 h 20) et ne montrent donc ni le verre, ni l'inscription actuelle, ni les nouvelles
   silhouettes. À faire **après** le (7), pour qu'elles ne périment pas une fois de plus.
4. 🧑 Juger les captures · remplir les formulaires ASC (tout est rédigé §3–6, §11) ·
   **sélectionner le (7)** · « Submit for review ».

**Points ouverts au registre RGPD — aucun ne bloque Apple :** TLS Resend en
« Opportunistic » (à basculer en « Enforced » **après** la soumission), la purge d'une
adresse individuelle chez Resend, et l'usage de l'IA chez deux de ses sous-traitants.

🔴 **LES TROIS PIÈGES QUE LA JOURNÉE DU 11 AOÛT A PAYÉS — ils ne périment pas :**

1. **Un binaire se périme PENDANT qu'il compile.** Trois builds lancés le 11 ; deux
   étaient morts à la naissance, dépassés par des merges en **six minutes**. ➡️ Avant un
   build : `git status` vide **et** `HEAD == origin/main` **et** `gh pr list --state open`
   à **0** (+ `git worktree list` — il y a **trois** autres arbres actifs). Après : le
   commit du build doit encore valoir `origin/main`.
2. **Un état qui dépend d'un TIERS ne se recopie pas, il se relit.** La DSA, la revue
   bêta, un statut TestFlight : ces fiches ont menti trois fois dans la journée, toujours
   dans le sens qui fait renoncer ou qui rassure. Le mot « était » signale une phrase qui
   a cessé d'être une mesure.
3. **Une sortie vide n'est pas une panne.** `eas-cli` bufferise hors terminal : un
   `eas submit` en arrière-plan n'a rien écrit pendant des heures et avait réussi.

### La machine de compilation — un quatrième piège, importé d'un autre projet

🔴 **UN REFUS D'APPLE PEUT VISER LA MACHINE, NI LE CODE NI LA FICHE.** Leçon prise sur le
projet **Kadenz** (post-mortem du 2026-08-24, « Le détour Xcode Cloud ») et vérifiée sur
Kyroz le 2026-08-27. Compiler un binaire de store sur un **macOS de pré-version** suffit à
le faire refuser en `ITMS-90111 — Unsupported SDK or Xcode version`, **même avec un Xcode et
un SDK officiels** : c'est l'empreinte `BuildMachineOSBuild` du binaire qui trahit la machine.

- 🔴 **`VALID` / `APP_STORE_ELIGIBLE` ne prouve RIEN.** Chez Kadenz, les deux binaires refusés
  étaient VALID au téléversement et passaient `altool` ; ils basculaient en `INVALID_BINARY`
  **à la soumission**, quelques minutes plus tard.
- 🔴 **Le motif n'existe que dans un e-mail** envoyé à l'adresse de l'Apple ID — ni dans App
  Store Connect, ni dans son API. Tant qu'on cherche dans l'interface, il n'y a rien à trouver.
- ✅ **Kyroz est protégé, mais par EAS et pas par chance** : `eas build` compile sur
  l'infrastructure Expo, jamais sur le Mac du fondateur — lequel est bien contaminant
  (macOS **27.0 bêta**, `26A5421a`). ➡️ **Ne JAMAIS archiver un binaire de store depuis cette
  machine** : `npx expo run:ios` est un outil de DEV.
- ⚠️ **Ça se vérifie build par build, pas une fois pour toutes** : le (6) a été compilé sur
  `BuildMachineOSBuild 25E253`, le (7) sur `25F84` — **deux images EAS différentes**, toutes
  deux stables. Le (7) porte **Xcode 26.6 build 17F113, exactement le même Xcode que le Mac
  local** : ce qui séparait le binaire refusé du binaire accepté chez Kadenz, c'est la
  MACHINE, pas l'outil.
- ➡️ **La mesure se fait sans télécharger l'IPA** : un IPA est un ZIP, et les artefacts EAS
  acceptent les requêtes `Range` — lire l'index en fin de fichier, puis la seule entrée
  `Payload/<app>.app/Info.plist`. **89 Ko lus sur 26,4 Mo** pour le (7). Une empreinte sans
  suffixe de bêta = machine propre.
- 🔴 **Kyroz n'a jamais franchi ce contrôle** : la revue bêta TestFlight approuvée le
  2026-08-03 est un **autre** guichet que la soumission App Store. La soumission du (7) sera
  le premier passage réel — donc **surveiller la boîte mail de l'Apple ID**.

✅ **POINT OUVERT DEPUIS LE 11 AOÛT — RÉSOLU LE 2026-08-27, ET CE N'ÉTAIT PAS UNE PANNE.**
Le (6) était visible en **interne** mais pas pour les **testeurs externes** ; trois causes
possibles étaient annoncées « indiscernables sans l'écran d'ASC ». Elles étaient discernables
par l'**API** : `GET /v1/builds/<id>/buildBetaDetail` sur le (7) rend
`internalBuildState: IN_BETA_TESTING` et `externalBuildState: READY_FOR_BETA_SUBMISSION`.
➡️ **C'est le fonctionnement normal** : un build part automatiquement en test interne, l'accès
externe demande un **geste explicite** de soumission au groupe. Rien n'était cassé.
⚠️ *Une question classée « indiscernable » l'était faute d'avoir interrogé la bonne surface —
l'écran d'ASC n'était pas le seul instrument disponible.*

---

## 0-quater. Le (9) — et pourquoi le (8) ne doit PAS partir en revue

| | |
|---|---|
| Commit | `dfcd1fa` — *« la phrase qui répète le prix n'était dérivée de rien »* |
| Empreinte iOS | `f3b8937c` (le (8) : `3a24b593`) — `app.json` a changé, donc **ligne OTA distincte** |
| `BuildMachineOSBuild` | **`25F84`** — image propre, vérifiée sur le binaire lui-même |
| Manifeste embarqué | **3 API à motif obligatoire + 5 données collectées**, toutes liées, aucune en suivi |
| Archive | 14,1 Mo · arbre propre (captures de review sorties du dépôt avant le build) |

### Ce que le (8) affichait, et que personne n'aurait vu depuis la France

L'achat en bac à sable du 2026-08-28 a rendu les prix du magasin **américain** :

```
Annuel — 24,99 $US
Débité une fois par an, soit 2,50 € par mois.
```

`withStorePrices` substituait `price` et laissait `billed` — la phrase qui **répète** le
prix. Deux devises voisines, dont une écrite à la main le 2026-08-02.

🔴 **Trois raisons pour lesquelles ça a tenu un mois, et elles se répètent ailleurs :**
1. **Juste sur exactement un magasin** — 29,99 / 12 = 2,4991 → 2,50 €. La France était le
   seul endroit où on relisait.
2. **Le garde-fou couvrait le champ voisin** — tous les tests vérifiaient `price`, aucun
   ne regardait la phrase.
3. **Le relecteur d'Apple est sur un magasin américain.** La capture montrait littéralement
   ce qu'il aurait lu.

### Preuve que le correctif est DANS le binaire, pas seulement dans le dépôt

Témoin lu dans `main.jsbundle` de l'IPA (lecture partielle, 25 Ko sur 26,4 Mo) :
`Débité une fois par an.` — la phrase **sans montant**, qui n'existe que depuis le
correctif. ⚠️ Elle ne sort qu'en **UTF-16** : Hermes bascule une chaîne dès UN accent.
`currencyCode`, lui, sort en UTF-8. **Chercher les deux encodages, toujours.**

### 🔴 LE MOT DE PASSE DE DÉMO ÉTAIT FAUX — depuis le 2026-07-17

Trouvé le 2026-09-02, **pendant que l'app était en revue**, et non par une relecture :
le fondateur a dit « j'sais pas si le mdp est juste ».

| | |
|---|---|
| Champ *App Review Information* | `060324` — **6 chiffres** |
| `EXPO_PUBLIC_REVIEW_CODE` réel | **29 caractères**, non numérique |
| Dans le bundle du **(9)** | le vrai code : **présent** · `060324` : **absent** |

`060324` ressemble à une date tapée de mémoire. Le relecteur qui tentait de se connecter
était renvoyé sur une erreur, et l'accès démo était **fermé depuis la création du champ**.

⚠️ **Aucun test ne pouvait l'attraper** : cette valeur ne vit ni dans le code, ni dans le
dépôt, ni dans aucun contrôle automatique. C'est une chaîne **recopiée à la main dans un
formulaire**, jamais confrontée à sa source — la même famille que la note au relecteur
trop longue de 476 caractères, et que les prix « à copier-coller » du §3.

✅ **LE CONTRÔLE EXISTE MAINTENANT**, hors dépôt (il lit un secret) :

```bash
source ~/.eas-credentials/asc.env && node ~/.eas-credentials/kyroz-verif-demo.mjs
```

Il compare le champ ASC à la variable EAS `production` et n'affiche **jamais** la valeur.
➡️ **À lancer avant CHAQUE soumission.** Le contrôle décisif reste la présence de la
chaîne dans le `main.jsbundle` de l'IPA — c'est le binaire qui décide, pas la variable.

🟠 **Relevé au passage, non bloquant** : `app/(auth)/onboarding.tsx` n'offre **aucune
sortie** — la flèche ne recule que d'une étape et disparaît à la première (`:436`), la
seule issue est d'aller au bout (`:407`). Quelqu'un qui se connecte et ne veut pas faire
l'onboarding est piégé ; il doit désinstaller l'app. Purement JS, donc **corrigeable en
OTA** une fois l'app approuvée.

---

### 🔁 REJET 2.1 PUIS RENVOI — 2026-09-01 / 02

**Rejet le 2026-09-01 : `Guideline 2.1 — Information Needed`.** Une seule question, aucun
défaut de code, aucun nouveau build. Relecture faite sur **iPad Air 11" (M3)**, donc sur
la vitrine **américaine** :

> *« You submitted two monthly and two yearly plans with same or similar prices. Is this
> intentional? If yes, what is the difference between each plan? »*

#### 🔴 La question était FONDÉE — mesuré, pas supposé

| | FRA | USA |
|---|---|---|
| `kyroz_plus_monthly` (réserve) | 4,99 | **3,99 $** |
| `kyroz_plus_monthly_early` (en vente) | 3,99 | **3,99 $** |

Même nom affiché, même prix. Et ce n'était pas une anomalie américaine : **l'échelle est
plate dans 150 territoires sur 175** pour le mensuel (l'annuel tient partout, 0 collision).
Elle n'était juste qu'en France — le seul endroit où on l'avait regardée.

➡️ **Conséquence directe sur la réponse** : impossible d'écrire à Apple « ils diffèrent par
le prix », ce serait faux dans 150 pays. La réponse a donc été construite sur ce qui EST
vrai — deux vendus, deux réservés, l'app n'en demande que deux — et elle NOMME les deux
défauts au lieu d'attendre qu'on les trouve.

#### Ce que le renvoi a appris

✅ **Répondre dans le Centre de résolution REARME la soumission entière** : version,
groupe et les 4 abonnements sont repassés en `WAITING_FOR_REVIEW`, sans perdre la place
dans la file. Un rejet 2.1 ne se paye donc pas d'une nouvelle soumission.

🔴 ~~**Une soumission envoyée est GELÉE, console comprise.**~~ **FAUX — corrigé le
2026-09-03.** Le constat de départ était juste : `DELETE /v1/reviewSubmissionItems` rend
`409 « Item was already submitted »`, et `POST /v1/subscriptionSubmissions` rend
`409 « Subscription … has no pending version for submission »`. La CONCLUSION ne l'était
pas. Un élément se retire très bien d'une soumission envoyée — avec l'autre verbe :
`PATCH /v1/reviewSubmissionItems/{id}` `{"removed": true}` → `200`, état `REMOVED`
(cf. la section du rejet 2.1(b)). Deux refus concordants ont fait passer « ce geste-ci
échoue » pour « ce geste est impossible ».
➡️ Reste vrai malgré tout : **composer la soumission AVANT de l'envoyer** coûte
moins cher que la corriger après.

#### ❌ CE CHANTIER EST ANNULÉ — voir le rejet 2.1(b) ci-dessous

Il y avait ici un travail en attente : refaire la grille du palier réservé. Il n'a plus
d'objet. Le palier réservé lui-même a été abandonné le 2026-09-03, sur un second rejet.

---

### 🔴 REJET 2.1(b) — 2026-09-03 : LE PALIER DE RÉSERVE ÉTAIT LE DÉFAUT

**Second rejet, `Guideline 2.1(b) — Performance — App Completeness`.** Relecture sur
**iPad Air 11" (M3)**, build 1.0 (9), 33 h après le renvoi.

> *« In-app purchase products associated with the app version submitted for review, such
> as "Kyroz+ mensuel" and "Kyroz+ annuel", could not be found in the submitted binary. »*
>
> *« If these In-App Purchase products are not intended to be available at this time,
> remove them from App Store Connect before resubmitting. »*

#### ✅ La question était FONDÉE — mesurée dans l'IPA, pas dans le code

L'IPA (9) téléchargée depuis EAS, `Payload/Kyroz.app/main.jsbundle` (7 257 408 octets),
occurrences des quatre identifiants :

| identifiant | dans le binaire (9) |
|---|---|
| `kyroz_plus_monthly_early` | ✅ présent |
| `kyroz_plus_yearly_early` | ✅ présent |
| `kyroz_plus_monthly` (réserve) | ❌ **absent** |
| `kyroz_plus_yearly` (réserve) | ❌ **absent** |

⚠️ **Le piège du comptage** : `kyroz_plus_monthly` sort à 1 occurrence — mais c'est celle
contenue dans `kyroz_plus_monthly_early`. Un préfixe n'est pas une présence. Ce sont les
comptages ÉGAUX (1 et 1) qui prouvent l'absence de la chaîne autonome.

➡️ **Un produit créé chez Apple mais absent du binaire n'est pas une réserve inerte :
c'est un motif de rejet.** Toute la stratégie à deux paliers reposait sur l'idée inverse.

#### La stratégie abandonnée, et la prémisse fausse qui la portait

`premium.ts` justifiait le second palier ainsi : les CGU §3 promettent que le tarif reste
celui de la souscription, donc « changer le prix d'un produit qui a des abonnés rendrait
cette phrase fausse ». **Cette prémisse n'a jamais été vérifiée** : le flux de changement
de prix d'Apple offre « préserver le prix des abonnés existants ». Les CGU sont honorées
sans second produit. La hausse se fera donc sur les identifiants `_early`.

#### 🔧 Ce qui a marché, et le verbe qui manquait

🔴 **`DELETE /v1/reviewSubmissionItems/{id}` → `409 « Item was already submitted »`,
même après le rejet.** C'est le refus déjà noté le 2026-09-02, et il avait fait conclure à
tort qu'une soumission envoyée est définitivement gelée.

✅ **`PATCH /v1/reviewSubmissionItems/{id}` avec `{"removed": true}` → `200`, état
`REMOVED`.** Ce n'était pas l'état qui bloquait, c'était le VERBE.

🔑 **La carte manquante** : les éléments de soumission sont opaques (`base64` de
`{soumission}|18|{uuid}`), et `reviewSubmissionItems` n'expose **aucune** relation vers un
abonnement (testé : `subscription`, `inAppPurchase`, `subscriptionGroup` → tous `400`).
L'appariement se lit ailleurs — `GET /v1/subscriptions/{id}/versions` rend un
`subscriptionVersions` **dont l'`id` est exactement l'uuid de l'élément**.

#### ⚠️ UN ABONNEMENT CONFIGURÉ NE SE SUPPRIME PAS — JAMAIS

Trois refus mesurés, après la décision de retirer les deux produits :

| geste | réponse |
|---|---|
| `DELETE /v1/subscriptions/{id}` | `409 SUBSCRIPTION_DELETE_NOT_ALLOWED` |
| idem, une fois la version en `DEVELOPER_REJECTED` | `409` — identique |
| `DELETE /v1/subscriptionLocalizations/{id}` | `409 « Cannot delete last localization. »` |

➡️ **Un produit passé en `READY_TO_SUBMIT` est permanent chez Apple.** On ne peut ni le
supprimer, ni le vider pour le rendre supprimable. Le seul état atteignable est
`DEVELOPER_REJECTED` : hors de toute revue, invendable, et **il le reste tant que personne
ne le remet à la main dans une soumission**.

🔴 **La leçon, et elle vaut au-delà d'Apple** : créer un produit « pour plus tard »
n'est pas gratuit et n'est pas réversible. Ces deux-là resteront dans le tableau de bord
pour toujours, sans jamais être vendus.

#### État de la soumission après correction

```
REMOVED            kyroz_plus_yearly (RÉSERVE)
REMOVED            kyroz_plus_monthly (RÉSERVE)
READY_FOR_REVIEW   kyroz_plus_yearly_early (VENTE)
READY_FOR_REVIEW   kyroz_plus_monthly_early (VENTE)
READY_FOR_REVIEW   groupe Kyroz+
REJECTED           version 1.0 (9)
```

Aucun défaut de code, **aucun nouveau build** : le binaire (9) est correct, c'est la fiche
Apple qui promettait des produits qu'il ne contient pas.

---

### 🔴 REJET 2.1(b) — 2026-09-04 : LE PREMIER VRAI DÉFAUT DE CODE

**Troisième rejet, sur le MÊME build (9)**, relu sur **iPad Air 11" (M3) et iPhone 17
Pro Max**, iOS/iPadOS 26.6, 33 h après le renvoi du 03/09.

> *« The In-App Purchase products in the app exhibited one or more bugs which create a
> poor user experience. Specifically, your app started loading indefinitely after we
> purchased the subscription. »*

**Et pour la première fois sur ces trois rejets, c'était vrai — dans le code, pas dans
la fiche.** `lib/purchases.ts::buy()` et `::restore()` n'avaient **aucune borne de
temps**. Si `purchaseStoreProduct` ou `restorePurchases` ne se résolvait ni en succès ni
en échec (réseau, validation de reçu lente côté Apple/RevenueCat), la promesse restait
en suspens **pour toujours** : `enCours` ne repassait jamais à faux, les deux boutons de
l'écran (« S'abonner » et « Restaurer mes achats ») restaient désactivés, sans la
moindre sortie. Exactement « l'app charge indéfiniment ».

🔴 **CE DÉFAUT ÉTAIT DÉJÀ FERMÉ AILLEURS, ET LA LEÇON N'AVAIT PAS ÉTÉ GÉNÉRALISÉE.**
`lib/boot.ts::withBudget` existe depuis le 2026-08-02 pour fermer très exactement cette
classe de bug sur le démarrage de l'app (« le réseau ne décide jamais du premier
rendu »). Le paywall parlait au même genre de réseau non fiable et n'en avait pas hérité.

**Correctif** (`lib/purchases.ts`) : `buy()` et `restore()` passent désormais par
`avecBudget(tentative, PURCHASE_BUDGET_MS)` — 30 secondes, `withBudget` réutilisé tel
quel. Au-delà, un nouveau verdict `{ statut: 'sansreponse' }`.

⚠️ **`sansreponse` N'EST PAS `echec`, et ce n'est pas un détail de typage — c'est un
point « pas de mensonge » (`CLAUDE.md` §10).** `withBudget` n'annule rien : la tentative
continue en arrière-plan et peut très bien aboutir après qu'on a cessé de l'attendre.
L'écran affiche « Rien ne t'a été débité » sur un `echec` — l'affirmer sur un timeout
serait un mensonge si l'achat aboutit une seconde plus tard. Le seul fait qu'on peut
affirmer est qu'on n'a pas de réponse ; `onEntitlementChange`, déjà câblé dans
`usePremium`, rattrape l'entitlement si l'achat finit par aboutir malgré tout.

⚠️ **Vérifié par MUTATION** : remplacer `sansreponse` par `echec` dans le code fait
rougir deux tests d'un coup (`purchases.test.ts`) — dont un écrit précisément pour
dénoncer ce mensonge-là.

🔴 **CE QUE ÇA VEUT DIRE POUR LA RESOUMISSION — un NOUVEAU binaire est nécessaire.** Le
correctif est du JavaScript pur, publiable en OTA en théorie — mais `fallbackToCacheTimeout:
0` (§2 de `CLAUDE.md`) fait qu'une OTA ne s'applique qu'au **second** lancement, et un
relecteur n'en ouvre qu'un. Même raisonnement que pour le build (7) et le (8) : ce
correctif exige un binaire (10).

🔴 **ET APPLE DEMANDE DÉSORMAIS UN ÉLÉMENT NOUVEAU, QUE JE NE PEUX PAS PRODUIRE MOI-MÊME** :
un **enregistrement d'écran sur un appareil PHYSIQUE**, joint aux notes de revue, qui doit :
- partir de l'écran d'accueil, lancer l'app, montrer le parcours complet avec le compte de démo ;
- montrer un **achat sandbox réussi**, preuve que les produits sont actifs et aboutissent ;
- montrer tous les autres parcours d'achat.

➡️ **Ce point est bloquant et hors de portée d'une session Claude Code** : il faut le
téléphone du fondateur, le compte Apple sandbox déjà configuré, et un geste humain devant
la caméra. À faire avant tout renvoi — renvoyer sans la vidéo rejouerait très probablement
le même rejet, ou un autre motif de forme.

---

### 🔴 UN BAC À SABLE NE SE NETTOIE PAS PAR LE HAUT — 2026-09-05

**Le reçu App Store de l'appareil est la SOURCE ; la base de RevenueCat n'en est que le
miroir.** Trouvé en cherchant pendant deux heures pourquoi tout compte Kyroz neuf
affichait « Abonnement actif » alors qu'il n'y avait, littéralement, plus un seul client
chez RevenueCat.

**La preuve, en un relevé** : après avoir supprimé TOUS les clients (0 restant), la
connexion suivante en a fait réapparaître un — avec `first_seen_at` au **1ᵉʳ août**, et
ses deux abonnements. Un client supprimé ne « revient » pas : il est **reconstruit depuis
le reçu**, avec son passé.

➡️ **Ce qui NE nettoie pas un environnement de test** :
- supprimer les clients RevenueCat (fait deux fois : 30, puis 2 — sans effet) ;
- se déconnecter du compte sandbox dans les Réglages ;
- désinstaller et réinstaller l'app ;
- « Effacer l'historique d'achats » **seul** — il arrête les renouvellements, il ne tue
  pas la période en cours.

➡️ **Ce qui nettoie vraiment** : que la période d'abonnement **expire** (durées
compressées par Apple : 5 min pour un mensuel, 1 h pour un annuel, 6 renouvellements au
maximum), ou un **autre Apple ID sandbox**.

⚠️ **Corollaire pour toute session future** : avant de promettre une manipulation qui
« remet à zéro », se demander **où vit la source**. Ici elle était sur l'appareil, et
j'ai passé deux heures à effacer son reflet.

⚠️ **Et un mot d'utilisateur ne suffit pas à nommer un état** : « j'ai Kyroz+ » recouvre
trois motifs sans rien en commun (`entitled`, `grandfathered`, `not_launched`). Le titre
de l'écran Kyroz+ les distingue sans ambiguïté (`paywallBanner`) — c'est LUI qu'il faut
demander, dès la première question.

**Outillage installé ce jour** : clé secrète RevenueCat dans
`~/.eas-credentials/revenuecat-secret` (hors dépôt, `chmod 600`). Elle donne l'état réel
des clients, abonnements et droits — `api.revenuecat.com/v2/projects/proj7396660e/…`.
C'est elle qui a tranché là où le raisonnement tournait en rond.

---

### 🍎 Sign in with Apple — implémenté le 2026-09-05, à VÉRIFIER sur appareil

Décision fondateur : puisqu'un nouveau binaire (10) est de toute façon nécessaire pour le
correctif du timeout d'achat, [[project-sign-in-with-apple-a-faire]] entre dans ce build —
exactement la fenêtre que cette fiche prévoyait (« si Apple rejette, un build repart de
toute façon : Apple Sign In y entre gratuitement »).

**Ce qui est écrit et vert (`tsc` + 2095 tests)** :
- `lib/appleAuth.ts` / `.web.ts` — même patron que `lib/purchases.ts` : le SDK natif
  (`expo-apple-authentication`) chargé en `require` paresseux, la version web écartée
  par résolution de plateforme (Metro l'embarquerait sinon, même piège mesuré deux fois).
- `components/AppleSignInButton.tsx` / `.web.tsx` — le bouton **officiel** Apple
  (`AppleAuthenticationButton`), pas un bouton maison : les Human Interface Guidelines
  l'exigent, et c'est aussi ce qui donne la localisation et l'accessibilité gratuitement.
- `hooks/useAuth.tsx::signInWithApple` — flux natif → `supabase.auth.signInWithIdToken`.
  Nonce transmis **brut**, ni côté Apple ni côté Supabase (vérifié contre la doc Supabase
  courante pour Expo — contre-intuitif si on connaît le Swift natif, où on le hache).
- **Le trou RGPD des parcours OAuth, fermé** (déjà nommé dans
  [[project-sign-in-with-apple-a-faire]]) : l'inscription e-mail fait cocher la case de
  consentement AVANT d'ouvrir une session ; Apple, lui, authentifie D'ABORD. La session
  Apple s'ouvre donc, mais l'écran reste sciemment sur `/(auth)/login` (aucun
  `router.replace('/')`) tant que `consentSanteManquant()` — prédicat PUR, testé — dit
  vrai : la même case, le même texte, juste après. Annuler referme la session
  (`signOut()`) plutôt que de laisser une session sans consentement traîner.
- **Le scope `FULL_NAME` n'est PAS demandé**, délibérément : Kyroz demande déjà le
  prénom à l'onboarding, et réclamer le nom à Apple ajouterait un type de donnée
  collectée que la fiche App Privacy ne déclare pas — fiche qui ne s'écrit PAS par
  l'API ([[reference-asc-api-fiche]]), donc un aller-retour console de plus pour rien.

**Ce qui reste, et que je ne peux pas faire moi-même :**
1. **Activer le fournisseur Apple dans le tableau de bord Supabase** — Authentication →
   Providers → Apple → activer, « Client IDs » = `app.kyroz.mobile`. Sans ce réglage,
   `signInWithIdToken` refusera le jeton même si tout le reste est juste.
2. **Vérifier sur un appareil ou le simulateur**, avec un vrai identifiant Apple : le
   flux natif ne se simule pas sous vitest, et `expo-apple-authentication` avertit
   lui-même que `getCredentialStateAsync` échoue toujours sur simulateur (sans
   conséquence ici, cette fonction n'est pas utilisée).
3. **La capability est déjà cochée sur l'App ID** (anticipée le 2026-08-31, avant même
   ce chantier) — normalement rien à faire côté Apple Developer, à confirmer au premier
   `eas build` si le provisionnement râle.

⚠️ **Ne pas confondre avec le point 2 du rejet ci-dessus** (l'enregistrement d'écran) :
celui-là ne montre QUE le parcours d'achat, pas Sign in with Apple — Apple ne l'exige
pas pour cette fonctionnalité.

---

### ✅ SOUMIS — 2026-08-28, 17 h 44 : 6 éléments, ensemble

| | |
|---|---|
| Soumission | `4fa9c18a` — **`WAITING_FOR_REVIEW`** |
| Contenu | version 1.0 (**build 9**) · le **groupe Kyroz+** · les **4 abonnements** |
| Preuve | les 4 abonnements sont passés de `READY_TO_SUBMIT` à **`WAITING_FOR_REVIEW`** |
| Sortie | **MANUELLE** — Apple ne publiera pas sans un clic |

#### La règle qu'Apple n'expose que dans sa console

> *« Votre premier groupe d'abonnements doit être soumis avec une nouvelle version de l'app. »*

**Ce n'est pas une préférence, c'est une contrainte de forme.** Elle invalide le plan
« laisser l'app partir seule, soumettre les abonnements après » : il aurait fallu une
version *supplémentaire*. Personne ne pouvait le savoir depuis l'API.

#### 🔴 CE QUI SE FAIT À LA CONSOLE, ET SEULEMENT LÀ

L'API **ne sait pas** soumettre un abonnement. Vérifié exhaustivement le 2026-08-28 :
- `reviewSubmissionItems` n'accepte **que** `appStoreVersion` — neuf autres noms de
  relation essayés (`subscription`, `subscriptions`, `inAppPurchaseV2`, `inAppPurchase`,
  `subscriptionV2`, `subscriptionGroup`, `subscriptionGroups`,
  `subscriptionGroupLocalization`, `subscriptionAppStoreReviewScreenshot`) : *« is not a
  relationship on the resource »* ;
- `POST /v1/subscriptionSubmissions` refuse en `409` *« This subscription cannot be
  reviewed, please check associated errors »* — **dans toutes les configurations** :
  version en revue, version libre, groupe présent, groupe absent, noms dédupliqués. Et
  ces « erreurs associées », l'API ne les publie **nulle part** ;
- `POST /v1/subscriptionGroupSubmissions` refuse en `409` *« You cannot submit this
  subscription group »*.

**Le chemin qui marche, dans cet ordre :**
1. *Monétisation → Abonnements →* **le GROUPE** (pas un produit) ;
2. cocher les abonnements dans le tableau, puis **« Ajouter pour vérification »** — le
   bouton de la SECTION, pas celui du titre ;
3. **« Ajouter pour vérification »** du titre pour le groupe lui-même ;
4. la version de l'app doit être **libre** — elle ne peut être que dans UNE soumission ;
   l'ajouter (l'API sait le faire) ;
5. *Brouillons de soumissions* → **« Envoyer pour vérification »**.

⚠️ **Le contrôle qui tranche n'est pas l'écran, c'est l'état des abonnements** : tant
qu'ils affichent `READY_TO_SUBMIT`, ils ne sont PAS partis, quoi que dise la console.

#### Ce que l'épisode a coûté, et pourquoi

L'app a été retirée **deux fois pour rien** avant celle-ci, sur des plans annoncés avant
d'avoir été vérifiés. ➡️ **Ne pas annoncer un geste avant d'avoir vérifié qu'on sait le
faire** — et quand une API refuse sans dire pourquoi, aller lire l'écran qui, lui, le dit.

---

### ⏸️ L'ÉTAT D'AVANT — 2026-08-28, 03 h 40 (conservé)

| | |
|---|---|
| Version 1.0 + build **(9)** | **`WAITING_FOR_REVIEW`** (soumission `3ac9083c`, partie à 03 h 33) |
| Sortie | **MANUELLE** — Apple ne publiera pas tout seul |
| Les 4 abonnements + le **groupe** | 🔴 **PAS en revue** |

🔴 **L'API NE SAIT PAS ajouter un abonnement à une soumission.** Sondé le 2026-08-28 :
`reviewSubmissionItems` n'accepte que `appStoreVersion` — `subscriptionGroup`,
`subscriptionGroups`, `subscriptionGroupLocalization` renvoient tous *« is not a
relationship on the resource »*. Et `POST /v1/subscriptionSubmissions` refuse les quatre
en 409, *« This subscription cannot be reviewed »*, **sans exposer les erreurs qu'il dit
d'aller consulter**. C'est un geste de CONSOLE, et il n'y a pas de contournement.

**Les deux erreurs que la console affiche, elles, disent tout :**
1. *« Les nouveaux groupes d'abonnements doivent être soumis avec un abonnement à
   renouvellement automatique appartenant à ce groupe. »* → c'est le **groupe** qui n'a
   jamais été soumis (`subscriptionGroupLocalizations` : `PREPARE_FOR_SUBMISSION`).
2. *« Pour soumettre vos éléments, ajoutez une version de l'app. »* → **une version ne
   peut être que dans UNE soumission à la fois**, et elle est déjà dans celle qui est
   partie.

⚠️ **Ce que ça coûte de se tromper ici** : l'app a été retirée DEUX fois cette nuit sur
une alerte formulée avant vérification — « les abonnements ne sont pas dans la
soumission » était juste, « je peux les y ajouter par l'API » ne l'était pas. **Ne pas
annoncer un geste avant d'avoir vérifié qu'on sait le faire.**

**Deux sorties, à trancher tête reposée :**
- **Tout resoumettre ensemble** : retirer l'app une 3ᵉ fois, construire dans la console
  UNE soumission portant version + groupe + abonnements. Coûte la place dans la file.
- **Laisser la revue aller au bout** : si Apple approuve sans les abonnements, la sortie
  manuelle empêche toute publication ; on soumet les abonnements ensuite et on publie
  quand les deux sont approuvés. Coûte zéro place dans la file.
  ➡️ *C'est la voie par défaut tant que rien n'est décidé — le filet est déjà posé.*

---

### 🟠 QUESTION OUVERTE, À TRANCHER LE JOUR DE LA SORTIE — les prix en dollars

En TestFlight, le paywall affiche **exactement les prix USA** (`3,99 $US` / `24,99 $US`)
alors qu'Apple facture **exactement le prix français** (29,99 €, feuille d'achat à l'appui).

**Ce qui est MESURÉ, et ce que ça élimine :**

| Mesure | Ce qu'elle écarte |
|---|---|
| App Store de l'appareil en **euros**, compte **France** | ce n'est pas la vitrine de production |
| Prix ASC : FRA 29,99 · USA 24,99, **effectifs immédiatement**, sans date | ce n'est pas la fiche |
| Déconnexion du compte sandbox, autre compte, **réinstallation** : aucun effet | ça ne vit pas dans l'app |
| Pont natif lu : `getProducts` → `RCCommonFunctionality getProductInfo` → **StoreKit**, aucun chemin vers un prix servi par le serveur RevenueCat | RevenueCat n'invente rien, il relaie |
| Le code n'a **aucune** logique de devise — `priceString` est affiché tel quel | ce n'est pas Kyroz |

➡️ **Reste : la vitrine que StoreKit résout en environnement BAC À SABLE**, distincte de
celle de l'App Store. **NON PROUVÉ** — et ça ne peut pas l'être avant la production.

**Ce qui protège l'utilisateur en attendant** : la feuille d'Apple est le dernier mot et
affiche le vrai montant **avant** toute confirmation. Personne ne peut être débité d'un
montant qu'il n'a pas vu. C'est aussi ce que dit la mention sous le bouton.

🔴 **PREMIER GESTE LE JOUR DE LA SORTIE, avant toute communication** : installer Kyroz
**depuis l'App Store** (pas TestFlight), ouvrir *Profil → Kyroz+*, et lire la devise.
- **Euros** → c'était le bac à sable, dossier clos.
- **Dollars** → défaut réel et visible par tous les Français. Il ne se corrige PAS en OTA
  (c'est la vitrine, pas le JS) : ouvrir un ticket RevenueCat avec cette section.

⚠️ Ne pas laisser cette vérification à « quand on y pensera » : c'est la seule mesure qui
tranche, elle prend trente secondes, et elle n'existe qu'à ce moment-là.

### 🔴 Le geste qui reste, et qu'on oublie

La version 1.0 d'App Store Connect a le **(8)** attaché. Il faut **rattacher le (9)** avant
de soumettre — sinon tout ce travail part avec l'ancien binaire.

---

## 0-bis. ▶️ LA SÉQUENCE DE DEMAIN — 2026-08-10

> 🔴 **BLOC HISTORIQUE — NE PAS S'EN SERVIR POUR AGIR.** Il décrit la journée du
> 2026-08-10 et plusieurs de ses cases sont périmées : elles annoncent le build (6)
> « fait, à jour », et les captures comme refaites. **L'état courant est au §0-ter**,
> plus haut. Ce bloc est gardé pour son RAISONNEMENT — l'ordre des étapes et pourquoi
> il ne se négocie pas — pas pour ses états.

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
| 3 | 🤖 | ✅ **(7) FAIT le 2026-08-27** (`6a5cd6b0`, commit `0639ecc`, 1.0.0 (7), SDK 57) — **il remplace le (6) et c'est lui qui part en revue.** ⚠️ **Fait chez EAS ≠ téléversé chez Apple** : `eas submit` reste à faire. *(Historique :)* ✅ **(6) FAIT, À JOUR ET TÉLÉVERSÉ le 2026-08-11** (`ceec1b17`, commit `1047b9f`, `finished` à 20 h 37, envoyé à App Store Connect). C'est **le seul des trois** qui contienne E39 (retrait du portail) et E40 (page méthodologie) — donc le seul cohérent avec les notes du relecteur (§11). 🔴 **MAIS IL PÉRIMERA DÈS QUE LE FRONT BOUGERA** : le fondateur a annoncé le 2026-08-11 au soir vouloir retoucher l'interface avant les captures. ➡️ **Un build (7) sera nécessaire APRÈS ces changements, et un seul.** 🔴 **ET C'EST LA LEÇON DE LA JOURNÉE : un binaire se périme PENDANT qu'il compile.** Trois builds ont été lancés le 2026-08-11 ; les deux premiers étaient morts à la naissance — le (4) (`10d6096`, 13 h 18) a été dépassé par #92 **six minutes** après son lancement puis par #94 ; le (5) (`770187d`, 13 h 41) par #96 et #97. La cause n'est pas le système, c'est le contrôle : on vérifiait « l'arbre est propre » sans vérifier « rien n'est en vol ». Les sessions parallèles mergent pendant les ~6 minutes de compilation. ➡️ **DEUX mesures avant tout build, jamais une** : `git status` vide **et** `HEAD == origin/main` **et** `gh pr list --state open` à **0** — plus `git worktree list` pour savoir qui travaille. ➡️ **Et une APRÈS le build** : `git rev-parse origin/main` doit encore valoir le commit du build. C'est ce contrôle qui a validé le (6). ⚠️ **Un build n'est ni gros ni petit** — c'est une PHOTO de `main` à un instant. On n'en « regroupe » pas plusieurs : le bon geste est d'en faire **un seul, quand le code est figé**. ⚠️ Un build se constate avec `npx eas-cli build:list --platform ios` **depuis `kyroz-app/`**, et **on lit son COMMIT, pas sa date** — cette case a annoncé « à faire » alors qu'il était fait, puis « fait » sans voir qu'il était périmé. | premier binaire à porter la clé RevenueCat. **Ne PAS monter `expo.version`** : ça couperait la ligne OTA vers le build 3 des testeurs |
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
- 🔴 **~~`PAYWALL_LAUNCH` reste `null`~~ — RENVERSÉ LE 2026-08-27 (décision fondateur).**
  La date est posée au 27 août. Cette ligne disait de ne pas la poser « pour que le
  relecteur ne tombe pas sur un paywall » — or c'est exactement l'inverse qu'il faut :
  **sans date, il n'y a AUCUN écran d'achat à lui montrer** (`enVente = reason === 'locked'`),
  ni aucune capture de review à produire, alors que l'app déclare quatre abonnements.
  ⚠️ **Le risque que cette ligne nommait reste réel, il a seulement changé de forme** : le
  relecteur crée son compte pendant le test, donc APRÈS la date, donc il verra le paywall.
  **Il faut donc qu'il puisse acheter** — produits « Prêt à soumettre » et bac à sable
  passé. Les deux sont encore à faire. Détail : A45 et la procédure de mise en vente.
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
| Screenshots (iPhone + iPad 13") + feature graphic | 🔴 **À REFAIRE, et la dette a encore grandi le 2026-08-23.** Les 6 PNG iPhone sont horodatés **2026-08-10 19 h 41**, les 5 iPad **2026-08-10 11 h 20**. Depuis, l'app a changé sur trois plans qui SE VOIENT : la barre d'onglets est passée au **verre** (E36, le 11), l'**inscription** a gagné la question du NEAT et la bifurcation de la sèche (19-21), et les **12 silhouettes** du sélecteur de %MG sont refaites (A32, le 23). Les captures montrent donc une inscription et des écrans qui n'existent plus. ➡️ Les regénérer **après le build (7)**, jamais avant : c'est la troisième fois qu'elles périment pour avoir été prises trop tôt. ✅ **FAITES le 2026-08-27** — 5 iPhone **1290×2796** + 5 iPad **2048×2732** + feature graphic **1024×500**, dimensions MESURÉES au `sips` sur les PNG produits, jamais relues dans la config. 🔴 **Deux fichiers ne s'étaient PAS régénérés et ont été supprimés** : `4-frigo.png` (iPhone et iPad), datés du 10 août, montraient un écran « Frigo » qui n'existe plus depuis son renommage en « Réserve » le 2026-08-24. *Rien ne les distinguait des bons au moment du téléversement.* *(Historique : iPhone refait le 2026-08-10 — sortie mesurée à 1290×2796 après correction d'un gabarit qui rendait du 6.1" ; iPad généré et mesuré le même jour à 2048×2732. Cette case a porté trois états successifs dont deux faux — c'est `sips` sur les fichiers qui tranche, jamais la fiche.)* |
| Accès reviewer (code) | ✅ code — toi : poser le secret au build (§9) |
| **Lancer le build EAS** | ✅ **(8) FAIT le 2026-08-27 à 22 h 20** — `70b2e757`, commit `12215a7`, **1.0.0 (8)**, SDK 57.0.0, 6 min 39 s, à jour de `main` au contrôle de sortie, machine EAS `25F84` (stable). Il remplace le (7), qui portait un défaut bloquant pour la revue (cf. §0-ter). ⚠️ **Fait ≠ téléversé** : `eas submit` reste à faire. *(Le précédent :)* ✅ **FAIT le 2026-08-27 à 20 h 09** — `6a5cd6b0`, commit `0639ecc`, **1.0.0 (7)**, SDK 57.0.0, `finished` en 6 min 16 s, à jour de `main` au contrôle de sortie. ⚠️ **Fait ≠ téléversé** : `eas build` ne dépose rien chez Apple, il faut `eas submit`. ⚠️ Un build se constate avec `npx eas-cli build:list --platform ios` depuis `kyroz-app/`, **et on lit son COMMIT, pas sa date**. *(Rédaction précédente :)* 🔴 **UN (7) EST REQUIS — le (6) a 40 commits de retard.** Relu chez EAS le 2026-08-23 (40 commits de retard, `git rev-list --count 1047b9f..origin/main`) : le dernier build iOS reste `ceec1b17`, commit `1047b9f`, terminé le 2026-08-11 à 20 h 37 et téléversé à App Store Connect. Il ne porte donc ni le correctif du gel (E45), ni les textes légaux à jour, ni les 12 nouvelles silhouettes. ⚠️ **Le relecteur ouvre l'app UNE fois** : il voit le JS EMBARQUÉ, et une OTA ne s'applique qu'au lancement suivant. Ce qui n'est pas dans le binaire n'existe pas pour lui. 🧑 **En attente d'une décision du fondateur** (2026-08-23) : le code n'est pas figé. ⚠️ Le (5) est aussi chez Apple et ne doit **PAS** partir en revue (notes du relecteur incohérentes). ⚠️ Un build se constate avec `npx eas-cli build:list --platform ios` depuis `kyroz-app/`, **et on lit son COMMIT, pas sa date**. |

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

> ## ✅ CÔTÉ APPLE : TERMINÉ (2026-07-30, complété le 2026-08-25)
> Bundle ID enregistré · fiche d'app créée · Paid Applications Agreement **Actif**
> (compte bancaire + W-8BEN actifs) · groupe `Kyroz+` et **QUATRE** abonnements créés,
> tarifés, libellés en français et attachés à l'entitlement `premium` chez RevenueCat.
>
> 🔴 **CE QUI RETIENT « MÉTADONNÉES MANQUANTES », C'EST LA CAPTURE DE REVIEW — PAS LES
> LIBELLÉS.** Mesuré le 2026-08-25 (`npm run check:abonnements`, relation
> `appStoreReviewScreenshot`) : les descriptions fr-FR existaient depuis toujours, la
> capture est vide sur les quatre produits. Ce document et `MONETISATION.md` laissaient
> entendre qu'il fallait d'abord « compléter les métadonnées ».
> ➡️ **Conséquence sur l'ordre, et elle est structurante** : cette capture montre le
> PAYWALL, donc elle exige un binaire. **Le bac à sable ne peut donc PAS passer avant le
> build**, contrairement à ce qu'annonçait le paragraphe ci-dessous.
> ⚠️ Et la fiche d'app elle-même n'a **AUCUNE capture** (version 1.0,
> `PREPARE_FOR_SUBMISSION`, mesuré par l'API le 2026-08-25). Deux familles de captures
> distinctes, toutes deux manquantes : celles de la FICHE (ce que voient les acheteurs,
> produites par `npm run store:assets` — cinq écrans qui **n'incluent pas le paywall**)
> et celle de REVIEW (par abonnement, montre le paywall).
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

   ✅ **QUATRE produits existent, en DEUX paliers tarifaires** (état au 2026-08-25,
   mesuré par `npm run check:abonnements` — cette table ne se recopie pas, elle se relit) :

   | Product ID | Durée | Prix FR | Niveau | En vente |
   |---|---|---|---|---|
   | `kyroz_plus_yearly_early` | 1 an | **29,99 €** | 1 | ✅ lancement |
   | `kyroz_plus_monthly_early` | 1 mois | **3,99 €** | 2 | ✅ lancement |
   | `kyroz_plus_yearly` | 1 an | 39,99 € | 1 | standard, en réserve |
   | `kyroz_plus_monthly` | 1 mois | 4,99 € | 2 | standard, en réserve |

   🔴 **DEUX formules à l'écran, pas trois.** L'annuel portait un second mode de paiement
   — « payé au mois, engagement 12 mois », 3,99 €/mois — que le paywall n'a jamais affiché.
   **Retiré le 2026-08-25** : avec l'early bird mensuel à 3,99 €, deux offres auraient
   porté le même prix mensuel dont l'une engageait douze mois.
   ⚠️ **L'API NE SAIT PAS le retirer** (« Only future price changes can be deleted ») : ça
   se fait dans l'interface, fiche produit → **Disponibilité** → colonne de DROITE →
   « Supprimer la facturation mensuelle ». ⚠️ Son voisin de gauche s'appelle « Retirer de
   la vente » et supprimerait l'annuel en entier.
   ➡️ **À REFUSER DÈS LA CRÉATION** des prochains produits — Apple le propose par défaut,
   et créer un produit par l'API ne le pose jamais.

   🔴 **LE NIVEAU DE GROUPE COMPTE, et il est contre-intuitif.** Apple : *« Level 1
   represents the subscription that offers the most »*. Vers un niveau plus haut = montée
   en gamme immédiate au prorata ; vers un plus bas = différée à la prochaine échéance.
   Les annuels sont donc au **niveau 1**, les mensuels au **2** — sinon « je passe à
   l'annuel » ferait attendre la fin du mois. ⚠️ Les mettre au MÊME niveau ne suffit pas :
   à rang égal c'est un crossgrade, différé lui aussi entre deux durées différentes.
   ⚠️ **Et ça ne se voit pas à l'écran** : l'interface affiche l'annuel en haut de liste
   même quand les deux partagent le rang 1. Seul `check:abonnements` le dit.

   ⚠️ **Créer un produit par l'API : la DISPONIBILITÉ vient AVANT le prix.** Un produit
   neuf n'est vendable nulle part, et Apple refuse alors le prix — mais son erreur est
   `ENTITY_ERROR.RELATIONSHIP.INVALID` **sur le price point**, donc elle accuse l'objet
   qu'on vient de vérifier. Reprendre la liste de territoires (175) du produit standard.
   ⚠️ Et les paliers de prix se **paginent** : 800 pour un annuel, 200 par page.
   ℹ️ La facturation mensuelle avec engagement n'est **pas disponible** à Singapour
   ni aux États-Unis — 173 territoires sur 175.

   ⚠️ **Les `Product ID` doivent être identiques au caractère près côté Google et
   dans RevenueCat.** C'est la source d'erreur n°1 : un `_yearly` écrit `_annual`
   d'un côté et l'achat échoue en silence à l'exécution.
   Chaque produit réclame en plus un **nom affiché** + une **description** localisés
   FR, et une **capture d'écran de review** (l'écran de paywall — donc à produire
   après le câblage, ou une maquette provisoire).
5. **Google Play Console** → *Monétisation* → *Abonnements* : créer **un** abonnement
   `kyroz_plus` avec **deux base plans** (mensuel / annuel), mêmes prix.
> 🔴 **MESURÉ LE 2026-08-27 : L'APP ANDROID N'EST PAS RATTACHÉE** (constat 01-07).
> `eas env:list production` ne rend que `EXPO_PUBLIC_REVENUECAT_IOS_KEY` —
> `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` est **absente des trois environnements**.
> L'étape 6 ci-dessous est donc écrite au futur alors qu'elle décrit une moitié faite.
>
> **Ce que ça fait, exactement** : sur Android `purchasesConfigured()` (`lib/purchases.ts:67`)
> vaut `false`, donc **aucun bouton d'achat n'est rendu**. La dégradation est PROPRE —
> pas de crash, pas d'écran mort, pas de bouton qui échoue — mais Android ne peut rien
> vendre, et rien à l'écran ne le dit.
>
> ✅ **TRANCHÉ LE 2026-08-27 — ANDROID NE SORT PAS.** Décision fondateur, dite en toutes
> lettres : *« dans tous les cas l'app ne sort pas sur le Google store pour l'instant, ça
> sera le taff de la semaine pro »*. La V1 est donc **iOS SEULE**.
> 🔴 **CETTE FICHE A DIT « Android sort sans achat in-app » PENDANT UNE HEURE, et c'était
> déjà trop faible.** L'arbitrage écrit plus tôt supposait qu'Android partait quand même,
> sans bouton d'achat. Il ne part pas du tout : la question de la clé ne se pose donc pas
> encore, elle est **reportée avec tout le chantier Android**.
> ⚠️ Conséquence pratique : rien de Google n'est sur le chemin critique du build (7). La
> fiche store Google, l'abonnement `kyroz_plus`, l'app Play Console et la clé `goog_…`
> partent ensemble, la semaine du 2026-08-31.
> ⚠️ **Ce n'était qu'à moitié un choix** : poser la clé n'est pas un geste mais une CHAÎNE
> dont aucun maillon n'existe — app Play Console, abonnement `kyroz_plus` et ses deux base
> plans, app Android rattachée dans RevenueCat, puis la clé `goog_…`. Les deux seuls builds
> Android datent du **2026-07-30**, un mois avant le chantier paywall. Ce qui se décidait,
> c'était de l'ÉCRIRE plutôt que de laisser croire à la parité.
> ➡️ **Donc le point 6 ci-dessous décrit l'objectif iOS, pas l'état Android** : sur Android
> `purchasesConfigured()` reste faux, aucun bouton d'achat n'est rendu, et l'écran Kyroz+ le
> DIT désormais (la phrase qui promettait « tes deux outils restent actifs » était devenue
> fausse le jour où la date a été posée — corrigée, et comptée par `verrouKyrozPlus.test.ts`).
> ⚠️ **La fiche store Google doit dire la même chose** : pas d'achat in-app sur Android en
> V1. Ne pas recopier la description iOS telle quelle.

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

✅ **L'écart est CLOS le 2026-08-25.** Ce paragraphe disait que le paywall « devra
présenter trois formules » alors qu'il en présentait deux. C'est le TROISIÈME mode de
paiement qui est parti, pas l'écran : l'annuel payé au mois a été retiré chez Apple.
L'écran en présente donc deux, et c'est désormais exact.
ℹ️ Le code adresse le palier **en vente** (`_early`). Le jour du retrait de l'offre de
lancement, on bascule les deux `storeProductId` de `lib/premium.ts` vers le standard :
c'est du JavaScript, donc une **OTA**, sans nouvelle revue.

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

> **ASO — 25 des 30 caractères du Nom ne portent aucun terme de recherche (2026-08-18).**
> Apple pèse le champ Nom plus lourd que le sous-titre et que les mots-clés pour le
> classement recherche ; un nom mono-mot ne capte donc rien. **Recommandation** :
> `Kyroz — Plan repas & macros` (27 car.) — decision de MARQUE, pas technique, donc pas
> appliquée ici tant que tu n'as pas tranché. Le sous-titre couvre déjà « repas »/« macros » ;
> les reprendre dans le nom coûte un peu de budget caractères mais rend la fiche lisible
> d'un coup d'œil pour une marque encore inconnue — un arbitrage, pas un calcul.

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
• Liste de courses (qui déduit ce que tu as déjà) + réserve, le frais et le sec
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
✅ **Re-mesuré le 2026-08-18** : toujours **512**. Rien n'a dérivé depuis le 2026-08-03.

**Description courte Google Play** (80 car. max — champ distinct du texte promotionnel
Apple, affiché SOUS le titre avant le « en savoir plus », **manquait à cette fiche**) :
`Ton plan de repas 7 jours, précis à la macro, selon ton objectif et ton sport.` (78 car.)

**Mots-clés Apple** (100 car., séparés par des virgules, sans espaces) :
`rééquilibrage alimentaire,macros,musculation,seche,prise de masse,proteine,calories,nutrition,regime`

> ⚠️ **Compte mesuré à EXACTEMENT 100/100** (`[...chaine].length`, pas une lecture à l'œil)
> — zéro marge. Toute retouche ultérieure devra couper avant d'ajouter ; `regime` est le
> premier candidat. Revu le 2026-08-18 :
> - **Retirés** : `fitness` (redondant avec la catégorie Santé et forme elle-même, très
>   concurrentiel) · `sport` (trop générique pour capter une recherche précise) ·
>   `meal prep` (terme anglophone, plus faible sur un marché francophone que l'équivalent
>   français) · `repas` (déjà couvert par le SOUS-TITRE — le répéter dans les mots-clés
>   n'ajoute aucun terme neuf à ce que l'algorithme indexe déjà).
> - **Ajoutés** : `rééquilibrage alimentaire` — la formulation la plus cherchée en France
>   pour « mieux manger durablement », plus large que « régime » et sans sa connotation ;
>   absente de toute la fiche jusqu'ici. `musculation` en toutes lettres à la place de
>   l'abréviation `muscu` seule — plus long mais plus cherché tel quel.
> - **Gardés** : les termes bodybuilding/nutrition à fort volume et propres à Kyroz
>   (`seche`, `prise de masse`, `proteine`, `calories`, `macros`, `nutrition`) et `regime`
>   — connotation à éviter dans les textes VISIBLES (§10 CLAUDE.md), mais ce champ est
>   invisible à l'utilisateur : il ne sert qu'à matcher une recherche, pas à donner le ton.
> - **Non résolu par manque de place** : `objectif`, pourtant central à la promesse Kyroz
>   (objectif daté). Retenu pour le NOM plutôt que les mots-clés, cf. note ci-dessus — un
>   mot seul et abstrait a peu de valeur de recherche isolé, il porte mieux dans un titre.

**Catégorie** : Santé et forme (Health & Fitness). Secondaire (Google) : Nutrition.

**URL politique de confidentialité** (obligatoire, déjà en ligne, HTTP 200) :
`https://kyroz.app/legal.html`

> Changée le 2026-08-18. L'ancienne (`https://brgkevin-arch.github.io/Kyroz-app/legal.html`)
> reste servie et valide, mais elle expose un **pseudo personnel** dans un champ public de
> fiche produit. La nouvelle est sur le domaine de la marque et sert le **même fichier
> généré** depuis `constants/legal.ts`.
>
> ⚠️ **Ne PAS déplacer le site Pages de l'app derrière un domaine personnalisé** pour
> arriver au même résultat — et ce n'est pas une précaution théorique : ça a été fait le
> 2026-08-18, et **le site public n'a plus rien chargé** pendant des heures. Un domaine
> personnalisé s'applique à un SITE, jamais à un fichier : tout le Pages suit,
> `confirme.html` compris — l'URL de retour de confirmation d'e-mail, codée en dur
> (`lib/emailConfirmation.ts`), gravée dans les binaires déjà distribués et inscrite en
> liste blanche Supabase. Le domaine a été retiré le soir même.
> ➡️ La valeur à déclarer reste `https://kyroz.app/legal.html`, servie par le dépôt
> `kyroz-site`, où rien ne l'écrase.

**Support / contact** : `contact@kyroz.app`

---

## 3-bis. La fiche a été remplie PAR L'API — état au 2026-08-28, 02 h

> **Ce que ce chantier a appris, et qui vaut plus que la fiche elle-même : presque tout
> App Store Connect s'écrit par l'API.** Ce dossier décrivait §3 comme « textes à
> copier-coller » depuis juillet. Les 9 champs, les 10 captures, la classification d'âge
> et les 175 territoires ont été posés sans ouvrir la console. **Le seul point du dossier
> qui résiste vraiment est App Privacy** (cf. §4) — pas les textes.
>
> 🔴 **Correction du 2026-08-28, 02 h 20 : ils sont DEUX.** App Store Connect a levé une
> bannière « Déclarez votre dispositif médical réglementé » (obligatoire pour distribuer
> dans l'UE/EEE, au Royaume-Uni et aux États-Unis). Ni `/v1/apps` ni `/v1/appInfos` ne
> portent d'attribut correspondant : **déclaré à la main, comme App Privacy.**
> ➡️ Réponse : **NON**. Kyroz calcule des besoins nutritionnels et impose des planchers
> de sécurité ; il ne revendique aucune finalité médicale. Au sens du règlement européen,
> c'est la **revendication** qui sépare le bien-être du dispositif, pas la complexité du
> calcul — et c'est déjà la dernière phrase de la note au relecteur (§11).
>
> ⚠️ **Une bannière peut apparaître PARCE QU'on a écrit ailleurs.** Celle sur les
> « nouvelles questions réseaux sociaux » dit ne pas être obligatoire avant le
> 2026-09-07 « sauf si vous soumettez une nouvelle app **ou mettez à jour d'autres
> réponses dans cette section** » — ce que l'écriture du questionnaire d'âge par l'API
> venait de faire. Le champ manquant était `socialMediaAgeRestricted`, resté **nul**
> après mon premier envoi parce que je ne l'avais pas listé : le PATCH avait réussi sans
> le réclamer. **Un lot accepté ne prouve pas qu'il était complet.**

| Élément | Valeur posée | Mesure |
|---|---|---|
| Nom | `Kyroz` — **inchangé, décision du fondateur le 2026-08-28** | 5/30 |
| Sous-titre | `Repas calés sur tes macros` | 26/30 |
| Description | avec le bloc **KYROZ+** (voir plus bas) | 1 406/4 000 |
| Mots-clés | inchangés | **100/100 — zéro marge** |
| Texte promotionnel | inchangé | 121/170 |
| URL assistance + marketing | `https://kyroz.app` | — |
| Catégories | `HEALTH_AND_FITNESS` + `FOOD_AND_DRINK` | — |
| Captures | **10** : 5 iPhone (1290×2796) + 5 iPad (2048×2732) | toutes `COMPLETE` |
| Classification d'âge | **18+** | voir ci-dessous |
| Droits de contenu | `USES_THIRD_PARTY_CONTENT` | Ciqual/ANSES sous Licence Ouverte 2.0 |
| Prix de l'app | **gratuite**, territoire de base France | — |
| Disponibilité | **175 territoires** + les nouveaux | — |
| Build attaché | le **(8)**, `VALID` | — |
| Notes de revue | 3 952 caractères | §11 |
| 🔴 Mot de passe de démo | **VIDE** | seul champ restant |

### Le 18+ a été obtenu SANS fausser une réponse

Le §6 demandait d'« atteindre » le classement adulte, ce qui se lit comme une invitation à
forcer le questionnaire. **Ce n'était pas nécessaire** : Apple expose `ageRatingOverrideV2`
(`NONE` · `NINE_PLUS` · `THIRTEEN_PLUS` · `SIXTEEN_PLUS` · `EIGHTEEN_PLUS` · `UNRATED`), un
relèvement volontaire prévu pour exactement ce cas. Les 21 réponses mécaniques sont à
`NONE`/`false` ; les deux seules qui relèvent du jugement sont `healthOrWellnessTopics: true`
et `medicalOrTreatmentInformation: INFREQUENT_OR_MILD` (seuils cliniques et littérature citée
à l'écran Méthodologie).
⚠️ `ageRatingOverride` et `ageRatingOverrideV2` **s'excluent** ; poser V2 renseigne l'autre.

### Ce qui a été AJOUTÉ à la description, et pourquoi

La description disait « **100 % gratuit sur le cœur** » et ne mentionnait pas l'abonnement.
Vrai le 2026-07-17, faux depuis le 2026-08-27. Un bloc **KYROZ+** le remplace : prix des deux
formules, renouvellement automatique, gestion dans les réglages Apple, lien CGU + politique —
ce qu'exige la guideline **3.1.2**, et ce qu'impose la règle « pas de mensonge ».
➡️ **Même défaut que la note au relecteur, au même endroit du dossier** : un texte figé qui
décrit un produit qui bouge. Les deux ont dû être corrigés le même soir.

### Deux erreurs d'INSTRUMENT, la même nuit

Mon contrôle a dit « aucune catégorie », puis « disponibilité HTTP 400 », alors que les deux
étaient posées. Cause identique : `GET /v1/apps/{id}` ne rend le `data` d'une relation que si
on l'`include`, et `limit[…]` plafonne à **50**. ➡️ **Un contrôle qui contredit une écriture
réussie accuse d'abord la fiche ; c'est l'instrument qu'il faut mesurer en premier.**

---

## 4. Confidentialité — réponses aux formulaires (fondées sur le vrai flux de données)

> Base factuelle : compte Supabase (UE), profil = données de santé, photos
> **local-only jamais envoyées**, **aucune mesure d'audience** (éteinte le 2026-08-26,
> cf. AGENTS.md E66), pas de pub, pas de tracking inter-applications. Suppression du
> compte + données possible **dans l'app** (Profil → supprimer le compte).
>
> 🔴 **LES DEUX FORMULAIRES SONT PUBLIÉS ET DÉCLARENT ENCORE L'ANALYTICS.** C'est une
> déclaration publique qui sur-déclare : elle annonce une collecte qui n'a plus lieu.
> Moins grave que l'inverse, mais faux quand même — et c'est exactement le défaut que
> ce dépôt traque partout ailleurs. ➡️ **À reprendre dans App Store Connect** (App
> Privacy → retirer *Product Interaction* / *Analytics*) **et dans Play Console**
> (Sécurité des données → retirer « actions dans l'app »). Tant que ce n'est pas fait,
> les tableaux ci-dessous portent la version À DÉCLARER, pas celle qui est en ligne.
>
> ⚠️ **Ces deux formulaires se remplissent ENSEMBLE.** Ils décrivent le même flux de
> données dans deux vocabulaires ; n'en mettre qu'un à jour crée une contradiction que
> personne ne relit — et ce sont deux déclarations publiques, pas deux brouillons.

### Apple — « App Privacy »
| Donnée | Collectée ? | Usage | Liée à l'identité ? | Tracking ? |
|---|---|---|---|---|
| Adresse e-mail | Oui | Fonctionnement de l'app (compte) | Oui | Non |
| Santé & forme → **Santé** (poids, taille, %MG, objectif, régime, pesées) | Oui | Fonctionnement de l'app | Oui | Non |
| Santé & forme → **Forme physique** (niveau d'activité, jours d'entraînement, sports) | Oui | Fonctionnement de l'app | Oui | Non |
| Identifiant utilisateur (ID compte) | Oui | Fonctionnement de l'app | Oui | Non |
| Photos (progression) | **Non collectée** | — | — | — (restent sur l'appareil) |
| Données d'usage / analytics | **Non collectée** (éteint le 2026-08-26) | — | — | — |
| **Suivi (tracking)** | **NON** — pas d'ATT, pas de pub, pas de partage tiers | | | |

> 🟠 **Le manifeste embarqué ne dit PAS la même chose que le formulaire — relevé le 2026-08-28.**
> `ios/Kyroz/PrivacyInfo.xcprivacy` (généré par `prebuild`, donc jamais relu à la main) porte :
>
> | Clé | Valeur dans le (8) | Verdict |
> |---|---|---|
> | `NSPrivacyTracking` | `false` | ✅ juste |
> | `NSPrivacyAccessedAPITypes` | 3 entrées (FileTimestamp, UserDefaults, SystemBootTime) | ✅ c'est ce qui évite les avertissements `ITMS-91053` |
> | `NSPrivacyCollectedDataTypes` | **tableau VIDE** | 🟠 le formulaire en déclare **quatre** (santé, e-mail, ID utilisateur, achats) |
>
> **Ce n'est pas bloquant et ça ne se corrige pas ce soir** : les contrôles automatiques d'Apple
> portent aujourd'hui sur les *API à motif obligatoire* et les *domaines de suivi*, pas sur la
> cohérence de ce tableau — et il est **déjà dans le binaire parti chez Apple**. ➡️ À reprendre
> au prochain binaire, via `app.json` → `ios.privacyManifests` (le dossier `ios/` est ignoré par
> git et régénéré : le corriger sur place ne survivrait pas à un `prebuild`).
>
> ⚠️ Ce défaut est de la famille « personne ne relit ce qui est généré » : il ne se voit ni dans
> le dépôt, ni dans App Store Connect, seulement en ouvrant le fichier produit.

### Google Play — « Sécurité des données »
- **Collectées** : e-mail ; infos de santé (poids, objectif, régime) ; ID compte.
  ⚠️ **Plus d'« actions dans l'app »** (« App interactions ») : la mesure d'usage est
  éteinte depuis le 2026-08-26, plus aucun événement ne part.
- **Chiffrées en transit** : oui. **Stockage** : Supabase à Francfort (UE).
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

> ### 📦 `.easignore` — l'archive envoyée à EAS faisait **478 Mo pour 18 Mo versionnés**
> Mesuré et corrigé le **2026-08-27** (eas-cli 20.1.0), après le build (7).
>
> **Le symptôme.** À chaque build, EAS affichait `« Your project archive is 478 MB »`.
> Or le dépôt versionné pèse 18 Mo, et il n'y avait aucun fichier non suivi. L'archive
> emportait donc des fichiers **ignorés par git** — mais lesquels ? Le fichier n'a pas
> été écrit contre une supposition : la cause a d'abord été mesurée en exécutant
> hors-ligne la vraie classe `Ignore` d'eas-cli (`build/vcs/local.js`) sur le dépôt.
>
> **La cause, ventilée.** 1337 Mo étaient copiés, dont :
>
> | ce qui partait chez EAS | poids |
> |---|---|
> | `.claude/worktrees/supabase-confirmation-email-c6b816/kyroz-app` | 1226 Mo |
> | `.claude/worktrees/aso-ef1e7c/kyroz-app` | 77 Mo |
> | `.claude/worktrees/external-test-credentials-76d2ec/kyroz-app` | 16 Mo |
> | `kyroz-app` ← **le seul qui avait à y être** | 17 Mo |
>
> Deux angles morts d'eas-cli, qui se cumulent :
> 1. **`.claude/worktrees/` n'est exclu que par `.git/info/exclude`** — un fichier
>    local, non versionné. eas-cli ne le lit jamais : il ne cherche que des fichiers
>    nommés `.gitignore`.
> 2. **Les `.gitignore` internes aux worktrees ne sont pas chargés non plus** : le glob
>    `**/.gitignore` d'eas-cli ne traverse pas les dossiers cachés. Le `kyroz-app/ios`
>    d'un worktree (1,1 Go de Pods + build Xcode) partait donc en entier — alors que le
>    `kyroz-app/ios` du dépôt principal, lui, était bien exclu. Préfixes d'ignore
>    réellement chargés : `["", "", "kyroz-app/", "kyroz-app/ios/"]` — aucun sous `.claude/`.
>
> **Le résultat**, mesuré en exécutant le pipeline d'archivage réel d'eas-cli :
>
> | | contenu | `.git` du clone | archive `.tar.gz` |
> |---|---|---|---|
> | avant | 467,2 Mo | 10,4 Mo | **477,6 Mo** → EAS annonçait 478 Mo |
> | après | 10,2 Mo | 10,4 Mo | **14,1 Mo** |
>
> 12 184 fichiers → 503. Confirmé par eas-cli lui-même au build suivant :
> `Uploading to EAS Build (0 / 14.0 MB)`. L'avertissement de taille (seuil : 150 Mo)
> a disparu.
>
> **Où vit le fichier : à la racine du DÉPÔT GIT**, pas dans `kyroz-app/` où se trouve
> pourtant `eas.json`. eas-cli lit `path.join(await getRootPathAsync(), '.easignore')`,
> et `getRootPathAsync()` est `git rev-parse --show-toplevel`. Confirmé dans le log d'un
> build réel : `.easignore exists … sourceEasignorePath: '<racine du dépôt>/.easignore'`.
> Dans un worktree, cette racine est celle **du worktree** : le fichier étant versionné,
> il s'y trouve aussi, et les motifs ancrés `/kyroz-app/…` y mordent pareil. ✔
>
> ### 🔒 Les deux pièges à ne jamais oublier en touchant à ce fichier
>
> **1. `.easignore` REMPLACE les `.gitignore`, il ne s'y ajoute pas.**
> (eas-cli : *« if .easignore exists, .gitignore files are not used »*.) Tout motif
> qu'on en retire **re-monte** dans l'archive — **les motifs de secrets compris**. C'est
> pour cette raison précise qu'il n'avait pas été écrit à la va-vite avant la
> soumission : un `.easignore` partiel aurait fait re-monter `.env*`, `*.p8`, `*.p12`,
> `*.key`, `*.pem`, `*.mobileprovision`, `*.jks`. Le risque n'est pas théorique — un
> `kyroz-app/.env.local` existe déjà dans un worktree. Ces motifs sont donc vérifiés un
> par un par un test de chemins témoins (y compris à l'intérieur d'un worktree) avant
> toute modification du fichier. La clé App Store Connect, elle, vit **hors du dépôt**
> (`~/.eas-credentials/`, cf. `ascApiKeyPath` dans `eas.json`) : jamais concernée.
>
> **2. Pas de barre finale sur un motif de dossier.** Mesuré : avec `dist/`, la
> bibliothèque `ignore` répond « non ignoré » pour le dossier `dist` lui-même — elle ne
> sait pas que c'en est un. 14 motifs du fichier étaient dans ce cas. Le contenu
> finissait exclu quand même, fichier par fichier, mais eas-cli descendait inutilement
> dans l'arborescence et le motif ne mordait plus sur un dossier remplacé par un lien
> symbolique. C'est la **même leçon** que celle déjà écrite dans les deux `.gitignore`
> du dépôt à propos de `node_modules`.
>
> **Ce qui sort de l'archive alors que c'est versionné** — 16 fichiers, tous
> volontaires : `.claude/` (outillage Claude Code) et `kyroz-app/assets/bodyfat/_source/`
> (7,1 Mo de planches sources ; vérifié : le bundle ne charge que `{male,female}-1..6.png`,
> par `require()` statiques dans `components/BodyFatPicker.tsx`). Aucun fichier n'**entre**
> dans l'archive du fait de ce changement.
>
> **Aucun effet sur les OTA.** Le `runtimeVersion` est un fingerprint calculé sur des
> sources précises (`.gitignore`, `eas.json`, `assets/icon.png`, `assets/splash-icon.png`,
> `ios/`, et les plugins de `node_modules`) — `.easignore` n'en fait pas partie. Vérifié
> en le calculant avec puis sans le fichier : `16dc5ce9…` dans les deux cas. Les mises à
> jour OTA déjà publiées restent donc compatibles avec les binaires en circulation.
>
> **`.git` n'est volontairement PAS ignoré.** eas-cli le traite en cas spécial : si
> `.easignore` l'ignore, il supprime le `.git` du clone shallow envoyé. Gain mesuré :
> 10,4 Mo — sans enjeu une fois l'archive à 14 Mo, pour un changement de comportement
> non testé. Écarté sciemment.
>
> **Le contrôle à refaire** : la ligne `« Your project archive is X MB »` au premier
> build lancé **depuis le dépôt principal** après le merge. Elle ne doit plus apparaître
> du tout (seuil d'affichage : 150 Mo). Si elle réapparaît, c'est qu'un nouveau dossier
> lourd est ignoré par un chemin qu'eas-cli ne lit pas (`.git/info/exclude`, ou un
> `.gitignore` dans un dossier caché) : le mesurer avec la classe `Ignore` d'eas-cli
> plutôt que de deviner.

> ### 🧪 Un build lancé depuis un worktree échoue si ses `node_modules` sont périmés
> Rencontré le 2026-08-27 en vérifiant le `.easignore` ci-dessus. Deux builds `preview`
> ont échoué sur `« Unknown error. See logs of the Configure expo-updates build phase »`
> — sans rapport avec l'archive, qui s'était uploadée correctement.
>
> **La cause** : le worktree avait `node_modules/expo` en **56.0.12** alors que son
> `package-lock.json` disait **57.0.17**. eas-cli calcule le `runtimeVersion` (fingerprint)
> **en local**, avec l'`expo-updates` installé — donc en 56 — pendant que le serveur
> installe depuis le lock et build en 57. Les deux empreintes divergent et la phase
> `Configure expo-updates` casse. EAS le disait à qui savait lire : `SDK Version 56.0.0`
> dans `eas build:view`, pour un projet en SDK 57.
>
> **Le réflexe** : après un changement de SDK, `npm ci` **dans chaque worktree** avant
> d'y lancer un build — les `node_modules` d'un worktree ne suivent pas ceux du dépôt
> principal. Et pour lire l'erreur réelle d'un build, l'API GraphQL d'Expo donne le
> détail sans passer par le navigateur :
> ```bash
> SESSION=$(node -p "require(require('os').homedir()+'/.expo/state.json').auth.sessionSecret")
> curl -s -X POST https://api.expo.dev/graphql -H "Content-Type: application/json" \
>   -H "expo-session: $SESSION" \
>   -d '{"query":"query { builds { byId(buildId: \"<BUILD_ID>\") { status error { errorCode message } logFiles } } }"}'
> ```

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
- [ ] 🔴 **APRÈS LA REVUE : FAIRE TOURNER LE CODE** (constat 01-12, écrit le 2026-08-27).
      Le point ci-dessus dit comment POSER le code ; rien ne disait quand le retirer, et
      un accès de revue qu'on n'a pas prévu de refermer ne se referme jamais.
      **Ce qui est mesuré, et assumé** : `EXPO_PUBLIC_REVIEW_CODE` est une variable
      `EXPO_PUBLIC_*`, donc **inlinée à la compilation** — elle est bel et bien **dans le
      binaire publié** (relevée sur le `.hbc` de la 24ᵉ OTA : 1 occurrence, avec
      `review@kyroz.app`). Quiconque extrait les chaînes du binaire peut donc ouvrir une
      session invité. **La RLS tient** — aucun accès aux données d'autrui — le risque est
      une création d'invités non maîtrisée, pas une fuite.
      ⚠️ **La surface scriptable, elle, reste fermée**, et c'est ce qui maintient ce point
      en P2 : le bundle WEB déployé contient l'e-mail sentinelle mais **pas le code**
      (mesuré, témoin de contrôle `supabase` à 13). `deploy.yml` ne pose pas la variable —
      **ne jamais l'y ajouter**.
      ➡️ **Deux gestes, une fois la revue passée :**
      1. `eas env:delete production --name EXPO_PUBLIC_REVIEW_CODE` (ou une nouvelle
         valeur aléatoire si une revue reste à venir) — **puis un nouveau build** : le
         code vit dans le binaire, une OTA ne le retire pas ;
      2. remplacer par le mécanisme **daté et chiffré** déjà décidé (mémoire
         « Compte invité : après la revue »), pour que le prochain accès de revue expire
         tout seul au lieu de dépendre d'un geste qu'on doit se rappeler.
      ⚠️ Ne rien toucher **avant** la soumission : l'auth anonyme est active et le code
      est ce qui permet au reviewer d'entrer. C'est un geste d'APRÈS, pas un correctif.
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
→ Opens a guest session, straight to onboarding.

WALKTHROUGH (~2 min)
- Onboarding: first name → basic info + body-fat picker → sports → goal →
  preferences (diet) → plan days + meals. Tap "Générer mon plan" ("Generate my plan").
- "Plan" tab: each day's meals with precise macros; tap one to open the recipe with
  adjusted quantities.
- Other tabs: "Courses" (shopping list), "Recettes", "Profil" (settings + account
  deletion).

NOTES
- App language is French; theme is dark.
- No ads, no third-party tracking. The meal-plan engine runs on-device: generating a
  plan needs no server call.
- The app offers ONE auto-renewable subscription, "Kyroz+" — see the next section.

IN-APP PURCHASE - "Kyroz+" (auto-renewable subscription)
Where to find it: "Profil" tab (rightmost) -> scroll to the bottom -> "Kyroz+".

The demo access above opens a NEW guest account every time, so the paywall IS shown.
(Accounts created before 2026-08-27 keep Kyroz+ free for life, per our published
terms, so an older test account does not show the purchase screen.)

Two options, French pricing:
- "Mensuel"  EUR 3.99 / month  (product id: kyroz_plus_monthly_early)
- "Annuel"   EUR 29.99 / year  (product id: kyroz_plus_yearly_early)

What the subscription unlocks:
- "Objectif date" - a dated goal: the user sets a target weight and a date, and the app
  computes a sustainable trajectory, re-adjusting calories at every weigh-in.
- "Suivi de transformation" - weight curve against the intended trajectory, plus
  before/after progress photos. Photos never leave the device.

What stays free, permanently: the weekly meal plan with macros, the shopping list, all
recipes, the pantry, favourites, the streak, weigh-ins, calorie recalculation and
account sync. None of these will move behind the subscription.

"Restaurer mes achats" ("Restore purchases") is on the same screen, directly under the
subscribe button.
- Health disclaimer shown in-app: Kyroz is for healthy adults and does not replace
  medical or dietitian advice. Users under 18 are blocked during onboarding.
- Data (email, profile) is stored in the EU (Supabase). Users can delete their
  account and data in-app (Profil → delete account). Photos never leave the device.

METHODOLOGY AND SOURCES (guideline 1.4.1)
An in-app screen discloses every formula, threshold and source behind the numbers we
display: Profil -> gear icon -> "Aide et retours" -> "Méthodologie & sources".
- Resting metabolic rate: Mifflin-St Jeor (Am J Clin Nutr 1990;51(2):241-247).
  Katch-McArdle only when the user states their body fat was MEASURED; if it was
  estimated from a silhouette the two are blended, and only upward.
- Activity factor excludes exercise, capped at 1.45; training expenditure computed
  separately from net MET values (Ainsworth et al., MSSE 2011;43(8):1575-1581).
- Food composition: Ciqual 2025 (ANSES), reused under Open Licence 2.0 (Etalab).
- Hard safety limits applied to every calculation, whatever the user asks for:
  energy availability never below 30 kcal/kg fat-free mass (IOC RED-S consensus,
  BJSM 2018;52(11):687-697); absolute floor 1500 kcal (men) / 1200 kcal (women);
  deficit capped at 25% of expenditure; fat never below 0.8 g/kg; a maintenance
  week enforced after 8 consecutive deficit weeks.
- Protein bounded to 1.6-2.6 g/kg fat-free mass (ISSN, JISSN 2017;14:20).
- The screen states which values come from the literature and which are Kyroz's own
  conservative choices, and that recipes are NOT dietitian-validated.

Kyroz is a wellness app. It is not a medical device: it does not diagnose, treat,
cure or prevent any condition, and makes no such claim anywhere in the app.
```

🔴 **LE CHAMP D'APPLE PLAFONNE À 4 000 CARACTÈRES — mesuré le 2026-08-28 en le
remplissant par l'API, pas en le lisant.** La note en faisait **4 476** : elle était
impossible à coller, et rien ne le disait. La section « Methodology and sources » a été
resserrée (sources, seuils et limites tous conservés ; c'est la prose qui a fondu).
➡️ **Toute addition future doit être payée par une soustraction.** Le contrôle :
`node -e "..."` sur le bloc, ou l'écriture par l'API qui refuse en `409`.

⚠️ **Les chiffres ci-dessus sont RECOPIÉS d'un écran qui, lui, les lit dans le moteur**
(`lib/methodologie.ts`). C'est le seul endroit du dépôt où ils sont écrits à la main, et
c'est assumé : une note de soumission est un texte figé, collé une fois dans un
formulaire. ➡️ **Les relire avant de coller**, et se fier à l'écran en cas d'écart —
lui ne peut pas mentir, il est verrouillé par `lib/__tests__/methodologie.test.ts`.

⚠️ **LA SECTION « IN-APP PURCHASE » A ÉTÉ AJOUTÉE LE 2026-08-28, ET CE QU'ELLE REMPLACE
VAUT D'ÊTRE GARDÉ** : la note disait « **No payment**, no ads. Works offline. » Elle était
vraie le 2026-07-17, jour où elle a été écrite ; elle est devenue fausse le 2026-08-27,
quand `PAYWALL_LAUNCH` a été posée. Le relecteur aurait donc lu « aucun paiement » puis
trouvé un écran d'achat — une contradiction dans le dossier de soumission, sur la ligne
qu'il lit en premier.
➡️ **Une note de soumission est un texte FIGÉ collé dans un formulaire : elle ne se
périme pas toute seule, et aucun test ne la relit.** Elle décrit un produit qui, lui,
bouge. À relire intégralement avant CHAQUE soumission, pas seulement à la première.
✅ Ce qui n'a PAS eu à changer, et c'est le (8) qui l'a sauvé : l'accès relecteur ouvre
une **session invité créée à l'instant** (`login.tsx` → `isReviewLogin` → `guest()`),
donc postérieure au lancement du paywall, donc verrouillée — il voit bien l'écran
d'achat. Avec le (7), ce même compte neuf aurait affiché « Inclus à vie » pendant toute
sa première session, et le relecteur n'aurait rien eu à tester.

*Playbook préparé le 2026-07-17. Config technique prête ; le chemin critique = le bac à
sable (`docs/procedures/PROCEDURE-2026-08-27-bac-a-sable.md`), les captures à juger, et la fiche à
remplir.*
