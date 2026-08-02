/**
 * Mesure de VARIÉTÉ PERÇUE — les quasi-doublons servis dans la même semaine.
 *
 * ⚠️ Comme `mesure-couverture.ts`, ce script ne réplique AUCUNE formule du moteur : il
 * appelle `buildLocalPlan` et compte ce qui est réellement servi.
 *
 * Le défaut qu'il mesure n'était visible d'AUCUN des contrôles existants. `check:doublons`
 * compte des groupes de recettes proches dans le CATALOGUE (règle R4, qui ne s'alarme
 * qu'au-delà de 2 recettes par couple protéine × féculent) ; `mesure:couverture` compte
 * des recettes DISTINCTES servies. Ni l'un ni l'autre ne voit que deux recettes
 * différentes du même couple — « poulet-riz-brocoli » et « wok poulet-riz-légumes » —
 * tombent dans la même semaine. Mesuré le 2026-08-02 avant correctif : **56,3 % des
 * semaines**, et le pire contrevenant était un groupe de DEUX recettes, donc légal au
 * regard de R4. Le compteur du catalogue n'était pas l'instrument du défaut.
 *
 * Usage :
 *   npx tsx scripts/mesure-variete.ts           quasi-doublons + métriques de contrôle
 *   npx tsx scripts/mesure-variete.ts --detail  + le détail par profil × régime
 *   npx tsx scripts/mesure-variete.ts --variete=balanced
 *
 * ⚠️ Le réglage de variété PILOTE l'ampleur du reroll depuis le 2026-08-02
 * (`REROLL_PAR_VARIETE`). Le défaut reste `max` : c'est sur lui que sont calibrés les
 * chiffres de référence. Pour auditer un autre réglage, passer `--variete=`.
 */
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { getEffectiveRecipes } from '../lib/recipes';
import { recipeFiberPerPortion } from '../lib/fiber';
import { PROFILS_REF, type Gabarit } from './mesure-couverture';
import type { DietaryRestriction, Recipe, UserProfile, VarietyPreference } from '../lib/types';

// Tirages audités. Par défaut 0→3 (un plan canonique + trois régénérations), ce sur
// quoi sont calibrés les chiffres de référence. `--seeds=0` isole le plan CANONIQUE,
// `--seeds=1,2,3` les seules régénérations — utile pour vérifier que le premier plan
// servi à un nouvel utilisateur tient la comparaison (mesuré le 2026-08-02 : non).
const SEEDS = ((process.argv.find((a) => a.startsWith('--seeds=')) ?? '').split('=')[1] || '0,1,2,3')
  .split(',').map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
const VARIETE = ((process.argv.find((a) => a.startsWith('--variete=')) ?? '').split('=')[1] || 'max') as VarietyPreference;
const REGIMES: { nom: string; r: DietaryRestriction[] }[] = [
  { nom: 'aucun', r: [] },
  { nom: 'végétarien', r: ['vegetarian'] },
  { nom: 'vegan', r: ['vegan'] },
  { nom: 'sans gluten', r: ['gluten_free'] },
  { nom: 'vegan+SG', r: ['vegan', 'gluten_free'] },
];

/**
 * Clé de FAMILLE — doit rester le miroir exact de `familyKey` dans `lib/planEngine.ts`,
 * et du triplet de la règle R4 (`scripts/check-doublons.ts`). Si les deux divergent, on
 * mesure autre chose que ce que le moteur arbitre.
 */
function familleDe(r: Recipe): string {
  const refs = (role: string) =>
    r.ingredients.filter((i) => i.macro_role === role).map((i) => i.ref ?? i.name).sort().join('+') || '∅';
  const creneau = r.tags.includes('snack') ? 'collation' : r.tags.includes('breakfast') ? 'petit_dej' : 'repas_complet';
  return `${creneau} | ${refs('protein')} × ${refs('carb')}`;
}

function profil(g: Gabarit, restrictions: DietaryRestriction[] = []): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: VARIETE,
    dietary_restrictions: restrictions, disliked_foods: [], preferred_proteins: [],
  } as UserProfile);
}

const detail = process.argv.includes('--detail');
const tailles: Record<string, number> = {};
for (const r of getEffectiveRecipes()) { const k = familleDe(r); tailles[k] = (tailles[k] ?? 0) + 1; }

let semaines = 0, semainesAvecClone = 0, paires = 0;
let repas = 0, ecartKcalTotal = 0, jours = 0, drapeaux = 0;
const parFamille: Record<string, number> = {};
const distinctesParCle: Record<string, number> = {};

for (const g of PROFILS_REF) {
  for (const { nom, r } of REGIMES) {
    const p = profil(g, r);
    let clonesIci = 0;
    const distinctes = new Set<string>();
    for (const seed of SEEDS) {
      semaines++;
      const plan = buildLocalPlan(p, seed);
      const parSemaine = new Map<string, Set<string>>();
      const kcalParJour: Record<number, number> = {};
      for (const m of plan.meals) {
        repas++;
        distinctes.add(m.recipe.id);
        kcalParJour[m.day] = (kcalParJour[m.day] ?? 0) + m.macros.kcal;
        for (const f of m.adapt_flags ?? [])
          if (f === 'over_target_kcal' || f === 'under_target_kcal' || f === 'protein_below_target') drapeaux++;
        const k = familleDe(m.recipe);
        if (!parSemaine.has(k)) parSemaine.set(k, new Set());
        parSemaine.get(k)!.add(m.recipe.id);
      }
      for (const kcal of Object.values(kcalParJour)) {
        jours++;
        ecartKcalTotal += Math.abs(kcal - p.target_kcal) / p.target_kcal;
      }
      let cloneCetteSemaine = false;
      for (const [k, ids] of parSemaine) {
        if (ids.size > 1) {
          cloneCetteSemaine = true;
          paires += ids.size - 1;
          parFamille[k] = (parFamille[k] ?? 0) + 1;
        }
      }
      if (cloneCetteSemaine) { semainesAvecClone++; clonesIci++; }
    }
    distinctesParCle[`${g.nom} | ${nom}`] = distinctes.size;
    if (detail) console.log(`${g.nom.padEnd(14)} | ${nom.padEnd(12)} | ${String(distinctes.size).padStart(3)} recettes distinctes | ${clonesIci}/4 semaines avec quasi-doublon`);
  }
}

/** Densité de fibres : le biais `FIBER_SELECT_W` doit faire viser plus haut EN SÈCHE. */
function fibresMoyennes(goal: 'cut' | 'maintain'): number {
  const g: Gabarit = { nom: 'x', sex: 'male', weight_kg: 80, height_cm: 180, age: 30, goal };
  const p = profil(g);
  let fibres = 0, kcal = 0;
  for (const seed of SEEDS) {
    for (const m of buildLocalPlan(p, seed).meals) {
      fibres += recipeFiberPerPortion(m.recipe);
      kcal += m.macros.kcal;
    }
  }
  return (fibres / kcal) * 1000; // g de fibres pour 1 000 kcal
}

const distinctes = Object.values(distinctesParCle);
console.log(`\n── VARIÉTÉ PERÇUE [réglage : ${VARIETE}] — ${semaines} semaines simulées (${PROFILS_REF.length} profils × ${REGIMES.length} régimes × ${SEEDS.length} tirages)`);
console.log(`quasi-doublons : ${semainesAvecClone}/${semaines} semaines en contiennent au moins un — ${(semainesAvecClone / semaines * 100).toFixed(1)} %`);
console.log(`                 ${paires} quasi-doublons servis au total, sur ${repas} repas (${(paires / repas * 100).toFixed(1)} %)`);
console.log(`recettes distinctes sur 4 semaines : min ${Math.min(...distinctes)} · médiane ${distinctes.sort((a, b) => a - b)[Math.floor(distinctes.length / 2)]} · max ${Math.max(...distinctes)}`);
console.log(`\n── CONTRÔLES (ne doivent PAS se dégrader)`);
console.log(`écart calorique moyen du jour : ${(ecartKcalTotal / jours * 100).toFixed(2)} %  (${jours} jours)`);
console.log(`drapeaux bloquants sur les repas servis : ${drapeaux}`);
console.log(`fibres pour 1 000 kcal — sèche ${fibresMoyennes('cut').toFixed(2)} vs maintien ${fibresMoyennes('maintain').toFixed(2)} (la sèche doit rester DEVANT)`);
console.log(`\n── LES FAMILLES LES PLUS SERVIES EN QUASI-DOUBLON`);
for (const [k, n] of Object.entries(parFamille).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`${String(n).padStart(3)} sem. · famille de ${String(tailles[k] ?? 0).padStart(2)} recettes · ${k}`);
}
