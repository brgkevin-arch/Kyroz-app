# Procédure — jouer la migration `meal_slots` (2026-08-07)

> ✅ **TERMINÉE le 2026-08-07.** SQL joué par le fondateur, vérifié (`check:migrations` :
> 39 colonnes en une requête, `400` → `200`), PR #46 mergée, déploiement vert, bundle en
> ligne vérifié. Consigné dans `supabase/JOURNAL-MIGRATIONS.md`.
> **Ce fichier est conservé comme trace de ce qui a été fait** — il ne reste rien à
> exécuter ici. Ne pas le rejouer comme une consigne.
> ⚠️ Une seule chose n'a PAS été faite et vit ailleurs : **l'OTA n'est pas publiée**, donc
> le natif n'a pas encore les créneaux libres (AGENTS.md **C6**).
>
> *Ce qui suit est le texte d'origine, à l'état où il a été suivi.*

---

> Une seule étape à la fois. Fais l'étape, dis-moi le résultat, je te donne la suivante.
> Rien ici n'est faisable depuis le dépôt : le SQL demande l'accès au projet Supabase.

## Pourquoi c'est bloquant, en une phrase

Le code est écrit, testé et **mesuré**, mais l'app envoie le profil **en une seule ligne**.
Si la colonne `meal_slots` n'existe pas en base, Postgres refuse **toute la ligne**
(`PGRST204`) — pas seulement ce champ. Résultat : la synchro du profil meurt, **sans
message**. C'est arrivé trois fois sur ce projet.

**Constaté à l'écran pendant la vérification du 2026-08-07**, le filet a fonctionné —
et il dit lui-même ce qu'il faut faire :

```
[kyroz:sync] échec — profil (1re tentative) : colonne « meal_slots » INCONNUE côté
serveur — hypothèse : MIGRATION NON JOUÉE en production. Nouvelle tentative sans les
colonnes de la dernière migration (meal_slots).
[kyroz:sync] profil synchronisé PARTIELLEMENT — colonnes NON écrites : meal_slots.
```

➡️ Sans la migration, **les créneaux créés ne quittent pas l'appareil** : ils marchent en
local, et disparaissent à la réinstallation ou sur un second appareil. Le reste du profil,
lui, continue de se synchroniser (c'est le filet `PROFILE_COLS_LAST_MIGRATION`).

➡️ **La migration passe AVANT le déploiement, jamais après.**

État mesuré le 2026-08-07 avec `npm run check:migrations` : `meal_slots` est la **seule**
colonne fautive, les 38 autres et les 6 tables répondent 200.

---

## Étape 1 — jouer le SQL

1. Ouvre Supabase → projet Kyroz → **SQL Editor** → **New query**.
2. Colle **tout le contenu** de `supabase/migrations/2026-08-07_profiles_meal_slots.sql`.
3. **Run**.

Attendu : `Success. No rows returned`.

Le fichier est **idempotent** (`add column if not exists`) : si tu doutes de l'avoir déjà
joué, tu peux le rejouer sans risque. Il ne touche **aucune ligne existante** — la colonne
naît à `NULL` partout, ce qui veut dire « aucun créneau créé », donc le comportement
d'avant au repas près.

**→ Dis-moi ce que Supabase affiche.**

---

## Étape 2 — vérifier depuis le dépôt

```bash
npm run check:migrations
```

Attendu : `meal_slots` disparaît des colonnes fautives, et la ligne
« Colonnes de PROFILE_COLS (39, en une requête) » passe en **HTTP 200**.

⚠️ Si elle reste en 400 : PostgREST garde son cache de schéma ~30 s. Attends, relance.
Le `notify pgrst, 'reload schema'` du fichier est censé le forcer, mais il ne coûte rien
de patienter avant de conclure à un échec.

**→ Colle-moi la sortie.**

---

## Étape 3 — le merge et le déploiement

Une fois les étapes 1 et 2 vertes.

La branche est `claude/customizable-meal-count-2fd7e7` → **PR vers `main`** ; le merge
déclenche GitHub Actions et le site part tout seul.

⚠️ **Ce déploiement régénère le plan de TOUT LE MONDE** : `ENGINE_VERSION` passe de 46 à
47, parce que l'ordre de la journée devient chronologique (la collation de 16 h passe
avant le dîner, elle était servie en dernier). Aucune calorie ne bouge, mais les recettes
choisies changent. Ce n'est pas une opération neutre côté utilisateur.

**→ Dis-moi « go merge » quand tu veux que je le fasse.**

---

## Étape 4 — prouver qu'une écriture RÉELLE atterrit

Le schéma peut être bon et le push casser ailleurs. On le vérifie de bout en bout,
**après** le déploiement.

1. Ouvre l'app → **Profil → Paramètres des repas**.
2. **Ajouter un repas** → nom, heure, vivier → **Enregistrer ce repas** → **Enregistrer**.
3. Supabase → **Table Editor** → `profiles` → ta ligne → colonne `meal_slots`.

Attendu, quelque chose comme :
`[{"id":"custom-1","label":"Shaker post-training","hour":18,"minute":30,"pool":"snack"}]`

Et dans la colonne `meals`, l'id `custom-1` **à sa place chronologique** dans la liste.

⚠️ Ce que l'étape 2 prouve et ce qu'elle NE prouve PAS : elle interroge le schéma en
LECTURE sur les 39 colonnes en une requête — donc elle ferme le mode de panne réel
(`PGRST204`). Elle ne remplace pas une écriture : c'est celle-ci qui vérifie que l'écran
envoie bien la valeur.

**→ Dis-moi ce que tu vois dans la cellule.**

---

## Étape 5 — consigner

J'ajoute la ligne dans `supabase/JOURNAL-MIGRATIONS.md` avec la date d'exécution
**réelle** (celle de l'étape 1, pas celle du nom de fichier), et la mesure avant/après.
