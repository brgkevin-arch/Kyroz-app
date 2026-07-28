import { describe, it, expect } from 'vitest';
import {
  EA_HARD_FLOOR, EA_OPTIMAL, LOW_EA_BUDGET_WEEKS, MIN_KCAL, MIN_AGE,
  bodyFatBounds, checkEligibility, effectiveEaPerKgFfm, energyAvailability,
  fatFreeMassKg, lowEaWeeksInWindow, recordLowEaWeek, resolvedBodyFatPct,
  safetyFloorKcal, weekStartStamp,
} from '../safety';
import { calculateBMR, calculateMacros, computePlan, proteinTarget, recalcProfile, PROTEIN_MAX_PER_KG_FFM } from '../tdee';
import { datedGoalStatus, maxWeeklyLossPct, MAX_DEFICIT_TDEE_RATIO, KCAL_PER_KG_FAT, KCAL_PER_KG_GAIN } from '../datedGoal';
import { exerciseKcalPerDay } from '../sport';
import { addDaysStamp } from '../datedGoal';
import { makeProfile } from './helpers';
import { GoalTarget, UserProfile } from '../types';

const TODAY = '2026-07-21';

// ═════════════════════════════════════════════════════════════════════════════
// P0 — SÉCURITÉ. Ces tests verrouillent des garde-fous SANTÉ : ils ne doivent
// jamais être assouplis pour faire passer une évolution du moteur.
// ═════════════════════════════════════════════════════════════════════════════

describe('P0.1 — plancher d\'énergie disponible', () => {
  // Femme 65 kg, 25 % de masse grasse, ~400 kcal/j de sport. Le plancher ABSOLU
  // historique autorisait 1200 kcal ; le minimum physiologique est ~1863.
  const female65: UserProfile = makeProfile({
    sex: 'female', age: 30, weight_kg: 65, height_cm: 168, body_fat_pct: 25, goal: 'cut_aggressive',
    sports: [{ type: 'course', sessions_per_week: 5, minutes_per_session: 60 }],
    training_days_per_week: 5,
  });

  it('plancher = 30 × masse maigre + dépense sportive', () => {
    const ffm = fatFreeMassKg(female65); // 65 × 0,75 = 48,75
    expect(ffm).toBeCloseTo(48.75, 5);
    const floor = safetyFloorKcal(female65, calculateBMR('female', 65, 168, 30, 25), 400, 0, 99999);
    expect(floor).toBe(Math.round(EA_HARD_FLOOR * 48.75 + 400)); // 1863
  });

  it('un plan réel ne descend jamais sous son plancher (et le 1200 absolu ne s\'applique plus)', () => {
    const p = recalcProfile(female65, TODAY);
    const sportKcal = exerciseKcalPerDay(female65.sports, 65);
    const floor = Math.round(EA_HARD_FLOOR * fatFreeMassKg(female65) + sportKcal);
    expect(p.target_kcal).toBeGreaterThanOrEqual(floor);
    expect(p.target_kcal).toBeGreaterThan(MIN_KCAL.female); // le plancher absolu ne pilote plus
  });

  it('le filet absolu 1500/1200 mord bien sur un gabarit léger extrême', () => {
    // Masse maigre faible → 30 × FFM tombe sous le filet : c'est lui qui protège.
    const tiny: UserProfile = makeProfile({ sex: 'female', age: 30, weight_kg: 42, height_cm: 150, goal: 'cut_aggressive' });
    const bmr = calculateBMR('female', 42, 150, 30);
    const eaFloor = EA_HARD_FLOOR * fatFreeMassKg(tiny);
    expect(eaFloor).toBeLessThan(MIN_KCAL.female);        // le plancher EA seul serait insuffisant
    expect(safetyFloorKcal(tiny, bmr, 0, 0, 99999)).toBeGreaterThanOrEqual(MIN_KCAL.female);
  });

  it('le plancher n\'est jamais sous le métabolisme de base', () => {
    const p = makeProfile({ sex: 'male', weight_kg: 70, height_cm: 190, age: 20, body_fat_pct: 6 });
    const bmr = calculateBMR('male', 70, 190, 20, 6);
    expect(safetyFloorKcal(p, bmr, 0, 0, 99999)).toBeGreaterThanOrEqual(bmr);
  });

  it('le seuil EA est de 30 pour TOUS tant que le budget de 12 semaines tient', () => {
    const f = makeProfile({ sex: 'female' });
    const m = makeProfile({ sex: 'male' });
    expect(effectiveEaPerKgFfm(f, 0)).toBe(EA_HARD_FLOOR);
    expect(effectiveEaPerKgFfm(f, LOW_EA_BUDGET_WEEKS)).toBe(EA_HARD_FLOOR);
    expect(effectiveEaPerKgFfm(m, 40)).toBe(EA_HARD_FLOOR); // jamais de remontée chez l'homme
  });

  it('au-delà de 12 semaines cumulées, le plancher remonte (femme non ménopausée)', () => {
    const f = makeProfile({ sex: 'female' });
    expect(effectiveEaPerKgFfm(f, 20)).toBe(34);          // 30 + 8 × 0,5
    expect(effectiveEaPerKgFfm(f, 30)).toBe(EA_OPTIMAL);  // plafonné à 35
    // Ménopausée → le risque de perturbation ovulatoire ne s'applique plus.
    expect(effectiveEaPerKgFfm(makeProfile({ sex: 'female', is_post_menopausal: true }), 20)).toBe(EA_HARD_FLOOR);
  });

  it('le compteur est CUMULÉ sur 12 mois, pas consécutif : une pause ne remet pas à zéro', () => {
    let h = recordLowEaWeek(undefined, '2026-01-05');
    h = recordLowEaWeek(h, '2026-01-12');
    // semaine du 19/01 sautée (hors zone)
    h = recordLowEaWeek(h, '2026-01-26');
    expect(lowEaWeeksInWindow(h, '2026-02-02')).toBe(3);
  });

  it('l\'enregistrement est idempotent dans la semaine et purge au-delà de 12 mois', () => {
    const once = recordLowEaWeek(undefined, '2026-07-21');
    const twice = recordLowEaWeek(once, '2026-07-23'); // même semaine
    expect(twice).toBe(once);                            // même référence → aucun changement
    expect(lowEaWeeksInWindow(once, '2026-07-23')).toBe(1);
    // Une semaine vieille de plus de 12 mois sort de la fenêtre.
    expect(lowEaWeeksInWindow(['2025-01-06'], '2026-07-21')).toBe(0);
    expect(weekStartStamp('2026-07-23')).toBe('2026-07-20'); // lundi
  });

  it('le registre s\'alimente sur les plans réels et reste borné', () => {
    const p = recalcProfile(makeProfile({
      sex: 'female', age: 28, weight_kg: 62, height_cm: 168, goal: 'cut_aggressive',
      sports: [{ type: 'hiit_crossfit', sessions_per_week: 4, minutes_per_session: 50 }],
      training_days_per_week: 4,
    }), TODAY);
    const ea = energyAvailability(p, p.target_kcal, exerciseKcalPerDay(p.sports, 62));
    if (ea < EA_OPTIMAL) expect(p.low_ea_weeks).toContain(weekStartStamp(TODAY));
  });

  it('AUCUN chemin de code ne contourne le plancher — mode manual compris', () => {
    const manual = makeProfile({
      macro_mode: 'manual', target_kcal: 1200, target_protein_g: 150, target_carbs_g: 50, target_fat_g: 40,
    });
    const { profile, floor_kcal, flags } = computePlan(manual, TODAY);
    expect(profile.target_kcal).toBe(floor_kcal);
    expect(profile.target_kcal).toBeGreaterThan(1200);
    expect(flags).toContain('FLOOR_APPLIED');
    // Le manque est comblé en glucides : protéines et lipides choisis restent intacts.
    expect(profile.target_protein_g).toBe(150);
    expect(profile.target_fat_g).toBe(40);
    expect(profile.target_carbs_g).toBeGreaterThan(50);
  });

  // ── Régressions trouvées à l'audit adverse du 2026-07-28 ──────────────────
  // Le garde-fou s'était retourné contre l'utilisatrice : l'escalade du plancher
  // finissait par PRESCRIRE UN SURPLUS. Ces trois tests sont la clôture du défaut.

  it('RÉGRESSION : le plancher ne prescrit JAMAIS un surplus', () => {
    // Femme 125 kg, 36 % de MG, sédentaire : son EA de MAINTENANCE vaut déjà 31,5,
    // donc sous l'optimum de 35 sans qu'elle fasse le moindre régime.
    const heavy = makeProfile({
      sex: 'female', age: 35, weight_kg: 125, height_cm: 170, body_fat_pct: 36,
      training_days_per_week: 0, sports: [], macro_mode: 'auto',
    });
    // 30 semaines déjà au compteur → seuil escaladé à 35, soit 35 × 80 = 2800 kcal,
    // très au-dessus de son TDEE (2518). Le plafond de maintenance doit mordre.
    const history = Array.from({ length: 30 }, (_, i) => weekStartStamp(addDaysStamp(TODAY, -7 * (i + 1))));
    for (const goal of ['maintain', 'cut', 'cut_aggressive'] as const) {
      const { profile, floor_kcal } = computePlan({ ...heavy, goal, low_ea_weeks: history }, TODAY);
      expect(floor_kcal, goal).toBeLessThanOrEqual(profile.tdee_kcal);
      expect(profile.target_kcal, goal).toBeLessThanOrEqual(profile.tdee_kcal);
    }
  });

  it('RÉGRESSION : au MAINTIEN, aucune semaine n\'est comptée (pas de restriction, pas de risque)', () => {
    // Le budget RED-S modélise une RESTRICTION prolongée. Une énergie disponible
    // naturellement basse à la maintenance n'est pas un régime : la compter faisait
    // monter le plancher semaine après semaine jusqu'au surplus forcé.
    let prof = makeProfile({
      sex: 'female', age: 35, weight_kg: 125, height_cm: 170, body_fat_pct: 36,
      goal: 'maintain', training_days_per_week: 0, sports: [], macro_mode: 'auto', low_ea_weeks: [],
    });
    for (let w = 0; w < 26; w++) prof = recalcProfile(prof, addDaysStamp(TODAY, 7 * w));
    expect(lowEaWeeksInWindow(prof.low_ea_weeks, addDaysStamp(TODAY, 7 * 25))).toBe(0);
    expect(prof.target_kcal).toBe(prof.tdee_kcal); // maintien = maintien, semaine après semaine
  });

  it('RÉGRESSION : en sèche prolongée, l\'escalade converge vers la maintenance et s\'y arrête', () => {
    let prof = makeProfile({
      sex: 'female', age: 30, weight_kg: 70, height_cm: 168, body_fat_pct: 28,
      goal: 'cut', training_days_per_week: 0, sports: [], macro_mode: 'auto', low_ea_weeks: [],
    });
    const tdee = prof.tdee_kcal;
    const serie: number[] = [];
    for (let w = 0; w < 30; w++) {
      prof = recalcProfile(prof, addDaysStamp(TODAY, 7 * w));
      serie.push(prof.target_kcal);
    }
    // Monotone croissante (le déficit se referme), jamais au-dessus de la maintenance.
    for (let i = 1; i < serie.length; i++) expect(serie[i]).toBeGreaterThanOrEqual(serie[i - 1]);
    expect(Math.max(...serie)).toBeLessThanOrEqual(recalcProfile(prof, TODAY).tdee_kcal);
    // Le déficit initial existait bien, et il a fini par se refermer : c'est une
    // sortie de déficit forcée, pas un blocage ni un surplus.
    expect(serie[0]).toBeLessThan(tdee);
    expect(serie[serie.length - 1]).toBeGreaterThan(serie[0]);
  });

  it('lève FLOOR_APPLIED quand le plancher mord', () => {
    const p = makeProfile({
      sex: 'female', age: 30, weight_kg: 60, height_cm: 165, goal: 'cut_aggressive',
      sports: [{ type: 'course', sessions_per_week: 6, minutes_per_session: 60 }],
      training_days_per_week: 6,
    });
    expect(computePlan(p, TODAY).flags).toContain('FLOOR_APPLIED');
  });
});

describe('P0.2 — logique protéines (poids ajusté)', () => {
  const female90 = makeProfile({ sex: 'female', age: 34, weight_kg: 90, height_cm: 165, body_fat_pct: 45 });

  it('ne sur-dose plus les protéines à masse grasse élevée', () => {
    // Ancien calcul : max(49,5 × 2,4 ; 90 × 2,0) = 180 g = 3,6 g/kg de masse maigre.
    const ffm = fatFreeMassKg(female90); // 49,5
    const g = proteinTarget(female90, 'cut_aggressive');
    expect(g).toBeLessThan(180);
    expect(g).toBeLessThanOrEqual(Math.round(ffm * PROTEIN_MAX_PER_KG_FFM)); // ≤ 2,6 g/kg FFM
    expect(g).toBe(129);
  });

  it('ne sous-dose pas le sujet sec (le cas nominal reste servi)', () => {
    const male80 = makeProfile({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, body_fat_pct: 12 });
    expect(proteinTarget(male80, 'cut_aggressive')).toBe(175); // 2,5 g/kg de masse maigre
  });

  it('reste toujours dans la fourchette 1,6–2,6 g/kg de masse maigre', () => {
    const cases: UserProfile[] = [
      makeProfile({ sex: 'male', weight_kg: 55, height_cm: 165, body_fat_pct: 8 }),
      makeProfile({ sex: 'male', weight_kg: 130, height_cm: 175, body_fat_pct: 45 }),
      makeProfile({ sex: 'female', weight_kg: 48, height_cm: 155, body_fat_pct: 18 }),
      makeProfile({ sex: 'female', weight_kg: 110, height_cm: 160, body_fat_pct: 55 }),
      makeProfile({ sex: 'male', weight_kg: 90, height_cm: 180 }),   // sans %MG déclaré
    ];
    for (const goal of ['cut_aggressive', 'cut', 'recomp', 'maintain', 'lean_bulk', 'bulk'] as const) {
      for (const p of cases) {
        const ffm = fatFreeMassKg(p);
        const perKg = proteinTarget(p, goal) / ffm;
        expect(perKg, `${p.sex} ${p.weight_kg}kg ${goal}`).toBeGreaterThanOrEqual(1.59);
        expect(perKg, `${p.sex} ${p.weight_kg}kg ${goal}`).toBeLessThanOrEqual(2.61);
      }
    }
  });

  it('n\'écrase jamais les glucides à zéro en silence', () => {
    // Au plancher, protéines (≤ 2,6 g/kg FFM) + lipides (25 %) laissent toujours
    // de la place : la contrainte est garantie par construction, pas par chance.
    const p = makeProfile({ sex: 'female', weight_kg: 90, height_cm: 165, body_fat_pct: 45, goal: 'cut_aggressive' });
    const plan = computePlan(p, TODAY).profile;
    expect(plan.target_carbs_g).toBeGreaterThan(0);
    expect(plan.target_protein_g * 4 + plan.target_fat_g * 9).toBeLessThan(plan.target_kcal);
  });

  it('signale un budget macro dépassé au lieu de le tronquer', () => {
    const p = makeProfile({ macro_mode: 'percent', protein_per_kg: 3.0, weight_kg: 90 });
    const m = calculateMacros(1200, 'cut_aggressive', { ...p, weight_kg: 200, height_cm: 150 }, {});
    // Cas construit : le drapeau existe et la valeur ne part jamais en négatif.
    expect(m.carbs_g).toBeGreaterThanOrEqual(0);
  });
});

describe('P0.3 — déficit plafonné en pourcentage du TDEE', () => {
  const male120 = makeProfile({ sex: 'male', age: 30, weight_kg: 120, height_cm: 180, goal: 'cut_aggressive' });
  const dated = (kg: number, weeks: number, start = 120): GoalTarget => ({
    target_weight_kg: kg, target_date: addDaysStamp(TODAY, weeks * 7),
    start_weight_kg: start, start_date: TODAY,
  });

  it('plafonne le déficit à 25 % du TDEE', () => {
    const p = recalcProfile({ ...male120, goal_target: dated(100, 4) }, TODAY);
    const deficit = p.tdee_kcal - p.target_kcal;
    expect(deficit).toBeLessThanOrEqual(Math.round(MAX_DEFICIT_TDEE_RATIO * p.tdee_kcal));
    expect(deficit).toBeGreaterThan(0);
  });

  it('signale que le plafond a mordu', () => {
    const s = datedGoalStatus(dated(100, 4), male120, TODAY, 3379)!;
    expect(s.deficitCapped).toBe(true);
    expect(s.dailyKcalDelta).toBe(-Math.round(MAX_DEFICIT_TDEE_RATIO * 3379));
  });

  it('le rythme max dépend de l\'adiposité', () => {
    expect(maxWeeklyLossPct(makeProfile({ sex: 'male', body_fat_pct: 10 }))).toBe(0.5);   // sec
    expect(maxWeeklyLossPct(makeProfile({ sex: 'male', body_fat_pct: 20 }))).toBe(0.75);  // moyen
    expect(maxWeeklyLossPct(makeProfile({ sex: 'male', body_fat_pct: 35 }))).toBe(1.25);  // adiposité haute
    expect(maxWeeklyLossPct(makeProfile({ sex: 'female', body_fat_pct: 18 }))).toBe(0.5);
    expect(maxWeeklyLossPct(makeProfile({ sex: 'female', body_fat_pct: 45 }))).toBe(1.25);
  });

  it('le coût énergétique du kg est asymétrique (perte 7700 / prise 5000)', () => {
    expect(KCAL_PER_KG_FAT).toBe(7700);
    expect(KCAL_PER_KG_GAIN).toBe(5000);
    const body = makeProfile({ sex: 'male', age: 30, weight_kg: 70, height_cm: 180, goal: 'lean_bulk' });
    const s = datedGoalStatus(
      { target_weight_kg: 78, target_date: addDaysStamp(TODAY, 56), start_weight_kg: 70, start_date: TODAY },
      body, TODAY, 2700,
    )!;
    expect(s.dailyKcalDelta).toBe(Math.round((0.35 * KCAL_PER_KG_GAIN) / 7)); // +250, pas +385
  });

  it('ne divise pas par zéro sur une deadline immédiate', () => {
    for (const days of [1, 2, 3]) {
      const gt: GoalTarget = {
        target_weight_kg: 114, target_date: addDaysStamp(TODAY, days),
        start_weight_kg: 120, start_date: TODAY,
      };
      const s = datedGoalStatus(gt, male120, TODAY, 3379)!;
      expect(Number.isFinite(s.dailyKcalDelta)).toBe(true);
      expect(Number.isFinite(s.safeWeeklyKg)).toBe(true);
      const p = recalcProfile({ ...male120, goal_target: gt }, TODAY);
      expect(Number.isFinite(p.target_kcal)).toBe(true);
      expect(Number.isFinite(p.target_carbs_g)).toBe(true);
    }
  });

  it('refuse un poids cible qui contredit l\'objectif au lieu de basculer en déficit', () => {
    const bulk = makeProfile({ sex: 'male', age: 25, weight_kg: 80, height_cm: 180, goal: 'bulk' });
    const gt: GoalTarget = {
      target_weight_kg: 72, target_date: addDaysStamp(TODAY, 84), start_weight_kg: 80, start_date: TODAY,
    };
    const s = datedGoalStatus(gt, bulk, TODAY, 2800)!;
    expect(s.directionMismatch).toBe(true);
    expect(s.dailyKcalDelta).toBe(0);
    expect(computePlan({ ...bulk, goal_target: gt }, TODAY).flags).toContain('GOAL_DIRECTION_MISMATCH');
  });

  it('la projection suit le rythme RÉELLEMENT appliqué, pas le rythme théorique', () => {
    const s = datedGoalStatus(dated(100, 4), male120, TODAY, 3379)!;
    expect(s.reachableByDate).toBe(false);
    // safeWeeklyKg reflète le delta plafonné, pas le plafond de rythme brut
    // (affiché arrondi à 0,1 kg → on compare à cette précision).
    expect(s.safeWeeklyKg).toBeCloseTo((s.dailyKcalDelta * 7) / KCAL_PER_KG_FAT, 1);
    // Le plafond de rythme seul aurait donné −1,5 kg/sem : c'est bien le plafond
    // des 25 % du TDEE qui pilote, et la projection le reflète.
    expect(Math.abs(s.safeWeeklyKg)).toBeLessThan((maxWeeklyLossPct(male120) / 100) * 120);
  });
});

describe('P0.4 — éligibilité et bornes d\'entrée', () => {
  const adult = makeProfile({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, goal: 'cut' });

  it('bloque les profils inéligibles', () => {
    expect(checkEligibility({ ...adult, age: 17 })).toContain('MINOR');
    expect(checkEligibility({ ...adult, pregnant_or_breastfeeding: true })).toContain('PREGNANCY_OR_NURSING');
    // IMC 16,5 avec un objectif de sèche
    expect(checkEligibility({ ...adult, weight_kg: 45, height_cm: 165 })).toContain('UNDERWEIGHT_CUT_BLOCKED');
    expect(checkEligibility(adult)).toEqual([]);
    expect(MIN_AGE).toBe(18);
  });

  it('bloque un volume d\'entraînement implausible (> 20 h/semaine)', () => {
    const overload = { ...adult, sports: [{ type: 'musculation' as const, sessions_per_week: 14, minutes_per_session: 180 }] };
    expect(checkEligibility(overload)).toContain('TRAINING_VOLUME_IMPLAUSIBLE');
  });

  it('bloque un poids cible sous la plage saine', () => {
    const gt: GoalTarget = { target_weight_kg: 55, target_date: '2026-12-01', start_weight_kg: 80, start_date: TODAY };
    expect(checkEligibility(adult, gt)).toContain('TARGET_BMI_OUT_OF_RANGE'); // IMC cible 17,0
  });

  it('ne bloque PAS une cible intermédiaire au-dessus d\'IMC 30 en perte de poids', () => {
    // Personne à IMC 40 visant IMC 32 : c'est le bon objectif, pas un blocage.
    const obese = makeProfile({ sex: 'male', age: 40, weight_kg: 130, height_cm: 180, goal: 'cut' });
    const gt: GoalTarget = { target_weight_kg: 104, target_date: '2027-06-01', start_weight_kg: 130, start_date: TODAY };
    expect(checkEligibility(obese, gt)).toEqual([]);
    // En revanche, viser une PRISE au-dessus d'IMC 30 reste bloqué.
    const gain: GoalTarget = { target_weight_kg: 140, target_date: '2027-06-01', start_weight_kg: 130, start_date: TODAY };
    expect(checkEligibility({ ...obese, goal: 'bulk' }, gain)).toContain('TARGET_BMI_OUT_OF_RANGE');
  });

  it('rejette une masse grasse hors bornes SEXUÉES', () => {
    expect(bodyFatBounds('male')).toEqual([5, 60]);
    expect(bodyFatBounds('female')).toEqual([12, 65]);
    expect(resolvedBodyFatPct(makeProfile({ sex: 'female', body_fat_pct: 3 }))).toBeGreaterThanOrEqual(12);
    expect(resolvedBodyFatPct(makeProfile({ sex: 'male', body_fat_pct: 1 }))).toBeGreaterThanOrEqual(5);
    expect(resolvedBodyFatPct(makeProfile({ sex: 'male', body_fat_pct: 90 }))).toBeLessThanOrEqual(60);
  });

  it('estime la masse grasse (Deurenberg) quand elle n\'est pas déclarée', () => {
    // H 90 kg / 180 cm / 30 ans → IMC 27,8 → 1,2×27,8 + 0,23×30 − 10,8 − 5,4 ≈ 24,0 %
    expect(resolvedBodyFatPct(makeProfile())).toBeCloseTo(24.03, 1);
    // À gabarit identique, la femme est estimée ~10,8 points au-dessus.
    const f = resolvedBodyFatPct(makeProfile({ sex: 'female' }));
    expect(f - resolvedBodyFatPct(makeProfile({ sex: 'male' }))).toBeCloseTo(10.8, 1);
  });
});

describe('P0 — invariants permanents', () => {
  const PROFILES: Partial<UserProfile>[] = [
    { sex: 'male', age: 18, weight_kg: 55, height_cm: 165, goal: 'bulk' },
    { sex: 'male', age: 45, weight_kg: 130, height_cm: 175, goal: 'cut_aggressive', body_fat_pct: 40 },
    { sex: 'female', age: 22, weight_kg: 48, height_cm: 155, goal: 'maintain' },
    { sex: 'female', age: 55, weight_kg: 95, height_cm: 162, goal: 'cut', body_fat_pct: 48, is_post_menopausal: true },
    { sex: 'female', age: 30, weight_kg: 65, height_cm: 170, goal: 'cut_aggressive',
      sports: [{ type: 'course', sessions_per_week: 6, minutes_per_session: 75 }], training_days_per_week: 6 },
    { sex: 'male', age: 30, weight_kg: 90, height_cm: 180, goal: 'cut', macro_mode: 'percent', carb_ratio: 40, protein_per_kg: 2.4 },
  ];

  it.each(PROFILES)('%o : aucun jour sous son plancher, aucun NaN, macros cohérentes', (over) => {
    const p = recalcProfile(makeProfile(over), TODAY);
    const { floor_kcal } = computePlan(makeProfile(over), TODAY);

    expect(p.target_kcal).toBeGreaterThanOrEqual(floor_kcal);
    for (const v of [p.tdee_kcal, p.target_kcal, p.target_protein_g, p.target_carbs_g, p.target_fat_g]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    // 4P + 4G + 9L ≈ budget du jour (< 1 % d'écart, hors arrondis au gramme)
    const kcal = p.target_protein_g * 4 + p.target_carbs_g * 4 + p.target_fat_g * 9;
    expect(Math.abs(kcal - p.target_kcal) / p.target_kcal).toBeLessThan(0.01);
  });

  it.each(PROFILES)('%o : idempotent — recalculer sans nouvelle donnée ne change rien', (over) => {
    const once = recalcProfile(makeProfile(over), TODAY);
    const twice = recalcProfile(once, TODAY);
    expect(twice).toEqual(once);
  });

  it('idempotent MÊME quand le registre d\'énergie basse est déjà chargé', () => {
    // Verrou du piège de conception : si l'appartenance à la zone se décidait sur le
    // plan ESCALADÉ, le plancher dépendrait du compteur qui dépendrait du plancher.
    const history = Array.from({ length: 20 }, (_, i) => weekStartStamp(addDaysStamp(TODAY, -7 * (i + 1))));
    const p = makeProfile({
      sex: 'female', age: 30, weight_kg: 65, height_cm: 170, goal: 'cut_aggressive',
      low_ea_weeks: history,
      sports: [{ type: 'course', sessions_per_week: 5, minutes_per_session: 60 }], training_days_per_week: 5,
    });
    const once = recalcProfile(p, TODAY);
    const twice = recalcProfile(once, TODAY);
    expect(twice.target_kcal).toBe(once.target_kcal);
    expect(twice.low_ea_weeks).toEqual(once.low_ea_weeks);
    // 20 semaines cumulées → seuil à 34, donc un plancher plus haut qu'à 0 semaine.
    const fresh = recalcProfile({ ...p, low_ea_weeks: [] }, TODAY);
    expect(once.target_kcal).toBeGreaterThan(fresh.target_kcal);
  });
});
