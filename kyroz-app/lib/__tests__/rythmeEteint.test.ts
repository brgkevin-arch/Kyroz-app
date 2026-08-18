import { describe, it, expect } from 'vitest';
import { buildLocalPlan, profileSignature, dayTargetKcal } from '../planEngine';
import { RYTHME_HEBDOMADAIRE_ACTIF } from '../featureFlags';
import { makeProfile } from './helpers';

// ── Ce que l'app fait VRAIMENT depuis que « Jours plus copieux » est éteint ──
//
// Ce fichier est le pendant obligatoire du `vi.mock` de `planEngine.test.ts`, qui
// force l'interrupteur à `true` pour défendre le contrat du moteur. Sans ce
// second regard, la suite décrirait une app que personne ne reçoit.
//
// Il ne teste PAS le calcul de la banque (c'est `calorieBank.test.ts`, 23 cas,
// intacts) : il teste que le moteur cesse de la LIRE.

const p = makeProfile({ plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0] });
const kcalParJour = (prof: typeof p) =>
  buildLocalPlan(prof, 0).total_macros_per_day.map((m) => Math.round(m.kcal));

describe('« Jours plus copieux » éteint — le moteur cesse de lire la banque', () => {
  it('l’interrupteur est bien à false (sinon tout ce fichier ment)', () => {
    expect(RYTHME_HEBDOMADAIRE_ACTIF).toBe(false);
  });

  it('un compte portant déjà « mercredi +500 » reçoit la MÊME semaine que sans banque', () => {
    // C'est le cas qui justifie de couper la LECTURE et pas seulement l'écran :
    // sinon cette personne garderait une semaine déformée par un réglage que plus
    // aucun écran ne montre et qu'elle ne peut plus annuler.
    const sans = kcalParJour(p);
    const avec = kcalParJour({ ...p, calorie_bank: { '3': 500 } });
    expect(avec).toEqual(sans);
  });

  it('`dayTargetKcal` ignore la banque lui aussi — c’est la cible que les écrans lisent', () => {
    const sans = dayTargetKcal(p, 7, 3);
    const avec = dayTargetKcal({ ...p, calorie_bank: { '3': 500 } }, 7, 3);
    expect(avec).toBe(sans);
  });

  it('🔴 LE PLAN EN CACHE S’INVALIDE : la signature ne dépend plus de la banque', () => {
    // Sans ce point, un compte gardait sur son téléphone un plan bâti AVEC la
    // banque, et l'extinction ne se voyait qu'à la prochaine régénération.
    // La signature devient identique avec et sans → le plan stocké ne correspond
    // plus à celle du profil courant, donc il est refait.
    expect(profileSignature({ ...p, calorie_bank: { '3': 500 } }))
      .toBe(profileSignature(p));
  });
});
