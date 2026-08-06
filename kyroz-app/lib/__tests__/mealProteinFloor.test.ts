import { describe, it, expect } from 'vitest';
import { buildLocalPlan, computeDistribution } from '../planEngine';
import { recalcProfile } from '../tdee';
import { MEAL_ORDER, UserProfile } from '../types';

/**
 * Plancher protéique par repas (`PROT_SHARE_FLOOR`, 2026-08-02).
 *
 * La cible protéique d'un repas se calcule sur le budget RESTANT : chaque repas qui
 * dépasse sa part rogne celle des suivants, et le DERNIER servi (la collation, dernière
 * de `MEAL_ORDER`) encaisse toute la dérive. Mesuré avant correctif sur un gabarit en
 * prise de masse : part équitable 12,7 g, cible réellement servie **5,4 g** — une densité
 * de 1,7 g de protéines pour 100 kcal qu'aucune collation ne peut viser. Le moteur
 * réclamait alors 47 g de glucides pour 311 kcal, la recette débordait en calories, et
 * 35 collations sur 79 étaient jugées « trop grosses » pour ce profil.
 *
 * Ce test échoue si le plancher disparaît : il vise le cas le plus exposé — beaucoup de
 * calories, peu de protéines par calorie (prise de masse).
 */
const gabarit = (over: Partial<UserProfile> = {}): UserProfile => recalcProfile({
  id: 'test', sex: 'female', age: 30, weight_kg: 70, height_cm: 168,
  activity_level: 'moderate', training_days_per_week: 4,
  sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 60 }],
  neat_level: 'desk', goal: 'bulk', macro_mode: 'auto',
  tdee_kcal: 0, target_kcal: 0, target_protein_g: 0, target_carbs_g: 0, target_fat_g: 0,
  plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6],
  meals: [...MEAL_ORDER], meal_emphasis: 'even', variety: 'max',
  dietary_restrictions: [], disliked_foods: [], preferred_proteins: [],
  ...over,
} as unknown as UserProfile);

describe('plancher protéique par repas', () => {
  it('le dernier repas servi n’est pas affamé par la dérive des précédents', () => {
    const p = gabarit();
    const dist = computeDistribution([...MEAL_ORDER], 'even');
    // Part ÉQUITABLE de la collation : sa fraction du budget protéique du jour.
    const equitable = p.target_protein_g * dist.snack;
    let n = 0;
    let pire = Infinity;
    for (const seed of [0, 1, 2, 3]) {
      for (const m of buildLocalPlan(p, seed).meals) {
        if (m.meal_type !== 'snack') continue;
        // La cible visée par le moteur, reconstruite : servi − écart résiduel.
        const cible = m.macros.protein_g - (m.adapt_gap?.protein_g ?? 0);
        pire = Math.min(pire, cible);
        n++;
      }
    }
    expect(n, 'collations mesurées').toBeGreaterThan(20);
    // Le plancher vaut 0,7 × part équitable ; on contrôle à 0,6 pour laisser
    // respirer les arrondis de la grille de portions sans rien concéder au fond.
    expect(pire, `cible protéique min de la collation (équitable ${equitable.toFixed(1)} g)`)
      .toBeGreaterThan(equitable * 0.6);
  });

  it('le plancher ne fait pas exploser les protéines du jour', () => {
    // ⚠️ Mesuré des DEUX côtés avant d'écrire ce test : sur 42 jours de ce gabarit,
    // le pire jour vaut ×1,135 de la cible protéique **avec ET sans** plancher
    // (moyenne 1,074 contre 1,070). Le dépassement quotidien ne vient donc PAS du
    // plancher — il vient de recettes plus protéinées que la cible, et il préexistait.
    // Ce test est un garde-fou : si le plancher se met un jour à dériver, il casse.
    //
    // ⚠️ BORNE RELEVÉE 1,16 → 1,18 le 2026-08-03, et MESURÉE des deux côtés avant de la
    // toucher (`npm run mesure:proteine`, 21 jours) :
    //   avant  min 1,031 · médiane 1,083 · moyenne 1,084 · MAX 1,125 · 0 jour ≥ 1,16
    //   après  min 1,042 · médiane 1,083 · moyenne 1,088 · MAX 1,177 · 1 jour ≥ 1,16
    // La médiane ne bouge pas : c'est UN jour sur 21, pas une dérive. La cause n'est pas
    // le plancher (inchangé) mais le recalcul mécanique de `tags.objectif` : ce gabarit
    // est en prise de masse, et `prise_de_masse` ne décore plus 59 recettes qui n'étaient
    // pas assez caloriques pour le porter. Le départage `needMatch` oriente donc
    // correctement vers des recettes plus denses — le dépassement protéique est la
    // contrepartie, sur la macro où déborder est le moins grave.
    // ➡️ Si cette borne doit encore monter, RE-MESURER d'abord : deux hausses de suite
    // voudraient dire que la cause a changé.
    //
    // ⚠️ TROISIÈME HAUSSE, 1,18 → 1,22 le 2026-08-06 — et la cause A changé, comme la
    // ligne ci-dessus le prévoyait. Re-mesuré sur les 21 mêmes jours, en séparant les
    // jours d'entraînement des jours de repos, ce que les versions précédentes ne
    // faisaient pas :
    //   tous          min 1,031 · médiane 1,083 · moyenne 1,093 · MAX 1,198
    //   entraînement                médiane 1,115 ·                MAX 1,198
    //   repos                       médiane 1,052 ·                MAX 1,073
    // La MÉDIANE ne bouge pas d'un millième (1,083 avant comme après) : ce n'est pas une
    // dérive. Le dépassement s'est DÉPLACÉ, il n'a pas grossi. Depuis la répartition du
    // budget par volume (`lib/dailyBudget.ts`), un jour d'entraînement reçoit ~5 % de
    // calories en plus alors que la cible protéique, elle, est QUOTIDIENNE et ne bouge
    // pas (§6 : le turnover ne prend pas de jour de repos). Le moteur remplit donc ces
    // calories avec des recettes entières, qui portent de la protéine. Le jour de repos,
    // symétriquement, tombe de 1,084 à 1,052 — plus près de sa cible qu'avant.
    // ➡️ Le dépassement se concentre désormais là où déborder est le moins grave : le
    // jour où l'on s'entraîne.
    //
    // ⚠️ ET LA BORNE NE SUFFIT PLUS SEULE. Relever un MAXIMUM sans rien ajouter, c'est
    // ouvrir la porte à la dérive qu'on prétend surveiller : une vraie dégradation se
    // cacherait sous la nouvelle borne. D'où l'ajout de la MÉDIANE, serrée sur la valeur
    // mesurée — c'est elle, maintenant, le vrai garde-fou ; le maximum n'est plus qu'un
    // filet. VÉRIFIÉ PAR MUTATION, et c'est bien le plancher de ce fichier qu'elle
    // attrape : porter `PROT_SHARE_FLOOR` de 0,7 à 0,9 — la dérive exacte que ce cas
    // existe pour détecter — fait passer la médiane à 1,125 et rougir le test, alors que
    // le maximum, lui, resterait sous 1,22.
    // (Mutation essayée d'abord et qui ne marche PAS : mettre `REST_DAY_CARB_TO_FAT_SHIFT`
    // à 0 laisse les deux bornes vertes. Le cyclage glucidique ne déplace pas les
    // protéines — c'est même sa définition. Noté pour que personne ne la retente.)
    const p = gabarit();
    const ratios: number[] = [];
    for (const seed of [0, 1, 2]) {
      for (const m of buildLocalPlan(p, seed).total_macros_per_day) {
        const r = m.protein_g / p.target_protein_g;
        expect(r, `seed ${seed}`).toBeLessThan(1.22);
        ratios.push(r);
      }
    }
    ratios.sort((a, b) => a - b);
    const mediane = ratios[Math.floor(ratios.length / 2)];
    expect(ratios.length, 'jours mesurés').toBe(21);
    expect(mediane, `médiane=${mediane.toFixed(3)}`).toBeLessThan(1.10);
  });
});
