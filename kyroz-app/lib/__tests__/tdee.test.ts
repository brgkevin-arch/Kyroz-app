import { describe, it, expect } from 'vitest';
import {
  calculateBMR, calculateTDEE, calculateMacros, macrosPercent, recalcProfile,
  leanBodyMass, validateProfile, recommendedProteinPerKg, kcalFromMacros,
  MIN_KCAL, MIN_AGE, DEFAULT_CARB_RATIO,
} from '../tdee';
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
  it('multiplicateur selon les séances/semaine', () => {
    expect(calculateTDEE('male', 90, 180, 30, 0)).toBe(Math.round(1880 * 1.2));
    expect(calculateTDEE('male', 90, 180, 30, 4)).toBe(Math.round(1880 * 1.55));
    expect(calculateTDEE('male', 90, 180, 30, 7)).toBe(Math.round(1880 * 1.9));
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

  it('protéines sur la masse maigre quand %MG connu', () => {
    const tdee = 2914;
    const noBf = calculateMacros(tdee, 'cut', 90, 'male');
    const bf20 = calculateMacros(tdee, 'cut', 90, 'male', 20);
    expect(noBf.protein_g).toBe(Math.round(90 * 2.2));        // poids total
    expect(bf20.protein_g).toBe(Math.round(90 * 0.8 * 2.2));  // LBM 72 kg
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
