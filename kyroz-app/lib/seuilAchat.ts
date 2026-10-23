import { RAW_RECIPES, RECIPE_INGREDIENTS } from './recipeData';
import { refDuNom, isStaple } from './pantry';

/**
 * SOUS QUELLE QUANTITÉ UNE LIGNE DE COURSES NE VAUT PAS UN ACHAT (E75, décisions fondateur
 * du 2026-10-19 et du 2026-10-20).
 *
 * 🔴 LE DÉFAUT. Depuis le format vendu (58ᵉ OTA), la liste dit le paquet : « 1 pot de 250 g ·
 * il t'en faut 5 g ». Le fondateur : *« 5 g est négligeable, aucun intérêt de faire acheter un
 * pot ; pareil pour 10 g »*. Et les petits restes reviennent chaque semaine, une fois la
 * réserve déduite : 5 g de cabillaud, 10 g d'oignon, 25 ml de lait.
 *
 * ➡️ LA RÈGLE, tranchée en trois temps :
 *   · sous le seuil, la ligne DISPARAÎT, comme le sel (choix A) ;
 *   · seuil = **20 % d'une portion habituelle, jamais moins de 10 g** — *« personne n'est à
 *     10 g près »*, et *« 30 g de pesto, c'est un repas »* : un seuil égal à une portion
 *     entière effaçait un repas, un dixième de portion faisait acheter un paquet pour 5 g ;
 *   · **au plus 15 g pour ce qui porte la protéine du plat** (2026-10-20) : au pire ~3 g de
 *     protéines manquent sur un repas.
 * ⚠️ La recette n'est PAS adaptée au manque (écarté le 2026-10-20) : 15 g de poulet de moins,
 * c'est ~18 kcal, sous la tolérance de 100 kcal par jour du moteur (`ON_TARGET_TOLERANCE_KCAL`).
 *
 * ⚠️ Les seuils se CALCULENT sur le catalogue, ils ne sont pas recopiés : *portion habituelle*
 * = la médiane de l'aliment dans les recettes, *rôle* = celui qu'il y tient le plus souvent
 * (`macro_role`). Une refonte des recettes les fait suivre. Le tableau relu par le fondateur
 * (`docs/2026-10-19-seuils-par-aliment.md`) est GÉNÉRÉ depuis ce fichier.
 */

/** Part d'une portion habituelle sous laquelle un reste ne vaut pas un achat. */
export const PART_DE_PORTION = 0.2;
/** Jamais moins : 5 g ou 10 g de n'importe quoi ne valent pas un paquet. */
export const SEUIL_MIN = 10;
/** Jamais plus pour ce qui porte la protéine du plat. */
export const SEUIL_MAX_PROTEINE = 15;

/**
 * Rôle corrigé à la main là où le catalogue trompe : les merguez végétales sont classées
 * « matière grasse », ce sont des pièces de protéine.
 */
const PROTEINE_FORCEE = new Set(['merguez_vegetale']);

const arrondi5 = (x: number) => 5 * Math.round(x / 5);

function mediane(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface SeuilAliment {
  /** Médiane de l'aliment dans les recettes du catalogue. */
  portion: number;
  /** Le rôle qu'il tient le plus souvent (`macro_role`), corrigé par `PROTEINE_FORCEE`. */
  role: string;
  /** Il reste à acheter au plus ce seuil → la ligne disparaît. */
  seuil: number;
}

function calculer(): Record<string, SeuilAliment> {
  const qtys: Record<string, number[]> = {};
  const roles: Record<string, Record<string, number>> = {};
  for (const r of RAW_RECIPES) {
    for (const i of r.ingredients) {
      (qtys[i.ref] ??= []).push(i.qty);
      const c = (roles[i.ref] ??= {});
      c[i.macro_role] = (c[i.macro_role] ?? 0) + 1;
    }
  }
  const out: Record<string, SeuilAliment> = {};
  for (const ref of Object.keys(qtys)) {
    const portion = mediane(qtys[ref]);
    const compte = roles[ref];
    const dominant = Object.keys(compte).reduce((a, b) => (compte[b] > compte[a] ? b : a));
    const role = PROTEINE_FORCEE.has(ref) ? 'protein' : dominant;
    const brut = Math.max(SEUIL_MIN, arrondi5(PART_DE_PORTION * portion));
    out[ref] = { portion, role, seuil: role === 'protein' ? Math.min(SEUIL_MAX_PROTEINE, brut) : brut };
  }
  return out;
}

/** Les seuils de tous les ingrédients du catalogue, par `ref`. */
export const SEUILS: Record<string, SeuilAliment> = calculer();

type Article = { name: string; quantity: number; unit: string; manuel?: boolean };

/**
 * Cette ligne de la liste générée est-elle sous son seuil, donc à cacher ?
 * ⚠️ Jamais un ajout manuel (la personne a écrit ce qu'elle veut acheter), jamais un aliment
 * hors catalogue (aucune portion connue), jamais une unité qui ne correspond pas.
 */
export function sousLeSeuil(article: Article): boolean {
  if (article.manuel || isStaple(article.name)) return false;
  const ref = refDuNom(article.name);
  const s = ref ? SEUILS[ref] : undefined;
  return !!s && RECIPE_INGREDIENTS[ref!]?.unit === article.unit && article.quantity > 0 && article.quantity <= s.seuil;
}
