import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PREMIUM_FEATURES } from '../premium';
import { FONCTIONS_KYROZ_PLUS, fonctionsEnPhrase, joursEssai, friseEssai, NOUVEAUTES_INCLUSES, eligibiliteDepuisStatut } from '../offreKyrozPlus';
import { INTRO_ELIGIBILITY_STATUS } from '@revenuecat/purchases-typescript-internal';
import { TERMS_OF_USE } from '../../constants/legal';

const lire = (f: string) => readFileSync(join(__dirname, '..', '..', f), 'utf8');

describe('Kyroz+ — une seule liste de ce qui est vendu (2026-10-20)', () => {
  it('la liste couvre exactement les fonctions verrouillées, ni plus ni moins', () => {
    expect(FONCTIONS_KYROZ_PLUS.map((f) => f.feature).sort()).toEqual([...PREMIUM_FEATURES].sort());
  });

  it('les CGU §3 énumèrent la même liste', () => {
    const s3 = TERMS_OF_USE.find((x) => x.title.startsWith('3.'))!;
    expect(s3.paragraphs.join(' ')).toContain(fonctionsEnPhrase());
    expect(fonctionsEnPhrase()).toBe('objectif daté et suivi de transformation');
  });

  it('les deux écrans de vente lisent la liste, aucun n’en garde une copie', () => {
    for (const f of ['app/kyroz-plus.tsx', 'app/offre-kyroz-plus.tsx']) {
      const src = lire(f);
      expect(src, f).toContain('FONCTIONS_KYROZ_PLUS.map(');
      expect(src, f).toContain('NOUVEAUTES_INCLUSES');
      for (const fn of FONCTIONS_KYROZ_PLUS) expect(src, `${f} recopie « ${fn.titre} »`).not.toContain(fn.corps.slice(0, 30));
    }
  });

  it('pas de « à venir » : la phrase des nouveautés ne promet ni fonction ni date', () => {
    expect(NOUVEAUTES_INCLUSES).not.toMatch(/\d|bientôt|à venir/i);
  });
});

describe('Kyroz+ — l’essai ne s’annonce que si le store le sert', () => {
  const deuxSemaines = { price: 0, cycles: 1, periodUnit: 'WEEK', periodNumberOfUnits: 2 };

  it('2 semaines gratuites, droit confirmé → 14 jours', () => {
    expect(joursEssai(deuxSemaines, 'eligible')).toBe(14);
    expect(joursEssai({ ...deuxSemaines, periodUnit: 'DAY', periodNumberOfUnits: 14 }, 'eligible')).toBe(14);
  });

  it('au moindre doute, rien : pas d’offre, offre payante, droit refusé ou inconnu', () => {
    expect(joursEssai(null, 'eligible')).toBeNull();
    expect(joursEssai({ ...deuxSemaines, price: 0.99 }, 'eligible')).toBeNull();
    expect(joursEssai(deuxSemaines, 'non_eligible')).toBeNull();
    expect(joursEssai(deuxSemaines, 'inconnue')).toBeNull();
    expect(joursEssai(deuxSemaines, 'sans_offre')).toBeNull();
    expect(joursEssai({ ...deuxSemaines, periodUnit: 'FORTNIGHT' }, 'eligible')).toBeNull();
  });

  it('les statuts recopiés en nombres sont ceux du SDK', () => {
    expect(eligibiliteDepuisStatut(INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE)).toBe('eligible');
    expect(eligibiliteDepuisStatut(INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE)).toBe('non_eligible');
    expect(eligibiliteDepuisStatut(INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS)).toBe('sans_offre');
    expect(eligibiliteDepuisStatut(INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN)).toBe('inconnue');
    expect(eligibiliteDepuisStatut(undefined)).toBe('inconnue');
  });

  it('la frise date le premier paiement au lendemain de l’essai, avec le prix du store', () => {
    const f = friseEssai(14, new Date(2026, 9, 20, 9, 0), '29,99 €', 'annual', 'App Store');
    expect(f.map((e) => e.quand)).toEqual(['Aujourd’hui', 'Pendant 14 jours', 'Le mardi 3 novembre']);
    expect(f[2].texte).toBe('29,99 € pour l’année, sauf si tu as résilié avant.');
    expect(f[1].texte).toContain('24 h avant la fin');
    expect(friseEssai(14, new Date(2026, 9, 20), '3,99 €', 'monthly', 'App Store')[2].texte).toContain('par mois');
  });

  it('la frise ne promet rien que Kyroz ne fasse pas (ni conseils, ni rappel envoyé)', () => {
    const tout = JSON.stringify(friseEssai(14, new Date(2026, 9, 20), '29,99 €', 'annual', 'App Store'));
    expect(tout).not.toMatch(/conseil|rappel|on te prévient|nous vous/i);
  });
});

describe('Kyroz+ — sa place dans le parcours d’arrivée (2026-10-20)', () => {
  const plan = lire('app/(tabs)/plan.tsx');
  it('la fin de la visite mène à la page Kyroz+, et le rappel ne vient qu’après', () => {
    expect(plan).toContain('scrollRef, onFin: apresLaVisite }');
    const corps = plan.slice(plan.indexOf('const apresLaVisite = async'), plan.indexOf('const apresLaVisite = async') + 600);
    expect(corps).toContain("router.push('/offre-kyroz-plus')");
    expect(corps.indexOf("router.push('/offre-kyroz-plus')")).toBeLessThan(corps.indexOf('proposerLeRappel()'));
  });
  it('une seule fois, à un compte qui doit payer, jamais sur le web', () => {
    const corps = plan.slice(plan.indexOf('const apresLaVisite = async'), plan.indexOf('const apresLaVisite = async') + 600);
    expect(corps).toContain("Platform.OS !== 'web'");
    expect(corps).toContain("raisonKyrozPlus === 'locked'");
    expect(corps).toContain('AsyncStorage.setItem(OFFRE_KYROZ_PLUS_KEY');
  });
  it('la page se ferme toujours d’un tap : une croix et « Peut-être plus tard »', () => {
    const page = lire('app/offre-kyroz-plus.tsx');
    expect(page).toContain('accessibilityLabel="Fermer"');
    expect(page).toContain('Peut-être plus tard');
    expect(page).toContain('Restaurer les achats');
    expect(page).toContain("router.push('/legal')");
  });
});
