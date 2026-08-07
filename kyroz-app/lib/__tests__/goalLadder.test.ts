import { describe, it, expect } from 'vitest';
import {
  deadlineLadder, formatHorizon, readableWeeks, LADDER_SIZE, LadderProbe,
  checkEcheance, messageEcheance, HORIZON_ANS,
} from '../goalLadder';
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

// ── Une échéance SAISIE à la main (2026-08-07) ────────────────────────────────
//
// La rangée dérivée du corps reste le chemin recommandé ; la date libre existe pour un
// vrai événement. Ce qui est vérifié ici, c'est qu'elle ne refuse QUE ce dont l'app ne
// peut rien dire de vrai — et le dernier test mesure sur le MOTEUR pourquoi la borne
// des 5 ans existe, au lieu de figer une constante par décret.

describe('échéance saisie — on ne refuse que ce qui mentirait', () => {
  it('une date à venir, complète et réelle, passe', () => {
    expect(checkEcheance('2026-11-14', true, TODAY)).toBeNull();
    expect(checkEcheance(addDaysStamp(TODAY, 1), true, TODAY)).toBeNull();
  });

  it('une saisie incomplète se TAIT au lieu de crier « date invalide »', () => {
    // Le champ n'a pas encore ses trois nombres : rien n'est fautif, la personne tape.
    expect(checkEcheance(undefined, false, TODAY)).toBe('incomplete');
    expect(messageEcheance('incomplete')).toMatch(/Complète la date/);
  });

  it('une date complète qui N EXISTE PAS est nommée comme telle (31 février)', () => {
    // `DateInput` ne produit aucun stamp pour le 31/02 — c'est `complete` qui distingue
    // « il manque le mois » de « ce jour n'existe pas ».
    expect(checkEcheance(undefined, true, TODAY)).toBe('impossible');
    expect(messageEcheance('impossible')).toMatch(/n’existe pas/);
  });

  it('AUJOURD HUI et le PASSÉ sont refusés — ils créeraient un objectif inactif', () => {
    // `datedGoalStatus` rend `active: false` dès que l'échéance est nulle ou dépassée :
    // l'objectif serait enregistré et ne piloterait rien, en silence.
    expect(checkEcheance(TODAY, true, TODAY)).toBe('passee');
    expect(checkEcheance(addDaysStamp(TODAY, -1), true, TODAY)).toBe('passee');
    expect(checkEcheance('2020-01-01', true, TODAY)).toBe('passee');
  });

  it('l horizon de projection est la borne haute, et le message le dit en ANNÉES', () => {
    expect(checkEcheance(addDaysStamp(TODAY, MAX_PROJECTION_WEEKS * 7), true, TODAY)).toBeNull();
    expect(checkEcheance(addDaysStamp(TODAY, MAX_PROJECTION_WEEKS * 7 + 1), true, TODAY)).toBe('trop_loin');
    // Le libellé est DÉRIVÉ de l'horizon, pas recopié : changer MAX_PROJECTION_WEEKS
    // doit changer la phrase, sinon l'écran promet un horizon que le moteur n'a plus.
    expect(HORIZON_ANS).toBe(Math.round(MAX_PROJECTION_WEEKS / 52));
    expect(messageEcheance('trop_loin')).toContain(`${HORIZON_ANS} ans`);
  });

  /**
   * POURQUOI la borne haute existe — mesuré sur le moteur, pas décrété.
   *
   * Passé l'horizon, la simulation ne peut plus atteindre la cible dans ses 260
   * semaines : `reachableByDate` tombe, donc A15 conclut « la date ne tient pas » et
   * sert le rythme sûr **MAXIMAL**. Une échéance très lointaine ferait donc creuser au
   * maximum — exactement l'inverse de ce qu'on lui demande. Relevé du 2026-08-07 :
   * F 78 → 65 passe de −55 kcal/j (5 ans) à −418 kcal/j (267 sem).
   *
   * ⚠️ La bascule tombe quelques semaines APRÈS l'horizon et sa position dépend du
   * corps (267 sem sur F 78, 274 sem sur H 80) : on ne teste donc pas un seuil exact,
   * on vérifie que le retournement EXISTE au-delà de la borne — c'est lui qui la
   * justifie. Le jour où A15 changerait, ce test le dirait.
   */
  it('au-delà de l horizon, le moteur creuse au MAXIMUM — ce que la borne évite', () => {
    const p0 = recalcProfile(makeProfile({
      sex: 'female', age: 32, weight_kg: 78, height_cm: 168, body_fat_pct: 34,
      goal: 'cut', training_days_per_week: 4,
    }));
    const servi = (jours: number) => {
      const gt: GoalTarget = {
        target_weight_kg: 65, target_date: addDaysStamp(TODAY, jours),
        start_weight_kg: p0.weight_kg, start_date: TODAY,
      };
      const p = { ...p0, goal_target: gt };
      const plan = computePlan(p, TODAY);
      const s = datedGoalStatus(gt, p, TODAY, p0.tdee_kcal, plan?.floor_kcal ?? null, makeWeeklyProjector(p));
      return { kcal: plan!.profile.target_kcal, maxRate: !!s?.maxRateApplied };
    };

    const aLaBorne = servi(MAX_PROJECTION_WEEKS * 7);
    const loinDerriere = servi(Math.round(MAX_PROJECTION_WEEKS * 1.15) * 7);
    // À la borne : échéance lointaine → déficit doux, c'est ce que la personne demande.
    expect(aLaBorne.maxRate).toBe(false);
    // Au-delà : le moteur bascule au rythme sûr maximal, donc creuse BEAUCOUP plus.
    expect(loinDerriere.maxRate).toBe(true);
    expect(aLaBorne.kcal - loinDerriere.kcal).toBeGreaterThan(200);
    // Et cette date-là est justement celle que la saisie refuse.
    expect(checkEcheance(addDaysStamp(TODAY, Math.round(MAX_PROJECTION_WEEKS * 1.15) * 7), true, TODAY)).toBe('trop_loin');
  });

  /**
   * ⚠️ Rien ne refuse une date TRÈS proche, et c'est une décision : sous une semaine,
   * `datedGoalStatus` raisonne sur une semaine pleine (garde-fou de division), donc les
   * trois dates servent le MÊME plan et la même arrivée — honnêtement annoncée par la
   * phrase sous la rangée. Refuser reviendrait à interdire une question à laquelle
   * l'app sait répondre, sur le ton du reproche (CLAUDE.md §10).
   */
  it('une date très proche est acceptée, et le moteur y répond sans surprise', () => {
    const p0 = recalcProfile(makeProfile({
      weight_kg: 83, height_cm: 178, body_fat_pct: 18, goal: 'cut', training_days_per_week: 4,
    }));
    const kcal = [1, 3, 7].map((jours) => {
      const gt: GoalTarget = {
        target_weight_kg: 70, target_date: addDaysStamp(TODAY, jours),
        start_weight_kg: p0.weight_kg, start_date: TODAY,
      };
      expect(checkEcheance(gt.target_date, true, TODAY)).toBeNull();
      return computePlan({ ...p0, goal_target: gt }, TODAY)!.profile.target_kcal;
    });
    expect(new Set(kcal).size).toBe(1);
  });
});
