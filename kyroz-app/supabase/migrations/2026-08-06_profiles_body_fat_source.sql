-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — PROVENANCE DU % DE MASSE GRASSE (Katch-McArdle ne prend plus une devinette).
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- `body_fat_source` = 'measured' | 'estimated'. C'est ce qui DÉCIDE de la formule du
-- métabolisme de base (`lib/tdee.ts::calculateBMR`, ENGINE_REV 5 → 6) :
--   • 'measured'  (impédancemètre, plis cutanés, DEXA) → Katch-McArdle
--   • 'estimated' (silhouette du sélecteur, chiffre au jugé) → Mifflin-St Jeor
--   • NULL        (question jamais posée) → Mifflin-St Jeor
--
-- POURQUOI. Katch ne lit QUE la masse maigre, il est donc hypersensible au %MG :
-- mesuré sur une femme de 90 kg, 5 points d'écart valent 126 kcal/jour de cible, et
-- ce coût est IDENTIQUE à 20 % comme à 50 % (la formule est linéaire — il ne dépend
-- que du poids). Or le %MG est OBLIGATOIRE à l'onboarding et le chemin par défaut y
-- est le tap sur une silhouette : « %MG connu » désignait donc, pour la quasi-totalité
-- du parc, une ESTIMATION VISUELLE, dont l'erreur courante est de 5 à 8 points.
--
-- ⚠️ PAS DE BACKFILL, ET C'EST LA DÉCISION LA PLUS IMPORTANTE DE CE FICHIER.
-- La colonne naît à NULL sur toutes les lignes existantes. NULL veut dire « on ne
-- sait pas », pas « estimé » : le moteur calcule comme estimé (le défaut va vers la
-- prudence, jamais vers la formule qui prétend en savoir plus), mais la valeur reste
-- distinguable. C'est ce qui permettra de poser la question UNE FOIS à ceux qui ont
-- une vraie mesure. Écrire 'estimated' partout détruirait cette information pour
-- toujours, sans rien apporter au calcul.
--
-- ⚠️ AUCUNE CONTRAINTE D'ÉNUMÉRATION, À DESSEIN — même parti pris que `neat_level`.
-- Une valeur ajoutée côté app avant sa migration ferait rejeter l'upsert ENTIER
-- (PGRST204), donc perdre TOUT le profil et pas seulement ce champ. Le client borne
-- à la lecture (`katchEligible` teste l'ÉGALITÉ à 'measured' : tout le reste, y
-- compris une valeur inconnue, retombe côté prudent).
--
-- Synchronisée via PROFILE_COLS (lib/sync.ts). Sans cette migration, le push profil
-- retombe en 400/PGRST204 → la synchro du profil ENTIER meurt en silence. Ce mode de
-- panne s'est produit 3 fois : jouer la migration AVANT de déployer. (Le filet
-- `PROFILE_COLS_LAST_MIGRATION` limite la casse à cette seule colonne, il ne dispense
-- pas de jouer le SQL.)
--
-- Ce que ça DÉPLACE, RE-MESURÉ sur les 12 silhouettes du sélecteur, deux sexes :
-- cible servie médiane +43 kcal/j, min −80, max +363 (TDEE : −217 à +363 — le plancher
-- amortit toujours les baisses). L'écart croît avec le %MG déclaré : négatif sur les
-- silhouettes sèches, où Katch donnait plus, positif sur les grasses. Un avertissement
-- one-shot (`engine_notice`) l'explique au-delà de 100 kcal/jour.
--
-- Le plancher de sécurité BRUT (30 kcal/kg de masse maigre + sport) ne bouge d'aucun
-- kcal sur les 12 — la masse maigre ne lit pas la provenance. ⚠️ Le CANDIDAT
-- `energy_availability`, lui, peut bouger : il est plafonné à la maintenance (CLAUDE.md
-- §6, « un plancher n'impose jamais un surplus »), et ce plafond suit bien le TDEE.
-- Mesuré : 1 corps sur 12 (F 82 kg à 10 % de MG, gabarit implausible), 2362 → 2306.
--
-- 100 % idempotent (add column if not exists) : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists body_fat_source text;

-- Recharge le cache de schéma de PostgREST (sinon le 400/PGRST204 persiste).
notify pgrst, 'reload schema';

-- ✅ Terminé. Colonne body_fat_source ajoutée (NULL partout) + cache rechargé.
