import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { hydrateFromCloud } from '../lib/sync';

interface AuthValue {
  session: Session | null;
  ready: boolean; // session connue ET hydratation cloud terminée
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  // needsConfirmation : inscription OK mais aucune session ouverte (confirmation
  // email activée côté Supabase) → l'appelant doit afficher « vérifie ta boîte mail »
  // plutôt que de rediriger vers un écran de login vide (l'utilisateur croit que ça a planté).
  signUp: (email: string, password: string, consent: boolean) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // À chaque changement d'utilisateur connecté : on (ré)hydre depuis le cloud.
  const uid = session?.user?.id;
  useEffect(() => {
    if (!authChecked) return;
    if (!uid) { setHydrated(true); return; }
    setHydrated(false);
    hydrateFromCloud(uid).catch(() => {}).finally(() => setHydrated(true));
  }, [authChecked, uid]);

  const signIn: AuthValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: error.message } : {};
  };

  const signUp: AuthValue['signUp'] = async (email, password, consent) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: error.message };
    const id = data.user?.id;
    if (id) {
      // Consentement RGPD explicite enregistré dès l'inscription (spec §12).
      try {
        await supabase.from('profiles').upsert({
          id, email: email.trim(),
          consent_health_data: consent,
          consent_at: consent ? new Date().toISOString() : null,
        });
      } catch {}
    }
    // Pas de session = confirmation email requise (réglage Supabase). On le signale
    // pour que l'UI explique au lieu de rediriger dans le vide.
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const value: AuthValue = { session, ready: authChecked && hydrated, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
}
