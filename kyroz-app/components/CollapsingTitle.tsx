import React, { useRef } from 'react';
import {
  Animated, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent,
  StyleSheet, Text, View,
} from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { COMPACT_BAR_H, SEUIL_PAR_DEFAUT, seuilRepli } from '../lib/collapsingTitle';

// Ré-exportés pour que les écrans n'aient qu'un seul import à faire.
export { COMPACT_BAR_H, SEUIL_PAR_DEFAUT, seuilRepli };

// ── Le grand titre se replie, un titre compact prend le relais ───────────────
//
// C'est le comportement des grands titres iOS, et c'est ce que fait la maquette
// sur ses CINQ écrans, à l'identique : un gros titre (34) dans le contenu qui
// s'en va vers le haut, et un titre compact (17) dans une barre collée en haut
// qui, elle, ne bouge jamais.
//
// L'app ne le faisait sur aucun des cinq — et pas de la même façon, ce qui est
// le vrai défaut : sur Plan et Profil l'en-tête était DANS la zone défilante,
// donc le titre disparaissait et rien ne le remplaçait ; sur Recettes, Courses
// et Frigo il était en dehors, donc le gros titre restait planté en haut à
// perpétuité. Deux comportements opposés pour le même objet.
//
// ⚠️ La maquette floute le fond de sa barre (`blur(22px)`). On ne le fait PAS :
// le flou demande `expo-blur`, donc une dépendance NATIVE — un nouveau build et
// une nouvelle revue de store, et la voie OTA fermée pour les anciens binaires
// (cf. CLAUDE.md §2). Pour une barre de 52 pt, ça ne vaut pas le prix. Le fond
// opaque `t.bg` rend le même service : le contenu passe dessous et disparaît.
//
// ⚠️ Le filet sous la barre est le SEUL trait qu'on garde dans cette DA, et il
// porte du sens : sans lui, le contenu semble s'évaporer à mi-hauteur au lieu
// de passer sous quelque chose. C'est exactement le rôle que le flou joue dans
// la maquette.

interface Collapsing {
  /** À étaler sur le ScrollView / FlatList / SectionList de l'écran. */
  scrollProps: {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  };
  /** À poser sur la vue d'en-tête (celle qui contient le gros titre). */
  onHeaderLayout: (e: LayoutChangeEvent) => void;
  /** À passer à <CompactTitleBar>. */
  opacity: Animated.Value;
}

/**
 * Bascule le titre compact quand le gros titre est sorti de l'écran.
 *
 * ⚠️ Aucun `setState` : le seuil et l'état visible vivent dans des `ref`, et le
 * gestionnaire de défilement ne fait RIEN tant qu'on ne franchit pas le seuil.
 * Une version pilotée par `Animated.event` aurait fait passer chaque frame de
 * défilement par le pont JS ; ici il ne se passe strictement rien pendant qu'on
 * fait défiler, et un fondu de 160 ms se déclenche au passage. C'est aussi ce
 * que fait iOS : le titre compact ne se dose pas, il apparaît.
 */
export function useCollapsingTitle(): Collapsing {
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = useRef(false);
  // Repli prudent avant la première mesure : mieux vaut un titre compact qui
  // tarde qu'un titre compact posé par-dessus le gros.
  const seuil = useRef(SEUIL_PAR_DEFAUT);

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    seuil.current = seuilRepli(y, height);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const doitEtreVisible = e.nativeEvent.contentOffset.y > seuil.current;
    if (doitEtreVisible === visible.current) return;
    visible.current = doitEtreVisible;
    Animated.timing(opacity, {
      toValue: doitEtreVisible ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  return { scrollProps: { onScroll, scrollEventThrottle: 32 }, onHeaderLayout, opacity };
}

/**
 * La barre compacte. À rendre APRÈS la zone défilante dans le JSX : elle doit
 * peindre par-dessus, et l'ordre de rendu suffit (pas besoin d'`elevation`).
 *
 * ⚠️ `pointerEvents="none"` : la barre ne porte aucune commande, et sans ça elle
 * avalerait les gestes de défilement sur les 52 premiers points de l'écran.
 */
export function CompactTitleBar({
  t, title, opacity,
}: { t: ThemePalette; title: string; opacity: Animated.Value }) {
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { opacity, backgroundColor: t.bg, borderBottomColor: t.line }]}
    >
      <View style={styles.centre}>
        <Text numberOfLines={1} style={[styles.titre, { color: t.text }]}>{title}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: COMPACT_BAR_H,
    zIndex: 30,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Dans le STYLE et pas en prop : react-native-web déprécie `pointerEvents`
    // en prop, et le prévient à chaque rendu dans la console.
    pointerEvents: 'none',
  },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl },
  titre: { ...Type.h3 },
});
