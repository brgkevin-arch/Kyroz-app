import { MacroMode, Sex, UserProfile } from './types';

// ── Ce qu'un profil doit PORTER pour qu'un plan puisse exister ───────────────
//
// 🔴 UNE LIGNE CLOUD PARTIELLE PRODUISAIT UN PLAN ENTIÈREMENT NaN (constat 02-02, P0).
// Une ligne `profiles` où seul `sex` est posé passait la garde d'hydratation
// (`hasCloud: !!(row && row.sex)`) et sortait `NaN` sur le TDEE, la cible, le plancher
// et les trois macros — **en émettant quand même `LOW_EA_WARNING`**, donc en prétendant
// avoir conclu. Aucune colonne de `profiles` n'est `NOT NULL` hors `id`, et
// `handle_new_user` n'insère que `(id, email)` : la ligne est atteignable.
//
// 🔴 **ET LA RECO PUBLIÉE — « une garde d'exhaustivité : les quatre champs du BMR » —
// N'AURAIT FERMÉ QU'UN CINQUIÈME DU TROU.** Balayage des 41 colonnes synchronisées, une
// par une à NULL, sur le moteur réel (`npm run mesure:incomplet`) :
//
//   sex          → NaN partout                          🔴 l'échec SE VOIT
//   weight_kg    → 1500 kcal, 0 g de protéines           🔴 absurde, mais FINI
//   height_cm    → 1500 kcal, 191 g                      🔴 absurde, mais FINI
//   macro_mode   → 0 g de protéines, tout en glucides     🔴 absent de la reco
//                  (ou, sur un profil déjà rempli : les cibles GÈLENT — le moteur
//                   cesse de recalculer et sert des nombres périmés, +534 kcal ici)
//   age          → 2339 au lieu de 2079                  ⚠️ PLAUSIBLE, et faux de 260
//   les 36 autres → aucun effet
//
// ➡️ Trois conséquences, et aucune n'est dans la reco :
//  1. **une garde « pas de NaN » n'aurait attrapé que `sex`** — quatre champs sur cinq
//     produisent un nombre fini, donc servable, donc invisible ;
//  2. **`macro_mode` manque à la liste des quatre**, et c'est celui dont l'échec est le
//     plus silencieux : `null` fait passer le moteur en mode « manuel », où il n'a plus
//     rien à recalculer ;
//  3. `age` à NULL vaut `age = 0` par coercition : Mifflin-St Jeor rend `5 × age` de
//     trop. Le nombre est plausible — c'est ce qui le rend pire que `NaN`.
//
// ⚠️ **LA LIGNE DE PARTAGE EST « MESURE OU INTENTION », PAS « CASSE OU PAS ».**
// On peut replier une intention, jamais une mesure :
//  · `goal` et `macro_mode` disent ce que la personne VEUT. Un repli sur `maintain` /
//    `auto` est un choix par défaut, discutable mais honnête — c'est ce que
//    `normalizeGoal` fait déjà depuis 02-03 ;
//  · `sex`, `age`, `weight_kg`, `height_cm` disent ce que son CORPS EST. Il n'existe
//    aucune valeur par défaut pour un corps. Inventer un poids, c'est servir un plan
//    à quelqu'un d'autre — exactement le reproche du constat 01-01 par un autre chemin.
//
// ⚠️ ET CE MODULE VIT DANS `lib/` PARCE QUE LA SUITE NE COUVRE QUE `lib/__tests__/**`.
// Même motif que `syncGuard.ts` et `profileBoot.ts` : la décision sort du runtime pour
// devenir mesurable, sinon la garantie n'est qu'une phrase de commentaire.

/** Les champs qui décrivent le CORPS. Aucun n'a de repli — un corps ne s'invente pas. */
export const CHAMPS_MESURES = ['sex', 'age', 'weight_kg', 'height_cm'] as const;
export type ChampMesure = (typeof CHAMPS_MESURES)[number];

const SEXES: readonly string[] = ['male', 'female'];
const MACRO_MODES: readonly string[] = ['auto', 'percent', 'manual'];

/**
 * Un nombre exploitable : fini et strictement positif.
 *
 * ⚠️ `> 0` et non `!= null` : `weight_kg: 0` passe toutes les gardes de présence et
 * produit pourtant 1500 kcal et zéro protéine, comme `null`. C'est le même défaut, et
 * une garde qui ne teste que la présence le laisse passer.
 */
const nombreUtile = (v: unknown): boolean =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * Les champs de corps qui MANQUENT, nommés. Liste vide = le plan peut se calculer.
 *
 * Rend les NOMS et pas un booléen : l'écran doit pouvoir dire quoi demander, et un
 * journal doit pouvoir dire quelle colonne manquait — « profil incomplet » sans le
 * champ est le genre de message qui ne se diagnostique jamais.
 */
export function champsMesuresManquants(p: Partial<UserProfile> | null | undefined): ChampMesure[] {
  if (!p) return [...CHAMPS_MESURES];
  const out: ChampMesure[] = [];
  if (typeof p.sex !== 'string' || !SEXES.includes(p.sex)) out.push('sex');
  if (!nombreUtile(p.age)) out.push('age');
  if (!nombreUtile(p.weight_kg)) out.push('weight_kg');
  if (!nombreUtile(p.height_cm)) out.push('height_cm');
  return out;
}

/** Le moteur peut-il produire un plan à partir de ce profil ? */
export function profilCalculable(p: Partial<UserProfile> | null | undefined): boolean {
  return champsMesuresManquants(p).length === 0;
}

/**
 * Referme `macro_mode` — une INTENTION, donc repliable (contrairement au corps).
 *
 * ⚠️ Le repli est `'auto'` et pas `'manual'` : `manual` fait CESSER le recalcul, donc
 * une valeur illisible y gèlerait les cibles pour toujours. `auto` remet la personne
 * sur le moteur, c'est-à-dire à l'endroit d'où l'on peut encore corriger.
 */
export const MACRO_MODE_FALLBACK: MacroMode = 'auto';

export function normalizeMacroMode<T extends Partial<UserProfile>>(p: T | null): T | null {
  if (!p) return p;
  return typeof p.macro_mode === 'string' && MACRO_MODES.includes(p.macro_mode)
    ? p
    : { ...p, macro_mode: MACRO_MODE_FALLBACK };
}

/**
 * Une LIGNE CLOUD brute porte-t-elle assez pour qu'on l'hydrate ?
 *
 * ⚠️ C'est ce que `hasCloud` testait en ne regardant QUE `row.sex` — la garde exacte
 * qui laissait passer la ligne du constat. Elle vit ici, en fonction PURE, pour la
 * même raison que le reste du module : dans `sync.ts` elle n'est pas testable.
 *
 * ⚠️ Une ligne REFUSÉE n'est pas une ligne perdue. `decideProfileHydration` bascule
 * alors sur `push_local` (le local complet gagne et repart au cloud) ou `noop`
 * (personne n'a rien → onboarding). Refuser, ici, c'est envoyer quelqu'un finir son
 * inscription — pas lui effacer quoi que ce soit.
 */
export function ligneCloudExploitable(row: unknown): boolean {
  return profilCalculable(row as Partial<UserProfile> | null);
}
