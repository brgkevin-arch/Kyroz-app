# Faire aller la suppression de compte jusque chez RevenueCat

Date : 2026-08-27 · Origine : contre-audit V1, constat **01-03** (P1) · Fiche : `AGENTS.md` **A41**

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

Le code est écrit et poussé (`supabase/functions/delete-account/index.ts`). Il ne fait
rien tant que les deux étapes ci-dessous ne sont pas faites.

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

## Étape 3 (rédaction d'origine) — redéployer la fonction

⚠️ **Un `git push` ne déploie PAS une Edge Function.** Le code est sur `main`, il ne tourne
pas tant que cette étape n'est pas faite.

```bash
supabase functions deploy delete-account
```

Ou : tableau de bord → *Edge Functions* → `delete-account` → coller le contenu de
`supabase/functions/delete-account/index.ts` → *Deploy*.

---

## Étape 4 — vérifier sur un vrai compte jetable

Créer un compte de test, finir l'onboarding (pour que `identifyUser` parte), puis le
supprimer depuis Profil → Supprimer mon compte.

**Ce qu'on regarde, dans cet ordre :**

1. **Les journaux de la fonction** (Supabase → *Edge Functions* → `delete-account` →
   *Logs*). Aucun `[delete-account] RevenueCat …` = tout s'est bien passé.
2. **Le tableau de bord RevenueCat** → *Customers* → chercher l'UUID du compte supprimé.
   🔴 **MAIS LE JOURNAL FAIT FOI, PAS LE TABLEAU DE BORD.** RevenueCat documente que les
   abonnés sont supprimés **de façon asynchrone** : le client peut encore apparaître
   quelques instants après un `200`. Chercher l'UUID tout de suite et le trouver encore
   là n'est **pas** un échec — c'est l'instrument qui retarde. Si le journal est muet,
   c'est fait ; re-regarder le tableau de bord plus tard sert de confirmation, pas de
   verdict.

| Ce que tu vois | Ce que ça veut dire |
|---|---|
| aucun log, client absent de RevenueCat | ✅ c'est fait |
| `RevenueCat a refusé la suppression : 401` | la clé n'est pas la bonne (publique au lieu de secrète ?) — étape 2 |
| `… : 404` **sans** log (état `introuvable`) | normal si l'app n'a jamais joint RevenueCat pour ce compte |
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

🔁 **Ce qui reste, et qu'aucun correctif n'atteint** : les abonnés orphelins des comptes de
test supprimés AVANT ce câblage. À retirer à la main.

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
