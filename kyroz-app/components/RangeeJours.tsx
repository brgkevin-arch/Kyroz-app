import React from 'react';
import { View, Text } from 'react-native';
import { Presse } from './Presse';
import { ThemePalette, Spacing, Radius, Trait, Type, OPACITE_PRESSION } from '../constants/theme';

/**
 * Les sept jours de la semaine en UNE ligne de sept cases (décision fondateur,
 * 2026-09-23, à l'inscription). Partagée depuis le 2026-09-30 avec le Profil (jours du
 * plan, jours de repos) et les Réglages (jour de la pesée) : la même question se
 * pose de la même façon partout — ailleurs, c'étaient des pastilles sur deux lignes.
 *
 * ⚠️ Les valeurs suivent `Date.getDay()` (0 = dimanche), comme `plan_weekdays`,
 * `rest_weekdays` et `weigh_in_day`. L'ORDRE d'affichage, lui, commence le lundi.
 */
export const JOURS_SEMAINE: { label: string; long: string; val: number }[] = [
  { label: 'Lun', long: 'Lundi', val: 1 }, { label: 'Mar', long: 'Mardi', val: 2 },
  { label: 'Mer', long: 'Mercredi', val: 3 }, { label: 'Jeu', long: 'Jeudi', val: 4 },
  { label: 'Ven', long: 'Vendredi', val: 5 }, { label: 'Sam', long: 'Samedi', val: 6 },
  { label: 'Dim', long: 'Dimanche', val: 0 },
];

export function RangeeJours({ t, choisis, onChoisir }: { t: ThemePalette; choisis: number[]; onChoisir: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
      {JOURS_SEMAINE.map((d) => {
        const on = choisis.includes(d.val);
        return (
          <Presse
            key={d.val} onPress={() => onChoisir(d.val)} activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button" accessibilityLabel={d.long} accessibilityState={{ selected: on }}
            style={{
              flex: 1, height: 48, borderRadius: Radius.button, borderWidth: Trait.fin,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line,
            }}
          >
            <Text style={{ ...Type.captionStrong, color: on ? t.onAccent : t.textTertiary }}>{d.label}</Text>
          </Presse>
        );
      })}
    </View>
  );
}
