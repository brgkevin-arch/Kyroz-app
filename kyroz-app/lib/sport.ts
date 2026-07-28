import { SportSession, SportType } from './types';

// ── Dépense énergétique par sport (méthode MET) ──────────────────────────────
//
// MET = Metabolic Equivalent of Task : coût énergétique d'une activité rapporté
// au repos (1 MET ≈ métabolisme assis). Valeurs issues du Compendium of Physical
// Activities, à intensité « modérée à soutenue » — cohérentes avec notre cible
// (hommes 18–35 actifs). On reste volontairement sur ~10 sports courants : pas
// d'exhaustivité, juste de quoi rendre le TDEE crédible sans friction.
//
// kcal/min = MET × 3.5 × poids(kg) / 200   (formule standard ACSM)
//
// ⚠️ On applique le MET **NET** (MET − 1), pas le MET brut — cf. RESTING_MET.

export const SPORT_MET: Record<SportType, number> = {
  musculation: 5.0,
  course: 9.8,
  velo: 8.0,
  natation: 7.0,
  football: 7.0,
  hiit_crossfit: 8.0,
  sports_combat: 9.0,
  tennis_padel: 7.0,
  basket: 6.5,
  marche_rapide: 4.3,
};

// Libellés affichés (FR). Source unique pour l'onboarding ET le profil.
export const SPORT_LABEL: Record<SportType, string> = {
  musculation: 'Musculation',
  course: 'Course à pied',
  velo: 'Vélo',
  natation: 'Natation',
  football: 'Football',
  hiit_crossfit: 'HIIT / CrossFit',
  sports_combat: 'Sports de combat',
  tennis_padel: 'Tennis / Padel',
  basket: 'Basket',
  marche_rapide: 'Marche rapide',
};

// Ordre d'affichage (les plus fréquents chez la cible en premier).
export const SPORT_ORDER: SportType[] = [
  'musculation', 'course', 'hiit_crossfit', 'velo', 'football',
  'sports_combat', 'natation', 'tennis_padel', 'basket', 'marche_rapide',
];

// Bornes de saisie (sécurité contre les valeurs aberrantes).
export const MIN_SESSION_MIN = 15;
export const MAX_SESSION_MIN = 180;
export const MAX_SESSIONS_PER_WEEK = 14;

/**
 * Coût métabolique de repos, déjà compté ailleurs (1 MET ≈ métabolisme assis).
 *
 * Le TDEE vaut `BMR × NEAT + dépense sport` : le premier terme couvre DÉJÀ les
 * 24 heures de la journée, séance comprise. Créditer le MET brut d'une séance
 * revient donc à facturer deux fois l'heure passée à s'entraîner — une fois au
 * repos dans le NEAT, une fois à l'effort dans les MET. On ne crédite que le
 * SURPLUS d'énergie dû à l'effort : `(MET − 1)`.
 *
 * Double bénéfice : la dépense d'exercice ainsi obtenue est la définition même de
 * l'EEE (Exercise Energy Expenditure) du calcul d'énergie disponible RED-S —
 * `EA = (apports − EEE) / masse maigre` se mesure sur la dépense NETTE. Le plancher
 * de sécurité mesurait donc jusqu'ici une marge d'EA légèrement fictive (30,7–30,8
 * au lieu de 30,0 exact).
 *
 * Amplitude mesurée : −38 à −58 kcal/jour sur la cible servie (`Δ = 0,0025 × poids
 * × minutes hebdo`). Volontairement SEUL : ni musculation ramenée à 4,0 (valeur
 * d'aucune ligne du Compendium, et qui traiterait une deuxième fois une partie du
 * même phénomène), ni correction 60+ (2,7/3,5 = 0,771 et non 0,85 : l'arithmétique
 * contredit sa propre justification, et crée une falaise à l'anniversaire).
 */
export const RESTING_MET = 1;

/** Calories dépensées en une séance d'un sport donné, pour un poids donné. */
export function sessionKcal(type: SportType, weight_kg: number, minutes: number): number {
  const netMet = Math.max(0, (SPORT_MET[type] ?? 0) - RESTING_MET);
  const mins = clamp(minutes, MIN_SESSION_MIN, MAX_SESSION_MIN);
  return (netMet * 3.5 * weight_kg / 200) * mins;
}

/**
 * Dépense totale liée au sport sur une SEMAINE (kcal), toutes activités cumulées.
 * Robuste aux entrées partielles/legacy : ignore les séances incomplètes.
 */
export function exerciseKcalPerWeek(sports: SportSession[] | undefined, weight_kg: number): number {
  if (!sports?.length || !(weight_kg > 0)) return 0;
  let total = 0;
  for (const s of sports) {
    const sessions = clamp(s.sessions_per_week ?? 0, 0, MAX_SESSIONS_PER_WEEK);
    if (sessions <= 0) continue;
    total += sessionKcal(s.type, weight_kg, s.minutes_per_session ?? 0) * sessions;
  }
  return Math.round(total);
}

/** Moyenne journalière de la dépense sport (kcal/jour). */
export function exerciseKcalPerDay(sports: SportSession[] | undefined, weight_kg: number): number {
  return Math.round(exerciseKcalPerWeek(sports, weight_kg) / 7);
}

/** Nombre de séances/semaine cumulées — sert de repli pour `training_days_per_week`. */
export function totalSessionsPerWeek(sports: SportSession[] | undefined): number {
  if (!sports?.length) return 0;
  return sports.reduce((n, s) => n + clamp(s.sessions_per_week ?? 0, 0, MAX_SESSIONS_PER_WEEK), 0);
}

/**
 * Volume d'entraînement hebdomadaire déclaré (minutes). Sert au contrôle
 * d'éligibilité (cf. lib/safety.ts) : au-delà de 20 h/semaine, la saisie n'est pas
 * plausible et produirait un budget calorique absurde.
 * Volontairement calculé sur les valeurs BRUTES saisies (pas les clamps de calcul) :
 * on veut détecter une saisie aberrante, pas la masquer.
 */
export function totalWeeklyTrainingMinutes(sports: SportSession[] | undefined): number {
  if (!sports?.length) return 0;
  return sports.reduce(
    (n, s) => n + Math.max(0, s.sessions_per_week ?? 0) * Math.max(0, s.minutes_per_session ?? 0),
    0,
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
