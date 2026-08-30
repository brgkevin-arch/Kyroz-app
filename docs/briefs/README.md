# docs/briefs/ — les briefs pour Claude chat

> **Un brief est un document autonome, écrit pour être collé tel quel dans une
> conversation avec un modèle qui n'a AUCUN accès au code.** Il n'est ni une spec, ni un
> reste-à-faire : c'est un relevé, fait à une date, pour poser une question dehors.

## La règle qui les rend utiles — et dangereux

Un brief **fige l'état du code au jour où il est écrit**. C'est sa qualité (il permet de
raisonner sans le dépôt) et son piège : quelques semaines plus tard, il décrit une app qui
n'existe plus, tout en ayant l'air d'être à jour.

➡️ D'où la convention : **une date en préfixe dans le nom du fichier.** Le dépôt a déjà
payé pour l'avoir apprise — un document produit sans date a continué d'être collé dans des
briefs alors que six de ses neuf sections étaient fausses
(`kyroz-app/docs/archive/2026-08-15-synthese-kyroz-cote-utilisateur.md`).

> ⚠️ **Ne jamais coller un brief daté comme s'il décrivait l'app d'aujourd'hui.** Pour ça,
> le document vivant et sans date est `kyroz-app/PRODUIT.md` — c'est LUI qu'on emmène
> dehors quand on parle du produit actuel.

## Ce qui s'y trouve

La colonne de droite dit **ce que le dépôt sait**, pas ce qu'on suppose. « Aucune fiche ne
le cite » est une information, pas un oubli à combler après coup.

| Brief | Ce qu'il demandait | Ce que le dépôt en dit |
|---|---|---|
| `2026-08-07-brief-claude-design-icones.md` | Un jeu d'icônes pour remplacer les émojis restants | **Aucune fiche d'`AGENTS.md` ne le cite.** Le sujet, lui, a avancé (fiche E22, passe émoji) — mais le lien avec ce brief n'est écrit nulle part |
| `2026-08-10-brief-apple-motion.md` | Le mouvement façon Apple : ressorts, gestes, interruptions | **Aucune fiche ne le cite.** L'axe MOUVEMENT existe (fiche E35, 2026-08-10, même jour) ; la filiation est probable, elle n'est pas écrite |
| `2026-08-10-brief-profil-et-parametres.md` | Relevé du Profil et des Paramètres, écran par écran, mesuré le 2026-08-10 | Cité par la fiche **A37** comme source sur les libellés NEAT, aux côtés de `kyroz-app/lib/tdee.ts` |
| `2026-08-24-brief-silhouettes-masse-grasse.md` | Les 12 silhouettes du sélecteur de masse grasse | Cité par la fiche **A32** — les planches ont été générées à partir de lui. ⚠️ A32 est datée du **2026-08-23**, ce brief a été committé le **24** : le document a suivi le travail, pas l'inverse |

## Où va la suite

Un brief ne se met **pas** à jour : on en refait un, avec une date neuve. Celui d'avant
reste ici comme trace de la question telle qu'elle se posait ce jour-là.

Comparer une maquette rendue par Claude Design avec l'app → `../comparer-maquette.md`.
