import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, recipeAllowed, SOJA_TOFU_REFS } from '../planEngine';
import { getEffectiveRecipes } from '../recipes';
import type { DietaryRestriction, Recipe, UserProfile, VarietyPreference } from '../types';

/**
 * D35 — NI SOJA TEXTURÉ NI TOFU CHEZ UN OMNIVORE (décision fondateur, 2026-09-15).
 *
 * « Je ne veux pas de PST ou TOFU chez un omnivore. » Mesuré le même jour avant la règle :
 * un omnivore en recevait 2,5 % de ses repas, et 8 % quand il avait coché « Végétal ».
 * La mise en retrait de la v50 et le plafond de D29 ne l'empêchaient donc pas.
 */
const aSojaOuTofu = (r: Recipe) => r.ingredients.some((i) => i.ref !== undefined && SOJA_TOFU_REFS.includes(i.ref));

const profil = (over: Partial<UserProfile>) => recalcProfile(makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], ...over }));

function servis(over: Partial<UserProfile>): Recipe[] {
  const out: Recipe[] = [];
  for (const variety of ['repetitive', 'balanced', 'max'] as VarietyPreference[])
    for (const seed of [0, 1, 2, 3]) out.push(...buildLocalPlan(profil({ variety, ...over }), seed).meals.map((m) => m.recipe));
  return out;
}

describe('D35 — un omnivore ne reçoit jamais de soja texturé ni de tofu', () => {
  it.each([
    ['« Peu importe »', {}],
    ['« Végétal » coché', { preferred_proteins: ['végétal'] }],
    ['halal', { dietary_restrictions: ['halal'] as DietaryRestriction[] }],
    ['sans gluten', { dietary_restrictions: ['gluten_free'] as DietaryRestriction[] }],
    ['sans lactose, femme en sèche', { sex: 'female', weight_kg: 58, height_cm: 164, dietary_restrictions: ['lactose_free'] as DietaryRestriction[] }],
  ] as [string, Partial<UserProfile>][])('%s : aucun repas servi n’en contient', (_, over) => {
    const fautifs = servis(over).filter(aSojaOuTofu).map((r) => `${r.id} « ${r.name_fr} »`);
    expect([...new Set(fautifs)]).toEqual([]);
  });

  it('le mur vaut pour toutes les recettes concernées du catalogue, pas seulement pour celles qu’un plan tire', () => {
    const omnivore = profil({});
    const concernees = getEffectiveRecipes().filter(aSojaOuTofu);
    expect(concernees.length, 'la sonde ne voit aucune recette au soja ou au tofu').toBeGreaterThan(30);
    expect(concernees.filter((r) => recipeAllowed(r, omnivore)).map((r) => r.id)).toEqual([]);
  });

  it('une recette personnalisée sans `ref` est rattrapée par son nom', () => {
    const perso = { ...getEffectiveRecipes()[0], id: 'perso', ingredients: [{ name: 'Tofu ferme', quantity_g: 150, unit: 'g' }] } as unknown as Recipe;
    expect(recipeAllowed(perso, profil({}))).toBe(false);
  });
});

describe('…et la règle ne touche que qui mange de la viande', () => {
  it.each([
    ['vegan', ['vegan']],
    ['végétarien', ['vegetarian']],
    ['pescétarien', ['pescatarian']],
  ] as [string, DietaryRestriction[]][])('%s : les recettes au tofu restent permises', (_, dietary_restrictions) => {
    const p = profil({ dietary_restrictions });
    const tofu = getEffectiveRecipes().filter(aSojaOuTofu).filter((r) => recipeAllowed(r, p));
    expect(tofu.length).toBeGreaterThan(0);
  });

  it('la sonde sait dire OUI : un végane reçoit bien du tofu dans ses plans', () => {
    expect(servis({ dietary_restrictions: ['vegan'] }).some(aSojaOuTofu)).toBe(true);
  });
});
