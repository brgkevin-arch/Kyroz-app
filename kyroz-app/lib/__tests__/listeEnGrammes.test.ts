import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { achatALaPiece } from '../formatsVendus';

/**
 * LA LISTE DIT LE BESOIN, LA RÉSERVE REÇOIT LE PAQUET ESTIMÉ (2026-10-24, décision fondateur :
 * « on lui dit qu'il lui faut 650 g de bœuf, il achète au plus proche »).
 */
const article = (ref: string, quantity: number) =>
  ({ name: RECIPE_INGREDIENTS[ref].name, quantity, unit: RECIPE_INGREDIENTS[ref].unit });
const COURSES = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'courses.tsx'), 'utf8');

describe('la liste en grammes', () => {
  it('ce qui se vend au poids n\'affiche pas de paquet : la ligne dit le besoin', () => {
    expect(achatALaPiece(article('boeuf_5', 650))).toBeNull();
    expect(achatALaPiece(article('riz_basmati', 320))).toBeNull();
  });

  it('ce qui se vend à la pièce dit combien en prendre (on n\'achète pas ⅔ de tomate)', () => {
    expect(achatALaPiece(article('courgette', 350))?.libelle).toBe('2 courgettes');
  });

  it('la ligne de l\'écran Courses n\'affiche plus le libellé du paquet', () => {
    expect(COURSES).not.toMatch(/achatPour\(/);
    expect(COURSES).toMatch(/achatALaPiece\(item\)/);
  });

  it('…mais la clôture range toujours le PAQUET estimé, pas le besoin', () => {
    expect(COURSES).toMatch(/quantity: quantiteRangee\(it\)/);
  });
});
