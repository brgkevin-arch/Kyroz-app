import { afterEach, describe, expect, it } from 'vitest';
import { RESTES_REGLAGE, buildLocalPlan, mealIngredients, type Reste } from '../planEngine';
import { recalcProfile } from '../tdee';
import { achatPour } from '../formatsVendus';
import { dureeDe } from '../dureeDeVie';
import { RECIPE_INGREDIENTS } from '../recipeData';
import type { MealPlan, UserProfile } from '../types';

/**
 * FINIR CE QU'ON ACHÈTE (2026-10-24, « tout ce qui est acheté se cuisine dans la semaine ») : le
 * surplus d'un paquet périssable part dans les plats qui s'en servent déjà — jamais un paquet de
 * plus, la journée à 15 kcal près — et un reste de la semaine d'avant fait servir cet aliment.
 */
const profil = (g: Partial<UserProfile>, regimes: string[] = []): UserProfile => recalcProfile({
  id: 't', sex: 'female', weight_kg: 68, height_cm: 168, age: 35, goal: 'maintain', ...g,
  activity_level: 'moderate', training_days_per_week: 3,
  sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }], neat_level: 'desk', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0, plan_days: 7,
  plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even',
  variety: 'balanced', dietary_restrictions: regimes, disliked_foods: [], preferred_proteins: [],
} as unknown as UserProfile);
const PROFILS = [profil({}), profil({ sex: 'male', weight_kg: 85, height_cm: 180, goal: 'cut' } as Partial<UserProfile>), profil({}, ['vegetarian'])];

/** Par aliment périssable : le besoin de la semaine et ce que la liste ferait acheter. */
function perissables(plan: MealPlan) {
  const besoin = new Map<string, number>();
  for (const m of plan.meals) for (const i of m.adapted_ingredients ?? m.recipe.ingredients) {
    if (i.ref && dureeDe(i.ref)) besoin.set(i.ref, (besoin.get(i.ref) ?? 0) + i.quantity_g);
  }
  return [...besoin].map(([ref, q]) => ({ ref, besoin: q, achat: achatPour({ name: RECIPE_INGREDIENTS[ref].name, quantity: q, unit: RECIPE_INGREDIENTS[ref].unit })?.total ?? q }));
}

afterEach(() => { RESTES_REGLAGE.remplir = true; });

describe('finir ce qu\'on achète', () => {
  it('remplir les paquets ne fait JAMAIS acheter un paquet de plus, et le surplus baisse', () => {
    let surplusAvant = 0, surplusApres = 0;
    for (const p of PROFILS) for (const seed of [0, 1, 2, 3]) {
      RESTES_REGLAGE.remplir = false;
      const sans = new Map(perissables(buildLocalPlan(p, seed)).map((l) => [l.ref, l]));
      RESTES_REGLAGE.remplir = true;
      for (const l of perissables(buildLocalPlan(p, seed))) {
        const s = sans.get(l.ref)!;
        expect(l.achat, `${l.ref} (seed ${seed})`).toBeLessThanOrEqual(s.achat);
        surplusAvant += s.achat - s.besoin;
        surplusApres += l.achat - l.besoin;
      }
    }
    expect(surplusApres).toBeLessThan(surplusAvant * 0.9);
  });

  it('les ajouts ne déplacent pas une journée de plus de 15 kcal', () => {
    for (const p of PROFILS) for (const seed of [0, 1, 2]) {
      RESTES_REGLAGE.remplir = false;
      const sans = buildLocalPlan(p, seed);
      RESTES_REGLAGE.remplir = true;
      const avec = buildLocalPlan(p, seed);
      for (let d = 1; d <= avec.days; d++) {
        const jour = (pl: MealPlan) => pl.meals.filter((m) => m.day === d).reduce((t, m) => t + m.macros.kcal, 0);
        expect(Math.abs(jour(avec) - jour(sans)), `jour ${d}, seed ${seed}`).toBeLessThanOrEqual(15.5);
      }
    }
  });

  it('un reste de la semaine d\'avant fait servir cet aliment plus souvent', () => {
    const restes = new Map<string, Reste>([['carotte', { g: 600, jusquAu: 7 }], ['oeuf_entier', { g: 360, jusquAu: 7 }]]);
    const servis = (plan: MealPlan) => plan.meals.filter((m) => mealIngredients(m).some((i) => i.ref === 'carotte' || i.ref === 'oeuf_entier')).length;
    let sans = 0, avec = 0;
    for (const p of PROFILS) for (const seed of [0, 1, 2, 3, 4, 5]) {
      sans += servis(buildLocalPlan(p, seed));
      avec += servis(buildLocalPlan(p, seed, undefined, restes));
    }
    expect(avec).toBeGreaterThan(sans);
  });

  it('sans restes, rien ne change : la carte vide sert la même semaine', () => {
    const p = PROFILS[0];
    expect(buildLocalPlan(p, 2, undefined, new Map()).meals.map((m) => m.recipe.id))
      .toEqual(buildLocalPlan(p, 2).meals.map((m) => m.recipe.id));
  });
});
