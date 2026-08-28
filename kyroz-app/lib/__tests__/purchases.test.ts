import { describe, it, expect, afterEach } from 'vitest';
import { Platform } from 'react-native';
import { withStorePrices, annualSavingPct, mensualiteEquivalente, PREMIUM_PRICES } from '../premium';
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
  /**
   * Fabrique un prix SERVI. Le montant et la devise vont avec la chaîne : c'est
   * exactement ce que `fetchStorePrices` lit sur un même `PurchasesStoreProduct`.
   */
  const servi = (priceString: string, montant: number, devise: string) => ({ priceString, montant, devise });

  it('le prix du store REMPLACE le tarif de repli', () => {
    const { plans, fallback } = withStorePrices({
      monthly: servi('$4.99', 4.99, 'USD'),
      annual: servi('$39.99', 39.99, 'USD'),
    });
    expect(plans.find((p) => p.id === 'monthly')!.price).toBe('$4.99');
    expect(plans.find((p) => p.id === 'annual')!.price).toBe('$39.99');
    expect(fallback).toBe(false);
  });

  it('un SEUL prix manquant suffit à signaler le repli', () => {
    // Sinon l'écran tairait qu'un des deux montants est en euros pour quelqu'un
    // qui sera facturé ailleurs.
    const { plans, fallback } = withStorePrices({ monthly: servi('$4.99', 4.99, 'USD') });
    expect(plans.find((p) => p.id === 'monthly')!.price).toBe('$4.99');
    expect(plans.find((p) => p.id === 'annual')!.price).toBe('29,99 €');
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
    const { plans, fallback } = withStorePrices({ monthly: servi('   ', 4.99, 'USD') });
    expect(plans.find((p) => p.id === 'monthly')!.price).toBe('3,99 €');
    expect(fallback).toBe(true);
  });

  it("l'économie annoncée se recalcule sur les prix du STORE, pas sur les nôtres", () => {
    // 9,99 × 12 = 119,88 · 79,99 → 33,2 % → 33.
    const { plans } = withStorePrices({
      monthly: servi('9,99 €', 9.99, 'EUR'),
      annual: servi('79,99 €', 79.99, 'EUR'),
    });
    expect(annualSavingPct(plans)).toBe(33);
  });

  it("n'annonce AUCUNE économie quand le format du store n'est pas lisible", () => {
    // « 1,234.56 » (séparateur de milliers anglo-saxon) n'est pas parsable ici.
    // Le bon comportement est de ne RIEN annoncer, pas de deviner.
    const { plans } = withStorePrices({
      monthly: servi('1,234.56 kr', 1234.56, 'SEK'),
      annual: servi('9,876.54 kr', 9876.54, 'SEK'),
    });
    expect(annualSavingPct(plans)).toBeNull();
  });
});

/**
 * 🔴 CE BLOC EXISTE PARCE QUE LE DÉFAUT A ÉTÉ VU SUR UNE CAPTURE (2026-08-28, achat
 * en bac à sable). L'écran affichait :
 *
 *     Annuel — 24,99 $US
 *     Débité une fois par an, soit 2,50 € par mois.
 *
 * `withStorePrices` remplaçait `price` par le prix du store et laissait `billed`
 * intact — or `billed` RÉPÈTE le prix. Deux devises dans deux lignes voisines, dont
 * une dérivée de rien.
 *
 * ⚠️ Aucun test ne pouvait l'attraper : tous vérifiaient `price`, aucun ne regardait
 * la PHRASE. Le garde-fou couvrait un champ pendant que le champ voisin répondait
 * pour l'ancienne valeur.
 *
 * ⚠️ Et il était invisible en France : 29,99 / 12 = 2,4991 → 2,50 €. La phrase était
 * juste sur exactement UN magasin — celui où on la relisait.
 */
describe('la phrase qui répète le prix vient du MÊME prix', () => {
  const servi = (priceString: string, montant: number, devise: string) => ({ priceString, montant, devise });
  const annuel = (store: Parameters<typeof withStorePrices>[0]) =>
    withStorePrices(store, undefined, 'fr-FR').plans.find((p) => p.id === 'annual')!;

  /**
   * ⚠️ `Intl` place une espace INSÉCABLE (U+00A0) avant le symbole monétaire en
   * français — c'est la typographie correcte, et c'est aussi ce qui a fait échouer
   * ces tests à leur première écriture : « 2,50 € » et « 2,50 € » sont visuellement
   * identiques et différents pour `toBe`. On compare donc à l'espace près, pas au
   * codet près : la règle qu'on verrouille est le MONTANT, pas le caractère qu'ICU
   * choisit — et ce choix peut changer avec la version d'ICU du moteur.
   */
  const memeTexte = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

  it('🔴 le défaut lui-même : un prix en dollars ne laisse AUCUN euro dans la phrase', () => {
    const p = annuel({ annual: servi('24,99 $US', 24.99, 'USD') });
    expect(p.price).toBe('24,99 $US');
    expect(p.billed).not.toContain('€');
    expect(p.billed).not.toContain('2,50');
  });

  it('la mensualité est dérivée du prix servi, pas recopiée', () => {
    // 24,99 / 12 = 2,0825 → arrondi vers le haut → 2,09.
    expect(memeTexte(annuel({ annual: servi('24,99 $US', 24.99, 'USD') }).billed))
      .toBe('Débité une fois par an, soit 2,09 $US par mois.');
  });

  it('en euros, elle redonne EXACTEMENT la phrase écrite à la main depuis le 2026-08-02', () => {
    // 29,99 / 12 = 2,4991 → 2,50 €. C'est ce qui a rendu le défaut invisible un mois.
    expect(memeTexte(annuel({ annual: servi('29,99 €', 29.99, 'EUR') }).billed))
      .toBe('Débité une fois par an, soit 2,50 € par mois.');
  });

  it("l'arrondi va vers le HAUT — sous-estimer le coût mensuel est le sens qui trompe", () => {
    // 24,01 / 12 = 2,0008. Arrondir au plus proche donnerait 2,00 : moins que la vérité.
    expect(memeTexte(mensualiteEquivalente(servi('24,01 €', 24.01, 'EUR'), 'fr-FR')!)).toBe('2,01 €');
    // Et 12 × la mensualité annoncée est toujours ≥ au prix réellement facturé.
    for (const montant of [24.01, 24.99, 29.99, 39.99, 99.99]) {
      const m = mensualiteEquivalente(servi('x', montant, 'EUR'), 'fr-FR')!;
      const n = Number(m.replace(/[^0-9,]/g, '').replace(',', '.'));
      expect(n * 12).toBeGreaterThanOrEqual(montant);
    }
  });

  it('une devise sans décimale est formatée par sa règle, pas par la nôtre', () => {
    // JPY n'a pas de centimes : 3000 / 12 = 250.
    expect(mensualiteEquivalente(servi('¥3,000', 3000, 'JPY'), 'en-US')).toBe('¥250');
  });

  it("montant ou devise inexploitables → la phrase PERD son montant, elle n'en invente pas", () => {
    for (const mauvais of [
      servi('x', 0, 'EUR'), servi('x', -5, 'EUR'), servi('x', NaN, 'EUR'), servi('x', 29.99, 'EURO'),
    ]) {
      expect(mensualiteEquivalente(mauvais, 'fr-FR')).toBeNull();
      expect(annuel({ annual: { ...mauvais, priceString: '29,99 ?' } }).billed).toBe('Débité une fois par an.');
    }
    expect(mensualiteEquivalente(undefined, 'fr-FR')).toBeNull();
  });

  it('sans prix du store, la phrase de repli française est CONSERVÉE', () => {
    // Elle est juste : le prix de repli est 29,99 €, et l'écran dit que c'en est un.
    expect(annuel({}).billed).toBe('Débité une fois par an, soit 2,50 € par mois.');
  });
});
