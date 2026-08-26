import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Type, Spacing } from '../constants/theme';

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
// ⚠️ Le héros était le total PRÉVU du plan (2026-08-03, refonte design) ; il est
// passé en sous-titre, puis il a été RETIRÉ le 2026-08-14 (décision fondateur).
// Ne pas le « re-promouvoir » sans le dire : deux gros chiffres sur le même écran
// et personne ne sait lequel compte.
//
// 🔴 **CE QU'ON PERD, ET C'EST ASSUMÉ** : quand le plan ne tombe pas exactement sur
// la cible, le total réellement servi n'est plus lisible d'un coup d'œil. Une ligne
// le disait encore dans le sens du DÉPASSEMENT (« Ton plan monte N kcal au-dessus de
// ta cible. ») — RETIRÉE le 2026-08-25 (décision fondateur), après le héros.
// ➡️ Conséquence, à connaître avant de croire à un oubli : **au-dessus de la cible,
// plus rien ne le dit sur cet écran**. C'est un choix, pas un trou.
//
// ⚠️ Le sens INVERSE, lui, reste dit — et par un seul endroit :
// `plan.tsx::SousCibleNote` (« ta journée s'arrête N kcal sous ta cible, les portions
// ne peuvent pas monter plus haut »), qui explique POURQUOI et rassure. Ne pas le
// retirer « par symétrie » avec celui-ci : il n'énonce pas un écart, il explique une
// limite du catalogue.
//
// ⚠️ Et on ne redit jamais « Cible X kcal » ici : la cible est déjà le dénominateur
// du chiffre héros.
export function MacroBar({ protein_g, carbs_g, fat_g, targetKcal, plannedKcal, consumedKcal }: MacroBarProps) {
  const t = useTheme();
  const total = protein_g * 4 + carbs_g * 4 + fat_g * 9;
  const p = total > 0 ? (protein_g * 4) / total : 0.33;
  const c = total > 0 ? (carbs_g * 4) / total : 0.33;
  const f = total > 0 ? (fat_g * 9) / total : 0.33;

  const consumed = consumedKcal ?? 0;
  const tracking = consumed > 0;
  const remaining = Math.max(0, plannedKcal - consumed);

  return (
    <View style={{ gap: Spacing.lg }}>
      {/* Héros = ce qui est déjà mangé, sur la cible du jour */}
      <View>
        <View style={styles.kcalRow}>
          <Text style={[styles.kcal, { color: t.text }]}>{consumed.toLocaleString('fr-FR')}</Text>
          <Text style={[styles.kcalSub, { color: t.textTertiary }]}> / {targetKcal.toLocaleString('fr-FR')} kcal</Text>
        </View>
        {/* ⚠️ IL NE RESTE QU'UNE LIGNE, ET ELLE NE PARAÎT QUE SI ELLE A QUELQUE
            CHOSE À DIRE (2026-08-14, décision fondateur : « 2 800 calories prévues
            sur la journée, tu peux l'enlever, ça fera plus épuré »). */}
        {tracking && (
          <Text style={[styles.sub, { color: t.text, fontWeight: '700' }]}>
            Reste {remaining.toLocaleString('fr-FR')} kcal
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
  kcal: { ...Type.hero, letterSpacing: -1.4 },
  kcalSub: { ...Type.h3 },
  sub: { ...Type.bodySmall, lineHeight: 19, marginTop: Spacing.xs },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  legend: { ...Type.bodySmall, lineHeight: 19 },
});
