import { describe, it, expect } from 'vitest';
import { buildLocalPlan, familyKey } from '../planEngine';
import { recalcProfile } from '../tdee';
import { getEffectiveRecipes } from '../recipes';
import type { DietaryRestriction, Recipe, UserProfile } from '../types';

/**
 * Rotation au niveau FAMILLE (`FAMILY_FIBER_TOL`, 2026-08-02).
 *
 * `usage` ne fait tourner que les IDS : il empêche la même recette de revenir, pas deux
 * recettes quasi identiques. Mesuré avant correctif sur 240 semaines simulées (12 profils
 * × 5 régimes × 4 tirages) : **56,3 % des semaines servaient au moins deux recettes du
 * même couple (protéine × féculent)** — « poulet-riz-brocoli » et « wok poulet-riz-
 * légumes » la même semaine. Après : 27,9 %.
 *
 * ⚠️ Ce défaut était invisible des deux contrôles existants, et c'est pour ça qu'il a
 * survécu : `check:doublons` compte des groupes dans le CATALOGUE (règle R4, qui ne
 * s'alarme qu'au-delà de 2 recettes par couple) et `mesure:couverture` compte des
 * recettes DISTINCTES servies. Or le pire contrevenant mesuré, `edamame × maïs` en
 * collation, est un groupe de DEUX recettes : légal pour R4, distinctes pour la
 * couverture, et vécu comme une répétition par l'utilisateur.
 *
 * Ce test échoue si la clé de départage disparaît, ou si sa tolérance est relevée au
 * point de ne plus mordre. Les bornes sont larges à dessein : le catalogue bouge (une
 * vague de recettes déplace le tirage), c'est la DISPARITION du mécanisme qu'on verrouille,
 * pas un chiffre au dixième près.
 */
const gabarit = (over: Partial<UserProfile> = {}): UserProfile => recalcProfile({
  id: 'test', sex: 'male', age: 30, weight_kg: 80, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'maintain', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  ...over,
} as UserProfile);

/** Miroir du groupement de `familyKey`, créneau compris (les pools sont par créneau). */
const cle = (r: Recipe) =>
  `${r.tags.includes('snack') ? 'c' : r.tags.includes('breakfast') ? 'p' : 'r'}|${familyKey(r)}`;

/** Nb de semaines contenant ≥ 2 recettes DIFFÉRENTES d'une même famille, et nb de paires. */
function quasiDoublons(): { semaines: number; avecClone: number; paires: number } {
  const GABARITS: Partial<UserProfile>[] = [
    { sex: 'female', weight_kg: 55, height_cm: 162, goal: 'cut' },
    { sex: 'female', weight_kg: 70, height_cm: 168, goal: 'bulk' },
    { sex: 'male', weight_kg: 80, height_cm: 180, goal: 'maintain' },
    { sex: 'male', weight_kg: 110, height_cm: 190, age: 35, goal: 'bulk' },
  ];
  const REGIMES: DietaryRestriction[][] = [[], ['vegan']];
  let semaines = 0, avecClone = 0, paires = 0;
  for (const g of GABARITS) {
    for (const r of REGIMES) {
      const p = gabarit({ ...g, dietary_restrictions: r });
      for (const seed of [0, 1]) {
        semaines++;
        const vus = new Map<string, Set<string>>();
        for (const m of buildLocalPlan(p, seed).meals) {
          const k = cle(m.recipe);
          if (!vus.has(k)) vus.set(k, new Set());
          vus.get(k)!.add(m.recipe.id);
        }
        let ici = false;
        for (const ids of vus.values()) if (ids.size > 1) { ici = true; paires += ids.size - 1; }
        if (ici) avecClone++;
      }
    }
  }
  return { semaines, avecClone, paires };
}

describe('rotation par FAMILLE (protéine × féculent)', () => {
  it('deux recettes du même couple tombent rarement dans la même semaine', () => {
    // Mesuré sur cet échantillon (16 semaines) : 12 semaines / 21 paires SANS la clé,
    // 7 semaines / 12 paires avec. Les bornes sont posées entre les deux, au large :
    // le mécanisme retiré, le test tombe ; une vague de recettes, non.
    const { semaines, avecClone, paires } = quasiDoublons();
    expect(semaines).toBe(16);
    expect(avecClone, `${avecClone}/16 semaines avec quasi-doublon (7 mesuré, 12 sans la clé)`)
      .toBeLessThanOrEqual(9);
    expect(paires, `${paires} paires servies (12 mesuré, 21 sans la clé)`).toBeLessThanOrEqual(15);
  });

  it('la clé de famille est le MIROIR du triplet anti-doublons R4', () => {
    // Si les deux divergent, le moteur arbitre sur autre chose que ce que le catalogue
    // contrôle — et les deux mesures cessent de parler du même objet.
    for (const r of getEffectiveRecipes().slice(0, 60)) {
      const P = r.ingredients.filter((i) => i.macro_role === 'protein').map((i) => i.ref).sort().join('+') || '∅';
      const C = r.ingredients.filter((i) => i.macro_role === 'carb').map((i) => i.ref).sort().join('+') || '∅';
      expect(familyKey(r), r.id).toBe(`${P}×${C}`);
    }
  });

  it('le PREMIER plan servi n\'est pas le moins varié (FAMILY_SELECT_W_CANON)', () => {
    // 2026-08-02 — la pénalité de famille ne pesait sur le score QUE lors d'un reroll.
    // Résultat à l'envers : le plan canonique, celui qu'un nouvel utilisateur reçoit,
    // contenait deux assiettes jumelles dans 45,0 % de ses semaines contre 20,0 % pour
    // un plan régénéré (panel de référence, 12 profils × 5 régimes). Appuyer sur
    // « Régénérer » réparait donc la première impression.
    //
    // Après correctif : 23,3 % au canonique contre 20,0 % au régénéré — l'écart tombe
    // de 25 points à 3,3. On n'exige pas que le canonique GAGNE, juste qu'il ne soit
    // plus nettement derrière : le seuil large verrouille la DISPARITION de la pénalité
    // (qui reprojetterait le canonique à ~45 %), pas un chiffre au dixième.
    //
    // ⚠️ Les régimes doivent rester ceux du panel de référence. Un échantillon à
    // dominante vegan fait remonter le canonique à 55 % et rend le test rouge à tort :
    // le vegan est le pool le plus mince du catalogue (41,7 % canonique contre 30,6 %
    // régénéré ; en vegan+sans gluten, 50 % des DEUX côtés — le reroll n'y peut rien
    // non plus). C'est une limite de CATALOGUE consignée en D19/B7, pas de sélection.
    const GABARITS: Partial<UserProfile>[] = [
      { sex: 'female', weight_kg: 55, height_cm: 162, goal: 'cut' },
      { sex: 'male', weight_kg: 80, height_cm: 180, goal: 'maintain' },
      { sex: 'male', weight_kg: 110, height_cm: 190, age: 35, goal: 'bulk' },
    ];
    const REGIMES: DietaryRestriction[][] = [
      [], ['vegetarian'], ['vegan'], ['gluten_free'], ['vegan', 'gluten_free'],
    ];
    const compte = (seeds: number[]) => {
      let semaines = 0, avecClone = 0;
      for (const g of GABARITS) {
        for (const r of REGIMES) {
          const p = gabarit({ ...g, dietary_restrictions: r });
          for (const seed of seeds) {
            semaines++;
            const vus = new Map<string, Set<string>>();
            for (const m of buildLocalPlan(p, seed).meals) {
              const k = cle(m.recipe);
              if (!vus.has(k)) vus.set(k, new Set());
              vus.get(k)!.add(m.recipe.id);
            }
            if ([...vus.values()].some((ids) => ids.size > 1)) avecClone++;
          }
        }
      }
      return (avecClone / semaines) * 100;
    };
    const canonique = compte([0]);
    const regenere = compte([1, 2, 3]);
    expect(canonique, `canonique ${canonique.toFixed(1)} % vs régénéré ${regenere.toFixed(1)} %`)
      .toBeLessThanOrEqual(regenere + 15);
  });

  it('le plan canonique (`repetitive`, seed 0) ignore la famille et reste déterministe', () => {
    // Il est volontairement statique : la rotation — id comme famille — n'y entre pas.
    const p = gabarit({ variety: 'repetitive' });
    const a = buildLocalPlan(p, 0).meals.map((m) => m.recipe.id);
    const b = buildLocalPlan(p, 0).meals.map((m) => m.recipe.id);
    expect(a).toEqual(b);
  });

  it('la clé RÉORDONNE, elle n\'exclut jamais : le pool le plus mince reste servi', () => {
    // F 55 sèche en vegan + sans gluten — le pool le plus étroit du catalogue. Un nudge
    // de variété qui retirerait des candidats se verrait ici en premier.
    const p = gabarit({
      sex: 'female', weight_kg: 55, height_cm: 162, goal: 'cut',
      dietary_restrictions: ['vegan', 'gluten_free'],
    });
    const meals = buildLocalPlan(p, 0).meals;
    expect(meals).toHaveLength(28);
    expect(meals.every((m) => m.recipe.restrictions_ok?.includes('vegan'))).toBe(true);
  });
});
