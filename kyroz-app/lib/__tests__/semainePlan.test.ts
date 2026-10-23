import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datesDuPlan, joursEcoules, semaineEcoulee } from '../semainePlan';

/**
 * LA SEMAINE RÉVOLUE SE RENOUVELLE (défaut de D30, corrigé le 2026-09-17).
 *
 * Rien ne regardait `week_start_date` : le plan ne se renouvelait jamais tout seul.
 * `resetTracking` ne périme que le SUIVI du jour, pas les repas.
 *
 * ➡️ 2026-10-04 : chaque jour du plan a sa VRAIE date (`datesDuPlan`), et le plan se
 * renouvelle le lendemain de son dernier jour. Mesuré avant : un plan du lundi au vendredi
 * généré un dimanche affichait la semaine passée et se régénérait le vendredi matin, après
 * les courses (ses quatre repas du vendredi changeaient).
 */
const plan = (jours: number, debut: string) => ({ week_start_date: debut, days: jours });
const LUN_VEN = [1, 2, 3, 4, 5];
const SEPT = [1, 2, 3, 4, 5, 6, 0];        // lundi d’abord, comme le Profil l’enregistre
const SEMAINE_DU_28 = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
const SEMAINE_DU_5 = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];

/** Le premier jour (sur deux semaines) où le plan est jugé révolu. */
const renouveleLe = (p: { week_start_date: string; days: number }, wds: number[] | undefined) => {
  for (let i = 0; i < 15; i++) {
    const d = new Date(`${p.week_start_date}T12:00:00`);
    d.setDate(d.getDate() + i);
    const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (semaineEcoulee(p, jour, wds)) return jour;
  }
  return null;
};

describe('compter les jours', () => {
  it('compte des jours entiers, changement de mois compris', () => {
    expect(joursEcoules('2026-09-10', '2026-09-17')).toBe(7);
    expect(joursEcoules('2026-08-29', '2026-09-02')).toBe(4);
    expect(joursEcoules('2026-09-17', '2026-09-17')).toBe(0);
  });

  it('une date illisible rend null, jamais un nombre inventé', () => {
    expect(joursEcoules('', '2026-09-17')).toBeNull();
    expect(joursEcoules('17/09/2026', '2026-09-17')).toBeNull();
    expect(joursEcoules('2026-09-10', 'hier')).toBeNull();
  });
});

describe('la vraie date de chaque jour du plan', () => {
  it('généré un lundi : la semaine en cours', () => {
    expect(datesDuPlan(plan(5, '2026-09-28'), LUN_VEN)).toEqual(SEMAINE_DU_28);
  });

  it('généré un jeudi : la semaine en cours, ses jours passés compris (règle du 2026-09-17)', () => {
    expect(datesDuPlan(plan(5, '2026-10-01'), LUN_VEN)).toEqual(SEMAINE_DU_28);
  });

  it('généré le week-end, sans aucun jour du plan restant : la semaine QUI VIENT', () => {
    expect(datesDuPlan(plan(5, '2026-10-04'), LUN_VEN)).toEqual(SEMAINE_DU_5);
    expect(datesDuPlan(plan(5, '2026-10-03'), LUN_VEN)).toEqual(SEMAINE_DU_5);
  });

  it('généré un samedi avec un plan de 7 jours : il reste samedi et dimanche, c’est la semaine en cours', () => {
    const d = datesDuPlan(plan(7, '2026-10-03'), SEPT)!;
    expect(d[0]).toBe('2026-09-28');
    expect(d[6]).toBe('2026-10-04');
  });

  it('le dimanche en tête du tableau se date en FIN de semaine', () => {
    expect(datesDuPlan(plan(7, '2026-09-28'), [0, 1, 2, 3, 4, 5, 6])![0]).toBe('2026-10-04');
  });

  it('passe les changements de mois et d’année', () => {
    expect(datesDuPlan(plan(5, '2026-12-27'), LUN_VEN))
      .toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01']);
  });

  it('sans jours choisis ou avec une date illisible : null, chaque appelant garde son repli', () => {
    expect(datesDuPlan(plan(5, '2026-10-01'), undefined)).toBeNull();
    expect(datesDuPlan(plan(5, '2026-10-01'), [])).toBeNull();
    expect(datesDuPlan(plan(5, 'hier'), LUN_VEN)).toBeNull();
  });
});

describe('quand le plan se renouvelle : le lendemain de son dernier jour', () => {
  it('lundi au vendredi généré le lundi : le samedi, comme avant', () => {
    expect(renouveleLe(plan(5, '2026-09-28'), LUN_VEN)).toBe('2026-10-03');
  });

  it('généré le DIMANCHE pour la semaine qui vient : le samedi d’après, plus le vendredi', () => {
    expect(renouveleLe(plan(5, '2026-10-04'), LUN_VEN)).toBe('2026-10-10');
  });

  it('généré le samedi : le samedi d’après, plus le jeudi', () => {
    expect(renouveleLe(plan(5, '2026-10-03'), LUN_VEN)).toBe('2026-10-10');
  });

  it('généré un jeudi : ce samedi, plus le mardi suivant (l’ancien plan restait affiché le lundi)', () => {
    expect(renouveleLe(plan(5, '2026-10-01'), LUN_VEN)).toBe('2026-10-03');
  });

  it('plan de 7 jours : le lundi suivant, quel que soit le jour de génération', () => {
    expect(renouveleLe(plan(7, '2026-09-28'), SEPT)).toBe('2026-10-05');
    expect(renouveleLe(plan(7, '2026-10-01'), SEPT)).toBe('2026-10-05');
    expect(renouveleLe(plan(7, '2026-10-04'), SEPT)).toBe('2026-10-05');
  });

  it('un plan à trous (lundi, mercredi, vendredi) garde son vendredi', () => {
    // Le compte de 3 jours le renouvelait le jeudi.
    expect(renouveleLe(plan(3, '2026-09-28'), [1, 3, 5])).toBe('2026-10-03');
  });

  it('une date illisible ou dans le futur ne jette JAMAIS la semaine', () => {
    expect(semaineEcoulee(plan(5, 'n’importe quoi'), '2026-10-17', LUN_VEN)).toBe(false);
    expect(semaineEcoulee(plan(5, '2026-10-20'), '2026-10-17', LUN_VEN)).toBe(false);
    expect(semaineEcoulee(plan(5, '2026-09-28'), 'hier', LUN_VEN)).toBe(false);
  });
});

describe('sans jours choisis (comptes d’avant) : le compte de jours d’avant', () => {
  it('7 jours pour un plan de 7 : la veille non, le jour même oui', () => {
    expect(semaineEcoulee(plan(7, '2026-09-10'), '2026-09-16', undefined)).toBe(false);
    expect(semaineEcoulee(plan(7, '2026-09-10'), '2026-09-17', undefined)).toBe(true);
    expect(semaineEcoulee(plan(7, '2026-09-10'), '2026-10-01', undefined)).toBe(true);
  });

  it('un plan plus court se périme plus tôt : c’est SA durée qui compte', () => {
    expect(semaineEcoulee(plan(5, '2026-09-10'), '2026-09-14', undefined)).toBe(false);
    expect(semaineEcoulee(plan(5, '2026-09-10'), '2026-09-15', undefined)).toBe(true);
  });

  it('une date illisible ou dans le futur ne jette JAMAIS la semaine', () => {
    expect(semaineEcoulee(plan(7, 'n’importe quoi'), '2026-09-17', undefined)).toBe(false);
    expect(semaineEcoulee(plan(7, '2026-09-20'), '2026-09-17', undefined)).toBe(false);
  });

  it('un plan de plus de 7 jours reste borné à 7', () => {
    expect(semaineEcoulee(plan(30, '2026-09-10'), '2026-09-17', undefined)).toBe(true);
  });
});

describe('l’écran Plan s’en sert', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'plan.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('il compare la date du jour, avec les jours du plan, et régénère avec un NOUVEAU tirage', () => {
    expect(src).toMatch(/semaineEcoulee\(plan, todayStamp\(\), profile\.plan_weekdays\)/);
    // reroll = true : reprendre le même tirage resservirait les mêmes plats.
    expect(src).toMatch(/generate\(true, 'semaine_ecoulee'\)/);
  });

  it('le bandeau date chaque jour par `datesDuPlan`, plus par la semaine en cours', () => {
    expect(src).toMatch(/datesDuPlan\(plan, profile\?\.plan_weekdays\)/);
    expect(src).toMatch(/const iso = datesReelles\?\.\[i\];/);
  });
});
