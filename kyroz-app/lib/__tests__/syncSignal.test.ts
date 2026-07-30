// ── PHASE D : l'échec de synchro est-il devenu AUDIBLE ? ─────────────────────
//
// Ce fichier ne teste pas ce que fait la synchro (c'est `sync.test.ts`), il teste ce
// qu'elle DIT quand elle échoue. Deux exigences, et la seconde compte autant que la
// première :
//
//   1. le message existe, et il est lisible à froid : quel domaine, quelle colonne,
//      et l'hypothèse « migration non jouée » quand c'est le cas ;
//   2. RIEN d'autre n'a changé — mêmes valeurs de retour, best-effort toujours
//      best-effort. On a ajouté du signal, pas transformé un push en opération
//      bloquante. C'est la partie « ne casse rien » du contrat, et elle est testée.
//
// Le mock du client est volontairement RECOPIÉ depuis sync.test.ts plutôt que
// factorisé : ne pas toucher aux 47 tests de caractérisation déjà en place.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Call = { table: string; op: string; payload?: any };

const state = {
  uid: 'user-1' as string | null,
  rows: {} as Record<string, any>,
  errors: {} as Record<string, any>,
  throws: new Set<string>() as any,
  calls: [] as Call[],
  functionsError: null as any,
};

function builder(table: string) {
  let result: any = { data: null, error: null };
  const b: any = {};
  const record = (op: string) => (payload?: any) => {
    state.calls.push({ table, op, payload });
    const key = `${table}.${op}`;
    if (state.throws.has(key)) throw new Error(`mock: ${key} a jeté`);
    if (op === 'select') result = { data: state.rows[table] ?? null, error: null };
    else if (op === 'upsert' || op === 'insert' || op === 'delete') {
      result = { data: null, error: state.errors[key] ?? null };
    }
    return b;
  };
  b.select = record('select');
  b.upsert = record('upsert');
  b.insert = record('insert');
  b.delete = record('delete');
  b.eq = record('eq');
  b.not = record('not');
  b.maybeSingle = () => Promise.resolve(result);
  b.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
  return b;
}

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => builder(table),
    auth: {
      getSession: async () => ({
        data: { session: state.uid ? { user: { id: state.uid } } : null },
      }),
    },
    functions: { invoke: async () => ({ error: state.functionsError }) },
  },
}));

import {
  deleteCloudData,
  markProfileDirty,
  pushFavorites,
  pushPantry,
  pushProfile,
  pushRecipeOverrides,
  pushStreak,
  pushWeights,
  unknownColumnOf,
} from '../sync';
import type { Streak, UserProfile } from '../types';

/** Erreur PostgREST telle qu'elle arrive quand la migration n'est pas jouée. */
const PGRST204 = {
  code: 'PGRST204',
  message: "Could not find the 'neat_level' column of 'profiles' in the schema cache",
};
const RESEAU = { message: 'Network request failed' };

const profile = (over: Partial<UserProfile> = {}): UserProfile =>
  ({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, goal: 'cut', macro_mode: 'auto', ...over } as UserProfile);
const streak: Streak = { current_streak_days: 3, longest_streak_days: 5, last_active_date: '2026-07-29' };

let warn: ReturnType<typeof vi.spyOn>;
/** Tous les messages journalisés, concaténés — pratique pour chercher un fragment. */
const logged = () => warn.mock.calls.map((c: any[]) => String(c[0])).join('\n');

beforeEach(async () => {
  await AsyncStorage.clear();
  state.uid = 'user-1';
  state.rows = {};
  state.errors = {};
  state.throws = new Set<string>();
  state.calls = [];
  state.functionsError = null;
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('unknownColumnOf — distinguer « colonne inconnue » du reste', () => {
  it('reconnaît PGRST204 et nomme la colonne', () => {
    expect(unknownColumnOf(PGRST204)).toBe('neat_level');
  });

  it('reconnaît le code Postgres 42703 (undefined_column)', () => {
    expect(unknownColumnOf({ code: '42703', message: 'column "engine_rev" does not exist' }))
      .toBe('engine_rev');
  });

  it('reconnaît la forme du message même sans code', () => {
    expect(unknownColumnOf({ message: "Could not find the 'goal_target' column" }))
      .toBe('goal_target');
  });

  it('renvoie null sur une erreur d’une AUTRE nature — c’est tout l’intérêt', () => {
    expect(unknownColumnOf(RESEAU)).toBeNull();
    expect(unknownColumnOf({ code: '42501', message: 'permission denied' })).toBeNull();
    expect(unknownColumnOf(null)).toBeNull();
    expect(unknownColumnOf(undefined)).toBeNull();
  });

  it('reconnaît le cas mais sans nom extractible → « (non nommée) », jamais null', () => {
    expect(unknownColumnOf({ code: 'PGRST204', message: 'schema cache miss' })).toBe('(non nommée)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pushProfile — le mode de panne « migration non jouée » est nommé', () => {
  it('les deux tentatives échouent : colonne, hypothèse migration, et interruption', async () => {
    state.errors['profiles.upsert'] = PGRST204;

    await pushProfile(profile());

    const out = logged();
    expect(out).toContain('neat_level');
    expect(out).toContain('MIGRATION NON JOUÉE');
    expect(out).toContain('INTERROMPUE');
    expect(out).toContain('profil');
  });

  it('erreur d’une autre nature : PAS d’hypothèse migration, et AUCUNE nouvelle tentative', async () => {
    state.errors['profiles.upsert'] = RESEAU;

    await expect(pushProfile(profile())).resolves.toBe(false);

    const out = logged();
    expect(out).not.toContain('MIGRATION NON JOUÉE');
    expect(out).toContain('Network request failed');
    expect(out).toContain("n'est PAS une colonne manquante");
    // Le retry ne vise QUE la colonne manquante : sur une panne réseau il refaisait un
    // appel voué au même échec. Un seul upsert, donc.
    expect(state.calls.filter((c) => c.table === 'profiles' && c.op === 'upsert')).toHaveLength(1);
  });

  it('colonne manquante : la nouvelle tentative a bien lieu (2 upserts)', async () => {
    state.errors['profiles.upsert'] = PGRST204;

    await expect(pushProfile(profile())).resolves.toBe(false);

    expect(state.calls.filter((c) => c.table === 'profiles' && c.op === 'upsert')).toHaveLength(2);
  });

  it('le retry conditionnel ne change NI la valeur de retour NI le drapeau « sale »', async () => {
    // C'est la garantie du changement : seul un appel réseau inutile disparaît.
    for (const err of [RESEAU, PGRST204]) {
      await AsyncStorage.clear();
      await markProfileDirty();
      state.errors['profiles.upsert'] = err;

      await expect(pushProfile(profile())).resolves.toBe(false);
      expect(await AsyncStorage.getItem('@kyroz:profilePending')).toBe('1');
    }
  });

  it('retry réussi : l’écriture PARTIELLE est annoncée, colonnes nommées', async () => {
    let n = 0;
    const orig = state.calls.push.bind(state.calls);
    state.calls.push = ((c: Call) => {
      if (c.table === 'profiles' && c.op === 'upsert') {
        if (++n === 1) state.errors['profiles.upsert'] = PGRST204;
        else delete state.errors['profiles.upsert'];
      }
      return orig(c);
    }) as any;

    await pushProfile(profile());
    state.calls.push = orig as any;

    const out = logged();
    expect(out).toContain('PARTIELLEMENT');
    for (const c of ['neat_level', 'engine_rev', 'engine_notice']) expect(out).toContain(c);
    expect(out).toContain('jouer la migration');
  });

  it('succès du premier coup : AUCUN log — pas de bruit sur le chemin normal', async () => {
    await pushProfile(profile());

    expect(warn).not.toHaveBeenCalled();
  });

  it('une exception est nommée comme telle', async () => {
    state.throws.add('profiles.upsert');

    await pushProfile(profile());

    expect(logged()).toContain('exception');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('les cinq pushs muets ont retrouvé une voix', () => {
  const cas: { nom: string; libelle: string; run: () => Promise<void>; key: string }[] = [
    { nom: 'série', libelle: 'série', key: 'streaks.upsert', run: () => pushStreak(streak) },
    { nom: 'garde-manger', libelle: 'garde-manger', key: 'pantry.upsert', run: () => pushPantry([]) },
    { nom: 'poids', libelle: 'suivi du poids', key: 'weight_logs.upsert', run: () => pushWeights([]) },
    { nom: 'recettes perso', libelle: 'recettes personnalisées', key: 'recipe_overrides.upsert', run: () => pushRecipeOverrides({}) },
    { nom: 'favoris', libelle: 'favoris', key: 'favorites.upsert', run: () => pushFavorites(['rep1']) },
  ];

  for (const c of cas) {
    it(`${c.nom} : une erreur est journalisée, domaine nommé en clair`, async () => {
      state.errors[c.key] = PGRST204;

      await c.run();

      expect(logged()).toContain(c.libelle);
      expect(logged()).toContain('MIGRATION NON JOUÉE');
    });

    it(`${c.nom} : succès → silence`, async () => {
      await c.run();

      expect(warn).not.toHaveBeenCalled();
    });
  }

  it('favoris : un échec d’écriture dit que RIEN n’a été retiré', async () => {
    state.errors['favorites.upsert'] = RESEAU;

    await pushFavorites(['rep1', 'rep2']);

    const out = logged();
    expect(out).toContain('Aucun retrait tenté');
    expect(out).toContain("rien n'est perdu");
  });

  it('favoris : un échec de RETRAIT dit que la conséquence est bornée', async () => {
    state.errors['favorites.delete'] = RESEAU;

    await pushFavorites(['rep1']);

    expect(logged()).toContain('Aucune perte');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('effacement RGPD — un effacement incomplet ne passe plus inaperçu', () => {
  it('une table en erreur : le risque RGPD est nommé', async () => {
    state.errors['weight_logs.delete'] = RESEAU;

    await deleteCloudData();

    const out = logged();
    expect(out).toContain('weight_logs');
    expect(out).toContain('RGPD');
    expect(out).toContain('SUBSISTER');
  });

  it('une exception : la table fautive est nommée, et un récapitulatif conclut', async () => {
    state.throws.add('recipe_overrides.delete');

    await deleteCloudData();

    const out = logged();
    expect(out).toContain('recipe_overrides');
    expect(out).toContain('effacement RGPD INCOMPLET');
    expect(out).toContain('1/6');
    expect(out).toContain('Les autres ont bien été effacées');
  });

  it('plusieurs tables en échec : le récapitulatif les compte toutes', async () => {
    state.errors['pantry.delete'] = RESEAU;
    state.throws.add('streaks.delete');

    await deleteCloudData();

    expect(logged()).toContain('2/6');
  });

  it('effacement complet → silence', async () => {
    await deleteCloudData();

    expect(warn).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// La moitié « ne casse rien » du contrat. Ajouter du signal ne doit RIEN changer
// d'observable : mêmes valeurs de retour, aucune exception qui s'échappe, et le
// best-effort reste best-effort.
describe('invariance : le flux de contrôle n’a pas bougé', () => {
  it('pushProfile renvoie toujours true/false selon le même critère', async () => {
    await expect(pushProfile(profile())).resolves.toBe(true);

    state.errors['profiles.upsert'] = PGRST204;
    await expect(pushProfile(profile())).resolves.toBe(false);

    state.throws.add('profiles.upsert');
    await expect(pushProfile(profile())).resolves.toBe(false);

    state.uid = null;
    await expect(pushProfile(profile())).resolves.toBe(false);
  });

  it('les pushs void restent void et ne jettent jamais, même en erreur', async () => {
    state.errors['streaks.upsert'] = PGRST204;
    state.errors['pantry.upsert'] = RESEAU;
    state.errors['weight_logs.upsert'] = PGRST204;
    state.errors['recipe_overrides.upsert'] = RESEAU;
    state.errors['favorites.insert'] = PGRST204;

    await expect(pushStreak(streak)).resolves.toBeUndefined();
    await expect(pushPantry([])).resolves.toBeUndefined();
    await expect(pushWeights([])).resolves.toBeUndefined();
    await expect(pushRecipeOverrides({})).resolves.toBeUndefined();
    await expect(pushFavorites(['rep1'])).resolves.toBeUndefined();
    await expect(deleteCloudData()).resolves.toBeUndefined();
  });

  it('un push en échec laisse toujours le drapeau « sale » levé (protection intacte)', async () => {
    await markProfileDirty();
    state.errors['profiles.upsert'] = PGRST204;

    await pushProfile(profile());

    expect(await AsyncStorage.getItem('@kyroz:profilePending')).toBe('1');
  });

  it('les erreurs n’ajoutent AUCUN appel réseau (ni retry, ni file d’attente)', async () => {
    state.errors['pantry.upsert'] = PGRST204;

    await pushPantry([]);

    expect(state.calls.filter((c) => c.table === 'pantry')).toHaveLength(1);
  });

  // Un défaut de journalisation ne doit pas casser un chemin best-effort : c'est la
  // raison du try/catch autour de chaque `console.warn`. Sans lui, un environnement
  // où `console.warn` jette (ou est remplacé par un transport cassé) transformerait un
  // push best-effort en exception — exactement ce que la phase D devait éviter.
  it('si console.warn JETTE, le push se termine quand même normalement', async () => {
    warn.mockImplementation(() => { throw new Error('transport de log cassé'); });
    state.errors['profiles.upsert'] = PGRST204;

    await expect(pushProfile(profile())).resolves.toBe(false);

    state.errors['streaks.upsert'] = PGRST204;
    await expect(pushStreak(streak)).resolves.toBeUndefined();
  });
});
