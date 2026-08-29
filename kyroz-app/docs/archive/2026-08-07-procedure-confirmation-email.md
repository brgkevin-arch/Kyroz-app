# ARCHIVÉ — FAITE · Les e-mails d'authentification (2026-08-07)

> **Archivé le 2026-08-30.** Posée et **éprouvée en prod le 2026-08-09** — e-mail reçu en
> boîte, zéro Insight Resend (`../../AGENTS.md`, fiche A29). Les gabarits vivants sont
> `../../supabase/emails/confirmation.html` et `../../supabase/emails/reinitialisation.html`, et c'est
> `lib/__tests__/emailConfirmation.test.ts` qui les garde, pas ce document.
>
> État courant → `../../AGENTS.md`. **Ne pas rejouer ces étapes de dashboard.**

---


> Une seule étape à la fois. Fais l'étape, dis-moi le résultat, je te donne la suivante.
> Rien ici n'est faisable depuis le dépôt : tout demande l'accès au dashboard Supabase,
> à Cloudflare et à un compte Resend.

**Deux e-mails sont concernés**, et ils se posent dans la même session de dashboard :
la **confirmation d'inscription** (le sujet d'origine) et la **réinitialisation de mot
de passe** (étape 7 bis — le parcours n'existait pas du tout dans l'app avant le
2026-08-07). Les deux reposent sur un code à 6 chiffres saisi dans Kyroz.

## L'état actuel, mesuré (pas supposé)

```
npm run check:auth
```

Sortie du 2026-08-07 :

```
✖ confirmation e-mail    désactivée (mailer_autoconfirm: true)
```

**Aucun e-mail de confirmation ne part.** Tout compte créé est actif immédiatement.
Ce n'était donc ni un problème de spam ni de délivrabilité : l'interrupteur est coupé.

⚠️ **Piège de lecture** : `mailer_autoconfirm: true` veut dire « confirmation NON
demandée » — c'est l'inverse de la case du dashboard. Lu vite, il fait conclure le
contraire de la réalité.

## 🔴 Pourquoi un SMTP dédié n'est PAS une amélioration, mais un prérequis

Découvert le 2026-08-07, dans la doc Supabase, et **ça explique la panne d'origine** :

> Supabase Auth refuse de délivrer des messages à des adresses qui **ne font pas partie
> de l'équipe du projet**. Les envois vers toute autre adresse échouent avec
> « Email address not authorized ».

Le service e-mail intégré n'est donc pas seulement **bridé** (2 messages/heure, non
relevable) : il est **réservé aux membres du projet**. Toi, tu recevrais tes e-mails.
Personne d'autre. C'est très probablement pour ça que « ça ne marchait plus pour une
personne » — cette personne n'était pas membre du projet Supabase.

➡️ **Conséquence directe : activer la confirmation (étape 10) sans SMTP dédié CASSERAIT
les inscriptions** au lieu de les sécuriser. Et le « mot de passe oublié » livré en même
temps ne servirait personne non plus — même service d'envoi, même restriction.

**Expéditeur retenu par le fondateur le 2026-08-07 : Resend** (transactionnel pur,
région EU au choix, 3 000 e-mails/mois gratuits, actif dès la vérification DNS).
*Écartés, et pourquoi : Cloudflare Email Service (beta, 5 $/mois, région non documentée) ·
Brevo (bon, français, mais l'envoi transactionnel demande une activation manuelle par
le support, de délai inconnu) · Scaleway TEM (excellent sur la souveraineté, 300
e-mails/mois gratuits seulement).*

## L'ordre compte, et il n'est pas négociable

1. **L'app avant l'INTERRUPTEUR** (étape 10, pas avant). L'e-mail contient un code à
   6 chiffres, et c'est l'écran de saisie qui l'attend : activer la confirmation avant
   que cet écran soit en ligne enverrait un code que personne ne peut taper.
   ✅ **En revanche, les étapes 2 à 9 ne dépendent PAS du déploiement et peuvent se
   faire tout de suite.** Aujourd'hui **aucun e-mail d'authentification ne part** de
   Kyroz — confirmation coupée, réinitialisation inexistante, ni magic link ni
   changement d'adresse. Tout ce paramétrage se fait donc à vide : rien ne s'envoie,
   rien ne change pour personne. Les DNS de l'étape 3 ont même intérêt à être posés
   tôt, le temps de se propager.
   ➡️ Si l'étape 1 est reportée, **la reprendre avant l'étape 10** : c'est la seule
   qui la réclame.
2. **L'expéditeur ensuite — et ce n'est pas une option** (voir l'encadré ci-dessus) :
   le service intégré ne délivre qu'aux membres du projet, donc sans SMTP dédié
   l'étape 10 casserait les inscriptions au lieu de les sécuriser.
3. **L'interrupteur en dernier.** C'est lui qui change le parcours de tout le monde.

---

## Étape 1 — livrer l'app (reportable, mais AVANT l'étape 10)

La PR de cette branche porte l'écran de saisie du code, la page d'atterrissage
(`public/confirme.html`) et le gabarit d'e-mail.

1. Merger la PR dans `main`.
2. Attendre que le workflow **Deploy to GitHub Pages** passe au vert.
3. Ouvrir <https://brgkevin-arch.github.io/Kyroz-app/confirme.html> — la page doit
   répondre (fond noir, « Adresse confirmée »).

⚠️ Si elle rend un **404**, ne va pas plus loin : le lien de l'e-mail mènerait au vide.

**→ Dis-moi si la page répond.**

---

## Étape 2 — créer l'expéditeur (Resend)

Gratuit jusqu'à 3 000 e-mails/mois, 100/jour. Kyroz en enverra une poignée par jour.

1. Créer un compte sur <https://resend.com> (avec `contact@kyroz.app`).
2. **Domains** → **Add Domain** → `kyroz.app` → région **EU (Ireland)**.
   *La région EU n'est pas un détail : les données de Kyroz sont hébergées en UE et
   la politique de confidentialité l'annonce (RGPD, cf. `constants/legal.ts`).*
3. Resend affiche alors **3 enregistrements DNS à créer**. Ne les recopie pas depuis
   une doc ou depuis moi : **ils sont propres à ton domaine** (la clé DKIM est unique).

**→ Envoie-moi une capture de ces 3 enregistrements, je te dis quoi coller où.**

---

## Étape 3 — poser les DNS chez Cloudflare

Dans Cloudflare → domaine `kyroz.app` → **DNS** → **Records**.

Pour chacun des 3 enregistrements affichés par Resend : **Add record**, en recopiant
**exactement** le type, le nom et la valeur.

🔴 **Trois pièges, dans l'ordre de gravité :**

1. **NE TOUCHE À AUCUN ENREGISTREMENT `MX` DE LA RACINE `kyroz.app`.** Ce sont eux qui
   font arriver le courrier de `contact@kyroz.app` dans ta boîte (Cloudflare Email
   Routing → iCloud+). Les enregistrements de Resend visent le **sous-domaine**
   `send.kyroz.app` : ils s'ajoutent, ils ne remplacent rien. Si Cloudflare propose de
   « remplacer » un enregistrement existant, **arrête-toi et dis-le-moi.**
2. **Un seul SPF par nom.** Si Resend demandait un `TXT` de type `v=spf1…` sur la
   **racine** alors qu'il en existe déjà un (Cloudflare Email Routing en pose un), les
   deux s'annulent et **plus aucun** e-mail ne passe l'authentification. Sur
   `send.kyroz.app`, aucun conflit possible.
3. **Proxy désactivé** (nuage **gris**). Les TXT et MX ne sont de toute façon pas
   proxifiables, mais la règle vaut pour ce domaine en général.

Puis, dans Resend : **Verify DNS Records**. La propagation Cloudflare prend quelques
minutes.

**→ Dis-moi quand Resend affiche le domaine en « Verified ».**

---

## Étape 4 — la clé SMTP

1. Resend → **API Keys** → **Create API Key** → nom `supabase-auth`, permission
   **Sending access**.
2. Copie la clé `re_…`. **Elle n'est affichée qu'une fois.**

⚠️ Cette clé est un **vrai secret** : elle permet d'envoyer du courrier en ton nom.
Elle ne va **ni dans le dépôt, ni dans `.env`, ni dans `eas.json`** — uniquement dans
le champ mot de passe de Supabase à l'étape suivante. (C'est exactement la distinction
de `.env.example` : une clé qui doit rester secrète ne passe jamais par `EXPO_PUBLIC_*`.)

**→ Dis-moi quand tu as la clé en main.**

---

## Étape 5 — brancher le SMTP dans Supabase

Supabase → projet Kyroz → **Authentication** → **Emails** → onglet **SMTP Settings**
→ activer **Enable Custom SMTP**.

| Champ | Valeur |
|---|---|
| Sender email | `contact@kyroz.app` |
| Sender name | `Kyroz` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la clé `re_…` de l'étape 4 |

**Save**.

*Pourquoi `contact@kyroz.app` en expéditeur : c'est une boîte qui existe vraiment. Une
personne qui répond à l'e-mail de confirmation tombe sur toi, pas dans le vide — ce
qu'un `noreply@` garantit.*

**→ Dis-moi si Supabase accepte l'enregistrement sans erreur.**

---

## Étape 6 — les URL de retour

Supabase → **Authentication** → **URL Configuration**.

1. **Site URL** : `https://brgkevin-arch.github.io/Kyroz-app/`
2. **Redirect URLs** → **Add URL** :
   `https://brgkevin-arch.github.io/Kyroz-app/confirme.html`

🔴 **Sans cette seconde ligne, la redirection est IGNORÉE EN SILENCE** : Supabase
retombe sur la Site URL, et qui clique le lien atterrit sur un écran de connexion
muet, sans savoir si sa confirmation a marché. Aucune erreur nulle part.

*La valeur exacte attendue est celle de `lib/emailConfirmation.ts::URL_RETOUR_CONFIRMATION` ;
un test vérifie qu'elle correspond au fichier réellement servi.*

**→ Dis-moi quand les deux lignes sont en place.**

---

## Étape 7 — le gabarit Kyroz

Supabase → **Authentication** → **Emails** → onglet **Templates** → **Confirm signup**.

1. **Subject heading** : `Confirme ton adresse — Kyroz`
2. **Message body** : remplacer **tout** le contenu par celui de
   `supabase/emails/confirmation.html` (le fichier de cette PR, en entier, commentaire
   HTML compris — il ne s'affiche pas).
3. **Save**.

🔴 **Le gabarit DOIT contenir `{{ .Token }}`.** C'est le code à 6 chiffres. Le gabarit
par défaut de Supabase ne contient que le lien : le coller sans `.Token` livrerait un
e-mail impeccable, avec une case vide, en face d'un écran qui réclame six chiffres.
`lib/__tests__/emailConfirmation.test.ts` verrouille cette variable côté dépôt — mais
**il ne peut rien vérifier de ce qui est réellement collé dans le dashboard.**

**→ Envoie-moi une capture de l'aperçu affiché par Supabase.**

---

## Étape 7 bis — le second gabarit : mot de passe oublié

Même écran, autre onglet : **Templates** → **Reset Password**.

1. **Subject heading** : `Ton code de réinitialisation — Kyroz`
2. **Message body** : remplacer **tout** le contenu par celui de
   `supabase/emails/reinitialisation.html`.
3. **Save**.

🔴 **Ce gabarit-là ne contient AUCUN lien, et ce n'est pas un oubli.** Cliquer un lien
de réinitialisation **consomme** le jeton **sans changer le mot de passe** : la page
d'atterrissage est un fichier statique, elle ne peut pas en poser un, et la session
ainsi ouverte vit dans le navigateur — jamais dans l'app. La personne se retrouverait
avec son ancien mot de passe **et** un code mort : pire qu'avant sa demande. Les
antivirus de messagerie, qui pré-cliquent les liens, provoqueraient ça tout seuls, à
chaque envoi.

⚠️ **Donc : ne « complète » pas ce gabarit avec le bouton de l'autre.** Si le contenu
par défaut de Supabase apparaît encore après le collage, c'est que le collage a raté —
recommence plutôt que d'ajouter.

**→ Envoie-moi une capture de l'aperçu affiché par Supabase.**

---

## Étape 8 — la durée de vie du code, ET SA LONGUEUR

Supabase → **Authentication** → **Emails** (ou **Sign In / Providers** → **Email**) :

| Réglage | Valeur attendue |
|---|---|
| **Email OTP Expiration** | `3600` (secondes) |
| **Email OTP Length** | **`6`** |

L'expiration vaut une heure parce que **c'est ce que les deux gabarits annoncent en
toutes lettres**. Une autre valeur ferait mentir le texte — et un texte qui ment sur un
délai est un texte qu'on n'ose plus croire sur le reste.

🔴 **La LONGUEUR est le réglage le plus dangereux de toute la procédure**, et il ne
figurait pas ici avant le 2026-08-07. `CODE_LONGUEUR = 6` côté app n'est pas une
préférence d'affichage : le bouton ne s'arme qu'à six chiffres (`codeComplet`) et
`normaliseCode` **tronque** au-delà. Réglé sur 8, Supabase enverrait huit chiffres,
l'app n'en garderait que six, et **toute confirmation échouerait** — en affichant
« code refusé » à quelqu'un qui a saisi exactement ce qu'il a reçu.
➡️ Panne **indiagnosticable depuis l'app**, et invisible pour tous les tests du dépôt :
ce réglage vit dans le dashboard, hors de portée du code comme des garde-fous.

🔴 **ET LE PROJET ÉTAIT RÉGLÉ SUR 8 — mesuré le 2026-08-07, corrigé le jour même.**
Ce n'était donc pas une formalité : le parcours aurait été **mort à la livraison**, sur
un réglage que personne n'aurait pensé à regarder. 6 est pourtant la valeur par défaut
de Supabase ; celle-ci avait été changée à un moment qu'aucune trace ne rapporte.
➡️ **La leçon dépasse ce champ** : un réglage de dashboard n'a pas d'historique, pas de
revue, pas de test. Le seul moment où on peut le voir, c'est quand quelqu'un le regarde
— donc il faut l'écrire dans une procédure, sinon personne ne le regarde jamais.

Vérifier aussi **Minimum password length = 6** sur le même écran : elle doit valoir
`MDP_LONGUEUR_MIN` (app). Si Supabase exigeait plus, l'écran « Nouveau mot de passe »
accepterait une saisie que le serveur refuserait ensuite, avec un message anglais sous
un champ correctement rempli.

**→ Dis-moi les valeurs que tu y trouves avant de changer quoi que ce soit.**

---

## Étape 9 — le plafond d'envoi

Supabase → **Authentication** → **Rate Limits** → **Rate limit for sending emails**.

Le plafond de **2 par heure** est celui du service **intégré**, et il n'est pas
relevable. Poser un SMTP dédié (étape 5) le remplace par une limite initiale de
**30 par heure**, celle-ci ajustable.

Vérifie donc simplement qu'elle affiche bien **30** après l'étape 5 : c'est le signe que
Supabase a bien pris en compte ton SMTP. 30/heure est largement au-dessus de ton besoin,
et assez bas pour qu'un abus se voie — laisse tel quel.

**→ Dis-moi la valeur que tu y trouves avant de la changer.**

---

## Étape 10 — l'interrupteur

🔴 **L'étape 1 doit être faite AVANT celle-ci** (les deux PR mergées, le déploiement
vert, `confirme.html` qui répond 200). Si elle a été reportée, y retourner maintenant :
c'est le seul point de la procédure où l'ordre mord vraiment.

Supabase → **Authentication** → **Sign In / Providers** → **Email** → cocher
**Confirm email** → **Save**.

C'est l'étape qui change le parcours de tout le monde. Toutes les précédentes existent
pour qu'elle soit sans risque.

**→ Dis-moi quand c'est coché.**

---

## Étape 11 — vérifier, depuis le dépôt

```bash
npm run check:auth
```

Attendu :

```
✓ confirmation e-mail                EXIGÉE
```

**→ Colle-moi la sortie.**

---

## Étape 12 — le vrai test, de bout en bout

Avec une adresse **jetable** (pas la tienne : le compte restera).

1. Ouvrir <https://brgkevin-arch.github.io/Kyroz-app/> → **Inscription**, cocher le
   consentement, **Créer mon compte**.
2. L'app doit basculer sur **« Confirme ton adresse »**.
   - [ ] L'e-mail arrive (regarde aussi les indésirables au premier envoi).
   - [ ] Expéditeur : **Kyroz &lt;contact@kyroz.app&gt;**, pas `supabase.io`.
   - [ ] Le code à 6 chiffres est **affiché** (pas une case vide).
3. Saisir le code → **Confirmer mon adresse**.
   - [ ] L'app entre directement, **sans redemander le mot de passe**.
4. Supabase → **Authentication** → **Users** : la ligne du compte test porte une date
   dans **Confirmed at**.
5. Supabase → **Table Editor** → `profiles` → la ligne du compte test :
   - [ ] `consent_health_data` = **true**, `consent_at` renseigné.

🔴 **Le point 5 est le moins évident et le plus important.** Le consentement RGPD était
écrit juste après l'inscription — donc **sans session ouverte**, ce que la RLS refuse.
Avec la confirmation active, il serait resté à `false` en silence, alors que la case a
bien été cochée à l'écran. Le report d'écriture livré dans cette PR corrige ça ; ce
point de contrôle est ce qui le prouve **en prod**.

6. Refaire l'inscription avec une seconde adresse jetable et, cette fois, **cliquer le
   lien** de l'e-mail au lieu de saisir le code.
   - [ ] La page affiche **« Adresse confirmée. »**
   - [ ] De retour dans l'app, « Revenir à la connexion » puis connexion classique : ça
         passe.

7. **Mot de passe oublié**, avec le premier compte test (celui dont tu connais l'adresse) :
   - [ ] Écran de connexion → le lien **« Mot de passe oublié ? »** est visible.
         *(Il n'apparaît qu'en mode Connexion : à l'inscription, il n'y a pas encore de
         mot de passe à oublier.)*
   - [ ] **Recevoir un code** → l'e-mail arrive, expéditeur **Kyroz**, code affiché.
   - [ ] **Aucun bouton, aucun lien** dans cet e-mail — seulement le code. S'il y a un
         bouton, c'est le gabarit par défaut : l'étape 7 bis a raté.
   - [ ] Code saisi → écran **« Nouveau mot de passe »** → enregistrer → l'app entre
         directement.
   - [ ] Se déconnecter, puis se reconnecter avec le **nouveau** mot de passe : ça passe.
   - [ ] Et avec l'**ancien** : refusé.
8. Avec une adresse **qui n'existe pas** : « Mot de passe oublié ? » → **Recevoir un code**.
   - [ ] L'app passe quand même à l'écran de saisie, et dit « **si** un compte existe ».
         C'est voulu : afficher « aucun compte avec cette adresse » transformerait ce
         formulaire en outil pour savoir qui est inscrit chez Kyroz.

**→ Colle-moi ce qui coince, s'il y a lieu.**

---

## Ce que cette procédure ne fait PAS, volontairement

- ~~**Pas de « mot de passe oublié »**~~ — **AJOUTÉ le 2026-08-07** (étape 7 bis, et
  points 7-8 du test). La première version de cette procédure l'écartait au motif que
  le gabarit « ne partirait jamais » : c'était vrai, et c'était surtout le symptôme.
  L'app n'avait **aucun** recours pour un mot de passe perdu — le compte l'était avec
  lui. Le parcours vit maintenant dans `components/MotDePasseOublie.tsx`.
- **Pas de lien universel (Universal Link / App Link).** C'est ce qui permettrait au
  lien de l'e-mail de rouvrir l'app native au lieu du navigateur. Ça demande un fichier
  signé servi sur le domaine et un nouveau build natif — donc une revue de store. Le
  code à 6 chiffres rend le service sans rien de tout ça.
- **Pas de CAPTCHA.** Déjà tranché et mesuré (AGENTS.md E3) : l'activer exigerait un
  `captchaToken` sur **tous** les endpoints d'auth, absents du code — ça casserait
  l'inscription, la connexion et l'accès reviewer.

---

## Après coup

- Consigner la date d'application dans `AGENTS.md`.
- ⚠️ **Ne pas écrire ici « c'est activé » comme une vérité durable.** Ces réglages se
  pilotent hors du dépôt et ont déjà changé trois fois en deux jours sans laisser de
  trace (AGENTS.md E3). La seule réponse fiable est `npm run check:auth`, et elle coûte
  deux secondes.
