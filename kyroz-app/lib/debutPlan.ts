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
 * commence. « Ce soir » (ou « Aujourd'hui ») garde les repas qui restent ; un autre jour de la
 * semaine, ou le premier jour du plan de la semaine suivante, fait partir le plan ET la liste
 * de ce jour-là (choix resserrés le 2026-10-23, `optionsDeDebut`). La question ne se pose
 * qu'une fois, au premier plan : les comptes existants ne voient rien changer.
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
  /** « Ce soir », « Demain », « Samedi 25 », « La semaine prochaine ». */
  libelle: string;
  /** « Il reste ton dîner » pour aujourd'hui, la date pour la semaine prochaine ; vide pour un jour de cette semaine. */
  detail: string;
  /** Où l'écran le range : la carte d'aujourd'hui, la grille « Un autre jour », la dernière carte. */
  groupe: 'aujourdhui' | 'semaine' | 'suivante';
}

/**
 * « dîner », « collation et dîner ». Sans article : `avecPossessif` le pose avant.
 */
function enumerer(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? '';
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Le genre des noms de repas courants, pour « ton dîner », « ta collation ». */
const POSSESSIF: Record<string, 'ton' | 'ta'> = {
  'petit-dej': 'ton', 'petit-dejeuner': 'ton', dejeuner: 'ton', diner: 'ton', collation: 'ta',
  gouter: 'ton', souper: 'ton', brunch: 'ton', snack: 'ton', shaker: 'ton', 'casse-croute': 'ton',
};

/**
 * « ton dîner », « ta collation ». Un créneau créé par l'utilisateur (« Pause du matin ») a un
 * genre qu'on ne devine pas : devant une voyelle « ton » vaut pour les deux (« ton encas »,
 * « ton envie ») ; sinon son nom passe entre guillemets, sans article, plutôt qu'avec le mauvais.
 */
function avecPossessif(libelle: string): string {
  const n = libelle.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const possessif = POSSESSIF[n] ?? (/^[aeiouy]/.test(n) ? 'ton' : null);
  return possessif ? `${possessif} ${minuscule(libelle.trim())}` : `«\u00A0${libelle.trim()}\u00A0»`;
}

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

const LUNDI = 1;
const enMajuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Les choix proposés (décision fondateur du 2026-10-23, sur capture de la redite « Lundi 26 /
 * lundi 26 octobre ») :
 *  - **aujourd'hui**, s'il reste un repas et que c'est un jour du plan — « Il reste ton dîner » ;
 *  - **un autre jour de CETTE semaine** (jusqu'au dimanche), au choix, sans sous-titre : le nom
 *    du jour suffit, la date en dessous le répétait ;
 *  - **la semaine prochaine** : son premier jour du plan, daté en sous-titre.
 * Le premier jour à venir s'appelle « Demain » quand c'est demain.
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
        detail: `Il reste ${enumerer(restants.map((s) => avecPossessif(libelleDe(s))))}`,
        groupe: 'aujourdhui',
      });
    }
  }
  const jourDans = (i: number) => new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i);
  // Cette semaine : de demain à dimanche.
  let i = 1;
  for (; jourDans(i).getDay() !== LUNDI; i++) {
    const d = jourDans(i);
    if (!weekdays.includes(d.getDay())) continue;
    out.push({
      debut: { jour: dateLocale(d), minutes: 0 },
      libelle: i === 1 ? 'Demain' : `${enMajuscule(JOURS[d.getDay()])} ${d.getDate()}`,
      detail: '',
      groupe: 'semaine',
    });
  }
  // La semaine prochaine : son premier jour du plan.
  for (let k = i; k < i + 7; k++) {
    const d = jourDans(k);
    if (!weekdays.includes(d.getDay())) continue;
    const jour = dateLocale(d);
    out.push({ debut: { jour, minutes: 0 }, libelle: 'La semaine prochaine', detail: enMajuscule(dateEnLettres(jour)), groupe: 'suivante' });
    break;
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
