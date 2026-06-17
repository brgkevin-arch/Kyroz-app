import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile, MIN_KCAL, validateProfile } from '../tdee';
import { buildLocalPlan, computeDailyTotals, mealIngredients, swapMeal } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { isStaple } from '../pantry';
import { UserProfile, DietaryRestriction, MealType, Macros } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Stress-test multi-profils : ~10 hommes + ~10 femmes, poids/tailles/objectifs/
// sports/régimes variés. On déroule la chaîne RÉELLE profil → recalcProfile (TDEE
// + macros) → buildLocalPlan → courses, et on vérifie des INVARIANTS de cohérence
// sur chaque profil. C'est la « loop » : un cas de test par profil.
// ─────────────────────────────────────────────────────────────────────────────

type Case = { label: string } & Partial<UserProfile>;

const M3: MealType[] = ['breakfast', 'lunch', 'dinner'];
const M4: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// 10 profils HOMME — gabarits, objectifs, sports et régimes variés.
const MEN: Case[] = [
  { label: 'H1 jeune léger sèche muscu', sex: 'male', age: 19, weight_kg: 62, height_cm: 168, goal: 'cut', meals: M4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }] },
  { label: 'H2 moyen maintien course', sex: 'male', age: 27, weight_kg: 75, height_cm: 178, goal: 'maintain', meals: M4,
    sports: [{ type: 'course', sessions_per_week: 3, minutes_per_session: 45 }] },
  { label: 'H3 lourd bulk muscu', sex: 'male', age: 24, weight_kg: 95, height_cm: 188, goal: 'bulk', meals: M4, variety: 'max',
    sports: [{ type: 'musculation', sessions_per_week: 5, minutes_per_session: 75 }] },
  { label: 'H4 trapu recomp combat', sex: 'male', age: 31, weight_kg: 82, height_cm: 172, goal: 'recomp', meals: M4, body_fat_pct: 18,
    sports: [{ type: 'sports_combat', sessions_per_week: 3, minutes_per_session: 90 }] },
  { label: 'H5 grand sec lean_bulk', sex: 'male', age: 22, weight_kg: 70, height_cm: 192, goal: 'lean_bulk', meals: M3,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }] },
  { label: 'H6 surpoids cut_aggressive', sex: 'male', age: 35, weight_kg: 110, height_cm: 180, goal: 'cut_aggressive', meals: M4, body_fat_pct: 28,
    sports: [{ type: 'marche_rapide', sessions_per_week: 5, minutes_per_session: 40 }] },
  { label: 'H7 cycliste maintien végé', sex: 'male', age: 29, weight_kg: 68, height_cm: 175, goal: 'maintain', meals: M4,
    dietary_restrictions: ['vegetarian'],
    sports: [{ type: 'velo', sessions_per_week: 4, minutes_per_session: 90 }] },
  { label: 'H8 crossfit recomp sans gluten', sex: 'male', age: 26, weight_kg: 88, height_cm: 183, goal: 'recomp', meals: M4,
    dietary_restrictions: ['gluten_free'],
    sports: [{ type: 'hiit_crossfit', sessions_per_week: 4, minutes_per_session: 50 }] },
  { label: 'H9 sans sport renseigné (legacy)', sex: 'male', age: 40, weight_kg: 80, height_cm: 176, goal: 'cut', meals: M4,
    training_days_per_week: 2, sports: undefined },
  { label: 'H10 très léger jeune bulk', sex: 'male', age: 18, weight_kg: 55, height_cm: 165, goal: 'bulk', meals: M3,
    sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 45 }] },
];

// 10 profils FEMME — gabarits, objectifs, sports et régimes variés.
const WOMEN: Case[] = [
  { label: 'F1 petite sèche muscu', sex: 'female', age: 23, weight_kg: 52, height_cm: 158, goal: 'cut', meals: M4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 50 }] },
  { label: 'F2 moyenne maintien course', sex: 'female', age: 30, weight_kg: 62, height_cm: 168, goal: 'maintain', meals: M4,
    sports: [{ type: 'course', sessions_per_week: 3, minutes_per_session: 40 }] },
  { label: 'F3 grande recomp natation', sex: 'female', age: 28, weight_kg: 72, height_cm: 178, goal: 'recomp', meals: M4, body_fat_pct: 24,
    sports: [{ type: 'natation', sessions_per_week: 3, minutes_per_session: 60 }] },
  { label: 'F4 lourde cut_aggressive', sex: 'female', age: 34, weight_kg: 88, height_cm: 165, goal: 'cut_aggressive', meals: M4, body_fat_pct: 33,
    sports: [{ type: 'marche_rapide', sessions_per_week: 5, minutes_per_session: 45 }] },
  { label: 'F5 athlète lean_bulk combat', sex: 'female', age: 25, weight_kg: 60, height_cm: 170, goal: 'lean_bulk', meals: M4, variety: 'max',
    sports: [{ type: 'sports_combat', sessions_per_week: 4, minutes_per_session: 75 }] },
  { label: 'F6 menue maintien végé', sex: 'female', age: 21, weight_kg: 48, height_cm: 155, goal: 'maintain', meals: M3,
    dietary_restrictions: ['vegetarian'],
    sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 45 }] },
  { label: 'F7 crossfit recomp sans lactose', sex: 'female', age: 27, weight_kg: 66, height_cm: 172, goal: 'recomp', meals: M4,
    dietary_restrictions: ['lactose_free'],
    sports: [{ type: 'hiit_crossfit', sessions_per_week: 4, minutes_per_session: 50 }] },
  { label: 'F8 pescatarienne sèche', sex: 'female', age: 32, weight_kg: 70, height_cm: 174, goal: 'cut', meals: M4,
    dietary_restrictions: ['pescatarian'],
    sports: [{ type: 'velo', sessions_per_week: 3, minutes_per_session: 60 }] },
  { label: 'F9 sans sport renseigné (legacy)', sex: 'female', age: 45, weight_kg: 64, height_cm: 162, goal: 'cut', meals: M4,
    training_days_per_week: 1, sports: undefined },
  { label: 'F10 grande bulk basket', sex: 'female', age: 20, weight_kg: 75, height_cm: 182, goal: 'bulk', meals: M4,
    sports: [{ type: 'basket', sessions_per_week: 3, minutes_per_session: 90 }] },
];

const ALL: Case[] = [...MEN, ...WOMEN];

// Signature stable d'un plan (recettes + macros + grammes adaptés) pour le déterminisme.
function planSig(p: ReturnType<typeof buildLocalPlan>): string {
  return p.meals
    .map((m) => `${m.id}|${m.recipe.id}|${m.macros.kcal},${m.macros.protein_g},${m.macros.carbs_g},${m.macros.fat_g}|${(m.adapted_ingredients ?? []).map((i) => `${i.ref ?? i.name}:${i.quantity_g}`).join(',')}`)
    .join('||');
}

const dayDev = (got: number, target: number) => Math.abs(got - target) / Math.max(target, 1);

describe('Stress-test 20 profils (10 H + 10 F) — cohérence bout-en-bout', () => {
  it.each(ALL)('$label : garde-fous + macros cohérentes', (c) => {
    const { label, ...over } = c;
    const p = recalcProfile(makeProfile(over));

    // Garde-fous CLAUDE.md §6
    expect(validateProfile(p.sex, p.age, p.target_kcal), label).toBeNull();
    expect(p.target_kcal, label).toBeGreaterThanOrEqual(MIN_KCAL[p.sex]);
    expect(Number.isFinite(p.tdee_kcal!), label).toBe(true);

    // Énergie des macros cohérente avec target_kcal (arrondi)
    const kcalFromMacros = p.target_protein_g * 4 + p.target_carbs_g * 4 + p.target_fat_g * 9;
    expect(dayDev(kcalFromMacros, p.target_kcal), `${label} macros↔kcal`).toBeLessThan(0.06);

    // Pas de macro absurde
    expect(p.target_protein_g, label).toBeGreaterThan(0);
    expect(p.target_carbs_g, label).toBeGreaterThanOrEqual(0);
    expect(p.target_fat_g, label).toBeGreaterThan(0);
  });

  it.each(ALL)('$label : plan généré, complet, sans repas vide', (c) => {
    const { label, ...over } = c;
    const p = recalcProfile(makeProfile(over));
    const plan = buildLocalPlan(p);

    const mealTypes = (p.meals ?? []).length;
    expect(plan.meals.length, label).toBe(plan.days * mealTypes);
    for (const m of plan.meals) {
      expect(m.macros.kcal, `${label} ${m.id} kcal>0`).toBeGreaterThan(0);
      expect(m.adapted_ingredients?.length, `${label} ${m.id} ingr`).toBeGreaterThan(0);
      // Macros du repas recalculées depuis les grammes : kcal ≈ 4P+4C+9F
      const calc = m.macros.protein_g * 4 + m.macros.carbs_g * 4 + m.macros.fat_g * 9;
      expect(dayDev(calc, m.macros.kcal), `${label} ${m.id} recompute`).toBeLessThan(0.13);
    }
  });

  it.each(ALL)('$label : totaux jour proches de la cible (kcal ±15%, pas de bombe de gras)', (c) => {
    const { label, ...over } = c;
    const p = recalcProfile(makeProfile(over));
    const plan = buildLocalPlan(p);
    const totals = computeDailyTotals(plan.meals, plan.days);

    for (let d = 0; d < totals.length; d++) {
      const t = totals[d];
      // kcal du jour dans une bande raisonnable autour de la cible
      expect(dayDev(t.kcal, p.target_kcal), `${label} J${d + 1} kcal=${t.kcal}/${p.target_kcal}`).toBeLessThanOrEqual(0.15);
      // Protéines : jamais affamées (plancher) — au moins 85% de la cible
      expect(t.protein_g, `${label} J${d + 1} prot=${t.protein_g}/${p.target_protein_g}`).toBeGreaterThanOrEqual(p.target_protein_g * 0.85);
      // Pas de bombe de gras : part calorique des lipides ≤ 50% du jour
      const fatShare = (t.fat_g * 9) / Math.max(t.kcal, 1);
      expect(fatShare, `${label} J${d + 1} fatShare=${fatShare.toFixed(2)}`).toBeLessThanOrEqual(0.5);
    }
  });

  it.each(ALL)('$label : déterministe (même profil + seed ⇒ même plan)', (c) => {
    const { label, ...over } = c;
    const p = recalcProfile(makeProfile(over));
    expect(planSig(buildLocalPlan(p, 0)), label).toBe(planSig(buildLocalPlan(p, 0)));
    expect(planSig(buildLocalPlan(p, 7)), label).toBe(planSig(buildLocalPlan(p, 7)));
  });

  it.each(ALL.filter((c) => (c.dietary_restrictions?.length ?? 0) > 0))(
    '$label : régime respecté (ou repli signalé honnêtement)',
    (c) => {
      const { label, ...over } = c;
      const p = recalcProfile(makeProfile(over));
      const plan = buildLocalPlan(p);
      const restrictions = p.dietary_restrictions as DietaryRestriction[];
      for (const m of plan.meals) {
        if (m.restriction_relaxed) continue; // repli honnête signalé à l'UI
        for (const r of restrictions) {
          // Recettes Kyroz : restrictions_ok autoritaire
          if (m.recipe.restrictions_ok) {
            expect(m.recipe.restrictions_ok, `${label} ${m.recipe.id} viole ${r}`).toContain(r);
          }
        }
      }
    },
  );

  it.each(ALL)('$label : courses = somme des ingrédients adaptés (hors staples)', (c) => {
    const { label, ...over } = c;
    const p = recalcProfile(makeProfile(over));
    const plan = buildLocalPlan(p);

    // Somme attendue par ingrédient (clé = nom minuscule), hors condiments staples.
    const expected = new Map<string, number>();
    for (const m of plan.meals) {
      for (const ing of mealIngredients(m)) {
        if (isStaple(ing.name)) continue;
        const k = ing.name.toLowerCase();
        expected.set(k, (expected.get(k) ?? 0) + ing.quantity_g);
      }
    }

    const list = buildShoppingList(plan); // frigo vide → tout doit apparaître
    for (const item of list.items) {
      const k = item.name.toLowerCase();
      expect(item.quantity, `${label} ${item.name}`).toBe(Math.round(expected.get(k) ?? -1));
    }
    // Tout ingrédient non-staple avec une quantité arrondie > 0 doit figurer dans la liste.
    const listed = new Set(list.items.map((i) => i.name.toLowerCase()));
    for (const [k, qty] of expected) {
      if (Math.round(qty) > 0) expect(listed.has(k), `${label} manque ${k}`).toBe(true);
    }
  });
});

// « Remplacer ce repas » (swapMeal) — vérifie que l'alternative reste conforme au
// régime (ou que le repli est signalé), et que ses macros restent cohérentes.
// swapMeal tire au hasard parmi le top → on répète pour couvrir les alternatives.
describe('swapMeal — cohérence régime + macros', () => {
  it.each(ALL.filter((c) => (c.dietary_restrictions?.length ?? 0) > 0))(
    '$label : un swap ne sert jamais une recette hors-régime sans bandeau honnête',
    (c) => {
      const { label, ...over } = c;
      const p = recalcProfile(makeProfile(over));
      const plan = buildLocalPlan(p);
      const restrictions = p.dietary_restrictions as DietaryRestriction[];
      for (const meal of plan.meals) {
        for (let k = 0; k < 10; k++) {
          const swapped = swapMeal(p, plan, meal).meals.find((m) => m.id === meal.id)!;
          expect(swapped.macros.kcal, `${label} swap kcal>0`).toBeGreaterThan(0);
          if (swapped.restriction_relaxed) continue; // repli honnête signalé à l'UI
          for (const r of restrictions) {
            if (swapped.recipe.restrictions_ok) {
              expect(swapped.recipe.restrictions_ok, `${label} swap ${swapped.recipe.id} viole ${r}`).toContain(r);
            }
          }
        }
      }
    },
  );
});

// Rapport agrégé : on imprime les écarts empiriques pour les 20 profils (visible
// avec `vitest run --reporter=verbose`). Ne fait pas échouer le run : c'est le
// tableau de bord du stress-test.
describe('Rapport agrégé (déviations empiriques)', () => {
  it('imprime kcal/protéines réels vs cible pour chaque profil', () => {
    const rows: string[] = [];
    let maxKcalDev = 0;
    let minProtRatio = Infinity;
    let maxFatShare = 0;
    for (const c of ALL) {
      const { label, ...over } = c;
      const p = recalcProfile(makeProfile(over));
      const plan = buildLocalPlan(p);
      const totals = computeDailyTotals(plan.meals, plan.days);
      const avg = (sel: (m: Macros) => number) => totals.reduce((s, t) => s + sel(t), 0) / totals.length;
      const kcal = Math.round(avg((t) => t.kcal));
      const prot = Math.round(avg((t) => t.protein_g));
      const fat = Math.round(avg((t) => t.fat_g));
      const kcalDev = dayDev(kcal, p.target_kcal);
      const protRatio = prot / Math.max(p.target_protein_g, 1);
      const fatShare = (fat * 9) / Math.max(kcal, 1);
      maxKcalDev = Math.max(maxKcalDev, kcalDev);
      minProtRatio = Math.min(minProtRatio, protRatio);
      maxFatShare = Math.max(maxFatShare, fatShare);
      rows.push(
        `${label.padEnd(34)} cible ${String(p.target_kcal).padStart(4)}kcal/${String(p.target_protein_g).padStart(3)}P` +
        ` → réel ${String(kcal).padStart(4)}kcal (${(kcalDev * 100).toFixed(1).padStart(4)}%) / ${String(prot).padStart(3)}P (${(protRatio * 100).toFixed(0)}%) / gras ${(fatShare * 100).toFixed(0)}%`,
      );
    }
    // eslint-disable-next-line no-console
    console.log('\n' + rows.join('\n') +
      `\n\nMAX écart kcal: ${(maxKcalDev * 100).toFixed(1)}%  |  MIN ratio protéines: ${(minProtRatio * 100).toFixed(0)}%  |  MAX part gras: ${(maxFatShare * 100).toFixed(0)}%`);
    expect(rows).toHaveLength(20);
  });
});
