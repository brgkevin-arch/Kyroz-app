-- Migration 2026-06-18 — FORCE ROW LEVEL SECURITY (durcissement audit sécurité)
--
-- Contexte : données de santé (RGPD). `enable row level security` n'empêche PAS
-- le propriétaire de la table (ni un rôle BYPASSRLS) de contourner les policies.
-- `force row level security` applique la RLS même au propriétaire → defense-in-depth.
--
-- ⚠️ À exécuter dans le SQL Editor Supabase — le schema.sql n'est PAS auto-appliqué.

alter table public.profiles         force row level security;
alter table public.streaks          force row level security;
alter table public.favorites        force row level security;
alter table public.pantry           force row level security;
alter table public.weight_logs      force row level security;
alter table public.recipe_overrides force row level security;
