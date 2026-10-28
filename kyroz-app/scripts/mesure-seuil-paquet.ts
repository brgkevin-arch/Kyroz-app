/**
 * Segment 10, constat 3 : le seuil dépend de ce qu'il y a déjà en réserve (décision fondateur du
 * 2026-10-28). Quelles lignes partent quand on n'a RIEN de l'aliment, et quand un paquet est déjà
 * ENTAMÉ — sur de vraies semaines, moteur réel.
 *
 *   npx tsx scripts/mesure-seuil-paquet.ts
 */
import { recalcProfile } from '../lib/tdee';
import { buildLocalPlan } from '../lib/planEngine';
import { buildShoppingList } from '../lib/shoppingList';
import { sousLeSeuil } from '../lib/seuilAchat';
import { MEAL_ORDER, UserProfile, Sex, Goal, DietaryRestriction } from '../lib/types';

const CORPS: { sex: Sex; poids: number; taille: number }[] = [
  { sex: 'female', poids: 55, taille: 162 }, { sex: 'male', poids: 80, taille: 178 },
];
const OBJ: Goal[] = ['cut', 'maintain'];
const REG: DietaryRestriction[][] = [['omnivore'], ['vegetarian'], ['gluten_free']];
const partis: Record<'vide' | 'entame', Record<string, number[]>> = { vide: {}, entame: {} };
let lignes = 0;
for (const c of CORPS) for (const goal of OBJ) for (const r of REG) for (const seed of [0, 1, 2]) {
  const p = recalcProfile({
    id: 't', sex: c.sex, age: 30, weight_kg: c.poids, height_cm: c.taille, activity_level: 'moderate',
    training_days_per_week: 0, sports: [], neat_level: 'desk', goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], meals: [...MEAL_ORDER], meal_emphasis: 'even',
    variety: 'max', dietary_restrictions: r, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
  // Une liste de fin de semaine (3 derniers jours) : c'est là que tombent les petites quantités.
  const plan = buildLocalPlan(p, seed);
  const liste = buildShoppingList({ ...plan, meals: plan.meals.filter((m) => m.day >= 5) }, []);
  for (const i of liste.items) {
    lignes++;
    // Chaque ligne lue deux fois : rien de cet aliment chez soi, puis un paquet déjà entamé
    // (la ligne est alors le MANQUE).
    for (const cas of ['vide', 'entame'] as const) {
      if (!sousLeSeuil(i, cas === 'entame')) continue;
      (partis[cas][`${i.name} (${i.unit})`] ??= []).push(Math.round(i.quantity));
    }
  }
}
for (const cas of ['vide', 'entame'] as const) {
  const n = Object.values(partis[cas]).reduce((t, q) => t + q.length, 0);
  console.log(`\n${cas === 'vide' ? 'RIEN EN RÉSERVE' : 'PAQUET DÉJÀ ENTAMÉ'} : ${n} lignes sur ${lignes} partent (${(100 * n / lignes).toFixed(1)} %)`);
  for (const [k, q] of Object.entries(partis[cas]).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${q.length}×  ${k} : ${q.slice(0, 6).join(', ')}`);
}
