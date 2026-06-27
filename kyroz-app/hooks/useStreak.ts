import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Streak } from '../lib/types';
import { pushStreak } from '../lib/sync';
import { advanceStreak, StreakStep } from '../lib/streak';
import { localStamp } from '../lib/weight';

const STREAK_KEY = '@kyroz:streak';

const DEFAULT_STREAK: Streak = {
  current_streak_days: 0,
  longest_streak_days: 0,
  last_active_date: '',
  freeze_available: true,
};

// Date 'YYYY-MM-DD' en heure LOCALE (jamais toISOString/UTC — voir lib/weight.ts).
// Sinon, en France (UTC+1/+2), toute activité après ~22h locale était comptée
// comme le lendemain → série cassée alors que l'utilisateur était présent chaque jour.
function dayStamp(offsetDays = 0): string {
  return localStamp(new Date(Date.now() + offsetDays * 86400000));
}

// Verrou module-level : sérialise TOUS les markActiveToday (toutes instances du
// hook confondues). Sans ça, deux appels concurrents le même jour (l'effet
// d'ouverture du plan + la fin de generate()) lisent le storage AVANT que l'un
// écrive → double incrément, et le streak afficherait 2 dès le jour 1.
let markChain: Promise<Streak> = Promise.resolve(DEFAULT_STREAK);

// Section critique sérialisée : lit le storage frais, applique la règle de série
// (avec bouclier), écrit si ça a changé, et signale palier / gel.
async function doMark(): Promise<StreakStep> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  const current: Streak = raw ? JSON.parse(raw) : DEFAULT_STREAK;

  const step = advanceStreak(current, dayStamp(0), dayStamp(-1), dayStamp(-2));

  if (step.streak !== current) { // référence inchangée = déjà compté aujourd'hui → pas d'écriture
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(step.streak));
    pushStreak(step.streak); // miroir cloud (best-effort ; freeze_available non poussé = local-only)
  }
  return step;
}

export function useStreak() {
  const [streak, setStreak] = useState<Streak>(DEFAULT_STREAK);
  // Palier franchi à l'instant (3/7/14…), à célébrer puis effacer.
  const [celebration, setCelebration] = useState<number | null>(null);
  // Un jour manqué vient d'être pardonné (gel) → l'appelant affiche une note.
  const [froze, setFroze] = useState(false);

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
    const { streak: next, reachedMilestone, froze: didFreeze } = await run;
    setStreak(next);
    if (reachedMilestone) setCelebration(reachedMilestone);
    if (didFreeze) setFroze(true);
  }, []);

  const clearCelebration = useCallback(() => setCelebration(null), []);
  const clearFroze = useCallback(() => setFroze(false), []);

  return { streak, markActiveToday, celebration, clearCelebration, froze, clearFroze };
}
