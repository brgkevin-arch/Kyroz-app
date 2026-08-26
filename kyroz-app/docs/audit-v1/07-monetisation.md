# Audit V1 — Étape 7 : Monétisation & entitlement
Date : 2026-08-26 · Commit audité : `d095397` · Périmètre : `lib/premium.ts` (295 l.), `lib/purchases.ts`, `lib/purchases.web.ts`, `hooks/usePremium.ts`, `app/kyroz-plus.tsx`, les trois écrans porteurs d'un verrou, `MONETISATION.md`, `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md`
**Entitlement 3 états : ⚠️ le produit n'en a pas trois, il en a quatre — et aucun ne s'appelle `trial`.** Voir « Hors périmètre ».

> Audit, pas fix. Aucun fichier de code modifié. `npm run check:abonnements` a été **exécuté** (lecture seule, API App Store Connect).
> Issu de `docs/audit-v1/briefs/07-monetisation.md`.

## Reste à couvrir

- [x] confrontation du brief au document de stratégie **vivant** (`MONETISATION.md`)
- [x] A. décisions → code
- [x] B. source de vérité de l'entitlement
- [x] C. résilience (hors ligne, `getOfferings` en échec, remote config)
- [x] D. paywall — exigences Apple 3.1.2
- [x] E. les deux paliers de SKU
- [x] F. identité RevenueCat
- [x] G. transitions
- [x] H. matrice de gating par écran
- [x] I. Android
- [x] état réel des produits chez Apple (`check:abonnements`)

## A. Décision → code

⚠️ **Trois des sept décisions du brief sont périmées.** Elles sont confrontées ci-dessous au **document vivant** (`MONETISATION.md`), pas seulement au code — c'est la seule façon de ne pas transformer une évolution de stratégie en faux constat.

| Décision (brief) | Statut | `fichier:ligne` | Écart |
|---|---|---|---|
| Freemium | ✅ implémentée | `lib/premium.ts:34` | — |
| **Essai 14 jours sans carte, après le premier plan** | 🔴 **absente — et la décision a été REMPLACÉE** | — | Aucun essai n'existe : ni état, ni horodatage, ni déclencheur. `grep -riE "essai (gratuit|sans carte)|14 jours|introductory"` sur `lib/`, `app/`, `components/` et `MONETISATION.md` → **rien**. Le modèle retenu, **daté du 2026-07-30 et écrit dans le code**, est le **grand-pérage** : « les comptes existants gardent tout, à vie » (`premium.ts:15`). Ce n'est pas un oubli, c'est un autre choix |
| **Gate temporel : gratuit = 1 jour, Kyroz+ = 7 jours** | 🔴 **contredite par la stratégie vivante** | `MONETISATION.md:41` | Le document vivant écrit : « Le **core loop reste 100 % gratuit** : profil → **plan 7 jours** macro-précis → courses → recettes → réserve → favoris → streak ». Le plan 7 jours est **gratuit pour tout le monde**, et le code le respecte : aucun verrou temporel n'existe |
| **Sécurité et précision (TDEE, macros) toujours gratuits** | ✅ **vérifiée** | — | `grep` des appels d'entitlement dans `app/` et `components/` → **3 fichiers seulement** (`profil.tsx`, `kyroz-plus.tsx`, `WeightCheckin.tsx`). **Aucun verrou n'approche le TDEE, les macros, les planchers ou les avertissements de sécurité.** Le P0 du brief ne s'applique pas |
| Trois états free / trial / plus, source unique | ⚠️ **quatre états, et une source unique** | `premium.ts:53-57` | `not_launched` · `grandfathered` · `entitled` · `locked`. Source unique confirmée : `premiumAccess()` (`:88`), consommé par le seul hook `usePremium()` (`hooks/usePremium.ts:69`). **Pas de checks dispersés** |
| **Abonnement annuel uniquement, deux SKU** | ⚠️ **mensuel ET annuel**, deux paliers | `premium.ts:182-206` | Tarifs tranchés le 2026-08-25 : standard 4,99 €/mois · 39,99 €/an, palier lancement 3,99 € · 29,99 €. Le brief dit « annuel uniquement » ; la stratégie vivante et le code portent **les deux durées** |
| Prix bloqué tant que l'abonnement est actif | ✅ implémentée, et **contractuelle** | `premium.ts:165-170` | Garantie par la **structure** : un palier = des identifiants produits neufs, jamais un prix changé en place. Les CGU §3 le promettent, donc le changer en place serait une rupture de contrat |
| RevenueCat sous-traitant, base légale exécution du contrat | ✅ implémentée | `lib/purchases.ts` | Nommé dans la politique et au registre RGPD depuis la 23ᵉ OTA (étape 1). ⚠️ Le brief ajoute « RevenueCat en **remote config** dès le départ » : **aucune remote config n'est utilisée** — cf. section C |
| Zéro malhonnêteté sur le paywall | ✅ **vérifiée** | `app/kyroz-plus.tsx:262` | Quand un prix vient du repli local, l'écran **le dit** : « Les montants ci-dessus sont les tarifs français. Le prix exact de ton pays… » |

## G. Transitions

| Transition | Comportement observé | `fichier:ligne` | Constat |
|---|---|---|---|
| Paywall pas lancé (aujourd'hui) | `PAYWALL_LAUNCH = null` → `{ allowed: true, reason: 'not_launched' }` pour tout le monde | `premium.ts:34`, `:93` | ✅ rien n'est verrouillé |
| Compte antérieur au lancement | `grandfathered` → accès à vie, avec une phrase affichée une fois | `premium.ts:78`, `:117` | ✅ |
| Date de création absente / illisible | **rend `true`** (grand-péré) — prudence délibérée et documentée | `premium.ts:75-77` | ✅ se tromper en donnant, jamais en retirant |
| Compte postérieur, sans abonnement | `locked` | `premium.ts:97` | ✅ |
| Abonnement actif | `entitled` via `customerInfo.entitlements.active['premium']` | `purchases.ts:49`, `:134` | ✅ identifiant unique, constante `ENTITLEMENT_ID` |
| **Hors ligne / RevenueCat injoignable** | `purchasesConfigured()` faux ou SDK absent → `identifyUser` rend `false` → `entitled: false` | `purchases.ts:67`, `usePremium.ts:49` | ⚠️ **07-04** |
| Changement de compte sur le même appareil | `usePremium` réagit à `uid` et rappelle `identifyUser(uid)` ; `uid → null` déclenche `logOut()` RevenueCat | `usePremium.ts:52`, `purchases.ts:201` | ✅ l'entitlement de l'ancien ne subsiste pas |
| Restauration | `restore()` → `restorePurchases()`, avec deux messages distincts selon le résultat | `purchases.ts:290`, `kyroz-plus.tsx:135-151` | ✅ |
| Remboursement / fin de période / problème de facturation | **délégués au SDK** : `onEntitlementChange` réémet, aucune logique locale de période de grâce | `purchases.ts:134` | ⚠️ `billingIssueDetectedAt` n'est jamais lu — non testable depuis le dépôt, → checklist humaine |
| Horloge de l'appareil avancée | **sans effet** : le grand-pérage compare deux dates **serveur** (`profiles.created_at`, posée par Postgres) | `premium.ts:19-20`, `:79-83` | ✅ le piège classique est évité par construction |

## H. Gating par écran

| Écran / composant | not_launched | grandfathered | entitled | locked | Check (`fichier:ligne`) | Conforme ? |
|---|---|---|---|---|---|---|
| Objectif daté (éditeur, Profil) | ouvert | ouvert | ouvert | **fermé** → paywall | `app/(tabs)/profil.tsx:301` | ✅ |
| Transformation (photos avant/après) | ouvert | ouvert | ouvert | **fermé** → paywall | `components/WeightCheckin.tsx:69` | ✅ |
| Ligne « Kyroz+ » du menu Profil | visible, libellé selon l'état | idem | idem | idem | `profil.tsx:697` | ✅ |
| **Plan 7 jours, courses, recettes, réserve, favoris, série** | **ouvert** | ouvert | ouvert | **ouvert** | *aucun check* | ✅ core loop gratuit |
| **TDEE, macros, planchers, avertissements de sécurité** | **ouvert** | ouvert | ouvert | **ouvert** | *aucun check* | ✅ **le P0 du brief ne s'applique pas** |
| Pesée (le geste quotidien) | ouvert | ouvert | ouvert | **ouvert** | — | ✅ seule la **comparaison** est vendue, jamais la photo déjà prise (`WeightCheckin.tsx:65`) |

## Constats

### 07-01 Les quatre abonnements sont bloqués chez Apple en « Métadonnées manquantes »
- **Sévérité : P1** — bloque la **mise en vente**, pas la soumission de l'app (le paywall ne verrouille rien tant que `PAYWALL_LAUNCH` est `null`)
- **Preuve** — `npm run check:abonnements`, exécuté contre l'API App Store Connect :
  ```
  ├─ kyroz_plus_yearly         état ⚠️ Métadonnées manquantes · capture 🔴 ABSENTE
  ├─ kyroz_plus_yearly_early   état ⚠️ Métadonnées manquantes · capture 🔴 ABSENTE
  ├─ kyroz_plus_monthly        état ⚠️ Métadonnées manquantes · capture 🔴 ABSENTE
  ├─ kyroz_plus_monthly_early  état ⚠️ Métadonnées manquantes · capture 🔴 ABSENTE
  ✅ Chaque identifiant demandé par le code existe chez Apple.
  ```
- **Ce n'est PAS une découverte, et il faut le dire** : `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md` le porte déjà — ligne 28 (« Capture de review : 🔴 absente | 🔴 absente »), ligne 92 (« la capture bloque *Prêt à soumettre* ») et toute son étape 6. Ce constat **confirme** le playbook par la mesure au lieu de le recopier ; il ne l'augmente pas.
- **Risque** : aucun produit ne peut être soumis tant que la capture manque, donc aucune vente. Et la capture exige un **build natif** montrant le paywall — ce qui rattache cette tâche à la décision de binaire de **04-01** (SDK 57 / Hermes) et **03-03** (`runtimeVersion`).
- **Reco** : la traiter dans le même binaire que ces deux-là. Trois raisons de faire un build, un seul build.
- **Effort : M**

### 07-02 Les identifiants de produits sont écrits dans l'app : changer de palier demande une OTA
- **Sévérité : P2** (le brief prescrit **P1** ; je descends d'un cran et je dis pourquoi)
- **Preuve** : `lib/premium.ts:185` et `:200` portent `kyroz_plus_monthly_early` et `kyroz_plus_yearly_early` en dur, et `fetchStorePrices` (`purchases.ts:237`) interroge `getProducts([ids])` — **jamais `getOfferings()`**. Le palier standard n'apparaît nulle part dans le code, alors que `check:abonnements` montre que ses deux produits **existent déjà** chez Apple.
- **Pourquoi P2 et non P1** : ce n'est pas un oubli, c'est un mécanisme **documenté avec son chemin de bascule** (`premium.ts:172-176`) — « Le jour du retrait de l'offre de lancement, on bascule les deux `storeProductId` […]. C'est du JavaScript, donc ça part en **OTA**, sans nouvelle revue ». Le brief présumait un blocage nécessitant une mise à jour du store ; la réalité est une OTA.
- **Ce qui reste vrai, et qui est le vrai risque** : entre le retrait du palier chez Apple et l'arrivée de l'OTA **au deuxième lancement** (`fallbackToCacheTimeout: 0`), l'app demande un produit qui ne se vend plus. `getProducts` ne le trouve pas, `fetchStorePrices` rend `{}` **silencieusement** (`purchases.ts:249`), et l'écran affiche les tarifs de repli en les annonçant comme tels. L'achat, lui, rend « indisponible ». Le fichier documente d'ailleurs que **quatre identifiants faux ont déjà échoué en silence** de cette manière.
- **Reco** : publier l'OTA **avant** de retirer le palier chez Apple, jamais l'inverse. Ou lire l'offering courant, ce qui supprime la fenêtre — au prix d'un aller-retour réseau au chargement du paywall.
- **Effort : S** (l'ordre des gestes) · **M** (passer aux offerings)

### 07-03 Hors ligne, un abonné payant est traité comme non abonné
- **Sévérité : P2** (le brief prescrit **P1** « payant bloqué » ; l'impact réel est aujourd'hui **nul**, et le sera partiellement demain)
- **Preuve** : `usePremium` pose `setEntitled(false)` **avant** d'interroger le SDK (`hooks/usePremium.ts:51`) et sort tôt si `purchasesConfigured()` est faux (`:49`). Aucun cache local de l'entitlement n'existe dans le dépôt : `grep -r "entitlement" ` ne trouve aucune écriture AsyncStorage. Le seul cache est **celui du SDK RevenueCat**, qui n'est pas interrogé quand la configuration échoue.
- **Pourquoi P2 aujourd'hui** : `PAYWALL_LAUNCH` est `null`, donc `premiumAccess` rend `allowed: true` **avant même de regarder `entitled`** (`premium.ts:93`). Personne ne peut être bloqué. Le défaut est **dormant**, réveillé le jour où une date est posée.
- **Pourquoi il ne sera jamais un P1 complet non plus** : le défaut à `false` est le **bon sens de l'erreur** pour un produit — il n'offre jamais le premium à quelqu'un qui ne paie pas. Ce qu'il coûte, c'est une feature temporairement indisponible à un abonné hors ligne, sur un écran qui n'est pas le core loop.
- **Reco** : au moment de poser la date, mémoriser le dernier `entitled` connu et s'en servir tant que le SDK n'a pas répondu. À traiter **avec** la pose de `PAYWALL_LAUNCH`, pas avant.
- **Effort : S**

### 07-04 `PREMIUM_PRICES_ARE_LOCAL_FALLBACK` est exportée et n'est lue nulle part
- **Sévérité : P3**
- **Preuve** : `lib/premium.ts:141` — `export const PREMIUM_PRICES_ARE_LOCAL_FALLBACK = true;`. `grep -rn` sur tout le dépôt (hors `node_modules`) → **une seule occurrence, sa déclaration**.
- **Ce qui fait le travail à sa place, et le fait bien** : `withStorePrices` (`premium.ts:215-231`) calcule un drapeau `fallback` **dynamique** — vrai dès qu'une seule formule affiche encore un prix local. C'est lui que l'écran consomme.
- **Risque** : une constante figée à `true` qui porte le nom exact d'une question à laquelle le code répond dynamiquement. Le jour où quelqu'un l'importe en croyant lire l'état réel, elle dira toujours « repli », même quand le store a répondu.
- **Reco** : la retirer.
- **Effort : S**

### 07-05 Aucune remote config, alors que la stratégie en prévoyait une « dès le départ »
- **Sévérité : P3**
- **Preuve** : le brief pose « RevenueCat en remote config dès le départ ». Aucun paramètre distant n'existe : les prix de repli, les identifiants produits et la portée du gate (`PREMIUM_FEATURES`, `premium.ts:48`) sont tous **embarqués**. Aucun appel à une configuration distante dans `lib/purchases.ts`.
- **Pourquoi P3 et non P1** : la question du brief est « quelle valeur par défaut embarquée quand le distant est indisponible ? » — or **tout** est embarqué, donc il n'existe aucun cas où une valeur manque. Le défaut que la règle vise (un paramètre distant sans repli) est structurellement impossible ici.
- **Ce qui le remplace** : l'OTA. Chaque paramètre est modifiable en quelques minutes sans revue, ce qui couvre le besoin réel — au prix de la fenêtre décrite en **07-02**.
- **Reco** : acter par écrit que l'OTA tient lieu de remote config, ou implémenter la remote config. Ne pas laisser la stratégie annoncer une chose et le code en faire une autre.
- **Effort : S** (acter) · **L** (implémenter)

## Checklist humaine

- [ ] **Bac à sable iOS + testeurs Play** : achat, restauration sur second appareil, annulation, expiration accélérée, remboursement depuis le dashboard RevenueCat, problème de facturation (`billingIssueDetectedAt` n'est lu nulle part dans le code — seul un test réel dira ce que l'app fait alors).
- [ ] **Identifiant d'entitlement `premium`** (`purchases.ts:49`) identique côté dashboard RevenueCat, et les quatre produits rattachés à l'offering courant.
- [ ] **Captures de review** pour les quatre abonnements — c'est **07-01**, et c'est l'étape 6 de la procédure de mise en vente.
- [ ] **Paywall relu contre Apple 3.1.2 sur capture réelle** (petit iPhone, Dynamic Type élevé) : les mentions sont présentes dans le code, leur **lisibilité** ne se vérifie qu'à l'écran — d'autant que l'étape 5 a montré six paires de contraste en échec sur le thème clair.
- [ ] **Version de Play Billing** exigée vs `react-native-purchases@10.6.0` (cf. étape 3 ; `npm outdated` indique 10.8.0 disponible).
- [ ] **Horloge avancée d'un an** : le grand-pérage compare deux dates serveur, donc il ne devrait rien changer — à confirmer sur appareil.

## Hors périmètre / non couvert

🔴 **TROIS DES SEPT DÉCISIONS DU BRIEF SONT PÉRIMÉES.** Comme à l'étape 2, le défaut est dans la spec, pas dans le produit — et les auditer à la lettre aurait produit trois faux constats, dont un P0 :

1. **« Essai Kyroz+ de 14 jours sans carte »** — n'existe nulle part, et **n'est plus la stratégie**. Le modèle retenu, daté du 2026-07-30 et argumenté dans le code (`premium.ts:14-20`), est le **grand-pérage** : les comptes créés avant le lancement gardent tout à vie, ancrés sur `profiles.created_at`, une date **serveur**. Toute la section B du brief (« flag local seul = P1 », « horodatage client = P1 ») porte sur un mécanisme qui n'a pas été construit — et le mécanisme qui l'a remplacé évite précisément ces deux pièges par construction.
2. **« Gratuit = 1 jour de plan, Kyroz+ = 7 jours »** — **contredit par le document vivant**. `MONETISATION.md:41` : « le core loop reste 100 % gratuit : profil → **plan 7 jours** macro-précis → courses → recettes → réserve → favoris → streak », avec le North Star pour raison. Auditer contre le brief aurait fait écrire « feature gratuite gatée » là où c'est l'inverse.
3. **« Abonnement annuel uniquement »** — le tarif tranché le 2026-08-25 porte **mensuel et annuel**, sur deux paliers.

⚠️ **Et une décision du brief est SATISFAITE par un autre chemin** : « trois états, matrice de gating en source unique ». Il y en a **quatre** (`not_launched`, `grandfathered`, `entitled`, `locked`), mais la propriété qui compte — **une source unique** — est tenue : `premiumAccess()` est la seule fonction de verdict, `usePremium()` le seul hook, et seuls **trois fichiers** de l'app interrogent l'entitlement. Le P1 « checks dispersés » ne s'applique pas.

**Non couvert, à assumer :**
- **`lib/purchases.web.ts`** n'a pas été instruit : le web n'encaisse pas (`purchasesConfigured()` rend faux sur web par construction, `purchases.ts:67`).
- **Android** (section I) : `react-native-purchases@10.6.0` est partagé, le code d'achat et de restauration est **identique** — mais la clé `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` est **absente des trois environnements EAS** (constat **01-07**), donc `purchasesConfigured()` est faux sur Android et aucun bouton d'achat n'est rendu. Les textes du paywall nomment le store dynamiquement (`kyroz-plus.tsx:122`, variable `store`), donc aucune mention « App Store » ne s'affichera sur Android.
- **PostHog dans le flux d'achat** : le brief demande de signaler tout `capture`. Il n'y en a **aucun** dans `app/kyroz-plus.tsx` ni `lib/purchases.ts` — et de toute façon `capture()` sort en premier depuis l'extinction du 2026-08-26 (étape 1). Rien à transmettre à l'étape 8.
- **Le contenu contractuel des CGU** (ce que Kyroz+ contient, énuméré et publié) : c'est l'étape 9. Ce constat note seulement que `premium.ts:43-45` **prévient** que toucher à `PREMIUM_FEATURES` oblige à repasser sur les CGU.
- **Les montants eux-mêmes** : tranchés le 2026-08-25, hors périmètre d'audit.
