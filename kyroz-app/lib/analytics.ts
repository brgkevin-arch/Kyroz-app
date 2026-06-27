import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Analytics (PostHog Cloud EU) — DORMANT tant que non configuré + non consenti ──
//
// RGPD : le profil = données de santé → consentement explicite OBLIGATOIRE avant
// tout envoi. `capture` ne fait RIEN tant que (a) pas de clé PostHog ET (b) pas de
// consentement « granted ». On peut donc instrumenter partout sans risque ; le jour
// où la clé est posée, ça s'allume — toujours gated par le consentement.
//
// La clé PostHog (`phc_…`) est un token d'INGESTION write-only, conçu pour être
// PUBLIC côté client → OK qu'elle soit inlinée dans le bundle web (cf. generatePlan).
// Hôte EU (`eu.i.posthog.com`) → données stockées en Europe (RGPD).

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = '@kyroz:analyticsConsent';
const ID_KEY = '@kyroz:analyticsId';

export type AnalyticsConsent = 'granted' | 'denied';

// Cache mémoire (évite un read storage à chaque event). undefined = pas encore lu.
let consentCache: AnalyticsConsent | null | undefined;
let idCache: string | null = null;

export async function getAnalyticsConsent(): Promise<AnalyticsConsent | null> {
  if (consentCache !== undefined) return consentCache;
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    consentCache = raw === 'granted' || raw === 'denied' ? raw : null;
  } catch { consentCache = null; }
  return consentCache;
}

export async function setAnalyticsConsent(c: AnalyticsConsent): Promise<void> {
  consentCache = c;
  try { await AsyncStorage.setItem(CONSENT_KEY, c); } catch {}
}

// id ANONYME stable (jamais l'email) pour relier les events d'un même appareil.
async function distinctId(): Promise<string> {
  if (idCache) return idCache;
  try {
    let id = await AsyncStorage.getItem(ID_KEY);
    if (!id) { id = randomId(); await AsyncStorage.setItem(ID_KEY, id); }
    idCache = id;
  } catch { idCache = randomId(); }
  return idCache;
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Envoie un event au tunnel d'activation. NO-OP si pas de consentement « granted ».
 * Si consenti mais clé absente → log en dev (visible pendant le dev), rien envoyé.
 * Best-effort, jamais bloquant, jamais d'exception qui remonte.
 */
export async function capture(event: string, props?: Record<string, unknown>): Promise<void> {
  const consent = await getAnalyticsConsent();
  if (consent !== 'granted') return;              // RGPD : rien sans consentement
  if (!POSTHOG_KEY) {
    if (__DEV__) console.log('[analytics:dormant]', event, props ?? {});
    return;                                        // pas de clé → dormant
  }
  try {
    const id = await distinctId();
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: id,
        properties: { ...props, $lib: 'kyroz-app' },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch { /* best-effort : ne jamais casser l'app pour un event */ }
}

// Noms d'events centralisés — tunnel d'activation (North Star = 7 jours / 14).
export const Events = {
  onboardingStarted: 'onboarding_started',
  onboardingCompleted: 'onboarding_completed',
  firstPlanViewed: 'first_plan_viewed',
  mealCooked: 'meal_cooked',
  planOpened: 'plan_opened',
  streakMilestone: 'streak_milestone',
  streakFrozen: 'streak_frozen',
} as const;
