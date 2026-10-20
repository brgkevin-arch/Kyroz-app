import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, Animated, PanResponder, Pressable, Easing,
} from 'react-native';
import { useTheme, Spacing, Fond, Radius } from '../constants/theme';
import Materiau, { useVerre } from './Materiau';
import { useLayout } from '../constants/layout';
import {
  RESSORT, DUREE, FILET_DEMONTAGE_MS, ressortRN, ressortReduit, dureeReduite,
  vitesseDepuisPan, caoutchouc, decisionFeuille,
} from '../lib/motion';
import { useReduceMotion, reduceMotionActif } from '../lib/reduceMotion';
import { retour } from '../lib/retourHaptique';
import { useModaleRecensee } from '../lib/modalesPresentees';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Petite feuille modale ancrée en bas, à hauteur du contenu.
 * - Glisser vers le bas n'importe où sur la feuille pour fermer (grande zone).
 * - Taper le fond ferme aussi.
 * Utilisée pour les formulaires courts (ajout / édition de quantité, confirmation).
 */
// Distance de rangement de la feuille — au-delà de toute hauteur de contenu
// plausible, donc elle sort de l'écran quoi qu'elle contienne. Sert aussi
// d'échelle à la résistance du bord haut.
const HAUTEUR_NOMINALE = 700;

// 🔴 CE N'EST PAS LA HAUTEUR RÉELLE, ET C'EST VOLONTAIRE. `decisionFeuille`
// ferme quand le point PROJETÉ dépasse la moitié de ce qu'on lui passe. Le code
// d'avant fermait à `dy > 80` ; on lui passe donc 160 pour retrouver EXACTEMENT
// le même seuil de position, et ne changer qu'une chose à la fois — ce qui
// s'ajoute, c'est la projection de l'élan. Une feuille d'action se dimensionne
// sur son contenu : mesurer sa hauteur réelle déplacerait le seuil d'un menu à
// l'autre, donc rendrait le geste imprévisible d'un écran au suivant.
const SEUIL_HAUTEUR = 160;

// ── La feuille en VERRE (iOS 26, 2026-10-19) ─────────────────────────────────
// Chez Apple, une feuille à mi-hauteur est en Liquid Glass, DÉCOLLÉE des bords, ses
// coins concentriques à ceux de l'écran ; elle ne redevient opaque et collée aux
// bords qu'à pleine hauteur (WWDC25, « Build a SwiftUI app with the new design »).
// Cette feuille-ci se dimensionne sur son contenu, donc elle est toujours partielle :
// elle reçoit le verre. `Sheet.tsx`, elle, monte à 94 % — la pleine hauteur d'Apple :
// opaque, et c'est la règle, pas un oubli.
//
// Le RAYON n'est pas choisi à l'œil : il est concentrique à ce que la feuille porte.
// Ses boutons (`Radius.button`) sont posés à `Spacing.xxl` de son bord ; un coin
// extérieur de 24 + 14 suit exactement la courbe intérieure. C'est la règle de
// concentricité d'Apple, appliquée à nos propres tokens.
const RAYON_VERRE = Spacing.xxl + Radius.button;
/** Le décollement des bords — l'écart qui fait lire la feuille comme posée au-dessus. */
const MARGE_VERRE = Spacing.sm;

export function ActionSheet({ visible, onClose, children }: Props) {
  const t = useTheme();
  const layout = useLayout();
  // Relu à chaque rendu : « Réduire la transparence » bascule pendant que l'app tourne.
  const verre = useVerre();
  const [render, setRender] = useState(visible);
  // Recensée tant qu'elle est à l'écran : une visite guidée attend qu'elle soit partie (lib/modalesPresentees.ts).
  useModaleRecensee(render);
  const ty = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  // 🔴 `render` DOIT converger vers `visible`, et il ne le faisait pas.
  // Ce drapeau garde la feuille MONTÉE le temps de l'animation de sortie. Sa remise
  // à zéro était conditionnée à `finished` — donc à une animation qui va jusqu'au
  // bout. Or elle peut être INTERROMPUE : il suffit qu'un nouveau geste touche `ty`
  // pendant qu'elle tourne (le pan appelle `setValue`, puis son ressort de retour).
  // `finished` vaut alors `false`, `render` reste `true`… **pour toujours** — cet
  // effet ne dépend que de `visible`, qui est déjà `false` et ne rebasculera pas.
  // La feuille est remontée à 0 par le ressort, donc PLEINEMENT VISIBLE, et
  // `onClose` ne peut plus rien : il remet à `null` un état déjà `null`, React ne
  // re-rend pas. **Feuille impossible à fermer, ni au glissement ni au fond.**
  // Signalé par le fondateur le 2026-08-06 sur l'édition d'une quantité en réserve,
  // et vu UNE seule fois — c'est une course, elle demande un second geste pendant
  // la sortie. Le défaut n'est pas dans la réserve : il est dans les DEUX feuilles.
  //
  // ➡️ Le correctif ne cherche pas à gagner la course : il retire la condition. On
  // démonte dès que l'animation s'arrête, quelle qu'en soit la raison, **à moins
  // que la feuille n'ait été rouverte entre-temps** — ce que dit `visibleRef`, lu
  // au moment du rappel et non capturé à la création. Un état qui doit converger ne
  // se confie pas à un événement qui peut ne pas arriver.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const reduire = useReduceMotion();

  // La vitesse du geste, déposée au relâchement et consommée par la sortie —
  // même mécanique et même motif que dans `Sheet.tsx` : `onClose` remonte au
  // parent, donc c'est l'effet ci-dessous qui anime, et c'est le seul chemin qui
  // reste pour lui transmettre l'élan du doigt.
  const vitesseSortie = useRef(0);

  useEffect(() => {
    if (visible) {
      // On ne repart du bas que si la feuille n'était pas déjà à l'écran :
      // rattraper une feuille en cours de sortie ne doit pas la faire sauter.
      if (!render) ty.setValue(700);
      setRender(true);
      Animated.parallel([
        Animated.spring(ty, {
          toValue: 0,
          useNativeDriver: true,
          ...ressortRN(ressortReduit(RESSORT.feuille, reduire)),
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: dureeReduite(DUREE.court, reduire),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (render) {
      const v = vitesseSortie.current;
      vitesseSortie.current = 0;
      let fait = false;
      const demonter = () => {
        if (fait || visibleRef.current) return;
        fait = true;
        setRender(false);
      };
      Animated.parallel([
        Animated.spring(ty, {
          toValue: 700,
          useNativeDriver: true,
          velocity: v,
          ...ressortRN(ressortReduit(RESSORT.feuille, reduire)),
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: dureeReduite(DUREE.court, reduire),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(demonter);
      // Même filet que dans `Sheet` : le rappel est un événement, pas une garantie.
      const filet = setTimeout(demonter, FILET_DEMONTAGE_MS);
      return () => clearTimeout(filet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Toute la feuille est draggable : on ne ferme que sur un geste nettement vers
  // le bas (le filtre vit dans `onMoveShouldSetPanResponder` + le seuil au relâché).
  //
  // ⚠️⚠️ ET IL NE DOIT PAS DEVENIR UN `false` CONSTANT PAR LA BANDE. Il vaut
  // `visibleRef.current` depuis le 2026-08-06 : vrai dès que la feuille est
  // ouverte — donc exactement quand le geste doit exister — et faux pendant la
  // seule sortie. Toute réécriture qui le figerait à `false` retuerait le geste
  // en natif sans que le web le montre. Compté par `lib/__tests__/feuilles.test.ts`.
  // ⚠️ `onStartShouldSetPanResponder` DOIT renvoyer `true` — même mesure et même
  // raison que dans `Sheet.tsx` (voir le commentaire détaillé là-bas) : à `false`,
  // le geste n'existe tout simplement pas en natif. Les taps et le focus des
  // champs continuent de passer, parce que `TextInput` et `Touchable*` sont plus
  // profonds dans l'arbre et gagnent le responder devant ce parent.
  const pan = useRef(
    PanResponder.create({
      // Pendant la sortie, le geste ne doit plus exister : c'est LUI qui
      // interrompait l'animation. On tarit la source en plus de rendre le
      // démontage insensible à l'interruption — les deux se valident seuls.
      onStartShouldSetPanResponder: () => visibleRef.current,
      onMoveShouldSetPanResponder: (_, g) => visibleRef.current && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      // Tirer vers le HAUT ne faisait rien : la feuille était morte au doigt.
      // Elle résiste désormais, échelonnée sur sa propre hauteur (700) et non
      // sur celle de l'écran — c'est une feuille d'action, elle n'occupe qu'une
      // partie de la vue.
      onPanResponderMove: (_, g) => {
        ty.setValue(g.dy > 0 ? g.dy : -caoutchouc(-g.dy, HAUTEUR_NOMINALE));
      },
      onPanResponderRelease: (_, g) => {
        // Décision par PROJECTION, et la vitesse est ensuite passée au ressort
        // au lieu d'être jetée — cf. le commentaire détaillé dans `Sheet.tsx`.
        const v = vitesseDepuisPan(g.vy);
        if (decisionFeuille(Math.max(0, g.dy), v, SEUIL_HAUTEUR) === 'fermer') {
          vitesseSortie.current = v;
          // Même déclic que dans `Sheet.tsx`, et pour la même raison : le seuil
          // est franchi avant que la feuille ne bouge.
          retour('declic');
          onClose();
        } else {
          Animated.spring(ty, {
            toValue: 0,
            useNativeDriver: true,
            velocity: v,
            ...ressortRN(ressortReduit(RESSORT.pose, reduceMotionActif())),
          }).start();
        }
      },
      // Même garde-fou que dans `Sheet.tsx` : sans ça, un geste repris par un
      // scroll (ou par le système) laisse la feuille figée à mi-course.
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        Animated.spring(ty, {
          toValue: 0,
          useNativeDriver: true,
          ...ressortRN(ressortReduit(RESSORT.pose, reduceMotionActif())),
        }).start();
      },
    })
  ).current;

  // 🔴 RIEN N'EST MONTÉ TANT QUE LA FEUILLE N'A PAS SERVI — et ce n'est pas une
  // optimisation. Une `Modal` de react-native-web crée son conteneur DOM à son
  // MONTAGE, pas quand elle devient visible ; à `z-index` égal, c'est l'ORDRE DU
  // DOM qui décide qui passe devant. Tant que ce composant rendait sa `Modal` en
  // permanence (`visible={render}`), l'empilement de deux feuilles d'un même écran
  // se jouait **à l'ordre de déclaration dans le JSX** — un ordre que rien
  // n'exprime et que personne ne relit. Les cinq écrans concernés étaient corrects
  // PAR ACCIDENT : `reserve.tsx` déclare sa confirmation après son éditeur,
  // donc elle passe au-dessus ; l'inverse l'aurait rendue invisible, en silence.
  // ⚠️ Le défaut est le même que celui payé sur `DialogProvider` le 2026-08-05 —
  // « une surcouche qui doit passer AU-DESSUS se monte à la demande » —, sauf que
  // là-bas il avait été corrigé chez l'APPELANT (`Dialog.tsx` garde son `monte`,
  // qui devient une ceinture par-dessus les bretelles). Le corriger ici le règle
  // pour les sept appels d'un coup, dont ceux qui n'existent pas encore.
  // ➡️ `render` porte déjà exactement la bonne durée de vie : vrai dès l'ouverture,
  // encore vrai pendant l'animation de sortie (sinon la feuille disparaîtrait d'un
  // coup au lieu de redescendre), faux ensuite. Il n'y avait qu'à s'en servir.
  // ⚠️ Ce retour anticipé est APRÈS tous les hooks, et ça n'est pas négociable :
  // un `useMemo` placé après un `return null` a déjà produit un « Rendered more
  // hooks than during the previous render » en pleine page d'accueil.
  if (!render) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>

        {/* ⚠️ Le repli (pas de verre : iOS 18, Android, web, « Réduire la
            transparence ») est la feuille d'AVANT au pixel près — peinte, collée aux
            bords, arrondie en haut seulement. C'est ce qui autorise l'OTA. */}
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.sheet,
            verre ? styles.sheetVerre : [styles.sheetPeinte, { backgroundColor: t.card }],
            { transform: [{ translateY: ty }] },
            layout.sheet,
            layout.isTablet && (verre ? styles.sheetVerreTablette : styles.sheetTablet),
          ]}
        >
          {/* Le verre se rend DERRIÈRE le contenu, à la forme de la feuille. */}
          {verre && <Materiau pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: RAYON_VERRE }]} />}
          <View style={[styles.handle, { backgroundColor: t.lineStrong }]} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    paddingHorizontal: Spacing.xxl, paddingTop: Spacing.md, paddingBottom: Fond.feuille, gap: Spacing.lg,
  },
  sheetPeinte: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetTablet: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: Spacing.xxl },
  // Le contenu garde la même hauteur au-dessus du menton : ce que la feuille gagne
  // en décollement, son rembourrage du bas le rend.
  sheetVerre: {
    marginHorizontal: MARGE_VERRE, marginBottom: MARGE_VERRE,
    borderRadius: RAYON_VERRE, borderCurve: 'continuous', overflow: 'hidden',
    paddingBottom: Fond.feuille - MARGE_VERRE,
  },
  sheetVerreTablette: { marginBottom: Spacing.xxl },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: Spacing.sm },
});
