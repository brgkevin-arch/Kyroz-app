import { describe, it, expect } from 'vitest';
import {
  FOODS, findFood, searchFoods, macrosForQuantity, macrosFromIngredients, recipeMacrosPerPortion,
} from '../foods';
import { Ingredient } from '../types';

const poulet = FOODS.find((f) => f.name_fr === 'Blanc de poulet cuit')!;
const riz = FOODS.find((f) => f.name_fr === 'Riz blanc cuit')!;

describe('searchFoods', () => {
  it('insensible aux accents et à la casse', () => {
    const r = searchFoods('LENTILLE');
    expect(r.some((f) => f.name_fr === 'Lentilles vertes cuites')).toBe(true);
    expect(searchFoods('pates').some((f) => f.name_fr.startsWith('Pâtes'))).toBe(true);
  });

  it('classe le préfixe avant la sous-chaîne', () => {
    const r = searchFoods('poul'); // « Blanc de poulet » contient poul ; rien ne commence par poul
    expect(r[0].name_fr).toContain('poulet');
  });

  it('requête vide → début de la base', () => {
    expect(searchFoods('').length).toBeGreaterThan(0);
  });

  it('respecte la limite', () => {
    expect(searchFoods('cuit', 3).length).toBeLessThanOrEqual(3);
  });
});

describe('macrosForQuantity', () => {
  it('proportionnel à la quantité (/100 g)', () => {
    const m = macrosForQuantity(poulet, 200);
    expect(m.kcal).toBeCloseTo(poulet.per100g.kcal * 2, 5);
    expect(m.protein_g).toBeCloseTo(poulet.per100g.protein_g * 2, 5);
  });
});

describe('macrosFromIngredients', () => {
  it('somme les ingrédients liés à la base', () => {
    const ings: Ingredient[] = [
      { name: 'Poulet', quantity_g: 150, food_id: poulet.id },
      { name: 'Riz', quantity_g: 200, food_id: riz.id },
    ];
    const res = macrosFromIngredients(ings)!;
    const expected = Math.round(poulet.per100g.kcal * 1.5 + riz.per100g.kcal * 2);
    expect(res.macros.kcal).toBe(expected);
    expect(res.matchedRatio).toBe(1);
  });

  it('ignore les ingrédients non liés mais les compte dans matchedRatio', () => {
    const ings: Ingredient[] = [
      { name: 'Poulet', quantity_g: 100, food_id: poulet.id },
      { name: 'Épice maison', quantity_g: 100 }, // pas de food_id
    ];
    const res = macrosFromIngredients(ings)!;
    expect(res.macros.kcal).toBe(Math.round(poulet.per100g.kcal));
    expect(res.matchedRatio).toBeCloseTo(0.5, 5);
  });

  it('renvoie null si aucun ingrédient lié', () => {
    expect(macrosFromIngredients([{ name: 'X', quantity_g: 50 }])).toBeNull();
  });
});

describe('recipeMacrosPerPortion', () => {
  it('divise par le nombre de portions', () => {
    const ings: Ingredient[] = [{ name: 'Riz', quantity_g: 400, food_id: riz.id }];
    const whole = macrosFromIngredients(ings)!.macros;
    const per = recipeMacrosPerPortion(ings, 4)!.macros;
    expect(per.kcal).toBe(Math.round(whole.kcal / 4));
  });

  it('portions invalides → traité comme 1', () => {
    const ings: Ingredient[] = [{ name: 'Riz', quantity_g: 100, food_id: riz.id }];
    expect(recipeMacrosPerPortion(ings, 0)!.macros.kcal).toBe(Math.round(riz.per100g.kcal));
  });
});

describe('intégrité de la base', () => {
  it('ids uniques', () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('kcal cohérentes avec les macros (Atwater, tolérance fibres)', () => {
    // Smoke test anti-typo. Tolérance large car les glucides stockés sont NETS
    // (hors fibres) alors que les kcal Ciqual incluent l'énergie des fibres
    // (~2 kcal/g) — écart réel pour les aliments très fibreux (chia, graines).
    for (const f of FOODS) {
      const { kcal, protein_g, carbs_g, fat_g } = f.per100g;
      const computed = protein_g * 4 + carbs_g * 4 + fat_g * 9;
      const diff = Math.abs(computed - kcal);
      expect(diff, `${f.name_fr}: kcal=${kcal} calc=${computed}`).toBeLessThanOrEqual(kcal * 0.25 + 15);
    }
  });

  it('findFood retrouve par id, undefined sinon', () => {
    expect(findFood(FOODS[0].id)?.id).toBe(FOODS[0].id);
    expect(findFood('inconnu')).toBeUndefined();
    expect(findFood(undefined)).toBeUndefined();
  });
});
