import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, Type, cardShadow } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import { RecipeDetail } from '../../components/RecipeDetail';
import { RecipeEditor } from '../../components/RecipeEditor';
import { Sheet } from '../../components/Sheet';
import { useFavorites } from '../../hooks/useFavorites';
import { useRecipeOverrides } from '../../hooks/useRecipeOverrides';
import { getBaseRecipe } from '../../lib/recipes';
import { Recipe } from '../../lib/types';
import { OBJ_LABEL } from '../../lib/recipeLabels';

const TAGS = ['Tout', 'fav', 'breakfast', 'lunch', 'dinner', 'snack'];
const TAG_LABELS: Record<string, string> = {
  Tout: 'Tout', fav: 'Favoris', breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function RecettesScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const { isFavorite, toggle, favorites } = useFavorites();
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
      {/* Surtitre AU-DESSUS du grand titre : le chiffre pose le contexte, le mot
          reste la chose la plus grosse de l'écran. */}
      <View style={[s.header, layout.grid]}>
        <Text style={s.sub}>
          {recipes.length} recettes{favorites.length > 0 ? ` · ${favorites.length} en favori${favorites.length > 1 ? 's' : ''}` : ''}
        </Text>
        <Text style={s.h1}>Recettes</Text>
      </View>

      <View style={[s.searchWrap, layout.grid]}>
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

      <View style={[s.filtersWrap, layout.grid]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {TAGS.map((tg) => {
            const on = tag === tg;
            return (
              // Le filtre actif prend l'accent PLEIN, les autres restent neutres et
              // sans bordure. « Favoris » perd son cœur : le mot suffit, et l'icône
              // entrait en concurrence avec le cœur des cartes, qui lui agit.
              <TouchableOpacity key={tg} onPress={() => setTag(tg)} activeOpacity={0.8}
                style={[s.chip, { backgroundColor: on ? t.accent : t.fill }]}>
                <Text style={{ color: on ? t.onAccent : t.text, fontSize: 15, fontWeight: on ? '600' : '500' }}>{TAG_LABELS[tg]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Le compteur de résultats vit SOUS les filtres, comme un titre de section :
          c'est là qu'il change, donc là qu'on le regarde. */}
      <View style={[s.countRow, layout.grid]}>
        <Text style={s.countLabel}>
          {q ? 'RÉSULTATS' : tag === 'Tout' ? 'TOUTES LES RECETTES' : TAG_LABELS[tag].toUpperCase()}
        </Text>
        <Text style={s.countN}>{data.length} recette{data.length > 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(r) => r.id}
        // Deux colonnes sur tablette : à 1024 pt une carte de recette occupait
        // toute la largeur pour trois lignes de texte, et l'écran n'en montrait
        // que 8 là où la grille en montre 16. `key` force le remontage — FlatList
        // n'accepte pas un changement de `numColumns` à chaud (rotation iPad).
        key={`cols-${layout.columns}`}
        numColumns={layout.columns}
        columnWrapperStyle={layout.columns > 1 ? s.gridRow : undefined}
        contentContainerStyle={[s.list, layout.grid]}
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
            <TouchableOpacity style={[s.recipe, layout.columns > 1 && s.recipeGrid, cardShadow(t)]} onPress={() => setSelected(item)} activeOpacity={0.85}>
              <View style={s.rTop}>
                <Text style={s.rName}>{item.name_fr}</Text>
                <TouchableOpacity onPress={() => toggle(item.id)} hitSlop={10} style={s.heart}>
                  <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? t.text : t.textQuaternary} />
                </TouchableOpacity>
              </View>
              {/* Une seule ligne grise, durée comprise : dans une liste il n'y a
                  rien à comparer entre deux macros. C'est le nom du plat qu'on lit. */}
              <Text style={s.rMacros}>
                <Text style={s.rKcal}>{item.macros_per_portion.kcal}</Text>
                {` kcal · ${item.macros_per_portion.protein_g} P · ${item.macros_per_portion.carbs_g} G · ${item.macros_per_portion.fat_g} L · ${item.prep_time_min} min`}
              </Text>
              {/* DEUX étiquettes au maximum : à quatre, la carte devenait un nuage
                  de mots-clés et le plat disparaissait dessous.
                  `item.sports` n'est plus affiché depuis le 2026-08-03 : diversifieur
                  interne, pas une promesse (cf. lib/recipeLabels.ts). Les deux règles
                  vont dans le même sens — la carte ne porte que ce qu'elle tient. */}
              {item.objectives?.length ? (
                <View style={s.rTagRow}>
                  {item.objectives.slice(0, 2).map((o) => <Text key={o} style={s.rTag}>{OBJ_LABEL[o]}</Text>)}
                </View>
              ) : null}
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

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: Spacing.xl, paddingTop: 4, paddingBottom: 12 },
    h1: { color: t.text, ...Type.display, marginTop: 2 },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 19 },
    searchWrap: { paddingHorizontal: Spacing.xl, paddingBottom: 12 },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: t.fill, borderRadius: Radius.button,
      paddingHorizontal: 14, height: 44,
    },
    searchInput: { flex: 1, color: t.text, fontSize: 16, padding: 0 },
    filtersWrap: { marginBottom: 4 },
    filters: { paddingHorizontal: Spacing.xl, gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
    countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: Spacing.xl, paddingTop: 14, paddingBottom: 2 },
    countLabel: { color: t.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    countN: { color: t.textTertiary, fontSize: 13 },
    list: { padding: Spacing.xl, paddingTop: 10, gap: 10, paddingBottom: 120 },
    recipe: { backgroundColor: t.card, borderRadius: Radius.card, padding: 18, gap: 8 },
    // En grille, chaque carte prend sa part de la rangée et toutes s'alignent
    // en hauteur (`gridRow.alignItems: stretch`), sinon un titre sur deux lignes
    // décale sa voisine.
    recipeGrid: { flex: 1 },
    gridRow: { gap: 10, alignItems: 'stretch' },
    rTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    rName: { flex: 1, marginRight: 8, color: t.text, fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
    heart: { padding: 2 },
    rMacros: { color: t.textSecondary, fontSize: 14, lineHeight: 19 },
    rKcal: { color: t.text, fontWeight: '600' },
    rTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
    rTag: { backgroundColor: t.fill, color: t.textSecondary, fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, overflow: 'hidden' },
    empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
    emptyTxt: { color: t.textTertiary, fontSize: 14 },
  });
}
