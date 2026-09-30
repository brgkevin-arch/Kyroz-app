import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShoppingList } from '../shoppingList';
import { nomAffiche } from '../pantry';
import type { MealPlan } from '../types';

// Relevés du second tour de l'app (2026-09-30). Chacun était une affirmation fausse
// ou un réglage qui ne pilotait rien, visible à l'écran et invisible à la relecture.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Kyroz+ ne promet que ce qui existe', () => {
  it('« jours plus copieux » n’apparaît que si le réglage est allumé', () => {
    const src = sansCommentaires(lire('app/kyroz-plus.tsx'));
    const occurrences = src.split('jours plus copieux').length - 1;
    expect(occurrences).toBe(1);
    expect(src).toMatch(/RYTHME_HEBDOMADAIRE_ACTIF \? "le réglage de tes jours plus copieux/);
  });
});

describe('les courses gardent le nom du catalogue', () => {
  const plan = {
    id: 'p', days: 1,
    meals: [{ id: 'm', day: 1, type: 'lunch', portions: 1, recipe: { id: 'r', name_fr: 'r', ingredients: [{ name: 'Bœuf haché 5% MG', quantity_g: 150, unit: 'g' }] } }],
  } as unknown as MealPlan;

  it('« 5% MG » ne devient pas « 5% mg » (des milligrammes)', () => {
    expect(buildShoppingList(plan).items.map((i) => i.name)).toContain('Bœuf haché 5% MG');
  });

  it('un nom déjà enregistré en minuscules s’affiche avec celui du catalogue', () => {
    expect(nomAffiche('Bœuf haché 5% mg')).toBe('Bœuf haché 5% MG');
    expect(nomAffiche('Café en grains')).toBe('Café en grains'); // hors catalogue : inchangé
  });
});

describe('le Profil ne propose pas de réglage qui ne pilote rien', () => {
  const profil = sansCommentaires(lire('app/(tabs)/profil.tsx'));

  it('les jours de repos n’apparaissent qu’avec au moins une séance', () => {
    expect(profil).toMatch(/\{trainingDaysEq > 0 && \(\s*<RestDaysPicker/);
  });

  it('« Je ne fais pas de sport » est proposé, comme à l’inscription', () => {
    expect(profil).toMatch(/aucunSport=\{\{ label: 'Je ne fais pas de sport'/);
  });

  it('sans séance, les jours de repos enregistrés ne sont pas réécrits', () => {
    expect(profil).toMatch(/rest_weekdays: trainingDaysEq > 0 \? orderedWeekdays\(restDays\) : profile\.rest_weekdays/);
  });

  it('« Date de naissance » n’est pas écrit deux fois de suite', () => {
    expect(profil).not.toMatch(/<SectionLabel t=\{t\}>Date de naissance<\/SectionLabel>\s*<BirthDateField/);
  });
});

describe('la fiche recette n’affiche pas la note d’atelier', () => {
  it('`why_fr` n’est plus rendu', () => {
    expect(sansCommentaires(lire('components/RecipeDetail.tsx'))).not.toMatch(/why_fr/);
  });
});
