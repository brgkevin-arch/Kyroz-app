import { describe, it, expect } from 'vitest';
import { recalcProfile, computePlan, calculateBMR, MIN_KCAL } from '../tdee';
import { bankedTargets } from '../planEngine';
import { MEAL_ORDER, UserProfile, SportSession, Sex, Goal } from '../types';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 IL EXISTE DEUX PLANCHERS, ET LES CONFONDRE EST LE PIÈGE LE PLUS COÛTEUX DU
// MOTEUR — il a déjà fait rejeter une spec (P2.1, le 2026-07-29) et sur-vendre un
// constat d'audit (CA-2-02, le 2026-08-27).
//
//   · `safetyFloorKcal` — le plancher de SÉCURITÉ. Sa composante « énergie
//     disponible » (30 kcal/kg de masse maigre) est une notion de MOYENNE SOUTENUE :
//     le produit la compte en SEMAINES (`low_ea_weeks`), jamais en jours.
//   · `bankFloorKcal` = `max(BMR, filet absolu)` — le seul plancher réellement
//     QUOTIDIEN, et le seul qui doive être infranchissable jour par jour.
//
// La répartition par volume (`lib/dailyBudget.ts`) fait descendre la cible d'un jour
// de repos sous le plancher de SÉCURITÉ, et c'est correct : elle conserve le total de
// la semaine, donc l'exposition hebdomadaire à l'énergie disponible est inchangée.
//
// ⚠️ MAIS TOUT REPOSE SUR CETTE CONSERVATION, ET ELLE N'ÉTAIT MESURÉE NULLE PART.
// L'invariant existant (`volumeConcentre.test.ts`, « la SEMAINE garde son total »)
// porte sur **huit** profils — deux sports × quatre nombres de jours. La moyenne
// hebdomadaire face au plancher de sécurité, elle, n'était comptée par aucun test.
// Une justification qu'aucun test ne compte est une justification décorative : elle
// reste vraie tant que personne ne la casse, et personne ne saura le jour où si.
//
// ⚠️ ET LE QUATRIÈME TEST EST LE PLUS IMPORTANT : il exige que la descente SOUS le
// plancher de sécurité EXISTE. Ce n'est pas un défaut toléré, c'est le mécanisme.
// Quiconque « corrige » la cible du jour en la bornant à `safetyFloorKcal` fera
// rougir ce test-là — et lira pourquoi, au lieu de re-livrer P2.1.

const SPORTS: { nom: string; s: SportSession[]; j: number }[] = [
  { nom: 'aucun', s: [], j: 0 },
  { nom: 'muscu 4×60', s: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }], j: 4 },
  { nom: 'course 2×90', s: [{ type: 'course', sessions_per_week: 2, minutes_per_session: 90 }], j: 2 },
  { nom: 'vélo 2×180', s: [{ type: 'velo', sessions_per_week: 2, minutes_per_session: 180 }], j: 2 },
];
const GOALS: Goal[] = ['cut', 'recomp', 'maintain', 'lean_bulk'];

function profil(
  sex: Sex, poids: number, taille: number, age: number, mg: number,
  g: Goal, sp: SportSession[], j: number, jours: number,
): UserProfile {
  return recalcProfile({
    id: 't', sex, age, weight_kg: poids, height_cm: taille, body_fat_pct: mg,
    activity_level: 'moderate', training_days_per_week: j, sports: sp,
    neat_level: 'desk', goal: g, macro_mode: 'auto',
    tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
    plan_days: jours, plan_weekdays: [0, 1, 2, 3, 4, 5, 6].slice(0, jours),
    meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
    dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  } as unknown as UserProfile);
}

type Cas = {
  nom: string;
  floorSecurite: number;
  floorDur: number;
  ciblePlate: number;
  jours: number;
  cibles: number[];
};

/** Le balayage, calculé UNE fois : ~20 000 profils, tous par le moteur réel. */
const GRILLE: Cas[] = (() => {
  const out: Cas[] = [];
  for (const sex of ['male', 'female'] as Sex[])
    for (const poids of [50, 60, 70, 82, 95, 125])
      for (const taille of [155, 172, 185])
        for (const age of [20, 35, 60])
          for (const mg of [8, 15, 22, 30, 40, 48])
            for (const g of GOALS)
              for (const sp of SPORTS)
                for (const jours of [5, 7]) {
                  const cp = computePlan(profil(sex, poids, taille, age, mg, g, sp.s, sp.j, jours));
                  const cibles = bankedTargets(cp.profile, jours).targets;
                  if (!cibles.length || cibles.some((x) => !Number.isFinite(x))) continue;
                  out.push({
                    nom: `${sex} ${poids}kg ${taille}cm ${age}a ${mg}%MG ${g} ${sp.nom} ${jours}j`,
                    floorSecurite: cp.floor_kcal,
                    // ⚠️ Recalculé À PARTIR DES PRIMITIVES, jamais par `bankFloorKcal` :
                    // un test qui interroge la fonction qu'il garde déplace ses DEUX
                    // côtés à la fois quand on l'affaiblit, et reste vert. Le test dit
                    // la propriété ; il ne redemande pas sa réponse à l'implémentation.
                    floorDur: Math.round(Math.max(calculateBMR(cp.profile), MIN_KCAL[cp.profile.sex])),
                    ciblePlate: cp.profile.target_kcal,
                    jours,
                    cibles,
                  });
                }
  return out;
})();

const somme = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('le plancher SERVI — deux planchers, et un seul est quotidien', () => {
  it('la grille est bien dense — sinon les invariants ne prouvent rien', () => {
    expect(GRILLE.length).toBeGreaterThan(15_000);
  });

  it('🔴 P1 · la SEMAINE conserve son total, au kcal d’arrondi près', () => {
    // C'est LA prémisse qui rend la descente quotidienne légitime. Sans elle, on
    // n'aurait pas déplacé des calories : on en aurait retiré.
    let pire = 0, coupable = '';
    for (const c of GRILLE) {
      const ecart = Math.abs(somme(c.cibles) - c.ciblePlate * c.jours);
      if (ecart > pire) { pire = ecart; coupable = c.nom; }
    }
    // Tolérance = l'arrondi au kcal de chaque jour, rien de plus.
    expect(pire, `pire écart hebdomadaire — ${coupable}`).toBeLessThanOrEqual(7);
  });

  it('🔴 P2 · la MOYENNE de la semaine ne passe jamais sous le plancher de sécurité', () => {
    // L'énergie disponible est une moyenne soutenue. C'est donc la moyenne — et non
    // le minimum — qui doit être confrontée au plancher de sécurité. Cette propriété
    // n'était comptée par AUCUN test : elle était seulement affirmée, deux fois, en
    // commentaire (`dailyBudget.ts` et la docstring de `bankFloorKcal`).
    let pire = 0, coupable = '';
    for (const c of GRILLE) {
      const manque = c.floorSecurite - somme(c.cibles) / c.jours;
      if (manque > pire) { pire = manque; coupable = c.nom; }
    }
    expect(pire, `moyenne hebdomadaire sous le plancher de sécurité — ${coupable}`).toBeLessThanOrEqual(1);
  });

  it('🔴 P3 · aucun JOUR ne passe sous `max(BMR, filet absolu)`', () => {
    // Le plancher réellement quotidien, éprouvé sur des profils RÉELS passés par
    // `computePlan`, et recalculé depuis `calculateBMR` + `MIN_KCAL` plutôt que
    // demandé à `bankFloorKcal`. Le test voisin (`volumeConcentre`) ne l'éprouve que
    // sur un appel synthétique à `dailyBudgets`, en notant lui-même qu'« en production
    // c'est hors d'atteinte » — une supposition, pas une mesure.
    let pire = 0, coupable = '';
    for (const c of GRILLE) {
      const manque = c.floorDur - Math.min(...c.cibles);
      if (manque > pire) { pire = manque; coupable = c.nom; }
    }
    expect(pire, `jour sous le plancher dur — ${coupable}`).toBeLessThanOrEqual(1);
  });

  it('🔴 P4 · la descente sous le plancher de SÉCURITÉ existe, et elle est VOULUE', () => {
    // ⚠️ Ce test échoue si quelqu'un « répare » la cible du jour en la bornant au
    // plancher de sécurité. Ce serait appliquer jour par jour un seuil hebdomadaire —
    // exactement le calcul qui a fait rejeter la spec P2.1 le 2026-07-29, et qui
    // détruirait la répartition par volume livrée le 2026-08-06.
    //
    // Il tient aussi la CERTIFICATION honnête : « aucun plancher contournable » est
    // vrai à l'intérieur de `computePlan`, et faux du nombre que l'écran affiche
    // (`dayTargetKcal` → `plan.tsx`). Tout futur constat de sécurité calorique se
    // mesure sur la cible SERVIE, pas sur `computePlan`.
    const concernes = GRILLE.filter((c) => Math.min(...c.cibles) < c.floorSecurite - 1);
    const part = concernes.length / GRILLE.length;
    expect(part, 'plus aucun jour ne descend : la répartition par volume a été neutralisée').toBeGreaterThan(0.1);

    const pire = Math.max(...concernes.map((c) => c.floorSecurite - Math.min(...c.cibles)));
    // L'ordre de grandeur fait partie du constat : ce n'est pas un arrondi.
    expect(pire).toBeGreaterThan(300);
  });
});
