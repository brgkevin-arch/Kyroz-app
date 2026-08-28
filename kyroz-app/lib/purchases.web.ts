// ── RevenueCat — la version WEB, qui n'encaisse rien ─────────────────────────
//
// Metro résout `purchases.web.ts` avant `purchases.ts` quand la cible est le
// navigateur. Ce fichier existe pour UNE raison, et elle est mesurée.
//
// ⚠️ LE PIÈGE, VÉRIFIÉ SUR LE BUNDLE EXPORTÉ. `lib/purchases.ts` charge le SDK en
// `require` PARESSEUX, donc il n'est jamais exécuté sur web — mais Metro analyse
// les `require` STATIQUEMENT : le SDK natif se retrouvait quand même **embarqué
// dans le bundle web**, mesuré à 4 occurrences de `purchaseStoreProduct` /
// `RNPurchases` dans l'export. Un `require` paresseux ne retire rien du bundle,
// il retarde seulement l'exécution.
//
// C'est EXACTEMENT ce qui s'était passé avec `lib/generatePlan.ts` : un SDK jamais
// appelé, servi à chaque visiteur (−224 Ko à sa suppression, `CLAUDE.md` §2). La
// leçon n'avait pas été généralisée — elle l'est ici.
//
// ➡️ Kyroz vend par les stores (`CLAUDE.md` §1 : Stripe seul est refusé par Apple
// et Google). Le web n'encaissera donc jamais, et l'écran Kyroz+ le DIT au lieu
// d'afficher un bouton qui échouerait. Ce fichier est la traduction de cette
// décision : sur web, il n'y a pas de paiement — pas même du code de paiement.

export const ENTITLEMENT_ID = 'premium';

export type { StorePrice, StorePrices } from './premium';
import type { StorePrices } from './premium';

export type PurchaseOutcome =
  | { statut: 'ok'; entitled: boolean }
  | { statut: 'annule' }
  | { statut: 'indisponible' }
  | { statut: 'echec'; message: string };

/** Toujours faux sur web : rien n'est encaissable ici. */
export function purchasesConfigured(): boolean {
  return false;
}

export async function configurePurchases(): Promise<null> {
  return null;
}

export function onEntitlementChange(_cb: (entitled: boolean) => void): () => void {
  return () => {};
}

/** Le web n'a pas d'identité d'achat : il n'y a rien à rattacher à un compte. */
export async function identifyUser(_userId: string | null): Promise<boolean> {
  return false;
}

export async function fetchStorePrices(_ids: { monthly: string; annual: string }): Promise<StorePrices> {
  return {};
}

export async function buy(_storeProductId: string): Promise<PurchaseOutcome> {
  return { statut: 'indisponible' };
}

export async function restore(): Promise<PurchaseOutcome> {
  return { statut: 'indisponible' };
}
