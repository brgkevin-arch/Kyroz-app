// ── Les décisions de la roulette de date ────────────────────────────────────
//
// Une roulette est un GESTE : son ressenti se juge au simulateur, jamais dans le
// panneau navigateur (CLAUDE.md §5). Tout ce qui peut être DÉCIDÉ hors du geste
// vit donc dans `lib/wheelDate.ts` et se teste ici — ce qu'une colonne contient,
// ce que devient le 31 quand on passe en février, et où la roulette s'ouvre.

import { describe, expect, it } from 'vitest';
import {
  MOIS_FR, joursDansMois, anneesPossibles, clampJour, decouper, ancrage, assembler, libelleDate,
} from '../wheelDate';
import { BIRTH_YEAR_MIN, isRealDate } from '../birthday';
import { MIN_AGE } from '../safety';

describe('roulette de date — les colonnes', () => {
  it('les douze mois sont là, dans l\'ordre', () => {
    expect(MOIS_FR).toHaveLength(12);
    expect(MOIS_FR[0]).toBe('janvier');
    expect(MOIS_FR[11]).toBe('décembre');
  });

  it('le nombre de jours suit le mois, années bissextiles comprises', () => {
    expect(joursDansMois(2026, 1)).toBe(31);
    expect(joursDansMois(2026, 4)).toBe(30);
    expect(joursDansMois(2026, 2)).toBe(28);
    expect(joursDansMois(2024, 2)).toBe(29);  // bissextile
    expect(joursDansMois(2000, 2)).toBe(29);  // divisible par 400 → bissextile
    expect(joursDansMois(1900, 2)).toBe(28);  // divisible par 100 mais pas 400 → non
  });

  it('les années vont de la plus récente à la plus ancienne', () => {
    const a = anneesPossibles(2026);
    expect(a[0]).toBe(2026);
    expect(a[a.length - 1]).toBe(BIRTH_YEAR_MIN);
  });

  // 🔴 LE TEST QUI COMPTE VRAIMENT. Le geste évident — n'offrir que les années
  // donnant MIN_AGE ou plus — rendrait le hard block mineur INATTEIGNABLE depuis
  // ce champ. Plus personne ne pourrait déclarer son âge réel, donc plus personne
  // ne serait refusé, et `checkEligibility::MINOR` resterait vert en ne gardant
  // plus rien. C'est le défaut « un garde-fou que le chemin réel ne traverse
  // jamais » (CLAUDE.md §8), appliqué à une porte d'entrée.
  it('🔴 un mineur PEUT saisir sa vraie date — sinon le refus ne peut plus tomber', () => {
    const a = anneesPossibles(2026);
    for (const ageTeste of [0, 5, 12, MIN_AGE - 1]) {
      expect(
        a.includes(2026 - ageTeste),
        `l'année d'un enfant de ${ageTeste} ans est absente de la roulette : il ne peut plus être refusé, il est juste bloqué sans explication`,
      ).toBe(true);
    }
  });
});

describe('roulette de date — changer de mois ne produit jamais une date fausse', () => {
  it('le 31 janvier devient le 28 février, et le 29 les années bissextiles', () => {
    expect(clampJour(31, 2026, 2)).toBe(28);
    expect(clampJour(31, 2024, 2)).toBe(29);
    expect(clampJour(31, 2026, 4)).toBe(30);
    expect(clampJour(15, 2026, 2)).toBe(15); // rien à ramener
  });

  it('toute combinaison de la roulette produit une date qui EXISTE', () => {
    // Le balayage complet : 12 mois × le dernier jour possible × quelques années
    // dont une bissextile et une séculaire non bissextile.
    for (const a of [1900, 1999, 2000, 2024, 2026]) {
      for (let m = 1; m <= 12; m++) {
        for (const j of [1, 28, 29, 30, 31]) {
          const stamp = assembler({ j, m, a });
          const p = decouper(stamp)!;
          expect(isRealDate(p.a, p.m, p.j), `${stamp} n'existe pas`).toBe(true);
        }
      }
    }
  });
});

describe("roulette de date — l'ancrage n'est PAS une valeur", () => {
  // ⚠️ Ce test ne dit pas que 30 ans est le bon chiffre — il dit que l'ancrage
  // tombe dans la cible déclarée de Kyroz (18–50 ans). Ouvrir la roulette sur
  // 1900 ferait défiler cent ans à qui n'a rien demandé.
  it('la roulette s\'ouvre dans la cible de Kyroz, pas sur la borne', () => {
    const { a } = ancrage(2026);
    expect(2026 - a).toBeGreaterThanOrEqual(18);
    expect(2026 - a).toBeLessThanOrEqual(50);
    expect(a).not.toBe(BIRTH_YEAR_MIN);
  });

  it('l\'ancrage est une date réelle, comme tout ce que la roulette rend', () => {
    const p = ancrage(2026);
    expect(isRealDate(p.a, p.m, p.j)).toBe(true);
  });
});

describe('roulette de date — lecture', () => {
  it('la date se lit en toutes lettres sur la ligne du formulaire', () => {
    expect(libelleDate('1994-08-02')).toBe('2 août 1994');
    expect(libelleDate('2000-01-31')).toBe('31 janvier 2000');
  });

  it('un stamp illisible ne rend rien plutôt qu\'un « NaN undefined »', () => {
    expect(libelleDate('bidon')).toBe('');
    expect(decouper(undefined)).toBeNull();
  });
});
