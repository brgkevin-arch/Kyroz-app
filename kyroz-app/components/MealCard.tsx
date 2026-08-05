import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Radius, cardShadow, ThemePalette, Type, Spacing, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
import { Meal } from '../lib/types';
import { useTourTarget } from './GuidedTour';
import { useFavorites } from '../hooks/useFavorites';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export function MealCard({
  meal, onPress, onCook, onReload, onDislike, missing, fridgeTracked, tourId, cookTourId,
}: {
  meal: Meal;
  onPress?: () => void;
  onCook?: () => void;
  onReload?: () => void;     // 🔄 changer cette recette (sans ouvrir la fiche)
  onDislike?: () => void;    // 👎 je n'aime pas → masque + change
  missing?: string[];        // ingrédients absents du frigo (undefined si frigo non suivi)
  fridgeTracked?: boolean;   // le frigo contient au moins 1 article
  tourId?: string;           // si fourni : rend la carte ciblable par la visite guidée
  cookTourId?: string;       // si fourni : rend le bouton « J'ai cuisiné » ciblable par la visite guidée
}) {
  const t = useTheme();
  const rootRef = useTourTarget(tourId);
  const cookRef = useTourTarget(cookTourId);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(meal.recipe.id);
  const isFixed = meal.fixed === true;
  const eaten = meal.status === 'eaten';
  const skipped = meal.status === 'skipped';
  const muted = eaten || skipped;
  const planned = !eaten && !skipped && !isFixed; // un repas fixe n'est ni cuisiné ni recalé par Kyroz
  const lacks = (missing?.length ?? 0) > 0;
  return (
    <TouchableOpacity
      ref={rootRef}
      onPress={onPress}
      activeOpacity={OPACITE_PRESSION}
      style={[{ backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.xl, opacity: muted ? 0.6 : 1 }, cardShadow(t)]}
    >
      {/* Un seul surtitre « TYPE · DURÉE » au lieu de deux coins opposés : le nom
          du plat devient la première chose qu'on lit. Les états (mangé / sauté /
          tu gères) prennent la place de la durée — ils comptent plus qu'elle. */}
      <Text style={[styles.type, { color: t.textTertiary }]}>
        {MEAL_LABELS[meal.meal_type]?.toUpperCase()}
        {isFixed ? ' · 🔒 TU GÈRES'
          : eaten ? ' · ✓ MANGÉ'
          : skipped ? ' · ⊘ SAUTÉ'
          : ` · ${meal.recipe.prep_time_min} MIN`}
      </Text>
      <Text style={[styles.name, { color: t.text, textDecorationLine: skipped ? 'line-through' : 'none' }]}>
        {meal.recipe.name_fr}
      </Text>
      {isFixed && (
        <Text style={[styles.fixedNote, { color: t.textTertiary }]}>Tu gères ce repas — compté dans ton total</Text>
      )}
      {/* Macros : une ligne grise, plus quatre pastilles colorées. Ici il n'y a
          aucune proportion à comparer — c'est le nom du plat qu'on lit. */}
      {!skipped && (
        <Text style={[styles.macros, { color: t.textSecondary }]}>
          <Text style={{ color: t.text, fontWeight: '700' }}>{meal.macros.kcal}</Text>
          {` kcal · ${meal.macros.protein_g} P · ${meal.macros.carbs_g} G · ${meal.macros.fat_g} L`}
        </Text>
      )}

      {/* Synchro frigo (uniquement si l'user suit son garde-manger) — informatif,
          jamais bloquant : « J'ai cuisiné » reste toujours cliquable. */}
      {planned && fridgeTracked && (
        lacks ? (
          <Text style={[styles.fridge, { color: t.textSecondary }]} numberOfLines={1}>
            Il te manque : {missing!.join(', ')}
          </Text>
        ) : (
          <Text style={[styles.fridge, { color: t.textTertiary }]}>Tout est dans ton frigo</Text>
        )
      )}

      {/* Actions rapides directement sur le plan (sans ouvrir la fiche) :
          « J'ai cuisiné » compact + favori (👍) / j'aime pas (👎) / changer (🔄).
          Bouton cuisiné en contour quand il manque des ingrédients. */}
      {planned && (onCook || onReload || onDislike) && (
        <View style={styles.actions}>
          {onCook && <CookButton t={t} onCook={onCook} lacks={lacks} cookRef={cookRef} />}
          <ActionIcon t={t} name={fav ? 'heart' : 'heart-outline'} active={fav} onPress={() => toggle(meal.recipe.id)} label="J'aime cette recette" />
          {onDislike && <ActionIcon t={t} name="thumbs-down-outline" onPress={onDislike} label="Je n'aime pas — changer" />}
          {onReload && <ActionIcon t={t} name="refresh" onPress={onReload} label="Changer de recette" />}
        </View>
      )}
    </TouchableOpacity>
  );
}

// Bouton-icône d'action (favori / j'aime pas / changer), aligné sur le bouton cuisiné.
function ActionIcon({ t, name, active, onPress, label }: { t: ThemePalette; name: keyof typeof Ionicons.glyphMap; active?: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={OPACITE_PRESSION} accessibilityLabel={label} style={[styles.iconBtn, { backgroundColor: t.fill }]}>
      <Ionicons name={name} size={Icone.standard} color={active ? t.text : t.textSecondary} />
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
      activeOpacity={OPACITE_PRESSION}
      style={[
        styles.cookBtn,
        lacks
          ? { borderWidth: Trait.controle, borderColor: t.lineStrong }
          : { backgroundColor: t.accent },
      ]}
    >
      <Ionicons name="restaurant" size={Icone.petite} color={lacks ? t.text : t.onAccent} />
      <Text style={[styles.cookTxt, { color: lacks ? t.text : t.onAccent }]}>J'ai cuisiné</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  type: { ...Type.overline },
  name: { ...Type.h3, letterSpacing: -0.3, marginTop: Spacing.sm },
  macros: { ...Type.bodySmall, lineHeight: 19, marginTop: Spacing.sm },
  fridge: { ...Type.caption, marginTop: Spacing.md },
  fixedNote: { ...Type.caption, marginTop: Spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  cookBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 44, paddingHorizontal: Spacing.md, borderRadius: Radius.button },
  cookTxt: { ...Type.bodyStrong },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
});
