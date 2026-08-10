import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Spacing, Fond, CIBLE_TACTILE_MIN } from '../../constants/theme';

// ── Le blanc entre les choses passe par un token, comme la couleur ───────────
//
// Troisième de la famille, après `rayonsDA` (la forme) et `typoDA` (le texte),
// et né du même comptage. Mesuré le 2026-08-06 :
//
//   • **520 espacements écrits à la main pour 49 usages de `Spacing`** — dix
//     marges en dur pour une seule qui passait par le token ;
//   • **231 valeurs hors grille**, la plus courue étant 10 (70 fois), devant
//     14 (53), 6 (39), 2 (39) ;
//   • une carte de repas empilait cinq écarts verticaux — 7, 6, 10, 6, 14 —
//     dont AUCUN dans l'échelle. Quatre informations y flottaient à des
//     distances presque égales, donc rien ne disait à l'œil ce qui allait
//     ensemble. C'est ça, le coût réel : pas « moins joli », **plus lent à
//     comprendre**.
//
// ⚠️ Contrairement à la typographie, les valeurs hors grille ont été ABSORBÉES
// et non adoptées. Là-bas, 14 avait un rôle propre (le texte secondaire) et a
// mérité son token. Ici, 10 n'est pas « un cran entre 8 et 12 » : c'est « un peu
// plus que 8 ». Deux points d'écart passent sous le seuil de perception, donc un
// tel cran ne crée aucun niveau de lecture — il dilue ceux qui existent.
//
// LA RÈGLE : tout espacement passe par `Spacing`, sauf 0 (qui n'est pas un
// espacement mais son absence — `padding: 0` annule le padding natif d'un champ).

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components'];

const PROPS = [
  'padding', 'paddingHorizontal', 'paddingVertical', 'paddingTop', 'paddingBottom',
  'paddingLeft', 'paddingRight', 'margin', 'marginHorizontal', 'marginVertical',
  'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'gap', 'rowGap', 'columnGap',
];

function fichiersTsx(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiersTsx(p));
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/** Valeur en points d'une propriété, qu'elle soit écrite en token ou en chiffre. */
function pt(bloc: string, prop: string): number | null {
  const m = bloc.match(
    new RegExp(`\\b${prop}:\\s*(?:Spacing\\.([a-z]+)|(CIBLE_TACTILE_MIN)|(\\d+))`)
  );
  if (!m) return null;
  if (m[1]) return (Spacing as Record<string, number>)[m[1]] ?? null;
  if (m[2]) return CIBLE_TACTILE_MIN;
  return parseInt(m[3], 10);
}

describe('Espacement — le blanc est un token, pas un chiffre', () => {
  const enDur: string[] = [];

  for (const d of DOSSIERS) {
    for (const f of fichiersTsx(join(RACINE, d))) {
      readFileSync(f, 'utf8').split('\n').forEach((ligne, i) => {
        for (const prop of PROPS) {
          const re = new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`, 'g');
          let m: RegExpExecArray | null;
          while ((m = re.exec(ligne))) {
            // 0 n'est pas un espacement, c'est son absence.
            if (parseFloat(m[1]) === 0) continue;
            enDur.push(`${f.slice(RACINE.length + 1)}:${i + 1} — ${prop}: ${m[1]}  ${ligne.trim().slice(0, 70)}`);
          }
        }
      });
    }
  }

  it('aucun espacement en dur — tout passe par Spacing ou Fond', () => {
    expect(enDur, enDur.join('\n')).toEqual([]);
  });

  it("l'échelle est une grille de 4, et chaque cran a un rôle", () => {
    const vals = Object.values(Spacing);
    expect(vals.every((v) => v % 4 === 0), `hors grille : ${vals.filter((v) => v % 4 !== 0)}`).toBe(true);
    // Croissante et sans doublon : deux crans de même valeur, c'est un cran sans rôle.
    expect([...vals].sort((a, b) => a - b)).toEqual(vals);
    expect(new Set(vals).size).toBe(vals.length);
    // Les dégagements de bas ne sont PAS des écarts de mise en page : ils
    // compensent quelque chose de physique et se nomment d'après ça.
    expect(Object.keys(Fond).sort()).toEqual(['barreOnglets', 'ecran', 'feuille']);
  });

  it('🔴 aucun élément pressable sous la cible tactile de 44 pt', () => {
    // Un bouton sans hauteur explicite mesure 2 × paddingVertical + sa ligne de
    // texte. On compte la ligne à 20 pt (corps 15-17, interligne ~1,2) : c'est
    // OPTIMISTE, donc ce que ce test trouve est réellement trop petit.
    // ⚠️ `hitSlop` élargit la zone au doigt mais pas à l'œil — un bouton qui a
    // l'air petit reste difficile à viser, donc il ne compte pas comme un fix.
    const LIGNE = 20;
    const petits: string[] = [];

    for (const d of DOSSIERS) {
      for (const f of fichiersTsx(join(RACINE, d))) {
        const src = readFileSync(f, 'utf8');
        const noms = new Set<string>();
        // 🔴 `Presse` A ÉTÉ AJOUTÉ LE 2026-08-10, ET SON ABSENCE A RENDU CE TEST
        // AVEUGLE PENDANT LA MIGRATION. Les 129 `TouchableOpacity` sont devenus
        // 129 `<Presse>` (le pressable qui s'enfonce sous le doigt) : cette liste
        // ne reconnaissait plus AUCUN élément pressable de l'app, et le test est
        // resté **vert** — il ne mesurait plus rien du tout.
        // ➡️ Un garde-fou nommé d'après une IMPLÉMENTATION meurt le jour où on
        // change d'implémentation, et il meurt en silence, dans le sens
        // rassurant. Tout composant pressable ajouté à l'app doit être ajouté
        // ici le même jour.
        for (const m of src.matchAll(/<(?:TouchableOpacity|Pressable|TouchableHighlight|Presse)\b[\s\S]{0,400}?>/g)) {
          for (const st of m[0].matchAll(/\b[a-zA-Z]\.([a-zA-Z][a-zA-Z0-9]*)/g)) noms.add(st[1]);
          const inline = m[0].match(/style=\{\{([^}]*)\}\}/);
          if (!inline) continue;
          const h = pt(inline[1], 'height') ?? pt(inline[1], 'minHeight');
          const pv = pt(inline[1], 'paddingVertical');
          const haut = h ?? (pv != null ? 2 * pv + LIGNE : null);
          if (haut != null && haut < CIBLE_TACTILE_MIN) {
            petits.push(`${f.slice(RACINE.length + 1)}:${src.slice(0, m.index).split('\n').length} (inline) ~${haut} pt`);
          }
        }
        for (const nom of noms) {
          const def = src.match(new RegExp(`\\b${nom}:\\s*\\{([^{}]*)\\}`));
          if (!def) continue;
          const h = pt(def[1], 'height') ?? pt(def[1], 'minHeight');
          const pv = pt(def[1], 'paddingVertical');
          if (h == null && pv == null) continue;
          const haut = h ?? 2 * pv! + LIGNE;
          if (haut < CIBLE_TACTILE_MIN) {
            petits.push(`${f.slice(RACINE.length + 1)} — ${nom} ~${haut} pt : ${def[1].trim().slice(0, 60)}`);
          }
        }
      }
    }
    expect(petits, petits.join('\n')).toEqual([]);
  });
});
