/**
 * Mesure de la QUALITÉ DES INSTRUCTIONS — « la recette explique-t-elle comment faire ? »
 *
 * Le défaut mesuré : une recette qui demande une CUISSON mais ne dit ni combien de temps,
 * ni à quel feu, ni à quoi ressemble le résultat. « Cuire le riz. » L'utilisateur qui ne
 * sait pas cuisiner est laissé seul.
 *
 * ⚠️ Pourquoi PAS « nombre d'étapes » (l'indicateur de l'audit du 2026-09-09) :
 *   - il accuse à tort les assemblages à froid — « Mélange le skyr et les myrtilles » en
 *     2 étapes est COMPLET (43 recettes sur les 197 signalées) ;
 *   - il rate les recettes bavardes mais muettes — 4 étapes qui ne donnent aucun repère
 *     (62 recettes, dont 45 dans la vague `fondation`, invisibles de l'audit).
 *   Le nombre d'étapes est une mesure de FORME ; le défaut est de CONTENU.
 *
 * Deux mesures indépendantes se croisent ici :
 *   1. la CUISSON est déduite des INGRÉDIENTS (`basis` dry/raw + œuf), jamais du texte —
 *      sinon la sonde jugerait le texte à l'aune du texte, et une réécriture se
 *      blanchirait elle-même en ajoutant le mot « cuire » ;
 *   2. le REPÈRE est cherché dans le texte : une durée, une température, ou un signe
 *      sensoriel (« jusqu'à ce que », « doré », « al dente »). Les trois se valent :
 *      « fais griller jusqu'à ce que le pain soit ferme sous le doigt » vaut mieux qu'un
 *      chiffre, et les vagues B1-B9 emploient les deux.
 *
 * Le tirage « servie ? » appelle `buildLocalPlan` — aucune formule du moteur n'est
 * recopiée ici (cf. Recette/README.md).
 *
 * Usage :
 *   npm run mesure:instructions            tableau par vague + par créneau + priorités
 *   npm run mesure:instructions -- --liste  la liste complète des recettes muettes
 */
import { RAW_RECIPES, RECIPE_INGREDIENTS, type RawRecipe } from '../lib/recipeData';
import {
  cuissonRequise,
  aUnRepereDeCuisson,
  estMuette,
  longueurInstructions,
} from '../lib/instructionsQualite';
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { PROFILS_REF } from './mesure-couverture';
import type { DietaryRestriction, UserProfile } from '../lib/types';

const REGIMES: { nom: string; r: DietaryRestriction[] }[] = [
  { nom: 'aucun', r: [] },
  { nom: 'végétarien', r: ['vegetarian'] },
  { nom: 'vegan', r: ['vegan'] },
  { nom: 'sans gluten', r: ['gluten_free'] },
  { nom: 'vegan+SG', r: ['vegan', 'gluten_free'] },
];
const SEEDS = [0, 1, 2, 3];

function profil(g: (typeof PROFILS_REF)[number], restrictions: DietaryRestriction[]): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: restrictions, disliked_foods: [], preferred_proteins: [],
  } as UserProfile);
}

// ── Combien de fois chaque recette est-elle SERVIE ? ─────────────────────────
const servie: Record<string, number> = {};
let semaines = 0;
for (const g of PROFILS_REF) {
  for (const { r } of REGIMES) {
    const p = profil(g, r);
    for (const seed of SEEDS) {
      semaines++;
      for (const m of buildLocalPlan(p, seed).meals) servie[m.recipe.id] = (servie[m.recipe.id] ?? 0) + 1;
    }
  }
}

const lignes = RAW_RECIPES.map((r) => ({
  r,
  cuisson: cuissonRequise(r, RECIPE_INGREDIENTS),
  repere: aUnRepereDeCuisson(r),
  muette: estMuette(r, RECIPE_INGREDIENTS),
  car: longueurInstructions(r),
  etapes: r.instructions.length,
  servie: servie[r.id] ?? 0,
}));

const pc = (a: number, b: number) => (b === 0 ? '  – ' : `${Math.round((a / b) * 100)}`.padStart(3) + '%');

// ── Par vague ───────────────────────────────────────────────────────────────
console.log(`── QUALITÉ DES INSTRUCTIONS — ${RAW_RECIPES.length} recettes, ${semaines} semaines simulées\n`);
console.log('vague'.padEnd(38) + '  n  moy.car  ≤2 ét.   cuisson  MUETTES');
const vagues = [...new Set(RAW_RECIPES.map((r) => r.wave))];
const parVague = vagues
  .map((w) => {
    const l = lignes.filter((x) => x.r.wave === w);
    return {
      w, n: l.length,
      car: Math.round(l.reduce((s, x) => s + x.car, 0) / l.length),
      court: l.filter((x) => x.etapes <= 2).length,
      cuisson: l.filter((x) => x.cuisson).length,
      muettes: l.filter((x) => x.muette).length,
    };
  })
  .sort((a, b) => b.muettes - a.muettes || b.n - a.n);
for (const v of parVague) {
  console.log(
    `${v.w.padEnd(38)}${String(v.n).padStart(4)}${String(v.car).padStart(9)}` +
      `${String(v.court).padStart(6)} ${pc(v.court, v.n)}${String(v.cuisson).padStart(7)}` +
      `${String(v.muettes).padStart(8)} ${pc(v.muettes, v.cuisson)}`,
  );
}
const totMuettes = lignes.filter((x) => x.muette).length;
const totCuisson = lignes.filter((x) => x.cuisson).length;
console.log(
  `${'TOTAL'.padEnd(38)}${String(lignes.length).padStart(4)}` +
    `${String(Math.round(lignes.reduce((s, x) => s + x.car, 0) / lignes.length)).padStart(9)}` +
    `${String(lignes.filter((x) => x.etapes <= 2).length).padStart(6)} ${pc(lignes.filter((x) => x.etapes <= 2).length, lignes.length)}` +
    `${String(totCuisson).padStart(7)}${String(totMuettes).padStart(8)} ${pc(totMuettes, totCuisson)}`,
);

// ── Ce que l'indicateur « ≤ 2 étapes » se trompe ────────────────────────────
const courtes = lignes.filter((x) => x.etapes <= 2);
console.log(`\n── POURQUOI « ≤ 2 ÉTAPES » N'EST PAS LE BON INDICATEUR`);
console.log(`   ${courtes.length} recettes à ≤ 2 étapes`);
console.log(`     dont ${courtes.filter((x) => !x.cuisson).length} SANS cuisson — 2 étapes y suffisent (faux positifs)`);
console.log(`     dont ${courtes.filter((x) => x.cuisson && x.repere).length} avec cuisson mais un repère présent`);
console.log(`     dont ${courtes.filter((x) => x.muette).length} réellement muettes`);
console.log(`   + ${lignes.filter((x) => x.etapes > 2 && x.muette).length} recettes de PLUS de 2 étapes pourtant muettes (faux négatifs)`);

// ── Par créneau ─────────────────────────────────────────────────────────────
console.log(`\n── PAR CRÉNEAU`);
console.log('créneau'.padEnd(16) + '  n  cuisson  muettes  muettes servies');
for (const c of ['petit_dej', 'collation', 'repas_complet'] as const) {
  const l = lignes.filter((x) => x.r.category === c);
  const m = l.filter((x) => x.muette);
  console.log(
    `${c.padEnd(16)}${String(l.length).padStart(4)}${String(l.filter((x) => x.cuisson).length).padStart(9)}` +
      `${String(m.length).padStart(9)}${String(m.filter((x) => x.servie > 0).length).padStart(17)}`,
  );
}

// ── Priorité ────────────────────────────────────────────────────────────────
const muettes = lignes.filter((x) => x.muette).sort((a, b) => b.servie - a.servie || a.car - b.car);
const repasTotal = lignes.reduce((s, x) => s + x.servie, 0);
const repasMuets = muettes.reduce((s, x) => s + x.servie, 0);
console.log(
  `\n── CE QUE ÇA PÈSE DANS L'ASSIETTE : ${repasMuets} repas servis sur ${repasTotal} viennent d'une recette muette` +
    ` (${((repasMuets / repasTotal) * 100).toFixed(1)} %)`,
);
console.log(`\n── PRIORITÉ : les muettes les plus SERVIES (${muettes.filter((x) => x.servie > 0).length} servies au moins une fois, ${muettes.filter((x) => x.servie === 0).length} jamais)`);
const liste = process.argv.includes('--liste');
for (const x of liste ? muettes : muettes.slice(0, 30)) {
  console.log(
    `${String(x.servie).padStart(4)}× ${x.r.id.padEnd(7)} ${x.r.category.padEnd(14)} ` +
      `${String(x.car).padStart(4)} car  ${x.r.wave.padEnd(24)} ${x.r.name}`,
  );
}
if (!liste) console.log(`   … ${muettes.length - 30} autres (--liste pour tout voir)`);
