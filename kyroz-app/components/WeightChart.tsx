import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ThemePalette, Radius } from '../constants/theme';
import { WeightEntry } from '../lib/weight';
import { GoalTarget } from '../lib/types';
import { daysBetween, TRACK_TOLERANCE_KG, zoneHalfWidthKg } from '../lib/datedGoal';

// Mini-courbe de poids (vectorielle). Temps de gauche (ancien) à droite (récent).
// ⚠️ Les bornes kg (min/max) sont des repères d'ÉCHELLE : elles annotent les
// lignes de repère haut/bas — jamais l'axe du temps, sinon « 84 … 95 » sous la
// courbe se lit comme départ→arrivée et la courbe semble inversée.
//
// ⚠️ L'axe X est PROPORTIONNEL AU TEMPS (pas à l'index du point) : sans ça, une
// trajectoire cible superposée mentirait dès que les pesées sont irrégulières.

// Plancher de largeur : évite toute géométrie dégénérée si la mesure n'est pas encore faite.
const MIN_CHART_WIDTH = 160;

interface Props {
  t: ThemePalette;
  entries: WeightEntry[];
  width: number;
  height?: number;
  goalTarget?: GoalTarget;  // objectif daté (premium) → trajectoire cible en pointillés
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function WeightChart({ t, entries, width, height = 130, goalTarget }: Props) {
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

  // Avec un objectif daté, UN seul point suffit déjà à montrer la pente à tenir.
  const canRender = data.length >= 2 || (data.length >= 1 && !!goalTarget);
  if (!canRender) {
    return (
      <View onLayout={onLayout} style={[styles.empty, { height, backgroundColor: t.fill }]}>
        <Text style={{ color: t.textTertiary, fontSize: 13, textAlign: 'center' }}>
          Enregistre ton poids chaque semaine pour voir ta courbe.
        </Text>
      </View>
    );
  }

  const padX = 10, padY = 18;
  const first = data[0];
  const lastE = data[data.length - 1];

  // Domaine temps : englobe les pesées ET (si objectif) le départ + l'échéance,
  // pour qu'on voie « où j'en suis » vs « où je dois arriver ».
  const startStamp = goalTarget
    ? [first.date, goalTarget.start_date].sort()[0]
    : first.date;
  const endStamp = goalTarget
    ? [lastE.date, goalTarget.target_date].sort()[1]
    : lastE.date;
  const totalDays = Math.max(daysBetween(startStamp, endStamp), 1);
  const x = (stamp: string) => padX + (daysBetween(startStamp, stamp) / totalDays) * (chartW - 2 * padX);

  // Domaine poids : inclut la ZONE (cible ± tolérance), sinon le couloir sortirait du cadre.
  //
  // La demi-largeur est PROPORTIONNELLE au gabarit (P1.5) et donc différente aux deux
  // extrémités : le couloir s'effile légèrement quand on maigrit, s'évase quand on
  // prend. ±1 kg fixe valait 2 % du poids à 50 kg contre 0,8 % à 120 — la personne
  // dont le bruit de balance pèse le plus lourd était jugée le plus strictement.
  const zoneStart = goalTarget ? zoneHalfWidthKg(goalTarget.start_weight_kg) : TRACK_TOLERANCE_KG;
  const zoneEnd = goalTarget ? zoneHalfWidthKg(goalTarget.target_weight_kg) : TRACK_TOLERANCE_KG;
  const weights = data.map((e) => e.weight_kg);
  const allW = goalTarget
    ? [...weights,
       goalTarget.start_weight_kg + zoneStart, goalTarget.start_weight_kg - zoneStart,
       goalTarget.target_weight_kg + zoneEnd, goalTarget.target_weight_kg - zoneEnd]
    : weights;
  const min = Math.min(...allW);
  const max = Math.max(...allW);
  const span = Math.max(max - min, 1); // évite la division par 0 si poids constant
  const y = (w: number) => padY + (1 - (w - min) / span) * (height - 2 * padY);

  const points = data.map((e) => `${x(e.date)},${y(e.weight_kg)}`).join(' ');

  return (
    <View onLayout={onLayout}>
      <Svg width={chartW} height={height}>
        {/* lignes de repère, annotées avec les bornes d'échelle (haut = max, bas = min) */}
        <Line x1={padX} y1={padY} x2={chartW - padX} y2={padY} stroke={t.line} strokeWidth={1} />
        <Line x1={padX} y1={height - padY} x2={chartW - padX} y2={height - padY} stroke={t.line} strokeWidth={1} />
        <SvgText x={padX} y={padY - 5} fontSize={10} fill={t.textTertiary}>{max.toFixed(1)} kg</SvgText>
        <SvgText x={padX} y={height - padY + 13} fontSize={10} fill={t.textTertiary}>{min.toFixed(1)} kg</SvgText>

        {/* ZONE repère SEULE (couloir ombré ± tolérance) : ni ligne « à suivre » ni
            marqueur — juste une bande où il suffit de rester → zéro charge mentale. */}
        {goalTarget && (
          <Polygon
            points={[
              `${x(goalTarget.start_date)},${y(goalTarget.start_weight_kg + zoneStart)}`,
              `${x(goalTarget.target_date)},${y(goalTarget.target_weight_kg + zoneEnd)}`,
              `${x(goalTarget.target_date)},${y(goalTarget.target_weight_kg - zoneEnd)}`,
              `${x(goalTarget.start_date)},${y(goalTarget.start_weight_kg - zoneStart)}`,
            ].join(' ')}
            fill={t.success} fillOpacity={0.13} stroke="none"
          />
        )}

        {/* Courbe réelle */}
        {data.length >= 2 && (
          <Polyline points={points} fill="none" stroke={t.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {data.map((e, i) => (
          <Circle key={e.date} cx={x(e.date)} cy={y(e.weight_kg)} r={i === data.length - 1 ? 4 : 2.5} fill={t.accent} />
        ))}
      </Svg>

      {/* axe du temps : dates réelles, ancien → récent */}
      <View style={styles.axis}>
        <Text style={[styles.axisTxt, { color: t.textTertiary }]}>{frDate(first.date)}</Text>
        <Text style={[styles.axisTxt, { color: t.textSecondary, fontWeight: '700' }]}>
          {frDate(lastE.date)} · {lastE.weight_kg} kg
        </Text>
      </View>
      {goalTarget && (
        <Text style={[styles.axisTxt, { color: t.textTertiary, marginTop: 2 }]}>
          ▚ Ta zone vers {goalTarget.target_weight_kg} kg le {frDate(goalTarget.target_date)} · rester dedans suffit
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisTxt: { fontSize: 11 },
});
