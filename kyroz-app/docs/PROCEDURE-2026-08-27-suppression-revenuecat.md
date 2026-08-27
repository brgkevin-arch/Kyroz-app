# Faire aller la suppression de compte jusque chez RevenueCat

Date : 2026-08-27 · Origine : contre-audit V1, constat **01-03** (P1) · Fiche : `AGENTS.md` **A41**

> ✅ **PROCÉDURE CLOSE LE 2026-08-27 — les six étapes sont faites et vérifiées.** Elle se
> lit désormais comme une TRACE : ce qui a été posé, ce qui a été mesuré, et les trois
> pièges payés en chemin (nom du secret, clé v2 sur endpoint v1, journal qui ne mesurait
> rien). Tableau de clôture en bas de page. **Rien n'attend plus personne.**
> ⚠️ Une seule chose se re-vérifie avant de s'y fier : la version déployée
> (`npx supabase functions list --project-ref rgdjsdnqlmfkourrhijv` → **v8** au 2026-08-27).
> Un fichier modifié dans le dépôt ne change RIEN en production sans un redéploiement.

> **Une étape à la fois.** Ne pas enchaîner : chaque étape a une vérification, et
> l'étape 1 peut invalider tout le reste.

---

## Pourquoi cette procédure existe

`hooks/usePremium.ts` appelle `identifyUser(uid)` **sans condition** dès qu'un compte
existe, et la clé RevenueCat est posée dans l'environnement `production` d'EAS. Donc
**tout build de production crée un abonné RevenueCat portant l'UUID Supabase — y compris
pour quelqu'un qui n'a jamais rien acheté**, et avant même la mise en vente.

Supprimer son compte appelait `logOut()`, qui **détache l'identité localement** et ne
supprime rien à distance. Un identifiant survivait donc chez un sous-traitant américain
après « Supprimer définitivement ».

🔴 **Ce que ça met en défaut, précisément.** Le §7 de la politique de confidentialité
borne l'exception de conservation à « **si vous avez souscrit un abonnement** ». Cette
rédaction est juste — **à condition que l'identifiant d'un NON-abonné, lui, disparaisse.**
Tant que la fonction n'est pas déployée avec son secret, cette phrase reste inexacte pour
tous ceux qui n'ont rien acheté, c'est-à-dire tout le monde aujourd'hui.

Le code est écrit et poussé (`supabase/functions/delete-account/index.ts`). **Il n'a rien
fait tant que le secret n'a pas été posé et la fonction redéployée** — c'est ce que les
étapes ci-dessous racontent, dans l'ordre où elles ont eu lieu.

---

## ✅ Étape 1 — l'endpoint est CONFIRMÉ (2026-08-27)

Lu sur la documentation RevenueCat, pas de mémoire. **L'appel écrit dans la fonction est
le bon** :

```
DELETE https://api.revenuecat.com/v1/subscribers/{app_user_id}
Authorization: Bearer <clé SECRÈTE>
```

Succès : **200**, avec `{ "app_user_id": "…", "deleted": true }`.

⚠️ **Trois précisions qui changent les étapes suivantes :**

| | |
|---|---|
| **La clé secrète commence par `sk_`** | et c'est le garde-fou le plus utile de toute cette procédure : la clé RevenueCat déjà posée dans EAS commence par **`appl_`** — c'est la clé PUBLIQUE de la plateforme Apple, embarquée dans l'app. Poser celle-là ici donnerait un `401` permanent qui ressemble à une panne réseau |
| **La suppression est IRRÉVERSIBLE** | « when a subscriber is deleted, it cannot be brought back ». C'est cohérent avec la cascade Supabase qui la précède, mais ça vaut d'être su avant de tester |
| 🔴 **Le 404 n'est PAS documenté** | la référence ne décrit que le 200. La fonction traite quand même le 404 comme `introuvable` plutôt que comme un échec — c'est le choix sûr (ne pas alerter sur un abonné qui n'a jamais existé), mais **ce n'est pas un comportement promis par RevenueCat**. Si les journaux montrent un code inattendu, c'est ici qu'il faut revenir |

*Sources : [Delete Subscriber](https://docs-origin.revenuecat.com/reference/delete-subscriber) · [RevenueCat API v1](https://www.revenuecat.com/docs/api-v1) · [API Keys](https://www.revenuecat.com/docs/projects/authentication).*

---

## ✅ Étape 2 — FAITE le 2026-08-27, 12:46 UTC

Secret posé par le fondateur depuis le tableau de bord. Vérifié par la CLI
(`supabase secrets list`) : **`REVENUECAT_SECRET_KEY`** présent, digest SHA-256, et rien
d'autre de custom sur le projet.

🔴 **UN PIÈGE QUE LA PROCÉDURE N'AVAIT PAS PRÉVU, ET IL A EU LIEU** : le secret a d'abord
été créé sous le nom **`Revenuecat`**. La procédure disait bien quelle CLÉ poser (`sk_` et
non `appl_`), elle ne disait nulle part que le NOM devait être recopié au caractère près.
Or `Deno.env.get('REVENUECAT_SECRET_KEY')` est sensible à la casse : la fonction aurait
rendu `undefined`, donc l'état `non_configure`, donc **elle n'aurait supprimé aucun abonné
— sans erreur, sans message, avec un secret bien visible dans le tableau de bord.** Le pire
des états : celui qui a l'air fait.
➡️ Corrigé : nouveau secret au bon nom, ancien supprimé.
⚠️ *Une procédure qui nomme la valeur à poser doit nommer la CLÉ aussi — le nom d'une
variable d'environnement est un contrat, pas une étiquette.*

## 🔴 Étape 2 bis — LA CLÉ DOIT ÊTRE EN **V1**, et la procédure ne le disait pas

Trouvé le 2026-08-27 en lisant le journal du premier vrai test :

```
[delete-account] RevenueCat a refusé la suppression : 403
```

**403, pas 401 — et la nuance porte tout le diagnostic.** Un 401 aurait voulu dire « clé
refusée » (le piège `appl_` que l'étape 2 anticipe). Un 403 veut dire que RevenueCat a
**accepté** la clé et refusé l'**opération** : le secret est posé, lu, l'appel part, la
réponse revient. Toute la plomberie fonctionne.

La cause : les clés secrètes récentes se créent en **v2** par défaut, avec des permissions
à cocher — or `DELETE /v1/subscribers/{id}` est un endpoint **v1**. Une clé v2
s'authentifie et se fait refuser l'endpoint.

➡️ **Créer la clé secrète en sélectionnant la version V1.** Elle se repose sous le MÊME nom
`REVENUECAT_SECRET_KEY` (le formulaire du tableau de bord remplace), et **aucun
redéploiement n'est nécessaire** : `Deno.env.get` relit le secret à chaque invocation.

⚠️ **Et il faut un compte jetable NEUF à chaque essai.** Le seul chemin qui appelle cette
fonction est « Supprimer mon compte » depuis le Profil ; une fois le compte parti, il n'y a
plus rien à supprimer. Un essai raté laisse donc un abonné orphelin chez RevenueCat **et**
consomme le compte de test.

⚠️ *La procédure nommait la SECTION du tableau de bord (« Secret keys ») et le PRÉFIXE
(`sk_`). Ni l'un ni l'autre ne distingue une v1 d'une v2 : les deux vivent au même endroit
et portent le même préfixe. Une procédure qui désigne un endroit doit désigner ce qu'on y
choisit.*

🔴 **ET IL EXISTE MAINTENANT DEUX CLÉS SECRÈTES REVENUECAT, DE VERSIONS OPPOSÉES —
ne pas remplacer l'une par l'autre :**

| | version | où elle vit | à quoi elle sert |
|---|---|---|---|
| celle de CETTE procédure | **v1** | secret Supabase `REVENUECAT_SECRET_KEY` | supprimer un abonné (`DELETE /v1/subscribers/{uuid}`) |
| celle de la mise en vente | **v2** | `~/.revenuecat/secret-v2`, **hors du dépôt**, sur la machine du fondateur | déclarer les produits et l'entitlement (`PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md`, étape 4) |

⚠️ **Aucune des deux ne fait le travail de l'autre**, et l'erreur ne se voit pas : une v1 sur
un endpoint v2 rend `401 Invalid API key` (le message accuse la clé, pas sa version), une v2
sur l'endpoint v1 rend **`403`** — c'est exactement le piège de l'étape 2 bis, dans l'autre
sens. ➡️ Elles portent le même préfixe `sk_` et se créent au même endroit : la seule chose
qui les distingue est **l'endroit où on les range**. Ne jamais « ranger la bonne clé » en
écrasant l'autre.
ℹ️ Les deux étaient valides au 2026-08-27 : la v1 a supprimé un abonné réel, la v2 fait
passer `npm run check:abonnements`.

## Étape 2 (rédaction d'origine) — poser le secret côté Supabase

⚠️ **Une clé SECRÈTE RevenueCat, pas la clé publique.** Elle se trouve dans le tableau de
bord RevenueCat, *Project settings → API keys*, section **Secret keys**, et elle
**commence par `sk_`**. Celle déjà posée dans EAS commence par `appl_` : c'est la clé
publique de la plateforme Apple, embarquée dans l'app — la poser ici donnerait un `401`
permanent. Elle ne doit JAMAIS entrer dans l'app, dans `eas.json`, ni dans le dépôt.

Deux façons, au choix :

**Par le tableau de bord** — Supabase → *Edge Functions* → *Secrets* → *Add new secret* :

```
REVENUECAT_SECRET_KEY = <la clé secrète>
```

**Ou par la CLI** :

```bash
supabase secrets set REVENUECAT_SECRET_KEY=<la clé secrète>
```

ℹ️ Sans ce secret, la fonction ne tente rien **et le dit** (`non_configure`). Elle ne fait
jamais semblant — c'était le premier réflexe, et c'aurait été le même défaut déplacé d'un
cran.

---

## ✅ Étape 3 — FAITE le 2026-08-27, 14:58:59

`npx supabase functions deploy delete-account --project-ref rgdjsdnqlmfkourrhijv`.
Vérifié sur l'ARTEFACT et pas sur la sortie de la commande (`supabase functions list`) :
**version 4 → 5**, statut `ACTIVE`, `verify_jwt: true`.

⚠️ L'arbre était sur `main` (`6633c39`), propre, sans écart avec `origin/main` — vérifié
AVANT le déploiement. C'est ce qui garantit que le code parti est celui qui a été relu, et
pas la copie de travail d'une autre session.
ℹ️ La CLI avertit « Docker is not running » : sans effet ici. Docker ne sert qu'au
développement local et à `db dump` ; le déploiement passe par l'API.

🔁 **REDÉPLOYÉE LE MÊME JOUR — la version qui tourne est la 8.** Le correctif de
journalisation (étape 4 bis ci-dessous) touche le code de la fonction, donc il a fallu
repasser par `functions deploy`. Vérifié sur l'artefact, pas sur la sortie de la commande :
fonction **retéléchargée et comparée** au fichier de `main`, identique.
➡️ **Le numéro se relit, il ne se recopie pas** : `npx supabase functions list --project-ref
rgdjsdnqlmfkourrhijv` — re-mesuré le 2026-08-27 au soir, `delete-account` **v8**, `ACTIVE`,
`verify_jwt: true`, et **c'est la seule fonction déployée sur le projet**.
⚠️ *Corollaire, et il vaut pour toute retouche future* : modifier ce fichier dans le dépôt
**ne change rien en production** tant que cette étape n'est pas refaite — y compris pour un
simple commentaire, qui ferait diverger l'artefact du fichier relu.

## Étape 3 (rédaction d'origine) — redéployer la fonction

⚠️ **Un `git push` ne déploie PAS une Edge Function.** Le code est sur `main`, il ne tourne
pas tant que cette étape n'est pas faite.

```bash
supabase functions deploy delete-account
```

Ou : tableau de bord → *Edge Functions* → `delete-account` → coller le contenu de
`supabase/functions/delete-account/index.ts` → *Deploy*.

---

## ✅ Étape 4 — FAITE le 2026-08-27, 16:22:34

**Troisième compte jetable** (les deux premiers ont été consommés par les pièges 2 et
2 bis), créé sur un **iPhone** et non depuis le web — cf. l'avertissement ci-dessous, un
essai fait depuis le navigateur n'aurait rien exercé du tout. Parcours : profil, pesée,
écran Kyroz+ — c'est-à-dire les **trois** surfaces qui montent `usePremium`, donc les trois
qui font naître l'abonné. Puis Profil → *Supprimer mon compte*.

**Ce qui a été mesuré**, et il y a deux signaux indépendants :

1. **Le journal de l'invocation est MUET.** Aucun `[delete-account] RevenueCat …` sur
   l'invocation de 16:22:34, alors que la trace `booted` de la fonction, elle, est bien là
   — donc la fonction a tourné et n'a rien eu à signaler. Depuis le correctif du même jour
   (étape 4 bis), c'est le seul état qui se tait.
2. **L'abonné est absent de la liste *Customers*** de RevenueCat, re-regardée plus tard.
   C'est la confirmation, pas le verdict — cf. l'asynchronisme ci-dessous.

➡️ **Deux signaux qui ne partagent pas leur source** : le journal vient de Supabase, la
liste vient de RevenueCat. Un seul des deux aurait pu mentir tout seul.

## 🔴 Étape 4 bis — LE JOURNAL NE MESURAIT RIEN, et il a failli valider un test vide

Trouvé en préparant l'étape 4. La fonction ne journalisait que ses **échecs**. Or elle a
**trois** façons de ne rien supprimer, et deux se taisaient exactement comme la réussite :

| état | avant | ce que le silence voulait dire |
|---|---|---|
| `supprime` | muet | ✅ fait |
| `introuvable` (404) | **muet** | l'app n'a jamais joint RevenueCat — **rien n'a été exercé** |
| `non_configure` | **muet** | le secret manque ou porte un autre nom — **la panne du jour même** |

Un journal silencieux avait donc **trois sens, dont « tout va bien »**. Il ne mesurait rien.

➡️ **Depuis : chaque état qui ne supprime pas ÉCRIT, et le succès seul se tait.** C'est ce
qui rend « muet = réussi » vrai plutôt que rassurant — l'invocation laisse toujours sa trace
`booted`, donc une invocation sans message de la fonction ne peut plus vouloir dire autre
chose. Le 404 part en `warn` et non en `error` : rien n'est cassé, et un faux rouge use
l'attention qu'un vrai rouge réclame.
⚠️ **Ce changement touche le code de la fonction — il a fallu REDÉPLOYER** (étape 3, v8).
Contrat compté par `lib/__tests__/suppressionSousTraitants.test.ts` (**4 mutations, 4
rouges**), dont celle qui fait journaliser le succès : elle aussi casse le contrat.

## Étape 4 (rédaction d'origine, corrigée) — vérifier sur un vrai compte jetable

Créer un compte de test, **visiter le Profil, la feuille de pesée ou l'écran Kyroz+**, puis
le supprimer depuis Profil → Supprimer mon compte.

🔴 **DEUX PRÉMISSES DE CETTE PROCÉDURE ÉTAIENT FAUSSES, mesurées le 2026-08-27 :**
- « finir l'onboarding pour qu'`identifyUser` parte » — **non**. `usePremium` n'est monté
  que par **trois** surfaces (Profil, Kyroz+, feuille de pesée) : l'abonné naît en visitant
  l'une d'elles, pas à l'inscription. Terminer l'onboarding ne crée rien ;
- un essai **depuis le web ne prouve rien** : `purchases.web.ts::identifyUser` ne fait rien
  du tout, aucun abonné n'est créé, et la suppression rend un `404` parfaitement rassurant.
  Le test doit se faire sur un **appareil**.

**Ce qu'on regarde, dans cet ordre :**

1. **Les journaux de la fonction** (Supabase → *Edge Functions* → `delete-account` →
   *Logs*). Aucun `[delete-account] RevenueCat …` = c'est fait — et **rien d'autre**,
   depuis l'étape 4 bis.
2. **Le tableau de bord RevenueCat** → *Customers* → chercher l'UUID du compte supprimé.
   🔴 **MAIS LE JOURNAL FAIT FOI, PAS LE TABLEAU DE BORD.** RevenueCat documente que les
   abonnés sont supprimés **de façon asynchrone** : le client peut encore apparaître
   quelques instants après un `200`. Chercher l'UUID tout de suite et le trouver encore
   là n'est **pas** un échec — c'est l'instrument qui retarde. Si le journal est muet,
   c'est fait ; re-regarder le tableau de bord plus tard sert de confirmation, pas de
   verdict.

| Ce que tu vois | Ce que ça veut dire |
|---|---|
| **aucun message** de la fonction (mais la trace `booted`) | ✅ c'est fait — le seul état muet |
| `RevenueCat NON CONFIGURÉ — aucune tentative…` | le secret est absent **ou mal nommé** (`Deno.env.get` est sensible à la casse) — étape 2 |
| `RevenueCat : aucun abonné pour cet identifiant (404)` | `identifyUser` n'a jamais tourné pour ce compte : normal en soi, mais **sur un test ça veut dire qu'on n'a rien exercé** |
| `RevenueCat a refusé la suppression : 401` | la clé n'est pas la bonne (publique au lieu de secrète ?) — étape 2 |
| `RevenueCat a refusé la suppression : 403` | la clé est acceptée, l'opération refusée : clé **v2** sur un endpoint **v1** — étape 2 bis |
| `RevenueCat injoignable` | réseau ou endpoint faux — retour à l'étape 1 |

⚠️ **Le compte Supabase est supprimé dans tous les cas** — c'est voulu : un droit à
l'effacement ne peut pas dépendre de la disponibilité d'un tiers.

---

## ✅ Étape 5 — FAITE le 2026-08-27

Inscrite dans `RGPD-REGISTRE.md`, ligne **RevenueCat** du traitement n°1. Elle porte ce qui
a été VÉRIFIÉ et comment, pas l'intention : secret relu par la CLI · fonction
retéléchargée et comparée · suppression réelle d'un compte jetable, journal muet.

➡️ **Le §7 de la politique est exact depuis aujourd'hui.** Il bornait l'exception de
conservation à « si vous avez souscrit un abonnement » — rédaction juste seulement si
l'identifiant d'un NON-abonné disparaît. `identifyUser` en créant un pour tout le monde,
elle ne l'était pas. Elle l'est.

## ✅ Étape 6 — les orphelins sont RETIRÉS, le 2026-08-27 à 16:51

Ce sont les abonnés des comptes de test supprimés **AVANT** ce câblage. Aucun correctif ne
les atteint : leur ligne Supabase n'existe plus, donc plus rien ne peut dire quoi
supprimer — c'est le seul travail de cette procédure qui ne pouvait pas être automatisé.

**Trois** abonnés, **trois `200` avec `deleted: true`**. Mesuré sur la réponse de l'API, pas
sur le tableau de bord : la suppression y est asynchrone (étape 4).

⚠️ **COMMENT LE GESTE A ÉTÉ FAIT, parce que la forme comptait autant que le résultat** :
une fonction **jetable**, écrite dans un dossier temporaire **hors du dépôt**, portant les
trois identifiants **en dur** — donc incapable de supprimer autre chose qu'eux — déployée,
appelée **une fois**, puis **détruite**. Vérifié après coup, sur l'artefact :
`supabase functions list` ne rend plus que `delete-account` (v8), et `git status` est resté
propre du début à la fin.
➡️ **Trois raisons de ne pas verser ce code au dépôt** : il n'a aucun usage futur (les
identifiants sont périmés le jour où il tourne) ; une fonction de suppression en masse qui
resterait déployée est une porte ouverte ; et un fichier non versionné laissé dans l'arbre
est le pire des trois états (CLAUDE.md §10).
ℹ️ La suppression demande la clé **secrète** — c'est pourquoi elle passe par une Edge
Function et pas par un appel depuis la machine du fondateur : le secret est déjà posé côté
Supabase, il n'a jamais besoin d'en sortir.

---

## ✅ Ce qui est CLOS — la procédure entière, le 2026-08-27

| | |
|---|---|
| Endpoint confirmé | étape 1 |
| Secret posé, au bon nom, en **v1** | étapes 2 · 2 bis |
| Fonction déployée — **v8** | étape 3 |
| Vérifiée sur un vrai compte, deux signaux | étape 4 |
| Journal rendu lisible (**muet = réussi**) | étape 4 bis |
| Inscrite au registre RGPD | étape 5 |
| Orphelins retirés | étape 6 |

➡️ **Ce qui reste vrai après clôture, et qu'il faut savoir** : la fonction ne tourne que sur
le chemin « Supprimer mon compte ». Un abonné créé par une visite du Profil / Kyroz+ / de la
feuille de pesée disparaît **avec le compte**, jamais avant — c'est exactement ce que le §7
de la politique promet, ni plus ni moins.

## Étape 5 (rédaction d'origine) — inscrire au registre

Une fois l'étape 4 verte, ajouter à `RGPD-REGISTRE.md`, dans la ligne **RevenueCat** :

> ✅ **Suppression à la demande — CÂBLÉE le AAAA-MM-JJ.** L'Edge Function `delete-account`
> supprime l'abonné (`DELETE /v1/subscribers/{uuid}`) **avant** la cascade Supabase, tant
> que l'UUID a encore un porteur. Best-effort borné à 5 s : l'effacement du compte n'est
> jamais retardé par un tiers, et un échec est journalisé — c'est la seule trace qui
> restera, l'UUID disparaissant avec le compte.

---

## Ce qui est déjà fait, et n'attend rien

- ✅ Le code de la fonction (suppression best-effort, bornée, jamais bloquante, ordre
  RevenueCat → cascade).
- ✅ Le client lit le verdict au lieu de l'avaler (`lib/sync.ts::deleteAccount`).
- ✅ Le dialogue de confirmation ne promet plus « **toutes** tes données » — et il nomme
  désormais les **pesées** et les **photos**, que le code efface et que le texte taisait.
- ✅ Le garde-fou : `lib/__tests__/suppressionSousTraitants.test.ts`, **7 mutations, aucune
  survivante**. Il tient le couplage que personne ne lit d'un seul coup d'œil — retirer la
  suppression RevenueCat rend le §7 de la politique faux **sans toucher au texte**.
- ✅ La moitié **PostHog** du constat 01-03 est close **par les faits, pas par ce
  correctif** : `distinctId()` n'est appelé que depuis `capture()`, qui sort avant tout sur
  `STATISTIQUES_USAGE_ACTIVES` (false depuis le 2026-08-26). Plus aucun pseudonyme ne peut
  naître, et les données ont été supprimées à la source. Le constat décrivait un état qui
  avait déjà changé la veille.
