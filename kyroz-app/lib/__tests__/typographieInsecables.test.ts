import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

// ── Les espaces insécables de la typographie française (2026-10-23) ──────────
//
// Demande du fondateur (tour de l'app avant la 62ᵉ OTA, point « typographie »). Une espace
// ORDINAIRE devant « ? ! : ; » ou à l'intérieur de « » laisse le téléphone couper la ligne
// juste avant le signe : « Quand veux-tu commencer » en bout de ligne, « ? » seul en tête
// de la suivante. L'espace insécable (U+00A0) les garde ensemble. 244 corrigées le
// 2026-10-23, dans 55 fichiers ; ce test empêche qu'il en revienne.
//
// ⚠️ IL LIT L'AST, PAS LE TEXTE BRUT. Seuls comptent les nœuds de TEXTE — chaînes,
// gabarits, texte et attributs JSX. Un motif sur le fichier entier compterait aussi le
// code (`a ? b : c`) et les commentaires, et crierait au loup des centaines de fois.
// ⚠️ Dans une chaîne JS on écrit ` ` ; dans le texte ou un attribut JSX, où un
// échappement ne s'interprète pas, le caractère lui-même.

const RACINE = join(__dirname, '..', '..');
const DOSSIERS = ['app', 'components', 'lib', 'constants', 'hooks'];

/** Ce qui n'est pas du texte affiché — chacun avec sa raison. */
const EXCLUS: [RegExp, string][] = [
  [/__tests__/, 'les tests citent l’avant'],
  [/\.generated\.ts$/, 'généré depuis Ciqual : se régénère sans nous'],
  [/lib\/otaFiches\.ts$/, 'lit AGENTS.md et STORE-RELEASE.md avec ces motifs : les changer casserait `check:ota`'],
  [/lib\/sync\.ts$/, 'journaux de développement'],
  [/lib\/profileBoot\.ts$/, 'journaux de démarrage'],
  [/hooks\/useProfile\.ts$/, 'journal de démarrage'],
];

const AVANT = / [?!:;»]/g;
const APRES = /« /g;

function fichiers(dossier: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory()) fichiers(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/** Les espaces ordinaires mal placées d'un source, avec leur ligne. */
function fautes(nom: string, src: string): string[] {
  const sf = ts.createSourceFile(nom, src, ts.ScriptTarget.Latest, true, nom.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const dansConsole = (n: ts.Node) => {
    for (let p = n.parent; p; p = p.parent) if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf))) return true;
    return false;
  };
  const visiter = (n: ts.Node) => {
    const texte = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)
      || n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle
      || n.kind === ts.SyntaxKind.TemplateTail || n.kind === ts.SyntaxKind.JsxText;
    if (texte) {
      const p = n.parent;
      const estImport = p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)
        || (ts.isCallExpression(p) && p.expression.getText(sf) === 'require'));
      const brut = src.slice(n.getStart(sf), n.end);
      if (!estImport && !dansConsole(n) && (AVANT.test(brut) || APRES.test(brut))) {
        out.push(`${nom}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}  ${brut.trim().slice(0, 80)}`);
      }
      AVANT.lastIndex = 0; APRES.lastIndex = 0;
    }
    ts.forEachChild(n, visiter);
  };
  visiter(sf);
  return out;
}

const SOURCES = DOSSIERS.flatMap((d) => fichiers(join(RACINE, d)))
  .map((f) => relative(RACINE, f))
  .filter((f) => !EXCLUS.some(([r]) => r.test(f)));

describe('les textes de l’app gardent leur signe avec le mot (insécables, 2026-10-23)', () => {
  it('la sonde voit bien les fichiers de l’app — sinon elle passerait à vide', () => {
    // 198 fichiers lus le 2026-10-23.
    expect(SOURCES.length).toBeGreaterThan(150);
    expect(SOURCES).toContain('components/FirstPlanReveal.tsx');
  });

  it('🔴 aucune espace ordinaire devant ? ! : ; » ni après «', () => {
    const toutes = SOURCES.flatMap((f) => fautes(f, readFileSync(join(RACINE, f), 'utf8')));
    expect(toutes, `mettre une insécable (\\u00A0 dans une chaîne, le caractère dans le JSX) :\n${toutes.join('\n')}`).toEqual([]);
  });

  it('sait dire NON : chaîne, gabarit, texte et attribut JSX fautifs sont vus', () => {
    const sonde = [
      "const a = 'Prêt ?';",
      'const b = `Cible : ${x} kg`;',
      'const c = <Text>Quand veux-tu commencer ?</Text>;',
      'const d = <X label="« Peu importe »" />;',
    ].join('\n');
    expect(fautes('sonde.tsx', sonde)).toHaveLength(4);
  });

  it('et ne confond pas le code, les commentaires ni les journaux avec du texte', () => {
    const sonde = [
      '// Pourquoi ? Parce que : le code.',
      'const e = ok ? 1 : 2;',
      "console.warn('profil illisible : on continue');",
      "const f = 'Prêt\\u00A0?';",
      'const g = <Text>Quand veux-tu commencer ?</Text>;',
    ].join('\n');
    expect(fautes('sonde.tsx', sonde)).toEqual([]);
  });

  it('les exclusions restent nommées, une par une', () => {
    // Une exclusion par motif (« tout lib/ ») laisserait passer la prochaine phrase fautive.
    expect(EXCLUS.map(([r]) => r.source)).toHaveLength(6);
    for (const [, raison] of EXCLUS) expect(raison.length).toBeGreaterThan(10);
  });
});
