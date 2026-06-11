import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, cardShadow } from '../constants/theme';
import { Goal, Sex } from '../lib/types';
import { macrosPercent, recommendedProteinPerKg, goalLabel } from '../lib/tdee';

// Mode « Perso % » (option B, contrôle total) :
//  • protéines réglables en g/kg (avec repère conseillé selon l'objectif),
//  • glucides/lipides répartis au % près sur l'énergie restante.
// Les grammes s'affichent en direct et suivent le poids.
const PROT_MIN = 1.2, PROT_MAX = 3.0;
const CARB_MIN = 10, CARB_MAX = 90;

interface Props {
  t: ThemePalette;
  tdee: number;
  goal: Goal;
  weight: number;
  sex: Sex;
  bodyFat?: number;
  carbRatio: number;
  proteinPerKg: number;
  onCarbChange: (v: number) => void;
  onProteinChange: (v: number) => void;
}

export function MacroSplit({
  t, tdee, goal, weight, sex, bodyFat, carbRatio, proteinPerKg, onCarbChange, onProteinChange,
}: Props) {
  const m = macrosPercent(tdee, goal, weight, sex, bodyFat, carbRatio, proteinPerKg);
  const fatRatio = 100 - carbRatio;
  const reco = recommendedProteinPerKg(goal);
  const proteinBasis = bodyFat != null ? 'ta masse maigre' : 'ton poids';

  return (
    <View style={{ gap: 14 }}>
      {/* Protéines */}
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: t.textTertiary }]}>PROTÉINES (g / kg de {proteinBasis})</Text>
        <Stepper t={t} value={proteinPerKg} min={PROT_MIN} max={PROT_MAX} step={0.1} decimals={1} unit="g/kg" color={t.protein} onChange={onProteinChange} />
        <Text style={[styles.note, { color: t.textSecondary }]}>
          💡 Conseillé pour « {goalLabel(goal)} » : <Text style={{ fontWeight: '700' }}>{reco} g/kg</Text>
        </Text>
        {bodyFat == null && (
          <Text style={[styles.note, { color: t.warning }]}>
            Renseigne ta masse grasse (Profil → Informations) pour caler les protéines sur ta masse maigre.
          </Text>
        )}
      </View>

      {/* Glucides / lipides */}
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: t.textTertiary }]}>RÉPARTITION DU RESTE (après protéines)</Text>
        <Stepper t={t} value={carbRatio} min={CARB_MIN} max={CARB_MAX} step={1} decimals={0} unit="% glucides" color={t.carbs} onChange={onCarbChange} />
        <Text style={[styles.note, { color: t.textSecondary }]}>
          → <Text style={{ color: t.fat, fontWeight: '700' }}>{fatRatio}%</Text> lipides
        </Text>
      </View>

      {/* Aperçu live des grammes */}
      <View style={[styles.preview, cardShadow(t), { backgroundColor: t.card }]}>
        <Row t={t} l="Objectif calorique" v={`${m.target_kcal} kcal`} strong />
        <View style={[styles.sep, { backgroundColor: t.line }]} />
        <Row t={t} l="Protéines" v={`${m.protein_g} g`} c={t.protein} />
        <Row t={t} l="Glucides" v={`${m.carbs_g} g`} c={t.carbs} />
        <Row t={t} l="Lipides" v={`${m.fat_g} g`} c={t.fat} />
      </View>
    </View>
  );
}

// Stepper réutilisable : − / + au pas voulu + saisie directe (champ local pour
// taper librement, on ne « commit » que les valeurs déjà dans la plage).
function Stepper({
  t, value, min, max, step, decimals, unit, color, onChange,
}: {
  t: ThemePalette; value: number; min: number; max: number; step: number;
  decimals: number; unit: string; color: string; onChange: (v: number) => void;
}) {
  const fmt = (v: number) => (decimals ? Number(v.toFixed(decimals)).toString() : String(Math.round(v)));
  const round = (v: number) => (decimals ? Math.round(v * 10) / 10 : Math.round(v));
  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  const [txt, setTxt] = useState(fmt(value));
  useEffect(() => { setTxt(fmt(value)); }, [value]);

  return (
    <View style={[styles.stepper, { backgroundColor: t.card, borderColor: t.line }]}>
      <TouchableOpacity
        onPress={() => onChange(clamp(round(value - step)))}
        disabled={value <= min}
        style={[styles.btn, { backgroundColor: t.fill, opacity: value <= min ? 0.4 : 1 }]}
      >
        <Ionicons name="remove" size={20} color={t.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <TextInput
          value={txt}
          onChangeText={(v) => {
            setTxt(v);
            const n = parseFloat(v.replace(',', '.'));
            if (!Number.isNaN(n) && n >= min && n <= max) onChange(round(n));
          }}
          onBlur={() => { const n = parseFloat(txt.replace(',', '.')); onChange(Number.isNaN(n) ? value : clamp(round(n))); }}
          keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
          maxLength={4}
          style={[styles.input, { color }]}
        />
        <Text style={[styles.unit, { color: t.text }]}>{unit}</Text>
      </View>

      <TouchableOpacity
        onPress={() => onChange(clamp(round(value + step)))}
        disabled={value >= max}
        style={[styles.btn, { backgroundColor: t.fill, opacity: value >= max ? 0.4 : 1 }]}
      >
        <Ionicons name="add" size={20} color={t.text} />
      </TouchableOpacity>
    </View>
  );
}

function Row({ t, l, v, c, strong }: { t: ThemePalette; l: string; v: string; c?: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: t.textSecondary, fontSize: 14 }}>{l}</Text>
      <Text style={{ color: c ?? t.text, fontSize: strong ? 18 : 15, fontWeight: '700' }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  note: { fontSize: 13, lineHeight: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, padding: 8, gap: 8 },
  btn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5 },
  input: { fontSize: 20, fontWeight: '800', minWidth: 44, textAlign: 'right', padding: 0 },
  unit: { fontSize: 15, fontWeight: '700' },
  preview: { borderRadius: Radius.md, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sep: { height: 1 },
});
