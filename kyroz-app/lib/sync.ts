import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Recipe, Streak, UserProfile } from './types';
import { PantryItem } from './pantry';
import { WeightEntry } from './weight';
import { decideProfileHydration, PROFILE_PENDING_KEY } from './syncGuard';

// ── Synchro AsyncStorage ⇄ Supabase ──────────────────────────────────────────
// Principe : le local reste la copie de travail (offline-first), le cloud est un
// miroir par utilisateur. À la connexion : cloud vide → on pousse le local ;
// cloud rempli → on tire le cloud (réinstallation / multi-appareils).
// Tout est best-effort : une panne réseau ne casse jamais l'usage local.
//
// Note : le PLAN n'est pas synchronisé — il est DÉTERMINISTE à partir du profil,
// donc il se régénère à l'identique sur un nouvel appareil une fois le profil tiré.

const PROFILE_KEY = '@kyroz:profile';
const STREAK_KEY = '@kyroz:streak';
const FAV_KEY = '@kyroz:favorites';
const PANTRY_KEY = '@kyroz:pantry';
const WEIGHT_KEY = '@kyroz:weights';
const OVERRIDES_KEY = '@kyroz:recipeOverrides';

// Colonnes du profil partagées entre l'app et la table `profiles`.
const PROFILE_COLS = [
  'sex', 'age', 'weight_kg', 'height_cm', 'body_fat_pct', 'activity_level', 'training_days_per_week',
  'sports',
  'goal', 'macro_mode', 'carb_ratio', 'protein_per_kg', 'tdee_kcal', 'target_kcal', 'target_protein_g', 'target_carbs_g',
  'target_fat_g', 'plan_days', 'plan_weekdays', 'rest_weekdays', 'meals', 'meal_emphasis', 'variety',
  'dietary_restrictions', 'disliked_foods', 'preferred_proteins', 'max_prep_time_min',
  'hidden_recipes',
  'weigh_in_frequency', 'fixed_meals',
] as const;

function profileToRow(p: UserProfile, uid: string): Record<string, any> {
  const row: Record<string, any> = { id: uid };
  for (const c of PROFILE_COLS) row[c] = (p as any)[c];
  return row;
}
function rowToProfile(row: any, uid: string): UserProfile {
  const p: Record<string, any> = { id: uid };
  for (const c of PROFILE_COLS) p[c] = row[c];
  return p as UserProfile;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ── Garde-fou anti-écrasement du profil (problème C) ─────────────────────────
// On marque le profil « dirty » à chaque écriture locale ; le flag n'est levé que
// par un push RÉELLEMENT réussi. Tant qu'il est dirty, le cloud ne peut pas
// l'écraser à l'hydratation (cf. decideProfileHydration dans syncGuard.ts).
export async function markProfileDirty(): Promise<void> {
  try { await AsyncStorage.setItem(PROFILE_PENDING_KEY, '1'); } catch {}
}
export async function clearProfileDirty(): Promise<void> {
  try { await AsyncStorage.removeItem(PROFILE_PENDING_KEY); } catch {}
}
async function isProfileDirty(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(PROFILE_PENDING_KEY)) === '1'; } catch { return false; }
}

// ── Pushs (appelés après chaque écriture locale, fire-and-forget) ────────────

// Renvoie true SEULEMENT si le cloud a réellement accepté l'écriture. Le client
// Supabase ne lève PAS d'exception sur une erreur SQL (ex. 400/PGRST204, colonne
// manquante) : il renvoie { error }. On le lit → un push rejeté laisse le profil
// « dirty » au lieu de faire croire à tort que la synchro a réussi.
export async function pushProfile(p: UserProfile): Promise<boolean> {
  const uid = await currentUserId(); if (!uid) return false;
  try {
    const { error } = await supabase.from('profiles').upsert(profileToRow(p, uid));
    if (error) return false;
    await clearProfileDirty();
    return true;
  } catch { return false; }
}

export async function pushStreak(s: Streak): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    await supabase.from('streaks').upsert({
      user_id: uid,
      current_streak_days: s.current_streak_days,
      longest_streak_days: s.longest_streak_days,
      last_active_date: s.last_active_date || null,
    });
  } catch {}
}

export async function pushFavorites(ids: string[]): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    await supabase.from('favorites').delete().eq('user_id', uid);
    if (ids.length) {
      await supabase.from('favorites').insert(ids.map((recipe_id) => ({ user_id: uid, recipe_id })));
    }
  } catch {}
}

export async function pushPantry(items: PantryItem[]): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try { await supabase.from('pantry').upsert({ user_id: uid, items }); } catch {}
}

export async function pushWeights(entries: WeightEntry[]): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try { await supabase.from('weight_logs').upsert({ user_id: uid, entries }); } catch {}
}

export async function pushRecipeOverrides(overrides: Record<string, Recipe>): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try { await supabase.from('recipe_overrides').upsert({ user_id: uid, overrides }); } catch {}
}

// ── Hydratation à la connexion ───────────────────────────────────────────────

export async function hydrateFromCloud(uid: string): Promise<void> {
  // PROFIL — garde-fou : un local non confirmé poussé (dirty) n'est JAMAIS écrasé
  // par le cloud (sinon un push rejeté en silence = onboarding/édition perdus).
  try {
    const { data: row } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    const local: UserProfile | null = raw ? JSON.parse(raw) : null;
    const action = decideProfileHydration({
      hasCloud: !!(row && row.sex),
      hasLocal: !!local,
      localDirty: await isProfileDirty(),
    });
    if (action === 'pull_cloud') {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(rowToProfile(row, uid)));
    } else if (local && (action === 'keep_local' || action === 'push_local')) {
      await pushProfile(local); // (re)pousse le local ; lève le flag si succès
    }
  } catch {}

  // STREAK
  try {
    const { data: row } = await supabase.from('streaks').select('*').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    const local: Streak | null = raw ? JSON.parse(raw) : null;
    if (row && row.last_active_date) {
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({
        current_streak_days: row.current_streak_days,
        longest_streak_days: row.longest_streak_days,
        last_active_date: row.last_active_date,
      }));
    } else if (local) {
      await pushStreak(local);
    }
  } catch {}

  // FAVORIS
  try {
    const { data: rows } = await supabase.from('favorites').select('recipe_id').eq('user_id', uid);
    const raw = await AsyncStorage.getItem(FAV_KEY);
    const local: string[] = raw ? JSON.parse(raw) : [];
    if (rows && rows.length) {
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(rows.map((r: any) => r.recipe_id)));
    } else if (local.length) {
      await pushFavorites(local);
    }
  } catch {}

  // GARDE-MANGER
  try {
    const { data: row } = await supabase.from('pantry').select('items').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(PANTRY_KEY);
    const local: PantryItem[] = raw ? JSON.parse(raw) : [];
    if (row && Array.isArray(row.items) && row.items.length) {
      await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(row.items));
    } else if (local.length) {
      await pushPantry(local);
    }
  } catch {}

  // SUIVI DU POIDS
  try {
    const { data: row } = await supabase.from('weight_logs').select('entries').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(WEIGHT_KEY);
    const local: WeightEntry[] = raw ? JSON.parse(raw) : [];
    if (row && Array.isArray(row.entries) && row.entries.length) {
      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(row.entries));
    } else if (local.length) {
      await pushWeights(local);
    }
  } catch {}

  // OVERRIDES DE RECETTES (recettes personnalisées)
  try {
    const { data: row } = await supabase.from('recipe_overrides').select('overrides').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(OVERRIDES_KEY);
    const local: Record<string, Recipe> = raw ? JSON.parse(raw) : {};
    if (row && row.overrides && Object.keys(row.overrides).length) {
      await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(row.overrides));
    } else if (Object.keys(local).length) {
      await pushRecipeOverrides(local);
    }
  } catch {}
}

// ── Suppression de compte (droit à l'effacement RGPD) ────────────────────────

// Suppression DÉFINITIVE via l'Edge Function `delete-account` : efface la ligne
// auth.users + toutes les données en cascade. Renvoie une erreur si la fonction
// n'est pas (encore) déployée → l'appelant peut alors retomber sur deleteCloudData.
export async function deleteAccount(): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

// Repli : efface uniquement les DONNÉES serveur de l'utilisateur (sans la ligne
// auth.users). Utile si l'Edge Function n'est pas déployée.
export async function deleteCloudData(): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    await supabase.from('favorites').delete().eq('user_id', uid);
    await supabase.from('pantry').delete().eq('user_id', uid);
    await supabase.from('weight_logs').delete().eq('user_id', uid);
    await supabase.from('recipe_overrides').delete().eq('user_id', uid);
    await supabase.from('streaks').delete().eq('user_id', uid);
    await supabase.from('profiles').delete().eq('id', uid);
  } catch {}
}
