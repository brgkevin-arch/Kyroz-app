import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ThemePalette } from '../constants/theme';
import { WeightEntry } from '../lib/weight';

// Mini-courbe de poids (vectorielle). Temps de gauche (ancien) à droite (récent).
// ⚠️ Les bornes kg (min/max) sont des repères d'ÉCHELLE : elles annotent les
// lignes de repère haut/bas — jamais l'axe du temps, sinon « 84 … 95 » sous la
// courbe se lit comme départ→arrivée et la courbe semble inversée.
interface Props {
  t: ThemePalette;
  entries: WeightEntry[];
  width: number;
  height?: number;
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function WeightChart({ t, entries, width, height = 130 }: Props) {
  // Tri défensif par date (l'appelant trie déjà, mais l'ordre EST la sémantique du graphe).
  const data = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  if (data.length < 2) {
    return (
      <View style={[styles.empty, { height, backgroundColor: t.fill }]}>
        <Text style={{ color: t.textTertiary, fontSize: 13, textAlign: 'center' }}>
          Enregistre ton poids chaque semaine pour voir ta courbe.
        </Text>
      </View>
    );
  }

  const padX = 10, padY = 18;
  const weights = data.map((e) => e.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = Math.max(max - min, 1); // évite la division par 0 si poids constant

  const x = (i: number) => padX + (i / (data.length - 1)) * (width - 2 * padX);
  const y = (w: number) => padY + (1 - (w - min) / span) * (height - 2 * padY);

  const points = data.map((e, i) => `${x(i)},${y(e.weight_kg)}`).join(' ');
  const first = data[0];
  const lastE = data[data.length - 1];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* lignes de repère, annotées avec les bornes d'échelle (haut = max, bas = min) */}
        <Line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke={t.line} strokeWidth={1} />
        <Line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke={t.line} strokeWidth={1} />
        <SvgText x={padX} y={padY - 5} fontSize={10} fill={t.textTertiary}>{max.toFixed(1)} kg</SvgText>
        <SvgText x={padX} y={height - padY + 13} fontSize={10} fill={t.textTertiary}>{min.toFixed(1)} kg</SvgText>
        <Polyline points={points} fill="none" stroke={t.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((e, i) => (
          <Circle key={e.date} cx={x(i)} cy={y(e.weight_kg)} r={i === data.length - 1 ? 4 : 2.5} fill={t.accent} />
        ))}
      </Svg>
      {/* axe du temps : dates réelles, ancien → récent */}
      <View style={styles.axis}>
        <Text style={[styles.axisTxt, { color: t.textTertiary }]}>{frDate(first.date)}</Text>
        <Text style={[styles.axisTxt, { color: t.textSecondary, fontWeight: '700' }]}>
          {frDate(lastE.date)} · {lastE.weight_kg} kg
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisTxt: { fontSize: 11 },
});
