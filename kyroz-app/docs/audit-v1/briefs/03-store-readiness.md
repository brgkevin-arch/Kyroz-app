# Brief — Étape 3 : Store readiness technique

Mission : tout ce qui, dans la config et les assets, fait rejeter un binaire ou déclenche des questions à la review, indépendamment du contenu de l'app.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ». Exception : `npx expo config --type introspect` avec sortie dans `/tmp`.
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier ou section traité : écris les constats, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si tu ne peux pas conclure, écris ce qui bloque.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 03 store readiness"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 03 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Contexte produit

- Pas de tracking cross-app, pas d'attribution : aucun SDK ne doit déclencher App Tracking Transparency, aucune permission ne doit être déclarée sans usage réel.
- Sous-traitants déclarés dans la politique de confidentialité : Supabase, PostHog, RevenueCat. Tout SDK supplémentaire trouvé ici est un écart documentaire à faire remonter (jugé en étape 9).
- App en français, acquisition organique. La question tablette est une décision (section G), pas un bug.

## Cadrage

```bash
git rev-parse --short HEAD
git ls-files | grep -E '(^|/)(app\.json|app\.config\.(js|ts)|eas\.json|package\.json|metro\.config\.js|babel\.config\.js|store\.config\.json)$'
git ls-files | grep -E '^(ios|android)/'                       # prebuild committé ?
git ls-files | grep -E '^assets/'
mkdir -p /tmp/kyroz-audit && npx expo config --type introspect > /tmp/kyroz-audit/config.json   # config native résolue, plugins inclus
git ls-files | xargs grep -IlE 'expo-tracking-transparency|requestTrackingPermissions|NSUserTrackingUsageDescription'
git ls-files | xargs grep -IlE 'sentry|bugsnag|crashlytics|firebase'
```

Périmètre : ces fichiers + `/tmp/kyroz-audit/config.json`. Si `ios/` ou `android/` sont committés : `Info.plist`, `PrivacyInfo.xcprivacy`, `AndroidManifest.xml`, `app/build.gradle`.

## Grille de contrôle

### A. Identité et versions

`bundleIdentifier` / `package` définitifs (impossibles à changer après publication) ; `version` ; `buildNumber` / `versionCode` gérés (`appVersionSource`, `autoIncrement` EAS) ; `scheme` unique et non générique. Scheme générique (`app`, `myapp`) = **P1**.

### B. Permissions

Depuis la config résolue : liste chaque `NS*UsageDescription` iOS et chaque permission Android, avec le plugin ou la ligne qui l'injecte. Pour chacune : usage réel dans le code (`fichier:ligne`) ou aucun. Permission déclarée sans usage = **P1** (questions à la review, incohérence avec Data Safety). Texte d'usage vague ou malhonnête = **P1**. `blockedPermissions` utilisé pour retirer celles injectées par défaut et inutiles ?

### C. Manifeste privacy iOS

`ios.privacyManifests` présent ? `NSPrivacyTracking` = false, aucun `NSPrivacyTrackingDomains`. `NSPrivacyAccessedAPITypes` couvre les API à raison requise utilisées par l'app (UserDefaults, timestamps fichiers, etc. — Expo fournit un jeu par défaut). Liste les SDK natifs présents (RevenueCat, PostHog…) avec leur version ; leur manifeste est embarqué dans leur pod. Manifeste absent ou incomplet = **P1** (rejet possible à l'upload).

### D. Chiffrement

`ios.config.usesNonExemptEncryption: false` présent (HTTPS uniquement = exemption). Absent = **P2** (question bloquante à chaque build TestFlight).

### E. Tracking

Dépendance `expo-tracking-transparency` présente = **P1** (à retirer). Appel ATT ou lecture IDFA = **P0** (contredit la politique publiée).

### F. Android

`targetSdkVersion` / `compileSdkVersion` résolus (la valeur exigée par Play à la date de soumission est en checklist humaine) ; alignement 16 KB des libs natives (`expo-doctor` le signale ; sinon liste les modules natifs hors Expo) ; `allowBackup` (valeur + décision, cohérent avec l'étape 1) ; `usesCleartextTraffic` false ; edge-to-edge activé et insets gérés (détail en étape 5) ; `googleServicesFile` et dépendances `play-services-*` absents (aucun Firebase attendu).

### G. Assets et présentation

Icône : 1024 × 1024, sans canal alpha (rejet automatique sinon) ; adaptive icon Android (foreground dans la zone sûre, background) ; splash lisible, variante sombre si `userInterfaceStyle` ≠ `light` ; `supportsTablet` : si `true`, l'app est testée sur iPad à la review (layouts à assumer, cf. étape 5), si `false`, mode compatibilité — note la valeur et le risque, c'est une décision ; `orientation` verrouillée ?

### H. Deep links

`scheme`, `associatedDomains` / `intentFilters`. Si liens universels : fichiers AASA et assetlinks à héberger sur kyroz.app (checklist humaine). Magic links Supabase : l'URL de redirection pointe-t-elle vers le scheme de l'app ?

### I. EAS

Profils `development` / `preview` / `production` ; `distribution: store` en prod ; `env` par profil (aucun secret) ; `channel` par profil ; `image` de build (version Xcode ≥ minimum exigé par Apple à la date de soumission — checklist humaine) ; `credentialsSource` ; aucun fichier de credentials committé.

### J. OTA (`expo-updates`)

Présent ? `runtimeVersion` : policy `fingerprint` attendue (une update JS sur un binaire natif incompatible = crash au lancement). Policy `appVersion` ou string figée = **P1**. `checkAutomatically`, `fallbackToCacheTimeout`. Rappel : une update OTA ne doit pas changer la finalité de l'app (Apple 3.3.1(B)), note seulement.

### K. Crash reporting

Présent ? Si absent, ce n'est pas une reco d'installer un outil. C'est une **décision à prendre (P1)** : sans crash reporter, aucun diagnostic post-lancement ; avec, un sous-traitant de plus (politique de confidentialité, DPA, base légale, région EU). Formule les deux options et leurs conséquences documentaires.

### L. Hygiène du binaire

`jsEngine` Hermes ; `newArchEnabled` (valeur + modules natifs compatibles) ; `expo-dev-client` absent du build de prod ; `console.*` retirés en prod ; source maps (si crash reporter).

### M. Métadonnées dans le repo

`store.config.json` (EAS Metadata) présent ? Si oui : URLs support / politique de confidentialité / CGU présentes, catégorie, âge. Le contenu (honnêteté, mots-clés) est jugé en étape 10, pas ici.

## Checklist humaine

- [ ] Niveau target SDK exigé par Play à la date de soumission vs valeur résolue.
- [ ] Version Xcode minimale exigée par Apple à la date de soumission vs image EAS.
- [ ] Version de Play Billing exigée vs version de `react-native-purchases`.
- [ ] AASA / assetlinks hébergés et valides (si liens universels).
- [ ] Build TestFlight + build interne Play installés sur appareils réels (un iPhone récent, un Android bas de gamme).
- [ ] Formulaires App Store Connect / Play Console (App Privacy, Data Safety, déclaration Health) : traités en étape 9.

## Sortie : `docs/audit-v1/03-store-readiness.md`

```markdown
# Audit V1 — Étape 3 : Store readiness technique
Date : … · Commit audité : … · Périmètre : …

## Reste à couvrir
- [ ] …

## B. Permissions
| Plateforme | Permission | Injectée par | Usage réel (fichier:ligne) | Texte d'usage | Constat |

## SDK natifs présents
| SDK | Version | Manifeste privacy | Sous-traitant déclaré ? | Note |

## Décisions à prendre (pas des bugs)
| Sujet | Option A | Option B | Conséquences |

## Constats
### 03-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Reprise

Session coupée : lis la sortie existante, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
