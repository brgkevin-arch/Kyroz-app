# Kyroz — Dossier de sortie stores (App Store + Google Play)

> Playbook de première soumission. **Ce qui est codable est fait** (config, icônes,
> splash, `eas.json`, URL de confidentialité). Il te reste des actions qui demandent
> ton **identité, ton argent, ou un device** (comptes, screenshots, build). Tout est
> ci-dessous, dans l'ordre.

---

## 0. État — prêt vs à toi

| Élément | État |
|---|---|
| Identité app (`bundleIdentifier`/`package` = `app.kyroz.mobile`, version 1.0.0) | ✅ code |
| Icône (1024², sans alpha), icône adaptative Android, splash sombre | ✅ code |
| `eas.json` (profils dev/preview/production + submit) | ✅ code |
| Permission micro parasite retirée ; photos = local-only | ✅ code |
| URL politique de confidentialité (HTTP 200) | ✅ en ligne |
| Textes de fiche (FR), réponses confidentialité, classification | ✅ ci-dessous (§3–6) |
| **Comptes développeur Apple + Google** | ⛔ **toi** (§1) |
| **Screenshots + feature graphic** | ⛔ **toi** (§7) |
| Accès reviewer (code) | ✅ code — toi : poser le secret au build (§9) |
| **Lancer le build EAS** | ⛔ **toi** (§8) |

---

## 1. Comptes développeur (bloquant — argent + identité, prévoir des délais)

- ✅ **Apple Developer Program — FAIT (2026-07-30).** Compte ouvert et payé.
  > ⚠️ **Payer les 99 € n'autorise PAS encore à vendre.** Ce sont deux choses
  > distinctes, et c'est le piège classique :
  > - les **99 €/an** = l'adhésion, qui permet de *publier* une app ;
  > - le **Paid Applications Agreement** (App Store Connect → *Business* →
  >   *Agreements*) = le contrat de vente, qui permet d'*encaisser*. Il réclame
  >   tes coordonnées **bancaires** et **fiscales**, et tant qu'il est en
  >   « Pending », **aucun abonnement ne peut être créé ni vendu** — même app
  >   publiée. C'est LUI qui bloque Kyroz+, pas l'adhésion.
- **Google Play Console** — 25 € une fois — https://play.google.com/console/signup
  - ⚠️ **Piège délai** : depuis nov. 2023, un **compte personnel** neuf doit faire
    tester l'app par **au moins 12–20 testeurs pendant 14 jours** avant de pouvoir
    passer en production. **À anticiper** (recrute tes testeurs tôt). Un compte
    **organisation** (entreprise) n'a pas cette contrainte.

Sans ces deux comptes, rien ne peut être soumis. Le reste (§2–7) peut se préparer en parallèle.

### 1-bis. Créer les abonnements Kyroz+ (ordre IMPOSÉ)

> ## ✅ CÔTÉ APPLE : TERMINÉ (2026-07-30)
> Bundle ID enregistré · fiche d'app créée · Paid Applications Agreement **Actif**
> (compte bancaire + W-8BEN actifs) · groupe `Kyroz+` et les deux abonnements créés
> et tarifés. Reste la **capture de review**, impossible avant que le paywall existe —
> les produits restent en « Métadonnées manquantes », ce qui n'empêche NI RevenueCat
> NI les tests sandbox.
>
> ⚠️ **À surveiller** : la conformité **DSA** était « En cours de vérification ».
> Tant qu'elle n'est pas validée, **aucune distribution dans l'UE** — donc pas en
> France. Ça bloque la publication, pas seulement les abonnements.
>
> ℹ️ Redevances en **USD** sur un compte bancaire en **EUR** (Revolut Bank UAB) :
> chaque versement subira une conversion. Changer la devise exige un autre compte →
> **laissé tel quel volontairement**, à rouvrir quand il y aura du revenu réel.

Les produits d'abonnement ne peuvent pas être créés dans le vide : il faut d'abord
un identifiant enregistré, puis une fiche d'app. Dans cet ordre, sinon le menu
« Abonnements » n'apparaît tout simplement pas.

1. **Enregistrer le Bundle ID** — developer.apple.com → *Certificates, IDs & Profiles*
   → *Identifiers* → **+** → *App IDs* → *App*. Bundle ID = **`app.kyroz.mobile`**
   (exactement celui d'`app.json` — une faute de frappe ici se paie par un rejet à
   la soumission). Cocher **In-App Purchase** et **Sign in with Apple** (cf. §2 :
   la seconde est anticipée, elle n'ajoute rien au binaire aujourd'hui). **Ne PAS**
   cocher Push Notifications — les rappels sont locaux.
2. **Créer la fiche d'app** — App Store Connect → *Apps* → **+** → *New App*.
   Plateforme iOS · Nom **Kyroz** · Langue principale Français · Bundle ID celui du
   dessus · SKU libre (ex. `kyroz-ios-001`).
3. **Signer le Paid Applications Agreement** s'il ne l'est pas (cf. encadré ci-dessus).
   **Tant qu'il est « Pending », l'étape 4 est impossible.**
4. **Groupe d'abonnement puis produits** — fiche de l'app → *Monetization* →
   *Subscriptions* → créer un groupe nommé **Kyroz+**, puis dedans :

   | Product ID | Nom de référence | Durée | Prix |
   |---|---|---|---|
   | `kyroz_plus_monthly` | Kyroz+ mensuel | 1 mois | 4,99 € |
   | `kyroz_plus_yearly` | Kyroz+ annuel | 1 an | 39,99 € d'avance **ou 3,99 €/mois** |

   ⚠️ **L'annuel a DEUX modes de paiement** (créés le 2026-07-30) : Apple demande un
   « prix avec facturation à l'avance » ET un « prix mensuel » avec engagement 12 mois.
   Le paywall devra donc présenter **trois** formules, pas deux :

   | Formule | Sur un an | vs mensuel | Engagement |
   |---|---|---|---|
   | Mensuel | 59,88 € | — | aucun |
   | Annuel payé au mois (3,99 €) | 47,88 € | −20 % | 12 mois |
   | Annuel payé d'avance | 39,99 € | −33 % | 12 mois |

   Le piège évité : Apple proposait **4,99 €/mois** par défaut, soit 59,88 € sur
   l'année — exactement le prix du mensuel sans engagement, mais en enfermant le
   client 12 mois. Strictement défavorable, et le genre de détail qui produit des
   remboursements. La contrainte d'Apple est : total ∈ [prix d'avance ; 1,5 × prix
   d'avance], donc ici entre 39,99 € et 59,98 €.
   ℹ️ La facturation mensuelle avec engagement n'est **pas disponible** à Singapour
   ni aux États-Unis — ces marchés ne verront que le paiement d'avance.

   ⚠️ **Les `Product ID` doivent être identiques au caractère près côté Google et
   dans RevenueCat.** C'est la source d'erreur n°1 : un `_yearly` écrit `_annual`
   d'un côté et l'achat échoue en silence à l'exécution.
   Chaque produit réclame en plus un **nom affiché** + une **description** localisés
   FR, et une **capture d'écran de review** (l'écran de paywall — donc à produire
   après le câblage, ou une maquette provisoire).
5. **Google Play Console** → *Monétisation* → *Abonnements* : créer **un** abonnement
   `kyroz_plus` avec **deux base plans** (mensuel / annuel), mêmes prix.
6. **RevenueCat** → nouveau projet → rattacher l'app iOS **et** l'app Android →
   mapper les produits store → **1 entitlement nommé exactement `premium`** +
   **1 offering** contenant les deux packages. Récupérer les 2 clés SDK publiques
   (`appl_…` et `goog_…`) — publiques par conception, transmissibles sans risque.

À la fin de l'étape 6, il reste **une seule fonction à écrire** côté code :
`useEntitlement()` dans `hooks/usePremium.ts`. Tout le reste est déjà en place
(cf. `lib/premium.ts`, grand-père des comptes existants).

---

## 2. Identité technique (déjà dans le code — pour référence)

| Champ | Valeur |
|---|---|
| Nom | Kyroz |
| Bundle iOS / package Android | `app.kyroz.mobile` — ✅ **confirmé le 2026-07-30, ne pas rouvrir** |
| Version | 1.0.0 |
| EAS projectId | `28dc4c7e-cace-4fa2-80ba-7b503804d18e` (owner `kevinberger`) |
| Thème | Sombre (splash + UI) |
| Orientation | Portrait |

> **Pourquoi `app.kyroz.mobile`, et pourquoi c'est figé.** `app.kyroz` = le domaine
> `kyroz.app` écrit à l'envers (seule chose que tu possèdes de façon unique au monde) ;
> `mobile` = quelle app, par opposition au site. Alternatives descriptives envisagées
> puis ÉCARTÉES (`plan`, `macros`, `nutrition`) : l'identifiant est **irréversible dès
> la première publication**, et un segment descriptif peut devenir faux si le produit
> s'élargit — `mobile`, lui, ne peut pas. Il n'est de toute façon **jamais visible par
> l'utilisateur** (les deep links passent par le scheme `kyroz://`, réglage séparé).
>
> **Capabilities de l'App ID** : `In-App Purchase` (Kyroz+) et `Sign in with Apple`.
> ⚠️ Cette dernière est cochée **par anticipation** : la capability du portail
> n'ajoute RIEN au binaire, l'entitlement vient d'`app.json > ios.usesAppleSignIn`,
> aujourd'hui absent. Elle deviendra **obligatoire** le jour où la connexion Google
> arrive (guideline 4.8 : proposer un login tiers impose une option équivalente).
> **Push Notifications : NON** — le rappel quotidien est une notification LOCALE
> (`scheduleNotificationAsync`), aucun serveur n'envoie rien.

> **Décision iPad — RÉVISÉE 2026-07-27 : ON SUPPORTE LA TABLETTE.** Usage produit
> concret : cuisiner avec la recette sous les yeux sur sa tablette (aligné North Star,
> moins de friction au moment de cuisiner). **Chantier prévu (autre session, non fait) :**
> repasser `app.json > ios.supportsTablet: true`, adapter la mise en page tablette (au
> minimum l'écran recette/cuisine : largeur max, lisibilité, cibles tactiles ; envisager
> le **paysage** pour la cuisine — aujourd'hui portrait-only), puis tester le rendu iPad.
> ⚠️ **Conséquences review** : dès `supportsTablet:true`, Apple **EXIGE des screenshots
> iPad** (13" iPad Pro) ET **teste réellement la mise en page tablette** (plus le simple
> mode compatibilité) → la version tablette doit être soignée avant soumission.
> Tant que le chantier n'est pas fait, `supportsTablet` reste `false` (ne pas soumettre
> `true` sans layout tablette prêt = rejet assuré).

---

## 3. Fiche store — textes FR (à copier-coller)

**Nom** (30 car. max) : `Kyroz`

**Sous-titre Apple / titre court** (30 car. max) :
`Repas calés sur tes macros`

**Texte promotionnel Apple** (170 car., modifiable sans review) :
`Ton plan de repas hebdo, précis au gramme, adapté à ton objectif et ton sport. Gratuit, sans compte requis pour démarrer.`

**Description** (App Store + Google Play) :
```
Kyroz calcule ton plan de repas de la semaine, précis à la macro près, à partir
de ton profil : objectif (sèche, maintien, prise de masse), sport, préférences et
régime. Pas de blabla : un plan crédible dès le premier jour.

• Plan 7 jours généré automatiquement, ajusté à tes calories et tes protéines
• 314 recettes, adaptées à ton régime (végétarien, vegan, sans gluten, sans
  lactose, sans porc, halal, pescétarien)
• Quantités ajustées automatiquement pour tomber sur tes macros
• Liste de courses (qui déduit ce que tu as déjà) + garde-manger
• « Recale ma journée » : un imprévu, un repas sauté ? Le plan se réajuste
• Suivi de série pour tenir le rythme
• 100 % gratuit sur le cœur, fonctionne hors-ligne

Kyroz est conçu pour des adultes en bonne santé. Ces informations ne remplacent
pas l'avis d'un médecin ou d'un diététicien-nutritionniste.
```

**Mots-clés Apple** (100 car., séparés par des virgules, sans espaces) :
`macros,nutrition,repas,fitness,muscu,prise de masse,seche,calories,proteine,meal prep,regime,sport`

**Catégorie** : Santé et forme (Health & Fitness). Secondaire (Google) : Nutrition.

**URL politique de confidentialité** (obligatoire, déjà en ligne, HTTP 200) :
`https://brgkevin-arch.github.io/Kyroz-app/legal.html`

**Support / contact** : `contact@kyroz.app`

---

## 4. Confidentialité — réponses aux formulaires (fondées sur le vrai flux de données)

> Base factuelle : compte Supabase (UE), profil = données de santé, photos
> **local-only jamais envoyées**, **aucune analytics active** (PostHog câblé mais
> DORMANT, sans clé), pas de pub, pas de tracking tiers. Suppression du compte +
> données possible **dans l'app** (Profil → supprimer le compte).

### Apple — « App Privacy »
| Donnée | Collectée ? | Usage | Liée à l'identité ? | Tracking ? |
|---|---|---|---|---|
| Adresse e-mail | Oui | Fonctionnement de l'app (compte) | Oui | Non |
| Santé & forme (poids, objectif, régime) | Oui | Fonctionnement de l'app | Oui | Non |
| Identifiant utilisateur (ID compte) | Oui | Fonctionnement de l'app | Oui | Non |
| Photos (progression) | **Non collectée** | — | — | — (restent sur l'appareil) |
| Données d'usage / analytics | **Non** (dormant) | — | — | — |
| **Suivi (tracking)** | **NON** — pas d'ATT, pas de pub, pas de partage tiers | | | |

### Google Play — « Sécurité des données »
- **Collectées** : e-mail ; infos de santé (poids, objectif, régime) ; ID compte.
- **Chiffrées en transit** : oui. **Stockage** : UE (Supabase Frankfurt).
- **Partagées avec des tiers** : **NON**.
- **L'utilisateur peut demander la suppression** : **OUI, dans l'app** (Profil →
  supprimer le compte → cascade + purge locale). Indiquer aussi `contact@kyroz.app`.
- **Photos** : non collectées (restent sur l'appareil).

> ⚠️ **Le jour où tu actives PostHog** (analytics), il faudra **mettre à jour ces
> deux formulaires** (ajouter « Données d'usage », consenties). Tant que la clé
> n'est pas posée, rien n'est collecté → déclarer « non » est exact aujourd'hui.

---

## 5. Santé — conformité (éviter le rejet « app médicale »)

- Le **disclaimer** est déjà affiché in-app (onboarding, réglages, chaque plan) :
  *« Kyroz est conçu pour des adultes en bonne santé… ne remplace pas l'avis d'un
  médecin ou diététicien-nutritionniste. »* — garde-le visible.
- **Ne revendique AUCUN bénéfice médical/thérapeutique** dans la fiche (pas de
  « soigne », « guérit », « perte de poids garantie ») → sinon catégorie médicale
  + exigences de preuves.
- Recettes : `validated_by_dietitian = false` aujourd'hui. On ne prétend donc
  **pas** de validation par un professionnel — cohérent, ne l'écris pas dans la fiche.
- **Hard-blocks déjà en place** : c'est ce qui te protège en review. Chacun est dans le
  code, appliqué à CHAQUE calcul (mode `manual` compris) — pas seulement dans la doc :
  - **Âge minimum 18 ans**, bloqué à l'inscription (`lib/safety.ts::MIN_AGE`). Relevé
    de 16 à 18 le 2026-07-28 : Mifflin-St Jeor n'est pas validée sous 19 ans, et servir
    un moteur de déficit calorique à un mineur est un risque de conformité autant que
    de sécurité.
  - **Portail de dépistage santé AVANT l'onboarding** (`components/HealthScreening.tsx`) :
    grossesse/allaitement et pathologie chronique suivie (diabète, maladie rénale ou
    cardiaque, trouble du comportement alimentaire) → cul-de-sac, renvoi vers un
    professionnel de santé. Aucun plan n'est généré.
  - **Plancher d'énergie disponible** (`lib/safety.ts::safetyFloorKcal`) :
    `max(BMR, 30 kcal/kg de masse maigre + dépense sportive, 1500 H / 1200 F)`. Le
    1500/1200 n'est plus que le **filet absolu** — il autorisait 1200 kcal à une femme
    de 65 kg s'entraînant 5×/semaine, dont le minimum physiologique est ~1863. Au-delà
    de 12 semaines cumulées en zone basse, le plancher remonte vers 35 kcal/kg chez la
    femme non ménopausée : l'app ne bloque pas, elle force une sortie de déficit.
  - **Tout déficit annulé sous IMC 18,5** (`lib/safety.ts::deficitBlocked`) : le plancher
    monte à la maintenance. Le contrôle est *pendant* la sèche, pas seulement à l'entrée
    — quelqu'un qui commence à IMC 19 et descend à 17,8 cesse de recevoir un déficit.
  - **Déficit plafonné à 25 % du TDEE** (`lib/datedGoal.ts::MAX_DEFICIT_TDEE_RATIO`), et
    éligibilité refusée pour une sèche démarrée sous IMC 18,5, un poids cible hors plage
    saine, ou plus de 20 h d'entraînement hebdomadaires déclarées
    (`lib/safety.ts::checkEligibility`).

---

## 6. Classification d'âge

- Réponds au questionnaire **honnêtement** : pas de violence, pas de contenu sexuel,
  pas de jeu d'argent. Thème = **gestion du poids / régime**.
- L'app **bloque déjà les <18 ans** à l'inscription (`lib/safety.ts::MIN_AGE`).

> ### ✅ TRANCHÉ le 2026-07-30 (décision fondateur) — **adultes uniquement**
> **À viser : Apple 17+ · Google « Adultes uniquement ».** La fiche dit désormais la
> même chose que le produit.
>
> **Pourquoi.** L'âge minimum est passé de 16 à 18 ans le 2026-07-28. Une fiche classée
> 12+ aurait été proposée à des 12–17 ans que l'app refuse ensuite à l'inscription :
> décalage fiche ↔ produit, mauvaise première expérience, et angle d'attaque en review.
> L'option écartée (garder 12+ et compter sur le blocage in-app) gagnait un peu de
> visibilité au prix de cette incohérence.
>
> **Ce que ça implique concrètement :**
> - Répondre au questionnaire de façon à **atteindre** ce classement — ne pas se
>   contenter de ce qu'il produit spontanément (le thème « gestion du poids » seul
>   donne 12+ chez Apple). Chercher les items qui portent le classement adulte.
> - **Coût assumé : moins de visibilité.** Un classement adulte réduit l'exposition
>   dans certains classements et rayons, et sur les comptes avec contrôle parental.
>   C'est le prix de la cohérence, et il a été accepté en connaissance de cause.
> - Mentionner quand même l'âge minimum 18 ans dans la note au reviewer (§11) :
>   ça n'est plus une rustine, mais ça reste ce qui explique le classement.

---

## 7. Visuels à produire (à toi — impossible sans device/design)

- **Screenshots iPhone 6.7"** (1290×2796) : **min 1, jusqu'à 10**. Montre les écrans
  forts : (1) plan du jour, (2) une recette + macros, (3) liste de courses,
  (4) onboarding/objectif, (5) série.
- **Screenshots iPad 13"** (2048×2732) : **requis** dès que le chantier tablette est fait
  (`supportsTablet:true`, cf. §2). Montre notamment l'écran recette en cuisine. Tant que
  le chantier n'est pas fait et que `supportsTablet` reste `false`, pas de screenshots iPad.
- **Google Play** : min **2 screenshots** téléphone + un **feature graphic 1024×500**
  (bannière — à faire sur Canva/Figma) + l'icône 512×512 (déjà en asset).
- **Comment capturer** : lance l'app (simulateur iOS, ou la version web pour le
  cadrage) et fais les captures aux bonnes dimensions. Je peux te générer des
  captures de cadrage depuis le web si tu veux.

---

## 8. Build & soumission (commandes)

```bash
# 1. Outil EAS (une fois)
npm i -g eas-cli        # ou préfixer les commandes par: npx eas-cli@latest

# 2. Connexion (compte Expo "kevinberger")
eas login

# 3. Build de production (eas.json est déjà configuré)
eas build --platform ios     --profile production
eas build --platform android --profile production

# 4. Soumission
eas submit --platform ios     --latest    # nécessite le compte Apple + App créée dans App Store Connect
eas submit --platform android --latest    # 1re fois : créer l'app dans Play Console, puis uploader le .aab
```

- **iOS** : laisse EAS gérer certificats + provisioning (le plus simple).
- **Android** : à la **1re** soumission, crée d'abord l'app dans la Play Console et
  uploade le `.aab` à la main (ou configure un *service account* Google pour
  automatiser `eas submit` ensuite). La clé de signature : laisse **Google Play App
  Signing** la gérer.
- `eas.json` production a `autoIncrement: true` + `appVersionSource: "remote"` → les
  numéros de build s'incrémentent tout seuls, tu n'y touches pas.

---

## 9. Checklist finale avant « Submit for review »

- [x] **Migrations Supabase appliquées + vérifiées (2026-07-23)** : 30/30 colonnes
      profil présentes, RLS forcé sur les 6 tables (`migrations/2026-07-21_pending_all.sql`).
- [x] **Suppression de compte testée de bout en bout (2026-07-23)** : `delete-account`
      déployée (200 `{"success":true}`), ligne `auth.users` + toutes les données
      effacées (cascade). RGPD droit à l'effacement prouvé. Cf. `supabase/RUNBOOK-PROD.md` §3.
- [x] ⚠️ **Accès reviewer — RÉGLÉ EN CODE (2026-07-17).** Un accès invité est
      déverrouillé par un **code secret posé au build** (`EXPO_PUBLIC_REVIEW_CODE`),
      inerte partout ailleurs (le web public ne le pose pas → reste fermé). Le
      reviewer se connecte « normalement ». **À faire par toi avant le build natif :**
      1. **Vérifie l'auth anonyme Supabase** activée (Authentication → Providers →
         Anonymous) — déjà le cas (Playwright s'en sert).
      2. **Pose le code au build**, hors repo (secret EAS) :
         ```bash
         eas env:create --name EXPO_PUBLIC_REVIEW_CODE --value "<un-code-long-aléatoire>" \
           --environment production --visibility sensitive
         ```
         *(ou variable d'env du profil `production` au moment du build).*
      3. **Dans les notes de review** (Apple : App Review Information → Sign-In
         required ; Google : instructions de test), indique :
         > Mode **Connexion** · e-mail : `review@kyroz.app` · mot de passe : `<le code posé>`
      Le reviewer entre ces identifiants et « Se connecter » → session invité, sans
      confirmation e-mail. **Ne mets JAMAIS ce code dans le repo** ni dans
      `deploy.yml` (sinon le web rouvrirait l'accès anonyme). Implémentation :
      `lib/reviewAccess.ts` (+ test `reviewAccess.test.ts` : « fermé si pas de code »).
- [ ] Disclaimer santé visible (déjà le cas).
- [ ] URL de confidentialité renvoie 200 (déjà le cas).
- [ ] Screenshots aux bonnes dimensions uploadés (§7).
- [ ] Formulaires confidentialité remplis (§4).
- [ ] **Support tablette** (décidé 2026-07-27, §2) : chantier `supportsTablet:true` +
      layout tablette + screenshots iPad 13" — À FAIRE avant de soumettre en `true`.
      Tant que non fait, rester en `false` pour ne pas bloquer une soumission iPhone-only.
- [ ] Pas d'allégation médicale dans la fiche (§5).
- [ ] (Android) Testeurs recrutés pour la période de 14 jours si compte perso (§1).

---

## 10. Ce que je peux encore faire pour toi (dis-moi)

- Passer `supportsTablet` à `false` (retire l'exigence iPad).
- Générer des **captures de cadrage** depuis la version web (pour préparer tes
  screenshots).

---

## 11. Note pour le reviewer (à coller dans App Store Connect + Play Console)

> Rédigée en anglais (les reviewers ne lisent pas forcément le français) avec les
> libellés FR des boutons entre guillemets. **Remplace `<CODE_EAS>` par le code que
> tu as posé dans `EXPO_PUBLIC_REVIEW_CODE`** (⚠️ ne PAS committer le vrai code ici —
> ce fichier est dans le repo public). Colle-la dans :
> - **Apple** : App Store Connect → ta version → *App Review Information* → *Notes* +
>   coche *Sign-In required* et mets l'e-mail/mot de passe dans les champs dédiés.
> - **Google** : Play Console → *App content* → *App access* → *All functionality
>   requires access* → fournis les identifiants + colle les instructions.

```
DEMO ACCESS
The app opens on a sign-in screen. Use the demo access below to review the full app.

On the login screen:
1. Tap the "Connexion" tab (right tab = "Sign in").
2. Email:    review@kyroz.app
3. Password: <CODE_EAS>
4. Tap "Se connecter" ("Sign in").
→ This opens a guest session and goes straight to onboarding.

WALKTHROUGH (~2 min)
- Onboarding: first name → basic info + body-fat picker → sports → goal →
  preferences (diet) → plan days + meals. Tap "Générer mon plan" ("Generate my plan").
- Meal plan ("Plan" tab): each day's meals with precise macros.
- Tap any meal to open the recipe, adjusted quantities and macros.
- Other tabs: "Courses" (shopping list), "Recettes" (recipes), "Profil" (settings +
  account deletion).

NOTES
- App language is French; theme is dark.
- No payment, no ads. Works offline.
- Health disclaimer shown in-app: Kyroz is for healthy adults and does not replace
  medical or dietitian advice. Users under 18 are blocked during onboarding.
- Data (email, profile) is stored in the EU (Supabase). Users can delete their
  account and data in-app (Profil → delete account). Progress photos never leave
  the device.
```

*Playbook préparé le 2026-07-17. Config technique prête ; le chemin critique = comptes
développeur (§1) + compte de test reviewer (§9).*
