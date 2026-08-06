import { describe, it, expect } from 'vitest';
import { lireDA, blocDe, pairesPlates, construire } from '../../scripts/design-system.mjs';

// Le générateur est un `.mjs` sans typage : on décrit ici ce qu'il rend, plutôt que
// de semer des `any` dans les assertions.
type Plat = Record<string, string | number>;
interface DA {
  sombre: Plat; clair: Plat; espacements: Plat; rayons: Plat;
  typo: Record<string, Plat>;
  accents: Record<string, Plat>;
}

// ── Le miroir du design system ne peut pas vieillir en silence ───────────────
//
// `scripts/design-system.mjs` LIT `constants/theme.ts` comme du texte (il ne peut pas
// l'importer : ce fichier tire react-native). C'est un procédé fragile PAR NATURE, et
// il a déjà échoué deux fois pendant sa propre écriture :
//
//  1. les sous-objets écrits sur UNE ligne ne rendaient qu'une clé sur trois ;
//  2. `ACCENTS` porte une annotation de type contenant des accolades — l'extracteur
//     capturait le TYPE et rendait **zéro accent**.
//
// Aucune de ces deux pannes ne lève d'erreur : elles produisent un miroir amputé,
// donc un design system qui décrit une DA incomplète, et des maquettes plausibles
// dessinées contre des valeurs qui n'existent pas. C'est exactement le défaut que la
// règle de travail nomme « une copie stockée que personne ne relit ».
//
// ➡️ Ce fichier compte ce que l'extraction trouve. Il n'est pas décoratif : retirer
// le passage par le `=` dans `blocDe` le fait rougir immédiatement.

const da = lireDA() as DA;

describe('extraction — chaque bloc attendu est trouvé ET non vide', () => {
  it.each([
    ['sombre', 15],
    ['clair', 15],
    ['espacements', 5],
    ['rayons', 5],
    ['typo', 8],
    ['accents', 6],
  ])('%s contient au moins %i entrées', (bloc, minimum) => {
    const n = Object.keys((da as any)[bloc]).length;
    expect(n, `bloc « ${bloc} » : ${n} entrée(s) extraite(s)`).toBeGreaterThanOrEqual(minimum);
  });
});

describe('les valeurs extraites sont les VRAIES', () => {
  // Quelques ancres connues : si l'extraction dérape, elle dérape ici en premier.
  it('les fonds de page', () => {
    expect(da.sombre.bg).toBe('#000000');
    expect(da.clair.bg).toBe('#F2F2F7');
  });

  it('les rayons portent leurs 5 rôles, et md/lg n\'existent pas', () => {
    expect(Object.keys(da.rayons).sort()).toEqual(['button', 'card', 'pill', 'sm', 'xl']);
    expect(da.rayons.card).toBe(22);
    expect(da.rayons.pill).toBe(999);
  });

  it('la typo rend taille ET graisse — pas seulement la taille', () => {
    // Le piège n°1 : `fontWeight: '700' as const` ne se termine pas par une virgule.
    expect(da.typo.hero.fontSize).toBe(40);
    expect(da.typo.hero.fontWeight).toBe('700');
    expect(da.typo.hero.letterSpacing).toBe(-1.4);   // et l'interlettrage est NÉGATIF
  });

  it('les 6 accents portent leurs DEUX valeurs', () => {
    // Le piège n°2 : l'annotation de type de ACCENTS contient des accolades.
    for (const [id, a] of Object.entries(da.accents) as [string, any][]) {
      expect(a.label, `${id} sans libellé`).toBeTruthy();
      expect(a.light, `${id} sans valeur claire`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(a.dark, `${id} sans valeur sombre`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(da.accents.mono.dark).toBe('#FFFFFF');
  });
});

describe('l\'extracteur résiste aux formes réelles du fichier', () => {
  it('lit un objet dont le TYPE contient des accolades', () => {
    const src = "export const X: Record<K, { a: string }> = { un: { a: 'oui' } };";
    expect(pairesPlates(blocDe(src, 'X'))).toEqual({});      // le sous-objet est neutralisé
    expect(blocDe(src, 'X')).toContain("un: { a: 'oui' }");  // mais on a bien le BON bloc
  });

  it('lit une valeur suffixée et une valeur négative', () => {
    const src = "const Y = { a: '700' as const, b: -1.4, c: 12 };";
    expect(pairesPlates(blocDe(src, 'Y'))).toEqual({ a: '700', b: -1.4, c: 12 });
  });

  it('ignore ce qui est en commentaire', () => {
    const src = "const Z = { a: '#111',   // b: '#222'\n c: '#333' };";
    expect(pairesPlates(blocDe(src, 'Z'))).toEqual({ a: '#111', c: '#333' });
  });
});

describe('le miroir produit est complet', () => {
  const pages = construire(da);

  it('les 6 pages sont générées', () => {
    expect(Object.keys(pages).sort()).toEqual([
      'accents.html', 'couleurs.html', 'espacements.html',
      'principes.html', 'rayons.html', 'typographie.html',
    ]);
  });

  it('chaque page porte son marqueur de fiche en PREMIÈRE ligne', () => {
    // Le panneau Design System indexe ses cartes sur ce commentaire : sans lui en
    // tête de fichier, la page est poussée mais n'apparaît nulle part.
    for (const [nom, html] of Object.entries(pages) as [string, string][]) {
      expect(html.split('\n')[0], `${nom}`).toMatch(/^<!-- @dsCard group="[^"]+" -->$/);
    }
  });

  it('les valeurs du code se retrouvent DANS le miroir', () => {
    // Le lien qui compte : si l'extraction marche mais que le rendu oublie une
    // valeur, le miroir ment quand même.
    expect(pages['couleurs.html']).toContain('#F2F2F7');
    expect(pages['rayons.html']).toContain('999');
    expect(pages['accents.html']).toContain('#CC6600');
    expect(pages['typographie.html']).toContain('Type.hero');
  });

  it('les principes non déductibles de la palette y sont écrits', () => {
    // Une DA n'est pas qu'un jeu de valeurs : la moitié est une règle, et une règle
    // absente du miroir sera enfreinte par la prochaine maquette.
    const p = pages['principes.html'];
    for (const regle of ['fond ne bouge jamais', 'TAILLE', 'Pas de flou', '44 pt', '1,5:1']) {
      expect(p, `principe manquant : ${regle}`).toContain(regle);
    }
  });
});
