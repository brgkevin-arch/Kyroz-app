# Audit V1 — Étape 9 : Conformité & cohérence documentaire — **PARTIEL**
Date : 2026-08-26 · Commit audité : `7d1c372` · Source : **Claude.ai**, sur deux pièces sur sept · Vérification : **Claude Code**

> 🟡 **Partiel, et volontairement.** L'étape 9 a **refusé d'exécuter** son brief avec deux pièces sur sept,
> en écrivant : « si je produisais maintenant un rapport d'étape 9, je referais très précisément ce que ce
> document a été écrit pour empêcher ». Le refus est le bon geste — il est consigné ici comme tel.
>
> Ce fichier porte ce qu'elle a **quand même** trouvé avec l'extrait de textes et la partie II du dossier :
> **quatre constats, tous vérifiés dans le code**, dont deux qu'aucune étape précédente ne portait.
> Le reste attend les cinq pièces manquantes et les deux captures de formulaires.

## Reste à couvrir

- [x] confrontation **textes ↔ code** (le tiers faisable avec les pièces fournies)
- [x] vérification des quatre constats rendus
- [x] réponse aux trois questions restées ouvertes
- [ ] confrontation **textes ↔ registre RGPD** — attend la pièce 5
- [ ] confrontation **textes ↔ déclarations stores** — attend les deux captures 🔴
- [ ] cohérence des sorties 01, 03, 07, 08 entre elles — attend les pièces 1 à 4

## Constats

### 09-01 La politique se contredit sur RevenueCat, et c'est la section la plus lue qui a tort
- **Sévérité : P1** · **vérifié dans le code**
- **Preuve** — deux sections du même document, 89 lignes d'écart :
  | Ligne | Texte |
  |---|---|
  | `constants/legal.ts:119` (§2 Données collectées) | « Données d'abonnement, **uniquement si vous souscrivez à Kyroz+** : l'identifiant technique de votre compte et l'état de votre abonnement. » |
  | `constants/legal.ts:208` (§5 Sous-traitants) | « Dès que vous êtes connecté, **que vous soyez abonné ou non**, l'identifiant technique de votre compte lui est transmis pour vérifier si un abonnement est actif » |
- **Le code tranche pour le §5** : `hooks/usePremium.ts:52` appelle `identifyUser(uid)` à **chaque changement de compte**, sans condition d'abonnement — mesuré à l'étape 7. **Le §2 est donc faux.**
- **Risque, et il est concret** : le §2 est la section qu'on lit pour remplir un formulaire App Privacy. Rempli depuis le §2, il déclare une transmission d'identifiant **réservée aux abonnés**, alors qu'elle concerne **100 % des comptes connectés**. C'est précisément la question n°2 de la partie II du dossier.
- **Reco — la meilleure réponse à la question avocat, c'est de ne pas avoir à la poser.** « Exécution du contrat » (6-1-b) tient mal pour quelqu'un qui n'a rien souscrit : il n'y a pas de contrat dont la transmission serait nécessaire à l'exécution. L'intérêt légitime (6-1-f) est plus plausible, mais il exige une balance **documentée au registre**.
  ➡️ **L'alternative technique évacue la question** : appeler `identifyUser(uid)` **à l'ouverture du paywall et à la restauration d'achat**, plutôt qu'à chaque connexion. **Mesuré, et c'est faisable** : `usePremium()` n'est consommé qu'à **trois endroits** (`kyroz-plus.tsx:76`, `profil.tsx:278`, `WeightCheckin.tsx:68`), et `premiumAccess` **sort avant même de lire `entitled`** tant que `PAYWALL_LAUNCH` est `null` (`premium.ts:93`). L'appel au démarrage est donc aujourd'hui **gratuit en fonctionnalité et coûteux en conformité** — et il le restera pour tous les comptes grand-pérés, dont le statut se calcule depuis `created_at`, côté Supabase.
  ➡️ Si c'est fait, **`:119` et `:208` redeviennent vrais tous les deux, sans une ligne de texte réécrite.**
- **Effort : S** (texte) · la question de base légale n'est pas un effort, c'est une consultation

### 09-02 « Aucune donnée de santé ne quitte l'Union européenne » est faux, et quatre autres phrases avec
- **Sévérité : P1** · **vérifié dans le code** · **escalade du constat 01-04**
- **Ce que l'étape 1 avait écrit** : les sauvegardes OS emportent la session et les données de santé, et **le registre ne le documente pas**. C'était traité comme un défaut de registre.
- **Ce que l'étape 9 ajoute, et qui est plus grave** : c'est aussi un **démenti textuel**, sur cinq affirmations de la politique publiée :
  | Ligne | Texte | Statut avec `allowBackup` par défaut + AsyncStorage brut |
  |---|---|---|
  | **`:218`** | « **Aucune donnée de santé ne quitte l'Union européenne.** » | 🔴 **FAUX.** Affirmation **absolue et vérifiable**, dans un §6 intitulé « Hébergement et localisation ». La plus exposée de toute la politique |
  | `:217` | « Une copie de travail réside localement sur votre appareil » | présente le local comme un cul-de-sac. Il ne l'est pas |
  | `:118` | photos « stockées **UNIQUEMENT** sur votre appareil » | « jamais transmises à nos serveurs » reste vrai ; « uniquement » est faux |
  | `:224` | « supprimées (serveur + appareil) » | une sauvegarde antérieure survit à la suppression |
  | `:232` | « ne sont pas chiffrées : protégez l'accès à votre appareil » | l'avertissement vise l'**accès physique**, il ne dit rien du cloud |
- **Preuve côté code** : `createClient(..., { storage: AsyncStorage })` (`lib/supabase.ts:60`), `@kyroz:profile` / `@kyroz:weights` / `@kyroz:weightPhotos` en clair, `allowBackup` **déclaré nulle part** (config résolue → `null`, défaut Android `true`), aucune exclusion iCloud.
- **Reco — corrigée le 2026-08-26 : « exclure » était trop rapide, et il faut SEGMENTER.** La première version de ce constat opposait deux issues et qualifiait l'exclusion de « meilleure produit ». C'est faux pour une des quatre données :

  | Donnée | Sauvegarde OS | Verdict |
  |---|---|---|
  | Jeton de session Supabase | risque de sécurité pur, **aucun bénéfice** | **exclure**, sans arbitrage |
  | `@kyroz:profile`, `@kyroz:weights` | déjà synchronisés serveur, restaurés à la connexion | **exclure**, coût nul |
  | **`@kyroz:weightPhotos`** | 🔴 **jamais transmises au serveur** (`legal.ts:118`) | **GARDER** — les exclure, c'est les **détruire** au changement de téléphone |
  | Historique d'écarts hors plan | local uniquement | garder, enjeu moindre |

  🔴 **Pour les photos, la sauvegarde OS n'est pas une fuite : c'est leur seul filet.** Une app qui vend le « suivi de transformation » et détruit silencieusement les photos au changement de téléphone commettrait un mensonge par omission **plus coûteux que la phrase qu'il répare** — et la valeur d'une photo de progression est précisément d'être ancienne.
  ➡️ **Sortie honnête** : exclure les trois premières lignes, **garder les photos**, et corriger `:218` et `:118` pour dire le vrai — les photos ne vont jamais sur les serveurs de Kyroz, mais **elles suivent la sauvegarde du téléphone**. Ce qui implique de déclarer Apple et Google au registre **pour ce périmètre restreint**.
- ✅ **DÉCISION C2 PRISE ET APPLIQUÉE (2026-08-26)** — et la **prémisse de la reco était fausse**, ce qui a simplifié le correctif :
  - 🔧 **Les photos n'étaient PAS dans la sauvegarde.** `pickProgressPhoto` (`lib/photos.ts:33`) renvoie l'URI d'ImagePicker **sans copie durable** ; `@kyroz:weightPhotos` ne stocke qu'une **carte date → URI**, jamais les octets. La segmentation que l'étape 9 et moi recommandions — « garder les photos dans la sauvegarde, c'est leur seul filet » — portait sur quelque chose qui n'y était pas. **Et l'app le dit déjà** : `PHOTOS_NOTICE_LOCALE` annonce « ne sont pas sauvegardées : un changement de téléphone les perd », en source unique depuis le 2026-08-26.
  - ✅ **`legal.ts:118`** (« photos stockées UNIQUEMENT sur votre appareil ») est donc **vrai**. Non modifié.
  - ✅ **Android** : `android.allowBackup: false` posé dans `app.json`, vérifié sur la **config résolue**. La sauvegarde Google n'emporte plus rien.
  - 🟠 **iOS** : l'exclusion iCloud demande un plugin natif, donc un nouveau binaire → rattaché au lot « prochain binaire ».
  - ✅ **`legal.ts:218`** cesse d'être une affirmation absolue : elle dit ce qui est vrai, nomme le cas iCloud, et **donne à l'utilisateur le moyen de le couper lui-même**. ⚠️ Écrit dans `legal.test.ts` : **ne pas la re-durcir avant que les deux plateformes soient traitées** — c'est l'erreur qu'elle vient de payer.
- **Effort : M**

### 09-03 Les CGU excluent par état de santé une catégorie que le produit a choisi de ne pas filtrer
- **Sévérité : P1** · **vérifié dans le code**
- **Preuve** :
  | Où | Texte |
  |---|---|
  | `legal.ts:299` (CGU) | « Kyroz **ne s'adresse pas** aux personnes atteintes de pathologies (diabète, insuffisance rénale, troubles cardiaques…), aux femmes **enceintes ou allaitantes**. » |
  | `legal.ts:28` (in-app) | « Enceinte, allaitante, ou suivie pour une pathologie chronique ? **Parles-en à un médecin** avant de suivre un plan. » |
- **Deux régimes** : l'in-app **conseille**, les CGU **excluent**. Et **aucun code n'applique l'exclusion** : `grep -rniE "enceinte|grossesse|pathologie|diabète"` sur `lib/`, `app/` et `components/` ne rend que des occurrences d'« insuffisance **pondérale** » — un seuil d'IMC, sans rapport.
- **Pourquoi c'est le mauvais côté de l'arbitrage** : l'écran bloquant a été retiré **exprès**, parce que collecter et filtrer sur l'état de santé **crée** l'exposition au lieu de la réduire. `:299` réintroduit l'exclusion au niveau **contractuel**, sans la protection qu'elle prétend apporter — donc on garde la clause discriminante et on perd le bénéfice de la décision.
- **L'argument qui pourrait retenir `:299` ne tient pas** : on pourrait vouloir garder l'exclusion pour rester hors du champ du règlement sur les dispositifs médicaux. Or ce qui écarte le MDR, c'est **l'absence de finalité médicale revendiquée** — et `lib/methodologie.ts:63` le fait déjà explicitement : « Kyroz n'est pas un dispositif médical. Il ne diagnostique, ne traite, ne guérit ni ne prévient aucune pathologie ». Une exclusion de population n'y contribue en rien.
- **Le corpus porte déjà trois registres, et `:299` est le seul aberrant** : `legal.ts:15` **cadre la destination** (« conçu pour des adultes en bonne santé »), `:28` **conseille**, `:299` **exclut**.
- **Reco** : aligner `:299` sur `:15` + `:28`. Conseiller, ne pas exclure — **aucune protection n'est perdue**.
- **Effort : S**

### 09-04 Le médiateur de la consommation est promis sans être nommé
- **Sévérité : P2**
- **Preuve** : `legal.ts:338` — « En cas de litige, vous pouvez recourir à **un médiateur de la consommation** ou saisir la CNIL pour les questions relatives aux données. » Aucun nom, aucun site.
- **Ce que la loi demande** : l'article **L.616-1** du code de la consommation impose de communiquer les **coordonnées** du médiateur — nom et adresse du site. Et l'adhésion à un médiateur n'est pas faite.
- **Risque** : le texte promet aujourd'hui un recours qui **n'existe pas**. C'est aussi une case que les stores et les places de marché européennes regardent.
> 🔴 **LA NUANCE A EXPIRÉ LE 2026-08-27.** « Prématuré » supposait que Kyroz ne vendait
> pas ; `PAYWALL_LAUNCH` porte désormais une date (A45), et l'obligation mord à la
> **première vente**. La phrase a bien été retirée le 2026-08-26 comme le recommandait ce
> constat ; il reste la moitié chère — **l'adhésion**, qui n'existe pas et qui est un
> contrat à souscrire, pas un texte à écrire. Devenue un préalable à la mise en vente,
> écrit comme tel dans `lib/premium.ts`, `constants/legal.ts` et la procédure.
- **Nuance qui change la reco : c'était prématuré plutôt que faux.** L'obligation d'adhésion (**L.612-1**) vise le professionnel qui **vend** à des consommateurs. Tant que Kyroz est intégralement gratuit — `PAYWALL_LAUNCH` est `null`, et aucun des quatre abonnements n'est soumissible (constat **07-01**) —, elle ne mord pas.
- **Reco** : **retirer la phrase maintenant**, la remettre avec le nom et l'URL du médiateur **au moment d'activer les abonnements**. Ça évite de payer une adhésion annuelle pour un produit qui ne vend pas encore, tout en supprimant le faux dès aujourd'hui.
- **Effort : S** (texte) · **M** (adhésion)

### 09-05 Le mode invité n'existe dans aucune règle — et il rend le grand-pérage à la fois perdable et fabricable
- **Sévérité : P1** · **mesuré**
- **Le fait qui déclenche tout** : `signInGuest` appelle `supabase.auth.signInAnonymously()` (`hooks/useAuth.tsx:235`). Une session anonyme **insère bien une ligne dans `auth.users`**, donc le trigger `on_auth_user_created` (`supabase/schema.sql:284`) se déclenche et **crée une ligne `profiles` avec un `created_at` serveur**. Et **aucune migration invité → compte n'existe** : ni `linkIdentity`, ni `updateUser({ email })`, rien.
- **Les deux conséquences, et les deux sont mauvaises** :
  | | Ce qui se passe |
  |---|---|
  | **Le grand-pérage se PERD** | Quelqu'un qui teste Kyroz en invité pendant six mois puis crée un vrai compte au lancement obtient un **nouveau `created_at`** — postérieur au paywall. Il perd la gratuité à vie, alors qu'il est **exactement la personne que la clause veut récompenser** |
  | **Le grand-pérage se FABRIQUE** | Toute session anonyme ouverte aujourd'hui porte un `created_at` antérieur au lancement. Une clause « à vie » qui s'ouvre sans e-mail, sans confirmation et sans limite |
- **Et le texte ne décrit pas le comportement** : `legal.ts:292` dit « les comptes **créés** avant la mise en vente », alors qu'il n'y a **pas de création de compte identifiable** côté invité.
- **C'est le même angle mort que 06b-13** (l'invité ne passe par aucun consentement art. 9) : **le mode invité n'existe dans aucun texte et dans aucune règle.** Il est traité au cas par cas, à chaque fois qu'on le croise.
- **Reco** : lui donner **une ligne à lui** dans le brief de l'étape 9 complète, et trancher trois choses ensemble — le consentement art. 9, le grand-pérage, et la migration vers un compte. Les trois dépendent de la même décision : **le mode invité est-il un compte ?**
- **Effort : M** (décider) · **L** (la migration, si elle est retenue)

## Les trois questions restées ouvertes — réponses mesurées

### Q1 · `AnalyticsConsentStep` et le bloc Réglages sont-ils encore **montés** ?
**NON. Aucun des deux ne se rend.** L'étape 9 avait raison de dire que la partie II documentait l'extinction de **l'envoi** et pas celle de **l'affichage** — c'est un manque de mon dossier, corrigé.

| Surface | Rendu ? | Preuve |
|---|---|---|
| Écran de consentement à l'inscription | 🔴 non | `app/(auth)/onboarding.tsx:425` — `if (STATISTIQUES_USAGE_ACTIVES) { … }` |
| Bloc « Statistiques d'usage » des Réglages | 🔴 non | `components/ReglagesSheet.tsx:323` |
| Ligne « Supprimer mes statistiques » | 🔴 non | `components/ReglagesSheet.tsx:350` — `STATISTIQUES_USAGE_ACTIVES && pseudonyme` |

➡️ **L'app ne demande donc aucun consentement pour une collecte inexistante, et ne propose pas de supprimer un néant.** L'inquiétude est levée. L'extrait de textes porte désormais cet état sur chaque section, ce qu'il aurait dû faire d'emblée.

### Q2 · L'essai 14 jours
**Il n'existe pas, et ce n'est plus la stratégie.** Mesuré à l'étape 7 : aucun état `trial`, aucun horodatage, aucun déclencheur ; `grep -riE "essai (gratuit|sans carte)|14 jours|introductory"` sur `lib/`, `app/`, `components/` et `MONETISATION.md` → **rien**. Le modèle retenu, daté du **2026-07-30**, est le **grand-pérage** ancré sur `profiles.created_at`.
➡️ **06b-05 est sans objet** : le paywall n'a pas d'essai à divulguer, la guideline 3.1.2 ne s'applique pas sur ce point. C'était écrit dans l'arbitrage de l'étape 6b, pas dans le dossier de l'étape 9 — deuxième manque de ma part, corrigé.

### Q3 · Le trou entre le §7 et le §9
**Défaut de mon extracteur, et il y en avait deux, pas un.** Pour les fichiers hors `app/` et `components/`, il ne retenait que les chaînes d'au moins **12 caractères**. Deux titres passent dessous :

| Titre | Longueur | Source |
|---|---|---|
| `8. Sécurité` | **11** | existe, `constants/legal.ts:229` |
| `10. Mineurs` | **11** | existe, `constants/legal.ts:244` |

L'étape 9 en avait vu un ; le second est **la section « Mineurs »**, celle sur laquelle portait son propre constat 06b-19. ➡️ Sa conclusion est la bonne et elle est appliquée : **l'étape 9 auditera `constants/legal.ts` en fichier**, et le bloc « Textes légaux » a été retiré de l'extrait.

## Checklist humaine

- [ ] 🔴 **Capture du formulaire App Privacy** (App Store Connect) — bloquante.
- [ ] 🔴 **Capture du formulaire Data Safety** (Play Console) — bloquante.
- [ ] **Adhésion à un médiateur de la consommation** (09-04), puis report du nom et du site dans les CGU.
- [ ] **Question avocat, base légale RevenueCat pour le non-abonné** (09-01) — l'identifiant de compte part dès la connexion, abonnement ou pas.
- [ ] **Décision sauvegardes OS** (09-02) : exclure, ou déclarer Apple et Google comme destinataires. La décision précède la réécriture des cinq phrases.

## Hors périmètre / non couvert

**Les deux tiers du travail restent à faire**, et l'étape 9 les nomme précisément : « les deux autres tiers (textes ↔ registre, textes ↔ déclarations stores) sont exactement ceux qui manquent, **et ce sont ceux où l'écart se cache** ».

Pour relancer : les **cinq pièces manquantes** (sorties 01, 03, 07, 08 et `RGPD-REGISTRE.md`), les **deux captures**, et `constants/legal.ts` **en fichier**. Le dossier `09-PIECES-A-ATTACHER.md` est à jour.

⚠️ **Ce que ce partiel ne dit pas** : rien sur la cohérence du registre avec quoi que ce soit, rien sur les formulaires, et rien sur la cohérence des quatre sorties d'audit entre elles. Les quatre constats ci-dessus sont **fermes** — ils ont été vérifiés ligne à ligne dans le code — mais ils ne constituent pas un audit de conformité.
