import { describe, it, expect } from 'vitest';
import { chainProgress, isMilestone, nextMilestone, streakMessage, celebrationCopy } from '../streak';

describe('chainProgress (chaînon de 7)', () => {
  it('se remplit 1→7 la première semaine', () => {
    expect(chainProgress(0)).toEqual({ filled: 0, total: 7 });
    expect(chainProgress(1)).toEqual({ filled: 1, total: 7 });
    expect(chainProgress(7)).toEqual({ filled: 7, total: 7 });
  });
  it('repart à 1 après une semaine pleine', () => {
    expect(chainProgress(8)).toEqual({ filled: 1, total: 7 });
    expect(chainProgress(14)).toEqual({ filled: 7, total: 7 });
    expect(chainProgress(15)).toEqual({ filled: 1, total: 7 });
  });
});

describe('isMilestone', () => {
  it('paliers exacts uniquement (un reset à 1 ne célèbre pas)', () => {
    expect(isMilestone(1)).toBe(false);
    expect(isMilestone(3)).toBe(true);
    expect(isMilestone(7)).toBe(true);
    expect(isMilestone(8)).toBe(false);
    expect(isMilestone(14)).toBe(true);
    expect(isMilestone(100)).toBe(true);
  });
  it('au-delà de 100 : multiples de 100', () => {
    expect(isMilestone(200)).toBe(true);
    expect(isMilestone(150)).toBe(false);
  });
});

describe('nextMilestone', () => {
  it('prochain palier croissant', () => {
    expect(nextMilestone(0)).toBe(3);
    expect(nextMilestone(3)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(99)).toBe(100);
    expect(nextMilestone(100)).toBe(200);
  });
});

describe('streakMessage', () => {
  it('gère le pluriel (« 1 jour », pas « 1 jours »)', () => {
    expect(streakMessage(6)).toContain('1 jour ');
    expect(streakMessage(5)).toContain('2 jours');
  });
  it('célèbre le cap des 7 jours (North Star)', () => {
    expect(streakMessage(7)).toMatch(/7 jours atteint/);
  });
  it('après 7 : pointe le palier suivant', () => {
    expect(streakMessage(10)).toContain('14');
  });
});

describe('celebrationCopy', () => {
  it('copy dédiée aux paliers connus, générique au-delà', () => {
    expect(celebrationCopy(7).title).toContain('7');
    expect(celebrationCopy(300).title).toContain('300');
  });
});
