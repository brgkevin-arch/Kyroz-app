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

**Tu dois voir à la fin** : un compte sandbox actif, e-mail et mot de passe sous les yeux.

---

## Étape 2 — installer le (15) et connecter le sandbox sur le téléphone

1. **TestFlight** → Kyroz → installer la version **1.0.0 (15)**. Vérifie le numéro de
   build : une vidéo tournée sur le (9) ne vaut rien.
2. **Réglages → App Store** → tout en bas, **Compte Sandbox** → connecte-toi avec le
   compte de l'étape 1.

⚠️ Si un ancien compte sandbox y est déjà connecté, déconnecte-le d'abord.

**Tu dois voir à la fin** : « Compte Sandbox » affiche l'e-mail du testeur, et TestFlight
affiche `1.0.0 (15)`.

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

## Étape 5 — la vidéo

**Ce qu'Apple veut voir, dans cet ordre :**

1. **Démarre l'enregistrement** (Centre de contrôle → bouton d'enregistrement), puis
   reviens à **l'écran d'accueil de l'iPhone**. La vidéo doit commencer là, Apple
   l'écrit noir sur blanc.
2. **Ouvre Kyroz** depuis l'écran d'accueil.
3. **Connecte-toi** avec le compte de démo (`review@kyroz.app` + le code de revue).
4. **Montre l'app** — 15 à 20 secondes suffisent : le Plan, une recette, les Courses.
   Apple demande « the complete user flow through the app's core features ».
5. **Profil → Kyroz+** → l'écran d'achat.
6. **Appuie sur « S'abonner »** → la feuille Apple s'ouvre. Elle doit afficher
   **« [Environnement Sandbox] »** : c'est la preuve que c'est bien un achat de test.
7. **Valide l'achat** (Face ID ou mot de passe du compte sandbox).
8. **Attends l'écran de confirmation** — « Kyroz+ est actif ». ⚠️ **Ne coupe pas avant** :
   c'est exactement ce qu'Apple accuse de ne jamais arriver.
9. Reviens sur l'écran Kyroz+ et appuie sur **« Restaurer mes achats »** → « Abonnement
   retrouvé ». C'est le « demonstrate all other purchase flows » de leur message.
10. **Arrête l'enregistrement.**

**Tu dois voir à la fin** : une vidéo dans Photos, où l'achat aboutit et l'app continue
de répondre.

⚠️ **Si l'app se fige après l'achat** : c'est le défaut d'origine, et le correctif n'a
pas marché. Garde la vidéo quand même et dis-le à Claude — elle devient une preuve de
diagnostic, pas une preuve à envoyer.

---

## Étape 6 — l'envoyer à Apple

La vidéo ne se téléverse pas dans App Store Connect : c'est un **lien** qu'on colle dans
les notes de revue. Deux options :

- **iCloud** : Photos → partager → « Copier le lien iCloud » (valide 30 jours) ;
- n'importe quel hébergeur qui donne un lien direct sans compte.

➡️ Envoie le lien à Claude : il l'ajoute aux notes de revue par API, avec la réponse à
Apple, et renvoie la soumission.
