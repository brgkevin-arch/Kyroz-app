import type { MealPlan } from './types';

/**
 * QUAND LA SEMAINE SERVIE EST RÉVOLUE (défaut constaté pendant D30, corrigé le 2026-09-17).
 *
 * 🔴 **Le plan ne se renouvelait JAMAIS tout seul.** Mesuré le 2026-09-17 : rien dans le
 * moteur ni dans l'écran ne regardait `week_start_date`. La seule péremption était
 * `resetTracking`, au changement de JOUR, et elle n'efface que le suivi — pas les repas.
 * Quelqu'un qui n'ouvrait pas Kyroz pendant dix jours retrouvait donc exactement la même
 * semaine de menus, sans un mot pour l'expliquer.
 *
 * ⚠️ **La règle est « le plan a été entièrement vécu », pas « on est lundi ».** Un plan
 * de 5 jours commencé un mercredi ne se périme pas le dimanche parce qu'un calendrier le
 * dit : il se périme quand ses 5 jours sont passés. Caler sur la semaine civile ferait
 * expirer un plan de deux jours chez qui s'inscrit le samedi.
 *
 * ⚠️ **Fonction PURE, et c'est ce qui la rend testable** : l'écran lui passe la date du
 * jour, elle ne la lit jamais elle-même. Même discipline que `lib/repasAuto.ts`.
 */

/** Jours entiers écoulés entre deux dates locales `YYYY-MM-DD`. `null` si l'une est illisible. */
export function joursEcoules(depuis: string, aujourdHui: string): number | null {
  const lire = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const a = lire(depuis);
  const b = lire(aujourdHui);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Ce plan a-t-il été vécu en entier, donc mérite-t-il d'être renouvelé ?
 *
 * ⚠️ Une date illisible ou dans le FUTUR rend `false` : on ne jette pas la semaine de
 * quelqu'un sur une donnée qu'on ne comprend pas (un fuseau qui recule, une horloge
 * remise à l'heure). Le pire cas est alors l'état d'avant ce fichier, jamais pire.
 */
export function semaineEcoulee(plan: Pick<MealPlan, 'week_start_date' | 'days'>, aujourdHui: string): boolean {
  const jours = joursEcoules(plan.week_start_date, aujourdHui);
  if (jours === null) return false;
  return jours >= Math.max(1, Math.min(plan.days, 7));
}
