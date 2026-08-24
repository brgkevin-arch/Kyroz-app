/**
 * ÉTAPE 0 du brief « profils à forte masse grasse » (2026-08-07) — cartographier
 * avant de corriger. **Le brief a été invalidé par cette mesure** ; le script reste
 * parce que c'est lui qui le montre, et qu'il faudra le rejouer avant de rouvrir
 * le sujet.
 *
 * Le brief supposait quatre étages fautifs chez un H de 150 kg à 45 %MG, et un
 * symptôme : « le plancher EA passe au-dessus de la cible, l'app rend un plan de
 * MAINTIEN à quelqu'un venu pour perdre ». Il prévenait lui-même que son algèbre
 * (NEAT 1,20, plancher EA nu, cap 25 % toujours actif) contredisait les données de
 * la campagne du 06/08. Mesuré sur le moteur — `computePlan` / `calculateMacros`,
 * jamais une réplique de leurs formules (CLAUDE.md §10) :
 *
 *  • le cas de référence reçoit un VRAI déficit (300 kcal/j en « Sèche », 644 si un
 *    objectif daté demande le maximum). Le symptôme redouté ne s'y produit pas.
 *  • le symptôme EXISTE — mais à l'autre bout de l'échelle. Le plancher d'énergie
 *    disponible vaut `30 × masse maigre`, donc il mord d'autant plus fort que la
 *    personne est MAIGRE et musclée. 30 corps plausibles reçoivent un déficit servi
 *    de ZÉRO, tous entre 8 et 24 %MG (médiane 14) — c'est-à-dire le public déclaré
 *    de Kyroz, pas les fortes adiposités.
 *
 * Sections : 0.1 constantes réelles · 0.2 balayage FFM × %MG × NEAT × sport ·
 * 0.3 cas de référence · 0.4 les 12 silhouettes (non-régression) · 0.5 plan servi.
 *
 *   npm run mesure:adiposite
 */
import { calculateBMR, calculateTDEE, calculateMacros, computePlan, katchEligible, melangeVersKatch, proteinTarget } from '../lib/tdee';
import { exerciseKcalPerDay } from '../lib/sport';
import { buildLocalPlan, baseDayTargets } from '../lib/planEngine';
import { FLAG_AUDIENCE } from '../lib/adaptRecipe';
import { fatFreeMassKg, BF_CHART_MAX, provenanceDemandee } from '../lib/safety';
import { MAX_DEFICIT_TDEE_RATIO } from '../lib/datedGoal';
import { BodyFatSource, MEAL_ORDER, NeatLevel, Sex, SportSession, UserProfile } from '../lib/types';

const T = '2026-08-07';
const NEATS: NeatLevel[] = ['desk', 'light', 'active', 'physical'];
const SPORTS_CIBLE = [0, 300, 600];

const r0 = (v: number) => Math.round(v);
const pct1 = (v: number) => `${(v * 100).toFixed(1)} %`;

/**
 * Séances qui produisent ~`cible` kcal/j pour ce poids. On INTERROGE le moteur
 * (`exerciseKcalPerDay`) au lieu d'inverser sa formule à la main : c'est la même
 * discipline que `deadlineLadder`, qui sonde le moteur plutôt que de le rejouer.
 */
function sportsPour(cible: number, weight_kg: number): { sports: SportSession[]; obtenu: number } {
  if (cible <= 0) return { sports: [], obtenu: 0 };
  let best: { sports: SportSession[]; obtenu: number } | null = null;
  for (let sessions = 1; sessions <= 7; sessions++) {
    for (let minutes = 15; minutes <= 180; minutes += 5) {
      const sports: SportSession[] = [{ type: 'course', sessions_per_week: sessions, minutes_per_session: minutes }];
      const obtenu = exerciseKcalPerDay(sports, weight_kg);
      if (!best || Math.abs(obtenu - cible) < Math.abs(best.obtenu - cible)) best = { sports, obtenu };
    }
  }
  return best!;
}

type Corps = {
  sex: Sex; age: number; weight_kg: number; height_cm: number;
  body_fat_pct: number; body_fat_source?: BodyFatSource;
  neat_level: NeatLevel; sports: SportSession[];
};

function profil(c: Corps, over: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'sweep', sex: c.sex, age: c.age, weight_kg: c.weight_kg, height_cm: c.height_cm,
    body_fat_pct: c.body_fat_pct, body_fat_source: c.body_fat_source,
    activity_level: 'moderate', training_days_per_week: 3,
    sports: c.sports, neat_level: c.neat_level, goal: 'cut', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
    max_prep_time_min: 30,
    ...over,
  };
}

/** Une ligne de mesure, pour un corps et une DEMANDE calorique donnée. */
function mesure(c: Corps, demande: 'cut_plat' | 'max_autorise') {
  const body = {
    sex: c.sex, age: c.age, weight_kg: c.weight_kg, height_cm: c.height_cm,
    body_fat_pct: c.body_fat_pct, body_fat_source: c.body_fat_source, sports: c.sports,
    neat_level: c.neat_level,
  };
  const tdee = calculateTDEE(body);
  const sportKcalPerDay = exerciseKcalPerDay(c.sports, c.weight_kg);
  // `cut_plat` = le delta figé de GOAL_CONFIG (−300). `max_autorise` = ce que sert
  // l'objectif daté hors de portée depuis A15 : le rythme sûr MAXIMAL, soit le
  // plafond de déficit de 25 % du TDEE.
  const kcalDeltaOverride = demande === 'cut_plat' ? -300 : -Math.round(MAX_DEFICIT_TDEE_RATIO * tdee);
  const m = calculateMacros(tdee, 'cut', body, { kcalDeltaOverride, sportKcalPerDay });
  const deficit = tdee - m.target_kcal;
  return {
    tdee, bmr: calculateBMR(body), sportKcalPerDay,
    ffm: fatFreeMassKg(body),
    // `melange` = zone R6 lissée (2026-08-24) : le BMR n'est ni Mifflin ni Katch purs.
    formule: (katchEligible(body) ? 'katch' : melangeVersKatch(body) > 0 ? 'melange' : 'mifflin') as 'katch' | 'melange' | 'mifflin',
    demande: m.clamp.requestedKcal, servi: m.target_kcal,
    candidats: m.clamp.candidates, source: m.clamp.source, mord: m.clamp.floorBinding,
    deficit, deficitPct: tdee > 0 ? deficit / tdee : 0,
    proteines: m.protein_g, macros: m,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(78));
console.log('0.1 — CONSTANTES RÉELLES (lues dans le code, pas dans le brief)');
console.log('═'.repeat(78));
console.log(`  plafond de déficit          MAX_DEFICIT_TDEE_RATIO = ${MAX_DEFICIT_TDEE_RATIO} (du TDEE)`);
console.log(`  plafond du sélecteur %MG    BF_CHART_MAX = H ${BF_CHART_MAX.male} % / F ${BF_CHART_MAX.female} %`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// 0.2 — BALAYAGE
// ═══════════════════════════════════════════════════════════════════════════
type Ligne = ReturnType<typeof mesure> & {
  ffmCible: number; mg: number; neat: NeatLevel; sportCible: number; provenance: string;
};

const lignes: Record<'cut_plat' | 'max_autorise', Ligne[]> = { cut_plat: [], max_autorise: [] };

for (let ffmCible = 40; ffmCible <= 110; ffmCible += 5) {
  for (let mg = 15; mg <= 50; mg += 5) {
    const weight_kg = ffmCible / (1 - mg / 100);
    for (const neat of NEATS) {
      for (const sportCible of SPORTS_CIBLE) {
        const { sports } = sportsPour(sportCible, weight_kg);
        // Les DEUX provenances : le brief suppose Katch dès que le %MG est saisi,
        // le code exige `measured`. Mesurer les deux, sinon on ne mesure qu'une
        // hypothèse. `undefined` = le parc réel (la question n'est posée qu'au-delà
        // du plafond du sélecteur, cf. provenanceDemandee).
        for (const src of [undefined, 'measured'] as const) {
          if (src === 'measured' && !provenanceDemandee('male', mg)) continue;
          const c: Corps = {
            sex: 'male', age: 40, weight_kg, height_cm: 175,
            body_fat_pct: mg, body_fat_source: src, neat_level: neat, sports,
          };
          for (const d of ['cut_plat', 'max_autorise'] as const) {
            lignes[d].push({
              ...mesure(c, d), ffmCible, mg, neat, sportCible,
              provenance: src ?? 'undefined (parc réel)',
            });
          }
        }
      }
    }
  }
}

for (const d of ['cut_plat', 'max_autorise'] as const) {
  const titre = d === 'cut_plat'
    ? '0.2 — BALAYAGE · objectif « Sèche » (delta figé −300 kcal/j)'
    : '0.2 — BALAYAGE · demande MAXIMALE autorisée (−25 % du TDEE, ce que sert un objectif daté hors de portée)';
  console.log('═'.repeat(78));
  console.log(titre);
  console.log('═'.repeat(78));

  // Les corps en INSUFFISANCE PONDÉRALE sont écartés : le moteur y annule le déficit
  // EXPRÈS (`deficitBlocked`, §6). Les compter comme un défaut ferait accuser le
  // garde-fou de faire son travail — et ils saturaient le « pire cas » de la v1 de ce
  // script (FFM 40 à 15 %MG = 47 kg pour 1 m 75, soit IMC 15,4).
  const tous = lignes[d].filter((l) => l.provenance.startsWith('undefined'));
  const L = tous.filter((l) => l.source !== 'underweight_maintenance');
  const ecartes = tous.length - L.length;
  const sous15 = L.filter((l) => l.deficitPct < 0.15);
  const sous10 = L.filter((l) => l.deficitPct < 0.10);
  const sous8 = L.filter((l) => l.deficitPct < 0.08);
  console.log(`  ${L.length} combinaisons plausibles (${ecartes} écartées : insuffisance pondérale, déficit annulé volontairement)`);
  console.log(`  déficit < 15 % : ${sous15.length} (${pct1(sous15.length / L.length)}) · < 10 % : ${sous10.length} (${pct1(sous10.length / L.length)}) · < 8 % : ${sous8.length} (${pct1(sous8.length / L.length)})`);

  const parSource = new Map<string, number>();
  for (const l of L) parSource.set(l.source, (parSource.get(l.source) ?? 0) + 1);
  console.log(`  plancher retenu : ${[...parSource].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  plancher CONTRAIGNANT (le servi > le demandé) : ${L.filter((l) => l.mord).length} / ${L.length}`);

  console.log('');
  console.log('  Déficit effectif (% du TDEE) par FFM, à %MG = 45 % — la colonne du cas de référence :');
  console.log('  NEAT      sport   ' + [40, 55, 70, 85, 100, 110].map((f) => `${f}kg`.padStart(7)).join(''));
  for (const neat of NEATS) {
    for (const sportCible of SPORTS_CIBLE) {
      const cells = [40, 55, 70, 85, 100, 110].map((f) => {
        const l = L.find((x) => x.neat === neat && x.sportCible === sportCible && x.ffmCible === f && x.mg === 45);
        return (l ? pct1(l.deficitPct) : '—').padStart(7);
      });
      console.log(`  ${neat.padEnd(9)} ${String(sportCible).padStart(4)}   ${cells.join('')}`);
    }
  }

  console.log('');
  console.log('  Où le déficit tombe sous 8 % du TDEE (hors insuffisance pondérale) :');
  if (sous8.length === 0) {
    console.log('    NULLE PART.');
  } else {
    const parMg = new Map<number, Ligne[]>();
    for (const l of sous8) parMg.set(l.mg, [...(parMg.get(l.mg) ?? []), l]);
    for (const [mg, ls] of [...parMg].sort((a, b) => a[0] - b[0])) {
      const ffms = [...new Set(ls.map((l) => l.ffmCible))].sort((a, b) => a - b);
      const imcs = ls.map((l) => l.tdee > 0 ? (l.ffmCible / (1 - mg / 100)) / (1.75 * 1.75) : 0);
      const sources = [...new Set(ls.map((l) => l.source))].join('/');
      console.log(`    %MG ${String(mg).padStart(2)} · FFM ${ffms[0]}–${ffms[ffms.length - 1]} kg · IMC ${Math.min(...imcs).toFixed(1)}–${Math.max(...imcs).toFixed(1)} · ${ls.length} cas · plancher ${sources}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 0.3 — CAS DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(78));
console.log('0.3 — CAS DE RÉFÉRENCE : homme, 150 kg, 45 %MG, NEAT sédentaire, sport ~300 kcal/j, perte');
console.log('═'.repeat(78));

const refSport = sportsPour(300, 150);
console.log(`  sport déclaré : course ${refSport.sports[0].sessions_per_week}×${refSport.sports[0].minutes_per_session} min → ${refSport.obtenu} kcal/j`);
console.log(`  la question de provenance est-elle posée à 45 %MG ? ${provenanceDemandee('male', 45) ? 'OUI (≥ 35 %)' : 'non'}`);
console.log('');

for (const src of [undefined, 'estimated', 'measured'] as const) {
  const c: Corps = {
    sex: 'male', age: 40, weight_kg: 150, height_cm: 175,
    body_fat_pct: 45, body_fat_source: src, neat_level: 'desk', sports: refSport.sports,
  };
  const p = computePlan(profil(c), T);
  const plat = mesure(c, 'cut_plat');
  const max = mesure(c, 'max_autorise');
  console.log(`  ── provenance = ${String(src)} → BMR ${plat.formule.toUpperCase()} ──`);
  console.log(`     BMR ${plat.bmr}  ·  masse maigre ${plat.ffm.toFixed(1)} kg  ·  TDEE ${plat.tdee}`);
  console.log(`     candidats de plancher : bmr ${plat.candidats.bmr} · EA ${plat.candidats.energy_availability} · min_kcal ${plat.candidats.min_kcal} · cap déficit ${plat.candidats.deficit_cap}`);
  console.log(`     [Sèche −300]  demandé ${plat.demande} → servi ${plat.servi} · plancher retenu « ${plat.source} » ${plat.mord ? '(CONTRAINT)' : '(ne mord pas)'} · déficit ${r0(plat.deficit)} kcal/j = ${pct1(plat.deficitPct)} du TDEE`);
  console.log(`     [max −25 %]   demandé ${max.demande} → servi ${max.servi} · plancher retenu « ${max.source} » ${max.mord ? '(CONTRAINT)' : '(ne mord pas)'} · déficit ${r0(max.deficit)} kcal/j = ${pct1(max.deficitPct)} du TDEE`);
  console.log(`     macros servies : ${p.profile.target_kcal} kcal · P ${p.profile.target_protein_g} g · G ${p.profile.target_carbs_g} g · L ${p.profile.target_fat_g} g`);
  console.log(`     protéines : ${proteinTarget({ sex: c.sex, age: c.age, weight_kg: c.weight_kg, height_cm: c.height_cm, body_fat_pct: c.body_fat_pct }, 'cut')} g = ${(p.profile.target_protein_g / 150).toFixed(2)} g/kg de POIDS · ${(p.profile.target_protein_g / plat.ffm).toFixed(2)} g/kg de masse maigre`);
  console.log(`     drapeaux : ${p.flags.join(', ') || '(aucun)'}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 0.4 — NON-RÉGRESSION : les 12 silhouettes du sélecteur
// ═══════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(78));
console.log('0.4 — LES 12 SILHOUETTES DU SÉLECTEUR (référence de non-régression)');
console.log('═'.repeat(78));
const SILHOUETTES: { sex: Sex; mg: number; poids: number; taille: number }[] = [
  ...[10, 15, 20, 25, 30, 35].map((mg) => ({ sex: 'male' as const, mg, poids: 82, taille: 178 })),
  ...[18, 23, 28, 33, 38, 43].map((mg) => ({ sex: 'female' as const, mg, poids: 65, taille: 165 })),
];
console.log('  sexe %MG  formule   BMR   TDEE  demandé  servi  plancher            déficit');
for (const s of SILHOUETTES) {
  const c: Corps = {
    sex: s.sex, age: 30, weight_kg: s.poids, height_cm: s.taille,
    body_fat_pct: s.mg, body_fat_source: undefined, neat_level: 'desk',
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  };
  const m = mesure(c, 'cut_plat');
  console.log(`  ${s.sex === 'male' ? 'H' : 'F'}  ${String(s.mg).padStart(3)}   ${m.formule.padEnd(8)} ${String(m.bmr).padStart(5)} ${String(m.tdee).padStart(6)} ${String(m.demande).padStart(8)} ${String(m.servi).padStart(6)}  ${m.source.padEnd(20)} ${String(r0(m.deficit)).padStart(4)} kcal (${pct1(m.deficitPct)})`);
}
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// 0.5 — AVAL : le plan est-il FAISABLE sur le cas de référence ? (brief §8.2)
// ═══════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(78));
console.log('0.5 — PLAN SERVI sur le cas de référence (bornes de adaptRecipe)');
console.log('═'.repeat(78));
{
  const c: Corps = {
    sex: 'male', age: 40, weight_kg: 150, height_cm: 175,
    body_fat_pct: 45, body_fat_source: undefined, neat_level: 'desk', sports: refSport.sports,
  };
  const p = computePlan(profil(c), T).profile;
  console.log(`  cible ${p.target_kcal} kcal · P ${p.target_protein_g} · G ${p.target_carbs_g} · L ${p.target_fat_g}`);
  let repas = 0;
  const parFlag = new Map<string, number>();
  let ecartKcal = 0; let jours = 0;
  for (const seed of [0, 1, 2, 3, 4]) {
    const plan = buildLocalPlan(p, seed);
    for (const m of plan.meals) {
      repas++;
      for (const f of (m.adapt_flags ?? [])) parFlag.set(f, (parFlag.get(f) ?? 0) + 1);
    }
    // ⚠️ Comparer à la cible DU JOUR, pas à `target_kcal` : le plan n'est plus
    // isocalorique depuis la répartition par volume (CLAUDE.md §6). Mesurer contre
    // une cible plate rendrait 10,9 % d'écart là où il n'y en a pas.
    const cibles = baseDayTargets(p, plan.days);
    plan.total_macros_per_day.forEach((tot, i) => {
      jours++;
      ecartKcal += Math.abs(tot.kcal - cibles[i]) / cibles[i];
    });
  }
  console.log(`  ${jours} jours · ${repas} repas servis (5 tirages)`);
  console.log(`  écart calorique moyen du jour vs cible DU JOUR : ${(100 * ecartKcal / jours).toFixed(2)} %`);
  if (parFlag.size === 0) console.log('  drapeaux d\'adaptation : AUCUN');
  else {
    for (const [f, n] of [...parFlag].sort((a, b) => b[1] - a[1])) {
      const aud = (FLAG_AUDIENCE as Record<string, string>)[f] ?? '?';
      console.log(`  ${f.padEnd(24)} ${String(n).padStart(4)} / ${repas} repas (${pct1(n / repas)}) · public « ${aud} »`);
    }
  }
}
console.log('');
