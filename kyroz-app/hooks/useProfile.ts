import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../lib/types';
import { useAuth } from './useAuth';
import { pushProfile, markProfileDirty, clearProfileDirty } from '../lib/sync';
import { bootProfile } from '../lib/profileBoot';
import { recalcProfile } from '../lib/tdee';

const PROFILE_KEY = '@kyroz:profile';
const LOG_PREFIX = '[kyroz:profil]';

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  saveProfile: (p: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

// État du profil PARTAGÉ par toute l'app (un seul exemplaire en mémoire) :
// modifier le profil dans un écran se répercute instantanément dans les autres.
// Exporté pour `useMealSlots`, qui doit pouvoir lire le profil SANS lever quand il
// n'y a pas de provider (cf. le commentaire de ce hook).
export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { ready, hydrationTick, session } = useAuth();
  /**
   * L'identité du compte connecté — **dépendance de la relecture** (constat 01-01, P0).
   *
   * 🔴 Sans elle, le profil en MÉMOIRE survit à un changement de compte. Le stockage,
   * lui, est bien purgé (`purgerSessionLocale`), mais cet effet ne se rejouait que sur
   * `ready` et `hydrationTick` : entre la purge et la première hydratation, l'app
   * continuait d'afficher le profil du compte précédent — poids, %MG, cibles. La donnée
   * était effacée et l'ÉCRAN mentait quand même.
   * ⚠️ Une déconnexion la fait passer à `undefined`, donc l'effet se rejoue aussi vers
   * l'écran de connexion : c'est voulu, c'est le même besoin dans l'autre sens.
   */
  const uid = session?.user?.id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Dernier profil servi, sérialisé : sert à ne PAS remplacer l'objet en mémoire
  // par un équivalent. Une nouvelle identité d'objet relance les effets qui en
  // dépendent — dont celui de l'écran Plan qui compte une ouverture (analytics
  // + série). Relire ne doit rien déclencher si rien n'a changé.
  const servedRef = React.useRef<string | null>(null);

  // On lit le profil local dès que l'auth est connue — SANS attendre le réseau
  // (c'est ce qui figeait le démarrage, cf. lib/boot.ts). L'hydratation cloud
  // écrit dans AsyncStorage quand elle arrive, y compris en retard : on relit
  // alors (`hydrationTick`), sinon l'app garderait en mémoire la version locale
  // d'avant la synchro.
  useEffect(() => {
    if (!ready) { setLoading(true); return; }
    let alive = true;
    AsyncStorage.getItem(PROFILE_KEY).then(async (raw) => {
      if (!alive) return;
      // fix P3.3 : `sports` fait foi → recale le compteur de séances au chargement,
      // pour que le TDEE ne puisse pas basculer sur un état incohérent hérité.
      // `normalizeGoal` : `cut_aggressive` n'est plus proposé (il servait le même
      // plan que `cut`) → on le referme ici, sinon ces comptes gardent un objectif
      // qu'aucun écran ne sait plus afficher. Il referme aussi, depuis le 2026-08-27,
      // toute valeur HORS BARÈME — celle-là figeait l'app au démarrage (02-03).
      // `normalizeVariety` / `normalizeMeals` : deux champs hors barème trouvés sur un
      // profil RÉEL (`variety: 'high'`, `meals: 4` au lieu d'un tableau). Le moteur les
      // absorbait en silence, mais l'écran « Paramètres des repas » CRASHAIT dessus —
      // donc le réglage était impossible à ouvrir, sans explication. On les referme ici.
      //
      // fix P0.1 : le plancher de sécurité doit être RÉTROACTIF. Les cibles étaient
      // figées en base et ne repassaient par `safetyFloorKcal` qu'à la prochaine
      // édition ou pesée : un profil dormant continuait d'être servi à 1200 kcal
      // (ancien filet absolu) alors que son plancher réel vaut 1463. « Aucun chemin
      // de code ne produit une cible sans passer par le plancher » n'était donc pas
      // vrai pour les comptes existants — c'est le trou que la PR prétend fermer.
      //
      // ⚠️ Toute cette décision vit dans `lib/profileBoot.ts` — et pas ici — parce que
      // la suite de tests ne couvre que `lib/`. C'est le chemin qui pouvait FIGER
      // l'app définitivement : il devait devenir mesurable. Cf. son en-tête.
      const { profile: healed, stored, warn, degraded } = bootProfile(raw, recalcProfile);
      if (warn) { try { console.warn(`${LOG_PREFIX} ${warn}`); } catch {} }
      if (!alive) return;
      const served = JSON.stringify(healed);
      if (served !== servedRef.current) {
        servedRef.current = served;
        setProfile(healed);
      }
      setLoading(false);
      // On ne réécrit QUE si le recalcul a réellement changé quelque chose : un
      // démarrage d'app ne doit pas marquer le profil « dirty » pour rien.
      // ⚠️ `!degraded` : quand le recalcul a échoué on sert le profil STOCKÉ tel quel,
      // donc il n'y a rien de neuf à persister — et le marquer « dirty » pousserait au
      // cloud un profil que le moteur n'a pas produit.
      if (!degraded && stored && healed && JSON.stringify(stored) !== JSON.stringify(healed)) {
        try {
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(healed));
          await markProfileDirty();
          pushProfile(healed);
        } catch {}
      }
    }).catch((e) => {
      // Dernier filet : quoi qu'il arrive en amont, l'app SORT de l'écran de
      // démarrage. Sans ce `.catch`, une promesse rejetée laissait `loading` à
      // `true` pour toujours (cf. `app/index.tsx`) — le gel décrit plus haut.
      if (!alive) return;
      try { console.warn(`${LOG_PREFIX} lecture du profil interrompue — démarrage poursuivi sans profil : ${String(e)}`); } catch {}
      setLoading(false);
    });
    return () => { alive = false; };
  }, [ready, hydrationTick, uid]);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    servedRef.current = JSON.stringify(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    await markProfileDirty(); // local non encore confirmé poussé → protégé de l'écrasement cloud
    pushProfile(p); // miroir cloud (best-effort) ; lève le flag si le push réussit
  }, []);

  const clearProfile = useCallback(async () => {
    setProfile(null);
    servedRef.current = JSON.stringify(null);
    await AsyncStorage.removeItem(PROFILE_KEY);
    await clearProfileDirty();
  }, []);

  return React.createElement(
    ProfileContext.Provider,
    { value: { profile, loading, saveProfile, clearProfile } },
    children
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile doit être utilisé dans un <ProfileProvider>');
  return ctx;
}
