import React, { useCallback, useMemo, useState } from 'react';
import { Presse } from '../../components/Presse';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, Type, cardShadow, Fond, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { useLayout } from '../../constants/layout';
import { PrimaryButton, Chip, Field, Segmented } from '../../components/ui';
import { animerMiseEnPage } from '../../components/Mouvement';
import { ActionSheet } from '../../components/ActionSheet';
import { formatQuantity, toBaseUnit } from '../../lib/units';
import { pushPantry } from '../../lib/sync';
import { searchFoods } from '../../lib/foods';
import {
  PantryItem, PantryCategory, Conservation,
  loadPantry, savePantry, addOrMerge, removeItem, categorize,
  visiblePantry, conservationDe, parConservation, setConservation,
} from '../../lib/pantry';

const CATEGORY_ORDER: PantryCategory[] = ['viandes', 'légumes', 'féculents', 'laitiers', 'autres'];
const CATEGORY_LABELS: Record<PantryCategory, string> = {
  viandes: 'Viandes & poissons', légumes: 'Légumes & fruits',
  féculents: 'Féculents & céréales', laitiers: 'Produits laitiers & œufs', autres: 'Autres',
};
const UNITS = ['g', 'kg', 'ml', 'pièce'];

// ── LE FRAIS ET LE SEC SONT SÉPARÉS (2026-08-24, décision fondateur) ─────────
//
// Une réserve n'est pas un frigo : le riz, les conserves et les pâtes ne se
// rangent pas au même endroit que la viande. Les mélanger dans une seule liste
// obligeait à trier de tête ce que la cuisine sépare déjà physiquement.
//
// Le classement est AUTOMATIQUE (par catégorie, `lib/pantry.ts`) et corrigeable
// depuis la fiche d'un aliment : personne ne va trier à la main les 69 lignes
// qu'une clôture de courses peut poser d'un coup.
const CONSERVATIONS: { value: Conservation; label: string }[] = [
  { value: 'frais', label: 'Au frais' },
  { value: 'sec', label: 'Au sec' },
];

export default function ReserveScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const repli = useCollapsingTitle();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [vue, setVue] = useState<Conservation>('frais');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; cta: string; danger?: boolean; onYes: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Rayons repliables (décision fondateur, 2026-08-14) ───────────────────
  //
  // On mémorise les rayons FERMÉS, pas les ouverts : le défaut demandé est
  // « ouvert », et un ensemble vide le dit sans qu'aucune ligne de code n'ait à
  // l'initialiser. Un rayon qui apparaît (un premier produit laitier acheté) est
  // donc ouvert d'office, sans que rien n'ait à y penser.
  // ⚠️ Volontairement NON PERSISTÉ : c'est un pli de lecture, pas un réglage.
  // Le stocker en ferait une valeur d'appareil, donc le patron obligatoire de
  // CLAUDE.md §11 (store externe + `useSyncExternalStore`) pour un état qui ne
  // survit à rien d'important — et la réserve se rouvrirait à moitié repliée sans
  // que personne ne se souvienne de l'avoir demandé.
  const [rayonsFermes, setRayonsFermes] = useState<PantryCategory[]>([]);
  // Un accordéon qui claque ne dit pas OÙ le contenu est parti : les aliments se
  // fondent et l'en-tête du rayon suivant remonte à leur place.
  const basculerRayon = (cat: PantryCategory) => {
    animerMiseEnPage();
    setRayonsFermes((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  // Formulaire d'ajout
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [sugDismissed, setSugDismissed] = useState(false); // masque les suggestions après choix
  // Formulaire d'édition
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('g');
  const [editConservation, setEditConservation] = useState<Conservation>('frais');

  // Cibles de la visite guidée.
  // ⚠️ `reserve-compteur` est parti avec sa bulle (coupe des tutos, 2026-08-25) :
  // elle disait « touche une quantité pour la corriger », phrase déjà affichée en
  // toutes lettres au-dessus de la liste. Et le compteur qu'elle visait n'existe
  // plus. Une cible sans étape se relit comme une bulle perdue en route.
  // La bulle vise le bouton « + », monté quel que soit le stock : plus besoin
  // d'attendre qu'il y ait des aliments comme au temps où une seconde bulle visait
  // le compteur.

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
    setEditConservation(conservationDe(it));
  };

  // Tomber à ZÉRO retire l'aliment : c'est le seul chemin de suppression depuis que
  // les lignes n'ont plus de croix. La quantité et la présence en réserve sont la
  // même information — « je n'en ai plus » et « retire-le » sont le même geste.
  //
  // ⚠️ Le rangement (frais / sec) est REPOSÉ à l'enregistrement : `removeItem` puis
  // `addOrMerge` reconstruit la ligne, donc une correction faite ici serait perdue
  // si on ne la passait pas explicitement.
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
    next = addOrMerge(next, {
      name: editItem.name, quantity: base.quantity, unit: base.unit,
      category: editItem.category, conservation: editConservation,
    });
    next = setConservation(next, editItem.name, base.unit, editConservation);
    await persist(next);
    // Changer de rangement fait SORTIR l'aliment de la liste qu'on regarde. Sans
    // un mot, il a l'air d'avoir disparu.
    if (editConservation !== conservationDe(editItem)) {
      flashToast(editConservation === 'sec' ? `${editItem.name} rangé au sec` : `${editItem.name} rangé au frais`);
    }
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

  const clearAll = () => {
    setConfirm({
      title: 'Vider la réserve ?',
      message: 'Tous les aliments seront supprimés, au frais comme au sec.',
      cta: 'Vider', danger: true,
      onYes: () => persist([]),
    });
  };

  const visible = useMemo(() => visiblePantry(items), [items]);
  const frais = useMemo(() => parConservation(visible, 'frais'), [visible]);
  const sec = useMemo(() => parConservation(visible, 'sec'), [visible]);
  const courant = vue === 'frais' ? frais : sec;
  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, list: courant.filter((i) => i.category === cat) }))
    .filter((g) => g.list.length > 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false} {...repli.scrollProps}>
        {/* ⚠️ L'en-tête ET les segments sont DANS le défilement, comme dans la
            maquette : c'est ce qui permet au gros titre de s'effacer au profit de
            la barre compacte. Ils étaient au-dessus du ScrollView, donc le titre
            de 34 restait planté en haut pour toujours. */}
        {/* « Réserve », le mot de la barre d'onglets — un même objet ne peut pas
            avoir deux noms selon l'endroit d'où on le regarde. */}
        <View style={s.header} onLayout={repli.onHeaderLayout}>
          {/* 🔴 PLUS DE COMPTEUR AU-DESSUS DU TITRE (2026-08-25, décision fondateur :
              « je veux le gros titre de l'onglet en haut et ne pas avoir les détails
              du stock au-dessus »). Il annonçait « 59 aliments · 28 au frais · 31 au
              sec » — trois chiffres à lire avant le nom de l'écran, sur un inventaire
              qu'on ouvre justement pour REGARDER ce qu'il contient.
              ⚠️ Le compte n'est pas rapatrié ailleurs : chaque rayon porte déjà le
              sien, et le fondateur a explicitement accepté de perdre le total. */}
          <Text style={[s.h1, { flex: 1 }]}>Réserve</Text>
          {/* 🔴 PLUS DE TUTO NI DE « ? » (2026-08-25, décision fondateur). Il ne reste
              donc qu'une action dans l'en-tête : le « + ». */}
          <View style={s.headerActions}>
            <Presse style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="add" size={Icone.action} color={t.onAccent} />
            </Presse>
          </View>
        </View>

        {visible.length > 0 && (
          <View style={s.segment}>
            <Segmented
              t={t}
              options={CONSERVATIONS.map((c) => ({ label: c.label, value: c.value }))}
              value={vue}
              onChange={(v) => { animerMiseEnPage(); setVue(v as Conservation); }}
            />
          </View>
        )}

        {visible.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
              <Ionicons name="file-tray-full-outline" size={Icone.vide} color={t.textSecondary} />
            </View>
            <Text style={s.emptyTitle}>Ta réserve est vide</Text>
            <Text style={s.emptySub}>
              Ajoute ce que tu as déjà — ou fais tes courses : « Courses terminées » range
              tout ce que tu as coché ici, au frais ou au sec.
            </Text>
            <View style={{ height: 8 }} />
            <Presse onPress={() => setShowAdd(true)} style={s.ghostBtn} activeOpacity={OPACITE_PRESSION}>
              <Text style={s.ghostTxt}>Ajouter un aliment</Text>
            </Presse>
          </View>
        ) : (
          <>
            <View style={s.invHeader}>
              <Text style={s.invHint}>Touche une quantité pour la modifier.</Text>
              <Presse onPress={clearAll}><Text style={[s.link, { color: t.danger }]}>Vider</Text></Presse>
            </View>

            {courant.length === 0 ? (
              // Un côté vide n'est pas un écran vide : l'autre est plein, et le
              // sélecteur juste au-dessus dit où est le reste.
              <View style={[s.note, { backgroundColor: t.fill }]}>
                <Text style={s.noteTxt}>
                  {/* ⚠️ LES DEUX PHRASES SONT JUMELLES, DONC ELLES SE CONSTRUISENT PAREIL.
                      Une seule portait « rangé » (relecture des textes, 2026-08-26) : à
                      l'usage on bascule d'un côté à l'autre en un tap, donc les deux se
                      lisent à quelques secondes d'intervalle, et l'écart de construction
                      s'entend. Elles ne sont pas assemblées par gabarit pour autant —
                      « au frais » et « au sec » ne sont pas deux valeurs d'une même
                      variable, ce sont deux mots que le français décline différemment
                      selon la phrase. Les écrire en entier, c'est pouvoir les corriger. */}
                  {vue === 'frais'
                    ? 'Rien au frais pour l\'instant — tout ce que tu as est rangé au sec.'
                    : 'Rien au sec pour l\'instant — tout ce que tu as est rangé au frais.'}
                </Text>
              </View>
            ) : (
              // ── Rayons repliables (décision fondateur, 2026-08-14) ────────────
              // Une réserve nourrie par l'onglet Courses monte vite à 69 lignes :
              // la replier par rayon rend la liste parcourable sans rien lui
              // retirer. **Ouverte par défaut**, sur sa demande — un inventaire qui
              // s'ouvre fermé cache ce qu'on vient vérifier.
              // ⚠️ L'en-tête devient un BOUTON, donc il lui faut la cible tactile
              // des 44 pt : sans `minHeight`, une étiquette en petites capitales
              // fait 15 pt de haut et se rate une fois sur deux.
              grouped.map((g) => {
                const ferme = rayonsFermes.includes(g.cat);
                return (
                  <View key={g.cat} style={{ marginTop: Spacing.sm }}>
                    <Presse
                      style={s.catHeader}
                      onPress={() => basculerRayon(g.cat)}
                      activeOpacity={OPACITE_PRESSION}
                      accessibilityRole="button"
                      accessibilityLabel={`${CATEGORY_LABELS[g.cat]}, ${g.list.length} aliment${g.list.length > 1 ? 's' : ''} — ${ferme ? 'déplier' : 'replier'}`}
                    >
                      <Text style={s.catLabel}>{CATEGORY_LABELS[g.cat].toUpperCase()}</Text>
                      {/* Le compte reste visible RAYON FERMÉ : replié, c'est la seule
                          chose qui dise ce qu'on vient de cacher. */}
                      <Text style={s.catCount}>{g.list.length}</Text>
                      <Ionicons
                        name={ferme ? 'chevron-down' : 'chevron-up'}
                        size={Icone.petite}
                        color={t.textTertiary}
                      />
                    </Presse>
                    {!ferme && (
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
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <CompactTitleBar t={t} title="Réserve" opacity={repli.opacity} />

      {/* Toast (changement de rangement) */}
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
        {/* Pas de choix frais/sec à l'ajout : Kyroz range seul d'après l'aliment, et
            la fiche permet de corriger. Une question de plus à chaque ajout pour un
            classement juste presque toujours, c'est une friction qu'on ne paye pas. */}
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
        <Text style={s.editLabel}>RANGEMENT</Text>
        <View style={s.unitRow}>
          {CONSERVATIONS.map((c) => (
            <Chip key={c.value} t={t} label={c.label} selected={editConservation === c.value} onPress={() => setEditConservation(c.value)} />
          ))}
        </View>
        <Text style={s.stepHint}>Descends à 0 pour retirer cet aliment de ta réserve.</Text>
        <View style={{ height: 4 }} />
        <PrimaryButton
          t={t}
          label={parseFloat(editQty) === 0 ? 'Retirer de ma réserve' : 'Enregistrer'}
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

    note: { borderRadius: Radius.card, padding: Spacing.lg, marginTop: Spacing.xs },
    noteTxt: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },

    invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    invHint: { ...Type.caption, color: t.textTertiary },
    link: { ...Type.bodySmall, color: t.textSecondary },
    // ⚠️ `minHeight` : l'étiquette de rayon est devenue un BOUTON le 2026-08-14.
    // En petites capitales elle fait 15 pt de haut ; sans hauteur minimale, le
    // pli de la réserve se raterait une fois sur deux (et `espacementDA` le compte).
    catHeader: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      minHeight: CIBLE_TACTILE_MIN, marginTop: Spacing.sm,
    },
    catLabel: { ...Type.overline, color: t.textTertiary, flex: 1 },
    catCount: { ...Type.caption, color: t.textQuaternary },
    invCard: { backgroundColor: t.card, borderRadius: Radius.card, paddingHorizontal: Spacing.lg },
    invRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.lg },
    invName: { ...Type.body, flex: 1, color: t.text },
    invQty: { ...Type.body, color: t.textSecondary },
    stepRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
    stepBtn: { width: 48, height: 48, borderRadius: Radius.button, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    stepHint: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },

    // 🔴 `Fond.barreOnglets` ET NON 28. La barre d'onglets FLOTTE au-dessus du
    // contenu depuis la passe matériaux (§8) : à 28 pt du bas, ce bandeau était
    // dessiné DERRIÈRE elle — visible seulement comme une tache floue à travers le
    // verre. Le seul retour qui disait ce qui venait de se passer n'a donc jamais
    // été lisible. Mesuré au simulateur, capture zoomée à l'appui.
    toast: { position: 'absolute', left: 20, right: 20, bottom: Fond.barreOnglets, backgroundColor: t.accent, borderRadius: Radius.button, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, alignItems: 'center' },
    toastTxt: { ...Type.bodySmallStrong, color: t.onAccent },

    sheetTitle: { color: t.text, ...Type.h2 },
    editName: { ...Type.bodyStrong, color: t.textSecondary, marginTop: -Spacing.sm },
    editLabel: { ...Type.overline, color: t.textTertiary },
    unitRow: { flexDirection: 'row', gap: Spacing.sm },
    // ⚠️ 44 pt PLEINS, pas `paddingVertical: Spacing.sm` : ce style faisait
    // ~36 pt et sert aux « Annuler » des TROIS feuilles de l'écran.
    cancel: { alignItems: 'center', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN },
    cancelTxt: { ...Type.bodyStrong, color: t.textSecondary },
    confirmMsg: { ...Type.body, color: t.textSecondary, lineHeight: 21 },
    confirmBtn: { borderRadius: Radius.button, paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
    confirmBtnTxt: { ...Type.h3 },
  });
}
