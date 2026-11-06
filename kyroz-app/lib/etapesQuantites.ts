/**
 * LA QUANTITÉ DANS L'ÉTAPE (2026-11-06, segment 9, P4, décision fondateur) : « Fais cuire les
 * pâtes… » obligeait à remonter aux ingrédients en pleine cuisine pour savoir combien. Chaque
 * ingrédient reçoit sa quantité entre parenthèses à sa PREMIÈRE mention dans les étapes :
 * « Fais cuire les pâtes (75 g)… ». Une seule fois — la répéter à chaque mention noierait le texte.
 *
 * Ce fichier n'importe rien : la mise en forme de la quantité lui est passée (`formater`).
 * ⚠️ Un ingrédient que le texte ne nomme pas n'est pas forcé dans une étape : il reste lisible
 * dans la liste des ingrédients, et un ajout au mauvais endroit tromperait davantage.
 */

export interface IngredientDEtape { name: string; quantity_g: number; unit?: string }

/**
 * Minuscules, sans accents, apostrophe droite — caractère pour caractère, pour que les positions
 * trouvées restent celles du texte d'origine (« Pâtes » et « pâtes », « l’huile » et « l'huile »).
 */
function plat(s: string): string {
  return Array.from(s).map((c) => (c === '’' ? "'" : c.toLowerCase().normalize('NFD').charAt(0))).join('');
}

/** Les façons dont l'étape peut nommer l'ingrédient, de la plus précise à la plus courte. */
function formes(nom: string): string[] {
  const sansParentheses = nom.replace(/\s*\([^)]*\)/g, '').trim();
  // Les débuts du nom, du plus long au plus court : « fromage blanc » passe avant « fromage »,
  // sinon la quantité tomberait au milieu (« au fromage (190 g) blanc »).
  const mots = sansParentheses.split(/\s+/);
  const debuts = mots.map((_, k) => mots.slice(0, mots.length - k).join(' '));
  // « Filet de poulet » se dit « le poulet », « Purée de sésame (tahini) » se dit « le tahini ».
  const apresDe = sansParentheses.match(/\sde\s(.+)$/)?.[1] ?? '';
  const entre = nom.match(/\(([^)/]+)\)/)?.[1] ?? '';
  return [...new Set([...debuts, apresDe, entre])].filter((f) => f.length >= 3).map(plat);
}

/** Où insérer la quantité : juste après le mot (pluriel compris, « tomates » pour « Tomate »), ou `-1`. */
function finDeMention(texte: string, nom: string): number {
  const bas = plat(texte);
  for (const f of formes(nom)) {
    // Chaque mot peut porter son pluriel : « pomme de terre » → « pommes de terre ».
    const motif = f.split(/\s+/).map((m) => `${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[sx]?`).join('\\s+');
    const m = new RegExp(`(?<![a-z0-9])${motif}(?![a-z0-9])`).exec(bas);
    if (m) return m.index + m[0].length;
  }
  return -1;
}

/**
 * Les étapes, avec la quantité de chaque ingrédient à sa première mention.
 * `formater` rend « 75 g », « ¾ tomate »… ; une chaîne vide ne s'insère pas.
 */
export function etapesAvecQuantites(
  etapes: readonly string[],
  ingredients: readonly IngredientDEtape[],
  formater: (i: IngredientDEtape) => string,
): string[] {
  const out = [...etapes];
  for (const ing of ingredients) {
    const q = formater(ing);
    if (!q || !(ing.quantity_g > 0)) continue;
    for (let k = 0; k < out.length; k++) {
      const fin = finDeMention(out[k], ing.name);
      if (fin < 0) continue;
      out[k] = `${out[k].slice(0, fin)} (${q})${out[k].slice(fin)}`;
      break;
    }
  }
  return out;
}
