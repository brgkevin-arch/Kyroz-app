import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, Spacing, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
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
              <Ionicons name="search" size={Icone.petite} color={t.textTertiary} />
              <TextInput value={query} onChangeText={setQuery} autoFocus
                placeholder="Ex. flocons d'avoine…" placeholderTextColor={t.textQuaternary}
                style={[s.input, { marginLeft: Spacing.sm }]} />
            </View>
            {query.trim().length > 0 && (
              <View style={s.suggest}>
                {searchFoods(query, 6).map((food) => (
                  <TouchableOpacity key={food.id} style={s.suggestRow} onPress={() => { setPicked(food); setGrams(String(DEFAULT_GRAMS)); }} activeOpacity={OPACITE_PRESSION}>
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
        <View style={{ gap: Spacing.md }}>
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
    <View style={{ flex: 1, gap: Spacing.sm }}>
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
    wrap: { padding: Spacing.xxl, gap: Spacing.lg },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, marginTop: Spacing.sm },
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
    macroInputs: { flexDirection: 'row', gap: Spacing.md },
    macroLabel: { ...Type.captionStrong, color: t.textSecondary },
    macroLine: { ...Type.label, color: t.text },
  });
}
