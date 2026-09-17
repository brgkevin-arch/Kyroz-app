import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { joursAAcheter, jourDeSemaine, mentionDepart, positionSemaine } from '../coursesDepuis';

/**
 * LA LISTE DE COURSES PART DU JOUR DE GÉNÉRATION (décision fondateur, 2026-09-17).
 *
 * « Si l'user s'inscrit le jeudi, son plan génère la semaine mais la liste de courses se
 * génère sur le jeudi. […] Le lundi, on est lundi, donc la liste se fait sur la semaine. »
 *
 * ⚠️ Le cas qui décide de tout est le DIMANCHE : `plan_weekdays` le porte en tête (0),
 * l'écran Plan le date en FIN de semaine civile. Un plan généré un jeudi doit donc garder
 * le dimanche — une borne sur le rang l'aurait effacé alors qu'il est à venir.
 */
const SEMAINE = [0, 1, 2, 3, 4, 5, 6];        // dimanche en tête, comme `getDay`
const plan = (debut: string, days = 7) => ({ week_start_date: debut, days });

describe('la position dans la semaine, pas le rang', () => {
  it('lundi = 0 … dimanche = 6', () => {
    expect(positionSemaine(1)).toBe(0);
    expect(positionSemaine(4)).toBe(3);
    expect(positionSemaine(0)).toBe(6);
  });

  it('lit le jour de semaine d’une date, et rend null si elle est illisible', () => {
    expect(jourDeSemaine('2026-09-17')).toBe(4);   // jeudi
    expect(jourDeSemaine('2026-09-20')).toBe(0);   // dimanche
    expect(jourDeSemaine('17/09/2026')).toBeNull();
  });
});

describe('quels jours la liste couvre', () => {
  it('généré un LUNDI : toute la semaine', () => {
    expect(joursAAcheter(plan('2026-09-14'), SEMAINE)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('généré un JEUDI : jeudi, vendredi, samedi — et le DIMANCHE, qui est à venir', () => {
    // Rangs : 1 = dimanche, 2 = lundi … 5 = jeudi, 6 = vendredi, 7 = samedi.
    expect(joursAAcheter(plan('2026-09-17'), SEMAINE)).toEqual([1, 5, 6, 7]);
  });

  it('généré un DIMANCHE : le dimanche seul', () => {
    expect(joursAAcheter(plan('2026-09-20'), SEMAINE)).toEqual([1]);
  });

  it('plan lundi-vendredi généré un SAMEDI : tout, plutôt qu’une liste vide', () => {
    expect(joursAAcheter(plan('2026-09-19', 5), [1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('sans jours choisis ou avec une date illisible : tout — le repli SÛR', () => {
    expect(joursAAcheter(plan('2026-09-17'), undefined)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(joursAAcheter(plan('pas une date'), SEMAINE)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('ce que l’écran annonce', () => {
  it('rien quand la liste couvre tout le plan', () => {
    expect(mentionDepart(plan('2026-09-14'), SEMAINE)).toBe('');
    expect(mentionDepart(plan('2026-09-17'), undefined)).toBe('');
  });

  it('le jour de départ quand elle ne couvre pas tout', () => {
    expect(mentionDepart(plan('2026-09-17'), SEMAINE)).toBe('À partir du jeudi : ton plan avait déjà commencé.');
  });
});

describe('l’écran Courses s’en sert', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'courses.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('la liste se construit sur ces jours-là, et l’écran le dit', () => {
    expect(src).toMatch(/buildShoppingList\(plan, pantry, joursAAcheter\(plan, profile\?\.plan_weekdays\)\)/);
    expect(src).toMatch(/setDepart\(mentionDepart\(plan, profile\?\.plan_weekdays\)\)/);
    expect(src).toMatch(/depart !== '' && <Text style=\{s\.depart\}>\{depart\}<\/Text>/);
  });
});
