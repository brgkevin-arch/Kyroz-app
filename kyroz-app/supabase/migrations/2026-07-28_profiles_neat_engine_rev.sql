-- Étape 3 du moteur : NEAT paramétrable + révision du moteur.
--
-- ⚠️ À JOUER **AVANT** DE DÉPLOYER L'APP. `profileToRow` écrit toutes les colonnes
-- en un seul upsert : tant que ces colonnes n'existent pas, Postgres rejette
-- l'upsert ENTIER (PGRST204) et c'est le PROFIL COMPLET qui cesse de se
-- synchroniser, en silence. (`pushProfile` sait retenter sans ces colonnes — c'est
-- un filet, pas une permission de déployer dans le désordre.)
--
-- ── neat_level ──────────────────────────────────────────────────────────────
-- Activité de la vie quotidienne HORS sport ('desk' | 'light' | 'active' |
-- 'physical' → 1,20 / 1,28 / 1,36 / 1,45, cf. lib/tdee.ts::NEAT_PAL). Le sport
-- est chiffré à part par les MET nets, donc ce facteur ne doit jamais englober
-- l'entraînement. NULL = question non posée → le client retombe sur 'desk'.
--
-- Volontairement `text` SANS contrainte d'énumération : une valeur ajoutée côté
-- app avant la migration correspondante ferait rejeter l'upsert entier, donc
-- perdre tout le profil — exactement le mode de panne que la contrainte
-- `body_fat_pct` (3–60 vs bornes client 12–65) a déjà provoqué. Le client borne
-- à la lecture (`neatPal` retombe sur le défaut), ce qui est le bon endroit.
--
-- ── engine_rev / engine_notice ──────────────────────────────────────────────
-- Révision du moteur ayant produit les cibles stockées, et avertissement one-shot
-- déposé quand une révision déplace la cible de plus de 100 kcal/jour. Synchronisés
-- (et non locaux) pour que l'explication soit lue UNE fois, pas une fois par
-- appareil. `engine_notice` est effacé dès qu'il a été lu.

alter table public.profiles
  add column if not exists neat_level text;

alter table public.profiles
  add column if not exists engine_rev integer;

alter table public.profiles
  add column if not exists engine_notice jsonb;

notify pgrst, 'reload schema';
