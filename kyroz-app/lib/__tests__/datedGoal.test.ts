import { describe, it, expect } from 'vitest';
import {
  datedGoalStatus, datedGoalKcalDelta, addDaysStamp, daysBetween,
  idealWeightAt, trackStatus, TRACK_TOLERANCE_KG,
  KCAL_PER_KG_FAT, KCAL_PER_KG_GAIN, MAX_GAIN_RATE_PCT, maxWeeklyLossPct,
  MAX_DEFICIT_TDEE_RATIO,
} from '../datedGoal';
import { calculateMacros, computePlan, recalcProfile, MIN_KCAL, planFloorKcal, makeWeeklyProjector } from '../tdee';
import { lowEaWeeksForFloor } from '../safety';
import { makeProfile } from './helpers';
import { GoalTarget, UserProfile } from '../types';

// Corps de référence pour la trajectoire. `recomp` est volontairement NEUTRE :
// aucun sens d'objectif n'est imposé, donc aucun GOAL_DIRECTION_MISMATCH ne vient
// parasiter les tests de rythme (cf. P0.3).
const BODY80 = makeProfile({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, goal: 'recomp' });
const BODY70 = makeProfile({ sex: 'male', age: 30, weight_kg: 70, height_cm: 180, goal: 'recomp' });
const TDEE = 2914; // assez haut pour que le plafond des 25 % ne morde pas ici

const TODAY = '2026-07-21';
const inWeeks = (n: number) => addDaysStamp(TODAY, n * 7);

const target = (weight: number, weeks: number, start = 80): GoalTarget => ({
  target_weight_kg: weight,
  target_date: inWeeks(weeks),
  start_weight_kg: start,
  start_date: TODAY,
});

describe('helpers de date', () => {
  it('addDaysStamp / daysBetween sont cohérents', () => {
    expect(daysBetween(TODAY, addDaysStamp(TODAY, 84))).toBe(84);
    expect(daysBetween(TODAY, inWeeks(12))).toBe(84);
  });
});

describe('datedGoalStatus — trajectoire', () => {
  it('renvoie null sans objectif', () => {
    expect(datedGoalStatus(undefined, BODY80, TODAY, TDEE, null, null)).toBeNull();
    expect(datedGoalKcalDelta(undefined, BODY80, TODAY, TDEE)).toBeNull();
  });

  it('sèche douce : rythme non bridé, déficit modéré', () => {
    const s = datedGoalStatus(target(76, 12), BODY80, TODAY, TDEE, null, null)!;
    expect(s.active).toBe(true);
    expect(s.direction).toBe('lose');
    expect(s.clamped).toBe(false);
    expect(s.deficitCapped).toBe(false);
    // -4 kg sur 12 sem = -0,333 kg/sem → -0,333*7700/7 ≈ -367 kcal/j
    expect(s.dailyKcalDelta).toBe(Math.round((-4 / 12) * KCAL_PER_KG_FAT / 7));
    expect(s.dailyKcalDelta).toBeLessThan(0);
    expect(s.reachableByDate).toBe(true);
  });

  it('sèche trop rapide : rythme bridé au plafond sûr (modulé par l adiposité)', () => {
    const s = datedGoalStatus(target(70, 4), BODY80, TODAY, TDEE, null, null)!;
    expect(s.clamped).toBe(true);
    // %MG estimé ~20 % → ni sec ni très gras → plafond 0,75 %/sem = -0,6 kg/sem
    expect(maxWeeklyLossPct(BODY80)).toBe(0.75);
    const cap = -(maxWeeklyLossPct(BODY80) / 100) * 80;
    expect(s.safeWeeklyKg).toBeCloseTo(cap, 1);
    expect(s.dailyKcalDelta).toBe(Math.round(cap * KCAL_PER_KG_FAT / 7)); // -660
    // au rythme sûr, l'atteinte tombe APRÈS la date visée
    expect(s.reachableByDate).toBe(false);
    expect(daysBetween(TODAY, s.projectedDate)).toBeGreaterThan(daysBetween(TODAY, s.targetDate));
  });

  it('prise trop rapide : bridée au plafond sûr (0,5 %/sem)', () => {
    const s = datedGoalStatus(target(78, 8, 70), BODY70, TODAY, 2700, null, null)!;
    expect(s.direction).toBe('gain');
    expect(s.clamped).toBe(true);
    // plafond = +0,5 % de 70 = +0,35 kg/sem. Le kg PRIS coûte 5000 kcal (tissu mixte,
    // muscle très hydraté) et non 7700 : appliquer 7700 sur-prescrirait le surplus.
    const cap = (MAX_GAIN_RATE_PCT / 100) * 70;
    expect(s.dailyKcalDelta).toBe(Math.round(cap * KCAL_PER_KG_GAIN / 7)); // +250
    expect(s.dailyKcalDelta).toBeGreaterThan(0);
  });

  it('poids déjà atteint : maintien, delta 0, actif', () => {
    const s = datedGoalStatus(target(80.1, 8), BODY80, TODAY, TDEE, null, null)!;
    expect(s.direction).toBe('maintain');
    expect(s.dailyKcalDelta).toBe(0);
    expect(s.active).toBe(true);
  });

  it('échéance passée : inactif, aucun pilotage', () => {
    const past: GoalTarget = { target_weight_kg: 74, target_date: addDaysStamp(TODAY, -7), start_weight_kg: 80, start_date: addDaysStamp(TODAY, -90) };
    const s = datedGoalStatus(past, BODY80, TODAY, TDEE, null, null)!;
    expect(s.active).toBe(false);
    expect(datedGoalKcalDelta(past, BODY80, TODAY, TDEE)).toBeNull();
  });
});

describe('trajectoire idéale & verdict de pente (module Transformation)', () => {
  // 80 → 76 kg entre le 21/07 et le 15/09 (56 jours).
  const gt: GoalTarget = { target_weight_kg: 76, target_date: '2026-09-15', start_weight_kg: 80, start_date: '2026-07-21' };

  it('interpole linéairement entre départ et cible', () => {
    expect(idealWeightAt(gt, '2026-07-21')).toBe(80);
    expect(idealWeightAt(gt, '2026-09-15')).toBe(76);
    expect(idealWeightAt(gt, '2026-08-18')).toBeCloseTo(78, 1); // mi-parcours
  });

  it('borne aux extrémités (avant le départ / après l échéance)', () => {
    expect(idealWeightAt(gt, '2026-07-01')).toBe(80);
    expect(idealWeightAt(gt, '2027-01-01')).toBe(76);
  });

  it('en sèche : nettement au-dessus de l idéal = en retard, en dessous = en avance', () => {
    expect(trackStatus(gt, 79.5, '2026-08-18')!.state).toBe('behind'); // idéal 78, +1,5 kg
    expect(trackStatus(gt, 76.5, '2026-08-18')!.state).toBe('ahead');
    expect(trackStatus(gt, 78.0, '2026-08-18')!.state).toBe('on_track');
  });

  it('zone LARGE (±1 kg) : le bruit de balance reste « dans la zone » (anti-charge mentale)', () => {
    const s = trackStatus(gt, 78.9, '2026-08-18')!; // 0,9 kg au-dessus de l idéal → rassurant
    expect(s.state).toBe('on_track');
    expect(Math.abs(s.deltaKg)).toBeLessThanOrEqual(TRACK_TOLERANCE_KG);
    expect(TRACK_TOLERANCE_KG).toBe(1.0);
  });

  it('en PRISE de masse, le sens du retard s inverse', () => {
    const bulk: GoalTarget = { target_weight_kg: 84, target_date: '2026-09-15', start_weight_kg: 80, start_date: '2026-07-21' };
    expect(trackStatus(bulk, 80.5, '2026-08-18')!.state).toBe('behind'); // idéal 82 → trop léger
    expect(trackStatus(bulk, 83.5, '2026-08-18')!.state).toBe('ahead');
  });

  it('renvoie null sans objectif', () => {
    expect(trackStatus(undefined, 80, TODAY)).toBeNull();
  });
});

describe('intégration cerveau macro (recalcProfile / calculateMacros)', () => {
  const base: UserProfile = makeProfile({
    sex: 'male', age: 30, weight_kg: 80, height_cm: 180, training_days_per_week: 4,
    goal: 'maintain', tdee_kcal: 0, target_kcal: 0,
  });

  it('sans objectif daté : comportement historique inchangé (goal maintain → cible = TDEE)', () => {
    const p = recalcProfile(base, TODAY);
    expect(p.target_kcal).toBe(p.tdee_kcal); // maintain = delta 0
  });

  it('objectif daté en sèche : la cible calorique baisse sous le TDEE', () => {
    const p = recalcProfile({ ...base, goal_target: target(74, 12) }, TODAY);
    const expectedDelta = datedGoalKcalDelta(target(74, 12), base, TODAY, p.tdee_kcal)!;
    const { floor_kcal } = computePlan({ ...base, goal_target: target(74, 12) }, TODAY);
    expect(expectedDelta).toBeLessThan(0);
    expect(p.target_kcal).toBe(Math.max(p.tdee_kcal + expectedDelta, floor_kcal));
    expect(p.target_kcal).toBeLessThan(p.tdee_kcal);
  });

  it('le plancher de sécurité prime sur un override extrême (§6 + P0.1)', () => {
    // override -5000 → la cible est ramenée AU PLANCHER, jamais en dessous, et le
    // plancher réel (énergie disponible) est au-dessus du filet absolu 1500.
    const m = calculateMacros(2000, 'cut', base, { kcalDeltaOverride: -5000 });
    expect(m.target_kcal).toBe(m.floor_kcal);
    expect(m.target_kcal).toBeGreaterThan(MIN_KCAL.male);
    expect(m.flags).toContain('FLOOR_APPLIED');
  });

  it('un objectif extrême est bridé par le rythme ET par le plafond des 25 % du TDEE', () => {
    const p = recalcProfile({ ...base, goal_target: target(60, 4) }, TODAY);
    expect(p.target_kcal).toBeGreaterThan(MIN_KCAL.male);
    expect(p.tdee_kcal - p.target_kcal).toBeLessThanOrEqual(Math.round(0.25 * p.tdee_kcal));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// A3 — la DATE annoncée doit être celle que le moteur tiendra (2026-07-31).
//
// La projection divisait l'écart par le rythme du PREMIER JOUR. Mesuré en suivi
// parfait, l'annonce était fausse de +182 jours (F 65 → 58) à +1032 jours
// (F 80 → 70 : 2027 annoncé, 2030 réel) : ni la baisse du TDEE avec le poids, ni
// l'escalade de zone basse — qui ne mord qu'à la 13ᵉ semaine, donc JAMAIS le jour
// où l'on promet la date — n'y figuraient. Elle simule désormais semaine par
// semaine, sur le moteur lui-même.
// ═════════════════════════════════════════════════════════════════════════════

describe('A3 — projection simulée : plus de date flatteuse', () => {
  const JOUR = '2026-07-31';
  const corps = (o: Partial<UserProfile>): UserProfile => recalcProfile(makeProfile({
    age: 30, neat_level: 'desk', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    goal: 'cut', plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], ...o,
  }), JOUR);
  const objectif = (p: UserProfile, cibleKg: number, semaines: number): GoalTarget => ({
    start_weight_kg: p.weight_kg, start_date: JOUR,
    target_weight_kg: cibleKg, target_date: addDaysStamp(JOUR, semaines * 7),
  });
  /** Les deux projections d'un même objectif : simulée (écrans) et linéaire (repli). */
  const deuxDates = (p0: UserProfile, cibleKg: number, semaines: number) => {
    const gt = objectif(p0, cibleKg, semaines);
    const p: UserProfile = { ...p0, goal_target: gt };
    const floor = planFloorKcal(p, JOUR);
    return {
      gt,
      sim: datedGoalStatus(gt, p, JOUR, p.tdee_kcal, floor, makeWeeklyProjector(p))!,
      lin: datedGoalStatus(gt, p, JOUR, p.tdee_kcal, floor, null)!,
    };
  };

  it('INVARIANT — le projecteur sert exactement la cible de computePlan', () => {
    // Les deux ne doivent pas pouvoir diverger : le projecteur est le sous-ensemble
    // « calories » de computePlan, pas une seconde implémentation du moteur.
    for (const o of [
      { sex: 'female' as const, weight_kg: 65, height_cm: 167, goal: 'cut' as const },
      { sex: 'male' as const, weight_kg: 80, height_cm: 180, goal: 'cut' as const },
      { sex: 'male' as const, weight_kg: 95, height_cm: 183, goal: 'bulk' as const },
      { sex: 'female' as const, weight_kg: 70, height_cm: 168, goal: 'maintain' as const },
    ]) {
      const p = corps(o);
      const point = makeWeeklyProjector(p)(p.weight_kg, JOUR, lowEaWeeksForFloor(p.low_ea_weeks, JOUR));
      const attendu = computePlan(p, JOUR).profile;
      expect(point.targetKcal, `${o.sex} ${o.weight_kg}`).toBe(attendu.target_kcal);
      expect(point.tdeeKcal, `${o.sex} ${o.weight_kg}`).toBe(attendu.tdee_kcal);
    }
  });

  it('femme en sèche : la date recule encore de près d\'un an vs l\'ancien calcul', () => {
    // ⚠️ GABARIT ET SEUIL CHANGÉS LE 2026-07-31, pour une raison qui vaut d'être lue :
    // le relèvement NEAT (`desk` 1,20 → 1,30) a supprimé une GRANDE PART de ce bug à
    // la source. La date flatteuse et le déficit rogné avaient la MÊME cause — le
    // plancher mangeait le déficit, donc la perte réelle était bien plus lente que
    // la projection linéaire ne le supposait. Le déficit demandé étant maintenant
    // servi, les deux projections se rapprochent : sur le profil d'origine
    // (F 80 → 70 kg / 24 sem), l'écart tombe de 365+ jours à 68.
    //
    // LE BUG N'A PAS DISPARU POUR AUTANT — il est simplement redevenu un cas limite
    // au lieu d'être la norme. Mesuré après le relèvement, sur 4841 objectifs datés
    // féminins : écart maximum 358 jours, et le calcul linéaire promet encore une
    // date que la simulation refuse dans 12,1 % des cas. Le correctif A3 reste donc
    // load-bearing, et ce test le vérifie sur le profil qui l'expose le plus.
    const { sim, lin } = deuxDates(corps({ sex: 'female', weight_kg: 90, height_cm: 175, age: 35, sports: [], training_days_per_week: 0 }), 70, 8);
    expect(sim.projectable).toBe(true);
    expect(daysBetween(lin.projectedDate, sim.projectedDate)).toBeGreaterThan(300);
    expect(sim.reachableByDate).toBe(false);
  });

  it('homme en sèche : la correction ne le déplace quasiment pas', () => {
    // Pas d'escalade chez l'homme : seule la baisse du TDEE joue, elle est lente.
    const { sim, lin } = deuxDates(corps({ sex: 'male', weight_kg: 80, height_cm: 180 }), 74, 12);
    expect(Math.abs(daysBetween(lin.projectedDate, sim.projectedDate))).toBeLessThan(30);
  });

  it('LE BUG DE FOND — « rien n\'est bridé aujourd\'hui » ne vaut plus promesse', () => {
    // Aucun plafond ne mord le jour de la saisie, donc l'ancien calcul conclut
    // « atteignable » — alors que l'escalade, elle, arrive plus tard et fera glisser
    // la date. C'est exactement le mensonge que A3 corrige.
    // ⚠️ Gabarit changé le 2026-07-31 (F 55 → 47 kg / 24 sem, au lieu de F 65 → 62 kg
    // / 30 sem) : après le relèvement NEAT, l'ancien profil reçoit son déficit entier
    // et n'expose plus le cas. Trouvé par balayage, pas au jugé — le glissement y est
    // de 19 jours, modeste mais RÉEL, et c'est bien une promesse contredite.
    // ⚠️ RÉÉCRIT le 2026-08-03 (A15). Ce test exigeait `sim.clamped === false` et
    // `sim.floorCapped === false` : il constatait qu'AUCUN plafond ne mord le jour de
    // la saisie, et s'arrêtait là. Depuis A15, constater que la date ne tiendra pas
    // n'est plus sans effet — le moteur bascule sur le rythme sûr MAXIMAL, donc un
    // plafond mord bel et bien. Ce qui est vérifié ici reste le même FAIT (le repli
    // linéaire promet ce que la simulation dément) ; c'est la CONSÉQUENCE qui a
    // changé, et c'est une décision du fondateur, pas une dérive.
    const { sim, lin } = deuxDates(corps({ sex: 'female', weight_kg: 55, height_cm: 155, age: 35, training_days_per_week: 3, sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }] }), 47, 24);
    expect(lin.reachableByDate).toBe(true);   // l'ancien calcul promettait…
    // …la simulation, non — et le moteur en tire désormais une conséquence.
    expect(sim.maxRateApplied).toBe(true);
    // Creuser DAVANTAGE, jamais moins : c'est tout l'objet de la bascule.
    expect(sim.dailyKcalDelta).toBeLessThan(lin.dailyKcalDelta);
    expect(sim.clamped).toBe(true);
  });

  it('un objectif RÉELLEMENT tenable reste annoncé tenable', () => {
    // Le correctif ne doit pas rendre le produit pessimiste par principe : sans quoi
    // on remplacerait un mensonge par un autre.
    const { sim } = deuxDates(corps({ sex: 'male', weight_kg: 80, height_cm: 180 }), 77, 30);
    expect(sim.reachableByDate).toBe(true);
    expect(sim.projectable).toBe(true);
    expect(daysBetween(sim.projectedDate, sim.targetDate)).toBeGreaterThanOrEqual(0);
  });

  it('prise de masse : projetée au coût du kg GAGNÉ, et tenable', () => {
    const p = corps({ sex: 'male', weight_kg: 70, height_cm: 178, age: 27, goal: 'lean_bulk' });
    const { sim } = deuxDates(p, 76, 20);
    expect(sim.direction).toBe('gain');
    expect(sim.reachableByDate).toBe(true);
  });

  it('la zone de maintien vaut arrivée (sinon les 300 derniers grammes calent)', () => {
    // Le moteur bascule en maintien à MAINTAIN_EPS_KG près : viser le poids au
    // gramme faisait annoncer « pas de date » sur des objectifs parfaitement sains.
    const { sim } = deuxDates(corps({ sex: 'male', weight_kg: 80, height_cm: 180 }), 79.9, 8);
    expect(sim.projectable).toBe(true);
  });

  it('déterministe, et borné en temps (le core loop reste sous la seconde)', () => {
    const p0 = corps({ sex: 'female', weight_kg: 80, height_cm: 170, age: 35 });
    const a = deuxDates(p0, 70, 24).sim;
    const b = deuxDates(p0, 70, 24).sim;
    expect(a.projectedDate).toBe(b.projectedDate);
    const t0 = Date.now();
    for (let i = 0; i < 30; i++) deuxDates(p0, 70, 24);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  // A14 — le cas remonté par le fondateur, capturé tel quel. L'écran « Objectif
  // daté » affichait les MÊMES chiffres pour les 5 échéances proposées, parce que
  // ce n'est pas l'échéance qui pilote mais le plancher de sécurité. Ce test ne
  // valide pas ce comportement (il est correct : on ne creuse pas sous le
  // plancher) — il verrouille le fait que le statut DIT que la date ne tiendra
  // pas. C'est cette information-là que l'écran doit afficher au lieu d'affirmer
  // « Cible le <date> ».
  it('A14 — cible hors de portée : chaque échéance sert le MÊME rythme, et le dit', () => {
    const p0 = corps({ sex: 'male', weight_kg: 83, height_cm: 180, body_fat_pct: 18 });
    const HORIZONS = [4, 8, 12, 16, 24];
    const vus = HORIZONS.map((w) => deuxDates(p0, 70, w).sim);

    // Le plancher borne le déficit → rythme identique quelle que soit la date.
    const rythmes = new Set(vus.map((s) => s.safeWeeklyKg));
    expect(rythmes.size).toBe(1);
    expect(vus.every((s) => s.floorCapped)).toBe(true);

    // …et AUCUNE des échéances n'est tenable. Si un jour l'une le devient, ce test
    // doit rougir : l'écran s'appuie sur `reachableByDate` pour ne pas mentir.
    expect(vus.every((s) => !s.reachableByDate)).toBe(true);
    expect(vus.every((s) => s.projectable)).toBe(true);

    // L'écart n'est pas cosmétique : la date annoncée pour « 4 sem » est dépassée
    // de plusieurs mois. Un adverbe qui minimiserait ça serait un mensonge poli.
    const ecartJours = daysBetween(objectif(p0, 70, 4).target_date, vus[0].projectedDate);
    expect(ecartJours).toBeGreaterThan(180);
  });

  // La puce « N sem · tenable » de l'éditeur repose ENTIÈREMENT sur cet invariant :
  // adopter la date projetée doit rendre l'objectif atteignable. Sans lui, un tap
  // renverrait une date encore plus lointaine et l'écran courrait après lui-même.
  //
  // ⚠️ RENFORCÉ le 2026-08-03 (A15) — il exigeait AVANT que le gros écart NE tienne
  // PAS (`f.apres.reachableByDate === false`), et cette exception était le défaut
  // lui-même, pas une propriété à protéger : le rythme requis se calculait en ligne
  // droite alors que l'arrivée est simulée, donc adopter la date faisait servir moins
  // de déficit et la date glissait de 96 jours. Depuis que le moteur sert le rythme
  // sûr MAXIMAL quand la date ne tient pas, la date projetée est un POINT FIXE par
  // construction. Le test exige donc maintenant qu'elle tienne DANS LES DEUX CAS.
  it('A15 — adopter la date projetée tient TOUJOURS : c\'est un point fixe', () => {
    // « Adopter la date projetée » = ce que fait la puce de l'éditeur.
    const adopter = (p0: UserProfile, cible: number, depuisSemaines: number) => {
      const avant = deuxDates(p0, cible, depuisSemaines).sim;
      const gt: GoalTarget = {
        start_weight_kg: p0.weight_kg, start_date: JOUR,
        target_weight_kg: cible, target_date: avant.projectedDate,
      };
      const p: UserProfile = { ...p0, goal_target: gt };
      const apres = datedGoalStatus(gt, p, JOUR, p.tdee_kcal, planFloorKcal(p, JOUR), makeWeeklyProjector(p))!;
      return { avant, apres };
    };

    // CAS NOMINAL — la puce est proposée, et elle tient.
    const h = adopter(corps({ sex: 'male', weight_kg: 83, height_cm: 180, body_fat_pct: 18 }), 70, 8);
    expect(h.avant.reachableByDate).toBe(false);
    expect(h.apres.reachableByDate).toBe(true);

    // GROS ÉCART — le cas qui NE tenait pas avant A15, et qui est la raison du chantier.
    // La femme de 78 kg visant 65 : la date promise glissait de 96 jours dès qu'elle
    // l'adoptait. Le moteur sert désormais le rythme sûr maximal tant que la date
    // n'est pas tenue, donc le rythme ne dépend plus de l'échéance et la date tient.
    const f = adopter(corps({ sex: 'female', weight_kg: 78, height_cm: 168, body_fat_pct: 32 }), 65, 8);
    expect(f.avant.reachableByDate).toBe(false);
    expect(f.apres.reachableByDate).toBe(true);
    // Et elle y arrive PLUS TÔT qu'en servant le rythme « juste requis » : le point
    // fixe de l'ancien moteur était 157 jours plus loin, pour 209 kcal/j de moins.
    expect(daysBetween(JOUR, f.apres.projectedDate))
      .toBeLessThanOrEqual(daysBetween(JOUR, f.avant.projectedDate) + 1);
  });

  // ⚠️ LE GARDE-FOU QUI COMPTE : A15 fait creuser DAVANTAGE, donc la question n'est
  // plus « la date est-elle honnête ? » mais « est-ce qu'on sort de l'enveloppe de
  // sécurité pour y arriver ? ». La réponse doit être non, sur toute la grille.
  it('A15 — creuser plus ne franchit AUCUN garde-fou', () => {
    const grille = [
      { sex: 'female' as const, weight_kg: 78, height_cm: 168, body_fat_pct: 32, cible: 65 },
      { sex: 'female' as const, weight_kg: 70, height_cm: 166, body_fat_pct: 30, cible: 62 },
      { sex: 'female' as const, weight_kg: 65, height_cm: 165, body_fat_pct: 27, cible: 58 },
      { sex: 'female' as const, weight_kg: 55, height_cm: 158, body_fat_pct: 22, cible: 50 },
      { sex: 'male' as const, weight_kg: 95, height_cm: 182, body_fat_pct: 26, cible: 82 },
      { sex: 'male' as const, weight_kg: 83, height_cm: 178, body_fat_pct: 18, cible: 70 },
      { sex: 'male' as const, weight_kg: 72, height_cm: 175, body_fat_pct: 14, cible: 68 },
    ];
    for (const g of grille) {
      for (const semaines of [4, 8, 12, 16, 24, 52]) {
        const { cible, ...corpsArgs } = g;
        const p0 = corps(corpsArgs);
        const { sim } = deuxDates(p0, cible, semaines);
        const etiquette = `${g.sex} ${g.weight_kg}→${cible} à ${semaines} sem`;

        // 1. Le rythme SERVI ne dépasse jamais le rythme sûr, modulé par l'adiposité.
        const maxSur = (maxWeeklyLossPct(p0) / 100) * p0.weight_kg;
        expect(Math.abs(sim.safeWeeklyKg), etiquette).toBeLessThanOrEqual(maxSur + 0.05);

        // 2. Le déficit DEMANDÉ ne dépasse jamais 25 % du TDEE.
        expect(sim.dailyKcalDelta, etiquette)
          .toBeGreaterThanOrEqual(-Math.round(MAX_DEFICIT_TDEE_RATIO * p0.tdee_kcal) - 1);

        // 3. La cible SERVIE ne descend jamais sous le plancher d'énergie disponible —
        //    c'est le hard block de CLAUDE.md §6, et A15 ne l'effleure pas.
        const p: UserProfile = { ...p0, goal_target: objectif(p0, cible, semaines) };
        expect(recalcProfile(p).target_kcal, etiquette)
          .toBeGreaterThanOrEqual(planFloorKcal(p, JOUR) - 1);
      }
    }
  });

  // ⚠️ RECADRÉ le 2026-08-03 (A15) — et c'est le cas d'école du garde-fou qui cesse
  // de garder sans rougir. Ce test s'appelait « la projection ne déplace AUCUNE
  // calorie » et protégeait l'invariant de P1.6. A15 déplace délibérément des
  // calories… et le test est resté VERT, parce que ses deux gabarits sont
  // atteignables des deux côtés : il ne touchait jamais le cas qui change.
  // Un test qu'on n'a jamais vu rougir ne prouve pas ce que son nom annonce.
  // Il vérifie donc maintenant la FRONTIÈRE, dans les deux sens.
  it('la projection ne déplace de calories QUE si la date ne tient pas', () => {
    // Côté P1.6 — objectif atteignable : simuler ne change rien à ce qui est servi.
    for (const o of [
      { sex: 'female' as const, weight_kg: 80, height_cm: 170, age: 35 },
      { sex: 'male' as const, weight_kg: 80, height_cm: 180 },
    ]) {
      const { sim, lin } = deuxDates(corps(o), o.weight_kg - 6, 20);
      expect(sim.reachableByDate, `${o.sex} ${o.weight_kg} doit être atteignable`).toBe(true);
      expect(sim.maxRateApplied).toBe(false);
      expect(sim.dailyKcalDelta).toBe(lin.dailyKcalDelta);
      expect(sim.safeWeeklyKg).toBe(lin.safeWeeklyKg);
    }

    // Côté A15 — objectif hors de portée : les calories DOIVENT bouger, sinon le
    // correctif n'existe pas. C'est l'assertion qui manquait et qui aurait rougi.
    // ⚠️ GABARIT REMPLACÉ le 2026-08-27. Le précédent (F 78 kg → 65 kg en 52 sem) était
    // **À 3 kcal DE BMR** de la frontière d'atteignabilité : son propre commentaire le
    // disait, et le déclarer `measured` était la seule chose qui le tenait du bon côté.
    // Le correctif 02-01 a déplacé le BMR de ce corps de 10 kcal — assez pour le faire
    // basculer. Un test posé sur une falaise finit toujours par tomber.
    // ➡️ Le remplaçant est choisi pour sa MARGE, trouvée par balayage : sa date projetée
    // est à ~110 semaines, donc l'échéance de 40 semaines n'est pas près de tenir. La
    // marge est VÉRIFIÉE plus bas plutôt que promise en commentaire.
    const CORPS_DUR = { sex: 'female' as const, weight_kg: 95, height_cm: 165, body_fat_pct: 32, body_fat_source: 'measured' as const };
    const { sim: dur, lin: durLin } = deuxDates(corps(CORPS_DUR), 82, 40);
    expect(dur.reachableByDate).toBe(false);
    expect(dur.maxRateApplied).toBe(true);
    expect(dur.dailyKcalDelta).toBeLessThan(durLin.dailyKcalDelta);
    // La MARGE, comptée : il faut encore 30 semaines de plus pour que ça ne tienne
    // toujours pas. Sans cette ligne, un gabarit revenu au bord de la frontière
    // repasserait vert et le test recommencerait à ne rien prouver.
    expect(deuxDates(corps(CORPS_DUR), 82, 70).sim.reachableByDate).toBe(false);
  });
});
