import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Radius, cardShadow, ThemePalette } from '../constants/theme';
import { Meal } from '../lib/types';
import { useTourTarget } from './GuidedTour';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export function MealCard({
  meal, onPress, onCook, missing, fridgeTracked, tourId, cookTourId,
}: {
  meal: Meal;
  onPress?: () => void;
  onCook?: () => void;
  missing?: string[];        // ingrédients absents du frigo (undefined si frigo non suivi)
  fridgeTracked?: boolean;   // le frigo contient au moins 1 article
  tourId?: string;           // si fourni : rend la carte ciblable par la visite guidée
  cookTourId?: string;       // si fourni : rend le bouton « J'ai cuisiné » ciblable par la visite guidée
}) {
  const t = useTheme();
  const rootRef = useTourTarget(tourId);
  const cookRef = useTourTarget(cookTourId);
  const eaten = meal.status === 'eaten';
  const skipped = meal.status === 'skipped';
  const muted = eaten || skipped;
  const planned = !eaten && !skipped;
  const lacks = (missing?.length ?? 0) > 0;
  return (
    <TouchableOpacity
      ref={rootRef}
      onPress={onPress}
      activeOpacity={0.85}
      style={[{ backgroundColor: t.card, borderRadius: Radius.lg, padding: 18, opacity: muted ? 0.6 : 1 }, cardShadow(t)]}
    >
      <View style={styles.top}>
        <Text style={[styles.type, { color: t.textTertiary }]}>{MEAL_LABELS[meal.meal_type]?.toUpperCase()}</Text>
        {eaten ? (
          <Text style={[styles.tag, { color: t.success }]}>✓ Mangé</Text>
        ) : skipped ? (
          <Text style={[styles.tag, { color: t.textTertiary }]}>⊘ Sauté</Text>
        ) : (
          <Text style={[styles.time, { color: t.textQuaternary }]}>{meal.recipe.prep_time_min} min</Text>
        )}
      </View>
      <Text style={[styles.name, { color: t.text, textDecorationLine: skipped ? 'line-through' : 'none' }]}>
        {meal.recipe.name_fr}
      </Text>
      {!skipped && (
        <View style={styles.macros}>
          <Pill v={meal.macros.kcal} u="kcal" c={t.textSecondary} cu={t.textQuaternary} />
          <Pill v={meal.macros.protein_g} u="P" c={t.protein} cu={t.textQuaternary} />
          <Pill v={meal.macros.carbs_g} u="G" c={t.carbs} cu={t.textQuaternary} />
          <Pill v={meal.macros.fat_g} u="L" c={t.fat} cu={t.textQuaternary} />
        </View>
      )}

      {/* Synchro frigo (uniquement si l'user suit son garde-manger) — informatif,
          jamais bloquant : « J'ai cuisiné » reste toujours cliquable. */}
      {planned && fridgeTracked && (
        lacks ? (
          <Text style={[styles.fridge, { color: t.warning }]} numberOfLines={1}>
            🛒 Il te manque : {missing!.join(', ')}
          </Text>
        ) : (
          <Text style={[styles.fridge, { color: t.success }]}>✓ Tout est dans ton frigo</Text>
        )
      )}

      {/* Action rapide directement sur le plan (sans ouvrir la fiche). Style
          secondaire (contour) quand il manque des ingrédients. */}
      {planned && onCook && (
        <CookButton t={t} onCook={onCook} lacks={lacks} cookRef={cookRef} />
      )}
    </TouchableOpacity>
  );
}

// Bouton « J'ai cuisiné ». La ref (cookRef) est posée directement dessus pour
// que la visite guidée épouse exactement le bouton (sur la 1re carte du jour).
function CookButton({ t, onCook, lacks, cookRef }: { t: ThemePalette; onCook: () => void; lacks: boolean; cookRef?: React.Ref<any> }) {
  return (
    <TouchableOpacity
      ref={cookRef}
      onPress={onCook}
      activeOpacity={0.85}
      style={[
        styles.cookBtn,
        lacks
          ? { borderWidth: 1.5, borderColor: t.lineStrong }
          : { backgroundColor: t.accent },
      ]}
    >
      <Ionicons name="restaurant" size={15} color={lacks ? t.text : t.onAccent} />
      <Text style={[styles.cookTxt, { color: lacks ? t.text : t.onAccent }]}>J'ai cuisiné</Text>
    </TouchableOpacity>
  );
}

function Pill({ v, u, c, cu }: { v: number; u: string; c: string; cu: string }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillV, { color: c }]}>{v}</Text>
      <Text style={[styles.pillU, { color: cu }]}>{u}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  time: { fontSize: 12 },
  tag: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginTop: 7 },
  macros: { flexDirection: 'row', gap: 14, marginTop: 12 },
  pill: { flexDirection: 'row', gap: 3, alignItems: 'baseline' },
  pillV: { fontSize: 14, fontWeight: '700' },
  pillU: { fontSize: 11 },
  fridge: { fontSize: 12, fontWeight: '600', marginTop: 12 },
  cookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 11, borderRadius: Radius.md },
  cookTxt: { fontSize: 14, fontWeight: '700' },
});
