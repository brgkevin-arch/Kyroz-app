import { describe, it, expect } from 'vitest';
import { categorize } from '../pantry';
import { RECIPE_INGREDIENTS } from '../recipeData';

// Le rayon « Autres » était un fourre-tout (2026-09-30) : 58 aliments sur 139, dont des
// carottes, des pommes, du maquereau, du millet, de la mozzarella — et les champignons,
// attrapés par « pignon ».
describe('chaque aliment tombe dans son rayon', () => {
  it.each([
    ['Champignons', 'légumes'], ['Carotte', 'légumes'], ['Chou-fleur', 'légumes'],
    ['Pomme', 'légumes'], ['Kiwi', 'légumes'], ['Roquette', 'légumes'],
    ['Filet mignon de porc', 'viandes'], ['Maquereau', 'viandes'], ['Sardines (conserve égouttées)', 'viandes'],
    ['Millet', 'féculents'], ['Sarrasin', 'féculents'], ['Polenta', 'féculents'], ['Chapelure', 'féculents'],
    ['Mozzarella light', 'laitiers'],
    // Et ce qui reste en « Autres » y est à dessein : épicerie sèche.
    ['Dattes dénoyautées', 'autres'], ['Châtaigne', 'autres'], ['Amandes', 'autres'], ['Huile d\'olive', 'autres'],
  ])('%s → %s', (nom, rayon) => {
    expect(categorize(nom)).toBe(rayon);
  });

  it('« Autres » ne dépasse pas un tiers du catalogue', () => {
    const noms = Object.values(RECIPE_INGREDIENTS).map((d) => d.name);
    const autres = noms.filter((n) => categorize(n) === 'autres').length;
    expect(autres / noms.length).toBeLessThan(1 / 3);
  });
});
