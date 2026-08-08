import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyReminder, remindersSupported } from '../lib/notifications';
import { ReminderTime, parseReminder, serializeReminder } from '../lib/reminder';

const KEY = '@kyroz:reminder';

// Heure du rappel quotidien, persistée localement (`'off'` ou `'HH:MM'`).
// Réarmée au démarrage : les notifs programmées survivent à un redémarrage, mais
// réappliquer garantit la cohérence après réinstallation ou changement
// d'appareil — et c'est aussi ce qui fait TOURNER le message d'un jour sur
// l'autre (cf. `applyReminder`, le texte est figé à la programmation).
//
// ⚠️ La clé contient encore `'morning' | 'midday' | 'evening'` chez tous ceux qui
// avaient réglé leur rappel avant l'heure libre — elle survit à la purge des
// données. `parseReminder` les reprend ; sans ça leur rappel s'éteignait en
// silence à la mise à jour.
export function useReminder() {
  const [time, setTime] = useState<ReminderTime | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      const t = parseReminder(raw);
      setTime(t);
      if (t) applyReminder(t);
    });
  }, []);

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
  const file = useRef<Promise<unknown>>(Promise.resolve());

  // Choisit une heure (`null` = aucun rappel).
  //  • Natif : on programme la notif ; si la permission est refusée → aucun.
  //  • Web : pas de notif possible, mais on GARDE la préférence (elle s'activera
  //    sur l'app mobile) au lieu de retomber bêtement sur « Aucun ».
  const choose = useCallback((next: ReminderTime | null) => {
    const suite = file.current.then(async () => {
      let effective = next;
      if (remindersSupported) {
        const ok = await applyReminder(next);
        effective = ok ? next : null;
      }
      setTime(effective);
      await AsyncStorage.setItem(KEY, serializeReminder(effective));
      return effective !== null;
    });
    // La file ne doit jamais rester bloquée sur un échec (permission, disque).
    file.current = suite.catch(() => {});
    return suite;
  }, []);

  return { time, choose };
}
