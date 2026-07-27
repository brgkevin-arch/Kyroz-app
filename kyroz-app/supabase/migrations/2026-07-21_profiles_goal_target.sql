-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Objectif DATÉ (feature premium « Kyroz+ »).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `goal_target` = jsonb : { target_weight_kg, target_date, start_weight_kg, start_date }.
--   • NULL → aucun objectif daté : la cible calorique suit le delta figé de `goal`
--     (comportement historique). Colonne NULLABLE (pas de default).
-- Pilote la trajectoire calorique dans le temps (cf. lib/datedGoal.ts + recalcProfile).
-- Synchronisé via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retomberait en 400/PGRST204 (colonne manquante) → no-op silencieux + profil dirty.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists goal_target jsonb;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne goal_target ajoutée + cache PostgREST rechargé.
