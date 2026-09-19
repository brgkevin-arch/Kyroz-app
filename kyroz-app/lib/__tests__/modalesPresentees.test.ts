import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { recenserModale, modaleOuverte, quandAucuneModale } from '../modalesPresentees';

// ── Une visite guidée ne se présente JAMAIS par-dessus une autre modale ─────────────────
//
// 🔴 Signalé par le fondateur le 2026-09-19 : l'app figée après « Enregistrer » dans les
// préférences ouvertes par la carte du Plan. La visite du Profil partait par-dessus
// l'éditeur ; iOS la refusait ; elle restait invisible et avalait tous les taps. Même
// panne par « Revoir les tutos ». Reproduit PUIS corrigé au simulateur — ce fichier ne
// prouve pas le geste, il ferme les chemins par lesquels la panne revient.

describe('registre des modales présentées', () => {
  it('compte les modales, et la libération est idempotente', () => {
    expect(modaleOuverte()).toBe(false);
    const a = recenserModale();
    const b = recenserModale();
    expect(modaleOuverte()).toBe(true);
    a(); a();
    expect(modaleOuverte()).toBe(true); // b est encore là : libérer a deux fois ne l'efface pas
    b();
    expect(modaleOuverte()).toBe(false);
  });

  it('sans modale, ce qui attend part sur-le-champ', () => {
    const f = vi.fn();
    quandAucuneModale(f);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('avec une modale, ce qui attend part à sa libération — une seule fois, et pas avant la DERNIÈRE', () => {
    const a = recenserModale();
    const b = recenserModale();
    const f = vi.fn();
    quandAucuneModale(f);
    a();
    expect(f).not.toHaveBeenCalled();
    b();
    expect(f).toHaveBeenCalledTimes(1);
    const c = recenserModale(); c(); // une modale suivante ne le relance pas
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('une attente annulée ne part jamais', () => {
    const a = recenserModale();
    const f = vi.fn();
    const annuler = quandAucuneModale(f);
    annuler();
    a();
    expect(f).not.toHaveBeenCalled();
  });
});

// ── Les chemins, relus dans le source ───────────────────────────────────────────────────
const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : fichiers(p);
    return /\.tsx$/.test(n) ? [p] : [];
  });
}
const AVEC_MODALE = [...fichiers(join(RACINE, 'components')), ...fichiers(join(RACINE, 'app'))]
  .filter((p) => /<Modal[\s>]/.test(sansCommentaires(readFileSync(p, 'utf8'))))
  .map((p) => relative(RACINE, p));

describe('chaque `Modal` se recense, et la visite guidée attend', () => {
  it('le recensement a de quoi compter (garde contre un filtre qui ne trouve plus rien)', () => {
    // 6 et non plus 7 depuis le 2026-09-19 : `StreakCelebration` est partie avec la
    // série (AGENTS.md E69). Baisser ce seuil doit rester un geste EXPLIQUÉ — c'est ce
    // qui distingue une modale retirée d'un filtre qui ne trouve plus rien.
    expect(AVEC_MODALE.length).toBeGreaterThanOrEqual(6);
  });

  it('toute enveloppe de `Modal` appelle `useModaleRecensee` — sauf la visite guidée, qui est celle qui attend', () => {
    // Une modale NON recensée est invisible pour la visite : elle se présenterait
    // par-dessus, et la panne du 2026-09-19 reviendrait par cette porte-là.
    const oublis = AVEC_MODALE
      .filter((f) => !f.endsWith('GuidedTour.tsx'))
      .filter((f) => !/useModaleRecensee\(/.test(sansCommentaires(readFileSync(join(RACINE, f), 'utf8'))));
    expect(oublis).toEqual([]);
  });

  it('`startTour` passe par `quandAucuneModale`, et ne marque la visite vue qu’au démarrage réel', () => {
    const src = sansCommentaires(readFileSync(join(RACINE, 'components', 'GuidedTour.tsx'), 'utf8'));
    const start = src.slice(src.indexOf('const startTour = useCallback'), src.indexOf('const annulerAttente'));
    expect(start).toMatch(/quandAucuneModale\(/);
    expect(start).not.toMatch(/markSeen\(/); // vue = montrée : c'est `demarrer` qui marque
    expect(src.slice(src.indexOf('const demarrer = useCallback'), src.indexOf('const attente'))).toMatch(/markSeen\(tourId\)/);
  });

  it('« Revoir les tutos » ferme la feuille Réglages avant de relancer la visite', () => {
    const src = sansCommentaires(readFileSync(join(RACINE, 'app', '(tabs)', 'profil.tsx'), 'utf8'));
    const corps = src.slice(src.indexOf('const revoirTutos'), src.indexOf('const appVersion'));
    expect(corps.indexOf('setReglages(false)')).toBeGreaterThan(-1);
    expect(corps.indexOf('setReglages(false)')).toBeLessThan(corps.indexOf('rejouerTour()'));
  });
});
