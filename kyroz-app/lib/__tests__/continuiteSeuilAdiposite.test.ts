import { describe, it, expect } from 'vitest';
import { recalcProfile, computePlan } from '../tdee';
import { HIGH_ADIPOSITY_PCT, ADIPOSITY_BLEND_PTS, highAdiposity, safetyFloorBreakdown } from '../safety';
import { maxWeeklyLossPct } from '../datedGoal';
import { MEAL_ORDER, UserProfile, Sex, Goal } from '../types';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 LE CAS H8 DE L'AUDIT S'ARRÊTAIT EXACTEMENT AU POINT DE RUPTURE. Il balayait le
// %MG de 10 à 30 % et concluait « saut maximal 28 kcal/j — le lissage R6 fait son
// travail ». 30 %, c'est la valeur de `HIGH_ADIPOSITY_PCT.male` : la fenêtre se
// fermait sur le seuil au lieu de le franchir. Mesuré au-delà, le saut valait
// **115 kcal/j** — au-dessus du critère que H8 s'était lui-même donné (« < 100 »).
//
// ⚠️ CE QUI DISTINGUE UNE PENTE D'UNE FALAISE, ET C'EST LE CŒUR DE CE FICHIER :
// **un saut qui ne rétrécit pas quand le pas rétrécit est une DISCONTINUITÉ.** Avant
// correctif : 137 · 115 · 112 kcal/j aux pas 0,5 · 0,05 · 0,005 pt — il ne bougeait
// pas. Après : 137 · 34 · 4 — il rétrécit proportionnellement. C'est ce rapport que
// le test compte, jamais un seuil absolu : un seuil absolu passerait au vert sur une
// falaise deux fois plus petite.
//
// ⚠️ CE QUE CE FICHIER NE DOIT PAS LAISSER « SIMPLIFIER » : le seuil reste UN nombre,
// et `highAdiposity` reste le prédicat binaire que partagent la bande de rythme, le
// registre de zone basse et l'escalade. Seule la transition du PLANCHER s'adoucit.
// Deux définitions de « cette personne est grasse » finiraient par diverger — c'est
// écrit en tête de `HIGH_ADIPOSITY_PCT`, et deux tests ci-dessous le comptent.

const GOALS: Goal[] = ['cut', 'recomp', 'maintain', 'lean_bulk'];

function profil(sex: Sex, poids: number, taille: number, age: number, mg: number, g: Goal): UserProfile {
  return recalcProfile({
    id: 't', sex, age, weight_kg: poids, height_cm: taille, body_fat_pct: mg,
    activity_level: 'moderate', training_days_per_week: 3,
    sports: [{ type: 'musculation', sessions_per_week: 3, minutes_per_session: 60 }],
    neat_level: 'desk', goal: g, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

/** Les gabarits lourds : c'est là que la falaise était la plus haute. */
const CORPS: [Sex, number, number, number][] = [];
for (const sex of ['male', 'female'] as Sex[])
  for (const poids of [95, 115, 140])
    for (const taille of [155, 175, 190])
      for (const age of [20, 45])
        CORPS.push([sex, poids, taille, age]);

/** Le plus grand écart entre deux %MG consécutifs, en franchissant le seuil. */
function sautMax(pas: number, demiLargeur = 0.5): { max: number; nom: string } {
  let max = 0, nom = '';
  for (const [sex, poids, taille, age] of CORPS) {
    const seuil = HIGH_ADIPOSITY_PCT[sex];
    for (const g of GOALS) {
      let prec: number | null = null;
      for (let k = 0; k <= Math.round((2 * demiLargeur) / pas); k++) {
        const mg = Math.round((seuil - demiLargeur + k * pas) * 10000) / 10000;
        const v = computePlan(profil(sex, poids, taille, age, mg, g)).profile.target_kcal;
        if (!Number.isFinite(v)) { prec = null; continue; }
        if (prec != null && Math.abs(v - prec) > max) {
          max = Math.abs(v - prec);
          nom = `${sex} ${poids}kg ${taille}cm ${age}a ${g} vers ${mg}%`;
        }
        prec = v;
      }
    }
  }
  return { max, nom };
}

describe('seuil d’adiposité — une pente, pas une falaise', () => {
  const gros = sautMax(0.05);
  const fin = sautMax(0.005);

  it('🔴 le saut RÉTRÉCIT quand le pas rétrécit — donc c’est une pente', () => {
    // La signature d'une discontinuité est l'inverse : diviser le pas par dix laisse
    // le saut identique. Avant correctif, 115 → 112 (rapport 0,97).
    expect(fin.max, `pas 0,005 — ${fin.nom}`).toBeLessThan(gros.max * 0.5);
  });

  it('🔴 le saut au pas de 0,05 pt tient le critère que l’audit s’était donné (< 100 kcal/j)', () => {
    expect(gros.max, `pire saut — ${gros.nom}`).toBeLessThan(100);
  });

  it('la fenêtre de retrait est le pas du sélecteur de silhouettes', () => {
    // 10/15/20/25/30/35 et 18/23/28/33/38/43 : cinq points. C'est aussi la bande de
    // bruit de R6 lissée. Une fenêtre plus étroite reproduirait la falaise.
    expect(ADIPOSITY_BLEND_PTS).toBe(5);
  });
});

describe('seuil d’adiposité — le SEUIL, lui, n’a pas bougé', () => {
  it('🔴 `highAdiposity` reste BINAIRE, et il reste la définition partagée', () => {
    // Deux définitions de « cette personne est grasse » finiraient par diverger : la
    // bande de rythme doit basculer au même nombre que le plancher, pas sur une
    // fenêtre à elle. C'est l'avertissement écrit en tête de `HIGH_ADIPOSITY_PCT`.
    for (const sex of ['male', 'female'] as Sex[]) {
      const seuil = HIGH_ADIPOSITY_PCT[sex];
      const corps = (mg: number) => ({ sex, age: 40, weight_kg: 110, height_cm: 175, body_fat_pct: mg });
      expect(highAdiposity(corps(seuil))).toBe(false);
      expect(highAdiposity(corps(seuil + 0.01))).toBe(true);
      // Et la bande de rythme bascule AU SEUIL, pas sur la fenêtre de mélange.
      const juste = maxWeeklyLossPct({ ...corps(seuil + 0.01), goal: 'cut' } as never);
      const loin = maxWeeklyLossPct({ ...corps(seuil + ADIPOSITY_BLEND_PTS + 1), goal: 'cut' } as never);
      expect(juste).toBe(loin);
    }
  });

  it('🔴 au-delà de la fenêtre, les planchers de masse maigre sont ENTIÈREMENT retirés', () => {
    // Le gain de la décision du 2026-08-10 : au-dessus, c'est `min_kcal` et le cap à
    // 25 % du TDEE qui protègent, plus rien d'autre. Si un candidat de masse maigre
    // réapparaissait là, on aurait repris ce que cette décision avait donné.
    // ⚠️ Le %MG est un LITTÉRAL, pas `seuil + ADIPOSITY_BLEND_PTS + n` : une borne
    // écrite avec la constante qu'elle garde se déplace avec elle, et une fenêtre
    // élargie à 20 points resterait VERTE. Mesuré — la première version de ce test
    // l'était. 40 % (H) et 50 % (F) sont les corps que la décision du 2026-08-10
    // visait nommément (H 123 kg à 35 %, F 95 kg à 45 %), et au-delà.
    const AU_DELA: Record<Sex, number> = { male: 40, female: 50 };
    for (const sex of ['male', 'female'] as Sex[]) {
      const b = { sex, age: 40, weight_kg: 120, height_cm: 175, body_fat_pct: AU_DELA[sex] } as never;
      const r = safetyFloorBreakdown(b, 2000, 300, 0, 2600);
      expect(r.candidates.bmr).toBe(0);
      expect(r.candidates.energy_availability).toBe(0);
      expect(r.source).toBe('min_kcal');
    }
  });

  it('sous le seuil, rien n’a changé : le plancher est servi en ENTIER', () => {
    for (const sex of ['male', 'female'] as Sex[]) {
      const b = { sex, age: 40, weight_kg: 90, height_cm: 175, body_fat_pct: HIGH_ADIPOSITY_PCT[sex] - 3 } as never;
      const r = safetyFloorBreakdown(b, 1800, 300, 0, 2400);
      expect(r.candidates.bmr).toBe(1800);
    }
  });
});
