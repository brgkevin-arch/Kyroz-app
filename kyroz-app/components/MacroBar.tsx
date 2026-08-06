import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { ON_TARGET_TOLERANCE_KCAL } from '../lib/planEngine';

interface MacroBarProps {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  targetKcal: number;      // CIBLE du jour — le chiffre HÉROS (cohérent onboarding/profil/plan)
  plannedKcal: number;     // total projeté du jour (repas planifiés + ajustements)
  consumedKcal?: number;   // déjà consommé (mangé + hors-plan) ; 0/absent = rien mangé encore
}

// Affichage : le chiffre HÉROS est CE QUI A ÉTÉ MANGÉ, sur la cible du jour —
// « 0 / 2 112 kcal ». C'est la question qu'on se pose en ouvrant l'app en cours de
// journée, et le seul cadran qui bouge quand on coche un repas.
//
// ⚠️ Le héros était le total PRÉVU du plan (2026-08-03, refonte design). Le prévu
// n'a pas disparu — il est passé en sous-titre, avec son écart à la cible. Rien
// n'est perdu : ce qui change est l'ordre de lecture, pas l'information. Ne pas
// « re-promouvoir » le prévu sans le dire ; deux gros chiffres sur le même écran
// et personne ne sait lequel compte.
export function MacroBar({ protein_g, carbs_g, fat_g, targetKcal, plannedKcal, consumedKcal }: MacroBarProps) {
  const t = useTheme();
  const total = protein_g * 4 + carbs_g * 4 + fat_g * 9;
  const p = total > 0 ? (protein_g * 4) / total : 0.33;
  const c = total > 0 ? (carbs_g * 4) / total : 0.33;
  const f = total > 0 ? (fat_g * 9) / total : 0.33;

  const consumed = consumedKcal ?? 0;
  const tracking = consumed > 0;
  const remaining = Math.max(0, plannedKcal - consumed);

  const planDelta = plannedKcal - targetKcal;
  const onTarget = Math.abs(planDelta) <= ON_TARGET_TOLERANCE_KCAL;
  const sign = planDelta > 0 ? '+' : '';

  return (
    <View style={{ gap: 14 }}>
      {/* Héros = ce qui est déjà mangé, sur la cible du jour */}
      <View>
        <View style={styles.kcalRow}>
          <Text style={[styles.kcal, { color: t.text }]}>{consumed.toLocaleString('fr-FR')}</Text>
          <Text style={[styles.kcalSub, { color: t.textTertiary }]}> / {targetKcal.toLocaleString('fr-FR')} kcal</Text>
        </View>
        <Text style={[styles.sub, { color: t.textSecondary }]}>
          {plannedKcal.toLocaleString('fr-FR')} kcal prévus sur la journée
          {tracking
            ? <Text style={{ color: t.text, fontWeight: '600' }}>{` · reste ${remaining.toLocaleString('fr-FR')} kcal`}</Text>
            : ', rien de coché'}
        </Text>
        {!onTarget && (
          <Text style={[styles.sub, { color: t.textTertiary, marginTop: 2 }]}>
            Cible {targetKcal.toLocaleString('fr-FR')} kcal · {sign}{planDelta}
          </Text>
        )}
      </View>

      {/* Composition macro du jour — trois NUANCES d'une même couleur, sur une
          piste. Pas trois teintes : la couleur ne sert qu'à séparer des proportions
          côte à côte (cf. la note en tête de constants/theme.ts). En monochrome ce
          sont les gris système ; sinon, trois nuances de l'accent choisi. */}
      <View style={[styles.bar, { backgroundColor: t.fill }]}>
        <View style={{ flex: p, backgroundColor: t.protein }} />
        <View style={{ flex: c, backgroundColor: t.carbs }} />
        <View style={{ flex: f, backgroundColor: t.fat }} />
      </View>

      <Text style={[styles.legend, { color: t.textSecondary }]}>
        {protein_g} g de protéines · {carbs_g} g de glucides · {fat_g} g de lipides
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kcalRow: { flexDirection: 'row', alignItems: 'baseline' },
  kcal: { fontSize: 40, fontWeight: '700', letterSpacing: -1.4 },
  kcalSub: { fontSize: 17, fontWeight: '500' },
  sub: { fontSize: 14, lineHeight: 19, marginTop: 4 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  legend: { fontSize: 14, lineHeight: 19 },
});
