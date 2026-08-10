/**
 * Mesure du PLANCHER DE SÉCURITÉ face à l'ADIPOSITÉ — deux questions, un seul axe.
 *
 * ⚠️ Comme les autres scripts de mesure, celui-ci ne réplique AUCUNE formule : il
 * appelle `calculateBMR`, `safetyFloorBreakdown` et `maxWeeklyLossPct` — les vraies,
 * celles que le moteur exécute. Un chiffre faux ici est un chiffre faux en production.
 *
 * ── Q1. Le plancher s'inverse-t-il avec l'adiposité ? ────────────────────────
 * Les deux planchers dérivés de la masse maigre (BMR, et énergie disponible à
 * 30 kcal/kg de masse maigre) MONTENT avec le gabarit. Or un sujet gras porte
 * beaucoup de masse maigre. Hypothèse à vérifier : plus la personne est grasse,
 * moins le moteur l'autorise à perdre — l'inverse de ce qu'il faut.
 *
 * On compare, pour chaque corps, les TROIS contraintes qui s'appliquent, et on
 * regarde laquelle mord :
 *   • le plafond de RYTHME       (`maxWeeklyLossPct`, gradué par le %MG)
 *   • le cap à 25 % du TDEE      (`MAX_DEFICIT_TDEE_RATIO`)
 *   • le PLANCHER calorique      (`safetyFloorBreakdown` : BMR / EA / MIN_KCAL)
 *
 * ── Q2. Le %MG est-il GELÉ pendant la sèche ? ────────────────────────────────
 * `maxWeeklyLossPct` lit le %MG, donc le plafond DEVRAIT se resserrer à mesure que
 * la personne s'affine. Mais `resolvedBodyFatPct` renvoie le %MG DÉCLARÉ tel quel :
 * il ne bouge que si la personne le ressaisit. La projection
 * (`datedGoal.maxSafeDeltaAt`) met à jour le POIDS semaine par semaine et laisse le
 * %MG à sa valeur de départ.
 *
 * Référence de comparaison : Deurenberg, la formule que le moteur emploie LUI-MÊME
 * quand aucun %MG n'est déclaré. Aucune formule nouvelle n'est introduite ici — on
 * fait juste dire au moteur ce qu'il dirait du MÊME corps sans le chiffre gelé.
 *
 * Usage :
 *   npx tsx scripts/mesure-plancher-adiposite.ts          les deux mesures
 *   npx tsx scripts/mesure-plancher-adiposite.ts --csv    sortie machine
 */
import { calculateBMR, recalcProfile, katchEligible } from '../lib/tdee';
import { safetyFloorBreakdown, resolvedBodyFatPct, fatFreeMassKg } from '../lib/safety';
import { exerciseKcalPerDay } from '../lib/sport';
import { maxWeeklyLossPct, MAX_DEFICIT_TDEE_RATIO, KCAL_PER_KG_FAT } from '../lib/datedGoal';
import type { Sex, UserProfile, BodyFatSource } from '../lib/types';

const csv = process.argv.includes('--csv');

type Corps = {
  sex: Sex; weight_kg: number; height_cm: number; age: number;
  body_fat_pct?: number; body_fat_source?: BodyFatSource; seances: number;
};

/** Profil complet, calculé par le VRAI moteur (TDEE, NEAT, plan). */
function profil(c: Corps): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: c.sex, age: c.age, weight_kg: c.weight_kg, height_cm: c.height_cm,
    body_fat_pct: c.body_fat_pct, body_fat_source: c.body_fat_source,
    activity_level: 'moderate', neat_level: 'desk',
    training_days_per_week: c.seances,
    sports: c.seances > 0
      ? [{ type: 'musculation', sessions_per_week: c.seances, minutes_per_session: 60 }]
      : [],
    goal: 'cut', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as UserProfile);
}

/** Les trois contraintes, en kcal/jour de déficit autorisé. La plus basse gagne. */
function contraintes(c: Corps) {
  const p = profil(c);
  const tdee = p.tdee_kcal;
  const bmr = calculateBMR(p);
  // Le sport entre dans le plancher EA (il faut le RENDRE avant de compter l'énergie
  // disponible) : même producteur que `floorAndFlags`, pas une valeur refaite ici.
  const sportKcalPerDay = exerciseKcalPerDay(p.sports, p.weight_kg);
  const br = safetyFloorBreakdown(p, bmr, sportKcalPerDay, 0, tdee);

  const rythmePct = maxWeeklyLossPct(p);
  const parRythme = (rythmePct / 100) * c.weight_kg * KCAL_PER_KG_FAT / 7;
  const parCap = MAX_DEFICIT_TDEE_RATIO * tdee;
  const parPlancher = tdee - br.floorKcal;

  const effectif = Math.min(parRythme, parCap, parPlancher);
  const qui = effectif === parPlancher ? `plancher:${br.source}`
    : effectif === parCap ? 'cap 25 %' : 'rythme';

  return {
    ffm: fatFreeMassKg(p), bmr, tdee, formule: katchEligible(p) ? 'katch' : 'mifflin',
    floor: br.floorKcal, source: br.source,
    parRythme, parCap, parPlancher, effectif, qui,
    kgSem: (effectif * 7) / KCAL_PER_KG_FAT,
    pctSem: ((effectif * 7) / KCAL_PER_KG_FAT) / c.weight_kg * 100,
    rythmeAutorisePct: rythmePct,
  };
}

// ── Q1 ───────────────────────────────────────────────────────────────────────
//
// Un seul corps, un seul curseur : le %MG. Poids et taille FIXES, sinon on ne sait
// pas si c'est l'adiposité ou le gabarit qui produit l'effet.

console.log('═══ Q1 — LE PLANCHER S\'INVERSE-T-IL AVEC L\'ADIPOSITÉ ? ═══\n');
console.log('Homme 100 kg / 178 cm / 35 ans, %MG MESURÉ, sédentaire (0 séance).');
console.log('« déficit permis » = ce que chaque contrainte laisse passer, en kcal/j.\n');

if (csv) console.log('sexe,poids,pct_mg,seances,ffm,formule,bmr,tdee,plancher,source,par_rythme,par_cap,par_plancher,effectif,qui,kg_sem');

function ligne(c: Corps, label: string) {
  const r = contraintes(c);
  if (csv) {
    console.log([
      c.sex, c.weight_kg, c.body_fat_pct ?? '', c.seances, r.ffm.toFixed(1), r.formule,
      Math.round(r.bmr), Math.round(r.tdee), r.floor, r.source,
      Math.round(r.parRythme), Math.round(r.parCap), Math.round(r.parPlancher),
      Math.round(r.effectif), r.qui, r.kgSem.toFixed(2),
    ].join(','));
    return r;
  }
  console.log(
    `${label.padEnd(16)} maigre ${r.ffm.toFixed(0).padStart(3)}kg  ${r.formule.padEnd(7)}` +
    ` TDEE ${String(Math.round(r.tdee)).padStart(4)}  plancher ${String(r.floor).padStart(4)} (${r.source})` +
    `  │ rythme ${String(Math.round(r.parRythme)).padStart(4)}  cap ${String(Math.round(r.parCap)).padStart(3)}` +
    `  plancher ${String(Math.round(r.parPlancher)).padStart(5)}` +
    `  → ${String(Math.round(r.effectif)).padStart(4)} kcal/j = ${r.kgSem.toFixed(2)} kg/sem  [${r.qui}]`,
  );
  return r;
}

for (const bf of [15, 20, 25, 30, 35, 40, 45]) {
  ligne(
    { sex: 'male', weight_kg: 100, height_cm: 178, age: 35, body_fat_pct: bf, body_fat_source: 'measured', seances: 0 },
    `${bf} % MG`,
  );
}

console.log('\nLe corps du brief — homme 123 kg / 35 % MG, les deux provenances :\n');
for (const src of ['measured', 'estimated'] as BodyFatSource[]) {
  ligne(
    { sex: 'male', weight_kg: 123, height_cm: 180, age: 35, body_fat_pct: 35, body_fat_source: src, seances: 0 },
    src === 'measured' ? 'mesuré' : 'estimé',
  );
}

console.log('\nMême corps, avec 4 séances de musculation :\n');
for (const src of ['measured', 'estimated'] as BodyFatSource[]) {
  ligne(
    { sex: 'male', weight_kg: 123, height_cm: 180, age: 35, body_fat_pct: 35, body_fat_source: src, seances: 4 },
    src === 'measured' ? 'mesuré 4×' : 'estimé 4×',
  );
}

console.log('\nFemme 95 kg / 165 cm / 35 ans, %MG mesuré, sédentaire :\n');
for (const bf of [30, 35, 40, 45] as number[]) {
  ligne(
    { sex: 'female', weight_kg: 95, height_cm: 165, age: 35, body_fat_pct: bf, body_fat_source: 'measured', seances: 0 },
    `${bf} % MG`,
  );
}

// ── Q2 ───────────────────────────────────────────────────────────────────────
//
// 🔴 CE QUE CETTE MESURE NE FAIT PAS, ET POURQUOI.
//
// La version d'origine comparait le %MG gelé à DEURENBERG — la formule que le moteur
// emploie quand aucun %MG n'est déclaré. C'était proposer, sans le savoir, exactement
// ce que CLAUDE.md §6 a déjà mesuré et ÉCARTÉ : « retomber sur Deurenberg quand c'est
// estimé […] ne lit que l'IMC, l'âge et le sexe, il ne distingue pas un muscle d'un
// kilo de gras » — +12 points sur une femme de 65 kg à 18 %. Deurenberg n'est donc pas
// la référence de ce qu'un %MG DEVRAIT valoir : c'est un repli, et un mauvais.
//
// Ce qui est mesuré ici ne dépend d'AUCUNE référence extérieure : on demande au moteur
// son plafond au fil de la descente, et on regarde s'il bouge. La question « quelle est
// la bonne valeur du %MG à 85 kg ? » est une DÉCISION, pas une mesure — elle demande une
// fraction de perte attribuée au gras, constante que le moteur n'a pas (vérifié : aucune
// règle « 85 % de la perte est du gras » dans lib/). Elle n'est donc pas tranchée ici.
//
// À la place, la contrainte de masse : pour que le plafond servi reste LÉGITIME à
// l'arrivée, combien de kilos de gras la personne doit-elle encore porter ? Si la
// réponse est absurde, le plafond l'est aussi — et ça se démontre sans constante neuve.

console.log('\n\n═══ Q2 — LE %MG EST-IL GELÉ PENDANT LA SÈCHE ? ═══\n');
console.log('Homme 180 cm / 35 ans, part de 123 kg à 35 % MG DÉCLARÉ, descend vers 85 kg.');
console.log('Le %MG déclaré ne bouge que si la personne le RESSAISIT : la projection');
console.log('(datedGoal.maxSafeDeltaAt) met à jour le poids, jamais le %MG.\n');

if (csv) console.log('poids,mg_declare,plafond_pct,kg_sem,mg_seuil_bande,gras_kg_requis,gras_kg_depart');

// Masse grasse au départ, à partir des seuls chiffres DÉCLARÉS.
const GRAS_DEPART = 123 * 0.35;

for (const poids of [123, 115, 105, 95, 90, 85]) {
  const declare = { sex: 'male' as Sex, age: 35, height_cm: 180, weight_kg: poids, body_fat_pct: 35 };
  const pct = maxWeeklyLossPct(declare);
  const kgSem = (pct / 100) * poids;

  // Le plafond de 1,25 %/sem n'est ouvert qu'au-delà de 30 % de MG chez l'homme
  // (`maxWeeklyLossPct`). À ce poids, ça représente combien de kilos de gras ?
  const seuilBande = 30;
  const grasRequis = (seuilBande / 100) * poids;

  if (csv) {
    console.log([poids, 35, pct, kgSem.toFixed(2), seuilBande, grasRequis.toFixed(1), GRAS_DEPART.toFixed(1)].join(','));
  } else {
    console.log(
      `${String(poids).padStart(3)} kg  │ %MG lu par le moteur : 35,0 (inchangé)` +
      `  → plafond ${pct.toFixed(2)} %/sem = ${kgSem.toFixed(2)} kg/sem` +
      `  │ pour que ce plafond reste ouvert il faudrait ${grasRequis.toFixed(1)} kg de gras` +
      ` (départ : ${GRAS_DEPART.toFixed(1)} kg)`,
    );
  }
}

console.log('\nLecture : la personne a perdu 38 kg. Pour que le moteur ait encore le DROIT');
console.log('de lui servir 1,25 %/semaine à 85 kg, il faudrait qu\'elle porte 25,5 kg de gras,');
console.log('donc que seulement 17,5 kg des 38 perdus aient été du gras — les 20,5 autres');
console.log('étant du muscle. C\'est le scénario que le plafond gelé autorise en silence.');
