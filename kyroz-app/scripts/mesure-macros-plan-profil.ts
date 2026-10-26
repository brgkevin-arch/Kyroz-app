/**
 * Segment 8, constat 4 : le Plan affiche les macros SERVIES du jour, le Profil la CIBLE.
 * D'où vient l'écart ? Moteur réel (`buildLocalPlan`), aucune formule recopiée.
 *
 * La référence est FIGÉE : les cibles du Profil sortent de `recalcProfile`, qui ne lit
 * jamais le plan — elles sont calculées une fois par profil, avant toute génération.
 *
 * Décomposition par réglage BOUGÉ (pas par formule) :
 *  - « sans sport » : pas de répartition par volume, pas de jour de repos → l'écart qui
 *    reste est celui des vraies recettes (+ le lissage d'arrondi) ;
 *  - « avec sport » : on y ajoute la cible kcal du jour (`dayTargetKcal`) et le décalage
 *    glucides → lipides des jours de repos ; jours d'entraînement et de repos séparés.
 *
 *   npx tsx scripts/mesure-macros-plan-profil.ts
 */
import { recalcProfile, FAT_MIN_PER_KG_BW } from '../lib/tdee';
import { buildLocalPlan, dayTargetKcal, restDaysForProfile } from '../lib/planEngine';
import { mealFiberFromIngredients } from '../lib/fiber';
import { MEAL_ORDER, UserProfile, SportSession, Sex, Goal, DietaryRestriction } from '../lib/types';

type Corps = { nom: string; sex: Sex; poids: number; taille: number; mg: number };
const CORPS: Corps[] = [
  { nom: 'F 55', sex: 'female', poids: 55, taille: 162, mg: 24 },
  { nom: 'F 70', sex: 'female', poids: 70, taille: 168, mg: 30 },
  { nom: 'H 78', sex: 'male', poids: 78, taille: 178, mg: 15 },
  { nom: 'H 95', sex: 'male', poids: 95, taille: 182, mg: 24 },
];
const OBJ: Goal[] = ['cut', 'maintain', 'lean_bulk'];
const REGIMES: { nom: string; r: DietaryRestriction[] }[] = [
  { nom: 'omni', r: [] },
  { nom: 'végé', r: ['vegetarian'] },
  { nom: 'vegan', r: ['vegan'] },
  { nom: 'pescé', r: ['pescatarian'] },
];
const CAS: { nom: string; sports: SportSession[]; jours: number }[] = [
  { nom: 'sans sport', sports: [], jours: 0 },
  { nom: 'muscu 3×60', sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }], jours: 3 },
  { nom: 'course 4×45', sports: [{ type: 'course', sessions_per_week: 4, minutes_per_session: 45 }], jours: 4 },
];
const SEEDS = [0, 1, 2];

function profil(c: Corps, goal: Goal, regime: DietaryRestriction[], sports: SportSession[], jours: number): UserProfile {
  return recalcProfile({
    id: 't', sex: c.sex, age: 30, weight_kg: c.poids, height_cm: c.taille, body_fat_pct: c.mg,
    activity_level: 'moderate', training_days_per_week: jours,
    sports, neat_level: 'desk', goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: regime, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

type Ligne = { cas: string; regime: string; repos: boolean; horsMacros: number; fibres: number; sousCarence: boolean; aLaVisee: boolean; dK: number; dKjour: number; dKapprox: number; dP: number; dG: number; dL: number };
const lignes: Ligne[] = [];
const semaines: { cas: string; regime: string; dP: number; dG: number; dL: number }[] = [];

for (const cas of CAS) for (const reg of REGIMES) for (const c of CORPS) for (const g of OBJ) {
  const p = profil(c, g, reg.r, cas.sports, cas.jours);
  // Référence figée AVANT de générer.
  const cible = { kcal: p.target_kcal, P: p.target_protein_g, G: p.target_carbs_g, L: p.target_fat_g };
  for (const seed of SEEDS) {
    const plan = buildLocalPlan(p, seed);
    const repos = restDaysForProfile(p, plan.days);
    const j = plan.total_macros_per_day;
    j.forEach((m, i) => {
      const jourKcal = dayTargetKcal(p, plan.days, i + 1);
      lignes.push({
        cas: cas.nom, regime: reg.nom, repos: repos.has(i + 1),
        // L'énergie du jour que P/G/L ne portent pas (kcal Ciqual − 4P − 4G − 9L), et les fibres servies.
        // Le plancher de carence de CLAUDE.md §6 (0,8 g/kg de poids de corps), et les profils dont
        // la cible lipidique EST la visée de ce plancher (cible = 0,8 × 1,15 × poids, à 1 g près).
        sousCarence: m.fat_g < FAT_MIN_PER_KG_BW * c.poids,
        aLaVisee: Math.abs(cible.L - FAT_MIN_PER_KG_BW * 1.15 * c.poids) <= 1,
        horsMacros: m.kcal - (4 * m.protein_g + 4 * m.carbs_g + 9 * m.fat_g),
        fibres: plan.meals.filter((x) => x.day === i + 1).reduce((s, x) => s + mealFiberFromIngredients(x.adapted_ingredients ?? []), 0),
        dK: m.kcal - cible.kcal, dKjour: jourKcal - cible.kcal, dKapprox: m.kcal - jourKcal,
        dP: m.protein_g - cible.P, dG: m.carbs_g - cible.G, dL: m.fat_g - cible.L,
      });
    });
    const moy = (k: 'protein_g' | 'carbs_g' | 'fat_g') => j.reduce((s, d) => s + d[k], 0) / j.length;
    semaines.push({ cas: cas.nom, regime: reg.nom, dP: moy('protein_g') - cible.P, dG: moy('carbs_g') - cible.G, dL: moy('fat_g') - cible.L });
  }
}

const r = (x: number) => (x > 0 ? '+' : '') + Math.round(x);
const moy = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const absMoy = (a: number[]) => moy(a.map(Math.abs));
const pire = (a: number[]) => a.reduce((w, x) => (Math.abs(x) > Math.abs(w) ? x : w), 0);
const p90 = (a: number[]) => { const s = a.map(Math.abs).sort((x, y) => x - y); return s[Math.floor(s.length * 0.9)] ?? 0; };

function bloc(titre: string, L: Ligne[]) {
  if (!L.length) return;
  const f = (k: keyof Ligne) => L.map((l) => l[k] as number);
  console.log(
    `${titre.padEnd(30)} | n=${String(L.length).padStart(4)} | kcal jour−cible ${r(moy(f('dKjour'))).padStart(5)}` +
    ` | servi−jour ${r(moy(f('dKapprox'))).padStart(4)} (|moy| ${Math.round(absMoy(f('dKapprox')))})` +
    ` | P ${r(moy(f('dP'))).padStart(4)} | G ${r(moy(f('dG'))).padStart(4)} (|moy| ${Math.round(absMoy(f('dG')))}, p90 ${Math.round(p90(f('dG')))}, pire ${r(pire(f('dG')))})` +
    ` | L ${r(moy(f('dL'))).padStart(4)} (|moy| ${Math.round(absMoy(f('dL')))}, p90 ${Math.round(p90(f('dL')))}, pire ${r(pire(f('dL')))})`,
  );
}

console.log('\n── Écart PAR JOUR affiché (Plan − Profil), en g, par cas et type de jour ──');
for (const cas of CAS) {
  bloc(`${cas.nom} · tous`, lignes.filter((l) => l.cas === cas.nom));
  bloc(`${cas.nom} · entraînement`, lignes.filter((l) => l.cas === cas.nom && !l.repos && cas.jours > 0));
  bloc(`${cas.nom} · repos`, lignes.filter((l) => l.cas === cas.nom && l.repos));
}
console.log('\n── Par régime (tous cas) ──');
for (const reg of REGIMES) bloc(reg.nom, lignes.filter((l) => l.regime === reg.nom));

console.log('\n── Moyenne de la SEMAINE (Plan moyen − Profil), en g ──');
for (const cas of CAS) for (const reg of REGIMES) {
  const S = semaines.filter((s) => s.cas === cas.nom && s.regime === reg.nom);
  console.log(`${cas.nom.padEnd(12)} ${reg.nom.padEnd(6)} | P ${r(moy(S.map((s) => s.dP))).padStart(4)} | G ${r(moy(S.map((s) => s.dG))).padStart(4)} | L ${r(moy(S.map((s) => s.dL))).padStart(4)} (pire ${r(pire(S.map((s) => s.dL)))})`);
}

{
  const h = lignes.map((l) => l.horsMacros).sort((a, b) => a - b);
  const f = lignes.map((l) => l.fibres);
  const q = (a: number[], x: number) => Math.round(a[Math.floor(a.length * x)]);
  console.log(`\n── Énergie hors P/G/L dans les kcal servies (kcal Ciqual − 4P − 4G − 9L) ──`);
  console.log(`moyenne ${Math.round(moy(h))} kcal/jour · p10 ${q(h, 0.1)} · p90 ${q(h, 0.9)} · fibres servies ${Math.round(moy(f))} g/jour (×2 kcal = ${Math.round(moy(f) * 2)} kcal)`);
}
{
  const pct = (L: Ligne[]) => (L.length ? ((L.filter((l) => l.sousCarence).length / L.length) * 100).toFixed(1) : '—');
  console.log(`\n── Jours servis SOUS le plancher de carence lipidique (0,8 g/kg) ──`);
  console.log(`tous : ${pct(lignes)} % · profils dont la cible lipidique est la visée du plancher : ${pct(lignes.filter((l) => l.aLaVisee))} % (n=${lignes.filter((l) => l.aLaVisee).length})`);
  for (const cas of CAS) console.log(`  ${cas.nom.padEnd(12)} : ${pct(lignes.filter((l) => l.cas === cas.nom))} %`);
}
const seuil = (k: 'dP' | 'dG' | 'dL', g: number) => Math.round((lignes.filter((l) => Math.abs(l[k]) >= g).length / lignes.length) * 100);
console.log(`\nJours où l'écart se voit (≥ 5 g) : P ${seuil('dP', 5)} % · G ${seuil('dG', 5)} % · L ${seuil('dL', 5)} %`);
console.log(`Jours à ≥ 10 g                    : P ${seuil('dP', 10)} % · G ${seuil('dG', 10)} % · L ${seuil('dL', 10)} %`);
