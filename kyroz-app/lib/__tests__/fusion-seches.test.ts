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
  it('les deux objectifs ne servent PLUS les mêmes calories (relèvement NEAT)', () => {
    // ⚠️ CE TEST A CHANGÉ DE SENS LE 2026-07-31, et il l'avait lui-même prévu :
    // « si un jour ce test rougit, c'est que le plancher a changé — et alors la
    // question de rouvrir un objectif "rapide" se repose légitimement. »
    // C'est arrivé. Le relèvement de `desk` à 1,30 décolle la cible du plancher,
    // donc les deltas de GOAL_CONFIG (−300 vs −500) reprennent la parole.
    //
    // Écart mesuré aujourd'hui : 51 à 92 kcal/j selon le gabarit. Le plancher
    // absorbe encore l'essentiel des 200 kcal d'écart nominal, mais plus tout.
    //
    // LA FUSION N'EST PAS REMISE EN CAUSE POUR AUTANT — elle ne tient plus au même
    // argument, et c'est ce qu'il faut retenir : `normalizeGoal` (syncGuard) referme
    // `cut_aggressive` sur `cut` À LA LECTURE, donc AUCUN compte vivant ne peut
    // recevoir ce plan ; l'UI ne le propose plus ; et la vitesse se pilote par
    // l'objectif DATÉ, seul mécanisme qui sache dire si le rythme est tenable.
    // Rouvrir un « rapide » est une décision produit, consignée dans AGENTS.md.
    const cas = [
      // %MG MESURÉ sur les quatre : l'écart mesuré au relèvement NEAT (134 kcal de
      // médiane) l'a été sur la branche Katch. En provenance ESTIMÉE, l'écart tombe
      // à 0 sur le H 75 kg — les deux objectifs y butent sur le même plancher. Ça ne
      // change rien de vivant (`cut_aggressive` est refermé à la lecture) mais c'est
      // le fait, et il ne doit pas se cacher derrière une provenance non déclarée.
      { sex: 'male' as const, weight_kg: 85, height_cm: 178, age: 30, body_fat_pct: 20, body_fat_source: 'measured' as const },
      { sex: 'male' as const, weight_kg: 75, height_cm: 175, age: 25, body_fat_pct: 12, body_fat_source: 'measured' as const },
      { sex: 'female' as const, weight_kg: 62, height_cm: 165, age: 35, body_fat_pct: 30, body_fat_source: 'measured' as const },
      { sex: 'female' as const, weight_kg: 95, height_cm: 160, age: 45, body_fat_pct: 40, body_fat_source: 'measured' as const },
    ];
    for (const c of cas) {
      const lent = computePlan(makeProfile({ ...c, goal: 'cut', sports: [] }), T);
      const rapide = computePlan(makeProfile({ ...c, goal: 'cut_aggressive', sports: [] }), T);
      const ecart = lent.profile.target_kcal - rapide.profile.target_kcal;
      // Un écart RÉEL, mais très inférieur aux 200 kcal nominaux : le plancher
      // continue d'en absorber la plus grande part.
      expect(ecart, `${c.sex} ${c.weight_kg}kg`).toBeGreaterThan(0);
      expect(ecart, `${c.sex} ${c.weight_kg}kg`).toBeLessThan(200);
      // « Sèche » n'est plus retenue par le plancher — c'est tout l'objet du
      // relèvement — tandis que « rapide » l'est encore, ce qui borne les dégâts
      // d'un objectif legacy qu'aucun compte vivant ne peut plus atteindre.
      expect(lent.flags, `${c.sex} ${c.weight_kg}kg`).not.toContain('FLOOR_APPLIED');
      expect(rapide.flags, `${c.sex} ${c.weight_kg}kg`).toContain('FLOOR_APPLIED');
      // Le garde-fou qui compte VRAIMENT : `cut_aggressive` est inatteignable.
      expect(normalizeGoal({ goal: 'cut_aggressive' as const })!.goal).toBe('cut');
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
  it('referme les DEUX objectifs retirés, et ne touche à rien d\'autre', () => {
    expect(normalizeGoal({ goal: 'cut_aggressive' })!.goal).toBe('cut');
    // `bulk` → `lean_bulk` (2026-08-10) : même geste que la fusion des sèches, porté
    // aux prises de masse. Il ne différait que par +200 kcal — donc par la VITESSE,
    // qui est le métier de l'objectif daté — et ses protéines BAISSAIENT (2,0 → 1,8).
    expect(normalizeGoal({ goal: 'bulk' })!.goal).toBe('lean_bulk');
    for (const g of ['cut', 'recomp', 'maintain', 'lean_bulk'] as Goal[]) {
      expect(normalizeGoal({ goal: g })!.goal).toBe(g);
    }
  });

  it('la normalisation est un POINT FIXE — aucun objectif retiré n\'en ressort', () => {
    // Un objectif retiré qui pointerait vers un autre objectif retiré ferait boucler
    // la table (ou, pire, laisserait passer une valeur morte après un seul tour).
    // Rien ne l'interdit dans le type : c'est ce test qui l'interdit.
    for (const g of ['cut_aggressive', 'bulk', 'cut', 'recomp', 'maintain', 'lean_bulk'] as Goal[]) {
      const une = normalizeGoal({ goal: g })!.goal!;
      expect(normalizeGoal({ goal: une })!.goal, `${g} → ${une}`).toBe(une);
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
    // ⚠️ GABARIT CHANGÉ le 2026-07-31 : le H 70 kg d'origine reçoit désormais 222 g
    // de glucides (contre 189 avant le relèvement NEAT), donc au-dessus du seuil de
    // 210 — il ne pouvait plus exercer le drapeau, et le test serait devenu vert
    // pour une mauvaise raison. Gabarit trouvé par balayage, pas au jugé.
    // Au passage : la fréquence du drapeau en sèche baisse de 27,4 % à 21,1 %.
    const p = makeProfile({
      // %MG mesuré : le gabarit a été trouvé PAR BALAYAGE sous Katch, et sa raison
      // d'être est d'exercer le drapeau. En Mifflin il sert 189 g pour un seuil à 180
      // → le drapeau ne se lève plus et le test passerait au vert sans rien vérifier,
      // exactement le piège que son commentaire du 2026-07-31 documente déjà.
      sex: 'male', weight_kg: 60, height_cm: 160, age: 30, goal: 'cut', body_fat_pct: 30, body_fat_source: 'measured',
      sports: [{ type: 'marche_rapide', sessions_per_week: 3, minutes_per_session: 45 }],
    });
    const { profile, flags } = computePlan(p, T);
    expect(profile.target_carbs_g).toBeLessThan(3 * 60);
    expect(flags).toContain('CARBS_BELOW_TRAINING_FLOOR');
  });

  it('un appel EXPLICITE garde le dernier mot sur le défaut dérivé', () => {
    // Le défaut est dérivé, il n'est pas imposé : `opts.isTrainingDay` reste le
    // point d'entrée pour un appelant qui SAIT de quel jour il parle — c'est ce
    // dont le moteur de plan aura besoin le jour où il distinguera les jours de
    // repos (cf. restDaysForProfile). On vérifie les deux sens de la surcharge.
    // `recalcProfile` et non la valeur du fixture : `makeProfile` porte un
    // `tdee_kcal` figé de 2914, qui n'a rien à voir avec ce gabarit.
    // ⚠️ Gabarit changé le 2026-07-31 (60 kg / 30 %MG au lieu de 70 kg) : après le
    // relèvement NEAT, le H 70 kg reçoit 222 g de glucides pour un seuil à 210, donc
    // la PRÉCONDITION du test (« la condition de grammes est remplie ») n'était plus
    // vraie. Le test serait passé au vert sans rien vérifier du tout.
    const CORPS = { sex: 'male' as const, weight_kg: 60, height_cm: 160, age: 30, body_fat_pct: 30, body_fat_source: 'measured' as const };
    const SEUIL = 3 * CORPS.weight_kg;
    const body = recalcProfile(makeProfile({ ...CORPS, sports: [] }), T);

    // Sans séance déclarée, mais l'appelant affirme que c'est un jour de séance :
    const force = calculateMacros(body.tdee_kcal, 'cut', body, { isTrainingDay: true });
    expect(force.carbs_g).toBeLessThan(SEUIL);
    expect(force.flags).toContain('CARBS_BELOW_TRAINING_FLOOR');

    // Avec des séances déclarées, mais l'appelant affirme que c'est un jour off :
    const avecSport = recalcProfile(makeProfile({
      ...CORPS,
      sports: [{ type: 'marche_rapide', sessions_per_week: 3, minutes_per_session: 45 }],
    }), T);
    const off = calculateMacros(avecSport.tdee_kcal, 'cut', avecSport, { isTrainingDay: false });
    expect(off.carbs_g).toBeLessThan(SEUIL);
    expect(off.flags).not.toContain('CARBS_BELOW_TRAINING_FLOOR');
  });
});
