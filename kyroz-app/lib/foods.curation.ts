import { Food } from './types';

// ── Couche de curation Kyroz par-dessus la base Ciqual ────────────────────────
//
// `foods.generated.ts` = COPIE CONFORME des données ANSES, recrachée par le script
// Python (scripts/convert-ciqual.py). On ne l'édite JAMAIS à la main : la prochaine
// régénération écraserait tout. Toute personnalisation vit ICI — ce fichier survit
// aux régénérations et s'édite à la main.
//
// Licence Ouverte 2.0 (Etalab) : la modification est autorisée, MAIS on ne dénature
// pas les données ANSES. On garde donc les valeurs officielles attribuées à l'ANSES,
// et nos ajouts/corrections sont marqués `source: 'kyroz'` (ids `kyroz-*` pour les
// ajouts) pour rester honnêtes sur la provenance.
//
// 👉 Pour curer : ajoute/retire simplement des lignes dans les listes ci-dessous.

/** Type d'une correction de macros (les champs absents gardent la valeur Ciqual). */
export interface FoodOverride {
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  category?: string;
}

export interface CurationConfig {
  /** Groupes Ciqual entièrement masqués (hors-sujet pour l'app). */
  hiddenCategories: string[];
  /** Aliments masqués par motif de nom (bruit de recherche). */
  hiddenPatterns: RegExp[];
  /** Aliments masqués un par un (par id). */
  hiddenIds: string[];
  /** Renommage d'affichage uniquement — ne touche PAS aux macros. */
  renames: Record<string, string>;
  /** Corrections de macros (la valeur devient `source: 'kyroz'`). */
  overrides: Record<string, FoodOverride>;
  /** Aliments ABSENTS de Ciqual, ajoutés par Kyroz. */
  extraFoods: Food[];
}

export const DEFAULT_CURATION: CurationConfig = {
  hiddenCategories: [
    'aliments infantiles', // laits 1er âge, petits pots, etc. — hors-sujet
  ],

  hiddenPatterns: [
    /pour b[ée]b[ée]/i,
    /nourrisson/i,
    /\bnectar\b/i, // « Nectar de banane/mangue… » : boissons sucrées peu utiles
  ],

  hiddenIds: [
    // ex. 'ciqual-53100', // Banane plantain crue — décommente pour la masquer
  ],

  renames: {
    'ciqual-13005': 'Banane', // « Banane, chair sans peau, crue » → nom courant
  },

  overrides: {
    // ex. 'ciqual-XXXXX': { kcal: 95 }, // une correction Kyroz (devient source 'kyroz')
  },

  extraFoods: [
    {
      id: 'kyroz-whey',
      name_fr: 'Whey (poudre, neutre/vanille)',
      category: 'produits laitiers',
      per100g: { kcal: 380, protein_g: 80, carbs_g: 8, fat_g: 6 },
      source: 'kyroz',
    },
    {
      id: 'kyroz-skyr',
      name_fr: 'Skyr nature',
      category: 'produits laitiers',
      per100g: { kcal: 63, protein_g: 11, carbs_g: 4, fat_g: 0.2 },
      source: 'kyroz',
    },
  ],
};

/**
 * Applique la curation à une base d'aliments :
 *  1. masque (catégories, motifs, ids) ;
 *  2. renomme (libellé) et corrige (overrides → `source: 'kyroz'`) ce qui reste ;
 *  3. ajoute les aliments Kyroz.
 * Pure (aucun effet de bord) → testable. `cfg` injectable pour les tests.
 */
export function applyCuration(base: Food[], cfg: CurationConfig = DEFAULT_CURATION): Food[] {
  const out: Food[] = [];
  for (const f of base) {
    if (cfg.hiddenCategories.includes(f.category)) continue;
    if (cfg.hiddenIds.includes(f.id)) continue;
    if (cfg.hiddenPatterns.some((re) => re.test(f.name_fr))) continue;

    let food = f;
    const rename = cfg.renames[f.id];
    if (rename) food = { ...food, name_fr: rename };

    const ov = cfg.overrides[f.id];
    if (ov) {
      food = {
        ...food,
        source: 'kyroz',
        category: ov.category ?? food.category,
        per100g: {
          kcal: ov.kcal ?? food.per100g.kcal,
          protein_g: ov.protein_g ?? food.per100g.protein_g,
          carbs_g: ov.carbs_g ?? food.per100g.carbs_g,
          fat_g: ov.fat_g ?? food.per100g.fat_g,
        },
      };
    }
    out.push(food);
  }
  return [...out, ...cfg.extraFoods];
}
