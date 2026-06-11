import { Goal, Sex, UserProfile } from './types';

// ── Calculs nutritionnels ────────────────────────────────────────────────────

// Garde-fous (CLAUDE.md §11)
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };
export const MIN_AGE = 16;

// Bornes réalistes du % de masse grasse saisi (sécurité contre les valeurs aberrantes).
export const BODY_FAT_MIN = 3;
export const BODY_FAT_MAX = 60;

/** Masse maigre (kg) à partir du poids et du % de masse grasse. */
export function leanBodyMass(weight_kg: number, bodyFatPct: number): number {
  const bf = Math.min(Math.max(bodyFatPct, BODY_FAT_MIN), BODY_FAT_MAX);
  return weight_kg * (1 - bf / 100);
}

// BMR — Katch-McArdle si le % de masse grasse est connu (basé sur la masse maigre,
// donc bien plus précis quand deux personnes de même poids ont des compositions
// différentes), sinon Mifflin-St Jeor (différenciée par sexe).
export function calculateBMR(
  sex: Sex,
  weight_kg: number,
  height_cm: number,
  age: number,
  bodyFatPct?: number
): number {
  if (typeof bodyFatPct === 'number' && bodyFatPct > 0) {
    return Math.round(370 + 21.6 * leanBodyMass(weight_kg, bodyFatPct));
  }
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

// Multiplicateur d'activité dérivé du nombre de séances/semaine (plus concret)
export function activityMultiplier(trainingDaysPerWeek: number): number {
  if (trainingDaysPerWeek <= 0) return 1.2;
  if (trainingDaysPerWeek <= 2) return 1.375;
  if (trainingDaysPerWeek <= 4) return 1.55;
  if (trainingDaysPerWeek <= 6) return 1.725;
  return 1.9;
}

export function calculateTDEE(
  sex: Sex,
  weight_kg: number,
  height_cm: number,
  age: number,
  trainingDaysPerWeek: number,
  bodyFatPct?: number
): number {
  const bmr = calculateBMR(sex, weight_kg, height_cm, age, bodyFatPct);
  return Math.round(bmr * activityMultiplier(trainingDaysPerWeek));
}

// Ajustement calorique + ratio protéines selon l'objectif
const GOAL_CONFIG: Record<Goal, { kcalDelta: number; proteinPerKg: number; label: string }> = {
  cut_aggressive: { kcalDelta: -500, proteinPerKg: 2.4, label: 'Sèche rapide' },
  cut:            { kcalDelta: -300, proteinPerKg: 2.2, label: 'Sèche progressive' },
  recomp:         { kcalDelta: -150, proteinPerKg: 2.2, label: 'Recomposition' },
  maintain:       { kcalDelta: 0,    proteinPerKg: 1.8, label: 'Maintien' },
  lean_bulk:      { kcalDelta: 200,  proteinPerKg: 2.0, label: 'Prise de masse propre' },
  bulk:           { kcalDelta: 400,  proteinPerKg: 1.8, label: 'Prise de masse' },
};

export function goalLabel(goal: Goal): string {
  return GOAL_CONFIG[goal].label;
}

// Protéines conseillées (g/kg) pour l'objectif — sert de valeur par défaut ET de
// repère affiché à l'utilisateur en mode « Perso % ».
export function recommendedProteinPerKg(goal: Goal): number {
  return GOAL_CONFIG[goal].proteinPerKg;
}

export function calculateMacros(
  tdee: number,
  goal: Goal,
  weight_kg: number,
  sex: Sex,
  bodyFatPct?: number
): { target_kcal: number; protein_g: number; carbs_g: number; fat_g: number } {
  const cfg = GOAL_CONFIG[goal];
  const target_kcal = Math.max(tdee + cfg.kcalDelta, MIN_KCAL[sex]);

  // Protéines calées sur la MASSE MAIGRE si le % de masse grasse est connu :
  // on ne « nourrit » pas la masse grasse. Le coefficient g/kg s'applique alors
  // à la masse maigre (réf. fitness usuelle), sinon au poids total (repli).
  const proteinBasisKg = (typeof bodyFatPct === 'number' && bodyFatPct > 0)
    ? leanBodyMass(weight_kg, bodyFatPct)
    : weight_kg;
  const protein_g = Math.round(proteinBasisKg * cfg.proteinPerKg);
  const fat_g = Math.round((target_kcal * 0.25) / 9);

  const remaining = target_kcal - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remaining / 4));

  return { target_kcal, protein_g, carbs_g, fat_g };
}

// Recalcule les kcal à partir de macros saisies manuellement
export function kcalFromMacros(protein_g: number, carbs_g: number, fat_g: number): number {
  return Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9);
}

// Mode « Perso % » (option B). kcal cible + protéines = identiques au mode auto
// (donc suivent le poids), mais l'énergie RESTANTE (après protéines) est répartie
// entre glucides et lipides selon `carbRatio` (% de glucides). Les protéines restent
// ancrées au poids/masse maigre → optimales même en sèche.
export const DEFAULT_CARB_RATIO = 55; // % glucides des calories non-protéiques

export function macrosPercent(
  tdee: number,
  goal: Goal,
  weight_kg: number,
  sex: Sex,
  bodyFatPct: number | undefined,
  carbRatio: number,
  proteinPerKg?: number
): { target_kcal: number; protein_g: number; carbs_g: number; fat_g: number } {
  const cfg = GOAL_CONFIG[goal];
  const target_kcal = Math.max(tdee + cfg.kcalDelta, MIN_KCAL[sex]);

  const proteinBasisKg = (typeof bodyFatPct === 'number' && bodyFatPct > 0)
    ? leanBodyMass(weight_kg, bodyFatPct)
    : weight_kg;
  const gPerKg = (typeof proteinPerKg === 'number' && proteinPerKg > 0) ? proteinPerKg : cfg.proteinPerKg;
  const protein_g = Math.round(proteinBasisKg * gPerKg);

  const remaining = Math.max(0, target_kcal - protein_g * 4);
  const ratio = Math.min(Math.max(carbRatio, 0), 100) / 100;
  const carbs_g = Math.round((remaining * ratio) / 4);
  const fat_g = Math.round((remaining * (1 - ratio)) / 9);

  return { target_kcal, protein_g, carbs_g, fat_g };
}

// Recalcule un profil complet : TDEE (toujours) + macros (si mode auto), en
// tenant compte du % de masse grasse. Source unique utilisée par le profil ET le
// check-in poids (un nouveau poids → TDEE/macros/plan recalculés automatiquement).
export function recalcProfile(p: UserProfile): UserProfile {
  const tdee = calculateTDEE(p.sex, p.weight_kg, p.height_cm, p.age, p.training_days_per_week, p.body_fat_pct);
  if (p.macro_mode === 'auto') {
    const m = calculateMacros(tdee, p.goal, p.weight_kg, p.sex, p.body_fat_pct);
    return { ...p, tdee_kcal: tdee, target_kcal: m.target_kcal, target_protein_g: m.protein_g, target_carbs_g: m.carbs_g, target_fat_g: m.fat_g };
  }
  if (p.macro_mode === 'percent') {
    const m = macrosPercent(tdee, p.goal, p.weight_kg, p.sex, p.body_fat_pct, p.carb_ratio ?? DEFAULT_CARB_RATIO, p.protein_per_kg);
    return { ...p, tdee_kcal: tdee, target_kcal: m.target_kcal, target_protein_g: m.protein_g, target_carbs_g: m.carbs_g, target_fat_g: m.fat_g };
  }
  // legacy 'manual' : grammes figés, on met juste à jour le TDEE
  return { ...p, tdee_kcal: tdee };
}

// Validation garde-fous
export function validateProfile(sex: Sex, age: number, target_kcal: number): string | null {
  if (age < MIN_AGE) return `Kyroz est réservé aux ${MIN_AGE} ans et plus.`;
  if (target_kcal < MIN_KCAL[sex]) {
    return `Le plan minimum est de ${MIN_KCAL[sex]} kcal/jour.`;
  }
  return null;
}
