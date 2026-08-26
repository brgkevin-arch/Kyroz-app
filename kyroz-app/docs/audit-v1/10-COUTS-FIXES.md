# 10 · Coûts fixes — ce qui est mesurable, et ce qui ne l'est pas
Date : 2026-08-26. Débloque le volet business de l'étape 10.

## Ce que je peux poser

| Poste | Montant | Source | Confiance |
|---|---|---|---|
| **Apple Developer Program** | **99 $/an** (~92 €) | tarif public Apple | ✅ certain — et le compte existe (app `6796427402`) |
| **Google Play Console** | **25 $ une fois** (~23 €) | tarif public Google | ✅ certain |
| **Small Business Program** | commission **15 %** au lieu de 30 % | acquis, [#169](https://github.com/brgkevin-arch/Kyroz-app/pull/169) | ✅ mesuré, dans le dépôt |
| **RevenueCat** | **0 €** sous 2 500 $ de revenu mensuel suivi | tarification publique | ⚠️ à confirmer au dashboard |
| **EAS (Expo)** | **0 €** — compte `kevinberger` sur le plan **Free** | ✅ **mesuré** via l'API Expo (`meActor.accounts.subscription`) | ✅ certain. Usage réel : **10 builds en août, 2 en juillet** — le plan Free en couvre 30/mois, la marge est large |
| **Supabase** | **0 €** — plan **Free** | ✅ relevé par le fondateur (2026-08-26) | ✅ certain. Le palier couvre 50 000 utilisateurs actifs mensuels |
| **Resend** (e-mails) | palier gratuit à 3 000 e-mails/mois | tarification publique | ⚠️ à confirmer |
| **Domaine `kyroz.app`** | **~12 €/an** | ✅ relevé par le fondateur (2026-08-26) | ✅ certain |
| **Médiateur de la consommation** | **50 à 200 €/an** | ✅ chiffre **du dépôt** (`PROCEDURE-2026-08-25…md`, étape 9) | ✅ certain — obligation dès la première vente (constat **09-04**) |

## Ce que toi seul peux poser

- **Ton temps** — entre-t-il dans le calcul, et à quelle valeur ?
- ✅ **EAS** : plan Free, mesuré par l'API. Usage réel 10 builds en août contre 30/mois inclus.
- ✅ **Supabase** : plan Free · ✅ **Domaine** : ~12 €/an. Relevés le 2026-08-26.
- ✅ **Médiateur** : 50 à 200 €/an — chiffre déjà établi dans la procédure de mise en vente. Ne mord qu'à la première vente.

➡️ **Le tableau est complet. Plus rien n'attend personne.**

## Le calcul, dès que les trous sont comblés

Avec les tarifs tranchés le 2026-08-25 et la commission à 15 % :

| Formule | Prix | **Net Kyroz** (après 15 %) |
|---|---|---|
| Mensuel lancement | 3,99 € | **3,39 €** |
| Annuel lancement | 29,99 € | **25,49 €** |
| Mensuel standard | 4,99 € | **4,24 €** |
| Annuel standard | 39,99 € | **33,99 €** |

⚠️ **Hors TVA** — sur un abonnement vendu en France, Apple et Google collectent et reversent la TVA ; le « net » ci-dessus est ce que la grille du store rend, avant traitement fiscal. `npm run check:abonnements` affiche d'ailleurs la grille Apple à côté du prix affiché, et c'est ce qui a fait corriger le libellé « net » ([#169](https://github.com/brgkevin-arch/Kyroz-app/pull/169)).

## Le total, maintenant qu'il ne manque plus que le médiateur

| Poste | €/an |
|---|---|
| Apple Developer Program (99 $) | ~92 |
| Google Play (25 $ une fois, amorti sur 3 ans) | ~8 |
| Domaine `kyroz.app` | 12 |
| Supabase · EAS · RevenueCat · Resend | **0** |
| **Total, tant que Kyroz est gratuit** | **~112 €/an** |
| *+ médiateur, dès la première vente* | *+50 à 200* |
| **Total en vente** | **~162 à 312 €/an** |

## Seuil de rentabilité

| Situation | Coûts | Net / abonné annuel | **Abonnés annuels nécessaires** |
|---|---|---|---|
| Aujourd'hui (gratuit) | 112 € | — | — |
| En vente, palier **lancement** (29,99 € → 25,49 € net) | 162 à 312 € | 25,49 € | **7 à 13** |
| En vente, palier **standard** (39,99 € → 33,99 € net) | 162 à 312 € | 33,99 € | **5 à 10** |

⚠️ **Trois réserves, et elles ne sont pas cosmétiques :**
1. **Hors TVA.** Apple et Google collectent et reversent la TVA ; le « net » est ce que rend la grille du store, avant traitement fiscal.
2. 🔧 **Un chiffre corrigé, et le corriger a tout changé.** J'avais avancé **« 500 à 800 €/an »** pour le médiateur **sans le vérifier** — le seuil montait alors à 30 abonnés et ce poste devenait le sujet du tableau. La procédure de mise en vente porte **50 à 200 €**, chiffre déjà établi dans le dépôt. Le seuil retombe à **7 à 13**, et le médiateur cesse d'être dominant. ➡️ **Un chiffre affiché est celui qui sera servi — y compris dans un document d'audit.**
3. **L'ordre de grandeur réel : une dizaine d'abonnés annuels couvre TOUT.** Ce n'est donc pas le seuil de rentabilité qui décide de ce lancement.
4. **Les paliers gratuits tiennent tant que l'échelle reste petite.** Supabase Free plafonne à 50 000 utilisateurs actifs mensuels, EAS Free à 30 builds/mois. Aux volumes où ces plafonds mordent, le seuil de rentabilité n'est plus la question.
