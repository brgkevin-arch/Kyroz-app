# Bac à sable Kyroz+ — procédure, 2026-08-27

> **Une étape à la fois.** Chaque étape dit ce que tu dois VOIR à la fin. Tant que tu ne
> le vois pas, on ne passe pas à la suivante — c'est ce contrôle qui évite de chercher
> un défaut dans le code alors qu'il est chez Apple.

## État au moment d'écrire

| | |
|---|---|
| Binaire | **(8)** — `70b2e757`, commit `12215a7`, `VALID` chez Apple, `IN_BETA_TESTING` |
| Capture de review | ✅ téléversée sur **les 4 produits**, `assetDeliveryState: COMPLETE` |
| `kyroz_plus_monthly` · `kyroz_plus_yearly` (réserve) | ✅ **READY_TO_SUBMIT** |
| `kyroz_plus_monthly_early` · `kyroz_plus_yearly_early` (**en vente**) | 🔴 **MISSING_METADATA** |
| Testeurs sandbox | 🔴 **aucun** (0 sur l'API) |

🔴 **CE QUI BLOQUE, MESURÉ ET NON SUPPOSÉ** : les deux produits « lancement » n'ont un
prix **qu'en France**. Relevé par territoire :

| | FRA | USA | DEU | JPN |
|---|---|---|---|---|
| `kyroz_plus_monthly` (réserve) | 4,99 | 3,99 | 4,99 | 600 |
| `kyroz_plus_monthly_early` (en vente) | 3,99 | **0** | **0** | **0** |

⚠️ *La capture était nécessaire — elle a fait passer les DEUX produits de réserve en
« Prêt à soumettre », ce qui le prouve — mais elle n'était pas suffisante. Le script
`check:abonnements` annonce « capture ABSENTE — c'est ce qui retient les métadonnées » :
c'était vrai pour 2 produits sur 4. **Un diagnostic juste sur la moitié des cas se lit
comme un diagnostic complet.***

---

## ⏸️ OÙ ON EN EST — 2026-08-28, 00 h 15

| Étape | État |
|---|---|
| 1 · prix sur tous les territoires | ✅ **FAITE par l'API** — 175 territoires sur les deux produits « lancement », grille d'équivalence d'Apple depuis le prix français. **Les 4 produits sont `READY_TO_SUBMIT`** |
| 2 · testeur sandbox | ✅ **CRÉÉ** — `Test Sandbox`, territoire **FRA**, `interruptPurchases: false` |
| 3 · téléphone | ✅ compte sandbox connecté, **(8) installé**, version 1.0.0 |
| 4.1 · l'achat aboutit | 🔴 **ÉCHOUE — et la cause est chez Apple, pas chez nous** |

### ✅ Ce que 4.1 a DÉJÀ prouvé, et c'est le plus important

**Le correctif du (8) tient sur un vrai appareil.** Un compte créé deux minutes plus tôt
voit « Piloter ton objectif dans le temps » et les deux formules — **pas** « C'est déjà à
toi ». Le défaut qui aurait fait rejeter le (7) par le relecteur est mort.

### 🔴 L'achat : `indisponible`, et les deux causes possibles ont été SÉPARÉES

Le message « L'abonnement n'est pas disponible sur cet appareil pour l'instant » couvre
**deux** cas dans `purchases.ts::buy` — SDK non configuré, ou produit introuvable côté
store. Le titre ne les distingue pas ; il a fallu les séparer par la mesure.

- **SDK configuré : ÉLIMINÉ.** Le bundle Hermes du (8) contient `appl_xBxmQsp…` (la clé
  RevenueCat), `kyroz_plus_monthly_early`, `kyroz_plus_yearly_early` et `premium` — lus
  dans l'IPA, pas supposés.
- **Reste : `getProducts()` ne rend rien.** Confirmé par l'app elle-même : le paragraphe
  « Les montants ci-dessus sont les tarifs français » **s'affiche**, et il ne se rend que
  lorsqu'aucun prix n'est venu du store. Même appel pour l'affichage et pour l'achat,
  donc une seule cause.

➡️ **Hypothèse retenue : la propagation.** Les produits ne sont « Prêt à soumettre » que
depuis ~30 min et les 175 prix depuis ~20 min. Apple met de quelques dizaines de minutes à
quelques heures à les servir au bac à sable.
➡️ **Geste : réessayer plus tard. Ne rien corriger.**

### 2026-08-28, 00 h 45 — le contrat est ACTIF, et le côté Apple est ENTIÈREMENT mesuré

Le suspect « contrat *Paid Applications* inactif » est **éliminé** (vérifié par le fondateur).
Tout ce que l'API expose a été relevé, et tout est vert :

| Mesure | Résultat |
|---|---|
| Les 4 identifiants produits | exacts, **`READY_TO_SUBMIT`** tous les quatre |
| Disponibilité territoriale (ressource SÉPARÉE des prix) | **FRA = OUI** sur les 4, `availableInNewTerritories: true` |
| Bundle ID | `app.kyroz.mobile` — identique côté ASC et côté `app.json` |
| Le pod dans le binaire | `RNPurchases 10.6.0` → `PurchasesHybridCommon 18.28.0` → `RevenueCat 5.83.0` |
| La clé publique iOS | `appl_xBxmQspW…`, présente dans le bundle Hermes **et** dans `eas env production` |

⏱️ **Et le temps n'a pas encore parlé** : les 175 prix ont été posés vers 00 h 05, le nouvel
essai a eu lieu vers 00 h 40. **Trente-cinq minutes.** Apple annonce « jusqu'à plusieurs
heures » pour servir un produit neuf au bac à sable ; « toujours pareil » à +35 min n'infirme
donc rien.

🔴 **Le seul maillon jamais mesuré, c'est RevenueCat** — et une seule page le tranche :

| Ce qu'on voit dans *Customers* | Ce que ça prouve |
|---|---|
| **un client créé ce soir**, portant l'UUID Supabase | `configure()` **et** `logIn()` ont tourné → le SDK parle à RevenueCat → la panne est en aval, chez Apple → **attendre** |
| **aucun client** | le SDK n'a **jamais** joint RevenueCat → c'est la clé ou la fiche d'app → **attendre ne réparera rien** |

*(L'écran Kyroz+ force `identifyUser(uid)` — cf. `hooks/usePremium.ts`, décision C1 — donc
l'avoir ouvert suffit à créer le client. S'il n'y en a aucun, c'est un fait, pas un délai.)*

Deux vérifications à faire dans la même visite :
1. **Project → Apps → l'app iOS** : bundle ID `app.kyroz.mobile`, clé publique `appl_xBxmQspW…` ;
2. **App-Specific Shared Secret** renseigné — RevenueCat valide les reçus avec. Absent, l'achat
   échoue **après** la feuille Apple, pas avant : ce n'est pas notre symptôme, c'est le mur suivant.

---

## Étape 1 — 🧑 Poser le prix sur tous les territoires (les 2 produits « lancement »)

**Où** : App Store Connect → ton app → *Monétisation* → **Abonnements** → groupe
« Kyroz+ » → ouvre `kyroz_plus_monthly_early`, puis `kyroz_plus_yearly_early`.

Dans la section **Tarification** : le prix français existe déjà (3,99 € / 29,99 €).
Apple propose de **générer la grille des autres pays** à partir de lui — accepte la
proposition. C'est un geste par produit, deux au total.

⚠️ **Ne touche pas aux deux produits de réserve** (`kyroz_plus_monthly`,
`kyroz_plus_yearly`, 4,99 / 39,99) : ils sont déjà prêts, et leurs prix sont ceux du
palier standard. Un identifiant produit par palier — jamais un prix changé en place.

**Ce que tu dois voir** : les deux produits passent de « Métadonnées manquantes » à
**« Prêt à soumettre »**.

**Contrôle depuis le terminal** (je peux le lancer) :

```bash
cd /Users/kevinberger/Kyroz_Code/kyroz-app && npm run check:abonnements
```

Les **quatre** doivent afficher « Prêt à soumettre ».

---

## Étape 2 — 🧑 Créer un testeur sandbox

**Où** : App Store Connect → **Utilisateurs et accès** → onglet **Sandbox** →
*Testeurs* → **+**.

- Emploie une adresse que tu contrôles et qui **n'est PAS déjà un Apple ID**. Le plus
  simple : un alias de la tienne (`ton.adresse+sandbox@…`) si ton fournisseur les
  accepte.
- Choisis le territoire **France** (sinon les prix affichés ne seront pas ceux qu'on
  vient de poser).
- Note le mot de passe : il te sera demandé au moment de l'achat.

🔴 **Je ne le fais pas à ta place** : créer un compte et saisir un mot de passe sont
des gestes que je ne pose jamais, même avec les identifiants sous la main.

**Ce que tu dois voir** : le testeur apparaît dans la liste.

---

## Étape 3 — 🧑 Préparer le téléphone

1. **Réglages iOS → App Store → Compte Sandbox** — connecte-toi avec le testeur créé à
   l'étape 2. *(Ne te déconnecte PAS de ton Apple ID normal : le compte sandbox est un
   réglage séparé, précisément pour ça.)*
2. **TestFlight → Kyroz → installe le build (8)**. Vérifie le numéro : `1.0.0 (8)`.

⚠️ **Le (7) est aussi chez Apple et il ne doit PAS servir** : il porte le défaut où un
compte neuf recevait Kyroz+ gratuitement pendant toute sa première session.

**Ce que tu dois voir** : Kyroz s'ouvre, et *Profil → Réglages → Version* affiche `1.0.0`.

> 🟠 **Réserve sur le point 1, ajoutée le 2026-08-28.** Un binaire installé par **TestFlight**
> encaisse déjà en environnement bac à sable, avec l'Apple ID connecté à l'App Store — le
> *Compte Sandbox* des réglages iOS ne concerne que les builds posés par **Xcode**. Le testeur
> créé à l'étape 2 n'est donc probablement pas celui qui sera débité, et c'est sans conséquence :
> en TestFlight les achats sont **gratuits**. ➡️ Ça n'explique PAS l'échec du 4.1 — aller
> chercher les produits ne dépend d'aucun compte — mais la feuille Apple affichera le compte
> employé, et c'est là qu'on le vérifiera plutôt que de le supposer.


---

## Étape 4 — 🧑 Les trois preuves

Elles ne se prouvent QUE là. Dans cet ordre.

### 4.1 — L'achat aboutit et débloque

1. Crée un **compte neuf** dans l'app (« Continuer en invité » suffit).
2. Va dans *Profil → Kyroz+*. Tu dois voir **« Piloter ton objectif dans le temps »** et
   les deux formules — **pas** « C'est déjà à toi ». *(C'est le correctif du (8) : un
   compte créé aujourd'hui est verrouillé dès sa première session.)*
3. Achète l'annuel. La feuille Apple doit annoncer **[Environnement Sandbox]**.
4. Après l'achat : *Objectif daté* et *Suivi de transformation* s'ouvrent.

🔴 **Si l'achat échoue avec « produit indisponible » : relis l'étape 1 avant de
soupçonner le code.** C'est le piège que la procédure de mise en vente signale
nommément.

### 4.2 — « Restaurer mes achats » fonctionne

Désinstalle l'app, réinstalle-la depuis TestFlight, reconnecte-toi au même compte Kyroz,
puis *Profil → Kyroz+ → **Restaurer mes achats***.

🔴 **Sans cette preuve, c'est un rejet au titre de la Guideline 3.1.1.** Ce n'est pas un
confort, c'est une exigence d'Apple.

### 4.3 — L'abonnement suit le COMPTE, pas le téléphone

1. Déconnecte-toi du compte Kyroz → le droit doit **partir**.
2. Reconnecte-toi → il doit **revenir** sans repasser à la caisse.

⚠️ C'était le défaut corrigé le 2026-08-02 : sans identification, RevenueCat travaillait
sur une identité liée à l'APPAREIL, et sur un téléphone partagé la personne suivante
héritait de l'abonnement de la précédente.

---

## Étape 5 — 🤖 Ce que je vérifie après

- que l'abonné apparaît bien chez RevenueCat, rattaché à l'**UUID Supabase** et pas à un
  identifiant anonyme d'appareil ;
- que les quatre produits sont en « Prêt à soumettre » ;
- et je consigne le résultat dans `STORE-RELEASE.md` et `AGENTS.md`.

---

## Ce qui reste APRÈS le bac à sable

1. 🧑 Juger les 10 captures de fiche (elles sont faites, dimensions mesurées).
2. 🧑 Remplir les formulaires ASC — tout est rédigé, `STORE-RELEASE.md` §3–6 et §11.
3. 🧑 Sélectionner le **(8)** et « Submit for review ».
4. 🧑 **Avant la première vente, pas avant la soumission** : adhérer à un médiateur de la
   consommation (L.612-1). Aucune adhésion n'existe, et c'est un contrat à souscrire,
   pas une phrase à écrire.

⚠️ **Pendant la revue, surveille la boîte mail de ton Apple ID, pas l'interface.** Un
refus `ITMS-90111` n'apparaît **ni** dans App Store Connect **ni** dans son API. Notre
machine de compilation est propre (`BuildMachineOSBuild 25F84`, vérifiée sur le (7) et le
(8)), donc le risque est faible — mais c'est le seul guichet que Kyroz n'a jamais franchi.
