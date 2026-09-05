# Vidéo d'achat sandbox + test du bouton Apple — procédure, 2026-09-05

> **Une étape à la fois.** Chaque étape dit ce que tu dois VOIR à la fin. On ne passe à
> la suivante que quand tu le vois.

## Pourquoi cette vidéo

Rejet Apple `2.1(b)` du 2026-09-04 (build 9) : *« your app started loading indefinitely
after we purchased the subscription »*. Le correctif est livré (timeout de 30 s,
`lib/purchases.ts`), mais Apple exige en plus, pour ce renvoi précis, un enregistrement
d'écran sur **appareil physique** joint aux notes de revue, montrant :

- le parcours complet depuis l'écran d'accueil, avec le compte de démo ;
- un **achat sandbox réussi** ;
- les autres parcours d'achat (le bouton « Restaurer mes achats »).

⚠️ **La vidéo se tourne sur le build (15)**, pas sur le (9). Elle doit montrer l'app
corrigée — sinon elle prouve le contraire de ce qu'on affirme.

ℹ️ **Pourquoi (15) et pas (10)** : quatre tentatives de build ont échoué avant que le
profil de signature ne soit réparé, et EAS incrémente son compteur à CHAQUE tentative,
réussie ou non. Le numéro n'a aucune signification technique — mais chercher un « (10) »
sur TestFlight ferait perdre du temps, il n'existera jamais.

## Deux choses à faire dans la MÊME session sur le téléphone

Le build (15) porte aussi **Sign in with Apple**, jamais essayé sur un appareil. Autant
tout vérifier d'un coup : le bouton Apple d'abord (§4), l'achat ensuite (§5).

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

## Étape 2 — installer le (15) et connecter le sandbox sur le téléphone

1. **TestFlight** → Kyroz → installer **le dernier build**. Vérifie le numéro : une
   vidéo tournée sur le (9) ne vaut rien.
   ⚠️ **Le (15) a un défaut connu** : Sign in with Apple y répond « Nonces mismatch »
   (corrigé par la PR #219). Le parcours d'ACHAT, lui, y est intact — mais comme un
   achat sandbox ne se filme qu'une fois, autant attendre le build qui porte le
   correctif plutôt que d'avoir à refaire la prise.
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

## Étape 4 — le bouton Sign in with Apple (nouveau, jamais testé)

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

🔴 **Si le bouton n'apparaît pas** ou si la connexion échoue : arrête-toi et dis-le à
Claude AVANT de faire la vidéo — c'est un défaut de code, pas une manipulation ratée.
La vidéo, elle, peut se faire avec le compte e-mail de démo : Sign in with Apple n'est
pas ce qu'Apple demande de prouver ici.

---

## Étape 5 — la vidéo, plan par plan

🔴 **LA PREMIÈRE PRISE EST LA VRAIE PRISE.** Un achat sandbox n'est « neuf » qu'UNE fois
par compte de test : une fois l'abonnement pris, StoreKit répond « vous êtes déjà
abonné » au lieu de rejouer un achat propre. **Ne répète donc jamais le bouton
« S'abonner » pour t'entraîner.**
➡️ Répète la NAVIGATION sans acheter, puis lance l'enregistrement et va au bout.
➡️ Filet : crée un **second testeur sandbox** avant de commencer (§1). Si la prise rate,
tu changes de compte dans Réglages au lieu d'être bloqué.

### Ce qu'Apple demande, mot pour mot

> - Begin from the Home Screen, launch the app, and demonstrate the complete user flow
>   through the app's core features **using the demo account you provided**.
> - Show a **successful sandbox purchase**.
> - Demonstrate **all other purchase flows**.

### Le tournage

| # | Ce que tu fais | Ce qui doit être VISIBLE |
|---|---|---|
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
