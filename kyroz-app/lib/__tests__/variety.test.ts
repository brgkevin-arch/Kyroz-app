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
    expect(cut.avg, `fibres/jour moy (cible ${cut.target})`).toBeGreaterThanOrEqual(cut.target);
    // 2. Le biais EXISTE : à budget normalisé, la sèche est plus dense que le maintien
    //    (mesuré 18,3 vs 15,5 g/1000 kcal). Sans le nudge, les deux seraient égaux.
    expect(cut.per1000, 'densité fibres sèche vs maintien').toBeGreaterThan(dens('maintain').per1000 * 1.08);
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
