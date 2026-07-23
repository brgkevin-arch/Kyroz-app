import { describe, it, expect } from 'vitest';
import raw from '../../Recette/recettes-kyroz.json';
import { REF_FOOD_ID } from '../recipeFoodMap';
import { findFood } from '../foods';

// ── Garde-fou du mapping recettes ↔ Ciqual ───────────────────────────────────
// Le garde-fou de `recipeMap.test.ts` compare les kcal de la RECETTE ENTIÈRE
// (±30 %) : il ne voit PAS un ingrédient dense mais peu pesé qui serait mal mappé
// (20 g de graines mappées sur du butternut ne bougent pas le total de 30 %).
// Ici on vérifie chaque ingrédient DIRECTEMENT, à la source.
const ING = raw.ingredients_reference as Record<string, { name: string; per_100: { kcal: number } }>;

describe('mapping recettes ↔ Ciqual (REF_FOOD_ID)', () => {
  it('chaque clé mappée correspond à un ingrédient réel du JSON', () => {
    // Attrape la faute de frappe silencieuse (ex. `datte` mappé alors que
    // l'ingrédient s'appelle `dattes` → mapping mort, valeur manuelle utilisée
    // sans que personne ne le voie).
    const orphelins = Object.keys(REF_FOOD_ID).filter((ref) => !ING[ref]);
    expect(orphelins, `clés mappées sans ingrédient : ${orphelins.join(', ')}`).toEqual([]);
  });

  it('chaque food_id existe bien dans la base curée', () => {
    const introuvables = Object.entries(REF_FOOD_ID)
      .filter(([, id]) => !findFood(id))
      .map(([ref, id]) => `${ref}→${id}`);
    expect(introuvables, `food_id introuvables : ${introuvables.join(', ')}`).toEqual([]);
  });

  // Règle : on n'échoue que si l'écart est gros EN ABSOLU **et** EN RELATIF.
  //  - relatif seul → faux positifs sur les aliments peu caloriques (épinards
  //    23→33 kcal = +43 %, mais 10 kcal d'écart : sans importance).
  //  - absolu seul → faux positifs sur les aliments denses (mozzarella +57 kcal,
  //    correction Ciqual légitime).
  // Les deux ensemble = signature d'un aliment qui n'est PAS le bon
  // (graines de courge 560 → butternut 30 : −530 kcal ET −95 %).
  const MAX_ABS_KCAL = 40;
  const MAX_REL = 0.5;

  it('aucun ingrédient mappé sur un aliment manifestement différent', () => {
    const suspects: string[] = [];
    for (const [ref, id] of Object.entries(REF_FOOD_ID)) {
      const manuel = ING[ref]?.per_100.kcal;
      const food = findFood(id);
      if (!manuel || !food) continue; // couvert par les tests ci-dessus
      const abs = Math.abs(food.per100g.kcal - manuel);
      const rel = Math.abs(food.per100g.kcal - manuel) / manuel;
      if (abs > MAX_ABS_KCAL && rel > MAX_REL) {
        suspects.push(`${ref}: ${manuel} kcal (estimé) → ${Math.round(food.per100g.kcal)} kcal ("${food.name_fr}")`);
      }
    }
    expect(suspects, `mapping douteux :\n  ${suspects.join('\n  ')}`).toEqual([]);
  });
});
