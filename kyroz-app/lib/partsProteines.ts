/**
 * PARTS DE PROTÉINES PAR RÉGIME — décisions du fondateur du 2026-09-19
 * (`docs/2026-09-19-decision-preferences-proteines.md`).
 *
 * Ce que l'utilisateur coche dans « Protéines préférées » devient une part GARANTIE de ses
 * déjeuners et dîners — pas une exclusion : ce qu'il ne coche pas reste possible, dans la
 * proportion décidée pour « rien coché ». Le petit-déjeuner et la collation ne sont pas
 * concernés.
 *
 * Le moteur (`buildLocalPlan`) demande, à chaque déjeuner ou dîner, quelle sorte est la plus
 * en retard sur sa part (`sorteAViser`) et en fait la DERNIÈRE couche d'exclusion : elle ne
 * s'applique que s'il reste un plat bien calibré (« autant que possible », décision du même
 * jour). Elle passe après toutes les règles existantes (même recette, plafond végétal, plat du
 * midi, féculent du jour, plafond d'ingrédient) : une part ne casse jamais une règle.
 *
 * Ce module est PUR : il ne lit ni le catalogue ni le moteur.
 */
import type { DietaryRestriction, Recipe, UserProfile } from './types';

export type Sorte =
  | 'poulet' | 'bœuf' | 'poisson' | 'porc'
  | 'tofu' | 'tempeh' | 'seitan' | 'légumineuses' | 'pièces végétales' | 'œufs'
  | 'sans poisson';

export const SORTES_REFS: Record<Exclude<Sorte, 'sans poisson'>, readonly string[]> = {
  poulet: ['poulet_filet', 'dinde_escalope'],
  'bœuf': ['boeuf_5', 'boeuf_bavette'],
  poisson: ['cabillaud', 'saumon', 'saumon_fume', 'thon_naturel', 'thon_frais', 'crevettes', 'sardines', 'maquereau'],
  porc: ['porc_filet', 'jambon_blanc'],
  tofu: ['tofu_ferme', 'tofu_fume', 'tofu_soyeux'],
  tempeh: ['tempeh'],
  seitan: ['seitan'],
  'légumineuses': ['lentilles_cuites', 'lentilles_corail', 'pois_chiches_conserve', 'haricots_rouges_conserve',
    'haricots_blancs_conserve', 'haricots_noirs_conserve', 'feves', 'pois_casses', 'edamame'],
  'pièces végétales': ['steak_soja', 'emince_vegetal', 'hache_vegetal', 'galette_vegetale', 'boulette_vegetale',
    'nuggets_vegetal', 'saucisse_vegetale', 'jambon_vegetal', 'filets_poulet_vegetal', 'aiguillettes_poulet_vegetal',
    'chorizo_vegetal', 'lardons_vegetaux', 'merguez_vegetale', 'escalope_vegetale'],
  'œufs': ['oeuf_entier', 'blanc_oeuf'],
};

export type RegimeProteines = 'omnivore' | 'halal' | 'pescetarien' | 'vegetarien' | 'vegan';

/** Le régime qui décide des protéines proposées : le plus restrictif l'emporte. */
export function regimeProteines(restrictions: readonly DietaryRestriction[] = []): RegimeProteines {
  if (restrictions.includes('vegan')) return 'vegan';
  if (restrictions.includes('vegetarian')) return 'vegetarien';
  if (restrictions.includes('pescatarian')) return 'pescetarien';
  if (restrictions.includes('halal') || restrictions.includes('no_pork')) return 'halal';
  return 'omnivore';
}

/**
 * Les protéines que l'écran PROPOSE, régime choisi. « Végétal » chez le pescétarien est un seul
 * choix : ses repas sans poisson (œufs et laitages compris, comme la règle D29 du pescétarien).
 * Le seitan est du blé : il disparaît en sans gluten.
 */
export function sortesProposees(restrictions: readonly DietaryRestriction[] = []): Sorte[] {
  const sansGluten = restrictions.includes('gluten_free');
  const vegetales: Sorte[] = ['tofu', 'tempeh', ...(sansGluten ? [] : ['seitan'] as Sorte[]), 'légumineuses', 'pièces végétales'];
  switch (regimeProteines(restrictions)) {
    case 'omnivore': return ['poulet', 'bœuf', 'poisson', 'porc'];
    case 'halal': return ['poulet', 'bœuf', 'poisson'];
    case 'pescetarien': return ['poisson', 'sans poisson'];
    case 'vegetarien': return [...vegetales, 'œufs'];
    case 'vegan': return vegetales;
  }
}

/** Libellé affiché d'une sorte. */
export const LIBELLE_SORTE: Record<Sorte, string> = {
  poulet: 'Poulet', 'bœuf': 'Bœuf', poisson: 'Poisson', porc: 'Porc', tofu: 'Tofu', tempeh: 'Tempeh',
  seitan: 'Seitan', 'légumineuses': 'Légumineuses', 'pièces végétales': 'Pièces végétales', 'œufs': 'Œufs',
  'sans poisson': 'Végétal',
};

/**
 * Valeur ENREGISTRÉE (`preferred_proteins`) de chaque sorte. Les anciennes valeurs gardent leur
 * orthographe (« poulet », « bœuf », « poisson », « œufs ») ; « végétal » désigne, chez le
 * pescétarien, ses repas sans poisson — c'était déjà sa case.
 */
export const VALEUR_SORTE: Record<Sorte, string> = {
  poulet: 'poulet', 'bœuf': 'bœuf', poisson: 'poisson', porc: 'porc', tofu: 'tofu', tempeh: 'tempeh',
  seitan: 'seitan', 'légumineuses': 'légumineuses', 'pièces végétales': 'pièces végétales', 'œufs': 'œufs',
  'sans poisson': 'végétal',
};

/** Les sortes cochées, restreintes à ce que le régime propose (une valeur périmée ne compte pas). */
export function sortesCochees(profile: Pick<UserProfile, 'dietary_restrictions' | 'preferred_proteins'>): Sorte[] {
  const prefs = new Set(profile.preferred_proteins ?? []);
  return sortesProposees(profile.dietary_restrictions ?? []).filter((s) => prefs.has(VALEUR_SORTE[s]));
}

/** Les sortes d'une recette : celles d'au moins un de ses ingrédients au rôle protéine. */
export function sortesDe(r: Pick<Recipe, 'ingredients'>): Set<Sorte> {
  const refs = r.ingredients.filter((i) => i.macro_role === 'protein' && i.ref).map((i) => i.ref!);
  const out = new Set<Sorte>();
  for (const [s, liste] of Object.entries(SORTES_REFS) as [Exclude<Sorte, 'sans poisson'>, readonly string[]][])
    if (refs.some((x) => liste.includes(x))) out.add(s);
  if (!out.has('poisson')) out.add('sans poisson');
  return out;
}

/** « Rien coché » (décisions du 2026-09-19). */
export const RIEN_COCHE: Partial<Record<RegimeProteines, Partial<Record<Sorte, number>>>> = {
  omnivore: { poulet: 0.40, 'bœuf': 0.30, poisson: 0.20, porc: 0.10 },
  halal: { poulet: 0.45, 'bœuf': 0.35, poisson: 0.20 },
  pescetarien: { poisson: 0.50, 'sans poisson': 0.50 },
};

/** Part des sortes cochées, selon leur nombre. */
export function partDesCochees(regime: RegimeProteines, cochees: readonly Sorte[]): number {
  const n = cochees.length;
  if (regime === 'pescetarien') return n === 1 ? 0.70 : 1;
  if (regime === 'vegetarien' || regime === 'vegan') {
    if (n === 1) return cochees[0] === 'pièces végétales' ? 0.70 : 0.40;
    return n === 2 ? 0.60 : 0.80;
  }
  return n === 1 ? 0.60 : n === 2 ? 0.80 : 0.95;
}

/** Minimum de poisson pour l'omnivore et le halal qui ne l'ont pas coché : 1 repas par semaine. */
export const POISSON_MIN_REPAS = 1;

/** Ce qui n'est attribué à aucune sorte : le moteur choisit librement. */
export const LIBRE = 'libre' as const;
export type Cible = Sorte | typeof LIBRE;

/**
 * Les parts visées des déjeuners et dîners de la semaine, ou `null` quand rien n'est imposé
 * (végétarien et vegan sans rien coché). La somme vaut 1.
 */
export function partsCibles(profile: Pick<UserProfile, 'dietary_restrictions' | 'preferred_proteins'>, repasPrincipaux: number): Map<Cible, number> | null {
  const regime = regimeProteines(profile.dietary_restrictions ?? []);
  const cochees = sortesCochees(profile);
  const parts = new Map<Cible, number>();
  const rien = RIEN_COCHE[regime];
  if (cochees.length === 0) {
    if (!rien) return null;
    for (const [s, p] of Object.entries(rien)) parts.set(s as Sorte, p!);
  } else {
    const part = partDesCochees(regime, cochees);
    for (const s of cochees) parts.set(s, part / cochees.length);
    const reste = 1 - part;
    if (reste > 1e-9) {
      if (rien) {
        // « Le reste réparti selon rien coché », parmi les sortes non cochées.
        const autres = Object.entries(rien).filter(([s]) => !cochees.includes(s as Sorte)) as [Sorte, number][];
        const total = autres.reduce((a, [, p]) => a + p, 0);
        if (total > 0) for (const [s, p] of autres) parts.set(s, reste * (p / total));
        else parts.set(LIBRE, reste);
      } else {
        parts.set(LIBRE, reste);
      }
    }
  }
  // Un repas de poisson par semaine au moins, pris sur les autres parts à proportion.
  if ((regime === 'omnivore' || regime === 'halal') && repasPrincipaux > 0) {
    const min = POISSON_MIN_REPAS / repasPrincipaux;
    const actuel = parts.get('poisson') ?? 0;
    if (actuel < min) {
      const autres = [...parts.entries()].filter(([s]) => s !== 'poisson');
      const total = autres.reduce((a, [, p]) => a + p, 0);
      for (const [s, p] of autres) parts.set(s, p - (min - actuel) * (p / total));
      parts.set('poisson', min);
    }
  }
  return parts;
}

/**
 * La sorte à viser pour le prochain déjeuner ou dîner : la plus en RETARD sur sa part
 * (part × repas faits + 1 − servis). Déterministe : à retard égal, l'ordre de la table.
 */
export function sorteAViser(parts: Map<Cible, number>, servis: Partial<Record<Cible, number>>, faits: number): Cible {
  let meilleure: Cible = LIBRE;
  let retard = -Infinity;
  for (const [s, p] of parts) {
    const r = p * (faits + 1) - (servis[s] ?? 0);
    if (r > retard + 1e-9) { retard = r; meilleure = s; }
  }
  return meilleure;
}

/**
 * Les couches d'exclusion pour ce repas (à placer EN DERNIER). Chez le végétarien et le vegan,
 * une seconde couche sert de roue de secours : si la sorte visée n'a pas de plat propre, on
 * complète en PIÈCES VÉGÉTALES (« s'il n'y a pas assez, il cale des protéines végé »). Sinon,
 * la couche saute et le moteur prend ce qui reste du régime.
 */
export function couchesDeParts(regime: RegimeProteines, cible: Cible): ((r: Recipe) => boolean)[] {
  if (cible === LIBRE) return [];
  const couches: ((r: Recipe) => boolean)[] = [(r) => !sortesDe(r).has(cible)];
  if ((regime === 'vegetarien' || regime === 'vegan') && cible !== 'pièces végétales') {
    couches.push((r) => { const s = sortesDe(r); return !s.has(cible) && !s.has('pièces végétales'); });
  }
  return couches;
}
