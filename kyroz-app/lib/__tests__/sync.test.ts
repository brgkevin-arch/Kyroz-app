// ── CARACTÉRISATION de lib/sync.ts ───────────────────────────────────────────
//
// ⚠️ RÈGLE DE CE FICHIER — lire avant d'y toucher.
//
// Ces tests décrivent le comportement ACTUEL de la synchro, y compris ce qui est
// discutable. Ils ne le corrigent pas. Un comportement jugé dangereux est documenté
// par un test qui l'ATTESTE, précédé d'un commentaire `// SUSPECT: <raison>`.
//
// Donc : si tu changes `sync.ts` et qu'un test d'ici devient rouge, ce n'est PAS
// forcément une régression — c'est peut-être exactement le changement voulu. Lis le
// `// SUSPECT:` : s'il y en a un, mets à jour le test avec le nouveau comportement.
// S'il n'y en a pas, tu as cassé quelque chose.
//
// Ce qui est HORS de ce fichier, par décision produit (2026-07-30) : le comportement
// d'écrasement des cinq domaines non protégés n'est pas un bug à corriger au passage.
// Il est décrit ici, et il sera tranché séparément.
//
// MOCK : on remplace le module `../supabase` (donc le client déjà importé par sync.ts).
// Aucune dépendance ajoutée, aucune base, aucun réseau. AsyncStorage est déjà le mock
// en mémoire de `test/asyncStorageMock.ts` (alias posé dans vitest.config.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Mock du client Supabase ──────────────────────────────────────────────────

type Call = { table: string; op: string; payload?: any };

const state = {
  uid: 'user-1' as string | null,
  /** Ce que renvoie un `select` par table. `undefined` = pas de ligne. */
  rows: {} as Record<string, any>,
  /** Erreurs à renvoyer, clé `table.op` (ex. 'favorites.insert'). */
  errors: {} as Record<string, any>,
  /** Ops qui doivent JETER (et non renvoyer { error }), clé `table.op`. */
  throws: {} as Set<string> | any,
  /** Journal de tous les appels, dans l'ordre. */
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
    if (op === 'select') {
      result = { data: state.rows[table] ?? null, error: null };
    } else if (op === 'upsert' || op === 'insert' || op === 'delete') {
      result = { data: null, error: state.errors[key] ?? null };
    }
    return b;
  };
  b.select = record('select');
  b.upsert = record('upsert');
  b.insert = record('insert');
  b.delete = record('delete');
  b.eq = record('eq');
  b.maybeSingle = () => {
    state.calls.push({ table, op: 'maybeSingle' });
    return Promise.resolve(result);
  };
  // Rend le builder awaitable : `await supabase.from('x').select().eq()` marche,
  // comme `await ....upsert({})`. C'est ce que fait le vrai client (PostgrestBuilder).
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
    functions: {
      invoke: async (name: string) => {
        state.calls.push({ table: 'functions', op: 'invoke', payload: name });
        return { error: state.functionsError };
      },
    },
  },
}));

import {
  PROFILE_COLS,
  clearProfileDirty,
  deleteAccount,
  deleteCloudData,
  hydrateFromCloud,
  markProfileDirty,
  pushFavorites,
  pushProfile,
} from '../sync';
import { PROFILE_PENDING_KEY } from '../syncGuard';
import type { UserProfile } from '../types';

// Clés d'AsyncStorage — recopiées de sync.ts, où elles sont privées. Si elles y
// changent sans changer ici, ces tests tombent : c'est voulu.
const PROFILE_KEY = '@kyroz:profile';
const STREAK_KEY = '@kyroz:streak';
const FAV_KEY = '@kyroz:favorites';
const PANTRY_KEY = '@kyroz:pantry';
const WEIGHT_KEY = '@kyroz:weights';
const OVERRIDES_KEY = '@kyroz:recipeOverrides';

const read = async (k: string) => {
  const raw = await AsyncStorage.getItem(k);
  return raw ? JSON.parse(raw) : null;
};
const write = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v));

/** Profil local minimal mais VALIDE (`sex` renseigné = « le cloud a un profil »). */
function profile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    sex: 'male', age: 30, weight_kg: 80, height_cm: 180,
    goal: 'cut', macro_mode: 'auto',
    tdee_kcal: 2600, target_kcal: 2200,
    target_protein_g: 180, target_carbs_g: 200, target_fat_g: 70,
    ...over,
  } as UserProfile;
}

/** Ligne cloud : uniquement les colonnes synchronisées, comme Postgres la rendrait. */
function cloudRow(over: Record<string, any> = {}): Record<string, any> {
  const row: Record<string, any> = { id: state.uid };
  for (const c of PROFILE_COLS) row[c] = null;
  return { ...row, sex: 'male', age: 40, weight_kg: 90, height_cm: 180, goal: 'cut', ...over };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  state.uid = 'user-1';
  state.rows = {};
  state.errors = {};
  state.throws = new Set<string>();
  state.calls = [];
  state.functionsError = null;
});

afterEach(() => vi.clearAllMocks());

const opsOn = (table: string) => state.calls.filter((c) => c.table === table).map((c) => c.op);

// ─────────────────────────────────────────────────────────────────────────────
describe('hydratation du profil — les 4 branches telles qu’orchestrées par sync.ts', () => {
  it('cloud + local NON sale → pull_cloud : le local est remplacé', async () => {
    await write(PROFILE_KEY, profile({ weight_kg: 80 }));
    state.rows.profiles = cloudRow({ weight_kg: 90 });

    await hydrateFromCloud('user-1');

    expect((await read(PROFILE_KEY)).weight_kg).toBe(90);
  });

  it('cloud + local SALE → keep_local : le local survit ET est repoussé', async () => {
    await write(PROFILE_KEY, profile({ weight_kg: 80 }));
    await markProfileDirty();
    state.rows.profiles = cloudRow({ weight_kg: 90 });

    await hydrateFromCloud('user-1');

    expect((await read(PROFILE_KEY)).weight_kg).toBe(80);
    expect(opsOn('profiles')).toContain('upsert');
  });

  it('pas de cloud + local → push_local : le local est poussé, pas touché', async () => {
    await write(PROFILE_KEY, profile({ weight_kg: 80 }));
    state.rows.profiles = null;

    await hydrateFromCloud('user-1');

    expect((await read(PROFILE_KEY)).weight_kg).toBe(80);
    expect(opsOn('profiles')).toContain('upsert');
  });

  it('ni cloud ni local → noop : aucune écriture', async () => {
    state.rows.profiles = null;

    await hydrateFromCloud('user-1');

    expect(await read(PROFILE_KEY)).toBeNull();
    expect(opsOn('profiles')).not.toContain('upsert');
  });

  it('une ligne cloud SANS `sex` ne compte pas comme un profil (hasCloud teste row.sex)', async () => {
    await write(PROFILE_KEY, profile({ weight_kg: 80 }));
    state.rows.profiles = cloudRow({ sex: null });

    await hydrateFromCloud('user-1');

    // Traité comme « pas de cloud » → push_local, le local est conservé.
    expect((await read(PROFILE_KEY)).weight_kg).toBe(80);
    expect(opsOn('profiles')).toContain('upsert');
  });

  it('les 3 réconciliations repêchent les champs cumulatifs d’une ligne cloud partielle', async () => {
    const sports = [{ type: 'muscu', sessions_per_week: 3, minutes_per_session: 60 }];
    await write(PROFILE_KEY, profile({
      sports: sports as any,
      neat_level: 'active',
      low_ea_weeks: { weeks: ['2026-07-06'], since: null } as any,
    }));
    // Ligne cloud antérieure aux migrations : ces trois colonnes sont nulles.
    state.rows.profiles = cloudRow({ sports: null, neat_level: null, low_ea_weeks: null });

    await hydrateFromCloud('user-1');

    const got = await read(PROFILE_KEY);
    expect(got.sports).toEqual(sports);              // reconcileCloudSports
    expect(got.neat_level).toBe('active');           // reconcileCloudNeat
    expect(got.low_ea_weeks.weeks).toContain('2026-07-06'); // reconcileCloudLowEaWeeks (union)
  });

  // SUSPECT: `rowToProfile` ne recopie que PROFILE_COLS. Tout champ du profil LOCAL
  // qui n'est pas une colonne synchronisée est donc PERDU à chaque pull_cloud —
  // silencieusement, et sans réconciliation comme en ont sports/neat/low_ea.
  // `is_post_menopausal` est le cas réel : LOCAL-ONLY par décision (2026-07-28), il
  // pilote le plancher d'énergie disponible des femmes non ménopausées
  // (safety.ts::isFemaleAtRisk). Le perdre RELÂCHE une protection de sécurité.
  // Aujourd'hui inerte : l'onboarding ne pose pas encore la question, donc le champ
  // est toujours undefined. Il cessera de l'être le jour où elle sera posée.
  it('SUSPECT — un champ local-only hors PROFILE_COLS est perdu au pull_cloud', async () => {
    await write(PROFILE_KEY, profile({ is_post_menopausal: true } as any));
    state.rows.profiles = cloudRow();

    await hydrateFromCloud('user-1');

    expect((await read(PROFILE_KEY)).is_post_menopausal).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('hydratation des 5 autres domaines — 3 états du cloud chacun', () => {
  // `pushOp` : l'opération d'écriture propre au domaine. Les favoris sont les SEULS
  // à ne pas faire d'`upsert` — ils passent par delete-puis-insert (cf. plus bas).
  const domains = [
    {
      nom: 'série', table: 'streaks', key: STREAK_KEY, pushOp: 'upsert',
      local: { current_streak_days: 9, longest_streak_days: 9, last_active_date: '2026-07-29' },
      cloudPlein: { current_streak_days: 3, longest_streak_days: 5, last_active_date: '2026-07-28' },
      cloudVide: { current_streak_days: 0, longest_streak_days: 0, last_active_date: null },
      fusionne: true,
      // Fusion : la dernière activité locale (29) est plus récente que celle du cloud
      // (28), donc la série EN COURS est celle du local ; le record est le max des deux.
      attenduSiCloudPlein: (v: any) => {
        expect(v.current_streak_days).toBe(9);
        expect(v.longest_streak_days).toBe(9);
        expect(v.last_active_date).toBe('2026-07-29');
      },
      attenduSiLocalGarde: (v: any) => expect(v.current_streak_days).toBe(9),
      attenduSiLocalVide: (v: any) => expect(v.current_streak_days).toBe(3),
    },
    {
      nom: 'favoris', table: 'favorites', key: FAV_KEY, pushOp: 'insert',
      local: ['rep1', 'rep2'],
      cloudPlein: [{ recipe_id: 'rep9' }],
      cloudVide: [],
      fusionne: false, // état courant : l'union rendrait le retrait impossible
      attenduSiCloudPlein: (v: any) => expect(v).toEqual(['rep9']),
      attenduSiLocalGarde: (v: any) => expect(v).toEqual(['rep1', 'rep2']),
      attenduSiLocalVide: (v: any) => expect(v).toEqual(['rep9']),
    },
    {
      nom: 'garde-manger', table: 'pantry', key: PANTRY_KEY, pushOp: 'upsert',
      local: [{ name: 'riz', quantity: 500, unit: 'g', category: 'epicerie' }],
      cloudPlein: { items: [{ name: 'avoine', quantity: 1000, unit: 'g', category: 'epicerie' }] },
      cloudVide: { items: [] },
      fusionne: false, // stock : fusionner inventerait des aliments absents du placard
      attenduSiCloudPlein: (v: any) => expect(v[0].name).toBe('avoine'),
      attenduSiLocalGarde: (v: any) => expect(v[0].name).toBe('riz'),
      attenduSiLocalVide: (v: any) => expect(v[0].name).toBe('avoine'),
    },
    {
      nom: 'poids', table: 'weight_logs', key: WEIGHT_KEY, pushOp: 'upsert',
      local: [{ date: '2026-07-01', weight_kg: 80 }, { date: '2026-07-15', weight_kg: 79 }],
      cloudPlein: { entries: [{ date: '2026-06-01', weight_kg: 84 }] },
      cloudVide: { entries: [] },
      fusionne: true,
      // Fusion par date : les 3 pesées coexistent, triées.
      attenduSiCloudPlein: (v: any) => {
        expect(v.map((e: any) => e.date)).toEqual(['2026-06-01', '2026-07-01', '2026-07-15']);
      },
      attenduSiLocalGarde: (v: any) => expect(v).toHaveLength(2),
      attenduSiLocalVide: (v: any) => expect(v.map((e: any) => e.date)).toEqual(['2026-06-01']),
    },
    {
      nom: 'recettes perso', table: 'recipe_overrides', key: OVERRIDES_KEY, pushOp: 'upsert',
      local: { rep1: { id: 'rep1', name_fr: 'local' } },
      cloudPlein: { overrides: { rep9: { id: 'rep9', name_fr: 'cloud' } } },
      cloudVide: { overrides: {} },
      fusionne: true,
      // Fusion par identifiant : les deux recettes personnalisées coexistent.
      attenduSiCloudPlein: (v: any) => expect(Object.keys(v).sort()).toEqual(['rep1', 'rep9']),
      attenduSiLocalGarde: (v: any) => expect(Object.keys(v)).toEqual(['rep1']),
      attenduSiLocalVide: (v: any) => expect(Object.keys(v)).toEqual(['rep9']),
    },
  ];

  for (const d of domains) {
    describe(d.nom, () => {
      const titre = d.fusionne
        ? 'cloud NON VIDE + local peuplé → FUSION (rien n’est perdu)'
        : 'cloud NON VIDE + local peuplé → ÉCRASEMENT du local, À DESSEIN';
      it(titre, async () => {
        await write(d.key, d.local);
        state.rows[d.table] = d.cloudPlein;

        await hydrateFromCloud('user-1');

        d.attenduSiCloudPlein(await read(d.key));
      });

      it('cloud VIDE + local peuplé → le local est CONSERVÉ et poussé', async () => {
        await write(d.key, d.local);
        state.rows[d.table] = d.cloudVide;

        await hydrateFromCloud('user-1');

        d.attenduSiLocalGarde(await read(d.key));
        expect(opsOn(d.table)).toContain(d.pushOp);
      });

      it('cloud absent + local peuplé → le local est CONSERVÉ et poussé', async () => {
        await write(d.key, d.local);
        state.rows[d.table] = null;

        await hydrateFromCloud('user-1');

        d.attenduSiLocalGarde(await read(d.key));
      });

      it('cloud NON VIDE + local vide → le cloud remplit le local', async () => {
        state.rows[d.table] = d.cloudPlein;

        await hydrateFromCloud('user-1');

        // Sans rien en local, fusionner ou écraser donne le même résultat : le cloud.
        d.attenduSiLocalVide(await read(d.key));
      });
    });
  }

  // RÉSOLU le 2026-07-30 (était : SUSPECT). L'hydratation reconstruisait l'objet avec
  // TROIS champs, donc `freeze_available` — le « bouclier de série », LOCAL-ONLY —
  // était effacé à chaque pull : le gel disparaissait en se reconnectant.
  // `mergeStreak` le préserve désormais. Test conservé en non-régression.
  it('freeze_available (local-only) SURVIT à l’hydratation de la série', async () => {
    await write(STREAK_KEY, {
      current_streak_days: 9, longest_streak_days: 9,
      last_active_date: '2026-07-29', freeze_available: false,
    });
    state.rows.streaks = { current_streak_days: 3, longest_streak_days: 5, last_active_date: '2026-07-28' };

    await hydrateFromCloud('user-1');

    expect((await read(STREAK_KEY)).freeze_available).toBe(false);
  });

  it('la série ne redescend plus à cause d’un appareil en retard', async () => {
    // Le vrai scénario : un vieux téléphone détient la ligne cloud et ramenait une
    // série de 9 jours à 3.
    await write(STREAK_KEY, { current_streak_days: 9, longest_streak_days: 9, last_active_date: '2026-07-29' });
    state.rows.streaks = { current_streak_days: 3, longest_streak_days: 5, last_active_date: '2026-07-28' };

    await hydrateFromCloud('user-1');

    const got = await read(STREAK_KEY);
    expect(got.current_streak_days).toBe(9);
    expect(got.longest_streak_days).toBe(9); // record = max des deux
  });

  it('mais un cloud PLUS RÉCENT que le local fait foi (pas de « le local gagne » aveugle)', async () => {
    await write(STREAK_KEY, { current_streak_days: 2, longest_streak_days: 4, last_active_date: '2026-07-20' });
    state.rows.streaks = { current_streak_days: 11, longest_streak_days: 11, last_active_date: '2026-07-29' };

    await hydrateFromCloud('user-1');

    const got = await read(STREAK_KEY);
    expect(got.current_streak_days).toBe(11);
    expect(got.last_active_date).toBe('2026-07-29');
  });

  // RÉSOLU le 2026-07-30 (était : SUSPECT). Le journal était remplacé EN BLOC, sans
  // déduplication par date, alors que c'est un historique cumulatif — exactement comme
  // `low_ea_weeks`, qui lui était déjà fusionné par UNION. C'était l'asymétrie entre
  // deux données de même nature qui rendait le point intenable.
  it('le journal de poids FUSIONNE par date — plus aucune pesée perdue', async () => {
    await write(WEIGHT_KEY, [
      { date: '2026-07-01', weight_kg: 80 },
      { date: '2026-07-15', weight_kg: 79 },
    ]);
    state.rows.weight_logs = { entries: [{ date: '2026-06-01', weight_kg: 84 }] };

    await hydrateFromCloud('user-1');

    const got = await read(WEIGHT_KEY);
    expect(got.map((e: any) => e.date)).toEqual(['2026-06-01', '2026-07-01', '2026-07-15']);
  });

  it('sur une même date, la valeur LOCALE l’emporte (correction saisie ici)', async () => {
    await write(WEIGHT_KEY, [{ date: '2026-07-01', weight_kg: 79.4 }]);
    state.rows.weight_logs = { entries: [{ date: '2026-07-01', weight_kg: 84 }] };

    await hydrateFromCloud('user-1');

    expect((await read(WEIGHT_KEY))[0].weight_kg).toBe(79.4);
  });

  it('la fusion est REPOUSSÉE au cloud — sinon l’autre appareil réécraserait', async () => {
    await write(WEIGHT_KEY, [{ date: '2026-07-15', weight_kg: 79 }]);
    state.rows.weight_logs = { entries: [{ date: '2026-06-01', weight_kg: 84 }] };

    await hydrateFromCloud('user-1');

    const push = state.calls.find((c) => c.table === 'weight_logs' && c.op === 'upsert');
    expect(push?.payload.entries.map((e: any) => e.date)).toEqual(['2026-06-01', '2026-07-15']);
  });

  it('rien de neuf à apporter → aucun push inutile', async () => {
    await write(WEIGHT_KEY, [{ date: '2026-06-01', weight_kg: 84 }]);
    state.rows.weight_logs = { entries: [{ date: '2026-06-01', weight_kg: 84 }] };

    await hydrateFromCloud('user-1');

    expect(opsOn('weight_logs')).not.toContain('upsert');
  });

  it('une panne sur un domaine n’empêche pas les suivants (chaque bloc a son try/catch)', async () => {
    await write(FAV_KEY, ['rep1']);
    await write(PANTRY_KEY, [{ name: 'riz', quantity: 500, unit: 'g', category: 'epicerie' }]);
    state.throws.add('streaks.select'); // la série explose
    state.rows.pantry = { items: [{ name: 'avoine', quantity: 1000, unit: 'g', category: 'epicerie' }] };

    await hydrateFromCloud('user-1');

    expect((await read(PANTRY_KEY))[0].name).toBe('avoine'); // le garde-manger a bien tourné
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pushProfile — drapeau « sale » et retry', () => {
  const dirty = async () => (await AsyncStorage.getItem(PROFILE_PENDING_KEY)) === '1';

  it('upsert accepté → true, drapeau levé', async () => {
    await markProfileDirty();

    await expect(pushProfile(profile())).resolves.toBe(true);
    expect(await dirty()).toBe(false);
  });

  it('les deux tentatives échouent → false, le profil RESTE sale (donc protégé)', async () => {
    await markProfileDirty();
    state.errors['profiles.upsert'] = { code: 'PGRST204', message: "Could not find the 'x' column" };

    await expect(pushProfile(profile())).resolves.toBe(false);
    expect(await dirty()).toBe(true);
    expect(opsOn('profiles').filter((o) => o === 'upsert')).toHaveLength(2); // tentative + retry
  });

  it('une exception est avalée → false, le profil reste sale', async () => {
    await markProfileDirty();
    state.throws.add('profiles.upsert');

    await expect(pushProfile(profile())).resolves.toBe(false);
    expect(await dirty()).toBe(true);
  });

  it('sans session → false, aucun appel réseau', async () => {
    state.uid = null;

    await expect(pushProfile(profile())).resolves.toBe(false);
    expect(state.calls.filter((c) => c.table === 'profiles')).toHaveLength(0);
  });

  it('le retry retire exactement les colonnes de la dernière migration', async () => {
    let n = 0;
    state.errors['profiles.upsert'] = { code: 'PGRST204', message: 'neat_level' };
    // On laisse la 1re échouer, on lève l'erreur juste avant la 2e.
    const rows: any[] = [];
    const orig = state.calls.push.bind(state.calls);
    state.calls.push = ((c: Call) => {
      if (c.table === 'profiles' && c.op === 'upsert') {
        rows.push(c.payload);
        if (++n === 1) state.errors['profiles.upsert'] = { code: 'PGRST204', message: 'neat_level' };
        else delete state.errors['profiles.upsert'];
      }
      return orig(c);
    }) as any;

    await pushProfile(profile({ neat_level: 'active', engine_rev: 2 } as any));
    state.calls.push = orig as any;

    expect(Object.keys(rows[0])).toContain('neat_level');
    for (const c of ['neat_level', 'engine_rev', 'engine_notice']) {
      expect(Object.keys(rows[1])).not.toContain(c);
    }
  });

  // SUSPECT: c'est LE cas qui compte. Quand la 1re tentative échoue et que le retry
  // passe, `clearProfileDirty()` s'exécute (sync.ts:97) alors que l'écriture a été
  // PARTIELLE : neat_level / engine_rev / engine_notice ne sont jamais arrivés au
  // serveur. Le profil est déclaré « propre », donc il PERD sa protection
  // anti-écrasement : à la prochaine hydratation, decideProfileHydration renvoie
  // pull_cloud et la ligne cloud incomplète revient.
  // Atténuation vérifiée : `neat_level` est repêché par reconcileCloudNeat. En
  // revanche `engine_rev` et `engine_notice` n'ont AUCUN réconciliateur — engine_rev
  // retombe silencieusement à « legacy ». Impact borné aujourd'hui (engineNoticeFor
  // exige un écart > 100 kcal, absent juste après un pull correct), donc incohérence
  // latente et non panne visible. C'est le mode de panne « migration non jouée » qui
  // s'est produit trois fois : la phase D doit le rendre BRUYANT.
  it('SUSPECT — retry réussi après échec : le profil est déclaré propre malgré une écriture partielle', async () => {
    await markProfileDirty();
    let n = 0;
    const orig = state.calls.push.bind(state.calls);
    state.calls.push = ((c: Call) => {
      if (c.table === 'profiles' && c.op === 'upsert') {
        if (++n === 1) state.errors['profiles.upsert'] = { code: 'PGRST204', message: 'neat_level' };
        else delete state.errors['profiles.upsert'];
      }
      return orig(c);
    }) as any;

    const ok = await pushProfile(profile({ neat_level: 'active', engine_rev: 2 } as any));
    state.calls.push = orig as any;

    expect(ok).toBe(true);        // succès annoncé…
    expect(await dirty()).toBe(false); // …et protection retirée…
    // …alors que 3 colonnes n'ont pas été écrites. Aucun signal, nulle part.
  });

  it('clearProfileDirty / markProfileDirty pilotent bien la clé', async () => {
    await markProfileDirty();
    expect(await dirty()).toBe(true);
    await clearProfileDirty();
    expect(await dirty()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pushFavorites — delete puis insert', () => {
  it('ordre respecté : delete AVANT insert', async () => {
    await pushFavorites(['rep1', 'rep2']);

    const ops = opsOn('favorites');
    expect(ops.indexOf('delete')).toBeLessThan(ops.indexOf('insert'));
  });

  it('liste vide → delete seul, aucun insert', async () => {
    await pushFavorites([]);

    expect(opsOn('favorites')).toContain('delete');
    expect(opsOn('favorites')).not.toContain('insert');
  });

  // SUSPECT: fenêtre de PERTE DE DONNÉES. `delete` puis `insert` sans transaction :
  // si l'insert échoue après un delete réussi, les favoris CLOUD sont effacés et rien
  // ne les restaure. Le résultat de l'insert n'est même pas lu (sync.ts:118-120), donc
  // la fonction renvoie normalement. Atténuation réelle : le local n'est pas touché,
  // donc la prochaine hydratation trouvera un cloud vide et repoussera le local — la
  // perte est réparée au prochain démarrage, pas immédiatement, et seulement si
  // l'appareil qui détient les favoris se reconnecte avant les autres.
  it('SUSPECT — insert en erreur après delete réussi : le cloud est vidé, sans signal', async () => {
    state.errors['favorites.insert'] = { message: 'insert refusé' };

    await expect(pushFavorites(['rep1', 'rep2'])).resolves.toBeUndefined();

    expect(opsOn('favorites')).toEqual(['delete', 'eq', 'insert']);
  });

  it('SUSPECT — insert qui JETTE après delete réussi : même perte, exception avalée', async () => {
    state.throws.add('favorites.insert');

    await expect(pushFavorites(['rep1'])).resolves.toBeUndefined();

    expect(opsOn('favorites')).toContain('delete');
  });

  it('sans session → aucun delete (le cloud n’est pas touché)', async () => {
    state.uid = null;

    await pushFavorites(['rep1']);

    expect(state.calls.filter((c) => c.table === 'favorites')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('suppression de compte (RGPD)', () => {
  it('deleteCloudData efface les 6 tables, profiles en dernier', async () => {
    await deleteCloudData();

    const tables = state.calls.filter((c) => c.op === 'delete').map((c) => c.table);
    expect(tables).toEqual([
      'favorites', 'pantry', 'weight_logs', 'recipe_overrides', 'streaks', 'profiles',
    ]);
  });

  it('deleteCloudData filtre par utilisateur (user_id, et id pour profiles)', async () => {
    await deleteCloudData();

    const eqs = state.calls.filter((c) => c.op === 'eq');
    expect(eqs).toHaveLength(6);
    expect(state.calls.find((c) => c.table === 'profiles' && c.op === 'eq')?.payload).toBe('id');
  });

  // SUSPECT: aucune des 6 suppressions n'est vérifiée, et le `catch {}` avale tout.
  // Si la 3e échoue, les 3 dernières ne sont même pas tentées et la fonction renvoie
  // normalement : l'appelant (profil.tsx:184, repli du droit à l'effacement RGPD)
  // croit l'effacement fait. Des données de SANTÉ peuvent rester au serveur sans
  // qu'aucun signal ne l'indique.
  it('SUSPECT — une suppression qui jette interrompt les suivantes, en silence', async () => {
    state.throws.add('weight_logs.delete');

    await expect(deleteCloudData()).resolves.toBeUndefined();

    const tables = state.calls.filter((c) => c.op === 'delete').map((c) => c.table);
    expect(tables).toEqual(['favorites', 'pantry', 'weight_logs']); // les 3 dernières sautent
    expect(tables).not.toContain('profiles');
  });

  it('deleteAccount passe par l’Edge Function et remonte son erreur', async () => {
    state.functionsError = { message: 'function non déployée' };

    await expect(deleteAccount()).resolves.toEqual({ error: 'function non déployée' });
    expect(state.calls.find((c) => c.op === 'invoke')?.payload).toBe('delete-account');
  });

  it('deleteAccount sans erreur → objet vide (c’est le seul chemin qui REMONTE une erreur)', async () => {
    await expect(deleteAccount()).resolves.toEqual({});
  });
});
