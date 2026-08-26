# Audit V1 — Étape 5 : Performance, accessibilité, robustesse
Date : 2026-08-26 · Commit audité : `ad4bf0b` · Périmètre : les **14 écrans** de `app/`, les **63** composants et hooks partagés, `constants/theme.ts`, et les sections transversales (A, C, D, F, I, J, L)

> Audit, pas fix. Aucun fichier de code modifié. Les contrastes sont **calculés** depuis le fichier de thème (script hors dépôt), le parsing numérique est **exécuté** contre le moteur réel.
> Issu de `docs/audit-v1/briefs/05-perf-a11y.md`.

## Reste à couvrir

- [x] A. saisie numérique — les 28 champs `decimal-pad` / `number-pad`
- [x] B. accessibilité — labels, rôles, états, Dynamic Type, contrastes, reduce motion
- [x] C. réseau et hors ligne — détection, délais, écritures pendant une coupure
- [x] D. états d'erreur et vides — `catch` silencieux, error boundary
- [x] E. formulaires et clavier
- [x] F. thème et modes — cohérence, couleurs hors thème
- [x] G. tailles d'écran
- [x] H. safe areas et edge-to-edge
- [x] I. performance — listes, données embarquées, effets
- [x] J. localisation numérique et dates
- [x] K. navigation et reprise
- [x] L. notifications

## Écran × critères

`✔` mesuré conforme · `✘` défaut constaté · `–` sans objet · `?` non instruit à cet écran

| Écran | A saisie | B a11y | C réseau | D erreurs | E clavier | H safe area | Constats |
|---|---|---|---|---|---|---|---|
| `(auth)/login.tsx` | – | ? | ✘ | ✔ | ✔ | ✔ | **05-03** |
| `(auth)/onboarding.tsx` | ✘ | ? | ✔ | ✔ | ✔ | ✔ | **05-01** |
| `(tabs)/plan.tsx` | – | ? | ✔ | ✔ | – | ✔ | — |
| `(tabs)/profil.tsx` | ✔ | ? | ✔ | ✔ | ✔ | ✔ | — |
| `(tabs)/courses.tsx` | ✔ | ? | ✔ | ✔ | ✔ | ✔ | — |
| `(tabs)/reserve.tsx` | ✘ | ? | ✔ | ✔ | ✔ | ✔ | **05-01** |
| `(tabs)/recettes.tsx` | – | ? | ✔ | ✔ | ✔ | ✔ | — |
| `kyroz-plus.tsx` · `avis.tsx` · `legal.tsx` · `methodologie.tsx` | – | ? | ✔ | ✔ | – | ✔ | — |
| `index.tsx` · `_layout.tsx` · `(tabs)/_layout.tsx` | – | – | – | ✔ | – | – | routeurs, sans surface |

⚠️ La colonne **B** est `?` partout **à dessein** : l'accessibilité n'a pas été instruite écran par écran, elle a été mesurée **transversalement** (constat **05-04**) et par le calcul de contraste ci-dessous. Un parcours VoiceOver / TalkBack reste en checklist humaine — c'est le seul contrôle qui dise la vérité, et il ne se simule pas depuis le dépôt.

## B. Contrastes du thème

Ratios WCAG 2.1 calculés depuis `constants/theme.ts`, les couleurs semi-transparentes étant **composées sur leur fond** avant mesure (un ratio calculé sur la couleur nominale mentirait).

### Thème SOMBRE — le défaut, et le seul servi sur iOS

| Rôle | Ratio | Verdict |
|---|---|---|
| `text` sur `bg` | **21,00:1** | ✅ |
| `text` sur `card` | **17,01:1** | ✅ |
| `textSecondary` sur `bg` | **6,36:1** | ✅ |
| `textSecondary` sur `card` | **5,95:1** | ✅ |
| `textTertiary` sur `bg` | 3,25:1 | ⚠️ grand texte seulement |
| `textTertiary` sur `card` | 3,40:1 | ⚠️ grand texte seulement |
| `textQuaternary` sur `card` | 2,11:1 | 🔴 (placeholders) |
| `onAccent` sur `accent` | **21,00:1** | ✅ |
| `success` / `warning` / `danger` sur `bg` | 11,79 / 11,14 / 8,09 | ✅ |

### Thème CLAIR — six paires sous le seuil

| Rôle | Ratio | Verdict |
|---|---|---|
| `text` sur `bg` | **15,25:1** | ✅ |
| `text` sur `card` | **17,01:1** | ✅ |
| `textSecondary` sur `bg` | **3,30:1** | 🔴 sous 4,5:1 |
| `textSecondary` sur `card` | **3,44:1** | 🔴 sous 4,5:1 |
| `textTertiary` sur `bg` / `card` | 2,18 / 2,24 | 🔴 |
| `textQuaternary` sur `card` | 1,60:1 | 🔴 |
| `success` sur `bg` | **2,81:1** | 🔴 |
| `warning` sur `bg` | **2,41:1** | 🔴 |
| `danger` sur `bg` | 3,43:1 | ⚠️ grand texte seulement |
| `success` / `warning` / `danger` sur `card` | 3,13 / 2,68 / 3,83 | ⚠️ / 🔴 / ⚠️ |

Constat **05-02**.

## Constats

### 05-01 La virgule décimale est traitée cinq fois sur sept — et l'oubli est dans l'inscription
- **Sévérité : P1** (le brief prescrit **P0** « plan faux, silencieux » ; je descends d'un cran et je dis pourquoi, ci-dessous)
- **Preuve, exécutée** : `parseFloat("72,5")` vaut **72** ; `parseFloat("178,5")` vaut **178** ; `parseFloat("0,5")` vaut **0** ; `parseFloat(",")` vaut **NaN**.
- **Où le motif correct est appliqué** — cinq fois, avec le `.replace(',', '.')` :
  `components/WeightCheckin.tsx:199` (la pesée) · `app/(tabs)/courses.tsx:402` (le « + », avec un commentaire qui explique le piège) · `components/BodyFatPicker.tsx:200` et `:214` (le %MG) · `app/(tabs)/profil.tsx:1161` (le poids cible) · `components/RecipeEditor.tsx:25`.
- **Où il manque** — deux fois, et les champs qui alimentent sont bien en `decimal-pad`, donc **la touche virgule est présente sur un clavier français** :
  1. `app/(auth)/onboarding.tsx:191` — `const wN = parseFloat(weight), hN = parseFloat(height);`, alimentés par les champs `:453` (**Poids**) et `:454` (**Taille**) ;
  2. `app/(tabs)/reserve.tsx:106` et `:129` — `parseFloat(qty)` / `parseFloat(editQty)`, alimentés par `:348` et `:369` (**Quantité**).
- **Pourquoi P1 et non P0 — la magnitude a été MESURÉE, pas supposée** : femme 32 ans, sèche, saisie « 72,5 kg / 178,5 cm » contre ce que le moteur reçoit réellement (72 / 178) :
  ```
  intention 72,5 / 178,5 → TDEE 1976 · cible 1676 · protéines 128 g
  réalité   72   / 178   → TDEE 1966 · cible 1666 · protéines 128 g
  ```
  **10 kcal/j**, protéines inchangées. Ce n'est pas un « plan faux » : c'est un plan très légèrement décalé. Le brief présumait une conséquence que la mesure ne confirme pas.
- **Ce qui reste sérieux, en revanche** : (a) c'est **silencieux** — rien n'indique que le demi-kilo a été jeté ; (b) sur la **réserve**, « 0,5 kg » devient **0**, soit 100 % d'erreur sur une quantité de courses ; (c) l'inscription est le seul écran que **tout le monde** traverse.
- **Ce qui empêche le pire** : les bornes de l'étape 2 de l'inscription (`onboarding.tsx:196-199`, `wN >= 30 && wN <= 300`) rejettent `NaN` — une saisie réduite à une virgule **bloque** l'étape au lieu de propager `NaN` dans le moteur. La branche P0 de l'étape 2 (constat 02-02) n'est donc **pas** atteignable par ce chemin.
- **Reco** : ne pas ajouter un sixième `.replace(',', '.')`. Le motif est recopié **cinq fois** et oublié deux : c'est la signature d'un garde-fou qui vit chez l'appelant. Le mettre dans `Field` (`components/ui.tsx:119`, qui est déjà le point de passage unique de tous ces champs) ou dans un `parseNombre()` partagé — puis un test qui **compte** les `parseFloat` non protégés.
- **Effort : S**

### 05-02 Le thème clair a six paires de contraste sous le seuil, dont les couleurs qui portent un sens
- **Sévérité : P1**
- **Preuve** : tableau ci-dessus. `textSecondary` — le rôle de texte secondaire le plus utilisé de l'app — plafonne à **3,30:1 sur `bg`** et **3,44:1 sur `card`**, sous les 4,5:1 exigés pour du texte normal. `success` tombe à **2,81:1** et `warning` à **2,41:1** sur le fond principal.
- **Ce qui aggrave, et qui vient d'une autre étape** : le thème clair n'est pas un mode marginal. Le constat **03-04** a établi que `userInterfaceStyle: "dark"` **n'est pas appliqué sur Android** (`expo-system-ui` absent) : un utilisateur Android au téléphone en thème clair reçoit donc **par défaut** le thème qui a six paires en échec. Les deux constats se composent — corriger 03-04 réduirait l'exposition, corriger celui-ci la supprimerait.
- **Le cas `warning` / `success` est le plus gênant** : ce sont des couleurs **sémantiques**. Un état signalé à 2,41:1 n'est pas un défaut d'esthétique, c'est une information que certains utilisateurs ne reçoivent pas.
- **À noter, côté sombre** : le défaut tient bien (`text` 21:1, `textSecondary` 6,36:1). Seuls `textTertiary` (3,25:1) et `textQuaternary` (2,11:1, placeholders) passent sous le seuil — acceptable pour du texte de grande taille, à vérifier au cas par cas.
- **Reco** : remonter l'opacité de `textSecondary` et `textTertiary` en clair, et **redessiner `success` et `warning`** pour le fond clair — ce sont des teintes iOS choisies pour du texte sur fond blanc, pas sur `#F2F2F7`. Le calcul est reproductible : le script de mesure tient en 25 lignes et pourrait devenir un test.
- **Effort : M**

### 05-03 Aucun délai applicatif sur les appels d'authentification : le spinner peut ne jamais s'arrêter
- **Sévérité : P1** (le brief : « spinner infini = P1 »)
- **Preuve** : `withBudget(...)` n'est appliqué qu'à **deux** endroits, tous deux au démarrage — `hooks/useAuth.tsx:86` (`getSession`) et `:114` (l'hydratation cloud). Aucun des appels **interactifs** n'est borné : `signInWithPassword` (`:154`), `signUp` (`:160`), `resetPasswordForEmail` (`:212`), `verifyOtp` (`:191`), `updateUser` (`:220`), ni `deleteAccount` (`lib/sync.ts:506`). `fetch` en React Native n'a **pas** de délai applicatif par défaut, et aucun `AbortController` n'existe dans le dépôt.
- **Conséquence** : sur un réseau mort ou très lent, appuyer sur « Se connecter » pose `busy = true` (`login.tsx:75`) et laisse l'écran attendre le comportement interne de Supabase, sans borne. Idem pour la suppression de compte, où l'attente est **plus anxiogène**.
- **Ce qui est bien fait, et qui rend l'omission d'autant plus visible** : le chemin de démarrage, lui, est irréprochable — `withBudget` libère l'écran, se replie sur la session enregistrée localement, et `onAuthStateChange` corrige dès que le réseau répond. **Le bon motif existe dans le fichier ; il n'a pas été étendu aux appels que l'utilisateur déclenche.** Même forme que 05-01.
- **Reco** : envelopper les appels interactifs dans le même `withBudget`, avec un message honnête au dépassement (« le réseau ne répond pas, réessaie »), plutôt qu'un spinner sans fin.
- **Effort : S**

### 05-04 L'accessibilité est amorcée, pas couverte
- **Sévérité : P1**
- **Preuve, comptée sur `app/` et `components/`** :
  | Attribut | Occurrences | Fichiers |
  |---|---|---|
  | `accessibilityLabel` | **25** | 14 |
  | `accessibilityRole` | **33** | 18 |
  | `accessibilityState` | **4** | 4 |
  | `accessibilityHint` | **0** | 0 |
  | `importantForAccessibility` | 1 | 1 |
  | *pressables au total* | **154** | — |
- **Lecture honnête du chiffre** : 25 labels pour 154 pressables **ne veut pas dire 129 boutons inaccessibles** — un pressable qui contient un texte visible est annoncé par ce texte. Le déficit réel porte sur les boutons **à icône seule** et sur les états : `accessibilityState` n'est posé que **4 fois**, alors que l'app est pleine de sélecteurs, de bascules et de repas cochés — précisément ce qu'un lecteur d'écran doit pouvoir annoncer comme « sélectionné » ou « coché ».
- **Ce qui est déjà bon, et mérite d'être dit** : **aucun `allowFontScaling={false}`** dans tout le dépôt — le Dynamic Type n'est bridé nulle part, ce qui est le défaut le plus fréquent et le plus grave sur ce terrain. Et `AccessibilityInfo.isReduceMotionEnabled` est **respecté** (`lib/reduceMotion.ts:59`, consommé par `ActionSheet` et `Segmented`).
- **Reco** : couvrir en priorité les états (`accessibilityState` sur `Segmented`, les cases de repas, les sélecteurs de jours), puis les boutons à icône seule. Le reste se juge au parcours VoiceOver / TalkBack — qui reste la seule mesure valable et qui est en checklist humaine.
- **Effort : M**

### 05-05 Aucune détection de connectivité : l'app ne sait pas dire qu'elle est hors ligne
- **Sévérité : P2**
- **Preuve** : aucun `NetInfo`, aucun `isConnected` dans le dépôt. Aucun texte d'interface ne contient « hors ligne » ou « connexion perdue ». Les deux seuls fichiers qui traitent l'indisponibilité réseau sont `hooks/useAuth.tsx` et `lib/boot.ts`, via des budgets de temps.
- **Pourquoi P2 et non P1** : l'architecture est **offline-first et le fait bien**. Le moteur est local, le plan se génère sans réseau, les écritures ne sont pas perdues — elles sont marquées « à pousser » (`markProfileDirty`, `lib/sync.ts:200`) et repoussées plus tard, et le démarrage se replie sur la session enregistrée. Rien n'est perdu silencieusement. Ce qui manque n'est pas la robustesse, c'est **le mot** : l'utilisateur ne sait jamais que ses données ne sont pas encore synchronisées.
- **Reco** : un indicateur discret de synchronisation en attente, plutôt qu'une bannière « hors ligne ». Le comportement est déjà juste ; c'est l'information qui manque.
- **Effort : M**

### 05-06 Vingt-neuf `catch {}` vides — délibérés, mais indistinguables des oublis
- **Sévérité : P3**
- **Preuve** : 29 occurrences dans le code embarqué, réparties ainsi : `lib/sync.ts` **13**, `components/GuidedTour.tsx` 4, `lib/notifications.ts` 4, `hooks/useAuth.tsx` 3, `lib/shoppingRemoved.ts` 2, `hooks/useProfile.ts` 1, `lib/analytics.ts` 1, `lib/shoppingAjouts.ts` 1.
- **Pourquoi P3 et non P1** : l'échantillon lu montre qu'ils sont **volontaires et documentés**. `lib/sync.ts:92-94` écrit noir sur blanc : « Un push est best-effort et le RESTE : rien dans cette section ne change un flux de contrôle […]. On rend l'échec AUDIBLE, parce qu'il était totalement muet ». Le `catch {}` de `markProfileDirty` (`:200`) protège une écriture de drapeau dont l'échec est déjà couvert par le drapeau lui-même. Ce ne sont pas des erreurs avalées dans un chemin utilisateur.
- **Ce qui reste vrai** : un `catch {}` intentionnel et un `catch {}` oublié s'écrivent exactement pareil. Le jour où un vingt-neuvième s'ajoute par étourderie, rien ne le distinguera.
- **Reco** : `catch { /* … */ }` avec une raison d'une ligne, ou un helper `ignorer()` nommé. Le coût est nul et la relecture devient possible.
- **Effort : S**

### 05-07 `expo-image` n'est pas utilisé pour les images embarquées
- **Sévérité : P3**
- **Preuve** : `expo-image` n'est pas dans les 24 dépendances (étape 4). Les silhouettes de masse grasse sont servies par le `Image` de React Native.
- **Risque** : faible — ce sont des assets locaux, pas des images distantes, donc ni cache réseau ni décodage progressif à gagner. Le poids réel est celui des fichiers (11 Mo d'assets, cf. étape 4).
- **Reco** : ne rien changer sans une mesure de démarrage à froid. C'est la checklist humaine qui tranche.
- **Effort : S**

## Checklist humaine

Les six contrôles du brief, tous maintenus — **aucun n'est simulable depuis le dépôt** :

- [ ] **Parcours complet VoiceOver (iOS) et TalkBack (Android)** — le seul contrôle qui dise la vérité sur **05-04**. Les compteurs d'attributs ne remplacent pas un parcours.
- [ ] **Dynamic Type au maximum + gras, chaque écran** : chercher les troncatures. Le dépôt est propre côté `allowFontScaling`, mais 8 fichiers utilisent `numberOfLines` — ce sont les candidats.
- [ ] **Mode avion en plein onboarding, puis retour réseau** : vérifier que la saisie est conservée et que la synchro rattrape.
- [ ] **Android bas de gamme : démarrage à froid chronométré** (> 3 s = P1). C'est ce contrôle qui tranche **04-04** (bundle à 5,95 Mo) et **05-07**.
- [ ] **iPad et iPhone SE** : `supportsTablet: true` est un engagement pris (étape 3), donc le relecteur Apple ouvrira l'app sur iPad.
- [ ] **Clavier français, saisir « 72,5 » dans chaque champ numérique** — la vérification directe de **05-01**, y compris dans les cinq champs déjà protégés, pour confirmer qu'ils le sont vraiment à l'écran et pas seulement dans le code.

## Hors périmètre / non couvert

**Ce qui est propre et n'a produit aucun constat :**
- **Safe areas** : `SafeAreaView` ou `useSafeAreaInsets` sur **11 écrans sur 14** — les trois manquants (`index.tsx`, `_layout.tsx`, `(tabs)/_layout.tsx`) sont des routeurs sans surface propre.
- **Error boundary global** : présente et branchée à la racine (`app/_layout.tsx:19`).
- **Listes longues** : `FlatList` sur les recettes et les courses. Aucun `ScrollView` + `map` sur une collection non bornée.
- **Couleurs hors thème** : **2 occurrences** seulement, dans 2 fichiers (`BirthdayCelebration.tsx`, `Materiau.tsx`) — discipline de thème remarquable pour 63 composants.
- **Localisation numérique** : `frnum()` (`lib/units.ts:12`) formate au séparateur français, avec un commentaire qui raconte le bug d'origine (« 113.5 kg » affiché) et interdit explicitement un neuvième formateur privé.
- **Notifications** : la permission est demandée **au moment de programmer un rappel** (`lib/notifications.ts:98`), jamais au lancement — et un commentaire (`:128`) met en garde contre l'idée de la brancher au démarrage. Le contenu des rappels ne porte **aucune donnée de santé** : « Ta pesée du jour », « Note ton poids » — jamais un poids, jamais une calorie. Rien de sensible sur un écran verrouillé.
- **Reduce motion** : respecté (`lib/reduceMotion.ts`).

**Non couvert, à assumer :**
- **L'accessibilité écran par écran** : mesurée transversalement, pas parcourue. La colonne B du tableau est `?` à dessein plutôt que faussement `✔`.
- **Les cibles tactiles ≥ 44 pt** ne sont pas re-mesurées ici : elles font l'objet d'une sonde dédiée dans le dépôt, dont l'étape 2 a montré qu'elle avait été corrigée le 2026-08-26 (E64, six boutons remontés). Re-mesurer aurait dupliqué un contrôle existant — c'est la règle « outil avant modèle ».
- **Le démarrage à froid, la fluidité des listes, la consommation mémoire** : non mesurables depuis le dépôt. Tout est en checklist humaine, et c'est là que le bundle de 5,95 Mo (04-04) et la régression mémoire Hermes (04-01) se jugeront réellement.
- **Le comportement multi-appareils** (dernier écrit gagne) : instruit à l'étape 1, où il a produit le P0 **01-01**. Non re-instruit ici.
- **Les tailles d'écran** (section G) : aucune largeur figée problématique n'a été cherchée exhaustivement ; `useLayout()` est présent partout d'après la décision tablette, mais sa tenue se constate sur appareil.
