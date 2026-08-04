import { describe, it, expect } from 'vitest';
import { seuilRepli, COMPACT_BAR_H, SEUIL_PAR_DEFAUT } from '../collapsingTitle';

// ── Le seuil de repli du grand titre ────────────────────────────────────────
//
// Pourquoi ce test existe : le MOUVEMENT est invérifiable dans le panneau
// navigateur — `requestAnimationFrame` n'y tourne pas (0 frame en 7,2 s,
// mesuré le 2026-08-04, cf. docs/comparer-maquette.md). Une animation y démarre,
// rend une frame, puis se fige à une valeur intermédiaire parfaitement
// plausible. On ne peut donc PAS conclure « le repli marche » depuis une
// capture. La décision — à partir de quel défilement le titre compact prend le
// relais — est donc une fonction pure, et c'est ELLE qu'on vérifie.

describe('Repli du grand titre — le seuil', () => {
  it("attend que le bas de l'en-tête soit passé sous la barre", () => {
    // En-tête de 90 pt posé en haut du contenu : il a disparu quand on a
    // défilé de 90 − 52 = 38 pt.
    expect(seuilRepli(0, 90)).toBe(90 - COMPACT_BAR_H);
    // Un en-tête décalé dans le contenu décale le seuil d'autant.
    expect(seuilRepli(24, 90)).toBe(24 + 90 - COMPACT_BAR_H);
  });

  it('ne peut JAMAIS renvoyer un seuil négatif — le cas qui casse tout', () => {
    // Un en-tête plus COURT que la barre donnerait un seuil négatif, donc un
    // titre compact affiché en permanence, POSÉ PAR-DESSUS le grand titre.
    // C'est le cas de l'écran Frigo quand le stock est vide : l'en-tête se
    // réduit à sa seule ligne.
    for (const h of [0, 10, 30, COMPACT_BAR_H, COMPACT_BAR_H + 10]) {
      expect(seuilRepli(0, h), `hauteur ${h}`).toBeGreaterThan(0);
    }
    expect(seuilRepli(0, 0)).toBe(24);
  });

  it('croît avec la hauteur de l’en-tête — un titre plus haut se replie plus tard', () => {
    const seuils = [80, 100, 140, 200].map((h) => seuilRepli(0, h));
    for (let i = 1; i < seuils.length; i++) {
      expect(seuils[i]).toBeGreaterThan(seuils[i - 1]);
    }
  });

  it('le repli par défaut est plus HAUT que tout seuil mesuré plausible', () => {
    // Avant la première mesure, on préfère un titre compact qui tarde à un titre
    // compact posé trop tôt. Le défaut doit donc dominer les en-têtes courants
    // (les cinq onglets tiennent entre 70 et 130 pt).
    for (const h of [70, 90, 110, 130]) {
      expect(SEUIL_PAR_DEFAUT).toBeGreaterThanOrEqual(seuilRepli(0, h));
    }
  });
});
