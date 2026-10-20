import { describe, it, expect } from 'vitest';
import { formeBarre, retraitOnglets, centreOnglet, CAPSULE } from '../barreOnglets';

// ── La visite pointe la barre par sa RÈGLE — ces tests tiennent la règle à la mesure ──
//
// La visite guidée ne peut pas mesurer la barre (elle vit dans une `Modal`, et la
// barre d'iOS n'est pas une vue React Native). Elle applique `lib/barreOnglets.ts`.
// Les chiffres attendus ci-dessous viennent d'une CAPTURE (iPhone 17, iOS 26.5,
// 2026-10-19, analysée au pixel) : si la règle s'en écarte, la pointe de la carte
// tombe entre deux onglets.

const IPHONE = { os: 'ios', isPad: false, versionIos: 26, liquidGlass: true, largeur: 402 };

describe('Barre d’onglets — où sont les onglets, selon l’appareil', () => {
  it('iPhone sous iOS 26 : la capsule de Liquid Glass', () => {
    expect(formeBarre(IPHONE)).toBe('capsule');
  });

  it('iPhone sous iOS 18 : la barre classique, pleine largeur', () => {
    expect(formeBarre({ ...IPHONE, versionIos: 18, liquidGlass: false })).toBe('pleine');
  });

  it('web et Android : la barre dessinée, pleine largeur — même si l’appareil se dit « liquid glass »', () => {
    expect(formeBarre({ ...IPHONE, os: 'web' })).toBe('pleine');
    expect(formeBarre({ ...IPHONE, os: 'android' })).toBe('pleine');
  });

  it('iPad (iPadOS 18+) en pleine largeur : la barre est EN HAUT, rien à pointer', () => {
    const ipad = { ...IPHONE, isPad: true, largeur: 820 };
    expect(formeBarre(ipad)).toBe('haut');
    expect(retraitOnglets('haut', 0)).toBeNull();
    // iPadOS 17 gardait la barre en bas.
    expect(formeBarre({ ...ipad, versionIos: 17, liquidGlass: false })).toBe('pleine');
    // En Split View étroit, la barre redescend : l'iPad se comporte comme un iPhone.
    expect(formeBarre({ ...ipad, largeur: 400 })).toBe('capsule');
  });

  it('🔴 les centres calculés tombent sur les icônes MESURÉES de la capsule (à 1 pt près)', () => {
    const mesures = [64.0, 132.7, 201.2, 269.8, 338.3];
    const retrait = retraitOnglets('capsule', 0)!;
    const calcules = mesures.map((_, i) => centreOnglet(402, retrait, i, 5));
    calcules.forEach((c, i) => expect(Math.abs(c - mesures[i]), `onglet ${i} : ${c} vs ${mesures[i]}`).toBeLessThan(1));
    // Et l'ancienne règle « toute la largeur » visait jusqu'à 24 pt à côté : c'est
    // l'écart que ce chantier a corrigé, et qu'une régression ramènerait.
    expect(Math.abs(centreOnglet(402, 0, 0, 5) - mesures[0])).toBeGreaterThan(20);
  });

  it('la barre pleine garde la règle d’avant : parts égales entre les zones sûres', () => {
    expect(retraitOnglets('pleine', 12)).toBe(12);
    expect(centreOnglet(400, 0, 0, 5)).toBe(40);
    expect(centreOnglet(400, 0, 4, 5)).toBe(360);
  });

  it('la capsule est décrite par deux mesures nommées, pas par des chiffres épars', () => {
    expect(CAPSULE).toEqual({ marge: 21, rembourrage: 8.7 });
  });
});
