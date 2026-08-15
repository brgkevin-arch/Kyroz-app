import React, { useEffect, useRef } from 'react';
import { Animated, Easing, LayoutAnimation, Platform, StyleProp, UIManager, ViewStyle } from 'react-native';
import { DUREE, dureeReduite } from '../lib/motion';
import { reduceMotionActif, useReduceMotion } from '../lib/reduceMotion';

// ── Ce qui APPARAÎT, DISPARAÎT ou SE DÉPLACE dans une liste ──────────────────
//
// La passe mouvement du 2026-08-10 avait laissé les 48 fichiers muets muets, et
// c'était le bon arbitrage : *animer parce que ça n'anime pas* est le contraire
// du geste. Ce fichier ne revient pas dessus — il traite une classe précise que
// cette passe n'avait pas couverte, et que le fondateur a nommée le 2026-08-15 :
// **les TRANSITIONS**, c'est-à-dire les moments où la mise en page change d'un
// bloc sans que rien ne relie l'avant et l'après.
//
// 🔴 POURQUOI `LayoutAnimation` ET PAS UN `Animated.Value` PAR ÉLÉMENT. Ce qui
// saute ici n'est pas une propriété, c'est une MISE EN PAGE : un rayon du frigo
// qui se replie, dix recettes qui s'ajoutent, une carte de repas qui perd ses
// boutons et fait remonter les trois cartes du dessous. Animer ça à la main
// demanderait de mesurer des hauteurs variables, donc un `onLayout` par bloc et
// un état de plus — pour un résultat que le système calcule déjà exactement.
// ⚠️ Le prix, assumé : c'est GLOBAL au prochain rendu. Ça ne convient donc qu'à
// un changement déclenché par un GESTE PRÉCIS (on sait quand on l'arme), jamais
// à un rafraîchissement de fond — d'où une fonction qu'on appelle, et non un
// réglage posé une fois pour toutes.
//
// ⚠️ ET ÇA NE SE VÉRIFIE PAS AU NAVIGATEUR : `requestAnimationFrame` n'y tourne
// pas (CLAUDE.md §8), et `LayoutAnimation` y est un no-op. Vérifié au simulateur.

// Android n'active pas `LayoutAnimation` de lui-même sur l'ancienne
// architecture. L'appel est sans effet ailleurs, et l'API n'existe pas sur web.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Arme une transition sur le PROCHAIN changement de mise en page.
 * À appeler juste AVANT le `setState` qui fait bouger l'écran.
 *
 * ⚠️ **Le réglage d'accessibilité se lit ICI, à chaque appel** — pas capturé au
 * montage. Un écran monté avant que l'utilisateur ne bascule « Réduire les
 * animations » doit obéir tout de suite. C'est la règle de `Presse`, et le
 * défaut « un réglage ne se relit pas, il se diffuse » (CLAUDE.md §11) est
 * exactement aussi facile à réintroduire ici.
 * ⚠️ **Réduire n'est pas supprimer** : on garde le fondu, qui INFORME, et
 * `dureeReduite` le raccourcit. Couper net laisserait la personne sans le
 * moindre signe que son geste a été pris.
 *
 * 🔴 `easeOut` et non `easeInEaseOut` : sans courbe déclarée, un départ LENT est
 * le défaut le plus répandu et le plus invisible du mouvement — c'est le
 * diagnostic qui a valu 12 `Animated.timing` sur 16 lors de la passe. Une
 * transition qui répond à un doigt part vite et se pose ; elle n'hésite pas.
 */
export function animerMiseEnPage(duree: number = DUREE.court): void {
  const reduire = reduceMotionActif();
  LayoutAnimation.configureNext({
    duration: dureeReduite(duree, reduire),
    // Ce qui ARRIVE : ça se fond, ça ne se déplie pas depuis une taille nulle —
    // un élément qui grandit depuis zéro attire l'œil plus que son contenu.
    create: { type: 'easeOut', property: 'opacity' },
    // Ce qui BOUGE : les voisins qui remontent ou descendent. C'est la moitié
    // du travail — sans elle, le bloc apparaît en fondu pendant que tout le
    // reste téléporte autour.
    update: { type: 'easeOut' },
    // Ce qui PART : même chemin qu'à l'arrivée. Une surface qui entre en fondu
    // et sort d'un coup se lit comme une panne, pas comme une sortie.
    delete: { type: 'easeOut', property: 'opacity' },
  });
}

/**
 * Une jauge dont le remplissage REJOINT sa valeur au lieu d'y sauter.
 *
 * 🔴 **`scaleX`, PAS `width`** — et ce n'est pas un détail de style. Une largeur
 * en pourcentage ne peut pas passer par le driver natif : chaque frame
 * repasserait par le fil JavaScript, sur un écran où l'on coche une trentaine
 * d'articles d'affilée, en magasin. `transform` est natif, donc l'animation
 * tourne même quand le JS est occupé à recalculer la liste.
 *
 * ⚠️ **`DUREE.instant` et rien de plus long.** Ce geste est répété des dizaines
 * de fois par jour : au-delà, la jauge traîne derrière le doigt et l'écran
 * paraît mou. Ce qu'elle rattrape vraiment, c'est « Tout cocher » — un saut de
 * 0 à 100 % en une frame, le seul moment où l'écran dit « ça avance ».
 */
export function Jauge({
  style, remplissage, pct, couleur,
}: {
  style?: StyleProp<ViewStyle>;
  remplissage?: StyleProp<ViewStyle>;
  /** 0 à 100. */
  pct: number;
  couleur: string;
}) {
  const reduire = useReduceMotion();
  const part = Math.max(0, Math.min(1, pct / 100));
  const valeur = useRef(new Animated.Value(part)).current;

  useEffect(() => {
    Animated.timing(valeur, {
      toValue: part,
      duration: dureeReduite(DUREE.instant, reduire),
      // Sans courbe, React Native applique `easeInOut`, donc un départ LENT :
      // le défaut le plus répandu du mouvement, et le plus invisible.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [part, reduire, valeur]);

  return (
    <Animated.View style={style}>
      <Animated.View
        style={[
          remplissage,
          {
            width: '100%',
            backgroundColor: couleur,
            // L'ancre est à GAUCHE : sans elle une barre mise à l'échelle
            // grandirait par ses deux bouts depuis son centre.
            transformOrigin: 'left',
            transform: [{ scaleX: valeur }],
          },
        ]}
      />
    </Animated.View>
  );
}
