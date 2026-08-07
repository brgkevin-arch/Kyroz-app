import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase, readPersistedSession } from '../lib/supabase';
import { hydrateFromCloud } from '../lib/sync';
import { withBudget, AUTH_BUDGET_MS, HYDRATION_BUDGET_MS } from '../lib/boot';
import { URL_RETOUR_CONFIRMATION, normaliseCode } from '../lib/emailConfirmation';

/**
 * Consentement RGPD coché à l'inscription, EN ATTENTE d'une session pour être écrit.
 *
 * 🔴 Sans ce report, activer la confirmation e-mail SUPPRIME l'enregistrement du
 * consentement, en silence. La raison : `profiles` est protégée par une RLS
 * `auth.uid() = id`, et une inscription qui attend sa confirmation n'ouvre AUCUNE
 * session — l'`upsert` part donc sans identité et se fait refuser. L'erreur est
 * avalée par le `try/catch` (à raison : rien ne doit casser une inscription), donc
 * le défaut ne se voit nulle part : le compte existe, la case a été cochée à
 * l'écran, et la base dit `consent_health_data = false`.
 *
 * ⚠️ L'horodatage est celui du GESTE (la case cochée), pas celui de la confirmation :
 * c'est la date du consentement qui a une valeur RGPD, pas celle de l'écriture.
 */
const CLE_CONSENTEMENT_EN_ATTENTE = '@kyroz:pendingConsent';

interface ConsentementEnAttente {
  email: string;
  consent: boolean;
  at: string | null;
}

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
  // Confirmation par CODE À 6 CHIFFRES saisi dans l'app (`{{ .Token }}` de l'e-mail).
  // Réussit → une session s'ouvre aussitôt : l'utilisateur n'a pas à se reconnecter,
  // et n'a jamais quitté l'app. Le pourquoi de ce choix : lib/emailConfirmation.ts.
  confirmEmail: (email: string, code: string) => Promise<{ error?: string }>;
  // Renvoie l'e-mail de confirmation (code + lien neufs, les précédents meurent).
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  // ── Mot de passe oublié, en trois temps ──
  // 1. demander le code · 2. le vérifier (ouvre une session) · 3. poser le nouveau
  // mot de passe. Les trois sont séparés parce que l'utilisateur peut abandonner
  // entre deux, et parce que chaque étape a ses propres erreurs à expliquer.
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  verifyPasswordReset: (email: string, code: string) => Promise<{ error?: string }>;
  setNewPassword: (password: string) => Promise<{ error?: string }>;
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

  // Consentement RGPD coché à l'inscription, posé dès qu'une session existe.
  // Deux chemins y mènent, et il faut les deux : la saisie du code (session
  // ouverte par `confirmEmail`) ET le clic sur le lien de l'e-mail (l'utilisateur
  // se connecte ensuite normalement — c'est là que l'écriture rattrape).
  // ⚠️ L'adresse est comparée : un consentement laissé par une inscription
  // abandonnée ne doit jamais être attribué au compte suivant sur cet appareil.
  const emailSession = session?.user?.email;
  useEffect(() => {
    if (!uid || !emailSession) return;
    let alive = true;
    (async () => {
      try {
        const brut = await AsyncStorage.getItem(CLE_CONSENTEMENT_EN_ATTENTE);
        if (!brut || !alive) return;
        const attente = JSON.parse(brut) as ConsentementEnAttente;
        if (attente?.email?.toLowerCase() !== emailSession.toLowerCase()) return;
        await supabase.from('profiles').upsert({
          id: uid, email: emailSession,
          consent_health_data: attente.consent,
          consent_at: attente.at,
        });
        // Retiré SEULEMENT après une écriture réussie : un `upsert` qui échoue
        // (réseau coupé au pire moment) doit pouvoir être rejoué au démarrage
        // suivant, sinon le consentement est perdu sans que personne ne le sache.
        await AsyncStorage.removeItem(CLE_CONSENTEMENT_EN_ATTENTE);
      } catch {}
    })();
    return () => { alive = false; };
  }, [uid, emailSession]);

  const signIn: AuthValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: error.message } : {};
  };

  const signUp: AuthValue['signUp'] = async (email, password, consent) => {
    const adresse = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: adresse,
      password,
      // Où atterrit celui qui clique le LIEN de l'e-mail au lieu de saisir le code.
      // ⚠️ Ignoré en silence par Supabase si l'URL n'est pas dans la liste blanche
      // « Redirect URLs » du projet — cf. lib/emailConfirmation.ts.
      options: { emailRedirectTo: URL_RETOUR_CONFIRMATION },
    });
    if (error) return { error: error.message };
    const id = data.user?.id;
    const at = consent ? new Date().toISOString() : null;
    // Consentement RGPD explicite enregistré dès l'inscription (spec §12).
    // ⚠️ Écriture possible SEULEMENT si une session est déjà ouverte (RLS). Sinon
    // il attend la confirmation — sans ce report, il serait perdu (cf. plus haut).
    if (id && data.session) {
      try {
        await supabase.from('profiles').upsert({ id, email: adresse, consent_health_data: consent, consent_at: at });
      } catch {}
    } else {
      const enAttente: ConsentementEnAttente = { email: adresse, consent, at };
      try { await AsyncStorage.setItem(CLE_CONSENTEMENT_EN_ATTENTE, JSON.stringify(enAttente)); } catch {}
    }
    // Pas de session = confirmation email requise (réglage Supabase). On le signale
    // pour que l'UI explique au lieu de rediriger dans le vide.
    return { needsConfirmation: !data.session };
  };

  const confirmEmail: AuthValue['confirmEmail'] = async (email, code) => {
    // `type: 'signup'` — c'est le jeton d'une INSCRIPTION à confirmer. Le même code
    // à 6 chiffres sert aussi à d'autres types (recovery, email_change) : se tromper
    // de type fait répondre « invalide » sur un code pourtant juste.
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: normaliseCode(code),
      type: 'signup',
    });
    return error ? { error: error.message } : {};
  };

  const resendConfirmation: AuthValue['resendConfirmation'] = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: URL_RETOUR_CONFIRMATION },
    });
    return error ? { error: error.message } : {};
  };

  const sendPasswordReset: AuthValue['sendPasswordReset'] = async (email) => {
    // ⚠️ Aucun `redirectTo` : le gabarit de réinitialisation ne porte PAS de lien,
    // et lui en donner un rouvrirait le piège décrit dans lib/emailConfirmation.ts
    // (jeton consommé par un clic qui ne change aucun mot de passe).
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return error ? { error: error.message } : {};
  };

  const verifyPasswordReset: AuthValue['verifyPasswordReset'] = async (email, code) => {
    // `type: 'recovery'` — surtout PAS 'signup' : le même code à 6 chiffres est
    // refusé si on l'interroge sous le mauvais type, et l'utilisateur lirait
    // « code invalide » sur des chiffres pourtant justes.
    // Réussi → une session s'ouvre, et c'est elle qui autorise `updateUser`.
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: normaliseCode(code),
      type: 'recovery',
    });
    return error ? { error: error.message } : {};
  };

  const setNewPassword: AuthValue['setNewPassword'] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: error.message } : {};
  };

  const signInGuest: AuthValue['signInGuest'] = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return error ? { error: error.message } : {};
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const value: AuthValue = {
    session, ready: authChecked, hydrating, hydrationTick,
    signIn, signUp, confirmEmail, resendConfirmation,
    sendPasswordReset, verifyPasswordReset, setNewPassword,
    signInGuest, signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
}
