import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { baseDayTargets, dayExpenditures } from '../planEngine';
import { bankedDailyTargets, offsetsForPlan } from '../calorieBank';
import { bankFloorKcal, recalcProfile } from '../tdee';
import { RYTHME_HEBDOMADAIRE_ACTIF } from '../featureFlags';
import { MEAL_ORDER, SportSession, UserProfile } from '../types';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 DEUX MÉCANISMES DÉPLACENT DES CALORIES ENTRE LES JOURS, ET RIEN NE MESURAIT LEUR
// COMPOSITION (constat 02-05).
//
//  · la **répartition par volume** (`lib/dailyBudget.ts`) : la cible d'un jour suit la
//    dépense de CE jour — un jour de séance monte, un jour de repos descend ;
//  · la **banque** (« Jours plus copieux », `lib/calorieBank.ts`) : l'utilisateur pose
//    un écart sur un jour, compensé sur les autres.
//
// Chacun conserve le total de la semaine. Empilés, ils s'ADDITIONNENT — et personne ne
// l'avait mesuré, parce que la banque est éteinte (`RYTHME_HEBDOMADAIRE_ACTIF = false`,
// décision fondateur du 2026-08-18) et qu'un mécanisme éteint ne se teste pas tout seul.
//
// ⚠️ **CE FICHIER NE RALLUME RIEN ET NE BORNE RIEN.** Il compose les deux moteurs RÉELS
// en appelant `bankedDailyTargets` directement — exactement ce que fait `bankedTargets`,
// sans passer par `bankOf` qui court-circuite sur le drapeau. Ce qui est éteint reste
// éteint ; ce qui était invisible devient compté.
//
// 🔴 **POURQUOI AUCUNE BORNE N'EST AJOUTÉE ICI, ET C'EST UNE DÉCISION.** La reco de
// l'audit dit « borner la cible du jour à la dépense du jour ». C'est un changement
// PRODUIT sur une feature dormante, et le dépôt a déjà rejeté un plafond de cette
// famille : `MAX_DAY_RATIO = 1,35` (spec P2.1, 2026-07-29), au motif que « le rapport
// entre les jours n'est pas un réglage, c'est celui des dépenses réelles ». Et un
// dépassement de la maintenance UN jour est précisément ce qu'une banque promet — la
// borner reviendrait à vendre un mécanisme puis à l'empêcher de fonctionner.
// ➡️ L'arbitrage appartient au jour du rallumage. Ce fichier lui donne les chiffres.

const SPORT: SportSession[] = [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }];

const profil = (): UserProfile => recalcProfile({
  id: 't', sex: 'male', age: 32, weight_kg: 83, height_cm: 180, body_fat_pct: 18,
  activity_level: 'moderate', training_days_per_week: 4, sports: SPORT,
  neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], rest_weekdays: [5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
} as unknown as UserProfile);

/** Compose les deux mécanismes, exactement comme `bankedTargets` le ferait allumé. */
function composer(p: UserProfile, banque: Record<string, number>) {
  const base = baseDayTargets(p, 7);
  return bankedDailyTargets({
    days: 7,
    baseTargetKcal: base,
    offsets: offsetsForPlan(banque, p.plan_weekdays, 7),
    floorKcal: Math.min(bankFloorKcal(p), ...base),
  });
}

describe('la banque est bien ÉTEINTE — ce fichier ne la rallume pas', () => {
  it('le drapeau vaut toujours `false`', () => {
    expect(RYTHME_HEBDOMADAIRE_ACTIF).toBe(false);
  });

  it('🔴 le moteur SERVI ignore `calorie_bank` tant que le drapeau est bas', () => {
    // Le garde-fou d'extinction : `bankOf` court-circuite, donc un compte qui portait
    // déjà un réglage reçoit la même semaine que s'il n'en avait jamais posé.
    const src = readFileSync(join(__dirname, '..', 'planEngine.ts'), 'utf8');
    expect(src).toMatch(/RYTHME_HEBDOMADAIRE_ACTIF \? profile\.calorie_bank : undefined/);
  });
});

describe('banque × cyclage — ce que la composition produit VRAIMENT', () => {
  const p = profil();
  const base = baseDayTargets(p, 7);
  const depenses = dayExpenditures(p, 7);

  it('le témoin : le cyclage seul fait déjà varier les jours', () => {
    // Sans lui, tout ce qui suit mesurerait une semaine plate et ne prouverait rien.
    expect(Math.max(...base) - Math.min(...base)).toBeGreaterThan(40);
  });

  it('🔴 le total de la SEMAINE est conservé au kcal près — c'
    + ' est ce qui rend la composition défendable', () => {
    // La propriété centrale : les deux mécanismes DÉPLACENT des calories, ils n'en
    // créent ni n'en retirent. C'est elle qui fait que l'exposition hebdomadaire à
    // l'énergie disponible ne bouge pas — et donc que ce constat est P2 et pas P0.
    // ⚠️ TOLÉRANCE DE 3 kcal, ET C'EST MESURÉ, PAS UNE FACILITÉ. La compensation se
    // répartit sur six jours et chaque cible est ARRONDIE : un écart de 600 divisé par
    // six laisse jusqu'à ±2 kcal de dérive d'arrondi sur la semaine. Exiger l'égalité
    // stricte a fait rougir ce test sur `15691` contre `15689` — ce qui aurait fait
    // chercher une fuite de calories là où il n'y a qu'un `Math.round`.
    const somme = (a: number[]) => a.reduce((x, y) => x + y, 0);
    for (const ecart of [200, 400, 600]) {
      const r = composer(p, { 1: ecart });
      expect(r.uncompensatedKcal, `écart ${ecart} : non compensé`).toBe(0);
      expect(Math.abs(somme(r.targets) - somme(base)), `écart ${ecart} : total hebdo`)
        .toBeLessThanOrEqual(3);
    }
  });

  it('🔴 UN JOUR PASSE AU-DESSUS DE SA PROPRE DÉPENSE — le fait à arbitrer', () => {
    // Mesuré : sur un jour d'entraînement portant +600, la cible dépasse la dépense
    // de CE jour. Le total de la semaine reste juste ; le cumul journalier, lui,
    // n'est borné par rien.
    // ⚠️ Ce n'est PAS déclaré comme un défaut : c'est ce qu'une banque promet. Le test
    // fige le fait pour que le rallumage soit un arbitrage éclairé, pas une découverte.
    // ⚠️ LA CLÉ DE LA BANQUE EST UN JOUR DE SEMAINE, PAS UN INDEX DE PLAN, et les
    // confondre m'a fait mesurer le mauvais jour : `offsetsForPlan` traduit la clé `1`
    // en position `2` du plan (`out[i + 1]`), donc `targets[1]`. La première version de
    // ce test lisait `targets[0]` et concluait que la cible BAISSAIT — elle lisait un
    // jour de compensation, pas le jour porteur.
    const off = offsetsForPlan({ 1: 600 }, p.plan_weekdays, 7);
    const jour = Number(Object.keys(off)[0]) - 1;   // position 0-indexée du jour porteur
    const r = composer(p, { 1: 600 });
    // Mesuré : 2921 servis contre 2619 de dépense ce jour-là, soit +302 au-dessus.
    expect(r.targets[jour]).toBeGreaterThan(depenses[jour]);
  });

  it('🔴 mais AUCUN jour ne passe sous le plancher QUOTIDIEN', () => {
    // La contrepartie, et c'est elle qui borne le risque : la compensation ne peut pas
    // creuser sous `max(BMR, filet absolu)`. C'est le seul plancher réellement
    // journalier — le plancher de SÉCURITÉ, lui, est une moyenne hebdomadaire, et les
    // confondre a déjà fait rejeter une spec (cf. `plancherServi.test.ts`).
    // 🔴 LA PREMIÈRE VERSION DE CE TEST A SURVÉCU À SA MUTATION. Elle balayait
    // 200…900 kcal — or à +900 la compensation vaut 150 kcal/jour et le jour le plus
    // bas tombe à 1892, soit **au-dessus** d'un plancher à 1800. Le plancher n'était
    // jamais TRAVERSÉ : le neutraliser (`const floor = 0`) laissait le test vert.
    // Mesuré : il mord à partir de **+1500** (min bloqué à 1800), et à **+3000** la
    // compensation ne peut plus tout reprendre — `uncompensatedKcal` passe à 432.
    // ➡️ Un garde-fou qu'on ne franchit pas ne garde rien : le balayage va donc
    // jusqu'où le plancher AGIT, et le reste non repris est exigé DÉCLARÉ.
    const plancher = Math.min(bankFloorKcal(p), ...base);
    expect(plancher, 'témoin : le plancher doit être une valeur réelle').toBeGreaterThan(1000);
    for (const ecart of [200, 900, 1500, 3000, 4000]) {
      const r = composer(p, { 2: ecart });
      for (const [i, cible] of r.targets.entries()) {
        expect(cible, `écart ${ecart}, jour ${i}`).toBeGreaterThanOrEqual(plancher);
      }
    }
    // ⚠️ Et ce que le plancher empêche de reprendre n'est pas AVALÉ : au-delà de
    // ~+2000 il ressort dans `uncompensatedKcal`, donc la semaine cesse d'être
    // conservée — et le moteur le DIT au lieu de le cacher. C'est cette déclaration
    // qui distingue « borné » de « faux ».
    const gros = composer(p, { 2: 3000 });
    expect(gros.uncompensatedKcal, 'le non-repris doit être déclaré').toBeGreaterThan(0);
    expect(Math.min(...gros.targets)).toBe(plancher);
  });

  it('🔴 les deux mécanismes s’ADDITIONNENT — l’écart de la banque s’empile sur le cyclage', () => {
    // La question que le constat pose : est-ce que poser un écart sur un jour DÉJÀ haut
    // (un jour de séance) donne un jour plus haut que le même écart sur un jour bas ?
    // Réponse : oui — ils ne se compensent pas l'un l'autre. C'est le sens de
    // « s'additionnent », et c'est ce qui n'était mesuré nulle part.
    // Les positions sont LUES sur `offsetsForPlan`, jamais devinées (cf. ci-dessus).
    const pos = (cle: number) => Number(Object.keys(offsetsForPlan({ [cle]: 600 }, p.plan_weekdays, 7))[0]) - 1;
    const iSeance = pos(1);   // un jour d'entraînement
    const iRepos = pos(6);    // un jour de repos
    expect(base[iSeance], 'le gabarit doit bien opposer séance et repos').toBeGreaterThan(base[iRepos]);
    const surSeance = composer(p, { 1: 600 }).targets[iSeance];   // mesuré : 2921
    const surRepos = composer(p, { 6: 600 }).targets[iRepos];     // mesuré : 2642
    expect(surSeance).toBeGreaterThan(surRepos);
    // Et l'écart entre les deux vaut celui du cyclage lui-même (2321 − 2042 = 279) :
    // la banque ne rabote rien de ce que la répartition par volume a décidé.
    expect(Math.abs((surSeance - surRepos) - (base[iSeance] - base[iRepos]))).toBeLessThanOrEqual(2);
  });

  it('un écart NUL rend exactement la semaine du cyclage seul', () => {
    // Témoin de non-régression : brancher la banque à zéro ne doit rien changer.
    expect(composer(p, {}).targets).toEqual(base);
  });
});
