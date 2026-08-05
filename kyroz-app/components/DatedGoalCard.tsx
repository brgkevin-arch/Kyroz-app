import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { Card } from './ui';
import { datedGoalStatus } from '../lib/datedGoal';
import { planFloorKcal, makeWeeklyProjector } from '../lib/tdee';
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
  // Le plancher vient du même producteur unique (P1.6) : sans lui, cette carte
  // annonçait un rythme jusqu'à 2,3× trop rapide et une date fausse de 32 jours en
  // médiane, parce qu'elle datait le rythme DEMANDÉ et non le rythme SERVI.
  const today = todayStamp();
  // Le projecteur rend la date HONNÊTE : elle est simulée semaine par semaine sur le
  // moteur, TDEE qui baisse et escalade de zone basse comprises. Sans lui, cette
  // carte annonçait une date trop précoce de 182 à 1032 jours en sèche féminine.
  const status = datedGoalStatus(
    gt, profile, today, profile.tdee_kcal, planFloorKcal(profile, today), makeWeeklyProjector(profile),
  );
  if (!status) return null;

  // Progression départ → actuel → cible (marche dans les deux sens : perte ET prise).
  const denom = gt.start_weight_kg - gt.target_weight_kg;
  const progress = denom !== 0 ? Math.min(Math.max((gt.start_weight_kg - profile.weight_kg) / denom, 0), 1) : 1;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card t={t} style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: t.text, ...Type.h3 }}>
            🎯 {profile.weight_kg} → {gt.target_weight_kg} kg
          </Text>
          <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>
            {status.active ? `${status.weeksRemaining} sem` : 'Échéance passée'}
          </Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: t.text }} />
        </View>
        <Text style={{ ...Type.caption, color: t.textSecondary }}>
          {/* `underweightBlocked` d'abord : le rythme y vaut 0 par sécurité, et
              « 0 kg/sem » sans motif se lit comme un plan cassé. */}
          {status.underweightBlocked
            ? 'Plan ramené au maintien · poids sous la plage de référence'
            : status.direction === 'maintain'
              ? 'Poids cible atteint · maintien'
              // Date RÉELLE au rythme servi (P1.6) : annoncer `gt.target_date` quand le
              // plancher rogne le déficit affichait une échéance fausse de 32 jours en
              // médiane. Et sans projection crédible, on ne donne pas de date du tout
              // plutôt qu'un chiffre inventé.
              : status.reachableByDate
                ? `Cible le ${formatFR(gt.target_date)} · ${Math.abs(status.safeWeeklyKg)} kg/sem`
                : status.projectable
                  ? `Plutôt le ${formatFR(status.projectedDate)} · ${Math.abs(status.safeWeeklyKg)} kg/sem`
                  : 'Rythme sûr atteint · cette date n\'est pas tenable'}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}
