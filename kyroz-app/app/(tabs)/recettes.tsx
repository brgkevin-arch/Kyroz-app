import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../../constants/theme';
import { RecipeDetail } from '../../components/RecipeDetail';
import { RecipeEditor } from '../../components/RecipeEditor';
import { Sheet } from '../../components/Sheet';
import { useFavorites } from '../../hooks/useFavorites';
import { useRecipeOverrides } from '../../hooks/useRecipeOverrides';
import { getBaseRecipe } from '../../lib/recipes';
import { Recipe } from '../../lib/types';

const TAGS = ['Tout', 'fav', 'breakfast', 'lunch', 'dinner', 'snack'];
const TAG_LABELS: Record<string, string> = {
  Tout: 'Tout', fav: 'Favoris', breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function RecettesScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { isFavorite, toggle } = useFavorites();
  const { recipes, saveOverride, resetOverride, isCustom } = useRecipeOverrides();
  const [tag, setTag] = useState('Tout');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);

  const q = norm(query.trim());
  const data = recipes.filter((r) => {
    if (q && !norm(r.name_fr).includes(q)) return false;
    if (tag === 'Tout') return true;
    if (tag === 'fav') return isFavorite(r.id);
    return r.tags.includes(tag);
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.h1}>Recettes</Text>
        <Text style={s.sub}>
          {q || tag !== 'Tout'
            ? `${data.length} résultat${data.length > 1 ? 's' : ''}`
            : `${recipes.length} recettes rapides`}
        </Text>
      </View>

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={17} color={t.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une recette"
            placeholderTextColor={t.textQuaternary}
            autoCorrect={false}
            returnKeyType="search"
            style={s.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={t.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {TAGS.map((tg) => {
            const on = tag === tg;
            return (
              <TouchableOpacity key={tg} onPress={() => setTag(tg)} activeOpacity={0.8}
                style={[s.chip, { backgroundColor: on ? t.accent : t.fill, borderColor: on ? t.accent : t.line }]}>
                {tg === 'fav' && <Ionicons name="heart" size={12} color={on ? t.onAccent : t.textSecondary} style={{ marginRight: 5 }} />}
                <Text style={{ color: on ? t.onAccent : t.textSecondary, fontSize: 14, fontWeight: '600' }}>{TAG_LABELS[tg]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name={q ? 'search-outline' : 'heart-outline'} size={28} color={t.textTertiary} />
            <Text style={s.emptyTxt}>
              {q
                ? `Aucune recette pour « ${query.trim()} ».`
                : "Aucune recette en favori pour l'instant."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const fav = isFavorite(item.id);
          return (
            <TouchableOpacity style={[s.recipe, cardShadow(t)]} onPress={() => setSelected(item)} activeOpacity={0.85}>
              <View style={s.rTop}>
                <Text style={s.rName}>{item.name_fr}</Text>
                <View style={s.rTopRight}>
                  <Text style={s.rTime}>{item.prep_time_min} min</Text>
                  <TouchableOpacity onPress={() => toggle(item.id)} hitSlop={10} style={s.heart}>
                    <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? t.text : t.textQuaternary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.rMacros}>
                <M v={item.macros_per_portion.kcal} u="kcal" c={t.textSecondary} cu={t.textQuaternary} />
                <M v={item.macros_per_portion.protein_g} u="P" c={t.protein} cu={t.textQuaternary} />
                <M v={item.macros_per_portion.carbs_g} u="G" c={t.carbs} cu={t.textQuaternary} />
                <M v={item.macros_per_portion.fat_g} u="L" c={t.fat} cu={t.textQuaternary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Sheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <RecipeDetail
            recipe={selected}
            custom={isCustom(selected.id)}
            onEdit={() => setEditing(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </Sheet>

      <Sheet visible={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <RecipeEditor
            t={t}
            recipe={editing}
            isCustom={isCustom(editing.id)}
            onSave={(r) => { saveOverride(r); setSelected(r); setEditing(null); }}
            onReset={() => {
              resetOverride(editing.id);
              setSelected(getBaseRecipe(editing.id) ?? editing);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function M({ v, u, c, cu }: { v: number; u: string; c: string; cu: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'baseline' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: c }}>{v}</Text>
      <Text style={{ fontSize: 11, color: cu }}>{u}</Text>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: Spacing.xl, paddingTop: 4, paddingBottom: 12 },
    h1: { color: t.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
    sub: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
    searchWrap: { paddingHorizontal: Spacing.xl, paddingBottom: 10 },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.fill, borderRadius: Radius.pill,
      borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, height: 42,
    },
    searchInput: { flex: 1, color: t.text, fontSize: 15, fontWeight: '500', padding: 0 },
    filtersWrap: { marginBottom: 4 },
    filters: { paddingHorizontal: Spacing.xl, gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1 },
    list: { padding: Spacing.xl, paddingTop: 12, gap: 10, paddingBottom: 120 },
    recipe: { backgroundColor: t.card, borderRadius: Radius.lg, padding: 18, gap: 12 },
    rTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    rName: { flex: 1, marginRight: 8, color: t.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    rTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rTime: { color: t.textQuaternary, fontSize: 12 },
    heart: { padding: 2 },
    rMacros: { flexDirection: 'row', gap: 14 },
    empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
    emptyTxt: { color: t.textTertiary, fontSize: 14 },
  });
}
