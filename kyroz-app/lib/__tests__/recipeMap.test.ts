import { describe, it, expect } from 'vitest';
import { RECIPES } from '../recipeMap';
import { RAW_RECIPES, RECIPE_INGREDIENTS, macrosForRefIngredients } from '../recipeData';

describe('recipeMap (JSON → Recipe)', () => {
  it('mappe les 512 recettes', () => expect(RECIPES).toHaveLength(512));

  it('ids uniques', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('category → tags repas', () => {
    const pd = RECIPES.find((r) => r.id === 'pd01')!;
    expect(pd.tags).toContain('breakfast');
    const rep = RECIPES.find((r) => r.id === 'rep01')!;
    expect(rep.tags).toEqual(expect.arrayContaining(['lunch', 'dinner']));
    const col = RECIPES.find((r) => r.id === 'col01')!;
    expect(col.tags).toContain('snack');
  });

  it('objectif FR → RecipeObjective', () => {
    const r = RECIPES.find((r) => r.id === 'pd04')!; // perte_de_gras, maintien
    expect(r.objectives).toEqual(expect.arrayContaining(['cut', 'maintain']));
  });

  it('ingrédients : ref/macro_role/scalable + nom depuis la table', () => {
    const r = RECIPES.find((r) => r.id === 'rep01')!;
    const poulet = r.ingredients.find((i) => i.ref === 'poulet_filet')!;
    expect(poulet.macro_role).toBe('protein');
    expect(poulet.scalable).toBe(true);
    expect(poulet.name).toBe('Filet de poulet');
    expect(poulet.quantity_g).toBe(180);
  });

  it('macros dérivées des ingrédients (cohérence exacte) sur les 512', () => {
    // macros_per_portion EST désormais calculé depuis les ingrédients résolus
    // (base_servings===1) → cohérence exacte par construction.
    for (const r of RECIPES) {
      const m = macrosForRefIngredients(r.ingredients.map((i) => ({ ref: i.ref!, qty: i.quantity_g })));
      const e = Math.abs(m.kcal - r.macros_per_portion.kcal) / r.macros_per_portion.kcal;
      expect(e, r.id).toBeLessThan(0.02);
    }
  });

  it('garde-fou fusion : macros Ciqual restent proches du repère manuel (±30%)', () => {
    // Détecte un food_id mal mappé (ex. maquereau → groseille ferait exploser l'écart).
    // ±30% laisse passer les corrections légitimes (ex. yaourt grec) sans masquer les bugs.
    for (const r of RECIPES) {
      const ref = RAW_RECIPES.find((x) => x.id === r.id)!.macros_per_serving;
      if (!ref.kcal) continue;
      const e = Math.abs(r.macros_per_portion.kcal - ref.kcal) / ref.kcal;
      expect(e, `${r.id} ${ref.kcal}→${r.macros_per_portion.kcal}`).toBeLessThan(0.30);
    }
  });

  it('chaque repas_complet a un axe lipides (ingrédient fat), sauf recettes délibérément maigres (≤12 g fat/portion)', () => {
    const reps = RECIPES.filter((r) => r.tags.includes('lunch'));
    for (const r of reps) {
      const hasFat = r.ingredients.some((i) => i.macro_role === 'fat');
      const lean = r.macros_per_portion.fat_g <= 12;
      expect(hasFat || lean, `${r.id} (${r.macros_per_portion.fat_g}g fat)`).toBe(true);
    }
  });

  it('restrictions_ok dérivées : dahl végétal sans gluten ni lactose', () => {
    const dahl = RECIPES.find((r) => r.id === 'rep03')!;
    expect(dahl.restrictions_ok).toEqual(expect.arrayContaining(['vegetarian', 'gluten_free', 'lactose_free']));
  });

  // Régression sécurité-régime : le cabillaud PANÉ (chapelure de blé) ne doit
  // JAMAIS ressortir « sans gluten » — un cœliaque pourrait se le voir servir.
  // La chapelure est listée + déclarée gluten dans recipeDiet → le tag tombe seul.
  it('rep32 (cabillaud pané) n’est PAS gluten_free et compte la chapelure', () => {
    const r = RECIPES.find((x) => x.id === 'rep32')!;
    expect(r.restrictions_ok).not.toContain('gluten_free');
    expect(r.ingredients.some((i) => i.ref === 'chapelure')).toBe(true);
  });

  it('couverture petit-déj sans lactose ≥ 3 (trou des 10 comblé)', () => {
    const pdLacto = RECIPES.filter((r) => r.tags.includes('breakfast') && r.restrictions_ok?.includes('lactose_free'));
    expect(pdLacto.length).toBeGreaterThanOrEqual(3);
  });

  // La recette AFFICHÉE doit être la recette SERVIE. `adaptRecipe` écrête toute
  // quantité à `abs_max_qty` : si la quantité de BASE dépasse déjà ce plafond, le
  // moteur en sert moins que ce que la fiche annonce, et les courses suivent la
  // quantité écrêtée → l'app ment. Vu en vrai sur col04 (80 g de dattes servis 60,
  // soit 57 kcal d'écart entre la recette écrite et la recette servie).
  it('aucune quantité de base ne dépasse son abs_max_qty', () => {
    const depassements: string[] = [];
    for (const r of RECIPES) {
      for (const i of r.ingredients) {
        const cap = i.ref ? RECIPE_INGREDIENTS[i.ref]?.abs_max_qty : undefined;
        if (cap && i.quantity_g > cap) depassements.push(`${r.id}/${i.ref} : ${i.quantity_g} > ${cap}`);
      }
    }
    expect(depassements, `base > plafond :\n  ${depassements.join('\n  ')}`).toEqual([]);
  });

  // Les ingrédients `flavor` / `vegetable` sont TOUJOURS figés par le moteur
  // (adaptRecipe : role === 'flavor' || role === 'vegetable' → jamais scalé). Un
  // `scalable: true` sur eux est donc un mensonge inerte : la donnée doit refléter
  // la réalité, sinon un futur refactor du moteur qui lit `scalable` changerait le
  // comportement en silence.
  it('aucun ingrédient flavor/vegetable marqué scalable:true', () => {
    const menteurs: string[] = [];
    for (const r of RECIPES) {
      for (const i of r.ingredients) {
        if ((i.macro_role === 'flavor' || i.macro_role === 'vegetable') && i.scalable === true) {
          menteurs.push(`${r.id}/${i.ref} (${i.macro_role})`);
        }
      }
    }
    expect(menteurs, `flavor/vegetable scalable:true :\n  ${menteurs.join('\n  ')}`).toEqual([]);
  });

  // L'utilisateur pèse les féculents/légumineuses au poids SEC (basis:'dry', comme
  // le riz). Un nom qui dit « cuits » / « égouttés » ferait peser le POIDS CUIT
  // (~3× trop) → macros fausses. Le nom doit être neutre (« Pois chiches »), la
  // pesée sèche suivant la convention riz/pâtes.
  it('aucun ingrédient basis:dry nommé « cuit » / « égoutté »', () => {
    const incoherents = Object.entries(RECIPE_INGREDIENTS)
      .filter(([, v]) => v.basis === 'dry' && /cuit|cuite|égoutt/i.test(v.name))
      .map(([ref, v]) => `${ref} = « ${v.name} »`);
    expect(incoherents, `nom cuit/égoutté sur poids sec :\n  ${incoherents.join('\n  ')}`).toEqual([]);
  });
});
