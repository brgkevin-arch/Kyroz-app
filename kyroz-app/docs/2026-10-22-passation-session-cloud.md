# Passation vers une session cloud — 2026-10-22

> Écrit par la session locale qui a porté #376 du 2026-10-19 au 2026-10-22, à la demande du
> fondateur (*« je veux passer le relais à une session cloud, je ne veux perdre aucun
> détail »*). La session cloud ne voit QUE git : ni la mémoire locale de Claude
> (`~/.claude/…/memory/`), ni les identifiants du Mac, ni le simulateur. Tout ce qui
> comptait dans ces endroits pour la suite est recopié ici.
>
> **Ordre de lecture** : ce fichier → `CLAUDE.md` (spec stable) → `AGENTS.md`, bloc
> « ▶️ À peaufiner AVANT la 62ᵉ OTA » (l'état qui fait foi, point par point).
> Si ce fichier et AGENTS.md divergent un jour, **AGENTS.md gagne** : il est tenu à jour à
> chaque validation, celui-ci est une photo du 22 octobre.

---

## 1. Reprendre en cinq gestes

```bash
git fetch origin
git checkout claude/semaine-datee        # la branche de la PR #376 — PAS main
cd kyroz-app && npm ci
npx vitest run                           # attendu : 2 784 tests verts, 196 fichiers
npx tsc --noEmit                         # attendu : 0 erreur
```

- Dernier commit de la passation : celui qui ajoute ce fichier, au-dessus de `6a128b7`.
  La branche était à jour de `main` le 2026-10-22 (0 commit de retard).
- **On travaille sur `claude/semaine-datee`, on commite dessus, on pousse.** Jamais sur
  `main`. Pas de nouvelle branche : #376 porte tout le lot de la 62ᵉ OTA.
- Avant de pousser : `git fetch origin && git merge origin/main` si `main` a bougé (en cas
  de conflit : s'arrêter, montrer, attendre le fondateur — CLAUDE.md §10).

---

## 2. Où on en est : les 6 points du fondateur (demandés le 2026-10-20)

Règle posée par le fondateur : **un point à la fois, « on ne passe pas au suivant sans avoir
validé le précédent », et ton avis sur chacun.**

| # | Point | État au 2026-10-22 |
|---|---|---|
| 1 | Page Kyroz+ dans le parcours d'arrivée, abonnement direct (modèle : page d'essai Wikiloc) | ✅ Codé (`app/offre-kyroz-plus.tsx`), essai 14 j posé dans App Store Connect (175 pays × 2 abonnements). Validé. |
| 2 | Plan généré le week-end : d'autres angles morts ? | ✅ Codé, vu au navigateur, **validé par le fondateur** (« Point 2 validé »). Reste un « niveau 2 » décidé pour APRÈS l'OTA (§5). |
| 3 | Thon : d'autres aliments avaient le même défaut d'arrondi de paquet ? | ✅ Mesuré et fermé, test ajouté. **⏳ PAS ENCORE VALIDÉ** : la question « on passe au point 4 ? » était posée quand le fondateur a passé le relais. |
| 4 | Retirer « il t'en faut … » (« l'app tourne en silence ») et chercher les phrases du même genre | ❌ Pas commencé. Inventaire de départ en §4. |
| 5 | Réserve : vérifier le rangement frais / sec de chaque aliment | ❌ Pas commencé. Méthode en §4. |
| 6 | Bonus « 0 gaspi » : le plan suivant cuisine les restes | ➡️ Fusionné dans le point 2 (décision du 2026-10-21). |

**Premier geste de la session cloud** : demander au fondateur s'il valide le point 3 (résumé
§3), et s'il veut d'abord le « mélange de formats » (avis : non, §3) ou passer au point 4.

---

## 3. Le point 3 en détail (à faire valider)

**Question** : le défaut du thon (3 boîtes de 140 g proposées pour 290 g, alors que 2 font
280 g) touchait-il d'autres aliments ?

**Réponse mesurée** : oui, 8 autres. Le correctif du thon (commit `aa0b2bb`, 2026-10-19) était
déjà COMMUN à tous les aliments vendus en paquet : la tolérance de 5 % porte sur l'achat
entier et non sur un seul paquet (`lib/formatsVendus.ts::achatPour`,
`n = ceil(besoin / (taille × 1,05) − 1e-9)` au lieu de `ceil((besoin − 5 % × taille) / taille)`).

Mesure (`npx tsx scripts/mesure-arrondi-paquets.ts`) sur 240 listes réelles (4 gabarits ×
5 régimes × 3 formes de plan × 4 tirages, réserve vide), soit 9 352 lignes vendues en paquet :

- ancienne règle : **un paquet de trop sur 19 lignes (0,2 %), 9 aliments** : épinards frais 7,
  poulet végétal 3, jambon végétal 2, thon 2, seitan 1, myrtilles 1, maïs 1, pois chiches 1,
  nouilles de riz 1 ;
- règle actuelle : 0 ; et **aucun achat sous 95 % du besoin** ;
- garde-fou ajouté : `formatsVendus.test.ts`, test « … et pour TOUS les aliments vendus en
  paquet » (chaque aliment, chaque format, 1 à 6 paquets). **Vérifié par mutation** : remettre
  l'ancienne formule le fait rougir (« poulet 1 248 g → 5 barquettes de 300 g, 4 suffisaient »).

**Vus au passage, laissés (mon avis : ne pas les faire)** :
- 26 lignes où un MÉLANGE de tailles ferait moins de paquets pour le même poids (« 3 barquettes
  de 300 g » au lieu de 600 + 300), 2 où il ferait quelques grammes de moins (maïs 445 g,
  cottage 735 g) ;
- 1 tomate de trop à la pièce (marge fixe d'un quart de pièce) sur 2 276 lignes à la pièce.
- Raison : du cosmétique sur 0,3 % des lignes, pas de l'argent jeté. Le mélange obligerait à
  réécrire le libellé (« 1 barquette de 600 g + 1 de 300 g ») et ce que la réserve reçoit.
  Le fondateur a un bouton « Mélange de formats » dans la dernière question qu'on lui a posée :
  s'il le choisit, c'est `achatPour` (boucle sur un seul format aujourd'hui) + le libellé +
  `quantiteRangee`, avec les tests de `formatsVendus.test.ts`.

---

## 4. Ce qui reste à faire (points 4 et 5), avec le point de départ

### Point 4 — « que l'app tourne en silence »

Demande du fondateur (2026-10-20) : *« L'idée est bonne mais la phrase est inutile pour un
user. Donc j'aimerais enlever ces phrases et l'app tourne en silence… vérifie s'il y a
d'autres choses similaires. »*

Point de départ relevé le 2026-10-22, **à compléter par rôle, pas par grep** (règle du
fondateur, « un manque ne se grep pas » : recenser les surfaces par ce qu'elles font) :

- **« · il t'en faut 215 g »** : `app/(tabs)/courses.tsx` ligne ~839
  (`achat.ecartVisible && … besoinLisible(item)`) ; la phrase est fabriquée par
  `lib/formatsVendus.ts::besoinLisible` et décidée par `Achat.ecartVisible`. Tests qui la
  figent : `lib/__tests__/formatsVendus.test.ts` (« un format qui se compte dit le besoin dans
  son unité », « la précision se tait quand elle répète l'achat », « sur les VRAIES listes,
  aucune précision ne redit l'achat »). Les retirer ou les réécrire avec la décision.
- Autres phrases de Courses qui « expliquent la machine » et sont candidates :
  - l'aide sous les boutons (`courses.tsx` ~751) : « Coche ce que tu prends, puis « Courses
    terminées » range le tout dans ta réserve, paquets entiers. Appui long pour retirer un
    article. » ;
  - la note de pied (~773) : « Formats courants en magasin, arrondis au-dessus de ce que
    demandent tes repas de la semaine. Ce qui reste d'un paquet est déduit de tes prochaines
    listes. » ;
  - la mention de départ (~157) : « Depuis tes dernières courses : pour les repas qu'il te
    reste à cuisiner. », « Pour ta semaine du lundi 26 octobre. » (ajoutée au point 2 — à
    soumettre aussi), et `lib/coursesDepuis.ts::mentionDepart` (« À partir de {jour}… ») ;
  - `lib/debutPlan.ts::avantLeJourDuDebut` / les mentions « Encore au menu : … » du Plan (E78).
- Ensuite les autres écrans (Plan, Réserve, Recettes, Profil, feuilles) : chercher les
  phrases qui décrivent ce que Kyroz fait en coulisses plutôt que ce que la personne doit
  faire. Attention aux **obligations** qui ne se retirent pas : disclaimer médical (CLAUDE.md
  §6), mentions de paiement (Apple 3.1.2), liens Méthodologie (Apple 1.4.1).
- **Méthode attendue** : présenter au fondateur la liste « phrase → écran → garder / retirer,
  avec mon avis », AVANT de toucher. Puis coder, tests mis à jour, vérifier à l'écran.

### Point 5 — Réserve, rangement frais / sec

- Le rangement se calcule dans `lib/pantry.ts::conservationDe` (catégorie de l'aliment, et
  `CONSERVES` ligne ~61 : toute conserve va au sec, 2026-10-04) ; corrigeable d'une touche
  par l'utilisateur (le choix manuel passe devant).
- Méthode : générer le tableau des ~139 ingrédients du catalogue
  (`Recette/recettes-kyroz.json > ingredients_reference`, ou `RECIPE_INGREDIENTS`) avec le
  rangement que le code leur donne, marquer ceux qui semblent faux (ex. une sauce, un
  surgelé, un pain, un fruit sec), le PRÉSENTER au fondateur avec avis, puis corriger après
  validation. Le tableau peut vivre dans `docs/` comme `docs/2026-10-19-seuils-par-aliment.md`
  (généré depuis le code, pas écrit à la main). Un test existe déjà : « tout ingrédient vendu
  en boîte finit « Au sec », les œufs mis à part » (`formatsVendus.test.ts`).

---

## 5. Décisions ouvertes et idées notées (ne pas les perdre)

- **Le compteur du jour** (« 0 / 2 314 kcal ») affiché le soir du « Ce soir » et les jours
  AVANT le début choisi à l'inscription (E78) : à trancher avec le fondateur.
- **Niveau 2 des restes** (décidé 2026-10-21 : APRÈS la 62ᵉ OTA, chantier moteur mesuré) :
  le plan suivant CHOISIT ses premières recettes avec les restes de paquets (les 120 g de
  poulet en trop). La semaine suivante existant désormais dès la clôture des courses, on sait
  quels restes viser. Coût à mesurer : précision calorique, variété, et un bump
  d'`ENGINE_VERSION` régénère le plan de tout le monde une fois.
- **Idée Kyroz+ (pas une fonction à vendre avant d'exister)** : planifier sur plusieurs
  semaines (2 à 4 semaines visibles, courses groupées). Avis donné et retenu : la liste de la
  semaine suivante reste GRATUITE (CGU : le cœur ne passe jamais derrière l'abonnement).
- **Refonte des recettes** : le fondateur a « une idée de gros chantier » (559 recettes sur
  139 aliments le gênent). Plus tard, à sa main.
- **PostHog** : à rallumer « bientôt, après les gros correctifs » (fondateur, 2026-10-20).
- **Médiateur de la consommation** : « au premier abonné » (ne pas relancer avant).
- **Chantier A à Z** (reprise de tout le parcours après la 62ᵉ OTA) :
  `docs/2026-10-19-reprise-parcours-A-a-Z.md`.

---

## 6. Ce que contient #376 (le lot de la 62ᵉ OTA, NON publié)

PR `claude/semaine-datee` → `main`, ouverte, fusionnable au 2026-10-22.

1. **E76 — plan daté** : chaque jour du plan a sa vraie date (`lib/semainePlan.ts::datesDuPlan`),
   un plan généré le week-end est celui de la semaine qui vient, renouvelé le lendemain de son
   dernier jour ; la liste et F9 lisent ces dates.
2. **E78 — « Quand veux-tu commencer ? »** à la fin de l'inscription (`lib/debutPlan.ts`,
   `components/FirstPlanReveal.tsx`) : rien n'est servi ni acheté avant le début choisi.
3. **E75 — seuils par aliment** (`lib/seuilAchat.ts`) : un reste sous 20 % d'une portion
   (10 g au moins, 15 g au plus pour la protéine du plat) ne fait plus acheter un paquet.
   Tableau : `docs/2026-10-19-seuils-par-aliment.md`.
4. **Thon** + balayage de tous les aliments (point 3).
5. **Page Kyroz+ après la visite** (`app/offre-kyroz-plus.tsx`, `lib/offreKyrozPlus.ts`,
   `hooks/useAchatKyrozPlus.ts`) : une fois, à un compte qui doit payer, jamais sur le web ;
   croix + « Peut-être plus tard » ; **essai de 14 jours affiché SEULEMENT si le store
   l'accorde** à cette personne ; une seule liste de ce que vend Kyroz+, lue aussi par l'écran
   Kyroz+ du Profil et les CGU §3 ; pas de liste « à venir » (avis retenu : Apple 2.3.1 /
   3.1.2 et « pas de mensonge »).
6. **CGU révisées** (`constants/legal.ts`, `effectiveDate: '20 octobre 2026'`, empreinte
   `a74e5c50f42a` dans `legal.test.ts`) : §3 construit depuis la liste Kyroz+ et paragraphe
   d'essai. ⚠️ La date est à REPORTER au jour de la livraison si elle glisse (§7).
7. **Point 2 — la semaine suivante et la pesée** (§8 pour le détail technique).

Hors #376 mais lié : **l'essai de 14 jours est DÉJÀ EN VIGUEUR** dans App Store Connect depuis
le 2026-10-20 (posé par l'API, accord du fondateur) : l'écran Kyroz+ actuellement publié vend
donc déjà un abonnement qui commence par 14 jours gratuits (Apple l'affiche dans sa feuille
d'achat), sans que l'app le dise encore. C'est une raison de ne pas laisser traîner l'OTA.

---

## 7. La livraison (62ᵉ OTA) — QUI peut la faire, et comment

🔴 **Ni merge ni OTA sans le « go » explicite du fondateur.** « Go » sur un point de travail
ne vaut pas « go » pour publier. Le mode automatique a déjà refusé `gh pr merge` sur #376.

🔴 **Une session cloud ne peut probablement PAS publier** : la publication demande la
connexion EAS et les identifiants qui vivent sur le Mac du fondateur. Prévoir de la faire
depuis le Mac (session locale) quand le fondateur dit « go ».

⚠️ **PR #390 d'une autre session** (« l'onglet Poids remplace le Profil », E81, branche
`claude/weight-tracking-profile-redesign-443a9b`) touche les mêmes fichiers que #376 :
`app/(tabs)/plan.tsx`, `AGENTS.md`, `CLAUDE.md`, `lib/__tests__/repasAuto.test.ts`,
`verrouKyrozPlus.test.ts`, `visiteGuidee.test.ts`. La seconde fusionnée aura des conflits.
**Ne pas toucher à #390** (règle : ne toucher que son travail), mais le signaler au
fondateur avant toute fusion pour qu'il choisisse l'ordre.

Procédure (dans l'ordre, chaque étape prouvée sur l'artefact) :
1. Le fondateur fusionne #376 ou l'autorise explicitement (squash).
2. Comparer l'empreinte iOS de `main` à celle du dernier binaire distribué, **build (22),
   runtime `823c89db…`** : `npx expo-updates fingerprint:generate --platform ios` après
   `npm ci` dans l'arbre de publication, et `npx eas-cli build:list --platform ios --json`
   (`runtime.version`). #376 ne touche ni `package.json`, ni `app.json`, ni `eas.json`
   (vérifié le 2026-10-22) : l'empreinte devrait être inchangée — la mesurer quand même.
3. Publier depuis un arbre DÉTACHÉ sur `origin/main` (`git checkout --detach origin/main`),
   sans `.env.local` (un `.env.local` factice de worktree publierait une URL bidon à tout le
   parc) : `npx eas-cli update --branch production --platform ios --message "…"`
   (`--clear-cache` si une variable `EXPO_PUBLIC_*` a changé — pas le cas ici).
4. Consigner aux DEUX endroits : AGENTS.md « OTA publiées » ET la puce « OTA : » de
   `STORE-RELEASE.md` ; puis `npm run check:ota`.
5. Site vitrine (dépôt séparé `kyroz-site`) : `KYROZ_SITE=<chemin> npm run gen:legal` pour
   ses pages légales, PR dans ce dépôt-là.
6. Si la livraison a lieu après le 20 octobre : reporter `effectiveDate` au jour de
   publication, `npm run gen:legal`, mettre à jour la date et l'empreinte de `legal.test.ts`
   (le test donne la nouvelle empreinte), dans la PR AVANT la fusion.

---

## 8. Le point 2 en détail technique (pour maintenir ce qui vient d'être codé)

### La règle validée (fondateur, 2026-10-21)

*« Peu importe le plan, une fois une liste de courses validée, une nouvelle apparaît pour le
plan de la semaine d'après. Elle est faite en fonction de ce qu'il doit rester à la fin du
plan actuel. »* Puis : *« On a oublié de prendre en compte la pesée. »*

Quatre règles :
1. « ce qu'il doit rester » se RECALCULE à chaque lecture : UNE liste = (repas restants de la
   semaine + semaine suivante) − réserve. Deux listes compteraient deux fois le même stock.
2. Une seule semaine d'avance : tant qu'une suivante attend, aucune autre ne se prépare.
3. Ce qui manque encore pour la semaine en cours passe en tête (« Encore pour cette semaine »).
4. Sans « Courses terminées », rien ne change (renouvellement ordinaire).

### Les fichiers

- `lib/semaineSuivante.ts` — décisions, sans React Native : `ciblesSeulement`,
  `memesRecettes`, `debutDeLaSuivante`, `premierJour`, `doitPreparer`, `preparer`, `aligner`,
  `aAdopter`.
- `lib/planSuivant.ts` — stockage local `@kyroz:planSuivant` (purgé avec le reste à un
  changement de compte, préfixe `@kyroz:`), `assurerLaSuivante` (aligne, prépare, oublie).
- `lib/planEngine.ts` — `buildLocalPlan(profile, seed, imposes?)` : un repas imposé garde sa
  recette, seules ses portions passent par le chemin de la génération ; `carryTracking`
  reporte le suivi **par DATE** (le jour 5 d'un plan renouvelé n'est plus le vendredi d'avant).
- `lib/coursesDepuis.ts::repasACompter` — un plan préparé d'avance compte ses courses depuis
  `prepare_le` (nouveau champ de `MealPlan`, `lib/types.ts`).
- `app/(tabs)/courses.tsx` — `assurerLaSuivante` puis liste combinée, champ
  `pour_cette_semaine` du cache, section en tête, mention « Pour ta semaine du … ».
- `app/(tabs)/plan.tsx` — (a) à profil changé : si seules les cibles bougent, mêmes recettes
  (`memesRecettes` + `carryTracking`), sinon re-tirage comme avant ; rien si la semaine est
  vécue (le renouvellement s'en charge) ; (b) au renouvellement : `aAdopter` → la semaine
  préparée devient le plan avec SON tirage (`@kyroz:planSeed`), puis la suivante se prépare
  aussitôt si ses courses étaient déjà faites ; sinon `generate(true, 'semaine_ecoulee')`.
- Tests : `lib/__tests__/semaineSuivante.test.ts` (27 cas, **9 mutations, 9 rouges**) ;
  gardes de source mises à jour dans `coursesDepuis.test.ts` et `seuilAchat.test.ts`.

### Les mesures (scripts dans `scripts/`, lancés par `npx tsx`, sans ligne `npm run`)

- `scripts/mesure-pesee.ts` : une pesée re-tirait la semaine — **−0,3 kg (5 kcal/j) : 64 à
  67 % des recettes changeaient**, −1 kg 72 %, −2 kg 75 %, −4 kg 82 %, toutes les semaines.
  Recettes gardées : 0 changée sur 1 008, écart calorique du jour 0,55 → 0,64 % (−1 kg),
  0,91 % (−4 kg) ; 1,7 à 4,6 % des repas portent la note « un peu au-dessus de ta cible »
  (contre 0 à 0,3 % en re-tirant). `rebalanceDay` écarté : 0,89 % et deux fois plus de
  drapeaux (il recale sans resserrer la journée ni lisser la semaine).
- Seuil « seules les cibles » : moins de 100 kcal/jour d'écart (`ENGINE_NOTICE_MIN_DELTA`,
  le seuil où l'app annonce d'elle-même un changement). Un changement d'objectif le dépasse
  et re-tire le plan, comme avant.
- Mesure du 2026-10-20 (42 cas : 6 formes de plan × 7 jours de génération, 4 semaines
  simulées) : aucun trou, aucun renouvellement en milieu de semaine, aucune course oubliée ;
  le seul angle mort était le plan de 7 jours (0 jour d'avance pour les courses du
  week-end) — c'est lui que la semaine suivante règle.

### Vérifié au navigateur le 2026-10-21/22, par les vrais gestes

« Tout cocher » + « Courses terminées » → semaine du lundi 26 préparée (tirage 1), 28 articles ;
un article retiré de la réserve → « ENCORE POUR CETTE SEMAINE » en tête ; pesée de 79 kg
(Profil → « Ajouter une pesée ») → 0 recette changée sur 20, au plan comme dans la semaine
en attente ; bascule simulée (dates reculées) → plan adopté tel quel (même identifiant,
tirage 1), suivante préparée aussitôt (tirage 2). **Jamais vu sur iPhone.**

---

## 9. Vérifier à l'écran depuis une session cloud

- Un worktree / un clone n'a pas de `.env.local` : le preview web fait écran noir
  (« supabaseUrl is required »). Poser un `.env.local` FACTICE (valeurs bidon, cf. CLAUDE.md
  §11) — et **ne jamais le laisser dans un arbre d'où l'on publie**.
- Lancer : `EXPO_ROUTER_APP_ROOT=$PWD/app npx expo start --web --port 8097` depuis `kyroz-app`.
- Session sans réseau : poser dans `localStorage` la clé de session (`AUTH_STORAGE_KEY`, lue
  dans les modules du bundle : `sb-<ref>-auth-token`, `<ref>` = l'hôte de l'URL factice) avec
  un objet minimal `{access_token, user}`, et `@kyroz:profile`. Sur le web, AsyncStorage =
  `localStorage`, clés telles quelles.
- Cliquer en React Native Web : par le vrai clic (outil `find` puis clic sur la référence, ou
  coordonnées d'une capture), jamais `__reactProps$.onClick` seul (il « réussit » sans rien
  faire). `innerText` ne voit pas le contenu des feuilles : faire une capture.
- Un geste (glissement) et le Liquid Glass ne se vérifient pas sur le web (CLAUDE.md §5, §8).

---

## 10. Ce que la mémoire locale de Claude disait (recopié, la session cloud ne la voit pas)

**Le fondateur** : Kévin, fondateur solo, non-développeur, à l'aise en français ; tutoiement,
clair, des analogies ou schémas quand ça aide ; décisions tranchées. *« Je n'ai pas besoin
d'être rassuré, juste de comprendre facilement. »* Pas à l'aise avec git : dire en une
phrase ce que fait une commande git non triviale avant de la lancer.

**Façon de travailler (règles qu'il a posées)** :
- **Une étape à la fois**, attendre sa validation ; un chantier à la fois (« je me suis trop
  éparpillé », 2026-10-19). Donner son AVIS sur chaque point, franchement, sans flatterie.
- **Dire l'avant et l'après** en termes d'utilisateur, avec les chiffres.
- **« Go » ne se devine pas** : devant une demande formulée comme incertaine, montrer ce qu'on
  a compris et attendre. « Go / fais » = coder sans revenir demander ; **merger et publier
  demandent son accord explicite**. Les PR de pure documentation (fiches, consignation)
  peuvent être fusionnées sans lui ; le fond et l'OTA, jamais.
- **Ne toucher que son travail** : ni fichier ni PR produits par une autre session (#390 !).
- **Relais entre sessions** : chaque point inachevé s'écrit dans AGENTS.md ET se commite
  avant de fermer (des points « notés pour la session suivante » ont déjà été perdus).
- **Pas de mensonge dans Kyroz** : un chiffre affiché = celui qui sera servi ; vaut pour la
  doc ; recenser les surfaces par leur rôle, jamais en cherchant la phrase fautive.
- **Vérifier le résultat, pas la mécanique** : un geste se teste par le vrai geste ; un test
  jamais vu rougir ne prouve rien (vérifier par mutation, avec copie de sauvegarde du
  fichier AVANT de muter — une restauration par `git checkout` a déjà effacé un correctif).
- **Mesurer sur le moteur**, jamais sur une réplique de ses formules ; un avant/après ne vaut
  que si les deux moitiés sortent du même arbre.
- **Jamais rien extraire d'un fichier de secret** (pas même pour masquer) : seules tailles,
  empreintes et comptages en sortie. Le dépôt est PUBLIC.
- **Budget** : réponses courtes (6 lignes pour une tâche ordinaire, 15 pour un chantier),
  mais ne jamais couper le chiffre avant → après, ce qui a échoué, la question à trancher.
- **Pas de multi-agents** sans le lui demander, avec une estimation de tokens.

**Ce qui n'existe que sur le Mac** (inaccessible en cloud) : le client App Store Connect
(`~/.eas-credentials/asc.mjs`, à lancer après `set -a; source ~/.eas-credentials/asc.env`),
la connexion EAS, le simulateur iOS, le `.env.local` factice du worktree local, la mémoire
de Claude. Pour App Store Connect, retenir : une offre d'introduction exige UN territoire
par offre (`409 RELATIONSHIP.REQUIRED` sinon) ; l'API rend ses dates en heure du Pacifique.

**Autres chantiers en cours ailleurs** (contexte, pas notre travail) : E81 « l'onglet Poids
remplace le Profil » (#390, autre session, à valider au simulateur ; prochaine étape là-bas :
refonte du Profil).
