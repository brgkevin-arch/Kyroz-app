import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLISSEMENT, decisionGlissement, seuilSuppressionFranchi } from '../motion';

// ── GLISSER UNE LIGNE VERS LA GAUCHE POUR LA SUPPRIMER (Réserve, 2026-10-23) ─────────────
//
// Demande du fondateur : « slide l'aliment à gauche, ça fait apparaître "supprimer" comme
// chez Apple, et un slide long supprime l'aliment ». La décision est pure (`lib/motion.ts`) ;
// le geste, lui, ne se vérifie qu'au simulateur (CLAUDE.md §5).

const L = 360; // une ligne de Réserve sur iPhone

describe('la décision au relâchement', () => {
  it('au-delà de la moitié de la ligne, relâcher supprime', () => {
    expect(decisionGlissement(-0.6 * L, 0, L)).toBe('supprimer');
    expect(decisionGlissement(-0.5 * L, 0, L)).toBe('supprimer');
  });

  it('🔴 l’élan ne supprime JAMAIS : un jeté vif sous le seuil ouvre le bouton, sans plus', () => {
    expect(decisionGlissement(-0.49 * L, -8000, L)).toBe('ouvrir');
    expect(decisionGlissement(-20, -8000, L)).toBe('ouvrir');
  });

  it('ouvrir ou refermer suit la projection, comme une feuille', () => {
    expect(decisionGlissement(-30, 0, L)).toBe('fermer');            // effleuré : se referme
    expect(decisionGlissement(-30, -1500, L)).toBe('ouvrir');        // jeté : s'ouvre
    expect(decisionGlissement(-GLISSEMENT.bouton, 0, L)).toBe('ouvrir');
    expect(decisionGlissement(-GLISSEMENT.bouton, 2000, L)).toBe('fermer'); // renvoyé à droite
  });

  it('une ligne pas encore mesurée ne supprime rien', () => {
    expect(seuilSuppressionFranchi(-500, 0)).toBe(false);
    expect(decisionGlissement(-500, 0, 0)).not.toBe('supprimer');
  });

  it('le seuil se franchit dans les deux sens (le déclic se réarme en revenant)', () => {
    expect(seuilSuppressionFranchi(-0.51 * L, L)).toBe(true);
    expect(seuilSuppressionFranchi(-0.4 * L, L)).toBe(false);
  });
});

const sansCommentaires = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lire = (...chemin: string[]) => sansCommentaires(readFileSync(join(__dirname, '..', '..', ...chemin), 'utf8'));

describe('le composant tient les pièges de `Sheet.tsx`', () => {
  const ligne = lire('components', 'LigneGlissable.tsx');

  it('le PanResponder, créé une fois, lit ses rappels par une ref (sinon il supprimerait avec l’état du premier rendu)', () => {
    expect(ligne).toMatch(/rappels\.current = \{ onTouche, onSupprimer, onOuvrir, onFermer, onGlisse \}/);
    expect(ligne).toContain('rappels.current.onSupprimer()');
  });

  it('la vitesse passe en secondes, et un geste repris par le système ramène la ligne', () => {
    expect(ligne).toContain('vitesseDepuisPan(g.vx)');
    expect(ligne).toContain('onPanResponderTerminationRequest: () => false');
    expect(ligne).toMatch(/onPanResponderTerminate: \(\) => \{[\s\S]*?amener\(0\)/);
  });

  it('seul un geste horizontal est pris, en capture (la ligne est un bouton)', () => {
    expect(ligne).toMatch(/onMoveShouldSetPanResponderCapture: \(_, g\) => horizontal\(g\.dx, g\.dy\)/);
    expect(ligne).toMatch(/Math\.abs\(dx\) > Math\.abs\(dy\)/);
  });

  it('🔴 un glissement n’est pas un tap : le tap qui suit un glissement est ignoré (vu au navigateur)', () => {
    expect(ligne).toMatch(/onPanResponderRelease: \(_, g\) => \{\s*vientDeGlisser\.current = true;/);
    expect(ligne).toMatch(/if \(vientDeGlisser\.current\) \{ vientDeGlisser\.current = false; return; \}/);
    // … et la marque tombe au contact suivant, sinon le vrai tap d'après serait perdu en natif.
    expect(ligne).toContain('onPressIn={() => { vientDeGlisser.current = false; }}');
  });

  it('VoiceOver a son chemin : une action « Supprimer » sur la ligne', () => {
    expect(ligne).toContain("accessibilityActions={[{ name: 'supprimer', label: 'Supprimer' }]}");
  });

  it('le seuil de suppression se SENT (déclic) au moment où il est franchi', () => {
    expect(ligne).toMatch(/if \(franchi && !seuilAtteint\.current\) retour\('declic'\)/);
  });
});

describe('la Réserve s’en sert', () => {
  const reserve = lire('app', '(tabs)', 'reserve.tsx');

  it('chaque aliment est une ligne glissable, branchée sur la suppression', () => {
    expect(reserve).toContain('<LigneGlissable');
    expect(reserve).toContain('onSupprimer={() => supprimerAliment(it)}');
    expect(reserve).toMatch(/const supprimerAliment = async[\s\S]*?removeItem\(items, it\.name, it\.unit\)/);
  });

  it('le défilement est coupé pendant un glissement, et défiler referme la ligne ouverte', () => {
    expect(reserve).toContain('scrollEnabled={!glisseEnCours}');
    expect(reserve).toContain('onGlisse={setGlisseEnCours}');
    expect(reserve).toContain('onScrollBeginDrag={() => setLigneOuverte(null)}');
  });

  it('toucher une ligne ouverte la referme ; sinon il ouvre le pas-à-pas', () => {
    expect(reserve).toContain('onTouche={() => (ligneOuverte ? setLigneOuverte(null) : openEdit(it))}');
  });

  it('descendre la quantité à zéro supprime toujours', () => {
    expect(reserve).toMatch(/if \(q === 0\) \{\s*await persist\(removeItem\(items, editItem\.name, editItem\.unit\)\)/);
  });
});
