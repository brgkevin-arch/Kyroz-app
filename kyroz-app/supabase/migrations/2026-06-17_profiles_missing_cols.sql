-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Rattrapage : colonnes profil présentes dans schema.sql mais jamais
--                      appliquées à la prod (sync cloud du profil cassée).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Symptôme : l'upsert du profil tombe en 400 / PGRST204
--   « Could not find the 'body_fat_pct' column of 'profiles' in the schema cache »
-- → erreur avalée par le try/catch de lib/sync.ts (pushProfile) : l'app marche en
--   local (offline-first) mais RIEN ne se synchronise côté Supabase.
--
-- Cause (mémoire supabase-schema-not-auto-applied) : éditer schema.sql n'applique
-- RIEN à la prod. Ces colonnes n'ont été ajoutées qu'en inline dans schema.sql,
-- sans migration dédiée → absentes de la base live. body_fat_pct est la 1re que
-- PostgREST signale ; carb_ratio / protein_per_kg / weigh_in_frequency suivraient.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

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

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste même
-- une fois la colonne ajoutée, tant que le cache n'est pas rafraîchi).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonnes profil rattrapées + cache PostgREST rechargé.
