import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, useWindowDimensions, ViewStyle, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Radius, ThemePalette, Type, Spacing, CIBLE_TACTILE_MIN, Trait, OPACITE_PRESSION, HAUTEUR_BARRE_ONGLETS } from '../constants/theme';
import { TourStep, TOURS, FormeCible, ONGLETS, Onglet, TourId, VU_PAR_HERITAGE } from '../lib/tours';
import { Cadre, dejaVisible, memeCadre, ESSAIS_MESURE, PAS_MESURE_MS, MARGE_VISIBLE } from '../lib/visee';
import { RESSORT, DUREE, ressortRN, ressortReduit, dureeReduite } from '../lib/motion';
import { useReduceMotion } from '../lib/reduceMotion';
import { quandAucuneModale } from '../lib/modalesPresentees';

// ── Visite guidée ────────────────────────────────────────────────────────────
// Deux rendus, choisis par l'étape :
//  · une étape qui porte un `onglet` (la visite de l'app, 2026-09-30) amène l'écran
//    sur cet onglet et pose une CARTE au-dessus de la barre, pointée sur lui, l'écran
//    visible derrière un voile léger (`CarteVisite`) ;
//  · sinon, l'overlay sombre d'origine — un trou autour d'une cible (`useTourTarget`)
//    ou une bulle au centre (`Spotlight`).
// N'importe quel écran appelle startTour(tourId, steps). « Déjà vu » mémorisé en
// AsyncStorage (@kyroz:tour:*).
//
// ⚠️ Ce fichier est le MOTEUR, pas le contenu : les étapes vivent dans
// `lib/tours.ts`, qui n'importe rien et se teste. Le moteur, lui, tire
// react-native et n'est vérifiable qu'à l'écran.

export type { TourStep } from '../lib/tours';

type Rect = Cadre;

interface TourOptions {
  /** ScrollView de l'écran : permet de défiler jusqu'à une cible hors écran. */
  scrollRef?: React.RefObject<any>;
  /**
   * Appelé quand la visite est finie (terminée OU passée) ET que sa `Modal` a fini de
   * disparaître — jamais avant : iOS refuse une `Modal` présentée pendant que la
   * précédente s'efface (cf. `end`). Sert à enchaîner l'offre du rappel (plan.tsx).
   */
  onFin?: () => void;
}

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void; measureLayout?: any; scrollIntoView?: any };

interface TourContextValue {
  /** Enregistre/retire la ref d'un élément cible (null = retrait). */
  register: (id: string, ref: React.RefObject<Measurable | null> | null) => void;
  /**
   * Démarre un tour — dès qu'aucune autre modale n'est présentée (cf. le moteur plus bas).
   * Ne garde que les étapes dont la cible est montée AU DÉMARRAGE.
   */
  startTour: (tourId: string, steps: TourStep[], opts?: TourOptions) => void;
  /** Retire un tour qui attendait encore son tour (écran démonté entre-temps). */
  annulerAttente: (tourId: string) => void;
  /**
   * Relance un tour avec les étapes et les options de l'écran qui le PORTE
   * (`useScreenTour`) — « Revoir la visite » passe par là. Rend `false` si cet écran
   * n'est pas monté : l'appelant l'y emmène, et le tour repart de lui-même.
   * ⚠️ Pas un `startTour` refait ailleurs : la visite a besoin du `scrollRef` du Plan
   * pour y amener le premier repas, et d'une seule définition de ses étapes.
   */
  relancer: (tourId: string) => boolean;
  /** Enregistre (ou retire, `null`) le lanceur d'un tour — réservé à `useScreenTour`. */
  enregistrerLanceur: (tourId: string, lancer: (() => void) | null) => void;
  /** Lu par `useEspaceVisite` : l'onglet où la visite AMÈNE une cible, et la place que
   *  la carte y prend en bas. `null` hors de ces arrêts. */
  espaceBas: { onglet: Onglet; hauteur: number } | null;
}

const TourContext = createContext<TourContextValue | null>(null);

const STORAGE_PREFIX = '@kyroz:tour:';

/**
 * Le tour a-t-il déjà été vu (terminé ou passé) ?
 * ⚠️ Le « déjà vu » d'un ANCIEN tour compte aussi (`VU_PAR_HERITAGE`, lib/tours.ts) :
 * la visite de l'app a remplacé les tours d'onglet le 2026-09-30, et sans cette
 * lecture, tous les comptes existants se la verraient imposer au lendemain de la mise
 * à jour. Elle reste à leur portée dans « Revoir la visite ».
 */
export async function hasSeenTour(tourId: string): Promise<boolean> {
  try {
    const ids = [tourId, ...(VU_PAR_HERITAGE[tourId as TourId] ?? [])];
    for (const id of ids) {
      if ((await AsyncStorage.getItem(STORAGE_PREFIX + id)) === 'done') return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function markSeen(tourId: string) {
  try { await AsyncStorage.setItem(STORAGE_PREFIX + tourId, 'done'); } catch {}
}

/**
 * Oublie un tour : il se relancera tout seul à la prochaine visite de son écran.
 * Sans ça, « Passer » par réflexe perdait un tour À VIE — seul le Plan avait un
 * « ? » de rejeu, les quatre autres onglets n'avaient aucun recours.
 */
export async function resetTour(tourId: string): Promise<void> {
  try { await AsyncStorage.removeItem(STORAGE_PREFIX + tourId); } catch {}
}

/** Oublie TOUS les tours (« Revoir les tutos » dans le Profil). */
export async function resetAllTours(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(TOURS.map((t) => STORAGE_PREFIX + t.id));
  } catch {}
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour doit être utilisé dans un <TourProvider>');
  return ctx;
}

/**
 * La place à ajouter en BAS d'un écran pendant que la visite y amène une cible
 * au-dessus de sa carte (2026-09-30) — 0 le reste du temps.
 *
 * 🔴 POURQUOI : vu au simulateur le soir même. Le premier repas à faire était le DÎNER,
 * dernière carte du Plan : l'écran ne défile pas au-delà de son contenu, donc le dîner
 * restait bloqué en bas et son bouton « J'ai cuisiné » à moitié sous la carte — le
 * défaut même qu'on corrigeait. Le web ne le montrait pas (écran plus haut).
 * ➡️ L'écran pose une cale de cette hauteur à la fin de son contenu : le dernier élément
 * peut alors remonter. Elle part avec l'arrêt, sans qu'on la voie jamais (elle est sous
 * la carte).
 */
export function useEspaceVisite(onglet: Onglet): number {
  const { espaceBas } = useTour();
  return espaceBas?.onglet === onglet ? espaceBas.hauteur : 0;
}

/**
 * Rend un élément ciblable par la visite guidée. Renvoie une ref à brancher
 * DIRECTEMENT sur l'élément à surligner (`<View ref={ref}>`, `<Presse
 * ref={ref}>`…). On évite ainsi une View englobante qui inclurait les marges de
 * l'enfant → le spotlight épouse exactement la border box de l'élément.
 * `id` optionnel : si absent, rien n'est enregistré (pratique dans une liste où
 * seul le 1er élément est ciblé).
 */
export function useTourTarget(id?: string): React.MutableRefObject<any> {
  const { register } = useTour();
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!id) return;
    register(id, ref);
    return () => register(id, null);
  }, [id, register]);
  return ref;
}

/**
 * Patron d'un tour d'ÉCRAN : il se lance tout seul à la première visite de cet
 * écran, et se rejoue à la demande. C'est ce découpage qui rend un tutoriel
 * étoffé tenable — TOUTES les bulles servies d'un coup au premier lancement seraient
 * autant d'interruptions ; réparties sur les onglets, chacune arrive quand la personne
 * regarde justement l'écran dont on lui parle.
 * ⚠️ Cette phrase citait « 22 bulles » alors qu'il y en avait 21, puis 20 : un nombre
 * recopié dans un commentaire périme sans que rien ne le dise. Le décompte vit à UN
 * endroit vérifié — CLAUDE.md §8, verrouillé contre le code par `visiteGuidee.test.ts`.
 *
 * ⚠️ `steps` est un tableau NEUF à chaque rendu (les tours sont construits par
 * des fonctions). Le garder dans une ref est ce qui empêche l'effet de se
 * redéclencher en boucle — le mettre en dépendance relancerait le tour à chaque
 * frappe sur l'écran.
 */
export function useScreenTour(
  tourId: string,
  steps: TourStep[],
  opts?: { pret?: boolean; delai?: number; scrollRef?: React.RefObject<any>; onFin?: () => void },
) {
  const { startTour, annulerAttente, enregistrerLanceur } = useTour();
  const tried = useRef(false);
  const stepsRef = useRef(steps);
  const optsRef = useRef(opts);
  stepsRef.current = steps;
  optsRef.current = opts;

  const pret = opts?.pret ?? true;

  const lancer = useCallback(() => {
    // `onFin` relu à l'appel : l'écran le recrée à chaque rendu, la version qui compte
    // est celle du moment où la visite se termine.
    startTour(tourId, stepsRef.current, {
      scrollRef: optsRef.current?.scrollRef,
      onFin: () => optsRef.current?.onFin?.(),
    });
  }, [tourId, startTour]);

  useEffect(() => {
    enregistrerLanceur(tourId, lancer);
    return () => enregistrerLanceur(tourId, null);
  }, [tourId, lancer, enregistrerLanceur]);

  useEffect(() => {
    if (!pret || tried.current) return;
    tried.current = true;
    let annule = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    hasSeenTour(tourId).then((seen) => {
      if (seen || annule) return;
      // Délai : le temps que la mise en page se pose. Sans lui, la mesure de la
      // première cible tombe sur une hauteur nulle et le tour s'ouvre sur un
      // écran noir le temps des essais.
      timer = setTimeout(() => { if (!annule) lancer(); }, optsRef.current?.delai ?? 650);
    });
    // ⚠️ `annulerAttente` : le délai a pu partir, et le tour ATTENDRE une modale
    // (`startTour`). Un écran démonté ne doit pas voir sa visite surgir ailleurs.
    return () => { annule = true; if (timer) clearTimeout(timer); annulerAttente(tourId); };
  }, [pret, tourId, lancer, annulerAttente]);

  return { rejouer: lancer };
}

// 🔴 `TourButton` (le « ? » de rejeu) A ÉTÉ SUPPRIMÉ LE 2026-08-25, décision
// fondateur : « une fois que l'user a lu, c'est bon, il n'a pas besoin de le revoir ».
// Il vivait dans les cinq en-têtes.
//
// ⚠️ IL RESTE UNE PORTE DE REJEU, ET ELLE N'EST PAS OPTIONNELLE : « Revoir les tutos »
// dans les réglages du Profil (`resetAllTours` + relance). Un tour est marqué VU dès
// son OUVERTURE (`startTour`, plus bas) — c'est le seul instant qui résiste à une app
// tuée par iOS. Conséquence assumée depuis ce jour-là : une bulle ENTREVUE compte comme
// lue. Elle n'était acceptable que parce qu'un recours existait. Retirer aussi celui du
// Profil rendrait un tuto passé par erreur perdu À VIE.

const PAD = 6;             // marge du « trou » autour de la cible
const BUBBLE_MAX_W = 360;
const DIM = 'rgba(0,0,0,0.72)';

/**
 * La route d'un onglet. `as never` : les routes typées ne sont pas activées (même
 * procédé que `ReglagesSheet::versRoute`).
 */
const routeOnglet = (o: Onglet) => `/(tabs)/${o}` as never;

/**
 * La forme déclarée par l'étape, traduite en rayon de la DA. C'est ICI que vivent
 * les pixels : `lib/tours.ts` reste pur (il ne peut pas importer `theme.ts`, qui
 * tire react-native), donc il nomme la forme et le moteur la dessine.
 *
 * ⚠️ `Record<FormeCible, …>` n'est pas décoratif : ajouter une forme dans
 * `tours.ts` sans lui donner de rayon ici fait échouer `tsc`. Sans ça, la forme
 * nouvelle retomberait silencieusement sur `undefined`, donc sur un angle droit.
 */
const RAYON_CIBLE: Record<FormeCible, number> = {
  carte: Radius.card,
  bouton: Radius.button,
  pastille: Radius.pill,
};

interface ActiveTour {
  tourId: string;
  steps: TourStep[];
  index: number;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const refs = useRef<Map<string, React.RefObject<Measurable | null>>>(new Map());
  const scrollRef = useRef<React.RefObject<any> | undefined>(undefined);
  const [active, setActive] = useState<ActiveTour | null>(null);
  // Lue par `end` et `next`, qui doivent savoir D'OÙ la visite est partie pour y
  // ramener (cf. `end`) sans se recréer à chaque étape.
  const activeRef = useRef<ActiveTour | null>(null);
  activeRef.current = active;
  const [rect, setRect] = useState<Rect | null>(null);
  // 🔴 « JE CHERCHE ENCORE » ET « IL N'Y A RIEN À MONTRER » SONT DEUX ÉTATS, et
  // les confondre laissait un écran NOIR SANS AUCUNE SORTIE (voir le rendu en
  // bas de ce fichier).
  const [sansCible, setSansCible] = useState(false);
  const { height: hauteurEcran } = useWindowDimensions();
  // La visite d'onglets : ce qui l'entoure sans être de l'état affiché.
  //  · `fin` : l'`onFin` de la visite en cours, puis EN ATTENTE que sa `Modal` ait fini
  //    de disparaître (`onDismiss`) ;
  //  · `lanceurs` : un lanceur par tour, déposé par l'écran qui le porte (`relancer`) ;
  //  · `hauteurCarte` : mesurée par `CarteVisite`, pour savoir ce qu'elle recouvre.
  const finRef = useRef<(() => void) | undefined>(undefined);
  const finEnAttente = useRef<(() => void) | undefined>(undefined);
  const lanceurs = useRef<Map<string, () => void>>(new Map());
  const hauteurCarte = useRef(0);

  const register = useCallback((id: string, ref: React.RefObject<Measurable | null> | null) => {
    if (ref) refs.current.set(id, ref);
    else refs.current.delete(id);
  }, []);

  // 🔴 « ENREGISTRÉE » N'EST PAS « MONTÉE », et confondre les deux a produit
  // les deux défauts signalés le 2026-08-15. `useTourTarget` appelle `register`
  // depuis le CORPS du composant : l'id entre dans la table dès que le composant
  // vit, que l'élément visé soit rendu ou non. `refs.current.has(id)` rendait
  // donc `true` pour `plan-cook` alors que le bouton « J'ai cuisiné » n'existait
  // pas — repas déjà mangé — et l'étape entrait dans le tour avec une ref vide.
  // ➡️ La seule preuve qu'une cible est là, c'est `.current`.
  const montee = useCallback((id: string) => !!refs.current.get(id)?.current, []);

  const demarrer = useCallback((tourId: string, steps: TourStep[], opts?: TourOptions) => {
    // ⚠️ Une étape SANS cible est toujours disponible : elle parle de l'écran, pas
    // d'un objet (cf. `TourStep.targetId`). C'est aussi ce qui la met à l'abri du
    // filtre ci-dessous — le Plan ne se jouait plus du tout les soirs où tous les
    // repas étaient cochés, faute de carte à surligner.
    // ➕ Une étape d'ONGLET l'est aussi (2026-09-30) : sa cible ne sert qu'à amener un
    // objet au-dessus de la carte, pas à le désigner. Sans elle, l'arrêt se joue quand
    // même, sans défilement — et surtout la visite ne perd pas un onglet en route.
    const avail = steps.filter((s) => !s.targetId || s.onglet || montee(s.targetId));
    // ℹ️ Aucune cible montée = on ne lance RIEN, et surtout on ne marque pas le
    // tour vu : il se rejouera de lui-même quand l'écran aura de quoi le porter.
    if (avail.length === 0) return;
    // ⚠️ Un tour AMPUTÉ est le défaut silencieux de ce filtre : une cible non
    // montée (parce qu'elle est conditionnelle, ou parce qu'un renommage l'a
    // détachée) fait disparaître son étape sans que rien ne le signale — le tour
    // se joue plus court et paraît complet. Certaines absences sont légitimes
    // (le bloc n'existe pas quand la réserve est vide), d'où un simple
    // avertissement de développement plutôt qu'un blocage. Le garde-fou qui
    // compte vraiment est `lib/__tests__/visiteGuidee.test.ts`.
    if (__DEV__ && avail.length < steps.length) {
      const manquants = steps.filter((s) => s.targetId && !s.onglet && !montee(s.targetId)).map((s) => s.targetId);
      console.warn(`[GuidedTour] tour « ${tourId} » amputé de ${manquants.length} étape(s) : ${manquants.join(', ')} — cible non montée.`);
    }
    scrollRef.current = opts?.scrollRef;
    finRef.current = opts?.onFin;
    setRect(null);
    setActive({ tourId, steps: avail, index: 0 });
    // 🔴 MARQUÉ VU DÈS L'AFFICHAGE, PAS À LA SORTIE — et c'est le seul endroit qui
    // résiste à une app TUÉE. Le marquage ne vivait que dans `end` (« Passer ») et
    // `next` (dernière étape) : toute autre fin de session n'écrivait RIEN, donc le
    // tour revenait au lancement suivant, indéfiniment. Et il n'existe aucune autre
    // porte de sortie — mesuré le 2026-08-10 : les quatre panneaux sombres avalent
    // le tap, y compris sur la barre d'onglets, donc on ne peut pas s'échapper en
    // changeant d'écran. Sur iPhone, où le système termine l'app régulièrement, les
    // CINQ tours se relançaient à chaque ouverture (signalé par le fondateur :
    // « le tuto s'ouvre encore alors que je l'ai fait 18 fois »).
    // ⚠️ Tout correctif branché sur une sortie PROPRE (démontage, perte de focus,
    // `onRequestClose`) ne corrige pas ce cas : iOS ne les déclenche pas quand il
    // tue le processus. Le seul instant garanti est celui où le tour s'ouvre.
    // ⚠️ Conséquence assumée : une bulle entrevue compte comme vue. Acceptable
    // parce que le rejeu existe PARTOUT (le « ? » des cinq en-têtes + « Revoir les
    // tutos » du Profil) — là où une bulle qu'on ne peut pas faire taire n'a, elle,
    // aucun recours.
    markSeen(tourId);
  }, [montee]);

  // 🔴 LA VISITE ATTEND QU'AUCUNE MODALE NE SOIT PLUS PRÉSENTÉE (2026-09-19) — elle
  // figeait l'app. Elle se lance d'elle-même, 650 ms après l'arrivée sur l'écran, sans
  // savoir ce qui s'y est ouvert entre-temps : l'éditeur ouvert par la carte « Revois tes
  // protéines préférées », ou la feuille Réglages de « Revoir les tutos ». iOS refuse une
  // `Modal` par-dessus une autre ; celle-ci restait alors invisible et avalait tous les
  // taps une fois la feuille refermée (mécanisme complet : `lib/modalesPresentees.ts`).
  // ⚠️ On ATTEND, on ne renonce pas : la visite n'est marquée vue qu'au démarrage réel
  // (`demarrer`), et elle s'ouvre sur l'écran dès que la feuille est partie.
  const attente = useRef<{ tourId: string; annuler: () => void } | null>(null);
  const startTour = useCallback((tourId: string, steps: TourStep[], opts?: TourOptions) => {
    attente.current?.annuler(); // une seule visite en attente : la dernière demandée
    attente.current = null;
    let partie = false; // aucune modale → `quandAucuneModale` l'a lancée sur-le-champ
    const annuler = quandAucuneModale(() => { partie = true; attente.current = null; demarrer(tourId, steps, opts); });
    if (!partie) attente.current = { tourId, annuler };
  }, [demarrer]);

  const annulerAttente = useCallback((tourId: string) => {
    if (attente.current?.tourId !== tourId) return;
    attente.current.annuler();
    attente.current = null;
  }, []);

  // ℹ️ Ni `end` ni `next` ne marquent le tour : c'est `startTour` qui le fait, à
  // l'ouverture. Une seule source, et surtout la seule qui couvre les sorties que
  // ces deux-là ne voient pas (app tuée, onglet fermé). Les rétablir ici serait un
  // second endroit à tenir d'accord, pour un cas déjà couvert.
  // 🔴 UNE VISITE D'ONGLETS RAMÈNE LÀ OÙ ELLE A COMMENCÉ (le Plan, 2026-09-30) —
  // qu'on la termine ou qu'on la passe. Sans ça, « Passer » à la troisième étape
  // laissait la personne sur la Réserve, un onglet qu'elle n'a pas choisi, vide à ce
  // stade, au lieu de l'écran de sa journée.
  // 🔴 ET SON `onFin` N'EST APPELÉ QU'UNE FOIS LA `Modal` DISPARUE. iOS refuse une
  // `Modal` présentée pendant qu'une autre s'efface — celle-ci s'efface en fondu —, et
  // la suivante (l'offre du rappel) resterait invisible sans un mot. `onDismiss` le
  // signale sur iOS et sur le web ; Android ferme sans attendre et ne le connaît pas.
  const end = useCallback(() => {
    const depart = activeRef.current?.steps[0]?.onglet;
    const fin = finRef.current;
    finRef.current = undefined;
    setActive(null);
    setRect(null);
    if (depart) router.navigate(routeOnglet(depart));
    if (Platform.OS === 'android') fin?.();
    else finEnAttente.current = fin;
  }, []);

  const apresFermeture = useCallback(() => {
    const fin = finEnAttente.current;
    finEnAttente.current = undefined;
    fin?.();
  }, []);

  const enregistrerLanceur = useCallback((tourId: string, lancer: (() => void) | null) => {
    if (lancer) lanceurs.current.set(tourId, lancer);
    else lanceurs.current.delete(tourId);
  }, []);

  const relancer = useCallback((tourId: string) => {
    const lancer = lanceurs.current.get(tourId);
    if (!lancer) return false;
    lancer();
    return true;
  }, []);

  const next = useCallback(() => {
    const cur = activeRef.current;
    if (!cur) return;
    if (cur.index < cur.steps.length - 1) setActive({ ...cur, index: cur.index + 1 });
    else end();
  }, [end]);

  // Aller droit à une étape : un onglet tapé PENDANT la visite y amène son arrêt. La
  // barre reste vive sous le voile (`CarteVisite`) — ce qui a l'air touchable doit
  // l'être, sinon le premier tap sur un onglet se lit comme une app figée.
  const allerA = useCallback((i: number) => {
    setActive((cur) => (cur && i >= 0 && i < cur.steps.length ? { ...cur, index: i } : cur));
  }, []);

  // 🔴 LA VISITE MONTRE L'ONGLET DONT ELLE PARLE (2026-09-30). Une étape qui porte un
  // `onglet` y amène l'écran à son arrivée : c'est ce qui fait d'une suite de bulles
  // une VISITE — la carte parle des courses pendant qu'on voit la liste derrière elle.
  // ⚠️ `navigate` et non `push` : on change d'onglet, on n'empile pas d'écran.
  const ongletCourant = active?.steps[active.index]?.onglet;
  useEffect(() => {
    if (ongletCourant) router.navigate(routeOnglet(ongletCourant));
  }, [ongletCourant]);

  // Revenir en arrière : une bulle lue trop vite était perdue pour toujours, il
  // fallait relancer le tour entier depuis le « ? ». `setRect(null)` n'est pas
  // nécessaire — l'effet de mesure se redéclenche sur `index`.
  const prev = useCallback(() => {
    setActive((cur) => (cur && cur.index > 0 ? { ...cur, index: cur.index - 1 } : cur));
  }, []);

  // Amène la cible dans le champ visible (sinon une cible sous la ligne de
  // flottaison se mesure hors écran). Web : scrollIntoView du nœud DOM ;
  // natif : measureLayout dans le ScrollView puis scrollTo.
  const scrollIntoView = (node: any, done: () => void) => {
    if (node && typeof node.scrollIntoView === 'function') {
      try { node.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch {}
      setTimeout(done, 160);
      return;
    }
    const sv = scrollRef.current?.current;
    if (sv && node && typeof node.measureLayout === 'function') {
      // Nœud de référence pour measureLayout. La nouvelle architecture (Fabric)
      // exige une *instance hôte* native (ReactNativeElement) : getNativeScrollRef()
      // la renvoie, alors que getScrollableNode() ne renvoie qu'un node-handle
      // numérique → « measureLayout must be called with a ref to a native component ».
      const handle = typeof sv.getNativeScrollRef === 'function'
        ? sv.getNativeScrollRef()
        : typeof sv.getScrollableNode === 'function'
          ? sv.getScrollableNode()
          : sv;
      if (handle) {
        node.measureLayout(
          handle,
          (_x: number, y: number) => { sv.scrollTo({ y: Math.max(0, y - 120), animated: true }); setTimeout(done, 260); },
          () => done(),
        );
        return;
      }
    }
    done();
  };

  // ── Mesure de la cible de l'étape courante ─────────────────────────────────
  // 🔴 TROIS DÉFAUTS CORRIGÉS ICI LE 2026-08-15, signalés sur capture par le
  // fondateur (« bug sur le tuto, regarde les screens »). Aucun ne se voyait en
  // relisant ce fichier : ils ne se manifestent que sur des états d'écran
  // particuliers, et le rendu resté à l'écran était à chaque fois PLAUSIBLE.
  //
  // 1. **On ne défile que si la cible n'est pas déjà là.** Le code appelait
  //    `scrollIntoView` à chaque étape, même pour un bouton sous les yeux — donc
  //    260 ms d'attente pour zéro pixel de déplacement, pendant lesquelles
  //    l'anneau de l'étape PRÉCÉDENTE restait sous le texte de la nouvelle.
  // 2. **Une mesure ne se croit qu'une fois STABLE.** `scrollTo` est animé et
  //    260 ms était un délai DEVINÉ : la lecture tombait en plein vol et
  //    l'anneau se posait 72 pt sous sa cible (capture 2, étape 3/6).
  // 3. **Une cible introuvable RETIRE l'anneau, elle ne garde pas le précédent.**
  //    `rect` n'était jamais remis à zéro entre deux étapes : quand la mesure
  //    échouait, la bulle « Marque-le comme cuisiné » s'affichait avec l'anneau
  //    de « Ma répartition (%) » — le texte d'une étape désignant l'objet d'une
  //    autre (capture 1, étape 5/6).
  useEffect(() => {
    if (!active) { setRect(null); setSansCible(false); return; }
    // Étape sans cible : rien à mesurer, la bulle se pose au centre. Le court-circuit
    // est volontaire — laisser la boucle de mesure conclure ferait attendre
    // `ESSAIS_MESURE` tours pour un échec certain, et la bulle arriverait en retard.
    const idCible = active.steps[active.index].targetId;
    if (!idCible) { setRect(null); setSansCible(true); return; }
    let annule = false;
    let essais = 0;
    let precedent: Rect | null = null;

    const noeud = () => refs.current.get(idCible)?.current;

    const poser = (c: Rect) => { if (annule) return; setRect(c); setSansCible(false); };
    const renoncer = () => { if (annule) return; setRect(null); setSansCible(true); };

    const reessayer = (suite: () => void) => {
      essais += 1;
      if (essais > ESSAIS_MESURE) { renoncer(); return; }
      setTimeout(() => { if (!annule) suite(); }, PAS_MESURE_MS);
    };

    const lire = (suite: (c: Rect) => void) => {
      const n = noeud();
      if (!n) { reessayer(() => lire(suite)); return; }
      n.measureInWindow((x, y, w, h) => {
        if (annule) return;
        if (w === 0 && h === 0) { reessayer(() => lire(suite)); return; }
        suite({ x, y, width: w, height: h });
      });
    };

    // 2ᵉ temps, après un défilement : deux lectures identiques d'affilée valent
    // « l'écran s'est arrêté ». Aucune durée n'est supposée.
    const stabiliser = () => lire((c) => {
      if (precedent && memeCadre(precedent, c)) { poser(c); return; }
      precedent = c;
      reessayer(stabiliser);
    });

    // 1er temps : la cible est-elle déjà sous les yeux ? Alors on ne bouge rien,
    // et l'anneau se pose dans la foulée — pas d'attente, donc pas de fenêtre
    // pendant laquelle l'anneau d'avant traîne.
    // ➕ Pour une étape d'ONGLET, « sous les yeux » veut dire AU-DESSUS DE LA CARTE :
    // le bas de l'écran est pris par la barre et par la carte qu'on vient de poser.
    // Tant qu'elle n'a pas été mesurée, on lui prête sa hauteur ordinaire.
    const basLibre = active.steps[active.index].onglet
      ? HAUTEUR_BARRE_ONGLETS + (hauteurCarte.current || HAUTEUR_CARTE_ORDINAIRE) + Spacing.lg + Spacing.md
      : MARGE_VISIBLE;
    lire((c) => {
      if (dejaVisible(c, hauteurEcran, MARGE_VISIBLE, basLibre)) { poser(c); return; }
      scrollIntoView(noeud(), () => { if (!annule) stabiliser(); });
    });

    return () => { annule = true; };
  }, [active?.tourId, active?.index]);

  const step = active ? active.steps[active.index] : null;
  const isLast = active ? active.index === active.steps.length - 1 : false;
  // La cale sous le contenu (`useEspaceVisite`) : seulement là où la visite amène une
  // cible, et de la hauteur de ce que la carte recouvre.
  const espaceBas = step?.onglet && step.targetId
    ? { onglet: step.onglet, hauteur: (hauteurCarte.current || HAUTEUR_CARTE_ORDINAIRE) + Spacing.lg + Spacing.md }
    : null;

  return (
    <TourContext.Provider value={{ register, startTour, annulerAttente, relancer, enregistrerLanceur, espaceBas }}>
      {children}
      {/* 🔴 CE `?:` A ÉTÉ UN PIÈGE À UTILISATEUR, et c'est un correctif de
          BLOCAGE, pas de finition. Le panneau sombre s'affichait dès qu'un tour
          démarrait, la bulle seulement une fois la cible mesurée — donc une
          cible introuvable donnait un écran assombri SANS bulle, SANS « Passer »,
          et le panneau avale les taps, barre d'onglets comprise. Il n'existait
          alors aucune sortie : il fallait tuer l'app. Et comme `startTour` marque
          le tour vu à l'ouverture, ça n'arrivait qu'UNE fois — donc irreproductible.
          ➡️ Trois états, plus deux : on cherche (sombre), on a trouvé (spotlight),
          on renonce (la bulle SANS anneau, qui garde sa sortie). Un tutoriel qu'on
          ne peut pas quitter est pire que pas de tutoriel. */}
      <Modal visible={!!active} transparent animationType="fade" onRequestClose={end} onDismiss={apresFermeture}>
        {step && (
          step.onglet
            ? <CarteVisite t={t} steps={active!.steps} index={active!.index} isLast={isLast}
                onNext={next} onSkip={end} onAller={allerA}
                onHauteur={(h) => { hauteurCarte.current = h; }} />
            : rect || sansCible
              ? <Spotlight t={t} rect={rect} step={step} index={active!.index}
                  total={active!.steps.length} isLast={isLast} onNext={next} onPrev={prev} onSkip={end} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
        )}
      </Modal>
    </TourContext.Provider>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function Spotlight({
  t, rect, step, index, total, isLast, onNext, onPrev, onSkip,
}: {
  t: ThemePalette;
  /** `null` = la cible n'a pas pu être mesurée : la bulle s'affiche sans anneau. */
  rect: Rect | null;
  step: TourStep;
  index: number;
  total: number;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  // `useWindowDimensions` : la géométrie du trou est calculée en coordonnées
  // écran, et sur iPad l'écran change de taille sans relancer l'app.
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const s = makeStyles(t);

  const bulle = (
    <Bulle s={s} step={step} index={index} total={total} isLast={isLast}
      onNext={onNext} onPrev={onPrev} onSkip={onSkip} />
  );

  // ── L'anneau GLISSE d'une cible à l'autre ──────────────────────────────────
  //
  // Ajouté le 2026-08-15. Il TÉLÉPORTAIT : d'un bout de l'écran à l'autre, sans
  // rien qui relie les deux. Or c'est le même objet — le faire voyager dit
  // « regarde maintenant ICI », là où un saut oblige à retrouver l'anneau des
  // yeux à chaque bulle. C'est la seule animation de l'app dont le rôle soit
  // d'EXPLIQUER, et le tutoriel est justement le moment où on a le droit.
  //
  // ⚠️ `RESSORT.pose`, donc AUCUN dépassement : le rebond se mérite, et personne
  // n'a lancé cet anneau du doigt. Un anneau qui dépasserait sa cible puis
  // reviendrait dessus se lirait comme une hésitation du tutoriel.
  // ⚠️ Le RAYON voyage avec la position : sans lui, l'anneau glisse en pilule
  // puis claque en carte à l'arrivée — deux mouvements pour une transition.
  // ⚠️ `useNativeDriver: false` est ici obligatoire (position, taille et rayon
  // ne sont pas des propriétés natives). C'est admissible parce que rien d'autre
  // ne tourne pendant un tour : l'écran est figé sous un voile.
  const reduire = useReduceMotion();
  const cible = rect
    ? {
        x: clamp(rect.x - PAD, 0, SCREEN_W),
        y: clamp(rect.y - PAD, 0, SCREEN_H),
        w: Math.min(rect.width + PAD * 2, SCREEN_W - clamp(rect.x - PAD, 0, SCREEN_W)),
        h: Math.min(rect.height + PAD * 2, SCREEN_H - clamp(rect.y - PAD, 0, SCREEN_H)),
        r: RAYON_CIBLE[step.forme ?? 'carte'] + PAD,
      }
    : null;

  const anim = useRef({
    x: new Animated.Value(0), y: new Animated.Value(0),
    w: new Animated.Value(0), h: new Animated.Value(0),
    r: new Animated.Value(0),
  }).current;
  // La PREMIÈRE mesure se pose, elle ne voyage pas : un anneau qui viendrait du
  // coin supérieur gauche à l'ouverture du tour n'expliquerait rien.
  const pose = useRef(false);

  useEffect(() => {
    if (!cible) return;
    const cles = ['x', 'y', 'w', 'h', 'r'] as const;
    if (!pose.current) {
      pose.current = true;
      cles.forEach((k) => anim[k].setValue(cible[k]));
      return;
    }
    const ressort = ressortReduit(RESSORT.pose, reduire);
    Animated.parallel(
      cles.map((k) => Animated.spring(anim[k], {
        toValue: cible[k],
        useNativeDriver: false,
        ...ressortRN(ressort),
      })),
    ).start();
  }, [cible?.x, cible?.y, cible?.w, cible?.h, cible?.r, reduire]);

  // ── Et la BULLE se pose en fondu ───────────────────────────────────────────
  //
  // 🔴 ELLE A ÉTÉ LAISSÉE DE CÔTÉ D'ABORD, ET LA MESURE A DIT QUE C'ÉTAIT FAUX.
  // Le raisonnement de départ tenait : l'anneau est « le même objet qui voyage »
  // (donc il glisse), la bulle est un CONTENU qui change entièrement (donc elle
  // n'a pas à se déplacer). Vrai — mais elle est aussi le plus gros objet de
  // l'écran. Relevé image par image sur une vidéo du tour à 30 i/s : l'anneau
  // rendait une fenêtre de mouvement de 200 ms, et la bulle un SAUT d'une seule
  // image à pic 25 — soit, à l'œil, une transition qui claque quand même.
  // ➡️ Elle ne se déplace toujours pas (son texte a changé : la faire glisser
  // dirait qu'elle est la même, ce qui serait faux). Elle se POSE, en fondu.
  // C'est la règle « ce qui informe reste, ce qui déplace se retire » appliquée
  // à un objet dont le déplacement n'aurait rien informé.
  const fondu = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fondu.setValue(0);
    Animated.timing(fondu, {
      toValue: 1,
      duration: dureeReduite(DUREE.court, reduire),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, reduire, fondu]);

  // Sans cadre : pas de trou, pas d'anneau — la bulle seule, au centre. Elle
  // reste vraie (elle décrit l'écran, pas un objet précis) et surtout elle garde
  // son « Passer ». Ne JAMAIS remplacer ça par un simple panneau sombre : c'est
  // exactement le blocage corrigé le 2026-08-15.
  if (!rect) {
    const w = Math.min(SCREEN_W - 32, BUBBLE_MAX_W);
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={[s.bubble, { width: w, position: 'relative' }]}>{bulle}</View>
      </View>
    );
  }

  // Trou (cible + marge), borné à l'écran.
  const cx = clamp(rect.x - PAD, 0, SCREEN_W);
  const cy = clamp(rect.y - PAD, 0, SCREEN_H);
  const cw = Math.min(rect.width + PAD * 2, SCREEN_W - cx);
  const ch = Math.min(rect.height + PAD * 2, SCREEN_H - cy);

  // Épaisseur du cadre sombre : de quoi couvrir l'écran depuis n'importe quelle
  // position du trou. Le trou étant toujours dans l'écran, la plus grande de ses
  // deux dimensions suffit des quatre côtés.
  const DEBORD = Math.max(SCREEN_W, SCREEN_H);

  // ℹ️ Le rayon de l'anneau ET du trou vit une seule fois, dans `cible.r`
  // ci-dessus, et voyage par `anim.r` — sinon les deux formes divergent, ce qui
  // est exactement le défaut corrigé le 2026-08-14. Il était calculé une SECONDE
  // fois ici jusqu'au 2026-08-15 ; le rendre animé a rendu cette copie inerte, et
  // une copie inerte est précisément ce qui redevient fausse un jour.

  // Bulle : sous la cible si la place le permet, sinon au-dessus.
  const bubbleW = Math.min(SCREEN_W - 32, BUBBLE_MAX_W);
  const centerX = rect.x + rect.width / 2;
  const bubbleLeft = clamp(centerX - bubbleW / 2, 16, SCREEN_W - 16 - bubbleW);
  const spaceBelow = SCREEN_H - (cy + ch);
  const placeBelow = spaceBelow > 220 || spaceBelow >= cy;
  const bubblePos: ViewStyle = placeBelow
    ? { top: cy + ch + 14 }
    : { bottom: SCREEN_H - cy + 14 };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* 🔴 LE TROU EST ARRONDI, ET IL ÉTAIT CARRÉ — corrigé le 2026-08-14
          (signalé par le fondateur sur capture). L'assombrissement se faisait par
          QUATRE panneaux rectangulaires posés autour de la cible : le trou qu'ils
          laissaient était donc forcément un rectangle, pendant que l'anneau, lui,
          était arrondi. Aux quatre coins, une pointe de l'écran restait EN PLEINE
          LUMIÈRE en dehors de l'anneau — sur fond sombre, une équerre claire qui
          dépasse d'un bouton en pilule. Ça ne se voit pas en relisant le code : il
          n'y a pas de bug, il y a deux géométries qui ne se parlent pas.
          ➡️ Un SEUL panneau, dont la BORDURE fait l'assombrissement. Le vide
          intérieur d'une bordure épaisse est arrondi du rayon extérieur moins
          l'épaisseur — donc exactement le rayon de l'anneau, par construction et
          non par recopie. `DEBORD` couvre l'écran depuis n'importe quelle position
          du trou (le trou est toujours DANS l'écran, donc un débord de la plus
          grande dimension suffit des quatre côtés).
          ⚠️ Ce panneau avale les taps comme les quatre d'avant, y compris au
          milieu du trou : c'est ce qui empêche de s'échapper du tour en tapant
          l'écran, et `startTour` compte là-dessus (cf. le marquage à l'ouverture). */}
      <Animated.View
        style={{
          position: 'absolute',
          top: Animated.subtract(anim.y, DEBORD), left: Animated.subtract(anim.x, DEBORD),
          width: Animated.add(anim.w, DEBORD * 2), height: Animated.add(anim.h, DEBORD * 2),
          borderWidth: DEBORD, borderColor: DIM,
          borderRadius: Animated.add(anim.r, DEBORD),
        }}
      />

      {/* Anneau de surbrillance autour de la cible.
          🔴 LE RAYON N'EST PAS CELUI DE LA CIBLE, C'EST LE SIEN — corrigé le
          2026-08-12 (décision fondateur : « l'encadrement doit être de la même
          forme que le cercle »). L'anneau est plus GRAND que ce qu'il entoure
          (`PAD` tout autour) : lui donner le rayon de la cible à l'identique
          dessine un coin plus carré, et le décalage se voit d'autant plus que
          l'objet est petit. Pour garder la MÊME forme, le rayon suit la taille —
          d'où `+ PAD`. Une pastille ronde reste ronde, une carte reste une carte. */}
      <Animated.View
        style={{
          position: 'absolute', top: anim.y, left: anim.x, width: anim.w, height: anim.h,
          borderRadius: anim.r,
          borderWidth: Trait.controle, borderColor: t.accent,
          pointerEvents: 'none',
        }}
      />

      {/* Bulle d'explication. */}
      <Animated.View style={[s.bubble, { width: bubbleW, left: bubbleLeft, opacity: fondu }, bubblePos]}>{bulle}</Animated.View>
    </View>
  );
}

// ── La carte de la VISITE D'ONGLETS (2026-09-30) ─────────────────────────────
//
// Décision fondateur : « une seule visite qui montre toute l'app, bien fluide, sans
// trop d'excès de texte ». Ce que ce rendu change par rapport à la bulle centrée :
//  · l'écran reste VISIBLE — voile léger, pas le noir à 72 % qui cachait justement ce
//    qu'on présentait ;
//  · la BARRE D'ONGLETS reste vive : l'onglet présenté y est allumé par la navigation
//    elle-même, et la carte le POINTE ;
//  · une seule valeur porte le mouvement (`pos`, le rang de l'étape) : la carte, sa
//    pointe et les points de progression en dérivent, donc ils glissent ENSEMBLE d'un
//    onglet à l'autre — trois objets qui lisent la même chose, pas trois animations à
//    tenir d'accord.

/** Moins sombre que `DIM` : la visite MONTRE l'écran, la bulle centrée le cachait. */
const VOILE_VISITE = 'rgba(0,0,0,0.45)';
/** Côté du carré qui, tourné d'un huitième de tour, dessine la pointe de la carte. */
const POINTE = 16;
/** Points de progression : un point au repos, l'écart entre deux, et le trait de
 *  l'étape courante, qui GLISSE d'un point à l'autre par-dessus la rangée. */
const POINT = 6;
const ECART_POINTS = 8;
const POINT_ACTIF = 18;
/**
 * Hauteur de la carte tant qu'elle n'est pas mesurée (`onLayout`) : 188 pt relevés le
 * 2026-09-30 à 375 pt de large, texte sur deux lignes. Ne sert qu'au tout premier
 * arrêt, avant que la carte ne se soit posée ; ensuite c'est la mesure qui décide.
 */
const HAUTEUR_CARTE_ORDINAIRE = 190;

function CarteVisite({
  t, steps, index, isLast, onNext, onSkip, onAller, onHauteur,
}: {
  t: ThemePalette;
  steps: TourStep[];
  index: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
  onAller: (i: number) => void;
  /** Ce que la carte occupe : le moteur amène les cibles AU-DESSUS (arrêt du Plan). */
  onHauteur: (h: number) => void;
}) {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduire = useReduceMotion();
  const s = makeStyles(t);
  const step = steps[index];

  // Le centre de chaque onglet. La barre ne se mesure pas depuis une `Modal` : on
  // applique SA règle — des onglets à parts égales (`flex: 1`), entre deux marges
  // égales à la plus grande zone sûre latérale (le `BottomTabBar` d'expo-router).
  // Le rang vient de `ONGLETS`, que `visiteGuidee.test.ts` tient d'accord avec le layout.
  const marge = Math.max(insets.left, insets.right);
  const centre = (o: Onglet | undefined) => {
    const rang = Math.max(0, ONGLETS.indexOf(o ?? ONGLETS[0]));
    return marge + ((W - 2 * marge) * (rang + 0.5)) / ONGLETS.length;
  };
  // La carte suit son onglet sans sortir de l'écran (sur un téléphone, elle est déjà
  // pleine largeur : seule la pointe voyage) ; la pointe reste hors des coins arrondis.
  const largeur = Math.min(W - 32, BUBBLE_MAX_W);
  const gauches = steps.map((e) => clamp(centre(e.onglet) - largeur / 2, 16, W - 16 - largeur));
  const pointes = steps.map((e, i) =>
    clamp(centre(e.onglet) - gauches[i], Radius.card, largeur - Radius.card) - POINTE / 2);

  const pos = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(pos, {
      toValue: index,
      // 🔴 NATIF, ET C'EST TOUT LE POINT (2026-09-30). La première version faisait
      // bouger `left` et `width`, donc sur le fil JavaScript — celui-là même qui
      // construit l'onglet qu'on ouvre (la liste de courses, les recettes) à sa
      // première visite. Sur iPhone, la pointe aurait calé pile pendant ce travail.
      // Tout ce qui bouge ici bouge désormais par `translateX` : l'animation tourne à
      // part et ne peut plus attendre l'écran.
      useNativeDriver: true,
      ...ressortRN(ressortReduit(RESSORT.pose, reduire)),
    }).start();
  }, [index, reduire, pos]);
  // Une interpolation exige deux points d'entrée : une visite d'UNE étape reste posée.
  const suivre = (valeurs: number[]) => (valeurs.length > 1
    ? pos.interpolate({ inputRange: valeurs.map((_, i) => i), outputRange: valeurs })
    : valeurs[0]);

  // Le TEXTE, lui, ne glisse pas avec la carte : il change entièrement, donc il se POSE
  // (fondu + un léger décalage dans le sens de la marche). Même règle que la bulle :
  // ce qui informe reste, ce qui déplace se retire quand on réduit les animations.
  const fondu = useRef(new Animated.Value(0)).current;
  const decale = useRef(new Animated.Value(0)).current;
  const avant = useRef(index);
  useEffect(() => {
    const sens = index >= avant.current ? 1 : -1;
    avant.current = index;
    fondu.setValue(0);
    decale.setValue(reduire ? 0 : sens * Spacing.md);
    Animated.parallel([
      Animated.timing(fondu, { toValue: 1, duration: dureeReduite(DUREE.court, reduire), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(decale, { toValue: 0, duration: DUREE.court, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [index, reduire, fondu, decale]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Le voile couvre l'ÉCRAN, pas la barre. Il avale les taps : la visite montre,
          elle ne laisse pas cocher un repas par erreur au passage. */}
      <View style={[s.voile, { bottom: HAUTEUR_BARRE_ONGLETS }]} />

      {/* La barre, elle, reste vive ET touchable : un onglet tapé amène son arrêt. */}
      <View style={[s.barre, { height: HAUTEUR_BARRE_ONGLETS, paddingHorizontal: marge }]}>
        {ONGLETS.map((o) => {
          const i = steps.findIndex((e) => e.onglet === o);
          return (
            <Pressable
              key={o}
              testID={`visite-onglet-${o}`}
              style={s.onglet}
              disabled={i < 0}
              onPress={() => onAller(i)}
              accessibilityRole="button"
              accessibilityLabel={i >= 0 ? steps[i].title : undefined}
            />
          );
        })}
      </View>

      <Animated.View
        onLayout={(e) => onHauteur(e.nativeEvent.layout.height)}
        style={[s.carte, { width: largeur, bottom: HAUTEUR_BARRE_ONGLETS + Spacing.lg, transform: [{ translateX: suivre(gauches) }] }]}
      >
        <Animated.View style={{ opacity: fondu, transform: [{ translateX: decale }] }}>
          {/* Des points plutôt qu'un « 2 / 5 » : on voit où l'on en est sans rien lire.
              Le trait de l'étape courante glisse PAR-DESSUS la rangée (natif) : faire
              grandir un point demanderait d'animer sa largeur, sur le fil JavaScript. */}
          <View style={s.points}>
            {steps.map((_, i) => <View key={i} style={s.point} />)}
            <Animated.View
              style={[s.pointActif, {
                transform: [{ translateX: suivre(steps.map((_, i) => i * (POINT + ECART_POINTS))) }],
              }]}
            />
          </View>
          <Text style={s.title}>{step.title}</Text>
          <Text style={s.text}>{step.text}</Text>
          <View style={s.actions}>
            {/* « Passer » disparaît à la dernière étape : « C'est parti » y sort déjà. */}
            <Pressable testID="visite-passer" onPress={onSkip} hitSlop={8} accessibilityRole="button" disabled={isLast}>
              <Text style={s.skip}>{isLast ? '' : 'Passer'}</Text>
            </Pressable>
            <Pressable
              testID="visite-suivant"
              onPress={onNext}
              style={({ pressed }) => [s.nextBtn, pressed && { opacity: OPACITE_PRESSION }]}
              accessibilityRole="button"
            >
              <Text style={s.nextTxt}>{isLast ? "C'est parti" : 'Suivant'}</Text>
            </Pressable>
          </View>
        </Animated.View>
        {/* La pointe, APRÈS le contenu : elle recouvre le trait bas de la carte à son
            endroit, et ses deux côtés tracés le prolongent jusqu'à l'onglet. */}
        <Animated.View
          pointerEvents="none"
          style={[s.pointe, { transform: [{ translateX: suivre(pointes) }, { rotate: '45deg' }] }]}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Le CONTENU de la bulle, séparé de son placement.
 * ⚠️ Séparé pour une raison de fond, pas de rangement : il est rendu à DEUX
 * endroits — dans la bulle posée près de sa cible, et dans celle du repli sans
 * cible. Deux copies auraient divergé, et la première à perdre son « Passer »
 * aurait rendu le tour inquittable — le blocage même qu'on vient de corriger.
 */
function Bulle({
  s, step, index, total, isLast, onNext, onPrev, onSkip,
}: {
  /** Les styles du parent — pas le thème : `makeStyles` construit une feuille
   *  StyleSheet, et la rappeler ici la reconstruirait à chaque rendu de bulle. */
  s: ReturnType<typeof makeStyles>;
  step: TourStep;
  index: number;
  total: number;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      {/* Un « 1 / 1 » ne compte rien : il annonce une progression là où il n'y a
          pas de parcours. Le compteur n'apparaît qu'à partir de deux étapes —
          devenu visible quand le tour du Plan est passé à une seule bulle. */}
      {total > 1 && <Text style={s.counter}>{index + 1} / {total}</Text>}
      <Text style={s.title}>{step.title}</Text>
      <Text style={s.text}>{step.text}</Text>
      {/* Trois zones : « Passer » à gauche (sortie), « Précédent » au milieu
          (retour), « Suivant » à droite (avancée). « Précédent » n'occupe la
          place que s'il mène quelque part — un bouton inerte à la 1re étape se
          lit comme une panne. */}
      <View style={s.actions}>
        <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button">
          <Text style={s.skip}>{isLast ? '' : 'Passer'}</Text>
        </Pressable>
        <View style={s.rightActions}>
          {index > 0 && (
            <Pressable onPress={onPrev} hitSlop={8} accessibilityRole="button" style={s.prevBtn}>
              <Text style={s.prev}>Précédent</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [s.nextBtn, pressed && { opacity: OPACITE_PRESSION }]}
            accessibilityRole="button"
          >
            <Text style={s.nextTxt}>{isLast ? 'Terminer' : 'Suivant'}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    bubble: {
      position: 'absolute',
      backgroundColor: t.cardElevated,
      borderRadius: Radius.card,
      borderWidth: Trait.fin,
      borderColor: t.line,
      padding: Spacing.xl,
    },
    counter: { ...Type.overline, color: t.textTertiary, marginBottom: Spacing.sm },
    title: { color: t.text, ...Type.h3, marginBottom: Spacing.sm },
    text: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg },
    rightActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    skip: { ...Type.bodySmallStrong, color: t.textTertiary },
    prevBtn: { minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', paddingHorizontal: Spacing.sm },
    prev: { ...Type.bodySmallStrong, color: t.textSecondary },
    nextBtn: { backgroundColor: t.accent, borderRadius: Radius.button, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' },
    nextTxt: { ...Type.bodySmallStrong, color: t.onAccent },
    // ── Visite d'onglets ──
    voile: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: VOILE_VISITE },
    barre: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row' },
    onglet: { flex: 1 },
    carte: {
      position: 'absolute',
      left: 0,
      backgroundColor: t.cardElevated,
      borderRadius: Radius.card,
      borderWidth: Trait.fin,
      borderColor: t.line,
      padding: Spacing.xl,
    },
    // `paddingLeft` : le trait actif déborde de son point des deux côtés ; au premier
    // point, il s'aligne ainsi sur le titre au lieu de mordre dans la marge.
    points: { flexDirection: 'row', gap: ECART_POINTS, marginBottom: Spacing.md, paddingLeft: (POINT_ACTIF - POINT) / 2 },
    point: { width: POINT, height: POINT, borderRadius: Radius.pill, backgroundColor: t.accent, opacity: 0.35 },
    pointActif: { position: 'absolute', left: 0, top: 0, width: POINT_ACTIF, height: POINT, borderRadius: Radius.pill, backgroundColor: t.accent },
    pointe: {
      position: 'absolute',
      left: 0,
      bottom: -POINTE / 2,
      width: POINTE,
      height: POINTE,
      backgroundColor: t.cardElevated,
      borderRightWidth: Trait.fin,
      borderBottomWidth: Trait.fin,
      borderColor: t.line,
    },
  });
}
