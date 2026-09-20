-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — JOUR DU RENDEZ-VOUS DE PESÉE (demande fondateur, 2026-09-20).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `weigh_in_day` = smallint : 0 = dimanche … 6 = samedi, ou NULL.
--   ⚠️ C'est la convention `Date.getDay()` du reste du profil (`plan_weekdays`,
--   `rest_weekdays`, `calorie_bank`), PAS celle d'expo/iOS (1 = dimanche), qui
--   n'apparaît qu'au moment de programmer le déclencheur (`lib/weight.ts`).
--
-- POURQUOI. La cadence de pesée (`weigh_in_frequency`) était réglable, le JOUR ne
-- l'était pas : il venait du hasard de la première pesée, et il DÉRIVAIT — une pesée
-- en retard le samedi faisait passer tous les rendez-vous suivants au samedi, pour
-- toujours. L'utilisateur choisit désormais son jour, et il tient : notification ET
-- bannière « C'est le moment de te peser » lisent la même échéance, ancrée sur ce jour.
--
-- ⚠️ DEUX ÉTATS, ET LE PREMIER N'EST PAS UN OUBLI :
--   • NULL (tous les comptes existants) → aucun jour choisi : le jour est DÉDUIT de la
--     dernière pesée, ce qui est EXACTEMENT le rendez-vous que l'app servait déjà.
--     Personne ne change de jour en installant la mise à jour ;
--   • 0…6 → rendez-vous FIXE, et se peser un autre jour ne le déplace plus.
--
-- ⚠️ PAS DE BACKFILL, et c'est un choix : écrire ici le jour de la dernière pesée de
-- chacun figerait un jour que personne n'a demandé (les pesées vivent dans
-- `weight_logs`, pas dans cette table). Le client le déduit à la lecture, à chaque
-- fois, et le FIGE au premier tap sur le sélecteur.
--
-- ⚠️ AUCUNE CONTRAINTE DE VALEUR, même parti pris que `goal`, `variety` et les goûts :
-- une valeur ajoutée côté app avant sa migration ferait rejeter l'upsert ENTIER
-- (PGRST204), donc perdre TOUT le profil. Le client referme à la LECTURE
-- (`syncGuard::normalizeWeighIn` efface un jour hors 0…6).
--
-- ⚠️ La cadence 'daily' n'est plus proposée depuis ce jour (décision fondateur : « une
-- fois par semaine minimum »). Elle reste en base chez les comptes qui l'avaient, et
-- le client la referme sur 'weekly' à la lecture — aucun UPDATE ici : une migration
-- qui réécrit des réglages d'utilisateurs ne se rejoue pas si elle se trompe.
--
-- Synchronisée via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retombe en 400/PGRST204 → la synchro du profil ENTIER meurt en silence (le filet
-- `PROFILE_COLS_LAST_MIGRATION` limite la casse à cette colonne). JOUER CETTE
-- MIGRATION AVANT DE DÉPLOYER.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists weigh_in_day smallint;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne weigh_in_day ajoutée (NULL partout) + cache rechargé.
