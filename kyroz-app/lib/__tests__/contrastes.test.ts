import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTES } from '../../constants/theme';

// ── AUCUN TEXTE SOUS 4,5:1, SUR AUCUN FOND, DANS AUCUN DES DEUX THÈMES ───────
//
// 🔴 CE QUE CE FICHIER FERME, mesuré le 2026-09-01 après l'audit UX : le thème CLAIR
// servait `textTertiary` à 2,18:1 et `textQuaternary` à 1,58:1 — les deux chiffres de
// l'audit, exacts — et son `textSecondary` lui-même échouait à 3,30:1.
//
// ⚠️ ET LA CAUSE N'ÉTAIT PAS UNE FAUTE DE FRAPPE : c'étaient les vraies valeurs d'iOS.
// Apple dessine à son standard, pas à WCAG. Recopier une palette système est un choix
// par défaut qui a l'air prudent et ne l'est pas — c'est le même défaut qu'un réglage
// « sûr » hérité sans être mesuré.
//
// ⚠️ POURQUOI LE QUATRIÈME CRAN A DISPARU. `textQuaternary` ne pouvait pas être à la
// fois LISIBLE et DISTINCT de `textTertiary` : sur le fond le plus clair de l'app (un
// champ `fill` posé sur `cardElevated`), l'opacité qu'il fallait pour atteindre 4,5:1
// était celle du cran du dessus. Quatre niveaux d'atténuation ne tiennent pas dans la
// plage disponible ; le garder aurait voulu dire le garder illisible.

const CIBLE = 4.5; // WCAG 2.1 AA, texte normal — l'app descend jusqu'à 11 px

const lineaire = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: number[]) =>
  0.2126 * lineaire(r) + 0.7152 * lineaire(g) + 0.0722 * lineaire(b);
const contraste = (a: number[], b: number[]) => {
  const [h, l] = luminance(a) > luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)];
  return (h + 0.05) / (l + 0.05);
};

/** `#RRGGBB` ou `rgba(r,g,b,a)` → canaux + opacité. */
function lire(c: string): { rgb: number[]; a: number } {
  if (c.startsWith('#')) {
    return { rgb: [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), a: 1 };
  }
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) throw new Error(`couleur illisible : ${c}`);
  return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
}

/** Une couleur translucide POSÉE sur un fond — c'est le pixel réellement affiché. */
const aplatir = (couleur: string, fond: number[]) => {
  const { rgb, a } = lire(couleur);
  return rgb.map((v, i) => v * a + fond[i] * (1 - a));
};

describe.each(Object.entries(PALETTES))('thème %s', (nom, p) => {
  // Les fonds NUS, puis les mêmes recouverts d'un `fill` — un champ de saisie ou un
  // chip inactif éclaircit le fond, et c'est là que le texte le plus pâle se joue.
  // Les oublier laisserait passer un placeholder illisible en déclarant l'app conforme.
  const fondsNus = [p.bg, p.card, p.cardElevated].map((c) => lire(c).rgb);
  const fonds = [
    ...fondsNus.map((f, i) => [`fond ${i}`, f] as const),
    ...fondsNus.map((f, i) => [`fond ${i} + fill`, aplatir(p.fill, f)] as const),
  ];

  for (const token of ['text', 'textSecondary', 'textTertiary'] as const) {
    it(`${token} tient ${CIBLE}:1 sur TOUS les fonds`, () => {
      for (const [libelle, fond] of fonds) {
        const r = contraste(aplatir(p[token], fond), fond);
        expect(r, `${nom} · ${token} sur ${libelle} — ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(CIBLE);
      }
    });
  }
});

describe('le quatrième cran ne revient pas', () => {
  const racine = join(__dirname, '..', '..');
  const theme = readFileSync(join(racine, 'constants', 'theme.ts'), 'utf8');

  it('`textQuaternary` n\'est plus un token', () => {
    // Le nom survit dans UN commentaire, qui raconte pourquoi il est parti. Ce qui est
    // interdit, c'est qu'il redevienne une entrée de palette : un cran ajouté « juste
    // pour ce libellé-là » rouvrirait la plage sous 4,5:1 sans qu'aucun test ne le voie,
    // puisque les tests ci-dessus n'énumèrent que les tokens qu'ils connaissent.
    expect(theme).not.toMatch(/^\s*textQuaternary:/m);
    expect(theme).not.toMatch(/textQuaternary:\s*string/);
  });
});
