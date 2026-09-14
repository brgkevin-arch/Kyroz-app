import { describe, it, expect } from 'vitest';
import {
  ALIMENTS_VEGETAUX, FOODS_VEGETAUX_KYROZ, contientBle, contientSoja, moyenneEtiquettes, sansGluten,
} from '../etiquettesVegetales';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { REF_FOOD_ID } from '../recipeFoodMap';
import { restrictionsOkFor } from '../recipeDiet';
import { FOOD_FAMILIES } from '../avoidance';
import { REFS_SALEES } from '../gout';
import { FOODS } from '../foods';

// ── LA LISTE VÉGÉTALE DU FONDATEUR, À CÔTÉ DE CIQUAL ──────────────────────────
//
// Demande du 2026-09-14 : 19 aliments végétaux à trouver dans l'app, pour remplacer le
// soja texturé glissé en remplissage dans les recettes. Douze existaient déjà sous un
// autre nom, mappés sur l'aliment moyen de l'ANSES ; sept n'existent pas dans Ciqual et
// portent la MOYENNE des étiquettes relevées (`lib/etiquettesVegetales.ts`).
//
// Ce que ce test garde, et pourquoi :
//  · le chiffre du catalogue et celui de la recherche SONT la moyenne des étiquettes —
//    sinon on corrige une étiquette et l'assiette sert l'ancienne valeur, sans rien voir ;
//  · aucun de ces sept n'est mappé Ciqual — sinon la valeur ANSES d'un AUTRE aliment
//    gagnerait en silence (`recipeData` préfère toujours le mapping) ;
//  · le gluten, le soja et le blé se RECALCULENT depuis les étiquettes : un produit au
//    blé ajouté à la liste doit retirer le sans gluten, pas attendre qu'on y pense.

/** La liste du fondateur → le nom sous lequel on la trouve dans la recherche. */
const LISTE_FONDATEUR: Record<string, string> = {
  'Nuggets végétaux': 'Nuggets végétaux (soja et blé)',
  'Filets de poulet végétal': 'Filets de poulet végétal',
  'Émincés de poulet végétal': 'Émincés de poulet végétal (soja et blé)',
  'Aiguillettes de poulet végétal': 'Aiguillettes de poulet végétal',
  'Steak végétal': 'Steak végétal (soja)',
  'Burger végétal': 'Burger végétal (blé et soja)',
  'Steak haché végétal': 'Steak haché végétal (soja)',
  'Boulettes végétales': 'Boulettes végétales (soja et/ou blé)',
  'Falafels': 'Falafels prêts à consommer',
  'Saucisses végétales': 'Saucisses végétales (tofu)',
  'Lardons végétaux': 'Lardons végétaux',
  'Merguez végétales': 'Merguez végétales',
  'Chorizo végétal': 'Chorizo végétal',
  'Jambon végétal': 'Jambon végétal',
  'Escalope végétale': 'Escalope végétale',
  'Tofu nature': 'Tofu nature',
  'Tofu fumé': 'Tofu fumé',
  'Tofu soyeux': 'Tofu soyeux',
  'Tempeh': 'Tempeh',
};

const proche = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

describe('la liste végétale du fondateur', () => {
  it('les 19 aliments se trouvent dans la recherche, sous un seul nom chacun', () => {
    const noms = FOODS.map((f) => f.name_fr);
    for (const [demande, nom] of Object.entries(LISTE_FONDATEUR)) {
      expect(noms.filter((n) => n === nom).length, `« ${demande} » introuvable sous « ${nom} »`).toBe(1);
    }
  });

  it('les 7 absents de Ciqual existent dans le catalogue, sans mapping Ciqual', () => {
    expect(ALIMENTS_VEGETAUX.length).toBe(7);
    for (const a of ALIMENTS_VEGETAUX) {
      expect(RECIPE_INGREDIENTS[a.ref], `${a.ref} absent du catalogue`).toBeDefined();
      expect(REF_FOOD_ID[a.ref], `${a.ref} mappé Ciqual : la moyenne des étiquettes serait ignorée`).toBeUndefined();
      expect(RECIPE_INGREDIENTS[a.ref].name).toBe(a.nom);
      expect(RECIPE_INGREDIENTS[a.ref].abs_max_qty).toBe(a.absMaxQty);
      expect(a.absMaxQty).toBeLessThanOrEqual(200);
    }
  });

  it('le catalogue ET la recherche portent la moyenne des étiquettes, fibres comprises', () => {
    for (const a of ALIMENTS_VEGETAUX) {
      const m = moyenneEtiquettes(a);
      const c = RECIPE_INGREDIENTS[a.ref];
      const f = FOODS_VEGETAUX_KYROZ.find((x) => x.name_fr === a.nom)!;
      for (const [nom, attendu, cat, rech] of [
        ['kcal', m.kcal, c.per100g.kcal, f.per100g.kcal],
        ['protéines', m.protein, c.per100g.protein_g, f.per100g.protein_g],
        ['glucides', m.carbs, c.per100g.carbs_g, f.per100g.carbs_g],
        ['lipides', m.fat, c.per100g.fat_g, f.per100g.fat_g],
      ] as const) {
        const tol = nom === 'kcal' ? 0.5 : 0.05;
        expect(proche(cat, attendu, tol), `${a.ref} ${nom} : catalogue ${cat}, étiquettes ${attendu}`).toBe(true);
        expect(proche(rech, attendu, tol), `${a.ref} ${nom} : recherche ${rech}, étiquettes ${attendu}`).toBe(true);
      }
      expect(proche(c.fiber_per100g, m.fiber, 0.05), `${a.ref} fibres : ${c.fiber_per100g} ≠ ${m.fiber}`).toBe(true);
      expect(FOODS.some((x) => x.name_fr === a.nom && x.source === 'kyroz'), `${a.ref} : source Kyroz non déclarée`).toBe(true);
    }
  });

  it('chaque étiquette est sourcée et ses calories tiennent à ses macros', () => {
    for (const a of ALIMENTS_VEGETAUX) {
      expect(a.etiquettes.length, `${a.ref} sans étiquette`).toBeGreaterThan(0);
      for (const e of a.etiquettes) {
        expect(e.source, `${a.ref} / ${e.produit}`).toMatch(/^https:\/\//);
        // Atwater avec 2 kcal par gramme de fibres : une faute de frappe (un 1 en trop, une
        // colonne décalée) sort de la bande ; l'arrondi des étiquettes, non.
        const atwater = 4 * e.proteines + 4 * e.glucides + 9 * e.lipides + 2 * e.fibres;
        expect(Math.abs(atwater - e.kcal) / e.kcal, `${a.ref} / ${e.produit} : ${e.kcal} kcal pour ${atwater} calculées`).toBeLessThan(0.2);
      }
    }
  });

  it('régimes : tous végétaux, et le sans gluten recalculé depuis les étiquettes', () => {
    for (const a of ALIMENTS_VEGETAUX) {
      const ok = restrictionsOkFor([a.ref]);
      for (const r of ['vegan', 'vegetarian', 'halal', 'lactose_free'] as const) expect(ok, `${a.ref} ${r}`).toContain(r);
      expect(ok.includes('gluten_free'), `${a.ref} : sans gluten ${ok.includes('gluten_free')}, étiquettes ${sansGluten(a)}`).toBe(sansGluten(a));
    }
    // La sonde sait dire OUI et NON : au moins un de chaque aujourd'hui.
    expect(ALIMENTS_VEGETAUX.some(sansGluten)).toBe(true);
    expect(ALIMENTS_VEGETAUX.some((a) => !sansGluten(a))).toBe(true);
  });

  it('aliments évités : « soja », « gluten » et « blé » les couvrent quand une étiquette l’exige', () => {
    for (const a of ALIMENTS_VEGETAUX) {
      if (contientSoja(a)) expect(FOOD_FAMILIES.soja, `${a.ref} contient du soja`).toContain(a.ref);
      if (!sansGluten(a)) expect(FOOD_FAMILIES.gluten, `${a.ref} n'est pas sans gluten`).toContain(a.ref);
      if (contientBle(a)) expect(FOOD_FAMILIES.ble, `${a.ref} contient du blé`).toContain(a.ref);
    }
  });

  it('ils comptent comme salés pour le goût', () => {
    for (const a of ALIMENTS_VEGETAUX) expect(REFS_SALEES, a.ref).toContain(a.ref);
  });
});
