import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderSlot, applyReminder } from '../lib/notifications';

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

  // Choisit un créneau. Si la permission est refusée (ou web), on retombe
  // proprement sur 'off' et on le reflète dans l'UI. Renvoie le succès réel.
  const choose = useCallback(async (next: ReminderSlot) => {
    setBusy(true);
    const ok = await applyReminder(next);
    const effective: ReminderSlot = ok ? next : 'off';
    setSlot(effective);
    await AsyncStorage.setItem(KEY, effective);
    setBusy(false);
    return ok;
  }, []);

  return { slot, choose, busy };
}
