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

## La règle, pour ne pas refaire le désordre

Un document qui devient une trace part **ici**, avec :

1. un **préfixe de date** dans le nom de fichier — un doc sans date ne dit jamais qu'il
   est vieux ;
2. un **en-tête `ARCHIVÉ`** en première ligne, qui dit en une phrase *pourquoi* il est
   mort et *où* est la vérité courante.

Ce qui est vivant reste à la racine de `kyroz-app/` et doit être listé dans la « Carte
des docs » en tête d'`AGENTS.md`. Si un doc n'est ni dans cette carte ni dans cette
étagère, c'est que quelqu'un a oublié de trancher.
