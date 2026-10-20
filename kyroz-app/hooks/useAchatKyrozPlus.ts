import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useDialog } from '../components/Dialog';
import { PREMIUM_PRICES, annualSavingPct, withStorePrices, type StorePrices } from '../lib/premium';
import { buy, fetchStorePrices, purchasesConfigured, restore } from '../lib/purchases';

/**
 * L'ACHAT DE KYROZ+ — prix réels du store, abonnement, restauration et leurs messages.
 *
 * Sorti de `app/kyroz-plus.tsx` le 2026-10-20, à l'arrivée de la page Kyroz+ du parcours
 * d'arrivée (`app/offre-kyroz-plus.tsx`) : deux écrans vendent, UNE logique d'argent. Deux
 * copies de ces messages finiraient par se contredire, sur la seule chose de l'app qui débite.
 * Le texte est celui de l'écran d'origine, au mot près.
 *
 * `enVente` : la personne doit payer pour avoir Kyroz+ (`reason === 'locked'`). Sans lui, on
 * n'interroge pas le store.
 */
export function useAchatKyrozPlus(enVente: boolean) {
  const dialog = useDialog();
  // ⚠️ L'ANNUEL EST PRÉSÉLECTIONNÉ (2026-08-25) — une décision, pas un défaut
  // d'écriture. Le mensuel l'était jusque-là, ce qui mettait en avant la seule
  // formule dont l'économie affichée juste en dessous (`annualSavingPct`) ne parle
  // pas. Le mensuel reste à UN TAP et n'est jamais masqué : on met en avant, on
  // n'enferme pas — c'est la limite entre présélectionner et piéger.
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [prixStore, setPrixStore] = useState<StorePrices>({});
  const [enCours, setEnCours] = useState(false);

  const store = Platform.OS === 'android' ? 'Google Play' : 'App Store';
  const encaissable = purchasesConfigured();

  // Prix RÉELS du store, localisés. Tant qu'ils n'arrivent pas (dormant, offre non
  // publiée, réseau), on garde les tarifs français ET on le dit — cf. `withStorePrices`.
  const { plans, fallback } = useMemo(() => withStorePrices(prixStore), [prixStore]);
  const economie = useMemo(() => annualSavingPct(plans), [plans]);

  useEffect(() => {
    if (!enVente || !encaissable) return;
    let vivant = true;
    const ids = {
      monthly: PREMIUM_PRICES.find((p) => p.id === 'monthly')!.storeProductId,
      annual: PREMIUM_PRICES.find((p) => p.id === 'annual')!.storeProductId,
    };
    fetchStorePrices(ids).then((p) => { if (vivant) setPrixStore(p); });
    return () => { vivant = false; };
  }, [enVente, encaissable]);

  const choisi = plans.find((p) => p.id === plan) ?? plans[0];

  // ⚠️ `useDialog` et PAS `Alert.alert` : ce dernier est une fonction VIDE sur
  // react-native-web (CLAUDE.md §11). Un achat échoué y serait resté MUET.
  const acheter = async () => {
    if (enCours) return;
    setEnCours(true);
    const r = await buy(choisi.storeProductId);
    setEnCours(false);
    if (r.statut === 'annule') return;          // l'utilisateur a renoncé : rien à dire
    if (r.statut === 'ok') {
      await dialog.notify({
        title: r.entitled ? 'Kyroz+ est actif' : 'Achat enregistré',
        message: r.entitled
          ? 'Tes deux outils sont débloqués. Le renouvellement se gère dans ton compte ' + store + '.'
          : "L'achat est passé mais le droit n'est pas encore actif. Il le sera d'ici quelques instants.",
      });
      return;
    }
    // ⚠️ `sansreponse` n'est PAS un échec : l'issue réelle est INCONNUE (le store
    // n'a pas répondu à temps, cf. `lib/purchases.ts::PURCHASE_BUDGET_MS`). Dire
    // « rien ne t'a été débité » ici serait un mensonge si l'achat aboutit malgré
    // tout une seconde plus tard — Kyroz+ s'activerait alors tout seul.
    if (r.statut === 'sansreponse') {
      await dialog.notify({
        title: 'Pas de réponse du store',
        message: "On n'a pas de réponse pour l'instant. Si l'achat aboutit, Kyroz+ s'active automatiquement. Sinon, réessaie dans un instant.",
      });
      return;
    }
    await dialog.notify({
      title: "L'achat n'a pas abouti",
      message: r.statut === 'indisponible'
        ? "L'abonnement n'est pas disponible sur cet appareil pour l'instant. Rien ne t'a été débité."
        : `${r.message}\n\nRien ne t'a été débité.`,
    });
  };

  const restaurer = async () => {
    if (enCours) return;
    setEnCours(true);
    const r = await restore();
    setEnCours(false);
    if (r.statut === 'ok') {
      await dialog.notify({
        title: r.entitled ? 'Abonnement retrouvé' : 'Aucun abonnement à restaurer',
        message: r.entitled
          ? 'Ton Kyroz+ est de nouveau actif sur cet appareil.'
          : `Aucun achat Kyroz+ n'est associé à ce compte ${store}.`,
      });
      return;
    }
    if (r.statut === 'sansreponse') {
      await dialog.notify({
        title: 'Pas de réponse du store',
        message: "On n'a pas de réponse pour l'instant. Réessaie dans un instant.",
      });
      return;
    }
    await dialog.notify({
      title: 'Restauration impossible',
      message: r.statut === 'echec'
        ? r.message
        : "Les achats ne sont pas disponibles sur cet appareil.",
    });
  };

  // L'essai et le prix de la formule CHOISIE, tels que le STORE les sert — jamais nos tarifs de
  // repli : la frise date un paiement, elle ne peut pas parler d'un prix supposé.
  const essaiJours = prixStore[plan]?.essaiJours ?? null;
  const prixStoreChoisi = prixStore[plan]?.priceString ?? null;
  return { plan, setPlan, plans, fallback, economie, choisi, enCours, acheter, restaurer, store, encaissable, essaiJours, prixStoreChoisi };
}
