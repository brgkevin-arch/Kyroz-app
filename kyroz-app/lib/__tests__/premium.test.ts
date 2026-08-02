import { describe, it, expect } from 'vitest';
import {
  PAYWALL_LAUNCH, PREMIUM_FEATURES, canUse, grandfatheredNotice, isGrandfathered, premiumAccess,
  PREMIUM_PRICES, annualSavingPct, paywallBanner,
} from '../premium';

const LANCEMENT = '2026-09-01T00:00:00.000Z';
const AVANT = '2026-07-27T10:00:00.000Z';
const APRES = '2026-09-15T10:00:00.000Z';

describe('paywall non lancé — l’état actuel', () => {
  it('PAYWALL_LAUNCH est null tant que les comptes stores ne sont pas prêts', () => {
    // Interrupteur unique de la mise en vente. S'il n'est plus null, c'est que le
    // paywall est ACTIF en production : ce test est là pour qu'on le sache.
    expect(PAYWALL_LAUNCH).toBeNull();
  });

  it('personne n’est verrouillé, même sans abonnement ni date de compte', () => {
    const a = premiumAccess({ entitled: false, createdAt: undefined, launch: null });
    expect(a).toEqual({ allowed: true, reason: 'not_launched' });
  });

  it('toutes les features premium restent accessibles', () => {
    for (const f of PREMIUM_FEATURES) {
      expect(canUse(f, { entitled: false, profile: null, launch: null }), f).toBe(true);
    }
  });
});

describe('grand-père — les comptes existants gardent tout, à vie', () => {
  it('un compte ANTÉRIEUR au lancement garde l’accès sans payer', () => {
    const a = premiumAccess({ entitled: false, createdAt: AVANT, launch: LANCEMENT });
    expect(a).toEqual({ allowed: true, reason: 'grandfathered' });
  });

  it('un compte POSTÉRIEUR sans abonnement est verrouillé', () => {
    const a = premiumAccess({ entitled: false, createdAt: APRES, launch: LANCEMENT });
    expect(a).toEqual({ allowed: false, reason: 'locked' });
  });

  it('un compte postérieur AVEC abonnement a l’accès', () => {
    const a = premiumAccess({ entitled: true, createdAt: APRES, launch: LANCEMENT });
    expect(a).toEqual({ allowed: true, reason: 'entitled' });
  });

  it('le grand-père PRIME sur l’abonnement — on n’exige pas de payer deux fois', () => {
    const a = premiumAccess({ entitled: true, createdAt: AVANT, launch: LANCEMENT });
    expect(a.reason).toBe('grandfathered');
  });

  it('une date pile au lancement n’est PAS grand-pérée (< strict)', () => {
    expect(isGrandfathered(LANCEMENT, LANCEMENT)).toBe(false);
  });
});

describe('les cas douteux penchent vers l’UTILISATEUR, jamais contre lui', () => {
  // Se tromper en donnant coûte une feature ; se tromper en refusant RETIRE une
  // feature à un utilisateur de longue date — précisément ce qu'on veut éviter.
  it('date absente → grand-péré', () => {
    expect(isGrandfathered(undefined, LANCEMENT)).toBe(true);
    expect(isGrandfathered(null, LANCEMENT)).toBe(true);
  });

  it('date illisible → grand-péré', () => {
    expect(isGrandfathered('pas une date', LANCEMENT)).toBe(true);
    expect(isGrandfathered('', LANCEMENT)).toBe(true);
  });

  it('date de lancement illisible → grand-péré (on ne verrouille pas sur une faute de frappe)', () => {
    expect(isGrandfathered(APRES, 'demain')).toBe(true);
  });
});

describe('canUse', () => {
  it('une feature NON premium est toujours accessible', () => {
    expect(canUse('plan' as never, { entitled: false, profile: null, launch: LANCEMENT })).toBe(true);
  });

  it('lit la date de création DU PROFIL', () => {
    const ancien = { created_at: AVANT } as never;
    const recent = { created_at: APRES } as never;
    expect(canUse('calorie_bank', { entitled: false, profile: ancien, launch: LANCEMENT })).toBe(true);
    expect(canUse('calorie_bank', { entitled: false, profile: recent, launch: LANCEMENT })).toBe(false);
  });
});

describe('grandfatheredNotice', () => {
  it('ne s’affiche QUE pour un compte grand-péré', () => {
    expect(grandfatheredNotice('grandfathered')).toContain('à vie');
    for (const r of ['not_launched', 'entitled', 'locked'] as const) {
      expect(grandfatheredNotice(r), r).toBeNull();
    }
  });
});

// ── Tarifs et copie du paywall ───────────────────────────────────────────────
// Ces tests verrouillent ce que l'écran PROMET. « Pas de mensonge dans Kyroz » :
// un chiffre affiché est celui qui sera débité.

describe('tarifs Kyroz+', () => {
  it('les identifiants produits correspondent à ceux déclarés dans les stores', () => {
    // ⚠️ Ce test verrouillait `kyroz_plus_annual` — une valeur INVENTÉE par le code du
    // paywall le 2026-08-01, alors que les produits avaient été créés dans App Store
    // Connect le 2026-07-30 sous `kyroz_plus_yearly` (`STORE-RELEASE.md` §4,
    // `MONETISATION.md` §A). Le test protégeait donc le bug au lieu du produit.
    // La source de vérité est le DASHBOARD, jamais le code : ces chaînes se recopient
    // depuis App Store Connect, elles ne se choisissent pas ici.
    expect(PREMIUM_PRICES.map((p) => p.storeProductId)).toEqual([
      'kyroz_plus_monthly', 'kyroz_plus_yearly',
    ]);
  });

  it('les montants sont ceux tarifés côté Apple (4,99 / 39,99)', () => {
    expect(PREMIUM_PRICES.find((p) => p.id === 'monthly')!.price).toBe('4,99 €');
    expect(PREMIUM_PRICES.find((p) => p.id === 'annual')!.price).toBe('39,99 €');
  });

  it('l’économie annoncée est VRAIE et jamais surestimée', () => {
    // 4,99 × 12 = 59,88 · 39,99 → 33,2 % → on annonce 33, pas 34.
    expect(annualSavingPct()).toBe(33);
    const reel = (1 - 39.99 / (4.99 * 12)) * 100;
    expect(annualSavingPct()!).toBeLessThanOrEqual(reel);
  });

  it('n’annonce AUCUNE économie si l’annuel n’est pas moins cher', () => {
    expect(annualSavingPct([
      { id: 'monthly', storeProductId: 'm', label: 'M', price: '4,99 €', billed: '' },
      { id: 'annual', storeProductId: 'a', label: 'A', price: '59,88 €', billed: '' },
    ])).toBeNull();
    expect(annualSavingPct([
      { id: 'monthly', storeProductId: 'm', label: 'M', price: 'gratuit', billed: '' },
      { id: 'annual', storeProductId: 'a', label: 'A', price: '39,99 €', billed: '' },
    ])).toBeNull();
  });
});

describe('paywallBanner', () => {
  it('couvre les 4 raisons, sans texte vide', () => {
    for (const r of ['not_launched', 'grandfathered', 'entitled', 'locked'] as const) {
      const b = paywallBanner(r);
      expect(b.title.length, r).toBeGreaterThan(0);
      expect(b.body.length, r).toBeGreaterThan(0);
    }
  });

  it('un compte non verrouillé ne lit JAMAIS un appel à payer', () => {
    for (const r of ['not_launched', 'grandfathered', 'entitled'] as const) {
      const txt = `${paywallBanner(r).title} ${paywallBanner(r).body}`.toLowerCase();
      expect(txt, r).not.toMatch(/abonne-toi|s'abonner|souscri|achet|essai gratuit/);
    }
  });

  it('promet la gratuité à vie aux comptes antérieurs — c’est la décision fondateur', () => {
    expect(paywallBanner('not_launched').body).toContain('à vie');
    expect(paywallBanner('grandfathered').body).toContain('à vie');
  });
});
