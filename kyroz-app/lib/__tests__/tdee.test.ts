import { describe, it, expect } from 'vitest';
import {
  calculateBMR, calculateTDEE, calculateMacros, macrosPercent, recalcProfile,
  leanBodyMass, validateProfile, recommendedProteinPerKg, kcalFromMacros,
  MIN_KCAL, MIN_AGE, DEFAULT_CARB_RATIO, NEAT_BASE_PAL,
} from '../tdee';
import { exerciseKcalPerDay, totalSessionsPerWeek } from '../sport';
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

  it('clamp du %MG aberrant (3–60)', () => {
    expect(leanBodyMass(90, 80)).toBeCloseTo(36); // clampé à 60%
    expect(leanBodyMass(90, 1)).toBeCloseTo(90 * 0.97); // clampé à 3%
  });
});

describe('TDEE', () => {
  it('multiplicateur selon les séances/semaine (legacy, sans sports)', () => {
    expect(calculateTDEE('male', 90, 180, 30, 0)).toBe(Math.round(1880 * 1.2));
    expect(calculateTDEE('male', 90, 180, 30, 4)).toBe(Math.round(1880 * 1.55));
    expect(calculateTDEE('male', 90, 180, 30, 7)).toBe(Math.round(1880 * 1.9));
  });

  it('méthode MET quand des sports sont renseignés : BMR×1.3 + dépense sport/jour', () => {
    // BMR 1880 (Mifflin). 4× muscu 60 min @90kg.
    const perDay = exerciseKcalPerDay(
      [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }], 90,
    );
    expect(calculateTDEE('male', 90, 180, 30, 4, undefined,
      [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    )).toBe(Math.round(1880 * NEAT_BASE_PAL + perDay));
  });

  it('non-régression : sports vide/undefined → repli legacy à l\'identique', () => {
    expect(calculateTDEE('male', 90, 180, 30, 4, undefined, [])).toBe(Math.round(1880 * 1.55));
    expect(calculateTDEE('male', 90, 180, 30, 4, undefined, undefined)).toBe(Math.round(1880 * 1.55));
  });

  it('recalcProfile utilise les sports du profil', () => {
    const p = makeProfile({ sports: [{ type: 'course', sessions_per_week: 3, minutes_per_session: 45 }] });
    const bmr = calculateBMR(p.sex, p.weight_kg, p.height_cm, p.age, p.body_fat_pct);
    const perDay = exerciseKcalPerDay(p.sports, p.weight_kg);
    expect(recalcProfile(p).tdee_kcal).toBe(Math.round(bmr * NEAT_BASE_PAL + perDay));
  });
});

describe('calculateMacros (mode auto)', () => {
  it('respecte le plancher kcal (garde-fou §6)', () => {
    // TDEE très bas + sèche agressive → ne descend jamais sous MIN_KCAL
    const m = calculateMacros(1600, 'cut_aggressive', 50, 'male');
    expect(m.target_kcal).toBe(MIN_KCAL.male);
    const f = calculateMacros(1200, 'cut_aggressive', 45, 'female');
    expect(f.target_kcal).toBe(MIN_KCAL.female);
  });

  it('protéines : calage masse maigre AVEC plancher g/kg de corps', () => {
    const tdee = 2914;
    // Sans %MG : base = poids, coef (2.2) ≥ plancher (1.9) → plancher inopérant.
    const noBf = calculateMacros(tdee, 'cut', 90, 'male');
    expect(noBf.protein_g).toBe(Math.round(90 * 2.2)); // 198 (inchangé)

    // %MG élevé (20 % > seuil de bascule 13,6 %) : le plancher 1,9 g/kg de corps
    // prend le relais. Sans lui : 72 × 2.2 = 158 (1,76 g/kg corps → trop bas en sèche).
    const bf20 = calculateMacros(tdee, 'cut', 90, 'male', 20);
    expect(bf20.protein_g).toBe(Math.round(90 * 1.9));            // 171 (plancher)
    expect(bf20.protein_g).toBeGreaterThan(Math.round(90 * 0.8 * 2.2)); // > ancien (buggé)

    // Profil sec (10 % < seuil) : le calage masse maigre reste dominant (amélioration
    // monotone — le plancher ne baisse jamais un profil déjà bien dosé).
    const bf10 = calculateMacros(tdee, 'cut', 90, 'male', 10);
    expect(bf10.protein_g).toBe(Math.round(90 * 0.9 * 2.2)); // 178 (lean-mass gagne)
  });

  it('kcal des macros ≈ kcal cible (cohérence 4/4/9)', () => {
    const m = calculateMacros(2914, 'cut', 90, 'male');
    expect(Math.abs(kcalFromMacros(m.protein_g, m.carbs_g, m.fat_g) - m.target_kcal)).toBeLessThan(20);
  });
});

describe('macrosPercent (mode Perso %)', () => {
  it('kcal et protéines identiques au mode auto (suivent le poids)', () => {
    const tdee = 2914;
    const auto = calculateMacros(tdee, 'cut', 90, 'male');
    const pct = macrosPercent(tdee, 'cut', 90, 'male', undefined, 55);
    expect(pct.target_kcal).toBe(auto.target_kcal);
    expect(pct.protein_g).toBe(auto.protein_g);
  });

  it('répartit le reste selon le ratio glucides/lipides', () => {
    const m = macrosPercent(2914, 'cut', 90, 'male', undefined, 55);
    const rest = m.target_kcal - m.protein_g * 4;
    expect(m.carbs_g * 4 / rest).toBeCloseTo(0.55, 1);
    expect(m.fat_g * 9 / rest).toBeCloseTo(0.45, 1);
  });

  it('protéine ajustable (g/kg) avec rééquilibrage à kcal constant', () => {
    const lo = macrosPercent(2914, 'cut', 90, 'male', undefined, 55, 1.8);
    const hi = macrosPercent(2914, 'cut', 90, 'male', undefined, 55, 2.6);
    expect(lo.protein_g).toBe(Math.round(90 * 1.8));
    expect(hi.protein_g).toBe(Math.round(90 * 2.6));
    expect(lo.target_kcal).toBe(hi.target_kcal); // kcal inchangé
    expect(hi.carbs_g).toBeLessThan(lo.carbs_g); // le reste s'ajuste
  });

  it('ratio clampé 0–100, jamais de grammes négatifs', () => {
    const m = macrosPercent(2914, 'cut', 90, 'male', undefined, 150);
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
    expect(p.target_protein_g).toBe(Math.round(90 * 2.0));
    const rest = p.target_kcal - p.target_protein_g * 4;
    expect(p.target_carbs_g * 4 / rest).toBeCloseTo(0.4, 1);
  });

  it('percent sans réglages : retombe sur les défauts', () => {
    const p = recalcProfile(makeProfile({ macro_mode: 'percent' }));
    expect(p.target_protein_g).toBe(Math.round(90 * recommendedProteinPerKg('cut')));
    const rest = p.target_kcal - p.target_protein_g * 4;
    expect(p.target_carbs_g * 4 / rest).toBeCloseTo(DEFAULT_CARB_RATIO / 100, 1);
  });

  it('manual (legacy) : grammes figés, TDEE seul mis à jour', () => {
    const base = makeProfile({ macro_mode: 'manual', target_protein_g: 123, target_kcal: 2000 });
    const p = recalcProfile({ ...base, weight_kg: 70 });
    expect(p.target_protein_g).toBe(123);
    expect(p.target_kcal).toBe(2000);
    expect(p.tdee_kcal).not.toBe(base.tdee_kcal);
  });
});

describe('validateProfile (garde-fous §6)', () => {
  it('bloque < 16 ans', () => {
    expect(validateProfile('male', MIN_AGE - 1, 2000)).toMatch(/16 ans/);
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

  it('sélection de méthode = fonction du profil seul (MET si sports, multiplicateur sinon)', () => {
    const bmr = calculateBMR('male', 90, 180, 30); // Mifflin (pas de %MG)
    const sansSport = recalcProfile(makeProfile({ sports: [], training_days_per_week: 3 }));
    expect(sansSport.tdee_kcal).toBe(Math.round(bmr * 1.55)); // multiplicateur 3–4 j
    const avecSport = recalcProfile(makeProfile({ sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }] }));
    expect(avecSport.tdee_kcal).toBe(Math.round(bmr * NEAT_BASE_PAL + exerciseKcalPerDay(avecSport.sports, 90))); // MET
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
});
