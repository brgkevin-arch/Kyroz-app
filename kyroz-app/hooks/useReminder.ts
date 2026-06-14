import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderSlot, applyReminder, remindersSupported } from '../lib/notifications';

const KEY = '@kyroz:reminder';

// Préférence de rappel quotidien, persistée localement. Réarmée au démarrage
// (les notifs programmées survivent à un redémarrage, mais réappliquer garantit
// la cohérence après réinstallation ou changement d'appareil).
export function useReminder() {
  const [slot, setSlot] = useState<ReminderSlot>('off');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      const s = (raw as ReminderSlot) || 'off';
      setSlot(s);
      if (s !== 'off') applyReminder(s);
    });
  }, []);

  // Choisit un créneau.
  //  • Natif : on programme la notif ; si la permission est refusée → 'off'.
  //  • Web : pas de notif possible, mais on GARDE la préférence (elle s'activera
  //    sur l'app mobile) au lieu de retomber bêtement sur « Aucun ».
  const choose = useCallback(async (next: ReminderSlot) => {
    setBusy(true);
    let effective: ReminderSlot = next;
    if (remindersSupported) {
      const ok = await applyReminder(next);
      effective = ok ? next : 'off';
    }
    setSlot(effective);
    await AsyncStorage.setItem(KEY, effective);
    setBusy(false);
    return effective !== 'off';
  }, []);

  return { slot, choose, busy };
}
