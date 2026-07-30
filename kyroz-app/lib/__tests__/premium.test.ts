import { describe, it, expect } from 'vitest';
import {
  PAYWALL_LAUNCH, PREMIUM_FEATURES, canUse, grandfatheredNotice, isGrandfathered, premiumAccess,
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
