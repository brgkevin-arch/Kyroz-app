-- ════════════════════════════════════════════════════════════════════════════
-- Kyroz — MIGRATIONS EN ATTENTE, REGROUPÉES (prépa sortie stores, 2026-07-21)
-- ────────────────────────────────────────────────────────────────────────────
-- POURQUOI CE FICHIER : `schema.sql` n'est PAS auto-appliqué au projet Supabase
-- live. Cinq migrations étaient marquées « à exécuter » sans preuve qu'elles
-- l'ont été. Si UNE colonne manque → `pushProfile` échoue en 400/PGRST204 →
-- AUCUNE synchro profil, SILENCIEUSEMENT (AsyncStorage masque le bug ; l'user
-- perd tout au changement d'appareil). Piège déjà rencontré 3×.
--
-- MODE D'EMPLOI : Supabase → SQL Editor → New query → coller CE FICHIER ENTIER
--                 → Run. 100 % idempotent : ré-exécutable sans risque.
--                 La section §VÉRIF (à la fin) te dit s'il manque quelque chose.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Colonnes profil manquantes (sinon 400/PGRST204 → sync profil morte) ───
alter table public.profiles add column if not exists fixed_meals    jsonb;
alter table public.profiles add column if not exists hidden_recipes text[];
alter table public.profiles add column if not exists rest_weekdays  int[];

-- ── 2. FORCE RLS (defense-in-depth données de santé — RGPD) ──────────────────
alter table public.profiles         force row level security;
alter table public.streaks          force row level security;
alter table public.favorites        force row level security;
alter table public.pantry           force row level security;
alter table public.weight_logs      force row level security;
alter table public.recipe_overrides force row level security;

-- ── 3. Nettoyage : table morte meal_plans (plan = déterministe, jamais stocké) ─
drop table if exists public.meal_plans cascade;

-- ── 4. Recharge le cache de schéma PostgREST (sinon le 400/PGRST204 persiste) ─
notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- §VÉRIF — lance CETTE requête après le Run ci-dessus.
-- Elle liste les 30 colonnes que l'app synchronise (PROFILE_COLS de lib/sync.ts)
-- et marque chacune present / ⛔ MANQUANTE. Zéro ligne « MANQUANTE » = OK.
-- ════════════════════════════════════════════════════════════════════════════
with expected(col) as (
  values
    ('sex'),('age'),('weight_kg'),('height_cm'),('body_fat_pct'),('activity_level'),
    ('training_days_per_week'),('sports'),('goal'),('macro_mode'),('carb_ratio'),
    ('protein_per_kg'),('tdee_kcal'),('target_kcal'),('target_protein_g'),
    ('target_carbs_g'),('target_fat_g'),('plan_days'),('plan_weekdays'),
    ('rest_weekdays'),('meals'),('meal_emphasis'),('variety'),('dietary_restrictions'),
    ('disliked_foods'),('preferred_proteins'),('max_prep_time_min'),('hidden_recipes'),
    ('weigh_in_frequency'),('fixed_meals')
)
select e.col as colonne_attendue,
       case when c.column_name is null then '⛔ MANQUANTE' else '✅ present' end as etat
from expected e
left join information_schema.columns c
  on c.table_schema = 'public' and c.table_name = 'profiles' and c.column_name = e.col
order by etat, e.col;

-- Bonus : confirme que force RLS est bien actif sur les 6 tables sensibles.
-- Attendu : relforcerowsecurity = true partout.
select relname as table_name, relrowsecurity as rls_active, relforcerowsecurity as rls_forced
from pg_class
where relname in ('profiles','streaks','favorites','pantry','weight_logs','recipe_overrides')
order by relname;
