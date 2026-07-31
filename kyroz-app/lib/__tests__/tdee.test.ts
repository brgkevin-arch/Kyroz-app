import { describe, it, expect } from 'vitest';
import {
  calculateBMR, calculateTDEE, calculateMacros, macrosPercent, recalcProfile,
  leanBodyMass, validateProfile, recommendedProteinPerKg, kcalFromMacros,
  MIN_KCAL, MIN_AGE, DEFAULT_CARB_RATIO, NEAT_PAL, neatPal, proteinTarget, DEFAULT_NEAT_LEVEL,
  computePlan,
} from '../tdee';
import { fatFreeMassKg } from '../safety';
import { exerciseKcalPerDay, totalSessionsPerWeek } from '../sport';
import { normalizeProfileActivity, reconcileCloudSports } from '../syncGuard';
import { makeProfile } from './helpers';

describe('BMR', () => {
  it('Mifflin-St Jeor sans %MG (différencié par sexe)', () => {
    // 10×90 + 6.25×180 − 5×30 = 1875 ; +5 homme / −161 femme
    expect(calculateBMR('male', 90, 180, 30)).toBe(1880);
    expect(calculateBMR('female', 90, 180, 30)).toBe(1714);
  });

  it('Katch-McArdle quand le %MG est connu (même valeur pour les 2 sexes)', () => {
    // LBM = 90×0.85 = 76.5 → 370 + 21.6×76.5 = 2022.4
    expect(calculateBMR('male', 90, 180, 30, 15)).toBe(2022);
    expect(calculateBMR('female', 90, 180, 30, 15)).toBe(2022);
  });

  it('clamp du %MG aberrant, PAR SEXE (P0.4)', () => {
    expect(leanBodyMass('male', 90, 80)).toBeCloseTo(36);        // clampé à 60 %
    expect(leanBodyMass('male', 90, 1)).toBeCloseTo(90 * 0.95);  // clampé à 5 % (gras essentiel)
    // 3 % est impossible chez une femme : borne basse à 12 %.
    expect(leanBodyMass('female', 90, 3)).toBeCloseTo(90 * 0.88);
    expect(leanBodyMass('female', 90, 80)).toBeCloseTo(90 * 0.35); // clampé à 65 %
  });
});

describe('TDEE', () => {
  const H = { sex: 'male' as const, weight_kg: 90, height_cm: 180, age: 30 };

  it('chemin UNIQUE : BMR × NEAT + dépense sport, quel que soit le profil', () => {
    // BMR 1880 (Mifflin). Sans sport : le NEAT seul.
    expect(calculateTDEE(H)).toBe(Math.round(1880 * NEAT_PAL.desk));
    const sports = [{ type: 'musculation' as const, sessions_per_week: 4, minutes_per_session: 60 }];
    const perDay = exerciseKcalPerDay(sports, 90);
    expect(calculateTDEE({ ...H, sports })).toBe(Math.round(1880 * NEAT_PAL.desk + perDay));
  });

  it('le niveau NEAT pilote la base, pas le nombre de séances', () => {
    // Table relevée le 2026-07-31 (cf. NEAT_PAL) : 1,30 / 1,35 / 1,40 / 1,45.
    expect(calculateTDEE({ ...H, neat_level: 'desk' })).toBe(Math.round(1880 * 1.30));
    expect(calculateTDEE({ ...H, neat_level: 'light' })).toBe(Math.round(1880 * 1.35));
    expect(calculateTDEE({ ...H, neat_level: 'active' })).toBe(Math.round(1880 * 1.40));
    expect(calculateTDEE({ ...H, neat_level: 'physical' })).toBe(Math.round(1880 * 1.45));
  });

  it('NEAT absent ou inconnu → défaut « bureau », jamais un surplus inventé', () => {
    expect(neatPal(undefined)).toBe(NEAT_PAL.desk);
    expect(neatPal(null)).toBe(NEAT_PAL.desk);
    expect(neatPal('zumba' as any)).toBe(NEAT_PAL.desk);
    // ⚠️ L'assertion `NEAT_PAL.desk < 1.3` est TOMBÉE le 2026-07-31 : c'est
    // précisément la valeur qui a été relevée. Ce qu'elle protégeait vraiment —
    // « le défaut ne doit pas inventer de dépense » — est reformulé en invariant
    // de STRUCTURE, qui survivra au prochain réglage de la table :
    //  · le défaut est le cran le PLUS BAS (aucune dépense supposée en trop) ;
    //  · la table reste sous 1,50, seuil au-delà duquel les niveaux classiques
    //    incluent l'exercice, déjà compté à part par les MET nets.
    expect(NEAT_PAL[DEFAULT_NEAT_LEVEL]).toBe(Math.min(...Object.values(NEAT_PAL)));
    expect(Math.max(...Object.values(NEAT_PAL))).toBeLessThan(1.5);
  });

  it('P1.1 — plus de marche d\'escalier : déclarer 15 min de marche ne fait pas bondir le TDEE', () => {
    // Avant l'étape 3, cocher UNE séance de 15 min (le minimum saisissable) faisait
    // basculer de `BMR × multiplicateur legacy` vers `BMR × 1,3 + MET` : +116 à +245
    // kcal/jour, positif dans 100 % des cas mesurés. Le saut doit maintenant valoir
    // exactement ce que coûte la séance — c'est-à-dire presque rien.
    const sansSport = calculateTDEE(H);
    const uneMarche = calculateTDEE({
      ...H, sports: [{ type: 'marche_rapide', sessions_per_week: 1, minutes_per_session: 15 }],
    });
    expect(uneMarche - sansSport).toBeLessThan(15);
    expect(uneMarche).toBeGreaterThanOrEqual(sansSport);
  });

  it('P1.1 — continuité : chaque séance ajoutée coûte le même incrément', () => {
    const at = (n: number) => calculateTDEE({
      ...H, sports: [{ type: 'musculation', sessions_per_week: n, minutes_per_session: 60 }],
    });
    const pas = [1, 2, 3, 4, 5, 6, 7].map((n) => at(n) - at(n - 1 || 0));
    // Les marches legacy valaient +311 kcal entre 2 et 3 séances, puis 0 entre 3 et 4.
    for (const p of pas.slice(1)) expect(Math.abs(p - pas[1])).toBeLessThanOrEqual(1);
  });

  it('recalcProfile utilise les sports ET le NEAT du profil', () => {
    const p = makeProfile({
      sports: [{ type: 'course', sessions_per_week: 3, minutes_per_session: 45 }],
      neat_level: 'active',
    });
    const bmr = calculateBMR(p.sex, p.weight_kg, p.height_cm, p.age, p.body_fat_pct);
    const perDay = exerciseKcalPerDay(p.sports, p.weight_kg);
    expect(recalcProfile(p).tdee_kcal).toBe(Math.round(bmr * NEAT_PAL.active + perDay));
  });
});

describe('calculateMacros (mode auto)', () => {
  it('respecte le filet absolu 1500/1200 sur un gabarit léger (garde-fou §6)', () => {
    // Gabarit léger MAIS éligible (IMC 20,2 / 18,8) : le plancher d'énergie
    // disponible (30 × masse maigre) tombe sous le filet absolu → c'est lui qui
    // protège. Cf. lib/safety.ts (P0.1).
    //
    // Les gabarits d'origine (50 kg/1 m 70, 45 kg/1 m 60) étaient en réalité sous
    // IMC 18,5 : depuis P0.6 leur plan est ramené à la maintenance AVANT que le
    // filet absolu n'ait son mot à dire — ils ne testaient donc plus ce qu'ils
    // annonçaient. Le cas est vérifié à part, juste en dessous.
    const m = calculateMacros(1900, 'cut_aggressive', makeProfile({ weight_kg: 55, height_cm: 165 }));
    expect(m.target_kcal).toBe(MIN_KCAL.male);
    const f = calculateMacros(1500, 'cut_aggressive', makeProfile({ sex: 'female', weight_kg: 48, height_cm: 160 }));
    expect(f.target_kcal).toBe(MIN_KCAL.female);
  });

  it('sous IMC 18,5, le filet absolu ne sert même plus : retour à la maintenance (P0.6)', () => {
    const m = calculateMacros(1600, 'cut_aggressive', makeProfile({ weight_kg: 50, height_cm: 170 }));
    expect(m.target_kcal).toBe(1600);                     // maintenance, pas 1500
    expect(m.flags).toContain('UNDERWEIGHT_NO_DEFICIT');
  });

  it('protéines : base POIDS AJUSTÉ, bornée en g/kg de masse maigre (P0.2)', () => {
    const tdee = 2914;
    // Sans %MG déclaré, la masse maigre est ESTIMÉE (Deurenberg) — elle n'est plus
    // assimilée au poids de corps, qui sur-dosait les gabarits gras.
    const noBf = calculateMacros(tdee, 'cut', makeProfile());
    expect(noBf.protein_g).toBe(proteinTarget(makeProfile(), 'cut')); // 162
    expect(noBf.protein_g).toBeLessThan(Math.round(90 * 2.2));        // < 198 (ancien calcul)

    // Plus le sujet est sec, plus la cible monte — monotone, sans jamais dépasser
    // 2,6 g/kg de masse maigre.
    const bf20 = calculateMacros(tdee, 'cut', makeProfile({ body_fat_pct: 20 }));
    const bf10 = calculateMacros(tdee, 'cut', makeProfile({ body_fat_pct: 10 }));
    expect(bf20.protein_g).toBe(168);
    expect(bf10.protein_g).toBe(183);
    expect(bf10.protein_g).toBeGreaterThan(bf20.protein_g);
    expect(bf10.protein_g / fatFreeMassKg(makeProfile({ body_fat_pct: 10 }))).toBeLessThanOrEqual(2.61);
  });

  it('kcal des macros ≈ kcal cible (cohérence 4/4/9)', () => {
    const m = calculateMacros(2914, 'cut', makeProfile());
    expect(Math.abs(kcalFromMacros(m.protein_g, m.carbs_g, m.fat_g) - m.target_kcal)).toBeLessThan(20);
  });
});

describe('macrosPercent (mode Perso %)', () => {
  it('kcal et protéines identiques au mode auto (suivent le poids)', () => {
    const tdee = 2914;
    const auto = calculateMacros(tdee, 'cut', makeProfile());
    const pct = macrosPercent(tdee, 'cut', makeProfile(), 55);
    expect(pct.target_kcal).toBe(auto.target_kcal);
    expect(pct.protein_g).toBe(auto.protein_g);
  });

  it('répartit le reste selon le ratio glucides/lipides', () => {
    const m = macrosPercent(2914, 'cut', makeProfile(), 55);
    const rest = m.target_kcal - m.protein_g * 4;
    expect(m.carbs_g * 4 / rest).toBeCloseTo(0.55, 1);
    expect(m.fat_g * 9 / rest).toBeCloseTo(0.45, 1);
  });

  it('protéine ajustable (g/kg) avec rééquilibrage à kcal constant', () => {
    const lo = macrosPercent(2914, 'cut', makeProfile(), 55, { proteinPerKg: 1.8 });
    const hi = macrosPercent(2914, 'cut', makeProfile(), 55, { proteinPerKg: 2.6 });
    // Base = MASSE MAIGRE (estimée si le %MG n'est pas déclaré), jamais le poids
    // de corps brut : sinon le mode « Perso % » annulait le correctif P0.2.
    const ffm = fatFreeMassKg(makeProfile());
    expect(lo.protein_g).toBe(Math.round(ffm * 1.8));
    expect(hi.protein_g).toBe(Math.round(ffm * 2.6));
    expect(lo.target_kcal).toBe(hi.target_kcal); // kcal inchangé
    expect(hi.carbs_g).toBeLessThan(lo.carbs_g); // le reste s'ajuste
  });

  it('ratio clampé 0–100, jamais de grammes négatifs', () => {
    const m = macrosPercent(2914, 'cut', makeProfile(), 150);
    expect(m.fat_g).toBeGreaterThanOrEqual(0);
    expect(m.carbs_g).toBeGreaterThanOrEqual(0);
  });
});

describe('recalcProfile', () => {
  it('auto : un nouveau poids recalcule TDEE et macros', () => {
    const p90 = recalcProfile(makeProfile({ weight_kg: 90 }));
    const p80 = recalcProfile(makeProfile({ weight_kg: 80 }));
    expect(p80.tdee_kcal).toBeLessThan(p90.tdee_kcal);
    expect(p80.target_protein_g).toBeLessThan(p90.target_protein_g);
  });

  it('percent : utilise carb_ratio + protein_per_kg du profil', () => {
    const p = recalcProfile(makeProfile({ macro_mode: 'percent', carb_ratio: 40, protein_per_kg: 2.0 }));
    expect(p.target_protein_g).toBe(Math.round(fatFreeMassKg(makeProfile()) * 2.0));
    const rest = p.target_kcal - p.target_protein_g * 4;
    expect(p.target_carbs_g * 4 / rest).toBeCloseTo(0.4, 1);
  });

  it('percent sans réglages : protéines identiques au mode auto (pas de divergence)', () => {
    const p = recalcProfile(makeProfile({ macro_mode: 'percent' }));
    expect(p.target_protein_g).toBe(proteinTarget(makeProfile(), 'cut'));
    const rest = p.target_kcal - p.target_protein_g * 4;
    expect(p.target_carbs_g * 4 / rest).toBeCloseTo(DEFAULT_CARB_RATIO / 100, 1);
  });

  it('manual (legacy) : les GRAMMES font foi, TDEE et plancher recalculés', () => {
    const base = makeProfile({ macro_mode: 'manual', target_protein_g: 123, target_kcal: 2000 });
    const p = recalcProfile({ ...base, weight_kg: 70 });
    // Protéines et lipides choisis : intacts.
    expect(p.target_protein_g).toBe(123);
    expect(p.target_fat_g).toBe(base.target_fat_g);
    // `target_kcal` se DÉRIVE des grammes (et non de l'ancien `target_kcal` stocké,
    // qui faisait cliquet : la cible ne redescendait plus quand le plancher baissait).
    const fromGrams = kcalFromMacros(p.target_protein_g, p.target_carbs_g, p.target_fat_g);
    expect(Math.abs(p.target_kcal - fromGrams)).toBeLessThanOrEqual(4);
    expect(p.tdee_kcal).not.toBe(base.tdee_kcal);
  });

  it('manual : idempotent — pas de cliquet sur la cible ni de drapeau qui disparaît', () => {
    const base = makeProfile({
      sex: 'female', weight_kg: 62, height_cm: 165, body_fat_pct: 24, macro_mode: 'manual',
      target_kcal: 1250, target_protein_g: 120, target_carbs_g: 100, target_fat_g: 35,
    });
    const one = computePlan(base, '2026-07-21');
    const two = computePlan(one.profile, '2026-07-21');
    expect(two.profile.target_kcal).toBe(one.profile.target_kcal);
    expect(two.profile.target_carbs_g).toBe(one.profile.target_carbs_g);
    expect(two.flags).toEqual(one.flags);            // FLOOR_APPLIED ne s'évapore plus
    expect(one.flags).toContain('FLOOR_APPLIED');
  });
});

describe('validateProfile (garde-fous §6)', () => {
  it('bloque les mineurs (18 ans — relevé de 16 en P0.4)', () => {
    expect(MIN_AGE).toBe(18);
    expect(validateProfile('male', MIN_AGE - 1, 2000)).toMatch(/18 ans/);
    expect(validateProfile('male', MIN_AGE, 2000)).toBeNull();
  });
  it('bloque sous le plancher kcal', () => {
    expect(validateProfile('male', 25, 1400)).toMatch(/1500/);
    expect(validateProfile('female', 25, 1100)).toMatch(/1200/);
    expect(validateProfile('female', 25, 1200)).toBeNull();
  });
});

describe('recommendedProteinPerKg', () => {
  it('repères par objectif', () => {
    expect(recommendedProteinPerKg('cut_aggressive')).toBe(2.4);
    expect(recommendedProteinPerKg('cut')).toBe(2.2);
    expect(recommendedProteinPerKg('maintain')).toBe(1.8);
  });
});

// Verrou « une seule valeur de TDEE, un seul chemin, déterministe » (work-order).
describe('Unicité & stabilité du TDEE', () => {
  it('recalcProfile est déterministe et idempotent (auto, %MG, sports, percent)', () => {
    const variants = [
      makeProfile(),
      makeProfile({ body_fat_pct: 18 }),
      makeProfile({ sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }] }),
      makeProfile({ macro_mode: 'percent', carb_ratio: 50, protein_per_kg: 2.0 }),
    ];
    for (const p of variants) {
      const once = recalcProfile(p);
      const twice = recalcProfile(once);
      expect(Number.isFinite(once.tdee_kcal)).toBe(true);
      expect(twice.tdee_kcal).toBe(once.tdee_kcal);
      expect(twice.target_kcal).toBe(once.target_kcal);
      expect(twice.target_protein_g).toBe(once.target_protein_g);
    }
  });

  it('onboarding ≡ recalc : la valeur stockée = toute recompute ultérieure', () => {
    // L'onboarding construit le profil avec training_days = totalSessionsPerWeek(sports)
    // PUIS passe par recalcProfile (producteur unique). Une recompute ultérieure
    // (check-in poids, éditeur profil) doit donner EXACTEMENT le même TDEE.
    const sports = [{ type: 'course' as const, sessions_per_week: 3, minutes_per_session: 45 }];
    const draft = makeProfile({
      sports, training_days_per_week: totalSessionsPerWeek(sports),
      body_fat_pct: 20, tdee_kcal: 0, target_kcal: 0,
    });
    const stored = recalcProfile(draft);   // onboarding
    const later = recalcProfile(stored);   // check-in / éditeur
    expect(stored.tdee_kcal).toBeGreaterThan(0);
    expect(later.tdee_kcal).toBe(stored.tdee_kcal);
  });

  it('P1.1 — UNE seule formule : `training_days_per_week` ne pilote plus le TDEE', () => {
    const bmr = calculateBMR('male', 90, 180, 30); // Mifflin (pas de %MG)
    // Il y avait deux méthodes choisies selon que `sports` était rempli : c'est
    // exactement ce qui produisait la marche d'escalier. Sans séance, le TDEE ne
    // dépend plus que du NEAT — le compteur de séances peut valoir n'importe quoi.
    for (const days of [0, 3, 7]) {
      const p = recalcProfile(makeProfile({ sports: [], training_days_per_week: days }));
      expect(p.tdee_kcal, `training_days=${days}`).toBe(Math.round(bmr * NEAT_PAL.desk));
    }
    const avecSport = recalcProfile(makeProfile({ sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }] }));
    expect(avecSport.tdee_kcal).toBe(Math.round(bmr * NEAT_PAL.desk + exerciseKcalPerDay(avecSport.sports, 90)));
  });

  it('FRONTIÈRE SYNCHRO (documentée, hors périmètre) : sports perdus + training_days conservé → bascule de méthode', () => {
    // Cet état (sports=[] ET training_days>0) n'est JAMAIS produit par l'UI locale :
    // il vient d'une persistance corrompue/partielle (round-trip cloud). On le
    // verrouille pour rendre la bascule VISIBLE. À corriger côté SYNC, pas ici.
    const sports = [{ type: 'musculation' as const, sessions_per_week: 3, minutes_per_session: 60 }];
    const coherent = recalcProfile(makeProfile({ sports, training_days_per_week: totalSessionsPerWeek(sports) }));
    const corrupted = recalcProfile({ ...coherent, sports: [] }); // training_days reste > 0
    expect(corrupted.tdee_kcal).not.toBe(coherent.tdee_kcal); // ← signature de la frontière C
  });

  it('P3.3 RÉSOLU : la couche sync referme la frontière → plus de saut de TDEE', () => {
    // Même scénario que ci-dessus, mais en passant par la normalisation de
    // persistance (fix P3.3). Une ligne cloud dégradée (sports perdu) hydratée
    // par-dessus un local sain ne fait PLUS basculer la méthode : sports préservé
    // puis compteur recalé → le TDEE reste identique au profil cohérent.
    const sports = [{ type: 'musculation' as const, sessions_per_week: 3, minutes_per_session: 60 }];
    const coherent = recalcProfile(makeProfile({ sports, training_days_per_week: totalSessionsPerWeek(sports) }));
    const cloudDegrade = { ...coherent, sports: [] }; // ligne cloud partielle : sports vidé
    const healed = recalcProfile(
      normalizeProfileActivity(reconcileCloudSports(cloudDegrade, coherent))!
    );
    expect(healed.tdee_kcal).toBe(coherent.tdee_kcal); // ← le saut est neutralisé
  });
});
