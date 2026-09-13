import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, swapMeal } from '../planEngine';
import { feculentsDe, ingredientsDeBase, plafondIngredient, platDuMidi, surLePouce } from '../repasHumain';
import { DietaryRestriction, MealPlan, UserProfile, VarietyPreference } from '../types';
import { FLAG_AUDIENCE } from '../adaptRecipe';

// ── UN PLAN QU'UN HUMAIN MANGERAIT (D30) ─────────────────────────────────────
//
// 🔴 LU DANS LE CARNET DES MENUS le 2026-09-13, sur un moteur aux indicateurs verts :
// poêlée de thon aux pommes de terre à 8 h, millet 7 fois par semaine, semoule le matin
// puis semoule à 16 h, collations de 15 minutes à la poêle, et 28 recettes neuves par
// semaine en « Équilibré » (≈ 60 articles de courses, ≈ 75 min de cuisine par jour).
// Arbitrages du fondateur du 2026-09-14. Mesuré (10 profils × 3 corps × 3 objectifs ×
// 3 variétés × 4 tirages, `main` → branche) :
//   petits-déjeuners « plat du midi »        20–51 % → 0 %
//   collations pas « sur le pouce »          53–82 % → 0 %
//   jours avec le même féculent deux fois    30–49 % → 0 %
//   semaines au-delà d'un plafond (omnivore)  ~100 % → 0 %
//   « Équilibré » : restes par semaine            0 → 1,9–2,5
//   « Équilibré » : cuisine par jour (omnivore)  73 → 59 min
//   repas mal calibrés (10 profils)              83 → 94

const M4 = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const regimes = (...r: DietaryRestriction[]) => ({ dietary_restrictions: r });

function profil(over: Partial<UserProfile>): UserProfile {
  return recalcProfile(makeProfile({
    sex: 'male', age: 30, weight_kg: 84, height_cm: 180,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 30 }], training_days_per_week: 4,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: [...M4],
    dietary_restrictions: [], preferred_proteins: [], ...over,
  } as Partial<UserProfile>));
}

const cache = new Map<string, { p: UserProfile; plan: MealPlan }[]>();
/** 3 objectifs × 3 variétés × 2 tirages (plan canonique et premier « Nouveau plan »). */
function plans(over: Partial<UserProfile>, varietes: VarietyPreference[] = ['repetitive', 'balanced', 'max']) {
  const cle = JSON.stringify([over, varietes]);
  if (!cache.has(cle)) {
    const out: { p: UserProfile; plan: MealPlan }[] = [];
    for (const goal of ['cut', 'maintain', 'lean_bulk'] as const)
      for (const variety of varietes)
        for (const seed of [0, 1]) { const p = profil({ goal, variety, ...over }); out.push({ p, plan: buildLocalPlan(p, seed) }); }
    cache.set(cle, out);
  }
  return cache.get(cle)!;
}

const PROFILS: [string, Partial<UserProfile>][] = [
  ['omnivore « Peu importe »', {}],
  ['omnivore, protéines animales cochées', { preferred_proteins: ['poulet', 'bœuf', 'poisson', 'œufs', 'whey'] }],
  ['halal', regimes('halal')],
  ['sans gluten', regimes('gluten_free')],
  ['pescétarien', regimes('pescatarian')],
  ['végétarien', regimes('vegetarian')],
  ['vegan', regimes('vegan')],
];

describe('ce qui est servi à 8 h et à 16 h', () => {
  it.each(PROFILS)('%s : aucun plat du midi au petit-déjeuner', (_n, over) => {
    for (const { plan } of plans(over))
      for (const m of plan.meals.filter((x) => x.meal_type === 'breakfast'))
        expect(platDuMidi(m.recipe), `jour ${m.day} : ${m.recipe.name_fr}`).toBe(false);
  });

  it('un vegan sans gluten qui répond « salé » ne reçoit pas de plat du midi pour autant', () => {
    // Décision fondateur du 2026-09-14 : la règle du matin passe devant la réponse « salé ».
    // Ses petits-déjeuners salés étaient presque tous des plats du midi ; il reçoit désormais
    // surtout du sucré, en attendant une vague de petits-déjeuners salés vegan.
    for (const { plan } of plans({ ...regimes('vegan', 'gluten_free'), gout_petit_dej: 'sale' } as Partial<UserProfile>))
      for (const m of plan.meals.filter((x) => x.meal_type === 'breakfast'))
        expect(platDuMidi(m.recipe), `jour ${m.day} : ${m.recipe.name_fr}`).toBe(false);
  });

  it.each(PROFILS)('%s : collations de 10 min au plus, sans cuisson', (_n, over) => {
    for (const { plan } of plans(over))
      for (const m of plan.meals.filter((x) => x.meal_type === 'snack'))
        expect(surLePouce(m.recipe), `jour ${m.day} : ${m.recipe.name_fr} (${m.recipe.prep_time_min} min)`).toBe(true);
  });
});

// ⚠️ « Répétitif » est exempté de ces deux règles À DESSEIN : il DEMANDE les mêmes plats,
// et son plafond par recette gouverne déjà la répétition (cf. reroll.test.ts).
describe('ce qui revient (« Équilibré » et « Variété max »)', () => {
  it.each(PROFILS)('%s : le même féculent une fois par jour', (_n, over) => {
    for (const { plan } of plans(over, ['balanced', 'max']))
      for (let d = 1; d <= 7; d++) {
        const f = plan.meals.filter((m) => m.day === d).flatMap((m) => feculentsDe(m.recipe));
        expect(new Set(f).size, `jour ${d} : ${f.join(', ')}`).toBe(f.length);
      }
  });

  // ⚠️ Végétarien écarté À DESSEIN : mesuré, 3 semaines sur 108 n'ont plus aucun plat propre
  // sous le plafond, et la règle ne fabrique jamais un repas mal calibré.
  it.each(PROFILS.filter(([n]) => n !== 'végétarien'))('%s : aucun ingrédient de base au-delà de son plafond', (_n, over) => {
    for (const { p, plan } of plans(over, ['balanced', 'max'])) {
      const n: Record<string, number> = {};
      for (const m of plan.meals) for (const ref of ingredientsDeBase(m.recipe)) n[ref] = (n[ref] ?? 0) + 1;
      for (const [ref, k] of Object.entries(n)) expect(k, `${ref} dans ${k} repas`).toBeLessThanOrEqual(plafondIngredient(ref, p));
    }
  });
});

describe('« Équilibré » : le dîner revient en restes au déjeuner du lendemain', () => {
  it.each(PROFILS)('%s : chaque reste a sa paire, et seulement les lendemains des jours 1, 3 et 5', (_n, over) => {
    let restes = 0, semaines = 0;
    for (const { plan } of plans(over, ['balanced'])) {
      semaines++;
      for (const m of plan.meals) {
        if (m.leftover_from_prev) {
          restes++;
          expect([2, 4, 6], `reste au jour ${m.day}`).toContain(m.day);
          expect(m.meal_type).toBe('lunch');
          const veille = plan.meals.find((x) => x.day === m.day - 1 && x.meal_type === 'dinner');
          expect(veille?.recipe.id, `jour ${m.day}`).toBe(m.recipe.id);
          expect(veille?.cook_for_tomorrow).toBe(true);
          expect((m.adapt_flags ?? []).filter((f) => FLAG_AUDIENCE[f] === 'user')).toEqual([]);
        }
        if (m.cook_for_tomorrow) {
          const demain = plan.meals.find((x) => x.day === m.day + 1 && x.meal_type === 'lunch');
          expect(demain?.leftover_from_prev, `dîner du jour ${m.day} annoncé sans déjeuner de restes`).toBe(true);
        }
      }
    }
    // La sonde sait dire OUI : mesuré 1,9 à 2,5 restes par semaine.
    expect(restes / semaines, 'aucun reste servi : la règle est morte').toBeGreaterThanOrEqual(1);
  });

  it('« Répétitif » et « Variété max » ne servent aucun reste', () => {
    for (const { plan } of [...plans({}, ['repetitive']), ...plans({}, ['max'])])
      expect(plan.meals.filter((m) => m.leftover_from_prev || m.cook_for_tomorrow)).toEqual([]);
  });

  it('pas de reste entre deux jours du plan qui ne se suivent pas au calendrier', () => {
    // Lundi, mercredi, vendredi, samedi : le dîner de lundi ne se sert pas mercredi midi.
    const over = { plan_days: 4, plan_weekdays: [1, 3, 5, 6] } as Partial<UserProfile>;
    for (const { plan } of plans(over, ['balanced']))
      expect(plan.meals.find((m) => m.day === 2 && m.leftover_from_prev), 'reste servi le mercredi').toBeUndefined();
  });

  it('« Remplacer ce repas » casse la paire, dans les deux sens', () => {
    const { p, plan } = plans({}, ['balanced']).find(({ plan }) => plan.meals.some((m) => m.leftover_from_prev))!;
    const dejeuner = plan.meals.find((m) => m.leftover_from_prev)!;
    const diner = plan.meals.find((m) => m.day === dejeuner.day - 1 && m.cook_for_tomorrow)!;

    const apresDejeuner = swapMeal(p, plan, dejeuner);
    expect(apresDejeuner.meals.find((m) => m.id === dejeuner.id)!.leftover_from_prev).toBeUndefined();
    expect(apresDejeuner.meals.find((m) => m.id === diner.id)!.cook_for_tomorrow).toBeUndefined();

    const apresDiner = swapMeal(p, plan, diner);
    expect(apresDiner.meals.find((m) => m.id === diner.id)!.cook_for_tomorrow).toBeUndefined();
    expect(apresDiner.meals.find((m) => m.id === dejeuner.id)!.leftover_from_prev).toBeUndefined();
  });
});
