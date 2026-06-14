import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, cardShadow } from '../../constants/theme';
import { PrimaryButton, Chip, Field, SectionLabel, Segmented } from '../../components/ui';
import { ActionSheet } from '../../components/ActionSheet';
import { formatQuantity, toBaseUnit } from '../../lib/units';
import { pushPantry } from '../../lib/sync';
import { searchFoods } from '../../lib/foods';
import {
  PantryItem, PantryCategory, Coverage,
  loadPantry, savePantry, addOrMerge, removeItem, categorize,
  deductRecipe, cookableRecipes, visiblePantry,
} from '../../lib/pantry';

const CATEGORY_ORDER: PantryCategory[] = ['viandes', 'légumes', 'féculents', 'laitiers', 'autres'];
const CATEGORY_LABELS: Record<PantryCategory, string> = {
  viandes: 'Viandes & poissons', légumes: 'Légumes & fruits',
  féculents: 'Féculents & céréales', laitiers: 'Produits laitiers & œufs', autres: 'Autres',
};
const UNITS = ['g', 'kg', 'ml', 'pièce'];

type ViewMode = 'stock' | 'cook';

export default function GardeMangerScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [items, setItems] = useState<PantryItem[]>([]);
  const [view, setView] = useState<ViewMode>('stock');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; cta: string; danger?: boolean; onYes: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Formulaire d'ajout
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [sugDismissed, setSugDismissed] = useState(false); // masque les suggestions après choix
  // Formulaire d'édition
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('g');

  const refresh = useCallback(async () => {
    setItems(await loadPantry());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const persist = async (next: PantryItem[]) => { setItems(next); await savePantry(next); pushPantry(next); };
  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const addManual = async () => {
    const q = parseFloat(qty);
    if (!name.trim() || !(q > 0)) return;
    const base = toBaseUnit(q, unit);
    await persist(addOrMerge(items, { name: name.trim(), quantity: base.quantity, unit: base.unit, category: categorize(name) }));
    setName(''); setQty(''); setUnit('g'); setSugDismissed(false); setShowAdd(false);
  };

  const openEdit = (it: PantryItem) => {
    setEditItem(it);
    setEditQty(String(it.quantity));
    setEditUnit(it.unit);
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const q = parseFloat(editQty);
    if (!(q > 0)) return;
    const base = toBaseUnit(q, editUnit);
    let next = removeItem(items, editItem.name, editItem.unit);
    next = addOrMerge(next, { name: editItem.name, quantity: base.quantity, unit: base.unit, category: editItem.category });
    await persist(next);
    setEditItem(null);
  };

  const remove = (it: PantryItem) => persist(removeItem(items, it.name, it.unit));

  // Cuisiné : déduction directe, sans confirmation (juste un retour visuel).
  const cook = async (c: Coverage) => {
    await persist(deductRecipe(items, c.recipe, 1));
    flashToast(`✓ ${c.recipe.name_fr} cuisiné`);
  };

  const clearAll = () => {
    setConfirm({
      title: 'Vider le garde-manger ?',
      message: 'Tous les aliments seront supprimés.',
      cta: 'Vider', danger: true,
      onYes: () => persist([]),
    });
  };

  const coverage = useMemo(() => cookableRecipes(items), [items]);
  const ready = coverage.filter((c) => c.missing.length === 0);
  const almost = coverage.filter((c) => c.missing.length >= 1 && c.missing.length <= 2).slice(0, 5);

  const visible = useMemo(() => visiblePantry(items), [items]);
  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, list: visible.filter((i) => i.category === cat) }))
    .filter((g) => g.list.length > 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.h1}>Garde-manger</Text>
          <Text style={s.sub}>{visible.length} aliment{visible.length > 1 ? 's' : ''} · {ready.length} recette{ready.length > 1 ? 's' : ''} prête{ready.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color={t.onAccent} />
        </TouchableOpacity>
      </View>

      {visible.length > 0 && (
        <View style={s.segment}>
          <Segmented
            t={t}
            options={[{ label: 'Mon stock', value: 'stock' }, { label: 'À cuisiner', value: 'cook' }]}
            value={view}
            onChange={(v) => setView(v as ViewMode)}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {visible.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
              <Ionicons name="file-tray-full-outline" size={30} color={t.textSecondary} />
            </View>
            <Text style={s.emptyTitle}>Ton garde-manger est vide</Text>
            <Text style={s.emptySub}>Ajoute ce que tu as déjà — ou coche tes articles dans l'onglet Courses, ils arrivent ici automatiquement.</Text>
            <View style={{ height: 8 }} />
            <TouchableOpacity onPress={() => setShowAdd(true)} style={s.ghostBtn} activeOpacity={0.8}>
              <Text style={s.ghostTxt}>Ajouter un aliment</Text>
            </TouchableOpacity>
          </View>
        ) : view === 'cook' ? (
          // ── À CUISINER ───────────────────────────────────────────────────────
          <>
            {ready.length > 0 && (
              <>
                <SectionLabel t={t}>Réalisable maintenant</SectionLabel>
                <View style={{ gap: 10, marginTop: 10 }}>
                  {ready.map((c) => (
                    <View key={c.recipe.id} style={[s.recipe, cardShadow(t)]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rName}>{c.recipe.name_fr}</Text>
                        <Text style={s.rMeta}>{c.recipe.prep_time_min} min · {c.recipe.macros_per_portion.kcal} kcal · {c.recipe.macros_per_portion.protein_g}g P</Text>
                      </View>
                      <TouchableOpacity style={s.cookBtn} onPress={() => cook(c)} activeOpacity={0.85}>
                        <Ionicons name="restaurant" size={14} color={t.onAccent} />
                        <Text style={s.cookTxt}>Cuisiné</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}

            {almost.length > 0 && (
              <>
                <View style={{ marginTop: ready.length > 0 ? 28 : 0 }}>
                  <SectionLabel t={t}>Presque — quelques ingrédients en plus</SectionLabel>
                </View>
                <View style={{ gap: 10, marginTop: 10 }}>
                  {almost.map((c) => (
                    <View key={c.recipe.id} style={[s.recipe, cardShadow(t), { opacity: 0.92 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rName}>{c.recipe.name_fr}</Text>
                        <Text style={s.rMissing}>Il te manque : {c.missing.map((m) => m.name).join(', ')}</Text>
                      </View>
                      <View style={s.missingBadge}>
                        <Text style={s.missingBadgeTxt}>{c.missing.length}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {ready.length === 0 && almost.length === 0 && (
              <View style={[s.note, { backgroundColor: t.fill }]}>
                <Text style={s.noteTxt}>Aucune recette réalisable avec ces aliments pour l'instant. Ajoute des ingrédients pour débloquer des idées de repas.</Text>
              </View>
            )}
          </>
        ) : (
          // ── MON STOCK ────────────────────────────────────────────────────────
          <>
            <View style={s.invHeader}>
              <Text style={s.invHint}>Touche une quantité pour la modifier.</Text>
              <TouchableOpacity onPress={clearAll}><Text style={[s.link, { color: t.danger }]}>Vider</Text></TouchableOpacity>
            </View>

            {grouped.map((g) => (
              <View key={g.cat} style={{ marginTop: 8 }}>
                <Text style={s.catLabel}>{CATEGORY_LABELS[g.cat].toUpperCase()}</Text>
                <View style={[s.invCard, cardShadow(t)]}>
                  {g.list.map((it, i) => (
                    <View key={it.name + it.unit} style={[s.invRow, i < g.list.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
                      <TouchableOpacity style={s.invMain} onPress={() => openEdit(it)} activeOpacity={0.6}>
                        <Text style={s.invName} numberOfLines={1}>{it.name}</Text>
                        <View style={s.invQtyWrap}>
                          <Text style={s.invQty}>{formatQuantity(it.name, it.quantity, it.unit)}</Text>
                          <Ionicons name="pencil" size={13} color={t.textQuaternary} />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => remove(it)} hitSlop={8} style={{ marginLeft: 12 }}>
                        <Ionicons name="close-circle" size={20} color={t.textQuaternary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Toast « cuisiné » */}
      {toast && (
        <View style={[s.toast, { pointerEvents: 'none' }]}>
          <Text style={s.toastTxt}>{toast}</Text>
        </View>
      )}

      {/* Ajout d'un aliment */}
      <ActionSheet visible={showAdd} onClose={() => setShowAdd(false)}>
        <Text style={s.sheetTitle}>Ajouter un aliment</Text>
        <Field t={t} label="Nom" value={name} onChangeText={(v) => { setName(v); setSugDismissed(false); }} placeholder="Blanc de poulet" autoFocus />
        {name.trim().length >= 2 && !sugDismissed && (() => {
          const sug = searchFoods(name, 5);
          if (sug.length === 0) return null;
          return (
            <View style={{ borderWidth: 1, borderColor: t.line, borderRadius: 10, overflow: 'hidden' }}>
              {sug.map((f) => (
                <TouchableOpacity
                  key={f.id} activeOpacity={0.7}
                  onPress={() => { setName(f.name_fr); setSugDismissed(true); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.line }}
                >
                  <Text style={{ color: t.text, fontSize: 14 }} numberOfLines={1}>{f.name_fr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}
        <Field t={t} label="Quantité" suffix={unit} value={qty} onChangeText={setQty} placeholder="500" keyboardType="decimal-pad" />
        <View style={s.unitRow}>
          {UNITS.map((u) => <Chip key={u} t={t} label={u} selected={unit === u} onPress={() => setUnit(u)} />)}
        </View>
        <View style={{ height: 4 }} />
        <PrimaryButton t={t} label="Ajouter" onPress={addManual} disabled={!name.trim() || !(parseFloat(qty) > 0)} />
        <TouchableOpacity onPress={() => setShowAdd(false)} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></TouchableOpacity>
      </ActionSheet>

      {/* Édition de la quantité */}
      <ActionSheet visible={!!editItem} onClose={() => setEditItem(null)}>
        <Text style={s.sheetTitle}>Modifier la quantité</Text>
        <Text style={s.editName}>{editItem?.name}</Text>
        <Field t={t} label="Quantité" suffix={editUnit} value={editQty} onChangeText={setEditQty} placeholder="2" keyboardType="decimal-pad" />
        <View style={s.unitRow}>
          {UNITS.map((u) => <Chip key={u} t={t} label={u} selected={editUnit === u} onPress={() => setEditUnit(u)} />)}
        </View>
        <View style={{ height: 4 }} />
        <PrimaryButton t={t} label="Enregistrer" onPress={saveEdit} disabled={!(parseFloat(editQty) > 0)} />
        <TouchableOpacity onPress={() => setEditItem(null)} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></TouchableOpacity>
      </ActionSheet>

      {/* Confirmation (vider) */}
      <ActionSheet visible={!!confirm} onClose={() => setConfirm(null)}>
        <Text style={s.sheetTitle}>{confirm?.title}</Text>
        <Text style={s.confirmMsg}>{confirm?.message}</Text>
        <View style={{ height: 6 }} />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { confirm?.onYes(); setConfirm(null); }}
          style={[s.confirmBtn, { backgroundColor: confirm?.danger ? t.danger : t.accent }]}
        >
          <Text style={[s.confirmBtnTxt, { color: confirm?.danger ? '#fff' : t.onAccent }]}>{confirm?.cta}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setConfirm(null)} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></TouchableOpacity>
      </ActionSheet>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 4, paddingBottom: 12 },
    h1: { color: t.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
    sub: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    segment: { paddingHorizontal: Spacing.xl, paddingBottom: 6 },
    content: { paddingHorizontal: Spacing.xl, paddingTop: 10, paddingBottom: 120 },

    empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyTitle: { color: t.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
    emptySub: { color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
    ghostBtn: { paddingVertical: 14, alignItems: 'center' },
    ghostTxt: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },

    recipe: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderRadius: Radius.lg, padding: 16 },
    rName: { color: t.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    rMeta: { color: t.textSecondary, fontSize: 13, marginTop: 4 },
    rMissing: { color: t.textTertiary, fontSize: 13, marginTop: 4 },
    cookBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill },
    cookTxt: { color: t.onAccent, fontSize: 13, fontWeight: '700' },
    missingBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    missingBadgeTxt: { color: t.textSecondary, fontSize: 13, fontWeight: '700' },

    note: { borderRadius: Radius.md, padding: 16, marginTop: 4 },
    noteTxt: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },

    invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    invHint: { color: t.textTertiary, fontSize: 12 },
    link: { color: t.textSecondary, fontSize: 13, fontWeight: '600' },
    catLabel: { color: t.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
    invCard: { backgroundColor: t.card, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl },
    invRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    invMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    invName: { flex: 1, color: t.text, fontSize: 15, fontWeight: '600', marginRight: 12 },
    invQtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    invQty: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },

    toast: { position: 'absolute', left: 20, right: 20, bottom: 28, backgroundColor: t.accent, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
    toastTxt: { color: t.onAccent, fontSize: 14, fontWeight: '700' },

    sheetTitle: { color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    editName: { color: t.textSecondary, fontSize: 15, fontWeight: '600', marginTop: -6 },
    unitRow: { flexDirection: 'row', gap: 8 },
    cancel: { alignItems: 'center', paddingVertical: 6 },
    cancelTxt: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },
    confirmMsg: { color: t.textSecondary, fontSize: 15, lineHeight: 21 },
    confirmBtn: { borderRadius: Radius.md, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    confirmBtnTxt: { fontSize: 17, fontWeight: '700' },
  });
}
