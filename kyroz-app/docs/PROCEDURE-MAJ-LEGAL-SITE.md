# Remettre `kyroz.app/legal.html` à jour

> **Une étape à la fois.** Chaque étape a une commande et un résultat attendu.
> Ne passe à la suivante que si le résultat correspond.
> Écrit le 2026-08-26, après avoir mesuré la dérive.

---

## Pourquoi

`https://kyroz.app/legal.html` est **l'URL de politique de confidentialité exigée par
l'App Store et Google Play**. Elle vit dans un dépôt séparé (`brgkevin-arch/kyroz-site`),
donc elle échappe au contrôle automatique du dépôt de l'app — et elle a dérivé.

Mesuré le 2026-08-26 :

| point | page en ligne | ce que dit la source |
|---|---|---|
| Date de mise à jour | **15 juin 2026** | 26 août 2026 |
| **Resend** — sous-traitant depuis le 2026-08-09 | **absent** | déclaré |
| **PostHog** — actif depuis le 2026-08-18 | **absent** | déclaré |
| Âge minimum annoncé | **16 ans** | **18 ans** (`lib/safety.ts::MIN_AGE`) |
| Tarif bloqué à la souscription (CGU) | absent | présent |
| Volume | 30 paragraphes, 20 sections | **49 paragraphes, 21 sections** |

Deux sous-traitants qui traitent des données réelles ne sont pas déclarés sur la page
publique, et elle promet un garde-fou d'âge dans une autre valeur que celle appliquée
par l'app.

**Ce n'est pas une négligence de rédaction** : le fichier est un miroir qu'on
régénère, et rien ne l'a régénéré depuis juin parce qu'il vit ailleurs.

---

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
- Il est **en retard de 3 commits** sur `origin/main` au moment où ce document est
  écrit. L'étape 1 n'est donc pas facultative.
- 🔴 **Ne jamais éditer `legal.html` à la main.** La source est
  `kyroz-app/constants/legal.ts`. Une modification manuelle sera écrasée à la
  prochaine génération, sans le dire.

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

**La clé RevenueCat de production.** Elle vit dans les secrets EAS, pas dans le dépôt.
Si elle est posée dans le build, la politique — celle de l'app comme celle du site —
devient **incomplète** : il faut nommer le prestataire d'abonnement et déclarer le
cadre du transfert hors UE (RGPD art. 13-1-f). Aujourd'hui le texte parle d'« un
prestataire spécialisé », ce que l'art. 13-1-e autorise tant qu'aucun contrat n'est
signé. Cette question se tranche avant la mise en vente, pas ici.
