/**
 * LA PESÉE ET LES RECETTES DE LA SEMAINE (2026-10-21, point 2 du fondateur).
 *
 * Question : une pesée change les cibles, donc la signature du plan. Que devient la semaine ?
 *   A. re-tirée (comportement d'avant le 2026-10-21) : combien de recettes changent ?
 *   B. recettes gardées, portions recalculées (`buildLocalPlan(…, imposes)`) : que coûte-t-on ?
 *
 * Lancer : `npx tsx scripts/mesure-pesee.ts` (pas de ligne `npm run` : une ligne de `scripts`
 * dans package.json change l'empreinte et coupe la ligne OTA, CLAUDE.md §2).
 *
 * Mesuré le 2026-10-22 avec CE script (12 profils, régimes compris, × 3 tirages, 1 008 repas) :
 *   A. −0,3 kg (5 kcal/j) : 67 % des recettes changent ; −1 kg 72 % ; −2 kg 75 % ; −4 kg 82 %.
 *      (Premier panel du 2026-10-21, 4 omnivores × 5 tirages : 64 / 72 / 76 %, 20 semaines sur 20.)
 *   B. 0 recette changée ; écart kcal du jour 0,55 → 0,64 % (−1 kg), 0,91 % (−4 kg) ;
 *      drapeaux visibles 0–3 (re-tirage) contre 17–46 (gardées), soit 1,7 à 4,6 % des repas
 *      avec « un peu au-dessus de ta cible ». `rebalanceDay` à la place : 0,89 %, pire.
 */
import { buildLocalPlan, dayTargetKcal } from '../lib/planEngine';
import { FLAG_AUDIENCE } from '../lib/adaptRecipe';
import { recalcProfile } from '../lib/tdee';
import type { MealPlan, UserProfile } from '../lib/types';

const GABARITS = [
  { sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut' },
  { sex: 'female', weight_kg: 65, height_cm: 167, age: 30, goal: 'maintain' },
  { sex: 'male', weight_kg: 82, height_cm: 180, age: 32, goal: 'cut' },
  { sex: 'male', weight_kg: 95, height_cm: 183, age: 30, goal: 'lean_bulk' },
];
const REGIMES = [[], ['vegan'], ['vegetarian']];

function profil(g: (typeof GABARITS)[number], poids: number, regime: string[]): UserProfile {
  return recalcProfile({
    id: 'mesure', ...g, weight_kg: poids, activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }], neat_level: 'desk', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: regime, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

function qualite(p: UserProfile, plan: MealPlan) {
  let ecart = 0, drapeaux = 0;
  for (let d = 1; d <= plan.days; d++) {
    const cible = dayTargetKcal(p, plan.days, d);
    const k = plan.meals.filter((m) => m.day === d).reduce((s, m) => s + m.macros.kcal, 0);
    ecart += (Math.abs(k - cible) / cible) * 100;
  }
  for (const m of plan.meals) drapeaux += (m.adapt_flags ?? []).filter((f) => FLAG_AUDIENCE[f] === 'user').length;
  return { ecart: ecart / plan.days, drapeaux };
}

const changees = (a: MealPlan, b: MealPlan) => {
  const parId = new Map(a.meals.map((m) => [m.id, m.recipe.id]));
  return b.meals.filter((m) => parId.get(m.id) !== m.recipe.id).length;
};

const log = console.log;
console.log = () => {};
console.warn = () => {};
for (const delta of [-0.3, -0.5, -1, -2, -4]) {
  const t = { repas: 0, retire: 0, gardees: 0, eR: 0, dR: 0, eG: 0, dG: 0, n: 0 };
  for (const g of GABARITS) for (const r of REGIMES) for (let seed = 0; seed < 3; seed++) {
    const avant = profil(g, g.weight_kg, r), apres = profil(g, g.weight_kg + delta, r);
    const plan = buildLocalPlan(avant, seed);
    const retire = buildLocalPlan(apres, seed);
    const gardees = buildLocalPlan(apres, seed, new Map(plan.meals.map((m) => [m.id, m])));
    const qR = qualite(apres, retire), qG = qualite(apres, gardees);
    t.repas += plan.meals.length; t.retire += changees(plan, retire); t.gardees += changees(plan, gardees);
    t.eR += qR.ecart; t.dR += qR.drapeaux; t.eG += qG.ecart; t.dG += qG.drapeaux; t.n++;
  }
  log(`pesée ${delta} kg | re-tirée : ${((t.retire / t.repas) * 100).toFixed(1)} % de recettes changées, écart ${(t.eR / t.n).toFixed(2)} %, drapeaux ${t.dR}`
    + ` | gardées : ${t.gardees}/${t.repas} changées, écart ${(t.eG / t.n).toFixed(2)} %, drapeaux ${t.dG}`);
}
