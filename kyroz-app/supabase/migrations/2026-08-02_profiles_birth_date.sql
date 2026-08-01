-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — DATE DE NAISSANCE (l'âge cesse de pourrir).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `birth_date` = date de naissance ('YYYY-MM-DD'). L'app demandait un ÂGE, qui
-- n'était juste que le jour de sa saisie : au premier anniversaire le profil
-- sous-estimait l'utilisateur d'un an, et personne ne revenait le corriger.
-- Ce n'est pas cosmétique — l'âge entre dans Mifflin-St Jeor (`calculateBMR`),
-- donc dans le TDEE, donc dans les calories servies tous les jours.
-- Depuis le 2026-08-02, `age` est DÉRIVÉ de cette colonne à chaque recalcul
-- (lib/tdee.ts::computePlan) et ne peut plus se désynchroniser.
--
-- ⚠️ `age` est CONSERVÉE, et ce n'est pas une redondance oubliée : on ne peut pas
-- deviner la date de naissance des comptes déjà créés (un âge ne donne qu'une
-- fourchette d'un an). Ces profils gardent leur `age` saisi tant qu'ils n'ont pas
-- renseigné leur date. Aucune valeur inventée, aucune migration de données.
--
-- Synchronisée via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push
-- profil retomberait en 400/PGRST204 (colonne manquante) → la synchro du profil
-- ENTIER meurt en silence, pas seulement ce champ. Ce mode de panne s'est produit
-- 3 fois : jouer la migration AVANT de déployer. (Le filet
-- `PROFILE_COLS_LAST_MIGRATION` limite la casse à cette seule colonne, il ne
-- dispense pas de jouer le SQL.)
--
-- Type `date` et non `timestamptz` : c'est un jour civil, pas un instant. Le
-- stocker avec un fuseau ferait basculer l'anniversaire d'un jour selon l'endroit
-- d'où l'app est ouverte.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists birth_date date;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne birth_date ajoutée + cache PostgREST rechargé.
