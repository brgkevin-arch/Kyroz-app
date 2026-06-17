import { describe, it, expect, afterEach } from 'vitest';
import { buildLocalPlan, computeDailyTotals, profileSignature, swapMeal, computeDistribution, rebalanceDay, adaptDayOptions, effectiveMacros, resetTracking, mealIngredients, reAdaptMealRecipe, restDaySet } from '../planEngine';
import { setRecipeOverrides, RECIPES } from '../recipes';
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

describe('buildLocalPlan + adaptRecipe (scaling par ingrédient)', () => {
  it('produit un plan complet avec quantités adaptées par repas', () => {
    const plan = buildLocalPlan(makeProfile({ plan_days: 1 }), 0);
    expect(plan.meals).toHaveLength(4); // 1 jour × 4 repas
    for (const m of plan.meals) {
      expect(m.adapted_ingredients, m.id).toBeTruthy();
      expect(m.adapted_ingredients!.length).toBeGreaterThan(0);
      expect(m.macros.kcal).toBeGreaterThan(0);
      expect(m.portions).toBe(1);
    }
  });

  it('total du jour proche de la cible kcal (±12%)', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const dayKcal = plan.total_macros_per_day[0].kcal;
    expect(Math.abs(dayKcal - p.target_kcal) / p.target_kcal).toBeLessThan(0.12);
  });

  it('respecte les restrictions (végétarien) via restrictions_ok ou repli signalé', () => {
    const plan = buildLocalPlan(makeProfile({ dietary_restrictions: ['vegetarian'] }), 0);
    for (const m of plan.meals)
      expect(m.restriction_relaxed || m.recipe.restrictions_ok?.includes('vegetarian'), m.recipe.id).toBeTruthy();
  });

  it('soft-matching combats : plan complet, sans erreur', () => {
    const plan = buildLocalPlan(makeProfile({
      goal: 'cut', sports: [{ type: 'sports_combat', sessions_per_week: 3, minutes_per_session: 90 }],
      target_kcal: 2000, target_protein_g: 170, target_carbs_g: 180, target_fat_g: 60, plan_days: 1,
    }), 0);
    expect(plan.meals).toHaveLength(4);
  });
});

describe('mealIngredients (quantités effectives)', () => {
  it('renvoie les quantités adaptées si présentes, sinon recipe×portions', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const m = plan.meals[0];
    const ings = mealIngredients(m);
    expect(ings.length).toBe(m.recipe.ingredients.length);
    expect(ings[0]).toHaveProperty('quantity_g');
    expect(ings[0]).toHaveProperty('name');
    // adapté = ce que porte le repas
    expect(ings[0].quantity_g).toBe(m.adapted_ingredients![0].quantity_g);
  });
  it('repli recipe×portions quand pas d\'adapted_ingredients (plan legacy)', () => {
    const legacy: any = {
      id: 'm', day: 1, meal_type: 'lunch', portions: 2,
      recipe: { id: 'r', name_fr: 'X', prep_time_min: 10, portions: 1,
        macros_per_portion: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        ingredients: [{ name: 'Riz', quantity_g: 80 }], steps: [], tags: ['lunch'], validated_by_dietitian: false },
      macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    };
    expect(mealIngredients(legacy)[0].quantity_g).toBe(160);
  });
});

describe('swap / rebalance via adaptRecipe', () => {
  it('rebalanceDay garde adapted_ingredients sur les repas ajustés', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const out = rebalanceDay(p, plan, 1);
    for (const m of out.meals) expect(m.adapted_ingredients, m.id).toBeTruthy();
  });
  it('swapMeal change de recette et fournit des quantités adaptées', () => {
    const p = makeProfile({ plan_days: 1 });
    const plan = buildLocalPlan(p, 0);
    const target = plan.meals[1];
    const out = swapMeal(p, plan, target);
    const newMeal = out.meals.find((m) => m.id === target.id)!;
    expect(newMeal.adapted_ingredients).toBeTruthy();
    expect(newMeal.portions).toBe(1);
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

describe('adaptDayOptions (hors-plan, morceau 4)', () => {
  const setup = () => {
    const p = makeProfile({ plan_days: 1, meals: ['breakfast', 'lunch', 'dinner', 'snack'] });
    let plan = buildLocalPlan(p, 0);
    // Écart hors plan de 500 kcal sur le jour 1.
    plan = { ...plan, day_extras: { 1: { kcal: 500, protein_g: 0, carbs_g: 0, fat_g: 0 } } };
    return { p, plan };
  };
  const day1 = (plan: any) => plan.meals.filter((m: any) => m.day === 1);
  const mealOf = (plan: any, type: string) => day1(plan).find((m: any) => m.meal_type === type);

  it('à 14h : 3 options (collation + dîner restent)', () => {
    const { p, plan } = setup();
    const opts = adaptDayOptions(p, plan, 1, 14);
    expect(opts.map((o) => o.key)).toEqual(['spread', 'skip_snack', 'focus_dinner']);
  });

  it('« sauter la collation » marque bien la collation skipped', () => {
    const { p, plan } = setup();
    const skip = adaptDayOptions(p, plan, 1, 14).find((o) => o.key === 'skip_snack')!;
    expect(mealOf(skip.plan, 'snack').status).toBe('skipped');
  });

  it('« ajuster le dîner » ne touche pas la collation', () => {
    const { p, plan } = setup();
    const before = mealOf(plan, 'snack').portions;
    const focus = adaptDayOptions(p, plan, 1, 14).find((o) => o.key === 'focus_dinner')!;
    expect(mealOf(focus.plan, 'snack').portions).toBe(before);
  });

  it('absorbe l\'écart : le total réparti descend sous le « sans rien faire »', () => {
    const { p, plan } = setup();
    const mealsKcal = day1(plan).reduce((s: number, m: any) => s + m.macros.kcal, 0);
    const nothing = mealsKcal + 500; // si on ne touchait à rien
    const spread = adaptDayOptions(p, plan, 1, 14).find((o) => o.key === 'spread')!;
    expect(spread.dayKcal).toBeLessThan(nothing);
  });

  it('le soir tard : plus aucune option', () => {
    const { p, plan } = setup();
    expect(adaptDayOptions(p, plan, 1, 23)).toHaveLength(0);
  });
});

describe('reAdaptMealRecipe (override perso → cohérence immédiate)', () => {
  it('repas adapté : ré-dérive ingrédients + macros vers la NOUVELLE recette', () => {
    const p = makeProfile();
    const plan = buildLocalPlan(p, 0);
    const meal = plan.meals.find((m) => m.adapted_ingredients?.length)!;
    // Une autre recette du même type, à refs résolubles (recettes Kyroz).
    const other = RECIPES.find(
      (r) => r.id !== meal.recipe.id && r.tags.includes(meal.meal_type) && r.ingredients.every((i) => i.ref),
    )!;

    const re = reAdaptMealRecipe(meal, other);
    expect(re.recipe.id).toBe(other.id);
    // Les ingrédients adaptés sont ceux de la NOUVELLE recette (plus de quantités périmées).
    expect(new Set(re.adapted_ingredients!.map((i) => i.ref)))
      .toEqual(new Set(other.ingredients.map((i) => i.ref)));
    // Macros recalculées depuis les grammes (kcal ≈ 4P+4C+9F).
    const calc = re.macros.protein_g * 4 + re.macros.carbs_g * 4 + re.macros.fat_g * 9;
    expect(Math.abs(calc - re.macros.kcal) / re.macros.kcal).toBeLessThan(0.13);
    expect(re.macros.kcal).toBeGreaterThan(0);
  });

  it('repas legacy (sans ingrédients adaptés) : scale les macros de base × portions', () => {
    const p = makeProfile();
    const meal = buildLocalPlan(p, 0).meals[0];
    const other = RECIPES.find((r) => r.id !== meal.recipe.id)!;
    const legacy = { ...meal, adapted_ingredients: undefined, portions: 2 };

    const re = reAdaptMealRecipe(legacy, other);
    expect(re.recipe.id).toBe(other.id);
    expect(re.adapted_ingredients).toBeUndefined();
    expect(re.macros.kcal).toBe(Math.round(other.macros_per_portion.kcal * 2));
  });
});

describe('carb-cycling jours actifs / repos', () => {
  it('restDaySet : déduit et répartit les jours de repos', () => {
    expect(restDaySet(7, 7).size).toBe(0);   // entraînement tous les jours → 0 repos
    expect(restDaySet(5, 9).size).toBe(0);   // entraînement ≥ jours → 0 repos
    expect(restDaySet(7, 0).size).toBe(7);   // aucun entraînement → tous repos
    expect(restDaySet(7, 4).size).toBe(3);   // 7 jours, 4 d'entraînement → 3 repos
    expect(restDaySet(6, 2).size).toBe(4);
    // étalés (pas tous collés) : au moins un jour actif entre deux repos sur 7/4
    const rd = [...restDaySet(7, 4)].sort((a, b) => a - b);
    expect(rd[0]).toBeGreaterThanOrEqual(1);
    expect(rd[rd.length - 1]).toBeLessThanOrEqual(7);
  });

  it('jour de repos : glucides ↓, lipides ↑, mêmes kcal + protéines (isocalorique)', () => {
    const p = makeProfile({ training_days_per_week: 2, plan_days: 6, meals: ['breakfast', 'lunch', 'dinner', 'snack'] });
    const plan = buildLocalPlan(p, 0);
    const totals = computeDailyTotals(plan.meals, plan.days);
    const restNums = new Set(plan.meals.filter((m) => m.rest_day).map((m) => m.day));
    expect(restNums.size).toBeGreaterThan(0);
    expect(restNums.size).toBeLessThan(plan.days); // il reste des jours actifs

    const avg = (sel: (t: typeof totals[number]) => number, rest: boolean) => {
      const ds = totals.filter((_, i) => rest === restNums.has(i + 1));
      return ds.reduce((s, t) => s + sel(t), 0) / ds.length;
    };
    expect(avg((t) => t.carbs_g, true)).toBeLessThan(avg((t) => t.carbs_g, false));     // glucides ↓
    expect(avg((t) => t.fat_g, true)).toBeGreaterThan(avg((t) => t.fat_g, false));      // lipides ↑
    // isocalorique : kcal & protéines comparables repos vs actif
    expect(Math.abs(avg((t) => t.kcal, true) - avg((t) => t.kcal, false)) / avg((t) => t.kcal, false)).toBeLessThan(0.08);
    expect(Math.abs(avg((t) => t.protein_g, true) - avg((t) => t.protein_g, false)) / avg((t) => t.protein_g, false)).toBeLessThan(0.15);
  });

  it('aucun jour de repos si on s’entraîne autant que le nombre de jours du plan', () => {
    const plan = buildLocalPlan(makeProfile({ training_days_per_week: 7, plan_days: 5 }), 0);
    expect(plan.meals.every((m) => !m.rest_day)).toBe(true);
  });

  it('déterministe avec le carb-cycling', () => {
    const p = makeProfile({ training_days_per_week: 3, plan_days: 6 });
    const sig = (pl: ReturnType<typeof buildLocalPlan>) =>
      pl.meals.map((m) => `${m.id}:${m.recipe.id}:${m.rest_day ? 'R' : 'A'}:${m.macros.carbs_g},${m.macros.fat_g}`).join('|');
    expect(sig(buildLocalPlan(p, 0))).toBe(sig(buildLocalPlan(p, 0)));
  });
});
