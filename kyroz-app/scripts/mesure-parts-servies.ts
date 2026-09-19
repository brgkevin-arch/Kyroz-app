/**
 * Les parts de protéines SERVIES par le moteur, contre les parts visées
 * (`lib/partsProteines.ts`, décisions du 2026-09-19) — et ce qu'elles coûtent au calibrage.
 *
 * Pour chaque cas (régime × protéines cochées) : 12 profils de référence × 4 semaines, la part
 * de chaque sorte dans les déjeuners et dîners, et les repas mal calibrés (drapeaux bloquants).
 *
 *   npx tsx scripts/mesure-parts-servies.ts
 */
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { partsCibles, sortesDe, LIBELLE_SORTE, type Sorte } from '../lib/partsProteines';
import { PROFILS_REF } from './mesure-couverture';
import type { DietaryRestriction, UserProfile } from '../lib/types';

const CAS: [string, DietaryRestriction[], string[]][] = [
  ['Omnivore, rien', ['omnivore'], []], ['Omnivore, poulet', ['omnivore'], ['poulet']],
  ['Omnivore, poulet + bœuf', ['omnivore'], ['poulet', 'bœuf']], ['Omnivore, poulet + bœuf + poisson', ['omnivore'], ['poulet', 'bœuf', 'poisson']],
  ['Omnivore, porc', ['omnivore'], ['porc']], ['Omnivore, poisson', ['omnivore'], ['poisson']],
  ['Halal, rien', ['omnivore', 'halal'], []], ['Halal, bœuf', ['omnivore', 'halal'], ['bœuf']],
  ['Pescétarien, rien', ['pescatarian'], []], ['Pescétarien, poisson', ['pescatarian'], ['poisson']], ['Pescétarien, végétal', ['pescatarian'], ['végétal']],
  ['Végétarien, tofu', ['vegetarian'], ['tofu']], ['Végétarien, pièces végétales', ['vegetarian'], ['pièces végétales']],
  ['Végétarien, tofu + légumineuses', ['vegetarian'], ['tofu', 'légumineuses']], ['Végétarien, tempeh', ['vegetarian'], ['tempeh']],
  ['Vegan, tempeh', ['vegan'], ['tempeh']], ['Vegan, seitan + tofu + légumineuses', ['vegan'], ['seitan', 'tofu', 'légumineuses']],
  ['Vegan sans gluten, pièces végétales', ['vegan', 'gluten_free'], ['pièces végétales']],
];
const profil = (g: (typeof PROFILS_REF)[number], r: DietaryRestriction[], prefs: string[]) => recalcProfile({ id: 'm', sex: g.sex, age: g.age,
  weight_kg: g.weight_kg, height_cm: g.height_cm, activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }], neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0, plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced', dietary_restrictions: r, disliked_foods: [],
  preferred_proteins: prefs } as unknown as UserProfile);
let drapeauxTotal = 0;
for (const [nom, r, prefs] of CAS) {
  const servis: Record<string, number> = {}; let n = 0, drapeaux = 0;
  const visees = partsCibles({ dietary_restrictions: r, preferred_proteins: prefs }, 14);
  for (const g of PROFILS_REF) for (let seed = 0; seed < 4; seed++) {
    for (const m of buildLocalPlan(profil(g, r, prefs), seed).meals) {
      for (const f of m.adapt_flags ?? []) if (f === 'over_target_kcal' || f === 'under_target_kcal' || f === 'protein_below_target') drapeaux++;
      if (m.meal_type !== 'lunch' && m.meal_type !== 'dinner') continue;
      n++;
      const s = sortesDe(m.recipe);
      for (const k of visees ? visees.keys() : []) if (k !== 'libre' && s.has(k as Sorte)) servis[k] = (servis[k] ?? 0) + 1;
    }
  }
  drapeauxTotal += drapeaux;
  const ligne = visees ? [...visees.entries()].filter(([k]) => k !== 'libre')
    .map(([k, p]) => `${LIBELLE_SORTE[k as Sorte]} ${Math.round(100 * (servis[k] ?? 0) / n)} % (visé ${Math.round(100 * p)})`).join(' · ') : 'libre';
  console.log(`${nom.padEnd(38)} ${ligne}  | drapeaux ${drapeaux}`);
}
console.log(`\nDrapeaux bloquants, tous cas : ${drapeauxTotal}`);
