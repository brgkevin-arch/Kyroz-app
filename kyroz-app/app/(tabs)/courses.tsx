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
import { ActionSheet } from '../../components/ActionSheet';
import { PrimaryButton, Chip, Field } from '../../components/ui';
import { MealPlan, ShoppingItem, ShoppingList } from '../../lib/types';
import { buildShoppingList } from '../../lib/shoppingList';
import { formatQuantity, toBaseUnit } from '../../lib/units';
import { searchFoods } from '../../lib/foods';
import { loadPantry, savePantry, addOrMerge, isStaple } from '../../lib/pantry';
import {
  ShoppingTrip, loadHistory, saveHistory, recordTrip, removeTrip, historySummary,
} from '../../lib/shoppingHistory';
import {
  loadEcartes, saveEcartes, viderEcartes, SortDesRestants,
  ecarter, retablir, appliquerEcartes, nettoyerEcartes, resumeEcartes, ecartesApresCloture,
} from '../../lib/shoppingRemoved';
import {
  loadAjouts, saveAjouts, UNITES_AJOUT, SANS_QUANTITE,
  normaliserNom, trouverArticle, creerAjout, ajouterAjout, retirerAjout,
  basculerAjout, cocherTousAjouts, fusionner, nettoyerAjouts, ajoutsApresCloture,
} from '../../lib/shoppingAjouts';
import { pushPantry } from '../../lib/sync';
import { animerMiseEnPage, Jauge } from '../../components/Mouvement';

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
  // Articles AJOUTÉS à la main (`lib/shoppingAjouts.ts`). Eux aussi vivent HORS de
  // `list`, et pour une raison plus lourde que les écartés : le cache de la liste
  // est effacé à chaque changement de plan, donc une saisie rangée dedans serait
  // PERDUE — et personne ne peut deviner ce que l'utilisateur avait tapé.
  const [ajouts, setAjouts] = useState<ShoppingItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [nom, setNom] = useState('');
  const [qty, setQty] = useState('');
  const [unite, setUnite] = useState('g');
  const [sugFermees, setSugFermees] = useState(false);
  // Ce que la feuille d'ajout a à dire — jamais un dialogue : voir `ajouterArticle`.
  const [note, setNote] = useState<string | null>(null);

  // 🔴 CET ÉCRAN N'A PLUS DE VISITE GUIDÉE (2026-08-25, décision fondateur :
  // « supprime le tuto des courses »). Sa dernière bulle, « D'où sort ta liste »,
  // disait le mécanisme réserve → liste que la bulle de la Réserve dit déjà dans
  // l'autre sens, et que la ligne d'aide sous les boutons écrit en toutes lettres.
  // ➡️ Donc plus de « ? » dans l'en-tête non plus : un bouton de rejeu qui n'ouvre
  // rien est pire que pas de bouton. Le tour est retiré de `TOURS`, donc il ne
  // figure plus dans « Revoir les tutos » — c'est la même source (`lib/tours.ts`).

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
    // Les ajouts se nettoient pour la raison INVERSE : un « Riz » tapé à la main
    // que le plan propose désormais lui-même resterait stocké derrière lui,
    // invisible, jusqu'à ressurgir des semaines plus tard (`nettoyerAjouts`).
    const stockes = await loadAjouts();
    const tenus = nettoyerAjouts(stockes, brut?.items ?? []);
    setAjouts(tenus);
    if (tenus !== stockes) await saveAjouts(tenus);
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
  const persistAjouts = async (next: ShoppingItem[]) => { setAjouts(next); await saveAjouts(next); };

  // ── Écarter un article ───────────────────────────────────────────────────
  //
  // « Je ne veux pas acheter ça. » L'article quitte la liste sans toucher au plan
  // (les repas ne changent pas — le retirer du plan serait un tout autre geste) et
  // sans entrer en réserve : `terminer` n'y range que les articles VISIBLES.
  //
  // On le décoche au passage, pour qu'un article rétabli plus tard ne revienne pas
  // coché d'un achat qui n'a pas eu lieu.
  const ecarterArticle = async (item: ShoppingItem) => {
    // 🔴 UN AJOUT MANUEL NE S'ÉCARTE PAS, IL SE SUPPRIME. Le message ci-dessous
    // promet « tu le retrouveras en tirant la liste vers le bas » — c'est vrai
    // d'un article du plan, que la liste sait refaire, et FAUX d'un article que
    // l'utilisateur a tapé lui-même : rien ne peut le deviner à sa place. Deux
    // portées différentes derrière le même appui long, donc deux phrases.
    if (item.manuel) {
      const oui = await confirm({
        title: `Supprimer ${item.name} ?`,
        message: "Tu l'as ajouté toi-même, donc il ne reviendra pas tout seul.",
        confirmLabel: 'Supprimer',
        destructive: true,
      });
      if (!oui) return;
      await persistAjouts(retirerAjout(ajouts, item.name));
      return;
    }
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
    const willCheck = !item.checked;
    // ⚠️ DEUX STOCKAGES POUR UNE SEULE CASE. Un ajout manuel ne vit pas dans le
    // cache de la liste : l'y écrire ne planterait pas, ça se verrait au prochain
    // chargement — la case serait retombée toute seule.
    if (item.manuel) return persistAjouts(basculerAjout(ajouts, item.name, willCheck));
    if (!list) return;
    await persist({ ...list, items: list.items.map((i) => (i.name === item.name ? { ...i, checked: willCheck } : i)) });
  };

  // ⚠️ `visible()` partout où l'on agit en masse : un article ÉCARTÉ ne doit être
  // ni coché par « Tout cocher », ni décoché par « Réinitialiser », ni inscrit à
  // l'historique — ni rangé en réserve à la clôture.
  const visible = (i: ShoppingItem) => !ecartes.includes(i.name);

  // ⚠️ Les deux moitiés de la liste, sinon « Tout cocher » laisserait les ajouts
  // manuels décochés — et la barre de progression n'atteindrait jamais 100 %,
  // donc « Courses terminées » resterait discret alors que tout est pris.
  // (Un ajout manuel n'est jamais écarté ; `visible` reste appliqué au plan.)
  const cocherTout = async (coche: boolean) => {
    if (list) await persist({ ...list, items: list.items.map((i) => (visible(i) ? { ...i, checked: coche } : i)) });
    await persistAjouts(cocherTousAjouts(ajouts, coche));
  };

  const checkAll = () => cocherTout(true);
  const reset = () => cocherTout(false);
  // Tirer = « refaire la liste à partir de mon plan et de ma réserve du moment ».
  // Les articles écartés reviennent donc, et c'est le SEUL geste qui les ramène
  // tous d'un coup sans passer par le bandeau — c'est aussi ce que la bulle de
  // visite guidée annonce.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await AsyncStorage.removeItem(LIST_KEY);
    await viderEcartes();
    setEcartes([]);
    // 🔴 LES AJOUTS MANUELS SURVIVENT AU GESTE. Tirer veut dire « refais ma liste
    // à partir de mon plan » : ce qui vient du plan se refait, ce qui vient de MOI
    // ne se refait pas — l'effacer ici serait une suppression déguisée en
    // actualisation. Seules leurs cases retombent, comme celles des articles du
    // plan que le recalcul rend décochés.
    // ⚠️ Relu depuis le stockage, pas depuis l'état : ce `useCallback` a une liste
    // de dépendances VIDE, donc `ajouts` y serait figé à sa valeur du montage.
    await saveAjouts(cocherTousAjouts(await loadAjouts(), false));
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
  // ⚠️ Et les AJOUTS MANUELS se soldent à part (`ajoutsApresCloture`) : eux ne se
  // recalculent pas, donc rien ne les ferait partir de la liste — même achetés.
  const terminer = async () => {
    if (closing) return;
    const tous = fusionner(list?.items ?? [], ajouts);
    if (tous.length === 0) return;
    const restants = tous.filter((i) => visible(i) && !i.checked);
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
      // ⚠️ `quantity > 0` : un ajout manuel n'a souvent AUCUNE quantité (« café »).
      // Le ranger quand même y poserait une ligne à 0 g — un chiffre inventé, et un
      // stock inventé fait disparaître des articles de la liste suivante.
      const achetes = tous.filter((i) => visible(i) && i.checked && !isStaple(i.name) && i.quantity > 0);
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
      // `plan_id` sert au seul diagnostic : une sortie qui ne contient que des
      // ajouts manuels n'a pas de plan derrière elle, et le dire est plus juste
      // que de recopier l'identifiant d'un plan qui n'a rien demandé.
      await recordTrip({
        id: list?.id ?? 'sl-manuel',
        plan_id: list?.plan_id ?? 'manuel',
        items: tous.filter(visible),
      });
      await AsyncStorage.removeItem(LIST_KEY);
      // Les ajouts cochés ont été achetés : ils quittent la liste (et viennent
      // d'entrer en réserve à l'étape ①). Les autres suivent le choix ci-dessus.
      await saveAjouts(ajoutsApresCloture(ajouts, sort));
      // ⚠️ Les écartés se rejouent APRÈS le recalcul, et c'est tout le mécanisme :
      // vider le cache fait revenir les non-cochés depuis le plan (les cochés, eux,
      // viennent d'entrer en réserve à l'étape ① et en sont donc déduits). Pour qu'un
      // « retire-les » tienne, il faut que ces noms soient écartés — sinon la liste
      // les ramènerait aussitôt et le choix n'aurait servi à rien.
      // ⚠️ Seuls les articles du PLAN s'écartent : un ajout manuel « retiré » vient
      // d'être supprimé pour de bon, et son nom traînerait ici dans une clé que le
      // prochain `nettoyerEcartes` viderait de toute façon.
      const suivants = ecartesApresCloture(sort, restants.filter((i) => !i.manuel));
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
  // Ce que l'écran montre : le plan, PLUS les ajouts manuels, MOINS les écartés.
  // ⚠️ `fusionner` d'abord : un nom = une ligne, sinon cocher un homonyme cocherait
  // les deux (le nom est la clé de la liste, cf. `keyExtractor`).
  const tous = fusionner(list?.items ?? [], ajouts);
  const visibles = appliquerEcartes(tous, ecartes);
  const nbEcartes = tous.length - visibles.length;

  // ── Ajouter un article à la main ─────────────────────────────────────────
  //
  // 🔴 RIEN NE S'OUVRE PAR-DESSUS CETTE FEUILLE — pas même un dialogue. Une
  // `Modal` présentée sur une `Modal` ne donne RIEN sur iOS (mesuré le
  // 2026-08-14, `feuillesEmpilees.test.ts`), et le web ne le montre pas. Ce qu'il
  // y a à dire se dit donc DANS la feuille, sous le champ (`note`).
  const fermerAjout = () => {
    setShowAdd(false);
    setNom(''); setQty(''); setUnite('g'); setSugFermees(false); setNote(null);
  };

  const ajouterArticle = async () => {
    const propre = normaliserNom(nom);
    if (!propre) return;
    const deja = trouverArticle(tous, propre);
    if (deja) {
      // Il EST là, mais retiré de la liste : le retaper veut dire « finalement,
      // je le veux ». Sans ce cas, l'ajout serait avalé par `fusionner` et il ne
      // se passerait rien du tout — une saisie qui disparaît sans un mot est le
      // pire des retours.
      if (ecartes.includes(deja.name)) {
        const suivants = retablir(ecartes, deja.name);
        setEcartes(suivants);
        await saveEcartes(suivants);
        fermerAjout();
        return;
      }
      setNote(`${deja.name} est déjà dans ta liste.`);
      return;
    }
    // La quantité est FACULTATIVE : on note « café », pas « café 250 g ». Sans
    // elle, l'article s'affiche sans chiffre plutôt qu'avec un « 0 g » faux.
    // ⚠️ La virgule est le séparateur décimal du clavier français ; `parseFloat`
    // ne connaît que le point et lirait « 1,5 » comme 1.
    const q = parseFloat(qty.replace(',', '.'));
    const base = q > 0 ? toBaseUnit(q, unite) : null;
    const article = base ? creerAjout(propre, base.quantity, base.unit) : creerAjout(propre);
    await persistAjouts(ajouterAjout(ajouts, article));
    fermerAjout();
  };

  const feuilleAjout = (
    <ActionSheet visible={showAdd} onClose={fermerAjout}>
      <Text style={s.sheetTitle}>Ajouter un article</Text>
      <Field
        t={t}
        label="Nom"
        value={nom}
        onChangeText={(v) => { setNom(v); setSugFermees(false); setNote(null); }}
        placeholder="Café"
        autoFocus
      />
      {/* Les suggestions viennent du catalogue d'aliments — le MÊME que la
          réserve. Choisir « Blanc de poulet » plutôt que « poulet » n'est pas
          cosmétique : le rayon est déduit du nom, et la liste reconnaît un
          article déjà présent par son nom. */}
      {nom.trim().length >= 2 && !sugFermees && (() => {
        const sug = searchFoods(nom, 5);
        if (sug.length === 0) return null;
        return (
          <View style={s.suggestions}>
            {sug.map((f) => (
              <Presse
                key={f.id} activeOpacity={OPACITE_PRESSION}
                onPress={() => { setNom(f.name_fr); setSugFermees(true); setNote(null); }}
                style={s.suggestion}
              >
                <Text style={s.suggestionTxt} numberOfLines={1}>{f.name_fr}</Text>
              </Presse>
            ))}
          </View>
        );
      })()}
      <Field
        t={t}
        label="Quantité (facultatif)"
        suffix={unite}
        value={qty}
        onChangeText={setQty}
        placeholder="500"
        keyboardType="decimal-pad"
      />
      <View style={s.unitRow}>
        {UNITES_AJOUT.map((u) => <Chip key={u} t={t} label={u} selected={unite === u} onPress={() => setUnite(u)} />)}
      </View>
      {/* Une phrase d'aide est une AFFIRMATION SUR LE CODE : sans quantité,
          `terminer` n'a rien à ranger en réserve, et il ne range rien. */}
      <Text style={s.sheetNote}>
        {note ?? "Sans quantité, l'article ne rejoindra pas ta réserve une fois acheté."}
      </Text>
      <PrimaryButton t={t} label="Ajouter" onPress={ajouterArticle} disabled={!nom.trim()} />
      <Presse onPress={fermerAjout} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></Presse>
    </ActionSheet>
  );

  const feuilleHistorique = (
    <Sheet visible={historyOpen} onClose={() => setHistoryOpen(false)}>
      <ShoppingHistory t={t} trips={history} onRemove={retirerSortie} />
    </Sheet>
  );

  // ⚠️ La feuille d'ajout suit la MÊME règle que celle de l'historique, et pour
  // la même raison : montée ici, elle garde son rang parmi les enfants quel que
  // soit l'état de l'écran, donc sa `Modal` n'est jamais détruite puis recréée au
  // moment précis où la liste se vide.
  const ecran = (corps: React.ReactNode) => (
    <SafeAreaView style={s.safe} edges={['top']}>
      {corps}
      {feuilleHistorique}
      {feuilleAjout}
    </SafeAreaView>
  );

  if (visibles.length === 0) {
    // TROIS cas, et le troisième est nouveau : aucun plan · tout est déjà en
    // réserve · tout a été RETIRÉ à la main. Les confondre ferait dire à l'écran
    // « ta réserve couvre déjà tout le plan » à quelqu'un qui vient simplement de
    // vider sa liste — un mensonge, et sans issue puisque l'état vide n'a pas de
    // « tirer pour rafraîchir » (ce n'est pas une liste défilante).
    const toutEcarte = nbEcartes > 0;
    const covered = !!list && tous.length === 0;
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

        {/* ⚠️ Le « + » de l'en-tête n'existe pas ici : cette branche n'a pas
            d'en-tête. Sans ce bouton, « Aucune liste » serait un cul-de-sac pour
            qui veut juste noter du café avant d'avoir un plan de repas — et
            l'ajout manuel, lui, ne demande aucun plan. */}
        <Presse style={s.ctrl} onPress={() => setShowAdd(true)} activeOpacity={OPACITE_PRESSION}>
          <Ionicons name="add" size={Icone.petite} color={t.textSecondary} />
          <Text style={s.ctrlTxt}>Ajouter un article</Text>
        </Presse>

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
        <View style={s.header}>
          {/* 🔴 PLUS DE COMPTEUR AU-DESSUS DU TITRE (2026-08-25, décision fondateur).
              Celui-ci disait « 36 restants sur 37 » — soit EXACTEMENT ce que le
              « 1 / 37 cochés » de droite dit déjà, à l'envers. Deux fois le même
              fait, dont une au-dessus du nom de l'écran. */}
          <Text style={[s.h1, { flex: 1 }]} numberOfLines={1}>Courses</Text>
          <Text style={s.counter}>{checked}<Text style={s.counterTot}> / {total} cochés</Text></Text>
          {/* Le « + » est à la MÊME place que celui de la Réserve, et il a la même
              tête : deux onglets voisins où l'on ajoute une ligne à un inventaire
              ne peuvent pas demander deux gestes différents. */}
          <Presse
            style={s.addBtn}
            onPress={() => setShowAdd(true)}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un article"
          >
            <Ionicons name="add" size={Icone.action} color={t.onAccent} />
          </Presse>
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
        // ⚠️ La note de pied AFFIRME d'où sortent les quantités. Dès qu'un article
        // a été tapé à la main, elle ne vaut plus pour toute la liste — et une
        // phrase d'aide fausse est pire que pas de phrase du tout.
        ListFooterComponent={(
          <Text style={s.footnote}>
            {visibles.some((i) => i.manuel)
              ? 'Quantités calculées pour tes repas de la semaine — sauf ce que tu as ajouté toi-même.'
              : 'Quantités calculées pour tes repas de la semaine.'}
          </Text>
        )}
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
              {/* Un ajout manuel n'a souvent pas de quantité : `formatQuantity`
                  rendrait « 0 g », un chiffre faux là où un blanc dit la vérité. */}
              {item.quantity > SANS_QUANTITE && (
                <Text style={[s.qty, item.checked && { color: t.textQuaternary }]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
              )}
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
    // Même pastille que celle de la Réserve — un « + » qui change de forme d'un
    // onglet à l'autre se relit comme un autre bouton.
    addBtn: { width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
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

    // Feuille d'ajout — mêmes valeurs que celle de la Réserve (`reserve.tsx`).
    sheetTitle: { color: t.text, ...Type.h2 },
    sheetNote: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },
    suggestions: { borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.sm, overflow: 'hidden' },
    suggestion: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: Trait.fin, borderBottomColor: t.line },
    suggestionTxt: { ...Type.bodySmall, color: t.text },
    unitRow: { flexDirection: 'row', gap: Spacing.sm },
    // ⚠️ 44 pt PLEINS, pas `paddingVertical: Spacing.sm` : le même bouton copié de
    // `reserve.tsx` mesure ~36 pt, sous la cible tactile minimale (§8).
    cancel: { alignItems: 'center', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN },
    cancelTxt: { ...Type.bodyStrong, color: t.textSecondary },

    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, backgroundColor: t.card },
    dot: { width: 24, height: 24, borderRadius: 12, borderWidth: Trait.controle, alignItems: 'center', justifyContent: 'center' },
    name: { ...Type.body, flex: 1, color: t.text },
    qty: { ...Type.body, color: t.textSecondary },
  });
}
