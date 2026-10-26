import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bodyFatBounds } from '../safety';
import {
  pourcentsGras, departGras, decouperGras, assemblerGras, libelleGras,
} from '../roulettesMesure';

// Segment 2 de la reprise A→Z (questionnaire « toi » : prénom, genre, naissance, poids,
// taille, silhouette) — arbitrages du fondateur du 2026-10-26, P1 à P9.
// Cf. docs/2026-10-19-reprise-parcours-A-a-Z.md, section « Segment 2 ».

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lire = (f: string) => sansCommentaires(readFileSync(join(RACINE, f), 'utf8'));

const ONBOARDING = lire('app/(auth)/onboarding.tsx');
const PICKER = lire('components/BodyFatPicker.tsx');

describe('segment 2 — page du prénom', () => {
  const champ = ONBOARDING.match(/<Field t=\{t\} label="Ton prénom"[^>]*\/>/)?.[0] ?? '';

  it('la sonde trouve le champ', () => {
    expect(champ).not.toBe('');
  });

  it('P1 — le clavier ne s\'ouvre pas d\'office (le titre restait caché)', () => {
    expect(champ).not.toMatch(/autoFocus/);
  });

  it('P2 — « Ton prénom » une seule fois : pas de placeholder', () => {
    expect(champ).not.toMatch(/placeholder=/);
  });

  it('P2 — un champ vide n\'écrit pas sa consigne en gras', () => {
    const ui = lire('components/ui.tsx');
    expect(ui).toContain('...(props.value ? Type.h3 : Type.ligne)');
    expect(lire('components/MesureField.tsx')).toContain('...(affiche ? Type.h3 : Type.ligne)');
    expect(lire('components/BirthDateField.tsx')).toContain('...(value ? Type.h3 : Type.ligne)');
  });
});

describe('segment 2 — compteur et genre', () => {
  it('P3 — la barre ne compte pas la page du prénom (même compte que « ÉTAPE n / 8 »)', () => {
    expect(ONBOARDING).toContain('pct={((step - 1) / (TOTAL_STEPS - 1)) * 100}');
    expect(ONBOARDING).toContain('ÉTAPE {step - 1} / {TOTAL_STEPS - 1}');
  });

  it('P4 — les deux cartes portent l\'intitulé « Genre », le mot du Profil', () => {
    expect(ONBOARDING).toMatch(/<Intitule t=\{t\}>Genre<\/Intitule>\s*<Choix/);
    expect(lire('app/profil.tsx')).toContain("sexe: 'Genre'");
  });
});

describe('segment 2 — roulettes', () => {
  it('P5 — elles s\'ouvrent dans une feuille à leur hauteur, jamais à 94 %', () => {
    for (const f of ['components/MesureField.tsx', 'components/BirthDateField.tsx']) {
      const code = lire(f);
      expect(code, f).toContain('<ActionSheet');
      expect(code, f).not.toMatch(/<Sheet\b/);
      // 🔴 Vu au simulateur : sans ça, tourner une colonne vers le bas FERMAIT la feuille.
      expect(code, f).toMatch(/<ActionSheet[^\n]*glissePoigneeSeule/);
    }
    expect(lire('components/ActionSheet.tsx')).toContain('{...(glissePoigneeSeule ? {} : pan.panHandlers)}');
  });

  it('P9 — le % de masse grasse est une roulette, bornée par genre', () => {
    for (const sex of ['male', 'female'] as const) {
      const [lo, hi] = bodyFatBounds(sex);
      const options = pourcentsGras(sex);
      expect(options[0]).toBe(lo);
      expect(options[options.length - 1]).toBe(hi);
      // Le départ tombe sur une silhouette du milieu, dans les bornes.
      expect(departGras(sex)).toBeGreaterThanOrEqual(lo);
      expect(departGras(sex)).toBeLessThanOrEqual(hi);
      // Le plafond ne se dépasse pas avec les dixièmes : 60,9 n'existe pas.
      expect(assemblerGras(hi, 9, sex)).toBe(String(hi));
      // Hors bornes : rien de choisi.
      expect(decouperGras(String(lo - 1), sex)).toBeNull();
      expect(decouperGras(String(hi + 1), sex)).toBeNull();
    }
    expect(decouperGras('23.5', 'male')).toEqual({ entier: 23, dixieme: 5 });
    expect(assemblerGras(23, 5, 'male')).toBe('23.5');
    expect(assemblerGras(23, 0, 'male')).toBe('23');
    expect(libelleGras('23.5', 'male')).toBe('23,5 %');
    expect(libelleGras('', 'male')).toBeNull();
    // 8 % est sous le gras essentiel féminin : hors bornes chez elle, pas chez lui.
    expect(decouperGras('8', 'female')).toBeNull();
    expect(decouperGras('8', 'male')).not.toBeNull();
  });
});

describe('segment 2 — silhouettes', () => {
  it('P7/P9 — plus aucun clavier dans le sélecteur (le champ tapé regagnait en silence)', () => {
    expect(PICKER).not.toMatch(/<Field\b|<TextInput\b|onBlur|keyboardType/);
    expect(PICKER).toContain('<MesureField');
    expect(PICKER).toContain('mesure="gras"');
  });

  it('P6 — la silhouette choisie garde son fond : contour et rond coché', () => {
    expect(PICKER).toContain('<RondCoche t={t} selected={on} />');
    expect(PICKER).not.toMatch(/backgroundColor: on \?/);
    expect(PICKER).not.toMatch(/t\.onAccent/);
  });

  it('P8 — l\'image fait 150 pt, sans dépasser la définition des fichiers (479 px / 3)', () => {
    const m = PICKER.match(/img: \{ height: (\d+),/);
    expect(m).toBeTruthy();
    const h = Number(m![1]);
    expect(h).toBe(150);
    expect(h * 3).toBeLessThanOrEqual(479);
    expect(PICKER).toContain(`figure: { height: ${h},`);
  });
});

describe('segment 2 — un % enregistré reste visible', () => {
  it('la ligne montre un % qu\'aucune silhouette ne porte (vu au Profil : 12 % disparaissait)', () => {
    expect(PICKER).toContain('value != null && (saisiManuel || !levels.some((lv) => lv.pct === value))');
  });
});
