# Procédure — jouer la migration `body_fat_source` (2026-08-06)

> Une seule étape à la fois. Fais l'étape, dis-moi le résultat, je te donne la suivante.
> Rien ici n'est faisable depuis le dépôt : le SQL demande l'accès au projet Supabase.

## Pourquoi c'est bloquant, en une phrase

Le code est écrit et testé, mais l'app envoie le profil **en une seule ligne**. Si la
colonne `body_fat_source` n'existe pas en base, Postgres refuse **toute la ligne** (erreur
`PGRST204`) — pas seulement ce champ. Résultat : la synchro du profil meurt, **sans
message, sans erreur visible**. C'est arrivé trois fois sur ce projet.

➡️ **La migration passe AVANT le déploiement, jamais après.**

---

## Étape 1 — jouer le SQL

1. Ouvre Supabase → projet Kyroz → **SQL Editor** → **New query**.
2. Colle **tout le contenu** de `supabase/migrations/2026-08-06_profiles_body_fat_source.sql`.
3. **Run**.

Attendu : `Success. No rows returned`.

Le fichier est **idempotent** (`add column if not exists`) : si tu doutes de l'avoir déjà
joué, tu peux le rejouer sans risque.

**→ Dis-moi ce que Supabase affiche.**

---

## Étape 2 — vérifier depuis le dépôt

```bash
npm run check:migrations
```

Attendu : `body_fat_source` disparaît des colonnes fautives, et la ligne
« Colonnes de PROFILE_COLS (38, en une requête) » passe en **HTTP 200**.

⚠️ Si elle reste en 400 : PostgREST garde son cache de schéma ~30 s. Attends, relance.
Le `notify pgrst, 'reload schema'` du fichier est censé le forcer, mais il ne coûte rien
de patienter avant de conclure à un échec.

**→ Colle-moi la sortie.**

---

## Étape 3 — le merge et le déploiement

> ⚠️ **Cette étape était en 4ᵉ position, derrière la vérification d'écriture réelle.
> C'était impossible dans cet ordre** : cette vérification passe par la question de
> provenance à l'écran, et cet écran n'existe qu'après le déploiement. Corrigé le
> 2026-08-06. Le risque qui justifiait l'ordre strict — déployer un client qui écrit
> une colonne absente — est levé par l'étape 1.

Une fois les étapes 1 et 2 vertes.

La branche est `worktree-body-fat-provenance-impl`.
Merge dans `main` → le push déclenche GitHub Actions → le site part tout seul.

**→ Dis-moi « go merge » quand tu veux que je le fasse.**

---

## Étape 4 — prouver qu'une écriture RÉELLE atterrit

Le schéma peut être bon et le push casser ailleurs. On le vérifie de bout en bout,
**après** le déploiement.

1. Ouvre l'app, va dans **Profil → Mon corps → % de masse grasse**.
2. Saisis un pourcentage **à la main** (pas une silhouette) → la question apparaît.
3. Réponds **« Oui, avec un appareil »**.
4. Supabase → **Table Editor** → `profiles` → ta ligne → colonne `body_fat_source`.

Attendu : `measured`.

⚠️ Ce que l'étape 2 prouve et ce qu'elle NE prouve PAS : elle interroge le schéma en
LECTURE sur les 38 colonnes en une requête — donc elle ferme le mode de panne réel
(`PGRST204`, colonne inconnue → ligne entière rejetée). Elle ne remplace pas une
écriture : c'est celle-ci qui vérifie que l'écran envoie bien la valeur.

**→ Dis-moi ce que tu vois dans la cellule.**

---

## Étape 5 — consigner

J'ajoute la ligne dans `supabase/JOURNAL-MIGRATIONS.md` avec la date d'exécution
réelle (celle de l'étape 1, pas celle du fichier), et je passe la ligne
« Migrations Supabase » d'`AGENTS.md` de **15/16** à **16/16**.

Je m'en occupe, c'est juste pour que tu saches que ce n'est pas oublié.

---

## Ce que l'utilisateur va voir, et quand

Rien tant que le déploiement n'est pas fait. Ensuite, à la première ouverture :

- ceux dont la cible bouge de **plus de 100 kcal/jour** reçoivent l'avertissement
  one-shot (`engine_notice`) qui explique le changement en français, une seule fois ;
- leur **% de masse grasse est conservé** — il reste affiché et suivi, il ne pilote
  simplement plus le métabolisme de base ;
- la question de provenance n'est posée **qu'au moment où quelqu'un saisit ou modifie**
  son %MG. Personne n'est interrompu.

Écart mesuré sur les 12 silhouettes du sélecteur : cible servie **−80 à +363 kcal/jour**,
médiane **+43**. Négatif chez les silhouettes sèches (Katch donnait plus), positif chez
les plus grasses.
