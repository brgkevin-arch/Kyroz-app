// ── Sign in with Apple — la version WEB, qui n'en propose pas ────────────────
//
// Metro résout ce fichier avant `lib/appleAuth.ts` sur le navigateur. Même
// raison que `lib/purchases.web.ts` : un `require` paresseux n'empêche pas
// Metro d'embarquer le SDK natif dans le bundle web (mesuré deux fois déjà,
// `CLAUDE.md` §11). Kyroz vend et connecte par les stores ; le web n'a ni
// bouton d'achat ni bouton Apple — pas même le code qui les rendrait possibles.

import type { AppleSignInResult } from './appleAuth';
export type { AppleSignInResult } from './appleAuth';

export async function appleSignInAvailable(): Promise<boolean> {
  return false;
}

export async function signInWithAppleNative(): Promise<AppleSignInResult> {
  return { statut: 'indisponible' };
}
