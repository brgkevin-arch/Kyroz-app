import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getEffectiveRecipes } from '../recipes';
import { foodKeywordMatches, normalizeFood, recipeContainsFood, suggestionsAliments } from '../avoidance';

/**
 * « ALIMENTS À ÉVITER » PROPOSE LES SORTES QUE LE CATALOGUE CONNAÎT (demande fondateur, 2026-09-15).
 *
 * « S'il y a écrit tofu, il doit être proposé tous les mots commençant par TOFU qui sont
 * répertoriés. » Né d'un retour : une personne sans gluten avait écrit « tofu » et en
 * voyait encore. Mesuré sur ses captures, le champ n'y était pour rien — son plan de
 * 420 repas n'en contenait aucun, le tofu venait du Catalogue, laissé non filtré par
 * décision. Les suggestions servent la PRÉCISION : éviter le tofu fumé sans perdre le
 * tofu ferme, éviter le poulet sans perdre le poulet végétal.
 */
const CATALOGUE = getEffectiveRecipes();

describe('ce que la frappe propose', () => {
  it('« tofu » propose les trois sortes du catalogue, et rien d’autre', () => {
    expect(suggestionsAliments(CATALOGUE, 'tofu')).toEqual(['Tofu ferme', 'Tofu fumé', 'Tofu soyeux']);
    // Casse, accents et début de frappe ne changent rien.
    expect(suggestionsAliments(CATALOGUE, '  TOF')).toEqual(['Tofu ferme', 'Tofu fumé', 'Tofu soyeux']);
  });

  it('même règle que le moteur : un DÉBUT de mot — « œuf » ne propose pas le bœuf', () => {
    const boeuf = CATALOGUE.flatMap((r) => r.ingredients.map((i) => i.name)).filter((n) => /\bboeuf/.test(normalizeFood(n)));
    expect(boeuf.length, 'la sonde doit avoir un bœuf à ne PAS proposer').toBeGreaterThan(0);
    const oeuf = suggestionsAliments(CATALOGUE, 'œuf');
    expect(oeuf.length, 'la sonde doit savoir dire OUI').toBeGreaterThan(0);
    for (const nom of oeuf) expect(normalizeFood(nom)).toMatch(/(?:^|[^a-z0-9])oeuf/);
    // Un mot au milieu du nom compte : « poulet » propose aussi les poulets végétaux.
    expect(suggestionsAliments(CATALOGUE, 'poulet').length).toBeGreaterThan(1);
  });

  it('une seule lettre ne propose rien', () => {
    expect(suggestionsAliments(CATALOGUE, 't')).toEqual([]);
    expect(suggestionsAliments(CATALOGUE, '')).toEqual([]);
  });

  it('ce qu’un mot enregistré couvre déjà n’est plus proposé', () => {
    expect(suggestionsAliments(CATALOGUE, 'tofu', ['tofu fumé'])).toEqual(['Tofu ferme', 'Tofu soyeux']);
    expect(suggestionsAliments(CATALOGUE, 'tofu', ['Tofu'])).toEqual([]);
  });
});

describe('ce qu’une suggestion vaut une fois choisie', () => {
  it('aucune suggestion n’est un mot sans effet : chacune écarte au moins une recette', () => {
    const noms = new Set(CATALOGUE.flatMap((r) => r.ingredients.map((i) => i.name.trim())));
    const proposes = new Set(['to', 'po', 'ch', 'la', 'fr', 'sa', 'ha', 'pa', 'ri', 'le'].flatMap((f) => suggestionsAliments(CATALOGUE, f)));
    expect(proposes.size).toBeGreaterThan(20);
    for (const nom of proposes) {
      expect(noms.has(nom), nom).toBe(true);
      expect(foodKeywordMatches(CATALOGUE, nom.toLowerCase()), nom).toBeGreaterThan(0);
    }
  });

  it('une sorte choisie n’écarte QUE cette sorte — le mot entier les écarte toutes', () => {
    const avec = (nom: string) => CATALOGUE.filter((r) => r.ingredients.some((i) => i.name === nom)).map((r) => r.id).sort();
    const fume = CATALOGUE.filter((r) => recipeContainsFood(r, 'tofu fumé')).map((r) => r.id).sort();
    expect(fume).toEqual(avec('Tofu fumé'));
    expect(CATALOGUE.filter((r) => recipeContainsFood(r, 'tofu')).length).toBeGreaterThan(fume.length);
  });
});

describe('le champ s’en sert', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'components', 'DislikedFoodsField.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('les suggestions sortent du catalogue, et les toucher les enregistre', () => {
    expect(src).toMatch(/suggestionsAliments\(recipes, draft, value\)/);
    expect(src).toMatch(/suggestions\.map\(\(nom\) =>[\s\S]*?onPress=\{\(\) => choisir\(nom\)\}/);
  });
});
