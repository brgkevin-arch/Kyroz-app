import { describe, it, expect } from 'vitest';
import { articlesDeLaSuivante, cochesPourLaSemaine } from '../listesSemaines';
import { unitesPour } from '../units';

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

// L'écran, tel que le fondateur l'a dessiné le 2026-10-28 : la page des listes d'abord.
describe('l’onglet Courses s’ouvre sur ses listes', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src: string = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../app/(tabs)/courses.tsx'), 'utf8');
  it('la page principale est celle des listes, l’historique montre 3 sorties puis « Voir plus »', () => {
    expect(src).toMatch(/useState<'listes' \| 'courante' \| 'suivante'>\('listes'\)/);
    expect(src).toMatch(/<ShoppingHistory t=\{t\} trips=\{history\} onRemove=\{retirerSortie\} limite=\{3\} \/>/);
  });
  it('une liste ouverte finit sur « Courses terminées », à la couleur choisie', () => {
    expect(src).toMatch(/ListFooterComponent=\{total > 0 \? \([\s\S]{0,200}backgroundColor: t\.accent/);
  });
});

describe('l’onglet Courses s’ouvre sur la liste de la semaine tant qu’elle n’est pas validée', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src: string = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../app/(tabs)/courses.tsx'), 'utf8');
  it('pas validée → la liste ; validée → la page des listes', () => {
    expect(src).toMatch(/const ouvrirLaSemaine = !validee &&/);
    expect(src).toMatch(/setVue\(\(v\) => \(ouvrirLaSemaine \? 'courante' :/);
  });
  it('la liste d’après a son « + » : ses ajouts la suivent et passent en grand avec elle', () => {
    expect(src).toMatch(/if \(vue === 'suivante' && suivante\) \{\s*const la = trouverArticle\(suivante\.items, propre\)/);
    expect(src).toMatch(/ajouts: l\.items\.filter\(\(i\) => i\.manuel\)/);
  });
});

describe('une liste n’entre à l’historique que finie (segment 10, constat 7)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src: string = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../app/(tabs)/courses.tsx'), 'utf8');
  it('gardés pour la prochaine fois, les non-pris laissent la liste ouverte', () => {
    expect(src).toMatch(/if \(restants\.length === 0 \|\| sort === 'retirer'\) \{\s*await recordTrip\(/);
    expect(src).toMatch(/if \(suivante\.items\.every\(\(i\) => i\.checked\)\) await recordTrip\(/);
  });
});

describe('les unités suivent l’aliment (segment 10, constat 6)', () => {
  it('pas de « ml » ni de « pièce » pour du riz ; « pièce » pour ce qui se compte', () => {
    expect(unitesPour('Riz complet', 'g')).toEqual(['g', 'kg']);
    expect(unitesPour('Lait demi-écrémé', 'ml')).toEqual(['ml', 'L']);
    expect(unitesPour('Tomate', 'g')).toContain('pièce');
    expect(unitesPour('Café', undefined)).toEqual(['g', 'kg', 'ml', 'pièce']);
  });
});
