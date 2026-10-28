import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLocalPlan, carryTracking, dayTargetKcal, profileSignature } from '../planEngine';
import { recalcProfile } from '../tdee';
import { datesDuPlan } from '../semainePlan';
import { repasACompter } from '../coursesDepuis';
import { buildShoppingList } from '../shoppingList';
import {
  aAdopter, aligner, ciblesSeulement, debutDeLaSuivante, doitPreparer, memesRecettes, preparer, premierJour,
  type SemaineSuivante,
} from '../semaineSuivante';
import type { MealPlan, UserProfile } from '../types';

/**
 * LA SEMAINE SUIVANTE, PRÉPARÉE D'AVANCE — et LA PESÉE (décisions fondateur du 2026-10-21).
 *
 * « Une fois une liste de courses validée, une nouvelle apparaît pour le plan de la semaine
 * d'après. Elle est faite en fonction de ce qu'il doit rester à la fin du plan actuel. »
 * Puis : « On a oublié de prendre en compte la pesée. »
 *
 * Calendrier des cas : le lundi 19 octobre 2026 ouvre la semaine, le samedi 24 et le
 * dimanche 25 la ferment, le lundi 26 ouvre la suivante.
 */

const LUN_DIM = [1, 2, 3, 4, 5, 6, 0];
const LUN_VEN = [1, 2, 3, 4, 5];

function profil(patch: Partial<UserProfile> = {}): UserProfile {
  return recalcProfile({
    id: 't', sex: 'male', age: 32, weight_kg: 82, height_cm: 180,
    activity_level: 'moderate', training_days_per_week: 4,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
    neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: LUN_DIM,
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'balanced',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
    ...patch,
  } as unknown as UserProfile, '2026-10-19');
}
const semaine = (p: UserProfile, debut = '2026-10-19', seed = 0): MealPlan => ({ ...buildLocalPlan(p, seed), week_start_date: debut });
const recettes = (p: MealPlan) => p.meals.map((m) => `${m.id}:${m.recipe.id}`);

const silence = { log: console.log, warn: console.warn };
beforeAll(() => { console.log = () => {}; console.warn = () => {}; });
afterAll(() => { console.log = silence.log; console.warn = silence.warn; });

describe('la pesée garde les recettes de la semaine', () => {
  const avant = profil();
  const apres = profil({ weight_kg: 81 });

  it('une pesée ne déplace que les cibles, et de peu', () => {
    expect(apres.target_kcal).not.toBe(avant.target_kcal);
    expect(ciblesSeulement(profileSignature(avant), profileSignature(apres))).toBe(true);
  });

  it('un vrai changement de réglage n’en est pas une', () => {
    const sig = profileSignature(avant);
    expect(ciblesSeulement(sig, profileSignature(profil({ dietary_restrictions: ['vegetarian'] })))).toBe(false);
    expect(ciblesSeulement(sig, profileSignature(profil({ plan_weekdays: LUN_VEN, plan_days: 5 })))).toBe(false);
    // Un changement d'objectif dépasse le seuil d'annonce (100 kcal/jour) : le plan se re-tire.
    expect(ciblesSeulement(sig, profileSignature(profil({ goal: 'maintain' })))).toBe(false);
  });

  it('sans signature lisible, on ne garde rien à tort', () => {
    expect(ciblesSeulement(undefined, profileSignature(avant))).toBe(false);
    expect(ciblesSeulement('pas du json', profileSignature(avant))).toBe(false);
    expect(ciblesSeulement(profileSignature(avant), profileSignature(avant))).toBe(false);
  });

  it('le défaut existait : sans imposer les recettes, la pesée re-tire la semaine', () => {
    const plan = semaine(avant);
    const retire = semaine(apres);
    const changees = recettes(retire).filter((r, i) => r !== recettes(plan)[i]).length;
    expect(changees).toBeGreaterThan(plan.meals.length / 3);
  });

  it('mêmes recettes, portions sur la nouvelle cible', () => {
    const plan = semaine(avant);
    const recale = memesRecettes(apres, plan, 0);
    expect(recettes(recale)).toEqual(recettes(plan));
    expect(recale.profile_sig).toBe(profileSignature(apres));
    expect(recale.week_start_date).toBe(plan.week_start_date);
    for (let d = 1; d <= recale.days; d++) {
      const k = recale.meals.filter((m) => m.day === d).reduce((s, m) => s + m.macros.kcal, 0);
      expect(Math.abs(k - dayTargetKcal(apres, recale.days, d)) / dayTargetKcal(apres, recale.days, d)).toBeLessThan(0.05);
    }
  });
});

describe('quand la semaine suivante commence', () => {
  it('le lendemain du dernier jour du plan', () => {
    expect(debutDeLaSuivante({ week_start_date: '2026-10-19', days: 7 }, LUN_DIM)).toBe('2026-10-26');
    expect(debutDeLaSuivante({ week_start_date: '2026-10-19', days: 5 }, LUN_VEN)).toBe('2026-10-24');
  });
  it('rien sans jours datés', () => {
    expect(debutDeLaSuivante({ week_start_date: '2026-10-19', days: 7 }, undefined)).toBeNull();
  });
});

describe('elle se prépare une fois les courses closes', () => {
  const p = profil();
  const plan = semaine(p);
  const lundi = new Date('2026-10-19T19:00:00');

  it('pas de courses closes → rien', () => {
    expect(doitPreparer(plan, LUN_DIM, null, null, lundi)).toBe(false);
  });
  it('courses closes pour ce plan → oui', () => {
    expect(doitPreparer(plan, LUN_DIM, '2026-10-19T18:30:00', null, lundi)).toBe(true);
  });
  it('une seule semaine d’avance : rien quand une suivante attend', () => {
    const s = preparer(p, plan, 0, lundi)!;
    expect(doitPreparer(plan, LUN_DIM, '2026-10-19T18:30:00', s, lundi)).toBe(false);
  });
  it('une clôture d’avant ce plan ne compte pas', () => {
    expect(doitPreparer(plan, LUN_DIM, '2026-10-12T18:30:00', null, lundi)).toBe(false);
  });

  it('un nouveau tirage, daté de la semaine qui vient', () => {
    const s = preparer(p, plan, 4, lundi)!;
    expect(s.seed).toBe(5);
    expect(s.plan.week_start_date).toBe('2026-10-26');
    expect(s.plan.prepare_le).toBe(lundi.toISOString());
    expect(datesDuPlan(s.plan, LUN_DIM)).toEqual(
      ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(premierJour(s.plan, LUN_DIM)).toBe('2026-10-26');
  });

  it('du lundi au vendredi : préparée pour le lundi d’après, pas pour le samedi', () => {
    const pv = profil({ plan_days: 5, plan_weekdays: LUN_VEN });
    const s = preparer(pv, semaine(pv), 0, lundi)!;
    expect(datesDuPlan(s.plan, LUN_VEN)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
  });
});

describe('elle suit le profil jusqu’à son premier jour', () => {
  const p = profil();
  const plan = semaine(p);
  const s = preparer(p, plan, 0, new Date('2026-10-19T19:00:00'))!;

  it('rien n’a bougé → la même, telle quelle', () => {
    expect(aligner(p, plan, s, '2026-10-22')).toBe(s);
  });
  it('une pesée → mêmes recettes, nouvelles portions', () => {
    const pese = profil({ weight_kg: 81 });
    const a = aligner(pese, plan, s, '2026-10-22')!;
    expect(recettes(a.plan)).toEqual(recettes(s.plan));
    expect(a.plan.profile_sig).toBe(profileSignature(pese));
    expect(a.plan.prepare_le).toBe(s.plan.prepare_le);
    expect(a.seed).toBe(s.seed);
  });
  it('un autre réglage → re-tirée avec le même tirage, à la bonne date', () => {
    const vege = profil({ dietary_restrictions: ['vegetarian'] });
    const a = aligner(vege, plan, s, '2026-10-22')!;
    expect(a.plan.profile_sig).toBe(profileSignature(vege));
    expect(a.plan.week_start_date).toBe('2026-10-26');
    expect(a.seed).toBe(s.seed);
  });
  it('ses jours tous passés → oubliée', () => {
    expect(aligner(p, plan, s, '2026-11-05')).toBeNull();
  });
});

describe('le jour du renouvellement, elle devient le plan', () => {
  const p = profil();
  const plan = semaine(p);
  const s: SemaineSuivante = preparer(p, plan, 0, new Date('2026-10-19T19:00:00'))!;

  it('le lundi 26, oui ; le dimanche 25, pas encore', () => {
    expect(aAdopter(plan, s, '2026-10-26', LUN_DIM)).toBe(true);
    expect(aAdopter(plan, s, '2026-10-25', LUN_DIM)).toBe(false);
  });
  it('ouverte après sa semaine → renouvellement ordinaire', () => {
    expect(aAdopter(plan, s, '2026-11-03', LUN_DIM)).toBe(false);
  });
  it('sans suivante → renouvellement ordinaire', () => {
    expect(aAdopter(plan, null, '2026-10-26', LUN_DIM)).toBe(false);
  });

  it('ses courses faites AVANT son premier jour comptent pour elle (F9)', () => {
    const adoptee = s.plan;
    const r = repasACompter(adoptee, LUN_DIM, '2026-10-24T11:00:00', new Date('2026-10-28T12:00:00'));
    expect(r.apresCourses).toBe(true);
    // La clôture qui l'a fait naître (avant `prepare_le`) ne compte pas pour elle.
    const r2 = repasACompter(adoptee, LUN_DIM, '2026-10-19T18:30:00', new Date('2026-10-28T12:00:00'));
    expect(r2.apresCourses).toBe(false);
  });
});

describe('le suivi se reporte par DATE, pas par numéro de jour', () => {
  const p = profil();
  const ancien = semaine(p, '2026-10-19');
  const vendredi = ancien.meals.find((m) => m.day === 5)!;
  const coche: MealPlan = {
    ...ancien, tracking_date: '2026-10-23',
    meals: ancien.meals.map((m) => (m.id === vendredi.id ? { ...m, status: 'eaten' } : m)),
    day_extras: { 5: { kcal: 300, protein_g: 10, carbs_g: 30, fat_g: 10 } },
  };

  it('le jour du renouvellement, rien du vendredi passé ne revient sur le vendredi suivant', () => {
    const neuf = semaine(p, '2026-10-26', 1);
    const r = carryTracking(p, coche, neuf);
    expect(r.meals.some((m) => m.status)).toBe(false);
    expect(r.day_extras).toBeUndefined();
  });
  it('dans la même semaine, le repas mangé et l’écart restent', () => {
    const regen = semaine(p, '2026-10-21', 1);
    const r = carryTracking(p, coche, regen);
    const v = r.meals.find((m) => m.id === vendredi.id)!;
    expect(v.status).toBe('eaten');
    expect(v.recipe.id).toBe(vendredi.recipe.id);
    expect(r.day_extras?.[5]?.kcal).toBe(300);
  });
});

describe('la liste part de ce qu’il doit rester à la fin du plan en cours', () => {
  it('la réserve sert d’abord la semaine en cours, le reste fait baisser la suivante', () => {
    const repas = (id: string, day: number, g: number) => ({
      id, day, meal_type: 'lunch', portions: 1, macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      recipe: { id, name: id, ingredients: [] } as never,
      adapted_ingredients: [{ name: 'Blanc de poulet', quantity_g: g, unit: 'g', ref: 'poulet_blanc' }],
    });
    const plan = { id: 'p', days: 7, meals: [repas('a', 6, 300)] } as unknown as MealPlan;
    const suivant = [repas('b', 1, 400)];
    const reserve = [{ name: 'Blanc de poulet', quantity: 500, unit: 'g', category: 'viandes' }] as never;
    const l = buildShoppingList({ ...plan, meals: [...plan.meals, ...suivant] } as MealPlan, reserve);
    // 300 + 400 demandés, 500 en réserve : 200 g à acheter — jamais 400 (deux listes
    // séparées compteraient deux fois les 200 g qui restent après samedi).
    const poulet = l.items.find((i) => i.name === 'Blanc de poulet')!;
    expect(poulet.quantity).toBe(200);
    expect(buildShoppingList(plan, reserve).items.length).toBe(0);
  });
});

describe('les écrans s’en servent', () => {
  const plan = readFileSync(join(__dirname, '../../app/(tabs)/plan.tsx'), 'utf8');
  const courses = readFileSync(join(__dirname, '../../app/(tabs)/courses.tsx'), 'utf8');

  it('Plan : une pesée garde les recettes, au lieu de re-tirer la semaine', () => {
    expect(plan).toMatch(/if \(ciblesSeulement\(plan\.profile_sig, sig\)\) \{[\s\S]{0,200}memesRecettes\(profile, plan, seed\)/);
  });
  it('Plan : au renouvellement, la semaine préparée est adoptée avec son tirage', () => {
    expect(plan).toMatch(/aAdopter\(plan, suivante, aujourdHui, profile\.plan_weekdays\)/);
    expect(plan).toMatch(/AsyncStorage\.setItem\(SEED_KEY, String\(prete\.seed\)\)/);
    expect(plan.indexOf("if (!prete) { await ecrireLaSuivante(null); generate(true, 'semaine_ecoulee'); return; }"))
      .toBeGreaterThan(-1);
  });
  // 🔴 AMENDÉ le 2026-10-28 (segment 10, constat 1) : plus une liste pour les deux semaines,
  // mais une liste PAR semaine — la suivante calculée sur les deux moins la semaine en cours.
  it('Courses : une liste par semaine, la suivante sans compter deux fois la réserve', () => {
    expect(courses).toMatch(/assurerLaSuivante\(profile, plan, cloture\)/);
    expect(courses).toMatch(/buildShoppingList\(\{ \.\.\.plan, meals: \[\.\.\.restantes, \.\.\.suivante\.plan\.meals\] \}, pantry\)/);
    expect(courses).toMatch(/articlesDeLaSuivante\(lesDeux\.items, enCours\)/);
    expect(courses).not.toMatch(/title: 'Encore pour cette semaine'/);
  });
});

