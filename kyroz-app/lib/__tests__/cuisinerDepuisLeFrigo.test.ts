import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listeStable, Coverage } from '../pantry';
import { Fond } from '../../constants/theme';

// ── « Cuisiné » depuis le Frigo ─────────────────────────────────────────────
//
// 🔴 LE DÉFAUT MESURÉ, le 2026-08-14 (signalé par le fondateur, capture vidéo).
// Deux défauts qui se cachaient l'un l'autre :
//
//  1. **La liste remontait sous le doigt.** Cuisiner déduit les ingrédients, donc
//     la recette quitte les réalisables et tout le dessous monte d'un cran. Mesuré
//     au simulateur : QUATRE appuis au MÊME pixel ont cuisiné QUATRE recettes
//     différentes, frigo 35 → 28 aliments, prêtes 19 → 15. La déduction est
//     irréversible — ni confirmation, ni annulation.
//  2. **Le bandeau de confirmation était invisible.** Posé à 28 pt du bas alors
//     que la barre d'onglets FLOTTE au-dessus du contenu (§8, passe matériaux) :
//     il était dessiné derrière elle, lisible seulement comme une tache floue à
//     travers le verre. Le seul retour qui disait CE QUI avait été cuisiné.
//
// ⚠️ Les deux se renforçaient : rien ne confirmait le geste, donc on retapait —
// et le second appui cuisinait autre chose.

const RACINE = join(__dirname, '..', '..');

const cov = (id: string, missing = 0): Coverage => ({
  recipe: { id, name_fr: id } as any,
  total: 4, have: 4 - missing, missing: Array.from({ length: missing }, (_, i) => ({ name: `m${i}` } as any)),
  ratio: (4 - missing) / 4,
});

describe('L’ordre se gèle, le contenu jamais', () => {
  it('sans gel, la liste courante passe telle quelle', () => {
    const courant = [cov('a'), cov('b')];
    expect(listeStable(null, courant, {}).map((c) => c.recipe.id)).toEqual(['a', 'b']);
  });

  it('🔴 une recette qui n’est plus réalisable GARDE sa place', () => {
    // C'est tout le correctif : elle reste où elle est, et sa carte dit ce qui
    // manque. La retirer ferait remonter tout le dessous — donc arriverait un
    // bouton sous le doigt qui vient de se poser.
    const gele = ['a', 'b', 'c'];
    const courant = [cov('a'), cov('c'), cov('b', 2)];   // b a perdu deux ingrédients ET changé de rang
    const out = listeStable(gele, courant, {});
    expect(out.map((c) => c.recipe.id)).toEqual(['a', 'b', 'c']);
    // …et son CONTENU est celui d'aujourd'hui, pas celui d'avant le geste.
    expect(out[1].missing.length).toBe(2);
  });

  it('🔴 la recette CUISINÉE ne s’évapore pas quand sa couverture disparaît', () => {
    // La déduction peut vider le dernier ingrédient : `cookableRecipes` ne la rend
    // plus du tout. Sans instantané, la carte qu'on vient de toucher disparaît —
    // et le trou referme la liste sous le doigt, ce qu'on cherchait à éviter.
    const gele = ['a', 'b'];
    const courant = [cov('a')];                    // b a totalement disparu
    const out = listeStable(gele, courant, { b: cov('b') });
    expect(out.map((c) => c.recipe.id)).toEqual(['a', 'b']);
  });

  it('sait dire NON : sans instantané, le trou se referme bien', () => {
    // Un test qu'on n'a jamais vu rougir ne prouve rien — on vérifie que c'est
    // BIEN l'instantané qui tient la carte, et pas autre chose.
    expect(listeStable(['a', 'b'], [cov('a')], {}).map((c) => c.recipe.id)).toEqual(['a']);
  });

  it('une nouveauté n’entre pas dans une liste gelée', () => {
    // Sinon elle s'insérerait pendant qu'on cuisine, et on retomberait sur le
    // défaut par l'autre bout. Elle apparaîtra au retour sur l'onglet (dégel).
    expect(listeStable(['a'], [cov('a'), cov('zz')], {}).map((c) => c.recipe.id)).toEqual(['a']);
  });
});

describe('L’écran gèle au PREMIER geste, et dégèle en revenant', () => {
  const src = readFileSync(join(RACINE, 'app', '(tabs)', 'garde-manger.tsx'), 'utf8')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  it('le gel se pose dans `cook`, pas au montage', () => {
    // Au montage, la liste doit suivre le frigo : un article ajouté débloque ses
    // recettes tout de suite. C'est le geste qui gèle, pas l'arrivée sur l'écran.
    expect(src).toMatch(/if\s*\(!ordreFige\)\s*setOrdreFige/);
  });

  it('le dégel est branché sur le RETOUR sur l’onglet, pas sur un minuteur', () => {
    const bloc = src.slice(src.indexOf('useFocusEffect'), src.indexOf('const persist'));
    expect(bloc).toContain('setOrdreFige(null)');
    expect(bloc).toContain('setCuisinees({})');
    // Un délai deviné rendrait la liste imprévisible — c'est la leçon d'E18.
    expect(bloc).not.toMatch(/setTimeout/);
  });

  it('la carte cuisinée montre son état À SA PLACE', () => {
    // Le bandeau du bas ne suffit pas : le retour doit être là où le doigt est.
    expect(src).toMatch(/cuisinees\[c\.recipe\.id\]\s*\?/);
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
