import { describe, it, expect } from 'vitest';
import { isPrerender } from '../prerender';

// ── E7 — le stockage de session ne doit JAMAIS être muet sur mobile ──────────
//
// Le pré-rendu statique des pages web exécute l'app dans Node, où `window` n'existe
// pas : le client Supabase y reçoit donc un stockage muet, sinon le build meurt.
// Le danger est l'inverse — qu'un appareil RÉEL tombe dans cette branche : il
// perdrait sa session à chaque démarrage, EN SILENCE.
//
// ⚠️ Ce cas ne peut se produire ni dans un navigateur (où `window` existe) ni dans
// vitest : aucun test d'intégration ne le verrait. D'où le prédicat pur.
describe('isPrerender — qui reçoit le stockage muet', () => {
  it('SEUL le web sans window (Node, pré-rendu) est muet', () => {
    expect(isPrerender('web', false)).toBe(true);
  });

  it('un vrai navigateur garde son stockage', () => {
    expect(isPrerender('web', true)).toBe(false);
  });

  it('iOS et Android ne peuvent PAS y tomber, même sans window', () => {
    // Le cœur du garde-fou. React Native définit `window` aujourd'hui (alias de
    // `global`), mais c'est un détail de runtime, pas un contrat : si ça changeait,
    // un test portant seulement sur `window` laisserait passer la déconnexion
    // générale. `Platform.OS` exclut le natif par construction.
    for (const os of ['ios', 'android']) {
      expect(isPrerender(os, false), os).toBe(false);
      expect(isPrerender(os, true), os).toBe(false);
    }
  });
});
