import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, cardShadow } from '../constants/theme';

interface Props {
  t: ThemePalette;
  onSatisfied: () => void;       // 👍 tout va bien
  onMoreVariety: () => void;     // trop répétitif → variété max
  onNewPlan: () => void;         // juste régénérer
  onAdjustInProfile: () => void; // objectif/macros → renvoi vers Profil
  onOptOut: () => void;          // ne plus me demander
  dragHandlers?: any;
}

export function PlanCheckin({
  t, onSatisfied, onMoreVariety, onNewPlan, onAdjustInProfile, onOptOut, dragHandlers,
}: Props) {
  const s = useMemo(() => makeStyles(t), [t]);

  const Row = ({ icon, label, sub, onPress, primary }: {
    icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void; primary?: boolean;
  }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.row, cardShadow(t), primary && { borderColor: t.accent, borderWidth: 1.5 }]}>
      <View style={[s.icon, { backgroundColor: t.fill }]}>
        <Ionicons name={icon} size={18} color={t.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header} {...(dragHandlers ?? {})}>
        <Text style={s.title}>Ton plan te convient ?</Text>
        <Text style={s.intro}>Dis-nous ce qui coince — on ajuste tout de suite.</Text>
      </View>

      <View style={s.body}>
        <Row icon="checkmark-circle-outline" label="Oui, il me va bien" sub="On continue comme ça" onPress={onSatisfied} primary />
        <Row icon="shuffle-outline" label="Trop répétitif" sub="Passer en variété maximale" onPress={onMoreVariety} />
        <Row icon="flag-outline" label="Je veux changer d'objectif ou mes macros" sub="Ouvre les réglages du profil" onPress={onAdjustInProfile} />
        <Row icon="refresh-outline" label="Juste un nouveau plan" sub="Régénérer pour cette semaine" onPress={onNewPlan} />

        <TouchableOpacity onPress={onOptOut} activeOpacity={0.7} style={s.optOut}>
          <Text style={s.optOutTxt}>Ne plus me demander</Text>
        </TouchableOpacity>
        <Text style={s.optOutHint}>Tu pourras réactiver ces propositions dans Profil.</Text>
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    header: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.md, gap: Spacing.sm },
    title: { color: t.text, ...Type.h2 },
    intro: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    body: { paddingHorizontal: Spacing.xxl, gap: Spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg },
    icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    label: { ...Type.label, color: t.text, letterSpacing: -0.2 },
    sub: { ...Type.caption, color: t.textSecondary, marginTop: Spacing.xs },
    optOut: { alignItems: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.sm },
    optOutTxt: { ...Type.bodySmallStrong, color: t.textTertiary },
    optOutHint: { ...Type.caption, color: t.textQuaternary, textAlign: 'center', marginTop: -Spacing.sm },
  });
}
