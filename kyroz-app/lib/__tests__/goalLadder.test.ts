import { describe, it, expect } from 'vitest';
import { deadlineLadder, formatHorizon, readableWeeks, LADDER_SIZE, LadderProbe } from '../goalLadder';
import { datedGoalStatus, addDaysStamp, MAX_PROJECTION_WEEKS } from '../datedGoal';
import { computePlan, recalcProfile, makeWeeklyProjector } from '../tdee';
import { makeProfile } from './helpers';
import { GoalTarget, UserProfile } from '../types';

// ── A27 — la rangée d'échéances ne doit proposer QUE des options réelles ──────
//
// Avant ce chantier, elle offrait cinq durées figées (4/8/12/16/24 semaines) : sur
// 4 corps de référence sur 8, AUCUNE ne tenait. Deux invariants sont vérifiés ici,
// et il faut les deux — le premier seul laisserait passer une rangée honnête mais
// décorative (cf. A23, « un réglage qui ne pilote rien »).

const TODAY = '2026-08-03';

type Cas = { nom: string; p: UserProfile; cible: number };

/**
 * Corps de référence — les mêmes que `npm run mesure:objectif`, plus les deux
 * extrêmes qui manquaient : le tout petit écart, et la PRISE de masse (où les
 * calories servies BAISSENT quand la date s'éloigne, sens inverse de la sèche).
 */
const CAS: Cas[] = [
  { nom: 'F 78 → 65', cible: 65, p: makeProfile({ sex: 'female', age: 32, weight_kg: 78, height_cm: 168, body_fat_pct: 34, goal: 'cut', training_days_per_week: 4 }) },
  { nom: 'F 70 → 62', cible: 62, p: makeProfile({ sex: 'female', age: 30, weight_kg: 70, height_cm: 166, body_fat_pct: 30, goal: 'cut', training_days_per_week: 4 }) },
  { nom: 'F 60 → 57', cible: 57, p: makeProfile({ sex: 'female', age: 30, weight_kg: 60, height_cm: 164, body_fat_pct: 25, goal: 'cut', training_days_per_week: 4 }) },
  { nom: 'H 95 → 82', cible: 82, p: makeProfile({ sex: 'male', age: 34, weight_kg: 95, height_cm: 182, body_fat_pct: 26, goal: 'cut', training_days_per_week: 4 }) },
  { nom: 'H 83 → 70', cible: 70, p: makeProfile({ sex: 'male', age: 30, weight_kg: 83, height_cm: 178, body_fat_pct: 18, goal: 'cut', training_days_per_week: 4 }) },
  { nom: 'H 80 → 74', cible: 74, p: makeProfile({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, body_fat_pct: 16, goal: 'cut', training_days_per_week: 4 }) },
  { nom: 'F 62 → 60', cible: 60, p: makeProfile({ sex: 'female', age: 29, weight_kg: 62, height_cm: 167, body_fat_pct: 24, goal: 'cut', training_days_per_week: 3 }) },
  { nom: 'H 68 → 74 (prise)', cible: 74, p: makeProfile({ sex: 'male', age: 26, weight_kg: 68, height_cm: 178, body_fat_pct: 12, goal: 'lean_bulk', training_days_per_week: 4 }) },
];

/**
 * LA SONDE — exactement celle que câble `profil.tsx`. On ne réplique aucune formule
 * du moteur (CLAUDE.md §10) : on lui demande ce qu'il ferait.
 */
function sonde(base: UserProfile, cible: number): LadderProbe {
  const p0 = recalcProfile(base);
  return (semaines: number) => {
    const gt: GoalTarget = {
      target_weight_kg: cible, target_date: addDaysStamp(TODAY, Math.round(semaines * 7)),
      start_weight_kg: p0.weight_kg, start_date: TODAY,
    };
    const p = { ...p0, goal_target: gt };
    const plan = computePlan(p, TODAY);
    const s = datedGoalStatus(gt, p, TODAY, p0.tdee_kcal, plan?.floor_kcal ?? null, makeWeeklyProjector(p));
    return { reachable: !!s?.reachableByDate, servedKcal: plan?.profile.target_kcal ?? 0 };
  };
}

describe('A27 — échéances dérivées du corps', () => {
  it('CHAQUE puce proposée est réellement tenable', () => {
    for (const c of CAS) {
      const probe = sonde(c.p, c.cible);
      const puces = deadlineLadder(probe);
      expect(puces.length, `${c.nom} : aucune échéance proposée`).toBeGreaterThan(0);
      for (const w of puces) {
        expect(probe(w).reachable, `${c.nom} : la puce ${w} sem ne tient pas`).toBe(true);
      }
    }
  });

  it('CHAQUE puce sert un plan DIFFÉRENT — sinon la rangée est décorative (cf. A23)', () => {
    for (const c of CAS) {
      const probe = sonde(c.p, c.cible);
      const puces = deadlineLadder(probe);
      const kcal = puces.map((w) => probe(w).servedKcal);
      expect(new Set(kcal).size, `${c.nom} : ${puces.join('/')} sem → ${kcal.join('/')} kcal`).toBe(puces.length);
    }
  });

  it('les puces sont croissantes, et il y en a cinq quand la place existe', () => {
    for (const c of CAS) {
      const puces = deadlineLadder(sonde(c.p, c.cible));
      expect(puces).toEqual([...puces].sort((a, b) => a - b));
      expect(new Set(puces).size).toBe(puces.length);
      expect(puces.length).toBe(LADDER_SIZE);
      expect(puces[puces.length - 1]).toBeLessThanOrEqual(MAX_PROJECTION_WEEKS);
    }
  });

  /**
   * L'échelle cherche la première échéance tenable PAR DICHOTOMIE, ce qui suppose
   * l'ensemble tenable fermé vers le haut : une fois qu'une durée tient, toutes les
   * durées plus longues tiennent. Ce n'est garanti par aucune ligne de `datedGoal.ts`
   * — c'est une propriété MESURÉE. Si elle tombe un jour, la dichotomie renverrait
   * une première puce fausse en silence : ce test est là pour que ça rougisse.
   */
  it('l ensemble des échéances tenables n a pas de TROU (ce qui fonde la dichotomie)', () => {
    for (const c of CAS) {
      const probe = sonde(c.p, c.cible);
      let premiere: number | null = null;
      const trous: number[] = [];
      // Pas de 3 semaines : le balayage complet coûterait 260 simulations par corps.
      for (let w = 2; w <= MAX_PROJECTION_WEEKS; w += 3) {
        const ok = probe(w).reachable;
        if (ok && premiere == null) premiere = w;
        else if (premiere != null && !ok) trous.push(w);
      }
      expect(trous, `${c.nom} : tenable puis intenable à ${trous.join(', ')} sem`).toEqual([]);
    }
  });

  it('rien de tenable dans l horizon → aucune échelle (l appelant retombe sur le repli)', () => {
    const jamais: LadderProbe = () => ({ reachable: false, servedKcal: 1800 });
    expect(deadlineLadder(jamais)).toEqual([]);
  });

  it('un plan qui ne bouge JAMAIS ne bloque pas l échelle', () => {
    // Plancher qui mord partout : toutes les durées servent la même assiette. On ne
    // peut alors pas offrir cinq choix distincts — mais on ne doit pas boucler.
    const fige: LadderProbe = (w) => ({ reachable: w >= 10, servedKcal: 1500 });
    const puces = deadlineLadder(fige);
    expect(puces[0]).toBe(10);
    expect(puces.length).toBeGreaterThan(0);
    expect(puces).toEqual([...puces].sort((a, b) => a - b));
  });
});

describe('libellé d une échéance', () => {
  it('semaines, puis mois, puis années — le chiffre juste reste lisible', () => {
    expect(formatHorizon(8)).toBe('8 sem');
    expect(formatHorizon(52)).toBe('52 sem');
    expect(formatHorizon(60)).toBe('14 mois');
    expect(formatHorizon(84)).toBe('19 mois');
    expect(formatHorizon(216)).toBe('4,2 ans');
  });

  it('l arrondi lisible grossit avec la durée', () => {
    expect(readableWeeks(13)).toBe(13);
    expect(readableWeeks(37)).toBe(38);
    expect(readableWeeks(103)).toBe(104);
  });
});
