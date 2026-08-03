import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import raw from '../../Recette/recettes-kyroz.json';
import { RAW_RECIPES, macrosForRefIngredients } from '../recipeData';

/**
 * LES TAGS SONT MÉCANIQUES — ils se calculent, ils ne se décident pas.
 *
 * Le brief le dit depuis toujours (§6.5 : « mécanique, depuis les kcal de base. Rien
 * d'éditorial ») et, mesuré le 2026-08-03, **192 recettes sur 512 avaient un
 * `tags.objectif` qui contredisait les calories de leur propre recette**, plus 116 sur
 * `endurance`. Ce ne sont pas des champs internes : `objectif` et `sport` sont AFFICHÉS
 * sur la fiche recette (`components/RecipeDetail.tsx`, `app/(tabs)/recettes.tsx`). Une
 * recette de 470 kcal étiquetée « Prise de masse » ment à l'utilisateur au même titre
 * qu'une macro fausse (CLAUDE.md §10).
 *
 * ⚠️ Les seuils sont calculés sur les macros du MOTEUR (Ciqual quand le `ref` est mappé),
 * pas sur le repère manuel `macros_per_serving` — c'est ce que l'utilisateur mange.
 */

const SEUIL: Record<string, [number, number]> = {
  repas_complet: [560, 660], petit_dej: [450, 540], collation: [220, 280],
};
const kcalDeBase = (r: (typeof RAW_RECIPES)[number]) =>
  macrosForRefIngredients(r.ingredients.map((i) => ({ ref: i.ref, qty: i.qty }))).kcal;

describe('tags mécaniques — ils se calculent, ils ne se décident pas', () => {
  it('tags.objectif suit exactement le §6.5, sur les 512', () => {
    const faux: string[] = [];
    for (const r of RAW_RECIPES) {
      const kcal = kcalDeBase(r);
      const [bas, haut] = SEUIL[r.category];
      const attendu = kcal < bas ? ['perte_de_gras']
        : kcal <= haut ? ['perte_de_gras', 'maintien']
          : ['maintien', 'prise_de_masse'];
      const got = [...r.tags.objectif].sort().join(',');
      if (got !== [...attendu].sort().join(',')) {
        faux.push(`${r.id} (${r.category}, ${Math.round(kcal)} kcal) : « ${got} » au lieu de « ${attendu.join(',')} »`);
      }
    }
    expect(faux, `tags.objectif contredit les kcal de sa propre recette :\n  ${faux.join('\n  ')}`).toEqual([]);
  });

  /**
   * `tags.sport` — VOLONTAIREMENT PAS rendu mécanique. Mesuré, pas supposé.
   *
   * Le §5 du brief dit « `["muscu"]` par défaut ; ajoute `"endurance"` si les glucides
   * dépassent 55 % ». Appliqué tel quel, il pose `muscu` sur **512 recettes sur 512** —
   * et le départage `needMatch` (`lib/adaptRecipe.ts`) devient alors **constant** pour
   * tout profil muscu, donc inerte. Ce n'est pas une hypothèse, c'est un balayage :
   *
   * | variante | quasi-doublons | drapeaux bloquants |
   * |---|---|---|
   * | avant le chantier | 9,2 % | 0 |
   * | `objectif` ET `sport` mécaniques | 13,3 % | 1 |
   * | idem + `needMatch` désarmé | 7,1 % | 5 |
   * | **`objectif` seul, `sport` intact** | **7,9 %** | **0** |
   *
   * ➡️ La clause « muscu par défaut » détruit un diversifieur qui fonctionne. `objectif`
   * seul améliore TOUT. On garde donc `sport` tel quel — mais on l'empêche de dériver
   * davantage : les deux plafonds ci-dessous sont l'état constaté le 2026-08-03.
   *
   * ✅ **Tranché le 2026-08-03 : `sport` n'est plus AFFICHÉ.** 105 recettes montraient
   * « Endurance » sans remplir la règle des 55 % — un label qu'on ne peut pas tenir. Les
   * trois issues étaient (1) laisser mentir, (2) appliquer la règle et payer 5 drapeaux
   * bloquants, (3) retirer l'affichage. Le fondateur a pris la (3) : **un tag qu'on ne
   * montre pas n'a pas à être une promesse**, et le diversifieur reste intact — zéro coût
   * moteur. Le retrait de l'affichage est verrouillé plus bas.
   */
  it('« endurance » ne se répand pas : au plus les 114 recettes constatées', () => {
    const n = RAW_RECIPES.filter((r) => r.tags.sport.includes('endurance')).length;
    expect(n, 'un lot a élargi « endurance » — la règle des 55 % n’est toujours pas appliquée, cf. D22').toBeLessThanOrEqual(114);
  });

  // `combats` est interdit aux NOUVEAUX lots (§5 du brief) mais 51 recettes historiques le
  // portent. On ne les nettoie pas : `sportsToBuckets` produit bien `combats` pour un
  // profil sports de combat, et retirer le tag priverait ces profils de tout départage —
  // aucune recette ne le porterait plus. Ce test fige le PLAFOND : la valeur ne se répand pas.
  it('« combats » ne se répand pas : au plus les 51 recettes historiques', () => {
    const n = RAW_RECIPES.filter((r) => r.tags.sport.includes('combats')).length;
    expect(n, 'un nouveau lot a posé « combats », interdit par le §5 du brief').toBeLessThanOrEqual(51);
  });

  // Un tag vide ne départage rien : il doit rester au moins une valeur.
  it('aucune recette sans tag de sport', () => {
    const vides = RAW_RECIPES.filter((r) => !r.tags.sport.length).map((r) => r.id);
    expect(vides, `tags.sport vide : ${vides.join(', ')}`).toEqual([]);
  });

  // L'INVARIANT VISUEL laissé par le retrait de `sport` de l'affichage : la ligne de tags
  // de la fiche et de la liste ne contient plus QUE `objectif`. Si une recette pouvait
  // avoir zéro objectif, la ligne disparaîtrait pour elle — un trou dans la carte que
  // personne ne verrait avant la prod. Le §6.5 rend toujours 1 ou 2 valeurs, mais c'est
  // une propriété du calcul, pas une garantie des données : on la vérifie.
  it('chaque recette a 1 ou 2 objectifs — la ligne de tags n’est jamais vide', () => {
    const anomalies = RAW_RECIPES
      .filter((r) => r.tags.objectif.length < 1 || r.tags.objectif.length > 2)
      .map((r) => `${r.id} : ${r.tags.objectif.length} objectif(s)`);
    expect(anomalies, `ligne de tags vide ou surchargée :\n  ${anomalies.join('\n  ')}`).toEqual([]);
  });

  /**
   * `recup_jour_repos` / `rest_day_ok` : SUPPRIMÉ le 2026-08-03.
   *
   * Il a survécu DEUX fois à sa propre mort. En 2026-06 sa doc disait « stocké, non
   * utilisé » alors qu'il pilotait un départage déplaçant 30 à 36 % des repas des jours de
   * repos. En 2026-07-29 le départage a sauté — et le champ est resté « conservé en
   * données, la fiche pourra l'afficher un jour ». Plus aucun code ne le lisait, donc plus
   * personne ne pouvait voir qu'il était faux sur 152 recettes sur 512, ni que deux
   * documents en donnaient deux règles de calcul contradictoires.
   *
   * ➡️ **Un champ gardé « au cas où » ne se corrige jamais.** Ce test existe pour qu'il ne
   * revienne pas par une vague qui recopierait un vieil exemple.
   */
  it('recup_jour_repos ne réapparaît dans AUCUNE recette', () => {
    const revenants = (raw.recipes as { id: string; tags: Record<string, unknown> }[])
      .filter((r) => 'recup_jour_repos' in r.tags)
      .map((r) => r.id);
    expect(
      revenants,
      'champ mort réintroduit — relire §4.8 du brief avant de le remettre :\n  ' + revenants.join(', '),
    ).toEqual([]);
  });

  /**
   * `Recipe.sports` NE DOIT PAS ÊTRE AFFICHÉ (décision du fondateur, 2026-08-03).
   *
   * Il reste un diversifieur pour `needMatch` — utile, mesuré, et volontairement pas
   * exact : 105 recettes portent « endurance » sans remplir la règle des 55 %. Tant qu'il
   * n'est pas montré, ce n'est pas un mensonge ; le jour où quelqu'un le ré-affiche, ça
   * en redevient un **en silence**. D'où ce test, sur le patron de `noAlert.test.ts` :
   * seul un scan des sources peut tenir fermé un piège invisible à la relecture.
   *
   * ⚠️ Si tu veux vraiment l'afficher un jour, il faut D'ABORD le rendre vrai — et la
   * fiche D22 dit ce que ça coûte (0 → 5 drapeaux bloquants sur les repas servis).
   */
  it('aucun écran n’affiche `sports` d’une recette', () => {
    const racine = join(__dirname, '..', '..');
    const fichiers = (dir: string, acc: string[] = []): string[] => {
      for (const e of readdirSync(dir)) {
        if (e === 'node_modules' || e === '__tests__') continue;
        const p = join(dir, e);
        if (statSync(p).isDirectory()) fichiers(p, acc);
        else if (/\.tsx$/.test(e)) acc.push(p);
      }
      return acc;
    };
    const coupables: string[] = [];
    for (const dossier of ['app', 'components']) {
      for (const f of fichiers(join(racine, dossier))) {
        const src = readFileSync(f, 'utf8');
        // `recipe.sports.map(...)` / `item.sports?.map(...)` — le rendu, pas la lecture.
        const rend = /\.sports\s*\??\.\s*map\s*\(/.test(src);
        // …ou réimporte le libellé côté recette (celui de `lib/sport.ts` est un AUTRE
        // libellé — les sports du PROFIL — et reste parfaitement légitime).
        const reimporte = /SPORT_LABEL/.test(src) && /recipeLabels/.test(src);
        if (rend || reimporte) {
          coupables.push(f.slice(racine.length + 1).replace(/\\/g, '/'));
        }
      }
    }
    expect(
      coupables,
      'le tag sport d’une recette est de nouveau affiché — le rendre VRAI d’abord (cf. D22) :\n  ' + coupables.join('\n  '),
    ).toEqual([]);
  });

  // Le tag est une fonction des kcal, donc il ne peut pas prendre n'importe quelle forme :
  // le §6.5 interdit explicitement « perte_de_gras + prise_de_masse » et les trois ensemble.
  it('aucune combinaison interdite par le §6.5', () => {
    const interdites = RAW_RECIPES
      .filter((r) => r.tags.objectif.includes('perte_de_gras') && r.tags.objectif.includes('prise_de_masse'))
      .map((r) => `${r.id} : ${r.tags.objectif.join(',')}`);
    expect(interdites, `combinaison interdite :\n  ${interdites.join('\n  ')}`).toEqual([]);
  });
});
