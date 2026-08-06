# Silhouettes du sélecteur de masse grasse — les sources

Ce dossier contient les **planches d'origine**, pas ce que l'app affiche. Les images
réellement servies sont d'un cran au-dessus : `assets/bodyfat/male-1.png` …
`male-6.png` et `female-1.png` … `female-6.png`, découpées depuis ces planches et
redimensionnées (220 × 462).

⚠️ Ce fichier existe parce que la distinction n'était visible **qu'en ouvrant les
images**. Trois fichiers ont traîné non versionnés pendant plusieurs jours, et il a
fallu les regarder un par un pour comprendre lesquels étaient servis et lesquels ne
l'étaient pas. Un dossier d'assets qui demande une inspection visuelle pour être
compris est un dossier qui sera mal rangé la fois suivante.

## Ce qui est SERVI aujourd'hui

| fichier | quoi |
|---|---|
| `male-models.png` | les 6 paliers masculins (≈10 / 15 / 20 / 25 / 30 / +35 %), style facetté « low-poly », planche recalibrée |
| `female-models.png` | idem pour les silhouettes féminines |

C'est de ces deux planches que viennent les 12 images du sélecteur.

## Ce qui est CANDIDAT — `v2-candidate/`

Une **seconde génération**, plus lisse et plus détaillée, produite le 2026-08-06.
**Elle n'est adoptée nulle part** : aucun fichier de `app/`, `components/`, `lib/`
ni `constants/` ne la référence, et le sélecteur continue de servir la v1.

| fichier | quoi |
|---|---|
| `male-models.png` | la planche annotée des 6 paliers, fond transparent, descriptions en anglais |
| `male-10pct.png` … `male-35pct.png` | les 6 rendus individuels tirés de cette planche, fond clair |

Ce qui manque pour l'adopter, si on décide de le faire : **le pendant féminin**
(seul le masculin a été généré), un détourage sur fond transparent pour les six
rendus individuels, et le redimensionnement au gabarit servi.

⚠️ **Ne pas adopter à moitié.** Servir des silhouettes masculines d'une génération
et féminines de l'autre ferait deux styles dans le même sélecteur — c'est-à-dire
exactement ce qu'on corrige partout ailleurs dans la DA.
