import type { MealPlan } from './types';
import { dateLocale, datesDuPlan, jourDeSemaine, positionSemaine } from './semainePlan';

// Déplacés dans `lib/semainePlan.ts` le 2026-10-04 (la date des jours du plan en a besoin) ;
// ré-exportés ici pour ne casser aucun import.
export { jourDeSemaine, positionSemaine };

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
 * alors qu'il tombe en FIN de semaine ; et chaque jour se date par sa position, lundi = 0
 * … dimanche = 6 (`lib/semainePlan.ts::datesDuPlan`, la même date que l'écran Plan depuis
 * le 2026-10-04). Trier par rang aurait donc effacé le dimanche des courses d'un plan
 * généré un lundi. C'est la POSITION DANS LA SEMAINE qui tranche, jamais l'ordre du tableau.
 */

/**
 * Les jours de plan (numéros 1-based) que la liste de courses doit couvrir.
 *
 * ⚠️ Rend TOUS les jours dès qu'on ne sait pas : pas de `plan_weekdays` (comptes d'avant
 * les jours choisis) ou date illisible. Acheter pour toute la semaine est le repli SÛR —
 * l'inverse ferait manquer des ingrédients sans rien dire.
 */
export function joursAAcheter(plan: Pick<MealPlan, 'week_start_date' | 'days'>, weekdays: number[] | undefined): number[] {
  const tous = Array.from({ length: plan.days }, (_, i) => i + 1);
  const dates = datesDuPlan(plan, weekdays);
  if (!dates) return tous;
  // Le plan entier est devant (généré un lundi, ou le week-end pour la semaine qui vient) :
  // tout, comme avant le 2026-10-04.
  if (dates.every((d) => d >= plan.week_start_date)) return tous;
  const gardes = dates.flatMap((d, i) => (d >= plan.week_start_date ? [i + 1] : []));
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
// clôture faite pour ce plan, la liste ne compte plus que :
//   · les jours qui ne sont pas encore passés ;
//   · et, aujourd'hui, les repas pas encore tranchés (ni cuisinés, ni sautés).
// Un jour passé ne se cuisine plus : ses repas ont été cochés, donc retirés de la réserve,
// ou sautés. Les statuts s'effacent au changement de jour (`resetTracking`), c'est pourquoi
// la règle lit la DATE pour les jours passés et le statut pour le jour même.
//
// ⚠️ Repli sur la règle d'avant dès qu'on ne sait pas dater : pas de `plan_weekdays`, date
// illisible, aucune clôture depuis le début de ce plan, ou un plan dont tous les jours sont
// passés (il se renouvelle, `lib/semainePlan.ts::semaineEcoulee`).
// ⚠️ Une clôture qui n'a pris que des ajouts manuels compte aussi. Rare, et ce qu'elle retire
// de la liste, ce sont des jours passés.
// ➡️ Amendé le 2026-10-04 : les jours se lisent sur leurs DATES (`datesDuPlan`). La première
// version prenait pour semaine du plan celle de sa génération : un plan généré le dimanche
// pour la semaine qui vient sortait de la règle dès le lundi, et les articles achetés le
// dimanche revenaient le lundi soir. Les courses comptent désormais depuis le lendemain du
// dernier jour du cycle d'avant : le samedi pour un plan du lundi au vendredi.

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
  if (!derniereCloture) return avant;
  const dates = datesDuPlan(plan, weekdays);
  const cloture = new Date(derniereCloture);
  if (!dates || Number.isNaN(cloture.getTime())) return avant;
  const auj = dateLocale(maintenant);
  if (auj > dates.reduce((a, b) => (b > a ? b : a))) return avant;
  // Les courses de CE plan : depuis le lendemain du dernier jour du cycle d'avant, soit le
  // samedi précédent pour un plan du lundi au vendredi (les courses du week-end) et le lundi
  // pour un plan de 7 jours. Une clôture plus ancienne servait l'ancien plan.
  const jour = (d: string) => new Date(`${d}T00:00:00`);
  const lundi = jour(dates.reduce((a, b) => (b < a ? b : a)));
  lundi.setDate(lundi.getDate() - positionSemaine(lundi.getDay()));
  const derniere = Math.max(...dates.map((d) => positionSemaine(jour(d).getDay())));
  const debut = new Date(lundi);
  debut.setDate(lundi.getDate() - 7 + derniere + 1);
  if (cloture.getTime() < debut.getTime()) return avant;

  const jours = dates.flatMap((d, i) => (d >= auj ? [i + 1] : []));
  const tranche = (m: M) => m.status === 'eaten' || m.status === 'skipped';
  const meals = plan.meals.filter((m) =>
    jours.includes(m.day) && !(dates[m.day - 1] === auj && tranche(m)));
  return { meals, jours, apresCourses: true };
}
