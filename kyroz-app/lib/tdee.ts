import { Goal, PlanFlag, Sex, SportSession, UserProfile } from './types';
import { exerciseKcalPerDay } from './sport';
import { datedGoalKcalDelta, goalDirectionMismatch } from './datedGoal';
import { todayStamp } from './weight';
import {
  BodyInput, MIN_AGE, MIN_KCAL, EA_OPTIMAL, LOW_EA_BUDGET_WEEKS, countsAsLowEaWeek,
  bodyFatBounds, clamp, energyAvailability, fatFreeMassKg, isFemaleAtRisk,
  lowEaWeeksBefore, recordLowEaWeek, safetyFloorKcal,
} from './safety';

// ── Calculs nutritionnels ────────────────────────────────────────────────────
//
// Les GARDE-FOUS (plancher d'énergie, bornes, éligibilité) vivent dans lib/safety.ts :
// ici on calcule, là-bas on borne. Aucune cible calorique ne sort de ce fichier
// sans être passée par `safetyFloorKcal` — mode `manual` compris.

// Ré-exports de compatibilité : ces garde-fous ont déménagé dans safety.ts, mais
// le reste de l'app (planEngine, écrans, tests) les importe historiquement d'ici.
export { MIN_KCAL, MIN_AGE };

/** Masse maigre (kg) à partir du poids et du % de masse grasse, borné PAR SEXE. */
export function leanBodyMass(sex: Sex, weight_kg: number, bodyFatPct: number): number {
  const [lo, hi] = bodyFatBounds(sex);
  return weight_kg * (1 - clamp(bodyFatPct, lo, hi) / 100);
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
    return Math.round(370 + 21.6 * leanBodyMass(sex, weight_kg, bodyFatPct));
  }
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

// Multiplicateur d'activité dérivé du nombre de séances/semaine (méthode LEGACY,
// repli pour les profils sans sports renseignés). Fourre-tout : ne distingue pas
// le type de sport (un yoga et un CrossFit comptent pareil).
function activityMultiplier(trainingDaysPerWeek: number): number {
  if (trainingDaysPerWeek <= 0) return 1.2;
  if (trainingDaysPerWeek <= 2) return 1.375;
  if (trainingDaysPerWeek <= 4) return 1.55;
  if (trainingDaysPerWeek <= 6) return 1.725;
  return 1.9;
}

// Facteur « vie quotidienne hors sport » (NEAT) appliqué au BMR quand on calcule
// la dépense sport À PART via les MET. 1.3 ≈ entre sédentaire (1.2, boulot assis)
// et légèrement actif (1.375), le sport étant ajouté ensuite — pas de double comptage.
export const NEAT_BASE_PAL = 1.3;

// TDEE (maintenance) = métabolisme de base × activité.
//
// RÈGLE DE SÉLECTION DE MÉTHODE — unique, et fonction du PROFIL SEUL :
//   • BMR : Katch-McArdle si `bodyFatPct` fourni, sinon Mifflin-St Jeor (cf. calculateBMR).
//   • Activité : méthode MET si `sports` non vide (BMR × NEAT + dépense sport/jour) ;
//     sinon multiplicateur legacy selon le nb de séances (`activityMultiplier`).
//
// Cette fonction est l'UNIQUE source de calcul du TDEE, et `recalcProfile` en est
// l'UNIQUE producteur de la valeur stockée `tdee_kcal`. Tout écran lit la valeur
// stockée — aucun ne recalcule par un chemin parallèle.
//
// ⚠️ Les deux entrées d'activité (`trainingDaysEq` et `sports`) sont REDONDANTES :
// la cohérence est garantie côté persistance (cf. lib/syncGuard.ts, fix P3.3).
export function calculateTDEE(
  sex: Sex,
  weight_kg: number,
  height_cm: number,
  age: number,
  trainingDaysPerWeek: number,
  bodyFatPct?: number,
  sports?: SportSession[]
): number {
  const bmr = calculateBMR(sex, weight_kg, height_cm, age, bodyFatPct);
  if (sports?.length) {
    return Math.round(bmr * NEAT_BASE_PAL + exerciseKcalPerDay(sports, weight_kg));
  }
  return Math.round(bmr * activityMultiplier(trainingDaysPerWeek));
}

// Ajustement calorique + protéines selon l'objectif.
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

// Bornes de la cible protéique, en g/kg de MASSE MAIGRE. Encadrent la littérature
// (ISSN 2017 ; Helms 2014 : 2,3–3,1 g/kg de masse maigre en sèche chez le sujet sec).
export const PROTEIN_MIN_PER_KG_FFM = 1.6;
export const PROTEIN_MAX_PER_KG_FFM = 2.6;

/** Corps requis pour le calcul des macros — `UserProfile` le satisfait. */
export type MacroBody = BodyInput & { sports?: SportSession[] };

/**
 * Cible protéique (g) — base POIDS AJUSTÉ, plafonnée en g/kg de masse maigre.
 *
 * L'ancien calcul prenait `max(masse_maigre × coef, poids × plancher)` en croyant
 * corriger un sous-dosage à masse grasse élevée. Il produisait l'inverse : une
 * femme de 90 kg à 45 % de masse grasse recevait 180 g, soit 3,6 g/kg de masse
 * maigre — au-dessus de toute recommandation, et 720 kcal ponctionnées sur un
 * budget déjà au plancher (les glucides tombaient à ~37 g, en silence).
 *
 * Le poids ajusté (`masse maigre + 25 % de la masse grasse`) est la base usuelle
 * en clinique : le tissu adipeux a un coût protéique réel mais très inférieur à
 * celui du tissu maigre. Le clamp final garantit qu'on reste dans la fourchette
 * défendable quelle que soit la composition.
 */
export function proteinTarget(body: BodyInput, goal: Goal): number {
  const ffm = fatFreeMassKg(body);
  const adjustedWeight = ffm + 0.25 * (body.weight_kg - ffm);
  const raw = adjustedWeight * GOAL_CONFIG[goal].proteinPerKg;
  return Math.round(clamp(raw, ffm * PROTEIN_MIN_PER_KG_FFM, ffm * PROTEIN_MAX_PER_KG_FFM));
}

// Glucides minimum un jour de séance (g/kg de poids) — sous ce seuil, la qualité
// de séance et la récupération décrochent. Signalé, pas corrigé (le rééquilibrage
// entre jours relève du cyclage, hors périmètre de cette PR).
export const CARB_TRAINING_FLOOR_PER_KG = 3;

/** Glucides sous le plancher « jour de séance » ? Partagé par les trois modes. */
function isTrainingCarbShort(carbs_g: number, weight_kg: number): boolean {
  return carbs_g < CARB_TRAINING_FLOOR_PER_KG * weight_kg;
}

export interface MacroPlan {
  target_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  floor_kcal: number;   // plancher de sécurité appliqué (cf. safetyFloorKcal)
  flags: PlanFlag[];
}

export interface MacroOptions {
  /** Delta calorique signé qui REMPLACE celui de l'objectif (point d'entrée de l'objectif daté). */
  kcalDeltaOverride?: number;
  /** Dépense d'exercice moyenne (kcal/j). Défaut : dérivée des sports du profil. */
  sportKcalPerDay?: number;
  /** Semaines déjà passées en zone d'énergie disponible basse (fenêtre 12 mois). */
  lowEaWeeks?: number;
  /** Jour de séance ? Pilote le seuil d'alerte glucides. Défaut : true. */
  isTrainingDay?: boolean;
}

/**
 * Plancher + drapeaux communs à TOUS les modes de calcul — `manual` compris, qui
 * construisait auparavant ses drapeaux à la main et n'émettait donc jamais
 * LOW_EA_BUDGET_EXCEEDED ni CARBS_BELOW_TRAINING_FLOOR.
 *
 * `requestedKcal` = la cible AVANT plancher : `tdee + delta` en auto/percent,
 * l'énergie des grammes saisis en manual.
 */
function floorAndFlags(body: MacroBody, tdee: number, requestedKcal: number, opts: MacroOptions) {
  const sportKcalPerDay = opts.sportKcalPerDay ?? exerciseKcalPerDay(body.sports, body.weight_kg);
  const lowEaWeeks = opts.lowEaWeeks ?? 0;
  const bmr = calculateBMR(body.sex, body.weight_kg, body.height_cm, body.age, body.body_fat_pct);
  // `tdee` plafonne la composante EA : le plancher ne doit jamais imposer un surplus.
  const floor_kcal = safetyFloorKcal(body, bmr, sportKcalPerDay, lowEaWeeks, tdee);

  const target_kcal = Math.max(requestedKcal, floor_kcal);

  const flags: PlanFlag[] = [];
  // Le plancher est CONTRAIGNANT (et pas seulement « a mordu au premier calcul ») :
  // en mode manual la correction est persistée, donc `target > requested` devient
  // faux au recalcul suivant et l'avertissement disparaissait — alors que le plan
  // sert toujours exactement le plancher. On teste l'état, pas la transition.
  if (target_kcal <= floor_kcal) flags.push('FLOOR_APPLIED');
  const ea = energyAvailability(body, target_kcal, sportKcalPerDay);
  if (ea < EA_OPTIMAL) flags.push('LOW_EA_WARNING');
  if (isFemaleAtRisk(body) && lowEaWeeks > LOW_EA_BUDGET_WEEKS) flags.push('LOW_EA_BUDGET_EXCEEDED');

  return { target_kcal, floor_kcal, flags, sportKcalPerDay };
}

/** Glucides = reliquat. Ne les écrase JAMAIS à zéro en silence : on signale. */
function carbsFromRemaining(
  remainingKcal: number, body: MacroBody, opts: MacroOptions, flags: PlanFlag[],
): number {
  const carbs = Math.round(remainingKcal / 4);
  if (carbs < 0) flags.push('MACRO_BUDGET_OVERFLOW');
  const isTrainingDay = opts.isTrainingDay ?? true;
  if (isTrainingDay && isTrainingCarbShort(carbs, body.weight_kg)) {
    flags.push('CARBS_BELOW_TRAINING_FLOOR');
  }
  return Math.max(0, carbs);
}

export function calculateMacros(
  tdee: number,
  goal: Goal,
  body: MacroBody,
  opts: MacroOptions = {},
): MacroPlan {
  const kcalDelta = opts.kcalDeltaOverride ?? GOAL_CONFIG[goal].kcalDelta;
  const { target_kcal, floor_kcal, flags } = floorAndFlags(body, tdee, tdee + kcalDelta, opts);

  const protein_g = proteinTarget(body, goal);
  const fat_g = Math.round((target_kcal * 0.25) / 9);
  const carbs_g = carbsFromRemaining(target_kcal - protein_g * 4 - fat_g * 9, body, opts, flags);

  return { target_kcal, protein_g, carbs_g, fat_g, floor_kcal, flags };
}

// Recalcule les kcal à partir de macros saisies manuellement
export function kcalFromMacros(protein_g: number, carbs_g: number, fat_g: number): number {
  return Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9);
}

// Mode « Perso % » (option B). kcal cible + plancher = identiques au mode auto,
// mais protéines et répartition glucides/lipides sont pilotées par l'utilisateur
// (bornes de saisie côté UI). Le plancher de sécurité s'applique de la même façon.
export const DEFAULT_CARB_RATIO = 55; // % glucides des calories non-protéiques

export function macrosPercent(
  tdee: number,
  goal: Goal,
  body: MacroBody,
  carbRatio: number,
  opts: MacroOptions & { proteinPerKg?: number } = {},
): MacroPlan {
  const cfg = GOAL_CONFIG[goal];
  const kcalDelta = opts.kcalDeltaOverride ?? cfg.kcalDelta;
  const { target_kcal, floor_kcal, flags } = floorAndFlags(body, tdee, tdee + kcalDelta, opts);

  // Protéines. SANS réglage explicite → exactement la cible du mode auto.
  //
  // AVEC un g/kg saisi, la base est TOUJOURS la MASSE MAIGRE — estimée par
  // Deurenberg quand le %MG n'est pas déclaré, jamais le poids de corps brut.
  // Prendre le poids brut annulait purement et simplement le correctif P0.2 :
  // l'UI pré-remplit toujours `protein_per_kg`, donc ce chemin est celui de TOUS
  // les utilisateurs en « Perso % », et une femme de 90 kg sans %MG déclaré
  // passait de 135 g (auto) à 198 g, soit 3,81 g/kg de masse maigre — exactement
  // le sur-dosage que P0.2 corrigeait. Au maximum du stepper (3,0 g/kg), la base
  // masse maigre garde le résultat dans la fourchette haute défendable
  // (Helms 2014 : 2,3–3,1 g/kg de masse maigre en sèche).
  const protein_g = (typeof opts.proteinPerKg === 'number' && opts.proteinPerKg > 0)
    ? Math.round(fatFreeMassKg(body) * opts.proteinPerKg)
    : proteinTarget(body, goal);

  const remaining = target_kcal - protein_g * 4;
  if (remaining < 0) flags.push('MACRO_BUDGET_OVERFLOW');
  const usable = Math.max(0, remaining);
  const ratio = clamp(carbRatio, 0, 100) / 100;
  const carbs_g = Math.max(0, Math.round((usable * ratio) / 4));
  const fat_g = Math.round((usable * (1 - ratio)) / 9);

  const isTrainingDay = opts.isTrainingDay ?? true;
  if (isTrainingDay && isTrainingCarbShort(carbs_g, body.weight_kg)) {
    flags.push('CARBS_BELOW_TRAINING_FLOOR');
  }

  return { target_kcal, protein_g, carbs_g, fat_g, floor_kcal, flags };
}

// ── Producteur unique du profil calculé ──────────────────────────────────────

export interface ComputedPlan {
  profile: UserProfile;
  flags: PlanFlag[];
  floor_kcal: number;
}

/**
 * Recalcule un profil complet : TDEE (toujours) + macros + plancher de sécurité.
 * Source unique utilisée par l'onboarding, le profil ET le check-in poids.
 *
 * Déterministe : la date du jour est un PARAMÈTRE, jamais une horloge implicite.
 */
export function computePlan(p: UserProfile, today: string = todayStamp()): ComputedPlan {
  const tdee = calculateTDEE(
    p.sex, p.weight_kg, p.height_cm, p.age, p.training_days_per_week, p.body_fat_pct, p.sports,
  );
  const sportKcalPerDay = exerciseKcalPerDay(p.sports, p.weight_kg);
  const bmr = calculateBMR(p.sex, p.weight_kg, p.height_cm, p.age, p.body_fat_pct);

  // Objectif daté (premium) : le delta calorique suit la trajectoire vers le poids
  // cible plutôt que le delta figé de l'objectif. `undefined` → comportement normal.
  const datedDelta = datedGoalKcalDelta(p.goal_target, p, today, tdee) ?? undefined;
  const kcalDelta = datedDelta ?? GOAL_CONFIG[p.goal].kcalDelta;

  // ── Registre d'exposition en zone d'énergie disponible basse ───────────────
  // Le plancher du jour se calcule sur les semaines ANTÉRIEURES uniquement
  // (cf. lowEaWeeksBefore) : la semaine courante ne peut pas influencer le
  // plancher qui sert ensuite à décider si elle compte. C'est ce qui rend le
  // calcul idempotent ET permet au registre de se vider.
  const lowEaWeeks = lowEaWeeksBefore(p.low_ea_weeks, today);
  const opts: MacroOptions = { kcalDeltaOverride: kcalDelta, sportKcalPerDay, lowEaWeeks };

  let m: MacroPlan;
  if (p.macro_mode === 'auto') {
    m = calculateMacros(tdee, p.goal, p, opts);
  } else if (p.macro_mode === 'percent') {
    m = macrosPercent(tdee, p.goal, p, p.carb_ratio ?? DEFAULT_CARB_RATIO, {
      ...opts, proteinPerKg: p.protein_per_kg,
    });
  } else {
    // legacy 'manual' : grammes figés — MAIS le plancher de sécurité s'applique
    // quand même (aucun chemin de code excepté), et par le MÊME chemin que les
    // autres modes, donc avec le même jeu de drapeaux.
    //
    // La demande se dérive des GRAMMES, jamais de `p.target_kcal` : celui-ci a pu
    // être relevé au plancher lors d'un calcul précédent, et repartir de lui
    // faisait un cliquet (la cible ne redescendait plus quand le plancher baissait,
    // par exemple après une perte de poids).
    //
    // ⚠️ LIMITE CONNUE, assumée : la recharge en glucides est PERSISTÉE dans les
    // grammes, et rien ne distingue ensuite les grammes de l'utilisateur des
    // nôtres. Si le plancher baisse plus tard (perte de poids, volume sportif
    // réduit, registre d'énergie basse qui se vide), la cible reste au niveau
    // atteint. L'écart va toujours dans le sens de MANGER PLUS, jamais moins, et
    // `macro_mode: 'manual'` n'est plus proposé par l'UI (onboarding force 'auto',
    // l'éditeur n'offre que 'auto'|'percent') : seuls des comptes historiques sont
    // concernés. Le corriger proprement demanderait de stocker les grammes
    // d'origine à part — à faire si ce mode redevient accessible.
    const manualKcal = kcalFromMacros(p.target_protein_g, p.target_carbs_g, p.target_fat_g);
    const r = floorAndFlags(p, tdee, manualKcal, opts);
    const carbs_g = p.target_carbs_g + Math.max(0, Math.round((r.target_kcal - manualKcal) / 4));
    // La cible SERVIE est l'énergie des grammes servis, pas une valeur parallèle :
    // la recharge en glucides est arrondie au gramme, donc les deux divergeaient
    // d'un kcal et le calcul n'était plus idempotent d'un passage à l'autre.
    const served = Math.max(r.floor_kcal, kcalFromMacros(p.target_protein_g, carbs_g, p.target_fat_g));
    // « Au plancher » à un gramme de glucides près (4 kcal) : la recharge est
    // quantifiée au gramme, donc l'égalité stricte serait instable d'un calcul à
    // l'autre — et le drapeau clignoterait.
    const flags: PlanFlag[] = r.flags.filter((f) => f !== 'FLOOR_APPLIED');
    if (served - r.floor_kcal < 4) flags.push('FLOOR_APPLIED');
    if ((opts.isTrainingDay ?? true) && isTrainingCarbShort(carbs_g, p.weight_kg)) {
      flags.push('CARBS_BELOW_TRAINING_FLOOR');
    }
    m = { target_kcal: served, floor_kcal: r.floor_kcal, flags, protein_g: p.target_protein_g, carbs_g, fat_g: p.target_fat_g };
  }

  // ── Enregistrement de la semaine ──────────────────────────────────────────
  // Jugé sur la cible RÉELLEMENT SERVIE (`m.target_kcal`), et non sur une cible
  // virtuelle : une utilisatrice que l'escalade a ramenée à sa maintenance ne
  // subit plus AUCUNE restriction, donc sa semaine ne doit plus compter. Sinon
  // le compteur saturait et la verrouillait à « déficit zéro » à vie — la sortie
  // de déficit comptait elle-même comme du déficit.
  // On n'historise que pour les femmes : seule population dont le plancher remonte
  // (cf. safety.effectiveEaPerKgFfm). Toutes les femmes, ménopausées comprises —
  // sinon basculer le champ ferait perdre l'historique.
  const low_ea_weeks = (p.sex === 'female' && countsAsLowEaWeek(p, m.target_kcal, tdee, sportKcalPerDay))
    ? recordLowEaWeek(p.low_ea_weeks, today)
    : p.low_ea_weeks;

  const flags = [...m.flags];
  // Poids cible incohérent avec la famille d'objectif : `datedGoalKcalDelta` renvoie
  // alors 0 (pas de pilotage). On requalifie ici pour que l'UI puisse le DIRE, plutôt
  // que d'afficher un « maintien » que l'utilisateur n'a pas demandé.
  if (p.goal_target && goalDirectionMismatch(p.goal, p.goal_target.target_weight_kg - p.weight_kg)) {
    flags.push('GOAL_DIRECTION_MISMATCH');
  }

  return {
    profile: {
      ...p,
      low_ea_weeks,
      tdee_kcal: tdee,
      target_kcal: m.target_kcal,
      target_protein_g: m.protein_g,
      target_carbs_g: m.carbs_g,
      target_fat_g: m.fat_g,
    },
    flags,
    floor_kcal: m.floor_kcal,
  };
}

/** Profil recalculé (API historique). */
export function recalcProfile(p: UserProfile, today: string = todayStamp()): UserProfile {
  return computePlan(p, today).profile;
}

/** Drapeaux de sécurité du plan courant — à afficher, jamais à persister. */
export function planFlags(p: UserProfile, today: string = todayStamp()): PlanFlag[] {
  return computePlan(p, today).flags;
}

// Validation garde-fous
export function validateProfile(sex: Sex, age: number, target_kcal: number): string | null {
  if (age < MIN_AGE) return `Kyroz est réservé aux ${MIN_AGE} ans et plus.`;
  if (target_kcal < MIN_KCAL[sex]) {
    return `Le plan minimum est de ${MIN_KCAL[sex]} kcal/jour.`;
  }
  return null;
}
