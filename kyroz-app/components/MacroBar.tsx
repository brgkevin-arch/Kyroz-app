import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface MacroBarProps {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal: number;
  targetKcal?: number;
}

export function MacroBar({ protein_g, carbs_g, fat_g, kcal, targetKcal }: MacroBarProps) {
  const t = useTheme();
  const total = protein_g * 4 + carbs_g * 4 + fat_g * 9;
  const p = total > 0 ? (protein_g * 4) / total : 0.33;
  const c = total > 0 ? (carbs_g * 4) / total : 0.33;
  const f = total > 0 ? (fat_g * 9) / total : 0.33;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.kcalRow}>
        <Text style={[styles.kcal, { color: t.text }]}>{kcal.toLocaleString('fr-FR')}</Text>
        {targetKcal != null
          ? <Text style={[styles.kcalSub, { color: t.textTertiary }]}> / {targetKcal.toLocaleString('fr-FR')} kcal</Text>
          : <Text style={[styles.kcalSub, { color: t.textTertiary }]}> kcal</Text>}
      </View>

      <View style={styles.bar}>
        <View style={{ flex: p, backgroundColor: t.protein, borderRadius: 4 }} />
        <View style={{ flex: c, backgroundColor: t.carbs, borderRadius: 4 }} />
        <View style={{ flex: f, backgroundColor: t.fat, borderRadius: 4 }} />
      </View>

      <View style={styles.legend}>
        <Legend color={t.protein} label="Protéines" value={protein_g} c={t.textSecondary} />
        <Legend color={t.carbs} label="Glucides" value={carbs_g} c={t.textSecondary} />
        <Legend color={t.fat} label="Lipides" value={fat_g} c={t.textSecondary} />
      </View>
    </View>
  );
}

function Legend({ color, label, value, c }: { color: string; label: string; value: number; c: string }) {
  return (
    <View style={styles.leg}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legText, { color: c }]}>{label} {value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kcalRow: { flexDirection: 'row', alignItems: 'baseline' },
  kcal: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  kcalSub: { fontSize: 15 },
  bar: { flexDirection: 'row', height: 7, gap: 3 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 3 },
  legText: { fontSize: 13 },
});
