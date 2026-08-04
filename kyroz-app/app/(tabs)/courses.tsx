import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePalette, Radius, Spacing, Type } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { MealPlan, ShoppingItem, ShoppingList } from '../../lib/types';
import { buildShoppingList } from '../../lib/shoppingList';
import { formatQuantity } from '../../lib/units';
import { loadPantry, savePantry, addOrMerge, subtractQuantity, isStaple } from '../../lib/pantry';
import { pushPantry } from '../../lib/sync';

const PLAN_KEY = '@kyroz:plan';
const LIST_KEY = '@kyroz:shopping';

const CATEGORY_LABELS: Record<ShoppingItem['category'], string> = {
  viandes: 'Viandes & poissons',
  légumes: 'Légumes & fruits',
  féculents: 'Féculents & céréales',
  laitiers: 'Produits laitiers & œufs',
  autres: 'Autres',
};
// Les icônes de rayon ont disparu des en-têtes de section : à 14 px devant un
// libellé en capitales, elles n'aidaient personne à trouver « Viandes & poissons ».
const CATEGORY_ORDER: ShoppingItem['category'][] = ['viandes', 'légumes', 'féculents', 'laitiers', 'autres'];

type CoursesSection = {
  cat: ShoppingItem['category'];
  title: string;
  left: number;
  data: ShoppingItem[];
};

export default function CoursesScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const repli = useCollapsingTitle();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const saved = await AsyncStorage.getItem(LIST_KEY);
    if (saved) { setList(JSON.parse(saved)); return; }
    const planRaw = await AsyncStorage.getItem(PLAN_KEY);
    if (planRaw) {
      const plan: MealPlan = JSON.parse(planRaw);
      const pantry = await loadPantry();           // ne proposer que ce qui manque
      const l = buildShoppingList(plan, pantry);
      // Ne pas mettre en cache une liste vide (tout couvert) : sinon l'onglet
      // resterait bloqué sur « rien à acheter » même après avoir vidé le frigo.
      // Sans cache, load() la reconstruit à chaque focus et les articles
      // réapparaissent dès que le garde-manger se dépeuple.
      if (l.items.length > 0) await AsyncStorage.setItem(LIST_KEY, JSON.stringify(l));
      setList(l);
    } else {
      setList(null);
    }
  };

  const persist = async (l: ShoppingList) => { setList(l); await AsyncStorage.setItem(LIST_KEY, JSON.stringify(l)); };

  // Cocher un article = « je l'ai acheté » → il part DIRECTEMENT au frigo.
  // Décocher = retour en arrière → on retire SEULEMENT la quantité que le cochage
  // avait ajoutée (et on ne supprime l'entrée que si elle retombe à 0), pour ne
  // pas effacer le stock déjà saisi à la main. (Plus d'étape d'import.)
  const toggle = async (item: ShoppingItem) => {
    if (!list) return;
    const willCheck = !item.checked;
    await persist({ ...list, items: list.items.map((i) => (i.name === item.name ? { ...i, checked: willCheck } : i)) });
    if (isStaple(item.name)) return; // sel, huile, épices… : pas dans le frigo
    const pantry = await loadPantry();
    const next = willCheck
      ? addOrMerge(pantry, { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category })
      : subtractQuantity(pantry, item.name, item.unit, item.quantity);
    await savePantry(next);
    pushPantry(next);
  };

  // Tout cocher = tout est acheté → tous les articles (non-condiments) filent au
  // frigo d'un coup, puis on coche toute la liste.
  const checkAll = async () => {
    if (!list) return;
    const toAdd = list.items.filter((i) => !i.checked && !isStaple(i.name));
    if (toAdd.length) {
      let pantry = await loadPantry();
      for (const it of toAdd) {
        pantry = addOrMerge(pantry, { name: it.name, quantity: it.quantity, unit: it.unit, category: it.category });
      }
      await savePantry(pantry);
      pushPantry(pantry);
    }
    await persist({ ...list, items: list.items.map((i) => ({ ...i, checked: true })) });
  };

  // Tout décocher = annuler les achats → on RETIRE du frigo les quantités des
  // articles cochés (symétrie avec checkAll/toggle ; subtractQuantity borne à 0 et
  // ne touche que ce que le cochage avait ajouté → aucune perte de stock saisi à la
  // main), puis on décoche toute la liste.
  const reset = async () => {
    if (!list) return;
    const toRemove = list.items.filter((i) => i.checked && !isStaple(i.name));
    if (toRemove.length) {
      let pantry = await loadPantry();
      for (const it of toRemove) pantry = subtractQuantity(pantry, it.name, it.unit, it.quantity);
      await savePantry(pantry);
      pushPantry(pantry);
    }
    await persist({ ...list, items: list.items.map((i) => ({ ...i, checked: false })) });
  };
  const onRefresh = useCallback(async () => { setRefreshing(true); await AsyncStorage.removeItem(LIST_KEY); await load(); setRefreshing(false); }, []);

  if (!list || list.items.length === 0) {
    // Deux cas distincts : aucun plan (list null) vs tout déjà au frigo (list vide).
    const covered = !!list && list.items.length === 0;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={[s.center, layout.content]}>
          <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
            <Ionicons name={covered ? 'checkmark-done-outline' : 'cart-outline'} size={30} color={covered ? t.success : t.textSecondary} />
          </View>
          <Text style={s.emptyT}>{covered ? 'Rien à acheter 🎉' : 'Aucune liste'}</Text>
          <Text style={s.emptyS}>
            {covered
              ? 'Ton frigo couvre déjà tout le plan de la semaine. La liste réapparaîtra dès qu\'il te manquera quelque chose.'
              : 'Génère un plan repas et ta liste de courses apparaît ici, triée par rayon.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const checked = list.items.filter((i) => i.checked).length;
  const total = list.items.length;
  const remaining = total - checked;
  const done = remaining === 0;
  const pct = total ? (checked / total) * 100 : 0;

  // Tri : non cochés d'abord, cochés en bas. Option « masquer cochés ».
  const sections: CoursesSection[] = CATEGORY_ORDER
    .map((cat) => {
      let data = list.items.filter((i) => i.category === cat);
      if (hideChecked) data = data.filter((i) => !i.checked);
      data = [...data].sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
      const left = list.items.filter((i) => i.category === cat && !i.checked).length;
      return { cat, title: CATEGORY_LABELS[cat], left, data };
    })
    .filter((sec) => sec.data.length > 0);

  // ⚠️ En-tête, progression, commandes et note vivent DANS la liste
  // (`ListHeaderComponent`) : c'est ce qui permet au grand titre de s'effacer au
  // profit de la barre compacte, comme dans la maquette. Ils étaient au-dessus de
  // la SectionList, donc « Courses » en 34 restait planté en haut pour toujours.
  //
  // ⚠️ Un ÉLÉMENT, pas une fonction composant : une nouvelle fonction à chaque
  // rendu ferait remonter tout l'en-tête à chaque case cochée.
  const enTete = (
    <View onLayout={repli.onHeaderLayout}>
        {/* En-tête + progression */}
        {/* « Courses », pas « Liste de courses » : le mot de la barre d'onglets, pour
            qu'un même objet n'ait pas deux noms selon l'endroit où on le regarde. */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.sub}>{done ? 'Tout est coché 🎉' : `${remaining} restant${remaining > 1 ? 's' : ''} sur ${total}`}</Text>
            <Text style={s.h1}>Courses</Text>
          </View>
          <Text style={s.counter}>{checked}<Text style={s.counterTot}> / {total} cochés</Text></Text>
        </View>

        {/* La barre n'a plus besoin de conteneur porteur de colonne : elle est dans
            le contentContainer de la liste, qui pose la colonne ET le padding. Le
            piège d'origine — `marginHorizontal` qui s'ajoute À L'EXTÉRIEUR d'un
            `maxWidth`, et la barre qui dépassait des cartes de 40 pt — disparaît
            avec la marge (cf. CLAUDE.md §11). */}
        <View style={s.track}><View style={[s.fill, { width: `${pct}%`, backgroundColor: done ? t.success : t.accent }]} /></View>

        {/* Contrôles */}
        <View style={s.controls}>
          {remaining > 0 && (
            <TouchableOpacity style={s.ctrl} onPress={checkAll} activeOpacity={0.8}>
              <Ionicons name="checkmark-done-outline" size={15} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Tout cocher</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.ctrl, hideChecked && s.ctrlOn]} onPress={() => setHideChecked((v) => !v)} activeOpacity={0.8}>
            <Ionicons name={hideChecked ? 'eye-off-outline' : 'eye-outline'} size={15} color={hideChecked ? t.onAccent : t.textSecondary} />
            <Text style={[s.ctrlTxt, hideChecked && { color: t.onAccent }]}>Masquer cochés</Text>
          </TouchableOpacity>
          {checked > 0 && (
            <TouchableOpacity style={s.ctrl} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={15} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.hint}>Coche un article → il part direct dans ton frigo 🧊</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SectionList<ShoppingItem, CoursesSection>
        sections={sections}
        keyExtractor={(item) => item.name}
        contentContainerStyle={[s.list, layout.content]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={enTete}
        ListFooterComponent={<Text style={s.footnote}>Quantités calculées pour tes repas de la semaine.</Text>}
        {...repli.scrollProps}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textTertiary} />}
        renderSectionHeader={({ section }) => (
          <View style={s.section}>
            <Text style={s.sectionTxt}>{section.title.toUpperCase()}</Text>
            <Text style={s.sectionCount}>{section.left} sur {section.data.length}</Text>
          </View>
        )}
        // UN BLOC par rayon, pas une carte par article : les lignes se séparent
        // par un filet de fond. Vingt-six cartes empilées, c'était vingt-six
        // ombres et vingt-six coins arrondis pour une seule liste.
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <TouchableOpacity
              style={[
                s.row,
                first && { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
                last && { borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card },
                !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
              ]}
              onPress={() => toggle(item)}
              activeOpacity={0.7}
            >
              {/* Pastille RONDE et pleine : une case à cocher carrée est un objet de
                  formulaire, or ici on ne remplit pas un formulaire, on fait ses courses. */}
              <View style={[s.dot, { borderColor: item.checked ? t.accent : t.lineStrong, backgroundColor: item.checked ? t.accent : 'transparent' }]}>
                {item.checked && <Ionicons name="checkmark" size={14} color={t.onAccent} />}
              </View>
              <Text style={[s.name, item.checked && { textDecorationLine: 'line-through', color: t.textTertiary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[s.qty, item.checked && { color: t.textQuaternary }]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <CompactTitleBar t={t} title="Courses" opacity={repli.opacity} />
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyT: { color: t.text, ...Type.h2 },
    emptyS: { color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21 },

    // Plus de padding horizontal ici, ni dans `controls`/`hint`/`track` : ces blocs
    // vivent dans le contentContainer de la liste, qui pose déjà les 20 pt.
    header: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: Spacing.xl, paddingBottom: 12 },
    h1: { color: t.text, ...Type.display, marginTop: 2 },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 19 },
    counter: { color: t.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.6 },
    counterTot: { color: t.textTertiary, fontSize: 14, fontWeight: '400', letterSpacing: 0 },

    track: { height: 5, backgroundColor: t.fill, borderRadius: 3, overflow: 'hidden' },
    fill: { height: 5, borderRadius: 3 },

    controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 14, paddingBottom: 2 },
    ctrl: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: t.fill },
    ctrlOn: { backgroundColor: t.accent },
    ctrlTxt: { color: t.text, fontSize: 14, fontWeight: '500' },
    hint: { color: t.textTertiary, fontSize: 13, lineHeight: 18, paddingTop: 12 },
    // Note de pied présente dans la maquette et absente de l'app : elle dit d'où
    // sortent les quantités, ce qu'aucun autre élément de l'écran n'explique.
    footnote: { color: t.textQuaternary, fontSize: 12, lineHeight: 17, paddingTop: 18 },

    list: { paddingHorizontal: Spacing.xl, paddingBottom: 120, paddingTop: 4 },
    section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 8 },
    sectionTxt: { color: t.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    sectionCount: { color: t.textTertiary, fontSize: 13 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: t.card },
    dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, color: t.text, fontSize: 16, fontWeight: '500' },
    qty: { color: t.textSecondary, fontSize: 15 },
  });
}
