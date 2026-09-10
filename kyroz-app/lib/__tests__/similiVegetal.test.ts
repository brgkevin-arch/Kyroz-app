import { describe, it, expect } from 'vitest';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { restrictionsOkFor } from '../recipeDiet';

// ── LES PIÈCES VÉGÉTALES : SOURCÉES CIQUAL, ET LE GLUTEN TRANCHÉ ─────────────
//
// 🔴 CE QUI MANQUAIT (décidé le 2026-09-10). Le catalogue n'avait aucune « pièce »
// végétale hors tofu / tempeh / seitan : 121 recettes sur 512 étaient ancrées sur
// un yaourt de soja, une poudre de protéine ou du soja texturé. Un audit proposait
// de créer ces refs avec des macros « indicatives, à valider contre le fournisseur »,
// c'est-à-dire des chiffres dépendant de la marque achetée — donc invérifiables, donc
// interdits (`CLAUDE.md` : ce qui est affiché est ce qui sera servi).
//
// ⚠️ CE QUE CE TEST GARDE, ET POURQUOI IL EXISTE. L'ANSES publie déjà, pour chacun de
// ces produits, l'ALIMENT MOYEN du marché français (« préemballé », agrégé sur les
// références du commerce). C'est exactement la moyenne qu'on aurait voulu calculer, en
// mieux : mesurée. Si un de ces refs perd son mapping Ciqual, il retombe silencieusement
// sur la valeur manuelle du JSON et redevient une estimation que rien ne vérifie — sans
// que le moindre écran ne change. C'est ce glissement-là qu'on interdit ici.
//
// ⚠️ LE GLUTEN EST L'AXE QUI DÉCIDE DE LEUR UTILITÉ, pas un détail de déclaration.
// Le créneau le plus pauvre du catalogue est vegan+sans gluten (12 repas complets
// servables à une femme de 55 kg en sèche, sur 280). Quatre de ces sept pièces sont
// au BLÉ : elles n'ouvrent rien du tout à ce créneau. Trois seulement l'atteignent, et
// ce sont les moins protéinées. Écrire ce partage dans un commentaire ne suffit pas :
// la prochaine vague ajoutera un ref au blé en le croyant sans gluten, et c'est un
// cœliaque qui l'apprendra. On le compte.

/** ref → [id Ciqual attendu, sans gluten ?] */
const PIECES: Record<string, [string, boolean]> = {
  steak_soja:        ['ciqual-20914', true],  // « Galette ou pavé au soja » — soja seul
  hache_vegetal:     ['ciqual-30181', true],  // « Haché végétal à base de soja »
  saucisse_vegetale: ['ciqual-20337', true],  // « …au tofu (convient aux véganes) »
  emince_vegetal:    ['ciqual-25223', false], // « …au soja et BLÉ »
  galette_vegetale:  ['ciqual-25593', false], // « …au BLÉ et soja »
  nuggets_vegetal:   ['ciqual-25227', false], // « Nuggets…soja et BLÉ », panés
  boulette_vegetale: ['ciqual-25589', false], // « …soja ET/OU blé » → prudence
};

describe('pièces végétales (simili-carnés)', () => {
  it('les 7 existent et leurs macros viennent de Ciqual, jamais du repère manuel', () => {
    for (const [ref, [foodId]] of Object.entries(PIECES)) {
      const x = RECIPE_INGREDIENTS[ref];
      expect(x, `${ref} absent de la table`).toBeDefined();
      expect(x.food_id, `${ref} n'est plus mappé Ciqual`).toBe(foodId);
    }
  });

  it('toutes sont véganes — c’est leur raison d’être', () => {
    for (const ref of Object.keys(PIECES)) {
      expect(restrictionsOkFor([ref]), ref).toContain('vegan');
    }
  });

  it('le partage gluten est celui de la composition Ciqual, dans les deux sens', () => {
    for (const [ref, [, sansGluten]] of Object.entries(PIECES)) {
      const ok = restrictionsOkFor([ref]).includes('gluten_free');
      expect(ok, `${ref} : gluten_free attendu ${sansGluten}, obtenu ${ok}`).toBe(sansGluten);
    }
  });

  it('au moins une pièce reste servable en vegan + sans gluten', () => {
    // Le créneau le plus pauvre du catalogue. Si un jour les trois refs au soja seul
    // basculent au gluten, l'ajout entier n'aura servi que le vegan à blé — et ce test
    // le dit avant que quiconque commande une vague dessus.
    const ouvertes = Object.keys(PIECES).filter((r) => {
      const ok = restrictionsOkFor([r]);
      return ok.includes('vegan') && ok.includes('gluten_free');
    });
    expect(ouvertes.length, 'plus aucune pièce végétale sans gluten').toBeGreaterThanOrEqual(3);
  });

  it('un plafond par pièce : le moteur ne sert pas trois steaks', () => {
    for (const ref of Object.keys(PIECES)) {
      const cap = RECIPE_INGREDIENTS[ref].abs_max_qty;
      expect(cap, `${ref} sans abs_max_qty`).toBeDefined();
      expect(cap!).toBeLessThanOrEqual(200);
    }
  });
});
