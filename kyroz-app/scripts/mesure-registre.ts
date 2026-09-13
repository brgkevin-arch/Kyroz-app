/**
 * REGISTRE SERVI — ce qu'un profil reçoit vraiment au réveil, sur 4 semaines de plans.
 *
 *   npx tsx scripts/mesure-registre.ts            les 12 profils de référence
 *   npx tsx scripts/mesure-registre.ts "H 80 maintien"   + le détail d'une semaine
 *
 * ⚠️ POURQUOI CE SCRIPT EXISTE — fiche D25, 2026-09-07. Les deux contrôles d'un lot
 * (`check:doublons`, `check:enveloppe`) disent qu'une recette est **servable** ; aucun ne
 * dit qu'elle est **servie**. La vague B10 a livré 25 recettes du registre français,
 * conformes, avec un R8 de 11,2/12 — et sur 336 petits-déjeuners servis, **10** venaient
 * d'elles : le tri (`fitScore`) classe le format « pain » dernier, avant comme après.
 * Une vague peut donc être livrée, verte, et ne rien changer à l'assiette. C'est ce que
 * cette mesure regarde, et rien d'autre ne le regardait.
 *
 * ⚠️ Il n'y a AUCUNE formule du moteur ici : le script appelle `buildLocalPlan` et lit
 * ce qui sort. Même règle que `mesure-couverture.ts` — on ne réimplémente pas le moteur
 * pour le mesurer.
 */
import { buildLocalPlan } from '../lib/planEngine';
import { PROFILS_REF, type Gabarit } from './mesure-couverture';
import { recalcProfile } from '../lib/tdee';
import { MEAL_ORDER, type UserProfile } from '../lib/types';
import { RAW_RECIPES } from '../lib/recipeData';

const SEEDS = [0, 1, 2, 3]; // 4 semaines

/** Le registre du petit-déjeuner français ordinaire : du pain, des œufs, un laitage, une charcuterie. */
const REGISTRE_FR = new Set([
  'pain_complet', 'pain_seigle', 'pain_pita_complet', 'pain_sans_gluten', 'jambon_blanc',
  'oeuf_entier', 'blanc_oeuf', 'fromage_blanc_0', 'cottage_cheese', 'skyr', 'yaourt_grec',
  'lait_demi_ecreme', 'feta', 'saumon_fume', 'thon_naturel', 'dinde_escalope',
  'semoule_couscous', 'riz_basmati', 'pomme_de_terre',
]);
/** Ce que personne ne mange au réveil sans y avoir été amené : poudres, soja, superaliments. */
const POUDRES_ET_SOJA = new Set([
  'whey', 'proteine_vegetale', 'soja_texture', 'levure_maltee', 'graines_chia', 'cacao_poudre',
  'edamame', 'seitan', 'tempeh', 'tofu_ferme', 'tofu_fume', 'yaourt_soja_proteine',
]);

const brut = new Map((RAW_RECIPES as any[]).map((r) => [r.id, r]));
const refsDe = (id: string): string[] => (brut.get(id)?.ingredients ?? []).map((i: any) => i.ref);

function profil(g: Gabarit): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

const cible = process.argv[2];
console.log('REGISTRE SERVI AU PETIT-DÉJEUNER — 4 semaines de plans, par profil de référence.\n');
console.log('profil          | petits-déj | registre FR | poudres/soja | vagues les plus servies');

for (const g of PROFILS_REF) {
  const servis: string[] = [];
  for (const seed of SEEDS) {
    const plan: any = buildLocalPlan(profil(g), seed);
    for (const m of plan.meals.filter((x: any) => x.meal_type === 'breakfast')) servis.push(m.recipe.id);
  }
  const pct = (n: number) => `${String(Math.round((n / servis.length) * 100)).padStart(3)} %`;
  const fr = servis.filter((id) => refsDe(id).some((r) => REGISTRE_FR.has(r))).length;
  const labo = servis.filter((id) => refsDe(id).some((r) => POUDRES_ET_SOJA.has(r))).length;
  const parVague: Record<string, number> = {};
  for (const id of servis) { const w = brut.get(id)?.wave ?? '?'; parVague[w] = (parVague[w] ?? 0) + 1; }
  const top = Object.entries(parVague).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([w, n]) => `${w} ${n}`).join(' · ');
  console.log(`${g.nom.padEnd(15)} | ${String(servis.length).padStart(10)} | ${pct(fr)}       | ${pct(labo)}        | ${top}`);
}

if (cible) {
  const g = PROFILS_REF.find((x) => x.nom === cible);
  if (!g) { console.error(`\nProfil inconnu : « ${cible} ». Au choix : ${PROFILS_REF.map((x) => x.nom).join(' · ')}`); process.exit(1); }
  const plan: any = buildLocalPlan(profil(g), 0);
  console.log(`\n${g.nom} — semaine 1, ce qui est servi au réveil :`);
  for (const m of plan.meals.filter((x: any) => x.meal_type === 'breakfast')) {
    console.log(`  ${m.recipe.id.padEnd(7)} ${Math.round(m.macros.kcal)} kcal · ${m.recipe.name_fr}`);
  }
}
