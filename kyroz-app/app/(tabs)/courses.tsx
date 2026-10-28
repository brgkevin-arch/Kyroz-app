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
import { LigneGlissable } from '../../components/LigneGlissable';
import { PrimaryButton, Chip, Field } from '../../components/ui';
import { MealPlan, ShoppingItem, ShoppingList } from '../../lib/types';
import { buildShoppingList } from '../../lib/shoppingList';
import { repasACompter, mentionDepart } from '../../lib/coursesDepuis';
import { dateEnLettres, repasDepuisLeDebut } from '../../lib/debutPlan';
import { assurerLaSuivante } from '../../lib/planSuivant';
import { premierJour } from '../../lib/semaineSuivante';
import { sousLeSeuil } from '../../lib/seuilAchat';
import { lireDebutSuivi } from '../../lib/repasAuto';
import { activeSlots } from '../../lib/mealSlots';
import { useProfile } from '../../hooks/useProfile';
import { formatQuantity, toBaseUnit } from '../../lib/units';
import { searchFoods } from '../../lib/foods';
import { loadPantry, savePantry, addOrMerge, isStaple, nomAffiche } from '../../lib/pantry';
import { achatALaPiece, quantiteRangee } from '../../lib/formatsVendus';
import { clotureAvecTicket, lireTicket, rapprocher, type Rangement } from '../../lib/ticketCaisse';
import { lecteurDisponible, lireTicketDepuis, type SourceTicket } from '../../lib/lecteurTicket';
import {
  ShoppingTrip, loadHistory, saveHistory, recordTrip, removeTrip, historySummary, newestFirst,
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
import { articlesDeLaSuivante, cochesPourLaSemaine, type CochesDeSemaine } from '../../lib/listesSemaines';
import { animerMiseEnPage, Jauge } from '../../components/Mouvement';

const PLAN_KEY = '@kyroz:plan';
const LIST_KEY = '@kyroz:shopping';
// Les cases cochées de la liste d'après, rattachées à SA semaine (`lib/listesSemaines.ts`).
const SUIVANTE_KEY = '@kyroz:shopping:suivante';

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
  const { profile } = useProfile();
  // Ce que la liste couvre, dit à l'écran (vide quand elle couvre tout le plan).
  // Ce que la liste couvre, dit à l'écran. Posé là où le plan est LU (`load`), parce que
  // cet écran ne garde pas le plan en état — il le relit à chaque venue sur l'onglet.
  const [semaine, setSemaine] = useState('');
  // La liste de la semaine d'après (une fois les courses de celle-ci closes), et ce qu'on
  // regarde : la page des LISTES (la page principale, décision fondateur du 2026-10-28) ou
  // une liste ouverte en grand depuis son encadré.
  const [suivante, setSuivante] = useState<ShoppingList | null>(null);
  const [vue, setVue] = useState<'listes' | 'courante' | 'suivante'>('listes');
  // Les courses de la semaine en cours sont-elles validées (« Courses terminées ») ?
  const [validee, setValidee] = useState(false);
  const { choose } = useDialog();
  const [list, setList] = useState<ShoppingList | null>(null);
  // Articles écartés (`lib/shoppingRemoved.ts`). ⚠️ Ils vivent HORS de `list` :
  // le cache de la liste est effacé par `plan.tsx` à chaque `persistPlan`, donc
  // une suppression rangée dedans se déferait toute seule.
  const [ecartes, setEcartes] = useState<string[]>([]);
  // Glisser vers la gauche pour retirer (2026-10-23, le geste de la Réserve) : une seule
  // ligne ouverte à la fois, et le défilement coupé le temps d'un glissement.
  const [ligneOuverte, setLigneOuverte] = useState<string | null>(null);
  const [glisseEnCours, setGlisseEnCours] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const [history, setHistory] = useState<ShoppingTrip[]>([]);
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

  // ⚠️ `profile` en dépendance : la semaine suivante se prépare avec le profil du moment
  // (`assurerLaSuivante`), jamais avec celui du premier rendu.
  useFocusEffect(useCallback(() => { load(); }, [profile]));

  const load = async () => {
    setHistory(await loadHistory());
    const { courante: brut, suivante: apres, validee } = await lireListes();
    setList(brut);
    setSuivante(apres);
    setValidee(validee);
    // PAR DÉFAUT (2026-10-28, décision fondateur) : la liste de la semaine, tant que ses courses
    // ne sont pas validées ; ensuite, la page des listes. Une liste d'après déjà ouverte reste
    // ouverte tant qu'il y a quelque chose dessus.
    const ouvrirLaSemaine = !validee && ((brut?.items.length ?? 0) > 0 || (await loadAjouts()).length > 0);
    setVue((v) => (ouvrirLaSemaine ? 'courante' : v === 'suivante' && apres?.items.length ? 'suivante' : 'listes'));
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

  /**
   * Les deux listes : celle de la semaine EN COURS (cache s'il existe, sinon reconstruite
   * depuis le plan) et, une fois ses courses closes, celle de la semaine d'APRÈS — toujours
   * recalculée, ses cases cochées gardées à part (`SUIVANTE_KEY`).
   */
  const lireListes = async (): Promise<{ courante: ShoppingList | null; suivante: ShoppingList | null; validee: boolean }> => {
    const saved = await AsyncStorage.getItem(LIST_KEY);
    let cache: ShoppingList | null = saved ? JSON.parse(saved) : null;
    // Une liste rangée avant le 2026-10-28 mêlait les deux semaines : on la refait.
    if (cache?.pour_cette_semaine) { await AsyncStorage.removeItem(LIST_KEY); cache = null; }
    const planRaw = await AsyncStorage.getItem(PLAN_KEY);
    if (!planRaw) { setSemaine(''); return { courante: cache, suivante: null, validee: false }; }
    const plan: MealPlan = JSON.parse(planRaw);
    // Après des « Courses terminées » cette semaine, seuls comptent les repas qu'il reste
    // à cuisiner : un repas cuisiné a déjà été retiré de la réserve, le compter aussi dans
    // le besoin le faisait racheter (F9, décision fondateur du 2026-10-02). Avant les
    // courses, la règle du 2026-09-17 tient : la liste part du jour de génération.
    // E78 (2026-10-19) : rien d'avant le début choisi à l'inscription — ni les repas
    // déjà passés quand on a dit « Ce soir », ni les jours d'avant un début à venir.
    const debut = await lireDebutSuivi();
    const servi = { ...plan, meals: repasDepuisLeDebut(plan, profile?.plan_weekdays, debut, activeSlots(profile)) };
    const cloture = newestFirst(await loadHistory())[0]?.at;
    const perimetre = repasACompter(servi, profile?.plan_weekdays, cloture);
    // La SEMAINE SUIVANTE (2026-10-21, `lib/semaineSuivante.ts`) : préparée dès que les courses
    // de la semaine en cours sont closes, remise d'accord avec le profil (une pesée) à chaque
    // lecture.
    const suivante = profile ? await assurerLaSuivante(profile, plan, cloture) : null;
    const debutSuivante = suivante ? premierJour(suivante.plan, profile?.plan_weekdays) : null;
    // La semaine que la liste couvre, sous le titre. Après des courses terminées, la liste ne
    // compte que les repas qu'il reste à cuisiner (F9) et ne le dit plus (2026-10-22, « l'app
    // tourne en silence ») ; avant, une liste qui ne couvre pas toute la semaine le DIT.
    const debutPlan = premierJour(plan, profile?.plan_weekdays);
    const mention = perimetre.apresCourses ? '' : mentionDepart(plan, profile?.plan_weekdays);
    setSemaine([debutPlan ? `Semaine du ${dateEnLettres(debutPlan)}` : '', mention.replace(/\.$/, '').toLowerCase()]
      .filter(Boolean).join(' · '));
    // ── LA RÉSERVE EST TOUJOURS SOUSTRAITE (2026-08-24) ──────────────────────
    //
    // L'interrupteur « Tenir compte du frigo » a été RETIRÉ (décision fondateur).
    // Ce qui rendait la soustraction risquée n'était pas la soustraction : c'était
    // une réserve qui se créditait à chaque case cochée en magasin et ne se débitait
    // qu'à la cuisine — elle ne pouvait donc que sur-estimer, et un article
    // sur-estimé DISPARAÎT de la liste. Depuis, elle ne se remplit qu'à la CLÔTURE
    // d'une sortie (`terminer`), c'est-à-dire une fois les courses réellement faites.
    const pantry = await loadPantry();
    // La liste part du jour où le plan a été généré, jamais des jours déjà passés
    // (décision fondateur du 2026-09-17, `lib/coursesDepuis.ts`). ⚠️ Sans profil encore
    // chargé, on achète toute la semaine, c'est le repli SÛR.
    const restantes = perimetre.meals.filter((m) => perimetre.jours.includes(m.day));
    // E75 (2026-10-20) : un reste sous son seuil ne vaut pas un paquet — la ligne disparaît,
    // comme le sel (`lib/seuilAchat.ts` : 20 % d'une portion, 10 g au moins, 15 g au plus
    // pour la protéine du plat).
    const garder = (items: ShoppingItem[]) => items.filter((i) => !sousLeSeuil(i));
    const brute = suivante
      ? buildShoppingList({ ...plan, meals: restantes }, pantry)
      : buildShoppingList({ ...plan, meals: perimetre.meals }, pantry, perimetre.jours);
    const enCours = garder(brute.items);
    const coches = await lireCochesSuivante();

    // UNE LISTE PAR SEMAINE (2026-10-28, `lib/listesSemaines.ts`). La suivante = les deux
    // semaines moins la réserve, MOINS ce que la semaine en cours prend : deux listes
    // calculées chacune contre la réserve compteraient deux fois le même stock.
    let laSuivante: ShoppingList | null = null;
    if (suivante && debutSuivante) {
      const lesDeux = buildShoppingList({ ...plan, meals: [...restantes, ...suivante.plan.meals] }, pantry);
      const cochees = cochesPourLaSemaine(coches, debutSuivante);
      laSuivante = {
        ...lesDeux, id: `${lesDeux.id}-suivante`, semaine_suivante: debutSuivante,
        // Ce qu'on y a ajouté à la main la suit (`fusionner` : un nom = une ligne).
        items: fusionner(garder(articlesDeLaSuivante(lesDeux.items, enCours))
          .map((i) => ({ ...i, checked: cochees.has(i.name.toLowerCase()) })),
          coches?.semaine === debutSuivante ? ((coches.ajouts ?? []) as ShoppingItem[]) : []),
      };
    } else if (coches) {
      // Sa semaine est arrivée : le plan s'est renouvelé sur elle, elle est passée en grand.
      // Ses cases cochées la suivent une fois, puis la clé s'efface.
      await AsyncStorage.removeItem(SUIVANTE_KEY);
      // Ce qu'on y avait ajouté à la main rejoint les ajouts de la semaine en cours.
      if (coches.semaine === debutPlan && coches.ajouts?.length) {
        let deja = await loadAjouts();
        for (const a of coches.ajouts as ShoppingItem[]) if (!trouverArticle(deja, a.name)) deja = ajouterAjout(deja, a);
        await saveAjouts(deja);
      }
      if (!cache) {
        const cochees = cochesPourLaSemaine(coches, debutPlan);
        for (const i of enCours) if (cochees.has(i.name.toLowerCase())) i.checked = true;
      }
    }

    const validee = perimetre.apresCourses;
    if (cache) return { courante: cache, suivante: laSuivante, validee };
    const l: ShoppingList = { ...brute, items: enCours };
    // Ne pas mettre en cache une liste vide (tout couvert) : sinon l'onglet
    // resterait bloqué sur « rien à acheter » même après avoir vidé la réserve.
    // Sans cache, load() la reconstruit à chaque focus et les articles
    // réapparaissent dès qu'elle se dépeuple.
    if (l.items.length > 0) await AsyncStorage.setItem(LIST_KEY, JSON.stringify(l));
    return { courante: l, suivante: laSuivante, validee };
  };

  const lireCochesSuivante = async (): Promise<CochesDeSemaine | null> => {
    try { const r = await AsyncStorage.getItem(SUIVANTE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
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
  //
  // Le geste est un GLISSEMENT vers la gauche depuis le 2026-10-23 (il était un appui long
  // suivi d'une confirmation) : le geste d'Apple, celui de la Réserve, et sans dialogue — un
  // article du plan retiré se rétablit (« Rétablir », sous les commandes).
  // 🔴 UN AJOUT MANUEL NE S'ÉCARTE PAS, IL SE SUPPRIME : rien ne peut le refaire à la place
  // de celui qui l'a tapé, et « Rétablir » ne le ramène pas.
  const ecarterArticle = async (item: ShoppingItem) => {
    animerMiseEnPage();
    setLigneOuverte(null);
    // Sur la liste d'après, seul un ajout à la main se retire (la liste se recalcule du plan).
    if (vue === 'suivante' && suivante) {
      if (item.manuel) await persistSuivante({ ...suivante, items: suivante.items.filter((i) => i.name !== item.name) });
      return;
    }
    if (item.manuel) {
      await persistAjouts(retirerAjout(ajouts, item.name));
      return;
    }
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
  // La liste d'après garde ses cases à part, rattachées à SA semaine (`SUIVANTE_KEY`) : elle
  // se recalcule à chaque venue, ses cases cochées la suivent.
  const persistSuivante = async (l: ShoppingList) => {
    setSuivante(l);
    const coches: CochesDeSemaine = {
      semaine: l.semaine_suivante ?? '',
      noms: l.items.filter((i) => i.checked && !i.manuel).map((i) => i.name),
      ajouts: l.items.filter((i) => i.manuel),
    };
    await AsyncStorage.setItem(SUIVANTE_KEY, JSON.stringify(coches));
  };

  const toggle = async (item: ShoppingItem) => {
    const willCheck = !item.checked;
    if (vue === 'suivante' && suivante) {
      return persistSuivante({ ...suivante, items: suivante.items.map((i) => (i.name === item.name ? { ...i, checked: willCheck } : i)) });
    }
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
    if (vue === 'suivante' && suivante) return persistSuivante({ ...suivante, items: suivante.items.map((i) => ({ ...i, checked: coche })) });
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
  // Les courses de la semaine d'après, faites en avance : ce qui est coché entre en réserve,
  // au paquet estimé comme d'ordinaire, et la sortie s'inscrit à l'historique. Ce qui n'est
  // pas coché reste sur sa liste, qui se recalcule — pas de question à poser.
  const terminerSuivante = async () => {
    if (closing || !suivante) return;
    setClosing(true);
    try {
      const achetes = suivante.items.filter((i) => i.checked && !isStaple(i.name) && i.quantity > 0);
      if (achetes.length) {
        let pantry = await loadPantry();
        for (const it of achetes) pantry = addOrMerge(pantry, { name: it.name, quantity: quantiteRangee(it), unit: it.unit, category: it.category });
        await savePantry(pantry);
        pushPantry(pantry);
      }
      await recordTrip({ id: suivante.id, plan_id: suivante.plan_id, items: suivante.items });
      // Les cases repartent à zéro ; les ajouts à la main non pris restent sur la liste.
      const restes: CochesDeSemaine = { semaine: suivante.semaine_suivante ?? '', noms: [], ajouts: suivante.items.filter((i) => i.manuel && !i.checked) };
      await AsyncStorage.setItem(SUIVANTE_KEY, JSON.stringify(restes));
      await load();
    } finally { setClosing(false); }
  };

  const terminer = async () => {
    if (closing) return;
    if (vue === 'suivante') return terminerSuivante();
    let tous = fusionner(list?.items ?? [], ajouts);
    if (tous.length === 0) return;
    let ajoutsVus = ajouts;
    // ⓪ LE TICKET EST LA CLÔTURE (2026-10-24, E84, règle validée par le fondateur) — seulement
    // si l'iPhone sait lire un ticket (`lib/lecteurTicket.ts` : absent du build (22), donc cette
    // branche dort jusqu'au prochain build). Le ticket coche ce qu'il retrouve, et ce qui entre en
    // réserve est ce qu'il dit (`lib/ticketCaisse.ts`) ; sans lui, rien ne change.
    let parTicket: Rangement[] | null = null;
    if (lecteurDisponible()) {
      const voie = await choose<'ticket' | 'sans'>({
        title: 'Terminer les courses\u00A0?',
        options: [{ label: 'Avec mon ticket', value: 'ticket' }, { label: 'Sans ticket', value: 'sans' }],
      });
      if (voie === null) return;
      if (voie === 'ticket') {
        const source = await choose<SourceTicket>({
          title: 'Ton ticket',
          options: [
            { label: 'Le ticket de mon appli (PDF)', value: 'pdf' },
            { label: 'Prendre une photo', value: 'photo' },
            { label: 'Choisir une image', value: 'image' },
          ],
        });
        if (source === null) return;
        let texte: string | null = null;
        try { texte = await lireTicketDepuis(source); } catch { texte = ''; }
        if (texte === null) return;
        const visibles = tous.filter(visible);
        const coches = new Set(visibles.filter((i) => i.checked).map((i) => i.name));
        const trouves = rapprocher(lireTicket(texte), visibles);
        const lu = clotureAvecTicket(visibles, coches, trouves);
        // Pas de récapitulatif (décision fondateur, 2026-10-24) : ce que le ticket dit se range.
        // Seul un ticket qui ne retrouve RIEN de la liste se dit — sinon l'échec serait muet.
        if (trouves.size === 0) {
          const suite = await choose<'sans'>({
            title: 'Ticket illisible',
            message: 'Aucun article de ta liste n\u2019a été retrouvé sur ce ticket.',
            options: [{ label: 'Terminer sans ticket', value: 'sans' }],
          });
          if (suite === null) return;
        } else {
          parTicket = lu.rangements;
          const achetes = new Set(lu.achetes);
          tous = tous.map((i) => (achetes.has(i.name) ? { ...i, checked: true } : i));
          ajoutsVus = ajouts.map((a) => (achetes.has(a.name) ? { ...a, checked: true } : a));
        }
      }
    }
    const restants = tous.filter((i) => visible(i) && !i.checked);
    // Ce qui n'est pas coché n'est pas acheté. On ne se contente plus de le DIRE
    // avant de les garder d'office : les deux issues sont légitimes et
    // l'utilisateur seul sait laquelle est la sienne — il a renoncé à ces
    // articles, ou il les achètera demain.
    let sort: SortDesRestants = 'garder';
    if (restants.length > 0) {
      const n = restants.length;
      const choix = await choose<SortDesRestants>({
        title: 'Terminer les courses\u00A0?',
        message: `${n} article${n > 1 ? 's ne sont' : " n'est"} pas coché${n > 1 ? 's' : ''}. Qu'est-ce qu'on en fait\u00A0?`,
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
      // ① Les achats rejoignent la réserve, au PAQUET ESTIMÉ (2026-10-02, confirmé le
      // 2026-10-24 quand la liste est revenue au besoin en grammes) : la liste dit « 320 g
      // de riz », la personne prend un paquet de 500 g, ce sont 500 g au placard ; ranger
      // 320 faisait racheter les 180 qui restent (`lib/formatsVendus.ts`). Le ticket de
      // caisse, quand il viendra, remplacera l'estimation par le vrai. Un ajout manuel
      // garde SA quantité.
      // ⚠️ `quantity > 0` : un ajout manuel n'a souvent AUCUNE quantité (« café »).
      // Le ranger quand même y poserait une ligne à 0 g — un chiffre inventé, et un
      // stock inventé fait disparaître des articles de la liste suivante.
      const achetes = tous.filter((i) => visible(i) && i.checked && !isStaple(i.name) && i.quantity > 0);
      // Avec un ticket, ce qui entre est ce qu'il dit (lu, besoin du vrac, ou paquet estimé).
      const aRanger = parTicket
        ? parTicket.filter((r) => !isStaple(r.name)).map(({ name, quantity, unit, category }) => ({ name, quantity, unit, category }))
        : achetes.map((it) => ({ name: it.name, quantity: quantiteRangee(it), unit: it.unit, category: it.category }));
      if (aRanger.length) {
        let pantry = await loadPantry();
        for (const it of aRanger) pantry = addOrMerge(pantry, it);
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
      await saveAjouts(ajoutsApresCloture(ajoutsVus, sort));
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
  const visiblesCourante = appliquerEcartes(tous, ecartes);
  const nbEcartes = tous.length - visiblesCourante.length;
  // La liste en grand : celle de la semaine en cours, ou celle d'après quand on l'a ouverte.
  const surSuivante = vue === 'suivante' && !!suivante;
  const visibles = surSuivante ? suivante!.items : visiblesCourante;
  // L'encadré dit « Semaine prochaine », et sa date en dessous : le titre entier ne tenait pas.
  const dateSuivante = suivante?.semaine_suivante ? dateEnLettres(suivante.semaine_suivante) : '';

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
    const q0 = parseFloat(qty.replace(',', '.'));
    const base0 = q0 > 0 ? toBaseUnit(q0, unite) : null;
    // Sur la liste d'après (2026-10-28, décision fondateur : « le + aussi sur la future liste »).
    if (vue === 'suivante' && suivante) {
      const la = trouverArticle(suivante.items, propre);
      if (la) { setNote(`${la.name} est déjà dans cette liste.`); return; }
      const article = base0 ? creerAjout(propre, base0.quantity, base0.unit) : creerAjout(propre);
      await persistSuivante({ ...suivante, items: [...suivante.items, article] });
      fermerAjout();
      return;
    }
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
      {/* Seul ce qui répond à la saisie se dit ici (« … est déjà dans ta liste »). La note
          « Sans quantité, l'article ne rejoindra pas ta réserve une fois acheté » est
          retirée le 2026-10-22 (fondateur, point 4) ; le code, lui, ne range toujours rien
          en réserve sans quantité. */}
      {note && <Text style={s.sheetNote}>{note}</Text>}
      <PrimaryButton t={t} label="Ajouter" onPress={ajouterArticle} disabled={!nom.trim()} />
      <Presse onPress={fermerAjout} style={s.cancel}><Text style={s.cancelTxt}>Annuler</Text></Presse>
    </ActionSheet>
  );

  // Un encadré par liste : la semaine qu'elle couvre, et ce qu'il y reste à prendre.
  const encadre = (items: ShoppingItem[], titre: string, date: string, ouvrir: () => void) => {
    const n = items.length;
    const pris = items.filter((i) => i.checked).length;
    return (
      <Presse style={s.encadre} onPress={ouvrir} activeOpacity={OPACITE_PRESSION} accessibilityRole="button">
        <View style={s.texte}>
          <Text style={s.encadreT} numberOfLines={1}>{titre}</Text>
          <Text style={s.encadreS} numberOfLines={1}>{[date, n === 0 ? 'Rien à acheter' : `${n} article${n > 1 ? 's' : ''}`, pris > 0 ? `${pris} pris` : ''].filter(Boolean).join(' · ')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={Icone.standard} color={t.textTertiary} />
      </Presse>
    );
  };
  const ouvrirSuivante = () => { animerMiseEnPage(); setVue('suivante'); };
  const ouvrirCourante = () => { animerMiseEnPage(); setVue('courante'); };
  const retourAuxListes = () => { animerMiseEnPage(); setVue('listes'); setLigneOuverte(null); };

  // ⚠️ La feuille d'ajout suit la MÊME règle que celle de l'historique, et pour
  // la même raison : montée ici, elle garde son rang parmi les enfants quel que
  // soit l'état de l'écran, donc sa `Modal` n'est jamais détruite puis recréée au
  // moment précis où la liste se vide.
  const ecran = (corps: React.ReactNode) => (
    <SafeAreaView style={s.safe} edges={['top']}>
      {corps}
      {feuilleAjout}
    </SafeAreaView>
  );

  // ⚠️ « Cette semaine » s'ouvre même vide : c'est par elle qu'on ajoute un article à la main.
  if (vue === 'listes' || (vue === 'suivante' && !surSuivante)) {
    // 🔴 LA PAGE PRINCIPALE DE L'ONGLET, CE SONT LES LISTES (2026-10-28, décision fondateur) :
    // un encadré par liste — la semaine en cours, puis la suivante une fois ses courses
    // closes —, et les courses passées, trois puis « Voir plus ». On touche une liste, elle
    // s'ouvre en grand. Plus d'écran « Rien à acheter » ni de phrase : l'encadré de la semaine
    // en cours le dit (« Rien à acheter »), et c'est par lui qu'on ajoute un article à la main.
    const aPlan = !!list || tous.length > 0;
    const dateCourante = semaine.replace(/^Semaine du /, '');
    return ecran(
      <View style={[s.pageListes, layout.content]}>
        <Text style={s.h1}>Courses</Text>
        {/* Validée et plus rien à prendre : pas d'encadré « Cette semaine · Rien à acheter »,
            il ne reste que la semaine prochaine (2026-10-28, décision fondateur). */}
        {aPlan
          ? (visiblesCourante.length > 0 || !validee) && encadre(visiblesCourante, 'Cette semaine', dateCourante, ouvrirCourante)
          : <Text style={s.pageNote}>Génère un plan repas et ta liste de courses apparaît ici, triée par rayon.</Text>}
        {!!suivante?.items.length && encadre(suivante.items, 'Semaine prochaine', dateSuivante, ouvrirSuivante)}
        {/* Tout retiré à la main : la seule sortie, cette page ne se tire pas pour rafraîchir. */}
        {nbEcartes > 0 && visiblesCourante.length === 0 && (
          <Presse style={s.ctrl} onPress={retablirTout} activeOpacity={OPACITE_PRESSION}>
            <Ionicons name="arrow-undo-outline" size={Icone.petite} color={t.textSecondary} />
            <Text style={s.ctrlTxt}>Rétablir ma liste</Text>
          </Presse>
        )}
        {history.length > 0 && (
          <View style={s.passees}>
            <ShoppingHistory t={t} trips={history} onRemove={retirerSortie} limite={3} />
          </View>
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
  // Plus de section « Encore pour cette semaine » (2026-10-28) : chaque semaine a sa liste.
  const trier = (data: ShoppingItem[]) => [...(hideChecked ? data.filter((i) => !i.checked) : data)]
    .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
  const sections: CoursesSection[] = CATEGORY_ORDER
    .map((cat) => {
      const duRayon = visibles.filter((i) => i.category === cat);
      const left = duRayon.filter((i) => !i.checked).length;
      return { cat, title: CATEGORY_LABELS[cat], left, data: trier(duRayon) };
    })
    .filter((sec) => sec.data.length > 0);

  // ⚠️ En-tête, progression, commandes et aide vivent DANS la liste
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
          {/* 🔴 PLUS DE COMPTEUR AU-DESSUS DU TITRE (2026-08-25, décision fondateur). Depuis le
              2026-10-28, une liste ouverte porte à côté de son titre ses trois gestes en icônes
              (décision fondateur) : ajouter un article, tout cocher, masquer les cochés. */}
          <Text style={[s.h1, { flex: 1 }]} numberOfLines={1}>Courses</Text>
          <Presse style={s.iconBtn} onPress={() => setShowAdd(true)} activeOpacity={OPACITE_PRESSION} accessibilityRole="button" accessibilityLabel="Ajouter un article">
            <Ionicons name="add" size={Icone.action} color={t.text} />
          </Presse>
          {/* Tout cocher, puis tout décocher quand tout est pris (il remplace « Réinitialiser »).
              Rien à cocher ni à masquer dans une liste vide : les deux icônes s'effacent. */}
          {total > 0 && (<>
          <Presse
            style={s.iconBtn}
            onPress={remaining > 0 ? checkAll : reset}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
            accessibilityLabel={remaining > 0 ? 'Tout cocher' : 'Tout décocher'}
          >
            <Ionicons name={remaining > 0 ? 'checkmark-done-outline' : 'refresh-outline'} size={Icone.action} color={t.text} />
          </Presse>
          <Presse
            style={[s.iconBtn, hideChecked && s.ctrlOn]}
            onPress={() => { animerMiseEnPage(); setHideChecked((v) => !v); }}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
            accessibilityLabel={hideChecked ? 'Montrer les cochés' : 'Masquer les cochés'}
          >
            <Ionicons name={hideChecked ? 'eye-off-outline' : 'eye-outline'} size={Icone.action} color={hideChecked ? t.onAccent : t.text} />
          </Presse>
          </>)}
        </View>

        {/* Le retour à la page des listes, la page principale de l'onglet. */}
        <Presse style={s.retour} onPress={retourAuxListes} accessibilityRole="button">
          <Ionicons name="chevron-back" size={Icone.standard} color={t.accent} />
          <Text style={s.retourTxt}>Listes</Text>
        </Presse>

        {/* La semaine que la liste couvre (et, avant les courses, à partir de quel jour), puis
            ce qui est pris. Une liste qui ne couvre pas toute la semaine doit le DIRE. */}
        <View style={s.semaineRangee}>
          <Text style={s.semaine} numberOfLines={1}>
            {surSuivante ? `Semaine du ${dateEnLettres(suivante!.semaine_suivante!)}` : semaine}
          </Text>
          <Text style={s.counter}>{checked}<Text style={s.counterTot}> / {total}</Text></Text>
        </View>

        {/* La jauge rattrapait le doigt d'un saut. « Tout cocher » la faisait
            passer de 0 à 100 % en une frame — le seul geste de l'écran qui dise
            « ça avance » n'avait aucune durée pour le dire. */}
        <Jauge style={s.track} remplissage={s.fill} pct={pct} couleur={done ? t.success : t.accent} />

        {/* Ce qui a été retiré doit rester VISIBLE quelque part, sinon un article
            disparu est indistinguable d'un bug — et le geste pour le ramener
            (tirer vers le bas) n'est écrit nulle part sur cet écran. */}
        {!surSuivante && nbEcartes > 0 && (
          <View style={s.retires}>
            <Text style={s.retiresTxt}>{resumeEcartes(nbEcartes)}</Text>
            <Presse onPress={retablirTout} hitSlop={8} accessibilityRole="button">
              <Text style={s.retiresLien}>Rétablir</Text>
            </Presse>
          </View>
        )}

        {/* Plus de phrase d'aide sous les commandes (2026-10-23) : elle disait le seul geste
            qui ne se voyait pas, « Appui long pour retirer un article ». Retirer se fait
            désormais en GLISSANT la ligne vers la gauche, le geste d'Apple, qu'on n'explique
            pas plus qu'iOS ne l'explique. (Elle avait menti deux fois avant : « il part
            direct dans ton frigo ».) */}

    </View>
  );

  return ecran(
    <>
      <SectionList<ShoppingItem, CoursesSection>
        sections={sections}
        keyExtractor={(item) => item.name}
        style={repli.zone}
        contentContainerStyle={repli.contenu([s.list, layout.content])}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={enTete}
        // Le « + » de l'en-tête est descendu ici (2026-10-28) : on ajoute là où on lit, comme
        // dans Rappels. Pas sur la liste d'après, qui se recalcule depuis son plan.
        // « Courses terminées » en bas, à la couleur choisie (2026-10-28, décision fondateur) :
        // c'est la fin du parcours en magasin. Sans rien de coché, il attend (rien à ranger).
        ListEmptyComponent={<Text style={s.vide}>Rien à acheter pour l'instant.</Text>}
        ListFooterComponent={total > 0 ? (
          <Presse
            style={[s.finir, { backgroundColor: t.accent }, checked === 0 && s.finirAttente]}
            onPress={terminer}
            disabled={closing || checked === 0}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
          >
            <Ionicons name="bag-check-outline" size={Icone.petite} color={t.onAccent} />
            <Text style={[s.finirTxt, { color: t.onAccent }]}>{closing ? 'Un instant…' : 'Courses terminées'}</Text>
          </Presse>
        ) : null}
        // La note de pied (« Formats courants en magasin, arrondis au-dessus de ce que
        // demandent tes repas… ») est RETIRÉE le 2026-10-22 (fondateur, point 4 : « l'app
        // tourne en silence ») : elle racontait le calcul, la ligne dit déjà quoi prendre.
        {...repli.scrollProps}
        scrollEnabled={!glisseEnCours}
        onScrollBeginDrag={() => setLigneOuverte(null)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textTertiary} progressViewOffset={repli.haut} />}
        renderSectionHeader={({ section }) => (
          <View style={s.section}>
            <Text style={s.sectionTxt}>{section.title.toUpperCase()}</Text>
            {/* Même sens que l'en-tête (« 0 / 42 cochés ») : on compte ce qui est COCHÉ.
                « 4 sur 4 » comptait les restants et se lisait à l'envers (2026-09-30). */}
            <Text style={s.sectionCount}>{section.data.length - section.left} / {section.data.length}</Text>
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
          // LE BESOIN, pas le paquet (2026-10-24, fondateur : « on lui dit qu'il lui faut
          // 650 g de bœuf, il achète au plus proche »). Seul ce qui se vend à la pièce dit
          // combien en prendre (« 2 courgettes ») : on n'achète pas ⅔ de tomate.
          const pieces = achatALaPiece(item);
          const contenu = (
            <>
              {/* Pastille RONDE et pleine : une case à cocher carrée est un objet de
                  formulaire, or ici on ne remplit pas un formulaire, on fait ses courses. */}
              <View style={[s.dot, { borderColor: item.checked ? t.accent : t.lineStrong, backgroundColor: item.checked ? t.accent : 'transparent' }]}>
                {item.checked && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
              </View>
              <View style={s.texte}>
                <Text style={[s.name, item.checked && { textDecorationLine: 'line-through', color: t.textTertiary }]} numberOfLines={1}>{nomAffiche(item.name)}</Text>
                {/* « 650 g » : le besoin de la semaine, réserve déduite ; la personne prend ce
                    qui s'en approche en rayon. Le paquet (« 1 pot de 250 g », 2026-10-02) n'est
                    plus affiché depuis le 2026-10-24 (décision fondateur) ; c'est lui qui entre
                    en réserve à la clôture (`quantiteRangee`), faute de savoir ce qui a été pris.
                    Un ajout manuel n'a souvent pas de quantité : `formatQuantity` rendrait
                    « 0 g », un chiffre faux là où un blanc dit la vérité. */}
                {pieces ? (
                  <Text style={[s.qty, item.checked && { color: t.textTertiary }]} numberOfLines={1}>
                    {pieces.libelle}
                  </Text>
                ) : item.quantity > SANS_QUANTITE && (
                  <Text style={[s.qty, item.checked && { color: t.textTertiary }]} numberOfLines={1}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
                )}
              </View>
            </>
          );
          // La liste d'après, ouverte en avance : on y coche, on n'y retire rien (le geste de
          // retrait écarte un article de la semaine en cours, pas d'une semaine à venir).
          if (surSuivante && !item.manuel) return (
            <Presse
              style={[s.row, first && s.rowPremiere, last && s.rowDerniere, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}
              onPress={() => toggle(item)}
              retour="choix"
              accessibilityRole="button"
            >
              {contenu}
            </Presse>
          );
          return (
            // Les coins de la carte sont posés par la ligne glissable (premiere / derniere),
            // qui rogne aussi le rouge qu'elle découvre.
            <LigneGlissable
              libelle="Retirer"
              ouverte={ligneOuverte === item.name}
              onOuvrir={() => setLigneOuverte(item.name)}
              onFermer={() => setLigneOuverte((o) => (o === item.name ? null : o))}
              onGlisse={setGlisseEnCours}
              onSupprimer={() => ecarterArticle(item)}
              premiere={first}
              derniere={last}
              styleLigne={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}
              onTouche={() => (ligneOuverte ? setLigneOuverte(null) : toggle(item))}
              // Le geste le plus RÉPÉTÉ de l'app : on coche une trentaine
              // d'articles d'affilée, en magasin, souvent sans regarder l'écran.
              // D'où `choix` et non `validation` : `selectionAsync` est le tic
              // léger du sélecteur iOS, celui qu'on peut sentir trente fois de
              // suite. Un retour de succès à chaque ligne serait épuisant — c'est
              // la même raison qui interdit un retour par défaut sur `Presse`.
              retourTouche="choix"
            >
              {contenu}
            </LigneGlissable>
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
    emptyNote: { ...Type.caption, color: t.textTertiary, textAlign: 'center' },

    // Plus de padding horizontal ici, ni dans `controls`/`hint`/`track` : ces blocs
    // vivent dans le contentContainer de la liste, qui pose déjà les 20 pt.
    header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
    // Même pastille que celle de la Réserve — un « + » qui change de forme d'un
    // onglet à l'autre se relit comme un autre bouton.
    iconBtn: { width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    retour: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', minHeight: CIBLE_TACTILE_MIN },
    retourTxt: { ...Type.body, color: t.accent },
    semaineRangee: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md, marginBottom: Spacing.sm },
    semaine: { ...Type.bodySmall, color: t.textSecondary, flex: 1 },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 19 },
    counter: { ...Type.bodyStrong, color: t.text },
    counterTot: { ...Type.bodySmall, color: t.textTertiary, letterSpacing: 0 },

    track: { height: 5, backgroundColor: t.fill, borderRadius: 3, overflow: 'hidden' },
    fill: { height: 5, borderRadius: 3 },

    controls: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
    // Un encadré par liste : la semaine qu'elle couvre et ce qu'il y reste.
    encadre: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: CIBLE_TACTILE_MIN, padding: Spacing.lg, borderRadius: Radius.card, backgroundColor: t.card, marginTop: Spacing.md },
    encadreT: { ...Type.bodyStrong, color: t.text },
    encadreS: { ...Type.bodySmall, color: t.textSecondary },
    finirAttente: { opacity: 0.4 },
    vide: { ...Type.body, color: t.textSecondary, paddingTop: Spacing.xxl },
    rowPremiere: { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
    rowDerniere: { borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card },
    // La page des listes, quand la semaine en cours n'a plus rien à prendre.
    pageListes: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.md },
    pageNote: { ...Type.body, color: t.textSecondary },
    passees: { flex: 1, marginHorizontal: -Spacing.xxl, marginTop: Spacing.md },
    ctrl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, backgroundColor: t.fill },
    ctrlOn: { backgroundColor: t.accent },
    ctrlTxt: { ...Type.bodySmall, color: t.text },
    // Pleine largeur, donc `Radius.button` et pas `Radius.pill` : la pilule est
    // faite pour une puce, jamais pour un bouton qui traverse l'écran (§8).
    finir: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.fill, marginTop: Spacing.xxl,
    },
    finirTxt: { ...Type.bodySmallStrong, color: t.text },
    retires: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingTop: Spacing.md },
    retiresTxt: { ...Type.caption, color: t.textTertiary, flex: 1 },
    retiresLien: { ...Type.captionStrong, color: t.accent, minHeight: CIBLE_TACTILE_MIN, textAlignVertical: 'center', lineHeight: CIBLE_TACTILE_MIN },
    // Note de pied présente dans la maquette et absente de l'app : elle dit d'où
    // sortent les quantités, ce qu'aucun autre élément de l'écran n'explique.

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
    // Le nom, puis ce qu'on prend : un libellé et sa valeur, donc l'écart serré.
    texte: { flex: 1, gap: Spacing.xs },
    name: { ...Type.body, color: t.text },
    qty: { ...Type.bodySmall, color: t.textSecondary },
  });
}
