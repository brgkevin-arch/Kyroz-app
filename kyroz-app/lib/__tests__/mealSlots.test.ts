import { describe, it, expect } from 'vitest';
import {
  BUILTIN_SLOTS, MAX_MEAL_SLOTS, activeSlots, knownSlots, nextCustomSlotId,
  orderSlotIds, sanitizeSlot, slotIconType, slotLabel, slotOrFallback, slotRecipeTags, slotWeight,
  formatSlotTime, isBuiltinSlot,
} from '../mealSlots';
import { buildLocalPlan, computeDistribution, profileSignature, mealPoolSize } from '../planEngine';
import { normalizeMeals, normalizeMealSlots } from '../syncGuard';
import { isMealUpcoming, remainingMealLabels } from '../mealtime';
import { MealSlot, MEAL_ORDER, MEAL_DEFAULT_PRIORITY, UserProfile } from '../types';
import { makeProfile } from './helpers';
import { getEffectiveRecipes } from '../recipes';

// ── Créneaux de repas LIBRES (2026-08-07) ────────────────────────────────────
//
// Ce que ces tests gardent, c'est la compatibilité : les 4 créneaux intégrés ont
// gardé leurs ids, donc rien de l'existant — profils enregistrés, plans en cache,
// repas « je gère », tags de recettes — ne doit bouger. Et le garde-fou de synchro
// ne doit pas prendre un créneau créé pour une donnée abîmée.

const COLLATION_SOIR: MealSlot = { id: 'custom-1', label: 'Shaker du soir', hour: 22, minute: 0, pool: 'snack' };
const MATIN: MealSlot = { id: 'custom-2', label: 'Collation matin', hour: 10, minute: 30, pool: 'snack' };

describe('les 4 créneaux intégrés ne bougent pas', () => {
  it('gardent leurs ids — sinon les profils, plans et tags de recettes se décrochent', () => {
    expect(BUILTIN_SLOTS.map((s) => s.id)).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    for (const s of BUILTIN_SLOTS) expect(isBuiltinSlot(s.id)).toBe(true);
  });

  it('gardent leurs poids de portion (l\'ancien BASE_WEIGHT du moteur)', () => {
    const poids = Object.fromEntries(BUILTIN_SLOTS.map((s) => [s.id, slotWeight(s)]));
    expect(poids).toEqual({ breakfast: 0.9, lunch: 1.1, dinner: 1.0, snack: 0.45 });
  });

  it('gardent leurs heures (l\'ancien MEAL_HOUR de mealtime)', () => {
    const h = Object.fromEntries(BUILTIN_SLOTS.map((s) => [s.id, s.hour]));
    expect(h).toEqual({ breakfast: 8, lunch: 13, snack: 16, dinner: 20 });
  });

  it('le dîner puise dans le MÊME vivier que le déjeuner (catégorie repas_complet)', () => {
    const lunch = BUILTIN_SLOTS.find((s) => s.id === 'lunch')!;
    const dinner = BUILTIN_SLOTS.find((s) => s.id === 'dinner')!;
    expect(slotRecipeTags(dinner)).toEqual(slotRecipeTags(lunch));
    const p = makeProfile({});
    expect(mealPoolSize(p, 'dinner')).toBe(mealPoolSize(p, 'lunch'));
  });
});

describe('MEAL_ORDER est chronologique, MEAL_DEFAULT_PRIORITY ne l\'est pas', () => {
  it('MEAL_ORDER suit la journée : la collation de 16 h passe avant le dîner', () => {
    expect(MEAL_ORDER).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
  });

  // 🔴 Le piège de la bascule : `normalizeMeals` lit « je veux N repas » et prend les
  // N premiers. Sur l'ordre CHRONOLOGIQUE, N = 3 supprimerait le DÎNER.
  it('« je veux 3 repas » garde les trois repas principaux, pas la collation', () => {
    expect(MEAL_DEFAULT_PRIORITY.slice(0, 3)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(normalizeMeals({ meals: 3 as never })!.meals).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('« je veux 4 repas » rend toujours exactement les 4 intégrés', () => {
    expect(normalizeMeals({ meals: 4 as never })!.meals).toEqual([...MEAL_DEFAULT_PRIORITY]);
  });
});

describe('résolution et tri des créneaux', () => {
  it('trie la journée à l\'heure, créneaux créés compris', () => {
    const slots = knownSlots({ meal_slots: [COLLATION_SOIR, MATIN] });
    expect(slots.map((s) => s.id)).toEqual(['breakfast', 'custom-2', 'lunch', 'snack', 'dinner', 'custom-1']);
  });

  it('ignore un créneau créé qui usurpe l\'id d\'un intégré', () => {
    const pirate: MealSlot = { id: 'dinner', label: 'Pas le dîner', hour: 3, minute: 0, pool: 'snack' };
    const slots = knownSlots({ meal_slots: [pirate] });
    expect(slots.filter((s) => s.id === 'dinner')).toHaveLength(1);
    expect(slotLabel(slots, 'dinner')).toBe('Dîner');
  });

  it('sans créneau retenu, on retombe sur les 4 intégrés (profils d\'avant l\'option)', () => {
    expect(activeSlots({ meals: [] as never, meal_slots: undefined }).map((s) => s.id))
      .toEqual(BUILTIN_SLOTS.map((s) => s.id));
    expect(activeSlots({ meals: 4 as never, meal_slots: undefined })).toHaveLength(4);
  });

  it('un id inconnu garde sa place en FIN de journée au lieu d\'être jeté', () => {
    expect(orderSlotIds(BUILTIN_SLOTS, ['fantome', 'dinner', 'breakfast']))
      .toEqual(['breakfast', 'dinner', 'fantome']);
  });

  it('numérote le prochain id depuis le PLUS GRAND pris, pas depuis la longueur', () => {
    // Supprimer `custom-1` puis recréer ne doit pas réattribuer `custom-1` : le
    // nouveau créneau hériterait du repas « je gère » de l'ancien.
    expect(nextCustomSlotId([COLLATION_SOIR, MATIN])).toBe('custom-3');
    expect(nextCustomSlotId([MATIN])).toBe('custom-3');
  });

  it('borne une saisie hostile plutôt que de la refuser', () => {
    const s = sanitizeSlot({ id: 'custom-9', label: '  ', hour: 99, minute: -4, pool: 'nawak' as never });
    expect(s).toEqual({ id: 'custom-9', label: 'Collation', hour: 23, minute: 0, pool: 'snack' });
    expect(formatSlotTime({ hour: 18, minute: 30 })).toBe('18h30');
    expect(formatSlotTime({ hour: 8, minute: 0 })).toBe('8h');
  });

  it('un créneau créé emprunte l\'icône de son vivier (jamais l\'assiette par défaut)', () => {
    expect(slotIconType(COLLATION_SOIR)).toBe('snack');
    expect(slotIconType({ ...COLLATION_SOIR, pool: 'meal' })).toBe('dinner');
    expect(slotIconType({ ...COLLATION_SOIR, pool: 'breakfast' })).toBe('breakfast');
  });

  it('un créneau supprimé reste servable — poids de collation, pas zéro', () => {
    const fantome = slotOrFallback(BUILTIN_SLOTS, 'custom-42');
    expect(slotWeight(fantome)).toBe(0.45);
    expect(slotLabel(BUILTIN_SLOTS, 'custom-42')).toBe('custom-42'); // l'id brut, pas un tiret
  });
});

describe('répartition du budget', () => {
  it('inchangée sur les 4 intégrés — aucun plan existant ne doit bouger', () => {
    const d = computeDistribution([...MEAL_ORDER], 'even');
    expect(d.breakfast).toBeCloseTo(0.9 / 3.45, 6);
    expect(d.lunch).toBeCloseTo(1.1 / 3.45, 6);
    expect(d.dinner).toBeCloseTo(1.0 / 3.45, 6);
    expect(d.snack).toBeCloseTo(0.45 / 3.45, 6);
  });

  it('somme à 1 avec des créneaux créés, et rend 0 (jamais NaN) pour un créneau hors sélection', () => {
    const slots = knownSlots({ meal_slots: [COLLATION_SOIR, MATIN] });
    const d = computeDistribution(['breakfast', 'lunch', 'dinner', 'custom-1', 'custom-2'], 'even', slots);
    expect(Object.values(d).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 6);
    // `snack` est connu mais non retenu : les appelants lisent `dist[t]` pour les
    // repas FIXES, et un `undefined` y produirait un NaN silencieux.
    expect(d.snack).toBe(0);
  });

  it('l\'emphase peut porter sur un créneau créé', () => {
    const slots = knownSlots({ meal_slots: [COLLATION_SOIR] });
    const plate = computeDistribution(['lunch', 'custom-1'], 'even', slots);
    const boostee = computeDistribution(['lunch', 'custom-1'], 'custom-1', slots);
    expect(boostee['custom-1']).toBeGreaterThan(plate['custom-1']);
  });
});

describe('le moteur sert vraiment les créneaux créés', () => {
  const profil = (): UserProfile => makeProfile({
    plan_days: 2,
    meals: ['breakfast', 'lunch', 'snack', 'dinner', 'custom-1', 'custom-2'],
    meal_slots: [COLLATION_SOIR, MATIN],
  } as Partial<UserProfile>);

  it('6 repas par jour, dans l\'ordre CHRONOLOGIQUE', () => {
    const plan = buildLocalPlan(profil());
    const jour1 = plan.meals.filter((m) => m.day === 1);
    expect(jour1).toHaveLength(6);
    expect(jour1.map((m) => m.meal_type))
      .toEqual(['breakfast', 'custom-2', 'lunch', 'snack', 'dinner', 'custom-1']);
  });

  // ⚠️ Écrit d'abord en regardant les recettes SERVIES : le test passait encore en
  // neutralisant complètement le filtre de vivier (vérifié par mutation). Sur une
  // cible de collation, le moteur choisit une collation même quand tout le catalogue
  // lui est ouvert — donc la sortie ne prouvait rien sur le filtre. On mesure
  // maintenant le VIVIER lui-même, qui est déterministe.
  it('le vivier d\'un créneau créé EST celui de son type, pas le catalogue entier', () => {
    const p = profil();
    const collation = mealPoolSize(p, 'snack');
    const repas = mealPoolSize(p, 'lunch');
    const petitDej = mealPoolSize(p, 'breakfast');
    expect(mealPoolSize(p, 'custom-1')).toBe(collation);               // pool 'snack'
    // ⚠️ Comparé au catalogue ENTIER et non à `collation + repas + petitDej` : neutraliser
    // le filtre gonfle les trois ensemble, donc la somme suivait et la borne ne mordait
    // plus. Une borne relative à des valeurs qui bougent avec le défaut ne garde rien.
    expect(collation).toBeLessThan(getEffectiveRecipes().length);

    const versRepas = { ...p, meal_slots: [{ ...COLLATION_SOIR, pool: 'meal' as const }, MATIN] };
    expect(mealPoolSize(versRepas, 'custom-1')).toBe(repas);
    const versPdej = { ...p, meal_slots: [{ ...COLLATION_SOIR, pool: 'breakfast' as const }, MATIN] };
    expect(mealPoolSize(versPdej, 'custom-1')).toBe(petitDej);
  });

  it('et les recettes servies sur ce créneau portent bien le tag du vivier', () => {
    for (const seed of [0, 1, 2]) {
      const plan = buildLocalPlan({ ...profil(), plan_days: 7 }, seed);
      for (const m of plan.meals.filter((x) => x.meal_type === 'custom-1')) {
        expect(m.recipe.tags).toContain('snack');
      }
    }
  });

  it('la journée reste calée sur sa cible (le budget est bien réparti sur 6)', () => {
    const p = profil();
    const plan = buildLocalPlan(p);
    const jour1 = plan.meals.filter((m) => m.day === 1).reduce((s, m) => s + m.macros.kcal, 0);
    expect(Math.abs(jour1 - p.target_kcal) / p.target_kcal).toBeLessThan(0.05);
  });

  it('renommer un créneau ne périme PAS le plan ; déplacer son heure, si', () => {
    const p = profil();
    const renomme = { ...p, meal_slots: [{ ...COLLATION_SOIR, label: 'Caséine' }, MATIN] };
    const deplace = { ...p, meal_slots: [{ ...COLLATION_SOIR, hour: 21 }, MATIN] };
    expect(profileSignature(renomme)).toBe(profileSignature(p));
    expect(profileSignature(deplace)).not.toBe(profileSignature(p));
  });
});

describe('les repas encore à venir suivent l\'heure du créneau', () => {
  const slots = knownSlots({ meal_slots: [COLLATION_SOIR, MATIN] });
  const repas = (t: string) => ({ meal_type: t, status: undefined });

  it('un shaker de 22 h est encore devant soi à 21 h', () => {
    expect(isMealUpcoming(repas('custom-1'), 21, slots)).toBe(true);
    expect(isMealUpcoming(repas('custom-1'), 23.5, slots)).toBe(false);
  });

  it('une collation de 10h30 est déjà passée à midi', () => {
    expect(isMealUpcoming(repas('custom-2'), 12, slots)).toBe(false);
  });

  it('les libellés restants nomment le créneau tel que l\'utilisateur l\'a nommé', () => {
    const meals = [repas('dinner'), repas('custom-1')].map((m, i) => ({ ...m, id: String(i) })) as never[];
    expect(remainingMealLabels(meals, 19, slots)).toEqual(['dîner', 'shaker du soir']);
  });
});

describe('garde-fou de synchro', () => {
  it('n\'efface PAS une sélection contenant des créneaux créés', () => {
    const p = { meals: ['breakfast', 'custom-1'], meal_slots: [COLLATION_SOIR] };
    expect(normalizeMeals(p)).toBe(p); // identité : rien n'a été touché
  });

  it('efface une sélection qui désigne un créneau inexistant', () => {
    const p = { meals: ['breakfast', 'custom-9'], meal_slots: [COLLATION_SOIR] };
    expect(normalizeMeals(p)!.meals).toEqual([...MEAL_DEFAULT_PRIORITY]);
  });

  it('jette les créneaux illisibles, garde les autres, et ne répare jamais une heure', () => {
    const p = normalizeMealSlots({
      meal_slots: [
        COLLATION_SOIR,
        { id: 'custom-3', label: 'Sans heure' } as never, // pas d'heure → jeté
        { label: 'Sans id', hour: 9 } as never,           // pas d'id → jeté
        'nawak' as never,
      ],
    });
    expect(p!.meal_slots).toEqual([COLLATION_SOIR]);
  });

  it('ne remplace pas l\'objet quand tout est déjà propre (identité préservée)', () => {
    const p = { meal_slots: [COLLATION_SOIR] };
    expect(normalizeMealSlots(p)).toBe(p);
  });

  it('un meal_slots qui n\'est pas un tableau est refermé, pas propagé', () => {
    expect(normalizeMealSlots({ meal_slots: 3 as never })!.meal_slots).toBeUndefined();
  });
});

describe('le plafond', () => {
  it('laisse la place à 4 créneaux créés en plus des intégrés', () => {
    expect(MAX_MEAL_SLOTS).toBeGreaterThanOrEqual(BUILTIN_SLOTS.length);
    expect(MAX_MEAL_SLOTS - BUILTIN_SLOTS.length).toBe(4);
  });
});
