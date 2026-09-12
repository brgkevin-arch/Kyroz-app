import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, PROTEIN_REFS, PROTEIN_REFS_HORS_CHOIX } from '../planEngine';
import { getEffectiveRecipes } from '../recipes';
import { Meal, UserProfile, VarietyPreference } from '../types';

// ── CE QUE L'UTILISATEUR A DÉCLARÉ SE RETROUVE DANS SON ASSIETTE ─────────────
//
// 🔴 SIGNALÉ PAR LE FONDATEUR le 2026-09-12, sur son propre plan : protéines cochées
// poulet / bœuf / poisson / œufs / whey, et pourtant ragoût de soja le soir, galette
// végétale le midi, et le même bol d'edamame 6 jours sur 7 en « répétitif ».
// Mesuré sur son gabarit (H 84 kg, muscu 4 × 30 min, 4 repas, 3 objectifs, 4 tirages) :
//   repas à protéine 100 % végétale   25,3 % → 2,4 %   (répétitif)
//   repas sans protéine déclarée      36,3 % → 14,9 %
//   même plat sur un créneau (pire)   6/7 → 4/7
// …et 0 drapeau de plus au canonique.
//
// ⚠️ POURQUOI AUCUN AUDIT NE L'AVAIT VU : tous les scripts de mesure tournaient avec
// `preferred_proteins: []` et en variété « max ». Une préférence jamais renseignée ne
// peut pas être trouvée non respectée. Ce fichier mesure donc ce qui est SERVI à
// quelqu'un qui a répondu à la question.

const M4 = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const ANIMALES = ['poulet', 'bœuf', 'poisson', 'œufs', 'whey'];
const VEGETAL = new Set(PROTEIN_REFS['végétal']);

const proteines = (m: Meal) => m.recipe.ingredients.filter((i) => i.macro_role === 'protein' && i.ref).map((i) => i.ref!);
const toutVegetal = (m: Meal) => { const p = proteines(m); return p.length > 0 && p.every((r) => VEGETAL.has(r)); };

function fondateur(over: Partial<UserProfile>): UserProfile {
  return recalcProfile(makeProfile({
    sex: 'male', age: 30, weight_kg: 84, height_cm: 180,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 30 }], training_days_per_week: 4,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: [...M4],
    dietary_restrictions: [], preferred_proteins: ANIMALES, ...over,
  } as Partial<UserProfile>));
}

function repasServis(variety: VarietyPreference, over: Partial<UserProfile> = {}): Meal[] {
  const out: Meal[] = [];
  for (const goal of ['cut', 'maintain', 'lean_bulk'] as const)
    for (const seed of [0, 1, 2, 3]) out.push(...buildLocalPlan(fondateur({ goal, variety, ...over }), seed).meals);
  return out;
}

describe('toute protéine du catalogue est rangée', () => {
  it('chaque ref de rôle `protein` est dans UNE et une seule case', () => {
    // Une ref neuve (une vague de catalogue) qui ne serait rangée nulle part ne serait
    // ni préférée ni mise en retrait — le défaut reviendrait sans que rien ne rougisse.
    const cases = [...Object.values(PROTEIN_REFS).flat(), ...PROTEIN_REFS_HORS_CHOIX];
    const vues = new Set<string>();
    for (const r of getEffectiveRecipes())
      for (const i of r.ingredients) if (i.macro_role === 'protein' && i.ref) vues.add(i.ref);
    expect(vues.size, 'aucune ref lue : la sonde est aveugle').toBeGreaterThan(20);
    for (const ref of vues) {
      expect(cases.filter((c) => c === ref).length, `« ${ref} » rangée ${cases.filter((c) => c === ref).length} fois`).toBe(1);
    }
  });

  it('les cases sont exactement les options de l\'écran', () => {
    expect(Object.keys(PROTEIN_REFS).sort()).toEqual(['bœuf', 'poisson', 'poulet', 'végétal', 'whey', 'œufs'].sort());
  });
});

describe('un omnivore qui n\'a pas coché « Végétal » ne reçoit pas un plan végétal', () => {
  for (const variety of ['repetitive', 'balanced', 'max'] as const) {
    it(`${variety} : moins de 8 % des repas à protéine 100 % végétale (25 % avant)`, () => {
      const repas = repasServis(variety);
      const part = repas.filter(toutVegetal).length / repas.length;
      expect(part, `${(100 * part).toFixed(1)} % sur ${repas.length} repas`).toBeLessThan(0.08);
    }, 60_000);
  }

  it('…mais « Peu importe » et le régime végétarien ne mettent RIEN en retrait', () => {
    // Témoin : sans ce contraste, le seuil ci-dessus pourrait venir d'un catalogue qui
    // n'offre simplement plus de plats végétaux — et le test ne prouverait rien.
    const peuImporte = repasServis('max', { preferred_proteins: [] });
    const vege = repasServis('max', { dietary_restrictions: ['vegetarian'], preferred_proteins: ['œufs'] });
    expect(peuImporte.filter(toutVegetal).length / peuImporte.length).toBeGreaterThan(0.15);
    expect(vege.filter(toutVegetal).length / vege.length).toBeGreaterThan(0.3);
  }, 60_000);
});

describe('« répétitif » : souvent les mêmes, jamais un seul', () => {
  it('une recette ne revient pas plus de ceil(7/2) = 4 fois sur un créneau', () => {
    for (const goal of ['cut', 'maintain', 'lean_bulk'] as const) for (const seed of [0, 1, 2, 3]) {
      const meals = buildLocalPlan(fondateur({ goal, variety: 'repetitive' }), seed).meals;
      for (const t of M4) {
        const n: Record<string, number> = {};
        for (const m of meals.filter((x) => x.meal_type === t)) n[m.recipe.id] = (n[m.recipe.id] ?? 0) + 1;
        expect(Math.max(...Object.values(n)), `${goal} tirage ${seed} ${t}`).toBeLessThanOrEqual(4);
      }
    }
  }, 60_000);

  it('…y compris quand les 7 jours ont la MÊME cible (sans sport, plan de départ)', () => {
    // ⚠️ Le cas ci-dessus ne suffisait pas, et c'est une mutation qui l'a montré : avec
    // 4 séances, jours d'entraînement et de repos ont des cibles différentes, donc le
    // meilleur plat change de lui-même et ne dépasse jamais 4. Remettre l'ancienne
    // sortie anticipée (`return candidates[0]`) laissait TOUT ce fichier vert. Sans sport,
    // les sept jours sont identiques : c'est là que le même plat revenait 7 fois sur 7.
    for (const goal of ['cut', 'maintain', 'lean_bulk'] as const) {
      const p = fondateur({ goal, variety: 'repetitive', sports: [], training_days_per_week: 0 });
      const meals = buildLocalPlan(p, 0).meals;
      for (const t of M4) {
        const n: Record<string, number> = {};
        for (const m of meals.filter((x) => x.meal_type === t)) n[m.recipe.id] = (n[m.recipe.id] ?? 0) + 1;
        expect(Math.max(...Object.values(n)), `${goal} ${t} sans sport`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('…et le plan de DÉPART répétitif suit les préférences (il les ignorait)', () => {
    const meals: Meal[] = [];
    for (const goal of ['cut', 'maintain', 'lean_bulk'] as const)
      meals.push(...buildLocalPlan(fondateur({ goal, variety: 'repetitive' }), 0).meals);
    expect(meals.filter(toutVegetal).length / meals.length).toBeLessThan(0.08);
  });
});
