/** Distribution du dépassement protéique quotidien, sur le gabarit du test. */
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { MEAL_ORDER, UserProfile } from '../lib/types';

const p = recalcProfile({
  id: 'test', sex: 'female', age: 30, weight_kg: 70, height_cm: 168,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'bulk', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
} as unknown as UserProfile);

const ratios: number[] = [];
for (const seed of [0, 1, 2]) {
  for (const g of buildLocalPlan(p, seed).total_macros_per_day.map((m) => m.protein_g)) {
    ratios.push(g / p.target_protein_g);
  }
}
ratios.sort((a, b) => a - b);
const moy = ratios.reduce((s, x) => s + x, 0) / ratios.length;
console.log(`jours mesurés : ${ratios.length}`);
console.log(`min ${ratios[0].toFixed(3)} · médiane ${ratios[Math.floor(ratios.length / 2)].toFixed(3)} · moyenne ${moy.toFixed(3)} · MAX ${ratios[ratios.length - 1].toFixed(3)}`);
console.log(`jours au-dessus de 1,16 : ${ratios.filter((x) => x >= 1.16).length}`);
console.log(`les 5 plus hauts : ${ratios.slice(-5).map((x) => x.toFixed(3)).join(' · ')}`);
