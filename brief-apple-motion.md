# Brief — mettre Kyroz aux normes Apple

> Écrit le 2026-08-10, pour la session suivante. Les chiffres viennent d'un
> inventaire fait ce jour-là sur `main` ; **les re-compter avant de les citer**.

## La bonne nouvelle d'abord : la moitié du travail est déjà faite

Il faut distinguer deux moitiés dans « les normes Apple », parce qu'elles sont dans
des états opposés.

| | état |
|---|---|
| **Ce qui ne bouge pas** — couleur, rayon, typographie, espacement, trait, icône, cible tactile 44 pt | ✅ **FAIT**, et tenu par 6 tests de garde-fou (`rayonsDA`, `typoDA`, `espacementDA`, `finitionsDA`, `accentColor`, `emojiInterface`) |
| **Ce qui bouge et ce qui se sent** — mouvement, geste, retour au toucher, accessibilité du mouvement | 🔴 **QUASI VIERGE** |

➡️ **Le chantier n'est donc PAS une refonte visuelle.** Toute session qui repart sur
les couleurs ou les espacements refait un travail terminé et fera rougir des tests.
Le sujet, c'est **le mouvement, le geste et l'haptique**.

## Le point de départ, mesuré le 2026-08-10

- **7 fichiers sur 60** (`app/` + `components/`) animent quoi que ce soit. Les 53 autres
  n'ont aucun mouvement : ni entrée de liste, ni transition d'écran, ni changement d'état.
- **Aucun ressort ne pilote une ouverture ni une fermeture.** Les 8 `Animated.spring` du
  dépôt sont : 3 « pop » d'entrée sur les célébrations, et **5 fois exactement le même
  rattrapage** (`toValue: 0, bounciness: 2`) qui remonte une feuille quand le glissement
  n'a pas suffi. Les feuilles s'ouvrent et se ferment en `Animated.timing` à **durée
  fixe** — 300 ms à l'aller, 240 ms au retour.
- **La vitesse du doigt est lue puis jetée.** `Sheet.tsx:111` teste `g.vy > 0.4` pour
  décider *si* on ferme — mais la sortie qui suit dure 240 ms, qu'on ait effleuré ou
  balancé la feuille d'un coup sec. C'est l'écart Apple le plus visible : chez Apple, le
  mouvement **hérite de la vitesse** du geste au lieu de la constater.
- **Aucun caoutchouc.** Tirer une feuille vers le HAUT ne fait rien (`if (g.dy > 0)`,
  `Sheet.tsx:109`) : elle est morte au doigt au lieu de résister.
- **0 haptique.** Aucun `expo-haptics`, nulle part.
- **0 prise en compte de « Réduire les animations »** (`AccessibilityInfo.isReduceMotionEnabled`
  n'apparaît dans aucun fichier). C'est un réglage d'accessibilité iOS que l'app ignore
  aujourd'hui complètement.
- **288 `TouchableOpacity` contre 10 `Pressable`.** Le seul retour à l'appui est
  `OPACITE_PRESSION` (0,7). Un bouton Apple s'enfonce (échelle), il ne pâlit pas.

## La décision à prendre AVANT d'écrire une ligne

**Aucune** des briques de mouvement Apple n'est installée — vérifié, elles ne sont même
pas là en transitif :

| | absent | ce qu'elle apporterait |
|---|---|---|
| `react-native-reanimated` | ❌ | ressorts sur le fil d'animation natif, interruptibles |
| `react-native-gesture-handler` | ❌ | gestes natifs, vitesse, gestes simultanés |
| `expo-haptics` | ❌ | le retour au doigt |
| `expo-blur` | ❌ | matériaux translucides (déjà écarté une fois pour la barre de titre) |

Ce sont **quatre dépendances natives**. CLAUDE.md §2 est clair : le natif ne passe pas
par OTA — il faut un nouveau build, et il coupe la ligne OTA vers les anciens binaires.

**Ma recommandation : viser le build, pas le contournement.** Deux raisons mesurables :

1. **Un build 1.0.0 (4) est déjà prévu** (AGENTS.md, ligne « OTA publiées » : les testeurs
   sur le build 3 n'ont ni la passe émoji ni la refonte du Profil). Les dépendances
   natives montent donc dans un train **déjà à quai**.
2. **La revue bêta est acquise depuis le 2026-08-03** — les builds suivants passent sans
   repasser par Apple. Le coût est donc *un build*, pas *une revue*.

⚠️ **À confirmer contre `TESTFLIGHT.md` en début de session** avant de s'engager : je
n'ai vérifié ces deux points que dans AGENTS.md, pas sur le compte Apple.

**Si le fondateur préfère rester en OTA pur**, il reste du travail réel et non
négligeable — vitesse injectée dans les durées, caoutchouc, `Pressable` avec échelle,
respect de « Réduire les animations » — tout ça se fait avec l'`Animated` déjà en place.
Ce serait un demi-pas honnête. Le ressort interruptible, lui, ne s'obtient pas sans
Reanimated.

## Les skills à utiliser, dans cet ordre

Ils sont installés globalement dans `~/.agents/skills/` (liens dans `~/.claude/skills/`).

1. **`apple-design`** — la référence. À charger en premier, c'est lui qui définit la
   barre : ressorts, vitesse héritée, interruptibilité, matériaux, typographie optique.
2. **`improve-animations`** — l'outil taillé pour ce chantier : il survole tout le code
   de mouvement et rend un **audit priorisé + des plans d'implémentation** exécutables
   ensuite. Il ne touche à rien. C'est l'étape 1 du travail réel.
3. **`find-animation-opportunities`** — pour les 53 fichiers qui n'animent rien. Attention,
   sa valeur est dans ce qu'il REFUSE : sa prémisse est « souvent, la meilleure animation
   est l'absence d'animation ». Ne pas le laisser saupoudrer du mouvement partout.
4. **`animate`** — pour écrire chaque correctif.
5. **`review-animations`** — en fin de chantier, sur le diff. Invocation manuelle
   obligatoire (il ne se déclenche jamais seul).

`emil-design-eng`, `animation-vocabulary`, `pick-ui-library` et `prototype` sont là si
besoin, pas dans le chemin principal.

## Les pièges de vérification — ils sont tous documentés et ils mordent tous ici

Ce chantier tombe pile sur les trois angles morts connus du dépôt :

1. 🔴 **Un geste ne se vérifie PAS dans le navigateur** (CLAUDE.md §5). Le glissement des
   feuilles était mort en natif **depuis le commit initial** et le web l'a caché des mois.
   ➡️ Simulateur iOS : `npx expo run:ios`, capture par `xcrun simctl io booted screenshot`.
2. 🔴 **`requestAnimationFrame` ne tourne pas dans le panneau navigateur** — 0 frame en
   7,2 s, mesuré. Une animation s'y fige à une valeur intermédiaire **parfaitement
   plausible**, et on part corriger du code sain. Un chantier d'animation vérifié là-dedans
   ne prouve **rien**.
3. 🔴 **Depuis un worktree, le preview sert l'app du dépôt PRINCIPAL.** Lancer avec
   `EXPO_ROUTER_APP_ROOT=$PWD/app` depuis `kyroz-app`.

➡️ Corollaire : **sortir chaque décision en fonction pure et la tester**, comme
`lib/collapsingTitle.ts` et `lib/accentColor.ts`. C'est le seul mouvement vérifiable
sans simulateur. Et **dire dans la PR ce qui n'a pas été vu à l'écran** — une
vérification manquante annoncée vaut mille fois une vérification supposée.

## Les règles Kyroz qui contraignent le mouvement

- **Zéro émoji dans l'interface** — invariant compté par `lib/__tests__/emojiInterface.test.ts`.
- **Pas de gamification de compétition** (§5). Une célébration qui se collectionne est
  interdite ; le palier de série affiche un **nombre**, pas un emblème, et c'est une
  décision du fondateur du 2026-08-09.
- **Tout suivi affiché doit rassurer, jamais mettre la pression** (§10). Vaut pour le
  mouvement : pas de secousse d'erreur, pas de rouge qui pulse.
- **Latence < 1 s sur le plan** (§4). Une animation d'entrée ne doit pas retarder l'affichage.
- **Le paysage iPad est ouvert** (§8) — Apple y teste l'app. Toute transition doit tenir
  à 1366×1024.

## Ce que j'attends en sortie de session

1. **L'arbitrage tranché** natif ou OTA-pur, écrit noir sur blanc avec son coût.
2. **L'audit d'`improve-animations`**, priorisé.
3. **Le chantier inscrit dans `AGENTS.md`** sous l'id libre suivant — **E26** au
   2026-08-10. ⚠️ Ne créer **aucune** deuxième liste de tâches (§10) : ce brief n'en est
   pas une, il se jette une fois E26 ouvert.
4. **Une branche → une PR** (§10). Jamais de merge local.

## À éviter

- Repartir sur les couleurs, rayons, typographie ou espacements : c'est fait et verrouillé.
- Animer les 53 fichiers muets parce qu'ils sont muets. La retenue est la règle.
- Installer une dépendance native sans l'arbitrage du point 1 — ça engage un build et
  coupe l'OTA des anciens binaires.
- Conclure quoi que ce soit sur du mouvement vu dans le panneau navigateur.
