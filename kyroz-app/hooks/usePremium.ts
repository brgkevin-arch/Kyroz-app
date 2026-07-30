// ── Accès Kyroz+ ─────────────────────────────────────────────────────────────
//
// Point d'entrée UNIQUE pour savoir si une feature premium est accessible. Tout
// l'écran-verrou passe par ici ; personne d'autre ne parle au fournisseur de
// paiement, ce qui rend le branchement de RevenueCat local à ce fichier.
//
// ÉTAT AU 2026-07-30 : le fournisseur n'existe PAS ENCORE (comptes Apple/Google
// et RevenueCat en cours d'ouverture). `entitled` vaut donc `false` partout — et
// ça ne verrouille rien, puisque `PAYWALL_LAUNCH` est `null` (cf. lib/premium.ts).
//
// QUAND REVENUECAT ARRIVERA, une seule chose change ici : `useEntitlement()`
// interrogera `Purchases.getCustomerInfo()` au lieu de renvoyer false.
// ⚠️ Le web ne pourra jamais encaisser (`react-native-purchases` ne supporte pas
// le navigateur) → sur web, `entitled` restera false et le CTA d'achat devra
// renvoyer vers l'app mobile. Ne JAMAIS casser le web pour autant : c'est le
// produit actuellement déployé.

import { useProfile } from './useProfile';
import { PremiumFeature, PremiumAccess, premiumAccess, grandfatheredNotice } from '../lib/premium';

/**
 * Abonnement actif ? Bouchon tant que RevenueCat n'est pas branché.
 *
 * Volontairement séparé : c'est la SEULE fonction à remplacer le jour du
 * câblage, et son isolement rend ce jour-là trivial à relire.
 */
function useEntitlement(): boolean {
  return false;
}

export interface PremiumState extends PremiumAccess {
  /** L'abonnement lui-même, indépendamment du grand-père. */
  entitled: boolean;
  /** Phrase à afficher si l'accès vient de l'ancienneté du compte, sinon null. */
  notice: string | null;
  /** Cette feature précise est-elle utilisable ? */
  can: (feature: PremiumFeature) => boolean;
}

export function usePremium(): PremiumState {
  const { profile } = useProfile();
  const entitled = useEntitlement();
  const access = premiumAccess({ entitled, createdAt: profile?.created_at });

  return {
    ...access,
    entitled,
    notice: grandfatheredNotice(access.reason),
    // Toutes les features premium partagent le même verdict aujourd'hui. La
    // signature prend quand même la feature : le jour où une brique sort dans une
    // offre différente, seul ce fichier change.
    can: () => access.allowed,
  };
}
