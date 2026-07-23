import { describe, it, expect } from 'vitest';
import { screeningBlocked, EMPTY_FLAGS, SCREENING_VERSION } from '../healthScreening';

describe('healthScreening — hard block CLAUDE.md §6', () => {
  it('ne bloque PAS un adulte en bonne santé (aucune situation cochée)', () => {
    expect(screeningBlocked(EMPTY_FLAGS)).toBe(false);
  });

  it('bloque en cas de grossesse / allaitement', () => {
    expect(screeningBlocked({ ...EMPTY_FLAGS, pregnant_or_breastfeeding: true })).toBe(true);
  });

  it('bloque en cas de pathologie chronique suivie', () => {
    expect(screeningBlocked({ ...EMPTY_FLAGS, chronic_condition: true })).toBe(true);
  });

  it('bloque si plusieurs situations sont cochées', () => {
    expect(screeningBlocked({ pregnant_or_breastfeeding: true, chronic_condition: true })).toBe(true);
  });

  it('a une version de critères définie (pour re-dépistage si les questions changent)', () => {
    expect(SCREENING_VERSION).toBeGreaterThanOrEqual(1);
  });
});
