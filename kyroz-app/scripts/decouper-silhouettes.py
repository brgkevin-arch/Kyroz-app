#!/usr/bin/env python3
"""Redécoupe les 12 silhouettes du sélecteur de masse grasse depuis les planches sources.

    python3 scripts/decouper-silhouettes.py            # aperçu seul, n'écrit RIEN
    python3 scripts/decouper-silhouettes.py --ecrire   # remplace assets/bodyfat/*.png

Dépend de Pillow uniquement (`python3 -m pip install pillow`). Rien n'entre dans
package.json : c'est un outil d'ATELIER, lancé à la main quand les sources changent,
pas une étape de build.

🔴 IL N'ÉCRIT RIEN SANS `--ecrire`, ET CE N'EST PAS DE LA PRUDENCE DE PRINCIPE :
sur les planches d'AUJOURD'HUI, sa sortie est PIRE que les images en service (voir
ci-dessous). Un script d'assets qui écrase silencieusement douze fichiers servis
est un piège ; celui-ci montre d'abord, il n'écrit que si on le lui demande.

────────────────────────────────────────────────────────────────────────────────
CE QUE CE SCRIPT A ÉTABLI, ET QUI VAUT PLUS QUE SON CODE (mesuré le 2026-08-12)

Les 12 images servies portent une « corne » au-dessus des épaules : le détourage a
mangé un morceau du cou et des trapèzes. Le réflexe est d'accuser la tolérance du
seuil et de la régler mieux.

🔴 C'EST IMPOSSIBLE, ET LA MESURE LE DIT. Sur `male-models.png`, les facettes
OMBRÉES du cou et des épaules valent exactement le gris du fond — écart de **1 à 3
par canal sur 255** (relevé : y=238 x=165 → écart 2 ; y=190, toute la ligne → 1 à 3).
Aucun critère de COULEUR ne peut séparer deux choses de la même couleur.
Le critère de CONNEXITÉ (remplissage par diffusion depuis les bords, au lieu d'un
seuil global) est meilleur en théorie et échoue ici aussi : mesuré à quatre
tolérances — 4, 6, 8, 10 — le remplissage fuit dans le corps par le haut des
épaules à CHACUNE (1 410 pixels dès la tolérance 4). Il n'existe pas de réglage.

➡️ **CE QU'IL FAUT DEMANDER À LA PROCHAINE GÉNÉRATION D'ASSETS** — c'est la vraie
conclusion, et elle est dans `_source/README.md` : des rendus sur un fond
**contrasté** (ou déjà transparents). Le fond gris clair est le défaut d'origine,
et il est dans la SOURCE, pas dans la découpe.

⚠️ Deuxième défaut, invisible sur fond clair : les pixels de bord sont un MÉLANGE
du modèle et du gris du fond. Gardés tels quels sur une carte sombre, ils dessinent
un liseré clair autour de la figure. D'où la décontamination
(`C = (mélange − (1−α)·fond) / α`) — et d'où l'aperçu, qui compose sur le VRAI fond
de carte sombre. Une vérification sur fond blanc n'aurait rien montré.

ℹ️ Ce qui, dans ce fichier, reste bon quelles que soient les planches : la
détection de la bande et des six colonnes (mesurée, jamais écrite en dur), le
canevas commun, l'alignement des socles et l'échelle unique. C'est ce qu'on
reprendra le jour où les sources seront correctes.
"""

import sys
from collections import deque
from PIL import Image

SOURCE = 'assets/bodyfat/_source'
SORTIE = 'assets/bodyfat'
SEXES = ('male', 'female')

# Tolérances, en écart maximal par canal vis-à-vis du gris de fond.
#
# 🔴 `T_DIFFUSION` EST VOLONTAIREMENT BAS, ET C'EST LE RÉGLAGE QUI COMPTE. À 26,
# mesuré, le remplissage FUIT dans le modèle par le haut des épaules — elles sont
# claires, donc à moins de 26 du fond — et mange le cou et les trapèzes : le même
# défaut qu'on corrige, en pire. Le remplissage ne sert qu'à désigner le fond
# CERTAIN ; c'est la dilatation ci-dessous qui va chercher le bord.
T_DIFFUSION = 10   # « c'est sûrement du fond » — conservateur par construction
RAYON_BORD = 4     # de combien de pixels on étend ce fond certain pour traiter le liseré
T_OPAQUE = 6       # en deçà : franchement du fond (α = 0)
T_PLEIN = 22       # au-delà : franchement du modèle (α = 255) ; entre les deux, rampe

MARGE = 14         # points de respiration autour de la figure, dans le canevas final

# 🔴 SEUIL DE BASCULE ENTRE DEUX MÉTHODES DE DÉTOURAGE — ajouté le 2026-08-23, et
# c'est ce fichier qui l'annonçait : « ce qu'on reprendra le jour où les sources
# seront correctes ». Les nouvelles planches sont sur MAGENTA, plus sur gris clair,
# et la rampe d'origine y produit un liseré rose — mesuré, **5,0 % des pixels du
# sujet teintés, pire écart 131 sur 255**, criant sur la carte sombre.
#
# **Pourquoi la rampe échoue sur un fond coloré** : elle mesure la part de fond par
# l'ÉCART GLOBAL au fond. Un pixel de bord mélangé moitié-moitié avec du magenta est
# à ~127 du fond, donc bien au-delà de `T_PLEIN` (22) — le script le déclare « du
# modèle », le garde opaque, et conserve sa teinte rose. La règle « être près du bord
# ne suffit pas, il faut en avoir la couleur » est juste quand le fond est gris ; elle
# n'a plus de sens quand fond et sujet ne partagent aucune couleur.
#
# ➡️ Sur un fond coloré, la part de fond ne se lit pas dans l'écart mais dans la
# **CHROMATICITÉ**. Le sujet est un mannequin gris (max−min ≈ 0) ; le fond est saturé
# (max−min = 255). Un pixel `P = α·S + (1−α)·F` avec S gris a donc
# `chroma(P) = (1−α)·chroma(F)`, d'où **α = 1 − chroma(P)/chroma(F)** — exact, et sans
# aucun seuil à régler à la main.
# ⚠️ Ça suppose le sujet ACHROMATIQUE. C'est vrai des mannequins gris et c'est exigé
# par le brief ; une planche colorée casserait cette hypothèse en silence.
CHROMA_FOND_MIN = 100


def ecart(c, fond):
    return max(abs(c[0] - fond[0]), abs(c[1] - fond[1]), abs(c[2] - fond[2]))


def chroma(c):
    """Saturation brute : 0 pour un gris, 255 pour une couleur pure."""
    return max(c) - min(c)


def bande_et_colonnes(im, fond):
    """Trouve la bande des figures (hors titre et libellés) puis les 6 colonnes.

    ⚠️ MESURÉ, JAMAIS ÉCRIT EN DUR. Une planche régénérée n'aura pas les mêmes
    marges, et des coordonnées figées produiraient un décalage silencieux — des
    figures rognées, pas une erreur.
    """
    w, h = im.size
    px = im.load()

    lignes = [sum(1 for x in range(0, w, 2) if ecart(px[x, y], fond) > 14) for y in range(h)]
    segments = []
    debut = None
    for y in range(h):
        plein = lignes[y] > 2
        if plein and debut is None:
            debut = y
        elif not plein and debut is not None:
            segments.append((debut, y))
            debut = None
    if debut is not None:
        segments.append((debut, h))
    # La bande des figures est de loin le plus HAUT segment : le titre et les
    # libellés font quelques dizaines de pixels, les corps en font des centaines.
    hauts = sorted(segments, key=lambda s: s[1] - s[0], reverse=True)
    if not hauts:
        raise SystemExit('aucune figure trouvée : la planche a changé de forme')
    y0, y1 = hauts[0]

    cols = [sum(1 for y in range(y0, y1, 2) if ecart(px[x, y], fond) > 14) for x in range(w)]
    colonnes = []
    debut = None
    for x in range(w):
        plein = cols[x] > 1
        if plein and debut is None:
            debut = x
        elif not plein and debut is not None:
            colonnes.append((debut, x))
            debut = None
    if debut is not None:
        colonnes.append((debut, w))
    colonnes = [c for c in colonnes if c[1] - c[0] > 20]
    if len(colonnes) != 6:
        raise SystemExit(f'{len(colonnes)} colonnes trouvées au lieu de 6 — planche inattendue')
    return (y0, y1), colonnes


def detourer(vignette, fond):
    """Fond transparent par DIFFUSION depuis les bords, puis décontamination du liseré.

    Trois temps, et l'ordre est ce qui rend le résultat juste :
      1. **diffusion** depuis les quatre bords, tolérance BASSE → le fond CERTAIN.
         Un pixel gris-fond au milieu du cou n'est relié à rien : il n'y entre pas.
      2. **dilatation** de ce fond certain de quelques pixels → la zone où le liseré
         peut vivre. Sans elle, le pas d'antialiasing arrête la diffusion et laisse
         un anneau clair tout autour de la figure, opaque, sur la carte sombre.
      3. **rampe + décontamination** dans cette zone seulement. Un pixel du modèle
         franchement plus foncé que le fond y garde α = 255 : être près du bord ne
         suffit pas à être effacé, il faut aussi en avoir la couleur.
    """
    w, h = vignette.size
    src = vignette.load()
    out = Image.new('RGBA', (w, h))
    dst = out.load()

    # 1 — fond certain
    chroma_fond = chroma(fond)
    colore = chroma_fond >= CHROMA_FOND_MIN
    dehors = bytearray(w * h)
    file = deque()
    bords = [(x, y) for x in range(w) for y in (0, h - 1)] + \
            [(x, y) for y in range(h) for x in (0, w - 1)]
    for x, y in bords:
        if not dehors[y * w + x] and ecart(src[x, y], fond) <= T_DIFFUSION:
            dehors[y * w + x] = 1
            file.append((x, y))

    # 🔴 LES POCHES FERMÉES — visibles à l'aperçu, entre les cuisses des corps 5 et 6 :
    # un magenta enclavé par le corps n'est relié à AUCUN bord, donc la diffusion ne
    # l'atteint jamais et il restait à l'écran, rose vif sur la carte sombre.
    # ➡️ Avec un fond COLORÉ on peut le reconnaître à sa seule couleur, sans passer par
    # la connexité — ce que le gris d'origine interdisait précisément (c'est pour ça
    # que la diffusion existe : un gris-fond au milieu du cou N'EST PAS du fond).
    # La marge est énorme et mesurée : chroma du sujet p99 = 21 au cœur du torse, seuil
    # ici à 204. Aucun pixel de modèle ne peut y tomber.
    if colore:
        for y in range(h):
            for x in range(w):
                if not dehors[y * w + x] and chroma(src[x, y]) >= chroma_fond * 0.8:
                    dehors[y * w + x] = 1
                    file.append((x, y))
    while file:
        x, y = file.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not dehors[ny * w + nx]:
                if ecart(src[nx, ny], fond) <= T_DIFFUSION:
                    dehors[ny * w + nx] = 1
                    file.append((nx, ny))

    # 2 — dilatation : la bande où le liseré est permis
    bord = bytearray(dehors)
    file = deque((x, y) for y in range(h) for x in range(w) if dehors[y * w + x])
    profondeur = {(x, y): 0 for x, y in file}
    while file:
        x, y = file.popleft()
        d = profondeur[(x, y)]
        if d >= RAYON_BORD:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bord[ny * w + nx]:
                bord[ny * w + nx] = 1
                profondeur[(nx, ny)] = d + 1
                file.append((nx, ny))

    # 3 — rampe et décontamination (chroma_fond / colore : calculés à l’étape 1)
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if not bord[y * w + x]:
                dst[x, y] = (r, g, b, 255)     # loin du fond certain → c'est le modèle
                continue
            if colore:
                # Fond coloré : la part de fond est la CHROMATICITÉ, pas l'écart.
                a = round(max(0.0, min(1.0, 1 - chroma((r, g, b)) / chroma_fond)) * 255)
                if a == 0:
                    dst[x, y] = (0, 0, 0, 0)
                    continue
                if a == 255:
                    dst[x, y] = (r, g, b, 255)
                    continue
            else:
                d = ecart((r, g, b), fond)
                if d <= T_OPAQUE:
                    dst[x, y] = (0, 0, 0, 0)
                    continue
                if d >= T_PLEIN:
                    dst[x, y] = (r, g, b, 255)
                    continue
                a = round((d - T_OPAQUE) * 255 / (T_PLEIN - T_OPAQUE))
            # Décontamination : retirer la part de fond mélangée dans ce pixel de bord.
            # Sans elle, le bord reste un gris CLAIR et dessine un liseré autour de la
            # figure — invisible sur fond blanc, criant sur une carte sombre.
            k = a / 255
            couleur = [min(255, max(0, round((c - (1 - k) * f) / k)))
                       for c, f in zip((r, g, b), fond)]
            if colore:
                # 🔴 BORNE ANTI-SUR-CORRECTION — et elle a été trouvée par la mesure,
                # après un premier correctif qui déplaçait le défaut au lieu de le
                # régler : le liseré rose (5,0 % des pixels, pire 131) était devenu un
                # liseré VERT (7,1 %, pire 61). Ma sonde ne cherchait que la dominante
                # magenta, donc elle annonçait « 0,06 %, c'est réglé ».
                # ➡️ *Une sonde qui ne mesure qu'un SENS déclare résolu ce qu'elle a
                # seulement retourné.*
                #
                # **La cause** : `α = 1 − chroma(P)/chroma(F)` suppose le sujet
                # parfaitement gris. Mesuré, il ne l'est pas — chroma médiane 4, p90 11
                # au cœur du torse. Sa chroma propre est donc comptée comme du fond, α
                # est sous-estimé, et la décontamination retire plus de magenta qu'il
                # n'y en avait. Le résidu part dans la couleur COMPLÉMENTAIRE.
                #
                # ➡️ La borne dit une évidence physique : **on ne peut pas retirer du
                # magenta et obtenir du vert.** Le canal creux du fond (le vert, ici)
                # ne peut pas ressortir au-dessus de la moyenne des deux autres — au
                # pire, le pixel est gris. Rien de légitime n'est écrêté : une nuance
                # réelle du sujet dans une AUTRE direction passe intacte.
                creux = fond.index(min(fond))
                autres = [i for i in (0, 1, 2) if i != creux]
                plafond = (couleur[autres[0]] + couleur[autres[1]]) // 2
                if couleur[creux] > plafond:
                    couleur[creux] = plafond
            dst[x, y] = (*couleur, a)
    return out


def socle_centre(alpha, bbox):
    """Centre horizontal du SOCLE, pas de la boîte englobante.

    ⚠️ Centrer sur la boîte ferait danser les figures d'une carte à l'autre : un
    bras écarté ou un ventre décalent la boîte, jamais le socle. Le socle est le
    seul repère commun aux douze.
    """
    bas = alpha.crop((0, max(0, bbox[3] - 25), alpha.size[0], bbox[3])).getbbox()
    if not bas:
        return (bbox[0] + bbox[2]) / 2
    return (bas[0] + bas[2]) / 2


def main():
    ecrire = '--ecrire' in sys.argv
    if not ecrire:
        print('Mode APERÇU (rien ne sera écrit). Ajouter --ecrire pour remplacer '
              'les 12 images servies.\n')
    decoupes = {}

    for sexe in SEXES:
        planche = Image.open(f'{SOURCE}/{sexe}-models.png').convert('RGB')
        fond = planche.load()[3, 3]
        (y0, y1), colonnes = bande_et_colonnes(planche, fond)
        print(f'{sexe}: bande y={y0}..{y1}, 6 colonnes {colonnes}')
        for i, (x0, x1) in enumerate(colonnes, start=1):
            marge = 8
            boite = (max(0, x0 - marge), max(0, y0 - marge),
                     min(planche.size[0], x1 + marge), min(planche.size[1], y1 + marge))
            vignette = detourer(planche.crop(boite), fond)
            bbox = vignette.split()[3].getbbox()
            decoupes[(sexe, i)] = (vignette, bbox)

    # 🔴 UN SEUL CANEVAS ET UNE SEULE ÉCHELLE POUR LES DOUZE. Redimensionner chaque
    # figure pour qu'elle remplisse sa carte effacerait la seule chose que ce
    # sélecteur doit montrer : un corps à 35 % est PLUS LARGE qu'un corps à 10 %.
    larg = max(b[2] - b[0] for _, b in decoupes.values()) + 2 * MARGE
    haut = max(b[3] - b[1] for _, b in decoupes.values()) + 2 * MARGE
    print(f'canevas commun : {larg} × {haut}')

    finales = {}
    for (sexe, i), (vignette, bbox) in sorted(decoupes.items()):
        toile = Image.new('RGBA', (larg, haut), (0, 0, 0, 0))
        cx = socle_centre(vignette.split()[3], bbox)
        # x : le socle au centre du canevas — y : le bas du socle sur une ligne commune.
        dx = round(larg / 2 - cx)
        dy = haut - MARGE - bbox[3]
        toile.paste(vignette, (dx, dy), vignette)
        finales[(sexe, i)] = toile
        b = toile.split()[3].getbbox()
        print(f'  {sexe}-{i}: contenu {b[2]-b[0]}×{b[3]-b[1]}, bas={b[3]}, '
              f'centre socle={round(socle_centre(toile.split()[3], b), 1)}')
        if ecrire:
            toile.save(f'{SORTIE}/{sexe}-{i}.png')

    # Composé sur le VRAI fond de carte sombre : un liseré clair ne se voit nulle
    # part ailleurs, et c'est l'un des deux défauts que ce script traque.
    for sexe in SEXES:
        planche = Image.new('RGBA', (larg * 6, haut), (28, 28, 30, 255))
        for i in range(1, 7):
            planche.alpha_composite(finales[(sexe, i)], ((i - 1) * larg, 0))
        planche.convert('RGB').save(f'/tmp/apercu-{sexe}.png')
        print(f'aperçu → /tmp/apercu-{sexe}.png')
    if ecrire:
        print('\n✅ les 12 images de assets/bodyfat/ ont été remplacées')
    else:
        print('\nℹ️ rien n\'a été écrit — relancer avec --ecrire si l\'aperçu convient')


if __name__ == '__main__':
    main()
