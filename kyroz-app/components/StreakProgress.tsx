import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemePalette, Radius, Spacing, cardShadow } from '../constants/theme';
import { Streak } from '../lib/types';
import { chainProgress, streakMessage, nextMilestone, nextFreezeRecharge } from '../lib/streak';

// ── Chaînon de 7 jours ───────────────────────────────────────────────────────
// Visualise la progression vers l'objectif 7 jours (North Star). Monochrome,
// fidèle au thème : segment plein = jour validé, vide = à venir.
function Chain({ t, filled, total }: { t: ThemePalette; filled: number; total: number }) {
  return (
    <View style={styles.chain}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.seg,
              { backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line },
            ]}
          />
        );
      })}
    </View>
  );
}

// Colonne de stat (valeur + libellé) pour la rangée du bas de la carte.
function Stat({ t, value, label }: { t: ThemePalette; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: t.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.textTertiary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

interface Props {
  t: ThemePalette;
  streak: Streak;
  variant?: 'strip' | 'card';
}

/**
 * Affichage du streak orienté objectif 7 jours.
 *  • `strip` : bandeau slim pour l'écran Plan (chaînon + microcopie).
 *  • `card`  : carte riche pour l'écran Profil (gros compteur + chaînon + record).
 */
export function StreakProgress({ t, streak, variant = 'strip' }: Props) {
  const { filled, total } = chainProgress(streak.current_streak_days);
  const message = streakMessage(streak.current_streak_days);

  if (variant === 'card') {
    const shieldReady = streak.freeze_available !== false;
    const next = nextMilestone(streak.current_streak_days);
    return (
      <View style={[styles.card, { backgroundColor: t.card }, cardShadow(t)]}>
        <View style={styles.cardMain}>
          <Text style={{ fontSize: 30 }}>🔥</Text>
          <Text style={[styles.cardNum, { color: t.text }]}>{streak.current_streak_days}</Text>
          <Text style={[styles.cardLbl, { color: t.textSecondary }]}>jours d’affilée</Text>
        </View>
        <Chain t={t} filled={filled} total={total} />
        <Text style={[styles.message, { color: t.textSecondary }]}>{message}</Text>

        {/* Rangée de stats : remplit la carte sur toute la largeur + statut du bouclier. */}
        <View style={[styles.statsRow, { borderTopColor: t.line }]}>
          <Stat t={t} value={`${streak.longest_streak_days} j`} label="Record" />
          <View style={[styles.vsep, { backgroundColor: t.line }]} />
          <Stat t={t} value={`${next} j`} label="Prochain palier" />
          <View style={[styles.vsep, { backgroundColor: t.line }]} />
          <Stat
            t={t}
            value={shieldReady ? '🛡️ Prêt' : `à ${nextFreezeRecharge(streak.current_streak_days)} j`}
            label="Bouclier"
          />
        </View>
        <Text style={[styles.shieldNote, { color: t.textTertiary }]}>
          🛡️ Le bouclier pardonne un jour manqué — il se recharge tous les 7 jours.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.strip, { backgroundColor: t.card, borderColor: t.line }]}>
      <Chain t={t} filled={filled} total={total} />
      <Text style={[styles.message, { color: t.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chain: { flexDirection: 'row', gap: 6, width: '100%' },
  seg: { flex: 1, height: 8, borderRadius: Radius.pill, borderWidth: 1 },

  strip: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },

  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    gap: 14,
    alignItems: 'center',
  },
  cardMain: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  cardNum: { fontSize: 52, fontWeight: '900', letterSpacing: -2 },
  cardLbl: { fontSize: 15 },

  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 6, paddingTop: 16, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  vsep: { width: 1, height: 30, opacity: 0.7 },
  shieldNote: { fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 2 },

  message: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
