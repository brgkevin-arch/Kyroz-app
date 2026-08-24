import { describe, it, expect } from 'vitest';
import {
  recipeCoverage, cookableRecipes, conservationDe, parConservation, setConservation,
  PantryItem,
} from '../pantry';
import { makeProfile } from './helpers';
import type { Recipe } from '../types';

// ── « RÉALISABLE » COMPTE LES GRAMMES, ET RESPECTE LE RÉGIME ────────────────
//
// Deux défauts signalés par le fondateur le 2026-08-24, dans la même phrase :
//
//  1. **La couverture ne regardait que les NOMS.** Un `some()` sur la présence :
//     10 g de riz oubliés au fond d'un paquet déclaraient réalisable une recette
//     qui en demande 200. L'écran annonçait un plat impossible au moment exact où
//     l'on cherche quoi manger ce soir. ⚠️ La liste de courses, elle, comptait
//     DÉJÀ les grammes — deux écrans lisaient la même réserve et en tiraient deux
//     vérités différentes.
//  2. **Aucun filtre de régime.** La réserve balayait le catalogue entier, donc
//     elle proposait du poulet à un végétarien pendant que le moteur de plan
//     tenait sa promesse. Le prédicat est désormais PARTAGÉ avec le moteur
//     (`planEngine::recipeAllowed`), jamais recopié.

const stock = (name: string, quantity: number, unit = 'g', over: Partial<PantryItem> = {}): PantryItem =>
  ({ name, quantity, unit, category: 'légumes', ...over });

const recette = (ings: { name: string; quantity_g: number; unit?: string }[]): Recipe =>
  ({ id: 'r', name_fr: 'r', ingredients: ings } as unknown as Recipe);

describe('la quantité décide, plus la présence', () => {
  const riz = recette([{ name: 'Riz', quantity_g: 200 }]);

  it('🔴 un fond de paquet ne rend PAS la recette réalisable', () => {
    const c = recipeCoverage(riz, [stock('Riz', 10)]);
    expect(c.have).toBe(0);
    expect(c.missing).toHaveLength(1);
  });

  it('ce qui est annoncé manquant est le MANQUE, pas le besoin', () => {
    // « Il te manque 120 g de riz », pas « 200 g » : la phrase doit dire quoi
    // acheter, pas répéter la recette.
    expect(recipeCoverage(riz, [stock('Riz', 80)]).missing[0].quantity_g).toBe(120);
  });

  it('le stock suffisant couvre', () => {
    expect(recipeCoverage(riz, [stock('Riz', 250)]).missing).toHaveLength(0);
  });

  it('une cuisine n’est pas un laboratoire : 95 % suffisent', () => {
    // 190 g pour 200 demandés — personne ne rate ce plat, et refuser ici ferait
    // passer la fonctionnalité pour cassée.
    expect(recipeCoverage(riz, [stock('Riz', 190)]).missing).toHaveLength(0);
    // Mais 90 % ne suffisent pas : la tolérance est une marge, pas une passoire.
    expect(recipeCoverage(riz, [stock('Riz', 180)]).missing).toHaveLength(1);
  });

  it('deux lignes du même aliment s’additionnent', () => {
    expect(recipeCoverage(riz, [stock('Riz', 120), stock('Riz', 120)]).missing).toHaveLength(0);
  });

  it('les condiments restent supposés présents', () => {
    const c = recipeCoverage(recette([{ name: 'Huile d\'olive', quantity_g: 10 }]), []);
    expect(c.total).toBe(0);
    expect(c.missing).toHaveLength(0);
  });
});

describe('pièces et grammes se comparent quand on sait les convertir', () => {
  const omelette = recette([{ name: 'Œufs entiers', quantity_g: 165 }]);   // 3 œufs

  it('3 œufs en pièces couvrent 165 g', () => {
    expect(recipeCoverage(omelette, [stock('Œufs entiers', 3, 'pièce')]).missing).toHaveLength(0);
  });

  it('2 œufs ne couvrent pas 3 œufs', () => {
    const c = recipeCoverage(omelette, [stock('Œufs entiers', 2, 'pièce')]);
    expect(c.missing).toHaveLength(1);
    expect(c.missing[0].quantity_g).toBe(55);          // il en manque un
  });

  it('un aliment qu’on ne sait pas convertir retombe sur la PRÉSENCE', () => {
    // On ne connaît pas le poids d'une pièce de riz. Inventer un chiffre ferait
    // dire un manque faux ; l'ignorer ferait promettre une couverture fausse. On
    // retient ce qu'on sait — il y en a — et on n'invente rien.
    const c = recipeCoverage(recette([{ name: 'Riz', quantity_g: 200 }]), [stock('Riz', 2, 'pièce')]);
    expect(c.have).toBe(1);
    expect(c.missing).toHaveLength(0);
  });
});

describe('le régime et les aliments évités sont respectés', () => {
  // Réserve volontairement large : on veut que le catalogue rende beaucoup de
  // recettes, pour que le filtre ait quelque chose à écarter.
  const grosseReserve: PantryItem[] = [
    stock('Blanc de poulet', 2000), stock('Riz basmati', 2000, 'g', { category: 'féculents' }),
    stock('Œufs entiers', 24, 'pièce', { category: 'laitiers' }), stock('Brocoli', 2000),
    stock('Saumon', 2000, 'g', { category: 'viandes' }), stock('Lentilles', 2000, 'g', { category: 'féculents' }),
  ];

  it('sans profil, rien n’est filtré — c’est le comportement d’avant', () => {
    expect(cookableRecipes(grosseReserve).length).toBeGreaterThan(0);
  });

  it('🔴 un profil végétarien ne reçoit AUCUNE recette de viande', () => {
    const vege = makeProfile({ dietary_restrictions: ['vegetarian'] });
    const avec = cookableRecipes(grosseReserve, vege);
    const sans = cookableRecipes(grosseReserve);
    expect(avec.length).toBeLessThan(sans.length);      // le filtre mord vraiment
    for (const c of avec) {
      expect(c.recipe.restrictions_ok ?? [], c.recipe.name_fr).toContain('vegetarian');
    }
  });

  it('un aliment évité écarte les recettes qui le contiennent', () => {
    const sansPoulet = makeProfile({ disliked_foods: ['poulet'] });
    for (const c of cookableRecipes(grosseReserve, sansPoulet)) {
      expect(c.recipe.ingredients.map((i) => i.name.toLowerCase()).join(' '), c.recipe.name_fr)
        .not.toContain('poulet');
    }
  });
});

describe('le frais et le sec se rangent tout seuls, et se corrigent', () => {
  it('le classement se déduit de la catégorie', () => {
    expect(conservationDe(stock('Poulet', 300, 'g', { category: 'viandes' }))).toBe('frais');
    expect(conservationDe(stock('Yaourt', 300, 'g', { category: 'laitiers' }))).toBe('frais');
    expect(conservationDe(stock('Riz', 300, 'g', { category: 'féculents' }))).toBe('sec');
    expect(conservationDe(stock('Sauce soja', 300, 'g', { category: 'autres' }))).toBe('sec');
  });

  it('🔴 il est RÉTROACTIF : une réserve enregistrée avant le champ se range quand même', () => {
    // Le champ est optionnel et n'est écrit qu'à la correction. S'il avait fallu le
    // stocker, les réserves existantes seraient restées non classées jusqu'à ce
    // qu'on retouche chaque ligne — et personne n'aurait compris pourquoi.
    const avant = [stock('Poulet', 300, 'g', { category: 'viandes' }), stock('Riz', 500, 'g', { category: 'féculents' })];
    expect(parConservation(avant, 'frais').map((i) => i.name)).toEqual(['Poulet']);
    expect(parConservation(avant, 'sec').map((i) => i.name)).toEqual(['Riz']);
  });

  it('une correction manuelle gagne sur la déduction', () => {
    // Le riz CUIT d'hier est un féculent, donc annoncé sec — et il est au frigo.
    const corrige = setConservation([stock('Riz cuit', 400, 'g', { category: 'féculents' })], 'Riz cuit', 'g', 'frais');
    expect(conservationDe(corrige[0])).toBe('frais');
    expect(parConservation(corrige, 'sec')).toHaveLength(0);
  });

  it('sait dire NON : corriger un autre aliment ne déplace rien', () => {
    const items = [stock('Riz', 400, 'g', { category: 'féculents' })];
    expect(conservationDe(setConservation(items, 'Pâtes', 'g', 'frais')[0])).toBe('sec');
  });
});
