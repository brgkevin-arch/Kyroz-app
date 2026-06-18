-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Schéma Supabase (Phase 2)
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Principe RGPD (spec §12) : poids/objectif/régime = données de santé.
-- → Row Level Security stricte : chaque utilisateur n'accède QU'À ses lignes.
-- → Stockage EU only (réglage du projet Supabase, région Europe).
--
-- Choix d'archi (anti-over-engineering, spec §14) :
--  • Le plan repas est stocké en JSON (colonne `data`), cohérent avec le moteur
--    local — pas de table `meals` normalisée tant que le besoin n'existe pas.
--  • Les recettes restent embarquées dans l'app (lib/recipes.ts) pour garantir
--    la latence < 1 s du core loop. On pourra les migrer en base plus tard.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. PROFILS (1:1 avec auth.users) ────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Données de base
  sex text check (sex in ('male','female')),
  age int check (age is null or (age >= 16 and age <= 100)), -- garde-fou §11
  weight_kg numeric,
  height_cm numeric,
  body_fat_pct numeric check (body_fat_pct is null or (body_fat_pct >= 3 and body_fat_pct <= 60)),
  activity_level text,
  training_days_per_week int,
  sports jsonb not null default '[]',   -- [{type, sessions_per_week, minutes_per_session}] → TDEE précis (MET)

  -- Objectif & macros
  goal text,
  macro_mode text check (macro_mode in ('auto','percent','manual')),
  carb_ratio int check (carb_ratio is null or (carb_ratio >= 0 and carb_ratio <= 100)),
  protein_per_kg numeric check (protein_per_kg is null or (protein_per_kg >= 1 and protein_per_kg <= 4)),
  tdee_kcal int,
  target_kcal int,
  target_protein_g int,
  target_carbs_g int,
  target_fat_g int,

  -- Préférences plan
  weigh_in_frequency text check (weigh_in_frequency in ('daily','weekly','biweekly','monthly')),

  plan_days int,
  plan_weekdays int[] not null default '{}',
  meals text[] not null default '{}',
  meal_emphasis text,
  variety text,
  dietary_restrictions text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  preferred_proteins text[] not null default '{}',
  max_prep_time_min int,
  fixed_meals jsonb, -- repas gérés par l'user (type → {label,macros,source,ingredients?})

  -- RGPD : consentement explicite à la collecte des données de santé (spec §12)
  consent_health_data boolean not null default false,
  consent_at timestamptz,

  -- Paiement (Stripe — Phase 2 ultérieure)
  stripe_customer_id text
);

-- Migration idempotente : ajoute body_fat_pct aux bases déjà déployées
-- (create table if not exists ci-dessus ne modifie pas une table existante).
alter table public.profiles
  add column if not exists body_fat_pct numeric
  check (body_fat_pct is null or (body_fat_pct >= 3 and body_fat_pct <= 60));

alter table public.profiles
  add column if not exists carb_ratio int
  check (carb_ratio is null or (carb_ratio >= 0 and carb_ratio <= 100));

alter table public.profiles
  add column if not exists protein_per_kg numeric
  check (protein_per_kg is null or (protein_per_kg >= 1 and protein_per_kg <= 4));

alter table public.profiles
  add column if not exists weigh_in_frequency text
  check (weigh_in_frequency is null or weigh_in_frequency in ('daily','weekly','biweekly','monthly'));

alter table public.profiles
  add column if not exists sports jsonb not null default '[]';

-- Autorise le nouveau mode 'percent' sur les bases existantes.
alter table public.profiles drop constraint if exists profiles_macro_mode_check;
alter table public.profiles
  add constraint profiles_macro_mode_check check (macro_mode in ('auto','percent','manual'));

-- ── 2. (RETIRÉ) PLANS REPAS ─────────────────────────────────────────────────
-- Le plan est DÉTERMINISTE (régénéré à la volée depuis le profil + ENGINE_VERSION),
-- jamais stocké côté serveur → pas de table `meal_plans`. La table existait au
-- schéma mais n'était jamais écrite (seulement supprimée au cleanup). Retirée le
-- 2026-06-14. Migration de drop : supabase/migrations/2026-06-14_drop_meal_plans.sql

-- ── 3. STREAKS (North Star : 7 jours consécutifs) ───────────────────────────
create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak_days int not null default 0,
  longest_streak_days int not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

-- ── 4. FAVORIS ──────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ── 5. GARDE-MANGER (inventaire stocké en JSON) ─────────────────────────────
create table if not exists public.pantry (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- ── 6. SUIVI DU POIDS (historique stocké en JSON) ───────────────────────────
create table if not exists public.weight_logs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entries jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- ── 7. RECETTES PERSONNALISÉES (overrides perso, stockés en JSON) ────────────
create table if not exists public.recipe_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overrides jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── PERMISSIONS : seul un utilisateur authentifié accède aux tables ─────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.streaks, public.favorites,
  public.pantry, public.weight_logs, public.recipe_overrides
  to authenticated;

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.streaks          enable row level security;
alter table public.favorites        enable row level security;
alter table public.pantry           enable row level security;
alter table public.weight_logs      enable row level security;
alter table public.recipe_overrides enable row level security;

-- FORCE : applique la RLS même au propriétaire de la table (defense-in-depth,
-- données de santé). Voir migration 2026-06-18_force_rls.sql.
alter table public.profiles         force row level security;
alter table public.streaks          force row level security;
alter table public.favorites        force row level security;
alter table public.pantry           force row level security;
alter table public.weight_logs      force row level security;
alter table public.recipe_overrides force row level security;

-- profiles : la clé primaire EST l'uid
drop policy if exists "profiles_rw_own" on public.profiles;
create policy "profiles_rw_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- tables avec user_id : accès uniquement à ses propres lignes
drop policy if exists "streaks_rw_own" on public.streaks;
create policy "streaks_rw_own" on public.streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "favorites_rw_own" on public.favorites;
create policy "favorites_rw_own" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pantry_rw_own" on public.pantry;
create policy "pantry_rw_own" on public.pantry
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weight_logs_rw_own" on public.weight_logs;
create policy "weight_logs_rw_own" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipe_overrides_rw_own" on public.recipe_overrides;
create policy "recipe_overrides_rw_own" on public.recipe_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── updated_at automatique ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists streaks_set_updated_at on public.streaks;
create trigger streaks_set_updated_at before update on public.streaks
  for each row execute function public.set_updated_at();

drop trigger if exists pantry_set_updated_at on public.pantry;
create trigger pantry_set_updated_at before update on public.pantry
  for each row execute function public.set_updated_at();

drop trigger if exists weight_logs_set_updated_at on public.weight_logs;
create trigger weight_logs_set_updated_at before update on public.weight_logs
  for each row execute function public.set_updated_at();

drop trigger if exists recipe_overrides_set_updated_at on public.recipe_overrides;
create trigger recipe_overrides_set_updated_at before update on public.recipe_overrides
  for each row execute function public.set_updated_at();

-- ── Création auto du profil + streak à l'inscription ────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ✅ Terminé. Tables : profiles, streaks, favorites, pantry,
--    weight_logs, recipe_overrides (RLS activée sur toutes).
