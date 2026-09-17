import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { joursEcoules, semaineEcoulee } from '../semainePlan';

/**
 * LA SEMAINE RÉVOLUE SE RENOUVELLE (défaut de D30, corrigé le 2026-09-17).
 *
 * Rien ne regardait `week_start_date` : le plan ne se renouvelait jamais tout seul.
 * `resetTracking` ne périme que le SUIVI du jour, pas les repas.
 */
const plan = (jours: number, debut: string) => ({ week_start_date: debut, days: jours });

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

describe('quand le plan se renouvelle', () => {
  it('7 jours pour un plan de 7 : la veille non, le jour même oui', () => {
    expect(semaineEcoulee(plan(7, '2026-09-10'), '2026-09-16')).toBe(false);
    expect(semaineEcoulee(plan(7, '2026-09-10'), '2026-09-17')).toBe(true);
    expect(semaineEcoulee(plan(7, '2026-09-10'), '2026-10-01')).toBe(true);
  });

  it('un plan plus court se périme plus tôt — c’est SA durée qui compte, pas le calendrier', () => {
    expect(semaineEcoulee(plan(5, '2026-09-10'), '2026-09-14')).toBe(false);
    expect(semaineEcoulee(plan(5, '2026-09-10'), '2026-09-15')).toBe(true);
  });

  it('une date illisible ou dans le futur ne jette JAMAIS la semaine', () => {
    expect(semaineEcoulee(plan(7, 'n’importe quoi'), '2026-09-17')).toBe(false);
    expect(semaineEcoulee(plan(7, '2026-09-20'), '2026-09-17')).toBe(false);
  });

  it('un plan de plus de 7 jours reste borné à 7', () => {
    expect(semaineEcoulee(plan(30, '2026-09-10'), '2026-09-17')).toBe(true);
  });
});

describe('l’écran Plan s’en sert', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'plan.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('il compare la date du jour et régénère avec un NOUVEAU tirage', () => {
    expect(src).toMatch(/semaineEcoulee\(plan, todayStamp\(\)\)/);
    // reroll = true : reprendre le même tirage resservirait les mêmes plats.
    expect(src).toMatch(/generate\(true, 'semaine_ecoulee'\)/);
  });
});
