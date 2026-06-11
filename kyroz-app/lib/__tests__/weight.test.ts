import { describe, it, expect } from 'vitest';
import {
  localStamp, todayStamp, upsertEntry, removeEntry, latest, checkinDue, lastDelta,
  loadWeights, saveWeights, frequencyDays, WEIGH_IN_INTERVALS, WeightEntry,
} from '../weight';

const day = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return localStamp(d);
};

describe('dates (heure locale — régression du bug de fuseau)', () => {
  it('todayStamp = localStamp(minuit local) — jamais de décalage UTC', () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    expect(todayStamp()).toBe(localStamp(d));
  });
  it('format YYYY-MM-DD zéro-paddé', () => {
    expect(localStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('upsertEntry (1 point par jour)', () => {
  it('écrase le point du même jour, garde la liste triée', () => {
    let list: WeightEntry[] = [];
    list = upsertEntry(list, 80);              // seed aujourd'hui
    list = upsertEntry(list, 75, day(-1));     // backfill hier
    list = upsertEntry(list, 90);              // aujourd'hui ré-écrasé
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ date: day(-1), weight_kg: 75 });
    expect(list[1]).toMatchObject({ date: day(0), weight_kg: 90 }); // le + récent à droite
  });

  it('note : trim, et absente si vide', () => {
    const withNote = upsertEntry([], 80, day(0), '  voyage  ');
    expect(withNote[0].note).toBe('voyage');
    const noNote = upsertEntry([], 80, day(0), '   ');
    expect(noNote[0].note).toBeUndefined();
  });
});

describe('latest / lastDelta', () => {
  it('latest = point le plus récent, null si vide', () => {
    expect(latest([])).toBeNull();
    const list = upsertEntry(upsertEntry([], 80, day(-3)), 78, day(0));
    expect(latest(list)?.weight_kg).toBe(78);
  });
  it('delta entre les 2 derniers points (arrondi 0.1)', () => {
    expect(lastDelta([])).toBeNull();
    const list = upsertEntry(upsertEntry([], 80, day(-7)), 79.65, day(0));
    expect(lastDelta(list)).toBe(-0.3);
  });
});

describe('removeEntry', () => {
  it('supprime le point de la date donnée, laisse le reste intact', () => {
    let list = upsertEntry(upsertEntry([], 80, day(-1)), 78, day(0));
    list = removeEntry(list, day(-1));
    expect(list).toHaveLength(1);
    expect(list[0].date).toBe(day(0));
  });
});

describe('loadWeights (auto-nettoyage)', () => {
  it('purge les points datés dans le futur (données héritées du bug de fuseau)', async () => {
    await saveWeights([
      { date: day(-1), weight_kg: 80 },
      { date: day(+1), weight_kg: 95 }, // impossible légitimement → purgé
      { date: day(0), weight_kg: 79 },
    ]);
    const list = await loadWeights();
    expect(list.map((e) => e.date)).toEqual([day(-1), day(0)]); // trié, sans le futur
  });
});

describe('checkinDue (cadence configurable)', () => {
  const at = (d: string): WeightEntry[] => [{ date: d, weight_kg: 80 }];
  it('pas de nag sans historique', () => {
    expect(checkinDue([], day(0))).toBe(false);
  });
  it('défaut 7 jours : dû à J+7, pas avant', () => {
    expect(checkinDue(at('2026-05-15'), '2026-05-21')).toBe(false); // J+6
    expect(checkinDue(at('2026-05-15'), '2026-05-22')).toBe(true);  // J+7
  });
  it('respecte un intervalle custom (quotidien / mensuel)', () => {
    expect(checkinDue(at('2026-05-15'), '2026-05-16', 1)).toBe(true);  // quotidien : J+1
    expect(checkinDue(at('2026-05-15'), '2026-06-13', 30)).toBe(false); // mensuel : J+29
    expect(checkinDue(at('2026-05-15'), '2026-06-14', 30)).toBe(true);  // mensuel : J+30
  });
});

describe('frequencyDays', () => {
  it('mappe chaque cadence vers son intervalle', () => {
    expect(frequencyDays('daily')).toBe(1);
    expect(frequencyDays('weekly')).toBe(7);
    expect(frequencyDays('biweekly')).toBe(14);
    expect(frequencyDays('monthly')).toBe(30);
  });
  it('repli défaut (hebdo) si non défini', () => {
    expect(frequencyDays(undefined)).toBe(WEIGH_IN_INTERVALS.weekly);
  });
});
