// Fusions d'hydratation — logique PURE (aucun mock, aucun runtime).
//
// La propriété qui compte le plus ici est l'IDEMPOTENCE : l'hydratation tourne à
// chaque connexion, donc fusionner deux fois doit donner exactement le même résultat
// que fusionner une fois. Une fusion non idempotente ferait dériver la donnée à chaque
// ouverture de l'app — le genre de défaut qu'on ne voit qu'au bout de trois semaines.

import { describe, expect, it } from 'vitest';
import { mergeRecipeOverrides, mergeStreak, mergeWeightEntries } from '../syncGuard';
import type { StreakLike } from '../syncGuard';

describe('mergeWeightEntries — historique, union par date', () => {
  const cloud = [{ date: '2026-06-01', weight_kg: 84 }, { date: '2026-07-01', weight_kg: 81 }];
  const local = [{ date: '2026-07-01', weight_kg: 80.5 }, { date: '2026-07-15', weight_kg: 79 }];

  it('réunit les deux journaux, triés par date', () => {
    expect(mergeWeightEntries(cloud, local).map((e) => e.date))
      .toEqual(['2026-06-01', '2026-07-01', '2026-07-15']);
  });

  it('sur une date commune, le LOCAL gagne', () => {
    expect(mergeWeightEntries(cloud, local).find((e) => e.date === '2026-07-01')?.weight_kg)
      .toBe(80.5);
  });

  it('conserve la note attachée à une pesée', () => {
    const merged = mergeWeightEntries([], [{ date: '2026-07-01', weight_kg: 80, note: 'voyage' }]);
    expect(merged[0].note).toBe('voyage');
  });

  it('IDEMPOTENT : fusionner le résultat une seconde fois ne change rien', () => {
    const once = mergeWeightEntries(cloud, local);
    expect(mergeWeightEntries(once, once)).toEqual(once);
    expect(mergeWeightEntries(cloud, once)).toEqual(once);
  });

  it('tolère null, undefined et les entrées sans date', () => {
    expect(mergeWeightEntries(null, null)).toEqual([]);
    expect(mergeWeightEntries(undefined, local)).toEqual(
      [...local].sort((a, b) => a.date.localeCompare(b.date)),
    );
    expect(mergeWeightEntries([{ date: '', weight_kg: 1 } as any], local)).toHaveLength(2);
  });
});

describe('mergeStreak — record au max, série en cours au plus récent', () => {
  const vieuxCloud: StreakLike = { current_streak_days: 3, longest_streak_days: 5, last_active_date: '2026-07-28' };
  const localFrais: StreakLike = { current_streak_days: 9, longest_streak_days: 9, last_active_date: '2026-07-29' };

  it('le local plus récent impose sa série en cours', () => {
    const m = mergeStreak(vieuxCloud, localFrais)!;
    expect(m.current_streak_days).toBe(9);
    expect(m.last_active_date).toBe('2026-07-29');
  });

  it('le cloud plus récent impose la sienne — la règle n’est pas « le local gagne »', () => {
    const m = mergeStreak(
      { current_streak_days: 11, longest_streak_days: 11, last_active_date: '2026-07-30' },
      localFrais,
    )!;
    expect(m.current_streak_days).toBe(11);
  });

  it('le record ne redescend jamais', () => {
    const m = mergeStreak({ ...vieuxCloud, longest_streak_days: 40 }, localFrais)!;
    expect(m.longest_streak_days).toBe(40);
  });

  it('préserve freeze_available, qui n’existe que côté local', () => {
    expect(mergeStreak(vieuxCloud, { ...localFrais, freeze_available: false })!.freeze_available)
      .toBe(false);
  });

  it('à date d’activité ÉGALE, le local tranche (l’appareil en main)', () => {
    const m = mergeStreak(
      { current_streak_days: 3, longest_streak_days: 5, last_active_date: '2026-07-29' },
      localFrais,
    )!;
    expect(m.current_streak_days).toBe(9);
  });

  it('IDEMPOTENT', () => {
    const once = mergeStreak(vieuxCloud, localFrais)!;
    expect(mergeStreak(once, once)).toEqual(once);
    expect(mergeStreak(vieuxCloud, once)).toEqual(once);
  });

  it('tolère l’absence d’un côté', () => {
    expect(mergeStreak(null, localFrais)).toEqual(localFrais);
    expect(mergeStreak(vieuxCloud, null)).toEqual(vieuxCloud);
    expect(mergeStreak(null, null)).toBeNull();
  });
});

describe('mergeRecipeOverrides — union par identifiant', () => {
  const cloud = { rep1: { name_fr: 'cloud-1' }, rep9: { name_fr: 'cloud-9' } };
  const local = { rep1: { name_fr: 'local-1' }, rep2: { name_fr: 'local-2' } };

  it('réunit les deux jeux de recettes personnalisées', () => {
    expect(Object.keys(mergeRecipeOverrides(cloud, local)).sort()).toEqual(['rep1', 'rep2', 'rep9']);
  });

  it('sur un même identifiant, la version LOCALE gagne', () => {
    expect(mergeRecipeOverrides(cloud, local).rep1.name_fr).toBe('local-1');
  });

  it('IDEMPOTENT', () => {
    const once = mergeRecipeOverrides(cloud, local);
    expect(mergeRecipeOverrides(once, once)).toEqual(once);
    expect(mergeRecipeOverrides(cloud, once)).toEqual(once);
  });

  it('tolère null et undefined', () => {
    expect(mergeRecipeOverrides(null, null)).toEqual({});
    expect(mergeRecipeOverrides(undefined, local)).toEqual(local);
  });
});
