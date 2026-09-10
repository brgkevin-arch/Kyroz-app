/**
 * Sonde « la recette explique-t-elle comment faire ? » — partagée par le contrôle
 * (`lib/__tests__/instructionsMuettes.test.ts`) et la mesure (`scripts/mesure-instructions.ts`).
 *
 * Une recette est MUETTE quand elle demande une cuisson et n'en dit RIEN : ni durée,
 * ni température, ni signe de cuisson. « Cuire le riz. » — l'utilisateur qui ne sait pas
 * cuisiner n'a aucun moyen de savoir quand s'arrêter.
 *
 * ⚠️ Deux mesures INDÉPENDANTES se croisent, et c'est le point du dispositif :
 *   - la cuisson est déduite des INGRÉDIENTS (`basis`), jamais du texte. Si elle était
 *     déduite du texte, une recette se blanchirait en supprimant le mot « cuire », et une
 *     réécriture qui ajoute « fais chauffer » s'auto-accuserait.
 *   - le repère est cherché dans le TEXTE. Une durée chiffrée n'est pas la seule réponse
 *     acceptable : « fais griller jusqu'à ce que le pain soit ferme sous le doigt » est un
 *     meilleur repère qu'un chiffre, et les vagues B1-B9 emploient les deux.
 *
 * ⚠️ Ce n'est PAS le nombre d'étapes. Mesuré le 2026-09-09 sur les 512 recettes :
 * l'indicateur « ≤ 2 étapes » accuse 43 assemblages à froid qui sont complets, et rate
 * 62 recettes bavardes mais muettes. La forme n'est pas le contenu.
 */

/**
 * Ingrédients qui IMPOSENT une cuisson. Dérivé de `basis` (dry = pesé sec, raw = pesé cru),
 * moins les exceptions qui se mangent en l'état, plus les œufs (pas de `basis`, mais on ne
 * sert pas un œuf cru).
 */
export const REFS_CRUS_MANGEABLES = ['flocons_avoine']; // muesli, overnight oats, smoothie
export const REFS_CUISSON_SANS_BASIS = ['oeuf_entier', 'blanc_oeuf'];
const CRUS_MANGEABLES = new Set(REFS_CRUS_MANGEABLES);
const CUISSON_SANS_BASIS = new Set(REFS_CUISSON_SANS_BASIS);

type RefIngredient = { basis?: 'dry' | 'raw' };
type RecetteSondable = { ingredients: { ref: string }[]; instructions: string[] };

/** La recette impose-t-elle une cuisson ? Lu sur les INGRÉDIENTS, jamais sur le texte. */
export function cuissonRequise(
  r: RecetteSondable,
  table: Record<string, RefIngredient>,
): boolean {
  return r.ingredients.some((i) => {
    if (CUISSON_SANS_BASIS.has(i.ref)) return true;
    if (CRUS_MANGEABLES.has(i.ref)) return false;
    const b = table[i.ref]?.basis;
    return b === 'dry' || b === 'raw';
  });
}

/**
 * Un repère de cuisson : une durée, une température, ou un signe sensoriel.
 * Les trois se valent — c'est ce qui permet à l'utilisateur de savoir quand s'arrêter.
 */
const REPERES: RegExp[] = [
  // durée chiffrée : « 25 min », « 4-5 min », « 2 h », « 30 secondes », « 1 h 30 »
  /\d+\s*(?:[-–à/]\s*\d+\s*)?(?:min\b|minute|mn\b|h\b|heure|sec\b|seconde)/i,
  // température / four
  /\d+\s*°|thermostat|\bth\.?\s*\d/i,
  // repos long, sans chiffre
  /(?:une|toute la)\s+nuit|la veille/i,
  // signe sensoriel : « jusqu'à ce que », « dès que », « quand elle est »
  /jusqu'à|dès que|d[eè]s qu'|quand (?:il|elle|le|la|les|ça|c'est)/i,
  // état visé nommé directement
  /\bal dente\b|\bdor[ée]e?s?\b|translucide|nacr[ée]e?s?|\bferme sous\b|s'effeuille|croustill|\bfondant/i,
];

/**
 * ⚠️ Les apostrophes sont NORMALISÉES avant la recherche. Le catalogue mélange
 * l'apostrophe droite (0x27, 891 occurrences) et la courbe (0x2019, 24) ; une sonde qui
 * n'en connaîtrait qu'une seule déclarerait muette une recette qui donne son repère,
 * uniquement à cause d'un caractère invisible à l'œil.
 */
const normalise = (s: string) => s.replace(/[‘’ʼ]/g, "'");

/** Le texte donne-t-il au moins un repère de cuisson ? */
export function aUnRepereDeCuisson(r: RecetteSondable): boolean {
  const t = normalise(r.instructions.join(' '));
  return REPERES.some((re) => re.test(t));
}

/** Recette MUETTE = elle impose une cuisson et n'en donne aucun repère. */
export function estMuette(r: RecetteSondable, table: Record<string, RefIngredient>): boolean {
  return cuissonRequise(r, table) && !aUnRepereDeCuisson(r);
}

/** Longueur totale du texte d'instructions, en caractères. */
export function longueurInstructions(r: RecetteSondable): number {
  return r.instructions.reduce((s, i) => s + i.length, 0);
}
