import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Presse } from '../../components/Presse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, Type, cardShadow, Fond, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { RecipeDetail } from '../../components/RecipeDetail';
import { RecipeEditor } from '../../components/RecipeEditor';
import { Sheet } from '../../components/Sheet';
import { useFavorites } from '../../hooks/useFavorites';
import { useRecipeOverrides } from '../../hooks/useRecipeOverrides';
import { getBaseRecipe } from '../../lib/recipes';
import { Recipe } from '../../lib/types';
import { OBJ_LABEL } from '../../lib/recipeLabels';
import { useTourTarget, useScreenTour, TourButton } from '../../components/GuidedTour';
import { recettesTour } from '../../lib/tours';
import { revelation, libelleRevelation } from '../../lib/revelation';
import { BoutonRevelation } from '../../components/ui';

const TAGS = ['Tout', 'fav', 'breakfast', 'lunch', 'dinner', 'snack'];
const TAG_LABELS: Record<string, string> = {
  Tout: 'Tout', fav: 'Favoris', breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};

/** Le premier palier du catalogue, et le pas de chaque « Voir + ». */
const PAS_RECETTES = 10;

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function RecettesScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const repli = useCollapsingTitle();
  const { isFavorite, toggle, favorites } = useFavorites();
  const { recipes, saveOverride, resetOverride, isCustom } = useRecipeOverrides();
  const [tag, setTag] = useState('Tout');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);

  // Cibles de la visite guidée. ⚠️ Les refs des CARTES se créent ici et non dans
  // `renderItem` : celui-ci est une callback, pas un composant, donc y appeler un
  // hook violerait les règles de React. Elles ne sont posées que sur la première
  // ligne (`index === 0`), comme le fait déjà l'onglet Plan avec ses MealCard.
  const rechercheRef = useTourTarget('recettes-recherche');
  const carteRef = useTourTarget('recettes-carte');
  const favoriRef = useTourTarget('recettes-favori');

  const q = norm(query.trim());
  const tous = recipes.filter((r) => {
    if (q && !norm(r.name_fr).includes(q)) return false;
    if (tag === 'Tout') return true;
    if (tag === 'fav') return isFavorite(r.id);
    return r.tags.includes(tag);
  });

  // ── Révélation par paliers (décision fondateur, 2026-08-14) ───────────────
  //
  // « 10, puis voir +, puis 10, puis voir +, et après voir tout. » 512 cartes
  // servies d'un coup, ce n'est pas une liste : c'est un mur, et le filtre juste
  // au-dessus devient décoratif puisque personne ne descend jusqu'au bout.
  //
  // 🔴 LE COMPTEUR SE REMET À ZÉRO DÈS QUE LA LISTE CHANGE. Sans ça, chercher
  // « poulet » après avoir déplié trois paliers servirait tout le résultat d'un
  // coup — et surtout, le bouton du bas annoncerait un reste calculé sur l'ancien
  // filtre. Un chiffre affiché est celui qui sera servi (CLAUDE.md §10).
  const [paliers, setPaliers] = useState(0);
  const [tout, setTout] = useState(false);
  const cle = `${tag}·${q}·${recipes.length}`;
  const cleVue = useRef(cle);
  if (cleVue.current !== cle) { cleVue.current = cle; if (paliers !== 0) setPaliers(0); if (tout) setTout(false); }

  const vue = revelation(tous.length, PAS_RECETTES, paliers, tout);
  const data = tous.slice(0, vue.visibles);

  // Après `data` : le tour a besoin de savoir s'il y a une carte à montrer. Sur
  // une liste vide, ses deux dernières étapes seraient filtrées faute de cible et
  // le tour se réduirait à sa barre de recherche.
  const { rejouer: rejouerTour } = useScreenTour('recettes', recettesTour(), { pret: tous.length > 0 });

  // ⚠️ L'en-tête, la recherche, les filtres et le compteur vivent DANS la liste
  // (`ListHeaderComponent`) et non au-dessus : c'est ce qui permet au grand titre
  // de s'effacer au profit de la barre compacte, comme dans la maquette. C'est
  // aussi le comportement d'iOS (Mail, Notes) : la recherche suit le grand titre
  // et se récupère en tirant vers le bas.
  //
  // ⚠️ On passe un ÉLÉMENT, pas une fonction composant : une nouvelle fonction à
  // chaque rendu ferait REMONTER l'en-tête, et le champ de recherche perdrait le
  // focus à chaque frappe.
  const enTete = (
    <View onLayout={repli.onHeaderLayout}>
        {/* Surtitre AU-DESSUS du grand titre : le chiffre pose le contexte, le mot
            reste la chose la plus grosse de l'écran. */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.sub}>
              {recipes.length} recettes{favorites.length > 0 ? ` · ${favorites.length} en favori${favorites.length > 1 ? 's' : ''}` : ''}
            </Text>
            <Text style={s.h1}>Recettes</Text>
          </View>
          <TourButton onPress={rejouerTour} />
        </View>

        <View style={s.searchWrap}>
          <View ref={rechercheRef} style={s.searchBox}>
            <Ionicons name="search" size={Icone.petite} color={t.textTertiary} />
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
              <Presse onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={Icone.standard} color={t.textTertiary} />
              </Presse>
            )}
          </View>
        </View>

        <View style={s.filtersWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
            {TAGS.map((tg) => {
              const on = tag === tg;
              return (
                // Le filtre actif prend l'accent PLEIN, les autres restent neutres et
                // sans bordure. « Favoris » perd son cœur : le mot suffit, et l'icône
                // entrait en concurrence avec le cœur des cartes, qui lui agit.
                <Presse key={tg} onPress={() => setTag(tg)} activeOpacity={OPACITE_PRESSION}
                  style={[s.chip, { backgroundColor: on ? t.accent : t.fill }]}>
                  <Text style={{ ...(on ? Type.bodyStrong : Type.body), color: on ? t.onAccent : t.text }}>{TAG_LABELS[tg]}</Text>
                </Presse>
              );
            })}
          </ScrollView>
        </View>

        {/* Le compteur de résultats vit SOUS les filtres, comme un titre de section :
            c'est là qu'il change, donc là qu'on le regarde. */}
        <View style={s.countRow}>
          <Text style={s.countLabel}>
            {q ? 'RÉSULTATS' : tag === 'Tout' ? 'TOUTES LES RECETTES' : TAG_LABELS[tag].toUpperCase()}
          </Text>
          {/* ⚠️ LE TOTAL FILTRÉ, PAS CE QUI EST À L'ÉCRAN. Depuis la révélation par
              paliers, `data` n'est qu'une tranche : afficher sa longueur ferait dire
              « 10 recettes » à un filtre qui en trouve 512, et le chiffre changerait
              à chaque « Voir + » sans qu'aucun filtre n'ait bougé. */}
          <Text style={s.countN}>{tous.length} recette{tous.length > 1 ? 's' : ''}</Text>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
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
        ListHeaderComponent={enTete}
        // Le bouton vit dans le PIED de la liste : posé au-dessus, il serait un
        // réglage ; posé dessous, il est la suite de la lecture. Sur tablette la
        // grille a deux colonnes — un pied traverse toute la largeur, donc rien
        // à faire de particulier.
        ListFooterComponent={
          <BoutonRevelation
            t={t}
            libelle={libelleRevelation(vue.action, vue.reste)}
            onPress={() => (vue.action === 'tout' ? setTout(true) : setPaliers((n) => n + 1))}
          />
        }
        {...repli.scrollProps}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name={q ? 'search-outline' : 'heart-outline'} size={Icone.nav} color={t.textTertiary} />
            <Text style={s.emptyTxt}>
              {q
                ? `Aucune recette pour « ${query.trim()} ».`
                : "Aucune recette en favori pour l'instant."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const fav = isFavorite(item.id);
          const premier = index === 0;
          return (
            <Presse ref={premier ? carteRef : undefined} style={[s.recipe, layout.columns > 1 && s.recipeGrid, cardShadow(t)]} onPress={() => setSelected(item)} activeOpacity={OPACITE_PRESSION}>
              <View style={s.rTop}>
                <Text style={s.rName}>{item.name_fr}</Text>
                <Presse ref={premier ? favoriRef : undefined} onPress={() => toggle(item.id)} hitSlop={10} style={s.heart}>
                  <Ionicons name={fav ? 'heart' : 'heart-outline'} size={Icone.standard} color={fav ? t.text : t.textQuaternary} />
                </Presse>
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
            </Presse>
          );
        }}
      />

      {/* 🔴 UNE SEULE FEUILLE POUR LA FICHE ET SON ÉDITEUR — corrigé le 2026-08-14
          (« le bouton modifier les recettes ne fonctionne pas »). Ils vivaient dans
          DEUX `Sheet`, donc deux `Modal`. Taper le crayon ouvrait la seconde
          pendant que la première était encore présentée : sur iOS, présenter une
          modale par-dessus une modale en place ÉCHOUE SANS RIEN DIRE. Le code
          s'exécutait — `setEditing` passait bien — et l'écran ne bougeait pas.
          ⚠️ Fermer la fiche d'abord n'aurait pas suffi : `Sheet` garde son `Modal`
          MONTÉ le temps de l'animation de sortie (`render`), donc les deux se
          seraient encore chevauchées. Il fallait supprimer l'empilement, pas le
          décaler dans le temps.
          ➡️ L'éditeur REMPLACE la fiche dans la même feuille : « Annuler » revient
          à la fiche, la croix ferme tout. Aucune course, et c'est aussi la bonne
          lecture — on ne superpose pas deux panneaux sur le même objet.
          ⚠️ Ce défaut est de la famille déjà consignée en CLAUDE.md §8 (« une route
          poussée depuis une modale ouverte naît SOUS elle ») et §11 (l'ordre du DOM
          des modales web). Il ne se voit PAS dans le panneau navigateur : sur le
          web les deux modales coexistent et la seconde passe devant. */}
      <Sheet visible={!!selected} onClose={() => { setSelected(null); setEditing(null); }}>
        {editing ? (
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
        ) : selected ? (
          <RecipeDetail
            recipe={selected}
            custom={isCustom(selected.id)}
            onEdit={() => setEditing(selected)}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </Sheet>

      <CompactTitleBar t={t} title="Recettes" opacity={repli.opacity} />
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    // Plus de `paddingHorizontal` ici ni dans `searchWrap`/`countRow` : ces blocs
    // vivent dans le contentContainer de la liste, qui pose déjà les 20 pt.
    // `row` + `flex-end` : le « ? » se pose sur la ligne de base du grand titre,
    // comme sur les quatre autres onglets. Même patron que Courses.
    header: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: Spacing.xs, paddingBottom: Spacing.md },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 19 },
    searchWrap: { paddingBottom: Spacing.md },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: t.fill, borderRadius: Radius.button,
      paddingHorizontal: Spacing.lg, height: 44,
    },
    searchInput: { ...Type.input, flex: 1, color: t.text, padding: 0 },
    // La bande de filtres RESSORT du padding du conteneur (marge négative) pour
    // rester à fond perdu : elle défile horizontalement, elle doit toucher les bords.
    filtersWrap: { marginBottom: Spacing.xs, marginHorizontal: -Spacing.xl },
    filters: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.pill },
    countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
    countLabel: { ...Type.overline, color: t.textTertiary },
    countN: { ...Type.caption, color: t.textTertiary },
    list: { padding: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.md, paddingBottom: Fond.barreOnglets },
    recipe: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.xl, gap: Spacing.sm },
    // En grille, chaque carte prend sa part de la rangée et toutes s'alignent
    // en hauteur (`gridRow.alignItems: stretch`), sinon un titre sur deux lignes
    // décale sa voisine.
    recipeGrid: { flex: 1 },
    gridRow: { gap: Spacing.md, alignItems: 'stretch' },
    rTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    rName: { ...Type.h3, flex: 1, marginRight: Spacing.sm, color: t.text, letterSpacing: -0.3 },
    heart: { padding: Spacing.xs },
    rMacros: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 19 },
    rKcal: { color: t.text, fontWeight: '700' },
    rTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
    rTag: { ...Type.caption, backgroundColor: t.fill, color: t.textSecondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill, overflow: 'hidden' },
    empty: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xxxl },
    emptyTxt: { ...Type.bodySmall, color: t.textTertiary },
  });
}
