import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemePalette, Radius } from '../constants/theme';
import { PrimaryButton } from './ui';

// ── « J'ai mangé hors plan » ────────────────────────────────────────────────
// Saisie ultra-rapide d'un écart calorique (chips + champ libre). On ne demande
// que les kcal : le recalage garde la cible protéines pleine → les repas
// restants se densifient en protéines (exactement ce qu'on veut après un écart).

const CHIPS = [
  { label: 'Petit écart', sub: 'café gourmand, snack', kcal: 250 },
  { label: 'Un repas', sub: 'resto, fast-food léger', kcal: 600 },
  { label: 'Gros écart', sub: 'grosse sortie, apéro', kcal: 1000 },
];

export function OffPlanSheet({
  t, onLog, onClose, dragHandlers,
}: {
  t: ThemePalette;
  onLog: (kcal: number) => void;
  onClose: () => void;
  dragHandlers?: any;
}) {
  const s = makeStyles(t);
  const [sel, setSel] = useState<number | null>(null);
  const [custom, setCustom] = useState('');

  const customKcal = parseInt(custom.replace(/[^0-9]/g, ''), 10);
  const kcal = custom ? (Number.isNaN(customKcal) ? 0 : customKcal) : (sel ?? 0);
  const canLog = kcal > 0;

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>J'ai mangé hors plan</Text>
        <Text style={s.sub}>Estime à la louche — on recale tes repas restants pour rester dans ta cible du jour.</Text>
      </View>

      <View style={s.chips}>
        {CHIPS.map((c) => {
          const on = !custom && sel === c.kcal;
          return (
            <TouchableOpacity
              key={c.kcal}
              activeOpacity={0.85}
              onPress={() => { setSel(c.kcal); setCustom(''); }}
              style={[s.chip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}
            >
              <Text style={[s.chipLabel, { color: on ? t.onAccent : t.text }]}>{c.label}</Text>
              <Text style={[s.chipSub, { color: on ? t.onAccent : t.textSecondary }]}>{c.sub}</Text>
              <Text style={[s.chipKcal, { color: on ? t.onAccent : t.textTertiary }]}>≈ {c.kcal} kcal</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.customRow}>
        <Text style={s.customLabel}>Ou un chiffre précis</Text>
        <View style={[s.inputBox, { borderColor: t.line }]}>
          <TextInput
            value={custom}
            onChangeText={(v) => { setCustom(v); setSel(null); }}
            placeholder="0"
            placeholderTextColor={t.textQuaternary}
            keyboardType="number-pad"
            style={s.input}
          />
          <Text style={s.inputSuffix}>kcal</Text>
        </View>
      </View>

      <PrimaryButton
        t={t}
        label={canLog ? `Recaler ma journée (+${kcal} kcal)` : 'Choisis un écart'}
        onPress={() => { if (canLog) { onLog(kcal); onClose(); } }}
      />
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { padding: 24, gap: 18 },
    title: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6 },
    chips: { gap: 10 },
    chip: { borderWidth: 1, borderRadius: Radius.md, padding: 16, gap: 2 },
    chipLabel: { fontSize: 16, fontWeight: '700' },
    chipSub: { fontSize: 13 },
    chipKcal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    customRow: { gap: 8 },
    customLabel: { color: t.textSecondary, fontSize: 13, fontWeight: '600' },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 16 },
    input: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: t.text },
    inputSuffix: { color: t.textTertiary, fontSize: 15 },
  });
}
