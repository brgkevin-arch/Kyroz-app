import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Radius, Spacing, Type, cardShadow, Icone, OPACITE_PRESSION } from '../constants/theme';
import { ActionSheet } from './ActionSheet';
import { Segmented, SectionLabel } from './ui';
import { HydratationIcon } from './Icons';

// --- Feature test : suivi d'hydratation (jetable). Tout est isolé ici ;
// pour retirer la feature il suffit de supprimer ce fichier + son import/usage
// dans app/(tabs)/plan.tsx. ---

const DEFAULT_GOAL_ML = 2000;  // objectif du jour, en ml (2 L)
const DEFAULT_GLASS_ML = 250;  // ml / verre

const GOAL_OPTIONS = [
  { label: '1,5 L', value: 1500 },
  { label: '2 L', value: 2000 },
  { label: '2,5 L', value: 2500 },
  { label: '3 L', value: 3000 },
];
const GLASS_OPTIONS = [200, 250, 330, 500].map((v) => ({ label: String(v), value: v }));

// Litres « propres » : 2000 → « 2 », 1500 → « 1,5 », 750 → « 0,75 ».
const fmtL = (ml: number) => (ml / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') || '0';

// Clé du compteur du jour (date locale) → repart à 0 chaque jour, sans reset explicite.
function todayKey() {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `@kyroz:hydration:${stamp}`;
}
// Réglages (persistants, pas par jour).
const GOAL_PREF_KEY = '@kyroz:hydration:goalMl';
const GLASS_PREF_KEY = '@kyroz:hydration:glassMl';
const ENABLED_KEY = '@kyroz:hydration:enabled';

// ── Préférence « afficher la barre d'hydratation » ───────────────────────────
// Réglage d'APPAREIL, comme le thème et la couleur d'accent — donc même patron
// qu'eux : un petit store hors React (`useSyncExternalStore`), chargé une fois au
// démarrage dans le layout racine. Tout écran qui le lit se re-rend à la bascule.
//
// ⚠️ MASQUÉE PAR DÉFAUT depuis le 2026-08-06 (décision fondateur). Le suivi de
// l'eau n'est pas le cœur du produit : il s'ajoutait de lui-même sur l'écran le
// plus lu, entre les macros du jour et les repas. C'est à l'utilisateur de le
// demander, pas à l'app de l'imposer.
// Stockage : '1' = affiché, sinon (absent ou '0') = masqué.
//
// 🔴 CE STORE REMPLACE UN `useFocusEffect` QUI NE MARCHAIT PAS — et le défaut était
// DORMANT. L'ancienne version partait de `true` puis relisait la clé « à chaque
// focus d'écran » ; cette relecture n'atteignait jamais l'écran Plan. Tant que le
// défaut valait « affiché », personne ne pouvait s'en apercevoir : la carte était
// là, pour la seule raison qu'elle l'était au montage. Inverser le défaut a réveillé
// le défaut d'un coup — l'interrupteur du Profil écrivait bien `1` en stockage et
// n'allumait rien, y compris après un rechargement complet (mesuré le 2026-08-06).
// ➡️ Un réglage lu par un AUTRE écran que celui qui le pose ne se relit pas « au
// focus » : il se DIFFUSE. Les deux autres réglages d'appareil le faisaient déjà.
//
// ⚠️ Conséquence assumée du changement de défaut : quelqu'un qui s'en servait SANS
// avoir jamais touché l'interrupteur n'a rien d'enregistré, et voit donc la carte
// disparaître. Ses verres du jour ne sont pas perdus pour autant — ils vivent sous
// une autre clé (`@kyroz:hydration:<date>`) et réapparaissent s'il réactive le suivi.

let hydrationEnabled = false;
const hydrationListeners = new Set<() => void>();

export function getHydrationEnabled(): boolean {
  return hydrationEnabled;
}

export function setHydrationEnabled(next: boolean) {
  if (next === hydrationEnabled) return;
  hydrationEnabled = next;
  AsyncStorage.setItem(ENABLED_KEY, next ? '1' : '0').catch(() => {});
  hydrationListeners.forEach((l) => l());
}

export function subscribeHydrationEnabled(listener: () => void) {
  hydrationListeners.add(listener);
  return () => hydrationListeners.delete(listener);
}

/** Charge la préférence persistée au démarrage (appelé une fois dans le layout racine). */
export async function loadHydrationEnabled() {
  const raw = await AsyncStorage.getItem(ENABLED_KEY);
  const next = raw === '1';
  if (next !== hydrationEnabled) {
    hydrationEnabled = next;
    hydrationListeners.forEach((l) => l());
  }
}

export function useHydrationEnabled(): [boolean, (v: boolean) => void] {
  const enabled = useSyncExternalStore(subscribeHydrationEnabled, getHydrationEnabled, getHydrationEnabled);
  return [enabled, setHydrationEnabled];
}

export function HydrationBar() {
  const t = useTheme();
  const [count, setCount] = useState(0);          // nb de verres bus aujourd'hui
  const [goalMl, setGoalMl] = useState(DEFAULT_GOAL_ML);
  const [glassMl, setGlassMl] = useState(DEFAULT_GLASS_ML);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([todayKey(), GOAL_PREF_KEY, GLASS_PREF_KEY]).then((pairs) => {
      const map = Object.fromEntries(pairs);
      const c = parseInt(map[todayKey()] ?? '', 10);
      const g = parseInt(map[GOAL_PREF_KEY] ?? '', 10);
      const m = parseInt(map[GLASS_PREF_KEY] ?? '', 10);
      if (!Number.isNaN(c)) setCount(Math.max(0, c));
      if (!Number.isNaN(g)) setGoalMl(g);
      if (!Number.isNaN(m)) setGlassMl(m);
    });
  }, []);

  const glassesForGoal = Math.round(goalMl / glassMl); // verres ≈ pour atteindre l'objectif
  const consumedMl = count * glassMl;

  const updateCount = (next: number) => {
    const c = Math.max(0, Math.min(glassesForGoal + 4, next)); // garde-fou : jamais négatif, plafond souple
    setCount(c);
    AsyncStorage.setItem(todayKey(), String(c));
  };
  const updateGoal = (g: number) => { setGoalMl(g); AsyncStorage.setItem(GOAL_PREF_KEY, String(g)); };
  const updateGlass = (m: number) => { setGlassMl(m); AsyncStorage.setItem(GLASS_PREF_KEY, String(m)); };

  const pct = Math.min(1, consumedMl / goalMl);
  const done = consumedMl >= goalMl;

  return (
    <View style={[styles.card, { backgroundColor: t.card }, cardShadow(t)]}>
      <View style={styles.headRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <HydratationIcon color={t.text} size={16} />
          <Text style={[styles.title, { color: t.text }]}>Hydratation</Text>
        </View>
        <View style={styles.headRight}>
          <Text style={[styles.count, { color: t.textSecondary }]}>
            {fmtL(consumedMl)} / {fmtL(goalMl)} L · {count} verre{count > 1 ? 's' : ''}{done ? '  ✓' : ''}
          </Text>
          <TouchableOpacity
            onPress={() => setSettingsOpen(true)}
            hitSlop={10}
            accessibilityLabel="Réglages de l'hydratation"
          >
            <Ionicons name="options-outline" size={Icone.standard} color={t.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: t.fill }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: t.accent }]} />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => updateCount(count - 1)}
          style={[styles.btn, { backgroundColor: t.fill }]}
          hitSlop={8}
          accessibilityLabel="Retirer un verre"
        >
          <Text style={[styles.btnTxt, { color: t.text }]}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => updateCount(count + 1)}
          style={[styles.btn, styles.btnAdd, { backgroundColor: t.accent }]}
          hitSlop={8}
          accessibilityLabel="Ajouter un verre d'eau"
        >
          <Text style={[styles.btnTxt, { color: t.onAccent }]}>+ un verre</Text>
        </TouchableOpacity>
      </View>

      <ActionSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HydratationIcon color={t.text} size={20} />
          <Text style={[styles.sheetTitle, { color: t.text }]}>Hydratation</Text>
        </View>

        <View style={styles.sheetBlock}>
          <SectionLabel t={t}>Objectif du jour</SectionLabel>
          <Segmented t={t} options={GOAL_OPTIONS} value={goalMl} onChange={updateGoal} />
          <Text style={[styles.hint, { color: t.textTertiary }]}>
            {fmtL(goalMl)} L par jour · ≈ {glassesForGoal} verres de {glassMl} ml
          </Text>
        </View>

        <View style={styles.sheetBlock}>
          <SectionLabel t={t}>Taille du verre (ml)</SectionLabel>
          <Segmented t={t} options={GLASS_OPTIONS} value={glassMl} onChange={updateGlass} />
        </View>

        <TouchableOpacity
          onPress={() => setSettingsOpen(false)}
          style={[styles.doneBtn, { backgroundColor: t.accent }]}
          activeOpacity={OPACITE_PRESSION}
        >
          <Text style={[styles.btnTxt, { color: t.onAccent }]}>OK</Text>
        </TouchableOpacity>
      </ActionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Type.bodyStrong },
  count: { ...Type.captionStrong },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  controls: { flexDirection: 'row', gap: Spacing.sm },
  // `Radius.button` et pas `pill` : ces deux-là sont des BOUTONS. En pilule
  // pleine, « + un verre » était le seul objet complètement rond de l'écran Plan,
  // au milieu de blocs à 22 et de boutons à 14.
  // ⚠️ Et le rayon seul ne suffisait pas : à 34 pt de haut, 14 de rayon rend
  // encore une lozange. C'est la HAUTEUR qui était fausse — 44 pt est aussi le
  // minimum d'une cible tactile chez Apple, que `hitSlop` rattrapait au doigt
  // sans jamais le rattraper à l'œil.
  btn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center', minWidth: 48 },
  btnAdd: { flex: 1 },
  btnTxt: { ...Type.bodyStrong },
  sheetTitle: { ...Type.h2, marginBottom: Spacing.xs },
  sheetBlock: { gap: Spacing.sm },
  hint: { ...Type.captionStrong },
  doneBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.button, alignItems: 'center' },
});
