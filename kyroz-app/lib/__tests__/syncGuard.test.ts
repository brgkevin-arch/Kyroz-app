import { describe, it, expect } from 'vitest';
import { decideProfileHydration, normalizeProfileActivity, reconcileCloudSports } from '../syncGuard';
import { SportSession } from '../types';

const SPORTS: SportSession[] = [
  { type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 },
  { type: 'course', sessions_per_week: 2, minutes_per_session: 30 },
]; // total = 6 séances/semaine

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

// Fix P3.3 « TDEE qui saute » — cohérence sports ↔ training_days_per_week.
// La cause racine : les deux entrées d'activité peuvent diverger et faire basculer
// `calculateTDEE` (MET → multiplicateur) en silence. On la rend impossible.
describe('normalizeProfileActivity (P3.3)', () => {
  it('sports renseigné → recale training_days_per_week sur le total des séances', () => {
    const p = normalizeProfileActivity({ sports: SPORTS, training_days_per_week: 0 });
    expect(p!.training_days_per_week).toBe(6); // 4 + 2, plus jamais 0 avec des sports
  });

  it('compteur déjà cohérent → renvoie l\'objet TEL QUEL (pas de recopie inutile)', () => {
    const p = { sports: SPORTS, training_days_per_week: 6 };
    expect(normalizeProfileActivity(p)).toBe(p);
  });

  it('sports vide + compteur > 0 → intouché (profil legacy légitime, pas la divergence)', () => {
    const p = { sports: [], training_days_per_week: 3 };
    expect(normalizeProfileActivity(p)).toBe(p);
    expect(normalizeProfileActivity({ training_days_per_week: 4 })!.training_days_per_week).toBe(4);
  });

  it('null → null (pas de profil chargé)', () => {
    expect(normalizeProfileActivity(null)).toBeNull();
  });
});

describe('reconcileCloudSports (P3.3)', () => {
  it('cloud sans sports + local avec sports → préserve les séances locales', () => {
    const cloud = { sports: undefined, training_days_per_week: 6 };
    const merged = reconcileCloudSports(cloud as any, { sports: SPORTS });
    expect(merged.sports).toEqual(SPORTS); // le cloud vide n'efface PAS le sport local
  });

  it('cloud sports = [] (ligne partielle) + local renseigné → préserve le local', () => {
    const merged = reconcileCloudSports({ sports: [] } as any, { sports: SPORTS });
    expect(merged.sports).toEqual(SPORTS);
  });

  it('cloud A JETON de sports → le cloud fait foi (multi-appareils réel)', () => {
    const cloudSports: SportSession[] = [{ type: 'velo', sessions_per_week: 3, minutes_per_session: 60 }];
    const merged = reconcileCloudSports({ sports: cloudSports } as any, { sports: SPORTS });
    expect(merged.sports).toEqual(cloudSports); // on n'écrase pas un vrai sport cloud par le local
  });

  it('ni l\'un ni l\'autre → cloud tel quel (reste sur le repli legacy, pas un bug)', () => {
    const cloud = { training_days_per_week: 3 };
    expect(reconcileCloudSports(cloud as any, { sports: [] })).toBe(cloud);
  });

  it('chaîné : pull cloud sans sports → sports préservé PUIS compteur recalé (le TDEE ne saute plus)', () => {
    // Scénario exact du bug : ligne cloud dégradée (sports perdu), local sain.
    const cloud = { sports: undefined, training_days_per_week: 6 };
    const healed = normalizeProfileActivity(reconcileCloudSports(cloud as any, { sports: SPORTS }));
    expect(healed!.sports).toEqual(SPORTS);       // MET conservé → calcul précis
    expect(healed!.training_days_per_week).toBe(6); // cohérent avec les séances
  });
});
