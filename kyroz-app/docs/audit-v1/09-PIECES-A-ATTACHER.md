# Étape 9 — pièces à attacher, et ce que le code répond déjà
Préparé par Claude Code le 2026-08-26, commit `b478a77`. **L'étape 9 elle-même tourne dans Claude.ai** (son brief y est fourni) ; ce document est le dossier à lui donner.

> ⚠️ **Pourquoi ce document existe.** L'étape 6b a rendu un rapport de bonne qualité assorti de **dix questions qu'elle ne pouvait pas trancher depuis ses pièces** — et l'une de ses recommandations aurait réintroduit en production un mensonge retiré volontairement, faute de connaître une décision qui ne vivait pas dans le dump.
> L'étape 9 confronte **textes ↔ registre ↔ comportement du code**. Deux des trois sont dans les pièces ; le troisième ne l'est pas. La partie II ci-dessous lui donne le troisième, **mesuré**, pour qu'elle n'ait pas à le deviner.

## Partie I — Les pièces

### À attacher tels quels

| # | Fichier | Poids | Ce qu'il apporte |
|---|---|---|---|
| 1 | `docs/audit-v1/01-securite-donnees.md` | 23 Ko | inventaire des données de santé persistées (tableaux A et C), chemin réel de suppression de compte |
| 2 | `docs/audit-v1/03-store-readiness.md` | 19 Ko | permissions **résolues** (pas celles d'`app.json`), SDK réellement embarqués, manifeste privacy iOS |
| 3 | `docs/audit-v1/07-monetisation.md` | 18 Ko | ce que Kyroz+ contient réellement, état des quatre abonnements chez Apple |
| 4 | `docs/audit-v1/08-analytics.md` | 13 Ko | l'état d'extinction, et la correction 08-04 qui invalide une prémisse de 6b |
| 5 | `RGPD-REGISTRE.md` | 34 Ko | le registre |
| 6 | `constants/legal.ts` | 22 Ko | **politique ET CGU, source unique** — `PRIVACY_POLICY:104`, `TERMS_OF_USE:258`, `LEGAL:34` |
| 7 | `docs/audit-v1/09-extrait-textes.md` | 20 Ko | **130 chaînes** : légal, paywall, consentement, Réglages, connexion. Préparé pour éviter d'attacher les 728 |

**Ne pas attacher `public/legal.html`** : c'est un fichier **généré** depuis la pièce 6, et il a été vérifié synchronisé (étape 6a, constat 06-04 — régénération dans un bac à sable, `git diff` vide). L'attacher ferait croire à deux sources à réconcilier.

### Ce que toi seul peux fournir — et c'est bloquant

| Pièce | Où | Pourquoi elle est indispensable |
|---|---|---|
| 🔴 **Capture du formulaire App Privacy** (App Store Connect) | console Apple | C'est **la** déclaration publique. Aucune ligne du dépôt ne dit ce qui y est coché — le comparer au code est tout l'objet de l'étape 9 |
| 🔴 **Capture du formulaire Data Safety** (Play Console) | console Google | Idem, et il doit refléter les **permissions résolues** (pièce 2), pas `app.json` |
| ⚠️ **Déclaration Health** si elle existe | console Apple | Kyroz manipule des données de santé au sens de l'article 9 |

**Sans les deux premières, l'étape 9 ne peut pas faire son travail** : elle relira des textes cohérents entre eux et ne verra pas l'écart qui compte, celui entre ce qui est déclaré aux stores et ce que l'app fait.

## Partie II — Ce que le code répond déjà, mesuré

À donner à l'étape 9 **en même temps que les pièces**. Chaque ligne a été mesurée pendant les étapes 1, 3, 7 et 8 ; aucune n'est une supposition.

### Ce qui sort de l'appareil, et vers qui

| Destinataire | Ce qui part | Base légale annoncée | Mesure |
|---|---|---|---|
| **Supabase** (UE) | profil complet : sexe, âge, date de naissance, poids, taille, %MG et sa provenance, activité, sport, objectif, cibles caloriques et macros, restrictions alimentaires, registres d'exposition — **et l'e-mail, dupliqué dans `profiles`** | consentement art. 9 | tableau A de la pièce 1 |
| **RevenueCat** | l'**identifiant de compte Supabase** (`identifyUser(uid)`), plus l'historique d'achat quand il y en aura | exécution du contrat | `hooks/usePremium.ts:52` |
| **PostHog** | **rien** | — | trois gardes, `capture()` sort en premier ; clé retirée des 3 environnements EAS ; données des huit jours **supprimées à la source** |
| **Apple / Google** | ⚠️ **les sauvegardes OS emportent la session ET les données de santé locales**, en clair | **non documentée** | constat **01-04** — `allowBackup` non déclaré (défaut Android `true`), AsyncStorage brut, aucune exclusion iCloud |

🔴 **La quatrième ligne est le point le plus important de ce tableau** : c'est un transfert de données de santé vers deux sous-traitants **qui ne sont pas au registre**, et personne ne l'a décidé — c'est un défaut de plateforme qui s'applique faute de déclaration contraire.

### Les affirmations des textes, confrontées au code

| Affirmation | Où | Verdict **mesuré** |
|---|---|---|
| « Aucune statistique d'usage n'est collectée » | `legal.ts:120` | ✅ **vrai aujourd'hui**. ⚠️ Deviendra faux au commit qui repasse `STATISTIQUES_USAGE_ACTIVES` à `true` — aucun test ne garde ce sens-là (constat **08-01**) |
| « Toutes tes données […] seront définitivement supprimées » | `profil.tsx:782` | ⚠️ **inexact** : localement tout part (`AsyncStorage.clear()`), mais **le client RevenueCat n'est pas supprimé**. La branche PostHog de ce constat est tombée (**08-04**) |
| « Supprimer votre compte n'annule PAS un abonnement » | `legal.ts:326` | ✅ vrai — mais **absent de la modale de suppression**, là où ça compte (**01-05** = **06b-07**) |
| « Réservé aux 18 ans et plus. Aucun compte ne peut être créé en deçà » | `legal.ts:246` | ✅ **vrai, bloqué à trois endroits** : `MIN_AGE = 18`, `basicsValid`, `checkEligibility → MINOR` |
| « au moins un an, sans limite haute fixe » (rétention) | 4 surfaces | ✅ **vrai, et c'est le résultat d'un arbitrage daté** (`RGPD-REGISTRE.md:266`). 🔴 **Ne pas le « corriger » en « 18 mois »** : cette borne-là était fausse, elle a été retirée exprès |
| « Les comptes créés avant la mise en vente conservent l'accès gratuitement, à vie » | `legal.ts:292` | ✅ le code fait exactement cela (`premium.ts:78`) — ⚠️ mais la clause est **irrévocable et non datée** (**06b-03**) |
| Périmètre gratuit des CGU : « plan de la semaine, courses, recettes, réserve, favoris, série, pesée… » | `legal.ts:288` | ✅ **exact** : aucun verrou n'existe sur ces écrans, et le gate temporel « 1 j / 7 j » a été **abandonné** (étape 7) |
| Kyroz+ = objectif daté + suivi de transformation | `legal.ts:288` | ✅ `PREMIUM_FEATURES = ['dated_goal', 'transformation']` |
| « données de santé […] art. 9, consentement recueilli à l'inscription » | `legal.ts:133` | ⚠️ **le mode invité ne passe pas par ce consentement** (`signInAnonymously`, aucune migration) — **06b-13** |
| Sous-traitants déclarés : Supabase, PostHog, RevenueCat, Resend | registre | ⚠️ **Apple et Google manquent**, au titre des sauvegardes (voir tableau précédent) |

### Les questions que l'étape 9 devra poser aux formulaires

Formulées depuis le code, pour qu'elle sache quoi chercher dans les captures :

1. **App Privacy déclare-t-il « Health & Fitness » comme collecté et lié à l'utilisateur ?** Le code envoie bien poids, taille, %MG et objectif à Supabase, liés à un compte.
2. **Déclare-t-il un identifiant transmis à un tiers ?** `identifyUser(uid)` transmet **l'identifiant de compte Supabase à RevenueCat**. C'est un fait, indépendant du paywall.
3. **Déclare-t-il de l'analytics ?** Il ne le doit **pas** aujourd'hui — mais il le devra le jour du rallumage.
4. **Data Safety décrit-il les trois permissions RÉSOLUES** (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `INTERNET`) ou le tableau vide d'`app.json` ? Le constat **03-01** montre que les deux diffèrent.
5. **L'un des deux formulaires mentionne-t-il les sauvegardes OS ?** Aucun texte du dépôt ne les mentionne.
6. **La classification d'âge déclarée correspond-elle aux 18 ans du produit ?**
7. **Les URL de support, politique et CGU** des consoles pointent-elles vers un contenu **à jour** ? Rien n'est versionné (`store.config.json` absent, constat **03-08**), donc rien ne les compare.

### Les quatre constats de conformité déjà ouverts, à ne pas re-découvrir

| # | Constat | Sév. | Étape |
|---|---|---|---|
| **01-03** | « Toutes tes données » est inexact — RevenueCat survit | P1 | 1, corrigé par 08-04 |
| **01-04** | Sauvegardes OS non documentées au registre | P1 | 1 |
| **01-05** = **06b-07** | L'abonnement continue après suppression, et la modale ne le dit pas | P1 | 1 et 6b, **trouvé deux fois indépendamment** |
| **06b-03** | « Gratuitement, à vie » : clause irrévocable, non datée | P1 | 6b |

## Comment lancer l'étape 9

Session Claude.ai fraîche, les sept pièces de la partie I attachées, **plus les deux captures de formulaires**, plus ce document. Un seul message :

> Voici les pièces de l'étape 9 de l'audit V1 de Kyroz, plus un document « pièces à attacher » qui contient les réponses mesurées côté code. Exécute le brief de l'étape 9 intégralement. Le document de préparation fait foi sur tout ce qui concerne le comportement du code : ne le redéduis pas des textes.

⚠️ **Et au retour** : le rapport s'**arbitre**, il ne s'applique pas. C'est ce qui a évité de remettre « 18 mois » en production à l'étape 6b.
