/**
 * Mesure du RENOUVELLEMENT réel d'un « Régénérer mon plan ».
 *
 * Ne réplique aucune formule : appelle `buildLocalPlan` avec des seeds successifs,
 * exactement comme l'écran Plan le fait après le drapeau REROLL_KEY.
 */
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import type { UserProfile, MealPlan, DietaryRestriction, Sex, Goal, VarietyPreference } from '../lib/types';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
// Les TROIS réglages : depuis le 2026-08-02 ils pilotent l'ampleur du reroll, donc la
// mesure doit les distinguer — agrégés, ils se masqueraient l'un l'autre.
const VARIETES: VarietyPreference[] = ['repetitive', 'balanced', 'max'];
const parVariete: Record<string, { pos: number; chg: number; prem: number; premChg: number; fig: number; nPos: number }> = {};
for (const v of VARIETES) parVariete[v] = { pos: 0, chg: 0, prem: 0, premChg: 0, fig: 0, nPos: 0 };

type Gabarit = { nom: string; sex: Sex; weight_kg: number; height_cm: number; age: number; goal: Goal };
const PROFILS: Gabarit[] = [
  { nom: 'F 55 sèche', sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut' },
  { nom: 'F 65 maintien', sex: 'female', weight_kg: 65, height_cm: 167, age: 30, goal: 'maintain' },
  { nom: 'F 70 masse', sex: 'female', weight_kg: 70, height_cm: 168, age: 30, goal: 'bulk' },
  { nom: 'H 70 maintien', sex: 'male', weight_kg: 70, height_cm: 175, age: 30, goal: 'maintain' },
  { nom: 'H 82 sèche (Kévin)', sex: 'male', weight_kg: 82, height_cm: 180, age: 32, goal: 'cut' },
  { nom: 'H 95 masse', sex: 'male', weight_kg: 95, height_cm: 183, age: 30, goal: 'bulk' },
];
const REGIMES: { nom: string; r: DietaryRestriction[] }[] = [
  { nom: 'aucun', r: [] },
  { nom: 'végétarien', r: ['vegetarian'] },
  { nom: 'vegan', r: ['vegan'] },
  { nom: 'sans gluten', r: ['gluten_free'] },
];

function profil(g: Gabarit, restrictions: DietaryRestriction[], variety: VarietyPreference): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety,
    dietary_restrictions: restrictions, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

/** Clé de position stable : jour + créneau. */
const posKey = (m: { day: number; meal_type: string }) => `${m.day}|${m.meal_type}`;
function parPosition(p: MealPlan): Map<string, string> {
  const m = new Map<string, string>();
  p.meals.forEach((x) => m.set(posKey(x), x.recipe.id));
  return m;
}

let totalPos = 0, totalChg = 0;
let vuPremier = 0, chgPremier = 0;
let vuJ1 = 0, chgJ1 = 0;
const distinctsParPos: number[] = [];
const lignes: string[] = [];
// ⚠️ CONTRE-MESURE INDISPENSABLE — ajoutée après coup, et pas par hasard.
// Les métriques ci-dessus ne regardent QUE la variation d'un reroll à l'autre. Un
// moteur qui servirait la même recette 7 jours sur 7 mais une AUTRE à chaque reroll
// les satisferait toutes. C'est exactement ce qui a failli passer : en renforçant le
// biais fibres du reroll, une recette très fibreuse absorbait la pénalité de rotation
// (`VARIETY_STEP`) et monopolisait son créneau toute la semaine. Ici on compte les
// recettes DISTINCTES par créneau À L'INTÉRIEUR d'une même semaine.
const distinctsDansLaSemaine: { cle: string; n: number; creneau: string }[] = [];

for (const variety of VARIETES) {
  for (const g of PROFILS) {
    for (const reg of REGIMES) {
      const p = profil(g, reg.r, variety);
      const plans = SEEDS.map((s) => buildLocalPlan(p, s));
      const maps = plans.map(parPosition);

      // Renouvellement d'un reroll à l'autre (N → N+1) : ce que l'utilisateur vit.
      let pos = 0, chg = 0, j1 = 0, j1chg = 0, prem = 0, premChg = 0;
      for (let i = 1; i < maps.length; i++) {
        const a = maps[i - 1], b = maps[i];
        for (const [k, idA] of a) {
          pos++; if (b.get(k) !== idA) chg++;
          if (k.startsWith('1|')) { j1++; if (b.get(k) !== idA) j1chg++; }
        }
        // Le PREMIER repas du jour 1 = ce que l'écran affiche en arrivant.
        const premA = plans[i - 1].meals.find((m) => m.day === 1)!.recipe.id;
        const premB = plans[i].meals.find((m) => m.day === 1)!.recipe.id;
        prem++; if (premA !== premB) premChg++;
      }
      const acc = parVariete[variety];
      acc.pos += pos; acc.chg += chg; acc.prem += prem; acc.premChg += premChg;
      totalPos += pos; totalChg += chg;
      vuJ1 += j1; chgJ1 += j1chg;
      vuPremier += prem; chgPremier += premChg;

      // Combien de recettes DIFFÉRENTES une même position voit-elle sur 8 rerolls ?
      const positions = [...maps[0].keys()];
      const d = positions.map((k) => new Set(maps.map((m) => m.get(k))).size);
      distinctsParPos.push(...d);
      parVariete[variety].nPos += d.length;
      parVariete[variety].fig += d.filter((x) => x === 1).length;

      // Et DANS une même semaine : le créneau tourne-t-il, ou sert-il 7 fois la même ?
      for (const plan of plans) {
        for (const creneau of ['breakfast', 'lunch', 'dinner', 'snack']) {
          const duCreneau = plan.meals.filter((m) => m.meal_type === creneau);
          if (duCreneau.length < 2) continue;
          distinctsDansLaSemaine.push({
            cle: `${variety} · ${g.nom} · ${reg.nom}`,
            creneau,
            n: new Set(duCreneau.map((m) => m.recipe.id)).size,
          });
        }
      }

      lignes.push(
        `${variety.padEnd(8)} ${g.nom.padEnd(20)} ${reg.nom.padEnd(12)} ` +
        `renouvelé ${String(Math.round((chg / pos) * 100)).padStart(3)} %  ` +
        `· jour 1 ${String(Math.round((j1chg / j1) * 100)).padStart(3)} %  ` +
        `· 1er repas ${String(Math.round((premChg / prem) * 100)).padStart(3)} %  ` +
        `· recettes vues/position ${(d.reduce((s, x) => s + x, 0) / d.length).toFixed(1)}/8`
      );
    }
  }
}

const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)} %`;
console.log(lignes.join('\n'));
console.log('\n════ PAR RÉGLAGE DE VARIÉTÉ ══════════════════════════════');
console.log(`${'réglage'.padEnd(12)} ${'1er repas'.padStart(10)} ${'semaine'.padStart(9)} ${'figées'.padStart(8)}`);
for (const v of VARIETES) {
  const a = parVariete[v];
  console.log(`${v.padEnd(12)} ${((a.premChg / a.prem) * 100).toFixed(1).padStart(8)} % ${((a.chg / a.pos) * 100).toFixed(1).padStart(7)} % ${((a.fig / a.nPos) * 100).toFixed(1).padStart(6)} %`);
}
console.log('\n══════════════════ TOUTES VARIÉTÉS CONFONDUES ════════════');
console.log(`Positions renouvelées d'un reroll au suivant : ${pct(totalChg, totalPos)}  (${totalChg}/${totalPos})`);
console.log(`  · dont le JOUR 1                           : ${pct(chgJ1, vuJ1)}`);
console.log(`  · le 1ER REPAS affiché à l'arrivée         : ${pct(chgPremier, vuPremier)}`);
const moy = distinctsParPos.reduce((s, x) => s + x, 0) / distinctsParPos.length;
const figees = distinctsParPos.filter((x) => x === 1).length;
console.log(`Recettes distinctes vues par position sur 8 rerolls : ${moy.toFixed(2)} / 8`);
// La contre-mesure : un créneau doit TOURNER dans la semaine, pas seulement changer
// d'un reroll à l'autre. `monopoles` = créneaux servant UNE seule recette sur 7 jours.
const sem = distinctsDansLaSemaine;
const monopoles = sem.filter((x) => x.n === 1);
const moySem = sem.reduce((s, x) => s + x.n, 0) / sem.length;
console.log(`\nDANS la semaine — recettes distinctes par créneau : ${moySem.toFixed(2)} en moyenne`);
console.log(`Créneaux MONOPOLISÉS (1 seule recette sur 7 jours) : ${pct(monopoles.length, sem.length)}  (${monopoles.length}/${sem.length})`);
if (monopoles.length) {
  const parCle: Record<string, number> = {};
  monopoles.forEach((m) => { parCle[`${m.cle} · ${m.creneau}`] = (parCle[`${m.cle} · ${m.creneau}`] ?? 0) + 1; });
  Object.entries(parCle).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .forEach(([k, n]) => console.log(`   ${String(n).padStart(2)}/8 rerolls · ${k}`));
}
console.log(`Positions TOTALEMENT figées (1 seule recette sur 8) : ${pct(figees, distinctsParPos.length)}`);
