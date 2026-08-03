/**
 * Mesure de l'OBJECTIF DATÉ (chantier A15) — la date choisie pilote-t-elle vraiment
 * l'arrivée ?
 *
 * ⚠️ Comme les autres scripts de mesure, celui-ci ne réplique AUCUNE formule : il
 * appelle `datedGoalStatus` avec le vrai projecteur (`makeWeeklyProjector`), donc la
 * trajectoire simulée du moteur, plancher de sécurité et escalade de zone basse compris.
 *
 * Ce qu'il cherche : le défaut A15. Le moteur sert le déficit REQUIS pour la date,
 * calculé en LIGNE DROITE (`diff / weeksRemaining`), alors que l'arrivée est SIMULÉE.
 * Repousser la date réduit donc le déficit demandé — et quand le plancher de sécurité
 * cesse de mordre, le rythme réellement servi TOMBE. On veut savoir :
 *   1. sur quelle part des objectifs la date d'arrivée n'est PAS monotone (repousser la
 *      date d'échéance éloigne l'arrivée réelle) ;
 *   2. combien d'objectifs n'ont AUCUN point fixe (aucune date qu'on puisse promettre
 *      sans qu'elle se déplace dès qu'on l'adopte) ;
 *   3. ce que coûterait la politique alternative, en kcal servies et en jours gagnés.
 *
 * Usage :
 *   npx tsx scripts/mesure-objectif-date.ts            balayage + prévalence
 *   npx tsx scripts/mesure-objectif-date.ts --detail   + la courbe d'un cas
 *   npx tsx scripts/mesure-objectif-date.ts --csv      sortie machine
 */
import { datedGoalStatus, addDaysStamp, daysBetween } from '../lib/datedGoal';
import { recalcProfile, makeWeeklyProjector, planFloorKcal } from '../lib/tdee';
import type { GoalTarget, Goal, Sex, UserProfile } from '../lib/types';

/** Date d'ancrage FIXE : `Date.now()` rendrait la mesure irreproductible. */
const AUJOURD_HUI = '2026-08-03';

type Corps = {
  nom: string; sex: Sex; weight_kg: number; height_cm: number; age: number;
  body_fat_pct?: number; goal: Goal; seances: number;
};

/**
 * Corps de référence. Ce ne sont PAS les 12 gabarits du catalogue : l'objectif daté se
 * juge sur l'ÉCART au poids cible, et il faut donc couvrir des écarts relatifs très
 * différents (de 4 % à 17 % du poids de corps), plus les deux sexes — l'escalade de zone
 * basse ne mord que chez la femme non ménopausée, et c'est elle qui aplatit la
 * trajectoire à partir de la 13ᵉ semaine.
 */
const CORPS: Corps[] = [
  { nom: 'F 78 (→65)', sex: 'female', weight_kg: 78, height_cm: 168, age: 32, body_fat_pct: 34, goal: 'cut', seances: 4 },
  { nom: 'F 70 (→62)', sex: 'female', weight_kg: 70, height_cm: 166, age: 30, body_fat_pct: 30, goal: 'cut', seances: 4 },
  { nom: 'F 65 (→58)', sex: 'female', weight_kg: 65, height_cm: 165, age: 28, body_fat_pct: 27, goal: 'cut', seances: 3 },
  { nom: 'F 60 (→57)', sex: 'female', weight_kg: 60, height_cm: 164, age: 30, body_fat_pct: 25, goal: 'cut', seances: 4 },
  { nom: 'H 95 (→82)', sex: 'male', weight_kg: 95, height_cm: 182, age: 34, body_fat_pct: 26, goal: 'cut', seances: 4 },
  { nom: 'H 83 (→70)', sex: 'male', weight_kg: 83, height_cm: 178, age: 30, body_fat_pct: 18, goal: 'cut', seances: 4 },
  { nom: 'H 80 (→74)', sex: 'male', weight_kg: 80, height_cm: 180, age: 30, body_fat_pct: 16, goal: 'cut', seances: 4 },
  { nom: 'H 72 (→68)', sex: 'male', weight_kg: 72, height_cm: 175, age: 27, body_fat_pct: 14, goal: 'cut', seances: 5 },
];
const CIBLES: Record<string, number> = {
  'F 78 (→65)': 65, 'F 70 (→62)': 62, 'F 65 (→58)': 58, 'F 60 (→57)': 57,
  'H 95 (→82)': 82, 'H 83 (→70)': 70, 'H 80 (→74)': 74, 'H 72 (→68)': 68,
};

/** Échéances balayées, en semaines. Les 5 premières sont celles de l'écran Profil. */
const ECHEANCES = [4, 8, 12, 16, 24, 32, 40, 52, 64, 78, 104];

function profil(c: Corps): UserProfile {
  return recalcProfile({
    id: 'mesure', sex: c.sex, age: c.age, weight_kg: c.weight_kg, height_cm: c.height_cm,
    body_fat_pct: c.body_fat_pct, activity_level: 'moderate', neat_level: 'desk',
    training_days_per_week: c.seances,
    sports: [{ type: 'musculation', sessions_per_week: c.seances, minutes_per_session: 60 }],
    goal: c.goal, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as UserProfile);
}

function cible(c: Corps, semaines: number): GoalTarget {
  return {
    target_weight_kg: CIBLES[c.nom],
    target_date: addDaysStamp(AUJOURD_HUI, Math.round(semaines * 7)),
    start_weight_kg: c.weight_kg,
    start_date: AUJOURD_HUI,
  };
}

type Point = {
  semaines: number; date: string;
  kcalServies: number; deltaDemande: number;
  rythmeServi: number; arriveeJours: number | null;
  atteignable: boolean; bride: boolean; plancherMord: boolean;
};

/** Ce que le moteur ferait VRAIMENT pour cette échéance. Aucun calcul refait ici. */
function evalue(c: Corps, semaines: number): Point {
  const base = profil(c);
  const gt = cible(c, semaines);
  // Le profil doit PORTER l'objectif : le projecteur le relit pour simuler la suite.
  const p = recalcProfile({ ...base, goal_target: gt });
  const s = datedGoalStatus(
    gt, p, AUJOURD_HUI, p.tdee_kcal, planFloorKcal(p, AUJOURD_HUI), makeWeeklyProjector(p),
  )!;
  return {
    semaines, date: gt.target_date,
    kcalServies: p.target_kcal,
    deltaDemande: s.dailyKcalDelta,
    rythmeServi: s.safeWeeklyKg,
    arriveeJours: s.projectable ? daysBetween(AUJOURD_HUI, s.projectedDate) : null,
    atteignable: s.reachableByDate,
    bride: s.clamped,
    plancherMord: s.floorCapped,
  };
}

const csv = process.argv.includes('--csv');
const detail = process.argv.includes('--detail');

if (csv) console.log('corps,semaines,kcal_servies,delta,rythme_kg_sem,arrivee_jours,atteignable,bride,plancher');

console.log(`OBJECTIF DATÉ — ce que la date choisie change RÉELLEMENT (ancrage ${AUJOURD_HUI}).`);
console.log('⚠️ Lecture : « arrivée » est la date SIMULÉE par le moteur (TDEE qui baisse,');
console.log('   escalade de zone basse), pas une extrapolation de la pente du jour.\n');

/**
 * ⚠️ Ce qu'il NE faut PAS mesurer, et pourquoi — première version de ce script, corrigée.
 *
 * « L'arrivée est-elle monotone en la date choisie ? » donne 8 corps sur 8, et c'est un
 * FAUX POSITIF : sur un objectif confortable, choisir une date lointaine DOIT servir un
 * déficit plus doux et faire arriver plus tard. `F 60 → 57 kg` arrive J+52 à 8 semaines et
 * J+655 à 104 — 603 jours d'écart, et pourtant les deux sont honnêtes : elle a demandé une
 * trajectoire lente, elle l'obtient, et sa date est tenue dans les deux cas.
 * Le défaut A15 est plus étroit et plus grave.
 */

// Les 5 échéances RÉELLEMENT proposées par l'écran Profil (rangée ÉCHÉANCE).
const ECHEANCES_ECRAN = [4, 8, 12, 16, 24];

let sansOptionTenable = 0, dateQuiMent = 0, total = 0;
let pireGlissement = 0, pireCas = '';
const resume: string[] = [];

for (const c of CORPS) {
  const points = ECHEANCES.map((s) => evalue(c, s));
  total++;

  /**
   * LE DÉFAUT, énoncé exactement : quand la date ne tient pas, l'écran affiche « au rythme
   * sûr, Kyroz t'y amène plutôt vers le <projectedDate> ». Cette date est calculée AU
   * RYTHME SERVI AUJOURD'HUI — c'est-à-dire au rythme sûr maximal, puisque la date est
   * ambitieuse. Mais si l'utilisateur ADOPTE cette date (la puce de A14), elle cesse
   * d'être ambitieuse : le rythme requis retombe, le plancher ne mord plus, le déficit
   * servi diminue — et la date qu'on venait de lui promettre glisse.
   * ➡️ La date affichée n'est vraie que tant qu'on ne s'en sert pas.
   */
  let glissementMax = 0, ratees = 0;
  for (const p of points) {
    if (p.atteignable || p.arriveeJours == null) continue;
    ratees++;
    const semainesProjetees = p.arriveeJours / 7;
    const adopte = evalue(c, semainesProjetees);
    // Combien de jours l'arrivée recule-t-elle une fois la date adoptée ?
    const glissement = (adopte.arriveeJours ?? Infinity) - p.arriveeJours;
    if (Number.isFinite(glissement) && glissement > glissementMax) glissementMax = glissement;
  }
  if (glissementMax > 1) {
    dateQuiMent++;
    if (glissementMax > pireGlissement) { pireGlissement = glissementMax; pireCas = c.nom; }
  }

  // Parmi les 5 échéances de l'ÉCRAN, l'utilisateur a-t-il une option qui tienne ?
  const tenablesEcran = points.filter((p) => ECHEANCES_ECRAN.includes(p.semaines) && p.atteignable);
  if (!tenablesEcran.length) sansOptionTenable++;
  // Et hors écran, la première échéance tenable — celle que la puce A14 proposerait.
  const premiereTenable = points.find((p) => p.atteignable);

  resume.push(
    `${c.nom.padEnd(12)} | ${String(ratees).padStart(2)}/${points.length} échéances ratées` +
    ` | date promise qui GLISSE si adoptée : ${glissementMax > 1 ? `**+${Math.round(glissementMax)} j**` : 'non'}` +
    ` | tenable à l'écran : ${tenablesEcran.length ? `${tenablesEcran[0].semaines} sem` : `❌ aucune (la 1ʳᵉ est à ${premiereTenable ? premiereTenable.semaines + ' sem' : 'jamais'})`}`,
  );

  if (csv) {
    for (const p of points) {
      console.log([c.nom, p.semaines, p.kcalServies, p.deltaDemande, p.rythmeServi.toFixed(3),
        p.arriveeJours ?? '', p.atteignable, p.bride, p.plancherMord].join(','));
    }
  } else if (detail) {
    console.log(`── ${c.nom} → ${CIBLES[c.nom]} kg`);
    console.log('  échéance | kcal servies | delta | rythme kg/sem | arrivée simulée | verdict');
    for (const p of points) {
      const drap = [p.bride ? 'bridé' : '', p.plancherMord ? 'plancher' : ''].filter(Boolean).join('+') || '—';
      console.log(
        `  ${String(p.semaines).padStart(3)} sem | ${String(p.kcalServies).padStart(5)} kcal` +
        ` | ${String(p.deltaDemande).padStart(5)} | ${p.rythmeServi.toFixed(2).padStart(6)}` +
        ` | ${(p.arriveeJours != null ? `J+${p.arriveeJours}` : 'aucune').padStart(8)}` +
        ` | ${p.atteignable ? '✅ tenue' : '❌ ratée'} (${drap})`,
      );
    }
    console.log('');
  }
}

if (!csv) {
  console.log('── PAR CORPS');
  for (const l of resume) console.log(l);
  console.log(`\n── PRÉVALENCE (${total} objectifs × ${ECHEANCES.length} échéances)`);
  console.log(`la date PROMISE glisse dès qu'on l'adopte : ${dateQuiMent}/${total}` +
    (pireCas ? ` — pire cas ${pireCas}, +${Math.round(pireGlissement)} j` : ''));
  console.log(`aucune des 5 échéances de l'ÉCRAN n'est tenable : ${sansOptionTenable}/${total}`);

  /**
   * ── LE POINT FIXE EXISTE-T-IL ? ─────────────────────────────────────────────
   *
   * ⚠️ Cette section CONTREDIT une phrase d'`AGENTS.md` (fiche A15) : « Il n'existe
   * aucune date d'équilibre. » C'est faux, et la nuance décide du chantier.
   *
   * Ce qui ne converge pas, c'est UN SEUL aller-retour — la vérification que fait
   * l'écran aujourd'hui (`profil.tsx`, « on vérifie qu'elle est tenable avant de la
   * proposer ») : elle projette une date, constate qu'adoptée elle glisserait, et
   * renonce. En ITÉRANT l'adoption, la suite converge.
   *
   * L'arbitrage réel n'est donc pas « aucune date » contre « une date », mais :
   *   · la date d'ÉQUILIBRE — tenue, mais au rythme juste requis, donc lointaine ;
   *   · la date au RYTHME SÛR MAXIMAL — plus proche, mais qui ne se laisse pas
   *     « adopter » sans que la politique de rythme change (c'est la question A15).
   */
  console.log('\n── LE POINT FIXE (on itère l\'adoption au lieu de renoncer au 1er tour)');
  console.log('⚠️ Contredit la fiche A15 (« il n\'existe aucune date d\'équilibre ») — il en existe une.');
  console.log('corps        | équilibre : date · kcal | rythme sûr max : date · kcal | ce que ça coûte');
  for (const c of CORPS) {
    // Départ : la date projetée à l'échéance la plus courte de l'écran (rythme max).
    const depart = evalue(c, ECHEANCES_ECRAN[0]);
    if (depart.arriveeJours == null) { console.log(`${c.nom.padEnd(12)} | aucune projection`); continue; }

    let semaines = depart.arriveeJours / 7;
    let converge = false, tours = 0;
    for (; tours < 30; tours++) {
      const p = evalue(c, semaines);
      if (p.arriveeJours == null) break;
      const suivant = p.arriveeJours / 7;
      if (Math.abs(suivant - semaines) < 1 / 7) { converge = true; break; } // stable à 1 jour près
      semaines = suivant;
    }
    const eq = converge ? evalue(c, semaines) : null;
    const max = depart; // à l'échéance la plus courte, le rythme servi est déjà le maximum tenable

    if (!eq) { console.log(`${c.nom.padEnd(12)} | ne converge pas en 30 tours`); continue; }
    const joursGagnes = (eq.arriveeJours ?? 0) - (max.arriveeJours ?? 0);
    console.log(
      `${c.nom.padEnd(12)} | J+${String(eq.arriveeJours).padStart(3)} (${Math.round(semaines)} sem) · ${eq.kcalServies} kcal` +
      ` | J+${String(max.arriveeJours).padStart(3)} · ${max.kcalServies} kcal` +
      ` | ${joursGagnes > 0 ? `**${joursGagnes} j plus tôt**, ${eq.kcalServies - max.kcalServies} kcal/j de moins` : 'identique'}` +
      ` (${tours + 1} tours)`,
    );
  }
}
