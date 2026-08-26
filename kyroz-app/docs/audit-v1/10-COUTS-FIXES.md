# 10 · Coûts fixes — ce qui est mesurable, et ce qui ne l'est pas
Date : 2026-08-26. Débloque le volet business de l'étape 10.

## Ce que je peux poser

| Poste | Montant | Source | Confiance |
|---|---|---|---|
| **Apple Developer Program** | **99 $/an** (~92 €) | tarif public Apple | ✅ certain — et le compte existe (app `6796427402`) |
| **Google Play Console** | **25 $ une fois** (~23 €) | tarif public Google | ✅ certain |
| **Small Business Program** | commission **15 %** au lieu de 30 % | acquis, [#169](https://github.com/brgkevin-arch/Kyroz-app/pull/169) | ✅ mesuré, dans le dépôt |
| **RevenueCat** | **0 €** sous 2 500 $ de revenu mensuel suivi | tarification publique | ⚠️ à confirmer au dashboard |
| **EAS (Expo)** | palier non lisible en CLI | `eas account:view` ne rend que l'identité | 🔴 **à confirmer** — le plan gratuit couvre 30 builds/mois, largement suffisant vu l'usage (5 builds depuis juillet) |
| **Supabase** | palier non lisible sans le dashboard | — | 🔴 **à confirmer** — le plan gratuit couvre 50 000 utilisateurs actifs mensuels |
| **Resend** (e-mails) | palier gratuit à 3 000 e-mails/mois | tarification publique | ⚠️ à confirmer |
| **Domaine `kyroz.app`** | ~15 €/an | — | 🔴 **à confirmer** |
| **Médiateur de la consommation** | ~500 à 800 €/an selon l'organisme | obligation dès la première vente, constat **09-04** | 🔴 **à budgéter** |

## Ce que toi seul peux poser

- **Ton temps** — entre-t-il dans le calcul, et à quelle valeur ?
- **Les paliers réels** des quatre lignes marquées 🔴 : trois se lisent en trente secondes dans les dashboards.

## Le calcul, dès que les trous sont comblés

Avec les tarifs tranchés le 2026-08-25 et la commission à 15 % :

| Formule | Prix | **Net Kyroz** (après 15 %) |
|---|---|---|
| Mensuel lancement | 3,99 € | **3,39 €** |
| Annuel lancement | 29,99 € | **25,49 €** |
| Mensuel standard | 4,99 € | **4,24 €** |
| Annuel standard | 39,99 € | **33,99 €** |

⚠️ **Hors TVA** — sur un abonnement vendu en France, Apple et Google collectent et reversent la TVA ; le « net » ci-dessus est ce que la grille du store rend, avant traitement fiscal. `npm run check:abonnements` affiche d'ailleurs la grille Apple à côté du prix affiché, et c'est ce qui a fait corriger le libellé « net » ([#169](https://github.com/brgkevin-arch/Kyroz-app/pull/169)).

**Seuil de rentabilité** = coûts fixes annuels ÷ net annuel par abonné. Avec un plancher grossier de **~115 €/an** (Apple + Play amorti + domaine) et l'annuel de lancement à 25,49 € net : **5 abonnés annuels** couvrent l'infrastructure de base. Avec le médiateur (~650 €), on passe à **~30 abonnés annuels**.

➡️ **Ce chiffre n'a de valeur qu'une fois les quatre lignes 🔴 confirmées.** Il est écrit ici pour montrer que le calcul tient en une ligne dès que les entrées existent — pas pour être cité.
