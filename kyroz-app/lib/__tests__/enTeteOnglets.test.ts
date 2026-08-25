import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── LE GRAND TITRE VIENT EN PREMIER (2026-08-25, décision fondateur) ────────
//
// « Je veux le gros titre de l'onglet en haut et ne pas avoir les détails du stock
// au-dessus. »
//
// La règle d'avant était écrite dans `recettes.tsx` et se voulait raisonnée :
// « le chiffre pose le contexte, le mot reste la chose la plus grosse de l'écran ».
// Elle passait à côté de l'ordre de LECTURE — le chiffre était petit, mais il était
// PREMIER. Ouvrir la Réserve commençait donc par « 59 aliments · 28 au frais · 31 au
// sec », trois nombres avant le nom de l'écran, sur un inventaire qu'on ouvre
// justement pour regarder ce qu'il contient.
//
// ⚠️ CE QU'IL FAUT COMPTER N'EST PAS « il n'y a plus de compteur » mais **l'ORDRE** :
// deux écrans gardent une ligne sous leur titre (la date du Plan, le prénom du
// Profil), et ils ont raison de la garder — ce ne sont pas des décomptes. Le test
// porte donc sur ce qui vient AVANT le titre, pas sur ce qui vient après.
//
// ⚠️ Et il porte sur les CINQ onglets. Une règle de DA appliquée à trois écrans sur
// cinq est exactement la situation d'avant le repli du grand titre (CLAUDE.md §8) :
// deux comportements pour le même objet, dans la même barre d'onglets.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n').map((l) => l.replace(/(?<!:)\/\/.*$/, '')).join('\n');

const ONGLETS = ['plan', 'courses', 'reserve', 'recettes', 'profil'];

/** Le bloc d'en-tête d'un écran : de `style={s.header}` à la BALISE du grand titre.
 *  ⚠️ On coupe au `<Text` qui PORTE le titre, pas à `s.h1` : sinon la balise du titre
 *  elle-même tombe dans la tranche et le test s'accuse lui-même (première version,
 *  rouge sur deux écrans parfaitement conformes). */
function avantLeTitre(src: string): string {
  const debut = src.indexOf('style={s.header}');
  const titre = src.indexOf('s.h1', debut);
  if (debut < 0 || titre < 0) return '';
  const baliseDuTitre = src.lastIndexOf('<Text', titre);
  return src.slice(debut, Math.max(debut, baliseDuTitre));
}

describe('Le grand titre ouvre chaque onglet', () => {
  it('la sonde trouve bien un en-tête et un titre sur les cinq', () => {
    // Sans ce cas, un écran qui renommerait `s.header` sortirait du test en silence
    // — et le test passerait au vert en ne mesurant plus rien (le défaut
    // d'`espacementDA` après la migration `Presse`).
    for (const o of ONGLETS) {
      const src = sansCommentaires(lire(`app/(tabs)/${o}.tsx`));
      expect(src.indexOf('style={s.header}'), `${o} : pas de bloc d'en-tête`).toBeGreaterThan(-1);
      expect(src.indexOf('s.h1'), `${o} : pas de grand titre`).toBeGreaterThan(-1);
    }
  });

  it('🔴 rien ne se lit AVANT le grand titre', () => {
    const fautifs: string[] = [];
    for (const o of ONGLETS) {
      const bloc = avantLeTitre(sansCommentaires(lire(`app/(tabs)/${o}.tsx`)));
      // Un `<Text>` posé avant le titre, c'est une ligne qui se lit avant le nom de
      // l'écran — quel que soit son style.
      if (/<Text/.test(bloc)) fautifs.push(`${o} : un texte précède le grand titre`);
    }
    expect(fautifs, fautifs.join('\n')).toEqual([]);
  });

  it('sait dire NON : l’en-tête d’avant correctif est bien vu comme fautif', () => {
    // La forme exacte que portaient Réserve, Recettes et Courses jusqu'au 2026-08-25.
    const avant = `<View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={s.sub}>59 aliments</Text>
        <Text style={s.h1}>Réserve</Text>`;
    expect(/<Text/.test(avantLeTitre(avant))).toBe(true);
  });

  it('aucun onglet ne réaffiche un décompte sous son titre', () => {
    // Le compteur ne doit pas RÉAPPARAÎTRE en dessous : le fondateur a tranché sa
    // suppression, pas son déménagement. Ce qui subsiste sous un titre est nommé ici,
    // et rien d'autre ne doit s'y ajouter sans décision.
    const sousLeTitre: Record<string, RegExp | null> = {
      plan: /s\.date/,        // la date du jour — pas un décompte
      profil: /s\.sub/,       // le prénom — la seule chose de l'écran écrite nulle part ailleurs
      courses: null,
      reserve: null,
      recettes: null,
    };
    for (const o of ONGLETS) {
      const src = sansCommentaires(lire(`app/(tabs)/${o}.tsx`));
      const titre = src.indexOf('s.h1');
      const apres = src.slice(titre, titre + 400);
      const attendu = sousLeTitre[o];
      if (attendu) expect(attendu.test(apres), `${o} : la ligne attendue sous le titre a disparu`).toBe(true);
      else expect(/s\.sub/.test(apres), `${o} : un sous-titre est réapparu sous le grand titre`).toBe(false);
    }
  });
});

describe('Recettes — deux listes, pas un filtre de plus', () => {
  const recettes = sansCommentaires(lire('app/(tabs)/recettes.tsx'));

  it('le sélecteur existe et porte les deux listes', () => {
    expect(recettes).toContain("{ label: 'Catalogue', value: 'catalogue' }");
    expect(recettes).toContain("{ label: 'Réalisable', value: 'reserve' }");
  });

  it('🔴 « Réalisable » n’est plus une puce parmi les créneaux', () => {
    // C'était le défaut : deux questions rangées comme une seule. Les puces
    // répondent à « quel genre de plat ? », la réserve à « qu'est-ce que je peux
    // faire ce soir ? » — et la seconde disparaissait dans la rangée horizontale.
    expect(recettes).toMatch(/const TAGS = \['Tout', 'fav'/);
    expect(recettes).not.toMatch(/const TAGS = \[[^\]]*'reserve'/);
  });

  it('les puces de créneau ne sortent que sur le catalogue', () => {
    // Filtrer « Réalisable » par créneau ferait disparaître des plats réalisables
    // sans rien dire — un plafond muet, ce que le dépôt s'interdit.
    expect(recettes).toContain('{!surReserve && (');
  });
});
