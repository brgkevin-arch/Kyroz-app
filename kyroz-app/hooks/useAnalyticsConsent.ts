import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent, AnalyticsConsent } from '../lib/analytics';

/**
 * État réactif du consentement analytics, partagé par la bannière (Plan) et le
 * toggle (Profil). `consent === undefined` = en cours de chargement ; `null` = pas
 * encore répondu (→ on affiche le prompt) ; 'granted'/'denied' = répondu.
 */
export function useAnalyticsConsent() {
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined);

  useEffect(() => { getAnalyticsConsent().then(setConsent); }, []);

  const choose = useCallback(async (c: AnalyticsConsent) => {
    await setAnalyticsConsent(c);
    setConsent(c);
  }, []);

  return { consent, choose };
}
