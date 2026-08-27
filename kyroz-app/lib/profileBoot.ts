import { UserProfile } from './types';
import { champsMesuresManquants, normalizeMacroMode } from './profilComplet';
import {
  normalizeCalorieBank, normalizeGoal, normalizeMeals, normalizeMealSlots,
  normalizeProfileActivity, normalizeVariety,
} from './syncGuard';

// ── La lecture du profil au démarrage — et pourquoi elle vit ICI ─────────────
//
// 🔴 CE CHEMIN POUVAIT FIGER L'APP DÉFINITIVEMENT (constat 02-03, 2026-08-27).
//
// `ProfileProvider` lisait AsyncStorage, normalisait, puis recalculait — le tout dans
// un `.then()` SANS `.catch()`. Deux appels de cette chaîne peuvent lever :
//
//   · `JSON.parse(raw)`      — stockage corrompu ;
//   · `recalcProfile(stored)` — une valeur hors barème dans le profil. C'était le cas
//     de `goal` : colonne `text` sans contrainte, `GOAL_CONFIG[p.goal]` rendait
//     `undefined`, et `undefined.kcalDelta` levait (refermé depuis, des deux côtés —
//     `syncGuard::normalizeGoal` et `tdee::goalConfig`).
//
// La levée sautait `setLoading(false)`. `app/index.tsx` fait `if (!ready || loading)
// return <Splash />` : l'app restait sur l'écran de démarrage. Et comme la valeur
// fautive est relue d'AsyncStorage à CHAQUE lancement, redémarrer ne réparait rien.
// Pas de crash, pas de message, pas d'issue — sauf une réinstallation, qui perd les
// données locales. Une app qui ne s'ouvre plus jamais.
//
// ⚠️ Refermer `goal` ne suffisait pas : ça ferme une porte dans une pièce sans murs.
// Le prochain champ hors barème refigerait tout à l'identique (02-02 est encore
// ouvert sur les quatre champs du BMR). C'est le MÉCANISME qui devait être rattrapé.
//
// ⚠️ ET C'EST POUR ÇA QUE CETTE FONCTION EST DANS `lib/`. La suite de tests ne couvre
// que `lib/__tests__/**` — `hooks/` n'est pas testé, il n'y a ni testing-library ni
// runtime React. Laissée dans le hook, la garantie « l'app s'ouvre quoi qu'il arrive »
// aurait été une phrase de commentaire que rien ne compte : exactement la forme de
// garde-fou décoratif que le contre-audit a passé un lot entier à retirer. Même motif
// que `syncGuard.ts` en son temps — la décision sort du runtime pour être mesurable.

/** Ce que le démarrage a pu tirer du stockage — sans jamais lever. */
export type ProfilBoot = {
  /** Le profil à SERVIR. `null` = rien d'exploitable → onboarding. */
  profile: UserProfile | null;
  /**
   * Le profil tel qu'il sortait du stockage, avant recalcul.
   *
   * L'appelant s'en sert pour décider s'il réécrit : on ne réécrit QUE si le recalcul
   * a réellement changé quelque chose (un démarrage ne doit pas marquer le profil
   * « dirty » pour rien). `null` quand la lecture a échoué — donc un profil illisible
   * n'est jamais écrasé par sa propre lecture ratée.
   */
  stored: UserProfile | null;
  /** À journaliser. `null` = rien à signaler. */
  warn: string | null;
  /**
   * `true` quand le recalcul a échoué et qu'on sert le profil stocké tel quel.
   *
   * Ça veut dire que le plancher de sécurité RÉTROACTIF (P0.1) n'a pas été appliqué ce
   * coup-ci. C'est un cran moins bon que le profil recalculé, et très largement
   * préférable à une app qui ne démarre pas. L'appelant ne doit pas réécrire dans cet
   * état : le profil servi n'est pas le produit du moteur.
   */
  degraded: boolean;
};

/**
 * Lit, normalise et recale le profil stocké — **sans jamais lever**.
 *
 * ⚠️ `recalc` est un paramètre REQUIS, pas optionnel, et ce n'est pas une commodité de
 * test : un garde-fou qu'on peut omettre disparaît chez le premier appelant qui
 * l'oublie. Il est injecté parce que c'est le seul moyen de faire ROUGIR la branche
 * dégradée — depuis que `goal` est refermé, aucune donnée réelle ne fait lever
 * `recalcProfile`, donc un test qui ne peut pas forcer la levée ne prouverait rien.
 */
export function bootProfile(
  raw: string | null,
  recalc: (p: UserProfile) => UserProfile,
): ProfilBoot {
  let stored: UserProfile | null = null;
  try {
    stored = raw
      ? normalizeCalorieBank(normalizeMeals(normalizeMealSlots(normalizeVariety(
          normalizeMacroMode(normalizeGoal(normalizeProfileActivity(JSON.parse(raw))))))))
      : null;
  } catch (e) {
    return {
      profile: null, stored: null, degraded: false,
      warn: `profil local ILLISIBLE — traité comme absent, et NON écrasé : ${String(e)}`,
    };
  }

  if (!stored) return { profile: null, stored: null, warn: null, degraded: false };

  // ── Un profil sans CORPS ne se sert pas (constat 02-02, P0) ───────────────
  //
  // 🔴 `app/index.tsx` route sur la seule EXISTENCE du profil : `profile ? plan :
  // onboarding`. Un profil présent mais amputé de son poids ou de son sexe partait donc
  // vers l'écran Plan, qui affichait `NaN` — ou pire, 1500 kcal et zéro gramme de
  // protéines, qui ne se voient pas.
  //
  // ⚠️ **REFUSER DE SERVIR N'EST PAS EFFACER.** `stored` ressort intact, donc l'appelant
  // ne réécrit rien, et rien n'est purgé : favoris, pesées, réserve et série survivent.
  // La personne repasse par l'inscription, qui est exactement l'endroit où l'on redemande
  // un poids et une taille. C'est la seule destination qui a un sens : il n'existe aucune
  // valeur par défaut pour un corps.
  const manquants = champsMesuresManquants(stored);
  if (manquants.length) {
    return {
      profile: null, stored, degraded: false,
      warn: `profil local INCOMPLET — champs de corps manquants : ${manquants.join(', ')}. `
        + 'Non servi (et NON écrasé) : le moteur ne peut pas produire de plan sans corps.',
    };
  }

  try {
    return { profile: recalc(stored), stored, warn: null, degraded: false };
  } catch (e) {
    return {
      profile: stored, stored, degraded: true,
      warn: `recalcul du profil IMPOSSIBLE — le profil stocké est servi tel quel `
        + `(plancher rétroactif NON appliqué) : ${String(e)}`,
    };
  }
}
