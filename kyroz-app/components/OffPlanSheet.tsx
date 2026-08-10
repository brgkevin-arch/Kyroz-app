import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Presse } from './Presse';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, Spacing, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
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
  /**
   * `label` = CE QUE C'ÉTAIT, quand on le sait (E6). Absent en saisie libre : taper
   * « 380 » ne nomme rien, et une chaîne vide serait un faux nom.
   */
  onLog: (kcal: number, label?: string) => void;
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
  // Le nom EXISTE ici — il était jeté au moment de l'enregistrement (E6). En mode
  // aliment on garde la quantité : « Pizza » et « Pizza · 300 g » ne racontent pas la
  // même journée. En mode rapide, seul un raccourci CHOISI porte un sens ; un nombre
  // tapé à la main n'en porte aucun.
  const label = mode === 'food'
    ? (picked ? `${picked.name_fr} · ${num(grams)} g` : undefined)
    : (!custom && sel != null ? CHIPS.find((c) => c.kcal === sel)?.label : undefined);

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
              <Presse onPress={() => { setPicked(null); setQuery(''); }} hitSlop={8}>
                <Text style={s.change}>Changer</Text>
              </Presse>
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
              <Ionicons name="search" size={Icone.petite} color={t.textTertiary} />
              <TextInput
                value={query} onChangeText={setQuery} autoFocus
                placeholder="Ex. tarte aux fraises…" placeholderTextColor={t.textQuaternary}
                style={[s.input, { marginLeft: Spacing.sm }]}
              />
            </View>
            {query.trim().length > 0 && (
              <View style={s.suggest}>
                {searchFoods(query, 6).map((f) => (
                  <Presse key={f.id} style={s.suggestRow} onPress={() => { setPicked(f); setGrams(String(DEFAULT_GRAMS)); }} activeOpacity={OPACITE_PRESSION}>
                    <Text style={s.suggestName}>{f.name_fr}</Text>
                    <Text style={s.suggestMacro}>{f.per100g.kcal} kcal /100g</Text>
                  </Presse>
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
                <Presse
                  key={c.kcal} activeOpacity={OPACITE_PRESSION}
                  onPress={() => { setSel(c.kcal); setCustom(''); }}
                  style={[s.chip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}
                >
                  <Text style={[s.chipLabel, { color: on ? t.onAccent : t.text }]}>{c.label}</Text>
                  <Text style={[s.chipSub, { color: on ? t.onAccent : t.textSecondary }]}>{c.sub}</Text>
                  <Text style={[s.chipKcal, { color: on ? t.onAccent : t.textTertiary }]}>≈ {c.kcal} kcal</Text>
                </Presse>
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
        onPress={() => { if (canLog) { onLog(kcal, label); onClose(); } }}
      />
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { padding: Spacing.xxl, gap: Spacing.lg },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, marginTop: Spacing.sm },
    chips: { gap: Spacing.md },
    chip: { borderWidth: Trait.fin, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.xs },
    chipLabel: { ...Type.label },
    chipSub: { ...Type.caption },
    chipKcal: { ...Type.captionStrong, marginTop: Spacing.xs },
    customRow: { gap: Spacing.sm },
    customLabel: { ...Type.captionStrong, color: t.textSecondary },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: Trait.fin, borderRadius: Radius.button, paddingHorizontal: Spacing.lg },
    input: { ...Type.input, flex: 1, paddingVertical: Spacing.lg, color: t.text },
    inputSuffix: { ...Type.body, color: t.textTertiary },
    suggest: { marginTop: Spacing.sm, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.sm, overflow: 'hidden' },
    suggestRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', borderBottomWidth: Trait.fin, borderBottomColor: t.line },
    suggestName: { ...Type.bodySmallStrong, color: t.text },
    suggestMacro: { ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs },
    suggestEmpty: { ...Type.caption, color: t.textTertiary, padding: Spacing.lg },
    pickedCard: { borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.md },
    pickedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
    pickedName: { ...Type.bodyStrong, color: t.text, flex: 1 },
    change: { ...Type.captionStrong, color: t.textSecondary },
    gramsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    gramsLabel: { ...Type.bodySmall, color: t.textSecondary },
    pickedKcal: { ...Type.h3, color: t.text },
  });
}
