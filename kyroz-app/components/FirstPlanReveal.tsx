import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, ScrollView, Alert } from 'react-native';
import { useTheme, Radius, Spacing, ThemePalette } from '../constants/theme';
import { PrimaryButton, SectionLabel, Segmented } from './ui';
import { goalLabel } from '../lib/tdee';
import { Meal, UserProfile } from '../lib/types';
import { useReminder } from '../hooks/useReminder';
import { ReminderSlot, remindersSupported } from '../lib/notifications';
import { DISCLAIMER } from '../constants/legal';

const MEAL_EMOJI: Record<string, string> = { breakfast: '🍳', lunch: '🍗', dinner: '🍽️', snack: '🥤' };
const MEAL_LABEL: Record<string, string> = { breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' };
const SLOT_TIME: Record<string, string> = { morning: '8h00', midday: '12h00', evening: '18h30' };

interface Props {
  visible: boolean;
  profile: UserProfile;
  firstName: string;
  previewMeals: Meal[];       // aperçu (repas du jour 1), affichés en concret
  onClose: () => void;
}

/**
 * Reveal du 1er plan (J1) : moment de révélation après l'onboarding. Met en avant
 * ce qui est NOUVEAU — la vraie semaine de repas calée sur les cibles — et absorbe
 * le récap + le rappel quotidien + le disclaimer (l'étape « récap » de l'onboarding
 * a été supprimée, redondante). Affiché UNE seule fois (flag `@kyroz:firstPlanSeen`),
 * puis laisse place à la visite guidée.
 */
export function FirstPlanReveal({ visible, profile, firstName, previewMeals, onClose }: Props) {
  const t = useTheme();
  const s = makeStyles(t);
  const { slot, choose, busy } = useReminder();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 7, speed: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const pickReminder = async (v: ReminderSlot) => {
    if (busy) return;
    const ok = await choose(v);
    if (!ok && v !== 'off') {
      Alert.alert(
        remindersSupported ? 'Notifications désactivées' : 'Indisponible sur le web',
        remindersSupported
          ? 'Active les notifications de Kyroz dans les réglages de ton téléphone pour recevoir le rappel.'
          : 'Le rappel quotidien fonctionne sur l’app mobile (iOS/Android). Tu pourras l’activer là-bas.',
      );
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.root}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.emoji}>🎉</Text>
            <Text style={s.title}>C'est prêt{firstName ? `, ${firstName}` : ''} !</Text>
            <Text style={s.sub}>Ta semaine de repas est calée au plus juste sur ton objectif.</Text>

            <View style={s.statRow}>
              <Stat t={t} value={goalLabel(profile.goal)} label="Objectif" />
              <Stat t={t} value={`${profile.target_kcal}`} label="kcal / jour" />
              <Stat t={t} value={`${profile.plan_days}`} label={`jour${profile.plan_days > 1 ? 's' : ''}`} />
            </View>

            {previewMeals.length > 0 && (
              <View style={s.section}>
                <SectionLabel t={t}>Un aperçu de ta semaine</SectionLabel>
                <View style={{ gap: 10 }}>
                  {previewMeals.map((m) => (
                    <View key={m.id} style={s.mealRow}>
                      <Text style={s.mealEmoji}>{MEAL_EMOJI[m.meal_type] ?? '🍽️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.mealType}>{MEAL_LABEL[m.meal_type] ?? m.meal_type}</Text>
                        <Text style={s.mealName} numberOfLines={1}>{m.recipe.name_fr}</Text>
                      </View>
                      <Text style={s.mealKcal}>{Math.round(m.macros.kcal)} kcal</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Rappel quotidien (déplacé ici depuis l'étape récap supprimée) — levier
                rétention #1 : revenir chaque jour = série = North Star. */}
            <View style={s.section}>
              <SectionLabel t={t}>Un rappel chaque jour ?</SectionLabel>
              <Text style={[s.sub, { marginTop: -2, textAlign: 'left' }]}>
                Un petit coup de pouce quotidien pour consulter ton plan et ne pas casser ta série.
              </Text>
              <View style={{ height: 8 }} />
              <Segmented<ReminderSlot>
                t={t}
                value={slot}
                onChange={pickReminder}
                options={[
                  { label: 'Aucun', value: 'off' },
                  { label: 'Matin', value: 'morning' },
                  { label: 'Midi', value: 'midday' },
                  { label: 'Soir', value: 'evening' },
                ]}
              />
              <Text style={s.hint}>
                {slot === 'off' ? 'Modifiable à tout moment dans ton profil.' : `Chaque jour à ${SLOT_TIME[slot]}. Modifiable dans ton profil.`}
              </Text>
            </View>

            <View style={{ height: 18 }} />
            <PrimaryButton t={t} label="Voir mon plan 👊" onPress={onClose} />

            <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stat({ t, value, label }: { t: ThemePalette; value: string; label: string }) {
  // minHeight = 2 lignes réservées → les 3 colonnes alignent leurs libellés même
  // quand l'objectif (« Sèche progressive ») passe sur 2 lignes.
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: t.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, lineHeight: 19, minHeight: 38, textAlign: 'center' }} numberOfLines={2}>{value}</Text>
      <Text style={{ color: t.textTertiary, fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl },
    card: { width: '100%', maxWidth: 400, maxHeight: '88%', backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: Radius.xl },
    scroll: { padding: Spacing.xxl, alignItems: 'center' },
    emoji: { fontSize: 48, marginBottom: 6 },
    title: { color: t.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, alignSelf: 'stretch' },
    statRow: { flexDirection: 'row', alignSelf: 'stretch', gap: 8, marginTop: 18, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.line },
    section: { alignSelf: 'stretch', marginTop: 18, gap: 10 },
    mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mealEmoji: { fontSize: 20 },
    mealType: { color: t.textTertiary, fontSize: 11, fontWeight: '600' },
    mealName: { color: t.text, fontSize: 14, fontWeight: '600', marginTop: 1 },
    mealKcal: { color: t.textSecondary, fontSize: 12, fontWeight: '700' },
    hint: { color: t.textTertiary, fontSize: 12, lineHeight: 16, marginTop: 8 },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18 },
  });
}
