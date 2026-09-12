# Fermer l'accès de revue — avant de publier le (22)

> **Une étape à la fois.** Chaque étape dit ce que tu dois **voir**. Tant que tu ne le
> vois pas, on ne passe pas à la suivante.

**Contexte** : la version 1.0 est `PENDING_DEVELOPER_RELEASE` depuis le 2026-09-12 — Apple
a accepté le build (22), les deux abonnements `_early` sont `APPROVED`. La diffusion est
en `MANUAL` : **rien n'est public tant que tu n'appuies pas sur « Publier »**.

C'est exactement la fenêtre où ce geste doit se faire.

---

## Le problème, en une image

`EXPO_PUBLIC_REVIEW_CODE` est une variable `EXPO_PUBLIC_*` : elle est **inlinée à la
compilation**, donc elle est **dans le binaire**. Une IPA publique se dézippe en deux
minutes. Tant que l'app n'est pas publiée, personne ne peut récupérer cette IPA — après,
tout le monde.

Mais le code, seul, ne fait rien. Voici le seul chemin qu'il ouvre, mesuré dans le code
le 2026-09-12 :

```
signInAnonymously()  ←  guest()  ←  isReviewLogin()   ← LE SEUL CHEMIN en production
                            ↑
              « Continuer en invité » est derrière __DEV__
                    → absent du binaire publié
```

➡️ **Son pouvoir ne vient pas de son secret, il vient de ce que Supabase accepte encore
les connexions anonymes.** Couper cette acceptation rend le code inerte — sans build,
sans nouvelle revue, et réversible d'un clic.

⚠️ **Ce que le risque n'est PAS** : la RLS tient, aucune donnée d'autrui n'est joignable.
Le risque est une **création d'invités non maîtrisée** — le vecteur que l'audit sécu avait
justement fermé en masquant « Continuer en invité ».

---

## ✅ Étape 0 — l'état de départ (à lire, pas à faire)

Cette commande ne crée rien et ne demande aucun droit d'admin : le réglage est public.

```bash
curl -s "$EXPO_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" | grep anonymous_users
```

> **Ce que tu dois voir aujourd'hui** : `"anonymous_users": true`.
> *(Mesuré le 2026-09-12 : `true`, et `"apple": true` au passage.)*

---

## Étape 1 — couper les connexions anonymes  🧑 À FAIRE

**Avant de publier**, pas après.

1. Dashboard Supabase → le projet `rgdjsdnqlmfkourrhijv`.
2. **Authentication → Sign In / Providers → Anonymous Sign-Ins**.
3. **Désactiver**, puis enregistrer.

> **Ce que tu dois voir** : la même commande qu'à l'étape 0 rend maintenant
> `"anonymous_users": false`.

À partir de cet instant, le code extrait du (22) ne donne plus rien : `isReviewLogin`
renvoie toujours `true` côté app, mais `signInAnonymously()` est refusé par le serveur.
**C'est le serveur qui décide, pas le binaire** — et c'est ce qui rend le geste immédiat.

⚠️ **Ne supprime pas la variable EAS.** Elle ne coûte rien à laisser en place et tu en
auras besoin ; c'est sa VALEUR qui devra changer, pas son existence. Cf. étape 3.

---

## Étape 2 — publier quand tu veux

La date de lancement est **hors de cette procédure** : elle t'appartient et elle est
suivie dans `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md` (son étape 10).

Le jour où tu publies, un seul geste s'ajoute, et il est daté depuis longtemps :
**installer depuis l'App Store avec un compte français et lire la devise affichée.**

ℹ️ **La configuration, elle, est déjà vérifiée** (2026-09-12, par l'API) :

| Territoire | `monthly_early` | `yearly_early` |
|---|---|---|
| 🇫🇷 France | **EUR 3,99** | **EUR 29,99** |
| 🇧🇪 Belgique | EUR 3,99 | EUR 29,99 |
| 🇨🇭 Suisse | CHF 3,00 | CHF 20,00 |
| 🇺🇸 États-Unis | USD 3,99 | USD 24,99 |

Les dollars vus en TestFlight venaient donc de la **région du compte StoreKit**, pas du
produit. Le contrôle du jour J confirme un runtime, il ne cherche plus un défaut.

⚠️ **Publier puis « repasser en privé » n'est pas un aller-retour de cinq minutes.**
*Pricing and Availability* → retirer de tous les territoires est réversible et ne
redemande pas de revue, mais la propagation prend des **heures dans les deux sens**.
➡️ Préférer : publier, **ne rien annoncer** quelques heures, vérifier, puis annoncer.

---

## Étape 3 — à la PROCHAINE soumission (pas maintenant)

Le mécanisme reste : l'app a un mur de connexion et l'inscription demande une
confirmation e-mail, donc **tout relecteur aura toujours besoin d'un accès de démo**.
Ce qui change, c'est que le secret ne vit plus que le temps d'une revue.

| Quand | Geste |
|---|---|
| **Avant** de builder pour une soumission | rallumer *Anonymous Sign-Ins* **et** poser une valeur NEUVE : `eas env:update --variable-name EXPO_PUBLIC_REVIEW_CODE --value "<aléatoire long>" --environment production --visibility sensitive` |
| Reporter le code dans les notes de revue | App Review Information → Sign-In required (`review@kyroz.app` + le nouveau code) |
| **Après** l'approbation | recouper *Anonymous Sign-Ins* — retour à l'étape 1 |

🔴 **Le code doit changer à CHAQUE soumission.** Une fois un binaire public, sa valeur est
publique : la réutiliser reviendrait à laisser une serrure dont la clé est en vitrine.
🔴 **Et un build est obligatoire** pour qu'un code neuf entre dans l'app — une OTA ne
remplace pas une variable inlinée à la compilation.

➡️ **Ce que ça ne remplace pas** : le mécanisme **daté et chiffré** décidé de longue date
(mémoire « Compte invité : après la revue »), qui ferait expirer l'accès tout seul au lieu
de dépendre de deux gestes qu'on doit se rappeler. L'interrupteur Supabase est la
version *robuste et gratuite* de cette idée — il déplace la décision du binaire vers le
serveur — mais il reste un geste manuel.

---

## Pourquoi ce document existe

`STORE-RELEASE.md` §9 disait déjà quoi faire après la revue : `eas env:delete` **puis un
nouveau build**. C'est vrai, mais ça coûte un binaire et une revue — assez cher pour
qu'on le remette à plus tard, et « plus tard » ne vient jamais.

La mesure du 2026-09-12 a montré qu'il existe un geste **à coût nul** qui obtient le même
résultat, parce que le vrai verrou n'était pas là où le document le cherchait.
*Un accès de revue qu'on n'a pas prévu de refermer ne se referme jamais — sauf si le
refermer coûte un clic.*
