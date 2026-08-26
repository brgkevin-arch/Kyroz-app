// ── Accès Kyroz+ ─────────────────────────────────────────────────────────────
//
// Point d'entrée UNIQUE pour savoir si une feature premium est accessible. Tout
// l'écran-verrou passe par ici ; personne d'autre ne parle au fournisseur de
// paiement — seul `lib/purchases.ts` le fait, et seul ce fichier l'appelle.
//
// ÉTAT AU 2026-08-02 : RevenueCat est CÂBLÉ mais DORMANT. Sans
// `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`, `identifyUser()` renvoie `false`
// sans jamais toucher au SDK — et ça ne verrouille rien, puisque `PAYWALL_LAUNCH`
// est `null` (cf. lib/premium.ts). Deux interrupteurs indépendants, exprès :
// la clé allume le paiement, la date allume le verrou.
//
// ⚠️ Le web ne peut jamais encaisser (`purchasesConfigured()` est faux sur web) →
// `entitled` y reste false et l'écran renvoie vers l'app mobile. Ne JAMAIS casser
// le web pour autant : c'est le produit actuellement déployé.

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { PremiumFeature, PremiumAccess, premiumAccess, grandfatheredNotice, isGrandfathered, PAYWALL_LAUNCH } from '../lib/premium';
import { identifyUser, onEntitlementChange, purchasesConfigured } from '../lib/purchases';

/**
 * Abonnement actif ?
 *
 * Deux sources, et il faut les deux : une lecture au montage (l'état au démarrage,
 * servi depuis le cache du SDK même hors ligne) et un écouteur (achat en cours,
 * expiration, restauration faite sur un AUTRE appareil). Sans l'écouteur, un achat
 * ne se verrait qu'au prochain lancement de l'app.
 *
 * ⚠️ **L'effet est REJOUÉ à chaque changement de compte, et c'est le correctif du
 * 2026-08-02.** Il ne tournait qu'au montage (`[]`), et RevenueCat travaillait sur une
 * identité ANONYME liée à l'appareil : se déconnecter ne retirait donc rien. Sur un
 * téléphone partagé, la personne suivante héritait de l'abonnement de la précédente.
 * `identifyUser` rattache les achats au compte Supabase (cf. `lib/purchases.ts`).
 *
 * ⚠️ `setEntitled(false)` AVANT de redemander : le droit de l'ancien compte ne doit
 * pas survivre une seule frame à la déconnexion. Le SDK répond ensuite, en réseau.
 *
 * ⚠️ En dormant, aucun `setState` n'est jamais appelé : le hook coûte exactement un
 * `useState(false)`, sur tous les écrans qui l'utilisent.
 */
function useEntitlement(necessaire: boolean): boolean {
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  const [entitled, setEntitled] = useState(false);

  useEffect(() => {
    if (!purchasesConfigured()) return;
    // 🔴 **AJOUTÉ LE 2026-08-26 — L'IDENTIFIANT NE PART QUE S'IL SERT** (audit V1,
    // constat 09-01). `identifyUser(uid)` transmet l'identifiant de compte Supabase à
    // RevenueCat ; il partait à CHAQUE connexion, abonné ou non. Deux problèmes :
    //  • le §2 de la politique annonçait « uniquement si vous souscrivez » quand le §5
    //    disait « que vous soyez abonné ou non » — deux sections du même document, et
    //    c'est le §2 qu'on lit pour remplir le formulaire App Privacy ;
    //  • « exécution du contrat » (RGPD 6-1-b) se défend mal pour quelqu'un qui n'a
    //    rien souscrit : il n'y a pas de contrat dont la transmission serait nécessaire.
    // ⚠️ Ce n'était pas seulement discutable, c'était INUTILE : tant que le verdict ne
    // consulte pas `entitled`, la réponse du SDK ne change rien à l'écran.
    // ➡️ On n'identifie donc que si le verdict en DÉPEND (cf. `entitlementNecessaire`),
    // ce qui rend le §2 et le §5 vrais tous les deux sans réécrire une ligne de texte.
    if (!necessaire) return;
    let vivant = true;
    setEntitled(false);
    identifyUser(uid).then((e) => { if (vivant) setEntitled(e); });
    const stop = onEntitlementChange((e) => { if (vivant) setEntitled(e); });
    return () => { vivant = false; stop(); };
  }, [uid, necessaire]);

  return entitled;
}

/**
 * Le verdict d'accès dépend-il de l'abonnement ?
 *
 * `premiumAccess` sort AVANT de lire `entitled` dans deux cas : le paywall n'est pas
 * lancé, ou le compte est grand-péré. Dans ces deux cas, interroger le fournisseur de
 * paiement ne peut rien changer à ce que l'écran affiche — donc l'identifiant n'a
 * aucune raison de sortir de l'appareil.
 *
 * ⚠️ **Prudence dans le sens qui protège l'accès** : une date de création absente rend
 * `isGrandfathered` vrai (`lib/premium.ts:75`), donc `necessaire` faux, donc l'accès
 * est accordé sans interroger personne. C'est déjà le comportement voulu — se tromper
 * en DONNANT, jamais en retirant.
 */
function entitlementNecessaire(createdAt: string | null | undefined): boolean {
  if (!PAYWALL_LAUNCH) return false;
  return !isGrandfathered(createdAt);
}

export interface PremiumState extends PremiumAccess {
  /** L'abonnement lui-même, indépendamment du grand-père. */
  entitled: boolean;
  /** Phrase à afficher si l'accès vient de l'ancienneté du compte, sinon null. */
  notice: string | null;
  /** Cette feature précise est-elle utilisable ? */
  can: (feature: PremiumFeature) => boolean;
}

export function usePremium(options?: { forcerIdentification?: boolean }): PremiumState {
  const { profile } = useProfile();
  // `forcerIdentification` : l'écran Kyroz+ le pose, parce qu'ACHETER exige que le
  // fournisseur sache à quel compte rattacher l'achat — même sur un compte grand-péré
  // qui voudrait s'abonner quand même. Partout ailleurs, on laisse le verdict décider.
  const necessaire = options?.forcerIdentification === true
    || entitlementNecessaire(profile?.created_at);
  const entitled = useEntitlement(necessaire);
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
