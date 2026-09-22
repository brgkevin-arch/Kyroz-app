import { describe, it, expect } from 'vitest';
import { WEIGHT_BOUNDS, HEIGHT_BOUNDS } from '../safety';
import {
  KILOS, DIXIEMES, CENTIMETRES, departPoids, departTaille,
  decouperPoids, assemblerPoids, lireTaille, libellePoids, libelleTaille,
} from '../roulettesMesure';

// Poids et taille à la roulette (onboarding, page 2 — décision fondateur 2026-09-22).
// Ce qui compte : la roulette propose EXACTEMENT ce que le garde-fou accepte, et la
// valeur validée se relit à l'identique par l'écran, le brouillon et `parseFloat`.

describe('les roulettes proposent exactement ce que le garde-fou accepte', () => {
  it('kilos et centimètres couvrent les bornes, ni plus ni moins', () => {
    expect(KILOS[0]).toBe(WEIGHT_BOUNDS[0]);
    expect(KILOS[KILOS.length - 1]).toBe(WEIGHT_BOUNDS[1]);
    expect(CENTIMETRES[0]).toBe(HEIGHT_BOUNDS[0]);
    expect(CENTIMETRES[CENTIMETRES.length - 1]).toBe(HEIGHT_BOUNDS[1]);
    expect(DIXIEMES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('le point de départ est dans la roulette, pour les deux sexes et sans réponse', () => {
    for (const sexe of ['male', 'female', null] as const) {
      expect(KILOS).toContain(departPoids(sexe));
      expect(CENTIMETRES).toContain(departTaille(sexe));
    }
  });
});

describe('ce que « Valider » enregistre se relit à l’identique', () => {
  it('aller-retour sur tout le poids proposé', () => {
    for (const kilos of KILOS) {
      for (const dixieme of DIXIEMES) {
        if (kilos === WEIGHT_BOUNDS[1] && dixieme > 0) continue; // au-delà de la borne
        const saisie = assemblerPoids(kilos, dixieme);
        expect(decouperPoids(saisie)).toEqual({ kilos, dixieme });
        expect(parseFloat(saisie)).toBeCloseTo(kilos + dixieme / 10, 5);
      }
    }
  });

  it('une saisie d’avant la roulette (tapée, avec virgule) reste lisible', () => {
    expect(decouperPoids('72,5')).toEqual({ kilos: 72, dixieme: 5 });
    expect(decouperPoids('80')).toEqual({ kilos: 80, dixieme: 0 });
    expect(lireTaille('178')).toBe(178);
  });

  it('vide ou hors bornes : rien de choisi, la ligne dit « À renseigner »', () => {
    expect(decouperPoids('')).toBeNull();
    expect(decouperPoids('12')).toBeNull();
    expect(lireTaille('')).toBeNull();
    expect(lireTaille('90')).toBeNull();
    expect(libellePoids('')).toBeNull();
    expect(libelleTaille('')).toBeNull();
  });

  it('la ligne affiche à la française', () => {
    expect(libellePoids('75.5')).toBe('75,5 kg');
    expect(libellePoids('75')).toBe('75 kg');
    expect(libelleTaille('180')).toBe('180 cm');
  });
});
