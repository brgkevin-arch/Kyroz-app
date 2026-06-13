import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, Animated, PanResponder, Pressable,
} from 'react-native';
import { useTheme } from '../constants/theme';

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
  const [render, setRender] = useState(visible);
  const ty = useRef(new Animated.Value(700)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

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
      ]).start(({ finished }) => { if (finished) setRender(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Toute la feuille est draggable : on ne capte que les gestes nettement vers le
  // bas (onStart=false → les taps/focus sur les champs et boutons passent).
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) ty.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.4) onClose();
        else Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
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
          style={[styles.sheet, { backgroundColor: t.card, transform: [{ translateY: ty }] }]}
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
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 6 },
});
