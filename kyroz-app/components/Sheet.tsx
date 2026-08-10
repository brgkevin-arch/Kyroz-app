import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, Animated, PanResponder, useWindowDimensions,
  Pressable, Platform, Easing,
} from 'react-native';
import { useTheme, Radius, Spacing } from '../constants/theme';
import { useLayout } from '../constants/layout';
import {
  RESSORT, DUREE, ressortRN, ressortReduit, dureeReduite,
  vitesseDepuisPan, caoutchouc, decisionFeuille,
} from '../lib/motion';
import { useReduceMotion, reduceMotionActif } from '../lib/reduceMotion';

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

  const reduire = useReduceMotion();

  // 🔴 LA VITESSE DU DOIGT VOYAGEAIT JUSQU'ICI PUIS ÉTAIT JETÉE.
  // `onPanResponderRelease` lisait `g.vy` pour décider *si* on ferme, appelait
  // `onClose()`, et la sortie qui suivait durait 240 ms — les mêmes 240 ms qu'on
  // ait effleuré la feuille ou qu'on l'ait balancée. C'était l'écart le plus
  // visible avec iOS, où le mouvement HÉRITE de l'élan du geste.
  // Cette ref est le seul chemin qui restait : `onClose` remonte au parent, qui
  // repasse `visible: false`, et c'est CET effet qui anime. On y dépose donc la
  // vitesse mesurée, en px/seconde, et on la consomme ici.
  // ⚠️ Elle se REMET À ZÉRO après usage : une fermeture par le bouton « fermer »
  // ou par le fond ne doit pas hériter de la vitesse d'un geste d'il y a dix
  // minutes.
  const vitesseSortie = useRef(0);

  // 🔴 LE `PanResponder` EST CRÉÉ UNE SEULE FOIS (`useRef`), DONC TOUT CE QU'IL
  // CAPTURE EST FIGÉ AU PREMIER RENDU. Deux valeurs le traversent désormais et
  // changent en cours de vie : la hauteur de l'écran (rotation, Split View sur
  // iPad — `Dimensions.get()` ment pour cette raison exacte, cf. §11) et le
  // réglage « Réduire les animations », que l'utilisateur peut basculer sans
  // quitter l'app. Les lire depuis une ref / depuis le store, jamais depuis la
  // variable de rendu : sinon le geste travaille avec l'état du démarrage, et
  // ça ne se voit sur aucune capture.
  const screenHRef = useRef(screenH);
  screenHRef.current = screenH;

  useEffect(() => {
    if (visible) {
      // ⚠️ On ne repart du bas QUE si la feuille n'était pas déjà à l'écran.
      // `ty.setValue(screenH)` inconditionnel était ce qui rendait l'ouverture
      // NON INTERRUPTIBLE : rattraper une feuille en train de sortir la faisait
      // d'abord sauter tout en bas. Un ressort part de la valeur COURANTE — c'est
      // tout son intérêt, et c'est le principe n°1 du catalogue Apple.
      if (!render) ty.setValue(screenH);
      setRender(true);
      Animated.parallel([
        Animated.spring(ty, {
          toValue: 0,
          useNativeDriver: true,
          ...ressortRN(ressortReduit(RESSORT.feuille, reduire)),
        }),
        // Le fond n'est pas saisissable au doigt : une durée y est légitime.
        // `Easing.out` — une entrée démarre vite et ralentit en arrivant. Sans
        // courbe déclarée, RN applique `easeInOut`, donc un départ LENT : c'est
        // ce que faisaient les 12 `timing` du code d'avant.
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
      Animated.parallel([
        Animated.spring(ty, {
          toValue: screenH,
          useNativeDriver: true,
          // La vitesse du doigt devient la vitesse d'ENTRÉE du ressort : plus
          // aucune couture entre le glissement et l'animation.
          velocity: v,
          ...ressortRN(ressortReduit(RESSORT.feuille, reduire)),
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: dureeReduite(DUREE.moyen, reduire),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => { if (!visibleRef.current) setRender(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Glisser pour fermer. Les panHandlers sont posés sur une grande zone (poignée
  // haute + en-tête de la recette) pour qu'on puisse tirer depuis plus bas.
  //
  // ⚠️⚠️ ET IL NE DOIT PAS DEVENIR UN `false` CONSTANT PAR LA BANDE. Il vaut
  // `visibleRef.current` depuis le 2026-08-06 : vrai dès que la feuille est
  // ouverte — donc exactement quand le geste doit exister — et faux pendant la
  // seule sortie. Toute réécriture qui le figerait à `false` retuerait le geste
  // en natif sans que le web le montre. Compté par `lib/__tests__/feuilles.test.ts`.
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
      // Pendant la sortie, le geste ne doit plus exister : c'est LUI qui
      // interrompait l'animation. On tarit la source en plus de rendre le
      // démontage insensible à l'interruption — les deux se valident seuls.
      onStartShouldSetPanResponder: () => visibleRef.current,
      onMoveShouldSetPanResponder: (_, g) => visibleRef.current && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      // ⚠️ TIRER VERS LE HAUT NE FAISAIT RIEN — `if (g.dy > 0)` ignorait purement
      // le geste. Une feuille morte au doigt se lit comme un écran FIGÉ : rien ne
      // dit si on a atteint une limite ou si l'app a planté. Elle résiste
      // désormais de plus en plus, ce qui dit « il n'y a rien de plus par là »
      // sans un mot. La résistance s'échelonne sur la hauteur de l'écran.
      onPanResponderMove: (_, g) => {
        ty.setValue(g.dy > 0 ? g.dy : -caoutchouc(-g.dy, screenHRef.current));
      },
      onPanResponderRelease: (_, g) => {
        // 🔴 LA DÉCISION SE PREND SUR LA PROJECTION, PAS SUR LA POSITION.
        // Avant : `g.dy > 90 || g.vy > 0.4` — deux seuils indépendants, dont l'un
        // ne lisait la vitesse que pour TRANCHER, après quoi elle était perdue.
        // `decisionFeuille` projette d'abord où le geste atterrirait s'il
        // décélérait tout seul (la fonction d'Apple, pas la formule scolaire),
        // puis choisit la destination la plus proche de ce point.
        // ⚠️ `vitesseDepuisPan` : `vy` est en px/MILLISECONDE et un ressort
        // intègre en secondes. Oublier ce ×1000 est un facteur mille, donc un
        // correctif qui a l'air de ne rien faire.
        const v = vitesseDepuisPan(g.vy);
        const hauteur = screenHRef.current * 0.94; // la feuille fait 94 % de l'écran
        if (decisionFeuille(Math.max(0, g.dy), v, hauteur) === 'fermer') {
          vitesseSortie.current = v;
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
        // Geste repris par le système (appel entrant, scroll natif) : la feuille
        // revient à sa place. Aucune vitesse à hériter — il n'y a pas eu de
        // relâchement, donc rien à projeter.
        Animated.spring(ty, {
          toValue: 0,
          useNativeDriver: true,
          ...ressortRN(ressortReduit(RESSORT.pose, reduceMotionActif())),
        }).start();
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
      // ℹ️ Ce chemin-ci n'a PAS de vitesse à hériter, et ce n'est pas un oubli :
      // le geste appartient au `ScrollView` natif, qui ne la rend pas dans
      // `onScrollEndDrag`. On garde donc le seuil de position, seule information
      // disponible. C'est la raison pour laquelle `onScroll` suit le rebond
      // élastique plutôt que de reprendre le geste — on lit ce que le système a
      // déjà mesuré, on ne le lui reprend pas.
      if (depasse > SEUIL_FERMETURE) onClose();
      else Animated.spring(ty, {
        toValue: 0,
        useNativeDriver: true,
        ...ressortRN(ressortReduit(RESSORT.pose, reduceMotionActif())),
      }).start();
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
