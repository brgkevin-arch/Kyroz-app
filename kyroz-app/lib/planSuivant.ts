import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealPlan, UserProfile } from './types';
import { aligner, doitPreparer, preparer, type SemaineSuivante } from './semaineSuivante';
import { dateLocale } from './semainePlan';

/**
 * Le stockage de la semaine suivante (`lib/semaineSuivante.ts` porte les décisions).
 * LOCAL-ONLY, comme le plan lui-même (CLAUDE.md §3 : le plan n'est pas synchronisé).
 * ⚠️ Sous le préfixe `@kyroz:` : un changement de compte la purge avec le reste
 * (`lib/sessionLocale.ts`), sinon la semaine de A attendrait B.
 */
export const CLE_SEMAINE_SUIVANTE = '@kyroz:planSuivant';
/** Le tirage du plan en cours — la même clé que l'écran Plan (`app/(tabs)/plan.tsx`). */
export const CLE_GRAINE_DU_PLAN = '@kyroz:planSeed';

export async function lireLaSuivante(): Promise<SemaineSuivante | null> {
  try {
    const brut = await AsyncStorage.getItem(CLE_SEMAINE_SUIVANTE);
    const s = brut ? (JSON.parse(brut) as SemaineSuivante) : null;
    return s && s.plan && Array.isArray(s.plan.meals) && Number.isFinite(s.seed) ? s : null;
  } catch { return null; }
}

export async function ecrireLaSuivante(s: SemaineSuivante | null): Promise<void> {
  if (s) await AsyncStorage.setItem(CLE_SEMAINE_SUIVANTE, JSON.stringify(s));
  else await AsyncStorage.removeItem(CLE_SEMAINE_SUIVANTE);
}

/**
 * La semaine suivante telle qu'elle doit être MAINTENANT : remise d'accord avec le profil
 * (une pesée), préparée si les courses de la semaine en cours viennent d'être closes,
 * oubliée si ses jours sont tous passés. Écrit ce qui a changé ; rend `null` s'il n'y en a pas.
 */
export async function assurerLaSuivante(
  profile: UserProfile,
  courant: MealPlan,
  derniereCloture: string | null | undefined,
  maintenant: Date = new Date(),
): Promise<SemaineSuivante | null> {
  const stockee = await lireLaSuivante();
  if (stockee) {
    const alignee = aligner(profile, courant, stockee, dateLocale(maintenant));
    if (alignee !== stockee) await ecrireLaSuivante(alignee);
    if (alignee) return alignee;
  }
  if (!doitPreparer(courant, profile.plan_weekdays, derniereCloture, null, maintenant)) return null;
  const graine = Number.parseInt((await AsyncStorage.getItem(CLE_GRAINE_DU_PLAN)) ?? '0', 10);
  const neuve = preparer(profile, courant, Number.isFinite(graine) && graine >= 0 ? graine : 0, maintenant);
  if (neuve) await ecrireLaSuivante(neuve);
  return neuve;
}
