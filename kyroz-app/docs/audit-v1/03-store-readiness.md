# Audit V1 — Étape 3 : Store readiness technique
Date : 2026-08-26 · Commit audité : `6cb1c5c` · Périmètre : `app.json`, `eas.json`, `package.json`, `metro.config.js`, `assets/`, et la **config native résolue** (`npx expo config --type introspect`). Pas de `ios/`/`android/` versionnés (workflow managé, 0 fichier).

> Audit, pas fix. Aucun fichier de code ou de config modifié. La config résolue est écrite hors du dépôt (scratchpad de session).
> Issu de `docs/audit-v1/briefs/03-store-readiness.md`.

## Reste à couvrir

- [x] config native résolue (`expo config --type introspect`)
- [x] A. identité et versions — `bundleIdentifier`, `package`, `version`, `buildNumber`, `scheme`
- [x] B. permissions iOS (`NS*UsageDescription`) et Android, avec usage réel
- [x] C. manifeste privacy iOS (`ios.privacyManifests`) + SDK natifs
- [x] D. chiffrement (`usesNonExemptEncryption`)
- [x] E. tracking (ATT / IDFA)
- [x] F. Android — target/compile SDK, 16 KB, `allowBackup`, cleartext, edge-to-edge, Firebase
- [x] G. assets — icône 1024 sans alpha, adaptive icon, splash, `supportsTablet`, orientation
- [x] H. deep links — scheme, `associatedDomains`, `intentFilters`, redirection Supabase
- [x] I. EAS — profils, distribution, env, channels, credentials
- [x] J. OTA — `runtimeVersion` policy, `checkAutomatically`, `fallbackToCacheTimeout`
- [x] K. crash reporting — présent ? décision à formuler
- [x] L. hygiène du binaire — Hermes, nouvelle archi, dev-client, `console.*`
- [x] M. métadonnées (`store.config.json`)

## B. Permissions

Lues sur la **config résolue**, pas sur `app.json` — la distinction est le sujet du constat **03-01**.

| Plateforme | Permission / clé | Injectée par | Usage réel | Texte | Constat |
|---|---|---|---|---|---|
| iOS | `NSCameraUsageDescription` | plugin `expo-image-picker` (`app.json:44`) | ✅ `lib/photos.ts:29` `launchCameraAsync` | « Kyroz utilise l'appareil photo pour tes photos de progression (elles restent sur ton téléphone) » — précis, et la promesse « restent sur ton téléphone » est **vraie** (cf. étape 1, `@kyroz:weightPhotos` local) | ✅ |
| iOS | `NSPhotoLibraryUsageDescription` | idem | ✅ `lib/photos.ts:30` `launchImageLibraryAsync` | idem | ✅ |
| iOS | `NSAppTransportSecurity` | Expo | — | `NSAllowsArbitraryLoads: false` | ✅ ATS intact |
| iOS | `ITSAppUsesNonExemptEncryption: false` | `app.json:14` | — | — | ✅ section D satisfaite |
| Android | `INTERNET` | Expo | ✅ évident | — | ✅ |
| Android | `READ_EXTERNAL_STORAGE` | plugin `expo-image-picker` | ✅ lecture de la photothèque | — | ⚠️ legacy (Android 13+ attend `READ_MEDIA_IMAGES`) — **03-02** |
| Android | `WRITE_EXTERNAL_STORAGE` | plugin `expo-image-picker` | ❌ **aucun** — `lib/photos.ts` ne fait qu'ouvrir la caméra et la photothèque, rien n'écrit hors du bac à sable | — | 🔴 **03-02** |
| Android | ~~`RECORD_AUDIO`~~, ~~`SYSTEM_ALERT_WINDOW`~~ | retirées par `blockedPermissions` (`app.json:29-31`) | — | — | ✅ bonne hygiène, à étendre |

## SDK natifs présents

| SDK | Version | Manifeste privacy | Sous-traitant déclaré ? | Note |
|---|---|---|---|---|
| `react-native-purchases` (RevenueCat) | `^10.6.0` | ✅ `ios/Pods/RevenueCat/Sources/PrivacyInfo.xcprivacy` + `PurchasesHybridCommon` | ✅ oui | seul SDK tiers commercial embarqué |
| `expo-image-picker` | `~56.0.16` | fourni par Expo | s. o. | porte les 3 permissions ci-dessus |
| `expo-notifications` | `~56.0.16` | fourni par Expo | s. o. | usage réel : `lib/reminder.ts`, `lib/notifications.ts` |
| `expo-updates` | `~56.0.23` | fourni par Expo | s. o. | cf. section J / constat **03-03** |
| `@supabase/supabase-js` | `^2.108.2` | s. o. (JS pur) | ✅ oui | pas de pod |
| **PostHog** | — | s. o. | ✅ oui | 🟢 **il n'y a AUCUN SDK PostHog** : `lib/analytics.ts:184` fait un `fetch` direct vers `https://eu.i.posthog.com/capture/`. Rien à déclarer côté pod, rien à mettre à jour — et l'appel est éteint depuis le 2026-08-26 |

**Aucun SDK hors des trois sous-traitants déclarés.** `grep -IlE 'sentry|bugsnag|crashlytics|firebase'` → **0 fichier** ; `googleServicesFile` → `null` ; aucune dépendance `play-services-*`. 24 dépendances au total. Aucun écart documentaire à faire remonter à l'étape 9.

**Manifeste privacy de l'app** — présent, généré par le prebuild (`ios/Kyroz/PrivacyInfo.xcprivacy`, non versionné, régénéré à chaque build EAS) :

```
NSPrivacyTracking            false                        ✅
NSPrivacyTrackingDomains     (absent)                     ✅
NSPrivacyCollectedDataTypes  []                           ⚠️ cf. 03-06
NSPrivacyAccessedAPITypes    FileTimestamp   C617.1
                             UserDefaults    CA92.1
                             SystemBootTime  35F9.1       ✅ jeu par défaut d'Expo
```

## Décisions à prendre (pas des bugs)

| Sujet | Option A | Option B | Conséquences |
|---|---|---|---|
| **Crash reporting** (section K) | **Rester sans.** Aucun sous-traitant de plus, rien à ajouter à la politique, au registre RGPD ni au DPA. | **En poser un** (Sentry EU, self-host…). | A : **aucun diagnostic post-lancement** — un crash chez un testeur n'existe que s'il le raconte, et une V1 native sur un parc hétérogène est exactement le moment où ça compte. B : un **quatrième sous-traitant**, donc politique de confidentialité, base légale, région EU, DPA, et une entrée au registre — plus les source maps à téléverser à chaque build. ➡️ Décision fondateur, pas un constat. Formulée en **03-05**. |
| **`supportsTablet: true`** (section G) | Le garder — l'app est **testée sur iPad par le relecteur**. | Le passer à `false` → mode compatibilité iPhone. | Déjà **tranché et livré** : `useLayout()` partout, paysage ouvert sur iPad (`UISupportedInterfaceOrientations~ipad` porte les 4 orientations). Ce n'est pas une décision ouverte, c'est un engagement dont l'étape 5 doit vérifier la tenue. |
| **Politique `runtimeVersion`** (section J) | Garder `appVersion`. | Passer à `fingerprint`. | Développé en **03-03** : ce n'est pas un réglage neutre ici, parce que `expo.version` est **volontairement figée** pour ne pas couper la ligne OTA des testeurs. |

## Constats

### 03-01 `"permissions": []` ne vide rien — la config résolue en porte trois
> ✅ **CORRIGÉ le 2026-08-27** — et **la moitié de la reco était déjà écrite** :
> `npm run check:permissions` existait (produit pendant le contre-audit, sans que ce constat
> soit coché). Restait la déclaration trompeuse : `"permissions": []` a été retiré d'`app.json`
> après avoir mesuré la config résolue AVANT et APRÈS — identique au caractère près, il ne
> portait aucune information. Sans effet OTA (`runtimeVersion.policy` = `"appVersion"`).
> Garde-fou : `lib/__tests__/permissionsDeclarees.test.ts` (3 mutations). Fiche : `AGENTS.md` **A41**.
- **Sévérité : P1**
- **Preuve** : `app.json:26` déclare `"permissions": []`. La config **résolue** (`npx expo config --type introspect --json`) rend :
  ```
  android.permissions        ["READ_EXTERNAL_STORAGE","WRITE_EXTERNAL_STORAGE","INTERNET"]
  android.blockedPermissions ["RECORD_AUDIO","SYSTEM_ALERT_WINDOW"]
  ```
  Les trois viennent des plugins, pas du tableau. Le tableau vide **n'est pas une liste blanche** : il n'ajoute rien, il ne retire rien. Le seul levier qui retire est `blockedPermissions` — et il est utilisé, correctement, pour deux autres permissions.
- **Risque** : on croit avoir déclaré zéro permission alors qu'on en a trois. C'est aussi ce qui alimentera de travers le formulaire Data Safety (étape 9), qui doit décrire le manifeste **fusionné**, pas `app.json`.
- **Reco** : lire la liste sur la config résolue, jamais sur `app.json`, et rendre ce relevé reproductible (une ligne de `npm run` qui sort les permissions résolues, comme `check:migrations` sort le schéma réel).
- **Effort : S**

### 03-02 `WRITE_EXTERNAL_STORAGE` est déclarée sans aucun usage
- **Sévérité : P1**
- **Preuve** : présente dans la config résolue, injectée par le plugin `expo-image-picker`. `lib/photos.ts` n'appelle que `requestCameraPermissionsAsync` / `requestMediaLibraryPermissionsAsync` (`:16-17`) puis `launchCameraAsync` / `launchImageLibraryAsync` (`:29-30`) — **rien n'écrit hors du bac à sable de l'app**. Les photos vivent dans `@kyroz:weightPhotos` (AsyncStorage, cf. étape 1).
- **Risque** : Play interroge sur les permissions de stockage étendu, et une permission sans usage est une incohérence avec le formulaire Data Safety. `READ_EXTERNAL_STORAGE` est en outre **legacy** : depuis Android 13 c'est `READ_MEDIA_IMAGES` qui porte la lecture de la photothèque.
- **Reco** : ajouter `WRITE_EXTERNAL_STORAGE` à `blockedPermissions` (le mécanisme est déjà en place pour deux autres), et vérifier sur un manifeste fusionné que la lecture de la photothèque passe bien par `READ_MEDIA_IMAGES` sur Android 13+.
- **Effort : S**

### 03-03 `runtimeVersion: appVersion` sur une version délibérément figée : une OTA peut atterrir sur le mauvais binaire
> ✅ **CORRIGÉ le 2026-08-27** — fiche : `AGENTS.md` **A44**. `app.json` porte désormais
> `{ "policy": "fingerprint" }`, posé **dans le même lot que la montée en SDK 57** — la reco
> disait « fenêtre de bascule à choisir », la mesure dit qu'il n'y avait pas de choix : le SDK
> coupe la ligne OTA de toute façon, la politique décide seulement si la coupure se VOIT.
> ⚠️ Conséquence acceptée : le parc est figé sur la 25ᵉ OTA jusqu'au build (7), et la ligne se
> coupe désormais à CHAQUE changement de surface native (`CA-5-03`).
> ➡️ Garde-fou : `lib/__tests__/ligneOta.test.ts` (3 mutations).
- **Sévérité : P1**
- **Preuve** : `app.json:73` → `"runtimeVersion": { "policy": "appVersion" }`, et `version: "1.0.0"`. Tout binaire construit sous 1.0.0 partage donc **le même runtime**, quelle que soit sa surface native.
- **Ce qui rend le risque concret plutôt que théorique** : la consigne de sortie store est explicitement de **ne pas monter `expo.version`**, pour ne pas couper la ligne OTA vers les builds déjà chez les testeurs (`STORE-RELEASE.md:138`). La raison même pour laquelle la version est figée est ce qui empêche la policy `appVersion` de discriminer.
- **Scénario** : corriger **03-04** demande `expo-system-ui`, donc un module natif de plus, donc un nouveau binaire. L'ancien binaire (build 6, TestFlight) reste en runtime `1.0.0` — il **téléchargera** la première OTA postérieure et exécutera du JS qui appelle un natif qu'il ne contient pas. Symptôme : crash au lancement, chez les testeurs, sans rien de rouge côté build.
- **Reco** : passer à `"policy": "fingerprint"`. L'empreinte change quand la surface native change, donc un ancien binaire cesse simplement de recevoir les OTA incompatibles — au lieu de les recevoir et de tomber. ⚠️ Le changement de policy **modifie le runtime**, donc il coupe la ligne OTA une fois, volontairement : à faire au moment d'un nouveau binaire, pas entre deux.
- **Effort : S** (le réglage) · **M** (la fenêtre de bascule à choisir)

### 03-04 `userInterfaceStyle: "dark"` n'est pas appliqué sur Android — l'outil le dit à chaque exécution
- **Sévérité : P2**
- **Preuve** : `npx expo config --type introspect` écrit sur sa sortie d'erreur, **à chaque appel** :
  ```
  » android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
  ```
  `expo-system-ui` est **absent** de `package.json` (24 dépendances, vérifié). Côté iOS le réglage est bien résolu (`UIUserInterfaceStyle: "Dark"` dans l'`Info.plist` résolu) ; côté Android, rien.
- **Conséquence exacte, mesurée dans le code** : `useTheme()` (`constants/theme.ts:376-381`) résout `scheme = mode === 'system' ? system : mode`, avec `system = useColorScheme()`. Un choix manuel « clair » ou « sombre » **fonctionne partout** — ce n'est pas ce qui casse. C'est le **défaut** (`mode: 'system'`) qui diverge : sur iOS il vaut toujours `dark`, sur Android il suit le téléphone. **Le même produit s'ouvre en sombre chez un utilisateur iOS et en clair chez un utilisateur Android au thème clair.**
- **Risque** : cohérence de marque et captures d'écran, pas de rejet. C'est ce qui le maintient en P2.
- **Reco** : soit installer `expo-system-ui` et tenir l'intention déclarée, soit **retirer `userInterfaceStyle` de `app.json`** et assumer que Kyroz suit le système. Ce qu'il ne faut pas garder, c'est une déclaration qui n'agit que sur une plateforme sur deux.
- ⚠️ **Ce constat n'a coûté aucune recherche** : l'avertissement est imprimé par la commande de cadrage elle-même. Il était là avant cet audit.
- **Effort : S**

### 03-05 Aucun outil de diagnostic post-lancement — décision à prendre, pas défaut à corriger
- **Sévérité : P1** (le brief la classe ainsi : c'est une décision qui doit être prise **avant** le lancement public)
- **Preuve** : `git ls-files | xargs grep -IlE 'sentry|bugsnag|crashlytics|firebase'` → **0 fichier**. Aucune dépendance de report d'erreur. Le seul filet est `components/ErrorBoundary.tsx:42`, qui fait un `console.error` — visible nulle part en production.
- **Les deux branches, et leurs conséquences documentaires** : détaillées au tableau « Décisions à prendre » ci-dessus. Le point qui tranche n'est pas technique : poser un outil ajoute un **quatrième sous-traitant**, avec sa base légale, sa région et son entrée au registre RGPD — donc du travail à l'étape 9 ; ne pas en poser signifie qu'un crash chez un testeur n'existe que s'il le raconte.
- **Reco** : trancher explicitement et **écrire la décision**, quelle qu'elle soit. Une décision non écrite se re-prend tous les mois.
- **Effort : S** (décider) · **M** (l'option B, documentation comprise)

### 03-06 `NSPrivacyCollectedDataTypes` est vide, et il cessera d'être exact au lancement du paywall
- **Sévérité : P2**
- **Preuve** : `ios/Kyroz/PrivacyInfo.xcprivacy` (généré par le prebuild) déclare `<key>NSPrivacyCollectedDataTypes</key><array/>`.
- **Exact aujourd'hui** : PostHog est éteint (2026-08-26) et n'a de toute façon **aucun SDK** — c'est un `fetch` direct, donc rien à déclarer côté pod. RevenueCat embarque son propre manifeste. Et sans date de paywall, aucun achat n'est encaissé.
- **Faux dès que le paywall s'allume** : RevenueCat associe alors un identifiant d'app à un historique d'achats. Le manifeste de l'app devra le refléter, en même temps que le formulaire App Privacy.
- **Reco** : le mettre à jour **dans le même lot** que la pose de `PAYWALL_LAUNCH`, pas après. À rattacher à l'étape 7.
- **Effort : S**

### 03-07 `allowBackup` n'est déclaré nulle part — le défaut Android décide à la place
- **Sévérité : P2** (le fond est instruit en **01-04** ; ici c'est le constat de configuration)
- **Preuve** : config résolue → `android.allowBackup: null`. Aucun `android/` versionné (0 fichier) pour le contredire. Le défaut de la plateforme est `true`.
- **Risque** : les données de santé et le jeton de session partent dans les sauvegardes Google. C'est peut-être acceptable — mais personne ne l'a décidé, et le registre RGPD ne le dit pas.
- **Reco** : poser la valeur explicitement, dans un sens ou dans l'autre. Un défaut n'est pas une décision.
- **Effort : S**

### 03-08 Les métadonnées de store ne sont pas versionnées
- **Sévérité : P3**
- **Preuve** : pas de `store.config.json` (`ls` → absent), aucune configuration EAS Metadata.
- **Risque** : les URL de support, de politique de confidentialité et de CGU, la catégorie et la classification d'âge ne vivent que dans les consoles. Rien ne les relit, rien ne les compare aux textes du dépôt — c'est exactement la forme d'inventaire à deux endroits qui se confirme tout seul.
- **Reco** : versionner les métadonnées, ou acter qu'elles vivent dans les consoles et le dire. Le **contenu** est jugé à l'étape 10, pas ici.
- **Effort : M**

### 03-09 Le profil `production` ne déclare pas sa distribution
- **Sévérité : P3**
- **Preuve** : `eas.json` → `production` porte `channel`, `autoIncrement`, `environment`, `android.buildType`, mais **pas de `distribution`**. Les profils `preview` et `device` déclarent `internal` explicitement.
- **Risque** : nul en pratique — le défaut EAS est `store`, ce qui est la valeur voulue. Mais c'est le seul des quatre profils dont l'intention est implicite, et l'écart se lit comme un oubli plutôt que comme un défaut assumé.
- **Reco** : `"distribution": "store"` explicite. Aucun `credentialsSource` n'est posé non plus (défaut `remote`, correct), et **aucun fichier de credentials n'est versionné** : la clé App Store Connect est référencée hors du dépôt (`../../.eas-credentials/asc-api-key.p8`) ✅.
- **Effort : S**

## Checklist humaine

- [ ] Niveau target SDK exigé par Play à la date de soumission vs valeur résolue.
- [ ] Version Xcode minimale exigée par Apple à la date de soumission vs image EAS.
- [ ] Version de Play Billing exigée vs version de `react-native-purchases`.
- [ ] AASA / assetlinks hébergés et valides (si liens universels).
- [ ] Build TestFlight + build interne Play installés sur appareils réels (un iPhone récent, un Android bas de gamme).
- [ ] Formulaires App Store Connect / Play Console (App Privacy, Data Safety, déclaration Health) : traités en étape 9.

## Hors périmètre / non couvert

**Ce qui est propre et n'a pas produit de constat** — utile à savoir pour ne pas y revenir :
- **Identité définitive** : `app.kyroz.mobile` sur les deux plateformes, `scheme: "kyroz"` (ni `app` ni `myapp`), `version 1.0.0`, `appVersionSource: remote` + `autoIncrement` en production.
- **Tracking** : aucun `expo-tracking-transparency`, aucun appel ATT, aucun IDFA, aucun `NSUserTrackingUsageDescription`. `NSPrivacyTracking: false`, pas de `NSPrivacyTrackingDomains`. **Conforme à la politique publiée.**
- **Chiffrement** : `ITSAppUsesNonExemptEncryption: false` présent — la question bloquante de TestFlight ne se posera pas.
- **ATS** : `NSAllowsArbitraryLoads: false`, aucune URL `http://` dans le code (seuls les `xmlns` des SVG, qui ne sont pas des requêtes).
- **Firebase / Google Play Services** : `googleServicesFile: null`, aucune dépendance `play-services-*`.
- **Icône** : 1024 × 1024, **sans canal alpha** (`sips` → `hasAlpha: no`) — pas de rejet automatique. Adaptive icon Android complet : foreground, background, monochrome.
- **Hygiène du binaire** : pas d'`expo-dev-client` dans les dépendances, Hermes et la nouvelle architecture actifs par défaut en SDK 56 (`RCTNewArchEnabled: true` dans l'`Info.plist` résolu).
- **Deep links** : `associatedDomains: null`, `intentFilters: null` — **aucun lien universel**, donc aucun AASA ni assetlinks à héberger. Cohérent avec l'auth : la réinitialisation passe par un **code OTP**, pas par un lien de retour (mesuré à l'étape 1).

**Non couvert, à assumer :**
- **Le manifeste Android fusionné n'a pas été lu** : `android/` n'est pas versionné et aucun prebuild Android n'existe en local. La liste des permissions vient de la config résolue par Expo, qui est fidèle mais n'est pas le manifeste final. La liste définitive se constate sur un `npx expo prebuild -p android` ou sur l'AAB. → checklist humaine.
- **`targetSdkVersion` / `compileSdkVersion`** ne sont pas visibles dans la config introspectée (ils viennent des défauts du SDK 56). Leur valeur, et surtout le niveau **exigé par Play à la date de soumission**, sont en checklist humaine.
- **Alignement 16 Ko des bibliothèques natives** : non vérifiable sans build. `expo-doctor` n'est pas dans les devDependencies ; le seul SDK natif tiers est `react-native-purchases`. → checklist humaine.
- **Le prebuild iOS local date du 27 juillet** : `ios/PrivacyInfo.xcprivacy` a été lu pour savoir **ce qu'Expo génère**, pas pour attester ce que le prochain build EAS produira — EAS régénère à chaque fois. La valeur du constat 03-06 tient au contenu du modèle, pas à la fraîcheur du dossier.
- **Le contenu des fiches store** (titre, description, mots-clés, captures) : étape 10.
- **Les formulaires App Privacy / Data Safety / déclaration Health** : étape 9. **03-01** et **03-02** leur fournissent la liste de permissions réelle.
- **Edge-to-edge et insets** : `edgeToEdgeEnabled` n'est pas posé ; le rendu sous les barres système relève de l'étape 5.
