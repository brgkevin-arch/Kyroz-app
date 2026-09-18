import { describe, it, expect } from 'vitest';
import { getEffectiveRecipes } from '../recipes';
import { foodKeywordMatches, recipeContainsFood } from '../avoidance';

/**
 * TROIS FAMILLES AJOUTÉES APRÈS AUDIT (décision fondateur, 2026-09-18).
 *
 * L'audit du champ « aliments évités » n'a trouvé ni faux positif ni faux négatif sur les
 * 126 ingrédients servis — mais trois mots que les gens ÉCRIVENT ne désignaient rien :
 * « charcuterie » (17 recettes), « viande rouge » (24), « légumineuses » (96). Le champ
 * l'annonçait (« aucun ingrédient ne correspond »), donc sans mensonge ; le besoin, lui,
 * n'était pas servi — et « légumineuses » est le mot d'un intestin sensible.
 *
 * ⚠️ Les deux EXCLUSIONS comptent autant que les inclusions, et ce sont elles que les
 * mutations gardent : le haricot VERT n'est pas une légumineuse (c'est une gousse qu'on
 * mange en légume), et le soja TRANSFORMÉ non plus (il a sa propre famille — sinon ce
 * seul mot viderait le catalogue végétal).
 */
const C = getEffectiveRecipes();
const compte = (kw: string) => foodKeywordMatches(C, kw);
const avec = (ref: string) => C.filter((r) => r.ingredients.some((i) => i.ref === ref));

describe('les trois familles', () => {
  it('« charcuterie » retire le jambon blanc, et rien d’autre', () => {
    expect(compte('charcuterie')).toBe(17);
    expect(avec('jambon_blanc').every((r) => recipeContainsFood(r, 'charcuterie'))).toBe(true);
  });

  it('…mais PAS le jambon végétal : ce mot désigne un produit de viande', () => {
    const vegetalSeul = avec('jambon_vegetal').filter((r) => !r.ingredients.some((i) => i.ref === 'jambon_blanc'));
    expect(vegetalSeul.length).toBeGreaterThan(0);
    for (const r of vegetalSeul) expect(recipeContainsFood(r, 'charcuterie'), r.name_fr).toBe(false);
  });

  it('« viande rouge » retire les deux bœufs, pas la volaille', () => {
    expect(compte('viande rouge')).toBe(24);
    const poulet = avec('poulet_filet').filter((r) => !r.ingredients.some((i) => (i.ref ?? '').startsWith('boeuf')));
    for (const r of poulet.slice(0, 15)) expect(recipeContainsFood(r, 'viande rouge'), r.name_fr).toBe(false);
  });

  it('« légumineuses » marche au singulier, au pluriel et avec l’article', () => {
    expect(compte('legumineuses')).toBe(98);
    expect(compte('legumineuse')).toBe(98);
    expect(compte('les legumineuses')).toBe(98);
  });
});

describe('ce que « légumineuses » ne doit PAS emporter', () => {
  it('le haricot VERT est un légume, pas une légumineuse', () => {
    const vertSeul = avec('haricots_verts').filter((r) => !r.ingredients.some((i) =>
      ['lentilles_corail', 'lentilles_cuites', 'pois_chiches_conserve', 'pois_casses', 'petits_pois', 'edamame',
        'haricots_rouges_conserve', 'haricots_noirs_conserve', 'haricots_blancs_conserve'].includes(i.ref ?? '')));
    expect(vertSeul.length, 'la sonde doit avoir des plats au haricot vert seul').toBeGreaterThan(0);
    for (const r of vertSeul) expect(recipeContainsFood(r, 'legumineuses'), r.name_fr).toBe(false);
  });

  it('le soja TRANSFORMÉ a sa propre famille — « légumineuses » ne vide pas le catalogue végétal', () => {
    const tofuSeul = C.filter((r) => r.ingredients.some((i) => (i.ref ?? '').startsWith('tofu'))
      && !r.ingredients.some((i) => ['lentilles_corail', 'lentilles_cuites', 'pois_chiches_conserve', 'pois_casses',
        'petits_pois', 'edamame', 'haricots_rouges_conserve', 'haricots_noirs_conserve', 'haricots_blancs_conserve'].includes(i.ref ?? '')));
    expect(tofuSeul.length).toBeGreaterThan(0);
    for (const r of tofuSeul) expect(recipeContainsFood(r, 'legumineuses'), r.name_fr).toBe(false);
    expect(compte('soja')).toBeGreaterThan(compte('legumineuses'));
  });

  it('les mots d’avant sont intacts', () => {
    expect(compte('lentilles')).toBe(18);
    expect(compte('tofu')).toBe(41);
    expect(compte('viande')).toBe(97);
    expect(compte('jambon')).toBe(31);
  });
});
