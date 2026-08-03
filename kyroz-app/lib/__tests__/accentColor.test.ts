import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACCENTS, ACCENT_IDS, contrastRatio, readableOn, relativeLuminance, getAccentId,
} from '../accentColor';

// Le contrat de la personnalisation d'accent : on peut ajouter une couleur, on ne
// peut pas livrer un bouton invisible. La palette est une DONNÉE, et une donnée ne
// se relit pas — ce fichier est le seul endroit qui l'empêche.

// ── Les fonds de page, LUS DANS LE THÈME ─────────────────────────────────────
// On ne recopie pas `#000000` / `#F2F2F7` ici : une valeur recopiée diverge le
// jour où le thème change, et le test continuerait de valider contre un fond qui
// n'existe plus. Même principe que `profileCols.test.ts`, qui lit le SQL.
// (Import direct impossible : `constants/theme.ts` tire react-native.)
function fondsDePage(): { light: string; dark: string } {
  const src = readFileSync(join(__dirname, '..', '..', 'constants', 'theme.ts'), 'utf8');
  const lire = (scheme: 'dark' | 'light') => {
    const m = src.match(new RegExp(`scheme: '${scheme}',[\\s\\S]{0,120}?bg: '(#[0-9A-Fa-f]{6})'`));
    if (!m) throw new Error(`fond de page introuvable pour le thème ${scheme} dans constants/theme.ts`);
    return m[1].toUpperCase();
  };
  return { light: lire('light'), dark: lire('dark') };
}

describe('contraste — formule WCAG', () => {
  it('les bornes connues sont exactes', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('le rapport est symétrique', () => {
    expect(contrastRatio('#0A66D0', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#0A66D0'), 10);
  });
});

describe('readableOn — le texte POSÉ SUR le bouton', () => {
  it('choisit toujours le meilleur des deux', () => {
    for (const id of ACCENT_IDS) {
      for (const scheme of ['light', 'dark'] as const) {
        const bg = ACCENTS[id][scheme];
        const choisi = readableOn(bg);
        const autre = choisi === '#FFFFFF' ? '#000000' : '#FFFFFF';
        expect(
          contrastRatio(bg, choisi),
          `${id}/${scheme} — ${autre} contrasterait mieux que ${choisi}`,
        ).toBeGreaterThanOrEqual(contrastRatio(bg, autre));
      }
    }
  });

  it('les cas évidents', () => {
    expect(readableOn('#000000')).toBe('#FFFFFF');
    expect(readableOn('#FFFFFF')).toBe('#000000');
  });

  // ⚠️ CE QUI SUIT N'EST PAS UN GARDE-FOU, C'EST UNE PREUVE — et elle explique
  // pourquoi il n'y a pas de test « le texte du bouton atteint 4,5:1 » ici.
  // Un tel test serait DÉCORATIF : avec la règle « le meilleur des deux », le pire
  // fond concevable (#757575) atteint encore 4,61:1. Le seuil AA ne pourrait donc
  // jamais rougir, quelle que soit la couleur ajoutée à la palette.
  // Mesuré par balayage des 256 gris ; on fige le plancher pour que la démonstration
  // survive à une modification de `readableOn` (si quelqu'un casse la règle du
  // meilleur-des-deux, ce plancher tombe et cette ligne rougit).
  it('le texte du bouton ne PEUT PAS être illisible — plancher mathématique 4,6:1', () => {
    let pire = Infinity;
    for (let v = 0; v < 256; v++) {
      const gris = '#' + v.toString(16).padStart(2, '0').repeat(3);
      pire = Math.min(pire, contrastRatio(gris, readableOn(gris)));
    }
    expect(pire).toBeGreaterThan(4.6);
  });
});

describe('LE vrai garde-fou : l\'accent se détache du fond de page', () => {
  // Le risque réel n'est pas le texte SUR le bouton (cf. la preuve ci-dessus),
  // c'est le bouton lui-même noyé dans la page : un bleu sombre sur fond noir, un
  // jaune pâle sur fond clair. Seuil WCAG pour un composant d'interface : 3:1.
  const SEUIL = 3;
  const fonds = fondsDePage();

  it.each(ACCENT_IDS.flatMap((id) => (['light', 'dark'] as const).map((s) => [id, s] as const)))(
    'accent %s en thème %s se détache du fond',
    (id, scheme) => {
      const accent = ACCENTS[id][scheme];
      const ratio = contrastRatio(accent, fonds[scheme]);
      expect(
        ratio,
        `${id}/${scheme} : ${accent} sur fond ${fonds[scheme]} ne contraste qu'à ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(SEUIL);
    },
  );

  it('les fonds de page sont bien ceux du thème', () => {
    // Si `constants/theme.ts` change de fond, c'est ici qu'on le voit — et les
    // assertions ci-dessus se rejouent automatiquement contre la nouvelle valeur.
    expect(fonds.dark).toMatch(/^#[0-9A-F]{6}$/);
    expect(fonds.light).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('la palette est bien formée', () => {
  it('chaque accent a un libellé et deux hexadécimaux complets', () => {
    for (const id of ACCENT_IDS) {
      expect(ACCENTS[id].label.length).toBeGreaterThan(0);
      expect(ACCENTS[id].light).toMatch(/^#[0-9A-F]{6}$/i);
      expect(ACCENTS[id].dark).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('le défaut reste la DA de Kyroz', () => {
  it('monochrome au démarrage — encre sur clair, blanc sur sombre', () => {
    expect(getAccentId()).toBe('mono');
    expect(ACCENTS.mono.dark).toBe('#FFFFFF');
    expect(ACCENTS.mono.light).toBe('#1C1C1E');
  });
});
