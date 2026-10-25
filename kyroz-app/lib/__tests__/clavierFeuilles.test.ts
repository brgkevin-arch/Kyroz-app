// ── VERROU : une feuille ne finit jamais sous le clavier ─────────────────────
//
// POURQUOI CE FICHIER EXISTE
//
// Signalé par le fondateur le 2026-10-23 (vidéo, iPhone) : Courses → « + » →
// « Ajouter un article ». Le clavier recouvrait la quantité et le bouton : bloqué.
// `ActionSheet` et `Sheet` n'avaient AUCUNE gestion du clavier ; `clavierSaisie.test.ts`
// ne surveillait que les `ScrollView`, donc ni une feuille sans défilement, ni le
// bouton posé SOUS un défilement (les six éditeurs du Profil, l'inscription).
//
// Le correctif vit dans le CONTENEUR (components/Clavier.ts). Ce test compte qu'il y
// est, et qu'une nouvelle `Modal` qui porte une saisie ne peut pas naître sans lui.
// Il ne lance pas de simulateur : la preuve visuelle reste le simulateur, clavier
// logiciel affiché (le web n'a pas de clavier qui recouvre la page).

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');

function fichiers(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(join(RACINE, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) fichiers(rel, acc);
    else if (e.name.endsWith('.tsx')) acc.push(rel);
  }
  return acc;
}

/** Le code sans ses commentaires : une note qui CITE le hook ne le branche pas. */
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// On exige l'APPEL, pas l'import — même leçon que `clavierSaisie` : un garde-fou
// que la ligne d'import satisfait mesure qu'on y a pensé, pas qu'on l'a branché.
const APPEL = /=\s*useHauteurClavier\(\)/;

/** `Modal` sans aucune saisie, donc sans clavier — la raison est re-vérifiée plus bas. */
const SANS_SAISIE = [
  'components/BirthdayCelebration.tsx',
  'components/FirstPlanReveal.tsx',
  'components/GuidedTour.tsx',
];
const SAISIE = /<TextInput|<Field\b|<ReminderTimeField|<DateInput/;

describe('les feuilles se posent au-dessus du clavier', () => {
  it('ActionSheet lit le clavier ET l’applique sous la feuille', () => {
    const src = sansCommentaires(lire('components/ActionSheet.tsx'));
    expect(src).toMatch(APPEL);
    expect(src).toMatch(/paddingBottom:\s*remontee/);
    // Le cas mesuré sur la Réserve : remonter sans borne sort le champ de l'écran.
    expect(src).toMatch(/Math\.min\(clavier,/);
  });

  it('Sheet lit le clavier, rétrécit son contenu, et coupe l’inset natif de l’enfant', () => {
    const src = sansCommentaires(lire('components/Sheet.tsx'));
    expect(src).toMatch(APPEL);
    expect(src).toMatch(/clavier > 0 && \{ paddingBottom:/);
    expect(src).toMatch(/automaticallyAdjustKeyboardInsets:\s*false/);
    expect(src).toMatch(/rendreSaisieVisible\(defilement\.current\)/);
  });

  // Sans ça, le `false` injecté par la feuille est écrasé par le `true` de
  // `clavierScrollProps`, et le clavier est compté deux fois.
  it('tout enfant de Sheet étale sheetScrollProps APRÈS clavierScrollProps', () => {
    const fautifs: string[] = [];
    for (const f of [...fichiers('app'), ...fichiers('components')]) {
      const src = sansCommentaires(lire(f));
      const c = src.indexOf('{...clavierScrollProps}');
      const sh = src.indexOf('{...(sheetScrollProps');
      if (c >= 0 && sh >= 0 && sh < c) fautifs.push(f);
    }
    expect(fautifs).toEqual([]);
  });

  it('toute Modal qui porte une saisie suit le clavier', () => {
    const candidats = [...fichiers('app'), ...fichiers('components')]
      .filter((f) => /<Modal\b/.test(sansCommentaires(lire(f))));
    expect(candidats.length).toBeGreaterThan(3);   // la sonde sait dire OUI
    for (const f of candidats) {
      if (SANS_SAISIE.includes(f)) continue;
      expect(APPEL.test(sansCommentaires(lire(f))), `${f} : une Modal sans useHauteurClavier()`).toBe(true);
    }
  });

  it('aucune dispense ne survit à sa cause', () => {
    for (const f of SANS_SAISIE) {
      expect(SAISIE.test(lire(f)), `${f} porte désormais une saisie — retirer sa dispense`).toBe(false);
    }
  });

  // L'inscription pose « Continuer » SOUS son défilement : même défaut, écran plein.
  it("l'inscription s'arrête au-dessus du clavier", () => {
    const src = sansCommentaires(lire('app/(auth)/onboarding.tsx'));
    expect(src).toMatch(APPEL);
    expect(src).toMatch(/automaticallyAdjustKeyboardInsets=\{false\}/);
  });
});
