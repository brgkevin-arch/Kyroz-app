import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../../constants/theme';
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
const CATEGORY_ICON: Record<ShoppingItem['category'], any> = {
  viandes: 'fish-outline',
  légumes: 'leaf-outline',
  féculents: 'nutrition-outline',
  laitiers: 'egg-outline',
  autres: 'bag-handle-outline',
};
const CATEGORY_ORDER: ShoppingItem['category'][] = ['viandes', 'légumes', 'féculents', 'laitiers', 'autres'];

export default function CoursesScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
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
        <View style={s.center}>
          <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
            <Ionicons name={covered ? 'checkmark-done-outline' : 'cart-outline'} size={30} color={covered ? t.success : t.textSecondary} />
          </View>
          <Text style={s.emptyT}>{covered ? 'Rien à acheter 🎉' : 'Aucune liste'}</Text>
          <Text style={s.emptyS}>
            {covered
              ? 'Ton garde-manger couvre déjà tout le plan de la semaine. La liste réapparaîtra dès qu\'il te manquera quelque chose.'
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
  const sections = CATEGORY_ORDER
    .map((cat) => {
      let data = list.items.filter((i) => i.category === cat);
      if (hideChecked) data = data.filter((i) => !i.checked);
      data = [...data].sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
      const left = list.items.filter((i) => i.category === cat && !i.checked).length;
      return { cat, title: CATEGORY_LABELS[cat], left, data };
    })
    .filter((sec) => sec.data.length > 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* En-tête + progression */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>Liste de courses</Text>
          <Text style={s.sub}>{done ? 'Tout est coché 🎉' : `${remaining} restant${remaining > 1 ? 's' : ''} sur ${total}`}</Text>
        </View>
        <Text style={s.counter}>{checked}<Text style={s.counterTot}>/{total}</Text></Text>
      </View>

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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.name}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textTertiary} />}
        renderSectionHeader={({ section }) => (
          <View style={s.section}>
            <Ionicons name={CATEGORY_ICON[(section as any).cat as ShoppingItem['category']]} size={14} color={t.textTertiary} />
            <Text style={s.sectionTxt}>{section.title.toUpperCase()}</Text>
            {(section as any).left > 0 && <Text style={s.sectionCount}>{(section as any).left}</Text>}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.row, cardShadow(t)]} onPress={() => toggle(item)} activeOpacity={0.7}>
            <View style={[s.box, { borderColor: item.checked ? t.accent : t.lineStrong, backgroundColor: item.checked ? t.accent : 'transparent' }]}>
              {item.checked && <Ionicons name="checkmark" size={15} color={t.onAccent} />}
            </View>
            <Text style={[s.name, item.checked && { textDecorationLine: 'line-through', color: t.textTertiary }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[s.qty, item.checked && { color: t.textQuaternary }]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyT: { color: t.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
    emptyS: { color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21 },

    header: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.xl, paddingBottom: 12 },
    h1: { color: t.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
    sub: { color: t.textSecondary, fontSize: 14, marginTop: 3 },
    counter: { color: t.text, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
    counterTot: { color: t.textTertiary, fontSize: 16, fontWeight: '700' },

    track: { height: 5, backgroundColor: t.fill, marginHorizontal: Spacing.xl, borderRadius: 3, overflow: 'hidden' },
    fill: { height: 5, borderRadius: 3 },

    controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.xl, paddingTop: 14, paddingBottom: 2 },
    ctrl: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: t.fill, borderWidth: 1, borderColor: t.line },
    ctrlOn: { backgroundColor: t.accent, borderColor: t.accent },
    ctrlTxt: { color: t.textSecondary, fontSize: 13, fontWeight: '600' },
    hint: { color: t.textTertiary, fontSize: 12, paddingHorizontal: Spacing.xl, paddingTop: 12 },

    list: { paddingHorizontal: Spacing.xl, paddingBottom: 120, paddingTop: 4 },
    section: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, marginBottom: 10 },
    sectionTxt: { color: t.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    sectionCount: { color: t.textTertiary, fontSize: 12, fontWeight: '700', backgroundColor: t.fill, minWidth: 20, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.pill, overflow: 'hidden' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: t.card, borderRadius: Radius.md, marginBottom: 8 },
    box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, color: t.text, fontSize: 15, fontWeight: '600' },
    qty: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  });
}
