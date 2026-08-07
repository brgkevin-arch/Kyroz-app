-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — CRÉNEAUX DE REPAS LIBRES (plus de plafond à 4 repas par jour).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `meal_slots` = jsonb, tableau des créneaux CRÉÉS par l'utilisateur :
--   [{ "id": "custom-1", "label": "Shaker post-training", "hour": 18,
--      "minute": 30, "pool": "snack" }]
--
-- POURQUOI. Jusqu'ici `MealType` était une union FERMÉE de quatre valeurs
-- (petit-déj / déjeuner / dîner / collation). Le plafond n'était écrit dans aucune
-- spec — il était dans le TYPE. Quelqu'un qui mange six fois par jour ne pouvait
-- pas le déclarer, et le moteur répartissait son budget sur quatre assiettes qu'il
-- ne mangeait pas : un plan faux, sans le moindre message.
--
-- ⚠️ LES 4 CRÉNEAUX INTÉGRÉS NE SONT PAS DANS CETTE COLONNE, ET C'EST LA DÉCISION
-- LA PLUS IMPORTANTE DE CE FICHIER. Ils restent en dur côté app
-- (`lib/mealSlots.ts::BUILTIN_SLOTS`), avec leurs ids d'origine — `breakfast`,
-- `lunch`, `dinner`, `snack`. Conséquences :
--   • `profiles.meals` (text[]) N'A PAS BESOIN DE MIGRATION : les ids qu'elle
--     contient déjà restent valides, et les nouveaux (`custom-…`) sont du texte.
--     Aucune contrainte d'énumération n'existe sur cette colonne — vérifié.
--   • Les repas « je gère » (`fixed_meals`, clé = id de créneau) et les tags des
--     recettes du catalogue continuent de désigner les mêmes créneaux.
--   • Une correction future d'heure ou de libellé sur un créneau intégré atteint
--     TOUS les comptes, y compris les anciens. Les stocker aurait figé une copie
--     par utilisateur — exactement la « copie stockée que personne ne relit »
--     que CLAUDE.md §10 interdit.
--
-- ⚠️ PAS DE BACKFILL. La colonne naît à NULL partout, ce qui veut dire « aucun
-- créneau créé » — c'est-à-dire les quatre intégrés, donc le comportement d'avant,
-- au repas près. Écrire un tableau vide partout ne changerait rien au calcul et
-- ferait perdre la distinction avec « pas encore migré ».
--
-- ⚠️ AUCUNE CONTRAINTE DE FORME (jsonb libre), même parti pris que `fixed_meals`
-- et `calorie_bank`. Une valeur ajoutée côté app avant sa migration ferait rejeter
-- l'upsert ENTIER (PGRST204), donc perdre TOUT le profil et pas seulement ce champ.
-- Le client borne à la LECTURE : `syncGuard::normalizeMealSlots` jette toute entrée
-- inexploitable, et `mealSlots::sanitizeSlot` borne libellé, heure et vivier.
--
-- Synchronisée via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retombe en 400/PGRST204 → la synchro du profil ENTIER meurt en silence. Ce mode de
-- panne s'est produit 3 fois : jouer la migration AVANT de déployer. (Le filet
-- `PROFILE_COLS_LAST_MIGRATION` limite la casse à cette seule colonne, il ne dispense
-- pas de jouer le SQL.)
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists meal_slots jsonb;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne meal_slots ajoutée (NULL partout) + cache rechargé.
