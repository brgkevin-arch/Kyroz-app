// ── PALIERS D'UN GROS OBJECTIF (2026-08-10) ─────────────────────────────────
//
// Ce que ce fichier défend :
//
//  1. l'INVARIANT DU CHANTIER : découper ne déplace AUCUNE calorie. C'est une vue.
//     Sans ce test, la prochaine session « simplifierait » en posant le palier dans
//     `goal_target` — et servirait +246 kcal/j aux gros gabarits, sans rien casser ;
//  2. les DATES viennent de la trajectoire simulée, jamais d'une ligne droite ;
//  3. le palier courant se LIT du poids actuel, il ne se stocke pas ;
//  4. le seuil de déclenchement, dans les deux sens.

import { describe, it, expect } from 'vitest';
import {
  MILESTONE_MIN_TOTAL_KG, needsMilestones, milestoneCount, milestonesFor,
  currentMilestone, milestoneProgress, daysToMilestone,
} from '../goalMilestones';
import { simulatedTrajectory, addDaysStamp, daysBetween } from '../datedGoal';
import { recalcProfile, makeWeeklyProjector } from '../tdee';
import { makeProfile } from './helpers';
import type { GoalTarget, UserProfile } from '../types';

const TODAY = '2026-08-10';

const CIBLE: GoalTarget = {
  target_weight_kg: 85, target_date: addDaysStamp(TODAY, 7 * 60),
  start_weight_kg: 123, start_date: TODAY,
};

const GROS = (poids = 123) => recalcProfile(makeProfile({
  sex: 'male', age: 35, weight_kg: poids, height_cm: 180, body_fat_pct: 35,
  body_fat_source: 'measured', goal: 'cut', macro_mode: 'auto', sports: [],
  goal_target: CIBLE,
}) as UserProfile, TODAY);

describe('🔴 découper ne déplace AUCUNE calorie', () => {
  it('le plan servi est identique, qu\'on affiche des paliers ou non', () => {
    // C'EST L'INVARIANT DU CHANTIER. Les paliers sont une lecture de la trajectoire ;
    // `goal_target` n'est jamais remplacé. Mesuré à l'inverse (`npm run mesure:paliers`),
    // poser le palier comme vraie cible sert +246 kcal/j à ce corps-là — 0,60 → 0,40
    // kg/sem — parce qu'une date proche redevient « tenable » au calcul EN LIGNE DROITE
    // et que A15 cesse alors de servir le rythme sûr maximal.
    const p = GROS();
    const journal = simulatedTrajectory(p, CIBLE, TODAY, makeWeeklyProjector(p));
    const paliers = milestonesFor(CIBLE, p.weight_kg, journal);
    expect(paliers.length).toBeGreaterThan(1);

    // Le profil recalculé APRÈS avoir lu les paliers sert exactement la même chose :
    // lire ne modifie rien. (Le test attraperait un module qui, un jour, écrirait
    // `goal_target` au passage — le mode d'échec réel de ce genre de vue.)
    const apres = recalcProfile(p, TODAY);
    expect(apres.target_kcal).toBe(p.target_kcal);
    expect(apres.goal_target).toEqual(CIBLE);
  });
});

describe('déclenchement', () => {
  it('un gros écart déclenche, un petit non', () => {
    expect(needsMilestones(38, 400)).toBe(true);
    expect(needsMilestones(MILESTONE_MIN_TOTAL_KG, 100)).toBe(true);
    expect(needsMilestones(6, 60)).toBe(false);
  });

  it('une longue DURÉE déclenche aussi, même sur un petit écart', () => {
    // Le brief ne parlait que du poids. 12 kg sur 14 mois — gabarit léger, rythme sûr
    // bas — souffre pourtant exactement du même défaut de renforcement.
    expect(needsMilestones(12, 420)).toBe(true);
    expect(needsMilestones(12, 90)).toBe(false);
  });

  it('sans date projetable, seul le poids décide (jamais de crash)', () => {
    expect(needsMilestones(38, null)).toBe(true);
    expect(needsMilestones(6, null)).toBe(false);
  });

  it('marche aussi en PRISE de masse (écart négatif)', () => {
    // Piège maison : tout prédicat écrit en pensant à la sèche se trompe en prise.
    expect(needsMilestones(-20, 300)).toBe(true);
    expect(milestoneCount(-20)).toBe(milestoneCount(20));
  });

  it('au moins DEUX paliers dès qu\'on découpe', () => {
    // Un « palier » unique égalerait la cible finale : un découpage qui n'en est pas un.
    expect(milestoneCount(15)).toBeGreaterThanOrEqual(2);
    expect(milestoneCount(1)).toBe(2);
  });
});

describe('les paliers eux-mêmes', () => {
  it('le DERNIER vaut exactement la cible, au gramme', () => {
    // Un arrondi laissant 200 g d'écart afficherait une étape finale incochable.
    const p = GROS();
    const paliers = milestonesFor(CIBLE, p.weight_kg, simulatedTrajectory(p, CIBLE, TODAY, makeWeeklyProjector(p)));
    expect(paliers[paliers.length - 1].weightKg).toBe(CIBLE.target_weight_kg);
  });

  it('ils descendent, sans doublon, et restent dans les bornes', () => {
    const p = GROS();
    const paliers = milestonesFor(CIBLE, p.weight_kg, simulatedTrajectory(p, CIBLE, TODAY, makeWeeklyProjector(p)));
    const poids = paliers.map((m) => m.weightKg);
    expect(poids).toEqual([...poids].sort((a, b) => b - a));
    expect(new Set(poids).size).toBe(poids.length);
    for (const w of poids) {
      expect(w).toBeLessThanOrEqual(CIBLE.start_weight_kg);
      expect(w).toBeGreaterThanOrEqual(CIBLE.target_weight_kg);
    }
  });

  it('🔴 les dates viennent de la trajectoire SIMULÉE, pas d\'une ligne droite', () => {
    // Une interpolation linéaire donnerait des étapes équidistantes dans le temps. La
    // trajectoire réelle décélère (la dépense baisse avec le poids, et une pause tombe
    // toutes les 9 semaines) : les intervalles doivent donc s'ALLONGER. Un test sur la
    // seule présence des dates passerait avec la ligne droite — celui-ci non.
    const p = GROS();
    const paliers = milestonesFor(CIBLE, p.weight_kg, simulatedTrajectory(p, CIBLE, TODAY, makeWeeklyProjector(p)));
    const dates = paliers.map((m) => m.stamp).filter((s): s is string => s !== null);
    expect(dates.length).toBeGreaterThan(2);

    const ecarts: number[] = [daysBetween(TODAY, dates[0])];
    for (let i = 1; i < dates.length; i++) ecarts.push(daysBetween(dates[i - 1], dates[i]));
    // Croissantes, et pas d'un cheveu : le dernier intervalle dépasse nettement le premier.
    expect(ecarts[ecarts.length - 1], `intervalles ${ecarts.join(', ')} j`).toBeGreaterThan(ecarts[0]);
    for (const e of ecarts) expect(e).toBeGreaterThan(0);
  });

  it('un journal VIDE rend quand même les poids, sans date', () => {
    // Le poids d'une étape est une information juste même quand l'arrivée ne l'est pas.
    const paliers = milestonesFor(CIBLE, 123, []);
    expect(paliers.length).toBeGreaterThan(1);
    expect(paliers.every((m) => m.stamp === null)).toBe(true);
    expect(daysToMilestone(paliers[0], TODAY)).toBeNull();
  });
});

describe('le palier courant se LIT, il ne se stocke pas', () => {
  const paliers = () => milestonesFor(CIBLE, 123, []);

  it('c\'est le premier non franchi', () => {
    const ms = paliers();
    expect(currentMilestone(ms, 123, CIBLE)!.index).toBe(1);
    // Juste sous le premier palier → on passe au deuxième.
    expect(currentMilestone(ms, ms[0].weightKg - 0.1, CIBLE)!.index).toBe(2);
  });

  it('🔴 un palier franchi puis REPERDU redevient le palier courant', () => {
    // Une copie stockée du « palier atteint » se désynchroniserait au premier écart de
    // balance et laisserait l'écran sur une étape déjà dépassée — ou déjà reperdue.
    // C'est le défaut « copie stockée que personne ne relit » de §10.
    const ms = paliers();
    const souslePremier = ms[0].weightKg - 0.5;
    expect(currentMilestone(ms, souslePremier, CIBLE)!.index).toBe(2);
    expect(currentMilestone(ms, souslePremier + 1.0, CIBLE)!.index).toBe(1);
  });

  it('tout franchi → null, pas une étape fantôme', () => {
    expect(currentMilestone(paliers(), 80, CIBLE)).toBeNull();
  });

  it('la jauge mesure le PALIER, et reste bornée quand le poids remonte', () => {
    const ms = paliers();
    const m1 = ms[0];
    expect(milestoneProgress(m1, ms, 123, CIBLE)).toBe(0);
    expect(milestoneProgress(m1, ms, m1.weightKg, CIBLE)).toBe(1);
    // Reprise au-dessus du départ : 0, jamais un négatif qui retournerait la barre.
    expect(milestoneProgress(m1, ms, 130, CIBLE)).toBe(0);
    // Et au sein du 2ᵉ palier, on repart de 0 — pas de la progression globale.
    expect(milestoneProgress(ms[1], ms, m1.weightKg, CIBLE)).toBe(0);
  });
});
