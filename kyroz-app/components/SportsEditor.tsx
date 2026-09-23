import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, useTheme, Radius, Type, Spacing, Trait, Icone, CIBLE_TACTILE_MIN } from '../constants/theme';
import { GrilleChoix } from './ui';
import { SportSession, SportType } from '../lib/types';
import {
  SPORT_ORDER, SPORT_LABEL, exerciseKcalPerDay,
  MIN_SESSION_MIN, MAX_SESSION_MIN, MAX_SESSIONS_PER_WEEK,
} from '../lib/sport';

// Valeurs par défaut à l'ajout d'un sport (cohérentes avec la cible : ~3×/sem, 1h).
const DEFAULT_SESSIONS = 3;
const DEFAULT_MINUTES = 60;
const MINUTE_STEP = 15;

type Props = {
  sports: SportSession[];
  weight?: number;            // poids (kg) → estimation kcal affichée
  onChange: (sports: SportSession[]) => void;
  /**
   * La réponse « je n'en fais pas », quand l'écran en exige une (l'inscription).
   * Rendue comme une case de la grille, pleine largeur, juste sous les sports : c'est
   * une réponse à la même question, pas un réglage à part. Le libellé vient de
   * l'appelant (le harnais le cherche dans l'onboarding).
   */
  aucunSport?: { label: string; selected: boolean; onToggle: () => void };
};

/**
 * Sélecteur de sports pratiqués (type + fréquence + durée) → alimente le calcul
 * MET du TDEE. Réutilisé à l'onboarding ET dans le profil.
 */
export default function SportsEditor({ sports, weight, onChange, aucunSport }: Props) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const byType = (type: SportType) => sports.find((x) => x.type === type);

  const toggle = (type: SportType) => {
    if (byType(type)) {
      onChange(sports.filter((x) => x.type !== type));
    } else {
      onChange([...sports, { type, sessions_per_week: DEFAULT_SESSIONS, minutes_per_session: DEFAULT_MINUTES }]);
    }
  };

  const update = (type: SportType, patch: Partial<SportSession>) =>
    onChange(sports.map((x) => (x.type === type ? { ...x, ...patch } : x)));

  // Sports sélectionnés, dans l'ordre d'affichage canonique.
  const selected = SPORT_ORDER.filter((type) => byType(type));
  const perDay = weight && weight > 0 ? exerciseKcalPerDay(sports, weight) : 0;

  return (
    <View>
      {/* 🔴 DEUX SPORTS PAR LIGNE, en rectangles encadrés qui prennent toute la largeur
          (décision fondateur, 2026-09-22 — c'étaient des pastilles qui s'enroulaient).
          La forme vit dans `ui.tsx::GrilleChoix`, partagée avec les préférences. */}
      <GrilleChoix
        t={t}
        options={SPORT_ORDER.map((type) => ({ label: SPORT_LABEL[type], value: type }))}
        estChoisi={(type) => !!byType(type)}
        onChoisir={toggle}
        pleineLargeur={aucunSport && {
          label: aucunSport.label, selected: aucunSport.selected, onPress: aucunSport.onToggle,
        }}
      />

      {/* Réglages par sport sélectionné : fréquence + durée */}
      {selected.map((type) => {
        const item = byType(type)!;
        return (
          <View key={type} style={s.row}>
            <Text style={s.rowTitle}>{SPORT_LABEL[type]}</Text>
            <Stepper
              t={t} label="séances / sem." value={item.sessions_per_week} suffix=""
              min={1} max={MAX_SESSIONS_PER_WEEK} step={1}
              onChange={(v) => update(type, { sessions_per_week: v })}
            />
            <Stepper
              t={t} label="durée" value={item.minutes_per_session} suffix=" min"
              min={MIN_SESSION_MIN} max={MAX_SESSION_MIN} step={MINUTE_STEP}
              onChange={(v) => update(type, { minutes_per_session: v })}
            />
          </View>
        );
      })}

      {perDay > 0 && (
        <Text style={s.estimate}>≈ {perDay} kcal/jour dépensées en sport, ajoutées à tes besoins</Text>
      )}
    </View>
  );
}

function Stepper({
  t, label, value, suffix, min, max, step, onChange,
}: {
  t: ThemePalette; label: string; value: number; suffix: string;
  min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  return (
    <View style={s.stepper}>
      <Text style={s.stepLabel}>{label}</Text>
      <View style={s.stepCtrls}>
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          disabled={value <= min}
          style={[s.stepBtn, value <= min && s.stepBtnOff]}
          accessibilityRole="button" accessibilityLabel={`Diminuer ${label}`}
        >
          <Ionicons name="remove" size={Icone.action} color={value <= min ? t.textTertiary : t.text} />
        </Pressable>
        <Text style={s.stepVal}>{value}{suffix}</Text>
        <Pressable
          onPress={() => onChange(clamp(value + step))}
          disabled={value >= max}
          style={[s.stepBtn, value >= max && s.stepBtnOff]}
          accessibilityRole="button" accessibilityLabel={`Augmenter ${label}`}
        >
          <Ionicons name="add" size={Icone.action} color={value >= max ? t.textTertiary : t.text} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: ThemePalette) =>
  StyleSheet.create({
    row: {
      marginTop: Spacing.md, padding: Spacing.lg, borderRadius: Radius.card,
      backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, gap: Spacing.md,
    },
    rowTitle: { ...Type.bodyStrong, color: t.text },

    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepLabel: { ...Type.bodySmall, color: t.textSecondary },
    stepCtrls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    // ⚠️ 44 et non 34 : ces deux boutons se pressent à répétition pour régler
    // un nombre de séances, et c'est le geste le plus fin de l'éditeur.
    // 🔴 PLUS DE CERCLE (demande fondateur, 2026-09-22) : juste le + et le −, un cran
    // plus grands. La zone qui répond au doigt, elle, garde ses 44 pt.
    stepBtn: {
      width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN,
      alignItems: 'center', justifyContent: 'center',
    },
    stepBtnOff: { opacity: 0.5 },
    stepVal: { ...Type.bodyStrong, color: t.text, minWidth: 64, textAlign: 'center' },

    estimate: { ...Type.caption, marginTop: Spacing.md, color: t.textSecondary, lineHeight: 18 },
  });
