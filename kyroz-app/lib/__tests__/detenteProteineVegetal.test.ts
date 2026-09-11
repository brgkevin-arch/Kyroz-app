import { describe, it, expect } from 'vitest';
import {
  facteurProteineVegetal, DETENTE_PROTEINE_VEGETAL, proteinTarget, calculateMacros,
  PROTEIN_MIN_PER_KG_FFM, PROTEIN_MAX_PER_KG_FFM,
} from '../tdee';
import { fatFreeMassKg, type BodyInput } from '../safety';
import type { Goal } from '../types';

// ── LA DÉTENTE VÉGÉTALE — ce qu'elle change, et ce qu'elle n'a PAS le droit de changer ──
//
// 🔴 LE DÉFAUT MESURÉ (2026-09-11). Le moteur demandait à un végane exactement la même
// densité protéique qu'à un omnivore — 6,8 g de protéines pour 100 kcal sur un repas de
// sèche, au gramme près. Le garde-manger végétal sans gluten ne peut pas la produire :
// une femme de 55 kg en sèche recevait **20 repas complets servables sur 50**. Après
// détente de 10 % : **38**. Décision fondateur.
//
// ⚠️ LE PIÈGE QUE CE FICHIER GARDE, et c'est le vrai motif de son existence : la cause
// et le symptôme sont sur des axes DIFFÉRENTS. Les recettes écartées sortaient sur
// `over_target_kcal`, pas sur la protéine — `adaptRecipe` gonfle l'ancre pour atteindre
// la cible protéique, donc le plat grossit, donc il déborde. Deux « correctifs »
// évidents ont donc été mesurés et rendent ZÉRO recette de plus :
//   • neutraliser le drapeau `protein_below_target` ;
//   • détendre `protein_floor_tolerance` (0,95 → 0,86).
// Les deux retirent l'ALARME sans changer ce que le moteur VISE. Si quelqu'un « simplifie »
// un jour cette détente en l'une de ces deux formes, le compteur ci-dessous le dira.
//
// ⚠️ 0,9 N'EST PAS UN CURSEUR QU'ON POUSSE. Mesuré sur cinq profils : à −20 % et −30 % le
// gain s'arrête et se RETOURNE sur trois d'entre eux (les plats deviennent trop petits au
// lieu d'être trop gros). C'est un optimum, pas une direction.

const corps = (o: Partial<BodyInput> = {}): BodyInput =>
  ({ sex: 'female', weight_kg: 55, height_cm: 165, age: 30, ...o }) as BodyInput;

describe('détente protéique végétale', () => {
  it('ne s’applique QU’AUX véganes — tout le reste garde sa cible au gramme près', () => {
    expect(facteurProteineVegetal(['vegan'])).toBe(DETENTE_PROTEINE_VEGETAL);
    expect(facteurProteineVegetal(['vegan', 'gluten_free'])).toBe(DETENTE_PROTEINE_VEGETAL);
    for (const r of [undefined, [], ['gluten_free'], ['vegetarian'], ['halal'], ['lactose_free']]) {
      expect(facteurProteineVegetal(r as string[] | undefined), String(r)).toBe(1);
    }
  });

  it('déplace vraiment la cible SERVIE, pas seulement un drapeau', () => {
    // Le cœur du correctif : c'est `calculateMacros` qui doit bouger, sinon on n'a
    // retiré qu'une alarme (cf. les deux fausses pistes en tête de fichier).
    const b = corps();
    const omni = calculateMacros(2000, 'cut', b, {});
    const vegan = calculateMacros(2000, 'cut', b, { restrictions: ['vegan'] });
    expect(vegan.protein_g).toBeLessThan(omni.protein_g);
    expect(vegan.protein_g).toBe(Math.round(omni.protein_g * DETENTE_PROTEINE_VEGETAL));
  });

  it('ne touche AUCUNE calorie : les glucides et lipides reprennent la place', () => {
    // C'est ce qui garantit qu'aucun avertissement one-shot ne part (seuil en kcal/j)
    // et que le déficit demandé est servi à l'identique.
    const b = corps();
    const omni = calculateMacros(2000, 'cut', b, {});
    const vegan = calculateMacros(2000, 'cut', b, { restrictions: ['vegan'] });
    expect(vegan.target_kcal).toBe(omni.target_kcal);
    expect(vegan.floor_kcal).toBe(omni.floor_kcal);
  });

  it('la cible détendue reste DANS la bande clinique du fichier, sur tous les gabarits', () => {
    // La condition qui a permis de prendre la décision. Si un jour la bande bouge, ou si
    // la détente est creusée, c'est ici que ça doit rougir — pas chez un utilisateur.
    const gabarits: [BodyInput, Goal][] = [
      [corps({ sex: 'female', weight_kg: 55, height_cm: 165, age: 30 }), 'cut'],
      [corps({ sex: 'female', weight_kg: 80, height_cm: 170, age: 40 }), 'cut'],
      [corps({ sex: 'male', weight_kg: 65, height_cm: 175, age: 25 }), 'cut'],
      [corps({ sex: 'male', weight_kg: 80, height_cm: 180, age: 35 }), 'cut'],
      [corps({ sex: 'male', weight_kg: 110, height_cm: 190, age: 30 }), 'lean_bulk'],
      [corps({ sex: 'female', weight_kg: 60, height_cm: 160, age: 45 }), 'maintain'],
    ];
    for (const [b, goal] of gabarits) {
      const ffm = fatFreeMassKg(b);
      const detendue = (proteinTarget(b, goal) * DETENTE_PROTEINE_VEGETAL) / ffm;
      expect(detendue, `${b.sex} ${b.weight_kg} kg ${goal} → ${detendue.toFixed(2)} g/kg MM`)
        .toBeGreaterThanOrEqual(PROTEIN_MIN_PER_KG_FFM);
      expect(detendue).toBeLessThanOrEqual(PROTEIN_MAX_PER_KG_FFM);
    }
  });

  it('la détente ne se creuse pas : 0,9 est un optimum mesuré, pas une direction', () => {
    // Au-delà, le gain se retourne (les plats passent de « trop gros » à « trop petits »).
    // Le cliquet empêche qu'on la pousse « un peu plus » sans remesurer.
    expect(DETENTE_PROTEINE_VEGETAL).toBeGreaterThanOrEqual(0.9);
    expect(DETENTE_PROTEINE_VEGETAL).toBeLessThan(1);
  });
});
