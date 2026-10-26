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

// ── Le RÔLE choisit le cran (décision fondateur 2026-10-26) ──────────────────
//
// Le bloc du dessus ferme la porte au chiffre en dur ; il laissait passer le
// MAUVAIS cran. Après la 63ᵉ OTA, sur iPhone : « ça fait petit comparé aux
// autres polices de l'app ». Mesuré : les lignes des feuilles du Profil en 15,
// les sous-titres des cartes de choix en 13, une trentaine de paragraphes
// d'explication en 13 alors que leurs voisins étaient en 14 — sous le titre
// d'un repas (17) qu'on vient de lire sur le Plan. CLAUDE.md §8, tableau des rôles.

function source(rel: string): string {
  return readFileSync(join(RACINE, rel), 'utf8');
}

/** Le corps d'une fonction du fichier, de sa signature à la suivante. */
function corps(src: string, nom: string): string {
  const debut = src.indexOf(`function ${nom}`);
  expect(debut, `function ${nom} introuvable`).toBeGreaterThan(-1);
  const suite = src.indexOf('\nfunction ', debut + 1);
  const suiteExport = src.indexOf('\nexport function ', debut + 1);
  const fins = [suite, suiteExport].filter((i) => i > -1);
  return src.slice(debut, fins.length ? Math.min(...fins) : undefined);
}

describe('Typographie — chaque rôle a son cran', () => {
  it('une ligne de réglage a la taille d\'un titre de carte, et la graisse du texte', () => {
    expect(Type.ligne.fontSize).toBe(Type.h3.fontSize);
    expect(Type.ligne.fontWeight).toBe(Type.body.fontWeight);
    // Libellé ET valeur : une valeur plus petite que son libellé se lit comme une note.
    const ligne = corps(source('app/profil.tsx'), 'Ligne');
    expect(ligne.match(/Type\.ligne\b/g) ?? []).toHaveLength(2);
    expect(ligne).not.toMatch(/Type\.(body|bodySmall|caption)\b/);
  });

  it('les lignes faites à la main de la feuille Repas suivent le même cran', () => {
    // Les créneaux et « Aliments évités » ne passent pas par `Ligne` (heure à
    // gauche, pastilles) : sans ce contrôle, ils resteraient seuls en 15.
    const repas = corps(source('app/profil.tsx'), 'ListeRepas');
    expect(repas).toMatch(/Type\.ligne, color: t\.text, flex: 1 \}\} numberOfLines=\{1\}>\{c\.label\}/);
    expect(repas).toMatch(/Type\.ligne, color: t\.text, flex: 1 \}\}>Aliments évités/);
    expect(repas).not.toMatch(/Type\.body\b/);
  });

  it('carte de choix : titre = titre de carte, sous-titre = corps (jamais une légende)', () => {
    const carte = corps(source('components/ui.tsx'), 'OptionCard');
    expect(carte).toMatch(/\.\.\.Type\.h3, color: t\.text[^}]*\}\}>\{title\}/);
    expect(carte).toMatch(/\.\.\.Type\.body, color: t\.textSecondary[^}]*\}\}>\{subtitle\}/);
  });

  it('un paragraphe qui explique ne descend pas sous 14', () => {
    expect(Type.explication.fontSize).toBe(Type.bodySmall.fontSize);
    expect(Type.explicationStrong.fontSize).toBe(Type.bodySmall.fontSize);
    // Un paragraphe se reconnaît à son interligne posé ; le cran 13 n'y a droit
    // qu'en gris TERTIAIRE (la note fine : source, mention, aide sous un réglage).
    // ⚠️ Angle mort assumé : une couleur posée À L'APPEL (`[s.note, { color }]`)
    // échappe à la ligne lue ici.
    const EXCEPTIONS: Record<string, string> = {
      // Lien d'une source, sur UNE ligne (numberOfLines={1}) : une note, pas un paragraphe.
      'app/methodologie.tsx': 'sourceLien',
    };
    const fautes: string[] = [];
    for (const d of DOSSIERS) {
      for (const f of fichiersTsx(join(RACINE, d))) {
        const rel = f.slice(RACINE.length + 1);
        readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
          if (!/Type\.caption(Strong)?\b/.test(l) || !/lineHeight:\s*\d/.test(l)) return;
          if (!/color:[^,}]*t\.(text|textSecondary|warning|danger)\b/.test(l)) return;
          if (EXCEPTIONS[rel] && l.includes(EXCEPTIONS[rel])) return;
          fautes.push(`${rel}:${i + 1} — ${l.trim().slice(0, 90)}`);
        });
      }
    }
    expect(fautes, fautes.join('\n')).toEqual([]);
  });
});
