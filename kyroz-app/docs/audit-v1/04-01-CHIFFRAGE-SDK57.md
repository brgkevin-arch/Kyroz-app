# 04-01 · Chiffrage de la montée en SDK 57 — **mesuré, pas estimé**
Date : 2026-08-26 · Base : `c9a53ff` · Méthode : worktree jetable, `npx expo install expo@^57.0.9 --fix`, puis les contrôles du dépôt. Le worktree a été retiré ; **rien n'a été modifié dans l'arbre de travail**.

## Le résultat, en une ligne

**La montée est propre côté JavaScript.** Tout ce que le dépôt sait mesurer passe.

| Contrôle | Avant (SDK 56) | Après (SDK 57) |
|---|---|---|
| `expo` | `~56.0.12` | **`^57.0.9`** |
| `react-native` | `0.85.3` | **`0.86.3`** ← contient le Hermes corrigé |
| Erreurs `tsc` | 0 | **0** |
| Tests | 1 835 verts | **1 835 verts**, 117 fichiers |
| `expo-doctor` | **2 checks en échec** (régression mémoire Hermes + 10 paquets dérivants) | **21/21 — « No issues detected! »** |

**Les deux checks en échec de l'étape 4 disparaissent d'un coup** : la régression Hermes (04-01) parce que RN 0.86.3 embarque le moteur corrigé, et la dérive des dix paquets (04-05) parce que `--fix` les réaligne.

## Ce que la montée touche

`package.json` : **13 dépendances** déplacées, aucune retirée, aucune ajoutée.

```
@expo/metro-runtime  ^56.0.13 → ~57.0.14      expo-notifications  ~56.0.16 → ~57.0.15
expo                 ~56.0.12 → ^57.0.9       expo-router         ~56.2.8  → ~57.0.17
expo-constants       ~56.0.16 → ~57.0.15      expo-splash-screen  ~56.0.13 → ~57.0.8
expo-font            ~56.0.7  → ~57.0.1       expo-status-bar     ~56.0.4  → ~57.0.1
expo-haptics         ~56.0.3  → ~57.0.2       expo-updates        ~56.0.23 → ~57.0.18
expo-image-picker    ~56.0.16 → ~57.0.14      react-native        0.85.3   → 0.86.3
expo-linking         ~56.0.13 → ~57.0.8       react-native-screens 4.25.2  → ~4.26.0
```

`react`, `react-dom`, `@supabase/supabase-js`, `react-native-purchases`, `react-native-svg`, `react-native-safe-area-context`, `react-native-web` : **inchangés**. Le lockfile bouge de 1 269 insertions / 700 suppressions.

## Ce que ce chiffrage ne dit PAS

Trois choses, et il faut les nommer parce qu'un « 21/21 » invite à conclure trop vite.

1. **Le build natif n'a pas été fait.** Toute la mesure est JS. `expo prebuild` + `pod install` + compilation Xcode peuvent échouer là où `tsc` et vitest passent — c'est exactement ce qui distingue une montée de SDK d'une montée de paquet.
2. **Rien n'a tourné sur un appareil.** Le comportement runtime de RN 0.86 (nouvelle architecture, gestes, `expo-router` 57) ne se lit pas dans une suite de tests unitaires.
3. **La ligne OTA se coupe.** Un nouveau binaire en SDK 57 a une surface native différente ; avec `runtimeVersion: appVersion` figée à `1.0.0` (constat **03-03**), les anciens binaires **recevraient quand même** les OTA suivantes. ➡️ **La bascule vers `fingerprint` doit se faire dans le MÊME lot**, pas après.

## Ce que ça change pour la décision A

Le chiffrage retire l'inconnue principale : **la montée ne casse rien de ce qui est testé**. Ce qui reste à payer est le build natif et le re-test sur appareil — soit exactement ce qu'il faudra faire de toute façon pour la capture de review des quatre abonnements (constat **07-01**).

➡️ **Les six constats du lot « prochain binaire » se paient donc ensemble, et le SDK 57 n'ajoute pas de risque propre** : il ajoute une compilation à un build qu'il faut faire.

**Ordre suggéré, une seule fenêtre :**

| # | Geste | Constat |
|---|---|---|
| 1 | `npx expo install expo@^57.0.9 --fix` | 04-01, 04-05 |
| 2 | `runtimeVersion` → `fingerprint` | 03-03 |
| 3 | `WRITE_EXTERNAL_STORAGE` → `blockedPermissions` | 03-02 |
| 4 | `expo-system-ui` (ou retirer `userInterfaceStyle`) | 03-04 |
| 5 | Trancher le crash reporting — **avant** le build, pas après | 03-05 |
| 6 | `eas build` + captures de review des 4 abonnements | 07-01 |

⚠️ Le geste 5 est le seul qui ne soit pas mécanique. S'il n'est pas tranché avant, il faudra un septième build.
