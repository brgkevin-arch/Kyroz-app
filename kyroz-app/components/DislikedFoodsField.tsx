import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemePalette } from '../constants/theme';
import { Chip, Field, SectionLabel } from './ui';
import { getEffectiveRecipes } from '../lib/recipes';
import { foodKeywordMatches, normalizeFood } from '../lib/avoidance';

// Aliments courants proposés en un tap. `kw` = mot-clé écrit tel quel dans
// `disliked_foods` (UserProfile) → filtre DUR dans le moteur (cf. lib/planEngine.ts
// recipeAllowed → lib/avoidance.ts recipeContainsFood).
const COMMON: { label: string; kw: string }[] = [
  { label: 'Saumon', kw: 'saumon' }, { label: 'Thon', kw: 'thon' }, { label: 'Œufs', kw: 'œuf' },
  { label: 'Brocolis', kw: 'brocolis' }, { label: 'Avocat', kw: 'avocat' }, { label: 'Quinoa', kw: 'quinoa' },
  { label: 'Patate douce', kw: 'patate douce' },
];
const COMMON_KW = new Set(COMMON.map((c) => c.kw));

// Normalise un mot-clé saisi : trim + minuscules. Le moteur, lui, compare en normalisé
// (ligatures et accents aplatis) — on stocke donc la frappe de l'utilisateur telle
// qu'il l'a écrite, c'est `recipeContainsFood` qui fait le rapprochement.
const normalizeKw = (s: string): string => s.trim().toLowerCase();

/**
 * Éditeur « Aliments à éviter » : chips courants + SAISIE LIBRE.
 *
 * ⚠️ Ce champ AFFICHE désormais ce qu'il attrape, et c'est le cœur du correctif du
 * 2026-08-02. Avant, un mot sans effet ne se voyait pas : mesuré sur les 123 refs du
 * catalogue, « arachide » et « crustacés » — les deux exemples que ce champ donnait
 * lui-même en placeholder — n'excluaient **aucune recette**. L'utilisateur croyait
 * s'être protégé. Un compteur qui dit « 29 recettes évitées » ou « aucun ingrédient
 * ne correspond » supprime ce mensonge silencieux.
 *
 * ⚠️ Ce n'est PAS une garantie allergène et le texte ne doit jamais le laisser croire :
 * le catalogue ignore les traces, la contamination croisée et la composition exacte des
 * produits industriels. Cf. `lib/avoidance.ts`.
 */
export function DislikedFoodsField({
  t, value, onChange,
}: { t: ThemePalette; value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const recipes = useMemo(() => getEffectiveRecipes(), []);
  const compte = useMemo(() => (kw: string) => foodKeywordMatches(recipes, kw), [recipes]);

  const toggle = (kw: string) =>
    onChange(value.includes(kw) ? value.filter((x) => x !== kw) : [...value, kw]);

  const add = () => {
    const kw = normalizeKw(draft);
    if (kw && !value.includes(kw)) onChange([...value, kw]);
    setDraft('');
  };

  // Entrées libres = celles qui ne correspondent à aucun chip courant.
  const custom = value.filter((kw) => !COMMON_KW.has(kw));
  // Mots déjà enregistrés qui n'excluent RIEN : ils donnent une fausse sécurité.
  const inertes = value.filter((kw) => compte(kw) === 0);
  const brouillon = normalizeFood(draft);
  const compteBrouillon = brouillon ? compte(brouillon) : null;

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
      {compteBrouillon !== null ? (
        <Text style={{ color: compteBrouillon === 0 ? t.textTertiary : t.textSecondary, fontSize: 13 }}>
          {compteBrouillon === 0
            ? `Aucun ingrédient ne correspond à « ${draft.trim()} » — ce mot n'écartera aucune recette.`
            : `« ${draft.trim()} » écarte ${compteBrouillon} recette${compteBrouillon > 1 ? 's' : ''} du catalogue.`}
        </Text>
      ) : null}
      {inertes.length ? (
        <Text style={{ color: t.textTertiary, fontSize: 13 }}>
          Sans effet, aucun ingrédient ne correspond : {inertes.join(', ')}.
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
