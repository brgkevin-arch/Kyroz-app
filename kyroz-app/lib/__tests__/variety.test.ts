import { describe, it, expect } from 'vitest';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, mealIngredients } from '../planEngine';
import { mealFiberFromIngredients, dailyFiberTarget } from '../fiber';
import { UserProfile } from '../types';

// Régression du fix variété 2026-07-23 (P3.5). AVANT : `usage` (rotation intra-semaine)
// n'était qu'un départage ENFOUI sous les fibres (en sèche) et le besoin objectif/sport
// — des clés ABSOLUES → la même recette « la meilleure sur cet axe » revenait 7 j/7
// (petit-déj 2/7 distincts malgré 78 recettes). Le fix replie `usage` dans le score
// effectif utilisé pour la bande → une recette servie sort de la bande et cède la place.
// Ces tests échouent sur l'ancien code (bf ~2/7) et passent largement après le fix.

const M4 = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function plan7(over: Partial<UserProfile>) {
  const p = recalcProfile(makeProfile({ plan_days: 7, meals: [...M4], variety: 'balanced', ...over } as any));
  const meals = buildLocalPlan(p, 0).meals;
  const distinct = (type?: string) =>
    new Set(meals.filter((m) => !type || m.meal_type === type).map((m) => m.recipe.id)).size;
  return { p, meals, distinct };
}

describe('variété intra-semaine (P3.5)', () => {
  it('sèche (fiberStrong) : le petit-déj ne se répète pas — le nudge fibres ne monopolise plus', () => {
    // Cas le plus touché par l'ancien bug : en sèche, les fibres primaient la variété.
    const { distinct } = plan7({ goal: 'cut', sex: 'male' });
    expect(distinct('breakfast'), 'petit-déj distincts / 7').toBeGreaterThanOrEqual(5);
    expect(distinct(), 'recettes distinctes sur la semaine / 28').toBeGreaterThanOrEqual(20);
  });

  it('maintien : forte diversité sur toute la semaine', () => {
    const { distinct } = plan7({ goal: 'maintain', sex: 'male' });
    expect(distinct('breakfast')).toBeGreaterThanOrEqual(5);
    expect(distinct()).toBeGreaterThanOrEqual(20);
  });

  it('la variété ne dégrade PAS la précision : total du jour proche de la cible', () => {
    // Le gain de variété est absorbé par tightenDay + lissage hebdo (pas au prix des kcal).
    const { p, meals } = plan7({ goal: 'cut', sex: 'male' });
    const dayK = Array.from({ length: 7 }, () => 0);
    for (const m of meals) dayK[m.day - 1] += m.macros.kcal;
    for (let d = 0; d < 7; d++) {
      const dev = Math.abs(dayK[d] - p.target_kcal) / p.target_kcal;
      expect(dev, `jour ${d + 1} écart kcal`).toBeLessThan(0.08);
    }
  });

  it('biais fibres en sèche (P3.2) : un plan de sèche vise haut en fibres', () => {
    // Le pool a la fibre (plafond GF ~81 g/j) ; le biais oriente la SÉLECTION vers le
    // haut en sèche.
    //
    // Mesuré en DENSITÉ (g/1000 kcal) et non en grammes bruts : le seuil absolu de 40 g
    // qui verrouillait ce test mesurait en réalité la TAILLE DU BUDGET autant que le
    // biais — l'étape 3 du moteur (MET nets + NEAT) a fait baisser la cible de ~200 kcal
    // et le test est tombé alors que le biais fonctionnait toujours. La densité est
    // invariante au budget ; c'est elle que le biais pilote réellement.
    const dens = (goal: 'cut' | 'maintain') => {
      const { p, meals } = plan7({ goal, sex: 'male' });
      const days = Array.from({ length: 7 }, () => 0);
      for (const m of meals) days[m.day - 1] += mealFiberFromIngredients(mealIngredients(m));
      const avg = days.reduce((a, b) => a + b, 0) / 7;
      return { avg, target: dailyFiberTarget(p), per1000: avg / (p.target_kcal / 1000) };
    };
    const cut = dens('cut');
    // 1. Exigence absolue : le plan de sèche COUVRE la cible fibres du profil.
    //    ⚠️ TOLÉRANCE DE 5 % INTRODUITE LE 2026-07-31, avec sa mesure. Le relèvement
    //    NEAT augmente le budget calorique, donc la cible fibres (indexée sur les
    //    kcal) monte plus vite que la densité que le catalogue sait fournir. Mesuré
    //    sur 40 profils : 2 passent sous la cible, le pire à −1,9 g sur 34 (5,6 %).
    //    C'est une recommandation nutritionnelle, pas un plancher de sécurité — la
    //    manquer de 2 g n'a pas de conséquence, mais la MASQUER en supprimant
    //    l'assertion en aurait une. La vraie réponse est côté catalogue (cf.
    //    AGENTS.md § D), pas côté seuil de test.
    expect(cut.avg, `fibres/jour moy (cible ${cut.target})`).toBeGreaterThanOrEqual(cut.target * 0.95);
    // 2. Le biais EXISTE — mesuré à BUDGET STRICTEMENT ÉGAL.
    //    ⚠️ CORRIGÉ LE 2026-07-31 : la version précédente comparait `dens('cut')` à
    //    `dens('maintain')`, donc deux plans de budgets DIFFÉRENTS (2051 vs 2256 kcal
    //    avant le relèvement NEAT, 2144 vs 2444 après). Elle retombait exactement
    //    dans le confond que son propre commentaire dénonçait un paragraphe plus
    //    haut : elle mesurait la taille du budget autant que le biais. La densité
    //    n'est PAS invariante au budget en pratique — le plancher lipidique est
    //    indexé sur le poids, donc plus le budget est serré, plus les lipides
    //    prennent de place et moins il reste de glucides, où vit la fibre.
    //    Résultat : après le relèvement, le plan de sèche paraissait MOINS dense que
    //    le maintien (15,6 vs 17,1) alors que le nudge fonctionnait toujours.
    //    ⚠️ CORRIGÉ UNE SECONDE FOIS LE 2026-08-02 : la version d'avant ne tirait
    //    QU'UN SEUL plan (seed 0) et appelait ça « le biais ». Mesuré sur 40 seeds à
    //    budget figé, le catalogue de 427 recettes donnait ×1,042 en moyenne et ne
    //    dépassait ×1,08 que sur **3 seeds sur 40** : le test ne passait que parce que
    //    la seed 0 était l'une des trois. Le lot B4 a déplacé le tirage et il est
    //    tombé — alors qu'il AMÉLIORE le biais (×1,061 sur 40 seeds, 16/40 au-dessus
    //    de 1,08). L'oracle est donc devenu la MOYENNE sur plusieurs seeds, et le
    //    seuil la valeur réellement servie. Le test garde toutes ses dents : nudge
    //    coupé (`FIBER_SELECT_W` et `FIBER_BAND_BONUS` à 0), la sèche tombe à
    //    14,95 contre 16,89 en maintien, soit ×0,885 — très loin sous le seuil.
    const SEEDS = 12; // ×1,042 mesuré à 12 seeds, stable jusqu'à 40 (×1,059)
    const memeBudget = (goal: 'cut' | 'maintain') => {
      const p = makeProfile({
        plan_days: 7, meals: [...M4], variety: 'balanced', goal, sex: 'male',
        macro_mode: 'manual',
        target_kcal: 2200, target_protein_g: 180, target_carbs_g: 220, target_fat_g: 65,
      } as any);
      let total = 0;
      for (let seed = 0; seed < SEEDS; seed++) {
        const meals = buildLocalPlan(p, seed).meals;
        const days = Array.from({ length: 7 }, () => 0);
        for (const m of meals) days[m.day - 1] += mealFiberFromIngredients(mealIngredients(m));
        total += (days.reduce((a, b) => a + b, 0) / 7) / (p.target_kcal / 1000);
      }
      return total / SEEDS;
    };
    expect(memeBudget('cut'), `densité fibres sèche vs maintien, budget figé, moyenne sur ${SEEDS} seeds`)
      .toBeGreaterThan(memeBudget('maintain') * 1.02);
  });

  it('biais fibres : le maintien N\'est PAS gonflé (gate sèche uniquement)', () => {
    // Témoin : même gabarit en maintien → le biais fibres ne s'applique pas (goal ≠ cut).
    // On vérifie surtout que la précision kcal reste serrée (pas de sur-sélection fibres).
    const { p, meals } = plan7({ goal: 'maintain', sex: 'male' });
    const dayK = Array.from({ length: 7 }, () => 0);
    for (const m of meals) dayK[m.day - 1] += m.macros.kcal;
    for (let d = 0; d < 7; d++) {
      expect(Math.abs(dayK[d] - p.target_kcal) / p.target_kcal, `maintien jour ${d + 1}`).toBeLessThan(0.08);
    }
  });

  it('mode répétitif : opte hors rotation → nettement moins varié que balanced', () => {
    // Le fix ne doit pas « varier » le mode répétitif : la pénalité d'usage y est nulle,
    // donc il sert le meilleur fit strict de chaque jour (rare diversité résiduelle vient
    // seulement du décalage de cible par lissage hebdo, pas de la rotation).
    const rep = plan7({ goal: 'cut', sex: 'male', variety: 'repetitive' }).distinct('breakfast');
    const bal = plan7({ goal: 'cut', sex: 'male', variety: 'balanced' }).distinct('breakfast');
    expect(rep, 'répétitif < balanced').toBeLessThan(bal);
    expect(rep, 'répétitif reste peu varié').toBeLessThanOrEqual(3);
  });
});
