import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WeighInFrequency } from './types';
import { nextWeighInAt } from './weight';
import {
  ReminderTime, dayIndex, nextReminderAt, pickReminderCopy, pickWeighInCopy,
} from './reminder';

// ── Rappels locaux (spec §5 — seules notifs autorisées) ──────────────────────
// Deux notifications locales, gérées par identifiant pour qu'elles coexistent
// (ré-armer l'une ne doit pas effacer l'autre) :
//  • rappel QUOTIDIEN du plan (heure choisie) → ramène sur le plan chaque jour
//  • rappel de PESÉE (à la cadence du profil) → garde le plan calé sur le poids
// Pas de push serveur, pas de notif « avancée » (interdites). Local-only.
//
// ⚠️ Ce fichier ne décide plus NI de l'heure NI du texte : les deux vivent dans
// `lib/reminder.ts`, qui est pur donc testable. Ici il ne reste que ce qui
// touche au système — et qui, par construction, ne peut pas être testé.

// Identifiants fixes → annulation/ré-armement ciblés (jamais cancelAll, qui
// effacerait l'autre rappel).
const DAILY_ID = 'kyroz-daily-reminder';
const WEIGH_ID = 'kyroz-weigh-reminder';

// Les notifications locales ne sont pas supportées sur le web par expo-notifications.
export const remindersSupported = Platform.OS !== 'web';

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
 * (Re)programme le rappel quotidien à l'heure demandée. On annule l'existant
 * d'abord (une seule notif vivante à la fois). `null` = aucun rappel. Renvoie
 * `false` si la permission est refusée ou la plateforme non supportée (→
 * l'appelant retombe sur « aucun rappel »).
 *
 * ⚠️ **Le message est figé à la programmation, pas à l'affichage.** Un
 * déclencheur `DAILY` répète le MÊME contenu jusqu'au prochain ré-armement — le
 * système ne rappelle pas l'app pour lui demander quoi écrire. La rotation des
 * messages tient donc au ré-armement de `rearmReminder`, appelé au démarrage
 * depuis le layout racine : le texte change d'un jour sur l'autre pour qui ouvre
 * l'app, et reste le même pour qui ne l'ouvre pas.
 * *(Cette phrase disait « à ce que `useReminder` ré-arme à chaque démarrage ».
 * C'était FAUX : ce hook n'est monté que par l'onglet Profil — cf. le préambule
 * de `rearmReminder`.)*
 *
 * On a écarté l'alternative — programmer quinze notifications datées d'avance,
 * une par jour, chacune avec son texte : elle ferait vraiment tourner le message
 * sans l'app, mais le rappel S'ÉTEINDRAIT au bout de quinze jours sans
 * ouverture, c'est-à-dire exactement au moment où il sert le plus. Un rappel qui
 * lâche vaut moins qu'un message qui se répète.
 */
export async function applyReminder(time: ReminderTime | null, now: Date = new Date()): Promise<boolean> {
  if (!remindersSupported) return false;
  try { await Notifications.cancelScheduledNotificationAsync(DAILY_ID); } catch {}
  if (!time) return true;

  const granted = await ensurePermission();
  if (!granted) return false;

  await programmerQuotidien(time, now);
  return true;
}

/**
 * Ré-arme le rappel quotidien avec le texte DU JOUR, au démarrage de l'app.
 *
 * 🔴 Pourquoi cette fonction existe (défaut signalé par le fondateur le
 * 2026-08-09 : « la notification que j'ai reçue ce midi n'était pas celle qu'on
 * avait changée »). Le contenu est figé à la programmation — donc le seul chemin
 * qui fasse tourner le message, ET le seul qui fasse arriver un texte réécrit
 * jusqu'à l'écran de verrouillage, c'est le ré-armement. Or il ne vivait que dans
 * l'effet de montage de `useReminder`, hook monté par le SEUL onglet Profil. Qui
 * ouvre l'app sur le Plan et n'entre jamais dans ses réglages recevait donc,
 * indéfiniment, le message programmé des mois plus tôt — y compris après une
 * mise à jour OTA parfaitement installée.
 * *(Le rappel de PESÉE, lui, n'a jamais eu le défaut : `applyWeighInReminder` est
 * appelé par `useWeightLog`, monté par l'écran Plan, donc à chaque démarrage.)*
 *
 * ⚠️ **Ne demande JAMAIS la permission** — même règle que le rappel de pesée. Un
 * ré-armement se produit à chaque lancement : y brancher `requestPermissions`
 * ferait surgir un prompt système au démarrage, sans le moindre geste de
 * l'utilisateur. Sans permission accordée, no-op silencieux.
 */
export async function rearmReminder(time: ReminderTime | null, now: Date = new Date()): Promise<void> {
  if (!remindersSupported || !time) return;

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  try { await Notifications.cancelScheduledNotificationAsync(DAILY_ID); } catch {}
  await programmerQuotidien(time, now);
}

/**
 * Le déclencheur quotidien et son contenu. Index pris sur le jour où la notif
 * TOMBERA (demain si l'heure est passée), pour que le message corresponde à ce
 * jour-là. Partagé par les deux chemins : ils ne diffèrent que par la permission.
 */
async function programmerQuotidien(time: ReminderTime, now: Date): Promise<void> {
  const copy = pickReminderCopy(time, dayIndex(nextReminderAt(time, now)));
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: { title: copy.title, body: copy.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
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

  const date = nextWeighInAt(lastStamp, freq);
  const copy = pickWeighInCopy(dayIndex(date));
  await Notifications.scheduleNotificationAsync({
    identifier: WEIGH_ID,
    content: { title: copy.title, body: copy.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
  return true;
}
