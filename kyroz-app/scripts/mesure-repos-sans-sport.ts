/**
 * Sans sport déclaré, les jours sont-ils des « jours de repos » ? Et qu'est-ce que
 * ça coûte à l'assiette ? Compare ce que le Plan SERT (moyenne des jours) aux cibles
 * que le Profil AFFICHE. Moteur réel, aucune formule recopiée.
 *   npx tsx scripts/mesure-repos-sans-sport.ts
 */
import { recalcProfile } from '../lib/tdee';
import { buildLocalPlan, restDaysForProfile } from '../lib/planEngine';
import { MEAL_ORDER, UserProfile, SportSession, Sex, Goal } from '../lib/types';

type Corps = { nom: string; sex: Sex; poids: number; taille: number; mg: number };
const CORPS: Corps[] = [
  { nom: 'F 60', sex: 'female', poids: 60, taille: 165, mg: 25 },
  { nom: 'F 75', sex: 'female', poids: 75, taille: 168, mg: 32 },
  { nom: 'H 82', sex: 'male', poids: 82, taille: 180, mg: 12 },
  { nom: 'H 95', sex: 'male', poids: 95, taille: 182, mg: 24 },
];
const OBJ: Goal[] = ['cut', 'maintain', 'lean_bulk'];
const CAS: { nom: string; sports: SportSession[]; jours: number }[] = [
  { nom: 'sans sport', sports: [], jours: 0 },
  { nom: 'muscu 3×60', sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }], jours: 3 },
];

function profil(c: Corps, goal: Goal, sports: SportSession[], jours: number): UserProfile {
  return recalcProfile({
    id: 't', sex: c.sex, age: 30, weight_kg: c.poids, height_cm: c.taille, body_fat_pct: c.mg,
    activity_level: 'moderate', training_days_per_week: jours,
    sports, neat_level: 'desk', goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 5, plan_weekdays: [1, 2, 3, 4, 5],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

const r = (x: number) => Math.round(x);
for (const cas of CAS) {
  console.log(`\n── ${cas.nom} ─────────────────────────────────────────────`);
  console.log('corps | objectif  | repos | cible P/G/L        | servi P/G/L (moy.) | écart G | écart L | kcal cible/servi');
  let sommeG = 0, n = 0;
  for (const c of CORPS) for (const g of OBJ) {
    const p = profil(c, g, cas.sports, cas.jours);
    const plan = buildLocalPlan(p, 0);
    const jours = plan.total_macros_per_day;
    const moy = (k: 'protein_g' | 'carbs_g' | 'fat_g' | 'kcal') => jours.reduce((s, d) => s + d[k], 0) / jours.length;
    const repos = restDaysForProfile(p, plan.days).size;
    const dG = moy('carbs_g') - p.target_carbs_g, dL = moy('fat_g') - p.target_fat_g;
    sommeG += dG; n++;
    console.log(`${c.nom.padEnd(5)} | ${g.padEnd(9)} | ${repos}/${plan.days}   | ${r(p.target_protein_g)}/${r(p.target_carbs_g)}/${r(p.target_fat_g)}`.padEnd(49) +
      `| ${r(moy('protein_g'))}/${r(moy('carbs_g'))}/${r(moy('fat_g'))}`.padEnd(21) + `| ${r(dG) > 0 ? '+' : ''}${r(dG)}`.padEnd(10) + `| ${r(dL) > 0 ? '+' : ''}${r(dL)}`.padEnd(10) + `| ${r(p.target_kcal)}/${r(moy('kcal'))}`);
  }
  console.log(`écart moyen de glucides servi − cible : ${r(sommeG / n)} g/jour`);
}
