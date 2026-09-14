import { describe, it, expect } from 'vitest';
import { getEffectiveRecipes } from '../recipes';
import {
  demandeCuisson, FECULENTS_RARES, INGREDIENT_COURANT_MAX_SEMAINE, INGREDIENT_RARE_MAX_SEMAINE,
  plafondIngredient, platDuMidi, POUDRES, PROTEINES_VEGETALES_RARES, surLePouce,
} from '../repasHumain';
import { makeProfile } from './helpers';
import { Recipe } from '../types';

// ── LES RÈGLES DE LECTURE HUMAINE, SUR DES RECETTES RELUES À L'ŒIL (D30) ───────
//
// Chaque cas ci-dessous a été lu étape par étape le 2026-09-14 avant d'écrire la règle.
// Un classement qui dérive (une regex « simplifiée », une liste de féculents raccourcie)
// se voit ici sur un plat NOMMÉ, pas sur un pourcentage.

const cat = getEffectiveRecipes();
const r = (id: string): Recipe => {
  const x = cat.find((c) => c.id === id);
  if (!x) throw new Error(`recette ${id} absente du catalogue`);
  return x;
};

describe('petit-déjeuner : plat du midi', () => {
  it.each([
    ['pd127', 'Poêlée de thon aux pommes de terre'],
    ['pd112', "Bol d'edamame au millet et poivron"],
    ['pd115', 'Nouilles de riz sautées au tofu fumé'],
    ['pd79', 'Polenta crémeuse à la dinde et aux champignons'],
    ['pd80', 'Sarrasin poêlé à la dinde et aux poivrons'],
  ])('%s (%s) est un plat du midi', (id) => {
    expect(platDuMidi(r(id))).toBe(true);
  });

  it.each([
    ['pd04', 'Omelette 3 œufs jambon – champignons (pain complet)'],
    ['pd84', 'Galettes de riz au saumon fumé et tomates'],
    ['pd13', 'Wrap petit-déj œuf – dinde – poivron'],
    ['pd83', 'Tartine de seigle au saumon fumé et concombre'],
  ])('%s (%s) reste un petit-déjeuner salé', (id) => {
    expect(platDuMidi(r(id))).toBe(false);
  });

  it('un porridge de millet SUCRÉ reste un petit-déjeuner', () => {
    // La règle vise le plat chaud salé ; le millet au lait et à la pomme est un porridge.
    const sucres = cat.filter((x) => x.tags.includes('breakfast') && x.ingredients.some((i) => i.ref === 'millet') && !platDuMidi(x));
    expect(sucres.length, 'aucun porridge de millet trouvé : la sonde est aveugle').toBeGreaterThan(0);
  });

  it('la moitié environ des petits-déjeuners salés sort du matin, pas tous', () => {
    // Mesuré : 27 sur 54. Tous retirés, le salé du matin disparaîtrait ; aucun, la règle serait décorative.
    const sales = cat.filter((x) => x.tags.includes('breakfast') && platDuMidi(x));
    expect(sales.length).toBeGreaterThan(15);
    expect(sales.length).toBeLessThan(40);
  });
});

describe('collation « sur le pouce » : 10 min au plus, sans cuisson', () => {
  it.each([
    ['col02', 'Shake whey – banane – lait'],
    ['col113', 'Galettes de riz au thon'],
    ['col115', 'Salade de pois chiches au thon'],
    ['col52', 'Crème de soja, banane et amandes (« sans cuisson » écrit dans les étapes)'],
  ])('%s (%s) passe', (id) => {
    expect(surLePouce(r(id))).toBe(true);
  });

  it.each([
    ['col05', 'Tartine complète grillée'],
    ['col14', 'Œufs durs'],
    ['col41', 'Galettes de riz, dinde saisie'],
    ['col82', "Soja texturé à l'eau bouillante"],
    ['col108', 'Légumes wok sautés'],
    ['col17', 'Semoule de maïs, 15 min'],
  ])('%s (%s) ne passe pas', (id) => {
    expect(surLePouce(r(id))).toBe(false);
  });

  it('« sauté » est reconnu même suivi d’une espace (frontière de mot Unicode)', () => {
    const fausse = { ...r('col02'), steps: ['Fais sauter les légumes 5 minutes à feu vif.'] } as Recipe;
    expect(demandeCuisson(fausse)).toBe(true);
    const neutre = { ...r('col02'), steps: ["Mélange le skyr à la fourchette, sans cuisson."] } as Recipe;
    expect(demandeCuisson(neutre)).toBe(false);
  });
});

describe('ingrédient de base : courant 5, rare 2', () => {
  const omnivore = makeProfile({ dietary_restrictions: [] });
  const vegan = makeProfile({ dietary_restrictions: ['vegan'] });

  it('le millet et la polenta sont rares pour tout le monde', () => {
    for (const ref of FECULENTS_RARES) {
      expect(plafondIngredient(ref, omnivore), ref).toBe(INGREDIENT_RARE_MAX_SEMAINE);
      expect(plafondIngredient(ref, vegan), ref).toBe(INGREDIENT_RARE_MAX_SEMAINE);
    }
  });

  it('les poudres ne sont plafonnées pour personne (mesuré : sans lactose 1 → 65 repas mal calibrés)', () => {
    for (const ref of POUDRES) {
      expect(plafondIngredient(ref, omnivore), ref).toBe(Infinity);
      expect(plafondIngredient(ref, vegan), ref).toBe(Infinity);
    }
  });

  it('le tofu est rare chez l’omnivore, libre chez le végétarien et le vegan', () => {
    const vegetarien = makeProfile({ dietary_restrictions: ['vegetarian'] });
    for (const ref of PROTEINES_VEGETALES_RARES) {
      expect(plafondIngredient(ref, omnivore), ref).toBe(INGREDIENT_RARE_MAX_SEMAINE);
      expect(plafondIngredient(ref, vegan), ref).toBe(Infinity);
      expect(plafondIngredient(ref, vegetarien), ref).toBe(Infinity);
    }
  });

  it('chez le végétarien et le vegan, le riz et les œufs ne sont pas plafonnés, le millet si', () => {
    expect(plafondIngredient('riz_basmati', vegan)).toBe(Infinity);
    expect(plafondIngredient('millet', vegan)).toBe(INGREDIENT_RARE_MAX_SEMAINE);
  });

  it('le riz, le pain, les œufs et le poulet sont courants', () => {
    for (const ref of ['riz_basmati', 'pain_complet', 'oeuf_entier', 'poulet_filet', 'pomme_de_terre']) {
      expect(plafondIngredient(ref, omnivore), ref).toBe(INGREDIENT_COURANT_MAX_SEMAINE);
    }
  });

  it('toute ref rare existe au catalogue (une liste qui vise un ingrédient absent ne garde rien)', () => {
    const refs = new Set(cat.flatMap((x) => x.ingredients.map((i) => i.ref)));
    for (const ref of [...FECULENTS_RARES, ...POUDRES]) expect(refs.has(ref), ref).toBe(true);
  });
});
