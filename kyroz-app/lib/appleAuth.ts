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

/**
 * Le PRÉNOM à afficher, tiré de ce qu'Apple renvoie.
 *
 * Fonction PURE et exportée, pour la même raison que `paireNonce` : c'est une
 * décision, pas un accès de champ, et elle est invérifiable à l'exécution — le SDK
 * natif n'existe ni sous vitest ni sur le web, et Apple ne rend ce champ **qu'une
 * seule fois dans la vie du compte**. Un défaut ici ne se verrait donc qu'en créant
 * un compte neuf sur un vrai téléphone : le coût exact déjà payé pour le nonce.
 *
 * Trois cas, et ils arrivent tous :
 *   · `givenName` renseigné — le cas nominal, première autorisation ;
 *   · `null` — toute connexion SUIVANTE. Ce n'est PAS une erreur ;
 *   · un objet présent mais vide / blanc — Apple laisse la personne effacer les
 *     champs dans sa feuille avant de valider. `''` doit alors se lire comme
 *     « rien », jamais comme un prénom vide qui écraserait celui déjà connu.
 *
 * ⚠️ On ne garde QUE le prénom. `familyName` n'a aucun emploi dans Kyroz — la seule
 * chose qui s'affiche est la salutation de l'écran Plan — et la règle de
 * minimisation d'Apple est explicite (WWDC22 : *« if you just need a unique
 * identifier to identify the user, don't collect name or email »*). Demander le
 * scope est une chose, garder ce qu'on n'emploie pas en est une autre.
 */
export function prenomApple(
  fullName: { givenName?: string | null } | null | undefined,
): string | null {
  const brut = fullName?.givenName?.trim() ?? '';
  return brut.length > 0 ? brut : null;
}

export type AppleSignInResult =
  | { statut: 'ok'; identityToken: string; nonce: string; email: string | null; prenom: string | null }
  | { statut: 'annule' }
  | { statut: 'indisponible' }
  | { statut: 'echec'; message: string };

/**
 * Déclenche la feuille système Apple. Ne lève jamais : l'annulation par
 * l'utilisateur est un cas NORMAL, distingué du SDK par son code d'erreur.
 *
 * 🔴 **`FULL_NAME` EST DEMANDÉ DEPUIS LE 2026-09-10, ET LE RAISONNEMENT D'AVANT
 * A ÉTÉ RETOURNÉ PAR UN REJET D'APPLE** (guideline 4, revue du même jour) :
 *
 * > *« users are required to provide their name and/or email address after using
 * > Sign in with Apple even though that information is already provided by the
 * > Authentication Services framework. »*
 *
 * Ce bloc disait le contraire, et son argument se tenait : ne pas demander le
 * scope évitait d'ajouter un type de donnée (« Nom ») à la fiche App Privacy, pour
 * une information que l'onboarding recueillait de toute façon. **C'est précisément
 * ce « de toute façon » qui est le défaut** — l'étape 1 de l'inscription redemandait
 * un prénom qu'Apple venait de proposer de donner. Du point de vue d'Apple, l'app
 * fait retaper à la main ce que le système lui tendait.
 *
 * ⚠️ **Et l'objection App Privacy tombe à la mesure** : `saveFirstName` écrit dans
 * AsyncStorage, hors du profil synchronisé (`lib/profileName.ts` : « purement
 * cosmétique, stocké en LOCAL uniquement »). Au sens d'Apple, « collecter » c'est
 * TRANSMETTRE hors de l'appareil — un prénom qui ne quitte jamais le téléphone n'est
 * pas une donnée collectée. **Rien à déclarer, donc aucun aller-retour console.**
 * ➡️ Si un jour le prénom rejoint `profiles`, cette phrase devient fausse et la
 * fiche App Privacy doit gagner « Nom » AVANT le déploiement.
 *
 * 🔴 **LE NOM N'ARRIVE QU'À LA TOUTE PREMIÈRE AUTORISATION.** Apple le dit
 * explicitement (WWDC22, « Enhance your Sign in with Apple experience ») : *« properties
 * like fullName, email, and realUserStatus are only returned when an account is created
 * for the very first time. They're not returned upon subsequent sign-ins. »* Une
 * deuxième connexion — un réinstall, un autre appareil, et **le relecteur Apple qui
 * réessaie** — rend `fullName: null`. C'est pour ça que l'appelant le persiste
 * IMMÉDIATEMENT (`hooks/useAuth.tsx`) et que l'étape 1 de l'onboarding ne BLOQUE plus
 * sur un compte Apple : les deux moitiés sont nécessaires, une seule ne suffit pas.
 */
export async function signInWithAppleNative(): Promise<AppleSignInResult> {
  const sdk = loadSdk();
  if (!sdk || Platform.OS !== 'ios') return { statut: 'indisponible' };
  try {
    const { pourApple, pourSupabase } = paireNonce(randomId());
    const credential = await sdk.signInAsync({
      requestedScopes: [sdk.AppleAuthenticationScope.FULL_NAME, sdk.AppleAuthenticationScope.EMAIL],
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
      prenom: prenomApple(credential.fullName),
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
