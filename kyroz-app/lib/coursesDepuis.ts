import type { MealPlan } from './types';

/**
 * LA LISTE DE COURSES PART DU JOUR OÙ LE PLAN A ÉTÉ GÉNÉRÉ (décision fondateur, 2026-09-17).
 *
 * « Si l'user s'inscrit le jeudi, son plan génère la semaine mais la liste de courses se
 * génère sur le jeudi. Pareil s'il recharge lui-même son plan. Et le lundi, quand le plan
 * se génère, on est lundi, donc la liste se fait sur la semaine. »
 *
 * 🔴 **LA BORNE SE FIGE À LA GÉNÉRATION, ELLE NE GLISSE PAS.** Une borne recalculée chaque
 * jour ferait DISPARAÎTRE le vendredi matin les ingrédients du jeudi — alors que les
 * courses, elles, n'ont pas encore été faites. On lit donc `week_start_date`, posée à la
 * génération, jamais l'horloge du moment.
 * ➡️ Amendé le 2026-10-02 (F9) : cette règle vaut AVANT les courses. Après des « Courses
 * terminées » cette semaine, voir `repasACompter` plus bas.
 *
 * 🔴 **UN JOUR DE PLAN N'EST PAS SON RANG — et s'y fier aurait retiré un jour À VENIR.**
 * `plan_weekdays` porte des `getDay` (0 = dimanche), donc le dimanche est en TÊTE de liste
 * alors qu'il tombe en FIN de semaine ; et l'écran Plan date chaque jour sur la semaine
 * civile en cours (`startOfWeekMonday` + offset lundi = 0 … dimanche = 6). Trier par rang
 * aurait donc effacé le dimanche des courses d'un plan généré un lundi. C'est la POSITION
 * DANS LA SEMAINE qui tranche, jamais l'ordre du tableau.
 */

/** Jour de semaine (0 = dimanche) d'une date locale `YYYY-MM-DD`, ou `null` si illisible. */
export function jourDeSemaine(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

/** Position dans la semaine FRANÇAISE : lundi = 0 … dimanche = 6 (comme l'écran Plan). */
export function positionSemaine(jourDeSemaine0Dimanche: number): number {
  return jourDeSemaine0Dimanche === 0 ? 6 : jourDeSemaine0Dimanche - 1;
}

/**
 * Les jours de plan (numéros 1-based) que la liste de courses doit couvrir.
 *
 * ⚠️ Rend TOUS les jours dès qu'on ne sait pas : pas de `plan_weekdays` (comptes d'avant
 * les jours choisis) ou date illisible. Acheter pour toute la semaine est le repli SÛR —
 * l'inverse ferait manquer des ingrédients sans rien dire.
 */
export function joursAAcheter(plan: Pick<MealPlan, 'week_start_date' | 'days'>, weekdays: number[] | undefined): number[] {
  const tous = Array.from({ length: plan.days }, (_, i) => i + 1);
  if (!weekdays || weekdays.length === 0) return tous;
  const wd = jourDeSemaine(plan.week_start_date);
  if (wd === null) return tous;
  const seuil = positionSemaine(wd);
  const actifs = weekdays.slice(0, plan.days);
  const gardes = actifs.map((j, i) => ({ pos: positionSemaine(j), jour: i + 1 }))
    .filter((x) => x.pos >= seuil)
    .map((x) => x.jour);
  // Aucun jour restant (plan lundi-mercredi généré un samedi) : on garde tout plutôt que
  // de servir une liste VIDE, qui se lirait comme « rien à acheter ».
  return gardes.length > 0 ? gardes : tous;
}

/** Noms des jours, index 0 = dimanche (comme `Date.getDay`). */
export const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Ce que l'écran Courses annonce quand la liste ne couvre pas tout le plan.
 * Chaîne vide quand elle le couvre : rien à dire, donc rien à afficher.
 */
export function mentionDepart(plan: Pick<MealPlan, 'week_start_date' | 'days'>, weekdays: number[] | undefined): string {
  const jours = joursAAcheter(plan, weekdays);
  if (jours.length >= plan.days) return '';
  const wd = jourDeSemaine(plan.week_start_date);
  return wd === null ? '' : `À partir du ${NOMS_JOURS[wd]} : ton plan avait déjà commencé.`;
}

// ── APRÈS DES COURSES TERMINÉES : SEULEMENT LES REPAS QU'IL RESTE À CUISINER ──────────
//
// Décision fondateur du 2026-10-02 (F9, docs/fiabilite-liste-et-reserve.md). La liste vaut
// « besoin du plan − réserve », et cuisiner débite la réserve. Tant que le besoin comptait
// aussi les repas DÉJÀ cuisinés, chaque repas l'était deux fois : après une journée
// cuisinée, des articles déjà achetés revenaient sur la liste (16 avec l'ancien rangement,
// 4 avec le format vendu, mesuré sur un plan canonique).
//
// ➡️ La règle du 2026-09-17 (« la borne ne glisse pas ») vaut AVANT les courses : tant que
// rien n'a été acheté, les ingrédients du jeudi restent sur la liste du vendredi. APRÈS une
// clôture faite pendant la semaine du plan, la liste ne compte plus que :
//   · les jours qui ne sont pas encore passés ;
//   · et, aujourd'hui, les repas pas encore tranchés (ni cuisinés, ni sautés).
// Un jour passé ne se cuisine plus : ses repas ont été cochés, donc retirés de la réserve,
// ou sautés. Les statuts s'effacent au changement de jour (`resetTracking`), c'est pourquoi
// la règle lit la DATE pour les jours passés et le statut pour le jour même.
//
// ⚠️ Repli sur la règle d'avant dès qu'on ne sait pas dater : pas de `plan_weekdays`, date
// illisible, aucune clôture cette semaine, ou un plan d'une autre semaine que celle du jour.
// ⚠️ Une clôture qui n'a pris que des ajouts manuels compte aussi. Rare, et ce qu'elle retire
// de la liste, ce sont des jours passés.

/** Lundi 00:00, heure locale, de la semaine civile d'une date `YYYY-MM-DD`. */
function lundiDe(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - positionSemaine(d.getDay()));
  return d;
}

const SEMAINE_MS = 7 * 24 * 3600 * 1000;

type RepasSuivi = { day: number; status?: string };

/**
 * Les repas que la liste de courses doit compter, et les jours qu'elle couvre.
 * `derniereCloture` : l'heure ISO des dernières « Courses terminées » (historique).
 */
export function repasACompter<M extends RepasSuivi>(
  plan: Pick<MealPlan, 'week_start_date' | 'days'> & { meals: M[] },
  weekdays: number[] | undefined,
  derniereCloture: string | null | undefined,
  maintenant: Date = new Date(),
): { meals: M[]; jours: number[]; apresCourses: boolean } {
  const avant = { meals: plan.meals, jours: joursAAcheter(plan, weekdays), apresCourses: false };
  if (!weekdays || weekdays.length === 0 || !derniereCloture) return avant;
  const lundi = lundiDe(plan.week_start_date);
  const cloture = new Date(derniereCloture);
  if (!lundi || Number.isNaN(cloture.getTime())) return avant;
  const debut = lundi.getTime();
  const fin = debut + SEMAINE_MS;
  // La clôture doit appartenir à la semaine du plan, et aujourd'hui aussi.
  if (cloture.getTime() < debut || maintenant.getTime() < debut || maintenant.getTime() >= fin) return avant;

  const auj = positionSemaine(maintenant.getDay());
  const position = (jour: number) => positionSemaine(weekdays[jour - 1]);
  const jours = Array.from({ length: Math.min(plan.days, weekdays.length) }, (_, i) => i + 1)
    .filter((j) => position(j) >= auj);
  const tranche = (m: M) => m.status === 'eaten' || m.status === 'skipped';
  const meals = plan.meals.filter((m) =>
    jours.includes(m.day) && !(position(m.day) === auj && tranche(m)));
  return { meals, jours, apresCourses: true };
}
