import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemePalette, Radius, Spacing, Type, Fond, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { Sheet } from '../../components/Sheet';
import { useDialog } from '../../components/Dialog';
import { ShoppingHistory } from '../../components/ShoppingHistory';
import { MealPlan, ShoppingItem, ShoppingList } from '../../lib/types';
import { buildShoppingList } from '../../lib/shoppingList';
import { formatQuantity } from '../../lib/units';
import { loadPantry, savePantry, addOrMerge, subtractQuantity, isStaple } from '../../lib/pantry';
import {
  ShoppingTrip, loadHistory, saveHistory, recordTrip, removeTrip, historySummary,
} from '../../lib/shoppingHistory';
import { pushPantry } from '../../lib/sync';
import { useTourTarget, useScreenTour, TourButton } from '../../components/GuidedTour';
import { coursesTour } from '../../lib/tours';

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
  const { confirm } = useDialog();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const [history, setHistory] = useState<ShoppingTrip[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Cibles de la visite guidée. La ref d'article se pose sur la toute première
  // ligne de la première section — `renderItem` étant une callback, le hook vit
  // ici (même contrainte que l'onglet Recettes).
  const sourceRef = useTourTarget('courses-source');
  const controlesRef = useTourTarget('courses-controles');
  const articleRef = useTourTarget('courses-article');
  // ⚠️ AVANT le `return` de l'état vide, plus bas : un hook posé après un retour
  // n'existe qu'aux rendus qui l'atteignent → « Rendered more hooks than during
  // the previous render », et l'écran tombe dans l'ErrorBoundary. Le même piège a
  // déjà coûté l'écran de bienvenue (cf. FirstPlanReveal).
  const { rejouer: rejouerTour } = useScreenTour('courses', coursesTour(), {
    pret: !!list && list.items.length > 0,
  });

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setHistory(await loadHistory());
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

  // ── « Courses terminées » : on CLÔT la sortie ────────────────────────────
  //
  // Sans ce geste, une liste entièrement cochée restait à l'écran, barrée, pour
  // toujours : le seul moyen de la solder était de tirer pour rafraîchir — donc
  // de connaître un geste que rien n'annonce. Terminer fait deux choses, et rien
  // d'autre :
  //   1. la liste s'inscrit à l'historique (ce qui a été pris, ce qui ne l'a pas) ;
  //   2. le cache est vidé, donc `load()` la RECALCULE depuis le plan moins le
  //      garde-manger. Les articles cochés sont déjà au frigo (`toggle`), ils
  //      disparaissent d'eux-mêmes ; les autres reviennent, non cochés.
  //
  // ⚠️ Rien n'est ajouté au frigo ICI : chaque article y est parti au moment où
  // il a été coché. Le refaire doublerait les stocks.
  const terminer = async () => {
    if (!list || closing) return;
    const restants = list.items.filter((i) => !i.checked).length;
    if (restants > 0) {
      // Ce qui n'est pas coché n'est pas acheté : le dire AVANT, pour que la
      // liste qui repousse demain ne ressemble pas à un bug.
      const ok = await confirm({
        title: 'Terminer les courses ?',
        message: `${restants} article${restants > 1 ? 's ne sont' : " n'est"} pas coché${restants > 1 ? 's' : ''} : ${restants > 1 ? 'ils resteront' : 'il restera'} dans ta liste pour la prochaine fois.`,
        confirmLabel: 'Terminer',
      });
      if (!ok) return;
    }
    setClosing(true);
    try {
      await recordTrip(list);
      await AsyncStorage.removeItem(LIST_KEY);
      await load();
    } finally { setClosing(false); }
  };

  const retirerSortie = async (at: string) => {
    const reste = removeTrip(history, at);
    setHistory(reste);
    await saveHistory(reste);
  };

  // Une seule définition de la feuille, montée par les DEUX rendus (liste pleine
  // et état vide) : l'historique se consulte surtout quand il n'y a plus rien à
  // acheter, c'est-à-dire justement dans la branche vide.
  const feuilleHistorique = (
    <Sheet visible={historyOpen} onClose={() => setHistoryOpen(false)}>
      <ShoppingHistory t={t} trips={history} onRemove={retirerSortie} />
    </Sheet>
  );

  if (!list || list.items.length === 0) {
    // Deux cas distincts : aucun plan (list null) vs tout déjà au frigo (list vide).
    const covered = !!list && list.items.length === 0;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={[s.center, layout.content]}>
          <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
            <Ionicons name={covered ? 'checkmark-done-outline' : 'cart-outline'} size={Icone.vide} color={covered ? t.success : t.textSecondary} />
          </View>
          <Text style={s.emptyT}>{covered ? 'Rien à acheter' : 'Aucune liste'}</Text>
          <Text style={s.emptyS}>
            {covered
              ? 'Ton frigo couvre déjà tout le plan de la semaine. La liste réapparaîtra dès qu\'il te manquera quelque chose.'
              : 'Génère un plan repas et ta liste de courses apparaît ici, triée par rayon.'}
          </Text>

          {/* L'historique se consulte surtout ICI : « rien à acheter » est
              exactement le moment où on se demande ce qu'on a pris la dernière
              fois. Masqué tant qu'il n'y a rien dedans — un bouton qui ouvre du
              vide n'est pas un point d'entrée, c'est une déception. */}
          {history.length > 0 && (
            <>
              <TouchableOpacity style={s.ctrl} onPress={() => setHistoryOpen(true)} activeOpacity={OPACITE_PRESSION}>
                <Ionicons name="time-outline" size={Icone.petite} color={t.textSecondary} />
                <Text style={s.ctrlTxt}>Mes courses passées</Text>
              </TouchableOpacity>
              <Text style={s.emptyNote}>{historySummary(history)}</Text>
            </>
          )}
        </View>
        {feuilleHistorique}
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
        <View ref={sourceRef} style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.sub}>{done ? 'Tout est coché' : `${remaining} restant${remaining > 1 ? 's' : ''} sur ${total}`}</Text>
            <Text style={s.h1}>Courses</Text>
          </View>
          <Text style={s.counter}>{checked}<Text style={s.counterTot}> / {total} cochés</Text></Text>
          <TourButton onPress={rejouerTour} />
        </View>

        {/* La barre n'a plus besoin de conteneur porteur de colonne : elle est dans
            le contentContainer de la liste, qui pose la colonne ET le padding. Le
            piège d'origine — `marginHorizontal` qui s'ajoute À L'EXTÉRIEUR d'un
            `maxWidth`, et la barre qui dépassait des cartes de 40 pt — disparaît
            avec la marge (cf. CLAUDE.md §11). */}
        <View style={s.track}><View style={[s.fill, { width: `${pct}%`, backgroundColor: done ? t.success : t.accent }]} /></View>

        {/* Contrôles */}
        <View ref={controlesRef} style={s.controls}>
          {remaining > 0 && (
            <TouchableOpacity style={s.ctrl} onPress={checkAll} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="checkmark-done-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Tout cocher</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.ctrl, hideChecked && s.ctrlOn]} onPress={() => setHideChecked((v) => !v)} activeOpacity={OPACITE_PRESSION}>
            <Ionicons name={hideChecked ? 'eye-off-outline' : 'eye-outline'} size={Icone.petite} color={hideChecked ? t.onAccent : t.textSecondary} />
            <Text style={[s.ctrlTxt, hideChecked && { color: t.onAccent }]}>Masquer cochés</Text>
          </TouchableOpacity>
          {checked > 0 && (
            <TouchableOpacity style={s.ctrl} onPress={reset} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="refresh-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
          {history.length > 0 && (
            <TouchableOpacity style={s.ctrl} onPress={() => setHistoryOpen(true)} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="time-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Historique</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* UN seul bouton, deux poids. Tant qu'il reste des articles à cocher,
            c'est une sortie possible parmi d'autres (fond discret) ; quand tout
            est coché, c'est LA suite (fond d'accent). Deux boutons — un discret
            en cours de route, un franc à la fin — auraient été deux libellés à
            garder d'accord pour un seul geste. */}
        {checked > 0 && (
          <TouchableOpacity
            style={[s.finir, done && { backgroundColor: t.accent }]}
            onPress={terminer}
            disabled={closing}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
          >
            <Ionicons name="bag-check-outline" size={Icone.petite} color={done ? t.onAccent : t.text} />
            <Text style={[s.finirTxt, done && { color: t.onAccent }]}>
              {closing ? 'Un instant…' : 'Courses terminées'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={s.hint}>Coche un article → il part direct dans ton frigo</Text>
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
          // Le tout premier article de la liste entière (1re ligne du 1er rayon),
          // pas le premier de chaque section.
          const premierDeLaListe = first && section.cat === sections[0]?.cat;
          return (
            <TouchableOpacity
              ref={premierDeLaListe ? articleRef : undefined}
              style={[
                s.row,
                first && { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
                last && { borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card },
                !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
              ]}
              onPress={() => toggle(item)}
              activeOpacity={OPACITE_PRESSION}
            >
              {/* Pastille RONDE et pleine : une case à cocher carrée est un objet de
                  formulaire, or ici on ne remplit pas un formulaire, on fait ses courses. */}
              <View style={[s.dot, { borderColor: item.checked ? t.accent : t.lineStrong, backgroundColor: item.checked ? t.accent : 'transparent' }]}>
                {item.checked && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
              </View>
              <Text style={[s.name, item.checked && { textDecorationLine: 'line-through', color: t.textTertiary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[s.qty, item.checked && { color: t.textQuaternary }]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <CompactTitleBar t={t} title="Courses" opacity={repli.opacity} />
      {feuilleHistorique}
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xxxl },
    emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    emptyT: { color: t.text, ...Type.h2 },
    emptyS: { ...Type.body, color: t.textSecondary, textAlign: 'center', lineHeight: 21 },
    emptyNote: { ...Type.caption, color: t.textQuaternary, textAlign: 'center' },

    // Plus de padding horizontal ici, ni dans `controls`/`hint`/`track` : ces blocs
    // vivent dans le contentContainer de la liste, qui pose déjà les 20 pt.
    header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 19 },
    counter: { ...Type.h2, color: t.text, letterSpacing: -0.6 },
    counterTot: { ...Type.bodySmall, color: t.textTertiary, letterSpacing: 0 },

    track: { height: 5, backgroundColor: t.fill, borderRadius: 3, overflow: 'hidden' },
    fill: { height: 5, borderRadius: 3 },

    controls: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
    ctrl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, backgroundColor: t.fill },
    ctrlOn: { backgroundColor: t.accent },
    ctrlTxt: { ...Type.bodySmall, color: t.text },
    // Pleine largeur, donc `Radius.button` et pas `Radius.pill` : la pilule est
    // faite pour une puce, jamais pour un bouton qui traverse l'écran (§8).
    finir: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.fill, marginTop: Spacing.md,
    },
    finirTxt: { ...Type.bodySmallStrong, color: t.text },
    hint: { ...Type.caption, color: t.textTertiary, lineHeight: 18, paddingTop: Spacing.md },
    // Note de pied présente dans la maquette et absente de l'app : elle dit d'où
    // sortent les quantités, ce qu'aucun autre élément de l'écran n'explique.
    footnote: { ...Type.caption, color: t.textQuaternary, lineHeight: 17, paddingTop: Spacing.xl },

    list: { paddingHorizontal: Spacing.xl, paddingBottom: Fond.barreOnglets, paddingTop: Spacing.xs },
    section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Spacing.xxl, marginBottom: Spacing.sm },
    sectionTxt: { ...Type.overline, color: t.textTertiary },
    sectionCount: { ...Type.caption, color: t.textTertiary },

    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, backgroundColor: t.card },
    dot: { width: 24, height: 24, borderRadius: 12, borderWidth: Trait.controle, alignItems: 'center', justifyContent: 'center' },
    name: { ...Type.body, flex: 1, color: t.text },
    qty: { ...Type.body, color: t.textSecondary },
  });
}
