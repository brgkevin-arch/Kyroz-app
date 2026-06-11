import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing } from '../constants/theme';
import { Field, PrimaryButton } from './ui';
import { Recipe, Ingredient } from '../lib/types';

interface Props {
  t: ThemePalette;
  recipe: Recipe;
  isCustom: boolean;            // déjà personnalisée → propose « Réinitialiser »
  onSave: (recipe: Recipe) => void;
  onReset: () => void;
  onCancel: () => void;
  dragHandlers?: any;
}

type IngDraft = { name: string; quantity_g: string; unit?: string };

const num = (s: string) => {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function RecipeEditor({ t, recipe, isCustom, onSave, onReset, onCancel, dragHandlers }: Props) {
  const s = useMemo(() => makeStyles(t), [t]);

  const [name, setName] = useState(recipe.name_fr);
  const [prep, setPrep] = useState(String(recipe.prep_time_min));
  const [portions, setPortions] = useState(String(recipe.portions));
  const [kcal, setKcal] = useState(String(recipe.macros_per_portion.kcal));
  const [prot, setProt] = useState(String(recipe.macros_per_portion.protein_g));
  const [carb, setCarb] = useState(String(recipe.macros_per_portion.carbs_g));
  const [fat, setFat] = useState(String(recipe.macros_per_portion.fat_g));
  const [ings, setIngs] = useState<IngDraft[]>(
    recipe.ingredients.map((i) => ({ name: i.name, quantity_g: String(i.quantity_g), unit: i.unit })),
  );
  const [steps, setSteps] = useState<string[]>([...recipe.steps]);

  const setIng = (i: number, patch: Partial<IngDraft>) =>
    setIngs((arr) => arr.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const removeIng = (i: number) => setIngs((arr) => arr.filter((_, k) => k !== i));
  const addIng = () => setIngs((arr) => [...arr, { name: '', quantity_g: '' }]);

  const setStep = (i: number, v: string) => setSteps((arr) => arr.map((x, k) => (k === i ? v : x)));
  const removeStep = (i: number) => setSteps((arr) => arr.filter((_, k) => k !== i));
  const addStep = () => setSteps((arr) => [...arr, '']);

  const valid = name.trim().length > 0 && num(portions) > 0;

  const save = () => {
    if (!valid) return;
    const ingredients: Ingredient[] = ings
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), quantity_g: num(i.quantity_g), ...(i.unit ? { unit: i.unit } : {}) }));
    const next: Recipe = {
      ...recipe,
      name_fr: name.trim(),
      prep_time_min: Math.max(0, Math.round(num(prep))),
      portions: Math.max(1, num(portions)),
      macros_per_portion: {
        kcal: Math.max(0, Math.round(num(kcal))),
        protein_g: Math.max(0, Math.round(num(prot))),
        carbs_g: Math.max(0, Math.round(num(carb))),
        fat_g: Math.max(0, Math.round(num(fat))),
      },
      ingredients,
      steps: steps.map((x) => x.trim()).filter(Boolean),
      validated_by_dietitian: false, // version perso → plus « validée »
    };
    onSave(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header} {...(dragHandlers ?? {})}>
        <Text style={s.title}>Personnaliser la recette</Text>
        <Text style={s.sub}>Ajuste-la comme TU l'aimes — ta version sera utilisée partout.</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Field t={t} label="Nom" value={name} onChangeText={setName} autoCapitalize="sentences" />

        <View style={s.row2}>
          <View style={{ flex: 1 }}><Field t={t} label="Temps" suffix="min" value={prep} onChangeText={setPrep} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field t={t} label="Portions" value={portions} onChangeText={setPortions} keyboardType="decimal-pad" /></View>
        </View>

        <Text style={s.section}>MACROS / PORTION</Text>
        <View style={s.row2}>
          <View style={{ flex: 1 }}><Field t={t} label="Calories" suffix="kcal" value={kcal} onChangeText={setKcal} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field t={t} label="Protéines" suffix="g" value={prot} onChangeText={setProt} keyboardType="number-pad" /></View>
        </View>
        <View style={s.row2}>
          <View style={{ flex: 1 }}><Field t={t} label="Glucides" suffix="g" value={carb} onChangeText={setCarb} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field t={t} label="Lipides" suffix="g" value={fat} onChangeText={setFat} keyboardType="number-pad" /></View>
        </View>
        <Text style={s.hint}>Astuce : ajuste les macros si tu changes une quantité, pour garder ton plan précis.</Text>

        <Text style={s.section}>INGRÉDIENTS</Text>
        {ings.map((ing, i) => (
          <View key={i} style={s.ingRow}>
            <TextInput
              style={[s.input, { flex: 1 }]} value={ing.name} onChangeText={(v) => setIng(i, { name: v })}
              placeholder="Ingrédient" placeholderTextColor={t.textQuaternary}
            />
            <TextInput
              style={[s.input, s.qty]} value={ing.quantity_g} onChangeText={(v) => setIng(i, { quantity_g: v })}
              placeholder="g" placeholderTextColor={t.textQuaternary} keyboardType="decimal-pad"
            />
            <TouchableOpacity onPress={() => removeIng(i)} style={s.del} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={t.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addIng} style={s.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={t.text} />
          <Text style={s.addTxt}>Ajouter un ingrédient</Text>
        </TouchableOpacity>

        <Text style={s.section}>PRÉPARATION</Text>
        {steps.map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepN}><Text style={s.stepNTxt}>{i + 1}</Text></View>
            <TextInput
              style={[s.input, { flex: 1 }]} value={step} onChangeText={(v) => setStep(i, v)}
              placeholder="Étape…" placeholderTextColor={t.textQuaternary} multiline
            />
            <TouchableOpacity onPress={() => removeStep(i)} style={s.del} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={t.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addStep} style={s.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={t.text} />
          <Text style={s.addTxt}>Ajouter une étape</Text>
        </TouchableOpacity>

        {isCustom && (
          <TouchableOpacity onPress={onReset} style={s.reset} activeOpacity={0.7}>
            <Ionicons name="refresh" size={16} color={t.danger} />
            <Text style={s.resetTxt}>Réinitialiser à la recette d'origine</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={s.footer}>
        <PrimaryButton t={t} label="Enregistrer ma version" onPress={save} disabled={!valid} />
        <TouchableOpacity onPress={onCancel} style={s.cancel} activeOpacity={0.7}>
          <Text style={s.cancelTxt}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    header: { paddingHorizontal: Spacing.xxl, paddingBottom: 10, gap: 6 },
    title: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    content: { padding: Spacing.xxl, paddingTop: 8, gap: 14, paddingBottom: 32 },
    row2: { flexDirection: 'row', gap: 12 },
    section: { color: t.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 6 },
    hint: { color: t.textTertiary, fontSize: 12, lineHeight: 16, marginTop: -6 },
    input: {
      backgroundColor: t.scheme === 'dark' ? t.fill : t.card, borderWidth: 1, borderColor: t.line,
      borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.text,
    },
    ingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qty: { width: 76, textAlign: 'center' },
    del: { padding: 2 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stepN: { width: 26, height: 26, borderRadius: 13, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    stepNTxt: { color: t.text, fontSize: 12, fontWeight: '700' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.sm, borderWidth: 1, borderColor: t.line, borderStyle: 'dashed' },
    addTxt: { color: t.text, fontSize: 14, fontWeight: '600' },
    reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
    resetTxt: { color: t.danger, fontSize: 14, fontWeight: '600' },
    footer: { padding: Spacing.xxl, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.line, gap: 6 },
    cancel: { alignItems: 'center', paddingVertical: 10 },
    cancelTxt: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },
  });
}
