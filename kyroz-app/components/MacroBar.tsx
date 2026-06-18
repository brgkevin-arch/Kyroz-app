import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface MacroBarProps {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  targetKcal: number;      // CIBLE du jour — le chiffre HÉROS (cohérent onboarding/profil/plan)
  plannedKcal: number;     // total projeté du jour (repas planifiés + ajustements)
  consumedKcal?: number;   // déjà consommé (mangé + hors-plan) ; 0/absent = rien mangé encore
}

// Affichage : le chiffre HÉROS = le TOTAL RÉEL du plan du jour (ce qu'on mange
// vraiment), pas la cible figée — la cible reste affichée juste en dessous, en
// référence, avec l'écart (✓ dans la cible / ±X). En cours de journée → barre de
// progression du consommé vers ce total. Le TDEE n'apparaît pas ici (Réglages).
export function MacroBar({ protein_g, carbs_g, fat_g, targetKcal, plannedKcal, consumedKcal }: MacroBarProps) {
  const t = useTheme();
  const total = protein_g * 4 + carbs_g * 4 + fat_g * 9;
  const p = total > 0 ? (protein_g * 4) / total : 0.33;
  const c = total > 0 ? (carbs_g * 4) / total : 0.33;
  const f = total > 0 ? (fat_g * 9) / total : 0.33;

  const consumed = consumedKcal ?? 0;
  const tracking = consumed > 0;
  const remaining = Math.max(0, plannedKcal - consumed);
  const progress = plannedKcal > 0 ? Math.min(1, consumed / plannedKcal) : 0;

  const planDelta = plannedKcal - targetKcal;
  const onTarget = Math.abs(planDelta) <= 100;
  const sign = planDelta > 0 ? '+' : '';

  return (
    <View style={{ gap: 12 }}>
      {/* Héros = le total RÉEL du plan du jour, cible en référence juste dessous */}
      <View>
        <Text style={[styles.heroLabel, { color: t.textTertiary }]}>Plan du jour</Text>
        <View style={styles.kcalRow}>
          <Text style={[styles.kcal, { color: t.text }]}>{plannedKcal.toLocaleString('fr-FR')}</Text>
          <Text style={[styles.kcalSub, { color: t.textTertiary }]}> kcal</Text>
        </View>
        <Text style={[styles.cibleRef, { color: onTarget ? t.success : t.warning }]}>
          Cible {targetKcal.toLocaleString('fr-FR')} kcal · {onTarget ? '✓ dans la cible' : `${sign}${planDelta}`}
        </Text>
      </View>

      {/* En cours de journée → progression du consommé vers le total du jour */}
      {tracking && (
        <View style={{ gap: 6 }}>
          <View style={styles.progressTrack}>
            <View style={{ flex: progress, backgroundColor: t.accent, borderRadius: 4 }} />
            <View style={{ flex: 1 - progress }} />
          </View>
          <Text style={[styles.statusTxt, { color: t.textSecondary }]}>
            Consommé {consumed.toLocaleString('fr-FR')} · <Text style={{ color: t.text, fontWeight: '700' }}>reste {remaining.toLocaleString('fr-FR')} kcal</Text>
          </Text>
        </View>
      )}

      {/* Composition macro du jour */}
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
  heroLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline' },
  kcal: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  kcalSub: { fontSize: 15 },
  cibleRef: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  statusTxt: { fontSize: 13 },
  progressTrack: { flexDirection: 'row', height: 7, borderRadius: 4, backgroundColor: 'rgba(127,127,127,0.18)', overflow: 'hidden' },
  bar: { flexDirection: 'row', height: 7, gap: 3 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 3 },
  legText: { fontSize: 13 },
});
