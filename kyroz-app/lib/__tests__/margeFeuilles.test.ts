import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── Le contenu d'une feuille apporte SA marge ───────────────────────────────
//
// LE DÉFAUT MESURÉ, le 2026-08-14 au simulateur : dans la feuille de la roulette
// de date de naissance, le titre « Ta date de naissance » et le bouton
// « Valider » collaient au bord de l'écran.
//
// 🔴 LA CAUSE N'EST PAS DANS `Sheet` — ET C'EST TOUT LE POINT. `Sheet` ne pose
// aucun padding horizontal : il donne une surface, chacun de ses enfants apporte
// sa marge intérieure. Ce n'est pas un oubli, c'est ce qui permet à `WeightCheckin`
// ou `RecipeEditor` d'avoir un en-tête FIXE margé et un `ScrollView` margé
// séparément. Recensés le jour du correctif : **18 composants** rendus
// directement dans un `<Sheet>`, **17** portaient `Spacing.xxl` (les sept éditeurs
// du Profil par leur `EditorShell` commun). `BirthDatePicker` était le
// dix-huitième, et le seul sans aucun padding.
// ➡️ Corriger dans `Sheet` aurait DOUBLÉ la marge des dix-sept autres.
//
// ⚠️ POURQUOI UN TEST POUR UN CAS UNIQUE. Parce qu'il était unique par accident :
// rien n'obligeait les dix-sept autres, ils l'avaient chacun décidé dans leur coin.
// C'est le motif exact des cinq passes de DA (CLAUDE.md §8) — la règle existait,
// aucun compteur ne l'exigeait, donc elle a dérivé sur le premier fichier écrit
// sans regarder ses voisins. Le dix-neuvième composant de feuille s'écrira de la
// même manière.
//
// ⚠️ CE QUE CE TEST NE SAIT PAS FAIRE : dire que la marge est JOLIE, ni qu'elle
// est posée au bon endroit dans l'arbre. Il ferme la porte au zéro absolu — le
// seul chemin par lequel la panne est réellement arrivée.

const RACINE = join(__dirname, '..', '..');

function fichiersTsx(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '__tests__') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiersTsx(p, acc);
    else if (/\.tsx$/.test(e)) acc.push(p);
  }
  return acc;
}

/** Écarte les commentaires : les notes de ces fichiers CITENT le code voisin. */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

const FICHIERS = ['app', 'components']
  .flatMap((d) => fichiersTsx(join(RACINE, d)))
  .map((f) => ({ nom: f.slice(RACINE.length + 1), code: sansCommentaires(readFileSync(f, 'utf8')) }));

/** Les composants rendus DIRECTEMENT dans un `<Sheet>`. */
function enfantsDeFeuille(): string[] {
  const noms = new Set<string>();
  for (const { code } of FICHIERS) {
    for (const bloc of code.matchAll(/<Sheet\b[\s\S]*?<\/Sheet>/g)) {
      for (const c of bloc[0].matchAll(/<([A-Z][A-Za-z]+)/g)) noms.add(c[1]);
    }
  }
  noms.delete('Sheet');
  return [...noms].sort();
}

/** Le fichier qui DÉFINIT ce composant, s'il est à nous. */
function fichierDe(nom: string) {
  return FICHIERS.find(({ code }) => new RegExp(`function\\s+${nom}\\s*\\(`).test(code));
}

const MARGE_FEUILLE = /padding(?:Horizontal)?:\s*Spacing\.xxl/;

describe('Tout contenu de feuille apporte sa marge intérieure', () => {
  const ENFANTS = enfantsDeFeuille();
  const RESOLUS = ENFANTS.map((n) => ({ nom: n, fichier: fichierDe(n) })).filter((e) => e.fichier);

  it('la sonde voit bien les enfants de feuille — sinon elle passerait à vide', () => {
    // Sans ce cas, un jour où la regex de blocs cesse de mordre, le test
    // deviendrait vert en ne mesurant plus rien — le défaut exact d'`espacementDA`
    // après la migration vers `Presse` (CLAUDE.md §8).
    expect(ENFANTS.length).toBeGreaterThanOrEqual(15);
    expect(RESOLUS.length).toBeGreaterThanOrEqual(15);
    // Et celui par qui le défaut est arrivé doit rester dans le périmètre : s'il
    // en sortait, ce fichier garderait son titre sans plus rien surveiller.
    expect(RESOLUS.map((e) => e.nom)).toContain('BirthDatePicker');
  });

  it('🔴 aucun contenu de feuille ne colle au bord de l’écran', () => {
    const nus = RESOLUS
      .filter(({ fichier }) => !MARGE_FEUILLE.test(fichier!.code))
      .map(({ nom, fichier }) => `${nom} (${fichier!.nom}) : aucun padding Spacing.xxl`);
    expect(nus, nus.join('\n')).toEqual([]);
  });

  it('sait dire NON : un enfant sans marge est bien vu comme fautif', () => {
    // Un compteur qu'on n'a jamais vu rougir ne prouve rien. On rejoue ici le
    // fichier tel qu'il était avant le correctif — root `<View style={{ gap:
    // Spacing.lg }}>`, pas une seule marge — et la sonde doit le désigner.
    const avant = readFileSync(join(RACINE, 'components', 'BirthDatePicker.tsx'), 'utf8')
      .replace('padding: Spacing.xxl, gap: Spacing.lg', 'gap: Spacing.lg');
    expect(MARGE_FEUILLE.test(sansCommentaires(avant))).toBe(false);
    // …et le fichier RÉEL, lui, passe.
    expect(MARGE_FEUILLE.test(fichierDe('BirthDatePicker')!.code)).toBe(true);
  });
});
