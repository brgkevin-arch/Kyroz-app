// ── Démarrage : le réseau ne décide JAMAIS du premier rendu ──────────────────
//
// Kyroz est offline-first (§3) : le profil et le plan vivent sur l'appareil,
// le cloud n'est qu'un miroir. Pourtant le premier rendu attendait DEUX appels
// réseau sans aucune borne de temps :
//   1. `supabase.auth.getSession()` — qui rafraîchit le jeton si besoin, avec
//      ses propres retries internes, et `fetch` n'a pas de délai d'expiration ;
//   2. `hydrateFromCloud()` — 6 requêtes EN SÉRIE.
// Tant que les deux n'avaient pas répondu, `ready` restait faux et l'app
// affichait le splash.
//
// ⚠️ Mesuré le 2026-08-02 avec un réseau qui ne répond jamais (fetch bloqué) :
// au bout de 20 s l'écran affichait encore « KYROZ » alors que le profil ET le
// plan étaient déjà en local. C'est le bug « l'app se fige, obligé de forcer la
// fermeture » et « aucun plan ne se génère » constatés sur téléphone — et il
// frappe d'autant plus la version web posée sur l'écran d'accueil, où l'app est
// réveillée après une mise en veille, avec un jeton à rafraîchir et un réseau
// qui n'est pas encore revenu.
//
// `withBudget` cesse d'ATTENDRE au bout de `ms`. Il n'annule rien — un `fetch`
// Supabase déjà parti continue, et son résultat est pris en compte s'il finit
// par arriver (cf. `hydrationTick` dans useAuth). C'est volontaire : on ne perd
// pas la synchro, on arrête juste de retenir l'écran en otage.

/** Le premier rendu attend la session au plus ce temps-là. Au-delà : on repart
 *  de la session persistée sur l'appareil (cf. `readPersistedSession`). */
export const AUTH_BUDGET_MS = 1500;

/** L'hydratation cloud (6 requêtes) cesse de retenir l'écran au-delà. Plus
 *  généreux que l'auth : c'est elle qui ramène le profil sur un 2e appareil,
 *  et l'écran ne l'attend de toute façon QUE s'il n'a rien à afficher. */
export const HYDRATION_BUDGET_MS = 6000;

export type BudgetResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'timeout' | 'error' };

/**
 * Attend `promise` au plus `ms` millisecondes. Ne rejette JAMAIS : un échec
 * réseau et un dépassement se lisent tous les deux dans `ok: false`, ce qui
 * évite un `try/catch` à chaque appelant (et un `unhandledrejection` oublié).
 */
export function withBudget<T>(promise: Promise<T>, ms: number): Promise<BudgetResult<T>> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: BudgetResult<T>) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    const timer = setTimeout(() => done({ ok: false, reason: 'timeout' }), ms);
    promise.then(
      (value) => { clearTimeout(timer); done({ ok: true, value }); },
      () => { clearTimeout(timer); done({ ok: false, reason: 'error' }); },
    );
  });
}
