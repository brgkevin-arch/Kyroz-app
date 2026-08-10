/**
 * Mesure des PALIERS — un objectif intermédiaire change-t-il ce que le moteur SERT ?
 *
 * ⚠️ Comme les autres scripts de mesure, celui-ci n'invente aucune formule : il appelle
 * `recalcProfile`, `datedGoalStatus` et le vrai projecteur.
 *
 * ── La question, et c'est ELLE qui décide de l'implémentation ────────────────
 * Le brief propose de découper un gros objectif (> 15 kg, ou > 6 mois) en paliers de
 * 8 à 10 kg, en n'affichant que le palier courant, avec re-décision à chacun.
 *
 * Deux implémentations possibles, et elles n'ont RIEN à voir en coût ni en risque :
 *   • **VUE** — le `goal_target` reste la cible finale, on n'affiche que l'étape
 *     suivante. Aucune calorie ne bouge, aucun invariant de trajectoire à re-mesurer.
 *   • **MOTEUR** — le palier DEVIENT le `goal_target`. Alors le pilotage vise le
 *     palier, donc le déficit servi change, donc A15, le point fixe de la date, le
 *     couloir de progression et l'échelle d'échéances sont tous à re-mesurer.
 *
 * On ne peut pas choisir sans savoir si les deux servent la même chose. C'est
 * exactement ce que ce script mesure : la MÊME trajectoire, coupée en paliers pris
 * SUR ELLE (donc aux dates que le moteur atteint vraiment), sert-elle les mêmes
 * calories que l'objectif d'un seul tenant ?
 *
 * ⚠️ Le palier doit être daté SUR LA TRAJECTOIRE SIMULÉE, pas sur une règle de trois.
 * Prendre « 1/4 du poids en 1/4 du temps » supposerait une perte linéaire — or elle ne
 * l'est pas (la dépense baisse avec le poids, et une pause tombe toutes les 9 semaines).
 * Ce serait mesurer l'écart d'une hypothèse fausse, pas celui du découpage.
 *
 * Usage :
 *   npx tsx scripts/mesure-paliers.ts
 *   npx tsx scripts/mesure-paliers.ts --csv
 */
import { recalcProfile, makeWeeklyProjector, planFloorKcal } from '../lib/tdee';
import { datedGoalStatus, simulatedTrajectory, addDaysStamp, daysBetween } from '../lib/datedGoal';
import type { GoalTarget, Sex, UserProfile } from '../lib/types';

const csv = process.argv.includes('--csv');

/** Ancrage FIXE : `Date.now()` rendrait la mesure irreproductible. */
const AUJOURD_HUI = '2026-08-10';

type Corps = {
  nom: string; sex: Sex; weight_kg: number; height_cm: number; age: number;
  body_fat_pct: number; cible: number; seances: number;
};

/**
 * Corps à GROS écart — ce sont les seuls que la règle du brief concerne (> 15 kg ou
 * > 6 mois). Un panel de gabarits ordinaires ne dirait rien du découpage.
 */
const CORPS: Corps[] = [
  { nom: 'H 123 → 85', sex: 'male', weight_kg: 123, height_cm: 180, age: 35, body_fat_pct: 35, cible: 85, seances: 0 },
  { nom: 'H 123 → 85 (4×)', sex: 'male', weight_kg: 123, height_cm: 180, age: 35, body_fat_pct: 35, cible: 85, seances: 4 },
  { nom: 'F 120 → 80', sex: 'female', weight_kg: 120, height_cm: 165, age: 30, body_fat_pct: 45, cible: 80, seances: 0 },
  { nom: 'H 105 → 85', sex: 'male', weight_kg: 105, height_cm: 178, age: 40, body_fat_pct: 32, cible: 85, seances: 3 },
  { nom: 'F 95 → 78', sex: 'female', weight_kg: 95, height_cm: 168, age: 38, body_fat_pct: 42, cible: 78, seances: 2 },
];

function profil(c: Corps, gt?: GoalTarget): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: c.sex, age: c.age, weight_kg: c.weight_kg, height_cm: c.height_cm,
    body_fat_pct: c.body_fat_pct, body_fat_source: 'measured',
    activity_level: 'moderate', neat_level: 'desk', training_days_per_week: c.seances,
    sports: c.seances > 0
      ? [{ type: 'musculation', sessions_per_week: c.seances, minutes_per_session: 60 }]
      : [],
    goal: 'cut', macro_mode: 'auto', goal_target: gt,
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as UserProfile, AUJOURD_HUI);
}

function statut(p: UserProfile, gt: GoalTarget) {
  return datedGoalStatus(
    gt, p, AUJOURD_HUI, p.tdee_kcal, planFloorKcal(p, AUJOURD_HUI), makeWeeklyProjector(p),
  )!;
}

console.log('PALIERS — un objectif intermédiaire change-t-il le plan SERVI ?\n');
console.log(`Ancrage ${AUJOURD_HUI}. « final » = objectif d'un seul tenant.`);
console.log('« palier » = même trajectoire, cible intermédiaire datée SUR la trajectoire simulée.\n');

if (csv) console.log('corps,ecart_kg,jours_final,kcal_final,palier_kg,jours_palier,kcal_palier,ecart_kcal,rythme_final,rythme_palier');

for (const c of CORPS) {
  const ecart = c.weight_kg - c.cible;

  // 1. L'objectif d'un seul tenant, au RYTHME SÛR MAXIMAL.
  //
  // 🔴 LA PREMIÈRE VERSION DE CETTE MESURE ÉTAIT CONTAMINÉE, et dans le sens rassurant.
  // Elle datait l'objectif à 4 ans « pour éviter le régime A15 » — sauf qu'à 4 ans un
  // écart de 38 kg ne demande que 0,18 kg/semaine, donc le moteur servait un rythme
  // trivial (mesuré : −0,20 kg/sem, quand ce corps peut désormais tenir 0,62). Les deux
  // objectifs comparés étaient également mous, l'écart de 21 kcal n'était qu'un arrondi
  // de date, et la mesure ne disait rien du découpage.
  //
  // On date donc VOLONTAIREMENT trop court : A15 bascule alors au rythme sûr maximal,
  // qui est le seul régime dans lequel quelqu'un ayant 38 kg à perdre se trouvera
  // vraiment. C'est aussi celui où un écart entre palier et objectif final se verrait.
  const gtCourt: GoalTarget = {
    target_weight_kg: c.cible, target_date: addDaysStamp(AUJOURD_HUI, 7 * 12),
    start_weight_kg: c.weight_kg, start_date: AUJOURD_HUI,
  };
  const pF = profil(c, gtCourt);
  const sF = statut(pF, gtCourt);
  if (!sF.projectable) {
    console.log(`${c.nom.padEnd(18)} → AUCUNE date projetable, palier sans objet`);
    continue;
  }
  // ⚠️ NE PAS tester `maxRateApplied` ici — c'était le deuxième piège de cette mesure.
  // Ce drapeau ne se lève que quand le moteur BASCULE d'un rythme requis trop mou vers
  // le maximum. Avec une date agressive, le rythme requis dépasse déjà les plafonds :
  // le maximum est servi par le chemin ORDINAIRE (plafond de rythme + 25 % du TDEE),
  // donc il n'y a rien à basculer et le drapeau reste false. Le tester écartait les
  // 5 corps sur 5 — la mesure ne rendait plus une seule ligne.
  // Ce qui atteste du bon régime est `clamped` : un plafond de sécurité a mordu.
  if (!sF.clamped) {
    console.log(`${c.nom.padEnd(18)} → ⚠️ aucun plafond ne mord, la comparaison ne vaut pas`);
    continue;
  }
  const gtFinal = gtCourt;

  // 2. Le palier : ~1/4 de l'écart, mais DATÉ sur la trajectoire réellement simulée.
  const journal = simulatedTrajectory(pF, gtFinal, AUJOURD_HUI, makeWeeklyProjector(pF));
  const poidsPalier = Math.round((c.weight_kg - ecart / 4) * 10) / 10;
  const passage = journal.find((j) => j.weightKg <= poidsPalier);
  if (!passage) {
    console.log(`${c.nom.padEnd(18)} → la trajectoire ne franchit pas ${poidsPalier} kg`);
    continue;
  }
  // Le palier est daté sur la trajectoire SIMULÉE de l'objectif final : c'est le jour
  // où le moteur atteint réellement ce poids-là. Toute autre date comparerait deux
  // ambitions différentes au lieu de comparer deux DÉCOUPAGES de la même.
  const gtPalier: GoalTarget = {
    target_weight_kg: poidsPalier, target_date: passage.stamp,
    start_weight_kg: c.weight_kg, start_date: AUJOURD_HUI,
  };
  const pP = profil(c, gtPalier);
  const sP = statut(pP, gtPalier);

  const dF = daysBetween(AUJOURD_HUI, sF.projectedDate);
  const dP = daysBetween(AUJOURD_HUI, sP.projectedDate);
  const ecartKcal = pP.target_kcal - pF.target_kcal;

  if (csv) {
    console.log([
      c.nom, ecart.toFixed(1), dF, pF.target_kcal, poidsPalier, dP, pP.target_kcal,
      ecartKcal, sF.safeWeeklyKg.toFixed(3), sP.safeWeeklyKg.toFixed(3),
    ].join(','));
  } else {
    console.log(
      `${c.nom.padEnd(18)} écart ${String(ecart).padStart(4)} kg` +
      `  │ FINAL  ${String(pF.target_kcal).padStart(4)} kcal, arrivée J+${String(dF).padStart(4)}, ${sF.safeWeeklyKg.toFixed(2)} kg/sem` +
      `  │ PALIER ${poidsPalier} kg  ${String(pP.target_kcal).padStart(4)} kcal, J+${String(dP).padStart(3)}, ${sP.safeWeeklyKg.toFixed(2)} kg/sem` +
      `  │ écart ${ecartKcal >= 0 ? '+' : ''}${ecartKcal} kcal/j`,
    );
  }
}

console.log('\nLecture : si « écart » est nul sur tous les corps, le palier est une VUE —');
console.log('il n\'y a aucune calorie à re-mesurer, et le découpage est un travail d\'écran.');
console.log('S\'il ne l\'est pas, le palier est un changement de MOTEUR, avec tous les');
console.log('invariants de trajectoire à rejouer (A15, point fixe, couloir, échelle).');
