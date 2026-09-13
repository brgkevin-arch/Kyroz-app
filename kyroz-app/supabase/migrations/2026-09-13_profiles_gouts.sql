-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — GOÛT DÉCLARÉ AU PETIT-DÉJEUNER ET À LA COLLATION (sucré / salé).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `gout_petit_dej` et `gout_collation` = text : 'sucre', 'sale' ou NULL.
--
-- POURQUOI. Le moteur choisissait le petit-déjeuner sur les seules macros : un bol
-- d'edamame au millet et au poivron pouvait être servi à 8 h à quelqu'un qui ne mange
-- que sucré le matin (signalé par le fondateur le 2026-09-12). La personne répond
-- désormais à l'inscription et dans Profil → Préférences, et le moteur garantit que
-- 70 % des services du créneau (5 petits-déjeuners sur 7) sont du goût choisi
-- (`lib/gout.ts`, AGENTS.md D28).
--
-- ⚠️ TROIS ÉTATS, ET LE TROISIÈME N'EST PAS UN OUBLI :
--   • colonne absente de la ligne / jamais écrite → question jamais posée (comptes
--     d'avant le 2026-09-13) ;
--   • NULL écrit par l'app → « peu importe », RÉPONDU ;
--   • 'sucre' | 'sale'.
-- L'app écrit NULL (et pas une clé omise) pour « peu importe » : sans ça, repasser de
-- « Salé » à « Peu importe » laisserait 'sale' en base, et la synchronisation suivante
-- le ramènerait.
--
-- ⚠️ PAS DE BACKFILL : NULL partout = « peu importe » = le comportement d'avant, au
-- repas près.
--
-- ⚠️ AUCUNE CONTRAINTE DE VALEUR, même parti pris que `goal` et `variety` : une valeur
-- ajoutée côté app avant sa migration ferait rejeter l'upsert ENTIER (PGRST204), donc
-- perdre TOUT le profil. Le client referme à la LECTURE (`gout.ts::goutLu`) : toute
-- valeur inconnue vaut « peu importe ».
--
-- Synchronisées via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retombe en 400/PGRST204 → la synchro du profil ENTIER meurt en silence (le filet
-- `PROFILE_COLS_LAST_MIGRATION` limite la casse à ces deux colonnes). JOUER CETTE
-- MIGRATION AVANT DE DÉPLOYER.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists gout_petit_dej text,
  add column if not exists gout_collation text;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonnes gout_petit_dej et gout_collation ajoutées (NULL partout) + cache rechargé.
