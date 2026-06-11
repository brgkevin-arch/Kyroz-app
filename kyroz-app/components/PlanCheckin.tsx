import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, cardShadow } from '../constants/theme';

interface Props {
  t: ThemePalette;
  onSatisfied: () => void;       // 👍 tout va bien
  onMoreVariety: () => void;     // trop répétitif → variété max
  onLessPrep: () => void;        // recettes trop longues → moins de prépa
  onNewPlan: () => void;         // juste régénérer
  onAdjustInProfile: () => void; // objectif/macros → renvoi vers Profil
  onOptOut: () => void;          // ne plus me demander
  dragHandlers?: any;
}

export function PlanCheckin({
  t, onSatisfied, onMoreVariety, onLessPrep, onNewPlan, onAdjustInProfile, onOptOut, dragHandlers,
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
        <Row icon="time-outline" label="Les recettes sont trop longues" sub="Réduire le temps de préparation" onPress={onLessPrep} />
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
    header: { paddingHorizontal: Spacing.xxl, paddingBottom: 12, gap: 8 },
    title: { color: t.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    intro: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    body: { paddingHorizontal: Spacing.xxl, gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.card, borderRadius: Radius.md, padding: 16 },
    icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    label: { color: t.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    sub: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
    optOut: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
    optOutTxt: { color: t.textTertiary, fontSize: 14, fontWeight: '600' },
    optOutHint: { color: t.textQuaternary, fontSize: 12, textAlign: 'center', marginTop: -6 },
  });
}
