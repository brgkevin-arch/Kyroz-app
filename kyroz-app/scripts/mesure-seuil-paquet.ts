/**
 * Segment 10, constat 3 : le seuil par aliment (15 % du plus petit format vendu). Quelles lignes
 * de liste disparaissent EN PLUS du seuil d'avant, sur de vraies semaines, et combien de grammes
 * manqueraient à qui n'en a pas chez lui. Moteur réel, réserve vide (le pire cas).
 *
 *   npx tsx scripts/mesure-seuil-paquet.ts
 */
import { recalcProfile } from '../lib/tdee';
import { buildLocalPlan } from '../lib/planEngine';
import { buildShoppingList } from '../lib/shoppingList';
import { sousLeSeuil, SEUILS, SEUIL_MIN, PART_DE_PORTION, SEUIL_MAX_PROTEINE } from '../lib/seuilAchat';
import { refDuNom } from '../lib/pantry';
import { MEAL_ORDER, UserProfile, Sex, Goal, DietaryRestriction } from '../lib/types';

const arrondi5 = (x: number) => 5 * Math.round(x / 5);
const ancienSeuil = (ref: string) => {
  const s = SEUILS[ref];
  const brut = Math.max(SEUIL_MIN, arrondi5(PART_DE_PORTION * s.portion));
  return s.role === 'protein' ? Math.min(SEUIL_MAX_PROTEINE, brut) : brut;
};
const CORPS: { sex: Sex; poids: number; taille: number }[] = [
  { sex: 'female', poids: 55, taille: 162 }, { sex: 'male', poids: 80, taille: 178 },
];
const OBJ: Goal[] = ['cut', 'maintain'];
const REG: DietaryRestriction[][] = [['omnivore'], ['vegetarian'], ['gluten_free']];
const parti: Record<string, { n: number; q: number[] }> = {};
let listes = 0, lignes = 0, parties = 0;
for (const c of CORPS) for (const goal of OBJ) for (const r of REG) for (const seed of [0, 1, 2]) {
  const p = recalcProfile({
    id: 't', sex: c.sex, age: 30, weight_kg: c.poids, height_cm: c.taille, activity_level: 'moderate',
    training_days_per_week: 0, sports: [], neat_level: 'desk', goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], meals: [...MEAL_ORDER], meal_emphasis: 'even',
    variety: 'max', dietary_restrictions: r, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
  // Une liste de fin de semaine (3 derniers jours) : c'est là que tombent les petits restes.
  const plan = buildLocalPlan(p, seed);
  const liste = buildShoppingList({ ...plan, meals: plan.meals.filter((m) => m.day >= 5) }, []);
  listes++;
  for (const i of liste.items) {
    lignes++;
    const ref = refDuNom(i.name);
    if (!ref || !sousLeSeuil(i) || i.quantity <= ancienSeuil(ref)) continue;
    parties++;
    (parti[`${i.name} (${i.unit}, seuil ${SEUILS[ref].seuil})`] ??= { n: 0, q: [] }).n++;
    parti[`${i.name} (${i.unit}, seuil ${SEUILS[ref].seuil})`].q.push(Math.round(i.quantity));
  }
}
console.log(`${listes} listes, ${lignes} lignes ; ${parties} lignes partent EN PLUS (${(100 * parties / lignes).toFixed(1)} %)`);
for (const [k, v] of Object.entries(parti).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${v.n}×  ${k} : ${v.q.slice(0, 6).join(', ')}`);
