// ── Accès Kyroz+ ─────────────────────────────────────────────────────────────
//
// Point d'entrée UNIQUE pour savoir si une feature premium est accessible. Tout
// l'écran-verrou passe par ici ; personne d'autre ne parle au fournisseur de
// paiement — seul `lib/purchases.ts` le fait, et seul ce fichier l'appelle.
//
// ÉTAT AU 2026-08-02 : RevenueCat est CÂBLÉ mais DORMANT. Sans
// `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`, `isEntitled()` renvoie `false`
// sans jamais toucher au SDK — et ça ne verrouille rien, puisque `PAYWALL_LAUNCH`
// est `null` (cf. lib/premium.ts). Deux interrupteurs indépendants, exprès :
// la clé allume le paiement, la date allume le verrou.
//
// ⚠️ Le web ne peut jamais encaisser (`purchasesConfigured()` est faux sur web) →
// `entitled` y reste false et l'écran renvoie vers l'app mobile. Ne JAMAIS casser
// le web pour autant : c'est le produit actuellement déployé.

import { useEffect, useState } from 'react';
import { useProfile } from './useProfile';
import { PremiumFeature, PremiumAccess, premiumAccess, grandfatheredNotice } from '../lib/premium';
import { isEntitled, onEntitlementChange, purchasesConfigured } from '../lib/purchases';

/**
 * Abonnement actif ?
 *
 * Deux sources, et il faut les deux : une lecture au montage (l'état au démarrage,
 * servi depuis le cache du SDK même hors ligne) et un écouteur (achat en cours,
 * expiration, restauration faite sur un AUTRE appareil). Sans l'écouteur, un achat
 * ne se verrait qu'au prochain lancement de l'app.
 *
 * ⚠️ En dormant, aucun `setState` n'est jamais appelé : le hook coûte exactement un
 * `useState(false)`, sur tous les écrans qui l'utilisent.
 */
function useEntitlement(): boolean {
  const [entitled, setEntitled] = useState(false);

  useEffect(() => {
    if (!purchasesConfigured()) return;
    let vivant = true;
    isEntitled().then((e) => { if (vivant) setEntitled(e); });
    const stop = onEntitlementChange((e) => { if (vivant) setEntitled(e); });
    return () => { vivant = false; stop(); };
  }, []);

  return entitled;
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
