import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme, Radius, Spacing, Type, ThemePalette, Trait , Icone } from '../constants/theme';
import { PrimaryButton, SectionLabel } from './ui';
import { goalLabel } from '../lib/tdee';
import { baseDayTargets } from '../lib/planEngine';
import { Meal, UserProfile } from '../lib/types';
import { DISCLAIMER } from '../constants/legal';
import { ReussiteIcon, IconeRepas } from './Icons';

const MEAL_LABEL: Record<string, string> = { breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' };

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
 * le récap + le disclaimer (l'étape « récap » de l'onboarding a été supprimée,
 * redondante). Le RAPPEL QUOTIDIEN, lui, vit uniquement dans le Profil → Réglages.
 * Affiché UNE seule fois (flag `@kyroz:firstPlanSeen`), puis laisse place à la visite guidée.
 */
export function FirstPlanReveal({ visible, profile, firstName, previewMeals, onClose }: Props) {
  const t = useTheme();
  const s = makeStyles(t);
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

  // Les jours diffèrent-ils réellement ? Sur un profil sans sport déclaré, non — et
  // dire « en moyenne » y serait une précaution qui embrouille pour rien.
  // ⚠️ AVANT le `return null` ci-dessous, et pas après : posé plus bas, ce `useMemo`
  // n'existait qu'aux rendus visibles → « Rendered more hooks than during the previous
  // render », et l'écran de bienvenue tombait dans l'ErrorBoundary. Ni `tsc` ni les
  // 1065 tests ne l'ont vu ; seul le rendu le montre.
  const modulé = useMemo(() => {
    const j = baseDayTargets(profile, Math.max(1, Math.min(profile.plan_days ?? 7, 7)));
    return Math.max(...j) - Math.min(...j) >= 40;
  }, [profile]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.root}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <ReussiteIcon color={t.accent} size={Icone.fete} />
            <Text style={s.title}>C'est prêt{firstName ? `, ${firstName}` : ''} !</Text>
            <Text style={s.sub}>Ta semaine de repas est calée au plus juste sur ton objectif.</Text>

            <View style={s.statRow}>
              <Stat t={t} value={goalLabel(profile.goal)} label="Objectif" />
              {/* « en moyenne » et pas « / jour » : depuis la répartition par volume
                  (2026-08-06) aucune journée ne vaut exactement ce chiffre — un jour
                  d'entraînement vise plus haut, un jour de repos plus bas. Annoncer
                  « kcal / jour » sur le TOUT PREMIER écran serait ouvrir la relation
                  sur un nombre que le plan juste en dessous contredit. */}
              <Stat t={t} value={`${profile.target_kcal}`} label={modulé ? 'kcal en moyenne' : 'kcal / jour'} />
              <Stat t={t} value={`${profile.plan_days}`} label={`jour${profile.plan_days > 1 ? 's' : ''}`} />
            </View>

            {previewMeals.length > 0 && (
              <View style={s.section}>
                <SectionLabel t={t}>Un aperçu de ta semaine</SectionLabel>
                <View style={{ gap: Spacing.md }}>
                  {previewMeals.map((m) => (
                    <View key={m.id} style={s.mealRow}>
                      <IconeRepas type={m.meal_type} color={t.textSecondary} size={Icone.standard} />
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

            <View style={{ height: 18 }} />
            <PrimaryButton t={t} label="Voir mon plan" onPress={onClose} />

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
      <Text style={{ ...Type.label, color: t.text, letterSpacing: -0.3, lineHeight: 19, minHeight: 38, textAlign: 'center' }} numberOfLines={2}>{value}</Text>
      <Text style={{ ...Type.microStrong, color: t.textTertiary, marginTop: Spacing.xs, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl },
    card: { width: '100%', maxWidth: 400, maxHeight: '88%', backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.xl },
    scroll: { padding: Spacing.xxl, alignItems: 'center' },
    emoji: { fontSize: 48, marginBottom: Spacing.sm },
    title: { color: t.text, ...Type.h2, textAlign: 'center' },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm, alignSelf: 'stretch' },
    statRow: { flexDirection: 'row', alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.xl, paddingVertical: Spacing.lg, borderTopWidth: Trait.fin, borderBottomWidth: Trait.fin, borderColor: t.line },
    section: { alignSelf: 'stretch', marginTop: Spacing.xl, gap: Spacing.md },
    mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    mealEmoji: { fontSize: 20 },
    mealType: { ...Type.microStrong, color: t.textTertiary },
    mealName: { ...Type.bodySmallStrong, color: t.text, marginTop: Spacing.xs },
    mealKcal: { ...Type.captionStrong, color: t.textSecondary },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: Spacing.xl },
  });
}
