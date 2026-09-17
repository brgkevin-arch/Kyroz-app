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
