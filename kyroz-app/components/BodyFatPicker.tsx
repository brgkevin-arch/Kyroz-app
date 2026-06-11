import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { ThemePalette, Radius } from '../constants/theme';
import { Field } from './ui';
import { Sex } from '../lib/types';
import { BODY_FAT_MIN, BODY_FAT_MAX } from '../lib/tdee';

// ── Sélecteur de masse grasse ────────────────────────────────────────────────
// 6 niveaux de corpulence (valeurs sexuées, calées sur les chartes visuelles de
// % de masse grasse) + saisie manuelle du % exact. Optionnel : si rien n'est
// choisi, le calcul retombe sur Mifflin-St Jeor.
//
// 6 rendus 3D détourés par sexe (assets/bodyfat), une image par niveau.

const IMAGES: Record<Sex, ImageSourcePropType[]> = {
  male: [
    require('../assets/bodyfat/male-1.png'),
    require('../assets/bodyfat/male-2.png'),
    require('../assets/bodyfat/male-3.png'),
    require('../assets/bodyfat/male-4.png'),
    require('../assets/bodyfat/male-5.png'),
    require('../assets/bodyfat/male-6.png'),
  ],
  female: [
    require('../assets/bodyfat/female-1.png'),
    require('../assets/bodyfat/female-2.png'),
    require('../assets/bodyfat/female-3.png'),
    require('../assets/bodyfat/female-4.png'),
    require('../assets/bodyfat/female-5.png'),
    require('../assets/bodyfat/female-6.png'),
  ],
};

type Level = { pct: number; label: string; desc: string };

const LEVELS: Record<Sex, Level[]> = {
  male: [
    { pct: 10, label: '~10 %', desc: 'Abdos très dessinés, sec' },
    { pct: 15, label: '~15 %', desc: 'Abdos visibles, athlétique' },
    { pct: 20, label: '~20 %', desc: 'Silhouette tonique' },
    { pct: 25, label: '~25 %', desc: 'Peu de définition' },
    { pct: 30, label: '~30 %', desc: 'Ventre rond, formes marquées' },
    { pct: 35, label: '~35 %', desc: 'Surpoids visible' },
  ],
  female: [
    { pct: 18, label: '~18 %', desc: 'Très athlétique, abdos visibles' },
    { pct: 23, label: '~23 %', desc: 'Tonique, galbe défini' },
    { pct: 28, label: '~28 %', desc: 'Silhouette équilibrée' },
    { pct: 33, label: '~33 %', desc: 'Formes plus marquées' },
    { pct: 38, label: '~38 %', desc: 'Rondeurs visibles' },
    { pct: 43, label: '~43 %', desc: 'Surpoids visible' },
  ],
};

interface Props {
  t: ThemePalette;
  sex: Sex;
  value?: number;
  onChange: (pct: number | undefined) => void;
}

export function BodyFatPicker({ t, sex, value, onChange }: Props) {
  const levels = LEVELS[sex];

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.grid}>
        {levels.map((lv, i) => {
          const on = value === lv.pct;
          return (
            <TouchableOpacity
              key={lv.pct}
              activeOpacity={0.85}
              onPress={() => onChange(on ? undefined : lv.pct)}
              style={[
                styles.cell,
                { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line },
              ]}
            >
              <View style={styles.figure}>
                <Image
                  source={IMAGES[sex][i]}
                  style={[styles.img, on && { opacity: 0.9 }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.pct, { color: on ? t.onAccent : t.text }]}>{lv.label}</Text>
              <Text style={[styles.desc, { color: on ? t.onAccent : t.textSecondary }]}>{lv.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Field
        t={t}
        label="Ou saisis ton % exact (si tu le connais)"
        suffix="%"
        keyboardType="decimal-pad"
        value={value != null ? String(value) : ''}
        onChangeText={(txt) => {
          const n = parseFloat(txt.replace(',', '.'));
          if (!txt) return onChange(undefined);
          if (Number.isNaN(n)) return;
          onChange(Math.min(Math.max(n, BODY_FAT_MIN), BODY_FAT_MAX));
        }}
        placeholder="ex. 18"
      />

      {value != null && (
        <TouchableOpacity onPress={() => onChange(undefined)} activeOpacity={0.7} style={styles.clear}>
          <Text style={{ color: t.textTertiary, fontSize: 13, fontWeight: '600' }}>Effacer · je ne sais pas</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
    alignItems: 'center',
  },
  figure: { height: 104, alignItems: 'center', justifyContent: 'center' },
  img: { height: 104, aspectRatio: 220 / 462 },
  pct: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  desc: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  clear: { alignSelf: 'flex-start', paddingVertical: 2 },
});
