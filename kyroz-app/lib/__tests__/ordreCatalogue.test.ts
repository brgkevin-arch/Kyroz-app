import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { recipeAllowed } from '../planEngine';
import { getEffectiveRecipes } from '../recipes';
import { recipeContainsFood } from '../avoidance';
import { ordreCatalogue } from '../ordreCatalogue';

/**
 * LE CATALOGUE MONTRE D'ABORD CE QU'ON MANGE, SANS RIEN CACHER (décision fondateur, 2026-09-15).
 *
 * Le profil sonde est celui du retour qui a ouvert le sujet : sans gluten, évite « quinoa »,
 * « polenta », « tofu ». Il voyait en tête de catalogue une poêlée de tofu au quinoa.
 */
const CATALOGUE = getEffectiveRecipes();
const PROFIL = recalcProfile(makeProfile({
  dietary_restrictions: ['gluten_free'], disliked_foods: ['quinoa', 'polenta', 'tofu'],
}));

describe('l’ordre du catalogue', () => {
  const ordre = ordreCatalogue(CATALOGUE, PROFIL);
  const premierRefus = ordre.findIndex((r) => !recipeAllowed(r, PROFIL));

  it('toutes les recettes que le plan peut servir passent avant les autres', () => {
    expect(premierRefus, 'la sonde doit avoir des recettes des deux côtés').toBeGreaterThan(0);
    expect(ordre.slice(0, premierRefus).every((r) => recipeAllowed(r, PROFIL))).toBe(true);
    expect(ordre.slice(premierRefus).every((r) => !recipeAllowed(r, PROFIL))).toBe(true);
    // Le cas du retour : la poêlée de tofu au quinoa n'est plus devant.
    expect(ordre.findIndex((r) => r.id === 'rep05')).toBeGreaterThanOrEqual(premierRefus);
    expect(ordre.slice(0, premierRefus).some((r) => recipeContainsFood(r, 'tofu'))).toBe(false);
  });

  it('rien n’est caché : toutes les recettes restent, une seule fois chacune', () => {
    expect(ordre.length).toBe(CATALOGUE.length);
    expect(new Set(ordre.map((r) => r.id)).size).toBe(CATALOGUE.length);
  });

  it('dans chaque groupe, l’ordre du catalogue est gardé', () => {
    const rang = new Map(CATALOGUE.map((r, i) => [r.id, i]));
    const croissant = (ids: number[]) => ids.every((v, i) => i === 0 || ids[i - 1] < v);
    expect(croissant(ordre.slice(0, premierRefus).map((r) => rang.get(r.id)!))).toBe(true);
    expect(croissant(ordre.slice(premierRefus).map((r) => rang.get(r.id)!))).toBe(true);
  });

  it('sans profil, l’ordre ne bouge pas', () => {
    expect(ordreCatalogue(CATALOGUE, null).map((r) => r.id)).toEqual(CATALOGUE.map((r) => r.id));
  });
});

describe('l’écran Recettes s’en sert', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'recettes.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('la liste « Catalogue » part de l’ordre, pas du catalogue brut', () => {
    expect(src).toMatch(/ordreCatalogue\(recipes, profile\)/);
    expect(src).toMatch(/\(surReserve \? parReserve\.map\(\(c\) => c\.recipe\) : catalogueOrdonne\)\.filter/);
  });
});
