import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemePalette } from '../constants/theme';
import { Chip, Field, SectionLabel } from './ui';

// Aliments courants proposés en un tap. `kw` = mot-clé écrit tel quel dans
// `disliked_foods` (UserProfile) → filtre DUR par sous-chaîne dans le moteur
// (cf. lib/planEngine.ts recipeAllowed). Minuscules obligatoires (compare en lower).
const COMMON: { label: string; kw: string }[] = [
  { label: 'Saumon', kw: 'saumon' }, { label: 'Thon', kw: 'thon' }, { label: 'Œufs', kw: 'œuf' },
  { label: 'Brocolis', kw: 'brocolis' }, { label: 'Avocat', kw: 'avocat' }, { label: 'Quinoa', kw: 'quinoa' },
  { label: 'Patate douce', kw: 'patate douce' },
];
const COMMON_KW = new Set(COMMON.map((c) => c.kw));

// Normalise un mot-clé saisi : trim + minuscules (le filtre moteur compare en lower).
const normalizeKw = (s: string): string => s.trim().toLowerCase();

/**
 * Éditeur « Aliments à éviter » : chips courants + SAISIE LIBRE.
 * Chaque entrée est un mot-clé stocké dans `disliked_foods`, filtre DUR par
 * sous-chaîne dans le moteur. La saisie libre couvre les allergènes hors liste
 * (arachide, fruits à coque, crustacés, soja, sésame…) — sujet sécurité.
 * Partagé onboarding ↔ profil (source unique des aliments courants).
 */
export function DislikedFoodsField({
  t, value, onChange,
}: { t: ThemePalette; value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const toggle = (kw: string) =>
    onChange(value.includes(kw) ? value.filter((x) => x !== kw) : [...value, kw]);

  const add = () => {
    const kw = normalizeKw(draft);
    if (kw && !value.includes(kw)) onChange([...value, kw]);
    setDraft('');
  };

  // Entrées libres = celles qui ne correspondent à aucun chip courant.
  const custom = value.filter((kw) => !COMMON_KW.has(kw));

  return (
    <>
      <SectionLabel t={t}>Aliments à éviter</SectionLabel>
      <View style={styles.wrap}>
        {COMMON.map((d) => (
          <Chip key={d.kw} t={t} label={d.label} selected={value.includes(d.kw)} onPress={() => toggle(d.kw)} />
        ))}
        {custom.map((kw) => (
          <Chip key={kw} t={t} label={`${kw}  ✕`} selected onPress={() => toggle(kw)} />
        ))}
      </View>
      <Field
        t={t}
        label="Autre aliment ou allergène (arachide, crustacés…)"
        value={draft}
        onChangeText={setDraft}
        placeholder="Tape un aliment puis Entrée"
        returnKeyType="done"
        onSubmitEditing={add}
        blurOnSubmit={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
