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
// R4, journal des mouvements — c'est le seul plafond qui a bougé :
//   17 → 15  en passant pd10/col07/col17 de `dairy` à `protein` sur leur yaourt.
//   15 → 16  en rendant son ancre protéine à pd02/pd06/pd08/pd15/col01/col03/col13/col19.
// La HAUSSE est assumée et ce n'est pas une régression : la duplication existait déjà,
// elle était masquée par un rôle faux. pd02 et pd06 portaient un skyr en `dairy` alors
// qu'il fait 58 à 74 % de leurs protéines ; une fois corrigé, elles rejoignent le triplet
// (petit_dej, skyr, flocons_avoine) que pd26 et pd27 occupaient déjà. Le cliquet ne dit
// pas « tu as cassé quelque chose », il dit « voilà ce que le catalogue est vraiment ».
// Les collisions ainsi révélées — skyr+avoine ×4, fromage_blanc+avoine ×3 — sont de vrais
// quasi-doublons à nettoyer, et la prochaine vague ne doit surtout pas les reproduire.
const PLAFOND = { R1: 92, R2: 78, R4: 16, R5: 22, R7: 0 } as const;

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
