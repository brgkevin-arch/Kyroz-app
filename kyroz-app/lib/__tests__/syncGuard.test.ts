import { describe, it, expect } from 'vitest';
import { decideProfileHydration } from '../syncGuard';

// Garde-fou anti-écrasement du profil (problème C du brief macros-calories).
// La règle clé : un profil local NON confirmé poussé (dirty) ne doit jamais être
// écrasé par le cloud — sinon un push rejeté en silence = onboarding/édition perdus.
describe('decideProfileHydration', () => {
  it('local dirty → keep_local, MÊME si le cloud a une ligne (le garde-fou)', () => {
    expect(decideProfileHydration({ hasCloud: true, hasLocal: true, localDirty: true })).toBe('keep_local');
    expect(decideProfileHydration({ hasCloud: false, hasLocal: true, localDirty: true })).toBe('keep_local');
  });

  it('local propre + cloud présent → pull_cloud (réinstall / multi-appareils)', () => {
    expect(decideProfileHydration({ hasCloud: true, hasLocal: true, localDirty: false })).toBe('pull_cloud');
    expect(decideProfileHydration({ hasCloud: true, hasLocal: false, localDirty: false })).toBe('pull_cloud');
  });

  it('cloud vide + local présent → push_local', () => {
    expect(decideProfileHydration({ hasCloud: false, hasLocal: true, localDirty: false })).toBe('push_local');
  });

  it('rien des deux côtés → noop', () => {
    expect(decideProfileHydration({ hasCloud: false, hasLocal: false, localDirty: false })).toBe('noop');
  });

  it('dirty mais pas de local (flag résiduel post-logout) → le cloud peut hydrater', () => {
    expect(decideProfileHydration({ hasCloud: true, hasLocal: false, localDirty: true })).toBe('pull_cloud');
  });
});
