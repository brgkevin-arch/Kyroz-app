import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Radius, cardShadow, ThemePalette } from '../constants/theme';
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
  meal, onPress, onCook, onReload, onDislike, onShopping, missing, fridgeTracked, tourId, cookTourId,
}: {
  meal: Meal;
  onPress?: () => void;
  onCook?: () => void;
  onReload?: () => void;     // 🔄 changer cette recette (sans ouvrir la fiche)
  onDislike?: () => void;    // 👎 je n'aime pas → masque + change
  onShopping?: () => void;   // → liste de courses (raccourci depuis « il te manque »)
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
      activeOpacity={0.85}
      style={[{ backgroundColor: t.card, borderRadius: Radius.card, padding: 18, opacity: muted ? 0.6 : 1 }, cardShadow(t)]}
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
          <Text style={{ color: t.text, fontWeight: '600' }}>{meal.macros.kcal}</Text>
          {` kcal · ${meal.macros.protein_g} P · ${meal.macros.carbs_g} G · ${meal.macros.fat_g} L`}
        </Text>
      )}

      {/* Synchro frigo (uniquement si l'user suit son garde-manger) — informatif,
          jamais bloquant : « J'ai cuisiné » reste toujours cliquable.
          ⚠️ Le raccourci dit « Mes courses », PAS « Ajouter » — et ce n'est pas une
          nuance de vocabulaire. La liste de courses n'est pas une liste où l'on
          ajoute : `buildShoppingList` prend les repas du plan et SOUSTRAIT le frigo,
          en excluant les condiments et les repas que l'user gère lui-même. Or
          `recipeCoverage`, qui produit ce « il te manque », applique EXACTEMENT les
          deux mêmes exclusions. Ce qui s'affiche ici est donc déjà dans la liste, par
          construction : un bouton « Ajouter » n'ajouterait rien et confirmerait un
          geste qui n'a pas eu lieu. */}
      {planned && fridgeTracked && (
        lacks ? (
          <View style={styles.fridgeRow}>
            <Text style={[styles.fridge, { color: t.textSecondary, flex: 1 }]} numberOfLines={1}>
              Il te manque : {missing!.join(', ')}
            </Text>
            {onShopping && (
              <TouchableOpacity
                onPress={onShopping}
                hitSlop={10}
                accessibilityRole="link"
                accessibilityLabel="Voir ces ingrédients dans ma liste de courses"
              >
                <Text style={[styles.fridgeLink, { color: t.accent }]}>Mes courses ›</Text>
              </TouchableOpacity>
            )}
          </View>
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityLabel={label} style={[styles.iconBtn, { backgroundColor: t.fill }]}>
      <Ionicons name={name} size={18} color={active ? t.text : t.textSecondary} />
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

const styles = StyleSheet.create({
  type: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  name: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3, marginTop: 7 },
  macros: { fontSize: 14, lineHeight: 19, marginTop: 6 },
  fridge: { fontSize: 13, marginTop: 10 },
  fridgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fridgeLink: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  fixedNote: { fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  cookBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, paddingHorizontal: 12, borderRadius: Radius.button },
  cookTxt: { fontSize: 15, fontWeight: '600' },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
});
