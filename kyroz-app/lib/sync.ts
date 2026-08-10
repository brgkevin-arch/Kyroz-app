import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Recipe, Streak, UserProfile } from './types';
import { PantryItem } from './pantry';
import { WeightEntry } from './weight';
import { decideProfileHydration, normalizeGoal, normalizeMeals, normalizeMealSlots, normalizeProfileActivity, normalizeVariety, reconcileCloudSports, reconcileCloudLowEaWeeks, reconcileCloudNeat, mergeWeightEntries, mergeStreak, mergeRecipeOverrides, PROFILE_PENDING_KEY } from './syncGuard';

/** La fusion a-t-elle produit autre chose que ce que le cloud détenait ? */
const differs = (a: unknown, b: unknown): boolean => JSON.stringify(a) !== JSON.stringify(b);

/**
 * Idem pour la série, mais sur les SEULS champs synchronisés : `freeze_available` est
 * local-only, donc sa présence dans l'objet fusionné ne justifie pas un push.
 */
function syncedStreakChanged(cloud: Streak, merged: Streak): boolean {
  return differs(
    [cloud.current_streak_days, cloud.longest_streak_days, cloud.last_active_date],
    [merged.current_streak_days, merged.longest_streak_days, merged.last_active_date],
  );
}

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
//
// `export` pour le VERROU de `lib/__tests__/profileCols.test.ts` uniquement : ce test
// compare cette liste au schéma SQL réel du dépôt, et échoue si une colonne y est
// absente ou si une colonne du schéma n'est ni synchronisée ni exclue explicitement.
// Aucun autre module ne l'importe — c'est un point d'observation, pas une API.
export const PROFILE_COLS = [
  'sex', 'age', 'weight_kg', 'height_cm', 'body_fat_pct', 'activity_level', 'training_days_per_week',
  // Provenance du %MG — migration 2026-08-06_profiles_body_fat_source.sql. Elle décide
  // de la formule du BMR : sans elle en base, le cloud renverrait un profil dont le
  // moteur recalculerait la cible en Mifflin à chaque hydratation.
  'body_fat_source',
  // Date de naissance — migration 2026-08-02_profiles_birth_date.sql. `age` reste
  // synchronisée : elle est DÉRIVÉE de celle-ci quand elle existe, et reste la valeur
  // saisie pour les comptes antérieurs (cf. lib/birthday.ts).
  'birth_date',
  // Plancher d'énergie disponible (P0.1) — migration 2026-07-28_profiles_energy_availability.sql.
  // `is_post_menopausal` est VOLONTAIREMENT absent : LOCAL-ONLY et inerte tant que
  // l'onboarding ne pose pas la question (même parti pris que Streak.freeze_available).
  'low_ea_weeks',
  // Pause à la maintenance — migration 2026-08-10_profiles_deficit_weeks.sql.
  // SYNCHRONISÉ, contrairement au conseil « commencer local » de CLAUDE.md §3 : c'est
  // de l'état de moteur, pas une préférence d'appareil. Laissé en local, changer de
  // téléphone remettrait la série à zéro et rendrait jusqu'à 8 semaines de déficit
  // supplémentaires à quelqu'un que le moteur devait mettre en pause.
  'deficit_weeks',
  'sports',
  'goal', 'goal_target', 'macro_mode', 'carb_ratio', 'protein_per_kg', 'tdee_kcal', 'target_kcal', 'target_protein_g', 'target_carbs_g',
  'target_fat_g', 'plan_days', 'plan_weekdays', 'rest_weekdays', 'meals', 'meal_emphasis', 'variety',
  'dietary_restrictions', 'disliked_foods', 'preferred_proteins', 'max_prep_time_min',
  'hidden_recipes',
  'weigh_in_frequency', 'fixed_meals',
  // Créneaux de repas créés par l'utilisateur — migration 2026-08-07_profiles_meal_slots.sql.
  'meal_slots',
  // Banque de calories (Kyroz+) — migration 2026-07-30_profiles_calorie_bank.sql.
  'calorie_bank',
  // Étape 3 du moteur — migration 2026-07-28_profiles_neat_engine_rev.sql.
  'neat_level', 'engine_rev', 'engine_notice',
] as const;

// Colonnes de la DERNIÈRE migration. Si elle n'a pas encore été jouée côté Supabase,
// Postgres rejette l'upsert ENTIER (PGRST204 « column does not exist ») : ce n'est
// pas le champ manquant qu'on perd, c'est TOUT le profil qui cesse de se
// synchroniser, en silence. Ce mode de panne s'est produit trois fois.
// Le filet ci-dessous n'excuse pas de jouer la migration AVANT de déployer — il
// transforme juste « synchro morte » en « tout passe sauf ces champs-là ».
// Exporté pour que les TESTS lisent cette liste au lieu de la recopier : une
// nouvelle migration ne doit pas faire rougir un test qui décrit l'ancienne.
export const PROFILE_COLS_LAST_MIGRATION: string[] = ['meal_slots'];

// ── Signal d'échec de synchro ────────────────────────────────────────────────
//
// Un push est best-effort et le RESTE : rien dans cette section ne change un flux de
// contrôle, une valeur de retour, ni ne tente une réparation. On rend l'échec
// AUDIBLE, parce qu'il était totalement muet — cinq domaines en `catch {}` dont le
// résultat n'était même pas lu, `pushProfile` en `catch { return false }`, et aucun
// `console` dans tout le dépôt.
//
// Le cas « colonne inconnue côté serveur » est ISOLÉ des autres : il ne veut pas dire
// « le réseau a eu un hoquet », il veut dire « la migration n'est pas jouée en
// production ». C'est le mode de panne qui a coupé la synchro du profil trois fois, et
// il est indétectable côté utilisateur — l'app continue de fonctionner en local.

const LOG_PREFIX = '[kyroz:sync]';

/**
 * Nom de la colonne refusée par le serveur, ou `null` si l'erreur est d'une autre
 * nature (réseau, RLS, contrainte…).
 *
 * Deux codes possibles selon le chemin : `PGRST204` quand PostgREST ne trouve pas la
 * colonne dans son cache de schéma, `42703` (undefined_column) quand c'est Postgres
 * lui-même qui refuse. On teste aussi les messages, les codes n'étant pas garantis.
 */
export function unknownColumnOf(error: unknown): string | null {
  if (!error) return null;
  const e = error as { code?: string; message?: string };
  const msg = String(e.message ?? '');
  const isUnknownColumn =
    e.code === 'PGRST204' ||
    e.code === '42703' ||
    /could not find the .* column/i.test(msg) ||
    /column .* does not exist/i.test(msg);
  if (!isUnknownColumn) return null;
  const named = /'([^']+)'/.exec(msg) ?? /column "([^"]+)"/i.exec(msg);
  return named ? named[1] : '(non nommée)';
}

function errorSummary(error: unknown): string {
  const e = error as { code?: string; message?: string };
  const code = e?.code ? ` [${e.code}]` : '';
  return `${e?.message ?? String(error)}${code}`;
}

/**
 * Journalise un échec de synchro. Ne jette JAMAIS : un défaut de journalisation ne
 * doit pas casser un chemin best-effort (d'où le try/catch autour du `console`).
 *
 * `domain` est nommé en clair — quelqu'un qui lit un log à froid, des semaines plus
 * tard, doit savoir QUOI n'a pas été synchronisé sans ouvrir le code.
 */
function warnSyncFailure(domain: string, error: unknown, extra?: string): void {
  try {
    const col = unknownColumnOf(error);
    const cause = col
      ? `colonne « ${col} » INCONNUE côté serveur — hypothèse : MIGRATION NON JOUÉE en production`
      : `erreur : ${errorSummary(error)}`;
    console.warn(`${LOG_PREFIX} échec — ${domain} : ${cause}.${extra ? ` ${extra}` : ''}`);
  } catch {}
}

function profileToRow(p: UserProfile, uid: string): Record<string, any> {
  const row: Record<string, any> = { id: uid };
  for (const c of PROFILE_COLS) row[c] = (p as any)[c];
  return row;
}
function rowToProfile(row: any, uid: string): UserProfile {
  const p: Record<string, any> = { id: uid };
  for (const c of PROFILE_COLS) p[c] = row[c];
  // LU mais jamais poussé : `created_at` appartient au serveur. C'est l'ancre du
  // grand-père du paywall (lib/premium.ts) — un horodatage local aurait été remis
  // à zéro par une réinstallation, un drapeau local se serait recopié par la synchro.
  if (typeof row?.created_at === 'string') p.created_at = row.created_at;
  return p as UserProfile;
}

/**
 * Champs du profil LOCAL qui ne correspondent à aucune colonne synchronisée.
 *
 * `rowToProfile` reconstruit le profil à partir des seules `PROFILE_COLS`, donc tout
 * champ local-only disparaissait à chaque `pull_cloud` — silencieusement, et sans le
 * réconciliateur dont bénéficient `sports`, `neat_level` et `low_ea_weeks`.
 *
 * Le cas réel est `is_post_menopausal` : LOCAL-ONLY par décision (2026-07-28), il pilote
 * le plancher d'énergie disponible des femmes non ménopausées
 * (`safety.ts::isFemaleAtRisk`). Le perdre RELÂCHE une protection de sécurité. Il est
 * inerte tant que l'onboarding ne pose pas la question — il cessera de l'être.
 *
 * Un champ local-only ne peut par définition pas être contredit par le cloud : le
 * conserver ne peut donc jamais écraser une valeur distante plus fraîche.
 */
function localOnlyProfileFields(local: UserProfile | null): Record<string, unknown> {
  if (!local) return {};
  const synchronises = new Set<string>([...PROFILE_COLS, 'id']);
  const restants: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(local)) {
    if (!synchronises.has(cle)) restants[cle] = valeur;
  }
  return restants;
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
    if (!error) { await clearProfileDirty(); return true; }
    // Le retry ne vise QUE le rejet « colonne inconnue côté serveur » (migration pas
    // encore jouée) : mieux vaut un profil synchronisé à trois champs près qu'un profil
    // qui ne se synchronise plus du tout (cf. PROFILE_COLS_LAST_MIGRATION).
    //
    // Il était auparavant INCONDITIONNEL, donc il se déclenchait aussi sur une panne
    // réseau ou un refus RLS — cas où retirer trois colonnes ne peut rien changer : on
    // refaisait un appel voué au même échec, et le « retry » ne voulait plus rien dire.
    // On sort donc tôt sur toute autre cause. La valeur de retour est la même (`false`)
    // et le profil reste « à pousser » dans les deux cas : ce qui change, c'est un
    // appel réseau inutile en moins et un log qui dit la vraie cause.
    const missingColumn = unknownColumnOf(error);
    if (!missingColumn) {
      warnSyncFailure(
        'profil',
        error,
        'Aucune nouvelle tentative : la cause n\'est PAS une colonne manquante, retirer des colonnes n\'y changerait rien. Le profil reste marqué « à pousser » et se retentera au prochain enregistrement.',
      );
      return false;
    }
    warnSyncFailure(
      'profil (1re tentative)',
      error,
      `Nouvelle tentative sans les colonnes de la dernière migration (${PROFILE_COLS_LAST_MIGRATION.join(', ')}).`,
    );
    const row = profileToRow(p, uid);
    for (const c of PROFILE_COLS_LAST_MIGRATION) delete row[c];
    const retry = await supabase.from('profiles').upsert(row);
    if (retry.error) {
      warnSyncFailure(
        'profil (2e tentative)',
        retry.error,
        'La synchro du PROFIL est INTERROMPUE. Le profil reste marqué « à pousser », donc le cloud ne l\'écrasera pas ; il se retentera au prochain enregistrement.',
      );
      return false;
    }
    // Le retry a réussi, donc l'écriture a été PARTIELLE : les colonnes ci-dessous ne
    // sont jamais arrivées au serveur.
    //
    // Le profil reste donc « à pousser » (2026-07-30). Il était auparavant déclaré
    // « propre » ici, ce qui lui retirait sa protection anti-écrasement : à
    // l'hydratation suivante, `decideProfileHydration` renvoyait `pull_cloud` et la
    // ligne cloud INCOMPLÈTE revenait écraser le local. `neat_level` était repêché par
    // `reconcileCloudNeat`, mais `engine_rev` et `engine_notice` n'ont aucun
    // réconciliateur : la révision du moteur retombait silencieusement à « legacy ».
    //
    // Le garder sale a exactement l'effet voulu : le local (complet) gagne à
    // l'hydratation, et le push se retentera à chaque enregistrement — jusqu'à ce que
    // la migration soit jouée, moment où il passera enfin en entier.
    //
    // On renvoie `false` : le contrat de cette fonction est « true SEULEMENT si le
    // cloud a réellement accepté l'écriture ». Une écriture amputée de trois colonnes
    // ne l'a pas été. (Aucun appelant ne lit ce retour — vérifié — donc le changement
    // se limite à rendre la valeur honnête.)
    try {
      console.warn(
        `${LOG_PREFIX} profil synchronisé PARTIELLEMENT — colonnes NON écrites : ` +
          `${PROFILE_COLS_LAST_MIGRATION.join(', ')}. Le profil reste marqué « à pousser » ` +
          '(donc protégé de l\'écrasement cloud) : jouer la migration en production.',
      );
    } catch {}
    return false;
  } catch (e) {
    warnSyncFailure('profil (exception)', e, 'Le profil reste marqué « à pousser ».');
    return false;
  }
}

// Les cinq pushs ci-dessous restent `void` et best-effort : on LIT désormais le
// `{ error }` qu'ils ignoraient, uniquement pour le journaliser. Aucun early return
// ajouté, aucune valeur de retour changée.

export async function pushStreak(s: Streak): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    const { error } = await supabase.from('streaks').upsert({
      user_id: uid,
      current_streak_days: s.current_streak_days,
      longest_streak_days: s.longest_streak_days,
      last_active_date: s.last_active_date || null,
    });
    if (error) warnSyncFailure('série', error);
  } catch (e) { warnSyncFailure('série (exception)', e); }
}

/**
 * Favoris : ÉCRIRE D'ABORD, RETIRER ENSUITE (2026-07-30).
 *
 * L'ordre inverse — `delete` puis `insert`, sans transaction — ouvrait une fenêtre de
 * PERTE : un insert en échec après un delete réussi laissait les favoris du cloud
 * effacés, et son résultat n'était même pas lu.
 *
 * Ici la liste cloud n'est JAMAIS vide à un instant donné : l'`upsert` (la table a pour
 * clé primaire `(user_id, recipe_id)`, donc pas de migration nécessaire) ajoute les
 * favoris courants, puis le `delete` ne retire que ceux qui n'y sont plus. Si cette
 * seconde étape échoue, le pire est un favori en TROP — visible, corrigeable d'un tap —
 * là où l'ancien ordre pouvait vider la liste.
 */
export async function pushFavorites(ids: string[]): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    if (!ids.length) {
      // Aucun favori : le vidage complet est ici la sémantique voulue, pas un accident.
      const vide = await supabase.from('favorites').delete().eq('user_id', uid);
      if (vide.error) warnSyncFailure('favoris (vidage)', vide.error);
      return;
    }
    const up = await supabase
      .from('favorites')
      .upsert(ids.map((recipe_id) => ({ user_id: uid, recipe_id })));
    if (up.error) {
      // On s'arrête là : retirer sans avoir réussi à écrire recréerait exactement la
      // fenêtre qu'on vient de fermer.
      warnSyncFailure('favoris (écriture)', up.error, 'Aucun retrait tenté : le cloud garde son état précédent, rien n\'est perdu.');
      return;
    }
    // Les identifiants viennent de notre propre catalogue (`lib/recipeMap.ts`), donc
    // alphanumériques. Un identifiant exotique ferait échouer ce filtre → journalisé,
    // et le pire reste un favori obsolète au cloud.
    const liste = `(${ids.map((i) => `"${i}"`).join(',')})`;
    const del = await supabase.from('favorites').delete().eq('user_id', uid).not('recipe_id', 'in', liste);
    if (del.error) {
      warnSyncFailure('favoris (retrait des anciens)', del.error, 'Conséquence bornée : un favori retiré peut rester au cloud. Aucune perte.');
    }
  } catch (e) {
    warnSyncFailure('favoris (exception)', e, 'Conséquence bornée : le cloud garde son état précédent ou un favori en trop. Aucune perte.');
  }
}

export async function pushPantry(items: PantryItem[]): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    const { error } = await supabase.from('pantry').upsert({ user_id: uid, items });
    if (error) warnSyncFailure('garde-manger', error);
  } catch (e) { warnSyncFailure('garde-manger (exception)', e); }
}

export async function pushWeights(entries: WeightEntry[]): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    const { error } = await supabase.from('weight_logs').upsert({ user_id: uid, entries });
    if (error) warnSyncFailure('suivi du poids', error);
  } catch (e) { warnSyncFailure('suivi du poids (exception)', e); }
}

export async function pushRecipeOverrides(overrides: Record<string, Recipe>): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  try {
    const { error } = await supabase.from('recipe_overrides').upsert({ user_id: uid, overrides });
    if (error) warnSyncFailure('recettes personnalisées', error);
  } catch (e) { warnSyncFailure('recettes personnalisées (exception)', e); }
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
      // fix P3.3 (sports) + P0.1 (registre d'énergie basse) : une ligne cloud partielle
      // ne doit effacer NI les séances NI l'historique d'exposition — deux champs
      // cumulatifs, non re-dérivables depuis le reste du profil.
      const cloud = reconcileCloudNeat(
        reconcileCloudLowEaWeeks(reconcileCloudSports(rowToProfile(row, uid), local), local),
        local,
      );
      // Les champs local-only d'abord, la ligne cloud PAR-DESSUS : le cloud reste
      // maître de tout ce qu'il connaît, et seuls les champs qu'il ne porte pas
      // survivent (cf. localOnlyProfileFields).
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({
        ...localOnlyProfileFields(local),
        // ⚠️ `normalizeMealSlots` passe AVANT `normalizeMeals` : c'est lui qui décide
        // quels ids de créneau existent, et `normalizeMeals` valide `meals` contre eux.
        // Dans l'autre sens, un créneau abîmé nettoyé après coup laisserait `meals`
        // désigner un id qui vient de disparaître.
        ...normalizeMeals(normalizeMealSlots(normalizeVariety(normalizeGoal(normalizeProfileActivity(cloud))))),
      }));
    } else if (local && (action === 'keep_local' || action === 'push_local')) {
      await pushProfile(local); // (re)pousse le local ; lève le flag si succès
    }
  } catch {}

  // STREAK — FUSION (record = max, série en cours = appareil le plus récent).
  try {
    const { data: row } = await supabase.from('streaks').select('*').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    const local: Streak | null = raw ? JSON.parse(raw) : null;
    if (row && row.last_active_date) {
      const cloud: Streak = {
        current_streak_days: row.current_streak_days,
        longest_streak_days: row.longest_streak_days,
        last_active_date: row.last_active_date,
      };
      const merged = mergeStreak(cloud, local);
      if (merged) {
        await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(merged));
        // Convergence : sans ce push, l'appareil d'en face garderait sa version et
        // écraserait à son tour. On ne pousse que si la fusion apporte quelque chose.
        if (syncedStreakChanged(cloud, merged)) await pushStreak(merged);
      }
    } else if (local) {
      await pushStreak(local);
    }
  } catch {}

  // FAVORIS — écrasement CONSERVÉ, à dessein (décision 2026-07-30).
  //
  // Fusionner par union serait le contresens : un favori RETIRÉ sur cet appareil est
  // toujours présent au cloud, donc l'union le ferait revenir — à chaque connexion, sans
  // fin. Retirer un favori ne « prendrait » jamais entre deux appareils. Sans horodatage
  // par élément ni pierre tombale, l'union rend la suppression IMPOSSIBLE : c'est un
  // défaut PERMANENT, là où l'écrasement fait perdre une liste qui se refait en quelques
  // taps. On garde donc le moins mauvais des deux.
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

  // GARDE-MANGER — écrasement CONSERVÉ, à dessein (décision 2026-07-30).
  //
  // C'est un STOCK, pas un historique : les quantités sont décrémentées à chaque plat
  // cuisiné (`pantry.deductRecipe`). Une union ferait réapparaître les ingrédients déjà
  // consommés sur cet appareil, et additionner les quantités inventerait des aliments
  // qui ne sont pas dans le placard — la liste de courses en découlant, on ferait
  // acheter faux. Fusionner un état de stock est activement FAUX, pas seulement discutable.
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

  // SUIVI DU POIDS — FUSION par date (historique cumulatif, cf. syncGuard).
  try {
    const { data: row } = await supabase.from('weight_logs').select('entries').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(WEIGHT_KEY);
    const local: WeightEntry[] = raw ? JSON.parse(raw) : [];
    const cloud: WeightEntry[] = row && Array.isArray(row.entries) ? row.entries : [];
    if (cloud.length) {
      const merged = mergeWeightEntries(cloud, local) as WeightEntry[];
      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(merged));
      if (differs(merged, cloud)) await pushWeights(merged); // convergence
    } else if (local.length) {
      await pushWeights(local);
    }
  } catch {}

  // RECETTES PERSONNALISÉES — FUSION par identifiant (du travail de l'utilisateur).
  try {
    const { data: row } = await supabase.from('recipe_overrides').select('overrides').eq('user_id', uid).maybeSingle();
    const raw = await AsyncStorage.getItem(OVERRIDES_KEY);
    const local: Record<string, Recipe> = raw ? JSON.parse(raw) : {};
    const cloud: Record<string, Recipe> = row?.overrides ?? {};
    if (Object.keys(cloud).length) {
      const merged = mergeRecipeOverrides(cloud, local);
      await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(merged));
      if (differs(merged, cloud)) await pushRecipeOverrides(merged); // convergence
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
// ⚠️ Aucun des six effacements n'était vérifié, et le `catch {}` avalait tout : un
// échec au 3e laissait les 3 derniers NON TENTÉS et la fonction renvoyait normalement.
// Or l'appelant (`app/(tabs)/profil.tsx`) s'en sert comme REPLI du droit à l'effacement
// RGPD : il croyait l'effacement fait alors que des données de SANTÉ restaient au
// serveur. On ne change ni le flux, ni la valeur de retour, ni l'ordre — on cesse de
// l'effacer en silence. (Afficher quoi que ce soit à l'utilisateur est hors périmètre.)
const RGPD_WARN =
  'RGPD : des données de SANTÉ peuvent SUBSISTER au serveur. L\'effacement demandé par l\'utilisateur n\'est PAS complet.';

/**
 * Ordre d'effacement : `profiles` en DERNIER — c'est la ligne qui porte l'identité, et
 * la garder jusqu'au bout laisse une trace exploitable si une table intermédiaire
 * résiste.
 */
const CLOUD_TABLES: ReadonlyArray<readonly [table: string, col: string]> = [
  ['favorites', 'user_id'],
  ['pantry', 'user_id'],
  ['weight_logs', 'user_id'],
  ['recipe_overrides', 'user_id'],
  ['streaks', 'user_id'],
  ['profiles', 'id'],
] as const;

/**
 * Effacement des données serveur — repli du droit à l'effacement RGPD.
 *
 * Chaque table a désormais SON try/catch : un échec sur l'une n'empêche plus les
 * suivantes d'être tentées (2026-07-30). Avant, une exception au 3ᵉ effacement laissait
 * les 3 derniers NON tentés, et la fonction renvoyait normalement — l'appelant croyait
 * l'effacement fait. Effacer 5 tables sur 6 vaut mieux que 2, et le récapitulatif final
 * nomme précisément ce qui a résisté.
 */
export async function deleteCloudData(): Promise<void> {
  const uid = await currentUserId(); if (!uid) return;
  const echecs: string[] = [];
  for (const [table, col] of CLOUD_TABLES) {
    try {
      const { error } = await supabase.from(table).delete().eq(col, uid);
      if (error) { echecs.push(table); warnSyncFailure(`effacement ${table}`, error, RGPD_WARN); }
    } catch (e) {
      echecs.push(table);
      warnSyncFailure(`effacement ${table} (exception)`, e, RGPD_WARN);
    }
  }
  if (echecs.length) {
    try {
      console.warn(
        `${LOG_PREFIX} effacement RGPD INCOMPLET — ${echecs.length}/${CLOUD_TABLES.length} ` +
          `table(s) ont résisté : ${echecs.join(', ')}. Les autres ont bien été effacées. ${RGPD_WARN}`,
      );
    } catch {}
  }
}
