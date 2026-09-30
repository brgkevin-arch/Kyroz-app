import { describe, it, expect } from 'vitest';
import { OBJ_LABEL } from '../recipeLabels';
import { goalLabel } from '../tdee';

// Un même objectif, un même mot (2026-09-30) : l'étiquette des recettes disait
// « Perte de gras » quand l'inscription et le Profil disent « Sèche ».
describe('les étiquettes de recettes parlent comme l’objectif choisi', () => {
  it('sèche et maintien portent le libellé de l’objectif', () => {
    expect(OBJ_LABEL.cut).toBe(goalLabel('cut'));
    expect(OBJ_LABEL.maintain).toBe(goalLabel('maintain'));
  });
});
