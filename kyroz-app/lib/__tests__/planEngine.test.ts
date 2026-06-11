import { describe, it, expect, afterEach } from 'vitest';
import { buildLocalPlan, computeDailyTotals, profileSignature, swapMeal, computeDistribution, rebalanceDay, effectiveMacros, resetTracking } from '../planEngine';
import { setRecipeOverrides, RECIPES_PLACEHOLDER } from '../recipes';
import { makeProfile } from './helpers';

afterEach(() => setRecipeOverrides({}));

describe('buildLocalPlan (cœur du core loop)', () => {
  it('respecte jours et repas du profil — JAMAIS de plan vide (garde-fou §6)', () => {
    const p = makeProfile({ plan_days: 5, meals: ['breakfast', 'lunch', 'dinner'] });
    const plan = buildLocalPlan(p, 0);
    expect(plan.days).toBe(5);
    expect(plan.meals).toHaveLength(5 * 3);
    for (let d = 1; d <= 5; d++) {
      expect(plan.meals.filter((m) => m.day === d)).toHaveLength(3);
    }
  });

  it('macro-précision : chaque jour proche de la cible kcal', () => {
    const p = makeProfile();
    const plan = buildLocalPlan(p, 0);
    for (const day of plan.total_macros_per_day) {
      expect(Math.abs(day.kcal - p.target_kcal) / p.target_kcal).toBeLessThan(0.15);
    }
  });

  it('lipides cadrés — pas de bombe de gras (régression « 179 g »)', () => {
    // Profil type screenshot : haute protéine, lipides modérés.
    const p = makeProfile({ target_kcal: 2934, target_protein_g: 240, target_carbs_g: 313, target_fat_g: 80 });
    const plan = buildLocalPlan(p, 0);
    for (const day of plan.total_macros_per_day) {
      // proche de la cible lipides (±35 %), et jamais une distribution absurde (<40% des kcal)
      expect(Math.abs(day.fat_g - p.target_fat_g) / p.target_fat_g, `L=${day.fat_g}`).toBeLessThan(0.35);
      expect((day.fat_g * 9) / day.kcal, `L%=${day.fat_g}`).toBeLessThan(0.4);
      // protéines toujours respectées
      expect(Math.abs(day.protein_g - p.target_protein_g) / p.target_protein_g).toBeLessThan(0.15);
    }
  });

  it('déterministe : même profil + même seed → même plan ; seed ≠ → plan ≠', () => {
    const p = makeProfile();
    const a = buildLocalPlan(p, 0);
    const b = buildLocalPlan(p, 0);
    const c = buildLocalPlan(p, 1);
    const key = (pl: typeof a) => pl.meals.map((m) => `${m.day}-${m.meal_type}-${m.recipe.id}`).join('|');
    expect(key(a)).toBe(key(b));
    expect(key(c)).not.toBe(key(a));
  });

  it('filtre les régimes (végétarien : ni viande ni poisson)', () => {
    const p = makeProfile({ dietary_restrictions: ['vegetarian'] });
    const plan = buildLocalPlan(p, 0);
    const banned = ['poulet', 'bœuf', 'boeuf', 'steak', 'saumon', 'thon', 'cabillaud', 'crevette', 'jambon', 'dinde', 'porc'];
    for (const meal of plan.meals) {
      const txt = meal.recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
      for (const kw of banned) expect(txt, `${meal.recipe.name_fr}`).not.toContain(kw);
    }
  });

  it('filtre les aliments évités', () => {
    const p = makeProfile({ disliked_foods: ['brocolis'] });
    const plan = buildLocalPlan(p, 0);
    for (const meal of plan.meals) {
      const txt = meal.recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
      expect(txt, meal.recipe.name_fr).not.toContain('brocolis');
    }
  });

  it('utilise les recettes personnalisées (overrides) à la génération', () => {
    const p = makeProfile();
    const before = buildLocalPlan(p, 0);
    const used = before.meals[0].recipe; // une recette réellement choisie
    setRecipeOverrides({ [used.id]: { ...used, name_fr: 'VERSION PERSO' } });
    const after = buildLocalPlan(p, 0);
    const hit = after.meals.find((m) => m.recipe.id === used.id);
    if (hit) expect(hit.recipe.name_fr).toBe('VERSION PERSO');
  });
});

describe('computeDailyTotals', () => {
  it('somme exacte des macros des repas du jour', () => {
    const p = makeProfile({ plan_days: 2 });
    const plan = buildLocalPlan(p, 0);
    const totals = computeDailyTotals(plan.meals, 2);
    for (let d = 1; d <= 2; d++) {
      const sum = plan.meals.filter((m) => m.day === d).reduce((s, m) => s + m.macros.kcal, 0);
      expect(totals[d - 1].kcal).toBe(sum);
    }
  });
});

describe('profileSignature (déclencheur d’auto-régénération)', () => {
  it('change quand les macros cibles changent (poids → plan à jour)', () => {
    const a = profileSignature(makeProfile());
    const b = profileSignature(makeProfile({ target_kcal: 2500 }));
    expect(a).not.toBe(b);
  });
  it('insensible aux champs sans effet sur le plan (ex. âge)', () => {
    const a = profileSignature(makeProfile({ age: 30 }));
    const b = profileSignature(makeProfile({ age: 31 }));
    expect(a).toBe(b);
  });
});

describe('swapMeal', () => {
  it('remplace UN repas, recalcule les totaux, garde la structure', () => {
    const p = makeProfile();
    const plan = buildLocalPlan(p, 0);
    const target = plan.meals[0];
    const next = swapMeal(p, plan, target);
    expect(next.meals).toHaveLength(plan.meals.length);
    const swapped = next.meals.find((m) => m.id === target.id);
    expect(swapped).toBeDefined();
    // les autres repas ne bougent pas
    for (const m of next.meals) {
      if (m.id !== target.id) {
        expect(m.recipe.id).toBe(plan.meals.find((x) => x.id === m.id)?.recipe.id);
      }
    }
  });
});

describe('effectiveMacros (suivi d’adhésion)', () => {
  it('skipped → 0 ; eaten → locked_macros si fourni ; planned → macros', () => {
    const base = { kcal: 500, protein_g: 40, carbs_g: 50, fat_g: 15 };
    const meal = { id: 'x', day: 1, meal_type: 'lunch' as const, recipe: {} as any, portions: 1, macros: base };
    expect(effectiveMacros({ ...meal, status: 'skipped' }).kcal).toBe(0);
    expect(effectiveMacros({ ...meal })).toEqual(base);
    expect(effectiveMacros({ ...meal, status: 'eaten' })).toEqual(base);
    const locked = { kcal: 900, protein_g: 10, carbs_g: 120, fat_g: 30 };
    expect(effectiveMacros({ ...meal, status: 'eaten', locked_macros: locked })).toEqual(locked);
  });
});

describe('computeDailyTotals — status + extras', () => {
  it('ignore les repas sautés et ajoute les extras hors plan', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const meals = plan.meals.map((m, i) => (i === 0 ? { ...m, status: 'skipped' as const } : m));
    const totals = computeDailyTotals(meals, 1, { 1: { kcal: 300, protein_g: 0, carbs_g: 0, fat_g: 0 } });
    const expected = meals.reduce((s, m) => s + effectiveMacros(m).kcal, 0) + 300;
    expect(totals[0].kcal).toBe(expected);
  });
});

describe('rebalanceDay (recaler ma journée — re-plan instantané)', () => {
  const dayKcal = (plan: ReturnType<typeof buildLocalPlan>, day: number) =>
    plan.total_macros_per_day[day - 1].kcal;

  it('repas sauté : la journée reste proche de la cible (budget reporté)', () => {
    const p = makeProfile({ plan_days: 1, meals: ['breakfast', 'lunch', 'dinner', 'snack'] });
    const plan = buildLocalPlan(p, 0);
    const lunch = plan.meals.find((m) => m.meal_type === 'lunch')!;
    const skipped = { ...plan, meals: plan.meals.map((m) => (m.id === lunch.id ? { ...m, status: 'skipped' as const } : m)) };
    const out = rebalanceDay(p, skipped, 1);
    // total du jour toujours dans la cible (les repas restants ont grossi)
    expect(Math.abs(dayKcal(out, 1) - p.target_kcal) / p.target_kcal).toBeLessThan(0.15);
    // le repas sauté reste à 0 et garde son statut
    expect(effectiveMacros(out.meals.find((m) => m.id === lunch.id)!).kcal).toBe(0);
  });

  it('écart hors plan : le consommé total reste proche de la cible', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const withExtra = { ...plan, day_extras: { 1: { kcal: 700, protein_g: 0, carbs_g: 0, fat_g: 0 } } };
    const out = rebalanceDay(p, withExtra, 1);
    // total = repas recalés (réduits) + 700 hors plan ≈ cible
    expect(Math.abs(dayKcal(out, 1) - p.target_kcal) / p.target_kcal).toBeLessThan(0.15);
  });

  it('ne touche pas aux repas mangés (verrouillés) ni aux autres jours', () => {
    const p = makeProfile({ plan_days: 2, meals: ['breakfast', 'lunch', 'dinner'] });
    const plan = buildLocalPlan(p, 0);
    const bf = plan.meals.find((m) => m.day === 1 && m.meal_type === 'breakfast')!;
    const eaten = { ...plan, meals: plan.meals.map((m) => (m.id === bf.id ? { ...m, status: 'eaten' as const } : m)) };
    const out = rebalanceDay(p, eaten, 1);
    // le repas mangé garde recette + portion
    const after = out.meals.find((m) => m.id === bf.id)!;
    expect(after.portions).toBe(bf.portions);
    expect(after.recipe.id).toBe(bf.recipe.id);
    // jour 2 inchangé
    for (const m of out.meals.filter((x) => x.day === 2)) {
      const before = plan.meals.find((x) => x.id === m.id)!;
      expect(m.portions).toBe(before.portions);
    }
  });

  it('gros dépassement : les repas restants tombent au plus bas, jamais d’erreur', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    // on déclare avoir déjà mangé plus que la cible du jour
    const over = { ...plan, day_extras: { 1: { kcal: p.target_kcal + 1000, protein_g: 0, carbs_g: 0, fat_g: 0 } } };
    const out = rebalanceDay(p, over, 1);
    // chaque repas planifié est à une portion valide (≥ 0.5) — pas de crash, pas de négatif
    for (const m of out.meals) {
      expect(m.portions).toBeGreaterThanOrEqual(0.5);
      expect(m.macros.kcal).toBeGreaterThan(0);
    }
  });
});

describe('resetTracking (nouvelle journée → page blanche)', () => {
  it('efface statuts + extras et restaure les portions canoniques (recettes conservées)', () => {
    const p = makeProfile({ plan_days: 2 });
    const canonical = buildLocalPlan(p, 0);
    // on dérègle le jour 1 : un repas sauté + un écart hors plan
    const lunch = canonical.meals.find((m) => m.day === 1 && m.meal_type === 'lunch')!;
    const messed = rebalanceDay(p, {
      ...canonical,
      day_extras: { 1: { kcal: 600, protein_g: 0, carbs_g: 0, fat_g: 0 } },
      meals: canonical.meals.map((m) => (m.id === lunch.id ? { ...m, status: 'skipped' as const } : m)),
      tracking_date: '2020-01-01',
    }, 1);

    const reset = resetTracking(p, messed);
    expect(reset.day_extras).toBeUndefined();
    expect(reset.tracking_date).toBeUndefined();
    for (const m of reset.meals) {
      expect(m.status).toBeUndefined();
      // mêmes recettes + mêmes portions que le plan canonique
      const c = canonical.meals.find((x) => x.id === m.id)!;
      expect(m.recipe.id).toBe(c.recipe.id);
      expect(m.portions).toBe(c.portions);
    }
  });

  it('idempotent sur un plan déjà propre', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const out = resetTracking(p, plan);
    const key = (pl: typeof plan) => pl.meals.map((m) => `${m.id}:${m.portions}`).join('|');
    expect(key(out)).toBe(key(plan));
  });
});

describe('computeDistribution', () => {
  it('somme = 1 quel que soit le sous-ensemble de repas', () => {
    const combos: Parameters<typeof computeDistribution>[0][] = [
      ['breakfast', 'lunch', 'dinner', 'snack'],
      ['lunch', 'dinner'],
      ['breakfast'],
    ];
    for (const meals of combos) {
      const dist = computeDistribution(meals, 'even');
      const sum = meals.reduce((s, m) => s + dist[m], 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
  it("l'emphase augmente la part du repas mis en avant", () => {
    const even = computeDistribution(['breakfast', 'lunch', 'dinner'], 'even');
    const dinner = computeDistribution(['breakfast', 'lunch', 'dinner'], 'dinner');
    expect(dinner.dinner).toBeGreaterThan(even.dinner);
  });
});
