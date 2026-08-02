/**
 * AUDIT D'INERTIE — « ce réglage change-t-il vraiment le plan servi ? »
 *
 * Même classe de bug qu'A23 (le réglage de variété ne pilotait pas le reroll) :
 * un réglage affiché qui ne modifie RIEN est un mensonge de l'interface. On ne
 * relit pas le code pour le décider, on bascule le réglage et on regarde le plan
 * que `buildLocalPlan` rend — recettes ET portions.
 *
 * DEUX axes :
 *   1. INERTIE   — chaque réglage, basculé seul, change-t-il quelque chose ?
 *   2. SEED PERDU — la séquence réelle : l'utilisateur régénère (seed n), puis
 *      touche un réglage → l'auto-refresh de l'écran Plan rejoue `generate()`
 *      SANS reroll (seed remis à 0). Que perd-il ?
 */
import { buildLocalPlan } from '../lib/planEngine';
import { recalcProfile } from '../lib/tdee';
import { recipeFiberPerPortion } from '../lib/fiber';
import { PROFILS_REF } from './mesure-couverture';
import type { UserProfile, MealPlan, Sex, Goal, DietaryRestriction, Recipe } from '../lib/types';

type Gabarit = { nom: string; sex: Sex; weight_kg: number; height_cm: number; age: number; goal: Goal };
const PROFILS: Gabarit[] = [
  { nom: 'F 55 sèche', sex: 'female', weight_kg: 55, height_cm: 162, age: 30, goal: 'cut' },
  { nom: 'F 65 maintien', sex: 'female', weight_kg: 65, height_cm: 167, age: 30, goal: 'maintain' },
  { nom: 'H 82 sèche (Kévin)', sex: 'male', weight_kg: 82, height_cm: 180, age: 32, goal: 'cut' },
  { nom: 'H 95 masse', sex: 'male', weight_kg: 95, height_cm: 183, age: 30, goal: 'bulk' },
];

function base(g: Gabarit, patch: Partial<UserProfile> = {}): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: g.sex, age: g.age, weight_kg: g.weight_kg, height_cm: g.height_cm,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
    ...patch,
  } as unknown as UserProfile);
}

/** Empreinte d'un plan : ce que l'utilisateur VOIT (recette + portion), pas les ids techniques. */
const recettes = (p: MealPlan) => p.meals.map((m) => `${m.day}|${m.meal_type}|${m.recipe.id}`).join(',');
const portions = (p: MealPlan) =>
  p.meals.map((m) => `${m.day}|${m.meal_type}|${Math.round(m.macros.kcal)}|${Math.round(m.macros.protein_g)}`).join(',');
/** % de créneaux dont la recette change entre deux plans. */
function ecart(a: MealPlan, b: MealPlan): number {
  const ma = new Map(a.meals.map((m) => [`${m.day}|${m.meal_type}`, m.recipe.id]));
  let vus = 0, diff = 0;
  for (const m of b.meals) { const k = `${m.day}|${m.meal_type}`; if (!ma.has(k)) continue; vus++; if (ma.get(k) !== m.recipe.id) diff++; }
  return vus === 0 ? 0 : (diff / vus) * 100;
}

// ─── 1. INERTIE ────────────────────────────────────────────────────────────
// Chaque entrée = un réglage réglable depuis l'UI, et les valeurs qu'il peut prendre.
const REGLAGES: { nom: string; ou: string; variantes: { v: string; p: Partial<UserProfile> }[] }[] = [
  { nom: 'Variété', ou: 'Profil › Préférences', variantes: [
    { v: 'répétitif', p: { variety: 'repetitive' } },
    { v: 'équilibré', p: { variety: 'balanced' } },
    { v: 'max', p: { variety: 'max' } } ] },
  { nom: 'Repas mis en avant', ou: 'Profil › Repas', variantes: [
    { v: 'égal', p: { meal_emphasis: 'even' } },
    { v: 'petit-déj', p: { meal_emphasis: 'breakfast' } },
    { v: 'dîner', p: { meal_emphasis: 'dinner' } } ] },
  { nom: 'Protéines préférées', ou: 'Profil › Préférences', variantes: [
    { v: 'aucune', p: { preferred_proteins: [] } },
    { v: 'poulet', p: { preferred_proteins: ['poulet'] } },
    { v: 'végétal', p: { preferred_proteins: ['végétal'] } } ] },
  { nom: 'Aliments évités', ou: 'Profil › Préférences', variantes: [
    { v: 'aucun', p: { disliked_foods: [] } },
    { v: 'poulet', p: { disliked_foods: ['poulet'] } },
    { v: 'riz+poulet', p: { disliked_foods: ['riz', 'poulet'] } } ] },
  { nom: 'Régime', ou: 'Profil › Préférences', variantes: [
    { v: 'aucun', p: { dietary_restrictions: [] } },
    { v: 'végétarien', p: { dietary_restrictions: ['vegetarian'] } },
    { v: 'vegan', p: { dietary_restrictions: ['vegan'] } } ] },
  { nom: 'NEAT (activité hors sport)', ou: 'Profil › Sports & activité', variantes: [
    { v: 'bureau', p: { neat_level: 'desk' } },
    { v: 'actif', p: { neat_level: 'active' } },
    { v: 'physique', p: { neat_level: 'physical' } } ] },
  { nom: 'Mode macros', ou: 'Profil › Macros', variantes: [
    { v: 'auto', p: { macro_mode: 'auto' } },
    { v: 'percent 30 %', p: { macro_mode: 'percent', carb_ratio: 30, protein_per_kg: 2 } },
    { v: 'percent 70 %', p: { macro_mode: 'percent', carb_ratio: 70, protein_per_kg: 2 } } ] },
  { nom: 'Jours de repos', ou: 'Profil › Sports & activité', variantes: [
    { v: 'auto', p: { rest_weekdays: undefined } },
    { v: 'aucun', p: { rest_weekdays: [] } },
    { v: 'sam+dim', p: { rest_weekdays: [0, 6] } } ] },
  { nom: 'Jours du plan', ou: 'Profil › Plan', variantes: [
    { v: '7 jours', p: { plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6] } },
    { v: '3 jours', p: { plan_days: 3, plan_weekdays: [1, 2, 3] } } ] },
  { nom: 'Repas du jour', ou: 'Profil › Repas', variantes: [
    { v: '4 repas', p: { meals: ['breakfast', 'lunch', 'dinner', 'snack'] } },
    { v: '3 repas', p: { meals: ['breakfast', 'lunch', 'dinner'] } } ] },
  { nom: 'Banque de calories', ou: 'Plan › Banque (Kyroz+)', variantes: [
    { v: 'aucune', p: { calorie_bank: undefined } },
    { v: 'samedi +600', p: { calorie_bank: { '6': 600 } } } ] },
  { nom: 'Repas fixe', ou: 'Profil › Repas', variantes: [
    { v: 'aucun', p: { fixed_meals: undefined } },
    { v: 'petit-déj fixe', p: { fixed_meals: { breakfast: { label: 'Mon shaker', source: 'custom',
        macros: { kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 10 } } } } } ] },
  { nom: 'Recettes masquées (👎)', ou: 'Plan › 👎 sur un repas', variantes: [
    { v: 'aucune', p: { hidden_recipes: [] } as Partial<UserProfile> },
    { v: '— posé au vol —', p: {} } ] }, // rempli dynamiquement plus bas
];

console.log('═══ 1. INERTIE DES RÉGLAGES (seed 0, plan canonique) ═══\n');
const inertes: string[] = [];
for (const r of REGLAGES) {
  const lignes: string[] = [];
  let bougeRecettes = false, bougePortions = false;
  for (const g of PROFILS) {
    // Cas spécial : le 👎 masque une recette effectivement servie à ce profil.
    let variantes = r.variantes;
    if (r.nom.startsWith('Recettes masquées')) {
      const servi = buildLocalPlan(base(g), 0).meals[0].recipe.id;
      variantes = [r.variantes[0], { v: `masque ${servi}`, p: { hidden_recipes: [servi] } as Partial<UserProfile> }];
    }
    const plans = variantes.map((x) => buildLocalPlan(base(g, x.p), 0));
    const rec = plans.map(recettes), por = plans.map(portions);
    const dRec = new Set(rec).size > 1, dPor = new Set(por).size > 1;
    bougeRecettes ||= dRec; bougePortions ||= dPor;
    const pires = plans.slice(1).map((p) => ecart(plans[0], p));
    lignes.push(`   ${g.nom.padEnd(20)} recettes ${dRec ? '✓' : '✗'} · portions ${dPor ? '✓' : '✗'}` +
      ` · écart max ${Math.max(0, ...pires).toFixed(0).padStart(3)} %`);
  }
  const verdict = bougeRecettes || bougePortions ? 'ACTIF ' : '‼️ INERTE';
  if (!bougeRecettes && !bougePortions) inertes.push(r.nom);
  console.log(`${verdict} ${r.nom.padEnd(28)} (${r.ou})`);
  lignes.forEach((l) => console.log(l));
}

// ─── 2. LE SEED PERDU ──────────────────────────────────────────────────────
// Séquence VÉCUE : l'utilisateur régénère jusqu'à obtenir une semaine qui lui plaît
// (seed 3), puis touche un réglage. L'auto-refresh (plan.tsx:225) rejoue
// `generate()` — sans reroll → seed 0. Que voit-il ?
console.log('\n\n═══ 2. LE SEED PERDU — « je régénère, puis je touche un réglage » ═══\n');
const TOUCHES: { nom: string; p: Partial<UserProfile> }[] = [
  { nom: 'passe la variété à « max »', p: { variety: 'max' } },
  { nom: 'ajoute un aliment évité', p: { disliked_foods: ['champignon'] } },
  { nom: 'met le dîner en avant', p: { meal_emphasis: 'dinner' } },
  { nom: 'déclare un jour de repos', p: { rest_weekdays: [0] } },
];
// ⚠️ ISOLER LE DÉFAUT. Comparer « son plan » à « ce qui s'affiche après » mélange
// DEUX choses : l'effet légitime du réglage (passer vegan DOIT tout changer) et la
// perte du seed. Le défaut seul, c'est l'écart entre :
//    attendu = le réglage appliqué EN GARDANT son seed   → buildLocalPlan(p', 3)
//    servi   = le réglage appliqué, seed remis à 0        → buildLocalPlan(p', 0)
// Tout ce qui les sépare n'est imputable qu'à la remise à zéro.
let duReglage = 0, duSeed = 0, revenuCanon = 0, total = 0;
for (const g of PROFILS) {
  const p0 = base(g);
  const canonique = buildLocalPlan(p0, 0);      // ce qu'il avait au départ
  const choisi = buildLocalPlan(p0, 3);          // ce qu'il a obtenu en régénérant 3×
  console.log(`${g.nom}  (régénérer lui avait changé ${ecart(canonique, choisi).toFixed(0)} % de la semaine)`);
  for (const t of TOUCHES) {
    const p1 = base(g, t.p);
    const attendu = buildLocalPlan(p1, 3);       // le réglage appliqué, son plan gardé
    const servi = buildLocalPlan(p1, 0);         // auto-refresh : seed 0
    const legitime = ecart(choisi, attendu);     // ce que le réglage change VRAIMENT
    const defaut = ecart(attendu, servi);        // ce que la remise à zéro détruit en plus
    const versCanon = ecart(canonique, servi);   // 0 % = il RETOMBE sur le plan rejeté
    total++; duReglage += legitime; duSeed += defaut; if (versCanon < 5) revenuCanon++;
    console.log(`   ${t.nom.padEnd(30)} le réglage change ${legitime.toFixed(0).padStart(3)} %` +
      ` · la remise à zéro en détruit ${defaut.toFixed(0).padStart(3)} % de plus` +
      `${versCanon < 5 ? '  ‼️ RETOUR EXACT AU PLAN REJETÉ' : ''}`);
  }
}
console.log(`\nEffet légitime du réglage  : ${(duReglage / total).toFixed(0)} % de la semaine en moyenne.`);
console.log(`Détruit EN PLUS par le seed : ${(duSeed / total).toFixed(0)} % — c'est le défaut, rien d'autre.`);
console.log(`Retours EXACTS au plan canonique (celui qu'il avait rejeté en régénérant) : ${revenuCanon}/${total}`);

// ─── 3. GARDER LE SEED DÉGRADE-T-IL LA QUALITÉ ? ───────────────────────────
// Si on corrige en gardant le seed à l'auto-refresh, l'utilisateur reste sur un plan
// « tirage élargi » au lieu de retomber sur le meilleur ajustement. Il faut donc
// vérifier que ça ne lui coûte RIEN sur les contrôles qui comptent. Définitions
// reprises telles quelles de `mesure-variete.ts` — surtout pas ré-inventées.
console.log('\n\n═══ 3. GARDER LE SEED COÛTE-T-IL EN QUALITÉ ? ═══\n');
const familleDe = (r: Recipe): string => {
  const refs = (role: string) =>
    r.ingredients.filter((i) => i.macro_role === role).map((i) => i.ref ?? i.name).sort().join('+') || '∅';
  const creneau = r.tags.includes('snack') ? 'collation' : r.tags.includes('breakfast') ? 'petit_dej' : 'repas_complet';
  return `${creneau} | ${refs('protein')} × ${refs('carb')}`;
};
// ⚠️ Panel de RÉFÉRENCE (12 profils), pas les 4 de l'audit d'inertie ci-dessus. Un
// panel réduit sous-estime : mesuré le 2026-08-02, un drapeau bloquant n'apparaissait
// QUE sur le grand panel. Les contrôles s'arbitrent sur celui-là, jamais sur un
// échantillon plus commode.
// Régimes IDENTIQUES à `mesure-variete.ts` — `vegan+SG` compris, la combinaison la
// plus dure du catalogue : c'est la SEULE où le renforcement de famille a fait
// apparaître un drapeau bloquant. L'omettre rendait un audit rassurant et faux.
const REGIMES_Q: DietaryRestriction[][] = [[], ['vegetarian'], ['vegan'], ['gluten_free'], ['vegan', 'gluten_free']];
function qualite(seeds: number[]) {
  let repas = 0, drapeaux = 0, jours = 0, ecartKcal = 0, semaines = 0, avecClone = 0, fibres = 0, kcalTot = 0;
  let creneaux = 0, monopoles = 0;
  for (const g of PROFILS_REF) {
    for (const r of REGIMES_Q) {
      const p = base(g, { dietary_restrictions: r });
      for (const seed of seeds) {
        semaines++;
        const plan = buildLocalPlan(p, seed);
        const parFam = new Map<string, Set<string>>();
        const kcalJour: Record<number, number> = {};
        for (const m of plan.meals) {
          repas++;
          kcalJour[m.day] = (kcalJour[m.day] ?? 0) + m.macros.kcal;
          fibres += recipeFiberPerPortion(m.recipe); kcalTot += m.macros.kcal;
          for (const f of m.adapt_flags ?? [])
            if (f === 'over_target_kcal' || f === 'under_target_kcal' || f === 'protein_below_target') drapeaux++;
          const k = familleDe(m.recipe);
          if (!parFam.has(k)) parFam.set(k, new Set());
          parFam.get(k)!.add(m.recipe.id);
        }
        for (const kcal of Object.values(kcalJour)) { jours++; ecartKcal += Math.abs(kcal - p.target_kcal) / p.target_kcal; }
        if ([...parFam.values()].some((ids) => ids.size > 1)) avecClone++;
        // ⚠️ CONTRE-MESURE. Renforcer un biais de sélection peut faire servir UNE seule
        // recette 7 jours d'affilée sans qu'aucune moyenne ne bronche — c'est la
        // régression que j'ai introduite puis réparée sur le chemin reroll (exception
        // `monopole`). Tout renforcement au plan canonique doit passer ce contrôle.
        for (const creneau of ['breakfast', 'lunch', 'dinner', 'snack']) {
          const duCreneau = plan.meals.filter((m) => m.meal_type === creneau);
          if (duCreneau.length < 2) continue;
          creneaux++;
          if (new Set(duCreneau.map((m) => m.recipe.id)).size === 1) monopoles++;
        }
      }
    }
  }
  return {
    drapeaux: (drapeaux / repas) * 100,
    ecartKcal: (ecartKcal / jours) * 100,
    clones: (avecClone / semaines) * 100,
    fibres: (fibres / kcalTot) * 1000,
    monopoles: (monopoles / creneaux) * 100,
  };
}
const q0 = qualite([0]);
const q3 = qualite([1, 2, 3, 4, 5]);
const ligne = (nom: string, a: number, b: number, unite: string, plusBasMieux = true) => {
  const delta = b - a;
  const mieux = plusBasMieux ? delta <= 0.05 : delta >= -0.05;
  console.log(`   ${nom.padEnd(30)} canonique ${a.toFixed(2).padStart(6)}${unite}` +
    ` · régénéré ${b.toFixed(2).padStart(6)}${unite}` +
    ` · ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}${unite} ${mieux ? '✓' : '⚠️'}`);
};
ligne('Drapeaux bloquants /repas', q0.drapeaux, q3.drapeaux, ' %');
ligne('Écart kcal moyen /jour', q0.ecartKcal, q3.ecartKcal, ' %');
ligne('Semaines avec quasi-doublon', q0.clones, q3.clones, ' %');
ligne('Créneaux monopolisés 7j/7', q0.monopoles, q3.monopoles, ' %');
ligne('Fibres / 1 000 kcal', q0.fibres, q3.fibres, ' g', false);

console.log('\n═══ VERDICT ═══');
console.log(inertes.length ? `Réglages INERTES : ${inertes.join(', ')}` : 'Aucun réglage inerte.');
