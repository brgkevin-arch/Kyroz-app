import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, PROTEIN_REFS, regleVegetal } from '../planEngine';
import { DietaryRestriction, Meal, UserProfile, VarietyPreference } from '../types';

// ── UNE JOURNÉE QUI RESSEMBLE À UNE JOURNÉE (D29) ────────────────────────────
//
// 🔴 LU DANS LE CARNET DES MENUS le 2026-09-13 : l'omnivore qui répond « Peu importe »
// aux protéines ouvrait sa semaine sur un lundi 100 % végétal (edamame matin, midi et
// soir), le pescétarien passait une journée sur deux sans poisson ni au déjeuner ni au
// dîner, et « répétitif » servait le même bœuf-wok au déjeuner PUIS au dîner.
// Décision fondateur, le même jour :
//   · omnivore (« Peu importe » compris, sans lactose, sans gluten) : au plus 3 déjeuners
//     ou dîners 100 % végétaux par semaine ;
//   · halal et sans porc : comme un omnivore qui a coché ses protéines ;
//   · pescétarien : au plus un déjeuner ou dîner sans poisson par jour, végétarien et pas
//     forcément végan ;
//   · « Végétal » coché : aucun plafond.
// Mesuré (3 corps × 3 objectifs × 3 variétés × 4 tirages, avant → après) :
//   omnivore « Peu importe », semaines au-delà de 3 plats végétaux   82/108 → 0/108
//   pescétarien, jours sans poisson ni midi ni soir                 371/756 → 0/756
//   jours avec la même recette deux fois (12 profils)                   232 → 1
//   repas mal calibrés (12 profils)                                      95 → 86

const M4 = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const VEGETAL = new Set(PROTEIN_REFS['végétal']);
const POISSON = new Set(PROTEIN_REFS.poisson);

const proteines = (m: Meal) => m.recipe.ingredients.filter((i) => i.macro_role === 'protein' && i.ref).map((i) => i.ref!);
const toutVegetal = (m: Meal) => { const p = proteines(m); return p.length > 0 && p.every((r) => VEGETAL.has(r)); };
const avecPoisson = (m: Meal) => proteines(m).some((r) => POISSON.has(r));
const principal = (m: Meal) => m.meal_type === 'lunch' || m.meal_type === 'dinner';

function profil(over: Partial<UserProfile>): UserProfile {
  return recalcProfile(makeProfile({
    sex: 'male', age: 30, weight_kg: 84, height_cm: 180,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 30 }], training_days_per_week: 4,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: [...M4],
    dietary_restrictions: [], preferred_proteins: [], ...over,
  } as Partial<UserProfile>));
}

/** 3 objectifs × 3 variétés × 2 tirages : plan canonique et premier « Nouveau plan ». */
function semaines(over: Partial<UserProfile>): Meal[][] {
  const out: Meal[][] = [];
  for (const goal of ['cut', 'maintain', 'lean_bulk'] as const)
    for (const variety of ['repetitive', 'balanced', 'max'] as VarietyPreference[])
      for (const seed of [0, 1]) out.push(buildLocalPlan(profil({ goal, variety, ...over }), seed).meals);
  return out;
}

const jour = (meals: Meal[], d: number) => meals.filter((m) => m.day === d);
const regimes = (...r: DietaryRestriction[]) => ({ dietary_restrictions: r });

describe('qui mange de la viande, sans « Végétal » coché : AUCUN déjeuner ni dîner 100 % végétal', () => {
  // 🔴 Décision fondateur du 2026-09-19 : « un omnivore qui ne coche rien ne doit pas avoir de
  // végétal ». Jusque-là ces profils avaient le plafond souple de D29 (3 par semaine, 1 par jour)
  // et, en « Répétitif », pouvaient recevoir trois fois le même poulet végétal. Ils reçoivent
  // désormais ce que reçoit la case « Omnivore » (D36) : zéro. Le petit-déjeuner et la collation
  // ne comptent pas, comme pour la case.
  it.each([
    ['« Peu importe »', {}],
    ['sans lactose', regimes('lactose_free')],
    ['sans gluten', regimes('gluten_free')],
    ['halal', regimes('halal')],
    ['sans porc', regimes('no_pork')],
  ] as [string, Partial<UserProfile>][])('%s', (_nom, over) => {
    expect(regleVegetal(profil(over))?.maxSemaine).toBe(0);
    for (const meals of semaines(over)) {
      const veg = meals.filter((m) => principal(m) && toutVegetal(m));
      expect(veg.map((m) => `J${m.day} ${m.recipe.id}`), 'plats principaux végétaux').toEqual([]);
    }
  });

  it('la sonde sait dire OUI : chez un végétarien, le même compteur voit bien des plats végétaux', () => {
    // Sans ce cas, un compteur aveugle (qui ne reconnaîtrait aucun plat végétal) passerait
    // le test ci-dessus.
    const vus = semaines(regimes('vegetarian')).reduce((s, meals) => s + meals.filter((m) => principal(m) && toutVegetal(m)).length, 0);
    expect(vus).toBeGreaterThan(0);
  });

  it('« Végétal » coché sans régime : comme la case Omnivore + Végétal, 10 % des déjeuners et dîners', () => {
    expect(regleVegetal(profil({ preferred_proteins: ['poulet', 'végétal'] }))?.maxSemaine).toBe(1);
    for (const meals of semaines({ preferred_proteins: ['poulet', 'végétal'] }))
      expect(meals.filter((m) => principal(m) && toutVegetal(m)).length).toBeLessThanOrEqual(1);
  });

  it('halal et sans porc « Peu importe » sont servis comme un omnivore qui a coché ses protéines', () => {
    // Mesuré : 0,5 plat végétal par semaine en moyenne, contre 2,8 pour l'omnivore
    // « Peu importe », qui n'a que le plafond.
    for (const r of ['halal', 'no_pork'] as DietaryRestriction[]) {
      const toutes = semaines(regimes(r));
      const moyenne = toutes.reduce((s, meals) => s + meals.filter((m) => principal(m) && toutVegetal(m)).length, 0) / toutes.length;
      expect(moyenne, r).toBeLessThanOrEqual(1);
    }
  });
});

describe('pescétarien : au plus un déjeuner ou dîner sans poisson par jour', () => {
  it.each([
    ['pescétarien', regimes('pescatarian')],
    ['pescétarien sans gluten', regimes('pescatarian', 'gluten_free')],
  ] as [string, Partial<UserProfile>][])('%s', (_nom, over) => {
    for (const meals of semaines(over))
      for (let d = 1; d <= 7; d++) {
        const sansPoisson = jour(meals, d).filter((m) => principal(m) && !avecPoisson(m)).length;
        expect(sansPoisson, `jour ${d}`).toBeLessThanOrEqual(1);
      }
  });

  it('le repas sans poisson peut être végétarien, pas seulement végan', () => {
    // La règle compte « sans poisson », pas « 100 % végétal » : une omelette y entre.
    const regle = regleVegetal(profil(regimes('pescatarian')))!;
    expect(regle.maxJour).toBe(1);
    expect(regle.maxSemaine).toBe(Infinity);
    const omelette = semaines(regimes('pescatarian')).flat()
      .find((m) => principal(m) && proteines(m).some((r) => r === 'oeuf_entier' || r === 'blanc_oeuf') && !avecPoisson(m));
    if (omelette) expect(regle.ids.has(omelette.recipe.id)).toBe(true);
  });
});

describe('aucune règle végétale pour qui mange végétal', () => {
  it.each([
    ['végétarien', regimes('vegetarian')],
    ['vegan', regimes('vegan')],
  ] as [string, Partial<UserProfile>][])('%s', (_nom, over) => {
    expect(regleVegetal(profil(over))).toBeNull();
  });
});

describe('jamais la même recette deux fois le même jour', () => {
  // ⚠️ Vegan sans gluten est écarté À DESSEIN : mesuré, 1 journée sur 756 n'a aucun autre
  // plat propre à servir, et la règle ne fabrique jamais un repas mal calibré.
  it.each([
    ['omnivore « Peu importe »', {}],
    ['omnivore, protéines animales cochées', { preferred_proteins: ['poulet', 'bœuf', 'poisson', 'œufs', 'whey'] }],
    ['pescétarien', regimes('pescatarian')],
    ['végétarien', regimes('vegetarian')],
    ['vegan', regimes('vegan')],
  ] as [string, Partial<UserProfile>][])('%s', (_nom, over) => {
    for (const meals of semaines(over))
      for (let d = 1; d <= 7; d++) {
        const ids = jour(meals, d).map((m) => m.recipe.id);
        expect(new Set(ids).size, `jour ${d} : ${ids.join(', ')}`).toBe(ids.length);
      }
  });
});
