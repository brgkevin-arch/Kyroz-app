import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, cardShadow } from '../constants/theme';
import { Goal } from '../lib/types';
import {
  MacroBody, macrosPercent, recommendedProteinPerKg, goalLabel, CARB_RATIO_MIN, CARB_RATIO_MAX,
  servedCarbSharePct, SPLIT_DIVERGENCE_TOLERANCE_PCT,
} from '../lib/tdee';
import { ConseilIcon } from './Icons';

// Mode « Perso % » (option B, contrôle total) :
//  • protéines réglables en g/kg (avec repère conseillé selon l'objectif),
//  • glucides/lipides répartis au % près sur l'énergie restante.
// Les grammes s'affichent en direct et suivent le poids.
const PROT_MIN = 1.2, PROT_MAX = 3.0;
// Bornes tirées du moteur (source unique) : les réécrire ici les ferait diverger,
// et c'est le moteur qui décide — il clampe désormais aussi à la LECTURE (P1.4).
const CARB_MIN = CARB_RATIO_MIN, CARB_MAX = CARB_RATIO_MAX;

interface Props {
  t: ThemePalette;
  tdee: number;
  goal: Goal;
  body: MacroBody;
  carbRatio: number;
  proteinPerKg: number;
  /** Delta calorique de l'objectif daté, s'il est actif. */
  kcalDeltaOverride?: number;
  /** Semaines déjà passées en zone d'énergie disponible basse (plancher escaladé). */
  lowEaWeeks?: number;
  onCarbChange: (v: number) => void;
  onProteinChange: (v: number) => void;
}

export function MacroSplit({
  t, tdee, goal, body, carbRatio, proteinPerKg, kcalDeltaOverride, lowEaWeeks,
  onCarbChange, onProteinChange,
}: Props) {
  const m = macrosPercent(tdee, goal, body, carbRatio, { proteinPerKg, kcalDeltaOverride, lowEaWeeks });
  // ⚠️ NE PAS revenir à `100 - carbRatio`. Ce calcul-là ignorait le moteur, alors que
  // le plancher lipidique passe AVANT le réglage : un curseur à 55 % de glucides en
  // sert 50, et les grammes affichés juste en dessous le montraient déjà. L'écran se
  // contredisait. On lit désormais ce qui sera réellement servi.
  const carbServi = servedCarbSharePct(m);
  const fatServi = 100 - carbServi;
  const ecarte = Math.abs(carbServi - carbRatio) > SPLIT_DIVERGENCE_TOLERANCE_PCT;
  const reco = recommendedProteinPerKg(goal);
  const bodyFat = body.body_fat_pct;
  // La base est TOUJOURS la masse maigre depuis P0.2 — estimée quand le %MG
  // n'est pas déclaré. L'étiquette doit dire ce que le calcul fait réellement.
  const proteinBasis = bodyFat != null ? 'ta masse maigre' : 'ta masse maigre estimée';
  const floored = m.flags.includes('FLOOR_APPLIED');

  return (
    <View style={{ gap: 14 }}>
      {/* Protéines */}
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: t.textTertiary }]}>PROTÉINES (g / kg de {proteinBasis})</Text>
        <Stepper t={t} value={proteinPerKg} min={PROT_MIN} max={PROT_MAX} step={0.1} decimals={1} unit="g/kg" color={t.accent} onChange={onProteinChange} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <ConseilIcon color={t.textSecondary} size={14} />
          <Text style={[styles.note, { color: t.textSecondary, flex: 1 }]}>
            Conseillé pour « {goalLabel(goal)} » : <Text style={{ fontWeight: '700' }}>{reco} g/kg</Text>
          </Text>
        </View>
        {bodyFat == null && (
          <Text style={[styles.note, { color: t.warning }]}>
            Renseigne ta masse grasse (Profil → Informations) pour caler les protéines sur ta masse maigre.
          </Text>
        )}
      </View>

      {/* Glucides / lipides */}
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: t.textTertiary }]}>RÉPARTITION DU RESTE (après protéines)</Text>
        <Stepper t={t} value={carbRatio} min={CARB_MIN} max={CARB_MAX} step={1} decimals={0} unit="% glucides" color={t.accent} onChange={onCarbChange} />
        <Text style={[styles.note, { color: t.textSecondary }]}>
          → <Text style={{ color: t.text, fontWeight: '700' }}>{fatServi}%</Text> lipides
        </Text>
        {ecarte && (
          // Ton : on explique, on ne reproche pas (règle produit §10). Le réglage
          // n'est pas « refusé », il est servi au plus près de ce que le corps permet.
          <Text style={[styles.note, { color: t.textTertiary }]}>
            Servi : <Text style={{ fontWeight: '700' }}>{carbServi}%</Text> glucides ·{' '}
            <Text style={{ fontWeight: '700' }}>{fatServi}%</Text> lipides. Kyroz garde un minimum
            de lipides pour tes hormones et tes vitamines, et répartit le reste selon ton réglage.
          </Text>
        )}
      </View>

      {/* Aperçu live des grammes */}
      <View style={[styles.preview, cardShadow(t), { backgroundColor: t.card }]}>
        <Row t={t} l="Objectif calorique" v={`${m.target_kcal} kcal`} strong />
        {floored && (
          <Text style={[styles.note, { color: t.warning }]}>
            Plancher de sécurité atteint : Kyroz ne descend pas sous {m.floor_kcal} kcal/jour pour ton gabarit et ton volume d'entraînement.
          </Text>
        )}
        <View style={[styles.sep, { backgroundColor: t.line }]} />
        <Row t={t} l="Protéines" v={`${m.protein_g} g`} />
        <Row t={t} l="Glucides" v={`${m.carbs_g} g`} />
        <Row t={t} l="Lipides" v={`${m.fat_g} g`} />
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
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.button, padding: 8, gap: 8 },
  btn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5 },
  input: { ...Type.h2, minWidth: 44, textAlign: 'right', padding: 0 },
  unit: { fontSize: 15, fontWeight: '700' },
  preview: { borderRadius: Radius.card, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sep: { height: 1 },
});
