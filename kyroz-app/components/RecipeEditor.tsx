import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing } from '../constants/theme';
import { Field, PrimaryButton, Segmented } from './ui';
import { Recipe, Ingredient } from '../lib/types';
import { searchFoods, recipeMacrosPerPortion } from '../lib/foods';

interface Props {
  t: ThemePalette;
  recipe: Recipe;
  isCustom: boolean;            // déjà personnalisée → propose « Réinitialiser »
  onSave: (recipe: Recipe) => void;
  onReset: () => void;
  onCancel: () => void;
  dragHandlers?: any;
}

type IngDraft = { name: string; quantity_g: string; unit?: string; food_id?: string };

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
    recipe.ingredients.map((i) => ({ name: i.name, quantity_g: String(i.quantity_g), unit: i.unit, food_id: i.food_id })),
  );
  const [steps, setSteps] = useState<string[]>([...recipe.steps]);
  // Mode macros : 'auto' = calculées depuis les ingrédients liés à la base ;
  // 'manual' = saisies à la main (comportement historique, repli). Par défaut auto
  // si la recette a déjà des ingrédients liés (food_id), sinon manuel.
  const [macroMode, setMacroMode] = useState<'auto' | 'manual'>(
    recipe.ingredients.some((i) => i.food_id) ? 'auto' : 'manual',
  );
  const [searchRow, setSearchRow] = useState<number | null>(null); // ligne en cours de recherche d'aliment

  // Macros recalculées en direct depuis les ingrédients liés (null si aucun lié).
  const computed = useMemo(
    () => recipeMacrosPerPortion(
      ings.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), quantity_g: num(i.quantity_g), food_id: i.food_id })),
      num(portions),
    ),
    [ings, portions],
  );

  // Éditer le NOM à la main délie l'ingrédient de la base (food_id retiré).
  const setIng = (i: number, patch: Partial<IngDraft>) =>
    setIngs((arr) => arr.map((x, k) => {
      if (k !== i) return x;
      const next = { ...x, ...patch };
      if (patch.name !== undefined && patch.food_id === undefined) next.food_id = undefined;
      return next;
    }));
  const pickFood = (i: number, foodId: string, foodName: string) => {
    setIngs((arr) => arr.map((x, k) => (k === i ? { ...x, name: foodName, food_id: foodId } : x)));
    setSearchRow(null);
  };
  const removeIng = (i: number) => { setIngs((arr) => arr.filter((_, k) => k !== i)); setSearchRow(null); };
  const addIng = () => setIngs((arr) => [...arr, { name: '', quantity_g: '' }]);

  const setStep = (i: number, v: string) => setSteps((arr) => arr.map((x, k) => (k === i ? v : x)));
  const removeStep = (i: number) => setSteps((arr) => arr.filter((_, k) => k !== i));
  const addStep = () => setSteps((arr) => [...arr, '']);

  const valid = name.trim().length > 0 && num(portions) > 0;

  const save = () => {
    if (!valid) return;
    const ingredients: Ingredient[] = ings
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), quantity_g: num(i.quantity_g), ...(i.unit ? { unit: i.unit } : {}), ...(i.food_id ? { food_id: i.food_id } : {}) }));
    // Mode auto + ingrédients liés → macros calculées (le plan suivra). Sinon manuel.
    const macros_per_portion = (macroMode === 'auto' && computed)
      ? computed.macros
      : {
          kcal: Math.max(0, Math.round(num(kcal))),
          protein_g: Math.max(0, Math.round(num(prot))),
          carbs_g: Math.max(0, Math.round(num(carb))),
          fat_g: Math.max(0, Math.round(num(fat))),
        };
    const next: Recipe = {
      ...recipe,
      name_fr: name.trim(),
      prep_time_min: Math.max(0, Math.round(num(prep))),
      portions: Math.max(1, num(portions)),
      macros_per_portion,
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

        <Text style={s.section}>INGRÉDIENTS</Text>
        <Text style={s.hint}>Cherche un aliment pour lier ses macros — le calcul se met à jour tout seul.</Text>
        {ings.map((ing, i) => (
          <View key={i}>
            <View style={s.ingRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[s.input, ing.food_id ? s.inputLinked : null]} value={ing.name}
                  onChangeText={(v) => { setIng(i, { name: v }); setSearchRow(v.trim() ? i : null); }}
                  onFocus={() => setSearchRow(ing.name.trim() ? i : null)}
                  placeholder="Cherche un aliment…" placeholderTextColor={t.textQuaternary}
                />
              </View>
              <TextInput
                style={[s.input, s.qty]} value={ing.quantity_g} onChangeText={(v) => setIng(i, { quantity_g: v })}
                placeholder="g" placeholderTextColor={t.textQuaternary} keyboardType="decimal-pad"
              />
              <TouchableOpacity onPress={() => removeIng(i)} style={s.del} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={t.textTertiary} />
              </TouchableOpacity>
            </View>
            {ing.food_id && (
              <Text style={s.linkedTag}><Ionicons name="checkmark-circle" size={12} color={t.success} /> macros liées à la base</Text>
            )}
            {searchRow === i && ing.name.trim().length > 0 && (
              <View style={s.suggest}>
                {searchFoods(ing.name, 6).map((f) => (
                  <TouchableOpacity key={f.id} style={s.suggestRow} onPress={() => pickFood(i, f.id, f.name_fr)} activeOpacity={0.7}>
                    <Text style={s.suggestName}>{f.name_fr}</Text>
                    <Text style={s.suggestMacro}>{f.per100g.kcal} kcal · {f.per100g.protein_g}P /100g</Text>
                  </TouchableOpacity>
                ))}
                {searchFoods(ing.name, 1).length === 0 && (
                  <Text style={s.suggestEmpty}>Aucun aliment trouvé — il restera libre (macros à saisir à la main).</Text>
                )}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={addIng} style={s.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={t.text} />
          <Text style={s.addTxt}>Ajouter un ingrédient</Text>
        </TouchableOpacity>

        <Text style={s.section}>MACROS / PORTION</Text>
        <Segmented
          t={t}
          options={[{ label: 'Auto (ingrédients)', value: 'auto' }, { label: 'Manuel', value: 'manual' }]}
          value={macroMode} onChange={setMacroMode}
        />
        {macroMode === 'auto' ? (
          computed ? (
            <View style={s.computed}>
              <View style={s.computedRow}>
                <MacroCell t={t} label="kcal" value={computed.macros.kcal} />
                <MacroCell t={t} label="Prot." value={`${computed.macros.protein_g} g`} color={t.protein} />
                <MacroCell t={t} label="Gluc." value={`${computed.macros.carbs_g} g`} color={t.carbs} />
                <MacroCell t={t} label="Lip." value={`${computed.macros.fat_g} g`} color={t.fat} />
              </View>
              {computed.matchedRatio < 0.99 && (
                <Text style={s.warn}>⚠️ {Math.round((1 - computed.matchedRatio) * 100)}% des ingrédients ne sont pas liés à la base — le total est partiel. Lie-les ou passe en Manuel.</Text>
              )}
            </View>
          ) : (
            <Text style={s.warn}>Lie au moins un ingrédient à la base pour calculer les macros, ou passe en Manuel.</Text>
          )
        ) : (
          <>
            <View style={s.row2}>
              <View style={{ flex: 1 }}><Field t={t} label="Calories" suffix="kcal" value={kcal} onChangeText={setKcal} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field t={t} label="Protéines" suffix="g" value={prot} onChangeText={setProt} keyboardType="number-pad" /></View>
            </View>
            <View style={s.row2}>
              <View style={{ flex: 1 }}><Field t={t} label="Glucides" suffix="g" value={carb} onChangeText={setCarb} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field t={t} label="Lipides" suffix="g" value={fat} onChangeText={setFat} keyboardType="number-pad" /></View>
            </View>
            <Text style={s.hint}>Astuce : ajuste les macros si tu changes une quantité, pour garder ton plan précis.</Text>
          </>
        )}

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

function MacroCell({ t, label, value, color }: { t: ThemePalette; label: string; value: string | number; color?: string }) {
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.cell}>
      <Text style={[s.cellVal, color ? { color } : null]}>{value}</Text>
      <Text style={s.cellLabel}>{label}</Text>
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
    inputLinked: { borderColor: t.success },
    linkedTag: { color: t.success, fontSize: 11, fontWeight: '600', marginTop: 3, marginLeft: 2 },
    suggest: { marginTop: 4, borderWidth: 1, borderColor: t.line, borderRadius: Radius.sm, overflow: 'hidden' },
    suggestRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.line, backgroundColor: t.scheme === 'dark' ? t.fill : t.card },
    suggestName: { color: t.text, fontSize: 14, fontWeight: '600' },
    suggestMacro: { color: t.textTertiary, fontSize: 12, marginTop: 2 },
    suggestEmpty: { color: t.textTertiary, fontSize: 12, padding: 12 },
    computed: { marginTop: 4, padding: 12, borderRadius: Radius.sm, borderWidth: 1, borderColor: t.line, backgroundColor: t.scheme === 'dark' ? t.fill : t.card, gap: 8 },
    computedRow: { flexDirection: 'row', justifyContent: 'space-between' },
    cell: { alignItems: 'center', flex: 1 },
    cellVal: { color: t.text, fontSize: 17, fontWeight: '800' },
    cellLabel: { color: t.textTertiary, fontSize: 11, marginTop: 2 },
    warn: { color: t.warning, fontSize: 12, lineHeight: 17, marginTop: 6 },
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
