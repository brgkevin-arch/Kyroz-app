# docs/procedures/ — les procédures EN COURS

> **Ce qui est ici n'est ni une spec, ni une trace : c'est du travail en cours.**
> Une procédure décrit des gestes que le dépôt ne peut pas faire seul — un accès Apple,
> un dashboard Supabase, une décision qui engage de l'argent ou une identité.

## La convention, et pourquoi elle tient

**Une étape à la fois.** Chaque étape dit ce que tu dois **voir** à la fin. Tant que tu ne
le vois pas, on ne passe pas à la suivante — c'est ce contrôle qui évite de chercher un
défaut dans le code alors qu'il est chez Apple.

**Une procédure n'est pas une source, c'est une carte.** Tout ce qui dépend d'un tiers
(Apple, Supabase, Resend) se **relit dans son interface**. Ce dépôt a déjà annoncé un
blocage qui n'existait plus, et une case cochée ici dit que la commande a été *écrite*,
pas qu'elle a été *lancée*.

## Ce qui s'y trouve aujourd'hui

| Procédure | État | Ce qu'elle débloque |
|---|---|---|
| `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md` | **EN COURS** | Mettre Kyroz+ en vente. 🔴 Son étape 10 (la date de lancement) se pose **en dernier**, après le bac à sable *et* après que la revue App Store est acquise |
| `PROCEDURE-2026-08-27-bac-a-sable.md` | **EN COURS** | Éprouver l'achat en bac à sable Apple avant la première vente réelle |
| `PROCEDURE-MAJ-LEGAL-SITE.md` | **REJOUABLE** | Remettre `kyroz.app/legal.html` à jour. Sans date : elle se rejoue à chaque évolution du texte légal |

## Quand une procédure est finie

Elle descend dans **`../archive/`**, avec :

1. un **préfixe de date** dans le nom (`2026-08-27-procedure-…`) — un doc sans date ne dit
   jamais qu'il est vieux, et l'étagère se lit alors dans l'ordre ;
2. un **en-tête `ARCHIVÉ`** en première ligne, qui dit en une phrase *pourquoi* elle est
   close et *où* est la vérité courante.

> ⚠️ **Une procédure « rejouable » ne descend pas.** `PROCEDURE-MAJ-LEGAL-SITE.md` n'a pas
> de date dans son nom précisément parce qu'elle se relance : elle reste ici tant que le
> geste qu'elle décrit peut se refaire.

## Pourquoi cette étagère existe (2026-08-30)

Elle est née d'un trou dans la règle. La convention du 2026-07-30 n'avait que **deux**
cases — *vivant à la racine* et *mort dans `archive/`* — pour **trois** états. Une
procédure en cours n'entrait dans aucune : elle restait donc à la racine de `kyroz-app/`,
où elle devenait indiscernable d'une spec permanente.

Résultat mesuré le 2026-08-30 : **22 documents (259 Ko) n'étaient ni dans la carte des
docs ni sur l'étagère**, dont quatre procédures à la racine — deux vivantes, deux closes
depuis des semaines. Le cycle complet est décrit dans `../archive/README.md`.
