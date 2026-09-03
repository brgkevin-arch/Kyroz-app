import { describe, it, expect } from 'vitest';
import {
  PAYWALL_LAUNCH, PREMIUM_FEATURES, canUse, grandfatheredNotice, isGrandfathered, premiumAccess,
  PREMIUM_PRICES, annualSavingPct, paywallBanner,
} from '../premium';

const LANCEMENT = '2026-09-01T00:00:00.000Z';
const AVANT = '2026-07-27T10:00:00.000Z';
const APRES = '2026-09-15T10:00:00.000Z';

// 🔴 LA DATE A ÉTÉ POSÉE LE 2026-08-27 (décision fondateur : « date-le à aujourd'hui »).
// Ce bloc disait « paywall non lancé — l'état actuel » et exigeait `null` ; il a rougi,
// c'était son travail. Relu en entier avant d'être réécrit — ce qui suit décrit la
// nouvelle réalité, et garde ce que l'ancien protégeait.
describe('paywall LANCÉ — l’état actuel', () => {
  it('PAYWALL_LAUNCH porte une date, et elle est lisible', () => {
    // L'interrupteur unique de la mise en vente. Repasser à `null` rouvrirait tout à
    // tout le monde, y compris à des comptes qui paient.
    expect(PAYWALL_LAUNCH, 'la date a été retirée — relire ce bloc en entier').not.toBeNull();
    expect(Number.isFinite(Date.parse(PAYWALL_LAUNCH!)), PAYWALL_LAUNCH!).toBe(true);
  });

  it('🔴 elle porte un FUSEAU explicite, sinon elle coupe deux heures trop tôt', () => {
    // Mesuré le 2026-08-27 : `Date.parse('2026-08-27')` vaut minuit **UTC**, donc
    // 02 h à Paris. Les comptes créés entre minuit et 2 h ce jour-là tomberaient du
    // côté GRAND-PÉRÉ — offerts à vie par une convention d'écriture. La CGU §3 promet
    // la gratuité aux comptes « créés avant la mise en vente » : la frontière doit
    // être celle que le fondateur a en tête, pas celle de Greenwich.
    expect(
      /(Z|[+-]\d{2}:\d{2})$/.test(PAYWALL_LAUNCH!),
      `${PAYWALL_LAUNCH} n'a pas de fuseau : la coupure ne tombe pas où on croit.`,
    ).toBe(true);
  });

  it('🔴 elle est DANS LE PASSÉ — sinon le relecteur Apple ne voit aucun paywall', () => {
    // Le relecteur crée son compte pendant le test, donc APRÈS la date : c'est ce qui
    // lui fait voir l'écran d'achat. Une date future le rendrait grand-péré, il ne
    // trouverait aucun moyen d'acheter, pour une app qui déclare quatre abonnements.
    expect(Date.parse(PAYWALL_LAUNCH!) <= Date.now(), PAYWALL_LAUNCH!).toBe(true);
  });

  it('un compte SANS date de création reste servi — se tromper en DONNANT', () => {
    // La règle ne dépend pas de la date de lancement, et c'est le point : elle doit
    // tenir maintenant que le paywall MORD, pas seulement quand il dormait.
    const a = premiumAccess({ entitled: false, createdAt: undefined });
    expect(a).toEqual({ allowed: true, reason: 'grandfathered' });
  });

  it('les deux features premium sont les seules concernées', () => {
    // Une feature hors liste reste gratuite quoi qu'il arrive — c'est ce qui empêche
    // un ajout à `EDITEURS_PREMIUM` de verrouiller par accident.
    expect(canUse('libre' as never, { entitled: false, profile: null })).toBe(true);
    expect(PREMIUM_FEATURES).toEqual(['dated_goal', 'transformation']);
  });
});

describe('l’état d’AVANT, gardé — il redevient vrai si la date est retirée', () => {
  it('sans date, personne n’est verrouillé', () => {
    const a = premiumAccess({ entitled: false, createdAt: undefined, launch: null });
    expect(a).toEqual({ allowed: true, reason: 'not_launched' });
  });

  it('sans date, toutes les features premium restent accessibles', () => {
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
    expect(canUse('dated_goal', { entitled: false, profile: ancien, launch: LANCEMENT })).toBe(true);
    expect(canUse('dated_goal', { entitled: false, profile: recent, launch: LANCEMENT })).toBe(false);
  });

  // Verrou de non-régression du 2026-08-18 : la banque de calories a été DÉGATÉE.
  // Le `as never` est nécessaire — elle n'est plus un `PremiumFeature`, et c'est
  // précisément ce que ce test défend. Sans lui, la remettre dans `PREMIUM_FEATURES`
  // passerait en silence : un compte récent se verrait refuser un réglage gratuit.
  it('la banque de calories n’est PLUS payante, même pour un compte récent', () => {
    const recent = { created_at: APRES } as never;
    expect(canUse('calorie_bank' as never, { entitled: false, profile: recent, launch: LANCEMENT })).toBe(true);
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
    // ⚠️ Ce sont les DEUX SEULS produits vendus, et il ne doit pas y en avoir d'autres
    // dans une soumission : `kyroz_plus_monthly` / `_yearly` existent encore chez Apple
    // mais sont ABSENTS du binaire, ce qui a valu un rejet `Guideline 2.1(b)` le
    // 2026-09-03 (cf. le bloc de doc de `PREMIUM_PRICES`). La hausse de prix se fera
    // sur ces identifiants-ci, pas par bascule vers un second palier.
    expect(PREMIUM_PRICES.map((p) => p.storeProductId)).toEqual([
      'kyroz_plus_monthly_early', 'kyroz_plus_yearly_early',
    ]);
  });

  it('les montants sont ceux tarifés côté Apple (lancement : 3,99 / 29,99)', () => {
    expect(PREMIUM_PRICES.find((p) => p.id === 'monthly')!.price).toBe('3,99 €');
    expect(PREMIUM_PRICES.find((p) => p.id === 'annual')!.price).toBe('29,99 €');
  });

  it('l’équivalent mensuel annoncé n’est jamais INFÉRIEUR au vrai', () => {
    // « soit 2,50 € par mois » pour 29,99 €/an, alors que le calcul donne 2,4992.
    // L'arrondi doit aller vers le HAUT : annoncer moins cher que la réalité serait
    // le seul sens qui trompe. (Même exigence que `annualSavingPct`, en miroir.)
    const annuel = PREMIUM_PRICES.find((p) => p.id === 'annual')!;
    const eur = (t: string) => Number(t.replace(/[^0-9,.]/g, '').replace(',', '.'));
    const annonce = eur(annuel.billed.match(/soit ([0-9,.]+) €/)![1]);
    expect(annonce).toBeGreaterThanOrEqual(eur(annuel.price) / 12);
  });

  it('l’économie annoncée est VRAIE et jamais surestimée', () => {
    // 3,99 × 12 = 47,88 · 29,99 → 37,4 % → on annonce 37, pas 38.
    expect(annualSavingPct()).toBe(37);
    const reel = (1 - 29.99 / (3.99 * 12)) * 100;
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
