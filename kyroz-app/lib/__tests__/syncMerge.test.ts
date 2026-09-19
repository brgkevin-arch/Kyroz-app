// Fusions d'hydratation — logique PURE (aucun mock, aucun runtime).
//
// La propriété qui compte le plus ici est l'IDEMPOTENCE : l'hydratation tourne à
// chaque connexion, donc fusionner deux fois doit donner exactement le même résultat
// que fusionner une fois. Une fusion non idempotente ferait dériver la donnée à chaque
// ouverture de l'app — le genre de défaut qu'on ne voit qu'au bout de trois semaines.

import { describe, expect, it } from 'vitest';
import { mergeRecipeOverrides, mergeWeightEntries } from '../syncGuard';

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
