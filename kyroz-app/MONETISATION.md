# Kyroz — Proposition de monétisation freemium

> ## ✅ TRANCHÉ + CONSTRUIT (2026-07-27) — la valeur premium existe
> La question ouverte de ce doc (« que construit-on qui vaille 5 € ? ») est **répondue
> et LIVRÉE + DÉPLOYÉE** (`5a4fc63`). **Kyroz+ = « piloter son objectif dans le temps »**,
> en 3 piliers (cf. AGENTS.md, session Kyroz+ 2026-07-27) :
> 1. **🎯 Objectif daté** — poids cible + date → trajectoire calorique au rythme le plus
>    rapide mais sûr (le « coffre » : le gratuit donne les clés, le premium le contenu).
> 2. **📈 Trajectoire + réassurance** — zone ombrée sur la courbe (pas une ligne à suivre :
>    anti-charge-mentale), verdict jamais alarmant, « Kyroz réajuste tes calories tout seul ».
> 3. **📸 Transformation** — photos avant/après (local-only).
>
> **Restent à faire** (prochaine session dédiée) : la **banque de calories** (4ᵉ pilier, le
> fidélisant — touche le moteur) + le **paywall**. **Paiement TRANCHÉ = achat in-app via les
> stores (Apple App Store + Google Play), emballé par RevenueCat** — PAS Stripe seul (les
> stores refusent Stripe pour les abos numériques). Puis **gating `is_premium`** (la feature
> est fonctionnelle mais GRATUITE tant que le paywall n'est pas câblé).
> **Tarif** : 4,99 €/mois · 39,99 €/an. Le reste du doc ci-dessous = archive de la réflexion.

> Statut historique : **proposition à valider** (décision produit non tranchée — CLAUDE.md §1).
> Rien n'est codé : ce doc sert à trancher le découpage gratuit / payant avant
> toute implémentation de paywall.

## Principe directeur (non négociable)

Le **core loop reste 100 % gratuit, sans clé API** : profil → plan 7 jours
macro-précis → courses → recettes → garde-manger → favoris → **streak**.

Conséquence directe sur le **North Star** (% d'utilisateurs à 7 jours consécutifs
dans les 14 premiers jours) : **le paywall ne doit JAMAIS bloquer la fenêtre des
14 premiers jours ni le geste quotidien**. On ne monétise que des features de
confort/puissance qui arrivent *après* que l'habitude est prise. Monétiser le
core tuerait le North Star — donc interdit.

## Découpage recommandé

> ## ⚠️ CE DÉCOUPAGE A VIEILLI — à relire avant de décider (constaté 2026-07-14)
>
> Ce doc a été écrit quand ces features n'existaient pas. Depuis, **elles ont été
> construites et livrées GRATUITEMENT**. Les remettre derrière un paywall
> reviendrait à **retirer aux utilisateurs ce qu'ils ont déjà** — le plus sûr moyen
> de casser la confiance et le North Star. À traiter comme acquis-gratuit :
>
> - **Carb cycling / jours de repos** → livré (`rest_weekdays`, moteur v5+).
> - **Ajustement des macros au poids** → livré (`recalcProfile` + check-in poids).
> - **Recettes personnalisées** → livré (`RecipeEditor` + table `recipe_overrides`).
> - **« Base étendue : 50 → +100 »** → sans objet : le catalogue est à **466 recettes**
>   (314 quand cette ligne a été écrite), toutes gratuites. Le rationner *a posteriori*
>   serait une régression — et l'écart entre les deux chiffres montre à quel point
>   l'argument s'est renforcé depuis.
>
> **Restent réellement monétisables** (non construits) : historique des plans,
> export de la liste de courses, et tout ce qui reste à inventer.
> **La vraie question n'est donc plus « que bloquer ? » mais « que CONSTRUIRE qui
> vaille 5 € ? »** — le catalogue gratuit est déjà généreux.

| Capacité | Gratuit | **Kyroz+** (payant) | État réel |
|---|---|---|---|
| Génération plan 7 j macro-précis | ✅ | ✅ | livré |
| Recettes + macros + courses + garde-manger | ✅ | ✅ | livré |
| Favoris + streak + rappel quotidien | ✅ | ✅ | livré |
| Régénérer / remplacer un repas | ✅ (illimité) | ✅ | livré |
| **Historique des plans** (semaines passées) | semaine en cours | ✅ illimité | **non construit** → monétisable |
| **Export liste de courses** (PDF / impression / Notes) | — | ✅ | **non construit** → monétisable |
| ~~Recettes personnalisées~~ | ✅ | — | ⚠️ **déjà livré gratuit** |
| ~~Base de recettes étendue (50 / +100)~~ | ✅ 466 | — | ⚠️ **sans objet** (466 recettes, gratuites) |
| ~~Ajustement auto des macros au poids~~ | ✅ | — | ⚠️ **déjà livré gratuit** |
| ~~Modes objectifs avancés (carb cycling)~~ | ✅ | — | ⚠️ **déjà livré gratuit** |

### Ce qu'on NE met PAS derrière le paywall (et pourquoi)
- **Sync cloud multi-appareils** : déjà construite et perçue comme un dû ; la
  bloquer punirait la réinstallation et casserait la confiance. Gratuit.
- **Le streak et le rappel** : ce sont les moteurs du North Star. Gratuits.
- **Le 1er plan et la fenêtre 14 j** : intouchables.

## Tarif recommandé (marché FR, cible hommes et femmes 18–50)

- **4,99 €/mois** ou **39,99 €/an** (−33 %, ancre la formule annuelle).
- **Essai** : pas d'essai chronométré agressif. Le gratuit EST l'essai (freemium
  large). Kyroz+ se déclenche sur l'intention (clic sur une feature avancée).
- Pas de pub, pas de revente de données (RGPD — données de santé, spec §7).

## Implémentation du paywall — plan de câblage (prochain chantier CODE)

> **▶ La valeur premium est construite ET le paiement est câblé (2026-08-02). Il reste des étapes de COMPTES, un build natif et une revue — plus une ligne de code.**
> Ordre respecté : (1) valeur tranchée → (2) construite ✅ → (3) paywall = ce chantier.
> Canal **TRANCHÉ** : achat in-app **Apple App Store (IAP) + Google Play (Billing)** via
> **RevenueCat** (pas de Stripe seul — refusé par les stores). Bosser sur `feature/paywall`.
> ⚠️ **Revalider la doc RevenueCat/Apple à jour au moment du câblage** (les exigences bougent) —
> ce plan donne la trame, pas les appels d'API figés.

> ⚠️ **ÉTAT AU 2026-08-02 — les sections B, C et D sont LIVRÉES.** Ce plan datait d'avant
> le câblage ; il ne restait plus qu'à cocher, ce qui ne se voyait pas. Détail, mesures et
> pièges : `AGENTS.md` B2. Ce qui reste ouvert est **hors code** (comptes, build, revue).

### A. Prérequis externes (fondateur — comptes & produits, AVANT le code)
- [x] **App Store Connect** — ✅ **fait le 2026-07-30** : Paid Applications Agreement ACTIF,
      groupe d'abonnement **Kyroz+** et les 2 produits auto-renouvelables créés et tarifés,
      `kyroz_plus_monthly` (4,99 €) et `kyroz_plus_yearly` (39,99 € d'avance **ou 3,99 €/mois**).
      Reste la capture de review (impossible avant que le paywall existe) → produits en
      « Métadonnées manquantes », ce qui n'empêche ni RevenueCat ni le bac à sable.
      ⚠️ **`kyroz_plus_yearly`, pas `_annual`** : le code s'était trompé, cf. AGENTS.md B2.
- [ ] **Google Play Console** : créer l'abonnement `kyroz_plus` avec 2 *base plans* (mensuel / annuel), mêmes prix.
- [ ] **RevenueCat — état INCONNU au 2026-08-02** : créer le projet, rattacher l'app iOS + Android,
      mapper les produits store → **1 entitlement `premium`** + **1 offering** (packages
      mensuel/annuel). Récupérer les **clés SDK publiques** (iOS `appl_…`, Android `goog_…`) —
      publiques, OK inlinées (comme la clé PostHog).
      ⚠️ Le dépôt ne peut pas dire si c'est fait (aucune clé posée n'est nécessaire avant le
      build). **Seul le dashboard fait foi.**

### B. Intégration SDK (code) — ✅ LIVRÉE le 2026-08-02
- [x] `react-native-purchases` **v10.6.0** installé. ⚠️ Module **natif** → build EAS / dev
      client obligatoire (ni Expo Go, ni OTA).
- [x] Init **paresseuse et idempotente** dans `lib/purchases.ts::configurePurchases()`, pas au
      démarrage dans `app/_layout.tsx` — **écart assumé** : sans clé, le SDK n'est même pas
      chargé, donc l'app ne paie rien pour une feature qui n'est pas ouverte.
      Clés en `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` (cf. `.env.example`).
- [x] **Web = no-op**, mais par **séparation de plateforme** (`lib/purchases.web.ts`) et non
      par une garde `Platform.OS !== 'web'`. ⚠️ **La garde ne suffisait PAS** : mesuré sur
      l'export, le SDK restait embarqué dans le bundle web (**+900 Ko**) parce que Metro
      analyse les `require` statiquement. Avec le fichier `.web.ts` : **+1,4 Ko** et zéro
      occurrence. Piège consigné dans `CLAUDE.md` §11.

### C. Entitlement / gating (`is_premium`)
- [x] ✅ Hook `usePremium()` : lit `entitlements.active['premium']` + écoute
      `addCustomerInfoUpdateListener` (sinon un achat ne se verrait qu'au prochain lancement).
      **Source de vérité = RevenueCat** (le SDK cache le dernier état → marche hors-ligne).
      Aucun flag local bricolé. Expose `{ allowed, reason, entitled, notice, can }` — plus
      riche que le `{ isPremium, loading }` prévu ici, parce que le verrou distingue quatre
      états (`not_launched`, `grandfathered`, `entitled`, `locked`).
- [x] ✅ **L'abonnement est rattaché au COMPTE, pas à l'appareil** — corrigé le 2026-08-02,
      `lib/purchases.ts::identifyUser()`. Le SDK était configuré **sans identifiant** : il
      travaillait donc sur un utilisateur ANONYME, propre au téléphone. Deux dégâts
      symétriques — la personne suivante sur un appareil partagé héritait de l'abonnement
      (rien ne le retirait à la déconnexion), et la même personne sur son second appareil
      restait `locked`. L'ancre est l'**UUID Supabase**, celui qui porte déjà `created_at`
      donc le grand-père. Jamais l'e-mail : cet identifiant part chez RevenueCat.
- [ ] (Optionnel, plus tard) miroir `profiles.is_premium` via **webhook RevenueCat → Edge
      Function** pour l'analytique serveur. PAS requis pour le gating client.
- [ ] 🧾 **RGPD — à trancher avant la mise en vente** : rattacher l'UUID Supabase fait de
      RevenueCat un **sous-traitant** qui conserve un identifiant de compte + un historique
      d'achats. La suppression de compte (Edge Function `delete-account`) n'efface **rien**
      chez eux — l'effacement RevenueCat demande leur clé SECRÈTE, donc du code serveur.
      Deux choses à faire le jour du lancement : citer RevenueCat dans les CGU/politique de
      confidentialité, et décider si `delete-account` doit aussi les appeler.
- [x] ✅ **Ce qu'on verrouille = features Kyroz+ uniquement** : `PREMIUM_FEATURES` =
      `dated_goal` · `transformation` · `calorie_bank` (livrée, plus « à venir »). Le reste
      — core loop, courses, recettes, garde-manger, favoris, série, pesée, synchro — **reste
      libre**, et l'écran l'énumère noir sur blanc.
- [x] ✅ **North Star sacré** : le paywall ne s'ouvre que sur **INTENTION** — un seul point
      d'étranglement, `openEditor()` dans `app/(tabs)/profil.tsx` (ligne 187), plus l'entrée
      explicite du menu Profil. **Aucun appel au lancement**, vérifié : `/kyroz-plus` n'est
      poussé que depuis ces deux endroits.

### D. Paywall (écran) — ✅ LIVRÉ (écran le 2026-08-01, câblage le 2026-08-02)
- [x] `app/kyroz-plus.tsx` : prix **lus du store** (`priceString` localisé) dès qu'ils
      arrivent, sinon repli sur les tarifs français **avec la mention qui le dit**. Achat via
      `purchaseStoreProduct` (et non `purchasePackage` : on cible les produits directement,
      un offering n'est pas nécessaire pour deux formules).
- [x] **Obligatoires Apple** : « Restaurer mes achats » branché, liens CGU + Confidentialité,
      mentions prix / période / renouvellement. ⚠️ La restauration ne sera PROUVÉE qu'en bac
      à sable — sans ça, rejet Guideline 3.1.1.
- [x] États gérés : achat en cours, succès, **annulation traitée comme un cas NORMAL** (aucun
      message), erreur, indisponible. Via `useDialog()` et **jamais `Alert.alert`**, qui est
      une fonction vide sur web (`CLAUDE.md` §11).
- [ ] 🧑 **TROIS formules, pas deux** — Apple porte aussi l'annuel payé au mois (3,99 €/mois,
      engagement 12 mois), que l'écran n'affiche pas. `STORE-RELEASE.md` §4 dit qu'il devrait.
      Décision commerciale, à trancher avant la mise en vente.

### E. Conformité review & tests
- [ ] Le reviewer doit **atteindre le paywall** (via l'accès reviewer existant) → le documenter
      dans les notes de review (§ STORE-RELEASE).
- [ ] **Sandbox** : testeur Sandbox iOS (App Store Connect) + license testers / piste fermée
      Android. Vérifier achat, **restauration**, expiration.

### F. Ordre de bataille
A (comptes/produits) → B (SDK + init web-safe) → C (hook `usePremium` + points de gate) →
D (écran paywall) → E (sandbox + review).
✅ **B, C et D sont faits.** Il reste, dans l'ordre : **RevenueCat** (état inconnu) →
**clés dans le build EAS** → **build natif** → **bac à sable** → **poser `PAYWALL_LAUNCH`**.
⚠️ La date se pose en DERNIER, et elle ne se recule jamais. Sans impact `ENGINE_VERSION` (le moteur n'est touché
que par la banque de calories, chantier séparé). `profiles.stripe_customer_id` = vestige
(RevenueCat porte l'entitlement) : garder ou renommer au câblage, non bloquant.

## Décisions TRANCHÉES (2026-07-27) — plus rien en attente côté produit

1. **Valeur premium** = Kyroz+ « piloter son objectif dans le temps » (objectif daté +
   trajectoire + transformation) — **construite + déployée** (+ banque de calories à venir).
2. **Les 4 features déjà livrées restent GRATUITES** (carb cycling, recalc macros au poids,
   recettes perso, catalogue complet) : les reprendre casserait la confiance et le North Star.
3. **Paiement = achat in-app Apple App Store + Google Play, via RevenueCat** (pas Stripe seul).
4. **Tarif** = 4,99 €/mois · 39,99 €/an (ajustable au moment du câblage, mais c'est le plan retenu).

→ Reste UNIQUEMENT à **coder** : le **paywall** (RevenueCat + `is_premium`) et la **banque de
calories**. Plus aucune décision produit en suspens.
