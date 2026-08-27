import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePlan } from '../tdee';
import { datedGoalStatus } from '../datedGoal';
import { MEAL_ORDER, UserProfile } from '../types';

// ── Ce que ce fichier tient fermé ───────────────────────────────────────────
//
// 🔴 UN OBJECTIF DATÉ DONT LA DATE EST PASSÉE NE PILOTAIT PLUS RIEN, ET LE PLAN NE LE
// DISAIT PAS (constat 02-04). Mesuré avant correctif, `goal_target.target_date`
// au 2020-01-01 : sortie **strictement identique** au même profil SANS objectif daté —
// 2263 kcal, `["FLOOR_APPLIED","LOW_EA_WARNING"]` des deux côtés. Aucun drapeau, rien.
//
// ⚠️ **LE CONSTAT DISAIT « IGNORÉ EN SILENCE », ET C'ÉTAIT VRAI À MOITIÉ.** Vrai du
// MOTEUR ; **faux de l'écran** — `DatedGoalCard` rend déjà « Échéance passée » quand
// `!status.active`, et `PAYWALL_LAUNCH` valant `null`, `premium.can('dated_goal')` est
// vrai pour 100 % des comptes : tout le monde le voit aujourd'hui. On n'a donc PAS
// ajouté un second message — deux messages pour une même cause se contredisent à l'œil,
// c'est la règle que `profil.tsx` applique déjà aux cartes de plancher.
// ➡️ Ce qui manquait est que le MOTEUR le dise : un drapeau est comptable, et il est
// disponible aux surfaces qui n'ont pas cette carte.
//
// 🔴 **CE QUI RESTE OUVERT, ET SE RÉVEILLERA LE JOUR DU PAYWALL** : la carte est gardée
// par `premium.can('dated_goal')`. Un abonnement expiré rendra donc l'objectif daté
// périmé **invisible** — un `goal_target` que plus rien n'affiche et que le moteur
// n'applique plus. Le drapeau, lui, sera là ; il faudra une surface pour le lire.

const base = {
  id: 't', sex: 'male', age: 35, weight_kg: 92, height_cm: 182, body_fat_pct: 18,
  activity_level: 'moderate', training_days_per_week: 4, sports: [],
  neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
};
const AUJ = '2026-08-27';
const profil = (gt?: unknown) => ({ ...base, goal_target: gt } as unknown as UserProfile);
const cible = (d: string) =>
  ({ target_weight_kg: 82, target_date: d, start_weight_kg: 92, start_date: '2026-01-01' });

describe('objectif daté périmé — le plan le DIT', () => {
  it('le témoin : un objectif daté FUTUR pilote bien, et ne lève pas le drapeau', () => {
    const r = computePlan(profil(cible('2027-06-01')), AUJ);
    expect(r.flags).not.toContain('DATED_GOAL_EXPIRED');
    // Et il change réellement le plan — sinon ce fichier ne mesurerait pas un pilotage.
    expect(r.profile.target_kcal).not.toBe(computePlan(profil(), AUJ).profile.target_kcal);
  });

  it('🔴 date PASSÉE → `DATED_GOAL_EXPIRED`', () => {
    expect(computePlan(profil(cible('2020-01-01')), AUJ).flags).toContain('DATED_GOAL_EXPIRED');
  });

  it('🔴 date du JOUR → périmé aussi (elle ne laisse plus aucune semaine)', () => {
    expect(computePlan(profil(cible(AUJ)), AUJ).flags).toContain('DATED_GOAL_EXPIRED');
  });

  it('aucun objectif daté → PAS de drapeau (il n’y a rien à signaler)', () => {
    // La distinction qui compte : « pas d'objectif » et « objectif mort » sont deux
    // états différents, et un seul mérite un message.
    expect(computePlan(profil(), AUJ).flags).not.toContain('DATED_GOAL_EXPIRED');
  });

  it('🔴 le drapeau n’a déplacé AUCUNE calorie — donc aucun `ENGINE_REV`', () => {
    // La prémisse du « pas d'ENGINE_REV », comptée et non affirmée : sur un objectif
    // périmé, le plan servi doit être identique à celui d'avant le correctif —
    // c'est-à-dire identique au même profil sans objectif daté du tout.
    const perime = computePlan(profil(cible('2020-01-01')), AUJ).profile;
    const sans = computePlan(profil(), AUJ).profile;
    for (const k of ['target_kcal', 'target_protein_g', 'target_carbs_g', 'target_fat_g', 'tdee_kcal'] as const) {
      expect(perime[k], `${k} a bougé`).toBe(sans[k]);
    }
  });
});

// ── L'ÉQUIVALENCE SUR LAQUELLE LE DRAPEAU REPOSE ────────────────────────────
//
// Le moteur lève le drapeau sur `!datedStatus.active`. Ça ne veut « périmé » que
// parce que la SEULE branche qui met `active` à `false` est gardée par `daysLeft <= 0`.
// Si `active` gagne un jour une autre cause de fausseté — un objectif suspendu, un
// garde-fou qui désarme le pilotage — le drapeau se mettrait à mentir **sans que rien
// ne change dans `tdee.ts`**. Cette équivalence est donc figée ici.
describe('`!active` veut dire PÉRIMÉ, et rien d’autre', () => {
  const statut = (d: string) => datedGoalStatus(cible(d), profil() as never, AUJ, 2700, null, null);

  it('la sonde rend bien un statut — sinon elle ne mesure rien', () => {
    expect(statut('2027-06-01')).toBeTruthy();
  });

  it('🔴 `active` est faux si et seulement si la date est atteinte ou dépassée', () => {
    const cas: [string, boolean][] = [
      ['2020-01-01', false],  // largement passée
      ['2026-08-26', false],  // hier
      [AUJ, false],           // aujourd'hui — plus aucune semaine devant
      ['2026-08-28', true],   // demain
      ['2027-06-01', true],   // dans dix mois
    ];
    for (const [d, attendu] of cas) {
      expect(statut(d)!.active, `date ${d}`).toBe(attendu);
    }
  });

  it('🔴 « objectif déjà atteint » reste ACTIF — il pilote encore, à delta nul', () => {
    // Le cas qu'il ne faut surtout pas confondre avec « périmé » : la personne est au
    // poids visé et la date est devant. Le moteur passe en maintien et continue de
    // piloter. Lever `DATED_GOAL_EXPIRED` ici annoncerait un échec là où il y a un
    // succès — l'inverse exact du message.
    const atteint = { target_weight_kg: 92, target_date: '2027-06-01', start_weight_kg: 100, start_date: '2026-01-01' };
    const st = datedGoalStatus(atteint, profil() as never, AUJ, 2700, null, null);
    expect(st!.active).toBe(true);
    expect(computePlan(profil(atteint), AUJ).flags).not.toContain('DATED_GOAL_EXPIRED');
  });

  it('🔴 la carte dit DÉJÀ « Échéance passée » — ne pas ajouter un second message', () => {
    // Ce test existe pour empêcher une future session de « corriger » 02-04 en câblant
    // une carte de plus : elle en ferait deux pour la même cause. Si cette phrase
    // disparaît de la carte, alors le message manque vraiment, et il faut le rouvrir.
    const carte = readFileSync(join(__dirname, '..', '..', 'components', 'DatedGoalCard.tsx'), 'utf8');
    expect(carte, 'la carte ne dit plus l’échéance passée → l’utilisateur n’est plus prévenu nulle part')
      .toContain('Échéance passée');
    expect(carte).toContain('!status.active');
  });
});
