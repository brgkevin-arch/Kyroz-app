import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { joursAAcheter, repasACompter } from '../coursesDepuis';
import { buildLocalPlan, mealIngredients, resetTracking } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { addOrMerge, deductIngredients, isStaple, PantryItem } from '../pantry';
import { quantiteRangee } from '../formatsVendus';
import { MealPlan } from '../types';
import { makeProfile } from './helpers';

/**
 * ── F9 : un repas cuisiné n’est plus compté deux fois (décision fondateur, 2026-10-02) ──
 *
 * La liste vaut « besoin du plan − réserve », et cuisiner débite la réserve. Le besoin
 * comptait pourtant encore les repas déjà cuisinés : après une journée cuisinée, des
 * articles achetés revenaient sur la liste (16 avec l’ancien rangement, 4 avec le format
 * vendu). Après des « Courses terminées » cette semaine, la liste ne compte plus que les
 * jours à venir et, aujourd’hui, les repas pas encore tranchés. Avant les courses, la
 * règle du 2026-09-17 tient (la liste part du jour de génération, elle ne glisse pas).
 */
const LUN = [1, 2, 3, 4, 5];
const at = (d: string, h: number) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`);
type R = { day: number; status?: string; id: string };
const plan = (debut: string, meals: R[], days = 5) => ({ week_start_date: debut, days, meals });
const semaine = (): R[] => [1, 2, 3, 4, 5].flatMap((day) =>
  ['matin', 'midi', 'soir'].map((c) => ({ day, id: `${day}-${c}` })));

describe('repasACompter : la règle', () => {
  it('sans clôture cette semaine, rien ne change (la règle du 2026-09-17)', () => {
    const p = plan('2026-09-28', semaine());
    const r = repasACompter(p, LUN, null, at('2026-09-30', 20));
    expect(r.apresCourses).toBe(false);
    expect(r.meals).toHaveLength(15);
    expect(r.jours).toEqual(joursAAcheter(p, LUN));
  });

  it('après une clôture : les jours à venir, et aujourd’hui les repas pas encore tranchés', () => {
    const meals = semaine();
    meals.find((m) => m.id === '3-matin')!.status = 'eaten';
    meals.find((m) => m.id === '3-midi')!.status = 'skipped';
    meals.find((m) => m.id === '3-soir')!.status = 'planned';
    const r = repasACompter(plan('2026-09-28', meals), LUN, at('2026-09-28', 10).toISOString(), at('2026-09-30', 20));
    expect(r.apresCourses).toBe(true);
    expect(r.jours).toEqual([3, 4, 5]);
    expect(r.meals.map((m) => m.id)).toEqual(['3-soir', '4-matin', '4-midi', '4-soir', '5-matin', '5-midi', '5-soir']);
  });

  it('une clôture d’une AUTRE semaine ne compte pas (courses du dimanche, plan du lundi)', () => {
    const r = repasACompter(plan('2026-09-28', semaine()), LUN, at('2026-09-27', 18).toISOString(), at('2026-09-29', 12));
    expect(r.apresCourses).toBe(false);
  });

  it('un plan d’une semaine passée retombe sur la règle d’avant', () => {
    const r = repasACompter(plan('2026-09-21', semaine()), LUN, at('2026-09-22', 10).toISOString(), at('2026-09-30', 12));
    expect(r.apresCourses).toBe(false);
  });

  it('sans jours de plan connus, on ne devine rien', () => {
    const r = repasACompter(plan('2026-09-28', semaine()), undefined, at('2026-09-28', 10).toISOString(), at('2026-09-30', 12));
    expect(r.apresCourses).toBe(false);
    expect(r.meals).toHaveLength(15);
  });

  it('plus aucun jour à venir : la liste est vide, pas la semaine entière', () => {
    const r = repasACompter(plan('2026-09-28', semaine()), LUN, at('2026-09-28', 10).toISOString(), at('2026-10-03', 12));
    expect(r.apresCourses).toBe(true);
    expect(r.meals).toEqual([]);
  });

  it('le dimanche en tête de `plan_weekdays` reste en FIN de semaine', () => {
    const sept: R[] = [0, 1, 2, 3, 4, 5, 6].map((_, i) => ({ day: i + 1, id: `j${i + 1}` }));
    const r = repasACompter(plan('2026-09-28', sept, 7), [0, 1, 2, 3, 4, 5, 6], at('2026-09-28', 10).toISOString(), at('2026-10-02', 12));
    // Vendredi : restent vendredi, samedi et le dimanche (jour 1, daté en fin de semaine).
    expect(r.jours.sort()).toEqual([1, 6, 7]);
  });
});

describe('F9 mesuré sur le moteur : une journée cuisinée ne fait rien racheter', () => {
  // Plan canonique d’un lundi, courses terminées le lundi matin, le lundi cuisiné.
  const scenario = (rangement: 'paquet' | 'besoin') => {
    const profil = makeProfile();
    const p: MealPlan = { ...buildLocalPlan(profil, 0), week_start_date: '2026-09-28' };
    const cloture = at('2026-09-28', 9).toISOString();
    const avant = repasACompter(p, LUN, null, at('2026-09-28', 8));
    let reserve: PantryItem[] = [];
    for (const it of buildShoppingList({ ...p, meals: avant.meals }, [], avant.jours).items) {
      if (isStaple(it.name)) continue;
      const q = rangement === 'paquet' ? quantiteRangee(it) : it.quantity;
      reserve = addOrMerge(reserve, { name: it.name, quantity: q, unit: it.unit, category: it.category });
    }
    const cuisine: MealPlan = { ...p, meals: p.meals.map((m) => (m.day === 1 ? { ...m, status: 'eaten' as const } : m)) };
    for (const m of cuisine.meals.filter((x) => x.day === 1)) reserve = deductIngredients(reserve, mealIngredients(m));
    const liste = (pl: MealPlan, maintenant: Date) => {
      const r = repasACompter(pl, LUN, cloture, maintenant);
      return buildShoppingList({ ...pl, meals: r.meals }, reserve, r.jours).items;
    };
    // Le lendemain, les statuts sont effacés : c'est la DATE qui doit écarter le lundi.
    // ⚠️ Deux lendemains : statuts effacés seuls (la règle F9, isolée), puis le vrai
    // `resetTracking`, qui REÉQUILIBRE aussi les jours à venir. Ce rééquilibrage peut
    // monter un ingrédient de quelques grammes ; le surplus d'un paquet l'absorbe, un
    // rangement au gramme près non, et ce manque-là est vrai : ce n'est pas F9.
    const sansStatut: MealPlan = { ...cuisine, meals: cuisine.meals.map((m) => ({ ...m, status: undefined })) };
    return {
      ancienCalcul: buildShoppingList(cuisine, reserve, joursAAcheter(cuisine, LUN)).items.length,
      leSoir: liste(cuisine, at('2026-09-28', 21)),
      leLendemain: liste(sansStatut, at('2026-09-29', 8)),
      leLendemainReel: liste(resetTracking(profil, cuisine), at('2026-09-29', 8)),
    };
  };

  for (const rangement of ['paquet', 'besoin'] as const) {
    it(`rangement au ${rangement} : zéro article fantôme, le soir comme le lendemain`, () => {
      const s = scenario(rangement);
      // Le contrôle sait dire OUI : l’ancien calcul fait bien revenir des articles.
      expect(s.ancienCalcul).toBeGreaterThan(0);
      expect(s.leSoir.map((i) => `${i.name} ${i.quantity}`)).toEqual([]);
      expect(s.leLendemain.map((i) => `${i.name} ${i.quantity}`)).toEqual([]);
      if (rangement === 'paquet') expect(s.leLendemainReel.map((i) => `${i.name} ${i.quantity}`)).toEqual([]);
    });
  }
});

describe('l’écran Courses le dit', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'courses.tsx'), 'utf8');
  it('après des courses, la ligne de départ annonce les repas qu’il reste', () => {
    expect(src).toContain('perimetre.apresCourses');
    expect(src).toContain('Depuis tes dernières courses : pour les repas qu’il te reste à cuisiner.');
  });
});
