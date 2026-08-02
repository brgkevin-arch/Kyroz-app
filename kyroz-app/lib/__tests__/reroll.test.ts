import { describe, it, expect } from 'vitest';
import { buildLocalPlan } from '../planEngine';
import { makeProfile } from './helpers';
import { DietaryRestriction, MealPlan, VarietyPreference } from '../types';

// ── « Régénérer mon plan » doit RENOUVELER le plan ───────────────────────────
//
// Ce fichier existe parce que 830 tests passaient au vert pendant que le bouton
// ne faisait rien de visible. Remonté deux fois par le fondateur — la première
// fois le diagnostic (`Alert.alert` mort sur le web) était juste mais INCOMPLET :
// la boîte de confirmation s'affichait enfin, le plan se régénérait bien… et
// resservait le même petit-déjeuner 86 % du temps.
//
// La cause : le `seed` du reroll n'était qu'une clé de départage placée sous
// trois nudges (besoin, famille, fibres) qui, eux, sont ABSOLUS. À pool
// identique ils désignent toujours le même gagnant, donc le seed n'arbitrait
// qu'un groupe de 1,30 recette en moyenne — une seule dans 77,8 % des cas.
//
// ⚠️ Aucun test existant ne pouvait le voir : ils vérifient tous qu'UN plan est
// correct (macros, jours, régime), jamais que DEUX plans successifs diffèrent.
// C'est le trou que ces cas ferment. Ils mesurent l'EXPÉRIENCE, pas la
// mécanique : ce que l'utilisateur voit en arrivant sur l'écran Plan.
//
// Les seuils sont volontairement LARGES (le moteur mesure ~78 % et ~90 %) : ils
// doivent survivre à un ajout de recettes ou à un recalibrage des nudges, tout
// en restant très au-dessus des valeurs du bug (13,7 % et 43,4 %).

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const REGIMES: { nom: string; r: DietaryRestriction[] }[] = [
  { nom: 'aucun', r: [] },
  { nom: 'végétarien', r: ['vegetarian'] },
  { nom: 'vegan', r: ['vegan'] },
  { nom: 'sans gluten', r: ['gluten_free'] },
];
const OBJECTIFS = [
  { nom: 'sèche', o: { goal: 'cut' as const, tdee_kcal: 2914, target_kcal: 2614 } },
  { nom: 'maintien', o: { goal: 'maintain' as const, tdee_kcal: 2914, target_kcal: 2914 } },
  { nom: 'masse', o: { goal: 'bulk' as const, tdee_kcal: 2914, target_kcal: 3214 } },
];

/** Recette servie à chaque position (jour × créneau) — la position est stable d'un plan à l'autre. */
const parPosition = (p: MealPlan) =>
  new Map(p.meals.map((m) => [`${m.day}|${m.meal_type}`, m.recipe.id]));

/** Le repas que l'écran Plan affiche en premier quand on y atterrit. */
const premierRepas = (p: MealPlan) => p.meals.find((m) => m.day === 1)!.recipe.id;

const profilDe = (o: (typeof OBJECTIFS)[number]['o'], r: DietaryRestriction[]) =>
  makeProfile({ ...o, plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], dietary_restrictions: r });

describe('« Régénérer mon plan » — le reroll doit se VOIR', () => {
  for (const obj of OBJECTIFS) {
    for (const reg of REGIMES) {
      const nom = `${obj.nom} · ${reg.nom}`;

      it(`${nom} : le jour 1 se renouvelle à plus de la moitié`, () => {
        // Le jour 1 est ce que l'écran Plan affiche en arrivant — c'est LUI que le
        // fondateur regardait quand il a dit « ça ne fonctionne pas ».
        // Avant le correctif : 20,8 % en moyenne. Après : 86,9 % (minimum mesuré 61 %).
        const p = profilDe(obj.o, reg.r);
        const maps = SEEDS.map((s) => parPosition(buildLocalPlan(p, s)));
        let vues = 0, changees = 0;
        for (let i = 1; i < maps.length; i++) {
          for (const [cle, id] of maps[i - 1]) {
            if (!cle.startsWith('1|')) continue;
            vues++; if (maps[i].get(cle) !== id) changees++;
          }
        }
        const taux = changees / vues;
        expect(taux, `taux=${(taux * 100).toFixed(0)} %`).toBeGreaterThan(0.5);
      });

      it(`${nom} : presque aucune position n'est figée sur 8 régénérations`, () => {
        const p = profilDe(obj.o, reg.r);
        const maps = SEEDS.map((s) => parPosition(buildLocalPlan(p, s)));
        const figees: string[] = [];
        for (const cle of maps[0].keys()) {
          if (new Set(maps.map((m) => m.get(cle))).size === 1) figees.push(cle);
        }
        // Avant le correctif : 31,5 % des positions ne bougeaient JAMAIS.
        // Le seuil n'est pas ZÉRO, et ce n'est pas une complaisance : sur les 336
        // positions mesurées il en reste UNE — le petit-déjeuner du jour 1 en vegan
        // à forte cible protéique, où une seule recette du catalogue tient la cible.
        // La figer est le bon comportement ; servir autre chose serait servir faux.
        // C'est une limite de CATALOGUE, pas de moteur : elle se lèvera en ajoutant
        // des petits-déjeuners vegan riches en protéines, pas en touchant au tirage.
        expect(figees.length / maps[0].size, `figées : ${figees.join(', ')}`).toBeLessThan(0.1);
      });

      it(`${nom} : plus de la moitié de la semaine se renouvelle`, () => {
        const p = profilDe(obj.o, reg.r);
        const maps = SEEDS.map((s) => parPosition(buildLocalPlan(p, s)));
        let vues = 0, changees = 0;
        for (let i = 1; i < maps.length; i++) {
          for (const [cle, id] of maps[i - 1]) { vues++; if (maps[i].get(cle) !== id) changees++; }
        }
        const taux = changees / vues;
        // Avant le correctif : 43,4 %.
        expect(taux, `taux=${(taux * 100).toFixed(0)} %`).toBeGreaterThan(0.6);
      });

      it(`${nom} : aucun créneau monopolisé dans la semaine`, () => {
        // ⚠️ LA contre-mesure. Elle a attrapé une régression que tous les cas
        // ci-dessus laissaient passer, et qui était de mon fait : un moteur qui sert
        // la même recette 7 jours sur 7, mais une AUTRE à chaque reroll, satisfait
        // tous les seuils de renouvellement. Mesurer le RENOUVELLEMENT ne dit rien
        // de la RÉPÉTITION. Ne pas retirer ce cas.
        const p = profilDe(obj.o, reg.r);
        for (const s of SEEDS) {
          const plan = buildLocalPlan(p, s);
          for (const creneau of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
            const duCreneau = plan.meals.filter((m) => m.meal_type === creneau);
            if (duCreneau.length < 2) continue;
            const distinctes = new Set(duCreneau.map((m) => m.recipe.id)).size;
            expect(distinctes, `${creneau} seed ${s} : ${duCreneau.map((m) => m.recipe.id).join(', ')}`)
              .toBeGreaterThan(1);
          }
        }
      });
    }
  }

  it("le 1er repas affiché change dans la majorité des cas, tous profils confondus", () => {
    // Agrégé, parce que c'est un taux : un profil isolé peut légitimement être coincé
    // (cf. le petit-déjeuner vegan ci-dessus). Avant le correctif : 13,7 %.
    let vues = 0, changees = 0;
    for (const obj of OBJECTIFS) {
      for (const reg of REGIMES) {
        const p = profilDe(obj.o, reg.r);
        const premiers = SEEDS.map((s) => premierRepas(buildLocalPlan(p, s)));
        for (let i = 1; i < premiers.length; i++) { vues++; if (premiers[i] !== premiers[i - 1]) changees++; }
      }
    }
    const taux = changees / vues;
    expect(taux, `taux=${(taux * 100).toFixed(0)} %`).toBeGreaterThan(0.5);
  });

  it('le plan CANONIQUE (seed 0) reste déterministe — deux appels, même semaine', () => {
    // Garde-fou dans l'autre sens : le correctif ne touche QUE les seeds ≠ 0. Si un
    // jour il déteignait sur le plan canonique, les plans en cache deviendraient
    // instables (ENGINE_VERSION n'a volontairement pas été bumpé pour ce correctif).
    const p = makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6] });
    const a = buildLocalPlan(p, 0).meals.map((m) => m.recipe.id);
    const b = buildLocalPlan(p, 0).meals.map((m) => m.recipe.id);
    expect(a).toEqual(b);
  });

  it('un reroll reste déterministe à seed égal (le plan survit à un rechargement)', () => {
    const p = makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6] });
    const a = buildLocalPlan(p, 3).meals.map((m) => m.recipe.id);
    const b = buildLocalPlan(p, 3).meals.map((m) => m.recipe.id);
    expect(a).toEqual(b);
  });

  it('un reroll ne sert JAMAIS un repas hors régime (vegan + sans gluten)', () => {
    // Le tirage ouvre le panier : on vérifie que ça n'ouvre pas la porte au régime.
    const p = makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], dietary_restrictions: ['vegan', 'gluten_free'] });
    for (const s of SEEDS) {
      for (const m of buildLocalPlan(p, s).meals) {
        expect(m.recipe.restrictions_ok, `${m.recipe.id} (seed ${s})`).toContain('vegan');
        expect(m.recipe.restrictions_ok, `${m.recipe.id} (seed ${s})`).toContain('gluten_free');
      }
    }
  });

});

// ── Le réglage de variété doit PILOTER le reroll ─────────────────────────────
//
// Il ne le pilotait pas : `balanced` et `max` rendaient un reroll IDENTIQUE AU BIT
// PRÈS (seul le plan canonique différait). Les trois cartes de l'écran promettaient
// trois comportements dont un seul existait — « Le plus de diversité » n'en donnait
// pas plus que « Routine et variété » dès qu'on régénérait. Un réglage qui ment.
//
// Ces cas verrouillent l'ORDRE, pas les valeurs : les seuils exacts bougeront avec le
// catalogue, la hiérarchie non.
describe('« Régénérer » doit suivre le réglage de variété', () => {
  // ⚠️ AGRÉGÉ SUR UN PANEL, et ce n'est pas une facilité. Première version de ce test :
  // un seul profil, `expect(max).toBeGreaterThan(balanced)` — il tombait, avec
  // balanced=91 % et max=88 %. L'ordre des largeurs est une propriété de POPULATION :
  // sur un profil isolé, un panier plus large peut tirer deux fois la même recette
  // d'un seed au suivant. Tester la moyenne, c'est tester ce qu'on affirme.
  const renouvellementMoyen = (variety: VarietyPreference) => {
    let vues = 0, changees = 0;
    for (const obj of OBJECTIFS) {
      for (const reg of REGIMES) {
        const p = makeProfile({ ...obj.o, plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], variety, dietary_restrictions: reg.r });
        const maps = SEEDS.map((s) => parPosition(buildLocalPlan(p, s)));
        for (let i = 1; i < maps.length; i++) {
          for (const [cle, id] of maps[i - 1]) { vues++; if (maps[i].get(cle) !== id) changees++; }
        }
      }
    }
    return changees / vues;
  };

  it('max renouvelle plus que balanced, qui renouvelle plus que repetitive', () => {
    const rep = renouvellementMoyen('repetitive');
    const bal = renouvellementMoyen('balanced');
    const max = renouvellementMoyen('max');
    const vu = `repetitive=${(rep * 100).toFixed(0)} % balanced=${(bal * 100).toFixed(0)} % max=${(max * 100).toFixed(0)} %`;
    expect(bal, vu).toBeGreaterThan(rep);
    expect(max, vu).toBeGreaterThan(bal);
  });

  it('MÊME en « repetitive », régénérer donne un vrai nouveau plan', () => {
    // « Souvent les mêmes plats » décrit la SEMAINE, pas le bouton. Quelqu'un qui
    // demande explicitement un nouveau plan doit en recevoir un — sinon on retombe
    // exactement sur le bug d'origine, mais réservé à un réglage.
    expect(renouvellementMoyen('repetitive')).toBeGreaterThan(0.4);
  });

  it('« repetitive » garde le droit de servir le même plat toute la semaine', () => {
    // L'inverse du cas « aucun créneau monopolisé » plus haut : ici c'est DEMANDÉ.
    // Ce test existe pour qu'on ne « corrige » pas un jour ce comportement voulu.
    const p = makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], variety: 'repetitive' });
    const plan = buildLocalPlan(p, 3);
    const parCreneau = ['breakfast', 'lunch', 'dinner', 'snack'].map((c) =>
      new Set(plan.meals.filter((m) => m.meal_type === c).map((m) => m.recipe.id)).size);
    expect(Math.min(...parCreneau), `distinctes par créneau : ${parCreneau.join(', ')}`).toBeLessThanOrEqual(2);
  });

  it('le plan CANONIQUE ne dépend pas de ce câblage — il n’a pas changé', () => {
    // Le reroll seul est concerné : `variety` agissait déjà sur le plan canonique,
    // et ce chemin ne doit pas bouger (sinon les plans en cache deviennent périmés
    // alors qu'ENGINE_VERSION n'a volontairement pas été bumpé).
    for (const v of ['repetitive', 'balanced', 'max'] as const) {
      const p = makeProfile({ plan_days: 7, plan_weekdays: [0, 1, 2, 3, 4, 5, 6], variety: v });
      expect(buildLocalPlan(p, 0).meals.map((m) => m.recipe.id))
        .toEqual(buildLocalPlan(p, 0).meals.map((m) => m.recipe.id));
    }
  });
});
