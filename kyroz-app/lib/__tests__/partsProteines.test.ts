import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan } from '../planEngine';
import {
  couchesDeParts, partsCibles, regimeProteines, sorteAViser, sortesDe, sortesProposees, LIBRE,
  type Cible, type Sorte,
} from '../partsProteines';
import type { DietaryRestriction, Meal, Recipe, UserProfile } from '../types';

// ── PARTS DE PROTÉINES PAR RÉGIME — décisions du fondateur du 2026-09-19 ──────────────────
// (`docs/2026-09-19-decision-preferences-proteines.md`). Ce que l'utilisateur coche devient une
// part GARANTIE de ses déjeuners et dîners, « autant que possible » : jamais au prix d'un repas
// mal calibré. Mesuré sur 18 cas × 12 profils × 4 semaines (`scripts/mesure-parts-servies.ts`) :
// parts tenues à 90 % en moyenne, et repas à drapeau 38 → 20.

const arrondi = (m: Map<Cible, number> | null) =>
  m ? Object.fromEntries([...m].map(([k, v]) => [k, Math.round(v * 1000) / 1000])) : null;
const parts = (r: DietaryRestriction[], prefs: string[] = [], repas = 14) =>
  arrondi(partsCibles({ dietary_restrictions: r, preferred_proteins: prefs }, repas));

describe('ce que la page propose, régime choisi', () => {
  it('omnivore : poulet, bœuf, poisson, porc — plus de végétal ni de whey', () => {
    expect(sortesProposees(['omnivore'])).toEqual(['poulet', 'bœuf', 'poisson', 'porc']);
  });
  it('halal : pas de porc', () => {
    expect(sortesProposees(['omnivore', 'halal'])).toEqual(['poulet', 'bœuf', 'poisson']);
  });
  it('pescétarien : poisson et végétal', () => {
    expect(sortesProposees(['pescatarian'])).toEqual(['poisson', 'sans poisson']);
  });
  it('végétarien : les sortes végétales et les œufs ; vegan : sans les œufs', () => {
    expect(sortesProposees(['vegetarian'])).toEqual(['tofu', 'tempeh', 'seitan', 'légumineuses', 'pièces végétales', 'œufs']);
    expect(sortesProposees(['vegan'])).toEqual(['tofu', 'tempeh', 'seitan', 'légumineuses', 'pièces végétales']);
  });
  it('sans gluten : le seitan (du blé) disparaît', () => {
    expect(sortesProposees(['vegan', 'gluten_free'])).not.toContain('seitan');
  });
  it('le régime le plus restrictif décide', () => {
    expect(regimeProteines(['omnivore', 'halal'])).toBe('halal');
    expect(regimeProteines(['halal', 'vegan'])).toBe('vegan');
    expect(regimeProteines([])).toBe('omnivore');
  });
});

describe('les parts décidées', () => {
  it('omnivore, rien coché : 40 / 30 / 20 / 10', () => {
    expect(parts(['omnivore'])).toEqual({ poulet: 0.4, 'bœuf': 0.3, poisson: 0.2, porc: 0.1 });
  });
  it('halal, rien coché : 45 / 35 / 20', () => {
    expect(parts(['omnivore', 'halal'])).toEqual({ poulet: 0.45, 'bœuf': 0.35, poisson: 0.2 });
  });
  it('omnivore : 1 coché = 60 %, le reste selon « rien coché » (poisson ≥ 1 repas)', () => {
    const p = parts(['omnivore'], ['poulet'])!;
    expect(p.poulet).toBe(0.6);
    // bœuf 0,4 × 30/60, poisson 0,4 × 20/60, porc 0,4 × 10/60
    expect(p['bœuf']).toBe(0.2); expect(p.poisson).toBe(0.133); expect(p.porc).toBe(0.067);
  });
  it('omnivore : 2 cochés = 80 % à parts égales ; 3 et plus = 95 %', () => {
    expect(parts(['omnivore'], ['poulet', 'bœuf'])!.poulet).toBe(0.4);
    const trois = parts(['omnivore'], ['poulet', 'bœuf', 'porc'])!;
    expect(trois.poulet + trois['bœuf'] + trois.porc).toBeCloseTo(0.95 - (1 / 14 - 0.05), 2);
  });
  it('poisson non coché : au moins 1 repas sur la semaine', () => {
    const p = parts(['omnivore'], ['poulet', 'bœuf', 'porc'], 14)!;
    expect(p.poisson).toBeCloseTo(1 / 14, 3);
  });
  it('pescétarien : 50 / 50, et 70 % pour celle qu\'il coche', () => {
    expect(parts(['pescatarian'])).toEqual({ poisson: 0.5, 'sans poisson': 0.5 });
    expect(parts(['pescatarian'], ['végétal'])).toEqual({ 'sans poisson': 0.7, poisson: 0.3 });
  });
  it('végé / vegan : pièces végétales seules 70 %, autre sorte 40 %, 2 = 60 %, 3+ = 80 %, le reste libre', () => {
    expect(parts(['vegetarian'], ['pièces végétales'])).toEqual({ 'pièces végétales': 0.7, [LIBRE]: 0.3 });
    expect(parts(['vegan'], ['tofu'])).toEqual({ tofu: 0.4, [LIBRE]: 0.6 });
    expect(parts(['vegan'], ['tofu', 'tempeh'])).toEqual({ tofu: 0.3, tempeh: 0.3, [LIBRE]: 0.4 });
    const trois = parts(['vegetarian'], ['tofu', 'tempeh', 'œufs'])!;
    expect(trois.tofu + trois.tempeh + trois['œufs']).toBeCloseTo(0.8, 2);
  });
  it('végé / vegan sans rien coché : rien n\'est imposé', () => {
    expect(parts(['vegan'])).toBeNull();
  });
  it('une valeur périmée (whey, végétal chez l\'omnivore) ne compte pas', () => {
    expect(parts(['omnivore'], ['whey', 'végétal'])).toEqual(parts(['omnivore']));
  });
  it('la somme fait toujours 1', () => {
    for (const [r, prefs] of [[['omnivore'], ['poisson']], [['vegan'], ['seitan', 'tofu']], [['pescatarian'], ['poisson']]] as [DietaryRestriction[], string[]][]) {
      const p = partsCibles({ dietary_restrictions: r, preferred_proteins: prefs }, 14)!;
      expect([...p.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });
});

describe('le choix de la sorte, repas par repas', () => {
  it('la sorte la plus en retard passe devant', () => {
    const p = new Map<Cible, number>([['poulet', 0.6], ['bœuf', 0.4]]);
    expect(sorteAViser(p, {}, 0)).toBe('poulet');
    expect(sorteAViser(p, { poulet: 2 }, 2)).toBe('bœuf');
  });
  it('végé / vegan : si la sorte manque, la roue de secours garde les pièces végétales', () => {
    const recette = (ref: string) => ({ ingredients: [{ ref, macro_role: 'protein' }] }) as unknown as Recipe;
    const [stricte, secours] = couchesDeParts('vegan', 'tempeh');
    expect(stricte(recette('tempeh'))).toBe(false);
    expect(stricte(recette('steak_soja'))).toBe(true);
    expect(secours(recette('steak_soja'))).toBe(false); // gardée par le secours
    expect(secours(recette('lentilles_cuites'))).toBe(true);
    // Chez l'omnivore, pas de secours végétal : le moteur prend ce qui reste de SON régime.
    expect(couchesDeParts('omnivore', 'poulet')).toHaveLength(1);
  });
  it('une recette mixte compte pour chacune de ses sortes', () => {
    const chili = { ingredients: [{ ref: 'boeuf_5', macro_role: 'protein' }, { ref: 'haricots_rouges_conserve', macro_role: 'protein' }] } as unknown as Recipe;
    const s = sortesDe(chili);
    expect(s.has('bœuf')).toBe(true); expect(s.has('légumineuses')).toBe(true); expect(s.has('sans poisson')).toBe(true);
  });
});

describe('ce que le plan sert vraiment', () => {
  // Échantillon réduit du panel de `mesure-parts-servies.ts` (qui fait foi) : 4 gabarits × 2
  // semaines. Les bornes sont posées entre le moteur SANS parts et le moteur AVEC, mesurés sur
  // ce même échantillon : la mécanique retirée, le test tombe.
  const GABARITS: Partial<UserProfile>[] = [
    { sex: 'female', weight_kg: 55, height_cm: 162, goal: 'cut' },
    { sex: 'female', weight_kg: 70, height_cm: 168, goal: 'bulk' },
    { sex: 'male', weight_kg: 80, height_cm: 180, goal: 'maintain' },
    { sex: 'male', weight_kg: 110, height_cm: 190, age: 35, goal: 'bulk' },
  ];
  const part = (r: DietaryRestriction[], prefs: string[], sorte: Sorte) => {
    let n = 0, dans = 0;
    for (const g of GABARITS) for (const seed of [0, 1]) {
      const p = recalcProfile(makeProfile({ ...g, plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], variety: 'balanced', dietary_restrictions: r, preferred_proteins: prefs }));
      for (const m of buildLocalPlan(p, seed).meals as Meal[]) {
        if (m.meal_type !== 'lunch' && m.meal_type !== 'dinner') continue;
        n++; if (sortesDe(m.recipe).has(sorte)) dans++;
      }
    }
    return dans / n;
  };

  it('omnivore qui coche poulet : nettement plus de poulet que sans la part', () => {
    expect(part(['omnivore'], ['poulet'], 'poulet')).toBeGreaterThanOrEqual(PLANCHERS.omniPoulet);
  });
  it('omnivore qui ne coche rien : le poisson redescend vers 20 %', () => {
    expect(part(['omnivore'], [], 'poisson')).toBeLessThanOrEqual(PLANCHERS.omniRienPoissonMax);
  });
  it('végétarien qui coche tofu : le tofu monte', () => {
    expect(part(['vegetarian'], ['tofu'], 'tofu')).toBeGreaterThanOrEqual(PLANCHERS.vegeTofu);
  });
});

// Bornes posées ENTRE le moteur sans parts et le moteur avec, sur l'échantillon ci-dessus,
// mesurés le 2026-09-19 (avec / sans la couche) : poulet coché 0,509 / 0,446 ; poisson de
// l'omnivore rien coché 0,241 / 0,411 ; tofu coché 0,321 / 0,089.
const PLANCHERS = { omniPoulet: 0.48, omniRienPoissonMax: 0.32, vegeTofu: 0.2 };
