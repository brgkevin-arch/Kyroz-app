import { describe, it, expect } from 'vitest';
import { RECIPE_INGREDIENTS } from '../recipeData';
import { categorize, conservationDe } from '../pantry';

// ── LE RANGEMENT DE LA RÉSERVE, ALIMENT PAR ALIMENT (point 5, validé le 2026-10-23) ──────
//
// Règle du fondateur : **au frais = au frigo** (« tu ne mets pas une banane au frigo »),
// **au sec = tout le reste**. Chaque aliment est rangé d'après les sources (Interfel surtout),
// citées dans docs/2026-10-23-rangement-reserve.md. Les briques et pots fermés vont au sec.

const rangement = (ref: string) => {
  const d = RECIPE_INGREDIENTS[ref];
  return conservationDe({ name: d.name, quantity: 1, unit: d.unit, category: categorize(d.name) });
};

describe('ce que le froid abîme va au sec', () => {
  it.each(['banane', 'tomate', 'avocat', 'ananas', 'mangue', 'pomme', 'pomme_de_terre', 'patate_douce', 'oignon'])(
    '%s → au sec', (ref) => expect(rangement(ref)).toBe('sec'));
});

describe('les briques et pots fermés vont au sec', () => {
  it.each(['lait_demi_ecreme', 'creme_soja', 'lait_amande', 'lait_coco', 'tofu_soyeux', 'pesto', 'sirop_erable'])(
    '%s → au sec', (ref) => expect(rangement(ref)).toBe('sec'));
});

describe('ce qui est vendu au rayon frais va au frais', () => {
  it.each(['tofu_ferme', 'tofu_fume', 'tempeh', 'seitan', 'boulette_vegetale', 'galette_vegetale', 'lardons_vegetaux',
    'merguez_vegetale', 'nuggets_vegetal', 'saucisse_vegetale', 'chorizo_vegetal', 'falafel'])(
    '%s → au frais', (ref) => expect(rangement(ref)).toBe('frais'));
});

describe('ce qui reste au frigo y reste', () => {
  it.each(['raisins', 'kiwi', 'framboises', 'myrtilles', 'carotte', 'courgette', 'concombre', 'poivron', 'brocoli',
    'epinards', 'champignons', 'betterave', 'oeuf_entier', 'skyr', 'poulet_filet', 'saumon_fume'])(
    '%s → au frais', (ref) => expect(rangement(ref)).toBe('frais'));
});

describe('un mot-clé ne compte qu’en début de mot (2026-10-23)', () => {
  it('« corail » n’est pas de l’ail, « chorizo » n’est pas du riz', () => {
    expect(categorize('Lentilles corail')).toBe('féculents');
    expect(rangement('lentilles_corail')).toBe('sec');
    expect(categorize('Chorizo végétal')).toBe('viandes');
  });

  it('l’apostrophe sépare deux mots : le lait d’amande n’est pas un produit laitier', () => {
    expect(categorize('Lait d’amande')).toBe('autres');
    expect(categorize("Beurre d'amande")).toBe('autres');
  });

  it('la sonde sait dire OUI : un mot-clé en début de mot est trouvé', () => {
    expect(categorize('Ail')).toBe('légumes');
    expect(categorize('Riz basmati')).toBe('féculents');
    expect(categorize('Chou-fleur')).toBe('légumes');
  });
});
