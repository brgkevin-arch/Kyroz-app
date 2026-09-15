import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { recipeAllowed } from '../planEngine';
import { getEffectiveRecipes } from '../recipes';
import { recipeContainsFood } from '../avoidance';
import { libelleAutres, partagerCatalogue } from '../ordreCatalogue';

/**
 * LE CATALOGUE MONTRE CE QU'ON MANGE, LE RESTE DERRIÈRE UN BOUTON (décisions fondateur D38 et D39, 2026-09-15).
 *
 * Le profil sonde est celui du retour qui a ouvert le sujet : sans gluten, évite « quinoa »,
 * « polenta », « tofu ». Il voyait une poêlée de tofu au quinoa en tête du catalogue ; rangée
 * derrière, elle arrivait encore juste après six recettes dans la recherche « poêlée ».
 */
const CATALOGUE = getEffectiveRecipes();
const PROFIL = recalcProfile(makeProfile({
  dietary_restrictions: ['gluten_free'], disliked_foods: ['quinoa', 'polenta', 'tofu'],
}));

describe('le partage du catalogue', () => {
  const { servables, autres } = partagerCatalogue(CATALOGUE, PROFIL);

  it('devant, seulement ce que le plan peut servir ; derrière le bouton, tout le reste', () => {
    expect(servables.length, 'la sonde doit avoir des recettes des deux côtés').toBeGreaterThan(0);
    expect(autres.length).toBeGreaterThan(0);
    expect(servables.every((r) => recipeAllowed(r, PROFIL))).toBe(true);
    expect(autres.every((r) => !recipeAllowed(r, PROFIL))).toBe(true);
    // Le cas du retour : la poêlée de tofu au quinoa est derrière le bouton.
    expect(autres.some((r) => r.id === 'rep05')).toBe(true);
    expect(servables.some((r) => recipeContainsFood(r, 'tofu'))).toBe(false);
  });

  it('rien n’est supprimé : les deux groupes font tout le catalogue, une fois chaque recette', () => {
    const ids = [...servables, ...autres].map((r) => r.id);
    expect(ids.length).toBe(CATALOGUE.length);
    expect(new Set(ids).size).toBe(CATALOGUE.length);
  });

  it('dans chaque groupe, l’ordre du catalogue est gardé', () => {
    const rang = new Map(CATALOGUE.map((r, i) => [r.id, i]));
    const croissant = (l: typeof servables) => l.every((r, i) => i === 0 || rang.get(l[i - 1].id)! < rang.get(r.id)!);
    expect(croissant(servables)).toBe(true);
    expect(croissant(autres)).toBe(true);
  });

  it('sans profil, rien ne passe derrière le bouton', () => {
    const p = partagerCatalogue(CATALOGUE, null);
    expect(p.autres).toEqual([]);
    expect(p.servables.map((r) => r.id)).toEqual(CATALOGUE.map((r) => r.id));
  });
});

describe('le bouton de fin de liste', () => {
  it('dit combien il ouvre, et n’existe pas quand il n’ouvre rien', () => {
    expect(libelleAutres(4)).toBe('Voir les 4 recettes hors de tes préférences');
    expect(libelleAutres(1)).toBe('Voir la recette hors de tes préférences');
    expect(libelleAutres(0)).toBe('');
  });
});

describe('l’écran Recettes s’en sert', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'recettes.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('le Catalogue part du partage, et n’ajoute les autres que sur demande', () => {
    expect(src).toMatch(/partagerCatalogue\(recipes, profile\)/);
    expect(src).toMatch(/\[\.\.\.partage\.servables\.filter\(garde\), \.\.\.\(voirAutres \? autres : \[\]\)\]/);
  });

  it('le bouton arrive au bout des compatibles, et se referme quand la liste change', () => {
    expect(src).toMatch(/vue\.action === null && !voirAutres && autres\.length > 0/);
    expect(src).toMatch(/libelleAutres\(autres\.length\)/);
    expect(src).toMatch(/if \(voirAutres\) setVoirAutres\(false\)/);
  });

  it('le compteur annonce aussi ce qui est derrière le bouton', () => {
    expect(src).toMatch(/tous\.length \+ autres\.length/);
    expect(src).toMatch(/\$\{totalTrouve\} recette/);
  });
});
