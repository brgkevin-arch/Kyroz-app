/**
 * Volume sportif CONCENTRÉ : ce que le moteur voit vs ce que la journée vit.
 *
 * `exerciseKcalPerDay` lisse la dépense sur 7 jours : trois sorties d'une heure et
 * une sortie de trois heures lui paraissent identiques. Et le plan est isocalorique
 * entre les jours. Ce script mesure l'écart, et vérifie s'il reste de la MARGE pour
 * répartir (somme des planchers quotidiens vs budget de la semaine).
 *
 *   npm run mesure:volume
 */
import { recalcProfile, calculateBMR } from '../lib/tdee';
import { exerciseKcalPerWeek, exerciseKcalPerDay } from '../lib/sport';
import { fatFreeMassKg } from '../lib/safety';
import { bankedTargets, dayExpenditures, buildLocalPlan, restDaysForProfile } from '../lib/planEngine';
import { MEAL_ORDER, UserProfile, SportSession, Sex } from '../lib/types';

type Corps = { nom: string; sex: Sex; poids: number; taille: number; mg: number };

const CORPS: Corps[] = [
  { nom: 'F 60 kg 25 %MG', sex: 'female', poids: 60, taille: 165, mg: 25 },
  { nom: 'F 75 kg 32 %MG', sex: 'female', poids: 75, taille: 168, mg: 32 },
  { nom: 'H 80 kg 18 %MG', sex: 'male', poids: 80, taille: 180, mg: 18 },
];

const CAS: { nom: string; sports: SportSession[]; jours: number }[] = [
  { nom: 'muscu 4×60 (cible)', sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }], jours: 4 },
  { nom: 'course 3×45', sports: [{ type: 'course', sessions_per_week: 3, minutes_per_session: 45 }], jours: 3 },
  { nom: 'course 2×90', sports: [{ type: 'course', sessions_per_week: 2, minutes_per_session: 90 }], jours: 2 },
  { nom: 'course 1×120', sports: [{ type: 'course', sessions_per_week: 1, minutes_per_session: 120 }], jours: 1 },
  { nom: 'course 1×180', sports: [{ type: 'course', sessions_per_week: 1, minutes_per_session: 180 }], jours: 1 },
];

function profil(c: Corps, sports: SportSession[], jours: number): UserProfile {
  return recalcProfile({
    id: 't', sex: c.sex, age: 30, weight_kg: c.poids, height_cm: c.taille, body_fat_pct: c.mg,
    activity_level: 'moderate', training_days_per_week: jours,
    sports, neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

for (const corps of CORPS) {
  console.log(`\n── ${corps.nom} · sèche · NEAT desk ─────────────────────────────────────────`);
  console.log('cas                 | dép/sem | cible plate | jour SÉANCE | jour REPOS | EA annoncée | EA vécue AVANT | EA vécue APRÈS | Σ semaine');
  for (const c of CAS) {
    const p = profil(corps, c.sports, c.jours);
    const ffm = fatFreeMassKg(p);
    const semaine = exerciseKcalPerWeek(c.sports, corps.poids);
    const parJour = exerciseKcalPerDay(c.sports, corps.poids);
    const parSeance = semaine / c.jours;

    const cibles = bankedTargets(p, 7).targets;
    const repos = restDaysForProfile(p, 7);
    const jSeance = cibles.find((_, i) => !repos.has(i + 1)) ?? p.target_kcal;
    const jRepos = cibles.find((_, i) => repos.has(i + 1));

    // L'énergie disponible : annoncée par le moteur (dépense lissée), puis VÉCUE le
    // jour de la séance — avant la répartition (cible plate) et après (cible du jour).
    const eaAnnoncee = (p.target_kcal - parJour) / ffm;
    const eaAvant = (p.target_kcal - parSeance) / ffm;
    const eaApres = (jSeance - parSeance) / ffm;
    const sommeSemaine = cibles.reduce((s, x) => s + x, 0);
    const budget = p.target_kcal * 7;

    console.log(
      `${c.nom.padEnd(19)} | ${String(semaine).padStart(7)} | ${String(p.target_kcal).padStart(11)} |` +
      ` ${String(jSeance).padStart(11)} | ${String(jRepos ?? '—').padStart(10)} |` +
      ` ${eaAnnoncee.toFixed(1).padStart(11)} | ${eaAvant.toFixed(1).padStart(14)} | ${eaApres.toFixed(1).padStart(14)} |` +
      // Tolérance = 7 kcal, soit l'arrondi au kcal de chacun des 7 jours. Une égalité
      // stricte ferait clignoter ce contrôle sur du bruit d'arrondi — et un contrôle
      // qui crie pour rien ne se lit plus.
      ` ${Math.abs(sommeSemaine - budget) <= 7 ? '= budget ✓' : `${sommeSemaine} ≠ ${budget} ✗`}`,
    );
  }
}

// ── Effet sur le PLAN réellement servi ──────────────────────────────────────
// Mesuré sur `buildLocalPlan` et non sur les cibles : ce que l'utilisateur voit,
// ce sont des assiettes, et elles n'atteignent la cible qu'à l'approximation près.
console.log('\n── Plan servi (F 60 kg, 3 tirages) ─────────────────────────────────────');
console.log('cas                 | kcal jour séance | kcal jour repos | Σ semaine | écart au budget');
for (const c of CAS) {
  const p = profil(CORPS[0], c.sports, c.jours);
  const repos = restDaysForProfile(p, 7);
  const seance: number[] = []; const off: number[] = []; const semaines: number[] = [];
  for (const seed of [0, 1, 2]) {
    const jours = buildLocalPlan(p, seed).total_macros_per_day.map((m) => m.kcal);
    jours.forEach((k, i) => (repos.has(i + 1) ? off : seance).push(k));
    semaines.push(jours.reduce((s, x) => s + x, 0));
  }
  const moy = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
  const moySem = moy(semaines);
  console.log(
    `${c.nom.padEnd(19)} | ${String(moy(seance)).padStart(16)} | ${String(moy(off) || '—').padStart(15)} |` +
    ` ${String(moySem).padStart(9)} | ${((moySem / (p.target_kcal * 7) - 1) * 100).toFixed(2).padStart(6)} %`,
  );
}
