import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useTheme, Radius, Spacing } from '../constants/theme';
import { PrimaryButton } from './ui';
import { celebrationCopy } from '../lib/streak';

interface Props {
  milestone: number | null; // nb de jours du palier franchi ; null = masqué
  onClose: () => void;
}

/**
 * Moment de récompense quand un palier de série est franchi (3/7/14…). Centré,
 * animé (pop ressort + fondu), monochrome. Le palier 7 = le cap du North Star.
 */
export function StreakCelebration({ milestone, onClose }: Props) {
  const t = useTheme();
  const visible = milestone != null;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.8);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 9, speed: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;
  const copy = celebrationCopy(milestone);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Fond tapable pour fermer ; la carte au-dessus absorbe ses propres taps. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.line, opacity, transform: [{ scale }] },
          ]}
        >
          <Text style={styles.emoji}>{copy.emoji}</Text>
          <Text style={[styles.title, { color: t.text }]}>{copy.title}</Text>
          <Text style={[styles.body, { color: t.textSecondary }]}>{copy.body}</Text>
          <View style={{ height: 8 }} />
          <PrimaryButton t={t} label="Continuer" onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
});
