import { describe, it, expect } from 'vitest';
import { matches, memeAliment, refDuNom, deductIngredients, recipeCoverage, PantryItem } from '../pantry';
import { buildShoppingList } from '../shoppingList';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { MealPlan, Recipe } from '../types';

// ── Pourquoi ce test existe ─────────────────────────────────────────────────
//
// LE DÉFAUT MESURÉ, le 2026-08-14 (signalé par le fondateur : « la carotte ne se
// range pas dans l'historique une fois les courses terminées »). Il cochait la
// carotte, elle partait au frigo, et elle revenait sur la liste au recalcul
// suivant : chaque « Courses terminées » archivait UN article, en boucle.
//
// La cause : `matches()` apparie par inclusion DANS LES DEUX SENS, donc
// « Mélange wok (poivron/brocoli/carotte) » reconnaît « Carotte ». La
// soustraction du frigo parcourt les ingrédients dans l'ordre du plan ; le
// mélange passait d'abord et mangeait le stock de carotte.
//
// ⚠️ Rien ne PARAISSAIT cassé : la liste était juste « pas encore finie ». C'est
// le genre de défaut qu'aucune relecture n'attrape et qu'aucune capture ne
// montre — il fallait rejouer le calcul.

const ingredient = (name: string, quantity_g: number, ref?: string) =>
  ({ name, quantity_g, unit: 'g', ...(ref ? { ref } : {}) }) as any;

const repas = (id: string, ings: any[]) =>
  ({ id, day: 1, type: 'lunch', portions: 1, recipe: { id, name_fr: id, ingredients: ings } }) as any;

const plan = (...meals: any[]) => ({ id: 'p', days: 1, meals }) as unknown as MealPlan;

const stock = (name: string, quantity: number): PantryItem =>
  ({ name, quantity, unit: 'g', category: 'légumes' });

describe('Deux ingrédients du catalogue ne se confondent jamais', () => {
  it('AUCUN couple de refs différentes ne se reconnaît — balayage des 125 ingrédients', () => {
    const noms = Object.entries(RECIPE_INGREDIENTS).map(([ref, def]) => ({ ref, name: def.name }));
    const fautifs: string[] = [];
    for (const a of noms) {
      for (const b of noms) {
        if (a.ref !== b.ref && memeAliment(a.name, b.name)) fautifs.push(`${a.name} ⟷ ${b.name}`);
      }
    }
    expect(fautifs).toEqual([]);
  });

  it('la sonde sait dire OUI : le NOM seul, lui, en confond bien 9', () => {
    // Sans ce contre-contrôle, le test ci-dessus passerait aussi si `memeAliment`
    // rendait `false` pour tout le monde — c'est-à-dire si le frigo cessait
    // complètement de couvrir la liste de courses.
    const noms = Object.entries(RECIPE_INGREDIENTS).map(([ref, def]) => ({ ref, name: def.name }));
    const couples = new Set<string>();
    for (const a of noms) {
      for (const b of noms) {
        if (a.ref !== b.ref && matches(a.name, b.name)) couples.add([a.name, b.name].sort().join('|'));
      }
    }
    expect(couples.size).toBe(9);
  });

  it('les quatre confusions franchement fausses sont nommées', () => {
    for (const [a, b] of [
      ['Carotte', 'Mélange wok (poivron/brocoli/carotte)'],
      ['Brocoli', 'Mélange wok (poivron/brocoli/carotte)'],
      ['Poivron', 'Mélange wok (poivron/brocoli/carotte)'],
      ['Pomme', 'Pomme de terre'],
    ] as const) {
      expect(matches(a, b), `${a} / ${b} : le nom devrait les confondre`).toBe(true);
      expect(memeAliment(a, b), `${a} / ${b} : la ref ne devrait PAS les confondre`).toBe(false);
    }
  });

  it('un aliment se reconnaît toujours lui-même', () => {
    for (const def of Object.values(RECIPE_INGREDIENTS)) {
      expect(memeAliment(def.name, def.name)).toBe(true);
      expect(memeAliment(def.name.toUpperCase(), def.name.toLowerCase())).toBe(true);
    }
  });
});

describe('Ce qui est SAISI À LA MAIN garde l’appariement souple', () => {
  it('« oeufs » retrouve encore « Œufs entiers » — ligatures et pluriel', () => {
    expect(memeAliment('oeufs', 'Œufs entiers')).toBe(true);
    expect(memeAliment('Poulet', 'Blanc de poulet')).toBe(true);
  });

  it('un nom inconnu du catalogue n’a pas de ref, donc retombe sur le nom', () => {
    expect(refDuNom('Bidule que personne ne vend')).toBeUndefined();
    expect(refDuNom('Carotte')).toBe('carotte');
    expect(refDuNom('  cArOtTe ')).toBe('carotte');
  });
});

describe('Le défaut d’origine, rejoué de bout en bout', () => {
  const planCarotte = plan(
    // Le mélange passe AVANT la carotte : c'est l'ordre du plan qui décidait.
    repas('wok', [ingredient('Mélange wok (poivron/brocoli/carotte)', 130)]),
    repas('houmous', [ingredient('Carotte', 120)]),
  );

  it('la carotte cochée QUITTE la liste, et le mélange garde sa quantité entière', () => {
    const liste = buildShoppingList(planCarotte, [stock('Carotte', 120)]);
    const noms = liste.items.map((i) => i.name);
    expect(noms).not.toContain('Carotte');
    const wok = liste.items.find((i) => i.name.startsWith('Mélange wok'));
    expect(wok?.quantity).toBe(130);
  });

  it('frigo vide → les deux sont à acheter ; frigo plein → la liste est vide', () => {
    expect(buildShoppingList(planCarotte, []).items).toHaveLength(2);
    expect(buildShoppingList(planCarotte, [
      stock('Carotte', 120),
      stock('Mélange wok (poivron/brocoli/carotte)', 130),
    ]).items).toHaveLength(0);
  });

  it('cuisiner un wok ne mange pas les carottes du frigo', () => {
    const apres = deductIngredients(
      [stock('Carotte', 120), stock('Mélange wok (poivron/brocoli/carotte)', 130)],
      [{ name: 'Mélange wok (poivron/brocoli/carotte)', quantity_g: 130 }],
    );
    expect(apres.find((i) => i.name === 'Carotte')?.quantity).toBe(120);
    expect(apres.find((i) => i.name.startsWith('Mélange wok'))).toBeUndefined();
  });

  it('avoir des pommes de terre ne fait pas croire qu’on a des pommes', () => {
    const recette = { id: 'r', name_fr: 'r', ingredients: [ingredient('Pomme', 150)] } as unknown as Recipe;
    const c = recipeCoverage(recette, [stock('Pomme de terre', 500)]);
    expect(c.have).toBe(0);
    expect(c.missing.map((i) => i.name)).toEqual(['Pomme']);
  });
});
