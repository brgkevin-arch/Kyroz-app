import React from 'react';
import { Text } from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { OptionCard, SectionLabel } from './ui';
import { NeatLevel } from '../lib/types';
import { NEAT_ORDER, NEAT_LABEL, NEAT_HINT } from '../lib/tdee';

// ── La question du NEAT — UN SEUL COMPOSANT POUR LES DEUX ÉCRANS ─────────────
//
// Même règle que `MealSlotsPicker` et pour la même raison : deux écrans qui posent
// le même réglage doivent le poser de la même façon, sinon il change de sens selon
// l'endroit où on l'ouvre. Ici l'enjeu est plus lourd qu'ailleurs — c'est le réglage
// le plus lourd de l'app (un cran ≈ 78 kcal/j de dépense, `desk` → `physical` 234,
// re-mesuré le 2026-08-18 sur 1 000 gabarits) et sa rédaction est un garde-fou :
// les libellés sont ancrés sur le MÉTIER et la POSTURE pour que personne n'ait à
// s'auto-évaluer, et `lib/__tests__/neat-libelles.test.ts` vérifie qu'ils ne parlent
// jamais de sport ni de banalités que tout le monde fait. Deux copies de ce bloc,
// c'est une copie qui dérive et un garde-fou qui ne garde plus qu'un écran sur deux.
//
// ⚠️ CE COMPOSANT SE PLACE AVANT L'ÉDITEUR DE SÉANCES, dans les deux écrans. Le
// NEAT est la base sur laquelle le sport s'ajoute, et l'ordre inverse invite à
// répondre « je suis actif » en pensant à ses séances — qui sont déjà comptées
// juste en dessous. Le texte d'introduction le dit littéralement (« juste en
// dessous ») : le déplacer sous les séances rendrait cette phrase fausse.
//
// `value` accepte `null` : à l'inscription rien n'est présélectionné, parce qu'une
// valeur pré-cochée est une valeur non répondue qui se fait passer pour une réponse
// — et c'est exactement le défaut que poser la question corrige.
export function NeatPicker({
  t, value, onChange,
}: {
  t: ThemePalette;
  value: NeatLevel | null;
  onChange: (n: NeatLevel) => void;
}) {
  return (
    <>
      <SectionLabel t={t}>TES JOURNÉES, HORS SPORT</SectionLabel>
      <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18, marginBottom: Spacing.xs }}>
        Ce que tu dépenses sans y penser : boulot, trajets, courses. Ne compte pas tes séances ici, elles sont comptées juste en dessous.
      </Text>
      {NEAT_ORDER.map((lvl) => (
        <OptionCard key={lvl} t={t} title={NEAT_LABEL[lvl]} subtitle={NEAT_HINT[lvl]} selected={value === lvl} onPress={() => onChange(lvl)} />
      ))}
    </>
  );
}
