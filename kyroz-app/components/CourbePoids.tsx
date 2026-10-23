import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { ThemePalette, Radius, Spacing, Type, Trait } from '../constants/theme';
import { Courbe } from '../lib/courbePoids';
import { frnum } from '../lib/units';

// ── La courbe du poids (onglet Poids, 2026-10-21) ───────────────────────────
//
// Ce composant DESSINE, il ne décide rien : quels points, quels traits en
// pointillés, quelles graduations — tout vient de `lib/courbePoids.ts`, qui est pur
// et testé. Inspiré de la capture d'une app de composition corporelle choisie par le
// fondateur : l'axe des poids à DROITE, en pastilles ; des repères verticaux
// pointillés ; des points creux.
//
// ⚠️ La largeur est MESURÉE (`onLayout`), jamais lue sur l'écran : la courbe vit dans
// une carte, et sur iPad dans une colonne centrée (CLAUDE.md §11, `Dimensions` ment).
// ⚠️ Les libellés sont des `Text` posés par-dessus, pas des `SvgText` : ils prennent
// ainsi les crans de `Type` comme le reste de l'app (§8, échelle typographique).

/** Largeur de la colonne des graduations, à droite. */
const AXE_L = 40;
/** Marge intérieure du tracé : un point posé au bord ne doit pas être coupé. */
const PAD_X = 10;
const PAD_Y = 10;
/** Hauteur de la rangée des repères du temps, sous le tracé. */
const REPERES_H = 18;
/** Largeur réservée à un libellé de repère — centrée sur son trait. */
const REPERE_L = 52;
/** Au-delà, les points ne sont plus marqués un par un : la ligne suffit à les lire. */
const POINTS_MARQUES_MAX = 40;

interface Props {
  t: ThemePalette;
  courbe: Courbe;
  /** Hauteur du tracé, sans la rangée des repères. */
  hauteur?: number;
  /** Fond de la carte qui porte la courbe : l'intérieur des points creux le reprend. */
  fond: string;
}

export function CourbePoids({ t, courbe: c, hauteur = 180, fond }: Props) {
  const [largeur, setLargeur] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== largeur) setLargeur(w);
  };

  const traceL = Math.max(0, largeur - AXE_L - Spacing.sm);
  const xPix = (x: number) => PAD_X + x * Math.max(0, traceL - 2 * PAD_X);
  const etendue = Math.max(c.max - c.min, 0.001);
  const yPix = (kg: number) => PAD_Y + (1 - (kg - c.min) / etendue) * (hauteur - 2 * PAD_Y);
  const marquer = c.points.length <= POINTS_MARQUES_MAX;
  const dernier = c.points[c.points.length - 1];

  const resume = dernier
    ? `Courbe du poids : ${c.points.length} point${c.points.length > 1 ? 's' : ''}, de ${frnum(c.points[0].kg)} à ${frnum(dernier.kg)} kg.`
    : 'Courbe du poids : aucune pesée sur cette période.';

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={resume}>
      {largeur > 0 && (
        <>
          <View style={{ height: hauteur, flexDirection: 'row', gap: Spacing.sm }}>
            <Svg width={traceL} height={hauteur}>
              {/* Graduations horizontales — une par valeur de l'axe. */}
              {c.graduations.map((g) => (
                <Line key={`g${g}`} x1={0} x2={traceL} y1={yPix(g)} y2={yPix(g)} stroke={t.line} strokeWidth={Trait.fin} />
              ))}
              {/* Repères du temps — pointillés fins, comme sur la capture. */}
              {c.reperes.map((r, i) => (
                <Line
                  key={`r${i}`} x1={xPix(r.x)} x2={xPix(r.x)} y1={0} y2={hauteur}
                  stroke={t.line} strokeWidth={Trait.fin} strokeDasharray="2,4"
                />
              ))}
              {/* Le trait : plein entre deux pesées proches, en POINTS là où il n'y a
                  pas eu de pesée (règle 1 de lib/courbePoids.ts). */}
              {c.segments.map((sg, i) => (
                <Line
                  key={`s${i}`}
                  x1={xPix(sg.x1)} y1={yPix(sg.kg1)} x2={xPix(sg.x2)} y2={yPix(sg.kg2)}
                  stroke={t.accent}
                  strokeWidth={sg.pointille ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeDasharray={sg.pointille ? '0.5,6' : undefined}
                />
              ))}
              {c.points.map((p, i) =>
                marquer || p === dernier ? (
                  <Circle
                    key={`p${i}`} cx={xPix(p.x)} cy={yPix(p.kg)} r={4.5}
                    fill={fond} stroke={t.accent} strokeWidth={2}
                  />
                ) : null,
              )}
            </Svg>
            {/* L'axe des poids, à droite, en pastilles. */}
            <View style={{ width: AXE_L }}>
              {c.graduations.map((g) => (
                <View key={`a${g}`} style={[styles.pastille, { top: yPix(g) - 9, backgroundColor: t.fill }]}>
                  <Text style={[styles.pastilleTxt, { color: t.textSecondary }]}>{frnum(g)}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* Les repères du temps, sous le tracé. ⚠️ Un libellé reste CENTRÉ sur son
              trait, quitte à déborder sous la colonne de l'axe : le caler dans la largeur
              du tracé faisait glisser le dernier (« O ») sur l'avant-dernier (« S »),
              vu à l'écran le 2026-10-21. */}
          <View style={{ height: REPERES_H, width: largeur, marginTop: Spacing.xs }}>
            {c.reperes.map((r, i) => (
              <Text
                key={`l${i}`}
                numberOfLines={1}
                style={[
                  styles.repere,
                  { color: t.textTertiary, left: Math.min(Math.max(xPix(r.x) - REPERE_L / 2, 0), largeur - REPERE_L) },
                ]}
              >
                {r.libelle}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: {
    position: 'absolute', right: 0, height: 18, minWidth: 34,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  pastilleTxt: { ...Type.microStrong },
  repere: { ...Type.micro, position: 'absolute', top: 0, width: REPERE_L, textAlign: 'center' },
});
