import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import { Presse } from '../../components/Presse';
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
import { loadPantry, savePantry, addOrMerge, isStaple } from '../../lib/pantry';
import {
  ShoppingTrip, loadHistory, saveHistory, recordTrip, removeTrip, historySummary,
} from '../../lib/shoppingHistory';
import {
  loadEcartes, saveEcartes, viderEcartes, SortDesRestants,
  ecarter, appliquerEcartes, nettoyerEcartes, resumeEcartes, ecartesApresCloture,
} from '../../lib/shoppingRemoved';
import { pushPantry } from '../../lib/sync';
import { useTourTarget, useScreenTour, TourButton } from '../../components/GuidedTour';
import { animerMiseEnPage, Jauge } from '../../components/Mouvement';
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
  const { confirm, choose } = useDialog();
  const [list, setList] = useState<ShoppingList | null>(null);
  // Articles écartés (`lib/shoppingRemoved.ts`). ⚠️ Ils vivent HORS de `list` :
  // le cache de la liste est effacé par `plan.tsx` à chaque `persistPlan`, donc
  // une suppression rangée dedans se déferait toute seule.
  const [ecartes, setEcartes] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const [history, setHistory] = useState<ShoppingTrip[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Cibles de la visite guidée. La ref d'article se pose sur la toute première
  // ligne de la première section — `renderItem` étant une callback, le hook vit
  // ici (même contrainte que l'onglet Recettes).
  const sourceRef = useTourTarget('courses-source');
  // ⚠️ `courses-controles` et `courses-article` sont partis avec leurs bulles
  // (coupe des tutos, 2026-08-25) : la seconde répétait mot pour mot la ligne d'aide
  // affichée sous les boutons. Une cible sans étape se relit comme une bulle perdue.
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
    const brut = await lireListe();
    setList(brut);
    // Les écartés se NETTOIENT à chaque chargement : on ne garde que ceux que la
    // liste propose encore. Sans ça la clé grossit indéfiniment, et un nom écarté
    // il y a trois semaines ré-écarterait en silence l'article qu'une nouvelle
    // recette ramène.
    const gardes = nettoyerEcartes(await loadEcartes(), brut?.items ?? []);
    setEcartes(gardes);
    await saveEcartes(gardes);
  };

  /** La liste BRUTE : cache s'il existe, sinon reconstruite depuis le plan. */
  const lireListe = async (): Promise<ShoppingList | null> => {
    const saved = await AsyncStorage.getItem(LIST_KEY);
    if (saved) return JSON.parse(saved);
    const planRaw = await AsyncStorage.getItem(PLAN_KEY);
    if (!planRaw) return null;
    const plan: MealPlan = JSON.parse(planRaw);
    // ── LA RÉSERVE EST TOUJOURS SOUSTRAITE (2026-08-24) ──────────────────────
    //
    // L'interrupteur « Tenir compte du frigo » a été RETIRÉ (décision fondateur).
    // Ce qui rendait la soustraction risquée n'était pas la soustraction : c'était
    // une réserve qui se créditait à chaque case cochée en magasin et ne se débitait
    // qu'à la cuisine — elle ne pouvait donc que sur-estimer, et un article
    // sur-estimé DISPARAÎT de la liste. Depuis, elle ne se remplit qu'à la CLÔTURE
    // d'une sortie (`terminer`), c'est-à-dire une fois les courses réellement faites.
    const pantry = await loadPantry();
    const l = buildShoppingList(plan, pantry);
    // Ne pas mettre en cache une liste vide (tout couvert) : sinon l'onglet
    // resterait bloqué sur « rien à acheter » même après avoir vidé la réserve.
    // Sans cache, load() la reconstruit à chaque focus et les articles
    // réapparaissent dès qu'elle se dépeuple.
    if (l.items.length > 0) await AsyncStorage.setItem(LIST_KEY, JSON.stringify(l));
    return l;
  };

  const persist = async (l: ShoppingList) => { setList(l); await AsyncStorage.setItem(LIST_KEY, JSON.stringify(l)); };

  // ── Écarter un article ───────────────────────────────────────────────────
  //
  // « Je ne veux pas acheter ça. » L'article quitte la liste sans toucher au plan
  // (les repas ne changent pas — le retirer du plan serait un tout autre geste) et
  // sans entrer en réserve : `terminer` n'y range que les articles VISIBLES.
  //
  // On le décoche au passage, pour qu'un article rétabli plus tard ne revienne pas
  // coché d'un achat qui n'a pas eu lieu.
  const ecarterArticle = async (item: ShoppingItem) => {
    const ok = await confirm({
      title: `Retirer ${item.name} ?`,
      message: 'Il quitte ta liste de courses. Ton plan de repas ne change pas — tu le retrouveras en tirant la liste vers le bas.',
      confirmLabel: 'Retirer',
      destructive: true,
    });
    if (!ok) return;
    if (item.checked) await toggle(item);
    const suivants = ecarter(ecartes, item.name);
    setEcartes(suivants);
    await saveEcartes(suivants);
  };

  const retablirTout = async () => {
    setEcartes([]);
    await viderEcartes();
  };

  // ── COCHER NE REMPLIT PLUS LA RÉSERVE (2026-08-24, décision fondateur) ─────
  //
  // Cocher veut dire « je l'ai pris », pas « c'est rangé ». Ce qui entre en réserve,
  // c'est **ce qui est coché AU MOMENT DE LA CLÔTURE** (`terminer`) — une seule
  // écriture, à un moment où la sortie est finie.
  //
  // ⚠️ Ce que ça corrige, et c'est structurel : une case cochée est un geste qu'on
  // fait dans les rayons, décoché dix fois, repris plus tard. Chaque bascule
  // écrivait le stock, donc la réserve suivait les hésitations du magasin — et une
  // réserve qui gonfle fait DISPARAÎTRE des articles de la liste suivante.
  const toggle = async (item: ShoppingItem) => {
    if (!list) return;
    const willCheck = !item.checked;
    await persist({ ...list, items: list.items.map((i) => (i.name === item.name ? { ...i, checked: willCheck } : i)) });
  };

  // ⚠️ `visible()` partout où l'on agit en masse : un article ÉCARTÉ ne doit être
  // ni coché par « Tout cocher », ni décoché par « Réinitialiser », ni inscrit à
  // l'historique — ni rangé en réserve à la clôture.
  const visible = (i: ShoppingItem) => !ecartes.includes(i.name);

  const checkAll = async () => {
    if (!list) return;
    await persist({ ...list, items: list.items.map((i) => (visible(i) ? { ...i, checked: true } : i)) });
  };

  const reset = async () => {
    if (!list) return;
    await persist({ ...list, items: list.items.map((i) => (visible(i) ? { ...i, checked: false } : i)) });
  };
  // Tirer = « refaire la liste à partir de mon plan et de ma réserve du moment ».
  // Les articles écartés reviennent donc, et c'est le SEUL geste qui les ramène
  // tous d'un coup sans passer par le bandeau — c'est aussi ce que la bulle de
  // visite guidée annonce.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await AsyncStorage.removeItem(LIST_KEY);
    await viderEcartes();
    setEcartes([]);
    await load();
    setRefreshing(false);
  }, []);

  // ── « Courses terminées » : on CLÔT la sortie ────────────────────────────
  //
  // Sans ce geste, une liste entièrement cochée restait à l'écran, barrée, pour
  // toujours : le seul moyen de la solder était de tirer pour rafraîchir — donc
  // de connaître un geste que rien n'annonce. Terminer fait trois choses :
  //   1. **ce qui est coché entre en RÉSERVE** — c'est le seul chemin depuis le
  //      2026-08-24 (décision fondateur), et le seul moment où « acheté » est vrai ;
  //   2. la liste s'inscrit à l'historique (ce qui a été pris, ce qui ne l'a pas) ;
  //   3. le cache est vidé, donc `load()` la RECALCULE depuis le plan moins la
  //      réserve. Les articles rangés à l'étape 1 en sont donc déduits et
  //      disparaissent ; les autres reviennent, non cochés.
  //
  // ⚠️ L'ORDRE COMPTE : ranger AVANT de vider le cache. L'inverse recalculerait la
  // liste sur une réserve qui n'a pas encore reçu les achats — elle reviendrait
  // entière, et le rangement d'après la ferait disparaître une seconde plus tard.
  //
  // ⚠️ Les condiments (sel, huile, épices) n'entrent jamais en réserve : ils sont
  // supposés toujours présents, donc ils ne sont ni comptés ni déduits nulle part.
  const terminer = async () => {
    if (!list || closing) return;
    const restants = list.items.filter((i) => visible(i) && !i.checked);
    // Ce qui n'est pas coché n'est pas acheté. On ne se contente plus de le DIRE
    // avant de les garder d'office : les deux issues sont légitimes et
    // l'utilisateur seul sait laquelle est la sienne — il a renoncé à ces
    // articles, ou il les achètera demain.
    let sort: SortDesRestants = 'garder';
    if (restants.length > 0) {
      const n = restants.length;
      const choix = await choose<SortDesRestants>({
        title: 'Terminer les courses ?',
        message: `${n} article${n > 1 ? 's ne sont' : " n'est"} pas coché${n > 1 ? 's' : ''}. Qu'est-ce qu'on en fait ?`,
        options: [
          { label: n > 1 ? 'Les garder pour la prochaine fois' : 'Le garder pour la prochaine fois', value: 'garder' },
          { label: n > 1 ? 'Les retirer de ma liste' : 'Le retirer de ma liste', value: 'retirer', destructive: true },
        ],
      });
      if (choix === null) return;   // fermé sans choisir : on ne clôt rien
      sort = choix;
    }
    setClosing(true);
    try {
      // ① Les achats rejoignent la réserve.
      const achetes = list.items.filter((i) => visible(i) && i.checked && !isStaple(i.name));
      if (achetes.length) {
        let pantry = await loadPantry();
        for (const it of achetes) {
          pantry = addOrMerge(pantry, { name: it.name, quantity: it.quantity, unit: it.unit, category: it.category });
        }
        await savePantry(pantry);
        pushPantry(pantry);
      }
      // ② L'historique n'enregistre que ce que la liste DEMANDAIT vraiment : un
      // article écarté en cours de route n'a pas fait partie de cette sortie.
      await recordTrip({ ...list, items: list.items.filter(visible) });
      await AsyncStorage.removeItem(LIST_KEY);
      // ⚠️ Les écartés se rejouent APRÈS le recalcul, et c'est tout le mécanisme :
      // vider le cache fait revenir les non-cochés depuis le plan (les cochés, eux,
      // viennent d'entrer en réserve à l'étape ① et en sont donc déduits). Pour qu'un
      // « retire-les » tienne, il faut que ces noms soient écartés — sinon la liste
      // les ramènerait aussitôt et le choix n'aurait servi à rien.
      const suivants = ecartesApresCloture(sort, restants);
      await saveEcartes(suivants);
      setEcartes(suivants);
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
  //
  // 🔴 ET CETTE PHRASE ÉTAIT FAUSSE — corrigé le 2026-08-23 (E45). Une seule
  // *définition* ne fait pas une seule *instance*. Les deux rendus la posaient à
  // des positions différentes sous le même `SafeAreaView` : dernier des DEUX
  // enfants dans l'état vide, dernier des TROIS dans la liste (`SectionList` +
  // `CompactTitleBar` la précèdent). React réconcilie des enfants sans `key` PAR
  // INDEX : à chaque bascule entre les deux états, la `Sheet` de l'index 2
  // disparaissait et une neuve naissait à l'index 1. Donc sa `Modal` — la vraie,
  // celle d'UIKit — était DÉTRUITE puis RECRÉÉE, au moment précis où « Courses
  // terminées » vide la liste. Et ce geste-là passe par une modale de choix qui
  // est encore en train d'être fermée : deux transitions modales dans la même
  // frame, ce qu'iOS ne garantit pas. C'était le seul écran de l'app dans ce cas,
  // et c'est celui où le gel a été signalé deux fois.
  //
  // ➡️ La feuille n'est donc plus rendue QUE dans cette enveloppe, une seule fois
  // dans le fichier, forcément à la même place. L'invariant devient structurel
  // au lieu d'être une intention écrite en commentaire.
  // ⚠️ `ecran` est une FONCTION APPELÉE, jamais un composant (`<Ecran corps={…} />`) :
  // un composant défini dans le corps du rendu change d'identité à chaque rendu,
  // donc React remonterait tout l'écran à chaque frappe — l'exact défaut que ce
  // correctif supprime, réintroduit par la porte d'à côté.
  const feuilleHistorique = (
    <Sheet visible={historyOpen} onClose={() => setHistoryOpen(false)}>
      <ShoppingHistory t={t} trips={history} onRemove={retirerSortie} />
    </Sheet>
  );

  const ecran = (corps: React.ReactNode) => (
    <SafeAreaView style={s.safe} edges={['top']}>
      {corps}
      {feuilleHistorique}
    </SafeAreaView>
  );

  // Ce que l'écran montre : la liste MOINS les articles écartés.
  const visibles = list ? appliquerEcartes(list.items, ecartes) : [];
  const nbEcartes = list ? list.items.length - visibles.length : 0;

  if (!list || visibles.length === 0) {
    // TROIS cas, et le troisième est nouveau : aucun plan · tout est déjà en
    // réserve · tout a été RETIRÉ à la main. Les confondre ferait dire à l'écran
    // « ta réserve couvre déjà tout le plan » à quelqu'un qui vient simplement de
    // vider sa liste — un mensonge, et sans issue puisque l'état vide n'a pas de
    // « tirer pour rafraîchir » (ce n'est pas une liste défilante).
    const toutEcarte = !!list && visibles.length === 0 && nbEcartes > 0;
    const covered = !!list && list.items.length === 0;
    return ecran(
      <View style={[s.center, layout.content]}>
        <View style={[s.emptyIcon, { backgroundColor: t.fill }]}>
          <Ionicons
            name={toutEcarte ? 'file-tray-outline' : covered ? 'checkmark-done-outline' : 'cart-outline'}
            size={Icone.vide}
            color={toutEcarte ? t.textSecondary : covered ? t.success : t.textSecondary}
          />
        </View>
        <Text style={s.emptyT}>{toutEcarte ? 'Liste vidée' : covered ? 'Rien à acheter' : 'Aucune liste'}</Text>
        <Text style={s.emptyS}>
          {toutEcarte
            ? `Tu as retiré ${nbEcartes > 1 ? 'tous les articles' : "le dernier article"} de ta liste. Ton plan de repas, lui, n'a pas changé.`
            : covered
            ? 'Ta réserve couvre déjà tout le plan de la semaine. La liste réapparaîtra dès qu\'il te manquera quelque chose.'
            : 'Génère un plan repas et ta liste de courses apparaît ici, triée par rayon.'}
        </Text>

        {/* La seule sortie de cet état : l'écran vide n'est pas défilant, donc
            « tirer pour rafraîchir » n'y existe pas. Sans ce bouton, retirer le
            dernier article serait un cul-de-sac jusqu'au prochain plan. */}
        {toutEcarte && (
          <Presse style={s.ctrl} onPress={retablirTout} activeOpacity={OPACITE_PRESSION}>
            <Ionicons name="arrow-undo-outline" size={Icone.petite} color={t.textSecondary} />
            <Text style={s.ctrlTxt}>Rétablir ma liste</Text>
          </Presse>
        )}

        {/* L'historique se consulte surtout ICI : « rien à acheter » est
            exactement le moment où on se demande ce qu'on a pris la dernière
            fois. Masqué tant qu'il n'y a rien dedans — un bouton qui ouvre du
            vide n'est pas un point d'entrée, c'est une déception. */}
        {history.length > 0 && (
          <>
            <Presse style={s.ctrl} onPress={() => setHistoryOpen(true)} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="time-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Mes courses passées</Text>
            </Presse>
            <Text style={s.emptyNote}>{historySummary(history)}</Text>
          </>
        )}
      </View>
    );
  }

  // ⚠️ Tous les compteurs portent sur les VISIBLES, jamais sur `list.items` : un
  // article retiré ne doit ni peser dans le « X / Y cochés », ni empêcher la
  // barre d'atteindre 100 %. Sinon la progression n'arriverait jamais au bout et
  // « Courses terminées » resterait discret alors que tout est fait.
  const checked = visibles.filter((i) => i.checked).length;
  const total = visibles.length;
  const remaining = total - checked;
  const done = remaining === 0;
  const pct = total ? (checked / total) * 100 : 0;

  // Tri : non cochés d'abord, cochés en bas. Option « masquer cochés ».
  const sections: CoursesSection[] = CATEGORY_ORDER
    .map((cat) => {
      let data = visibles.filter((i) => i.category === cat);
      if (hideChecked) data = data.filter((i) => !i.checked);
      data = [...data].sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
      const left = visibles.filter((i) => i.category === cat && !i.checked).length;
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
          {/* 🔴 PLUS DE COMPTEUR AU-DESSUS DU TITRE (2026-08-25, décision fondateur).
              Celui-ci disait « 36 restants sur 37 » — soit EXACTEMENT ce que le
              « 1 / 37 cochés » de droite dit déjà, à l'envers. Deux fois le même
              fait, dont une au-dessus du nom de l'écran. */}
          <Text style={[s.h1, { flex: 1 }]}>Courses</Text>
          <Text style={s.counter}>{checked}<Text style={s.counterTot}> / {total} cochés</Text></Text>
          <TourButton onPress={rejouerTour} />
        </View>

        {/* La barre n'a plus besoin de conteneur porteur de colonne : elle est dans
            le contentContainer de la liste, qui pose la colonne ET le padding. Le
            piège d'origine — `marginHorizontal` qui s'ajoute À L'EXTÉRIEUR d'un
            `maxWidth`, et la barre qui dépassait des cartes de 40 pt — disparaît
            avec la marge (cf. CLAUDE.md §11). */}
        {/* La jauge rattrapait le doigt d'un saut. « Tout cocher » la faisait
            passer de 0 à 100 % en une frame — le seul geste de l'écran qui dise
            « ça avance » n'avait aucune durée pour le dire. */}
        <Jauge style={s.track} remplissage={s.fill} pct={pct} couleur={done ? t.success : t.accent} />

        {/* Contrôles */}
        <View style={s.controls}>
          {remaining > 0 && (
            <Presse style={s.ctrl} onPress={checkAll} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="checkmark-done-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Tout cocher</Text>
            </Presse>
          )}
          <Presse style={[s.ctrl, hideChecked && s.ctrlOn]} onPress={() => { animerMiseEnPage(); setHideChecked((v) => !v); }} activeOpacity={OPACITE_PRESSION}>
            <Ionicons name={hideChecked ? 'eye-off-outline' : 'eye-outline'} size={Icone.petite} color={hideChecked ? t.onAccent : t.textSecondary} />
            <Text style={[s.ctrlTxt, hideChecked && { color: t.onAccent }]}>Masquer cochés</Text>
          </Presse>
          {checked > 0 && (
            <Presse style={s.ctrl} onPress={reset} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="refresh-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Réinitialiser</Text>
            </Presse>
          )}
          {history.length > 0 && (
            <Presse style={s.ctrl} onPress={() => setHistoryOpen(true)} activeOpacity={OPACITE_PRESSION}>
              <Ionicons name="time-outline" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.ctrlTxt}>Historique</Text>
            </Presse>
          )}
        </View>

        {/* UN seul bouton, deux poids. Tant qu'il reste des articles à cocher,
            c'est une sortie possible parmi d'autres (fond discret) ; quand tout
            est coché, c'est LA suite (fond d'accent). Deux boutons — un discret
            en cours de route, un franc à la fin — auraient été deux libellés à
            garder d'accord pour un seul geste. */}
        {checked > 0 && (
          <Presse
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
          </Presse>
        )}

        {/* Ce qui a été retiré doit rester VISIBLE quelque part, sinon un article
            disparu est indistinguable d'un bug — et le geste pour le ramener
            (tirer vers le bas) n'est écrit nulle part sur cet écran. */}
        {nbEcartes > 0 && (
          <View style={s.retires}>
            <Text style={s.retiresTxt}>{resumeEcartes(nbEcartes)}</Text>
            <Presse onPress={retablirTout} hitSlop={8} accessibilityRole="button">
              <Text style={s.retiresLien}>Rétablir</Text>
            </Presse>
          </View>
        )}

        {/* 🔴 UNE PHRASE D'AIDE EST UNE AFFIRMATION SUR LE CODE. Celle-ci a déjà été
            fausse deux fois — « il part direct dans ton frigo » quand le cochage a
            cessé de remplir le stock, puis quand ce suivi est devenu optionnel. Elle
            décrit désormais les DEUX moments du geste, parce que c'est ce que le code
            fait : cocher marque, terminer range. */}
        <Text style={s.hint}>
          Coche ce que tu prends. « Courses terminées » range le tout dans ta réserve.
          Appui long → tu retires un article de la liste.
        </Text>
    </View>
  );

  return ecran(
    <>
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
            <Presse
              style={[
                s.row,
                first && { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
                last && { borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card },
                !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
              ]}
              onPress={() => toggle(item)}
              // Le geste le plus RÉPÉTÉ de l'app : on coche une trentaine
              // d'articles d'affilée, en magasin, souvent sans regarder l'écran.
              // D'où `choix` et non `validation` : `selectionAsync` est le tic
              // léger du sélecteur iOS, celui qu'on peut sentir trente fois de
              // suite. Un retour de succès à chaque ligne serait épuisant — c'est
              // la même raison qui interdit un retour par défaut sur `Presse`.
              retour="choix"
              // ⚠️ `onLongPress`, PAS un balayage : un glissement passe par le
              // système de responder et se vérifie au simulateur uniquement (§5,
              // « un GESTE ne se vérifie pas en web »). L'appui long, lui, n'est
              // qu'un délai posé sur le press — il marche des deux côtés et se
              // teste ici. Il n'est pas découvrable pour autant : d'où la note
              // sous les contrôles ET une bulle dans la visite guidée.
              onLongPress={() => ecarterArticle(item)}
              delayLongPress={400}
              activeOpacity={OPACITE_PRESSION}
            >
              {/* Pastille RONDE et pleine : une case à cocher carrée est un objet de
                  formulaire, or ici on ne remplit pas un formulaire, on fait ses courses. */}
              <View style={[s.dot, { borderColor: item.checked ? t.accent : t.lineStrong, backgroundColor: item.checked ? t.accent : 'transparent' }]}>
                {item.checked && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
              </View>
              <Text style={[s.name, item.checked && { textDecorationLine: 'line-through', color: t.textTertiary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[s.qty, item.checked && { color: t.textQuaternary }]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
            </Presse>
          );
        }}
      />

      <CompactTitleBar t={t} title="Courses" opacity={repli.opacity} />
    </>
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
    retires: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingTop: Spacing.md },
    retiresTxt: { ...Type.caption, color: t.textTertiary, flex: 1 },
    retiresLien: { ...Type.captionStrong, color: t.accent, minHeight: CIBLE_TACTILE_MIN, textAlignVertical: 'center', lineHeight: CIBLE_TACTILE_MIN },
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
