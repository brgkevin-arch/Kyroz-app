import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Type, Spacing } from '../constants/theme';
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
// ⚠️ Le héros était le total PRÉVU du plan (2026-08-03, refonte design) ; il est
// passé en sous-titre, puis il a été RETIRÉ le 2026-08-14 (décision fondateur).
// Ne pas le « re-promouvoir » sans le dire : deux gros chiffres sur le même écran
// et personne ne sait lequel compte.
//
// 🔴 **CE QU'ON PERD EN LE RETIRANT, ET C'EST ASSUMÉ** : quand le plan ne tombe pas
// exactement sur la cible, le total réellement servi n'est plus lisible d'un coup
// d'œil. C'est acceptable pour une seule raison — les deux cas où l'écart compte
// sont dits en toutes lettres, chacun par une phrase qui n'apparaît que là :
//   · sous la cible → `plan.tsx::SousCibleNote`, qui explique et rassure ;
//   · au-dessus → la ligne ci-dessous.
// ➡️ Si l'une des deux disparaissait, l'écran mentirait par omission. Elles vont
// avec ce retrait, elles ne sont pas décoratives.
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
        {/* Le plan monte AU-DESSUS de la cible : personne d'autre ne le dit.
            ⚠️ Le sens INVERSE n'est pas oublié — il est dit mieux ailleurs, par
            `plan.tsx::SousCibleNote` (« ta journée s'arrête N kcal sous ta cible,
            les portions ne peuvent pas monter plus haut »), qui explique POURQUOI
            et rassure. Les deux se recouvraient : c'était l'une des « phrases
            inutiles ». Ne pas remettre le dépassement dans les deux sens.
            ⚠️ Et on ne redit plus « Cible X kcal » : la cible est déjà le
            dénominateur du chiffre héros, deux lignes plus haut. */}
        {planDelta > ON_TARGET_TOLERANCE_KCAL && (
          <Text style={[styles.sub, { color: t.textTertiary }]}>
            Ton plan monte {planDelta.toLocaleString('fr-FR')} kcal au-dessus de ta cible.
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
