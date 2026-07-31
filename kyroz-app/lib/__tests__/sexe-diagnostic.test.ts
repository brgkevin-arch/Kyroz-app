/**
 * DIAGNOSTIC (2026-07-31) — « deux profils identiques sauf `sex` sortent le même
 * TDEE et les mêmes macros ». Ce fichier ne corrige rien : il INSTRUMENTE le
 * moteur et logue toutes les valeurs intermédiaires, %MG déclaré puis %MG absent.
 *
 * Lancer : npx vitest run lib/__tests__/sexe-diagnostic.test.ts --reporter=verbose
 */
import { describe, it, expect } from 'vitest';
import {
  calculateBMR, calculateTDEE, computePlan, leanBodyMass,
} from '../tdee';
import {
  EA_HARD_FLOOR, MIN_KCAL, effectiveEaPerKgFfm, fatFreeMassKg, resolvedBodyFatPct,
  energyAvailability,
} from '../safety';
import { exerciseKcalPerDay } from '../sport';
import { MAX_DEFICIT_TDEE_RATIO } from '../datedGoal';
import { makeProfile } from './helpers';
import type { Sex, UserProfile } from '../types';

const TODAY = '2026-07-31';

const BASE = {
  age: 35,
  weight_kg: 80,
  height_cm: 170,
  goal: 'cut' as const,
  macro_mode: 'auto' as const,
  neat_level: 'desk' as const,
  training_days_per_week: 4,
  sports: [{ type: 'musculation' as const, sessions_per_week: 4, minutes_per_session: 60 }],
};

/** Identifie la formule EFFECTIVEMENT empruntée en comparant la sortie du moteur
 *  aux deux candidates. On n'utilise PAS ces formules pour conclure quoi que ce
 *  soit d'autre — uniquement pour nommer la branche prise. */
function formuleEmpruntee(sex: Sex, w: number, h: number, age: number, bf?: number): string {
  const moteur = calculateBMR(sex, w, h, age, bf);
  const mifflin = Math.round(10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : -161));
  const katch = bf != null
    ? Math.round(370 + 21.6 * leanBodyMass(sex, w, bf))
    : NaN;
  if (moteur === katch) return `Katch-McArdle (370 + 21,6 × masse maigre) — AUCUNE entrée « sexe »`;
  if (moteur === mifflin) return `Mifflin-St Jeor (…${sex === 'male' ? '+5' : '−161'}) — terme de sexe PRÉSENT`;
  return `??? moteur=${moteur} katch=${katch} mifflin=${mifflin}`;
}

function radiographie(sex: Sex, bf: number | undefined) {
  const p: UserProfile = makeProfile({ ...BASE, sex, body_fat_pct: bf });
  const { profile: r, floor_kcal, flags } = computePlan(p, TODAY);

  const bmr = calculateBMR(sex, p.weight_kg, p.height_cm, p.age, bf);
  const tdee = calculateTDEE(p);
  const sport = exerciseKcalPerDay(p.sports, p.weight_kg);
  const ffm = fatFreeMassKg(p);
  const eaSeuil = effectiveEaPerKgFfm(p, 0);

  return {
    sex,
    bfDeclare: bf ?? null,
    bfResolu: Math.round(resolvedBodyFatPct(p) * 10) / 10,
    formule: formuleEmpruntee(sex, p.weight_kg, p.height_cm, p.age, bf),
    masseMaigre: Math.round(ffm * 10) / 10,
    bmr,
    neatPal: 1.20,
    sportKcalJour: Math.round(sport),
    tdee,
    demande: tdee - 300,                                     // GOAL_CONFIG.cut
    // Les trois composantes du plancher, séparément.
    planchers: {
      bmr,
      ea: Math.round(eaSeuil * ffm + sport),
      eaPlafonneAuTdee: Math.round(Math.min(eaSeuil * ffm + sport, tdee)),
      filetAbsolu: MIN_KCAL[sex],
      capDeficit25pct: Math.round(tdee * (1 - MAX_DEFICIT_TDEE_RATIO)),
    },
    plancherRetenu: floor_kcal,
    cible: r.target_kcal,
    ea: Math.round(energyAvailability(p, r.target_kcal, sport) * 10) / 10,
    macros: `P${r.target_protein_g} / G${r.target_carbs_g} / L${r.target_fat_g}`,
    flags,
  };
}

function afficher(titre: string, f: ReturnType<typeof radiographie>, h: ReturnType<typeof radiographie>) {
  const l = (k: string, a: unknown, b: unknown) => {
    const eg = JSON.stringify(a) === JSON.stringify(b) ? '=' : '≠';
    console.log(`  ${k.padEnd(26)} F ${String(a).padEnd(28)} ${eg}  H ${String(b)}`);
  };
  console.log(`\n${'═'.repeat(96)}\n${titre}\n${'═'.repeat(96)}`);
  console.log(`  formule F : ${f.formule}`);
  console.log(`  formule H : ${h.formule}`);
  l('%MG déclaré', f.bfDeclare, h.bfDeclare);
  l('%MG résolu (effectif)', f.bfResolu, h.bfResolu);
  l('masse maigre (kg)', f.masseMaigre, h.masseMaigre);
  l('BMR', f.bmr, h.bmr);
  l('× NEAT (desk)', f.neatPal, h.neatPal);
  l('+ sport (kcal/j)', f.sportKcalJour, h.sportKcalJour);
  l('= TDEE', f.tdee, h.tdee);
  l('cible demandée (−300)', f.demande, h.demande);
  console.log('  ── planchers candidats ──');
  l('  · BMR', f.planchers.bmr, h.planchers.bmr);
  l('  · EA 30×FFM + sport', f.planchers.ea, h.planchers.ea);
  l('  · EA plafonné au TDEE', f.planchers.eaPlafonneAuTdee, h.planchers.eaPlafonneAuTdee);
  l('  · filet absolu MIN_KCAL', f.planchers.filetAbsolu, h.planchers.filetAbsolu);
  l('  · cap déficit 25 %', f.planchers.capDeficit25pct, h.planchers.capDeficit25pct);
  l('PLANCHER RETENU (max)', f.plancherRetenu, h.plancherRetenu);
  l('CIBLE SERVIE', f.cible, h.cible);
  l('énergie dispo (kcal/kg)', f.ea, h.ea);
  l('MACROS', f.macros, h.macros);
  l('drapeaux', f.flags.join(','), h.flags.join(','));
}

describe('DIAGNOSTIC — où le sexe agit, et où il ne peut pas agir', () => {
  it('point 1+2 — %MG DÉCLARÉ (20 %) : radiographie complète', () => {
    const f = radiographie('female', 20);
    const h = radiographie('male', 20);
    afficher('AVEC %MG DÉCLARÉ = 20 %', f, h);

    // Constat brut, sans jugement : tout est égal.
    expect(f.bmr).toBe(h.bmr);
    expect(f.tdee).toBe(h.tdee);
    expect(f.cible).toBe(h.cible);
    expect(f.macros).toBe(h.macros);
    // …et la formule empruntée n'a pas d'entrée « sexe ».
    expect(f.formule).toContain('Katch-McArdle');
    expect(h.formule).toContain('Katch-McArdle');
  });

  it('point 3 — %MG ABSENT : le TDEE DOIT diverger (Mifflin)', () => {
    const f = radiographie('female', undefined);
    const h = radiographie('male', undefined);
    afficher('SANS %MG DÉCLARÉ (body_fat_pct = undefined)', f, h);

    expect(f.formule).toContain('Mifflin');
    expect(h.formule).toContain('Mifflin');
    // L'écart Mifflin est exactement +5 − (−161) = 166 kcal de BMR.
    expect(h.bmr - f.bmr).toBe(166);
    expect(h.tdee).toBeGreaterThan(f.tdee);
    expect(h.cible).toBeGreaterThan(f.cible);
  });

  it('point 3 bis — le sexe atteint bien le calcul : il change AUSSI le %MG estimé', () => {
    // Sans %MG déclaré, `resolvedBodyFatPct` applique Deurenberg, qui a un terme
    // de sexe (−10,8 × male). Le sexe atteint donc le pipeline par DEUX chemins.
    const f = radiographie('female', undefined);
    const h = radiographie('male', undefined);
    expect(f.bfResolu).toBeGreaterThan(h.bfResolu);
    expect(f.masseMaigre).toBeLessThan(h.masseMaigre);
    console.log(`\n  Deurenberg : %MG estimé F ${f.bfResolu} vs H ${h.bfResolu} → masse maigre F ${f.masseMaigre} vs H ${h.masseMaigre} kg`);
  });

  it('point 4 — le PLANCHER lui aussi ignore le sexe à masse maigre égale', () => {
    // EA_HARD_FLOOR est unique pour les deux sexes (décision CLAUDE.md §6).
    const f = makeProfile({ ...BASE, sex: 'female', body_fat_pct: 20 });
    const h = makeProfile({ ...BASE, sex: 'male', body_fat_pct: 20 });
    expect(effectiveEaPerKgFfm(f, 0)).toBe(EA_HARD_FLOOR);
    expect(effectiveEaPerKgFfm(h, 0)).toBe(EA_HARD_FLOOR);
    expect(fatFreeMassKg(f)).toBe(fatFreeMassKg(h));
    console.log(`\n  EA_HARD_FLOOR = ${EA_HARD_FLOOR} kcal/kg de masse maigre — IDENTIQUE F et H`);
    console.log(`  MIN_KCAL       = F ${MIN_KCAL.female} / H ${MIN_KCAL.male} — seul garde-fou sexué du plancher`);
  });
});
