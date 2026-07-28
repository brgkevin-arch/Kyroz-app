import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemePalette } from '../constants/theme';
import { Card } from './ui';
import { datedGoalStatus } from '../lib/datedGoal';
import { todayStamp } from '../lib/weight';
import { UserProfile } from '../lib/types';

// ── Carte de suivi d'objectif daté (premium « Kyroz+ ») ──────────────────────
// Partagée par l'écran Plan (le geste quotidien) et le Profil. Lecture seule :
// tout le calcul vient de `datedGoalStatus` (source unique), rien n'est recalculé
// ici. Ne s'affiche QUE si un objectif daté est posé → zéro bruit sinon.

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** 'YYYY-MM-DD' → « 18 août 2026 » (pas d'Intl : Hermes est capricieux sur natif). */
export function formatFR(stamp: string): string {
  const [y, m, d] = stamp.split('-').map(Number);
  return `${d} ${MONTHS_FR[(m ?? 1) - 1]} ${y}`;
}

export function DatedGoalCard({ t, profile, onPress }: { t: ThemePalette; profile: UserProfile; onPress: () => void }) {
  const gt = profile.goal_target;
  if (!gt) return null;
  // `tdee_kcal` est la valeur STOCKÉE, produite par recalcProfile : on ne recalcule
  // pas ici (chemin parallèle interdit). Elle sert au plafond de déficit (25 % du TDEE).
  const status = datedGoalStatus(gt, profile, todayStamp(), profile.tdee_kcal);
  if (!status) return null;

  // Progression départ → actuel → cible (marche dans les deux sens : perte ET prise).
  const denom = gt.start_weight_kg - gt.target_weight_kg;
  const progress = denom !== 0 ? Math.min(Math.max((gt.start_weight_kg - profile.weight_kg) / denom, 0), 1) : 1;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card t={t} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
            🎯 {profile.weight_kg} → {gt.target_weight_kg} kg
          </Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600' }}>
            {status.active ? `${status.weeksRemaining} sem` : 'Échéance passée'}
          </Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: t.text }} />
        </View>
        <Text style={{ color: t.textSecondary, fontSize: 12 }}>
          {/* `underweightBlocked` d'abord : le rythme y vaut 0 par sécurité, et
              « 0 kg/sem » sans motif se lit comme un plan cassé. */}
          {status.underweightBlocked
            ? 'Plan ramené au maintien · poids sous la plage de référence'
            : status.direction === 'maintain'
              ? 'Poids cible atteint · maintien'
              : `Cible le ${formatFR(gt.target_date)} · ${Math.abs(status.safeWeeklyKg)} kg/sem`}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}
