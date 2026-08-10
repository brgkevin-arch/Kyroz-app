import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemePalette, Type, Spacing, OPACITE_PRESSION , Icone } from '../constants/theme';
import { Card } from './ui';
import { datedGoalStatus, simulatedTrajectory, daysBetween } from '../lib/datedGoal';
import { needsMilestones, milestonesFor, currentMilestone, milestoneProgress } from '../lib/goalMilestones';
import { planFloorKcal, makeWeeklyProjector } from '../lib/tdee';
import { todayStamp } from '../lib/weight';
import { UserProfile } from '../lib/types';
import { ObjectifIcon } from './Icons';

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

  // ── Paliers (2026-08-10) ───────────────────────────────────────────────────
  // Un objectif à douze mois ne renforce rien pendant douze mois : on met en avant la
  // PROCHAINE étape, pas la lointaine.
  //
  // 🔴 C'est une VUE : `gt` n'est jamais remplacé par le palier. Mesuré
  // (`npm run mesure:paliers`), faire du palier la vraie cible sert **+246 kcal/j** à
  // un H de 123 kg (0,60 → 0,40 kg/sem), parce qu'une date proche redevient « tenable »
  // en ligne droite et que A15 cesse de servir le rythme maximal. Le découpage se fait
  // donc ICI, sur ce que le moteur sert déjà.
  const totalKg = gt.start_weight_kg - gt.target_weight_kg;
  const jours = status.projectable ? daysBetween(today, status.projectedDate) : null;
  // La trajectoire n'est simulée que si on découpe : c'est jusqu'à 260 semaines
  // d'arithmétique, et cette carte est montée sur DEUX écrans dont le Plan.
  const decoupe = status.active && !status.underweightBlocked && needsMilestones(totalKg, jours);
  const paliers = decoupe
    ? milestonesFor(gt, profile.weight_kg, simulatedTrajectory(profile, gt, today, makeWeeklyProjector(profile)))
    : [];
  const palier = decoupe ? currentMilestone(paliers, profile.weight_kg, gt) : null;

  // Progression départ → actuel → cible (marche dans les deux sens : perte ET prise).
  // Quand on découpe, la jauge mesure le PALIER : une barre à 8 % sur douze mois ne
  // bouge pas d'un pixel en une semaine, donc elle ne dit rien à personne.
  const denom = gt.start_weight_kg - gt.target_weight_kg;
  const progress = palier
    ? milestoneProgress(palier, paliers, profile.weight_kg, gt)
    : denom !== 0 ? Math.min(Math.max((gt.start_weight_kg - profile.weight_kg) / denom, 0), 1) : 1;

  return (
    <TouchableOpacity activeOpacity={OPACITE_PRESSION} onPress={onPress}>
      <Card t={t} style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Fusion 2026-08-06 : l'ICÔNE vient de main (le 🎯 a été retiré partout),
              le TOKEN typographique vient de la passe DA. Les deux passes ne se
              contredisent pas — elles portent sur deux axes différents. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <ObjectifIcon color={t.text} size={Icone.petite} />
            {/* Le titre porte le PALIER quand il y en a un — c'est la seule chose que
                la personne peut atteindre dans un horizon qui lui parle. La cible
                finale reste dite juste en dessous : la masquer serait décider à sa
                place ce qu'elle a le droit de savoir sur son propre objectif. */}
            <Text style={{ color: t.text, ...Type.h3 }}>
              {profile.weight_kg} → {palier ? palier.weightKg : gt.target_weight_kg} kg
            </Text>
          </View>
          <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>
            {!status.active ? 'Échéance passée'
              : palier ? `Étape ${palier.index}/${palier.total}`
                : `${status.weeksRemaining} sem`}
          </Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: t.text }} />
        </View>
        {/* Le palier a sa propre ligne, et elle dit sa DATE — lue sur la trajectoire
            simulée, donc c'est le jour où le moteur y sera vraiment, pauses comprises.
            Pas d'interpolation linéaire ici : ce serait la ligne droite que §10
            interdit, celle qui annonce « en retard » à qui suit le plan à la lettre.
            Ton d'acquis, jamais d'échéance à tenir — « ta prochaine étape », pas
            « tu dois atteindre ». Et la cible finale est rappelée, pour que le palier
            ne donne jamais l'impression d'avoir remplacé l'objectif. */}
        {palier && (
          <Text style={{ ...Type.caption, color: t.text }}>
            Prochaine étape : {palier.weightKg} kg
            {palier.stamp ? ` vers le ${formatFR(palier.stamp)}` : ''}
            {palier.index < palier.total ? ` · objectif ${gt.target_weight_kg} kg` : ''}
          </Text>
        )}
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
