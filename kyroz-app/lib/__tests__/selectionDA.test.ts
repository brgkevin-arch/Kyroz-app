// 🔴 UNE SEULE DA DE SÉLECTION (décision fondateur, 2026-10-25) : quand on répond à une
// question, c'est la carte et son rond coché (`ui.tsx::OptionCard`, servie par
// `GrilleChoix` et `Choix`). Trois formes cohabitaient — cases pleines, cartes, pastilles —
// et un segmenté de plus, pour la même question « laquelle ? ».
//
// Ce test compte les deux autres formes là où elles restent, et chaque reste a sa raison :
// · `Segmented` change de VUE (un onglet), il ne répond pas à une question ;
// · `Chip` sert d'étiquette qu'on retire (✕), de suggestion qu'on ajoute, ou d'unité
//   collée à un champ de quantité.
// Exceptions décidées avec le fondateur : la rangée des jours (`RangeeJours`) et les
// filtres des Recettes. Toute nouvelle sélection doit passer par `GrilleChoix` / `Choix`.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = join(__dirname, '..', '..');

function fichiers(dir: string, acc: string[] = []): string[] {
  for (const n of readdirSync(join(RACINE, dir))) {
    const rel = join(dir, n);
    if (statSync(join(RACINE, rel)).isDirectory()) fichiers(rel, acc);
    else if (/\.tsx$/.test(n)) acc.push(relative('.', rel));
  }
  return acc;
}
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const qui = (motif: RegExp) =>
  [...fichiers('app'), ...fichiers('components')]
    .filter((f) => motif.test(sansCommentaires(readFileSync(join(RACINE, f), 'utf8'))))
    .sort();

describe('une seule DA de sélection', () => {
  it('le segmenté ne reste que là où il change de VUE', () => {
    expect(qui(/<Segmented\b/)).toEqual([
      'app/(tabs)/recettes.tsx', // Réalisable / Catalogue
      'app/(tabs)/reserve.tsx', // frais / sec
      'components/FixedMealSheet.tsx', // chercher un aliment / saisir mon repas
      'components/OffPlanSheet.tsx', // chercher un aliment / estimer vite
    ]);
  });

  it('la pastille ne reste que pour des étiquettes, des suggestions ou des unités', () => {
    expect(qui(/<Chip\b/)).toEqual([
      'app/(tabs)/courses.tsx', // unité collée au champ de quantité
      'app/(tabs)/reserve.tsx', // unité collée au champ de quantité
      'app/profil.tsx', // recettes masquées (✕) ; banque de calories, éteinte
      'components/DislikedFoodsField.tsx', // aliments évités (✕) et suggestions
    ]);
  });

  it('la grille de choix rend la carte au rond coché, pas une case pleine', () => {
    const ui = sansCommentaires(readFileSync(join(RACINE, 'components/ui.tsx'), 'utf8'));
    const grille = ui.slice(ui.indexOf('export function GrilleChoix'), ui.indexOf('export function Choix'));
    expect(grille).toContain('<OptionCard');
    expect(ui).not.toMatch(/function CaseChoix/);
  });
});
