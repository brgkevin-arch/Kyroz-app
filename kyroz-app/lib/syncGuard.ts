import { MEAL_ORDER, UserProfile, VarietyPreference } from './types';
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

// ── Fusion des deux sèches (2026-07-29) ─────────────────────────────────────
//
// `cut_aggressive` n'est plus proposé par l'UI : mesuré sur 2268 profils, il
// servait exactement les mêmes calories que `cut` (0 % d'écart dès que le %MG est
// déclaré, 1 à 16 kcal/j quand il est estimé — du bruit). Le plancher de sécurité
// absorbait tout l'écart entre −300 et −500 kcal/j. C'était un choix fantôme.
//
// On NORMALISE au chargement plutôt que de laisser un objectif orphelin en base :
// sinon ces comptes gardent à vie un objectif qu'aucun écran ne sait plus afficher
// ni resélectionner — la situation exacte de `macro_mode: 'manual'`, qui traîne
// depuis. Le seul effet mesurable est protéique (2,4 → 2,2 g/kg, soit ~14 g de
// moins compensés en glucides à calories identiques) : les deux valeurs sont dans
// la fourchette de la littérature, et le clamp [1,6 ; 2,6] g/kg de masse maigre
// s'applique de la même façon. Aucune calorie ne bouge, donc aucun ENGINE_REV.
export function normalizeGoal<T extends Partial<UserProfile>>(p: T | null): T | null {
  if (!p || p.goal !== 'cut_aggressive') return p;
  return { ...p, goal: 'cut' };
}

// ── Préférence de variété hors barème (2026-08-02) ──────────────────────────
//
// Trouvé sur le profil du fondateur : `variety: 'high'`. Cette valeur n'a JAMAIS
// existé dans l'énumération — `'repetitive' | 'balanced' | 'max'` est identique
// depuis le commit initial, vérifié dans l'historique. C'est donc une saisie à la
// main (test, édition directe en base), pas un vestige de version.
//
// Ce qu'elle provoquait, en silence et sur deux plans :
//  · le MOTEUR ne reconnaissant ni `repetitive` ni `max`, il retombait sur le
//    comportement « équilibré » — l'utilisateur ne recevait pas ce qu'il croyait ;
//  · l'ÉDITEUR n'affichait AUCUNE carte sélectionnée (`selected={variety === v.value}`
//    ne matchait rien), donc l'écran ne permettait même pas de constater le réglage
//    actif. Un réglage invisible ET inopérant.
//
// Même remède que `normalizeGoal` : on referme au chargement plutôt que de laisser
// une valeur orpheline en base. `'high'` → `'max'` (l'intention est sans ambiguïté :
// c'est le cran de variété le plus haut) ; toute autre valeur inconnue → `'balanced'`,
// qui est déjà le défaut de l'onboarding et ce que le moteur servait de fait.
//
// ⚠️ Ça CHANGE le plan de ces comptes : `variety` entre dans `profileSignature`, donc
// le plan se régénère une fois. C'est voulu — ils recevront enfin le réglage demandé.
// Aucune calorie ne bouge (seule la sélection des recettes change) → pas d'ENGINE_REV.
const VARIETES_VALIDES = new Set<VarietyPreference>(['repetitive', 'balanced', 'max']);
const VARIETES_ALIAS: Record<string, VarietyPreference> = { high: 'max', low: 'repetitive' };

export function normalizeVariety<T extends Partial<UserProfile>>(p: T | null): T | null {
  if (!p || p.variety === undefined) return p;
  if (VARIETES_VALIDES.has(p.variety)) return p;
  return { ...p, variety: VARIETES_ALIAS[String(p.variety)] ?? 'balanced' };
}

// ── `meals` qui n'est pas un tableau (2026-08-02) ───────────────────────────
//
// Trouvé sur le même profil réel, et c'est le plus grave des deux : `meals: 4`,
// un NOMBRE, là où le type annonce `MealType[]`. Conséquences, mesurées à l'écran :
//  · le MOTEUR s'en sortait — `buildLocalPlan` teste `Array.isArray` et retombe sur
//    les 4 repas par défaut. Le plan servi était donc correct, et le défaut invisible.
//  · l'ÉCRAN « Paramètres des repas » CRASHAIT. `useState(profile.meals ?? [...])`
//    ne rattrape rien (`4 ?? x` vaut `4`), puis `meals.includes(...)` lève
//    « meals.includes is not a function » → Error Boundary, écran mort.
// Autrement dit : un réglage que l'utilisateur ne pouvait plus JAMAIS ouvrir, sans
// que rien n'indique pourquoi. C'est ce qui l'empêchait de changer sa variété.
//
// Un nombre est lu comme « je veux N repas » — l'intention est claire, et c'est déjà
// ce que l'écran Profil affichait (« 4 repas »). On prend donc les N premiers de
// `MEAL_ORDER`, ce qui rend EXACTEMENT ce que le moteur servait déjà pour N = 4.
// Toute autre forme inexploitable retombe sur les 4 repas par défaut.
//
// ⚠️ Le repli du moteur (`Array.isArray`) reste en place : c'est lui qui a évité que
// le défaut atteigne les assiettes, et il protège les chemins qui ne passent pas ici.
export function normalizeMeals<T extends Partial<UserProfile>>(p: T | null): T | null {
  if (!p || p.meals === undefined) return p;
  const m = p.meals as unknown;
  if (Array.isArray(m) && m.length > 0 && m.every((x) => MEAL_ORDER.includes(x))) return p;
  const n = typeof m === 'number' && m >= 1 ? Math.min(Math.floor(m), MEAL_ORDER.length) : MEAL_ORDER.length;
  return { ...p, meals: MEAL_ORDER.slice(0, n) };
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
 * ça déplace le TDEE de plusieurs centaines de kcal (1,45 → défaut 1,30 sur un BMR
 * de 1800 = −270 kcal/jour ; c'était −450 avant le relèvement de la table le
 * 2026-07-31). Une ligne cloud antérieure à la migration a la colonne
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

// ── Fusions à l'hydratation (2026-07-30) ─────────────────────────────────────
//
// Avant : les cinq domaines hors profil étaient ÉCRASÉS par le cloud dès qu'il avait
// une ligne non vide. Sur deux appareils, le second à se connecter perdait ses données.
//
// La décision n'est PAS « fusionner partout » — ce serait un contresens sur deux d'entre
// eux. Le critère retenu : **la donnée est-elle un HISTORIQUE (on ajoute, on ne retire
// presque jamais) ou un ÉTAT COURANT (retirer est une action normale) ?**
//
//   • Historique → fusion. Perdre une donnée accumulée est irréversible.
//   • État courant → écrasement CONSERVÉ. Fusionner un état ressusciterait ce que
//     l'utilisateur vient d'enlever, et le retrait ne « prendrait » jamais entre
//     appareils. Sans horodatage par élément ni pierres tombales, une union rend la
//     suppression IMPOSSIBLE — c'est un défaut permanent, là où une perte se répare
//     en refaisant le geste.
//
// D'où : poids, série et recettes perso fusionnent ; favoris et garde-manger non
// (cf. le commentaire de chaque bloc dans sync.ts).
//
// Toutes ces fonctions sont PURES — même contrat que les réconciliateurs ci-dessus.

/**
 * Journal de poids : UNION par date, le LOCAL gagne en cas de collision.
 *
 * C'est un historique cumulatif, de même nature que `low_ea_weeks` — qui est déjà
 * fusionné par union juste au-dessus. Les traiter différemment était l'incohérence :
 * perdre trois mois de pesées parce qu'un second téléphone s'est connecté n'est pas
 * réparable, la courbe de poids est la mémoire du produit.
 *
 * Le local gagne sur une date déjà présente : c'est l'appareil que la personne a en
 * main, donc la valeur la plus probablement corrigée (`upsertEntry` remplace par date).
 *
 * ⚠️ Limite assumée : une pesée SUPPRIMÉE ici mais encore présente au cloud reviendra
 * une fois (pas de pierre tombale). Le geste de correction est à refaire ; c'est un
 * prix très inférieur à la perte de l'historique.
 */
export function mergeWeightEntries(
  cloud: WeightEntryLike[] | null | undefined,
  local: WeightEntryLike[] | null | undefined,
): WeightEntryLike[] {
  const byDate = new Map<string, WeightEntryLike>();
  for (const e of cloud ?? []) if (e?.date) byDate.set(e.date, e);
  for (const e of local ?? []) if (e?.date) byDate.set(e.date, e); // le local écrase
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightEntryLike { date: string; weight_kg: number; note?: string }

/**
 * Série : le record est le MAXIMUM des deux, la série en cours vient de l'appareil dont
 * la dernière activité est la PLUS RÉCENTE.
 *
 * L'écrasement pur pouvait ramener une série de 30 jours à 3 parce qu'un vieux
 * téléphone détenait la ligne cloud. Prendre la dernière activité la plus récente ne
 * peut pas inventer de série : c'est la seule des deux qui décrit le présent. Et le
 * record ne redescend plus, ce qui est sa définition.
 *
 * `freeze_available` (le « bouclier », LOCAL-ONLY) est PRÉSERVÉ : il était effacé à
 * chaque hydratation parce que l'objet était reconstruit avec trois champs.
 */
export function mergeStreak<T extends StreakLike>(cloud: T | null | undefined, local: T | null | undefined): T | null {
  if (!cloud) return local ?? null;
  if (!local) return cloud;
  const recent = (local.last_active_date ?? '') >= (cloud.last_active_date ?? '') ? local : cloud;
  return {
    ...recent,
    current_streak_days: recent.current_streak_days,
    longest_streak_days: Math.max(local.longest_streak_days ?? 0, cloud.longest_streak_days ?? 0),
    last_active_date: recent.last_active_date,
    // Local-only : jamais au cloud, donc jamais écrasable par lui.
    ...(local.freeze_available !== undefined ? { freeze_available: local.freeze_available } : {}),
  };
}

export interface StreakLike {
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string;
  freeze_available?: boolean;
}

/**
 * Recettes personnalisées : UNION par identifiant, le LOCAL gagne.
 *
 * Une recette éditée à la main est du TRAVAIL de l'utilisateur — la perdre parce qu'un
 * autre appareil s'est connecté est le pire des cas. Réinitialiser une recette
 * (retirer sa clé) est en revanche un geste d'un tap : si une réinitialisation faite
 * ailleurs revient une fois, elle se refait. L'asymétrie tranche.
 */
export function mergeRecipeOverrides<T>(
  cloud: Record<string, T> | null | undefined,
  local: Record<string, T> | null | undefined,
): Record<string, T> {
  return { ...(cloud ?? {}), ...(local ?? {}) };
}
