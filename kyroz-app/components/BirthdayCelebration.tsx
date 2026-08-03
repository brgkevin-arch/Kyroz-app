import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { useTheme, Radius, Spacing } from '../constants/theme';
import { PrimaryButton } from './ui';

interface Props {
  /** Âge atteint aujourd'hui ; `null` = masqué. */
  age: number | null;
  firstName?: string;
  onClose: () => void;
}

// Confettis : positions et retards FIXES, pas tirés au hasard.
// `Math.random()` rendrait l'animation non reproductible — donc intestable, et
// susceptible de produire un jour une grappe moche. Douze pastilles réparties à
// la main suffisent amplement à l'effet.
const CONFETTIS = [
  { x: -130, delay: 0 }, { x: -96, delay: 120 }, { x: -62, delay: 240 },
  { x: -28, delay: 60 }, { x: 6, delay: 300 }, { x: 40, delay: 180 },
  { x: 74, delay: 0 }, { x: 108, delay: 260 }, { x: 140, delay: 100 },
  { x: -110, delay: 380 }, { x: 22, delay: 440 }, { x: 124, delay: 340 },
];

// ⚠️ Palette PROPRE aux confettis, et surtout PAS les tokens de macro.
// Ils l'étaient (`[t.protein, t.carbs, t.fat, t.accent]`) : un détournement qui
// marchait tant que ces tokens valaient bleu / jaune / rouge, et qui est devenu
// douze pastilles GRISES le jour où les macros sont passées en nuances d'un même
// gris (refonte design 2026-08-03). Des confettis gris pour un anniversaire, ça
// n'est pas une sobriété assumée, c'est une panne.
// C'est le seul endroit de l'app qui a le droit à de la couleur franche : il dure
// deux secondes, une fois par an, et ne code aucune information.
const CONFETTI_COULEURS = ['#F0B429', '#E0524E', '#3B7BE0', '#7FD49B', '#B57BE0'];

/**
 * Petit moment d'anniversaire. Une fois par an, à l'ouverture du Plan.
 *
 * ⚠️ Ce n'est PAS de la gamification de compétition (CLAUDE.md §5) : rien n'est
 * gagné, compté, ni comparé à qui que ce soit. C'est une attention, et elle a un
 * corollaire utile — c'est le jour où l'âge du profil change tout seul, donc où
 * la dépense estimée bouge légèrement. Autant que ça se voie gentiment plutôt
 * que dans le dos de l'utilisateur.
 */
export function BirthdayCelebration({ age, firstName, onClose }: Props) {
  const t = useTheme();
  const visible = age != null;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const chute = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.8);
    opacity.setValue(0);
    chute.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 11 }),
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(chute, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Confettis — purement décoratifs, donc non tapables : ils ne doivent pas
            intercepter le tap qui ferme la fenêtre. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {CONFETTIS.map((c, i) => {
            const progres = chute.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  marginLeft: c.x,
                  width: i % 3 === 0 ? 7 : 5,
                  height: i % 2 === 0 ? 12 : 7,
                  borderRadius: 2,
                  backgroundColor: CONFETTI_COULEURS[i % CONFETTI_COULEURS.length],
                  opacity: progres.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateY: progres.interpolate({ inputRange: [0, 1], outputRange: [-40, 760] }) },
                    { rotate: progres.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 540}deg`] }) },
                  ],
                }}
              />
            );
          })}
        </View>

        <Animated.View
          style={[styles.card, { backgroundColor: t.card, borderColor: t.line, opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.emoji}>🎂</Text>
          <Text style={[styles.title, { color: t.text }]}>
            {firstName ? `Joyeux anniversaire, ${firstName} !` : 'Joyeux anniversaire !'}
          </Text>
          <Text style={[styles.body, { color: t.textSecondary }]}>
            {age} ans aujourd'hui. Kyroz a mis ton âge à jour tout seul — ton plan
            reste calé sur toi, sans que tu aies rien à toucher.
          </Text>
          <View style={{ height: 8 }} />
          <PrimaryButton t={t} label="Merci 🙂" onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl },
  card: {
    width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.xxxl, alignItems: 'center',
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
});
