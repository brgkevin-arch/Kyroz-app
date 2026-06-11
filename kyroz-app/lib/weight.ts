import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeighInFrequency } from './types';

// ── Suivi du poids + check-in hebdo ──────────────────────────────────────────
// Un point de poids par jour (le dernier de la journée écrase). Un nouveau point
// met à jour le poids du profil → TDEE/macros/plan recalculés (offline-first).
// But : garder le plan juste DANS LE TEMPS à mesure que le poids évolue, et créer
// une raison de revenir chaque semaine (rétention → North Star).

export interface WeightEntry {
  date: string;       // 'YYYY-MM-DD'
  weight_kg: number;
  note?: string;      // note libre optionnelle (ressenti, contexte : « voyage », « malade »…)
}

export const WEIGHT_KEY = '@kyroz:weights';
export const CHECKIN_DAYS = 7;

// Cadence → intervalle en jours. Pilote le rappel de check-in (écran Plan).
export const WEIGH_IN_INTERVALS: Record<WeighInFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};
export const DEFAULT_WEIGH_IN_FREQUENCY: WeighInFrequency = 'weekly';

export const WEIGH_IN_LABELS: Record<WeighInFrequency, string> = {
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
};

/** Intervalle (jours) d'une cadence, avec repli défaut. */
export function frequencyDays(freq?: WeighInFrequency): number {
  return WEIGH_IN_INTERVALS[freq ?? DEFAULT_WEIGH_IN_FREQUENCY];
}

// Date au format 'YYYY-MM-DD' en heure LOCALE (surtout pas toISOString, qui
// convertit en UTC et peut décaler d'un jour selon le fuseau → dates incohérentes
// entre le sélecteur, le seed et le tri).
export function localStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStamp(): string {
  return localStamp(new Date());
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(a + 'T00:00:00');
  const db = Date.parse(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export async function loadWeights(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(WEIGHT_KEY);
  const list: WeightEntry[] = raw ? JSON.parse(raw) : [];
  // Auto-nettoyage : aucun point ne peut légitimement être daté dans le futur
  // (l'UI ne le permet pas). S'il y en a — données héritées du bug de fuseau — on purge.
  const today = todayStamp();
  return list.filter((e) => e.date <= today).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveWeights(list: WeightEntry[]): Promise<void> {
  await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(list));
}

// Ajoute/écrase le point du jour et renvoie la liste triée.
export function upsertEntry(
  list: WeightEntry[],
  weight_kg: number,
  date = todayStamp(),
  note?: string,
): WeightEntry[] {
  const others = list.filter((e) => e.date !== date);
  const trimmed = note?.trim();
  const entry: WeightEntry = { date, weight_kg, ...(trimmed ? { note: trimmed } : {}) };
  return [...others, entry].sort((a, b) => a.date.localeCompare(b.date));
}

/** Supprime le point d'une date (nettoyage d'une saisie erronée). */
export function removeEntry(list: WeightEntry[], date: string): WeightEntry[] {
  return list.filter((e) => e.date !== date);
}

export function latest(list: WeightEntry[]): WeightEntry | null {
  return list.length ? list[list.length - 1] : null;
}

// Check-in dû si le dernier point date d'au moins `intervalDays` (jamais de nag le
// J1 : on attend qu'il y ait un historique). L'intervalle suit la cadence choisie.
export function checkinDue(
  list: WeightEntry[],
  today = todayStamp(),
  intervalDays = CHECKIN_DAYS
): boolean {
  const last = latest(list);
  if (!last) return false;
  return daysBetween(last.date, today) >= intervalDays;
}

// Variation entre les deux derniers points (kg). null si < 2 points.
export function lastDelta(list: WeightEntry[]): number | null {
  if (list.length < 2) return null;
  return Math.round((list[list.length - 1].weight_kg - list[list.length - 2].weight_kg) * 10) / 10;
}
