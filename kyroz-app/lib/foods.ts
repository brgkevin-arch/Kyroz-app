import { Food, Ingredient, Macros } from './types';

// ── Base d'aliments (approche A : valeur moyenne par aliment, /100 g) ─────────
//
// Valeurs alignées sur Ciqual (ANSES), pour les formes RÉELLEMENT consommées
// (viandes/féculents/légumineuses = cuits). Set soigné d'aliments courants pour
// la cible (sportifs) — Phase 1. L'import Ciqual complet (~3000) viendra ensuite.
//
// `uncertainty_pct` = incertitude relative de l'énergie selon les marques/sources,
// utilisée plus tard pour la marge honnête du total du jour (Phase 3).

const DEFAULT_UNCERTAINTY_PCT = 10;

// Raccourci de saisie : [nom, kcal, protéines, glucides, lipides, ?incertitude]
type Row = [string, number, number, number, number, number?];

function build(category: Food['category'], prefix: string, rows: Row[]): Food[] {
  return rows.map(([name_fr, kcal, p, c, f, unc], i) => ({
    id: `kyroz-${prefix}-${i + 1}`,
    name_fr,
    category,
    per100g: { kcal, protein_g: p, carbs_g: c, fat_g: f },
    ...(unc != null ? { uncertainty_pct: unc } : {}),
  }));
}

export const FOODS: Food[] = [
  ...build('viande', 'via', [
    ['Blanc de poulet cuit', 165, 31, 0, 3.6],
    ['Cuisse de poulet cuite', 209, 26, 0, 11],
    ['Escalope de dinde cuite', 135, 30, 0, 1],
    ['Steak haché 5% cuit', 170, 26, 0, 7],
    ['Steak haché 15% cuit', 220, 24, 0, 14],
    ['Bavette de bœuf cuite', 200, 28, 0, 9],
    ['Filet de porc cuit', 165, 31, 0, 4],
    ['Jambon blanc', 110, 18, 1, 3.5],
    ['Lardons', 280, 16, 1, 24],
    ['Escalope de veau cuite', 170, 31, 0, 5],
    ['Côte d’agneau cuite', 250, 25, 0, 17],
    ['Saucisse cuite', 290, 16, 2, 24],
    ['Magret de canard cuit', 230, 28, 0, 13],
  ]),
  ...build('poisson', 'poi', [
    ['Saumon cuit', 200, 24, 0, 12],
    ['Thon au naturel (conserve)', 116, 26, 0, 1],
    ['Cabillaud cuit', 90, 20, 0, 1],
    ['Colin / lieu cuit', 90, 19, 0, 1],
    ['Crevettes cuites', 100, 23, 0, 1],
    ['Sardines à l’huile', 220, 25, 0, 13],
    ['Maquereau cuit', 205, 19, 0, 14],
    ['Truite cuite', 140, 21, 0, 6],
    ['Surimi', 95, 8, 13, 1],
  ]),
  ...build('oeuf_laitier', 'lai', [
    ['Œuf entier cuit', 145, 13, 0.7, 10],
    ['Blanc d’œuf', 52, 11, 0.7, 0.2],
    ['Fromage blanc 0%', 47, 8, 4, 0.2],
    ['Fromage blanc 3%', 75, 7.5, 4.5, 3],
    ['Yaourt nature', 60, 4, 5, 3],
    ['Yaourt grec', 100, 9, 4, 5],
    ['Skyr', 63, 11, 4, 0.2],
    ['Petit-suisse', 95, 9, 3, 5],
    ['Lait demi-écrémé', 46, 3.2, 4.8, 1.5],
    ['Mozzarella', 250, 18, 1, 19],
    ['Comté', 410, 27, 0, 34],
    ['Emmental', 380, 28, 0, 30],
    ['Feta', 260, 14, 1, 21],
    ['Parmesan', 400, 36, 0, 28],
    ['Beurre', 750, 0.7, 0.6, 82],
    ['Crème fraîche 30%', 290, 2.4, 3, 30],
    ['Crème légère 15%', 160, 2.6, 3.5, 15],
  ]),
  ...build('legumineuse', 'leg', [
    ['Lentilles vertes cuites', 115, 9, 17, 0.5],
    ['Lentilles corail cuites', 120, 8, 18, 0.5],
    ['Pois chiches cuits', 140, 8, 20, 2.5],
    ['Haricots rouges cuits', 125, 8.5, 20, 0.5],
    ['Haricots blancs cuits', 130, 9, 21, 0.5],
    ['Petits pois cuits', 80, 5, 11, 0.4],
    ['Fèves cuites', 110, 8, 16, 0.6],
    ['Tofu ferme', 120, 13, 2, 7],
    ['Tofu soyeux', 55, 5, 2, 3],
    ['Tempeh', 190, 19, 9, 11],
    ['Edamame', 120, 11, 9, 5],
  ]),
  ...build('feculent', 'fec', [
    ['Riz blanc cuit', 130, 2.5, 28, 0.3],
    ['Riz complet cuit', 120, 2.6, 25, 1],
    ['Pâtes cuites', 130, 5, 26, 1],
    ['Pâtes complètes cuites', 125, 5.5, 24, 1],
    ['Semoule cuite', 110, 3.8, 23, 0.2],
    ['Quinoa cuit', 120, 4.4, 21, 1.9],
    ['Boulgour cuit', 110, 3.8, 23, 0.3],
    ['Pomme de terre cuite', 85, 2, 18, 0.1],
    ['Patate douce cuite', 90, 1.6, 20, 0.1],
    ['Pain complet', 240, 9, 42, 2.5],
    ['Baguette / pain blanc', 270, 9, 55, 1],
    ['Pain de mie', 270, 8, 48, 4],
    ['Flocons d’avoine', 370, 13, 60, 7],
    ['Gnocchi', 160, 4, 32, 1.5],
  ]),
  ...build('legume', 'lgm', [
    ['Brocoli cuit', 35, 2.8, 4, 0.4],
    ['Courgette cuite', 20, 1.2, 3, 0.2],
    ['Tomate', 18, 0.9, 3, 0.2],
    ['Carotte', 35, 0.8, 7, 0.2],
    ['Épinards cuits', 25, 2.7, 1.5, 0.4],
    ['Haricots verts cuits', 30, 1.8, 5, 0.2],
    ['Poivron', 26, 1, 4.6, 0.3],
    ['Champignons', 22, 3, 1, 0.3],
    ['Oignon', 40, 1.2, 8, 0.1],
    ['Salade verte', 15, 1.4, 1.5, 0.2],
    ['Concombre', 12, 0.6, 2, 0.1],
    ['Aubergine cuite', 25, 1, 4.5, 0.2],
    ['Chou-fleur cuit', 30, 2.4, 3, 0.3],
    ['Poireau cuit', 30, 1.5, 5, 0.3],
  ]),
  ...build('fruit', 'fru', [
    ['Banane', 90, 1.1, 20, 0.3],
    ['Pomme', 52, 0.3, 12, 0.2],
    ['Orange', 47, 0.9, 9, 0.1],
    ['Fraises', 33, 0.7, 6, 0.3],
    ['Myrtilles', 57, 0.7, 12, 0.3],
    ['Raisin', 70, 0.6, 16, 0.2],
    ['Ananas', 50, 0.5, 12, 0.1],
    ['Mangue', 60, 0.8, 14, 0.4],
    ['Kiwi', 60, 1.1, 12, 0.5],
    ['Avocat', 160, 2, 2, 15],
    ['Dattes', 280, 2.5, 65, 0.4],
    ['Compote de pomme sans sucre', 45, 0.3, 11, 0.1],
  ]),
  ...build('oleagineux', 'ole', [
    ['Amandes', 600, 21, 8, 50],
    ['Noix', 650, 15, 7, 65],
    ['Noisettes', 630, 15, 7, 61],
    ['Cacahuètes', 590, 25, 10, 49],
    ['Beurre de cacahuète', 600, 25, 12, 50],
    ['Graines de chia', 480, 17, 8, 31],
    ['Graines de courge', 560, 30, 11, 49],
    ['Noix de cajou', 580, 18, 26, 44],
  ]),
  ...build('matiere_grasse', 'mga', [
    ['Huile d’olive', 900, 0, 0, 100],
    ['Huile de colza', 900, 0, 0, 100],
    ['Margarine', 720, 0.2, 1, 80],
  ]),
  ...build('sucre', 'suc', [
    ['Miel', 320, 0.4, 80, 0],
    ['Sucre', 400, 0, 100, 0],
    ['Chocolat noir 70%', 550, 8, 33, 40],
    ['Confiture', 270, 0.5, 66, 0.1],
    ['Sirop d’agave', 310, 0, 76, 0],
  ]),
  ...build('autre', 'aut', [
    ['Whey (poudre)', 380, 80, 8, 6],
    ['Ketchup', 100, 1.2, 24, 0.1],
    ['Sauce soja', 60, 6, 6, 0],
    ['Moutarde', 150, 7, 8, 10],
  ]),
];

// Index par id pour les recherches O(1).
const BY_ID: Map<string, Food> = new Map(FOODS.map((f) => [f.id, f]));

export function findFood(id: string | undefined): Food | undefined {
  return id ? BY_ID.get(id) : undefined;
}

// Normalisation pour la recherche : minuscules, sans accents, sans ligatures.
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/['‘’]/g, '');
}

const NORM_CACHE: Map<string, string> = new Map(FOODS.map((f) => [f.id, normalize(f.name_fr)]));

/**
 * Recherche libre dans la base, insensible aux accents/casse. Classement :
 * préfixe exact > début de mot > sous-chaîne. Renvoie au plus `limit` résultats.
 */
export function searchFoods(query: string, limit = 20): Food[] {
  const q = normalize(query);
  if (!q) return FOODS.slice(0, limit);
  const scored: { food: Food; score: number }[] = [];
  for (const food of FOODS) {
    const name = NORM_CACHE.get(food.id)!;
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (new RegExp(`\\b${escapeRegExp(q)}`).test(name)) score = 1;
    else if (name.includes(q)) score = 2;
    if (score >= 0) scored.push({ food, score });
  }
  scored.sort((a, b) => a.score - b.score || a.food.name_fr.length - b.food.name_fr.length);
  return scored.slice(0, limit).map((x) => x.food);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Macros d'une quantité (g) d'un aliment. */
export function macrosForQuantity(food: Food, quantity_g: number): Macros {
  const k = Math.max(0, quantity_g) / 100;
  return {
    kcal: food.per100g.kcal * k,
    protein_g: food.per100g.protein_g * k,
    carbs_g: food.per100g.carbs_g * k,
    fat_g: food.per100g.fat_g * k,
  };
}

/**
 * Calcule les macros d'une recette À PARTIR de ses ingrédients liés à la base
 * (`food_id`). `matchedRatio` = part de la masse couverte par des aliments connus
 * — < 1 signifie que des ingrédients n'ont pas de food_id (macros incomplètes).
 * Renvoie null si AUCUN ingrédient n'est lié (→ garder les macros manuelles).
 */
export function macrosFromIngredients(
  ingredients: Ingredient[],
): { macros: Macros; matchedRatio: number } | null {
  let matchedG = 0, totalG = 0;
  const sum: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  let any = false;
  for (const ing of ingredients) {
    const g = Math.max(0, ing.quantity_g || 0);
    totalG += g;
    const food = findFood(ing.food_id);
    if (!food) continue;
    any = true;
    matchedG += g;
    const m = macrosForQuantity(food, g);
    sum.kcal += m.kcal; sum.protein_g += m.protein_g; sum.carbs_g += m.carbs_g; sum.fat_g += m.fat_g;
  }
  if (!any) return null;
  return {
    macros: roundMacros(sum),
    matchedRatio: totalG > 0 ? matchedG / totalG : 0,
  };
}

/** Macros PAR PORTION recalculées depuis les ingrédients (÷ portions). */
export function recipeMacrosPerPortion(
  ingredients: Ingredient[],
  portions: number,
): { macros: Macros; matchedRatio: number } | null {
  const res = macrosFromIngredients(ingredients);
  if (!res) return null;
  const p = Math.max(1, portions || 1);
  return {
    macros: roundMacros({
      kcal: res.macros.kcal / p,
      protein_g: res.macros.protein_g / p,
      carbs_g: res.macros.carbs_g / p,
      fat_g: res.macros.fat_g / p,
    }),
    matchedRatio: res.matchedRatio,
  };
}

function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein_g: Math.round(m.protein_g),
    carbs_g: Math.round(m.carbs_g),
    fat_g: Math.round(m.fat_g),
  };
}

export { DEFAULT_UNCERTAINTY_PCT };
