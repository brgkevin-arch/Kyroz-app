import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Radius } from '../../constants/theme';

// ── Le rayon des blocs passe par un token, comme la couleur ──────────────────
//
// CLAUDE.md §8 exigeait « aucune couleur en dur » et ne disait RIEN des rayons.
// Résultat mesuré le 2026-08-03 sur l'écran Plan, en une seule capture : les
// blocs à 22, la carte Hydratation à 16, son bouton à 999. Trois valeurs pour
// trois objets qui se touchent, et personne ne l'avait vu en relisant du code —
// un rayon ne se lit pas dans un diff, il se voit sur un écran.
//
// LA RÈGLE, et c'est la seule chose que ce test sait faire :
//   un `borderRadius` écrit en CHIFFRE n'est légitime que si l'objet a une
//   TAILLE fixe et que le rayon en est au plus la moitié — un disque, une
//   pastille, une barre. Dès qu'un objet se dimensionne par son contenu (carte,
//   bouton, champ, feuille), sa forme est une décision de DA : elle passe par
//   `Radius`.
//
// ⚠️ Ce que ce test NE fait PAS : vérifier qu'on a choisi le BON token. Écrire
// `Radius.pill` sur une carte passerait. Il ferme la porte au chiffre en dur,
// qui est le chemin par lequel la dérive est effectivement arrivée ; le choix du
// rôle, lui, est écrit en toutes lettres au-dessus de `Radius` dans theme.ts.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

function fichiersTsx(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersTsx(p));
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/**
 * Taille fixe déclarée dans le MÊME objet de style que le rayon. On regarde
 * autour de l'occurrence, sans parser le TS : les feuilles de style de Kyroz
 * tiennent leurs propriétés sur une à trois lignes, et une fenêtre suffit.
 */
function tailleAutour(src: string, index: number): number | null {
  const debut = src.lastIndexOf('{', index);
  // Une accolade ouvrante avant le rayon, la fermante après : la fenêtre de
  // l'objet de style. On borne à 400 caractères pour ne pas remonter au fichier.
  const fin = src.indexOf('}', index);
  if (debut < 0 || fin < 0 || index - debut > 400) return null;
  const bloc = src.slice(debut, fin);
  let max: number | null = null;
  // On lit la VALEUR jusqu'à la virgule, pas le premier nombre : une taille
  // s'écrit parfois `width: i % 3 === 0 ? 7 : 5`. On retient la plus grande
  // branche — c'est le pire cas, donc le plus permissif, donc le plus prudent
  // pour un garde-fou qui ne doit pas crier au loup.
  for (const m of bloc.matchAll(/\b(?:width|height)\s*:([^,\n}]*)/g)) {
    for (const n of m[1].matchAll(/\d+(?:\.\d+)?/g)) {
      const v = parseFloat(n[0]);
      max = max == null ? v : Math.max(max, v);
    }
  }
  return max;
}

describe('Rayons — la forme des blocs est un token, pas un chiffre', () => {
  const fautifs: string[] = [];

  for (const d of DOSSIERS) {
    for (const f of fichiersTsx(join(RACINE, d))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/borderRadius:\s*(\d+(?:\.\d+)?)/g)) {
        const rayon = parseFloat(m[1]);
        const taille = tailleAutour(src, m.index!);
        // Tolérance de 1 : une barre de 5 de haut s'arrondit à 3, pas à 2,5.
        if (taille != null && rayon <= taille / 2 + 1) continue;
        const ligne = src.slice(0, m.index).split('\n').length;
        fautifs.push(
          `${f.slice(RACINE.length + 1)}:${ligne} — borderRadius: ${rayon}` +
          (taille == null ? ' (aucune taille fixe)' : ` (taille ${taille})`)
        );
      }
    }
  }

  it('aucun rayon en dur sur un objet qui se dimensionne par son contenu', () => {
    expect(fautifs, fautifs.join('\n')).toEqual([]);
  });

  it("l'ancienne échelle (16, 20) n'existe plus — un appel ne compilerait pas", () => {
    // Ce sont les deux valeurs qui ont produit la dérive : elles n'ont pas de
    // rôle, donc elles ne doivent pas être proposées. Les retirer fait échouer
    // `tsc`, ce qui attrape la faute AVANT qu'elle n'atteigne un écran.
    expect(Object.values(Radius)).not.toContain(16);
    expect(Object.values(Radius)).not.toContain(20);
    // Et les cinq rôles restants sont bien là.
    expect(Object.keys(Radius).sort()).toEqual(['button', 'card', 'pill', 'sm', 'xl']);
  });
});
