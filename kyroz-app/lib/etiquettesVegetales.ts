import type { Food } from './types';

// ── ALIMENTS VÉGÉTAUX ABSENTS DE CIQUAL — la liste Kyroz, sourcée sur ÉTIQUETTES ──
//
// Décision fondateur du 2026-09-14 : « on fait une liste à côté de Ciqual pour
// développer des aliments qui ne sont pas dedans ». Même règle que les pièces végétales
// du 2026-09-10 : la valeur est une MOYENNE DU MARCHÉ, jamais la promesse d'une marque.
// Là où l'ANSES publie l'aliment moyen (nuggets, steak, haché, émincés, boulettes,
// saucisses, falafels, tofu, tempeh), c'est lui qui sert, mappé dans `recipeFoodMap`.
// Ici ne vivent que les produits que Ciqual n'a pas.
//
// ⚠️ LE CHIFFRE NE S'ÉCRIT PAS À LA MAIN. La table du catalogue
// (`Recette/recettes-kyroz.json`) et la recherche d'aliments (`foods.curation.ts`)
// portent la MOYENNE des étiquettes ci-dessous, et `alimentsVegetaux.test.ts` le vérifie.
// Changer un chiffre, c'est ajouter ou corriger une étiquette, pas retoucher la moyenne.
//
// ⚠️ UNE ÉTIQUETTE DÉCRIT UN PRODUIT DU COMMERCE, qui peut changer de recette. Relevé le
// 2026-09-14 : pages produit citées (Open Food Facts lu comme reproduction de
// l'étiquette d'UN produit précis, identifié par son code-barres ; ou site de la marque).
//
// ⚠️ LE GLUTEN SE LIT SUR LES ÉTIQUETTES, avec la prudence de `recipeDiet` : un seul
// produit au blé, ou qui déclare des traces de gluten, retire le sans gluten à l'aliment
// entier. Un faux négatif retire une recette ; un faux positif sert du gluten à un
// cœliaque.
//
// ℹ️ Toutes les versions sont gardées, végétariennes comme véganes (décision fondateur :
// « un végan vérifiera avant d'acheter »). Aucune étiquette relevée ne contient d'œuf ni
// de lait comme ingrédient.

export interface Etiquette {
  marque: string;
  produit: string;
  /** Page d'où les valeurs ont été relevées. */
  source: string;
  kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
  fibres: number;
  /** Blé ou gluten dans la liste d'ingrédients. */
  ble: boolean;
  /** Soja dans la liste d'ingrédients. */
  soja: boolean;
  /** « Peut contenir des traces de gluten » déclaré. */
  tracesGluten: boolean;
}

export interface AlimentVegetal {
  ref: string;
  nom: string;
  /** Groupe d'aliments, au sens Ciqual (sert à la recherche et au rangement). */
  categorie: string;
  /** Plafond de quantité dans une recette (même rôle que les pièces Ciqual). */
  absMaxQty: number;
  etiquettes: Etiquette[];
  /** Produits trouvés et NON retenus, avec la raison — pour qu'on ne les rajoute pas au jugé. */
  ecartes?: { produit: string; raison: string }[];
}

const OFF = (code: string) => `https://fr.openfoodfacts.org/produit/${code}`;
const VIANDES = 'viandes, oeufs, poissons';

export const ALIMENTS_VEGETAUX: AlimentVegetal[] = [
  {
    ref: 'filets_poulet_vegetal', nom: 'Filets de poulet végétal', categorie: VIANDES, absMaxQty: 180,
    etiquettes: [
      { marque: 'Heura', produit: 'Suprême de protéine végétale (180 g)', source: OFF('8436615850303'),
        kcal: 158, proteines: 20, glucides: 0.9, lipides: 7.8, fibres: 1.4, ble: false, soja: true, tracesGluten: false },
    ],
    ecartes: [
      { produit: 'HappyVore, suprêmes panés végétaux', raison: 'filet PANÉ au blé : c’est une escalope, pas un filet nature' },
    ],
  },
  {
    ref: 'aiguillettes_poulet_vegetal', nom: 'Aiguillettes de poulet végétal', categorie: VIANDES, absMaxQty: 180,
    etiquettes: [
      { marque: 'HappyVore', produit: 'Aiguillettes végétales et gourmandes (150 g)', source: OFF('3770016162029'),
        kcal: 158, proteines: 21, glucides: 1.4, lipides: 6.5, fibres: 6, ble: false, soja: true, tracesGluten: true },
      { marque: 'HappyVore', produit: 'Aiguillettes végétales au piment d’Espelette (150 g)', source: OFF('0374446162067'),
        kcal: 138, proteines: 19, glucides: 3, lipides: 3.9, fibres: 6.4, ble: false, soja: true, tracesGluten: true },
    ],
  },
  {
    ref: 'lardons_vegetaux', nom: 'Lardons végétaux', categorie: VIANDES, absMaxQty: 100,
    etiquettes: [
      { marque: 'La Vie', produit: 'Lardons végétaux nature (2 × 75 g)', source: OFF('3770018078021'),
        kcal: 218, proteines: 15, glucides: 7.5, lipides: 15, fibres: 3.2, ble: false, soja: true, tracesGluten: true },
      { marque: 'La Vie', produit: 'Lardons végétaux fumés (2 × 75 g)', source: OFF('3770018078038'),
        kcal: 218, proteines: 15, glucides: 4.3, lipides: 15, fibres: 3.2, ble: false, soja: true, tracesGluten: true },
    ],
  },
  {
    ref: 'merguez_vegetale', nom: 'Merguez végétales', categorie: VIANDES, absMaxQty: 200,
    etiquettes: [
      { marque: 'HappyVore', produit: 'Merguez végétales et piquantes', source: 'https://happyvore.com/en/products/merguez-vegetales',
        kcal: 220, proteines: 12, glucides: 4.8, lipides: 16, fibres: 6.1, ble: false, soja: false, tracesGluten: true },
      { marque: 'Accro', produit: 'Merguez 100 % végétales (200 g)', source: OFF('3770018934747'),
        kcal: 237, proteines: 15, glucides: 6, lipides: 16, fibres: 4.6, ble: true, soja: false, tracesGluten: false },
      { marque: 'Garden Gourmet', produit: 'Merguez végétale soja (180 g)', source: OFF('8445291070769'),
        kcal: 210, proteines: 11.8, glucides: 3, lipides: 15.3, fibres: 6.4, ble: true, soja: true, tracesGluten: false },
      { marque: 'Carrefour', produit: 'Végétal merguez (200 g)', source: OFF('3560071534349'),
        kcal: 229, proteines: 14, glucides: 6, lipides: 16, fibres: 4.6, ble: true, soja: false, tracesGluten: false },
    ],
  },
  {
    ref: 'chorizo_vegetal', nom: 'Chorizo végétal', categorie: VIANDES, absMaxQty: 100,
    etiquettes: [
      { marque: 'HappyVore', produit: 'Chorizo végétal & gourmand, tranches (90 g)', source: OFF('3760324300183'),
        kcal: 182, proteines: 26, glucides: 6.5, lipides: 4.7, fibres: 4.7, ble: true, soja: true, tracesGluten: false },
      { marque: 'Heura', produit: 'Chorizo original (216 g)', source: 'https://world.openfoodfacts.org/product/8437017033394',
        kcal: 154, proteines: 16, glucides: 2.9, lipides: 7.4, fibres: 5.7, ble: false, soja: true, tracesGluten: false },
      { marque: 'Heura', produit: 'Chorizo', source: 'https://world.openfoodfacts.org/product/8437017041030',
        kcal: 153, proteines: 14, glucides: 4.5, lipides: 7.6, fibres: 5, ble: false, soja: true, tracesGluten: false },
    ],
    ecartes: [
      { produit: 'La Vie, mini chorizos (75 g)', raison: 'saucisson SEC d’apéritif (367 kcal, 36 g de protéines) : un autre produit que le chorizo qu’on cuisine' },
      { produit: 'Plantélan, « Piton de la fournaise »', raison: 'page sans liste d’ingrédients : ni le produit ni le gluten ne sont vérifiables' },
    ],
  },
  {
    ref: 'jambon_vegetal', nom: 'Jambon végétal', categorie: VIANDES, absMaxQty: 120,
    etiquettes: [
      { marque: 'La Vie', produit: 'Jambon végétal (120 g)', source: OFF('3770018078144'),
        kcal: 115, proteines: 19, glucides: 3.7, lipides: 2.1, fibres: 2.8, ble: false, soja: true, tracesGluten: false },
      { marque: 'La Vie', produit: 'Jambon végétal fumé (120 g)', source: OFF('3770018078212'),
        kcal: 116, proteines: 19, glucides: 4.8, lipides: 2, fibres: 1.9, ble: false, soja: true, tracesGluten: false },
      { marque: 'HappyVore', produit: 'Jambon végétal (120 g)', source: OFF('3760324300268'),
        kcal: 120, proteines: 20, glucides: 3.6, lipides: 2.2, fibres: 3.5, ble: false, soja: false, tracesGluten: false },
      { marque: 'HappyVore', produit: 'Jambon fumé 100 % végétal (120 g)', source: OFF('3667439000055'),
        kcal: 121, proteines: 20, glucides: 3.6, lipides: 2.3, fibres: 3.5, ble: false, soja: false, tracesGluten: false },
    ],
  },
  {
    ref: 'escalope_vegetale', nom: 'Escalope végétale', categorie: VIANDES, absMaxQty: 180,
    etiquettes: [
      { marque: 'Accro', produit: 'Escalopes panées 100 % végétales (2 × 90 g)', source: OFF('3770018934778'),
        kcal: 245, proteines: 14, glucides: 16, lipides: 13, fibres: 3.9, ble: true, soja: false, tracesGluten: false },
      { marque: 'Heura', produit: 'Escalopes panées (180 g)', source: OFF('8436615850174'),
        kcal: 204, proteines: 16, glucides: 13, lipides: 9, fibres: 3.3, ble: true, soja: true, tracesGluten: false },
      { marque: 'Herta', produit: 'Le Bon Végétal, escalope soja & blé (180 g)', source: OFF('7613035694477'),
        kcal: 201, proteines: 10, glucides: 16, lipides: 10, fibres: 3.5, ble: true, soja: true, tracesGluten: false },
      { marque: 'Garden Gourmet', produit: 'Vegan Schnitzel, escalope végane (180 g)', source: 'https://be-fr.openfoodfacts.org/produit/7613287424587',
        kcal: 235, proteines: 12.3, glucides: 17.6, lipides: 11.7, fibres: 5.3, ble: true, soja: true, tracesGluten: false },
    ],
  },
];

const arrondi1 = (x: number) => Math.round(x * 10) / 10;
const moy = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Valeurs pour 100 g : la moyenne des étiquettes (kcal à l'unité, le reste au dixième). */
export function moyenneEtiquettes(a: AlimentVegetal) {
  const e = a.etiquettes;
  return {
    kcal: Math.round(moy(e.map((x) => x.kcal))),
    protein: arrondi1(moy(e.map((x) => x.proteines))),
    carbs: arrondi1(moy(e.map((x) => x.glucides))),
    fat: arrondi1(moy(e.map((x) => x.lipides))),
    fiber: arrondi1(moy(e.map((x) => x.fibres))),
  };
}

/** Sans gluten seulement si AUCUNE étiquette n'a de blé ni ne déclare de traces. */
export const sansGluten = (a: AlimentVegetal) => a.etiquettes.every((x) => !x.ble && !x.tracesGluten);
/** Contient du soja si UNE étiquette en a (prudence de la famille « soja » des aliments évités). */
export const contientSoja = (a: AlimentVegetal) => a.etiquettes.some((x) => x.soja);
/** Contient du blé si UNE étiquette en a comme ingrédient. */
export const contientBle = (a: AlimentVegetal) => a.etiquettes.some((x) => x.ble);

/** Les mêmes aliments dans la recherche de l'app (réserve, courses, repas que l'on gère). */
export const FOODS_VEGETAUX_KYROZ: Food[] = ALIMENTS_VEGETAUX.map((a) => {
  const m = moyenneEtiquettes(a);
  return {
    id: `kyroz-${a.ref.replace(/_/g, '-')}`,
    name_fr: a.nom,
    category: a.categorie,
    per100g: { kcal: m.kcal, protein_g: m.protein, carbs_g: m.carbs, fat_g: m.fat },
    fiber_g: m.fiber,
    source: 'kyroz',
  };
});
