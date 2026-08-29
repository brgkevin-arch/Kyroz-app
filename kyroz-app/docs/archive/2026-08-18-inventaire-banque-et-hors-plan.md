# ARCHIVÉ — ARBITRÉ · Inventaire banque de calories & hors plan (2026-08-18)

> **Archivé le 2026-08-30.** Il a été écrit *avant arbitrage*, à la demande du fondateur,
> pour que rien ne soit supprimé sans décision. L'arbitrage est rendu : **les deux parcours
> sont ÉTEINTS** depuis le 2026-08-18 (`lib/featureFlags.ts`), moteurs intacts.
>
> ⚠️ `lib/calorieBank.ts` renvoie encore à sa « question ouverte n°1 » — c'est une trace
> de raisonnement, pas un reste-à-faire. État courant → `../../AGENTS.md`.

---


> Écrit le 2026-08-18 à la demande du fondateur, **avant arbitrage**. Rien n'a été supprimé
> au moment de l'écriture. État de référence à cette date-là : branche
> `claude/degater-rythme-semaine`, qui avait déjà dégaté la banque et mis le parcours hors
> plan de côté. Sur `main` à cette date, les deux fonctions étaient encore pleinement
> ouvertes — les statuts ci-dessous décrivaient l'après-#114 tel qu'il existait alors.
>
> ## ✅ RÉSOLU — [PR #114](https://github.com/brgkevin-arch/Kyroz-app/pull/114) mergée le 2026-08-18 (`0089d4e`)
>
> Le fondateur a tranché **au-delà** des deux options de cette page : ni suppression franche,
> ni isolation-mais-visible-et-gratuite — **la banque est éteinte**, au même régime que le
> hors plan. `lib/featureFlags.ts` porte désormais les deux interrupteurs
> (`RYTHME_HEBDOMADAIRE_ACTIF`, `PARCOURS_HORS_PLAN_ACTIF`), tous deux à `false`. Le moteur,
> lui, est resté intact comme prévu par l'option retenue.
>
> **Effet sur la lecture de ce document : les statuts « VIVANT (UI) » de la section (a)
> ci-dessous sont PÉRIMÉS** — la ligne de menu et l'éditeur ne sont plus atteignables, et
> `planEngine::bankOf` (nouveau) coupe aussi la LECTURE du champ, pas seulement l'écran. Les
> statuts du moteur pur (`lib/calorieBank.ts`) restent exacts : rien n'y a changé.
>
> **Le bug de la question ouverte n°2 (écart orphelin affiché) a été corrigé** avant
> l'extinction — `servedWeekdays` unifie la règle moteur/affichage, `normalizeCalorieBank`
> referme la donnée au chargement — puis rendu sans objet PAR l'extinction elle-même : plus
> aucun écran ne lit ni n'affiche la banque.
>
> **Question n°3 (journal hors plan) tranchée : dormir.** Deux comptes TestFlight seulement
> au moment de la décision — l'enjeu de rétention RGPD était réel en principe, nul en
> pratique. Reconsidérer si le parcours est encore éteint au lancement public.
>
> **Question n°1 (que doit être la donnée) reste ouverte**, mais n'est plus urgente : la
> banque étant éteinte, aucun écran ne dépend plus de sa réponse.

## Vocabulaire des statuts

| Statut | Sens |
|---|---|
| **VIVANT** | appelé à chaque plan, ou atteignable par l'utilisateur |
| **DORMANT** | le code est monté et s'exécute, mais l'utilisateur ne peut plus y arriver |
| **MORT** | plus aucun appelant dans l'app (les tests ne comptent pas comme appelant) |
| **EN EXTINCTION** | encore atteignable pour des données déjà posées, plus jamais pour des neuves |

---

## (a) Banque de calories → « Jours plus copieux »

**Constat d'ensemble : il n'y a AUCUN bloc mort.** Le moteur est sur le chemin critique de
tous les plans, banque vide ou non — `bankedTargets` est appelé pour chaque profil.

| Bloc | Fichier | Statut | Appelé par |
|---|---|---|---|
| Moteur pur — `offsetsForPlan`, `totalOffset`, `bankedDailyTargets`, `DayOffsets`, `BankInput`, `BankResult` | `lib/calorieBank.ts` | **VIVANT — chemin critique** | `planEngine.ts:9` |
| Adaptateur profil→moteur — `bankedTargets` | `lib/planEngine.ts:1115` | **VIVANT** | `dayTargetKcal:1181`, `buildLocalPlan:1261`, éditeur du Profil |
| Plancher d'emprunt — `bankFloorKcal` | `lib/tdee.ts:692` | **VIVANT** | `planEngine:1111,1127`, éditeur |
| Champ de profil — `calorie_bank` | `lib/types.ts:428` | **VIVANT** | partout |
| Colonne synchronisée | `lib/sync.ts:73` (`PROFILE_COLS`) | **VIVANT** | synchro Supabase |
| Colonne en base | `supabase/migrations/2026-07-30_profiles_calorie_bank.sql` + `schema.sql:92,141` | **VIVANT — migration APPLIQUÉE en production** (cf. `JOURNAL-MIGRATIONS.md`, 2026-07-31) | — |
| Ligne de menu « Jours plus copieux » | `app/(tabs)/profil.tsx:635` | **VIVANT (UI)** | — |
| Éditeur — `CalorieBankEditor`, `bankResume`, `BANK_PRESETS` | `app/(tabs)/profil.tsx:1766-1950` | **VIVANT (UI)** | — |
| Affichage du reliquat — `uncompensatedKcal` | `app/(tabs)/profil.tsx:1934` | **VIVANT (UI)** | — |
| Verrou premium | `lib/premium.ts` | **SUPPRIMÉ par #114** | plus aucun lien |
| Outillage de mesure | `scripts/mesure-reglages.ts:96`, `scripts/mesure-volume.ts:55` | VIVANT (hors app) | — |
| Tests | `lib/__tests__/calorieBank.test.ts` (**23 cas**), blocs dans `planEngine.test.ts`, `volumeConcentre.test.ts` | VERTS | — |

### ⚠️ Le faux frère à ne pas supprimer par ricochet

`lib/dailyBudget.ts` a **exactement la même forme** que `calorieBank.ts` — même `uncompensatedKcal`,
même logique de répartition sous plancher, et son en-tête renvoie explicitement à la banque.
**Ce n'est pas la banque** : il répartit le budget d'un jour entre les repas. Une suppression
menée à la ressemblance l'emporterait.

---

## (b) Déclaration hors plan

| Bloc | Fichier | Statut | Détail |
|---|---|---|---|
| Interrupteur | `lib/offPlanJournal.ts:50` `PARCOURS_HORS_PLAN_ACTIF = false` | VIVANT | posé par #114 |
| Journal (14 exports : `pruneJournal`, `upsertEntry`, `resolveEntry`, `removeEntry`, `removeAt`, `newestFirst`, `describeOutcome`, `journalSummary`, `loadJournal`, `saveJournal`, `recordOffPlan`, `resolveOffPlan`, `forgetOffPlan`, `OffPlanEntry`) | `lib/offPlanJournal.ts` | **DORMANT** | plus aucun écrivain ; `loadJournal` encore lu |
| Hook | `hooks/useOffPlanJournal.ts` | 🔴 **DORMANT MAIS EXÉCUTÉ** | `profil.tsx:236` l'appelle **à chaque montage de l'onglet Profil** — il lit AsyncStorage pour une ligne qui n'existe plus |
| Feuille de saisie | `components/OffPlanSheet.tsx` | **DORMANT** | monté `plan.tsx:1076` avec `visible={offPlanOpen}`, et `setOffPlanOpen(true)` n'a plus d'appelant |
| Historique | `components/OffPlanHistory.tsx` | **DORMANT** | idem `profil.tsx:743` |
| `logOffPlan` | `app/(tabs)/plan.tsx:522` | **MORT** | seul appelant = `OffPlanSheet` |
| `applyAdapt`, `declineAdapt`, état `adaptPrompt`, feuille de recalage | `app/(tabs)/plan.tsx:543-562, 1080` | **MORT** | `adaptPrompt` ne peut plus devenir non-`null` |
| `clearOffPlan` + bloc « + N kcal assumées · Retirer » | `app/(tabs)/plan.tsx:653, 870-882` | **EN EXTINCTION** | s'affiche si `plan.day_extras` existe déjà ; `resetTracking` l'efface au changement de jour → sans objet sous 24 h |
| `adaptDayOptions`, `AdaptOption` | `lib/planEngine.ts:1631-1740` | **MORT dans l'app**, vivant dans les tests | ~110 lignes de moteur |
| `day_extras` — lecture dans `computeDailyTotals`, `carryTracking`, `resetTracking` | `lib/planEngine.ts`, `lib/types.ts:495` | **VIVANT** | structure de plan lue partout : **ne peut pas partir seule** |
| Événement analytics `offPlanLogged` | `lib/analytics.ts:214` | **MORT** | (PostHog est de toute façon dormant) |
| Étape de visite guidée `plan-offplan` | `lib/tours.ts` | **SUPPRIMÉE par #114** | son texte est conservé en commentaire |
| Tests | `offPlanJournal.test.ts` (**20 cas**) + blocs dans `planEngine.test.ts`, `carryTracking.test.ts`, `feuillesEmpilees.test.ts` | VERTS | couvrent du code inatteignable |
| **Données utilisateur** | AsyncStorage `@kyroz:offPlan` (180 j / 200 entrées max) | **GELÉ** | voir la précision ci-dessous |

### ⚠️ Précision mesurée sur le journal stocké — il est GELÉ, pas en décroissance

`loadJournal` élague bien (`pruneJournal`) et il tourne encore : `useOffPlanJournal` est
appelé à chaque montage du Profil. **Mais il élague EN MÉMOIRE et n'écrit jamais.** Seuls
`recordOffPlan` / `resolveOffPlan` / `forgetOffPlan` / `removeDisplayed` appellent
`saveJournal` — et aucun n'a plus d'appelant. Conséquence : la liste stockée sur le
téléphone est **figée telle quelle**, y compris ses entrées de plus de 180 jours, qui ne
seront jamais réellement effacées. Avant #114 elle se purgeait par effet de bord, à chaque
nouvel écart écrit.

➡️ **La règle de rétention de 180 jours que le produit s'est donnée ne s'applique donc plus.**

### ⚠️ Le partagé à ne pas supprimer par ricochet

`lib/dateLabel.ts` a été extrait **de** `OffPlanHistory`, mais il est aujourd'hui **partagé
avec `components/ShoppingHistory.tsx`**. Le supprimer avec le hors plan casse l'historique
des courses.

---

## Chaînes de traduction — le constat honnête

**Il n'y a pas de couche i18n dans Kyroz.** Aucun `i18next`, aucun `react-i18next`, aucun
dossier `locales/` ou `translations/`. Tout le texte est en français, **en dur dans les
composants**. « Retirer les chaînes de traduction » n'a donc pas d'objet : les textes des
deux fonctions vivent dans `plan.tsx`, `profil.tsx`, `OffPlanSheet.tsx`, `OffPlanHistory.tsx`
et `tours.ts`, et disparaissent avec le code qui les porte.

---

## Migrations Supabase

| Migration | État |
|---|---|
| `2026-07-30_profiles_calorie_bank.sql` | **APPLIQUÉE en production** |
| `2026-08-07_profiles_meal_slots.sql:35` | mentionne `calorie_bank` dans un commentaire d'avertissement |
| `supabase/schema.sql:92,139-141` | reflète la colonne |

⚠️ Le hors plan **n'a aucune migration** : le journal est LOCAL-ONLY par décision (2026-08-05).
Rien à jouer, rien à défaire côté serveur.

⚠️ **Une colonne ne se retire pas comme du code.** `calorie_bank` est peuplée chez les
comptes existants. Un `drop column` détruit une donnée utilisateur et n'est pas réversible
par un `git revert`.

---

## Les deux options

### Option 1 — Suppression franche

**Ce qui part réellement :**

| | Hors plan | Banque |
|---|---|---|
| Fichiers entiers | `offPlanJournal.ts`, `useOffPlanJournal.ts`, `OffPlanSheet.tsx`, `OffPlanHistory.tsx`, `offPlanJournal.test.ts` | **aucun** |
| Blocs dans des fichiers vivants | `logOffPlan`, `applyAdapt`, `declineAdapt`, `clearOffPlan`, 2 feuilles, `adaptDayOptions` + `AdaptOption` (~110 l.), 1 événement analytics | ligne de menu, `CalorieBankEditor`, `bankResume`, `BANK_PRESETS` (~190 l. de `profil.tsx`) |
| Tests supprimés | 20 cas + blocs ailleurs | 23 cas + blocs ailleurs |

**Ce qui ne peut PAS partir, dans les deux cas :**

- `day_extras` reste dans `MealPlan` et dans `computeDailyTotals` / `carryTracking` /
  `resetTracking` — la structure est lue partout ailleurs.
- `lib/calorieBank.ts` est **sur le chemin critique** : supprimer le réglage n'enlève pas le
  module, il faudrait remplacer `bankedTargets` par `baseDayTargets` dans `dayTargetKcal` et
  `buildLocalPlan`. **C'est de la chirurgie sur le cœur du produit pour retirer un écran.**
- `lib/dateLabel.ts` (partagé avec les courses) et `lib/dailyBudget.ts` (le sosie).
- La **colonne** `calorie_bank` et le **journal local** des utilisateurs : leur suppression
  est une opération de données, distincte du code, et irréversible.

**Coût réel :** ~500 lignes de code et ~50 cas de test retirés, contre une chirurgie moteur
et une destruction de données. **Gain : un dépôt plus court.** Rien d'autre — ce code ne
ralentit rien et ne coûte aucune maintenance tant qu'il est vert.

### Option 2 — Isolation derrière un feature flag

Le mécanisme **existe déjà** pour le hors plan (`PARCOURS_HORS_PLAN_ACTIF`) et il a coûté
4 lignes de garde. Le compléter consiste à :

1. Créer `lib/featureFlags.ts` — **un seul fichier**, qui devient le point de vérité.
2. Y déplacer `PARCOURS_HORS_PLAN_ACTIF` et y ajouter `RYTHME_HEBDOMADAIRE_ACTIF`.
3. Garder la ligne de menu et l'éditeur du Profil derrière le second.
4. Ne PAS garder le moteur : `bankedTargets` avec une banque vide est déjà l'identité.
5. Couper l'appel mort de `useOffPlanJournal` dans `profil.tsx` (aujourd'hui il lit le
   disque pour rien à chaque ouverture de l'onglet).

**Sur « un flag UNIQUE » — mon désaccord, et il est net.** Un seul interrupteur pour les
deux fonctions les rend inséparables : tu viens de les arbitrer **séparément** (la banque
est dégatée et gardée, le hors plan est retiré), et un flag commun t'interdirait de rallumer
l'un sans l'autre. Un fichier unique, deux constantes : le point de vérité est unique, la
décision reste divisible.

### Ce que je recommande

**Option 2.** Trois raisons, dans l'ordre :

1. **La suppression ne rend rien.** Le code est vert, testé, et ne s'exécute plus. Le seul
   gain est cosmétique, le coût est une chirurgie sur `buildLocalPlan`.
2. **Aucune des deux décisions n'a été prise sur des données.** PostHog est câblé mais
   dormant : personne ne sait si ces fonctions servaient. Détruire ce qu'on n'a jamais
   mesuré est le seul geste qu'on ne peut pas reprendre.
3. **La banque n'est pas retirée** — elle est renommée et gratuite. La supprimer n'est même
   pas à l'ordre du jour ; seul son éditeur pourrait l'être.

⏳ Point de rendez-vous naturel : **le lancement du paywall**. À ce moment on aura des
comptes, éventuellement de la mesure, et la question se tranchera sur des faits.

---

## Le TODO posé dans le code

`TODO(banque-cle-jour-de-semaine)` — en tête de `lib/calorieBank.ts`, rappelé sur le champ
dans `lib/types.ts`. Il documente trois conséquences du fait que la clé soit un jour de
semaine **sans date ni expiration** :

1. **Aucun moyen d'exprimer un événement ponctuel.** Ce n'est plus un mensonge depuis que
   l'éditeur dit « c'est un rythme, pas un événement » — mais le besoin d'origine (un resto,
   un anniversaire) n'a plus **aucune** réponse dans le produit depuis que « J'ai mangé hors
   plan » est de côté. C'est le trou fonctionnel réel laissé par les deux décisions du jour.
2. 🔴 **Un écart orphelin reste affiché alors que le moteur l'ignore.** `offsetsForPlan` ne
   lit que les jours présents dans `plan_weekdays` ; `bankResume` lit la banque brute. Poser
   « samedi +600 » puis retirer samedi du plan laisse la ligne du Profil annoncer
   « Samedi +600 » pendant que le plan n'en tient aucun compte — et les puces de l'éditeur
   ne montrant que les jours du plan, la valeur ne peut plus être ni vue ni effacée.
   C'est un « chiffre affiché qui n'est pas celui qui sera servi » (CLAUDE.md §10).
3. **La répartition ignore le temps.** `bankedDailyTargets` étale l'écart sur tous les autres
   jours du plan, **y compris ceux déjà passés** dans la semaine en cours.

---

## Questions ouvertes — à toi

1. **Que doit ÊTRE la donnée ?** Un rythme permanent (ce qu'elle est), une date ponctuelle
   (ce que le texte promettait), ou les deux ? Aucun des trois défauts ci-dessus n'est
   corrigeable avant cette réponse.
2. Le défaut n°2 (écart orphelin affiché) est un bug de « pas de mensonge » **présent en
   production aujourd'hui**. Il se corrige seul, en une dizaine de lignes, sans attendre la
   question 1. Je le fais ?
3. Le journal hors plan des utilisateurs (`@kyroz:offPlan`, jusqu'à 180 jours) n'est plus ni
   lu ni élagué. On le laisse dormir, ou on le purge à la prochaine ouverture ?
4. Si tu veux quand même la suppression franche : elle se fait **en deux temps** — le code
   d'abord (réversible par `git revert`), la colonne et les données locales ensuite, jamais
   dans la même PR.
