import { describe, it, expect } from 'vitest';
import { buildLocalPlan, carryTracking, computeDailyTotals, resetTracking } from '../planEngine';
import { recalcProfile } from '../tdee';
import type { MealPlan, UserProfile } from '../types';

/**
 * CE QUI A ÉTÉ MANGÉ NE SE RE-PLANIFIE PAS (2026-08-02).
 *
 * Troisième étage de la chaîne A21→A25, et le premier qui touche la JUSTESSE du
 * conseil, pas le confort. `generate()` remplaçait le plan par un `buildLocalPlan` neuf
 * sans jamais regarder l'ancien — or l'auto-refresh le déclenche dès qu'un réglage
 * change, à n'importe quelle heure. Disparaissaient : les repas marqués « mangé », les
 * portions réellement consommées, les écarts hors plan, la date de suivi.
 *
 * Mesuré sur le panel de référence : **1 448 kcal déjà avalées oubliées en moyenne**
 * (2 130 au pire), après quoi l'app replanifiait une journée PLEINE par-dessus. Pour
 * quelqu'un en sèche, ce n'est pas une gêne d'affichage — c'est un conseil faux.
 *
 * Vérifié dans l'app qui tourne avant correctif : 2 repas mangés → 0, extra → 0,
 * `tracking_date` → null, 1 330 kcal oubliées.
 */
const gabarit = (over: Partial<UserProfile> = {}): UserProfile => recalcProfile({
  id: 'test', sex: 'male', age: 30, weight_kg: 82, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  ...over,
} as unknown as UserProfile);

/** Journée en cours : petit-déj + déjeuner mangés, un écart hors plan déclaré. */
function journeeEntamee(plan: MealPlan): MealPlan {
  const meals = plan.meals.map((m) =>
    m.day === 1 && (m.meal_type === 'breakfast' || m.meal_type === 'lunch')
      ? { ...m, status: 'eaten' as const, locked_macros: m.macros }
      : m
  );
  return { ...plan, meals, day_extras: { 1: { kcal: 150, protein_g: 5, carbs_g: 20, fat_g: 5 } }, tracking_date: '2026-08-02' };
}

const mange = (p: MealPlan) => p.meals.filter((m) => m.status === 'eaten');

describe('carryTracking — le suivi survit à une régénération', () => {
  const profil = gabarit();
  const ancien = journeeEntamee(buildLocalPlan(profil, 3));
  // Le réglage a changé → l'écran régénère. C'est là que tout se perdait.
  const neuf = buildLocalPlan(gabarit({ disliked_foods: ['champignon'] }), 3);

  it('⚠️ LE DÉFAUT : sans report, le plan neuf a tout oublié', () => {
    expect(mange(neuf)).toHaveLength(0);
    expect(neuf.day_extras).toBeUndefined();
    expect(neuf.tracking_date).toBeUndefined();
  });

  it('les repas mangés sont conservés À L\'IDENTIQUE — c\'est un fait, pas une préférence', () => {
    const porte = carryTracking(profil, ancien, neuf);
    const av = mange(ancien), ap = mange(porte);
    expect(ap).toHaveLength(av.length);
    expect(ap).toHaveLength(2);
    // Même recette, mêmes portions, mêmes macros consommées : on ne re-planifie pas
    // un repas déjà avalé, même si les réglages ont changé depuis.
    for (const m of av) {
      const p = ap.find((x) => x.id === m.id)!;
      expect(p.recipe.id).toBe(m.recipe.id);
      expect(p.locked_macros).toEqual(m.locked_macros);
      expect(p.macros).toEqual(m.macros);
    }
  });

  it('l\'écart hors plan et la date de suivi suivent', () => {
    const porte = carryTracking(profil, ancien, neuf);
    expect(porte.day_extras).toEqual(ancien.day_extras);
    expect(porte.tracking_date).toBe('2026-08-02');
  });

  it('un repas SAUTÉ garde son statut, mais sa recette peut changer', () => {
    const avecSaut = {
      ...ancien,
      meals: ancien.meals.map((m) => (m.day === 1 && m.meal_type === 'dinner' ? { ...m, status: 'skipped' as const } : m)),
    };
    const porte = carryTracking(profil, avecSaut, neuf);
    const diner = porte.meals.find((m) => m.day === 1 && m.meal_type === 'dinner')!;
    expect(diner.status).toBe('skipped');
    // Le créneau est décidé ; la recette, elle, suit les nouveaux réglages.
    const dinerNeuf = neuf.meals.find((m) => m.day === 1 && m.meal_type === 'dinner')!;
    expect(diner.recipe.id).toBe(dinerNeuf.recipe.id);
  });

  it('la journée ne compte pas DEUX FOIS ce qui a déjà été mangé', () => {
    // Le vrai risque du report : reporter sans recaler ferait un jour hors cible.
    const porte = carryTracking(profil, ancien, neuf);
    const totaux = computeDailyTotals(porte.meals, porte.days, porte.day_extras);
    const ecart = Math.abs(totaux[0].kcal - profil.target_kcal) / profil.target_kcal;
    expect(ecart, `jour 1 à ${Math.round(totaux[0].kcal)} kcal pour une cible de ${profil.target_kcal}`)
      .toBeLessThan(0.12);
  });

  it('les jours NON entamés restent ceux du plan neuf', () => {
    const porte = carryTracking(profil, ancien, neuf);
    const j5neuf = neuf.meals.filter((m) => m.day === 5).map((m) => m.recipe.id);
    const j5porte = porte.meals.filter((m) => m.day === 5).map((m) => m.recipe.id);
    expect(j5porte).toEqual(j5neuf);
  });

  it('sans suivi en cours, le plan neuf passe intact', () => {
    const sansSuivi = buildLocalPlan(profil, 3);
    expect(carryTracking(profil, sansSuivi, neuf)).toBe(neuf);
    expect(carryTracking(profil, null, neuf)).toBe(neuf);
  });

  it('composé avec resetTracking : le changement de JOUR nettoie quand même', () => {
    // On ne décide pas de la péremption ici — on évite juste la perte. L'écran
    // remet la journée à zéro quand la date change, et ça doit rester vrai.
    const porte = carryTracking(profil, ancien, neuf);
    const nettoye = resetTracking(profil, porte);
    expect(mange(nettoye)).toHaveLength(0);
    expect(nettoye.day_extras).toBeUndefined();
    expect(nettoye.tracking_date).toBeUndefined();
  });
});
