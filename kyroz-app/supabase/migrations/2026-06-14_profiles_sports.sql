-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Ajout : colonne `sports` au profil (TDEE précis par sport, méthode MET)
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Contexte : on capture désormais les sports pratiqués (type + fréquence + durée)
-- pour estimer la dépense énergétique réelle (cf. lib/sport.ts) au lieu d'un simple
-- multiplicateur par nombre de séances. Stocké en JSON :
--   [{ "type": "musculation", "sessions_per_week": 4, "minutes_per_session": 60 }, …]
--
-- ⚠️ RAPPEL (mémoire supabase-schema-not-auto-applied) : éditer schema.sql
-- n'applique RIEN à la prod. CE script doit être exécuté à la main, sinon
-- l'upsert du profil tombera en 404 sur la colonne `sports` (sync silencieuse KO).
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- Défaut '[]' → les profils existants restent en calcul legacy (aucun plan modifié).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists sports jsonb not null default '[]';

-- ✅ Terminé. Colonne profiles.sports ajoutée.
