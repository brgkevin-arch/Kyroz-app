// ── Accès « reviewer » stores (Apple App Review / Google Play) ───────────────
//
// Problème : le bouton « Continuer en invité » est masqué en prod (`__DEV__`, cf.
// audit sécu — fermer la création anonyme de comptes en masse). Mais un reviewer
// de store doit pouvoir se connecter, et l'inscription demande une confirmation
// e-mail → il serait bloqué.
//
// Solution : un accès invité déverrouillé UNIQUEMENT par un code secret fourni au
// build (`EXPO_PUBLIC_REVIEW_CODE`). Le reviewer se connecte « normalement » (mode
// Connexion) avec l'e-mail sentinelle + le code, transmis dans les notes de review
// → session invité, sans e-mail à confirmer.
//
// ⚠️ Sûreté : le code n'est PAS dans le repo. Le workflow web (`deploy.yml`) ne le
// pose pas → `EXPO_PUBLIC_REVIEW_CODE` est `undefined` dans le bundle web public →
// `isReviewLogin` renvoie toujours `false` → le vecteur d'abus reste fermé sur le
// web (la surface scriptable). Seul le binaire natif soumis (build EAS avec le
// secret) porte le code. Voir STORE-RELEASE.md §9.

export const REVIEW_EMAIL = 'review@kyroz.app';

/**
 * Vrai si les identifiants saisis correspondent à l'accès reviewer.
 * INERTE quand `code` est vide/absent (cas du web public) → jamais d'accès invité.
 */
export function isReviewLogin(email: string, password: string, code: string | undefined | null): boolean {
  if (!code) return false; // aucun code configuré → accès fermé
  return email.trim().toLowerCase() === REVIEW_EMAIL && password === code;
}
