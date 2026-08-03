import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemePalette, Radius, Spacing, Type, cardShadow } from '../constants/theme';
import { WeightChart } from './WeightChart';
import { GoalTarget } from '../lib/types';
import { WeightEntry } from '../lib/weight';

interface Props {
  t: ThemePalette;
  /** Poids du PROFIL — ce que le moteur utilise réellement pour calculer le plan. */
  profileWeightKg: number;
  entries: WeightEntry[];
  /** Écart avec la pesée précédente (kg, signé) ou null s'il n'y en a qu'une. */
  delta: number | null;
  /** Une pesée est attendue aujourd'hui (cadence choisie par l'utilisateur). */
  due?: boolean;
  goalTarget?: GoalTarget;
  onPress: () => void;
}

// ── Carte « Suivi du poids » ────────────────────────────────────────────────
//
// Le suivi du poids était une simple ligne de menu (« Suivi du poids · 82 kg »),
// posée sous une grosse carte de série qui occupait le haut de l'écran. C'est
// l'inverse de leur importance réelle : le poids ALIMENTE le moteur (il recalcule
// TDEE, macros et plan à chaque pesée), la série ne fait que raconter l'assiduité.
// Les deux ont donc échangé leur place le 2026-08-02.
//
// ⚠️ TON — règle produit CLAUDE.md §10 : le suivi doit RASSURER, jamais mettre la
// pression. Concrètement ici : l'écart est affiché en couleur NEUTRE (jamais rouge
// pour une hausse — un poids qui monte n'est pas une faute), aucune flèche
// dramatique, et l'absence de pesée n'est pas un reproche mais une invitation.

export function WeightSummaryCard({
  t, profileWeightKg, entries, delta, due, goalTarget, onPress,
}: Props) {
  const s = makeStyles(t);
  // On affiche le poids du PROFIL : c'est celui qui sert le plan. Il peut différer
  // d'une pesée rétroactive (backfill d'une date passée), et montrer autre chose que
  // ce que le moteur utilise serait un chiffre faux au sens de « pas de mensonge ».
  const poids = profileWeightKg;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.card, cardShadow(t)]}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>SUIVI DU POIDS</Text>
          <View style={s.valueRow}>
            <Text style={s.value}>{poids}</Text>
            <Text style={s.unit}>kg</Text>
            {delta != null && (
              <Text style={s.delta}>
                {delta > 0 ? '+' : ''}{delta} kg depuis la précédente
              </Text>
            )}
          </View>
        </View>
        <View style={s.cta}>
          <Text style={s.ctaTxt}>{due ? 'Me peser' : 'Ajouter'}</Text>
        </View>
      </View>

      {entries.length >= 2 ? (
        <WeightChart t={t} entries={entries} width={260} height={96} goalTarget={goalTarget} />
      ) : (
        <Text style={s.empty}>
          {entries.length === 1
            ? 'Encore une pesée et ta courbe apparaît ici.'
            : 'Note ta première pesée : Kyroz recale calories, macros et plan à chaque fois.'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    card: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.xl, gap: 14 },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    label: { color: t.textTertiary, ...Type.overline },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    value: { color: t.text, ...Type.hero },
    unit: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },
    // Neutre À DESSEIN : une hausse n'est pas une faute (cf. l'en-tête du fichier).
    delta: { color: t.textTertiary, fontSize: 12, fontWeight: '600', marginLeft: 2 },
    cta: { backgroundColor: t.fill, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginTop: 6 },
    ctaTxt: { color: t.text, fontSize: 13, fontWeight: '700' },
    empty: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
  });
}
