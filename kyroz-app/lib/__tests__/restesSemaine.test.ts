import { describe, expect, it } from 'vitest';
import type { Meal, MealPlan, Recipe } from '../types';
import { restesAReprendre } from '../restesSemaine';
import type { PantryItem } from '../pantry';

/**
 * Ce que la semaine suivante doit reprendre (2026-10-24, « ne rien jeter ») : la réserve moins
 * les repas qu'il reste à cuisiner, PÉRISSABLE seulement, chacun jusqu'au dernier jour où il
 * tient (`lib/dureeDeVie.ts`, compté depuis les courses et depuis le jour où on l'entame).
 */
const recette = (id: string, ingredients: { name: string; ref: string; quantity_g: number }[]): Recipe =>
  ({ id, name_fr: id, ingredients, macros_per_portion: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, portions: 1, prep_time_min: 10 } as unknown as Recipe);
const repas = (day: number, r: Recipe): Meal =>
  ({ id: `${day}-dinner`, day, meal_type: 'dinner', recipe: r, portions: 1, macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, adapted_ingredients: r.ingredients } as unknown as Meal);
const item = (name: string, quantity: number, category: PantryItem['category']): PantryItem => ({ name, quantity, unit: 'g', category });

// Plan de 7 jours du lundi 2 au dimanche 8 novembre 2026 ; courses le dimanche 1er.
const SEMAINE = [1, 2, 3, 4, 5, 6, 0];
const courant = (meals: Meal[]): Pick<MealPlan, 'week_start_date' | 'days' | 'meals'> => ({ week_start_date: '2026-11-02', days: 7, meals });
const suivante = { week_start_date: '2026-11-09', days: 7 };

describe('restes à reprendre la semaine suivante', () => {
  it('une carotte (14 jours) se reprend ; un filet de poulet (1 jour) non', () => {
    const r = restesAReprendre(
      [item('Carotte', 300, 'légumes'), item('Filet de poulet', 120, 'viandes')],
      courant([]), [], '2026-11-01', suivante, SEMAINE,
    );
    expect(r.get('poulet_filet')).toBeUndefined();
    // Courses le 1er : la carotte tient jusqu'au 15 → lundi 9 à dimanche 15, les 7 jours.
    expect(r.get('carotte')).toEqual({ g: 300, jusquAu: 7 });
  });

  it('ce qui reste à cuisiner cette semaine est déduit d\'abord', () => {
    const plat = recette('soupe', [{ name: 'Carotte', ref: 'carotte', quantity_g: 200 }]);
    const r = restesAReprendre([item('Carotte', 300, 'légumes')], courant([repas(6, plat)]), [repas(6, plat)], '2026-11-01', suivante, SEMAINE);
    expect(r.get('carotte')?.g).toBe(100);
  });

  it('une mozzarella entamée tient 5 jours DEPUIS l\'ouverture, pas depuis les courses', () => {
    // Fermée : 7 jours depuis le 1er (le 8). Entamée le samedi 7 (jour 6) : le 12. Donc le 8, dimanche :
    // AUCUN jour du plan suivant (qui commence le 9) — sauf qu'entamée le 7, elle tiendrait jusqu'au 12,
    // mais fermée elle ne passe pas le 8 : la borne la plus courte gagne.
    const plat = recette('salade', [{ name: 'Mozzarella light', ref: 'mozzarella', quantity_g: 60 }]);
    const r = restesAReprendre([item('Mozzarella light', 65, 'laitiers')], courant([repas(6, plat)]), [], '2026-11-01', suivante, SEMAINE);
    expect(r.get('mozzarella')).toBeUndefined();
  });

  it('un œuf (21 jours) entamé reste repris toute la semaine suivante', () => {
    const plat = recette('omelette', [{ name: 'Œuf entier', ref: 'oeuf_entier', quantity_g: 120 }]);
    const r = restesAReprendre([item('Œuf entier', 240, 'laitiers')], courant([repas(1, plat)]), [], '2026-11-01', suivante, SEMAINE);
    expect(r.get('oeuf_entier')).toEqual({ g: 240, jusquAu: 7 });
  });

  it('sans jours datés, rien', () => {
    expect(restesAReprendre([item('Carotte', 300, 'légumes')], courant([]), [], '2026-11-01', suivante, undefined).size).toBe(0);
  });
});
