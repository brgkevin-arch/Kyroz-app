import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACCENTS, ACCENT_IDS, contrastRatio, readableOn, relativeLuminance, getAccentId,
  mixHex, macroShades, MACRO_SHADE_MIN_CONTRAST,
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

describe('les trois nuances de macro suivent l\'accent SANS disparaître', () => {
  // Ce bloc existe à cause d'un défaut RÉEL, pas d'une précaution : la 3ᵉ nuance de
  // la maquette (#DDDDDF) tombait à 1,21:1 contre le fond, et le segment « lipides »
  // était purement invisible — la barre semblait s'arrêter aux deux tiers.
  // Une nuance choisie « à l'œil, un peu plus claire » reproduit ce bug à coup sûr.
  const fonds = fondsDePage();
  const COLORES = ACCENT_IDS.filter((id) => id !== 'mono');

  it('mixHex interpole correctement', () => {
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    // Hors bornes : borné, jamais un hex invalide.
    expect(mixHex('#000000', '#FFFFFF', 2)).toBe('#FFFFFF');
    expect(mixHex('#000000', '#FFFFFF', -1)).toBe('#000000');
  });

  it.each(COLORES.flatMap((id) => (['light', 'dark'] as const).map((s) => [id, s] as const)))(
    'accent %s en thème %s : les 3 nuances restent visibles sur le fond',
    (id, scheme) => {
      const nuances = macroShades(ACCENTS[id][scheme], fonds[scheme]);
      expect(nuances).toHaveLength(3);
      for (const [i, n] of nuances.entries()) {
        const ratio = contrastRatio(n, fonds[scheme]);
        expect(
          ratio,
          `${id}/${scheme} nuance ${i + 1} (${n}) sur fond ${fonds[scheme]} : ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(MACRO_SHADE_MIN_CONTRAST);
      }
    },
  );

  it.each(COLORES.flatMap((id) => (['light', 'dark'] as const).map((s) => [id, s] as const)))(
    'accent %s en thème %s : les 3 nuances se distinguent entre elles',
    (id, scheme) => {
      // Trois segments côte à côte qui se confondent ne séparent plus rien : la
      // barre redevient un bloc uni, ce qui est l'autre façon de mentir sur une
      // proportion. On exige un écart de luminance mesurable entre voisins.
      const [a, b, c] = macroShades(ACCENTS[id][scheme], fonds[scheme]);
      expect(new Set([a, b, c]).size, `${id}/${scheme} : nuances identiques`).toBe(3);
      for (const [x, y] of [[a, b], [b, c]] as const) {
        const ecart = Math.abs(relativeLuminance(x) - relativeLuminance(y));
        expect(ecart, `${id}/${scheme} : ${x} et ${y} sont trop proches`).toBeGreaterThan(0.02);
      }
    },
  );

  it('la 1re nuance EST l\'accent — la barre appartient à la couleur choisie', () => {
    for (const id of COLORES) {
      for (const scheme of ['light', 'dark'] as const) {
        expect(macroShades(ACCENTS[id][scheme], fonds[scheme])[0]).toBe(ACCENTS[id][scheme]);
      }
    }
  });

  // ⚠️ MESURÉ le 2026-08-05 : sur les 6 accents actuels, le plancher ne mord
  // JAMAIS — le cas le plus serré est l'orange en clair, dont la 3ᵉ nuance tient à
  // 1,53:1, soit 0,03 au-dessus du seuil. Le mécanisme de recul n'est donc exercé
  // par AUCUN accent livré, et un garde-fou que le chemin réel ne traverse jamais
  // ne garde rien. Le test ci-dessous le traverse volontairement, avec une couleur
  // hostile — c'est le seul qui rougirait si on retirait le recul.
  it('le plancher MORD — une couleur trop proche du fond est ramenée vers l\'accent', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const fond = fonds[scheme];
      // Un accent à un cheveu du fond : tout mélange vers le fond disparaît.
      const hostile = mixHex(fond, scheme === 'dark' ? '#FFFFFF' : '#000000', 0.22);
      const naif = mixHex(hostile, fond, 0.64);
      expect(
        contrastRatio(naif, fond),
        `le cas hostile n'est plus hostile en ${scheme} : ${naif} tient déjà le seuil`,
      ).toBeLessThan(MACRO_SHADE_MIN_CONTRAST);

      // Le recul ramène jusqu'à l'accent lui-même s'il le faut, et s'arrête là :
      // il ne fabrique jamais une couleur plus contrastée que ce qu'on lui a donné.
      const [, , lip] = macroShades(hostile, fond);
      expect(contrastRatio(lip, fond)).toBeGreaterThanOrEqual(
        Math.min(MACRO_SHADE_MIN_CONTRAST, contrastRatio(hostile, fond)),
      );
      expect(contrastRatio(lip, fond)).toBeGreaterThan(contrastRatio(naif, fond));
    }
  });

  it('la marge du cas le plus serré est CONNUE, pas découverte en production', () => {
    // Le pire cas se documente au lieu de se subir : si un accent futur descend
    // sous le seuil, c'est le test « restent visibles » qui rougit — mais si un
    // accent futur RÔDE juste au-dessus, personne ne le voit. Cette ligne fige la
    // marge minimale observée pour que sa dégradation se remarque.
    const marges = COLORES.flatMap((id) =>
      (['light', 'dark'] as const).map((s) => {
        const [, , lip] = macroShades(ACCENTS[id][s], fonds[s]);
        return { cas: `${id}/${s}`, marge: contrastRatio(lip, fonds[s]) - MACRO_SHADE_MIN_CONTRAST };
      }),
    );
    const pire = marges.reduce((a, b) => (a.marge <= b.marge ? a : b));
    expect(pire.marge, `cas le plus serré : ${pire.cas}`).toBeGreaterThanOrEqual(0);
    expect(pire.cas).toBe('orange/light');   // mesuré : 1,53:1, marge 0,03
  });
});

describe('le défaut reste la DA de Kyroz', () => {
  it('monochrome au démarrage — encre sur clair, blanc sur sombre', () => {
    expect(getAccentId()).toBe('mono');
    expect(ACCENTS.mono.dark).toBe('#FFFFFF');
    expect(ACCENTS.mono.light).toBe('#1C1C1E');
  });
});
