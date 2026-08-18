# Procédure — le domaine `legal.kyroz.app` et le site web

> Écrite le 2026-08-18 au soir, après avoir constaté que **le site public ne chargeait
> plus rien**. Le correctif de code est dans le même lot ; **ces étapes-ci se font à la
> main dans des consoles**, aucun test ne les attrapera.
>
> 🧑 **Une étape à la fois.** Fais l'étape, dis-le, on passe à la suivante.

---

## Ce qui s'est passé, en trois phrases

Le site Pages de l'app a reçu le domaine personnalisé `legal.kyroz.app`. Un domaine
personnalisé s'applique à un **site**, jamais à un fichier : toute la racine s'est
déplacée de `/Kyroz-app/` à `/`, et `brgkevin-arch.github.io/Kyroz-app/*` s'est mis à
répondre 301 vers le nouveau domaine.

Or `app.json` déclarait encore `baseUrl: "/Kyroz-app"`. Le HTML servi appelait donc son
bundle sous un sous-chemin qui n'existe plus : **404 sur le JS, splash KYROZ et spinner
à l'infini**. Rien n'a rougi — la CI déploie un artefact, elle ne visite pas la page.

**Arbitrage fondateur : on garde le domaine, on répare le code.** `baseUrl` est vidé,
et `lib/__tests__/deploiementWeb.test.ts` empêche qu'il revienne sans que le domaine
bouge avec.

---

## Étape 1 — Forcer HTTPS sur le domaine personnalisé

🔴 **C'est la seule étape qui touche à la sécurité, et elle n'est pas faite.**

Mesuré le 2026-08-18 :

```
https://brgkevin-arch.github.io/Kyroz-app/  →  301  →  http://legal.kyroz.app/
http://legal.kyroz.app/                     →  200  (aucune redirection vers https)
```

La redirection **descend en clair**, et le site sert les écrans de connexion : les
jetons de session Supabase peuvent donc transiter en HTTP. `https://legal.kyroz.app/`
répond déjà 200 — le certificat existe, il n'est simplement pas imposé.

1. GitHub → dépôt **`brgkevin-arch/Kyroz-app`** → **Settings** → **Pages**
2. Section **Custom domain** : vérifier que `legal.kyroz.app` s'affiche avec un
   ✅ *DNS check successful*
3. Cocher **Enforce HTTPS**

> ⏳ Si la case est **grisée**, c'est que le certificat Let's Encrypt est encore en
> cours d'émission. Attendre et revenir — ça peut prendre jusqu'à 24 h. Ne pas retirer
> puis remettre le domaine pour « relancer » : ça repart de zéro.
>
> ⚠️ **Cocher la case et la voir prendre effet sont deux choses** (constaté le
> 2026-08-18 : cochée, et `http://` répondait toujours 200 plusieurs minutes après).
> GitHub réémet la configuration de manière asynchrone. ➡️ Ne pas conclure de la case
> cochée que c'est fait : **c'est la requête qui tranche**, pas l'écran des réglages.

**Vérifier après** : `http://legal.kyroz.app/` doit répondre **301** vers `https://`,
et non plus 200.

```bash
curl -sSI http://legal.kyroz.app/ | head -3
```

---

## Étape 2 — Vérifier que le site charge VRAIMENT

⛔ **NE PAS FAIRE AVANT QUE LE LOT SOIT MERGÉ ET DÉPLOYÉ.** Le correctif `baseUrl` vit
dans le code : tant qu'il n'est pas sur `main` et que `deploy.yml` n'a pas republié, le
site sert l'ancien HTML et **le spinner tourne toujours**. Ce n'est pas un symptôme
résiduel, c'est le même bug, intact.

> 🔴 **La première version de cette procédure enchaînait les étapes 1 et 2 sans le dire**,
> et l'étape 2 a été tentée sur un site non redéployé. Une procédure « une étape à la
> fois » doit nommer ce dont chaque étape DÉPEND, pas seulement son ordre — sinon elle
> fait constater une panne déjà corrigée et fait douter du correctif.

**Le feu vert** : le run `deploy.yml` du commit de ce lot est vert *et* terminé.

```bash
gh run list --workflow=deploy.yml --limit 3
```

⚠️ **À faire dans un navigateur.** C'est l'étape qui manquait la fois d'avant : « CI
verte » et « déploiement réussi » ont été lus comme « le site marche », et il était mort
depuis des heures.

1. Ouvrir <https://legal.kyroz.app/>
2. Le splash KYROZ doit **laisser la place à un écran** — connexion ou plan. S'il reste
   un spinner, le bundle ne se charge pas.
3. Ouvrir la console du navigateur : **aucune 404** sur un fichier `_expo/static/…`

> 🔴 **Ce que « ça marche » ne prouve PAS** : que l'OTA est publié. Les binaires
> TestFlight en circulation ne reçoivent rien de ce lot — c'est une surface séparée
> (`PROCEDURE-2026-08-18-activation-posthog.md` §6).

---

## Ce que ce lot NE change pas

- **L'URL de politique déclarée aux stores reste `https://kyroz.app/legal.html`**
  (dépôt `kyroz-site`). Elle est servie par un autre Pages, purement statique, où rien
  ne l'écrase. Ne pas la remplacer par une URL `legal.kyroz.app` : le Pages de l'app
  pré-rend sa propre route `/legal` et écraserait le fichier généré.
- **`URL_RETOUR_CONFIRMATION` reste sur l'ancienne URL `github.io`**, et c'est
  volontaire : c'est la valeur gravée dans les binaires déjà distribués **et** inscrite
  en liste blanche Supabase. Supabase valide l'URL **avant** que le navigateur ne suive
  la redirection, donc le filet tient. ⚠️ La changer dans le code sans l'avoir d'abord
  ajoutée à la liste blanche la ferait **ignorer en silence** (repli sur la « Site URL »).
  Les deux bougent ensemble, ou aucune des deux.

---

## Si un jour tu retires le domaine

Alors il faut **remettre `baseUrl: "/Kyroz-app"` dans `app.json`** et corriger
`lib/__tests__/deploiementWeb.test.ts` **dans le même commit**. Les deux moitiés sont
inséparables : n'en changer qu'une reproduit exactement la même page blanche, dans
l'autre sens. Le test est là pour que personne ne puisse en oublier une.
