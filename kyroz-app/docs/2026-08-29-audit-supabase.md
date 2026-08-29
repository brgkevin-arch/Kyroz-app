# Audit Supabase — 2026-08-29

Commit audité : `9036e30` · Périmètre : projet `rgdjsdnqlmfkourrhijv` (schéma, 18 migrations,
RLS, auth, Edge Function, environnements EAS), mesuré **contre la prod**, en lecture seule.

> **Ce document ne remplace pas `docs/audit-v1/01-securite-donnees.md` (2026-08-26, `c17e667`),
> il le prolonge.** Cet audit-là couvrait déjà le schéma, les policies, les clés, le stockage
> appareil, la suppression de compte et l'auth, et il produisait douze constats (`01-01` à
> `01-12`). Rejouer son périmètre n'aurait rien appris. Ce qui suit fait trois choses :
> **(1)** re-mesurer ce qui périme, **(2)** fermer par la mesure des lignes de sa
> « checklist humaine », **(3)** nommer ce qu'il n'a pas vu.

> ⚠️ **Aucun compte n'a été créé, aucune ligne écrite.** Toutes les sondes sont des `GET`, ou
> des `POST` volontairement vides dont on ne lit que le **code de retour**. Le prix : la RLS
> est prouvée contre un **anonyme sans session**, pas entre deux comptes réels — cette
> ligne-là reste ouverte, voir « Ce qui n'a pas pu être mesuré ».

---

## 1. Verdict

**Le cloisonnement tient, et il est mesuré aujourd'hui.** Six tables, RLS `enable` **et**
`force` sur les six, policies `for all` avec `using` **et** `with check`, `anon` sans aucun
droit de table. Un anonyme sans session lit `[]` sur les six, compte `0` lignes, et se fait
refuser toute écriture par la RLS elle-même (`42501`). Aucune table inattendue n'est exposée.
Le schéma de la prod porte les 40 colonnes de `PROFILE_COLS`. La confirmation e-mail est
active. `verify_jwt` est **ON** sur l'Edge Function — c'était une case ouverte de l'audit
précédent, elle se ferme ici.

**Cinq constats nouveaux**, dont aucun n'est une faille d'accès. Trois touchent la
**reconstruction** et la **rétention** — c'est-à-dire ce qui se voit le jour où la base doit
être recréée, ou le jour où quelqu'un demande ce qu'on garde de lui.

| | Constat | Sévérité |
|---|---|---|
| `S-01` | `schema.sql` ne sait plus recréer la base — `birth_date` manque, et le verrou est aveugle à ce cas précis | **P2** |
| `S-02` | Un seul projet Supabase pour les 3 environnements **et** le poste local : la QA écrit dans la base des vrais utilisateurs | **P2** |
| `S-03` | Aucune purge des comptes invités abandonnés — données de santé conservées sans limite, et irréclamables | **P2** |
| `S-04` | `RUNBOOK-PROD.md` : le journal qui devait dire ce qui tourne en prod est **vide**, à côté d'un autre qui est rempli | **P3** |
| `S-05` | `set_updated_at` sans `search_path` figé ; `auth.uid()` ré-évalué à chaque ligne dans les 6 policies | **P3** |

---

## 2. Ce qui a été mesuré aujourd'hui

### 2.1 Schéma en prod — ✅

`npm run check:migrations:prod` (à travers les variables EAS `production`) :

```
Témoin — colonne inexistante → doit être 400        HTTP 400   ✓ la mesure discrimine
6 tables (profiles…recipe_overrides)                HTTP 200   ✓
40 colonnes de PROFILE_COLS, en UNE requête         HTTP 200   ✓
```

Le témoin négatif passe **en premier** : sans lui, un `200` obtenu pour une autre raison se
lirait comme une preuve.

### 2.2 Cloisonnement, sans session — ✅

Témoin d'abord : `GET /rest/v1/table_qui_nexiste_pas_kyroz` → **404**, la sonde sait dire non.

| Table | `GET` sans session | `Content-Range` | `POST {}` sans session |
|---|---|---|---|
| `profiles` | `200` `[]` | `*/0` | `401` — `42501` *new row violates row-level security policy* |
| `streaks` | `200` `[]` | `*/0` | `401` — `42501` |
| `favorites` | `200` `[]` | `*/0` | `401` — `42501` |
| `pantry` | `200` `[]` | `*/0` | `401` — `42501` |
| `weight_logs` | `200` `[]` | `*/0` | `401` — `42501` |
| `recipe_overrides` | `200` `[]` | `*/0` | `401` — `42501` |

Le `count=exact` compte : il prouve que la RLS masque aussi le **nombre** de lignes, pas
seulement leur contenu. Et les colonnes sensibles demandées nommément
(`email`, `weight_kg`, `consent_health_data`, `stripe_customer_id`) rendent `[]` elles aussi.

**Rien d'autre n'est exposé** — `meal_plans`, `users`, `subscriptions`, `logs`, `admin`,
`purchases`, `events` → **404** chacune. La table `meal_plans` retirée le 2026-06-14 est bien
partie. ℹ️ Le catalogue OpenAPI (`GET /rest/v1/`) répond désormais
`{"message":"Secret API key required"}` : avec les nouvelles clés `sb_publishable_`, le
schéma **ne s'énumère plus** depuis le client. C'est une amélioration gratuite du format de
clé, pas un réglage — mais elle vaut d'être notée.

### 2.3 Authentification — ✅

`npm run check:auth`, puis re-passé à travers les variables EAS `production` : **résultats
identiques**.

| Réglage | État |
|---|---|
| provider e-mail | ouvert |
| création de compte | ouverte |
| **confirmation e-mail** | **EXIGÉE** (`mailer_autoconfirm: false`) |
| connexion invité (anonyme) | **ouverte** — décision datée, cf. `project-compte-invite-apres-revue` |
| Apple, Google, et les 21 autres providers | fermés |
| téléphone / SMS | fermé |
| passkeys, SAML | désactivés |

### 2.4 Edge Function `delete-account` — ✅ et **une case fermée**

L'audit précédent laissait ouvert : *« `verify_jwt` de l'Edge Function : réglage de
déploiement, invisible depuis le dépôt »*. Il se mesure — en regardant **qui prononce le
refus**, la passerelle ou le code du fichier :

| Requête | Réponse | Qui refuse |
|---|---|---|
| sans `apikey` ni `Authorization` | `401` `{"code":"UNAUTHORIZED_NO_AUTH_HEADER"}` | **la passerelle** → `verify_jwt` est **ON** |
| `Authorization: Bearer <jeton bidon>` | `401` `{"code":"UNAUTHORIZED_LEGACY_JWT","message":"Invalid JWT"}` | **la passerelle** |
| `apikey` seule | `401` `{"error":"Non authentifié"}` | le code du dépôt (`index.ts:135`) |
| `Authorization: Bearer <clé anon>` | `401` `{"error":"Session invalide"}` | le code, après `getUser()` (`:146`) |

➡️ **Deux couches, et les deux répondent.** Les codes en `UNAUTHORIZED_*` ne sont écrits nulle
part dans le dépôt : ils viennent de la plateforme, donc `verify_jwt` est actif. Et quand la
passerelle laisse passer (une clé publiable EST une `apikey` valide), le `getUser()` de la
fonction refuse derrière. C'est la bonne disposition.

### 2.5 Storage — ✅ aucun bucket

`GET /storage/v1/bucket` → `200 []`. Cohérent avec `lib/photos.ts` : les photos de progression
vivent dans le **cache de l'appareil** et ne partent jamais au serveur.

---

## 3. Constats

### S-01 — `schema.sql` ne sait plus recréer la base, et le verrou est aveugle à ce cas

- **Sévérité : P2** · **Effort : S**

**Preuve.** `birth_date` est dans `PROFILE_COLS` (`lib/sync.ts:56`), dans la migration
`2026-08-02_profiles_birth_date.sql`, en prod (`200`, mesuré) — et **absente de
`supabase/schema.sql`**. Diff complet des 18 migrations contre `schema.sql` : c'est la
**seule** colonne dans ce cas.

**Ce qui rend ce constat particulier, c'est que le fichier se l'interdit lui-même.** En-tête
de `schema.sql`, lignes 17-22, écrit après l'audit du 2026-07-28 qui avait trouvé
`low_ea_weeks` et `hidden_recipes` dans le même état :

> *« ⚠️ INVARIANT : toute colonne listée dans `PROFILE_COLS` (lib/sync.ts) DOIT exister ici.
> Une base recréée depuis ce seul fichier avec une colonne manquante ne lève aucune exception :
> le push profil retombe en 400/PGRST204 […] la synchro cloud est morte en silence. »*

L'invariant est violé **aujourd'hui**, par la colonne suivante, avec le mode de panne décrit
mot pour mot.

**🔴 Et le verrou censé l'attraper est vert.** `lib/__tests__/profileCols.test.ts` — 6 tests,
**6 passés**, mesuré. Il ne peut pas échouer : `serverColumns()` prend l'**UNION** de
`schema.sql` et des migrations (`profileCols.test.ts:107-114`), avec ce commentaire —

> *« On prend l'UNION et non "schema.sql seul" parce qu'une colonne peut être ajoutée dans
> une migration et oubliée dans schema.sql : la panne qu'on veut attraper viendrait
> précisément de cet oubli. »*

L'union est le bon choix **pour la question qu'il pose** (« la colonne existe-t-elle quelque
part côté serveur ? »). Elle est le mauvais choix pour la question que l'en-tête de
`schema.sql` pose (« ce fichier suffit-il à recréer la base ? »). **Deux questions, un seul
test, et c'est la seconde qui n'est gardée par personne.**

**Risque.** Nul tant que la base existe. Réel le jour où on en crée une seconde — et c'est
exactement ce que `S-02` recommande. Un environnement de recette monté depuis `schema.sql`
naîtrait sans `birth_date` : synchro du profil **entièrement** rejetée (l'upsert est global),
en silence. Vaut aussi pour une reprise après sinistre.

**Reco.** Deux gestes, dans cet ordre :
1. ajouter `birth_date date` au `create table` de `schema.sql` **et** son `alter table … add
   column if not exists` idempotent, comme les onze autres colonnes de migration ;
2. ajouter au verrou un **7ᵉ test** qui compare `PROFILE_COLS` à `schema.sql` **seul** —
   celui-là doit être rouge avant le geste 1 et vert après. *Un garde-fou qu'on n'a jamais vu
   rougir sur le cas visé ne prouve rien.*

---

### S-02 — Un seul projet Supabase pour les trois environnements **et** le poste local

- **Sévérité : P2** · **Effort : M** (c'est une décision, pas un patch)

**Preuve.** `eas env:list` sur les trois environnements, et l'empreinte du `.env.local` :

| Source | `EXPO_PUBLIC_SUPABASE_URL` | Clé anon (sha256, 12 car.) |
|---|---|---|
| EAS `development` | `rgdjsdnqlmfkourrhijv.supabase.co` | `80d3833b5efc` |
| EAS `preview` | `rgdjsdnqlmfkourrhijv.supabase.co` | `80d3833b5efc` |
| EAS `production` | `rgdjsdnqlmfkourrhijv.supabase.co` | `80d3833b5efc` |
| `kyroz-app/.env.local` | *(sha256 identique)* `776567ae6045` | `80d3833b5efc` |

**Une seule base. Quatre chemins vers elle.** Le poste de dev, les builds de recette, les
builds TestFlight et la production écrivent tous dans la base des vrais utilisateurs.

**Ce que ça produit déjà, et ce n'est pas hypothétique** : les parcours QA
(`test/qa-full.mjs`, `qa-deep.mjs`, `qa-settings.mjs`) ouvrent une **session invité par
persona** (`_harness.mjs:185`), la font passer par **l'onboarding complet**, donc écrivent
sexe, âge, poids, taille, %MG et objectif — des **données de santé** — dans la table
`profiles` de production. Vérifié, et pas supposé : `hooks/useProfile.ts:115` appelle
`pushProfile(p)` à **chaque** enregistrement de profil, et le dépôt ne porte **aucun
interrupteur** qui couperait la synchro en mode test (`grep` sur `E2E`, `disableSync`,
`NODE_ENV === 'test'` → zéro résultat). `qa-full.mjs:92` le dit en clair : *« Chaque persona consomme UNE
création d'invité, et Supabase les plafonne par heure et par IP »*. Le plafond `429` est
d'ailleurs la seule chose qui limite aujourd'hui le volume.

**Risque.** Trois, distincts :
- **rétention** — chaque passage de QA laisse des lignes de données de santé qui ne sont
  jamais nettoyées (voir `S-03`) ;
- **mesure contaminée** — tout comptage futur (utilisateurs, profils complets, rétention)
  additionne des vrais comptes et des personas de test, sans moyen de les distinguer : ni
  colonne `is_test`, ni convention de nommage, et un invité n'a même pas d'e-mail ;
- **pas de filet** — aucune base où éprouver une migration avant de la jouer sur la vraie.
  Le mode de panne « migration non jouée » a coupé la synchro **trois fois** ; son cousin
  « migration jouée et fausse » n'a, lui, aucun garde-fou.

**Reco.** Ne pas ouvrir ce chantier avant la sortie — mais **l'écrire**, parce que ce n'est
aujourd'hui une décision nulle part. La forme minimale : un second projet Supabase
(gratuit), sa `schema.sql` jouée dessus (ce qui **exige** `S-01` d'être corrigé d'abord),
et son URL posée sur les environnements `development` et `preview` d'EAS ainsi que dans
`.env.local`. À défaut, acter par écrit que la QA tourne en prod, et pourquoi.

---

### S-03 — Les comptes invités abandonnés gardent des données de santé, sans limite et sans recours

- **Sévérité : P2** · **Effort : M**

**Preuve.** Trois faits qui ne se lisent jamais ensemble :

1. **Un invité crée les mêmes lignes qu'un compte réel.** Le trigger `on_auth_user_created`
   (`schema.sql:284`) tire sur **tout** `insert` dans `auth.users`, provider anonyme compris :
   une ligne `profiles` (avec `email` à `NULL`) et une ligne `streaks`.
2. **Un invité remplit un profil de santé.** L'affordance existe en clair
   (`app/(auth)/login.tsx:271`, « Continuer en invité »), et l'onboarding qui suit écrit
   sexe, âge, poids, taille, %MG, objectif.
3. **Rien ne les efface jamais.** `grep` sur `supabase/` : aucun `pg_cron`, aucune tâche
   planifiée, aucun `delete` de maintenance. La seule suppression est celle que
   **l'utilisateur** déclenche depuis l'écran Profil.

Or un invité qui désinstalle l'app perd sa session — et avec elle **tout moyen de se
reconnecter** : pas d'e-mail, pas de mot de passe. Son compte devient irréclamable, par lui
comme par nous. Le `JOURNAL-MIGRATIONS.md` en porte déjà un cas nommé, du 2026-07-31 :
*« la ligne `auth.users` ne peut pas l'être avec la clé anonyme. À purger depuis le
dashboard »*.

**Risque, et il est juridique avant d'être technique.** Le §7 de la politique de
confidentialité promet : *« Vos données sont conservées tant que votre compte est actif. Elles
sont supprimées (serveur + appareil) lorsque vous supprimez votre compte. »* Pour un invité
abandonné, **aucune des deux branches ne se réalise** : le compte n'est jamais déclaré
inactif (rien ne mesure l'activité), et la suppression ne peut plus être demandée. Des données
de santé restent donc en base **indéfiniment**, sans que personne — pas même leur titulaire —
puisse y toucher. C'est le même défaut de forme que celui déjà corrigé sur PostHog le
2026-08-18 : *une promesse de rétention qui n'a pas de mécanisme derrière*.

⚠️ **Ce constat n'est pas dans `01-securite-donnees.md`**, qui traite la suppression **à la
demande** (section D, `01-03`) et la conserve comme un chemin d'utilisateur. Il ne pose pas la
question de ceux qui ne demanderont jamais.

**Reco.** Un des trois, à trancher — pas les trois :
- **purge** : une tâche `pg_cron` qui supprime les `auth.users` anonymes sans activité depuis
  N jours (la cascade fait le reste). C'est le seul geste qui rende le §7 vrai ;
- **ou** nommer la limite dans le §7 (« un compte invité non rattaché à une adresse e-mail
  est conservé jusqu'à… ») ;
- **ou** acter par écrit que le volume est négligeable avant la sortie et re-poser la question
  après — mais **avec une mesure**, pas une impression. Cette mesure demande le dashboard :
  `Authentication → Users`, filtre sur les comptes anonymes.

> ℹ️ **Ce qui protège aujourd'hui** : Supabase plafonne la création d'invités par heure et par
> IP (les `429` observés par la QA), donc l'accumulation est lente. C'est une limite de débit,
> pas une politique de rétention.

---

### S-04 — Le journal qui devait dire ce qui tourne en prod est vide, à côté d'un autre qui est rempli

- **Sévérité : P3** · **Effort : S**

**Preuve.** `supabase/RUNBOOK-PROD.md` §4 s'intitule *« Journal des migrations appliquées
(cause racine P0.1/P4.2) »* et demande : *« Renseigne la date à laquelle tu as VRAIMENT joué
chaque migration en prod […] Colonne vide = pas confirmé. »* Les **neuf** lignes de son tableau
ont leur colonne « Appliquée en prod le » **vide**. Il en manque par ailleurs neuf : le dépôt
porte **18** migrations.

Ce rôle est tenu depuis, et bien, par `supabase/JOURNAL-MIGRATIONS.md` — daté, mesuré,
avec ses témoins négatifs. Le runbook n'a pas été retiré ni renvoyé vers lui.

**Risque.** Faible mais réel : deux documents répondent à la même question, l'un dit « rien
n'est confirmé », l'autre dit « tout est vérifié ». Le premier qu'on ouvre décide de ce qu'on
croit. Et son §1 (« Appliquer les migrations en attente ») envoie jouer
`2026-07-21_pending_all.sql` — un geste sans objet depuis longtemps.

**Reco.** Retirer le §4 et le §1 du runbook, et poser en tête un renvoi vers
`JOURNAL-MIGRATIONS.md` et `npm run check:migrations:prod`. Garder les §2 et §3, qui décrivent
des vérifications de bout en bout qu'aucun script ne remplace.

---

### S-05 — Deux durcissements standard non posés

- **Sévérité : P3** · **Effort : S**

**a) `set_updated_at` n'a pas de `search_path` figé.** `schema.sql:246` — `create or replace
function public.set_updated_at() returns trigger language plpgsql as $$ … $$`. Sa jumelle
`handle_new_user` (`:272`) porte bien `security definer set search_path = public`. La
différence est notée dans l'audit précédent (*« `set_updated_at` n'est pas `security
definer` »*) mais sans sa conséquence : c'est le motif `function_search_path_mutable` du
linter Supabase. Le risque est faible ici (la fonction ne fait qu'écrire `new.updated_at`, et
n'est pas `security definer`), mais le durcissement est gratuit — `set search_path = ''`.

**b) `auth.uid()` est ré-évalué à chaque ligne.** Les six policies écrivent
`using (auth.uid() = …)` — **6 occurrences, 0 enveloppée** dans un `select`. Postgres traite
alors l'appel comme volatile et le rejoue par ligne, au lieu de l'évaluer une fois
(`auth_rls_initplan` chez Supabase). La correction est mécanique :
`using ((select auth.uid()) = …)`.

**Ce qui rend ceci P3 et pas plus haut** : les cinq tables sont **une ligne par utilisateur**
(clé primaire `user_id`), donc l'écart est indétectable. Seule `favorites` peut grossir — une
ligne par recette aimée, quelques centaines au plus. À poser avec le prochain passage sur le
schéma, pas pour lui-même.

---

## 4. Ce que l'audit du 2026-08-26 disait, et qui a bougé

### `01-08` — la prémisse est périmée, la leçon ne l'est pas

Le constat disait : *« la clé de `.env.local` (39 caractères) est rejetée par la prod ; celle
d'EAS (46) répond bien 400 »*. **Ce n'est plus vrai** : `.env.local` porte aujourd'hui la clé
`sb_publishable_` de 46 caractères, **au caractère près celle de la production** (sha256
identique, mesuré). `npm run check:migrations` et `npm run check:auth` fonctionnent donc en
local — vérifié, résultats identiques à ceux passés par EAS.

🔴 **Mais le correctif n'a été posé que sur un script sur trois.** `check:migrations` a gagné
son doublon `check:migrations:prod` ; `check:auth` et `check:abonnements` n'en ont pas. Ils
dépendent silencieusement d'un `.env.local` qui n'existe ni en CI, ni dans un clone frais, ni
dans un worktree neuf — et dont rien ne garantit qu'il restera à jour. *Un principe formulé
en corrigeant un symptôme reste faux chez ses voisins.*

➡️ **Reco (effort : S)** : ajouter `check:auth:prod` et `check:abonnements:prod` sur le modèle
existant. Trois lignes de `package.json`.

### Lignes de la « checklist humaine » fermées ici

| Ligne | État |
|---|---|
| *« quels schémas sont exposés à l'API »* | ✅ **fermée** — seules les 6 tables répondent ; 7 noms plausibles testés → 404 ; le catalogue OpenAPI exige désormais une clé secrète |
| *« `verify_jwt` de l'Edge Function `delete-account` »* | ✅ **fermée** — **ON**, mesuré par le code d'erreur de la passerelle (§2.4) |
| *« RLS testée […] pour chacune des 6 tables »* | ⚠️ **à moitié** — prouvée contre un anonyme sans session (lecture, comptage et écriture) ; **pas** entre deux comptes réels |

### Lignes qui restent ouvertes, et pourquoi

| Ligne | Pourquoi elle n'a pas pu être fermée |
|---|---|
| **Région du projet** | Le registre RGPD affirme `eu-central-1`. **Non vérifiable depuis le client** : le seul en-tête qui parle de géographie est `cf-ray: …-MRS`, et il désigne le point d'entrée Cloudflare le plus proche de **la machine qui interroge** — donc Marseille parce que la mesure part de France. Le confondre avec la région de la base ferait écrire une preuve qui n'en est pas. ➡️ Dashboard, ou API Management. |
| **Protection mots de passe compromis, captcha, limites de débit, expiration des OTP** | `/auth/v1/settings` ne les expose pas. L'API Management les rendrait, mais **aucun jeton d'accès Supabase n'est stocké sur cette machine** (vérifié : `~/.supabase/` ne contient que de la télémétrie). ➡️ Dashboard. |
| **Sauvegardes / PITR** | Idem — invisible depuis le client. |
| **RLS entre deux comptes réels** | Demande de créer deux comptes en prod. Écarté délibérément : `S-02` et `S-03` montrent que le coût d'un compte de test en prod n'est pas nul. |
| **Aucun `supabase/config.toml`** | Toujours vrai : rien de ce qui précède n'est versionné. Lié au constat `01-08` de l'audit précédent et à la note du `JOURNAL-MIGRATIONS.md` sur la CLI aveugle aux 18 fichiers. |

---

## 5. Ce qui est bon et mérite d'être dit

Un audit qui ne liste que des défauts fait croire que tout est défaut.

- **`force row level security`** sur les six tables, pas seulement `enable`. Peu de projets le
  posent ; il protège même du propriétaire de la table.
- **`anon` n'a aucun droit de table** — seulement `grant usage on schema public`. Le `[]`
  mesuré ne dépend donc pas que des policies.
- **Une seule fonction `security definer`** (`handle_new_user`), non exposée en RPC, avec son
  `search_path` figé.
- **`on delete cascade` depuis `auth.users` sur les six tables** — la suppression de compte
  n'a rien à énumérer, donc rien à oublier.
- **L'Edge Function se défend elle-même** en plus de `verify_jwt` : elle refuse une clé
  publiable présentée comme jeton. Deux couches, les deux mesurées.
- **Le filet `PROFILE_COLS_LAST_MIGRATION`** transforme « synchro morte en silence » en « tout
  passe sauf ces champs-là », et il a été **vu à l'œuvre** le 2026-08-07.
- **`npm run check:migrations:prod`** interroge les **colonnes**, pas un registre — donc il dit
  vrai là où `supabase migration list` ne verrait rien (registre distant vide, 18 fichiers
  ignorés faute d'horodatage au bon format).
- **Le témoin négatif systématique** dans les deux scripts de contrôle : ils refusent de
  conclure quand ils ne savent pas discriminer.

---

## 6. Ordre suggéré

Rien ici ne bloque la sortie.

1. **`S-01`** — deux gestes, un fichier et un test. À faire avant tout second projet Supabase.
2. **`01-08` reste** — trois lignes de `package.json`.
3. **`S-04`** — nettoyage documentaire, quinze minutes.
4. **`S-03`** — demande une **mesure au dashboard** d'abord (combien de comptes anonymes ?),
   puis un arbitrage. À poser avant que le volume ne devienne un sujet, pas après.
5. **`S-02`** — décision de fond, après la sortie. Dépend de `S-01`.
6. **`S-05`** — à emporter avec le prochain passage sur le schéma.

> ⚠️ **Tout ce qui est mesuré ici périme.** Le schéma, l'auth et les réglages du projet se
> pilotent **hors du dépôt**. La règle du `JOURNAL-MIGRATIONS.md` vaut pour ce document
> aussi : re-mesurer, ne jamais se fier à une note écrite.
