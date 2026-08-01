import { describe, it, expect } from 'vitest';
import { buildLocalPlan } from '../planEngine';
import { recalcProfile } from '../tdee';
import { getEffectiveRecipes } from '../recipes';
import { recipeContainsFood, normalizeFood, foodKeywordMatches } from '../avoidance';
import type { Recipe, UserProfile } from '../types';

/**
 * Aliments évités — familles, ligatures, et le piège `bœuf` ⊃ `œuf` (2026-08-02).
 *
 * `disliked_foods` est un filtre DUR. Avant ce correctif, la comparaison était une
 * sous-chaîne brute sur le nom affiché de l'ingrédient : mesuré sur les 123 refs du
 * catalogue, « poisson » n'attrapait AUCUN des 7 poissons, « arachide » ni le beurre de
 * cacahuète, « fruits à coque » aucun des 5 oléagineux — alors que le champ propose
 * lui-même « arachide, crustacés… » en exemple. L'utilisateur croyait s'être protégé.
 *
 * Symétriquement, la sous-chaîne attrapait TROP : `bœuf` contient `œuf`, donc éviter les
 * œufs retirait 23 des 24 plats de bœuf, en silence aussi.
 *
 * ⚠️ Ce n'est pas un filtre allergène et ces tests ne prétendent pas le contraire :
 * ils vérifient que ce qui est annoncé est ce qui est servi, rien de plus.
 */
const CATALOGUE = getEffectiveRecipes();
const parRefs = (refs: string[]): Recipe[] =>
  CATALOGUE.filter((r) => r.ingredients.some((i) => i.ref !== undefined && refs.includes(i.ref)));

const gabarit = (evites: string[]): UserProfile => recalcProfile({
  id: 'test', sex: 'male', age: 30, weight_kg: 80, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'maintain', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: evites, preferred_proteins: [],
} as UserProfile);

describe('aliments évités', () => {
  it('normalise ligatures et accents', () => {
    expect(normalizeFood('Œuf')).toBe('oeuf');
    expect(normalizeFood('  Cacahuète ')).toBe('cacahuete');
    expect(normalizeFood('Fruits à coque')).toBe('fruits a coque');
  });

  it('un mot de FAMILLE attrape tous ses aliments', () => {
    const familles: [string, string[]][] = [
      ['poisson', ['saumon', 'saumon_fume', 'cabillaud', 'thon_frais', 'thon_naturel', 'maquereau', 'sardines']],
      ['arachide', ['beurre_cacahuete']],
      ['fruits à coque', ['amandes', 'beurre_amande', 'noix', 'noisettes', 'lait_amande']],
      ['crustacé', ['crevettes']],
    ];
    for (const [mot, refs] of familles) {
      const attendu = parRefs(refs).length;
      expect(attendu, `${mot} : le catalogue doit porter cette famille`).toBeGreaterThan(0);
      expect(foodKeywordMatches(CATALOGUE, mot), mot).toBe(attendu);
    }
  });

  it('les deux orthographes de « œuf » attrapent la même chose', () => {
    const attendu = parRefs(['oeuf_entier', 'blanc_oeuf']).length;
    expect(foodKeywordMatches(CATALOGUE, 'œuf')).toBe(attendu);
    expect(foodKeywordMatches(CATALOGUE, 'oeuf')).toBe(attendu);
  });

  it('« œuf » n\'emporte PAS le bœuf (le piège de la sous-chaîne)', () => {
    // `bœuf` contient `œuf` : sans ancrage en début de mot, éviter les œufs retirait
    // 23 des 24 plats de bœuf du catalogue.
    const boeufs = parRefs(['boeuf_5', 'boeuf_bavette']);
    expect(boeufs.length).toBeGreaterThan(10);
    for (const r of boeufs) {
      const porteOeuf = r.ingredients.some((i) => i.ref === 'oeuf_entier' || i.ref === 'blanc_oeuf');
      if (!porteOeuf) expect(recipeContainsFood(r, 'œuf'), r.id).toBe(false);
    }
    expect(foodKeywordMatches(CATALOGUE, 'bœuf')).toBe(boeufs.length);
  });

  it('les pluriels et les accents continuent de matcher', () => {
    expect(foodKeywordMatches(CATALOGUE, 'lentille')).toBeGreaterThan(0);
    expect(foodKeywordMatches(CATALOGUE, 'pates')).toBe(foodKeywordMatches(CATALOGUE, 'pâtes'));
  });

  it('le moteur ne sert JAMAIS un aliment évité — preuve de bout en bout', () => {
    for (const mot of ['poisson', 'arachide', 'fruits à coque', 'œuf']) {
      const p = gabarit([mot]);
      for (const seed of [0, 1]) {
        for (const m of buildLocalPlan(p, seed).meals) {
          expect(recipeContainsFood(m.recipe, mot), `${mot} servi dans ${m.recipe.id}`).toBe(false);
        }
      }
    }
  });

  it('un mot qui n\'attrape rien est détectable — c\'est ce que l\'UI affiche', () => {
    expect(foodKeywordMatches(CATALOGUE, 'ingredient-qui-nexiste-pas')).toBe(0);
    expect(foodKeywordMatches(CATALOGUE, '')).toBe(0);
  });
});
