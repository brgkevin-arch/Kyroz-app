import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, readPersistedSession } from '../lib/supabase';
import { hydrateFromCloud } from '../lib/sync';
import { withBudget, AUTH_BUDGET_MS, HYDRATION_BUDGET_MS } from '../lib/boot';

interface AuthValue {
  session: Session | null;
  /**
   * Session connue — donc on sait vers quel écran router.
   * ⚠️ Ne dépend PLUS de l'hydratation cloud ni d'une réponse réseau : c'est
   * précisément ce couplage qui figeait l'app sur le splash (cf. lib/boot.ts).
   */
  ready: boolean;
  /** Miroir cloud en cours de lecture. Sert UNIQUEMENT à ne pas renvoyer vers
   *  l'onboarding quelqu'un dont le profil est encore en route (2e appareil). */
  hydrating: boolean;
  /** Incrémenté à CHAQUE fin d'hydratation, même tardive → les lecteurs du
   *  profil local (useProfile) relisent ce que le cloud vient d'écrire. */
  hydrationTick: number;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  // needsConfirmation : inscription OK mais aucune session ouverte (confirmation
  // email activée côté Supabase) → l'appelant doit afficher « vérifie ta boîte mail »
  // plutôt que de rediriger vers un écran de login vide (l'utilisateur croit que ça a planté).
  signUp: (email: string, password: string, consent: boolean) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  // Connexion « invité » (anonyme Supabase) : vraie session sans email/mot de passe,
  // pour tester rapidement le parcours (manuel + Playwright). Nécessite l'auth
  // anonyme activée dans le dashboard Supabase (Authentication → Providers → Anonymous).
  signInGuest: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [hydrationTick, setHydrationTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // `getSession()` peut partir en rafraîchissement de jeton — un appel réseau
    // SANS délai d'expiration, avec ses propres retries. On le borne : au-delà
    // du budget, on repart de la session enregistrée sur l'appareil plutôt que
    // de retenir l'écran. La promesse continue en fond, et `onAuthStateChange`
    // ci-dessous corrige l'état dès que le réseau répond (y compris pour dire
    // que la session est morte → écran de connexion, à raison cette fois).
    withBudget(supabase.auth.getSession(), AUTH_BUDGET_MS).then(async (res) => {
      const fromNetwork = res.ok ? res.value.data.session : null;
      const fallback = fromNetwork ?? (await readPersistedSession());
      if (!alive) return;
      setSession(fallback);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthChecked(true);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // À chaque changement d'utilisateur connecté : on (ré)hydre depuis le cloud.
  const uid = session?.user?.id;
  useEffect(() => {
    if (!authChecked) return;
    if (!uid) { setHydrating(false); return; }
    let alive = true;
    setHydrating(true);
    const pull = hydrateFromCloud(uid).catch(() => {});
    // Deux échéances distinctes, à dessein :
    //  - le BUDGET libère l'écran (il ne l'attend de toute façon que s'il n'a
    //    rien à afficher) ;
    //  - la FIN RÉELLE du pull, même très tardive, déclenche la relecture du
    //    profil : sans ça, un cloud arrivé en retard resterait invisible
    //    jusqu'au prochain démarrage.
    withBudget(pull, HYDRATION_BUDGET_MS).then(() => { if (alive) setHydrating(false); });
    pull.then(() => {
      if (!alive) return;
      setHydrating(false);
      setHydrationTick((n) => n + 1);
    });
    return () => { alive = false; };
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

  const signInGuest: AuthValue['signInGuest'] = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return error ? { error: error.message } : {};
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const value: AuthValue = {
    session, ready: authChecked, hydrating, hydrationTick,
    signIn, signUp, signInGuest, signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
}
