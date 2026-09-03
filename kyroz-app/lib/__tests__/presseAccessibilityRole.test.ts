import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── `Presse` NE LAISSE PLUS SON RÔLE À LA DISCRÉTION DE L'APPELANT ───────────
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, mesuré le 2026-09-02 en confrontant l'audit UX
// du 01 au dépôt. Son diagnostic (« tout est un `<div>` sans rôle ») décrivait le
// rendu WEB, pas VoiceOver — mais l'incohérence sous-jacente était réelle : sur 144
// sites `<Presse>`, 132 ne déclaraient AUCUN `accessibilityRole`, et 12 le
// déclaraient à la main, presque tous à `"button"`. Le composant qui existe
// PRÉCISÉMENT pour unifier ces pressables (cf. son propre en-tête, 2026-08-10)
// laissait son attribut le plus élémentaire d'accessibilité au hasard de l'appelant.
//
// ⚠️ Aucun moteur de rendu React Native n'est disponible dans cette suite
// (`vitest.config.ts` : `react-native` est un MOCK minimal, le paquet réel est en
// Flow, illisible par vitest). Comme `neatOnboarding.test.ts` et
// `sexeOnboarding.test.ts`, ce fichier éprouve la FORME du code source, pas un rendu.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const presse = sansCommentaires(lire('components/Presse.tsx'));

describe('le rôle par défaut', () => {
  it('`accessibilityRole` vaut `\'button\'` par défaut, à la déstructuration', () => {
    expect(presse).toMatch(/accessibilityRole\s*=\s*'button'/);
  });

  it('le rôle par défaut est bien PASSÉ au Pressable animé — pas seulement déclaré', () => {
    // Le piège d'une destructuration avec valeur par défaut : l'oublier dans le JSX
    // laisserait `accessibilityRole` dans `rest`... où il n'existe plus, puisqu'il
    // vient d'être sorti par la déstructuration. Un défaut déclaré et jamais transmis
    // rendrait CHAQUE site orphelin de rôle — le défaut exact que ce fichier ferme.
    expect(presse).toMatch(/<PressableAnime[\s\S]{0,80}accessibilityRole=\{accessibilityRole\}/);
  });

  it('un appelant explicite GAGNE toujours — la déstructuration ne force rien', () => {
    // `accessibilityRole` sort de `rest` : un appelant qui le passe l'assigne
    // directement au paramètre, la valeur par défaut ne s'applique alors jamais.
    // C'est du JavaScript, pas une règle de ce fichier — mais un site réel qui en
    // dépend (MealCard, `"link"`) le confirme ci-dessous.
    const mealCard = sansCommentaires(lire('components/MealCard.tsx'));
    expect(mealCard).toContain('accessibilityRole="link"');
  });
});

describe('ce que `Pressable` (React Native) fournit déjà — pour ne pas le refaire ici', () => {
  it('aucune gestion manuelle de `accessible` ou `accessibilityState.disabled`', () => {
    // `Pressable.js` merge `disabled` dans `accessibilityState` et met `accessible`
    // à `true` par défaut, tout seul. Les réécrire ici serait une seconde définition
    // qui peut diverger de celle de React Native au prochain upgrade.
    expect(presse).not.toMatch(/accessible=\{/);
    expect(presse).not.toMatch(/accessibilityState/);
  });
});
