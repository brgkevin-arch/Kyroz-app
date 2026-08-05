import { describe, it, expect } from 'vitest';
import raw from '../../Recette/recettes-kyroz.json';
import { findViolations, nameKey, norm, type CheckRecipe } from '../../scripts/check-doublons';

// ── Cliquet anti-doublons ────────────────────────────────────────────────────
// Le catalogue actuel VIOLE déjà ses propres règles de similarité : 8 groupes de
// recettes partagent le même set d'ingrédients, produits par des vagues successives
// qui ne se voyaient pas les unes les autres. On ne peut donc pas exiger zéro.
//
// Ce test est un CLIQUET : les compteurs ci-dessous sont l'état constaté le
// 2026-07-29, et ils ne peuvent que descendre. Toute vague qui ajoute un clone
// fait échouer la suite — c'est précisément ce qui manquait, le README du dossier
// Recette ne portant aucun invariant de similarité (cf. brief §6, règle R8).
//
// Baisser un plafond après un nettoyage est ATTENDU. Le remonter demande une
// justification écrite dans le commit.
// Journal des mouvements :
//   R4 17 → 15  en passant pd10/col07/col17 de `dairy` à `protein` sur leur yaourt.
//   R4 15 → 16  en rendant son ancre protéine à pd02/pd06/pd08/pd15/col01/col03/col13/col19.
//               HAUSSE assumée, pas une régression : la duplication existait déjà, masquée
//               par un rôle faux. pd02 et pd06 portaient un skyr en `dairy` alors qu'il fait
//               58 à 74 % de leurs protéines ; corrigé, elles rejoignent le triplet
//               (petit_dej, skyr, flocons_avoine) que pd26 et pd27 occupaient déjà. Le
//               cliquet ne dit pas « tu as cassé », il dit « voilà ce que le catalogue est ».
//   R1 92 → 85, R2 78 → 75, R5 22 → 18, R4 → 16 : différenciation des 7 clones stricts et
//               des 2 noms identiques (2026-07-29), sans supprimer une seule recette.
//   R1 85 → 81, R2 75 → 70, R4 16 → 14, R5 18 → 16 : RESSERRAGE au constaté du
//               2026-08-03. Les plafonds n'avaient pas bougé depuis le 2026-07-29 alors
//               que les vagues B7 → B9 et la réécriture de rep10 avaient fait descendre
//               les compteurs : le cliquet gardait 4 à 5 points de mou sur CHAQUE règle,
//               donc une vague pouvait rajouter quatre clones sans faire rougir un test.
//               ⚠️ Un cliquet ne se resserre pas tout seul — après un nettoyage, le
//               descendre fait partie du nettoyage.
//   R1 81 → 74, R2 70 → 71 : chantier P3.4 + les 8 recettes jamais servies (2026-08-05).
//               R1 DESCEND de 7 — donner un gras DIFFÉRENT à chacune des 20 recettes qui
//               n'en avaient pas a défait des compositions jusque-là identiques. Le choix
//               n'était pas décoratif : un premier jet uniforme (le même gras partout)
//               faisait au contraire monter R2 de 70 à 86, et c'est ce test qui l'a dit.
//               ⚠️ R2 MONTE de 1, et c'est assumé : rep18 était servie ZÉRO fois sur
//               10 752 repas, et seule la pomme de terre la remonte à 7/12 — quinoa, riz
//               complet, boulgour, pâtes, châtaigne et maïs plafonnent tous à 3/12
//               (balayés, pas supposés). Elle partage alors 4 refs avec rep133
//               (oeuf_entier, epinards, huile_olive, pomme_de_terre), dont trois qu'elle
//               partageait DÉJÀ. Le solde du chantier est de −6 violations.
// Ce qui reste est du quasi-doublon de composition, pas du clone : R4 est dominé par des
// familles saturées (whey+avoine ×6, yaourt de soja sans féculent ×8) qui se règlent en
// écrivant AILLEURS, pas en réécrivant l'existant.
const PLAFOND = { R1: 74, R2: 71, R4: 14, R5: 16, R7: 0 } as const;

const RECIPES = (raw as { recipes: unknown[] }).recipes as CheckRecipe[];

describe('anti-doublons du catalogue (cliquet)', () => {
  const violations = findViolations(RECIPES);
  const compte = (rule: keyof typeof PLAFOND) => violations.filter((v) => v.rule === rule).length;

  for (const rule of Object.keys(PLAFOND) as (keyof typeof PLAFOND)[]) {
    it(`${rule} : au plus ${PLAFOND[rule]} violation(s)`, () => {
      const n = compte(rule);
      const exemples = violations.filter((v) => v.rule === rule).slice(0, 5)
        .map((v) => `${v.ids.join('/')} — ${v.detail}`).join('\n  ');
      expect(n, `${rule} passe de ${PLAFOND[rule]} à ${n} :\n  ${exemples}`).toBeLessThanOrEqual(PLAFOND[rule]);
    });
  }

  it('un lot de test qui clone une recette existante est bien rejeté', () => {
    const cible = RECIPES.find((r) => r.category === 'repas_complet')!;
    const clone: CheckRecipe = { ...cible, id: 'rep999', name: 'Clone de test' };
    const v = findViolations([clone], RECIPES);
    expect(v.some((x) => x.rule === 'R1' && x.ids.includes('rep999'))).toBe(true);
    expect(v.some((x) => x.rule === 'R2' && x.ids.includes('rep999'))).toBe(true);
  });

  it('un lot de test sans similarité passe', () => {
    const neuve: CheckRecipe = {
      id: 'rep998', name: 'Assiette test unique sans voisin', category: 'repas_complet',
      tags: { objectif: ['maintien'] },
      ingredients: [{ ref: 'falafel', macro_role: 'protein' }, { ref: 'wrap_sans_gluten', macro_role: 'carb' }],
    };
    expect(findViolations([neuve], RECIPES)).toEqual([]);
  });
});

describe('normalisation des noms (R5)', () => {
  it('aplatit accents et ligatures — « Œufs » et « oeufs » sont le même mot', () => {
    expect(norm('Œufs brouillés – épinards')).toBe(norm('oeufs brouilles epinards'));
  });

  it('ignore les articles pour la clé de 3 mots', () => {
    expect(nameKey('Salade de pois chiches au citron')).toBe('salade pois chiches');
  });
});
