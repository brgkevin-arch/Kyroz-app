import { describe, it, expect } from 'vitest';
import { salutation, momentDuJour, SALUTATIONS, SALUTATION_MAX, MomentDuJour } from '../salutation';

// Garde-fou de `lib/salutation.ts` — l'en-tête de l'écran Plan.
//
// Ce qu'il tient, et pourquoi chacun :
//  · un « Bonjour » à 22 h serait un texte FAUX, au même titre qu'un chiffre faux ;
//  · la salutation doit tenir SANS prénom (tout compte antérieur à l'étape prénom
//    a le champ vide) ;
//  · elle doit rester COURTE, sinon l'en-tête change de hauteur d'un jour à
//    l'autre en `Type.display` ;
//  · elle doit être DÉTERMINISTE : depuis le retrait de la rotation par jour
//    (2026-08-25), le mot ne dépend QUE de l'heure — ni du jour, ni du hasard.
//    Le test qui l'exige est celui qui rougirait si quelqu'un remettait un cycle
//    sans le dire.

const MOMENTS: MomentDuJour[] = ['matin', 'apresmidi', 'soir'];

/** Une date au jour et à l'heure voulus (heure LOCALE, comme l'écran). */
const le = (jour: number, heure: number) => new Date(2026, 7, jour, heure, 30, 0, 0);

describe('momentDuJour', () => {
  it('place les bornes là où le langage les met', () => {
    expect(momentDuJour(5)).toBe('matin');
    expect(momentDuJour(11)).toBe('matin');
    expect(momentDuJour(12)).toBe('apresmidi');
    expect(momentDuJour(17)).toBe('apresmidi');
    expect(momentDuJour(18)).toBe('soir');
    expect(momentDuJour(23)).toBe('soir');
  });

  it('rattache la nuit au SOIR — à 1 h on finit sa journée, on ne la commence pas', () => {
    for (const h of [0, 1, 2, 3, 4]) expect(momentDuJour(h)).toBe('soir');
  });

  it('couvre les 24 heures sans trou', () => {
    for (let h = 0; h < 24; h++) expect(MOMENTS).toContain(momentDuJour(h));
  });
});

describe('salutation', () => {
  it("ne dit JAMAIS « bonjour » le soir ni la nuit — c'est un texte faux, pas une maladresse", () => {
    for (const h of [18, 20, 22, 23, 0, 2, 4]) {
      for (let j = 1; j <= 28; j++) {
        expect(salutation('Kévin', le(j, h)).toLowerCase()).not.toContain('bonjour');
      }
    }
  });

  it('ne dit jamais « bonsoir » en pleine matinée non plus', () => {
    for (const h of [6, 8, 10, 11]) {
      for (let j = 1; j <= 28; j++) {
        expect(salutation('Kévin', le(j, h)).toLowerCase()).not.toContain('bonsoir');
      }
    }
  });

  it('tient sans prénom : ni espace en trop, ni « undefined »', () => {
    for (const h of [8, 14, 21]) {
      const s = salutation('', le(3, h));
      expect(s.length).toBeGreaterThan(0);
      expect(s).toBe(s.trim());
      expect(s).not.toContain('undefined');
      // Le repli n'est PAS un titre d'écran : « Ton plan » a été retiré le
      // 2026-08-14 précisément parce qu'il servait autre chose qu'un bonjour.
      expect(s).not.toContain('Ton plan');
    }
  });

  it('accroche le prénom, et le nettoie', () => {
    expect(salutation('  Kévin  ', le(3, 9))).toBe(`${salutation('', le(3, 9))} Kévin`);
  });

  it('ne change pas au cours du même créneau : rouvrir l’app ne fait pas défiler les bonjours', () => {
    // Deux ouvertures dans la même matinée, à deux heures différentes du même créneau.
    expect(salutation('Kévin', le(9, 7))).toBe(salutation('Kévin', le(9, 10)));
  });

  // ⚠️ CE TEST A CHANGÉ DE SENS LE 2026-08-25, et les deux versions valent d'être
  // sues. Il a d'abord exigé que matin et soir diffèrent le MÊME jour — faux par
  // construction, les listes partageaient « Salut » et « Coucou ». Il a ensuite
  // exigé qu'un CYCLE finisse par se voir. La rotation par jour ayant été retirée
  // (décision fondateur), ce qui doit être vrai est l'inverse du cycle : à heure
  // égale, le mot ne bouge plus jamais.
  it('ne tourne plus d’un jour à l’autre : 28 jours à la même heure donnent le même mot', () => {
    for (const heure of [9, 15, 21]) {
      const vus = new Set(Array.from({ length: 28 }, (_, i) => salutation('Kévin', le(i + 1, heure))));
      expect(vus.size, `heure ${heure}`).toBe(1);
    }
  });

  it('le créneau est le SEUL axe : le jour dit Bonjour, le soir dit Bonsoir', () => {
    for (let j = 1; j <= 7; j++) {
      expect(salutation('Kévin', le(j, 9))).toBe('Bonjour Kévin');
      expect(salutation('Kévin', le(j, 15))).toBe('Bonjour Kévin');
      expect(salutation('Kévin', le(j, 21))).toBe('Bonsoir Kévin');
    }
  });

  it('reste courte — au-delà, l’en-tête passe à la ligne en changeant de créneau', () => {
    for (const moment of MOMENTS) {
      expect(SALUTATIONS[moment].length).toBeLessThanOrEqual(SALUTATION_MAX);
    }
  });

  it('tient sur une date antérieure à 1970', () => {
    // Il n'y a plus d'index de jour à faire déborder, mais l'entrée reste gratuite
    // à garder : c'est elle qui rougirait si un cycle revenait sans sa garde.
    const vieux = new Date(1963, 4, 12, 9, 0, 0, 0);
    const s = salutation('Kévin', vieux);
    expect(s).not.toContain('undefined');
    expect(s.startsWith(SALUTATIONS.matin)).toBe(true);
  });

  it('ne sert que des mots de la table — aucune salutation écrite en dur dans la fonction', () => {
    const tous = new Set(Object.values(SALUTATIONS));
    for (let j = 1; j <= 40; j++) {
      for (let h = 0; h < 24; h++) {
        expect(tous.has(salutation('', le(j, h)))).toBe(true);
      }
    }
  });
});
