import { describe, it, expect } from 'vitest';
import { buildLocalPlan, nextPlanSeed } from '../planEngine';
import { recalcProfile } from '../tdee';
import type { UserProfile } from '../types';

/**
 * LE TIRAGE SE GARDE (2026-08-02).
 *
 * Étage suivant de la chaîne A21→A23. Une fois « Régénérer mon plan » réparé, puis
 * piloté par le réglage de variété, il restait ceci : **le plan régénéré était jeté
 * au réglage suivant**. `app/(tabs)/plan.tsx` remettait le seed à 0 sur toute
 * génération non-reroll — et l'auto-refresh de l'écran en déclenche une dès qu'un
 * réglage entre dans `profileSignature`.
 *
 * Ce que vivait l'utilisateur : il régénère jusqu'à tomber sur une semaine qui lui
 * plaît, il ajoute « pas de champignons » — un ingrédient ABSENT de son plan, donc
 * sans le moindre effet légitime — et il retrouve le plan canonique EXACT qu'il venait
 * de rejeter trois fois. Mesuré (`npm run mesure:reglages`) : le réglage changeait
 * légitimement 66 % de la semaine, la remise à zéro en détruisait 92 % de plus.
 *
 * Aucune mesure existante ne pouvait le voir : `mesure:reroll` compare des rerolls
 * entre eux, et le reroll marchait parfaitement. Le défaut était dans ce qui arrivait
 * APRÈS. C'est pour ça que la règle vit maintenant dans une fonction pure.
 */
describe('nextPlanSeed — le tirage courant se garde', () => {
  it('un nouvel utilisateur part du plan canonique', () => {
    expect(nextPlanSeed(null, false)).toBe(0);
  });

  it('« Régénérer mon plan » avance le tirage', () => {
    expect(nextPlanSeed(null, true)).toBe(1);
    expect(nextPlanSeed('3', true)).toBe(4);
  });

  it('⚠️ LE DÉFAUT : une génération non-reroll GARDE le tirage, elle ne le remet pas à 0', () => {
    // C'est l'auto-refresh (changement de réglage) et la bannière « plan désynchronisé ».
    // Si cette ligne retombe à 0, l'utilisateur reperd la semaine qu'il s'était choisie.
    expect(nextPlanSeed('3', false)).toBe(3);
    expect(nextPlanSeed('12', false)).toBe(12);
  });

  it('une valeur illisible ne casse rien — elle retombe sur le canonique', () => {
    expect(nextPlanSeed('', false)).toBe(0);
    expect(nextPlanSeed('abc', false)).toBe(0);
    expect(nextPlanSeed('-4', false)).toBe(0);
    expect(nextPlanSeed('abc', true)).toBe(1);
  });

  it('enchaîner des rerolls ne repasse jamais par 0', () => {
    let s = 0;
    for (let i = 0; i < 5; i++) s = nextPlanSeed(String(s), true);
    expect(s).toBe(5);
    // …et trois changements de réglage d'affilée le laissent intact.
    for (let i = 0; i < 3; i++) s = nextPlanSeed(String(s), false);
    expect(s).toBe(5);
  });
});

const gabarit = (over: Partial<UserProfile> = {}): UserProfile => recalcProfile({
  id: 'test', sex: 'male', age: 30, weight_kg: 80, height_cm: 180,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'cut', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: ['breakfast', 'lunch', 'dinner', 'snack'], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  ...over,
} as unknown as UserProfile);

/** % de créneaux (jour × repas) dont la recette diffère entre deux plans. */
function ecart(a: UserProfile, seedA: number, b: UserProfile, seedB: number): number {
  const pa = buildLocalPlan(a, seedA), pb = buildLocalPlan(b, seedB);
  const m = new Map(pa.meals.map((x) => [`${x.day}|${x.meal_type}`, x.recipe.id]));
  let vus = 0, diff = 0;
  for (const x of pb.meals) {
    const k = `${x.day}|${x.meal_type}`;
    if (!m.has(k)) continue;
    vus++; if (m.get(k) !== x.recipe.id) diff++;
  }
  return vus === 0 ? 0 : (diff / vus) * 100;
}

describe('garder le tirage préserve la semaine choisie', () => {
  it('un réglage SANS effet réel ne doit pas rebattre le plan', () => {
    // Le cas qui rend le défaut indiscutable : un aliment évité qu'aucune recette du
    // plan ne contient. Le réglage ne change rien — donc le plan ne doit rien changer.
    const p = gabarit();
    const sansEffet = gabarit({ disliked_foods: ['rutabaga'] });
    // Ancien comportement : le seed retombait à 0 → on comparait le plan régénéré au
    // plan canonique, soit ~96 % d'écart. Avec le tirage gardé, l'écart doit être nul.
    expect(ecart(p, 3, sansEffet, nextPlanSeed('3', false))).toBe(0);
  });

  it('après un changement de réglage, l\'utilisateur reste sur SA variante', () => {
    // La propriété qui compte, et la seule qui soit vraie partout. On ne peut PAS
    // exiger que garder le tirage éloigne moins du plan de départ : un réglage comme
    // `meal_emphasis` déplace les cibles et rebat la semaine de toute façon (mesuré :
    // 96 % en gardant le tirage contre 93 % en le remettant à zéro — l'inverse de
    // l'intuition). Ce qu'on exige, c'est qu'il ne soit pas RENVOYÉ AU PLAN PAR DÉFAUT.
    // Mesuré sur le panel de référence (12 profils × 5 régimes × 4 réglages) : 240/240.
    const REGLAGES: Partial<UserProfile>[] = [
      { meal_emphasis: 'dinner' }, { disliked_foods: ['champignon'] },
      { rest_weekdays: [0] }, { variety: 'balanced' },
    ];
    const REGIMES: UserProfile['dietary_restrictions'][] = [[], ['vegan'], ['vegan', 'gluten_free']];
    for (const regime of REGIMES) {
      for (const reglage of REGLAGES) {
        const p = gabarit({ dietary_restrictions: regime, ...reglage });
        const sien = buildLocalPlan(p, nextPlanSeed('3', false)).meals.map((m) => m.recipe.id);
        const defaut = buildLocalPlan(p, 0).meals.map((m) => m.recipe.id);
        expect(sien, `régime ${regime.join('+') || 'aucun'} · ${JSON.stringify(reglage)}`)
          .not.toEqual(defaut);
      }
    }
  });
});
