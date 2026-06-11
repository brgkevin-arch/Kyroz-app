import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// ── Rappel quotidien simple (spec §5 — seule notif autorisée) ────────────────
// Une SEULE notification locale récurrente par jour, au créneau choisi. But :
// ramener l'utilisateur sur son plan chaque jour → jours consécutifs (North Star).
// Pas de push serveur, pas de notif « avancée » (interdites). Local-only.

export type ReminderSlot = 'off' | 'morning' | 'midday' | 'evening';

// Les notifications locales ne sont pas supportées sur le web par expo-notifications.
export const remindersSupported = Platform.OS !== 'web';

export const REMINDER_TIME: Record<Exclude<ReminderSlot, 'off'>, { hour: number; minute: number }> = {
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
export async function ensurePermission(): Promise<boolean> {
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
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (slot === 'off') return true;

  const granted = await ensurePermission();
  if (!granted) return false;

  const { hour, minute } = REMINDER_TIME[slot];
  const copy = COPY[slot];
  await Notifications.scheduleNotificationAsync({
    content: { title: copy.title, body: copy.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}
