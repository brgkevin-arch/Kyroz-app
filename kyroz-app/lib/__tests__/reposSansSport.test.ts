import { describe, it, expect } from 'vitest';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, restDaysForProfile } from '../planEngine';
import { MEAL_ORDER, UserProfile, SportSession } from '../types';

// Décision fondateur du 2026-09-30 : sans aucune séance, aucun jour de repos.
// Le repli marquait TOUS les jours « repos », donc le glissement glucides → lipides
// s'appliquait chaque jour et le Plan servait ~34 g de glucides de moins que la
// cible du Profil (`scripts/mesure-repos-sans-sport.ts`).
function profil(sports: SportSession[], jours: number, extra: Partial<UserProfile> = {}): UserProfile {
  return recalcProfile({
    id: 't', sex: 'male', age: 30, weight_kg: 82, height_cm: 180, body_fat_pct: 12,
    activity_level: 'moderate', training_days_per_week: jours, sports, neat_level: 'desk',
    goal: 'cut', macro_mode: 'auto', tdee_kcal: 0, target_kcal: 0, target_protein_g: 0,
    target_carbs_g: 0, target_fat_g: 0, plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [], ...extra,
  } as unknown as UserProfile);
}
const MUSCU: SportSession[] = [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }];

describe('jours de repos sans sport', () => {
  it('aucune séance → aucun jour de repos, même si des jours de repos traînent dans le profil', () => {
    expect(restDaysForProfile(profil([], 0), 5).size).toBe(0);
    expect(restDaysForProfile(profil([], 0, { rest_weekdays: [1, 3] }), 5).size).toBe(0);
    expect(buildLocalPlan(profil([], 0)).meals.some((m) => m.rest_day)).toBe(false);
  });

  it('sans sport, le plan sert les glucides que le Profil affiche (à 20 g près)', () => {
    const p = profil([], 0);
    const jours = buildLocalPlan(p).total_macros_per_day;
    const glucides = jours.reduce((s, d) => s + d.carbs_g, 0) / jours.length;
    expect(Math.abs(glucides - p.target_carbs_g)).toBeLessThan(20);
  });

  it('avec des séances, les jours de repos restent', () => {
    expect(restDaysForProfile(profil(MUSCU, 3), 5).size).toBeGreaterThan(0);
  });

  it('un compte d’avant les séances détaillées (jours d’entraînement, pas de `sports`) garde ses jours de repos', () => {
    expect(restDaysForProfile(profil([], 3), 5).size).toBeGreaterThan(0);
  });
});
