// ── RevenueCat — achats in-app (Kyroz+) ──────────────────────────────────────
//
// DORMANT tant que la clé n'est pas posée, exactement comme `lib/analytics.ts`.
// Sans `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`, toutes les fonctions de
// ce fichier renvoient « pas d'abonnement » sans jamais appeler le SDK ni lever
// d'erreur. L'app tourne aujourd'hui exactement comme avant.
//
// ⚠️ CE FICHIER EST LE SEUL À PARLER AU FOURNISSEUR DE PAIEMENT. C'était déjà la
// promesse de `hooks/usePremium.ts` ; elle est tenue.
//
// ── TROIS CHOSES À SAVOIR AVANT DE TOUCHER À CE FICHIER ──────────────────────
//
// 1. **Le web ne peut pas encaisser, et c'est volontaire.** RevenueCat 10 sait
//    facturer sur navigateur (Web Billing), mais ça demande un second produit
//    déclaré, un second jeu de clés et une facturation hors stores. Kyroz vend
//    par les stores (`CLAUDE.md` §1 : Stripe seul est refusé par Apple et Google).
//    Sur web, ce module reste donc inerte et l'écran le DIT plutôt que d'afficher
//    un bouton qui échouerait.
//
// 2. **Le SDK est chargé en `require` PARESSEUX.** Un import statique embarquerait
//    un module natif dans le bundle web, qui est le produit actuellement déployé.
//    C'est la leçon de `lib/generatePlan.ts` : un SDK jamais appelé était quand même
//    servi à chaque visiteur (−224 Ko à sa suppression).
//
// 3. **Aucune fonction d'ici ne lève.** Un paiement qui échoue est un cas NORMAL
//    (annulation, réseau, restriction parentale) : elles renvoient toutes un
//    verdict, jamais une exception. Un écran qui plante sur un achat annulé serait
//    pire que pas de paywall du tout.
//
// ⚠️ **`react-native-purchases` est un module NATIF** : il ne peut pas être livré
// par une mise à jour OTA. Le jour du câblage réel = un nouveau build ET une
// nouvelle revue store (`CLAUDE.md` §2).

import { Platform } from 'react-native';

/**
 * Identifiant de l'entitlement côté RevenueCat. C'est LUI qui décide, pas
 * l'identifiant produit : un même droit peut être servi par plusieurs abonnements
 * (mensuel, annuel, promo, offre d'essai).
 *
 * ⚠️ **`premium`, parce que c'est ce que les deux docs de procédure prescrivent**
 * (`STORE-RELEASE.md` §6, `MONETISATION.md` §A et §C) — donc ce qui sera créé dans
 * le dashboard. Le code avait d'abord posé `kyroz_plus`, inventé ici : c'est la même
 * faute que `kyroz_plus_annual` vs `kyroz_plus_yearly`, et elle échoue de la même
 * façon — en SILENCE, l'entitlement n'étant simplement jamais trouvé.
 * ➡️ Si le dashboard dit autre chose, c'est le dashboard qui a raison : une seule
 * ligne à changer ici, et le test qui la verrouille.
 */
export const ENTITLEMENT_ID = 'premium';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

/** La clé publique du store courant, ou '' si elle n'est pas posée. */
function apiKey(): string {
  if (Platform.OS === 'ios') return IOS_KEY;
  if (Platform.OS === 'android') return ANDROID_KEY;
  return '';
}

/**
 * Le module peut-il réellement encaisser ?
 *
 * C'est le prédicat que l'UI doit interroger AVANT d'afficher un bouton d'achat.
 * Faux sur web, faux sans clé — donc faux aujourd'hui, partout.
 */
export function purchasesConfigured(): boolean {
  return Platform.OS !== 'web' && apiKey() !== '';
}

// ── Chargement paresseux du SDK ──────────────────────────────────────────────

type Sdk = typeof import('react-native-purchases');
let sdkCache: Sdk | null | undefined;
let configuring: Promise<Sdk | null> | null = null;

function loadSdk(): Sdk | null {
  if (sdkCache !== undefined) return sdkCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    sdkCache = require('react-native-purchases') as Sdk;
  } catch {
    // Paquet absent (ex. build web, ou install partielle) → on reste dormant.
    sdkCache = null;
  }
  return sdkCache;
}

/**
 * Configure le SDK une seule fois. Renvoie `null` si on est dormant.
 * Idempotent et sûr à appeler depuis n'importe quel écran.
 */
export async function configurePurchases(): Promise<Sdk | null> {
  if (!purchasesConfigured()) return null;
  if (configuring) return configuring;
  configuring = (async () => {
    const sdk = loadSdk();
    if (!sdk) return null;
    try {
      const Purchases = sdk.default;
      // `LOG_LEVEL.ERROR` : le SDK est bavard par défaut, et ses logs contiennent
      // des identifiants d'achat. On ne veut ni le bruit ni la fuite en console.
      await Purchases.setLogLevel(sdk.LOG_LEVEL.ERROR);
      await Purchases.configure({ apiKey: apiKey() });
      return sdk;
    } catch {
      return null;
    }
  })();
  return configuring;
}

// ── Entitlement ──────────────────────────────────────────────────────────────

// ⚠️ **Il n'y a PAS de `isEntitled()` sans identité, et c'est volontaire.** Cette
// fonction existait : elle lisait `getCustomerInfo()` sans jamais dire au SDK de QUI
// il s'agissait, donc elle répondait pour l'identité courante de l'APPAREIL. La
// garder à côté d'`identifyUser()` laisserait deux façons de demander « cette
// personne a-t-elle payé ? », dont une qui ignore le compte — le genre de double
// chemin que `CLAUDE.md` §10 interdit. Pour connaître l'état d'abonnement, on passe
// par `identifyUser()` (au montage et à chaque changement de compte) ou par
// l'écouteur ci-dessous.
//
// ⚠️ Renvoie `false` en cas d'échec réseau, et c'est le bon sens de l'erreur ici :
// `PAYWALL_LAUNCH` verrouille par DATE DE COMPTE, pas par abonnement, donc un
// `false` erroné ne retire rien à un compte grand-péré. Pour un compte payant hors
// ligne, le SDK sert son cache local — c'est lui qui gère la tolérance, pas nous.

/**
 * S'abonner aux changements d'abonnement (achat, expiration, restauration sur un
 * autre appareil). Renvoie la fonction de désabonnement — toujours appelable,
 * même en dormant.
 */
export function onEntitlementChange(cb: (entitled: boolean) => void): () => void {
  if (!purchasesConfigured()) return () => {};
  const sdk = loadSdk();
  if (!sdk) return () => {};
  try {
    const listener = (info: { entitlements: { active: Record<string, unknown> } }) =>
      cb(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
    sdk.default.addCustomerInfoUpdateListener(listener);
    return () => {
      try { sdk.default.removeCustomerInfoUpdateListener(listener); } catch { /* déjà retiré */ }
    };
  } catch {
    return () => {};
  }
}

// ── Identité : l'abonnement suit le COMPTE, pas l'appareil ───────────────────
//
// ⚠️ **C'était le trou du câblage du 2026-08-02.** `Purchases.configure({ apiKey })`
// sans identifiant crée un utilisateur ANONYME, propre à l'appareil. Conséquences
// concrètes, dans les deux sens :
//   • deux personnes sur le même téléphone — la seconde héritait de l'abonnement de
//     la première, parce que le droit était collé à l'appareil et que rien ne le
//     retirait à la déconnexion ;
//   • une personne sur deux appareils — celui de gauche a payé, celui de droite est
//     `locked`, alors que c'est le même compte Kyroz.
// Le compte Supabase est l'ancre naturelle : c'est déjà lui qui porte
// `created_at`, donc le grand-père (`lib/premium.ts`).
//
// L'identifiant transmis est l'UUID Supabase — pseudonyme, jamais l'e-mail :
// RevenueCat déconseille explicitement d'y mettre une donnée personnelle, et cet
// identifiant voyage jusqu'à leurs serveurs.

/** Le strict minimum du SDK dont dépend l'identité. Existe pour être testable. */
export interface IdentityApi {
  logIn: (userId: string) => Promise<{ customerInfo: CustomerInfoLike }>;
  logOut: () => Promise<CustomerInfoLike>;
  getCustomerInfo: () => Promise<CustomerInfoLike>;
}

type CustomerInfoLike = { entitlements: { active: Record<string, unknown> } };

const actif = (info: CustomerInfoLike): boolean =>
  info.entitlements.active[ENTITLEMENT_ID] !== undefined;

/**
 * La règle d'identité, isolée du SDK pour être VÉRIFIABLE. Vitest ne peut pas
 * charger un module natif — sans cette extraction, le chemin qui décide qui a
 * payé n'aurait aucun test, et il échouerait en silence.
 *
 * ⚠️ **En cas d'échec de `logIn`, on renvoie `false` — jamais l'état de l'identité
 * précédente.** Se tromper en refusant coûte une feature à un abonné hors ligne, le
 * temps d'un nouvel essai ; se tromper en donnant sert l'abonnement de la personne
 * d'AVANT sur un téléphone partagé. Le premier sens est réparable, pas le second.
 */
export async function applyIdentity(api: IdentityApi, userId: string | null): Promise<boolean> {
  if (userId) {
    try {
      const { customerInfo } = await api.logIn(userId);
      return actif(customerInfo);
    } catch {
      return false;
    }
  }
  // Déconnexion. `logOut()` LÈVE quand on est déjà anonyme — ce n'est pas une
  // erreur, c'est l'état normal de quelqu'un qui n'a jamais eu de compte.
  try {
    return actif(await api.logOut());
  } catch {
    try {
      return actif(await api.getCustomerInfo());
    } catch {
      return false;
    }
  }
}

/**
 * Rattache (ou détache) les achats au compte Kyroz. Renvoie l'état d'abonnement de
 * l'identité résultante. Ne lève jamais ; sans clé, ne fait rien et renvoie `false`.
 */
export async function identifyUser(userId: string | null): Promise<boolean> {
  const sdk = await configurePurchases();
  if (!sdk) return false;
  return applyIdentity(sdk.default as unknown as IdentityApi, userId);
}

// ── Prix ─────────────────────────────────────────────────────────────────────

/** Prix LOCALISÉS renvoyés par le store, par formule. */
export type StorePrices = Partial<Record<'monthly' | 'annual', string>>;

/**
 * Prix réels du store, localisés (`priceString`).
 *
 * ⚠️ C'est le point « pas de mensonge » du chantier : `PREMIUM_PRICES` porte les
 * tarifs FRANÇAIS, écrits en dur pour la capture de la revue Apple. Afficher des
 * euros à quelqu'un qui sera facturé en dollars serait exactement ce que la règle
 * interdit. Dès que le store répond, ses chaînes remplacent les nôtres.
 *
 * Renvoie `{}` si on est dormant ou si l'offre n'est pas encore publiée — l'appelant
 * retombe alors sur les tarifs de repli, et l'écran DIT que c'en sont.
 */
export async function fetchStorePrices(ids: { monthly: string; annual: string }): Promise<StorePrices> {
  const sdk = await configurePurchases();
  if (!sdk) return {};
  try {
    const produits = await sdk.default.getProducts([ids.monthly, ids.annual]);
    const prix: StorePrices = {};
    for (const p of produits) {
      if (p.identifier === ids.monthly) prix.monthly = p.priceString;
      if (p.identifier === ids.annual) prix.annual = p.priceString;
    }
    return prix;
  } catch {
    return {};
  }
}

// ── Achat et restauration ────────────────────────────────────────────────────

export type PurchaseOutcome =
  | { statut: 'ok'; entitled: boolean }
  | { statut: 'annule' }
  | { statut: 'indisponible' }   // dormant, ou produit introuvable côté store
  | { statut: 'echec'; message: string };

/**
 * Achat d'une formule. Ne lève jamais : l'annulation par l'utilisateur est un cas
 * NORMAL et se distingue d'une vraie erreur (`userCancelled` du SDK).
 */
export async function buy(storeProductId: string): Promise<PurchaseOutcome> {
  const sdk = await configurePurchases();
  if (!sdk) return { statut: 'indisponible' };
  try {
    const produits = await sdk.default.getProducts([storeProductId]);
    const produit = produits.find((p) => p.identifier === storeProductId);
    if (!produit) return { statut: 'indisponible' };
    const { customerInfo } = await sdk.default.purchaseStoreProduct(produit);
    return { statut: 'ok', entitled: customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined };
  } catch (e) {
    if (e && typeof e === 'object' && (e as { userCancelled?: boolean }).userCancelled) {
      return { statut: 'annule' };
    }
    const message = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Erreur inconnue';
    return { statut: 'echec', message };
  }
}

/**
 * Restauration des achats.
 *
 * ⚠️ **Apple l'EXIGE** dès qu'une app vend un abonnement non consommable : sans un
 * bouton « Restaurer mes achats » fonctionnel, la revue rejette (Guideline 3.1.1).
 * Ce n'est pas une commodité, c'est un prérequis de publication.
 */
export async function restore(): Promise<PurchaseOutcome> {
  const sdk = await configurePurchases();
  if (!sdk) return { statut: 'indisponible' };
  try {
    const info = await sdk.default.restorePurchases();
    return { statut: 'ok', entitled: info.entitlements.active[ENTITLEMENT_ID] !== undefined };
  } catch (e) {
    const message = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Erreur inconnue';
    return { statut: 'echec', message };
  }
}
