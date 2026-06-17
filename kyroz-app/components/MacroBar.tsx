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

// Affichage A1 : un seul chiffre héros = la CIBLE, partout. Le réalisé (plan du
// jour) et le RESTANT sont visibles mais explicitement étiquetés — jamais pris
// pour « tes calories ». Au réveil → la cible ; en cours de journée → le restant
// (barre de progression du consommé). Le TDEE n'apparaît pas ici (écran Réglages).
export function MacroBar({ protein_g, carbs_g, fat_g, targetKcal, plannedKcal, consumedKcal }: MacroBarProps) {
  const t = useTheme();
  const total = protein_g * 4 + carbs_g * 4 + fat_g * 9;
  const p = total > 0 ? (protein_g * 4) / total : 0.33;
  const c = total > 0 ? (carbs_g * 4) / total : 0.33;
  const f = total > 0 ? (fat_g * 9) / total : 0.33;

  const consumed = consumedKcal ?? 0;
  const tracking = consumed > 0;
  const remaining = Math.max(0, targetKcal - consumed);
  const progress = targetKcal > 0 ? Math.min(1, consumed / targetKcal) : 0;

  const planDelta = plannedKcal - targetKcal;
  const onTarget = Math.abs(planDelta) <= 100;
  const sign = planDelta > 0 ? '+' : '';

  return (
    <View style={{ gap: 12 }}>
      {/* Héros = la cible */}
      <View>
        <Text style={[styles.heroLabel, { color: t.textTertiary }]}>Ta cible</Text>
        <View style={styles.kcalRow}>
          <Text style={[styles.kcal, { color: t.text }]}>{targetKcal.toLocaleString('fr-FR')}</Text>
          <Text style={[styles.kcalSub, { color: t.textTertiary }]}> kcal</Text>
        </View>
      </View>

      {/* En cours de journée → restant + progression ; sinon → plan du jour vs cible */}
      {tracking ? (
        <View style={{ gap: 6 }}>
          <View style={styles.progressTrack}>
            <View style={{ flex: progress, backgroundColor: t.accent, borderRadius: 4 }} />
            <View style={{ flex: 1 - progress }} />
          </View>
          <Text style={[styles.statusTxt, { color: t.textSecondary }]}>
            Consommé {consumed.toLocaleString('fr-FR')} · <Text style={{ color: t.text, fontWeight: '700' }}>reste {remaining.toLocaleString('fr-FR')} kcal</Text>
          </Text>
        </View>
      ) : (
        <Text style={[styles.statusTxt, { color: t.textSecondary }]}>
          Plan du jour {plannedKcal.toLocaleString('fr-FR')} kcal ·{' '}
          <Text style={{ color: onTarget ? t.success : t.warning, fontWeight: '700' }}>
            {onTarget ? '✓ dans la cible' : `${sign}${planDelta} kcal`}
          </Text>
        </Text>
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
  statusTxt: { fontSize: 13 },
  progressTrack: { flexDirection: 'row', height: 7, borderRadius: 4, backgroundColor: 'rgba(127,127,127,0.18)', overflow: 'hidden' },
  bar: { flexDirection: 'row', height: 7, gap: 3 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 3 },
  legText: { fontSize: 13 },
});
