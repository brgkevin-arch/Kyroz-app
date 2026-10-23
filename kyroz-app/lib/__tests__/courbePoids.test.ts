import { describe, it, expect } from 'vitest';
import {
  courbe, fenetre, libelleFenetre, peutReculer, graduer, seuilTrou, ajouterMois,
  ECART_AXE_MIN_KG, Pesee,
} from '../courbePoids';

// ── La courbe du poids, par période (onglet Poids, 2026-10-21) ────────────────
//
// Ce qui est figé ici, ce sont les trois règles de `lib/courbePoids.ts` : un
// pointillé veut dire « pas de pesée », un point moyen se dit, et l'axe ne grossit
// jamais une oscillation de quelques centaines de grammes en falaise.

const AUJ = '2026-10-21';
const hebdo = (debut: string, n: number, kg0: number, pas = 0): Pesee[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.parse(debut + 'T00:00:00Z') + i * 7 * 86_400_000);
    return { date: d.toISOString().slice(0, 10), weight_kg: Math.round((kg0 + i * pas) * 10) / 10 };
  });

describe('Les fenêtres', () => {
  it('Mois, 3 mois, 6 mois glissent et finissent aujourd’hui', () => {
    expect(fenetre('mois', 0, AUJ, null)).toEqual({ debut: '2026-09-22', fin: AUJ });
    expect(fenetre('trimestre', 0, AUJ, null)).toEqual({ debut: '2026-07-22', fin: AUJ });
    expect(fenetre('semestre', 0, AUJ, null)).toEqual({ debut: '2026-04-22', fin: AUJ });
  });

  it('reculer d’un cran décale d’une période entière, sans trou ni chevauchement', () => {
    const f0 = fenetre('trimestre', 0, AUJ, null);
    const f1 = fenetre('trimestre', 1, AUJ, null);
    expect(f1.fin).toBe('2026-07-21');
    expect(f1.debut).toBe('2026-04-22');
    // Le lendemain de la fin de f1 est le début de f0.
    expect(new Date(Date.parse(f1.fin + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)).toBe(f0.debut);
  });

  it('l’Année est calée sur les mois : ses points sont des moyennes mensuelles', () => {
    expect(fenetre('annee', 0, AUJ, null)).toEqual({ debut: '2025-11-01', fin: AUJ });
    expect(fenetre('annee', 1, AUJ, null)).toEqual({ debut: '2024-11-01', fin: '2025-10-31' });
  });

  it('Tout part de la première pesée, et du 1er de son mois quand les points sont mensuels', () => {
    expect(fenetre('tout', 0, AUJ, '2026-09-01')).toEqual({ debut: '2026-09-01', fin: AUJ });
    expect(fenetre('tout', 0, AUJ, '2025-03-17')).toEqual({ debut: '2025-03-01', fin: AUJ });
    expect(fenetre('tout', 0, AUJ, null)).toEqual({ debut: AUJ, fin: AUJ });
  });

  it('le 31 qui recule d’un mois tombe sur le dernier jour du mois visé', () => {
    expect(ajouterMois('2026-03-31', -1)).toBe('2026-02-28');
    expect(ajouterMois('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('‹ n’est proposé que s’il reste des pesées plus anciennes — et jamais sur « Tout »', () => {
    const p = hebdo('2026-06-01', 3, 80);
    expect(peutReculer('mois', '2026-09-22', p)).toBe(true);
    expect(peutReculer('mois', '2026-05-01', p)).toBe(false);
    expect(peutReculer('tout', '2026-09-22', p)).toBe(false);
  });

  it('le libellé est en français, avec « 1er » et l’année une seule fois quand elle ne change pas', () => {
    expect(libelleFenetre({ debut: '2026-09-22', fin: AUJ })).toBe('22 sept. – 21 oct. 2026');
    expect(libelleFenetre({ debut: '2025-11-01', fin: AUJ })).toBe('1er nov. 2025 – 21 oct. 2026');
  });
});

describe('Règle 1 — un pointillé veut dire « pas de pesée entre ces deux points »', () => {
  it('une pesée par semaine : trait plein partout', () => {
    const c = courbe(hebdo('2026-07-28', 13, 85, -0.2), 'trimestre', 0, AUJ, 7);
    expect(c.segments.length).toBeGreaterThan(0);
    expect(c.segments.every((s) => !s.pointille)).toBe(true);
  });

  it('une semaine sautée reste pleine, un mois sans pesée devient pointillé', () => {
    const p: Pesee[] = [
      { date: '2026-08-01', weight_kg: 85 },
      { date: '2026-08-15', weight_kg: 84.6 }, // 14 j : une semaine manquée, pas un trou
      { date: '2026-09-20', weight_kg: 84 },   // 36 j : un trou
    ];
    const c = courbe(p, 'trimestre', 0, AUJ, 7);
    expect(c.segments.map((s) => s.pointille)).toEqual([false, true]);
  });

  it('le seuil suit la cadence choisie : toutes les 4 semaines n’est pas un trou', () => {
    expect(seuilTrou(7)).toBe(14);
    expect(seuilTrou(28)).toBe(42);
    const p = hebdo('2026-07-28', 4, 85).filter((_, i) => i % 1 === 0).map((e, i) => ({
      ...e, date: new Date(Date.parse('2026-07-28T00:00:00Z') + i * 28 * 86_400_000).toISOString().slice(0, 10),
    }));
    const c = courbe(p, 'trimestre', 0, AUJ, 28);
    expect(c.segments.every((s) => !s.pointille)).toBe(true);
    // La même série lue avec une cadence hebdomadaire est pleine de trous.
    expect(courbe(p, 'trimestre', 0, AUJ, 7).segments.every((s) => s.pointille)).toBe(true);
  });

  it('le trait entre par le bord quand une pesée précède la fenêtre — en pointillés après un trou', () => {
    const p: Pesee[] = [
      { date: '2026-06-01', weight_kg: 88 },
      { date: '2026-10-01', weight_kg: 84 },
      { date: '2026-10-15', weight_kg: 83.6 },
    ];
    const c = courbe(p, 'mois', 0, AUJ, 7);
    expect(c.segments[0].x1).toBe(0);
    expect(c.segments[0].pointille).toBe(true);
    expect(c.points).toHaveLength(2);
    // Le bord vaut la valeur INTERPOLÉE au premier jour de la fenêtre, pas la vieille pesée.
    expect(c.segments[0].kg1).toBeGreaterThan(84);
    expect(c.segments[0].kg1).toBeLessThan(88);
  });

  it('une fenêtre passée reçoit aussi le trait qui sort par la droite', () => {
    const p = hebdo('2026-05-01', 20, 86, -0.1);
    const c = courbe(p, 'mois', 2, AUJ, 7);
    const dernier = c.segments[c.segments.length - 1];
    expect(dernier.x2).toBe(1);
  });
});

describe('Règle 2 — un point moyen se dit', () => {
  it('jusqu’à 6 mois, chaque point est une pesée', () => {
    const c = courbe(hebdo('2026-05-01', 25, 86, -0.1), 'semestre', 0, AUJ, 7);
    expect(c.agregation).toBe('pesee');
    expect(c.points.every((p) => p.n === 1)).toBe(true);
  });

  it('sur un an, un point par mois — la moyenne de ses pesées', () => {
    const p: Pesee[] = [
      { date: '2026-03-03', weight_kg: 86 },
      { date: '2026-03-17', weight_kg: 85 },
      { date: '2026-04-10', weight_kg: 84 },
    ];
    const c = courbe(p, 'annee', 0, AUJ, 7);
    expect(c.agregation).toBe('mois');
    expect(c.points.map((x) => [x.date, x.kg, x.n])).toEqual([['2026-03', 85.5, 2], ['2026-04', 84, 1]]);
    expect(c.reperes.map((r) => r.libelle).join('')).toBe('NDJFMAMJJASO');
  });

  it('un mois entier sans pesée coupe le trait en pointillés', () => {
    const p: Pesee[] = [
      ...hebdo('2026-02-02', 8, 86, -0.1), // février et mars, chaque semaine
      { date: '2026-06-10', weight_kg: 84 }, // puis plus rien jusqu'en juin
    ];
    const c = courbe(p, 'annee', 0, AUJ, 7);
    expect(c.segments.map((s) => s.pointille)).toEqual([false, true]);
  });

  it('🔴 deux mois « remplis » d’une pesée chacune, à huit semaines d’écart : pointillés', () => {
    // Vu à l'écran le 2026-10-21 : une pesée le 1er décembre, la suivante le 26
    // janvier — deux mois consécutifs, donc un trait PLEIN sous l'ancienne règle.
    const p: Pesee[] = [
      { date: '2025-12-01', weight_kg: 85.5 },
      { date: '2026-01-26', weight_kg: 85.4 },
    ];
    const c = courbe(p, 'annee', 0, AUJ, 7);
    expect(c.segments.map((s) => s.pointille)).toEqual([true]);
  });

  it('l’écart se lit sur les PESÉES, pas sur les moyennes', () => {
    const p: Pesee[] = [
      { date: '2026-03-01', weight_kg: 90 },
      { date: '2026-03-30', weight_kg: 86 },
      { date: '2026-10-20', weight_kg: 83.4 },
    ];
    expect(courbe(p, 'annee', 0, AUJ, 7).ecartKg).toBe(-6.6);
  });
});

describe('Règle 3 — l’axe ne fait pas d’une oscillation une falaise', () => {
  it('300 g de variation tiennent dans un axe d’au moins 2 kg', () => {
    const g = graduer([82.1, 82.4]);
    expect(g.max - g.min).toBeGreaterThanOrEqual(ECART_AXE_MIN_KG);
  });

  it('les graduations sont rondes, et six au plus', () => {
    const g = graduer([80.3, 88.9]);
    expect(g.graduations).toEqual([80, 82, 84, 86, 88, 90]);
    expect(graduer([60, 120]).graduations.length).toBeLessThanOrEqual(6);
  });

  it('tous les points tiennent entre les bornes de l’axe', () => {
    const c = courbe(hebdo('2026-04-01', 30, 92, -0.35), 'semestre', 0, AUJ, 7);
    for (const p of c.points) {
      expect(p.kg).toBeGreaterThanOrEqual(c.min);
      expect(p.kg).toBeLessThanOrEqual(c.max);
    }
  });
});

describe('Les cas limites', () => {
  it('aucune pesée : ni point ni trait, et pas d’écart inventé', () => {
    const c = courbe([], 'mois', 0, AUJ, 7);
    expect(c.points).toEqual([]);
    expect(c.segments).toEqual([]);
    expect(c.ecartKg).toBeNull();
  });

  it('une seule pesée : un point, pas d’écart', () => {
    const c = courbe([{ date: '2026-10-20', weight_kg: 83 }], 'mois', 0, AUJ, 7);
    expect(c.points).toHaveLength(1);
    expect(c.ecartKg).toBeNull();
  });

  it('les points restent dans la fenêtre (0 ≤ x ≤ 1)', () => {
    for (const per of ['mois', 'trimestre', 'semestre', 'annee', 'tout'] as const) {
      const c = courbe(hebdo('2025-01-06', 95, 90, -0.08), per, 0, AUJ, 7);
      for (const p of c.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
      }
    }
  });

  it('les repères du mois partent d’aujourd’hui, de semaine en semaine', () => {
    const c = courbe([], 'mois', 0, AUJ, 7);
    expect(c.reperes.map((r) => r.libelle)).toEqual(['23 sept.', '30 sept.', '7 oct.', '14 oct.', '21 oct.']);
  });
});
