import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { RESSORT, DUREE, ressortRN, ressortReduit, dureeReduite } from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';
import { useTheme, Radius, Spacing, Type, Trait, Fond } from '../constants/theme';
import { PrimaryButton } from './ui';
import { celebrationCopy } from '../lib/streak';

interface Props {
  milestone: number | null; // nb de jours du palier franchi ; null = masqué
  onClose: () => void;
}

/**
 * Moment de récompense quand un palier de série est franchi (3/7/14…). Centré,
 * animé (pop ressort + fondu). Le palier 7 = le cap d'habitude (METRICS.md §1 —
 * la série n'est PAS la north star, elle compte des ouvertures).
 *
 * ⚠️ L'OBJET VISUEL EST LE NOMBRE DE JOURS, pas un emblème (E22, 2026-08-09). Il
 * portait jusque-là un émoji différent par palier, rendu en 56 px — une échelle de
 * badges, donc de la collection, interdite par CLAUDE.md §5. Le raisonnement est
 * dans `lib/streak.ts::celebrationCopy`.
 * ➡️ Conséquence de mise en page : la taille passe par `Type.hero` (40) et non par
 * un 56 en dur. Un chiffre est de la TYPOGRAPHIE, là où un émoji dimensionné est une
 * image — `typoDA.test.ts` laissait donc passer le 56 tant que le style s'appelait
 * `emoji`, et le refuse maintenant, à juste titre.
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
      const reduire = reduceMotionActif();
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          ...ressortRN(ressortReduit(RESSORT.fete, reduire)),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: dureeReduite(DUREE.court, reduire),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;
  const copy = celebrationCopy(milestone);

  return (
    // Double fondu retiré : la `Modal` fondait en plus de la carte.
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Fond tapable pour fermer ; la carte au-dessus absorbe ses propres taps. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.line, opacity, transform: [{ scale }] },
          ]}
        >
          <Text style={[styles.jours, { color: t.accent }]}>{copy.jours}</Text>
          <Text style={[styles.libelle, { color: t.text }]}>{copy.libelle}</Text>
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
    borderWidth: Trait.fin,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  // Le chiffre et son libellé forment UN groupe : `xs` entre eux, `md` avant le
  // corps de texte (cf. CLAUDE.md §8, « le blanc DIT ce qui va ensemble »).
  jours: { ...Type.hero, textAlign: 'center' },
  libelle: { ...Type.h2, textAlign: 'center', marginTop: Spacing.xs },
  body: { ...Type.body, lineHeight: 21, textAlign: 'center', marginTop: Spacing.md },
});
