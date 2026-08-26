# Audit V1 — Étape 8 : Analytics & consentement
Date : 2026-08-26 · Commit audité : `e6dda33` · Périmètre : `lib/analytics.ts`, `lib/featureFlags.ts`, `hooks/useAnalyticsConsent.ts`, `components/AnalyticsConsentStep.tsx`, `components/ReglagesSheet.tsx`, les 16 points d'appel, les deux tests de garde, la spec du 2026-08-10, `RGPD-REGISTRE.md`
**§4.1 : tranché — mais dans l'autre sens que le brief ne le suppose.** **Instrumentation : ÉTEINTE le 2026-08-26.**

> ⚠️ **Étape re-cadrée, et c'est le premier constat.** Sa condition de lancement — « instrumentation PostHog en place » — n'est plus satisfiable : la mesure d'audience a été éteinte le 2026-08-26, publiée dans la 24ᵉ OTA. Auditer un flux qui n'existe pas aurait produit une page de « non applicable ».
> Ce qui est audité à la place : **l'extinction est-elle complète**, le périmètre dormant est-il sain, et que promettent encore les textes.
> Issu de `docs/audit-v1/briefs/08-analytics.md`.

## Reste à couvrir

- [x] re-cadrage : confronter la condition de lancement à l'état réel
- [x] A. consentement — mécanisme, défaut, retrait, timing, texte
- [x] B. initialisation et autocapture
- [x] C. événements — conformité à la spec
- [x] D. retrait du consentement — file d'attente, `reset()`
- [x] E. suppression ciblée — l'UUID est-il affichable
- [x] F. prod et debug
- [x] complétude de l'extinction (les quatre surfaces)
- [x] correction des constats antérieurs que cette mesure invalide

## Chemin init → consentement → premier événement

Il n'y en a pas, et c'est mesurable en trois lignes.

```
capture(event, props)                                   lib/analytics.ts:166
  └─ if (!STATISTIQUES_USAGE_ACTIVES) return;           :173   ← ① garde d'extinction, EN TÊTE
  └─ if (consent !== 'granted') return;                 :175   ← ② consentement RGPD
  └─ if (!POSTHOG_KEY) { … return; }                    :178   ← ③ clé absente → dormant
  └─ fetch(`${POSTHOG_HOST}/capture/`)                  :184   ← jamais atteint
```

**Trois remparts indépendants, dans le bon ordre.** Le premier passe **avant** la lecture du consentement, et le commentaire dit pourquoi : « tant que les statistiques sont coupées, un "oui" donné en août ne fait rien partir ». C'est le point qui compte pour un binaire déjà installé.

**Il n'y a aucune initialisation de SDK à auditer.** `package.json` ne contient **aucun paquet PostHog** : `lib/analytics.ts:184` fait un `fetch` direct. Toute la section B du brief — `PostHogProvider`, `autocapture`, `captureScreens`, `captureTouches`, `captureAppLifecycleEvents`, `enableSessionReplay`, `preloadFeatureFlags`, surveys, error tracking — porte sur des mécanismes **qui n'existent pas dans ce projet**. Il n'y a pas d'autocapture à désactiver : il n'y a pas d'autocapture.

| Contrôle du brief | Mesure | Verdict |
|---|---|---|
| Appel réseau avant consentement = **P0** | trois gardes en amont du `fetch`, et un **test qui mesure l'absence d'appel** (`extinctionStatistiques.test.ts:75`) | ✅ |
| Événement automatique non prévu = **P1** | aucun mécanisme automatique n'existe | ✅ |
| Host US ou absent = **P0** | `POSTHOG_HOST = 'https://eu.i.posthog.com'` (`:36`), en dur | ✅ **EU** |
| `identify(supabaseUserId)` ou `alias(` = **P0** | **aucun appel** ; seul un commentaire les interdit (`:24`) | ✅ |
| Session replay / surveys / flags actifs sans décision = **P1** | aucun SDK, donc aucune de ces surfaces | ✅ |
| `distinct_id` = UUID appareil | `@kyroz:analyticsId`, lu par `pseudonymeExistant()` qui **ne le crée pas** | ✅ |
| Défaut consenti = **P0** | défaut = **non consenti** ; et depuis l'extinction, **aucun pseudonyme n'est créé du tout** (`extinctionStatistiques.test.ts:84`) | ✅ |
| Propriété portant une donnée de santé ou d'identité = **P0** | **compté par un test** : `analyticsPerimetre.test.ts:98` | ✅ |
| `debug` en prod, clé `phx_` | aucun `debug`, aucune clé personnelle (étape 1, section B) | ✅ |

## C. Événements

Le dépôt **compte ses propres événements** — c'est `analyticsPerimetre.test.ts`, exécuté pour cet audit (14 assertions vertes, avec `extinctionStatistiques.test.ts`) :

| Ce que le test garde | Ligne |
|---|---|
| aucune propriété d'event ne porte un nom de donnée de santé ou d'identité | `:98` |
| aucune valeur d'event n'est lue directement sur le profil | `:119` |
| **les 15 events sont ceux qui ont été arbitrés — ni plus, ni moins** | `:132` |
| tout event envoyé existe dans la table `Events` | `:156` |
| **« l'instrument sait dire OUI »** — témoin positif de la sonde | `:175` |

⚠️ **Le brief annonce 13 événements ; il y en a 15**, et l'écart est documenté : deux événements de diagnostic (`meal_swapped`, `recipe_disliked`) ont été ajoutés après la rédaction du brief. **C'est le test qui fait foi, pas le document** — il est le seul des deux à être exécuté.

🟢 **La dernière assertion mérite d'être signalée pour elle-même.** Un test nommé « l'instrument sait dire OUI » est un **témoin positif** : il prouve que la sonde est capable de détecter une violation, donc qu'un résultat vert veut dire quelque chose. C'est exactement le contrôle qui manquait à plusieurs sondes trouvées ailleurs dans cet audit (la sonde des cibles tactiles qui s'arrêtait sur une flèche, la regex `xit\(` de l'étape 4). Ici, il est écrit.

## Constats

### 08-01 Tout le périmètre dort dans le bundle, à un booléen de repartir
- **Sévérité : P2**
- **Preuve** : l'extinction ne supprime rien, elle **garde**. Restent dans le bundle livré : les **15 événements** et leur table (`lib/analytics.ts:212`), les **16 points d'appel** (12 dans `app/(tabs)/plan.tsx`, 4 dans `app/(auth)/onboarding.tsx`), l'**écran de consentement complet** avec ses textes (`components/AnalyticsConsentStep.tsx`), le **bloc Réglages** et la ligne « Supprimer mes statistiques » (`components/ReglagesSheet.tsx:323`, `:350`). Tous sont derrière **la même constante** (`lib/featureFlags.ts:72`).
- **C'est délibéré, et documenté comme tel** : « CE QUI EST ÉTEINT N'EST PAS SUPPRIMÉ […] Repasser une constante à `true` rallume le parcours » (`featureFlags.ts:15`). Le choix est défendable — reconstruire un périmètre arbitré coûte plus cher que le garder.
- **Le risque n'est pas la fuite, c'est le texte** : rien ne part aujourd'hui, mais le jour où quelqu'un repasse la constante à `true`, trois écrans se rallument **et `constants/legal.ts` (« Aucune statistique d'usage n'est collectée ») devient faux au même commit**. C'est le constat **06b-01** de l'étape 6b, atteint par l'autre bout.
- **Reco** : le garde-fou que 6b propose, écrit dans le sens qui manque — un test qui **échoue si `STATISTIQUES_USAGE_ACTIVES` vaut `true` alors que `legal.ts` affirme encore qu'aucune mesure n'a lieu**. `extinctionStatistiques.test.ts` couvre le sens actuel (éteint → les textes se taisent) ; il ne couvre pas le sens inverse. Une assertion à ajouter au fichier qui existe déjà.
- **Effort : S**

### 08-02 La clé retirée d'EAS vit encore dans les binaires installés — seule la garde OTA coupe vraiment
- **Sévérité : P2**
- **Preuve** : `lib/analytics.ts:35` lit toujours `process.env.EXPO_PUBLIC_POSTHOG_KEY`. La variable est **absente des trois environnements EAS** (vérifié à l'étape 1 : `production`, `preview`, `development`), donc les **builds futurs** n'en porteront pas. Mais une `EXPO_PUBLIC_*` est **inlinée à la compilation** : le binaire déjà installé chez les testeurs la contient toujours, en dur.
- **Conséquence exacte** : sur ce parc, `POSTHOG_KEY` est renseignée et le troisième rempart ne joue pas. Ce qui coupe réellement, c'est **la garde publiée en OTA** — le premier `if` de `capture()`. C'est précisément ce que le commentaire du code annonce (`:170-172`), et c'est ce qui rendait l'OTA obligatoire plutôt que facultative.
- **Risque** : nul tant que l'OTA est appliquée. Mais une OTA s'applique **au deuxième lancement** (`fallbackToCacheTimeout: 0`) : entre la publication et le second démarrage, un testeur ayant consenti en août tournait encore sur le code d'avant.
- **Reco** : rien à corriger — c'est le comportement attendu et il a été traité dans le bon ordre (garde d'abord, clé ensuite). À **écrire au registre RGPD** : la date d'arrêt effectif n'est pas celle du merge, ni celle du retrait de la clé, c'est celle du **second lancement** de chaque appareil.
- **Effort : S**

### 08-03 Deux documents de spec annoncent 13 événements, le produit en compte 15
- **Sévérité : P3**
- **Preuve** : `docs/2026-08-10-brief-analytics-perimetre.md` et `docs/2026-08-10-synthese-analytics-arbitrage.md` portent le chiffre 13, repris tel quel par le brief d'audit. `analyticsPerimetre.test.ts:132` compte **15**, et `AGENTS.md` documente l'ajout (« Deux événements de diagnostic — 13 → 15 events »).
- **Risque** : faible, mais c'est la forme d'inventaire qui se confirme tout seul — deux documents d'accord entre eux et périmés tous les deux. Le test, lui, est exécuté.
- **Reco** : dater les deux documents comme archives, ou reporter le chiffre. Ne jamais laisser un document non exécuté porter un compte que le code tient.
- **Effort : S**

### 08-04 🔧 Correction d'un constat antérieur : 01-03 et 06b-02 reposaient sur une prémisse fausse
- **Sévérité : correction, pas constat**
- **Ce qui avait été écrit** :
  - **01-03** (étape 1) : « `AsyncStorage.clear()` efface `@kyroz:analyticsId` — le pseudonyme est détruit avant d'avoir pu servir. […] Concerne les comptes ayant consenti entre le 2026-08-18 et l'extinction. »
  - **06b-02** (étape 6b) : « un bouton distinct "Supprimer mes statistiques" ne se justifie que si la suppression du compte ne les efface pas. »
- **Ce que la mesure dit** : les deux raisonnements supposent qu'il **reste des mesures à supprimer chez PostHog**. Il n'en reste aucune. `RGPD-REGISTRE.md:73` : « données déjà collectées **supprimées à la source**, côté tableau de bord PostHog », pour un traitement qui « a duré **huit jours** » et n'a concerné que l'appareil du fondateur et un testeur. Et la ligne « Supprimer mes statistiques » **ne se rend plus** — elle est derrière `STATISTIQUES_USAGE_ACTIVES && pseudonyme` (`ReglagesSheet.tsx:350`), donc doublement inerte.
- **Ce qui reste vrai de 01-03** : RevenueCat n'est pas supprimé à la suppression de compte, et la phrase « toutes tes données » reste inexacte de ce fait. **La branche PostHog du constat tombe.**
- 🟢 **Et le dépôt avait vu venir le piège** : le test qui garde cette ligne porte un commentaire disant que l'assertion **avait été écrite à l'envers le matin même**, parce que « un droit à l'effacement ne se retire pas tant qu'il a un objet » — et que c'est la suppression **à la source** qui l'a rendue sans objet, pas l'extinction de la collecte. « Les deux sont des faits différents, et seul le premier autorise ce test-ci. » C'est exactement la distinction que 01-03 et 06b-02 avaient manquée, tous les deux.

## Checklist humaine

Les trois contrôles du brief, **re-cadrés sur l'extinction** :

- [ ] **Sur appareil, via proxy** : **zéro** requête vers `*.posthog.com`, à tout moment — plus seulement « avant acceptation ». C'est la seule mesure qui vaille sur un binaire déjà installé, et elle doit être faite sur un appareil **ayant consenti en août**, pas sur une installation neuve.
- [ ] **Dashboard PostHog** : confirmer que le projet ne reçoit plus rien, et que les données des huit jours sont bien supprimées (le registre l'affirme ; seul le tableau de bord le prouve).
- [ ] ~~Un événement réel comparé propriété par propriété à la spec~~ — **sans objet** : aucun événement ne part.
- [ ] **Le jour d'un éventuel rallumage** : reprendre l'étape 8 dans sa forme d'origine. Ce document ne dit rien de la conformité du flux, il dit qu'il n'y en a pas.

## Hors périmètre / non couvert

🔴 **LA CONDITION DE LANCEMENT DE CETTE ÉTAPE ÉTAIT PÉRIMÉE**, et c'est le quatrième brief de cet audit dans ce cas (après les étapes 2 et 7). Le plan exigeait « §4.1 tranché **+ instrumentation PostHog en place** ». Le §4.1 est bien tranché — mais dans le sens de l'**arrêt**, décidé le 2026-08-26 et publié le jour même. Attendre que la condition soit remplie aurait fait attendre indéfiniment ; l'auditer à la lettre aurait produit une page de « non applicable » sans rien vérifier.

⚠️ **Le brief porte aussi deux valeurs périmées** : « conservation **18 mois** » (l'arbitrage du 2026-08-18 a retiré cette borne, cf. partie I.A de l'étape 6b — la promesse tenue est « au moins un an, sans limite haute fixe ») et « **13** événements » (constat 08-03).

**Non couvert, à assumer :**
- **La conformité du flux de mesure lui-même** — ordre des propriétés, bucketing, nommage, cohérence des 15 événements avec les questions auxquelles ils répondent. Rien de tout cela ne se vérifie sur un flux éteint autrement qu'en relisant la table, ce que `analyticsPerimetre.test.ts` fait déjà mieux que moi : il la **compte**, à chaque exécution.
- **La file d'attente au retrait du consentement** (section D) : `lib/analytics.ts` n'a **ni file, ni `flushAt`, ni `flushInterval`** — chaque `capture()` est un `fetch` immédiat, ou rien. Il n'existe donc aucun événement en attente susceptible de partir après un retrait. Le P1 que le brief prévoit est structurellement impossible.
- **`reset()` au sign-out** : aucun `reset()` n'existe, et il n'a plus d'objet — aucun pseudonyme n'est créé, et `AsyncStorage.clear()` emporte l'existant.
- **Le dashboard PostHog** (région, rétention, IP discard, replay) : hors dépôt, en checklist humaine — inchangé par rapport au brief.
- **L'étape 9** héritera de ceci : les textes légaux, le registre et le code **s'accordent aujourd'hui** pour dire qu'aucune mesure n'a lieu. C'est le seul des quatre chantiers légaux de cet audit où les trois surfaces disent la même chose.
