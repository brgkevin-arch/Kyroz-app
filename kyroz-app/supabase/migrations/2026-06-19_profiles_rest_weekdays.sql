-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Jours de repos choisis par l'utilisateur (carb-cycling).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `rest_weekdays` = int[] des jours de semaine (format getDay : 0=Dim … 6=Sam).
--   • NULL    → non défini : jours de repos déduits AUTO du nb d'entraînements (legacy).
--   • '{}'    → l'user a choisi AUCUN jour de repos (tous actifs).
--   • '{0,6}' → ces jours de semaine sont des jours de repos.
-- Colonne NULLABLE (pas de default) pour distinguer « non défini » de « aucun ».
-- Synchronisé via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retomberait en 400/PGRST204 (colonne manquante) → no-op silencieux + profil dirty.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists rest_weekdays int[];

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne rest_weekdays ajoutée + cache PostgREST rechargé.
