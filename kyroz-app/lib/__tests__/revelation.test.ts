import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { revelation, libelleRevelation, PALIERS_AVANT_TOUT } from '../revelation';

// ── La révélation par paliers ───────────────────────────────────────────────
//
// La séquence est celle DICTÉE par le fondateur le 2026-08-14 : « 10, puis voir +,
// puis 10, puis voir +, et après voir tout ». Ces cas la figent — si quelqu'un
// change `PALIERS_AVANT_TOUT` en croyant régler un détail, il verra ici que ce
// n'est pas un réglage esthétique mais une décision.

describe('La séquence dictée : 10 · voir + · 10 · voir + · voir tout', () => {
  const CATALOGUE = 512;
  const PAS = 10;

  it('au départ, 10 recettes et un « Voir + »', () => {
    expect(revelation(CATALOGUE, PAS, 0, false)).toEqual({ visibles: 10, reste: 502, action: 'plus' });
  });

  it('un appui : 20, et encore un « Voir + »', () => {
    expect(revelation(CATALOGUE, PAS, 1, false)).toEqual({ visibles: 20, reste: 492, action: 'plus' });
  });

  it('deux appuis : 30, et le bouton devient « Voir tout »', () => {
    expect(revelation(CATALOGUE, PAS, 2, false)).toEqual({ visibles: 30, reste: 482, action: 'tout' });
  });

  it('« Voir tout » sert la liste entière et fait disparaître le bouton', () => {
    expect(revelation(CATALOGUE, PAS, 2, true)).toEqual({ visibles: 512, reste: 0, action: null });
  });
});

describe('Les bords, qui sont là où un compteur ment', () => {
  it('une liste plus courte que le pas n’affiche AUCUN bouton', () => {
    // Le cas le plus courant du frigo : trois recettes prêtes, rien à révéler.
    expect(revelation(3, 8, 0, false)).toEqual({ visibles: 3, reste: 0, action: null });
  });

  it('une liste vide ne propose rien', () => {
    expect(revelation(0, 8, 0, false)).toEqual({ visibles: 0, reste: 0, action: null });
  });

  it('🔴 « Voir + » ne s’affiche pas quand il montrerait DÉJÀ tout le reste', () => {
    // 12 recettes, pas de 8 : il en reste 4, soit moins qu'un palier. Proposer
    // « Voir + de recettes » promettrait un palier de plus alors que le tap
    // révèle la fin. Le bouton doit dire ce qu'il fait (CLAUDE.md §10).
    expect(revelation(12, 8, 0, false)).toEqual({ visibles: 8, reste: 4, action: 'tout' });
    // …et juste au-dessus du palier, « Voir + » est de nouveau la vérité.
    expect(revelation(17, 8, 0, false).action).toBe('plus');
  });

  it('le dernier palier tombe pile : plus de bouton, pas un « Voir tout » vide', () => {
    expect(revelation(20, 10, 1, false)).toEqual({ visibles: 20, reste: 0, action: null });
  });

  it('des entrées aberrantes ne rendent jamais une liste vide qui a l’air pleine', () => {
    expect(revelation(50, 0, 0, false).visibles).toBe(1);      // pas nul → au moins 1
    expect(revelation(50, 10, -3, false).visibles).toBe(10);   // appuis négatifs → 0
    expect(revelation(-5, 10, 0, false)).toEqual({ visibles: 0, reste: 0, action: null });
  });
});

describe('Le libellé dit le RESTE, jamais « Voir tout » tout court', () => {
  it('« Voir tout » sans chiffre ne dit pas si on ouvre 3 cartes ou 482', () => {
    expect(libelleRevelation('tout', 482)).toBe('Voir les 482 restantes');
    expect(libelleRevelation('plus', 502)).toBe('Voir + de recettes');
    expect(libelleRevelation(null, 0)).toBe('');
  });

  it('le nom de la chose se passe en paramètre — trois listes, un seul libellé', () => {
    expect(libelleRevelation('plus', 9, 'idées')).toBe('Voir + de idées');
  });
});

describe('Le module reste PUR — c’est ce qui le rend testable', () => {
  it('il n’importe rien', () => {
    // Même garde que `tours.ts` et `motion.ts` : le jour où ce fichier tire
    // `theme.ts` (donc react-native), il n'est plus vérifiable sous vitest, et la
    // décision retourne vivre dans un écran que personne ne peut mesurer.
    const src = readFileSync(join(__dirname, '..', 'revelation.ts'), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
  });

  it('la constante de paliers est EXPORTÉE, pas cachée dans une expression', () => {
    // Elle porte une décision du fondateur. Enterrée dans un `n >= 2`, elle se
    // serait fait « simplifier » par la première relecture venue.
    expect(PALIERS_AVANT_TOUT).toBe(2);
  });
});
