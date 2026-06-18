-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Repas fixes gérés par l'utilisateur (petit-déj/collation récurrents).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `fixed_meals` = jsonb (clé = type de repas → { label, macros, source, ingredients? }).
-- Soustrait du budget du jour par le moteur (cf. lib/planEngine.ts) ; synchronisé
-- via PROFILE_COLS (lib/sync.ts). Sans migration ici, le push profil retomberait
-- en 400/PGRST204 (mémoire supabase-schema-not-auto-applied) → no-op silencieux.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists fixed_meals jsonb;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne fixed_meals ajoutée + cache PostgREST rechargé.
