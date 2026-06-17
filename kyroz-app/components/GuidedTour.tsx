import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Dimensions, ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Radius, ThemePalette } from '../constants/theme';

// ── Visite guidée (coachmark / spotlight) ────────────────────────────────────
// Overlay sombre qui « découpe » un trou autour d'un élément cible et affiche
// une bulle (titre + texte + Suivant / Passer). Générique : n'importe quel
// écran enveloppe ses éléments dans <TourTarget id="…"> puis appelle
// startTour(tourId, steps). « Déjà vu » mémorisé en AsyncStorage (@kyroz:tour:*).

export interface TourStep {
  targetId: string;
  title: string;
  text: string;
}

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
    scrollRef.current = opts?.scrollRef;
    setRect(null);
    setActive({ tourId, steps: avail, index: 0 });
  }, []);

  const end = useCallback(() => {
    setActive((cur) => {
      if (cur) markSeen(cur.tourId);
      return null;
    });
    setRect(null);
  }, []);

  const next = useCallback(() => {
    setActive((cur) => {
      if (!cur) return cur;
      if (cur.index < cur.steps.length - 1) return { ...cur, index: cur.index + 1 };
      markSeen(cur.tourId);
      return null;
    });
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
      const handle = typeof sv.getScrollableNode === 'function' ? sv.getScrollableNode() : sv;
      node.measureLayout(
        handle,
        (_x: number, y: number) => { sv.scrollTo({ y: Math.max(0, y - 120), animated: true }); setTimeout(done, 260); },
        () => done(),
      );
      return;
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
                total={active!.steps.length} isLast={isLast} onNext={next} onSkip={end} />
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
  t, rect, step, index, total, isLast, onNext, onSkip,
}: {
  t: ThemePalette;
  rect: Rect;
  step: TourStep;
  index: number;
  total: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
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
          borderRadius: Radius.md, borderWidth: 2, borderColor: t.accent,
          pointerEvents: 'none',
        }}
      />

      {/* Bulle d'explication. */}
      <View style={[s.bubble, { width: bubbleW, left: bubbleLeft }, bubblePos]}>
        <Text style={s.counter}>{index + 1} / {total}</Text>
        <Text style={s.title}>{step.title}</Text>
        <Text style={s.text}>{step.text}</Text>
        <View style={s.actions}>
          <Pressable onPress={onSkip} hitSlop={8}>
            <Text style={s.skip}>{isLast ? '' : 'Passer'}</Text>
          </Pressable>
          <Pressable onPress={onNext} style={s.nextBtn}>
            <Text style={s.nextTxt}>{isLast ? 'Terminer' : 'Suivant'}</Text>
          </Pressable>
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
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: t.line,
      padding: 18,
    },
    counter: { color: t.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    title: { color: t.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
    text: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
    skip: { color: t.textTertiary, fontSize: 14, fontWeight: '600' },
    nextBtn: { backgroundColor: t.accent, borderRadius: Radius.pill, paddingHorizontal: 22, paddingVertical: 10 },
    nextTxt: { color: t.onAccent, fontSize: 14, fontWeight: '700' },
  });
}
