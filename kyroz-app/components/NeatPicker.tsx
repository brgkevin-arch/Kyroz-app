import React from 'react';
import { ThemePalette } from '../constants/theme';
import { OptionCard, SectionLabel } from './ui';
import { NeatLevel } from '../lib/types';
import { NEAT_ORDER, NEAT_LABEL } from '../lib/tdee';

// ── La question du NEAT — UN SEUL COMPOSANT POUR LES DEUX ÉCRANS ─────────────
//
// Même règle que `MealSlotsPicker` et pour la même raison : deux écrans qui posent
// le même réglage doivent le poser de la même façon, sinon il change de sens selon
// l'endroit où on l'ouvre. Ici l'enjeu est plus lourd qu'ailleurs — c'est le réglage
// le plus lourd de l'app (un cran ≈ 78 kcal/j de dépense, `desk` → `physical` 234,
// re-mesuré le 2026-08-18 sur 1 000 gabarits). Deux copies de ce bloc, c'est une
// copie qui dérive et un garde-fou qui ne garde plus qu'un écran sur deux.
//
// 🔴 ALLÉGÉ LE 2026-09-06 (décision fondateur) — ET ÇA RETIRE DEUX GARDE-FOUS DE
// RÉDACTION. Ce qui est parti, et ce que ça coûte :
//
// · le texte d'introduction (« Ce que tu dépenses sans y penser : boulot, trajets,
//   courses. Ne compte pas tes séances ici, elles sont comptées juste en dessous. »)
//   était la SEULE phrase qui interdisait le double-comptage sport / journées. Sans
//   elle, plus rien à l'écran ne dit de ne pas penser à ses séances en répondant ;
// · les descriptions (`NEAT_HINT`) portaient l'ancrage MÉTIER (« Bureau, télétravail,
//   conduite, études », « Commerce, soins, enseignement, restauration »). Il ne reste
//   que l'ancrage POSTURE, celui des `NEAT_LABEL`.
//
// ⚠️ `NEAT_HINT` (lib/tdee.ts) n'est donc PLUS AFFICHÉ NULLE PART, et
// `lib/__tests__/neat-libelles.test.ts` continue de le vérifier : ce test garde
// désormais un texte que personne ne lit. Ne pas en conclure que l'ancrage métier
// est encore servi. Le rétablir = remettre `subtitle={NEAT_HINT[lvl]}` ci-dessous.
//
// ⚠️ CE COMPOSANT SE PLACE TOUJOURS AVANT L'ÉDITEUR DE SÉANCES, dans les deux
// écrans. Le NEAT est la base sur laquelle le sport s'ajoute, et l'ordre inverse
// invite à répondre « je suis actif » en pensant à ses séances — qui sont déjà
// comptées juste en dessous. C'est désormais l'ORDRE SEUL qui porte cette
// distinction, la phrase qui la disait n'existant plus : l'inverser ne casserait
// plus aucun texte, et c'est précisément ce qui rend l'invariant fragile.
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
      {NEAT_ORDER.map((lvl) => (
        <OptionCard key={lvl} t={t} title={NEAT_LABEL[lvl]} selected={value === lvl} onPress={() => onChange(lvl)} />
      ))}
    </>
  );
}
