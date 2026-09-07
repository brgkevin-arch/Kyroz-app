import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATISTIQUES_USAGE_ACTIVES } from './featureFlags';
import { randomId } from './randomId';

// ── Analytics (PostHog Cloud EU) — DORMANT tant que non configuré + non consenti ──
//
// RGPD : le profil = données de santé → consentement explicite OBLIGATOIRE avant
// tout envoi. `capture` ne fait RIEN tant que (a) pas de clé PostHog ET (b) pas de
// consentement « granted ». On peut donc instrumenter partout sans risque ; le jour
// où la clé est posée, ça s'allume — toujours gated par le consentement.
//
// La clé PostHog (`phc_…`) est un token d'INGESTION write-only, conçu pour être
// PUBLIC côté client → OK qu'elle soit inlinée dans le bundle web (cf. `.env.example`).
// Hôte EU (`eu.i.posthog.com`) → données stockées en Europe (RGPD).
//
// ── PSEUDONYME, PAS ANONYME (arbitrage du 2026-08-10, §3.3) ──────────────────
// L'identifiant ci-dessous est un UUID tiré sur l'appareil, jamais relié au compte
// ni à l'e-mail. Il n'est PAS anonyme pour autant : il est stable, donc les events
// d'un même appareil sont regroupables — et c'est précisément ce qui rend possible
// la suppression sur demande de retrait. Le mot « anonyme » est donc BANNI partout
// où il décrit ce fichier : l'écran de consentement, les Réglages et les textes
// légaux doivent dire « pseudonyme ». Une donnée supprimable par individu n'est
// pas anonyme — les deux affirmations ne peuvent pas tenir ensemble.
//
// ⚠️ NE JAMAIS appeler `identify`/`alias` vers l'id Supabase : ça rebrancherait le
// pseudonyme sur le compte et ferait tomber toute la promesse d'un coup.
//
// ✅ ADRESSE IP — VÉRIFIÉ LE 2026-08-18 sur le projet EU de Kyroz (capture d'écran,
// Settings → Products → Privacy) : « Discard client IP data » est ACTIVÉ. Ce n'était
// pas une supposition à corriger après coup : le commentaire précédent affirmait que
// le défaut PAR DÉFAUT de PostHog s'appliquait (collecte + géolocalisation) — c'était
// vrai pour un projet générique, faux pour un projet Cloud EU, où ce réglage est
// désactivé par défaut à la création. Ce client n'envoie toujours rien pour l'IP —
// il n'en a pas besoin, le serveur ne la conserve pas.

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = '@kyroz:analyticsConsent';
const ID_KEY = '@kyroz:analyticsId';
// Jour 0 des cohortes. Posé au moment où la question du consentement est RÉPONDUE
// (oui ou non), pas au premier lancement — voir `noterJour0`.
const DAY0_KEY = '@kyroz:analyticsDay0';

export type AnalyticsConsent = 'granted' | 'denied';

// Cache mémoire (évite un read storage à chaque event). undefined = pas encore lu.
let consentCache: AnalyticsConsent | null | undefined;
let idCache: string | null = null;
let day0Cache: string | null | undefined;

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
  // Le jour 0 se pose ICI, à la RÉPONSE — y compris un refus. C'est ce qui rend
  // `jour_depuis_install` juste pour quelqu'un qui dit non à l'inscription puis
  // rallume l'interrupteur trois semaines plus tard : son jour 0 date déjà du
  // premier lancement, il n'est pas réécrit. Le poser au premier lancement (avant
  // la question) reviendrait à écrire sur l'appareil pour une finalité analytics
  // sans consentement — exactement ce que le tampon local refuse (§3.2).
  await noterJour0();
  try { await AsyncStorage.setItem(CONSENT_KEY, c); } catch {}
}

// id PSEUDONYME stable (jamais l'email, jamais l'id de compte) pour relier les
// events d'un même appareil. Réinstaller en tire un nouveau : les métriques se
// lisent donc en APPAREILS, jamais en personnes (§3.4).
async function distinctId(): Promise<string> {
  if (idCache) return idCache;
  try {
    let id = await AsyncStorage.getItem(ID_KEY);
    if (!id) { id = randomId(); await AsyncStorage.setItem(ID_KEY, id); }
    idCache = id;
  } catch { idCache = randomId(); }
  return idCache;
}

/** Identifiant pseudonyme affiché à l'utilisateur (Réglages) pour qu'il puisse
 *  demander la suppression de ses statistiques. `null` s'il n'en existe pas
 *  encore — on n'en CRÉE pas un pour l'occasion. */
export async function pseudonymeExistant(): Promise<string | null> {
  if (idCache) return idCache;
  try { return await AsyncStorage.getItem(ID_KEY); } catch { return null; }
}

// ── Cohortes : `jour_depuis_install` ─────────────────────────────────────────
// Ce n'est pas une donnée de santé, c'est un rang de cohorte — et sans lui la
// rétention est illisible (on ne saurait pas distinguer un event de J1 d'un event
// de J30). Il part sur TOUS les events.

function stampLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function noterJour0(): Promise<void> {
  if (day0Cache) return;
  try {
    const deja = await AsyncStorage.getItem(DAY0_KEY);
    if (deja) { day0Cache = deja; return; }
    const stamp = stampLocal(new Date());
    await AsyncStorage.setItem(DAY0_KEY, stamp);
    day0Cache = stamp;
  } catch { /* sans jour 0, la propriété est simplement ABSENTE (cf. plus bas) */ }
}

/**
 * Rang du jour depuis le jour 0, ou `undefined` si aucun jour 0 n'est connu.
 *
 * ⚠️ `undefined` et non `0`, et c'est le même principe que le `label` d'un écart
 * hors plan : une clé ABSENTE dit « on ne sait pas », un `0` dirait « c'était le
 * jour de l'installation ». Le cas existe pour de vrai — les comptes qui ont
 * répondu au consentement AVANT le 2026-08-10 n'ont pas de jour 0 stocké, et leur
 * attribuer J0 daterait de plusieurs mois toutes leurs cohortes.
 */
async function jourDepuisInstall(): Promise<number | undefined> {
  if (day0Cache === undefined) {
    try { day0Cache = await AsyncStorage.getItem(DAY0_KEY); } catch { day0Cache = null; }
  }
  if (!day0Cache) return undefined;
  const j0 = Date.parse(`${day0Cache}T00:00:00`);
  const now = Date.parse(`${stampLocal(new Date())}T00:00:00`);
  if (Number.isNaN(j0) || Number.isNaN(now)) return undefined;
  return Math.max(0, Math.round((now - j0) / 86_400_000));
}

// ── Écran courant, pour `app_error` ──────────────────────────────────────────
// `ErrorBoundary` est un composant CLASSE monté à la racine : il ne connaît pas la
// route au moment où il attrape. Le layout racine dépose donc ici le chemin courant
// à chaque navigation, et la frontière d'erreur le relit. On ne garde que le CHEMIN
// (jamais une query) — les routes de Kyroz sont statiques, mais la règle vaut avant
// d'en ajouter une qui ne le serait pas.
let ecranCourant: string | undefined;

export function noterEcran(chemin: string | undefined): void {
  if (!chemin) return;
  ecranCourant = chemin.split('?')[0].slice(0, 64);
}

/**
 * Envoie un event au tunnel d'activation. NO-OP si pas de consentement « granted ».
 * Si consenti mais clé absente → log en dev (visible pendant le dev), rien envoyé.
 * Best-effort, jamais bloquant, jamais d'exception qui remonte.
 *
 * ⚠️ CE QUI EST INTERDIT DANS `props` (§6 de la synthèse du 2026-08-10, absolu) :
 * toute donnée de santé (poids, taille, %MG, sexe, âge, objectif, régime,
 * restrictions, sport, IMC, et tout motif de blocage lié à l'un d'eux), tout texte
 * libre (y compris un message d'erreur brut), toute photo, l'e-mail, le prénom,
 * l'id de compte Supabase. En cas de doute : ne pas envoyer la propriété.
 */
export async function capture(event: string, props?: Record<string, unknown>): Promise<void> {
  // 🔴 ÉTEINT (2026-08-26) — et la garde est ICI, en tout premier. Elle passe AVANT
  // la lecture du consentement parce qu'elle ne dépend d'aucune réponse : tant que
  // les statistiques sont coupées, un « oui » donné en août ne fait rien partir.
  // ⚠️ C'est aussi la seule garde qui vaille sur un binaire DÉJÀ INSTALLÉ : la clé
  // PostHog y est inlinée à la compilation, donc la retirer d'EAS ne concerne que
  // les builds futurs. Celle-ci se publie en OTA.
  if (!STATISTIQUES_USAGE_ACTIVES) return;
  const consent = await getAnalyticsConsent();
  if (consent !== 'granted') return;              // RGPD : rien sans consentement
  const jour = await jourDepuisInstall();
  const enrichi = { ...props, ...(jour === undefined ? {} : { jour_depuis_install: jour }) };
  if (!POSTHOG_KEY) {
    if (__DEV__) console.log('[analytics:dormant]', event, enrichi);
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
        properties: { ...enrichi, $lib: 'kyroz-app' },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch { /* best-effort : ne jamais casser l'app pour un event */ }
}

/** Capture une erreur de rendu attrapée par la frontière globale. Le `type` est le
 *  NOM DE CLASSE de l'erreur (`TypeError`…), jamais son message : un message brut
 *  peut contenir une valeur saisie par l'utilisateur. */
export function captureErreur(err: unknown): void {
  const type = err instanceof Error ? err.constructor?.name ?? 'Error' : typeof err;
  capture(Events.appError, { ecran: ecranCourant, type });
}

// ── Les 13 events, et pas un de plus ─────────────────────────────────────────
//
// Chaque bloc sert UNE décision, et chaque décision porte un seuil écrit d'avance
// (../docs/archive/2026-08-10-synthese-analytics-arbitrage.md §10). Un event sans décision
// associée est du bruit qu'on paye en complexité, en surface juridique et en
// promesse faite à l'utilisateur : ne pas en ajouter sans écrire le seuil d'abord.
export const Events = {
  // D1 — le tunnel d'entrée. Mesurable UNIQUEMENT parce que le consentement est
  // demandé AVANT l'assistant : il n'existe pas de tampon local (§3.2), donc ce
  // qui précède la réponse est perdu pour toujours.
  onboardingStarted: 'onboarding_started',
  onboardingStepViewed: 'onboarding_step_viewed',
  onboardingCompleted: 'onboarding_completed',
  onboardingBlocked: 'onboarding_blocked',
  // D4 — le plan est-il SUIVI, ou seulement consulté ? (+ D5 : la latence réelle)
  firstPlanViewed: 'first_plan_viewed',
  planOpened: 'plan_opened',
  mealCooked: 'meal_cooked',
  planRegenerated: 'plan_regenerated',
  // ── Diagnostic : POURQUOI ça décroche (2026-08-21) ─────────────────────────
  // Deux refus d'UN repas, à ne pas confondre avec `plan_regenerated` qui refait la
  // semaine. Seuils D7/D8 écrits avant de les poser — METRICS.md §6.
  // ⚠️ `meal_type` SEULEMENT : l'ID de recette reconstituerait le régime sur un
  // identifiant stable, et « régime, restrictions » est dans l'interdit absolu (§6
  // de l'arbitrage). Le raisonnement est celui d'`onboarding_blocked`.
  mealSwapped: 'meal_swapped',
  recipeDisliked: 'recipe_disliked',
  offPlanLogged: 'off_plan_logged',
  // D2 — rétention
  streakMilestone: 'streak_milestone',
  streakFrozen: 'streak_frozen',
  // D6 — santé technique. Sans elle, D4 est ininterprétable : un plan qui n'est pas
  // suivi parce qu'il n'a jamais réussi à se générer se lit comme un désintérêt.
  planGenerationFailed: 'plan_generation_failed',
  appError: 'app_error',
} as const;
