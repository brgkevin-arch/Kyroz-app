# Kyroz — Proposition de monétisation freemium

> Statut : **proposition à valider** (décision produit non tranchée — CLAUDE.md §1).
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

| Capacité | Gratuit | **Kyroz+** (payant) |
|---|---|---|
| Génération plan 7 j macro-précis | ✅ | ✅ |
| Recettes + macros + courses + garde-manger | ✅ | ✅ |
| Favoris + streak + rappel quotidien | ✅ | ✅ |
| Régénérer / remplacer un repas | ✅ (illimité) | ✅ |
| **Historique des plans** (semaines passées) | semaine en cours | ✅ illimité |
| **Recettes personnalisées** (ajouter les siennes) | — | ✅ |
| **Base de recettes étendue** (validées) | 50 | ✅ +100 |
| **Ajustement auto des macros au poids** (check-in hebdo, recalcul TDEE/macros à mesure que le poids évolue — algorithme, *pas* un coach IA) | — | ✅ |
| **Export liste de courses** (PDF / impression / Notes) | — | ✅ |
| **Modes objectifs avancés** (jours de recharge, carb cycling) | — | ✅ |

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
- Le schéma Supabase a déjà `profiles.stripe_customer_id` → prêt pour Stripe.
- Recommandation technique : **RevenueCat** (gère App Store / Play Store + Stripe,
  reçus, restauration d'achat) plutôt que Stripe seul sur mobile.
- Garde-fou : un flag `is_premium` (dérivé de l'abonnement) gate les features
  avancées côté app ; le gratuit reste fonctionnel hors-ligne sans vérification.

## Décisions à trancher (toi)
1. Valides-tu le découpage gratuit / Kyroz+ ci-dessus ?
2. La feature « ajustement auto des macros au poids » est la plus différenciante
   mais demande un **log de poids** (nouvel écran). On la garde en tête de liste ?
3. Tarif 4,99 €/mois — ok, ou tu vises plus haut/bas ?
