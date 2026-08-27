# Audit V1 Kyroz — Synthèse & backlog
Date : 2026-08-26 · Commits audités : `c17e667` → `1d39008` · **Onze étapes**, dont deux menées dans Claude.ai et arbitrées ici.

> **Ce document ne relit pas les 88 constats.** Il dit trois choses : ce qui bloque, ce qui converge, et dans quel ordre.
> Les constats vivent dans leurs fichiers ; le numéro suffit à les retrouver.

---

## 1 · L'état, en un tableau

| Étape | Statut | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| 1 · Sécurité & données | ✅ | **1** | 4 | 4 | 3 |
| 2 · Moteur | ✅ | **2** | 1 | 2 | 3 |
| 3 · Store readiness | ✅ | 0 | 4 | 3 | 2 |
| 4 · Qualité code | ✅ | 0 | 1 | 5 | 5 |
| 5 · Perf, a11y, robustesse | ✅ | 0 | 4 | 1 | 2 |
| 6a · Extraction des textes | ✅ | 0 | 0 | 2 | 1 |
| 6b · Jugement des textes | ✅ *(arbitré)* | 0 | 4 | 12 | 4 |
| 7 · Monétisation | ✅ | 0 | 1 | 2 | 2 |
| 8 · Analytics | ✅ *(re-cadrée)* | 0 | 0 | 2 | 1 |
| 9 · Conformité | 🟡 **partielle** | 0 | 4 | 1 | 0 |
| 10 · Listing & ASO | 🟡 **partielle** | 0 | 1 | 1 | 1 |
| **Total** | | **3** | **24** | **35** | **24** |

**86 constats**, plus deux non-constats (06-04, 08-04) qui invalident des prémisses.

### Ce qui reste à faire, et pourquoi ce n'est pas de ma main

| Étape | Ce qui manque | Qui |
|---|---|---|
| **9** — deux tiers | textes ↔ registre, textes ↔ **déclarations stores** | 🔴 **les deux captures de formulaires** — probablement pas encore remplis. `09-BROUILLON-FORMULAIRES.md` renverse le blocage : il **est** la checklist de saisie, dérivée du code |
| **10** — ASO, business, ops | jugement ASO, seuil de rentabilité | 🔴 **tes hypothèses de coûts fixes**. Une seule saisie débloque tout le volet |

---

## 2 · Les trois P0

Aucun ne bloque la **soumission**. Les trois produisent un plan faux ou mélangent les données de deux personnes.

### 01-01 · Un compte peut hériter des données du précédent, sur le même appareil
La purge locale n'existe que dans l'appelant du bouton « Se déconnecter ». **Aucun autre chemin de perte de session n'efface quoi que ce soit** — un jeton révoqué, un mot de passe changé ailleurs, un compte supprimé depuis un autre appareil suffisent. Et `decideProfileHydration` ne prend que trois booléens : **jamais une identité**. Si le local est marqué « à pousser », le profil de A part dans la ligne cloud de B.
**Correctif** : la purge devient une propriété de `signOut()`, et l'identité entre dans la décision d'hydratation. **M**

### 02-01 · Katch-McArdle est servi à 45 % de masse grasse
`calculateBMR` part droit sur Katch dès que le %MG est « mesuré », sans consulter `highAdiposity` — qui existe. Sur un homme de 120 kg, le BMR servi passe **sous Mifflin à partir de ~32 % de MG**, et l'écart atteint **−322 kcal/j à 45 %**, **−452 à 50 %**.
Ce qui rend le constat sûr : **le code écrit lui-même l'argument contraire** (docstring de `melangeVersKatch`, mesuré sur n=3001 et n=731) et l'applique — mais seulement à la branche « estimé ».
**Correctif** : une ligne dans `katchEligible`, un test qui la voit rougir. **S** — la mesure d'impact sur le parc est le vrai coût. **M**

### 02-02 · Une ligne cloud partielle produit un plan entièrement NaN
Une ligne où seul `sex` est posé passe `hasCloud` (`sync.ts:382` ne teste que ça) et sort **NaN** sur le TDEE, la cible, le plancher et les trois macros — **en émettant quand même un `LOW_EA_WARNING`**, donc en prétendant avoir conclu. La ligne est atteignable : aucune colonne de `profiles` n'est `NOT NULL`, et `pushProfile` journalise déjà le cas du profil poussé partiellement.
**Correctif** : une garde d'exhaustivité en entrée de `computePlan`, et `hasCloud` teste les quatre champs du BMR. **M**

---

## 3 · Ce qui converge — cinq décisions portent trente constats

C'est le résultat le plus utile de cet audit. **Traiter les constats un par un coûterait cinq fois plus cher que traiter les décisions.**

### 🔨 Décision A — le prochain binaire : six constats, un seul build
| # | Constat | Pourquoi ce build |
|---|---|---|
| **04-01** | Hermes V1 porte une **régression mémoire connue** (`expo-doctor`) | le correctif est SDK 57 ou RN ≥ 0.86.2 |
| **03-03** | `runtimeVersion: appVersion` sur une version figée → une OTA peut atterrir sur un binaire incompatible | la bascule vers `fingerprint` coupe la ligne OTA **une fois**, volontairement |
| **07-01** | Les **quatre abonnements** sont en « Métadonnées manquantes » | la capture de review exige un build natif montrant le paywall |
| **03-05** | Aucun crash reporter — **décision, pas défaut** | s'il en faut un, il entre dans ce binaire |
| **03-02** | `WRITE_EXTERNAL_STORAGE` déclarée sans usage | une ligne dans `blockedPermissions`, à prendre avant le build |
| **03-04** | `userInterfaceStyle: dark` inopérant sur Android | `expo-system-ui` est un module **natif** |

➡️ **Un build, ou six.** Et le choix du SDK 57 conditionne les cinq autres. **C'est la première décision à prendre.**

### 🔐 Décision B — les sauvegardes OS : une décision, cinq phrases fausses
**01-04** + **03-07** + **09-02**. `allowBackup` n'est déclaré nulle part, AsyncStorage est en clair : le jeton de session **et** les données de santé partent vers Apple et Google. Ce qui rend cela grave n'est pas le registre, c'est que la politique publiée affirme :

> « **Aucune donnée de santé ne quitte l'Union européenne.** » — `legal.ts:218`

Quatre autres phrases tombent avec elle.
➡️ **Segmenter, ne pas tout exclure** : exclure le jeton, le profil et les pesées — coût nul, ils sont déjà au serveur. **Garder les photos** : elles ne vont jamais au serveur, la sauvegarde est leur **seul filet**, et les exclure détruirait au changement de téléphone le contenu dont la valeur est d'être ancien. Puis corriger `:218` et `:118`, et déclarer Apple et Google au registre **pour ce périmètre restreint**.

### 👤 Décision C — le mode invité n'existe dans aucune règle
**09-05** + **06b-13** + **06b-18** + **10-01**. `signInAnonymously` crée une ligne `profiles` avec un `created_at` serveur, et **aucune migration invité → compte n'existe**. Conséquences : le grand-pérage se **perd** pour qui teste six mois en invité, et se **fabrique** pour qui ouvre des sessions anonymes. L'invité ne passe par **aucun** consentement art. 9. Et la fiche store promet « sans compte requis » alors que le bouton est masqué en production.
➡️ **Une seule question : le mode invité est-il un compte ?** Les quatre constats en découlent.

### 💳 Décision D — poser la date du paywall réveille quatre dormants
**07-03** (hors ligne, un abonné est traité comme non abonné — inoffensif tant que `PAYWALL_LAUNCH` est `null`) · **03-06** (`NSPrivacyCollectedDataTypes` cessera d'être exact) · **01-05** = **06b-07** (rien ne dit que supprimer son compte n'annule pas l'abonnement) · **09-04** (le médiateur devient exigible dès la première vente).
➡️ Les quatre se corrigent **dans le même lot que la pose de la date**, pas avant, pas après.

### 🧯 Décision E — « le garde-fou vit chez l'appelant » : le même défaut, trois fois
| # | Le bon motif existe | Il n'a pas été étendu à |
|---|---|---|
| **01-01 / 01-02** | la purge, dans `doLogout` | tous les autres chemins de perte de session |
| **05-01** | `.replace(',', '.')`, **cinq fois** | l'inscription (poids, taille) et la réserve |
| **05-03** | `withBudget`, sur les **deux** appels du démarrage | les **six** appels interactifs |

➡️ Ce n'est pas trois bugs, c'est **une manière d'écrire**. Le correctif générique : le garde-fou descend dans la fonction, et un **test compte les appelants**. Ce dépôt sait déjà faire ça — `fichesOta.test.ts`, `analyticsPerimetre.test.ts`, `check:abonnements`.

---

## 4 · Le backlog, par lot

Un lot = une décision ou un thème. L'ordre est celui des dépendances, pas des sévérités.

| # | Lot | Contenu | Effort | Bloque |
|---|---|---|---|---|
| **1** | 🔴 **Les trois P0** | 01-01, 02-01, 02-02 | M + S + M | rien, mais ils produisent des plans faux **aujourd'hui** |
| **2** | 🔨 **Décision A — le binaire** | 04-01, 03-03, 07-01, 03-05, 03-02, 03-04 | **L** | la mise en vente |
| **3** | 🔐 **Décision B — sauvegardes** | 01-04, 03-07, 09-02 | M | la conformité, et la saisie des formulaires |
| **4** | 👤 **Décision C — invité** | 09-05, 06b-13, 06b-18, 10-01 | M → L | la fiche store, le grand-pérage |
| **5** | 📄 **Formulaires stores** | remplir depuis `09-BROUILLON-FORMULAIRES.md` | M | **l'étape 9 complète** |
| **6** | ⚖️ **Textes légaux** | 09-01, 09-03, 06b-02, 06b-03, 06b-06 | M | — |
| **7** | 🧯 **Décision E — garde-fous** | 01-02, 05-01, 05-03 | S ×3 | — |
| **8** | ♿ **Accessibilité & contraste** | 05-02, 05-04 | M | — |
| **9** | ✍️ **Textes produit** | 06b-08 à 06b-16, 06b-20 à 06b-23, 06-01, 06-02, 06-03 | M | — |
| **10** | 🧹 **Dette** | les 24 P3, plus 04-02 (lint), 04-05, 04-06 | L | — |
| **11** | 💳 **Décision D — paywall** | 07-03, 03-06, 01-05, 09-04 | M | **au moment de poser la date** |

**Lot 1 avant tout.** Les trois P0 ne bloquent aucune soumission — ils dégradent le produit pour des gens qui l'utilisent déjà.

---

## 5 · Ce que l'audit dit de bon, et qui n'est pas de la politesse

Un backlog de 86 lignes donne une image fausse s'il est lu seul. Ce qui a été **mesuré** et qui tient :

- **Sécurité Supabase** : RLS `enable` **et** `force` sur les six tables, policies `for all` avec `using` et `with check`, cascade partout, `anon` sans le moindre droit de table, une seule fonction `security definer` (avec `search_path`), **aucun secret dans tout l'historique git**, et une Edge Function de suppression qui n'accepte aucun identifiant du client.
- **Moteur** : l'ordre floors/plafonds est le bon — **aucun plancher contournable dans
  `computePlan`** *(périmètre resserré le 2026-08-27, contre-audit `CA-2-02` : la cible
  SERVIE jour par jour descend sous le plancher de sécurité, délibérément et sans danger
  — voir la note de `02-moteur.md`. Ne pas le « corriger »)*. Le lissage R6 tient (saut maximal **28 kcal/j**) *(sur 10–30 % ; la fenêtre s'arrêtait
  sur le seuil d'adiposité — au-delà le saut valait 115 kcal/j, corrigé le 2026-08-27,
  contre-audit `CA-2-01`)*. Couverture des cinq fichiers moteur : **96,35 % à 100 %** de lignes. **0** `any`, **0** erreur `tsc`, **1 835 tests verts**.
- **Affichage** : sur 96 profils, l'écart entre les macros affichées et les kcal affichées plafonne à **0,13 %**.
- **Store** : aucun tracking, ATS intact, aucun Firebase, icône 1024 sans canal alpha, **aucun SDK hors des trois sous-traitants déclarés**.
- **Textes** : Claude.ai qualifie le corpus de « **globalement bien meilleur que la moyenne du secteur** » et cite treize textes comme modèles — dont `methodologie.ts:159-164`, dont elle écrit n'avoir « pas vu d'équivalent dans une app grand public ».
- **Extinction PostHog** : trois remparts dans le bon ordre, la garde passant **avant** la lecture du consentement, et **14 assertions** qui la tiennent.

---

## 6 · Ce que cet audit a appris sur les audits

Quatre choses, toutes payées comptant.

**① Le brief se trompe autant que le code.** Sur onze étapes, **quatre briefs portaient des décisions périmées** — l'étape 2 (deux règles fausses, dont un seuil à 20 % au lieu de 30/40), l'étape 7 (trois décisions sur sept), l'étape 8 (sa condition de lancement) et l'étape 6b (« 18 mois » contre un arbitrage daté). Les appliquer à la lettre aurait produit **au moins quatre faux constats, dont deux P0**.
➡️ **Un document non exécuté ne fait pas foi contre un test qui tourne.**

**② Le document qui revient s'arbitre.** La recommandation « écris 18 mois » de l'étape 6b aurait remis en production la phrase que la règle « zéro malhonnêteté » avait fait retirer. Elle a été rejetée par une seule lecture du registre.

**③ Les instruments mentent, et il faut les mesurer d'abord.** Cinq fois dans cet audit : la regex `xit\(` qui matchait `process.exit(3)` (5 faux tests skippés) · `depcheck` qui ignore les plugins d'`app.json` · l'extraction `>texte<` qui capturait les opérateurs de comparaison · le seuil de 12 caractères qui a perdu **30 chaînes**, dont les quatorze noms d'auteurs · et une clé anon prise pour morte alors que seule celle de `.env.local` l'était.
➡️ **Un témoin à zéro dans les deux relevés est d'abord un suspect d'encodage, pas une absence.**

**④ Deux méthodes indépendantes qui tombent au même endroit valent une preuve.** **01-05** et **06b-07** ont été trouvés deux fois — une fois par le code, une fois par les textes, sans communication. Ce sont les deux constats sur lesquels il n'y a aucun doute.

---

## 7 · Ce que je ferais demain matin

1. **Trancher le SDK 57** (décision A). Tout le lot 2 en dépend, et le lot 2 bloque la vente.
2. **Corriger 02-01** — une ligne, un test. C'est le constat qui dégrade le plus de gens sans que personne ne s'en aperçoive.
3. **Poser les hypothèses de coûts fixes** — une saisie, et le volet business de l'étape 10 se calcule.
4. **Remplir les deux formulaires** depuis `09-BROUILLON-FORMULAIRES.md`, **après** les trois décisions listées dans sa section C.

Le reste attend sans dommage.
