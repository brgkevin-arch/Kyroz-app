import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';

// ── UN BOUTON NE CONTIENT PAS UN BOUTON ──────────────────────────────────────
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, et il est de MA main : le 2026-09-02, `Presse`
// a reçu `accessibilityRole="button"` par défaut (132 pressables sur 144 n'en
// déclaraient aucun). Correct pour 142 sites. Faux pour les DEUX qui sont des CARTES
// CONTENANT LEURS PROPRES BOUTONS — `MealCard` (« Mes courses », cœur, « J'ai
// cuisiné ») et la carte de recette (favori). Elles sont devenues des `<button>`
// contenant des `<button>` : HTML invalide sur le web, et un anti-pattern
// d'accessibilité sur les DEUX plateformes — un lecteur d'écran ne sait pas exprimer
// une commande imbriquée dans une commande.
//
// ⚠️ CE QUE ÇA A COÛTÉ AVANT D'ÊTRE VU, et c'est la vraie leçon : `npm test` était
// VERT (2077 tests), l'arbre d'accessibilité de /login que j'avais vérifié était
// PARFAIT — mais je n'avais regardé qu'un écran SANS imbrication. Le bandeau d'erreur
// React recouvrait la barre d'onglets sur l'écran Plan ; `test/store-assets.mjs` ne
// pouvait donc plus changer d'onglet, et il a produit QUATRE captures de fiche store
// IDENTIQUES en annonçant « capture : 2-recettes », « capture : 3-courses »… et en
// sortant avec le code 0. Un contrôle vert qui photographie quatre fois le même écran.
//
// ➡️ La règle : un `<Presse>` qui en contient un autre DOIT céder son rôle. Les
// boutons intérieurs gardent le leur.

const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

/** Tous les écrans et composants, sans les tests. */
function fichiers(): string[] {
  return globSync('{app,components}/**/*.tsx', { cwd: RACINE }).map((f) => String(f));
}

/**
 * Les `<Presse>` OUVRANTS qui en contiennent un autre, avec le rôle qu'ils déclarent.
 *
 * ⚠️ Lecture LEXICALE (une pile sur les balises du fichier). Elle ne voit pas une
 * imbrication qui traverse deux fichiers — une carte d'un écran qui rendrait un
 * composant lui-même pressable. C'est une limite à dire, pas à cacher : ce test
 * couvre la forme qui a mordu, pas toutes les formes possibles.
 */
function conteneursPressables(src: string): { balise: string; role: string | null }[] {
  const sortie: { balise: string; role: string | null }[] = [];
  const pile: { balise: string; aUnEnfant: boolean }[] = [];

  // ⚠️ PAS DE `[^>]*>` POUR LIRE UNE BALISE. Première version faite ainsi : elle
  // coupait `<Presse style={[s.recipe, layout.columns > 1 && …]}` sur le `>` de la
  // COMPARAISON, donc bien avant `accessibilityRole`. Résultat, elle déclarait
  // fautive une carte déjà corrigée — un test rouge qui accuse le code alors que
  // c'est la sonde qui s'arrête trop tôt, exactement le défaut consigné dans
  // `murRefusMaintien.test.ts`. On lit donc la balise en suivant les accolades et
  // les chaînes, comme JSX les lit.
  const finDeBalise = (i: number): { fin: number; auto: boolean } => {
    let accolades = 0;
    let quote: string | null = null;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') { accolades++; continue; }
      if (c === '}') { accolades--; continue; }
      if (c === '>' && accolades === 0) return { fin: j, auto: src[j - 1] === '/' };
    }
    return { fin: src.length - 1, auto: false };
  };

  for (let i = 0; i < src.length; i++) {
    if (src.startsWith('</Presse>', i)) {
      const ferme = pile.pop();
      if (ferme?.aUnEnfant) {
        const role = ferme.balise.match(/accessibilityRole=["{]([^"}]+)/);
        sortie.push({ balise: ferme.balise, role: role ? role[1] : null });
      }
      i += '</Presse>'.length - 1;
      continue;
    }
    if (!src.startsWith('<Presse', i) || /[A-Za-z0-9_]/.test(src[i + 7] ?? '')) continue;

    const { fin, auto } = finDeBalise(i);
    const balise = src.slice(i, fin + 1);
    // Marquer les parents D'ABORD : un enfant auto-fermant est un enfant. La
    // première version sautait ces balises avant cette ligne, donc une carte dont
    // le seul enfant pressable est auto-fermant passait inaperçue.
    for (const p of pile) p.aUnEnfant = true;
    if (!auto) pile.push({ balise, aUnEnfant: false });
    i = fin;
  }
  return sortie;
}

describe('un Presse qui en contient un autre cède son rôle', () => {
  it('aucun conteneur pressable ne reste annoncé comme bouton', () => {
    const fautifs: string[] = [];
    for (const rel of fichiers()) {
      const src = sansCommentaires(readFileSync(join(RACINE, rel), 'utf8'));
      for (const { role } of conteneursPressables(src)) {
        // `null` = pas de rôle déclaré → `Presse` pose `'button'` par défaut, donc
        // un bouton imbriqué. C'est le cas par défaut qui est fautif, pas seulement
        // un `"button"` écrit à la main.
        if (role === null || role === 'button') {
          fautifs.push(`${rel} — rôle « ${role ?? 'aucun (donc button par défaut)'} »`);
        }
      }
    }
    expect(fautifs, `Presse imbriqué annoncé comme bouton :\n${fautifs.join('\n')}`).toEqual([]);
  });

  it('la sonde SAIT voir une imbrication — sinon elle serait verte sur du vide', () => {
    // Sans ce contrôle, une regex cassée rendrait « aucun fautif » pour toujours.
    const faux = '<Presse onPress={a}><Presse onPress={b}><Text/></Presse></Presse>';
    expect(conteneursPressables(faux)).toEqual([{ balise: '<Presse onPress={a}>', role: null }]);

    const bon = '<Presse onPress={a} accessibilityRole="none"><Presse onPress={b}/></Presse>';
    expect(conteneursPressables(bon)[0].role).toBe('none');

    // Deux pressables CÔTE À CÔTE ne sont pas imbriqués : la sonde ne doit pas
    // les compter, sinon elle interdirait la forme la plus courante de l'app.
    expect(conteneursPressables('<Presse onPress={a}/><Presse onPress={b}/>')).toEqual([]);
  });
});
