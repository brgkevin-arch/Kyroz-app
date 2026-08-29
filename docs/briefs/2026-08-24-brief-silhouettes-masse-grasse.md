# Brief — les 12 silhouettes du sélecteur de masse grasse (A32)

> Document autonome, à donner à une IA génératrice d'images. Il ne suppose aucune
> connaissance de Kyroz.
>
> **Ce qu'on veut en sortie : DEUX images.** Une planche masculine, une planche
> féminine, chacune montrant **6 corps côte à côte**. Rien d'autre.

---

## 1. À quoi ça sert (et pourquoi la précision compte)

Dans une app de nutrition, on demande à la personne d'estimer son pourcentage de
masse grasse en **tapant sur le corps qui ressemble le plus au sien**. Six choix par
sexe.

Ce chiffre pilote ensuite le calcul de ses besoins caloriques. **Une silhouette qui
ment de deux crans fait manger 200 kcal/jour à côté** — donc ces images ne sont pas
de la décoration, ce sont des unités de mesure.

➡️ Conséquence directe sur ce qu'on demande : **la seule information que porte ce
sélecteur, c'est la différence de corpulence d'un corps au suivant.** Tout ce qui
brouille cette comparaison est un défaut, même si l'image est belle.

## 2. Pourquoi on les refait

Les images actuelles portent une **« corne » au-dessus des épaules**, visible sur les
six cartes. Ce n'est pas un défaut de découpe : sur les planches d'origine, les
facettes ombrées du cou valent **exactement le gris du fond** (écart de 1 à 3 par
canal sur 255). Aucun détourage ne peut séparer deux choses de la même couleur, et
ça a été mesuré à quatre tolérances différentes.

➡️ **C'est le point n°1 du brief : le fond doit être franchement différent du sujet.**

---

## 3. Les contraintes non négociables

| # | Exigence | Pourquoi, concrètement |
|---|---|---|
| 1 | **Fond uni magenta pur `#FF00FF`**, parfaitement plat, sans dégradé ni ombre portée | Aucune peau, aucun vêtement, aucune ombre ne tombe sur cette couleur. C'est ce qui rend le détourage automatique possible. *(Un PNG déjà transparent convient aussi, si l'outil sait en produire un vraiment propre.)* |
| 2 | **UNE seule image par sexe**, les 6 corps côte à côte, alignés sur la même ligne de sol | Générés séparément, six corps ne sont jamais à la même échelle. La comparaison — la seule chose qu'on montre — disparaît. |
| 3 | **Même échelle, même cadrage, même distance de caméra** pour les 6 | Si chaque corps est recadré pour remplir sa case, un corps à 35 % paraît aussi large qu'un corps à 10 %. **C'est l'erreur qui tue le sélecteur.** La taille (hauteur) doit rester **identique** ; c'est la **largeur** qui change. |
| 4 | **Aucun texte** : pas de titre, pas de pourcentage, pas de numéro, pas de watermark, pas de légende | Les libellés sont écrits par l'app, par-dessus. Un texte incrusté serait à découper à la main. |
| 5 | **Le même personnage** du premier au dernier, vu de **face**, bras légèrement écartés du corps, jambes droites | Six personnes différentes = six morphologies différentes = on ne compare plus rien. |
| 6 | **Éclairage identique et neutre**, sans ombre portée au sol | Une ombre au sol est du contenu non-magenta : elle serait découpée avec le corps. |

## 4. Les 12 corps, un par un

⚠️ **Les paliers ne sont PAS les mêmes pour les hommes et pour les femmes.** À
physiologie égale, une femme porte structurellement plus de masse grasse. Se tromper
ici rendrait le sélecteur féminin faux sur toute sa plage.

### Planche masculine — de gauche à droite

| Position | %MG | Ce que le corps doit montrer |
|---|---|---|
| 1 | **10 %** | Abdominaux très dessinés, très sec, veines visibles sur les bras |
| 2 | **15 %** | Abdominaux visibles, athlétique, taille marquée |
| 3 | **20 %** | Silhouette tonique, abdominaux devinés mais plus dessinés |
| 4 | **25 %** | Peu de définition musculaire, ventre légèrement proéminent |
| 5 | **30 %** | Ventre rond, formes marquées, taille épaissie |
| 6 | **35 %** | Surpoids visible, ventre large, épaules et bras empâtés |

### Planche féminine — de gauche à droite

| Position | %MG | Ce que le corps doit montrer |
|---|---|---|
| 1 | **18 %** | Très athlétique, abdominaux visibles, très peu de gras |
| 2 | **23 %** | Tonique, galbe défini, taille marquée |
| 3 | **28 %** | Silhouette équilibrée, formes douces, ventre plat sans définition |
| 4 | **33 %** | Formes plus marquées, hanches et cuisses plus pleines |
| 5 | **38 %** | Rondeurs visibles, ventre arrondi |
| 6 | **43 %** | Surpoids visible, silhouette nettement plus large |

**La progression doit être LISIBLE mais RÉGULIÈRE** : un cran ne doit ni passer
inaperçu, ni faire un saut brutal. Quelqu'un qui hésite entre deux cases doit hésiter
parce que son corps est entre les deux, pas parce que les images se ressemblent.

## 5. Le style

- **Rendu 3D neutre, lisse, non photoréaliste** — un mannequin, pas une personne.
- **Teinte uniforme claire** (gris clair ou blanc cassé), **sans couleur de peau**,
  sans cheveux détaillés, **sans visage** (ou un visage lisse et sans traits).
  Trois raisons : ça évite de désigner un type de corps comme « la » norme, ça évite
  la vallée de l'étrange, et ça marche sur le fond sombre de l'app.
- **Sous-vêtements de sport neutres et unis**, de la même teinte que le corps :
  brassière et short pour les femmes, short pour les hommes. Rien de suggestif —
  c'est une charte médicale, pas une image de mode.
- **Pas de pilosité, pas de tatouage, pas d'accessoire, pas de chaussures.**

## 6. Les prompts, prêts à coller

> Rédigés en anglais : tous les générateurs y répondent mieux. Générer **une planche
> à la fois**, et refaire la génération entière plutôt que retoucher un seul corps —
> un corps régénéré seul ne revient jamais à la même échelle.

**Planche masculine**

```
A single wide image showing six male 3D mannequin figures standing side by side in one
row, front view, arms slightly away from the body, legs straight, all feet aligned on
the same invisible ground line.

All six figures are the SAME character with the SAME height, the SAME camera distance
and the SAME neutral lighting — only body fat changes from left to right. Left to
right: very lean with sharply defined abs (10% body fat), athletic with visible abs
(15%), toned without definition (20%), soft with a slightly rounded belly (25%), clearly
round belly and thicker waist (30%), visibly overweight with a wide midsection (35%).

Style: smooth matte 3D render, uniform light grey material, no skin tone, featureless
head, no hair, plain matching grey sport shorts, no shoes.

Background: flat pure magenta #FF00FF, perfectly uniform, no gradient, no shadow, no
ground shadow. No text, no numbers, no labels, no watermark anywhere in the image.
```

**Planche féminine**

```
A single wide image showing six female 3D mannequin figures standing side by side in one
row, front view, arms slightly away from the body, legs straight, all feet aligned on
the same invisible ground line.

All six figures are the SAME character with the SAME height, the SAME camera distance
and the SAME neutral lighting — only body fat changes from left to right. Left to
right: very athletic with visible abs (18% body fat), toned with a defined waist (23%),
balanced with soft curves and a flat stomach (28%), fuller hips and thighs (33%),
visibly rounded figure (38%), visibly overweight with a notably wider silhouette (43%).

Style: smooth matte 3D render, uniform light grey material, no skin tone, featureless
head, no hair, plain matching grey sport bra and shorts, no shoes.

Background: flat pure magenta #FF00FF, perfectly uniform, no gradient, no shadow, no
ground shadow. No text, no numbers, no labels, no watermark anywhere in the image.
```

## 7. Comment juger le résultat AVANT de me le donner

Cinq contrôles, dans cet ordre. Le premier qui échoue condamne la planche — on
régénère, on ne rattrape pas.

1. **Aligne les six têtes.** Elles doivent être à la même hauteur. Si l'une dépasse,
   les corps ne sont pas à la même échelle et la comparaison est fausse.
2. **Regarde les six ventres de gauche à droite.** La progression doit être continue.
   Deux corps identiques côte à côte, ou un saut brutal, condamnent la planche.
3. **Cherche du texte.** Un pourcentage incrusté, une signature, un numéro : refusé.
4. **Regarde autour du cou et des épaules.** Le fond magenta doit être franc partout,
   sans halo ni dégradé. C'est exactement là que le jeu actuel a échoué.
5. **Vérifie qu'il y a bien SIX corps**, pas cinq ni sept — les générateurs en ajoutent
   ou en retirent volontiers.

## 8. Ce qui se passe ensuite

Tu déposes les deux fichiers dans `kyroz-app/assets/bodyfat/_source/`, nommés
exactement `male-models.png` et `female-models.png`, et le reste est une commande :

```bash
python3 scripts/decouper-silhouettes.py
```

Elle mesure elle-même la bande et les six colonnes, détoure, pose un canevas commun,
aligne les socles, garde une seule échelle pour les douze, et compose un aperçu **sur
le vrai fond sombre de l'app** — un mauvais détourage ne se voit sur aucun fond blanc.
Rien n'est écrit tant qu'on n'ajoute pas `--ecrire`.

Format de sortie : 12 PNG de **220 × 462**. Les planches d'entrée peuvent être bien
plus grandes — les actuelles font 1407 × 768, et plus grand vaut mieux.

---

## Annexe — deux pistes déjà mesurées, à ne pas re-explorer

- **« Mieux régler le seuil de détourage »** : fermé. Le fond et les ombres du cou ont
  la même couleur à 1–3 près sur 255 ; la diffusion depuis les bords fuit dans le corps
  aux tolérances 4, 6, 8 **et** 10. Aucun réglage ne marche — c'est la source qu'il faut
  changer, ce que fait ce brief.
- **Servir des vignettes sur fond gris plat au lieu de détourer** : techniquement propre
  et vérifié en aperçu, mais c'est un changement de direction artistique (un rectangle
  clair dans une carte sombre). Écarté par le fondateur, qui préfère de vrais assets.
