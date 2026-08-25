import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Fond } from '../../constants/theme';

// ── « J'ai mangé » depuis la liste « Ma réserve » ───────────────────────────
//
// 🔴 CE FICHIER GARDE LA MÉMOIRE D'UN DÉFAUT MESURÉ LE 2026-08-14 (fondateur,
// capture vidéo), et il faut la garder même si le mécanisme a changé d'écran :
//
//  1. **La liste remontait sous le doigt.** Le bouton « Cuisiné » vivait SUR les
//     cartes du Frigo. Cuisiner déduit les ingrédients, donc la recette quittait
//     les réalisables et tout le dessous montait d'un cran. Mesuré au simulateur :
//     QUATRE appuis au MÊME pixel ont cuisiné QUATRE recettes différentes.
//  2. **Le bandeau de confirmation était invisible.** Posé à 28 pt du bas alors
//     que la barre d'onglets FLOTTE au-dessus du contenu (§8) : il était dessiné
//     derrière elle, lisible seulement comme une tache floue à travers le verre.
//
// ⚠️ Le premier défaut était tenu par un ORDRE GELÉ (`pantry.ts::listeStable`).
// Ce gel a été RETIRÉ le 2026-08-24 avec le déménagement du geste : le bouton ne
// vit plus sur une ligne de liste, il vit dans la FICHE de la recette, ouverte
// par-dessus tout, et la fiche se referme après. Il n'y a donc plus de bouton qui
// arrive sous un doigt : ce qui se trouve à l'endroit du tap suivant est une carte,
// et l'ouvrir est réversible. ➡️ **La protection a été retirée parce que le danger
// a disparu, pas parce qu'on l'a oubliée** — et si un jour le geste redescend sur
// une carte de liste, il faut la rétablir.

const RACINE = join(__dirname, '..', '..');
const lire = (rel: string) => readFileSync(join(RACINE, rel), 'utf8');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n').map((l) => l.replace(/(?<!:)\/\/.*$/, '')).join('\n');

const recettes = sansCommentaires(lire('app/(tabs)/recettes.tsx'));

describe('le geste ne se propose que là où il est VRAI', () => {
  it('« J\'ai mangé » n\'apparaît que sur une recette réalisable', () => {
    // Déduire une recette dont on n'a pas les ingrédients retirerait un stock au
    // hasard, sans retour arrière possible. La condition n'est donc pas un confort.
    expect(recettes).toContain('onCook={pretes.some((c) => c.recipe.id === selected.id)');
  });

  it('la déduction passe par le module, pas par un calcul recopié', () => {
    expect(recettes).toContain('deductRecipe(reserve, recipe, 1)');
    expect(recettes).toContain('savePantry(next)');
    expect(recettes).toContain('pushPantry(next)');
  });

  it('le geste est confirmé par un bandeau, jamais par un dialogue', () => {
    // Une modale demandée depuis une feuille ouverte ne s'affiche pas sur iOS
    // (CLAUDE.md §11) : le code s'exécuterait, l'écran ne bougerait pas.
    const bloc = recettes.slice(recettes.indexOf('const cuisiner = async'));
    expect(bloc.slice(0, 600)).toContain('setToast(');
    expect(bloc.slice(0, 600)).not.toMatch(/notify\(|confirm\(|Alert\./);
  });

  it('l\'ordre gelé a bien disparu du module — il ne reste pas un gel décoratif', () => {
    // Un mécanisme de protection que plus personne n'appelle se relit comme actif.
    expect(lire('lib/pantry.ts')).not.toContain('listeStable');
  });
});

describe('🔴 Aucun bandeau ne se cache derrière la barre d’onglets', () => {
  function fichiersTsx(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === '__tests__') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) fichiersTsx(p, acc);
      else if (/\.tsx$/.test(e)) acc.push(p);
    }
    return acc;
  }

  // La barre d'onglets FLOTTE au-dessus du contenu (§8). Tout ce qui se pose en
  // absolu près du bas d'un écran d'onglet doit dégager `Fond.barreOnglets`,
  // exactement comme le `paddingBottom` des listes.
  const ECRANS = fichiersTsx(join(RACINE, 'app', '(tabs)'));

  it('la sonde voit bien les écrans d’onglet', () => {
    expect(ECRANS.length).toBeGreaterThanOrEqual(5);
  });

  it('un `position: absolute` ancré en bas dégage la barre', () => {
    const fautifs: string[] = [];
    for (const f of ECRANS) {
      const src = readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
      for (const m of src.matchAll(/position:\s*'absolute'[^}]*?bottom:\s*(\d+)/g)) {
        const bas = Number(m[1]);
        if (bas < Fond.barreOnglets) {
          fautifs.push(`${f.slice(RACINE.length + 1)} : bottom ${bas} < Fond.barreOnglets (${Fond.barreOnglets})`);
        }
      }
    }
    expect(fautifs, fautifs.join('\n')).toEqual([]);
  });

  it('sait dire NON : la valeur d’avant correctif est bien vue comme fautive', () => {
    // 28, la valeur qui a caché les deux bandeaux « cuisiné » pendant des
    // semaines. Sans ce cas, la regex pourrait cesser de mordre sans qu'on le voie.
    const RE = /position:\s*'absolute'[^}]*?bottom:\s*(\d+)/;
    const avant = "toast: { position: 'absolute', left: 20, right: 20, bottom: 28, backgroundColor: t.accent }";
    expect(Number(RE.exec(avant)![1])).toBeLessThan(Fond.barreOnglets);
  });
});
