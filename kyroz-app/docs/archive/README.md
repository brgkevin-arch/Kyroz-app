# docs/archive/ — l'étagère des documents morts

> **Rien ici ne décrit l'état courant du projet.** Ne pas exécuter les plans qui s'y
> trouvent, ne pas citer leurs chiffres comme actuels, ne pas les traiter comme un
> reste-à-faire.
>
> État courant → `../../AGENTS.md`. Spec stable → `../../CLAUDE.md`.
> Photo du code → `../INVENTAIRE-CODE-2026-07-30.md`.

## Pourquoi cette étagère existe

Le 2026-07-30, dix documents vivaient au même niveau à la racine de `kyroz-app/`. Cinq
étaient périmés — mais **on ne pouvait le savoir qu'en les ouvrant**, parce que leur
statut réel était écrit à l'intérieur, vers la ligne 10. Deux d'entre eux étaient
activement trompeurs :

- un plan d'implémentation affichant **79 cases à cocher, 0 cochée**, alors que le
  travail était livré depuis six semaines ;
- un dossier de 304 Ko réclamant une validation diététicienne **écartée par décision du
  fondateur**, en contradiction directe avec `CLAUDE.md` §6.

## Contenu

| Fichier | Statut | Pourquoi il est mort |
|---|---|---|
| `2026-06-16-plan-refonte-recettes-adaptrecipe.md` | LIVRÉ | 79 tâches non cochées, toutes faites. `adaptRecipe.ts` existe, 314 recettes en catalogue. **Le piège principal.** |
| `2026-06-16-spec-refonte-recettes-soft-matching.md` | LIVRÉ | Design de la refonte ci-dessus, entièrement implémenté |
| `2026-06-18-brief-macros-calories.md` | RÉSOLU | Tous les points traités le 2026-06-18 ; ses valeurs ont depuis été remplacées par P0/P1 |
| `2026-07-28-audit-p1-mesures.md` | LIVRÉ | L'étape 3 qu'il arbitrait est livrée. Reste utile comme **trace des mesures** (tableau NEAT) |
| `2026-07-29-moteur-v2-corrections.md` | DOCUMENT D'HISTOIRE | 59 de ses 85 points divergent du code (mesuré, 2026-07-29) |
| `2026-08-15-synthese-kyroz-cote-utilisateur.md` | PÉRIMÉ | **6 sections sur 9 fausses en cinq jours** — deux parcours éteints le 18/08, l'offre passée de 3 à 2 piliers, la north star redéfinie le 20/08. Remplacé par `../../PRODUIT.md`, **sans date dans son nom** : c'est la date du fichier qui invitait à le croire figé alors qu'on continuait de le coller dans des briefs |
| `2026-07-29-validation-recettes.md` | SANS OBJET | Validation diététicienne écartée (`CLAUDE.md` §6). Figé : son script générateur est supprimé |
| `2026-08-06-procedure-body-fat-source.md` | FAITE | Migration jouée le 2026-08-06 (16ᵉ). Ce qui tourne en prod se lit dans `../../supabase/JOURNAL-MIGRATIONS.md`, pas ici |
| `2026-08-07-procedure-confirmation-email.md` | FAITE | E-mails d'authentification posés et **éprouvés en prod le 2026-08-09** (fiche A29) |
| `2026-08-07-procedure-meal-slots.md` | FAITE | Migration jouée le 2026-08-07 (17ᵉ) et vérifiée |
| `2026-08-10-brief-analytics-perimetre.md` | SANS OBJET | La mesure d'audience est **éteinte depuis le 2026-08-26** — la question qu'il pose n'existe plus |
| `2026-08-10-synthese-analytics-arbitrage.md` | SANS OBJET | Idem. ⚠️ Reste cité par `lib/__tests__/analyticsPerimetre.test.ts` comme **origine** d'une règle toujours appliquée (§6, aucune donnée de santé) — pas comme source courante |
| `2026-08-15-brief-banque-de-calories.md` | ARBITRÉ | Tranché le 2026-08-18 : banque sortie de Kyroz+, renommée, puis éteinte le même jour. Offre courante → `../../MONETISATION.md` |
| `2026-08-18-inventaire-banque-et-hors-plan.md` | ARBITRÉ | Écrit *avant* arbitrage pour que rien ne parte sans décision. Les deux parcours sont éteints depuis le 2026-08-18 |
| `2026-08-18-procedure-activation-posthog.md` | **DÉFAITE** | Exécutée le 2026-08-18, **annulée le 2026-08-26**. 🛑 Ne pas la rejouer pour « remettre en état » : l'état voulu est *éteint* |
| `2026-08-18-procedure-domaine-legal.md` | SANS OBJET | Se déclarait déjà close le 2026-08-18 (« rien à faire ») — elle n'était restée à la racine que faute d'étagère |
| `2026-08-26-relecture-textes.md` | FAITE | Sections 1 à 4 arbitrées et faites, section 5 hors périmètre. Reste cité par `lib/__tests__/textesUniques.test.ts` comme origine de la règle |
| `2026-08-27-procedure-suppression-revenuecat.md` | CLOSE | Six étapes faites et vérifiées le 2026-08-27 (constat 01-03, fiche A41) |

## La règle, pour ne pas refaire le désordre

Un document qui devient une trace part **ici**, avec :

1. un **préfixe de date** dans le nom de fichier — un doc sans date ne dit jamais qu'il
   est vieux ;
2. un **en-tête `ARCHIVÉ`** en première ligne, qui dit en une phrase *pourquoi* il est
   mort et *où* est la vérité courante.

Ce qui est vivant reste à la racine de `kyroz-app/` et doit être listé dans la « Carte
des docs » en tête d'`AGENTS.md`. Si un doc n'est ni dans cette carte ni dans cette
étagère, c'est que quelqu'un a oublié de trancher.

## Le trou qui a rouvert le désordre — bouché le 2026-08-30

**Le 2026-08-30, ce test de dépistage a été rejoué : 22 documents (259 Ko) n'étaient ni
dans la carte, ni ici.** Onze d'entre eux sont descendus sur cette étagère ce jour-là.

La cause n'était pas la négligence, c'est que **la règle n'avait que deux cases pour
trois états**. Une procédure en cours n'est ni vivante pour toujours, ni morte : elle
n'avait donc aucun endroit où aller, et restait à la racine — où elle devenait
indiscernable d'une spec. C'est exactement le mode de panne que cette étagère avait été
créée pour fermer.

➡️ **Il y a désormais une troisième case : `../procedures/`** — les procédures fondateur
en cours, celles qui se déroulent une étape à la fois. Quand la dernière étape est faite,
la procédure descend **ici**, avec sa date en préfixe et son en-tête `ARCHIVÉ`.

**Le cycle complet, sans case manquante :**

```
carte des docs (AGENTS.md)   ← doc vivant, relu, jamais daté dans son nom
      docs/procedures/       ← procédure EN COURS, une étape à la fois
      docs/archive/          ← trace : daté en préfixe + en-tête ARCHIVÉ
```
