import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, Animated, PanResponder, useWindowDimensions,
  Pressable, Platform,
} from 'react-native';
import { useTheme, Radius, Spacing } from '../constants/theme';
import { useLayout } from '../constants/layout';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Distance à dépasser pour que la feuille se ferme — même seuil que le glissement
// à la poignée, pour que les deux gestes se ressemblent.
const SEUIL_FERMETURE = 90;
// ⚠️ Suivi VOLONTAIREMENT partiel. Le rebond décale déjà le contenu de `-y` ; si la
// feuille se déplaçait aussi de `-y`, l'écart à l'écran doublerait et le contenu
// filerait deux fois plus vite que le doigt. À 0,5 le doigt et le contenu vont
// ensemble. Valeur réglée à l'œil au simulateur, pas déduite.
const SUIVI = 0.5;

/**
 * Feuille modale « à la Trade Republic » : glisser vers le bas (poignée) ou
 * taper le fond pour fermer. Animée, compatible web + natif.
 */
export function Sheet({ visible, onClose, children }: Props) {
  const t = useTheme();
  const layout = useLayout();
  // ⚠️ `useWindowDimensions` et non `Dimensions.get()` au chargement du module :
  // sur iPad la fenêtre change de taille sans relancer l'app (rotation, Split
  // View), et la feuille se rangeait alors hors écran ou trop court.
  const { height: screenH } = useWindowDimensions();
  const [render, setRender] = useState(visible);
  const ty = useRef(new Animated.Value(screenH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRender(true);
      ty.setValue(screenH);
      Animated.parallel([
        Animated.timing(ty, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else if (render) {
      Animated.parallel([
        Animated.timing(ty, { toValue: screenH, duration: 240, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRender(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Glisser pour fermer. Les panHandlers sont posés sur une grande zone (poignée
  // haute + en-tête de la recette) pour qu'on puisse tirer depuis plus bas.
  //
  // ⚠️ `onStartShouldSetPanResponder` DOIT renvoyer `true`. Il renvoyait `false`
  // depuis le commit initial, avec l'intention de « laisser passer les taps » —
  // et le geste n'a alors JAMAIS fonctionné en natif. Mesuré au simulateur iOS le
  // 2026-08-05 : tirer la poignée ne déplaçait la feuille d'AUCUN pixel, alors
  // que le contenu défilait et que les boutons répondaient.
  // En natif, si aucune vue ne réclame le responder au CONTACT, les phases
  // « mouvement » ne sont plus proposées du tout — ni en bulle
  // (`onMoveShouldSetPanResponder`) ni en capture
  // (`onMoveShouldSetPanResponderCapture`, essayé et mesuré sans effet non plus).
  // Le web ne pouvait pas le montrer : react-native-web fait passer le glissement
  // par des événements souris que le système de responder voit toujours. D'où un
  // geste « qui marchait » pendant des mois sans avoir jamais marché au doigt.
  //
  // Les taps continuent de passer, pour deux raisons mesurées : les `Touchable*`
  // enfants sont plus profonds dans l'arbre et gagnent le responder devant ce
  // parent ; et un simple appui ici se termine avec dy ≈ 0, donc sans effet.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) ty.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.4) {
          onClose();
        } else {
          Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
        }
      },
      // ⚠️ Ces deux-là ne sont pas décoratifs — sans eux la feuille RESTE COINCÉE
      // à mi-course. Mesuré le 2026-08-05 : en tirant depuis l'en-tête de la
      // recette (qui vit, lui, dans le `ScrollView`), le scroll natif reprend le
      // geste en cours de route ; le pan est alors « terminé » sans passer par
      // `onPanResponderRelease`, et plus personne ne ramène `ty` à 0.
      // `onPanResponderTerminationRequest: false` refuse de céder un geste déjà
      // commencé, et `onPanResponderTerminate` rattrape le cas où il est repris
      // malgré tout (l'appel entrant, par exemple).
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
    })
  ).current;

  // ── Jonction défilement ↔ fermeture ────────────────────────────────────────
  //
  // Sans ça, le contenu et la feuille sont DEUX mondes séparés : arrivé en haut de
  // la recette, on continue de tirer vers le bas et… rien. Sur iOS, les deux gestes
  // n'en font qu'un. On ne peut pas reprendre le geste au `ScrollView` natif une
  // fois qu'il l'a pris (son reconnaisseur est natif, le JS ne le lui retire pas) —
  // alors on se sert de LUI : quand on tire au-delà du haut, `contentOffset.y`
  // devient NÉGATIF (le rebond élastique). Cette valeur est le geste, déjà mesuré
  // par le système. Il suffit de la lire.
  //
  // `dragging` : les événements de défilement continuent d'arriver pendant le
  // retour élastique, APRÈS le relâchement. Sans ce drapeau, ils écraseraient
  // l'animation de fermeture qu'on vient de lancer.
  const dragging = useRef(false);

  const sheetScrollProps = {
    scrollEventThrottle: 16,
    onScrollBeginDrag: () => { dragging.current = true; },
    onScroll: (e: any) => {
      if (!dragging.current) return;
      const y = e.nativeEvent.contentOffset.y;
      ty.setValue(y < 0 ? -y * SUIVI : 0);
    },
    onScrollEndDrag: (e: any) => {
      dragging.current = false;
      const depasse = -e.nativeEvent.contentOffset.y;
      if (depasse > SEUIL_FERMETURE) onClose();
      else Animated.spring(ty, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
    },
  };

  // On injecte les poignées de drag dans l'enfant (ex. RecipeDetail) pour rendre
  // son en-tête glissable aussi, et les props de défilement pour son ScrollView.
  //
  // ⚠️ `React.Children.map` et non `isValidElement(children)`. L'ancienne version
  // testait l'ENFANT UNIQUE : dès qu'une feuille en contenait plusieurs, `children`
  // devenait un tableau, le test tombait à faux et **plus rien n'était injecté**.
  // C'était le cas du sélecteur d'éditeurs de Profil et de ses HUIT enfants
  // conditionnels (`{editor === 'info' && …}`) : ses en-têtes n'ont jamais été
  // glissables, alors que le code pour le faire était bien là, écrit et inerte.
  //
  // Le filtre `typeof c.type === 'function'` cible nos composants React et épargne
  // les vues natives (`<View>`, `<Text>`), à qui ces props ne veulent rien dire et
  // qui s'en plaindraient dans la console.
  const child = React.Children.map(children, (c) =>
    React.isValidElement(c) && typeof (c as any).type === 'function'
      ? React.cloneElement(c as React.ReactElement<any>, {
          dragHandlers: pan.panHandlers,
          sheetScrollProps,
        })
      : c
  );

  return (
    <Modal visible={render} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>

        {/* Sur tablette la feuille devient une colonne centrée : à 1024 pt de
            large, un éditeur de profil ou une recette pleine largeur éloignait
            son libellé de sa valeur de plus de 900 pt. Les coins du bas
            s'arrondissent aussi, puisqu'elle ne touche plus les bords. */}
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: t.bg, transform: [{ translateY: ty }] },
            layout.sheet,
            layout.isTablet && styles.sheetTablet,
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
  sheetTablet: { height: '90%', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: Spacing.xxl },
  // Bande de drag haute et pleine largeur : on peut tirer bien plus bas que l'encoche.
  handleZone: { paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl, alignItems: 'center' },
  handle: { width: 56, height: 6, borderRadius: 3 },
});
