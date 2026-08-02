import { describe, it, expect } from 'vitest';
import { ageOn, isBirthday, isRealDate, toStamp } from '../birthday';

describe('ageOn — âge révolu', () => {
  it('compte l\'anniversaire LE JOUR MÊME', () => {
    expect(ageOn('1994-08-02', '2026-08-01')).toBe(31); // la veille
    expect(ageOn('1994-08-02', '2026-08-02')).toBe(32); // le jour même
    expect(ageOn('1994-08-02', '2026-08-03')).toBe(32);
  });

  it('ne se trompe pas de bord au changement d\'année ni de mois', () => {
    expect(ageOn('1994-12-31', '2026-01-01')).toBe(31);
    expect(ageOn('1994-01-01', '2026-12-31')).toBe(32);
    expect(ageOn('1994-09-15', '2026-09-14')).toBe(31);
  });

  it('rend null sur une entrée illisible — l\'appelant garde sa valeur', () => {
    // Un 0 renvoyé ici traverserait Mifflin-St Jeor et fausserait le TDEE en silence.
    expect(ageOn(undefined, '2026-08-02')).toBeNull();
    expect(ageOn('pas-une-date', '2026-08-02')).toBeNull();
    expect(ageOn('1994-08-02', 'nawak')).toBeNull();
    expect(ageOn('2030-01-01', '2026-08-02')).toBeNull(); // né dans le futur
  });
});

describe('isBirthday', () => {
  it('vrai le jour, faux la veille et le lendemain', () => {
    expect(isBirthday('1994-08-02', '2026-08-02')).toBe(true);
    expect(isBirthday('1994-08-02', '2026-08-01')).toBe(false);
    expect(isBirthday('1994-08-02', '2026-08-03')).toBe(false);
  });

  it('29 février : fêté le 28 les années non bissextiles', () => {
    // Sans ce repli, une personne née un 29/02 n'aurait « jamais » son anniversaire
    // trois années sur quatre.
    expect(isBirthday('1996-02-29', '2028-02-29')).toBe(true);  // 2028 est bissextile
    expect(isBirthday('1996-02-29', '2027-02-28')).toBe(true);  // 2027 ne l'est pas
    expect(isBirthday('1996-02-29', '2027-03-01')).toBe(false);
    expect(isBirthday('1996-02-28', '2027-02-28')).toBe(true);  // né le 28 : inchangé
  });

  it('ne se déclenche pas sans date de naissance', () => {
    expect(isBirthday(undefined, '2026-08-02')).toBe(false);
  });
});

describe('isRealDate / toStamp — la saisie ne fabrique pas de dates fantômes', () => {
  it('refuse les jours qui n\'existent pas', () => {
    expect(isRealDate(2026, 2, 30)).toBe(false);
    expect(isRealDate(2026, 4, 31)).toBe(false);
    expect(isRealDate(2027, 2, 29)).toBe(false); // non bissextile
    expect(isRealDate(2028, 2, 29)).toBe(true);  // bissextile
    expect(isRealDate(2026, 13, 1)).toBe(false);
    expect(isRealDate(2026, 0, 10)).toBe(false);
  });

  it('formate sur deux chiffres', () => {
    expect(toStamp(1994, 8, 2)).toBe('1994-08-02');
    expect(toStamp(1994, 12, 25)).toBe('1994-12-25');
    expect(toStamp(2026, 2, 30)).toBeNull();
  });
});
