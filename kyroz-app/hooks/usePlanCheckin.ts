import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayStamp } from '../lib/weight';

// ── Check-in « ton plan te convient ? » ──────────────────────────────────────
// Demande périodiquement à l'utilisateur si son plan lui va, et propose des
// ajustements. Opt-out total (« ne plus me demander »), réactivable dans les
// réglages. Cadence espacée pour ne pas saouler (le rappel poids est déjà hebdo).

const KEY = '@kyroz:planCheckin';
const INTERVAL_DAYS = 14;

interface State {
  optOut: boolean;
  lastShown: string; // 'YYYY-MM-DD'
}

function daysSince(stamp: string): number {
  const then = Date.parse(stamp + 'T00:00:00');
  if (Number.isNaN(then)) return Infinity;
  return Math.round((Date.now() - then) / 86400000);
}

export function usePlanCheckin() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(async (raw) => {
      if (raw) {
        setState(JSON.parse(raw));
      } else {
        // Première fois : on amorce à aujourd'hui → 1ʳᵉ proposition ~14 j plus tard
        // (jamais le J1, on laisse l'habitude se poser).
        const init: State = { optOut: false, lastShown: todayStamp() };
        await AsyncStorage.setItem(KEY, JSON.stringify(init));
        setState(init);
      }
    });
  }, []);

  const persist = useCallback(async (s: State) => {
    setState(s);
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  }, []);

  // Reporte au prochain cycle (l'utilisateur a répondu).
  const snooze = useCallback(() => {
    if (state) persist({ ...state, lastShown: todayStamp() });
  }, [state, persist]);

  // « Ne plus me demander » (réactivable via setEnabled).
  const optOutForever = useCallback(() => {
    if (state) persist({ ...state, optOut: true });
  }, [state, persist]);

  // Réglage Profil : (ré)active ou coupe les propositions.
  const setEnabled = useCallback((on: boolean) => {
    persist({ optOut: !on, lastShown: todayStamp() });
  }, [persist]);

  const due = !!state && !state.optOut && daysSince(state.lastShown) >= INTERVAL_DAYS;

  return {
    ready: !!state,
    enabled: !state?.optOut,
    due,
    snooze,
    optOutForever,
    setEnabled,
  };
}
