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

/** Calories dépensées en une séance d'un sport donné, pour un poids donné. */
export function sessionKcal(type: SportType, weight_kg: number, minutes: number): number {
  const met = SPORT_MET[type] ?? 0;
  const mins = clamp(minutes, MIN_SESSION_MIN, MAX_SESSION_MIN);
  return (met * 3.5 * weight_kg / 200) * mins;
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
