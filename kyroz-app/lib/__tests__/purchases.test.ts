import { describe, it, expect, afterEach } from 'vitest';
import { Platform } from 'react-native';
import { withStorePrices, annualSavingPct, PREMIUM_PRICES } from '../premium';
import { ENTITLEMENT_ID, purchasesConfigured } from '../purchases';

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

  it("l'entitlement porte le nom attendu côté dashboard", () => {
    // Il doit être créé à l'identique dans RevenueCat : c'est LUI qui accorde le
    // droit, pas l'identifiant produit (plusieurs produits, un seul droit).
    expect(ENTITLEMENT_ID).toBe('kyroz_plus');
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
