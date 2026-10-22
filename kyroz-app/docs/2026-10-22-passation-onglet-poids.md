# Passation — l'onglet Poids (E81), puis la refonte du Profil

> **Écrit le 2026-10-22** par la session locale (Mac du fondateur), au moment où il a
> atteint sa limite hebdomadaire et passe le relais à une **session cloud**.
> Objectif : que la session suivante reprenne **exactement** là où on en est, sans
> rien redemander de ce qui est déjà tranché.
>
> ➡️ **À lire dans cet ordre** : ce fichier (en entier), puis `AGENTS.md` — entrée
> **E81** et bloc « ▶️ Reprise du 2026-10-19 » (point **3 quater**) —, puis
> `CLAUDE.md` (spec stable, §8 « Le Profil ne porte que TOI et TON PLAN » et §10
> « Style de travail »).

---

## 1. Où on en est, en une phrase

L'onglet **Poids** (qui remplace l'onglet Profil) est **codé, testé et vérifié**
(web, simulateur iPhone et un parcours automatisé) dans la
**PR #390** — https://github.com/brgkevin-arch/Kyroz-app/pull/390 — branche
`claude/weight-tracking-profile-redesign-443a9b`, commits `8342b07` (code) et
`33f33ae` (consignation). Elle est **ouverte, fusionnable (CLEAN), PAS fusionnée,
PAS publiée**. Elle **attend la validation du fondateur** sur son téléphone ou au
simulateur. **Ensuite seulement** : la refonte du Profil.

---

## 2. La demande d'origine (2026-10-21)

Message du fondateur, mot pour mot :

> « J'aimerai qu'on s'inspire de cette page pour faire notre suivis du poids. On va
> aussi revoir toute la page profil qui va être séparé du suivis du poids. »

Il joignait une **capture d'écran d'une autre app** (une app de balance / composition
corporelle). ⚠️ **La capture n'est PAS dans git** (image d'une app tierce, dépôt
public). La voici décrite en entier, pour qu'aucun détail ne se perde :

- **Thème sombre.** Bouton rond « ‹ » en haut à gauche, titre centré en capitales
  espacées « COMPOSITION CORPORELLE », bouton rond « liste » en haut à droite.
- **Sélecteur de période** en pilules : *Mois · Trimestre · Semestre · **Année**
  (sélectionnée, pilule bleue) · Tout*.
- Sous lui, une ligne de **plage de dates** encadrée de deux **boutons ronds ‹ ›** :
  « 5 oct. 2025–2 nov. 2026 ».
- **Trois séries**, chacune : un libellé à gauche suivi d'une **pastille d'écart en %
  avec une flèche** (inclinée vers le haut ou le bas) —
  *Poids ↗ +2,3 %* (bleu), *Muscle ↘ −3,8 %* (vert d'eau), *Graisse ↗ +4,0 %* (violet).
- Chaque courbe : **axe des valeurs à DROITE, en pastilles grises** (80 · 82 · 84 ·
  86 · 88), une pastille d'**unité** au-dessus (« kg », « % ») ; **lignes horizontales**
  fines ; **lignes verticales en pointillés** (une par mois) ; **points creux** (cercles
  vides) ; la courbe **entre par le bord gauche en POINTILLÉS** (pas de donnée en
  décembre : le trait Nov → Janv est pointillé).
- Sous les trois courbes, une seule rangée d'**initiales de mois** : N D J F M A M J J A S O.
- Un grand bouton bleu **« Plein écran »** (icône d'agrandissement).
- En bas, une carte promotionnelle « Offre spéciale -15 % · Obtenez une analyse… »
  avec une croix — sans intérêt pour nous.

---

## 3. Les décisions du fondateur (réponses mot pour mot)

Posées en trois questions le 2026-10-21 :

| Question | Sa réponse |
|---|---|
| Où vit le nouvel écran « Suivi du poids » ? | « **Il remplace l'onglet profil. Le profil se met sur la page du plan, dans une bulle en haut à droite avec l'icone du profil.** » |
| Quelles courbes ? | « **Poids pour le moment mais plus tard on mettra tous les details** » |
| Dans quel ordre ? | « **Le poids d'abord** » — l'option disait : *on construit l'écran du poids, tu le valides au simulateur, puis on revoit le Profil ; avant ça, tu me dis ce qui te gêne aujourd'hui dans le Profil.* |

⚠️ **Ne pas re-poser ces questions.** Et ne PAS ajouter de séries gras / muscle sans
qu'il le demande (« plus tard »).

---

## 4. Ce qui a été construit (PR #390)

### Avant / après, pour l'utilisateur
- **Avant** : le poids était une carte en tête de l'onglet Profil ; sa courbe ne se
  lisait qu'en entier, dans la feuille de pesée.
- **Après** :
  - l'onglet **Profil devient « Poids »** (icône : un cadran de pesée) ;
  - on lit la courbe **par période** et on **remonte le temps** avec ‹ › ;
  - le **Profil** s'ouvre par une **bulle ronde en haut à droite du Plan** (icône
    « personne »), en écran **poussé** par-dessus les onglets ;
  - la feuille de pesée ne garde que la **saisie** (« Nouvelle pesée »).

### L'onglet Poids — `app/(tabs)/poids.tsx`, de haut en bas
1. Grand titre **« Poids »** (même grammaire que les autres onglets : il se replie en
   titre compact au défilement).
2. **Le poids du moteur** en très grand (`profile.weight_kg`, recalé sur la dernière
   pesée) + « Dernière pesée : mercredi 21 octobre » (ou « Pas encore de pesée
   enregistrée »).
3. **Sélecteur** `Mois · 3 mois · 6 mois · Année · Tout` (composant `Segmented`
   existant, animé). **Période par défaut : 3 mois.**
4. Ligne **‹ plage de dates ›** (absente sur « Tout »). ‹ est grisé s'il n'y a aucune
   pesée plus ancienne ; › est grisé sur la période la plus récente.
5. **Carte de la courbe** : « Poids » + pastille d'écart (flèche + « −0,8 kg », ou
   « Stable »), « kg » à droite ; la courbe (`components/CourbePoids.tsx`) ; en vue
   Année, la phrase « Un point = la moyenne de tes pesées du mois. ». Sans pesée sur la
   période : « Aucune pesée sur cette période. ».
   Avec moins de 2 pesées au total, ni sélecteur ni courbe : « Encore une pesée et ta
   courbe apparaît ici. » / « Note ta première pesée : Kyroz recale calories, macros et
   plan à chaque fois. »
6. Bouton **gris** pleine largeur **« Ajouter une pesée »** (ou **« Me peser »** le jour
   où une pesée est attendue, ou sans aucune pesée) → ouvre la feuille de saisie.
7. **Kyroz+** : le verdict de trajectoire (`TrackVerdict`, feature `transformation`)
   et la carte d'objectif daté (`BlocObjectif`, feature `dated_goal`). Un tap sur
   l'objectif ouvre l'éditeur dans le Profil (drapeau `@kyroz:openEditor = dated_goal`
   + `router.push('/profil')`, le verrou reste dans le Profil).
8. **Transformation** (≥ 2 photos) : comparaison avant/après (Kyroz+).
9. **Historique** : les 10 dernières pesées, suppression avec confirmation EN LIGNE.

### La feuille de pesée — `components/WeightCheckin.tsx`
Titre **« Nouvelle pesée »**, « Chaque pesée recale ton plan. », la date (« Aujourd'hui »
/ « Une autre date »), le poids, **Enregistrer**, la confirmation, « Ajouter une note
(ou une photo) ». Courbe, verdict, transformation et historique en sont **partis** vers
l'onglet. Le Plan ouvre la même feuille le jour de pesée (bandeau « C'est le moment de
te peser »).

### Le Profil — `app/profil.tsx` (déplacé hors de `app/(tabs)/`)
- En-tête d'écran **poussé** : « ‹ » (accessibilité « Retour ») · « Profil » · roue
  dentée (« Réglages »). Plus de grand titre qui se replie.
- La carte du poids est **partie**. Tout le reste est **inchangé** (contenu listé au §9).
- **Pas de garde d'entrée** (il n'est plus sous le layout des onglets) : sans profil, il
  renvoie à l'index (`<Redirect href="/" />`) au lieu d'une page vide.
- L'éditeur « Informations » garde son bouton « Me peser » (feuille ouverte dans le Profil).

### Le Plan — `app/(tabs)/plan.tsx`
- **Bulle du Profil** en haut à droite (rond 44 pt, fond `t.card`,
  `components/Icons.tsx::ProfilIcon`, l'ancien tracé de l'onglet Profil).
- Les trois chemins qui menaient à l'onglet Profil vont à `/profil` : la carte
  d'ajustement (« Ton plan te convient toujours ? »), la carte « Revois tes protéines
  préférées », « Ma répartition (%) ».

### La barre d'onglets
- `app/(tabs)/_layout.tsx` : `{ name: 'poids', title: 'Poids', … }` à la place de
  `profil`. Sur iOS c'est la barre native d'Apple (Liquid Glass), qui lit des **PNG**.
- `lib/iconesOnglets.ts` : nouveau tracé `poids` (le même que `PeseeIcon`) ; `profil`
  sorti du jeu d'onglets. PNG régénérés par `npx tsx scripts/gen-icones-onglets.ts`
  (⚠️ jamais via un script npm : une ligne de `scripts` coupe la ligne OTA).
- La **visite guidée** : `lib/tours.ts`, 5ᵉ arrêt `poids`, titre « Ton poids », ligne
  « Note ton poids : tes calories et ton plan suivent. ».

### Les règles de la courbe — `lib/courbePoids.ts` (pur, sans import, testé)
1. **Un pointillé = pas de pesée** entre deux points. Seuil = `max(14 j, 1,5 × la
   cadence choisie)` (hebdo → 14 j, 4 semaines → 42 j). ⚠️ Mesuré entre **PESÉES**, même
   sur les points mensuels : une pesée le 1er décembre et la suivante le 26 janvier font
   deux mois « remplis » mais 8 semaines sans balance → pointillé (vu à l'écran, corrigé).
2. **Un point moyen se dit** : au-delà de 200 jours (Année ; Tout s'il dépasse 200 j),
   un point par mois (moyenne), et l'écran l'écrit.
3. **L'axe ne descend jamais sous 2 kg** : 300 g d'oscillation ne font pas une falaise
   (règle « rassurer, zéro alarme »).
- Fenêtres : Mois / 3 mois / 6 mois **glissantes** jusqu'à aujourd'hui ; Année **calée
  sur les mois** (du 1er d'il y a 11 mois à aujourd'hui) ; Tout = de la première pesée.
- La courbe **entre et sort par les bords** quand une pesée existe hors de la fenêtre
  (valeur interpolée au bord, pointillée si trou).
- **L'écart affiché** = dernière pesée de la fenêtre − première, lu sur les PESÉES,
  jamais sur les moyennes.
- Repères du temps : semaines (« 23 sept. », « 30 sept. »…) sur Mois ; 1er du mois
  (« août ») jusqu'à 200 j ; initiales (« N D J F… ») sur l'année ; années au-delà.

### Fichiers
Ajoutés : `app/(tabs)/poids.tsx`, `components/CourbePoids.tsx`, `lib/courbePoids.ts`,
`lib/__tests__/courbePoids.test.ts`, `assets/onglets/poids*.png`.
Déplacé : `app/(tabs)/profil.tsx` → `app/profil.tsx`.
Supprimés : `components/WeightSummaryCard.tsx`, `components/WeightChart.tsx` (plus aucun
lecteur), `assets/onglets/profil*.png`.
Modifiés : `app/(tabs)/_layout.tsx`, `app/(tabs)/plan.tsx`, `components/WeightCheckin.tsx`,
`components/Icons.tsx`, `components/TabIcons.tsx`, `components/DatedGoalCard.tsx`
(commentaire), `lib/iconesOnglets.ts`, `lib/tours.ts`, `lib/sync.ts` (commentaire),
`scripts/check-easignore.mjs` (chemin), `test/_harness.mjs` + `test/qa-deep.mjs`
(Playwright), 24 fichiers de tests (chemins, onglet `poids`), `AGENTS.md` (E81),
`CLAUDE.md` (§8, décompte de la visite « poids 1 »).

---

## 5. Les choix que Claude a faits seul — à confirmer ou changer avec le fondateur

1. **« 3 mois / 6 mois »** au lieu de « Trimestre / Semestre » (cinq pilules tiennent
   mieux dans un iPhone, le nombre se lit sans traduire).
2. **Écart en kg**, pas en % comme la capture (« −1,8 kg » se lit plus vite).
3. **Couleur neutre** pour l'écart, jamais rouge/vert (une hausse est un progrès en prise
   de masse). ⚠️ **Incohérence héritée** : la colonne d'écart de l'**Historique** garde
   ses couleurs d'avant (vert si baisse, orange si hausse), recopiées telles quelles de
   l'ancienne feuille. À signaler au fondateur.
4. **Bouton de pesée GRIS**, pas à l'accent : c'est sa dernière décision sur la carte du
   poids (2026-09-21, « il est GRIS — plus à l'accent »).
5. **Pas de « Plein écran »** : l'app est verrouillée en portrait (`app.json`).
6. **Période par défaut : 3 mois.**
7. **Le poids en grand en haut** (la capture n'a pas de chiffre courant ; le moteur, lui,
   en a un).
8. Libellé d'onglet **« Poids »** (pas « Suivi »), icône **cadran** (celle du bandeau de
   pesée du Plan).
9. Titre de la feuille : **« Nouvelle pesée »** (avant : « Suivi du poids »).
10. Le Profil prend l'en-tête des écrans poussés (comme Méthodologie, Kyroz+).

---

## 6. Trouvé au simulateur, corrigé — à NE PAS défaire

🔴 **« Revoir la visite » (roue dentée du Profil) FIGEAIT l'app** : plus un tap ne
passait, barre d'onglets comprise. Cause : le Profil (écran poussé) se retirait pendant
que la feuille Réglages, ouverte PAR-DESSUS lui, jouait encore son animation de sortie.
**Correctif** : le retour aux onglets et la relance de la visite partent de
`Sheet.onClosed` (feuille réellement démontée) — `apresReglages === 'visite'` →
`quitterPourLaVisite()` dans `app/profil.tsx`. Revérifié : visite complète, 5 arrêts, le
dernier sur l'onglet Poids, l'app répond ensuite. Garde-fous :
`visiteGuidee.test.ts` et `modalesPresentees.test.ts`.
➡️ **Règle générale** (écrite dans `CLAUDE.md` §8) : tout geste qui QUITTE le Profil
depuis une de ses feuilles attend `onClosed`. Et pour revenir au Plan : `router.back()`
(ou `router.replace('/(tabs)/plan')`), **jamais `router.navigate`**, qui sous Expo Router
récent EMPILE un écran au lieu de revenir.

---

## 7. Ce qui a été vérifié, et comment le refaire

| Quoi | Résultat | Comment |
|---|---|---|
| `npx tsc --noEmit` | propre | — |
| Suite complète `npx vitest run` | **2 720 / 2 720** verte (avant les dernières retouches de la courbe et de la visite) | Deux passes suivantes ont échoué **uniquement par délais** (~400 à ~980 s par test : machine suspendue) sur des tests MOTEUR non touchés ; les 5 fichiers concernés repassés seuls : 137/137. ⚠️ **À relancer en premier dans le cloud** pour avoir une passe complète propre. |
| `courbePoids.test.ts` | 24 cas, **3 mutations, 3 rouges** (seuil de trou neutralisé, plancher d'axe retiré, trou mensuel ignoré) | — |
| Web (panneau navigateur) | vues 3 mois, Mois, Année, recul ‹, bulle du Plan, Profil poussé | session factice + `@kyroz:weights` injectés dans `localStorage` ; captures dans `docs/passation-2026-10-22/` |
| Parcours Playwright `test/qa-deep.mjs` | onglet Poids → pesée enregistrée → les **7** sous-écrans du Profil par la bulle, **0 erreur de page** | `KYROZ_URL=http://localhost:<port> KYROZ_SESSION_LOCALE=1 KYROZ_HEADLESS=1 node test/qa-deep.mjs` contre un `expo start --web` local (session factice : aucun compte créé ; requêtes Supabase en échec = adresse factice, c'est normal) |
| Simulateur iPhone 17 (iOS 26.5) | barre native avec le cadran ; Profil poussé puis retour ; visite complète ; feuille « Nouvelle pesée » | Metro du worktree sur le port 8098, app du simulateur réglée sur `localhost:8098` (`RCT_jsLocation`), session factice déjà dans son stockage |
| Empreinte iOS | **`823c89db…` = build (22)** → publiable en **OTA** | `npx expo-updates fingerprint:generate --platform ios` |
| Migration Supabase | **aucune** | — |

**Non vu** : un vrai iPhone, l'iPad (la bulle et l'onglet en haut de l'écran sur
tablette), le thème clair, `test/qa-settings.mjs` (adapté, pas relancé).

⚠️ **Dans le cloud, ni simulateur iOS ni téléphone** : la validation visuelle native ne
peut être faite que par le fondateur, sur son Mac ou son iPhone.

Captures conservées (web) : `docs/passation-2026-10-22/01-onglet-poids-3-mois-web.jpg`,
`02-vue-annee-web.jpg` (⚠️ prise AVANT la correction du trou déc.→janv. et du
chevauchement « S O » : la version actuelle a un pointillé entre D et J et des initiales
bien espacées), `03-vue-mois-recul-web.jpg`. Les captures du simulateur n'ont pas
survécu (dossier temporaire vidé).

---

## 8. Prochaines étapes, dans l'ordre — et qui décide

1. **Relancer la suite complète** (`npm ci` puis `npx vitest run` dans `kyroz-app/`) pour
   avoir une passe verte entière, et le dire.
2. **Le fondateur valide la PR #390** sur son simulateur ou son iPhone. Ce qu'il doit
   regarder : l'onglet Poids (les cinq périodes, ‹ ›, la vue Année), la bulle du Profil
   sur le Plan, le retour, « Revoir la visite », une pesée. Lui rappeler les **choix du
   §5** à trancher, et l'incohérence des couleurs de l'Historique.
   *Pour tester en local sur son Mac* : depuis le worktree
   `/Users/kevinberger/Kyroz_Code/.claude/worktrees/moteur-methodologie-updates-03816f/kyroz-app`
   (ou toute copie de la branche, après `npm ci`), `npx expo start --port 8098`, puis
   relancer l'app Kyroz du simulateur iPhone 17 (déjà réglée sur ce port).
3. **Retouches** demandées par lui → sur la même branche, même PR.
4. **Fusion** : seulement sur son « merge » explicite (c'est du FOND, pas de la doc). En
   squash, puis **clôture** : re-mesurer les cases du tableau d'état d'`AGENTS.md`,
   passer E81 en « mergé », point de reprise à jour.
5. **Publication OTA** : seulement sur son « publie ». À trancher avec lui : avec le lot
   de la **62ᵉ OTA** (#376, E78, table des formats — cf. `AGENTS.md`, reprise) ou seule.
   Procédure de `CLAUDE.md` §2 : empreinte iOS comparée au build (22) AVANT, `npm ci`,
   arbre **détaché sur `origin/main`**, `npx eas-cli update --branch production
   --platform ios --clear-cache`, puis consignation à DEUX endroits (`AGENTS.md` ligne
   « OTA publiées » + `STORE-RELEASE.md`) et `npm run check:ota`.
6. **La refonte du Profil** — sa décision : « le poids d'abord », puis le Profil.
   ➡️ **Première action : lui DEMANDER ce qui le gêne aujourd'hui sur l'écran Profil**
   (et lui demander une capture si besoin). Ne rien proposer avant sa réponse.
   Inventaire actuel de l'écran au §9.
7. **« Plus tard, tous les détails »** (gras, muscle…) : ne pas lancer sans sa demande.
   Notes de conception au §10.

---

## 9. L'écran Profil aujourd'hui (après la PR #390) — pour préparer la refonte

En-tête : « ‹ » · **Profil** · roue dentée.
Puis, de haut en bas :
- **Cartes d'information conditionnelles** : révision du moteur (`engine_notice`, avec
  « ajuster »), poids sous la plage de référence (plan ramené à la maintenance), semaine
  de pause à la maintenance, sortie de zone d'énergie basse.
- **Cibles** : une carte 2 × 2 — kcal · protéines · glucides · lipides.
- **« Ta dépense par jour, pour garder ton poids » … kcal** (TDEE).
- **Infos** : *Informations* (sexe · âge · poids · % de gras) · *Sport & activité*
  (sports · NEAT).
- **Objectif** : *Objectif* (Sèche / Recomposition / Maintien / Prise de masse) ·
  *Objectif daté* (Kyroz+) · *Calories & macros* (Calculées / Perso %).
- **Repas** : *Préférences alimentaires* · *Paramètres des repas* (jours, repas, repas
  cochés automatiquement, repas gérés soi-même, moment le plus copieux, variété) ;
  *Jours plus copieux* et *Écarts passés* existent mais sont **éteints** par drapeau.
- Bouton **« Régénérer mon plan »**.
- Ligne **Kyroz+**.
- Derrière la **roue dentée** (`components/ReglagesSheet.tsx`) : Notifications (rappel
  quotidien, rappel de pesée Sem./2 sem./4 sem. + jour, propositions d'ajustement) ·
  Affichage (apparence, couleur d'accent, hydratation) · Aide et retours (donner mon
  avis, **revoir la visite**, méthodologie & sources) · Confidentialité (exporter mes
  données, CGU) · Compte (déconnexion, suppression du compte — avec mot de passe).
- Les éditeurs (Informations, Sport, Objectif, Objectif daté, Macros, Préférences,
  Repas) sont des **feuilles** définies dans `app/profil.tsx` (≈ 2 200 lignes).

Règle de rangement en vigueur (CLAUDE.md §8) : *ce réglage change-t-il ce que Kyroz me
SERT ?* Oui → sur le Profil ; non → derrière la roue dentée.

---

## 10. « Plus tard, tous les détails » — notes de conception (rien n'est décidé)

- La courbe est prête pour plusieurs séries : une carte par série, son écart, son axe,
  ses unités (« kg », « % »). Les règles de `lib/courbePoids.ts` ne lisent que
  `{ date, weight_kg }` — il faudrait les généraliser à `{ date, valeur }`.
- Données : `weight_logs.entries` est du **jsonb** (`date, weight_kg, note?`) — on peut
  y ajouter `body_fat_pct?` / `muscle_pct?` **sans migration**, mais c'est une donnée de
  santé de plus (RGPD : politique et registre à relire).
- 🔴 **Question MOTEUR à trancher avec le fondateur** : un % de gras saisi à la pesée
  doit-il remplacer `profile.body_fat_pct` ? Ce champ pilote Katch-McArdle, les planchers
  et la masse maigre (CLAUDE.md §6, `body_fat_source`) → c'est un chantier moteur
  (`ENGINE_REV`), pas un affichage.
- **Interdit par la spec** (CLAUDE.md §5) : connecter une balance ou Apple Santé
  (« intégration wearables »), et ce serait natif (nouveau build). Donc saisie à la main.

---

## 11. Le reste du travail en cours, ailleurs — ne pas y toucher

`AGENTS.md`, bloc « ▶️ Reprise du 2026-10-19 », dit l'ordre complet. Au 2026-10-22 :
- **PR #376** (E76, « chaque jour du plan a sa vraie date », branche
  `claude/semaine-datee`) : **une AUTRE session** y travaille (point 2 codé le
  2026-10-22). **Ne pas la toucher** sans demande du fondateur.
- E78 (inscription du soir, liste trop pleine), la table des formats vendus (seuil par
  aliment), la 62ᵉ OTA, le segment 1 de la reprise A→Z (`docs/2026-10-19-reprise-parcours-A-a-Z.md`,
  en attente de ses arbitrages) — l'onglet Poids est le **segment 12** de cette reprise,
  sauté à sa demande.

---

## 12. Règles de travail avec le fondateur

⚠️ Elles vivent dans la **mémoire locale** de Claude sur son Mac, **absente du cloud**.
Les voici, condensées :

- **Kévin**, fondateur solo, **non développeur**. **Français, tutoiement**, ton direct et
  exigeant (challenger, pas de flatterie). Clair, avec analogies/schémas si utile.
  **Décisions tranchées** : une recommandation, pas un « ça dépend ».
- **Dire l'avant et l'après** en termes d'utilisateur. Une mauvaise nouvelle s'annonce à
  la première ligne, avec son ampleur. Pas de « ne t'inquiète pas ».
- **Une étape à la fois, un chantier à la fois** (« je me suis trop éparpillé »,
  2026-10-19) : pas de nouveau front tant qu'un point attend sa réponse.
- **« go », « fais », « merge »** = exécuter sans redemander. **Mais « go » ne se devine
  pas** : devant une demande incertaine, montrer ce qu'on a compris et ATTENDRE —
  **coder oui, fusionner et publier non** sans son accord explicite.
- **Fichiers en plus** (docs, fiches, consignation) → fusion **automatique** permise.
  Le fond (code) et l'OTA → jamais sans lui.
- Flux git : **branche → PR**, jamais de commit sur `main`, jamais `push --force` /
  `reset --hard` / suppression de branche sans demander ; avant de pousser,
  `git fetch origin && git merge origin/main` ; commits petits, **en français**, format
  `feat(scope) : …`, terminés par la ligne `Co-Authored-By`. Expliquer en une phrase
  chaque commande git non triviale.
- **Ne toucher que son propre travail** : ni un fichier ni une PR d'une autre session.
- **Jamais de multi-agents** (sous-agents) sans le lui demander, avec une estimation de
  tokens (≈ 155 k par agent).
- **Rappeler la migration Supabase** quand un changement en demande une (et la MESURER :
  `npm run check:migrations`).
- **Le besoin est-il déjà satisfait ?** Le dire tout de suite, pas au 10ᵉ message.
  **Un constat n'est pas une demande.**
- **Ce qu'il LIT à l'écran** est la donnée la plus fiable : demander une capture avant de
  fouiller.
- **Vérifier le résultat, pas la mécanique** : un bouton dont le code s'exécute peut rester
  mort (cf. le gel du §6). Un garde-fou ne compte que **vu rougir** (mutation).
- **Pas de mensonge dans Kyroz** : un chiffre affiché = celui qui est servi ; tout suivi
  **rassure** (zone, zéro alarme, « le moteur porte la charge »).
- **Relais entre sessions** : chaque point inachevé s'écrit dans `AGENTS.md` **et se
  commite** avant de fermer.
- **Secrets** : ne jamais imprimer le contenu d'un fichier de clés (`.env.local`…), même
  pour « masquer » ; seuls tailles, empreintes, comptages.
- Budget de tokens : réponses courtes (≈ 6 lignes, 15 pour un chantier), compter avant de
  lire (`grep -c`, `wc -l`), sorties de commandes coupées (`| tail -40`).

---

## 13. Pièges rencontrés pendant ce chantier (pour ne pas les repayer)

- **Expo Router** : `app/(tabs)/profil.tsx` et `app/profil.tsx` répondraient tous deux à
  `/profil` → d'où le renommage de l'onglet en `poids`.
- **Hors des onglets, plus de garde d'entrée** : d'où le `Redirect` du Profil.
- **Simulateur** : deux taps trop rapprochés pendant une transition → le second est
  perdu (espacer de ~2 s) ; l'avertissement LogBox « Open debugger… » cache la barre
  d'onglets (le fermer) ; un tap juste après un défilement est mangé par l'élan.
- **Playwright** : sur un compte créé après le paywall, « Objectif daté » ouvre la page
  Kyroz+ — `goToProfil` revient désormais d'un cran (`page.goBack()`).
- **Suite de tests** sous charge (Metro + simulateur, ou machine en veille) : des tests
  moteur dépassent leur délai → les relancer SEULS avant de conclure.
- **`git add` sur un chemin renommé** (l'ancien n'existe plus) échoue et laisse l'index
  à moitié préparé : un commit suivant emporte ce qui y restait. Vérifier
  `git status` avant chaque commit.
- **Port de preview occupé** par une autre session : ne jamais arrêter son serveur ;
  utiliser un autre port (entrée temporaire de `.claude/launch.json`, **à retirer**).

---

## 14. Ce qui n'est PAS dans git

- La capture de référence (app tierce) — décrite au §2.
- Les captures du simulateur et le rapport Playwright (dossier temporaire, vidé).
- L'état du simulateur du Mac (app réglée sur Metro 8098, session factice) et le serveur
  Metro de la session locale (arrêté avec elle).
- La mémoire locale de Claude — résumée au §12.
