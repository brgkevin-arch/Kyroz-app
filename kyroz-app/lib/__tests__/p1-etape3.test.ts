import { describe, it, expect } from 'vitest';
import {
  calculateBMR, calculateTDEE, computePlan, recalcProfile, dismissEngineNotice,
  ENGINE_REV, ENGINE_REV_LEGACY, ENGINE_NOTICE_MIN_DELTA, NEAT_PAL, DEFAULT_NEAT_LEVEL,
} from '../tdee';
import { exerciseKcalPerDay, sessionKcal, SPORT_MET, RESTING_MET } from '../sport';
import { energyAvailability, fatFreeMassKg } from '../safety';
import { reconcileCloudNeat } from '../syncGuard';
import { makeProfile } from './helpers';
import { UserProfile } from '../types';

// ── Étape 3 du moteur ────────────────────────────────────────────────────────
// P1.2 (MET nets) + P1.1 (chemin TDEE unique + NEAT paramétrable) + la révision
// de moteur qui les rend explicables à l'utilisateur.
//
// Les tests de FORMULE vivent dans sport.test.ts / tdee.test.ts. Ici on verrouille
// ce qui n'apparaît qu'à la COMPOSITION : interaction avec le plancher de sécurité,
// direction des erreurs, et cycle de vie de l'avertissement one-shot.

const TODAY = '2026-07-28';

describe('P1.2 — MET nets et énergie disponible', () => {
  it('la dépense sportive créditée est bien la dépense NETTE (définition RED-S de l\'EEE)', () => {
    // `EA = (apports − EEE) / masse maigre` se mesure sur la dépense d'exercice NETTE.
    // Le MET brut gonflait l'EEE, donc le plancher, donc une marge de sécurité fictive.
    const sports = [{ type: 'musculation' as const, sessions_per_week: 4, minutes_per_session: 60 }];
    const net = exerciseKcalPerDay(sports, 82);
    const brut = Math.round(((SPORT_MET.musculation * 3.5 * 82) / 200) * 60 * 4 / 7);
    expect(net).toBeLessThan(brut);
    // L'écart est exactement le repos déjà compté dans `BMR × NEAT`.
    const repos = Math.round(((RESTING_MET * 3.5 * 82) / 200) * 60 * 4 / 7);
    expect(brut - net).toBeCloseTo(repos, 0);
  });

  it('le plancher de sécurité baisse du MÊME montant : la marge d\'EA ne se dégrade pas', () => {
    // Le plancher vaut `30 × masse maigre + sport crédité` : il suit le MET net.
    // Ce qui compte n'est pas sa valeur absolue mais l'EA RÉELLE au plancher, qui
    // doit toujours atteindre les 30 kcal/kg de masse maigre du seuil IOC.
    const p = makeProfile({
      sex: 'female', age: 29, weight_kg: 58, height_cm: 165, body_fat_pct: 24,
      sports: [{ type: 'hiit_crossfit', sessions_per_week: 5, minutes_per_session: 60 }],
      goal: 'cut_aggressive',
    });
    const { floor_kcal } = computePlan(p, TODAY);
    const ea = energyAvailability(p, floor_kcal, exerciseKcalPerDay(p.sports, p.weight_kg));
    // Tolérance = l'arrondi au kcal entier du plancher, rien d'autre : `0,5 / masse
    // maigre`. Écrire « ≥ 30 » tout court ferait échouer le test sur un demi-kcal.
    const arrondi = 0.5 / fatFreeMassKg(p);
    expect(ea).toBeGreaterThanOrEqual(30 - arrondi);
    // Et pas ARBITRAIREMENT au-dessus : le plancher VISE 30. Avant le MET net il
    // affichait 30,7–30,8 — une marge qui n'existait pas dans le corps de la personne.
    expect(ea).toBeLessThan(30.1);
  });

  it('aucun sport de la table ne peut produire une dépense négative', () => {
    for (const [type, met] of Object.entries(SPORT_MET)) {
      expect(met, type).toBeGreaterThan(RESTING_MET);
      expect(sessionKcal(type as any, 50, 15), type).toBeGreaterThan(0);
    }
  });
});

describe('P1.1 — le NEAT par défaut ne peut pas effacer un déficit', () => {
  // Le vrai danger de P1.1 n'était pas la formule mais le DÉFAUT. Un NEAT trop haut
  // fait manger à la maintenance en croyant sécher : échec silencieux, invisible
  // autrement qu'en ne perdant rien pendant des semaines.
  const sedentaires: { nom: string; p: Partial<UserProfile> }[] = [
    { nom: 'H 30, 85 kg, 178', p: { sex: 'male', age: 30, weight_kg: 85, height_cm: 178 } },
    { nom: 'F 35, 62 kg, 165', p: { sex: 'female', age: 35, weight_kg: 62, height_cm: 165 } },
    { nom: 'F 45, 95 kg, 45 %MG', p: { sex: 'female', age: 45, weight_kg: 95, height_cm: 160, body_fat_pct: 45 } },
  ];

  it('un sédentaire en sèche reçoit un déficit RÉEL, pas un maintien déguisé', () => {
    for (const { nom, p } of sedentaires) {
      const plan = computePlan(makeProfile({ ...p, goal: 'cut', sports: [], training_days_per_week: 0 }), TODAY);
      const deficit = plan.profile.tdee_kcal - plan.profile.target_kcal;
      expect(deficit, `${nom} — déficit servi`).toBeGreaterThan(100);
    }
  });

  it('le défaut est le niveau le PLUS BAS de la table : il ne peut pas inventer de dépense', () => {
    expect(NEAT_PAL[DEFAULT_NEAT_LEVEL]).toBe(Math.min(...Object.values(NEAT_PAL)));
    // Et la table s'arrête sous les niveaux « exercice inclus » (1,50 / 1,65), qui
    // recouvriraient une dépense sportive déjà chiffrée par les MET.
    expect(Math.max(...Object.values(NEAT_PAL))).toBeLessThan(1.5);
  });

  it('déclarer un NEAT plus élevé remonte le budget, jamais l\'inverse', () => {
    const base = makeProfile({ goal: 'cut', sports: [], training_days_per_week: 0 });
    const niveaux = (['desk', 'light', 'active', 'physical'] as const)
      .map((neat_level) => computePlan({ ...base, neat_level }, TODAY).profile.target_kcal);
    for (let i = 1; i < niveaux.length; i++) expect(niveaux[i]).toBeGreaterThan(niveaux[i - 1]);
  });

  it('P1.1 — un profil legacy (séances déclarées, aucun sport détaillé) n\'est plus servi par une autre formule', () => {
    // C'était l'unique cas qui empruntait le multiplicateur. Il tombe désormais sur
    // le chemin commun : le TDEE ne dépend plus que du NEAT, puisqu'aucune dépense
    // sportive n'est chiffrable. C'est ce qui déclenche l'avertissement one-shot,
    // dont le message invite précisément à renseigner ses sports.
    const legacy = makeProfile({ sports: undefined, training_days_per_week: 5 });
    const bmr = calculateBMR({ sex: 'male', weight_kg: 90, height_cm: 180, age: 30 });
    expect(calculateTDEE(legacy)).toBe(Math.round(bmr * NEAT_PAL.desk));
  });
});

describe('Révision du moteur — avertissement one-shot', () => {
  const ancien = () => makeProfile({
    engine_rev: ENGINE_REV_LEGACY,
    tdee_kcal: 2914, target_kcal: 2614,   // cibles produites par le moteur d'avant
  });

  it('dépose l\'avertissement au premier recalcul, avec les DEUX chiffres réels', () => {
    const p = recalcProfile(ancien(), TODAY);
    expect(p.engine_rev).toBe(ENGINE_REV);
    expect(p.engine_notice).toBeDefined();
    expect(p.engine_notice!.from).toBe(2614);          // ce que la personne avait sous les yeux
    expect(p.engine_notice!.to).toBe(p.target_kcal);   // ce qu'elle voit maintenant
    expect(Math.abs(p.engine_notice!.to - p.engine_notice!.from)).toBeGreaterThanOrEqual(ENGINE_NOTICE_MIN_DELTA);
  });

  it('SURVIT aux recalculs suivants : sinon il s\'efface avant d\'avoir été lu', () => {
    // Le profil est recalculé à CHAQUE ouverture d'app. Dès le 2ᵉ passage l'ancienne
    // cible n'existe plus (elle a été remplacée) : recalculer l'écart donnerait 0 et
    // ferait disparaître le message. On garde donc l'avertissement déposé tel quel.
    let p = recalcProfile(ancien(), TODAY);
    const depose = p.engine_notice;
    for (let i = 0; i < 5; i++) p = recalcProfile(p, TODAY);
    expect(p.engine_notice).toEqual(depose);
  });

  it('une fois lu, il ne revient pas — et la CLÉ est retirée, pas mise à undefined', () => {
    const lu = dismissEngineNotice(recalcProfile(ancien(), TODAY));
    expect('engine_notice' in lu).toBe(false); // sinon JSON.stringify l'élide et
    // `useProfile` ne verrait aucun changement à persister → retour au démarrage suivant.
    const apres = recalcProfile(lu, TODAY);
    expect(apres.engine_notice).toBeUndefined();
  });

  it('reste muet sous le seuil, et sur un profil neuf qui n\'a jamais vu d\'ancienne cible', () => {
    // Écart nul : même moteur, cibles déjà à jour.
    const ajour = recalcProfile(makeProfile({ engine_rev: ENGINE_REV }), TODAY);
    expect(ajour.engine_notice).toBeUndefined();
    // Onboarding : les cibles n'existent pas encore, il n'y a rien à expliquer.
    const neuf = recalcProfile(makeProfile({ tdee_kcal: 0, target_kcal: 0 }), TODAY);
    expect(neuf.engine_notice).toBeUndefined();
    expect(neuf.engine_rev).toBe(ENGINE_REV);
    // Écart réel mais négligeable (< 100 kcal) : on n'alarme pas pour du bruit.
    const petit = recalcProfile(ancien(), TODAY);
    const cible = petit.target_kcal;
    const proche = recalcProfile(
      makeProfile({ engine_rev: ENGINE_REV_LEGACY, target_kcal: cible + ENGINE_NOTICE_MIN_DELTA - 1 }),
      TODAY,
    );
    expect(proche.engine_notice).toBeUndefined();
  });
});

describe('Synchro — le NEAT ne doit pas se perdre en route', () => {
  it('une ligne cloud sans neat_level (antérieure à la migration) n\'écrase pas le choix local', () => {
    // Perdre le niveau, c'est retomber sur 1,20 : jusqu'à −450 kcal/j de TDEE pour
    // un métier physique. « Colonne absente » veut dire « pas d'info », pas « bureau ».
    const cloud = { id: 'u', weight_kg: 80 } as Partial<UserProfile>;
    expect(reconcileCloudNeat(cloud, { neat_level: 'physical' }).neat_level).toBe('physical');
    // Le cloud renseigné fait foi (il peut venir d'un autre appareil, plus à jour).
    expect(reconcileCloudNeat({ ...cloud, neat_level: 'desk' }, { neat_level: 'physical' }).neat_level).toBe('desk');
    // Rien des deux côtés : on ne fabrique pas de valeur.
    expect(reconcileCloudNeat(cloud, null).neat_level).toBeUndefined();
  });
});

describe('Composition — le déplacement du TDEE ne casse aucun garde-fou', () => {
  it('la cible reste toujours au-dessus du plancher, sur un balayage de profils', () => {
    for (const sex of ['male', 'female'] as const) {
      for (const weight_kg of [50, 65, 80, 95, 120]) {
        for (const neat_level of ['desk', 'physical'] as const) {
          for (const goal of ['cut_aggressive', 'cut', 'maintain', 'bulk'] as const) {
            const p = makeProfile({ sex, weight_kg, height_cm: 170, neat_level, goal });
            const { profile, floor_kcal } = computePlan(p, TODAY);
            expect(profile.target_kcal, `${sex}/${weight_kg}/${neat_level}/${goal}`)
              .toBeGreaterThanOrEqual(floor_kcal);
          }
        }
      }
    }
  });

  it('le plancher n\'impose jamais un surplus : il reste plafonné à la maintenance', () => {
    // Le NEAT plus bas rapproche le TDEE du plancher — c'est exactement la situation
    // où un plancher non plafonné se mettrait à prescrire de manger PLUS que sa
    // maintenance à quelqu'un qui a demandé une sèche.
    const p = makeProfile({
      sex: 'female', age: 45, weight_kg: 95, height_cm: 160, body_fat_pct: 45,
      goal: 'cut', sports: [], training_days_per_week: 0,
    });
    const { profile, floor_kcal } = computePlan(p, TODAY);
    expect(floor_kcal).toBeLessThanOrEqual(profile.tdee_kcal);
    expect(profile.target_kcal).toBeLessThanOrEqual(profile.tdee_kcal);
  });

  it('la PROTECTION ne dépend pas du NEAT : se tromper de niveau ne baisse pas le plancher', () => {
    // C'est ce qui rend le défaut « bureau » acceptable. Sa composante PHYSIOLOGIQUE
    // (30 kcal/kg de masse maigre + sport crédité) ne dépend pas du NEAT : quelqu'un
    // dont le niveau est sous-estimé mange moins que sa vraie maintenance, mais reste
    // au-dessus de son minimum physiologique. Le reste du plancher (plafond de déficit
    // à 25 % du TDEE) suit le TDEE — donc un NEAT plus bas ne peut que le BAISSER,
    // jamais l'inverse : l'erreur est bornée par le seuil IOC, pas par le confort.
    const base = makeProfile({
      sex: 'female', age: 29, weight_kg: 58, height_cm: 165, body_fat_pct: 24,
      sports: [{ type: 'hiit_crossfit', sessions_per_week: 5, minutes_per_session: 60 }],
      goal: 'cut_aggressive',
    });
    const eeAtFloor = (p: UserProfile) => {
      const { floor_kcal } = computePlan(p, TODAY);
      return { floor_kcal, ea: energyAvailability(p, floor_kcal, exerciseKcalPerDay(p.sports, p.weight_kg)) };
    };
    const desk = eeAtFloor({ ...base, neat_level: 'desk' });
    const physical = eeAtFloor({ ...base, neat_level: 'physical' });
    expect(desk.floor_kcal).toBeLessThanOrEqual(physical.floor_kcal);
    // Le point qui compte : le niveau le plus bas protège toujours au seuil IOC.
    expect(desk.ea).toBeGreaterThanOrEqual(30 - 0.5 / fatFreeMassKg(base));
    expect(computePlan({ ...base, neat_level: 'physical' }, TODAY).profile.tdee_kcal)
      .toBeGreaterThan(computePlan({ ...base, neat_level: 'desk' }, TODAY).profile.tdee_kcal);
  });
});
