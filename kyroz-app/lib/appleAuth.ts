// ── Sign in with Apple — flux NATIF, iOS uniquement ──────────────────────────
//
// Ce fichier est le SEUL à parler au SDK natif Apple, exactement comme
// `lib/purchases.ts` est le seul à parler à RevenueCat (`CLAUDE.md` §10).
//
// ⚠️ **`expo-apple-authentication` est chargé en `require` PARESSEUX**, et pour
// la raison déjà mesurée deux fois dans ce dépôt (`lib/generatePlan.ts`,
// `lib/purchases.ts`) : un `require` paresseux ne retire RIEN du bundle web,
// Metro l'analyse statiquement. C'est `lib/appleAuth.web.ts` qui ferme la porte
// pour de vrai, en écartant le SDK par une résolution de PLATEFORME.
//
// ⚠️ **Android n'est PAS un cas d'erreur** : Sign in with Apple n'y existe pas,
// et ce n'est pas un défaut à corriger. `appleSignInAvailable()` y répond
// `false`, l'écran n'affiche simplement pas le bouton.
//
// 🔴 **LE NONCE PART HACHÉ CHEZ APPLE, ET BRUT CHEZ SUPABASE — et se tromper de
// sens coûte un « Nonces mismatch » qu'aucun test ne peut voir.**
//
// La chaîne, dans l'ordre :
//   1. on tire un nonce BRUT (`randomId()`) ;
//   2. Apple reçoit son **SHA-256** et le recopie tel quel dans la revendication
//      `nonce` du jeton d'identité — Apple ne hache RIEN lui-même ;
//   3. Supabase reçoit le nonce **BRUT**, le hache, et compare au jeton.
// Les deux hachages doivent donc tomber sur la même valeur, et c'est le cas parce
// qu'ils portent sur la même chaîne brute.
//
// ⚠️ **CETTE LIGNE A DIT LE CONTRAIRE, ET LA DOCUMENTATION AUSSI.** La première
// version transmettait la valeur brute des deux côtés, sur la foi de la
// documentation Supabase pour Expo — qui écrit noir sur blanc que le nonce n'est
// pas pré-haché. Résultat sur un vrai téléphone, build (15) : **« Nonces
// mismatch »**, systématiquement. Supabase compare `SHA-256(ce qu'on lui donne)` à
// `ce qu'Apple a mis` : donner le brut aux deux rend la comparaison
// mathématiquement impossible à satisfaire.
// ➡️ Aucun test unitaire ne pouvait l'attraper : les deux bouts sont distants. Il a
// fallu un build, une soumission TestFlight et un essai à la main. C'est le coût
// d'une documentation crue sur parole — cf. `feedback-mesurer-l-instrument`.

import { Platform } from 'react-native';
import { randomId } from './randomId';
import { sha256Hex } from './sha256';

type Sdk = typeof import('expo-apple-authentication');
let sdkCache: Sdk | null | undefined;

function loadSdk(): Sdk | null {
  if (sdkCache !== undefined) return sdkCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    sdkCache = require('expo-apple-authentication') as Sdk;
  } catch {
    sdkCache = null;
  }
  return sdkCache;
}

/** Le bouton doit-il même être proposé ? Faux hors iOS, faux si le SDK ou
 *  l'appareil ne le permet pas (compte enfant, restriction, iOS trop ancien). */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const sdk = loadSdk();
  if (!sdk) return false;
  try {
    return await sdk.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Les DEUX formes du nonce, et laquelle va où.
 *
 * Fonction pure, exportée et testée pour une seule raison : la relation entre les
 * deux valeurs est l'invariant que le défaut du build (15) avait rompu, et elle ne
 * se lit nulle part à l'exécution. Écrire `nonce` au lieu de `pourApple` dans
 * `signInAsync` est un « nettoyage » d'apparence anodine qui casse la connexion
 * Apple pour tout le monde, sans qu'aucune ligne ne rougisse.
 */
export function paireNonce(brut: string): { pourApple: string; pourSupabase: string } {
  return { pourApple: sha256Hex(brut), pourSupabase: brut };
}

export type AppleSignInResult =
  | { statut: 'ok'; identityToken: string; nonce: string; email: string | null }
  | { statut: 'annule' }
  | { statut: 'indisponible' }
  | { statut: 'echec'; message: string };

/**
 * Déclenche la feuille système Apple. Ne lève jamais : l'annulation par
 * l'utilisateur est un cas NORMAL, distingué du SDK par son code d'erreur.
 *
 * ⚠️ **Le scope `FULL_NAME` n'est PAS demandé, et c'est délibéré.** Kyroz demande
 * déjà le prénom à l'onboarding (identique pour tout le monde, y compris qui
 * arrive par Apple — `app/index.tsx` y renvoie tout compte sans profil). Le
 * réclamer ICI ajouterait un type de donnée collectée (« Nom ») que la fiche
 * App Privacy ne déclare pas — et cette fiche ne s'écrit PAS par l'API
 * (`reference-asc-api-fiche`), donc l'ajouter coûterait un aller-retour console
 * de plus, pour une information que l'onboarding recueille de toute façon.
 */
export async function signInWithAppleNative(): Promise<AppleSignInResult> {
  const sdk = loadSdk();
  if (!sdk || Platform.OS !== 'ios') return { statut: 'indisponible' };
  try {
    const { pourApple, pourSupabase } = paireNonce(randomId());
    const credential = await sdk.signInAsync({
      requestedScopes: [sdk.AppleAuthenticationScope.EMAIL],
      nonce: pourApple,
    });
    if (!credential.identityToken) {
      return { statut: 'echec', message: "Apple n'a renvoyé aucun jeton d'identité." };
    }
    return {
      statut: 'ok',
      identityToken: credential.identityToken,
      nonce: pourSupabase,
      email: credential.email,
    };
  } catch (e) {
    if (e && typeof e === 'object' && (e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return { statut: 'annule' };
    }
    const message = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Erreur inconnue';
    return { statut: 'echec', message };
  }
}

// ── Le trou RGPD des parcours OAuth ───────────────────────────────────────────
//
// L'inscription par e-mail fait cocher la case de consentement AVANT d'ouvrir
// une session (`app/(auth)/login.tsx:225`) — `canSubmit` l'exige. Une connexion
// Apple, elle, ouvre une session Supabase directement depuis le jeton Apple :
// sans ce prédicat, un compte neuf entrerait dans l'app avec
// `consent_health_data` resté à `false`/absent, EN SILENCE — exactement le
// défaut déjà noté (`docs/JOURNAL.md`) pour tout parcours OAuth.
//
// Fonction PURE, testable sans session ni SDK : `hooks/useAuth.tsx` l'appelle
// juste après avoir relu la ligne `profiles` du compte qui vient de s'ouvrir.
export function consentSanteManquant(profil: { consent_health_data?: boolean | null } | null | undefined): boolean {
  return !profil || profil.consent_health_data !== true;
}
