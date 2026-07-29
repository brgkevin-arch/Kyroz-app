import { describe, it, expect } from 'vitest';
import { calculateMacros, computePlan, goalLabel, recalcProfile } from '../tdee';
import { normalizeGoal } from '../syncGuard';
import { makeProfile } from './helpers';
import { Goal } from '../types';

// ── Fusion des deux sèches (2026-07-29) ─────────────────────────────────────
//
// `cut_aggressive` (−500 kcal/j) servait exactement le même plan que `cut`
// (−300) : le plancher de sécurité absorbait l'écart. Ces tests verrouillent
// les DEUX moitiés de la décision — le fait mesuré qui la justifie, et la
// mécanique qui referme les comptes existants.

const T = '2026-07-28';

describe('le choix était fantôme — c\'est CE fait qui justifie la fusion', () => {
  it('les deux objectifs servaient les mêmes calories, %MG déclaré', () => {
    // 0 % d'écart mesuré sur 1764 profils à %MG déclaré. On en fige quelques-uns :
    // si un jour ce test rougit, c'est que le plancher a changé — et alors la
    // question de rouvrir un objectif « rapide » se repose légitimement.
    const cas = [
      { sex: 'male' as const, weight_kg: 85, height_cm: 178, age: 30, body_fat_pct: 20 },
      { sex: 'male' as const, weight_kg: 75, height_cm: 175, age: 25, body_fat_pct: 12 },
      { sex: 'female' as const, weight_kg: 62, height_cm: 165, age: 35, body_fat_pct: 30 },
      { sex: 'female' as const, weight_kg: 95, height_cm: 160, age: 45, body_fat_pct: 40 },
    ];
    for (const c of cas) {
      const lent = computePlan(makeProfile({ ...c, goal: 'cut', sports: [] }), T);
      const rapide = computePlan(makeProfile({ ...c, goal: 'cut_aggressive', sports: [] }), T);
      expect(rapide.profile.target_kcal, `${c.sex} ${c.weight_kg}kg`).toBe(lent.profile.target_kcal);
      // Et c'est bien le plancher qui l'explique, pas un hasard d'arrondi.
      expect(lent.flags).toContain('FLOOR_APPLIED');
    }
  });

  it('le plancher mordait AVANT que le delta de l\'objectif ait son mot à dire', () => {
    // La demande de « sèche rapide » (tdee − 500) part SOUS le plancher : elle est
    // relevée, et atterrit exactement là où « sèche » (tdee − 300) atterrissait.
    const p = makeProfile({ sex: 'male', weight_kg: 85, height_cm: 178, age: 30, body_fat_pct: 20, goal: 'cut_aggressive', sports: [] });
    const { profile, floor_kcal } = computePlan(p, T);
    expect(profile.tdee_kcal - 500).toBeLessThan(floor_kcal);
    expect(profile.target_kcal).toBe(floor_kcal);
  });
});

describe('normalizeGoal — referme les comptes existants', () => {
  it('ramène `cut_aggressive` sur `cut`, et ne touche à rien d\'autre', () => {
    expect(normalizeGoal({ goal: 'cut_aggressive' })!.goal).toBe('cut');
    for (const g of ['cut', 'recomp', 'maintain', 'lean_bulk', 'bulk'] as Goal[]) {
      expect(normalizeGoal({ goal: g })!.goal).toBe(g);
    }
  });

  it('préserve le reste du profil, et supporte null', () => {
    const p = makeProfile({ goal: 'cut_aggressive', weight_kg: 77, carb_ratio: 42 });
    const n = normalizeGoal(p)!;
    expect(n.goal).toBe('cut');
    expect(n.weight_kg).toBe(77);
    expect(n.carb_ratio).toBe(42);
    expect(normalizeGoal(null)).toBeNull();
    // Ne recopie pas inutilement quand il n'y a rien à faire (référence identique).
    const deja = makeProfile({ goal: 'cut' });
    expect(normalizeGoal(deja)).toBe(deja);
  });

  it('le moteur sait ENCORE calculer un profil `cut_aggressive` non normalisé', () => {
    // Une ligne cloud peut arriver avec l'ancien objectif avant d'être normalisée :
    // le retirer de GOAL_CONFIG ferait planter le calcul sur `undefined.kcalDelta`.
    const p = makeProfile({ goal: 'cut_aggressive' });
    expect(() => recalcProfile(p, T)).not.toThrow();
    expect(recalcProfile(p, T).target_kcal).toBeGreaterThan(0);
    expect(goalLabel('cut_aggressive')).toBeTruthy();
  });
});

describe('libellé', () => {
  it('« Sèche » et non « Sèche progressive » : il n\'y a plus rien en face', () => {
    expect(goalLabel('cut')).toBe('Sèche');
  });
});

describe('isTrainingDay — un profil sans séance n\'a pas de jour de séance', () => {
  it('CARBS_BELOW_TRAINING_FLOOR ne se lève plus à ZÉRO séance déclarée', () => {
    // Mesuré avant correctif : H 70 kg sédentaire recevait 189 g de glucides et le
    // drapeau se levait contre un seuil « jour de séance » de 210 g — un
    // avertissement de qualité d'entraînement servi à qui ne s'entraîne pas.
    const p = makeProfile({
      sex: 'male', weight_kg: 70, height_cm: 175, age: 30, goal: 'cut',
      sports: [], training_days_per_week: 0,
    });
    const { profile, flags } = computePlan(p, T);
    expect(profile.target_carbs_g).toBeLessThan(3 * 70); // la condition de grammes EST remplie…
    expect(flags).not.toContain('CARBS_BELOW_TRAINING_FLOOR'); // …mais le drapeau n'a pas lieu d'être
  });

  it('il reste levé quand des séances SONT déclarées', () => {
    const p = makeProfile({
      sex: 'male', weight_kg: 70, height_cm: 175, age: 30, goal: 'cut',
      sports: [{ type: 'marche_rapide', sessions_per_week: 3, minutes_per_session: 45 }],
    });
    const { profile, flags } = computePlan(p, T);
    expect(profile.target_carbs_g).toBeLessThan(3 * 70);
    expect(flags).toContain('CARBS_BELOW_TRAINING_FLOOR');
  });

  it('un appel EXPLICITE garde le dernier mot sur le défaut dérivé', () => {
    // Le défaut est dérivé, il n'est pas imposé : `opts.isTrainingDay` reste le
    // point d'entrée pour un appelant qui SAIT de quel jour il parle — c'est ce
    // dont le moteur de plan aura besoin le jour où il distinguera les jours de
    // repos (cf. restDaysForProfile). On vérifie les deux sens de la surcharge.
    // `recalcProfile` et non la valeur du fixture : `makeProfile` porte un
    // `tdee_kcal` figé de 2914, qui n'a rien à voir avec ce gabarit de 70 kg.
    const body = recalcProfile(makeProfile({ sex: 'male', weight_kg: 70, height_cm: 175, age: 30, sports: [] }), T);

    // Sans séance déclarée, mais l'appelant affirme que c'est un jour de séance :
    const force = calculateMacros(body.tdee_kcal, 'cut', body, { isTrainingDay: true });
    expect(force.carbs_g).toBeLessThan(3 * 70);
    expect(force.flags).toContain('CARBS_BELOW_TRAINING_FLOOR');

    // Avec des séances déclarées, mais l'appelant affirme que c'est un jour off :
    const avecSport = recalcProfile(makeProfile({
      sex: 'male', weight_kg: 70, height_cm: 175, age: 30,
      sports: [{ type: 'marche_rapide', sessions_per_week: 3, minutes_per_session: 45 }],
    }), T);
    const off = calculateMacros(avecSport.tdee_kcal, 'cut', avecSport, { isTrainingDay: false });
    expect(off.carbs_g).toBeLessThan(3 * 70);
    expect(off.flags).not.toContain('CARBS_BELOW_TRAINING_FLOOR');
  });
});
