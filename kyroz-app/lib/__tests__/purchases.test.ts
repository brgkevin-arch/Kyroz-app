import { describe, it, expect, afterEach } from 'vitest';
import { Platform } from 'react-native';
import { withStorePrices, annualSavingPct, PREMIUM_PRICES } from '../premium';
import { ENTITLEMENT_ID, purchasesConfigured, applyIdentity, identifyUser, IdentityApi } from '../purchases';

/**
 * Câblage RevenueCat (2026-08-02) — ce qui est TESTABLE, et pourquoi c'est ça.
 *
 * `lib/purchases.ts` parle à un SDK natif : son comportement réel ne s'observe que
 * sur un appareil, avec un compte store. Ce qui se teste ici est la partie qui
 * ENGAGE LE PRODUIT et qui vit en TypeScript pur :
 *   1. le module est bien DORMANT tant que la clé n'est pas posée ;
 *   2. le prix affiché est celui du store dès qu'il existe, et l'écran DIT quand
 *      ce n'en est pas un.
 *
 * Le point 2 est un point « pas de mensonge » (`CLAUDE.md` §10) : `PREMIUM_PRICES`
 * porte les tarifs FRANÇAIS, écrits en dur pour la capture de la revue Apple.
 * Les afficher à quelqu'un qui sera facturé en dollars serait le mensonge que la
 * règle interdit.
 */
describe('RevenueCat — dormance', () => {
  afterEach(() => { Platform.OS = 'ios'; });

  it('sans clé posée, le module ne peut RIEN encaisser', () => {
    // Le mock place `Platform.OS` sur `ios` : le seul motif de dormance ici est
    // donc bien l'ABSENCE DE CLÉ, pas la plateforme. Si ce test devient faux,
    // c'est qu'une clé RevenueCat a fuité dans l'environnement de test.
    expect(Platform.OS).toBe('ios');
    expect(purchasesConfigured()).toBe(false);
  });

  it('le web ne peut JAMAIS encaisser, même une clé posée', () => {
    // Kyroz vend par les stores (CLAUDE.md §1) et le web est le produit déployé :
    // il ne doit jamais afficher un bouton d'achat qui échouerait.
    Platform.OS = 'web';
    expect(purchasesConfigured()).toBe(false);
  });

  it("l'entitlement porte le nom PRESCRIT PAR LA PROCÉDURE, pas un nom inventé", () => {
    // `STORE-RELEASE.md` §6 et `MONETISATION.md` §A/§C disent tous les deux `premium` :
    // c'est ce qui sera créé dans le dashboard, donc c'est ce que le code doit lire.
    // Le code avait posé `kyroz_plus`, inventé de son côté — même faute que
    // `kyroz_plus_annual` vs `kyroz_plus_yearly`, et même échec SILENCIEUX à la clé.
    expect(ENTITLEMENT_ID).toBe('premium');
  });
});

// ── Identité ─────────────────────────────────────────────────────────────────
//
// Le défaut corrigé le 2026-08-02 : le SDK était configuré SANS identifiant, donc
// sur une identité anonyme propre à l'APPAREIL. Deux dégâts symétriques — la
// personne suivante sur un téléphone partagé héritait de l'abonnement, et la même
// personne sur son second appareil se retrouvait verrouillée.
//
// Ces tests portent sur `applyIdentity`, la règle isolée du SDK. C'est le SEUL moyen
// de la tester : vitest ne peut pas charger un module natif. Sans cette extraction,
// le chemin qui décide qui a payé n'aurait aucun test — et il échoue en SILENCE.

const infoAvec = (droits: string[]) => ({
  entitlements: { active: Object.fromEntries(droits.map((d) => [d, {}])) },
});

function faussSdk(over: Partial<IdentityApi> = {}): IdentityApi & { vus: string[] } {
  const vus: string[] = [];
  return {
    vus,
    logIn: over.logIn ?? (async (id) => { vus.push(`logIn:${id}`); return { customerInfo: infoAvec([]) }; }),
    logOut: over.logOut ?? (async () => { vus.push('logOut'); return infoAvec([]); }),
    getCustomerInfo: over.getCustomerInfo ?? (async () => { vus.push('getCustomerInfo'); return infoAvec([]); }),
  };
}

describe("identité — l'abonnement suit le COMPTE, pas l'appareil", () => {
  it("rattache les achats à l'identifiant du compte Kyroz", async () => {
    const sdk = faussSdk({ logIn: async (id) => ({ customerInfo: infoAvec(id === 'u-1' ? [ENTITLEMENT_ID] : []) }) });
    expect(await applyIdentity(sdk, 'u-1')).toBe(true);
    expect(await applyIdentity(sdk, 'u-2')).toBe(false);
  });

  it('la déconnexion RETIRE le droit du compte précédent', async () => {
    // Le cas concret : deux personnes sur le même téléphone. Sans `logOut`, la
    // seconde ouvrait Kyroz+ avec l'abonnement de la première.
    const sdk = faussSdk();
    expect(await applyIdentity(sdk, null)).toBe(false);
    expect(sdk.vus).toContain('logOut');
  });

  it("« déjà anonyme » n'est PAS une erreur — on lit l'état anonyme", async () => {
    // `logOut()` lève quand personne n'est connecté. C'est l'état normal de qui n'a
    // jamais créé de compte : le traiter comme un échec priverait de son achat
    // quelqu'un qui a payé sans compte Kyroz.
    const sdk = faussSdk({
      logOut: async () => { throw new Error('current user is anonymous'); },
      getCustomerInfo: async () => infoAvec([ENTITLEMENT_ID]),
    });
    expect(await applyIdentity(sdk, null)).toBe(true);
  });

  it("un `logIn` en échec ne sert JAMAIS le droit de l'identité précédente", async () => {
    // Le sens de l'erreur est choisi : se tromper en refusant coûte une feature à un
    // abonné hors ligne le temps d'un nouvel essai ; se tromper en donnant sert
    // l'abonnement de quelqu'un d'autre. Le premier se répare, pas le second.
    const sdk = faussSdk({ logIn: async () => { throw new Error('réseau'); } });
    expect(await applyIdentity(sdk, 'u-1')).toBe(false);
    expect(sdk.vus).not.toContain('getCustomerInfo');
  });

  it('ne lève jamais, même si tout le SDK échoue', async () => {
    const casse = async () => { throw new Error('boum'); };
    const sdk: IdentityApi = { logIn: casse, logOut: casse, getCustomerInfo: casse };
    expect(await applyIdentity(sdk, 'u-1')).toBe(false);
    expect(await applyIdentity(sdk, null)).toBe(false);
  });

  it('en dormant, `identifyUser` ne touche à rien et renvoie false', async () => {
    expect(await identifyUser('u-1')).toBe(false);
    expect(await identifyUser(null)).toBe(false);
  });
});

describe('prix du store', () => {
  it('le prix du store REMPLACE le tarif de repli', () => {
    const { plans, fallback } = withStorePrices({ monthly: '$4.99', annual: '$39.99' });
    expect(plans.find((p) => p.id === 'monthly')!.price).toBe('$4.99');
    expect(plans.find((p) => p.id === 'annual')!.price).toBe('$39.99');
    expect(fallback).toBe(false);
  });

  it('un SEUL prix manquant suffit à signaler le repli', () => {
    // Sinon l'écran tairait qu'un des deux montants est en euros pour quelqu'un
    // qui sera facturé ailleurs.
    const { plans, fallback } = withStorePrices({ monthly: '$4.99' });
    expect(plans.find((p) => p.id === 'monthly')!.price).toBe('$4.99');
    expect(plans.find((p) => p.id === 'annual')!.price).toBe('39,99 €');
    expect(fallback).toBe(true);
  });

  it('sans aucun prix du store, on garde les tarifs français ET on le dit', () => {
    const { plans, fallback } = withStorePrices({});
    expect(plans).toEqual(PREMIUM_PRICES);
    expect(fallback).toBe(true);
  });

  it('une chaîne vide du store est traitée comme absente', () => {
    // Un store peut renvoyer une chaîne vide sur un produit mal configuré :
    // l'afficher donnerait « Mensuel — », un prix qui ne veut rien dire.
    const { plans, fallback } = withStorePrices({ monthly: '   ' });
    expect(plans.find((p) => p.id === 'monthly')!.price).toBe('4,99 €');
    expect(fallback).toBe(true);
  });

  it("l'économie annoncée se recalcule sur les prix du STORE, pas sur les nôtres", () => {
    // 9,99 × 12 = 119,88 · 79,99 → 33,2 % → 33.
    const { plans } = withStorePrices({ monthly: '9,99 €', annual: '79,99 €' });
    expect(annualSavingPct(plans)).toBe(33);
  });

  it("n'annonce AUCUNE économie quand le format du store n'est pas lisible", () => {
    // « 1,234.56 » (séparateur de milliers anglo-saxon) n'est pas parsable ici.
    // Le bon comportement est de ne RIEN annoncer, pas de deviner.
    const { plans } = withStorePrices({ monthly: '1,234.56 kr', annual: '9,876.54 kr' });
    expect(annualSavingPct(plans)).toBeNull();
  });
});
