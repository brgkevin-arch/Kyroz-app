# Remettre `kyroz.app/legal.html` à jour

> **Une étape à la fois.** Chaque étape a une commande et un résultat attendu.
> Ne passe à la suivante que si le résultat correspond.
> Écrit le 2026-08-26, corrigé le même jour : ma première mesure portait sur un clone
> périmé. Voir « Correction » ci-dessous — c'est la partie la plus instructive.

---

## Pourquoi

`https://kyroz.app/legal.html` est **l'URL de politique de confidentialité exigée par
l'App Store et Google Play**. Elle vit dans un dépôt séparé (`brgkevin-arch/kyroz-site`),
donc elle échappe au contrôle automatique du dépôt de l'app.

### 🔴 Correction du 2026-08-26 : la première version de ce document était FAUSSE

Elle annonçait une page « figée au 15 juin 2026 », avec Resend et PostHog non
déclarés et un âge minimum à 16 ans. **C'était faux.** Ces trois défauts avaient été
corrigés dans `kyroz-site` entre le 18 et le 23 août (PR #1 à #4 de ce dépôt).

Ce que j'avais mesuré, c'est un **clone local en retard de trois commits** — et je
l'avais mesuré AVANT de faire l'étape 1. La mesure était juste sur le fichier lu, et
elle ne répondait pas à la question posée : « que dit la page EN LIGNE ? »

➡️ **C'est la raison d'être de l'ordre des étapes.** L'étape 1 (`git pull` du clone)
n'est pas une commodité de confort avant de committer : c'est ce qui rend toute mesure
ultérieure valable. Mesurer un clone périmé, c'est interroger un instrument qui répond
sur un autre monde.

### L'écart réel, une fois le clone à jour

| point | page en ligne (23 août) | source (26 août) |
|---|---|---|
| Date de mise à jour | 23 août 2026 | **26 août 2026** |
| « garde-manger » → « réserve » | ancien terme | **renommé le 2026-08-25** |
| Clause CGU « tarif bloqué à la souscription » | **absente** | présente |
| Resend, PostHog, âge minimum 18 ans | ✅ déjà à jour | ✅ |

**5 lignes de diff, pas 100.** Trois écarts, tous datés du 2026-08-25 — exactement les
changements que la source avait reçus ce jour-là.

**État : CORRIGÉ.** `kyroz-site` PR #5 (`21fec6b`), fusionnée le 2026-08-26. Ce
document reste la procédure de référence pour la prochaine fois.

## Ce que la régénération va faire — et ne pas faire

Vérifié en générant dans un dossier jetable, sans toucher au dépôt du site :

- ✅ **Le design ne bouge pas.** Le bloc `<style>` de la page générée est **identique
  au caractère près** à celui en ligne. Même gabarit (`wrap`, `logo`, `updated`),
  même titre de page.
- ✅ **~100 lignes changent**, et c'est du CONTENU : les sections manquantes, les deux
  sous-traitants, l'âge, la date, la clause de tarif.
- ⚠️ **Le commentaire en tête du fichier est remplacé.** L'actuel dit « Si tu modifies
  le texte légal, mets À JOUR LES DEUX (ici + constants/legal.ts) » — c'est
  précisément l'instruction périmée qui a laissé la page dériver. Le nouveau dit que
  le fichier est généré et ne se modifie plus à la main.

---

## Avant de commencer

- Le clone du site est dans **`/Users/kevinberger/Kyroz_Site`** (majuscule,
  underscore) — chercher `kyroz-site` en minuscules ne le trouve pas.
- Il **peut être en retard** sur `origin/main` — il l'était de trois commits le
  2026-08-26, ce qui a suffi à me faire décrire une page qui n'existait plus.
  L'étape 1 n'est donc pas facultative, et **aucune mesure ne vaut avant elle**.
- 🔴 **Ne jamais éditer `legal.html` à la main.** La source est
  `kyroz-app/constants/legal.ts`. Une modification manuelle sera écrasée à la
  prochaine génération, sans le dire.

---

> 🔁 **DEUXIÈME EXÉCUTION, LE 2026-08-26 AU SOIR** — `kyroz-site` PR #7 : la mesure
> d'audience quitte la page (sept paragraphes retirés). Deux écarts assumés à la
> procédure, sur décision explicite du fondateur (« exceptionnellement ») :
> · **l'étape 0 a été contournée** : la page a été générée depuis le WORKTREE de la PR,
>   pas depuis le dépôt principal sur `main`. Le risque que l'étape 0 couvre est de
>   générer depuis une source PÉRIMÉE ; ici la source était en AVANCE, ce qui est l'autre
>   sens du même écart et demande la même vigilance ;
> · **publiée avant l'OTA** : entre les deux, un binaire installé peut encore émettre
>   pour qui avait accepté, alors que la page n'en parle plus. Fenêtre acceptée — la
>   collecte réelle se comptait sur deux appareils.
> ➡️ Pour toute exécution ORDINAIRE, l'étape 0 reste la règle.

---

## Étape 0 — 🔴 VÉRIFIER DEPUIS QUOI TU GÉNÈRES

**C'est l'étape qu'on saute, et c'est celle qui fait publier une page fausse en ayant
l'air de réussir.** Le générateur lit `constants/legal.ts` **du dossier où tu le
lances**. Si ce dossier est sur un vieux commit, il produit une page vieille — sans
un mot, avec le même message de succès.

Constaté le 2026-08-26 : `/Users/kevinberger/Kyroz_Code` était en **HEAD détaché sur
`8caaa03`** (#135), où `effectiveDate` vaut **`18 août 2026`**. Régénérer depuis là
aurait remplacé une page de juin par une page d'août périmée.

```bash
cd /Users/kevinberger/Kyroz_Code && git status --short --branch | head -1 && grep -o "effectiveDate: '[^']*'" kyroz-app/constants/legal.ts
```

**Attendu :** `## main...origin/main` (PAS `## HEAD (no branch)`) **et**
`effectiveDate: '26 août 2026'`.

Si ce n'est pas le cas :

```bash
cd /Users/kevinberger/Kyroz_Code && git checkout main && git pull
```

puis relance la vérification ci-dessus. Ne passe à l'étape 1 que quand les DEUX
valeurs sont bonnes.

ℹ️ Un dossier `audit-v1/` non suivi traîne dans ce dépôt. Il n'est pas concerné par
cette procédure — ne pas le commiter, ne pas le supprimer.

---

## Étape 1 — remettre le clone du site à jour

```bash
cd /Users/kevinberger/Kyroz_Site && git checkout main && git pull
```

**Attendu :** `Fast-forward`, et `git status` propre. Si `git status` montre des
fichiers modifiés, arrête-toi : quelque chose a été édité à la main, il faut savoir
quoi avant d'écraser.

---

## Étape 2 — régénérer la page depuis la source

Depuis le dépôt de l'**app** (pas celui du site), et seulement si l'étape 0 est
verte :

```bash
cd /Users/kevinberger/Kyroz_Code/kyroz-app && KYROZ_SITE=/Users/kevinberger/Kyroz_Site npm run gen:legal
```

**Attendu :** trois lignes, dont `→ site  régénéré — /Users/kevinberger/Kyroz_Site/legal.html`.

⚠️ Ce message dit que le fichier a été ÉCRIT, pas qu'il a été écrit avec le bon
contenu. C'est l'étape 0 qui garantit le contenu, et l'étape 3 qui le montre.

---

## Étape 3 — regarder ce qui a changé

```bash
cd /Users/kevinberger/Kyroz_Site && git diff --stat && git diff legal.html | head -60
```

**Attendu :** un seul fichier touché, `legal.html`. Dans le diff : la date qui passe
au 26 août, l'apparition de Resend et de PostHog, l'âge qui passe de 16 à 18.
**Aucune ligne de `<style>` ne doit bouger.** Si le style bouge, ne commite pas —
signale-le.

---

## Étape 4 — publier

```bash
cd /Users/kevinberger/Kyroz_Site && git checkout -b legal-2026-08-26 && git add legal.html && git commit -m "legal: la page publique rattrape la source — Resend, PostHog et l'age minimum a 18 ans" && git push -u origin legal-2026-08-26
```

Puis ouvrir la PR :

```bash
cd /Users/kevinberger/Kyroz_Site && gh pr create --base main --fill
```

⚠️ **La branche `main` de ce dépôt EST le site en ligne** (GitHub Pages). La fusion
publie. C'est le seul moment de la procédure qui touche une page publique.

---

## Étape 5 — vérifier la page réellement servie

Une à deux minutes après la fusion :

```bash
curl -s https://kyroz.app/legal.html | grep -o "Date de dernière mise à jour : [^<]*"
```

**Attendu :** `Date de dernière mise à jour : 26 août 2026`.

Puis les trois points qui manquaient :

```bash
curl -s https://kyroz.app/legal.html | grep -c -e Resend -e PostHog -e "18 ans"
```

**Attendu :** un nombre supérieur à 0 pour chacun. S'il rend encore la version de
juin, c'est le cache de Pages ou de Cloudflare — réessayer quelques minutes plus tard
avant de conclure à un échec.

---

## Étape 6 — empêcher que ça recommence

Tant que `KYROZ_SITE` n'est pas posé, `npm run gen:legal -- --check` **ignore le
site** et dit vert. C'est ce silence qui a laissé la page mentir deux mois.

Le contrôle complet, à lancer avant chaque soumission aux stores :

```bash
cd /Users/kevinberger/Kyroz_Code/kyroz-app && KYROZ_SITE=/Users/kevinberger/Kyroz_Site npm run gen:legal -- --check
```

**Attendu :** `= site  à jour`.

➡️ Le vrai correctif serait que ce contrôle tourne tout seul. Il ne peut pas vivre
dans `npm test` du dépôt de l'app : le clone du site n'existe pas sur toutes les
machines, et un test qui dépend d'un dossier absent est un test qui rougit à tort.
**Les deux pistes**, à trancher un jour : un `postversion` / script de pré-soumission
qui l'exige, ou une action GitHub dans `kyroz-site` qui régénère depuis le dépôt de
l'app. Aucune n'est faite.

---

## Ce que cette procédure ne couvre PAS

**La clé RevenueCat de production — et elle EST posée.** Vérifié le 2026-08-26 :
`eas env:list --environment production` rend un `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
non vide. Un build de production appelle donc `Purchases.configure()`, et RevenueCat,
Inc. (États-Unis) reçoit au minimum un identifiant d'app et des informations d'achat.

Le texte actuel parle d'« un prestataire spécialisé » — une CATÉGORIE, ce que le RGPD
art. 13-1-e autorise. Ce n'est donc pas faux. Mais `constants/legal.ts` porte sa
propre échéance, écrite le 2026-08-02 : « le jour où le contrat est signé : remplacer
« un prestataire spécialisé » par le nom, et AJOUTER le cadre du transfert hors UE
(clauses contractuelles types / Data Privacy Framework), exigé par l'art. 13-1-f et
qui ne peut se lire que dans le contrat ».

➡️ **Le choix technique n'est plus hypothétique — la clé est en production.** Ce qui
reste inconnu, et que seul le fondateur peut dire : le DPA RevenueCat est-il signé, et
sur quel cadre de transfert ? Tant que la réponse n'est pas lue dans le contrat, on
n'écrit rien : une politique de confidentialité n'est pas l'endroit où supposer.
**À trancher avant la mise en vente.**
