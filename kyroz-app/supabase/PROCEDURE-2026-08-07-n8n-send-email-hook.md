# Procédure — faire passer les e-mails d'auth par n8n (2026-08-07)

> Une seule étape à la fois. Fais l'étape, dis-moi ce que tu vois, je te donne la suivante.
> Ce document est un **support d'apprentissage** autant qu'une procédure : chaque étape
> dit ce qu'elle enseigne, pas seulement quoi cliquer.

## Ce que ce document ajoute — et ce qu'il ne remplace pas

`PROCEDURE-2026-08-07-confirmation-email.md` reste la base. Ses étapes 2 à 5 (Resend,
DNS, SMTP dans Supabase) **ne deviennent pas inutiles** : elles deviennent le **filet**.

Le *Send Email Hook* est une case à cocher. Cochée, n8n envoie les e-mails. Décochée,
Supabase reprend l'envoi par le SMTP configuré, sans rien d'autre à faire.

🔴 **C'est ce qui rend l'exercice acceptable sur un chemin critique.** Sans SMTP en
dessous, une instance n8n en panne un dimanche soir = plus aucune inscription possible,
et rien vers quoi retomber. Avec, le repli tient en un clic.

➡️ **Ordre imposé : les étapes 1 à 9 de l'autre procédure d'abord, celle-ci ensuite.**
Tu verras le parcours marcher avant de t'intercaler dedans — donc le jour où ça cassera
(et ça cassera, c'est le principe de l'exercice), tu sauras que la panne vient de ta pièce.

## Le décor technique, mesuré sur la doc Supabase

| | |
|---|---|
| Disponibilité | **Free et Pro** — le hook n'est pas réservé aux plans supérieurs |
| Timeout | **5 s pour TOUTE l'invocation**, retries compris |
| Retries | 3, back-off 2 s — **uniquement** sur `429` et `503` |
| Réponse attendue | `200`, `202` ou `204`. Corps vide accepté |
| Échec | `400`/`403` → 500 chez l'appelant · autres 4xx+ → **l'inscription échoue** |
| Taille du payload | 20 Ko max |
| Signature | **Standard Webhooks**, secret au format `v1,whsec_<base64>` |

🔴 **Les 5 secondes sont la contrainte qui décide de l'architecture du workflow.** Un
envoi SMTP synchrone depuis un workflow qui démarre à froid les dépasse sans peine. Et
une erreur 500 n'est pas retentée : l'inscription échoue pour de bon.

### Le payload reçu

```json
{
  "user": { "id": "uuid", "email": "toi@email.com", "...": "..." },
  "email_data": {
    "token": "428193",
    "token_hash": "...",
    "email_action_type": "signup",
    "redirect_to": "https://brgkevin-arch.github.io/Kyroz-app/confirme.html",
    "site_url": "https://brgkevin-arch.github.io/Kyroz-app/"
  }
}
```

⚠️ **`email_action_type` est le champ qui porte tout le travail** : `signup` pour une
inscription, `recovery` pour un mot de passe oublié. Un workflow qui l'ignore enverrait
« Bienvenue » à quelqu'un qui a perdu son mot de passe.

⚠️ **`token` est le code à 6 chiffres, en clair.** Ton instance n8n voit donc passer des
jetons d'authentification. Deux conséquences, non négociables : la **signature doit être
vérifiée** (étape 4), et n8n devient un **sous-traitant** à inscrire au `RGPD-REGISTRE.md`
(étape 9).

---

## Étape 1 — vérifier que le hook existe chez toi

Avant de créer quoi que ce soit ailleurs.

1. Supabase → projet Kyroz → **Authentication** → **Hooks**.
2. Cherche **Send Email hook** dans la liste.

Attendu : la ligne existe et se configure, **sans** invitation à passer à un plan
supérieur. La doc annonce « Free, Pro » — mais une doc n'est pas une mesure, et des
retours d'utilisateurs disaient l'inverse il y a quelques mois.

**→ Envoie-moi une capture de cet écran.** Si le hook est verrouillé, on s'arrête là
et le SMTP direct reste la solution — sans que rien du travail précédent soit perdu.

---

## Étape 2 — créer l'instance n8n Cloud

1. <https://n8n.io> → essai gratuit.
2. Note l'URL de ton instance (`https://<toi>.app.n8n.cloud`).

*Pourquoi Cloud plutôt qu'un VPS : HTTPS, domaine et mises à jour sont fournis. Tu veux
apprendre les workflows, pas administrer un serveur — et c'est aussi ce que tes futurs
clients utiliseront le plus souvent.*

**→ Dis-moi quand l'instance répond.**

---

## Étape 3 — le workflow, et la décision qui compte

Nouveau workflow, premier nœud : **Webhook**.

- Méthode : **POST**
- Chemin : quelque chose d'illisible, pas `kyroz` (l'URL est un secret de fait)
- **Respond : Immediately** ← *la décision*

🔴 **Pourquoi répondre immédiatement.** Supabase coupe à 5 s. Si le workflow répond
seulement une fois l'e-mail parti, tout ce qui suit — démarrage à froid, connexion SMTP,
lenteur du fournisseur — mange ce budget, et l'inscription échoue. En répondant tout de
suite, tu **découples la réponse du traitement** : Supabase est libéré, le reste du
workflow continue derrière.

⚠️ **Et le revers, à connaître avant de le choisir** : en répondant 200 d'emblée, tu dis
à Supabase « c'est envoyé » avant de l'avoir fait. Si l'envoi échoue ensuite, **personne
ne le saura** — ni Supabase, ni l'utilisateur qui attend son code. C'est précisément pour
ça que l'étape 7 (la branche d'erreur) n'est pas décorative.

*C'est le patron le plus utile de tout ce document : accuser réception vite, traiter
lentement, et se donner un moyen de savoir quand le traitement a raté.*

Il te faudra aussi le **corps brut** de la requête pour vérifier la signature à l'étape 4
(l'option existe sur le nœud Webhook ; le JSON déjà parsé ne convient pas — le calcul
porte sur les octets exacts reçus).

**→ Colle-moi l'URL de test du webhook, et dis-moi quelles options tu vois sur le nœud.**
Je ne connais pas l'interface de la version que tu auras : on la lit ensemble.

---

## Étape 4 — vérifier la signature

**Sans cette étape, ton URL est une machine à envoyer des e-mails Kyroz à qui la trouve**,
avec le contenu qu'il veut. Ce n'est pas une précaution théorique : l'endpoint fabrique
des messages au nom de ton domaine.

Supabase signe selon **Standard Webhooks**. Trois en-têtes arrivent avec la requête :

| En-tête | Rôle |
|---|---|
| `webhook-id` | identifiant unique de la livraison |
| `webhook-timestamp` | horodatage Unix (rejette ce qui est trop vieux → anti-rejeu) |
| `webhook-signature` | une ou plusieurs signatures, format `v1,<base64>` |

L'algorithme :

1. contenu signé = `<webhook-id>.<webhook-timestamp>.<corps brut>`
2. clé = la partie **après `whsec_`** dans ton secret, **décodée depuis base64**
3. HMAC-SHA256 du contenu signé avec cette clé, résultat en base64
4. comparer à la (ou aux) signature(s) de l'en-tête — plusieurs peuvent coexister
   pendant une rotation de secret

⚠️ **Deux pièges classiques, et ils donnent la même erreur** : signer le JSON re-sérialisé
au lieu du corps brut (un espace de différence suffit), et oublier de décoder le secret
depuis base64.

**→ Dis-moi si tu préfères le nœud Code ou le nœud Crypto** — on regardera ensemble ce
que ton n8n propose. C'est l'étape la plus formatrice du lot : tu réécriras ce bout-là
chez tes clients.

---

## Étape 5 — aiguiller selon le type d'e-mail

Un nœud **Switch** sur `email_data.email_action_type` :

| Valeur | E-mail à envoyer |
|---|---|
| `signup` | confirmation d'inscription (code + lien) |
| `recovery` | réinitialisation de mot de passe (**code seul, aucun lien**) |
| autre | ne rien envoyer, et te notifier — ça ne devrait pas arriver |

🔴 **La branche « autre » n'est pas du zèle.** Le hook capte **tous** les e-mails d'auth,
y compris ceux dont l'app ne se sert pas encore (`magiclink`, `email_change`, `invite`).
Sans branche par défaut, une fonctionnalité activée plus tard enverrait un e-mail vide,
ou pas d'e-mail du tout, sans que rien ne le signale.

**→ Dis-moi quand le Switch route correctement les deux cas connus.**

---

## Étape 6 — composer et envoyer

Le contenu des deux e-mails est déjà écrit et validé :

- `supabase/emails/confirmation.html`
- `supabase/emails/reinitialisation.html`

Remplace `{{ .Token }}` par `{{ $json.email_data.token }}` (syntaxe n8n) et, pour la
confirmation seulement, `{{ .ConfirmationURL }}` par l'URL construite depuis
`site_url` + `token_hash` + `redirect_to`.

🔴 **Ce que tu perds en passant par n8n, et il faut le savoir** : ces deux fichiers ne
sont plus lus par personne dès que le hook est actif. Les garde-fous du dépôt
(`lib/__tests__/emailConfirmation.test.ts` — `{{ .Token }}` obligatoire, aucun lien dans
l'e-mail de réinitialisation) protègent le dépôt, **pas ton workflow**. La règle « pas de
lien dans l'e-mail de reset » devient une discipline que rien ne vérifie plus.
➡️ Écris-la en commentaire dans le nœud n8n. C'est faible, mais c'est mieux que rien —
et ça te fera mesurer ce que vaut un garde-fou automatique.

Envoi : nœud **Send Email**, avec **les identifiants SMTP de l'étape 5 de l'autre
procédure** — les mêmes que Supabase. Un seul fournisseur, une seule réputation
d'expéditeur, et le repli reste cohérent.

**→ Envoie-toi un e-mail de test et regarde-le sur ton téléphone.**

---

## Étape 7 — savoir quand ça rate

Puisque le workflow répond 200 avant d'envoyer, **rien d'autre ne te préviendra**.

Branche d'erreur, au minimum : une notification vers toi (e-mail, Telegram, ce que tu
veux) portant l'adresse concernée et le type d'action. Sans elle, un envoi cassé se
manifestera par un utilisateur qui écrit à `contact@kyroz.app`… ou qui ne revient pas.

*C'est l'autre moitié du patron de l'étape 3 : accuser réception vite oblige à se donner
un moyen de savoir que le traitement a raté.*

**→ Provoque une erreur exprès** (mauvais identifiants SMTP) et vérifie que la
notification arrive. Un garde-fou qu'on n'a jamais vu se déclencher ne prouve rien.

---

## Étape 8 — brancher le hook

Supabase → **Authentication** → **Hooks** → **Send Email hook** :

1. Type **HTTPS**, URL du webhook n8n (l'URL de **production**, pas celle de test).
2. Supabase génère le **secret** `v1,whsec_…` → à reporter dans le nœud de vérification.
3. **Enable**.

**→ Inscris-toi avec une adresse jetable et regarde le workflow s'exécuter.**

---

## Étape 9 — le registre RGPD

n8n traite désormais des adresses e-mail **et des jetons d'authentification**. Il devient
un sous-traitant au même titre que Supabase.

À mettre à jour dans `RGPD-REGISTRE.md` (ligne « Sous-traitant », aujourd'hui « Supabase
Inc. » seul) :

- n8n (automatisation des e-mails d'authentification)
- le fournisseur d'envoi retenu

⚠️ **Et vérifier la ligne « Transferts hors UE : Aucun ».** n8n Cloud propose plusieurs
régions ; si ton instance n'est pas en UE, cette phrase devient fausse. Un registre RGPD
qui ment est pire que pas de registre — c'est la règle « pas de mensonge » appliquée à un
document opposable.

**→ Dis-moi la région de ton instance n8n, j'écris les lignes du registre.**

---

## Le repli, à connaître AVANT d'en avoir besoin

Si quelque chose cloche — e-mails qui ne partent plus, workflow cassé, instance en
maintenance :

> Supabase → Authentication → Hooks → Send Email hook → **Disable**

Les e-mails repartent aussitôt par le SMTP direct, avec les gabarits du dashboard. Rien
d'autre à toucher, aucun déploiement.

⚠️ **Teste ce repli une fois, à froid, pendant que tout va bien.** Un interrupteur de
secours qu'on actionne pour la première fois en situation de panne n'est pas un
interrupteur de secours.
