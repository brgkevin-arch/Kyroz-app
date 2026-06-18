import { describe, it, expect } from 'vitest';
import {
  FOODS, findFood, searchFoods, macrosForQuantity, macrosFromIngredients, recipeMacrosPerPortion,
  kcalMargin, DAILY_KCAL_MARGIN_PCT,
} from '../foods';
import { applyCuration, CurationConfig } from '../foods.curation';
import { Food, Ingredient } from '../types';

const first = FOODS[0];
const second = FOODS[1];

describe('searchFoods', () => {
  it('insensible aux accents et à la casse', () => {
    expect(searchFoods('PATES').some((f) => /p[âa]tes/i.test(f.name_fr))).toBe(true);
    expect(searchFoods('lentille').some((f) => /lentille/i.test(f.name_fr))).toBe(true);
  });

  it('le préfixe passe avant la sous-chaîne', () => {
    const r = searchFoods('riz');
    expect(r.length).toBeGreaterThan(0);
    // Au moins un résultat commence par « riz » et il arrive avant tout résultat
    // qui ne fait que contenir « riz » au milieu.
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const firstStarts = norm(r[0].name_fr).startsWith('riz');
    expect(firstStarts).toBe(true);
  });

  it('requête vide → début de la base, respecte la limite', () => {
    expect(searchFoods('').length).toBeGreaterThan(0);
    expect(searchFoods('e', 5).length).toBeLessThanOrEqual(5);
  });
});

describe('calcul des macros', () => {
  it('macrosForQuantity est proportionnel (/100 g)', () => {
    const m = macrosForQuantity(first, 200);
    expect(m.kcal).toBeCloseTo(first.per100g.kcal * 2, 5);
    expect(m.protein_g).toBeCloseTo(first.per100g.protein_g * 2, 5);
  });

  it('somme les ingrédients liés, ignore les non liés mais les compte dans matchedRatio', () => {
    const ings: Ingredient[] = [
      { name: 'A', quantity_g: 100, food_id: first.id },
      { name: 'B', quantity_g: 100, food_id: second.id },
      { name: 'Libre', quantity_g: 200 },
    ];
    const res = macrosFromIngredients(ings)!;
    const expected = Math.round(first.per100g.kcal + second.per100g.kcal);
    expect(res.macros.kcal).toBe(expected);
    expect(res.matchedRatio).toBeCloseTo(0.5, 5); // 200 g liés / 400 g total
  });

  it('renvoie null si aucun ingrédient lié', () => {
    expect(macrosFromIngredients([{ name: 'X', quantity_g: 50 }])).toBeNull();
  });

  it('recipeMacrosPerPortion divise par les portions', () => {
    const ings: Ingredient[] = [{ name: 'A', quantity_g: 400, food_id: first.id }];
    const whole = macrosFromIngredients(ings)!.macros;
    expect(recipeMacrosPerPortion(ings, 4)!.macros.kcal).toBe(Math.round(whole.kcal / 4));
    expect(recipeMacrosPerPortion(ings, 0)!.macros.kcal).toBe(whole.kcal); // 0 → traité comme 1
  });
});

describe('kcalMargin (marge honnête)', () => {
  it('applique le pourcentage et arrondit', () => {
    expect(kcalMargin(2000)).toBe(Math.round(2000 * DAILY_KCAL_MARGIN_PCT / 100));
  });
  it('jamais négatif', () => {
    expect(kcalMargin(0)).toBe(0);
    expect(kcalMargin(-500)).toBe(0);
  });
});

describe('intégrité du dataset Ciqual', () => {
  it('contient les ~3300 aliments officiels', () => {
    expect(FOODS.length).toBeGreaterThan(3000);
  });

  it('ids uniques et préfixés ciqual- (ANSES) ou kyroz- (ajouts)', () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(FOODS.every((f) => /^(ciqual|kyroz)-/.test(f.id))).toBe(true);
  });

  it('macros finies, positives, avec nom et catégorie', () => {
    for (const f of FOODS) {
      expect(f.name_fr.length).toBeGreaterThan(0);
      expect(f.category.length).toBeGreaterThan(0);
      for (const v of [f.per100g.kcal, f.per100g.protein_g, f.per100g.carbs_g, f.per100g.fat_g]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('findFood retrouve par id, undefined sinon', () => {
    expect(findFood(first.id)?.id).toBe(first.id);
    expect(findFood('inconnu')).toBeUndefined();
    expect(findFood(undefined)).toBeUndefined();
  });
});

describe('curation appliquée à la vraie base (FOODS)', () => {
  it('masque les catégories et motifs hors-sujet', () => {
    expect(FOODS.some((f) => f.category === 'aliments infantiles')).toBe(false);
    expect(FOODS.some((f) => /\bnectar\b/i.test(f.name_fr))).toBe(false); // jus sucrés
    expect(FOODS.some((f) => /pour b[ée]b[ée]/i.test(f.name_fr))).toBe(false);
  });

  it('ne sur-masque pas : la nectarine (fruit) reste', () => {
    expect(FOODS.some((f) => /nectarine/i.test(f.name_fr))).toBe(true);
  });

  it('renomme la banane principale, sans toucher ses macros', () => {
    const banane = findFood('ciqual-13005');
    expect(banane?.name_fr).toBe('Banane');
    expect(banane?.per100g.kcal).toBe(88); // valeur ANSES intacte
    expect(searchFoods('banane')[0].name_fr).toBe('Banane'); // remonte en tête
  });

  it('ajoute les aliments Kyroz absents de Ciqual, cherchables et marqués', () => {
    const whey = searchFoods('whey');
    expect(whey.length).toBeGreaterThan(0);
    expect(whey[0].source).toBe('kyroz');
    const skyr = findFood('kyroz-skyr');
    expect(skyr?.source).toBe('kyroz');
    expect(skyr?.per100g.protein_g).toBe(11);
  });
});

describe('applyCuration (pur)', () => {
  const macros = (kcal: number) => ({ kcal, protein_g: 1, carbs_g: 1, fat_g: 1 });
  const base: Food[] = [
    { id: 'ciqual-1', name_fr: 'Pomme', category: 'fruits', per100g: macros(50) },
    { id: 'ciqual-2', name_fr: 'Truc pour bébé', category: 'fruits', per100g: macros(60) },
    { id: 'ciqual-3', name_fr: 'Lait poudre', category: 'aliments infantiles', per100g: macros(70) },
    { id: 'ciqual-4', name_fr: 'Banane, chair sans peau, crue', category: 'fruits', per100g: macros(88) },
    { id: 'ciqual-5', name_fr: 'Aliment faux', category: 'fruits', per100g: macros(999) },
  ];
  const cfg: CurationConfig = {
    hiddenCategories: ['aliments infantiles'],
    hiddenPatterns: [/pour b[ée]b[ée]/i],
    hiddenIds: ['ciqual-5'],
    renames: { 'ciqual-4': 'Banane' },
    overrides: { 'ciqual-1': { kcal: 52 } },
    extraFoods: [{ id: 'kyroz-x', name_fr: 'Extra', category: 'divers', per100g: macros(10), source: 'kyroz' }],
  };
  const out = applyCuration(base, cfg);
  const byId = (id: string) => out.find((f) => f.id === id);

  it('retire catégorie, motif et id masqués', () => {
    expect(byId('ciqual-2')).toBeUndefined();
    expect(byId('ciqual-3')).toBeUndefined();
    expect(byId('ciqual-5')).toBeUndefined();
  });

  it('renomme sans changer les macros et garde la source ANSES', () => {
    const b = byId('ciqual-4')!;
    expect(b.name_fr).toBe('Banane');
    expect(b.per100g.kcal).toBe(88);
    expect(b.source).toBeUndefined();
  });

  it('override corrige la valeur et marque source kyroz', () => {
    const p = byId('ciqual-1')!;
    expect(p.per100g.kcal).toBe(52);
    expect(p.per100g.protein_g).toBe(1); // champ non fourni → inchangé
    expect(p.source).toBe('kyroz');
  });

  it('ajoute les aliments extra en fin de liste', () => {
    expect(byId('kyroz-x')?.source).toBe('kyroz');
    expect(out[out.length - 1].id).toBe('kyroz-x');
  });
});
