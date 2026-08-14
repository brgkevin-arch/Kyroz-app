import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { WeighInFrequency } from './types';
import { WEIGH_IN_AHEAD, weighInSchedule } from './weight';
import {
  NotificationIntent, RAPPELS_A_L_AVANCE, ReminderTime, dayIndex, intentFromData,
  pickWeighInCopy, serieQuotidienne,
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

// ⚠️ La pesée peut occuper PLUSIEURS notifications (série datée). Tous ces
// identifiants s'annulent ensemble, **`WEIGH_ID` nu compris** : c'est celui que
// portent les appareils déjà armés par la version d'avant. L'oublier laisserait
// un ancien one-shot vivre à côté de la nouvelle série — donc un doublon le jour
// de la première échéance, chez tout le parc existant.
const WEIGH_IDS = [WEIGH_ID, ...Array.from({ length: WEIGH_IN_AHEAD }, (_, i) => `${WEIGH_ID}-${i}`)];

// 🔴 MÊME PIÈGE, ET IL EST PIRE ICI (2026-08-12). Le rappel quotidien est passé
// d'UN déclencheur répétitif à une SÉRIE datée. `DAILY_ID` nu est l'identifiant
// que portent tous les appareils déjà armés — et sa notification est `DAILY`,
// donc elle se rejoue TOUTE SEULE, indéfiniment, sans que l'app y soit pour rien.
// L'oublier ne ferait pas un doublon d'un jour : il laisserait l'ancienne
// citation figée tomber tous les matins À CÔTÉ de la nouvelle série, pour
// toujours, chez tout le parc existant. C'est exactement le défaut qu'on corrige,
// livré une deuxième fois par la porte de derrière.
const DAILY_IDS = [DAILY_ID, ...Array.from({ length: RAPPELS_A_L_AVANCE }, (_, i) => `${DAILY_ID}-${i}`)];

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
 * ⚠️ **Le message est figé à la programmation, pas à l'affichage** — le système
 * ne rappelle jamais l'app pour lui demander quoi écrire. C'est la contrainte de
 * fond, et elle n'a pas changé. Ce qui a changé, c'est ce qu'on en fait : au lieu
 * d'UN déclencheur répétitif dont le texte ne tournait que pour qui ouvre l'app,
 * on programme une SÉRIE datée (`reminder.ts::serieQuotidienne`) où chaque jour
 * porte déjà son texte. La rotation ne dépend donc plus d'une ouverture.
 * *(Décision fondateur du 2026-08-12, sur signalement d'un testeur qui recevait
 * la même citation tous les matins. L'alternative « un rappel qui lâche vaut
 * moins qu'un message qui se répète » est renversée : une notification identique
 * chaque matin n'est pas un rappel, c'est du bruit — et le bruit finit en
 * notifications coupées.)*
 *
 * ⚠️ Le ré-armement au démarrage (`rearmReminder`) reste indispensable : c'est
 * lui qui REMPLIT la série au fur et à mesure. Sans ouverture pendant
 * `RAPPELS_A_L_AVANCE` jours, le rappel s'éteint — coût assumé, chiffré là-bas.
 */
export async function applyReminder(time: ReminderTime | null, now: Date = new Date()): Promise<boolean> {
  if (!remindersSupported) return false;
  for (const id of DAILY_IDS) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
  if (!time) return true;

  const granted = await ensurePermission();
  if (!granted) return false;

  await programmerQuotidien(time, now);
  return true;
}

/**
 * REMPLIT la série des rappels au démarrage de l'app.
 *
 * 🔴 Pourquoi cette fonction existe (défaut signalé par le fondateur le
 * 2026-08-09 : « la notification que j'ai reçue ce midi n'était pas celle qu'on
 * avait changée »). Le contenu est figé à la programmation, donc le seul chemin
 * qui fasse arriver un texte RÉÉCRIT jusqu'à l'écran de verrouillage, c'est le
 * ré-armement. Or il ne vivait que dans l'effet de montage de `useReminder`, hook
 * monté par le SEUL onglet Profil. Qui ouvre l'app sur le Plan et n'entre jamais
 * dans ses réglages recevait donc, indéfiniment, le message programmé des mois
 * plus tôt — y compris après une mise à jour OTA parfaitement installée.
 * *(Le rappel de PESÉE, lui, n'a jamais eu le défaut : `applyWeighInReminder` est
 * appelé par `useWeightLog`, monté par l'écran Plan, donc à chaque démarrage.)*
 *
 * ⚠️ **SON RÔLE A CHANGÉ LE 2026-08-12, il n'a pas disparu.** Il ne sert plus à
 * faire TOURNER le texte — la série datée le fait toute seule, sans ouverture.
 * Il sert à la RECHARGER : à chaque lancement, la fenêtre de 30 jours repart de
 * zéro. C'est ce qui empêche le rappel de s'éteindre chez qui ouvre l'app ne
 * serait-ce qu'une fois par mois. Le supprimer en croyant nettoyer du code devenu
 * inutile ferait expirer le rappel de tout le monde, silencieusement, un mois
 * plus tard.
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

  for (const id of DAILY_IDS) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
  await programmerQuotidien(time, now);
}

/**
 * La série des prochains rappels — une notification DATÉE par jour, chacune avec
 * le texte de SON jour. Partagée par les deux chemins : ils ne diffèrent que par
 * la permission.
 *
 * ⚠️ Ce qui se décide (combien de jours, quelles dates, quel texte) vit dans
 * `reminder.ts::serieQuotidienne`, qui est PUR donc testé. Ici on ne fait que
 * traduire en appels système — même partage que pour la pesée.
 */
async function programmerQuotidien(time: ReminderTime, now: Date): Promise<void> {
  for (const [i, rappel] of serieQuotidienne(time, now).entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${DAILY_ID}-${i}`,
      content: { title: rappel.title, body: rappel.body, data: { kind: 'daily' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: rappel.date },
    });
  }
}

/**
 * (Re)programme le rappel de PESÉE selon la cadence du profil, à ré-armer après
 * chaque pesée et au démarrage de l'app. Réutilise la permission DÉJÀ accordée
 * (par le rappel quotidien) — ne la redemande pas, pour éviter un prompt
 * surprise. Renvoie `false` si non supporté / permission absente (→ no-op
 * silencieux).
 *
 * 🔴 **Le déclencheur n'est plus une date unique, et c'est tout l'objet du
 * changement.** Une notification `DATE` ne se rejoue pas : le seul chemin qui
 * programmait la suivante était `useWeightLog`, monté par l'écran Plan. Qui
 * cessait d'ouvrir Kyroz recevait donc UNE notification de pesée puis plus
 * jamais — l'inverse exact de ce que `applyReminder` explique plus haut pour le
 * rappel quotidien. La forme du déclencheur se décide dans
 * `weight.ts::weighInSchedule`, qui est pur donc testable ; ici on ne fait que
 * la traduire.
 */
export async function applyWeighInReminder(freq: WeighInFrequency, lastStamp: string | null): Promise<boolean> {
  if (!remindersSupported) return false;
  for (const id of WEIGH_IDS) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return false;

  const plan = weighInSchedule(lastStamp, freq);
  // L'index de rotation est pris sur le jour où la notification TOMBERA, comme
  // pour le rappel quotidien — pas sur le jour où on l'arme.
  const contenu = (date: Date) => {
    const copy = pickWeighInCopy(dayIndex(date));
    return { title: copy.title, body: copy.body, data: { kind: 'weigh' } };
  };

  if (plan.kind === 'dates') {
    for (const [i, date] of plan.dates.entries()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${WEIGH_ID}-${i}`,
        content: contenu(date),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
    return true;
  }

  // Répétitif : le texte est figé jusqu'au prochain ré-armement (le système ne
  // rappelle pas l'app pour lui demander quoi écrire). On l'indexe donc sur la
  // PREMIÈRE occurrence, celle qui est certaine d'être juste.
  const premiere = new Date();
  premiere.setHours(plan.hour, plan.minute, 0, 0);
  if (premiere.getTime() <= Date.now()) premiere.setDate(premiere.getDate() + 1);

  await Notifications.scheduleNotificationAsync({
    identifier: `${WEIGH_ID}-0`,
    content: contenu(premiere),
    trigger: plan.kind === 'daily'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: plan.hour, minute: plan.minute }
      : {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: plan.weekday,
        hour: plan.hour,
        minute: plan.minute,
      },
  });
  return true;
}

/**
 * S'abonne aux TAPS sur les notifications de Kyroz et rend de quoi se
 * désabonner. Appelé une fois par le layout racine.
 *
 * ⚠️ **Deux chemins, pas un** — et n'en câbler qu'un laisse la moitié du défaut :
 *  • `getLastNotificationResponseAsync` couvre le démarrage à FROID (l'app était
 *    tuée, c'est le tap qui l'a lancée). L'écouteur, lui, n'a rien vu : il n'y
 *    avait personne pour écouter.
 *  • `addNotificationResponseReceivedListener` couvre l'app déjà vivante,
 *    au premier plan comme en arrière-plan.
 *
 * 🔴 **`getLastNotificationResponseAsync` rend la DERNIÈRE réponse, pas une
 * réponse NOUVELLE** — et elle survit au redémarrage. Sans mémoire, un tap sur le
 * rappel de pesée rouvrirait la feuille de pesée à CHAQUE lancement suivant, pour
 * toujours : un écran qui s'ouvre sans qu'aucun geste ne l'explique, c'est-à-dire
 * exactement le genre de défaut qui passe la recette et se manifeste des jours
 * plus tard.
 *
 * ⚠️ L'identifiant NE SUFFIT PAS comme marque : il est fixe par construction
 * (`kyroz-daily-reminder`), donc le tap de demain porterait la même. C'est le
 * couple identifiant + heure de LIVRAISON qui distingue deux taps.
 *
 * ⚠️ Ne fait rien sur le web (`remindersSupported`) : il n'y a pas de
 * notification locale à toucher, donc pas de réponse à lire.
 */
const DERNIER_TAP_KEY = '@kyroz:lastNotifTap';

export function subscribeNotificationTaps(onIntent: (intent: NotificationIntent) => void): () => void {
  if (!remindersSupported) return () => {};

  let vivant = true;

  const marque = (r: Notifications.NotificationResponse) =>
    `${r.notification.request.identifier}:${r.notification.date}`;

  const servir = (r: Notifications.NotificationResponse) => {
    AsyncStorage.setItem(DERNIER_TAP_KEY, marque(r)).catch(() => {});
    onIntent(intentFromData(r.notification.request.content.data));
  };

  // Démarrage à froid : l'app était tuée, c'est le tap qui l'a lancée — donc
  // l'écouteur ci-dessous n'a rien vu, il n'existait pas encore.
  (async () => {
    try {
      const r = await Notifications.getLastNotificationResponseAsync();
      if (!vivant || !r) return;
      const dejaVu = await AsyncStorage.getItem(DERNIER_TAP_KEY);
      if (dejaVu === marque(r)) return;
      servir(r);
    } catch {}
  })();

  const sub = Notifications.addNotificationResponseReceivedListener((r) => { servir(r); });

  return () => { vivant = false; sub.remove(); };
}
