/**
 * Les PARTS de protéines décidées le 2026-09-19 sont-elles tenables ?
 * (`docs/2026-09-19-decision-preferences-proteines.md`)
 *
 * Pour chaque régime, chaque sorte de protéine et chacun des 12 profils de référence : combien
 * de repas complets de cette sorte sont SERVABLES midi ET soir (adaptés sans drapeau bloquant,
 * permis par le régime et la règle végétale), et combien le plafond hebdomadaire d'ingrédient
 * (D30 : courant 5, rare 2, aucun chez végé/vegan) en laisse passer — comparés au nombre de
 * repas qu'exige la part (14 déjeuners et dîners par semaine).
 *   ✅ tenable sans répéter · ⚠️ tenable en servant une recette deux fois · ❌ intenable.
 * ⚠️ STATIQUE : ne dit rien du calibrage qu'un quota coûterait au moteur — ça se mesure sur le
 * moteur une fois les parts codées.
 *
 *   npx tsx scripts/mesure-parts.ts
 */
import { getEffectiveRecipes } from '../lib/recipes';
import { recipeAllowed, regleVegetal } from '../lib/planEngine';
import { plafondIngredient } from '../lib/repasHumain';
import { recalcProfile } from '../lib/tdee';
import { PROFILS_REF, ciblesDe, servable, type Gabarit } from './mesure-couverture';
import type { DietaryRestriction, Recipe, UserProfile } from '../lib/types';

const SORTES: Record<string, string[]> = {
  poulet: ['poulet_filet', 'dinde_escalope'], 'bœuf': ['boeuf_5', 'boeuf_bavette'],
  poisson: ['cabillaud', 'saumon', 'saumon_fume', 'thon_naturel', 'thon_frais', 'crevettes', 'sardines', 'maquereau'],
  porc: ['porc_filet', 'jambon_blanc'],
  tofu: ['tofu_ferme', 'tofu_fume', 'tofu_soyeux'], tempeh: ['tempeh'], seitan: ['seitan'],
  'légumineuses': ['lentilles_cuites', 'lentilles_corail', 'pois_chiches_conserve', 'haricots_rouges_conserve', 'haricots_blancs_conserve', 'haricots_noirs_conserve', 'feves', 'pois_casses', 'edamame'],
  'pièces végétales': ['steak_soja', 'emince_vegetal', 'hache_vegetal', 'galette_vegetale', 'boulette_vegetale', 'nuggets_vegetal', 'saucisse_vegetale', 'jambon_vegetal', 'filets_poulet_vegetal', 'aiguillettes_poulet_vegetal', 'chorizo_vegetal', 'lardons_vegetaux', 'merguez_vegetale', 'escalope_vegetale'],
  'œufs': ['oeuf_entier', 'blanc_oeuf'],
};
SORTES['végétal'] = [...SORTES.tofu, ...SORTES.tempeh, ...SORTES.seitan, ...SORTES['légumineuses'], ...SORTES['pièces végétales']];
// [régime, sortes proposées, part max qu'une sorte peut recevoir (cochée seule), part « rien coché »]
const CAS: [string, DietaryRestriction[], Record<string, [number, number]>][] = [
  ['Omnivore', ['omnivore'], { poulet: [0.60, 0.40], 'bœuf': [0.60, 0.30], poisson: [0.60, 0.20], porc: [0.60, 0.10] }],
  ['Halal', ['omnivore', 'halal'], { poulet: [0.60, 0.45], 'bœuf': [0.60, 0.35], poisson: [0.60, 0.20] }],
  ['Pescétarien', ['pescatarian'], { poisson: [0.70, 0.50], 'végétal': [0.70, 0.50] }],
  ['Végétarien', ['vegetarian'], { tofu: [0.60, 0], tempeh: [0.60, 0], seitan: [0.60, 0], 'légumineuses': [0.60, 0], 'pièces végétales': [0.60, 0], 'œufs': [0.60, 0] }],
  ['Vegan', ['vegan'], { tofu: [0.60, 0], tempeh: [0.60, 0], seitan: [0.60, 0], 'légumineuses': [0.60, 0], 'pièces végétales': [0.60, 0] }],
  ['Vegan sans gluten', ['vegan', 'gluten_free'], { tofu: [0.60, 0], tempeh: [0.60, 0], 'légumineuses': [0.60, 0], 'pièces végétales': [0.60, 0] }],
];
const profil = (g: Gabarit, r: DietaryRestriction[]) => recalcProfile({ id: 'm', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
  activity_level: 'moderate', training_days_per_week: 4, sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }], neat_level: 'desk',
  goal: g.goal, macro_mode: 'auto', tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0, plan_days: 7,
  plan_weekdays: [0, 1, 2, 3, 4, 5, 6], meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
  dietary_restrictions: r, disliked_foods: [], preferred_proteins: [] } as unknown as UserProfile);
const MEALS = getEffectiveRecipes().filter((r) => r.tags.includes('lunch'));
const prot = (r: Recipe) => r.ingredients.filter((i) => i.macro_role === 'protein' && i.ref).map((i) => i.ref!);
for (const [nom, regimes, parts] of CAS) {
  console.log(`\n══ ${nom}`);
  const par: Record<string, { servables: number[]; cap: number; profilMin: string }> = {};
  for (const g of PROFILS_REF) {
    const p = profil(g, regimes); const c = ciblesDe(g, regimes.filter((x) => x !== 'omnivore') as DietaryRestriction[]);
    const regle = regleVegetal(p);
    const ok = MEALS.filter((r) => recipeAllowed(r, p) && !(regle && regle.maxSemaine === 0 && regle.ids.has(r.id)) && servable(r, c.lunch) && servable(r, c.dinner));
    for (const s of Object.keys(parts)) {
      const refs = SORTES[s]; const L = ok.filter((r) => prot(r).some((x) => refs.includes(x)));
      const presents = [...new Set(L.flatMap((r) => prot(r).filter((x) => refs.includes(x))))];
      const cap = presents.reduce((a, x) => a + Math.min(plafondIngredient(x, p), 14), 0);
      par[s] ??= { servables: [], cap: 99, profilMin: '' };
      par[s].servables.push(L.length);
      if (cap < par[s].cap) { par[s].cap = cap; }
      if (L.length === Math.min(...par[s].servables)) par[s].profilMin = g.nom;
    }
  }
  for (const [s, [coche, rien]] of Object.entries(parts)) {
    const x = par[s]; const min = Math.min(...x.servables); const med = [...x.servables].sort((a, b) => a - b)[6];
    const besoinCoche = Math.round(coche * 14), besoinRien = Math.round(rien * 14);
    const verdict = (b: number) => b === 0 ? '—' : (x.cap < b ? `❌ plafond ${x.cap}` : min < Math.ceil(b / 2) ? `❌ ${min} recettes` : min < b ? `⚠️ répète` : '✅');
    console.log(`  ${s.padEnd(17)} recettes servables : min ${String(min).padStart(3)} (${x.profilMin.padEnd(13)}) méd ${String(med).padStart(3)} · plafond hebdo ${String(x.cap).padStart(2)} | cochée ${Math.round(coche * 100)} % = ${String(besoinCoche).padStart(2)} repas ${verdict(besoinCoche).padEnd(14)} | rien ${Math.round(rien * 100)} % = ${String(besoinRien).padStart(2)} ${verdict(besoinRien)}`);
  }
}
