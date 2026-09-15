import type { DietaryRestriction, UserProfile } from './types';

/**
 * LA CASE « OMNIVORE » ET LA FIN DE « SANS PORC » (décision fondateur du 2026-09-15, D36).
 *
 * Fichier PUR, sans import d'exécution : les deux écrans (inscription, Profil) et le
 * chargement du profil partagent les mêmes règles, et elles se testent en les appelant.
 *
 *  - « Omnivore » s'exclut avec végétarien, vegan et pescétarien : cocher l'un décoche
 *    l'autre. Il se combine avec halal, sans gluten et sans lactose.
 *  - « Sans porc » disparaît des écrans : mesuré le 2026-09-15, halal et sans porc
 *    ouvrent EXACTEMENT les mêmes 524 recettes. Un compte qui l'avait passe en halal à la
 *    lecture, et son plan ne change pas d'une recette.
 */

/** Régimes sans viande : incompatibles avec « Omnivore ». */
export const REGIMES_SANS_VIANDE: readonly DietaryRestriction[] = ['vegetarian', 'vegan', 'pescatarian'];

/** Coche ou décoche un régime, en tenant l'exclusion Omnivore ↔ régimes sans viande. */
export function basculerRegime(liste: readonly DietaryRestriction[], valeur: DietaryRestriction): DietaryRestriction[] {
  if (liste.includes(valeur)) return liste.filter((x) => x !== valeur);
  const sans = valeur === 'omnivore'
    ? liste.filter((x) => !REGIMES_SANS_VIANDE.includes(x))
    : REGIMES_SANS_VIANDE.includes(valeur) ? liste.filter((x) => x !== 'omnivore') : [...liste];
  return [...sans, valeur];
}

/** Referme une liste de régimes lue en base ou sur l'appareil. */
export function normaliserRegimes(liste: readonly DietaryRestriction[]): DietaryRestriction[] {
  const vus: DietaryRestriction[] = [];
  for (const r of liste) {
    const v: DietaryRestriction = r === 'no_pork' ? 'halal' : r;
    if (!vus.includes(v)) vus.push(v);
  }
  // Omnivore ET un régime sans viande : le régime sans viande est l'information la plus
  // prudente, c'est lui qu'on garde.
  return vus.some((x) => REGIMES_SANS_VIANDE.includes(x)) ? vus.filter((x) => x !== 'omnivore') : vus;
}

/** Même forme que les `normalize*` de `syncGuard.ts` : le profil ressort intact s'il n'y a rien à refermer. */
export function normalizeRestrictions<T extends Partial<UserProfile>>(p: T | null): T | null {
  if (!p || !Array.isArray(p.dietary_restrictions)) return p;
  const n = normaliserRegimes(p.dietary_restrictions);
  if (n.length === p.dietary_restrictions.length && n.every((x, i) => x === p.dietary_restrictions![i])) return p;
  return { ...p, dietary_restrictions: n };
}
