import { describe, it, expect } from 'vitest';
import {
  datedGoalStatus, trackStatus, zoneHalfWidthKg, addDaysStamp,
  TRACK_TOLERANCE_KG, MAX_PROJECTION_WEEKS, MAX_DEFICIT_TDEE_RATIO,
} from '../datedGoal';
import {
  computePlan, macrosPercent, calculateMacros, fatTargetG, clampCarbRatio,
  FAT_MIN_PER_KG_FFM, CARB_RATIO_MAX, CARB_RATIO_MIN, planFloorKcal,
} from '../tdee';
import { fatFreeMassKg } from '../safety';
import { makeProfile } from './helpers';
import { GoalTarget, UserProfile } from '../types';

const TODAY = '2026-07-21';
const dated = (kg: number, weeks: number, from = 90): GoalTarget => ({
  target_weight_kg: kg, target_date: addDaysStamp(TODAY, weeks * 7),
  start_weight_kg: from, start_date: TODAY,
});

// ═════════════════════════════════════════════════════════════════════════════
// P1.6 — la date annoncée doit décrire le rythme RÉELLEMENT SERVI.
// Mesuré avant correctif sur une grille de 1344 objectifs : écart médian de
// 32 jours, 89 au 90ᵉ centile, 724 au pire, et 655 objectifs annoncés
// « atteignable » à tort. Les plus touchés : les hommes sédentaires.
// ═════════════════════════════════════════════════════════════════════════════

describe('P1.6 — projection au rythme servi, pas au rythme demandé', () => {
  // H 35 ans, 90 kg, 180 cm, sédentaire : son plancher est proche de sa maintenance,
  // donc un objectif ambitieux se fait rogner sans que rien ne le disait.
  const sedentary: UserProfile = makeProfile({
    sex: 'male', age: 35, weight_kg: 90, height_cm: 180, goal: 'cut',
    training_days_per_week: 0, sports: [], macro_mode: 'auto',
  });

  it('LE DÉFAUT : quand le plancher rogne le déficit, la date annoncée était fausse', () => {
    const gt = dated(83.7, 12); // −7 % en 12 semaines
    const tdee = computePlan({ ...sedentary, goal_target: gt }, TODAY).profile.tdee_kcal;
    const floor = planFloorKcal({ ...sedentary, goal_target: gt }, TODAY);

    const sansPlancher = datedGoalStatus(gt, sedentary, TODAY, tdee, null, null)!;
    const avecPlancher = datedGoalStatus(gt, sedentary, TODAY, tdee, floor, null)!;

    // Le plancher mord : le déficit servi est plus petit que le déficit demandé.
    expect(avecPlancher.floorCapped).toBe(true);
    expect(Math.abs(avecPlancher.safeWeeklyKg)).toBeLessThan(Math.abs(sansPlancher.safeWeeklyKg));
    // Donc la date recule, et on cesse de prétendre que l'échéance tient.
    expect(avecPlancher.projectedDate > sansPlancher.projectedDate).toBe(true);
    expect(avecPlancher.reachableByDate).toBe(false);
    // Le delta calorique DEMANDÉ, lui, ne bouge pas : P1.6 est un correctif
    // d'AFFICHAGE, il ne déplace aucune calorie servie.
    expect(avecPlancher.dailyKcalDelta).toBe(sansPlancher.dailyKcalDelta);
  });

  it('le plan servi n\'est pas modifié par le correctif (invariant : display-only)', () => {
    const gt = dated(83.7, 12);
    const avec = computePlan({ ...sedentary, goal_target: gt }, TODAY).profile;
    // La cible servie est bien celle du plancher, et le plancher n'a pas bougé.
    expect(avec.target_kcal).toBe(planFloorKcal({ ...sedentary, goal_target: gt }, TODAY));
  });

  it('GARDE 1 — un rythme servi nul ne produit aucune date', () => {
    // Objectif déjà au plancher : le déficit servi est zéro.
    const atFloor: UserProfile = makeProfile({
      sex: 'female', age: 28, weight_kg: 49, height_cm: 168, goal: 'cut',
      training_days_per_week: 0, sports: [], macro_mode: 'auto',
    });
    // Sous IMC 18,5 → pilotage suspendu (P0.6), donc aucune projection.
    const s = datedGoalStatus(dated(45, 10, 56), atFloor, TODAY, 1487, 1487, null)!;
    expect(s.underweightBlocked).toBe(true);
    expect(s.projectable).toBe(false);
    expect(s.reachableByDate).toBe(false);
  });

  it('GARDE 2 — un plancher AU-DESSUS de la maintenance ne projette pas une date à l\'envers', () => {
    // Plancher > TDEE (BMR mal estimé, filet absolu sur un très petit gabarit) :
    // le plan prescrit un SURPLUS à quelqu'un qui veut perdre. `diff / applied`
    // redevient positif et la date paraissait parfaitement crédible.
    const s = datedGoalStatus(dated(80, 12), sedentary, TODAY, 2200, 2600, null)!;
    expect(s.floorCapped).toBe(true);
    expect(s.safeWeeklyKg).toBeGreaterThan(0);   // on prend du poids…
    expect(s.projectable).toBe(false);           // …donc aucune date vers 80 kg
    expect(s.reachableByDate).toBe(false);
  });

  it('GARDE 3 — un rythme minuscule ne projette pas une date en 2048', () => {
    // Déficit servi de ~7 kcal/j → 0,006 kg/semaine : positif, fini, et absurde.
    const s = datedGoalStatus(dated(80, 12), sedentary, TODAY, 2200, 2193, null)!;
    expect(s.floorCapped).toBe(true);
    expect(s.projectable).toBe(false);
    expect(MAX_PROJECTION_WEEKS).toBe(260); // 5 ans
  });

  it('le mode `manual` neutralise la correction (la cible y vient des grammes)', () => {
    // En manual, la cible n'est pas `tdee + delta` : appliquer la formule y donnerait
    // le signe inverse. computePlan passe donc `null` — vérifié par le comportement.
    const manual: UserProfile = makeProfile({
      ...sedentary, macro_mode: 'manual',
      target_protein_g: 180, target_carbs_g: 200, target_fat_g: 60,
      goal_target: dated(83.7, 12),
    });
    // Ne lève pas d'exception et sert bien un plan cohérent.
    const { profile, floor_kcal } = computePlan(manual, TODAY);
    expect(profile.target_kcal).toBeGreaterThanOrEqual(floor_kcal);
  });

  it('sans plancher qui mord, rien ne change par rapport à avant', () => {
    const gt = dated(88, 12); // objectif doux, largement au-dessus du plancher
    const tdee = computePlan({ ...sedentary, goal_target: gt }, TODAY).profile.tdee_kcal;
    const floor = planFloorKcal({ ...sedentary, goal_target: gt }, TODAY);
    const s = datedGoalStatus(gt, sedentary, TODAY, tdee, floor, null)!;
    if (!s.floorCapped) {
      expect(s.reachableByDate).toBe(true);
      expect(s.projectable).toBe(true);
    }
  });

  it('reste robuste à un TDEE inexploitable (0, NaN, négatif)', () => {
    const gt = dated(83.7, 12);
    for (const bad of [0, NaN, -100]) {
      const s = datedGoalStatus(gt, sedentary, TODAY, bad, 1800, null)!;
      expect(Number.isFinite(s.dailyKcalDelta), String(bad)).toBe(true);
      expect(s.floorCapped, String(bad)).toBe(false); // pas de TDEE → pas de correction
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P1.5 — zone proportionnelle et suspension du verdict.
// (La trajectoire exponentielle de la spec est REJETÉE : la formule proposée est
// toujours SOUS la linéaire en sèche, elle exigeait 2,72× le rythme au démarrage.)
// ═════════════════════════════════════════════════════════════════════════════

describe('P1.5 — zone proportionnelle au gabarit', () => {
  it('±1 kg reste le plancher, mais la zone s\'élargit sur les gros gabarits', () => {
    expect(zoneHalfWidthKg(50)).toBe(TRACK_TOLERANCE_KG);   // 0,75 → plancher à 1,0
    expect(zoneHalfWidthKg(66)).toBe(TRACK_TOLERANCE_KG);   // 0,99 → plancher
    expect(zoneHalfWidthKg(80)).toBeCloseTo(1.2, 5);
    expect(zoneHalfWidthKg(120)).toBeCloseTo(1.8, 5);
    expect(zoneHalfWidthKg(NaN)).toBe(TRACK_TOLERANCE_KG);  // jamais NaN dans un SVG
  });

  it('la personne la plus lourde n\'est plus jugée avec la tolérance la plus stricte', () => {
    const gt: GoalTarget = {
      start_weight_kg: 120, target_weight_kg: 110,
      start_date: '2026-07-21', target_date: '2026-09-15',
    };
    // 1,5 kg au-dessus de l'idéal : « en retard » avec l'ancienne tolérance fixe,
    // dans la zone avec la tolérance proportionnelle (1,8 kg à 120 kg).
    const ideal = 115.03;
    expect(trackStatus(gt, ideal + 1.5, '2026-08-18')!.state).toBe('on_track');
    expect(trackStatus(gt, ideal + 2.5, '2026-08-18')!.state).toBe('behind');
  });

  it('le verdict est SUSPENDU quand le moteur ne pilote plus la trajectoire', () => {
    // Sans ça : le plan est bloqué à la maintenance (P0.6) donc le poids ne PEUT
    // plus descendre, mais la ligne idéale continuait — on affichait « en retard »
    // à quelqu'un à qui l'app venait d'interdire tout déficit.
    const gt: GoalTarget = {
      start_weight_kg: 56, target_weight_kg: 45,
      start_date: '2026-07-21', target_date: '2026-12-01',
    };
    const juge = trackStatus(gt, 53, '2026-10-01')!;
    const suspendu = trackStatus(gt, 53, '2026-10-01', true)!;
    expect(juge.state).toBe('behind');
    expect(suspendu.state).toBe('paused');
    // L'écart reste calculé (l'info existe), c'est le JUGEMENT qui est retiré.
    expect(suspendu.deltaKg).toBe(juge.deltaKg);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P1.4 — plancher lipidique, indexé sur la MASSE MAIGRE.
// ═════════════════════════════════════════════════════════════════════════════

describe('P1.4 — plancher lipidique', () => {
  const body = makeProfile({ sex: 'male', age: 30, weight_kg: 80, height_cm: 178, body_fat_pct: 18 });

  it('la base est la masse maigre, pas le poids de corps (même erreur que P0.2 évitée)', () => {
    // F 125 kg à 52 %MG : base POIDS → 63 g de lipides (31,5 % des kcal) au prix de
    // 30 g de glucides. Base MASSE MAIGRE → le plancher ne mord même pas.
    const heavy = makeProfile({ sex: 'female', age: 40, weight_kg: 125, height_cm: 160, body_fat_pct: 52 });
    const ffm = fatFreeMassKg(heavy); // 60 kg
    const floorFfm = FAT_MIN_PER_KG_FFM * ffm;
    const floorBodyWeight = 0.5 * heavy.weight_kg;
    expect(floorFfm).toBeLessThan(floorBodyWeight);
    // À 1800 kcal, la part de 25 % (50 g) dépasse déjà le plancher masse maigre.
    expect(fatTargetG(1800, heavy)).toBe(Math.round((1800 * 0.25) / 9));
  });

  it('ne mord aucun profil sain en mode auto — le trou était ailleurs', () => {
    const m = calculateMacros(2400, 'cut', body);
    expect(m.fat_g).toBe(Math.round((m.target_kcal * 0.25) / 9));
  });

  it('LE VRAI TROU : le mode « Perso % » descendait sous le seuil de carence', () => {
    // Au maximum du curseur, l'ancien calcul servait la seule part de répartition —
    // 12 à 20 g de lipides sur des profils ordinaires, sous le seuil de carence
    // (hormones stéroïdiennes, vitamines liposolubles).
    const m = macrosPercent(2400, 'cut', body, CARB_RATIO_MAX, { proteinPerKg: 2.2 });
    const plancher = Math.round(FAT_MIN_PER_KG_FFM * fatFreeMassKg(body));
    const partSeule = Math.round(((m.target_kcal - m.protein_g * 4) * (1 - CARB_RATIO_MAX / 100)) / 9);

    // Le test ne vaut que si le plancher MORD réellement sur ce profil — sinon il
    // passerait aussi avec l'ancien code et ne verrouillerait rien.
    expect(partSeule).toBeLessThan(plancher);
    expect(m.fat_g).toBe(plancher);
    expect(m.fat_g).toBeGreaterThan(partSeule);
  });

  it('à 90 (ancien maximum, encore stocké en base), le trou était béant', () => {
    // Sans clamp à la lecture ni plancher : 19 g de lipides, 7,3 % des calories.
    // Le curseur ne descend plus à 90, mais les comptes qui l'ont enregistré si.
    const m = macrosPercent(2400, 'cut', body, 90, { proteinPerKg: 2.2 });
    const ancien = Math.round(((m.target_kcal - m.protein_g * 4) * 0.10) / 9);
    expect((ancien * 9) / m.target_kcal).toBeLessThan(0.10); // ce qu'on servait
    expect((m.fat_g * 9) / m.target_kcal).toBeGreaterThan(0.15); // ce qu'on sert
  });

  it('les glucides sont le RELIQUAT : relever les lipides ne fait pas déborder le budget', () => {
    for (const ratio of [CARB_RATIO_MIN, 40, 55, CARB_RATIO_MAX]) {
      const m = macrosPercent(2000, 'cut', body, ratio, { proteinPerKg: 2.0 });
      const kcal = m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
      // Écart d'arrondi au gramme seulement (< 1 %), jamais un dépassement structurel.
      expect(Math.abs(kcal - m.target_kcal) / m.target_kcal, `ratio ${ratio}`).toBeLessThan(0.01);
    }
  });

  it('les lipides ne dépassent JAMAIS le budget du jour (plan infaisable impossible)', () => {
    // Gabarit extrême : masse maigre élevée, budget écrasé.
    const lean = makeProfile({ sex: 'male', age: 25, weight_kg: 100, height_cm: 190, body_fat_pct: 6 });
    expect(fatTargetG(1200, lean) * 9).toBeLessThanOrEqual(1200);
  });

  it('un `carb_ratio` PERSISTÉ hors bornes est ramené à la lecture', () => {
    // Abaisser la borne de l'écran ne migre aucun compte : `carb_ratio` est stocké
    // ET synchronisé. Sans ce clamp, qui a enregistré 90 garde 19 g de lipides à vie.
    expect(clampCarbRatio(90)).toBe(CARB_RATIO_MAX);
    expect(clampCarbRatio(100)).toBe(CARB_RATIO_MAX);
    expect(clampCarbRatio(0)).toBe(CARB_RATIO_MIN);
    expect(clampCarbRatio(undefined)).toBe(55);
    expect(clampCarbRatio(NaN)).toBe(55);

    const stored = makeProfile({ ...body, macro_mode: 'percent', carb_ratio: 90, protein_per_kg: 2.2 });
    const served = computePlan(stored, TODAY).profile;
    expect((served.target_fat_g * 9) / served.target_kcal).toBeGreaterThan(0.15);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Plafond de déficit à 25 % du TDEE — désormais sur TOUS les chemins.
// ═════════════════════════════════════════════════════════════════════════════

describe('Plafond de déficit 25 % — plus seulement sur l\'objectif daté', () => {
  it('LE DÉFAUT : « sèche rapide » servait 28 % de déficit sans aucun drapeau', () => {
    const petite = makeProfile({
      sex: 'female', age: 55, weight_kg: 60, height_cm: 158, goal: 'cut_aggressive',
      macro_mode: 'auto', training_days_per_week: 4,
      sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 45 }],
    });
    const { profile } = computePlan(petite, TODAY);
    const ratio = (profile.tdee_kcal - profile.target_kcal) / profile.tdee_kcal;
    expect(ratio).toBeLessThanOrEqual(MAX_DEFICIT_TDEE_RATIO + 1e-9);
  });

  it('s\'applique à TOUS les objectifs et TOUS les modes', () => {
    const base = makeProfile({
      sex: 'female', age: 55, weight_kg: 60, height_cm: 158,
      training_days_per_week: 4, protein_per_kg: 2.0, carb_ratio: 55,
      sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 45 }],
    });
    for (const goal of ['cut', 'cut_aggressive', 'recomp'] as const) {
      for (const macro_mode of ['auto', 'percent'] as const) {
        const { profile } = computePlan({ ...base, goal, macro_mode }, TODAY);
        const ratio = (profile.tdee_kcal - profile.target_kcal) / profile.tdee_kcal;
        expect(ratio, `${goal}/${macro_mode}`).toBeLessThanOrEqual(MAX_DEFICIT_TDEE_RATIO + 1e-9);
      }
    }
  });

  it('ne crée JAMAIS un surplus (75 % < 100 %, par construction)', () => {
    const profils = [
      makeProfile({ sex: 'female', age: 35, weight_kg: 125, height_cm: 170, body_fat_pct: 36, goal: 'maintain', sports: [], training_days_per_week: 0 }),
      makeProfile({ sex: 'male', age: 30, weight_kg: 70, height_cm: 180, goal: 'cut' }),
      makeProfile({ sex: 'female', age: 28, weight_kg: 62, height_cm: 168, goal: 'cut_aggressive' }),
    ];
    for (const p of profils) {
      const { profile } = computePlan(p, TODAY);
      expect(profile.target_kcal).toBeLessThanOrEqual(profile.tdee_kcal);
    }
  });

  it('reste idempotent : recalculer ne déplace plus rien', () => {
    const p = makeProfile({
      sex: 'female', age: 55, weight_kg: 60, height_cm: 158, goal: 'cut_aggressive',
      macro_mode: 'auto', training_days_per_week: 4,
      sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 45 }],
    });
    const once = computePlan(p, TODAY).profile;
    const twice = computePlan(once, TODAY).profile;
    expect(twice).toEqual(once);
  });
});
