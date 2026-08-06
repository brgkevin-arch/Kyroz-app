# Brief — jeu d'icônes Kyroz

Je veux un jeu d'icônes pour **Kyroz**, une app mobile de plans repas. Elles doivent
remplacer des émojis qui traînent encore dans l'interface.

## La direction artistique, en une ligne

Sobre, monochrome, palette système iOS. Fond noir pur en sombre / `#F2F2F7` en clair.
**Aucune couleur dans les icônes** : elles reçoivent leur couleur du thème.

## La contrainte technique, non négociable

Les icônes existantes sont dessinées à la main dans ce gabarit exact. Les nouvelles
doivent appartenir à la **même famille**, sinon elles jureront à côté :

- `viewBox="0 0 27 27"`
- trait **1,7** (2,2 en état actif) — `stroke-width`
- `stroke-linecap="round"`, `stroke-linejoin="round"`
- **`fill="none"`** — tout est en trait, jamais en aplat
- une seule couleur, passée en variable (pas de `#000` en dur)
- lisible à **18 px** comme à 30 px

## Les cinq icônes qui existent déjà — c'est le style à suivre

```svg
<!-- Plan — un calendrier -->
<Rect x="3.6" y="5.2" width="19.8" height="18" rx="4.6" />
<Path d="M3.6 10.6h19.8" />

<!-- Courses — un panier -->
<Rect x="5" y="8.6" width="17" height="14.6" rx="4" />
<Path d="M10.2 9.2V7.4a3.3 3.3 0 0 1 6.6 0v1.8" />

<!-- Frigo — un réfrigérateur -->
<Rect x="6" y="4" width="15" height="19" rx="4" />
<Path d="M6 11.4h15M9.6 14.6v3" />

<!-- Recettes — un bol -->
<Path d="M4.4 12.4h18.2a9.1 9.1 0 0 1-18.2 0Z" />
<Path d="M8 8.4h11" />

<!-- Profil — buste -->
<Circle cx="13.5" cy="10" r="4.1" />
<Path d="M5.8 22.4c1.5-3.9 4.3-5.9 7.7-5.9s6.2 2 7.7 5.9" />
```

Remarque sur ces cinq : les rayons sont généreux (`rx` 4 à 4,6), les formes sont
fermées et simples, il n'y a jamais plus de 2 ou 3 tracés par icône. C'est ça, la
signature.

## Ce dont j'ai besoin

Chaque ligne dit **ce que l'icône signifie**, pas quel émoji la remplace — dessine le
sens, pas le pictogramme d'origine.

| Sens | Où ça s'affiche |
|---|---|
| Avertissement | un repas est un peu pauvre en protéines |
| Information | un repas est légèrement au-dessus/dessous de la cible |
| Donnée qui reste sur le téléphone | photos de progression, mention de confidentialité |
| Repas géré par l'utilisateur | une carte de repas que Kyroz ne planifie pas |
| Protection | la série est protégée après un jour manqué |
| Durée de préparation | fiche recette |
| Hydratation | carte de suivi de l'eau |
| Pesée | bandeau « c'est le moment de te peser » |
| Repas / assiette | bandeau de bilan, état vide |
| Petit-déjeuner | récap du premier plan |
| Déjeuner | récap du premier plan |
| Collation | récap du premier plan |
| Fibres | fiche recette |
| Objectif daté | carte d'objectif (poids de départ → poids visé) |
| Conseil | suggestion de réglage de macros |
| Anniversaire | célébration, une fois l'an |
| Réussite | liste de courses terminée, premier plan prêt |

## Ce que je veux recevoir

Une page qui montre **tout le jeu sur une grille**, en sombre et en clair, à deux
tailles (18 px et 30 px) — pour vérifier qu'elles tiennent en petit.

Et surtout : le **SVG de chaque icône**, en tracés bruts, dans le gabarit ci-dessus.
C'est ce que je vais recopier dans le code ; une image ne me sert à rien.

## À éviter

- Les aplats et les dégradés — tout est en trait.
- Les icônes « pleines » pour l'état actif : chez nous l'état actif **épaissit le
  trait**, il ne change pas la forme.
- Les métaphores trop chargées : à 18 px, trois détails deviennent une tache.
