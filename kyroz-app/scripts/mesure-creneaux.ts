/**
 * Combien de repas par jour le moteur sait-il RÉELLEMENT servir ?
 *
 * Les créneaux libres retirent le plafond de 4 qui était dans le TYPE. Reste à
 * savoir où est le vrai plafond — celui du CATALOGUE. Plus il y a de repas, plus
 * la part de chacun est petite ; en dessous d'une certaine taille de portion,
 * aucune recette ne sait viser la cible et le moteur sert des assiettes qui
 * débordent (`over_target_kcal`) ou manquent de protéines.
 *
 * On mesure sur le MOTEUR (`buildLocalPlan`), jamais sur une réplique de ses
 * formules — c'est la règle de CLAUDE.md §10, et elle a déjà produit trois
 * conclusions fausses quand on l'a contournée.
 *
 * Ce qui est compté, par nombre de repas :
 *   • écart calorique moyen du jour (|servi − cible| / cible)
 *   • drapeaux BLOQUANTS sur les repas servis (over_target_kcal, protein_below_target…)
 *   • plus petit repas servi, en kcal
 *   • recettes distinctes sur la semaine
 *
 *   npx tsx scripts/mesure-creneaux.ts
 */
import { recalcProfile } from '../lib/tdee';
import { buildLocalPlan, dayTargetKcal } from '../lib/planEngine';
import { MealSlot, UserProfile, Sex, DietaryRestriction } from '../lib/types';
import { BUILTIN_SLOTS } from '../lib/mealSlots';

type Corps = { nom: string; sex: Sex; poids: number; taille: number; mg: number; goal: 'cut' | 'maintain' | 'bulk'; regime: DietaryRestriction[] };

// Les gabarits EXTRÊMES d'abord : c'est le petit budget en sèche qui touche le
// plafond, pas le gros gabarit en prise de masse. Un panel confortable dirait que
// tout va bien jusqu'à 12 repas.
const CORPS: Corps[] = [
  { nom: 'F 55 sèche', sex: 'female', poids: 55, taille: 162, mg: 24, goal: 'cut', regime: [] },
  { nom: 'F 55 sèche vegan', sex: 'female', poids: 55, taille: 162, mg: 24, goal: 'cut', regime: ['vegan'] },
  { nom: 'F 65 sèche', sex: 'female', poids: 65, taille: 168, mg: 28, goal: 'cut', regime: [] },
  { nom: 'H 80 maintien', sex: 'male', poids: 80, taille: 180, mg: 18, goal: 'maintain', regime: [] },
  { nom: 'H 95 masse', sex: 'male', poids: 95, taille: 186, mg: 16, goal: 'bulk', regime: [] },
];

/**
 * Les créneaux d'une journée à N repas. On part des 4 intégrés et on AJOUTE des
 * collations : c'est le cas réel (« je mange 6 fois par jour » = les 3 repas plus
 * des collations), et c'est aussi le pire cas pour le catalogue, dont le vivier
 * collation est le plus petit (110 recettes contre 280 en repas complet).
 */
const EXTRAS: MealSlot[] = [
  { id: 'custom-1', label: 'Collation matin', hour: 10, minute: 30, pool: 'snack' },
  { id: 'custom-2', label: 'Collation soir', hour: 22, minute: 0, pool: 'snack' },
  { id: 'custom-3', label: 'Pré-training', hour: 17, minute: 0, pool: 'snack' },
  { id: 'custom-4', label: 'Post-training', hour: 19, minute: 0, pool: 'snack' },
  { id: 'custom-5', label: 'Collation nuit', hour: 23, minute: 0, pool: 'snack' },
  { id: 'custom-6', label: 'Deuxième petit-déj', hour: 9, minute: 0, pool: 'snack' },
  { id: 'custom-7', label: 'Goûter', hour: 15, minute: 0, pool: 'snack' },
  { id: 'custom-8', label: 'Encas', hour: 11, minute: 0, pool: 'snack' },
];

function profil(c: Corps, n: number): UserProfile {
  const extras = EXTRAS.slice(0, Math.max(0, n - BUILTIN_SLOTS.length));
  const builtins = BUILTIN_SLOTS.slice(0, Math.min(n, BUILTIN_SLOTS.length)).map((s) => s.id);
  return recalcProfile({
    id: 't', sex: c.sex, age: 30, weight_kg: c.poids, height_cm: c.taille, body_fat_pct: c.mg,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: c.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...builtins, ...extras.map((s) => s.id)],
    meal_slots: extras.length ? extras : undefined,
    meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: c.regime, disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

const NB = [3, 4, 5, 6, 7, 8, 9, 10, 12];
// Les mêmes trois drapeaux que `npm run mesure:variete` — ceux dont le public est
// l'UTILISATEUR (`FLAG_AUDIENCE`), c'est-à-dire une assiette qu'il verra marquée
// « trop grosse » ou « en manque de protéines ». Les deux autres sont des signaux
// de départage interne.
const bloquant = (f: string) => f === 'over_target_kcal' || f === 'under_target_kcal' || f === 'protein_below_target';

type Ligne = { n: number; ecart: number; drapeaux: number; plusPetit: number; distinctes: number; repas: number };
const parN = new Map<number, Ligne>();

for (const corps of CORPS) {
  console.log(`\n── ${corps.nom}${corps.regime.length ? ` (${corps.regime.join('+')})` : ''} ────────────────────────`);
  console.log('repas/j | cible/j | écart jour | drapeaux bloquants | + petit repas | recettes distinctes');
  for (const n of NB) {
    const p = profil(corps, n);
    // Cinq tirages : le plan canonique (seed 0) ET des rerolls. Ne mesurer que le
    // canonique masquerait la dégradation de la variété, qui est justement ce qui
    // souffre quand trois collations puisent dans le même vivier.
    let ecart = 0, jours = 0, drapeaux = 0, plusPetit = Infinity, repas = 0;
    const vues = new Set<string>();
    for (const seed of [0, 1, 2, 3, 4]) {
      const plan = buildLocalPlan(p, seed);
      for (let d = 1; d <= plan.days; d++) {
        const duJour = plan.meals.filter((m) => m.day === d);
        const servi = duJour.reduce((s, m) => s + m.macros.kcal, 0);
        const cible = dayTargetKcal(p, plan.days, d);
        ecart += Math.abs(servi - cible) / cible;
        jours++;
      }
      for (const m of plan.meals) {
        repas++;
        vues.add(m.recipe.id);
        plusPetit = Math.min(plusPetit, m.macros.kcal);
        for (const f of m.adapt_flags ?? []) if (bloquant(f)) drapeaux++;
      }
    }
    const l: Ligne = {
      n, ecart: (ecart / jours) * 100, drapeaux, plusPetit,
      distinctes: vues.size, repas,
    };
    const cum = parN.get(n);
    parN.set(n, cum
      ? { ...cum, ecart: cum.ecart + l.ecart, drapeaux: cum.drapeaux + l.drapeaux, plusPetit: Math.min(cum.plusPetit, l.plusPetit), distinctes: Math.min(cum.distinctes, l.distinctes), repas: cum.repas + l.repas }
      : l);
    console.log(
      `${String(n).padStart(7)} | ${String(p.target_kcal).padStart(7)} |` +
      ` ${l.ecart.toFixed(2).padStart(9)}% | ${String(drapeaux).padStart(18)} |` +
      ` ${String(Math.round(plusPetit)).padStart(10)} kcal | ${String(vues.size).padStart(19)}`,
    );
  }
}

console.log('\n══ TOUS GABARITS CONFONDUS ═══════════════════════════════════════════════');
console.log('repas/j | écart jour moyen | drapeaux bloquants | ‰ des repas servis | + petit repas | recettes distinctes (min)');
for (const n of NB) {
  const l = parN.get(n)!;
  console.log(
    `${String(n).padStart(7)} | ${(l.ecart / CORPS.length).toFixed(2).padStart(15)}% |` +
    ` ${String(l.drapeaux).padStart(18)} | ${((l.drapeaux / l.repas) * 1000).toFixed(1).padStart(18)} |` +
    ` ${String(Math.round(l.plusPetit)).padStart(10)} kcal | ${String(l.distinctes).padStart(25)}`,
  );
}
console.log(
  '\nLecture : le plafond retenu (`MAX_MEAL_SLOTS`) est le dernier palier où l\'écart\n' +
  'calorique du jour reste sous 1 % ET où les drapeaux bloquants ne décollent pas.\n' +
  'Un drapeau bloquant = une assiette que le catalogue ne sait pas servir à la cible.',
);
