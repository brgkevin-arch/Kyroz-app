import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius } from '../constants/theme';
import { PrimaryButton, Segmented } from './ui';
import { Food } from '../lib/types';
import { searchFoods, macrosForQuantity } from '../lib/foods';

// ── « J'ai mangé hors plan » ────────────────────────────────────────────────
// Deux façons de saisir l'écart :
//  • « Chercher un aliment » → base Ciqual + quantité → kcal calculés (précis).
//  • « Estimer vite » → chips préréglés ou kcal à la louche (rapide).
// On ne remonte que les kcal : le reste de la journée se recale (sur accord) en
// gardant la cible protéines pleine.

const CHIPS = [
  { label: 'Petit écart', sub: 'café gourmand, snack', kcal: 250 },
  { label: 'Un repas', sub: 'resto, fast-food léger', kcal: 600 },
  { label: 'Gros écart', sub: 'grosse sortie, apéro', kcal: 1000 },
];

const DEFAULT_GRAMS = 100;
const num = (s: string) => {
  const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

export function OffPlanSheet({
  t, onLog, onClose, dragHandlers,
}: {
  t: ThemePalette;
  onLog: (kcal: number) => void;
  onClose: () => void;
  dragHandlers?: any;
}) {
  const s = makeStyles(t);
  const [mode, setMode] = useState<'food' | 'quick'>('food');

  // Mode « aliment »
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState(String(DEFAULT_GRAMS));
  const foodKcal = picked ? Math.round(macrosForQuantity(picked, num(grams)).kcal) : 0;

  // Mode « estimer vite »
  const [sel, setSel] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const quickKcal = custom ? num(custom) : (sel ?? 0);

  const kcal = mode === 'food' ? foodKcal : quickKcal;
  const canLog = kcal > 0;

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>J'ai mangé hors plan</Text>
        <Text style={s.sub}>Cherche l'aliment dans notre base, ou estime à la louche.</Text>
      </View>

      <Segmented
        t={t}
        options={[{ label: 'Chercher un aliment', value: 'food' }, { label: 'Estimer vite', value: 'quick' }]}
        value={mode} onChange={setMode}
      />

      {mode === 'food' ? (
        picked ? (
          <View style={s.pickedCard}>
            <View style={s.pickedHead}>
              <Text style={s.pickedName}>{picked.name_fr}</Text>
              <TouchableOpacity onPress={() => { setPicked(null); setQuery(''); }} hitSlop={8}>
                <Text style={s.change}>Changer</Text>
              </TouchableOpacity>
            </View>
            <View style={s.gramsRow}>
              <Text style={s.gramsLabel}>Quantité</Text>
              <View style={[s.inputBox, { borderColor: t.line, width: 120 }]}>
                <TextInput
                  value={grams} onChangeText={setGrams} keyboardType="number-pad"
                  placeholder="100" placeholderTextColor={t.textQuaternary} style={s.input}
                />
                <Text style={s.inputSuffix}>g</Text>
              </View>
            </View>
            <Text style={s.pickedKcal}>≈ {foodKcal} kcal</Text>
          </View>
        ) : (
          <View>
            <View style={[s.inputBox, { borderColor: t.line }]}>
              <Ionicons name="search" size={16} color={t.textTertiary} />
              <TextInput
                value={query} onChangeText={setQuery} autoFocus
                placeholder="Ex. tarte aux fraises…" placeholderTextColor={t.textQuaternary}
                style={[s.input, { marginLeft: 8 }]}
              />
            </View>
            {query.trim().length > 0 && (
              <View style={s.suggest}>
                {searchFoods(query, 6).map((f) => (
                  <TouchableOpacity key={f.id} style={s.suggestRow} onPress={() => { setPicked(f); setGrams(String(DEFAULT_GRAMS)); }} activeOpacity={0.7}>
                    <Text style={s.suggestName}>{f.name_fr}</Text>
                    <Text style={s.suggestMacro}>{f.per100g.kcal} kcal /100g</Text>
                  </TouchableOpacity>
                ))}
                {searchFoods(query, 1).length === 0 && (
                  <Text style={s.suggestEmpty}>Aucun aliment trouvé — bascule sur « Estimer vite ».</Text>
                )}
              </View>
            )}
          </View>
        )
      ) : (
        <>
          <View style={s.chips}>
            {CHIPS.map((c) => {
              const on = !custom && sel === c.kcal;
              return (
                <TouchableOpacity
                  key={c.kcal} activeOpacity={0.85}
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
                value={custom} onChangeText={(v) => { setCustom(v); setSel(null); }}
                placeholder="0" placeholderTextColor={t.textQuaternary} keyboardType="number-pad" style={s.input}
              />
              <Text style={s.inputSuffix}>kcal</Text>
            </View>
          </View>
        </>
      )}

      <PrimaryButton
        t={t}
        label={canLog ? `Enregistrer (+${kcal} kcal)` : 'Choisis un aliment ou un écart'}
        onPress={() => { if (canLog) { onLog(kcal); onClose(); } }}
      />
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { padding: 24, gap: 16 },
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
    input: { flex: 1, paddingVertical: 14, fontSize: 17, fontWeight: '600', color: t.text },
    inputSuffix: { color: t.textTertiary, fontSize: 15 },
    suggest: { marginTop: 8, borderWidth: 1, borderColor: t.line, borderRadius: Radius.sm, overflow: 'hidden' },
    suggestRow: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.line },
    suggestName: { color: t.text, fontSize: 14, fontWeight: '600' },
    suggestMacro: { color: t.textTertiary, fontSize: 12, marginTop: 2 },
    suggestEmpty: { color: t.textTertiary, fontSize: 13, padding: 14 },
    pickedCard: { borderWidth: 1, borderColor: t.line, borderRadius: Radius.md, padding: 16, gap: 12 },
    pickedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    pickedName: { color: t.text, fontSize: 15, fontWeight: '700', flex: 1 },
    change: { color: t.textSecondary, fontSize: 13, fontWeight: '700' },
    gramsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    gramsLabel: { color: t.textSecondary, fontSize: 14 },
    pickedKcal: { color: t.text, fontSize: 18, fontWeight: '800' },
  });
}
