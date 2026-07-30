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
> - **« Base étendue : 50 → +100 »** → sans objet : le catalogue est à **314 recettes**,
>   toutes gratuites. Le rationner *a posteriori* serait une régression.
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
| ~~Base de recettes étendue (50 / +100)~~ | ✅ 314 | — | ⚠️ **sans objet** (314 recettes, gratuites) |
| ~~Ajustement auto des macros au poids~~ | ✅ | — | ⚠️ **déjà livré gratuit** |
| ~~Modes objectifs avancés (carb cycling)~~ | ✅ | — | ⚠️ **déjà livré gratuit** |

### Ce qu'on NE met PAS derrière le paywall (et pourquoi)
- **Sync cloud multi-appareils** : déjà construite et perçue comme un dû ; la
  bloquer punirait la réinstallation et casserait la confiance. Gratuit.
- **Le streak et le rappel** : ce sont les moteurs du North Star. Gratuits.
- **Le 1er plan et la fenêtre 14 j** : intouchables.

## Tarif recommandé (marché FR, cible hommes 18–35)

- **4,99 €/mois** ou **39,99 €/an** (−33 %, ancre la formule annuelle).
- **Essai** : pas d'essai chronométré agressif. Le gratuit EST l'essai (freemium
  large). Kyroz+ se déclenche sur l'intention (clic sur une feature avancée).
- Pas de pub, pas de revente de données (RGPD — données de santé, spec §7).

## Implémentation du paywall — plan de câblage (prochain chantier CODE)

> **▶ La valeur premium est construite (Kyroz+ livré + déployé) ; il reste à câbler le paiement.**
> Ordre respecté : (1) valeur tranchée → (2) construite ✅ → (3) paywall = ce chantier.
> Canal **TRANCHÉ** : achat in-app **Apple App Store (IAP) + Google Play (Billing)** via
> **RevenueCat** (pas de Stripe seul — refusé par les stores). Bosser sur `feature/paywall`.
> ⚠️ **Revalider la doc RevenueCat/Apple à jour au moment du câblage** (les exigences bougent) —
> ce plan donne la trame, pas les appels d'API figés.

### A. Prérequis externes (fondateur — comptes & produits, AVANT le code)
- [ ] **App Store Connect** : accepter le *Paid Applications Agreement* (coordonnées bancaires
      + fiscales). Créer un **groupe d'abonnement** + 2 produits auto-renouvelables :
      `kyroz_plus_monthly` (4,99 €) et `kyroz_plus_yearly` (39,99 €), infos localisées + capture review.
- [ ] **Google Play Console** : créer l'abonnement `kyroz_plus` avec 2 *base plans* (mensuel / annuel), mêmes prix.
- [ ] **RevenueCat** : créer le projet, rattacher l'app iOS + Android, mapper les produits store
      → **1 entitlement `premium`** + **1 offering** (packages mensuel/annuel). Récupérer les
      **clés SDK publiques** (iOS `appl_…`, Android `goog_…`) — publiques, OK inlinées (comme la clé PostHog).

### B. Intégration SDK (code)
- [ ] `npx expo install react-native-purchases` (+ config plugin). ⚠️ Module **natif** →
      nécessite un **build EAS / dev client** (pas Expo Go ; l'app build déjà via `eas.json`).
- [ ] Init au démarrage (`app/_layout.tsx`), **natif seulement** : `Purchases.configure({ apiKey })`
      avec la clé selon `Platform.OS`. Clés en `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`.
- [ ] **Web (GitHub Pages) = no-op** : `react-native-purchases` ne supporte pas le web → garder
      derrière `Platform.OS !== 'web'` (même pattern que `notifications`). Sur web, `isPremium=false`
      et le CTA d'achat renvoie « dispo sur l'app mobile » (ne jamais casser le web).

### C. Entitlement / gating (`is_premium`)
- [ ] Hook `usePremium()` : lit `customerInfo.entitlements.active['premium']` + écoute
      `addCustomerInfoUpdateListener`. Expose `{ isPremium, loading }`. **Source de vérité =
      RevenueCat** (le SDK cache le dernier état → marche hors-ligne). Pas de flag local bricolé.
- [ ] (Optionnel, plus tard) miroir `profiles.is_premium` via **webhook RevenueCat → Edge
      Function** pour l'analytique serveur. PAS requis pour le gating client.
- [ ] **Ce qu'on verrouille = features Kyroz+ uniquement** : **Objectif daté** (`GoalTarget`,
      `DatedGoalCard`), **Trajectoire / Transformation** (`components/Transformation.tsx`), +
      **banque de calories** (à venir). Le reste (core loop + les 4 features déjà gratuites) **reste libre**.
- [ ] **North Star sacré** : le paywall se déclenche **SUR INTENTION** (tap sur une feature
      Kyroz+), **JAMAIS** au lancement, ni pendant la fenêtre 14 j, ni sur le geste quotidien.

### D. Paywall (écran)
- [ ] Composant `Paywall` : prix **lus depuis l'offering** RevenueCat (`priceString` localisé —
      ne PAS coder « 4,99 € » en dur), choix mensuel/annuel, achat via `Purchases.purchasePackage()`.
- [ ] **Obligatoires Apple** : bouton **« Restaurer mes achats »** (`restorePurchases()`), liens
      **CGU + Confidentialité** (déjà `/legal`), mention claire prix / période / renouvellement.
- [ ] États gérés : achat en cours, succès (déverrouille), annulation, erreur, déjà abonné.

### E. Conformité review & tests
- [ ] Le reviewer doit **atteindre le paywall** (via l'accès reviewer existant) → le documenter
      dans les notes de review (§ STORE-RELEASE).
- [ ] **Sandbox** : testeur Sandbox iOS (App Store Connect) + license testers / piste fermée
      Android. Vérifier achat, **restauration**, expiration.

### F. Ordre de bataille
A (comptes/produits) → B (SDK + init web-safe) → C (hook `usePremium` + points de gate) →
D (écran paywall) → E (sandbox + review). Sans impact `ENGINE_VERSION` (le moteur n'est touché
que par la banque de calories, chantier séparé). `profiles.stripe_customer_id` = vestige
(RevenueCat porte l'entitlement) : garder ou renommer au câblage, non bloquant.

## Décisions TRANCHÉES (2026-07-27) — plus rien en attente côté produit

1. **Valeur premium** = Kyroz+ « piloter son objectif dans le temps » (objectif daté +
   trajectoire + transformation) — **construite + déployée** (+ banque de calories à venir).
2. **Les 4 features déjà livrées restent GRATUITES** (carb cycling, recalc macros au poids,
   recettes perso, catalogue 314) : les reprendre casserait la confiance et le North Star.
3. **Paiement = achat in-app Apple App Store + Google Play, via RevenueCat** (pas Stripe seul).
4. **Tarif** = 4,99 €/mois · 39,99 €/an (ajustable au moment du câblage, mais c'est le plan retenu).

→ Reste UNIQUEMENT à **coder** : le **paywall** (RevenueCat + `is_premium`) et la **banque de
calories**. Plus aucune décision produit en suspens.
