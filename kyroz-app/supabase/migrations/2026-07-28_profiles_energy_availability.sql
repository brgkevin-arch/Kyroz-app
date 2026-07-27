-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — Plancher d'énergie disponible (PR 1 / P0.1).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
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
-- Synchronisée via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retombe en 400/PGRST204 (colonne manquante) → no-op silencieux + profil dirty.
-- Le moteur local, lui, fonctionne sans : le champ est optionnel.
--
-- ⚠️ `is_post_menopausal` n'est VOLONTAIREMENT pas ajouté (décision 2026-07-28 :
-- « on laisse de côté la ménopause »). Le champ existe côté TypeScript mais reste
-- LOCAL-ONLY et inerte — hors PROFILE_COLS, donc jamais poussé. Conséquence
-- assumée : toutes les femmes sont traitées comme non ménopausées, c'est-à-dire
-- le défaut PROTECTEUR. Quand la question sera rédigée pour l'onboarding, ajouter
-- la colonne dans une migration dédiée + la ligne dans PROFILE_COLS.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists low_ea_weeks jsonb;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne low_ea_weeks ajoutée, cache PostgREST rechargé.
