import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// Minuit ne déclenche rien. À la bascule de jour, ni `plan` ni `profile` ne
// changent : tout effet qui ne dépend que d'eux ne se rejoue pas, et tout
// `useMemo` qui lit `new Date()` garde la valeur d'hier.
//
// Le défaut mesuré avant ce fichier : l'écran Plan restait sur la journée de la
// VEILLE — pastille sur hier, repas d'hier encore cochés, total d'hier, réserve
// jamais débitée — jusqu'à ce qu'autre chose provoque un re-rendu. Le seul
// écouteur de réveil n'appelait qu'`autoCocher`, qui sort en early-return tant
// qu'aucun repas n'est échu : sur un plan qui démarre au déjeuner, l'écran
// mentait jusqu'à ~14 h.
//
// ⚠️ La bascule de jour est une valeur d'APPAREIL (CLAUDE.md §11) : elle ne se
// déduit d'aucune donnée de l'app. Ce fichier vérifie qu'elle est RELUE, et que
// les deux consommateurs qui en dépendent la déclarent — parce que c'est
// exactement ce qui manquait, et qu'un tableau de dépendances incomplet ne fait
// rougir aucun compilateur.

const PLAN = readFileSync(
  join(__dirname, '..', '..', 'app', '(tabs)', 'plan.tsx'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Le tableau de dépendances du premier `}, [...])` qui suit une aiguille. */
function depsApres(aiguille: string, quoi: string): string {
  const i = PLAN.indexOf(aiguille);
  expect(i, `${quoi} introuvable dans plan.tsx`).toBeGreaterThan(-1);
  const m = /\}, \[([^\]]*)\]\)/.exec(PLAN.slice(i));
  expect(m, `tableau de dépendances de ${quoi} introuvable`).toBeTruthy();
  return m![1];
}

describe('bascule de jour — le jour civil se relit, il ne se déduit pas', () => {
  it('🔴 le jour est RELU aux moments de réveil, et avant de regarder les repas', () => {
    // `autoCocher` ne peut pas servir de déclencheur : il sort en early-return
    // tant qu'aucun repas n'est échu. Une limite franchie, c'est une heure de
    // repas OU minuit, et seul le second change la journée affichée.
    expect(PLAN).toMatch(/const auReveil = useCallback\(\(\) => \{\s*relireLeJour\(\);\s*autoCocher\(\);/);
    expect(PLAN, 'le retour sur l’onglet ne relit plus le jour').toContain('useFocusEffect(auReveil)');
    expect(PLAN, 'le réveil de l’app ne relit plus le jour').toMatch(/st === 'active'\) auReveil\(\)/);
  });

  it('🔴 la journée AFFICHÉE dépend du jour civil', () => {
    // Sans lui, `todayIdx` est un memo figé sur `[profile, plan]` : il lit
    // `new Date().getDay()` une fois et n'y revient jamais.
    expect(
      depsApres('const todayIdx = useMemo(', 'todayIdx'),
      'todayIdx ne dépend pas de `jourCivil` : la pastille reste sur hier',
    ).toContain('jourCivil');
  });

  it('🔴 le SOLDE de la veille dépend du jour civil', () => {
    // C'est lui qui débite la réserve des repas non tranchés d'hier et remet le
    // suivi à zéro. Figé sur `[plan, profile]`, il ne se rejoue jamais à minuit.
    expect(
      depsApres('await solderLaVeille(', 'l’effet qui solde la veille'),
      'le solde de la veille ne dépend pas de `jourCivil` : la réserve n’est jamais débitée',
    ).toContain('jourCivil');
  });

  it('relire le même jour ne provoque AUCUN re-rendu', () => {
    // Le réveil est fréquent (chaque retour d'arrière-plan, chaque retour sur
    // l'onglet). Sans ce comparateur, chacun re-rendrait tout l'écran Plan.
    const bloc = /const relireLeJour = useCallback\([\s\S]*?\n  \}, \[\]\);/.exec(PLAN)?.[0] ?? '';
    expect(bloc, 'relireLeJour introuvable').not.toBe('');
    expect(bloc).toMatch(/return jour === precedent \? precedent : jour;/);
  });

  it('le jour civil est lu par `todayStamp`, jamais par un `toISOString`', () => {
    // `new Date().toISOString().slice(0, 10)` sur une date LOCALE décale d'un
    // jour selon le fuseau — c'est le piège que `todayStamp` existe pour fermer.
    const bloc = /const \[jourCivil, setJourCivil\][\s\S]*?\n  \}, \[\]\);/.exec(PLAN)?.[0] ?? '';
    expect(bloc, 'l’état du jour civil introuvable').not.toBe('');
    expect(bloc).toContain('todayStamp');
    expect(bloc).not.toContain('toISOString');
  });
});
