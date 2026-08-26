# Audit V1 — Étape 10 : Listing, ASO, business, ops — **PARTIEL**
Date : 2026-08-26 · Commit audité : `98a6335` · Fait ici : **la vérification des allégations de la fiche contre le code**. Reste à Claude.ai : ASO, business, ops.

> 🟡 **Partiel, et le découpage est délibéré.** L'étape 10 juge des mots-clés, un positionnement et un
> modèle économique — c'est du jugement, et c'est le travail de Claude.ai. Mais elle ne peut pas vérifier
> si la fiche **dit vrai**, parce que ça demande le code.
>
> ➡️ Même renversement qu'à l'étape 9 : je fais d'abord le tiers que je suis seul à pouvoir faire, et je
> lui passe le reste avec les faits établis. **Le document de la fiche l'écrit lui-même** : « Un chiffre
> faux dans une fiche de store est une **allégation fausse**, pas une coquille. »

## Reste à couvrir

- [x] localiser la fiche store — elle **existe** dans le dépôt (`STORE-RELEASE.md:547-644`), extraite en `10-fiche-store.md`
- [x] **vérifier chaque allégation de la fiche contre le code**
- [x] préparer les pièces pour Claude.ai
- [ ] ASO — mots-clés, nom, sous-titre, concurrence — attend Claude.ai
- [ ] business — modèle, coûts fixes, seuil de rentabilité — attend les hypothèses de coûts du fondateur
- [ ] ops — support, avis, mises à jour — attend Claude.ai

## Les allégations de la fiche, vérifiées une par une

| # | Allégation | Verdict **mesuré** | Preuve |
|---|---|---|---|
| 1 | « **512 recettes** » | ✅ **exact** | `require('./Recette/recettes-kyroz.json').recipes.length` → **512** |
| 2 | « adaptées à ton régime (végétarien, vegan, sans gluten, sans lactose, sans porc, halal, pescétarien) » | ✅ **exact, les sept** | `DietaryRestriction` (`lib/types.ts:197-204`) — `vegetarian`, `pescatarian`, `no_pork`, `lactose_free`, `gluten_free`, `vegan`, `halal` |
| 3 | « Liste de courses (**qui déduit ce que tu as déjà**) » | ✅ **vrai** | `app/(tabs)/courses.tsx:131-132` charge la réserve et la passe à `buildShoppingList(plan, pantry)`, qui la **soustrait** (`lib/shoppingList.ts:9`, `:48`) |
| 4 | « Plan 7 jours généré automatiquement » | ✅ vrai | `buildLocalPlan`, et le plan 7 jours est **gratuit** (étape 7) |
| 5 | « Quantités ajustées automatiquement pour tomber sur tes macros » | ✅ vrai | `rebalanceDay` (`lib/planEngine.ts:1681`), `adaptDayOptions` |
| 6 | « Suivi de série pour tenir le rythme » | ✅ vrai | `lib/streak.ts`, `hooks/useStreak.ts` |
| 7 | « **100 % gratuit sur le cœur** » | ✅ vrai | `PREMIUM_FEATURES = ['dated_goal', 'transformation']` — rien d'autre n'est verrouillé (étape 7) |
| 8 | « fonctionne **hors-ligne** » | ✅ vrai | moteur 100 % local, plan généré sans réseau, écritures mises en file (`markProfileDirty`) — mesuré à l'étape 5 |
| 9 | « **"Recale ma journée"** : un imprévu, un repas sauté ? » | ⚠️ **le comportement existe, le NOM n'existe pas** | Aucun libellé « Recale ma journée » dans l'app. La seule occurrence proche est « Chaque pesée recale ton plan », qui parle d'autre chose. Le rééquilibrage est réel mais **anonyme** |
| 10 | « Gratuit, **sans compte requis pour démarrer** » | 🔴 **FAUX EN PRODUCTION** | constat **10-01** |

## Constats

### 10-01 « Sans compte requis pour démarrer » est faux en production — et le relecteur ne peut pas s'en apercevoir
- **Sévérité : P1**
- **Preuve** : le **texte promotionnel Apple** (`10-fiche-store.md`, champ « Texte promotionnel », 170 car.) affirme :
  > « Ton plan de repas hebdo, précis au gramme, adapté à ton objectif et ton sport. **Gratuit, sans compte requis pour démarrer.** »

  Or le bouton « Continuer en invité » est enveloppé dans `{__DEV__ && (` (`app/(auth)/login.tsx:264`). Le commentaire juste au-dessus le dit sans ambiguïté : « **Masquée en** […] **masse — cf. audit sécu). `__DEV__` = vrai en dev, faux après** [build] ». **En production, aucun utilisateur ne peut démarrer sans créer un compte** — et la création exige une confirmation d'e-mail.
- **Le pire détail** : le **relecteur Apple, lui, entrera sans compte** — via `EXPO_PUBLIC_REVIEW_CODE` (`lib/reviewAccess.ts:25`), qui lui ouvre précisément une session invité. Il lira donc l'allégation, la vérifiera, et la trouvera **vraie pour lui seul**. La fiche passerait la revue en disant faux à tout le monde d'autre.
- **Risque** : allégation inexacte dans les métadonnées d'un store (Apple 2.3 « Accurate Metadata »), et une promesse commerciale fausse au sens du droit de la consommation. C'est aussi le premier motif d'avis négatif : quelqu'un qui télécharge pour « essayer sans compte » se heurte à un mur d'inscription.
- **Reco** : deux issues, aucune n'est un compromis.
  1. **Corriger le texte** — retirer « sans compte requis pour démarrer ». Coût : cinq minutes, et on perd un argument réel.
  2. **Rendre l'allégation vraie** — rouvrir l'accès invité en production. ⚠️ Ce serait rouvrir la décision de sécurité qui l'a fermé (création anonyme en masse), **et** cela croiserait le constat **09-05** : un invité obtient une ligne `profiles` avec un `created_at`, donc le grand-pérage devient farmable à l'échelle.
  ➡️ **Retirer la phrase**, et traiter le mode invité comme le chantier qu'il est (09-05).
- **Effort : S** (option 1) · **L** (option 2)

### 10-02 « Recale ma journée » est présenté comme une fonctionnalité nommée, entre guillemets
- **Sévérité : P3**
- **Preuve** : la description met le nom **entre guillemets** — « **"Recale ma journée"** : un imprévu, un repas sauté ? Le plan se réajuste » — ce qui le désigne comme un libellé du produit. `grep -rniE "recale|rééquilibr|réajust"` sur `app/(tabs)/plan.tsx` et `components/` ne rend qu'une phrase, sur un autre sujet : « Chaque pesée recale ton plan. »
- **Le comportement existe** (`rebalanceDay`, appelé « à chaque *j'ai mangé* »), il n'a simplement **pas ce nom** — ni aucun autre.
- **Risque** : faible, mais un relecteur ou un utilisateur qui cherche « Recale ma journée » dans l'app ne le trouvera pas. Et c'est le genre d'écart qui se creuse : la fiche invente un vocabulaire que le produit ne porte pas.
- **Reco** : soit nommer la fonction dans l'app, soit décrire le comportement sans guillemets.
- **Effort : S**

### 10-03 Les textes de la fiche ne sont versionnés nulle part de comparable
- **Sévérité : P2** (c'est le constat **03-08**, vu depuis l'autre bout)
- **Preuve** : pas de `store.config.json`. Les textes vivent dans une **section d'un document de 74 Ko** (`STORE-RELEASE.md:547-644`), et rien ne les compare à ce qui est réellement saisi dans les consoles.
- **Ce qui rend le risque concret, et c'est écrit dans la fiche elle-même** : le nombre de recettes **a déjà dérivé deux fois** — annoncé 314 pour un catalogue de 466, puis 466 pour 512. L'avertissement « à revérifier après CHAQUE vague » **était déjà écrit la première fois, et n'a pas suffi**.
- ✅ **Aujourd'hui il est juste** : re-mesuré pour cet audit, **512 = 512**.
- **Reco** : ce qui a marché ailleurs dans ce dépôt, c'est le **compteur**, pas l'avertissement — `check:ota`, `check:abonnements`, `analyticsPerimetre`. Un `check:fiche` qui compare le nombre annoncé au catalogue réel coûte dix lignes et supprime définitivement cette dérive-là.
- **Effort : S**

## Pièces pour Claude.ai

| # | Pièce | État |
|---|---|---|
| 1 | `docs/audit-v1/10-fiche-store.md` | ✅ **extraite** — nom, sous-titre, texte promotionnel, description, description courte Play, mots-clés, avec les notes ASO déjà présentes |
| 2 | `docs/audit-v1/07-monetisation.md` | ✅ prête — tarifs tranchés, deux paliers, état des quatre abonnements chez Apple |
| 3 | `docs/audit-v1/10-listing-business-ops.md` | ✅ ce document — les dix allégations déjà vérifiées, pour qu'elle ne les redéduise pas |
| 4 | **Hypothèses de coûts fixes** | 🔴 **manquantes — seul le fondateur les a** |

### Ce qu'il faut pour la partie business — et que le dépôt ne contient pas

L'étape 10 doit calculer un seuil de rentabilité. Elle a besoin de chiffres qui ne sont écrits nulle part :

- **Apple Developer Program** (99 $/an) et **Google Play** (25 $ une fois) — montants publics, mais à confirmer comme engagés
- **Supabase** — palier actuel et à quel volume il bascule
- **EAS / Expo** — palier de build
- **RevenueCat** — gratuit sous un seuil de revenu, à confirmer
- **Nom de domaine, e-mail transactionnel (Resend)** — paliers
- **Adhésion médiateur de la consommation** — à budgéter dès la première vente (constat **09-04**)
- **Temps fondateur** — s'il entre dans le calcul

⚠️ Avec les tarifs tranchés (**3,99 € / 29,99 €** en lancement, **4,99 € / 39,99 €** ensuite) et la commission des stores — **15 %** au Small Business Program, acquis (`STORE-RELEASE.md`, PR #169) —, le seuil se calcule dès que les coûts fixes sont posés. C'est **une seule saisie**, et elle débloque toute la partie business.

## Checklist humaine

- [ ] 🔴 **Poser les hypothèses de coûts fixes** — c'est la seule chose qui manque à la partie business.
- [ ] **Trancher le nom Apple** : la fiche recommande `Kyroz — Plan repas & macros` (27 car.) contre `Kyroz` seul, en notant que **25 des 30 caractères ne portent aucun terme de recherche**. Le document dit explicitement que c'est une **décision de marque, pas technique**, et qu'elle n'a pas été appliquée faute d'arbitrage.
- [ ] **Comparer la fiche versionnée à ce qui est réellement saisi** dans les deux consoles — rien ne le fait aujourd'hui (10-03).
- [ ] **Re-mesurer le nombre de recettes après chaque vague de catalogue**, ou poser le compteur (10-03).

## Hors périmètre / non couvert

- **Tout le jugement ASO** : pertinence des mots-clés, concurrence sur « rééquilibrage alimentaire », arbitrage du nom, ordre des puces de la description. C'est le travail de Claude.ai, et la fiche porte déjà ses propres notes de mesure (mots-clés à **exactement 100/100 caractères**, sans marge).
- **Le positionnement produit et le modèle économique** : hors de ce que le code peut dire.
- **Les captures d'écran de la fiche** (5 iPhone, iPad 13", feature graphic Play) : `npm run store:assets` existe et les génère ; leur **contenu** se juge à l'œil.
- **Les avis et le support** : `app/avis.tsx` existe et son texte a été jugé exemplaire à l'étape 6b (« Rien d'autre — ni ton poids, ni ton objectif, ni tes plans »). Les processus, eux, sont hors dépôt.
