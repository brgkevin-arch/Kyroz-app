import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../lib/types';
import { useAuth } from './useAuth';
import { pushProfile, markProfileDirty, clearProfileDirty } from '../lib/sync';
import { normalizeProfileActivity } from '../lib/syncGuard';
import { recalcProfile } from '../lib/tdee';

const PROFILE_KEY = '@kyroz:profile';

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  saveProfile: (p: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

// État du profil PARTAGÉ par toute l'app (un seul exemplaire en mémoire) :
// modifier le profil dans un écran se répercute instantanément dans les autres.
const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // On ne lit le profil local qu'une fois l'auth + l'hydratation cloud prêtes
  // (sinon on lirait des données avant qu'elles soient tirées du serveur).
  useEffect(() => {
    if (!ready) { setLoading(true); return; }
    let alive = true;
    AsyncStorage.getItem(PROFILE_KEY).then(async (raw) => {
      if (!alive) return;
      // fix P3.3 : `sports` fait foi → recale le compteur de séances au chargement,
      // pour que le TDEE ne puisse pas basculer sur un état incohérent hérité.
      const stored = raw ? normalizeProfileActivity(JSON.parse(raw)) : null;
      // fix P0.1 : le plancher de sécurité doit être RÉTROACTIF. Les cibles étaient
      // figées en base et ne repassaient par `safetyFloorKcal` qu'à la prochaine
      // édition ou pesée : un profil dormant continuait d'être servi à 1200 kcal
      // (ancien filet absolu) alors que son plancher réel vaut 1463. « Aucun chemin
      // de code ne produit une cible sans passer par le plancher » n'était donc pas
      // vrai pour les comptes existants — c'est le trou que la PR prétend fermer.
      const healed = stored ? recalcProfile(stored) : null;
      if (!alive) return;
      setProfile(healed);
      setLoading(false);
      // On ne réécrit QUE si le recalcul a réellement changé quelque chose : un
      // démarrage d'app ne doit pas marquer le profil « dirty » pour rien.
      if (stored && healed && JSON.stringify(stored) !== JSON.stringify(healed)) {
        try {
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(healed));
          await markProfileDirty();
          pushProfile(healed);
        } catch {}
      }
    });
    return () => { alive = false; };
  }, [ready]);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    await markProfileDirty(); // local non encore confirmé poussé → protégé de l'écrasement cloud
    pushProfile(p); // miroir cloud (best-effort) ; lève le flag si le push réussit
  }, []);

  const clearProfile = useCallback(async () => {
    setProfile(null);
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
