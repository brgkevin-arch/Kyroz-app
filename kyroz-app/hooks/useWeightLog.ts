import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WeightEntry, loadWeights, saveWeights, upsertEntry, removeEntry, latest, checkinDue, lastDelta, todayStamp, frequencyDays,
} from '../lib/weight';
import { recalcProfile } from '../lib/tdee';
import { useProfile } from './useProfile';
import { pushWeights } from '../lib/sync';

// Photos de progression : RGPD → LOCAL ONLY, jamais poussées au cloud. Stockées
// séparément des points de poids (qui, eux, sont synchronisés). Map date → URI.
const PHOTOS_KEY = '@kyroz:weightPhotos';

// Suivi du poids. Au premier accès, on amorce un point à partir du poids du
// profil (l'onboarding ne crée pas de point) → le check-in hebdo peut se déclencher
// ~7 jours plus tard. Logguer un poids met à jour le profil et recalcule macros/plan.
export function useWeightLog() {
  const { profile, saveProfile } = useProfile();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadWeights().then(async (list) => {
      if (list.length === 0 && profile) {
        list = upsertEntry(list, profile.weight_kg);
        await saveWeights(list);
        pushWeights(list);
      }
      setEntries(list);
      setReady(true);
    });
  }, [profile]);

  useEffect(() => {
    AsyncStorage.getItem(PHOTOS_KEY).then((raw) => { if (raw) setPhotos(JSON.parse(raw)); });
  }, []);

  // Attache/retire une photo à une date (local-only, jamais synchronisée).
  const setPhoto = useCallback(async (date: string, uri: string | null) => {
    setPhotos((prev) => {
      const next = { ...prev };
      if (uri) next[date] = uri; else delete next[date];
      AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const logWeight = useCallback(async (weight_kg: number, note?: string, date: string = todayStamp()) => {
    const next = upsertEntry(entries, weight_kg, date, note);
    setEntries(next);
    await saveWeights(next);
    pushWeights(next);
    // SEULE la pesée d'AUJOURD'HUI pilote le profil → macros → plan. Un jour passé
    // (backfill) n'alimente que l'historique, jamais le plan.
    if (date === todayStamp() && profile && profile.weight_kg !== weight_kg) {
      await saveProfile(recalcProfile({ ...profile, weight_kg }));
    }
  }, [entries, profile, saveProfile]);

  // Supprime un point (saisie erronée / donnée héritée du bug de fuseau).
  // Si c'était le point du JOUR, le profil reste tel quel (pas de retour en
  // arrière automatique des macros — l'utilisateur re-loggera s'il veut).
  const removeWeight = useCallback(async (date: string) => {
    const next = removeEntry(entries, date);
    setEntries(next);
    await saveWeights(next);
    pushWeights(next);
    await setPhoto(date, null); // la photo attachée n'a plus de point → on la retire
  }, [entries, setPhoto]);

  return {
    entries,
    photos,
    ready,
    last: latest(entries),
    due: checkinDue(entries, todayStamp(), frequencyDays(profile?.weigh_in_frequency)),
    delta: lastDelta(entries),
    logWeight,
    removeWeight,
    setPhoto,
  };
}
