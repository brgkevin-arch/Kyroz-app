import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Type, TAILLES_AUTORISEES } from '../../constants/theme';

// ── La TAILLE et la GRAISSE du texte passent par un token, comme la couleur ──
//
// Frère jumeau de `rayonsDA.test.ts`, et né de la même façon : pas d'une
// relecture, d'un comptage. Mesuré le 2026-08-05 —
//
//   • `Type` déclarait 8 tailles ; l'app en employait 18 ;
//   • les deux plus courues n'existaient dans aucun token : 14 (76 fois) et
//     12 (48 fois). Trois sites écrivaient même un DEMI-pixel (11.5, 12.5) ;
//   • 12, 13, 14 et 15 cohabitaient — quatre « petits textes » à un pixel
//     d'écart, ce qui ne fait pas quatre niveaux de lecture mais un flou ;
//   • la graisse 600 était employée 72 fois, répartie au hasard sur les six
//     tailles. Elle ne marquait donc rien, alors que theme.ts dit depuis
//     toujours que la hiérarchie se fait par la taille et pas par la graisse.
//
// LA RÈGLE : un `fontSize` en chiffre n'est légitime que sur un PICTOGRAMME —
// un emoji dimensionné n'est pas de la typographie, c'est une image. Tout le
// reste passe par `Type`, où chaque cran a un rôle écrit.
//
// ⚠️ Ce que ce test NE fait PAS, exactement comme son frère : vérifier qu'on a
// choisi le BON cran. Poser `Type.hero` sur une mention légale passerait. Il
// ferme la porte au chiffre en dur, qui est le chemin par lequel la dérive est
// réellement arrivée.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

// Symboles, pictogrammes, drapeaux, plus le sélecteur de variante (U+FE0F) qui
// suit les emojis « anciens » comme ⚖️ — sans lui, `⚖` seul passe pour un
// caractère mathématique et le test crierait au loup sur une balance.
const PICTO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

function fichiersTsx(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersTsx(p));
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/** Le style porte-t-il un pictogramme ? Soit il en contient un, soit il se nomme
 *  d'après lui (`emoji:`, `mealEmoji:`) — auquel cas le caractère est ailleurs.
 *  Pas de `\b` devant `emoji` : en camelCase il n'y a PAS de frontière de mot
 *  entre `meal` et `Emoji`, et la première version de ce test s'y est fait
 *  prendre — sur son propre code, dès le premier lancement. */
function estPictogramme(ligne: string): boolean {
  return PICTO.test(ligne) || /emoji/i.test(ligne);
}

describe('Typographie — la taille et la graisse sont des tokens, pas des chiffres', () => {
  const taillesEnDur: string[] = [];
  const graissesInterdites: string[] = [];

  for (const d of DOSSIERS) {
    for (const f of fichiersTsx(join(RACINE, d))) {
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((ligne, i) => {
        const ou = `${f.slice(RACINE.length + 1)}:${i + 1}`;
        const taille = ligne.match(/fontSize:\s*(\d+(?:\.\d+)?)/);
        if (taille && !estPictogramme(ligne)) {
          taillesEnDur.push(`${ou} — fontSize: ${taille[1]}  ${ligne.trim().slice(0, 80)}`);
        }
        // 500 (le texte) et 700 (ce qui porte). Deux graisses, pas six.
        const graisse = ligne.match(/fontWeight:\s*'(\d+)'/);
        if (graisse && graisse[1] !== '500' && graisse[1] !== '700') {
          graissesInterdites.push(`${ou} — fontWeight: '${graisse[1]}'  ${ligne.trim().slice(0, 80)}`);
        }
      });
    }
  }

  it('aucune taille de texte en dur, sauf sur un pictogramme', () => {
    expect(taillesEnDur, taillesEnDur.join('\n')).toEqual([]);
  });

  it('aucune graisse hors 500 / 700', () => {
    expect(graissesInterdites, graissesInterdites.join('\n')).toEqual([]);
  });

  it("l'échelle ne contient que des crans autorisés", () => {
    const hors = Object.entries(Type)
      .filter(([, v]) => !(TAILLES_AUTORISEES as readonly number[]).includes(v.fontSize))
      .map(([k, v]) => `${k} = ${v.fontSize}`);
    expect(hors, hors.join(', ')).toEqual([]);
    // Et l'inverse : un cran autorisé que plus aucun token n'emploie est un cran
    // fantôme — c'est comme ça que `Radius.md` avait survécu sans rôle.
    const employees = new Set(Object.values(Type).map((v) => v.fontSize));
    const fantomes = TAILLES_AUTORISEES.filter((t) => !employees.has(t));
    expect(fantomes, `crans sans token : ${fantomes.join(', ')}`).toEqual([]);
  });

  it('🔴 le texte saisi ne descend jamais sous 16 (Safari iOS zoome sinon)', () => {
    // Ce n'est pas une préférence de DA. Sous 16 px, Safari iOS zoome de force
    // sur le champ dès qu'il prend le focus, et les testeurs de Kyroz ouvrent
    // l'app dans le navigateur de leur téléphone — c'est le lien du README.
    // Avant le 2026-08-05, `RecipeEditor.input` était à 15 et rien ne le disait.
    expect(Type.input.fontSize).toBeGreaterThanOrEqual(16);

    // Et aucun champ ne contourne le token en se recomposant à la main.
    const suspects: string[] = [];
    for (const d of DOSSIERS) {
      for (const f of fichiersTsx(join(RACINE, d))) {
        readFileSync(f, 'utf8').split('\n').forEach((ligne, i) => {
          if (!/^\s*(input|searchInput)\s*:\s*\{/.test(ligne)) return;
          if (!/Type\.(input|label|h3|h2|h1|display|hero)/.test(ligne) && !/\{\s*$/.test(ligne.trim())) {
            suspects.push(`${f.slice(RACINE.length + 1)}:${i + 1} — ${ligne.trim().slice(0, 80)}`);
          }
        });
      }
    }
    expect(suspects, suspects.join('\n')).toEqual([]);
  });
});
