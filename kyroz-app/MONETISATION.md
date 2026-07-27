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
> - **« Base étendue : 50 → +100 »** → sans objet : le catalogue est à **264 recettes**,
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
| ~~Base de recettes étendue (50 / +100)~~ | ✅ 264 | — | ⚠️ **sans objet** (264 recettes, gratuites) |
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

## Implémentation — paywall (prochain chantier CODE)

> **▶ La valeur premium est construite (Kyroz+ livré + déployé) ; le paywall reste à coder.**
> C'est le seul morceau monétisation encore en code. Ordre respecté : (1) valeur tranchée →
> (2) construite ✅ → (3) paiement = maintenant.

- **Canal de paiement TRANCHÉ (fondateur) : achat in-app via les stores** — **Apple App Store
  (In-App Purchase) + Google Play (Billing)**. On passe par **RevenueCat**, qui emballe les
  deux stores (reçus + restauration d'achat + entitlements). ⚠️ **Pas de Stripe seul sur
  mobile** : Apple/Google le refusent pour les abonnements numériques (motif de rejet).
- À faire au câblage : ajouter le SDK `react-native-purchases`, créer les produits
  d'abonnement (mensuel + annuel) dans **App Store Connect** ET **Play Console**.
- **Gating** : un flag `is_premium` (dérivé de l'**entitlement** RevenueCat) verrouille les
  features Kyroz+ ; le gratuit reste fonctionnel hors-ligne sans vérification.
- `profiles.stripe_customer_id` (schéma) = vestige — RevenueCat porte l'entitlement ; à
  garder ou renommer au moment du câblage (non bloquant).

## Décisions TRANCHÉES (2026-07-27) — plus rien en attente côté produit

1. **Valeur premium** = Kyroz+ « piloter son objectif dans le temps » (objectif daté +
   trajectoire + transformation) — **construite + déployée** (+ banque de calories à venir).
2. **Les 4 features déjà livrées restent GRATUITES** (carb cycling, recalc macros au poids,
   recettes perso, catalogue 264) : les reprendre casserait la confiance et le North Star.
3. **Paiement = achat in-app Apple App Store + Google Play, via RevenueCat** (pas Stripe seul).
4. **Tarif** = 4,99 €/mois · 39,99 €/an (ajustable au moment du câblage, mais c'est le plan retenu).

→ Reste UNIQUEMENT à **coder** : le **paywall** (RevenueCat + `is_premium`) et la **banque de
calories**. Plus aucune décision produit en suspens.
