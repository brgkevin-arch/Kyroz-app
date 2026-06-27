import { describe, it, expect } from 'vitest';
import { chainProgress, isMilestone, nextMilestone, streakMessage, celebrationCopy, advanceStreak, nextFreezeRecharge } from '../streak';
import { Streak } from '../types';

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

const TODAY = '2026-06-20', YDAY = '2026-06-19', DBEF = '2026-06-18';
const base = (o: Partial<Streak> = {}): Streak =>
  ({ current_streak_days: 0, longest_streak_days: 0, last_active_date: '', freeze_available: true, ...o });

describe('advanceStreak — bouclier de série', () => {
  it("déjà actif aujourd'hui → inchangé (même référence, pas d'écriture)", () => {
    const cur = base({ current_streak_days: 3, last_active_date: TODAY });
    const step = advanceStreak(cur, TODAY, YDAY, DBEF);
    expect(step.streak).toBe(cur);
    expect(step.froze).toBe(false);
  });

  it('actif hier → +1', () => {
    const step = advanceStreak(base({ current_streak_days: 3, last_active_date: YDAY }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(4);
    expect(step.froze).toBe(false);
    expect(step.streak.last_active_date).toBe(TODAY);
  });

  it('1 jour manqué + bouclier dispo → série GELÉE (préservée), bouclier consommé', () => {
    const step = advanceStreak(base({ current_streak_days: 4, last_active_date: DBEF, freeze_available: true }), TODAY, YDAY, DBEF);
    expect(step.froze).toBe(true);
    expect(step.streak.current_streak_days).toBe(4);   // préservée
    expect(step.streak.freeze_available).toBe(false);  // consommé
    expect(step.streak.last_active_date).toBe(TODAY);
    expect(step.reachedMilestone).toBeNull();          // jamais de célébration sur un gel
  });

  it('1 jour manqué SANS bouclier → reset à 1 (nouveau bouclier)', () => {
    const step = advanceStreak(base({ current_streak_days: 4, last_active_date: DBEF, freeze_available: false }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(1);
    expect(step.froze).toBe(false);
    expect(step.streak.freeze_available).toBe(true);
  });

  it('2+ jours manqués → reset à 1 même avec bouclier', () => {
    const step = advanceStreak(base({ current_streak_days: 10, last_active_date: '2026-06-10', freeze_available: true }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(1);
    expect(step.froze).toBe(false);
  });

  it('le bouclier se recharge au palier de 7 jours', () => {
    const step = advanceStreak(base({ current_streak_days: 6, last_active_date: YDAY, freeze_available: false }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(7);
    expect(step.streak.freeze_available).toBe(true);
    expect(step.reachedMilestone).toBe(7);
  });

  it('reste sans bouclier hors palier 7', () => {
    const step = advanceStreak(base({ current_streak_days: 3, last_active_date: YDAY, freeze_available: false }), TODAY, YDAY, DBEF);
    expect(step.streak.current_streak_days).toBe(4);
    expect(step.streak.freeze_available).toBe(false);
  });

  it('profil legacy (freeze_available undefined) → traité comme dispo', () => {
    const cur: Streak = { current_streak_days: 4, longest_streak_days: 4, last_active_date: DBEF };
    const step = advanceStreak(cur, TODAY, YDAY, DBEF);
    expect(step.froze).toBe(true);
    expect(step.streak.current_streak_days).toBe(4);
  });

  it('nextFreezeRecharge = prochain multiple de 7', () => {
    expect(nextFreezeRecharge(4)).toBe(7);
    expect(nextFreezeRecharge(7)).toBe(14);
    expect(nextFreezeRecharge(0)).toBe(7);
  });
});
