import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLocalPlan } from '../planEngine';
import { buildShoppingList } from '../shoppingList';
import { BUILTIN_SLOTS } from '../mealSlots';
import { repasACompter, mentionDepart } from '../coursesDepuis';
import { datesDuPlan, semaineEcoulee } from '../semainePlan';
import { heuresLimites, repasEchus, bornePremierJour } from '../repasAuto';
import {
  optionsDeDebut, semaineDuDebut, repasDepuisLeDebut, avantLeJourDuDebut, creneauxRestants, compteurDuJour,
} from '../debutPlan';
import { makeProfile } from './helpers';

// 2026-10-19 est un lundi : le mercredi est le 21.
const MER_21H45 = new Date(2026, 9, 21, 21, 45);
const LUN_DU_MER = '2026-10-21';
const SEMAINE = [1, 2, 3, 4, 5];

const poids = (l: ReturnType<typeof buildShoppingList>) =>
  l.items.filter((i) => i.unit === 'g' || i.unit === 'ml').reduce((s, i) => s + i.quantity, 0);

describe('E78 — les choix proposés à la fin de l’inscription', () => {
  // Resserrés le 2026-10-23 (fondateur, sur capture de la redite « Lundi 26 / lundi 26
  // octobre ») : aujourd'hui — « Il reste ton … » ; un autre jour de CETTE semaine, sans
  // sous-titre ; sinon le premier jour du plan de la semaine suivante.
  const vue = (o: ReturnType<typeof optionsDeDebut>) => o.map((x) => [x.groupe, x.libelle, x.detail]);

  it('mercredi 21 h 45 : « Ce soir », jeudi et vendredi de cette semaine, puis la semaine prochaine', () => {
    const o = optionsDeDebut(MER_21H45, BUILTIN_SLOTS, SEMAINE);
    expect(vue(o)).toEqual([
      ['aujourdhui', 'Ce soir', 'Il reste ton dîner'],
      ['semaine', 'Demain', ''],
      ['semaine', 'Vendredi 23', ''],
      ['suivante', 'La semaine prochaine', 'Lundi 26 octobre'],
    ]);
    expect(o[0].debut).toEqual({ jour: LUN_DU_MER, minutes: 21 * 60 + 45 });
    expect(o[1].debut).toEqual({ jour: '2026-10-22', minutes: 0 });
    expect(o[3].debut).toEqual({ jour: '2026-10-26', minutes: 0 });
  });

  it('le matin, c’est « Aujourd’hui », et il reste toute la journée, avec ses possessifs', () => {
    const o = optionsDeDebut(new Date(2026, 9, 21, 8, 30), BUILTIN_SLOTS, SEMAINE);
    expect(o[0].libelle).toBe('Aujourd’hui');
    expect(o[0].detail).toBe('Il reste ton petit-déj, ton déjeuner, ta collation et ton dîner');
  });

  it('aucun jour n’a plus de sous-titre qui répète son nom', () => {
    const o = optionsDeDebut(MER_21H45, BUILTIN_SLOTS, [0, 1, 2, 3, 4, 5, 6]);
    expect(o.filter((x) => x.groupe === 'semaine').every((x) => x.detail === '')).toBe(true);
  });

  it('un repas créé, de genre inconnu : « ton repas « … » », juste quel que soit son nom', () => {
    // Décision fondateur (2026-10-23) : ni question à la création, ni liste de noms à deviner.
    const slots = [
      ...BUILTIN_SLOTS,
      { id: 'c1', label: 'Pause tardive', hour: 22, minute: 0, pool: 'snack' as const },
      { id: 'c2', label: 'Goûter', hour: 22, minute: 30, pool: 'snack' as const },
    ];
    const o = optionsDeDebut(new Date(2026, 9, 21, 21, 30), slots, SEMAINE);
    expect(o[0].detail).toBe('Il reste ton dîner, ton repas «\u00A0Pause tardive\u00A0» et ton repas «\u00A0Goûter\u00A0»');
  });

  it('plus aucun repas à venir : pas de « Ce soir », on commence au plus tôt demain', () => {
    const o = optionsDeDebut(new Date(2026, 9, 21, 23, 59), BUILTIN_SLOTS, SEMAINE);
    expect(o[0].libelle).toBe('Demain');
  });

  it('un samedi, sur un plan du lundi au vendredi : seulement la semaine prochaine (pas de question)', () => {
    const o = optionsDeDebut(new Date(2026, 9, 24, 10, 0), BUILTIN_SLOTS, SEMAINE);
    expect(vue(o)).toEqual([['suivante', 'La semaine prochaine', 'Lundi 26 octobre']]);
  });

  it('un dimanche, sur un plan de 7 jours : aujourd’hui, puis la semaine prochaine (demain lundi)', () => {
    const o = optionsDeDebut(new Date(2026, 9, 25, 10, 0), BUILTIN_SLOTS, [0, 1, 2, 3, 4, 5, 6]);
    expect(o.map((x) => x.groupe)).toEqual(['aujourdhui', 'suivante']);
    expect(o[1].detail).toBe('Lundi 26 octobre');
  });

  it('un plan qui commence le mercredi : la semaine prochaine part du mercredi', () => {
    const o = optionsDeDebut(new Date(2026, 9, 23, 23, 59), BUILTIN_SLOTS, [3, 4, 5]);
    expect(vue(o)).toEqual([['suivante', 'La semaine prochaine', 'Mercredi 28 octobre']]);
  });

  it('sans jours choisis (comptes d’avant), aucune question', () => {
    expect(optionsDeDebut(MER_21H45, BUILTIN_SLOTS, [])).toEqual([]);
    expect(optionsDeDebut(MER_21H45, BUILTIN_SLOTS, undefined)).toEqual([]);
  });

  it('l’écran : la grille « Un autre jour » est celle de la semaine, et un choix unique ne se demande pas', () => {
    const ecran = readFileSync(join(__dirname, '..', '..', 'components', 'FirstPlanReveal.tsx'), 'utf8');
    expect(ecran).not.toContain('Dans les 7 prochains jours');
    expect(ecran).toContain("o.groupe === 'semaine'");
    expect(ecran).toMatch(/optionsDebut\.length === 1\) \{\s*setEtape\('pret'\);\s*void onDebut\(optionsDebut\[0\]\)/);
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
    expect(mentionDepart(plan, SEMAINE)).toBe('À partir de jeudi.');
  });

  it('« Lundi 26 » choisi un mercredi : toute la semaine qui vient, rien de cette semaine', () => {
    const debut = { jour: '2026-10-26', minutes: 0 };
    const plan = { ...genere, week_start_date: semaineDuDebut(LUN_DU_MER, debut) };
    expect(datesDuPlan(plan, SEMAINE)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
    expect(repasACompter(plan, SEMAINE, null, MER_21H45).jours).toEqual([1, 2, 3, 4, 5]);
    expect(mentionDepart(plan, SEMAINE)).toBe('');
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

describe('le compteur du jour depuis le début choisi (2026-10-23)', () => {
  // Fondateur, qui valide l'avis : le premier soir, ne compter que les repas qui restent ;
  // avant le début, pas de compteur. Avant : « 0 / 2 314 kcal » pour un seul dîner.
  const m = (kcal: number, p: number) => ({ macros: { kcal, protein_g: p, carbs_g: 10, fat_g: 5 } });
  const petitDej = m(500, 30), dejeuner = m(700, 45), collation = m(300, 20), diner = m(610, 40);
  const tous = [petitDej, dejeuner, collation, diner];
  const jour = { kcal: 2110, protein_g: 135, carbs_g: 40, fat_g: 20 };
  const macrosDe = (x: { macros: typeof jour }) => x.macros;

  it('le soir du « Ce soir » : seulement le dîner — « 0 / 610 kcal », la carte dit 610', () => {
    const c = compteurDuJour(jour, 2314, tous, [diner], macrosDe)!;
    expect(c.macros).toEqual({ kcal: 610, protein_g: 40, carbs_g: 10, fat_g: 5 });
    expect(c.cible).toBe(610);
  });

  it('le dîner sauté ce soir-là : la cible reste ce qu’il pesait au plan', () => {
    const saute = { ...diner, status: 'skipped' as const };
    const c = compteurDuJour({ ...jour, kcal: 1500 }, 2314, [petitDej, dejeuner, collation, saute], [saute],
      (x: { macros: typeof jour; status?: string }) => (x.status === 'skipped' ? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } : x.macros))!;
    expect(c.cible).toBe(610);
    expect(c.macros.kcal).toBe(0);
  });

  it('un jour d’avant le début : pas de compteur', () => {
    expect(compteurDuJour(jour, 2314, tous, [], macrosDe)).toBeNull();
  });

  it('un jour ordinaire ne bouge pas', () => {
    expect(compteurDuJour(jour, 2314, tous, tous, macrosDe)).toEqual({ macros: jour, cible: 2314 });
  });

  it('l’écran Plan s’en sert pour la barre ET la note', () => {
    const ecran = readFileSync(join(__dirname, '..', '..', 'app', '(tabs)', 'plan.tsx'), 'utf8');
    expect(ecran).toContain('compteurDuJour(dayMacros, dayTarget ?? dayMacros.kcal, dayMealsPlan, dayMeals, effectiveMacros)');
    expect(ecran).toContain('targetKcal={compteur.cible}');
    expect(ecran).not.toContain('targetKcal={dayTarget ?? dayMacros.kcal}');
  });
});
