# Le domaine `legal.kyroz.app` — épisode CLOS le 2026-08-18

> ⚠️ **Ce document n'est plus une procédure : il n'y a rien à faire.** Il est gardé
> parce qu'un domaine posé, retiré, et une panne de plusieurs heures ne laissent aucune
> trace dans le code — et que la prochaine session qui verra un CNAME orphelin chez
> Cloudflare aura besoin de savoir pourquoi.

---

## L'état final, mesuré

| | |
|---|---|
| **L'app** | `https://brgkevin-arch.github.io/Kyroz-app/` — 200, bundle en 200, console propre |
| **La page légale** | `https://kyroz.app/legal.html` — 200, « Confidentialité & CGU », dépôt `kyroz-site` |
| **`legal.kyroz.app`** | ne sert plus rien. Domaine personnalisé retiré côté GitHub |

C'est **l'état d'avant l'épisode**, et c'est celui qui répondait déjà au besoin : une
page légale sur le domaine de la marque, sans pseudo personnel, **déjà déclarée à Apple**.

---

## Ce qui s'est passé

Le domaine `legal.kyroz.app` a été posé sur le Pages du dépôt de **l'app**. Un domaine
personnalisé GitHub s'applique à un **SITE entier**, jamais à une page : toute l'app a
donc déménagé dessus, et `brgkevin-arch.github.io/Kyroz-app/*` s'est mis à répondre 301
vers lui.

Or `app.json` déclarait `baseUrl: "/Kyroz-app"`. Le HTML servi appelait son bundle sous
un sous-chemin qui n'existait plus : **404 sur le JS, splash KYROZ et spinner à
l'infini**. Le site public n'a plus rien chargé pendant des heures.

🔴 **Et rien n'a rougi.** La CI construit et téléverse un artefact — elle ne visite pas
la page. Bon commit, run vert, bonne surface : tous les contrôles existants répondaient
« oui ».

⚠️ **Ça ne fonctionnait pas non plus AVANT, contrairement aux apparences.** La page
légale qu'on voyait sur `legal.kyroz.app/legal.html` était l'app affichant sa propre
route `/legal` — le domaine était sur l'app depuis le début. Ça semblait sain parce que
personne n'avait ouvert la racine, le seul endroit où ça cassait.

---

## Les trois choses à ne pas refaire

**1. Ne pas reposer un domaine personnalisé sur le Pages de l'app.** Il emporte tout le
site, `confirme.html` compris — l'URL de retour de confirmation d'e-mail, codée en dur
dans `lib/emailConfirmation.ts`, gravée dans les binaires déjà distribués et inscrite en
liste blanche Supabase.

**2. `baseUrl` et l'hébergement sont inséparables.** Servi sous `…github.io/Kyroz-app/`,
`baseUrl` vaut `/Kyroz-app` ; servi à la racine d'un domaine, il doit être **vide**. N'en
changer qu'un rend la même page blanche, dans un sens ou dans l'autre. Le couplage est
tenu par `lib/__tests__/deploiementWeb.test.ts` (constante `PREFIXE_SERVI`).

**3. Un changement d'origine déconnecte tous les utilisateurs web.** Mesuré : après le
passage sur `legal.kyroz.app`, `localStorage` de la nouvelle origine contenait **0 clé**
et l'app s'ouvrait sur *Inscription*. Les comptes vivent chez Supabase — une reconnexion
suffit — mais le symptôme ressemble trait pour trait à « il a perdu mon compte ». Vaut
aussi pour un raccourci d'écran d'accueil posé depuis l'autre domaine.

---

## Le reliquat, sans urgence

Un enregistrement `legal` peut subsister chez Cloudflare. Symptôme : `legal.kyroz.app`
résout vers des IP `188.114.x` (Cloudflare) et rend **HTTP 530, `error code: 1016`** —
« origine introuvable ». Ça ne casse rien : aucune surface de Kyroz ne pointe vers ce
nom. Le supprimer est du ménage, pas un correctif.

⚠️ **Ne pas le remplacer par une redirection sans décision explicite.** Ce serait une
seconde adresse vers une page qui en a déjà une, et c'est la multiplication d'adresses
qui a produit tout cet épisode.

---

## Ce qui reste vrai et ne bouge pas

- **L'URL déclarée aux stores est `https://kyroz.app/legal.html`** (dépôt `kyroz-site`),
  servie par un Pages purement statique où rien ne l'écrase. Le Pages de l'app pré-rend
  sa propre route `/legal` et écraserait le fichier généré — c'est pourquoi la page
  publique vit dans l'autre dépôt.
- **`URL_RETOUR_CONFIRMATION` est de nouveau exacte et directe** :
  `https://brgkevin-arch.github.io/Kyroz-app/confirme.html`. Rien à changer, ni dans le
  code ni chez Supabase.
- **Enforce HTTPS** n'a plus d'objet : il ne concernait que le domaine personnalisé, et
  `github.io` est servi en HTTPS de toute façon.
