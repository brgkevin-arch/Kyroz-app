import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BodyFatSource, DietaryRestriction, Goal, MealSlot, MealType,
  NeatLevel, Sex, SportSession, VarietyPreference,
} from './types';

// ── L'INSCRIPTION SURVIT À UNE FERMETURE DE L'APP ─────────────────────────────
//
// 🔴 LE DÉFAUT QUE CE FICHIER FERME, mesuré le 2026-09-01 : l'onboarding ne
// persistait RIEN. Sept étapes — prénom, corps, masse grasse, activité, objectif,
// préférences, repas — et un appel entrant, une bascule d'app ou un manque de
// mémoire renvoyaient au prénom. C'est la seule question de l'audit UX du même jour
// qui ait survécu à la confrontation au code, et ce n'est pas un hasard : elle était
// posée comme une QUESTION (« vérifie sur iOS »), pas comme un constat.
//
// ⚠️ LE BROUILLON EST UNE DONNÉE PERSONNELLE — poids, taille, masse grasse. Il vit
// donc sous `@kyroz:` comme les autres :
//  · il part dans l'export RGPD tout seul (`exportData.ts` balaie `@kyroz:*`) ;
//  · il est effacé par la purge de session tout seul (`CLES_CONSERVEES` est une
//    LISTE BLANCHE — une clé nouvelle est purgée par défaut). Ne jamais l'y ajouter :
//    un brouillon qui survivrait à une déconnexion ferait hériter le compte suivant
//    du corps du précédent. Garde-fou : `onboardingDraft.test.ts`.
//
// ⚠️ ET IL S'EFFACE À LA FIN DU PARCOURS, pas au démarrage suivant : tant que le
// profil n'est pas écrit, le brouillon est la seule copie de ce qui a été saisi.

const KEY = '@kyroz:onboardingDraft';

/**
 * Version de FORME. Un brouillon d'une autre version est jeté sans être lu.
 *
 * ⚠️ À incrémenter dès qu'un champ change de nom, de type ou de sens. Ne PAS
 * l'incrémenter pour un champ simplement ajouté : `analyser` rend les absents à leur
 * valeur initiale, donc un ancien brouillon reste lisible — et le jeter ferait perdre
 * une inscription en cours à chaque mise à jour, ce que ce fichier existe pour éviter.
 */
export const VERSION = 1;

export type OnboardingDraft = {
  step: number;
  firstName: string;
  sex: Sex | null;
  birthDate: string | undefined;
  weight: string;
  height: string;
  bodyFat: number | undefined;
  bodyFatSource: BodyFatSource | undefined;
  sports: SportSession[];
  noSport: boolean;
  goal: Goal | null;
  restrictions: DietaryRestriction[];
  proteins: string[];
  dislikes: string[];
  neat: NeatLevel | null;
  variety: VarietyPreference;
  planWeekdays: number[];
  restWeekdays: number[];
  restTouched: boolean;
  meals: MealType[];
  customSlots: MealSlot[];
};

// ── Les valeurs admises, tenues par `tsc` et non par un test ─────────────────
//
// Un `Record<X, true>` ne compile plus si le type X gagne un membre : c'est la
// discipline déjà employée pour `GOAL_CONFIG` (cf. `lib/types.ts`). Une liste
// littérale, elle, se serait périmée en silence — et un brouillon parfaitement
// valide aurait alors été jeté au motif qu'il contenait une valeur trop récente.
const SEXES: Record<Sex, true> = { male: true, female: true };
const SOURCES: Record<BodyFatSource, true> = { measured: true, estimated: true };
const NEATS: Record<NeatLevel, true> = { desk: true, light: true, active: true, physical: true };
const VARIETES: Record<VarietyPreference, true> = { repetitive: true, balanced: true, max: true };
const REGIMES: Record<DietaryRestriction, true> = {
  vegetarian: true, pescatarian: true, no_pork: true, lactose_free: true,
  gluten_free: true, vegan: true, halal: true,
};
const OBJECTIFS: Record<Goal, true> = {
  cut_aggressive: true, cut: true, recomp: true, maintain: true, lean_bulk: true, bulk: true,
};

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// ⚠️ L'ÉCHEC SE DIT `undefined`, JAMAIS `null`. `null` est une valeur PARFAITEMENT
// VALIDE ici — c'est « pas encore choisi » pour le sexe, l'objectif et le NEAT depuis
// le 2026-09-01. Un validateur qui répondrait `null` pour dire « invalide » rendrait
// donc les trois champs les plus récents indistinguables de leur propre état normal.
const echoue = undefined;

/** Une valeur d'un ensemble fermé, ou `undefined` si elle n'en fait pas partie. */
const dans = <T extends string>(admis: Record<T, true>, v: unknown): T | undefined =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(admis, v) ? (v as T) : echoue;

const chaines = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : echoue;

const entiers = (v: unknown): number[] | undefined =>
  Array.isArray(v) && v.every((x) => Number.isInteger(x)) ? (v as number[]) : echoue;

const texte = (v: unknown): string | undefined => (typeof v === 'string' ? v : echoue);
const booleen = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : echoue);
const nombre = (v: unknown): number | undefined =>
  (typeof v === 'number' && Number.isFinite(v) ? v : echoue);

/** Un enum qui accepte AUSSI « pas encore choisi ». */
const dansOuVide = <T extends string>(admis: Record<T, true>, v: unknown): T | null | undefined =>
  v === null ? null : dans(admis, v);

/**
 * Les collections d'objets (séances, créneaux) sont vérifiées comme ÉTANT des objets,
 * pas champ par champ : leur forme appartient à leurs éditeurs, et la recopier ici en
 * ferait une seconde définition qui dérive. Ce qui compte ici, c'est qu'aucune valeur
 * d'une autre nature n'atteigne un `.map()` d'écran.
 */
const objets = <T>(v: unknown): T[] | undefined =>
  Array.isArray(v) && v.every(estObjet) ? (v as T[]) : echoue;

/**
 * Analyse un brouillon stocké. **Fonction PURE**, donc testable — `AsyncStorage` ne
 * l'est pas, mais la DÉCISION « qu'est-ce qui se relit » l'est, et c'est elle qui
 * porte la garantie (même discipline que `clesAPurger`).
 *
 * 🔴 TOUT OU RIEN. Un champ invalide jette le brouillon ENTIER au lieu de le rendre
 * amputé : un parcours restauré à l'étape 5 avec un objectif retombé à `null` est un
 * état que l'écran ne produit jamais lui-même, et personne ne l'aurait jamais vu à
 * l'essai. Perdre un brouillon corrompu, c'est l'état d'avant ce fichier — pas une
 * régression. En servir un incohérent en serait une.
 *
 * ⚠️ Les champs ABSENTS, eux, ne jettent rien : ils rendent leur valeur initiale. Sans
 * ça, ajouter un champ à l'inscription périmerait tous les brouillons en cours.
 */
export function analyser(raw: string | null, totalEtapes: number): OnboardingDraft | null {
  if (!raw) return null;
  let brut: unknown;
  try { brut = JSON.parse(raw); } catch { return null; }
  if (!estObjet(brut) || brut.v !== VERSION) return null;

  const d = brut as Record<string, unknown>;
  const echec = Symbol('invalide');

  // Un champ ABSENT rend sa valeur initiale ; un champ PRÉSENT mais du mauvais type
  // est un échec, jamais un silence. C'est ce qui permet d'ajouter un champ à
  // l'inscription sans périmer les brouillons en cours.
  const lire = <T>(cle: string, valide: (v: unknown) => T | undefined, initial: T): T | typeof echec => {
    if (d[cle] === undefined) return initial;
    const v = valide(d[cle]);
    return v === undefined ? echec : v;
  };

  // L'étape se BORNE au lieu d'échouer : une étape hors plage ne dit rien sur la
  // validité des réponses, et jeter des réponses saines pour un compteur aberrant
  // serait la punition inverse de ce que ce fichier cherche à éviter.
  const step = typeof d.step === 'number' && Number.isInteger(d.step)
    ? Math.min(Math.max(d.step, 1), totalEtapes)
    : 1;

  const champs = {
    step,
    firstName: lire('firstName', texte, ''),
    sex: lire<Sex | null>('sex', (v) => dansOuVide(SEXES, v), null),
    birthDate: lire<string | undefined>('birthDate', texte, undefined),
    weight: lire('weight', texte, ''),
    height: lire('height', texte, ''),
    bodyFat: lire<number | undefined>('bodyFat', nombre, undefined),
    bodyFatSource: lire<BodyFatSource | undefined>('bodyFatSource', (v) => dans(SOURCES, v), undefined),
    sports: lire<SportSession[]>('sports', objets, []),
    noSport: lire('noSport', booleen, false),
    goal: lire<Goal | null>('goal', (v) => dansOuVide(OBJECTIFS, v), null),
    restrictions: lire<DietaryRestriction[]>('restrictions', (v) => {
      const l = chaines(v);
      return l && l.every((x) => dans(REGIMES, x)) ? (l as DietaryRestriction[]) : echoue;
    }, []),
    proteins: lire('proteins', chaines, [] as string[]),
    dislikes: lire('dislikes', chaines, [] as string[]),
    neat: lire<NeatLevel | null>('neat', (v) => dansOuVide(NEATS, v), null),
    variety: lire<VarietyPreference>('variety', (v) => dans(VARIETES, v), 'balanced'),
    planWeekdays: lire('planWeekdays', entiers, [] as number[]),
    restWeekdays: lire('restWeekdays', entiers, [] as number[]),
    restTouched: lire('restTouched', booleen, false),
    meals: lire<MealType[]>('meals', chaines, ['breakfast', 'lunch', 'dinner', 'snack']),
    customSlots: lire<MealSlot[]>('customSlots', objets, []),
  };

  if (Object.values(champs).some((v) => v === echec)) return null;
  return champs as OnboardingDraft;
}

/** Écrit le brouillon. Silencieux en cas d'échec : perdre une sauvegarde ne doit pas
 *  interrompre une inscription. */
export async function ecrireBrouillon(d: OnboardingDraft): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...d })); } catch {}
}

/** Relit le brouillon posé sur cet appareil, ou `null`. */
export async function lireBrouillon(totalEtapes: number): Promise<OnboardingDraft | null> {
  try { return analyser(await AsyncStorage.getItem(KEY), totalEtapes); } catch { return null; }
}

/** Efface le brouillon — appelé QUAND le profil est écrit, jamais avant. */
export async function effacerBrouillon(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}

/** Exportée pour les garde-fous : la clé ne doit jamais rejoindre `CLES_CONSERVEES`. */
export const CLE_BROUILLON = KEY;
