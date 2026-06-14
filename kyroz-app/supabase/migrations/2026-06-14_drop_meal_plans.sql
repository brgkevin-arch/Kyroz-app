-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Nettoyage : suppression de la table morte `meal_plans`
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Contexte : le plan repas est DÉTERMINISTE (régénéré à la volée depuis le profil
-- + ENGINE_VERSION, cf. lib/planEngine.ts), jamais stocké côté serveur. La table
-- `meal_plans` figurait au schéma mais n'était JAMAIS écrite (aucun insert/select,
-- uniquement un delete au cleanup) → table morte. Retirée du schema.sql et de
-- lib/sync.ts le 2026-06-14.
--
-- 100 % idempotent (drop ... if exists) : ré-exécutable sans risque. La policy et
-- l'index disparaissent automatiquement avec la table (CASCADE implicite).
-- ════════════════════════════════════════════════════════════════════════════

drop table if exists public.meal_plans cascade;

-- ✅ Terminé. Table meal_plans supprimée (si elle existait).
