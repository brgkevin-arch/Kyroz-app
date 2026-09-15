import { describe, it, expect } from 'vitest';
import { regimesJuges } from '../../scripts/mesure-couverture';
import { RAW_RECIPES } from '../recipeData';
import { restrictionsOkFor } from '../recipeDiet';

/**
 * D27.1 — SUR LES CIBLES DE QUI LE CONTRÔLE R8 JUGE UNE RECETTE (décision fondateur, 2026-09-15).
 *
 * « Cible végan, végétarien, pescé et tous ceux qui ne mangent pas de viande. » Une recette sans
 * viande est jugée sur les régimes sans viande qui la reçoivent, une recette avec viande sur
 * l'omnivore. Avant, tout était jugé sur l'omnivore : une recette végane était notée sur une
 * assiette qu'aucun végane ne reçoit depuis la détente protéique (`ENGINE_REV` 11).
 */
describe('D27.1 — le contrôle R8 juge une recette sur les régimes qui la mangent', () => {
  it('végane → végane, végétarien et pescétarien', () => {
    expect(regimesJuges(restrictionsOkFor(['tofu_ferme', 'riz_basmati']))).toEqual(['vegan', 'vegetarian', 'pescatarian']);
  });

  it('végétarien (laitage) → végétarien et pescétarien, jamais végane', () => {
    expect(regimesJuges(restrictionsOkFor(['oeuf_entier', 'riz_basmati']))).toEqual(['vegetarian', 'pescatarian']);
  });

  it('poisson → pescétarien seul', () => {
    expect(regimesJuges(restrictionsOkFor(['saumon', 'riz_basmati']))).toEqual(['pescatarian']);
  });

  it('viande → omnivore seul', () => {
    expect(regimesJuges(restrictionsOkFor(['poulet_filet', 'riz_basmati']))).toEqual(['omnivore']);
  });

  it('sur le catalogue réel : toute recette végane est jugée au moins sur les cibles véganes', () => {
    const veganes = RAW_RECIPES.filter((r) => restrictionsOkFor(r.ingredients.map((i) => i.ref)).includes('vegan'));
    expect(veganes.length).toBeGreaterThan(100);
    const mal = veganes.filter((r) => !regimesJuges(restrictionsOkFor(r.ingredients.map((i) => i.ref))).includes('vegan'));
    expect(mal.map((r) => r.id)).toEqual([]);
  });
});
