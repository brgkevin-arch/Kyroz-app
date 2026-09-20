import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ThemePalette, Radius, Type, Spacing } from '../constants/theme';
import { WeightEntry } from '../lib/weight';
import { daysBetween } from '../lib/datedGoal';
import { frnum } from '../lib/units';

// Mini-courbe de poids (vectorielle). Temps de gauche (ancien) à droite (récent).
// ⚠️ Les bornes kg (min/max) sont des repères d'ÉCHELLE : elles annotent les
// lignes de repère haut/bas — jamais l'axe du temps, sinon « 84 … 95 » sous la
// courbe se lit comme départ→arrivée et la courbe semble inversée.
//
// ⚠️ L'axe X est PROPORTIONNEL AU TEMPS (pas à l'index du point) : sans ça, deux
// pesées espacées d'un mois et deux espacées d'un jour auraient la même pente.
//
// 🔴 LA ZONE A ÉTÉ RETIRÉE LE 2026-09-20 (décision fondateur). Ce couloir ombré
// dessinait l'objectif daté par-dessus la courbe — et il emportait avec lui bien plus
// que lui-même : **il étirait l'axe du temps jusqu'à la date cible**, donc la courbe
// réelle était écrasée sur le tiers gauche du cadre, d'autant plus que l'échéance
// était lointaine. Une courbe de pesées qui rétrécit à mesure qu'on se fixe un
// objectif plus ambitieux : personne n'avait demandé ça, et ça ne se voyait qu'à
// l'écran, sur un vrai objectif.
// ➡️ La courbe ne montre plus QUE les pesées, sur leur propre plage de dates. Ce qui
// reste de l'objectif daté vit à côté d'elle : le verdict (`TrackVerdict`) et la carte
// d'objectif du Profil.

// Plancher de largeur : évite toute géométrie dégénérée si la mesure n'est pas encore faite.
const MIN_CHART_WIDTH = 160;

interface Props {
  t: ThemePalette;
  entries: WeightEntry[];
  width: number;
  height?: number;
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function WeightChart({ t, entries, width, height = 130 }: Props) {
  // ⚠️ La largeur passée par l'appelant vient de `Dimensions.get('window')`, qui peut
  // renvoyer 0 avant l'initialisation du layout → largeur NÉGATIVE et courbe tracée
  // hors du cadre (bug silencieux : le SVG existe, on ne voit rien). On se mesure
  // donc soi-même ; la prop ne sert plus que de valeur initiale, avec un plancher.
  const [measured, setMeasured] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== measured) setMeasured(w);
  };
  const chartW = measured > 0 ? measured : Math.max(width, MIN_CHART_WIDTH);

  // Tri défensif par date (l'appelant trie déjà, mais l'ordre EST la sémantique du graphe).
  const data = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Deux points au minimum : une courbe d'un seul point n'est pas une courbe.
  // ⚠️ Avant le retrait de la zone, un point suffisait dès qu'un objectif daté existait
  // — la pente à tenir portait le graphe à elle seule. Sans zone, il n'y a plus rien à
  // montrer qu'un point isolé, donc on rend l'invitation à se peser.
  if (data.length < 2) {
    return (
      <View onLayout={onLayout} style={[styles.empty, { height, backgroundColor: t.fill }]}>
        <Text style={{ ...Type.caption, color: t.textTertiary, textAlign: 'center' }}>
          Enregistre ton poids chaque semaine pour voir ta courbe.
        </Text>
      </View>
    );
  }

  const padX = 10, padY = 18;
  const first = data[0];
  const lastE = data[data.length - 1];

  // Domaine temps : la plage des PESÉES, et rien d'autre. C'est ce qui rend la courbe
  // aussi large que possible — elle s'étend de la première pesée à la dernière.
  const startStamp = first.date;
  const endStamp = lastE.date;
  const totalDays = Math.max(daysBetween(startStamp, endStamp), 1);
  const x = (stamp: string) => padX + (daysBetween(startStamp, stamp) / totalDays) * (chartW - 2 * padX);

  // Domaine poids : les pesées seules — l'échelle se cale donc sur ce qui a été vécu.
  const weights = data.map((e) => e.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = Math.max(max - min, 1); // évite la division par 0 si poids constant
  const y = (w: number) => padY + (1 - (w - min) / span) * (height - 2 * padY);

  const points = data.map((e) => `${x(e.date)},${y(e.weight_kg)}`).join(' ');

  return (
    <View onLayout={onLayout}>
      <Svg width={chartW} height={height}>
        {/* lignes de repère, annotées avec les bornes d'échelle (haut = max, bas = min) */}
        <Line x1={padX} y1={padY} x2={chartW - padX} y2={padY} stroke={t.line} strokeWidth={1} />
        <Line x1={padX} y1={height - padY} x2={chartW - padX} y2={height - padY} stroke={t.line} strokeWidth={1} />
        <SvgText x={padX} y={padY - 5} fontSize={10} fill={t.textTertiary}>{frnum(max)} kg</SvgText>
        <SvgText x={padX} y={height - padY + 13} fontSize={10} fill={t.textTertiary}>{frnum(min)} kg</SvgText>

        {/* Courbe réelle */}
        <Polyline points={points} fill="none" stroke={t.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((e, i) => (
          <Circle key={e.date} cx={x(e.date)} cy={y(e.weight_kg)} r={i === data.length - 1 ? 4 : 2.5} fill={t.accent} />
        ))}
      </Svg>

      {/* axe du temps : dates réelles, ancien → récent */}
      <View style={styles.axis}>
        <Text style={[styles.axisTxt, { color: t.textTertiary }]}>{frDate(first.date)}</Text>
        <Text style={[styles.axisTxt, { color: t.textSecondary, fontWeight: '700' }]}>
          {frDate(lastE.date)} · {frnum(lastE.weight_kg)} kg
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  axisTxt: { ...Type.micro },
});
