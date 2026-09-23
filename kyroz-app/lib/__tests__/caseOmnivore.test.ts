import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, PROTEIN_REFS, recipeAllowed, regleVegetal } from '../planEngine';
import { getEffectiveRecipes } from '../recipes';
import { basculerRegime, normaliserRegimes, normalizeRestrictions } from '../regime';
import type { DietaryRestriction, Meal, UserProfile, VarietyPreference } from '../types';

/**
 * D36 — LA CASE « OMNIVORE », ET « SANS PORC » RETIRÉ (décisions fondateur, 2026-09-15).
 *
 * « Ceux qui cochent omnivore n'auront pas de protéines végétales. Ceux qui cochent omnivore
 * et protéines végétales auront un ratio de 8 à 10 % de végétal. » Tranché le même jour :
 * sur les DÉJEUNERS et DÎNERS (les retirer aussi du matin et de la collation multipliait par
 * 12 les repas mal calibrés), et 10 % des déjeuners et dîners. « Oublie pas de rendre cette
 * case utile » : ce fichier vérifie qu'elle change le plan, et qu'elle ne change QUE ça.
 */
const VEGETAL = new Set(PROTEIN_REFS['végétal']);
const toutVegetal = (m: Meal) => {
  const pr = m.recipe.ingredients.filter((i) => i.macro_role === 'protein' && i.ref).map((i) => i.ref!);
  return pr.length > 0 && pr.every((x) => VEGETAL.has(x));
};
const principal = (m: Meal) => m.meal_type === 'lunch' || m.meal_type === 'dinner';
const profil = (over: Partial<UserProfile>) => recalcProfile(makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], ...over }));
const semaines = (over: Partial<UserProfile>) => {
  const out: Meal[][] = [];
  for (const variety of ['repetitive', 'balanced', 'max'] as VarietyPreference[])
    for (const seed of [0, 1, 2, 3]) out.push(buildLocalPlan(profil({ variety, ...over }), seed).meals);
  return out;
};
const vegPrincipaux = (meals: Meal[]) => meals.filter((m) => principal(m) && toutVegetal(m)).length;

describe('D36 — la case « Omnivore » change le plan', () => {
  it.each([
    ['protéines cochées', { preferred_proteins: ['poulet', 'poisson'] }],
    ['« Peu importe » aux protéines', { preferred_proteins: [] }],
    ['avec halal', { preferred_proteins: [], dietary_restrictions: ['omnivore', 'halal'] as DietaryRestriction[] }],
  ] as [string, Partial<UserProfile>][])('sans « Végétal » (%s) : aucun déjeuner ni dîner végétal', (_, over) => {
    for (const meals of semaines({ dietary_restrictions: ['omnivore'], ...over })) expect(vegPrincipaux(meals)).toBe(0);
  });

  // 🔴 AMENDÉ le 2026-09-19 (décision fondateur, `docs/2026-09-19-decision-preferences-proteines.md`) :
  // plus de case « Végétal » pour qui mange de la viande. Ce test garantissait 10 % ; il garantit
  // désormais qu'un ancien compte qui l'avait cochée ne reçoit AUCUN plat principal végétal.
  it('« Végétal » coché par un omnivore (ancien compte) : aucun déjeuner ni dîner végétal', () => {
    const regle = regleVegetal(profil({ dietary_restrictions: ['omnivore'], preferred_proteins: ['poulet', 'végétal'] }));
    expect(regle?.maxSemaine).toBe(0);
    for (const meals of semaines({ dietary_restrictions: ['omnivore'], preferred_proteins: ['poulet', 'végétal'] })) expect(vegPrincipaux(meals)).toBe(0);
  });

  // 🔴 AMENDÉ le 2026-09-19 (décision fondateur : « un omnivore qui ne coche rien ne doit pas
  // avoir de végétal »). Ces deux tests disaient l'inverse — « sans la case, le même profil reçoit
  // des plats végétaux », « le plafond D29 reste celui d'avant ». La case n'a plus à être UTILE
  // contre le vide : ne rien cocher vaut désormais la case, pour qui mange de la viande.
  it('sans la case, le même profil est servi COMME la case : aucun déjeuner ni dîner végétal', () => {
    for (const meals of semaines({ dietary_restrictions: [], preferred_proteins: [] })) expect(vegPrincipaux(meals)).toBe(0);
    expect(regleVegetal(profil({ dietary_restrictions: [], preferred_proteins: [] }))?.maxSemaine).toBe(0);
  });

  it('…et « Végétal » sans la case vaut « Végétal » avec la case : zéro', () => {
    const avec = regleVegetal(profil({ dietary_restrictions: ['omnivore'], preferred_proteins: ['végétal'] }));
    const sans = regleVegetal(profil({ dietary_restrictions: [], preferred_proteins: ['végétal'] }));
    expect(sans?.maxSemaine).toBe(avec?.maxSemaine);
    expect(sans?.maxJour).toBe(avec?.maxJour);
  });

  it('« Omnivore » n’interdit aucun ingrédient : une recette de viande et un dahl restent permis', () => {
    const p = profil({ dietary_restrictions: ['omnivore'] });
    const cat = getEffectiveRecipes();
    const viande = cat.find((r) => r.ingredients.some((i) => i.ref === 'poulet_filet'))!;
    const dahl = cat.find((r) => r.id === 'rep101')!;
    expect(recipeAllowed(viande, p)).toBe(true);
    // rep101 garde son soja texturé : il reste interdit par D35, pas par la case.
    expect(recipeAllowed(dahl, p)).toBe(false);
    const lentilles = cat.find((r) => r.ingredients.some((i) => i.ref === 'lentilles_corail') && !r.ingredients.some((i) => ['soja_texture', 'tofu_ferme', 'tofu_fume'].includes(i.ref ?? '')))!;
    expect(recipeAllowed(lentilles, p)).toBe(true);
  });
});

describe('D36 — les règles de la case, et la fin de « sans porc »', () => {
  it('cocher « Omnivore » décoche végétarien, vegan et pescétarien, et l’inverse', () => {
    expect(basculerRegime(['vegan', 'gluten_free'], 'omnivore')).toEqual(['gluten_free', 'omnivore']);
    expect(basculerRegime(['omnivore', 'halal'], 'pescatarian')).toEqual(['halal', 'pescatarian']);
    expect(basculerRegime(['omnivore', 'halal'], 'lactose_free')).toEqual(['omnivore', 'halal', 'lactose_free']);
    expect(basculerRegime(['omnivore'], 'omnivore')).toEqual([]);
  });

  it('à la lecture, « sans porc » devient halal, sans doublon, et un régime sans viande l’emporte sur « Omnivore »', () => {
    expect(normaliserRegimes(['no_pork'])).toEqual(['halal']);
    expect(normaliserRegimes(['halal', 'no_pork', 'gluten_free'])).toEqual(['halal', 'gluten_free']);
    expect(normaliserRegimes(['omnivore', 'vegetarian'])).toEqual(['vegetarian']);
    const intact = { dietary_restrictions: ['omnivore', 'halal'] as DietaryRestriction[] };
    expect(normalizeRestrictions(intact)).toBe(intact);
  });

  it('halal et sans porc ouvraient les mêmes recettes : le remplacement ne change aucun plan', () => {
    const cat = getEffectiveRecipes();
    const ok = (r: DietaryRestriction) => cat.filter((x) => x.restrictions_ok?.includes(r)).map((x) => x.id).join(',');
    expect(ok('no_pork')).toBe(ok('halal'));
  });

  it('les deux écrans proposent « Omnivore » et ne proposent plus « Sans porc »', () => {
    for (const ecran of ['app/(auth)/onboarding.tsx', 'app/(tabs)/profil.tsx']) {
      const src = readFileSync(join(__dirname, '..', '..', ecran), 'utf8');
      expect(src, ecran).toContain("{ label: 'Omnivore', value: 'omnivore' }");
      expect(src, ecran).not.toContain("{ label: 'Sans porc', value: 'no_pork' }");
      // L'onboarding passe par `GrilleChoix` depuis le 2026-09-22 (`onChoisir={(v) => …}`).
      expect(src, ecran).toMatch(/basculerRegime\(restrictions, (r\.value|v)\)/);
    }
  });
});
