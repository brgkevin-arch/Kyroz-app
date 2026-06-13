import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, Animated, PanResponder, Dimensions,
  Pressable, Platform,
} from 'react-native';
import { useTheme, Radius } from '../constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Feuille modale « à la Trade Republic » : glisser vers le bas (poignée) ou
 * taper le fond pour fermer. Animée, compatible web + natif.
 */
export function Sheet({ visible, onClose, children }: Props) {
  const t = useTheme();
  const [render, setRender] = useState(visible);
  const ty = useRef(new Animated.Value(SCREEN_H)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRender(true);
      ty.setValue(SCREEN_H);
      Animated.parallel([
        Animated.timing(ty, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else if (render) {
      Animated.parallel([
        Animated.timing(ty, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRender(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Glisser pour fermer. onStart=false → les taps (ex. croix) passent au travers ;
  // on ne capte le geste que sur un mouvement vers le bas. Les panHandlers sont
  // posés sur une grande zone (poignée haute + en-tête de la recette) pour qu'on
  // puisse tirer depuis plus bas, sans interférer avec le scroll du contenu.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) ty.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.4) {
          onClose();
        } else {
          Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
        }
      },
    })
  ).current;

  // On injecte les poignées de drag dans l'enfant (ex. RecipeDetail) pour rendre
  // son en-tête glissable aussi.
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, { dragHandlers: pan.panHandlers })
    : children;

  return (
    <Modal visible={render} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: t.bg, transform: [{ translateY: ty }] },
          ]}
        >
          {/* Poignée — grande zone de drag (toute la bande haute, pas juste l'encoche) */}
          <View {...pan.panHandlers} style={styles.handleZone}>
            <View style={[styles.handle, { backgroundColor: t.lineStrong }]} />
          </View>

          <View style={{ flex: 1 }}>{child}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    height: '94%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'auto' as any } : {}),
  },
  // Bande de drag haute et pleine largeur : on peut tirer bien plus bas que l'encoche.
  handleZone: { paddingTop: 16, paddingBottom: 28, alignItems: 'center' },
  handle: { width: 56, height: 6, borderRadius: 3 },
});
