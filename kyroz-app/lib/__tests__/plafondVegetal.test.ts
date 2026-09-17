import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan } from '../planEngine';
import { getEffectiveRecipes } from '../recipes';
import { INGREDIENT_COURANT_MAX_SEMAINE, INGREDIENT_RARE_MAX_SEMAINE, POUDRES, PROTEINES_VEGETALES_RARES, plafondIngredient } from '../repasHumain';
import type { DietaryRestriction, UserProfile, VarietyPreference } from '../types';

/**
 * LES PIÈCES VÉGÉTALES SONT DES PROTÉINES RARES (trou de D32, bouché le 2026-09-17).
 *
 * D30 plafonne à 2 repas par semaine les protéines végétales travaillées chez qui mange
 * de la viande ou du poisson. Les sept pièces ajoutées le 2026-09-10 (poulet végétal,
 * jambon, chorizo, lardons, merguez, escalope) n'y avaient jamais été inscrites : elles
 * étaient donc « courantes », 5 repas par semaine — et D34 les sert en masse depuis.
 *
 * ⚠️ Le cas qui compte n'est pas la liste : c'est le test d'EXHAUSTIVITÉ ci-dessous, qui
 * rougira au prochain aliment végétal ajouté au catalogue sans plafond. La liste écrite à
 * la main est exactement ce qui a laissé passer le trou pendant une semaine.
 */
const SEPT = ['filets_poulet_vegetal', 'aiguillettes_poulet_vegetal', 'jambon_vegetal',
  'chorizo_vegetal', 'lardons_vegetaux', 'merguez_vegetale', 'escalope_vegetale'];
const profil = (r: DietaryRestriction[]) => makeProfile({ dietary_restrictions: r });

describe('les sept pièces de D32', () => {
  it.each(SEPT)('« %s » est rare chez qui mange de la viande', (ref) => {
    expect(plafondIngredient(ref, profil([]))).toBe(INGREDIENT_RARE_MAX_SEMAINE);
    expect(plafondIngredient(ref, profil(['omnivore']))).toBe(INGREDIENT_RARE_MAX_SEMAINE);
    expect(plafondIngredient(ref, profil(['pescatarian']))).toBe(INGREDIENT_RARE_MAX_SEMAINE);
  });

  it('…mais JAMAIS chez un végétarien ou un vegan : c’est la base de son assiette', () => {
    for (const ref of SEPT) {
      expect(plafondIngredient(ref, profil(['vegan']))).toBe(Infinity);
      expect(plafondIngredient(ref, profil(['vegetarian']))).toBe(Infinity);
    }
  });

  it('la sonde sait dire l’inverse : le poulet reste courant', () => {
    expect(plafondIngredient('poulet_filet', profil([]))).toBe(INGREDIENT_COURANT_MAX_SEMAINE);
    expect(plafondIngredient('riz_basmati', profil([]))).toBe(INGREDIENT_COURANT_MAX_SEMAINE);
  });
});

describe('le trou ne peut pas se rouvrir', () => {
  it('TOUTE protéine végétale servie par une recette porte un plafond', () => {
    const vegetales = new Set<string>();
    for (const r of getEffectiveRecipes())
      for (const i of r.ingredients)
        if (i.macro_role === 'protein' && i.ref && /(vegetal|vegetale|vegetaux|soja|tofu|tempeh|seitan)/.test(i.ref))
          vegetales.add(i.ref);
    expect(vegetales.size, 'la sonde doit trouver des protéines végétales').toBeGreaterThan(5);
    // ⚠️ Les POUDRES sont hors sujet, et c'est une décision mesurée de D30 : elles portent
    // la protéine du jour chez qui n'a ni laitage ni viande à portée, et les plafonner
    // faisait passer les repas mal calibrés de 2 à 18 en vegan, de 1 à 65 en sans lactose.
    const sansPlafond = [...vegetales].filter((ref) => !PROTEINES_VEGETALES_RARES.includes(ref) && !POUDRES.includes(ref));
    expect(sansPlafond, 'ajoute-les à PROTEINES_VEGETALES_RARES (lib/repasHumain.ts)').toEqual([]);
  });
});

/**
 * LE CLIQUET DE SERVICE — parce que la RÈGLE n'est pas le SERVI (mesuré le 2026-09-17).
 *
 * `plafondIngredient` dit « 2 par semaine », et le plan en sert parfois plus : ce plafond
 * est la DERNIÈRE couche d'exclusion de la génération, donc la PREMIÈRE relâchée quand le
 * vivier se vide (`planEngine`, « la plus importante d'abord »). Vérifier la règle sans
 * vérifier le service aurait déclaré le correctif tenu alors qu'il ne l'est qu'à moitié.
 *
 * Mesuré avant/après, 12 semaines par profil, sur DEUX gabarits — et les deux disent la
 * même chose. Gabarit des tests : omnivore 1 → 0 semaine au-dessus du plafond, « Végétal »
 * coché 10 → 4, pescétarien 4 → 3. Gabarit H 80 kg en sèche : « Végétal » 9 → 3 (et 81 → 65
 * repas concernés), pescétarien 4 → 1, omnivore et halal 0 dans les deux cas. Aucun drapeau
 * ajouté nulle part. Le végétarien reste à 10/12 : c'est la DÉCISION de D30 (pas de plafond
 * chez lui, sinon il n'a plus de protéine à servir) — pas un manquement.
 */
describe('ce que le plan sert vraiment', () => {
  // Cliquet posé sur le MESURÉ (2026-09-17, 12 semaines par profil) : omnivore 1 → 0,
  // « Végétal » coché 10 → 4, pescétarien 4 → 3. Il ne peut que se resserrer.
  const SEUIL = { omnivore: 0, vegetal: 4, pescetarien: 3 };
  const semainesAuDessus = (over: Partial<UserProfile>) => {
    const p = recalcProfile(makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], ...over }));
    let n = 0;
    for (const variety of ['repetitive', 'balanced', 'max'] as VarietyPreference[])
      for (const seed of [0, 1, 2, 3]) {
        const compte: Record<string, number> = {};
        for (const m of buildLocalPlan({ ...p, variety }, seed).meals)
          for (const ref of new Set(m.recipe.ingredients.filter((i) => i.macro_role === 'protein' || i.macro_role === 'carb').map((i) => i.ref)))
            if (ref && SEPT.includes(ref)) compte[ref] = (compte[ref] ?? 0) + 1;
        if (Math.max(0, ...Object.values(compte)) > INGREDIENT_RARE_MAX_SEMAINE) n++;
      }
    return n;
  };

  it('l’omnivore ne dépasse jamais', () => {
    expect(semainesAuDessus({ dietary_restrictions: [] })).toBe(SEUIL.omnivore);
  });

  it('avec « Végétal » coché et en pescétarien, le dépassement reste sous le cliquet', () => {
    expect(semainesAuDessus({ preferred_proteins: ['végétal'] })).toBeLessThanOrEqual(SEUIL.vegetal);
    expect(semainesAuDessus({ dietary_restrictions: ['pescatarian'] })).toBeLessThanOrEqual(SEUIL.pescetarien);
  });
});
