import { describe, it, expect } from 'vitest';
import { isStaple, categorize, addOrMerge, removeItem, deductRecipe, PantryItem } from '../pantry';
import { Recipe, ShoppingItem } from '../types';

// Reproduit la logique du toggle de l'écran Courses (courses.tsx) : cocher un
// article l'envoie au frigo, décocher l'en retire, les condiments sont ignorés.
function applyCheck(pantry: PantryItem[], item: ShoppingItem, willCheck: boolean): PantryItem[] {
  if (isStaple(item.name)) return pantry;
  return willCheck
    ? addOrMerge(pantry, { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category })
    : removeItem(pantry, item.name, item.unit);
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
