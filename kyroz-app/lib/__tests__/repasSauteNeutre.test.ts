import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effectiveMacros } from '../planEngine';
import type { Meal } from '../types';

// ── « SAUTÉ » EST UN FAIT, PAS UNE FAUTE ─────────────────────────────────────
//
// 🔴 CE QUI ÉTAIT AFFICHÉ, jusqu'au 2026-08-20. Le mécanisme demandé par le
// fondateur (tâche 9 : « un état pas-cuisiné posable en un geste, neutre
// visuellement ») existait déjà en entier — `skipMeal`, un tap depuis la fiche, la
// journée qui se recale, la série qui ne casse pas. C'est sa RÉDACTION VISUELLE qui
// disait le contraire du mécanisme :
//   · le surtitre opposait « ✓ MANGÉ » à « ⊘ SAUTÉ » — une récompense contre un
//     panneau d'interdiction, sur deux faits également neutres ;
//   · le nom du plat était BARRÉ, c'est-à-dire mis dans la grammaire de la tâche
//     rayée : une ligne de plus qu'on n'a pas faite.
// Une journée où l'on a mangé autrement se lisait donc comme une journée ratée —
// le signal de reproche que la charte interdit (CLAUDE.md §10).
//
// ⚠️ CE FICHIER VÉRIFIE LES FORMES NEUTRES, PAS L'ABSENCE DES SIGNES. Un test
// « le fichier ne contient plus ⊘ » rougirait sur la note datée qui explique le
// retrait — l'absence ne distingue pas une affirmation de son démenti. On fige donc
// ce qui DOIT être rendu ; y remettre un signe casse le littéral.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const carte = sansCommentaires(lire('components/MealCard.tsx'));
const fiche = sansCommentaires(lire('components/RecipeDetail.tsx'));
const plan = sansCommentaires(lire('app/(tabs)/plan.tsx'));

describe('les deux états de suivi sont rendus de la même façon', () => {
  it('le surtitre dit le mot, et rien de plus', () => {
    expect(carte).toContain("' · MANGÉ'");
    expect(carte).toContain("' · SAUTÉ'");
  });

  it('le nom du plat n’est jamais barré', () => {
    // On fige la forme NEUTRE : reconditionner le style sur `skipped` casse ce littéral.
    expect(carte).toContain('<Text style={[styles.name, { color: t.text }]}>');
  });

  it('l’atténuation traite « mangé » et « sauté » à l’identique', () => {
    // C'est elle qui dit « ce repas est réglé » — la même pour les deux, sinon l'un
    // des deux redevient un état de second rang.
    expect(carte).toMatch(/const muted = eaten \|\| skipped;/);
    expect(carte).toContain('opacity: muted ? 0.6 : 1');
  });

  it('la fiche repas sert les mêmes deux phrases, sans signe', () => {
    expect(fiche).toContain("'Marqué comme mangé'");
    expect(fiche).toContain("'Repas sauté — journée recalée'");
  });
});

describe('le barré reste là où il veut dire quelque chose', () => {
  it('un article de courses COCHÉ, lui, reste barré', () => {
    // Le retrait est ciblé, pas une chasse au style : sur une liste qu'on coche en
    // magasin, le barré est la grammaire juste — l'article est acheté, il sort de la
    // liste. Sur un repas, il juge une journée. Si ce littéral disparaît un jour,
    // que ce soit pour une raison à soi, pas par symétrie avec ce chantier-ci.
    expect(sansCommentaires(lire('app/(tabs)/courses.tsx'))).toContain("textDecorationLine: 'line-through'");
  });
});

describe('« sauté » est une information que le moteur utilise', () => {
  it('un repas sauté ne compte pas dans la journée', () => {
    // C'est ce qui rend l'état neutre DÉFENDABLE : il n'est pas une case non cochée,
    // il change le calcul. Le budget bascule sur les repas restants.
    const m = { status: 'skipped', macros: { kcal: 600, protein_g: 40, carbs_g: 50, fat_g: 20 } } as unknown as Meal;
    expect(effectiveMacros(m)).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('sauter un repas ne nourrit pas la série', () => {
    // La série compte des ouvertures (METRICS.md §2) : trois appels, et aucun dans
    // le geste « je l'ai sauté ». Un quatrième appel ici ferait d'un repas non
    // cuisiné une raison de féliciter — l'inverse exact de ce qu'on vient de retirer.
    const appels = [...plan.matchAll(/markActiveToday\(\)/g)];
    expect(appels.length, 'appels à markActiveToday()').toBe(3);
    const skip = plan.slice(plan.indexOf('const skipMeal'));
    expect(skip.slice(0, 260)).toContain("setMealStatus(meal, 'skipped')");
    expect(skip.slice(0, 260)).not.toContain('markActiveToday');
  });
});
