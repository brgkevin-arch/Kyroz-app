import React, { useCallback, useMemo, useState } from 'react';
import { Presse } from '../../components/Presse';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, Type, cardShadow, Fond, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { useLayout } from '../../constants/layout';
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
import { useTourTarget, useScreenTour, TourButton } from '../../components/GuidedTour';
import { frigoTour } from '../../lib/tours';

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
  const layout = useLayout();
  const repli = useCollapsingTitle();

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

  // Cibles de la visite guidée.
  const ajouterRef = useTourTarget('frigo-ajouter');
  const compteurRef = useTourTarget('frigo-compteur');
  // ⚠️ `frigo-vue-cuisiner` est parti avec sa bulle le 2026-08-14 (décision
  // fondateur, cf. `lib/tours.ts`). Une cible enregistrée que plus aucune étape ne
  // vise n'est pas inoffensive : elle se relit comme une bulle perdue en route —
  // exactement le « tour amputé » que `GuidedTour` avertit de ne pas confondre.
  // ⚠️ Sur un frigo VIDE, le compteur ne dit rien et le sélecteur de vue n'est
  // même pas monté : le tour se réduirait au bouton « + ». On attend qu'il y ait
  // un stock — l'écran vide, lui, s'explique déjà tout seul en toutes lettres.
  const { rejouer: rejouerTour } = useScreenTour('frigo', frigoTour(), {
    pret: items.length > 0,
  });

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

  // Tomber à ZÉRO retire l'aliment : c'est le seul chemin de suppression depuis que
  // les lignes n'ont plus de croix. La quantité et la présence dans le frigo sont la
  // même information — « je n'en ai plus » et « retire-le » sont le même geste.
  const saveEdit = async () => {
    if (!editItem) return;
    const q = parseFloat(editQty);
    if (!(q >= 0)) return;
    if (q === 0) {
      await persist(removeItem(items, editItem.name, editItem.unit));
      setEditItem(null);
      return;
    }
    const base = toBaseUnit(q, editUnit);
    let next = removeItem(items, editItem.name, editItem.unit);
    next = addOrMerge(next, { name: editItem.name, quantity: base.quantity, unit: base.unit, category: editItem.category });
    await persist(next);
    setEditItem(null);
  };

  // Pas du − / + selon l'unité. Un pas unique n'existe pas : « −1 g » sur 500 g de
  // riz ne sert à rien, et « −50 » sur 3 œufs vide la ligne d'un coup.
  //
  // Mise à jour FONCTIONNELLE plutôt que `parseFloat(editQty)` : un pas-à-pas se
  // tapote vite, et lire l'état dans la fermeture ferait partir deux appuis
  // rapprochés de la même valeur. React groupe les mises à jour, pas les lectures.
  const bumpEditQty = (dir: 1 | -1) => {
    const step = editUnit === 'pièce' ? 1 : editUnit === 'kg' ? 0.5 : 50;
    setEditQty((prev) => {
      const cur = parseFloat(prev) || 0;
      return String(Math.max(0, Math.round((cur + dir * step) * 100) / 100));
    });
  };

  // Cuisiné : déduction directe, sans confirmation (juste un retour visuel).
  const cook = async (c: Coverage) => {
    await persist(deductRecipe(items, c.recipe, 1));
    flashToast(`✓ ${c.recipe.name_fr} cuisiné`);
  };

  const clearAll = () => {
    setConfirm({
      title: 'Vider le frigo ?',
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
      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false} {...repli.scrollProps}>
        {/* ⚠️ L'en-tête ET les segments sont DANS le défilement, comme dans la
            maquette : c'est ce qui permet au gros titre de s'effacer au profit de
            la barre compacte. Ils étaient au-dessus du ScrollView, donc le titre
            de 34 restait planté en haut pour toujours. */}
        {/* « Frigo », le mot de la barre d'onglets — un même objet ne peut pas avoir
            deux noms selon l'endroit d'où on le regarde. */}
        <View style={s.header} onLayout={repli.onHeaderLayout}>
          {/* La ref du compteur est posée sur ce bloc et non sur le `+` qui suit :
              le spotlight épouse alors le sous-titre et le titre, c'est-à-dire ce
              dont la bulle parle. */}
          <View ref={compteurRef} style={{ flex: 1 }}>
            <Text style={s.sub}>{visible.length} aliment{visible.length > 1 ? 's' : ''} · {ready.length} recette{ready.length > 1 ? 's' : ''} prête{ready.length > 1 ? 's' : ''}</Text>
            <Text style={s.h1}>Frigo</Text>
          </View>
          <View style={s.headerActions}>
            <TourButton onPress={rejouerTour} />
            <Presse ref={ajouterRef} style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="add" size={Icone.action} color={t.onAccent} />
            </Presse>
          </View>
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

        {visible.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
              <Ionicons name="file-tray-full-outline" size={Icone.vide} color={t.textSecondary} />
            </View>
            <Text style={s.emptyTitle}>Ton frigo est vide</Text>
            <Text style={s.emptySub}>Ajoute ce que tu as déjà — ou coche tes articles dans l'onglet Courses, ils arrivent ici automatiquement.</Text>
            <View style={{ height: 8 }} />
            <Presse onPress={() => setShowAdd(true)} style={s.ghostBtn} activeOpacity={OPACITE_PRESSION}>
              <Text style={s.ghostTxt}>Ajouter un aliment</Text>
            </Presse>
          </View>
        ) : view === 'cook' ? (
          // ── À CUISINER ───────────────────────────────────────────────────────
          <>
            {ready.length > 0 && (
              <>
                <SectionLabel t={t}>Réalisable maintenant</SectionLabel>
                <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
                  {ready.map((c) => (
                    <View key={c.recipe.id} style={[s.recipe, cardShadow(t)]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rName}>{c.recipe.name_fr}</Text>
                        <Text style={s.rMeta}>{c.recipe.prep_time_min} min · {c.recipe.macros_per_portion.kcal} kcal · {c.recipe.macros_per_portion.protein_g}g P</Text>
                      </View>
                      <Presse style={s.cookBtn} onPress={() => cook(c)} activeOpacity={OPACITE_PRESSION}>
                        <Ionicons name="restaurant" size={Icone.petite} color={t.onAccent} />
                        <Text style={s.cookTxt}>Cuisiné</Text>
                      </Presse>
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
                <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
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
              <Presse onPress={clearAll}><Text style={[s.link, { color: t.danger }]}>Vider</Text></Presse>
            </View>

            {grouped.map((g) => (
              <View key={g.cat} style={{ marginTop: Spacing.sm }}>
                <Text style={s.catLabel}>{CATEGORY_LABELS[g.cat].toUpperCase()}</Text>
                <View style={[s.invCard, cardShadow(t)]}>
                  {/* Plus de croix de suppression par ligne : toucher la quantité
                      ouvre le pas-à-pas, et tomber à zéro retire l'aliment. Une
                      croix sur chaque ligne, c'est une invitation à la faute de
                      frappe sur un geste irréversible. */}
                  {g.list.map((it, i) => (
                    <Presse
                      key={it.name + it.unit}
                      style={[s.invRow, i < g.list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}
                      onPress={() => openEdit(it)}
                      activeOpacity={OPACITE_PRESSION}
                    >
                      <Text style={s.invName} numberOfLines={1}>{it.name}</Text>
                      <Text style={s.invQty}>{formatQuantity(it.name, it.quantity, it.unit)}</Text>
                    </Presse>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <CompactTitleBar t={t} title="Frigo" opacity={repli.opacity} />

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
            <View style={{ borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.sm, overflow: 'hidden' }}>
              {sug.map((f) => (
                <Presse
                  key={f.id} activeOpacity={OPACITE_PRESSION}
                  onPress={() => { setName(f.name_fr); setSugDismissed(true); }}
                  style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: Trait.fin, borderBottomColor: t.line }}
                >
                  <Text style={{ ...Type.bodySmall, color: t.text }} numberOfLines={1}>{f.name_fr}</Text>
                </Presse>
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
        <Presse onPress={() => setShowAdd(false)} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></Presse>
      </ActionSheet>

      {/* Édition de la quantité */}
      <ActionSheet visible={!!editItem} onClose={() => setEditItem(null)}>
        <Text style={s.sheetTitle}>Modifier la quantité</Text>
        <Text style={s.editName}>{editItem?.name}</Text>
        <View style={s.stepRow}>
          <Presse onPress={() => bumpEditQty(-1)} style={s.stepBtn} activeOpacity={OPACITE_PRESSION} accessibilityLabel="Diminuer la quantité">
            <Ionicons name="remove" size={Icone.action} color={t.text} />
          </Presse>
          <View style={{ flex: 1 }}>
            <Field t={t} label="Quantité" suffix={editUnit} value={editQty} onChangeText={setEditQty} placeholder="2" keyboardType="decimal-pad" />
          </View>
          <Presse onPress={() => bumpEditQty(1)} style={s.stepBtn} activeOpacity={OPACITE_PRESSION} accessibilityLabel="Augmenter la quantité">
            <Ionicons name="add" size={Icone.action} color={t.text} />
          </Presse>
        </View>
        <View style={s.unitRow}>
          {UNITS.map((u) => <Chip key={u} t={t} label={u} selected={editUnit === u} onPress={() => setEditUnit(u)} />)}
        </View>
        <Text style={s.stepHint}>Descends à 0 pour retirer cet aliment du frigo.</Text>
        <View style={{ height: 4 }} />
        <PrimaryButton
          t={t}
          label={parseFloat(editQty) === 0 ? 'Retirer du frigo' : 'Enregistrer'}
          onPress={saveEdit}
          disabled={!(parseFloat(editQty) >= 0)}
        />
        <Presse onPress={() => setEditItem(null)} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></Presse>
      </ActionSheet>

      {/* Confirmation (vider) */}
      <ActionSheet visible={!!confirm} onClose={() => setConfirm(null)}>
        <Text style={s.sheetTitle}>{confirm?.title}</Text>
        <Text style={s.confirmMsg}>{confirm?.message}</Text>
        <View style={{ height: 6 }} />
        <Presse
          activeOpacity={OPACITE_PRESSION}
          onPress={() => { confirm?.onYes(); setConfirm(null); }}
          style={[s.confirmBtn, { backgroundColor: confirm?.danger ? t.danger : t.accent }]}
        >
          <Text style={[s.confirmBtnTxt, { color: confirm?.danger ? t.onDanger : t.onAccent }]}>{confirm?.cta}</Text>
        </Presse>
        <Presse onPress={() => setConfirm(null)} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></Presse>
      </ActionSheet>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    // ⚠️ Plus de `paddingHorizontal` : l'en-tête vit maintenant dans le
    // contentContainer du ScrollView, qui pose déjà les 20 pt. L'y laisser les
    // aurait doublés.
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.xs, paddingBottom: Spacing.md },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 19 },
    addBtn: { width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    segment: { paddingBottom: Spacing.sm },
    content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Fond.barreOnglets },

    empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxxl },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    emptyTitle: { color: t.text, ...Type.h2 },
    emptySub: { ...Type.body, color: t.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: Spacing.md },
    ghostBtn: { paddingVertical: Spacing.lg, alignItems: 'center' },
    ghostTxt: { ...Type.bodyStrong, color: t.textSecondary },

    recipe: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg },
    rName: { ...Type.label, color: t.text, letterSpacing: -0.3 },
    rMeta: { ...Type.caption, color: t.textSecondary, marginTop: Spacing.xs },
    rMissing: { ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs },
    cookBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: t.accent, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', borderRadius: Radius.pill },
    cookTxt: { ...Type.captionStrong, color: t.onAccent },
    missingBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    missingBadgeTxt: { ...Type.captionStrong, color: t.textSecondary },

    note: { borderRadius: Radius.card, padding: Spacing.lg, marginTop: Spacing.xs },
    noteTxt: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },

    invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    invHint: { ...Type.caption, color: t.textTertiary },
    link: { ...Type.bodySmall, color: t.textSecondary },
    catLabel: { ...Type.overline, color: t.textTertiary, marginBottom: Spacing.sm, marginTop: Spacing.md },
    invCard: { backgroundColor: t.card, borderRadius: Radius.card, paddingHorizontal: Spacing.lg },
    invRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.lg },
    invName: { ...Type.body, flex: 1, color: t.text },
    invQty: { ...Type.body, color: t.textSecondary },
    stepRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
    stepBtn: { width: 48, height: 48, borderRadius: Radius.button, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    stepHint: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },

    toast: { position: 'absolute', left: 20, right: 20, bottom: 28, backgroundColor: t.accent, borderRadius: Radius.button, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, alignItems: 'center' },
    toastTxt: { ...Type.bodySmallStrong, color: t.onAccent },

    sheetTitle: { color: t.text, ...Type.h2 },
    editName: { ...Type.bodyStrong, color: t.textSecondary, marginTop: -Spacing.sm },
    unitRow: { flexDirection: 'row', gap: Spacing.sm },
    cancel: { alignItems: 'center', paddingVertical: Spacing.sm },
    cancelTxt: { ...Type.bodyStrong, color: t.textSecondary },
    confirmMsg: { ...Type.body, color: t.textSecondary, lineHeight: 21 },
    confirmBtn: { borderRadius: Radius.button, paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
    confirmBtnTxt: { ...Type.h3 },
  });
}
