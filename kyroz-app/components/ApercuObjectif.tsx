import React from 'react';
import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Svg, { Defs, Filter, FeGaussianBlur, G, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Type, Spacing, Radius, Icone, CIBLE_TACTILE_MIN } from '../constants/theme';
import { formatFR } from './DatedGoalCard';
import { todayStamp } from '../lib/weight';
import { UserProfile } from '../lib/types';
import { frnum } from '../lib/units';

// ── L'aperçu FLOUTÉ de l'objectif daté, sans Kyroz+ (2026-10-23) ──────────────
//
// Décision fondateur : « le vrai aperçu de l'objectif daté, mais flouté, avec un cadenas et
// le texte en bas ». On montre la carte que verrait un abonné — cible, reste, jauge, date —
// tirée de SON poids, mais illisible : on montre ce qu'il obtient sans le lui donner.
//
// ⚠️ LE FLOU EST UN FILTRE SVG (`FeGaussianBlur`), PAS `expo-blur`. `react-native-svg` est
// déjà dans le binaire (15.15.4, filtres natifs sur iOS) ; `expo-blur` serait une dépendance
// native de plus, donc un nouveau build : la ligne OTA se couperait (CLAUDE.md §2).
// D'où une carte REDESSINÉE en SVG, sur la mise en page de `BlocObjectif` : une vue React
// Native ne se floute pas sans bibliothèque native.
// ⚠️ Les chiffres sont un EXEMPLE (4 kg vers l'objectif, 3 en prise de masse), pas un calcul
// du moteur : flous, ils ne se lisent pas, et rien n'est promis.

const HAUTEUR = 92;
const FLOU = 4;
/**
 * 🔴 LE FLOU DÉBORDE, IL NE S'ARRÊTE PAS NET (fondateur, 2026-10-23 : « les côtés du flou
 * ne s'arrêtent pas net, fluidifie »). Un flou gaussien s'étale sur ~3 écarts-types : posé
 * au ras du dessin, il était COUPÉ par le bord du SVG. Le dessin est donc posé à cette
 * marge des quatre bords, et la vue la reprend en marges négatives : le texte reste aligné
 * sur la carte, le flou s'estompe dans la marge.
 */
const MARGE = 3 * FLOU;

const ajouterJours = (stamp: string, n: number) => {
  const d = new Date(stamp + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function ApercuObjectif({ t, profile }: { t: ThemePalette; profile: UserProfile }) {
  const [largeur, setLargeur] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== largeur) setLargeur(w);
  };

  const prise = profile.goal === 'lean_bulk';
  const total = prise ? 3 : 4;
  const cible = Math.round(profile.weight_kg) + (prise ? total : -total);
  const aujourdhui = todayStamp();

  return (
    <View
      onLayout={onLayout} style={{ height: HAUTEUR + 2 * MARGE, margin: -MARGE }}
      accessible accessibilityLabel="Aperçu de l'objectif daté, réservé à Kyroz+"
    >
      {largeur > 0 && (
        <Svg width={largeur} height={HAUTEUR + 2 * MARGE}>
          <Defs>
            {/* La région du filtre couvre TOUT le SVG, marges comprises : le flou a la place
                de s'estomper avant le bord. */}
            <Filter id="flouObjectif" filterUnits="userSpaceOnUse" x={0} y={0} width={largeur} height={HAUTEUR + 2 * MARGE}>
              <FeGaussianBlur stdDeviation={FLOU} />
            </Filter>
          </Defs>
          <G filter="url(#flouObjectif)">
            <SvgText x={MARGE} y={MARGE + 20} fill={t.textSecondary} fontSize={Type.body.fontSize} fontWeight={Type.body.fontWeight}>
              {`Cible ${frnum(cible)} kg`}
            </SvgText>
            <SvgText x={largeur - MARGE} y={MARGE + 20} textAnchor="end" fill={t.text} fontSize={Type.bodyStrong.fontSize} fontWeight={Type.bodyStrong.fontWeight}>
              {`reste ${frnum(total - 1.2)} kg`}
            </SvgText>
            <Rect x={MARGE} y={MARGE + 32} width={largeur - 2 * MARGE} height={8} rx={4} fill={t.line} />
            <Rect x={MARGE} y={MARGE + 32} width={(largeur - 2 * MARGE) * 0.3} height={8} rx={4} fill={t.accent} />
            <SvgText x={MARGE} y={MARGE + 62} fill={t.textTertiary} fontSize={Type.caption.fontSize}>
              {`1,2 kg depuis le ${formatFR(ajouterJours(aujourdhui, -28))}, sur ${total} kg`}
            </SvgText>
            <SvgText x={MARGE} y={MARGE + 84} fill={t.textSecondary} fontSize={Type.caption.fontSize}>
              {`Cible le ${formatFR(ajouterJours(aujourdhui, 84))} · 0,3 kg/sem`}
            </SvgText>
          </G>
        </Svg>
      )}
      {/* Le cadenas, net, au centre de ce qui est flou. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.centre}>
          <View style={[s.cadenas, { backgroundColor: t.fill }]}>
            <Ionicons name="lock-closed" size={Icone.action} color={t.text} />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xs },
  cadenas: {
    width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
});
