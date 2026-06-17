import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../constants/theme';
import { PrimaryButton } from './ui';
import { useFavorites } from '../hooks/useFavorites';
import { formatQuantity } from '../lib/units';
import { mealFiberG, mealFiberFromIngredients } from '../lib/fiber';
import { Recipe, MealStatus, Macros, AdaptFlag } from '../lib/types';
import { OBJ_LABEL, SPORT_LABEL } from '../lib/recipeLabels';

interface Props {
  recipe: Recipe;
  portions?: number;          // affiche le repas à l'échelle de sa portion
  adaptedIngredients?: { name: string; quantity_g: number; unit?: string }[]; // si fourni → affiché tel quel
  adaptedMacros?: Macros;     // si fourni → remplace recipe.macros_per_portion × portions
  adaptFlags?: AdaptFlag[];   // avertissements (sous/au-dessus cible)
  restrictionRelaxed?: boolean; // bandeau « régime non garanti »
  onClose: () => void;
  onCook?: () => void;        // si fourni, affiche « J'ai mangé / cuisiné »
  onSkip?: () => void;        // si fourni, affiche « Je l'ai sauté »
  onResetStatus?: () => void; // si fourni + statut posé, affiche « Annuler »
  status?: MealStatus;        // suivi d'adhésion (eaten/skipped) → état affiché
  onSwap?: () => void;        // si fourni, affiche « Remplacer ce repas »
  onEdit?: () => void;        // si fourni, affiche le bouton « personnaliser »
  custom?: boolean;           // recette déjà personnalisée → badge
  dragHandlers?: any;         // injecté par <Sheet> : rend l'en-tête glissable
}

export function RecipeDetail({ recipe, portions = 1, adaptedIngredients, adaptedMacros, adaptFlags, restrictionRelaxed, onClose, onCook, onSkip, onResetStatus, status, onSwap, onEdit, custom, dragHandlers }: Props) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(recipe.id);
  const f = portions;

  // Valeurs adaptées (scaling par ingrédient) si fournies, sinon recette × portions.
  const macros = adaptedMacros ?? {
    kcal: Math.round(recipe.macros_per_portion.kcal * f),
    protein_g: Math.round(recipe.macros_per_portion.protein_g * f),
    carbs_g: Math.round(recipe.macros_per_portion.carbs_g * f),
    fat_g: Math.round(recipe.macros_per_portion.fat_g * f),
  };
  const ings = adaptedIngredients ?? recipe.ingredients.map((i) => ({ name: i.name, quantity_g: i.quantity_g * f, unit: i.unit }));

  return (
    <View style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header} {...(dragHandlers ?? {})}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.name}>{recipe.name_fr}</Text>
            {custom && (
              <View style={s.badge}>
                <Ionicons name="create" size={11} color={t.textSecondary} />
                <Text style={s.badgeTxt}>Personnalisée</Text>
              </View>
            )}
          </View>
          <View style={s.headerBtns}>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} style={s.close}>
                <Ionicons name="create-outline" size={18} color={t.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => toggle(recipe.id)} style={s.close}>
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={18} color={fav ? t.text : t.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={s.close}>
              <Ionicons name="close" size={18} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.meta}>
          <Text style={s.metaTxt}>⏱ {recipe.prep_time_min} min</Text>
          <Text style={s.metaTxt}>🍽 {f === 1 ? '1 portion' : `${f} portions`}</Text>
        </View>

        {(recipe.objectives?.length || recipe.sports?.length) ? (
          <View style={s.tagRow}>
            {recipe.objectives?.map((o) => <Text key={o} style={s.tag}>{OBJ_LABEL[o]}</Text>)}
            {recipe.sports?.map((sp) => <Text key={sp} style={s.tag}>{SPORT_LABEL[sp]}</Text>)}
          </View>
        ) : null}

        {restrictionRelaxed && (
          <Text style={s.warn}>⚠️ Aucune recette adaptée à ton régime pour ce repas — option standard.</Text>
        )}
        {adaptFlags?.includes('under_target_kcal') && <Text style={s.warn}>ℹ️ Repas un peu en dessous de ta cible.</Text>}
        {adaptFlags?.includes('over_target_kcal') && <Text style={s.warn}>ℹ️ Repas un peu au-dessus de ta cible.</Text>}

        <View style={[s.macros, cardShadow(t)]}>
          <Big t={t} v={macros.kcal} l="kcal" />
          <Big t={t} v={macros.protein_g} l="Protéines" u="g" c={t.protein} />
          <Big t={t} v={macros.carbs_g} l="Glucides" u="g" c={t.carbs} />
          <Big t={t} v={macros.fat_g} l="Lipides" u="g" c={t.fat} />
        </View>
        <Text style={s.fiber}>🌾 ~{adaptedIngredients ? mealFiberFromIngredients(adaptedIngredients) : mealFiberG(recipe, f)} g de fibres (estimé)</Text>

        {recipe.why_fr && <Text style={s.why}>{recipe.why_fr}</Text>}

        <Text style={s.section}>INGRÉDIENTS</Text>
        {ings.map((ing, i) => (
          <View key={i} style={s.ing}>
            <Text style={s.ingName}>{ing.name}</Text>
            <Text style={s.ingQty}>{formatQuantity(ing.name, ing.quantity_g, ing.unit ?? 'g')}</Text>
          </View>
        ))}

        <Text style={s.section}>PRÉPARATION</Text>
        {recipe.steps.map((step, i) => (
          <View key={i} style={s.step}>
            <View style={s.stepN}><Text style={s.stepNTxt}>{i + 1}</Text></View>
            <Text style={s.stepTxt}>{step}</Text>
          </View>
        ))}

        {/* Repas déjà suivi (mangé / sauté) → état + annulation */}
        {status && status !== 'planned' && (onResetStatus || onCook || onSkip) && (
          <View style={[s.statusBanner, { borderColor: t.line }]}>
            <Text style={s.statusTxt}>
              {status === 'eaten' ? '✓ Marqué comme mangé' : '⊘ Repas sauté — journée recalée'}
            </Text>
            {onResetStatus && (
              <TouchableOpacity onPress={onResetStatus} hitSlop={8}>
                <Text style={s.statusUndo}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(!status || status === 'planned') && (onSwap || onCook || onSkip) && (
          <View style={{ marginTop: 24, gap: 10 }}>
            {onSwap && (
              <TouchableOpacity onPress={onSwap} activeOpacity={0.85} style={s.swapBtn}>
                <Ionicons name="swap-horizontal" size={18} color={t.text} />
                <Text style={s.swapTxt}>Remplacer ce repas</Text>
              </TouchableOpacity>
            )}
            {onSkip && (
              <TouchableOpacity onPress={onSkip} activeOpacity={0.85} style={s.swapBtn}>
                <Ionicons name="close-circle-outline" size={18} color={t.text} />
                <Text style={s.swapTxt}>Je l'ai sauté</Text>
              </TouchableOpacity>
            )}
            {onCook && <PrimaryButton t={t} label="J'ai mangé — retirer du frigo" onPress={onCook} />}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Big({ t, v, l, u = '', c }: { t: ThemePalette; v: number; l: string; u?: string; c?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: c ?? t.text }}>{v}{u}</Text>
      <Text style={{ fontSize: 11, color: t.textSecondary }}>{l}</Text>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xxl, gap: 18, paddingBottom: 48 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    name: { color: t.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: t.fill, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill },
    badgeTxt: { color: t.textSecondary, fontSize: 11, fontWeight: '600' },
    headerBtns: { flexDirection: 'row', gap: 8 },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    meta: { flexDirection: 'row', gap: 16 },
    metaTxt: { color: t.textSecondary, fontSize: 14 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8 },
    tag: { backgroundColor: t.fill, color: t.textSecondary, fontSize: 11, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill, overflow: 'hidden' },
    warn: { color: t.warning, fontSize: 13, marginTop: -8 },
    why: { color: t.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20, marginTop: -8 },
    macros: { flexDirection: 'row', backgroundColor: t.card, borderRadius: Radius.md, padding: 16, justifyContent: 'space-around' },
    fiber: { color: t.textTertiary, fontSize: 13, marginTop: -8 },
    section: { color: t.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    ing: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line },
    ingName: { color: t.text, fontSize: 15 },
    ingQty: { color: t.textSecondary, fontSize: 14 },
    step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    stepN: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    stepNTxt: { color: t.text, fontSize: 13, fontWeight: '700' },
    stepTxt: { flex: 1, color: t.textSecondary, fontSize: 15, lineHeight: 22 },
    swapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: Radius.md, borderWidth: 1.5, borderColor: t.lineStrong },
    swapTxt: { color: t.text, fontSize: 16, fontWeight: '700' },
    statusBanner: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: Radius.md, borderWidth: 1 },
    statusTxt: { flex: 1, color: t.textSecondary, fontSize: 14, fontWeight: '600' },
    statusUndo: { color: t.text, fontSize: 14, fontWeight: '700' },
  });
}
