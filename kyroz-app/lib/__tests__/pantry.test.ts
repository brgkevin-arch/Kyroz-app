import { describe, it, expect } from 'vitest';
import { isStaple, categorize, addOrMerge, subtractQuantity, deductRecipe, deductIngredients, PantryItem } from '../pantry';
import { Recipe, ShoppingItem } from '../types';

// Reproduit la logique du toggle de l'écran Courses (courses.tsx) : cocher un
// article l'ajoute au frigo, décocher retire SEULEMENT la quantité ajoutée (le
// stock saisi à la main est préservé), les condiments sont ignorés.
function applyCheck(pantry: PantryItem[], item: ShoppingItem, willCheck: boolean): PantryItem[] {
  if (isStaple(item.name)) return pantry;
  return willCheck
    ? addOrMerge(pantry, { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category })
    : subtractQuantity(pantry, item.name, item.unit, item.quantity);
}

const shopItem = (over: Partial<ShoppingItem> = {}): ShoppingItem => ({
  name: 'Poulet', quantity: 500, unit: 'g', category: 'viandes', checked: false, ...over,
});

describe('Courses → Frigo (cocher = ajouter, décocher = retirer)', () => {
  it('cocher un article l’ajoute au garde-manger', () => {
    const after = applyCheck([], shopItem(), true);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ name: 'Poulet', quantity: 500, unit: 'g', category: 'viandes' });
  });

  it('décocher le retire du garde-manger', () => {
    const stocked = applyCheck([], shopItem(), true);
    const after = applyCheck(stocked, shopItem(), false);
    expect(after).toHaveLength(0);
  });

  it('décocher préserve le stock pré-existant (200 g + 300 g cochés → 500 g, puis décoché → 200 g)', () => {
    const stock: PantryItem[] = [{ name: 'Poulet', quantity: 200, unit: 'g', category: 'viandes' }];
    const stocked = applyCheck(stock, shopItem({ quantity: 300 }), true);
    expect(stocked[0].quantity).toBe(500);
    const after = applyCheck(stocked, shopItem({ quantity: 300 }), false);
    expect(after).toHaveLength(1);
    expect(after[0].quantity).toBe(200); // on ne retire que les 300 g du cochage
  });

  it('un même article coché 2 fois cumule les quantités', () => {
    let p = applyCheck([], shopItem({ quantity: 500 }), true);
    p = applyCheck(p, shopItem({ quantity: 300 }), true);
    expect(p).toHaveLength(1);
    expect(p[0].quantity).toBe(800);
  });

  it('un condiment (sel, huile…) n’encombre PAS le frigo', () => {
    expect(isStaple('Sel')).toBe(true);
    expect(applyCheck([], shopItem({ name: 'Sel, poivre' }), true)).toHaveLength(0);
  });

  it('le bœuf va dans « viandes » (et pas dans laitiers via « œuf »)', () => {
    expect(categorize('Bœuf haché 5%')).toBe('viandes');
    expect(categorize('Œufs')).toBe('laitiers');
  });
});

describe('« J’ai cuisiné » → déduction du frigo (deductRecipe)', () => {
  const recipe = (): Recipe => ({
    id: 'r1', name_fr: 'Poulet riz', prep_time_min: 15, portions: 1,
    macros_per_portion: { kcal: 500, protein_g: 40, carbs_g: 50, fat_g: 10 },
    ingredients: [
      { name: 'Poulet', quantity_g: 150 },
      { name: 'Riz', quantity_g: 80 },
      { name: 'Sel', quantity_g: 2 },
    ],
    steps: [], tags: ['lunch'], validated_by_dietitian: false,
  });

  it('déduit les ingrédients × portions, ignore les condiments', () => {
    const pantry: PantryItem[] = [
      { name: 'Poulet', quantity: 500, unit: 'g', category: 'viandes' },
      { name: 'Riz', quantity: 200, unit: 'g', category: 'féculents' },
    ];
    const after = deductRecipe(pantry, recipe(), 2); // 2 portions → 300 poulet, 160 riz
    expect(after.find((i) => i.name === 'Poulet')!.quantity).toBe(200);
    expect(after.find((i) => i.name === 'Riz')!.quantity).toBe(40);
  });

  it('retire l’article quand le stock tombe à ~0', () => {
    const pantry: PantryItem[] = [{ name: 'Poulet', quantity: 150, unit: 'g', category: 'viandes' }];
    const after = deductRecipe(pantry, recipe(), 1);
    expect(after.find((i) => i.name === 'Poulet')).toBeUndefined();
  });
});

// 🔴 DÉFAUT DU 2026-09-21 : la déduction soustrayait des GRAMMES à un stock saisi en
// PIÈCES. 3 bananes − 120 g = −117 → la ligne disparaissait : un repas d'une banane
// vidait la réserve des trois. La conversion est celle de la couverture (`stockPour`),
// et ce qui ne se convertit pas ne se déduit pas.
describe('Déduction : l’unité du stock est respectée', () => {
  it('3 bananes en pièces, un repas en consomme 120 g → il en reste 2', () => {
    const pantry: PantryItem[] = [{ name: 'Banane', quantity: 3, unit: 'pièce', category: 'autres' }];
    const after = deductIngredients(pantry, [{ name: 'Banane', quantity_g: 120, unit: 'g' }]);
    const banane = after.find((i) => i.name === 'Banane');
    expect(banane).toBeDefined();
    expect(banane!.unit).toBe('pièce');
    expect(banane!.quantity).toBe(2);
  });

  it('un stock en pièces reste arrondi au demi (6 œufs − 100 g → 4, pas 4,18)', () => {
    const pantry: PantryItem[] = [{ name: 'Œuf entier', quantity: 6, unit: 'pièce', category: 'laitiers' }];
    const after = deductIngredients(pantry, [{ name: 'Œuf entier', quantity_g: 100, unit: 'g' }]);
    expect(after.find((i) => i.name === 'Œuf entier')!.quantity).toBe(4);
  });

  it('une demi-banane consommée laisse 2,5 bananes', () => {
    const pantry: PantryItem[] = [{ name: 'Banane', quantity: 3, unit: 'pièce', category: 'autres' }];
    const after = deductIngredients(pantry, [{ name: 'Banane', quantity_g: 60, unit: 'g' }]);
    expect(after.find((i) => i.name === 'Banane')!.quantity).toBe(2.5);
  });

  it('pièces d’un aliment au poids inconnu : rien n’est déduit, la ligne reste', () => {
    const pantry: PantryItem[] = [{ name: 'Courgette', quantity: 2, unit: 'pièce', category: 'légumes' }];
    const after = deductIngredients(pantry, [{ name: 'Courgette', quantity_g: 200, unit: 'g' }]);
    expect(after).toEqual(pantry);
  });

  it('grammes contre millilitres : incomparable, rien n’est déduit', () => {
    const pantry: PantryItem[] = [{ name: 'Lait demi-écrémé', quantity: 500, unit: 'g', category: 'laitiers' }];
    const after = deductIngredients(pantry, [{ name: 'Lait demi-écrémé', quantity_g: 200, unit: 'ml' }]);
    expect(after).toEqual(pantry);
  });

  it('deux lignes du même aliment : on déduit de celle qui se compare, pas de la première venue', () => {
    const pantry: PantryItem[] = [
      { name: 'Courgette', quantity: 2, unit: 'pièce', category: 'légumes' },
      { name: 'Courgette', quantity: 300, unit: 'g', category: 'légumes' },
    ];
    const after = deductIngredients(pantry, [{ name: 'Courgette', quantity_g: 200, unit: 'g' }]);
    expect(after.find((i) => i.unit === 'pièce')!.quantity).toBe(2);
    expect(after.find((i) => i.unit === 'g')!.quantity).toBe(100);
  });

  it('sans unité précisée, le besoin est en grammes (comme la couverture)', () => {
    const pantry: PantryItem[] = [{ name: 'Banane', quantity: 3, unit: 'pièce', category: 'autres' }];
    const after = deductIngredients(pantry, [{ name: 'Banane', quantity_g: 240 }]);
    expect(after.find((i) => i.name === 'Banane')!.quantity).toBe(1);
  });
});

describe('subtractQuantity (décochage symétrique de addOrMerge)', () => {
  const poulet = (q: number): PantryItem => ({ name: 'Poulet', quantity: q, unit: 'g', category: 'viandes' });

  it('décrémente la quantité sans toucher au reste de l’article', () => {
    const after = subtractQuantity([poulet(500)], 'Poulet', 'g', 300);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ name: 'Poulet', quantity: 200, unit: 'g', category: 'viandes' });
  });

  it('supprime l’entrée quand la quantité atteint exactement 0', () => {
    expect(subtractQuantity([poulet(300)], 'Poulet', 'g', 300)).toHaveLength(0);
  });

  it('ne descend jamais sous 0 : si on retire plus que le stock, l’entrée disparaît', () => {
    const after = subtractQuantity([poulet(100)], 'Poulet', 'g', 300);
    expect(after).toHaveLength(0); // jamais de quantité négative
  });

  it('laisse le garde-manger intact si l’article est absent', () => {
    const before = [poulet(200)];
    const after = subtractQuantity(before, 'Riz', 'g', 50);
    expect(after).toEqual(before);
  });

  it('n’affecte pas un article de même nom mais d’unité différente', () => {
    const before: PantryItem[] = [{ name: 'Œufs', quantity: 6, unit: 'pièce', category: 'laitiers' }];
    const after = subtractQuantity(before, 'Œufs', 'g', 50); // unité 'g' ≠ 'pièce'
    expect(after).toEqual(before);
  });

  it('matche malgré accents/casse/ligature (norm, comme addOrMerge)', () => {
    const before: PantryItem[] = [{ name: 'Œufs', quantity: 12, unit: 'pièce', category: 'laitiers' }];
    const after = subtractQuantity(before, 'OEUFS', 'pièce', 4); // « OEUFS » ↔ « Œufs » via norm
    expect(after[0].quantity).toBe(8);
  });

  it('est pur : ne mute pas le tableau d’origine', () => {
    const before = [poulet(500)];
    subtractQuantity(before, 'Poulet', 'g', 300);
    expect(before[0].quantity).toBe(500);
  });
});
