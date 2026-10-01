import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Une même question se pose de la même façon à l'inscription et au Profil (2026-09-30).
// Avant : une ligne de sept cases d'un côté, des pastilles sur deux lignes de l'autre ;
// une grille pour le régime ici, des pastilles là ; la taille à la roulette d'un côté,
// au clavier de l'autre.
const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const profil = sansCommentaires(lire('app/(tabs)/profil.tsx'));
const inscription = sansCommentaires(lire('app/(auth)/onboarding.tsx'));
const reglages = sansCommentaires(lire('components/ReglagesSheet.tsx'));

describe('les jours de la semaine : une ligne de sept cases, partout', () => {
  it('une seule rangée, partagée', () => {
    expect(inscription).not.toMatch(/function RangeeJours/);
    for (const src of [inscription, profil, reglages]) expect(src).toMatch(/from '(\.\.\/)+components\/RangeeJours'|from '\.\/RangeeJours'/);
  });
  it('jours du plan, jours de repos et jour de pesée passent par elle', () => {
    expect(profil).toMatch(/<RangeeJours t=\{t\} choisis=\{weekdays\}/);
    expect(profil).toMatch(/<RangeeJours t=\{t\} choisis=\{value\}/);
    expect(reglages).toMatch(/<RangeeJours t=\{t\} choisis=\{\[weighInDay\]\}/);
  });
  it('plus aucune pastille de jour au Profil ni aux Réglages', () => {
    expect(profil).not.toMatch(/WEEKDAY_OPTS\.map\(\(d\) => <Chip/);
    expect(profil).not.toMatch(/opts\.map\(\(d\) => <Chip/);
    expect(reglages).not.toMatch(/JOURS_PESEE\.map/);
  });
});

describe('les préférences : la même grille qu’à l’inscription', () => {
  it('régime, protéines et goûts en grille', () => {
    expect(profil).toMatch(/<GrilleChoix\s+t=\{t\} options=\{RESTRICTIONS\}/);
    expect(profil).toMatch(/<ProteinesParRegime[\s\S]{0,200}?grille/);
    expect((profil.match(/options=\{GOUT_TRANCHES\}/g) ?? []).length).toBe(2);
  });
});

describe('la taille : à la roulette, comme à l’inscription', () => {
  it('plus de saisie au clavier', () => {
    expect(profil).toMatch(/<MesureField t=\{t\} mesure="taille"/);
    expect(profil).not.toMatch(/label="Taille" suffix="cm"/);
  });
});

describe('la note sous la cible dit la vraie cause', () => {
  it('quand tous les repas du jour sont passés, elle ne parle plus des portions', () => {
    const plan = sansCommentaires(lire('app/(tabs)/plan.tsx'));
    expect(plan).toMatch(/repasAVenir > 0\s*\?\s*'les portions de tes repas ne peuvent pas monter plus haut\.'/);
    expect(plan).toMatch(/tes repas du jour sont passés, il n\\'y a plus rien à ajuster\./);
    expect(plan).toMatch(/repasAVenir=\{\(plan\?\.meals \?\? \[\]\)\.filter\(\(m\) => m\.day === selectedDay && !m\.status\)\.length\}/);
  });
});
