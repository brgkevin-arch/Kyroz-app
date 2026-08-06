import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, Animated, PanResponder, Pressable,
} from 'react-native';
import { useTheme } from '../constants/theme';
import { useLayout } from '../constants/layout';

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
export function ActionSheet({ visible, onClose, children }: Props) {
  const t = useTheme();
  const layout = useLayout();
  const [render, setRender] = useState(visible);
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
  // Signalé par le fondateur le 2026-08-06 sur l'édition d'une quantité du frigo,
  // et vu UNE seule fois — c'est une course, elle demande un second geste pendant
  // la sortie. Le défaut n'est pas dans le frigo : il est dans les DEUX feuilles.
  //
  // ➡️ Le correctif ne cherche pas à gagner la course : il retire la condition. On
  // démonte dès que l'animation s'arrête, quelle qu'en soit la raison, **à moins
  // que la feuille n'ait été rouverte entre-temps** — ce que dit `visibleRef`, lu
  // au moment du rappel et non capturé à la création. Un état qui doit converger ne
  // se confie pas à un événement qui peut ne pas arriver.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (visible) {
      setRender(true);
      ty.setValue(700);
      Animated.parallel([
        Animated.timing(ty, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else if (render) {
      Animated.parallel([
        Animated.timing(ty, { toValue: 700, duration: 200, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => { if (!visibleRef.current) setRender(false); });
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
      onPanResponderMove: (_, g) => { if (g.dy > 0) ty.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.4) onClose();
        else Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
      // Même garde-fou que dans `Sheet.tsx` : sans ça, un geste repris par un
      // scroll (ou par le système) laisse la feuille figée à mi-course.
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
    })
  ).current;

  return (
    <Modal visible={render} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>

        <Animated.View
          {...pan.panHandlers}
          style={[styles.sheet, { backgroundColor: t.card, transform: [{ translateY: ty }] }, layout.sheet, layout.isTablet && styles.sheetTablet]}
        >
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
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 14,
  },
  sheetTablet: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 24 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 6 },
});
