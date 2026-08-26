import { describe, it, expect, afterEach, vi } from 'vitest';

// ⚠️ « Jours plus copieux » est ÉTEINT en production depuis le 2026-08-18
// (`lib/featureFlags.ts`), et `planEngine::bankOf` cesse alors de lire la banque.
// Ce fichier force l'interrupteur à `true` pour continuer de défendre le CONTRAT DU
// MOTEUR — ce qu'il devra faire le jour où le parcours est rallumé. Le comportement
// réel de l'app, interrupteur éteint, est couvert à part par `rythmeEteint.test.ts` :
// sans ce second fichier, la suite entière décrirait une app qui n'existe plus.
vi.mock('../featureFlags', () => ({
  PARCOURS_HORS_PLAN_ACTIF: false,
  RYTHME_HEBDOMADAIRE_ACTIF: true,
}));
import { buildLocalPlan, mealPoolSize, computeDailyTotals, profileSignature, swapMeal, computeDistribution, rebalanceDay, adaptDayOptions, effectiveMacros, resetTracking, mealIngredients, reAdaptMealRecipe, restDaySet, restDaysForProfile, goalDirection, dayTargetKcal, ON_TARGET_TOLERANCE_KCAL, emphasisIds } from '../planEngine';
import { MealType } from '../types';
import { setRecipeOverrides, RECIPES } from '../recipes';
import { makeProfile } from './helpers';

afterEach(() => setRecipeOverrides({}));

describe('goalDirection + fit asymétrique (A2)', () => {
  it('déficit → +1, surplus → −1, maintien → 0 (deadband ±40)', () => {
    expect(goalDirection(makeProfile({ tdee_kcal: 2500, target_kcal: 2200 }))).toBe(1);  // sèche
    expect(goalDirection(makeProfile({ tdee_kcal: 2500, target_kcal: 2900 }))).toBe(-1); // prise de masse
    expect(goalDirection(makeProfile({ tdee_kcal: 2500, target_kcal: 2500 }))).toBe(0);  // maintien
    expect(goalDirection(makeProfile({ tdee_kcal: 2500, target_kcal: 2475 }))).toBe(0);  // dans le deadband
  });

  it('sèche : le réalisé ne déborde pas la cible côté dangereux (anti-bug A2)', () => {
    const p = makeProfile({ tdee_kcal: 1900, target_kcal: 1600, target_protein_g: 130, target_carbs_g: 150, target_fat_g: 45 });
    const cap = Math.max(0.15 * (p.tdee_kcal - p.target_kcal), 90);
    const plan = buildLocalPlan(p, 0);
    // ⚠️ Référence = la cible DU JOUR, pas la cible plate. Depuis la répartition
    // par volume sportif (2026-08-06), un jour d'entraînement vise légitimement
    // plus haut : mesurer contre `target_kcal` ferait lire cette hausse VOULUE
    // comme le débordement A2, c'est-à-dire accuser le moteur de ce qu'on lui a
    // demandé. La borne, elle, ne bouge pas d'un kcal.
    plan.total_macros_per_day.forEach((day, i) => {
      const cible = dayTargetKcal(p, plan.days, i + 1);
      expect(day.kcal - cible, `J${i + 1} débordement=${day.kcal - cible}kcal`).toBeLessThanOrEqual(cap);
    });
  });
});

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

  it('filtre halal (ni porc ni charcuterie)', () => {
    const p = makeProfile({ dietary_restrictions: ['halal'] });
    const plan = buildLocalPlan(p, 0);
    const banned = ['porc', 'jambon', 'lardon', 'bacon'];
    for (const meal of plan.meals) {
      const txt = meal.recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');
      for (const kw of banned) expect(txt, meal.recipe.name_fr).not.toContain(kw);
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

  // ── PLUSIEURS moments à la fois (2026-08-25) ───────────────────────────────
  const TROIS: MealType[] = ['breakfast', 'lunch', 'dinner'];

  it('deux moments montent tous les deux, et le troisième descend', () => {
    const even = computeDistribution(TROIS, 'even');
    const deux = computeDistribution(TROIS, 'breakfast,dinner');
    expect(deux.breakfast).toBeGreaterThan(even.breakfast);
    expect(deux.dinner).toBeGreaterThan(even.dinner);
    expect(deux.lunch).toBeLessThan(even.lunch);
    expect(TROIS.reduce((acc, m) => acc + deux[m], 0)).toBeCloseTo(1, 5);
  });

  it('deux moments pèsent moins chacun que le même moment tout seul', () => {
    const seul = computeDistribution(TROIS, 'dinner');
    const deux = computeDistribution(TROIS, 'breakfast,dinner');
    expect(deux.dinner).toBeLessThan(seul.dinner);
  });

  // ⚠️ Propriété qui n'est PAS une commodité : elle est ce qui rend le réglage
  // cohérent. Tout cocher multiplie chaque poids par le même facteur — la
  // répartition retombe exactement sur « équilibré ». Sans elle, il faudrait
  // interdire de tout cocher, c'est-à-dire expliquer un interdit à l'écran.
  it('tout mettre en avant = ne rien mettre en avant', () => {
    const even = computeDistribution(TROIS, 'even');
    const tout = computeDistribution(TROIS, 'breakfast,lunch,dinner');
    for (const m of TROIS) expect(tout[m], m).toBeCloseTo(even[m], 10);
  });

  it("un moment qui n'est pas servi ce jour-là est ignoré, pas propagé", () => {
    const sansPetitDej = computeDistribution(['lunch', 'dinner'], 'breakfast,dinner');
    const seulDiner = computeDistribution(['lunch', 'dinner'], 'dinner');
    for (const m of ['lunch', 'dinner']) expect(sansPetitDej[m], m).toBeCloseTo(seulDiner[m], 10);
  });
});

describe('emphasisIds — la liste des moments mis en avant', () => {
  const SERVIS: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  it('lit la chaîne stockée comme la liste manipulée par l’écran', () => {
    expect(emphasisIds('breakfast,dinner', SERVIS)).toEqual(['breakfast', 'dinner']);
    expect(emphasisIds(['breakfast', 'dinner'], SERVIS)).toEqual(['breakfast', 'dinner']);
  });

  it('« even », vide, null et absent veulent tous dire « équilibré »', () => {
    for (const v of ['even', '', null, undefined, [] as MealType[]]) {
      expect(emphasisIds(v, SERVIS), String(v)).toEqual([]);
    }
  });

  // Un ancien profil porte UN id : il doit continuer de dire exactement la même
  // chose, sinon la bascule vers la liste changerait des plans déjà servis.
  it('un ancien profil à un seul id est lu à l’identique', () => {
    expect(emphasisIds('dinner', SERVIS)).toEqual(['dinner']);
  });

  it('écarte ce qui n’est pas servi, et ne rend jamais de doublon', () => {
    expect(emphasisIds('breakfast,inconnu,dinner', SERVIS)).toEqual(['breakfast', 'dinner']);
    expect(emphasisIds('dinner,dinner', SERVIS)).toEqual(['dinner']);
    expect(emphasisIds('breakfast', ['lunch', 'dinner'])).toEqual([]);
  });

  it('rend les moments dans l’ordre de la JOURNÉE, pas dans celui de la saisie', () => {
    expect(emphasisIds('dinner,breakfast', SERVIS)).toEqual(['breakfast', 'dinner']);
  });

  it('tolère les espaces autour des virgules', () => {
    expect(emphasisIds(' breakfast , dinner ', SERVIS)).toEqual(['breakfast', 'dinner']);
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

  it('le temps de prépa ne filtre plus : le pool ne bouge pas et le régime tient', () => {
    // Le filtre vivait dans le même prédicat que le régime : quand le curseur vidait le
    // pool, le repli lâchait les DEUX. Mesuré avant le retrait : au réglage par défaut
    // (15 min), un végétarien avait ZÉRO repas complet et recevait de la viande.
    for (const mt of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      expect(mealPoolSize(makeProfile({ max_prep_time_min: 10 }), mt))
        .toBe(mealPoolSize(makeProfile({ max_prep_time_min: 30 }), mt));
    }
    const vege = makeProfile({ dietary_restrictions: ['vegetarian'], max_prep_time_min: 10, plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0] });
    const plan = buildLocalPlan(vege, 0);
    const horsRegime = plan.meals.filter((m) => !m.recipe.restrictions_ok?.includes('vegetarian'));
    expect(horsRegime.map((m) => m.recipe.name_fr), 'aucun repas ne doit sortir du régime').toEqual([]);
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

  // Décision 2026-07-29 : le jour de repos agit sur la CIBLE (restDayRatio) puis sur
  // l'adaptation des quantités — jamais sur le CHOIX de la recette. Le tag `rest_day_ok`
  // pilotait un départage qui déplaçait 30 à 36 % des repas des jours de repos, alors
  // qu'un tiers du catalogue le portait à contre-sens.
  //
  // ⚠️ Ce test inversait le tag sur tout le catalogue pour prouver que la sélection ne le
  // lisait pas. Le 2026-08-03 le champ a été **supprimé** (données, schéma et type) : il
  // n'y a plus rien à inverser, et l'absence garantit mieux que l'ignorance. Ce qui reste
  // à vérifier ici, c'est que le plan ne dépend d'AUCUN reliquat de ce tag ; la
  // non-réapparition du champ est verrouillée par `lib/__tests__/tags.test.ts`.
  it('un tag « jour de repos » posé sur les recettes n’influence PAS la sélection', () => {
    const p = makeProfile({ training_days_per_week: 3, plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0] });
    const sig = (pl: ReturnType<typeof buildLocalPlan>) => pl.meals.map((m) => `${m.id}:${m.recipe.id}`).join('|');

    const avant = sig(buildLocalPlan(p, 0));
    // On REPOSE le tag artificiellement, une recette sur deux : si un jour la sélection
    // se remettait à le lire, le plan bougerait et ce test le dirait.
    setRecipeOverrides(Object.fromEntries(
      RECIPES.map((r, i) => [r.id, { ...r, rest_day_ok: i % 2 === 0 } as typeof r]),
    ));
    expect(sig(buildLocalPlan(p, 0))).toBe(avant);
  });

  it('le jour de repos déplace bien les macros (le mécanisme qui remplace le tag)', () => {
    const p = makeProfile({ training_days_per_week: 3, plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0] });
    const plan = buildLocalPlan(p, 0);
    const totals = plan.total_macros_per_day;
    const restDays = restDaysForProfile(p, 7);
    const moy = (repos: boolean, pick: (t: (typeof totals)[number]) => number) => {
      const idx = totals.map((_, i) => i).filter((i) => restDays.has(i + 1) === repos);
      return idx.reduce((s, i) => s + pick(totals[i]), 0) / idx.length;
    };
    expect(restDays.size, 'le profil doit avoir des jours de repos').toBeGreaterThan(0);
    expect(moy(true, (t) => t.carbs_g)).toBeLessThan(moy(false, (t) => t.carbs_g));
    expect(moy(true, (t) => t.fat_g)).toBeGreaterThan(moy(false, (t) => t.fat_g));
  });
});

describe('jours de repos choisis par l’utilisateur (rest_weekdays)', () => {
  it('rest_weekdays absent → repli sur la déduction auto', () => {
    const p = makeProfile({ plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5], training_days_per_week: 4 });
    expect([...restDaysForProfile(p, 5)].sort()).toEqual([...restDaySet(5, 4)].sort());
  });

  it('rest_weekdays mappe les jours de semaine sur les index du plan', () => {
    // plan lun→ven ; repos = lundi (idx 1) + vendredi (idx 5)
    const p = makeProfile({ plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5], rest_weekdays: [1, 5] });
    expect([...restDaysForProfile(p, 5)].sort((a, b) => a - b)).toEqual([1, 5]);
  });

  it('rest_weekdays = [] → aucun jour de repos même sans entraînement', () => {
    const p = makeProfile({ plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], training_days_per_week: 0, rest_weekdays: [] });
    expect(restDaysForProfile(p, 7).size).toBe(0);
  });

  it('un jour de repos hors du plan est ignoré', () => {
    // plan lun→ven, repos demandé le dimanche (0) → non planifié → ignoré
    const p = makeProfile({ plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5], rest_weekdays: [0] });
    expect(restDaysForProfile(p, 5).size).toBe(0);
  });

  it('buildLocalPlan applique les jours de repos choisis', () => {
    const p = makeProfile({ plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], rest_weekdays: [6, 0] });
    const plan = buildLocalPlan(p, 0);
    const rest = new Set(plan.meals.filter((m) => m.rest_day).map((m) => m.day));
    expect([...rest].sort((a, b) => a - b)).toEqual([6, 7]); // sam = idx 6, dim = idx 7
  });

  it('rest_weekdays entre dans la signature du plan (régénère au changement)', () => {
    const base = makeProfile({ plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5] });
    expect(profileSignature({ ...base, rest_weekdays: [1] }))
      .not.toBe(profileSignature({ ...base, rest_weekdays: [2] }));
  });
});

describe('banque de calories (Kyroz+) — « resto samedi » à travers le moteur', () => {
  // plan_weekdays par défaut = [1,2,3,4,5] (lun→ven) sur 5 jours.
  // Un écart posé sur le MERCREDI (getDay 3) tombe donc sur le jour 3 du plan.
  const kcalParJour = (p: Parameters<typeof buildLocalPlan>[0]) =>
    buildLocalPlan(p, 0).total_macros_per_day.map((d) => d.kcal);

  it('sans banque, le plan est INCHANGÉ (aucune régression pour qui n’en a pas)', () => {
    const p = makeProfile();
    const sans = buildLocalPlan(p, 0);
    const vide = buildLocalPlan({ ...p, calorie_bank: {} }, 0);
    expect(vide.total_macros_per_day).toEqual(sans.total_macros_per_day);
  });

  it('un écart posé sur un jour HORS du plan est ignoré (samedi, plan lun→ven)', () => {
    const p = makeProfile();
    const ref = kcalParJour(p);
    expect(kcalParJour({ ...p, calorie_bank: { '6': 600 } })).toEqual(ref);
  });

  it('« +500 mercredi » : le mercredi monte nettement au-dessus des autres jours', () => {
    const p = makeProfile();
    const avec = kcalParJour({ ...p, calorie_bank: { '3': 500 } });
    const autres = avec.filter((_, i) => i !== 2);
    const moyenneAutres = autres.reduce((s, k) => s + k, 0) / autres.length;
    expect(avec[2] - moyenneAutres).toBeGreaterThan(400);
  });

  it('la SEMAINE ne dérive pas : le total reste proche du total sans banque', () => {
    const p = makeProfile();
    const somme = (a: number[]) => a.reduce((s, k) => s + k, 0);
    const sans = somme(kcalParJour(p));
    const avec = somme(kcalParJour({ ...p, calorie_bank: { '3': 500 } }));
    // Tolérance : la grille de portions ne tombe jamais au kcal près.
    expect(Math.abs(avec - sans)).toBeLessThan(0.04 * sans);
  });

  it('les PROTÉINES ne se lissent pas — plancher quotidien intact (§6)', () => {
    const p = makeProfile();
    const sans = buildLocalPlan(p, 0).total_macros_per_day.map((d) => d.protein_g);
    const avec = buildLocalPlan({ ...p, calorie_bank: { '3': 500 } }, 0)
      .total_macros_per_day.map((d) => d.protein_g);
    for (let i = 0; i < sans.length; i++) {
      expect(Math.abs(avec[i] - sans[i]), `jour ${i + 1}`).toBeLessThan(0.12 * sans[i]);
    }
  });

  it('un écart ÉNORME ne fait descendre aucun jour sous le filet absolu', () => {
    const p = makeProfile();
    for (const kcal of buildLocalPlan({ ...p, calorie_bank: { '3': 4000 } }, 0)
      .total_macros_per_day.map((d) => d.kcal)) {
      expect(kcal).toBeGreaterThan(1000);
    }
  });

  it('reste DÉTERMINISTE avec une banque (même profil → même plan)', () => {
    const p = makeProfile({ calorie_bank: { '3': 500 } });
    expect(buildLocalPlan(p, 0).meals.map((m) => m.recipe.id))
      .toEqual(buildLocalPlan(p, 0).meals.map((m) => m.recipe.id));
  });
});

describe('banque de calories — elle SURVIT au recalage (bug mesuré le 2026-07-31)', () => {
  // La banque n'était calculée QUE dans buildLocalPlan. Tout le reste lisait la
  // cible PLATE (`profile.target_kcal`), donc chaque recalage effaçait l'écart
  // déclaré. Et le recalage n'est pas un geste rare : `resetTracking` part tout
  // seul au premier lancement d'un nouveau jour, `rebalanceDay` à chaque
  // « j'ai mangé » / « sauté ». La feature ne vivait qu'à l'instant de la génération.
  const p = makeProfile({ calorie_bank: { '3': 500 } }); // mercredi = jour 3 du plan
  const kcal = (plan: ReturnType<typeof buildLocalPlan>) =>
    plan.total_macros_per_day.map((d) => Math.round(d.kcal));

  it('dayTargetKcal expose la cible DU JOUR, banque comprise', () => {
    expect(dayTargetKcal(p, 5, 3)).toBeGreaterThan(p.target_kcal + 400); // le jour « resto »
    expect(dayTargetKcal(p, 5, 1)).toBeLessThan(p.target_kcal);          // un jour qui compense
    // Sans banque, c'est exactement la cible du profil — aucune régression.
    expect(dayTargetKcal(makeProfile(), 5, 3)).toBe(makeProfile().target_kcal);
  });

  it('rebalanceDay ne rabote PAS le jour de l’écart sur la cible plate', () => {
    const plan = buildLocalPlan(p, 0);
    const avant = kcal(plan)[2];
    const apres = kcal(rebalanceDay(p, plan, 3))[2];
    // Avant le correctif : 2690 → 2210, l'utilisateur perdait 480 des 500 déclarés.
    expect(Math.abs(apres - avant), `avant=${avant} après=${apres}`).toBeLessThan(80);
    expect(apres).toBeGreaterThan(p.target_kcal + 400);
  });

  it('resetTracking (nouveau jour) ne remonte pas les jours de compensation', () => {
    const plan = buildLocalPlan(p, 0);
    const avant = kcal(plan);
    const apres = kcal(resetTracking(p, plan));
    const somme = (a: number[]) => a.reduce((s, x) => s + x, 0);
    // La SEMAINE garde son total : c'est tout le contrat de la banque.
    expect(Math.abs(somme(apres) - somme(avant))).toBeLessThan(0.02 * somme(avant));
    for (let i = 0; i < avant.length; i++) {
      expect(Math.abs(apres[i] - avant[i]), `jour ${i + 1}`).toBeLessThan(90);
    }
  });

  it('sans banque, recalage et reset restent inchangés (non-régression)', () => {
    const q = makeProfile();
    const plan = buildLocalPlan(q, 0);
    for (const jour of kcal(resetTracking(q, plan))) {
      expect(Math.abs(jour - q.target_kcal)).toBeLessThan(90);
    }
  });
});

describe('E8 — l\'écart hors plan : ce qu\'on reprend, et ce qui reste', () => {
  // L'écran promettait « rentrer dans ta cible » sans vérifier qu'il y arrivait.
  // On ne peut pas dé-manger : sur un petit gabarit, la meilleure option restait
  // 318 kcal au-dessus après un écart de +600 (mesuré le 2026-07-31). Le moteur
  // expose désormais les deux chiffres pour que l'écran puisse le DIRE.
  const petiteFemme = makeProfile({
    sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut',
    tdee_kcal: 1642, target_kcal: 1342, target_protein_g: 97, target_carbs_g: 150, target_fat_g: 45,
  });
  const grandHomme = makeProfile({ tdee_kcal: 2404, target_kcal: 2104, target_protein_g: 149 });

  /** Petit-déj mangé, puis un écart hors plan déclaré dans la matinée. */
  const matinAvecEcart = (p: Parameters<typeof buildLocalPlan>[0], ecart: number) => {
    const plan0 = buildLocalPlan(p, 0);
    const bf = plan0.meals.find((m) => m.day === 1 && m.meal_type === 'breakfast')!;
    // Comme en production (`plan.tsx::logOffPlan`) : les totaux sont recalculés avec
    // l'écart. C'est ce que l'utilisateur a sous les yeux au moment du choix.
    const meals = plan0.meals.map((m) => (m.id === bf.id ? { ...m, status: 'eaten' as const, locked_macros: m.macros } : m));
    const day_extras = { 1: { kcal: ecart, protein_g: 10, carbs_g: 40, fat_g: 15 } };
    return { ...plan0, meals, day_extras, total_macros_per_day: computeDailyTotals(meals, plan0.days, day_extras) };
  };

  it('un petit écart RENTRE dans la cible — et le dit', () => {
    // Le verdict d'écran se lit à la tolérance commune (100 kcal), pas à zéro :
    // annoncer « on n'y arrive pas » pour un reliquat de 6 kcal serait une alarme
    // pour du bruit, pendant que la barre juste dessous affiche « ✓ dans la cible ».
    for (const ecart of [100, 200, 400]) {
      const opts = adaptDayOptions(grandHomme, matinAvecEcart(grandHomme, ecart), 1, 10);
      expect(opts.length, `+${ecart}`).toBeGreaterThan(0);
      expect(opts.some((o) => o.overTargetKcal <= ON_TARGET_TOLERANCE_KCAL), `+${ecart}`).toBe(true);
    }
  });

  it('la tolérance est la MÊME que celle de la barre du jour (source unique)', () => {
    expect(ON_TARGET_TOLERANCE_KCAL).toBe(100);
  });

  it('un GROS écart sur un petit gabarit ne rentre pas — et ça se voit', () => {
    const opts = adaptDayOptions(petiteFemme, matinAvecEcart(petiteFemme, 800), 1, 10);
    expect(opts.length).toBeGreaterThan(0);
    // Aucune option n'approche la cible : c'est ce test qui change le texte affiché.
    expect(opts.every((o) => o.overTargetKcal > ON_TARGET_TOLERANCE_KCAL)).toBe(true);
    // …mais chacune reprend RÉELLEMENT quelque chose : on a de quoi montrer un
    // chiffre utile plutôt qu'un reproche.
    expect(opts.some((o) => o.absorbedKcal > 50)).toBe(true);
  });

  it('« reprend X » est exact : c\'est l\'écart au plan non adapté', () => {
    const plan = matinAvecEcart(grandHomme, 400);
    const avant = Math.round(plan.total_macros_per_day[0].kcal);
    for (const o of adaptDayOptions(grandHomme, plan, 1, 10)) {
      expect(o.absorbedKcal, o.key).toBe(Math.max(0, avant - o.dayKcal));
      expect(o.overTargetKcal, o.key).toBe(Math.max(0, o.dayKcal - grandHomme.target_kcal));
    }
  });

  it('le reliquat se mesure sur la cible DU JOUR, banque comprise', () => {
    // Un jour « resto +600 » a une cible plus haute : un écart hors plan ne doit pas
    // s'y lire comme un dépassement de la cible plate (cf. dayTargetKcal).
    const p = { ...grandHomme, calorie_bank: { '3': 600 } }; // mercredi = jour 3
    const plan = buildLocalPlan(p, 0);
    const bf = plan.meals.find((m) => m.day === 3 && m.meal_type === 'breakfast')!;
    const mealsJ3 = plan.meals.map((m) => (m.id === bf.id ? { ...m, status: 'eaten' as const, locked_macros: m.macros } : m));
    const extrasJ3 = { 3: { kcal: 200, protein_g: 5, carbs_g: 20, fat_g: 8 } };
    const avecEcart = { ...plan, meals: mealsJ3, day_extras: extrasJ3, total_macros_per_day: computeDailyTotals(mealsJ3, plan.days, extrasJ3) };
    const opts = adaptDayOptions(p, avecEcart, 3, 10);
    const plate = adaptDayOptions({ ...p, calorie_bank: undefined }, avecEcart, 3, 10);
    // Même journée, même écart : mesuré contre la cible haute, il reste moins à reprendre.
    expect(opts[0].overTargetKcal).toBeLessThan(plate[0].overTargetKcal);
  });
});
