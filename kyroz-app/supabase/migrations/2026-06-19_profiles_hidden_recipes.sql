-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Recettes « j'aime pas » (👎) masquées par l'utilisateur.
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `hidden_recipes` = text[] des ids de recettes que l'user ne veut plus voir.
--   • NULL / '{}' → aucune recette masquée.
--   • '{id,…}'    → ces recettes sont retirées des plans et des swaps (SOUPLE :
--                   jamais un bannissement définitif — réversible dans Profil, et
--                   l'élicitation d'ingrédient peut les ré-afficher, cf. lib/dislike.ts).
-- Synchronisé via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retomberait en 400/PGRST204 (colonne manquante) → no-op silencieux + profil dirty.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists hidden_recipes text[];

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne hidden_recipes ajoutée + cache PostgREST rechargé.
