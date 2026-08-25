import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useProfile } from '../../hooks/useProfile';
import { useFocusEffect } from 'expo-router';
import { getBaseRecipe } from '../../lib/recipes';
import { formatQuantity } from '../../lib/units';
import { pushPantry } from '../../lib/sync';
import {
  PantryItem, Coverage, loadPantry, savePantry, cookableRecipes, deductRecipe,
} from '../../lib/pantry';
import { Recipe } from '../../lib/types';
import { OBJ_LABEL } from '../../lib/recipeLabels';
import { useTourTarget, useScreenTour, TourButton } from '../../components/GuidedTour';
import { recettesTour } from '../../lib/tours';
import { revelation, libelleRevelation } from '../../lib/revelation';
import { BoutonRevelation } from '../../components/ui';
import { animerMiseEnPage } from '../../components/Mouvement';

// ── « MA RÉSERVE » A REJOINT LES FILTRES (2026-08-24, décision fondateur) ────
//
// « Qu'est-ce que je peux cuisiner avec ce que j'ai » vivait dans un second onglet
// de l'écran Frigo. C'est une question de RECETTES, pas d'inventaire : elle se pose
// ici, à côté de « Favoris » et « Dîner », et elle rend l'écran Réserve à son seul
// métier — dire ce qu'on a.
const TAGS = ['Tout', 'reserve', 'fav', 'breakfast', 'lunch', 'dinner', 'snack'];
const TAG_LABELS: Record<string, string> = {
  Tout: 'Tout', reserve: 'Ma réserve', fav: 'Favoris', breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};

/** Au-delà de deux ingrédients manquants, ce n'est plus « presque ». */
const MANQUES_PRESQUE = 2;

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
  const { profile } = useProfile();
  const [reserve, setReserve] = useState<PantryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // La réserve se relit à chaque venue sur l'onglet : elle change ailleurs (courses
  // terminées, repas coché), et un filtre qui répond sur un stock périmé annonce des
  // plats qu'on ne peut plus faire.
  useFocusEffect(useCallback(() => { loadPantry().then(setReserve); }, []));

  // ⚠️ Calculée SEULEMENT sous le filtre : c'est un balayage des 512 recettes, il n'a
  // rien à faire dans le rendu de « Tout ».
  // ⚠️ `profile` est passé à `cookableRecipes` — il écarte le régime et les aliments
  // évités, avec le prédicat du moteur de plan. Sans lui, cet écran proposait du poulet
  // à un végétarien pendant que le plan tenait sa promesse.
  const couverture = useMemo(
    () => (tag === 'reserve' ? cookableRecipes(reserve, profile) : null),
    [tag, reserve, profile],
  );
  const pretes = useMemo(() => couverture?.filter((c) => c.missing.length === 0) ?? [], [couverture]);
  const presque = useMemo(
    () => couverture?.filter((c) => c.missing.length >= 1 && c.missing.length <= MANQUES_PRESQUE) ?? [],
    [couverture],
  );
  // Réalisables d'abord, presque ensuite — l'ordre EST l'information.
  const parReserve = useMemo(() => [...pretes, ...presque], [pretes, presque]);
  const couvertureParId = useMemo(
    () => new Map(parReserve.map((c) => [c.recipe.id, c] as const)),
    [parReserve],
  );

  // Cibles de la visite guidée. ⚠️ Les refs des CARTES se créent ici et non dans
  // `renderItem` : celui-ci est une callback, pas un composant, donc y appeler un
  // hook violerait les règles de React. Elles ne sont posées que sur la première
  // ligne (`index === 0`), comme le fait déjà l'onglet Plan avec ses MealCard.
  const rechercheRef = useTourTarget('recettes-recherche');
  const carteRef = useTourTarget('recettes-carte');
  const favoriRef = useTourTarget('recettes-favori');

  const q = norm(query.trim());
  const tous = (tag === 'reserve' ? parReserve.map((c) => c.recipe) : recipes).filter((r) => {
    if (q && !norm(r.name_fr).includes(q)) return false;
    if (tag === 'Tout' || tag === 'reserve') return true;
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
  const cle = `${tag}·${q}·${recipes.length}·${parReserve.length}`;
  const cleVue = useRef(cle);
  if (cleVue.current !== cle) { cleVue.current = cle; if (paliers !== 0) setPaliers(0); if (tout) setTout(false); }

  const vue = revelation(tous.length, PAS_RECETTES, paliers, tout);

  // Dix cartes de plus surgissaient sous le doigt, et le bouton qu'on venait de
  // toucher sautait d'un écran vers le bas. Elles se fondent, il descend avec.
  const reveler = () => {
    animerMiseEnPage();
    if (vue.action === 'tout') setTout(true); else setPaliers((n) => n + 1);
  };
  const data = tous.slice(0, vue.visibles);

  // Après `data` : le tour a besoin de savoir s'il y a une carte à montrer. Sur
  // une liste vide, ses deux dernières étapes seraient filtrées faute de cible et
  // le tour se réduirait à sa barre de recherche.
  const { rejouer: rejouerTour } = useScreenTour('recettes', recettesTour(), { pret: tous.length > 0 });

  // « J'ai mangé » depuis une fiche ouverte sous le filtre « Ma réserve » : c'est le
  // geste qui vivait sur les cartes du Frigo, déplacé avec la liste.
  //
  // ⚠️ Il n'est proposé QUE sur une recette réalisable. Déduire une recette dont on n'a
  // pas les ingrédients retirerait un stock au hasard — et l'utilisateur n'aurait aucun
  // moyen de le remettre. La déduction est irréversible, donc elle ne se propose que là
  // où elle est vraie.
  //
  // ⚠️ Le retour passe par un bandeau et non par un dialogue : une modale demandée
  // depuis une feuille ouverte ne s'affiche pas sur iOS (CLAUDE.md §11).
  const cuisiner = async (recipe: Recipe) => {
    const next = deductRecipe(reserve, recipe, 1);
    setReserve(next);
    await savePantry(next);
    pushPantry(next);
    setSelected(null);
    setToast(`${recipe.name_fr} — ingrédients retirés de ta réserve`);
    setTimeout(() => setToast(null), 2400);
  };

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
          {/* Sous « Ma réserve », un total ne dit rien : ce qui compte est la coupure
              entre ce qui est faisable MAINTENANT et ce qui demande une course. */}
          <Text style={s.countN}>
            {tag === 'reserve'
              ? `${pretes.length} réalisable${pretes.length > 1 ? 's' : ''} · ${presque.length} presque`
              : `${tous.length} recette${tous.length > 1 ? 's' : ''}`}
          </Text>
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
            onPress={reveler}
          />
        }
        {...repli.scrollProps}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name={q ? 'search-outline' : tag === 'reserve' ? 'file-tray-outline' : 'heart-outline'} size={Icone.nav} color={t.textTertiary} />
            <Text style={s.emptyTxt}>
              {q
                ? `Aucune recette pour « ${query.trim()} ».`
                : tag === 'reserve'
                ? reserve.length === 0
                  ? "Ta réserve est vide. Remplis-la depuis l'onglet Réserve, ou termine une sortie de courses."
                  : "Rien de réalisable avec ce que tu as pour l'instant, même à un ou deux ingrédients près."
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
              {/* Sous « Ma réserve », la carte DIT où elle en est. Sans cette ligne,
                  réalisables et presque-réalisables se ressemblent trait pour trait et
                  l'ordre de la liste devient la seule différence — invisible dès qu'on
                  fait défiler. La quantité annoncée est le MANQUE, pas le besoin. */}
              {tag === 'reserve' && (() => {
                const c = couvertureParId.get(item.id);
                if (!c) return null;
                return c.missing.length === 0 ? (
                  <Text style={s.rPrete} numberOfLines={1}>Tu as tout ce qu'il faut</Text>
                ) : (
                  <Text style={s.rManque} numberOfLines={1}>
                    Il te manque : {c.missing.map((m) => `${m.name} (${formatQuantity(m.name, m.quantity_g, m.unit)})`).join(', ')}
                  </Text>
                );
              })()}
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
            onCook={pretes.some((c) => c.recipe.id === selected.id) ? () => cuisiner(selected) : undefined}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </Sheet>

      {/* Le seul retour du « J'ai mangé » : la fiche se ferme, et sans un mot rien
          ne dit que la réserve a bougé. 🔴 `Fond.barreOnglets` et non une valeur en
          dur — la barre d'onglets FLOTTE au-dessus du contenu (§8), un bandeau posé
          plus bas serait dessiné derrière elle. */}
      {toast && (
        <View style={[s.toast, { pointerEvents: 'none' }]}>
          <Text style={s.toastTxt}>{toast}</Text>
        </View>
      )}

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
    rPrete: { ...Type.caption, color: t.textSecondary, marginTop: Spacing.xs },
    rManque: { ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs },
    toast: { position: 'absolute', left: 20, right: 20, bottom: Fond.barreOnglets, backgroundColor: t.accent, borderRadius: Radius.button, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, alignItems: 'center' },
    toastTxt: { ...Type.bodySmallStrong, color: t.onAccent },
    rTag: { ...Type.caption, backgroundColor: t.fill, color: t.textSecondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill, overflow: 'hidden' },
    empty: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xxxl },
    emptyTxt: { ...Type.bodySmall, color: t.textTertiary },
  });
}
