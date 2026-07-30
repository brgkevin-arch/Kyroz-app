# Journal des migrations appliquées en PROD

> **À quoi sert ce fichier.** Personne ne pouvait dire ce qui tournait réellement en
> production. C'est la cause racine du mode de panne qui a coupé la synchro du profil
> **trois fois** : une migration non jouée fait rejeter l'upsert ENTIER par Postgres
> (`PGRST204` / `42703`), l'app continue de marcher en local, et rien ne le dit.
>
> **Règle** : une migration jouée s'inscrit ici, avec sa date et *comment on l'a
> vérifiée*. Une ligne sans vérification ne vaut rien — c'est une intention, pas un fait.

## Comment vérifier soi-même (lecture seule, sans dashboard)

Une colonne absente fait répondre `400` à PostgREST ; présente, `200` (avec `[]`, la
RLS masquant les lignes). Donc, avec la clé anonyme du `.env.local` :

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/profiles?select=calorie_bank&limit=1" -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

Pour tout vérifier d'un coup, demander **toutes** les colonnes de `PROFILE_COLS`
(`lib/sync.ts`) dans un seul `select=` : c'est exactement ce que fait la synchro, donc
un `200` prouve que l'upsert du profil ne peut pas être rejeté pour colonne manquante.

## État vérifié

### 2026-07-31 — ✅ TOUT est appliqué, y compris `calorie_bank`

Vérifié **par mesure contre la prod**, pas par lecture des fichiers :

| Contrôle | Résultat |
|---|---|
| Les **37 colonnes** de `PROFILE_COLS` + `id`, demandées en une requête | `HTTP 200` → aucune colonne manquante |
| Les **6 tables** (`profiles`, `streaks`, `favorites`, `pantry`, `weight_logs`, `recipe_overrides`) | `HTTP 200` chacune |
| RLS anonyme (sans session) | `[]` sur les 6 → aucune fuite |
| **Écriture réelle** d'un profil complet (37 colonnes, comme `pushProfile`) | `HTTP 200` |
| **Relecture** de la ligne écrite | 44 colonnes, valeurs intactes — JSONB compris (`calorie_bank`, `goal_target`, `low_ea_weeks`, `fixed_meals`) |
| **Modification** d'une préférence (80 → 79 kg, banque 600 → 450) | `HTTP 204`, relu à `79` / `450` |
| RLS authentifiée : lignes visibles par ce compte | **1** — la sienne, pas celles des autres |

**Ce que ça clôt** : A1 (« personne n'a prouvé qu'une modification atterrit en base »)
et le doute sur la migration `2026-07-30_profiles_calorie_bank.sql`. La synchro du
profil n'est PAS morte : elle écrit, elle relit, et elle est bien cloisonnée.

Les 14 migrations de `supabase/migrations/` sont donc toutes reflétées en prod à cette
date — les colonnes qu'elles ajoutent répondent toutes `200`.

> ⚠️ **Compte de test laissé en place** : la vérification a ouvert une session invité
> (`205132cb…`). Sa ligne `profiles` a été **supprimée** (`DELETE` → `204`, relecture
> vide), mais la ligne `auth.users` ne peut pas l'être avec la clé anonyme. À purger
> depuis le dashboard, Authentication → Users.

> ⚠️ **Au passage, E3 est tranché par les faits** : le provider **Anonymous est ACTIF**
> en production. Un `POST /auth/v1/signup` avec un corps vide, sans authentification et
> sans CAPTCHA, renvoie une session — c'est exactement le vecteur de création de comptes
> en masse que la note redoutait. Le bouton masqué en prod ne protège rien : c'est
> l'endpoint qui est ouvert. Arbitrage à poser (laisser + rate-limit, brancher le
> CAPTCHA Turnstile déjà provisionné, ou couper le provider — sachant que les parcours
> Playwright en dépendent).
