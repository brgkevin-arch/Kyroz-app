import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WeightEntry, loadWeights, saveWeights, upsertEntry, removeEntry, latest, checkinDue, lastDelta, todayStamp, frequencyDays, DEFAULT_WEIGH_IN_FREQUENCY,
} from '../lib/weight';
import { recalcProfile } from '../lib/tdee';
import { useProfile } from './useProfile';
import { pushWeights } from '../lib/sync';
import { applyWeighInReminder } from '../lib/notifications';

// Photos de progression : RGPD → LOCAL ONLY, jamais poussées au cloud. Stockées
// séparément des points de poids (qui, eux, sont synchronisés). Map date → URI.
const PHOTOS_KEY = '@kyroz:weightPhotos';

// ── LES PESÉES SE DIFFUSENT, ELLES NE SE RELISENT PAS ───────────────────────
//
// 🔴 LE DÉFAUT MESURÉ, le 2026-08-14. `entries` vivait dans l'état LOCAL du hook, et
// ce hook a TROIS instances : l'écran Profil (la carte), l'écran Plan (le rappel) et
// `WeightCheckin` (la feuille). Elles ne se parlaient pas.
// Conséquence vue à l'écran : on enregistre une pesée du 12 août dans la feuille, la
// courbe s'affiche DEDANS — et la carte du Profil, derrière, continue d'annoncer
// « encore une pesée et ta courbe apparaît ici ». Indéfiniment.
// ⚠️ Le défaut ne se voyait que sur un BACKFILL, et c'est ce qui l'a fait vivre :
// une pesée du JOUR modifie `profile.weight_kg`, donc l'effet ci-dessous se
// redéclenchait par la bande. Une pesée d'un jour passé ne touche pas le profil (à
// dessein — elle n'alimente que l'historique) : plus rien ne rafraîchissait rien.
//
// ➡️ C'est le patron obligatoire de CLAUDE.md §11, mot pour mot : *un état lu par un
// AUTRE écran que celui qui le pose ne se relit pas « au focus », il se DIFFUSE*.
// Store hors React + `useSyncExternalStore`, exactement comme le thème, l'accent,
// l'hydratation et le prénom. L'API du hook ne change pas d'un caractère — c'est ce
// qui permet de corriger les trois écrans sans en toucher aucun.
let pesees: WeightEntry[] = [];
let peseesChargees = false;
const abonnes = new Set<() => void>();

function diffuser(next: WeightEntry[]) {
  pesees = next;
  abonnes.forEach((f) => f());
}

function sAbonner(f: () => void) {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}

// Suivi du poids. Au premier accès, on amorce un point à partir du poids du
// profil (l'onboarding ne crée pas de point) → le check-in hebdo peut se déclencher
// ~7 jours plus tard. Logguer un poids met à jour le profil et recalcule macros/plan.
export function useWeightLog() {
  const { profile, saveProfile } = useProfile();
  const entries = useSyncExternalStore(sAbonner, () => pesees, () => pesees);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(peseesChargees);

  useEffect(() => {
    loadWeights().then(async (list) => {
      if (list.length === 0 && profile) {
        list = upsertEntry(list, profile.weight_kg);
        await saveWeights(list);
        pushWeights(list);
      }
      peseesChargees = true;
      diffuser(list);
      setReady(true);
    });
  }, [profile]);

  useEffect(() => {
    AsyncStorage.getItem(PHOTOS_KEY).then((raw) => { if (raw) setPhotos(JSON.parse(raw)); });
  }, []);

  // (Ré)arme le rappel de pesée dès que les données sont prêtes et à chaque
  // nouvelle pesée ou changement de cadence. No-op sur web / sans permission.
  useEffect(() => {
    if (!ready || !profile) return;
    applyWeighInReminder(profile.weigh_in_frequency ?? DEFAULT_WEIGH_IN_FREQUENCY, latest(entries)?.date ?? null);
  }, [ready, profile?.weigh_in_frequency, entries]);

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
    diffuser(next);
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
    diffuser(next);
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
