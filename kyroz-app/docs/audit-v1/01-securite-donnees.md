# Audit V1 — Étape 1 : Sécurité & données
Date : 2026-08-26 · Commit audité : `c17e667` · Périmètre : `supabase/` (schéma, 18 migrations, Edge Function), couche client Supabase et auth, couche de stockage local (30 modules), config Expo/EAS, `RGPD-REGISTRE.md` (lecture seule)

> Audit, pas fix. Aucun fichier de code, de config ou de dépendance n'est modifié.
> Issu de `docs/audit-v1/briefs/01-securite-donnees.md`.

## Reste à couvrir

### A. Supabase — RLS et exposition
- [x] `supabase/schema.sql`
- [x] `supabase/migrations/` — les 18 migrations, RLS et policies
- [x] `supabase/functions/delete-account/index.ts`
- [x] `supabase/JOURNAL-MIGRATIONS.md` + `RUNBOOK-PROD.md` (état réel de la prod)

### B. Clés et secrets
- [x] inventaire des `EXPO_PUBLIC_*`
- [x] `.env.example`, `.gitignore`, `eas.json`, `app.json`
- [x] historique git (`-S` sur `sb_secret_`, `service_role`, `phx_`, `sk_`)

### C. Stockage sur l'appareil
- [x] `lib/supabase.ts` — storage de session
- [x] inventaire clé par clé des 30 modules qui persistent
- [x] backups OS (`app.json`)
- [x] sign-out : nettoyage complet

### D. Suppression de compte
- [x] chemin réel, du bouton à la dernière ligne effacée
- [x] sous-traitants (RevenueCat, PostHog)
- [x] abonnement actif, confirmation, irréversibilité

### E. Portabilité
- [x] `lib/exportData.ts`

### F. Logs et messages d'erreur
- [x] comptage `console.*` et retrait en production
- [x] erreurs affichées à l'utilisateur

### G. Auth et sessions
- [x] `lib/supabase.ts` (PKCE, `detectSessionInUrl`, `autoRefreshToken`, `AppState`)
- [x] `hooks/useAuth.tsx`
- [x] `app/(auth)/login.tsx`, `components/MotDePasseOublie.tsx`, `lib/emailConfirmation.ts`
- [x] deep link / scheme

### H. Réseau
- [x] URLs `http://`, ATS

## A. Tables et RLS

Six tables, toutes dans `public`, toutes déclarées dans `supabase/schema.sql`. Aucune vue, aucune table supplémentaire créée par les 18 migrations (`grep -inE 'create (table|view|...)' migrations/*.sql`).

| Table | Données santé | RLS | FORCE | Policy | UPDATE using / with check | Cascade depuis `auth.users` |
|---|---|---|---|---|---|---|
| `profiles` | **oui** — sexe, âge, poids, taille, %MG, objectif, TDEE, cibles, régime | ✅ `schema.sql:196` | ✅ `:204` | `for all using (auth.uid() = id)` `:214` | ✅ / ✅ | ✅ `on delete cascade` `:27` |
| `weight_logs` | **oui** — historique de pesées (JSON) | ✅ `:200` | ✅ `:208` | `auth.uid() = user_id` `:232` | ✅ / ✅ | ✅ `:174` |
| `streaks` | non | ✅ `:197` | ✅ `:205` | `auth.uid() = user_id` `:219` | ✅ / ✅ | ✅ `:154` |
| `favorites` | non | ✅ `:198` | ✅ `:206` | `auth.uid() = user_id` `:223` | ✅ / ✅ | ✅ `:162` |
| `pantry` | non | ✅ `:199` | ✅ `:207` | `auth.uid() = user_id` `:227` | ✅ / ✅ | ✅ `:168` |
| `recipe_overrides` | non | ✅ `:201` | ✅ `:209` | `auth.uid() = user_id` `:236` | ✅ / ✅ | ✅ `:180` |

**Ce qui est correct, et mérite d'être dit** : `force row level security` est posé sur les six (pas seulement `enable`), les policies sont `for all` avec `using` **et** `with check`, `anon` ne reçoit que `grant usage on schema public` — **aucun droit de table** (`schema.sql:188-192`). Une seule fonction `security definer` : `handle_new_user` (`:271`), avec `set search_path = public`, déclenchée par trigger sur `auth.users` et non exposée en RPC. `set_updated_at` (`:245`) n'est pas `security definer`.

**Prod mesurée, pas supposée** — `eas-cli env:exec production 'node scripts/check-migrations.mjs'` :

```
Témoin — colonne inexistante → 400 ✓   (la mesure sait dire NON)
6 tables → 200 ✓ · 40 colonnes de PROFILE_COLS en une requête → 200 ✓
✅ Toutes les migrations sont reflétées en prod.
```

**Inventaire des données de santé persistées côté serveur** (input de l'étape 9) :

| Table | Colonnes |
|---|---|
| `profiles` | `sex`, `age`, `birth_date`, `weight_kg`, `height_cm`, `body_fat_pct`, `body_fat_source`, `activity_level`, `training_days_per_week`, `neat_level`, `sports`, `goal`, `goal_target`, `tdee_kcal`, `target_kcal`, `target_protein_g`, `target_carbs_g`, `target_fat_g`, `dietary_restrictions`, `low_ea_weeks`, `deficit_weeks`, `calorie_bank` |
| `weight_logs` | `entries` (JSON : date + poids) |

`profiles.email` duplique `auth.users.email` (écrit par `handle_new_user`, `schema.sql:274`) : à porter à l'inventaire de l'étape 9, ce n'est pas un défaut en soi.

## B. Clés

Sept `EXPO_PUBLIC_*` citées dans le dépôt. Chacune est **inlinée en clair dans le bundle à la compilation** : « publique » est un fait, pas un réglage.

| Variable | Nature | Publique acceptable ? | État réel |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet | ✅ oui | posée sur les 3 environnements EAS |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clé `sb_publishable_` | ✅ oui (RLS fait le travail) | posée ; **valide en prod, mesurée** (400 sur colonne bidon) |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | clé SDK `appl_` | ✅ oui | posée en production |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | clé SDK `goog_` | ✅ oui | **absente** de production — cf. constat 01-03 |
| `EXPO_PUBLIC_POSTHOG_KEY` | clé projet `phc_` | ✅ oui | **retirée des 3 environnements** (extinction du 2026-08-26) ; le code la lit encore derrière une garde |
| `EXPO_PUBLIC_REVIEW_CODE` | code d'accès reviewer | ⚠️ **non, par nature** | posée en production — cf. constat 01-01 |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | — | 🔴 jamais | **jamais posée, et un test l'interdit** (`lib/__tests__/noClientAiKey.test.ts`) ✅ |

**Aucun secret dans le dépôt ni dans son historique.** `git log --all -p` ne contient aucune valeur `sb_secret_…` ni aucun JWT `"role":"service_role"`. Les 8 commits que `-S'service_role'` remonte sont des fiches d'OTA qui citent le mot ; les 2 de `-S'SUPABASE_SERVICE_ROLE_KEY'` portent le `Deno.env.get(...)` de l'Edge Function — le NOM de la variable, jamais sa valeur.

**`.gitignore`** couvre `.env*` avec l'exception `!.env.example` (`:39-41`), et `.env.example` est bien le seul fichier d'environnement suivi.

**`eas.json`** ne porte **aucune clé en clair** : chaque profil déclare son `environment`, les valeurs vivent chez EAS. La clé App Store Connect est référencée par chemin **hors du dépôt** (`../../.eas-credentials/asc-api-key.p8`). Les `ascApiKeyId` / `ascApiKeyIssuerId` / `appleTeamId` présents sont des identifiants, pas des secrets — sans le `.p8` ils n'authentifient rien.

## C. Stockage appareil

**36 clés `@kyroz:*` en AsyncStorage**, plus la session Supabase. Rien n'est chiffré : ni SecureStore, ni MMKV, ni clé AES — `createClient` reçoit `AsyncStorage` brut (`lib/supabase.ts:60`).

| Clé | Contenu | Chiffré | Effacé au sign-out | Effacé à la suppression |
|---|---|---|---|---|
| `sb-<ref>-auth-token` | **session Supabase** (access + refresh token) | ❌ | ✅ (purge) | ✅ `clear()` |
| `@kyroz:profile` | **données de santé** : sexe, âge, poids, taille, %MG, objectif, cibles | ❌ | ✅ | ✅ |
| `@kyroz:weights` | historique de pesées | ❌ | ✅ | ✅ |
| `@kyroz:weightPhotos` | **photos de progression** | ❌ | ✅ | ✅ |
| `@kyroz:plan`, `:planSeed`, `:planCheckin`, `:planReroll` | plan de la semaine et son état | ❌ | ✅ | ✅ |
| `@kyroz:analyticsId`, `:analyticsConsent`, `:analyticsDay0` | pseudonyme et consentement de mesure | ❌ | ✅ | ✅ — cf. constat **01-03** |
| `@kyroz:pantry`, `:shopping*`, `:favorites`, `:recipeOverrides`, `:offPlan`, `:streak`, `:repasAuto*` | usage | ❌ | ✅ | ✅ |
| `@kyroz:theme`, `@kyroz:reminder` | préférences d'appareil | ❌ | 🔒 **conservées volontairement** | ✅ |
| 12 autres (`:tour:*`, `:accent`, `:firstName`, `:hydration:*`, …) | UI / préférences | ❌ | ✅ | ✅ |

**Client Supabase** (`lib/supabase.ts:59-68`) : `detectSessionInUrl: false` ✅, `autoRefreshToken` actif hors pré-rendu ✅, `storageKey` posée explicitement (et identique au défaut, donc sans déconnexion). Pas de `flowType: 'pkce'` — **sans objet ici** : aucun provider OAuth, l'authentification est e-mail + mot de passe, et la réinitialisation passe par un **code OTP** (`verifyOtp`) sans lien de retour, donc sans surface de capture par deep link.

**`AppState`** n'est pas utilisé pour piloter le rafraîchissement de jeton (le seul `AppState` du dépôt, `app/(tabs)/plan.tsx:629`, sert à l'auto-coche des repas). `autoRefreshToken` reste donc actif en arrière-plan : pas un défaut de sécurité, un choix de consommation.

**Sauvegardes OS** : rien n'exclut ces données des sauvegardes. Pas de dossier `android/` dans le dépôt (workflow managé, `prebuild` au build) et `allowBackup` n'est déclaré nulle part → **défaut Android `true`**. Côté iOS, AsyncStorage vit sous `Library/Application Support`, incluse dans iCloud par défaut. Voir constat **01-04**.

## D. Suppression de compte — chemin réel

Elle existe, elle est initiée depuis l'app, et le chemin est complet côté Kyroz :

1. `app/(tabs)/profil.tsx:786` — bouton « Supprimer définitivement », dans une feuille de confirmation qui annonce l'irréversibilité (`:781-783`).
2. `doDelete` (`:346`) → `deleteAccount()` (`lib/sync.ts:506`) → `supabase.functions.invoke('delete-account')`.
3. `supabase/functions/delete-account/index.ts` — **identifie l'appelant par SON jeton** (`asUser.auth.getUser()`, `:48`) puis supprime **ce seul** `user.id` avec le `service_role` (`:54`). Aucun identifiant n'est accepté du client : pas de suppression d'autrui possible.
4. Cascade `on delete cascade` depuis `auth.users` → les 6 tables. Vérifiée ligne à ligne au tableau A.
5. Repli si l'Edge Function échoue : `deleteCloudData()` efface au moins les lignes (`profil.tsx:349`).
6. `signOut()` + `AsyncStorage.clear()` + `clearProfile()` (`:350-352`).
7. RevenueCat : `usePremium` rappelle `identifyUser(null)` au passage de `uid` à `null` (`hooks/usePremium.ts:52`) → `logOut()`. **L'identité est réinitialisée, le client RevenueCat n'est pas supprimé** — constat **01-03**.

Aucun bucket Storage n'existe : rien à effacer de ce côté.

## Constats

### 01-01 Un compte peut hériter des données du précédent sur le même appareil
> ✅ **CORRIGÉ le 2026-08-27** — fiche : `AGENTS.md` **A43**, code : `lib/sessionLocale.ts`,
> garde-fous : `heritageDeCompte.test.ts` + `sync.test.ts` (10 mutations, 10 rouges).
> · La purge est devenue une propriété de `signOut()` **et** de l'événement `SIGNED_OUT` —
>   c'est lui, et lui seul, qui voit les pertes de session INVOLONTAIRES que le constat
>   nomme. ⚠️ Sur l'ÉVÉNEMENT, jamais sur `s === null` : `INITIAL_SESSION` arrive avec une
>   session nulle à chaque démarrage sans compte, donc purger là-dessus effacerait
>   l'inscription en cours à chaque lancement.
> · L'identité entre en tête de `hydrateFromCloud`, ce qui referme **les cinq domaines**
>   d'un seul geste — le constat était sous-estimé, comme le contre-audit l'avait mesuré.
> 🔴 **Mais PAS la garde telle qu'écrite** : l'`id` d'un profil local est
> `user-<horodatage>`, pas un uid. Appliquée à la lettre, la reco jetait le profil de
> quelqu'un dont le push a échoué hors ligne juste après l'inscription (`CA-1-04`).
- **Sévérité : P0**
- **Preuve** :
  - la purge locale n'existe QUE dans `app/(tabs)/profil.tsx:336-341` (`doLogout`), déclenchée par le bouton « Se déconnecter ». `signOut()` lui-même ne purge rien : `hooks/useAuth.tsx:239` → `await supabase.auth.signOut();`
  - aucune purge sur les autres chemins de perte de session : `grep multiRemove|AsyncStorage.clear|clearProfile` sur `app/(auth)/login.tsx`, `app/_layout.tsx`, `lib/boot.ts`, `hooks/useAuth.tsx` → **rien**. `onAuthStateChange` (`useAuth.tsx:93-96`) se contente de `setSession(s)`.
  - `decideProfileHydration` (`lib/syncGuard.ts:26-35`) ne prend que trois booléens — `hasCloud`, `hasLocal`, `localDirty`. **Aucune comparaison d'identité** : `grep 'local.id|id === uid|.id !== uid'` sur `lib/` et `hooks/` → aucun résultat. Le profil local porte pourtant un `id` (`lib/types.ts:307`).
  - conséquence dans le code : profil local marqué « à pousser » → `keep_local` → `pushProfile(local)` (`lib/sync.ts:406`) → `profileToRow(p, uid)` (`:218`) **écrit le profil de A dans la ligne cloud de B**. Hors ce cas, `pull_cloud` laisse survivre `localOnlyProfileFields(local)` (`:398`), et série, pesées, réserve, favoris et overrides sont **fusionnés** (`mergeStreak`, `mergeWeightEntries`, `mergeRecipeOverrides`), jamais remplacés.
  - aucun test ne couvre le sujet : `grep -rl 'multiRemove|doLogout|second compte|changement de compte'` sur `lib/__tests__/` et `test/` → **vide**.
- **Scénario concret** : le jeton de rafraîchissement de A expire ou est révoqué (mot de passe changé ailleurs, compte supprimé depuis un autre appareil, session invalidée). L'app repasse au login **sans rien effacer**. B se connecte sur le même téléphone : son poids, son %MG et ses cibles sont écrasés par ceux de A — ou, si le local de A était « à pousser », **les données de santé de A partent dans le compte cloud de B**.
- **Risque** : données de santé d'autrui, RGPD (art. 5.1.d exactitude, art. 32 sécurité), et plan alimentaire calculé sur le corps de quelqu'un d'autre.
- **Reco** : faire de la purge une propriété de `signOut()` et non de son appelant, **et** ajouter l'identité à la décision d'hydratation — un `@kyroz:profile` dont l'`id` diffère de l'`uid` entrant se jette, il ne se fusionne pas.
- **Effort : M**

### 01-02 Le garde-fou vit chez l'appelant : il disparaît au troisième appelant
- **Sévérité : P1**
- **Preuve** : deux appelants aujourd'hui, tous deux dans le même fichier (`app/(tabs)/profil.tsx:333` et `:350`), chacun suivi de sa propre purge — recopiée, pas partagée. `hooks/useAuth.tsx:239` expose un `signOut` qui ne purge pas.
- **Risque** : un troisième point de déconnexion (session expirée gérée proprement, bouton dans un autre écran, déconnexion après suppression distante) rouvre 01-01 sans que rien ne rougisse.
- **Reco** : un seul `signOut` qui purge, et un test qui **compte** les appels à `supabase.auth.signOut()` hors de ce point.
- **Effort : S**

### 01-03 « Toutes tes données seront supprimées » n'est pas vrai
> ✅ **CORRIGÉ le 2026-08-27, ET L'ÉTAPE HUMAINE EST FAITE LE MÊME JOUR** — fiche :
> `AGENTS.md` **A41** ; procédure **close** (secret posé, Edge Function déployée en v8,
> vérifiée sur un compte jetable, orphelins retirés) :
> `docs/PROCEDURE-2026-08-27-suppression-revenuecat.md`.
> · **RevenueCat** : réel, et plus large que le constat — `identifyUser(uid)` étant appelé
>   SANS CONDITION, un abonné existe pour **tout le monde**, abonné ou non, ce qui met en
>   défaut le §7 de la politique (« si vous avez souscrit »). `delete-account` supprime
>   désormais l'abonné **avant** la cascade, best-effort borné, jamais bloquant.
> · **PostHog** : **close par les faits, la veille du constat** — `distinctId()` n'est appelé
>   que depuis `capture()`, qui sort avant tout sur `STATISTIQUES_USAGE_ACTIVES` (false depuis
>   le 2026-08-26). Aucun pseudonyme ne peut plus naître, données supprimées à la source.
> · **La phrase** avait DEUX défauts opposés : « toutes » côté serveur, et une liste qui
>   TAISAIT les pesées et les photos côté appareil — que le code efface pourtant.
- **Sévérité : P1**
- **Preuve** : le texte de confirmation promet « Toutes tes données (profil, plans, série, favoris, réserve) […] définitivement supprimées, sur cet appareil et sur le serveur » (`app/(tabs)/profil.tsx:782`). Or :
  - **RevenueCat** : `identifyUser(null)` → `logOut()` réinitialise l'identité (`hooks/usePremium.ts:52`, `lib/purchases.ts:201`), le **client n'est pas supprimé**. Aucun appel de suppression, aucune procédure manuelle écrite.
  - **PostHog** : `AsyncStorage.clear()` (`:351`) efface `@kyroz:analyticsId` — **le pseudonyme est détruit avant d'avoir pu servir**. La politique promet une suppression ciblée par UUID et les Réglages préparent un e-mail avec ce pseudonyme : après suppression du compte, plus personne ne sait quoi demander. Concerne les comptes ayant consenti entre le 2026-08-18 et l'extinction du 2026-08-26.
- **Risque** : contradiction directe avec la règle produit « zéro malhonnêteté », et avec la politique de confidentialité — donc étape 9.
- **Reco** : soit supprimer réellement chez les sous-traitants, soit dire ce qui subsiste et pendant combien de temps. Et proposer l'effacement des statistiques **avant** d'effacer le pseudonyme.
- **Effort : M**

### 01-04 Les sauvegardes OS emportent la session et les données de santé, sans que le registre le dise
- **Sévérité : P1**
- **Preuve** : `createClient(..., { auth: { storage: AsyncStorage } })` (`lib/supabase.ts:60`) — session en clair. `@kyroz:profile`, `@kyroz:weights`, `@kyroz:weightPhotos` de même. `allowBackup` n'est déclaré ni dans `app.json` ni ailleurs (défaut Android `true`), et aucun dossier `android/` n'existe dans le dépôt pour le contredire. Aucune exclusion iCloud côté iOS.
- **Risque** : des données de santé et un jeton de session transitent vers Google et Apple, ce que `RGPD-REGISTRE.md` ne documente pas. Ce n'est pas forcément un défaut — c'est une décision non prise et non écrite.
- **Reco** : trancher (exclure des sauvegardes, ou chiffrer la session via SecureStore + AES), puis **écrire la décision au registre**. Ne pas laisser le défaut décider.
- **Effort : M**

### 01-05 Rien ne dit que supprimer son compte n'annule pas l'abonnement
> ✅ **CORRIGÉ le 2026-08-27** — fiche : `AGENTS.md` **A47**. La condition était tombée le
> matin même (`PAYWALL_LAUNCH` porte une date, A45) ; le constat est passé de « sans effet »
> à bloquant, puis clos dans la journée.
> La feuille de suppression dit désormais : *« Un abonnement Kyroz+ n'est pas annulé par
> cette suppression : il se résilie depuis les réglages de ton compte App Store »* — et le
> nom du store se LIT sur `Platform.OS`, il n'est pas écrit en dur.
> 🔴 **Affichée SANS CONDITION, et c'est mesuré** : la conditionner à `premium.entitled`
> paraît plus propre, mais **hors ligne un abonné est traité comme non abonné** (`07-03`).
> La garde aurait donc disparu pour la personne qui en a besoin, en silence. La
> FORMULATION porte la condition à la place du code — « un abonnement Kyroz+ » reste vrai
> pour qui n'en a pas.
> ⚠️ Ce qu'elle ne dit pas, et c'est voulu : le détail de la facturation qui SUBSISTE chez
> Apple ou Google vit au §7 de la politique. Ici on annonce un prélèvement **à venir**.
> ➡️ Garde-fou : `preuveAvantSuppression.test.ts` — **3 mutations, 3 rouges** (phrase
> retirée, store en dur, formulation retournée).
- **Sévérité : P1** (~~conditionnée~~ — **ACTIVE depuis le 2026-08-27**)
- **Preuve** : `grep -niE "abonnement.*(annul|résil)"` sur `app/` et `components/` → aucun résultat. La feuille de confirmation (`profil.tsx:781-783`) n'en parle pas.
- **Risque** : quelqu'un supprime son compte en croyant arrêter le prélèvement, et continue d'être débité par l'App Store. C'est un motif de litige et de mauvais avis.
- **Reco** : une phrase dans la feuille de suppression, avec le chemin réel (Réglages iOS → Abonnements). À traiter avec l'étape 7.
- **Effort : S**

### 01-06 Aucune ré-authentification avant les actions destructrices
- **Sévérité : P2**
- **Preuve** : `doDelete` (`profil.tsx:346`) et `setNewPassword` (`hooks/useAuth.tsx:220`) n'exigent aucune re-saisie du mot de passe. `grep -rn "reauth|currentPassword"` → aucun résultat.
- **Risque** : un téléphone déverrouillé et laissé sans surveillance suffit à supprimer le compte. Combiné à 01-04 (session en clair dans les sauvegardes), la session est le seul facteur.
- **Reco** : re-saisie du mot de passe avant suppression définitive.
- **Effort : S**

### 01-07 La clé RevenueCat Android n'existe sur aucun environnement
> ✅ **TRANCHÉ le 2026-08-27 — ANDROID NE SORT PAS.** Décision fondateur, en toutes
> lettres : *« dans tous les cas l'app ne sort pas sur le Google store pour l'instant, ça
> sera le taff de la semaine pro »*. La V1 est **iOS seule**.
> 🔴 **CE CONSTAT EST DONC SANS OBJET POUR LA V1, et il a fallu deux formulations pour y
> arriver.** La première version de cet arbitrage disait « Android sort sans achat in-app »
> — elle supposait qu'Android partait quand même. Il ne part pas : la question de la clé ne
> se pose pas encore. Elle repart avec le chantier Android, semaine du 2026-08-31.
> ⚠️ **Ce qui ne change pas** : le jour où Android sortira, la chaîne complète devra être
> faite (app Play Console, abonnement `kyroz_plus` et ses deux base plans, app Android
> rattachée dans RevenueCat, puis la clé `goog_…`) — sinon l'app sortira sans pouvoir
> vendre, et **rien à l'écran ne le dira** hors la phrase corrigée ci-dessous.
>
> ⚠️ **CE N'ÉTAIT QU'À MOITIÉ UN CHOIX, et la mesure le dit** : poser la clé n'est pas un
> geste, c'est une CHAÎNE dont aucun maillon n'existe — app dans la Play Console,
> abonnement `kyroz_plus` avec ses deux base plans, app Android rattachée dans RevenueCat,
> puis la clé `goog_…`. Les deux seuls builds Android datent du **2026-07-30**, un mois
> avant tout le chantier paywall. Android ne pouvait pas vendre en V1 quelle qu'eût été la
> décision ; ce qui se décidait, c'était de **l'écrire** plutôt que de laisser croire à la
> parité.
>
> 🔴 **ET LA DÉCISION A DÉCOUVERT UN MENSONGE À L'ÉCRAN, que la pose de `PAYWALL_LAUNCH`
> avait armé le matin même.** L'écran Kyroz+ affichait, quand la plateforme ne peut pas
> encaisser : « L'abonnement n'est pas encore ouvert sur cette version de l'app. **Tes deux
> outils restent actifs en attendant.** » Ce bloc ne se rend que si `reason === 'locked'` —
> donc la personne qui lisait cette phrase était exactement celle à qui les deux outils
> étaient FERMÉS. Vrai tant que rien n'était verrouillé, faux depuis le 2026-08-27, et pour
> tout Android. ✅ Corrigé le jour même, garde-fou dans `verrouKyrozPlus.test.ts`
> (**2 mutations**) : cet écran ne promet pas un accès à qui ne l'a pas.
>
> ➡️ **Ce que la décision oblige ailleurs** : la fiche store et `STORE-RELEASE.md` doivent
> dire qu'Android sort sans achat, plutôt que de décrire une parité qui n'existe pas.
- **Sévérité : P2** (P1 si Android part en V1 — ✅ **arbitré : Android ne vend pas**)
- **Preuve** : `eas env:list` sur les trois environnements → `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` **absente partout** ; seule `EXPO_PUBLIC_REVENUECAT_IOS_KEY` existe, en `production` uniquement.
- **Risque** : sur Android `purchasesConfigured()` (`lib/purchases.ts:67`) est faux, donc **aucun bouton d'achat n'est rendu**. La dégradation est propre — pas de crash, pas d'écran mort — mais Android ne peut rien vendre.
- **Reco** : poser la clé, ou acter par écrit qu'Android sort sans achat.
- **Effort : S**

### 01-08 Le contrôle des migrations est mort en local, et ne le dit qu'à qui le lance
- **Sévérité : P2**
- **Preuve** : `npm run check:migrations` depuis le worktree porteur d'un `.env.local` → `✖ colonne inexistante → doit être 400  HTTP 401` puis arrêt. La clé de `.env.local` (39 caractères) est rejetée par la prod (`{"message":"Invalid API key"}`) ; celle d'EAS (46 caractères) répond bien `400`. Le script **prend `.env.local` quand `process.env` est vide** (`scripts/check-migrations.mjs:24-34`).
- **Ce qui a bien marché** : le script **refuse de conclure** quand son témoin négatif échoue. Il ne ment pas, il s'arrête. C'est le bon comportement.
- **Risque** : le garde-fou qui protège de « migration écrite mais jamais jouée » ne tourne que si on pense à `eas-cli env:exec production 'node scripts/check-migrations.mjs'` — ce qui n'est écrit nulle part.
- **Reco** : soit le script bascule seul sur les variables EAS, soit `.env.local` est rafraîchi et la commande documentée.
- **Effort : S**

### 01-09 Les journaux de production ne sont pas retirés
- **Sévérité : P3**
- **Preuve** : 46 `console.*` dans le dépôt, dont **6 seulement dans le code embarqué** (`components/ErrorBoundary.tsx:42`, `components/GuidedTour.tsx:229`, `lib/analytics.ts:179` — gardé par `__DEV__` —, `lib/sync.ts:146`, `:274`, `:564`). Le reste vit dans `test/`, non bundlé. Aucun `transform-remove-console` dans `babel.config.js`.
- **Risque** : faible. **Aucun payload utilisateur n'est journalisé** : noms de colonnes, noms de tables, résumés d'erreur. Seul `errorSummary(error)` (`lib/sync.ts:145`) peut relayer un message Postgres.
- **Reco** : retirer les `console.*` du bundle de production, ou acter qu'ils servent au support.
- **Effort : S**

### 01-10 L'Edge Function renvoie ses erreurs internes au client
- **Sévérité : P3**
- **Preuve** : `supabase/functions/delete-account/index.ts:55` renvoie `dErr.message` et `:58` renvoie `String(e)` — donc le texte d'exception brut.
- **Risque** : divulgation d'internes (message Postgres, trace). Faible : l'appelant est déjà authentifié comme lui-même.
- **Reco** : message générique côté client, détail côté journaux de la fonction.
- **Effort : S**

### 01-11 `profiles.stripe_customer_id` est une colonne morte
- **Sévérité : P3**
- **Preuve** : `supabase/schema.sql:143` — « Paiement (Stripe — Phase 2 ultérieure) ». Stripe n'est plus la voie retenue (RevenueCat), et `grep stripe` ne rend aucun usage applicatif.
- **Risque** : nul aujourd'hui. C'est une colonne qui invite à y écrire un identifiant de sous-traitant non documenté au registre.
- **Reco** : la retirer, ou la documenter comme réservée.
- **Effort : S**

### 01-12 Le code d'accès reviewer est extractible du binaire — décision assumée, à refermer après la revue
- **Sévérité : P2** (décision datée, pas un oubli)
- **Preuve** : `EXPO_PUBLIC_REVIEW_CODE` est posée en `production` et **présente dans le bundle natif publié** (mesurée sur le `.hbc` de la 24ᵉ OTA : 1 occurrence, avec `review@kyroz.app`). `isReviewLogin` (`lib/reviewAccess.ts:25`) ouvre alors une session invité sans confirmation d'e-mail.
- **La prémisse du module a été RE-MESURÉE, et elle tient** : le bundle web déployé (`brgkevin-arch.github.io/Kyroz-app/_expo/static/js/web/entry-53b5723c…js`, 3,7 Mo) contient l'e-mail sentinelle (1) mais **pas le code** (0), témoin de contrôle `supabase` à 13. La surface scriptable est bien fermée.
- **Risque** : quiconque extrait la chaîne du binaire peut ouvrir une session invité. Pas d'accès aux données d'autrui (la RLS tient), mais création d'invités non maîtrisée.
- **Reco** : rotation du code après la revue, et remplacement par le mécanisme daté déjà décidé.
- **Effort : S**

## Checklist humaine

Ce qui ne peut pas être établi depuis le dépôt. Rien de ce qui suit n'est présenté comme vérifié.

- [ ] **RLS testée avec deux comptes réels**, pour chacune des 6 tables :
      `curl -H "apikey: <anon>" -H "Authorization: Bearer <JWT de A>" "<url>/rest/v1/<table>?select=*"`
      ne doit rendre que les lignes de A. Le schéma est juste ; seul le réseau prouve la prod.
- [ ] **Dashboard Supabase** : quels schémas sont exposés à l'API, protection contre les mots de passe compromis, captcha, limites de débit, expiration des OTP. Aucun `supabase/config.toml` dans le dépôt → **rien de tout cela n'est versionné**.
- [ ] **`verify_jwt` de l'Edge Function `delete-account`** : réglage de déploiement, invisible depuis le dépôt. La fonction se défend elle-même (401 sans `Authorization`, `:39`), mais le réglage doit être constaté.
- [ ] **Reproduire 01-01 sur un appareil** : compte A, invalider sa session depuis un autre appareil, puis se connecter avec B sur le premier. Regarder le poids affiché, puis la ligne cloud de B.
- [ ] **Restaurer une sauvegarde** (iCloud / Google) sur un second appareil : les données de profil et la session y sont-elles ? La réponse décide de 01-04.
- [ ] **Procédures de suppression chez RevenueCat et PostHog**, écrites noir sur blanc : où, comment, sous quel délai.
- [ ] **Rotation du code de revue** après la revue Apple. Note : ce code a été manipulé en clair pendant cet audit pour mesurer sa présence dans les bundles.
- [ ] **Région du projet Supabase** : le schéma affirme « EU only » en commentaire (`schema.sql:8`). À constater dans le dashboard, pas dans un commentaire.

## Hors périmètre / non couvert

- **Étape 7 (monétisation)** : la chaîne d'entitlement, les prix, l'état du paywall. 01-05 et 01-07 y sont rattachés.
- **Étape 8 (analytics)** : le périmètre d'events et le consentement. ⚠️ **La condition de lancement de l'étape 8 est périmée** — elle exige « instrumentation PostHog en place », or la mesure a été éteinte le 2026-08-26 (24ᵉ OTA, `STATISTIQUES_USAGE_ACTIVES = false`). Ce qu'il reste à auditer est l'**extinction** et ce que les textes promettent encore, pas l'instrumentation.
- **Étape 9 (conformité)** : la confrontation politique de confidentialité ↔ `RGPD-REGISTRE.md` ↔ code. Les inventaires des sections A et C sont écrits pour elle. 01-03 et 01-04 la concernent directement.
- **Étape 3 (store readiness)** : crash reporter, permissions déclarées. Constaté au passage, non instruit : `app.json` déclare `permissions: []`, bloque `RECORD_AUDIO` et `SYSTEM_ALERT_WINDOW`, et `expo-image-picker` porte trois textes de permission en français.
- **Ce que je n'ai pas ouvert** : les 30 modules de stockage ont été inventoriés par leurs CLÉS (`grep` sur `'@kyroz:…'`), pas lus un par un. Le tableau C dit ce qui est persisté, pas la logique qui l'écrit.
- **`RGPD-REGISTRE.md`** : lu en diagonale pour confronter les promesses, pas audité. C'est l'objet de l'étape 9.
