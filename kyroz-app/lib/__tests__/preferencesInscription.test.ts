import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── CE QUE LE FONDATEUR A DEMANDÉ LE 2026-09-08, ET QUI DOIT LE RESTER ───────
//
// Quatre demandes nées d'une lecture du build (17) à l'écran. Aucune n'était
// couverte : le seul test de ces étapes vérifie qu'on peut en SORTIR, pas ce
// qu'elles montrent. Un défaut de mise en page ne se lit pas dans une expression
// régulière — mais son ABSENCE de garde-fou, si.
//
// ⚠️ Ces tests lisent la SOURCE. C'est le contrôle le plus faible du dépôt et il
// faut le savoir : il attrape une suppression, pas une régression visuelle. Le
// vrai contrôle du rendu reste la capture au simulateur.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const onboarding = sansCommentaires(lire('app/(auth)/onboarding.tsx'));
const dislikes = sansCommentaires(lire('components/DislikedFoodsField.tsx'));

describe('l’étape « activité » respire', () => {
  it('le bloc des séances porte SON espacement, il ne l’hérite pas', () => {
    // 🔴 LE DÉFAUT (build 17) : ce `View` n'existe que pour porter un `onLayout`,
    // et il repartait donc à zéro là où `s.block` donne `gap` à tous les autres.
    // L'intertitre collait aux bulles, la ligne « ≈ N kcal » collait au bouton.
    const bloc = onboarding.match(/<View\s+style=\{\{ gap: Spacing\.\w+ \}\}\s+onLayout=\{\(e\) => \{ ySeances/s);
    expect(bloc, 'le View qui mesure les séances doit porter un `gap`').not.toBeNull();
  });
});

describe('l’étape « préférences » dit ce que le fondateur a demandé', () => {
  it('« Peu importe » existe AUSSI pour le régime, pas seulement pour les protéines', () => {
    expect(onboarding).toMatch(/selected=\{regimeLibre\}/);
    expect(onboarding).toMatch(/setRegimeLibre/);
  });

  it('cocher un régime annule « Peu importe » — les deux ne coexistent pas', () => {
    expect(onboarding).toMatch(/setRegimeLibre\(false\);\s*toggle\(restrictions/);
  });

  it('la phrase « passe avant tout le reste » a disparu', () => {
    expect(onboarding).not.toContain('passe avant tout le reste');
  });
});

describe('« Aliments à éviter » ne propose plus de liste', () => {
  it('aucun aliment n’est écrit en dur dans le composant', () => {
    for (const mot of ['Saumon', 'Thon', 'Brocolis', 'Avocat', 'Quinoa', 'Patate douce']) {
      expect(dislikes, `« ${mot} » ne doit plus être proposé en bulle`).not.toContain(mot);
    }
  });

  it('…mais ce qui est DÉJÀ enregistré reste affiché et retirable', () => {
    // Sans ça, retirer les bulles ferait disparaître en silence les aliments
    // qu'un profil existant avait cochés : ils resteraient actifs dans le moteur,
    // invisibles à l'écran, donc impossibles à défaire.
    expect(dislikes).toMatch(/custom\.map/);
    expect(dislikes).toMatch(/const custom = value;/);
  });

  it('la saisie libre, elle, est toujours là', () => {
    expect(dislikes).toMatch(/onSubmitEditing=\{add\}/);
  });
});
