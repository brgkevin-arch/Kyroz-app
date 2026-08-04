import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemePalette, Radius, Type } from '../constants/theme';
import { Streak } from '../lib/types';
import { chainProgress, streakMessage } from '../lib/streak';

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

interface Props {
  t: ThemePalette;
  streak: Streak;
  variant?: 'strip' | 'card';
}

/**
 * Affichage du streak orienté objectif 7 jours.
 *  • `strip` : bandeau slim pour l'écran Plan (chaînon + microcopie).
 *  • `card`  : LIGNE discrète pour l'écran Profil (compteur + chaînon + record).
 */
export function StreakProgress({ t, streak, variant = 'strip' }: Props) {
  const { filled, total } = chainProgress(streak.current_streak_days);
  const message = streakMessage(streak.current_streak_days);

  if (variant === 'card') {
    // ⚠️ CE N'EST PLUS UNE CARTE, malgré le nom du variant (conservé pour ne pas
    // toucher aux appelants) : c'est une LIGNE.
    //
    // Deux décisions du fondateur, dans cet ordre. D'abord le bouclier : retiré de
    // l'AFFICHAGE, mécanisme intact — `advanceStreak` pardonne toujours un jour
    // manqué, et le toast de l'écran Plan le dit AU MOMENT où ça sert. Puis le
    // bloc entier (2026-08-02) : il occupait le haut du Profil alors que le suivi
    // du poids, qui ALIMENTE le moteur, tenait dans une ligne de menu. Les deux ont
    // échangé leur place (cf. WeightSummaryCard).
    //
    // Ce qui RESTE, et pourquoi : le chaînon de 7 jours est le North Star, il ne
    // pouvait pas disparaître. Ce qui saute : le compteur géant, le record et le
    // prochain palier — trois chiffres qui ne changent rien à ce qu'on fait de sa
    // journée. Ne pas réintroduire la grosse carte sans nouvelle décision (A20).
    return (
      <View style={[styles.line, { backgroundColor: t.card, borderColor: t.line }]}>
        {/* Plus de 🔥 : la barre de sept jours EST la série, et l'emoji la disait
            une deuxième fois. Même geste que l'en-tête du Plan (2026-08-03). */}
        <View style={styles.lineHead}>
          <Text style={[styles.lineNum, { color: t.text }]}>{streak.current_streak_days}</Text>
          <Text style={[styles.lineLbl, { color: t.textSecondary }]}>
            jour{streak.current_streak_days > 1 ? 's' : ''} d’affilée
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.lineRecord, { color: t.textTertiary }]}>
            record {streak.longest_streak_days} j
          </Text>
        </View>
        <Chain t={t} filled={filled} total={total} />
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
    borderRadius: Radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },

  // Ligne discrète du Profil (2026-08-02). Même gabarit que le bandeau du Plan :
  // la série se lit d'un coup d'œil et rend la place au suivi du poids.
  line: {
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  lineHead: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  lineNum: { ...Type.h3 },
  lineLbl: { fontSize: 13, fontWeight: '600' },
  lineRecord: { fontSize: 12, fontWeight: '600' },

  message: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
