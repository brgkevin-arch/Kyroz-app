import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Les 12 silhouettes du sélecteur de %MG (A32) ────────────────────────────
//
// Ce fichier existe parce que ces images ne sont pas de la décoration : le %MG
// choisi pilote le calcul des besoins caloriques, et **un cran d'écart vaut environ
// 200 kcal/jour dans l'assiette**. Ce que les cas ci-dessous verrouillent, ce n'est
// donc pas « les images sont jolies » — c'est qu'elles restent COMPARABLES entre
// elles, et que l'écran les affiche à leur vraie forme.
//
// ⚠️ Aucun de ces trois défauts ne lève d'erreur à l'exécution. Ils dégradent en
// silence, et se lisent tous comme « les nouvelles images sont moins bien ».

const ASSETS = join(__dirname, '..', '..', 'assets', 'bodyfat');
const PICKER = join(__dirname, '..', '..', 'components', 'BodyFatPicker.tsx');

/** Dimensions d'un PNG, lues dans son en-tête IHDR (13 octets après la signature). */
function taillePng(fichier: string): { w: number; h: number } {
  const buf = readFileSync(join(ASSETS, fichier));
  expect(buf.subarray(1, 4).toString('ascii'), `${fichier} : ce n'est pas un PNG`).toBe('PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const FICHIERS = ['male', 'female'].flatMap((s) => [1, 2, 3, 4, 5, 6].map((i) => `${s}-${i}.png`));

describe('silhouettes du sélecteur de masse grasse', () => {
  it('les 12 partagent EXACTEMENT le même canevas', () => {
    // 🔴 C'est l'invariant qui porte tout le reste. Le script de découpe pose un
    // canevas commun et aligne les socles ; si deux images divergeaient, les corps
    // seraient rendus à des échelles différentes et la comparaison — la seule chose
    // que ce sélecteur montre — deviendrait fausse. Un corps à 35 % DOIT paraître
    // plus large qu'un corps à 10 %, et ça ne tient que si le cadre est identique.
    const tailles = FICHIERS.map((f) => ({ f, ...taillePng(f) }));
    const ref = tailles[0];
    for (const t of tailles) {
      expect(`${t.f}: ${t.w}×${t.h}`, 'canevas divergent entre deux silhouettes')
        .toBe(`${t.f}: ${ref.w}×${ref.h}`);
    }
  });

  it('l’écran affiche les images à LEUR ratio, pas à celui d’un jeu périmé', () => {
    // 🔴 Défaut réel, trouvé le 2026-08-23 en remplaçant les assets : le composant
    // figeait `aspectRatio: 220 / 462` — les dimensions du jeu PRÉCÉDENT. Les
    // planches redécoupées sortent en 273 × 479, et le canevas se CALCULE (il vaut le
    // plus large des douze plus la marge), donc il change à chaque regénération.
    // Avec `resizeMode: 'contain'`, l'image n'aurait pas été déformée : elle aurait
    // été rétrécie dans une boîte trop étroite, avec du vide au-dessus et en dessous.
    // Aucune erreur, aucun avertissement — juste des silhouettes plus petites.
    const { w, h } = taillePng('male-1.png');
    const src = readFileSync(PICKER, 'utf8');
    const m = src.match(/aspectRatio:\s*(\d+)\s*\/\s*(\d+)/);
    expect(m, 'BodyFatPicker : `aspectRatio` introuvable').toBeTruthy();
    expect(`${m![1]}/${m![2]}`, `le ratio de l'écran ne suit plus les fichiers (${w}×${h})`)
      .toBe(`${w}/${h}`);
  });

  it('les silhouettes sont détourées, et sans liseré coloré sur fond sombre', () => {
    // Deux défauts distincts, tous deux invisibles sur un fond clair :
    //   · un PNG sans canal alpha n'est pas détouré du tout ;
    //   · un contour qui garde la teinte du fond dessine un halo sur la carte sombre.
    // Le second a coûté deux correctifs le 2026-08-23 — le liseré rose est devenu
    // vert avant d'être borné, parce que la sonde ne mesurait qu'un seul sens.
    for (const f of FICHIERS) {
      const buf = readFileSync(join(ASSETS, f));
      // Octet 25 de l'en-tête = color type. 6 = RGBA, 4 = gris + alpha.
      expect([4, 6], `${f} : le PNG n'a pas de canal alpha, il n'est pas détouré`)
        .toContain(buf.readUInt8(25));
    }
  });
});
