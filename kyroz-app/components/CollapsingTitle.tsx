import React, { useRef } from 'react';
import {
  Animated, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent,
  StyleSheet, Text, View, Easing, type StyleProp, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { DUREE, dureeReduite } from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import {
  COMPACT_BAR_H, SEUIL_PAR_DEFAUT, seuilRepli, paddingHautDecale,
  FONDU_BARRE_ETAT, FONDU_TITRE, DEBORD_FONDU,
} from '../lib/collapsingTitle';
import { useFormeBarre } from '../hooks/useFormeBarre';

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
// et Réserve il était en dehors, donc le gros titre restait planté en haut à
// perpétuité. Deux comportements opposés pour le même objet.
//
// 🔴 LE CONTENU PASSE DÉSORMAIS SOUS L'ÎLOT (2026-10-19, demande du fondateur :
// « que l'app se fonde en haut du téléphone, au niveau de la Dynamic Island »).
// Jusque-là, chaque onglet montait sa zone défilante dans un `SafeAreaView
// edges={['top']}` : le contenu se COUPAIT net à 62 pt (iPhone 17), sous l'heure,
// et cette barre était PEINTE avec un filet — le filet expliquait la coupure
// (E36, 2026-08-11 : « rien ne passe derrière elle », mesuré).
// Maintenant la zone défilante remonte jusqu'en haut de l'écran (`zone`, marge
// négative) et son contenu redescend d'autant (`contenu`) : au repos rien ne bouge,
// en défilant le contenu glisse sous l'heure et s'y FOND (`FONDU_BARRE_ETAT`) —
// l'effet de bord de défilement d'iOS 26, en dégradé. Le filet disparaît : il n'y a
// plus de coupure à expliquer.
//
// 🔴 ET UN DÉFAUT DE TOUJOURS, TROUVÉ EN CHEMIN : cette barre était posée en
// `top: 0` sur 52 pt — donc DANS la barre d'état, son titre centré pile sur la
// Dynamic Island. Sur un vrai iPhone, l'îlot le cachait ; le simulateur ne dessine
// pas l'îlot dans ses captures, c'est pour ça que personne ne l'a vu. Le titre
// compact est maintenant SOUS la barre d'état, comme un titre de barre iOS.
//
// ⚠️ Sur iPad, la barre d'onglets est en haut : la zone sûre de l'écran l'inclut,
// mais l'inset global (`useSafeAreaInsets`) ne la connaît pas. On n'y remonte donc
// rien (`haut` = 0) — le contenu reste sous la barre, comme avant.

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
  /** Hauteur de la barre d'état sous laquelle le contenu défile (0 sur iPad). */
  haut: number;
  /** À poser en `style` de la zone défilante : elle remonte jusqu'en haut de l'écran. */
  zone: ViewStyle;
  /** Enveloppe le `contentContainerStyle` : son haut redescend d'autant. */
  contenu: (style: StyleProp<ViewStyle>) => StyleProp<ViewStyle>;
}

/**
 * La hauteur de la barre d'état (heure, Dynamic Island) sous laquelle un onglet
 * fait défiler son contenu. 0 sur iPad, où la barre d'onglets occupe le haut et où
 * l'inset global ne la compte pas.
 */
export function useHautOnglet(): number {
  const { top } = useSafeAreaInsets();
  return useFormeBarre() === 'haut' ? 0 : top;
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
  const haut = useHautOnglet();
  // Lu au moment de la mesure, pas capturé : la barre d'état change de hauteur
  // (rotation, appel en cours) sans que l'en-tête se re-mesure forcément.
  const hautRef = useRef(haut);
  hautRef.current = haut;
  // Repli prudent avant la première mesure : mieux vaut un titre compact qui
  // tarde qu'un titre compact posé par-dessus le gros.
  const seuil = useRef(SEUIL_PAR_DEFAUT);

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    seuil.current = seuilRepli(y, height, hautRef.current);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const doitEtreVisible = e.nativeEvent.contentOffset.y > seuil.current;
    if (doitEtreVisible === visible.current) return;
    visible.current = doitEtreVisible;
    // ℹ️ La DURÉE ne change pas d'un millième : 160 ms était déjà un choix
    // délibéré et documenté, elle reçoit seulement son nom (`DUREE.instant`).
    // Ce qui manquait, c'est la COURBE — sans elle RN applique `easeInOut`,
    // donc un départ lent sur une bascule qui doit être immédiate.
    // ⚠️ Réduction du mouvement : cette bascule est une OPACITÉ, elle informe
    // sans déplacer. On la raccourcit, on ne la retire pas — c'est le seul
    // signe que le titre a changé de place.
    Animated.timing(opacity, {
      toValue: doitEtreVisible ? 1 : 0,
      duration: dureeReduite(DUREE.instant, reduceMotionActif()),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return {
    scrollProps: { onScroll, scrollEventThrottle: 32 },
    onHeaderLayout,
    opacity,
    haut,
    zone: { marginTop: -haut },
    contenu: (style) => [style, { paddingTop: paddingHautDecale(StyleSheet.flatten(style) ?? {}, haut) }],
  };
}

/** Un fondu vertical vers le fond de l'écran. `id` unique : cinq onglets sont montés à la fois. */
function Fondu({ couleur, hauteur, arrets }: {
  couleur: string;
  hauteur: number;
  arrets: readonly { a: number; opacite: number }[];
}) {
  const id = `fondu${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height={hauteur} style={styles.fondu}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {arrets.map((p) => <Stop key={p.a} offset={p.a} stopColor={couleur} stopOpacity={p.opacite} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Le haut de l'écran d'onglet : le fondu sous l'heure, et la barre compacte qui
 * prend le relais du grand titre. À rendre APRÈS la zone défilante dans le JSX :
 * elle doit peindre par-dessus, et l'ordre de rendu suffit (pas besoin d'`elevation`).
 *
 * ⚠️ `pointerEvents: 'none'` : rien ici ne se touche, et sans ça le haut de l'écran
 * avalerait les gestes de défilement.
 */
export function CompactTitleBar({
  t, title, opacity,
}: { t: ThemePalette; title: string; opacity: Animated.Value }) {
  const forme = useFormeBarre();
  const haut = useHautOnglet();
  // 🔴 Sur iPad, la barre d'onglets native est EN HAUT (2026-10-19) et cette barre-ci
  // venait se coincer dessous — titre à moitié masqué par la capsule (vu au
  // simulateur, iPad Air 11"). Elle y est redondante : l'onglet ouvert est déjà
  // surligné dans la barre du système. On ne la rend pas.
  // ⚠️ Le retour est APRÈS les deux hooks : le Split View fait changer `forme` en vol.
  if (forme === 'haut') return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.haut, { height: haut + COMPACT_BAR_H + DEBORD_FONDU }]}
    >
      {/* Toujours là : au repos rien ne passe dessous, il ne se voit pas. */}
      {haut > 0 && <Fondu couleur={t.bg} hauteur={haut} arrets={FONDU_BARRE_ETAT} />}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Fondu couleur={t.bg} hauteur={haut + COMPACT_BAR_H + DEBORD_FONDU} arrets={FONDU_TITRE} />
        {/* SOUS la barre d'état, jamais dedans : l'îlot le cacherait. */}
        <View style={[styles.centre, { top: haut }]}>
          <Text numberOfLines={1} style={[styles.titre, { color: t.text }]}>{title}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  haut: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    // Dans le STYLE et pas en prop : react-native-web déprécie `pointerEvents`
    // en prop, et le prévient à chaque rendu dans la console.
    pointerEvents: 'none',
  },
  fondu: { position: 'absolute', top: 0, left: 0, right: 0 },
  centre: {
    position: 'absolute', left: 0, right: 0, height: COMPACT_BAR_H,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl,
  },
  titre: { ...Type.h3 },
});
