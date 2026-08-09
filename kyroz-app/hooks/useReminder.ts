import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyReminder, rearmReminder, remindersSupported } from '../lib/notifications';
import { ReminderTime, parseReminder, serializeReminder } from '../lib/reminder';

const KEY = '@kyroz:reminder';

// Heure du rappel quotidien, persistée localement (`'off'` ou `'HH:MM'`).
//
// 🔴 **CE RÉGLAGE SE CHARGE AU DÉMARRAGE, PAS À L'OUVERTURE D'UN ONGLET.** Il
// vivait dans l'état d'un hook, dont l'effet de montage était le seul chemin de
// ré-armement de toute l'app — et ce hook n'est monté que par l'onglet **Profil**.
// Conséquence signalée par le fondateur le 2026-08-09 : le contenu d'une notif
// `DAILY` est figé à la programmation, donc qui ouvre l'app sur le Plan et
// n'entre jamais dans ses réglages recevait, tous les jours, le message programmé
// des mois plus tôt. La réécriture des textes du 2026-08-07 était bien partie en
// OTA, bien installée sur l'appareil, et **n'atteignait jamais l'écran de
// verrouillage**.
//
// ➡️ Patron obligatoire de CLAUDE.md §11 pour une valeur d'APPAREIL : store
// externe hors React + `useSyncExternalStore`, chargé une fois dans le layout
// racine (comme le thème, l'accent, l'hydratation et le prénom). Ici le store ne
// sert pas à DIFFUSER la valeur — le Profil en est le seul lecteur — il sert à
// décrocher le ré-armement de la vie d'un écran.
//
// ⚠️ La clé contient encore `'morning' | 'midday' | 'evening'` chez tous ceux qui
// avaient réglé leur rappel avant l'heure libre — elle survit à la purge des
// données. `parseReminder` les reprend ; sans ça leur rappel s'éteignait en
// silence à la mise à jour.

let current: ReminderTime | null = null;
const listeners = new Set<() => void>();
const prevenir = () => listeners.forEach((l) => l());

// ⚠️ L'instantané doit être STABLE en référence : `useSyncExternalStore` boucle
// si on lui rend un objet neuf à chaque lecture. D'où la comparaison par valeur
// avant de remplacer `current` — `parseReminder` construit un objet à chaque appel.
const memeHeure = (a: ReminderTime | null, b: ReminderTime | null) =>
  a === b || (!!a && !!b && a.hour === b.hour && a.minute === b.minute);

export function getReminderTime(): ReminderTime | null {
  return current;
}

export function subscribeReminder(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ⚠️ Les choix s'EMPILENT, ils ne se chevauchent pas.
//
// Un choix n'est pas instantané : il programme une notification système puis
// écrit sur le disque. Deux choix rapprochés — régler l'heure puis les minutes
// — se lançaient donc en parallèle, et rien ne garantissait que la DERNIÈRE
// écriture soit celle du dernier geste. Mesuré dans le navigateur : le champ
// affichait 07 h 05 et le rappel était armé à 7h15.
//
// La file règle les deux moitiés du problème : l'ordre est celui des gestes,
// et plus personne n'a besoin de JETER un changement pour se protéger d'un
// chevauchement.
//
// ⚠️ C'est aussi ce qui a permis de retirer le drapeau `busy` que ce hook
// exportait. L'écran s'en servait pour ignorer un geste pendant qu'un choix
// s'enregistrait — et un drapeau qui ne redescend pas (permission restée
// ouverte, promesse jamais tenue) laisse un contrôle MORT : il se touche,
// l'anneau de pression répond, et rien ne se passe. Mesuré ici même, le
// segment « Aucun » a refusé trois gestes de suite sans le moindre signe.
//
// ⚠️ La file est passée du `useRef` au MODULE en même temps que l'état : le
// chargement du démarrage et les gestes du Profil visent la même notification
// système, il n'y aurait aucun sens à les sérialiser dans deux files séparées.
let file: Promise<unknown> = Promise.resolve();

/**
 * Charge la préférence au démarrage et RÉ-ARME le rappel avec le texte du jour
 * (appelé une fois dans le layout racine).
 *
 * ⚠️ Passe par `rearmReminder`, qui ne demande jamais la permission : un
 * lancement d'app ne doit pas faire surgir un prompt système.
 */
export async function loadReminder(): Promise<void> {
  const suite = file.then(async () => {
    const t = parseReminder(await AsyncStorage.getItem(KEY));
    if (!memeHeure(t, current)) {
      current = t;
      prevenir();
    }
    await rearmReminder(t);
  });
  file = suite.catch(() => {});
  return suite;
}

/**
 * Choisit une heure (`null` = aucun rappel).
 *  • Natif : on programme la notif ; si la permission est refusée → aucun.
 *  • Web : pas de notif possible, mais on GARDE la préférence (elle s'activera
 *    sur l'app mobile) au lieu de retomber bêtement sur « Aucun ».
 */
export function chooseReminder(next: ReminderTime | null): Promise<boolean> {
  const suite = file.then(async () => {
    let effective = next;
    if (remindersSupported) {
      const ok = await applyReminder(next);
      effective = ok ? next : null;
    }
    if (!memeHeure(effective, current)) {
      current = effective;
      prevenir();
    }
    await AsyncStorage.setItem(KEY, serializeReminder(effective));
    return effective !== null;
  });
  // La file ne doit jamais rester bloquée sur un échec (permission, disque).
  file = suite.catch(() => {});
  return suite;
}

/** Lit l'heure du rappel côté React (re-render à chaque changement). */
export function useReminder() {
  const time = useSyncExternalStore(subscribeReminder, getReminderTime, getReminderTime);
  const choose = useCallback((next: ReminderTime | null) => chooseReminder(next), []);
  return { time, choose };
}
