# Kyroz — Runbook Supabase prod (à faire avant la sortie stores)

> Ces étapes **ne sont pas faisables depuis le repo** : elles demandent l'accès au
> projet Supabase (toi). Objectif = prouver que la sync profil ET la suppression de
> compte marchent VRAIMENT en prod. Coche au fur et à mesure.

---

## 1. Appliquer les migrations en attente (point 2)

1. Supabase → **SQL Editor** → New query.
2. Colle **tout** `supabase/migrations/2026-07-21_pending_all.sql` → **Run**.
3. La requête §VÉRIF (incluse dans le fichier) affiche les 30 colonnes profil :
   - [ ] **Zéro ligne « ⛔ MANQUANTE »** → schéma aligné.
   - [ ] Deuxième tableau : `rls_forced = true` sur les 6 tables.

→ Reporte la date d'exécution dans le **Journal** (§4 ci-dessous).

## 2. Vérifier une écriture RÉELLE (point 2 — le vrai test)

Le schéma peut être bon mais le push casser ailleurs. On vérifie de bout en bout :

1. Ouvre l'app (web déployé ou `npm run web`), connecte-toi (compte réel ou invité).
2. Change **une préférence synchronisée** — ex. ajoute un jour de repos (carb-cycling)
   ou masque une recette (👎). Ce sont `rest_weekdays` / `hidden_recipes`, les
   colonnes les plus récentes = les plus à risque.
3. Supabase → **Table Editor** → `profiles` → trouve ta ligne (`id` = ton user_id).
   - [ ] La colonne modifiée reflète bien le changement (`rest_weekdays` = `{…}`,
         `hidden_recipes` = `{…}`).
4. Si la valeur n'apparaît PAS → le push retombe en 400/PGRST204 : relance le §1,
   vérifie que `notify pgrst, 'reload schema'` a bien tourné (ou attends ~30 s).

> Astuce : le garde-fou `syncGuard` marque le profil « dirty » tant qu'un push n'est
> pas confirmé → aucune perte de données même si le schéma était désaligné, mais la
> sync reste MORTE tant que ce test n'est pas vert.

## 3. Tester « Supprimer mon compte » de bout en bout (point 3)

> ✅ **VÉRIFIÉ EN PROD LE 2026-07-23** (test end-to-end sur la vraie Supabase) :
> `POST functions/v1/delete-account` → **200 `{"success":true}`** (déployée) ;
> ancien jeton → **403** (ligne `auth.users` supprimée) ; toutes les tables du
> compte retombent à **0** (cascade OK). RGPD droit à l'effacement prouvé.
> Ci-dessous = procédure de re-test manuel si besoin.

L'Edge Function `delete-account` est codée + `on delete cascade` est en place au schéma
(vérifié). Il reste à prouver qu'elle est **déployée et fonctionnelle**.

**a) Déployer la fonction** (si pas déjà fait) :
- Dashboard → **Edge Functions** → Deploy a new function → nom **exact** `delete-account`
  → colle `supabase/functions/delete-account/index.ts` → Deploy.
- (ou CLI : `supabase functions deploy delete-account`)
- Les secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` sont
  **auto-injectés** par Supabase dans les Edge Functions → rien à configurer.

**b) Test réel** (utilise un compte JETABLE, la suppression est DÉFINITIVE) :
1. Crée un compte test dans l'app (email jetable) + génère un plan (crée profil, streak…).
2. Note son `user_id` (Supabase → Authentication → Users).
3. Dans l'app : **Profil → Supprimer mon compte** → confirme.
   - [ ] L'app te déconnecte sans erreur.
4. Supabase → **Authentication → Users** :
   - [ ] La ligne du compte test a **disparu**.
5. Supabase → **SQL Editor**, colle (remplace `<UID>`) :
   ```sql
   select 'profiles' t, count(*) n from profiles where id = '<UID>'
   union all select 'streaks',   count(*) from streaks          where user_id = '<UID>'
   union all select 'favorites', count(*) from favorites        where user_id = '<UID>'
   union all select 'pantry',    count(*) from pantry           where user_id = '<UID>'
   union all select 'weight_logs', count(*) from weight_logs    where user_id = '<UID>'
   union all select 'recipe_overrides', count(*) from recipe_overrides where user_id = '<UID>';
   ```
   - [ ] **Toutes les lignes à `n = 0`** → cascade OK, aucune donnée orpheline.

Si la fonction renvoie une erreur (« not found », 404), l'app retombe sur
`deleteCloudData()` (efface les données mais PAS la ligne `auth.users`) → RGPD
incomplet. Le test ci-dessus le révèle (ligne `auth.users` encore présente).

## 4. Journal des migrations appliquées (cause racine P0.1/P4.2)

> Renseigne la date à laquelle tu as VRAIMENT joué chaque migration en prod, pour
> qu'on sache toujours ce qui tourne. (Colonne vide = pas confirmé.)

| Migration | Appliquée en prod le |
|---|---|
| `2026-06-14_drop_meal_plans.sql` | |
| `2026-06-14_profiles_sports.sql` | |
| `2026-06-14_weight_logs_recipe_overrides.sql` | |
| `2026-06-17_profiles_missing_cols.sql` | |
| `2026-06-18_force_rls.sql` | |
| `2026-06-18_profiles_fixed_meals.sql` | |
| `2026-06-19_profiles_hidden_recipes.sql` | |
| `2026-06-19_profiles_rest_weekdays.sql` | |
| `2026-07-21_pending_all.sql` (regroupe les 5 dernières) | |

> Le regroupé `2026-07-21_pending_all.sql` couvre force_rls + fixed_meals +
> hidden_recipes + rest_weekdays + drop_meal_plans. Le jouer une fois suffit pour ces 5.
