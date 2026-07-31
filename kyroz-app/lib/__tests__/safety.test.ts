import { describe, it, expect } from 'vitest';
import {
  EA_HARD_FLOOR, EA_OPTIMAL, LOW_EA_BUDGET_WEEKS, MIN_KCAL, MIN_AGE, UNDERWEIGHT_BMI,
  bmiOf, bodyFatBounds, checkEligibility, deficitBlocked, effectiveEaPerKgFfm, energyAvailability,
  fatFreeMassKg, lowEaWeeksForFloor, lowEaWeeksInWindow, markLowEaWeek, readLowEaRegistry,
  resolvedBodyFatPct, safetyFloorKcal, settleLowEaExposure, weekStartStamp,
  countsAsLowEaWeek, EA_COUNT_TOLERANCE, LOW_EA_STEP_PER_WEEK,
  ATYPICAL_BF_BELOW, isAtypicalBodyFat, bodyFatConcern,
} from '../safety';
import { readFileSync } from 'node:fs';
import { calculateBMR, calculateMacros, computePlan, macrosPercent, proteinTarget, recalcProfile, PROTEIN_MAX_PER_KG_FFM, bodyFatTdeeImpact } from '../tdee';
import { datedGoalStatus, maxWeeklyLossPct, MAX_DEFICIT_TDEE_RATIO, KCAL_PER_KG_FAT, KCAL_PER_KG_GAIN } from '../datedGoal';
import { exerciseKcalPerDay } from '../sport';
import { reconcileCloudLowEaWeeks } from '../syncGuard';
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
    // Trois épisodes distincts : la semaine du 19/01 est hors zone, donc l'exposition
    // se referme (`since` à null) et ne se rattrape pas — mais les semaines vécues
    // avant restent au compteur.
    let h = markLowEaWeek(readLowEaRegistry(undefined), '2026-01-05', true);
    h = markLowEaWeek(h, '2026-01-12', true);
    h = markLowEaWeek(h, '2026-01-19', false);
    h = markLowEaWeek(settleLowEaExposure(h, '2026-01-26'), '2026-01-26', true);
    expect(lowEaWeeksInWindow(h, '2026-02-02')).toBe(3);
  });

  it('l\'enregistrement est idempotent dans la semaine et purge au-delà de 12 mois', () => {
    const once = markLowEaWeek(readLowEaRegistry(undefined), '2026-07-21', true);
    const twice = markLowEaWeek(once, '2026-07-23', true); // même semaine
    expect(twice).toBe(once);                              // même référence → aucun changement
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
    if (ea < EA_OPTIMAL) expect(readLowEaRegistry(p.low_ea_weeks).weeks).toContain(weekStartStamp(TODAY));
  });

  it('AUCUN chemin de code ne contourne le plancher — mode manual compris', () => {
    const manual = makeProfile({
      macro_mode: 'manual', target_kcal: 1200, target_protein_g: 150, target_carbs_g: 50, target_fat_g: 40,
    });
    const { profile, floor_kcal, flags } = computePlan(manual, TODAY);
    // Au plancher à un gramme de glucides près (la recharge est quantifiée).
    expect(profile.target_kcal).toBeGreaterThanOrEqual(floor_kcal);
    expect(profile.target_kcal - floor_kcal).toBeLessThan(4);
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

  // ── Régressions trouvées à l'audit adverse nº 2 (2026-07-28) ──────────────

  it('RÉGRESSION : le registre se VIDE une fois ramenée à la maintenance', () => {
    // La restriction se jugeait sur une cible virtuelle non escaladée : une fois
    // l'escalade arrivée au plafond de maintenance, l'utilisatrice ne subissait
    // plus AUCUN déficit mais sa semaine continuait d'être comptée. Le compteur
    // saturait et la verrouillait à « déficit zéro » à vie.
    let prof = makeProfile({
      sex: 'female', age: 35, weight_kg: 135, height_cm: 168, body_fat_pct: 45,
      goal: 'cut', macro_mode: 'auto', low_ea_weeks: [],
      sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }],
      training_days_per_week: 3,
    });
    for (let w = 0; w < 40; w++) prof = recalcProfile(prof, addDaysStamp(TODAY, 7 * w));
    const last = addDaysStamp(TODAY, 7 * 39);
    // Servie à la maintenance → plus de restriction → le compteur cesse de croître
    // et redescend à mesure que les anciennes semaines sortent de la fenêtre.
    expect(prof.target_kcal).toBe(prof.tdee_kcal);
    expect(lowEaWeeksInWindow(prof.low_ea_weeks, last)).toBeLessThan(40);
    // Une fois la fenêtre de 12 mois écoulée, les anciennes semaines ont disparu :
    // le plancher redescend à 30, un déficit redevient possible, et le cycle
    // recommence proprement (au plus la semaine courante fraîchement comptée).
    const far = addDaysStamp(TODAY, 7 * 39 + 400);
    const after = recalcProfile(prof, far);
    expect(lowEaWeeksInWindow(after.low_ea_weeks, far)).toBeLessThanOrEqual(1);
    expect(after.target_kcal).toBeLessThan(after.tdee_kcal); // elle peut de nouveau sécher
  });

  it('RÉGRESSION : une semaine devenue « future » n\'est plus détruite du registre', () => {
    // L'horloge peut reculer légitimement (vol vers l'ouest un lundi, fuseau +13 → -11).
    // Le registre est RÉÉCRIT à chaque recalcul : purger aurait effacé une exposition
    // réelle, définitivement, et l'aurait propagée au cloud.
    const settled = settleLowEaExposure(['2026-06-01', '2026-06-08', '2026-07-27'], '2026-07-26');
    const kept = markLowEaWeek(settled, '2026-07-26', true);
    expect(kept.weeks).toContain('2026-07-27');        // conservée, plus détruite
    // Comptées : les deux semaines de juin + la semaine courante que l'appel vient
    // d'ajouter. La semaine future, elle, reste hors comptage.
    expect(lowEaWeeksInWindow(kept, '2026-07-26')).toBe(3);
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
    const s = datedGoalStatus(dated(100, 4), male120, TODAY, 3379, null, null)!;
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
      body, TODAY, 2700, null, null,
    )!;
    expect(s.dailyKcalDelta).toBe(Math.round((0.35 * KCAL_PER_KG_GAIN) / 7)); // +250, pas +385
  });

  it('ne divise pas par zéro sur une deadline immédiate', () => {
    for (const days of [1, 2, 3]) {
      const gt: GoalTarget = {
        target_weight_kg: 114, target_date: addDaysStamp(TODAY, days),
        start_weight_kg: 120, start_date: TODAY,
      };
      const s = datedGoalStatus(gt, male120, TODAY, 3379, null, null)!;
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
    const s = datedGoalStatus(gt, bulk, TODAY, 2800, null, null)!;
    expect(s.directionMismatch).toBe(true);
    expect(s.dailyKcalDelta).toBe(0);
    expect(computePlan({ ...bulk, goal_target: gt }, TODAY).flags).toContain('GOAL_DIRECTION_MISMATCH');
  });

  it('la projection suit le rythme RÉELLEMENT appliqué, pas le rythme théorique', () => {
    const s = datedGoalStatus(dated(100, 4), male120, TODAY, 3379, null, null)!;
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

// ═════════════════════════════════════════════════════════════════════════════
// P0.5 — le registre compte des semaines VÉCUES, pas des enregistrements.
// ═════════════════════════════════════════════════════════════════════════════

describe('P0.5 — exposition mesurée en temps réel, pas en nombre de recalculs', () => {
  // Femme 70 kg, 28 % de MG, sans sport : TDEE 1751, plancher 1512 → sèche servie
  // à 1512 kcal, EA exactement 30. Chaque semaine compte tant que ça dure.
  const dieter = makeProfile({
    sex: 'female', age: 30, weight_kg: 70, height_cm: 168, body_fat_pct: 28,
    goal: 'cut', macro_mode: 'auto', training_days_per_week: 0, sports: [],
  });

  const runFor = (stepDays: number, weeks: number) => {
    let p: UserProfile = dieter;
    for (let d = 0; d <= weeks * 7; d += stepDays) p = recalcProfile(p, addDaysStamp(TODAY, d));
    return lowEaWeeksInWindow(p.low_ea_weeks, addDaysStamp(TODAY, weeks * 7));
  };

  it('LE DÉFAUT : même comportement ⇒ même compteur, quelle que soit la fréquence d\'ouverture', () => {
    // 12 semaines de sèche identique, vécues de deux façons : pesée hebdomadaire
    // (13 recalculs) et pesée mensuelle (4 recalculs). La v1 comptait les
    // ENREGISTREMENTS → 13 contre 4, soit une protection RED-S divisée par trois
    // pour la seule raison qu'on ouvrait l'app moins souvent.
    const weekly = runFor(7, 12);
    const monthly = runFor(28, 12);
    expect(weekly).toBe(13);
    expect(monthly).toBe(weekly);
  });

  it('le plancher qui en découle est donc identique lui aussi', () => {
    // 24 semaines : au-delà du budget de 12, l'escalade dépend directement du
    // compteur. C'est là que l'écart se payait en kcal.
    const at = (stepDays: number) => {
      let p: UserProfile = dieter;
      for (let d = 0; d <= 24 * 7; d += stepDays) p = recalcProfile(p, addDaysStamp(TODAY, d));
      return p.target_kcal;
    };
    expect(at(28)).toBe(at(7));
  });

  it('une VRAIE pause n\'est pas facturée : `since` retombe dès qu\'un plan non restrictif est servi', () => {
    let p = recalcProfile(dieter, TODAY);                                   // sèche → compte
    p = recalcProfile({ ...p, goal: 'maintain' }, addDaysStamp(TODAY, 7));  // sortie de déficit
    const far = addDaysStamp(TODAY, 7 * 20);
    p = recalcProfile(p, far);
    // Deux semaines vécues en restriction, pas vingt : le rattrapage ne couvre que
    // les périodes où le plan servi creusait réellement.
    expect(lowEaWeeksInWindow(p.low_ea_weeks, far)).toBe(2);
    expect(readLowEaRegistry(p.low_ea_weeks).since).toBeNull();
  });

  it('le rattrapage est borné à la fenêtre de 12 mois (et à un `since` aberrant)', () => {
    const reg = settleLowEaExposure({ weeks: [], since: '2019-01-01' }, TODAY);
    expect(reg.weeks.length).toBeLessThanOrEqual(53);
    expect(lowEaWeeksInWindow(reg, TODAY)).toBeGreaterThan(50);
  });

  it('la forme legacy (tableau nu) est encore lue et se migre sans perte', () => {
    const legacy = ['2026-06-01', '2026-06-08'];
    expect(readLowEaRegistry(legacy)).toEqual({ weeks: legacy, since: null });
    expect(lowEaWeeksInWindow(legacy, TODAY)).toBe(2);
    const p = recalcProfile({ ...dieter, low_ea_weeks: legacy }, TODAY);
    expect(readLowEaRegistry(p.low_ea_weeks).weeks).toEqual(expect.arrayContaining(legacy));
  });

  it('un profil sans exposition ne persiste rien (pas de champ vide qui traîne)', () => {
    const p = recalcProfile(makeProfile({ sex: 'female', goal: 'maintain' }), TODAY);
    expect(p.low_ea_weeks).toBeUndefined();
  });

  it('l\'aperçu des écrans utilise le MÊME compteur que le moteur', () => {
    // `lowEaWeeksForFloor` est le point d'entrée unique : un écran qui appellerait
    // `lowEaWeeksBefore` sans solder afficherait un plan que le moteur n'enregistrera pas.
    const stored = { weeks: [weekStartStamp(addDaysStamp(TODAY, -70))], since: addDaysStamp(TODAY, -70) };
    expect(lowEaWeeksForFloor(stored, TODAY)).toBe(10); // 10 semaines écoulées, la courante exclue
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P0.6 — insuffisance pondérale ATTEINTE en cours de route (dérive).
// ═════════════════════════════════════════════════════════════════════════════

describe('P0.6 — la sèche s\'arrête quand le poids passe sous la plage de référence', () => {
  // 49 kg pour 1 m 68 → IMC 17,4. `checkEligibility` l'aurait refusée à l'INSCRIPTION ;
  // le point du correctif est qu'elle y est ARRIVÉE, sans jamais repasser de porte.
  const drifted = makeProfile({
    sex: 'female', age: 28, weight_kg: 49, height_cm: 168,
    goal: 'cut', macro_mode: 'auto', training_days_per_week: 0, sports: [],
  });

  it('sous IMC 18,5, le plan cesse de creuser et revient exactement à la maintenance', () => {
    expect(bmiOf(drifted)).toBeLessThan(UNDERWEIGHT_BMI);
    expect(deficitBlocked(drifted)).toBe(true);
    const { profile, flags } = computePlan(drifted, TODAY);
    expect(profile.target_kcal).toBe(profile.tdee_kcal); // maintenance, jamais un surplus
    expect(flags).toContain('UNDERWEIGHT_NO_DEFICIT');
  });

  it('LE DÉFAUT : une sèche qui va trop loin se neutralise d\'elle-même', () => {
    // Elle démarre à IMC 19,8 (éligible) et perd 0,4 kg/semaine en tenant son suivi.
    // Avant le correctif, le moteur continuait de prescrire un déficit indéfiniment :
    // le plancher d'énergie autorise précisément la zone 30–35, donc RIEN ne
    // l'arrêtait. Le danger ne touchait que celles qui suivaient le plan à la lettre.
    let crossed = false;
    for (let w = 0; w < 30; w++) {
      const weight_kg = Math.round((56 - 0.4 * w) * 10) / 10;
      const { profile } = computePlan({ ...drifted, weight_kg }, addDaysStamp(TODAY, 7 * w));
      if (bmiOf(profile) < UNDERWEIGHT_BMI) {
        crossed = true;
        expect(profile.target_kcal, `semaine ${w} (${weight_kg} kg)`).toBe(profile.tdee_kcal);
      } else {
        expect(profile.target_kcal, `semaine ${w} (${weight_kg} kg)`).toBeLessThan(profile.tdee_kcal);
      }
    }
    expect(crossed).toBe(true);
  });

  it('la recomposition compte comme un déficit (−150 kcal reste un déficit)', () => {
    expect(computePlan({ ...drifted, goal: 'recomp' }, TODAY).flags).toContain('UNDERWEIGHT_NO_DEFICIT');
  });

  it('AUCUN chemin ne contourne le plafond — modes percent et manual compris', () => {
    const percent = computePlan({ ...drifted, macro_mode: 'percent', carb_ratio: 55, protein_per_kg: 2.2 }, TODAY);
    expect(percent.profile.target_kcal).toBe(percent.profile.tdee_kcal);
    expect(percent.flags).toContain('UNDERWEIGHT_NO_DEFICIT');

    const manual = computePlan({
      ...drifted, macro_mode: 'manual', target_protein_g: 100, target_carbs_g: 80, target_fat_g: 35,
    }, TODAY);
    expect(manual.profile.target_kcal).toBeGreaterThanOrEqual(manual.profile.tdee_kcal);
    expect(manual.flags).toContain('UNDERWEIGHT_NO_DEFICIT');
  });

  it('n\'invente AUCUN drapeau quand rien n\'est contraint (maintien, prise)', () => {
    for (const goal of ['maintain', 'lean_bulk', 'bulk'] as const) {
      const { profile, flags } = computePlan({ ...drifted, goal }, TODAY);
      expect(flags, goal).not.toContain('UNDERWEIGHT_NO_DEFICIT');
      expect(profile.target_kcal, goal).toBeGreaterThanOrEqual(profile.tdee_kcal);
    }
  });

  it('l\'objectif daté ne pilote plus aucune PERTE, mais continue de piloter une PRISE', () => {
    const losing: GoalTarget = {
      target_weight_kg: 45, target_date: addDaysStamp(TODAY, 70), start_weight_kg: 56, start_date: TODAY,
    };
    const s = datedGoalStatus(losing, drifted, TODAY, 1487, null, null)!;
    expect(s.underweightBlocked).toBe(true);
    expect(s.dailyKcalDelta).toBe(0);
    expect(s.safeWeeklyKg).toBe(0);
    expect(s.reachableByDate).toBe(false); // la carte ne peut plus annoncer une date

    const gaining: GoalTarget = {
      target_weight_kg: 55, target_date: addDaysStamp(TODAY, 140), start_weight_kg: 49, start_date: TODAY,
    };
    const g = datedGoalStatus(gaining, { ...drifted, goal: 'lean_bulk' }, TODAY, 1487, null, null)!;
    expect(g.underweightBlocked).toBe(false);
    expect(g.dailyKcalDelta).toBeGreaterThan(0);
  });

  it('poser un objectif daté ne fait PAS disparaître l\'avertissement du profil', () => {
    // Piège d'interaction : l'objectif daté ramène la demande à 0 AVANT le plancher,
    // qui n'a alors plus rien à refuser. L'écran devenait muet exactement pour la
    // personne qui poursuit activement une perte de poids en insuffisance pondérale.
    const withGoal = {
      ...drifted,
      goal_target: {
        target_weight_kg: 45, target_date: addDaysStamp(TODAY, 70), start_weight_kg: 56, start_date: TODAY,
      } as GoalTarget,
    };
    const { profile, flags } = computePlan(withGoal, TODAY);
    expect(flags).toContain('UNDERWEIGHT_NO_DEFICIT');
    expect(flags.filter((f) => f === 'UNDERWEIGHT_NO_DEFICIT')).toHaveLength(1); // jamais en double
    expect(profile.target_kcal).toBe(profile.tdee_kcal);
  });

  it('un IMC juste au-dessus du seuil n\'est PAS bridé (le garde-fou ne déborde pas)', () => {
    const ok = { ...drifted, weight_kg: 53 }; // IMC 18,8
    expect(deficitBlocked(ok)).toBe(false);
    const { profile, flags } = computePlan(ok, TODAY);
    expect(profile.target_kcal).toBeLessThan(profile.tdee_kcal);
    expect(flags).not.toContain('UNDERWEIGHT_NO_DEFICIT');
  });

  it('l\'entrée et la dérive partagent le MÊME prédicat (aucune divergence possible)', () => {
    expect(checkEligibility(drifted)).toContain('UNDERWEIGHT_CUT_BLOCKED');
    expect(deficitBlocked(drifted)).toBe(true);
    const ok = { ...drifted, weight_kg: 53 };
    expect(checkEligibility(ok)).toEqual([]);
    expect(deficitBlocked(ok)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Régressions issues de l'audit adverse (2026-07-28) — angles synchro,
// objectif daté, macros et appelants.
// ═════════════════════════════════════════════════════════════════════════════

describe('Audit — synchro, objectif daté, macros', () => {
  it('une ligne cloud sans registre n\'efface plus l\'historique local', () => {
    // Même classe de bug que P3.3 (`sports`) : `low_ea_weeks` est le second champ
    // CUMULATIF du profil, non re-dérivable. Une colonne NULL (ligne antérieure à
    // la migration) écrasait 22 semaines, soit ~210 kcal/j de protection perdus.
    const local = makeProfile({ low_ea_weeks: { weeks: ['2026-05-04', '2026-05-11', '2026-05-18'], since: '2026-05-04' } });
    const cloud = makeProfile({ low_ea_weeks: undefined });
    expect(reconcileCloudLowEaWeeks(cloud, local).low_ea_weeks).toEqual(local.low_ea_weeks);
    // Fusion par UNION : sur deux appareils, chacun détient une part de l'exposition.
    const other = makeProfile({ low_ea_weeks: { weeks: ['2026-05-11', '2026-06-01'], since: '2026-05-25' } });
    expect(reconcileCloudLowEaWeeks(other, local).low_ea_weeks).toEqual({
      weeks: ['2026-05-04', '2026-05-11', '2026-05-18', '2026-06-01'],
      // `since` : la PLUS ANCIENNE des deux. Retenir la plus récente amputerait le
      // rattrapage de tout l'intervalle que l'autre appareil avait déjà vu commencer.
      since: '2026-05-04',
    });
    // La forme legacy (tableau nu) côté cloud ne fait perdre ni les semaines ni le `since` local.
    const legacyCloud = makeProfile({ low_ea_weeks: ['2026-06-08'] });
    expect(reconcileCloudLowEaWeeks(legacyCloud, local).low_ea_weeks).toEqual({
      weeks: ['2026-05-04', '2026-05-11', '2026-05-18', '2026-06-08'],
      since: '2026-05-04',
    });
  });

  it('un TDEE inexploitable (0, NaN) ne casse plus le plafond de déficit', () => {
    // `tdee_kcal` vaut littéralement 0 sur un profil fraîchement construit, et les
    // écrans passent la valeur STOCKÉE. Avec 0, `-Math.round(0.25*0)` donnait `-0` :
    // tout le déficit était annulé ET l'objectif déclaré atteignable (car -0 === 0).
    const body = makeProfile({ sex: 'male', age: 30, weight_kg: 85, height_cm: 180, goal: 'cut' });
    const gt: GoalTarget = {
      target_weight_kg: 75, target_date: addDaysStamp(TODAY, 180), start_weight_kg: 85, start_date: TODAY,
    };
    const ref = datedGoalStatus(gt, body, TODAY, 2600, null, null)!;
    for (const bad of [0, NaN, undefined as unknown as number, -100]) {
      const s = datedGoalStatus(gt, body, TODAY, bad, null, null)!;
      expect(s.dailyKcalDelta, `tdee=${bad}`).toBeLessThan(0);           // le déficit survit
      expect(s.dailyKcalDelta, `tdee=${bad}`).toBe(ref.dailyKcalDelta);  // seul le plafond des 25 % saute
      expect(s.deficitCapped, `tdee=${bad}`).toBe(false);
      expect(Number.isFinite(s.dailyKcalDelta)).toBe(true);
    }
  });

  it('la dernière semaine ne déclare plus « objectif ambitieux » un objectif sûr', () => {
    // Le garde-fou de division (`Math.max(1, weeksRemaining)`) ralentissait
    // mécaniquement le rythme sous 7 jours restants, ce qui levait `clamped` et
    // annonçait « tu y arriveras après ta date » pour un écart parfaitement tenable.
    const body = makeProfile({ sex: 'male', age: 30, weight_kg: 85, height_cm: 180, goal: 'cut' });
    const near: GoalTarget = {
      target_weight_kg: 84.69, target_date: addDaysStamp(TODAY, 6), start_weight_kg: 85, start_date: TODAY,
    };
    const s = datedGoalStatus(near, body, TODAY, 2600, null, null)!;
    expect(s.clamped).toBe(false);
    expect(s.reachableByDate).toBe(true);
  });

  it('le mode « Perso % » n\'annule plus le correctif protéique', () => {
    // L'UI pré-remplit toujours `protein_per_kg` : ce chemin est celui de TOUS les
    // utilisateurs en « Perso % ». Il prenait le POIDS DE CORPS brut quand le %MG
    // n'était pas déclaré → 3,81 g/kg de masse maigre, le sur-dosage que P0.2 corrige.
    const f90 = makeProfile({ sex: 'female', age: 35, weight_kg: 90, height_cm: 165, goal: 'cut' });
    const ffm = fatFreeMassKg(f90);
    for (const gPerKg of [1.2, 2.2, 3.0]) {
      const m = macrosPercent(2100, 'cut', f90, 55, { proteinPerKg: gPerKg });
      expect(m.protein_g / ffm, `${gPerKg} g/kg`).toBeCloseTo(gPerKg, 1);
      expect(m.protein_g / ffm, `${gPerKg} g/kg`).toBeLessThanOrEqual(3.05);
    }
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// A4 — une semaine servie À l'optimum n'est pas une semaine SOUS l'optimum.
//
// Le plancher escaladé vaut `seuil × masse maigre + sport` : au plafond, l'énergie
// disponible servie vaut donc EXACTEMENT 35. Un test `< 35` dessus ne décidait plus
// rien de physiologique — il décidait de l'arrondi au kcal du plancher. Mesuré sur
// 130 semaines (F 80 kg) : l'EA oscillait entre 34,99 et 35,01, et le compteur
// saturait à ~46 semaines au lieu de se stabiliser.
// ═════════════════════════════════════════════════════════════════════════════

describe('A4 — le décompte de zone basse ne dépend plus d\'un arrondi', () => {
  const elle = { sex: 'female' as const, age: 32, weight_kg: 62, height_cm: 166, body_fat_pct: 26 };
  const ffm = fatFreeMassKg(elle);
  const sport = 250;
  /** Cible dont l'énergie disponible vaut exactement `ea`. */
  const cibleA = (ea: number) => ea * ffm + sport;

  it('la marge vaut un DEMI-CRAN d\'escalade — ancrée, pas choisie au hasard', () => {
    expect(EA_COUNT_TOLERANCE).toBe(LOW_EA_STEP_PER_WEEK / 2);
    expect(EA_COUNT_TOLERANCE).toBeLessThan(EA_OPTIMAL - EA_HARD_FLOOR); // très loin du seuil de risque
  });

  it('servie PILE à l\'optimum : ne compte pas — c\'est là que l\'escalade dépose', () => {
    const cible = cibleA(EA_OPTIMAL);
    expect(energyAvailability(elle, cible, sport)).toBeCloseTo(EA_OPTIMAL, 6);
    expect(countsAsLowEaWeek(elle, cible, cible + 40, sport)).toBe(false);
  });

  it('un arrondi d\'un kcal ne peut plus faire basculer le verdict', () => {
    // ±1 kcal autour de l'optimum : avant, ces deux plans-là donnaient deux réponses.
    for (const delta of [-1, 0, 1]) {
      const cible = cibleA(EA_OPTIMAL) + delta;
      expect(countsAsLowEaWeek(elle, cible, cible + 40, sport), `${delta} kcal`).toBe(false);
    }
  });

  it('la ZONE À RISQUE compte toujours — la protection n\'est pas desserrée', () => {
    for (const ea of [EA_HARD_FLOOR - 2, EA_HARD_FLOOR, 32, 34]) {
      const cible = cibleA(ea);
      expect(countsAsLowEaWeek(elle, cible, cible + 300, sport), `EA ${ea}`).toBe(true);
    }
  });

  it('sans déficit, rien ne compte, quelle que soit l\'énergie disponible', () => {
    const cible = cibleA(31);
    expect(countsAsLowEaWeek(elle, cible, cible, sport)).toBe(false); // à sa maintenance
  });
});

describe('repère de plausibilité du %MG saisi (2026-07-31)', () => {
  // Katch-McArdle ne lit QUE la masse maigre : un %MG sous-estimé gonfle la dépense
  // et efface le déficit EN SILENCE. Mesuré sur F 80 kg / 1 m 70 / 35 ans : 20 % au
  // lieu des 36 % estimés → cible 2112 au lieu de 1731, soit +381 kcal/jour.
  it('les seuils sont ceux de la silhouette la plus maigre du sélecteur', () => {
    // VERROU : si la charte de BodyFatPicker descend plus bas, le repère se
    // déclencherait sur un simple tap d'illustration. Les deux doivent bouger ensemble.
    const src = readFileSync(new URL('../../components/BodyFatPicker.tsx', import.meta.url), 'utf8');
    const bloc = (sexe: string) => {
      const i = src.indexOf(`${sexe}: [`, src.indexOf('const LEVELS'));
      return src.slice(i, src.indexOf('],', i));
    };
    const plusMaigre = (sexe: string) =>
      Math.min(...[...bloc(sexe).matchAll(/pct:\s*(\d+)/g)].map((m) => Number(m[1])));
    expect(plusMaigre('female')).toBe(ATYPICAL_BF_BELOW.female);
    expect(plusMaigre('male')).toBe(ATYPICAL_BF_BELOW.male);
  });

  it('ne se lève PAS sur les valeurs des silhouettes (sinon il crierait au loup)', () => {
    expect(isAtypicalBodyFat('female', 18)).toBe(false);
    expect(isAtypicalBodyFat('male', 10)).toBe(false);
    expect(isAtypicalBodyFat('female', 33)).toBe(false);
  });

  it('se lève sous la charte, et seulement là', () => {
    expect(isAtypicalBodyFat('female', 15)).toBe(true);
    expect(isAtypicalBodyFat('male', 8)).toBe(true);
    // 15 % est banal chez l'homme, atypique chez la femme : le seuil est bien sexué.
    expect(isAtypicalBodyFat('male', 15)).toBe(false);
    expect(isAtypicalBodyFat('female', undefined)).toBe(false);
    expect(isAtypicalBodyFat('female', NaN)).toBe(false);
  });

  it('le chiffre annoncé est l\'écart RÉEL de dépense, et il est prudent', () => {
    const corps = { sex: 'female' as const, age: 35, weight_kg: 80, height_cm: 170, neat_level: 'desk' as const };
    const impact = bodyFatTdeeImpact(corps, 20);
    // Positif : sous-estimer son %MG fait monter la dépense estimée.
    expect(impact).toBeGreaterThan(200);
    // …et il sous-annonce l'effet sur la CIBLE (le plancher suit la masse maigre) :
    // c'est voulu, on ne gonfle pas le chiffre pour impressionner.
    const cible = (bf?: number) => recalcProfile(makeProfile({
      ...corps, body_fat_pct: bf, goal: 'cut', macro_mode: 'auto',
      sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    }), TODAY).target_kcal;
    expect(impact).toBeLessThan(cible(20) - cible(undefined));
  });
});

describe('repère de MASSE MAIGRE — le trou que le seuil plat laissait (A6, 2026-07-31)', () => {
  // Le cas qui l'a révélé : le fondateur compare deux profils identiques sauf le
  // sexe, %MG 20 déclaré, et obtient EXACTEMENT les mêmes macros. Katch-McArdle ne
  // lit que la masse maigre et n'a pas de terme de sexe ; le plancher d'énergie
  // disponible vaut 30 kcal/kg de masse maigre pour les deux sexes. À masse maigre
  // égale, tout est donc égal — le vrai défaut est en AMONT : rien ne disait que
  // 64 kg de masse maigre chez une femme de 1 m 70 sort du plausible.
  const corps = { age: 35, weight_kg: 80, height_cm: 170 };

  it('attrape le cas du fondateur, que le seuil plat laissait passer', () => {
    expect(isAtypicalBodyFat('female', 20)).toBe(false);          // muet : 20 > 18
    expect(bodyFatConcern('female', 20, corps)).toBe('lean_mass'); // FFMI 22,1 > 21
  });

  it('est bien SEXUÉ : le même corps ne dit rien chez l\'homme', () => {
    // 64 kg de masse maigre à 1 m 70, c'est un homme entraîné banal.
    expect(bodyFatConcern('male', 20, corps)).toBe(null);
  });

  it('ne crie pas au loup sur les gabarits ordinaires', () => {
    expect(bodyFatConcern('female', 28, corps)).toBe(null);                                  // silhouette du milieu
    expect(bodyFatConcern('female', 25, { age: 28, weight_kg: 65, height_cm: 165 })).toBe(null);
    expect(bodyFatConcern('male', 15, { age: 30, weight_kg: 90, height_cm: 180 })).toBe(null);
  });

  it('sans corps saisi, seul le seuil plat parle — et il parle encore', () => {
    expect(bodyFatConcern('female', 20, undefined)).toBe(null);
    expect(bodyFatConcern('female', 15, undefined)).toBe('below_chart');
    expect(bodyFatConcern('male', 8, { age: 30, weight_kg: 70, height_cm: 180 })).toBe('below_chart');
  });

  it('ne déplace AUCUNE cible : c\'est un repère, pas une formule', () => {
    const cible = (sex: 'male' | 'female') => recalcProfile(makeProfile({
      ...corps, sex, body_fat_pct: 20, goal: 'cut', macro_mode: 'auto',
    }), TODAY).target_kcal;
    // Le constat d'origine, verrouillé tel quel : on ne l'a PAS corrigé par la
    // formule (mesuré, aucune variante n'améliorait sans casser autre chose).
    expect(cible('female')).toBe(cible('male'));
  });

  it('rien à signaler sur une valeur absente ou absurde', () => {
    expect(bodyFatConcern('female', undefined, corps)).toBe(null);
    expect(bodyFatConcern('female', NaN, corps)).toBe(null);
    expect(bodyFatConcern('female', 0, corps)).toBe(null);
    expect(bodyFatConcern('female', 20, { ...corps, height_cm: 0 })).toBe(null);
  });
});
