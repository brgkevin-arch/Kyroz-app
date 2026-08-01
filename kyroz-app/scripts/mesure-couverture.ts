/**
 * Mesure de couverture du catalogue — VÉRITÉ TERRAIN, et contrôle d'enveloppe (règle R8).
 *
 * ⚠️ Ce script ne réplique AUCUNE formule du moteur : il appelle `buildLocalPlan` puis
 * `adaptRecipe` et compte ce qui est réellement servable. C'est la leçon du 2026-07-29,
 * apprise deux fois :
 *   1. un script d'audit qui recalculait la cible avec un partage glucides/lipides figé
 *      à 55/45 (le simple repli de `carbFatRatio`) avait conclu « catalogue trop maigre » ;
 *   2. un comptage de variété AGRÉGÉ sur trois gabarits annonçait 21 à 30 recettes
 *      distinctes par créneau, alors qu'un utilisateur — qui n'a qu'un seul gabarit — en
 *      voit 11 à 13. Ce chiffre-là avait fait conclure que seul « vegan + sans gluten »
 *      manquait, et fait commander 30 recettes au lieu de 100.
 * Règle : on mesure PROFIL PAR PROFIL, jamais sur un pool agrégé.
 *
 * Usage :
 *   npx tsx scripts/mesure-couverture.ts                  état du catalogue (12 profils × 8 régimes)
 *   npx tsx scripts/mesure-couverture.ts --flags          + histogramme des drapeaux par sexe
 *   npx tsx scripts/mesure-couverture.ts --csv            sortie machine
 *   npx tsx scripts/mesure-couverture.ts --enveloppe <f>  contrôle R8 d'un lot livré (sort 1 si KO)
 */
import { buildLocalPlan } from '../lib/planEngine';
import { adaptRecipe, type AdaptTarget } from '../lib/adaptRecipe';
import { recalcProfile } from '../lib/tdee';
import { getEffectiveRecipes } from '../lib/recipes';
import { RECIPE_INGREDIENTS, macrosForRefIngredients } from '../lib/recipeData';
import { restrictionsOkFor } from '../lib/recipeDiet';
import type { DietaryRestriction, Goal, MealType, Recipe, Sex, UserProfile } from '../lib/types';

const SEEDS = [0, 1, 2, 3]; // 4 semaines de plans
const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// ── Les 12 profils de référence (§4.11 du brief) ─────────────────────────────
// 6 femmes, 6 hommes. Le sexe n'est PAS un facteur d'échelle : Mifflin-St Jeor
// retire 161 kcal à gabarit strictement égal.
export type Gabarit = { nom: string; sex: Sex; weight_kg: number; height_cm: number; age: number; goal: Goal };
export const PROFILS_REF: Gabarit[] = [
  { nom: 'F 55 sèche', sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut' },
  { nom: 'F 60 maintien', sex: 'female', weight_kg: 60, height_cm: 165, age: 30, goal: 'maintain' },
  { nom: 'F 65 sèche', sex: 'female', weight_kg: 65, height_cm: 167, age: 30, goal: 'cut' },
  { nom: 'F 65 maintien', sex: 'female', weight_kg: 65, height_cm: 167, age: 30, goal: 'maintain' },
  { nom: 'F 70 masse', sex: 'female', weight_kg: 70, height_cm: 168, age: 30, goal: 'bulk' },
  { nom: 'F 80 sèche', sex: 'female', weight_kg: 80, height_cm: 170, age: 35, goal: 'cut' },
  { nom: 'H 65 sèche', sex: 'male', weight_kg: 65, height_cm: 173, age: 30, goal: 'cut' },
  { nom: 'H 70 maintien', sex: 'male', weight_kg: 70, height_cm: 175, age: 30, goal: 'maintain' },
  { nom: 'H 80 sèche', sex: 'male', weight_kg: 80, height_cm: 180, age: 30, goal: 'cut' },
  { nom: 'H 80 maintien', sex: 'male', weight_kg: 80, height_cm: 180, age: 30, goal: 'maintain' },
  { nom: 'H 95 masse', sex: 'male', weight_kg: 95, height_cm: 183, age: 30, goal: 'bulk' },
  { nom: 'H 110 masse', sex: 'male', weight_kg: 110, height_cm: 190, age: 35, goal: 'bulk' },
];

const REGIMES: { nom: string; r: DietaryRestriction[] }[] = [
  { nom: 'aucun', r: [] },
  { nom: 'halal', r: ['halal'] },
  { nom: 'pescatarien', r: ['pescatarian'] },
  { nom: 'sans lactose', r: ['lactose_free'] },
  { nom: 'végétarien', r: ['vegetarian'] },
  { nom: 'sans gluten', r: ['gluten_free'] },
  { nom: 'vegan', r: ['vegan'] },
  { nom: 'vegan+SG', r: ['vegan', 'gluten_free'] },
];

function profil(g: Gabarit, restrictions: DietaryRestriction[] = []): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...SLOTS], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: restrictions, disliked_foods: [], preferred_proteins: [],
  } as UserProfile);
}

/**
 * Cible MOYENNE réellement servie à un profil, par créneau, sur 4 semaines.
 * Reconstruite depuis les repas servis (`macros − gap`) : le moteur reste seul juge
 * de ce qu'est une cible, ce script ne fait que la LIRE.
 */
export function ciblesDe(g: Gabarit): Record<MealType, AdaptTarget> {
  const p = profil(g);
  const acc: Record<string, AdaptTarget[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const seed of SEEDS) {
    for (const m of buildLocalPlan(p, seed).meals) {
      const gap = m.adapt_gap ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      acc[m.meal_type].push({
        kcalMeal: m.macros.kcal - gap.kcal, proteinMeal: m.macros.protein_g - gap.protein_g,
        carbMeal: m.macros.carbs_g - gap.carbs_g, fatMeal: m.macros.fat_g - gap.fat_g,
      });
    }
  }
  const moy = (a: AdaptTarget[]): AdaptTarget => ({
    kcalMeal: a.reduce((s, x) => s + x.kcalMeal, 0) / a.length,
    proteinMeal: a.reduce((s, x) => s + x.proteinMeal, 0) / a.length,
    carbMeal: a.reduce((s, x) => s + x.carbMeal, 0) / a.length,
    fatMeal: a.reduce((s, x) => s + x.fatMeal, 0) / a.length,
  });
  return { breakfast: moy(acc.breakfast), lunch: moy(acc.lunch), dinner: moy(acc.dinner), snack: moy(acc.snack) };
}

/** Une recette est SERVABLE sur une cible si l'adaptation ne lève aucun drapeau bloquant. */
export function servable(r: Recipe, t: AdaptTarget): boolean {
  const f = adaptRecipe(r, t).flags;
  return !f.includes('over_target_kcal') && !f.includes('under_target_kcal') && !f.includes('protein_below_target');
}

// ── Mode --enveloppe : contrôle R8 d'un lot livré ────────────────────────────

/**
 * Créneaux réellement servis par chaque catégorie.
 *
 * ⚠️ Corrigé le 2026-08-01 : la table valait `repas_complet: 'lunch'`, alors que
 * `lib/recipeMap.ts` tague CHAQUE repas complet `['lunch', 'dinner']` — vérifié sur le
 * catalogue : 250 recettes en `dinner+lunch`, 98 en `breakfast`, 79 en `snack`.
 * R8 ne contrôlait donc QU'UN des deux créneaux où la recette est servie, et le SOIR est
 * l'exigeant : sa cible descend à 415 kcal contre 459 au midi (et plafonne à 944 contre
 * 1057). Une recette calée sur le midi pouvait être systématiquement trop grosse le soir
 * sans que rien ne le signale.
 */
const CATEGORIE_VERS_SLOTS: Record<string, MealType[]> = {
  petit_dej: ['breakfast'], repas_complet: ['lunch', 'dinner'], collation: ['snack'],
};
/** Créneau de référence pour l'affichage et pour `profilsAffames`. */
const CATEGORIE_VERS_SLOT: Record<string, MealType> = {
  petit_dej: 'breakfast', repas_complet: 'lunch', collation: 'snack',
};
// Seuils R8, par catégorie. La collation est BEAUCOUP plus basse, et ce n'est pas une
// indulgence : sa cible va de 115 à 381 kcal (3,3×) quand le scaling n'offre que 1,8×.
// Mesuré en balayant la grille, AUCUN format ne dépasse 7/12 — et la seule recette qui
// serve une femme de 55 kg en sèche (cible 115 kcal) ne sert qu'elle. Sur ce créneau la
// vraie garantie n'est donc pas le score par recette mais l'UNION du lot, contrôlée
// séparément plus bas.
const SEUIL_R8: Record<string, number> = { petit_dej: 8, repas_complet: 8, collation: 3 };

type RawRecipe = {
  id: string; name: string; category: string;
  ingredients: { ref: string; qty: number; macro_role: string; scalable: boolean }[];
};

/** Convertit une recette du format de LIVRAISON (§2 du brief) vers le type runtime. */
function versRuntime(raw: RawRecipe): { r: Recipe; inconnus: string[] } {
  const inconnus = raw.ingredients.filter((i) => !RECIPE_INGREDIENTS[i.ref]).map((i) => i.ref);
  const slot = CATEGORIE_VERS_SLOT[raw.category];
  const ingredients = raw.ingredients.map((i) => ({
    name: RECIPE_INGREDIENTS[i.ref]?.name ?? i.ref, quantity_g: i.qty,
    unit: (RECIPE_INGREDIENTS[i.ref]?.unit ?? 'g') as 'g' | 'ml',
    ref: i.ref, macro_role: i.macro_role as Recipe['ingredients'][number]['macro_role'],
    scalable: i.scalable,
  }));
  const r = {
    id: raw.id, name_fr: raw.name, prep_time_min: 10, portions: 1,
    macros_per_portion: inconnus.length ? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      : macrosForRefIngredients(raw.ingredients.map((i) => ({ ref: i.ref, qty: i.qty }))),
    ingredients, steps: [], tags: slot ? [slot] : [],
    restrictions_ok: restrictionsOkFor(raw.ingredients.map((i) => i.ref)),
    objectives: [], sports: [], rest_day_ok: true, why_fr: '',
  } as unknown as Recipe;
  return { r, inconnus };
}

/**
 * Profils AFFAMÉS sur un créneau : ceux à qui le catalogue live sert moins de 3 recettes.
 * Une recette qui en sert un passe R8 quel que soit son score — sinon la règle se mord la
 * queue : la seule recette capable de nourrir une femme de 55 kg en sèche (cible 115 kcal)
 * ne sert qu'elle, donc score 1/12, donc rejetée… et le profil reste à zéro pour toujours.
 */
function profilsAffames(slot: MealType, cibles: { nom: string; c: Record<MealType, AdaptTarget> }[]): Set<string> {
  const pool = getEffectiveRecipes().filter((r) => r.tags.includes(slot));
  return new Set(cibles.filter(({ c }) => pool.filter((r) => servable(r, c[slot])).length < 3).map(({ nom }) => nom));
}

function controleEnveloppe(chemin: string): number {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const brut = require('node:fs').readFileSync(chemin, 'utf8');
  const lot: RawRecipe[] = JSON.parse(brut).recipes;
  const cibles = PROFILS_REF.map((g) => ({ nom: g.nom, c: ciblesDe(g) }));
  // Un jeu par créneau RÉELLEMENT servi — `dinner` manquait, ce qui faisait planter le
  // contrôle dès qu'une recette avait le soir pour pire créneau.
  const affames: Record<string, Set<string>> = {
    breakfast: profilsAffames('breakfast', cibles),
    lunch: profilsAffames('lunch', cibles),
    dinner: profilsAffames('dinner', cibles),
    snack: profilsAffames('snack', cibles),
  };

  console.log(`Contrôle d'enveloppe (règle R8) — ${lot.length} recettes · ${chemin}`);
  console.log(`Seuils : ${Object.entries(SEUIL_R8).map(([k, v]) => `${k} ≥ ${v}/12`).join(' · ')}`);
  const tousAffames = [...new Set(Object.values(affames).flatMap((s) => [...s]))];
  if (tousAffames.length) {
    console.log(`Dérogation : une recette servant un profil AFFAMÉ passe quel que soit son score.`);
    console.log(`  affamés — collation : ${[...affames.snack].join(', ') || 'aucun'}`);
    if (affames.lunch.size) console.log(`  affamés — repas complet : ${[...affames.lunch].join(', ')}`);
    if (affames.breakfast.size) console.log(`  affamés — petit-déj : ${[...affames.breakfast].join(', ')}`);
  }
  console.log('\nid       | catégorie      | base kcal · P | sert  | verdict | profils non servis');

  let echecs = 0;
  const couvertureCollations = new Set<string>();

  for (const raw of lot) {
    const { r, inconnus } = versRuntime(raw);
    if (inconnus.length) {
      console.log(`${raw.id.padEnd(8)} | ${raw.category.padEnd(14)} | ${'—'.padStart(13)} | ${'—'.padStart(5)} | ❌ REF   | ref inconnu(s) : ${inconnus.join(', ')}`);
      echecs++; continue;
    }
    const slot = CATEGORIE_VERS_SLOT[raw.category];
    if (!slot) {
      console.log(`${raw.id.padEnd(8)} | ${String(raw.category).padEnd(14)} | ${'—'.padStart(13)} | ${'—'.padStart(5)} | ❌ CAT   | catégorie inconnue`);
      echecs++; continue;
    }
    // Une recette est jugée sur TOUS les créneaux où elle sera servie. Un repas complet
    // est tagué `lunch` ET `dinner` : le noter sur le seul midi laissait passer des
    // recettes systématiquement trop grosses le soir.
    const slots = CATEGORIE_VERS_SLOTS[raw.category] ?? [slot];
    const parSlot = slots.map((s) => ({
      s,
      servis: cibles.filter(({ c }) => servable(r, c[s])).map(({ nom }) => nom),
    }));
    // Le score retenu est le PIRE créneau : promettre les deux, c'est tenir les deux.
    const pire = parSlot.reduce((a, b) => (b.servis.length < a.servis.length ? b : a));
    const servis = pire.servis;
    const rates = cibles.filter(({ nom }) => !servis.includes(nom)).map(({ nom }) => nom);
    const seuil = SEUIL_R8[raw.category];
    const nourritAffame = servis.some((n) => affames[pire.s].has(n));
    const ok = servis.length >= seuil || nourritAffame;
    if (!ok) echecs++;
    if (raw.category === 'collation') servis.forEach((n) => couvertureCollations.add(n));
    const verdict = !ok ? '❌ ÉCHEC' : nourritAffame && servis.length < seuil ? '✅ AFFAMÉ' : '✅ ok   ';
    const detail = slots.length > 1 ? ` [${parSlot.map((p) => `${p.s === 'lunch' ? 'midi' : 'soir'} ${p.servis.length}`).join('/')}]` : '';
    console.log(
      `${raw.id.padEnd(8)} | ${raw.category.padEnd(14)} | ` +
      `${String(Math.round(r.macros_per_portion.kcal)).padStart(4)} · ${String(Math.round(r.macros_per_portion.protein_g)).padStart(2)} P | ` +
      `${String(servis.length).padStart(2)}/12 | ${verdict} | ${rates.join(' ') || '—'}${detail}`
    );
  }

  const collations = lot.filter((x) => x.category === 'collation');
  if (collations.length) {
    const manquants = PROFILS_REF.filter((g) => !couvertureCollations.has(g.nom)).map((g) => g.nom);
    console.log(`\nUnion des collations du lot : ${couvertureCollations.size}/12` +
      (manquants.length ? ` — NON couverts : ${manquants.join(' ')}` : ' — les 12 profils couverts ✅'));
    if (manquants.length) {
      console.log('  ⚠️ La règle R8 demande que les DEUX sous-formats de B2 couvrent les 12 profils à eux deux.');
      console.log('     Un seul bloc n\'y arrive pas : c\'est la raison d\'être du découpage petit format / standard.');
    }
  }

  console.log(`\n${echecs === 0 ? '✅ Lot conforme.' : `❌ ${echecs} recette(s) hors enveloppe — à RÉÉCRIRE, pas à retoucher.`}`);
  return echecs === 0 ? 0 : 1;
}

// ── Mode par défaut : état du catalogue ──────────────────────────────────────

type Mesure = {
  gabarit: string; regime: string; cible_kcal: number;
  distincts: Record<MealType, number>; horsRegime: number;
  flags: Record<string, number>; repas: number;
};

function mesure(g: Gabarit, r: { nom: string; r: DietaryRestriction[] }): Mesure {
  const p = profil(g, r.r);
  const vus: Record<string, Set<string>> = { breakfast: new Set(), lunch: new Set(), dinner: new Set(), snack: new Set() };
  const flags: Record<string, number> = {};
  let horsRegime = 0, repas = 0;
  for (const seed of SEEDS) {
    for (const m of buildLocalPlan(p, seed).meals) {
      repas++;
      vus[m.meal_type].add(m.recipe.id);
      if (m.restriction_relaxed) horsRegime++;
      for (const f of m.adapt_flags ?? []) flags[f] = (flags[f] ?? 0) + 1;
    }
  }
  return {
    gabarit: g.nom, regime: r.nom, cible_kcal: p.target_kcal,
    distincts: { breakfast: vus.breakfast.size, lunch: vus.lunch.size, dinner: vus.dinner.size, snack: vus.snack.size },
    horsRegime, flags, repas,
  };
}

function etatCatalogue(avecFlags: boolean, csv: boolean): void {
  const resultats = PROFILS_REF.flatMap((g) => REGIMES.map((r) => mesure(g, r)));

  if (csv) {
    console.log('gabarit,regime,kcal,petit_dej,midi,soir,collation,hors_regime');
    for (const m of resultats) {
      console.log([m.gabarit, m.regime, m.cible_kcal, m.distincts.breakfast, m.distincts.lunch,
        m.distincts.dinner, m.distincts.snack, m.horsRegime].join(','));
    }
    return;
  }

  console.log('VARIÉTÉ — recettes DISTINCTES servies par créneau, sur 4 semaines, PAR PROFIL.');
  console.log('⚠️ Ne jamais agréger plusieurs gabarits ici : un utilisateur n\'en a qu\'un.\n');
  console.log('gabarit        | régime       | kcal | pdej midi soir coll | hors-régime');
  console.log('---------------|--------------|------|---------------------|------------');
  for (const m of resultats) {
    console.log(
      `${m.gabarit.padEnd(14)} | ${m.regime.padEnd(12)} | ${String(m.cible_kcal).padStart(4)} | ` +
      SLOTS.map((s) => String(m.distincts[s]).padStart(4)).join(' ') +
      ` | ${m.horsRegime > 0 ? `⚠ ${m.horsRegime}/${m.repas}` : '0'}`
    );
  }

  // Pool SERVABLE par profil × créneau — c'est lui qui explique la variété.
  const all = getEffectiveRecipes();
  console.log('\nPOOL SERVABLE — recettes du catalogue atteignant la cible du profil (règle R8).');
  console.log('profil         | petit-déj | repas complet | collation');
  for (const g of PROFILS_REF) {
    const c = ciblesDe(g);
    const cell = (slot: MealType) => {
      const pool = all.filter((r) => r.tags.includes(slot));
      return `${pool.filter((r) => servable(r, c[slot])).length}/${pool.length}`;
    };
    console.log(`${g.nom.padEnd(14)} | ${cell('breakfast').padStart(9)} | ${cell('lunch').padStart(13)} | ${cell('snack').padStart(9)}`);
  }

  if (avecFlags) {
    for (const sexe of ['F', 'H'] as const) {
      const sous = resultats.filter((m) => m.gabarit.startsWith(sexe));
      const t: Record<string, number> = {}; let n = 0;
      for (const m of sous) { n += m.repas; for (const [k, v] of Object.entries(m.flags)) t[k] = (t[k] ?? 0) + v; }
      console.log(`\nDrapeaux — ${sexe === 'F' ? 'femmes' : 'hommes'} (${n} repas servis) :`);
      for (const [k, v] of Object.entries(t).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k.padEnd(22)} ${String(v).padStart(6)}  (${((v / n) * 100).toFixed(1)} %)`);
      }
    }
  }
}

function main(argv: string[]): void {
  const iEnv = argv.indexOf('--enveloppe');
  if (iEnv !== -1) {
    const chemin = argv[iEnv + 1];
    if (!chemin) { console.error('Usage : --enveloppe <chemin/vers/recettes.json>'); process.exit(2); }
    process.exit(controleEnveloppe(chemin));
  }
  etatCatalogue(argv.includes('--flags'), argv.includes('--csv'));
}

// Exécution directe seulement — sinon l'import depuis un test lirait l'argv de vitest.
const lance = process.argv[1] ?? '';
if (lance.endsWith('mesure-couverture.ts') || lance.endsWith('mesure-couverture.js')) main(process.argv.slice(2));
