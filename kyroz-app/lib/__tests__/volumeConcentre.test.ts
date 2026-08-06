import { describe, it, expect } from 'vitest';
import { dailyBudgets } from '../dailyBudget';
import { bankedTargets, dayExpenditures, buildLocalPlan, restDaysForProfile } from '../planEngine';
import { recalcProfile, calculateTDEE } from '../tdee';
import { fatFreeMassKg } from '../safety';
import { exerciseKcalPerWeek, exerciseKcalPerDay } from '../sport';
import type { SportSession, UserProfile } from '../types';

// ── Volume sportif CONCENTRÉ (2026-08-06) ───────────────────────────────────
//
// Le défaut : `exerciseKcalPerDay` lissait la dépense sur 7 jours ET le plan était
// isocalorique. Trois sorties de 45 min et une sortie de 3 h se ressemblaient donc
// au kcal près, et le jour de la sortie longue recevait le budget d'un jour de repos.
// Mesuré (F 60 kg, 25 %MG, sèche) : énergie disponible ANNONCÉE 32,1 quel que soit le
// volume, énergie disponible VÉCUE le jour de la séance 26,8 (3×45), 18,9 (2×90),
// 11,0 (1×120), 0,4 (1×180). L'app conseillait 1683 kcal le jour d'un trois heures.
//
// Ces cas verrouillent les DEUX moitiés du correctif, parce que l'une sans l'autre
// serait pire que rien : le jour de séance doit monter, ET la semaine doit garder son
// total — sinon on aurait corrigé la qualité du plan en cassant le déficit, donc la
// trajectoire datée.

const profil = (sports: SportSession[], over: Partial<UserProfile> = {}): UserProfile =>
  recalcProfile({
    id: 'test', sex: 'female', age: 30, weight_kg: 60, height_cm: 165, body_fat_pct: 25,
    activity_level: 'moderate', training_days_per_week: sports[0]?.sessions_per_week ?? 4,
    sports, neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
    ...over,
  } as UserProfile);

const COURSE_1x180: SportSession[] = [{ type: 'course', sessions_per_week: 1, minutes_per_session: 180 }];
const MUSCU_4x60: SportSession[] = [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }];

describe('volume concentré — le budget du jour suit la dépense du jour', () => {
  it('LA mesure du défaut : l’énergie disponible VÉCUE rejoint celle qu’on annonce', () => {
    // C'est le cas qui justifie tout le reste. Sans lui, les autres ne disent que
    // « des nombres ont bougé » ; celui-ci dit POURQUOI ils devaient bouger.
    for (const sports of [COURSE_1x180, MUSCU_4x60]) {
      const p = profil(sports);
      const ffm = fatFreeMassKg(p);
      const parSeance = exerciseKcalPerWeek(sports, p.weight_kg) / sports[0].sessions_per_week;
      const repos = restDaysForProfile(p, 7);
      const cibles = bankedTargets(p, 7).targets;

      const eaAnnoncee = (p.target_kcal - exerciseKcalPerDay(sports, p.weight_kg)) / ffm;
      const jourSeance = cibles.find((_, i) => !repos.has(i + 1))!;
      const eaVecue = (jourSeance - parSeance) / ffm;

      // Avant correctif, l'écart valait 31,7 points sur `1×180` (32,1 annoncé, 0,4 vécu).
      expect(Math.abs(eaVecue - eaAnnoncee), `EA vécue ${eaVecue.toFixed(1)} vs annoncée ${eaAnnoncee.toFixed(1)}`)
        .toBeLessThan(0.5);
    }
  });

  it('la SEMAINE garde son total — le déficit et la date ne bougent pas', () => {
    // L'invariant qui rend le correctif acceptable. S'il tombe, on aurait déplacé le
    // problème dans la trajectoire datée, où il serait bien plus difficile à voir.
    for (const sports of [COURSE_1x180, MUSCU_4x60]) {
      for (const days of [7, 5, 3, 1]) {
        const p = profil(sports, { plan_days: days, plan_weekdays: [0, 1, 2, 3, 4, 5, 6].slice(0, days) });
        const somme = bankedTargets(p, days).targets.reduce((s, x) => s + x, 0);
        // Tolérance = l'arrondi au kcal de chaque jour, rien de plus.
        expect(Math.abs(somme - p.target_kcal * days), `${days} j, ${sports[0].type}`).toBeLessThanOrEqual(days);
      }
    }
  });

  it('le jour de séance mange plus que le jour de repos, à proportion du volume', () => {
    const ecart = (sports: SportSession[]) => {
      const p = profil(sports);
      const repos = restDaysForProfile(p, 7);
      const c = bankedTargets(p, 7).targets;
      return c.find((_, i) => !repos.has(i + 1))! - c.find((_, i) => repos.has(i + 1))!;
    };
    // Le rapport n'est pas un réglage : c'est celui des dépenses réelles. Une séance
    // de 3 h creuse donc un écart bien plus grand que 4 séances d'une heure — et c'est
    // exactement ce que le moteur ne savait pas faire.
    expect(ecart(MUSCU_4x60)).toBeGreaterThan(0);
    expect(ecart(COURSE_1x180)).toBeGreaterThan(4 * ecart(MUSCU_4x60));
  });

  it('sans sport déclaré, aucune répartition n’est inventée', () => {
    // Un profil legacy sans séances n'apporte AUCUNE mesure de dépense : le seul
    // comportement honnête est de ne rien en déduire. `training_days_per_week` est
    // une déclaration, pas une mesure — un tag posé à la main n'arbitre pas mieux
    // qu'un moteur qui mesure.
    const p = profil([], { training_days_per_week: 4, sports: undefined });
    const cibles = bankedTargets(p, 7).targets;
    expect(new Set(cibles).size, `cibles=${cibles.join(',')}`).toBe(1);
    expect(cibles[0]).toBe(p.target_kcal);
  });

  it('aucun jour ne passe sous le plancher quotidien, et ce qui ne passe pas est DÉCLARÉ', () => {
    // ⚠️ Premier essai, qui NE saturait pas, et le noter vaut mieux que le refaire :
    // une dépense énorme concentrée sur un jour (4000 contre 1500) se répartit très
    // bien — le jour chargé a largement de quoi rendre aux six autres. Le mécanisme
    // est plus robuste que prévu ; ce n'est pas là que ça casse.
    //
    // La saturation réelle demande une cible SOUS le plancher quotidien. En production
    // c'est hors d'atteinte (`target_kcal` est déjà passé par `safetyFloorKcal`, donc
    // ≥ BMR ≥ `bankFloorKcal`), et c'est justement pour ça qu'on l'éprouve ici : une
    // branche défensive que rien n'exerce est une branche dont on ne sait rien.
    const r = dailyBudgets({
      days: 7,
      baseTargetKcal: 1300,
      dayExpenditureKcal: [4000, 1500, 1500, 1500, 1500, 1500, 1500],
      floorKcal: 1350,
    });
    expect(Math.min(...r.targets)).toBeGreaterThanOrEqual(1350);
    // Ce qui n'a pas pu être repris est DÉCLARÉ, pas avalé — et le chiffre déclaré
    // vaut exactement le dépassement réel de la semaine.
    const depassement = r.targets.reduce((s, x) => s + x, 0) - 1300 * 7;
    expect(depassement).toBeGreaterThan(0);
    expect(r.uncompensatedKcal).toBe(depassement);
  });

  it('la dépense du jour vaut BMR×NEAT + la séance, et sa moyenne retombe sur le TDEE', () => {
    // Verrouille le raccordement au reste du moteur : si `dayExpenditures` dérivait de
    // `calculateTDEE`, la répartition serait juste entre elle et fausse pour tout le
    // reste — et rien d'autre ne le dirait.
    const p = profil(MUSCU_4x60);
    const dep = dayExpenditures(p, 7);
    const moyenne = dep.reduce((s, x) => s + x, 0) / 7;
    expect(Math.abs(moyenne - calculateTDEE(p))).toBeLessThan(2);
  });

  it('le PLAN servi suit vraiment, il n’y a pas que la cible qui bouge', () => {
    // ⚠️ Le mode d'échec de la famille A9 : une cible corrigée que l'ASSIETTE ne suit
    // pas. On mesure donc le plan, pas le budget.
    const p = profil(COURSE_1x180);
    const repos = restDaysForProfile(p, 7);
    const jours = buildLocalPlan(p, 0).total_macros_per_day.map((m) => m.kcal);
    const seance = jours.filter((_, i) => !repos.has(i + 1));
    const off = jours.filter((_, i) => repos.has(i + 1));
    expect(Math.min(...seance), `séance=${seance.join(',')}`).toBeGreaterThan(Math.max(...off) + 1000);
  });
});
