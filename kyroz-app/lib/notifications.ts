import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WeighInFrequency } from './types';
import { nextWeighInAt } from './weight';

// ── Rappels locaux (spec §5 — seules notifs autorisées) ──────────────────────
// Deux notifications locales, gérées par identifiant pour qu'elles coexistent
// (ré-armer l'une ne doit pas effacer l'autre) :
//  • rappel QUOTIDIEN du plan (créneau choisi) → ramène sur le plan chaque jour
//  • rappel de PESÉE (à la cadence du profil) → garde le plan calé sur le poids
// Pas de push serveur, pas de notif « avancée » (interdites). Local-only.

export type ReminderSlot = 'off' | 'morning' | 'midday' | 'evening';

// Identifiants fixes → annulation/ré-armement ciblés (jamais cancelAll, qui
// effacerait l'autre rappel).
const DAILY_ID = 'kyroz-daily-reminder';
const WEIGH_ID = 'kyroz-weigh-reminder';

// Les notifications locales ne sont pas supportées sur le web par expo-notifications.
export const remindersSupported = Platform.OS !== 'web';

const REMINDER_TIME: Record<Exclude<ReminderSlot, 'off'>, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 18, minute: 30 },
};

const COPY: Record<Exclude<ReminderSlot, 'off'>, { title: string; body: string }> = {
  morning: { title: 'Ta journée Kyroz 💪', body: 'Jette un œil à ton plan du jour pour garder ta série.' },
  midday: { title: 'C’est l’heure du déjeuner 🍽️', body: 'Ton plan t’attend — ne casse pas la chaîne.' },
  evening: { title: 'Prépare ton dîner 🔥', body: 'Un repas suivi de plus = un jour de série gagné.' },
};

// Affichage même quand l'app est au premier plan.
if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Demande (ou relit) la permission de notifier. `false` si refusée/indispo. */
async function ensurePermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * (Re)programme le rappel quotidien. On annule l'existant d'abord (une seule
 * notif vivante à la fois). `off` = aucun rappel. Renvoie `false` si la
 * permission est refusée ou la plateforme non supportée (→ l'appelant retombe
 * sur `off`).
 */
export async function applyReminder(slot: ReminderSlot): Promise<boolean> {
  if (!remindersSupported) return false;
  try { await Notifications.cancelScheduledNotificationAsync(DAILY_ID); } catch {}
  if (slot === 'off') return true;

  const granted = await ensurePermission();
  if (!granted) return false;

  const { hour, minute } = REMINDER_TIME[slot];
  const copy = COPY[slot];
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: { title: copy.title, body: copy.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}

/**
 * (Re)programme le rappel de PESÉE selon la cadence du profil. Notification
 * one-shot à la prochaine échéance (`nextWeighInAt`), à ré-armer après chaque
 * pesée et au démarrage de l'app. Réutilise la permission DÉJÀ accordée (par le
 * rappel quotidien) — ne la redemande pas, pour éviter un prompt surprise.
 * Renvoie `false` si non supporté / permission absente (→ no-op silencieux).
 */
export async function applyWeighInReminder(freq: WeighInFrequency, lastStamp: string | null): Promise<boolean> {
  if (!remindersSupported) return false;
  try { await Notifications.cancelScheduledNotificationAsync(WEIGH_ID); } catch {}

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: WEIGH_ID,
    content: {
      title: 'C’est l’heure de te peser ⚖️',
      body: 'Note ton poids du jour : Kyroz réajuste tes calories et ton plan.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextWeighInAt(lastStamp, freq) },
  });
  return true;
}
