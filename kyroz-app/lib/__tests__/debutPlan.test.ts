import { describe, it, expect } from 'vitest';
import { buildLocalPlan } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { BUILTIN_SLOTS } from '../mealSlots';
import { repasACompter, mentionDepart } from '../coursesDepuis';
import { datesDuPlan, semaineEcoulee } from '../semainePlan';
import { heuresLimites, repasEchus, bornePremierJour } from '../repasAuto';
import {
  optionsDeDebut, semaineDuDebut, repasDepuisLeDebut, avantLeJourDuDebut, creneauxRestants,
} from '../debutPlan';
import { makeProfile } from './helpers';

// 2026-10-19 est un lundi : le mercredi est le 21.
const MER_21H45 = new Date(2026, 9, 21, 21, 45);
const LUN_DU_MER = '2026-10-21';
const SEMAINE = [1, 2, 3, 4, 5];

const poids = (l: ReturnType<typeof buildShoppingList>) =>
  l.items.filter((i) => i.unit === 'g' || i.unit === 'ml').reduce((s, i) => s + i.quantity, 0);

describe('E78 — les choix proposés à la fin de l’inscription', () => {
  it('mercredi 21 h 45 : « Ce soir » (il reste le dîner), puis « Demain », puis les jours du plan', () => {
    const o = optionsDeDebut(MER_21H45, BUILTIN_SLOTS, SEMAINE);
    expect(o.map((x) => x.libelle)).toEqual(['Ce soir', 'Demain', 'Vendredi 23', 'Lundi 26', 'Mardi 27', 'Mercredi 28']);
    expect(o[0].detail).toBe('Encore au menu : dîner');
    expect(o[0].debut).toEqual({ jour: LUN_DU_MER, minutes: 21 * 60 + 45 });
    expect(o[1].debut).toEqual({ jour: '2026-10-22', minutes: 0 });
    expect(o[1].detail).toBe('jeudi 22 octobre');
  });

  it('le matin, c’est « Aujourd’hui », et toute la journée est encore au menu', () => {
    const o = optionsDeDebut(new Date(2026, 9, 21, 8, 30), BUILTIN_SLOTS, SEMAINE);
    expect(o[0].libelle).toBe('Aujourd’hui');
    expect(o[0].detail).toBe('Encore au menu : petit-déj, déjeuner, collation et dîner');
  });

  it('plus aucun repas à venir : pas de « Ce soir », on commence au plus tôt demain', () => {
    const o = optionsDeDebut(new Date(2026, 9, 21, 23, 59), BUILTIN_SLOTS, SEMAINE);
    expect(o[0].libelle).toBe('Demain');
  });

  it('un samedi, sur un plan du lundi au vendredi : ni aujourd’hui ni « Demain », lundi d’abord', () => {
    const o = optionsDeDebut(new Date(2026, 9, 24, 10, 0), BUILTIN_SLOTS, SEMAINE);
    expect(o[0].libelle).toBe('Lundi 26');
  });

  it('sans jours choisis (comptes d’avant), aucune question', () => {
    expect(optionsDeDebut(MER_21H45, BUILTIN_SLOTS, [])).toEqual([]);
    expect(optionsDeDebut(MER_21H45, BUILTIN_SLOTS, undefined)).toEqual([]);
  });

  it('un créneau est « encore à venir » tant que son heure limite n’est pas passée', () => {
    // 21 h 45 : la collation (limite 21 h) est passée, le dîner (limite 23 h 59) non.
    expect(creneauxRestants(BUILTIN_SLOTS, 21 * 60 + 45).map((s) => s.id)).toEqual(['dinner']);
  });
});

describe('E78 — la première liste ne compte que ce qui sera mangé', () => {
  const profile = makeProfile({ plan_weekdays: SEMAINE });
  const genere = { ...buildLocalPlan(profile, 0), week_start_date: LUN_DU_MER };

  it('« Ce soir » à 21 h 45 un mercredi : du mercredi, seul le dîner est acheté et affiché', () => {
    const debut = { jour: LUN_DU_MER, minutes: 21 * 60 + 45 };
    const servis = repasDepuisLeDebut(genere, SEMAINE, debut, BUILTIN_SLOTS);
    const mercredi = 3;
    expect(servis.filter((m) => m.day === mercredi).map((m) => m.meal_type)).toEqual(['dinner']);
    // Jeudi et vendredi entiers ; lundi et mardi étaient déjà hors de la liste (règle du 2026-09-17).
    const perimetre = repasACompter({ ...genere, meals: servis }, SEMAINE, null, MER_21H45);
    const apres = buildShoppingList({ ...genere, meals: perimetre.meals }, [], perimetre.jours);
    const avantRaw = repasACompter(genere, SEMAINE, null, MER_21H45);
    const avant = buildShoppingList({ ...genere, meals: avantRaw.meals }, [], avantRaw.jours);
    // Le défaut mesuré le 2026-10-19 : +36 % un mercredi soir. Il doit disparaître.
    expect(poids(apres)).toBeLessThan(poids(avant) * 0.85);
  });

  it('« Demain » : le plan part du jeudi — liste, dates et renouvellement suivent', () => {
    const debut = { jour: '2026-10-22', minutes: 0 };
    const plan = { ...genere, week_start_date: semaineDuDebut(LUN_DU_MER, debut) };
    expect(plan.week_start_date).toBe('2026-10-22');
    const perimetre = repasACompter(plan, SEMAINE, null, MER_21H45);
    expect(perimetre.jours).toEqual([4, 5]);
    expect(datesDuPlan(plan, SEMAINE)?.slice(3)).toEqual(['2026-10-22', '2026-10-23']);
    // Un plan qui n'a pas commencé ne se renouvelle pas, et finit après le vendredi.
    expect(semaineEcoulee(plan, LUN_DU_MER, SEMAINE)).toBe(false);
    expect(semaineEcoulee(plan, '2026-10-24', SEMAINE)).toBe(true);
    // Et l'écran n'affiche rien avant jeudi.
    expect(repasDepuisLeDebut(plan, SEMAINE, debut, BUILTIN_SLOTS).every((m) => m.day >= 4)).toBe(true);
    expect(mentionDepart(plan, SEMAINE, debut)).toBe('À partir de jeudi, le jour où tu commences.');
  });

  it('« Lundi 26 » choisi un mercredi : toute la semaine qui vient, rien de cette semaine', () => {
    const debut = { jour: '2026-10-26', minutes: 0 };
    const plan = { ...genere, week_start_date: semaineDuDebut(LUN_DU_MER, debut) };
    expect(datesDuPlan(plan, SEMAINE)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
    expect(repasACompter(plan, SEMAINE, null, MER_21H45).jours).toEqual([1, 2, 3, 4, 5]);
    expect(mentionDepart(plan, SEMAINE, debut)).toBe('');
  });

  it('un début passé ou du jour ne déplace pas la semaine', () => {
    expect(semaineDuDebut(LUN_DU_MER, { jour: LUN_DU_MER, minutes: 900 })).toBe(LUN_DU_MER);
    expect(semaineDuDebut(LUN_DU_MER, { jour: '2026-10-01', minutes: 0 })).toBe(LUN_DU_MER);
    expect(semaineDuDebut(LUN_DU_MER, null)).toBe(LUN_DU_MER);
  });

  it('sans début enregistré (comptes existants), rien ne change', () => {
    expect(repasDepuisLeDebut(genere, SEMAINE, null, BUILTIN_SLOTS)).toBe(genere.meals);
  });
});

describe('E78 — l’auto-coche ne touche à rien avant le début', () => {
  it('avant le jour du début : rien ; le jour même, la borne du début s’applique', () => {
    const debut = { jour: '2026-10-22', minutes: 0 };
    expect(avantLeJourDuDebut(LUN_DU_MER, debut)).toBe(true);
    expect(avantLeJourDuDebut('2026-10-22', debut)).toBe(false);
    expect(avantLeJourDuDebut(LUN_DU_MER, null)).toBe(false);
    // Le soir du début « Ce soir » : les repas écartés ne sont jamais cochés (même règle).
    const ceSoir = { jour: LUN_DU_MER, minutes: 21 * 60 + 45 };
    const repas = BUILTIN_SLOTS.map((s, i) => ({ id: String(i), meal_type: s.id, day: 3 })) as never[];
    const dus = repasEchus(repas, BUILTIN_SLOTS, 23 * 60 + 59, bornePremierJour(ceSoir, LUN_DU_MER));
    expect(dus.map((m: { meal_type: string }) => m.meal_type)).toEqual(['dinner']);
    expect(heuresLimites(BUILTIN_SLOTS).get('dinner')).toBe(23 * 60 + 59);
  });
});
