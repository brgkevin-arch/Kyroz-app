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
 * dit : il se périme quand ses 5 jours sont passés.
 * ➡️ Amendé le 2026-10-04 : « ses jours sont passés » se lit sur leurs DATES (`datesDuPlan`
 * plus bas), plus en comptant N jours depuis la génération — ce compte ne valait que pour
 * un plan généré le jour de son premier jour.
 *
 * ⚠️ **Fonction PURE, et c'est ce qui la rend testable** : l'écran lui passe la date du
 * jour, elle ne la lit jamais elle-même. Même discipline que `lib/repasAuto.ts`.
 */

/** Date locale `YYYY-MM-DD` → minuit local, ou `null` si elle est illisible. */
function lireDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date locale `YYYY-MM-DD` d'un instant. */
export function dateLocale(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Jours entiers écoulés entre deux dates locales `YYYY-MM-DD`. `null` si l'une est illisible. */
export function joursEcoules(depuis: string, aujourdHui: string): number | null {
  const a = lireDate(depuis);
  const b = lireDate(aujourdHui);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Jour de semaine (0 = dimanche) d'une date locale `YYYY-MM-DD`, ou `null` si illisible. */
export function jourDeSemaine(date: string): number | null {
  return lireDate(date)?.getDay() ?? null;
}

/** Position dans la semaine FRANÇAISE : lundi = 0 … dimanche = 6 (comme l'écran Plan). */
export function positionSemaine(jourDeSemaine0Dimanche: number): number {
  return jourDeSemaine0Dimanche === 0 ? 6 : jourDeSemaine0Dimanche - 1;
}

// ── LA VRAIE DATE DE CHAQUE JOUR DU PLAN (décision fondateur, 2026-10-04) ──────────────
//
// 🔴 LE DÉFAUT MESURÉ. Quatre endroits avaient chacun leur idée de « la semaine du plan » :
// les dates du bandeau (la semaine civile en cours), le jour d'ouverture (le prochain jour
// à venir), le renouvellement (N jours après la génération) et la liste de courses (le jour
// de génération). Ils ne s'accordaient que pour un plan généré le jour de son premier jour.
// Un plan du lundi au vendredi généré un DIMANCHE — on prépare sa semaine le dimanche —
// affichait les dates de la semaine passée, se régénérait le VENDREDI matin (cinq jours
// après), après les courses, et F9 ne jouait plus (deux articles déjà achetés revenaient
// le lundi soir, mesuré au navigateur sur une semaine vécue du dimanche au vendredi).
//
// ➡️ La règle : la semaine du plan est celle de sa génération, SAUF quand il n'y reste
// aucun jour du plan (plan du lundi au vendredi généré le samedi ou le dimanche) — c'est
// alors la semaine qui vient. Le fondateur l'avait dit pour le jeudi (2026-09-17 : « son
// plan génère la semaine mais la liste de courses se génère sur le jeudi ») ; le week-end
// n'avait pas de semaine restante, d'où ce choix.
// ⚠️ `plan_weekdays` porte des `getDay` (0 = dimanche) : c'est la POSITION dans la semaine
// qui date un jour, jamais son rang dans le tableau.

/**
 * La date locale `YYYY-MM-DD` de chaque jour du plan (index 0 = jour 1).
 * `null` quand on ne sait pas dater : pas de `plan_weekdays` (comptes d'avant les jours
 * choisis) ou date de génération illisible. Les appelants gardent alors leur repli.
 */
export function datesDuPlan(
  plan: Pick<MealPlan, 'week_start_date' | 'days'>,
  weekdays: number[] | undefined,
): string[] | null {
  if (!weekdays || weekdays.length === 0) return null;
  const generation = lireDate(plan.week_start_date);
  if (!generation) return null;
  const actifs = weekdays.slice(0, Math.max(0, plan.days));
  if (actifs.length === 0) return null;
  const posGeneration = positionSemaine(generation.getDay());
  const lundi = new Date(generation);
  lundi.setDate(generation.getDate() - posGeneration);
  if (!actifs.some((wd) => positionSemaine(wd) >= posGeneration)) lundi.setDate(lundi.getDate() + 7);
  return actifs.map((wd) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + positionSemaine(wd));
    return dateLocale(d);
  });
}

/**
 * Ce plan a-t-il été vécu en entier, donc mérite-t-il d'être renouvelé ?
 * Oui le lendemain de son DERNIER jour daté : un plan du lundi au vendredi se renouvelle
 * le samedi (les courses du week-end se font sur la semaine qui vient), un plan de 7 jours
 * le lundi — plus jamais au milieu d'une semaine déjà achetée.
 *
 * ⚠️ `weekdays` est OBLIGATOIRE (même `undefined`) : sans lui on retombe sur le compte de
 * N jours, et un appelant qui l'oublierait rendrait le défaut du 2026-10-04 sans un mot.
 * ⚠️ Une date illisible ou dans le FUTUR rend `false` : on ne jette pas la semaine de
 * quelqu'un sur une donnée qu'on ne comprend pas (un fuseau qui recule, une horloge
 * remise à l'heure). Le pire cas est alors l'état d'avant ce fichier, jamais pire.
 */
export function semaineEcoulee(
  plan: Pick<MealPlan, 'week_start_date' | 'days'>,
  aujourdHui: string,
  weekdays: number[] | undefined,
): boolean {
  const ecoules = joursEcoules(plan.week_start_date, aujourdHui);
  if (ecoules === null || ecoules < 0) return false;
  const dates = datesDuPlan(plan, weekdays);
  if (dates) return aujourdHui > dates.reduce((a, b) => (b > a ? b : a));
  // Repli (comptes sans jours choisis) : leur plan commence le jour de sa génération.
  return ecoules >= Math.max(1, Math.min(plan.days, 7));
}
