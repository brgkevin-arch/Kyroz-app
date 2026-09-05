# Vidéo d'achat sandbox + test du bouton Apple — procédure, 2026-09-05

> **Une étape à la fois.** Chaque étape dit ce que tu dois VOIR à la fin. On ne passe à
> la suivante que quand tu le vois.

## 🔴 OÙ ÇA EN EST — 2026-09-05 au soir, LIRE EN PREMIER

**Tout est prêt sauf la vidéo, et la vidéo est bloquée par un environnement de test
contaminé.** Rien à corriger dans l'app : le blocage est côté bac à sable Apple.

| | |
|---|---|
| Build **(16)** | ✅ sur TestFlight, `VALID / IN_BETA_TESTING`, commit `4de16d7` |
| Correctif du timeout d'achat | ✅ dedans, vérifié dans le bundle (`sansreponse`) |
| Sign in with Apple | ✅ dedans, **essayé sur appareil et fonctionnel** |
| Fournisseur Apple chez Supabase | ✅ activé par API |
| Profil de signature | ✅ `8FNNKYG5WV`, entitlement vérifié dans son contenu |
| **La vidéo** | 🔴 **bloquée — voir ci-dessous** |
| Soumission | ⏸️ attend la vidéo |

### Le blocage, et sa cause MESURÉE

L'écran Kyroz+ affiche **« Abonnement actif »** sur tout compte Kyroz neuf, donc il n'y a
**rien à acheter** — donc rien à filmer.

La cause, trouvée en interrogeant l'API RevenueCat (clé secrète dans
`~/.eas-credentials/revenuecat-secret`, hors dépôt) :

```
24342d5c-…   apparu 05/09 19:33   MAIS first_seen_at = 01/08 07:00
             2 abonnements · 1 ACTIF · fin 06/09 01:04 UTC (03:04 Paris)
```

🔴 **Un client supprimé REVIENT, avec sa date d'origine.** RevenueCat ne le recrée pas
depuis rien : il le **reconstruit depuis le reçu App Store stocké sur l'appareil**. Le
reçu est la source, la base de RevenueCat n'en est que le miroir.

➡️ **Conséquence directe** : supprimer les clients chez RevenueCat ne sert à RIEN pour
ce problème. Ça a été fait deux fois (30 clients, puis 2), et le droit est revenu à la
connexion suivante, en quelques secondes.

### Ce qui a été essayé, et pourquoi chaque piste est tombée

| Piste | Résultat | Ce qu'on en retient |
|---|---|---|
| « RevenueCat transfère l'abonnement aux comptes neufs » (*Restore Behavior*) | ❌ faux | deux comptes créés dans l'après-midi n'avaient **aucun** droit — mais **aucun compte sandbox n'était connecté à ce moment-là**. La mesure était juste, la conclusion trop large |
| Effacer l'historique d'achats du testeur | ❌ insuffisant | arrête les RENOUVELLEMENTS, ne tue pas la période en cours |
| Supprimer les clients RevenueCat | ❌ inutile | le reçu de l'appareil les reconstruit |
| Se déconnecter du compte sandbox dans les Réglages | ❌ insuffisant | le reçu reste dans le conteneur de l'app |
| Créer un second testeur sandbox | ❌ impossible ce soir | le formulaire d'App Store Connect rend *« Une erreur s'est produite »* sur **trois** adresses différentes (`@kyroz.app`, `sandbox@gmail.com`, `brgkevinpro+sandbox1@gmail.com`). Ce n'est donc pas l'adresse. Les incidents de la page d'état d'Apple dataient du 1ᵉʳ septembre, résolus — donc pas une panne déclarée. **Cause non trouvée**, pistes non éprouvées : le mot de passe (règles Apple ID : 8 caractères, majuscule, minuscule, chiffre) et l'accent de « Kévin » |
| Contourner ce formulaire par l'API App Store Connect | ❌ **impossible, ce n'est pas une panne** | mesuré le 05/09 au soir : `GET /v2/sandboxTesters` répond, `PATCH /v2/sandboxTesters/{id}` et `POST /v2/sandboxTestersClearPurchaseHistoryRequest` existent — **il n'y a AUCUN endpoint de création**. Apple l'écrit : *« Use App Store Connect to create or delete Sandbox Apple Account »*. Le formulaire web est la seule porte, donc l'erreur doit se résoudre là |

### 🔎 RE-MESURÉ LE 05/09 À 19:50 — DEUX FAITS QUI CHANGENT LE PLAN

**1. L'abonnement est marqué « will_renew ».** Le plan « attendre » supposait qu'il
s'éteindrait seul parce que l'historique d'achats avait été effacé. RevenueCat dit le
contraire : `auto_renewal_status = will_renew`, sur `kyroz_plus_yearly_early`, période
du 29/08 01:04 au **06/09 01:04 UTC**. À cette heure-là, il peut donc **repartir pour une
période** au lieu d'expirer. ➡️ Le geste qui rend l'attente fiable est de **résilier
depuis le téléphone** (étape 0 ci-dessous).

**2. L'heure exacte est 03:04 heure de Paris, pas 05:04.** L'expiration est à
`2026-09-06 01:04:30 UTC`, soit **03:04 à Paris** (UTC+2). La ligne « (05:04 Paris) »
plus haut convertissait dans le mauvais sens.

**3. Il n'existe AUCUN testeur sandbox sur le compte** — `GET /v2/sandboxTesters` rend
`total: 0`, avec une clé `ACCOUNT_HOLDER / ADMIN` qui voit toutes les apps (donc ce n'est
pas un défaut de droits). Conséquences : « créer un **second** testeur » est en réalité
« créer **le premier** » ; et `POST /v2/sandboxTestersClearPurchaseHistoryRequest` n'a
personne à nettoyer. L'achat en cours vient donc d'un compte Apple qui n'est pas dans
cette liste — ce qui explique que rien de ce qu'on a tenté côté App Store Connect n'ait
mordu.

### 🟢 CE QU'IL FAUT FAIRE À LA PROCHAINE SESSION

**Étape 0 — couper le renouvellement, ce soir, sur le téléphone.** Sans ça, l'attente
n'est pas garantie. Réglages → App Store → descendre tout en bas → **Compte Sandbox** →
*Gérer* → l'abonnement Kyroz+ → **Annuler l'abonnement**.
➡️ Ce qu'on doit voir à la fin : l'abonnement affiché comme *expirant le 6 septembre*
et non *renouvelable*. La résiliation n'écourte PAS la période en cours — elle garantit
seulement qu'il n'y en aura pas une autre.
➡️ Vérifiable à distance : le champ passe à `will_not_renew` (commande ci-dessous).

1. **Après 03:05 heure de Paris**, vérifier que c'est bien fini, sans toucher au téléphone :
   ```bash
   K=$(tr -d '\r\n' < ~/.eas-credentials/revenuecat-secret); P=proj7396660e
   curl -s -H "Authorization: Bearer $K" \
     "https://api.revenuecat.com/v2/projects/$P/customers?limit=50"
   ```
   puis `…/customers/<id>/active_entitlements` sur chaque client. **Zéro droit actif = feu vert.**
   ⚠️ **`K=$(cat …)` NE MARCHE PAS** — le fichier de clé contient trois lignes, donc
   l'en-tête `Authorization` contient un saut de ligne, donc curl rend `HTTP 000` sans
   rien dire d'utile. C'est `tr -d '\r\n'` qui répare, et l'erreur ressemble à une panne
   réseau alors que c'est la clé qui est mal lue.
   ℹ️ L'état du renouvellement se lit sur
   `…/customers/<id>/subscriptions` → `auto_renewal_status`.
2. Sur le téléphone : tuer l'app, la rouvrir, se connecter avec les identifiants de revue.
3. L'écran Kyroz+ doit s'ouvrir sur **« Piloter ton objectif dans le temps »**.
4. Filmer (§5).

⚠️ **Si le droit revient encore après expiration** : la seule piste restante est un
testeur sandbox neuf — et comme l'API ne sait pas en créer, il faut faire passer le
formulaire web. La contrainte qu'Apple documente et qui explique le mieux un refus
générique : **l'adresse ne doit JAMAIS avoir été un compte Apple, ni avoir servi à
acheter sur l'App Store ou iTunes**. `sandbox@gmail.com` est certainement déjà pris ;
une adresse en sous-adressage (`…+sandbox1@`) peut être rattachée à sa base. Essayer une
adresse **entièrement neuve** sur `@kyroz.app`, un prénom **sans accent**, et un mot de
passe respectant les règles Apple ID (8 caractères, majuscule, minuscule, chiffre).

### Le titre de l'écran est le seul diagnostic fiable

`paywallBanner` (`lib/premium.ts`) rend un titre différent par motif, et ils ne se
confondent pas — c'est ce qu'il faut demander, jamais « est-ce que tu as Kyroz+ » :

| Titre en haut de l'écran Kyroz+ | Motif | Ce que ça dit |
|---|---|---|
| « Ton abonnement Kyroz+ est actif » | `entitled` | RevenueCat a répondu « abonné » |
| « C'est déjà à toi » | `grandfathered` | l'app croit le compte antérieur au 27/08 |
| « Piloter ton objectif dans le temps » | `locked` | **l'état qu'on veut pour filmer** |

⚠️ *Deux heures ont été perdues le 2026-09-05 faute d'avoir obtenu ce mot-là : « j'ai
Kyroz+ » recouvre trois causes sans rien en commun.*

---

## Pourquoi cette vidéo

Rejet Apple `2.1(b)` du 2026-09-04 (build 9) : *« your app started loading indefinitely
after we purchased the subscription »*. Le correctif est livré (timeout de 30 s,
`lib/purchases.ts`), mais Apple exige en plus, pour ce renvoi précis, un enregistrement
d'écran sur **appareil physique** joint aux notes de revue, montrant :

- le parcours complet depuis l'écran d'accueil, avec le compte de démo ;
- un **achat sandbox réussi** ;
- les autres parcours d'achat (le bouton « Restaurer mes achats »).

⚠️ **La vidéo se tourne sur le build (16)**, pas sur le (9). Elle doit montrer l'app
corrigée — sinon elle prouve le contraire de ce qu'on affirme.

ℹ️ **Pourquoi (16) et pas (10)** : quatre tentatives de build ont échoué avant que le
profil de signature ne soit réparé, et EAS incrémente son compteur à CHAQUE tentative,
réussie ou non — puis le (15) a été remplacé par le (16) qui porte le correctif du nonce.
Le numéro n'a aucune signification technique, mais chercher un « (10) » sur TestFlight
ferait perdre du temps : il n'existera jamais.

## Deux choses à faire dans la MÊME session sur le téléphone

Le build (16) porte aussi **Sign in with Apple**. ✅ Le bouton a été essayé sur appareil
le 2026-09-05 et il fonctionne — il ne reste donc que l'achat à filmer (§5).

---

## Étape 0 — débloquer le build ✅ FAIT le 2026-09-05

`eas-cli` a besoin d'une authentification Apple ID interactive (mot de passe + 2FA) pour
regénérer le profil de signature. Claude ne peut pas la faire — c'est le seul geste de
cette procédure qui exige des identifiants.

```bash
cd /Users/kevinberger/Kyroz_Code/kyroz-app
npx eas-cli credentials -p ios
```

| Prompt | Réponse |
|---|---|
| `Which build profile` | **production** |
| `Select your Apple Team Type` | **Individual** |
| `Apple Team ID` | `8F2ZSM5NSY` |
| `What do you want to do?` | **Build Credentials: Manage everything needed to build your project** |
| `What do you want to do?` | **All: Set up all the required credentials to build your project** |
| `Log in to your Apple Developer account` | Apple ID + mot de passe + code à 2 facteurs |
| `Reuse this distribution certificate?` | **oui** |

**Tu dois voir à la fin** : `Provisioning Profile` avec un `Developer Portal ID`, et plus
« None assigned yet ».

✅ **Fait** : profil `8FNNKYG5WV`, créé le 2026-09-05 à 12 h 32. Vérifié dans le CONTENU
du profil (pas dans le message de succès) : `com.apple.developer.applesignin` y est.
C'est ce qui manquait aux quatre builds ratés.

---

## Étape 1 — le compte sandbox Apple

⚠️ **Ce n'est PAS le compte de démo Kyroz.** Deux comptes différents :

| | À quoi ça sert | Identifiants |
|---|---|---|
| **Compte de démo Kyroz** | se connecter DANS l'app | `review@kyroz.app` + le code de revue |
| **Compte sandbox Apple** | payer sans être débité | un Apple ID à part, créé dans App Store Connect |

1. **appstoreconnect.apple.com** → ton profil (en haut à droite) → **Utilisateurs et
   accès** → onglet **Sandbox** → **Testeurs**.
2. Cherche « Test Sandbox » (créé fin août).
   - **Mot de passe connu** → passe à l'étape 2.
   - **Mot de passe perdu** → **Ajouter un testeur**. E-mail : n'importe quelle adresse
     qui n'existe pas déjà chez Apple (elle n'a pas besoin d'être réelle, Apple ne lui
     envoie rien). Mot de passe : **note-le tout de suite**, il ne se réaffiche jamais.
     Territoire : **France**.

💡 **Crée-en un SECOND dans la foulée.** L'achat sandbox n'est « neuf » qu'une fois par
compte (cf. §5) : un compte de rechange transforme une prise ratée en simple changement
de compte dans les Réglages, au lieu d'un blocage.

**Tu dois voir à la fin** : un compte sandbox actif, e-mail et mot de passe sous les yeux
— idéalement deux.

---

## Étape 2 — installer le (16) et connecter le sandbox sur le téléphone

1. **TestFlight** → Kyroz → installer **1.0.0 (16)**. C'est le binaire qu'on soumet :
   la vidéo doit montrer celui-là, pas un autre.
   ℹ️ Le **(15)** avait un défaut connu — Sign in with Apple y répondait « Nonces
   mismatch » (corrigé par la PR #219, présent dans le (16), **essayé sur appareil et
   fonctionnel**).
2. **Réglages → App Store** → tout en bas, **Compte Sandbox** → connecte-toi avec le
   compte de l'étape 1.

⚠️ Si un ancien compte sandbox y est déjà connecté, déconnecte-le d'abord.

**Tu dois voir à la fin** : « Compte Sandbox » affiche l'e-mail du testeur, et le
numéro de build de TestFlight correspond à celui qu'on soumettra.

---

## Étape 3 — repartir d'un compte Kyroz NEUF

L'achat doit se faire depuis un compte **postérieur au 2026-08-27** (`PAYWALL_LAUNCH`),
sinon il est grand-péré et l'écran d'achat ne s'affiche même pas.

- Si tu es déjà connecté sur un vieux compte : Profil → roue dentée → Compte → Déconnexion.
- Connecte-toi avec le **compte de démo** (`review@kyroz.app` + le code de revue), ou
  crée un compte neuf.

**Tu dois voir à la fin** : Profil → ligne **Kyroz+** annonce que ce n'est pas actif
(et non « Inclus à vie »).

---

## Étape 4 — le bouton Sign in with Apple ✅ VÉRIFIÉ le 2026-09-05

⚠️ **À faire AVANT de lancer l'enregistrement** : ce n'est pas ce qu'Apple demande de
filmer, et un essai raté dans la vidéo brouillerait le message.

1. Déconnecte-toi (Profil → roue dentée → Compte → Déconnexion).
2. Sur l'écran de connexion, le bouton noir **« Continuer avec Apple »** doit apparaître
   sous le formulaire.
3. Appuie dessus, valide avec Face ID.
4. **Premier passage** : un écran « Avant de continuer » demande la case de consentement
   santé. Coche-la, appuie sur **Continuer**.
5. Tu dois arriver dans l'onboarding (compte neuf) ou sur le Plan.

**Tu dois voir à la fin** : une session ouverte via Apple, sans jamais avoir tapé de
mot de passe Kyroz.

✅ **FAIT le 2026-09-05 sur le (16)** : le bouton s'affiche, la connexion aboutit. C'est
ce qui a validé le correctif du nonce — un défaut que seul un appareil pouvait montrer,
les deux bouts de la comparaison étant chez Apple et chez Supabase.

🔴 **Si le bouton n'apparaît pas** ou si la connexion échoue : arrête-toi et dis-le à
Claude AVANT de faire la vidéo — c'est un défaut de code, pas une manipulation ratée.
La vidéo, elle, peut se faire avec le compte e-mail de démo : Sign in with Apple n'est
pas ce qu'Apple demande de prouver ici.

---

## Étape 5 — la vidéo, plan par plan

🔴 **LA PREMIÈRE PRISE EST LA VRAIE PRISE, et le 2026-09-05 l'a prouvé de la pire
façon.** Un achat sandbox rend l'environnement inutilisable pour la prise suivante — non
pas parce que StoreKit dit « déjà abonné », mais parce que **le reçu de l'appareil
redonne le droit à tout compte Kyroz qui se connecte**, y compris neuf, y compris après
réinstallation (cf. le bloc « OÙ ÇA EN EST » en tête).
➡️ **Répète la NAVIGATION sans jamais toucher « S'abonner »**, puis enregistre et va au
bout d'une traite.
➡️ Et **avant** de commencer, vérifie par API qu'aucun droit n'est actif — la commande
est dans le bloc de tête. Trente secondes qui évitent une soirée.

### Ce qu'Apple demande, mot pour mot

> - Begin from the Home Screen, launch the app, and demonstrate the complete user flow
>   through the app's core features **using the demo account you provided**.
> - Show a **successful sandbox purchase**.
> - Demonstrate **all other purchase flows**.

### Le tournage

🔴 **AVANT DE LANCER L'ENREGISTREMENT : DÉCONNECTE-TOI.** Profil → roue dentée →
Compte → Déconnexion. Sans ça l'app s'ouvre sur TON plan et le plan 3 est injouable —
on ne peut pas filmer une connexion quand on est déjà connecté. Et c'est le parcours du
RELECTEUR qu'il faut montrer : il installe l'app, elle s'ouvre sur l'écran de connexion,
il saisit les identifiants qu'on lui a fournis.
⚠️ Ça vaut en particulier juste après avoir testé Sign in with Apple (§4) — ce test
laisse une session ouverte.

| # | Ce que tu fais | Ce qui doit être VISIBLE |
|---|---|---|
| 0 | **Déconnecte-toi**, enregistrement PAS encore lancé | l'écran de connexion Kyroz |
| 1 | Lance l'enregistrement, puis va sur l'**écran d'accueil** de l'iPhone | les icônes de ton iPhone, ~2 s |
| 2 | Appuie sur l'icône **Kyroz** | l'app se lance depuis l'accueil |
| 3 | Onglet **Connexion**, saisis `review@kyroz.app` + le code de revue | les champs, puis « Se connecter » |
| 4 | L'assistant d'inscription s'ouvre — **complète-le** | les 7 étapes, ~1 à 2 min |
| 5 | Tu arrives sur le **Plan** | les repas du jour, les calories |
| 6 | Ouvre **une recette**, reviens | la fiche et ses ingrédients |
| 7 | Onglet **Courses**, puis **Recettes** | ~5 s chacun |
| 8 | Onglet **Profil** | poids et cibles |
| 9 | Appuie sur la ligne **Kyroz+** | l'écran de vente, les deux formules et leurs prix |
| 10 | Appuie sur **« S'abonner »** | la feuille Apple s'ouvre |
| 11 | **Ne coupe pas** — vérifie la mention | **« [Environnement Sandbox] »** sur la feuille |
| 12 | Valide (Face ID ou mot de passe sandbox) | la feuille traite l'achat |
| 13 | **ATTENDS** la confirmation | le message **« Kyroz+ est actif »** |
| 14 | Ferme le message | l'écran Kyroz+ a changé d'état |
| 15 | Appuie sur **« Restaurer mes achats »** | le message **« Abonnement retrouvé »** |
| 16 | Arrête l'enregistrement | — |

### Les trois plans qui décident

🔴 **Le plan 1.** Commencer ailleurs que sur l'écran d'accueil suffit à faire refuser la
vidéo : c'est la première phrase de leur demande.

🔴 **Le plan 13 — c'est LE plan de toute la vidéo.** Apple affirme que l'app « charge
indéfiniment après l'achat ». Couper avant « Kyroz+ est actif » ne prouve rien ; attendre
et le montrer démonte l'accusation. Laisse tourner 3 ou 4 secondes de plus.

🔴 **Le plan 15.** « Demonstrate all other purchase flows » : c'est le bouton « Restaurer
mes achats », qu'Apple exige de toute façon (Guideline 3.1.1).

### Ce qui n'est PAS dans la vidéo

- **Sign in with Apple** — Apple ne demande pas de le prouver, et un essai raté au milieu
  brouillerait le message. Il se teste à part (§4).
- Les réglages, la suppression de compte, les mentions légales.

**Tu dois voir à la fin** : une vidéo qui commence sur l'écran d'accueil, et où l'on voit
« Kyroz+ est actif » après un achat marqué sandbox.

⚠️ **Si l'app se fige après l'achat** : le correctif n'a pas marché. Garde la vidéo et
dis-le à Claude — elle devient une preuve de diagnostic, pas une preuve à envoyer.

---

## Étape 6 — l'envoyer à Apple

La vidéo ne se téléverse pas dans App Store Connect : c'est un **lien** qu'on colle dans
les notes de revue. Deux options :

- **iCloud** : Photos → partager → « Copier le lien iCloud » (valide 30 jours) ;
- n'importe quel hébergeur qui donne un lien direct sans compte.

➡️ Envoie le lien à Claude : il l'ajoute aux notes de revue par API, avec la réponse à
Apple, et renvoie la soumission.
