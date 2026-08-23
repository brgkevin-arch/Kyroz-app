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
| `male-models.png` | les 6 paliers masculins (**10 / 15 / 20 / 25 / 30 / 35 %**), style facetté « low-poly », planche recalibrée |
| `female-models.png` | les 6 paliers féminins — **18 / 23 / 28 / 33 / 38 / 43 %** |

🔴 **LES PALIERS FÉMININS NE SONT PAS LES MÊMES, et cette table disait le contraire**
(corrigé le 2026-08-23). Elle écrivait « idem pour les silhouettes féminines » sous une
ligne annonçant 10–35 % : la source de vérité est `components/BodyFatPicker.tsx::LEVELS`,
qui sert **18 à 43 %** aux femmes. À physiologie égale, une femme porte structurellement
plus de masse grasse — 20 % n'y est pas « tonique » mais très athlétique. ➡️ Quiconque
aurait commandé une nouvelle planche d'après cette ligne aurait obtenu un sélecteur
féminin faux **sur toute sa plage**, sans que rien ne le signale : les images auraient
l'air correctes, seuls les %MG servis au moteur seraient décalés d'un cran et demi.

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

---

## 🔴 CE QU'IL FAUT EXIGER DE LA PROCHAINE GÉNÉRATION (2026-08-12)

**À refaire AVANT la mise en ligne** — décision fondateur. Les 12 images servies
portent une « corne » au-dessus des épaules, visible sur les six cartes du
sélecteur, et elle se lit comme un défaut de modèle 3D.

**Le défaut est dans la SOURCE, pas dans la découpe, et c'est mesuré.** Sur les
planches actuelles, les facettes ombrées du cou et des trapèzes valent **exactement
le gris du fond** — écart de 1 à 3 par canal sur 255. Deux conséquences :

- aucun détourage par **couleur** ne peut les séparer (c'est la même couleur) ;
- le détourage par **connexité** (diffusion depuis les bords, meilleur en théorie)
  échoue aussi : mesuré aux tolérances 4, 6, 8 et 10, il fuit dans le corps par le
  haut des épaules à chacune. **Il n'existe pas de réglage qui marche.**

➡️ **La seule demande qui compte pour un nouveau jeu d'assets :**

| exigence | pourquoi |
|---|---|
| **fond contrasté** (vert, magenta, noir) ou **PNG déjà transparent** | c'est le point unique qui rend le détourage possible ; un fond gris clair derrière un modèle gris clair est indécoupable |
| **une planche par sexe**, 6 paliers **propres à chaque sexe** (H 10/15/20/25/30/35 · F 18/23/28/33/38/43) | le sélecteur en sert 12, et deux styles dans la même grille est le défaut qu'on corrige partout ailleurs. ⚠️ Les paliers se relisent dans `BodyFatPicker.tsx::LEVELS`, jamais ici |
| **même cadrage, même échelle, même socle** d'un palier à l'autre | un corps à 35 % doit être PLUS LARGE qu'un corps à 10 % — c'est la seule chose que ce sélecteur montre. Si chaque rendu est recadré pour remplir son image, l'information disparaît |
| **pas de titre, pas de libellés, pas de watermark** dans l'image | les libellés viennent du code (`BodyFatPicker`), et les paillettes du coin bas-droit des planches actuelles sont un artefact à découper autour |

**Une fois les nouvelles planches déposées ici**, la découpe est automatisée :

```bash
python3 scripts/decouper-silhouettes.py            # aperçu, n'écrit rien
python3 scripts/decouper-silhouettes.py --ecrire   # remplace les 12 images
```

Ce script mesure lui-même la bande et les six colonnes (rien n'est écrit en dur),
pose un canevas commun, aligne les socles et garde **une seule échelle** pour les
douze. Il compose aussi un aperçu sur le vrai fond de carte sombre — le liseré
clair d'un mauvais détourage ne se voit sur aucun fond blanc.
