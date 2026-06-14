import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, useTheme } from '../constants/theme';
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
};

/**
 * Sélecteur de sports pratiqués (type + fréquence + durée) → alimente le calcul
 * MET du TDEE. Réutilisé à l'onboarding ET dans le profil.
 */
export default function SportsEditor({ sports, weight, onChange }: Props) {
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
      {/* Grille de chips : tap pour ajouter/retirer un sport */}
      <View style={s.wrap}>
        {SPORT_ORDER.map((type) => {
          const on = !!byType(type);
          return (
            <Pressable
              key={type}
              onPress={() => toggle(type)}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{SPORT_LABEL[type]}</Text>
            </Pressable>
          );
        })}
      </View>

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
          <Ionicons name="remove" size={18} color={value <= min ? t.textTertiary : t.text} />
        </Pressable>
        <Text style={s.stepVal}>{value}{suffix}</Text>
        <Pressable
          onPress={() => onChange(clamp(value + step))}
          disabled={value >= max}
          style={[s.stepBtn, value >= max && s.stepBtnOff]}
          accessibilityRole="button" accessibilityLabel={`Augmenter ${label}`}
        >
          <Ionicons name="add" size={18} color={value >= max ? t.textTertiary : t.text} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: ThemePalette) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999,
      backgroundColor: t.fill, borderWidth: 1, borderColor: t.line,
    },
    chipOn: { backgroundColor: t.accent, borderColor: t.accent },
    chipTxt: { color: t.text, fontSize: 14, fontWeight: '600' },
    chipTxtOn: { color: t.onAccent },

    row: {
      marginTop: 12, padding: 14, borderRadius: 14,
      backgroundColor: t.card, borderWidth: 1, borderColor: t.line, gap: 12,
    },
    rowTitle: { color: t.text, fontSize: 15, fontWeight: '700' },

    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepLabel: { color: t.textSecondary, fontSize: 14 },
    stepCtrls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: {
      width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.fill, borderWidth: 1, borderColor: t.line,
    },
    stepBtnOff: { opacity: 0.5 },
    stepVal: { color: t.text, fontSize: 15, fontWeight: '700', minWidth: 64, textAlign: 'center' },

    estimate: { marginTop: 12, color: t.textSecondary, fontSize: 13, lineHeight: 18 },
  });
