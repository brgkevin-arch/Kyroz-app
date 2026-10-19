import type { MealPlan, MealSlot, MealType } from './types';
import { heuresLimites, type DebutDuSuivi } from './repasAuto';
import { dateLocale, datesDuPlan, joursEcoules } from './semainePlan';

/**
 * QUAND LE PLAN COMMENCE-T-IL ? (E78, décision fondateur du 2026-10-19)
 *
 * 🔴 LE DÉFAUT MESURÉ. Qui s'inscrivait le soir recevait un plan qui commençait le matin
 * même : à 21 h 45, petit-déjeuner, déjeuner et collation étaient passés, mais affichés
 * « à faire » et ACHETÉS par la première liste — +22 % un lundi, +36 % un mercredi (5,6 kg
 * au lieu de 4,1, onze lignes rien que pour ce soir-là).
 *
 * ➡️ La décision : à la fin de l'inscription, AVANT « C'est prêt », Kyroz demande quand on
 * commence. « Ce soir » (ou « Aujourd'hui ») garde les repas qui restent ; un autre jour fait
 * partir le plan ET la liste de ce jour-là. La question ne se pose qu'une fois, au premier
 * plan : les comptes existants ne voient rien changer.
 *
 * ⚠️ LE DÉBUT EST LE MÊME OBJET QUE `@kyroz:debutSuivi` (lib/repasAuto.ts), pas un second :
 * `{ jour, minutes }` = le jour où l'on commence et, ce jour-là, l'heure à partir de
 * laquelle les repas comptent (0 = la journée entière). L'auto-coche s'en servait déjà pour
 * ne jamais cocher un repas passé avant le premier plan ; deux dates de début auraient fini
 * par se contredire.
 * ⚠️ Un repas « avant le début » est un repas dont l'heure LIMITE (début du créneau suivant
 * + une heure, `heuresLimites`) était passée : la même règle que l'auto-coche. À 21 h 45,
 * avec un dîner à 20 h, le dîner reste — il n'est pas échu avant 23 h 59.
 *
 * Fonctions PURES : l'écran leur passe l'heure, elles ne la lisent jamais.
 */

export type { DebutDuSuivi as DebutDuPlan };

function minutesDe(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
  'septembre', 'octobre', 'novembre', 'décembre'];

/** « jeudi 23 octobre ». */
export function dateEnLettres(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  return `${JOURS[d.getDay()]} ${j} ${MOIS[m - 1]}`;
}

/** À partir de cette heure, « Aujourd'hui » se dit « Ce soir ». */
export const HEURE_DU_SOIR = 17;

export interface OptionDebut {
  /** Le début qu'enregistre ce choix. */
  debut: DebutDuSuivi;
  /** « Ce soir », « Demain », « Samedi 25 ». */
  libelle: string;
  /** « Il reste le dîner », « jeudi 23 octobre ». */
  detail: string;
}

/**
 * « dîner », « collation et dîner ». Sans article, à dessein : un créneau peut être créé par
 * l'utilisateur (« Shaker post-training »), et son genre ne se devine pas.
 */
function enumerer(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? '';
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Les créneaux du jour encore à venir à `minutes` : ceux dont l'heure limite n'est pas
 * passée. Triés par heure.
 */
export function creneauxRestants(slots: readonly MealSlot[], minutes: number): MealSlot[] {
  const limites = heuresLimites(slots);
  return [...slots]
    .sort((a, b) => (a.hour * 60 + (a.minute ?? 0)) - (b.hour * 60 + (b.minute ?? 0)))
    .filter((s) => (limites.get(s.id) ?? 0) > minutes);
}

/**
 * Les choix proposés, dans l'ordre : aujourd'hui (s'il reste un repas et que c'est un jour
 * du plan), puis chaque jour du plan des 7 prochains jours. Le premier jour à venir s'appelle
 * « Demain » quand c'est demain.
 * `weekdays` : les jours du plan (`getDay`, 0 = dimanche), déjà limités au nombre de jours
 * du plan. Vide = pas de question (comptes d'avant les jours choisis : on ne sait pas dater).
 */
export function optionsDeDebut(
  maintenant: Date,
  slots: readonly MealSlot[],
  weekdays: readonly number[] | undefined,
  libelleDe: (s: MealSlot) => string = (s) => s.label,
): OptionDebut[] {
  if (!weekdays || weekdays.length === 0 || slots.length === 0) return [];
  const out: OptionDebut[] = [];
  const minutes = minutesDe(maintenant);
  if (weekdays.includes(maintenant.getDay())) {
    const restants = creneauxRestants(slots, minutes);
    if (restants.length > 0) {
      out.push({
        debut: { jour: dateLocale(maintenant), minutes },
        libelle: maintenant.getHours() >= HEURE_DU_SOIR ? 'Ce soir' : 'Aujourd’hui',
        detail: `Encore au menu : ${enumerer(restants.map((s) => minuscule(libelleDe(s))))}`,
      });
    }
  }
  for (let i = 1; i <= 7; i++) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i);
    if (!weekdays.includes(d.getDay())) continue;
    const jour = dateLocale(d);
    const nom = JOURS[d.getDay()];
    out.push({
      debut: { jour, minutes: 0 },
      libelle: i === 1 ? 'Demain' : `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${d.getDate()}`,
      detail: dateEnLettres(jour),
    });
  }
  return out;
}

/**
 * La `week_start_date` d'un plan dont le début est `debut`. Un début À VENIR fait partir la
 * semaine du plan de ce jour-là — c'est ce qui fait suivre, sans rien d'autre, la liste de
 * courses (`joursAAcheter`), les dates du bandeau et le renouvellement (`datesDuPlan`).
 * Un début passé ou du jour ne change rien : la semaine part de la génération, comme avant.
 */
export function semaineDuDebut(generation: string, debut: DebutDuSuivi | null): string {
  if (!debut) return generation;
  const ecart = joursEcoules(generation, debut.jour);
  return ecart !== null && ecart > 0 ? debut.jour : generation;
}

type RepasDate = { day: number; meal_type: MealType };

/**
 * Ce repas tombe-t-il AVANT le début du plan ? Oui s'il est d'un jour antérieur au début,
 * ou du jour du début avec une heure limite déjà passée au moment du choix.
 * ⚠️ `debut` est OBLIGATOIRE (même `null`) : un garde-fou optionnel disparaît chez
 * l'appelant qui l'oublie. ⚠️ Sans date (pas de `plan_weekdays`), rien n'est écarté.
 */
export function avantLeDebut(
  m: RepasDate,
  dates: readonly string[] | null,
  debut: DebutDuSuivi | null,
  limites: Map<MealType, number>,
): boolean {
  if (!debut || !dates) return false;
  const date = dates[m.day - 1];
  if (!date) return false;
  if (date < debut.jour) return true;
  if (date > debut.jour) return false;
  return debut.minutes > 0 && (limites.get(m.meal_type) ?? Infinity) <= debut.minutes;
}

/** Les repas du plan à partir du début : ce que l'écran montre et ce que la liste achète. */
export function repasDepuisLeDebut<M extends RepasDate>(
  plan: Pick<MealPlan, 'week_start_date' | 'days'> & { meals: M[] },
  weekdays: number[] | undefined,
  debut: DebutDuSuivi | null,
  slots: readonly MealSlot[],
): M[] {
  if (!debut) return plan.meals;
  const dates = datesDuPlan(plan, weekdays);
  const limites = heuresLimites(slots);
  return plan.meals.filter((m) => !avantLeDebut(m, dates, debut, limites));
}

/** Ce que « C'est prêt » dit du début : « Tu commences ce soir. », « … jeudi 23 octobre. » */
export function debutEnClair(debut: DebutDuSuivi, aujourdHui: string): string {
  const ecart = joursEcoules(aujourdHui, debut.jour);
  if (ecart === 0) return debut.minutes >= HEURE_DU_SOIR * 60 ? 'Tu commences ce soir.' : 'Tu commences aujourd’hui.';
  if (ecart === 1) return 'Tu commences demain.';
  return `Tu commences ${dateEnLettres(debut.jour)}.`;
}

/** Aujourd'hui (`YYYY-MM-DD`) tombe-t-il avant le début ? L'auto-coche n'y touche à rien. */
export function avantLeJourDuDebut(aujourdHui: string, debut: DebutDuSuivi | null): boolean {
  return !!debut && aujourdHui < debut.jour;
}
