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
//  · elle doit être DÉTERMINISTE dans la journée : rouvrir l'app trois fois dans
//    la matinée ne doit pas faire défiler les bonjours sous les yeux.

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

  // ⚠️ CE TEST A EU UNE PREMIÈRE VERSION FAUSSE, et elle est instructive : elle
  // exigeait que matin et soir diffèrent le MÊME jour. C'est faux par
  // construction — les trois listes partagent « Salut » et « Coucou », donc un
  // jour sur trois les deux créneaux tombent légitimement sur le même mot. Ce qui
  // doit être vrai, c'est que le créneau CHANGE bien quelque chose au fil du
  // cycle, et que chacun garde son mot propre.
  it('le créneau change le mot au fil du cycle, et chacun garde le sien', () => {
    const jours = [1, 2, 3, 4, 5, 6, 7];
    const matins = jours.map((j) => salutation('Kévin', le(j, 9)));
    const soirs = jours.map((j) => salutation('Kévin', le(j, 21)));
    expect(matins.some((m, i) => m !== soirs[i])).toBe(true);
    expect(matins).toContain('Bonjour Kévin');
    expect(soirs).toContain('Bonsoir Kévin');
    expect(matins).not.toContain('Bonsoir Kévin');
    expect(soirs).not.toContain('Bonjour Kévin');
  });

  it('épuise sa liste avant de se répéter, sur un même créneau', () => {
    for (const [moment, heure] of [['matin', 9], ['apresmidi', 15], ['soir', 21]] as const) {
      const taille = SALUTATIONS[moment].length;
      const vus = new Set<string>();
      for (let j = 1; j <= taille; j++) vus.add(salutation('Kévin', le(j, heure)));
      expect(vus.size).toBe(taille);
    }
  });

  it('reste courte — au-delà, l’en-tête passe à la ligne un jour sur trois', () => {
    for (const moment of MOMENTS) {
      for (const mot of SALUTATIONS[moment]) {
        expect(mot.length).toBeLessThanOrEqual(SALUTATION_MAX);
      }
    }
  });

  it('ne sort jamais du tableau, même sur une date antérieure à 1970', () => {
    // `%` garde le signe en JS : sans la garde, l'index négatif rendrait `undefined`.
    const vieux = new Date(1963, 4, 12, 9, 0, 0, 0);
    const s = salutation('Kévin', vieux);
    expect(s).not.toContain('undefined');
    expect(SALUTATIONS.matin.some((m) => s.startsWith(m))).toBe(true);
  });

  it('ne sert que des mots de la table — aucune salutation écrite en dur dans la fonction', () => {
    const tous = new Set(MOMENTS.flatMap((m) => SALUTATIONS[m]));
    for (let j = 1; j <= 40; j++) {
      for (let h = 0; h < 24; h++) {
        expect(tous.has(salutation('', le(j, h)))).toBe(true);
      }
    }
  });
});
