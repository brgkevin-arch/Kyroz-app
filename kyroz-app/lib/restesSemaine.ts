import type { Meal, MealPlan } from './types';
import { mealIngredients, type Reste } from './planEngine';
import { deductIngredients, type PantryItem } from './pantry';
import { refDuNom } from './nomsAliments';
import { poidsUnitaire } from './units';
import { datesDuPlan, joursEcoules } from './semainePlan';
import { dureeDe, tientJusquau } from './dureeDeVie';

/**
 * LES RESTES QUE LA SEMAINE SUIVANTE DOIT REPRENDRE (« niveau 2 », 2026-10-24).
 *
 * Fondateur : *« je veux que l'user ne jette rien »* — et *« il congèle ce qu'il peut, on ne
 * pourra pas tout sauver »*. Quand la semaine suivante se prépare (« Courses terminées »), on
 * sait déjà ce qui restera des paquets à la fin du plan en cours : la réserve moins les repas
 * qu'il reste à cuisiner (le calcul de l'écran Courses). Chaque reste PÉRISSABLE part au moteur
 * avec le dernier jour du plan suivant où il tient encore (`lib/dureeDeVie.ts`) :
 *  · compté depuis le jour des courses, emballage fermé ;
 *  · et depuis le jour où le plan en cours l'a entamé (son premier repas qui s'en sert).
 * Un reste qui ne tiendra pas jusqu'au premier jour du plan suivant n'est PAS visé : il est à
 * congeler (s'il se congèle), et c'est à la personne de le faire.
 *
 * ⚠️ Mesuré, pas supposé : `scripts/mesure-restes.ts`.
 */
export function restesAReprendre(
  reserve: PantryItem[],
  courant: Pick<MealPlan, 'week_start_date' | 'days' | 'meals'>,
  restantes: Meal[],
  achat: string,
  suivante: Pick<MealPlan, 'week_start_date' | 'days'>,
  weekdays: number[] | undefined,
): Map<string, Reste> {
  const out = new Map<string, Reste>();
  const datesSuivante = datesDuPlan(suivante, weekdays);
  if (!datesSuivante) return out;
  const datesCourant = datesDuPlan(courant, weekdays);

  // Ce qui restera à la fin du plan en cours.
  let fin = reserve;
  for (const m of [...restantes].sort((a, b) => a.day - b.day)) {
    if (!m.fixed) fin = deductIngredients(fin, mealIngredients(m));
  }

  for (const it of fin) {
    const ref = refDuNom(it.name);
    const duree = ref ? dureeDe(ref) : undefined;
    if (!ref || !duree) continue;
    const g = it.unit === 'pièce' ? it.quantity * (poidsUnitaire(it.name) ?? 0) : it.quantity;
    if (!(g > 0)) continue;
    const limite = tientJusquau(duree, ouvertLe(ref, courant.meals, datesCourant, achat));
    let jusquAu = 0;
    datesSuivante.forEach((date, i) => {
      const age = joursEcoules(achat, date);
      if (age !== null && age <= limite) jusquAu = i + 1;
    });
    if (jusquAu === 0) continue;
    const deja = out.get(ref);
    out.set(ref, { g: (deja?.g ?? 0) + g, jusquAu: Math.max(deja?.jusquAu ?? 0, jusquAu) });
  }
  return out;
}

/** Le jour (depuis les courses) où le plan en cours entame cet aliment ; `Infinity` s'il ne l'entame pas. */
function ouvertLe(ref: string, meals: Meal[], dates: string[] | null, achat: string): number {
  let premier = Infinity;
  if (!dates) return premier;
  for (const m of meals) {
    const date = dates[m.day - 1];
    const age = date ? joursEcoules(achat, date) : null;
    if (age === null || age < 0 || age >= premier) continue;
    if (mealIngredients(m).some((i) => (i.ref ?? refDuNom(i.name)) === ref)) premier = age;
  }
  return premier;
}
