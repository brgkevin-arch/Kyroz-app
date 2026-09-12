# Fermer l'accès de revue — ✅ FAIT le 2026-09-12 (mais après la publication)

> **Une étape à la fois.** Chaque étape dit ce que tu dois **voir**. Tant que tu ne le
> vois pas, on ne passe pas à la suivante.

**Contexte** : Apple a accepté le build (22) le 2026-09-12, les deux abonnements `_early`
sont `APPROVED`. Ce document a été écrit pour la fenêtre `PENDING_DEVELOPER_RELEASE`, où
rien n'est encore public.

> 🟠 **L'ORDRE A ÉTÉ INVERSÉ, ET C'EST LA VÉRITÉ DE CE DOSSIER.** Le fondateur a publié
> **à 13 h 33** pendant que ce document s'écrivait, donc **avant** l'étape 1. L'interrupteur
> a été coupé derrière, et vérifié `false` à **14 h 16**.
> ➡️ **Fenêtre d'exposition : 43 minutes au plus**, sans annonce. Pour en profiter il
> fallait télécharger l'app, extraire l'IPA, y trouver la chaîne et s'en servir dans ce
> créneau. Risque réel proche de zéro — mais **pas nul**, et c'est pour ça qu'il reste un
> contrôle : cf. « Ce qui reste à vérifier » plus bas.
> ⚠️ **La leçon n'est pas « il a mal fait »**, c'est que ce geste tenait à une course
> entre une publication et un document. Un garde-fou qui dépend de l'ordre dans lequel
> deux personnes agissent le même après-midi n'est pas un garde-fou.

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

> **Ce que tu dois voir avant l'étape 1** : `"anonymous_users": true`.
> *(Mesuré le 2026-09-12 à 13 h 38 : `true`, et `"apple": true` au passage.)*

---

## ✅ Étape 1 — couper les connexions anonymes (fait le 2026-09-12)

En principe **avant de publier**. Ici, 43 minutes après — cf. l'encadré du haut.

1. Dashboard Supabase → le projet `rgdjsdnqlmfkourrhijv`.
2. **Authentication → Sign In / Providers → Anonymous Sign-Ins**.
3. **Désactiver**, puis enregistrer.

> **Ce que tu dois voir** : la même commande qu'à l'étape 0 rend maintenant
> `"anonymous_users": false`.
> ✅ **Vérifié le 2026-09-12 à 14 h 16** : `anonymous_users: false`, et `apple: true`,
> `email: true` — les deux fournisseurs dont les vrais utilisateurs dépendent sont
> intacts. Rien n'est cassé : en production, aucun parcours légitime ne passait par
> l'auth anonyme.

À partir de cet instant, le code extrait du (22) ne donne plus rien : `isReviewLogin`
renvoie toujours `true` côté app, mais `signInAnonymously()` est refusé par le serveur.
**C'est le serveur qui décide, pas le binaire** — et c'est ce qui rend le geste immédiat.

⚠️ **Ne supprime pas la variable EAS.** Elle ne coûte rien à laisser en place et tu en
auras besoin ; c'est sa VALEUR qui devra changer, pas son existence. Cf. étape 3.

---

## ✅ Étape 2 — publié le 2026-09-12 à 13 h 33

**Kyroz est en ligne.** Version 1.0 · `READY_FOR_SALE` · build (22) ·
https://apps.apple.com/fr/app/kyroz/id6796427402 · fiche FR en **EUR**, « Gratuit »
(les abonnements sont des achats intégrés).

La date de lancement était **hors de cette procédure** : elle appartient au fondateur et
elle est suivie dans `PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md` (son étape 10).

✅ **LE GESTE ATTENDU DEPUIS LE 2026-08-28 EST FAIT — LA DEVISE EST EN EUROS.** App
installée depuis l'App Store, *Profil → Kyroz+*, lue par le fondateur le 2026-09-12. Le
dossier des dollars est **clos** : c'était bien la vitrine du bac à sable de StoreKit, et
rien d'autre.

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

## ✅ La fenêtre était vide — et le stock a été purgé (2026-09-12)

**Aucun compte anonyme n'est né dans les 43 minutes.** Prouvé deux fois, et la seconde
preuve est la plus forte : le compte anonyme **le plus récent de toute la base** datait du
**2026-09-10**, deux jours avant l'ouverture. Ce n'est pas « je n'en vois pas », c'est
« le dernier est antérieur ».

🟢 **Et le stock est parti avec.** La question « d'où viennent 207 comptes pour 17
actifs ? » a ouvert la mesure, qui a rendu une partition sans ambiguïté — **190 anonymes,
tous sans e-mail *et* sans provider ; 17 réels, tous avec les deux** — puis la purge :
190 comptes, 189 profils, **162 pesées**, 1 favori. Les six tables portent
`on delete cascade`, donc aucun orphelin. Reste **17**.
➡️ C'est le point **`S-03`** de `docs/2026-08-29-audit-supabase.md`, ouvert depuis le
2026-08-29 : **robinet fermé et bassin vidé le même jour.**

⚠️ **Couper le provider ne supprime pas les comptes déjà créés** — c'est une porte fermée,
pas une expulsion. C'est bien pour ça qu'il a fallu les deux gestes, et que fermer sans
vider aurait laissé les données de santé en place.
🔴 **Et l'étape 3 rouvre le robinet le temps de chaque revue** : quelques comptes invités
renaîtront à chaque soumission. Il n'existe toujours aucune purge automatique — c'est un
geste à la main, à refaire après chaque cycle.

---

## Étape 3 — à la PROCHAINE soumission (pas maintenant)

**Le problème qu'elle résout, en une phrase** : l'interrupteur est coupé, donc à la
prochaine version que tu enverras, **le relecteur d'Apple sera bloqué** — il ne pourra pas
entrer, et l'app sera rejetée pour ça. Il faudra rouvrir.

🔴 **Mais rouvrir en gardant le MÊME code annulerait tout ce qui vient d'être fait.** Le
(22) est public : sa valeur est extractible aujourd'hui, demain, dans un an. Aujourd'hui
la clé est en vitrine et la serrure est débranchée ; rebrancher **la même** serrure, c'est
rouvrir la porte à tous ceux qui ont ramassé la clé entre-temps.

Le mécanisme, lui, reste : l'app a un mur de connexion et l'inscription demande une
confirmation e-mail, donc **tout relecteur aura toujours besoin d'un accès de démo**.
Ce qui change, c'est que le secret ne vit plus que le temps d'une revue.

| Ordre | Geste | Où |
|---|---|---|
| 1 | Rallumer *Anonymous Sign-Ins* | Supabase |
| 2 | Poser une valeur **NEUVE** : `eas env:update --variable-name EXPO_PUBLIC_REVIEW_CODE --value "<aléatoire long>" --environment production --visibility sensitive` | EAS, env `production` |
| 3 | **Builder** | EAS |
| 4 | Reporter le nouveau code dans les notes de revue (`review@kyroz.app` + la valeur) | App Store Connect → App Review Information → Sign-In required |
| 5 | Soumettre | App Store Connect |
| 6 | Une fois **approuvé** : recouper *Anonymous Sign-Ins* | Supabase — retour à l'étape 1 |

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

Et la preuve par l'usage est arrivée le jour même, à l'envers : le point traînait depuis
le **2026-09-03** marqué 🔴 PRIORITAIRE tant qu'il coûtait un build ; devenu un clic, il a
été fait **43 minutes après une publication accidentelle**. Un geste cher se remet à
demain ; un geste gratuit se rattrape.
