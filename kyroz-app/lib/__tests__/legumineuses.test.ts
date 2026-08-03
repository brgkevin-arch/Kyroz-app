import { describe, it, expect } from 'vitest';
import { RAW_RECIPES, RECIPE_INGREDIENTS } from '../recipeData';

/**
 * PESÉE vs INSTRUCTIONS — le contrôle qui manquait au chantier du 2026-08-03.
 *
 * La règle existait depuis toujours dans le brief (`scripts/gen-brief-lot.ts` §6.4 :
 * « les instructions doivent être cohérentes avec cette pesée ») mais RIEN ne la
 * vérifiait, et 47 recettes la violaient — 9 % du catalogue. Une légumineuse déclarée
 * `basis: 'dry'` est pesée SÈCHE (350 kcal/100 g pour le pois chiche) ; qui suit une
 * instruction de 18 minutes ouvre forcément une conserve (122 kcal/100 g) et mange
 * **130 kcal de moins en moyenne, jusqu'à 209**, que ce que la fiche annonce. Dans une
 * app dont la promesse est la précision macro, c'est un mensonge de la même famille
 * qu'un chiffre faux (CLAUDE.md §10).
 *
 * Ce que ce fichier interdit, et pourquoi c'est un TEST et pas une consigne : une
 * consigne ne survit pas à la vague suivante. Le brief le disait déjà.
 */

/**
 * Légumineuses qui ne se cuisinent PAS en une soirée sans préparation la veille.
 *
 * ⚠️ Les quatre premières sont interdites en pesée sèche, et ce n'est pas un durcissement
 * arbitraire : elles exigent un TREMPAGE de plusieurs heures, or le §6.6 du brief
 * interdit tout repos de plus de 10 minutes (« un plan affiché le matin doit être
 * cuisinable le jour même »). Une recette qui les emploie sèches est donc infaisable
 * par construction, quel que soit le `temps_min` déclaré — d'où `null`, qu'aucune
 * durée ne satisfait. Le `ref` prêt à consommer est la seule écriture possible.
 *
 * Les suivantes cuisent SANS trempage : elles restent autorisées, à condition que
 * `temps_min` dise la vérité sur la durée.
 */
const CUISSON: Record<string, { minutes: number | null; alternative?: string }> = {
  pois_chiches: { minutes: null, alternative: 'pois_chiches_conserve' },
  haricots_rouges: { minutes: null, alternative: 'haricots_rouges_conserve' },
  haricots_blancs: { minutes: null, alternative: 'haricots_blancs_conserve' },
  haricots_noirs: { minutes: null, alternative: 'haricots_noirs_conserve' },
  pois_casses: { minutes: 45 },      // se défont en 45 min, sans trempage
  feves: { minutes: 45 },            // décortiquées : 40 min, sans trempage
  lentilles_vertes: { minutes: 30 }, // 25 à 30 min, sans trempage
  lentilles_corail: { minutes: 20 }, // 15 à 20 min, sans trempage
};

/**
 * Féculents secs qui cuisent vite : aucune contrainte de durée à poser.
 * ⚠️ Cette liste n'est pas décorative — elle est ce qui rend le garde-fou OBLIGATOIRE.
 * Le test ci-dessous exige que tout `ref` `basis: 'dry'` figure dans l'une des deux
 * listes. Un nouveau `ref` sec ajouté sans être classé fait ÉCHOUER la suite au lieu de
 * passer à travers : un garde-fou qui ne couvre que les données du jour où il a été
 * écrit ne garde rien (leçon du 2026-08-02 sur les défauts dormants).
 */
const CUISSON_RAPIDE = new Set([
  'flocons_avoine', 'polenta', 'quinoa', 'nouilles_riz', 'soja_texture', 'sarrasin',
  'millet', 'riz_basmati', 'riz_complet', 'pates_completes', 'semoule_couscous',
  'boulgour', 'pates_semoule', 'nouilles_completes',
]);

/** `ref` prêts à consommer : poids servi = poids acheté, aucune cuisson préalable. */
const PRETS = ['pois_chiches_conserve', 'haricots_rouges_conserve', 'haricots_blancs_conserve',
  'haricots_noirs_conserve', 'lentilles_cuites'];

/**
 * Comment chaque légumineuse s'écrit dans une instruction. Sert à rattacher un verbe à
 * SON ingrédient : sans ça, « Rince le quinoa » dans une recette aux fèves déclenchait
 * le contrôle (vu au premier passage). Un test qui crie sur la mauvaise ligne se fait
 * désactiver, donc il vaut mieux qu'il vise juste.
 */
const NOMS: Record<string, RegExp> = {
  pois_chiches: /pois\s+chiches?/i,
  pois_casses: /pois\s+cass[ée]s?/i,
  feves: /f[èe]ves?/i,
  lentilles_vertes: /lentilles?/i,
  lentilles_corail: /lentilles?/i,
  // « haricots » nu suffit — plusieurs recettes écrivent « Ajoute haricots + poivron ».
  // Le haricot VERT est un autre ingrédient (`haricots_verts`, ni sec ni légumineuse
  // au sens de ce fichier) : on l'exclut explicitement pour ne pas le confondre.
  haricots_rouges: /haricots?(?!\s+verts?)/i,
  haricots_blancs: /haricots?(?!\s+verts?)/i,
  haricots_noirs: /haricots?(?!\s+verts?)/i,
};

describe('légumineuses — la pesée et les instructions disent la même chose', () => {
  it('tout `ref` basis:dry est classé (cuisson longue ou rapide)', () => {
    const orphelins = Object.entries(RECIPE_INGREDIENTS)
      .filter(([k, v]) => v.basis === 'dry' && !CUISSON[k] && !CUISSON_RAPIDE.has(k))
      .map(([k]) => k);
    expect(
      orphelins,
      `ref sec non classé — ajoute-le à CUISSON (avec sa durée réelle, ou null s'il faut\n`
      + `le tremper) ou à CUISSON_RAPIDE :\n  ${orphelins.join('\n  ')}`,
    ).toEqual([]);
  });

  it('aucune recette ne cuisine une légumineuse sèche en moins de temps qu’il n’en faut', () => {
    const impossibles: string[] = [];
    for (const r of RAW_RECIPES) {
      for (const i of r.ingredients) {
        const regle = CUISSON[i.ref];
        if (!regle) continue;
        if (regle.minutes === null) {
          impossibles.push(
            `${r.id} « ${r.name} » : ${i.ref} pesé SEC exige un trempage (interdit par le §6.4 `
            + `du brief) → emploie \`${regle.alternative}\``,
          );
        } else if (r.tags.temps_min < regle.minutes) {
          impossibles.push(
            `${r.id} « ${r.name} » : ${i.ref} demande ${regle.minutes} min de cuisson, `
            + `temps_min = ${r.tags.temps_min}`,
          );
        }
      }
    }
    expect(impossibles, `pesée sèche incompatible avec le temps annoncé :\n  ${impossibles.join('\n  ')}`).toEqual([]);
  });

  // Le miroir du test précédent, et le cas qui a été vu en vrai : `rep144` écrivait
  // « Rincer les haricots blancs CUITS » tout en pesant 80 g de haricots SECS. Les
  // instructions étaient justes, la pesée mentait — l'erreur ne se voit que si on
  // regarde les deux ensemble.
  //
  // ⚠️ Le marqueur n'est PAS « égoutter » : on égoutte aussi, très légitimement, des
  // légumineuses qu'on vient de cuire soi-même (« Ajoute les fèves égouttées », rep273).
  // Le seul signal fiable est l'instruction qui affirme que l'ingrédient ARRIVE cuit.
  it('aucune instruction ne décrit comme DÉJÀ CUIT un ingrédient pesé SEC', () => {
    const menteuses: string[] = [];
    for (const r of RAW_RECIPES) {
      const secs = r.ingredients.filter((i) => RECIPE_INGREDIENTS[i.ref]?.basis === 'dry' && CUISSON[i.ref]);
      for (const sec of secs) {
        for (const step of r.instructions) {
          if (!NOMS[sec.ref].test(step)) continue;
          const arriveCuit = /(en conserve|en bocal|appertis|déjà cuit)/i.test(step)
            // « les pois chiches cuits », « les haricots blancs cuits » : l'adjectif
            // collé au nom, dans les quelques mots qui suivent.
            || new RegExp(`${NOMS[sec.ref].source}(\\s+\\w+){0,2}\\s+cuite?s?\\b`, 'i').test(step);
          if (arriveCuit) menteuses.push(`${r.id} : « ${step} » alors que ${sec.ref} est pesé SEC`);
        }
      }
    }
    expect(menteuses, `instruction « prêt à consommer » sur une pesée sèche :\n  ${menteuses.join('\n  ')}`).toEqual([]);
  });

  // Et le miroir de l'autre côté : un `ref` prêt à consommer qu'on dirait à l'utilisateur
  // de CUIRE ferait peser le poids égoutté pour une cuisson qui n'a pas lieu d'être.
  it('aucune instruction ne fait cuire un ingrédient déjà cuit', () => {
    const menteuses: string[] = [];
    for (const r of RAW_RECIPES) {
      if (!r.ingredients.some((i) => PRETS.includes(i.ref))) continue;
      for (const step of r.instructions) {
        // « Cuis les pois chiches », « Cuire les lentilles » — mais PAS « mijote »,
        // qui reste vrai : une conserve mijotée dans une sauce, c'est la recette réelle.
        if (/\bcui[sxrt]\w*\s+(les?\s+)?(pois chiches?|lentilles?|haricots?)/i.test(step)) {
          menteuses.push(`${r.id} : « ${step} »`);
        }
      }
    }
    expect(menteuses, `instruction de cuisson sur un ingrédient déjà cuit :\n  ${menteuses.join('\n  ')}`).toEqual([]);
  });

  // Garde-fou de nommage, symétrique de celui de recipeMap.test.ts (« aucun basis:dry
  // nommé cuit/égoutté ») : un `ref` prêt à consommer ne doit PAS porter `basis: 'dry'`,
  // sinon le brief l'imprimerait en « SEC » et le rédacteur repartirait sur une pesée sèche.
  it('les `ref` prêts à consommer ne portent pas basis:dry', () => {
    const faux = PRETS.filter((k) => RECIPE_INGREDIENTS[k]?.basis === 'dry');
    expect(faux, `prêt à consommer marqué SEC : ${faux.join(', ')}`).toEqual([]);
  });

  it('les 5 `ref` prêts à consommer existent bien dans la table', () => {
    const manquants = PRETS.filter((k) => !RECIPE_INGREDIENTS[k]);
    expect(manquants, `ref absent : ${manquants.join(', ')}`).toEqual([]);
  });
});
