import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { SEUILS, sousLeSeuil, SEUIL_MIN, SEUIL_MAX_PROTEINE, SEUIL_MAX_PAQUET, PART_DE_PORTION } from '../seuilAchat';

const ligne = (ref: string, quantity: number) => ({ name: RECIPE_INGREDIENTS[ref].name, quantity, unit: RECIPE_INGREDIENTS[ref].unit });

describe('seuil d’achat (E75) — la règle validée par le fondateur', () => {
  it('20 % d’une portion habituelle, jamais moins de 10 g', () => {
    for (const [ref, s] of Object.entries(SEUILS)) {
      expect(s.seuil, ref).toBeGreaterThanOrEqual(SEUIL_MIN);
      // Depuis le 2026-10-28 (segment 10, constat 3), aussi 15 % du plus petit paquet, plafonné à 20 g.
      if (s.role !== 'protein') expect(s.seuil, ref).toBeGreaterThanOrEqual(Math.max(SEUIL_MIN, 5 * Math.round((PART_DE_PORTION * s.portion) / 5)));
      if (s.role !== 'protein') expect(s.seuil, ref).toBeLessThanOrEqual(Math.max(SEUIL_MAX_PAQUET, SEUIL_MIN, 5 * Math.round((PART_DE_PORTION * s.portion) / 5)));
    }
  });

  it('au plus 15 g pour ce qui porte la protéine du plat (2026-10-20)', () => {
    const proteines = Object.entries(SEUILS).filter(([, s]) => s.role === 'protein');
    expect(proteines.length).toBeGreaterThan(30);
    for (const [ref, s] of proteines) expect(s.seuil, ref).toBeLessThanOrEqual(SEUIL_MAX_PROTEINE);
    expect(SEUILS.poulet_filet.seuil).toBe(15);
    expect(SEUILS.merguez_vegetale.role).toBe('protein');
  });

  // 🔴 AMENDÉ le 2026-10-28 (segment 10, constat 3, fondateur : « 15 g d'amandes, ça peut être un
  // repas »). Le seuil ne cache plus une petite quantité : il dépend de ce qu'il y a DÉJÀ en réserve.
  it('rien de cet aliment chez soi : la ligne reste, même petite — c’est peut-être tout le repas', () => {
    expect(sousLeSeuil(ligne('amandes', 15))).toBe(false);
    expect(sousLeSeuil(ligne('noisettes', 5))).toBe(false);
    expect(sousLeSeuil(ligne('sirop_erable', 15))).toBe(false);
    expect(sousLeSeuil(ligne('poulet_filet', 15))).toBe(false);
    expect(sousLeSeuil(ligne('pesto', 25))).toBe(false);
  });

  it('…sauf une miette (< 10 g) d’un aliment FRAIS : un paquet entier se jetterait pour 5 g', () => {
    expect(sousLeSeuil(ligne('feta', 5))).toBe(true);
    expect(sousLeSeuil(ligne('feta', 10))).toBe(false);
  });

  it('paquet entamé, aliment FRAIS : le manque part jusqu’au seuil (on finit le paquet)', () => {
    expect(sousLeSeuil(ligne('poulet_filet', 15), true)).toBe(true);
    expect(sousLeSeuil(ligne('poulet_filet', 20), true)).toBe(false);
    expect(sousLeSeuil(ligne('feta', 20), true)).toBe(true);
    expect(sousLeSeuil(ligne('feta', 25), true)).toBe(false);
  });

  it('paquet entamé, aliment qui SE GARDE : il ne part que s’il manque une misère (≤ 10 g)', () => {
    expect(sousLeSeuil(ligne('amandes', 10), true)).toBe(true);
    expect(sousLeSeuil(ligne('amandes', 15), true)).toBe(false);
    expect(sousLeSeuil(ligne('galette_riz', 15), true)).toBe(false);
    expect(sousLeSeuil(ligne('riz_complet', 40), true)).toBe(false);
    // Le lait UHT et le pesto en bocal se gardent : 50 ml de lait manquants, on en rachète.
    expect(sousLeSeuil(ligne('lait_demi_ecreme', 50), true)).toBe(false);
    // « 30 g de pesto, c'est un repas » : il en manque 25 g, la ligne reste ; 10 g, elle part.
    expect(sousLeSeuil(ligne('pesto', 10), true)).toBe(true);
    expect(sousLeSeuil(ligne('pesto', 25), true)).toBe(false);
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
    expect(src).toMatch(/const garder = \(items: ShoppingItem\[\]\) => items\.filter\(\(i\) => !sousLeSeuil\(i, dejaLa\(i\)\)\);/);
    // Et le seuil sait ce qu'il y a déjà en réserve.
    expect(src).toMatch(/const dejaLa = \(i: ShoppingItem\) => pantry\.some\(\(p\) => p\.quantity > 0 && memeAliment\(p\.name, i\.name\)\);/);
    expect(src).toMatch(/const enCours = garder\(brute\.items\);/);
    expect(src).toMatch(/items: fusionner\(garder\(articlesDeLaSuivante\(lesDeux\.items, enCours\)\)/);
    expect(src).toMatch(/const l: ShoppingList = \{ \.\.\.brute, items: enCours \};/);
    expect(src.indexOf('!sousLeSeuil(i, dejaLa(i))')).toBeLessThan(src.indexOf('AsyncStorage.setItem(LIST_KEY, JSON.stringify(l))'));
  });
});
