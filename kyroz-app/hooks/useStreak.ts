import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Streak } from '../lib/types';
import { pushStreak } from '../lib/sync';
import { isMilestone } from '../lib/streak';

const STREAK_KEY = '@kyroz:streak';

const DEFAULT_STREAK: Streak = {
  current_streak_days: 0,
  longest_streak_days: 0,
  last_active_date: '',
};

function dayStamp(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];
}

// Verrou module-level : sérialise TOUS les markActiveToday (toutes instances du
// hook confondues). Sans ça, deux appels concurrents le même jour (l'effet
// d'ouverture du plan + la fin de generate()) lisent le storage AVANT que l'un
// écrive → double incrément, et le streak afficherait 2 dès le jour 1.
let markChain: Promise<Streak> = Promise.resolve(DEFAULT_STREAK);

// Section critique sérialisée : lit le storage frais, applique la règle de série,
// écrit, et signale si un palier vient d'être franchi.
async function doMark(): Promise<{ streak: Streak; reachedMilestone: number | null }> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  const current: Streak = raw ? JSON.parse(raw) : DEFAULT_STREAK;

  const today = dayStamp(0);
  const yesterday = dayStamp(-1);

  if (current.last_active_date === today) {
    return { streak: current, reachedMilestone: null }; // déjà compté aujourd'hui
  }

  const continues = current.last_active_date === yesterday;
  const newCount = continues ? current.current_streak_days + 1 : 1;

  const updated: Streak = {
    current_streak_days: newCount,
    longest_streak_days: Math.max(newCount, current.longest_streak_days),
    last_active_date: today,
  };

  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  pushStreak(updated); // miroir cloud (best-effort)

  return { streak: updated, reachedMilestone: isMilestone(newCount) ? newCount : null };
}

export function useStreak() {
  const [streak, setStreak] = useState<Streak>(DEFAULT_STREAK);
  // Palier franchi à l'instant (3/7/14…), à célébrer puis effacer.
  const [celebration, setCelebration] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STREAK_KEY).then((raw) => {
      if (raw) setStreak(JSON.parse(raw));
    });
  }, []);

  const markActiveToday = useCallback(async () => {
    // On enchaîne sur le verrou : le 2e appel concurrent verra l'écriture du 1er
    // (même jour) et court-circuitera proprement.
    const run = markChain.then(() => doMark());
    markChain = run.then((r) => r.streak, () => DEFAULT_STREAK);
    const { streak: next, reachedMilestone } = await run;
    setStreak(next);
    if (reachedMilestone) setCelebration(reachedMilestone);
  }, []);

  const clearCelebration = useCallback(() => setCelebration(null), []);

  return { streak, markActiveToday, celebration, clearCelebration };
}
