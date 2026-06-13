-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Correctif : tables manquantes en prod (weight_logs, recipe_overrides)
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Contexte : schema.sql définit ces 2 tables, mais le projet Supabase live a été
-- provisionné avant leur ajout → 404 sur /rest/v1/weight_logs & /recipe_overrides
-- (suivi du poids + recettes perso ne se synchronisaient pas).
-- Détecté en QA Playwright le 2026-06-14.
--
-- 100 % idempotent (if not exists / drop if exists) : ré-exécutable sans risque,
-- ne touche pas aux tables existantes (profiles, meal_plans, streaks, …).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. TABLES (historique poids + overrides recettes, stockés en JSON) ──────
create table if not exists public.weight_logs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entries jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overrides jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── 2. PERMISSIONS (seul un utilisateur authentifié y accède) ───────────────
grant select, insert, update, delete on
  public.weight_logs, public.recipe_overrides
  to authenticated;

-- ── 3. ROW LEVEL SECURITY (RGPD : chacun n'accède QU'À ses propres lignes) ──
alter table public.weight_logs      enable row level security;
alter table public.recipe_overrides enable row level security;

drop policy if exists "weight_logs_rw_own" on public.weight_logs;
create policy "weight_logs_rw_own" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipe_overrides_rw_own" on public.recipe_overrides;
create policy "recipe_overrides_rw_own" on public.recipe_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 4. updated_at automatique ───────────────────────────────────────────────
-- (set_updated_at() existe déjà en prod ; recréé ici pour rendre le script
--  autonome — create or replace est sans effet de bord.)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists weight_logs_set_updated_at on public.weight_logs;
create trigger weight_logs_set_updated_at before update on public.weight_logs
  for each row execute function public.set_updated_at();

drop trigger if exists recipe_overrides_set_updated_at on public.recipe_overrides;
create trigger recipe_overrides_set_updated_at before update on public.recipe_overrides
  for each row execute function public.set_updated_at();

-- ✅ Terminé. weight_logs + recipe_overrides créées (RLS activée).
