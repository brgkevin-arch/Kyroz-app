import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeProfile } from './helpers';
import { recalcProfile } from '../tdee';
import { buildLocalPlan, profileSignature } from '../planEngine';
import { getEffectiveRecipes, getRecipeById } from '../recipes';
import {
  GOUT_MAJORITE, REFS_NEUTRES, REFS_SALEES, REFS_SALEES_FAIBLES, REFS_SUCREES, REFS_SUCREES_FAIBLES,
  goutAImposer, goutEnregistre, goutGarantiPour, goutLu, goutRecette, quotaGout,
} from '../gout';
import { DietaryRestriction, Meal, UserProfile } from '../types';

// ── SUCRÉ OU SALÉ : la réponse se retrouve dans l'assiette (D28) ───────────────
//
// Demande fondateur (2026-09-12) : « qui mange un bol d'edamame avec du millet et du
// poivron à 8 h du matin ? » Arbitré le 2026-09-13 : deux réponses (matin, collation),
// « majorité garantie » (70 %, soit 5 sur 7), question exigée à l'inscription.
// Ce fichier garde les trois moitiés : le CLASSEMENT des recettes, la PROMESSE servie
// par le moteur, et la QUESTION posée à l'écran.

const M4 = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const RACINE = join(__dirname, '..', '..');
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

function gabarit(over: Partial<UserProfile>): UserProfile {
  return recalcProfile(makeProfile({
    sex: 'male', age: 30, weight_kg: 84, height_cm: 180,
    sports: [{ type: 'musculation', sessions_per_week: 4, minutes_per_session: 30 }], training_days_per_week: 4,
    plan_days: 7, plan_weekdays: [1, 2, 3, 4, 5, 6, 0], meals: [...M4], variety: 'max',
    dietary_restrictions: [], preferred_proteins: [], ...over,
  } as Partial<UserProfile>));
}

describe('le goût d\'une recette se lit sur ses ingrédients', () => {
  it('toute ref de petit-déjeuner ou de collation est rangée dans UNE liste', () => {
    // Une ref neuve (une vague de catalogue) rangée nulle part passerait pour neutre, et
    // ses recettes cesseraient de compter pour qui a répondu — sans que rien ne rougisse.
    const listes = [...REFS_SUCREES, ...REFS_SUCREES_FAIBLES, ...REFS_SALEES, ...REFS_SALEES_FAIBLES, ...REFS_NEUTRES];
    const vues = new Set<string>();
    for (const r of getEffectiveRecipes())
      if (r.tags.includes('breakfast') || r.tags.includes('snack'))
        for (const i of r.ingredients) if (i.ref) vues.add(i.ref);
    expect(vues.size, 'aucune ref lue : la sonde est aveugle').toBeGreaterThan(50);
    for (const ref of vues) {
      const n = listes.filter((x) => x === ref).length;
      expect(n, `« ${ref} » rangée ${n} fois`).toBe(1);
    }
  });

  it('les cas qui ont fixé les règles', () => {
    const g = (id: string) => goutRecette(getRecipeById(id)!);
    // Un marqueur FORT l'emporte sur un faible : le smoothie aux épinards reste sucré.
    expect(g('pd07'), 'smoothie mangue-épinards').toBe('sucre');
    expect(g('pd55'), 'smoothie mangue-avocat').toBe('sucre');
    expect(g('pd96'), 'sarrasin, myrtilles, érable (tahini)').toBe('sucre');
    // Marqueur faible seul : riz au lait, pain perdu.
    expect(g('pd135'), 'riz au lait').toBe('sucre');
    expect(g('pd128'), 'pain perdu').toBe('sucre');
    // Deux forts opposés : honnêtement mixte.
    expect(g('col41'), 'galettes de riz, dinde, avocat, kiwi').toBe('mixte');
    // Et le cas qui a lancé le chantier.
    expect(g('pd112'), 'bol d\'edamame au millet et poivron').toBe('sale');
  });

  it('…et la sonde sait dire les trois autres réponses', () => {
    const ing = (...refs: string[]) => ({ ingredients: refs.map((ref) => ({ name: ref, quantity_g: 1, ref })) });
    expect(goutRecette(ing('flocons_avoine', 'banane'))).toBe('sucre');
    expect(goutRecette(ing('oeuf_entier', 'tomate'))).toBe('sale');
    expect(goutRecette(ing('oeuf_entier', 'pain_complet'))).toBe('neutre');
    expect(goutRecette(ing('chataigne', 'soja_texture'))).toBe('sale');
  });
});

describe('ce qui s\'enregistre', () => {
  it('« Peu importe » s\'écrit null — une clé undefined ne part pas à Supabase', () => {
    expect(goutEnregistre('egal')).toBeNull();
    expect(goutEnregistre(null)).toBeNull();
    expect(goutEnregistre('sale')).toBe('sale');
    expect(goutLu(null)).toBeUndefined();
    expect(goutLu('salé')).toBeUndefined();
    expect(goutLu('sucre')).toBe('sucre');
  });

  it('la part garantie arrondit au-dessus, et n\'impose qu\'au dernier moment', () => {
    expect(GOUT_MAJORITE).toBe(0.7);
    expect([quotaGout(7), quotaGout(5), quotaGout(3), quotaGout(0)]).toEqual([5, 4, 3, 0]);
    expect(goutAImposer(5, 0, 7)).toBe(false);  // 5 à servir sur 7 restants : pas encore
    expect(goutAImposer(5, 2, 3)).toBe(true);   // 3 à servir sur 3 restants : maintenant
    expect(goutAImposer(5, 5, 2)).toBe(false);  // promesse tenue
  });

  it('la part est garantie partout… sauf pour un profil vegan (mesuré : 35 → 18 repas mal calibrés)', () => {
    // Retirer cette exception ne ferait rougir que le cas « régime le plus mince » plus
    // bas, et seulement sur son gabarit : ce cas garde la DÉCISION, la mesure est en D28.
    expect(goutGarantiPour([])).toBe(true);
    expect(goutGarantiPour(undefined)).toBe(true);
    expect(goutGarantiPour(['vegetarian', 'gluten_free'])).toBe(true);
    expect(goutGarantiPour(['vegan'])).toBe(false);
    expect(goutGarantiPour(['vegan', 'gluten_free'])).toBe(false);
  });

  it('changer sa réponse régénère le plan', () => {
    const p = gabarit({});
    expect(profileSignature({ ...p, gout_petit_dej: 'sale' })).not.toBe(profileSignature(p));
    expect(profileSignature({ ...p, gout_collation: 'sucre' })).not.toBe(profileSignature(p));
    // « Peu importe » répondu et question jamais posée servent la même semaine.
    expect(profileSignature({ ...p, gout_petit_dej: null })).toBe(profileSignature(p));
  });
});

describe('la promesse servie : 70 % du créneau dans le goût choisi', () => {
  const part = (meals: Meal[], type: string, gout: string) => {
    const l = meals.filter((m) => m.meal_type === type);
    return l.filter((m) => goutRecette(m.recipe) === gout).length / l.length;
  };

  for (const [gout, champ, type] of [
    ['sale', 'gout_petit_dej', 'breakfast'], ['sucre', 'gout_petit_dej', 'breakfast'],
    ['sale', 'gout_collation', 'snack'], ['sucre', 'gout_collation', 'snack'],
  ] as const) {
    it(`${champ} = ${gout} → au moins 70 % de ${type} ${gout} (omnivore sans régime, 3 objectifs × 4 tirages)`, () => {
      for (const goal of ['cut', 'maintain', 'lean_bulk'] as const) for (const seed of [0, 1, 2, 3]) {
        const meals = buildLocalPlan(gabarit({ goal, [champ]: gout }), seed).meals;
        const p = part(meals, type, gout);
        expect(p, `${goal} tirage ${seed} : ${(100 * p).toFixed(0)} %`).toBeGreaterThanOrEqual(GOUT_MAJORITE);
      }
    }, 60_000);
  }

  // Part moyenne de petits-déjeuners salés quand on répond « salé », et semaines ratées.
  const salePdj = (over: Partial<UserProfile>) => {
    let somme = 0, ratees = 0, k = 0;
    for (const goal of ['cut', 'maintain', 'lean_bulk'] as const) for (const seed of [0, 1, 2, 3]) {
      const p = part(buildLocalPlan(gabarit({ goal, ...over, gout_petit_dej: 'sale' }), seed).meals, 'breakfast', 'sale');
      somme += p; k++; if (p < GOUT_MAJORITE) ratees++;
    }
    return { moyenne: somme / k, ratees };
  };

  it('le FORÇAGE tient la promesse là où la pénalité seule ne suffit pas (végétarien sans gluten)', () => {
    // Mesuré le 2026-09-13 : sans forçage, 3 semaines sur 12 sous les 70 % pour ce profil
    // (vivier salé du matin : 25 % servi quand il répond « peu importe »). Un omnivore ne
    // le voit jamais — sa pénalité suffit — donc c'est ICI que le forçage se prouve.
    const r = salePdj({ dietary_restrictions: ['vegetarian', 'gluten_free'] });
    expect(r.ratees, `moyenne ${(100 * r.moyenne).toFixed(0)} %`).toBe(0);
  }, 60_000);

  it('un profil vegan, sans forçage, reçoit nettement plus de salé quand il le demande', () => {
    // 🔴 AMENDÉ le 2026-09-14 (D30, décision fondateur). Ce test exigeait une MAJORITÉ (60 %)
    // de petits-déjeuners salés pour un vegan sans gluten qui répond « salé ». Ses
    // petits-déjeuners salés étaient presque tous des plats du midi (millet au tofu, polenta
    // au tofu fumé), que D30 retire du matin. Question posée : sa réponse « salé » passe-t-elle
    // devant la règle du matin ? Réponse : NON, pas de plat du midi à 8 h, et une vague de
    // petits-déjeuners salés vegan « à la française » à commander.
    // Mesuré après D30 : 15,5 % de salé s'il répond « peu importe », 36,9 % s'il répond
    // « salé » (73 % avant, dont les plats du midi). La pénalité porte toujours le gain ;
    // c'est ce que ce test garde, en attendant la vague.
    const r = salePdj({ dietary_restrictions: ['vegan', 'gluten_free'] });
    let temoin = 0;
    for (const goal of ['cut', 'maintain', 'lean_bulk'] as const) for (const seed of [0, 1, 2, 3])
      temoin += part(buildLocalPlan(gabarit({ goal, dietary_restrictions: ['vegan', 'gluten_free'] }), seed).meals, 'breakfast', 'sale') / 12;
    expect(r.moyenne - temoin, `salé ${(100 * r.moyenne).toFixed(0)} %, peu importe ${(100 * temoin).toFixed(0)} %`).toBeGreaterThanOrEqual(0.15);
  }, 60_000);

  it('« majorité » veut dire majorité : une fois la part tenue, le goût cesse de peser', () => {
    // Mesuré : 81 % de salé pour un omnivore avec l'arrêt, ~92 % sans — et, sans lui, les
    // repas mal calibrés doublaient chez les véganes. Promettre 70 % et servir 92 % n'est
    // pas un bonus : c'est de la précision payée pour un goût que personne n'a demandé.
    const r = salePdj({});
    expect(r.moyenne, `moyenne ${(100 * r.moyenne).toFixed(0)} %`).toBeLessThanOrEqual(0.88);
    expect(r.ratees).toBe(0);
  }, 60_000);

  it('« peu importe » sert exactement la semaine d\'avant la question', () => {
    const avant = buildLocalPlan(gabarit({ goal: 'maintain' }), 1).meals.map((m) => m.recipe.id);
    const peuImporte = buildLocalPlan(gabarit({ goal: 'maintain', gout_petit_dej: null, gout_collation: null }), 1).meals.map((m) => m.recipe.id);
    expect(peuImporte).toEqual(avant);
  });

  it('le régime le plus mince ne reçoit PAS de repas mal calibré pour tenir la promesse', () => {
    // « Majorité garantie » = jamais un repas à drapeau pour atteindre la part : le moteur
    // ne force le goût que s'il reste une recette propre du bon goût.
    const USER = new Set(['over_target_kcal', 'under_target_kcal', 'protein_below_target']);
    const drapeaux = (over: Partial<UserProfile>) => {
      let n = 0;
      for (const goal of ['cut', 'maintain'] as const) for (const seed of [0, 1, 2, 3])
        for (const m of buildLocalPlan(gabarit({ goal, sex: 'female', weight_kg: 55, height_cm: 162, ...over }), seed).meals)
          for (const f of m.adapt_flags ?? []) if (USER.has(f)) n++;
      return n;
    };
    // ⚠️ ÉCART TOLÉRÉ +1 → +3 le 2026-09-14 (D30), et ce n'est pas le salé qui a empiré :
    // mesuré sur ce gabarit, « salé » vaut 6 repas mal calibrés AVANT comme APRÈS D30. C'est
    // le TÉMOIN qui s'est amélioré (6 → 3) : les règles de lecture humaine écartent au
    // petit-déjeuner et à la collation des plats qui débordaient. Garder +1 aurait rendu ce
    // test rouge parce qu'autre chose va mieux (même piège que varieteFamille, 2026-08-06).
    const regime: DietaryRestriction[] = ['vegan', 'gluten_free'];
    const temoin = drapeaux({ dietary_restrictions: regime });
    const sale = drapeaux({ dietary_restrictions: regime, gout_petit_dej: 'sale', gout_collation: 'sale' });
    expect(sale, `témoin ${temoin}, salé ${sale}`).toBeLessThanOrEqual(temoin + 3);
  }, 60_000);
});

describe('la question est posée, et on ne peut pas la sauter', () => {
  const onboarding = sansCommentaires(readFileSync(join(RACINE, 'app/(auth)/onboarding.tsx'), 'utf8'));
  const profil = sansCommentaires(readFileSync(join(RACINE, 'app/(tabs)/profil.tsx'), 'utf8'));
  const harnais = sansCommentaires(readFileSync(join(RACINE, 'test/_harness.mjs'), 'utf8'));

  it('l\'étape 6 exige les deux réponses, « Peu importe » compris', () => {
    expect(onboarding).toMatch(/const goutsValid = goutPdj !== null && goutCollation !== null/);
    expect(onboarding).toMatch(/step === 6 && preferencesValid && goutsValid/);
    expect(onboarding).toMatch(/gout_petit_dej: goutEnregistre\(goutPdj\)/);
    expect(onboarding).toMatch(/gout_collation: goutEnregistre\(goutCollation\)/);
  });

  it('le Profil permet de changer d\'avis — et écrit null, pas undefined', () => {
    expect(profil).toMatch(/gout_petit_dej: goutEnregistre\(goutPdj\)/);
    expect(profil).toMatch(/gout_collation: goutEnregistre\(goutCol\)/);
  });

  it('le harnais QA répond à TOUS les « Peu importe » de l\'étape 6', () => {
    // `npm test` resterait vert si le harnais s'arrêtait à l'étape 6 : il n'en fait pas
    // partie. Même famille que le sexe (#214) et les protéines (#228).
    expect(harnais).toMatch(/getByText\('Peu importe', \{ exact: true \}\)/);
  });
});
