import { describe, it, expect } from 'vitest';
import { articlesDeLaSuivante, cochesPourLaSemaine } from '../listesSemaines';

// UNE LISTE PAR SEMAINE (segment 10, constat 1, décision fondateur du 2026-10-28).
describe('la liste de la semaine d’après', () => {
  const lesDeux = [
    { name: 'Blanc de poulet', quantity: 600, unit: 'g' },
    { name: 'Riz complet', quantity: 300, unit: 'g' },
    { name: 'Avocat', quantity: 2, unit: 'pièce' },
  ];
  const enCours = [
    { name: 'Blanc de poulet', quantity: 200, unit: 'g' },
    { name: 'Avocat', quantity: 2, unit: 'pièce' },
  ];

  it('ne reprend que ce que la semaine en cours ne prend pas : la réserve n’est comptée qu’une fois', () => {
    expect(articlesDeLaSuivante(lesDeux, enCours)).toEqual([
      { name: 'Blanc de poulet', quantity: 400, unit: 'g' },
      { name: 'Riz complet', quantity: 300, unit: 'g' },
    ]);
  });

  it('un article que la semaine en cours prend en entier n’y figure pas', () => {
    expect(articlesDeLaSuivante(lesDeux, enCours).map((i) => i.name)).not.toContain('Avocat');
  });

  it('les cases cochées suivent leur semaine, jamais une autre', () => {
    const coches = { semaine: '2026-11-02', noms: ['Riz complet'] };
    expect([...cochesPourLaSemaine(coches, '2026-11-02')]).toEqual(['riz complet']);
    expect(cochesPourLaSemaine(coches, '2026-11-09').size).toBe(0);
    expect(cochesPourLaSemaine(null, '2026-11-02').size).toBe(0);
  });
});
