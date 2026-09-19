-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Retrait de la série : suppression de la table `streaks`
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Contexte : décision fondateur du 2026-09-19 — la série (streak) est retirée de
-- l'app : écrans, logique, synchro (cf. METRICS.md §2). Plus aucune version de
-- l'app servie par l'OTA ne lit ni n'écrit cette table.
--
-- 🔴 IRRÉVERSIBLE : les compteurs de série de TOUS les comptes sont effacés. C'est
-- voulu (une série future sera repensée, pas restaurée), mais rien ne les ramène.
--
-- ⚠️ QUAND : APRÈS la publication de l'OTA qui retire la série. Jouée avant, l'app
-- encore en place tenterait d'écrire dans une table absente — sans rien casser (ces
-- écritures sont best-effort et journalisées), mais pour rien.
--
-- ⚠️ L'ORDRE COMPTE, d'où la transaction : le trigger d'inscription
-- (`handle_new_user`) insérait une ligne dans `streaks` à chaque nouveau compte.
-- Supprimer la table sans le réécrire d'abord ferait ÉCHOUER TOUTE INSCRIPTION.
-- Les deux gestes passent donc ensemble, ou aucun.
--
-- Ce qui disparaît avec la table (CASCADE implicite) : sa policy `streaks_rw_own`,
-- son trigger `streaks_set_updated_at`, ses droits. La suppression de compte
-- (`delete-account`) repose sur la cascade `on delete cascade` des AUTRES tables :
-- elle n'est pas touchée.
--
-- ⚠️ Après celle-ci, `2026-06-18_force_rls.sql` et `2026-07-21_pending_all.sql` ne
-- sont plus rejouables telles quelles : elles visent encore `streaks`. Ce sont des
-- archives, pas des scripts à relancer — `schema.sql` est la référence à jour.
--
-- 100 % idempotent : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- 1. Le trigger d'inscription ne crée plus de ligne de série.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. La table elle-même.
drop table if exists public.streaks cascade;

commit;

-- ── VÉRIF ───────────────────────────────────────────────────────────────────
-- Doit rendre UNE ligne : `streaks_existe = false` et `trigger_vise_streaks = false`.
select
  to_regclass('public.streaks') is not null                                   as streaks_existe,
  pg_get_functiondef('public.handle_new_user'::regproc) ilike '%streaks%'     as trigger_vise_streaks;

-- ✅ Terminé. Table streaks supprimée, inscription intacte.
