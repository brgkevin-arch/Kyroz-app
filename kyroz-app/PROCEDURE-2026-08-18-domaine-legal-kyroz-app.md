# Procédure — rendre `legal.kyroz.app` à la page légale

> Écrite le 2026-08-18 au soir. **L'ordre compte, et il y a une fenêtre de casse** :
> lis la section « L'ordre » avant de cliquer quoi que ce soit.
>
> 🧑 **Une étape à la fois.** Fais l'étape, dis-le, on passe à la suivante.

---

## Ce qui s'est passé, et pourquoi on revient en arrière

Le Pages de l'app a reçu le domaine personnalisé `legal.kyroz.app`. Un domaine
personnalisé s'applique à un **SITE**, jamais à une page : toute la racine s'est déplacée
de `/Kyroz-app/` à `/`, et `brgkevin-arch.github.io/Kyroz-app/*` s'est mis à répondre 301
vers lui.

Or `app.json` déclarait encore `baseUrl: "/Kyroz-app"`. Le HTML appelait donc son bundle
sous un sous-chemin disparu : **404 sur le JS, splash KYROZ et spinner à l'infini**. Rien
n'a rougi — la CI déploie un artefact, elle ne visite pas la page.

Ça a d'abord été réparé en gardant le domaine (`baseUrl` vidé, PR #122). Puis
l'évidence : **un nom d'hôte ne peut pas être à la fois la maison de l'app et le
raccourci vers une page.** `legal.kyroz.app` s'appelle `legal` parce qu'il devait porter
la politique de confidentialité. Pour qu'il le fasse, l'app doit habiter ailleurs.

➡️ **Décision : l'app revient sous `brgkevin-arch.github.io/Kyroz-app/`**, `baseUrl` avec
elle, et `legal.kyroz.app` est libéré.

---

## L'ordre — et la fenêtre de casse

Les deux moitiés (le code et le réglage GitHub) doivent bouger ensemble, mais elles ne
peuvent pas bouger **au même instant**. Entre les deux, le site est cassé. On place donc
cette fenêtre là où elle dure quelques secondes, pas quelques minutes :

| Ordre | Fenêtre de casse |
|---|---|
| ✅ **Déployer, PUIS retirer le domaine** | de la fin du déploiement au clic « Remove » — **quelques secondes** |
| ❌ Retirer le domaine, puis déployer | toute la durée du build — **2 à 4 minutes** |

⚠️ Donc : **ne retire pas le domaine avant que le run soit vert.** Tant qu'il tourne, le
site fonctionne encore sur l'ancien bundle.

---

## Étape 1 — Déployer le retour de `baseUrl`

Merger la PR de ce lot. Le run `deploy.yml` republie l'app avec `baseUrl: "/Kyroz-app"`,
c'est-à-dire les chemins d'assets de `…github.io/Kyroz-app/`.

```bash
gh run list --workflow=deploy.yml --limit 3
```

⏳ **Attendre qu'il soit `completed/success`.** À cet instant précis, le site sera cassé
sur `legal.kyroz.app` — c'est normal, et c'est l'étape 2 qui le répare. Enchaîne sans
attendre.

---

## Étape 2 — Retirer le domaine personnalisé

1. GitHub → dépôt **`brgkevin-arch/Kyroz-app`** → **Settings** → **Pages**
2. Section **Custom domain** → **Remove**

Le site redevient immédiatement `https://brgkevin-arch.github.io/Kyroz-app/`, et
`legal.kyroz.app` cesse d'être servi par ce Pages.

**Vérifier** — l'app doit charger, et l'ancienne redirection avoir disparu :

```bash
curl -sSI https://brgkevin-arch.github.io/Kyroz-app/ | head -3
```

> ⚠️ **`legal.kyroz.app` rendra un 404 entre l'étape 2 et l'étape 3.** Son CNAME pointe
> toujours vers `brgkevin-arch.github.io`, mais plus aucun dépôt ne réclame ce nom
> d'hôte — GitHub trie par nom d'hôte. Ce n'est pas une panne, c'est un intervalle.

---

## Étape 3 — Donner à `legal.kyroz.app` son rôle : la politique

Deux voies. **La voie B ne demande aucun changement DNS** ; la voie A demande un seul
basculement d'enregistrement.

### Voie A — Règle de redirection Cloudflare *(la plus simple, aucun dépôt)*

1. Cloudflare → `kyroz.app` → **DNS → Enregistrements** → ligne `legal` → **Modifier**
2. Basculer **État du proxy** sur **Proxyfié** (nuage orange), enregistrer
3. **Règles → Règles de redirection → Créer une règle**
   - Si : *Nom d'hôte* **égal à** `legal.kyroz.app`
   - Alors : redirection **statique** vers `https://kyroz.app/legal.html`, code **301**

> ⚠️ **Le nuage orange est correct ICI, et seulement ici.** La règle du dépôt — « nuage
> gris » — protège le certificat des hôtes servis par **GitHub Pages** ; `legal` cesse
> justement d'en être un, et c'est Cloudflare qui fournit le certificat sur cet hôte. Les
> autres enregistrements (`kyroz.app`, `www`) restent en **DNS uniquement**.

### Voie B — Un petit dépôt dédié *(garde le nuage gris)*

Un dépôt public contenant un seul `index.html`, Pages activé dessus (branche `main`,
dossier `/`), et `legal.kyroz.app` en domaine personnalisé. Le fichier tient ici :

```html
<!doctype html>
<html lang="fr" translate="no">
<head>
  <meta charset="utf-8" />
  <meta name="google" content="notranslate" />
  <!-- Redirection SANS JavaScript : elle doit marcher pour un robot de store
       comme pour un navigateur sans JS. Le refresh à 0 s est le seul moyen
       d'émettre une redirection depuis une page statique GitHub Pages. -->
  <meta http-equiv="refresh" content="0; url=https://kyroz.app/legal.html" />
  <link rel="canonical" href="https://kyroz.app/legal.html" />
  <title>Confidentialite &amp; CGU — Kyroz</title>
</head>
<body>
  <!-- Le lien reste cliquable si le refresh est bloque. Ne JAMAIS mettre le texte
       legal ici : cette page est un panneau indicateur, pas une copie. -->
  <p>Redirection vers <a href="https://kyroz.app/legal.html">la politique de
  confidentialite et les CGU de Kyroz</a>.</p>
</body>
</html>
```

⚠️ **Une page de redirection, jamais une copie du texte légal.** Une copie réintroduirait
exactement ce que le lot « source unique » a passé la journée à supprimer. Une
redirection, elle, n'a rien qui puisse diverger.

---

## Vérifier, à la fin

```bash
curl -sSL -o /dev/null -w "%{url_effective} → %{http_code}\n" https://legal.kyroz.app/
```

Attendu : arrivée sur `https://kyroz.app/legal.html`, en **200**.

Et dans un navigateur, l'app : <https://brgkevin-arch.github.io/Kyroz-app/> doit dépasser
le splash, sans 404 sur `_expo/static/…` dans la console.

---

## Ce qu'il faut savoir avant de constater

### Le changement d'origine déconnecte les sessions web

Mesuré le 2026-08-18 : après le passage sur `legal.kyroz.app`, `localStorage` de la
nouvelle origine contenait **0 clé** et l'app s'ouvrait sur *Inscription*. Un navigateur
cloisonne son stockage **par origine** — changer de domaine, c'est repartir d'un stockage
vide. **Le retour sur `github.io` refait exactement pareil, en sens inverse.**

➡️ Les comptes ne sont pas perdus, ils vivent chez Supabase : une reconnexion suffit. Mais
le symptôme ressemble trait pour trait à « il a perdu mon compte ».
⚠️ Vaut aussi pour un **raccourci d'écran d'accueil** posé depuis l'autre domaine.

### Ce que ce lot NE change pas

- **L'URL de politique déclarée aux stores reste `https://kyroz.app/legal.html`** (dépôt
  `kyroz-site`), servie par un Pages purement statique où rien ne l'écrase.
  ⚠️ Ne pas la remplacer par `legal.kyroz.app` : ce dernier n'est qu'une redirection vers
  elle, et une URL de fiche produit ne devrait pas dépendre d'un saut de plus.
- **`URL_RETOUR_CONFIRMATION` redevient exacte.** Elle vaut
  `https://brgkevin-arch.github.io/Kyroz-app/confirme.html` — codée en dur, gravée dans
  les binaires distribués, inscrite en liste blanche Supabase. Pendant l'épisode du
  domaine elle passait par deux redirections ; elle redevient directe. **Rien à changer**,
  ni dans le code ni chez Supabase.
- **Enforce HTTPS** disparaît avec le domaine personnalisé — `github.io` est servi en
  HTTPS de toute façon, et sans domaine personnalisé la case n'a plus d'objet.
