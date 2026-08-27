# Contre-audit de l'Audit V1
Date : 2026-08-27 · Cible : les 86 constats, les 5 décisions et le §5 de `11-SYNTHESE.md` · Commit contre-audité : `c23aa36`

> 🔴 **LES ANCRES DE CE DOCUMENT VALENT À `c23aa36`, ET NULLE PART AILLEURS.** Tout
> `fichier:ligne` cité ci-dessous a été relevé sur ce commit. Quatre constats ont été
> corrigés depuis (branche `contre-audit-lot-0`), et ces correctifs **ont décalé les
> lignes** de `plan.tsx`, `profil.tsx`, `useWeightLog.ts` et `legal.ts`. C'est exactement
> le défaut que `CA-2-06` reproche à l'étape 1 — des citations justes sur le fond, fausses
> d'ancrage — et la seule façon de ne pas le rejouer est de dire de quel commit on parle,
> plutôt que de courir après les numéros. Le corps des constats, lui, reste vrai.
>
> **Ce document n'attaque pas le produit, il attaque l'audit.** Un audit se trompe de quatre
> manières : il affirme un défaut qui n'existe pas, il déclare sain ce qui ne l'est pas, il ne
> regarde pas là où ça casse, et il mesure avec un instrument qui ment. Les huit axes visent
> ces quatre-là.

---

## 0 · La méthode, et ce qui la rend opposable

**Douze agents.** Huit axes en parallèle, puis **quatre réfuteurs adverses** dont la seule
consigne était de **détruire** les constats produits — avec le biais nommé dans leur brief
(« on t'a payé pour trouver des erreurs, donc tu en as trouvé ») et le doute qui tranche
**contre** le constat. 2,43 M tokens, 1 022 appels d'outils, 38 minutes.

**62 constats bruts → 55 survivants, 7 détruits.** Dont un tué pour la bonne raison : `CA-6-02`
était `CA-1-07` recopié, avec deux gravités opposées — exactement « l'inventaire recopié qui se
confirme tout seul » que le contre-audit reproche à l'audit.

**110 mesures négatives.** Ce qui a été vérifié et qui **tient** est en §5. C'est la moitié du
travail, et c'est celle qui empêche un contre-audit de devenir une machine à noircir.

**Trois constats re-vérifiés à la main** avant publication (`CA-3-01`, `CA-8-03`, `CA-8-01`) :
ce sont les trois que j'ai jugés les plus lourds, et je ne voulais pas les transmettre sur la
foi d'un agent.

| | |
|---|---|
| Constats confirmés | **55** — 23 majeurs, 32 mineurs · 51 de confiance certaine, 4 probable |
| Répartition | claim non ancré 10 · angle mort 10 · prémisse fausse 8 · conséquence fausse 7 · **garde-fou décoratif 7** · instrument menteur 6 · faux positif 3 · faux négatif 3 · sévérité erronée 1 |
| L'axe le plus dense | **Axe 8** (étapes jugées sans accès au code) — 10 constats |
| Le taux le plus élevé | **Axe 7** (mutation) — 6 garde-fous décoratifs sur 8 éprouvés |

---

## 0 bis · Ce qui a été corrigé depuis

| Constat | Correctif | Commit | Vu rougir |
|---|---|---|---|
| `CA-3-01` — les notifications survivent à l'effacement du compte | `cancelAllReminders()` à l'effacement, `cancelWeighInReminder()` à la déconnexion ; `WEIGH_IDS` n'a plus qu'un consommateur | `5a057c9` | **5 mutations** |
| `CA-3-03` — les photos de corps survivent à « Supprimer définitivement » | `purgeAllProgressPhotos()` sur les deux sorties, avant la purge du stockage ; `deleteProgressPhoto` borné à `file://` | `a796b82` | **5 mutations** |
| `CA-8-03` — le compte est créé avant qu'on demande l'âge | le §10 de la politique dit ce que le code fait, y compris qu'il ne vérifie pas l'âge à la création ; un test tient l'invariant texte ↔ `login.tsx` | `7cc5571` | **4 mutations** |
| `CA-3-02` — au réveil, le Plan reste sur hier | `jourCivil` relu aux trois moments de réveil, déclaré par `todayIdx` et par le solde de la veille | `da6d994` | **5 mutations** |
| `CA-4-01` à `CA-4-03`, `CA-4-06` — **le corpus des textes** | l'extraction coupait chaque chaîne sur l'apostrophe échappée : **14 entrées coupées net, 7 fragments orphelins**, et « dispositif médical » à **0** dans tout le dump. Bloc `methodologie` régénéré depuis le module — 31 textes réels pour 72 fragments — compteurs corrigés, brief 6b-bis écrit | *§6* | **2 mutations** |
| `CA-2-04` + `CA-7-01` à `CA-7-06` — **six garde-fous décoratifs** | deux sondes d'ordre PostHog · périmètre compté dans `check:abonnements` · verdicts qui échouent dans `check:auth` · côté iOS ouvert dans `check:permissions` · §4 de `check:ota` qui confronte enfin la date · `entitlementNecessaire` déplacée dans le module pur et sa table de vérité testée | *§4* | **11 mutations** |
| `CA-2-01` — la continuité R6 certifiée sur une fenêtre qui s'arrête au seuil | retrait des planchers rendu **progressif** sur 5 pt (`ENGINE_REV` 8 → 9) : le saut passe de 115 à 34 kcal/j au pas de 0,05, et il RÉTRÉCIT désormais avec le pas | *ci-dessous* | **3 mutations** |
| `CA-2-02` — « aucun plancher contournable » | **aucune ligne de moteur changée** : la prémisse est mesurée (75 264 profils, 0 violation), les phrases reçoivent leur périmètre, la propriété devient comptée | *ci-dessous* | **4 mutations** |

**Ce qu'ils N'ONT PAS déplacé**, re-mesuré après coup : les cinq fichiers moteur sont
**inchangés au caractère près** (`git diff` vide → couverture et « 0 `any` » tiennent par
construction) · `rg 'http://'` **0** · `signOut(` **3**, et la purge reste absente des
quatre chemins de `01-01` · `check:permissions`, `check:suspens`, `check:doublons`,
`check:abonnements` et `check:ota` verts · le graphe natif est identique
(`ExpoFileSystem` était **déjà** dans `ios/Podfile.lock` — déclarer `expo-file-system`
dans `package.json` n'a rien ajouté, ce qui est ce qui rend le correctif publiable en OTA).
Suite : **120 fichiers, 1 862 tests**, `tsc` 0.

⚠️ **Trois des quatre correctifs ne sont pas vérifiables depuis le dépôt**, et c'est dit
plutôt que supposé : le comportement réel des notifications sur un appareil après
suppression, la purge effective du cache par iOS, et la bascule de jour à minuit. Le code
dit ce qu'il fait ; il ne dit pas au bout de combien de temps l'OS purge.

---

## 1 · Le résultat en une phrase

**L'audit raisonnait mieux qu'il ne mesurait, et il a cru ses feux verts.**

Ses trois P0 tiennent tous les trois dans leur *mécanisme* — aucun n'est un faux positif. Mais
**deux de leurs trois recommandations ne ferment pas le trou qu'elles visent**, et l'une d'elles
casserait un cas sain. Pendant ce temps, quatre défauts que l'audit n'a jamais regardés sont
d'un niveau égal ou supérieur, et **six garde-fous sur huit ne gardent rien**.

---

## 2 · Ce qui change le backlog aujourd'hui — les quatre défauts que l'audit n'a pas vus

Ils ne sont pas dans les 86. Ils ne sont dans aucun lot. Trois touchent quelqu'un qui utilise
déjà l'app, et deux rendent faux un texte publié.

### 🔴 CA-3-01 · Supprimer son compte n'éteint aucune notification — pour toujours

`doDelete` (`app/(tabs)/profil.tsx:344-355`) fait `deleteAccount()` → `signOut()` →
`AsyncStorage.clear()` → `clearProfile()`. Il ne contient **zéro** `cancelScheduledNotificationAsync` :
les trois seuls du dépôt vivent dans `lib/notifications.ts` (`:94`, `:139`, `:182`), à l'intérieur
d'`applyReminder` / `rearmReminder` / `applyWeighInReminder`, qu'aucun chemin de sortie n'appelle.

Le rappel de pesée est un **déclencheur répétitif natif**. En cadence par défaut, « Ta pesée du
jour » continue de tomber **chaque semaine, sans fin**, sur un compte effacé — plus jusqu'à
30 rappels quotidiens déjà armés. Et la personne n'a plus aucun moyen de les couper depuis
l'app : `AsyncStorage.clear()` vient d'effacer les réglages par lesquels le ré-armement passe.

> *Vérifié à la main.* Le barème du plan classe P0 ce qui « expose légalement » : une app qui
> notifie indéfiniment quelqu'un qui a exercé son droit à l'effacement coche la case.

### 🔴 CA-3-03 · Les photos de corps survivent à « Supprimer définitivement » — et l'OS peut les effacer toutes seules

Les URI de `expo-image-picker` pointent dans le répertoire de **cache** de l'app, sur les deux
plateformes (source du paquet installé, `expo-image-picker@56.0.18`). `expo-file-system` n'est
**pas une dépendance du dépôt** : aucun `copyAsync`, aucun `documentDirectory`. `setPhoto`
(`hooks/useWeightLog.ts:81-88`) n'écrit qu'une carte `date → URI`.

Deux conséquences opposées, toutes deux mauvaises :
- **l'effacement est incomplet** — après « Supprimer définitivement », les photos de corps,
  donnée de santé sensible, restent en clair dans le bac à sable de l'app ;
- **la conservation ne tient pas non plus** — un répertoire de cache est purgeable par l'OS à
  tout moment. Les photos de progression, dont toute la valeur est d'être anciennes, peuvent
  disparaître sans que personne n'ait rien fait.

L'étape 9 avait pourtant statué sur `pickProgressPhoto` (`09-conformite.md:61-62`). Elle a
regardé ce que la fonction renvoie, jamais où le fichier atterrit.

### 🔴 CA-8-03 · Le compte est créé avant qu'on demande l'âge — et les CGU publiées promettent le contraire

`constants/legal.ts:258` : « Kyroz est réservé aux personnes âgées de 18 ans et plus. **Aucun
compte ne peut être créé en deçà de cet âge.** »

`app/(auth)/login.tsx:65` : `canSubmit = emailValid && password.length >= MDP_LONGUEUR_MIN && (mode === 'signin' || consent)`.
Ni champ, ni case, ni mention d'âge dans tout l'écran. Les trois gardes d'âge du dépôt existent —
elles agissent **après**, sur l'onboarding et la génération de plan.

Le constat 06b-19 avait posé la question et l'a close : « **RÉSOLU — la phrase des CGU est
vraie** ». Elle est fausse. C'est une clause contractuelle publiée, portant sur les mineurs :
le sujet le plus regardé d'une revue de store.

> *Vérifié à la main.*

### 🟠 CA-3-02 · Au réveil, l'écran Plan reste sur la journée d'hier jusqu'à 14 h

Il n'existe aucun déclencheur de bascule de jour. Le seul écouteur de réveil
(`app/(tabs)/plan.tsx:629`) n'appelle qu'`autoCocher()`, qui sort en early-return tant qu'aucun
repas n'est échu (`:591-599`). L'effet qui solde la veille (`:390-400`) dépend de `[plan, profile]`,
et `todayIdx` est un `useMemo` qui ne se réévalue pas sur le passage de minuit.

Quelqu'un qui laisse Kyroz en arrière-plan la nuit voit, jusqu'à ~14 h : la pastille sur **hier**,
les repas d'hier encore cochés, le total d'hier — et la réserve jamais débitée. L'étape 5 avait
coché « **[x] K. navigation et reprise** » (`05-perf-a11y.md:19`) sans produire un seul constat
sur ce critère (cf. `CA-3-04` : douze critères cochés, six instruits).

---

## 3 · Les feux verts du moteur — un vrai défaut (corrigé), un que j'avais sur-vendu

Le §5 est la zone la plus dangereuse d'un audit : personne ne revérifie un vert avant la vente.
Et c'est aussi celle où un **contre**-audit se trompe le plus facilement, parce qu'il a été
payé pour trouver.

### CA-2-02 · La phrase est sur-généralisée. Le code, lui, a raison — et je l'avais mal dit

**⚠️ CE CONSTAT A ÉTÉ RÉTROGRADÉ, ET C'EST MOI QUI L'AVAIS SUR-CLASSÉ.** La réfutation
adverse l'avait ramené de **majeur à MINEUR** le jour même, et je l'ai quand même publié ici
sous « les feux verts qui ne tiennent pas », puis inscrit **🔴 au backlog comme le prochain
chantier**. Corrigé le 2026-08-27, après mesure.

**Ce qui est vrai.** `planEngine.baseDayTargets` (`lib/planEngine.ts:1158-1164`) et
`bankedTargets` (`:1186-1200`) re-plafonnent par le bas avec `bankFloorKcal`
(`= max(BMR, filet absolu)`), **strictement plus bas** que le plancher de sécurité — et
c'est `dayTargetKcal` que lit `plan.tsx`. Re-mesuré sur **75 264 profils** : **44,2 %** ont
au moins un jour sous le plancher de sécurité, **jusqu'à 1 103 kcal/j** (le « 433 » publié
ici la veille venait d'une grille de cinq profils).

**Ce qui est faux, c'était ma conclusion.** J'en avais fait un risque santé. C'est un
mécanisme délibéré, argumenté deux fois dans le code (`lib/dailyBudget.ts:24-38` et la
docstring de `bankFloorKcal`), et **CLAUDE.md §6 écrit noir sur blanc : « Ne pas le remonter
comme un danger »**. L'énergie disponible est une moyenne soutenue — le produit la compte en
SEMAINES (`low_ea_weeks`), jamais en jours. Borner la cible du jour au plancher de sécurité,
c'est appliquer jour par jour un seuil qui ne l'est pas : **exactement le calcul qui a fait
rejeter la spec P2.1 le 2026-07-29**, et ça détruirait la répartition par volume livrée le
2026-08-06. Mon §3 rejouait donc, mot pour mot, l'erreur que le dépôt avait déjà refusée.

**Ce que personne n'avait jamais mesuré — et qui est le vrai apport.** Toute la
justification tient sur une phrase : *« la banque conserve le total de la SEMAINE, donc
l'exposition hebdomadaire est inchangée »*. L'audit, le contre-audit et le réfuteur ont tous
les trois mesuré le **minimum du jour**. Personne n'avait mesuré la **semaine**. Fait, sur
75 264 profils, par le moteur réel :

| | |
|---|---|
| **P1 · Conservation** — Σ servi == jours × cible plate | **0 violation**, écart max **0 kcal/semaine** |
| **P2 · Exposition hebdo** — moyenne servie ≥ plancher de sécurité | **0 violation** |
| **P3 · Plancher dur du jour** — min servi ≥ `max(BMR, filet absolu)` | **0 violation** |

➡️ **La prémisse tient exactement. Aucune ligne de moteur ne change.** Ce qui change : la
phrase de `02-moteur.md` reçoit son périmètre, celle du §5 de la synthèse est resserrée, et
la propriété devient **comptée** — `lib/__tests__/plancherServi.test.ts`, dont le quatrième
test **exige que la descente existe**. Quiconque « répare » la cible du jour le fait rougir
et lit pourquoi. Vu rougir sur 4 mutations, chacune ne touchant que la promesse qu'elle casse.

⚠️ **Deux affirmations du constat d'origine sont retirées** : `lib/dailyBudget.ts` **est**
couvert par les tests (`volumeConcentre`, `mealProteinFloor`, `safety`), et la phrase de
`02-moteur.md:87` est exacte **dans sa section**, qui décrit l'intérieur de `computePlan` —
seul son recopiage nu en §5 sur-généralisait.

### CA-2-01 · Le balayage qui certifie la continuité R6 s'arrête exactement au point de rupture — ✅ CORRIGÉ

La borne haute du balayage (30 % de MG) **est** la valeur de `HIGH_ADIPOSITY_PCT.male`.
Le décrochage est juste après. Le « saut maximal 28 kcal/j » était donc vrai sur 10–30 % —
c'est-à-dire partout **sauf** au seuil que l'audit avait lui-même désigné comme la règle 5.

**Ce qui distingue une pente d'une falaise, et c'est la seule chose qui compte ici** : un
saut qui **ne rétrécit pas** quand le pas rétrécit est une discontinuité. Re-mesuré sur le
moteur réel, aux trois pas :

| pas | avant | après |
|---|---|---|
| 0,5 pt | 137 kcal/j | **137** |
| 0,05 pt | 115 kcal/j | **34** |
| 0,005 pt | 112 kcal/j | **4** |

Avant, il ne bougeait pas. Après, il rétrécit proportionnellement.

**Le correctif (2026-08-27, `ENGINE_REV` 8 → 9)** : le retrait des planchers dérivés de la
masse maigre devient **progressif sur cinq points de %MG** au lieu d'un interrupteur au
seuil. Cinq points n'est pas un réglage — c'est le pas du sélecteur de silhouettes ET la
bande de bruit que R6 lissée s'était donnée.

⚠️ **Ce qui NE change pas, et il fallait le vérifier avant de livrer** : le seuil lui-même,
et `highAdiposity`, qui reste le prédicat **binaire** partagé par la bande de rythme, le
registre de zone basse et l'escalade — deux définitions de « grasse » finiraient par
diverger, l'en-tête de `HIGH_ADIPOSITY_PCT` prévient contre exactement ça. Seule la
transition du PLANCHER s'adoucit.

**Ce que ça coûte, avec le moteur réel des deux côtés** : sur **225 600 profils**, 28 cibles
bougent (**0,01 %**), maximum **53 kcal/j**, et **aucune** n'atteint les 100 kcal/j qui
déclenchent l'avertissement — personne ne verra rien. Les quatre corps que la décision du
2026-08-10 cite nommément servent le même déficit **au kcal près**. 1 873 tests verts.

⚠️ **Et la marche entre deux SILHOUETTES adjacentes (30 → 35) est inchangée : 314 kcal/j.**
C'est correct — cinq points de %MG, c'est un autre corps. Le lissage retire la falaise, pas
la descente. Ce que gagne le correctif, c'est la personne qui saisit 30,1 % au clavier et
tombait d'une falaise que rien de physiologique ne justifiait.

### CA-2-03 · « Aucun SDK hors des trois sous-traitants déclarés » : il y en a un quatrième

L'instrument était un grep de **noms** de SDK connus : il ne pouvait trouver que ce qu'il
nommait. Recensé par le **rôle** (« qui reçoit une requête réseau »), `expo-updates` est lié en
natif (`EXUpdates`, `EASClient` dans `ios/Podfile.lock`), `checkAutomatically: "ON_LOAD"`, et
envoie à `u.expo.dev` un **UUID d'installation persistant** à chaque lancement. Expo /
650 Industries n'est ni au registre RGPD, ni au §5 de la politique, ni au formulaire App Privacy.

C'est le raisonnement exact qui a fait entrer RevenueCat au registre le 2026-08-26, appliqué à
un destinataire que le tableau de l'étape 3 a classé « s. o. » sans mesurer ce qu'il envoie.

---

## 4 · Six garde-fous sur huit ne gardaient rien — ✅ les six sont corrigés

C'est le résultat le plus transférable du contre-audit, et le seul obtenu **par mutation** —
casser exprès ce que le garde-fou protège, dans un worktree jetable, et regarder s'il crie.

| Garde-fou | Ce qu'il prétend garder | La mutation | Verdict |
|---|---|---|---|
| Les « **14 assertions** » PostHog (§5) | l'ordre des trois remparts, la garde **avant** la lecture du consentement | inverser l'ordre dans `lib/analytics.ts:173-175` | **tout vert.** Ce sont 14 *tests*, pas 14 assertions, et aucun ne contraint l'ordre |
| `check:abonnements` (cité comme modèle par la Décision E) | que chaque identifiant du code existe chez Apple | remplacer deux guillemets simples par des doubles dans `lib/premium.ts` | **✅ vert sur un périmètre vide** — la regex `/storeProductId:\s*'([^']+)'/g` ne trouve plus rien, zéro identifiant comparé |
| `check:auth` | que l'inscription est ouverte en prod | endpoint qui déclare l'inscription **fermée** | **✅ code 0.** Deux de ses quatre lignes impriment un ✖ purement décoratif |
| `check:permissions` (garde-fou de #172) | les permissions déclarées | injecter trois permissions **iOS** | **✅ vert** — il ne regarde que l'Android |
| §4 de `check:ota` (2ᵉ garde-fou de #172) | l'écart texte publié / texte servi | — | **ne peut pas rougir** : le bloc `:129-163` ne touche jamais le compteur d'écarts |
| Le correctif 09-01 (décision C1) | que l'identifiant ne parte pas à la connexion | `return false` → `return true` dans `entitlementNecessaire` | **1 841 tests verts.** La fonction qui *décide* n'est ni exportée ni nommée dans un test |

**Ce qui a rougi**, et qui vaut donc quelque chose : `fichesOta.test.ts`, la non-régression
`measured` sur les 1 344 corps, et le `check:permissions` sur son périmètre Android.

### ✅ Les six, corrigés le 2026-08-27 — chacun vu rougir sur la mutation qui l'avait trouvé

| Garde-fou | Ce qui a changé | La mutation, maintenant |
|---|---|---|
| Les « 14 assertions » PostHog | **deux** sondes d'ordre : l'une comportementale (éteint, le consentement n'est même pas LU), l'autre sur la source (elle vaut aussi le jour où la mesure revient) | inverser l'ordre → **les deux rougissent** |
| `check:abonnements` | les trois quotages acceptés, **et** les déclarations comptées avant les captures : écart non nul → `EXIT 2` | `"` → 2 comparés (était 0) · identifiant construit → **EXIT 2** |
| `check:auth` | les trois verdicts alimentent un compteur, chaque échec porte son geste de réparation | inscription fermée → **EXIT 1** (était 0) |
| `check:permissions` | le côté **iOS** ouvert (`*UsageDescription`), plus une garde de périmètre vide | trois demandes iOS injectées → **2 rougissent** (la 3ᵉ n'existe pas dans la config résolue) |
| §4 de `check:ota` | la date d'entrée en vigueur est **confrontée** : servie → pas antérieure à sa publication ; pas servie → pas déjà passée | « 15 juin 2026 » → **EXIT 1** (était 0) · date illisible → EXIT 1 |
| Le correctif 09-01 | `entitlementNecessaire` **déplacée dans le module pur et exportée**, sa table de vérité testée ; et la liste de deux fichiers écrite à la main devient un **recensement** du dépôt | `return false` → `return true` → **2 rougissent** · un 3ᵉ écran qui force → **1 rougit** |

⚠️ **Deux de mes propres sondes étaient décoratives, et seule la mutation l'a dit.** La
sonde comportementale PostHog espionnait un AsyncStorage d'un autre registre que celui du
module (`vi.resetModules()`) : verte quoi qu'il arrive. Et la ligne « le texte de la demande
d'autorisation est écrit » de `check:permissions` **ne peut pas** rougir sur les deux clés
actuelles — le plugin d'`expo-image-picker` réinjecte son défaut. Elle garde les clés
ajoutées à la main ; c'est écrit dans le script plutôt que laissé croire.
⚠️ Et **mon garde-fou de `check:abonnements` rougissait sur la source SAINE** : il comptait
`storeProductId: string;`, la déclaration de TYPE, comme une demande du code.

---

## 5 · Ce qui TIENT — 110 mesures négatives

Un contre-audit qui ne publierait que ses trouvailles serait le miroir du défaut qu'il dénonce.
**Les 110 sont publiées en annexe**, avec leurs commandes et les 60 instruments validés sur
un témoin. Ce qui suit n'en est qu'un choix.

- **Les trois P0 tiennent tous les trois** dans leur mécanisme. `01-01` est même **sous-estimé** :
  `lib/sync.ts:440-500` montre que favoris, réserve, pesées et recettes perso sont **poussés** du
  local de A vers le cloud de B quand la ligne de B est vide.
- **RLS Supabase** — confirmé sur les 18 migrations lues dans l'ordre, à `c17e667` et à HEAD.
  Six tables, et six seulement. (Seules les **ancres** sont fausses : `CA-2-06`, décalage de 6 à
  8 lignes sur chaque citation.)
- **Aucun secret dans l'historique** — re-balayé sur **3 094 blobs / 351 Mo**, avec l'instrument
  validé sur six témoins plantés d'abord. Rien. *(La méthode publiée, elle, ne pouvait pas
  trouver une clé `service_role` : `CA-4-04`.)*
- **Le dépôt est vert** : `npx vitest run` à HEAD → **118 fichiers, 1 841 tests, 0 échec, 0 skippé**.
  `npx tsc --noEmit` → exit 0. **0 `any`** dans les cinq fichiers moteur.
- **Couverture moteur** — confirmée **au chiffre près**.
- **Écart macros / kcal** — non seulement confirmé, mais **généralisé** : rejoué sur **185 220**
  profils contre les 96 de l'audit, le plafond de 0,13 % tient.
- **Edge Function de suppression** — l'identité vient du JWT de l'appelant, jamais du corps.
- **iPad** — zéro `Dimensions.get()` dans le code applicatif, `UIRequiresFullScreen` correct :
  pas de rejet ITMS-90474 en vue. Les 7 `<Modal>` portent tous un `onRequestClose`.
- **02-01-DECISION** (le seul document déjà contre-audité, par #172) — les +356 kcal/j de médiane,
  les neuf tests qui tombent et la table des croisements **se reproduisent tous les trois**.

---

## 6 · Ce que l'audit s'est fait à lui-même : la chaîne 6a → 6b → 9 — ✅ corpus réparé

Un seul défaut, mais il porte **seize constats**.

L'audit a trouvé et réparé le seuil de 12 caractères qui perdait 30 chaînes. Il n'a **pas rejoué
l'étape 6b** : au commit `98a6335`, le seul changement apporté à `06-textes-audit.md` est d'un
caractère — « 728 chaînes » → « 753 chaînes ». Les quatorze noms d'auteurs, **matière déclarée du
constat 06b-17**, étaient absents du corpus que 6b a lu (`CA-4-01`).

Pire : **la réparation en a cassé une autre.** L'extracteur régénéré découpe les chaînes sur
`\'`. La phrase la plus lourde juridiquement de l'app —

> « Kyroz n'est pas un dispositif médical. Il ne diagnostique, ne traite, ne guérit ni ne prévient
> aucune pathologie… » (`lib/methodologie.ts:63`)

— est **présente** dans le dump de 728 et **absente** de celui de 753, où elle ne survit qu'en
miettes (`CA-4-02`). Le corpus « corrigé » est meilleur sur les titres courts et **pire sur les
textes longs de `methodologie.ts`** — les seuls que le §5 cite comme modèles.

Et le diagnostic du seuil s'est arrêté à deux titres alors qu'il en mangeait **quatre** : `1. Objet`
et `5. Compte` sont des titres des **CGU**, jamais vus (`CA-4-07`).

### ✅ Réparé le 2026-08-27 — et le défaut était pire que mesuré

Le contre-audit disait « 30 ajouts mais 5 retraits ». La mesure exacte est plus dure :
l'extracteur coupait **chaque chaîne sur l'apostrophe échappée**, et `lib/methodologie.ts`
est le seul fichier du corpus à en employer. Sur les 753 entrées : **14 finissaient net sur
une barre oblique inverse**, **7 étaient des fragments orphelins**, et le bloc entier de la
page Méthodologie — **72 entrées** — n'était fait que de morceaux.

| | |
|---|---|
| « dispositif médical » dans le dump | **0** → **3** |
| entrées coupées net | **14** → **0** |
| fragments orphelins | **7** → **0** |
| bloc `lib/methodologie.ts` | 72 fragments → **31 textes réels** |
| `DISCLAIMER` (`legal.ts:15`) | coupé en deux, « l'avis d' » perdu → **entier** |

➡️ Ce bloc **n'est plus extrait par une regex** : il est RENDU par `methodologie()`. C'est
le même geste que `npm run gen:legal` pour les surfaces légales — une copie générée ne peut
pas diverger. Garde-fou : `lib/__tests__/corpusTextes.test.ts` (aucune entrée finissant par
une barre oblique · aucun fragment orphelin · chaque texte rendu présent VERBATIM · deux
témoins nommés).

⚠️ **Trois sondes floues ont été écrites et jetées avant celle-ci**, et c'est la leçon la
plus utile de cette étape. Un seuil de 25 caractères laissait passer l'avertissement médical
(il partage sa queue avec le `DISCLAIMER`) ; un seuil de 60 accusait des textes présents mais
tronqués par le dump ; entre les deux, le compteur a annoncé successivement **10, 4, 17 puis
27** absences. Aucun de ces chiffres n'était le bon. La bonne réponse n'était pas de régler
le seuil : c'était de rendre la comparaison **exacte**, en générant le bloc depuis le module
au lieu de le comparer à une extraction lossy. ➡️ *Quand une sonde change d'avis à chaque
réglage, ce n'est pas le réglage qu'il faut ajuster, c'est l'approche qu'il faut changer.*

⚠️ **Ce que ça NE répare PAS** : l'étape 6b a jugé ces textes en morceaux, et son jugement
n'a pas été rejoué. Le brief pour le faire est écrit —
`docs/audit-v1/briefs/06b-bis-methodologie.md` — et il est volontairement **borné aux 32
textes abîmés**, pas au corpus entier : les 711 autres n'étaient pas touchés.

---

## 7 · Les recommandations des P0 qui ne ferment pas leur trou

| Constat | La reco publiée | Ce qu'elle laisse passer |
|---|---|---|
| **02-02** | « une garde d'exhaustivité : les quatre champs du BMR » | Une ligne qui **passe** cette garde rend `target_kcal = NaN` dès que `macro_mode` est NULL — colonne nullable sans défaut. Le balayage H10 ne testait que 9 colonnes sur 40 (`CA-1-03`) |
| **02-02** | `hasCloud` teste les quatre champs du BMR | Il manque `goal` : sans lui le moteur ne rend pas NaN, il **lève** — et c'est 02-03 (P1), orphelin de tout lot (`CA-6-01`) |
| **01-01** | « l'identité entre dans la décision d'hydratation » | Le `id` d'un profil **local** n'est pas un uid : c'est `user-${Date.now()}` (`onboarding.tsx:334`). Appliquée à la lettre, la garde **jette le profil** de quelqu'un dont le push a échoué hors ligne juste après l'onboarding (`CA-1-04`) |

Et la Décision B perd sa moitié Apple : **AsyncStorage pose `NSURLIsExcludedFromBackupKey = YES`
sur son dossier par défaut** (`CA-5-01`). La fuite iCloud n'a jamais existé — et la politique
publiée demande aujourd'hui à l'utilisateur de couper iCloud pour un risque qui n'a pas lieu.
Son arbitrage central (« garder les photos, la sauvegarde est leur seul filet ») protège des
**URI**, pas des octets : les photos ne sont pas dans AsyncStorage (`CA-5-02`).

---

## 8 · Le backlog, corrigé

**Un lot 0, avant le lot 1 de l'audit.** Ce qui touche quelqu'un qui a déjà quitté l'app, ou ce
qu'un relecteur de store lit avant d'ouvrir le binaire.

| # | Lot | Contenu | Pourquoi avant |
|---|---|---|---|
| ~~**0a**~~ | ✅ **Le compte supprimé** | `CA-3-01` + `CA-3-03` — **livré** (`5a057c9`, `a796b82`) | les deux se corrigeaient bien dans `doDelete`, et la déconnexion avait le même trou en plus petit |
| ~~**0b**~~ | ✅ **Les mineurs** | `CA-8-03` — **livré** (`7cc5571`) : c'est la clause qui a été réécrite, le blocage à l'onboarding étant réel et dur | |
| ~~**0d**~~ | ✅ **La bascule de jour** | `CA-3-02` — **livré** (`da6d994`) ; il n'avait aucun lot, comme les 17 orphelins de `CA-6-04` | |
| ~~**0c**~~ | ✅ **Le plancher affiché** | `CA-2-02` — **aucun code changé, et c'est le résultat** : la prémisse (conservation hebdomadaire) est mesurée pour la première fois sur 75 264 profils, 0 violation. Les phrases reçoivent leur périmètre, la propriété devient comptée (`plancherServi.test.ts`) | ⚠️ j'avais classé ce constat 🔴 alors que ma propre réfutation l'avait rétrogradé en mineur |
| **1′** | 🔴 **LES TROIS P0 — PROCHAIN CHANTIER** | 01-01, 02-01, 02-02 (~~02-03~~ ✅ A40). Vérifiés OUVERTS par mesure le 2026-08-27. ⚠️ **La reco « les quatre champs du BMR » est FAUSSE** : seuls `sex` et `macro_mode` rendent `NaN` ; `weight_kg` et `height_cm` rendent un nombre FINI mais absurde (1500 kcal, 0 g de protéines) qu'aucune garde « pas de NaN » n'attraperait ; `age` dégrade proprement. Détail chiffré : `AGENTS.md` A39 | les recos publiées ne ferment pas leur trou, et l'une désigne les mauvais champs |
| **2′** | 🔨 **Décision A** | inchangée, **moins** la tâche `allowBackup`/iOS qui n'existe pas, **plus** l'avertissement `fingerprint` : la ligne OTA se coupe à **chaque** édition d'`app.json`, pas « une fois » (`CA-5-03`) | |
| **3′** | ⚖️ **Textes publiés** | `legal.ts:208` (rendu faux **par** le correctif 09-01) + Expo au registre + la mention iCloud à retirer | trois textes publiés faux, aucun dans un lot |
| **7′** | 🧯 **Décision E, re-dimensionnée** | `withBudget` : **9 appels**, pas 6 · `.replace(',','.')` : **8 occurrences**, **3 manques** · **4ᵉ occurrence du motif** : `frnum()` et « 113.5 kg » sur la courbe de poids | un test écrit sur les chiffres publiés passerait au vert avec trois appels nus |
| ~~**12**~~ | ✅ **Les six garde-fous décoratifs** | §4 — livré (lot 0) | un vert qui ne peut pas rougir est pire que pas de contrôle |
| ~~**13**~~ | ✅ **Rejouer 6b sur le corpus réel** | livré — corpus réparé, jugement 6b-bis rendu et ARBITRÉ (`06b-bis-textes-audit.md`) | 16 constats reposaient sur un corpus amputé, puis abîmé |

⚠️ **CE TABLEAU N'A PAS ÉTÉ RE-MESURÉ LOT PAR LOT.** Les lots `2′`, `3′` et `7′` y figurent sans marque et leur état est INCONNU — plusieurs de leurs éléments ont pu être livrés en passant. Le re-mesurer avant d'en prendre un : c'est la leçon des 14 orphelins, dont quatre étaient déjà faux ou déjà faits.

### 🔴 Les 17 orphelins, nommés — parce qu'un compte n'est pas une liste

En croisant les 86 constats avec les identifiants cités au §4 (plages dépliées, « les 24 P3 »
dépliés), **19** n'apparaissent dans aucun lot. Deux ont un jumeau qui, lui, est planifié
(`06b-07` = `01-05`, lot 11 · `10-03` = `03-08`, lot 10). **Restent 17 orphelins réels :**

| Sévérité | Constats |
|---|---|
| **P1** | ~~`01-03`~~ · ~~`02-03`~~ · ~~`03-01`~~ — ✅ **les trois livrés le 2026-08-27** |
| **P2** | ~~les quatorze~~ — ✅ **livrés le 2026-08-27** (`AGENTS.md` **A42**) |

✅ **LES 17 ORPHELINS SONT CLOS.** Et le lot P2 confirme ce que ce contre-audit disait
de lui-même : **sur quatorze constats, quatre étaient déjà faux ou déjà faits.**

| | |
|---|---|
| `06b-17` | visait un risque **qui n'existe pas** — `formatCitation` a sa branche sans auteur depuis toujours. Mais en SOURÇANT les attributions, deux sur seize se sont révélées fausses : « non vi sed saepe cadendo » est un ajout médiéval, pas d'Ovide ; `usus magister est optimus` est de Cicéron, pas de Publilius Syrus |
| `02-04` | « ignoré EN SILENCE » : vrai du moteur, **faux de l'écran** — la carte dit déjà « Échéance passée », et le paywall n'étant pas allumé, tout le monde la voit |
| `08-01` et `06b-01` | **le même trou par deux bouts** ; un seul garde-fou les ferme |
| `03-01` | **satisfait à moitié** par un script écrit pendant ce contre-audit, sans que le constat soit coché |

🔴 **Et la vérification À L'ÉCRAN a trouvé deux défauts que ni `tsc` ni 1 960 tests ne
voyaient** : un champ de mot de passe **invisible** (contraste mesuré **1:1** avec sa
feuille), et surtout `Presse` qui **écrasait l'opacité de sept appelants** —
`aria-disabled="true"` avec `opacity: 1`, donc des boutons qui paraissent actifs et ne
répondent pas, **dont tous les boutons principaux désactivés de l'app**. Défaut antérieur
au contre-audit ; il attendait qu'on regarde.

⚠️ **Deux étapes HUMAINES restent** : la procédure RevenueCat (A41) et l'arbitrage de la
clé Android (`01-07`).

✅ **`02-03` — LIVRÉ le 2026-08-27** (fiche complète : `AGENTS.md` A40). C'était le cas
coûteux, et il était **plus large que le constat de trois façons** :

| Ce que l'audit disait | Ce que la mesure a rendu |
|---|---|
| « fait lever une exception non rattrapée » | un **GEL DÉFINITIF** — `useProfile` n'avait pas de `.catch()`, donc `setLoading(false)` était sauté et `app/index.tsx` restait sur `<Splash />`. La valeur fautive étant relue à chaque lancement, **redémarrer ne réparait rien** |
| `goal: undefined` | `undefined` · **`null`** (la forme réelle d'une colonne vide) · `''` · une valeur saisie à la main — les quatre lèvent |
| sur `computePlan` | sur **quatre** fonctions, dont deux appelées EN RENDU (`profil.tsx:674`, `FirstPlanReveal.tsx:121`) |

✅ **`01-03` et `03-01` — LIVRÉS le 2026-08-27** (fiche : `AGENTS.md` A41). Et **deux des
quatre moitiés n'existaient déjà plus** :

| | |
|---|---|
| `03-01`, reco « un `npm run` qui sort les permissions résolues » | **déjà écrit** — `npm run check:permissions`, produit pendant le contre-audit sans que le constat soit coché. Restait la déclaration trompeuse `"permissions": []` dans `app.json`, retirée après mesure AVANT/APRÈS de la config résolue (identique) |
| `01-03`, moitié **PostHog** | **close par les faits, la veille du constat** — `distinctId()` n'est appelé que depuis `capture()`, qui sort avant tout sur `STATISTIQUES_USAGE_ACTIVES` (false depuis le 2026-08-26). Plus aucun pseudonyme ne peut naître, données supprimées à la source |
| `01-03`, moitié **RevenueCat** | 🔴 **réelle, et plus large que le constat** — voir ci-dessous |

🔴 **Le point que le constat n'avait pas** : `identifyUser(uid)` est appelé **sans
condition**, donc un abonné RevenueCat portant l'UUID Supabase existe **pour tout le monde,
abonné ou non**. Or le §7 de la politique borne l'exception de conservation à « si vous avez
souscrit un abonnement » — rédaction juste, **mais seulement si l'identifiant d'un
NON-abonné disparaît**. Le texte décrivait un monde plus propre que le code, et les deux
moitiés ne se lisent jamais ensemble.
➡️ **Le texte légal n'a PAS été rouvert** : le §7 est déjà la bonne phrase, c'est au code de
la rattraper (`delete-account` supprime l'abonné avant la cascade). Rouvrir aurait coûté
empreinte, date d'entrée en vigueur, `gen:legal` et la 3ᵉ surface — pour zéro gain de vérité.
⚠️ **Il reste une étape humaine** : `docs/PROCEDURE-2026-08-27-suppression-revenuecat.md`.

---

🔴 **Et le remède existait déjà, deux fois, dans les mêmes fichiers** : `tdee.ts::neatPal`
(« Tolérant : une valeur inconnue retombe sur le défaut ») est le patron exact, écrit pour
le NEAT ; et `normalizeVariety` dit « **même remède que `normalizeGoal`** » en appliquant un
remède **plus fort**. Le jumeau écrit en second était le bon.

⚠️ **Le repli est `maintain`, pas un refus — on peut replier une INTENTION, jamais une
MESURE.** C'est ce qui rend le même geste inacceptable sur les quatre champs du BMR
(`02-02`) : inventer une mesure fabrique un BMR qui n'est celui de personne.

➡️ **Balayage de l'étage suivant** — les huit champs « énumération » du profil × quatre
formes hors barème, sur le moteur réel : **`goal` était le seul à lever.** Cinq champs sans
contrainte SQL dégradaient déjà proprement (le résultat négatif compte). Restent **`sex` et
`macro_mode` → NaN sur les quatre formes**, ce qui confirme la correction du §7 : `macro_mode`
est bien un vecteur de NaN, il appartient au lot 1′.

⚠️ **Et `06b-17`** est celui que la réparation du corpus concerne : il jugeait les
attributions de citations sur un dump amputé de ses quatorze noms d'auteurs. Le corpus est
réparé depuis (§6) ; le constat, lui, n'a jamais été rejoué.

**Et 17 constats orphelins** à réintégrer (`CA-6-04`) : ils ne figurent dans aucun des onze lots
du §4 — dont trois P1, dont `02-03`.

---

## 9 · Ce que ce contre-audit apprend

**① Un audit croit ses feux verts.** Les 55 constats se répartissent en deux moitiés nettes :
ceux qui attaquent un rouge (l'audit avait souvent raison, ses recos moins) et ceux qui attaquent
un **vert** — et là, il avait tort une fois sur deux. Le §5, écrit pour rassurer, est la section
la moins vérifiée du document.

**② Ce qui n'a pas d'accès au code produit des affirmations non ancrées.** L'axe 8 (étapes 6b, 9,
10, faites sans exécuter une commande) est le plus dense des huit : **10 constats**. Ce n'est pas
un reproche à la méthode — c'est le prix connu d'un jugement sur pièces, et il faut le payer par
une relecture ancrée, pas par une case cochée.

**③ Un garde-fou qu'on n'a pas vu rougir ne garde rien — et le taux est de 6 sur 8.** C'est le
seul axe qui a produit ses résultats en **cassant** quelque chose. Aucun raisonnement ne les
aurait trouvés : `check:abonnements` tombe sur un changement de **guillemets**.

**④ Une réparation d'instrument doit être re-mesurée comme un correctif de code.** Le seuil de
12 caractères a été réparé, la réparation a cassé autre chose, et le document qui dépendait du
corpus n'a pas été rejoué — seul son en-tête a été réécrit. Le chiffre a changé, pas le jugement.

**⑤ 🔴 UN CONTRE-AUDIT SUR-CLASSE CONTRE SA PROPRE RÉFUTATION.** `CA-2-02` avait été
ramené de **majeur à mineur** par le réfuteur, le jour même, avec ses motifs. Je l'ai
publié quand même en tête du §3, puis inscrit **🔴 au backlog comme le prochain chantier** —
et le correctif qu'il appelait était le calcul exact que le dépôt avait déjà refusé
(spec P2.1, 2026-07-29), sous une ligne de CLAUDE.md qui dit littéralement « ne pas le
remonter comme un danger ». Le verdict était dans le document ; c'est la mise en page qui
l'a écrasé. ➡️ **Une gravité corrigée par la réfutation doit gouverner la place du constat
dans le document, pas seulement figurer dans son verdict.** Sinon la passe adverse coûte
son prix et ne sert à rien.

**⑥ Et le vrai apport n'était pas là où le constat le disait.** L'audit, le contre-audit
et le réfuteur ont tous les trois mesuré le **minimum du jour**. La justification du
mécanisme, elle, tient sur la **semaine** — et personne ne l'avait jamais mesurée. Elle
tient (0 violation sur 75 264 profils), et elle est désormais comptée. ➡️ Devant un constat
qui attaque une justification, **mesurer la justification**, pas le symptôme qu'elle
explique.

**⑦ La réfutation adverse paie.** Sept constats sur soixante-deux sont tombés, dont un doublon
que le contre-audit s'était fabriqué à lui-même, et trois dont la mesure était juste mais la
conclusion sur-vendue. Sans cette passe, ils seraient dans ce document.

---

## 10 · Hors périmètre

- **Aucun correctif appliqué.** Contre-audit ≠ fix, comme l'audit ≠ fix (`00-PLAN.md`, principe 3).
- **Les 12 P1 non re-mesurés** de l'axe 1 (sur 24) : mesurés à fond plutôt que survolés.
- **Ce qui ne se vérifie pas depuis le dépôt** : le comportement réel des notifications sur un
  appareil après suppression (`CA-3-01` est établi par le code, pas par un test sur iPhone), la
  purge effective du cache par iOS, et le rendu iPad.
- **`CA-3-01` et `CA-3-03` appellent une vérification sur appareil** avant d'être chiffrés — le
  code dit ce qu'il ne fait pas ; il ne dit pas au bout de combien de temps l'OS purge.


---

# Annexe · Les 110 mesures négatives

> **Pourquoi cette annexe existe.** Un contre-audit qui ne publierait que ses trouvailles
> serait le miroir exact du défaut qu'il dénonce : un document qui ne montre que ce qui
> l'arrange. Le §5 en citait une douzaine, choisies. Voici les 110, telles que rendues,
> avec leurs commandes — c'est la moitié du travail, et c'est celle qui permet de
> contredire l'autre.
>
> **Comment les lire.** Chaque ligne dit ce qui a été vérifié, avec quoi, et ce que la
> commande a rendu. Une mesure négative n'est pas une absence de résultat : c'est
> « l'audit avait raison sur ce point, voici la preuve ». Elle vaut d'être publiée pour
> deux raisons — elle retire du doute, et elle se **rejoue**.
>
> **60 instruments ont été validés sur un témoin connu** avant qu'on les laisse
> conclure à une absence. C'est la règle 2 du contre-audit, et l'audit s'était fait mentir
> cinq fois par ses propres outils faute de l'appliquer. Un `0` non instrumenté ne prouve
> rien : il peut dire « ça n'existe pas » comme il peut dire « je ne sais pas chercher ».

### Axe 1 · Faux positifs sur les P0 et les P1 — 17 mesures
- 01-01 (P0) TIENT — le mécanisme : `rg -n "signOut\(" .` ne rend que trois lignes (app/(tabs)/profil.tsx:333, :350, hooks/useAuth.tsx:239) ; `hooks/useAuth.tsx:239` est bien `const signOut = async () => { await supabase.auth.signOut(); };`, sans purge. `sed -n '381,385p' lib/sync.ts` confirme `decideProfileHydration({ hasCloud, hasLocal, localDirty })` — trois booléens, aucune identité.
- 01-01 (P0) TIENT — aucun autre chemin n'efface : `rg -c 'AsyncStorage|multiRemove|clearProfile|removeItem'` rend 0 sur app/(auth)/login.tsx, app/_layout.tsx, app/index.tsx et lib/boot.ts ; les 4 occurrences de hooks/useAuth.tsx portent toutes sur `@kyroz:pendingConsent`. Instrument validé au préalable sur un témoin connu (la purge de profil.tsx:340-341, bien trouvée).
- 01-01 (P0) est même SOUS-ESTIMÉ : `sed -n '440,500p' lib/sync.ts` montre que favoris, réserve, pesées et recettes perso sont POUSSÉS depuis le local vers le cloud de B quand la ligne de B est vide (`} else if (local.length) { await pushFavorites/pushPantry/pushWeights/pushRecipeOverrides(local); }`). Le transfert A→B ne demande donc pas que le profil soit « dirty ».
- 02-03 (P1) TIENT, à l'identique : `npx tsx` → `computePlan({...complet, goal: undefined})` lève `TypeError: Cannot read properties of undefined (reading 'kcalDelta')` à lib/tdee.ts:1285.
- Le combo NaN 6/6 + LOW_EA_WARNING de 02-02 EXISTE bien sur d'autres entrées : profil complet moins `weight_kg` → [NaN,NaN,NaN,NaN,NaN,NaN] flags=["LOW_EA_WARNING"] (scratchpad/ca-sweep.ts).
- 02-01-DECISION — la magnitude « +356 kcal/j de médiane, 82 % touchées, ZÉRO baisse » SE REPRODUIT. Copie propre du dépôt par `git archive HEAD | tar -x`, patch `Math.max(mifflinRaw(b), katchRaw(b))` appliqué à la copie, avant/après rejoués sur 190 872 cibles (grille filtrée par `bodyFatConcern`) : 80 % touchées, 0 baisse, max +1210, médianes cut +313 / maintain +351 / lean_bulk +374, globale +347.
- 02-01-DECISION — les « neuf tests qui tombent » SE REPRODUISENT. `npx vitest run` sur la copie patchée : 8 échecs, exactement sur les quatre fichiers annoncés et avec les mêmes comptes (r6Lissee ×2 dont « non-régression `measured` : Katch exactement, sur toute la grille », bodyFatSource ×3, fusion-seches ×2, datedGoal ×1). Le neuvième est celui du bump `ENGINE_REV` 8→9, que je n'ai pas appliqué.
- 02-01-DECISION — le tableau des croisements SE REPRODUIT : homme 55 kg → 9,2 % · 70 kg → 18,7 % · 90 kg → 26,5 % · 120 kg → 33,3 % · femme 55 kg → 28,4 % · 120 kg → 42,1 % (gabarit H 175 cm / 40 ans, F 165 cm / 40 ans).
- Le dépôt est vert au HEAD : `npx vitest run` sur la copie non patchée → 118 fichiers, **1841 tests passés, 0 échec** (les deux échecs initiaux venaient de deux fichiers lus HORS de kyroz-app — docs/politique-confidentialite-kyroz.md et .github/workflows/deploy.yml — recopiés avant de conclure).
- 04-01 (P1) TIENT, texte pour texte : `npx expo-doctor` → « ✖ Check for Expo SDK versions affected by Hermes V1 regressions … Detected Hermes V1 250829098.0.10 from React Native … 250829098.0.16 est le premier corrigé ». 2 checks sur 22 en échec.
- 03-03 (P1) TIENT : config résolue → `runtimeVersion: {"policy":"appVersion"}` et `version: 1.0.0`.
- 03-04 (P2) TIENT : `npx expo config --type introspect` (SANS --json) imprime toujours sur stderr « » android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature. » ; `expo-system-ui` reste absent de package.json.
- 05-03 (P1) TIENT : `rg -n "withBudget" app components hooks lib | grep -v __tests__` ne rend que hooks/useAuth.tsx:86 et :114 (plus la définition dans lib/boot.ts) ; `rg -n "AbortController|signal:"` sur app/components/lib/hooks → aucun résultat ; `createClient` (lib/supabase.ts:59-68) ne pose aucun `global.fetch` personnalisé, donc aucun délai applicatif.
- 10-01 (P1) TIENT : app/(auth)/login.tsx:264 est bien `{__DEV__ && (` et enveloppe le `Presse testID="guest-login"` (« Continuer en invité ») ; `grep -n "__DEV__"` ne rend que ce garde et son commentaire.
- 02-02 — la permissivité du schéma est exacte : `grep -rniE "not null" supabase/schema.sql supabase/migrations/*.sql` ne remonte ni `sex`, ni `age`, ni `weight_kg`, ni `height_cm`, ni `goal`, ni `macro_mode` — seulement des colonnes à défaut (`sports`, `plan_weekdays`, `meals`, `consent_health_data`, horodatages).
- 05-02 — l'instrument de l'audit est juste : mes 28 ratios recalculés reproduisent chacun des ratios publiés (clair et sombre) à la deuxième décimale, y compris la composition alpha sur le fond. Le désaccord porte sur le COMPTAGE, pas sur la mesure.
- Le nouveau garde-fou `npm run check:permissions` fonctionne et nomme sa raison pour chaque permission ; il inscrit `allowBackup false` et le retrait de WRITE_EXTERNAL_STORAGE, en rappelant lui-même que « ce relevé n'est pas le manifeste FINAL : seul un prebuild Android le rend ».

**Instruments validés avant de conclure (7)** — chacun a d’abord dû trouver un témoin connu :
- rg (recherche de la purge locale) — validé sur un témoin connu AVANT de conclure à une absence : la commande trouve bien `AsyncStorage.multiRemove` / `clearProfile()` à app/(tabs)/profil.tsx:340-341 ; c'est seulement ensuite que le 0 sur login.tsx / _layout.tsx / index.tsx / boot.ts a été retenu.
- npx tsx sur lib/tdee.ts — validé en reproduisant D'ABORD les chiffres publiés par l'audit lui-même : 05-01 « intention 72,5/178,5 → TDEE 1976 · cible 1676 » et « réalité 72/178 → TDEE 1966 · cible 1666 », à l'unité près. Même moteur, mêmes sorties : le désaccord qui suit ne vient pas de l'outil.
- npx vitest run sur une copie `git archive` — validé avant usage : 1841/1841 verts sur la copie NON patchée (après avoir recopié les deux fichiers lus hors de kyroz-app, qui faussaient le relevé). Les 8 échecs mesurés ensuite sont donc imputables au patch, pas au harnais.
- npx expo config --type introspect (sans --json) — validé par un témoin : la commande imprime toujours l'avertissement connu « android: userInterfaceStyle: Install expo-system-ui… » sur stderr. À noter : avec --json ce même stderr est VIDE — une absence d'avertissement en mode JSON n'aurait rien prouvé.
- scratchpad/ca-contraste.mjs (WCAG 2.1) — validé en reproduisant les 20+ ratios publiés par l'audit (clair et sombre) à la deuxième décimale avant d'en tirer un comptage différent.
- scratchpad/ca-189.ts (croisement Mifflin/Katch) — validé en reproduisant le tableau des croisements de 02-01-DECISION.md (9,2 / 18,7 / 26,5 / 33,3 % pour l'homme, 28,4 / 42,1 % pour la femme) avant de contester le saut de 189 kcal.
- scratchpad/ca-sweep.ts (balayage des 40 PROFILE_COLS) — validé par son témoin positif : le profil complet rend 2448 / 2160 / 2160 / 168 / 185 / 83, aucune valeur non numérique, donc les 4 colonnes signalées le sont par leur retrait et non par un défaut du gabarit de test.

### Axe 2 · Les fausses bonnes nouvelles (§5 de la synthèse) — 16 mesures
- RLS — CONFIRMÉ. `git show c17e667:kyroz-app/supabase/schema.sql | grep -nE 'enable row level security|force row level security|create policy|grant |security definer'` : `enable row level security` sur les 6 tables (203-208), `force row level security` sur les 6 (212-217), 6 policies `for all` avec `using` ET `with check` (221-242), `grant usage on schema public to anon, authenticated` + `grant select,insert,update,delete … to authenticated` uniquement (196-200) → `anon` n'a AUCUN droit de table, une seule `security definer` (`handle_new_user`, :273) avec `set search_path = public`, `set_updated_at` (:246) ne l'est pas. Cascade `references auth.users(id) on delete cascade` sur les 6 (profiles:24, streaks:159, favorites:168, pantry:176, weight_logs:183, recipe_overrides:190).
- Six tables, et six seulement — CONFIRMÉ. `grep -inE 'create (table|view|materialized)|drop table|grant|policy|row level security' supabase/migrations/*.sql` sur les 18 migrations : seules `weight_logs` et `recipe_overrides` sont créées (2026-06-14, avec RLS + policies `using`/`with check` dès leur naissance), toutes deux déjà parmi les six ; `meal_plans` est `drop table if exists … cascade` deux fois (2026-06-14 et 2026-07-21) ; aucune vue, aucun `grant` à `anon`, aucun `drop policy` non suivi d'un `create policy`. Aucune migration ne revient en arrière sur `force row level security` (2026-07-21_pending_all.sql le REPOSE, il ne le retire pas).
- Edge Function de suppression — CONFIRMÉ. `supabase/functions/delete-account/index.ts` : l'identité vient de `asUser.auth.getUser()` sur le JWT de l'appelant, jamais du corps de la requête ; `admin.auth.admin.deleteUser(user.id)` n'utilise que cet `user.id`. Aucun identifiant client accepté.
- Aucun secret dans l'historique git — CONFIRMÉ, avec l'instrument mesuré d'abord. 3 094 blobs (`git rev-list --objects --all` → `git cat-file --batch`, 351 Mo) balayés : `sb_secret_`, JWT `eyJhbGciOi…`, `sk-ant-`, `sk_live_`, `sk_test_`, `phx_`, `AIza…`, `ghp_`, `github_pat_`, `xox[baprs]-`, `-----BEGIN … PRIVATE KEY-----`, `SERVICE_ROLE_KEY=…` → **0 pour chacun**. Témoins qui prouvent que le balayage TROUVE : 4 valeurs `sb_publishable_` (dont une vraie), 2 `appl_`, 1 `goog_`, 1 `phc_`, 1 `service_role`. 814 commits, 25 refs, 0 stash.
- `tsc` — CONFIRMÉ. `npx tsc --noEmit` → `TSC_EXIT=0`, aucune sortie. (Périmètre réel : `include ['**/*.ts','**/*.tsx']`, `exclude ['node_modules','supabase']`.)
- Tests verts — CONFIRMÉ (chiffre à jour). `npx vitest run` à HEAD `c23aa36` : `Test Files 118 passed (118)` · `Tests 1841 passed (1841)` · **0 échec, 0 skippé**. L'audit annonçait 1 835 / 117 fichiers sur `1d39008` ; l'écart est le lot de PR #172.
- Couverture des cinq fichiers moteur — CONFIRMÉE AU CHIFFRE PRÈS. `npx --yes -p @vitest/coverage-v8@4 -p vitest@4 vitest run --coverage --coverage.reporter=text --coverage.reportsDirectory=<hors dépôt>` : calorieBank 100 %, datedGoal 100 %, planEngine 97,43 %, safety 96,49 %, tdee **96,35 %** de lignes ; global 89,77 %. Les deux bornes du §5 (96,35 → 100) sont exactes. L'arbre est resté propre (`git status --porcelain` vide) grâce au `reportsDirectory` déporté.
- 0 `any` dans les cinq fichiers moteur — CONFIRMÉ. `grep -cE '\bany\b'`, `@ts-ignore`, `@ts-expect-error`, `as unknown as` : 0/0/0/0 sur calorieBank.ts, datedGoal.ts, planEngine.ts, safety.ts, tdee.ts. (Le périmètre perdu en route fait l'objet de CA-2-05.)
- Écart macros / kcal — CONFIRMÉ, ET IL GÉNÉRALISE. Rejoué sur **185 220** profils (2 sexes × 18 poids × 7 tailles × 7 âges × 3 objectifs × 7 points de %MG × 5 modes de macros, dont `percent` aux ratios 10/40/55/75) contre les 96 de l'audit : MAX **0,167 %**, p99 0,133 %, p95 0,104 %, médiane 0,040 %, **0 profil** au-dessus de `SPLIT_DIVERGENCE_TOLERANCE_PCT = 2`. Le plafond réel est un peu au-dessus du 0,13 % annoncé, la marge à la tolérance reste d'un facteur 12 sur le PIRE cas et de 15 au p99 — la distribution est serrée loin du seuil, pas collée dessus.
- `computePlan` ne sert jamais sous SON plancher — CONFIRMÉ. **274 428** profils (2 sexes × 33 poids × 7 tailles × 9 âges × 3 objectifs × 11 %MG × 2 provenances) : `cible < plancher` (au-delà de 1 kcal d'arrondi) → **0**, écart max 0 kcal. La propriété tient bien à l'intérieur de `computePlan` ; c'est le maillon suivant qui la perd (CA-2-02).
- Icône App Store — CONFIRMÉ par ma propre mesure. `sips -g pixelWidth -g pixelHeight -g hasAlpha ./assets/icon.png` → `pixelWidth: 1024`, `pixelHeight: 1024`, `hasAlpha: no`.
- ATS / cleartext — CONFIRMÉ. `ios.infoPlist` ne contient que `ITSAppUsesNonExemptEncryption: false` : aucun `NSAllowsArbitraryLoads` posé, donc le défaut strict d'Expo s'applique. `rg 'http://' --glob '*.ts' --glob '*.tsx'` hors `xmlns`/`w3.org` → **0 résultat**.
- Aucun SDK de tracking ou de crash — CONFIRMÉ sur le graphe LINKÉ, pas sur `package.json`. `grep -inE 'RevenueCat|Purchases|PostHog|Firebase|Sentry|FBSDK|AppsFlyer|Adjust|Amplitude|Branch|Segment|OneSignal|Bugsnag|Datadog|GoogleAnalytics|Mixpanel|Crashlytics' ios/Podfile.lock` (290 pods) → uniquement `RevenueCat 5.83.0` / `PurchasesHybridCommon 18.28.0` / `RNPurchases 10.6.0`. Aucun pod Firebase, aucun `play-services-*`. Aucun SDK PostHog : `lib/analytics.ts:184` est un `fetch` direct.
- `expo-notifications` n'est PAS un destinataire — vérifié par le RÔLE et non par le nom. `rg 'getExpoPushTokenAsync|getDevicePushTokenAsync|exp.host|expo.dev' lib/notifications.ts lib/reminder.ts` → aucun jeton distant ; seuls trois `scheduleNotificationAsync` locaux (`lib/notifications.ts:155,198,214`).
- Ordre des trois remparts DANS LE CODE — CONFIRMÉ (c'est le test qui manque, pas la propriété). `lib/analytics.ts:173` `if (!STATISTIQUES_USAGE_ACTIVES) return;` précède bien `:174` `const consent = await getAnalyticsConsent();` puis `:175` `if (consent !== 'granted') return;` puis `:178` `if (!POSTHOG_KEY)` puis `:184` le `fetch`. `lib/featureFlags.ts:72` : `export const STATISTIQUES_USAGE_ACTIVES = false;`
- Fiabilité des citations de l'audit hors `schema.sql` — CONFIRMÉE. 12 ancres vérifiées au commit audité `c17e667` (`git show c17e667:kyroz-app/<f> | sed -n '<n>p'`) : `legal.ts:218`, `sync.ts:382`, `safety.ts:274`, `safety.ts:367`, `safety.ts:374`, `safety.ts:546`, `tdee.ts:159`, `tdee.ts:563`, `datedGoal.ts:51`, `featureFlags.ts:72`, `analytics.ts:184`, `AGENTS.md:145` → **12/12 tombent exactement sur ce qu'elles annoncent**. Le décalage de CA-2-06 est local à `supabase/schema.sql`.

**Instruments validés avant de conclure (7)** — chacun a d’abord dû trouver un témoin connu :
- `git log --all -S'<chaîne>'` — validé sur deux témoins connus avant toute conclusion d'absence : `-S'sb_publishable_'` remonte 5 commits (c9a53ff, 39385dd, 6eda9cc, 6bb968b, e5234bb), `-S'EXPO_PUBLIC_SUPABASE_ANON_KEY'` en remonte 11.
- Balayage de TOUS les blobs de l'historique — `git rev-list --objects --all | awk '{print $1}' | git cat-file --batch-check | awk '$2=="blob"{print $1}' | git cat-file --batch > allblobs.bin` (3 094 blobs, 351 Mo), puis `grep -aoE '<motif>' | sort -u`. Validé sur 6 témoins que le balayage DOIT trouver, et qu'il trouve : `sb_publishable_` (4 valeurs distinctes dont une réelle), `appl_` (2), `goog_` (1), `phc_` (1), `service_role` (1), `EXPO_PUBLIC_SUPABASE_ANON_KEY` (1). Un motif à 0 sur cet instrument est donc une absence, pas un silence.
- `rg -n '\bany\b' --glob '*.ts' --glob '*.tsx'` — validé sur le témoin `lib/sync.ts:155` (`function rowToProfile(row: any, …)`), et ses faux positifs identifiés à la main (`let any = false`, `lib/foods.ts:87,93,98`) plutôt que comptés.
- Rejeu du moteur RÉEL (jamais une formule réécrite) — scripts jetables hors dépôt important `computePlan`, `baseDayTargets`, `bankFloorKcal`, `kcalFromMacros`, `bodyFatBounds` depuis `/Users/kevinberger/Kyroz_Code/kyroz-app/lib/*`, exécutés par `npx tsx`. Contrôle de non-régression de l'instrument : ma reproduction du cas H8 de l'audit (H 80 kg/178/30 a/cut, 10→30 % pas 0,5) rend 24 kcal/j contre 28 annoncés — même ordre de grandeur, donc le harnais reproduit bien le moteur de l'audit avant de l'attaquer ailleurs.
- `npx vitest run --coverage` avec `--coverage.reportsDirectory` pointé HORS du dépôt — précaution mesurée : `git status --porcelain` vide avant ET après (le constat 04-… de l'audit prévient qu'un dossier `coverage/` non suivi casse la publication d'une OTA).
- `sips -g pixelWidth -g pixelHeight -g hasAlpha` sur `assets/icon.png` — mesure directe du canal alpha, pas une relecture de l'audit.
- Recensement des destinataires par le RÔLE et non par le nom : pods réellement liés (`ios/Podfile.lock`, section `DEPENDENCIES`), plugins d'`app.json`, puis lecture du code natif qui ÉMET (`FileDownloader.swift`, `EASClientID.swift`) — c'est ce chemin, et non un grep de noms de SDK, qui a fait sortir CA-2-03. Contre-épreuve appliquée à `expo-notifications`, qui ressort innocent.

### Axe 3 · Les angles morts — 11 mesures
- `week_start_date` est le seul `toISOString().split('T')[0]` d'un chemin de jour, et il est MORT : `grep -rn "week_start_date" --include='*.ts' --include='*.tsx' --include='*.sql' . --exclude-dir=node_modules --exclude-dir=dist` → 3 lignes seulement (`lib/planEngine.ts:1475` qui l'écrit, `lib/types.ts:607` le type, `lib/__tests__/shoppingList.test.ts:18` un fixture). Aucun lecteur → pas de décalage utilisateur. L'audit avait raison de ne pas le lever.
- Tous les autres calculs d'écart en jours passent par `Date.parse(x + 'T00:00:00')` puis `Math.round(diff/86400000)` (`lib/weight.ts:157`, `lib/safety.ts:8`, `lib/datedGoal.ts:158`, `lib/shoppingHistory.ts:63`, `lib/offPlanJournal.ts:90`) : le `Math.round` absorbe les 23 h / 25 h du changement d'heure. `lib/reminder.ts:352` utilise même `Date.UTC(y,m,d)`, la forme correcte. Le défaut CA-3-05 est bien limité aux DEUX `localStamp(new Date(now ± 86400000))` (`hooks/useStreak.ts:21`, `app/(tabs)/plan.tsx:405`). Commande : `grep -rn "86400000\|864e5\|86_400_000" --include='*.ts' --include='*.tsx' app components lib hooks constants scripts | grep -v __tests__` → 12 lignes, toutes ouvertes et lues.
- Retour arrière système Android : les 7 `<Modal>` du dépôt portent TOUS un `onRequestClose`. `grep -rln "<Modal" --include='*.tsx' app components` → 7 fichiers ; `grep -rn "onRequestClose" --include='*.tsx' app components` → 7 occurrences actives (Sheet, ActionSheet, GuidedTour, ReminderOffer, BirthdayCelebration, FirstPlanReveal, StreakCelebration). Aucun écran ne piège l'utilisateur. Angle mort identifié, mesuré, RAS.
- Rotation et Split View iPad : **zéro** `Dimensions.get()` dans le code applicatif — `grep -rn "Dimensions.get\|useWindowDimensions" --include='*.ts' --include='*.tsx' app components lib hooks` ne rend que des commentaires pour `Dimensions.get` et 6 usages réels de `useWindowDimensions`. `constants/layout.ts::useLayout` lit `useWindowDimensions()` et dérive tout de la largeur. La valeur figée au chargement du module, qui est le défaut classique, n'existe pas ici.
- Rejet App Store iPad (ITMS-90474, multitâche) : la config résolue produit bien la variante iPad complète. `npx expo config --type introspect --json` → `UIRequiresFullScreen: false`, `UISupportedInterfaceOrientations: [Portrait, PortraitUpsideDown]`, `UISupportedInterfaceOrientations~ipad: [Portrait, PortraitUpsideDown, LandscapeLeft, LandscapeRight]`. Le `ios/Kyroz/Info.plist` versionné (prebuild du 27 juillet) n'a PAS la clé `~ipad`, mais EAS régénère — l'étape 3 avait raison de ne pas s'appuyer dessus.
- Migrations rejouables : les 18 fichiers de `supabase/migrations/` portent tous des gardes (`if not exists` / `if exists` / `or replace`), sauf `2026-06-18_force_rls.sql` dont les 6 instructions sont `alter table … force row level security`, naturellement idempotentes. Comptage : boucle `grep -icE "if not exists|if exists|or replace"` par fichier. Aucun `DROP TABLE`/`DROP COLUMN` destructif hors `2026-06-14_drop_meal_plans.sql`, qui retire une table que le schéma documente comme jamais écrite.
- Dérive schéma SQL ↔ TypeScript : l'invariant `PROFILE_COLS` ⊂ colonnes de `profiles` est gardé DEUX fois — `lib/__tests__/profileCols.test.ts` (contre `supabase/schema.sql`) et `scripts/check-migrations.mjs` (contre la PROD, en HTTP). Ce dernier commence même par un TÉMOIN NÉGATIF (`profiles?select=zzz_colonne_bidon` doit rendre 400, sinon il s'arrête : « Le témoin négatif a échoué : la mesure ne prouve RIEN »). C'est l'instrument le plus sain du dépôt ; je ne l'ai pas relancé faute de clés prod, et je le dis.
- Hors ligne : couvert, et correctement. 05-03 (aucun délai applicatif sur les appels d'auth → spinner potentiellement infini, P1) et 05-05 (aucune détection de connectivité, P2 assumé parce que l'archi est offline-first) sont fermes ; `grep -rn -i "hors ligne|offline|réseau|spinner" docs/audit-v1/05-perf-a11y.md` le confirme. Je n'ai rien trouvé à y ajouter.
- Accès reviewer : `EXPO_PUBLIC_REVIEW_CODE` est bien déjà instruit — 01-securite-donnees.md:90 et :225 (« présente dans le bundle natif publié […] `isReviewLogin` ouvre alors une session invité sans confirmation d'e-mail ») et 10-listing-business-ops.md:44. Angle envisagé, déjà couvert : rien à ajouter.
- Double incrément de série : impossible par construction. `hooks/useStreak.ts:27` porte un verrou de module (`let markChain: Promise<Streak>`) qui sérialise TOUS les `markActiveToday`, y compris entre instances du hook, et `advanceStreak` court-circuite l'écriture en rendant la MÊME référence quand le jour est déjà compté (`lib/streak.ts:151-153`). L'écran Plan appelle `markActiveToday()` à deux endroits (`:652` au montage, `:614` dans `autoCocher`) — les deux sont couverts.
- Portabilité RGPD art. 20 : l'export existe et est générique. `lib/exportData.ts:17` : `(await AsyncStorage.getAllKeys()).filter(k => k.startsWith('@kyroz:'))` — il reste complet quand une clé s'ajoute, et le préfixe exclut de fait le jeton Supabase (clé `sb-…`). L'étape 1 avait raison de cocher « E. Portabilité ».

**Instruments validés avant de conclure (8)** — chacun a d’abord dû trouver un témoin connu :
- `grep -rn "cancelScheduledNotificationAsync" --include='*.ts' --include='*.tsx' app components lib hooks | grep -v __tests__` → rend les 3 occurrences réelles de `lib/notifications.ts` (94, 139, 182) AVANT que je conclue à 0 dans `app/(tabs)/profil.tsx`. Témoin positif : l'absence est une absence.
- `grep -rinE "fuseau|timezone|minuit|toISOString|getTimezoneOffset" --include='*.md' docs/audit-v1` → rend `02-moteur.md:49` et deux briefs. Ma PREMIÈRE tentative avait rendu « no matches found » pour toutes les clés : c'était le glob zsh sur `--include=*.md` non quoté, pas une absence. Corrigé et re-témoigné avec « réveil » (accent) → `07-monetisation.md 11-SYNTHESE.md`. Le corpus .md n'échappe pas les accents ; le grep discrimine.
- `TZ=UTC node <scratchpad>/dst.mjs` → `dayStamp(-1) faux : 0` / `dayStamp(-2) faux : 0`, là où `TZ=Europe/Paris` rend 4 et 8. Témoin négatif du script DST : il ne rend pas « faux » partout.
- Cas témoin dans le harnais vitest (`TÉMOIN : jour ordinaire, actif la veille` → série 7, ✓ passed) à côté des deux scénarios DST qui échouent : `advanceStreak` du dépôt fonctionne, ce sont bien les stamps qui sont faux.
- `grep -rn "expo-file-system\|FileSystem\." --include='*.ts' --include='*.tsx' app components lib hooks` → aucune sortie ; la même forme de commande sur `AsyncStorage.clear` rend `app/(tabs)/profil.tsx:351`. L'outil sait trouver ce qui existe.
- `heuresLimites(BUILTIN_SLOTS)` exécuté pour de vrai (pas relu) : rend 14:00 / 17:00 / 21:00 / 23:59 — des valeurs non dégénérées et cohérentes avec `GRACE_HOURS = 1` (`lib/mealtime.ts:34`), donc la fonction a bien tourné.
- `npx expo config --type introspect --json` sorti avec le code 0 et rend des clés non vides (`UISupportedInterfaceOrientations~ipad` avec 4 valeurs) : ce n'est pas un fichier vide lu comme une absence.
- `git status --porcelain` → aucune sortie, HEAD toujours `c23aa36`. Rien du dépôt n'a été modifié ; le harnais vitest tourne depuis une config et des tests écrits dans le scratchpad, avec un lien symbolique vers `node_modules`.

### Axe 4 · Les instruments qui mentent — 15 mesures
- Le dump versionné à HEAD porte bien 753 lignes de données et 53 blocs, comme l'annonce l'étape 6a : `grep -cE '^\| [0-9]+ \| ' docs/audit-v1/06-textes-dump.md` → 753 ; `grep -c '^## '` → 53.
- Les « 30 chaînes » perdues par le seuil de 12 caractères sont exactement 30, et 14 d'entre elles viennent bien de `lib/reminder.ts` (les noms d'auteurs) : `diff <(…dump_728…) <(…dump_753…) | grep -c '^>'` → 30 ; `… | grep '^>' | grep -c 'reminder.ts'` → 14. Le chiffre de §6 ③ est juste.
- `npx tsc --noEmit` → aucune sortie, aucune erreur. Le « 0 erreur tsc » de §5 tient. (Réserve de périmètre, pas de constat : `tsconfig.json` exclut `supabase`, donc l'Edge Function n'est pas typée par cette commande.)
- `npx vitest run` → 118 fichiers, **1841 tests passés, 0 skippé**. La correction de l'étape 4 (« le vrai compte de tests skippés est 0, la regex `xit\(` matchait `process.exit(` ») tient, et rien n'a régressé. (L'audit annonçait 1 835 / 117 avant la PR #172, qui a ajouté un fichier de garde.)
- « 0 `any` dans les 5 fichiers moteur » : vérifié sur `lib/{tdee,planEngine,safety,calorieBank,datedGoal}.ts` avec trois motifs, `\bany\b`, `@ts-ignore` ET `@ts-expect-error` (que l'audit ne comptait pas) → **0 pour les trois, sur les cinq fichiers**.
- Couverture moteur « 96,35 % à 100 % de lignes » : `npx --yes -p @vitest/coverage-v8@4 vitest run --coverage.provider=v8 --coverage.include=lib/{tdee,planEngine,safety,calorieBank,datedGoal}.ts` → lignes 96,35 % (tdee.ts) · 96,49 % (safety) · 97,43 % (planEngine) · 100 % (datedGoal, calorieBank). La fourchette publiée est exacte au centième.
- Les treize ratios de contraste du constat 05-02, recalculés à la main depuis `constants/theme.ts` (formule WCAG 2.x, alpha composité sur le fond) → **identiques à 0,01 près** : textSecondary/bg 3,30 · textSecondary/card 3,44 · textTertiary 2,18 / 2,24 · textQuaternary/card 1,60 · success/bg 2,81 · warning/bg 2,41 · danger/bg 3,43 · success/card 3,13 · warning/card 2,68 · danger/card 3,83 · text/bg 15,25 · text/card 17,01. Cet indicateur « accuse » 8 paires sur 13 parce que la palette claire est réellement basse, pas parce qu'il est cassé — l'instrument n'est pas le suspect ici.
- « 14 assertions vertes » (étape 8) : `npx vitest run lib/__tests__/analyticsPerimetre.test.ts lib/__tests__/extinctionStatistiques.test.ts` → **14 tests passés** (5 + 9). Le chiffre correspond au nombre de `it()`, pas de `expect()` (24), mais il est juste.
- Constat 06-03 « une seule chaîne anglaise résiduelle » : la regex du constat rejouée sur les 753 lignes du dump actuel → **1 seul résultat**, `components/HydrationBar.tsx:201` → `OK`. Confirmé sur le corpus élargi, pas seulement sur celui de 728.
- Constat 06-01 « 0 espace insécable sur 97 occurrences » : ce n'est pas un artefact de l'extracteur. Mesuré directement dans les sources — `rg -o $' '` sur app/components/constants/lib → **0**, `rg -o $' '` → **1** (`lib/methodologie.ts`). Et les trois compteurs typographiques (93 droites / 71 typographiques / 97 occurrences) sont bien calculés sur le corpus de 753 : mon reparse les retrouve à l'identique.
- Périmètre déclaré de l'étape 6a : au commit d095397, `app/` contient bien **14** fichiers `.tsx` et `components/` bien **49**. `git ls-tree -r --name-only d095397 -- kyroz-app/app | grep -c '\.tsx$'` → 14 ; idem components → 49.
- La sonde des cibles tactiles 44 pt (`lib/__tests__/espacementDA.test.ts`) : ses deux limites documentées ne cachent rien aujourd'hui. Rejoué sa logique en dehors du dépôt — sur **81** styles nommés référencés par un pressable, **0** dont la définition contient une imbrication (donc 0 style silencieusement sauté par `[^{}]*`) ; et sur 37 pressables au style en tableau, **1 seul** fragment touche une hauteur (`components/ui.tsx:306`, `paddingVertical: Spacing.lg`, donc ≥ 44 pt). La délégation de l'étape 5 à cette sonde tient.
- Aucun JWT dans l'historique git : `git log --all -p | grep -oE 'eyJ[A-Za-z0-9_-]{20,}' | sort -u | wc -l` → **0**. La conclusion « aucun secret dans l'historique » est vraie (c'est sa preuve qui ne vaut rien, cf. CA-4-04).
- « 24 dépendances au total » (étape 3) : `package.json` porte bien **24** entrées dans `dependencies` (les 4 `devDependencies` étant comptées à part).
- Les fragments produits par le découpage sur `\'` ne touchent que `lib/methodologie.ts` : `git ls-files | xargs grep -c "\\\\'"` montre que les 376 occurrences se concentrent dans les tests et dans ce fichier ; aucun autre fichier du périmètre 6a ne perd de chaîne par ce mécanisme.

**Instruments validés avant de conclure (8)** — chacun a d’abord dû trouver un témoin connu :
- `grep -oE 'eyJ[A-Za-z0-9_-]{20,}'` appliqué à `git log --all -p` — validé sur un TÉMOIN PLANTÉ dans un dépôt git jetable du scratchpad contenant une clé service_role de forme réelle : rend 2 jetons, décodés en `{"alg":"HS256"}` et `{"iss":"supabase","role":"service_role","iat":1}`. Les deux instruments cités par l'audit (`grep '"role":"service_role"'` et `git log -S'service_role'`) rendent 0 sur ce même témoin — c'est ce qui prouve qu'ils sont incapables, pas sévères.
- `grep -c 'dispositif médical'` — témoin positif avant conclusion d'absence : la commande rend **1** sur `dump_728.md` et **0** sur `dump_753.md`. La même commande, la même chaîne accentuée, deux fichiers : l'absence n'est donc ni un problème d'accent, ni d'encodage, ni de casse.
- `grep -cE 'Montaigne|Sénèque|Épictète|Marc Aurèle|Ovide|Cicéron|Hésiode|Lao Tseu|Vauvenargues|La Rochefoucauld'` — témoin positif : rend **18** sur le dump d'aujourd'hui avant de rendre **4** sur celui que 6b a lu. Et double témoin : le TEXTE d'une citation (`La goutte d’eau creuse la pierre`) est présent dans les DEUX (1 et 1), ce qui isole la perte aux seuls noms d'auteurs.
- `grep -cE '^\| [0-9]+ \| '` pour compter les lignes d'un dump — validé par recoupement : les totaux par fichier que je reparse (244 écrans + 260 composants + 249 hors-écrans) somment exactement au total rendu (753), et le même reparse retrouve trois chiffres publiés par l'audit (93 / 71 / 97), ce qui prouve que je lis le même objet que lui.
- `git grep -IlE 'sentry|…'` vs `git grep -IliE 'sentry|…'` au commit 6cb1c5c — témoin positif connu : `RGPD-REGISTRE.md:52` contient `Sentry` capitalisé, et seule la variante `-i` le trouve. L'écart 1 → 2 fichiers est la mesure de l'aveuglement à la casse.
- `git grep -oh '<Text\b'` vs `'<Text'` au commit d095397 — témoin positif : l'écart entre les deux (543 vs 560) vaut exactement le nombre de `<TextInput\b'` (17), ce qui identifie la cause au lieu de la supposer.
- `npx --yes -p @vitest/coverage-v8@4 vitest run --coverage` — validé en retrouvant à l'identique la borne basse publiée par l'audit (96,35 % de lignes sur `lib/tdee.ts`), ce qui confirme que je mesure la même chose que lui avec le même provider.
- Reparse du dump en Python (`parse_dump.py`, regex à 5 cellules) — validé : la distribution des cellules est 100 % à 5 colonnes (aucune ligne mal découpée par un `|` interne), et le compte de lignes rendu (753) concorde avec le `grep -c` indépendant.

### Axe 5 · Les prémisses des cinq décisions A–E — 15 mesures
- Décision B, citation `legal.ts:218` — EXACTE, mot pour mot, au commit audité. `git show 1d39008:./constants/legal.ts | grep -n "Union europ"` → `218: … Aucune donnée de santé ne quitte l'Union européenne.` La synthèse la cite en bloc isolé alors qu'elle est la seconde moitié d'une phrase sur les e-mails de service, mais la citation elle-même est fidèle.
- Décision B, « `allowBackup` n'est déclaré nulle part » — VRAI au commit audité. `git show 1d39008:./app.json` : pas de clé `allowBackup`, et `blockedPermissions` ne contient que RECORD_AUDIO et SYSTEM_ALERT_WINDOW. (Les deux ont été posées depuis, par `c23aa36` ; `npx expo config --type introspect --json` rend aujourd'hui `android.allowBackup: False` et WRITE_EXTERNAL_STORAGE bloquée.)
- Décision B, « AsyncStorage est en clair » et « le jeton de session » y vit — VRAI. `lib/supabase.ts:59-68` : `createClient(..., { auth: { storage: AsyncStorage, storageKey: 'sb-<ref>-auth-token' } })`, aucun SecureStore, aucun chiffrement. Inventaire refait : 37 clés `@kyroz:*` distinctes (`grep -rn "'@kyroz:" | grep -oE '@kyroz:[…]' | sort -u`), dont `@kyroz:profile`, `@kyroz:weights` (santé) — l'audit annonçait 36, l'écart n'est pas matériel.
- Décision C, « aucune migration invité → compte n'existe » — VRAI, vérifié par RÔLE et pas par mot-clé. (1) API Supabase : `grep -rn "linkIdentity"` → 0 ; le seul `updateUser` du dépôt est `updateUser({ password })` (`useAuth.tsx:230`), jamais `{ email }`. (2) Parcours : avec une session invité ouverte, l'écran d'inscription est INATTEIGNABLE — `app/index.tsx:12` et `app/(tabs)/_layout.tsx:33` ne redirigent vers `/(auth)/login` que si `!session`. (3) Réglages : aucune entrée « Créer un compte » ailleurs que dans `login.tsx:241`. (4) Serveur : la seule Edge Function est `delete-account`. (5) Portabilité : `lib/exportData.ts` exporte (`buildExport`, `exportMyData`) et il n'existe AUCUN import (`grep -rn "importData|restoreData|fromExport"` → 0). Aucune surface de conversion, sur aucun des cinq rôles.
- Décision C, « `signInAnonymously` crée une ligne `profiles` avec un `created_at` serveur » — VRAI. `hooks/useAuth.tsx:235` → `supabase.auth.signInAnonymously()` ; `supabase/schema.sql:284` → trigger `on_auth_user_created after insert on auth.users` → `handle_new_user()` insère dans `profiles` ; `schema.sql:26` → `created_at timestamptz not null default now()`. Et `lib/sync.ts:158-161` ne pousse jamais `created_at` (« il appartient au serveur »).
- Décision C, « le bouton est masqué en production » — VRAI au niveau du drapeau. `app/(auth)/login.tsx:264` → `{__DEV__ && (` enveloppe le bloc « Continuer en invité » (`:271-273`). Non mesuré sur le bundle natif publié (cf. couverture).
- Décision D, « `PAYWALL_LAUNCH` est `null` dans TOUS les environnements » — VRAI, et par construction : c'est une constante SOURCE, pas une variable d'environnement. `lib/premium.ts:35` → `export const PAYWALL_LAUNCH: string | null = null;` ; `grep -rn "PAYWALL" .env.example eas.json app.json` → aucune sortie. Aucun override d'appelant non plus : le seul paramètre `launch:` du dépôt est le passe-plat interne `lib/premium.ts:109`, et `usePremium.ts:108` appelle `premiumAccess({ entitled, createdAt })` sans `launch`. `canUse()` n'est appelé nulle part hors de son propre fichier.
- Décision D, « rien d'autre ne déclenche le paywall » — VRAI côté verdict. `lib/premium.ts:93-97` : `premiumAccess` sort sur `{ allowed: true, reason: 'not_launched' }` AVANT de lire `entitled`. Une clé RevenueCat présente change seulement si `identifyUser` part (`usePremium.ts:49,62`), pas si un écran se verrouille. Point à ne pas confondre : `usePremium({ forcerIdentification: true })` (écran Kyroz+) fait bien partir l'identifiant aujourd'hui — c'est le sujet de 09-01, pas du verrou.
- Décision E, « `withBudget`, sur les **deux** appels du démarrage » — EXACT. `grep -rn "withBudget"` hors node_modules/__tests__ → `hooks/useAuth.tsx:86` (getSession), `hooks/useAuth.tsx:114` (hydratation), plus la déclaration `lib/boot.ts:43`. Deux, tous deux au démarrage.
- Décision A, la régression Hermes (04-01) est RÉELLE et l'outil ne s'est pas trompé de cible. `npx expo-doctor` exécuté au HEAD : « ✖ Check for Expo SDK versions affected by Hermes V1 regressions — Detected Hermes V1 250829098.0.10 from React Native. […] 250829098.0.16 is the first version that contains the fix. » Et `grep -i hermes ios/Podfile.lock:135` → `hermes-engine (250829098.0.10)` : la version détectée est bien celle qui sera embarquée, pas une lecture de `package.json`. Le check mesure le moteur, il ne signale pas un numéro de SDK.
- Décision A, l'état « avant » du chiffrage SDK 57 — CONFIRMÉ indépendamment. `npx expo-doctor` au HEAD rend exactement **2 checks en échec** (régression Hermes + paquets dérivants) et **10 paquets** hors version, ce que 04-01-CHIFFRAGE-SDK57.md annonce comme colonne « Avant (SDK 56) ».
- Décision A, 03-04 : `expo-system-ui` est bien ABSENT. `ls node_modules/expo-system-ui` → absent ; `grep -n "ExpoSystemUI|expo-system-ui" ios/Podfile.lock` → 0 ligne. Ce n'est donc pas le piège « pas dans package.json ≠ pas dans le binaire » : il n'est nulle part.
- Décision A, sous-question 3 : 03-02 et 03-04 exigent bien un binaire, ils ne passent pas en OTA. `blockedPermissions` n'agit qu'à la fusion du manifeste Android (prebuild), `expo-system-ui` est un module natif, et retirer `userInterfaceStyle` changerait `UIUserInterfaceStyle` dans l'`Info.plist` résolu (présent parmi les 28 clés introspectées). À nuancer : ce sont deux corrections **Android**, alors que 07-01 et 04-01 tirent un binaire **iOS** — « un build » en compte deux.
- 05-01, « ce qui empêche le pire » — VRAI. `git show ad4bf0b:./app/(auth)/onboarding.tsx | sed -n '198,200p'` : `ageN >= AGE_BOUNDS[0] && … wN >= WEIGHT_BOUNDS[0] && …` avec `WEIGHT_BOUNDS = [30,300]` (`lib/safety.ts:1011`). `NaN >= 30` est faux → une saisie réduite à une virgule bloque l'étape, elle ne propage pas NaN dans le moteur. (L'audit écrit la citation en dur, « `wN >= 30 && wN <= 300` », là où le code lit les constantes de `lib/safety.ts` : la valeur est juste, la citation est une paraphrase.)
- Le garde-fou `npm run check:permissions` posé par `c23aa36` MESURE réellement : il lit la config résolue, énumère les permissions et `allowBackup`, et écrit lui-même sa limite (« Ce relevé n'est pas le manifeste FINAL : seul un prebuild Android le rend »). Il n'est pas décoratif — sauf qu'il affirme « les données locales ne partent pas chez Google (09-02) » sans rien dire d'iOS, où le sujet est réglé autrement (cf. CA-5-01).

**Instruments validés avant de conclure (7)** — chacun a d’abord dû trouver un témoin connu :
- Sonde du texte légal servi (`npx tsx -e "import { PRIVACY_POLICY, TERMS_OF_USE } from './constants/legal'"`). PREMIÈRE VERSION JETÉE : elle importait `PRIVACY_SECTIONS` / `TERMS_SECTIONS`, des noms qui n'existent pas — `JSON.stringify([undefined, undefined])` rendait 0 sur TOUT, y compris sur le témoin « CNIL » que je savais présent. Version retenue validée par deux témoins : longueur du texte = 9 112 caractères, « CNIL » = 3 occurrences. C'est seulement après ça que « médiateur = 0 » et « iCloud = 1 » deviennent des mesures.
- `npx expo config --type introspect --json` : avant de conclure que `RCTAsyncStorageExcludeFromBackup` est ABSENT de l'`Info.plist` résolu, la sonde imprime la liste complète des clés — 28, dont `ITSAppUsesNonExemptEncryption`, `UIUserInterfaceStyle`, `NSCameraUsageDescription`. L'instrument voit donc bien des clés d'`infoPlist` : une absence y est une absence.
- Script de fingerprint (`@expo/fingerprint@0.19.4`, `platforms:['ios']`, `ignorePaths:['android/**/*','ios/**/*']` — les options exactes de `node_modules/expo-updates/utils/build/createFingerprintAsync.js`). Témoin NÉGATIF intégré : le cas F (ajout d'une ligne dans `lib/premium.ts`, changement JS pur) rend le hash IDENTIQUE au baseline. L'instrument sait donc dire « rien n'a bougé » ; un hash différent est un signal, pas du bruit. Témoins de contrôle supplémentaires : cas J et K (dépendance JS pure, version du package) → IDENTIQUES.
- Balayage `.replace(',', '.')` au commit audité (`git ls-tree -r --name-only ad4bf0b` + `git show` fichier par fichier). Témoin : il retrouve les six `fichier:ligne` que 05-01 énumère (courses:402, profil:1161, BodyFatPicker:200 et :214, RecipeEditor:25, WeightCheckin:199) AVANT de rendre les deux que l'audit ne cite pas (MacroSplit:139, :142). L'écart n'est pas un artefact de périmètre.
- Comptage des champs numériques. Deux relevés indépendants au lieu d'un : `grep "<Field" | grep -c keyboardType` → 15 (témoin : trouve bien les champs Field), et un balayage `awk` qui n'accepte un `<TextInput>` que si `keyboardType` apparaît avant la fermeture de la balise → 8. Les deux listes sont disjointes et couvrent les 23 saisies.
- Comptage `supabase.auth.` dans `hooks/useAuth.tsx` à `ad4bf0b`. Témoin : le brut rend 11, et la liste nominative permet d'écarter explicitement les deux non pertinents (`onAuthStateChange`, `getSession` déjà borné) — le chiffre de 9 n'est pas un `grep -c` opposé à un chiffre rédigé.
- `node -e` sur `parseFloat` et `toFixed` : les conséquences citées (« 0,5 » → bouton désactivé, « 113.5 kg » avec un point) sont EXÉCUTÉES, pas déduites de la lecture du code.

### Axe 6 · Les sévérités — 9 mesures
- INVENTAIRE — les 86 tiennent, et le « 88 » se réconcilie. Script python3 : extraction des en-têtes `### NN-XX` + ligne « Sévérité » des dix fichiers de sortie → 88 entrées numérotées, dont 2 sans sévérité P0-P3 (06-04 « aucune — le défaut attendu par le brief n'existe pas », 08-04 « correction, pas constat »), soit 86 constats répartis P0:3 · P1:24 · P2:35 · P3:24. Le tableau du §1 s'additionne exactement, le total par étape aussi (12+8+9+11+7+3+20+5+3+5+3 = 86), et les « 88 constats » de l'exergue = 86 + les 2 non-constats. Aucun constat perdu en route.
- 02-01 (P0, à corriger en premier) — CONFIRMÉ par ma propre mesure. `calculateBMR` sur homme 40 ans / 120 kg / 178 cm, source `measured` contre `estimated` : 30 % → +65 · 32 % → +15 · 35 % → −63 · 40 % → −193 · 45 % → **−322** · 50 % → **−452** kcal/j. `highAdiposity` est déjà `true` à 32 %. Les deux chiffres cités par l'audit (−322 et −452) sont exacts ; le croisement est entre 32 et 35 %, l'audit dit « ~32 % », approximation honnête. (script .../scratchpad/ca6-katch.ts)
- 05-01 — la CONCLUSION de sévérité (P1 et non P0) est confirmée sur la magnitude, même si la preuve ne l'est pas (cf. CA-6-02). Grille de 3 822 profils (2 sexes × 3 objectifs × 7 âges × 13 poids × 7 tailles), poids tronqué X,5 → X : médiane **6 kcal/j**, p90 7, p99 7, 0,4 % au-dessus de 10 kcal. Les 13 cas > 100 kcal sont tous à 50,5 kg / 165 cm, c'est-à-dire de part et d'autre du seuil d'IMC 18,5 — un basculement d'éligibilité, et il va dans le sens PRUDENT (la cible remonte). Ce n'est pas « un plan faux ». (script .../scratchpad/ca6-virgule2.ts)
- 02-04 — CONFIRMÉ mot pour mot. Objectif daté au 2020-01-01 : cible 2144 kcal et drapeaux ["LOW_EA_WARNING"], identiques au même profil sans objectif daté. Et `profil.tsx:655` continue d'afficher « 80 kg · 01/01/2020 » sans condition. (script .../scratchpad/ca6-dated.ts)
- §5 « ce qui va bien » — vérifié à HEAD : `npx tsc --noEmit` sort en 0 ; `npx vitest run` rend **118 fichiers, 1 841 tests verts** en 13 s (l'audit annonçait 1 835 — l'écart est le PR #172 postérieur, pas une erreur).
- 04-09 (descente P1 → P3 sur les licences) — la descente TIENT sur son argument. `npm ls --omit=dev` : `argparse` vient de expo → @expo/cli → @expo/xcpretty → js-yaml ; `caniuse-lite` de expo → @expo/metro-config → browserslist ; `node-forge` de expo-updates → @expo/code-signing-certificates et de @expo/cli. Chaîne de build, et `node-forge` est en double licence (retenir BSD-3 est un droit). Aucun copyleft.
- 03-02 et 01-04/03-07 (moitié Android) sont CORRIGÉS à HEAD, et l'audit avait raison au commit qu'il auditait : `git show 1d39008:kyroz-app/app.json | rg allowBackup` → rien (témoin : le même grep trouve `"android"` ligne 17). À HEAD, `npx expo config --type introspect --json` rend `android.allowBackup = false` et `blockedPermissions` contient désormais WRITE_EXTERNAL_STORAGE. `runtimeVersion` reste `{"policy":"appVersion"}` (03-03 ouvert).
- La règle d'arbitrage EST bien devant chaque étape — ma première mesure disait le contraire et c'était l'instrument. `grep 'en cas de doute entre deux niveaux'` ne rendait que 00-PLAN.md ; les sept briefs la réécrivent autrement (« En cas de doute : niveau supérieur si santé utilisateur, données ou légal »). Elle était donc lue à chaque étape — ce qui aggrave CA-6-07 au lieu de l'excuser.
- 05-01 — j'ai cherché d'autres parseurs que `parseFloat` sur du texte utilisateur (rule « un manque ne se grep pas ») : `parseInt` et `Number(` recensés sur app/ + components/. Les cas trouvés emploient `.replace(/[^0-9]/g,'')`, qui ABSORBE la virgule sans la traduire, mais tous sont derrière un `number-pad` sauf `profil.tsx:2028` (banque de calories, `numbers-and-punctuation`) où l'unité est le kcal entier : impact nul. Rien qui rivalise avec le cas de l'inscription.

**Instruments validés avant de conclure (6)** — chacun a d’abord dû trouver un témoin connu :
- rg -o 'keyboardType="[a-z-]+"' app components → 20 occurrences sur 11 fichiers, incluant `decimal-pad` ET `number-pad` : le motif n'est pas aveugle avant que je conclue que le champ Taille n'est pas en decimal-pad (CA-6-02).
- grep -rncE "je descends|d'un cran" sur les dix sorties → 4 fichiers non nuls, AVANT de conclure que « niveau supérieur / je monte / le supérieur » rend zéro (CA-6-07). Le grep atteint bien ces fichiers.
- rg -l 'expect\(' lib/__tests__ | wc -l → 117, AVANT de conclure qu'aucun test ne couvre `goal` absent. Première tentative sur `components/__tests__` : le dossier n'existe pas et rg rendait 0 sans le dire — instrument corrigé (`find . -name __tests__ -type d` → un seul dossier, lib/__tests__).
- rg -c 'userInterfaceStyle' app.json → 1, AVANT de conclure que `allowBackup` est absent de `git show 1d39008:kyroz-app/app.json` ; le même grep y trouve bien la clé `"android"` ligne 17.
- grep 'En cas de doute' briefs/*.md → 7 briefs sur 8, après que la formulation exacte du plan (« en cas de doute entre deux niveaux ») n'ait rendu que 00-PLAN.md. Le zéro initial était un écart de formulation, pas une absence.
- computePlan renvoie un `ComputedPlan`, pas un profil : ma première grille a rendu « écart max 0 kcal » sur 480 profils parce que je lisais `plan.target_kcal` (undefined) au lieu de `plan.profile.target_kcal`. Deux `undefined` comparés donnent un écart nul et un résultat rassurant — corrigé avant toute conclusion sur 05-01.

### Axe 7 · Les garde-fous, éprouvés par mutation — 13 mesures
- check:permissions (garde-fou n°1 de c23aa36) GARDE VRAIMENT le côté Android — vérifié par deux mutations distinctes. (a) Débloquer WRITE_EXTERNAL_STORAGE dans app.json → `npm run check:permissions` : « ✖ WRITE_EXTERNAL_STORAGE 🔴 NON ARBITRÉE » + « ✖ 2 écart(s) ». (b) `allowBackup: true` → « ✖ android.allowBackup » + « ✖ 1 écart(s) ». Baseline propre : 5 ✓ et « ✅ Les permissions résolues sont celles qui ont été arbitrées », EXIT=0.
- fichesOta.test.ts GARDE VRAIMENT l'accord entre les deux fiches. `sed -i '' '51s/la \*\*24ᵉ\*\*/la **23ᵉ**/' STORE-RELEASE.md` → `npx vitest run lib/__tests__/fichesOta.test.ts` : « × même rang, même groupe, même commit », Tests 1 failed | 17 passed (18). Le fichier porte en plus ses propres témoins « la sonde sait dire NON » sur des fiches fabriquées (lignes 75-120), donc il ne dépend pas du contenu réel pour prouver son instrument.
- Le garde-fou « non-régression `measured` : Katch exactement, sur toute la grille » (lib/__tests__/r6Lissee.test.ts:150, balayé sur les 1 344 corps construits lignes 115-125) EST rouge sous la mutation exacte décrite par le PR. `sed -i '' '160s/.*/ if (katchEligible(b)) return Math.round(Math.max(katchRaw(b), mifflinRaw(b)));/' lib/tdee.ts` → `npx vitest run` : Tests 8 failed | 1833 passed, dont r6Lissee « non-régression `measured` » et bodyFatSource « mesuré → Katch-McArdle ». Le PR annonce « neuf tests » ; j'en mesure 8 — écart non exploitable, ma mutation n'est pas forcément la leur.
- legal.test.ts GARDE VRAIMENT les deux miroirs générés. `sed -i '' '1s/^/<!-- MUTATION -->\n/' public/legal.html` → `npx vitest run lib/__tests__/legal.test.ts` : « × public/legal.html correspond à constants/legal.ts », Tests 1 failed | 22 passed (23).
- check:suspens GARDE VRAIMENT, et il fait bien le tour des 5 arbres de travail. Baseline : « ✓ Rien en suspens, nulle part. » ; `touch -t 202608240900 kyroz-app/OUBLI_MUTATION.txt` → « ⚠️ ?? kyroz-app/OUBLI_MUTATION.txt (2 j) » puis « ✗ 1 chose(s) traînent depuis plus de 24 h », EXIT=1. `git worktree list` confirme 5 arbres balayés.
- L'extinction PostHog est réellement tenue — au bon endroit, sur le COMPORTEMENT. Retirer la garde de `capture` (lib/analytics.ts:173) en laissant le drapeau à false → 2 tests rouges : « aucun appel réseau » et « aucun identifiant pseudonyme n'est CRÉÉ au passage ». Les trois remparts annoncés par le §5 sont bien là et dans cet ordre (lib/analytics.ts:173 drapeau, :174 consentement, :178 clé).
- check:abonnements SAIT dire NON sur un identifiant faux : `sed -i '' '185s/kyroz_plus_monthly_early/kyroz_plus_monthly_EARLY/' lib/premium.ts` → « 🔴 kyroz_plus_monthly_EARLY ← ABSENT chez Apple » puis « 🔴 1 identifiant(s) demandé(s) par le code et absent(s) chez Apple. ». Son défaut est le périmètre vide (CA-7-03), pas la confrontation elle-même.
- check:ota SAIT sortir en code 1 : un désaccord de rang entre AGENTS.md et STORE-RELEASE.md donne « ✖ 1 écart(s) : les fiches ne décrivent PAS ce qui tourne », EXIT=1. Le chemin d'échec du script fonctionne — l'inertie mesurée en CA-7-01 est propre à sa §4.
- check:auth SAIT sortir en code 1 : stub rendant `mailer_autoconfirm: true` → « ✖ La confirmation e-mail est DÉSACTIVÉE », EXIT_CODE=1. Et son témoin négatif fonctionne (clé bidon → 401 exigé, arrêt en code 2 sinon).
- Le cliquet anti-doublons est SERRÉ AU RAS, pas relâché : `npm run check:doublons` rend R1 74 / R2 71 / R4 14 / R5 16 / R7 0, et lib/__tests__/doublons.test.ts:48 porte PLAFOND = { R1: 74, R2: 71, R4: 14, R5: 16, R7: 0 } avec `toBeLessThanOrEqual`. Zéro marge sur les cinq règles : une violation de plus rougit.
- check:migrations porte, LUI, la garde de périmètre vide qui manque à check:abonnements (scripts/check-migrations.mjs:51-56 : `if (COLS.length < 20) process.exit(2)`), plus un témoin négatif en premier (ligne 76) et un `ko` incrémenté sur chaque ligne. Lu, non exécuté (pas de .env.local dans ce worktree — cf. couverture).
- Base de référence de la session, re-mesurée avant et après chaque mutation : `npx vitest run` → 118 fichiers, 1841 tests verts ; `npx tsc --noEmit` → 0 erreur ; `git status --porcelain --untracked-files=all` vide à la fin.
- analyticsPerimetre.test.ts porte son propre test d'instrument (« l'instrument sait dire OUI », lignes 175-190) qui vérifie que `clesDe`/`blocsDeProprietes` voient un `goal` fautif ET que les blocs réels du dépôt sont bien vus (`SOURCES.some(… length > 0)`) — c'est exactement la garde de périmètre non-vide que check:abonnements n'a pas.

**Instruments validés avant de conclure (10)** — chacun a d’abord dû trouver un témoin connu :
- `npm run check:permissions` — prouvé capable de rougir (WRITE_EXTERNAL_STORAGE débloquée → ✖ 2 écarts ; allowBackup:true → ✖ 1 écart) AVANT de conclure qu'il reste vert sur les permissions iOS.
- `npm run check:ota` — prouvé capable de sortir en code 1 (désaccord de rang entre AGENTS.md et STORE-RELEASE.md) AVANT de conclure que sa §4 ne peut pas faire échouer.
- `node scripts/check-auth.mjs` — prouvé capable de sortir en code 1 (stub `mailer_autoconfirm: true`) AVANT de conclure que provider e-mail fermé + inscriptions fermées passent en code 0. Le témoin négatif interne du script (clé bidon → 401 exigé) passe dans les deux stubs.
- `npm run check:abonnements` — prouvé capable de rendre « 🔴 1 identifiant(s) … absent(s) chez Apple » (identifiant volontairement faux) AVANT de conclure qu'il reste vert sur un périmètre vidé par un changement de guillemets.
- `npx vitest run` (118 fichiers / 1841 tests) — prouvé capable de rougir sur le périmètre moteur (mutation Math.max dans lib/tdee.ts:160 → 8 rouges) et sur le périmètre analytics (garde retirée de lib/analytics.ts:173 → 2 rouges) AVANT de conclure qu'il reste à 1841/1841 sur la mutation de hooks/usePremium.ts:87, sur un 4ᵉ appelant `forcerIdentification`, sur les guillemets de lib/premium.ts, sur les permissions iOS et sur une date légale fausse.
- `npx tsc --noEmit` — 0 erreur mesurée sur l'arbre propre, puis re-mesurée à 0 sous chaque mutation déclarée « invisible » (guillemets de premium.ts, usePremium.ts:87), pour prouver que la mutation compile et n'est donc pas attrapée ailleurs.
- `grep -rn entitlementNecessaire app components hooks lib scripts test docs` — recensement par RÔLE plutôt que par phrase : la fonction n'est pas exportée, donc aucun test ne PEUT l'appeler ; le grep confirme 3 occurrences dans hooks/usePremium.ts et 1 dans un .md, zéro dans lib/__tests__/.
- `grep -rn 'usePremium(' app components hooks` — recensement des appelants par rôle (3 sites : kyroz-plus.tsx, (tabs)/profil.tsx, WeightCheckin.tsx) pour établir que la liste de 2 fichiers du test est aujourd'hui exhaustive mais non extensible.
- `awk 'NR>=129 && NR<=163' scripts/check-ota.ts | grep -c ko` → 0, croisé avec `grep -n 'ko++\|ko +=\|if (ko)'` qui rend les 4 lignes réelles (28, 39, 54, 166) : l'absence est prouvée par la présence ailleurs, pas par un grep muet.
- `npx expo config --type introspect --json` — vérifié qu'il expose bien `ios.infoPlist` (NSPhotoLibraryUsageDescription, NSCameraUsageDescription à l'état propre ; + NSLocationWhenInUse et NSContacts sous mutation) : le script check-permissions.mjs charge donc DÉJÀ la donnée qu'il ne lit pas.

### Axe 8 · Les étapes 6b, 9 et 10 (jugées sans accès au code) — 14 mesures
- 10-01 TIENT, entièrement. `grep -n "__DEV__" "app/(auth)/login.tsx"` → `264: {__DEV__ && (`. `grep -rn "sans compte" STORE-RELEASE.md` → `563:` porte bien le texte promotionnel « Gratuit, sans compte requis pour démarrer. » `cat -n lib/reviewAccess.ts` → `25: export function isReviewLogin(...)`, et `app/(auth)/login.tsx:72-73` : `if (mode === 'signin' && isReviewLogin(...)) { return guest(); }`. Le relecteur entre bien sans compte, l'utilisateur non. Le constat est exact et sa preuve est reproductible.
- 10-03 / allégation 1 RE-MESURÉE MOI-MÊME : `node -e "console.log(require('./Recette/recettes-kyroz.json').recipes.length)"` → `512`. La fiche annonce 512. Aucune dérive.
- CITATIONS DE L'ÉTAPE 9 : les NEUF `legal.ts:NNN` cités tombent EXACTEMENT sur la phrase annoncée au commit audité. `cite.sh c850512 legal.ts:246 legal.ts:208 legal.ts:119 legal.ts:218 legal.ts:232 legal.ts:224 legal.ts:299 legal.ts:338 legal.ts:292` → 9/9 justes. L'hygiène de citation de l'étape 9 est solide ; les décalages visibles à HEAD viennent de la PR #172, pas de l'audit.
- 09-02 / DÉCISION C2, VOLET ANDROID : appliqué et vérifié sur la config RÉSOLUE, pas sur `app.json` seul. `grep -n allowBackup app.json` → `24: "allowBackup": false`, et `npx expo config --type public --json` → `android: {... "allowBackup": false ...}`. La sauvegarde Google n'emporte plus rien.
- BROUILLON, LIGNE « Tracking (ATT) » : VRAIE. `cat ios/Kyroz/PrivacyInfo.xcprivacy` → `<key>NSPrivacyTracking</key><false/>`, aucun `NSPrivacyTrackingDomains`. `grep -rn expo-tracking-transparency` sur `app/ components/ lib/ hooks/ constants/` → 0.
- BROUILLON, LIGNE « chiffrées en transit » : VRAIE. `grep -n NSAppTransportSecurity -A 8 ios/Kyroz/Info.plist` → `43: <key>NSAllowsArbitraryLoads</key> / 44: <false/>`.
- BROUILLON, LIGNE « Location, Contacts, Browsing, Search » : VRAIE, même si le brouillon ne la mesure pas. Mesurée ici : 28 dépendances au total, `0` correspondant à `location|contacts|calendar|tracking|sensor|geo|analytics|sentry|firebase|amplitude|mixpanel|segment` ; `grep -rnE "expo-location|expo-contacts|expo-calendar|@sentry|firebase|Geolocation"` sur `app/ components/ lib/ hooks/ constants/` → 0 ligne.
- 09-04 : la phrase du médiateur est retirée des TROIS surfaces générées. `grep -c "médiateur de la consommation"` → `constants/legal.ts` 0, `public/legal.html` 0, `../docs/politique-confidentialite-kyroz.md` 0. Le générateur `scripts/gen-legal.ts` a bien propagé.
- ARBITRAGE 6b, QUESTION 1 (« PostHog est-il branché ? NON ») : VRAI. `lib/featureFlags.ts:72` → `export const STATISTIQUES_USAGE_ACTIVES = false;` ; garde en amont dans `lib/analytics.ts:173` → `if (!STATISTIQUES_USAGE_ACTIVES) return;` ; les deux surfaces d'affichage gardées (`app/(auth)/onboarding.tsx:425`, `components/ReglagesSheet.tsx:323` et `:350`). Donc `legal.ts:120` (« Aucune statistique d'usage n'est collectée ») est exact en production.
- 09-03, CONCLUSION : VRAIE (c'est sa PREUVE qui ne l'est pas, cf. CA-8-06). Aucun code n'applique l'exclusion : `lib/safety.ts:986-994` documente le retrait de `PREGNANCY_OR_NURSING` le 2026-08-11, et `EligibilityBlock` (`lib/safety.ts:995-999`) ne porte plus que `MINOR`, `UNDERWEIGHT_CUT_BLOCKED`, `TARGET_BMI_OUT_OF_RANGE`, `TRAINING_VOLUME_IMPLAUSIBLE`.
- 06b-13, PRÉMISSE : CONFIRMÉE dans le code, ce que l'étape 9 n'avait pas fait. `app/(auth)/login.tsx:65` → `const canSubmit = emailValid && password.length >= MDP_LONGUEUR_MIN && (mode === 'signin' || consent);` — la case de consentement santé n'est exigée qu'à l'INSCRIPTION ; le chemin invité/relecteur (`:72-73`) ouvre une session sans y passer. `legal.ts:133` (« consentement explicite […] recueilli à l'inscription ») ne couvre donc pas ce chemin.
- 06b-14, 06b-17, 06b-22 : les trois citations tombent juste. `app/(tabs)/plan.tsx:1108` « …en un instant. » contre `:1098` « Nouveau plan en route… » ; `lib/reminder.ts:299-300` → `return c.auteur ? ... : c.texte;` (la branche sans auteur existe) ; `components/DislikedFoodsField.tsx:68` et `app/(tabs)/profil.tsx:1575` portent bien DEUX espaces avant le `✕`.
- GARDE-FOUS DE LA PR #172 : verts et non décoratifs pour ce qu'ils visent. `npx vitest run lib/__tests__/legal.test.ts lib/__tests__/identificationDifferee.test.ts` → `Test Files 2 passed (2) / Tests 29 passed (29)`.
- BROUILLON, PERMISSIONS ANDROID : VRAI et mesuré sur la config résolue — `npx expo config --type public --json` → `"permissions": []` mais `"blockedPermissions": ["...RECORD_AUDIO", "...SYSTEM_ALERT_WINDOW", "...WRITE_EXTERNAL_STORAGE"]`. La décision 3 du brouillon est bien appliquée.

**Instruments validés avant de conclure (7)** — chacun a d’abord dû trouver un témoin connu :
- TÉMOIN ACCENTS (grep) — `grep -n "médiateur" constants/legal.ts` → rend `352:` et `358:` ; `rg -n "enceintes ou allaitantes" constants/legal.ts` → rend `311:`. Le shell est en `LC_CTYPE="C"` (sortie de `locale`) et trouve quand même les accents : une absence rendue par ces greps est une vraie absence.
- TÉMOIN NBSP (lecteur python) — j'ai écrit `avant : apres` dans un fichier jetable puis relu : `" " in open(tmp).read()` → `True`. ⚠️ ET LE PREMIER PASSAGE M'A MENTI QUAND MÊME : il rendait 0 sur `app/ components/ lib/ constants/ hooks/`, alors que la source écrit l'insécable en ÉCHAPPEMENT ` `, pas en caractère littéral. Instrument corrigé pour chercher LES DEUX formes (`/\\u00[aA]0|\\u202[fF]|\\x[aA]0/` + littéraux) — c'est cette seconde version qui a trouvé les 6 occurrences.
- TÉMOIN GREP-DANS-L'AUDIT — avant de conclure que `NSPrivacyCollectedDataTypes` manque au brouillon, j'ai vérifié que la même commande trouve un témoin connu : `grep -rl "NSPrivacyTracking" docs/audit-v1/` → 3 fichiers (`09-BROUILLON-FORMULAIRES.md`, `03-store-readiness.md`, `briefs/03-store-readiness.md`). Puis `grep -rn "NSPrivacyCollectedDataTypes" docs/audit-v1/` → 4 lignes, aucune dans le brouillon.
- TÉMOIN GREP-DÉPÔT-SÉPARÉ — `grep -rn "kyroz-site|Kyroz_Site|kyroz.app/legal" docs/audit-v1/` → 3 lignes, toutes dans `10-fiche-store.md`. Le témoin qui prouve que le grep marche : `grep -rln "legal.html" docs/audit-v1/` → 4 fichiers. Donc l'absence de `kyroz-site` dans les constats est réelle, pas un défaut de commande.
- RELECTURE À UN COMMIT ARBITRAIRE — script `cite.sh` : `git ls-tree -r --name-only <commit> | grep -E "(^|/)<base>$"` puis `git show <commit>:./<path> | sed -n "<N>p"`. Validé sur un cas connu (`c850512:constants/legal.ts:246` rend bien la phrase « Aucun compte ne peut être créé en deçà de cet âge »). ⚠️ Première version FAUSSE : elle rendait des lignes vides parce que le dépôt a l'app dans `kyroz-app/` et que `git show <commit>:components/...` échoue — j'ai vu l'erreur `fatal: path ... exists, but not ...` avant de conclure quoi que ce soit.
- EXÉCUTION DU MOTEUR RÉEL — `npx tsx` sur un script qui IMPORTE `lib/premium.ts` (pas une réécriture) pour imprimer `PAYWALL_LAUNCH` et rejouer `entitlementNecessaire`. Sortie : `PAYWALL_LAUNCH = null`.
- MUTATION SUR TEXTE RÉEL — `npx tsx` sur un script qui importe `PRIVACY_POLICY`/`TERMS_OF_USE` de `constants/legal.ts`, reconstruit le `TOUS_LES_PARAS` de `legal.test.ts` et évalue l'assertion pour les DEUX valeurs du drapeau. C'est la mutation que je ne pouvais pas faire dans le dépôt (règle 5).
