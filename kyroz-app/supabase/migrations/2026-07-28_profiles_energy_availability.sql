-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Plancher d'énergie disponible (PR 1 / P0.1).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `is_post_menopausal` = boolean nullable.
--   • NULL / false → femme traitée comme NON ménopausée, donc « à risque » : c'est
--     la seule population dont le plancher d'énergie disponible remonte au-delà de
--     12 semaines cumulées en zone basse. Le défaut va vers la PROTECTION.
--   • Sans objet chez l'homme (le plancher reste à 30 kcal/kg de masse maigre).
--
-- `low_ea_weeks` = jsonb (tableau de stamps 'YYYY-MM-DD', lundi de chaque semaine).
--   • Semaines passées en énergie disponible basse (30–35 kcal/kg de masse maigre),
--     sur une fenêtre glissante de 12 mois. CUMULÉ, pas consécutif — une pause d'une
--     semaine ne remet pas le compteur à zéro. Borné à 52 entrées (purge automatique).
--   • NULL → aucun historique (profils créés avant cette PR) : traité comme 0 semaine.
--
-- Donnée de SANTÉ au sens RGPD, comme le reste de `profiles` : même table, même RLS
-- stricte, même région EU, couverte par le droit à l'effacement existant.
--
-- Synchronisées via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retombe en 400/PGRST204 (colonne manquante) → no-op silencieux + profil dirty.
-- Le moteur local, lui, fonctionne sans : les deux champs sont optionnels.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists is_post_menopausal boolean,
  add column if not exists low_ea_weeks jsonb;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonnes is_post_menopausal + low_ea_weeks ajoutées, cache rechargé.
