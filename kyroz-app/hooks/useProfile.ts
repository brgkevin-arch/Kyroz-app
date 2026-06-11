import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../lib/types';
import { useAuth } from './useAuth';
import { pushProfile } from '../lib/sync';

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
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (!alive) return;
      setProfile(raw ? JSON.parse(raw) : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [ready]);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    pushProfile(p); // miroir cloud (best-effort)
  }, []);

  const clearProfile = useCallback(async () => {
    setProfile(null);
    await AsyncStorage.removeItem(PROFILE_KEY);
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
