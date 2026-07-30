-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — BANQUE DE CALORIES (feature premium « Kyroz+ », 4ᵉ pilier).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `calorie_bank` = jsonb : { "<jour de semaine>": <écart kcal signé> }
--   • Clé = format getDay() en STRING — "0" = dimanche … "6" = samedi.
--   • Valeur positive = « je mange plus ce jour-là » (resto samedi : { "6": 600 }).
--     Valeur négative = mettre de côté pour le reste de la semaine.
--   • NULL ou {} → aucun écart : le plan est strictement identique à avant (comportement
--     historique préservé, vérifié par test).
--
-- L'écart est REPRIS sur les autres jours du plan → la semaine garde son total
-- (cf. lib/calorieBank.ts). Les protéines ne bougent jamais (plancher quotidien,
-- CLAUDE.md §6) et aucun jour ne descend sous le plancher PERSONNALISÉ.
--
-- Synchronisé via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retomberait en 400/PGRST204 (colonne manquante) → la synchro du profil ENTIER
-- meurt en silence, pas seulement ce champ. Ce mode de panne s'est produit 3 fois :
-- jouer la migration AVANT de déployer.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists calorie_bank jsonb;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne calorie_bank ajoutée + cache PostgREST rechargé.
