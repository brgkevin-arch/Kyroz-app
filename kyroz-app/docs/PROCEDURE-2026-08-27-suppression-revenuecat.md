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

## Étape 1 — confirmer l'endpoint sur la documentation RevenueCat

⚠️ **À faire AVANT tout le reste, et c'est la seule étape que je ne peux pas faire.**

La fonction appelle :

```
DELETE https://api.revenuecat.com/v1/subscribers/{app_user_id}
Authorization: Bearer <clé secrète>
```

C'est l'API REST v1 de RevenueCat telle que je la connais — **elle n'a jamais été appelée
depuis ce dépôt**, donc elle n'est pas vérifiée. Déployer sans confirmer livrerait un
`echec` permanent qui ressemble à un problème de réseau.

**Ce qu'il faut lire** : la page « Deleting customer information » / la référence de l'API
v1 sur `revenuecat.com/docs`. Trois points à confirmer :

| | |
|---|---|
| le chemin | `/v1/subscribers/{app_user_id}` en `DELETE` |
| l'en-tête | `Authorization: Bearer <clé SECRÈTE>` (pas la clé publique de l'app) |
| le code de retour quand l'abonné n'existe pas | on attend **404** |

➡️ **Si quelque chose diffère, dis-le moi avant de continuer** : je corrige la fonction,
et on reprend à l'étape 2.

---

## Étape 2 — poser le secret côté Supabase

⚠️ **Une clé SECRÈTE RevenueCat, pas la clé publique.** Elle se trouve dans le tableau de
bord RevenueCat, *Project settings → API keys*, section **Secret keys**. Elle ne doit
JAMAIS entrer dans l'app, dans `eas.json`, ni dans le dépôt — elle ne vit que côté serveur.

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

## Étape 3 — redéployer la fonction

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
   Il ne doit plus rien rendre.

| Ce que tu vois | Ce que ça veut dire |
|---|---|
| aucun log, client absent de RevenueCat | ✅ c'est fait |
| `RevenueCat a refusé la suppression : 401` | la clé n'est pas la bonne (publique au lieu de secrète ?) — étape 2 |
| `… : 404` **sans** log (état `introuvable`) | normal si l'app n'a jamais joint RevenueCat pour ce compte |
| `RevenueCat injoignable` | réseau ou endpoint faux — retour à l'étape 1 |

⚠️ **Le compte Supabase est supprimé dans tous les cas** — c'est voulu : un droit à
l'effacement ne peut pas dépendre de la disponibilité d'un tiers.

---

## Étape 5 — inscrire au registre

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
