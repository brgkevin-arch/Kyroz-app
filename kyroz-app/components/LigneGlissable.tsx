import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme, ThemePalette, Spacing, Type, Radius, CIBLE_TACTILE_MIN } from '../constants/theme';
import { Presse } from './Presse';
import {
  RESSORT, GLISSEMENT, ressortRN, ressortReduit, vitesseDepuisPan, caoutchouc,
  decisionGlissement, seuilSuppressionFranchi,
} from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';
import { retour } from '../lib/retourHaptique';

// ── Glisser une ligne vers la gauche pour la supprimer (2026-10-23) ──────────
//
// Le geste de Mail et de Rappels, demandé par le fondateur pour la Réserve : la ligne
// glisse, un bouton rouge « Supprimer » apparaît dessous ; au-delà de la moitié de la
// ligne, relâcher supprime d'un coup (`lib/motion.ts::decisionGlissement`, pur et testé).
//
// ⚠️ SANS DÉPENDANCE NATIVE, comme les feuilles : `PanResponder` + `Animated`, donc
// publiable en OTA. Et donc les mêmes pièges que `Sheet.tsx` :
//   • le `PanResponder` est créé UNE fois : tout ce qu'il lit et qui change (les rappels,
//     la largeur) passe par une ref, sinon il travaille avec l'état du premier rendu ;
//   • `vy`/`vx` sont en px/MILLISECONDE (`vitesseDepuisPan`) ;
//   • un geste repris par le système (`onPanResponderTerminate`) doit ramener la ligne.
//
// 🔴 ON PREND LE GESTE EN CAPTURE, ET SEULEMENT S'IL EST HORIZONTAL. La ligne est un
// bouton (`Presse`) qui réclame le toucher au contact ; la capture laisse le parent le lui
// reprendre dès que le doigt part franchement de côté. Un mouvement vertical n'est jamais
// pris : c'est le défilement de la liste. Et pendant le glissement, l'écran coupe son
// défilement (`onGlisse`), sinon une diagonale ferait bouger les deux.
//
// 🔴 UN GLISSEMENT N'EST PAS UN TAP. Sur le web, relâcher la souris après un glissement
// déclenchait AUSSI le tap de la ligne (un `click` suit le `mouseup`) : la ligne s'ouvrait
// puis se refermait aussitôt — vu au navigateur, journal à l'appui. Le tap vit donc ICI,
// avec le geste : un tap qui suit un glissement est ignoré, une fois, et la marque tombe au
// contact suivant (`onPressIn`) — en natif, où aucun tap ne suit, le vrai tap d'après passe.
//
// 🔴 UN GESTE NE SE VÉRIFIE PAS SUR LE WEB (CLAUDE.md §5) : le navigateur fait passer le
// glissement par la souris, que le système de responder voit toujours. Validé au simulateur.

interface Props {
  /** Le contenu de la ligne (nom, quantité). */
  children: React.ReactNode;
  /** Le style de la ligne pressable. */
  styleLigne: StyleProp<ViewStyle>;
  /** Toucher la ligne (hors glissement). */
  onTouche: () => void;
  /** Ce que fait « Supprimer » — le bouton comme le glissement long. */
  onSupprimer: () => void;
  /** Le bouton est-il ouvert ? Une seule ligne l'est à la fois : l'écran le tient. */
  ouverte: boolean;
  onOuvrir: () => void;
  onFermer: () => void;
  /** Début et fin d'un glissement, pour couper le défilement de l'écran pendant. */
  onGlisse: (enCours: boolean) => void;
  /** La ligne porte les coins arrondis de sa carte quand elle en est la première / dernière. */
  premiere?: boolean;
  derniere?: boolean;
}

export function LigneGlissable({ children, styleLigne, onTouche, onSupprimer, ouverte, onOuvrir, onFermer, onGlisse, premiere, derniere }: Props) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const x = useRef(new Animated.Value(0)).current;
  const largeur = useRef(0);
  const depart = useRef(0);
  const position = useRef(0);
  const seuilAtteint = useRef(false);
  const supprimee = useRef(false);
  const vientDeGlisser = useRef(false);
  const rappels = useRef({ onTouche, onSupprimer, onOuvrir, onFermer, onGlisse });
  rappels.current = { onTouche, onSupprimer, onOuvrir, onFermer, onGlisse };

  useEffect(() => {
    const id = x.addListener(({ value }) => { position.current = value; });
    return () => x.removeListener(id);
  }, [x]);

  // ⚠️ Un ressort sans rebond APPROCHE sa cible sans fin : par défaut il ne se déclare au
  // repos qu'à un millième de point, et la suppression qui attend sa fin partait plus d'une
  // seconde après que la ligne avait quitté l'écran (vu au navigateur). Pour une ligne qui
  // SORT, un point près suffit : ce qui reste est déjà hors de vue.
  const amener = (cible: number, vitesse = 0, fin?: () => void) => {
    Animated.spring(x, {
      toValue: cible,
      velocity: vitesse,
      useNativeDriver: true,
      ...ressortRN(ressortReduit(RESSORT.pose, reduceMotionActif())),
      ...(fin ? { restDisplacementThreshold: 1, restSpeedThreshold: 20 } : null),
    }).start(fin);
  };

  const supprimer = () => {
    if (supprimee.current) return;
    supprimee.current = true;
    rappels.current.onSupprimer();
  };

  // Une autre ligne s'ouvre, l'écran défile, un tap ailleurs : on referme.
  useEffect(() => {
    if (!ouverte && position.current < 0 && !supprimee.current) amener(0);
  }, [ouverte]);

  const horizontal = (dx: number, dy: number) => Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => horizontal(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_, g) => horizontal(g.dx, g.dy),
      onPanResponderGrant: () => {
        x.stopAnimation();
        depart.current = position.current;
        seuilAtteint.current = false;
        rappels.current.onGlisse(true);
      },
      onPanResponderMove: (_, g) => {
        const brut = depart.current + g.dx;
        // Vers la droite, rien à révéler : le bord résiste au lieu de s'arrêter net.
        x.setValue(brut > 0 ? caoutchouc(brut, largeur.current) : brut);
        // Le déclic dit « relâcher supprime » au moment où c'est vrai, pas après.
        const franchi = seuilSuppressionFranchi(brut, largeur.current);
        if (franchi && !seuilAtteint.current) retour('declic');
        seuilAtteint.current = franchi;
      },
      onPanResponderRelease: (_, g) => {
        vientDeGlisser.current = true;
        rappels.current.onGlisse(false);
        const v = vitesseDepuisPan(g.vx);
        const decision = decisionGlissement(Math.min(0, depart.current + g.dx), v, largeur.current);
        if (decision === 'supprimer') {
          amener(-largeur.current, v, supprimer);
        } else if (decision === 'ouvrir') {
          amener(-GLISSEMENT.bouton, v);
          rappels.current.onOuvrir();
        } else {
          amener(0, v);
          rappels.current.onFermer();
        }
      },
      // Refuser de céder un geste commencé ; s'il est repris quand même (appel entrant,
      // défilement natif), la ligne revient en place — sinon elle resterait à mi-course.
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        vientDeGlisser.current = true;
        rappels.current.onGlisse(false);
        amener(0);
        rappels.current.onFermer();
      },
    })
  ).current;

  // Le libellé suit le bord de la ligne une fois le bouton dépassé, comme chez Apple : il
  // reste collé à ce qu'on tire au lieu de rester seul au fond de la zone rouge.
  const suivi = x.interpolate({
    inputRange: [-4000, -GLISSEMENT.bouton, 0],
    outputRange: [-(4000 - GLISSEMENT.bouton), 0, 0],
    extrapolate: 'clamp',
  });

  // Le rouge n'existe que si la ligne s'écarte : au repos, ses bords se devinaient à
  // travers l'anticrénelage des coins arrondis (vu au navigateur, un liseré rose).
  const presenceFond = x.interpolate({ inputRange: [-1, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const coins = {
    borderTopLeftRadius: premiere ? Radius.card : 0,
    borderTopRightRadius: premiere ? Radius.card : 0,
    borderBottomLeftRadius: derniere ? Radius.card : 0,
    borderBottomRightRadius: derniere ? Radius.card : 0,
  };

  return (
    <View style={[s.conteneur, coins]} onLayout={(e) => { largeur.current = e.nativeEvent.layout.width; }} {...pan.panHandlers}>
      {/* Le fond rouge est TOUT ENTIER le bouton : ce que la ligne découvre se touche. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: presenceFond }]}>
      <Presse
        style={[StyleSheet.absoluteFill, s.fond]}
        onPress={() => amener(-largeur.current, 0, supprimer)}
        accessibilityLabel="Supprimer"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Animated.View style={[s.zoneLibelle, { transform: [{ translateX: suivi }] }]}>
          <Text style={s.libelle}>Supprimer</Text>
        </Animated.View>
      </Presse>
      </Animated.View>
      {/* La ligne qui glisse n'a PAS de coins à elle : c'est le cadre qui arrondit, sinon son
          bord droit s'arrondissait contre le rouge (vu au navigateur). */}
      <Animated.View style={[s.ligne, { transform: [{ translateX: x }] }]}>
        <Presse
          style={styleLigne}
          onPressIn={() => { vientDeGlisser.current = false; }}
          onPress={() => {
            if (vientDeGlisser.current) { vientDeGlisser.current = false; return; }
            rappels.current.onTouche();
          }}
          // VoiceOver ne glisse pas : la suppression lui est offerte comme une action.
          accessibilityActions={[{ name: 'supprimer', label: 'Supprimer' }]}
          onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'supprimer') supprimer(); }}
        >
          {children}
        </Presse>
      </Animated.View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    conteneur: { overflow: 'hidden' },
    fond: { backgroundColor: t.danger, alignItems: 'flex-end', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN },
    zoneLibelle: { width: GLISSEMENT.bouton, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xs },
    libelle: { ...Type.bodySmallStrong, color: t.onDanger },
    ligne: { backgroundColor: t.card },
  });
}
