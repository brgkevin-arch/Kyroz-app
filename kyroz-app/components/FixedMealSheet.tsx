import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius } from '../constants/theme';
import { PrimaryButton, Segmented } from './ui';
import { Food, FixedMeal, MealType } from '../lib/types';
import { searchFoods, macrosForQuantity } from '../lib/foods';
import { kcalFromMacros } from '../lib/tdee';

// ── Définir un repas que l'utilisateur GÈRE lui-même (FixedMeal) ──────────────
// Deux façons :
//  • « Chercher un aliment » → base Ciqual + quantité → macros précises.
//  • « Saisir mon repas » → champ libre : nom + protéines/glucides/lipides (kcal
//    calculé). Couvre ses propres recettes / estimations.
// Le résultat est soustrait du budget du jour (cf. planEngine).

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'petit-déjeuner', lunch: 'déjeuner', dinner: 'dîner', snack: 'collation',
};
const DEFAULT_GRAMS = 100;
const num = (s: string) => {
  const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

export function FixedMealSheet({
  t, mealType, initial, onSave, onClose, dragHandlers,
}: {
  t: ThemePalette;
  mealType: MealType;
  initial?: FixedMeal;
  onSave: (fm: FixedMeal) => void;
  onClose: () => void;
  dragHandlers?: any;
}) {
  const s = makeStyles(t);
  const [mode, setMode] = useState<'food' | 'custom'>(initial?.source === 'custom' ? 'custom' : 'food');

  // Mode « aliment »
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState(String(DEFAULT_GRAMS));
  const foodMacros = picked ? macrosForQuantity(picked, num(grams)) : null;

  // Mode « champ libre »
  const [name, setName] = useState(initial?.label ?? '');
  const [p, setP] = useState(initial ? String(initial.macros.protein_g) : '');
  const [c, setC] = useState(initial ? String(initial.macros.carbs_g) : '');
  const [f, setF] = useState(initial ? String(initial.macros.fat_g) : '');
  const customKcal = kcalFromMacros(num(p), num(c), num(f));

  const canSaveFood = !!picked && num(grams) > 0;
  const canSaveCustom = name.trim().length > 0 && customKcal > 0;
  const canSave = mode === 'food' ? canSaveFood : canSaveCustom;

  function save() {
    if (mode === 'food' && picked && foodMacros) {
      const g = num(grams);
      onSave({
        label: picked.name_fr,
        source: 'food',
        macros: {
          kcal: Math.round(foodMacros.kcal),
          protein_g: Math.round(foodMacros.protein_g),
          carbs_g: Math.round(foodMacros.carbs_g),
          fat_g: Math.round(foodMacros.fat_g),
        },
        ingredients: [{ name: picked.name_fr, quantity_g: g, food_id: picked.id }],
      });
    } else if (mode === 'custom' && canSaveCustom) {
      onSave({
        label: name.trim(),
        source: 'custom',
        macros: { kcal: customKcal, protein_g: num(p), carbs_g: num(c), fat_g: num(f) },
      });
    }
    onClose();
  }

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>Mon {MEAL_LABELS[mealType]}</Text>
        <Text style={s.sub}>Dis-nous une fois ce que tu manges — Kyroz cale tes autres repas autour, sans te le redemander chaque jour.</Text>
      </View>

      <Segmented
        t={t}
        options={[{ label: 'Chercher un aliment', value: 'food' }, { label: 'Saisir mon repas', value: 'custom' }]}
        value={mode} onChange={setMode}
      />

      {mode === 'food' ? (
        picked && foodMacros ? (
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
                <TextInput value={grams} onChangeText={setGrams} keyboardType="number-pad"
                  placeholder="100" placeholderTextColor={t.textQuaternary} style={s.input} />
                <Text style={s.inputSuffix}>g</Text>
              </View>
            </View>
            <Text style={s.macroLine}>
              ≈ {Math.round(foodMacros.kcal)} kcal · {Math.round(foodMacros.protein_g)}g P · {Math.round(foodMacros.carbs_g)}g G · {Math.round(foodMacros.fat_g)}g L
            </Text>
          </View>
        ) : (
          <View>
            <View style={[s.inputBox, { borderColor: t.line }]}>
              <Ionicons name="search" size={16} color={t.textTertiary} />
              <TextInput value={query} onChangeText={setQuery} autoFocus
                placeholder="Ex. flocons d'avoine…" placeholderTextColor={t.textQuaternary}
                style={[s.input, { marginLeft: 8 }]} />
            </View>
            {query.trim().length > 0 && (
              <View style={s.suggest}>
                {searchFoods(query, 6).map((food) => (
                  <TouchableOpacity key={food.id} style={s.suggestRow} onPress={() => { setPicked(food); setGrams(String(DEFAULT_GRAMS)); }} activeOpacity={0.7}>
                    <Text style={s.suggestName}>{food.name_fr}</Text>
                    <Text style={s.suggestMacro}>{food.per100g.kcal} kcal /100g</Text>
                  </TouchableOpacity>
                ))}
                {searchFoods(query, 1).length === 0 && (
                  <Text style={s.suggestEmpty}>Aucun aliment trouvé — bascule sur « Saisir mon repas ».</Text>
                )}
              </View>
            )}
          </View>
        )
      ) : (
        <View style={{ gap: 12 }}>
          <View style={[s.inputBox, { borderColor: t.line }]}>
            <TextInput value={name} onChangeText={setName}
              placeholder="Nom (ex. Mon shaker + flocons)" placeholderTextColor={t.textQuaternary} style={s.input} />
          </View>
          <View style={s.macroInputs}>
            <MacroInput t={t} label="Protéines" value={p} onChange={setP} suffix="g" />
            <MacroInput t={t} label="Glucides" value={c} onChange={setC} suffix="g" />
            <MacroInput t={t} label="Lipides" value={f} onChange={setF} suffix="g" />
          </View>
          <Text style={s.macroLine}>= {customKcal} kcal</Text>
        </View>
      )}

      <PrimaryButton
        t={t}
        label={canSave ? 'Enregistrer ce repas' : 'Complète les infos'}
        onPress={() => { if (canSave) save(); }}
      />
    </View>
  );
}

function MacroInput({ t, label, value, onChange, suffix }: { t: ThemePalette; label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  const s = makeStyles(t);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.macroLabel}>{label}</Text>
      <View style={[s.inputBox, { borderColor: t.line }]}>
        <TextInput value={value} onChangeText={onChange} keyboardType="number-pad"
          placeholder="0" placeholderTextColor={t.textQuaternary} style={s.input} />
        <Text style={s.inputSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { padding: 24, gap: 16 },
    title: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 16 },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '600', color: t.text },
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
    macroInputs: { flexDirection: 'row', gap: 10 },
    macroLabel: { color: t.textSecondary, fontSize: 12, fontWeight: '600' },
    macroLine: { color: t.text, fontSize: 16, fontWeight: '800' },
  });
}
