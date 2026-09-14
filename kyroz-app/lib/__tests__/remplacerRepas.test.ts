import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, PROTEIN_REFS, recipeAllowed, swapMeal, VEGETAL_MAX_JOUR, VEGETAL_MAX_SEMAINE } from '../planEngine';
import { adaptRecipe, FLAG_AUDIENCE } from '../adaptRecipe';
import { getEffectiveRecipes } from '../recipes';
import { feculentsDe, ingredientsDeBase, plafondIngredient, platDuMidi, surLePouce } from '../repasHumain';
import { goutRecette, quotaGout } from '../gout';
import { DietaryRestriction, Meal, MealPlan, UserProfile, VarietyPreference } from '../types';

// ── « REMPLACER CE REPAS » RESPECTE LES RÈGLES DU PLAN QU'IL MODIFIE ─────────
//
// 🔴 Demande fondateur du 2026-09-14 : le bouton ignorait D28, D29 et D30. Il pouvait
// ramener au petit-déjeuner la poêlée de thon que le plan venait d'écarter, une collation
// de 15 minutes à la poêle, un quatrième plat végétal dans la semaine d'un omnivore, ou
// le plat du midi au dîner du même jour.
//
// Méthode : on remplace UN À UN tous les repas de vrais plans, et on vérifie que le plan
// obtenu tient encore chaque règle. Le tirage au sort du bouton (`Math.random`) est FIGÉ
// aux deux bouts de son panier — première et dernière alternative — pour que le test ne
// dépende pas de la chance.

const M4 = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const VEGETAL = new Set(PROTEIN_REFS['végétal']);
const POISSON = new Set(PROTEIN_REFS.poisson);
const proteines = (m: Meal) => m.recipe.ingredients.filter((i) => i.macro_role === 'protein' && i.ref).map((i) => i.ref!);
const toutVegetal = (m: Meal) => { const p = proteines(m); return p.length > 0 && p.every((r) => VEGETAL.has(r)); };
const principal = (m: Meal) => m.meal_type === 'lunch' || m.meal_type === 'dinner';

function profil(over: Partial<UserProfile>): UserProfile {
  return recalcProfile(makeProfile({
    sex: 'male', age: 30, weight_kg: 84, height_cm: 180,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 30 }], training_days_per_week: 4,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: [...M4],
    dietary_restrictions: [], preferred_proteins: [], variety: 'balanced', ...over,
  } as Partial<UserProfile>));
}

afterEach(() => { vi.restoreAllMocks(); });

/** Chaque repas du plan remplacé à tour de rôle, sur le plan d'ORIGINE, aux deux bouts du tirage. */
function remplacements(p: UserProfile, seed: number): { avant: MealPlan; apres: MealPlan; repas: Meal }[] {
  const avant = buildLocalPlan(p, seed);
  const out: { avant: MealPlan; apres: MealPlan; repas: Meal }[] = [];
  for (const tirage of [0, 0.999]) {
    vi.spyOn(Math, 'random').mockReturnValue(tirage);
    for (const repas of avant.meals) out.push({ avant, apres: swapMeal(p, avant, repas), repas });
    vi.restoreAllMocks();
  }
  return out;
}

const regimes = (...r: DietaryRestriction[]) => ({ dietary_restrictions: r });

describe('« Remplacer ce repas » tient les règles du plan', () => {
  it('le bouton remplace vraiment (la sonde sait dire OUI)', () => {
    const tous = remplacements(profil({}), 0);
    const changes = tous.filter(({ apres, repas }) => apres.meals.find((m) => m.id === repas.id)!.recipe.id !== repas.recipe.id);
    expect(changes.length, 'aucun repas remplacé : le test ne mesure rien').toBeGreaterThan(tous.length * 0.9);
  });

  it.each([
    ['omnivore « Peu importe »', {}],
    ['omnivore, protéines animales cochées', { preferred_proteins: ['poulet', 'bœuf', 'poisson', 'œufs', 'whey'] }],
    ['sans gluten', regimes('gluten_free')],
  ] as [string, Partial<UserProfile>][])('%s : matin, collation, même jour, féculent, plafonds, végétal', (_n, over) => {
    for (const seed of [0, 1]) {
      const p = profil(over);
      for (const { apres, repas } of remplacements(p, seed)) {
        const neuf = apres.meals.find((m) => m.id === repas.id)!;
        const quoi = `jour ${repas.day} ${repas.meal_type} : ${repas.recipe.name_fr} → ${neuf.recipe.name_fr}`;
        if (neuf.meal_type === 'breakfast') expect(platDuMidi(neuf.recipe), quoi).toBe(false);
        if (neuf.meal_type === 'snack') expect(surLePouce(neuf.recipe), quoi).toBe(true);

        const jour = apres.meals.filter((m) => m.day === repas.day);
        const ids = jour.map((m) => m.recipe.id);
        expect(new Set(ids).size, quoi).toBe(ids.length);
        const f = jour.flatMap((m) => feculentsDe(m.recipe));
        expect(new Set(f).size, `${quoi} — féculents ${f.join(', ')}`).toBe(f.length);

        const n: Record<string, number> = {};
        for (const m of apres.meals) for (const ref of ingredientsDeBase(m.recipe)) n[ref] = (n[ref] ?? 0) + 1;
        for (const [ref, k] of Object.entries(n)) expect(k, `${quoi} — ${ref} dans ${k} repas`).toBeLessThanOrEqual(plafondIngredient(ref, p));

        expect(apres.meals.filter((m) => principal(m) && toutVegetal(m)).length, quoi).toBeLessThanOrEqual(VEGETAL_MAX_SEMAINE);
        expect(jour.filter((m) => principal(m) && toutVegetal(m)).length, quoi).toBeLessThanOrEqual(VEGETAL_MAX_JOUR);
      }
    }
  });

  it('pescétarien : le remplacement garde un repas de poisson par jour', () => {
    for (const seed of [0, 1]) {
      for (const { apres, repas } of remplacements(profil(regimes('pescatarian')), seed)) {
        const jour = apres.meals.filter((m) => m.day === repas.day && principal(m));
        expect(jour.filter((m) => !proteines(m).some((r) => POISSON.has(r))).length, `jour ${repas.day}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('« Répétitif » garde le droit de remanger le même féculent (exemption D30)', () => {
    // Sonde : sur un plan « Répétitif », au moins un remplacement laisse deux fois le même
    // féculent dans la journée — la couche ne s'y applique pas, comme à la génération.
    const p = profil({ variety: 'repetitive' as VarietyPreference });
    const doublon = remplacements(p, 0).some(({ apres, repas }) => {
      const f = apres.meals.filter((m) => m.day === repas.day).flatMap((m) => feculentsDe(m.recipe));
      return new Set(f).size < f.length;
    });
    expect(doublon).toBe(true);
  });

  it('le remplacement ne sert jamais une recette déjà au menu du même jour (cas construit)', () => {
    // ⚠️ POURQUOI UN CAS CONSTRUIT. Sur des plans tirés au hasard, retirer la couche « même
    // recette le même jour » laissait le test vert : en « Équilibré » la couche « même
    // féculent » écarte déjà le plat du dîner, et en « Répétitif » le plat du dîner ne
    // tombait jamais dans le haut du panier du déjeuner. Le piège : on remplace le déjeuner
    // une première fois, on pose l'alternative OBTENUE au dîner du même jour, puis on
    // remplace de nouveau le déjeuner — sans la couche, le même tirage la resservirait.
    // « Répétitif » pour que la couche du féculent ne masque pas celle-ci.
    const p = profil({ variety: 'repetitive' as VarietyPreference, preferred_proteins: ['poulet', 'bœuf', 'poisson', 'œufs'] });
    const plan = buildLocalPlan(p, 0);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    for (let d = 1; d <= 7; d++) {
      const dejeuner = plan.meals.find((m) => m.day === d && m.meal_type === 'lunch')!;
      const premier = swapMeal(p, plan, dejeuner).meals.find((m) => m.id === dejeuner.id)!.recipe;
      const piege: MealPlan = {
        ...plan,
        meals: plan.meals.map((m) => (m.day === d && m.meal_type === 'dinner' ? { ...m, recipe: premier } : m)),
      };
      const second = swapMeal(p, piege, dejeuner).meals.find((m) => m.id === dejeuner.id)!.recipe;
      expect(second.id, `jour ${d} : « ${premier.name_fr} » resservi au déjeuner`).not.toBe(premier.id);
    }
  });

  it.each([
    ['omnivore', {}],
    // ⚠️ Chez l'omnivore, la PÉNALITÉ de goût suffit : retirer la couche « goût garanti »
    // le laissait vert. Comme à la génération (gout.test.ts), la garantie se prouve là où le
    // vivier salé du matin est mince — un végétarien sans gluten.
    ['végétarien sans gluten', regimes('vegetarian', 'gluten_free')],
  ] as [string, Partial<UserProfile>][])('%s, « salé » le matin : remplacer un petit-déjeuner garde la part promise', (_n, over) => {
    const p = profil({ ...over, gout_petit_dej: 'sale' });
    // ⚠️ LA PROMESSE NE TIENT QUE S'IL EXISTE UN PETIT-DÉJEUNER SALÉ À PROPOSER. Mesuré le
    // 2026-09-14 : un végétarien sans gluten a 17 petits-déjeuners salés au catalogue, dont
    // 14 plats du midi (retirés du matin, D30) ; les 3 autres sont le plat remplacé et deux
    // recettes mal calibrées à ces calories. Sur 2 remplacements, aucune alternative n'était
    // admissible : le moteur sert alors un autre goût, ce que le fondateur a tranché (pas de
    // plat du midi le matin, jamais un repas mal calibré). Ce cas est COMPTÉ, pas ignoré, et
    // c'est une limite de catalogue (vague de petits-déjeuners salés à commander).
    const salesAdmissibles = (repas: Meal) => {
      const cible = { kcalMeal: repas.macros.kcal, proteinMeal: repas.macros.protein_g, carbMeal: repas.macros.carbs_g, fatMeal: repas.macros.fat_g };
      return getEffectiveRecipes().filter((r) => r.id !== repas.recipe.id && r.tags.includes('breakfast')
        && recipeAllowed(r, p) && goutRecette(r) === 'sale' && !platDuMidi(r)
        && !adaptRecipe(r, cible).flags.some((f) => FLAG_AUDIENCE[f] === 'user')).length;
    };
    let verifies = 0, sansAlternative = 0;
    for (const seed of [0, 1, 2, 3]) {
      for (const { avant, apres, repas } of remplacements(p, seed)) {
        if (repas.meal_type !== 'breakfast') continue;
        const pdj = (plan: MealPlan) => plan.meals.filter((m) => m.meal_type === 'breakfast');
        const quota = quotaGout(pdj(avant).length);
        if (pdj(avant).filter((m) => goutRecette(m.recipe) === 'sale').length < quota) continue;
        const sales = pdj(apres).filter((m) => goutRecette(m.recipe) === 'sale').length;
        if (sales < quota && salesAdmissibles(repas) === 0) { sansAlternative++; continue; }
        verifies++;
        expect(sales, `jour ${repas.day} : « ${repas.recipe.name_fr} » remplacé`).toBeGreaterThanOrEqual(quota);
      }
    }
    expect(verifies, 'aucun petit-déjeuner vérifié : la sonde est aveugle').toBeGreaterThan(10);
    expect(sansAlternative, 'trop de remplacements sans alternative salée : le vivier a rétréci').toBeLessThanOrEqual(4);
  });

  it('omnivore sans « Végétal » coché : le remplacement ne ramène pas le végétal', () => {
    // Mesuré à la génération (D26) : 0 déjeuner ou dîner 100 % végétal sur ce profil. Le
    // remplacement doit rester dans ce registre tant qu'une alternative propre existe.
    const p = profil({ preferred_proteins: ['poulet', 'bœuf', 'poisson', 'œufs', 'whey'] });
    let vegetaux = 0, total = 0;
    for (const seed of [0, 1]) for (const { apres, repas } of remplacements(p, seed)) {
      if (!principal(repas)) continue;
      total++;
      if (toutVegetal(apres.meals.find((m) => m.id === repas.id)!)) vegetaux++;
    }
    expect(total).toBeGreaterThan(50);
    expect(vegetaux / total, `${vegetaux} remplacements végétaux sur ${total}`).toBeLessThanOrEqual(0.05);
  });
});
