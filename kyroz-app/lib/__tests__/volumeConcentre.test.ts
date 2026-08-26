import { describe, it, expect } from 'vitest';
import { dailyBudgets } from '../dailyBudget';
import { bankedTargets, dayExpenditures, buildLocalPlan, restDaysForProfile, deducedRestWeekdays } from '../planEngine';
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

describe('« jours de repos » — la case vide ne doit pas vouloir dire « je m’entraîne 7 j/7 »', () => {
  // 🔴 Mesuré le 2026-08-06 : l'onboarding démarrait à zéro jour coché et enregistrait
  // ce vide TEL QUEL. « Je n'ai pas répondu » devenait donc « aucun jour de repos », le
  // moteur comptait 7 jours d'entraînement, la dépense se relissait sur la semaine — et
  // le plan repartait PLAT. Autrement dit, la répartition par volume était inerte pour
  // tout nouvel inscrit qui n'avait pas rempli une question facultative. Le Profil, lui,
  // pré-cochait déjà la déduction : deux écrans, deux sens pour le même réglage.

  it('accepter la pré-sélection donne EXACTEMENT le même PLAN que la déduction seule', () => {
    // L'invariant qui rend la pré-sélection honnête : elle ne décide de rien de neuf,
    // elle rend visible ce qui se décidait en silence. Si les deux divergeaient, un
    // utilisateur qui valide sans rien toucher changerait son plan sans le savoir.
    //
    // ⚠️ IL SE VÉRIFIE SUR LES DÉPENSES, PAS SUR L'ENSEMBLE DES JOURS DE REPOS — et ce
    // n'est pas un assouplissement, c'est la promesse elle-même : ce qu'on doit à
    // l'utilisateur, c'est que son plan ne bouge pas. L'ensemble n'en était qu'un
    // intermédiaire, et il diverge légitimement dans UN cas (ci-dessous).
    const SEMAINE = [1, 2, 3, 4, 5, 6, 0];
    for (const seances of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const preCoche = deducedRestWeekdays(SEMAINE, seances);
      const p = profil(MUSCU_4x60, {
        training_days_per_week: seances, plan_weekdays: SEMAINE, rest_weekdays: preCoche,
      });
      const auto = profil(MUSCU_4x60, {
        training_days_per_week: seances, plan_weekdays: SEMAINE, rest_weekdays: undefined,
      });
      expect(dayExpenditures(p, 7).map(Math.round), `${seances} séances`)
        .toEqual(dayExpenditures(auto, 7).map(Math.round));
      // À partir d'UNE séance, les deux chemins désignent aussi les mêmes jours.
      if (seances >= 1) {
        expect([...restDaysForProfile(p, 7)].sort(), `${seances} séances`)
          .toEqual([...restDaysForProfile(auto, 7)].sort());
      }
    }
  });

  it('🔴 zéro séance déclarée ne pré-coche AUCUN jour — et le plan reste le même', () => {
    // Signalé par le fondateur le 2026-08-26, capture à l'appui : les sept jours
    // arrivaient cochés à l'inscription. `restDaySet(n, 0)` rend tous les jours —
    // arithmétiquement juste, absurde à l'écran : l'app affirmait « je ne m'entraîne
    // jamais » à la place de quelqu'un qui n'avait encore rien dit.
    const SEMAINE = [1, 2, 3, 4, 5, 6, 0];
    expect(deducedRestWeekdays(SEMAINE, 0)).toEqual([]);
    expect(deducedRestWeekdays(SEMAINE, 1)).not.toEqual([]);   // la sonde sait dire OUI

    // ⚠️ ET CE N'ÉTAIT PAS QU'UN AFFICHAGE : ces sept jours étaient ENREGISTRÉS. Qui
    // déclare du sport plus tard sans repasser par l'écran garde `7 − 7 = 0` jour
    // d'entraînement — `dayExpenditures` retombe sur le lissage et son cyclage ne
    // s'allume jamais. C'est le défaut « paramètre dormant » : posé quand il ne
    // voulait rien dire, il mord des semaines après.
    const plat = (d: number[]) => new Set(d.map(Math.round)).size === 1;
    // Le même profil — 4 séances déclarées — avec les sept jours hérités d'une saisie
    // faite AVANT que le sport ne soit déclaré…
    const dormant = profil(MUSCU_4x60, { training_days_per_week: 4, plan_weekdays: SEMAINE, rest_weekdays: SEMAINE });
    expect(plat(dayExpenditures(dormant, 7)), 'le réglage dormant écrase le cyclage').toBe(true);
    // …et le même, avec des jours de repos qui veulent dire quelque chose.
    const vivant = profil(MUSCU_4x60, {
      training_days_per_week: 4, plan_weekdays: SEMAINE, rest_weekdays: deducedRestWeekdays(SEMAINE, 4),
    });
    expect(plat(dayExpenditures(vivant, 7)), 'le cyclage devrait s’allumer').toBe(false);
  });

  it('« Aucun » reste une réponse possible — et elle rend le plan plat, à raison', () => {
    // On ne force personne à déclarer un jour de repos : quelqu'un qui s'entraîne tous
    // les jours a le droit de le dire, et son plan DOIT alors être plat. Ce cas verrouille
    // que « aucun » continue de vouloir dire « aucun » — c'est le prix à payer pour que
    // le vide cesse d'être un accident.
    const p = profil(MUSCU_4x60, { rest_weekdays: [], plan_weekdays: [1, 2, 3, 4, 5, 6, 0] });
    expect(restDaysForProfile(p, 7).size).toBe(0);
    expect(new Set(bankedTargets(p, 7).targets).size).toBe(1);
  });

  it('la déduction ne rend que des jours DU PLAN, jamais un jour hors plan', () => {
    // Un jour de repos posé hors du plan ne serait jamais servi (cf. offsetsForPlan) :
    // le pré-cocher afficherait un choix sans effet.
    const plan = [1, 3, 5];                     // lun / mer / ven
    for (const seances of [0, 1, 2, 3, 7]) {
      for (const j of deducedRestWeekdays(plan, seances)) {
        expect(plan, `${seances} séances → ${j}`).toContain(j);
      }
    }
  });
});
