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

### 2026-08-07 — ⏳ `meal_slots` À JOUER (17ᵉ migration)

`2026-08-07_profiles_meal_slots.sql` — colonne `profiles.meal_slots jsonb`, les créneaux
de repas CRÉÉS par l'utilisateur (le plafond de 4 repas par jour est levé). **Sans
backfill** : `NULL` partout veut dire « aucun créneau créé », donc les 4 intégrés, donc
le comportement d'avant au repas près.

**Pas encore jouée.** Mesuré le 2026-08-07, `npm run check:migrations` :

| Contrôle | Résultat |
|---|---|
| Témoin négatif : une colonne inventée | `400` — la mesure discrimine |
| Les 6 tables | `200` |
| Les **39 colonnes** de `PROFILE_COLS` + `id`, en une requête | `400` |
| `meal_slots` isolée | `400` → **absente** |

Et le filet a été vu à l'œuvre dans le navigateur : la synchro retombe sur « tout sauf
`meal_slots` » et le journalise, au lieu de mourir en silence. Conséquence tant que la
migration n'est pas jouée : les créneaux créés **restent sur l'appareil**.

➡️ Procédure pas à pas : `supabase/PROCEDURE-2026-08-07-meal-slots.md`.

### 2026-08-06 — ✅ `body_fat_source` jouée (16ᵉ migration)

`2026-08-06_profiles_body_fat_source.sql`, jouée par le fondateur dans le SQL Editor.
Colonne `profiles.body_fat_source text`, **sans backfill** : elle naît à `NULL` partout,
et `NULL` veut dire « question jamais posée » — distinguable de « répondu au jugé ».
C'est ce qui décide de la formule du métabolisme de base (`ENGINE_REV` 6, cf. AGENTS.md
E16 et CLAUDE.md §6).

Mesuré **avant** (le matin) et **après**, avec `npm run check:migrations` :

| Contrôle | Avant | Après |
|---|---|---|
| Témoin négatif : une colonne inventée | `400` | `400` — la mesure discrimine |
| `body_fat_source` seule | `400` → **absente** | — |
| Les **38 colonnes** de `PROFILE_COLS` + `id`, en une requête | `400` | `200` → aucune manquante |
| Les **6 tables** | `200` | `200` |

⚠️ **Ce que ce contrôle prouve, et ce qu'il ne prouve pas.** Il interroge le schéma en
LECTURE, donc il ferme le mode de panne réel (`PGRST204` : colonne inconnue → upsert
ENTIER rejeté → synchro morte en silence). Il ne remplace pas une **écriture** réelle
depuis l'app — celle-ci ne peut avoir lieu qu'après le déploiement du client, puisque
c'est l'écran de saisie qui produit la valeur. Consigner ici quand ce sera fait.

Les **16** migrations de `supabase/migrations/` sont donc reflétées en prod à cette date.

### 2026-08-02 — ✅ TOUT est appliqué, `birth_date` comprise

⚠️ **Cette entrée existe parce qu'une session a annoncé au fondateur que
`2026-08-02_profiles_birth_date.sql` était « en attente », SANS l'avoir mesurée.** Elle
l'était déjà. Une migration ne se déclare jamais en attente sur la foi d'un fichier
présent dans le dépôt : la seule preuve est la réponse de PostgREST.

Mesuré contre la prod (clé anonyme, lecture seule, aucun compte créé) :

| Contrôle | Résultat |
|---|---|
| `birth_date` | `HTTP 200` → **présente** |
| Les **37 colonnes** de `PROFILE_COLS` + `id`, en une requête | `HTTP 200` → aucune manquante |
| Les **6 tables** | `HTTP 200` chacune |
| Témoin négatif : une colonne inventée | `HTTP 400` → la mesure discrimine bien |

Le témoin négatif n'est pas décoratif : sans lui, un `200` obtenu pour une autre raison
(URL mal formée, filtre ignoré) se lirait comme une preuve. **Toujours demander une
colonne qui n'existe pas dans la même passe.**

Les **15** migrations de `supabase/migrations/` sont donc toutes reflétées en prod à
cette date.

**Depuis le 2026-08-02, tout ceci tient en une commande** — c'est le vrai correctif :
une vérification qu'on saute est une vérification qui n'existe pas.

```bash
npm run check:migrations
```

Elle contrôle le témoin négatif D'ABORD (une colonne inventée doit répondre `400`, sinon
elle s'arrête : sans ça un `200` ne prouve rien), puis les 6 tables, puis les 37 colonnes
de `PROFILE_COLS` **en une seule requête** — exactement ce que fait `pushProfile`. Si le
lot échoue, elle isole les colonnes fautives et nomme la migration à jouer.
Lecture seule, clé anonyme, aucun compte créé.

---

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
