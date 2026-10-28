import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { SEUILS, sousLeSeuil, SEUIL_MIN, SEUIL_MAX_PROTEINE, PART_DE_PORTION } from '../seuilAchat';

const ligne = (ref: string, quantity: number) => ({ name: RECIPE_INGREDIENTS[ref].name, quantity, unit: RECIPE_INGREDIENTS[ref].unit });

describe('seuil d’achat (E75) — la règle validée par le fondateur', () => {
  it('20 % d’une portion habituelle, jamais moins de 10 g', () => {
    for (const [ref, s] of Object.entries(SEUILS)) {
      expect(s.seuil, ref).toBeGreaterThanOrEqual(SEUIL_MIN);
      if (s.role !== 'protein') expect(s.seuil, ref).toBe(Math.max(SEUIL_MIN, 5 * Math.round((PART_DE_PORTION * s.portion) / 5)));
    }
  });

  it('au plus 15 g pour ce qui porte la protéine du plat (2026-10-20)', () => {
    const proteines = Object.entries(SEUILS).filter(([, s]) => s.role === 'protein');
    expect(proteines.length).toBeGreaterThan(30);
    for (const [ref, s] of proteines) expect(s.seuil, ref).toBeLessThanOrEqual(SEUIL_MAX_PROTEINE);
    expect(SEUILS.poulet_filet.seuil).toBe(15);
    expect(SEUILS.merguez_vegetale.role).toBe('protein');
  });

  it('les cas du fondateur : 5–10 g de garniture disparaissent, un repas de pesto reste', () => {
    expect(sousLeSeuil(ligne('noisettes', 5))).toBe(true);
    expect(sousLeSeuil(ligne('cacao_poudre', 10))).toBe(true);
    expect(sousLeSeuil(ligne('pesto', 10))).toBe(true);
    // « 30 g de pesto, c'est un repas » : il en manque 25 g, la ligne reste.
    expect(sousLeSeuil(ligne('pesto', 25))).toBe(false);
    expect(sousLeSeuil(ligne('mozzarella', 25))).toBe(false);
  });

  it('un reste de poulet de 15 g disparaît, 20 g reste ; le lait, au-delà de 50 ml, reste', () => {
    expect(sousLeSeuil(ligne('poulet_filet', 15))).toBe(true);
    expect(sousLeSeuil(ligne('poulet_filet', 20))).toBe(false);
    expect(sousLeSeuil(ligne('lait_demi_ecreme', 50))).toBe(true);
    expect(sousLeSeuil(ligne('lait_demi_ecreme', 55))).toBe(false);
  });

  it('jamais caché : un ajout manuel, un aliment hors catalogue, une autre unité', () => {
    expect(sousLeSeuil({ ...ligne('noisettes', 5), manuel: true })).toBe(false);
    expect(sousLeSeuil({ name: 'Café', quantity: 5, unit: 'g' })).toBe(false);
    expect(sousLeSeuil({ name: RECIPE_INGREDIENTS.noisettes.name, quantity: 1, unit: 'pièce' })).toBe(false);
  });
});

describe('seuil d’achat — l’écran Courses s’en sert', () => {
  it('la liste générée passe par `sousLeSeuil` avant d’être affichée et mise en cache', () => {
    const src = readFileSync(join(__dirname, '../../app/(tabs)/courses.tsx'), 'utf8');
    // Depuis le 2026-10-28, les DEUX listes (semaine en cours et semaine d'après) passent par le seuil.
    expect(src).toMatch(/const garder = \(items: ShoppingItem\[\]\) => items\.filter\(\(i\) => !sousLeSeuil\(i\)\);/);
    expect(src).toMatch(/const enCours = garder\(brute\.items\);/);
    expect(src).toMatch(/items: garder\(articlesDeLaSuivante\(lesDeux\.items, enCours\)\)/);
    expect(src).toMatch(/const l: ShoppingList = \{ \.\.\.brute, items: enCours \};/);
    expect(src.indexOf('!sousLeSeuil(i)')).toBeLessThan(src.indexOf('AsyncStorage.setItem(LIST_KEY, JSON.stringify(l))'));
  });
});
