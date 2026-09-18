import { describe, it, expect } from 'vitest';
import { buildLocalPlan, familyKey } from '../planEngine';
import { goutRecette } from '../gout';
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

/**
 * Le groupement de `familyKey`, créneau compris (les pools sont par créneau) — la clé du
 * MOTEUR, pas une copie.
 *
 * Historique : le 2026-09-14, le fondateur avait tranché que deux collations au yaourt de soja
 * à des fruits différents ne sont pas une répétition (« non, c'est normal ») ; seul CE test
 * l'avait appris (« une recette sans féculent est sa propre famille »), le moteur et
 * `mesure-variete.ts` non. Depuis le 2026-09-18, c'est `familyKey` qui le porte, plus finement :
 * sans féculent, le FRUIT fait le second axe (même fruit = clone, fruit différent = autre plat),
 * et le GOÛT sépare sucré et salé. Tout le monde lit la même clé.
 */
const cle = (r: Recipe) => `${r.tags.includes('snack') ? 'c' : r.tags.includes('breakfast') ? 'p' : 'r'}|${familyKey(r)}`;

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

  it('la clé de famille AFFINE le triplet anti-doublons R4, sans jamais le contredire', () => {
    // R4 (catalogue) compte protéine × féculent ; `familyKey` y ajoute le goût, et le fruit quand
    // il n'y a pas de féculent (2026-09-18). Deux recettes de même clé ont donc TOUJOURS le même
    // triplet R4 : le moteur ne regroupe jamais ce que le catalogue sépare.
    for (const r of getEffectiveRecipes()) {
      const P = r.ingredients.filter((i) => i.macro_role === 'protein').map((i) => i.ref).sort().join('+') || '∅';
      const C = r.ingredients.filter((i) => i.macro_role === 'carb').map((i) => i.ref).sort().join('+') || '∅';
      const F = r.ingredients.filter((i) => i.macro_role === 'fruit').map((i) => i.ref).sort().join('+') || '∅';
      const second = C !== '∅' ? C : F !== '∅' ? `fruit:${F}` : '∅';
      expect(familyKey(r), r.id).toBe(`${P}×${second}|${goutRecette(r)}`);
    }
  });

  it('même fruit sans féculent = même famille ; autre fruit ou autre goût = autre famille', () => {
    const R = getEffectiveRecipes();
    const col = (id: string) => familyKey(R.find((r) => r.id === id)!);
    // col43 (banane, chocolat, cacahuète) et la même assiette garnie autrement : même yaourt,
    // même banane — la répétition que le fondateur VOIT (col26/col53 l'étaient avant le 2026-09-18).
    const c43 = R.find((r) => r.id === 'col43')!;
    const garnieAutrement = { ...c43, id: 'clone', ingredients: c43.ingredients.map((i) => i.ref === 'chocolat_noir' ? { ...i, ref: 'graines_courge' } : i) };
    expect(familyKey(garnieAutrement)).toBe(col('col43'));
    // col39 (chia-framboises) et col54 (compote pomme-chia) : même yaourt, autre fruit — « normal ».
    expect(col('col39')).not.toBe(col('col54'));
    // pd21 (pain perdu banane) et pd87 (blancs brouillés sur pain) : même couple, goût opposé.
    expect(familyKey(R.find((r) => r.id === 'pd21')!)).not.toBe(familyKey(R.find((r) => r.id === 'pd87')!));
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
    // ⚠️ PANEL ÉLARGI AUX 12 GABARITS DE RÉFÉRENCE LE 2026-08-06, et ce n'est pas un
    // assouplissement — c'est ce que le commentaire ci-dessus dit déjà mesurer. Les TROIS
    // gabarits d'origine ne pouvaient pas porter un seuil de 15 points : sur 15 semaines,
    // UNE semaine en vaut 6,7, donc le verdict se jouait à trois plans près. Pire, l'un
    // des trois (F 55 sèche) est précisément le profil dont le vivier vegan est le plus
    // mince — il pesait un tiers de l'échantillon et décidait seul du résultat.
    //
    // Second défaut de construction, révélé par la répartition du budget par volume : le
    // seuil est RELATIF au plan régénéré, donc il se resserre quand celui-ci s'améliore.
    // Le reroll est passé de 9,4 % à 6,1 % (un progrès), ce qui abaissait mécaniquement
    // le plafond du canonique de ~24 % à ~21 %. Un garde-fou ne doit pas durcir parce
    // qu'autre chose va mieux.
    //
    // Mesuré sur le panel élargi : canonique 16,7 % contre 6,1 % au régénéré, soit
    // 10,6 points d'écart pour 15 autorisés. La marge s'est réduite (2,3 points avant la
    // répartition) : c'est réel, c'est consigné, et c'est une limite de CATALOGUE — les
    // 6 repas hors cible du canonique sont TOUS sur F 55 sèche vegan / vegan+SG, les
    // jours de repos, où aucun dîner ni collation n'est assez petit.
    const GABARITS: Partial<UserProfile>[] = [
      { sex: 'female', weight_kg: 55, height_cm: 162, goal: 'cut' },
      { sex: 'female', weight_kg: 60, height_cm: 165, goal: 'maintain' },
      { sex: 'female', weight_kg: 65, height_cm: 167, goal: 'cut' },
      { sex: 'female', weight_kg: 65, height_cm: 167, goal: 'maintain' },
      { sex: 'female', weight_kg: 70, height_cm: 168, goal: 'bulk' },
      { sex: 'female', weight_kg: 80, height_cm: 170, age: 35, goal: 'cut' },
      { sex: 'male', weight_kg: 65, height_cm: 173, goal: 'cut' },
      { sex: 'male', weight_kg: 70, height_cm: 175, goal: 'maintain' },
      { sex: 'male', weight_kg: 80, height_cm: 180, goal: 'cut' },
      { sex: 'male', weight_kg: 80, height_cm: 180, goal: 'maintain' },
      { sex: 'male', weight_kg: 95, height_cm: 183, goal: 'bulk' },
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
    // 🔴 SEUIL FIXE DEPUIS LE 2026-09-15 (décision fondateur, chantier « pas de remplissage »).
    // L'ancienne borne, « régénéré + 15 points », était RELATIVE : elle durcissait chaque fois que
    // le plan régénéré s'améliorait (défaut déjà consigné plus haut), et chaque vague de catalogue
    // redistribue le tirage du canonique — 19 à 25 repas sur 28 changent d'une version à l'autre.
    // Mesuré sur la réécriture de 104 recettes : canonique 20 % sur main, 25 % sur la branche,
    // 38 % en coupant `FAMILY_SELECT_W_CANON` ; régénéré 7 %. Ce que le test garde est la
    // DISPARITION de la pénalité (38 à 45 % de semaines avec jumelles), pas un chiffre du tirage :
    // 30 % se tient entre les deux. Rappel : le « même plat » dîner → déjeuner du lendemain (D30)
    // est UNE recette, il ne compte pas ici — seules comptent deux recettes différentes.
    const canonique = compte([0]);
    const regenere = compte([1, 2, 3]);
    expect(canonique, `canonique ${canonique.toFixed(1)} % (régénéré ${regenere.toFixed(1)} %) : la pénalité de famille au plan canonique a-t-elle disparu ?`)
      .toBeLessThanOrEqual(30);
  });

  it('le plan canonique (`repetitive`, seed 0) ignore la famille et reste déterministe', () => {
    // Il est volontairement statique : la rotation — id comme famille — n'y entre pas.
    // (Depuis v50 il suit les préférences et plafonne une recette à ceil(jours/2)
    // services, mais il reste DÉTERMINISTE : c'est ce que ce cas garde.)
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
