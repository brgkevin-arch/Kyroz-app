import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TRACES, empreinteIcones, svgIcone } from '../iconesOnglets';

// ── Une icône, deux rendus — et les deux ne doivent jamais diverger ──────────
//
// Depuis le 2026-10-19, la barre d'onglets d'iOS reçoit les icônes en PNG
// (`assets/onglets/`), générés depuis `lib/iconesOnglets.ts` ; le web et Android
// les dessinent en SVG depuis le MÊME fichier. Retoucher un tracé sans relancer
// `npx tsx scripts/gen-icones-onglets.ts` laisserait l'iPhone sur l'ancien dessin —
// ce que personne ne verrait, puisqu'on ne compare jamais les deux barres.

const RACINE = join(__dirname, '..', '..');
const DOSSIER = join(RACINE, 'assets', 'onglets');

describe('Icônes d’onglets — les PNG d’iOS suivent les tracés', () => {
  it('🔴 l’empreinte des tracés est celle des PNG commités — sinon, régénérer', () => {
    const ecrite = JSON.parse(readFileSync(join(DOSSIER, 'empreinte.json'), 'utf8')).empreinte;
    expect(
      empreinteIcones(),
      'tracés modifiés sans régénérer les PNG : npx tsx scripts/gen-icones-onglets.ts',
    ).toBe(ecrite);
  });

  it('chaque onglet a ses six PNG : repos et actif, en 1×, 2× et 3×', () => {
    const manquants: string[] = [];
    for (const nom of Object.keys(TRACES)) {
      for (const etat of ['', '-actif']) {
        for (const echelle of ['', '@2x', '@3x']) {
          const f = `${nom}${etat}${echelle}.png`;
          if (!existsSync(join(DOSSIER, f))) manquants.push(f);
        }
      }
    }
    expect(Object.keys(TRACES).length).toBe(5);
    expect(manquants).toEqual([]);
  });

  it('la barre les charge tous, au repos et à l’état actif', () => {
    const layout = readFileSync(join(RACINE, 'app', '(tabs)', '_layout.tsx'), 'utf8');
    for (const nom of Object.keys(TRACES)) {
      expect(layout).toContain(`require('../../assets/onglets/${nom}.png')`);
      expect(layout).toContain(`require('../../assets/onglets/${nom}-actif.png')`);
    }
  });

  it('les SVG du web ne recopient aucun tracé : ils lisent la même source', () => {
    const src = readFileSync(join(RACINE, 'components', 'TabIcons.tsx'), 'utf8');
    expect(src).toContain("from '../lib/iconesOnglets'");
    expect(src).not.toMatch(/\bd="M/);
  });

  it('le SVG rastérisé porte bien le tracé et le trait demandés', () => {
    const svg = svgIcone('plan', 2.2);
    expect(svg).toContain('stroke-width="2.2"');
    expect(svg).toContain('d="M3.6 10.6h19.8"');
    expect(svg).toContain('viewBox="0 0 27 27"');
  });
});
