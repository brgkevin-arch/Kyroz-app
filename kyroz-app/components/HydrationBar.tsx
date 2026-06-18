import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Radius, Spacing, cardShadow } from '../constants/theme';
import { ActionSheet } from './ActionSheet';
import { Segmented, SectionLabel } from './ui';

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

// Préférence « afficher la barre d'hydratation » (réglage dans l'onglet Profil).
// Re-lue à chaque focus d'écran → reste synchro entre l'onglet Profil et le Plan.
// Stockage : '0' = masqué, sinon (absent ou '1') = affiché par défaut.
export function useHydrationEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(true);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(ENABLED_KEY).then((v) => setEnabled(v !== '0'));
    }, []),
  );
  const set = (v: boolean) => {
    setEnabled(v);
    AsyncStorage.setItem(ENABLED_KEY, v ? '1' : '0');
  };
  return [enabled, set];
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
        <Text style={[styles.title, { color: t.text }]}>💧 Hydratation</Text>
        <View style={styles.headRight}>
          <Text style={[styles.count, { color: t.textSecondary }]}>
            {fmtL(consumedMl)} / {fmtL(goalMl)} L · {count} verre{count > 1 ? 's' : ''}{done ? '  ✓' : ''}
          </Text>
          <TouchableOpacity
            onPress={() => setSettingsOpen(true)}
            hitSlop={10}
            accessibilityLabel="Réglages de l'hydratation"
          >
            <Ionicons name="options-outline" size={20} color={t.textSecondary} />
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
        <Text style={[styles.sheetTitle, { color: t.text }]}>💧 Hydratation</Text>

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
          activeOpacity={0.85}
        >
          <Text style={[styles.btnTxt, { color: t.onAccent }]}>OK</Text>
        </TouchableOpacity>
      </ActionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: 15, fontWeight: '700' },
  count: { fontSize: 13, fontWeight: '600' },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  controls: { flexDirection: 'row', gap: Spacing.sm },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', minWidth: 48 },
  btnAdd: { flex: 1 },
  btnTxt: { fontSize: 15, fontWeight: '700' },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetBlock: { gap: Spacing.sm },
  hint: { fontSize: 12, fontWeight: '600' },
  doneBtn: { marginTop: Spacing.sm, paddingVertical: 14, borderRadius: Radius.pill, alignItems: 'center' },
});
