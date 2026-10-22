import type { Meal, MealPlan, UserProfile } from './types';
import { buildLocalPlan, nextPlanSeed, profileSignature } from './planEngine';
import { ENGINE_NOTICE_MIN_DELTA } from './tdee';
import { datesDuPlan, semaineEcoulee } from './semainePlan';
import { repasACompter } from './coursesDepuis';

/**
 * LA SEMAINE SUIVANTE, PRÉPARÉE D'AVANCE (décision fondateur du 2026-10-21).
 *
 * « Peu importe le plan, une fois une liste de courses validée, une nouvelle apparaît pour le
 * plan de la semaine d'après. Elle est faite en fonction de ce qu'il doit rester à la fin du
 * plan actuel. »
 *
 * ➡️ Ce que ça règle : un plan de 7 jours n'avait AUCUN jour d'avance pour les courses du
 * week-end (mesuré le 2026-10-20 sur 42 cas) — la semaine suivante n'existait que le lundi.
 * Désormais, dès que les courses de la semaine en cours sont closes, la suivante est tirée
 * et gardée de côté ; sa liste apparaît dans Courses ; le jour du renouvellement, c'est
 * ELLE qui devient le plan, sans nouveau tirage : ce qu'on a acheté est ce qu'on cuisine.
 *
 * Les quatre règles validées le même jour :
 *  1. « ce qu'il doit rester » se RECALCULE à chaque lecture (réserve d'aujourd'hui moins les
 *     repas qu'il reste à cuisiner) — c'est l'écran Courses qui le fait, jamais une copie figée ;
 *  2. une seule semaine d'avance : tant qu'une suivante attend, aucune autre ne se prépare ;
 *  3. ce qui manque encore pour la semaine en cours reste en tête de liste ;
 *  4. sans « Courses terminées », rien ne change (renouvellement ordinaire).
 *
 * 🔴 ET LA PESÉE (relevé par le fondateur le même jour : « on a oublié la pesée »). Une pesée
 * change les cibles, donc la signature du plan, donc le plan se RE-TIRAIT : mesuré, −0,3 kg
 * (5 kcal/jour de cible) changeait 64 % des recettes de la semaine, −1 kg 72 %. Les courses
 * du lundi ne servaient plus le mercredi. Quand seules les CIBLES bougent, le plan garde ses
 * recettes et seules les portions suivent (`ciblesSeulement`, `buildLocalPlan(…, imposes)`).
 *
 * Fichier sans import d'exécution React Native : testé sous vitest.
 */

export interface SemaineSuivante {
  plan: MealPlan;
  /** Le tirage de cette semaine : il devient celui du plan le jour où elle est adoptée. */
  seed: number;
}

/** Les champs de `profileSignature` qui ne portent qu'une CIBLE (ce qu'une pesée déplace). */
const CHAMPS_DE_CIBLE = new Set(['k', 'pr', 'c', 'f', 'sp']);

/**
 * Entre deux signatures, n'ont bougé que les cibles, et de peu : le plan garde ses recettes.
 * « De peu » = moins de `ENGINE_NOTICE_MIN_DELTA` (100 kcal/jour), le seuil où l'app annonce
 * d'elle-même un changement de cible. Une pesée de −2 kg en vaut ~30 ; un changement
 * d'objectif dépasse le seuil et re-tire le plan, comme avant.
 * ⚠️ `false` dès qu'on ne sait pas lire (signature absente, d'avant, illisible) : le repli est
 * le comportement d'avant, jamais un plan gardé à tort.
 */
export function ciblesSeulement(avant: string | undefined, apres: string): boolean {
  if (!avant || avant === apres) return false;
  let a: Record<string, unknown>, b: Record<string, unknown>;
  try { a = JSON.parse(avant); b = JSON.parse(apres); } catch { return false; }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const cles = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const cle of cles) {
    if (CHAMPS_DE_CIBLE.has(cle)) continue;
    if (JSON.stringify(a[cle]) !== JSON.stringify(b[cle])) return false;
  }
  const ka = Number(a.k), kb = Number(b.k);
  return Number.isFinite(ka) && Number.isFinite(kb) && Math.abs(kb - ka) < ENGINE_NOTICE_MIN_DELTA;
}

/** Le même plan, mêmes recettes, portions recalculées sur le profil (une pesée). */
export function memesRecettes(profile: UserProfile, plan: MealPlan, seed: number): MealPlan {
  const imposes = new Map<string, Meal>(plan.meals.map((m) => [m.id, m]));
  const neuf = buildLocalPlan(profile, seed, imposes);
  return { ...neuf, id: plan.id, week_start_date: plan.week_start_date, generated_at: plan.generated_at, prepare_le: plan.prepare_le };
}

/** Le jour où la semaine suivante commence : le lendemain du dernier jour du plan en cours. */
export function debutDeLaSuivante(plan: Pick<MealPlan, 'week_start_date' | 'days'>, weekdays: number[] | undefined): string | null {
  const dates = datesDuPlan(plan, weekdays);
  if (!dates) return null;
  const dernier = dates.reduce((a, b) => (b > a ? b : a));
  const [y, m, d] = dernier.split('-').map(Number);
  const lendemain = new Date(y, m - 1, d + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${lendemain.getFullYear()}-${p(lendemain.getMonth() + 1)}-${p(lendemain.getDate())}`;
}

/** Le premier jour daté de la semaine suivante (pour « Pour ta semaine du lundi 27 »). */
export function premierJour(plan: Pick<MealPlan, 'week_start_date' | 'days'>, weekdays: number[] | undefined): string | null {
  const dates = datesDuPlan(plan, weekdays);
  return dates ? dates.reduce((a, b) => (b < a ? b : a)) : null;
}

/**
 * Faut-il préparer la semaine suivante ? Oui quand les courses de CE plan sont closes
 * (`repasACompter(…).apresCourses` : une clôture qui compte pour ce plan, et le plan pas
 * encore fini) et qu'aucune suivante n'attend (règle 2).
 * ⚠️ Rien sans jours datés (comptes d'avant les jours choisis) : on ne sait pas dater la suite.
 */
export function doitPreparer(
  plan: MealPlan,
  weekdays: number[] | undefined,
  derniereCloture: string | null | undefined,
  suivante: SemaineSuivante | null,
  maintenant: Date,
): boolean {
  if (suivante) return false;
  if (!debutDeLaSuivante(plan, weekdays)) return false;
  return repasACompter(plan, weekdays, derniereCloture, maintenant).apresCourses;
}

/** Tire la semaine suivante : un NOUVEAU tirage (comme un renouvellement), daté de son début. */
export function preparer(profile: UserProfile, courant: MealPlan, seedCourant: number, maintenant: Date): SemaineSuivante | null {
  const debut = debutDeLaSuivante(courant, profile.plan_weekdays);
  if (!debut) return null;
  const seed = nextPlanSeed(String(seedCourant), true);
  const p = buildLocalPlan(profile, seed);
  return { seed, plan: { ...p, week_start_date: debut, prepare_le: maintenant.toISOString() } };
}

/**
 * La semaine suivante, remise d'accord avec le profil et le plan en cours, ou `null` si elle
 * n'a plus lieu d'être (ses jours sont tous passés).
 *  · même signature, même début → telle quelle ;
 *  · seules les cibles ont bougé (une pesée) → mêmes recettes, portions recalculées ;
 *  · autre chose (régime, jours, repas…) → re-tirée avec le MÊME tirage, à la bonne date.
 */
export function aligner(
  profile: UserProfile,
  courant: MealPlan,
  suivante: SemaineSuivante,
  aujourdHui: string,
): SemaineSuivante | null {
  const debut = debutDeLaSuivante(courant, profile.plan_weekdays);
  if (!debut) return null;
  const dates = datesDuPlan(suivante.plan, profile.plan_weekdays);
  if (dates && dates.every((d) => d < aujourdHui)) return null;
  const sig = profileSignature(profile);
  const memeDebut = suivante.plan.week_start_date === debut;
  if (memeDebut && suivante.plan.profile_sig === sig) return suivante;
  if (memeDebut && ciblesSeulement(suivante.plan.profile_sig, sig)) {
    return { seed: suivante.seed, plan: memesRecettes(profile, suivante.plan, suivante.seed) };
  }
  const p = buildLocalPlan(profile, suivante.seed);
  return { seed: suivante.seed, plan: { ...p, week_start_date: debut, prepare_le: suivante.plan.prepare_le } };
}

/**
 * Le jour du renouvellement, la semaine suivante devient-elle le plan ? Oui si le plan en
 * cours est vécu (`semaineEcoulee`) et qu'il reste au moins un jour à la suivante. Sinon,
 * renouvellement ordinaire (règle 4) — qui ouvre l'app dix jours plus tard ne reçoit pas une
 * semaine déjà passée.
 */
export function aAdopter(
  courant: MealPlan,
  suivante: SemaineSuivante | null,
  aujourdHui: string,
  weekdays: number[] | undefined,
): boolean {
  if (!suivante || !semaineEcoulee(courant, aujourdHui, weekdays)) return false;
  const dates = datesDuPlan(suivante.plan, weekdays);
  return !!dates && dates.some((d) => d >= aujourdHui);
}
