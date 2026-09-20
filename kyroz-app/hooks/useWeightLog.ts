import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WeightEntry, loadWeights, saveWeights, upsertEntry, removeEntry, latest, checkinDue, lastDelta, todayStamp, DEFAULT_WEIGH_IN_FREQUENCY, recalageDuProfil,
} from '../lib/weight';
import { recalcProfile } from '../lib/tdee';
import { useProfile } from './useProfile';
import { pushWeights } from '../lib/sync';
import { applyWeighInReminder } from '../lib/notifications';
// Photos de progression : RGPD → LOCAL ONLY, jamais poussées au cloud. Stockées
// séparément des points de poids (qui, eux, sont synchronisés). Map date → URI.
// ⚠️ La clé ET l'effacement des fichiers vivent dans `lib/photos.ts` : la carte
// ne doit jamais pouvoir partir sans les octets qu'elle désigne.
import { PHOTOS_KEY, deleteProgressPhoto } from '../lib/photos';

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
      // 🔴 RÉPARE LES PROFILS DÉJÀ DÉSACCORDÉS — sans ça, le correctif ne vaudrait que
      // pour les pesées À VENIR, et tous ceux qui sont DÉJÀ dans l'état du fondateur
      // (profil 85, historique 83) y resteraient jusqu'à ce qu'ils devinent le remède.
      // C'est un invariant qu'on rétablit, pas une valeur qu'on invente : le poids
      // servi redevient celui de la dernière pesée, celle que l'écran affiche déjà.
      // ⚠️ Pas de boucle : après l'écriture, `recalageDuProfil` rend `null`.
      await appliquerRecalage(list);
    });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    AsyncStorage.getItem(PHOTOS_KEY).then((raw) => { if (raw) setPhotos(JSON.parse(raw)); });
  }, []);

  // (Ré)arme le rappel de pesée dès que les données sont prêtes et à chaque
  // nouvelle pesée, changement de cadence ou changement de JOUR. No-op sur web /
  // sans permission.
  // ⚠️ `weigh_in_day` dans les dépendances : sans lui, choisir « le dimanche »
  // n'aurait reprogrammé la notification qu'au prochain redémarrage de l'app — le
  // réglage aurait eu l'air de ne rien faire (cf. le piège « un réglage se diffuse »).
  useEffect(() => {
    if (!ready || !profile) return;
    applyWeighInReminder(
      profile.weigh_in_frequency ?? DEFAULT_WEIGH_IN_FREQUENCY,
      latest(entries)?.date ?? null,
      profile.weigh_in_day,
    );
  }, [ready, profile?.weigh_in_frequency, profile?.weigh_in_day, entries]);

  /**
   * Remet le poids du profil d'accord avec l'historique — et recalcule ce qui en
   * dépend (TDEE, macros, plan).
   *
   * ⚠️ UN SEUL point d'entrée pour les trois chemins (pesée, suppression, chargement).
   * Écrit trois fois, il aurait divergé trois fois : c'est exactement comme ça que
   * `logWeight` recalait le profil quand `removeWeight`, lui, ne le faisait pas.
   */
  const appliquerRecalage = useCallback(async (list: WeightEntry[]) => {
    if (!profile) return;
    const poids = recalageDuProfil(list, profile.weight_kg);
    if (poids === null) return;
    await saveProfile(recalcProfile({ ...profile, weight_kg: poids }));
  }, [profile, saveProfile]);

  // Attache/retire une photo à une date (local-only, jamais synchronisée).
  const setPhoto = useCallback(async (date: string, uri: string | null) => {
    setPhotos((prev) => {
      const ancienne = prev[date];
      const next = { ...prev };
      if (uri) next[date] = uri; else delete next[date];
      AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(next));
      // Le fichier ne part pas avec la carte. Sans cette ligne, remplacer ou
      // retirer une photo laisse ses octets sur l'appareil — plus rien ne les
      // désigne, donc plus rien ne pourra les effacer.
      if (ancienne && ancienne !== uri) deleteProgressPhoto(ancienne);
      return next;
    });
  }, []);

  const logWeight = useCallback(async (weight_kg: number, note?: string, date: string = todayStamp()) => {
    const next = upsertEntry(entries, weight_kg, date, note);
    diffuser(next);
    await saveWeights(next);
    pushWeights(next);
    // 🔴 CE TEST DISAIT `date === todayStamp()`, ET C'EST CE QUI A FIGÉ LE PROFIL DU
    // FONDATEUR À 85 KG pendant que sa courbe descendait à 83 (2026-09-20). Une pesée
    // rattrapée la veille n'est pas « du jour », mais elle EST la plus récente — donc
    // c'est elle qui dit le poids d'aujourd'hui. Le raisonnement complet et ce que la
    // règle préserve : `lib/weight.ts::recalageDuProfil`.
    await appliquerRecalage(next);
  }, [entries, appliquerRecalage]);

  // Supprime un point (saisie erronée / donnée héritée du bug de fuseau).
  //
  // 🔴 CE COMMENTAIRE DISAIT le contraire de ce qu'il fait désormais, et c'était le
  // MÊME défaut vu par l'autre bout : *« si c'était le point du JOUR, le profil reste
  // tel quel — l'utilisateur re-loggera s'il veut »*. Autrement dit : on efface une
  // pesée erronée de 95 kg, l'historique redevient juste, et le moteur continue de
  // servir 95 kg jusqu'à ce que quelqu'un devine qu'il faut re-peser. Supprimer le
  // dernier point RECALE donc le profil sur celui d'avant.
  const removeWeight = useCallback(async (date: string) => {
    const next = removeEntry(entries, date);
    diffuser(next);
    await saveWeights(next);
    pushWeights(next);
    await setPhoto(date, null); // la photo attachée n'a plus de point → on la retire
    await appliquerRecalage(next);
  }, [entries, setPhoto, appliquerRecalage]);

  return {
    entries,
    photos,
    ready,
    last: latest(entries),
    // La bannière et la notification lisent la MÊME échéance — c'est ce qui les
    // empêche de se contredire (cf. `checkinDue`).
    due: checkinDue(entries, todayStamp(), profile?.weigh_in_frequency, profile?.weigh_in_day),
    delta: lastDelta(entries),
    logWeight,
    removeWeight,
    setPhoto,
  };
}
