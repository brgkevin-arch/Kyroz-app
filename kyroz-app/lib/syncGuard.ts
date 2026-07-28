import { UserProfile } from './types';
import { totalSessionsPerWeek } from './sport';
import { readLowEaRegistry } from './safety';

// Garde-fou anti-écrasement du profil (problème C) — logique PURE, sans aucune
// dépendance runtime (Supabase / AsyncStorage), donc testable isolément.
//
// Le profil pilote TOUT (macros, plan). Aujourd'hui l'hydratation à la connexion
// fait « le cloud gagne toujours » : si une ligne existe au cloud, elle écrase le
// local sans comparaison. Couplé à un push qui peut échouer en silence (schéma
// désaligné → { error } ignoré), ça transforme un simple conflit en PERTE SÈCHE :
// édition locale → push rejeté → cloud périmé → prochaine hydratation écrase le
// local frais. Le garde-fou : tant que le local n'est pas CONFIRMÉ poussé (dirty),
// le cloud n'a pas le droit de l'écraser.

export const PROFILE_PENDING_KEY = '@kyroz:profilePending';

export type ProfileHydrationAction = 'keep_local' | 'pull_cloud' | 'push_local' | 'noop';

// Décision d'hydratation du profil à la connexion :
//  - keep_local : local non confirmé poussé (dirty) → NE PAS écraser, le (re)pousser ;
//  - pull_cloud : le cloud fait foi → écraser le local (réinstall / multi-appareils) ;
//  - push_local : cloud vide, local présent → pousser le local ;
//  - noop       : rien des deux côtés.
export function decideProfileHydration(a: {
  hasCloud: boolean;
  hasLocal: boolean;
  localDirty: boolean;
}): ProfileHydrationAction {
  if (a.hasLocal && a.localDirty) return 'keep_local'; // ← garde-fou : le local non synchronisé gagne
  if (a.hasCloud) return 'pull_cloud';
  if (a.hasLocal) return 'push_local';
  return 'noop';
}

// ── Cohérence sports ↔ training_days_per_week (fix P3.3 « TDEE qui saute ») ────
//
// `sports` (séances détaillées → TDEE précis par MET) et `training_days_per_week`
// (compteur → repli legacy par multiplicateur) encodent la MÊME info deux fois.
// `calculateTDEE` choisit sa méthode selon `sports` : rempli → MET, vide → legacy.
// S'ils DIVERGENT (ex. `sports` perdu au round-trip cloud, compteur > 0), la
// méthode bascule en silence → le TDEE de maintenance saute sans rien à l'écran.
// On rend les deux INCAPABLES de diverger, `sports` faisant FOI.

const hasSports = (p: any): boolean => Array.isArray(p?.sports) && p.sports.length > 0;

// `sports` = source de vérité : s'il est renseigné, on en DÉRIVE toujours le
// compteur de séances → les deux entrées d'activité ne peuvent plus se contredire,
// donc la méthode de calcul du TDEE ne bascule plus toute seule. À appliquer à
// CHAQUE chargement de profil (hydratation cloud + lecture locale).
// NB : `sports` vide + compteur > 0 est laissé TEL QUEL — c'est le profil legacy
// légitime (jamais eu de séances détaillées), pas la divergence qu'on corrige.
export function normalizeProfileActivity<T extends Partial<UserProfile>>(p: T | null): T | null {
  if (!p || !hasSports(p)) return p;
  const derived = totalSessionsPerWeek(p.sports);
  if (p.training_days_per_week === derived) return p;
  return { ...p, training_days_per_week: derived };
}

// À l'hydratation « pull_cloud » : un `sports` absent/vide côté cloud (ligne
// ancienne ou partielle) NE DOIT PAS effacer un `sports` local renseigné. Champ
// absent = « pas d'info », ≠ « zéro séance » : c'est précisément cette perte qui
// faisait sauter le TDEE. On préserve alors les séances locales dans le profil tiré.
export function reconcileCloudSports<T extends Partial<UserProfile>>(
  cloud: T,
  local: Partial<UserProfile> | null
): T {
  if (!hasSports(cloud) && hasSports(local)) {
    return { ...cloud, sports: local!.sports };
  }
  return cloud;
}

/**
 * Même classe de problème que `sports`, pour le niveau d'activité quotidienne.
 *
 * `neat_level` multiplie le BMR : le perdre ne dégrade pas un détail d'affichage,
 * ça déplace le TDEE de plusieurs centaines de kcal (1,45 → défaut 1,20 sur un BMR
 * de 1800 = −450 kcal/jour). Une ligne cloud antérieure à la migration a la colonne
 * absente ou NULL ; « absent » veut dire « pas d'info », pas « bureau ».
 */
export function reconcileCloudNeat<T extends Partial<UserProfile>>(
  cloud: T,
  local: Partial<UserProfile> | null
): T {
  if (!cloud?.neat_level && local?.neat_level) {
    return { ...cloud, neat_level: local.neat_level };
  }
  return cloud;
}

/**
 * Même classe de problème que `sports`, pour le registre d'énergie disponible basse.
 *
 * `low_ea_weeks` est, avec `sports`, le SEUL champ CUMULATIF du profil : tous les
 * autres sont des réglages que l'utilisateur peut ressaisir, celui-là est un
 * historique d'exposition sur 12 mois qui ne peut PAS être reconstruit. Une ligne
 * cloud antérieure à la migration (colonne NULL) écrasait 22 semaines d'historique
 * local — soit ~210 kcal/jour de protection RED-S perdus d'un coup, et 12 nouvelles
 * semaines à accumuler avant que le plancher ne recommence à remonter.
 *
 * On fusionne par UNION plutôt que « le local gagne » : sur deux appareils, chacun
 * détient une partie de l'exposition réelle. Perdre une semaine vécue est une
 * dégradation de sécurité ; en compter une deux fois est impossible (ce sont des
 * dates, dédupliquées par le Set).
 */
export function reconcileCloudLowEaWeeks<T extends Partial<UserProfile>>(
  cloud: T,
  local: Partial<UserProfile> | null
): T {
  const a = readLowEaRegistry(cloud?.low_ea_weeks);
  const b = readLowEaRegistry(local?.low_ea_weeks);
  if (!b.weeks.length && !b.since) return cloud;

  const weeks = [...new Set([...a.weeks, ...b.weeks])].sort();
  // `since` : on garde la PLUS ANCIENNE des deux dates. Chaque appareil ne connaît
  // que l'exposition qu'il a vue commencer ; retenir la plus récente amputerait le
  // rattrapage de tout l'intervalle antérieur. Même arbitrage que l'union des
  // semaines : perdre de l'exposition réelle est une dégradation de sécurité, en
  // compter deux fois est impossible (ce sont des dates, dédupliquées).
  const since = a.since && b.since ? (a.since < b.since ? a.since : b.since) : (a.since ?? b.since);

  if (weeks.length === a.weeks.length && since === a.since) return cloud;
  return { ...cloud, low_ea_weeks: { weeks, since } };
}
