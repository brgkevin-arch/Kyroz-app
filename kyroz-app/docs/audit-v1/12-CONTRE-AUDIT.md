# Contre-audit de l'Audit V1
Date : 2026-08-27 · Cible : les 86 constats, les 5 décisions et le §5 de `11-SYNTHESE.md` · Commit contre-audité : `c23aa36`

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

## 3 · Les deux feux verts du moteur qui ne tiennent pas

Le §5 est la zone la plus dangereuse d'un audit : personne ne revérifie un vert avant la vente.

### CA-2-02 · « Aucun plancher contournable » est vrai dans `computePlan`, et faux à l'écran

Le balayage de confirmation est solide — **274 428 profils, zéro violation** dans `computePlan`.
Mais l'arrondi n'est pas le dernier maillon : `planEngine.baseDayTargets` (`lib/planEngine.ts:1158-1164`)
et `planEngine.bankedTargets` (`:1186-1200`) re-plafonnent par le bas avec `bankFloorKcal`
(`= max(BMR, MIN_KCAL)`), **strictement plus bas** que `safetyFloorKcal`.

**La cible affichée jour par jour descend jusqu'à 433 kcal/j sous le plancher de sécurité.**
C'est celle-là que la personne voit et suit.

### CA-2-01 · Le balayage qui certifie la continuité R6 s'arrête exactement au point de rupture

La borne haute du balayage (30 % de MG) **est** la valeur de `HIGH_ADIPOSITY_PCT.male`
(`lib/safety.ts:274`). Le décrochage est juste après. Sur une grille large, franchissement
compris : **saut de 114 kcal/j au pas de 0,5 pt, et 98 kcal/j au pas de 0,05 pt.** Un saut qui
ne rétrécit pas quand le pas rétrécit est une **discontinuité**, pas un artefact de maillage.

Le « saut maximal 28 kcal/j » est donc vrai sur 10–30 % — c'est-à-dire partout **sauf** au seuil
que l'audit avait lui-même désigné comme la règle 5.

### CA-2-03 · « Aucun SDK hors des trois sous-traitants déclarés » : il y en a un quatrième

L'instrument était un grep de **noms** de SDK connus : il ne pouvait trouver que ce qu'il
nommait. Recensé par le **rôle** (« qui reçoit une requête réseau »), `expo-updates` est lié en
natif (`EXUpdates`, `EASClient` dans `ios/Podfile.lock`), `checkAutomatically: "ON_LOAD"`, et
envoie à `u.expo.dev` un **UUID d'installation persistant** à chaque lancement. Expo /
650 Industries n'est ni au registre RGPD, ni au §5 de la politique, ni au formulaire App Privacy.

C'est le raisonnement exact qui a fait entrer RevenueCat au registre le 2026-08-26, appliqué à
un destinataire que le tableau de l'étape 3 a classé « s. o. » sans mesurer ce qu'il envoie.

---

## 4 · Six garde-fous sur huit ne gardent rien

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

---

## 5 · Ce qui TIENT — 110 mesures négatives

Un contre-audit qui ne publierait que ses trouvailles serait le miroir du défaut qu'il dénonce.

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

## 6 · Ce que l'audit s'est fait à lui-même : la chaîne 6a → 6b → 9

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
| **0a** | 🔴 **Le compte supprimé** | `CA-3-01` (notifications éternelles) + `CA-3-03` (photos laissées sur l'appareil) | droit à l'effacement ; les deux se corrigent dans `doDelete` |
| **0b** | 🔴 **Les mineurs** | `CA-8-03` — demander l'âge **avant** `signUp`, ou réécrire la clause | clause contractuelle publiée, fausse |
| **0c** | 🔴 **Le plancher affiché** | `CA-2-02` — 433 kcal/j sous le plancher de sécurité | santé, et ça dément le §5 |
| **1′** | 🔴 **Les trois P0, recos corrigées** | 01-01, 02-01, 02-02 **+ 02-03** — avec `goal` et `macro_mode`, et **sans** la garde d'identité sur le `id` local | les recos publiées ne ferment pas leur trou |
| **2′** | 🔨 **Décision A** | inchangée, **moins** la tâche `allowBackup`/iOS qui n'existe pas, **plus** l'avertissement `fingerprint` : la ligne OTA se coupe à **chaque** édition d'`app.json`, pas « une fois » (`CA-5-03`) | |
| **3′** | ⚖️ **Textes publiés** | `legal.ts:208` (rendu faux **par** le correctif 09-01) + Expo au registre + la mention iCloud à retirer | trois textes publiés faux, aucun dans un lot |
| **7′** | 🧯 **Décision E, re-dimensionnée** | `withBudget` : **9 appels**, pas 6 · `.replace(',','.')` : **8 occurrences**, **3 manques** · **4ᵉ occurrence du motif** : `frnum()` et « 113.5 kg » sur la courbe de poids | un test écrit sur les chiffres publiés passerait au vert avec trois appels nus |
| **12** | 🧪 **Les six garde-fous décoratifs** | §4 | un vert qui ne peut pas rougir est pire que pas de contrôle |
| **13** | 📝 **Rejouer 6b sur le corpus réel** | après avoir réparé l'extracteur (`CA-4-02`) | 16 constats reposent sur un corpus amputé, puis abîmé |

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

**⑤ La réfutation adverse paie.** Sept constats sur soixante-deux sont tombés, dont un doublon
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
