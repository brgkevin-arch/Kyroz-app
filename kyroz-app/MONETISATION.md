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
> fidélisant — touche le moteur) + le **paiement RevenueCat** et le **gating `is_premium`**
> (la feature est fonctionnelle mais GRATUITE tant que le paiement n'est pas câblé).
> **Tarif reco** : 4,99 €/mois · 39,99 €/an. Le reste du doc ci-dessous = archive de la
> réflexion qui a mené à cette décision.

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

## Implémentation (à ne lancer qu'APRÈS validation du découpage)

> **▶ Prévu en session dédiée (« faire les Stripe », fondateur, 2026-07-17).**
> ⚠️ Ne PAS coder le paiement avant d'avoir répondu au **point 2 ci-dessous**
> (« que construit-on qui vaille 5 € ? »). Brancher Stripe/RevenueCat sur un
> paywall vide = plomberie pour rien. L'ordre : (1) décider la valeur premium →
> (2) la construire → (3) alors seulement le paiement.

- Le schéma Supabase a déjà `profiles.stripe_customer_id` → prêt pour Stripe.
- Recommandation technique : **RevenueCat** (gère App Store / Play Store + Stripe,
  reçus, restauration d'achat) plutôt que Stripe seul sur mobile.
- Garde-fou : un flag `is_premium` (dérivé de l'abonnement) gate les features
  avancées côté app ; le gratuit reste fonctionnel hors-ligne sans vérification.

## Décisions à trancher (toi) — mises à jour 2026-07-14

1. **Acceptes-tu que les 4 features barrées ci-dessus restent gratuites ?**
   (Recommandé : oui. Elles sont livrées ; les reprendre coûterait plus cher en
   confiance que ce qu'elles rapporteraient.)
2. **Que construit-on qui vaille 5 € ?** Le paywall n'a plus que 2 candidats déjà
   identifiés (historique des plans, export courses) et aucun n'est un « waouh ».
   C'est la vraie question ouverte : sans réponse, il n'y a pas de Kyroz+.
3. **Tarif** 4,99 €/mois — ok, ou tu vises plus haut/bas ? (À ne trancher qu'une
   fois le point 2 résolu : le prix découle de la valeur, pas l'inverse.)
