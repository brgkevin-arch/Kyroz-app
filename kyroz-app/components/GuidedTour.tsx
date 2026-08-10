import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, useWindowDimensions, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Radius, ThemePalette, Type, Spacing, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
import { TourStep, TOURS } from '../lib/tours';

// ── Visite guidée (coachmark / spotlight) ────────────────────────────────────
// Overlay sombre qui « découpe » un trou autour d'un élément cible et affiche
// une bulle (titre + texte + Précédent / Suivant / Passer). Générique :
// n'importe quel écran pose `useTourTarget('…')` sur ses éléments puis appelle
// startTour(tourId, steps). « Déjà vu » mémorisé en AsyncStorage (@kyroz:tour:*).
//
// ⚠️ Ce fichier est le MOTEUR, pas le contenu : les étapes vivent dans
// `lib/tours.ts`, qui n'importe rien et se teste. Le moteur, lui, tire
// react-native et n'est vérifiable qu'à l'écran.

export type { TourStep } from '../lib/tours';

type Rect = { x: number; y: number; width: number; height: number };

interface TourOptions {
  /** ScrollView de l'écran : permet de défiler jusqu'à une cible hors écran. */
  scrollRef?: React.RefObject<any>;
}

type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void; measureLayout?: any; scrollIntoView?: any };

interface TourContextValue {
  /** Enregistre/retire la ref d'un élément cible (null = retrait). */
  register: (id: string, ref: React.RefObject<Measurable | null> | null) => void;
  /** Démarre un tour. Ne garde que les étapes dont la cible est montée. */
  startTour: (tourId: string, steps: TourStep[], opts?: TourOptions) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const STORAGE_PREFIX = '@kyroz:tour:';

/** Le tour a-t-il déjà été vu (terminé ou passé) ? */
export async function hasSeenTour(tourId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_PREFIX + tourId)) === 'done';
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
 * Rend un élément ciblable par la visite guidée. Renvoie une ref à brancher
 * DIRECTEMENT sur l'élément à surligner (`<View ref={ref}>`, `<TouchableOpacity
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
 * étoffé tenable — 22 bulles servies d'un coup au premier lancement seraient 22
 * interruptions ; réparties sur les onglets, chacune arrive quand la personne
 * regarde justement l'écran dont on lui parle.
 *
 * ⚠️ `steps` est un tableau NEUF à chaque rendu (les tours sont construits par
 * des fonctions). Le garder dans une ref est ce qui empêche l'effet de se
 * redéclencher en boucle — le mettre en dépendance relancerait le tour à chaque
 * frappe sur l'écran.
 */
export function useScreenTour(
  tourId: string,
  steps: TourStep[],
  opts?: { pret?: boolean; delai?: number; scrollRef?: React.RefObject<any> },
) {
  const { startTour } = useTour();
  const tried = useRef(false);
  const stepsRef = useRef(steps);
  const optsRef = useRef(opts);
  stepsRef.current = steps;
  optsRef.current = opts;

  const pret = opts?.pret ?? true;

  const lancer = useCallback(() => {
    startTour(tourId, stepsRef.current, { scrollRef: optsRef.current?.scrollRef });
  }, [tourId, startTour]);

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
    return () => { annule = true; if (timer) clearTimeout(timer); };
  }, [pret, tourId, lancer]);

  return { rejouer: lancer };
}

/**
 * Le « ? » de rejeu, à poser dans l'en-tête d'un écran qui a un tour. Il vivait
 * en dur dans l'en-tête du Plan, et seulement là : passer le tour d'un autre
 * onglet par réflexe le perdait À VIE, sans aucun recours. Un composant, pour
 * que le prochain écran à recevoir un tour ne puisse pas oublier sa porte de
 * sortie.
 */
export function TourButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      activeOpacity={OPACITE_PRESSION}
      accessibilityRole="button"
      accessibilityLabel="Revoir la visite guidée de cet écran"
    >
      <Ionicons name="help-circle-outline" size={Icone.nav} color={t.textTertiary} />
    </TouchableOpacity>
  );
}

const PAD = 6;             // marge du « trou » autour de la cible
const BUBBLE_MAX_W = 360;
const DIM = 'rgba(0,0,0,0.72)';

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
  const [rect, setRect] = useState<Rect | null>(null);

  const register = useCallback((id: string, ref: React.RefObject<Measurable | null> | null) => {
    if (ref) refs.current.set(id, ref);
    else refs.current.delete(id);
  }, []);

  const startTour = useCallback((tourId: string, steps: TourStep[], opts?: TourOptions) => {
    const avail = steps.filter((s) => refs.current.has(s.targetId));
    if (avail.length === 0) return;
    // ⚠️ Un tour AMPUTÉ est le défaut silencieux de ce filtre : une cible non
    // montée (parce qu'elle est conditionnelle, ou parce qu'un renommage l'a
    // détachée) fait disparaître son étape sans que rien ne le signale — le tour
    // se joue plus court et paraît complet. Certaines absences sont légitimes
    // (le bloc frigo n'existe pas quand le frigo est vide), d'où un simple
    // avertissement de développement plutôt qu'un blocage. Le garde-fou qui
    // compte vraiment est `lib/__tests__/visiteGuidee.test.ts`.
    if (__DEV__ && avail.length < steps.length) {
      const manquants = steps.filter((s) => !refs.current.has(s.targetId)).map((s) => s.targetId);
      console.warn(`[GuidedTour] tour « ${tourId} » amputé de ${manquants.length} étape(s) : ${manquants.join(', ')} — cible non montée.`);
    }
    scrollRef.current = opts?.scrollRef;
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
  }, []);

  // ℹ️ Ni `end` ni `next` ne marquent le tour : c'est `startTour` qui le fait, à
  // l'ouverture. Une seule source, et surtout la seule qui couvre les sorties que
  // ces deux-là ne voient pas (app tuée, onglet fermé). Les rétablir ici serait un
  // second endroit à tenir d'accord, pour un cas déjà couvert.
  const end = useCallback(() => {
    setActive(null);
    setRect(null);
  }, []);

  const next = useCallback(() => {
    setActive((cur) => {
      if (!cur) return cur;
      if (cur.index < cur.steps.length - 1) return { ...cur, index: cur.index + 1 };
      return null;
    });
  }, []);

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

  // Mesure la cible de l'étape courante (scroll si besoin, puis quelques essais
  // le temps que la mise en page se stabilise).
  useEffect(() => {
    if (!active) { setRect(null); return; }
    let cancelled = false;
    let tries = 0;
    const measure = () => {
      const node = refs.current.get(active.steps[active.index].targetId)?.current;
      if (!node) { retry(); return; }
      node.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        if (w === 0 && h === 0) { retry(); return; }
        setRect({ x, y, width: w, height: h });
      });
    };
    const retry = () => {
      tries += 1;
      if (tries <= 10) setTimeout(measure, 70);
    };
    const node = refs.current.get(active.steps[active.index].targetId)?.current;
    scrollIntoView(node, () => { if (!cancelled) measure(); });
    return () => { cancelled = true; };
  }, [active?.tourId, active?.index]);

  const step = active ? active.steps[active.index] : null;
  const isLast = active ? active.index === active.steps.length - 1 : false;

  return (
    <TourContext.Provider value={{ register, startTour }}>
      {children}
      <Modal visible={!!active} transparent animationType="fade" onRequestClose={end}>
        {step && (
          rect
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
  rect: Rect;
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

  // Trou (cible + marge), borné à l'écran.
  const cx = clamp(rect.x - PAD, 0, SCREEN_W);
  const cy = clamp(rect.y - PAD, 0, SCREEN_H);
  const cw = Math.min(rect.width + PAD * 2, SCREEN_W - cx);
  const ch = Math.min(rect.height + PAD * 2, SCREEN_H - cy);

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
      {/* 4 panneaux sombres autour du trou (la cible reste éclairée). */}
      <View style={[s.dim, { top: 0, left: 0, right: 0, height: cy }]} />
      <View style={[s.dim, { top: cy + ch, left: 0, right: 0, bottom: 0 }]} />
      <View style={[s.dim, { top: cy, left: 0, width: cx, height: ch }]} />
      <View style={[s.dim, { top: cy, left: cx + cw, right: 0, height: ch }]} />

      {/* Anneau de surbrillance autour de la cible. */}
      <View
        style={{
          position: 'absolute', top: cy, left: cx, width: cw, height: ch,
          borderRadius: Radius.card, borderWidth: Trait.controle, borderColor: t.accent,
          pointerEvents: 'none',
        }}
      />

      {/* Bulle d'explication. */}
      <View style={[s.bubble, { width: bubbleW, left: bubbleLeft }, bubblePos]}>
        <Text style={s.counter}>{index + 1} / {total}</Text>
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
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    dim: { position: 'absolute', backgroundColor: DIM },
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
  });
}
